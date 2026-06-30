import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const VoteNavContext = createContext(null)

export function VoteNavProvider({ children }) {
  const [voteNav, setVoteNavState] = useState(null)

  const setVoteNav = useCallback((next) => {
    setVoteNavState(next)
  }, [])

  const clearVoteNav = useCallback(() => {
    setVoteNavState(null)
  }, [])

  const value = useMemo(
    () => ({ voteNav, setVoteNav, clearVoteNav }),
    [voteNav, setVoteNav, clearVoteNav]
  )

  return (
    <VoteNavContext.Provider value={value}>{children}</VoteNavContext.Provider>
  )
}

export function useVoteNav() {
  return useContext(VoteNavContext)
}
