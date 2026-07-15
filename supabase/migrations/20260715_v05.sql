-- Rayzk Dashboard V0.5 -- additive migration. Run after supabase/schema.sql.
-- It never drops or alters the legacy Summer '26 tables.

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Rayzk',
  public_site text not null default 'rayzk.fr',
  default_hourly_rate numeric(12,2) not null default 12 check (default_hourly_rate >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  legacy_migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120), icon text, color text,
  frequency text not null default 'daily' check (frequency in ('daily','weekly_days')),
  week_days smallint[] not null default '{}', position integer not null default 0,
  is_active boolean not null default true, archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (week_days <@ array[0,1,2,3,4,5,6]::smallint[])
);
create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade, entry_date date not null,
  completed boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (habit_id, entry_date)
);
create table if not exists public.daily_notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null, content text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, entry_date)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160), contact text, email text,
  status text not null default 'active' check (status in ('prospect','active','waiting','completed','archived')),
  hourly_rate numeric(12,2) check (hourly_rate is null or hourly_rate >= 0), payment_method text, private_notes text not null default '',
  last_contact_date date, next_follow_up_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade, name text not null check (char_length(trim(name)) between 1 and 160),
  description text not null default '', status text not null default 'planned' check (status in ('planned','in_progress','waiting','completed','archived')),
  billing_method text not null default 'hourly' check (billing_method in ('hourly','flat')),
  hourly_rate numeric(12,2) check (hourly_rate is null or hourly_rate >= 0), flat_rate numeric(12,2) check (flat_rate is null or flat_rate >= 0),
  estimated_hours numeric(10,2) check (estimated_hours is null or estimated_hours >= 0), commission_rate numeric(5,2) not null default 0 check (commission_rate between 0 and 100),
  start_date date, due_date date, completed_date date, included_items text not null default '', excluded_items text not null default '', private_notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict, project_id uuid references public.projects(id) on delete set null,
  session_date date not null default current_date, started_at timestamptz, ended_at timestamptz, duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  is_running boolean not null default false, public_description text not null default '', private_notes text not null default '',
  hourly_rate numeric(12,2) not null check (hourly_rate >= 0), commission_rate numeric(5,2) not null default 0 check (commission_rate between 0 and 100),
  time_category text not null default 'billable' check (time_category in ('billable','non_billable','research','free_support')),
  gross_amount numeric(12,2) not null default 0 check (gross_amount >= 0), commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0), net_amount numeric(12,2) not null default 0 check (net_amount >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((not is_running) or (started_at is not null and ended_at is null))
);
create unique index if not exists work_sessions_one_running_per_user on public.work_sessions(user_id) where is_running;
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict, project_id uuid references public.projects(id) on delete set null,
  payment_date date not null default current_date, amount_expected numeric(12,2) not null default 0 check (amount_expected >= 0), amount_received numeric(12,2) not null default 0 check (amount_received >= 0),
  fees numeric(12,2) not null default 0 check (fees >= 0), payment_method text, reference_note text not null default '',
  status text not null default 'planned' check (status in ('planned','requested','partial','paid','overdue','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade, work_session_id uuid not null references public.work_sessions(id) on delete cascade,
  allocated_amount numeric(12,2) not null check (allocated_amount > 0), created_at timestamptz not null default now(), unique(payment_id, work_session_id)
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200), description text not null default '',
  status text not null default 'todo' check (status in ('todo','in_progress','completed','archived')),
  priority text not null default 'normal' check (priority in ('low','normal','high')), category text not null default 'personal' check (category in ('personal','freelance')),
  planned_date date, due_date date, client_id uuid references public.clients(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  position integer not null default 0, completed_at timestamptz, legacy_key text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, legacy_key)
);
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160), estimated_price numeric(12,2) check (estimated_price is null or estimated_price >= 0),
  url text, category text, priority text not null default 'useful' check (priority in ('urgent','useful','not_urgent')),
  certainty text not null default 'thinking' check (certainty in ('sure','thinking','idea')), status text not null default 'considering' check (status in ('considering','planned','bought','abandoned')),
  note text not null default '', purchased_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict, project_id uuid references public.projects(id) on delete set null,
  title text not null, period_start date, period_end date, include_durations boolean not null default true, include_rate boolean not null default false, include_amounts boolean not null default true,
  generated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.report_sessions (
  report_id uuid not null references public.reports(id) on delete cascade, work_session_id uuid not null references public.work_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, primary key(report_id, work_session_id)
);

