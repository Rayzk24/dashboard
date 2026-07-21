-- V1.2 Notes hotfix: expose the private table to authenticated users.
-- RLS remains the authority deciding which rows are accessible.

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.notes to authenticated;
revoke all privileges on table public.notes from anon;
