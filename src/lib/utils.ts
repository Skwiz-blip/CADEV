import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

type Named = { first_name: string; last_name: string; username?: string };

export function fullName(person: Named | null | undefined): string {
  if (!person) return "Compte supprimé";
  const name = `${person.first_name} ${person.last_name}`.trim();
  return name || person.username || "Membre";
}

export function initials(person: Named | null | undefined): string {
  if (!person) return "?";
  const letters = `${person.first_name.charAt(0)}${person.last_name.charAt(0)}`.trim();
  return (letters || person.username?.slice(0, 2) || "?").toUpperCase();
}

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const DATE_SHORT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const RELATIVE = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  return DATE.format(new Date(value));
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return "";
  return DATE_SHORT.format(new Date(value));
}

export function formatTime(value: string | Date): string {
  return TIME.format(new Date(value));
}

/** « il y a 3 heures », « hier », puis la date au-delà d'un mois. */
export function timeAgo(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return "";
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "à l'instant";
  if (abs < 3600) return RELATIVE.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return RELATIVE.format(Math.round(seconds / 3600), "hour");
  if (abs < 86_400 * 30) return RELATIVE.format(Math.round(seconds / 86_400), "day");
  return formatDate(date);
}

export function daysSince(value: string | Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000);
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count > 1 ? (pluralForm ?? `${singular}s`) : singular}`;
}

/** Durée lisible à partir d'un nombre d'heures (réactivité aux propositions). */
export function formatHours(hours: number | null | undefined): string | null {
  if (hours === null || hours === undefined) return null;
  if (hours < 1) return "moins d'une heure";
  if (hours < 24) return `${Math.round(hours)} h`;
  const days = Math.round(hours / 24);
  return `${days} jour${days > 1 ? "s" : ""}`;
}

/** N'autorise que les redirections internes (évite les redirections ouvertes). */
export function safeNext(next: string | null | undefined, fallback = "/tableau-de-bord"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Construit une URL en conservant les filtres courants. */
export function withParams(
  base: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | number | undefined | null>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  return single?.trim() || undefined;
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}
