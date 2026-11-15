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
