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
