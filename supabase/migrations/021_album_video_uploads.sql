-- Gallery video uploads for open quick-shares (MP4/MOV/WebM + JPEG poster).

alter table public.album_guest_photos
  add column if not exists media_type text not null default 'image',
  add column if not exists poster_url text,
  add column if not exists poster_storage_path text;

alter table public.album_guest_photos
  drop constraint if exists album_guest_photos_media_type_check;

alter table public.album_guest_photos
  add constraint album_guest_photos_media_type_check
  check (media_type in ('image', 'video'));

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
where id = 'poll-guest-photos';

drop policy if exists "Guests upload album photos storage" on storage.objects;

create policy "Guests upload album photos storage"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'poll-guest-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-poster)?\.(jpg|mp4|mov|webm)$'
  );

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

  select coalesce(poster_url, public_url) into v_url
  from public.album_guest_photos
  where poll_option_id = p_option_id
    and media_type = 'image'
  order by created_at desc
  limit 1;

  update public.poll_options
  set
    image_url = v_url,
    image_updated_at = case when v_url is not null then now() else null end
  where id = p_option_id;
end;
$$;

drop function if exists public.submit_album_open_photo(uuid, uuid, text, text, text, uuid, uuid, uuid);

create or replace function public.submit_album_open_photo(
  p_album_id uuid,
  p_device_id uuid,
  p_display_name text,
  p_storage_path text,
  p_public_url text,
  p_table_id uuid default null,
  p_poll_id uuid default null,
  p_poll_option_id uuid default null,
  p_media_type text default 'image',
  p_poster_storage_path text default null,
  p_poster_url text default null
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
  v_media_type text;
begin
  v_name := trim(p_display_name);
  v_poll_id := p_poll_id;
  v_media_type := coalesce(nullif(trim(p_media_type), ''), 'image');

  if v_name = '' then
    raise exception 'Display name is required';
  end if;

  if p_device_id is null then
    raise exception 'Device id is required';
  end if;

  if v_media_type not in ('image', 'video') then
    raise exception 'Invalid media type';
  end if;

  if v_media_type = 'video' then
    if p_poster_storage_path is null or trim(p_poster_url) = '' then
      raise exception 'Video poster is required';
    end if;

    if p_poll_id is not null or p_poll_option_id is not null then
      raise exception 'Videos cannot be assigned to poll stories';
    end if;
  else
    if p_poster_storage_path is not null or p_poster_url is not null then
      raise exception 'Posters are only used for videos';
    end if;
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
    '^' || p_album_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|mp4|mov|webm)$'
  ) then
    raise exception 'Invalid storage path';
  end if;

  if v_media_type = 'video' and p_poster_storage_path !~ (
    '^' || p_album_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-poster\.jpg$'
  ) then
    raise exception 'Invalid poster storage path';
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
    is_open_upload,
    media_type,
    poster_url,
    poster_storage_path
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
    true,
    v_media_type,
    nullif(trim(p_poster_url), ''),
    p_poster_storage_path
  )
  returning id into v_photo_id;

  if p_poll_option_id is not null then
    perform public.refresh_poll_option_image(p_poll_option_id);
  end if;

  return v_photo_id;
end;
$$;

grant execute on function public.submit_album_open_photo(
  uuid, uuid, text, text, text, uuid, uuid, uuid, text, text, text
) to anon, authenticated;

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

  if v_photo.media_type = 'video' and (p_poll_id is not null or p_poll_option_id is not null) then
    raise exception 'Videos cannot be assigned to poll stories';
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
