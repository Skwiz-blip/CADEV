import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestDb, failure, json, lit, texts, uuids } from "./harness";

/**
 * Les fonctionnalités « en plus » : boucle d'échange à trois, coup de main
 * express, plan de départ, attestation publique, réactivité.
 */

let db: TestDb;
let awa: string; // propose React, cherche Docker
let bayo: string; // propose Figma, cherche React
let chidi: string; // propose Docker, cherche Figma
let dede: string; // hors boucle
let ids: { react: string; figma: string; docker: string; python: string };

type Loop = {
  id: string;
  status: string;
  my_acceptance: boolean;
  legs: { from: { id: string }; to: { id: string }; skills: { name: string }[]; accepted: boolean }[];
};

async function setSkills(user: string, offered: string, wanted: string) {
  await db.as(user, async (s) => {
    await s.rpc("set_my_skills", { p_type: "offered", p_items: json([{ skill_id: offered, level: "advanced" }]) });
    await s.rpc("set_my_skills", { p_type: "wanted", p_items: json([{ skill_id: wanted }]) });
  });
}

beforeAll(async () => {
  db = await TestDb.create();
  awa = await db.createUser({ first: "Awa", last: "Traore", country: "ML" });
  bayo = await db.createUser({ first: "Bayo", last: "Adeyemi", country: "NG" });
  chidi = await db.createUser({ first: "Chidi", last: "Eze", country: "NG" });
  dede = await db.createUser({ first: "Dede", last: "Koffi", country: "CI" });
  const [react, figma, docker, python] = await db.skillIds("react", "figma", "docker", "python");
  ids = { react: react!, figma: figma!, docker: docker!, python: python! };
  await db.sql(`update public.profiles set languages = '{fr,en}' where id in (${lit(awa)}, ${lit(bayo)}, ${lit(chidi)}, ${lit(dede)})`);
  await setSkills(awa, ids.react, ids.docker);
  await setSkills(bayo, ids.figma, ids.react);
  await setSkills(chidi, ids.docker, ids.figma);
});

afterAll(async () => {
  await db.close();
});

