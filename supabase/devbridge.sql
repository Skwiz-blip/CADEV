-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge — script complet de la base de données
--
-- FICHIER GÉNÉRÉ : ne pas le modifier à la main.
-- Source : supabase/migrations/ · Régénérer avec : npm run db:bundle
--
-- Utilisation : Supabase → SQL Editor → New query → coller ce fichier → Run.
-- À exécuter UNE fois, sur un projet Supabase neuf et réservé à DevBridge.
-- Tout s'exécute dans une transaction : en cas d'erreur, rien n'est appliqué.
-- ═════════════════════════════════════════════════════════════════════════

begin;

-- ▼▼▼ 20261113090000_schema.sql ▼▼▼

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

-- ▼▼▼ 20261113090100_core.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 02 · Fonctions de base et déclencheurs
-- Les messages d'erreur sont des codes courts (ex. « not_authenticated ») :
-- l'application les traduit en phrases lisibles.
-- ═════════════════════════════════════════════════════════════════════════

-- ── Contrôles d'identité ─────────────────────────────────────────────────
create or replace function private.is_admin(p_user uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.app_admins a where a.user_id = p_user);
$$;

create or replace function private.is_active_user(p_user uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles p where p.id = p_user and p.status = 'active');
$$;

create or replace function private.is_collab_member(p_collaboration uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.collaboration_members m
    where m.collaboration_id = p_collaboration and m.user_id = p_user
  );
$$;

create or replace function private.is_conversation_member(p_conversation uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation and p_user in (c.user_low, c.user_high)
  );
$$;

-- Conversion tolérante : renvoie NULL au lieu d'une erreur (chemins de fichiers).
create or replace function private.try_uuid(p_value text)
returns uuid
language plpgsql immutable
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

-- Renvoie l'identifiant de la personne connectée, ou lève une erreur.
create or replace function private.require_user(p_require_active boolean default true)
returns uuid
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select status into v_status from public.profiles where id = v_uid;
  if v_status is null then
    raise exception 'profile_missing';
  end if;
  if p_require_active and v_status <> 'active' then
    raise exception 'account_suspended';
  end if;
  return v_uid;
end;
$$;

create or replace function private.require_admin()
returns uuid
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not private.is_admin(v_uid) then
    raise exception 'forbidden';
  end if;
  return v_uid;
end;
$$;

-- ── Outils ───────────────────────────────────────────────────────────────
create or replace function private.like_pattern(p_query text)
returns text
language sql immutable
as $$
  select '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%';
$$;

create or replace function private.clean_text(p_value text)
returns text
language sql immutable
as $$
  select nullif(btrim(p_value), '');
$$;

create or replace function private.full_name(p_user uuid)
returns text
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(nullif(btrim(p.first_name || ' ' || p.last_name), ''), p.username)
  from public.profiles p where p.id = p_user;
$$;

create or replace function private.valid_timezone(p_tz text)
returns text
language plpgsql stable
as $$
begin
  if p_tz is null or btrim(p_tz) = '' then
    return 'UTC';
  end if;
  perform now() at time zone p_tz;
  return p_tz;
exception when others then
  return 'UTC';
end;
$$;

create or replace function private.valid_links(p_links text[])
returns boolean
language sql immutable
as $$
  select not exists (
    select 1 from unnest(coalesce(p_links, '{}'::text[])) as l
    where l !~* '^https?://\S+$' or char_length(l) > 300
  );
$$;

create or replace function private.generate_username(p_first text, p_last text)
returns text
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_base text;
  v_candidate text;
  v_try int := 0;
begin
  v_base := lower(coalesce(p_first, '') || coalesce(p_last, ''));
  v_base := translate(v_base,
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ',
    'aaaaaaceeeeiiiinooooouuuuyyoa');
  v_base := left(regexp_replace(v_base, '[^a-z0-9]+', '', 'g'), 20);
  if char_length(v_base) < 3 then
    v_base := 'dev' || v_base;
  end if;
  v_candidate := v_base;
  while exists (select 1 from public.profiles where username = v_candidate) loop
    v_try := v_try + 1;
    v_candidate := left(v_base, 20) || (floor(random() * 9000) + 1000)::int::text;
    if v_try > 20 then
      v_candidate := 'dev' || replace(gen_random_uuid()::text, '-', '');
      v_candidate := left(v_candidate, 24);
      exit;
    end if;
  end loop;
  return v_candidate;
end;
$$;

-- ── Notifications et journal ─────────────────────────────────────────────
create or replace function private.notify(
  p_user uuid, p_type text, p_title text, p_content text,
  p_entity_type text, p_entity_id uuid, p_link text, p_actor uuid default null)
returns void
language sql volatile security definer
set search_path = public, pg_temp
as $$
  insert into public.notifications
    (user_id, type, title, content, related_entity_type, related_entity_id, link, actor_id)
  select p_user, p_type, left(p_title, 200), left(p_content, 500), p_entity_type, p_entity_id, p_link, p_actor
  where exists (select 1 from public.profiles where id = p_user);
$$;

create or replace function private.log_activity(
  p_user uuid, p_event text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb)
returns void
language sql volatile security definer
set search_path = public, pg_temp
as $$
  insert into public.activity_logs (user_id, event_type, entity_type, entity_id, metadata)
  values (p_user, p_event, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

-- ── Complétion du profil (score sur 100 + éléments manquants) ────────────
create or replace function private.profile_checklist(p public.profiles)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_missing text[] := '{}';
  v_score int := 0;
  v_offered int;
  v_wanted int;
begin
  select count(*) filter (where skill_type = 'offered'),
         count(*) filter (where skill_type = 'wanted')
    into v_offered, v_wanted
  from public.user_skills where user_id = p.id;

  if btrim(p.first_name) <> '' and btrim(p.last_name) <> '' then v_score := v_score + 10;
  else v_missing := array_append(v_missing, 'name'); end if;

  if p.country is not null then v_score := v_score + 10;
  else v_missing := array_append(v_missing, 'country'); end if;

  if char_length(coalesce(btrim(p.bio), '')) >= 30 then v_score := v_score + 15;
  else v_missing := array_append(v_missing, 'bio'); end if;

  if p.avatar_url is not null then v_score := v_score + 10;
  else v_missing := array_append(v_missing, 'avatar'); end if;

  if p.experience_level is not null and p.main_domain is not null then v_score := v_score + 10;
  else v_missing := array_append(v_missing, 'experience'); end if;

  if cardinality(p.languages) > 0 then v_score := v_score + 10;
  else v_missing := array_append(v_missing, 'languages'); end if;

  if cardinality(p.availability) > 0 then v_score := v_score + 10;
  else v_missing := array_append(v_missing, 'availability'); end if;

  if v_offered > 0 then v_score := v_score + 15;
  else v_missing := array_append(v_missing, 'offered_skills'); end if;

  if v_wanted > 0 then v_score := v_score + 10;
  else v_missing := array_append(v_missing, 'wanted_skills'); end if;

  return jsonb_build_object('score', v_score, 'missing', to_jsonb(v_missing));
end;
$$;

-- ── Déclencheurs génériques ──────────────────────────────────────────────
-- « devbridge.keep_timestamps » n'est activé que par l'outil de données de
-- démonstration (réservé au serveur), pour dater des exemples dans le passé.
create or replace function private.keep_timestamps()
returns boolean
language sql stable
as $$
  select coalesce(current_setting('devbridge.keep_timestamps', true), 'off') = 'on';
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if not private.keep_timestamps() then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger exchange_offers_touch before update on public.exchange_offers
  for each row execute function private.touch_updated_at();
create trigger exchange_proposals_touch before update on public.exchange_proposals
  for each row execute function private.touch_updated_at();
create trigger collaborations_touch before update on public.collaborations
  for each row execute function private.touch_updated_at();
create trigger tasks_touch before update on public.tasks
  for each row execute function private.touch_updated_at();
create trigger exchange_loops_touch before update on public.exchange_loops
  for each row execute function private.touch_updated_at();

-- ── Profils : normalisation et score de complétion ───────────────────────
create or replace function private.profiles_before_write()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  new.username   := lower(btrim(new.username));
  new.first_name := btrim(coalesce(new.first_name, ''));
  new.last_name  := btrim(coalesce(new.last_name, ''));
  new.city       := private.clean_text(new.city);
  new.headline   := private.clean_text(new.headline);
  new.bio        := private.clean_text(new.bio);
  new.github_url    := private.clean_text(new.github_url);
  new.portfolio_url := private.clean_text(new.portfolio_url);
  new.linkedin_url  := private.clean_text(new.linkedin_url);
  new.website_url   := private.clean_text(new.website_url);
  new.country    := upper(private.clean_text(new.country));
  new.timezone   := private.valid_timezone(new.timezone);
  new.languages  := coalesce(
    (select array_agg(distinct lower(l)) from unnest(new.languages) as l where l ~* '^[a-z]{2,3}$'),
    '{}'::text[]);
  new.availability := coalesce(
    (select array_agg(distinct a) from unnest(new.availability) as a), '{}'::text[]);
  new.collaboration_modes := coalesce(
    (select array_agg(distinct m) from unnest(new.collaboration_modes) as m), '{}'::text[]);
  if tg_op = 'UPDATE' then
    new.id := old.id;
    if not private.keep_timestamps() then
      new.created_at := old.created_at;
    end if;
    -- Une fois terminé, l'accueil ne peut pas être « rejoué » pour fausser la date.
    if old.onboarding_completed_at is not null then
      new.onboarding_completed_at := old.onboarding_completed_at;
    end if;
  end if;
  if not private.keep_timestamps() then
    new.updated_at := now();
  end if;
  new.profile_completion := (private.profile_checklist(new) ->> 'score')::smallint;
  return new;
end;
$$;

create trigger profiles_before_write before insert or update on public.profiles
  for each row execute function private.profiles_before_write();

-- ── Création automatique du profil à l'inscription ───────────────────────
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_first text := left(btrim(coalesce(v_meta ->> 'first_name', '')), 60);
  v_last text := left(btrim(coalesce(v_meta ->> 'last_name', '')), 60);
  v_country text := upper(btrim(coalesce(v_meta ->> 'country', '')));
begin
  if v_country !~ '^[A-Z]{2}$' then
    v_country := null;
  end if;
  insert into public.profiles (id, username, first_name, last_name, country, timezone, is_demo)
  values (
    new.id,
    private.generate_username(v_first, v_last),
    v_first,
    v_last,
    v_country,
    private.valid_timezone(v_meta ->> 'timezone'),
    -- app_metadata n'est modifiable que par le serveur : un visiteur ne peut
    -- pas se déclarer « profil de démonstration ».
    coalesce((new.raw_app_meta_data ->> 'is_demo')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- « create or replace » : ne demande que le droit de poser un déclencheur sur
-- auth.users (que Supabase accorde), pas d'en être propriétaire.
create or replace trigger devbridge_on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── Messagerie : limitation et notification ──────────────────────────────
create or replace function private.messages_before_insert()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  new.content := btrim(new.content);
  new.read_at := null;
  new.created_at := now();
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;

create trigger messages_before_insert before insert on public.messages
  for each row execute function private.messages_before_insert();

create or replace function private.messages_after_insert()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_conv public.conversations;
  v_recipient uuid;
  v_existing uuid;
begin
  update public.conversations set last_message_at = new.created_at
  where id = new.conversation_id
  returning * into v_conv;

  -- Le premier message d'une proposition est déjà annoncé par la notification
  -- « nouvelle proposition » : on n'en crée pas une seconde.
  if coalesce(current_setting('devbridge.silent_message', true), 'off') = 'on' then
    return new;
  end if;

  v_recipient := case when v_conv.user_low = new.sender_id then v_conv.user_high else v_conv.user_low end;

  select id into v_existing from public.notifications
  where user_id = v_recipient and type = 'new_message'
    and related_entity_id = new.conversation_id and not is_read
  limit 1;

  if v_existing is not null then
    update public.notifications
      set content = left(new.content, 140), created_at = now()
    where id = v_existing;
  else
    perform private.notify(
      v_recipient, 'new_message',
      'Nouveau message de ' || private.full_name(new.sender_id),
      left(new.content, 140),
      'conversation', new.conversation_id,
      '/messages/' || new.conversation_id, new.sender_id);
  end if;
  return new;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function private.messages_after_insert();

create or replace function private.ensure_conversation(p_a uuid, p_b uuid)
returns uuid
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.conversations (user_low, user_high)
  values (least(p_a, p_b), greatest(p_a, p_b))
  on conflict (user_low, user_high) do update set user_low = excluded.user_low
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Constructeurs JSON partagés par toutes les lectures ──────────────────
create or replace function private.skills_json(p_ids uuid[])
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'name', s.name, 'slug', s.slug, 'kind', s.kind, 'category', s.category)
           order by s.name), '[]'::jsonb)
  from public.skills s
  where s.id = any(coalesce(p_ids, '{}'::uuid[]));
$$;

create or replace function private.profile_mini(p_id uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username,
    'first_name', p.first_name, 'last_name', p.last_name,
    'avatar_url', p.avatar_url, 'country', p.country,
    'headline', p.headline, 'is_demo', p.is_demo, 'status', p.status)
  from public.profiles p where p.id = p_id;
$$;

create or replace function private.user_skills_json(p_user uuid, p_type text)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'name', s.name, 'slug', s.slug, 'kind', s.kind,
           'category', s.category, 'level', us.skill_level)
           order by s.kind, s.name), '[]'::jsonb)
  from public.user_skills us
  join public.skills s on s.id = us.skill_id
  where us.user_id = p_user and us.skill_type = p_type;
$$;

create or replace function private.profile_card(p_id uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username,
    'first_name', p.first_name, 'last_name', p.last_name,
    'avatar_url', p.avatar_url, 'country', p.country, 'city', p.city,
    'timezone', p.timezone, 'headline', p.headline, 'bio', p.bio,
    'experience_level', p.experience_level, 'main_domain', p.main_domain,
    'languages', to_jsonb(p.languages), 'availability', to_jsonb(p.availability),
    'collaboration_modes', to_jsonb(p.collaboration_modes),
    'github_url', p.github_url, 'portfolio_url', p.portfolio_url,
    'linkedin_url', p.linkedin_url, 'website_url', p.website_url,
    'profile_completion', p.profile_completion,
    'is_demo', p.is_demo, 'status', p.status, 'created_at', p.created_at,
    'offered', private.user_skills_json(p.id, 'offered'),
    'wanted', private.user_skills_json(p.id, 'wanted'))
  from public.profiles p where p.id = p_id;
$$;

create or replace function private.offer_skills_json(p_offer uuid, p_role text)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'name', s.name, 'slug', s.slug, 'kind', s.kind, 'category', s.category)
           order by s.name), '[]'::jsonb)
  from public.offer_skills os
  join public.skills s on s.id = os.skill_id
  where os.offer_id = p_offer and os.role = p_role;
$$;

create or replace function private.offer_card(p_id uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', o.id, 'title', o.title, 'description', o.description,
    'exchange_type', o.exchange_type, 'collaboration_type', o.collaboration_type,
    'estimated_duration', o.estimated_duration, 'desired_level', o.desired_level,
    'availability', to_jsonb(o.availability), 'language', o.language, 'country', o.country,
    'links', to_jsonb(o.links), 'conditions', o.conditions,
    'status', o.status, 'is_demo', o.is_demo,
    -- Une demande express reste mise en avant 72 heures.
    'is_urgent', (o.is_urgent and o.created_at > now() - interval '72 hours'),
    'created_at', o.created_at, 'updated_at', o.updated_at,
    'author', private.profile_mini(o.user_id),
    'proposed', private.offer_skills_json(o.id, 'proposed'),
    'requested', private.offer_skills_json(o.id, 'requested'),
    'related', private.offer_skills_json(o.id, 'related'))
  from public.exchange_offers o where o.id = p_id;
$$;

create or replace function private.proposal_skills_json(p_proposal uuid, p_role text)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'name', s.name, 'slug', s.slug, 'kind', s.kind, 'category', s.category)
           order by s.name), '[]'::jsonb)
  from public.proposal_skills ps
  join public.skills s on s.id = ps.skill_id
  where ps.proposal_id = p_proposal and ps.role = p_role;
$$;

create or replace function private.skill_names(p_ids uuid[])
returns text
language sql stable security definer
set search_path = public, pg_temp
as $$
  select string_agg(s.name, ', ' order by s.name)
  from public.skills s where s.id = any(coalesce(p_ids, '{}'::uuid[]));
$$;

-- Compétences que p_giver propose et que p_receiver recherche.
create or replace function private.leg_skills(p_giver uuid, p_receiver uuid)
returns uuid[]
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(distinct o.skill_id), '{}')
  from public.user_skills o
  join public.user_skills w
    on w.skill_id = o.skill_id and w.user_id = p_receiver and w.skill_type = 'wanted'
  where o.user_id = p_giver and o.skill_type = 'offered';
$$;

-- ▼▼▼ 20261113090200_matching.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 03 · Moteur de correspondance
-- Score explicable sur 100, calculé uniquement dans la base :
--   compétences complémentaires 50 · disponibilités 20 · langue 15
--   mode de collaboration 10 · même pays 5
-- Ce score est une aide à la décision, pas une mesure scientifique.
-- ═════════════════════════════════════════════════════════════════════════

-- Convertit des créneaux locaux en heures UTC.
-- Heures 0-23 : jours de semaine · heures 24-47 : week-end.
create or replace function private.availability_hours(p_slots text[], p_tz text)
returns int[]
language plpgsql stable
as $$
declare
  v_offset int := 0;
  v_hours int[] := '{}';
  v_slot text;
  v_lo int;
  v_hi int;
  v_base int;
  h int;
begin
  if p_slots is null or cardinality(p_slots) = 0 then
    return v_hours;
  end if;
  begin
    v_offset := round(extract(epoch from (
      (now() at time zone coalesce(p_tz, 'UTC')) - (now() at time zone 'UTC'))) / 3600.0);
  exception when others then
    v_offset := 0;
  end;
  foreach v_slot in array p_slots loop
    v_base := 0;
    if v_slot = 'weekday_morning' then v_lo := 6; v_hi := 12;
    elsif v_slot = 'weekday_afternoon' then v_lo := 12; v_hi := 18;
    elsif v_slot = 'weekday_evening' then v_lo := 18; v_hi := 23;
    elsif v_slot = 'weekend' then v_lo := 8; v_hi := 20; v_base := 24;
    else continue;
    end if;
    for h in v_lo .. v_hi - 1 loop
      v_hours := array_append(v_hours, v_base + (((h - v_offset) % 24) + 24) % 24);
    end loop;
  end loop;
  return v_hours;
