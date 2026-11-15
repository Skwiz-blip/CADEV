-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 01 · Schéma
-- Tables, contraintes et index. Aucune donnée n'est accessible tant que la
-- migration « 06 · Sécurité » n'a pas posé les règles d'accès (RLS).
-- ═════════════════════════════════════════════════════════════════════════

create schema if not exists private;
comment on schema private is
  'Fonctions internes de DevBridge. Ce schéma n''est pas exposé par l''API.';

-- ── Profils ──────────────────────────────────────────────────────────────
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  username                text not null unique
                          check (username ~ '^[a-z0-9_]{3,30}$'),
  first_name              text not null default '' check (char_length(first_name) <= 60),
  last_name               text not null default '' check (char_length(last_name) <= 60),
  avatar_url              text check (avatar_url is null or char_length(avatar_url) <= 500),
  country                 text check (country is null or country ~ '^[A-Z]{2}$'),
  city                    text check (city is null or char_length(city) <= 80),
  timezone                text not null default 'UTC',
  headline                text check (headline is null or char_length(headline) <= 120),
  bio                     text check (bio is null or char_length(bio) <= 1200),
  experience_level        text check (experience_level in ('student', 'junior', 'intermediate', 'senior')),
  main_domain             text check (main_domain in (
                            'frontend', 'backend', 'fullstack', 'mobile', 'data_ai',
                            'devops_cloud', 'design', 'security', 'embedded', 'other')),
  languages               text[] not null default '{}'
                          check (cardinality(languages) <= 10),
  availability            text[] not null default '{}'
                          check (availability <@ array['weekday_morning', 'weekday_afternoon', 'weekday_evening', 'weekend']::text[]),
  collaboration_modes     text[] not null default '{remote}'
                          check (collaboration_modes <@ array['remote', 'onsite', 'hybrid']::text[]),
  github_url              text check (github_url is null or (github_url ~* '^https?://' and char_length(github_url) <= 300)),
  portfolio_url           text check (portfolio_url is null or (portfolio_url ~* '^https?://' and char_length(portfolio_url) <= 300)),
  linkedin_url            text check (linkedin_url is null or (linkedin_url ~* '^https?://' and char_length(linkedin_url) <= 300)),
  website_url             text check (website_url is null or (website_url ~* '^https?://' and char_length(website_url) <= 300)),
  profile_completion      smallint not null default 0 check (profile_completion between 0 and 100),
  onboarding_step         smallint not null default 0 check (onboarding_step between 0 and 8),
  onboarding_completed_at timestamptz,
  status                  text not null default 'active' check (status in ('active', 'suspended')),
  is_demo                 boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
comment on table public.profiles is 'Profil public d''un développeur. Une ligne par compte.';
comment on column public.profiles.is_demo is 'Vrai pour les profils fictifs de démonstration.';

create index profiles_status_idx on public.profiles (status, profile_completion desc, created_at desc);
create index profiles_country_idx on public.profiles (country);

-- ── Administrateurs ──────────────────────────────────────────────────────
-- Table séparée : aucun rôle n'est porté par un champ modifiable côté client.
create table public.app_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Catalogue de compétences ─────────────────────────────────────────────
create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name        text not null unique check (char_length(name) between 1 and 60),
  kind        text not null check (kind in ('competence', 'technology')),
  category    text not null check (category in (
                'languages', 'frontend', 'backend', 'mobile', 'data_ai',
                'devops_cloud', 'databases', 'design', 'security', 'practices')),
  description text
);
create index skills_kind_idx on public.skills (kind, category, name);

create table public.user_skills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  skill_id    uuid not null references public.skills (id) on delete cascade,
  skill_type  text not null check (skill_type in ('offered', 'wanted')),
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at  timestamptz not null default now(),
  unique (user_id, skill_id, skill_type)
);
create index user_skills_skill_idx on public.user_skills (skill_id, skill_type);

