-- Read-only production verification for Rayzk Dashboard through V1.2 Notes.
-- Run each query in Supabase SQL Editor; this file does not change data or schema.

-- 1. Expected runtime tables and their RLS state.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'admin_profile', 'app_settings', 'habits', 'habit_entries', 'daily_notes',
    'clients', 'projects', 'work_sessions', 'payments', 'payment_allocations', 'notes',
    'tasks', 'purchases', 'reports', 'report_sessions'
  )
order by tablename;

-- 2. Columns required by the current frontend.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'app_settings', 'habits', 'habit_entries', 'daily_notes', 'clients',
    'projects', 'work_sessions', 'payments', 'payment_allocations', 'notes', 'tasks',
    'purchases', 'reports', 'report_sessions'
  )
order by table_name, ordinal_position;

-- 3. Constraints and foreign-key behaviour.
select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid in (
    select oid from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in (
        'app_settings', 'habits', 'habit_entries', 'daily_notes', 'clients',
        'projects', 'work_sessions', 'payments', 'payment_allocations', 'notes', 'tasks',
        'purchases', 'reports', 'report_sessions'
      )
  )
order by conrelid::regclass::text, conname;

-- 4. Policies: each runtime table must show an authenticated owner-access policy.
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'admin_profile', 'app_settings', 'habits', 'habit_entries', 'daily_notes',
    'clients', 'projects', 'work_sessions', 'payments', 'payment_allocations', 'notes',
    'tasks', 'purchases', 'reports', 'report_sessions'
  )
order by tablename, policyname;

-- 5. V0.9 settings trigger and session-title migration markers.
select trigger_name, event_object_table, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in ('ensure_app_settings_for_admin_on_profile', 'habits_sync_effective_end')
order by trigger_name;

select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'work_sessions'
  and column_name = 'title';

-- 6. V1.1 management RPCs must be present and restricted from public execution.
select proname, proconfig
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'delete_habit_with_history', 'delete_project_keep_sessions',
    'create_payment_and_rebuild_allocations', 'update_payment_and_rebuild_allocations',
    'delete_payment_and_rebuild_allocations', 'delete_work_session_and_rebuild_allocations',
    'rebuild_client_payment_allocations', 'prevent_underallocated_work_session'
  )
order by proname;

-- 7. V1.2 Notes: columns, preservation FK, timestamp trigger and private policies.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notes'
order by ordinal_position;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid = 'public.notes'::regclass
order by conname;

select trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table = 'notes'
order by trigger_name;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'notes'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'notes'
  and grantee in ('authenticated', 'anon')
order by grantee, privilege_type;
