import { CircleAlert, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DemoAccounts, SignInForm } from "@/components/auth/forms";
import { NotConfigured } from "@/components/auth/not-configured";
import { Notice } from "@/components/ui/primitives";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/env";
import { firstParam, safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Connexion" };

const MESSAGES: Record<string, { tone: "ok" | "warm"; text: string }> = {
  confirme: { tone: "ok", text: "Ton adresse e-mail est confirmée. Connecte-toi pour continuer." },
  lien: {
    tone: "warm",
    text: "Ce lien a expiré ou a déjà été utilisé. Connecte-toi, ou demande un nouveau lien.",
  },
  "mot-de-passe": { tone: "ok", text: "Ton mot de passe a été mis à jour." },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextParam = firstParam(params.next);
  const next = nextParam ? safeNext(nextParam) : undefined;
  const message = MESSAGES[firstParam(params.message) ?? ""];

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Content de te revoir</h1>
        <p className="mt-2 text-muted">Connecte-toi pour retrouver tes échanges et tes correspondances.</p>
      </header>
      {message ? (
        <Notice tone={message.tone} icon={message.tone === "ok" ? CircleCheck : CircleAlert}>
          {message.text}
        </Notice>
      ) : next ? (
        <Notice tone="brand" icon={CircleAlert}>
          Connecte-toi pour accéder à cette page.
        </Notice>
      ) : null}
      {isSupabaseConfigured ? <SignInForm next={next} /> : <NotConfigured />}
      {DEMO_MODE && isSupabaseConfigured ? <DemoAccounts /> : null}
      <p className="text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="link">
          Rejoindre DevBridge
        </Link>
      </p>
    </div>
  );
}
