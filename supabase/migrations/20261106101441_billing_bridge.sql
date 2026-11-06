alter table public.agent_subscriptions add column last_event_created bigint not null default 0;
revoke select on public.agent_subscriptions from authenticated;
grant select(user_id,stripe_customer_id,stripe_subscription_id,status,updated_at) on public.agent_subscriptions to authenticated;
create or replace function public.thread_billing_shared_secret() returns text language sql security definer set search_path='' as $$ select decrypted_secret from vault.decrypted_secrets where name='thread_billing_bridge' limit 1 $$;
revoke all on function public.thread_billing_shared_secret() from public,anon,authenticated;
grant execute on function public.thread_billing_shared_secret() to service_role;
create or replace function public.thread_sync_subscription(owner_id uuid,subscription_id text,new_status text,event_time bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 if new_status not in('inactive','active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused','review_required') then raise exception 'Invalid subscription status';end if;
 update public.agent_subscriptions set stripe_subscription_id=subscription_id,status=new_status,last_event_created=event_time,updated_at=now() where user_id=owner_id and last_event_created<=event_time;
end;$$;
revoke all on function public.thread_sync_subscription(uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.thread_sync_subscription(uuid,text,text,bigint) to service_role;
