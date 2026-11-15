import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

/**
 * Retour des liens envoyés par e-mail (confirmation d'inscription, mot de passe
 * oublié). Le code reçu est échangé contre une session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/tableau-de-bord");

  if (code && isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    // Lien ouvert sur un autre appareil que celui de l'inscription : l'adresse
    // est bien confirmée, il reste simplement à se connecter.
    if (next === "/bienvenue") {
      return NextResponse.redirect(new URL("/connexion?message=confirme", origin));
    }
  }
  return NextResponse.redirect(new URL("/connexion?message=lien", origin));
}