-- ── Annonces d'échange ───────────────────────────────────────────────────
create table public.exchange_offers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  title              text not null check (char_length(title) between 8 and 120),
  description        text not null check (char_length(description) between 30 and 4000),
  exchange_type      text not null check (exchange_type in ('reciprocal', 'one_off', 'mentoring')),
  collaboration_type text not null check (collaboration_type in ('remote', 'onsite', 'hybrid')),
  estimated_duration text not null check (estimated_duration in ('under_hour', 'few_hours', 'few_days', 'several_weeks')),
  desired_level      text not null default 'any'
                     check (desired_level in ('any', 'beginner', 'intermediate', 'advanced', 'expert')),
  availability       text[] not null default '{}'
                     check (availability <@ array['weekday_morning', 'weekday_afternoon', 'weekday_evening', 'weekend']::text[]),
  language           text not null default 'fr' check (language ~ '^[a-z]{2,3}$'),
  country            text check (country is null or country ~ '^[A-Z]{2}$'),
  links              text[] not null default '{}' check (cardinality(links) <= 5),
  conditions         text check (conditions is null or char_length(conditions) <= 1000),
  -- Coup de main express : « je suis bloqué », réponse attendue rapidement.
  is_urgent          boolean not null default false,
  status             text not null default 'open'
                     check (status in ('open', 'paused', 'closed', 'removed', 'deleted')),
  moderation_note    text,
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index exchange_offers_status_idx on public.exchange_offers (status, created_at desc);
create index exchange_offers_user_idx on public.exchange_offers (user_id, created_at desc);

