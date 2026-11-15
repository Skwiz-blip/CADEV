import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { purgeDemoWith, seedDemoWith, type SeedBackend } from "@/lib/demo/seed";
import { TestDb, apiArgs, lit } from "./harness";

/**
 * Le scénario de données de démonstration est rejoué ici, tel quel, sur le
 * PostgreSQL embarqué : chaque appel passe par les vraies fonctions, au nom
 * de chaque profil fictif. Si ce test passe, `npm run seed` construit un état
 * cohérent.
 */

let db: TestDb;

function backend(): SeedBackend {
  return {
    async listDemoUserIds() {
      const rows = await db.sql<{ id: string }>(
        `select id from auth.users where coalesce((raw_app_meta_data ->> 'is_demo')::boolean, false)`,
      );
      return rows.map((row) => row.id);
    },
    async deleteUser(id) {
      await db.sql(`delete from auth.users where id = ${lit(id)}`);
    },
    async createUser(input) {
      const meta = JSON.stringify({
        first_name: input.firstName,
        last_name: input.lastName,
        country: input.country,
        timezone: input.timezone,
      });
      const rows = await db.sql<{ id: string }>(
        `insert into auth.users (email, raw_user_meta_data, raw_app_meta_data)
         values (${lit(input.email)}, ${lit(meta)}::jsonb, '{"is_demo": true}'::jsonb) returning id`,
      );
      return rows[0]!.id;
    },
    async rpc<T>(userId: string | null, fn: string, args: Record<string, unknown>) {
      const call = (session: { rpc: <R>(name: string, a: ReturnType<typeof apiArgs>) => Promise<R> }) =>
        session.rpc<T>(fn, apiArgs(args));
      return userId ? db.as(userId, call) : db.asServer(call);
    },
    async close() {},
  };
}

const options = { password: "DemoBridge-2026", emailDomain: "demo.devbridge.test" };

beforeAll(async () => {
  db = await TestDb.create();
  await seedDemoWith(backend(), options);
});

afterAll(async () => {
  await db.close();
});

async function idOf(first: string): Promise<string> {
  const rows = await db.sql<{ id: string }>(`select id from public.profiles where first_name = ${lit(first)} and is_demo`);
  return rows[0]!.id;
}

