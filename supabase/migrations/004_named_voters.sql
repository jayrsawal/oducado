-- Named guest voting: required display name, multiple ballots per shared device.

drop index if exists public.poll_voters_poll_device_uidx;

create unique index poll_voters_poll_name_uidx
  on public.poll_voters (poll_id, lower(trim(display_name)))
  where display_name is not null;

comment on index public.poll_voters_poll_name_uidx is
  'One ballot per person name per poll, regardless of device.';

drop policy if exists "Device voters can register themselves on open polls" on public.poll_voters;

create policy "Named voters can register on open polls"
  on public.poll_voters
  for insert
  to anon, authenticated
  with check (
    display_name is not null
    and trim(display_name) <> ''
    and is_proxy = false
    and device_id is not null
    and exists (
      select 1
      from public.polls p
      where p.id = poll_id
        and p.status = 'open'
    )
  );

drop policy if exists "Device voters can cast their own votes on open polls" on public.poll_votes;

create policy "Named voters can cast votes on open polls"
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
        and pv.display_name is not null
        and pv.is_proxy = false
        and p.status = 'open'
    )
  );

create or replace function public.get_or_create_named_voter(
  p_poll_id uuid,
  p_display_name text,
  p_device_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voter_id uuid;
  v_name text;
begin
  v_name := trim(p_display_name);

  if v_name = '' then
    raise exception 'Name is required';
  end if;

  if p_device_id is null then
    raise exception 'Device id is required';
  end if;

  if not exists (
    select 1 from public.polls where id = p_poll_id and status = 'open'
  ) then
    raise exception 'Poll is not open';
  end if;

  select id into v_voter_id
  from public.poll_voters
  where poll_id = p_poll_id
    and lower(trim(display_name)) = lower(v_name);

  if v_voter_id is not null then
    return v_voter_id;
  end if;

  insert into public.poll_voters (poll_id, display_name, device_id, is_proxy)
  values (p_poll_id, v_name, p_device_id, false)
  returning id into v_voter_id;

  return v_voter_id;
end;
$$;

comment on function public.get_or_create_named_voter(uuid, text, uuid) is
  'Registers a named ballot for an open poll. Reuses an existing name on the same poll.';

grant execute on function public.get_or_create_named_voter(uuid, text, uuid) to anon, authenticated;

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

  if p_cast_by is null and v_voter.is_proxy then
    raise exception 'This ballot can only be submitted by an admin';
  end if;

  if p_cast_by is null and v_voter.display_name is null then
    raise exception 'A name is required to submit this ballot';
  end if;

  if p_cast_by is null and v_voter.device_id is distinct from p_device_id then
    raise exception 'This name is already registered from another device';
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
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create proxy voters';
  end if;

  v_name := trim(p_display_name);

  if v_name = '' then
    raise exception 'Name is required';
  end if;

  select id into v_voter_id
  from public.poll_voters
  where poll_id = p_poll_id
    and lower(trim(display_name)) = lower(v_name);

  if v_voter_id is not null then
    return v_voter_id;
  end if;

  insert into public.poll_voters (
    poll_id,
    display_name,
    is_proxy,
    created_by
  )
  values (
    p_poll_id,
    v_name,
    true,
    auth.uid()
  )
  returning id into v_voter_id;

  return v_voter_id;
end;
$$;

drop function if exists public.get_or_create_device_voter(uuid, uuid);
