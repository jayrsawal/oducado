import { useCallback, useState } from 'react'
import { getFeedDisplayName, rememberFeedDisplayName } from '../lib/deviceId'

export function useFeedDisplayName() {
  const [displayName, setDisplayNameState] = useState(() => getFeedDisplayName())

  const setDisplayName = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed) return false
    rememberFeedDisplayName(trimmed)
    setDisplayNameState(trimmed)
    return true
  }, [])

  return {
    displayName,
    needsPrompt: !displayName.trim(),
    setDisplayName,
  }
}
