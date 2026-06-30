-- Option photos stored in Supabase Storage.

alter table public.poll_options
  add column if not exists image_url text,
  add column if not exists image_updated_at timestamptz;

comment on column public.poll_options.image_url is
  'Public URL of a photo for this option, taken live during the event.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'poll-option-images',
  'poll-option-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public read poll option images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'poll-option-images');

create policy "Admins upload poll option images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'poll-option-images'
    and public.is_admin()
  );

create policy "Admins update poll option images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'poll-option-images' and public.is_admin())
  with check (bucket_id = 'poll-option-images' and public.is_admin());

create policy "Admins delete poll option images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'poll-option-images' and public.is_admin());

-- Must drop first: CREATE OR REPLACE cannot insert columns mid-view.
drop view if exists public.poll_option_results;

create view public.poll_option_results as
select
  p.id as poll_id,
  p.title as poll_title,
  p.status as poll_status,
  c.id as category_id,
  c.name as category_name,
  c.display_order as category_order,
  o.id as option_id,
  o.label as option_label,
  o.description as option_description,
  o.display_order as option_order,
  o.image_url as option_image_url,
  count(v.id)::integer as vote_count
from public.polls p
join public.poll_categories c on c.poll_id = p.id
join public.poll_options o on o.category_id = c.id
left join public.poll_votes v on v.option_id = o.id
group by
  p.id,
  p.title,
  p.status,
  c.id,
  c.name,
  c.display_order,
  o.id,
  o.label,
  o.description,
  o.display_order,
  o.image_url
order by
  p.id,
  c.display_order,
  o.display_order;

comment on view public.poll_option_results is
  'Running vote totals per option, grouped by poll and category.';
