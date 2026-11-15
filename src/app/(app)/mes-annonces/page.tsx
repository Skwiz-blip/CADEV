import { Megaphone, Plus, ShieldAlert, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OfferOwnerActions } from "@/components/offers/offer-actions";
import { ExchangeTypeBadge, UrgentBadge } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Notice, PageHeader, SkillList, type BadgeTone } from "@/components/ui/primitives";
import { rpc } from "@/lib/api";
import { OFFER_STATUS } from "@/lib/labels";
import type { MyOffer, OfferStatus } from "@/lib/types";
import { formatDate, plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Mes annonces" };

const TONES: Record<OfferStatus, BadgeTone> = {
  open: "ok",
  paused: "warm",
  closed: "neutral",
  removed: "danger",
  deleted: "neutral",
};

export default async function MyOffersPage() {
  const offers = await rpc<MyOffer[]>("list_my_offers");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes annonces"
        description="Les offres, demandes et mentorats que tu as publiés."
        actions={
          <>
            <Button asChild variant="subtle">
              <Link href="/annonces/nouvelle?express=1">
                <Zap aria-hidden /> Coup de main express
              </Link>
            </Button>
            <Button asChild>
              <Link href="/annonces/nouvelle">
                <Plus aria-hidden /> Publier une annonce
              </Link>
            </Button>
          </>
        }
      />

      {offers.length === 0 ? (
        <Card className="p-0 sm:p-0">
          <EmptyState
            icon={Megaphone}
            title="Tu n'as pas encore publié d'annonce"
            description="Une annonce rend visible ce que tu proposes et ce que tu recherches. Elle t'apporte des propositions sans que tu aies à chercher."
            action={
              <Button asChild>
                <Link href="/annonces/nouvelle">Publier ma première annonce</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="space-y-4">
          {offers.map((offer) => (
            <li key={offer.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TONES[offer.status]}>{OFFER_STATUS[offer.status]}</Badge>
                  <ExchangeTypeBadge type={offer.exchange_type} />
                  {offer.is_urgent ? <UrgentBadge /> : null}
                  <span className="ml-auto text-xs text-faint">Publiée le {formatDate(offer.created_at)}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink">
                  <Link href={`/annonces/${offer.id}`} className="rounded-md hover:text-brand">
                    {offer.title}
                  </Link>
                </h2>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                  {offer.proposed.length ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-faint">Propose</span>
                      <SkillList skills={offer.proposed} tone="offer" max={4} />
                    </div>
                  ) : null}
                  {offer.requested.length ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-faint">Recherche</span>
                      <SkillList skills={offer.requested} tone="want" max={4} />
                    </div>
                  ) : null}
                </div>

                {offer.status === "removed" ? (
                  <Notice tone="danger" icon={ShieldAlert} title="Retirée par la modération" className="mt-4">
                    {offer.moderation_note ?? "Cette annonce ne respecte pas les règles de la communauté."}
                  </Notice>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted">
                    {offer.proposals_total === 0 ? (
                      "Aucune proposition reçue pour l'instant"
                    ) : (
                      <>
                        {plural(offer.proposals_total, "proposition reçue", "propositions reçues")}
                        {offer.proposals_pending ? (
                          <>
                            {" · "}
                            <Link href="/mes-echanges?onglet=recus" className="link">
                              {offer.proposals_pending} en attente de ta réponse
                            </Link>
                          </>
                        ) : null}
                      </>
                    )}
                  </p>
                  <OfferOwnerActions offerId={offer.id} status={offer.status} size="sm" />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
