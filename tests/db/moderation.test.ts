import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestDb, createKodjoAndAmina, failure, lit, texts, uuids } from "./harness";

let db: TestDb;
let kodjo: string;
let amina: string;
let admin: string;
let offerId: string;
let skills: Awaited<ReturnType<typeof createKodjoAndAmina>>["skills"];

beforeAll(async () => {
  db = await TestDb.create();
  ({ kodjo, amina, skills } = await createKodjoAndAmina(db));
  admin = await db.createUser({ first: "Ada", last: "Admin", country: "NG" });
  // Le rôle administrateur ne s'obtient que côté serveur.
  await db.sql(`insert into public.app_admins (user_id) values (${lit(admin)})`);

  offerId = await db.as(kodjo, (s) =>
    s.rpc<string>("save_offer", {
      p_id: null,
      p_title: "Séances de mentorat Flutter pour débutants",
      p_description: "Je propose deux séances pour apprendre les bases de Flutter et publier une première application.",
      p_exchange_type: "mentoring",
      p_collaboration_type: "remote",
      p_estimated_duration: "few_hours",
      p_desired_level: "beginner",
      p_availability: texts(["weekend"]),
      p_language: "fr",
      p_country: null,
      p_links: texts([]),
      p_conditions: null,
      p_proposed: uuids([skills.flutter]),
      p_requested: uuids([]),
      p_related: uuids([skills.dart]),
    }),
  );
});

afterAll(async () => {
  await db.close();
});

