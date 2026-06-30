-- Fix guest photo storage upload policy: foldername() does not include the filename.
-- Path shape: {album_id}/{photo_id}.jpg

drop policy if exists "Guests upload album photos storage" on storage.objects;

create policy "Guests upload album photos storage"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'poll-guest-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  );
