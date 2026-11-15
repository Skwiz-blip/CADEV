import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NotConfigured } from "@/components/auth/not-configured";
import { Logo } from "@/components/layout/logo";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Pages personnelles : toujours rendues à la demande, jamais pré-générées.
export const dynamic = "force-dynamic";

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
        <Logo href="/" />
      </header>
      <main id="contenu" className="mx-auto max-w-3xl px-4 pb-20 pt-4 sm:px-6">
        {isSupabaseConfigured ? children : <NotConfigured />}
      </main>
    </div>
  );
}
