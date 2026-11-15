import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/forms";
import { NotConfigured } from "@/components/auth/not-configured";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Rejoins DevBridge et trouve les développeurs qui complètent tes compétences.",
};

export default function SignUpPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Rejoindre DevBridge</h1>
        <p className="mt-2 text-muted">
          Un compte gratuit, puis quelques questions pour présenter ce que tu sais faire.
        </p>
      </header>
      {isSupabaseConfigured ? <SignUpForm /> : <NotConfigured />}
      <p className="text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="link">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
