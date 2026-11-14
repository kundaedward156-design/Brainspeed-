-- v3 upgrade 6/6: permissions for the new functions
revoke all on function public.find_match(uuid, uuid) from public, anon, authenticated;
grant execute on function public.find_match(uuid, uuid) to service_role;
revoke all on function public._nudge_category(uuid, uuid) from public, anon, authenticated;
grant execute on function public._nudge_category(uuid, uuid) to service_role;
revoke all on function public._try_pair() from public, anon, authenticated;
grant execute on function public._try_pair() to service_role;
revoke all on function public.sweep_matches() from public, anon, authenticated;
grant execute on function public.sweep_matches() to service_role;
revoke all on function public.get_categories(boolean) from public, anon;
grant execute on function public.get_categories(boolean) to authenticated, service_role;
