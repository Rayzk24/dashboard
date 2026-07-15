-- V0.5.1: persistent logical-day rollover. Additive and non-destructive.
alter table public.app_settings
  add column if not exists day_rollover_hour smallint not null default 5
  check (day_rollover_hour between 0 and 8);
