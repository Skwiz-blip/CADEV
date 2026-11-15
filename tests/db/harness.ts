import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * Banc de test de la base : un vrai PostgreSQL embarqué (PGlite) dans lequel
 * on reproduit le strict nécessaire de l'environnement Supabase (rôles, schéma
 * `auth`, schéma `storage`, publication temps réel), puis on applique les
 * migrations du projet telles quelles.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");

const SUPABASE_STUBS = /* sql */ `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create schema storage;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb default '{}'::jsonb,
    raw_app_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
  );

  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table storage.buckets (
    id text primary key,
    name text,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid,
    created_at timestamptz default now()
  );
  alter table storage.objects enable row level security;

  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1]
  $$;

  grant usage on schema auth, storage, public to anon, authenticated, service_role;
  grant all on storage.objects, storage.buckets to anon, authenticated, service_role;

  -- Comme sur Supabase : tout nouvel objet du schéma public est d'abord
  -- accessible aux rôles de l'API. C'est aux migrations de refermer.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

  create publication supabase_realtime;
`;

export type Row = Record<string, unknown>;

export class TestDb {
  private constructor(public readonly pg: PGlite) {}

  /** `migrations: false` : base Supabase vide, pour y appliquer soi-même un script. */
  static async create(options: { migrations?: boolean } = {}): Promise<TestDb> {
    const pg = new PGlite();
    await pg.exec(SUPABASE_STUBS);
    if (options.migrations === false) return new TestDb(pg);
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      try {
        await pg.exec(sql);
      } catch (error) {
        throw new Error(`Migration ${file} : ${(error as Error).message}`);
      }
    }
    return new TestDb(pg);
  }

  async close(): Promise<void> {
    await this.pg.close();
  }

  /** Requête exécutée avec les pleins pouvoirs (équivalent du rôle serveur). */
  async sql<T extends Row = Row>(query: string): Promise<T[]> {
    const result = await this.pg.query<T>(query);
    return result.rows;
  }

  /** Exécute `fn` en se faisant passer pour une personne connectée (ou un visiteur si null). */
  async as<T>(userId: string | null, fn: (session: Session) => Promise<T>): Promise<T> {
    await this.pg.exec(
      `select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);
       set role ${userId ? "authenticated" : "anon"};`,
    );
    try {
      return await fn(new Session(this.pg));
    } finally {
      await this.pg.exec(
        `reset role; select set_config('request.jwt.claim.sub', '', false);`,
      );
    }
  }

  /** Exécute `fn` avec le rôle serveur (clé secrète) : contourne RLS, mais reste soumis aux droits accordés. */
  async asServer<T>(fn: (session: Session) => Promise<T>): Promise<T> {
    await this.pg.exec(`select set_config('request.jwt.claim.sub', '', false); set role service_role;`);
    try {
      return await fn(new Session(this.pg));
    } finally {
      await this.pg.exec(`reset role;`);
    }
  }

  /** Crée un compte comme le ferait Supabase Auth (le profil suit par déclencheur). */
  async createUser(input: {
    first: string;
    last: string;
    country?: string;
    timezone?: string;
    demo?: boolean;
  }): Promise<string> {
    const meta = JSON.stringify({
      first_name: input.first,
      last_name: input.last,
      country: input.country ?? "TG",
      timezone: input.timezone ?? "UTC",
    });
    const app = JSON.stringify({ is_demo: input.demo ?? false });
    const email = `${input.first}.${input.last}.${Math.random().toString(36).slice(2, 8)}@devbridge.test`.toLowerCase();
    const rows = await this.sql<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data, raw_app_meta_data)
       values (${lit(email)}, ${lit(meta)}::jsonb, ${lit(app)}::jsonb) returning id`,
    );
    return rows[0]!.id;
  }

  async skillId(slug: string): Promise<string> {
    const rows = await this.sql<{ id: string }>(
      `select id from public.skills where slug = ${lit(slug)}`,
    );
    if (!rows[0]) throw new Error(`Compétence inconnue : ${slug}`);
    return rows[0].id;
  }

  async skillIds(...slugs: string[]): Promise<string[]> {
    return Promise.all(slugs.map((slug) => this.skillId(slug)));
  }
}

export class Session {
  constructor(private readonly pg: PGlite) {}

  async sql<T extends Row = Row>(query: string): Promise<T[]> {
    const result = await this.pg.query<T>(query);
    return result.rows;
  }

  /** Appelle une fonction publique avec des arguments nommés. */
  async rpc<T = unknown>(name: string, args: Record<string, SqlValue> = {}): Promise<T> {
    const list = Object.entries(args)
      .map(([key, value]) => `${key} => ${lit(value)}`)
      .join(", ");
    const result = await this.pg.query<{ result: T }>(`select public.${name}(${list}) as result`);
    return result.rows[0]!.result;
  }
}

export type SqlValue = string | number | boolean | null | Raw | Record<string, unknown> | unknown[];

class Raw {
  constructor(public readonly sql: string) {}
}

/** Fragment SQL déjà formé, inséré tel quel (à réserver aux valeurs construites par le test). */
export function raw(sql: string): Raw {
  return new Raw(sql);
}

/** Tableau d'identifiants → `array[...]::uuid[]`. */
export function uuids(values: string[]): Raw {
  return new Raw(values.length ? `array[${values.map(lit).join(", ")}]::uuid[]` : `'{}'::uuid[]`);
}

/** Tableau de textes → `array[...]::text[]`. */
export function texts(values: string[]): Raw {
  return new Raw(values.length ? `array[${values.map(lit).join(", ")}]::text[]` : `'{}'::text[]`);
}

/** Valeur JSON → littéral `jsonb`. */
export function json(value: unknown): Raw {
  return new Raw(`${lit(JSON.stringify(value))}::jsonb`);
}

export function lit(value: SqlValue): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Raw) return value.sql;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  return `${lit(JSON.stringify(value))}::jsonb`;
}

/** Attend qu'une promesse échoue et renvoie le message d'erreur. */
export async function failure(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("L'opération aurait dû être refusée, mais elle a réussi.");
}

/** Deux développeurs complémentaires (le scénario Kodjo / Amina du cahier des charges). */
export async function createKodjoAndAmina(db: TestDb) {
  const kodjo = await db.createUser({ first: "Kodjo", last: "Mensah", country: "TG", timezone: "Africa/Lome" });
  const amina = await db.createUser({ first: "Amina", last: "Diallo", country: "SN", timezone: "Africa/Dakar" });
  const [flutter, dart, python, ia, ml] = await db.skillIds(
    "flutter", "dart", "python", "intelligence-artificielle", "machine-learning",
  );
  const profile = `languages = '{fr,en}', availability = '{weekday_evening,weekend}', collaboration_modes = '{remote}'`;
  await db.sql(`update public.profiles set ${profile} where id in (${lit(kodjo)}, ${lit(amina)})`);

  await db.as(kodjo, async (s) => {
    await s.rpc("set_my_skills", {
      p_type: "offered",
      p_items: json([{ skill_id: flutter, level: "advanced" }, { skill_id: dart, level: "advanced" }]),
    });
    await s.rpc("set_my_skills", {
      p_type: "wanted",
      p_items: json([{ skill_id: python }, { skill_id: ia }]),
    });
  });
  await db.as(amina, async (s) => {
    await s.rpc("set_my_skills", {
      p_type: "offered",
      p_items: json([{ skill_id: python, level: "expert" }, { skill_id: ml, level: "advanced" }]),
    });
    await s.rpc("set_my_skills", {
      p_type: "wanted",
      p_items: json([{ skill_id: flutter }, { skill_id: dart }]),
    });
  });
  return { kodjo, amina, skills: { flutter: flutter!, dart: dart!, python: python!, ia: ia!, ml: ml! } };
}

/** Tableau de valeurs simples → littéral de tableau PostgreSQL (le type est déduit du paramètre). */
export function pgArray(values: (string | number | boolean)[]): Raw {
  const escape = (value: string) => value.split("\\").join("\\\\").split('"').join('\\"');
  const body = values.map((value) => `"${escape(String(value))}"`).join(",");
  return new Raw(lit(`{${body}}`));
}

/** Convertit des arguments « façon API » (tableaux, objets) en valeurs SQL. */
export function apiArgs(args: Record<string, unknown>): Record<string, SqlValue> {
  const out: Record<string, SqlValue> = {};
  for (const [key, value] of Object.entries(args)) {
    if (Array.isArray(value)) {
      const simple = value.every((item) => ["string", "number", "boolean"].includes(typeof item));
      out[key] = simple ? pgArray(value as string[]) : json(value);
    } else if (value !== null && typeof value === "object") {
      out[key] = json(value);
    } else {
      out[key] = value as SqlValue;
    }
  }
  return out;
}
