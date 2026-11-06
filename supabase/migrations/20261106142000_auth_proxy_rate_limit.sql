-- Per-account limits remain effective behind a shared server proxy.
create or replace function public.thread_take_auth_attempt(keys text[]) returns boolean language plpgsql security definer set search_path='' as $$
declare k text; n integer; allowed boolean:=true;
begin
 if cardinality(keys) not between 1 and 2 then return false; end if;
 delete from thread_private.rate_limits where window_start<now()-interval '24 hours';
 foreach k in array keys loop
 insert into thread_private.rate_limits(key,attempts,window_start) values(k,1,now()) on conflict(key) do update set attempts=case when thread_private.rate_limits.window_start<now()-interval '15 minutes' then 1 else thread_private.rate_limits.attempts+1 end,window_start=case when thread_private.rate_limits.window_start<now()-interval '15 minutes' then now() else thread_private.rate_limits.window_start end returning attempts into n;
 if n>10 then allowed:=false; end if;
 end loop; return allowed;
end;$$;
revoke all on function public.thread_take_auth_attempt(text[]) from public,anon,authenticated;
grant execute on function public.thread_take_auth_attempt(text[]) to service_role;