end;
$$;

create or replace function private.compute_match(
  p_a uuid, p_b uuid,
  out score int, out a_offers_b uuid[], out b_offers_a uuid[], out reasons jsonb)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  pa public.profiles;
  pb public.profiles;
  v_hours_a int[];
  v_hours_b int[];
  v_weekday int := 0;
  v_weekend int := 0;
  v_overlap int[];
  v_shared_langs text[];
  v_shared_modes text[];
  v_same_country boolean;
  v_skills int := 0;
  v_avail int := 0;
  v_lang int := 0;
  v_mode int := 0;
  v_geo int := 0;
begin
  select * into pa from public.profiles where id = p_a;
  select * into pb from public.profiles where id = p_b;

  -- 1. Complémentarité : 25 points par sens.
  select coalesce(array_agg(distinct o.skill_id), '{}') into a_offers_b
  from public.user_skills o
  join public.user_skills w on w.skill_id = o.skill_id and w.user_id = p_b and w.skill_type = 'wanted'
  where o.user_id = p_a and o.skill_type = 'offered';

  select coalesce(array_agg(distinct o.skill_id), '{}') into b_offers_a
  from public.user_skills o
  join public.user_skills w on w.skill_id = o.skill_id and w.user_id = p_a and w.skill_type = 'wanted'
  where o.user_id = p_b and o.skill_type = 'offered';

  v_skills := (case when cardinality(a_offers_b) > 0 then 25 else 0 end)
            + (case when cardinality(b_offers_a) > 0 then 25 else 0 end);

  -- 2. Disponibilités : créneaux ramenés en UTC puis comparés.
  v_hours_a := private.availability_hours(pa.availability, pa.timezone);
  v_hours_b := private.availability_hours(pb.availability, pb.timezone);
  select count(*) filter (where h < 24), count(*) filter (where h >= 24),
         coalesce(array_agg(h order by h), '{}')
    into v_weekday, v_weekend, v_overlap
  from (select distinct unnest(v_hours_a) as h) x
  where h = any(v_hours_b);

  if v_weekday >= 2 or v_weekend >= 3 then v_avail := 20;
  elsif v_weekday >= 1 or v_weekend >= 1 then v_avail := 10;
  end if;

  -- 3. Langue de travail commune.
  select coalesce(array_agg(l order by l), '{}') into v_shared_langs
  from (select unnest(pa.languages) as l intersect select unnest(pb.languages)) x;
  if cardinality(v_shared_langs) > 0 then v_lang := 15; end if;

  -- 4. Mode de collaboration (le présentiel suppose le même pays).
  v_same_country := pa.country is not null and pa.country = pb.country;
  select coalesce(array_agg(m order by m), '{}') into v_shared_modes
  from (select unnest(pa.collaboration_modes) as m intersect select unnest(pb.collaboration_modes)) x;
  if 'remote' = any(v_shared_modes) then v_mode := 10;
  elsif cardinality(v_shared_modes) > 0 and v_same_country then v_mode := 10;
  end if;

  -- 5. Proximité géographique (facultative).
  if v_same_country then v_geo := 5; end if;

  score := v_skills + v_avail + v_lang + v_mode + v_geo;
  reasons := jsonb_build_object(
    'shared_languages', to_jsonb(v_shared_langs),
    'shared_modes', to_jsonb(v_shared_modes),
    'weekday_overlap', v_weekday,
    'weekend_overlap', v_weekend,
    -- Heures communes en UTC (0-23 : semaine, 24-47 : week-end) : l'application
    -- les affiche dans le fuseau de chacun.
    'overlap_hours', to_jsonb(v_overlap),
    'same_country', v_same_country,
    'breakdown', jsonb_build_object(
      'skills', v_skills, 'availability', v_avail,
      'languages', v_lang, 'mode', v_mode, 'geo', v_geo));
end;
$$;

-- Recalcule toutes les correspondances d'une personne.
-- Une correspondance n'existe que s'il y a au moins une compétence complémentaire :
-- on ne recommande jamais quelqu'un sans pouvoir expliquer pourquoi.
create or replace function private.refresh_matches_for(p_user uuid, p_notify boolean default true)
returns int
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_other uuid;
  v_seen uuid[] := '{}';
  v_lo uuid;
  v_hi uuid;
  v_was_strong boolean;
  r record;
begin
  if not exists (select 1 from public.profiles where id = p_user and status = 'active') then
    delete from public.matches where user_a = p_user or user_b = p_user;
    return 0;
  end if;

  for v_other in
    select distinct o.user_id
    from public.user_skills mine
    join public.user_skills o
      on o.skill_id = mine.skill_id
     and o.user_id <> p_user
     and ((mine.skill_type = 'offered' and o.skill_type = 'wanted')
       or (mine.skill_type = 'wanted' and o.skill_type = 'offered'))
    join public.profiles p on p.id = o.user_id and p.status = 'active'
    where mine.user_id = p_user
  loop
    v_lo := least(p_user, v_other);
    v_hi := greatest(p_user, v_other);
    select * into r from private.compute_match(v_lo, v_hi);
    -- La correspondance était-elle déjà « forte et réciproque » avant ce calcul ?
    select coalesce((
      select m.compatibility_score >= 60
         and cardinality(m.a_offers_b) > 0 and cardinality(m.b_offers_a) > 0
      from public.matches m where m.user_a = v_lo and m.user_b = v_hi), false)
    into v_was_strong;

    insert into public.matches (user_a, user_b, compatibility_score, a_offers_b, b_offers_a, match_reasons)
    values (v_lo, v_hi, r.score, r.a_offers_b, r.b_offers_a, r.reasons)
    on conflict (user_a, user_b) do update
      set compatibility_score = excluded.compatibility_score,
          a_offers_b = excluded.a_offers_b,
          b_offers_a = excluded.b_offers_a,
          match_reasons = excluded.match_reasons,
          updated_at = now();

    -- On prévient l'autre personne uniquement quand la correspondance devient
    -- réciproque et forte, et au plus une fois par semaine pour une même paire,
    -- afin de ne pas noyer les notifications.
    if p_notify and not v_was_strong and r.score >= 60
       and cardinality(r.a_offers_b) > 0 and cardinality(r.b_offers_a) > 0
       and not exists (
         select 1 from public.notifications n
         where n.user_id = v_other and n.type = 'new_match'
           and n.related_entity_id = p_user
           and n.created_at > now() - interval '7 days') then
      perform private.notify(
        v_other, 'new_match',
        'Nouvelle correspondance : ' || private.full_name(p_user),
        'Vos compétences se complètent. Score de correspondance : ' || r.score || ' sur 100.',
        'profile', p_user, '/pour-toi', p_user);
    end if;

    v_seen := array_append(v_seen, v_other);
  end loop;

  delete from public.matches
  where (user_a = p_user and user_b <> all(v_seen))
     or (user_b = p_user and user_a <> all(v_seen));

  return cardinality(v_seen);
end;
$$;

-- Les correspondances suivent les changements de profil qui comptent dans le score.
create or replace function private.profiles_after_update()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform private.refresh_matches_for(new.id);
  return new;
end;
$$;

create trigger profiles_refresh_matches
  after update on public.profiles
  for each row
  when (old.languages is distinct from new.languages
     or old.availability is distinct from new.availability
     or old.timezone is distinct from new.timezone
     or old.country is distinct from new.country
     or old.collaboration_modes is distinct from new.collaboration_modes
     or old.status is distinct from new.status)
  execute function private.profiles_after_update();

-- Vue d'une correspondance depuis le point de vue de la personne qui regarde.
create or replace function private.match_item(m public.matches, p_viewer uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', m.id,
    'score', m.compatibility_score,
    'status', m.status,
    'updated_at', m.updated_at,
    'other', private.profile_card(case when m.user_a = p_viewer then m.user_b else m.user_a end),
    'i_give', private.skills_json(case when m.user_a = p_viewer then m.a_offers_b else m.b_offers_a end),
    'they_give', private.skills_json(case when m.user_a = p_viewer then m.b_offers_a else m.a_offers_b end),
    'shared_languages', coalesce(m.match_reasons -> 'shared_languages', '[]'::jsonb),
    'shared_modes', coalesce(m.match_reasons -> 'shared_modes', '[]'::jsonb),
    'weekday_overlap', coalesce((m.match_reasons ->> 'weekday_overlap')::int, 0),
    'weekend_overlap', coalesce((m.match_reasons ->> 'weekend_overlap')::int, 0),
    'overlap_hours', coalesce(m.match_reasons -> 'overlap_hours', '[]'::jsonb),
    'same_country', coalesce((m.match_reasons ->> 'same_country')::boolean, false),
    'breakdown', coalesce(m.match_reasons -> 'breakdown', '{}'::jsonb));
$$;

