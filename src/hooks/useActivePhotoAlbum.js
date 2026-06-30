import { useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useActivePhotoAlbum({ includeClosed = true } = {}) {
  const channelInstanceId = useId().replace(/:/g, '')
  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setError(null)

      const { data: openAlbum, error: openError } = await supabase
        .from('photo_albums')
        .select('id, title, status, created_at, guest_upload_limit, open_upload_limit')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (openError) {
        setError(openError.message)
        setLoading(false)
        return
      }

      if (openAlbum) {
        setAlbum(openAlbum)
        setLoading(false)
        return
      }

      if (!includeClosed) {
        setAlbum(null)
        setLoading(false)
        return
      }

      const { data: closedAlbum, error: closedError } = await supabase
        .from('photo_albums')
        .select('id, title, status, created_at, guest_upload_limit, open_upload_limit')
        .eq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (closedError) {
        setError(closedError.message)
      } else {
        setAlbum(closedAlbum)
      }
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`active-photo-album-changes-${channelInstanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'photo_albums' },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelInstanceId, includeClosed])

  return { album, loading, error }
}
