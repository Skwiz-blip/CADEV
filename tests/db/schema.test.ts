import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestDb, failure, lit } from "./harness";

let db: TestDb;

beforeAll(async () => {
  db = await TestDb.create();
});

afterAll(async () => {
  await db.close();
});

describe("schéma et sécurité de base", () => {
  it("applique toutes les migrations et active RLS sur chaque table", async () => {
    const rows = await db.sql<{ tablename: string; rowsecurity: boolean }>(
      `select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`,
    );
    expect(rows.length).toBe(21);
    expect(rows.filter((row) => !row.rowsecurity)).toEqual([]);
  });

  it("charge le catalogue de compétences", async () => {
    const [row] = await db.sql<{ total: number; kinds: number }>(
      `select count(*)::int as total, count(distinct kind)::int as kinds from public.skills`,
    );
    expect(row!.total).toBeGreaterThan(90);
    expect(row!.kinds).toBe(2);
  });

  it("crée le profil à l'inscription, avec un nom d'utilisateur unique", async () => {
    const first = await db.createUser({ first: "Élodie", last: "N'Diaye", country: "sn" });
    const second = await db.createUser({ first: "Elodie", last: "Ndiaye", country: "SN" });
    const rows = await db.sql<{ id: string; username: string; country: string; is_demo: boolean }>(
      `select id, username, country, is_demo from public.profiles where id in (${lit(first)}, ${lit(second)})`,
    );
    expect(rows).toHaveLength(2);
    const usernames = rows.map((row) => row.username);
    expect(usernames).toContain("elodiendiaye");
    expect(new Set(usernames).size).toBe(2);
    expect(rows.every((row) => row.country === "SN" && row.is_demo === false)).toBe(true);
  });

  it("ne laisse pas un visiteur se déclarer profil de démonstration", async () => {
    await db.sql(
      `insert into auth.users (email, raw_user_meta_data)
       values ('faux@devbridge.test', '{"first_name":"Faux","last_name":"Demo","is_demo":true}'::jsonb)`,
    );
    const [row] = await db.sql<{ is_demo: boolean }>(
      `select is_demo from public.profiles p join auth.users u on u.id = p.id where u.email = 'faux@devbridge.test'`,
    );
    expect(row!.is_demo).toBe(false);
  });

  it("laisse chacun modifier son profil, mais pas les champs protégés ni le profil d'autrui", async () => {
    const me = await db.createUser({ first: "Kwame", last: "Asante", country: "GH" });
    const other = await db.createUser({ first: "Chisom", last: "Okafor", country: "NG" });

    await db.as(me, async (s) => {
      await s.sql(`update public.profiles set bio = 'Développeur React et Node.js basé à Accra, curieux de design.' where id = ${lit(me)}`);
      expect(await failure(s.sql(`update public.profiles set status = 'suspended' where id = ${lit(me)}`))).toMatch(/permission denied/);
      expect(await failure(s.sql(`update public.profiles set is_demo = true where id = ${lit(me)}`))).toMatch(/permission denied/);
      expect(await failure(s.sql(`update public.profiles set profile_completion = 100 where id = ${lit(me)}`))).toMatch(/permission denied/);
      // La règle d'accès filtre la ligne d'autrui : aucune ligne modifiée.
      await s.sql(`update public.profiles set bio = 'piraté' where id = ${lit(other)}`);
      expect(await failure(s.sql(`delete from public.profiles where id = ${lit(me)}`))).toMatch(/permission denied/);
      expect(await failure(s.sql(`insert into public.app_admins (user_id) values (${lit(me)})`))).toMatch(/permission denied/);
    });

    const rows = await db.sql<{ id: string; bio: string | null; profile_completion: number }>(
      `select id, bio, profile_completion from public.profiles where id in (${lit(me)}, ${lit(other)})`,
    );
    const mine = rows.find((row) => row.id === me)!;
    expect(mine.bio).toContain("Accra");
    // nom (10) + pays (10) + biographie (15)
    expect(mine.profile_completion).toBe(35);
    expect(rows.find((row) => row.id === other)!.bio).toBeNull();
  });

  it("refuse aux visiteurs les tables privées et les fonctions réservées", async () => {
    await db.as(null, async (s) => {
      for (const table of ["messages", "notifications", "exchange_proposals", "collaborations", "tasks", "reports", "activity_logs", "matches"]) {
        expect(await failure(s.sql(`select * from public.${table} limit 1`))).toMatch(/permission denied/);
      }
      expect(await failure(s.rpc("dashboard_summary"))).toMatch(/permission denied/);
      expect(await failure(s.rpc("admin_overview"))).toMatch(/permission denied/);
      // Les lectures publiques restent ouvertes.
      const result = await s.rpc<{ total: number }>("search_offers");
      expect(result.total).toBe(0);
      expect(await s.rpc("viewer_context")).toBeNull();
    });
  });

  it("garde les fonctions internes hors de portée des comptes", async () => {
    const me = await db.createUser({ first: "Youssef", last: "Benali", country: "MA" });
    await db.as(me, async (s) => {
      expect(
        await failure(s.sql(`select private.notify(${lit(me)}, 'moderation', 'x', 'y', null, null, null)`)),
      ).toMatch(/permission denied/);
      expect(await failure(s.sql(`select private.refresh_matches_for(${lit(me)})`))).toMatch(/permission denied/);
      expect(await failure(s.sql(`select private.log_activity(${lit(me)}, 'x', null, null)`))).toMatch(/permission denied/);
      expect(await failure(s.rpc("admin_overview"))).toMatch(/forbidden/);
      expect(await failure(s.sql(`insert into public.notifications (user_id, type, title) values (${lit(me)}, 'moderation', 'x')`))).toMatch(/permission denied/);
      expect(await failure(s.sql(`insert into public.messages (conversation_id, sender_id, content) values (gen_random_uuid(), ${lit(me)}, 'x')`))).toMatch(/permission denied/);
    });
  });
});
