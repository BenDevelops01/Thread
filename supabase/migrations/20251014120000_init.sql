-- Thread — initial schema
-- Run in Supabase SQL Editor, or with `supabase db push`.
-- All user tables use RLS scoped to auth.uid().

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'free',
  plan_source text not null default 'free',
  plan_expires_at timestamptz,
  theme text not null default 'thread-dark',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Notes / tags / links
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  emoji text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  unique (user_id, name)
);

create table if not exists public.note_tags (
  note_id uuid not null references public.notes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (note_id, tag_id)
);

-- Resolved wikilinks between notes (source -> target by title)
create table if not exists public.note_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_note_id uuid not null references public.notes (id) on delete cascade,
  target_title text not null,
  target_note_id uuid references public.notes (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists note_links_source_idx on public.note_links (source_note_id);
create index if not exists note_links_target_idx on public.note_links (target_note_id);

-- ---------------------------------------------------------------------------
-- Tasks (kanban)
-- ---------------------------------------------------------------------------
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'My board',
  created_at timestamptz not null default now()
);

create table if not exists public.columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  position integer not null default 0
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  column_id uuid not null references public.columns (id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'none',
  due_at timestamptz,
  reminder_at timestamptz,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_column_idx on public.tasks (column_id, position);

-- ---------------------------------------------------------------------------
-- Journal
-- ---------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null default current_date,
  title text,
  content text not null default '',
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_user_date_idx on public.journal_entries (user_id, entry_date desc);

-- ---------------------------------------------------------------------------
-- Focus (Pomodoro)
-- ---------------------------------------------------------------------------
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  label text,
  mode text not null default 'focus',
  duration_seconds integer not null default 0,
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists focus_user_idx on public.focus_sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Soundscapes (premium)
-- ---------------------------------------------------------------------------
create table if not exists public.soundscapes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  layers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Activity (heatmap)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  score integer not null default 0,
  counts jsonb not null default '{}'::jsonb,
  unique (user_id, day)
);

-- ---------------------------------------------------------------------------
-- Integrations / plugins / events (logs)
-- ---------------------------------------------------------------------------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  account_label text,
  scopes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- Tokens live here and are NOT readable by users (service role only).
create table if not exists public.integration_secrets (
  integration_id uuid primary key references public.integrations (id) on delete cascade,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.integration_secrets enable row level security;
-- No policies => only the service role can access.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  type text,
  title text not null,
  description text,
  url text,
  meta jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists events_user_time_idx on public.events (user_id, occurred_at desc);

create table if not exists public.plugins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'builtin',
  provider text not null,
  name text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- ---------------------------------------------------------------------------
-- Premium: redeem codes + subscriptions (billing framework, no processor yet)
-- ---------------------------------------------------------------------------
create table if not exists public.redeem_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  grants text not null default 'premium',
  max_uses integer,
  uses integer not null default 0,
  is_founder boolean not null default false,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.redeem_codes enable row level security;
-- No policies => codes are never exposed to clients; redemption happens server-side.

create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_id uuid not null references public.redeem_codes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, code_id)
);
alter table public.redemptions enable row level security;
drop policy if exists "redemptions_select_own" on public.redemptions;
create policy "redemptions_select_own" on public.redemptions
  for select using (auth.uid() = user_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Seed the founder/staff code (hash only; plaintext code issued out-of-band)
insert into public.redeem_codes (code_hash, grants, is_founder, note, active)
values (
  '7343900fdab3ca7ebe3ff4f61645bf015c1abf86639719fa27ef7a9b66945422',
  'premium',
  true,
  'Founder / staff — grants all premium features',
  true
)
on conflict (code_hash) do nothing;

-- ---------------------------------------------------------------------------
-- Generic RLS for user-owned tables
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'notes','tags','note_tags','note_links','boards','columns','tasks',
    'journal_entries','focus_sessions','soundscapes','activity_days',
    'integrations','events','plugins'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    -- note_tags has no user_id column; handle separately
    if t = 'note_tags' then
      execute format(
        'drop policy if exists %I on public.%I', t || '_own', t
      );
      execute format(
        'create policy %I on public.%I for all using (
           exists (select 1 from public.notes n where n.id = note_tags.note_id and n.user_id = auth.uid())
         ) with check (
           exists (select 1 from public.notes n where n.id = note_tags.note_id and n.user_id = auth.uid())
         )', t || '_own', t
      );
    else
      execute format('drop policy if exists %I on public.%I', t || '_own', t);
      execute format(
        'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        t || '_own', t
      );
    end if;
  end loop;
end $$;

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
declare
  t text;
  tables text[] := array['profiles','notes','tasks','journal_entries','integrations'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch', t
    );
  end loop;
end $$;