-- ── API : mes correspondances ────────────────────────────────────────────
create or replace function public.get_matches(p_limit int default 12, p_offset int default 0)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_limit int := least(greatest(coalesce(p_limit, 12), 1), 48);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  select jsonb_build_object(
    'total', (select count(*) from public.matches m where v_uid in (m.user_a, m.user_b)),
    'items', coalesce((
      select jsonb_agg(t.item order by t.score desc, t.updated_at desc)
      from (
        select private.match_item(m, v_uid) as item,
               m.compatibility_score as score, m.updated_at
        from public.matches m
        where v_uid in (m.user_a, m.user_b)
        order by m.compatibility_score desc, m.updated_at desc
        limit v_limit offset v_offset
      ) t), '[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;

-- Correspondance avec une personne précise (affichée sur son profil).
create or replace function public.get_match_with(p_user uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches;
begin
  if v_uid is null or p_user is null or p_user = v_uid then
    return null;
  end if;
  select * into v_match from public.matches
  where user_a = least(v_uid, p_user) and user_b = greatest(v_uid, p_user);
  if not found then
    return null;
  end if;
  return private.match_item(v_match, v_uid);
end;
$$;

-- ── API : mes compétences ────────────────────────────────────────────────
-- p_items : [{"skill_id": "...", "level": "advanced"}, ...]
-- p_kind  : limite le remplacement à un type de compétence (accueil par étapes).
create or replace function public.set_my_skills(p_type text, p_items jsonb, p_kind text default null)
returns int
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
  v_count int;
begin
  if p_type is null or p_type not in ('offered', 'wanted') then
    raise exception 'invalid_input';
  end if;
  if p_kind is not null and p_kind not in ('competence', 'technology') then
    raise exception 'invalid_input';
  end if;
  if jsonb_typeof(v_items) <> 'array' then
    raise exception 'invalid_input';
  end if;
  if jsonb_array_length(v_items) > 30 then
    raise exception 'too_many_skills';
  end if;

  delete from public.user_skills us
  using public.skills s
  where us.skill_id = s.id
    and us.user_id = v_uid
    and us.skill_type = p_type
    and (p_kind is null or s.kind = p_kind);

  insert into public.user_skills (user_id, skill_id, skill_type, skill_level)
  select distinct on (s.id)
    v_uid, s.id, p_type,
    case
      when i.level in ('beginner', 'intermediate', 'advanced', 'expert') then i.level
      when p_type = 'offered' then 'intermediate'
      else null
    end
  from jsonb_to_recordset(v_items) as i(skill_id uuid, level text)
  join public.skills s on s.id = i.skill_id
  where p_kind is null or s.kind = p_kind
  on conflict (user_id, skill_id, skill_type) do update set skill_level = excluded.skill_level;

  select count(*) into v_count from public.user_skills
  where user_id = v_uid and skill_type = p_type;
  if v_count > 30 then
    raise exception 'too_many_skills';
  end if;

  -- Recalcule la complétion du profil, puis les correspondances.
  update public.profiles set updated_at = now() where id = v_uid;
  perform private.refresh_matches_for(v_uid);
  return v_count;
end;
$$;

-- Recalcule mes correspondances à la demande (bouton « Actualiser »).
create or replace function public.refresh_my_matches()
returns int
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
begin
  return private.refresh_matches_for(v_uid, false);
end;
$$;

-- ▼▼▼ 20261113090300_exchange_api.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 04 · Parcours d'échange (écritures)
-- Toutes les écritures sensibles passent par ces fonctions : elles vérifient
-- l'identité, les droits et l'état avant d'agir. Le navigateur n'écrit jamais
-- directement dans ces tables.
-- ═════════════════════════════════════════════════════════════════════════

-- ── Annonces ─────────────────────────────────────────────────────────────
create or replace function public.save_offer(
  p_id uuid,
  p_title text,
  p_description text,
  p_exchange_type text,
  p_collaboration_type text,
  p_estimated_duration text,
  p_desired_level text,
  p_availability text[],
  p_language text,
  p_country text,
  p_links text[],
  p_conditions text,
  p_proposed uuid[],
  p_requested uuid[],
  p_related uuid[],
  p_urgent boolean default false)
returns uuid
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_profile public.profiles;
  v_urgent boolean := coalesce(p_urgent, false);
  r record;
  v_id uuid;
  v_proposed uuid[];
  v_requested uuid[];
  v_related uuid[];
  v_links text[] := coalesce(p_links, '{}'::text[]);
begin
  select coalesce(array_agg(id), '{}') into v_proposed
  from public.skills where id = any(coalesce(p_proposed, '{}'::uuid[]));
  select coalesce(array_agg(id), '{}') into v_requested
  from public.skills where id = any(coalesce(p_requested, '{}'::uuid[]));
  select coalesce(array_agg(id), '{}') into v_related
  from public.skills
  where id = any(coalesce(p_related, '{}'::uuid[]))
    and id <> all(v_proposed) and id <> all(v_requested);

  if cardinality(v_proposed) > 6 or cardinality(v_requested) > 6 or cardinality(v_related) > 8 then
    raise exception 'too_many_skills';
  end if;
  if cardinality(v_proposed) = 0 and cardinality(v_requested) = 0 then
    raise exception 'offer_needs_skills';
  end if;
  if p_exchange_type = 'reciprocal' and (cardinality(v_proposed) = 0 or cardinality(v_requested) = 0) then
    raise exception 'offer_needs_both_skills';
  end if;
  if not private.valid_links(v_links) then
    raise exception 'invalid_link';
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  if p_id is null then
    if (select count(*) from public.exchange_offers
        where user_id = v_uid and created_at > now() - interval '1 day') >= 10 then
      raise exception 'rate_limited';
    end if;
    if v_urgent then
      -- Une demande express dit précisément sur quoi on est bloqué.
      if p_exchange_type <> 'one_off' or cardinality(v_requested) = 0 then
        raise exception 'urgent_needs_request';
      end if;
      if (select count(*) from public.exchange_offers
          where user_id = v_uid and is_urgent and created_at > now() - interval '1 day') >= 3 then
        raise exception 'rate_limited';
      end if;
    end if;
    insert into public.exchange_offers (
      user_id, title, description, exchange_type, collaboration_type, estimated_duration,
      desired_level, availability, language, country, links, conditions, is_urgent, is_demo)
    values (
      v_uid, btrim(p_title), btrim(p_description), p_exchange_type, p_collaboration_type,
      p_estimated_duration, coalesce(p_desired_level, 'any'), coalesce(p_availability, '{}'::text[]),
      coalesce(lower(private.clean_text(p_language)), 'fr'),
      coalesce(upper(private.clean_text(p_country)), v_profile.country),
      v_links, private.clean_text(p_conditions), v_urgent, v_profile.is_demo)
    returning id into v_id;
    perform private.log_activity(v_uid, 'offer_published', 'offer', v_id,
      jsonb_build_object('title', btrim(p_title)));
  else
    update public.exchange_offers set
      title = btrim(p_title),
      description = btrim(p_description),
      exchange_type = p_exchange_type,
      collaboration_type = p_collaboration_type,
      estimated_duration = p_estimated_duration,
      desired_level = coalesce(p_desired_level, 'any'),
      availability = coalesce(p_availability, '{}'::text[]),
      language = coalesce(lower(private.clean_text(p_language)), 'fr'),
      country = coalesce(upper(private.clean_text(p_country)), v_profile.country),
      links = v_links,
      conditions = private.clean_text(p_conditions)
    where id = p_id and user_id = v_uid and status in ('open', 'paused', 'closed')
    returning id into v_id;
    if v_id is null then
      raise exception 'offer_not_found';
    end if;
    delete from public.offer_skills where offer_id = v_id;
  end if;

  insert into public.offer_skills (offer_id, skill_id, role)
  select v_id, s, 'proposed' from unnest(v_proposed) as s
  union all
  select v_id, s, 'requested' from unnest(v_requested) as s
  union all
  select v_id, s, 'related' from unnest(v_related) as s;

  -- Demande express : on prévient jusqu'à 15 personnes qui proposent la
  -- compétence demandée, en commençant par celles qui parlent la même langue.
  if p_id is null and v_urgent then
    for r in
      select p.id
      from public.profiles p
      where p.status = 'active' and p.id <> v_uid
        and exists (
          select 1 from public.user_skills us
          where us.user_id = p.id and us.skill_type = 'offered' and us.skill_id = any(v_requested))
      order by (p.languages && v_profile.languages) desc, random()
      limit 15
    loop
      perform private.notify(
        r.id, 'help_request',
        private.full_name(v_uid) || ' a besoin d''un coup de main',
        btrim(p_title), 'offer', v_id, '/annonces/' || v_id, v_uid);
    end loop;
  end if;

  return v_id;
end;
$$;

-- open ⇄ paused ⇄ closed, ou « deleted » (suppression par l'auteur, sans retour).
create or replace function public.set_offer_status(p_id uuid, p_status text)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_current text;
begin
  if p_status is null or p_status not in ('open', 'paused', 'closed', 'deleted') then
    raise exception 'invalid_input';
  end if;
  select status into v_current from public.exchange_offers
  where id = p_id and user_id = v_uid for update;
  if v_current is null or v_current in ('removed', 'deleted') then
    raise exception 'offer_not_found';
  end if;
  update public.exchange_offers set status = p_status where id = p_id;
  if p_status in ('closed', 'deleted') then
    -- Les propositions encore en attente sur cette annonce deviennent sans objet.
    update public.exchange_proposals
      set status = 'cancelled', responded_at = now(),
          response_note = 'Annonce clôturée par son auteur.'
    where offer_id = p_id and status in ('pending', 'changes_requested');
  end if;
end;
$$;

-- ── Propositions ─────────────────────────────────────────────────────────
create or replace function public.send_proposal(
  p_receiver_id uuid,
  p_offer_id uuid,
  p_message text,
  p_offered uuid[],
  p_requested uuid[])
returns uuid
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_offer public.exchange_offers;
  v_offered uuid[];
  v_requested uuid[];
  v_id uuid;
  v_conv uuid;
  v_is_demo boolean;
begin
  if p_receiver_id is null or p_receiver_id = v_uid then
    raise exception 'cannot_propose_to_self';
  end if;
  if not exists (select 1 from public.profiles where id = p_receiver_id and status = 'active') then
    raise exception 'receiver_unavailable';
  end if;

  select coalesce(array_agg(id), '{}') into v_offered
  from public.skills where id = any(coalesce(p_offered, '{}'::uuid[]));
  select coalesce(array_agg(id), '{}') into v_requested
  from public.skills where id = any(coalesce(p_requested, '{}'::uuid[]));
  if cardinality(v_offered) > 8 or cardinality(v_requested) > 8 then
    raise exception 'too_many_skills';
  end if;
  if cardinality(v_offered) = 0 and cardinality(v_requested) = 0 then
    raise exception 'proposal_needs_skills';
  end if;

  if p_offer_id is not null then
    select * into v_offer from public.exchange_offers where id = p_offer_id;
    if not found or v_offer.status <> 'open' then
      raise exception 'offer_not_open';
    end if;
    if v_offer.user_id <> p_receiver_id then
      raise exception 'invalid_input';
    end if;
    if v_offer.exchange_type = 'reciprocal'
       and (cardinality(v_offered) = 0 or cardinality(v_requested) = 0) then
      raise exception 'proposal_needs_both_skills';
    end if;
    if exists (select 1 from public.exchange_proposals
               where sender_id = v_uid and offer_id = p_offer_id
                 and status in ('pending', 'changes_requested')) then
      raise exception 'proposal_already_exists';
    end if;
  else
    if exists (select 1 from public.exchange_proposals
               where sender_id = v_uid and receiver_id = p_receiver_id and offer_id is null
                 and status in ('pending', 'changes_requested')) then
      raise exception 'proposal_already_exists';
    end if;
  end if;

  if (select count(*) from public.exchange_proposals
      where sender_id = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate_limited';
  end if;

  select is_demo into v_is_demo from public.profiles where id = v_uid;

  insert into public.exchange_proposals (offer_id, sender_id, receiver_id, message, is_demo)
  values (p_offer_id, v_uid, p_receiver_id, btrim(p_message), coalesce(v_is_demo, false))
  returning id into v_id;

  insert into public.proposal_skills (proposal_id, skill_id, role)
  select v_id, s, 'offered' from unnest(v_offered) as s
  union all
  select v_id, s, 'requested' from unnest(v_requested) as s;

  -- La proposition ouvre la conversation ; son message en est le premier.
  v_conv := private.ensure_conversation(v_uid, p_receiver_id);
  perform set_config('devbridge.silent_message', 'on', true);
  insert into public.messages (conversation_id, sender_id, content)
  values (v_conv, v_uid, btrim(p_message));
  perform set_config('devbridge.silent_message', 'off', true);

  update public.matches set status = 'contacted'
  where user_a = least(v_uid, p_receiver_id) and user_b = greatest(v_uid, p_receiver_id);

  perform private.notify(
    p_receiver_id, 'proposal_received',
    private.full_name(v_uid) || ' te propose un échange',
    left(btrim(p_message), 140),
    'proposal', v_id, '/propositions/' || v_id, v_uid);
  perform private.log_activity(v_uid, 'proposal_sent', 'proposal', v_id,
    jsonb_build_object('to', private.full_name(p_receiver_id)));

  return v_id;
end;
$$;

-- L'expéditeur modifie sa proposition (après une demande de modification, ou
-- tant qu'elle est en attente) : elle repart « en attente » chez le destinataire.
create or replace function public.update_proposal(
  p_id uuid,
  p_message text,
  p_offered uuid[],
  p_requested uuid[])
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_p public.exchange_proposals;
  v_offered uuid[];
  v_requested uuid[];
  v_type text;
begin
  select * into v_p from public.exchange_proposals where id = p_id for update;
  if not found or v_p.sender_id <> v_uid then
    raise exception 'proposal_not_found';
  end if;
  if v_p.status not in ('pending', 'changes_requested') then
    raise exception 'proposal_not_editable';
  end if;

  select coalesce(array_agg(id), '{}') into v_offered
  from public.skills where id = any(coalesce(p_offered, '{}'::uuid[]));
  select coalesce(array_agg(id), '{}') into v_requested
  from public.skills where id = any(coalesce(p_requested, '{}'::uuid[]));
  if cardinality(v_offered) > 8 or cardinality(v_requested) > 8 then
    raise exception 'too_many_skills';
  end if;
  if cardinality(v_offered) = 0 and cardinality(v_requested) = 0 then
    raise exception 'proposal_needs_skills';
  end if;
  select exchange_type into v_type from public.exchange_offers where id = v_p.offer_id;
  if v_type = 'reciprocal' and (cardinality(v_offered) = 0 or cardinality(v_requested) = 0) then
    raise exception 'proposal_needs_both_skills';
  end if;

  update public.exchange_proposals
    set message = btrim(p_message), status = 'pending', responded_at = null
  where id = p_id;

  delete from public.proposal_skills where proposal_id = p_id;
  insert into public.proposal_skills (proposal_id, skill_id, role)
  select p_id, s, 'offered' from unnest(v_offered) as s
  union all
  select p_id, s, 'requested' from unnest(v_requested) as s;

  perform private.notify(
    v_p.receiver_id, 'proposal_updated',
    private.full_name(v_uid) || ' a mis à jour sa proposition',
    left(btrim(p_message), 140),
    'proposal', p_id, '/propositions/' || p_id, v_uid);
end;
$$;

create or replace function public.cancel_proposal(p_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_p public.exchange_proposals;
begin
  select * into v_p from public.exchange_proposals where id = p_id for update;
  if not found or v_p.sender_id <> v_uid then
    raise exception 'proposal_not_found';
  end if;
  if v_p.status not in ('pending', 'changes_requested') then
    raise exception 'proposal_not_editable';
  end if;
  update public.exchange_proposals set status = 'cancelled', responded_at = now() where id = p_id;
  perform private.notify(
    v_p.receiver_id, 'proposal_cancelled',
    private.full_name(v_uid) || ' a annulé sa proposition',
    null, 'proposal', p_id, '/propositions/' || p_id, v_uid);
end;
$$;

-- Réponse du destinataire : accept | decline | request_changes.
-- La collaboration n'est créée QUE par une acceptation explicite : l'expéditeur
-- a consenti en envoyant, le destinataire consent en acceptant.
create or replace function public.respond_to_proposal(p_id uuid, p_action text, p_note text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_p public.exchange_proposals;
  v_offer public.exchange_offers;
  v_note text := private.clean_text(p_note);
  v_gives text;
  v_wants text;
  v_title text;
  v_type text;
  v_collab uuid;
begin
  if p_action is null or p_action not in ('accept', 'decline', 'request_changes') then
    raise exception 'invalid_input';
  end if;
  select * into v_p from public.exchange_proposals where id = p_id for update;
  if not found or v_p.receiver_id <> v_uid then
    raise exception 'proposal_not_found';
  end if;
  if v_p.status <> 'pending' then
    raise exception 'proposal_not_pending';
  end if;

  if p_action = 'decline' then
    update public.exchange_proposals
      set status = 'declined', response_note = v_note, responded_at = now()
    where id = p_id;
    perform private.notify(
      v_p.sender_id, 'proposal_declined',
      private.full_name(v_uid) || ' a décliné ta proposition',
      v_note, 'proposal', p_id, '/propositions/' || p_id, v_uid);
    return jsonb_build_object('status', 'declined', 'collaboration_id', null);
  end if;

  if p_action = 'request_changes' then
    if v_note is null or char_length(v_note) < 10 then
      raise exception 'note_required';
    end if;
    update public.exchange_proposals
      set status = 'changes_requested', response_note = v_note, responded_at = now()
    where id = p_id;
    perform private.notify(
      v_p.sender_id, 'proposal_changes_requested',
      private.full_name(v_uid) || ' demande une modification',
      v_note, 'proposal', p_id, '/propositions/' || p_id, v_uid);
    return jsonb_build_object('status', 'changes_requested', 'collaboration_id', null);
  end if;

  -- Acceptation
  if not exists (select 1 from public.profiles where id = v_p.sender_id and status = 'active') then
    raise exception 'receiver_unavailable';
  end if;

  update public.exchange_proposals
    set status = 'accepted', response_note = v_note, responded_at = now()
  where id = p_id;

  if v_p.offer_id is not null then
    select * into v_offer from public.exchange_offers where id = v_p.offer_id;
  end if;

  select string_agg(s.name, ', ' order by s.name) into v_gives
  from public.proposal_skills ps join public.skills s on s.id = ps.skill_id
  where ps.proposal_id = p_id and ps.role = 'offered';
  select string_agg(s.name, ', ' order by s.name) into v_wants
  from public.proposal_skills ps join public.skills s on s.id = ps.skill_id
  where ps.proposal_id = p_id and ps.role = 'requested';

  v_title := coalesce(v_offer.title, case
    when v_gives is not null and v_wants is not null then 'Échange ' || v_gives || ' ⇄ ' || v_wants
    when v_wants is not null then 'Accompagnement ' || v_wants
    else 'Accompagnement ' || coalesce(v_gives, 'technique')
  end);
  v_type := coalesce(v_offer.exchange_type, case
    when v_gives is not null and v_wants is not null then 'reciprocal' else 'one_off' end);

  insert into public.collaborations (proposal_id, offer_id, title, description, exchange_type, is_demo)
  values (p_id, v_offer.id, left(v_title, 140), v_offer.description, v_type, v_p.is_demo)
  returning id into v_collab;

  insert into public.collaboration_members (collaboration_id, user_id, role)
  values (v_collab, v_p.sender_id, 'initiator'), (v_collab, v_p.receiver_id, 'partner');

  perform private.ensure_conversation(v_p.sender_id, v_p.receiver_id);

  update public.matches set status = 'contacted'
  where user_a = least(v_p.sender_id, v_p.receiver_id)
    and user_b = greatest(v_p.sender_id, v_p.receiver_id);

  perform private.notify(
    v_p.sender_id, 'proposal_accepted',
    private.full_name(v_uid) || ' a accepté ta proposition',
    'Votre espace de collaboration est prêt : ' || left(v_title, 100),
    'collaboration', v_collab, '/collaborations/' || v_collab, v_uid);

  perform private.log_activity(v_p.sender_id, 'collaboration_started', 'collaboration', v_collab,
    jsonb_build_object('title', left(v_title, 140), 'with', private.full_name(v_p.receiver_id)));
  perform private.log_activity(v_p.receiver_id, 'collaboration_started', 'collaboration', v_collab,
    jsonb_build_object('title', left(v_title, 140), 'with', private.full_name(v_p.sender_id)));

  return jsonb_build_object('status', 'accepted', 'collaboration_id', v_collab);
end;
$$;

-- ── Collaborations ───────────────────────────────────────────────────────
-- Verrouille une collaboration et vérifie que l'appelant en est membre.
create or replace function private.lock_collaboration(p_id uuid, p_user uuid, p_must_be_active boolean default true)
returns public.collaborations
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_c public.collaborations;
begin
  select * into v_c from public.collaborations where id = p_id for update;
  if not found or not private.is_collab_member(p_id, p_user) then
    raise exception 'collaboration_not_found';
  end if;
  if p_must_be_active and v_c.status <> 'active' then
    raise exception 'collaboration_not_active';
  end if;
  return v_c;
end;
$$;

create or replace function private.other_member(p_collaboration uuid, p_user uuid)
returns uuid
language sql stable security definer
set search_path = public, pg_temp
as $$
  select m.user_id from public.collaboration_members m
  where m.collaboration_id = p_collaboration and m.user_id <> p_user
  limit 1;
$$;

-- Un fichier joint doit se trouver dans le dossier de la collaboration,
-- sous le dossier de la personne qui l'a envoyé.
create or replace function private.valid_attachment(p_path text, p_collaboration uuid, p_user uuid)
returns boolean
language sql immutable
as $$
  select p_path is null
      or p_path like p_collaboration::text || '/' || p_user::text || '/%';
$$;

create or replace function public.update_collaboration(
  p_id uuid, p_title text, p_description text, p_objectives text)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
begin
  perform private.lock_collaboration(p_id, v_uid);
  update public.collaborations set
    title = btrim(p_title),
    description = private.clean_text(p_description),
    objectives = private.clean_text(p_objectives)
  where id = p_id;
end;
$$;

create or replace function public.create_task(
  p_collaboration_id uuid,
  p_title text,
  p_description text,
  p_assigned_to uuid,
  p_priority text,
  p_due_date date,
  p_links text[],
  p_attachment_path text)
returns uuid
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_c public.collaborations;
  v_id uuid;
  v_links text[] := coalesce(p_links, '{}'::text[]);
  v_path text := private.clean_text(p_attachment_path);
begin
  v_c := private.lock_collaboration(p_collaboration_id, v_uid);
  if p_assigned_to is null or not private.is_collab_member(p_collaboration_id, p_assigned_to) then
    raise exception 'assignee_not_member';
  end if;
  if not private.valid_links(v_links) then
    raise exception 'invalid_link';
  end if;
  if not private.valid_attachment(v_path, p_collaboration_id, v_uid) then
    raise exception 'invalid_attachment';
  end if;
  if (select count(*) from public.tasks where collaboration_id = p_collaboration_id) >= 100 then
    raise exception 'rate_limited';
  end if;

  insert into public.tasks (
    collaboration_id, title, description, created_by, assigned_to, priority, due_date, links, attachment_path)
  values (
    p_collaboration_id, btrim(p_title), private.clean_text(p_description), v_uid, p_assigned_to,
    coalesce(p_priority, 'medium'), p_due_date, v_links, v_path)
  returning id into v_id;

  -- Une nouvelle tâche remet en cause une clôture en attente de confirmation.
  update public.collaboration_members set completion_confirmed_at = null
  where collaboration_id = p_collaboration_id;

  if p_assigned_to <> v_uid then
    perform private.notify(
      p_assigned_to, 'task_assigned',
      private.full_name(v_uid) || ' t''a confié une tâche',
      btrim(p_title), 'collaboration', p_collaboration_id,
      '/collaborations/' || p_collaboration_id || '?tache=' || v_id, v_uid);
  end if;
  perform private.log_activity(v_uid, 'task_created', 'task', v_id,
    jsonb_build_object('title', btrim(p_title), 'collaboration_id', p_collaboration_id));
  return v_id;
end;
$$;

-- Plan de départ : propose en un clic des premières tâches adaptées à
-- l'échange, pour ne jamais rester devant un tableau vide.
create or replace function public.apply_starter_plan(p_collaboration_id uuid)
returns int
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_c public.collaborations;
  v_p public.exchange_proposals;
  v_sender_gives text;
  v_receiver_gives text;
  v_count int;
begin
  v_c := private.lock_collaboration(p_collaboration_id, v_uid);
  if exists (select 1 from public.tasks where collaboration_id = p_collaboration_id) then
    raise exception 'plan_needs_empty_board';
  end if;
  select * into v_p from public.exchange_proposals where id = v_c.proposal_id;
  select string_agg(s.name, ', ' order by s.name) into v_sender_gives
  from public.proposal_skills ps join public.skills s on s.id = ps.skill_id
  where ps.proposal_id = v_p.id and ps.role = 'offered';
  select string_agg(s.name, ', ' order by s.name) into v_receiver_gives
  from public.proposal_skills ps join public.skills s on s.id = ps.skill_id
  where ps.proposal_id = v_p.id and ps.role = 'requested';

  insert into public.tasks (collaboration_id, title, description, created_by, assigned_to, priority)
  values (p_collaboration_id, 'Cadrage : objectif, rythme et outils',
    'Se mettre d''accord sur le résultat attendu, les créneaux de travail et les outils (dépôt, appels, messagerie).',
    v_uid, v_p.sender_id, 'high');

  if v_sender_gives is not null then
    insert into public.tasks (collaboration_id, title, description, created_by, assigned_to, priority)
    values
      (p_collaboration_id, left('Transmettre : ' || v_sender_gives, 140),
       'Préparer et animer une séance de travail. Livrable : notes, exemple de code ou enregistrement.',
       v_uid, v_p.sender_id, 'medium'),
      (p_collaboration_id, left('Mettre en pratique : ' || v_sender_gives, 140),
       'Réaliser un petit résultat concret avec ce qui a été vu. Livrable : lien vers le code ou capture.',
       v_uid, v_p.receiver_id, 'medium');
  end if;
  if v_receiver_gives is not null then
    insert into public.tasks (collaboration_id, title, description, created_by, assigned_to, priority)
    values
      (p_collaboration_id, left('Transmettre : ' || v_receiver_gives, 140),
       'Préparer et animer une séance de travail. Livrable : notes, exemple de code ou enregistrement.',
       v_uid, v_p.receiver_id, 'medium'),
      (p_collaboration_id, left('Mettre en pratique : ' || v_receiver_gives, 140),
       'Réaliser un petit résultat concret avec ce qui a été vu. Livrable : lien vers le code ou capture.',
       v_uid, v_p.sender_id, 'medium');
  end if;

  select count(*) into v_count from public.tasks where collaboration_id = p_collaboration_id;
  perform private.notify(
    private.other_member(p_collaboration_id, v_uid), 'task_assigned',
    private.full_name(v_uid) || ' a proposé un plan de départ',
    v_count || ' tâches ont été ajoutées à « ' || left(v_c.title, 100) || ' ».',
    'collaboration', p_collaboration_id, '/collaborations/' || p_collaboration_id, v_uid);
  return v_count;
end;
$$;

create or replace function public.update_task(
  p_id uuid,
  p_title text,
  p_description text,
  p_assigned_to uuid,
  p_priority text,
  p_due_date date,
  p_links text[],
  p_attachment_path text)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_t public.tasks;
  v_links text[] := coalesce(p_links, '{}'::text[]);
  v_path text := private.clean_text(p_attachment_path);
begin
  select * into v_t from public.tasks where id = p_id;
  if not found then
    raise exception 'task_not_found';
  end if;
  perform private.lock_collaboration(v_t.collaboration_id, v_uid);
  if v_t.status not in ('todo', 'in_progress') then
    raise exception 'task_locked';
  end if;
  if p_assigned_to is null or not private.is_collab_member(v_t.collaboration_id, p_assigned_to) then
    raise exception 'assignee_not_member';
  end if;
  if not private.valid_links(v_links) then
    raise exception 'invalid_link';
  end if;
  -- On peut conserver le fichier déjà joint, ou en joindre un nouveau à soi.
  if v_path is distinct from v_t.attachment_path
     and not private.valid_attachment(v_path, v_t.collaboration_id, v_uid) then
    raise exception 'invalid_attachment';
  end if;

  update public.tasks set
    title = btrim(p_title),
    description = private.clean_text(p_description),
    assigned_to = p_assigned_to,
    priority = coalesce(p_priority, priority),
    due_date = p_due_date,
    links = v_links,
    attachment_path = v_path
  where id = p_id;

  if p_assigned_to <> v_t.assigned_to and p_assigned_to <> v_uid then
    perform private.notify(
      p_assigned_to, 'task_assigned',
      private.full_name(v_uid) || ' t''a confié une tâche',
      btrim(p_title), 'collaboration', v_t.collaboration_id,
      '/collaborations/' || v_t.collaboration_id || '?tache=' || p_id, v_uid);
  end if;
end;
$$;

-- Passage « à faire » ⇄ « en cours ». Les états « en révision » et « terminée »
-- ne s'obtiennent que par la soumission puis la validation d'un livrable.
create or replace function public.set_task_status(p_id uuid, p_status text)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_t public.tasks;
begin
  if p_status is null or p_status not in ('todo', 'in_progress') then
    raise exception 'invalid_input';
  end if;
  select * into v_t from public.tasks where id = p_id;
  if not found then
    raise exception 'task_not_found';
  end if;
  perform private.lock_collaboration(v_t.collaboration_id, v_uid);
  if v_t.status not in ('todo', 'in_progress') then
    raise exception 'task_locked';
  end if;
  update public.tasks set status = p_status where id = p_id;
end;
$$;

create or replace function public.delete_task(p_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_t public.tasks;
begin
  select * into v_t from public.tasks where id = p_id;
  if not found then
    raise exception 'task_not_found';
  end if;
  perform private.lock_collaboration(v_t.collaboration_id, v_uid);
  if v_t.status not in ('todo', 'in_progress') then
    raise exception 'task_locked';
  end if;
  if exists (select 1 from public.deliverables where task_id = p_id) then
    raise exception 'task_has_history';
  end if;
  delete from public.tasks where id = p_id;
end;
$$;

-- ── Livrables ────────────────────────────────────────────────────────────
create or replace function public.submit_deliverable(
  p_task_id uuid,
  p_description text,
  p_external_url text,
  p_attachment_path text)
returns uuid
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_t public.tasks;
  v_id uuid;
  v_reviewer uuid;
  v_path text := private.clean_text(p_attachment_path);
begin
  select * into v_t from public.tasks where id = p_task_id;
  if not found then
    raise exception 'task_not_found';
  end if;
  perform private.lock_collaboration(v_t.collaboration_id, v_uid);
  if v_t.assigned_to <> v_uid then
    raise exception 'not_task_assignee';
  end if;
  if v_t.status not in ('todo', 'in_progress') then
    raise exception 'task_locked';
  end if;
  if not private.valid_attachment(v_path, v_t.collaboration_id, v_uid) then
    raise exception 'invalid_attachment';
  end if;

  insert into public.deliverables (task_id, submitted_by, description, external_url, attachment_path)
  values (p_task_id, v_uid, btrim(p_description), private.clean_text(p_external_url), v_path)
  returning id into v_id;

  update public.tasks set status = 'in_review' where id = p_task_id;

  v_reviewer := private.other_member(v_t.collaboration_id, v_uid);
  perform private.notify(
    v_reviewer, 'deliverable_to_review',
    private.full_name(v_uid) || ' a soumis un livrable à valider',
    v_t.title, 'collaboration', v_t.collaboration_id,
    '/collaborations/' || v_t.collaboration_id || '?tache=' || p_task_id, v_uid);
  perform private.log_activity(v_uid, 'deliverable_submitted', 'task', p_task_id,
    jsonb_build_object('title', v_t.title, 'collaboration_id', v_t.collaboration_id));
  return v_id;
end;
$$;

-- Décision de l'autre participant : approve | request_changes.
create or replace function public.review_deliverable(p_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_d public.deliverables;
  v_t public.tasks;
  v_note text := private.clean_text(p_note);
begin
  if p_decision is null or p_decision not in ('approve', 'request_changes') then
    raise exception 'invalid_input';
  end if;
  select * into v_d from public.deliverables where id = p_id for update;
  if not found then
    raise exception 'deliverable_not_found';
  end if;
  select * into v_t from public.tasks where id = v_d.task_id;
  perform private.lock_collaboration(v_t.collaboration_id, v_uid);
  -- On ne valide jamais son propre travail.
  if v_d.submitted_by = v_uid then
    raise exception 'cannot_review_own_deliverable';
  end if;
  if v_d.validation_status <> 'pending' then
    raise exception 'deliverable_already_reviewed';
  end if;

  if p_decision = 'approve' then
    update public.deliverables
      set validation_status = 'approved', reviewed_by = v_uid, review_note = v_note, reviewed_at = now()
    where id = p_id;
    update public.tasks set status = 'done' where id = v_t.id;
    perform private.notify(
      v_d.submitted_by, 'task_completed',
      private.full_name(v_uid) || ' a validé ton livrable',
      v_t.title, 'collaboration', v_t.collaboration_id,
      '/collaborations/' || v_t.collaboration_id || '?tache=' || v_t.id, v_uid);
    perform private.log_activity(v_d.submitted_by, 'task_validated', 'task', v_t.id,
      jsonb_build_object('title', v_t.title, 'collaboration_id', v_t.collaboration_id));
    perform private.log_activity(v_uid, 'deliverable_reviewed', 'task', v_t.id,
      jsonb_build_object('title', v_t.title, 'collaboration_id', v_t.collaboration_id, 'decision', 'approved'));
  else
    if v_note is null or char_length(v_note) < 10 then
      raise exception 'note_required';
    end if;
    update public.deliverables
      set validation_status = 'changes_requested', reviewed_by = v_uid, review_note = v_note, reviewed_at = now()
    where id = p_id;
    update public.tasks set status = 'in_progress' where id = v_t.id;
    perform private.notify(
      v_d.submitted_by, 'deliverable_changes_requested',
      private.full_name(v_uid) || ' demande une correction',
      v_t.title, 'collaboration', v_t.collaboration_id,
      '/collaborations/' || v_t.collaboration_id || '?tache=' || v_t.id, v_uid);
    perform private.log_activity(v_uid, 'deliverable_reviewed', 'task', v_t.id,
      jsonb_build_object('title', v_t.title, 'collaboration_id', v_t.collaboration_id, 'decision', 'changes_requested'));
  end if;
end;
$$;

-- Clôture : possible seulement quand toutes les tâches prévues sont validées,
-- et effective seulement quand les deux participants l'ont confirmée.
create or replace function public.confirm_completion(p_collaboration_id uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_c public.collaborations;
  v_total int;
  v_done int;
  v_pending int;
  v_other uuid;
  m record;
begin
  v_c := private.lock_collaboration(p_collaboration_id, v_uid);
  select count(*), count(*) filter (where status = 'done') into v_total, v_done
  from public.tasks where collaboration_id = p_collaboration_id;
  if v_total = 0 then
    raise exception 'no_tasks';
  end if;
  if v_done < v_total then
    raise exception 'deliverables_not_validated';
  end if;

  update public.collaboration_members set completion_confirmed_at = coalesce(completion_confirmed_at, now())
  where collaboration_id = p_collaboration_id and user_id = v_uid;

  select count(*) into v_pending from public.collaboration_members
  where collaboration_id = p_collaboration_id and completion_confirmed_at is null;
  v_other := private.other_member(p_collaboration_id, v_uid);

  if v_pending > 0 then
    perform private.notify(
      v_other, 'completion_requested',
      private.full_name(v_uid) || ' propose de clôturer l''échange',
      'Tous les livrables sont validés. Confirme la fin de « ' || left(v_c.title, 100) || ' ».',
      'collaboration', p_collaboration_id, '/collaborations/' || p_collaboration_id, v_uid);
    return jsonb_build_object('status', 'active', 'waiting_for_partner', true);
  end if;

  update public.collaborations
    set status = 'completed', end_date = current_date, completed_at = now()
  where id = p_collaboration_id;

  for m in select user_id from public.collaboration_members where collaboration_id = p_collaboration_id loop
    perform private.notify(
      m.user_id, 'collaboration_completed',
      'Échange terminé : ' || left(v_c.title, 120),
      'Bravo ! Prends un instant pour évaluer cette collaboration.',
      'collaboration', p_collaboration_id, '/collaborations/' || p_collaboration_id,
      case when m.user_id = v_uid then v_other else v_uid end);
    perform private.log_activity(m.user_id, 'collaboration_completed', 'collaboration', p_collaboration_id,
      jsonb_build_object('title', v_c.title,
        'with', private.full_name(private.other_member(p_collaboration_id, m.user_id))));
  end loop;

  return jsonb_build_object('status', 'completed', 'waiting_for_partner', false);
end;
$$;

create or replace function public.cancel_collaboration(p_collaboration_id uuid, p_reason text)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_c public.collaborations;
  v_reason text := private.clean_text(p_reason);
begin
  v_c := private.lock_collaboration(p_collaboration_id, v_uid);
  if v_reason is null or char_length(v_reason) < 10 then
    raise exception 'note_required';
  end if;
  update public.collaborations
    set status = 'cancelled', cancelled_by = v_uid, cancel_reason = v_reason, end_date = current_date
  where id = p_collaboration_id;
  perform private.notify(
    private.other_member(p_collaboration_id, v_uid), 'collaboration_cancelled',
    private.full_name(v_uid) || ' a mis fin à l''échange',
    left(v_reason, 200), 'collaboration', p_collaboration_id,
    '/collaborations/' || p_collaboration_id, v_uid);
end;
$$;

-- ── Évaluations ──────────────────────────────────────────────────────────
-- Protections : collaboration réellement terminée (livrables validés par
-- l'autre partie), une seule évaluation par personne et par collaboration,
-- jamais de soi-même.
create or replace function public.submit_review(
  p_collaboration_id uuid,
  p_communication int,
  p_reliability int,
  p_quality int,
  p_collaboration int,
  p_comment text)
returns uuid
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_c public.collaborations;
  v_other uuid;
  v_id uuid;
begin
  v_c := private.lock_collaboration(p_collaboration_id, v_uid, false);
  if v_c.status <> 'completed' then
    raise exception 'collaboration_not_completed';
  end if;
  if exists (select 1 from public.reviews
             where collaboration_id = p_collaboration_id and reviewer_id = v_uid) then
    raise exception 'review_already_exists';
  end if;
  v_other := private.other_member(p_collaboration_id, v_uid);
  if v_other is null then
    raise exception 'collaboration_not_found';
  end if;

  insert into public.reviews (
    collaboration_id, reviewer_id, reviewed_user_id,
    communication_rating, reliability_rating, quality_rating, collaboration_rating, comment)
  values (
    p_collaboration_id, v_uid, v_other,
    p_communication, p_reliability, p_quality, p_collaboration, private.clean_text(p_comment))
  returning id into v_id;

  perform private.notify(
    v_other, 'review_received',
    private.full_name(v_uid) || ' a évalué votre collaboration',
    left(v_c.title, 140), 'collaboration', p_collaboration_id,
    '/collaborations/' || p_collaboration_id, v_uid);
  perform private.log_activity(v_uid, 'review_given', 'collaboration', p_collaboration_id,
    jsonb_build_object('title', v_c.title));
  return v_id;
end;
$$;

-- ── Messagerie ───────────────────────────────────────────────────────────
create or replace function public.send_message(p_conversation_id uuid, p_content text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_msg public.messages;
begin
  if not private.is_conversation_member(p_conversation_id, v_uid) then
    raise exception 'conversation_not_found';
  end if;
  if private.clean_text(p_content) is null then
    raise exception 'invalid_input';
  end if;
  insert into public.messages (conversation_id, sender_id, content)
  values (p_conversation_id, v_uid, p_content)
  returning * into v_msg;
  return to_jsonb(v_msg);
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns int
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_count int;
begin
  if not private.is_conversation_member(p_conversation_id, v_uid) then
    raise exception 'conversation_not_found';
  end if;
  update public.messages set read_at = now()
  where conversation_id = p_conversation_id and sender_id <> v_uid and read_at is null;
  get diagnostics v_count = row_count;
  update public.notifications set is_read = true
  where user_id = v_uid and type = 'new_message'
    and related_entity_id = p_conversation_id and not is_read;
  return v_count;
end;
$$;

-- ── Notifications ────────────────────────────────────────────────────────
-- p_ids NULL : tout marquer comme lu.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns int
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_count int;
begin
  update public.notifications set is_read = true
  where user_id = v_uid and not is_read
    and (p_ids is null or id = any(p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── Signalements ─────────────────────────────────────────────────────────
create or replace function public.create_report(
  p_reported_user_id uuid,
  p_offer_id uuid,
  p_collaboration_id uuid,
  p_reason text,
  p_description text)
returns uuid
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_target uuid := p_reported_user_id;
  v_id uuid;
  a record;
begin
  if p_reported_user_id is null and p_offer_id is null and p_collaboration_id is null then
    raise exception 'invalid_input';
  end if;
  if p_collaboration_id is not null then
    if not private.is_collab_member(p_collaboration_id, v_uid) then
      raise exception 'collaboration_not_found';
    end if;
    v_target := coalesce(v_target, private.other_member(p_collaboration_id, v_uid));
  end if;
  if p_offer_id is not null then
    select coalesce(v_target, o.user_id) into v_target
    from public.exchange_offers o where o.id = p_offer_id;
    if not found then
      raise exception 'offer_not_found';
    end if;
  end if;
  if v_target = v_uid then
    raise exception 'cannot_report_self';
  end if;
  if (select count(*) from public.reports
      where reporter_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited';
  end if;

  insert into public.reports (reporter_id, reported_user_id, offer_id, collaboration_id, reason, description)
  values (v_uid, v_target, p_offer_id, p_collaboration_id, p_reason, btrim(p_description))
  returning id into v_id;

  for a in select user_id from public.app_admins loop
    perform private.notify(
      a.user_id, 'moderation', 'Nouveau signalement à examiner',
      left(btrim(p_description), 140), 'report', v_id, '/admin/signalements', v_uid);
  end loop;
  return v_id;
end;
$$;

-- ── Compte ───────────────────────────────────────────────────────────────
-- Suppression définitive : le compte et tout ce qui lui est rattaché.
create or replace function public.delete_my_account()
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  -- Les comptes de démonstration sont partagés : ils ne se suppriment que côté serveur.
  if exists (select 1 from public.profiles where id = v_uid and is_demo) then
    raise exception 'demo_account_locked';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

-- ▼▼▼ 20261113090400_read_api.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 05 · Lectures
-- Chaque fonction applique elle-même ses règles de visibilité et renvoie un
-- JSON prêt à afficher (un seul aller-retour par écran, pensé pour les
-- connexions lentes).
-- ═════════════════════════════════════════════════════════════════════════

-- ── Contexte de la personne connectée (barre de navigation) ──────────────
create or replace function public.viewer_context()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_p public.profiles;
begin
  if v_uid is null then
    return null;
  end if;
  select * into v_p from public.profiles where id = v_uid;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'profile', private.profile_card(v_uid) || jsonb_build_object(
      'onboarding_step', v_p.onboarding_step,
      'onboarding_completed_at', v_p.onboarding_completed_at),
    'is_admin', private.is_admin(v_uid),
    'unread_messages', (
      select count(*) from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where v_uid in (c.user_low, c.user_high) and m.sender_id <> v_uid and m.read_at is null),
    'unread_notifications', (
      select count(*) from public.notifications n where n.user_id = v_uid and not n.is_read),
    'pending_proposals', (
      select count(*) from public.exchange_proposals pr
      where pr.receiver_id = v_uid and pr.status = 'pending'));
end;
$$;

-- ── Annonces ─────────────────────────────────────────────────────────────
create or replace function public.search_offers(
  p_query text default null,
  p_skill_id uuid default null,
  p_technology_id uuid default null,
  p_country text default null,
  p_language text default null,
  p_exchange_type text default null,
  p_level text default null,
  p_availability text default null,
  p_since_days int default null,
  p_limit int default 12,
  p_offset int default 0,
  p_urgent boolean default null)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_pattern text := case when private.clean_text(p_query) is null then null
                         else private.like_pattern(left(p_query, 80)) end;
  v_limit int := least(greatest(coalesce(p_limit, 12), 1), 48);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  with base as (
    select o.id, o.created_at
    from public.exchange_offers o
    join public.profiles a on a.id = o.user_id and a.status = 'active'
    where o.status = 'open'
      and (v_pattern is null
           or o.title ilike v_pattern
           or o.description ilike v_pattern
           or exists (select 1 from public.offer_skills os
                      join public.skills s on s.id = os.skill_id
                      where os.offer_id = o.id and s.name ilike v_pattern))
      and (p_skill_id is null or exists (
            select 1 from public.offer_skills os where os.offer_id = o.id and os.skill_id = p_skill_id))
      and (p_technology_id is null or exists (
            select 1 from public.offer_skills os where os.offer_id = o.id and os.skill_id = p_technology_id))
      and (private.clean_text(p_country) is null or o.country = upper(p_country))
      and (private.clean_text(p_language) is null or o.language = lower(p_language))
      and (private.clean_text(p_exchange_type) is null or o.exchange_type = p_exchange_type)
      and (private.clean_text(p_level) is null or o.desired_level in (p_level, 'any'))
      and (private.clean_text(p_availability) is null or p_availability = any(o.availability))
      and (p_since_days is null or o.created_at > now() - make_interval(days => greatest(p_since_days, 1)))
      and (not coalesce(p_urgent, false)
           or (o.is_urgent and o.created_at > now() - interval '72 hours'))
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'items', coalesce((
      select jsonb_agg(private.offer_card(b.id) order by b.created_at desc)
      from (select * from base order by created_at desc limit v_limit offset v_offset) b
    ), '[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;

create or replace function public.get_offer(p_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_o public.exchange_offers;
  v_is_owner boolean;
  v_visible boolean;
begin
  select * into v_o from public.exchange_offers where id = p_id;
  if not found then
    return null;
  end if;
  v_is_owner := v_uid is not null and v_o.user_id = v_uid;
  v_visible := v_o.status in ('open', 'paused', 'closed')
            or (v_is_owner and v_o.status <> 'deleted')
            or (v_uid is not null and private.is_admin(v_uid));
  if not v_visible then
    return null;
  end if;
  return private.offer_card(v_o.id) || jsonb_build_object(
    'moderation_note', case when v_is_owner then v_o.moderation_note else null end,
    'author_card', private.profile_card(v_o.user_id),
    'viewer', jsonb_build_object(
      'is_owner', v_is_owner,
      'active_proposal_id', (
        select pr.id from public.exchange_proposals pr
        where v_uid is not null and pr.sender_id = v_uid and pr.offer_id = v_o.id
          and pr.status in ('pending', 'changes_requested')
        limit 1),
      'pending_proposals', case when v_is_owner then (
        select count(*) from public.exchange_proposals pr
        where pr.offer_id = v_o.id and pr.status = 'pending') else null end));
end;
$$;

create or replace function public.list_my_offers()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
begin
  return coalesce((
    select jsonb_agg(private.offer_card(o.id) || jsonb_build_object(
      'moderation_note', o.moderation_note,
      'proposals_total', (select count(*) from public.exchange_proposals pr where pr.offer_id = o.id),
      'proposals_pending', (select count(*) from public.exchange_proposals pr
                            where pr.offer_id = o.id and pr.status = 'pending'))
      order by o.created_at desc)
    from public.exchange_offers o
    where o.user_id = v_uid and o.status <> 'deleted'), '[]'::jsonb);
end;
$$;

-- Annonces dont les compétences croisent les miennes.
create or replace function public.recommended_offers(p_limit int default 6)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_limit int := least(greatest(coalesce(p_limit, 6), 1), 24);
begin
  return coalesce((
    select jsonb_agg(x.item order by x.hits desc, x.created_at desc)
    from (
      select
        private.offer_card(o.id) || jsonb_build_object(
          'match_proposed', private.skills_json(array(
            select os.skill_id from public.offer_skills os
            join public.user_skills us on us.skill_id = os.skill_id
              and us.user_id = v_uid and us.skill_type = 'wanted'
            where os.offer_id = o.id and os.role = 'proposed')),
          'match_requested', private.skills_json(array(
            select os.skill_id from public.offer_skills os
            join public.user_skills us on us.skill_id = os.skill_id
              and us.user_id = v_uid and us.skill_type = 'offered'
            where os.offer_id = o.id and os.role = 'requested'))) as item,
        h.hits,
        o.created_at
      from public.exchange_offers o
      join public.profiles a on a.id = o.user_id and a.status = 'active'
      cross join lateral (
        select count(*) as hits
        from public.offer_skills os
        join public.user_skills us on us.skill_id = os.skill_id and us.user_id = v_uid
          and ((os.role = 'proposed' and us.skill_type = 'wanted')
            or (os.role = 'requested' and us.skill_type = 'offered'))
        where os.offer_id = o.id) h
      where o.status = 'open' and o.user_id <> v_uid and h.hits > 0
      order by h.hits desc, o.created_at desc
      limit v_limit
    ) x), '[]'::jsonb);
end;
$$;

-- ── Développeurs ─────────────────────────────────────────────────────────
create or replace function public.search_developers(
  p_query text default null,
  p_skill_id uuid default null,
  p_country text default null,
  p_domain text default null,
  p_experience text default null,
  p_language text default null,
  p_availability text default null,
  p_limit int default 12,
  p_offset int default 0)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_pattern text := case when private.clean_text(p_query) is null then null
                         else private.like_pattern(left(p_query, 80)) end;
  v_limit int := least(greatest(coalesce(p_limit, 12), 1), 48);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  with base as (
    select p.id, p.profile_completion, p.created_at
    from public.profiles p
    where p.status = 'active'
      and p.first_name <> ''
      and (v_uid is null or p.id <> v_uid)
      and (v_pattern is null
           or (p.first_name || ' ' || p.last_name) ilike v_pattern
           or p.username ilike v_pattern
           or coalesce(p.headline, '') ilike v_pattern
           or coalesce(p.bio, '') ilike v_pattern
           or coalesce(p.city, '') ilike v_pattern
           or exists (select 1 from public.user_skills us
                      join public.skills s on s.id = us.skill_id
                      where us.user_id = p.id and us.skill_type = 'offered'
                        and s.name ilike v_pattern))
      and (p_skill_id is null or exists (
            select 1 from public.user_skills us
            where us.user_id = p.id and us.skill_id = p_skill_id and us.skill_type = 'offered'))
      and (private.clean_text(p_country) is null or p.country = upper(p_country))
      and (private.clean_text(p_domain) is null or p.main_domain = p_domain)
      and (private.clean_text(p_experience) is null or p.experience_level = p_experience)
      and (private.clean_text(p_language) is null or lower(p_language) = any(p.languages))
      and (private.clean_text(p_availability) is null or p_availability = any(p.availability))
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'items', coalesce((
      select jsonb_agg(private.profile_card(b.id) order by b.profile_completion desc, b.created_at desc)
      from (select * from base order by profile_completion desc, created_at desc
            limit v_limit offset v_offset) b
    ), '[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;

-- Indicateurs de réputation : uniquement des réalisations enregistrées.
create or replace function private.profile_stats(p_user uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'exchanges_completed', (
      select count(*) from public.collaboration_members m
      join public.collaborations c on c.id = m.collaboration_id
      where m.user_id = p_user and c.status = 'completed'),
    'active_collaborations', (
      select count(*) from public.collaboration_members m
      join public.collaborations c on c.id = m.collaboration_id
      where m.user_id = p_user and c.status = 'active'),
    'tasks_validated', (
      select count(distinct d.task_id) from public.deliverables d
      where d.submitted_by = p_user and d.validation_status = 'approved'),
    'contributions_reviewed', (
      select count(*) from public.deliverables d
      where d.reviewed_by = p_user and d.validation_status <> 'pending'),
    -- Personnes différentes : répéter un échange avec la même personne ne gonfle rien.
    'people_helped', (
      select count(distinct m2.user_id) from public.collaboration_members m
      join public.collaborations c on c.id = m.collaboration_id and c.status = 'completed'
      join public.collaboration_members m2
        on m2.collaboration_id = c.id and m2.user_id <> p_user
      where m.user_id = p_user),
    'skills_shared', (
      select count(distinct ps.skill_id)
      from public.collaborations c
      join public.exchange_proposals pr on pr.id = c.proposal_id
      join public.proposal_skills ps on ps.proposal_id = pr.id
      where c.status = 'completed'
        and ((pr.sender_id = p_user and ps.role = 'offered')
          or (pr.receiver_id = p_user and ps.role = 'requested'))),
    -- Réactivité : calculée sur les propositions reçues (hors boucles à trois).
    'proposals_answered', (
      select count(*) from public.exchange_proposals pr
      where pr.receiver_id = p_user and pr.status in ('accepted', 'declined', 'changes_requested')
        and not exists (select 1 from public.collaborations c
                        where c.proposal_id = pr.id and c.loop_id is not null)),
    'proposals_to_answer', (
      select count(*) from public.exchange_proposals pr
      where pr.receiver_id = p_user
        and (pr.status in ('accepted', 'declined', 'changes_requested')
             or (pr.status = 'pending' and pr.created_at < now() - interval '3 days'))
        and not exists (select 1 from public.collaborations c
                        where c.proposal_id = pr.id and c.loop_id is not null)),
    'median_response_hours', (
      select round((percentile_cont(0.5) within group (
               order by extract(epoch from (pr.responded_at - pr.created_at)) / 3600.0))::numeric, 1)
      from public.exchange_proposals pr
      where pr.receiver_id = p_user and pr.responded_at is not null
        and pr.status in ('accepted', 'declined', 'changes_requested')
        and not exists (select 1 from public.collaborations c
                        where c.proposal_id = pr.id and c.loop_id is not null)),
    'reviews_count', (select count(*) from public.reviews r where r.reviewed_user_id = p_user),
    'avg_communication', (select round(avg(r.communication_rating), 1) from public.reviews r where r.reviewed_user_id = p_user),
    'avg_reliability', (select round(avg(r.reliability_rating), 1) from public.reviews r where r.reviewed_user_id = p_user),
    'avg_quality', (select round(avg(r.quality_rating), 1) from public.reviews r where r.reviewed_user_id = p_user),
    'avg_collaboration', (select round(avg(r.collaboration_rating), 1) from public.reviews r where r.reviewed_user_id = p_user));
$$;

-- Calendrier d'activité : une case = des actions réellement enregistrées.
create or replace function private.activity_calendar(p_user uuid, p_days int default 371)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', t.day, 'count', t.total) order by t.day), '[]'::jsonb)
  from (
    select (l.created_at at time zone 'UTC')::date as day, count(*) as total
    from public.activity_logs l
    where l.user_id = p_user
      and l.created_at > now() - make_interval(days => least(greatest(p_days, 1), 400))
    group by 1
  ) t;
$$;

create or replace function private.review_item(p_id uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', r.id, 'collaboration_id', r.collaboration_id,
    'collaboration_title', c.title,
    'reviewer', private.profile_mini(r.reviewer_id),
    'reviewed_user_id', r.reviewed_user_id,
    'communication_rating', r.communication_rating,
    'reliability_rating', r.reliability_rating,
    'quality_rating', r.quality_rating,
    'collaboration_rating', r.collaboration_rating,
    'comment', r.comment, 'created_at', r.created_at)
  from public.reviews r
  join public.collaborations c on c.id = r.collaboration_id
  where r.id = p_id;
$$;

create or replace function public.get_profile(p_username text)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_p public.profiles;
  v_is_self boolean;
begin
  select * into v_p from public.profiles where username = lower(btrim(coalesce(p_username, '')));
  if not found then
    return null;
  end if;
  v_is_self := v_uid is not null and v_p.id = v_uid;
  if v_p.status <> 'active' and not v_is_self
     and not (v_uid is not null and private.is_admin(v_uid)) then
    return null;
  end if;

  return jsonb_build_object(
    'profile', private.profile_card(v_p.id),
    'stats', private.profile_stats(v_p.id),
    'calendar', private.activity_calendar(v_p.id),
    'collaborations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'exchange_type', c.exchange_type,
        'start_date', c.start_date, 'completed_at', c.completed_at,
        'partner', private.profile_mini(private.other_member(c.id, v_p.id)),
        'skills', private.proposal_skills_json(pr.id,
          case when pr.sender_id = v_p.id then 'offered' else 'requested' end))
        order by c.completed_at desc)
      from public.collaboration_members m
      join public.collaborations c on c.id = m.collaboration_id and c.status = 'completed'
      join public.exchange_proposals pr on pr.id = c.proposal_id
      where m.user_id = v_p.id), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(private.review_item(r.id) order by r.created_at desc)
      from (select id, created_at from public.reviews
            where reviewed_user_id = v_p.id order by created_at desc limit 20) r), '[]'::jsonb),
    'offers', coalesce((
      select jsonb_agg(private.offer_card(o.id) order by o.created_at desc)
      from (select id, created_at from public.exchange_offers
            where user_id = v_p.id and status = 'open' order by created_at desc limit 6) o), '[]'::jsonb),
    'viewer', jsonb_build_object(
      'is_self', v_is_self,
      'is_authenticated', v_uid is not null,
      'active_proposal_id', (
        select pr.id from public.exchange_proposals pr
        where v_uid is not null and pr.sender_id = v_uid and pr.receiver_id = v_p.id
          and pr.offer_id is null and pr.status in ('pending', 'changes_requested')
        limit 1),
      'match', case when v_uid is null or v_is_self then null
                    else public.get_match_with(v_p.id) end));
end;
$$;

-- ── Propositions ─────────────────────────────────────────────────────────
create or replace function private.proposal_item(p_id uuid, p_viewer uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', pr.id, 'status', pr.status, 'message', pr.message,
    'response_note', pr.response_note,
    'created_at', pr.created_at, 'updated_at', pr.updated_at, 'responded_at', pr.responded_at,
    'direction', case when pr.sender_id = p_viewer then 'sent' else 'received' end,
    'sender', private.profile_mini(pr.sender_id),
    'receiver', private.profile_mini(pr.receiver_id),
    'offer', (
      select jsonb_build_object('id', o.id, 'title', o.title,
                                'exchange_type', o.exchange_type, 'status', o.status)
      from public.exchange_offers o where o.id = pr.offer_id),
    'offered', private.proposal_skills_json(pr.id, 'offered'),
    'requested', private.proposal_skills_json(pr.id, 'requested'),
    'collaboration_id', (select c.id from public.collaborations c where c.proposal_id = pr.id),
    'conversation_id', (
      select c.id from public.conversations c
      where c.user_low = least(pr.sender_id, pr.receiver_id)
        and c.user_high = greatest(pr.sender_id, pr.receiver_id)))
  from public.exchange_proposals pr where pr.id = p_id;
$$;

create or replace function public.list_my_proposals()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
begin
  return coalesce((
    select jsonb_agg(private.proposal_item(pr.id, v_uid) order by pr.updated_at desc)
    from public.exchange_proposals pr
    where v_uid in (pr.sender_id, pr.receiver_id)), '[]'::jsonb);
end;
$$;

create or replace function public.get_proposal(p_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_p public.exchange_proposals;
begin
  select * into v_p from public.exchange_proposals where id = p_id;
  if not found or not (v_uid in (v_p.sender_id, v_p.receiver_id) or private.is_admin(v_uid)) then
    return null;
  end if;
  return private.proposal_item(p_id, v_uid) || jsonb_build_object(
    'sender_card', private.profile_card(v_p.sender_id),
    'receiver_card', private.profile_card(v_p.receiver_id));
end;
$$;

-- ── Collaborations ───────────────────────────────────────────────────────
create or replace function private.collaboration_item(p_id uuid, p_viewer uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'status', c.status, 'exchange_type', c.exchange_type,
    'start_date', c.start_date, 'end_date', c.end_date,
    'created_at', c.created_at, 'updated_at', c.updated_at, 'completed_at', c.completed_at,
    'is_demo', c.is_demo, 'loop_id', c.loop_id,
    -- Dernier signe de vie : sert à proposer une relance quand l'échange s'essouffle.
    'last_activity_at', greatest(
      c.updated_at,
      (select max(t.updated_at) from public.tasks t where t.collaboration_id = c.id),
      (select max(d.created_at) from public.deliverables d
       join public.tasks t on t.id = d.task_id where t.collaboration_id = c.id)),
    'partner', private.profile_mini(private.other_member(c.id, p_viewer)),
    'tasks_total', (select count(*) from public.tasks t where t.collaboration_id = c.id),
    'tasks_done', (select count(*) from public.tasks t where t.collaboration_id = c.id and t.status = 'done'),
    'to_review', (
      select count(*) from public.deliverables d
      join public.tasks t on t.id = d.task_id
      where t.collaboration_id = c.id and d.validation_status = 'pending' and d.submitted_by <> p_viewer),
    'my_confirmation', exists (
      select 1 from public.collaboration_members m
      where m.collaboration_id = c.id and m.user_id = p_viewer and m.completion_confirmed_at is not null),
    'partner_confirmation', exists (
      select 1 from public.collaboration_members m
      where m.collaboration_id = c.id and m.user_id <> p_viewer and m.completion_confirmed_at is not null),
    'has_reviewed', exists (
      select 1 from public.reviews r where r.collaboration_id = c.id and r.reviewer_id = p_viewer))
  from public.collaborations c where c.id = p_id;
$$;

create or replace function public.list_my_collaborations()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
begin
  return coalesce((
    select jsonb_agg(private.collaboration_item(c.id, v_uid) order by c.updated_at desc)
    from public.collaboration_members m
    join public.collaborations c on c.id = m.collaboration_id
    where m.user_id = v_uid), '[]'::jsonb);
end;
$$;

create or replace function public.get_collaboration(p_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_c public.collaborations;
  v_p public.exchange_proposals;
  v_is_member boolean;
begin
  select * into v_c from public.collaborations where id = p_id;
  if not found then
    return null;
  end if;
  v_is_member := private.is_collab_member(p_id, v_uid);
  if not v_is_member and not private.is_admin(v_uid) then
    return null;
  end if;
  select * into v_p from public.exchange_proposals where id = v_c.proposal_id;

  return jsonb_build_object(
    'id', v_c.id, 'title', v_c.title, 'description', v_c.description,
    'objectives', v_c.objectives, 'status', v_c.status, 'exchange_type', v_c.exchange_type,
    'start_date', v_c.start_date, 'end_date', v_c.end_date,
    'created_at', v_c.created_at, 'completed_at', v_c.completed_at,
    'cancel_reason', v_c.cancel_reason, 'cancelled_by', v_c.cancelled_by,
    'is_demo', v_c.is_demo, 'proposal_id', v_c.proposal_id, 'loop_id', v_c.loop_id,
    'offer', (select jsonb_build_object('id', o.id, 'title', o.title)
              from public.exchange_offers o
              where o.id = v_c.offer_id and o.status in ('open', 'paused', 'closed')),
    'conversation_id', (
      select c.id from public.conversations c
      where c.user_low = least(v_p.sender_id, v_p.receiver_id)
        and c.user_high = greatest(v_p.sender_id, v_p.receiver_id)),
    'members', (
      select jsonb_agg(jsonb_build_object(
        'user', private.profile_mini(m.user_id),
        'role', m.role,
        'completion_confirmed_at', m.completion_confirmed_at,
        'gives', private.proposal_skills_json(v_p.id,
          case when m.user_id = v_p.sender_id then 'offered' else 'requested' end))
        order by m.role)
      from public.collaboration_members m where m.collaboration_id = v_c.id),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'description', t.description,
        'status', t.status, 'priority', t.priority, 'due_date', t.due_date,
        'links', to_jsonb(t.links), 'attachment_path', t.attachment_path,
        'created_by', t.created_by, 'assigned_to', t.assigned_to,
        'created_at', t.created_at, 'updated_at', t.updated_at,
        'deliverables', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', d.id, 'description', d.description,
            'external_url', d.external_url, 'attachment_path', d.attachment_path,
            'validation_status', d.validation_status,
            'submitted_by', d.submitted_by, 'reviewed_by', d.reviewed_by,
            'review_note', d.review_note, 'reviewed_at', d.reviewed_at,
            'created_at', d.created_at) order by d.created_at desc)
          from public.deliverables d where d.task_id = t.id), '[]'::jsonb))
        order by t.created_at)
      from public.tasks t where t.collaboration_id = v_c.id), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(private.review_item(r.id) order by r.created_at)
      from public.reviews r where r.collaboration_id = v_c.id), '[]'::jsonb),
    'viewer', jsonb_build_object(
      'id', v_uid,
      'is_member', v_is_member,
      'has_reviewed', exists (
        select 1 from public.reviews r where r.collaboration_id = v_c.id and r.reviewer_id = v_uid)));
end;
$$;

-- Attestation publique d'un échange terminé : une page vérifiable qu'un
-- développeur peut montrer à un recruteur ou à un client.
create or replace function public.get_certificate(p_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_c public.collaborations;
  v_p public.exchange_proposals;
begin
  select * into v_c from public.collaborations where id = p_id and status = 'completed';
  if not found then
    return null;
  end if;
  select * into v_p from public.exchange_proposals where id = v_c.proposal_id;
  return jsonb_build_object(
    'id', v_c.id, 'title', v_c.title, 'exchange_type', v_c.exchange_type,
    'start_date', v_c.start_date, 'completed_at', v_c.completed_at,
    'is_demo', v_c.is_demo, 'is_loop', v_c.loop_id is not null,
    'tasks_validated', (
      select count(*) from public.tasks t where t.collaboration_id = v_c.id and t.status = 'done'),
    'members', (
      select jsonb_agg(jsonb_build_object(
        'user', private.profile_mini(m.user_id),
        'gives', private.proposal_skills_json(v_p.id,
          case when m.user_id = v_p.sender_id then 'offered' else 'requested' end),
        'deliverables_validated', (
          select count(*) from public.deliverables d
          join public.tasks t on t.id = d.task_id
          where t.collaboration_id = v_c.id and d.submitted_by = m.user_id
            and d.validation_status = 'approved'),
        'confirmed_at', m.completion_confirmed_at) order by m.role)
      from public.collaboration_members m where m.collaboration_id = v_c.id));
end;
$$;

-- ── Messagerie ───────────────────────────────────────────────────────────
create or replace function public.list_my_conversations()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'other', private.profile_mini(case when c.user_low = v_uid then c.user_high else c.user_low end),
      'last_message', (
        select jsonb_build_object('content', m.content, 'sender_id', m.sender_id, 'created_at', m.created_at)
        from public.messages m where m.conversation_id = c.id
        order by m.created_at desc limit 1),
      'unread', (
        select count(*) from public.messages m
        where m.conversation_id = c.id and m.sender_id <> v_uid and m.read_at is null),
      'last_message_at', coalesce(c.last_message_at, c.created_at))
      order by coalesce(c.last_message_at, c.created_at) desc)
    from public.conversations c
    where v_uid in (c.user_low, c.user_high)), '[]'::jsonb);
end;
$$;

create or replace function public.get_conversation(p_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_c public.conversations;
  v_other uuid;
begin
  select * into v_c from public.conversations where id = p_id;
  if not found or v_uid not in (v_c.user_low, v_c.user_high) then
    return null;
  end if;
  v_other := case when v_c.user_low = v_uid then v_c.user_high else v_c.user_low end;
  return jsonb_build_object(
    'id', v_c.id,
    'other', private.profile_mini(v_other),
    'collaborations', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'status', c.status)
                       order by c.created_at desc)
      from public.collaborations c
      where private.is_collab_member(c.id, v_uid) and private.is_collab_member(c.id, v_other)), '[]'::jsonb),
    'proposals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'status', pr.status,
        'direction', case when pr.sender_id = v_uid then 'sent' else 'received' end)
        order by pr.created_at desc)
      from public.exchange_proposals pr
      where pr.status in ('pending', 'changes_requested')
        and ((pr.sender_id = v_uid and pr.receiver_id = v_other)
          or (pr.sender_id = v_other and pr.receiver_id = v_uid))), '[]'::jsonb));
