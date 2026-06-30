import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ResultsNavContext = createContext(null)

export function ResultsNavProvider({ children }) {
  const [resultsNav, setResultsNavState] = useState(null)

  const setResultsNav = useCallback((next) => {
    setResultsNavState(next)
  }, [])

  const clearResultsNav = useCallback(() => {
    setResultsNavState(null)
  }, [])

  const value = useMemo(
    () => ({ resultsNav, setResultsNav, clearResultsNav }),
    [resultsNav, setResultsNav, clearResultsNav]
  )

  return (
    <ResultsNavContext.Provider value={value}>{children}</ResultsNavContext.Provider>
  )
}

export function useResultsNav() {
  return useContext(ResultsNavContext)
}
