import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Données de démonstration.
 *
 * Tout passe par les vraies fonctions de la base, appelées au nom de chaque
 * profil fictif : les exemples respectent donc exactement les mêmes règles que
 * les vrais membres (et ce script sert au passage de test de bout en bout).
 * Chaque profil créé ici porte la marque « démonstration », visible partout.
 *
 * Ce module ne dépend pas de Next.js : il sert au script `npm run seed` et au
 * bouton de l'espace d'administration.
 */

export type SeedConfig = {
  url: string;
  publicKey: string;
  serviceKey: string;
  password: string;
  emailDomain: string;
  log?: (line: string) => void;
};

/**
 * Ce dont le scénario a besoin pour s'exécuter. En production c'est Supabase
 * (`supabaseBackend`) ; dans les tests, c'est le PostgreSQL embarqué : le même
 * scénario est ainsi vérifié sans réseau.
 */
export interface SeedBackend {
  listDemoUserIds(): Promise<string[]>;
  deleteUser(id: string): Promise<void>;
  createUser(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    country: string;
    timezone: string;
  }): Promise<string>;
  /** userId = null : appel avec le rôle serveur. */
  rpc<T>(userId: string | null, fn: string, args: Record<string, unknown>): Promise<T>;
  close(): Promise<void>;
}

export type SeedOptions = { password: string; emailDomain: string; log?: (line: string) => void };

type Persona = {
  key: string;
  first: string;
  last: string;
  country: string;
  city: string;
  timezone: string;
  headline: string;
  bio: string | null;
  experience: string;
  domain: string;
  languages: string[];
  availability: string[];
  modes: string[];
  offered: [slug: string, level: string][];
  wanted: string[];
  github?: string;
};

