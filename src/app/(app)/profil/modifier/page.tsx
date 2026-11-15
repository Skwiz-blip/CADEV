import { ArrowLeft, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/primitives";
import { requireMember } from "@/lib/api";

export const metadata: Metadata = { title: "Modifier mon profil" };

export default async function EditProfilePage() {
  const viewer = await requireMember();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/developpeurs/${viewer.profile.username}`}
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Mon profil
      </Link>
      <PageHeader
        title="Modifier mon profil"
        description="Ce que les autres développeurs voient avant de te proposer un échange."
        actions={
          <Button asChild variant="soft">
            <Link href="/competences">
              <ListChecks aria-hidden /> Mes compétences
            </Link>
          </Button>
        }
      />
      <ProfileForm profile={viewer.profile} />
    </div>
  );
}
