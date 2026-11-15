import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { NotConfigured } from "@/components/auth/not-configured";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Mot de passe oublié</h1>
        <p className="mt-2 text-muted">
          Indique ton adresse e-mail : tu recevras un lien pour choisir un nouveau mot de passe.
        </p>
      </header>
      {isSupabaseConfigured ? <ForgotPasswordForm /> : <NotConfigured />}
      <p className="text-center text-sm text-muted">
        <Link href="/connexion" className="link">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