create index if not exists habits_user_active_position_idx on public.habits(user_id, is_active, position);
create index if not exists habit_entries_user_date_idx on public.habit_entries(user_id, entry_date);
create index if not exists daily_notes_user_date_idx on public.daily_notes(user_id, entry_date);
create index if not exists clients_user_status_idx on public.clients(user_id, status);
create index if not exists projects_user_client_idx on public.projects(user_id, client_id);
create index if not exists sessions_user_client_date_idx on public.work_sessions(user_id, client_id, session_date desc);
create index if not exists payments_user_client_date_idx on public.payments(user_id, client_id, payment_date desc);
create index if not exists tasks_user_status_date_idx on public.tasks(user_id, status, planned_date);
create index if not exists purchases_user_status_idx on public.purchases(user_id, status);

-- Reuse the legacy timestamp trigger where available.
do $$ declare tab text; begin
  foreach tab in array array['app_settings','habits','habit_entries','daily_notes','clients','projects','work_sessions','payments','tasks','purchases'] loop
    execute format('drop trigger if exists %I on public.%I', 'touch_' || tab || '_updated_at', tab);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', 'touch_' || tab || '_updated_at', tab);
  end loop;
end $$;

-- Admin-only RLS for every V0.5 table.
do $$ declare tab text; begin
  foreach tab in array array['app_settings','habits','habit_entries','daily_notes','clients','projects','work_sessions','payments','payment_allocations','tasks','purchases','reports','report_sessions'] loop
    execute format('alter table public.%I enable row level security', tab);
    execute format('drop policy if exists "owner access" on public.%I', tab);
    execute format('create policy "owner access" on public.%I for all to authenticated using (public.is_admin(auth.uid()) and user_id = auth.uid()) with check (public.is_admin(auth.uid()) and user_id = auth.uid())', tab);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tab);
  end loop;
end $$;

-- Seed V0.5 settings and migrate legacy data once, while retaining original tables unchanged.
insert into public.app_settings (user_id)
select id from public.admin_profile on conflict (user_id) do nothing;

insert into public.habits (user_id, name, icon, color, position)
select ap.id, seed.name, seed.icon, seed.color, seed.position
from public.admin_profile ap cross join (values
  ('Code', 'Code2', '#1E5B46', 1), ('Apprentissage', 'BookOpen', '#B7791F', 2), ('Extérieur', 'Sun', '#5C7E95', 3)
) as seed(name, icon, color, position)
where not exists (select 1 from public.habits h where h.user_id = ap.id and h.name = seed.name);

insert into public.habit_entries (user_id, habit_id, entry_date, completed)
select d.user_id, h.id, d.entry_date,
  case h.name when 'Code' then d.code_done when 'Apprentissage' then d.learning_done when 'Extérieur' then d.outside_done else false end
from public.daily_entries d join public.habits h on h.user_id = d.user_id and h.name in ('Code','Apprentissage','Extérieur')
on conflict (habit_id, entry_date) do nothing;

insert into public.daily_notes (user_id, entry_date, content)
select user_id, entry_date, notes from public.daily_entries where notes <> ''
on conflict (user_id, entry_date) do nothing;

insert into public.tasks (user_id, title, status, category, legacy_key, created_at)
select user_id, title, case when completed then 'completed' else 'archived' end, 'personal', 'summer-goal:' || goal_key, created_at
from public.summer_goals
on conflict (user_id, legacy_key) do nothing;

update public.app_settings set legacy_migrated_at = coalesce(legacy_migrated_at, now()) where legacy_migrated_at is null;
