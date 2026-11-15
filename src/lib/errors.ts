/** Traduit les codes d'erreur de la base en messages utiles pour la personne. */

const MESSAGES: Record<string, string> = {
  not_authenticated: "Ta session a expiré. Reconnecte-toi pour continuer.",
  profile_missing: "Ton profil est introuvable. Reconnecte-toi, puis réessaie.",
  account_suspended: "Ton compte est suspendu : cette action n'est pas disponible.",
  forbidden: "Tu n'as pas les droits nécessaires pour cette action.",
  invalid_input: "Certaines informations ne sont pas valides. Vérifie le formulaire.",
  rate_limited: "Tu vas un peu vite. Réessaie dans quelques instants.",
  too_many_skills: "Trop de compétences sélectionnées.",
  username_taken: "Ce nom d'utilisateur est déjà pris.",
  invalid_link: "Un des liens n'est pas valide. Il doit commencer par https://",
  invalid_attachment: "La pièce jointe n'est pas valide.",
  note_required: "Ajoute une explication d'au moins quelques mots.",
  offer_needs_skills: "Indique au moins une compétence proposée ou recherchée.",
  offer_needs_both_skills: "Un échange réciproque demande une compétence proposée et une compétence recherchée.",
  offer_not_found: "Cette annonce n'existe plus ou ne t'appartient pas.",
  offer_not_open: "Cette annonce n'accepte plus de propositions.",
  urgent_needs_request: "Une demande express doit être une aide ponctuelle avec la compétence dont tu as besoin.",
  cannot_propose_to_self: "Tu ne peux pas te proposer un échange à toi-même.",
  receiver_unavailable: "Cette personne n'est pas disponible pour le moment.",
  proposal_needs_skills: "Choisis au moins une compétence à apporter ou à recevoir.",
  proposal_needs_both_skills: "Pour un échange réciproque, choisis ce que tu apportes et ce que tu attends.",
  proposal_already_exists: "Tu as déjà une proposition en cours avec cette personne.",
  proposal_not_found: "Cette proposition est introuvable.",
  proposal_not_pending: "Cette proposition n'est plus en attente.",
  proposal_not_editable: "Cette proposition ne peut plus être modifiée.",
  collaboration_not_found: "Cet échange est introuvable.",
  collaboration_not_active: "Cet échange n'est plus en cours.",
  collaboration_not_completed: "L'échange doit être terminé avant d'être évalué.",
  assignee_not_member: "La personne responsable doit participer à l'échange.",
  task_not_found: "Cette tâche est introuvable.",
  task_locked: "Cette tâche est en révision ou terminée : elle ne peut plus être modifiée.",
  task_has_history: "Cette tâche a déjà des livrables : elle ne peut pas être supprimée.",
  not_task_assignee: "Seule la personne responsable de la tâche peut soumettre un livrable.",
  deliverable_not_found: "Ce livrable est introuvable.",
  cannot_review_own_deliverable: "Tu ne peux pas valider ton propre livrable.",
  deliverable_already_reviewed: "Ce livrable a déjà été examiné.",
  no_tasks: "Ajoutez au moins une tâche avant de clôturer l'échange.",
  deliverables_not_validated: "Tous les livrables prévus doivent être validés avant de clôturer.",
  plan_needs_empty_board: "Le plan de départ n'est proposé que sur un tableau vide.",
  review_already_exists: "Tu as déjà évalué cet échange.",
  conversation_not_found: "Cette conversation est introuvable.",
  cannot_report_self: "Tu ne peux pas te signaler toi-même.",
  cannot_moderate_admin: "Un compte administrateur ne peut pas être suspendu ici.",
  user_not_found: "Compte introuvable.",
  report_not_found: "Signalement introuvable.",
  demo_account_locked: "Un compte de démonstration ne peut pas être supprimé d'ici.",
  loop_not_valid: "Cette boucle n'est plus possible : les compétences ont changé.",
  loop_already_exists: "Une boucle est déjà en cours entre ces trois personnes.",
  loop_not_found: "Cette boucle est introuvable.",
  loop_not_open: "Cette boucle n'attend plus de réponse.",
};

const GENERIC = "Une erreur est survenue. Réessaie dans un instant.";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

type DbError = { message?: string; code?: string; details?: string | null };

export function toAppError(error: DbError): AppError {
  const raw = (error.message ?? "").trim();
  const known = MESSAGES[raw];
  if (known) return new AppError(raw, known);
  if (error.code === "23514" || error.code === "22P02" || error.code === "22001") {
    return new AppError("invalid_input", MESSAGES.invalid_input!);
  }
  if (error.code === "23505") {
    return new AppError("duplicate", "Cet élément existe déjà.");
  }
  if (error.code === "42501" || error.code === "PGRST301") {
    return new AppError("forbidden", MESSAGES.forbidden!);
  }
  if (/fetch failed|network|ECONN|ETIMEDOUT/i.test(raw)) {
    return new AppError("network", "Le service ne répond pas. Vérifie ta connexion et réessaie.");
  }
  return new AppError("unknown", GENERIC);
}

export function errorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return GENERIC;
}

/** Messages des erreurs d'authentification Supabase. */
export function authErrorMessage(error: { message?: string; code?: string; status?: number }): string {
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
    return "Ton adresse e-mail n'est pas encore confirmée. Ouvre le lien reçu par e-mail.";
  }
  if (code === "user_already_exists" || code === "email_exists" || /already registered/i.test(message)) {
    return "Un compte existe déjà avec cette adresse e-mail.";
  }
  if (code === "weak_password" || /password/i.test(message)) {
    return "Mot de passe trop faible : 8 caractères minimum, avec une lettre et un chiffre.";
  }
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || error.status === 429) {
    return "Trop de tentatives. Patiente une minute avant de réessayer.";
  }
  if (code === "email_address_invalid" || /email.*invalid/i.test(message)) {
    return "Cette adresse e-mail n'est pas acceptée.";
  }
  if (code === "same_password") {
    return "Le nouveau mot de passe doit être différent de l'ancien.";
  }
  if (/fetch failed|network/i.test(message)) {
    return "Le service ne répond pas. Vérifie ta connexion et réessaie.";
  }
  return GENERIC;
}
