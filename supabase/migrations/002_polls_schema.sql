-- Polls, categories, options, voters, and votes

create type public.poll_status as enum ('draft', 'open', 'closed');

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.poll_status not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint polls_schedule_check check (
    opens_at is null
    or closes_at is null
    or closes_at > opens_at
  )
);

comment on table public.polls is
  'A reunion poll. Keep in draft until categories and options are configured.';

create trigger polls_set_updated_at
  before update on public.polls
  for each row execute function public.set_updated_at();

create table public.poll_categories (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  name text not null,
  description text,
  min_selections integer not null default 1,
  max_selections integer,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint poll_categories_min_selections_check check (min_selections >= 0),
  constraint poll_categories_max_selections_check check (
    max_selections is null
    or max_selections >= min_selections
  )
);

comment on column public.poll_categories.min_selections is
  'Minimum number of options a voter must select in this category.';
comment on column public.poll_categories.max_selections is
  'Maximum number of options a voter may select. Null means no upper limit.';

create trigger poll_categories_set_updated_at
  before update on public.poll_categories
  for each row execute function public.set_updated_at();

create index poll_categories_poll_id_idx on public.poll_categories (poll_id);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.poll_categories (id) on delete cascade,
  label text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.poll_options is
  'Selectable choices within a poll category.';

create trigger poll_options_set_updated_at
  before update on public.poll_options
  for each row execute function public.set_updated_at();

create index poll_options_category_id_idx on public.poll_options (category_id);

-- A voter represents one ballot in a poll: either a device or a named person (admin proxy).
create table public.poll_voters (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  device_id uuid,
  display_name text,
  is_proxy boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint poll_voters_identity_check check (
    device_id is not null
    or display_name is not null
  )
);

comment on table public.poll_voters is
  'One ballot per device or per admin-entered person name.';
comment on column public.poll_voters.device_id is
  'Client-generated UUID stored in localStorage for per-device voting.';
comment on column public.poll_voters.is_proxy is
  'True when an admin created this ballot on behalf of someone else.';

create unique index poll_voters_poll_device_uidx
  on public.poll_voters (poll_id, device_id)
  where device_id is not null;

create index poll_voters_poll_id_idx on public.poll_voters (poll_id);

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  voter_id uuid not null references public.poll_voters (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  cast_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint poll_votes_unique_ballot unique (voter_id, option_id)
);

comment on table public.poll_votes is
  'Individual selections on a ballot. cast_by is set when an admin submits on behalf of a voter.';

create index poll_votes_poll_id_idx on public.poll_votes (poll_id);
create index poll_votes_option_id_idx on public.poll_votes (option_id);
create index poll_votes_voter_id_idx on public.poll_votes (voter_id);

-- Running totals for admins and public result displays.
create or replace view public.poll_option_results as
select
  p.id as poll_id,
  p.title as poll_title,
  p.status as poll_status,
  c.id as category_id,
  c.name as category_name,
  c.display_order as category_order,
  o.id as option_id,
  o.label as option_label,
  o.description as option_description,
  o.display_order as option_order,
  count(v.id)::integer as vote_count
from public.polls p
join public.poll_categories c on c.poll_id = p.id
join public.poll_options o on o.category_id = c.id
left join public.poll_votes v on v.option_id = o.id
group by
  p.id,
  p.title,
  p.status,
  c.id,
  c.name,
  c.display_order,
  o.id,
  o.label,
  o.description,
  o.display_order
order by
  p.id,
  c.display_order,
  o.display_order;

comment on view public.poll_option_results is
  'Running vote totals per option, grouped by poll and category.';

create or replace view public.poll_summary as
select
  p.id as poll_id,
  p.title,
  p.status,
  count(distinct pv.id)::integer as voter_count,
  count(v.id)::integer as total_votes
from public.polls p
left join public.poll_voters pv on pv.poll_id = p.id
left join public.poll_votes v on v.poll_id = p.id
group by p.id, p.title, p.status;

comment on view public.poll_summary is
  'High-level poll stats: number of ballots and total selections.';
