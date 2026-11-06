-- User preferences are owner-scoped; access-code material never enters public schemas.
create table public.agent_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=80),
 theme text not null default 'system' check(theme in('light','dark','system')),
 refresh_seconds integer not null default 15 check(refresh_seconds in(15,30,60)),
 updated_at timestamptz not null default now()
);
alter table public.agent_preferences enable row level security;
revoke all on public.agent_preferences from anon,authenticated;
grant select,insert on public.agent_preferences to authenticated;
grant update(user_id,display_name,theme,refresh_seconds,updated_at) on public.agent_preferences to authenticated;
create policy preferences_select on public.agent_preferences for select to authenticated using((select auth.uid())=user_id);
create policy preferences_insert on public.agent_preferences for insert to authenticated with check((select auth.uid())=user_id);
create policy preferences_update on public.agent_preferences for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create table thread_private.access_codes (
 id uuid primary key default gen_random_uuid(), code_hash text unique not null check(length(code_hash)=64),
 label text not null,created_at timestamptz not null default now(),expires_at timestamptz,
 redeemed_at timestamptz,redeemed_by uuid references auth.users(id) on delete set null,
 revoked_at timestamptz
);
alter table thread_private.access_codes enable row level security;
revoke all on thread_private.access_codes from public,anon,authenticated;
create table public.agent_premium_grants (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code_id uuid unique not null references thread_private.access_codes(id),
 granted_at timestamptz not null default now(),expires_at timestamptz,revoked_at timestamptz
);
alter table public.agent_premium_grants enable row level security;
revoke all on public.agent_premium_grants from anon,authenticated;
grant select(user_id,granted_at,expires_at,revoked_at) on public.agent_premium_grants to authenticated;
create policy grants_select_own on public.agent_premium_grants for select to authenticated using((select auth.uid())=user_id);
create or replace function thread_private.has_pro(owner_id uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.agent_subscriptions where user_id=owner_id and status in('active','trialing')) or exists(select 1 from public.agent_premium_grants where user_id=owner_id and revoked_at is null and (expires_at is null or expires_at>now()))
$$;
revoke all on function thread_private.has_pro(uuid) from public,anon,authenticated;
create or replace function public.thread_entitlement() returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner uuid:=auth.uid(); grant_expiry timestamptz;
begin
 if owner is null then raise exception 'Authentication required';end if;
 if exists(select 1 from public.agent_premium_grants where user_id=owner and revoked_at is null and (expires_at is null or expires_at>now())) then
 select expires_at into grant_expiry from public.agent_premium_grants where user_id=owner;
 return jsonb_build_object('pro',true,'source','code','expires_at',grant_expiry);
 end if;
 if exists(select 1 from public.agent_subscriptions where user_id=owner and status in('active','trialing')) then return jsonb_build_object('pro',true,'source','stripe');end if;
 return jsonb_build_object('pro',false,'source','free');
end;$$;
revoke all on function public.thread_entitlement() from public,anon;
grant execute on function public.thread_entitlement() to authenticated;
create or replace function public.thread_redeem_access(owner_id uuid,digest text) returns jsonb language plpgsql security definer set search_path='' as $$
declare code_id uuid;
begin
 if not exists(select 1 from auth.users where id=owner_id) then return jsonb_build_object('error','Sign in first.');end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
 if exists(select 1 from public.agent_premium_grants where user_id=owner_id and revoked_at is null and (expires_at is null or expires_at>now())) then return jsonb_build_object('error','This account already has complimentary Pro access.');end if;
 if exists(select 1 from public.agent_subscriptions where user_id=owner_id and status in('active','trialing')) then return jsonb_build_object('error','This account already has a paid Pro subscription. Manage it in Plan & billing before redeeming a code.');end if;
 update thread_private.access_codes set redeemed_at=now(),redeemed_by=owner_id where code_hash=digest and redeemed_at is null and revoked_at is null and (expires_at is null or expires_at>now()) returning id into code_id;
 if code_id is null then return jsonb_build_object('error','This code is invalid, expired or already redeemed.');end if;
 insert into public.agent_premium_grants(user_id,code_id) values(owner_id,code_id) on conflict(user_id) do update set code_id=excluded.code_id,granted_at=now(),expires_at=null,revoked_at=null;
 return jsonb_build_object('ok',true,'pro',true,'source','code');
end;$$;
revoke all on function public.thread_redeem_access(uuid,text) from public,anon,authenticated;
grant execute on function public.thread_redeem_access(uuid,text) to service_role;
create or replace function thread_private.enforce_limits() returns trigger language plpgsql security definer set search_path='' as $$
declare premium boolean; amount integer; maximum integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 premium:=thread_private.has_pro(new.user_id);
 if tg_table_name='agent_tasks' then
 if new.status in('done','failed') then return new;end if;
 select count(*) from public.agent_tasks where user_id=new.user_id and status not in('done','failed') and id<>new.id into amount;
 maximum:=case when premium then 50 else 2 end;
 else
 select count(*) from public.agent_connections where user_id=new.user_id and revoked_at is null and id<>new.id into amount;
 maximum:=case when premium then 10 else 1 end;
 end if;
 if amount>=maximum then raise exception 'Your plan limit has been reached.';end if;
 return new;
end;$$;
grant all on public.agent_preferences,public.agent_premium_grants,thread_private.access_codes to service_role;
