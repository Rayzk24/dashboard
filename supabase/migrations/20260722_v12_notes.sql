-- V1.2 Notes: private rich notes, optionally linked to one client.
-- Additive and non-destructive. Client deletion preserves notes as global notes.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name_snapshot text,
  title text not null default '',
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  plain_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_title_length check (char_length(title) <= 300)
);

create index if not exists notes_user_updated_idx
  on public.notes(user_id, updated_at desc);
create index if not exists notes_user_client_idx
  on public.notes(user_id, client_id);
create index if not exists notes_client_idx
  on public.notes(client_id);

drop trigger if exists touch_notes_updated_at on public.notes;
create trigger touch_notes_updated_at
before update on public.notes
for each row execute function public.touch_updated_at();

alter table public.notes enable row level security;

drop policy if exists "notes select own" on public.notes;
create policy "notes select own"
on public.notes for select
to authenticated
using (public.is_admin(auth.uid()) and user_id = auth.uid());

drop policy if exists "notes insert own" on public.notes;
create policy "notes insert own"
on public.notes for insert
to authenticated
with check (
  public.is_admin(auth.uid())
  and user_id = auth.uid()
  and (
    client_id is null
    or exists (
      select 1 from public.clients client
      where client.id = public.notes.client_id and client.user_id = auth.uid()
    )
  )
);

drop policy if exists "notes update own" on public.notes;
create policy "notes update own"
on public.notes for update
to authenticated
using (public.is_admin(auth.uid()) and user_id = auth.uid())
with check (
  public.is_admin(auth.uid())
  and user_id = auth.uid()
  and (
    client_id is null
    or exists (
      select 1 from public.clients client
      where client.id = public.notes.client_id and client.user_id = auth.uid()
    )
  )
);

drop policy if exists "notes delete own" on public.notes;
create policy "notes delete own"
on public.notes for delete
to authenticated
using (public.is_admin(auth.uid()) and user_id = auth.uid());
