-- Command Centre: dates, finance deltas, delays, locked items, postcode for weather.
alter table public.projects
  add column if not exists postcode text,
  add column if not exists handover_date date,
  add column if not exists deposit_paid boolean default false not null,
  add column if not exists variations_total numeric default 0,
  add column if not exists total_delays_days integer default 0,
  add column if not exists locked_items_count integer default 0;

comment on column public.projects.postcode is 'UK postcode for weather lookup (optional if geocoded from address)';
comment on column public.projects.handover_date is 'Planned practical completion / handover date';
comment on column public.projects.deposit_paid is 'Whether the contract deposit has been received';
comment on column public.projects.variations_total is 'Net approved variations vs original contract (+/-)';
comment on column public.projects.total_delays_days is 'Recorded programme delay total in calendar days';
comment on column public.projects.locked_items_count is 'Count of locked / frozen programme or commercial items';
