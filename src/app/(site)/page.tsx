import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  GraduationCap,
  Handshake,
  LifeBuoy,
  ListChecks,
  MapPin,
  Repeat,
  Route,
  Sparkles,
  UserRoundPen,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { HeroVisual, LoopDiagram } from "@/components/marketing/hero-visual";
import { Button } from "@/components/ui/button";
import { Badge, ScoreRing, SkillChip } from "@/components/ui/primitives";
import { SCORE_SCALE } from "@/lib/matching";
import { cn } from "@/lib/utils";

const SKILL_BAND = [
  "Flutter", "Python", "React", "UI/UX Design", "Docker", "Django", "Machine Learning", "Node.js",
  "Paiement mobile", "Kotlin", "Cybersécurité", "TypeScript", "Laravel", "DevOps", "Figma", "PostgreSQL",
  "React Native", "Data Engineering", "CI/CD", "Next.js",
];

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: UserRoundPen,
    title: "Partage tes compétences",
    text: "Indique ce que tu sais faire et ce que tu cherches à apprendre ou à faire avancer. Deux listes, deux minutes.",
  },
  {
    icon: Sparkles,
    title: "Trouve une complémentarité",
    text: "DevBridge repère les développeurs dont le savoir-faire complète le tien, et t'explique toujours pourquoi.",
  },
  {
    icon: Handshake,
    title: "Échange et réalise quelque chose",
    text: "Vous vous mettez d'accord, découpez le travail en tâches, puis validez mutuellement les livrables.",
  },
];

const TYPES: { icon: LucideIcon; title: string; text: string; example: string }[] = [
  {
    icon: Repeat,
    title: "Échange réciproque",
    text: "Chacun apporte une compétence et en reçoit une autre.",
    example: "« Je t'aide sur Flutter, tu m'aides sur Python. »",
  },
  {
    icon: LifeBuoy,
    title: "Aide ponctuelle",
    text: "Un coup de main sur une tâche précise, sans engagement long.",
    example: "« Je peux configurer ton pipeline CI/CD avec toi. »",
  },
  {
    icon: GraduationCap,
    title: "Mentorat",
    text: "Un accompagnement pour apprendre une technologie pas à pas.",
    example: "« Deux séances pour comprendre les bases de Docker. »",
  },
];

const EXAMPLES = [
  { give: "Flutter", get: "Python", who: "Lomé ⇄ Dakar", detail: "Une application mobile contre l'intégration d'un modèle de prédiction." },
  { give: "UI/UX", get: "Front-End", who: "Lagos ⇄ Accra", detail: "La refonte d'un tableau de bord contre des composants React." },
  { give: "Déploiement Cloud", get: "Intégration IA", who: "Casablanca ⇄ Bamako", detail: "Une mise en production propre contre un assistant en langue locale." },
  { give: "React", get: "Développement mobile", who: "Kigali ⇄ Abidjan", detail: "Une interface web contre les bases d'une application Android." },
];

const EXTRAS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Zap,
    title: "Coup de main express",
    text: "Bloqué sur un bug ? Publie une demande express : les personnes qui maîtrisent le sujet sont prévenues tout de suite.",
  },
  {
    icon: CalendarClock,
    title: "Tes créneaux, à ton heure",
    text: "Lomé, Nairobi, Tunis : les disponibilités communes s'affichent dans le fuseau horaire de chacun.",
  },
  {
    icon: ListChecks,
    title: "Un plan de départ en un clic",
    text: "L'échange accepté, DevBridge propose les premières tâches. Personne ne reste devant une page blanche.",
  },
  {
    icon: BadgeCheck,
    title: "Une attestation vérifiable",
    text: "Chaque échange terminé donne une page publique à montrer à un recruteur ou à un client.",
  },
  {
    icon: WifiOff,
    title: "Pensé pour les connexions fragiles",
    text: "Pages légères, et ce que tu écris est gardé sur ton appareil si le réseau coupe.",
  },
  {
    icon: Route,
    title: "Une réputation qui se mérite",
    text: "Ni likes ni abonnés : seuls comptent les échanges terminés et les livrables validés par l'autre.",
  },
];