end;
$$;

-- ── Tableau de bord ──────────────────────────────────────────────────────
create or replace function public.dashboard_summary()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_p public.profiles;
begin
  select * into v_p from public.profiles where id = v_uid;
  return jsonb_build_object(
    'stats', jsonb_build_object(
      'active_exchanges', (
        select count(*) from public.collaboration_members m
        join public.collaborations c on c.id = m.collaboration_id
        where m.user_id = v_uid and c.status = 'active'),
      'proposals_received', (
        select count(*) from public.exchange_proposals pr
        where pr.receiver_id = v_uid and pr.status = 'pending'),
      'completed_exchanges', (
        select count(*) from public.collaboration_members m
        join public.collaborations c on c.id = m.collaboration_id
        where m.user_id = v_uid and c.status = 'completed'),
      'matches_available', (
        select count(*) from public.matches m
        where v_uid in (m.user_a, m.user_b))),
    'top_matches', coalesce((
      select jsonb_agg(t.item order by t.score desc, t.updated_at desc)
      from (
        select private.match_item(m, v_uid) as item, m.compatibility_score as score, m.updated_at
        from public.matches m
        where v_uid in (m.user_a, m.user_b)
        order by m.compatibility_score desc, m.updated_at desc
        limit 4) t), '[]'::jsonb),
    'active_collaborations', coalesce((
      select jsonb_agg(private.collaboration_item(c.id, v_uid) order by c.updated_at desc)
      from public.collaboration_members m
      join public.collaborations c on c.id = m.collaboration_id and c.status = 'active'
      where m.user_id = v_uid), '[]'::jsonb),
    'pending_proposals', coalesce((
      select jsonb_agg(private.proposal_item(pr.id, v_uid) order by pr.created_at desc)
      from (select id, created_at from public.exchange_proposals
            where receiver_id = v_uid and status = 'pending'
            order by created_at desc limit 3) pr), '[]'::jsonb),
    'recent_activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'event_type', l.event_type, 'entity_type', l.entity_type,
        'entity_id', l.entity_id, 'metadata', l.metadata, 'created_at', l.created_at)
        order by l.created_at desc)
      from (select * from public.activity_logs where user_id = v_uid
            order by created_at desc limit 8) l), '[]'::jsonb),
    'profile', private.profile_checklist(v_p));