describe("signalements et modération", () => {
  it("enregistre un signalement et prévient les administrateurs", async () => {
    await db.as(kodjo, async (s) => {
      // On ne se signale pas soi-même.
      expect(
        await failure(s.rpc("create_report", { p_reported_user_id: null, p_offer_id: offerId, p_collaboration_id: null, p_reason: "spam", p_description: "Je signale ma propre annonce." })),
      ).toMatch(/cannot_report_self/);
    });
    const reportId = await db.as(amina, (s) =>
      s.rpc<string>("create_report", { p_reported_user_id: null, p_offer_id: offerId, p_collaboration_id: null, p_reason: "inappropriate", p_description: "Le contenu de cette annonce ne respecte pas les règles." }),
    );
    const notified = await db.sql<{ user_id: string }>(`select user_id from public.notifications where type = 'moderation'`);
    expect(notified).toEqual([{ user_id: admin }]);

    await db.as(amina, async (s) => {
      // L'autrice voit son signalement ; elle ne peut pas le traiter.
      expect(await s.sql(`select id from public.reports`)).toEqual([{ id: reportId }]);
      expect(await failure(s.rpc("admin_handle_report", { p_report: reportId, p_status: "resolved", p_note: "Je me fais justice." }))).toMatch(/forbidden/);
      expect(await failure(s.rpc("admin_moderate_offer", { p_offer: offerId, p_action: "remove", p_reason: "Je supprime." }))).toMatch(/forbidden/);
      expect(await failure(s.rpc("admin_set_user_status", { p_user: kodjo, p_status: "suspended", p_reason: "Vengeance." }))).toMatch(/forbidden/);
      expect(await failure(s.rpc("admin_list_users"))).toMatch(/forbidden/);
    });
    // Kodjo, visé par le signalement, ne le voit pas.
    await db.as(kodjo, async (s) => {
      expect(await s.sql(`select id from public.reports`)).toEqual([]);
    });
  });

  it("donne aux administrateurs une vue d'ensemble réelle", async () => {
    await db.as(admin, async (s) => {
      const overview = await s.rpc<Record<string, unknown>>("admin_overview");
      expect(overview).toMatchObject({ users_total: 3, users_suspended: 0, offers_open: 1, reports_open: 1 });
      const users = await s.rpc<{ total: number; items: { email: string; is_admin: boolean }[] }>("admin_list_users", { p_query: "ada" });
      expect(users.total).toBe(1);
      expect(users.items[0]).toMatchObject({ is_admin: true });
      expect(users.items[0]!.email).toContain("@devbridge.test");
      const reports = await s.rpc<{ total: number; items: { reason: string; offer: { id: string } }[] }>("admin_list_reports", { p_status: "pending" });
      expect(reports.total).toBe(1);
      expect(reports.items[0]).toMatchObject({ reason: "inappropriate", offer: { id: offerId } });
      const offers = await s.rpc<{ items: { id: string; reports_open: number }[] }>("admin_list_offers", { p_reported_only: true });
      expect(offers.items).toHaveLength(1);
      expect(offers.items[0]).toMatchObject({ id: offerId, reports_open: 1 });
    });
  });

  it("retire une annonce, garde l'historique, puis la remet en ligne", async () => {
    const pending = await db.as(amina, (s) =>
      s.rpc<string>("send_proposal", { p_receiver_id: kodjo, p_offer_id: offerId, p_message: "Bonjour, je suis intéressée par tes séances de mentorat Flutter.", p_offered: uuids([]), p_requested: uuids([skills.flutter]) }),
    );
    await db.as(admin, async (s) => {
      expect(await failure(s.rpc("admin_moderate_offer", { p_offer: offerId, p_action: "remove", p_reason: "" }))).toMatch(/note_required/);
      await s.rpc("admin_moderate_offer", { p_offer: offerId, p_action: "remove", p_reason: "Contenu contraire aux règles de la communauté." });
    });

    await db.as(null, async (s) => {
      expect((await s.rpc<{ total: number }>("search_offers")).total).toBe(0);
      expect(await s.rpc("get_offer", { p_id: offerId })).toBeNull();
      expect(await s.sql(`select id from public.exchange_offers`)).toEqual([]);
    });
    // L'auteur voit encore son annonce, avec le motif.
    const mine = await db.as(kodjo, (s) => s.rpc<{ status: string; moderation_note: string }>("get_offer", { p_id: offerId }));
    expect(mine).toMatchObject({ status: "removed", moderation_note: "Contenu contraire aux règles de la communauté." });
    // Les propositions en attente sur cette annonce sont annulées.
    const [proposal] = await db.sql<{ status: string }>(`select status from public.exchange_proposals where id = ${lit(pending)}`);
    expect(proposal!.status).toBe("cancelled");
    // L'auteur ne peut pas remettre en ligne une annonce retirée.
    await db.as(kodjo, async (s) => {
      expect(await failure(s.rpc("set_offer_status", { p_id: offerId, p_status: "open" }))).toMatch(/offer_not_found/);
    });

    await db.as(admin, (s) => s.rpc("admin_moderate_offer", { p_offer: offerId, p_action: "restore", p_reason: null }));
    expect((await db.as(null, (s) => s.rpc<{ total: number }>("search_offers"))).total).toBe(1);

    const actions = await db.sql<{ action: string }>(`select action from public.admin_actions order by created_at`);
    expect(actions.map((row) => row.action)).toEqual(["offer_removed", "offer_restored"]);
  });

  it("suspend un compte : plus d'écriture, plus de visibilité, plus de correspondances", async () => {
    await db.as(admin, async (s) => {
      expect(await failure(s.rpc("admin_set_user_status", { p_user: admin, p_status: "suspended", p_reason: "Auto-suspension." }))).toMatch(/cannot_moderate_admin/);
      await s.rpc("admin_set_user_status", { p_user: kodjo, p_status: "suspended", p_reason: "Signalements répétés." });
    });

    const [matches] = await db.sql<{ total: number }>(`select count(*)::int as total from public.matches`);
    expect(matches!.total).toBe(0);

    await db.as(kodjo, async (s) => {
      expect(await failure(s.rpc("set_offer_status", { p_id: offerId, p_status: "paused" }))).toMatch(/account_suspended/);
      expect(await failure(s.rpc("refresh_my_matches"))).toMatch(/account_suspended/);
      // La règle d'accès bloque la modification du profil d'un compte suspendu.
      await s.sql(`update public.profiles set bio = 'Je contourne la suspension avec une longue biographie.' where id = ${lit(kodjo)}`);
      // Le compte peut toujours consulter son espace.
      expect(await s.rpc("dashboard_summary")).toBeTruthy();
    });
    const [profile] = await db.sql<{ bio: string | null }>(`select bio from public.profiles where id = ${lit(kodjo)}`);
    expect(profile!.bio).toBeNull();

    await db.as(null, async (s) => {
      // L'annonce d'un compte suspendu disparaît de la recherche, comme son profil.
      expect((await s.rpc<{ total: number }>("search_offers")).total).toBe(0);
      expect((await s.rpc<{ total: number }>("search_developers", { p_query: "Kodjo" })).total).toBe(0);
    });
    await db.as(amina, async (s) => {
      expect(
        await failure(s.rpc("send_proposal", { p_receiver_id: kodjo, p_offer_id: null, p_message: "Bonjour Kodjo, es-tu disponible pour un échange ?", p_offered: uuids([skills.python]), p_requested: uuids([skills.flutter]) })),
      ).toMatch(/receiver_unavailable/);
    });

    await db.as(admin, (s) => s.rpc("admin_set_user_status", { p_user: kodjo, p_status: "active", p_reason: null }));
    const [restored] = await db.sql<{ total: number }>(`select count(*)::int as total from public.matches`);
    expect(restored!.total).toBe(1);
  });

  it("clôt un signalement et informe la personne qui l'a envoyé", async () => {
    const reportId = (await db.sql<{ id: string }>(`select id from public.reports limit 1`))[0]!.id;
    await db.as(admin, async (s) => {
      expect(await failure(s.rpc("admin_handle_report", { p_report: reportId, p_status: "resolved", p_note: null }))).toMatch(/note_required/);
      await s.rpc("admin_handle_report", { p_report: reportId, p_status: "resolved", p_note: "Annonce corrigée par son auteur." });
    });
    const [report] = await db.sql<{ status: string; handled_by: string }>(`select status, handled_by from public.reports where id = ${lit(reportId)}`);
    expect(report).toEqual({ status: "resolved", handled_by: admin });
    const [notification] = await db.sql<{ title: string }>(
      `select title from public.notifications where user_id = ${lit(amina)} and type = 'moderation'`,
    );
    expect(notification!.title).toBe("Ton signalement a été traité");
  });

  it("trouve les développeurs par compétence, pays et texte libre", async () => {
    await db.as(null, async (s) => {
      type Result = { total: number; items: { first_name: string; offered: { name: string }[] }[] };
      expect((await s.rpc<Result>("search_developers")).total).toBe(3);
      const byText = await s.rpc<Result>("search_developers", { p_query: "python" });
      expect(byText.items.map((item) => item.first_name)).toEqual(["Amina"]);
      expect((await s.rpc<Result>("search_developers", { p_skill_id: skills.flutter })).items.map((item) => item.first_name)).toEqual(["Kodjo"]);
      expect((await s.rpc<Result>("search_developers", { p_country: "SN", p_language: "fr" })).total).toBe(1);
      expect((await s.rpc<Result>("search_developers", { p_availability: "weekday_morning" })).total).toBe(0);
    });
    // Connectée, Amina ne se voit pas dans la liste.
    const result = await db.as(amina, (s) => s.rpc<{ total: number }>("search_developers"));
    expect(result.total).toBe(2);
  });
});