const PERSONAS: Persona[] = [
  {
    key: "kodjo", first: "Kodjo", last: "Mensah", country: "TG", city: "Lomé", timezone: "Africa/Lome",
    headline: "Développeur mobile Flutter",
    // Profil volontairement incomplet : la démonstration commence par le compléter.
    bio: null,
    experience: "intermediate", domain: "mobile", languages: ["fr", "en", "ee"], availability: [], modes: ["remote"],
    offered: [["flutter", "advanced"], ["dart", "advanced"], ["developpement-mobile", "advanced"]],
    wanted: ["python", "intelligence-artificielle"],
  },
  {
    key: "amina", first: "Amina", last: "Diallo", country: "SN", city: "Dakar", timezone: "Africa/Dakar",
    headline: "Ingénieure données · Python et Machine Learning",
    bio: "Je construis des modèles de prédiction pour l'agriculture et la santé. J'aime expliquer simplement, et je veux apprendre à mettre mes modèles dans la poche des gens avec une application mobile.",
    experience: "senior", domain: "data_ai", languages: ["fr", "en", "wo"],
    availability: ["weekday_evening", "weekend"], modes: ["remote"],
    offered: [["python", "expert"], ["machine-learning", "advanced"], ["analyse-de-donnees", "advanced"]],
    wanted: ["flutter", "dart"],
  },
  {
    key: "kwame", first: "Kwame", last: "Asante", country: "GH", city: "Accra", timezone: "Africa/Accra",
    headline: "Développeur Full-Stack React et Node.js",
    bio: "Je développe des tableaux de bord pour des PME à Accra. Mon code fonctionne, mais mes interfaces manquent de finition : je cherche quelqu'un pour progresser en design.",
    experience: "intermediate", domain: "fullstack", languages: ["en", "tw"],
    availability: ["weekday_evening", "weekend"], modes: ["remote", "hybrid"],
    offered: [["react", "advanced"], ["nodejs", "advanced"], ["typescript", "intermediate"]],
    wanted: ["ui-ux-design", "figma"],
  },
  {
    key: "chisom", first: "Chisom", last: "Okafor", country: "NG", city: "Lagos", timezone: "Africa/Lagos",
    headline: "Designer produit UI/UX",
    bio: "Je conçois des applications financières utilisées sur de petits écrans et des connexions lentes. Je veux comprendre React pour mieux travailler avec les développeurs.",
    experience: "senior", domain: "design", languages: ["en", "ig", "yo"],
    availability: ["weekday_afternoon", "weekday_evening"], modes: ["remote"],
    offered: [["ui-ux-design", "expert"], ["figma", "expert"], ["prototypage", "advanced"]],
    wanted: ["react", "developpement-front-end"],
  },
  {
    key: "youssef", first: "Youssef", last: "Benali", country: "MA", city: "Casablanca", timezone: "Africa/Casablanca",
    headline: "Ingénieur DevOps · Docker et CI/CD",
    bio: "J'automatise les déploiements d'équipes produit. Je veux renforcer mes bases en développement back-end pour mieux comprendre ce que je mets en production.",
    experience: "senior", domain: "devops_cloud", languages: ["fr", "ar", "en"],
    availability: ["weekday_evening", "weekend"], modes: ["remote"],
    offered: [["docker", "expert"], ["devops", "advanced"], ["ci-cd", "advanced"], ["deploiement-cloud", "advanced"]],
    wanted: ["developpement-back-end", "django"],
  },
  {
    key: "wanjiru", first: "Wanjiru", last: "Kamau", country: "KE", city: "Nairobi", timezone: "Africa/Nairobi",
    headline: "Développeuse Back-End Django",
    bio: "Je conçois des API pour des services de livraison à Nairobi. Mes déploiements restent artisanaux : je cherche à apprendre Docker avec quelqu'un qui le pratique tous les jours.",
    experience: "intermediate", domain: "backend", languages: ["en", "sw", "fr"],
    availability: ["weekday_evening", "weekend"], modes: ["remote"],
    offered: [["developpement-back-end", "advanced"], ["django", "advanced"], ["postgresql", "intermediate"]],
    wanted: ["docker", "deploiement-cloud"],
  },
  {
    key: "aicha", first: "Aïcha", last: "Traoré", country: "CI", city: "Abidjan", timezone: "Africa/Abidjan",
    headline: "Développeuse Laravel · paiement mobile",
    bio: "J'intègre le paiement mobile dans des boutiques en ligne ivoiriennes. Je veux passer au mobile natif pour proposer de vraies applications à mes clients.",
    experience: "intermediate", domain: "backend", languages: ["fr", "bm"],
    availability: ["weekday_morning", "weekend"], modes: ["remote", "onsite"],
    offered: [["paiement-mobile", "expert"], ["laravel", "advanced"], ["php", "advanced"]],
    wanted: ["developpement-mobile", "react-native"],
  },
  {
    key: "mariam", first: "Mariam", last: "Coulibaly", country: "ML", city: "Bamako", timezone: "Africa/Bamako",
    headline: "Développeuse IA · assistants et LLM",
    bio: "Je crée des assistants en langues locales pour des coopératives. Mon prochain projet doit encaisser des paiements mobiles, et je pars de zéro sur ce sujet.",
    experience: "intermediate", domain: "data_ai", languages: ["fr", "bm"],
    availability: ["weekday_evening", "weekend"], modes: ["remote"],
    offered: [["intelligence-artificielle", "advanced"], ["integration-ia", "advanced"], ["fastapi", "intermediate"]],
    wanted: ["paiement-mobile", "deploiement-cloud"],
  },
  {
    key: "thabo", first: "Thabo", last: "Nkosi", country: "ZA", city: "Johannesburg", timezone: "Africa/Johannesburg",
    headline: "Développeur React Native",
    bio: "Je développe des applications mobiles pour des banques communautaires. La sécurité devient centrale dans mon travail et je veux l'apprendre sérieusement.",
    experience: "senior", domain: "mobile", languages: ["en", "zu"],
    availability: ["weekday_evening", "weekend"], modes: ["remote", "hybrid"],
    offered: [["react-native", "expert"], ["tests-automatises", "advanced"], ["typescript", "advanced"]],
    wanted: ["cybersecurite", "securite-applications"],
  },
  {
    key: "salma", first: "Salma", last: "Haddad", country: "TN", city: "Tunis", timezone: "Africa/Tunis",
    headline: "Consultante en cybersécurité",
    bio: "J'audite des applications web et mobiles. Je veux apprendre à développer en React Native pour proposer des correctifs concrets, pas seulement des rapports.",
    experience: "senior", domain: "security", languages: ["fr", "ar", "en"],
    availability: ["weekday_evening", "weekend"], modes: ["remote"],
    offered: [["cybersecurite", "expert"], ["securite-applications", "expert"], ["linux", "advanced"]],
    wanted: ["react-native", "tests-automatises"],
  },
];

