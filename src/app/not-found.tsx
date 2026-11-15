import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <main id="contenu" className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 py-16 text-center">
      <Logo />
      <span className="mt-12 flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Compass className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-semibold text-ink">Cette page n&apos;existe pas</h1>
      <p className="mt-3 max-w-md text-muted">
        Le lien est peut-être incomplet, ou le contenu a été retiré. Les échanges, eux, sont toujours là.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/explorer">Explorer les échanges</Link>
        </Button>
        <Button asChild variant="subtle">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </main>
  );
}
