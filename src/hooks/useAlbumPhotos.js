import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAlbumPhotos(albumId) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!albumId) return []

    const { data, error: fetchError } = await supabase
      .from('album_guest_photos')
      .select('id, album_id, table_id, display_name, device_id, public_url, created_at, is_open_upload, photo_tables(name)')
      .eq('album_id', albumId)
      .order('created_at', { ascending: false })

    if (fetchError) throw fetchError

    const rows = (data ?? []).map((row) => ({
      ...row,
      table_name: row.photo_tables?.name ?? null,
    }))
    setPhotos(rows)
    return rows
  }, [albumId])

  useEffect(() => {
    if (!albumId) {
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setError(null)
    load()
      .catch((err) => setError(err.message ?? 'Failed to load photos'))
      .finally(() => setLoading(false))
  }, [albumId, load])

  useEffect(() => {
    if (!albumId) return undefined

    const channel = supabase
      .channel(`album-guest-photos-${albumId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'album_guest_photos',
          filter: `album_id=eq.${albumId}`,
        },
        () => {
          load().catch(() => {})
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [albumId, load])

  return { photos, loading, error, reload: load }
}

export function useAlbumPhotosForPerson(albumId, displayName) {
  const { photos, loading, error, reload } = useAlbumPhotos(albumId)

  const personPhotos = displayName
    ? photos.filter(
        (photo) =>
          !photo.is_open_upload &&
          photo.display_name.toLowerCase() === displayName.trim().toLowerCase()
      )
    : []

  return { photos: personPhotos, loading, error, reload }
}

export function useAlbumOpenPhotos(albumId, deviceId) {
  const { photos, loading, error, reload } = useAlbumPhotos(albumId)

  const openPhotos = deviceId
    ? photos.filter((photo) => photo.is_open_upload && photo.device_id === deviceId)
    : []

  return { photos: openPhotos, loading, error, reload }
}

export function useAlbumPhotosForTable(albumId, tableId) {
  const { photos, loading, error, reload } = useAlbumPhotos(albumId)

  const tablePhotos = tableId
    ? photos.filter((photo) => !photo.is_open_upload && photo.table_id === tableId)
    : []

  return { photos: tablePhotos, loading, error, reload }
}
