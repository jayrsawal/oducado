-- Optional table tag on quick-share uploads so photos appear in that table's story ring.

drop function if exists public.submit_album_open_photo(uuid, uuid, text, text, text);

create or replace function public.submit_album_open_photo(
  p_album_id uuid,
  p_device_id uuid,
  p_display_name text,
  p_storage_path text,
  p_public_url text,
  p_table_id uuid default null
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
begin
  v_name := trim(p_display_name);

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

  if p_storage_path !~ (
    '^' || p_album_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  ) then
    raise exception 'Invalid storage path';
  end if;

  select count(*)::integer into v_count
  from public.album_guest_photos
  where album_id = p_album_id
    and device_id = p_device_id
    and is_open_upload;

  if v_count >= v_limit then
    raise exception 'You can upload at most % photos from this device', v_limit;
  end if;

  insert into public.album_guest_photos (
    album_id,
    table_id,
    display_name,
    device_id,
    storage_path,
    public_url,
    is_open_upload
  )
  values (
    p_album_id,
    p_table_id,
    v_name,
    p_device_id,
    p_storage_path,
    p_public_url,
    true
  )
  returning id into v_photo_id;

  return v_photo_id;
end;
$$;

grant execute on function public.submit_album_open_photo(uuid, uuid, text, text, text, uuid)
  to anon, authenticated;
