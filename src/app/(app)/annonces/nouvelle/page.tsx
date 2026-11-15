import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OfferForm } from "@/components/offers/offer-form";
import { PageHeader } from "@/components/ui/primitives";
import { getSkills, requireMember } from "@/lib/api";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Publier une annonce" };

export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [viewer, skills, query] = await Promise.all([requireMember(), getSkills(), searchParams]);
  const express = firstParam(query.express) === "1";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/explorer" className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Explorer les échanges
      </Link>
      <PageHeader
        title={express ? "Demander un coup de main express" : "Publier une annonce"}
        description="Dis ce que tu apportes et ce que tu recherches. Tu verras un aperçu avant de publier."
      />
      <OfferForm skills={skills} profile={viewer.profile} express={express} />
    </div>
  );
}
