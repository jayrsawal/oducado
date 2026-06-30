import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PollRosterBoard from './PollRosterBoard'
import { usePollRoster } from '../hooks/usePollRoster'
import { buildRosterDisplayGroups } from '../lib/roster'

export default function PollGuestList({ poll, showEyebrow = false }) {
  const navigate = useNavigate()
  const { tables, roster, votedNames, votedDisplayNames, loading, error } =
    usePollRoster(poll.id)
  const [voterName, setVoterName] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)

  useEffect(() => {
    if (!loading && roster.length === 0) {
      setShowManualEntry(true)
    }
  }, [loading, roster.length])

  const rosterGroups = useMemo(
    () => buildRosterDisplayGroups(tables, roster, votedDisplayNames),
    [tables, roster, votedDisplayNames]
  )

  const hasRoster = roster.length > 0
  const showRosterBoard = rosterGroups.length > 0

  function goToVote(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    navigate(`/vote?name=${encodeURIComponent(trimmed)}`)
  }

  function handleNameSubmit(event) {
    event.preventDefault()
    goToVote(voterName)
  }

  if (loading) {
    return <p className="poll-loading">Loading guest list…</p>
  }

  if (error) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <p className="poll-message poll-message-error">{error}</p>
      </div>
    )
  }

  return (
    <div className="poll-page art-deco-border poll-page-with-float-nav">
      <header className="poll-page-header">
        {showEyebrow && (
          <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
        )}
        <h1 className="poll-page-title">{poll.title}</h1>
        {poll.description && (
          <p className="poll-page-subtitle">{poll.description}</p>
        )}
        <p className="poll-hint">
          {hasRoster
            ? 'Select your name to vote. On a shared device, each person votes separately.'
            : 'Enter your name to vote.'}
        </p>
      </header>

      {showRosterBoard && (
        <PollRosterBoard
          groups={rosterGroups}
          votedNames={votedNames}
          interactive
          onSelectName={goToVote}
          title="Guest list"
        />
      )}

      <div className="poll-voter-picker">
        {hasRoster && (
          <p className="poll-voter-picker-hint">
            Tap your name above, or use manual entry below.
          </p>
        )}

        <div className={`poll-manual-name${hasRoster ? ' poll-manual-name-collapsed' : ''}`}>
          {hasRoster && !showManualEntry ? (
            <button
              type="button"
              className="poll-manual-name-toggle"
              onClick={() => setShowManualEntry(true)}
            >
              Don&apos;t see your name?
            </button>
          ) : (
            <form className="poll-form poll-voter-form" onSubmit={handleNameSubmit}>
              {hasRoster && (
                <p className="poll-manual-name-label">Enter your name manually</p>
              )}
              <label className="poll-field">
                <span>Your name</span>
                <input
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  placeholder="e.g. Maria Oducado"
                  required={!hasRoster}
                  autoFocus={!hasRoster}
                />
              </label>

              <button
                type="submit"
                className="poll-button poll-button-secondary"
                disabled={!voterName.trim()}
              >
                Continue to vote
              </button>

              {hasRoster && (
                <button
                  type="button"
                  className="poll-manual-name-toggle"
                  onClick={() => {
                    setShowManualEntry(false)
                    setVoterName('')
                  }}
                >
                  Back to guest list
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      <p className="poll-page-footer-link">
        <Link to="/photos">Share your reunion photos →</Link>
      </p>
    </div>
  )
}
