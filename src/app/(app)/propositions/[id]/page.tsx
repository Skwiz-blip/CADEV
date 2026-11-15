import { ArrowLeft, ArrowRight, CircleCheck, Hourglass, Info, MessageSquare, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiverActions, SenderActions } from "@/components/proposals/proposal-actions";
import { PROPOSAL_TONES } from "@/components/proposals/proposal-row";
import { ExchangeTypeBadge } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, PersonLine, SkillList } from "@/components/ui/primitives";
import { requireMember, rpc } from "@/lib/api";
import { countryName } from "@/lib/data/countries";
import { PROPOSAL_STATUS } from "@/lib/labels";
import type { ProposalDetail } from "@/lib/types";
import { formatDate, fullName, isUuid, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Proposition d'échange" };

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [viewer, proposal] = await Promise.all([
    requireMember(),
    rpc<ProposalDetail | null>("get_proposal", { p_id: id }),
  ]);
  if (!proposal) notFound();

  const sent = proposal.sender?.id === viewer.profile.id;
  const received = proposal.receiver?.id === viewer.profile.id;
  const other = sent ? proposal.receiver : proposal.sender;
  const otherName = fullName(other);
  const open = proposal.status === "pending" || proposal.status === "changes_requested";

  return (
    <div className="space-y-6">
      <Link href="/mes-echanges" className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Mes échanges
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Card className="sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={PROPOSAL_TONES[proposal.status]} size="md">
              {PROPOSAL_STATUS[proposal.status]}
            </Badge>
            {proposal.offer ? <ExchangeTypeBadge type={proposal.offer.exchange_type} size="md" /> : <Badge size="md">Prise de contact directe</Badge>}
            <span className="ml-auto text-sm text-muted">Envoyée {timeAgo(proposal.created_at)}</span>
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-ink sm:text-3xl">
            {sent ? `Ta proposition à ${otherName}` : `${otherName} te propose un échange`}
          </h1>
          {proposal.offer ? (
            <p className="mt-2 text-muted">
              En réponse à l&apos;annonce{" "}
              <Link href={`/annonces/${proposal.offer.id}`} className="link">
                {proposal.offer.title}
              </Link>
            </p>
          ) : null}

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-brand-soft p-5">
              <h2 className="text-sm font-semibold text-brand-strong">
                {sent ? "Ce que tu apportes" : `Ce que ${proposal.sender?.first_name ?? otherName} apporte`}
              </h2>
              <div className="mt-3">
                <SkillList skills={proposal.offered} tone="offer" max={12} empty="Rien de précisé" />
              </div>
            </div>
            <div className="rounded-2xl bg-flow-soft p-5">
              <h2 className="text-sm font-semibold text-flow-strong">
                {sent ? "Ce que tu attends en retour" : "Ce qui t'est demandé"}
              </h2>
              <div className="mt-3">
                <SkillList skills={proposal.requested} tone="want" max={12} empty="Rien de précisé" />
              </div>
            </div>
          </div>

          <div className="mt-7">
            <h2 className="text-sm font-semibold text-ink">Message de présentation</h2>
            <p className="prose-user mt-2 rounded-2xl bg-canvas p-5 text-ink/90">{proposal.message}</p>
          </div>

          {proposal.response_note ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ink">
                {proposal.status === "changes_requested" ? "Modification demandée" : "Réponse"}
                {proposal.responded_at ? (
                  <span className="ml-2 font-normal text-muted">le {formatDate(proposal.responded_at)}</span>
                ) : null}
              </h2>
              <p className="prose-user mt-2 rounded-2xl bg-canvas p-5 text-ink/90">{proposal.response_note}</p>
            </div>
          ) : null}
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <PersonLine person={other} size="lg" subtitle={countryName(other?.country) ?? other?.headline} />
            {other?.headline ? <p className="mt-3 text-sm text-muted">{other.headline}</p> : null}

            <div className="mt-5 space-y-3">
              {proposal.status === "accepted" && proposal.collaboration_id ? (
                <>
                  <Notice tone="ok" icon={CircleCheck} title="Échange accepté">
                    Votre espace de collaboration est ouvert.
                  </Notice>
                  <Button asChild block size="lg">
                    <Link href={`/collaborations/${proposal.collaboration_id}`}>
                      Ouvrir la collaboration <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </>
              ) : received && proposal.status === "pending" ? (
                <ReceiverActions proposal={proposal} />
              ) : received && proposal.status === "changes_requested" ? (
                <Notice tone="brand" icon={Hourglass} title="En attente de sa réponse">
                  {otherName} peut maintenant ajuster sa proposition.
                </Notice>
              ) : sent && open ? (
                <>
                  {proposal.status === "changes_requested" ? (
                    <Notice tone="brand" icon={MessageSquareText} title="À toi de jouer">
                      {otherName} demande une modification. Ajuste ta proposition et renvoie-la.
                    </Notice>
                  ) : (
                    <Notice tone="warm" icon={Hourglass} title="En attente de sa réponse">
                      {otherName} n&apos;a pas encore répondu.
                    </Notice>
                  )}
                  <SenderActions proposal={proposal} me={viewer.profile} />
                </>
              ) : (
                <Notice tone="warm" icon={Info}>
                  Cette proposition est close ({PROPOSAL_STATUS[proposal.status].toLowerCase()}).
                </Notice>
              )}

              {proposal.conversation_id ? (
                <Button asChild block variant="subtle">
                  <Link href={`/messages/${proposal.conversation_id}`}>
                    <MessageSquare aria-hidden /> Écrire à {other?.first_name ?? otherName}
                  </Link>
                </Button>
              ) : null}
              {other ? (
                <Button asChild block variant="ghost">
                  <Link href={`/developpeurs/${other.username}`}>Voir son profil</Link>
                </Button>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
