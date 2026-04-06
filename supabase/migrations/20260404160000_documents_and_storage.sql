-- Project documents metadata + private storage bucket for files.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  folder text not null
    check (
      folder in (
        'Contracts',
        'Drawings',
        'Building Control',
        'Invoices',
        'Photos',
        'Other'
      )
    ),
  file_name text not null,
  storage_path text not null,
  content_type text,
  file_size bigint,
  created_at timestamptz default now()
);

create index if not exists documents_project_created_idx
  on public.documents (project_id, created_at desc);

alter table public.documents enable row level security;

drop policy if exists "documents_select" on public.documents;
drop policy if exists "documents_insert" on public.documents;
drop policy if exists "documents_update" on public.documents;
drop policy if exists "documents_delete" on public.documents;

create policy "documents_select" on public.documents for select using (true);
create policy "documents_insert" on public.documents for insert with check (true);
create policy "documents_update" on public.documents for update using (true) with check (true);
create policy "documents_delete" on public.documents for delete using (true);

-- Storage bucket (private — downloads use signed URLs from the app).
insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

drop policy if exists "project_documents_select" on storage.objects;
drop policy if exists "project_documents_insert" on storage.objects;
drop policy if exists "project_documents_update" on storage.objects;
drop policy if exists "project_documents_delete" on storage.objects;

create policy "project_documents_select"
  on storage.objects for select
  using (bucket_id = 'project-documents');

create policy "project_documents_insert"
  on storage.objects for insert
  with check (bucket_id = 'project-documents');

create policy "project_documents_update"
  on storage.objects for update
  using (bucket_id = 'project-documents');

create policy "project_documents_delete"
  on storage.objects for delete
  using (bucket_id = 'project-documents');
