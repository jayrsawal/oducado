-- Standalone photo album (separate from polls). Replaces poll_guest_photos from 010.

create type public.photo_album_status as enum ('draft', 'open', 'closed');

create table public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Family photo album',
  status public.photo_album_status not null default 'draft',
  created_at timestamptz not null default now(),
  constraint photo_albums_title_trimmed check (trim(title) <> '')
);

create table public.photo_tables (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums (id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint photo_tables_name_trimmed check (trim(name) <> '')
);

create unique index photo_tables_album_name_idx
  on public.photo_tables (album_id, lower(trim(name)));

create index photo_tables_album_id_idx on public.photo_tables (album_id);

create table public.photo_roster (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums (id) on delete cascade,
  table_id uuid references public.photo_tables (id) on delete set null,
  display_name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint photo_roster_name_trimmed check (trim(display_name) <> '')
);

create unique index photo_roster_album_name_idx
  on public.photo_roster (album_id, lower(trim(display_name)));

create index photo_roster_album_id_idx on public.photo_roster (album_id);

create table public.album_guest_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums (id) on delete cascade,
  table_id uuid references public.photo_tables (id) on delete set null,
  display_name text not null,
  device_id uuid not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now(),
  constraint album_guest_photos_display_name_trimmed check (trim(display_name) <> ''),
  constraint album_guest_photos_storage_path_trimmed check (trim(storage_path) <> '')
);

create index album_guest_photos_album_id_idx on public.album_guest_photos (album_id);
create index album_guest_photos_table_id_idx on public.album_guest_photos (table_id);
create index album_guest_photos_created_at_idx on public.album_guest_photos (created_at desc);
create index album_guest_photos_name_idx
  on public.album_guest_photos (album_id, lower(trim(display_name)));

alter table public.photo_albums enable row level security;
alter table public.photo_tables enable row level security;
alter table public.photo_roster enable row level security;
alter table public.album_guest_photos enable row level security;

create policy "Anyone can read open or closed photo albums"
  on public.photo_albums
  for select
  to anon, authenticated
  using (status in ('open', 'closed'));

create policy "Admins read all photo albums"
  on public.photo_albums
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins manage photo albums"
  on public.photo_albums
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Anyone can read photo tables for visible albums"
  on public.photo_tables
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.photo_albums a
      where a.id = album_id
        and a.status in ('open', 'closed')
    )
  );

create policy "Admins manage photo tables"
  on public.photo_tables
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Anyone can read photo roster for visible albums"
  on public.photo_roster
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.photo_albums a
      where a.id = album_id
        and a.status in ('open', 'closed')
    )
  );

create policy "Admins manage photo roster"
  on public.photo_roster
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Anyone can read album photos for visible albums"
  on public.album_guest_photos
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.photo_albums a
      where a.id = album_id
        and a.status in ('open', 'closed')
    )
  );

create policy "Admins manage album guest photos"
  on public.album_guest_photos
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Drop poll-scoped photo tables from migration 010 if applied
drop function if exists public.submit_guest_photo(uuid, uuid, text, uuid, text, text);
drop function if exists public.delete_guest_photo(uuid, uuid);
drop table if exists public.poll_guest_photos;

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

drop policy if exists "Public read guest photos storage" on storage.objects;
drop policy if exists "Guests upload guest photos storage" on storage.objects;
drop policy if exists "Guests delete own guest photos storage" on storage.objects;
drop policy if exists "Admins manage guest photos storage" on storage.objects;

create policy "Public read album photos storage"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'poll-guest-photos');

create policy "Guests upload album photos storage"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'poll-guest-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  );

create policy "Guests delete album photos storage"
  on storage.objects
  for delete
  to anon, authenticated
  using (bucket_id = 'poll-guest-photos');

create policy "Admins manage album photos storage"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'poll-guest-photos' and public.is_admin())
  with check (bucket_id = 'poll-guest-photos' and public.is_admin());

create or replace function public.submit_album_guest_photo(
  p_album_id uuid,
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
  v_album_status public.photo_album_status;
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

  select status into v_album_status
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

  if not exists (
    select 1
    from public.photo_roster r
    where r.album_id = p_album_id
      and lower(trim(r.display_name)) = lower(v_name)
      and (
        (p_table_id is null and r.table_id is null)
        or r.table_id = p_table_id
      )
  ) then
    raise exception 'Name is not on the roster for this table';
  end if;

  if p_storage_path !~ (
    '^' || p_album_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  ) then
    raise exception 'Invalid storage path';
  end if;

  select count(*)::integer into v_count
  from public.album_guest_photos
  where album_id = p_album_id
    and lower(trim(display_name)) = lower(v_name);

  if v_count >= 10 then
    raise exception 'You can upload at most 10 photos';
  end if;

  insert into public.album_guest_photos (
    album_id,
    table_id,
    display_name,
    device_id,
    storage_path,
    public_url
  )
  values (
    p_album_id,
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

grant execute on function public.submit_album_guest_photo(uuid, uuid, text, uuid, text, text)
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
end;
$$;

grant execute on function public.delete_album_guest_photo(uuid, uuid)
  to anon, authenticated;

create or replace function public.import_poll_roster_to_album(
  p_album_id uuid,
  p_poll_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tables_added integer := 0;
  v_guests_added integer := 0;
  v_poll_table record;
  v_roster_entry record;
  v_photo_table_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if not exists (select 1 from public.photo_albums where id = p_album_id) then
    raise exception 'Photo album not found';
  end if;

  if not exists (select 1 from public.polls where id = p_poll_id) then
    raise exception 'Poll not found';
  end if;

  for v_poll_table in
    select id, name, display_order
    from public.poll_tables
    where poll_id = p_poll_id
    order by display_order, name
  loop
    select id into v_photo_table_id
    from public.photo_tables
    where album_id = p_album_id
      and lower(trim(name)) = lower(trim(v_poll_table.name))
    limit 1;

    if v_photo_table_id is null then
      insert into public.photo_tables (album_id, name, display_order)
      values (p_album_id, trim(v_poll_table.name), v_poll_table.display_order)
      returning id into v_photo_table_id;
      v_tables_added := v_tables_added + 1;
    end if;
  end loop;

  for v_roster_entry in
    select display_name, table_id, display_order
    from public.poll_roster
    where poll_id = p_poll_id
    order by display_order, display_name
  loop
    if exists (
      select 1
      from public.photo_roster
      where album_id = p_album_id
        and lower(trim(display_name)) = lower(trim(v_roster_entry.display_name))
    ) then
      continue;
    end if;

    v_photo_table_id := null;
    if v_roster_entry.table_id is not null then
      select pt.id into v_photo_table_id
      from public.poll_tables poll_t
      join public.photo_tables pt
        on pt.album_id = p_album_id
        and lower(trim(pt.name)) = lower(trim(poll_t.name))
      where poll_t.id = v_roster_entry.table_id
      limit 1;
    end if;

    insert into public.photo_roster (album_id, table_id, display_name, display_order)
    values (
      p_album_id,
      v_photo_table_id,
      trim(v_roster_entry.display_name),
      v_roster_entry.display_order
    );
    v_guests_added := v_guests_added + 1;
  end loop;

  return jsonb_build_object(
    'tables_added', v_tables_added,
    'guests_added', v_guests_added
  );
end;
$$;

grant execute on function public.import_poll_roster_to_album(uuid, uuid)
  to authenticated;
