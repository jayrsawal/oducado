-- Remove the per-bucket upload size cap for album photos and videos.
-- Global limit still applies: Supabase Dashboard → Storage → Settings → Global file size limit.
-- Free plan: 50 MB max. Pro and above: up to 500 GB.

update storage.buckets
set file_size_limit = null
where id = 'poll-guest-photos';

-- Verify (optional): select id, file_size_limit from storage.buckets where id = 'poll-guest-photos';
