import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NotConfigured } from "@/components/auth/not-configured";
import { AppShell } from "@/components/layout/app-shell";
import { requireMember } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Pages personnelles : toujours rendues à la demande, jamais pré-générées.
export const dynamic = "force-dynamic";

/** Espace connecté : identité vérifiée côté serveur à chaque page. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <main id="contenu" className="mx-auto max-w-2xl px-4 py-20">
        <NotConfigured />
      </main>
    );
  }
  const viewer = await requireMember();
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
