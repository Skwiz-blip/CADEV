import type { ReactNode } from "react";

/** Mise en page des pages de texte (à propos, conditions, confidentialité). */
export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: ReactNode }) {
  return (
    <header className="px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-brand">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink sm:text-5xl">{title}</h1>
        {text ? <p className="mt-5 text-lg text-muted sm:text-xl">{text}</p> : null}
      </div>
    </header>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-10 text-[16px] leading-relaxed text-ink/85 [&_a]:font-medium [&_a]:text-brand hover:[&_a]:underline [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:pl-1 [&_p+p]:mt-4 [&_section>*+*]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}
