import {
  BadgeCheck,
  CalendarClock,
  CircleCheck,
  Clock,
  ExternalLink,
  Globe2,
  Languages,
  MapPin,
  Pencil,
  Send,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ActivityCalendar,
  RatingSummary,
  ReviewList,
  StatsGrid,
  responsiveness,
} from "@/components/profile/profile-parts";
import { ExchangeTypeBadge, MatchReasons, OfferCard } from "@/components/shared/cards";
import { ProposalDialog, ReportDialog } from "@/components/shared/dialogs";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  Badge,
  Card,
  DemoBadge,
  Notice,
  PersonLine,
  ScoreRing,
  SectionTitle,
  SkillChip,
  SkillList,
} from "@/components/ui/primitives";
import { getViewer, rpc } from "@/lib/api";
import { countryName, languageName } from "@/lib/data/countries";
import { AVAILABILITY, COLLABORATION_MODES, DOMAINS, EXPERIENCE_LEVELS, LEVELS } from "@/lib/labels";
import { matchStrength, utcOffsetHours } from "@/lib/matching";
import type { ProfilePage, UserSkill } from "@/lib/types";
import { firstParam, formatDate, fullName, hostname } from "@/lib/utils";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadProfile(username: string): Promise<ProfilePage | null> {
  if (!/^[a-z0-9_]{3,30}$/i.test(username)) return null;
  return rpc<ProfilePage | null>("get_profile", { p_username: username });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const data = await loadProfile(username).catch(() => null);
  if (!data) return { title: "Profil introuvable" };
  const name = fullName(data.profile);
  return {
    title: name,
    description:
      data.profile.headline ??
      `${name} propose ${data.profile.offered.slice(0, 3).map((skill) => skill.name).join(", ") || "ses compétences"} sur DevBridge.`,
  };
}

function LeveledSkills({ skills, tone }: { skills: UserSkill[]; tone: "offer" | "want" }) {
  if (skills.length === 0) return <p className="text-sm text-faint">Pas encore renseigné.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <li key={skill.id}>
          <SkillChip tone={tone} className="gap-1.5 px-3 py-1.5 text-sm">
            {skill.name}
            {skill.level && tone === "offer" ? (
              <span className="font-normal opacity-70">· {LEVELS[skill.level].toLowerCase()}</span>
            ) : null}
          </SkillChip>
        </li>
      ))}
    </ul>
  );
}

function utcLabel(timezone: string): string {
  const offset = utcOffsetHours(timezone);
  return `UTC${offset >= 0 ? "+" : "−"}${Math.abs(offset)}`;
}

