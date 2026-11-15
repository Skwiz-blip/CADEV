/** Formes des données renvoyées par les fonctions de la base (voir supabase/migrations). */

export type SkillKind = "competence" | "technology";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type ExchangeType = "reciprocal" | "one_off" | "mentoring";
export type CollaborationMode = "remote" | "onsite" | "hybrid";
export type Duration = "under_hour" | "few_hours" | "few_days" | "several_weeks";
export type AvailabilitySlot = "weekday_morning" | "weekday_afternoon" | "weekday_evening" | "weekend";
export type OfferStatus = "open" | "paused" | "closed" | "removed" | "deleted";
export type ProposalStatus = "pending" | "accepted" | "declined" | "changes_requested" | "cancelled";
export type CollaborationStatus = "active" | "completed" | "cancelled";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type DeliverableStatus = "pending" | "approved" | "changes_requested";
export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";

export type Skill = {
  id: string;
  name: string;
  slug: string;
  kind: SkillKind;
  category: string;
};

export type UserSkill = Skill & { level: SkillLevel | null };

export type ProfileMini = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  country: string | null;
  headline: string | null;
  is_demo: boolean;
  status: "active" | "suspended";
};

export type ProfileCard = ProfileMini & {
  city: string | null;
  timezone: string;
  bio: string | null;
  experience_level: string | null;
  main_domain: string | null;
  languages: string[];
  availability: AvailabilitySlot[];
  collaboration_modes: CollaborationMode[];
  github_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  profile_completion: number;
  created_at: string;
  offered: UserSkill[];
  wanted: UserSkill[];
};

export type Viewer = {
  profile: ProfileCard & { onboarding_step: number; onboarding_completed_at: string | null };
  is_admin: boolean;
  unread_messages: number;
  unread_notifications: number;
  pending_proposals: number;
};

export type OfferCard = {
  id: string;
  title: string;
  description: string;
  exchange_type: ExchangeType;
  collaboration_type: CollaborationMode;
  estimated_duration: Duration;
  desired_level: SkillLevel | "any";
  availability: AvailabilitySlot[];
  language: string;
  country: string | null;
  links: string[];
  conditions: string | null;
  status: OfferStatus;
  is_demo: boolean;
  is_urgent: boolean;
  created_at: string;
  updated_at: string;
  author: ProfileMini;
  proposed: Skill[];
  requested: Skill[];
  related: Skill[];
};

export type OfferDetail = OfferCard & {
  moderation_note: string | null;
  author_card: ProfileCard;
  viewer: { is_owner: boolean; active_proposal_id: string | null; pending_proposals: number | null };
};

export type MyOffer = OfferCard & {
  moderation_note: string | null;
  proposals_total: number;
  proposals_pending: number;
};

export type RecommendedOffer = OfferCard & { match_proposed: Skill[]; match_requested: Skill[] };

export type Paginated<T> = { total: number; items: T[] };

export type MatchBreakdown = {
  skills: number;
  availability: number;
  languages: number;
  mode: number;
  geo: number;
};

export type MatchItem = {
  id: string;
  score: number;
  status: "suggested" | "contacted";
  updated_at: string;
  other: ProfileCard;
  i_give: Skill[];
  they_give: Skill[];
  shared_languages: string[];
  shared_modes: CollaborationMode[];
  weekday_overlap: number;
  weekend_overlap: number;
  overlap_hours: number[];
  same_country: boolean;
  breakdown: MatchBreakdown;
};

export type LoopCandidate = {
  b: ProfileMini;
  c: ProfileMini;
  skills_ab: Skill[];
  skills_bc: Skill[];
  skills_ca: Skill[];
  common_languages: string[];
};

export type LoopLeg = { from: ProfileMini; to: ProfileMini; skills: Skill[]; accepted: boolean };

export type LoopItem = {
  id: string;
  status: "proposed" | "active" | "declined";
  created_at: string;
  created_by: string;
  declined_by: string | null;
  is_demo: boolean;
  legs: [LoopLeg, LoopLeg, LoopLeg];
  my_acceptance: boolean;
};

export type ProposalItem = {
  id: string;
  status: ProposalStatus;
  message: string;
  response_note: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  direction: "sent" | "received";
  sender: ProfileMini;
  receiver: ProfileMini;
  offer: { id: string; title: string; exchange_type: ExchangeType; status: OfferStatus } | null;
  offered: Skill[];
  requested: Skill[];
  collaboration_id: string | null;
  conversation_id: string | null;
};

export type ProposalDetail = ProposalItem & { sender_card: ProfileCard; receiver_card: ProfileCard };

export type CollaborationItem = {
  id: string;
  title: string;
  status: CollaborationStatus;
  exchange_type: ExchangeType;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  last_activity_at: string;
  is_demo: boolean;
  loop_id: string | null;
  partner: ProfileMini;
  tasks_total: number;
  tasks_done: number;
  to_review: number;
  my_confirmation: boolean;
  partner_confirmation: boolean;
  has_reviewed: boolean;
};

export type Deliverable = {
  id: string;
  description: string;
  external_url: string | null;
  attachment_path: string | null;
  validation_status: DeliverableStatus;
  submitted_by: string;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  links: string[];
  attachment_path: string | null;
  created_by: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  deliverables: Deliverable[];
};

