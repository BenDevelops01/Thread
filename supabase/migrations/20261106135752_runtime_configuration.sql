create table thread_private.runtime_config(name text primary key,value text not null);
alter table thread_private.runtime_config enable row level security;
revoke all on thread_private.runtime_config from public,anon,authenticated;
create or replace function public.thread_app_origin() returns text language sql security definer set search_path='' as $$ select value from thread_private.runtime_config where name='site_origin' $$;
revoke all on function public.thread_app_origin() from public,anon,authenticated;
grant execute on function public.thread_app_origin() to service_role;
