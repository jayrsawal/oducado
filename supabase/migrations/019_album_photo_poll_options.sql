-- Link album photos to polls/options; latest assigned photo becomes the option image.

alter table public.album_guest_photos
  add column if not exists poll_id uuid references public.polls (id) on delete set null,
  add column if not exists poll_option_id uuid references public.poll_options (id) on delete set null;

create index if not exists album_guest_photos_poll_id_idx
  on public.album_guest_photos (poll_id);

create index if not exists album_guest_photos_poll_option_id_idx
  on public.album_guest_photos (poll_option_id);

create or replace function public.refresh_poll_option_image(p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  if p_option_id is null then
    return;
  end if;

  select public_url into v_url
  from public.album_guest_photos
  where poll_option_id = p_option_id
  order by created_at desc
  limit 1;

  update public.poll_options
  set
    image_url = v_url,
    image_updated_at = case when v_url is not null then now() else null end
  where id = p_option_id;
end;
$$;

grant execute on function public.refresh_poll_option_image(uuid) to anon, authenticated;

drop function if exists public.submit_album_open_photo(uuid, uuid, text, text, text, uuid);

create or replace function public.submit_album_open_photo(
  p_album_id uuid,
  p_device_id uuid,
  p_display_name text,
  p_storage_path text,
  p_public_url text,
  p_table_id uuid default null,
  p_poll_id uuid default null,
  p_poll_option_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_status public.photo_album_status;
  v_photo_id uuid;
  v_count integer;
  v_name text;
  v_limit integer;
  v_poll_id uuid;
  v_poll_status public.poll_status;
begin
  v_name := trim(p_display_name);
  v_poll_id := p_poll_id;

  if v_name = '' then
    raise exception 'Display name is required';
  end if;

  if p_device_id is null then
    raise exception 'Device id is required';
  end if;

  select status, open_upload_limit into v_album_status, v_limit
  from public.photo_albums
  where id = p_album_id;

  if v_album_status is null then
    raise exception 'Photo album not found';
  end if;

  if v_album_status <> 'open' then
    raise exception 'Photo uploads are not open right now';
  end if;

  if p_table_id is not null and not exists (
    select 1
    from public.photo_tables t
    where t.id = p_table_id
      and t.album_id = p_album_id
  ) then
    raise exception 'Table not found for this album';
  end if;

  if p_poll_option_id is not null then
    select p.id, p.status into v_poll_id, v_poll_status
    from public.poll_options o
    join public.poll_categories c on c.id = o.category_id
    join public.polls p on p.id = c.poll_id
    where o.id = p_poll_option_id;

    if v_poll_id is null then
      raise exception 'Poll option not found';
    end if;
  elsif p_poll_id is not null then
    select status into v_poll_status
    from public.polls
    where id = p_poll_id;

    if v_poll_status is null then
      raise exception 'Poll not found';
    end if;

    v_poll_id := p_poll_id;
  end if;

  if v_poll_id is not null and v_poll_status not in ('open', 'closed') then
    raise exception 'Poll is not available for photo sharing';
  end if;

  if p_storage_path !~ (
    '^' || p_album_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  ) then
    raise exception 'Invalid storage path';
  end if;

  select count(*)::integer into v_count
  from public.album_guest_photos
  where album_id = p_album_id
    and device_id = p_device_id;

  if v_count >= v_limit then
    raise exception 'You can upload at most % photos from this device', v_limit;
  end if;

  insert into public.album_guest_photos (
    album_id,
    table_id,
    poll_id,
    poll_option_id,
    display_name,
    device_id,
    storage_path,
    public_url,
    is_open_upload
  )
  values (
    p_album_id,
    p_table_id,
    v_poll_id,
    p_poll_option_id,
    v_name,
    p_device_id,
    p_storage_path,
    p_public_url,
    true
  )
  returning id into v_photo_id;

  if p_poll_option_id is not null then
    perform public.refresh_poll_option_image(p_poll_option_id);
  end if;

  return v_photo_id;
end;
$$;

grant execute on function public.submit_album_open_photo(uuid, uuid, text, text, text, uuid, uuid, uuid)
  to anon, authenticated;

create or replace function public.delete_album_guest_photo(
  p_photo_id uuid,
  p_device_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photo public.album_guest_photos%rowtype;
begin
  select * into v_photo
  from public.album_guest_photos
  where id = p_photo_id;

  if v_photo.id is null then
    raise exception 'Photo not found';
  end if;

  if not public.is_admin() and v_photo.device_id <> p_device_id then
    raise exception 'You can only delete your own photos';
  end if;

  delete from public.album_guest_photos
  where id = p_photo_id;

  if v_photo.poll_option_id is not null then
    perform public.refresh_poll_option_image(v_photo.poll_option_id);
  end if;
end;
$$;

grant execute on function public.delete_album_guest_photo(uuid, uuid)
  to anon, authenticated;
