-- Add is_admin column to profiles
alter table public.profiles add column if not exists is_admin boolean default false;

-- Allow admins to view all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );

-- Allow admins to update any profile
create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );
