create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at timestamptz not null default now()
);

alter table public.stripe_customers enable row level security;

drop policy if exists "stripe_customers_select_own" on public.stripe_customers;
create policy "stripe_customers_select_own" on public.stripe_customers
  for select using (auth.uid() = user_id);
