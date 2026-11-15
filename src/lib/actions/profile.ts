"use server";

import { rpc } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ChecklistKey, Viewer } from "@/lib/types";
import { profileSchema, skillsSchema } from "@/lib/validation";
import { invalid, refreshAll, run } from "./helpers";

type Checklist = { score: number; missing: ChecklistKey[] };

const NULLABLE_WHEN_EMPTY = new Set([
  "avatar_url", "city", "headline", "bio", "experience_level", "main_domain",
  "github_url", "portfolio_url", "linkedin_url", "website_url",
]);

export async function updateProfileAction(input: unknown): Promise<ActionResult<Checklist>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    patch[key] = value === "" && NULLABLE_WHEN_EMPTY.has(key) ? null : value;
  }
  return run(async () => {
    const checklist = await rpc<Checklist>("update_my_profile", { p_patch: patch });
    refreshAll();
    return checklist;
  });
}

export async function saveSkillsAction(input: unknown): Promise<ActionResult<number>> {
  const parsed = skillsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    const total = await rpc<number>("set_my_skills", {
      p_type: parsed.data.type,
      p_items: parsed.data.items.map((item) => ({ skill_id: item.skill_id, level: item.level ?? null })),
      p_kind: parsed.data.kind ?? null,
    });
    refreshAll();
    return total;
  });
}

export async function refreshMatchesAction(): Promise<ActionResult<number>> {
  return run(async () => {
    const total = await rpc<number>("refresh_my_matches");
    refreshAll();
    return total;
  });
}

/** Suppression définitive du compte, de ses fichiers et de tout ce qui lui est rattaché. */
export async function deleteAccountAction(confirmation: string): Promise<ActionResult<{ redirectTo: string }>> {
  if (confirmation.trim().toUpperCase() !== "SUPPRIMER") {
    return { ok: false, error: "Écris SUPPRIMER pour confirmer." };
  }
  const result = await run(async () => {
    const supabase = await createClient();
    const viewer = await rpc<Viewer | null>("viewer_context");
    if (viewer?.profile.is_demo) {
      throw new AppError("demo", "Un compte de démonstration ne peut pas être supprimé d'ici.");
    }
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (userId) {
      // Nettoyage des fichiers : au mieux, sans bloquer la suppression du compte.
      const storage = (createAdminClient() ?? supabase).storage.from("avatars");
      const { data: files } = await storage.list(userId);
      if (files?.length) await storage.remove(files.map((file) => `${userId}/${file.name}`));
    }
    await rpc<null>("delete_my_account");
    await supabase.auth.signOut();
    return null;
  });
  if (!result.ok) return result;
  refreshAll();
  return { ok: true, data: { redirectTo: "/" } };
}
