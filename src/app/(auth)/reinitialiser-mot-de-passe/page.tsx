import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { getViewer } from "@/lib/api";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

// La page dépend de la session ouverte par le lien reçu par e-mail : jamais pré-générée.
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  // On arrive ici par le lien reçu par e-mail, qui ouvre une session temporaire.
  const viewer = await getViewer();

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Choisis un nouveau mot de passe</h1>
        <p className="mt-2 text-muted">Il remplacera immédiatement l&apos;ancien.</p>
      </header>
      {viewer ? (
        <NewPasswordForm />
      ) : (
        <>
          <Notice tone="warm" icon={CircleAlert} title="Lien expiré">
            Ce lien n&apos;est plus valide. Demande un nouveau lien de réinitialisation.
          </Notice>
          <Button asChild block>
            <Link href="/mot-de-passe-oublie">Recevoir un nouveau lien</Link>
          </Button>
        </>
      )}
    </div>
  );
}
