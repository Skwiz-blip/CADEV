import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/**
 * Exécuté avant chaque page : rafraîchit la session et protège les routes privées.
 * Chaque page privée revérifie ensuite l'identité côté serveur (double barrière).
 */

const PRIVATE_PREFIXES = [
  "/tableau-de-bord",
  "/pour-toi",
  "/mes-annonces",
  "/mes-echanges",
  "/propositions",
  "/collaborations",
  "/messages",
  "/notifications",
  "/profil",
  "/competences",
  "/parametres",
  "/bienvenue",
  "/admin",
  "/annonces/nouvelle",
];

const AUTH_PAGES = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

function isPrivate(pathname: string): boolean {
  if (/^\/annonces\/[^/]+\/modifier$/.test(pathname)) return true;
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Vérifie la signature du jeton et le renouvelle s'il a expiré.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!isAuthenticated && isPrivate(pathname)) {
    return redirectTo(`/connexion?next=${encodeURIComponent(pathname + search)}`);
  }
  if (isAuthenticated && AUTH_PAGES.includes(pathname)) {
    return redirectTo("/tableau-de-bord");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
