import type { LucideIcon } from "lucide-react";
import type { KeyCount } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AdminStat({
  icon: Icon,
  label,
  value,
  detail,
  accent = "bg-brand-soft text-brand",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-card">
      <span className={cn("flex size-10 items-center justify-center rounded-xl", accent)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
      {detail ? <p className="mt-1 text-xs text-faint">{detail}</p> : null}
    </div>
  );
}

/** Classement en barres horizontales : une valeur écrite sur chaque ligne. */
export function BarList({
  title,
  rows,
  format = (key) => key,
  empty = "Pas encore de données.",
  tone = "bg-brand",
}: {
  title: string;
  rows: KeyCount[];
  format?: (key: string) => string;
  empty?: string;
  tone?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-ink">{format(row.key)}</span>
                <span className="font-semibold tabular-nums text-ink">{row.count}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-field">
                <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(2, (row.count / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Histogramme vertical simple (inscriptions par semaine). */
export function ColumnChart({ title, rows, format }: { title: string; rows: KeyCount[]; format: (key: string) => string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <ol className="mt-6 flex h-44 items-end gap-2" aria-label={title}>
        {rows.map((row) => (
          <li key={row.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="text-xs font-semibold tabular-nums text-ink">{row.count}</span>
            <span
              className="w-full max-w-10 rounded-t-lg bg-brand"
              style={{ height: `${Math.max(3, (row.count / max) * 100)}%` }}
              aria-hidden
            />
            <span className="w-full truncate text-center text-[11px] text-muted">{format(row.key)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
