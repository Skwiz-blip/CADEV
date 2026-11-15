import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Variante « jeton » des liens e-mail (modèles d'e-mail personnalisés dans
 * Supabase : /auth/confirm?token_hash=…&type=…). Fonctionne quel que soit
 * l'appareil sur lequel le lien est ouvert.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/reinitialiser-mot-de-passe" : "/bienvenue";
  const next = safeNext(searchParams.get("next"), fallback);

  if (tokenHash && type && TYPES.includes(type) && isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL("/connexion?message=lien", origin));
}