end;
$$;

-- ── Administration ───────────────────────────────────────────────────────
create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := private.require_admin();
begin
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_active', (select count(*) from public.profiles where status = 'active'),
    'users_suspended', (select count(*) from public.profiles where status = 'suspended'),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_demo', (select count(*) from public.profiles where is_demo),
    'offers_total', (select count(*) from public.exchange_offers where status <> 'deleted'),
    'offers_open', (select count(*) from public.exchange_offers where status = 'open'),
    'offers_removed', (select count(*) from public.exchange_offers where status = 'removed'),
    'proposals_total', (select count(*) from public.exchange_proposals),
    'proposals_pending', (select count(*) from public.exchange_proposals where status = 'pending'),
    'collaborations_active', (select count(*) from public.collaborations where status = 'active'),
    'collaborations_completed', (select count(*) from public.collaborations where status = 'completed'),
    'collaborations_cancelled', (select count(*) from public.collaborations where status = 'cancelled'),
    'tasks_validated', (select count(*) from public.tasks where status = 'done'),
    'messages_total', (select count(*) from public.messages),
    'reviews_total', (select count(*) from public.reviews),
    'reports_open', (select count(*) from public.reports where status in ('open', 'in_review')),
    'reports_total', (select count(*) from public.reports),
    'by_country', coalesce((
      select jsonb_agg(jsonb_build_object('key', t.country, 'count', t.total) order by t.total desc)
      from (select coalesce(country, '??') as country, count(*) as total
            from public.profiles group by 1 order by 2 desc limit 12) t), '[]'::jsonb),
    'top_offered', coalesce((
      select jsonb_agg(jsonb_build_object('key', t.name, 'count', t.total) order by t.total desc)
      from (select s.name, count(*) as total from public.user_skills us
            join public.skills s on s.id = us.skill_id
            where us.skill_type = 'offered' group by s.name order by 2 desc limit 8) t), '[]'::jsonb),
    'top_wanted', coalesce((
      select jsonb_agg(jsonb_build_object('key', t.name, 'count', t.total) order by t.total desc)
      from (select s.name, count(*) as total from public.user_skills us
            join public.skills s on s.id = us.skill_id
            where us.skill_type = 'wanted' group by s.name order by 2 desc limit 8) t), '[]'::jsonb),
    'offers_by_type', coalesce((
      select jsonb_agg(jsonb_build_object('key', t.exchange_type, 'count', t.total) order by t.total desc)
      from (select exchange_type, count(*) as total from public.exchange_offers
            where status <> 'deleted' group by 1) t), '[]'::jsonb),
    'signups_by_week', coalesce((
      select jsonb_agg(jsonb_build_object('key', to_char(w.week, 'YYYY-MM-DD'), 'count', (
               select count(*) from public.profiles p
               where p.created_at >= w.week and p.created_at < w.week + interval '7 days'))
             order by w.week)
      from generate_series(
        date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '7 days') as w(week)
    ), '[]'::jsonb),
    'recent_actions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'action', a.action, 'target_type', a.target_type, 'target_id', a.target_id,
        'reason', a.reason, 'metadata', a.metadata, 'created_at', a.created_at,
        'admin', private.profile_mini(a.admin_id)) order by a.created_at desc)
      from (select * from public.admin_actions order by created_at desc limit 30) a), '[]'::jsonb));
