import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TestDb } from "./harness";

const ROOT = path.resolve(__dirname, "../..");

/**
 * Le fichier supabase/devbridge.sql est celui que l'on colle dans l'éditeur SQL
 * de Supabase. On vérifie qu'il est à jour et qu'il s'applique d'un seul bloc.
 */
describe("script SQL unique", () => {
  const bundle = readFileSync(path.join(ROOT, "supabase/devbridge.sql"), "utf8");

  it("contient exactement les migrations du dépôt", () => {
    const dir = path.join(ROOT, "supabase/migrations");
    const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
    expect(files.length).toBe(11);
    for (const file of files) {
      const sql = readFileSync(path.join(dir, file), "utf8").trimEnd();
      // Si ce test échoue : lancer « npm run db:bundle » après avoir modifié une migration.
      expect(bundle.includes(sql), `${file} absent ou différent dans devbridge.sql`).toBe(true);
    }
  });

  it("s'applique en une seule fois sur une base neuve", async () => {
    const db = await TestDb.create({ migrations: false });
    await db.pg.exec(bundle);
    const [row] = await db.sql<{ tables: number; skills: number; functions: number }>(
      `select (select count(*)::int from pg_tables where schemaname = 'public') as tables,
              (select count(*)::int from public.skills) as skills,
              (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public') as functions`,
    );
    expect(row!.tables).toBe(21);
    expect(row!.skills).toBeGreaterThan(90);
    expect(row!.functions).toBeGreaterThan(50);
    await db.close();
  });

  it("ne laisse aucune fonction publique appelable par erreur", async () => {
    const db = await TestDb.create();
    // Toute fonction du schéma public doit avoir été explicitement fermée au rôle PUBLIC.
    const open = await db.sql<{ name: string }>(
      `select p.proname as name
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and has_function_privilege('public', p.oid, 'execute')`,
    );
    expect(open.map((row) => row.name)).toEqual([]);
    // Et aucune fonction interne n'est ouverte aux comptes, hors contrôles d'accès.
    const internal = await db.sql<{ name: string }>(
      `select p.proname as name
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute')
       order by 1`,
    );
    expect(internal.map((row) => row.name)).toEqual([
      "is_active_user", "is_admin", "is_collab_member", "is_conversation_member", "try_uuid",
    ]);
    await db.close();
  });
});
