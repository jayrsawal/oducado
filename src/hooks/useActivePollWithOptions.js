import { useEffect, useState } from 'react'
import { POLL_SELECT, sortPollCategories, supabase } from '../lib/supabase'
import { useActivePoll } from './useActivePoll'

export function useActivePollWithOptions({ includeClosed = true } = {}) {
  const { poll: activePoll, loading: pollLoading, error: pollError } = useActivePoll({
    includeClosed,
  })
  const [poll, setPoll] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (pollLoading) return

    if (pollError) {
      setError(pollError)
      setPoll(null)
      setLoading(false)
      return
    }

    if (!activePoll?.id) {
      setPoll(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('polls')
      .select(POLL_SELECT)
      .eq('id', activePoll.id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          setPoll(null)
        } else {
          setPoll(sortPollCategories(data))
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activePoll?.id, pollError, pollLoading])

  return { poll, loading: pollLoading || loading, error }
}

export function flattenPollOptions(poll) {
  if (!poll?.poll_categories) return []

  return poll.poll_categories.flatMap((category) =>
    (category.poll_options ?? []).map((option) => ({
      optionId: option.id,
      label: option.label,
      categoryName: category.name,
      imageUrl: option.image_url,
    }))
  )
}
