"use server";

import { z } from "zod";
import { requireAdmin, rpc } from "@/lib/api";
import { demoEmail, purgeDemo, seedDemo, seedErrorMessage, type SeedConfig } from "@/lib/demo/seed";
import { DEMO_MODE, SUPABASE_PUBLIC_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";
import { authErrorMessage } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { fail, invalid, ok, refreshAll, run } from "./helpers";

const id = z.uuid();
const reason = z.string().trim().max(1000);

// ── Modération ───────────────────────────────────────────────────────────
export async function setUserStatusAction(
  userId: string,
  status: "active" | "suspended",
  note: string,
): Promise<ActionResult<null>> {
  const parsed = z.object({ userId: id, status: z.enum(["active", "suspended"]), note: reason }).safeParse({ userId, status, note });
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("admin_set_user_status", { p_user: userId, p_status: status, p_reason: parsed.data.note || null });
    refreshAll();
    return null;
  });
}

export async function moderateOfferAction(
  offerId: string,
  action: "remove" | "restore",
  note: string,
): Promise<ActionResult<null>> {
  const parsed = z.object({ offerId: id, action: z.enum(["remove", "restore"]), note: reason }).safeParse({ offerId, action, note });
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("admin_moderate_offer", { p_offer: offerId, p_action: action, p_reason: parsed.data.note || null });
    refreshAll();
    return null;
  });
}

export async function handleReportAction(
  reportId: string,
  status: "in_review" | "resolved" | "dismissed",
  note: string,
): Promise<ActionResult<null>> {
  const parsed = z
    .object({ reportId: id, status: z.enum(["in_review", "resolved", "dismissed"]), note: reason })
    .safeParse({ reportId, status, note });
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("admin_handle_report", { p_report: reportId, p_status: status, p_note: parsed.data.note || null });
    refreshAll();
    return null;
  });
}

// ── Données de démonstration ─────────────────────────────────────────────
function seedConfig(): SeedConfig | string {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const password = process.env.DEMO_PASSWORD;
  if (!serviceKey) return "La clé secrète Supabase (SUPABASE_SERVICE_ROLE_KEY) n'est pas configurée sur le serveur.";
  if (!password) return "Le mot de passe des comptes de démonstration (DEMO_PASSWORD) n'est pas configuré.";
  return {
    url: SUPABASE_URL,
    publicKey: SUPABASE_PUBLIC_KEY,
    serviceKey,
    password,
    emailDomain: process.env.DEMO_EMAIL_DOMAIN || "demo.devbridge.test",
  };
}

async function logDemoAction(action: "demo_reset" | "demo_purged", adminId: string, detail: string) {
  const admin = createAdminClient();
  await admin?.from("admin_actions").insert({ admin_id: adminId, action, target_type: "demo", reason: detail });
}

export async function resetDemoAction(): Promise<ActionResult<{ accounts: number }>> {
  const viewer = await requireAdmin();
  const config = seedConfig();
  if (typeof config === "string") return fail(config);
  try {
    const result = await seedDemo(config);
    await logDemoAction("demo_reset", viewer.profile.id, `${result.accounts.length} profils recréés.`);
    refreshAll();
    return ok({ accounts: result.accounts.length });
  } catch (error) {
    console.error("[demo]", error);
    return fail(seedErrorMessage(error));
  }
}

export async function purgeDemoAction(): Promise<ActionResult<{ removed: number }>> {
  const viewer = await requireAdmin();
  const config = seedConfig();
  if (typeof config === "string") return fail(config);
  try {
    const removed = await purgeDemo(config);
    await logDemoAction("demo_purged", viewer.profile.id, `${removed} profils supprimés.`);
    refreshAll();
    return ok({ removed });
  } catch (error) {
    console.error("[demo]", error);
    return fail(seedErrorMessage(error));
  }
}

/**
 * Connexion en un clic à un compte de démonstration (page de connexion, mode
 * démonstration uniquement). Le mot de passe reste sur le serveur.
 */
export async function demoSignInAction(account: "kodjo" | "amina"): Promise<ActionResult<{ redirectTo: string }>> {
  if (!DEMO_MODE || !isSupabaseConfigured) return fail("Le mode démonstration n'est pas activé.");
  const parsed = z.enum(["kodjo", "amina"]).safeParse(account);
  const password = process.env.DEMO_PASSWORD;
  if (!parsed.success || !password) return fail("Les comptes de démonstration ne sont pas disponibles.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: demoEmail(parsed.data, process.env.DEMO_EMAIL_DOMAIN || "demo.devbridge.test"),
    password,
  });
  if (error) {
    return fail(
      error.code === "invalid_credentials"
        ? "Les comptes de démonstration n'ont pas encore été créés."
        : authErrorMessage(error),
    );
  }
  refreshAll();
  return ok({ redirectTo: "/tableau-de-bord" });
}
