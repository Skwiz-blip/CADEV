import type { ReactNode } from "react";
import { NotConfigured } from "@/components/auth/not-configured";
import { AppShell } from "@/components/layout/app-shell";
import { SiteFooter, SiteHeader } from "@/components/layout/site";
import { getViewer } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/env";

// Le contenu dépend de la base et de la personne connectée : rendu à la demande.
export const dynamic = "force-dynamic";

/**
 * Pages consultables par tous (annonces, développeurs, attestations).
 * Un membre connecté les voit dans son espace ; un visiteur, dans le site public.
 */
export default async function DiscoverLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  const content = isSupabaseConfigured ? children : <NotConfigured />;

  if (viewer?.profile.onboarding_completed_at) {
    return <AppShell viewer={viewer}>{content}</AppShell>;
  }
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader viewer={viewer} />
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        {content}
      </main>
      <SiteFooter />
    </div>
  );
}
