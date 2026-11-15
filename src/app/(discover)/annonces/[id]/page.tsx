import { ArrowLeft, CircleCheck, ExternalLink, Info, Send, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferOwnerActions } from "@/components/offers/offer-actions";
import { ExchangeTypeBadge, OfferMeta, UrgentBadge } from "@/components/shared/cards";
import { ProposalDialog, ReportDialog } from "@/components/shared/dialogs";
import { Button } from "@/components/ui/button";
import { Badge, Card, DemoBadge, Notice, PersonLine, SkillList } from "@/components/ui/primitives";
import { getViewer, rpc } from "@/lib/api";
import { countryName } from "@/lib/data/countries";
import { DESIRED_LEVELS, EXCHANGE_TYPES, OFFER_STATUS } from "@/lib/labels";
import type { OfferDetail } from "@/lib/types";
import { firstParam, formatDate, hostname, isUuid, plural } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadOffer(id: string): Promise<OfferDetail | null> {
  if (!isUuid(id)) return null;
  return rpc<OfferDetail | null>("get_offer", { p_id: id });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const offer = await loadOffer(id).catch(() => null);
  if (!offer) return { title: "Annonce introuvable" };
  return { title: offer.title, description: offer.description.slice(0, 160) };
}

export default async function OfferPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [offer, viewer] = await Promise.all([loadOffer(id), getViewer()]);
  if (!offer) notFound();

  const { viewer: access } = offer;
  const open = offer.status === "open";
  const wantsToPropose = firstParam(query.proposer) === "1";
  const loginHref = `/connexion?next=${encodeURIComponent(`/annonces/${offer.id}?proposer=1`)}`;

  return (
    <div className="space-y-6">
      <Link href="/explorer" className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Toutes les annonces
      </Link>

      {offer.status === "removed" ? (
        <Notice tone="danger" icon={ShieldAlert} title="Annonce retirée par la modération">
          {offer.moderation_note ?? "Cette annonce ne respecte pas les règles de la communauté."}
        </Notice>
      ) : !open ? (
        <Notice tone="warm" icon={Info} title={`Annonce ${OFFER_STATUS[offer.status].toLowerCase()}`}>
          Elle n&apos;accepte plus de nouvelles propositions.
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <Card className="sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <ExchangeTypeBadge type={offer.exchange_type} size="md" />
              {offer.is_urgent ? <UrgentBadge /> : null}
              {offer.is_demo ? <DemoBadge /> : null}
              {offer.desired_level !== "any" ? <Badge>Niveau : {DESIRED_LEVELS[offer.desired_level]}</Badge> : null}
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-ink sm:text-4xl">{offer.title}</h1>
            <p className="mt-2 text-sm text-muted">
              Publiée le {formatDate(offer.created_at)} · {EXCHANGE_TYPES[offer.exchange_type].hint}
            </p>
            <p className="prose-user mt-6 text-[16px] text-ink/85">{offer.description}</p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-brand-soft p-5">
                <h2 className="text-sm font-semibold text-brand-strong">Ce que je propose</h2>
                <div className="mt-3">
                  <SkillList skills={offer.proposed} tone="offer" max={12} empty="Cette annonce est une demande d'aide." />
                </div>
              </div>
              <div className="rounded-2xl bg-flow-soft p-5">
                <h2 className="text-sm font-semibold text-flow-strong">Ce que je recherche</h2>
                <div className="mt-3">
                  <SkillList skills={offer.requested} tone="want" max={12} empty="Rien en retour : c'est une offre d'aide." />
                </div>
              </div>
            </div>

            {offer.related.length ? (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-ink">Technologies concernées</h2>
                <div className="mt-3">
                  <SkillList skills={offer.related} max={12} />
                </div>
              </div>
            ) : null}

            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-ink">Modalités</h2>
              <OfferMeta offer={offer} />
            </div>

            {offer.conditions ? (
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-ink">Conditions particulières</h2>
                <p className="prose-user mt-2 text-ink/85">{offer.conditions}</p>
              </div>
            ) : null}

            {offer.links.length ? (
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-ink">Liens</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {offer.links.map((link) => (
                    <li key={link}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-canvas px-3.5 py-2 text-sm font-medium text-ink hover:bg-field"
                      >
                        {hostname(link)} <ExternalLink className="size-3.5 text-muted" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <PersonLine
              person={offer.author}
              size="lg"
              subtitle={[offer.author_card.city, countryName(offer.author.country)].filter(Boolean).join(", ")}
            />
            {offer.author_card.headline ? (
              <p className="mt-4 text-sm text-muted">{offer.author_card.headline}</p>
            ) : null}

            <div className="mt-5 space-y-2">
              {access.is_owner ? (
                <>
                  <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-ink">
                    C&apos;est ton annonce.{" "}
                    {access.pending_proposals ? (
                      <Link href="/mes-echanges?onglet=recus" className="link">
                        {plural(access.pending_proposals, "proposition")} en attente
                      </Link>
                    ) : (
                      "Aucune proposition en attente."
                    )}
                  </p>
                  <OfferOwnerActions offerId={offer.id} status={offer.status} size="sm" />
                </>
              ) : access.active_proposal_id ? (
                <>
                  <Notice tone="ok" icon={CircleCheck}>
                    Tu as déjà envoyé une proposition pour cette annonce.
                  </Notice>
                  <Button asChild block variant="soft">
                    <Link href={`/propositions/${access.active_proposal_id}`}>Voir ma proposition</Link>
                  </Button>
                </>
              ) : !open ? null : viewer ? (
                <ProposalDialog
                  me={viewer.profile}
                  receiver={offer.author_card}
                  offer={offer}
                  defaultOpen={wantsToPropose}
                  trigger={
                    <Button block size="lg">
                      <Send aria-hidden /> Proposer un échange
                    </Button>
                  }
                />
              ) : (
                <>
                  <Button asChild block size="lg">
                    <Link href={loginHref}>
                      <Send aria-hidden /> Proposer un échange
                    </Link>
                  </Button>
                  <p className="text-center text-xs text-muted">Un compte gratuit est nécessaire pour proposer.</p>
                </>
              )}
              <Button asChild block variant="subtle">
                <Link href={`/developpeurs/${offer.author.username}`}>Voir le profil</Link>
              </Button>
            </div>
          </Card>

          {viewer && !access.is_owner ? (
            <div className="flex justify-center">
              <ReportDialog target={{ offerId: offer.id }} title="Signaler cette annonce" />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