describe("boucle d'échange à trois", () => {
  let loopId: string;

  it("trouve la boucle quand aucun échange direct n'existe", async () => {
    type Candidate = {
      b: { id: string };
      c: { id: string };
      skills_ab: { name: string }[];
      skills_bc: { name: string }[];
      skills_ca: { name: string }[];
      common_languages: string[];
    };
    const loops = await db.as(awa, (s) => s.rpc<Candidate[]>("find_exchange_loops"));
    expect(loops).toHaveLength(1);
    const loop = loops[0]!;
    // Awa aide Bayo (React), Bayo aide Chidi (Figma), Chidi aide Awa (Docker).
    expect(loop.b.id).toBe(bayo);
    expect(loop.c.id).toBe(chidi);
    expect(loop.skills_ab.map((skill) => skill.name)).toEqual(["React"]);
    expect(loop.skills_bc.map((skill) => skill.name)).toEqual(["Figma"]);
    expect(loop.skills_ca.map((skill) => skill.name)).toEqual(["Docker"]);
    expect(loop.common_languages.sort()).toEqual(["en", "fr"]);
    // Aucune correspondance directe réciproque entre eux.
    const [reciprocal] = await db.sql<{ total: number }>(
      `select count(*)::int as total from public.matches where cardinality(a_offers_b) > 0 and cardinality(b_offers_a) > 0`,
    );
    expect(reciprocal!.total).toBe(0);
    // Quelqu'un sans compétence complémentaire n'a aucune boucle.
    expect(await db.as(dede, (s) => s.rpc<unknown[]>("find_exchange_loops"))).toEqual([]);
  });

  it("refuse une boucle qui ne tourne pas", async () => {
    await db.as(awa, async (s) => {
      // Dans l'autre sens, personne ne propose ce que l'autre recherche.
      expect(await failure(s.rpc("propose_loop", { p_b: chidi, p_c: bayo }))).toMatch(/loop_not_valid/);
      expect(await failure(s.rpc("propose_loop", { p_b: bayo, p_c: bayo }))).toMatch(/loop_not_valid/);
      expect(await failure(s.rpc("propose_loop", { p_b: awa, p_c: chidi }))).toMatch(/loop_not_valid/);
      expect(await failure(s.rpc("propose_loop", { p_b: bayo, p_c: dede }))).toMatch(/loop_not_valid/);
    });
  });

  it("invite les deux autres personnes et bloque les doublons", async () => {
    loopId = await db.as(awa, (s) => s.rpc<string>("propose_loop", { p_b: bayo, p_c: chidi }));
    const invited = await db.sql<{ user_id: string }>(
      `select user_id from public.notifications where type = 'loop_invitation' order by user_id`,
    );
    expect(invited.map((row) => row.user_id).sort()).toEqual([bayo, chidi].sort());

    await db.as(bayo, async (s) => {
      // La même boucle, proposée depuis un autre point de départ, est un doublon.
      expect(await failure(s.rpc("propose_loop", { p_b: chidi, p_c: awa }))).toMatch(/loop_already_exists/);
    });
    // Elle disparaît des suggestions une fois proposée.
    expect(await db.as(awa, (s) => s.rpc<unknown[]>("find_exchange_loops"))).toEqual([]);

    await db.as(dede, async (s) => {
      expect(await failure(s.rpc("respond_to_loop", { p_id: loopId, p_accept: true }))).toMatch(/loop_not_found/);
      expect(await s.sql(`select id from public.exchange_loops`)).toEqual([]);
      expect(await s.rpc<unknown[]>("list_my_loops")).toEqual([]);
    });
  });

  it("ne démarre que lorsque les trois personnes ont accepté", async () => {
    const first = await db.as(bayo, (s) => s.rpc<{ status: string }>("respond_to_loop", { p_id: loopId, p_accept: true }));
    expect(first.status).toBe("proposed");
    const [none] = await db.sql<{ total: number }>(`select count(*)::int as total from public.collaborations`);
    expect(none!.total).toBe(0);

    const mine = await db.as(chidi, (s) => s.rpc<Loop[]>("list_my_loops"));
    expect(mine[0]).toMatchObject({ id: loopId, status: "proposed", my_acceptance: false });
    expect(mine[0]!.legs.map((leg) => leg.accepted)).toEqual([true, true, false]);

    const second = await db.as(chidi, (s) => s.rpc<{ status: string }>("respond_to_loop", { p_id: loopId, p_accept: true }));
    expect(second.status).toBe("active");

    const collabs = await db.sql<{ title: string; exchange_type: string; loop_id: string }>(
      `select title, exchange_type, loop_id from public.collaborations order by title`,
    );
    expect(collabs.map((row) => row.title)).toEqual([
      "Boucle à trois · Docker",
      "Boucle à trois · Figma",
      "Boucle à trois · React",
    ]);
    expect(collabs.every((row) => row.loop_id === loopId && row.exchange_type === "one_off")).toBe(true);

    // Chaque personne a exactement deux espaces : un où elle donne, un où elle reçoit.
    for (const user of [awa, bayo, chidi]) {
      const list = await db.as(user, (s) => s.rpc<{ loop_id: string }[]>("list_my_collaborations"));
      expect(list).toHaveLength(2);
    }
    const started = await db.sql<{ total: number }>(
      `select count(*)::int as total from public.notifications where type = 'loop_started'`,
    );
    expect(started[0]!.total).toBe(3);

    await db.as(awa, async (s) => {
      expect(await failure(s.rpc("respond_to_loop", { p_id: loopId, p_accept: false }))).toMatch(/loop_not_open/);
    });
  });

  it("annule la boucle si une personne décline", async () => {
    const eve = await db.createUser({ first: "Eve", last: "Mbeki", country: "ZA" });
    const fode = await db.createUser({ first: "Fode", last: "Camara", country: "GN" });
    const gift = await db.createUser({ first: "Gift", last: "Banda", country: "ZM" });
    const [go, rust, kotlin] = await db.skillIds("go", "rust", "kotlin");
    await setSkills(eve, go!, kotlin!);
    await setSkills(fode, rust!, go!);
    await setSkills(gift, kotlin!, rust!);

    const id = await db.as(eve, (s) => s.rpc<string>("propose_loop", { p_b: fode, p_c: gift }));
    const result = await db.as(gift, (s) => s.rpc<{ status: string }>("respond_to_loop", { p_id: id, p_accept: false }));
    expect(result.status).toBe("declined");
    const [row] = await db.sql<{ status: string; declined_by: string }>(
      `select status, declined_by from public.exchange_loops where id = ${lit(id)}`,
    );
    expect(row).toEqual({ status: "declined", declined_by: gift });
    // Une boucle déclinée peut être reproposée plus tard.
    expect(await db.as(eve, (s) => s.rpc<unknown[]>("find_exchange_loops"))).toHaveLength(1);
  });
});

