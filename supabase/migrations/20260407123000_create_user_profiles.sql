create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('admin', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_project_id_idx
  on public.user_profiles(project_id);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_all" on public.user_profiles;
create policy "user_profiles_select_all" on public.user_profiles
  for select using (true);

drop policy if exists "user_profiles_insert_all" on public.user_profiles;
create policy "user_profiles_insert_all" on public.user_profiles
  for insert with check (true);

drop policy if exists "user_profiles_update_all" on public.user_profiles;
create policy "user_profiles_update_all" on public.user_profiles
  for update using (true) with check (true);

drop policy if exists "user_profiles_delete_all" on public.user_profiles;
create policy "user_profiles_delete_all" on public.user_profiles
  for delete using (true);