end;
$$;

create or replace function public.admin_list_users(
  p_query text default null, p_status text default null,
  p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := private.require_admin();
  v_pattern text := case when private.clean_text(p_query) is null then null
                         else private.like_pattern(left(p_query, 80)) end;
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  with base as (
    select p.id, p.created_at, u.email
    from public.profiles p
    join auth.users u on u.id = p.id
    where (private.clean_text(p_status) is null or p.status = p_status)
      and (v_pattern is null
           or (p.first_name || ' ' || p.last_name) ilike v_pattern
           or p.username ilike v_pattern
           or u.email ilike v_pattern)
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'items', coalesce((
      select jsonb_agg(private.profile_mini(b.id) || jsonb_build_object(
        'email', b.email,
        'created_at', b.created_at,
        'is_admin', private.is_admin(b.id),
        'profile_completion', (select profile_completion from public.profiles where id = b.id),
        'reports_count', (select count(*) from public.reports r where r.reported_user_id = b.id),
        'collaborations_count', (select count(*) from public.collaboration_members m where m.user_id = b.id))
        order by b.created_at desc)
      from (select * from base order by created_at desc limit v_limit offset v_offset) b
    ), '[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_set_user_status(p_user uuid, p_status text, p_reason text)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := private.require_admin();
  v_reason text := private.clean_text(p_reason);
  v_current text;
begin
  if p_status is null or p_status not in ('active', 'suspended') then
    raise exception 'invalid_input';
  end if;
  if p_user = v_admin or private.is_admin(p_user) then
    raise exception 'cannot_moderate_admin';
  end if;
  if p_status = 'suspended' and (v_reason is null or char_length(v_reason) < 5) then
    raise exception 'note_required';
  end if;
  select status into v_current from public.profiles where id = p_user for update;
  if v_current is null then
    raise exception 'user_not_found';
  end if;
  if v_current = p_status then
    return;
  end if;
  update public.profiles set status = p_status where id = p_user;
  insert into public.admin_actions (admin_id, action, target_type, target_id, reason)
  values (v_admin, case when p_status = 'suspended' then 'user_suspended' else 'user_reactivated' end,
          'user', p_user, v_reason);
  perform private.notify(
    p_user, 'moderation',
    case when p_status = 'suspended' then 'Ton compte a été suspendu'
         else 'Ton compte a été réactivé' end,
    v_reason, 'profile', p_user, '/parametres', null);
end;
$$;

create or replace function public.admin_list_offers(
  p_query text default null, p_status text default null,
  p_reported_only boolean default false,
  p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := private.require_admin();
  v_pattern text := case when private.clean_text(p_query) is null then null
                         else private.like_pattern(left(p_query, 80)) end;
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  with base as (
    select o.id, o.created_at,
           (select count(*) from public.reports r where r.offer_id = o.id) as reports_count,
           (select count(*) from public.reports r
            where r.offer_id = o.id and r.status in ('open', 'in_review')) as reports_open
    from public.exchange_offers o
    where o.status <> 'deleted'
      and (private.clean_text(p_status) is null or o.status = p_status)
      and (v_pattern is null or o.title ilike v_pattern or o.description ilike v_pattern)
      and (not coalesce(p_reported_only, false)
           or exists (select 1 from public.reports r where r.offer_id = o.id))
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'items', coalesce((
      select jsonb_agg(private.offer_card(b.id) || jsonb_build_object(
        'reports_count', b.reports_count, 'reports_open', b.reports_open,
        'moderation_note', (select moderation_note from public.exchange_offers where id = b.id))
        order by b.reports_open desc, b.created_at desc)
      from (select * from base order by reports_open desc, created_at desc
            limit v_limit offset v_offset) b
    ), '[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;

-- p_action : remove (retirer l'annonce) | restore (la remettre en ligne).
create or replace function public.admin_moderate_offer(p_offer uuid, p_action text, p_reason text)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := private.require_admin();
  v_reason text := private.clean_text(p_reason);
  v_o public.exchange_offers;
begin
  if p_action is null or p_action not in ('remove', 'restore') then
    raise exception 'invalid_input';
  end if;
  select * into v_o from public.exchange_offers where id = p_offer for update;
  if not found or v_o.status = 'deleted' then
    raise exception 'offer_not_found';
  end if;
  if p_action = 'remove' then
    if v_reason is null or char_length(v_reason) < 5 then
      raise exception 'note_required';
    end if;
    update public.exchange_offers set status = 'removed', moderation_note = v_reason where id = p_offer;
    update public.exchange_proposals
      set status = 'cancelled', responded_at = now(),
          response_note = 'Annonce retirée par la modération.'
    where offer_id = p_offer and status in ('pending', 'changes_requested');
    perform private.notify(
      v_o.user_id, 'moderation', 'Ton annonce a été retirée par la modération',
      v_reason, 'offer', p_offer, '/mes-annonces', null);
  else
    if v_o.status <> 'removed' then
      raise exception 'invalid_input';
    end if;
    update public.exchange_offers set status = 'open', moderation_note = null where id = p_offer;
    perform private.notify(
      v_o.user_id, 'moderation', 'Ton annonce est de nouveau en ligne',
      v_reason, 'offer', p_offer, '/annonces/' || p_offer, null);
  end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, reason, metadata)
  values (v_admin, case when p_action = 'remove' then 'offer_removed' else 'offer_restored' end,
          'offer', p_offer, v_reason, jsonb_build_object('title', v_o.title));
end;
$$;

create or replace function public.admin_list_reports(
  p_status text default null, p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := private.require_admin();
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  with base as (
    select r.* from public.reports r
    where private.clean_text(p_status) is null
       or (p_status = 'pending' and r.status in ('open', 'in_review'))
       or r.status = p_status
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'reason', b.reason, 'description', b.description, 'status', b.status,
        'resolution_note', b.resolution_note, 'handled_at', b.handled_at, 'created_at', b.created_at,
        'reporter', private.profile_mini(b.reporter_id),
        'reported_user', private.profile_mini(b.reported_user_id),
        'handled_by', private.profile_mini(b.handled_by),
        'offer', (select jsonb_build_object('id', o.id, 'title', o.title, 'status', o.status)
                  from public.exchange_offers o where o.id = b.offer_id),
        'collaboration', (select jsonb_build_object('id', c.id, 'title', c.title, 'status', c.status)
                          from public.collaborations c where c.id = b.collaboration_id))
        order by b.created_at desc)
      from (select * from base order by created_at desc limit v_limit offset v_offset) b
    ), '[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_handle_report(p_report uuid, p_status text, p_note text)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := private.require_admin();
  v_note text := private.clean_text(p_note);
  v_r public.reports;
begin
  if p_status is null or p_status not in ('in_review', 'resolved', 'dismissed') then
    raise exception 'invalid_input';
  end if;
  select * into v_r from public.reports where id = p_report for update;
  if not found then
    raise exception 'report_not_found';
  end if;
  if p_status in ('resolved', 'dismissed') and (v_note is null or char_length(v_note) < 5) then
    raise exception 'note_required';
  end if;
  update public.reports
    set status = p_status, resolution_note = coalesce(v_note, resolution_note),
        handled_by = v_admin, handled_at = now()
  where id = p_report;
  insert into public.admin_actions (admin_id, action, target_type, target_id, reason)
  values (v_admin, 'report_' || p_status, 'report', p_report, v_note);
  if p_status in ('resolved', 'dismissed') then
    perform private.notify(
      v_r.reporter_id, 'moderation',
      case when p_status = 'resolved' then 'Ton signalement a été traité'
           else 'Ton signalement a été classé' end,
      v_note, 'report', p_report, '/notifications', null);
  end if;
end;
$$;

-- ▼▼▼ 20261113090500_security.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 06 · Sécurité
-- Principe : le navigateur ne peut QUE lire ce que les règles ci-dessous
-- autorisent, modifier son propre profil, et appeler les fonctions prévues.
-- Tout le reste est refusé par défaut.
-- ═════════════════════════════════════════════════════════════════════════

-- ── 1. Row Level Security sur toutes les tables ──────────────────────────
alter table public.profiles              enable row level security;
alter table public.app_admins            enable row level security;
alter table public.skills                enable row level security;
alter table public.user_skills           enable row level security;
alter table public.exchange_offers       enable row level security;
alter table public.offer_skills          enable row level security;
alter table public.exchange_proposals    enable row level security;
alter table public.proposal_skills       enable row level security;
alter table public.matches               enable row level security;
alter table public.collaborations        enable row level security;
alter table public.collaboration_members enable row level security;
alter table public.tasks                 enable row level security;
alter table public.deliverables          enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.notifications         enable row level security;
alter table public.reviews               enable row level security;
alter table public.reports               enable row level security;
alter table public.activity_logs         enable row level security;
alter table public.admin_actions         enable row level security;
alter table public.exchange_loops        enable row level security;

-- ── 2. Privilèges : on retire tout, puis on accorde le strict nécessaire ──
revoke all on table
  public.profiles, public.app_admins, public.skills, public.user_skills,
  public.exchange_offers, public.offer_skills, public.exchange_proposals,
  public.proposal_skills, public.matches, public.collaborations,
  public.collaboration_members, public.tasks, public.deliverables,
  public.conversations, public.messages, public.notifications, public.reviews,
  public.reports, public.activity_logs, public.admin_actions, public.exchange_loops
from anon, authenticated;

-- Lecture publique (visiteurs compris) : vitrine de la plateforme.
grant select on table
  public.profiles, public.skills, public.user_skills,
  public.exchange_offers, public.offer_skills, public.reviews
to anon, authenticated;

-- Lecture réservée aux personnes connectées (filtrée ligne par ligne).
grant select on table
  public.app_admins, public.exchange_proposals, public.proposal_skills, public.matches,
  public.collaborations, public.collaboration_members, public.tasks, public.deliverables,
  public.conversations, public.messages, public.notifications, public.reports,
  public.activity_logs, public.admin_actions, public.exchange_loops
to authenticated;

-- Seule écriture directe : son propre profil, et seulement ces colonnes.
-- (status, is_demo, profile_completion… ne sont pas modifiables côté client.)
grant update (
  username, first_name, last_name, avatar_url, country, city, timezone, headline, bio,
  experience_level, main_domain, languages, availability, collaboration_modes,
  github_url, portfolio_url, linkedin_url, website_url,
  onboarding_step, onboarding_completed_at
) on public.profiles to authenticated;

-- Le rôle serveur garde un accès complet (données de démonstration, maintenance).
grant all on all tables in schema public to service_role;

-- ── 3. Règles d'accès (policies) ─────────────────────────────────────────
create policy profiles_select on public.profiles for select to anon, authenticated
  using (status = 'active' or id = (select auth.uid()) or (select private.is_admin()));

create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and status = 'active')
  with check (id = (select auth.uid()) and status = 'active');

create policy app_admins_select on public.app_admins for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy skills_select on public.skills for select to anon, authenticated
  using (true);

create policy user_skills_select on public.user_skills for select to anon, authenticated
  using (true);

create policy exchange_offers_select on public.exchange_offers for select to anon, authenticated
  using (
    status in ('open', 'paused', 'closed')
    or (user_id = (select auth.uid()) and status <> 'deleted')
    or (select private.is_admin()));

create policy offer_skills_select on public.offer_skills for select to anon, authenticated
  using (exists (select 1 from public.exchange_offers o where o.id = offer_id));

create policy exchange_proposals_select on public.exchange_proposals for select to authenticated
  using (
    sender_id = (select auth.uid())
    or receiver_id = (select auth.uid())
    or (select private.is_admin()));

create policy proposal_skills_select on public.proposal_skills for select to authenticated
  using (exists (select 1 from public.exchange_proposals p where p.id = proposal_id));

create policy matches_select on public.matches for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy collaborations_select on public.collaborations for select to authenticated
  using (private.is_collab_member(id) or (select private.is_admin()));

create policy collaboration_members_select on public.collaboration_members for select to authenticated
  using (private.is_collab_member(collaboration_id) or (select private.is_admin()));

create policy tasks_select on public.tasks for select to authenticated
  using (private.is_collab_member(collaboration_id) or (select private.is_admin()));

create policy deliverables_select on public.deliverables for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy conversations_select on public.conversations for select to authenticated
  using ((select auth.uid()) in (user_low, user_high));

create policy messages_select on public.messages for select to authenticated
  using (private.is_conversation_member(conversation_id));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy reviews_select on public.reviews for select to anon, authenticated
  using (true);

create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));

create policy activity_logs_select on public.activity_logs for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy admin_actions_select on public.admin_actions for select to authenticated
  using ((select private.is_admin()));

create policy exchange_loops_select on public.exchange_loops for select to authenticated
  using ((select auth.uid()) in (user_a, user_b, user_c));

-- (Les droits d'appel des fonctions sont posés par la dernière migration,
--  une fois toutes les fonctions créées.)

-- ── 4. Fichiers (Supabase Storage) ───────────────────────────────────────
-- avatars     : public en lecture, 2 Mo, images uniquement.
-- attachments : privé, 10 Mo, types de fichiers limités ; lisible par les
--               seuls membres de la collaboration concernée.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp']),
  ('attachments', 'attachments', false, 10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain',
          'text/markdown', 'application/zip', 'application/x-zip-compressed', 'application/json'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists devbridge_avatars_read on storage.objects;
drop policy if exists devbridge_avatars_insert on storage.objects;
drop policy if exists devbridge_avatars_update on storage.objects;
drop policy if exists devbridge_avatars_delete on storage.objects;
drop policy if exists devbridge_attachments_read on storage.objects;
drop policy if exists devbridge_attachments_insert on storage.objects;
drop policy if exists devbridge_attachments_delete on storage.objects;

-- Chemin d'un avatar : <identifiant de la personne>/<fichier>
create policy devbridge_avatars_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy devbridge_avatars_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active_user());

create policy devbridge_avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy devbridge_avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Chemin d'une pièce jointe : <collaboration>/<personne>/<fichier>
create policy devbridge_attachments_read on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and private.is_collab_member(private.try_uuid((storage.foldername(name))[1])));

create policy devbridge_attachments_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and private.is_collab_member(private.try_uuid((storage.foldername(name))[1]))
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and private.is_active_user());

