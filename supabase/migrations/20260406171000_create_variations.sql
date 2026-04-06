create table if not exists public.variations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  vo_number text not null,
  description text not null,
  trade text not null default '—',
  value numeric not null default 0,
  programme_days integer not null default 0 check (programme_days >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  date_raised date not null default current_date,
  client_approval_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists variations_project_vo_number_idx
  on public.variations(project_id, vo_number);
create index if not exists variations_project_id_idx on public.variations(project_id);

alter table public.variations enable row level security;

drop policy if exists "variations_select_all" on public.variations;
create policy "variations_select_all" on public.variations
  for select using (true);

drop policy if exists "variations_insert_all" on public.variations;
create policy "variations_insert_all" on public.variations
  for insert with check (true);

drop policy if exists "variations_update_all" on public.variations;
create policy "variations_update_all" on public.variations
  for update using (true) with check (true);

drop policy if exists "variations_delete_all" on public.variations;
create policy "variations_delete_all" on public.variations
  for delete using (true);
