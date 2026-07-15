-- Rayzk Dashboard V1.1: atomic management operations and deterministic allocations.
-- Apply after 20260719_v09_production_stability.sql. This migration is additive.

create or replace function public.rebuild_client_payment_allocations(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_payment record;
  v_session record;
  v_available numeric(12,2);
  v_remaining numeric(12,2);
  v_amount numeric(12,2);
begin
  if v_user_id is null or not exists (
    select 1 from public.clients where id = p_client_id and user_id = v_user_id
  ) then
    raise exception 'Client introuvable ou accès refusé';
  end if;

  delete from public.payment_allocations allocation
  using public.payments payment
  where allocation.payment_id = payment.id
    and payment.client_id = p_client_id
    and payment.user_id = v_user_id;

  for v_payment in
    select id, amount_received
    from public.payments
    where client_id = p_client_id
      and user_id = v_user_id
      and status <> 'cancelled'
      and amount_received > 0
    order by payment_date asc, created_at asc, id asc
  loop
    v_available := v_payment.amount_received;

    for v_session in
      select session.id, session.gross_amount,
        coalesce(sum(allocation.allocated_amount), 0) as allocated
      from public.work_sessions session
      left join public.payment_allocations allocation on allocation.work_session_id = session.id
      where session.client_id = p_client_id
        and session.user_id = v_user_id
        and session.is_running = false
        and session.time_category = 'billable'
      group by session.id, session.gross_amount, session.session_date, session.created_at
      order by session.session_date asc, session.created_at asc, session.id asc
    loop
      exit when v_available <= 0;
      v_remaining := greatest(0, v_session.gross_amount - v_session.allocated);
      v_amount := least(v_available, v_remaining);
      if v_amount > 0 then
        insert into public.payment_allocations (user_id, payment_id, work_session_id, allocated_amount)
        values (v_user_id, v_payment.id, v_session.id, v_amount);
        v_available := v_available - v_amount;
      end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.create_payment_and_rebuild_allocations(
  p_client_id uuid,
  p_project_id uuid,
  p_amount numeric,
  p_payment_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_payment_id uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Le montant doit être positif'; end if;
  if v_user_id is null or not exists (select 1 from public.clients where id = p_client_id and user_id = v_user_id) then
    raise exception 'Client introuvable ou accès refusé';
  end if;
  if p_project_id is not null and not exists (select 1 from public.projects where id = p_project_id and client_id = p_client_id and user_id = v_user_id) then
    raise exception 'Mission invalide';
  end if;

  insert into public.payments (user_id, client_id, project_id, payment_date, amount_expected, amount_received, fees, status)
  values (v_user_id, p_client_id, p_project_id, coalesce(p_payment_date, current_date), p_amount, p_amount, 0, 'paid')
  returning id into v_payment_id;
  perform public.rebuild_client_payment_allocations(p_client_id);
  return v_payment_id;
end;
$$;

create or replace function public.update_payment_and_rebuild_allocations(
  p_payment_id uuid,
  p_amount numeric,
  p_payment_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid(); v_client_id uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Le montant doit être positif'; end if;
  select client_id into v_client_id from public.payments where id = p_payment_id and user_id = v_user_id;
  if v_client_id is null then raise exception 'Règlement introuvable ou accès refusé'; end if;
  update public.payments set amount_expected = p_amount, amount_received = p_amount, payment_date = coalesce(p_payment_date, payment_date), status = 'paid' where id = p_payment_id and user_id = v_user_id;
  perform public.rebuild_client_payment_allocations(v_client_id);
end;
$$;

create or replace function public.delete_payment_and_rebuild_allocations(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid(); v_client_id uuid;
begin
  select client_id into v_client_id from public.payments where id = p_payment_id and user_id = v_user_id;
  if v_client_id is null then raise exception 'Règlement introuvable ou accès refusé'; end if;
  delete from public.payments where id = p_payment_id and user_id = v_user_id;
  perform public.rebuild_client_payment_allocations(v_client_id);
end;
$$;

create or replace function public.delete_work_session_and_rebuild_allocations(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid(); v_client_id uuid;
begin
  select client_id into v_client_id from public.work_sessions where id = p_session_id and user_id = v_user_id;
  if v_client_id is null then raise exception 'Session introuvable ou accès refusé'; end if;
  delete from public.work_sessions where id = p_session_id and user_id = v_user_id;
  perform public.rebuild_client_payment_allocations(v_client_id);
end;
$$;

create or replace function public.delete_project_keep_sessions(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (select 1 from public.projects where id = p_project_id and user_id = v_user_id) then
    raise exception 'Mission introuvable ou accès refusé';
  end if;
  update public.work_sessions set project_id = null where project_id = p_project_id and user_id = v_user_id;
  delete from public.projects where id = p_project_id and user_id = v_user_id;
end;
$$;

create or replace function public.delete_habit_with_history(p_habit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (select 1 from public.habits where id = p_habit_id and user_id = v_user_id) then
    raise exception 'Habitude introuvable ou accès refusé';
  end if;
  -- habit_entries has ON DELETE CASCADE; the deletion is atomic with its history.
  delete from public.habits where id = p_habit_id and user_id = v_user_id;
end;
$$;

create or replace function public.prevent_underallocated_work_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_allocated numeric(12,2);
begin
  select coalesce(sum(allocated_amount), 0) into v_allocated
  from public.payment_allocations
  where work_session_id = new.id;
  if new.gross_amount < v_allocated then
    raise exception 'Le montant de la session ne peut pas être inférieur aux règlements déjà attribués';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_underallocated_work_session on public.work_sessions;
create trigger prevent_underallocated_work_session
before update of gross_amount on public.work_sessions
for each row execute function public.prevent_underallocated_work_session();

revoke all on function public.rebuild_client_payment_allocations(uuid) from public;
revoke all on function public.create_payment_and_rebuild_allocations(uuid, uuid, numeric, date) from public;
revoke all on function public.update_payment_and_rebuild_allocations(uuid, numeric, date) from public;
revoke all on function public.delete_payment_and_rebuild_allocations(uuid) from public;
revoke all on function public.delete_work_session_and_rebuild_allocations(uuid) from public;
revoke all on function public.delete_project_keep_sessions(uuid) from public;
revoke all on function public.delete_habit_with_history(uuid) from public;
grant execute on function public.rebuild_client_payment_allocations(uuid) to authenticated;
grant execute on function public.create_payment_and_rebuild_allocations(uuid, uuid, numeric, date) to authenticated;
grant execute on function public.update_payment_and_rebuild_allocations(uuid, numeric, date) to authenticated;
grant execute on function public.delete_payment_and_rebuild_allocations(uuid) to authenticated;
grant execute on function public.delete_work_session_and_rebuild_allocations(uuid) to authenticated;
grant execute on function public.delete_project_keep_sessions(uuid) to authenticated;
grant execute on function public.delete_habit_with_history(uuid) to authenticated;
