-- Thread agent workspace. Existing legacy tables are retained, but not used.
create schema if not exists thread_private;
revoke all on schema thread_private from public,anon,authenticated;
create table public.agent_tasks(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,title text not null check(length(title) between 1 and 160),agent text not null check(length(agent) between 1 and 80),project text not null check(length(project) between 1 and 80),status text not null default 'working' check(status in ('working','attention','done','failed','paused')),detail text not null default '' check(length(detail)<=2000),session_url text check(session_url is null or session_url='' or (length(session_url)<=2048 and session_url ~ '^https?://')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index on public.agent_tasks(user_id,updated_at desc);
alter table public.agent_tasks enable row level security;
create policy tasks_owner_select on public.agent_tasks for select to authenticated using((select auth.uid())=user_id);
create policy tasks_owner_insert on public.agent_tasks for insert to authenticated with check((select auth.uid())=user_id);
create policy tasks_owner_update on public.agent_tasks for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy tasks_owner_delete on public.agent_tasks for delete to authenticated using((select auth.uid())=user_id);
revoke all on public.agent_tasks from anon,authenticated;
grant select,insert,delete on public.agent_tasks to authenticated;
grant update(title,agent,project,status,detail,session_url,updated_at) on public.agent_tasks to authenticated;
create table public.agent_connections(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,name text not null check(length(name) between 1 and 80),token_hash text not null unique,created_at timestamptz not null default now(),revoked_at timestamptz);
create index on public.agent_connections(user_id);
alter table public.agent_connections enable row level security;
create policy connections_owner_select on public.agent_connections for select to authenticated using((select auth.uid())=user_id);
create policy connections_owner_revoke on public.agent_connections for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id and revoked_at is not null);
revoke all on public.agent_connections from anon,authenticated;
grant select(id,user_id,name,created_at,revoked_at),update(revoked_at) on public.agent_connections to authenticated;
create table public.agent_subscriptions(user_id uuid primary key references auth.users(id) on delete cascade,stripe_customer_id text unique,stripe_subscription_id text unique,status text not null default 'inactive',updated_at timestamptz not null default now());
alter table public.agent_subscriptions enable row level security;
create policy subscriptions_owner_select on public.agent_subscriptions for select to authenticated using((select auth.uid())=user_id);
revoke all on public.agent_subscriptions from anon,authenticated;
grant select on public.agent_subscriptions to authenticated;
create table thread_private.rate_limits(key text primary key,attempts integer not null,window_start timestamptz not null);
alter table thread_private.rate_limits enable row level security;
create or replace function public.thread_take_auth_attempt(keys text[]) returns boolean language plpgsql security definer set search_path='' as $$
declare k text; n integer; allowed boolean:=true;
begin
 if cardinality(keys)<>2 then return false; end if;
 delete from thread_private.rate_limits where window_start<now()-interval '24 hours';
 foreach k in array keys loop
 insert into thread_private.rate_limits(key,attempts,window_start) values(k,1,now()) on conflict(key) do update set attempts=case when thread_private.rate_limits.window_start<now()-interval '15 minutes' then 1 else thread_private.rate_limits.attempts+1 end,window_start=case when thread_private.rate_limits.window_start<now()-interval '15 minutes' then now() else thread_private.rate_limits.window_start end returning attempts into n;
 if n>10 then allowed:=false; end if;
 end loop; return allowed;
end;$$;
revoke all on function public.thread_take_auth_attempt(text[]) from public,anon,authenticated;
grant execute on function public.thread_take_auth_attempt(text[]) to service_role;
create or replace function public.thread_take_event(connection_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; begin
 insert into thread_private.rate_limits(key,attempts,window_start) values('event:'||connection_id::text,1,now()) on conflict(key) do update set attempts=case when thread_private.rate_limits.window_start<now()-interval '1 minute' then 1 else thread_private.rate_limits.attempts+1 end,window_start=case when thread_private.rate_limits.window_start<now()-interval '1 minute' then now() else thread_private.rate_limits.window_start end returning attempts into n;
 return n<=60;end;$$;
revoke all on function public.thread_take_event(uuid) from public,anon,authenticated;
grant execute on function public.thread_take_event(uuid) to service_role;
create or replace function thread_private.enforce_limits() returns trigger language plpgsql security definer set search_path='' as $$
declare premium boolean; amount integer; maximum integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 select exists(select 1 from public.agent_subscriptions where user_id=new.user_id and status in('active','trialing')) into premium;
 if tg_table_name='agent_tasks' then
 if new.status in('done','failed') then return new; end if;
 select count(*) from public.agent_tasks where user_id=new.user_id and status not in('done','failed') and id<>new.id into amount;
 maximum:=case when premium then 50 else 2 end;
 else
 select count(*) from public.agent_connections where user_id=new.user_id and revoked_at is null and id<>new.id into amount;
 maximum:=case when premium then 10 else 1 end;
 end if;
 if amount>=maximum then raise exception 'Your plan limit has been reached.';end if;
 return new;
end;$$;
revoke all on function thread_private.enforce_limits() from public,anon,authenticated;
create trigger task_plan_limit before insert or update on public.agent_tasks for each row execute function thread_private.enforce_limits();
create trigger connection_plan_limit before insert on public.agent_connections for each row execute function thread_private.enforce_limits();
grant all on public.agent_tasks,public.agent_connections,public.agent_subscriptions to service_role;
