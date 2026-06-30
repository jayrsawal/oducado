-- Open album uploads: photos not tied to a roster name or table.

alter table public.album_guest_photos
  add column if not exists is_open_upload boolean not null default false;

alter table public.album_guest_photos
  drop constraint if exists album_guest_photos_display_name_trimmed;

alter table public.album_guest_photos
  add constraint album_guest_photos_display_name_trimmed check (
    is_open_upload or trim(display_name) <> ''
  );

create index if not exists album_guest_photos_open_device_idx
  on public.album_guest_photos (album_id, device_id)
  where is_open_upload;

create or replace function public.submit_album_open_photo(
  p_album_id uuid,
  p_device_id uuid,
  p_storage_path text,
  p_public_url text
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
begin
  if p_device_id is null then
    raise exception 'Device id is required';
  end if;

  select status into v_album_status
  from public.photo_albums
  where id = p_album_id;

  if v_album_status is null then
    raise exception 'Photo album not found';
  end if;

  if v_album_status <> 'open' then
    raise exception 'Photo uploads are not open right now';
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

  if v_count >= 10 then
    raise exception 'You can upload at most 10 photos from this device';
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
    null,
    'Shared moment',
    p_device_id,
    p_storage_path,
    p_public_url,
    true
  )
  returning id into v_photo_id;

  return v_photo_id;
end;
$$;

grant execute on function public.submit_album_open_photo(uuid, uuid, text, text)
  to anon, authenticated;
