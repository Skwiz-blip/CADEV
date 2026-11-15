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
