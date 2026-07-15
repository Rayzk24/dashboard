-- V0.5.4: session titles, preserving every existing description.
alter table public.work_sessions add column if not exists title text;
update public.work_sessions set title = coalesce(nullif(left(trim(split_part(public_description, E'\n', 1)), 120), ''), 'Session du ' || to_char(session_date, 'DD TMMonth YYYY')) where title is null or trim(title) = '';
alter table public.work_sessions alter column title set not null;
alter table public.work_sessions alter column title set default 'Session de travail';
