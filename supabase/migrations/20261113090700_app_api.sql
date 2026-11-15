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
