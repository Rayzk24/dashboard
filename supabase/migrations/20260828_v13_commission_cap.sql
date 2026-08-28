-- V1.3 — optional cumulative commission cap per project.
-- Additive only: existing projects keep an uncapped commission (NULL).

alter table public.projects
  add column if not exists commission_cap numeric(12,2);

do $$
begin
  alter table public.projects
    add constraint projects_commission_cap_nonnegative
    check (commission_cap is null or commission_cap >= 0);
exception
  when duplicate_object then null;
end
$$;

comment on column public.projects.commission_cap is
  'Optional cumulative commission cap in euros for all sessions of the project.';

create or replace function public.recalculate_project_commissions(p_project_id uuid)
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
  from public.projects
  where id = p_project_id;

  if not found then
    return;
  end if;

  for v_session in
    select id, gross_amount, commission_rate, time_category
    from public.work_sessions
    where project_id = p_project_id
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
    if old.project_id is not null then
      perform public.recalculate_project_commissions(old.project_id);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id and old.project_id is not null then
    perform public.recalculate_project_commissions(old.project_id);
  end if;

  if new.project_id is not null then
    perform public.recalculate_project_commissions(new.project_id);
  end if;

  return new;
end;
$$;

drop trigger if exists work_sessions_sync_project_commissions on public.work_sessions;
create trigger work_sessions_sync_project_commissions
after insert or delete or update of project_id, session_date, gross_amount, commission_rate, time_category, is_running
on public.work_sessions
for each row execute function public.sync_project_commissions_from_session();

create or replace function public.sync_project_commissions_from_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.commission_cap is distinct from new.commission_cap then
    perform public.recalculate_project_commissions(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists projects_sync_commission_cap on public.projects;
create trigger projects_sync_commission_cap
after update of commission_cap on public.projects
for each row execute function public.sync_project_commissions_from_cap();

revoke all on function public.recalculate_project_commissions(uuid) from public, anon, authenticated;
revoke all on function public.sync_project_commissions_from_session() from public, anon, authenticated;
revoke all on function public.sync_project_commissions_from_cap() from public, anon, authenticated;
