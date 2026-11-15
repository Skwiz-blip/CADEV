"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { countryTimezone } from "@/lib/data/countries";
import { SITE_URL, isSupabaseConfigured } from "@/lib/env";
import { authErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Viewer } from "@/lib/types";
import { safeNext } from "@/lib/utils";
import {
  forgotPasswordSchema,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";
import { fail, invalid, ok, refreshAll } from "./helpers";

const NOT_CONFIGURED = "Le service de comptes n'est pas encore configuré.";

async function origin(): Promise<string> {
  const header = (await headers()).get("origin");
  return header && /^https?:\/\//.test(header) ? header : SITE_URL;
}

export async function signUpAction(
  input: unknown,
): Promise<ActionResult<{ email: string; redirectTo: string | null }>> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { firstName, lastName, email, password, country } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=/bienvenue`,
      data: {
        first_name: firstName,
        last_name: lastName,
        country,
        timezone: countryTimezone(country),
      },
    },
  });
  if (error) return fail(authErrorMessage(error));
  // Adresse déjà inscrite : Supabase renvoie un compte « fantôme » sans identité.
  if (data.user && data.user.identities?.length === 0) {
    return fail("Un compte existe déjà avec cette adresse e-mail.", {
      email: "Un compte existe déjà avec cette adresse.",
    });
  }
  // Confirmation par e-mail désactivée : la session est ouverte tout de suite.
  if (data.session) {
    refreshAll();
    return ok({ email, redirectTo: "/bienvenue" });
  }
  return ok({ email, redirectTo: null });
}

export async function resendConfirmationAction(email: string): Promise<ActionResult<null>> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/bienvenue` },
  });
  if (error) return fail(authErrorMessage(error));
  return ok(null);
}

/** Renvoie la page où aller : la navigation est faite par le navigateur. */
export async function signInAction(input: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(authErrorMessage(error));
  refreshAll();
  return ok({ redirectTo: safeNext(next) });
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  refreshAll();
  redirect("/");
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult<null>> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/reinitialiser-mot-de-passe`,
  });
  // On ne révèle jamais si l'adresse correspond à un compte : seule une
  // limitation de débit est signalée.
  if (error && error.status === 429) return fail(authErrorMessage(error));
  return ok(null);
}

export async function updatePasswordAction(input: unknown): Promise<ActionResult<null>> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return fail("Le lien a expiré. Demande un nouveau lien de réinitialisation.");
  }
  // Les comptes de démonstration sont partagés : leur mot de passe ne change pas.
  const { data: context } = await supabase.rpc("viewer_context");
  if ((context as Viewer | null)?.profile.is_demo) {
    return fail("Le mot de passe d'un compte de démonstration ne peut pas être modifié.");
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(authErrorMessage(error));
  return ok(null);
}
