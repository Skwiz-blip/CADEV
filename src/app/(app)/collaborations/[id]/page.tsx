import { ArrowLeft, BadgeCheck, CircleSlash, Repeat2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COLLAB_TONES } from "@/components/collaborations/collab-row";
import { TaskBoard } from "@/components/collaborations/task-board";
import { CertificateLink, CollaborationMenu, CompletionPanel, ReviewForm } from "@/components/collaborations/workspace";
import { MessageThread } from "@/components/messages/thread";
import { ReviewList } from "@/components/profile/profile-parts";
import { ExchangeTypeBadge } from "@/components/shared/cards";
import { Badge, Card, DemoBadge, LinkTabs, Notice, PersonLine, Progress, SkillList } from "@/components/ui/primitives";
import { requireMember, rpc } from "@/lib/api";
import { countryName } from "@/lib/data/countries";
import { COLLABORATION_STATUS } from "@/lib/labels";
import type { CollaborationDetail, Message } from "@/lib/types";
import { firstParam, formatDate, fullName, isUuid, plural } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Collaboration" };
  const detail = await rpc<CollaborationDetail | null>("get_collaboration", { p_id: id }).catch(() => null);
  return { title: detail?.title ?? "Collaboration" };
}

const TABS = [
  { key: "taches", label: "Tâches" },
  { key: "discussion", label: "Discussion" },
  { key: "details", label: "Détails" },
] as const;

