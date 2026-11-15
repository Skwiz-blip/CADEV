import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types";
import { fieldErrors } from "@/lib/validation";

type Failure = Extract<ActionResult, { ok: false }>;

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fields?: Record<string, string>): Failure {
  return { ok: false, error, fields };
}

export function invalid(error: ZodError): Failure {
  const fields = fieldErrors(error);
  return fail(Object.values(fields)[0] ?? "Vérifie les informations saisies.", fields);
}

/**
 * Exécute une action et renvoie toujours un résultat lisible :
 * jamais d'erreur brute ni de détail technique envoyé au navigateur.
 */
export async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await action());
  } catch (error) {
    unstable_rethrow(error); // laisse passer les redirections de Next.js
    if (error instanceof AppError) return fail(error.message);
    console.error("[action]", error);
    return fail("Une erreur est survenue. Réessaie dans un instant.");
  }
}

/** Après une écriture : toutes les pages affichées se remettent à jour. */
export function refreshAll(): void {
  revalidatePath("/", "layout");
}