create policy devbridge_attachments_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[2] = (select auth.uid())::text);

-- ── 5. Temps réel : messages et notifications ────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;

-- ▼▼▼ 20261113090600_skills_catalog.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 07 · Catalogue de compétences
-- « competence » : un savoir-faire · « technology » : un outil ou un langage.
-- Le catalogue est extensible : ajouter une ligne suffit.
-- ═════════════════════════════════════════════════════════════════════════

insert into public.skills (slug, name, kind, category) values
  -- Savoir-faire
  ('developpement-front-end', 'Développement Front-End', 'competence', 'frontend'),
  ('integration-html-css', 'Intégration HTML/CSS', 'competence', 'frontend'),
  ('accessibilite-web', 'Accessibilité web', 'competence', 'frontend'),
  ('performance-web', 'Performance web', 'competence', 'frontend'),
  ('developpement-back-end', 'Développement Back-End', 'competence', 'backend'),
  ('conception-api', 'Conception d''API', 'competence', 'backend'),
  ('architecture-logicielle', 'Architecture logicielle', 'competence', 'backend'),
  ('microservices', 'Microservices', 'competence', 'backend'),
  ('developpement-mobile', 'Développement mobile', 'competence', 'mobile'),
  ('applications-hors-ligne', 'Applications hors ligne', 'competence', 'mobile'),
  ('intelligence-artificielle', 'Intelligence artificielle', 'competence', 'data_ai'),
  ('machine-learning', 'Machine Learning', 'competence', 'data_ai'),
  ('integration-ia', 'Intégration IA (LLM)', 'competence', 'data_ai'),
  ('data-engineering', 'Data Engineering', 'competence', 'data_ai'),
  ('data-science', 'Data Science', 'competence', 'data_ai'),
  ('analyse-de-donnees', 'Analyse de données', 'competence', 'data_ai'),
  ('traitement-du-langage', 'Traitement du langage (NLP)', 'competence', 'data_ai'),
  ('vision-par-ordinateur', 'Vision par ordinateur', 'competence', 'data_ai'),
  ('devops', 'DevOps', 'competence', 'devops_cloud'),
  ('ci-cd', 'CI/CD', 'competence', 'devops_cloud'),
  ('deploiement-cloud', 'Déploiement Cloud', 'competence', 'devops_cloud'),
  ('administration-linux', 'Administration Linux', 'competence', 'devops_cloud'),
  ('observabilite', 'Observabilité', 'competence', 'devops_cloud'),
  ('conception-bases-de-donnees', 'Conception de bases de données', 'competence', 'databases'),
  ('optimisation-sql', 'Optimisation SQL', 'competence', 'databases'),
  ('ui-ux-design', 'UI/UX Design', 'competence', 'design'),
  ('design-produit', 'Design de produit', 'competence', 'design'),
  ('prototypage', 'Prototypage', 'competence', 'design'),
  ('design-system', 'Design system', 'competence', 'design'),
  ('cybersecurite', 'Cybersécurité', 'competence', 'security'),
  ('securite-applications', 'Sécurité des applications', 'competence', 'security'),
  ('tests-intrusion', 'Tests d''intrusion', 'competence', 'security'),
  ('tests-automatises', 'Tests automatisés', 'competence', 'practices'),
  ('revue-de-code', 'Revue de code', 'competence', 'practices'),
  ('gestion-projet-agile', 'Gestion de projet agile', 'competence', 'practices'),
  ('redaction-technique', 'Rédaction technique', 'competence', 'practices'),
  ('contribution-open-source', 'Contribution open source', 'competence', 'practices'),
  ('mentorat-technique', 'Mentorat technique', 'competence', 'practices'),
  ('paiement-mobile', 'Paiement mobile (Mobile Money)', 'competence', 'practices'),
  ('ussd-sms', 'Services USSD et SMS', 'competence', 'practices'),
  -- Langages
  ('python', 'Python', 'technology', 'languages'),
  ('javascript', 'JavaScript', 'technology', 'languages'),
  ('typescript', 'TypeScript', 'technology', 'languages'),
  ('java', 'Java', 'technology', 'languages'),
  ('kotlin', 'Kotlin', 'technology', 'languages'),
  ('swift', 'Swift', 'technology', 'languages'),
  ('dart', 'Dart', 'technology', 'languages'),
  ('php', 'PHP', 'technology', 'languages'),
  ('go', 'Go', 'technology', 'languages'),
  ('rust', 'Rust', 'technology', 'languages'),
  ('csharp', 'C#', 'technology', 'languages'),
  ('cpp', 'C++', 'technology', 'languages'),
  ('ruby', 'Ruby', 'technology', 'languages'),
  ('sql', 'SQL', 'technology', 'languages'),
  -- Front-End
  ('react', 'React', 'technology', 'frontend'),
  ('nextjs', 'Next.js', 'technology', 'frontend'),
  ('vuejs', 'Vue.js', 'technology', 'frontend'),
  ('angular', 'Angular', 'technology', 'frontend'),
  ('svelte', 'Svelte', 'technology', 'frontend'),
  ('tailwind-css', 'Tailwind CSS', 'technology', 'frontend'),
  -- Back-End
  ('nodejs', 'Node.js', 'technology', 'backend'),
  ('express', 'Express', 'technology', 'backend'),
  ('nestjs', 'NestJS', 'technology', 'backend'),
  ('django', 'Django', 'technology', 'backend'),
  ('fastapi', 'FastAPI', 'technology', 'backend'),
  ('flask', 'Flask', 'technology', 'backend'),
  ('laravel', 'Laravel', 'technology', 'backend'),
  ('spring-boot', 'Spring Boot', 'technology', 'backend'),
  ('dotnet', '.NET', 'technology', 'backend'),
  ('ruby-on-rails', 'Ruby on Rails', 'technology', 'backend'),
  ('graphql', 'GraphQL', 'technology', 'backend'),
  -- Mobile
  ('flutter', 'Flutter', 'technology', 'mobile'),
  ('react-native', 'React Native', 'technology', 'mobile'),
  ('android', 'Android', 'technology', 'mobile'),
  ('ios', 'iOS', 'technology', 'mobile'),
  ('jetpack-compose', 'Jetpack Compose', 'technology', 'mobile'),
  -- Données et IA
  ('tensorflow', 'TensorFlow', 'technology', 'data_ai'),
  ('pytorch', 'PyTorch', 'technology', 'data_ai'),
  ('pandas', 'Pandas', 'technology', 'data_ai'),
  ('scikit-learn', 'scikit-learn', 'technology', 'data_ai'),
  ('langchain', 'LangChain', 'technology', 'data_ai'),
  ('power-bi', 'Power BI', 'technology', 'data_ai'),
  -- DevOps et Cloud
  ('docker', 'Docker', 'technology', 'devops_cloud'),
  ('kubernetes', 'Kubernetes', 'technology', 'devops_cloud'),
  ('aws', 'AWS', 'technology', 'devops_cloud'),
  ('google-cloud', 'Google Cloud', 'technology', 'devops_cloud'),
  ('azure', 'Azure', 'technology', 'devops_cloud'),
  ('github-actions', 'GitHub Actions', 'technology', 'devops_cloud'),
  ('terraform', 'Terraform', 'technology', 'devops_cloud'),
  ('linux', 'Linux', 'technology', 'devops_cloud'),
  ('nginx', 'Nginx', 'technology', 'devops_cloud'),
  -- Bases de données
  ('postgresql', 'PostgreSQL', 'technology', 'databases'),
  ('mysql', 'MySQL', 'technology', 'databases'),
  ('mongodb', 'MongoDB', 'technology', 'databases'),
  ('redis', 'Redis', 'technology', 'databases'),
  ('firebase', 'Firebase', 'technology', 'databases'),
  ('supabase', 'Supabase', 'technology', 'databases'),
  -- Design et outils
  ('figma', 'Figma', 'technology', 'design'),
  ('adobe-xd', 'Adobe XD', 'technology', 'design'),
  ('git', 'Git', 'technology', 'practices'),
  ('wordpress', 'WordPress', 'technology', 'practices')
on conflict (slug) do update
  set name = excluded.name, kind = excluded.kind, category = excluded.category;

-- ▼▼▼ 20261113090700_app_api.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 08 · Fonctions de l'application
-- Profil, catalogue, messages et notifications : l'application ne lit et
-- n'écrit qu'à travers des fonctions, jamais directement dans les tables.
-- ═════════════════════════════════════════════════════════════════════════

create or replace function public.list_skills()
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'name', s.name, 'slug', s.slug, 'kind', s.kind, 'category', s.category)
           order by s.kind, s.category, s.name), '[]'::jsonb)
  from public.skills s;
$$;

-- Met à jour mon profil. Seules les clés présentes dans p_patch sont modifiées ;
-- les champs sensibles (statut, démonstration, complétion) ne sont pas modifiables.
create or replace function public.update_my_profile(p_patch jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_p public.profiles;
  j jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  if jsonb_typeof(j) <> 'object' then
    raise exception 'invalid_input';
  end if;
  if j ? 'username' and exists (
       select 1 from public.profiles
       where username = lower(btrim(j ->> 'username')) and id <> v_uid) then
    raise exception 'username_taken';
  end if;

  update public.profiles p set
    username   = case when j ? 'username' then lower(btrim(j ->> 'username')) else p.username end,
    first_name = case when j ? 'first_name' then left(coalesce(j ->> 'first_name', ''), 60) else p.first_name end,
    last_name  = case when j ? 'last_name' then left(coalesce(j ->> 'last_name', ''), 60) else p.last_name end,
    avatar_url = case when j ? 'avatar_url' then private.clean_text(j ->> 'avatar_url') else p.avatar_url end,
    country    = case when j ? 'country' then j ->> 'country' else p.country end,
    city       = case when j ? 'city' then j ->> 'city' else p.city end,
    timezone   = case when j ? 'timezone' then coalesce(j ->> 'timezone', 'UTC') else p.timezone end,
    headline   = case when j ? 'headline' then j ->> 'headline' else p.headline end,
    bio        = case when j ? 'bio' then j ->> 'bio' else p.bio end,
    experience_level = case when j ? 'experience_level'
                            then private.clean_text(j ->> 'experience_level') else p.experience_level end,
    main_domain = case when j ? 'main_domain'
                       then private.clean_text(j ->> 'main_domain') else p.main_domain end,
    languages  = case when j ? 'languages'
                      then array(select jsonb_array_elements_text(j -> 'languages')) else p.languages end,
    availability = case when j ? 'availability'
                        then array(select jsonb_array_elements_text(j -> 'availability')) else p.availability end,
    collaboration_modes = case when j ? 'collaboration_modes'
                               then array(select jsonb_array_elements_text(j -> 'collaboration_modes'))
                               else p.collaboration_modes end,
    github_url    = case when j ? 'github_url' then j ->> 'github_url' else p.github_url end,
    portfolio_url = case when j ? 'portfolio_url' then j ->> 'portfolio_url' else p.portfolio_url end,
    linkedin_url  = case when j ? 'linkedin_url' then j ->> 'linkedin_url' else p.linkedin_url end,
    website_url   = case when j ? 'website_url' then j ->> 'website_url' else p.website_url end,
    onboarding_step = case when j ? 'onboarding_step'
                           then least(greatest((j ->> 'onboarding_step')::int, 0), 8)
                           else p.onboarding_step end,
    onboarding_completed_at = case when coalesce((j ->> 'onboarding_completed')::boolean, false)
                                   then coalesce(p.onboarding_completed_at, now())
                                   else p.onboarding_completed_at end
  where p.id = v_uid
  returning * into v_p;

  if coalesce((j ->> 'onboarding_completed')::boolean, false) then
    perform private.refresh_matches_for(v_uid);
  end if;
  return private.profile_checklist(v_p);
end;
$$;

-- Messages d'une conversation, du plus ancien au plus récent.
-- p_after : ne renvoie que les messages plus récents (rafraîchissement léger).
create or replace function public.get_messages(
  p_conversation_id uuid,
  p_after timestamptz default null,
  p_before timestamptz default null,
  p_limit int default 60)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_limit int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if not private.is_conversation_member(p_conversation_id, v_uid) then
    raise exception 'conversation_not_found';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'sender_id', m.sender_id, 'content', m.content,
      'read_at', m.read_at, 'created_at', m.created_at) order by m.created_at)
    from (
      select * from public.messages
      where conversation_id = p_conversation_id
        and (p_after is null or created_at > p_after)
        and (p_before is null or created_at < p_before)
      order by created_at desc
      limit v_limit
    ) m), '[]'::jsonb);
end;
$$;

create or replace function public.list_notifications(p_limit int default 30, p_offset int default 0)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_limit int := least(greatest(coalesce(p_limit, 30), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  return jsonb_build_object(
    'total', (select count(*) from public.notifications where user_id = v_uid),
    'unread', (select count(*) from public.notifications where user_id = v_uid and not is_read),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'type', n.type, 'title', n.title, 'content', n.content,
        'link', n.link, 'is_read', n.is_read, 'created_at', n.created_at,
        'actor', private.profile_mini(n.actor_id)) order by n.created_at desc)
      from (
        select * from public.notifications
        where user_id = v_uid
        order by created_at desc
        limit v_limit offset v_offset
      ) n), '[]'::jsonb));
end;
$$;

-- ▼▼▼ 20261113090800_loops.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 09 · Boucles d'échange à trois
-- Beaucoup de développeurs n'ont pas de vis-à-vis direct : ce que je propose
-- n'intéresse pas forcément la personne qui peut m'aider. La boucle résout
-- cela : A aide B, B aide C, C aide A. Chacun donne une fois et reçoit une fois.
-- Elle ne démarre que si les TROIS personnes l'acceptent.
-- ═════════════════════════════════════════════════════════════════════════

create or replace function private.loop_key(p_a uuid, p_b uuid, p_c uuid)
returns text
language sql immutable
as $$
  select string_agg(x::text, ':' order by x) from unnest(array[p_a, p_b, p_c]) as x;
$$;

