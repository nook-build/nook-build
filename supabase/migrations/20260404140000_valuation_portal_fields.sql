-- Cumulative % per trade line; retention % on project for valuation summary.
alter table public.valuations
  add column if not exists cumulative_percent numeric;

alter table public.projects
  add column if not exists retention_percent numeric default 5;

comment on column public.valuations.cumulative_percent is 'Running % complete for this trade / BOQ line';
comment on column public.projects.retention_percent is 'Typical retention % applied to contract sum (summary display)';
