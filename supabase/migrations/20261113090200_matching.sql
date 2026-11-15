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
