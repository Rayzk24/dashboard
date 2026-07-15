-- V0.5.3: preserve the effective life of a habit. Additive only.
alter table public.habits add column if not exists starts_on date;
alter table public.habits add column if not exists ends_on date;
update public.habits set starts_on = coalesce(starts_on, created_at::date, current_date);
alter table public.habits alter column starts_on set default current_date;
alter table public.habits alter column starts_on set not null;

create or replace function public.sync_habit_effective_end()
returns trigger language plpgsql as $$
begin
  if new.archived_at is not null and (old.archived_at is null or new.ends_on is null) then new.ends_on := new.archived_at::date; end if;
  if new.archived_at is null and old.archived_at is not null then new.ends_on := null; end if;
  return new;
end $$;
drop trigger if exists habits_sync_effective_end on public.habits;
create trigger habits_sync_effective_end before update on public.habits for each row execute function public.sync_habit_effective_end();
