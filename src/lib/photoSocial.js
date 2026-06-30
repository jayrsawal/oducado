import { supabase } from './supabase'

export async function fetchPhotoSocial(photoIds) {
  if (photoIds.length === 0) {
    return { likes: [], comments: [] }
  }

  const [likesResult, commentsResult] = await Promise.all([
    supabase.from('album_photo_likes').select('photo_id, device_id').in('photo_id', photoIds),
    supabase
      .from('album_photo_comments')
      .select('id, photo_id, device_id, author_name, body, created_at')
      .in('photo_id', photoIds)
      .order('created_at', { ascending: true }),
  ])

  if (likesResult.error) throw likesResult.error
  if (commentsResult.error) throw commentsResult.error

  return {
    likes: likesResult.data ?? [],
    comments: commentsResult.data ?? [],
  }
}

export async function togglePhotoLike(photoId, deviceId) {
  const { data, error } = await supabase.rpc('toggle_album_photo_like', {
    p_photo_id: photoId,
    p_device_id: deviceId,
  })

  if (error) throw error
  return data
}

export async function addPhotoComment(photoId, deviceId, authorName, body) {
  const { data, error } = await supabase.rpc('add_album_photo_comment', {
    p_photo_id: photoId,
    p_device_id: deviceId,
    p_author_name: authorName,
    p_body: body,
  })

  if (error) throw error
  return data
}

export function buildSocialMap(photoIds, likes, comments, deviceId) {
  const map = Object.fromEntries(
    photoIds.map((id) => [
      id,
      {
        likeCount: 0,
        likedByMe: false,
        comments: [],
      },
    ])
  )

  for (const like of likes) {
    const entry = map[like.photo_id]
    if (!entry) continue
    entry.likeCount += 1
    if (like.device_id === deviceId) entry.likedByMe = true
  }

  for (const comment of comments) {
    const entry = map[comment.photo_id]
    if (!entry) continue
    entry.comments.push(comment)
  }

  return map
}
