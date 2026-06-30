-- Allow guests to replace the image file for their own album photos (e.g. re-orient).

create or replace function public.update_album_guest_photo(
  p_photo_id uuid,
  p_device_id uuid,
  p_public_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photo public.album_guest_photos%rowtype;
begin
  if p_device_id is null then
    raise exception 'Device id is required';
  end if;

  if trim(p_public_url) = '' then
    raise exception 'Public url is required';
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

  update public.album_guest_photos
  set public_url = trim(p_public_url)
  where id = p_photo_id;
end;
$$;

grant execute on function public.update_album_guest_photo(uuid, uuid, text)
  to anon, authenticated;
