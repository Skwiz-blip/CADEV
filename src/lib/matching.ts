import { languageName } from "./data/countries";
import { COLLABORATION_MODES } from "./labels";
import type { MatchItem } from "./types";

/**
 * Explication d'une correspondance. Le score est calculé dans la base ; ici on
 * ne fait que le rendre lisible. Aucune recommandation n'est affichée sans raison.
 */

export type ReasonKind = "they_want" | "they_offer" | "availability" | "language" | "mode" | "country";

export type MatchReason = { kind: ReasonKind; text: string; points: number };

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

/** Décalage d'un fuseau par rapport à UTC, en heures (arrondi comme dans la base). */
export function utcOffsetHours(timeZone: string, at: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    const utc = Date.UTC(
      at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), at.getUTCHours(), at.getUTCMinutes(),
    );
    return Math.round((local - utc) / 3_600_000);
  } catch {
    return 0;
  }
}

/** Regroupe des heures en plages lisibles : [18, 19, 20] → « 18 h – 21 h ». */
export function hourRanges(hours: number[]): string[] {
  const sorted = Array.from(new Set(hours.map((hour) => ((hour % 24) + 24) % 24))).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const ranges: [number, number][] = [];
  let start = sorted[0]!;
  let previous = sorted[0]!;
  for (const hour of sorted.slice(1)) {
    if (hour === previous + 1) {
      previous = hour;
      continue;
    }
    ranges.push([start, previous + 1]);
    start = hour;
    previous = hour;
  }
  ranges.push([start, previous + 1]);
  // Une plage qui passe minuit (… 23 h puis 0 h …) est recollée.
  if (ranges.length > 1 && ranges[0]![0] === 0 && ranges[ranges.length - 1]![1] === 24) {
    const last = ranges.pop()!;
    const first = ranges.shift()!;
    ranges.push([last[0], first[1]]);
  }
  return ranges.map(([from, to]) => `${from} h – ${to % 24} h`);
}

export type LocalOverlap = { weekday: string[]; weekend: string[] };

/**
 * Créneaux communs (stockés en UTC : 0-23 semaine, 24-47 week-end) exprimés
 * dans un fuseau donné. C'est ce qui permet à chacun de lire « ses » heures.
 */
export function localOverlap(overlapHours: number[], timeZone: string, at: Date = new Date()): LocalOverlap {
  const offset = utcOffsetHours(timeZone, at);
  const weekday = overlapHours.filter((hour) => hour < 24).map((hour) => hour + offset);
  const weekend = overlapHours.filter((hour) => hour >= 24).map((hour) => hour - 24 + offset);
  return { weekday: hourRanges(weekday), weekend: hourRanges(weekend) };
}

export function describeOverlap(overlap: LocalOverlap): string | null {
  const parts: string[] = [];
  if (overlap.weekday.length) parts.push(`en semaine ${overlap.weekday.join(", ")}`);
  if (overlap.weekend.length) parts.push(`le week-end ${overlap.weekend.join(", ")}`);
  return parts.length ? parts.join(" · ") : null;
}

export function matchReasons(match: MatchItem): MatchReason[] {
  const reasons: MatchReason[] = [];
  const iGive = match.i_give.map((skill) => skill.name);
  const theyGive = match.they_give.map((skill) => skill.name);

  if (iGive.length) {
    reasons.push({
      kind: "they_want",
      points: 25,
      text:
        iGive.length === 1
          ? `Cette personne recherche précisément une compétence que tu proposes : ${iGive[0]}.`
          : `Cette personne recherche des compétences que tu proposes : ${list(iGive)}.`,
    });
  }
  if (theyGive.length) {
    reasons.push({
      kind: "they_offer",
      points: 25,
      text:
        theyGive.length === 1
          ? `Elle propose une compétence que tu recherches : ${theyGive[0]}.`
          : `Elle propose des compétences que tu recherches : ${list(theyGive)}.`,
    });
  }
  if (match.breakdown.availability > 0) {
    reasons.push({
      kind: "availability",
      points: match.breakdown.availability,
      text:
        match.breakdown.availability >= 20
          ? "Vous avez des disponibilités compatibles."
          : "Vous avez un court créneau en commun.",
    });
  }
  if (match.shared_languages.length) {
    reasons.push({
      kind: "language",
      points: match.breakdown.languages,
      text:
        match.shared_languages.length === 1
          ? `Vous partagez une langue de travail : ${languageName(match.shared_languages[0]!).toLowerCase()}.`
          : `Vous partagez des langues de travail : ${list(match.shared_languages.map((code) => languageName(code).toLowerCase()))}.`,
    });
  }
  if (match.breakdown.mode > 0) {
    const remote = match.shared_modes.includes("remote");
    reasons.push({
      kind: "mode",
      points: match.breakdown.mode,
      text: remote
        ? "Vous êtes tous les deux à l'aise pour travailler à distance."
        : `Vous préférez le même mode de travail : ${list(match.shared_modes.map((mode) => COLLABORATION_MODES[mode].toLowerCase()))}.`,
    });
  }
  if (match.same_country) {
    reasons.push({ kind: "country", points: match.breakdown.geo, text: "Vous êtes dans le même pays." });
  }
  return reasons;
}

export type MatchStrength = { label: string; tone: "strong" | "good" | "partial" };

export function matchStrength(match: Pick<MatchItem, "score" | "i_give" | "they_give">): MatchStrength {
  const reciprocal = match.i_give.length > 0 && match.they_give.length > 0;
  if (reciprocal && match.score >= 80) return { label: "Correspondance réciproque forte", tone: "strong" };
  if (reciprocal) return { label: "Correspondance réciproque", tone: "good" };
  return { label: "Correspondance à sens unique", tone: "partial" };
}

/** Détail du score, dans l'ordre du barème. */
export const SCORE_SCALE = [
  { key: "skills", label: "Compétences complémentaires", max: 50 },
  { key: "availability", label: "Disponibilités", max: 20 },
  { key: "languages", label: "Langue de travail", max: 15 },
  { key: "mode", label: "Mode de collaboration", max: 10 },
  { key: "geo", label: "Même pays", max: 5 },
] as const;
