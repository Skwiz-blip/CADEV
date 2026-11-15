import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferForm } from "@/components/offers/offer-form";
import { PageHeader } from "@/components/ui/primitives";
import { getSkills, requireMember, rpc } from "@/lib/api";
import type { OfferDetail } from "@/lib/types";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Modifier l'annonce" };

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [viewer, skills, offer] = await Promise.all([
    requireMember(),
    getSkills(),
    rpc<OfferDetail | null>("get_offer", { p_id: id }),
  ]);
  // Seul l'auteur modifie son annonce (la base le revérifie à l'enregistrement).
  if (!offer || !offer.viewer.is_owner || offer.status === "removed") notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/annonces/${offer.id}`}
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Retour à l&apos;annonce
      </Link>
      <PageHeader title="Modifier l'annonce" description="Les changements sont visibles dès l'enregistrement." />
      <OfferForm skills={skills} profile={viewer.profile} offer={offer} />
    </div>
  );
}
