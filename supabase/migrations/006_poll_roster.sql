-- Pre-defined guest name list per poll.

create table public.poll_roster (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  display_name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint poll_roster_name_check check (trim(display_name) <> '')
);

create unique index poll_roster_poll_name_uidx
  on public.poll_roster (poll_id, lower(trim(display_name)));

create index poll_roster_poll_id_idx on public.poll_roster (poll_id);

comment on table public.poll_roster is
  'Pre-defined names guests can pick from when voting on a poll.';

alter table public.poll_roster enable row level security;

create policy "Anyone can read roster for visible polls"
  on public.poll_roster
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

create policy "Admins manage roster"
  on public.poll_roster
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
