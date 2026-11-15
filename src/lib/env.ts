/**
 * Variables d'environnement. Les clés NEXT_PUBLIC_* sont publiques par nature
 * (elles sont protégées par les règles d'accès de la base). La clé secrète
 * n'est lue que dans `supabase/admin.ts`, côté serveur.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

/** Faux tant que le projet Supabase n'est pas branché : l'application l'explique au lieu de planter. */
export const isSupabaseConfigured =
  /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_PUBLIC_KEY.length > 20;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
