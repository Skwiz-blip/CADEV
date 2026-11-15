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
