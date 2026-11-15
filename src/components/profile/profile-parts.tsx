import { Star } from "lucide-react";
import Link from "next/link";
import type { CalendarDay, ProfileStats, Review } from "@/lib/types";
import { cn, formatDate, formatHours, plural } from "@/lib/utils";
import { Avatar } from "../ui/primitives";

// ── Calendrier d'activité ────────────────────────────────────────────────
const LEVEL_CLASSES = ["bg-field", "bg-[#bfe9f2]", "bg-[#6fd0e3]", "bg-flow", "bg-flow-strong"];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function level(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Une année d'activité, semaine par semaine. Chaque case colorée correspond à
 * des actions réellement enregistrées (annonce, livrable, validation, clôture…).
 */
export function ActivityCalendar({ days }: { days: CalendarDay[] }) {
  const counts = new Map(days.map((day) => [day.day, day.count]));
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  // On commence un lundi, 52 semaines avant la semaine en cours.
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) - 52 * 7);

  const weeks: { date: Date; key: string; count: number; future: boolean }[][] = [];
  const cursor = new Date(start);
  while (cursor <= end || weeks[weeks.length - 1]!.length < 7) {
    if (!weeks.length || weeks[weeks.length - 1]!.length === 7) weeks.push([]);
    const key = isoDay(cursor);
    weeks[weeks.length - 1]!.push({
      date: new Date(cursor),
      key,
      count: counts.get(key) ?? 0,
      future: cursor > end,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const total = days.reduce((sum, day) => sum + day.count, 0);
  const activeDays = days.filter((day) => day.count > 0).length;

  return (
    <div>
      <div className="scroll-quiet overflow-x-auto pb-1">
        <div className="inline-block min-w-max">
          <div className="flex gap-[3px] pl-0" aria-hidden>
            {weeks.map((week, index) => {
              const first = week[0]!.date;
              const showMonth = first.getUTCDate() <= 7;
              return (
                <span key={index} className="w-3 text-[10px] leading-4 text-faint">
                  {showMonth ? <span className="block w-10">{MONTHS[first.getUTCMonth()]}</span> : null}
                </span>
              );
            })}
          </div>
          <div
            className="mt-1 flex gap-[3px]"
            role="img"
            aria-label={`${plural(total, "action enregistrée", "actions enregistrées")} sur ${plural(activeDays, "jour")} au cours des douze derniers mois.`}
          >
            {weeks.map((week, index) => (
              <div key={index} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <span
                    key={day.key}
                    title={
                      day.future
                        ? undefined
                        : `${formatDate(day.date)} : ${day.count ? plural(day.count, "action") : "aucune action"}`
                    }
                    className={cn("size-3 rounded-[3px]", day.future ? "bg-transparent" : LEVEL_CLASSES[level(day.count)])}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <p>
          {total > 0
            ? `${plural(total, "action enregistrée", "actions enregistrées")} sur ${plural(activeDays, "jour")}`
            : "Aucune activité enregistrée pour l'instant"}
        </p>
        <p className="flex items-center gap-1.5" aria-hidden>
          Moins
          {LEVEL_CLASSES.map((className) => (
            <span key={className} className={cn("size-3 rounded-[3px]", className)} />
          ))}
          Plus
        </p>
      </div>
    </div>
  );
}

// ── Indicateurs de réputation ────────────────────────────────────────────
export function StatsGrid({ stats }: { stats: ProfileStats }) {
  const items = [
    { label: "Échanges terminés", value: stats.exchanges_completed },
    { label: "Collaborations en cours", value: stats.active_collaborations },
    { label: "Livrables validés", value: stats.tasks_validated },
    { label: "Compétences partagées", value: stats.skills_shared },
    { label: "Personnes accompagnées", value: stats.people_helped },
    { label: "Contributions examinées", value: stats.contributions_reviewed },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-canvas px-4 py-4">
          <dd className="text-2xl font-semibold tabular-nums text-ink">{item.value}</dd>
          <dt className="mt-0.5 text-sm text-muted">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/** Réactivité aux propositions : un repère utile avant d'écrire à quelqu'un. */
export function responsiveness(stats: ProfileStats): string | null {
  if (stats.proposals_to_answer < 1) return null;
  const rate = Math.round((stats.proposals_answered / stats.proposals_to_answer) * 100);
  const delay = formatHours(stats.median_response_hours);
  return delay
    ? `Répond à ${rate} % des propositions, en général en ${delay}`
    : `Répond à ${rate} % des propositions`;
}

// ── Évaluations ──────────────────────────────────────────────────────────
export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          aria-hidden
          className={cn(
            size === "md" ? "size-5" : "size-3.5",
            index <= rounded ? "fill-warm text-warm" : "fill-field-strong text-field-strong",
          )}
        />
      ))}
    </span>
  );
}

export function RatingSummary({ stats }: { stats: ProfileStats }) {
  if (stats.reviews_count === 0) return null;
  const rows = [
    { label: "Communication", value: stats.avg_communication },
    { label: "Respect des engagements", value: stats.avg_reliability },
    { label: "Qualité du travail", value: stats.avg_quality },
    { label: "Collaboration générale", value: stats.avg_collaboration },
  ];
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
          <dt className="text-sm text-ink">{row.label}</dt>
          <dd className="flex items-center gap-2">
            <Stars value={Number(row.value ?? 0)} />
            <span className="w-7 text-right text-sm font-semibold tabular-nums text-ink">
              {Number(row.value ?? 0).toFixed(1)}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  return (
    <ul className="space-y-3">
      {reviews.map((review) => {
        const average =
          (review.communication_rating + review.reliability_rating + review.quality_rating + review.collaboration_rating) / 4;
        return (
          <li key={review.id} className="rounded-2xl bg-canvas p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar person={review.reviewer} size="sm" />
              <div className="min-w-0 flex-1">
                {review.reviewer ? (
                  <Link href={`/developpeurs/${review.reviewer.username}`} className="text-sm font-semibold text-ink hover:text-brand">
                    {review.reviewer.first_name} {review.reviewer.last_name}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-ink">Compte supprimé</span>
                )}
                <p className="truncate text-xs text-muted">
                  {review.collaboration_title} · {formatDate(review.created_at)}
                </p>
              </div>
              <Stars value={Math.round(average * 10) / 10} />
            </div>
            {review.comment ? <p className="prose-user mt-3 text-sm text-ink/85">{review.comment}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
