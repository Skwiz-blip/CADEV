/**
 * Tous les libellés des valeurs stockées en base, regroupés ici.
 * Pour une future version anglaise : dupliquer ce fichier par langue.
 */
import type {
  AvailabilitySlot,
  ChecklistKey,
  CollaborationMode,
  CollaborationStatus,
  DeliverableStatus,
  Duration,
  ExchangeType,
  OfferStatus,
  ProposalStatus,
  ReportStatus,
  SkillLevel,
  TaskPriority,
  TaskStatus,
} from "./types";

export const EXCHANGE_TYPES: Record<ExchangeType, { label: string; short: string; hint: string }> = {
  reciprocal: {
    label: "Échange réciproque",
    short: "Réciproque",
    hint: "Chacun apporte une compétence et en reçoit une.",
  },
  one_off: {
    label: "Aide ponctuelle",
    short: "Aide ponctuelle",
    hint: "Un coup de main sur une tâche précise.",
  },
  mentoring: {
    label: "Mentorat",
    short: "Mentorat",
    hint: "Un accompagnement pour apprendre une technologie ou un sujet.",
  },
};

export const COLLABORATION_MODES: Record<CollaborationMode, string> = {
  remote: "À distance",
  onsite: "En présentiel",
  hybrid: "Hybride",
};

export const DURATIONS: Record<Duration, string> = {
  under_hour: "Moins d'une heure",
  few_hours: "Quelques heures",
  few_days: "Quelques jours",
  several_weeks: "Plusieurs semaines",
};

export const LEVELS: Record<SkillLevel, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

export const DESIRED_LEVELS: Record<SkillLevel | "any", string> = {
  any: "Tous niveaux",
  ...LEVELS,
};

export const AVAILABILITY: Record<AvailabilitySlot, { label: string; hours: string }> = {
  weekday_morning: { label: "Matin en semaine", hours: "6 h – 12 h" },
  weekday_afternoon: { label: "Après-midi en semaine", hours: "12 h – 18 h" },
  weekday_evening: { label: "Soir en semaine", hours: "18 h – 23 h" },
  weekend: { label: "Week-end", hours: "8 h – 20 h" },
};

export const EXPERIENCE_LEVELS: Record<string, string> = {
  student: "En formation",
  junior: "Junior · moins de 2 ans",
  intermediate: "Confirmé · 2 à 5 ans",
  senior: "Senior · plus de 5 ans",
};

export const DOMAINS: Record<string, string> = {
  frontend: "Front-End",
  backend: "Back-End",
  fullstack: "Full-Stack",
  mobile: "Mobile",
  data_ai: "Données et IA",
  devops_cloud: "DevOps et Cloud",
  design: "Design UI/UX",
  security: "Cybersécurité",
  embedded: "Embarqué et IoT",
  other: "Autre",
};

export const SKILL_CATEGORIES: Record<string, string> = {
  languages: "Langages",
  frontend: "Front-End",
  backend: "Back-End",
  mobile: "Mobile",
  data_ai: "Données et IA",
  devops_cloud: "DevOps et Cloud",
  databases: "Bases de données",
  design: "Design",
  security: "Sécurité",
  practices: "Méthodes et outils",
};

export const OFFER_STATUS: Record<OfferStatus, string> = {
  open: "En ligne",
  paused: "En pause",
  closed: "Clôturée",
  removed: "Retirée par la modération",
  deleted: "Supprimée",
};

export const PROPOSAL_STATUS: Record<ProposalStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  declined: "Refusée",
  changes_requested: "Modification demandée",
  cancelled: "Annulée",
};

export const COLLABORATION_STATUS: Record<CollaborationStatus, string> = {
  active: "En cours",
  completed: "Terminée",
  cancelled: "Interrompue",
};

export const TASK_STATUS: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  in_review: "En révision",
  done: "Terminée",
};

export const TASK_PRIORITY: Record<TaskPriority, string> = {
  low: "Basse",
  medium: "Normale",
  high: "Haute",
};

export const DELIVERABLE_STATUS: Record<DeliverableStatus, string> = {
  pending: "En attente de validation",
  approved: "Validé",
  changes_requested: "Correction demandée",
};

export const REPORT_REASONS: Record<string, string> = {
  spam: "Spam ou publicité",
  inappropriate: "Contenu inapproprié",
  harassment: "Harcèlement ou manque de respect",
  fake_exchange: "Faux échange ou fausse évaluation",
  dispute: "Désaccord sur une collaboration",
  other: "Autre",
};

export const REPORT_STATUS: Record<ReportStatus, string> = {
  open: "Nouveau",
  in_review: "En cours d'examen",
  resolved: "Traité",
  dismissed: "Classé",
};

export const CHECKLIST: Record<ChecklistKey, { label: string; href: string; points: number }> = {
  name: { label: "Indiquer ton prénom et ton nom", href: "/profil/modifier", points: 10 },
  country: { label: "Choisir ton pays", href: "/profil/modifier", points: 10 },
  bio: { label: "Écrire une courte présentation", href: "/profil/modifier#presentation", points: 15 },
  avatar: { label: "Ajouter une photo", href: "/profil/modifier", points: 10 },
  experience: { label: "Préciser ton expérience et ton domaine", href: "/profil/modifier#presentation", points: 10 },
  languages: { label: "Indiquer tes langues de travail", href: "/profil/modifier#presentation", points: 10 },
  availability: { label: "Renseigner tes disponibilités", href: "/profil/modifier#disponibilites", points: 10 },
  offered_skills: { label: "Ajouter ce que tu sais faire", href: "/competences", points: 15 },
  wanted_skills: { label: "Ajouter ce que tu recherches", href: "/competences", points: 10 },
};

export const ADMIN_ACTIONS: Record<string, string> = {
  user_suspended: "Compte suspendu",
  user_reactivated: "Compte réactivé",
  offer_removed: "Annonce retirée",
  offer_restored: "Annonce remise en ligne",
  report_in_review: "Signalement pris en charge",
  report_resolved: "Signalement traité",
  report_dismissed: "Signalement classé",
  admin_granted: "Rôle administrateur accordé",
  admin_revoked: "Rôle administrateur retiré",
  demo_reset: "Données de démonstration réinitialisées",
  demo_purged: "Données de démonstration supprimées",
};

/** Phrase d'activité à partir d'un événement enregistré. */
export function describeActivity(event: string, meta: Record<string, string | undefined>): string {
  const title = meta.title ? `« ${meta.title} »` : "";
  switch (event) {
    case "offer_published":
      return `Annonce publiée ${title}`;
    case "proposal_sent":
      return `Proposition envoyée${meta.to ? ` à ${meta.to}` : ""}`;
    case "collaboration_started":
      return `Échange démarré${meta.with ? ` avec ${meta.with}` : ""} ${title}`;
    case "task_created":
      return `Tâche créée ${title}`;
    case "deliverable_submitted":
      return `Livrable soumis ${title}`;
    case "task_validated":
      return `Livrable validé ${title}`;
    case "deliverable_reviewed":
      return meta.decision === "approved" ? `Livrable examiné et validé ${title}` : `Correction demandée ${title}`;
    case "collaboration_completed":
      return `Échange terminé${meta.with ? ` avec ${meta.with}` : ""} ${title}`;
    case "review_given":
      return `Évaluation donnée ${title}`;
    case "loop_proposed":
      return "Boucle d'échange à trois proposée";
    default:
      return "Activité enregistrée";
  }
}