export default async function ProfilePageView({ params, searchParams }: Props) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const [data, viewer] = await Promise.all([loadProfile(username), getViewer()]);
  if (!data) notFound();

  const { profile, stats, viewer: access } = data;
  const name = fullName(profile);
  const place = [profile.city, countryName(profile.country)].filter(Boolean).join(", ");
  const wantsToPropose = firstParam(query.proposer) === "1";
  const loginHref = `/connexion?next=${encodeURIComponent(`/developpeurs/${profile.username}?proposer=1`)}`;
  const reply = responsiveness(stats);
  const match = access.match;

  const facts: { icon: LucideIcon; label: string; value: string }[] = [];
  if (profile.main_domain) facts.push({ icon: BadgeCheck, label: "Domaine", value: DOMAINS[profile.main_domain] ?? profile.main_domain });
  if (profile.experience_level) {
    facts.push({ icon: Clock, label: "Expérience", value: EXPERIENCE_LEVELS[profile.experience_level] ?? profile.experience_level });
  }
  if (profile.languages.length) {
    facts.push({ icon: Languages, label: "Langues", value: profile.languages.map(languageName).join(", ") });
  }
  facts.push({
    icon: CalendarClock,
    label: `Disponibilités (${utcLabel(profile.timezone)})`,
    value: profile.availability.length
      ? profile.availability.map((slot) => AVAILABILITY[slot].label).join(", ")
      : "Non renseignées",
  });
  facts.push({
    icon: Globe2,
    label: "Collaboration",
    value: profile.collaboration_modes.map((mode) => COLLABORATION_MODES[mode]).join(", ") || "Non renseignée",
  });

  const links = [
    { label: "GitHub", href: profile.github_url },
    { label: "Portfolio", href: profile.portfolio_url },
    { label: "LinkedIn", href: profile.linkedin_url },
    { label: "Site personnel", href: profile.website_url },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));

  return (
    <div className="space-y-6">
      {profile.is_demo ? (
        <Notice tone="warm" icon={BadgeCheck} title="Profil de démonstration">
          Ce profil est fictif. Il illustre le fonctionnement de la plateforme et ne représente pas un véritable membre.
        </Notice>
      ) : null}

      {/* En-tête */}
      <Card className="sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar person={profile} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-semibold text-ink">{name}</h1>
              {profile.is_demo ? <DemoBadge /> : null}
              {profile.status === "suspended" ? <Badge tone="danger">Compte suspendu</Badge> : null}
            </div>
            <p className="mt-1 text-muted">@{profile.username}</p>
            {profile.headline ? <p className="mt-3 text-lg text-ink">{profile.headline}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
              {place ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden /> {place}
                </span>
              ) : null}
              <span>Inscrit le {formatDate(profile.created_at)}</span>
              {reply ? (
                <span className="flex items-center gap-1.5">
                  <Timer className="size-4" aria-hidden /> {reply}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:w-56">
            {access.is_self ? (
              <>
                <Button asChild>
                  <Link href="/profil/modifier">
                    <Pencil aria-hidden /> Modifier mon profil
                  </Link>
                </Button>
                <Button asChild variant="subtle">
                  <Link href="/competences">Mes compétences</Link>
                </Button>
              </>
            ) : access.active_proposal_id ? (
              <Button asChild variant="soft">
                <Link href={`/propositions/${access.active_proposal_id}`}>
                  <CircleCheck aria-hidden /> Proposition envoyée
                </Link>
              </Button>
            ) : viewer ? (
              <ProposalDialog
                me={viewer.profile}
                receiver={profile}
                defaultOpen={wantsToPropose}
                trigger={
                  <Button>
                    <Send aria-hidden /> Proposer un échange
                  </Button>
                }
              />
            ) : (
              <Button asChild>
                <Link href={loginHref}>
                  <Send aria-hidden /> Proposer un échange
                </Link>
              </Button>
            )}
            {viewer && !access.is_self ? (
              <ReportDialog target={{ reportedUserId: profile.id }} title={`Signaler ${name}`} />
            ) : null}
          </div>
        </div>

        {profile.bio ? <p className="prose-user mt-7 max-w-3xl text-[16px] text-ink/85">{profile.bio}</p> : null}

        <dl className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-start gap-3 rounded-xl bg-canvas px-4 py-3">
              <fact.icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0">
                <dt className="text-xs text-muted">{fact.label}</dt>
                <dd className="text-sm font-medium text-ink">{fact.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        {links.length ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-canvas px-3.5 py-2 text-sm font-medium text-ink hover:bg-field"
                  title={hostname(link.href)}
                >
                  {link.label} <ExternalLink className="size-3.5 text-muted" aria-hidden />
                </a>
              </li>
            ))}
            <li className="self-center text-xs text-faint">Liens déclarés par le membre, non vérifiés.</li>
          </ul>
        ) : null}
      </Card>

      {/* Correspondance avec la personne connectée */}
      {match && viewer ? (
        <Card className="bg-ink sm:p-8">
          <div className="flex flex-wrap items-center gap-5">
            <ScoreRing value={match.score} size={76} onDark />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-white">{matchStrength(match).label}</h2>
              <p className="mt-1 text-sm text-white/65">
                Voici pourquoi {profile.first_name || name} et toi pourriez échanger. Ce score aide à décider, rien de plus.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-surface p-5">
            <MatchReasons match={match} viewerTimezone={viewer.profile.timezone} />
          </div>
        </Card>
      ) : null}

      {/* Compétences */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Compétences proposées" description="Niveaux déclarés par le membre : ce ne sont pas des certifications." />
          <div className="mt-5">
            <LeveledSkills skills={profile.offered} tone="offer" />
          </div>
        </Card>
        <Card>
          <SectionTitle title="Compétences recherchées" description="Ce sur quoi cette personne veut progresser ou être aidée." />
          <div className="mt-5">
            <LeveledSkills skills={profile.wanted} tone="want" />
          </div>
        </Card>
      </div>

      {/* Parcours de collaboration */}
      <Card className="sm:p-8">
        <SectionTitle
          title={access.is_self ? "Mon parcours de collaboration" : "Parcours de collaboration"}
          description="Uniquement des réalisations enregistrées sur la plateforme, validées par l'autre participant."
        />
        <div className="mt-6">
          <StatsGrid stats={stats} />
        </div>
        <div className="mt-8">
          <h3 className="mb-4 text-sm font-semibold text-ink">Activité des douze derniers mois</h3>
          <ActivityCalendar days={data.calendar} />
        </div>

        {data.collaborations.length ? (
          <div className="mt-8">
            <h3 className="mb-4 text-sm font-semibold text-ink">Échanges terminés</h3>
            <ul className="space-y-3">
              {data.collaborations.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-canvas p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ExchangeTypeBadge type={item.exchange_type} />
                      <span className="text-xs text-muted">Terminé le {formatDate(item.completed_at)}</span>
                    </div>
                    <p className="mt-2 font-semibold text-ink">{item.title}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <PersonLine person={item.partner} size="sm" subtitle="Partenaire" />
                      {item.skills.length ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-faint">A apporté</span>
                          <SkillList skills={item.skills} tone="offer" max={3} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <Button asChild variant="white" size="sm">
                    <Link href={`/attestations/${item.id}`}>
                      <BadgeCheck aria-hidden /> Attestation
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {/* Évaluations */}
      <Card className="sm:p-8">
        <SectionTitle
          title="Évaluations"
          description={
            stats.reviews_count
              ? `${stats.reviews_count} évaluation${stats.reviews_count > 1 ? "s" : ""}, toutes laissées après un échange terminé ensemble.`
              : "Les évaluations apparaissent après un premier échange terminé."
          }
        />
        {stats.reviews_count ? (
          <div className="mt-6 space-y-6">
            <RatingSummary stats={stats} />
            <ReviewList reviews={data.reviews} />
          </div>
        ) : null}
      </Card>

      {/* Annonces en ligne */}
      {data.offers.length ? (
        <section className="space-y-4">
          <SectionTitle title="Annonces en ligne" />
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.offers.map((offer) => (
              <li key={offer.id}>
                <OfferCard offer={offer} viewerId={viewer?.profile.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
