import { ArrowLeftRight, BadgeCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { LoopDiagram } from "@/components/marketing/hero-visual";

const POINTS = [
  { icon: Sparkles, text: "Des correspondances expliquées, jamais imposées." },
  { icon: ArrowLeftRight, text: "Des échanges qui se terminent par un résultat validé." },
  { icon: BadgeCheck, text: "Une réputation fondée sur ce que tu as réellement réalisé." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between bg-ink p-12 lg:flex">
        <Logo onDark />
        <div>
          <LoopDiagram onDark />
          <p className="mt-10 max-w-md text-3xl font-semibold leading-tight text-white">
            Tes compétences ont de la valeur. Échangeons pour construire davantage.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point.text} className="flex items-center gap-3 text-white/80">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink-3 text-flow">
                  <point.icon className="size-[18px]" aria-hidden />
                </span>
                {point.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/50">Pour les devs, par les devs · 54 pays d&apos;Afrique</p>
      </aside>

      <main id="contenu" className="flex flex-col bg-surface px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
