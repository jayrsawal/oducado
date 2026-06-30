import { Link } from 'react-router-dom'

export default function PollPageNav({ backTo, backLabel = 'Back' }) {
  if (!backTo) return null

  return (
    <nav className="poll-page-nav" aria-label="Page navigation">
      <Link to={backTo} className="poll-back-link">
        ← {backLabel}
      </Link>
    </nav>
  )
}