export default async function CollaborationPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const [viewer, detail] = await Promise.all([
    requireMember(),
    rpc<CollaborationDetail | null>("get_collaboration", { p_id: id }),
  ]);
  if (!detail) notFound();

  const requested = firstParam(query.onglet);
  const tab = TABS.find((item) => item.key === requested)?.key ?? "taches";
  const focusTask = firstParam(query.tache);
  const nudge = firstParam(query.relance) === "1";

  const viewerId = viewer.profile.id;
  const partner = detail.members.find((member) => member.user.id !== viewerId) ?? detail.members[0]!;
  const total = detail.tasks.length;
  const done = detail.tasks.filter((task) => task.status === "done").length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const base = `/collaborations/${detail.id}`;

  const messages =
    tab === "discussion" && detail.conversation_id && detail.viewer.is_member
      ? await rpc<Message[]>("get_messages", { p_conversation_id: detail.conversation_id })
      : [];

  return (
    <div className="space-y-6">
      <Link href="/collaborations" className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Collaborations
      </Link>

      {!detail.viewer.is_member ? (
        <Notice tone="warm" icon={ShieldCheck} title="Consultation en tant qu'administrateur">
          Tu vois cet espace pour traiter un signalement. Tu ne peux pas y agir.
        </Notice>
      ) : null}

      <Card className="sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={COLLAB_TONES[detail.status]} size="md">
            {COLLABORATION_STATUS[detail.status]}
          </Badge>
          <ExchangeTypeBadge type={detail.exchange_type} size="md" />
          {detail.loop_id ? (
            <Badge tone="flow" size="md">
              <Repeat2 aria-hidden /> Maillon d&apos;une boucle à trois
            </Badge>
          ) : null}
          {detail.is_demo ? <DemoBadge /> : null}
          <span className="ml-auto text-sm text-muted">Depuis le {formatDate(detail.start_date)}</span>
        </div>

        <h1 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">{detail.title}</h1>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {detail.members.map((member) => (
            <div key={member.user.id} className="rounded-2xl bg-canvas p-4">
              <PersonLine
                person={member.user}
                subtitle={member.user.id === viewerId ? "Toi" : countryName(member.user.country)}
              />
              <p className="mb-1.5 mt-3 text-xs font-medium text-faint">Apporte</p>
              <SkillList skills={member.gives} tone="offer" max={5} empty="Reçoit un accompagnement" />
            </div>
          ))}
        </div>

        {detail.status !== "cancelled" ? (
          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-muted">
                {total ? `${done} sur ${plural(total, "tâche")} terminée${done > 1 ? "s" : ""}` : "Aucune tâche pour l'instant"}
              </span>
              <span className="font-semibold tabular-nums text-ink">{progress} %</span>
            </div>
            <Progress value={progress} tone={detail.status === "completed" ? "ok" : "flow"} label="Progression de l'échange" />
          </div>
        ) : null}

        {detail.viewer.is_member ? (
          <div className="mt-6">
            <CollaborationMenu detail={detail} />
          </div>
        ) : null}
      </Card>

      {detail.status === "cancelled" ? (
        <Notice tone="warm" icon={CircleSlash} title="Échange interrompu">
          {detail.cancel_reason ?? "Cet échange a été interrompu avant son terme."}
        </Notice>
      ) : null}

      {detail.status === "completed" ? (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-ok-soft p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-ok-strong">
            <BadgeCheck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Échange terminé le {formatDate(detail.completed_at)}</p>
            <p className="mt-0.5 text-sm text-ink/75">
              Tous les livrables ont été validés et vous avez tous les deux confirmé la clôture. Il figure maintenant
              dans vos parcours.
            </p>
          </div>
          <CertificateLink id={detail.id} />
        </div>
      ) : null}

      <CompletionPanel detail={detail} />

      {detail.status === "completed" && detail.viewer.is_member && !detail.viewer.has_reviewed ? (
        <ReviewForm detail={detail} />
      ) : null}

      <LinkTabs
        label="Sections de la collaboration"
        items={TABS.map((item) => ({
          href: item.key === "taches" ? base : `${base}?onglet=${item.key}`,
          label: item.label,
          count: item.key === "taches" ? total : undefined,
          active: item.key === tab,
        }))}
      />

      {tab === "taches" ? <TaskBoard detail={detail} focusTaskId={isUuid(focusTask) ? focusTask : undefined} /> : null}

      {tab === "discussion" ? (
        detail.conversation_id && detail.viewer.is_member ? (
          <div className="flex h-[32rem] max-h-[70dvh] flex-col overflow-hidden rounded-2xl bg-surface shadow-card">
            <MessageThread
              conversationId={detail.conversation_id}
              viewerId={viewerId}
              other={partner.user}
              initialMessages={messages}
              initialDraft={
                nudge
                  ? `Bonjour ${partner.user.first_name}, on reprend « ${detail.title} » ? Dis-moi où tu en es et quel créneau t'arrange cette semaine.`
                  : undefined
              }
            />
          </div>
        ) : (
          <Notice tone="warm" icon={ShieldCheck}>
            La discussion est réservée aux deux participants.
          </Notice>
        )
      ) : null}

      {tab === "details" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold text-ink">Objectifs</h2>
            <p className="prose-user mt-3 text-ink/85">
              {detail.objectives ??
                "Aucun objectif écrit pour l'instant. Utilisez « Modifier » pour noter ce que chacun veut avoir obtenu à la fin."}
            </p>
            {detail.description ? (
              <>
                <h2 className="mt-7 text-lg font-semibold text-ink">Description</h2>
                <p className="prose-user mt-3 text-ink/85">{detail.description}</p>
              </>
            ) : null}
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-ink">Repères</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4 rounded-xl bg-canvas px-4 py-3">
                <dt className="text-muted">Début</dt>
                <dd className="font-medium text-ink">{formatDate(detail.start_date)}</dd>
              </div>
              {detail.end_date ? (
                <div className="flex justify-between gap-4 rounded-xl bg-canvas px-4 py-3">
                  <dt className="text-muted">Fin</dt>
                  <dd className="font-medium text-ink">{formatDate(detail.end_date)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 rounded-xl bg-canvas px-4 py-3">
                <dt className="text-muted">Proposition d&apos;origine</dt>
                <dd>
                  <Link href={`/propositions/${detail.proposal_id}`} className="link">
                    Voir la proposition
                  </Link>
                </dd>
              </div>
              {detail.offer ? (
                <div className="flex justify-between gap-4 rounded-xl bg-canvas px-4 py-3">
                  <dt className="shrink-0 text-muted">Annonce</dt>
                  <dd className="min-w-0 truncate">
                    <Link href={`/annonces/${detail.offer.id}`} className="link">
                      {detail.offer.title}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {detail.members.map((member) => (
                <div key={member.user.id} className="flex justify-between gap-4 rounded-xl bg-canvas px-4 py-3">
                  <dt className="text-muted">Clôture confirmée par {member.user.id === viewerId ? "toi" : fullName(member.user)}</dt>
                  <dd className="font-medium text-ink">
                    {member.completion_confirmed_at ? formatDate(member.completion_confirmed_at) : "Pas encore"}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
          {detail.reviews.length ? (
            <Card className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-ink">Évaluations de cet échange</h2>
              <div className="mt-4">
                <ReviewList reviews={detail.reviews} />
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
