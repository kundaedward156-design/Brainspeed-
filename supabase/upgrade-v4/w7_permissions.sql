-- v4 upgrade 7/7: permissions (money-moving functions stay server-only)
do $$
declare f text;
begin
  foreach f in array array[
    '_busy(uuid)', '_end_invite(uuid,text)', '_expire_stale_invites()',
    'send_invite(uuid,uuid,uuid)', 'respond_invite(uuid,uuid,boolean)', 'cancel_invite(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  foreach f in array array['ping_presence(uuid)', 'online_players(uuid)', 'my_invites()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
