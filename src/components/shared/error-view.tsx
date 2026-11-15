"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Écran d'erreur commun : dit ce qui se passe et propose de réessayer. */
export function ErrorView({
  error,
  reset,
  home = "/",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  home?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-warm-soft text-warm-strong">
        <WifiOff className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-semibold text-ink">Les données ne sont pas disponibles</h1>
      <p className="mt-3 max-w-md text-muted">
        Le service n&apos;a pas répondu. C&apos;est souvent une coupure de connexion passagère : rien n&apos;est perdu.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RefreshCw aria-hidden /> Réessayer
        </Button>
        <Button asChild variant="subtle">
          <Link href={home}>Retour</Link>
        </Button>
      </div>
      {error.digest ? <p className="mt-6 font-mono text-xs text-faint">Référence : {error.digest}</p> : null}
    </div>
  );
}
