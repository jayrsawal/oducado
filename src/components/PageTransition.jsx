import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

export default function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div key={location.key} className="page-transition">
      {outlet}
    </div>
  )
}
