-- Read-only production verification for Rayzk Dashboard V0.9.
-- Run each query in Supabase SQL Editor; this file does not change data or schema.

-- 1. Expected runtime tables and their RLS state.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'admin_profile', 'app_settings', 'habits', 'habit_entries', 'daily_notes',
    'clients', 'projects', 'work_sessions', 'payments', 'payment_allocations',
    'tasks', 'purchases', 'reports', 'report_sessions'
  )
order by tablename;

-- 2. Columns required by the V0.9 frontend.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'app_settings', 'habits', 'habit_entries', 'daily_notes', 'clients',
    'projects', 'work_sessions', 'payments', 'payment_allocations', 'tasks',
    'purchases', 'reports', 'report_sessions'
  )
order by table_name, ordinal_position;

-- 3. Constraints and foreign-key behaviour.
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid in (
    select oid from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in (
        'app_settings', 'habits', 'habit_entries', 'daily_notes', 'clients',
        'projects', 'work_sessions', 'payments', 'payment_allocations', 'tasks',
        'purchases', 'reports', 'report_sessions'
      )
  )
order by table_name::text, conname;

-- 4. Policies: each runtime table must show an authenticated owner-access policy.
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'admin_profile', 'app_settings', 'habits', 'habit_entries', 'daily_notes',
    'clients', 'projects', 'work_sessions', 'payments', 'payment_allocations',
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
