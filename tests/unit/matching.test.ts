import { describe, expect, it } from "vitest";
import { describeOverlap, hourRanges, localOverlap, matchReasons, matchStrength, utcOffsetHours } from "@/lib/matching";
import type { MatchItem, Skill } from "@/lib/types";
import { safeNext, timeAgo, withParams } from "@/lib/utils";
import { offerSchema, proposalSchema, signUpSchema } from "@/lib/validation";

const skill = (name: string): Skill => ({ id: name, name, slug: name.toLowerCase(), kind: "technology", category: "languages" });

const base = {
  id: "m1",
  status: "suggested",
  updated_at: "2026-11-13T10:00:00Z",
  other: {} as MatchItem["other"],
} as const;

const strong: MatchItem = {
  ...base,
  score: 95,
  i_give: [skill("Python")],
  they_give: [skill("Dart"), skill("Flutter")],
  shared_languages: ["en", "fr"],
  shared_modes: ["remote"],
  weekday_overlap: 5,
  weekend_overlap: 12,
  overlap_hours: [18, 19, 20, 21, 22, 32, 33],
  same_country: false,
  breakdown: { skills: 50, availability: 20, languages: 15, mode: 10, geo: 0 },
};

describe("explication d'une correspondance", () => {
  it("donne une raison par critère gagné, jamais plus", () => {
    const reasons = matchReasons(strong);
    expect(reasons.map((reason) => reason.kind)).toEqual(["they_want", "they_offer", "availability", "language", "mode"]);
    expect(reasons[0]!.text).toBe("Cette personne recherche précisément une compétence que tu proposes : Python.");
    expect(reasons[1]!.text).toBe("Elle propose des compétences que tu recherches : Dart et Flutter.");
    expect(reasons[3]!.text).toBe("Vous partagez des langues de travail : anglais et français.");
    expect(reasons.reduce((sum, reason) => sum + reason.points, 0)).toBe(strong.score);
  });

  it("n'invente aucune raison quand un critère vaut zéro", () => {
    const partial: MatchItem = {
      ...strong,
      score: 25,
      i_give: [],
      shared_languages: [],
      shared_modes: [],
      overlap_hours: [],
      breakdown: { skills: 25, availability: 0, languages: 0, mode: 0, geo: 0 },
    };
    expect(matchReasons(partial).map((reason) => reason.kind)).toEqual(["they_offer"]);
    expect(matchStrength(partial).tone).toBe("partial");
    expect(matchStrength(strong).label).toBe("Correspondance réciproque forte");
    expect(matchStrength({ ...strong, score: 70 }).tone).toBe("good");
  });

  it("mentionne le même pays et le présentiel quand ils comptent", () => {
    const local: MatchItem = {
      ...strong,
      shared_modes: ["onsite"],
      same_country: true,
      breakdown: { ...strong.breakdown, geo: 5 },
    };
    const reasons = matchReasons(local);
    expect(reasons.find((reason) => reason.kind === "mode")!.text).toContain("en présentiel");
    expect(reasons.at(-1)).toMatchObject({ kind: "country", points: 5 });
  });
});

describe("créneaux communs dans le fuseau de chacun", () => {
  const winter = new Date("2026-01-15T12:00:00Z");

  it("calcule le décalage horaire", () => {
    expect(utcOffsetHours("UTC", winter)).toBe(0);
    expect(utcOffsetHours("Africa/Lome", winter)).toBe(0);
    expect(utcOffsetHours("Africa/Lagos", winter)).toBe(1);
    expect(utcOffsetHours("Africa/Nairobi", winter)).toBe(3);
    expect(utcOffsetHours("Fuseau/Inexistant", winter)).toBe(0);
  });

  it("regroupe les heures en plages, y compris autour de minuit", () => {
    expect(hourRanges([18, 19, 20])).toEqual(["18 h – 21 h"]);
    expect(hourRanges([8, 9, 14, 15, 16])).toEqual(["8 h – 10 h", "14 h – 17 h"]);
    expect(hourRanges([22, 23, 0, 1])).toEqual(["22 h – 2 h"]);
    expect(hourRanges([])).toEqual([]);
  });

  it("affiche le même créneau à l'heure de chaque personne", () => {
    const lome = localOverlap(strong.overlap_hours, "Africa/Lome", winter);
    const nairobi = localOverlap(strong.overlap_hours, "Africa/Nairobi", winter);
    expect(lome).toEqual({ weekday: ["18 h – 23 h"], weekend: ["8 h – 10 h"] });
    expect(nairobi).toEqual({ weekday: ["21 h – 2 h"], weekend: ["11 h – 13 h"] });
    expect(describeOverlap(lome)).toBe("en semaine 18 h – 23 h · le week-end 8 h – 10 h");
    expect(describeOverlap({ weekday: [], weekend: [] })).toBeNull();
  });
});