create table public.offer_skills (
  offer_id uuid not null references public.exchange_offers (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  role     text not null check (role in ('proposed', 'requested', 'related')),
  primary key (offer_id, skill_id, role)
);
create index offer_skills_skill_idx on public.offer_skills (skill_id, role);

-- ── Propositions (réponse à une annonce ou prise de contact directe) ─────
create table public.exchange_proposals (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid references public.exchange_offers (id) on delete set null,
  sender_id     uuid not null references public.profiles (id) on delete cascade,
  receiver_id   uuid not null references public.profiles (id) on delete cascade,
  message       text not null check (char_length(message) between 20 and 2000),
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined', 'changes_requested', 'cancelled')),
  response_note text check (response_note is null or char_length(response_note) <= 1000),
  responded_at  timestamptz,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (sender_id <> receiver_id)
);
create index exchange_proposals_receiver_idx on public.exchange_proposals (receiver_id, status, created_at desc);
create index exchange_proposals_sender_idx on public.exchange_proposals (sender_id, status, created_at desc);
create index exchange_proposals_offer_idx on public.exchange_proposals (offer_id);
-- Une seule proposition en cours par annonce, et une seule prise de contact
-- directe en cours entre deux mêmes personnes.
create unique index exchange_proposals_active_offer_uidx
  on public.exchange_proposals (sender_id, offer_id)
  where status in ('pending', 'changes_requested') and offer_id is not null;
create unique index exchange_proposals_active_direct_uidx
  on public.exchange_proposals (sender_id, receiver_id)
  where status in ('pending', 'changes_requested') and offer_id is null;

create table public.proposal_skills (
  proposal_id uuid not null references public.exchange_proposals (id) on delete cascade,
  skill_id    uuid not null references public.skills (id) on delete cascade,
  -- offered : ce que l'expéditeur apporte · requested : ce qu'il attend en retour
  role        text not null check (role in ('offered', 'requested')),
  primary key (proposal_id, skill_id, role)
);

-- ── Correspondances ──────────────────────────────────────────────────────
create table public.matches (
  id                  uuid primary key default gen_random_uuid(),
  user_a              uuid not null references public.profiles (id) on delete cascade,
  user_b              uuid not null references public.profiles (id) on delete cascade,
  compatibility_score smallint not null check (compatibility_score between 0 and 100),
  a_offers_b          uuid[] not null default '{}', -- compétences de A recherchées par B
  b_offers_a          uuid[] not null default '{}', -- compétences de B recherchées par A
  match_reasons       jsonb not null default '{}'::jsonb,
  status              text not null default 'suggested' check (status in ('suggested', 'contacted')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index matches_user_a_idx on public.matches (user_a, compatibility_score desc);
create index matches_user_b_idx on public.matches (user_b, compatibility_score desc);

-- ── Boucles d'échange à trois ────────────────────────────────────────────
-- Quand aucun échange direct n'existe : A aide B, B aide C, C aide A.
-- La boucle ne démarre que lorsque les trois personnes l'ont acceptée.
create table public.exchange_loops (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles (id) on delete cascade,
  user_b      uuid not null references public.profiles (id) on delete cascade,
  user_c      uuid not null references public.profiles (id) on delete cascade,
  skills_ab   uuid[] not null, -- ce que A apporte à B
  skills_bc   uuid[] not null, -- ce que B apporte à C
  skills_ca   uuid[] not null, -- ce que C apporte à A
  member_key  text not null,   -- les trois identifiants triés (anti-doublon)
  status      text not null default 'proposed' check (status in ('proposed', 'active', 'declined')),
  created_by  uuid not null references public.profiles (id) on delete cascade,
  accepted_a  timestamptz,
  accepted_b  timestamptz,
  accepted_c  timestamptz,
  declined_by uuid references public.profiles (id) on delete set null,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (user_a <> user_b and user_b <> user_c and user_a <> user_c)
);
create unique index exchange_loops_open_uidx on public.exchange_loops (member_key)
  where status in ('proposed', 'active');
create index exchange_loops_a_idx on public.exchange_loops (user_a);
create index exchange_loops_b_idx on public.exchange_loops (user_b);
create index exchange_loops_c_idx on public.exchange_loops (user_c);

-- ── Collaborations ───────────────────────────────────────────────────────
create table public.collaborations (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null unique references public.exchange_proposals (id) on delete cascade,
  offer_id      uuid references public.exchange_offers (id) on delete set null,
  loop_id       uuid references public.exchange_loops (id) on delete set null,
  title         text not null check (char_length(title) between 3 and 140),
  description   text check (description is null or char_length(description) <= 4000),
  objectives    text check (objectives is null or char_length(objectives) <= 2000),
  exchange_type text not null check (exchange_type in ('reciprocal', 'one_off', 'mentoring')),
  status        text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  start_date    date not null default current_date,
  end_date      date,
  cancelled_by  uuid references public.profiles (id) on delete set null,
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 1000),
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index collaborations_status_idx on public.collaborations (status, created_at desc);

create table public.collaboration_members (
  id                      uuid primary key default gen_random_uuid(),
  collaboration_id        uuid not null references public.collaborations (id) on delete cascade,
  user_id                 uuid not null references public.profiles (id) on delete cascade,
  role                    text not null check (role in ('initiator', 'partner')),
  completion_confirmed_at timestamptz,
  created_at              timestamptz not null default now(),
  unique (collaboration_id, user_id)
);
create index collaboration_members_user_idx on public.collaboration_members (user_id);

create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations (id) on delete cascade,
  title            text not null check (char_length(title) between 3 and 140),
  description      text check (description is null or char_length(description) <= 3000),
  created_by       uuid not null references public.profiles (id) on delete cascade,
  assigned_to      uuid not null references public.profiles (id) on delete cascade,
  status           text not null default 'todo' check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority         text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date         date,
  links            text[] not null default '{}' check (cardinality(links) <= 5),
  attachment_path  text check (attachment_path is null or char_length(attachment_path) <= 400),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index tasks_collaboration_idx on public.tasks (collaboration_id, status);
create index tasks_assigned_idx on public.tasks (assigned_to);

-- Chaque soumission est une nouvelle ligne : l'historique des validations est conservé.
create table public.deliverables (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid not null references public.tasks (id) on delete cascade,
  submitted_by      uuid not null references public.profiles (id) on delete cascade,
  description       text not null check (char_length(description) between 10 and 3000),
  external_url      text check (external_url is null or (external_url ~* '^https?://' and char_length(external_url) <= 300)),
  attachment_path   text check (attachment_path is null or char_length(attachment_path) <= 400),
  validation_status text not null default 'pending'
                    check (validation_status in ('pending', 'approved', 'changes_requested')),
  reviewed_by       uuid references public.profiles (id) on delete set null,
  review_note       text check (review_note is null or char_length(review_note) <= 1000),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index deliverables_task_idx on public.deliverables (task_id, created_at desc);
create index deliverables_submitter_idx on public.deliverables (submitted_by, validation_status);

-- ── Messagerie ───────────────────────────────────────────────────────────
-- Une conversation par paire de personnes ; elle est ouverte par l'envoi
-- d'une proposition, jamais par une prise de contact « à froid ».
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_low        uuid not null references public.profiles (id) on delete cascade,
  user_high       uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  check (user_low < user_high),
  unique (user_low, user_high)
);
create index conversations_high_idx on public.conversations (user_high);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  content         text not null check (char_length(btrim(content)) between 1 and 4000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_unread_idx on public.messages (conversation_id, sender_id) where read_at is null;
create index messages_sender_recent_idx on public.messages (sender_id, created_at desc);

-- ── Notifications ────────────────────────────────────────────────────────
create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  type                text not null check (type in (
                        'proposal_received', 'proposal_accepted', 'proposal_declined',
                        'proposal_changes_requested', 'proposal_updated', 'proposal_cancelled',
                        'new_message', 'new_match', 'task_assigned', 'task_completed',
                        'deliverable_to_review', 'deliverable_changes_requested',
                        'completion_requested', 'collaboration_completed',
                        'collaboration_cancelled', 'review_received', 'moderation',
                        'help_request', 'loop_invitation', 'loop_started', 'loop_declined')),
  title               text not null check (char_length(title) <= 200),
  content             text check (content is null or char_length(content) <= 500),
  related_entity_type text,
  related_entity_id   uuid,
  link                text check (link is null or link ~ '^/'),
  actor_id            uuid references public.profiles (id) on delete set null,
  is_read             boolean not null default false,
  created_at          timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ── Évaluations ──────────────────────────────────────────────────────────
create table public.reviews (
  id                   uuid primary key default gen_random_uuid(),
  collaboration_id     uuid not null references public.collaborations (id) on delete cascade,
  reviewer_id          uuid not null references public.profiles (id) on delete cascade,
  reviewed_user_id     uuid not null references public.profiles (id) on delete cascade,
  communication_rating smallint not null check (communication_rating between 1 and 5),
  reliability_rating   smallint not null check (reliability_rating between 1 and 5),
  quality_rating       smallint not null check (quality_rating between 1 and 5),
  collaboration_rating smallint not null check (collaboration_rating between 1 and 5),
  comment              text check (comment is null or char_length(comment) <= 1000),
  created_at           timestamptz not null default now(),
  check (reviewer_id <> reviewed_user_id),
  unique (collaboration_id, reviewer_id)
);
create index reviews_reviewed_idx on public.reviews (reviewed_user_id, created_at desc);

-- ── Signalements ─────────────────────────────────────────────────────────
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  offer_id         uuid references public.exchange_offers (id) on delete set null,
  collaboration_id uuid references public.collaborations (id) on delete set null,
  reason           text not null check (reason in (
                     'spam', 'inappropriate', 'harassment', 'fake_exchange', 'dispute', 'other')),
  description      text not null check (char_length(description) between 10 and 2000),
  status           text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  resolution_note  text check (resolution_note is null or char_length(resolution_note) <= 1000),
  handled_by       uuid references public.profiles (id) on delete set null,
  handled_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);

-- ── Journal d'activité (alimente le parcours et le calendrier) ───────────
create table public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  event_type  text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index activity_logs_user_idx on public.activity_logs (user_id, created_at desc);

-- ── Historique des actions d'administration ──────────────────────────────
create table public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  reason      text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index admin_actions_created_idx on public.admin_actions (created_at desc);