describe("plan de départ et attestation", () => {
  let collabId: string;

  it("propose des premières tâches adaptées à l'échange", async () => {
    collabId = (
      await db.sql<{ id: string }>(`select id from public.collaborations where title = 'Boucle à trois · React'`)
    )[0]!.id;

    await db.as(dede, async (s) => {
      expect(await failure(s.rpc("apply_starter_plan", { p_collaboration_id: collabId }))).toMatch(/collaboration_not_found/);
    });

    const created = await db.as(bayo, (s) => s.rpc<number>("apply_starter_plan", { p_collaboration_id: collabId }));
    // Cadrage + transmettre + mettre en pratique (échange à sens unique).
    expect(created).toBe(3);
    const tasks = await db.sql<{ title: string; assigned_to: string }>(
      `select title, assigned_to from public.tasks where collaboration_id = ${lit(collabId)} order by created_at, title`,
    );
    expect(tasks.map((task) => task.title).sort()).toEqual([
      "Cadrage : objectif, rythme et outils",
      "Mettre en pratique : React",
      "Transmettre : React",
    ]);
    // Awa transmet, Bayo met en pratique.
    expect(tasks.find((task) => task.title === "Transmettre : React")!.assigned_to).toBe(awa);
    expect(tasks.find((task) => task.title === "Mettre en pratique : React")!.assigned_to).toBe(bayo);

    await db.as(awa, async (s) => {
      expect(await failure(s.rpc("apply_starter_plan", { p_collaboration_id: collabId }))).toMatch(/plan_needs_empty_board/);
    });
  });

  it("ne délivre l'attestation qu'une fois l'échange réellement terminé", async () => {
    expect(await db.as(null, (s) => s.rpc("get_certificate", { p_id: collabId }))).toBeNull();

    const tasks = await db.sql<{ id: string; assigned_to: string }>(
      `select id, assigned_to from public.tasks where collaboration_id = ${lit(collabId)}`,
    );
    for (const task of tasks) {
      const reviewer = task.assigned_to === awa ? bayo : awa;
      const deliverable = await db.as(task.assigned_to, (s) =>
        s.rpc<string>("submit_deliverable", { p_task_id: task.id, p_description: "Travail réalisé, notes partagées dans le dépôt.", p_external_url: null, p_attachment_path: null }),
      );
      await db.as(reviewer, (s) => s.rpc("review_deliverable", { p_id: deliverable, p_decision: "approve" }));
    }
    await db.as(awa, (s) => s.rpc("confirm_completion", { p_collaboration_id: collabId }));
    await db.as(bayo, (s) => s.rpc("confirm_completion", { p_collaboration_id: collabId }));

    type Certificate = {
      title: string;
      is_loop: boolean;
      tasks_validated: number;
      members: { user: { id: string }; gives: { name: string }[]; deliverables_validated: number; confirmed_at: string | null }[];
    };
    const certificate = await db.as(null, (s) => s.rpc<Certificate>("get_certificate", { p_id: collabId }));
    expect(certificate).toMatchObject({ title: "Boucle à trois · React", is_loop: true, tasks_validated: 3 });
    const giver = certificate.members.find((member) => member.user.id === awa)!;
    expect(giver.gives.map((skill) => skill.name)).toEqual(["React"]);
    expect(giver.deliverables_validated).toBe(2);
    expect(certificate.members.every((member) => member.confirmed_at !== null)).toBe(true);
    expect(JSON.stringify(certificate)).not.toContain("@");
  });
});

