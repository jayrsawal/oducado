import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAlbumRoster(albumId) {
  const [tables, setTables] = useState([])
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadRoster = useCallback(async () => {
    if (!albumId) return []

    const [tablesRes, rosterRes] = await Promise.all([
      supabase
        .from('photo_tables')
        .select('id, name, display_order')
        .eq('album_id', albumId)
        .order('name'),
      supabase
        .from('photo_roster')
        .select('id, display_name, display_order, table_id')
        .eq('album_id', albumId)
        .order('display_name'),
    ])

    if (tablesRes.error) throw tablesRes.error
    if (rosterRes.error) throw rosterRes.error

    setTables(tablesRes.data ?? [])
    setRoster(rosterRes.data ?? [])
    return rosterRes.data ?? []
  }, [albumId])

  useEffect(() => {
    if (!albumId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    loadRoster()
      .catch((err) => setError(err.message ?? 'Failed to load roster'))
      .finally(() => setLoading(false))
  }, [albumId, loadRoster])

  return {
    tables,
    roster,
    loading,
    error,
    reload: loadRoster,
  }
}
