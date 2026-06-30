-- Likes and comments on album guest photos (feed interactions).

create table public.album_photo_likes (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.album_guest_photos (id) on delete cascade,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  constraint album_photo_likes_unique_device unique (photo_id, device_id)
);

create index album_photo_likes_photo_id_idx on public.album_photo_likes (photo_id);

create table public.album_photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.album_guest_photos (id) on delete cascade,
  device_id uuid not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint album_photo_comments_author_trimmed check (trim(author_name) <> ''),
  constraint album_photo_comments_body_trimmed check (trim(body) <> ''),
  constraint album_photo_comments_body_length check (char_length(body) <= 500)
);

create index album_photo_comments_photo_id_idx
  on public.album_photo_comments (photo_id, created_at);

alter table public.album_photo_likes enable row level security;
alter table public.album_photo_comments enable row level security;

create policy "Anyone can read likes on visible album photos"
  on public.album_photo_likes
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.album_guest_photos p
      join public.photo_albums a on a.id = p.album_id
      where p.id = photo_id
        and a.status in ('open', 'closed')
    )
  );

create policy "Anyone can read comments on visible album photos"
  on public.album_photo_comments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.album_guest_photos p
      join public.photo_albums a on a.id = p.album_id
      where p.id = photo_id
        and a.status in ('open', 'closed')
    )
  );

create or replace function public.toggle_album_photo_like(
  p_photo_id uuid,
  p_device_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
  v_count integer;
begin
  if p_device_id is null then
    raise exception 'Device id is required';
  end if;

  if not exists (
    select 1
    from public.album_guest_photos p
    join public.photo_albums a on a.id = p.album_id
    where p.id = p_photo_id
      and a.status in ('open', 'closed')
  ) then
    raise exception 'Photo not found';
  end if;

  delete from public.album_photo_likes
  where photo_id = p_photo_id
    and device_id = p_device_id;

  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    insert into public.album_photo_likes (photo_id, device_id)
    values (p_photo_id, p_device_id);
  end if;

  select count(*)::integer into v_count
  from public.album_photo_likes
  where photo_id = p_photo_id;

  return jsonb_build_object(
    'liked', v_deleted = 0,
    'like_count', v_count
  );
end;
$$;

create or replace function public.add_album_photo_comment(
  p_photo_id uuid,
  p_device_id uuid,
  p_author_name text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author text := trim(p_author_name);
  v_body text := trim(p_body);
  v_comment_id uuid;
begin
  if p_device_id is null then
    raise exception 'Device id is required';
  end if;

  if v_author = '' then
    raise exception 'Name is required';
  end if;

  if v_body = '' then
    raise exception 'Comment cannot be empty';
  end if;

  if char_length(v_body) > 500 then
    raise exception 'Comment is too long';
  end if;

  if not exists (
    select 1
    from public.album_guest_photos p
    join public.photo_albums a on a.id = p.album_id
    where p.id = p_photo_id
      and a.status in ('open', 'closed')
  ) then
    raise exception 'Photo not found';
  end if;

  insert into public.album_photo_comments (photo_id, device_id, author_name, body)
  values (p_photo_id, p_device_id, v_author, v_body)
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

grant execute on function public.toggle_album_photo_like(uuid, uuid) to anon, authenticated;
grant execute on function public.add_album_photo_comment(uuid, uuid, text, text) to anon, authenticated;
