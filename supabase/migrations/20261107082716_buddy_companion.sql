-- Only service-role functions may read provider credentials. Clients never access Vault.
create table thread_private.buddy_keys (
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(provider in('openai','anthropic')),
 secret_id uuid not null references vault.secrets(id),
 updated_at timestamptz not null default now(),primary key(user_id,provider)
);
alter table thread_private.buddy_keys enable row level security;
revoke all on thread_private.buddy_keys from public,anon,authenticated;
create table thread_private.buddy_usage(user_id uuid not null references auth.users(id) on delete cascade,day date not null,requests integer not null default 0,primary key(user_id,day));
alter table thread_private.buddy_usage enable row level security;
revoke all on thread_private.buddy_usage from public,anon,authenticated;
create function thread_private.buddy_delete_secret() returns trigger language plpgsql security definer set search_path='' as $$begin delete from vault.secrets where id=old.secret_id;return old;end;$$;
revoke all on function thread_private.buddy_delete_secret() from public,anon,authenticated;
create trigger buddy_key_delete after delete on thread_private.buddy_keys for each row execute function thread_private.buddy_delete_secret();
create function public.thread_buddy_key(owner_id uuid,provider_name text,operation text,key_value text default null) returns text language plpgsql security definer set search_path='' as $$
declare v_secret uuid; result text;
begin
 if provider_name not in('openai','anthropic') then raise exception 'Unsupported provider';end if;
 perform pg_advisory_xact_lock(hashtextextended('buddy-key:'||owner_id::text||provider_name,0));
 select secret_id into v_secret from thread_private.buddy_keys where user_id=owner_id and provider=provider_name;
 if operation='save' then
  if key_value is null or length(key_value)<20 or length(key_value)>512 then raise exception 'Invalid API key';end if;
  if v_secret is null then
   select vault.create_secret(key_value) into v_secret;
   insert into thread_private.buddy_keys(user_id,provider,secret_id) values(owner_id,provider_name,v_secret);
  else perform vault.update_secret(v_secret,key_value);update thread_private.buddy_keys set updated_at=now() where user_id=owner_id and provider=provider_name;end if;
  return 'saved';
 elsif operation='delete' then delete from thread_private.buddy_keys where user_id=owner_id and provider=provider_name;return 'deleted';
 elsif operation='read' then select decrypted_secret into result from vault.decrypted_secrets where id=v_secret;return result;
 else raise exception 'Unsupported operation';end if;
end;$$;
revoke all on function public.thread_buddy_key(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.thread_buddy_key(uuid,text,text,text) to service_role;
create function public.thread_buddy_status(owner_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('pro',thread_private.has_pro(owner_id),'used',coalesce((select requests from thread_private.buddy_usage where user_id=owner_id and day=(now() at time zone 'UTC')::date),0),'limit',20,'providers',coalesce((select jsonb_agg(provider) from thread_private.buddy_keys where user_id=owner_id),'[]'::jsonb));
$$;
revoke all on function public.thread_buddy_status(uuid) from public,anon,authenticated;
grant execute on function public.thread_buddy_status(uuid) to service_role;
create function public.thread_buddy_take(owner_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;premium boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('buddy-usage:'||owner_id::text,0));
 premium:=thread_private.has_pro(owner_id);
 insert into thread_private.rate_limits(key,attempts,window_start) values('buddy:'||owner_id::text,1,now()) on conflict(key) do update set attempts=case when thread_private.rate_limits.window_start<now()-interval '1 minute' then 1 else thread_private.rate_limits.attempts+1 end,window_start=case when thread_private.rate_limits.window_start<now()-interval '1 minute' then now() else thread_private.rate_limits.window_start end returning attempts into n;
 if n>30 then return false;end if;
 select requests into n from thread_private.buddy_usage where user_id=owner_id and day=(now() at time zone 'UTC')::date;
 if not premium and coalesce(n,0)>=20 then return false;end if;
 insert into thread_private.buddy_usage(user_id,day,requests) values(owner_id,(now() at time zone 'UTC')::date,1) on conflict(user_id,day) do update set requests=thread_private.buddy_usage.requests+1;
 return true;
end;$$;
revoke all on function public.thread_buddy_take(uuid) from public,anon,authenticated;
grant execute on function public.thread_buddy_take(uuid) to service_role;
create function public.thread_buddy_refund(owner_id uuid) returns void language sql security definer set search_path='' as $$update thread_private.buddy_usage set requests=greatest(0,requests-1) where user_id=owner_id and day=(now() at time zone 'UTC')::date;$$;
revoke all on function public.thread_buddy_refund(uuid) from public,anon,authenticated;
grant execute on function public.thread_buddy_refund(uuid) to service_role;
