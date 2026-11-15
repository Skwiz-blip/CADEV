import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountDialog, PasswordForm, SignOutButton } from "@/components/profile/settings";
import { Button } from "@/components/ui/button";
import { Card, Notice, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { requireMember } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const viewer = await requireMember();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "—";
  const isDemo = viewer.profile.is_demo;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Paramètres" description="Ton compte, ta sécurité et tes données." />

      {isDemo ? (
        <Notice tone="warm" icon={FlaskConical} title="Compte de démonstration">
          Ce compte est partagé pour faire découvrir la plateforme : son mot de passe ne peut pas être changé et il ne
          peut pas être supprimé d&apos;ici.
        </Notice>
      ) : null}

      <Card className="space-y-5">
        <SectionTitle title="Compte" />
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-canvas px-4 py-3">
            <dt className="text-xs text-muted">Adresse e-mail</dt>
            <dd className="truncate text-sm font-medium text-ink">{email}</dd>
          </div>
          <div className="rounded-xl bg-canvas px-4 py-3">
            <dt className="text-xs text-muted">Membre depuis</dt>
            <dd className="text-sm font-medium text-ink">{formatDate(viewer.profile.created_at)}</dd>
          </div>
          <div className="rounded-xl bg-canvas px-4 py-3">
            <dt className="text-xs text-muted">Nom d&apos;utilisateur</dt>
            <dd className="text-sm font-medium text-ink">@{viewer.profile.username}</dd>
          </div>
          <div className="rounded-xl bg-canvas px-4 py-3">
            <dt className="text-xs text-muted">Fuseau horaire</dt>
            <dd className="text-sm font-medium text-ink">{viewer.profile.timezone.replace(/_/g, " ")}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted">Ton adresse e-mail n&apos;est jamais affichée aux autres membres.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="soft">
            <Link href="/profil/modifier">Modifier mon profil</Link>
          </Button>
          <SignOutButton />
        </div>
      </Card>

      {isDemo ? null : (
        <Card className="space-y-5">
          <SectionTitle title="Mot de passe" description="Il remplace immédiatement l'ancien." />
          <PasswordForm />
        </Card>
      )}

      <Card className="space-y-4">
        <SectionTitle title="Mes données" />
        <p className="text-sm text-ink/85">
          Ton profil, tes compétences et tes échanges terminés sont publics : c&apos;est ce qui permet aux autres de te
          trouver. Tes propositions, tes collaborations, tes fichiers et tes messages ne sont visibles que par les
          personnes concernées. Le détail figure dans la{" "}
          <Link href="/confidentialite" className="link">
            politique de confidentialité
          </Link>
          .
        </p>
      </Card>

      {isDemo ? null : (
        <Card className="space-y-4">
          <SectionTitle
            title="Supprimer mon compte"
            description="Efface définitivement ton profil et tout ce qui lui est rattaché. Les échanges terminés disparaissent aussi du parcours de tes partenaires."
          />
          <DeleteAccountDialog />
        </Card>
      )}
    </div>
  );
}