export type Review = {
  id: string;
  collaboration_id: string;
  collaboration_title: string;
  reviewer: ProfileMini;
  reviewed_user_id: string;
  communication_rating: number;
  reliability_rating: number;
  quality_rating: number;
  collaboration_rating: number;
  comment: string | null;
  created_at: string;
};

export type CollaborationMember = {
  user: ProfileMini;
  role: "initiator" | "partner";
  completion_confirmed_at: string | null;
  gives: Skill[];
};

export type CollaborationDetail = {
  id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  status: CollaborationStatus;
  exchange_type: ExchangeType;
  start_date: string;
  end_date: string | null;
  created_at: string;
  completed_at: string | null;
  cancel_reason: string | null;
  cancelled_by: string | null;
  is_demo: boolean;
  proposal_id: string;
  loop_id: string | null;
  offer: { id: string; title: string } | null;
  conversation_id: string | null;
  members: CollaborationMember[];
  tasks: Task[];
  reviews: Review[];
  viewer: { id: string; is_member: boolean; has_reviewed: boolean };
};

export type Certificate = {
  id: string;
  title: string;
  exchange_type: ExchangeType;
  start_date: string;
  completed_at: string;
  is_demo: boolean;
  is_loop: boolean;
  tasks_validated: number;
  members: {
    user: ProfileMini;
    gives: Skill[];
    deliverables_validated: number;
    confirmed_at: string | null;
  }[];
};

export type ConversationItem = {
  id: string;
  other: ProfileMini;
  last_message: { content: string; sender_id: string; created_at: string } | null;
  unread: number;
  last_message_at: string;
};

export type ConversationDetail = {
  id: string;
  other: ProfileMini;
  collaborations: { id: string; title: string; status: CollaborationStatus }[];
  proposals: { id: string; status: ProposalStatus; direction: "sent" | "received" }[];
};

export type Message = {
  id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  actor: ProfileMini | null;
};

export type NotificationList = { total: number; unread: number; items: NotificationItem[] };

export type ProfileStats = {
  exchanges_completed: number;
  active_collaborations: number;
  tasks_validated: number;
  contributions_reviewed: number;
  people_helped: number;
  skills_shared: number;
  proposals_answered: number;
  proposals_to_answer: number;
  median_response_hours: number | null;
  reviews_count: number;
  avg_communication: number | null;
  avg_reliability: number | null;
  avg_quality: number | null;
  avg_collaboration: number | null;
};

export type CalendarDay = { day: string; count: number };

export type ProfilePage = {
  profile: ProfileCard;
  stats: ProfileStats;
  calendar: CalendarDay[];
  collaborations: {
    id: string;
    title: string;
    exchange_type: ExchangeType;
    start_date: string;
    completed_at: string;
    partner: ProfileMini;
    skills: Skill[];
  }[];
  reviews: Review[];
  offers: OfferCard[];
  viewer: {
    is_self: boolean;
    is_authenticated: boolean;
    active_proposal_id: string | null;
    match: MatchItem | null;
  };
};

export type ChecklistKey =
  | "name"
  | "country"
  | "bio"
  | "avatar"
  | "experience"
  | "languages"
  | "availability"
  | "offered_skills"
  | "wanted_skills";

export type ActivityItem = {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, string | undefined>;
  created_at: string;
};

export type DashboardSummary = {
  stats: {
    active_exchanges: number;
    proposals_received: number;
    completed_exchanges: number;
    matches_available: number;
  };
  top_matches: MatchItem[];
  active_collaborations: CollaborationItem[];
  pending_proposals: ProposalItem[];
  recent_activity: ActivityItem[];
  profile: { score: number; missing: ChecklistKey[] };
};

export type KeyCount = { key: string; count: number };

export type AdminOverview = {
  users_total: number;
  users_active: number;
  users_suspended: number;
  users_new_7d: number;
  users_demo: number;
  offers_total: number;
  offers_open: number;
  offers_removed: number;
  proposals_total: number;
  proposals_pending: number;
  collaborations_active: number;
  collaborations_completed: number;
  collaborations_cancelled: number;
  tasks_validated: number;
  messages_total: number;
  reviews_total: number;
  reports_open: number;
  reports_total: number;
  by_country: KeyCount[];
  top_offered: KeyCount[];
  top_wanted: KeyCount[];
  offers_by_type: KeyCount[];
  signups_by_week: KeyCount[];
  recent_actions: {
    id: string;
    action: string;
    target_type: string;
    target_id: string | null;
    reason: string | null;
    metadata: Record<string, string | undefined>;
    created_at: string;
    admin: ProfileMini | null;
  }[];
};

export type AdminUser = ProfileMini & {
  email: string;
  created_at: string;
  is_admin: boolean;
  profile_completion: number;
  reports_count: number;
  collaborations_count: number;
};

export type AdminOffer = OfferCard & {
  reports_count: number;
  reports_open: number;
  moderation_note: string | null;
};

export type AdminReport = {
  id: string;
  reason: string;
  description: string;
  status: ReportStatus;
  resolution_note: string | null;
  handled_at: string | null;
  created_at: string;
  reporter: ProfileMini | null;
  reported_user: ProfileMini | null;
  handled_by: ProfileMini | null;
  offer: { id: string; title: string; status: OfferStatus } | null;
  collaboration: { id: string; title: string; status: CollaborationStatus } | null;
};

/** Résultat uniforme des actions serveur. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> };
