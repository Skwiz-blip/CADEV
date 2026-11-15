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
