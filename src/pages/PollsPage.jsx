import PollGuestList from '../components/PollGuestList'
import PollResults from '../components/PollResults'
import { useActivePoll } from '../hooks/useActivePoll'

export default function PollsPage() {
  const { poll, loading, error } = useActivePoll({ includeClosed: true })

  if (loading) {
    return <p className="poll-loading">Loading…</p>
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
          <h1 className="poll-page-title">Family Poll</h1>
          <p className="poll-page-subtitle">
            There is no active poll right now. Check back soon!
          </p>
        </header>
      </div>
    )
  }

  if (poll.status === 'closed') {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <header className="poll-page-header poll-page-header-compact">
          <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
          <h1 className="poll-page-title">{poll.title}</h1>
          {poll.description && (
            <p className="poll-page-subtitle">{poll.description}</p>
          )}
        </header>

        <PollResults
          pollId={poll.id}
          pollStatus={poll.status}
          resultsRevealed={poll.results_revealed}
        />
      </div>
    )
  }

  return <PollGuestList poll={poll} showEyebrow />
}
