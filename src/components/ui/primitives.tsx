import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import type { ProfileMini, Skill } from "@/lib/types";
import { cn, fullName, initials } from "@/lib/utils";

// ── Carte ────────────────────────────────────────────────────────────────
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-surface p-5 shadow-card sm:p-6", className)} {...props} />;
}

export function SectionTitle({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ── Pastille d'état ──────────────────────────────────────────────────────
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-field text-ink",
        brand: "bg-brand-soft text-brand-strong",
        flow: "bg-flow-soft text-flow-strong",
        ok: "bg-ok-soft text-ok-strong",
        warm: "bg-warm-soft text-warm-strong",
        danger: "bg-danger-soft text-danger-strong",
        dark: "bg-ink text-white",
        white: "bg-white text-ink",
      },
      size: {
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-[13px]",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  size,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/** Marque visible des profils et contenus fictifs. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warm" className={className} title="Profil fictif, créé pour illustrer la plateforme">
      Démo
    </Badge>
  );
}

// ── Compétence ───────────────────────────────────────────────────────────
const SKILL_TONES = {
  offer: "bg-brand-soft text-brand-strong",
  want: "bg-flow-soft text-flow-strong",
  neutral: "bg-field text-ink",
  onDark: "bg-ink-3 text-white",
} as const;

export function SkillChip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof SKILL_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-[13px] font-medium leading-tight",
        SKILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SkillList({
  skills,
  tone,
  max = 6,
  empty,
}: {
  skills: Pick<Skill, "id" | "name">[];
  tone?: keyof typeof SKILL_TONES;
  max?: number;
  empty?: string;
}) {
  if (skills.length === 0) {
    return empty ? <p className="text-sm text-faint">{empty}</p> : null;
  }
  const shown = skills.slice(0, max);
  const rest = skills.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((skill) => (
        <li key={skill.id}>
          <SkillChip tone={tone}>{skill.name}</SkillChip>
        </li>
      ))}
      {rest > 0 ? (
        <li>
          <SkillChip tone="neutral">+{rest}</SkillChip>
        </li>
      ) : null}
    </ul>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────
const AVATAR_TONES = [
  "bg-brand text-white",
  "bg-ink text-white",
  "bg-flow-strong text-white",
  "bg-ok-strong text-white",
  "bg-warm-strong text-white",
  "bg-ink-3 text-white",
];

const AVATAR_SIZES = {
  xs: "size-7 text-[11px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
  xl: "size-24 text-2xl",
} as const;

function toneFor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
}

type AvatarPerson = Pick<ProfileMini, "id" | "first_name" | "last_name" | "avatar_url"> & {
  username?: string;
};

export function Avatar({
  person,
  size = "md",
  className,
}: {
  person: AvatarPerson | null;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const base = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
    AVATAR_SIZES[size],
    className,
  );
  if (person?.avatar_url) {
    return (
      // Image fournie par le membre : pas d'optimisation serveur, chargement différé.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatar_url}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn(base, "bg-field object-cover")}
      />
    );
  }
  return (
    <span aria-hidden className={cn(base, toneFor(person?.id ?? "x"))}>
      {initials(person)}
    </span>
  );
}

/** Avatar + nom + ligne secondaire, cliquable vers le profil. */
export function PersonLine({
  person,
  subtitle,
  size = "md",
  link = true,
  className,
}: {
  person: ProfileMini | null;
  subtitle?: ReactNode;
  size?: "sm" | "md" | "lg";
  link?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <Avatar person={person} size={size} />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className={cn("truncate font-semibold text-ink", size === "lg" ? "text-base" : "text-[15px]")}>
            {fullName(person)}
          </span>
          {person?.is_demo ? <DemoBadge /> : null}
        </span>
        {subtitle ? <span className="block truncate text-sm text-muted">{subtitle}</span> : null}
      </span>
    </>
  );
  if (link && person) {
    return (
      <Link
        href={`/developpeurs/${person.username}`}
        className={cn("group flex min-w-0 items-center gap-3 rounded-xl", className)}
      >
        {content}
      </Link>
    );
  }
  return <span className={cn("flex min-w-0 items-center gap-3", className)}>{content}</span>;
}

// ── États vides, chargement, progression ─────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function Progress({
  value,
  tone = "brand",
  className,
  label,
}: {
  value: number;
  tone?: "brand" | "flow" | "ok";
  className?: string;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const fill = tone === "flow" ? "bg-flow" : tone === "ok" ? "bg-ok" : "bg-brand";
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-field", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** Anneau de score : la valeur est toujours écrite, jamais portée par la seule couleur. */
export function ScoreRing({
  value,
  size = 64,
  className,
  onDark = false,
}: {
  value: number;
  size?: number;
  className?: string;
  onDark?: boolean;
}) {
  const stroke = Math.max(5, Math.round(size / 11));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score de correspondance : ${clamped} sur 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={onDark ? "stroke-ink-3" : "stroke-field"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="stroke-flow"
        />
      </svg>
      <span
        className={cn("absolute font-semibold tabular-nums", onDark ? "text-white" : "text-ink")}
        style={{ fontSize: Math.round(size * 0.3) }}
      >
        {clamped}
      </span>
    </span>
  );
}

// ── En-tête de page et onglets ───────────────────────────────────────────
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? <div className="mb-2 text-sm font-medium text-brand">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold text-ink sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-2 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export type TabItem = { href: string; label: string; count?: number; active: boolean };

/** Onglets portés par l'adresse : partageables, et le bouton « retour » fonctionne. */
export function LinkTabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="scroll-quiet -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              scroll={false}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                item.active ? "bg-ink text-white" : "bg-surface text-muted hover:text-ink",
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    item.active ? "bg-ink-3 text-white" : "bg-field text-ink",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const linkClass =
    "inline-flex h-10 items-center rounded-xl bg-surface px-4 text-sm font-medium text-ink shadow-card transition-colors hover:bg-field";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass} rel="prev">
          Précédent
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">
        Page {page} sur {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={linkClass} rel="next">
          Suivant
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Message d'information, d'alerte ou de réussite (toujours avec une icône et un texte). */
export function Notice({
  tone = "brand",
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  tone?: "brand" | "flow" | "ok" | "warm" | "danger";
  icon: LucideIcon;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    brand: "bg-brand-soft text-brand-strong",
    flow: "bg-flow-soft text-flow-strong",
    ok: "bg-ok-soft text-ok-strong",
    warm: "bg-warm-soft text-warm-strong",
    danger: "bg-danger-soft text-danger-strong",
  } as const;
  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-2xl p-4", tones[tone], className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn("text-ink", title && "mt-0.5")}>{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