export const DEMO_ACCOUNT_KEYS = ["kodjo", "amina"] as const;

export function demoEmail(key: string, domain: string): string {
  return `${key}@${domain}`;
}

export class SeedError extends Error {}

/** Supprime tous les profils de démonstration (et, en cascade, tout ce qui leur est rattaché). */
export async function purgeDemoWith(backend: SeedBackend, log?: (line: string) => void): Promise<number> {
  let removed = 0;
  for (let guard = 0; guard < 50; guard += 1) {
    const ids = await backend.listDemoUserIds();
    if (ids.length === 0) break;
    for (const id of ids) {
      await backend.deleteUser(id);
      removed += 1;
    }
  }
  log?.(`${removed} compte(s) de démonstration supprimé(s).`);
  return removed;
}

export async function purgeDemo(config: SeedConfig): Promise<number> {
  const backend = supabaseBackend(config);
  try {
    return await purgeDemoWith(backend, config.log);
  } finally {
    await backend.close();
  }
}

export async function seedDemo(config: SeedConfig): Promise<{ accounts: { name: string; email: string }[] }> {
  const backend = supabaseBackend(config);
  try {
    return await seedDemoWith(backend, config);
  } finally {
    await backend.close();
  }
}

export async function seedDemoWith(
  backend: SeedBackend,
  options: SeedOptions,
): Promise<{ accounts: { name: string; email: string }[] }> {
  const log = options.log ?? (() => undefined);
  if (options.password.length < 10) {
    throw new SeedError("DEMO_PASSWORD doit contenir au moins 10 caractères.");
  }
  await purgeDemoWith(backend, options.log);

  let skills: { slug: string; id: string }[];
  try {
    skills = await backend.rpc<{ slug: string; id: string }[]>(null, "list_skills", {});
  } catch (error) {
    throw new SeedError(
      `La base n'est pas prête (${seedErrorMessage(error)}). Applique d'abord le script supabase/devbridge.sql.`,
    );
  }
  const skillIds = new Map<string, string>(skills.map((skill) => [skill.slug, skill.id]));
  const ids = (...slugs: string[]) =>
    slugs.map((slug) => {
      const id = skillIds.get(slug);
      if (!id) throw new SeedError(`Compétence absente du catalogue : ${slug}`);
      return id;
    });

  // ── Comptes ──────────────────────────────────────────────────────────
  log("Création des comptes de démonstration…");
  const userIds = new Map<string, string>();
  for (const persona of PERSONAS) {
    const id = await backend.createUser({
      email: demoEmail(persona.key, options.emailDomain),
      password: options.password,
      firstName: persona.first,
      lastName: persona.last,
      country: persona.country,
      timezone: persona.timezone,
    });
    userIds.set(persona.key, id);
  }

  const uid = (who: string) => userIds.get(who)!;
  const call = async <T>(who: string, fn: string, args: Record<string, unknown> = {}): Promise<T> => {
    try {
      return await backend.rpc<T>(uid(who), fn, args);
    } catch (error) {
      throw new SeedError(`${fn} (${who}) : ${seedErrorMessage(error)}`);
    }
  };
  const age = (days: number) => backend.rpc<null>(null, "demo_age", { p_days: days });

  // ── Profils et compétences ───────────────────────────────────────────
  log("Profils et compétences…");
  for (const persona of PERSONAS) {
    await call(persona.key, "update_my_profile", {
      p_patch: {
        city: persona.city,
        headline: persona.headline,
        bio: persona.bio,
        experience_level: persona.experience,
        main_domain: persona.domain,
        languages: persona.languages,
        availability: persona.availability,
        collaboration_modes: persona.modes,
        onboarding_step: 8,
        onboarding_completed: true,
      },
    });
    await call(persona.key, "set_my_skills", {
      p_type: "offered",
      p_items: persona.offered.map(([slug, level]) => ({ skill_id: ids(slug)[0], level })),
    });
    await call(persona.key, "set_my_skills", {
      p_type: "wanted",
      p_items: persona.wanted.map((slug) => ({ skill_id: ids(slug)[0] })),
    });
  }

  const offer = (overrides: Record<string, unknown>) => ({
    p_id: null,
    p_collaboration_type: "remote",
    p_estimated_duration: "few_days",
    p_desired_level: "any",
    p_availability: ["weekday_evening", "weekend"],
    p_language: "fr",
    p_country: null,
    p_links: [],
    p_conditions: null,
    p_proposed: [],
    p_requested: [],
    p_related: [],
    p_urgent: false,
    ...overrides,
  });
  const task = (collaboration: string, title: string, description: string, assignee: string, priority = "medium") => ({
    p_collaboration_id: collaboration,
    p_title: title,
    p_description: description,
    p_assigned_to: uid(assignee),
    p_priority: priority,
    p_due_date: null,
    p_links: [],
    p_attachment_path: null,
  });
  const deliver = (who: string, taskId: string, description: string, url: string | null = null) =>
    call<string>(who, "submit_deliverable", {
      p_task_id: taskId,
      p_description: description,
      p_external_url: url,
      p_attachment_path: null,
    });
  const conversationOf = async (who: string, other: string): Promise<string> => {
    const list = await call<{ id: string; other: { id: string } }[]>(who, "list_my_conversations");
    const found = list.find((item) => item.other.id === uid(other));
    if (!found) throw new SeedError(`Conversation introuvable entre ${who} et ${other}.`);
    return found.id;
  };
  const say = (who: string, conversation: string, content: string) =>
    call(who, "send_message", { p_conversation_id: conversation, p_content: content });

  // ── 1. Un échange terminé : Wanjiru ⇄ Youssef ────────────────────────
  log("Échange terminé (Wanjiru ⇄ Youssef)…");
  const offerWanjiru = await call<string>("wanjiru", "save_offer", offer({
    p_title: "API Django contre déploiement Docker",
    p_description:
      "Je peux t'aider à structurer une API Django propre (modèles, authentification, tests). En échange, je cherche quelqu'un pour m'apprendre à conteneuriser et déployer mon projet avec Docker.",
    p_exchange_type: "reciprocal",
    p_language: "en",
    p_proposed: ids("developpement-back-end", "django"),
    p_requested: ids("docker", "deploiement-cloud"),
    p_related: ids("postgresql"),
  }));
  await age(4);
  const proposalYoussef = await call<string>("youssef", "send_proposal", {
    p_receiver_id: uid("wanjiru"),
    p_offer_id: offerWanjiru,
    p_message:
      "Bonjour Wanjiru, je déploie des conteneurs tous les jours et je veux progresser en back-end. Je te propose deux ateliers Docker contre une revue de mon API.",
    p_offered: ids("docker", "deploiement-cloud"),
    p_requested: ids("developpement-back-end", "django"),
  });
  await age(1);
  const accepted1 = await call<{ collaboration_id: string }>("wanjiru", "respond_to_proposal", {
    p_id: proposalYoussef, p_action: "accept", p_note: null,
  });
  const collab1 = accepted1.collaboration_id;
  const chat1 = await conversationOf("wanjiru", "youssef");
  await say("wanjiru", chat1, "Avec plaisir ! On commence par Docker ce week-end ?");
  await say("youssef", chat1, "Parfait. Je prépare un atelier à partir de ton dépôt.");
  const t1 = await call<string>("wanjiru", "create_task", task(collab1, "Atelier Docker : conteneuriser l'API", "Séance de deux heures à partir du dépôt de Wanjiru.", "youssef", "high"));
  const t2 = await call<string>("wanjiru", "create_task", task(collab1, "Dockerfile et docker-compose du projet", "Mettre en pratique l'atelier sur le vrai projet.", "wanjiru"));
  const t3 = await call<string>("youssef", "create_task", task(collab1, "Revue de l'architecture de l'API", "Relire l'API de Youssef et proposer une structure.", "wanjiru"));
  const t4 = await call<string>("youssef", "create_task", task(collab1, "Authentification par jetons refaite", "Appliquer les recommandations de la revue.", "youssef"));
  await age(3);
  const d1 = await deliver("youssef", t1, "Atelier réalisé : image de base, couches, variables d'environnement. Notes et exemples dans le dépôt.");
  const d2 = await deliver("wanjiru", t2, "Dockerfile et docker-compose écrits pour l'API et PostgreSQL.");
  await age(2);
  await call("wanjiru", "review_deliverable", { p_id: d1, p_decision: "approve", p_note: "Très clair, merci." });
  await call("youssef", "review_deliverable", { p_id: d2, p_decision: "request_changes", p_note: "L'image finale embarque encore les outils de compilation : passe en construction multi-étapes." });
  const d2b = await deliver("wanjiru", t2, "Construction multi-étapes ajoutée : l'image passe de 1,1 Go à 180 Mo.");
  await call("youssef", "review_deliverable", { p_id: d2b, p_decision: "approve", p_note: "Exactement ça." });
  await age(3);
  const d3 = await deliver("wanjiru", t3, "Revue terminée : découpage en applications, sérialiseurs et permissions. Compte rendu partagé.");
  const d4 = await deliver("youssef", t4, "Authentification par jetons réécrite, avec tests.");
  await age(1);
  await call("youssef", "review_deliverable", { p_id: d3, p_decision: "approve", p_note: null });
  await call("wanjiru", "review_deliverable", { p_id: d4, p_decision: "approve", p_note: "Les tests passent, bravo." });
  await call("wanjiru", "confirm_completion", { p_collaboration_id: collab1 });
  await call("youssef", "confirm_completion", { p_collaboration_id: collab1 });
  await call("wanjiru", "submit_review", {
    p_collaboration_id: collab1, p_communication: 5, p_reliability: 5, p_quality: 5, p_collaboration: 5,
    p_comment: "Youssef explique Docker avec des exemples concrets. Mon déploiement prend maintenant cinq minutes.",
  });
  await call("youssef", "submit_review", {
    p_collaboration_id: collab1, p_communication: 5, p_reliability: 4, p_quality: 5, p_collaboration: 5,
    p_comment: "Une revue d'API exigeante et bienveillante. J'ai enfin compris les permissions.",
  });
  await age(12);

  // ── 2. Un échange en cours : Kwame ⇄ Chisom ──────────────────────────
  log("Échange en cours (Kwame ⇄ Chisom)…");
  const offerKwame = await call<string>("kwame", "save_offer", offer({
    p_title: "React contre UI/UX : rendons mon tableau de bord agréable",
    p_description:
      "Mon tableau de bord fonctionne mais il est difficile à lire. Je cherche un regard de designer, et je t'accompagne en retour sur React et TypeScript.",
    p_exchange_type: "reciprocal",
    p_language: "en",
    p_proposed: ids("react", "typescript"),
    p_requested: ids("ui-ux-design", "figma"),
  }));
  await age(2);
  const proposalChisom = await call<string>("chisom", "send_proposal", {
    p_receiver_id: uid("kwame"),
    p_offer_id: offerKwame,
    p_message:
      "Bonjour Kwame, je peux reprendre la hiérarchie visuelle de ton tableau de bord. En retour, j'aimerais construire mes premiers composants React avec toi.",
    p_offered: ids("ui-ux-design", "figma"),
    p_requested: ids("react"),
  });
  await call("kwame", "respond_to_proposal", {
    p_id: proposalChisom, p_action: "request_changes",
    p_note: "Très intéressé. Peux-tu ajouter une séance sur TypeScript à ta demande ? Je préfère t'apprendre React avec.",
  });
  await call("chisom", "update_proposal", {
    p_id: proposalChisom,
    p_message:
      "Bonjour Kwame, je reprends la hiérarchie visuelle de ton tableau de bord. En retour, je veux construire mes premiers composants React, en TypeScript comme tu le proposes.",
    p_offered: ids("ui-ux-design", "figma"),
    p_requested: ids("react", "typescript"),
  });
  await age(1);
  const accepted2 = await call<{ collaboration_id: string }>("kwame", "respond_to_proposal", {
    p_id: proposalChisom, p_action: "accept", p_note: null,
  });
  const collab2 = accepted2.collaboration_id;
  const chat2 = await conversationOf("kwame", "chisom");
  await say("kwame", chat2, "C'est parti ! Je t'envoie l'accès au dépôt.");
  const k1 = await call<string>("chisom", "create_task", task(collab2, "Maquette de l'écran d'accueil", "Nouvelle hiérarchie, typographie et espacements.", "chisom", "high"));
  const k2 = await call<string>("chisom", "create_task", task(collab2, "Composants React du tableau de bord", "Carte de statistique et tableau, en TypeScript.", "kwame"));
  const k3 = await call<string>("kwame", "create_task", task(collab2, "Séance : bases des design systems", "Couleurs, échelles d'espacement, composants.", "chisom"));
  await call<string>("kwame", "create_task", task(collab2, "Intégrer les maquettes en React", "Appliquer la maquette validée à l'écran d'accueil.", "kwame", "low"));
  await age(3);
  const dk1 = await deliver("chisom", k1, "Maquette de l'écran d'accueil terminée, avec variantes mobile et ordinateur.");
  await call("kwame", "review_deliverable", { p_id: dk1, p_decision: "approve", p_note: "On respire enfin, merci !" });
  await call("chisom", "set_task_status", { p_id: k3, p_status: "in_progress" });
  await age(2);
  await deliver("kwame", k2, "Deux composants prêts : carte de statistique et tableau triable.");
  await say("kwame", chat2, "Les composants sont prêts pour ta relecture.");

  // ── 3. Annonces, proposition en attente, demande express ─────────────
  log("Annonces et demandes récentes…");
  await call("amina", "save_offer", offer({
    p_title: "Deux séances pour débuter en Machine Learning",
    p_description:
      "Je propose deux séances pour comprendre les bases : préparer des données, entraîner un premier modèle et lire ses résultats. Idéal si tu sais déjà un peu programmer.",
    p_exchange_type: "mentoring",
    p_estimated_duration: "few_hours",
    p_desired_level: "beginner",
    p_proposed: ids("machine-learning", "python"),
    p_related: ids("pandas", "scikit-learn"),
  }));
  await call("chisom", "save_offer", offer({
    p_title: "Audit UX express de ton application",
    p_description:
      "Envoie-moi trois écrans : je te rends une liste de corrections classées par impact, avec des exemples. Une heure de travail, à distance.",
    p_exchange_type: "one_off",
    p_estimated_duration: "under_hour",
    p_language: "en",
    p_proposed: ids("ui-ux-design"),
    p_related: ids("figma"),
  }));
  await call("youssef", "save_offer", offer({
    p_title: "Je configure ton pipeline CI/CD avec toi",
    p_description:
      "Tests et déploiement automatiques à chaque envoi de code, avec GitHub Actions. On le met en place ensemble sur ton dépôt pour que tu saches le maintenir.",
    p_exchange_type: "one_off",
    p_estimated_duration: "few_hours",
    p_proposed: ids("ci-cd", "docker"),
    p_related: ids("github-actions"),
  }));
  await call("aicha", "save_offer", offer({
    p_title: "Paiement mobile contre React Native",
    p_description:
      "J'ai intégré le paiement mobile dans une dizaine de boutiques. Je t'explique les pièges (rappels, rapprochement, tests) et je cherche en retour quelqu'un pour débuter en React Native.",
    p_exchange_type: "reciprocal",
    p_availability: ["weekday_morning", "weekend"],
    p_proposed: ids("paiement-mobile", "laravel"),
    p_requested: ids("react-native"),
  }));
  await call("salma", "save_offer", offer({
    p_title: "Revue de sécurité de ton API",
    p_description:
      "Je passe ton API en revue : authentification, droits d'accès, injections, secrets. Tu repars avec une liste de corrections expliquées.",
    p_exchange_type: "one_off",
    p_estimated_duration: "few_hours",
    p_proposed: ids("securite-applications", "cybersecurite"),
  }));
  const offerThabo = await call<string>("thabo", "save_offer", offer({
    p_title: "React Native contre cybersécurité",
    p_description:
      "Je t'aide à démarrer ou à débloquer une application React Native. En échange, je veux apprendre à sécuriser une application mobile de bout en bout.",
    p_exchange_type: "reciprocal",
    p_language: "en",
    p_proposed: ids("react-native", "tests-automatises"),
    p_requested: ids("cybersecurite", "securite-applications"),
  }));
  await age(2);
  await call("salma", "send_proposal", {
    p_receiver_id: uid("thabo"),
    p_offer_id: offerThabo,
    p_message:
      "Bonjour Thabo, je suis consultante en sécurité et je veux apprendre React Native. Je te propose un audit commenté de ton application contre un accompagnement sur mon premier écran.",
    p_offered: ids("cybersecurite", "securite-applications"),
    p_requested: ids("react-native"),
  });
  await call("mariam", "save_offer", offer({
    p_title: "Bloquée : mon API FastAPI ne démarre plus après déploiement",
    p_description:
      "Tout fonctionne sur ma machine, mais le service s'arrête au démarrage chez l'hébergeur. J'ai besoin d'un regard extérieur pour lire les journaux et trouver la cause.",
    p_exchange_type: "one_off",
    p_estimated_duration: "under_hour",
    p_requested: ids("deploiement-cloud"),
    p_related: ids("fastapi", "docker"),
    p_urgent: true,
  }));

  await backend.rpc<null>(null, "demo_mark_all_read", {});
  log("Données de démonstration prêtes.");

  return {
    accounts: PERSONAS.map((persona) => ({
      name: `${persona.first} ${persona.last}`,
      email: demoEmail(persona.key, options.emailDomain),
    })),
  };
}

