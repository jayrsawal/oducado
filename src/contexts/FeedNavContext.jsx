import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const FeedNavContext = createContext(null)

export function FeedNavProvider({ children }) {
  const [feedNav, setFeedNavState] = useState(null)

  const setFeedNav = useCallback((next) => {
    setFeedNavState(next)
  }, [])

  const clearFeedNav = useCallback(() => {
    setFeedNavState(null)
  }, [])

  const value = useMemo(
    () => ({ feedNav, setFeedNav, clearFeedNav }),
    [feedNav, setFeedNav, clearFeedNav]
  )

  return <FeedNavContext.Provider value={value}>{children}</FeedNavContext.Provider>
}

export function useFeedNav() {
  return useContext(FeedNavContext)
}