describe("outils", () => {
  it("n'accepte que des redirections internes", () => {
    expect(safeNext("/messages")).toBe("/messages");
    expect(safeNext("https://pirate.example")).toBe("/tableau-de-bord");
    expect(safeNext("//pirate.example")).toBe("/tableau-de-bord");
    expect(safeNext("/\\pirate.example")).toBe("/tableau-de-bord");
    expect(safeNext(null, "/bienvenue")).toBe("/bienvenue");
  });

  it("écrit les dates relatives en français", () => {
    const now = new Date("2026-11-13T12:00:00Z");
    expect(timeAgo("2026-11-13T11:59:50Z", now)).toBe("à l'instant");
    expect(timeAgo("2026-11-13T09:00:00Z", now)).toBe("il y a 3 heures");
    expect(timeAgo("2026-11-12T12:00:00Z", now)).toBe("hier");
  });

  it("conserve les filtres dans les liens de pagination", () => {
    expect(withParams("/explorer", { q: "flutter", pays: "TG" }, { page: 2 })).toBe("/explorer?q=flutter&pays=TG&page=2");
    expect(withParams("/explorer", { q: "flutter" }, { q: undefined })).toBe("/explorer");
  });
});

describe("validation des formulaires", () => {
  const offer = {
    title: "Flutter contre Python",
    description: "Je cherche de l'aide en Python et je propose Flutter en retour.",
    exchange_type: "reciprocal",
    collaboration_type: "remote",
    estimated_duration: "few_days",
    desired_level: "any",
    availability: ["weekend"],
    language: "fr",
    country: "TG",
    links: [],
    conditions: "",
    proposed: ["3f2b8f0e-1c1d-4a52-9d55-0d6f3a1b2c3d"],
    requested: ["7a1c2e4f-9b8d-4c3e-8f1a-2b3c4d5e6f70"],
    related: [],
    urgent: false,
  };

  it("exige les deux sens pour un échange réciproque", () => {
    expect(offerSchema.safeParse(offer).success).toBe(true);
    const result = offerSchema.safeParse({ ...offer, requested: [] });
    expect(result.success).toBe(false);
    expect(offerSchema.safeParse({ ...offer, links: ["javascript:alert(1)"] }).success).toBe(false);
    expect(offerSchema.safeParse({ ...offer, urgent: true }).success).toBe(false);
    expect(offerSchema.safeParse({ ...offer, exchange_type: "one_off", proposed: [], urgent: true }).success).toBe(true);
  });

  it("refuse une proposition sans compétence ou sans message", () => {
    const proposal = {
      receiverId: offer.proposed[0],
      offerId: null,
      message: "Bonjour, je te propose un échange de compétences.",
      offered: offer.proposed,
      requested: [],
    };
    expect(proposalSchema.safeParse(proposal).success).toBe(true);
    expect(proposalSchema.safeParse({ ...proposal, offered: [] }).success).toBe(false);
    expect(proposalSchema.safeParse({ ...proposal, message: "Salut" }).success).toBe(false);
  });

  it("contrôle l'inscription", () => {
    const account = {
      firstName: "Kodjo", lastName: "Mensah", email: "kodjo@exemple.com",
      password: "Bridge2026", confirmPassword: "Bridge2026", country: "TG", terms: true,
    };
    expect(signUpSchema.safeParse(account).success).toBe(true);
    expect(signUpSchema.safeParse({ ...account, confirmPassword: "autre" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...account, password: "court", confirmPassword: "court" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...account, country: "FR" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...account, terms: false }).success).toBe(false);
  });
});
