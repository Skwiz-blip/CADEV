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
