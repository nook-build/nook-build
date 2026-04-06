create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  certificate_number text not null,
  amount numeric not null default 0,
  date_issued date,
  due_date date,
  date_paid date,
  status text not null default 'unpaid'
    check (status in ('paid', 'unpaid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists certificates_project_cert_number_idx
  on public.certificates (project_id, certificate_number);

create index if not exists certificates_project_issued_idx
  on public.certificates (project_id, date_issued);

alter table public.certificates enable row level security;

drop policy if exists "certificates_select" on public.certificates;
drop policy if exists "certificates_insert" on public.certificates;
drop policy if exists "certificates_update" on public.certificates;
drop policy if exists "certificates_delete" on public.certificates;

create policy "certificates_select" on public.certificates for select using (true);
create policy "certificates_insert" on public.certificates for insert with check (true);
create policy "certificates_update" on public.certificates for update using (true) with check (true);
create policy "certificates_delete" on public.certificates for delete using (true);
