import { Link } from 'react-router-dom'
import PollPageNav from '../components/PollPageNav'
import PollResults from '../components/PollResults'
import { useActivePoll } from '../hooks/useActivePoll'

export default function ResultsPage() {
  const { poll, loading, error } = useActivePoll({ includeClosed: true })

  if (loading) {
    return <p className="poll-loading">Loading results…</p>
  }

  if (error) {
    return (
      <div className="poll-page art-deco-border">
        <p className="poll-message poll-message-error">{error}</p>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="poll-page art-deco-border">
        <header className="poll-page-header">
          <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
          <h1 className="poll-page-title">Live Results</h1>
          <p className="poll-page-subtitle">No results to show yet.</p>
        </header>
      </div>
    )
  }

  return (
    <div className="poll-page art-deco-border">
      <PollPageNav backTo="/" backLabel="Guest list" />

      <header className="poll-page-header poll-page-header-compact">
        <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
        <h1 className="poll-page-title">{poll.title}</h1>
      </header>

      <PollResults pollId={poll.id} />

      {poll.status === 'open' && (
        <p className="poll-page-footer-link">
          <Link to="/">← Back to guest list</Link>
        </p>
      )}
    </div>
  )
}
