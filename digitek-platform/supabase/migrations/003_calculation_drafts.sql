-- Add draft support to calculations
alter table public.calculations add column if not exists is_draft boolean default false;
alter table public.calculations add column if not exists current_step integer default 1;