describe("coup de main express", () => {
  const urgent = (overrides: Record<string, unknown> = {}) => ({
    p_id: null,
    p_title: "Bloqué sur un conteneur Docker qui redémarre en boucle",
    p_description: "Mon conteneur redémarre sans arrêt depuis la mise à jour de l'image. J'ai besoin d'un regard extérieur pour lire les journaux.",
    p_exchange_type: "one_off",
    p_collaboration_type: "remote",
    p_estimated_duration: "under_hour",
    p_desired_level: "any",
    p_availability: texts([]),
    p_language: "fr",
    p_country: null,
    p_links: texts([]),
    p_conditions: null,
    p_proposed: uuids([]),
    p_requested: uuids([ids.docker]),
    p_related: uuids([]),
    p_urgent: true,
    ...overrides,
  });

  it("exige une demande précise", async () => {
    await db.as(dede, async (s) => {
      expect(await failure(s.rpc("save_offer", urgent({ p_requested: uuids([]), p_proposed: uuids([ids.python]) })))).toMatch(/urgent_needs_request/);
      expect(await failure(s.rpc("save_offer", urgent({ p_exchange_type: "mentoring" })))).toMatch(/urgent_needs_request/);
    });
  });

  it("prévient les personnes qui proposent la compétence demandée", async () => {
    const offerId = await db.as(dede, (s) => s.rpc<string>("save_offer", urgent()));
    const notified = await db.sql<{ user_id: string; link: string }>(
      `select user_id, link from public.notifications where type = 'help_request'`,
    );
    // Seul Chidi propose Docker.
    expect(notified).toEqual([{ user_id: chidi, link: `/annonces/${offerId}` }]);

    await db.as(null, async (s) => {
      const all = await s.rpc<{ total: number; items: { is_urgent: boolean }[] }>("search_offers", { p_urgent: true });
      expect(all.total).toBe(1);
      expect(all.items[0]!.is_urgent).toBe(true);
    });
    // Après 72 heures, la demande n'est plus mise en avant.
    await db.sql(`update public.exchange_offers set created_at = now() - interval '4 days' where id = ${lit(offerId)}`);
    await db.as(null, async (s) => {
      expect((await s.rpc<{ total: number }>("search_offers", { p_urgent: true })).total).toBe(0);
      const still = await s.rpc<{ total: number; items: { is_urgent: boolean }[] }>("search_offers");
      expect(still.total).toBe(1);
      expect(still.items[0]!.is_urgent).toBe(false);
    });
  });

  it("limite le nombre de demandes express par jour", async () => {
    const error = await db.as(dede, async (s) => {
      for (let index = 0; index < 5; index += 1) {
        try {
          await s.rpc("save_offer", urgent({ p_title: `Demande express numéro ${index} sur Docker` }));
        } catch (caught) {
          return (caught as Error).message;
        }
      }
      return null;
    });
    expect(error).toMatch(/rate_limited/);
  });
});

