import { BadgeCheck, BellRing, ClipboardCheck, Hourglass, Repeat2 } from "lucide-react";
import Link from "next/link";
import { COLLABORATION_STATUS } from "@/lib/labels";
import type { CollaborationItem, CollaborationStatus } from "@/lib/types";
import { daysSince, fullName, plural, timeAgo } from "@/lib/utils";
import { ExchangeTypeBadge } from "../shared/cards";
import { Button } from "../ui/button";
import { Avatar, Badge, DemoBadge, Progress, type BadgeTone } from "../ui/primitives";

export const COLLAB_TONES: Record<CollaborationStatus, BadgeTone> = {
  active: "flow",
  completed: "ok",
  cancelled: "neutral",
};

/** Un échange en cours s'essouffle après une semaine sans activité. */
export function isStalled(item: CollaborationItem): boolean {
  return item.status === "active" && daysSince(item.last_activity_at) >= 7;
}

export function CollaborationRow({ item }: { item: CollaborationItem }) {
  const progress = item.tasks_total ? Math.round((item.tasks_done / item.tasks_total) * 100) : 0;
  const ready = item.status === "active" && item.tasks_total > 0 && item.tasks_done === item.tasks_total;
  const stalled = isStalled(item);
  const href = `/collaborations/${item.id}`;

  return (
    <article className="rounded-2xl bg-surface p-5 shadow-card transition-shadow hover:shadow-lift sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={COLLAB_TONES[item.status]}>{COLLABORATION_STATUS[item.status]}</Badge>
        <ExchangeTypeBadge type={item.exchange_type} />
        {item.loop_id ? (
          <Badge tone="flow">
            <Repeat2 aria-hidden /> Boucle à trois
          </Badge>
        ) : null}
        {item.is_demo ? <DemoBadge /> : null}
        <span className="ml-auto text-xs text-faint">Mis à jour {timeAgo(item.last_activity_at)}</span>
      </div>

      <h3 className="mt-3 text-lg font-semibold text-ink">
        <Link href={href} className="rounded-md hover:text-brand">
          {item.title}
        </Link>
      </h3>
      <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
        <Avatar person={item.partner} size="xs" /> Avec {fullName(item.partner)}
      </p>

      {item.status !== "cancelled" ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-muted">
              {item.tasks_total
                ? `${item.tasks_done} sur ${plural(item.tasks_total, "tâche")} terminée${item.tasks_done > 1 ? "s" : ""}`
                : "Aucune tâche pour l'instant"}
            </span>
            <span className="font-semibold tabular-nums text-ink">{progress} %</span>
          </div>
          <Progress
            value={progress}
            tone={item.status === "completed" ? "ok" : "flow"}
            label={`Progression de « ${item.title} »`}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.to_review > 0 ? (
          <Badge tone="warm" size="md">
            <ClipboardCheck aria-hidden /> {plural(item.to_review, "livrable")} à valider
          </Badge>
        ) : null}
        {ready && !item.my_confirmation ? (
          <Badge tone="ok" size="md">
            <BadgeCheck aria-hidden /> Prêt à être clôturé
          </Badge>
        ) : null}
        {ready && item.my_confirmation && !item.partner_confirmation ? (
          <Badge size="md">
            <Hourglass aria-hidden /> En attente de la confirmation de ton partenaire
          </Badge>
        ) : null}
        {item.status === "completed" && !item.has_reviewed ? (
          <Badge tone="brand" size="md">
            Évaluation à donner
          </Badge>
        ) : null}
        {stalled ? (
          <Badge tone="warm" size="md">
            <BellRing aria-hidden /> Sans activité depuis {daysSince(item.last_activity_at)} jours
          </Badge>
        ) : null}
        <div className="ml-auto flex gap-2">
          {stalled ? (
            <Button asChild variant="subtle" size="sm">
              <Link href={`${href}?onglet=discussion&relance=1`}>Relancer</Link>
            </Button>
          ) : null}
          <Button asChild variant="soft" size="sm">
            <Link href={href}>Ouvrir</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
