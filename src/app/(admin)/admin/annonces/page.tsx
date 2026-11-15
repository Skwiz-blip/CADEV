import { Megaphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OfferModerationButton } from "@/components/admin/admin-client";
import { ExchangeTypeBadge } from "@/components/shared/cards";
import { FilterBar } from "@/components/shared/filter-bar";
import { Badge, Card, DemoBadge, EmptyState, Pagination, type BadgeTone } from "@/components/ui/primitives";
import { requireAdmin, rpc } from "@/lib/api";
import { OFFER_STATUS } from "@/lib/labels";
import type { AdminOffer, OfferStatus, Paginated } from "@/lib/types";
import { firstParam, formatDate, fullName, plural, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Annonces" };

const PAGE_SIZE = 20;
const TONES: Record<OfferStatus, BadgeTone> = {
  open: "ok", paused: "warm", closed: "neutral", removed: "danger", deleted: "neutral",
};

export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const values = { q: firstParam(raw.q), statut: firstParam(raw.statut), signalees: firstParam(raw.signalees) };
  const page = Math.max(1, Number(firstParam(raw.page)) || 1);
  const result = await rpc<Paginated<AdminOffer>>("admin_list_offers", {
    p_query: values.q ?? null,
    p_status: values.statut ?? null,
    p_reported_only: values.signalees === "1",
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <div className="space-y-5">
      <FilterBar
        key={JSON.stringify(values)}
        basePath="/admin/annonces"
        values={values}
        placeholder="Rechercher dans les annonces…"
        fields={[
          {
            name: "statut",
            label: "Statut",
            options: (["open", "paused", "closed", "removed"] as OfferStatus[]).map((value) => ({
              value,
              label: OFFER_STATUS[value],
            })),
          },
          { name: "signalees", label: "Toutes les annonces", options: [{ value: "1", label: "Signalées uniquement" }] },
        ]}
      />
      <p className="text-sm text-muted">{plural(result.total, "annonce")} · les annonces signalées apparaissent en premier</p>

      {result.items.length === 0 ? (
        <Card className="p-0 sm:p-0">
          <EmptyState icon={Megaphone} title="Aucune annonce ne correspond" description="Modifie la recherche ou retire un filtre." />
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {result.items.map((offer) => (
            <li key={offer.id} className="rounded-2xl bg-surface p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONES[offer.status]}>{OFFER_STATUS[offer.status]}</Badge>
                <ExchangeTypeBadge type={offer.exchange_type} />
                {offer.is_demo ? <DemoBadge /> : null}
                {offer.reports_open ? (
                  <Badge tone="danger">{plural(offer.reports_open, "signalement ouvert", "signalements ouverts")}</Badge>
                ) : offer.reports_count ? (
                  <Badge>{plural(offer.reports_count, "signalement traité", "signalements traités")}</Badge>
                ) : null}
                <span className="ml-auto text-xs text-faint">{formatDate(offer.created_at)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 basis-72">
                  <Link href={`/annonces/${offer.id}`} className="font-semibold text-ink hover:text-brand">
                    {offer.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{offer.description}</p>
                  <p className="mt-2 text-sm text-ink">
                    Par{" "}
                    <Link href={`/developpeurs/${offer.author?.username ?? ""}`} className="link">
                      {fullName(offer.author)}
                    </Link>
                  </p>
                  {offer.moderation_note ? (
                    <p className="mt-2 rounded-xl bg-danger-soft px-3.5 py-2 text-sm text-ink">
                      <strong className="font-semibold text-danger-strong">Motif du retrait : </strong>
                      {offer.moderation_note}
                    </p>
                  ) : null}
                </div>
                <OfferModerationButton offerId={offer.id} status={offer.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={result.total}
        hrefFor={(target) => withParams("/admin/annonces", values, { page: target > 1 ? target : undefined })}
      />
    </div>
  );
}
