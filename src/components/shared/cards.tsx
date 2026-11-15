import {
  ArrowLeftRight,
  CalendarClock,
  Clock,
  Globe2,
  GraduationCap,
  Languages,
  LifeBuoy,
  MapPin,
  Repeat,
  Send,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { countryName, languageName } from "@/lib/data/countries";
import {
  AVAILABILITY,
  COLLABORATION_MODES,
  DOMAINS,
  DURATIONS,
  EXCHANGE_TYPES,
  EXPERIENCE_LEVELS,
} from "@/lib/labels";
import { describeOverlap, localOverlap, matchReasons, matchStrength, type ReasonKind } from "@/lib/matching";
import type { ExchangeType, MatchItem, OfferCard as Offer, ProfileCard, RecommendedOffer } from "@/lib/types";
import { fullName, timeAgo } from "@/lib/utils";
import { Button } from "../ui/button";
import { Avatar, Badge, DemoBadge, ScoreRing, SkillList, type BadgeTone } from "../ui/primitives";

// ── Type d'échange ───────────────────────────────────────────────────────
const TYPE_STYLE: Record<ExchangeType, { tone: BadgeTone; icon: LucideIcon }> = {
  reciprocal: { tone: "flow", icon: Repeat },
  one_off: { tone: "brand", icon: LifeBuoy },
  mentoring: { tone: "ok", icon: GraduationCap },
};

export function ExchangeTypeBadge({ type, size }: { type: ExchangeType; size?: "sm" | "md" }) {
  const style = TYPE_STYLE[type];
  return (
    <Badge tone={style.tone} size={size}>
      <style.icon aria-hidden /> {EXCHANGE_TYPES[type].short}
    </Badge>
  );
}

export function UrgentBadge() {
  return (
    <Badge tone="warm">
      <Zap aria-hidden /> Express
    </Badge>
  );
}

function SkillRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-[4.5rem] shrink-0 pt-1 text-xs font-medium text-faint">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ── Annonce ──────────────────────────────────────────────────────────────
export function OfferCard({
  offer,
  viewerId,
  highlight,
}: {
  offer: Offer | RecommendedOffer;
  viewerId?: string | null;
  highlight?: React.ReactNode;
}) {
  const own = viewerId === offer.author?.id;
  const availability = offer.availability.map((slot) => AVAILABILITY[slot].label).join(", ");
  return (
    <article className="flex h-full flex-col rounded-2xl bg-surface p-5 shadow-card transition-shadow duration-200 hover:shadow-lift sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <ExchangeTypeBadge type={offer.exchange_type} />
        {offer.is_urgent ? <UrgentBadge /> : null}
        {offer.is_demo ? <DemoBadge /> : null}
        <span className="ml-auto text-xs text-faint">{timeAgo(offer.created_at)}</span>
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-ink">
        <Link href={`/annonces/${offer.id}`} className="rounded-md hover:text-brand">
          {offer.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted">{offer.description}</p>

      <div className="mt-4 space-y-2.5">
        {offer.proposed.length ? (
          <SkillRow label="Propose">
            <SkillList skills={offer.proposed} tone="offer" max={4} />
          </SkillRow>
        ) : null}
        {offer.requested.length ? (
          <SkillRow label="Recherche">
            <SkillList skills={offer.requested} tone="want" max={4} />
          </SkillRow>
        ) : null}
      </div>

      {highlight ? <div className="mt-4">{highlight}</div> : null}

      <div className="mt-5 flex flex-1 items-end">
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl bg-canvas px-3.5 py-3">
          <Link href={`/developpeurs/${offer.author?.username ?? ""}`} className="flex min-w-0 items-center gap-2.5 rounded-lg">
            <Avatar person={offer.author} size="xs" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{fullName(offer.author)}</span>
              <span className="block truncate text-xs text-muted">
                {[countryName(offer.country ?? offer.author?.country), COLLABORATION_MODES[offer.collaboration_type]]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </Link>
          {availability ? (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <CalendarClock className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{availability}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 [&>*]:grow">
        <Button asChild variant="subtle" size="sm">
          <Link href={`/annonces/${offer.id}`}>Voir les détails</Link>
        </Button>
        {own ? (
          <Button asChild variant="soft" size="sm">
            <Link href="/mes-annonces">Gérer</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href={`/annonces/${offer.id}?proposer=1`}>Proposer un échange</Link>
          </Button>
        )}
      </div>
    </article>
  );
}

export function OfferMeta({ offer }: { offer: Offer }) {
  const items: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Globe2, label: "Collaboration", value: COLLABORATION_MODES[offer.collaboration_type] },
    { icon: Clock, label: "Durée estimée", value: DURATIONS[offer.estimated_duration] },
    { icon: Languages, label: "Langue", value: languageName(offer.language) },
  ];
  const country = countryName(offer.country);
  if (country) items.push({ icon: MapPin, label: "Pays", value: country });
  if (offer.availability.length) {
    items.push({
      icon: CalendarClock,
      label: "Disponibilités",
      value: offer.availability.map((slot) => AVAILABILITY[slot].label).join(", "),
    });
  }
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-3 rounded-xl bg-canvas px-4 py-3">
          <item.icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0">
            <dt className="text-xs text-muted">{item.label}</dt>
            <dd className="text-sm font-medium text-ink">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

// ── Développeur ──────────────────────────────────────────────────────────
export function DeveloperCard({ profile }: { profile: ProfileCard }) {
  const place = [profile.city, countryName(profile.country)].filter(Boolean).join(", ");
  const tagline = [
    profile.main_domain ? DOMAINS[profile.main_domain] : null,
    profile.experience_level ? EXPERIENCE_LEVELS[profile.experience_level]?.split(" · ")[0] : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className="flex h-full flex-col rounded-2xl bg-surface p-5 shadow-card transition-shadow duration-200 hover:shadow-lift sm:p-6">
      <div className="flex items-start gap-3.5">
        <Avatar person={profile} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
            <Link href={`/developpeurs/${profile.username}`} className="truncate rounded-md hover:text-brand">
              {fullName(profile)}
            </Link>
            {profile.is_demo ? <DemoBadge /> : null}
          </h3>
          {place ? (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{place}</span>
            </p>
          ) : null}
          {tagline ? <p className="mt-0.5 truncate text-xs text-faint">{tagline}</p> : null}
        </div>
      </div>

      {profile.headline || profile.bio ? (
        <p className="mt-4 line-clamp-2 text-sm text-muted">{profile.headline ?? profile.bio}</p>
      ) : null}

      <div className="mt-4 space-y-2.5">
        <SkillRow label="Propose">
          <SkillList skills={profile.offered} tone="offer" max={4} empty="Pas encore renseigné" />
        </SkillRow>
        <SkillRow label="Recherche">
          <SkillList skills={profile.wanted} tone="want" max={4} empty="Pas encore renseigné" />
        </SkillRow>
      </div>

      <div className="mt-5 flex flex-1 items-end">
        <p className="flex w-full items-center gap-1.5 rounded-xl bg-canvas px-3.5 py-2.5 text-xs text-muted">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {profile.availability.length
              ? profile.availability.map((slot) => AVAILABILITY[slot].label).join(", ")
              : "Disponibilités non renseignées"}
          </span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 [&>*]:grow">
        <Button asChild variant="subtle" size="sm">
          <Link href={`/developpeurs/${profile.username}`}>Voir le profil</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/developpeurs/${profile.username}?proposer=1`}>Proposer un échange</Link>
        </Button>
      </div>
    </article>
  );
}

// ── Correspondance ───────────────────────────────────────────────────────
const REASON_ICONS: Record<ReasonKind, LucideIcon> = {
  they_want: Send,
  they_offer: ArrowLeftRight,
  availability: CalendarClock,
  language: Languages,
  mode: Globe2,
  country: MapPin,
};

export function MatchReasons({ match, viewerTimezone }: { match: MatchItem; viewerTimezone: string }) {
  const reasons = matchReasons(match);
  const mine = describeOverlap(localOverlap(match.overlap_hours, viewerTimezone));
  const theirs = describeOverlap(localOverlap(match.overlap_hours, match.other.timezone));
  const sameClock = mine === theirs;
  return (
    <ul className="space-y-2.5">
      {reasons.map((reason) => {
        const Icon = REASON_ICONS[reason.kind];
        return (
          <li key={reason.kind} className="flex items-start gap-3 text-sm text-ink">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-flow-soft text-flow-strong">
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              {reason.text}
              {reason.kind === "availability" && mine ? (
                <span className="mt-1 block text-xs text-muted">
                  À ton heure : {mine}
                  {!sameClock && theirs ? ` · à la sienne : ${theirs}` : ""}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-faint">+{reason.points}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function MatchCard({
  match,
  viewerTimezone,
  compact = false,
}: {
  match: MatchItem;
  viewerTimezone: string;
  compact?: boolean;
}) {
  const strength = matchStrength(match);
  const other = match.other;
  const place = [other.city, countryName(other.country)].filter(Boolean).join(", ");
  const tone: BadgeTone = strength.tone === "strong" ? "flow" : strength.tone === "good" ? "brand" : "neutral";

  return (
    <article className="flex h-full flex-col rounded-2xl bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-4">
        <Avatar person={other} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
            <Link href={`/developpeurs/${other.username}`} className="truncate rounded-md hover:text-brand">
              {fullName(other)}
            </Link>
            {other.is_demo ? <DemoBadge /> : null}
          </h3>
          {place ? (
            <p className="flex items-center gap-1 text-sm text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{place}</span>
            </p>
          ) : null}
        </div>
        <ScoreRing value={match.score} size={compact ? 56 : 68} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone={tone}>{strength.label}</Badge>
        {match.status === "contacted" ? <Badge tone="ok">Déjà en contact</Badge> : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-faint">Tu apportes</p>
          <SkillList skills={match.i_give} tone="offer" max={4} empty="Rien pour l'instant" />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-faint">Tu reçois</p>
          <SkillList skills={match.they_give} tone="want" max={4} empty="Rien pour l'instant" />
        </div>
      </div>

      {compact ? null : (
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium text-faint">Pourquoi cette recommandation</p>
          <MatchReasons match={match} viewerTimezone={viewerTimezone} />
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-5 [&>*]:grow">
        <Button asChild variant="subtle" size="sm">
          <Link href={`/developpeurs/${other.username}`}>Voir le profil</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/developpeurs/${other.username}?proposer=1`}>
            Proposer un échange
          </Link>
        </Button>
      </div>
    </article>
  );
}
