import { z } from "zod";
import { COUNTRY_CODES, LANGUAGE_CODES } from "./data/countries";

/**
 * Schémas de validation partagés par les formulaires (navigateur) et les
 * actions serveur. La base revérifie ensuite tout par ses propres contraintes.
 */

const uuid = z.uuid("Identifiant invalide.");
const uuidList = (max: number) => z.array(uuid).max(max, "Trop d'éléments sélectionnés.");

const httpUrl = z
  .string()
  .trim()
  .max(300, "Lien trop long.")
  .regex(/^https?:\/\/\S+$/i, "Le lien doit commencer par https://");

const optionalUrl = z.union([z.literal(""), httpUrl]);

const optionalText = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`);

export const AVAILABILITY_VALUES = ["weekday_morning", "weekday_afternoon", "weekday_evening", "weekend"] as const;
export const MODE_VALUES = ["remote", "onsite", "hybrid"] as const;
export const EXCHANGE_VALUES = ["reciprocal", "one_off", "mentoring"] as const;
export const DURATION_VALUES = ["under_hour", "few_hours", "few_days", "several_weeks"] as const;
export const LEVEL_VALUES = ["beginner", "intermediate", "advanced", "expert"] as const;
export const EXPERIENCE_VALUES = ["student", "junior", "intermediate", "senior"] as const;
export const DOMAIN_VALUES = [
  "frontend", "backend", "fullstack", "mobile", "data_ai", "devops_cloud", "design", "security", "embedded", "other",
] as const;
export const REPORT_REASON_VALUES = ["spam", "inappropriate", "harassment", "fake_exchange", "dispute", "other"] as const;

const country = z.string().refine((value) => COUNTRY_CODES.includes(value), "Choisis un pays dans la liste.");
const language = z.string().refine((value) => LANGUAGE_CODES.includes(value), "Langue inconnue.");

const password = z
  .string()
  .min(8, "8 caractères minimum.")
  .max(72, "72 caractères maximum.")
  .regex(/[A-Za-z]/, "Ajoute au moins une lettre.")
  .regex(/[0-9]/, "Ajoute au moins un chiffre.");

// ── Authentification ─────────────────────────────────────────────────────
export const signUpSchema = z
  .object({
    firstName: z.string().trim().min(2, "Indique ton prénom.").max(60),
    lastName: z.string().trim().min(2, "Indique ton nom.").max(60),
    email: z.email("Adresse e-mail invalide.").max(254),
    password,
    confirmPassword: z.string(),
    country,
    terms: z.literal(true, "Tu dois accepter les conditions pour créer un compte."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les deux mots de passe ne correspondent pas.",
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(1, "Indique ton mot de passe."),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({ email: z.email("Adresse e-mail invalide.") });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const newPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les deux mots de passe ne correspondent pas.",
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

// ── Profil ───────────────────────────────────────────────────────────────
export const profileSchema = z
  .object({
    first_name: z.string().trim().min(2, "Indique ton prénom.").max(60),
    last_name: z.string().trim().min(2, "Indique ton nom.").max(60),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,30}$/, "3 à 30 caractères : lettres, chiffres ou tiret bas."),
    avatar_url: z.union([z.literal(""), z.string().max(500)]).nullable(),
    country,
    city: optionalText(80),
    timezone: z.string().min(1).max(64),
    headline: optionalText(120),
    bio: optionalText(1200),
    experience_level: z.union([z.literal(""), z.enum(EXPERIENCE_VALUES)]),
    main_domain: z.union([z.literal(""), z.enum(DOMAIN_VALUES)]),
    languages: z.array(language).max(10),
    availability: z.array(z.enum(AVAILABILITY_VALUES)),
    collaboration_modes: z.array(z.enum(MODE_VALUES)).min(1, "Choisis au moins un mode de collaboration."),
    github_url: optionalUrl,
    portfolio_url: optionalUrl,
    linkedin_url: optionalUrl,
    website_url: optionalUrl,
    onboarding_step: z.number().int().min(0).max(8),
    onboarding_completed: z.boolean(),
  })
  .partial();
export type ProfileInput = z.infer<typeof profileSchema>;

export const skillsSchema = z.object({
  type: z.enum(["offered", "wanted"]),
  kind: z.enum(["competence", "technology"]).nullable().optional(),
  items: z
    .array(z.object({ skill_id: uuid, level: z.enum(LEVEL_VALUES).nullable().optional() }))
    .max(30, "30 compétences maximum."),
});
export type SkillsInput = z.infer<typeof skillsSchema>;

// ── Annonces ─────────────────────────────────────────────────────────────
export const offerSchema = z
  .object({
    id: uuid.nullable().optional(),
    title: z.string().trim().min(8, "8 caractères minimum.").max(120, "120 caractères maximum."),
    description: z
      .string()
      .trim()
      .min(30, "Décris ton annonce en 30 caractères au moins.")
      .max(4000, "4000 caractères maximum."),
    exchange_type: z.enum(EXCHANGE_VALUES),
    collaboration_type: z.enum(MODE_VALUES),
    estimated_duration: z.enum(DURATION_VALUES),
    desired_level: z.enum(["any", ...LEVEL_VALUES]),
    availability: z.array(z.enum(AVAILABILITY_VALUES)),
    language,
    country: z.union([z.literal(""), country]),
    links: z.array(httpUrl).max(5, "5 liens maximum."),
    conditions: optionalText(1000),
    proposed: uuidList(6),
    requested: uuidList(6),
    related: uuidList(8),
    urgent: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.proposed.length === 0 && data.requested.length === 0) {
      ctx.addIssue({ code: "custom", path: ["proposed"], message: "Indique au moins une compétence proposée ou recherchée." });
    }
    if (data.exchange_type === "reciprocal") {
      if (data.proposed.length === 0) {
        ctx.addIssue({ code: "custom", path: ["proposed"], message: "Un échange réciproque demande une compétence proposée." });
      }
      if (data.requested.length === 0) {
        ctx.addIssue({ code: "custom", path: ["requested"], message: "Un échange réciproque demande une compétence recherchée." });
      }
    }
    if (data.urgent && (data.exchange_type !== "one_off" || data.requested.length === 0)) {
      ctx.addIssue({ code: "custom", path: ["requested"], message: "Une demande express précise la compétence dont tu as besoin." });
    }
  });
export type OfferInput = z.infer<typeof offerSchema>;

// ── Propositions ─────────────────────────────────────────────────────────
export const proposalSchema = z
  .object({
    id: uuid.nullable().optional(),
    receiverId: uuid,
    offerId: uuid.nullable(),
    message: z
      .string()
      .trim()
      .min(20, "Présente-toi en 20 caractères au moins.")
      .max(2000, "2000 caractères maximum."),
    offered: uuidList(8),
    requested: uuidList(8),
  })
  .refine((data) => data.offered.length + data.requested.length > 0, {
    path: ["offered"],
    message: "Choisis au moins une compétence à apporter ou à recevoir.",
  });
export type ProposalInput = z.infer<typeof proposalSchema>;

export const respondSchema = z.object({
  id: uuid,
  action: z.enum(["accept", "decline", "request_changes"]),
  note: optionalText(1000),
});

// ── Collaborations ───────────────────────────────────────────────────────
export const collaborationSchema = z.object({
  id: uuid,
  title: z.string().trim().min(3, "3 caractères minimum.").max(140),
  description: optionalText(4000),
  objectives: optionalText(2000),
});
export type CollaborationInput = z.infer<typeof collaborationSchema>;

export const taskSchema = z.object({
  id: uuid.nullable().optional(),
  collaborationId: uuid,
  title: z.string().trim().min(3, "3 caractères minimum.").max(140, "140 caractères maximum."),
  description: optionalText(3000),
  assignedTo: uuid,
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")]),
  links: z.array(httpUrl).max(5, "5 liens maximum."),
  attachmentPath: z.string().max(400).nullable(),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const deliverableSchema = z.object({
  taskId: uuid,
  description: z
    .string()
    .trim()
    .min(10, "Décris le résultat en 10 caractères au moins.")
    .max(3000, "3000 caractères maximum."),
  externalUrl: optionalUrl,
  attachmentPath: z.string().max(400).nullable(),
});
export type DeliverableInput = z.infer<typeof deliverableSchema>;

export const reviewDeliverableSchema = z
  .object({
    id: uuid,
    decision: z.enum(["approve", "request_changes"]),
    note: optionalText(1000),
  })
  .refine((data) => data.decision === "approve" || data.note.length >= 10, {
    path: ["note"],
    message: "Explique la correction attendue en 10 caractères au moins.",
  });

const rating = z.number().int().min(1, "Donne une note.").max(5);

export const reviewSchema = z.object({
  collaborationId: uuid,
  communication: rating,
  reliability: rating,
  quality: rating,
  collaboration: rating,
  comment: optionalText(1000),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const reportSchema = z.object({
  reportedUserId: uuid.nullable(),
  offerId: uuid.nullable(),
  collaborationId: uuid.nullable(),
  reason: z.enum(REPORT_REASON_VALUES),
  description: z
    .string()
    .trim()
    .min(10, "Décris le problème en 10 caractères au moins.")
    .max(2000, "2000 caractères maximum."),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const messageSchema = z.object({
  conversationId: uuid,
  content: z.string().trim().min(1, "Écris un message.").max(4000, "4000 caractères maximum."),
});

/** Premier message d'erreur par champ, pour l'affichage sous les champs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] ??= issue.message;
  }
  return fields;
}
