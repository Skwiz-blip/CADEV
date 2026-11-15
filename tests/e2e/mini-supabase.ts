import { createHmac, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { seedDemoWith, type SeedBackend } from "../../src/lib/demo/seed";
import { TestDb, json, lit, raw, type SqlValue } from "../db/harness";

/**
 * Mini-serveur compatible Supabase, pour les tests de bout en bout.
 *
 * Il parle les mêmes protocoles que Supabase (comptes et appels de fonctions),
 * mais s'appuie sur le PostgreSQL embarqué où sont appliquées les vraies
 * migrations. L'application tourne donc contre la vraie base, les vraies règles
 * d'accès et les vraies fonctions, sans réseau ni compte à créer.
 *
 * Non couvert : le temps réel (l'application bascule alors sur son rattrapage
 * périodique, ce qui teste ce chemin) et l'envoi de fichiers.
 */

const JWT_SECRET = "mini-supabase-secret-pour-les-tests-uniquement";
export const PUBLIC_KEY = "cle-publique-de-test-mini-supabase-0123456789";
export const SERVICE_KEY = "cle-secrete-de-test-mini-supabase-0123456789";

type Account = {
  id: string;
  email: string;
  password: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
  created_at: string;
};

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verify(token: string): { sub?: string } | null {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  if (expected !== signature) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { sub?: string; exp?: number };
  if (payload.exp && payload.exp < Date.now() / 1000) return null;
  return payload;
}

export class MiniSupabase {
  private server?: Server;
  private accounts = new Map<string, Account>();
  private signatures = new Map<string, Map<string, string>>();
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(public readonly db: TestDb) {}

  static async start(port: number): Promise<MiniSupabase> {
    const instance = new MiniSupabase(await TestDb.create());
    await instance.loadSignatures();
    instance.server = createServer((request, response) => {
      instance.handle(request, response).catch((error: unknown) => {
        console.error("[mini-supabase]", error);
        instance.send(response, 500, { message: "internal_error" });
      });
    });
    await new Promise<void>((resolve) => instance.server!.listen(port, "127.0.0.1", resolve));
    return instance;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
    await this.db.close();
  }

  /** La base n'a qu'une connexion : chaque requête attend la fin de la précédente. */
  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  // ── Comptes ──────────────────────────────────────────────────────────
  async createAccount(input: {
    email: string;
    password: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  }): Promise<Account> {
    const email = input.email.toLowerCase();
    if (this.accounts.has(email)) throw new Error("user_already_exists");
    const rows = await this.exclusive(() =>
      this.db.sql<{ id: string }>(
        `insert into auth.users (email, raw_user_meta_data, raw_app_meta_data)
         values (${lit(email)}, ${lit(JSON.stringify(input.user_metadata ?? {}))}::jsonb,
                 ${lit(JSON.stringify(input.app_metadata ?? {}))}::jsonb) returning id`,
      ),
    );
    const account: Account = {
      id: rows[0]!.id,
      email,
      password: input.password,
      user_metadata: input.user_metadata ?? {},
      app_metadata: { provider: "email", providers: ["email"], ...(input.app_metadata ?? {}) },
      created_at: new Date().toISOString(),
    };
    this.accounts.set(email, account);
    return account;
  }

  private byId(id: string): Account | undefined {
    return [...this.accounts.values()].find((account) => account.id === id);
  }

  private userJson(account: Account) {
    return {
      id: account.id,
      aud: "authenticated",
      role: "authenticated",
      email: account.email,
      email_confirmed_at: account.created_at,
      phone: "",
      app_metadata: account.app_metadata,
      user_metadata: account.user_metadata,
      identities: [{ id: account.id, user_id: account.id, provider: "email", identity_data: { email: account.email } }],
      created_at: account.created_at,
      updated_at: account.created_at,
    };
  }

  private session(account: Account) {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600;
    return {
      access_token: sign({
        sub: account.id,
        aud: "authenticated",
        role: "authenticated",
        email: account.email,
        session_id: randomUUID(),
        iat: now,
        exp: now + expiresIn,
        app_metadata: account.app_metadata,
        user_metadata: account.user_metadata,
      }),
      token_type: "bearer",
      expires_in: expiresIn,
      expires_at: now + expiresIn,
      refresh_token: `refresh.${account.id}`,
      user: this.userJson(account),
    };
  }

  /** Données de démonstration : le scénario du projet, rejoué ici. */
  async seed(options: { password: string; emailDomain: string }): Promise<void> {
    const backend: SeedBackend = {
      listDemoUserIds: async () =>
        [...this.accounts.values()].filter((account) => account.app_metadata.is_demo === true).map((account) => account.id),
      deleteUser: async (id) => {
        const account = this.byId(id);
        if (account) this.accounts.delete(account.email);
        await this.exclusive(() => this.db.sql(`delete from auth.users where id = ${lit(id)}`));
      },
      createUser: async (input) => {
        const account = await this.createAccount({
          email: input.email,
          password: input.password,
          user_metadata: {
            first_name: input.firstName,
            last_name: input.lastName,
            country: input.country,
            timezone: input.timezone,
          },
          app_metadata: { is_demo: true },
        });
        return account.id;
      },
      rpc: <T>(userId: string | null, fn: string, args: Record<string, unknown>) =>
        this.call<T>(userId ? "user" : "server", userId, fn, args),
      close: async () => undefined,
    };
    await seedDemoWith(backend, options);
  }

  // ── Appels de fonctions ──────────────────────────────────────────────
  private async loadSignatures(): Promise<void> {
    const rows = await this.db.sql<{ name: string; args: string }>(
      `select p.proname as name, pg_get_function_arguments(p.oid) as args
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`,
    );
    for (const row of rows) {
      const types = new Map<string, string>();
      for (const part of row.args.split(/,\s*(?![^()]*\))/).filter(Boolean)) {
        const match = part.trim().match(/^(?:IN |OUT |INOUT )?(\w+)\s+(.+?)(?:\s+DEFAULT\s+.+)?$/i);
        if (match) types.set(match[1]!, match[2]!);
      }
      this.signatures.set(row.name, types);
    }
  }

  private literal(type: string, value: unknown): SqlValue {
    if (value === null || value === undefined) return null;
    if (type === "jsonb" || type === "json") return json(value);
    if (type.endsWith("[]")) {
      const items = (value as unknown[]).map((item) => `"${String(item).split("\\").join("\\\\").split('"').join('\\"')}"`);
      return raw(`${lit(`{${items.join(",")}}`)}::${type}`);
    }
    if (typeof value === "number" || typeof value === "boolean") return value;
    return raw(`${lit(String(value))}::${type}`);
  }

  async call<T>(mode: "anon" | "user" | "server", userId: string | null, fn: string, args: Record<string, unknown>): Promise<T> {
    const types = this.signatures.get(fn);
    if (!types) throw Object.assign(new Error(`Could not find the function public.${fn}`), { code: "PGRST202" });
    const named: Record<string, SqlValue> = {};
    for (const [key, value] of Object.entries(args)) {
      const type = types.get(key);
      if (!type) throw Object.assign(new Error(`Argument inconnu : ${key}`), { code: "PGRST202" });
      named[key] = this.literal(type, value);
    }
    return this.exclusive(() => {
      const run = (session: { rpc: <R>(name: string, a: Record<string, SqlValue>) => Promise<R> }) => session.rpc<T>(fn, named);
      if (mode === "server") return this.db.asServer(run);
      return this.db.as(mode === "user" ? userId : null, run);
    });
  }

  // ── HTTP ─────────────────────────────────────────────────────────────
  private send(response: ServerResponse, status: number, body?: unknown): void {
    response.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    });
    response.end(body === undefined ? "" : JSON.stringify(body));
  }

  private async body(request: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const text = Buffer.concat(chunks).toString("utf8");
    try {
      return text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  private bearer(request: IncomingMessage): string {
    return (request.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;
    if (request.method === "OPTIONS") return this.send(response, 204);

    // Comptes
    if (path === "/auth/v1/token" && request.method === "POST") {
      const body = await this.body(request);
      if (url.searchParams.get("grant_type") === "refresh_token") {
        const account = this.byId(String(body.refresh_token ?? "").replace(/^refresh\./, ""));
        return account
          ? this.send(response, 200, this.session(account))
          : this.send(response, 400, { error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
      }
      const account = this.accounts.get(String(body.email ?? "").toLowerCase());
      if (!account || account.password !== body.password) {
        return this.send(response, 400, { error_code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      return this.send(response, 200, this.session(account));
    }
    if (path === "/auth/v1/signup" && request.method === "POST") {
      const body = await this.body(request);
      try {
        const account = await this.createAccount({
          email: String(body.email),
          password: String(body.password),
          user_metadata: (body.data as Record<string, unknown>) ?? {},
        });
        return this.send(response, 200, this.session(account));
      } catch {
        return this.send(response, 422, { error_code: "user_already_exists", msg: "User already registered" });
      }
    }
    if (path === "/auth/v1/user") {
      const payload = verify(this.bearer(request));
      const account = payload?.sub ? this.byId(payload.sub) : undefined;
      if (!account) return this.send(response, 401, { error_code: "bad_jwt", msg: "invalid JWT" });
      if (request.method === "PUT") {
        const body = await this.body(request);
        if (typeof body.password === "string") account.password = body.password;
      }
      return this.send(response, 200, this.userJson(account));
    }
    if (path === "/auth/v1/logout") return this.send(response, 204);
    if (path === "/auth/v1/recover" || path === "/auth/v1/resend") return this.send(response, 200, {});

    // Fonctions de la base
    const rpc = path.match(/^\/rest\/v1\/rpc\/(\w+)$/);
    if (rpc && request.method === "POST") {
      const token = this.bearer(request);
      const args = await this.body(request);
      const payload = token === PUBLIC_KEY || token === SERVICE_KEY ? null : verify(token);
      const mode = token === SERVICE_KEY ? "server" : payload?.sub ? "user" : "anon";
      try {
        const result = await this.call<unknown>(mode, payload?.sub ?? null, rpc[1]!, args);
        return this.send(response, 200, result ?? null);
      } catch (error) {
        const message = (error as Error).message;
        const code = (error as { code?: string }).code ?? (/permission denied/.test(message) ? "42501" : /check constraint/.test(message) ? "23514" : "P0001");
        return this.send(response, code === "42501" ? 403 : code === "PGRST202" ? 404 : 400, {
          code,
          message,
          details: null,
          hint: null,
        });
      }
    }

    // Fichiers : acceptés sans être conservés.
    if (path.startsWith("/storage/v1/object/list/")) return this.send(response, 200, []);
    if (path.startsWith("/storage/v1/object/")) return this.send(response, 200, { Key: path });

    return this.send(response, 404, { message: `Route non gérée : ${request.method} ${path}` });
  }
}