/** Exécution réelle : comptes créés par l'API d'administration, actions faites au nom de chaque profil. */
export function supabaseBackend(config: SeedConfig): SeedBackend {
  const admin = adminClient(config);
  const sessions = new Map<string, SupabaseClient>();
  const emails = new Map<string, string>();

  const clientFor = async (userId: string): Promise<SupabaseClient> => {
    const existing = sessions.get(userId);
    if (existing) return existing;
    const email = emails.get(userId);
    if (!email) throw new SeedError("Compte de démonstration inconnu.");
    const client = createClient(config.url, config.publicKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await client.auth.signInWithPassword({ email, password: config.password });
    if (error) throw new SeedError(`Connexion de ${email} impossible : ${error.message}`);
    sessions.set(userId, client);
    return client;
  };

  return {
    async listDemoUserIds() {
      const ids: string[] = [];
      for (let page = 1; page <= 50; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw new SeedError(`Lecture des comptes impossible : ${error.message}`);
        for (const user of data.users) {
          if (user.app_metadata?.is_demo === true) ids.push(user.id);
        }
        if (data.users.length < 200) break;
      }
      return ids;
    },
    async deleteUser(id) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw new SeedError(`Suppression d'un compte de démonstration impossible : ${error.message}`);
    },
    async createUser(input) {
      const { data, error } = await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          first_name: input.firstName,
          last_name: input.lastName,
          country: input.country,
          timezone: input.timezone,
        },
        app_metadata: { is_demo: true },
      });
      if (error || !data.user) {
        throw new SeedError(
          `Création de ${input.email} impossible : ${error?.message ?? "réponse vide"}. ` +
            "Si l'adresse est refusée, change DEMO_EMAIL_DOMAIN.",
        );
      }
      emails.set(data.user.id, input.email);
      return data.user.id;
    },
    async rpc<T>(userId: string | null, fn: string, args: Record<string, unknown>) {
      const client = userId ? await clientFor(userId) : admin;
      const { data, error } = await client.rpc(fn, args);
      if (error) throw new SeedError(error.message);
      return data as T;
    },
    async close() {
      await Promise.all([...sessions.values()].map((client) => client.auth.signOut()));
      sessions.clear();
    },
  };
}

function adminClient(config: SeedConfig): SupabaseClient {
  return createClient(config.url, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function seedErrorMessage(error: unknown): string {
  if (error instanceof SeedError) return error.message;
  return error instanceof Error ? error.message : "Erreur inconnue.";
}
