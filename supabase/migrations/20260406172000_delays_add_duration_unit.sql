alter table public.delays
  add column if not exists duration integer not null default 0,
  add column if not exists unit text not null default 'days';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'delays_unit_check'
  ) then
    alter table public.delays
      add constraint delays_unit_check
      check (unit in ('days', 'weeks'));
  end if;
end$$;

