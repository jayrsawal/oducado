-- Guest photo drop box: per-table uploads, public photo wall.

create table public.poll_guest_photos (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  table_id uuid references public.poll_tables (id) on delete set null,
  display_name text not null,
  device_id uuid not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now(),
  constraint poll_guest_photos_display_name_trimmed check (trim(display_name) <> ''),
  constraint poll_guest_photos_storage_path_trimmed check (trim(storage_path) <> '')
);

create index poll_guest_photos_poll_id_idx on public.poll_guest_photos (poll_id);
create index poll_guest_photos_table_id_idx on public.poll_guest_photos (table_id);
create index poll_guest_photos_created_at_idx on public.poll_guest_photos (created_at desc);
create index poll_guest_photos_name_idx
  on public.poll_guest_photos (poll_id, lower(trim(display_name)));

alter table public.poll_guest_photos enable row level security;

create policy "Anyone can read guest photos for visible polls"
  on public.poll_guest_photos
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.polls p
      where p.id = poll_id
        and p.status in ('open', 'closed')
    )
  );

create policy "Admins manage guest photos"
  on public.poll_guest_photos
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'poll-guest-photos',
  'poll-guest-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public read guest photos storage"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'poll-guest-photos');

create policy "Guests upload guest photos storage"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'poll-guest-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  );

create policy "Guests delete own guest photos storage"
  on storage.objects
  for delete
  to anon, authenticated
  using (bucket_id = 'poll-guest-photos');

create policy "Admins manage guest photos storage"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'poll-guest-photos' and public.is_admin())
  with check (bucket_id = 'poll-guest-photos' and public.is_admin());

create or replace function public.submit_guest_photo(
  p_poll_id uuid,
  p_table_id uuid,
  p_display_name text,
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
  v_poll_status public.poll_status;
  v_photo_id uuid;
  v_count integer;
  v_name text := trim(p_display_name);
begin
  if v_name = '' then
    raise exception 'Display name is required';
  end if;

  if p_device_id is null then
    raise exception 'Device id is required';
  end if;

  select status into v_poll_status
  from public.polls
  where id = p_poll_id;

  if v_poll_status is null then
    raise exception 'Poll not found';
  end if;

  if v_poll_status not in ('open', 'closed') then
    raise exception 'Photo uploads are not available for this poll';
  end if;

  if p_table_id is not null and not exists (
    select 1
    from public.poll_tables t
    where t.id = p_table_id
      and t.poll_id = p_poll_id
  ) then
    raise exception 'Table not found for this poll';
  end if;

  if not exists (
    select 1
    from public.poll_roster r
    where r.poll_id = p_poll_id
      and lower(trim(r.display_name)) = lower(v_name)
      and (
        (p_table_id is null and r.table_id is null)
        or r.table_id = p_table_id
      )
  ) then
    raise exception 'Name is not on the roster for this table';
  end if;

  if p_storage_path !~ (
    '^' || p_poll_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  ) then
    raise exception 'Invalid storage path';
  end if;

  select count(*)::integer into v_count
  from public.poll_guest_photos
  where poll_id = p_poll_id
    and lower(trim(display_name)) = lower(v_name);

  if v_count >= 10 then
    raise exception 'You can upload at most 10 photos';
  end if;

  insert into public.poll_guest_photos (
    poll_id,
    table_id,
    display_name,
    device_id,
    storage_path,
    public_url
  )
  values (
    p_poll_id,
    p_table_id,
    v_name,
    p_device_id,
    p_storage_path,
    p_public_url
  )
  returning id into v_photo_id;

  return v_photo_id;
end;
$$;

grant execute on function public.submit_guest_photo(uuid, uuid, text, uuid, text, text)
  to anon, authenticated;

create or replace function public.delete_guest_photo(
  p_photo_id uuid,
  p_device_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photo public.poll_guest_photos%rowtype;
begin
  select * into v_photo
  from public.poll_guest_photos
  where id = p_photo_id;

  if v_photo.id is null then
    raise exception 'Photo not found';
  end if;

  if not public.is_admin() and v_photo.device_id <> p_device_id then
    raise exception 'You can only delete your own photos';
  end if;

  delete from public.poll_guest_photos
  where id = p_photo_id;
end;
$$;

grant execute on function public.delete_guest_photo(uuid, uuid)
  to anon, authenticated;
