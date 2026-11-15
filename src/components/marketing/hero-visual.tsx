import { ArrowLeftRight, MapPin } from "lucide-react";
import { ScoreRing, SkillChip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Illustration d'accueil : des développeurs reliés par ce qu'ils savent faire.
 * Tout est dessiné en HTML et SVG (aucune image, aucun dégradé).
 */

function ProfileTile({
  initials,
  name,
  place,
  offers,
  wants,
  tone,
  className,
}: {
  initials: string;
  name: string;
  place: string;
  offers: string[];
  wants: string[];
  tone: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl bg-surface p-5 shadow-lift", className)}>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white", tone)}>
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{name}</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <MapPin className="size-3" aria-hidden /> {place}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-faint">Propose</p>
          <div className="flex flex-wrap gap-1.5">
            {offers.map((skill) => (
              <SkillChip key={skill} tone="offer">{skill}</SkillChip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-faint">Recherche</p>
          <div className="flex flex-wrap gap-1.5">
            {wants.map((skill) => (
              <SkillChip key={skill} tone="want">{skill}</SkillChip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Satellite({
  initials,
  skill,
  className,
  delay,
}: {
  initials: string;
  skill: string;
  className?: string;
  delay: string;
}) {
  return (
    <div
      className={cn("absolute hidden animate-drift items-center gap-2 rounded-full bg-surface py-1.5 pl-1.5 pr-3.5 shadow-card sm:flex", className)}
      style={{ animationDelay: delay }}
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-field text-[11px] font-semibold text-ink">
        {initials}
      </span>
      <span className="text-xs font-medium text-muted">{skill}</span>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div
      role="img"
      aria-label="Exemple de correspondance : Kodjo propose Flutter et recherche Python, Amina propose Python et recherche Flutter. Score : 95 sur 100."
      className="relative mx-auto w-full max-w-[34rem] sm:aspect-[10/9]"
    >
      {/* Réseau de connexions */}
      <svg
        aria-hidden
        viewBox="0 0 100 90"
        preserveAspectRatio="none"
        className="absolute inset-0 hidden size-full sm:block"
        fill="none"
      >
        <g stroke="#D5DDE9" strokeWidth="1.5">
          <path d="M56 9 L78 5" vectorEffect="non-scaling-stroke" className="flow-line-slow" />
          <path d="M88 29 L90 47" vectorEffect="non-scaling-stroke" className="flow-line-slow" />
          <path d="M12 58 L15 43" vectorEffect="non-scaling-stroke" className="flow-line-slow" />
          <path d="M24 82 L44 78" vectorEffect="non-scaling-stroke" className="flow-line-slow" />
        </g>
        <g stroke="#28B8D5" strokeWidth="2.25" strokeLinecap="round">
          <path d="M56 26 C 66 26, 71 35, 70 47" vectorEffect="non-scaling-stroke" className="flow-line" />
          <path d="M44 66 C 34 66, 29 55, 30 43" vectorEffect="non-scaling-stroke" className="flow-line" />
        </g>
      </svg>

      <Satellite initials="KA" skill="React · Accra" className="right-0 top-[1%]" delay="0s" />
      <Satellite initials="YB" skill="Docker · Casablanca" className="right-[-3%] top-[24%]" delay="1.2s" />
      <Satellite initials="CO" skill="UI/UX · Lagos" className="left-[-3%] top-[62%]" delay="2.1s" />
      <Satellite initials="WK" skill="Django · Nairobi" className="bottom-[2%] left-[2%]" delay="0.6s" />

      <div className="relative flex flex-col gap-3 sm:block sm:size-full">
        <ProfileTile
          initials="KM"
          name="Kodjo M."
          place="Lomé · Togo"
          offers={["Flutter", "Dart"]}
          wants={["Python", "IA"]}
          tone="bg-brand"
          className="sm:absolute sm:left-0 sm:top-[4%] sm:w-[56%]"
        />

        <div className="z-10 mx-auto flex items-center gap-3 rounded-full bg-ink py-2 pl-2 pr-5 shadow-pop sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
          <ScoreRing value={95} size={44} onDark />
          <span>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-white">
              <ArrowLeftRight className="size-3.5 text-flow" aria-hidden /> Correspondance réciproque
            </span>
            <span className="block whitespace-nowrap text-xs text-white/65">Flutter contre Python</span>
          </span>
        </div>

        <ProfileTile
          initials="AD"
          name="Amina D."
          place="Dakar · Sénégal"
          offers={["Python", "Machine Learning"]}
          wants={["Flutter", "Dart"]}
          tone="bg-ink"
          className="sm:absolute sm:bottom-[4%] sm:right-0 sm:w-[56%]"
        />
      </div>
      <p className="mt-3 text-center text-xs text-faint sm:absolute sm:-bottom-7 sm:left-0 sm:right-0 sm:mt-0">
        Exemple illustratif
      </p>
    </div>
  );
}

/** Schéma d'une boucle d'échange à trois. */
export function LoopDiagram({ onDark = false }: { onDark?: boolean }) {
  const node = onDark ? "#27375C" : "#FFFFFF";
  const text = onDark ? "#FFFFFF" : "#101B36";
  return (
    <svg viewBox="0 0 240 200" className="w-full max-w-[15rem]" role="img" aria-label="Boucle à trois : A aide B, B aide C, C aide A.">
      <g fill="none" stroke="#28B8D5" strokeWidth="2.5" strokeLinecap="round">
        <path d="M100 52 L62 120" className="flow-line" />
        <path d="M82 152 L158 152" className="flow-line" />
        <path d="M178 120 L140 52" className="flow-line" />
      </g>
      <g fill="#28B8D5">
        <path d="M58 127 l1 -11 l8 5 z" />
        <path d="M165 152 l-9 -5 l0 10 z" />
        <path d="M137 46 l8 7 l-9 3 z" />
      </g>
      {[
        { x: 120, y: 34, label: "A" },
        { x: 52, y: 152, label: "B" },
        { x: 188, y: 152, label: "C" },
      ].map((item) => (
        <g key={item.label}>
          <circle cx={item.x} cy={item.y} r="26" fill={node} />
          <text x={item.x} y={item.y + 6} textAnchor="middle" fontSize="17" fontWeight="600" fill={text}>
            {item.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