describe("profil, messages et outils serveur", () => {
  it("met à jour le profil par fonction, sans toucher aux champs protégés", async () => {
    await db.as(dede, async (s) => {
      const checklist = await s.rpc<{ score: number; missing: string[] }>("update_my_profile", {
        p_patch: json({
          bio: "Développeur back-end à Abidjan, je travaille surtout avec Python et PostgreSQL.",
          experience_level: "intermediate",
          main_domain: "backend",
          availability: ["weekend"],
          status: "suspended",
          is_demo: true,
          profile_completion: 100,
        }),
      });
      expect(checklist.missing).toEqual(["avatar", "offered_skills", "wanted_skills"]);
      expect(checklist.score).toBe(65);
      expect(await failure(s.rpc("update_my_profile", { p_patch: json({ username: "awatraore" }) }))).toMatch(/username_taken/);
      expect(await failure(s.rpc("update_my_profile", { p_patch: json({ username: "A" }) }))).toMatch(/check constraint/);
      expect(await failure(s.rpc("update_my_profile", { p_patch: json({ experience_level: "dieu" }) }))).toMatch(/check constraint/);
      await s.rpc("update_my_profile", { p_patch: json({ onboarding_completed: true, onboarding_step: 8 }) });
    });
    const [row] = await db.sql<{ status: string; is_demo: boolean; done: boolean; city: string | null }>(
      `select status, is_demo, onboarding_completed_at is not null as done, city from public.profiles where id = ${lit(dede)}`,
    );
    expect(row).toEqual({ status: "active", is_demo: false, done: true, city: null });
  });

  it("sert les messages et les notifications aux seules personnes concernées", async () => {
    const conversationId = (
      await db.sql<{ id: string }>(
        `select id from public.conversations where user_low = least(${lit(awa)}::uuid, ${lit(bayo)}::uuid) and user_high = greatest(${lit(awa)}::uuid, ${lit(bayo)}::uuid)`,
      )
    )[0]!.id;
    await db.as(awa, (s) => s.rpc("send_message", { p_conversation_id: conversationId, p_content: "On commence quand ?" }));
    await db.as(bayo, async (s) => {
      const messages = await s.rpc<{ content: string; created_at: string }[]>("get_messages", { p_conversation_id: conversationId });
      expect(messages.map((message) => message.content)).toEqual(["On commence quand ?"]);
      const newer = await s.rpc<unknown[]>("get_messages", { p_conversation_id: conversationId, p_after: messages[0]!.created_at });
      expect(newer).toEqual([]);
      const notifications = await s.rpc<{ unread: number; items: { type: string; actor: { id: string } | null }[] }>("list_notifications");
      expect(notifications.unread).toBeGreaterThan(0);
      expect(notifications.items[0]).toMatchObject({ type: "new_message", actor: { id: awa } });
    });
    await db.as(dede, async (s) => {
      expect(await failure(s.rpc("get_messages", { p_conversation_id: conversationId }))).toMatch(/conversation_not_found/);
    });
  });

  it("mesure la réactivité aux propositions", async () => {
    const proposal = await db.as(dede, (s) =>
      s.rpc<string>("send_proposal", { p_receiver_id: chidi, p_offer_id: null, p_message: "Bonjour Chidi, peux-tu m'aider sur Docker ce week-end ?", p_offered: uuids([]), p_requested: uuids([ids.docker]) }),
    );
    await db.sql(`update public.exchange_proposals set created_at = now() - interval '6 hours' where id = ${lit(proposal)}`);
    await db.as(chidi, (s) => s.rpc("respond_to_proposal", { p_id: proposal, p_action: "decline", p_note: "Pas disponible ce mois-ci." }));
    const username = (await db.sql<{ username: string }>(`select username from public.profiles where id = ${lit(chidi)}`))[0]!.username;
    const profile = await db.as(null, (s) => s.rpc<{ stats: Record<string, number> }>("get_profile", { p_username: username }));
    // Les maillons de boucle ne comptent pas : une seule proposition reçue, une réponse.
    expect(profile.stats.proposals_answered).toBe(1);
    expect(profile.stats.proposals_to_answer).toBe(1);
    expect(Number(profile.stats.median_response_hours)).toBeCloseTo(6, 0);
  });

  it("réserve les outils serveur à la clé secrète", async () => {
    await db.as(dede, async (s) => {
      expect(await failure(s.rpc("server_set_admin", { p_email: "x@devbridge.test" }))).toMatch(/permission denied/);
      expect(await failure(s.rpc("demo_age", { p_days: 30 }))).toMatch(/permission denied/);
      expect(await failure(s.rpc("demo_mark_all_read"))).toMatch(/permission denied/);
    });
    const email = (await db.sql<{ email: string }>(`select email from auth.users where id = ${lit(dede)}`))[0]!.email;
    expect((await db.sql<{ result: string }>(`select public.server_set_admin(${lit(email)}) as result`))[0]!.result).toBe("granted");
    await db.as(dede, async (s) => {
      expect((await s.rpc<{ is_admin: boolean }>("viewer_context")).is_admin).toBe(true);
      expect(await s.rpc("admin_overview")).toBeTruthy();
    });
    expect((await db.sql<{ result: string }>(`select public.server_set_admin(${lit(email)}, false) as result`))[0]!.result).toBe("revoked");
    expect(await failure(db.sql(`select public.server_set_admin('inconnu@devbridge.test')`))).toMatch(/user_not_found/);
  });

  it("vieillit uniquement les données de démonstration", async () => {
    const demo = await db.createUser({ first: "Demo", last: "Profil", country: "TG", demo: true });
    await db.as(demo, (s) =>
      s.rpc("update_my_profile", { p_patch: json({ bio: "Profil de démonstration pour illustrer la plateforme." }) }),
    );
    await db.sql(`select public.demo_age(40)`);
    const rows = await db.sql<{ id: string; age: number }>(
      `select id, extract(day from now() - created_at)::int as age from public.profiles where id in (${lit(demo)}, ${lit(dede)})`,
    );
    expect(rows.find((row) => row.id === demo)!.age).toBe(40);
    expect(rows.find((row) => row.id === dede)!.age).toBe(0);
  });
});