const DEMO_PROFILES = [
  { initials: "KM", name: "Kodjo", country: "Togo", offers: ["Flutter", "Dart"], wants: ["Python", "IA"], tone: "bg-brand" },
  { initials: "AD", name: "Amina", country: "Sénégal", offers: ["Python", "Machine Learning"], wants: ["Flutter"], tone: "bg-ink" },
  { initials: "KA", name: "Kwame", country: "Ghana", offers: ["React", "Node.js"], wants: ["UI/UX"], tone: "bg-flow-strong" },
  { initials: "CO", name: "Chisom", country: "Nigeria", offers: ["UI/UX", "Figma"], wants: ["React"], tone: "bg-ok-strong" },
  { initials: "YB", name: "Youssef", country: "Maroc", offers: ["DevOps", "Docker"], wants: ["Back-End"], tone: "bg-warm-strong" },
];

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("px-4 py-20 sm:px-6 sm:py-28", className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function Heading({
  eyebrow,
  title,
  text,
  onDark = false,
  center = false,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  onDark?: boolean;
  center?: boolean;
}) {
  return (
    <div className={cn("reveal max-w-2xl", center && "mx-auto text-center")}>
      <p className={cn("text-sm font-semibold", onDark ? "text-flow" : "text-brand")}>{eyebrow}</p>
      <h2 className={cn("mt-3 text-3xl font-semibold sm:text-[2.5rem]", onDark ? "text-white" : "text-ink")}>{title}</h2>
      {text ? <p className={cn("mt-4 text-lg", onDark ? "text-white/70" : "text-muted")}>{text}</p> : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
        <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div className="animate-rise">
            <Badge tone="brand" size="md">
              Pour les devs, par les devs · 54 pays d&apos;Afrique
            </Badge>
            <h1 className="mt-6 text-[2.6rem] font-semibold leading-[1.05] text-ink sm:text-6xl lg:text-[3.9rem]">
              Les bonnes compétences méritent de se rencontrer.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
              Trouve les développeurs qui complètent tes compétences. Échange ton savoir-faire, collabore sur des
              projets concrets et construisons ensemble l&apos;écosystème technologique africain.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/explorer">
                  Trouver un échange <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="subtle">
                <Link href="/comment-ca-marche">Découvrir la plateforme</Link>
              </Button>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {["Gratuit, sans paiement", "Un échange = un résultat concret", "Léger, même en 3G"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-ok" aria-hidden /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-rise [animation-delay:120ms]">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ── Bandeau de compétences ───────────────────────────────────── */}
      <div className="bg-canvas py-6" aria-hidden>
        <div className="scroll-quiet mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 sm:flex-wrap sm:justify-center sm:px-6">
          {SKILL_BAND.map((skill) => (
            <span key={skill} className="shrink-0 rounded-full bg-surface px-4 py-2 text-sm font-medium text-muted">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* ── Comment ça fonctionne ────────────────────────────────────── */}
      <Section id="fonctionnement">
        <Heading
          eyebrow="Comment ça fonctionne"
          title="Tu apportes ce que tu sais. Tu repars avec ce qui te manquait."
          text="Pas d'annonce à faire vivre ni d'audience à construire : un échange commence par deux listes."
        />
        <ol className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="reveal rounded-3xl bg-canvas p-7">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-surface text-brand shadow-card">
                  <step.icon className="size-6" aria-hidden />
                </span>
                <span className="font-mono text-sm font-medium text-faint">0{index + 1}</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-2.5 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Types d'échanges ─────────────────────────────────────────── */}
      <Section className="bg-canvas">
        <Heading eyebrow="Trois façons d'échanger" title="Un échange à la mesure de ton besoin." />
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TYPES.map((type) => (
            <article key={type.title} className="reveal rounded-3xl bg-surface p-7 shadow-card">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-flow-soft text-flow-strong">
                <type.icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-6 text-xl font-semibold text-ink">{type.title}</h3>
              <p className="mt-2.5 text-muted">{type.text}</p>
              <p className="mt-5 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">{type.example}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ── Exemples d'échanges ──────────────────────────────────────── */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Heading eyebrow="Exemples d'échanges" title="Ce que deux développeurs peuvent s'apporter." />
          <Badge tone="warm" size="md" className="reveal">
            Exemples illustratifs
          </Badge>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {EXAMPLES.map((example) => (
            <article key={example.give} className="reveal rounded-3xl bg-canvas p-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <SkillChip tone="offer" className="px-3 py-1.5 text-sm">{example.give}</SkillChip>
                <span className="text-sm font-medium text-faint">contre</span>
                <SkillChip tone="want" className="px-3 py-1.5 text-sm">{example.get}</SkillChip>
              </div>
              <p className="mt-5 text-lg font-medium text-ink">{example.detail}</p>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="size-4" aria-hidden /> {example.who}
              </p>
            </article>
          ))}
        </div>
      </Section>

      {/* ── Correspondance expliquée ─────────────────────────────────── */}
      <Section className="bg-ink">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <Heading
              onDark
              eyebrow="Correspondance"
              title="Un score sur 100, et toujours une explication."
              text="DevBridge ne te recommande jamais quelqu'un sans dire pourquoi. Le score est une aide à la décision, pas une vérité scientifique : c'est toi qui choisis."
            />
            <ul className="reveal mt-9 space-y-3">
              {[
                "Cette personne recherche précisément une compétence que tu proposes.",
                "Vous avez des disponibilités compatibles.",
                "Vous partagez une langue de travail.",
              ].map((reason) => (
                <li key={reason} className="flex items-start gap-3 text-white/85">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-3 text-flow">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal rounded-3xl bg-ink-2 p-7 sm:p-9">
            <div className="flex items-center gap-5">
              <ScoreRing value={95} size={84} onDark />
              <div>
                <p className="text-lg font-semibold text-white">Correspondance réciproque forte</p>
                <p className="text-sm text-white/60">Le barème, tel qu&apos;il est calculé</p>
              </div>
            </div>
            <dl className="mt-8 space-y-5">
              {SCORE_SCALE.map((row) => (
                <div key={row.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <dt className="text-white/85">{row.label}</dt>
                    <dd className="font-mono tabular-nums text-white/60">{row.max} pts</dd>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-ink-3">
                    <div className="h-full rounded-full bg-flow" style={{ width: `${row.max * 2}%` }} />
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {/* ── Boucle à trois ───────────────────────────────────────────── */}
      <Section>
        <div className="grid grid-cols-1 items-center gap-12 rounded-[2rem] bg-flow-soft p-8 sm:p-14 lg:grid-cols-[1.2fr_1fr]">
          <div className="reveal">
            <p className="text-sm font-semibold text-flow-strong">Boucle d&apos;échange à trois</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-[2.5rem]">
              Personne ne veut ce que tu proposes ? La boucle trouve quand même.
            </h2>
            <p className="mt-4 text-lg text-ink/75">
              Souvent, la personne qui peut t&apos;aider n&apos;a pas besoin de ce que tu sais faire. DevBridge cherche
              alors un troisième développeur : tu aides B, B aide C, et C t&apos;aide. Chacun donne une fois et reçoit
              une fois, et rien ne démarre sans l&apos;accord des trois.
            </p>
            <Button asChild variant="dark" className="mt-8">
              <Link href="/inscription">
                Trouver ma boucle <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="reveal flex justify-center">
            <LoopDiagram />
          </div>
        </div>
      </Section>

      {/* ── Pensé pour le terrain ────────────────────────────────────── */}
      <Section className="bg-canvas">
        <Heading
          eyebrow="Pensé pour le terrain"
          title="Les détails qui font qu'un échange aboutit."
          text="Fuseaux horaires, connexions instables, manque de temps : DevBridge est construit autour de ces réalités."
        />
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EXTRAS.map((extra) => (
            <article key={extra.title} className="reveal rounded-3xl bg-surface p-7 shadow-card">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <extra.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{extra.title}</h3>
              <p className="mt-2 text-muted">{extra.text}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ── Profils de démonstration ─────────────────────────────────── */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Heading
            eyebrow="Découvrir les développeurs"
            title="Des profils qui disent l'essentiel."
            text="Ce que chacun propose, et ce qu'il recherche. Rien d'autre à deviner."
          />
          <Badge tone="warm" size="md" className="reveal">
            Profils de démonstration
          </Badge>
        </div>
        <ul className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {DEMO_PROFILES.map((profile) => (
            <li key={profile.name} className="reveal rounded-3xl bg-canvas p-6">
              <span className={cn("flex size-12 items-center justify-center rounded-full text-sm font-semibold text-white", profile.tone)}>
                {profile.initials}
              </span>
              <p className="mt-4 font-semibold text-ink">{profile.name}</p>
              <p className="flex items-center gap-1 text-sm text-muted">
                <MapPin className="size-3.5" aria-hidden /> {profile.country}
              </p>
              <p className="mb-1.5 mt-5 text-[11px] font-medium text-faint">Propose</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.offers.map((skill) => (
                  <SkillChip key={skill} tone="offer">{skill}</SkillChip>
                ))}
              </div>
              <p className="mb-1.5 mt-4 text-[11px] font-medium text-faint">Recherche</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.wants.map((skill) => (
                  <SkillChip key={skill} tone="want">{skill}</SkillChip>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="reveal mt-10">
          <Button asChild variant="subtle">
            <Link href="/developpeurs">
              Voir les développeurs inscrits <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ── Appel à l'action ─────────────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="reveal mx-auto max-w-6xl rounded-[2rem] bg-ink px-8 py-16 text-center sm:px-14 sm:py-24">
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
            Tu as des compétences. Quelqu&apos;un en a besoin.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
            Crée ton profil en quelques minutes et découvre qui, sur le continent, complète ton savoir-faire.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/inscription">
                Rejoindre la communauté <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="white">
              <Link href="/explorer">Explorer les échanges</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
