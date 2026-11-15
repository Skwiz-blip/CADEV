import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestDb, createKodjoAndAmina, failure, json, lit } from "./harness";

let db: TestDb;
let kodjo: string;
let amina: string;
let skills: Awaited<ReturnType<typeof createKodjoAndAmina>>["skills"];

type Match = {
  score: number;
  status: string;
  other: { id: string; first_name: string };
  i_give: { name: string }[];
  they_give: { name: string }[];
  shared_languages: string[];
  weekday_overlap: number;
  weekend_overlap: number;
  same_country: boolean;
  breakdown: Record<string, number>;
};

beforeAll(async () => {
  db = await TestDb.create();
  ({ kodjo, amina, skills } = await createKodjoAndAmina(db));
});

afterAll(async () => {
  await db.close();
});

describe("moteur de correspondance", () => {
  it("détecte la correspondance réciproque Kodjo ⇄ Amina et l'explique", async () => {
    const result = await db.as(amina, (s) => s.rpc<{ total: number; items: Match[] }>("get_matches"));
    expect(result.total).toBe(1);
    const match = result.items[0]!;
    expect(match.other.id).toBe(kodjo);
    // Vu par Amina : elle apporte Python, Kodjo apporte Flutter et Dart.
    expect(match.i_give.map((skill) => skill.name)).toEqual(["Python"]);
    expect(match.they_give.map((skill) => skill.name)).toEqual(["Dart", "Flutter"]);
    expect(match.shared_languages).toEqual(["en", "fr"]);
    expect(match.same_country).toBe(false);
    // 50 (compétences) + 20 (disponibilités) + 15 (langue) + 10 (à distance) + 0 (pays)
    expect(match.breakdown).toEqual({ skills: 50, availability: 20, languages: 15, mode: 10, geo: 0 });
    expect(match.score).toBe(95);
  });

  it("présente la même correspondance du point de vue de Kodjo", async () => {
    const result = await db.as(kodjo, (s) => s.rpc<{ items: Match[] }>("get_matches"));
    const match = result.items[0]!;
    expect(match.other.id).toBe(amina);
    expect(match.i_give.map((skill) => skill.name)).toEqual(["Dart", "Flutter"]);
    expect(match.they_give.map((skill) => skill.name)).toEqual(["Python"]);
    expect(match.score).toBe(95);
  });

  it("prévient l'autre personne d'une nouvelle correspondance forte, une seule fois", async () => {
    const rows = await db.sql<{ user_id: string; total: number }>(
      `select user_id, count(*)::int as total from public.notifications where type = 'new_match' group by user_id`,
    );
    // Kodjo a enregistré ses compétences en premier : c'est l'arrivée d'Amina qui crée
    // la correspondance, donc c'est Kodjo qui est prévenu.
    expect(rows).toEqual([{ user_id: kodjo, total: 1 }]);

    await db.as(amina, (s) => s.rpc("refresh_my_matches"));
    const [again] = await db.sql<{ total: number }>(
      `select count(*)::int as total from public.notifications where type = 'new_match'`,
    );
    expect(again!.total).toBe(1);
  });

  it("ne crée aucune correspondance sans compétence complémentaire", async () => {
    const solo = await db.createUser({ first: "Wanjiru", last: "Kamau", country: "KE", timezone: "Africa/Nairobi" });
    const [rust] = await db.skillIds("rust");
    await db.as(solo, async (s) => {
      await s.rpc("set_my_skills", { p_type: "offered", p_items: json([{ skill_id: rust, level: "expert" }]) });
      const result = await s.rpc<{ total: number }>("get_matches");
      expect(result.total).toBe(0);
    });
  });

  it("calcule une correspondance à sens unique et tient compte des fuseaux horaires", async () => {
    // Nairobi (UTC+3) le matin = 03h-09h UTC ; Lomé (UTC+0) le soir = 18h-23h UTC : aucun créneau commun.
    const wanjiru = await db.createUser({ first: "Wanjiru", last: "Otieno", country: "KE", timezone: "Africa/Nairobi" });
    await db.sql(
      `update public.profiles set languages = '{en,sw}', availability = '{weekday_morning}', collaboration_modes = '{remote}' where id = ${lit(wanjiru)}`,
    );
    await db.sql(`update public.profiles set availability = '{weekday_evening}' where id = ${lit(kodjo)}`);
    await db.as(wanjiru, (s) =>
      s.rpc("set_my_skills", { p_type: "wanted", p_items: json([{ skill_id: skills.flutter }]) }),
    );
    const result = await db.as(wanjiru, (s) => s.rpc<{ items: Match[] }>("get_matches"));
    const match = result.items.find((item) => item.other.id === kodjo)!;
    expect(match.they_give.map((skill) => skill.name)).toEqual(["Flutter"]);
    expect(match.i_give).toEqual([]);
    // 25 (un seul sens) + 0 (aucun créneau commun) + 15 (anglais) + 10 (à distance)
    expect(match.breakdown).toEqual({ skills: 25, availability: 0, languages: 15, mode: 10, geo: 0 });
    expect(match.score).toBe(50);
    // Restaure les disponibilités de Kodjo pour la suite.
    await db.sql(`update public.profiles set availability = '{weekday_evening,weekend}' where id = ${lit(kodjo)}`);
  });

  it("met la correspondance à jour quand une compétence disparaît", async () => {
    await db.as(amina, (s) =>
      s.rpc("set_my_skills", { p_type: "wanted", p_items: json([{ skill_id: skills.ia }]) }),
    );
    let result = await db.as(amina, (s) => s.rpc<{ items: Match[] }>("get_matches"));
    let match = result.items.find((item) => item.other.id === kodjo)!;
    // Amina ne recherche plus Flutter ni Dart : il ne reste qu'un sens.
    expect(match.breakdown.skills).toBe(25);

    await db.as(amina, (s) =>
      s.rpc("set_my_skills", { p_type: "offered", p_items: json([]) }),
    );
    result = await db.as(amina, (s) => s.rpc<{ items: Match[] }>("get_matches"));
    match = result.items.find((item) => item.other.id === kodjo)!;
    expect(match).toBeUndefined();
  });

  it("limite le remplacement à un type de compétence pendant l'accueil", async () => {
    const dev = await db.createUser({ first: "Fatou", last: "Sow", country: "SN" });
    const [design, figma, react] = await db.skillIds("ui-ux-design", "figma", "react");
    await db.as(dev, async (s) => {
      await s.rpc("set_my_skills", { p_type: "offered", p_kind: "competence", p_items: json([{ skill_id: design, level: "expert" }]) });
      await s.rpc("set_my_skills", { p_type: "offered", p_kind: "technology", p_items: json([{ skill_id: figma, level: "advanced" }, { skill_id: react, level: "beginner" }]) });
      // Rejouer l'étape « savoir-faire » ne doit pas effacer les technologies.
      const total = await s.rpc<number>("set_my_skills", { p_type: "offered", p_kind: "competence", p_items: json([{ skill_id: design, level: "advanced" }]) });
      expect(total).toBe(3);
      expect(await failure(s.rpc("set_my_skills", { p_type: "volé", p_items: json([]) }))).toMatch(/invalid_input/);
    });
    const [row] = await db.sql<{ profile_completion: number }>(
      `select profile_completion from public.profiles where id = ${lit(dev)}`,
    );
    // nom (10) + pays (10) + compétences proposées (15)
    expect(row!.profile_completion).toBe(35);
  });
});
