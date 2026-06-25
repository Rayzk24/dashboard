-- Rayzk Dashboard - Supabase setup
-- Run this file once from the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists admin_profile_singleton_idx
  on public.admin_profile ((true));

create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  code_done boolean not null default false,
  learning_done boolean not null default false,
  outside_done boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists public.summer_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_key text not null,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, goal_key)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_daily_entries_updated_at on public.daily_entries;
create trigger touch_daily_entries_updated_at
before update on public.daily_entries
for each row execute function public.touch_updated_at();

drop trigger if exists touch_summer_goals_updated_at on public.summer_goals;
create trigger touch_summer_goals_updated_at
before update on public.summer_goals
for each row execute function public.touch_updated_at();

create or replace function public.create_first_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.admin_profile) then
    raise exception 'Admin account already exists';
  end if;

  insert into public.admin_profile (id, email)
  values (new.id, coalesce(new.email, ''));

  return new;
end;
$$;

drop trigger if exists create_first_admin_profile_on_auth_user on auth.users;
create trigger create_first_admin_profile_on_auth_user
after insert on auth.users
for each row execute function public.create_first_admin_profile();

create or replace function public.has_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admin_profile);
$$;

create or replace function public.is_admin(check_user uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profile
    where id = check_user
  );
$$;

alter table public.admin_profile enable row level security;
alter table public.daily_entries enable row level security;
alter table public.summer_goals enable row level security;

drop policy if exists "admin profile is readable by admin" on public.admin_profile;
create policy "admin profile is readable by admin"
on public.admin_profile
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "admin can read daily entries" on public.daily_entries;
create policy "admin can read daily entries"
on public.daily_entries
for select
to authenticated
using (public.is_admin(auth.uid()) and user_id = auth.uid());

drop policy if exists "admin can insert daily entries" on public.daily_entries;
create policy "admin can insert daily entries"
on public.daily_entries
for insert
to authenticated
with check (public.is_admin(auth.uid()) and user_id = auth.uid());

drop policy if exists "admin can update daily entries" on public.daily_entries;
create policy "admin can update daily entries"
on public.daily_entries
for update
to authenticated
using (public.is_admin(auth.uid()) and user_id = auth.uid())
with check (public.is_admin(auth.uid()) and user_id = auth.uid());

drop policy if exists "admin can read summer goals" on public.summer_goals;
create policy "admin can read summer goals"
on public.summer_goals
for select
to authenticated
using (public.is_admin(auth.uid()) and user_id = auth.uid());

drop policy if exists "admin can insert summer goals" on public.summer_goals;
create policy "admin can insert summer goals"
on public.summer_goals
for insert
to authenticated
with check (public.is_admin(auth.uid()) and user_id = auth.uid());

drop policy if exists "admin can update summer goals" on public.summer_goals;
create policy "admin can update summer goals"
on public.summer_goals
for update
to authenticated
using (public.is_admin(auth.uid()) and user_id = auth.uid())
with check (public.is_admin(auth.uid()) and user_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant execute on function public.has_admin() to anon, authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant select on public.admin_profile to authenticated;
grant select, insert, update on public.daily_entries to authenticated;
grant select, insert, update on public.summer_goals to authenticated;
