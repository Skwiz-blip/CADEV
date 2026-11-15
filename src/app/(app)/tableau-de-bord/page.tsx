import {
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  Compass,
  Handshake,
  Inbox,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CollaborationRow } from "@/components/collaborations/collab-row";
import { ProposalRow } from "@/components/proposals/proposal-row";
import { MatchCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Progress, SectionTitle } from "@/components/ui/primitives";
import { requireMember, rpc } from "@/lib/api";
import { CHECKLIST, describeActivity } from "@/lib/labels";
import type { DashboardSummary } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Tableau de bord" };

function StatTile({
  icon: Icon,
  label,
  value,
  href,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  accent: string;
}) {
  return (
    <Link href={href} className="group rounded-2xl bg-surface p-5 shadow-card transition-shadow hover:shadow-lift">
      <span className={cn("flex size-10 items-center justify-center rounded-xl", accent)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
    </Link>
  );
}

function activityHref(entityType: string | null, entityId: string | null, meta: Record<string, string | undefined>): string | null {
  if (!entityId) return null;
  if (entityType === "offer") return `/annonces/${entityId}`;
  if (entityType === "proposal") return `/propositions/${entityId}`;
  if (entityType === "collaboration") return `/collaborations/${entityId}`;
  if (entityType === "task" && meta.collaboration_id) return `/collaborations/${meta.collaboration_id}?tache=${entityId}`;
  return null;
}

export default async function DashboardPage() {
  const [viewer, summary] = await Promise.all([
    requireMember(),
    rpc<DashboardSummary>("dashboard_summary"),
  ]);
  const { stats, profile } = summary;
  const hasSkills = viewer.profile.offered.length > 0 || viewer.profile.wanted.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Bonjour, ${viewer.profile.first_name || viewer.profile.username}`}
        description="Voici ce qui se passe dans ton espace DevBridge."
      />

      <section aria-label="Chiffres clés" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Handshake} label="Échanges actifs" value={stats.active_exchanges} href="/collaborations" accent="bg-flow-soft text-flow-strong" />
        <StatTile icon={Inbox} label="Propositions reçues" value={stats.proposals_received} href="/mes-echanges?onglet=recus" accent="bg-warm-soft text-warm-strong" />
        <StatTile icon={BadgeCheck} label="Échanges terminés" value={stats.completed_exchanges} href="/mes-echanges?onglet=termines" accent="bg-ok-soft text-ok-strong" />
        <StatTile icon={Sparkles} label="Correspondances disponibles" value={stats.matches_available} href="/pour-toi" accent="bg-brand-soft text-brand" />
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          {summary.pending_proposals.length ? (
            <section className="space-y-4">
              <SectionTitle
                title="Propositions à traiter"
                description="Quelqu'un attend ta réponse."
                action={
                  <Link href="/mes-echanges?onglet=recus" className="link text-sm">
                    Tout voir
                  </Link>
                }
              />
              <ul className="space-y-4">
                {summary.pending_proposals.map((item) => (
                  <li key={item.id}>
                    <ProposalRow item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-4">
            <SectionTitle
              title="Tes meilleures correspondances"
              description="Les développeurs dont les compétences complètent les tiennes."
              action={
                summary.top_matches.length ? (
                  <Link href="/pour-toi" className="link text-sm">
                    Tout voir
                  </Link>
                ) : null
              }
            />
            {summary.top_matches.length ? (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {summary.top_matches.map((match) => (
                  <li key={match.id}>
                    <MatchCard match={match} viewerTimezone={viewer.profile.timezone} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <Card className="p-0 sm:p-0">
                <EmptyState
                  icon={Sparkles}
                  title={hasSkills ? "Pas encore de correspondance" : "Dis-nous ce que tu sais faire"}
                  description={
                    hasSkills
                      ? "Dès qu'un développeur recherche ce que tu proposes, ou propose ce que tu recherches, il apparaît ici. Élargir tes compétences recherchées aide aussi."
                      : "Ajoute les compétences que tu proposes et celles que tu recherches : c'est ce qui permet de trouver tes correspondances."
                  }
                  action={
                    <>
                      <Button asChild>
                        <Link href="/competences">{hasSkills ? "Ajuster mes compétences" : "Ajouter mes compétences"}</Link>
                      </Button>
                      <Button asChild variant="subtle">
                        <Link href="/explorer">Explorer les annonces</Link>
                      </Button>
                    </>
                  }
                />
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <SectionTitle
              title="Tes échanges en cours"
              action={
                summary.active_collaborations.length ? (
                  <Link href="/collaborations" className="link text-sm">
                    Tout voir
                  </Link>
                ) : null
              }
            />
            {summary.active_collaborations.length ? (
              <ul className="space-y-4">
                {summary.active_collaborations.map((item) => (
                  <li key={item.id}>
                    <CollaborationRow item={item} />
                  </li>
                ))}
              </ul>
            ) : (
              <Card className="p-0 sm:p-0">
                <EmptyState
                  icon={Handshake}
                  title="Aucun échange en cours"
                  description="Un échange démarre quand une proposition est acceptée. Propose-en un à une correspondance, ou réponds à une annonce."
                  action={
                    <Button asChild>
                      <Link href="/explorer">
                        <Compass aria-hidden /> Trouver un échange
                      </Link>
                    </Button>
                  }
                />
              </Card>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">
                {profile.score >= 100 ? "Profil complet" : "Compléter mon profil"}
              </h2>
              <span className="text-lg font-semibold tabular-nums text-ink">{profile.score} %</span>
            </div>
            <Progress value={profile.score} tone={profile.score >= 100 ? "ok" : "flow"} label="Complétion du profil" className="mt-3" />
            {profile.missing.length ? (
              <ul className="mt-4 space-y-1">
                {profile.missing.map((key) => (
                  <li key={key}>
                    <Link
                      href={CHECKLIST[key].href}
                      className="group flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-ink hover:bg-canvas"
                    >
                      <span className="size-4 shrink-0 rounded-full bg-field-strong" aria-hidden />
                      <span className="flex-1">{CHECKLIST[key].label}</span>
                      <span className="font-mono text-xs text-faint">+{CHECKLIST[key].points}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm text-ok-strong">
                <CircleCheck className="size-4" aria-hidden /> Tout est renseigné. Tes correspondances sont au plus juste.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink">Activité récente</h2>
            {summary.recent_activity.length ? (
              <ol className="mt-4 space-y-4">
                {summary.recent_activity.map((item) => {
                  const href = activityHref(item.entity_type, item.entity_id, item.metadata);
                  const text = describeActivity(item.event_type, item.metadata);
                  return (
                    <li key={item.id} className="flex gap-3">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-flow" aria-hidden />
                      <div className="min-w-0">
                        {href ? (
                          <Link href={href} className="text-sm text-ink hover:text-brand">
                            {text}
                          </Link>
                        ) : (
                          <p className="text-sm text-ink">{text}</p>
                        )}
                        <p className="text-xs text-faint">{timeAgo(item.created_at)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Tes actions apparaîtront ici : annonces publiées, propositions, livrables validés.
              </p>
            )}
            <Button asChild variant="subtle" size="sm" className="mt-5">
              <Link href="/profil">
                Voir mon parcours <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
