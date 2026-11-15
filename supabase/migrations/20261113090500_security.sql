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
