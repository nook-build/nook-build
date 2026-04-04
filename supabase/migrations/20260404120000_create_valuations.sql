-- Weekly valuation lines per project. Run in Supabase SQL editor or via CLI.
create table if not exists public.valuations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  week_label text not null,
  description text default '' not null,
  contract_value numeric,
  percent_complete numeric,
  amount_due numeric not null default 0,
  cumulative_total numeric not null default 0,
  status text not null default 'unpaid'
    check (status in ('paid', 'unpaid')),
  line_order int not null default 0,
  created_at timestamptz default now()
);

create index if not exists valuations_project_line_order_idx
  on public.valuations (project_id, line_order);

alter table public.valuations enable row level security;

-- Adjust policies to match your auth model; mirrors typical early-stage open access.
drop policy if exists "valuations_select" on public.valuations;
drop policy if exists "valuations_insert" on public.valuations;
drop policy if exists "valuations_update" on public.valuations;
drop policy if exists "valuations_delete" on public.valuations;

create policy "valuations_select" on public.valuations for select using (true);
create policy "valuations_insert" on public.valuations for insert with check (true);
create policy "valuations_update" on public.valuations for update using (true) with check (true);
create policy "valuations_delete" on public.valuations for delete using (true);
