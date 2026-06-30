-- Row-level security and ballot submission helpers

alter table public.profiles enable row level security;
alter table public.polls enable row level security;
alter table public.poll_categories enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_voters enable row level security;
alter table public.poll_votes enable row level security;

-- Profiles
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "Admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Polls
create policy "Anyone can read open or closed polls"
  on public.polls
  for select
  to anon, authenticated
  using (status in ('open', 'closed'));

create policy "Admins can read all polls"
  on public.polls
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins manage polls"
  on public.polls
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Categories and options follow poll visibility
create policy "Anyone can read categories for visible polls"
  on public.poll_categories
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

create policy "Admins manage categories"
  on public.poll_categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Anyone can read options for visible polls"
  on public.poll_options
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.poll_categories c
      join public.polls p on p.id = c.poll_id
      where c.id = category_id
        and (p.status in ('open', 'closed') or public.is_admin())
    )
  );

create policy "Admins manage options"
  on public.poll_options
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Voters
create policy "Anyone can read voters for open polls"
  on public.poll_voters
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.polls p
      where p.id = poll_id
        and p.status = 'open'
    )
    or public.is_admin()
  );

create policy "Device voters can register themselves on open polls"
  on public.poll_voters
  for insert
  to anon, authenticated
  with check (
    device_id is not null
    and display_name is null
    and is_proxy = false
    and exists (
      select 1
      from public.polls p
      where p.id = poll_id
        and p.status = 'open'
    )
  );

create policy "Admins manage proxy voters"
  on public.poll_voters
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Votes
create policy "Anyone can read votes for open or closed polls"
  on public.poll_votes
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.polls p
      where p.id = poll_id
        and p.status in ('open', 'closed')
    )
    or public.is_admin()
  );

create policy "Device voters can cast their own votes on open polls"
  on public.poll_votes
  for insert
  to anon, authenticated
  with check (
    cast_by is null
    and exists (
      select 1
      from public.poll_voters pv
      join public.polls p on p.id = pv.poll_id
      where pv.id = voter_id
        and pv.poll_id = poll_id
        and pv.device_id is not null
        and pv.is_proxy = false
        and p.status = 'open'
    )
  );

create policy "Admins can cast votes for any voter"
  on public.poll_votes
  for insert
  to authenticated
  with check (
    public.is_admin()
    and cast_by = auth.uid()
    and exists (
      select 1
      from public.polls p
      where p.id = poll_id
        and p.status in ('open', 'closed')
    )
  );

create policy "Admins can update or delete votes"
  on public.poll_votes
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete votes"
  on public.poll_votes
  for delete
  to authenticated
  using (public.is_admin());

-- Replace a voter's entire ballot atomically with validation.
create or replace function public.submit_poll_ballot(
  p_poll_id uuid,
  p_voter_id uuid,
  p_option_ids uuid[],
  p_cast_by uuid default null,
  p_device_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll_status public.poll_status;
  v_voter public.poll_voters%rowtype;
  v_category record;
  v_selected_count integer;
  v_option_count integer;
  v_distinct_options integer;
begin
  select status into v_poll_status
  from public.polls
  where id = p_poll_id;

  if v_poll_status is null then
    raise exception 'Poll not found';
  end if;

  if v_poll_status <> 'open' and p_cast_by is null then
    raise exception 'Poll is not open for voting';
  end if;

  if v_poll_status not in ('open', 'closed') and p_cast_by is not null then
    raise exception 'Poll is not available for admin ballot submission';
  end if;

  select * into v_voter
  from public.poll_voters
  where id = p_voter_id
    and poll_id = p_poll_id;

  if v_voter.id is null then
    raise exception 'Voter not found for this poll';
  end if;

  if p_cast_by is not null and not exists (
    select 1 from public.profiles where id = p_cast_by and is_admin = true
  ) then
    raise exception 'Only admins can submit ballots on behalf of others';
  end if;

  if p_cast_by is null and (v_voter.device_id is null or v_voter.is_proxy) then
    raise exception 'This ballot can only be submitted by an admin';
  end if;

  if p_cast_by is null and v_voter.device_id is distinct from p_device_id then
    raise exception 'Device id does not match this ballot';
  end if;

  select count(distinct unnest_option_id)
  into v_distinct_options
  from unnest(p_option_ids) as unnest_option_id;

  if v_distinct_options <> coalesce(array_length(p_option_ids, 1), 0) then
    raise exception 'Duplicate option selections are not allowed';
  end if;

  select count(*) into v_option_count
  from public.poll_options o
  join public.poll_categories c on c.id = o.category_id
  where c.poll_id = p_poll_id
    and o.id = any (p_option_ids);

  if v_option_count <> coalesce(array_length(p_option_ids, 1), 0) then
    raise exception 'One or more options do not belong to this poll';
  end if;

  for v_category in
    select id, name, min_selections, max_selections
    from public.poll_categories
    where poll_id = p_poll_id
    order by display_order
  loop
    select count(*) into v_selected_count
    from public.poll_options o
    where o.category_id = v_category.id
      and o.id = any (p_option_ids);

    if v_selected_count < v_category.min_selections then
      raise exception 'Category "%" requires at least % selection(s), but % were provided',
        v_category.name,
        v_category.min_selections,
        v_selected_count;
    end if;

    if v_category.max_selections is not null
      and v_selected_count > v_category.max_selections then
      raise exception 'Category "%" allows at most % selection(s), but % were provided',
        v_category.name,
        v_category.max_selections,
        v_selected_count;
    end if;
  end loop;

  delete from public.poll_votes
  where voter_id = p_voter_id
    and poll_id = p_poll_id;

  insert into public.poll_votes (poll_id, voter_id, option_id, cast_by)
  select
    p_poll_id,
    p_voter_id,
    option_id,
    p_cast_by
  from unnest(p_option_ids) as option_id;
end;
$$;

comment on function public.submit_poll_ballot(uuid, uuid, uuid[], uuid, uuid) is
  'Validates category min/max rules and replaces a voter ballot in one transaction.';

grant execute on function public.submit_poll_ballot(uuid, uuid, uuid[], uuid, uuid) to anon, authenticated;

-- Convenience helpers for the frontend.
create or replace function public.get_or_create_device_voter(
  p_poll_id uuid,
  p_device_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voter_id uuid;
begin
  if not exists (
    select 1 from public.polls where id = p_poll_id and status = 'open'
  ) then
    raise exception 'Poll is not open';
  end if;

  select id into v_voter_id
  from public.poll_voters
  where poll_id = p_poll_id
    and device_id = p_device_id;

  if v_voter_id is null then
    insert into public.poll_voters (poll_id, device_id, is_proxy)
    values (p_poll_id, p_device_id, false)
    returning id into v_voter_id;
  end if;

  return v_voter_id;
end;
$$;

comment on function public.get_or_create_device_voter(uuid, uuid) is
  'Registers a device for an open poll and returns the ballot id.';

grant execute on function public.get_or_create_device_voter(uuid, uuid) to anon, authenticated;

create or replace function public.create_proxy_voter(
  p_poll_id uuid,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voter_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create proxy voters';
  end if;

  insert into public.poll_voters (
    poll_id,
    display_name,
    is_proxy,
    created_by
  )
  values (
    p_poll_id,
    trim(p_display_name),
    true,
    auth.uid()
  )
  returning id into v_voter_id;

  return v_voter_id;
end;
$$;

comment on function public.create_proxy_voter(uuid, text) is
  'Admin-only helper to create a named ballot for someone without a device.';

grant execute on function public.create_proxy_voter(uuid, text) to authenticated;
