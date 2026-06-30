-- Let guests change table / poll story assignment on their open uploads.

create or replace function public.update_album_photo_assignment(
  p_photo_id uuid,
  p_device_id uuid,
  p_table_id uuid default null,
  p_poll_id uuid default null,
  p_poll_option_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photo public.album_guest_photos%rowtype;
  v_old_option_id uuid;
  v_table_id uuid;
  v_poll_id uuid;
  v_poll_option_id uuid;
  v_poll_status public.poll_status;
begin
  if p_device_id is null then
    raise exception 'Device id is required';
  end if;

  select * into v_photo
  from public.album_guest_photos
  where id = p_photo_id;

  if v_photo.id is null then
    raise exception 'Photo not found';
  end if;

  if not public.is_admin() and v_photo.device_id <> p_device_id then
    raise exception 'You can only update your own photos';
  end if;

  if not v_photo.is_open_upload then
    raise exception 'Only quick-share photos can change story assignment';
  end if;

  v_old_option_id := v_photo.poll_option_id;
  v_table_id := p_table_id;
  v_poll_id := p_poll_id;
  v_poll_option_id := p_poll_option_id;

  if v_table_id is not null then
    v_poll_id := null;
    v_poll_option_id := null;
  elsif v_poll_option_id is not null then
    select p.id, p.status into v_poll_id, v_poll_status
    from public.poll_options o
    join public.poll_categories c on c.id = o.category_id
    join public.polls p on p.id = c.poll_id
    where o.id = v_poll_option_id;

    if v_poll_id is null then
      raise exception 'Poll option not found';
    end if;

    v_table_id := null;
  elsif v_poll_id is not null then
    select status into v_poll_status
    from public.polls
    where id = v_poll_id;

    if v_poll_status is null then
      raise exception 'Poll not found';
    end if;

    v_poll_option_id := null;
    v_table_id := null;
  else
    v_table_id := null;
    v_poll_id := null;
    v_poll_option_id := null;
  end if;

  if v_table_id is not null and not exists (
    select 1
    from public.photo_tables t
    where t.id = v_table_id
      and t.album_id = v_photo.album_id
  ) then
    raise exception 'Table not found for this album';
  end if;

  if v_poll_id is not null and v_poll_status not in ('open', 'closed') then
    raise exception 'Poll is not available for photo sharing';
  end if;

  update public.album_guest_photos
  set
    table_id = v_table_id,
    poll_id = v_poll_id,
    poll_option_id = v_poll_option_id
  where id = p_photo_id;

  if v_old_option_id is not null and v_old_option_id is distinct from v_poll_option_id then
    perform public.refresh_poll_option_image(v_old_option_id);
  end if;

  if v_poll_option_id is not null then
    perform public.refresh_poll_option_image(v_poll_option_id);
  end if;
end;
$$;

grant execute on function public.update_album_photo_assignment(uuid, uuid, uuid, uuid, uuid)
  to anon, authenticated;
