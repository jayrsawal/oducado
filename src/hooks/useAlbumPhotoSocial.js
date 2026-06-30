import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { getDeviceId } from '../lib/deviceId'
import {
  addPhotoComment,
  buildSocialMap,
  fetchPhotoSocial,
  togglePhotoLike,
} from '../lib/photoSocial'
import { supabase } from '../lib/supabase'

export function useAlbumPhotoSocial(albumId, photos) {
  const channelInstanceId = useId().replace(/:/g, '')
  const deviceId = getDeviceId()
  const photoIds = useMemo(() => photos.map((photo) => photo.id), [photos])
  const photoIdsKey = photoIds.join(',')

  const [socialByPhotoId, setSocialByPhotoId] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!albumId || photoIds.length === 0) {
      setSocialByPhotoId({})
      setLoading(false)
      return
    }

    setError(null)
    try {
      const { likes, comments } = await fetchPhotoSocial(photoIds)
      setSocialByPhotoId(buildSocialMap(photoIds, likes, comments, deviceId))
    } catch (err) {
      setError(err.message ?? 'Failed to load reactions')
    } finally {
      setLoading(false)
    }
  }, [albumId, deviceId, photoIds, photoIdsKey])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  useEffect(() => {
    if (!albumId) return undefined

    const channel = supabase
      .channel(`album-photo-social-${albumId}-${channelInstanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'album_photo_likes' },
        () => {
          load().catch(() => {})
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'album_photo_comments' },
        () => {
          load().catch(() => {})
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [albumId, channelInstanceId, load])

  const toggleLike = useCallback(
    async (photoId) => {
      const result = await togglePhotoLike(photoId, deviceId)
      setSocialByPhotoId((current) => ({
        ...current,
        [photoId]: {
          ...(current[photoId] ?? { comments: [] }),
          likeCount: result.like_count,
          likedByMe: result.liked,
          comments: current[photoId]?.comments ?? [],
        },
      }))
    },
    [deviceId]
  )

  const postComment = useCallback(
    async (photoId, authorName, body) => {
      const commentId = await addPhotoComment(photoId, deviceId, authorName, body)
      const optimistic = {
        id: commentId,
        photo_id: photoId,
        device_id: deviceId,
        author_name: authorName.trim(),
        body: body.trim(),
        created_at: new Date().toISOString(),
      }
      setSocialByPhotoId((current) => {
        const entry = current[photoId] ?? { likeCount: 0, likedByMe: false, comments: [] }
        return {
          ...current,
          [photoId]: {
            ...entry,
            comments: [...entry.comments, optimistic],
          },
        }
      })
      await load()
    },
    [deviceId, load]
  )

  return {
    socialByPhotoId,
    loading,
    error,
    toggleLike,
    postComment,
    reload: load,
  }
}
