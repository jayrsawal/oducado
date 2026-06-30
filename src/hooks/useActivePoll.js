import { useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useActivePoll({ includeClosed = false } = {}) {
  const channelInstanceId = useId().replace(/:/g, '')
  const [poll, setPoll] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setError(null)

      const { data: openPoll, error: openError } = await supabase
        .from('polls')
        .select('id, title, description, status, results_revealed')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (openError) {
        setError(openError.message)
        setLoading(false)
        return
      }

      if (openPoll) {
        setPoll(openPoll)
        setLoading(false)
        return
      }

      if (!includeClosed) {
        setPoll(null)
        setLoading(false)
        return
      }

      const { data: closedPoll, error: closedError } = await supabase
        .from('polls')
        .select('id, title, description, status, results_revealed')
        .order('created_at', { ascending: false })
        .eq('status', 'closed')
        .limit(1)
        .maybeSingle()

      if (closedError) {
        setError(closedError.message)
      } else {
        setPoll(closedPoll)
      }
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`active-poll-changes-${channelInstanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelInstanceId, includeClosed])

  return { poll, loading, error }
}
