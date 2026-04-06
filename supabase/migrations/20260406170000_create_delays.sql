create table if not exists public.delays (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  start_week integer not null default 1 check (start_week >= 1),
  days_lost integer not null default 0 check (days_lost >= 0),
  reason text not null default 'Other',
  notes text not null default '',
  date_logged date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delays_project_id_idx on public.delays(project_id);
create index if not exists delays_date_logged_idx on public.delays(date_logged);

alter table public.delays enable row level security;

drop policy if exists "delays_select_all" on public.delays;
create policy "delays_select_all" on public.delays
  for select using (true);

drop policy if exists "delays_insert_all" on public.delays;
create policy "delays_insert_all" on public.delays
  for insert with check (true);

drop policy if exists "delays_update_all" on public.delays;
create policy "delays_update_all" on public.delays
  for update using (true) with check (true);

drop policy if exists "delays_delete_all" on public.delays;
create policy "delays_delete_all" on public.delays
  for delete using (true);
