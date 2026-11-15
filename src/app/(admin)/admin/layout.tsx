import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminTabs } from "@/components/admin/admin-client";
import { NotConfigured } from "@/components/auth/not-configured";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/primitives";
import { getAdminOverview, requireAdmin } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration DevBridge" },
  robots: { index: false, follow: false },
};

// Pages personnelles : toujours rendues à la demande, jamais pré-générées.
export const dynamic = "force-dynamic";

/**
 * Espace d'administration. L'accès est vérifié ici, puis de nouveau par chaque
 * fonction de la base : le rôle vit dans une table que le navigateur ne peut pas écrire.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <main id="contenu" className="mx-auto max-w-2xl px-4 py-20">
        <NotConfigured />
      </main>
    );
  }
  const viewer = await requireAdmin();
  const overview = await getAdminOverview();
  return (
    <AppShell viewer={viewer}>
      <div className="space-y-6">
        <PageHeader title="Administration" description="Suivi de la plateforme, modération et signalements." />
        <AdminTabs openReports={overview.reports_open} />
        {children}
      </div>
    </AppShell>
  );
}
