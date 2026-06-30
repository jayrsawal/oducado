import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import PollBallot from '../components/PollBallot'
import PollPageNav from '../components/PollPageNav'
import { getDeviceId, rememberVoterName } from '../lib/deviceId'
import { POLL_SELECT, sortPollCategories, supabase } from '../lib/supabase'
import { useActivePoll } from '../hooks/useActivePoll'

export default function VotePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const voterName = searchParams.get('name')?.trim() ?? ''
  const { poll, loading: pollLoading, error: pollError } = useActivePoll()
  const deviceId = getDeviceId()

  const [ballotPoll, setBallotPoll] = useState(null)
  const [voterId, setVoterId] = useState(null)
  const [initialSelections, setInitialSelections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadBallot = useCallback(async () => {
    if (!poll?.id || !voterName) return

    setError(null)

    const { data: pollData, error: pollLoadError } = await supabase
      .from('polls')
      .select(POLL_SELECT)
      .eq('id', poll.id)
      .eq('status', 'open')
      .single()

    if (pollLoadError) throw pollLoadError

    const { data: newVoterId, error: voterError } = await supabase.rpc(
      'get_or_create_named_voter',
      {
        p_poll_id: poll.id,
        p_display_name: voterName,
        p_device_id: deviceId,
      }
    )

    if (voterError) throw voterError

    const { data: voter, error: ballotError } = await supabase
      .from('poll_voters')
      .select('id, is_proxy, poll_votes(option_id)')
      .eq('id', newVoterId)
      .single()

    if (ballotError) throw ballotError

    if (voter.is_proxy) {
      throw new Error(
        `"${voterName}" already has an admin-cast ballot. Ask an organizer to update it.`
      )
    }

    rememberVoterName(voterName)
    setBallotPoll(sortPollCategories(pollData))
    setVoterId(newVoterId)
    setInitialSelections(voter.poll_votes?.map((vote) => vote.option_id) ?? [])
  }, [poll?.id, voterName, deviceId])

  useEffect(() => {
    if (pollLoading) return

    if (!voterName || !poll) {
      setLoading(false)
      return
    }

    setLoading(true)
    loadBallot()
      .catch((err) => setError(err.message ?? 'Failed to load ballot'))
      .finally(() => setLoading(false))
  }, [pollLoading, poll, voterName, loadBallot])

  async function submitVote(optionIds) {
    const { error: submitError } = await supabase.rpc('submit_poll_ballot', {
      p_poll_id: poll.id,
      p_voter_id: voterId,
      p_option_ids: optionIds,
      p_cast_by: null,
      p_device_id: deviceId,
    })

    if (submitError) throw submitError
    navigate('/results')
  }

  if (!voterName) {
    return <Navigate to="/" replace />
  }

  if (pollLoading || loading) {
    return <p className="poll-loading">Loading ballot…</p>
  }

  if (pollError) {
    return (
      <div className="poll-page art-deco-border">
        <PollPageNav backTo="/" backLabel="Guest list" />
        <p className="poll-message poll-message-error">{pollError}</p>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="poll-page art-deco-border">
        <PollPageNav backTo="/" backLabel="Guest list" />
        <p className="poll-message">There is no active poll right now.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="poll-page art-deco-border">
        <PollPageNav backTo="/" backLabel="Guest list" />
        <p className="poll-message poll-message-error">{error}</p>
        <p className="poll-page-footer-link">
          <Link to="/">← Choose a different name</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="poll-page art-deco-border">
      <PollPageNav backTo="/" backLabel="Guest list" />

      <header className="poll-page-header poll-page-header-compact">
        <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
        <h1 className="poll-page-title">{ballotPoll.title}</h1>
        <p className="poll-hint">
          Voting as <strong>{voterName}</strong>
        </p>
      </header>

      {initialSelections.length > 0 && (
        <p className="poll-hint poll-hint-success">
          You have already voted. Update your selections below to change your ballot.
        </p>
      )}

      <PollBallot
        key={voterId}
        poll={ballotPoll}
        initialSelections={initialSelections}
        submitLabel={initialSelections.length > 0 ? 'Update vote' : 'Submit vote'}
        onSubmit={submitVote}
      />

      <p className="poll-page-footer-link">
        <Link to="/results">View live results →</Link>
      </p>
    </div>
  )
}