create or replace function private.loop_item(l public.exchange_loops, p_viewer uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', l.id, 'status', l.status, 'created_at', l.created_at,
    'created_by', l.created_by, 'declined_by', l.declined_by, 'is_demo', l.is_demo,
    'legs', jsonb_build_array(
      jsonb_build_object('from', private.profile_mini(l.user_a), 'to', private.profile_mini(l.user_b),
                         'skills', private.skills_json(l.skills_ab), 'accepted', l.accepted_a is not null),
      jsonb_build_object('from', private.profile_mini(l.user_b), 'to', private.profile_mini(l.user_c),
                         'skills', private.skills_json(l.skills_bc), 'accepted', l.accepted_b is not null),
      jsonb_build_object('from', private.profile_mini(l.user_c), 'to', private.profile_mini(l.user_a),
                         'skills', private.skills_json(l.skills_ca), 'accepted', l.accepted_c is not null)),
    'my_acceptance', case
      when l.user_a = p_viewer then l.accepted_a is not null
      when l.user_b = p_viewer then l.accepted_b is not null
      else l.accepted_c is not null end);
$$;

-- Boucles possibles pour moi : je peux aider B, B peut aider C, C peut m'aider.
-- On écarte les personnes avec qui un échange direct est déjà possible.
create or replace function public.find_exchange_loops(p_limit int default 6)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
  v_limit int := least(greatest(coalesce(p_limit, 6), 1), 24);
  v_langs text[];
begin
  select languages into v_langs from public.profiles where id = v_uid;
  return coalesce((
    with gives as (
      select w.user_id as b, array_agg(distinct w.skill_id) as skills_ab
      from public.user_skills mine
      join public.user_skills w
        on w.skill_id = mine.skill_id and w.skill_type = 'wanted' and w.user_id <> v_uid
      join public.profiles p on p.id = w.user_id and p.status = 'active'
      where mine.user_id = v_uid and mine.skill_type = 'offered'
      group by w.user_id
      limit 60
    ),
    gets as (
      select o.user_id as c, array_agg(distinct o.skill_id) as skills_ca
      from public.user_skills mine
      join public.user_skills o
        on o.skill_id = mine.skill_id and o.skill_type = 'offered' and o.user_id <> v_uid
      join public.profiles p on p.id = o.user_id and p.status = 'active'
      where mine.user_id = v_uid and mine.skill_type = 'wanted'
      group by o.user_id
      limit 60
    ),
    loops as (
      select g.b, t.c, g.skills_ab, t.skills_ca, private.leg_skills(g.b, t.c) as skills_bc
      from gives g
      cross join gets t
      where g.b <> t.c
        and not exists (select 1 from gets t2 where t2.c = g.b)
        and not exists (select 1 from gives g2 where g2.b = t.c)
        and not exists (
          select 1 from public.exchange_loops l
          where l.member_key = private.loop_key(v_uid, g.b, t.c)
            and l.status in ('proposed', 'active'))
    ),
    ranked as (
      select l.*,
        array(select unnest(v_langs)
              intersect select unnest(pb.languages)
              intersect select unnest(pc.languages)) as common_languages
      from loops l
      join public.profiles pb on pb.id = l.b
      join public.profiles pc on pc.id = l.c
      where cardinality(l.skills_bc) > 0
    )
    select jsonb_agg(jsonb_build_object(
      'b', private.profile_mini(r.b),
      'c', private.profile_mini(r.c),
      'skills_ab', private.skills_json(r.skills_ab),
      'skills_bc', private.skills_json(r.skills_bc),
      'skills_ca', private.skills_json(r.skills_ca),
      'common_languages', to_jsonb(r.common_languages))
      order by cardinality(r.common_languages) desc, r.b, r.c)
    from (
      select * from ranked
      order by cardinality(common_languages) desc, b, c
      limit v_limit
    ) r), '[]'::jsonb);
end;
$$;

create or replace function public.list_my_loops()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user(false);
begin
  return coalesce((
    select jsonb_agg(t.item order by t.created_at desc)
    from (
      select private.loop_item(l, v_uid) as item, l.created_at
      from public.exchange_loops l
      where v_uid in (l.user_a, l.user_b, l.user_c)
        and (l.status = 'proposed' or l.updated_at > now() - interval '30 days')
      order by l.created_at desc
      limit 20
    ) t), '[]'::jsonb);
end;
$$;

-- Je propose une boucle : j'aide p_b, p_b aide p_c, p_c m'aide.
create or replace function public.propose_loop(p_b uuid, p_c uuid)
returns uuid
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_ab uuid[];
  v_bc uuid[];
  v_ca uuid[];
  v_key text;
  v_id uuid;
  v_is_demo boolean;
begin
  if p_b is null or p_c is null or p_b = p_c or v_uid in (p_b, p_c) then
    raise exception 'loop_not_valid';
  end if;
  if (select count(*) from public.profiles where id in (p_b, p_c) and status = 'active') <> 2 then
    raise exception 'receiver_unavailable';
  end if;
  v_ab := private.leg_skills(v_uid, p_b);
  v_bc := private.leg_skills(p_b, p_c);
  v_ca := private.leg_skills(p_c, v_uid);
  if cardinality(v_ab) = 0 or cardinality(v_bc) = 0 or cardinality(v_ca) = 0 then
    raise exception 'loop_not_valid';
  end if;
  v_key := private.loop_key(v_uid, p_b, p_c);
  if exists (select 1 from public.exchange_loops
             where member_key = v_key and status in ('proposed', 'active')) then
    raise exception 'loop_already_exists';
  end if;
  if (select count(*) from public.exchange_loops
      where created_by = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate_limited';
  end if;
  select is_demo into v_is_demo from public.profiles where id = v_uid;

  insert into public.exchange_loops (
    user_a, user_b, user_c, skills_ab, skills_bc, skills_ca,
    member_key, created_by, accepted_a, is_demo)
  values (v_uid, p_b, p_c, v_ab, v_bc, v_ca, v_key, v_uid, now(), coalesce(v_is_demo, false))
  returning id into v_id;

  perform private.notify(
    p_b, 'loop_invitation',
    private.full_name(v_uid) || ' te propose une boucle d''échange à trois',
    'Tu reçois : ' || private.skill_names(v_ab) || '. Tu apportes : ' || private.skill_names(v_bc)
      || ' à ' || private.full_name(p_c) || '.',
    'loop', v_id, '/pour-toi#boucles', v_uid);
  perform private.notify(
    p_c, 'loop_invitation',
    private.full_name(v_uid) || ' te propose une boucle d''échange à trois',
    'Tu reçois : ' || private.skill_names(v_bc) || ' de ' || private.full_name(p_b)
      || '. Tu apportes : ' || private.skill_names(v_ca) || '.',
    'loop', v_id, '/pour-toi#boucles', v_uid);
  perform private.log_activity(v_uid, 'loop_proposed', 'loop', v_id, '{}'::jsonb);
  return v_id;
end;
$$;

-- Réponse à une boucle. Quand la troisième personne accepte, trois
-- collaborations « coup de main » sont créées, une par maillon.
create or replace function public.respond_to_loop(p_id uuid, p_accept boolean)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := private.require_user();
  v_l public.exchange_loops;
  v_members uuid[];
  v_skills uuid[][];
  v_giver uuid;
  v_receiver uuid;
  v_leg uuid[];
  v_proposal uuid;
  v_collab uuid;
  v_title text;
  i int;
  m uuid;
begin
  select * into v_l from public.exchange_loops where id = p_id for update;
  if not found or v_uid not in (v_l.user_a, v_l.user_b, v_l.user_c) then
    raise exception 'loop_not_found';
  end if;
  if v_l.status <> 'proposed' then
    raise exception 'loop_not_open';
  end if;
  v_members := array[v_l.user_a, v_l.user_b, v_l.user_c];

  if not coalesce(p_accept, false) then
    update public.exchange_loops set status = 'declined', declined_by = v_uid where id = p_id;
    foreach m in array v_members loop
      if m <> v_uid then
        perform private.notify(
          m, 'loop_declined',
          private.full_name(v_uid) || ' ne peut pas rejoindre la boucle à trois',
          'La boucle est annulée. D''autres combinaisons restent proposées dans « Pour toi ».',
          'loop', p_id, '/pour-toi#boucles', v_uid);
      end if;
    end loop;
    return jsonb_build_object('status', 'declined');
  end if;

  update public.exchange_loops set
    accepted_a = case when user_a = v_uid then coalesce(accepted_a, now()) else accepted_a end,
    accepted_b = case when user_b = v_uid then coalesce(accepted_b, now()) else accepted_b end,
    accepted_c = case when user_c = v_uid then coalesce(accepted_c, now()) else accepted_c end
  where id = p_id
  returning * into v_l;

  if v_l.accepted_a is null or v_l.accepted_b is null or v_l.accepted_c is null then
    return jsonb_build_object('status', 'proposed');
  end if;

  if (select count(*) from public.profiles where id = any(v_members) and status = 'active') <> 3 then
    raise exception 'receiver_unavailable';
  end if;

  -- Les trois ont accepté : on ouvre un espace de collaboration par maillon.
  for i in 1 .. 3 loop
    v_giver := v_members[i];
    v_receiver := v_members[(i % 3) + 1];
    v_leg := case i when 1 then v_l.skills_ab when 2 then v_l.skills_bc else v_l.skills_ca end;
    v_title := left('Boucle à trois · ' || private.skill_names(v_leg), 140);

    insert into public.exchange_proposals (
      offer_id, sender_id, receiver_id, message, status, responded_at, is_demo)
    values (
      null, v_giver, v_receiver,
      'Maillon d''une boucle d''échange à trois acceptée par ses trois participants : '
        || private.full_name(v_giver) || ' accompagne ' || private.full_name(v_receiver)
        || ' en ' || private.skill_names(v_leg) || '.',
      'accepted', now(), v_l.is_demo)
    returning id into v_proposal;

    insert into public.proposal_skills (proposal_id, skill_id, role)
    select v_proposal, s, 'offered' from unnest(v_leg) as s;

    insert into public.collaborations (proposal_id, loop_id, title, description, exchange_type, is_demo)
    values (
      v_proposal, p_id, v_title,
      private.full_name(v_giver) || ' accompagne ' || private.full_name(v_receiver)
        || '. Ce maillon fait partie d''une boucle : chacun donne une fois et reçoit une fois.',
      'one_off', v_l.is_demo)
    returning id into v_collab;

    insert into public.collaboration_members (collaboration_id, user_id, role)
    values (v_collab, v_giver, 'initiator'), (v_collab, v_receiver, 'partner');

    perform private.ensure_conversation(v_giver, v_receiver);
    perform private.log_activity(v_giver, 'collaboration_started', 'collaboration', v_collab,
      jsonb_build_object('title', v_title, 'with', private.full_name(v_receiver)));
    perform private.log_activity(v_receiver, 'collaboration_started', 'collaboration', v_collab,
      jsonb_build_object('title', v_title, 'with', private.full_name(v_giver)));
  end loop;

  update public.exchange_loops set status = 'active' where id = p_id;

  foreach m in array v_members loop
    perform private.notify(
      m, 'loop_started', 'La boucle d''échange à trois démarre',
      'Les trois participants ont accepté. Tes deux espaces de collaboration sont ouverts.',
      'loop', p_id, '/collaborations', case when m = v_uid then null else v_uid end);
  end loop;
  return jsonb_build_object('status', 'active');
end;
$$;

-- ▼▼▼ 20261113090900_server_tools.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 10 · Outils réservés au serveur
-- Ces fonctions ne sont appelables qu'avec la clé secrète (rôle service_role),
-- depuis les scripts du projet. Jamais depuis le navigateur.
-- ═════════════════════════════════════════════════════════════════════════

-- Donne ou retire le rôle administrateur à partir d'une adresse e-mail.
--   npm run admin:grant -- personne@exemple.com
create or replace function public.server_set_admin(p_email text, p_is_admin boolean default true)
returns text
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
begin
  select u.id into v_user from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'user_not_found';
  end if;
  if coalesce(p_is_admin, true) then
    insert into public.app_admins (user_id) values (v_user) on conflict (user_id) do nothing;
    insert into public.admin_actions (admin_id, action, target_type, target_id, reason)
    values (null, 'admin_granted', 'user', v_user, 'Accordé depuis le serveur.');
    return 'granted';
  end if;
  delete from public.app_admins where user_id = v_user;
  insert into public.admin_actions (admin_id, action, target_type, target_id, reason)
  values (null, 'admin_revoked', 'user', v_user, 'Retiré depuis le serveur.');
  return 'revoked';
end;
$$;

-- Vieillit toutes les données de démonstration de p_days jours, pour que les
-- exemples aient une histoire crédible (un échange ne se fait pas en une seconde).
-- Ne touche qu'aux lignes rattachées à des profils de démonstration.
create or replace function public.demo_age(p_days int)
returns void
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 0), 0), 400);
  v_i interval := make_interval(days => v_days);
begin
  if v_days = 0 then
    return;
  end if;
  perform set_config('devbridge.keep_timestamps', 'on', true);

  update public.profiles set created_at = created_at - v_i where is_demo;
  update public.exchange_offers
    set created_at = created_at - v_i, updated_at = updated_at - v_i where is_demo;
  update public.exchange_proposals
    set created_at = created_at - v_i, updated_at = updated_at - v_i,
        responded_at = responded_at - v_i
  where is_demo;
  update public.exchange_loops
    set created_at = created_at - v_i, updated_at = updated_at - v_i,
        accepted_a = accepted_a - v_i, accepted_b = accepted_b - v_i, accepted_c = accepted_c - v_i
  where is_demo;
  update public.collaborations
    set created_at = created_at - v_i, updated_at = updated_at - v_i,
        completed_at = completed_at - v_i,
        start_date = start_date - v_days, end_date = end_date - v_days
  where is_demo;
  update public.collaboration_members m
    set created_at = m.created_at - v_i, completion_confirmed_at = m.completion_confirmed_at - v_i
  from public.collaborations c where c.id = m.collaboration_id and c.is_demo;
  update public.tasks t
    set created_at = t.created_at - v_i, updated_at = t.updated_at - v_i
  from public.collaborations c where c.id = t.collaboration_id and c.is_demo;
  update public.deliverables d
    set created_at = d.created_at - v_i, reviewed_at = d.reviewed_at - v_i
  from public.tasks t
  join public.collaborations c on c.id = t.collaboration_id and c.is_demo
  where t.id = d.task_id;
  update public.reviews r
    set created_at = r.created_at - v_i
  from public.collaborations c where c.id = r.collaboration_id and c.is_demo;
  update public.messages m
    set created_at = m.created_at - v_i, read_at = m.read_at - v_i
  from public.profiles p where p.id = m.sender_id and p.is_demo;
  update public.conversations c
    set created_at = c.created_at - v_i, last_message_at = c.last_message_at - v_i
  from public.profiles p where p.id = c.user_low and p.is_demo;
  update public.notifications n
    set created_at = n.created_at - v_i
  from public.profiles p where p.id = n.user_id and p.is_demo;
  update public.activity_logs l
    set created_at = l.created_at - v_i
  from public.profiles p where p.id = l.user_id and p.is_demo;
  update public.matches m
    set created_at = m.created_at - v_i, updated_at = m.updated_at - v_i
  from public.profiles p where p.id = m.user_a and p.is_demo;

  perform set_config('devbridge.keep_timestamps', 'off', true);
end;
$$;

-- Marque comme lues toutes les notifications des profils de démonstration
-- (pour que les comptes de démonstration démarrent propres).
create or replace function public.demo_mark_all_read()
returns void
language sql volatile security definer
set search_path = public, pg_temp
as $$
  update public.notifications n set is_read = true
  from public.profiles p where p.id = n.user_id and p.is_demo and not n.is_read;
  update public.messages m set read_at = now()
  from public.profiles p where p.id = m.sender_id and p.is_demo and m.read_at is null;
$$;

-- ▼▼▼ 20261113091000_grants.sql ▼▼▼

-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge · 11 · Droits d'appel des fonctions (toujours en dernier)
-- Par défaut PostgreSQL laisse tout le monde appeler une nouvelle fonction.
-- On referme donc tout, puis on ouvre fonction par fonction.
-- Toute nouvelle fonction doit être ajoutée à l'une des listes ci-dessous.
-- ═════════════════════════════════════════════════════════════════════════

-- Schéma interne : rien n'est appelable, sauf les contrôles utilisés par les règles d'accès.
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_admin(uuid),
  private.is_active_user(uuid),
  private.is_collab_member(uuid, uuid),
  private.is_conversation_member(uuid, uuid),
  private.try_uuid(text)
to anon, authenticated;
grant execute on all functions in schema private to service_role;

do $$
declare
  f record;
  -- Lectures ouvertes aux visiteurs.
  v_public text[] := array[
    'search_offers', 'get_offer', 'search_developers', 'get_profile', 'viewer_context',
    'list_skills', 'get_certificate'];
  -- Réservées aux personnes connectées (chaque fonction revérifie l'identité et les droits).
  v_authenticated text[] := array[
    'get_matches', 'get_match_with', 'set_my_skills', 'refresh_my_matches', 'update_my_profile',
    'save_offer', 'set_offer_status', 'list_my_offers', 'recommended_offers',
    'send_proposal', 'update_proposal', 'cancel_proposal', 'respond_to_proposal',
    'list_my_proposals', 'get_proposal',
    'update_collaboration', 'apply_starter_plan', 'create_task', 'update_task',
    'set_task_status', 'delete_task',
    'submit_deliverable', 'review_deliverable', 'confirm_completion', 'cancel_collaboration',
    'submit_review', 'list_my_collaborations', 'get_collaboration',
    'send_message', 'mark_conversation_read', 'list_my_conversations', 'get_conversation',
    'get_messages', 'list_notifications', 'mark_notifications_read',
    'find_exchange_loops', 'list_my_loops', 'propose_loop', 'respond_to_loop',
    'create_report', 'delete_my_account', 'dashboard_summary',
    'admin_overview', 'admin_list_users', 'admin_set_user_status', 'admin_list_offers',
    'admin_moderate_offer', 'admin_list_reports', 'admin_handle_report'];
  -- Réservées au serveur (clé secrète).
  v_server text[] := array['server_set_admin', 'demo_age', 'demo_mark_all_read'];
begin
  for f in
    select p.oid::regprocedure as signature, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname = any(v_public) or p.proname = any(v_authenticated) or p.proname = any(v_server))
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
    if f.proname = any(v_public) or f.proname = any(v_authenticated) then
      execute format('grant execute on function %s to authenticated', f.signature);
    end if;
    if f.proname = any(v_public) then
      execute format('grant execute on function %s to anon', f.signature);
    end if;
  end loop;
end;
$$;

commit;
