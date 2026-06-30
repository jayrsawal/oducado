-- Seating tables for organizing the guest roster.

create table public.poll_tables (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint poll_tables_name_check check (trim(name) <> '')
);

create index poll_tables_poll_id_idx on public.poll_tables (poll_id);

comment on table public.poll_tables is
  'Seating tables used to group guests on the poll roster.';

alter table public.poll_roster
  add column table_id uuid references public.poll_tables (id) on delete set null;

create index poll_roster_table_id_idx on public.poll_roster (table_id);

alter table public.poll_tables enable row level security;

create policy "Anyone can read tables for visible polls"
  on public.poll_tables
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.polls p
      where p.id = poll_id
        and (p.status in ('open', 'closed') or public.is_admin())
    )
  );

create policy "Admins manage tables"
  on public.poll_tables
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
