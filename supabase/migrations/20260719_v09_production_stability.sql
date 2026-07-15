-- V0.9: ensure every existing and future administrator has persistent settings.
-- Additive and non-destructive: existing settings rows are never overwritten.

create or replace function public.ensure_app_settings_for_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists ensure_app_settings_for_admin_on_profile on public.admin_profile;
create trigger ensure_app_settings_for_admin_on_profile
after insert on public.admin_profile
for each row execute function public.ensure_app_settings_for_admin();

insert into public.app_settings (user_id)
select id from public.admin_profile
on conflict (user_id) do nothing;
