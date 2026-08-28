-- V1.4 — payments cover the real net amount after commission.
-- Existing payments are preserved; only their derived allocations are rebuilt.

create or replace function public.rebuild_client_payment_allocations_for_owner(
  p_client_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment record;
  v_session record;
  v_available numeric(12,2);
  v_remaining numeric(12,2);
  v_amount numeric(12,2);
begin
  if p_user_id is null or not exists (
    select 1 from public.clients where id = p_client_id and user_id = p_user_id
  ) then
    return;
  end if;

  delete from public.payment_allocations allocation
  using public.payments payment
  where allocation.payment_id = payment.id
    and payment.client_id = p_client_id
    and payment.user_id = p_user_id;

  for v_payment in
    select id, amount_received
    from public.payments
    where client_id = p_client_id
      and user_id = p_user_id
      and status <> 'cancelled'
      and amount_received > 0
    order by payment_date asc, created_at asc, id asc
  loop
    v_available := v_payment.amount_received;

    for v_session in
      select session.id, session.net_amount,
        coalesce(sum(allocation.allocated_amount), 0) as allocated
      from public.work_sessions session
      left join public.payment_allocations allocation on allocation.work_session_id = session.id
      where session.client_id = p_client_id
        and session.user_id = p_user_id
        and session.is_running = false
        and session.time_category = 'billable'
      group by session.id, session.net_amount, session.session_date, session.created_at
      order by session.session_date asc, session.created_at asc, session.id asc
    loop
      exit when v_available <= 0;
      v_remaining := greatest(0, v_session.net_amount - v_session.allocated);
      v_amount := least(v_available, v_remaining);
      if v_amount > 0 then
        insert into public.payment_allocations (
          user_id,
          payment_id,
          work_session_id,
          allocated_amount
        ) values (
          p_user_id,
          v_payment.id,
          v_session.id,
          v_amount
        );
        v_available := v_available - v_amount;
      end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.rebuild_client_payment_allocations(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1 from public.clients where id = p_client_id and user_id = v_user_id
  ) then
    raise exception 'Client introuvable ou accès refusé';
  end if;

  perform public.rebuild_client_payment_allocations_for_owner(p_client_id, v_user_id);
end;
$$;

create or replace function public.prevent_underallocated_work_session()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allocated numeric(12,2);
begin
  select coalesce(sum(allocated_amount), 0)
    into v_allocated
  from public.payment_allocations
  where work_session_id = new.id;

  if new.net_amount < v_allocated then
    raise exception 'Le montant net de la session ne peut pas être inférieur aux règlements déjà attribués';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_underallocated_work_session on public.work_sessions;
create trigger prevent_underallocated_work_session
before update of net_amount on public.work_sessions
for each row execute function public.prevent_underallocated_work_session();

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
    perform public.rebuild_client_payment_allocations_for_owner(old.client_id, old.user_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id and old.project_id is not null then
    perform public.recalculate_project_commissions(old.project_id);
  end if;

  if new.project_id is not null then
    perform public.recalculate_project_commissions(new.project_id);
  end if;

  if tg_op = 'UPDATE' and old.client_id is distinct from new.client_id then
    perform public.rebuild_client_payment_allocations_for_owner(old.client_id, old.user_id);
  end if;
  perform public.rebuild_client_payment_allocations_for_owner(new.client_id, new.user_id);

  return new;
end;
$$;

create or replace function public.sync_project_commissions_from_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.commission_cap is distinct from new.commission_cap then
    perform public.recalculate_project_commissions(new.id);
    perform public.rebuild_client_payment_allocations_for_owner(new.client_id, new.user_id);
  end if;
  return new;
end;
$$;

-- Normalize existing derived allocations once, without deleting any payment.
do $$
declare
  v_client record;
begin
  for v_client in select id, user_id from public.clients
  loop
    perform public.rebuild_client_payment_allocations_for_owner(v_client.id, v_client.user_id);
  end loop;
end
$$;

revoke all on function public.rebuild_client_payment_allocations_for_owner(uuid, uuid) from public, anon, authenticated;
revoke all on function public.rebuild_client_payment_allocations(uuid) from public, anon;
grant execute on function public.rebuild_client_payment_allocations(uuid) to authenticated;