describe("données de démonstration", () => {
  it("crée dix profils clairement marqués comme fictifs", async () => {
    const rows = await db.sql<{ first_name: string; is_demo: boolean; done: boolean; profile_completion: number }>(
      `select first_name, is_demo, onboarding_completed_at is not null as done, profile_completion
       from public.profiles order by first_name`,
    );
    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.is_demo && row.done)).toBe(true);
    // Kodjo est volontairement incomplet : la démonstration commence par là.
    expect(rows.find((row) => row.first_name === "Kodjo")!.profile_completion).toBe(65);
    expect(rows.find((row) => row.first_name === "Amina")!.profile_completion).toBe(90);
    const countries = await db.sql<{ total: number }>(`select count(distinct country)::int as total from public.profiles`);
    expect(countries[0]!.total).toBe(10);
  });

  it("prépare les trois situations demandées : terminée, en cours, en attente", async () => {
    const collabs = await db.sql<{ status: string; total: number }>(
      `select status, count(*)::int as total from public.collaborations group by status order by status`,
    );
    expect(collabs).toEqual([{ status: "active", total: 1 }, { status: "completed", total: 1 }]);
    const proposals = await db.sql<{ status: string; total: number }>(
      `select status, count(*)::int as total from public.exchange_proposals group by status order by status`,
    );
    expect(proposals).toEqual([{ status: "accepted", total: 2 }, { status: "pending", total: 1 }]);

    const tasks = await db.sql<{ status: string; total: number }>(
      `select t.status, count(*)::int as total from public.tasks t
       join public.collaborations c on c.id = t.collaboration_id and c.status = 'active'
       group by t.status order by t.status`,
    );
    // L'échange en cours montre les quatre états d'une tâche.
    expect(tasks).toEqual([
      { status: "done", total: 1 }, { status: "in_progress", total: 1 },
      { status: "in_review", total: 1 }, { status: "todo", total: 1 },
    ]);
    const reviews = await db.sql<{ total: number }>(`select count(*)::int as total from public.reviews`);
    expect(reviews[0]!.total).toBe(2);
    // L'historique conserve la correction demandée puis la validation.
    const history = await db.sql<{ validation_status: string; total: number }>(
      `select validation_status, count(*)::int as total from public.deliverables group by 1 order by 1`,
    );
    expect(history).toEqual([
      { validation_status: "approved", total: 5 },
      { validation_status: "changes_requested", total: 1 },
      { validation_status: "pending", total: 1 },
    ]);
  });

  it("laisse Kodjo et Amina prêts pour la démonstration en direct", async () => {
    const kodjo = await idOf("Kodjo");
    const amina = await idOf("Amina");
    type Match = { score: number; other: { id: string }; breakdown: Record<string, number>; status: string };
    const matches = await db.as(amina, (s) => s.rpc<{ items: Match[] }>("get_matches"));
    const match = matches.items.find((item) => item.other.id === kodjo)!;
    // Kodjo n'a pas encore indiqué ses disponibilités : 50 + 0 + 15 + 10.
    expect(match.breakdown).toEqual({ skills: 50, availability: 0, languages: 15, mode: 10, geo: 0 });
    expect(match).toMatchObject({ score: 75, status: "suggested" });

    // Dès qu'il complète son profil, le score monte.
    await db.as(kodjo, (s) =>
      s.rpc("update_my_profile", { p_patch: apiArgs({ p: { availability: ["weekday_evening", "weekend"] } }).p! }),
    );
    const after = await db.as(amina, (s) => s.rpc<{ items: Match[] }>("get_matches"));
    expect(after.items.find((item) => item.other.id === kodjo)!.score).toBe(95);

    // Aucun échange n'existe encore entre eux : le parcours se joue en direct.
    const [between] = await db.sql<{ total: number }>(
      `select count(*)::int as total from public.exchange_proposals
       where (sender_id = ${lit(kodjo)} and receiver_id = ${lit(amina)}) or (sender_id = ${lit(amina)} and receiver_id = ${lit(kodjo)})`,
    );
    expect(between!.total).toBe(0);
    const dashboard = await db.as(kodjo, (s) => s.rpc<{ stats: Record<string, number> }>("dashboard_summary"));
    expect(dashboard.stats.matches_available).toBeGreaterThanOrEqual(1);
  });

  it("offre à Kodjo une boucle à trois à découvrir", async () => {
    const kodjo = await idOf("Kodjo");
    type Candidate = { b: { first_name: string }; c: { first_name: string }; skills_ca: { name: string }[] };
    const loops = await db.as(kodjo, (s) => s.rpc<Candidate[]>("find_exchange_loops"));
    const loop = loops.find((item) => item.b.first_name === "Aïcha" && item.c.first_name === "Mariam");
    expect(loop).toBeDefined();
    expect(loop!.skills_ca.map((skill) => skill.name)).toEqual(["Intelligence artificielle"]);
  });

  it("étale l'histoire dans le temps et garde la demande express d'actualité", async () => {
    const wanjiru = await idOf("Wanjiru");
    const days = await db.sql<{ total: number }>(
      `select count(distinct (created_at at time zone 'UTC')::date)::int as total
       from public.activity_logs where user_id = ${lit(wanjiru)}`,
    );
    expect(days[0]!.total).toBeGreaterThanOrEqual(4);
    const [completed] = await db.sql<{ age: number }>(
      `select extract(day from now() - completed_at)::int as age from public.collaborations where status = 'completed'`,
    );
    expect(completed!.age).toBeGreaterThanOrEqual(15);

    const urgent = await db.as(null, (s) => s.rpc<{ total: number; items: { author: { first_name: string } }[] }>("search_offers", { p_urgent: true }));
    expect(urgent.total).toBe(1);
    expect(urgent.items[0]!.author.first_name).toBe("Mariam");
    const all = await db.as(null, (s) => s.rpc<{ total: number }>("search_offers"));
    expect(all.total).toBe(9);
    const [unread] = await db.sql<{ total: number }>(`select count(*)::int as total from public.notifications where not is_read`);
    expect(unread!.total).toBe(0);
  });

  it("se rejoue sans doublon, puis se supprime sans laisser de trace", async () => {
    await seedDemoWith(backend(), options);
    const [again] = await db.sql<{ profiles: number; collabs: number }>(
      `select (select count(*)::int from public.profiles) as profiles,
              (select count(*)::int from public.collaborations) as collabs`,
    );
    expect(again).toEqual({ profiles: 10, collabs: 2 });

    const real = await db.createUser({ first: "Vraie", last: "Membre", country: "BJ" });
    expect(await purgeDemoWith(backend())).toBe(10);
    const [left] = await db.sql<Record<string, number>>(
      `select (select count(*)::int from public.profiles) as profiles,
              (select count(*)::int from public.exchange_offers) as offers,
              (select count(*)::int from public.collaborations) as collabs,
              (select count(*)::int from public.messages) as messages,
              (select count(*)::int from public.matches) as matches,
              (select count(*)::int from public.activity_logs) as logs`,
    );
    // Seul le vrai compte reste.
    expect(left).toEqual({ profiles: 1, offers: 0, collabs: 0, messages: 0, matches: 0, logs: 0 });
    expect((await db.sql(`select id from public.profiles where id = ${lit(real)}`)).length).toBe(1);
  });
});
