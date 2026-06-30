import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function usePollRoster(pollId) {
  const [tables, setTables] = useState([])
  const [roster, setRoster] = useState([])
  const [votedNames, setVotedNames] = useState(() => new Set())
  const [votedDisplayNames, setVotedDisplayNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadRoster = useCallback(async () => {
    if (!pollId) return

    const [tablesRes, rosterRes, votersRes] = await Promise.all([
      supabase
        .from('poll_tables')
        .select('id, name, display_order')
        .eq('poll_id', pollId)
        .order('name'),
      supabase
        .from('poll_roster')
        .select('id, display_name, display_order, table_id')
        .eq('poll_id', pollId)
        .order('display_name'),
      supabase
        .from('poll_voters')
        .select('display_name, poll_votes(id)')
        .eq('poll_id', pollId),
    ])

    if (tablesRes.error) throw tablesRes.error
    if (rosterRes.error) throw rosterRes.error
    if (votersRes.error) throw votersRes.error

    const names = rosterRes.data ?? []
    const votedList = (votersRes.data ?? [])
      .filter((v) => v.poll_votes?.length > 0 && v.display_name)
      .map((v) => v.display_name)

    setTables(tablesRes.data ?? [])
    setRoster(names)
    setVotedNames(new Set(votedList.map((name) => name.toLowerCase())))
    setVotedDisplayNames(votedList)
    return names
  }, [pollId])

  useEffect(() => {
    if (!pollId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    loadRoster()
      .catch((err) => setError(err.message ?? 'Failed to load guest list'))
      .finally(() => setLoading(false))
  }, [pollId, loadRoster])

  useEffect(() => {
    if (!pollId) return

    const channel = supabase
      .channel(`poll-roster-${pollId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${pollId}` },
        () => {
          loadRoster().catch(() => {})
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_voters', filter: `poll_id=eq.${pollId}` },
        () => {
          loadRoster().catch(() => {})
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pollId, loadRoster])

  return {
    tables,
    roster,
    votedNames,
    votedDisplayNames,
    loading,
    error,
    reload: loadRoster,
  }
}
