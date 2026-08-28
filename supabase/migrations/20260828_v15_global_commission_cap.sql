-- V1.5 — one cumulative commission cap per user, across every session.
-- The legacy projects.commission_cap column is kept for compatibility but is no longer used.

alter table public.app_settings
  add column if not exists commission_cap numeric(12,2);

do $$
begin
  alter table public.app_settings
    add constraint app_settings_commission_cap_nonnegative
    check (commission_cap is null or commission_cap >= 0);
exception
  when duplicate_object then null;
end
$$;

comment on column public.app_settings.commission_cap is
  'Optional cumulative commission cap in euros across all user sessions.';

-- Preserve an existing configured project cap when moving to the single global setting.
update public.app_settings settings
set commission_cap = legacy.commission_cap
from (
  select user_id, max(commission_cap) as commission_cap
  from public.projects
  where commission_cap is not null
  group by user_id
) legacy
where settings.user_id = legacy.user_id
  and settings.commission_cap is null;

create or replace function public.rebuild_user_payment_allocations(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client record;
begin
  for v_client in
    select id from public.clients where user_id = p_user_id
  loop
    perform public.rebuild_client_payment_allocations_for_owner(v_client.id, p_user_id);
  end loop;
end;
$$;

create or replace function public.recalculate_user_commissions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap numeric(12,2);
  v_used numeric(12,2) := 0;
  v_calculated numeric(12,2);
  v_commission numeric(12,2);
  v_session record;
begin
  select commission_cap
    into v_cap
  from public.app_settings
  where user_id = p_user_id;

  if not found then
    return;
  end if;

  -- Allocations are derived data and are rebuilt after all net amounts are updated.
  delete from public.payment_allocations allocation
  using public.payments payment
  where allocation.payment_id = payment.id
    and payment.user_id = p_user_id;

  for v_session in
    select id, gross_amount, commission_rate, time_category
    from public.work_sessions
    where user_id = p_user_id
      and is_running = false
    order by session_date, created_at, id
    for update
  loop
    v_calculated := case
      when v_session.time_category = 'billable'
        then round(coalesce(v_session.gross_amount, 0) * coalesce(v_session.commission_rate, 0) / 100, 2)
      else 0
    end;

    v_commission := case
      when v_cap is null then v_calculated
      else least(v_calculated, greatest(v_cap - v_used, 0))
    end;

    update public.work_sessions
    set commission_amount = v_commission,
        net_amount = round(coalesce(gross_amount, 0) - v_commission, 2)
    where id = v_session.id;

    v_used := v_used + v_commission;
  end loop;
end;
$$;

create or replace function public.sync_project_commissions_from_session()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_user_commissions(old.user_id);
    perform public.rebuild_user_payment_allocations(old.user_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.recalculate_user_commissions(old.user_id);
    perform public.rebuild_user_payment_allocations(old.user_id);
  end if;

  perform public.recalculate_user_commissions(new.user_id);
  perform public.rebuild_user_payment_allocations(new.user_id);
  return new;
end;
$$;

create or replace function public.sync_user_commissions_from_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.commission_cap is distinct from new.commission_cap then
    perform public.recalculate_user_commissions(new.user_id);
    perform public.rebuild_user_payment_allocations(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists projects_sync_commission_cap on public.projects;
drop trigger if exists app_settings_sync_commission_cap on public.app_settings;
create trigger app_settings_sync_commission_cap
after update of commission_cap on public.app_settings
for each row execute function public.sync_user_commissions_from_cap();

-- Apply the global rule once to existing sessions and rebuild only derived allocations.
do $$
declare
  v_settings record;
begin
  for v_settings in select user_id from public.app_settings
  loop
    perform public.recalculate_user_commissions(v_settings.user_id);
    perform public.rebuild_user_payment_allocations(v_settings.user_id);
  end loop;
end
$$;

revoke all on function public.rebuild_user_payment_allocations(uuid) from public, anon, authenticated;
revoke all on function public.recalculate_user_commissions(uuid) from public, anon, authenticated;
revoke all on function public.sync_user_commissions_from_cap() from public, anon, authenticated;
