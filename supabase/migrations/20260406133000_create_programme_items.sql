-- Programme (Gantt) items per project.
create table if not exists public.programme_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  trade_name text not null,
  phase text not null,
  start_week int not null check (start_week >= 1),
  end_week int not null check (end_week >= start_week),
  percent_complete numeric not null default 0 check (percent_complete >= 0 and percent_complete <= 100),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'complete')),
  colour text not null default '#F4A623',
  created_at timestamptz not null default now()
);

create index if not exists programme_items_project_start_idx
  on public.programme_items (project_id, start_week, end_week);

alter table public.programme_items enable row level security;

drop policy if exists "programme_items_select" on public.programme_items;
drop policy if exists "programme_items_insert" on public.programme_items;
drop policy if exists "programme_items_update" on public.programme_items;
drop policy if exists "programme_items_delete" on public.programme_items;

create policy "programme_items_select" on public.programme_items
  for select using (true);
create policy "programme_items_insert" on public.programme_items
  for insert with check (true);
create policy "programme_items_update" on public.programme_items
  for update using (true) with check (true);
create policy "programme_items_delete" on public.programme_items
  for delete using (true);
