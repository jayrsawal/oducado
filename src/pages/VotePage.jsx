import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import PollBallot from '../components/PollBallot'
import { useVoteNav } from '../contexts/VoteNavContext'
import { getDeviceId, rememberVoterName } from '../lib/deviceId'
import { POLL_SELECT, sortPollCategories, supabase } from '../lib/supabase'
import { useActivePoll } from '../hooks/useActivePoll'

const VOTE_BALLOT_FORM_ID = 'vote-ballot'

export default function VotePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const voterName = searchParams.get('name')?.trim() ?? ''
  const { poll, loading: pollLoading, error: pollError } = useActivePoll()
  const deviceId = getDeviceId()
  const { setVoteNav, clearVoteNav } = useVoteNav()

  const [ballotPoll, setBallotPoll] = useState(null)
  const [voterId, setVoterId] = useState(null)
  const [initialSelections, setInitialSelections] = useState([])
  const [ballotState, setBallotState] = useState({
    selectionsUnchanged: true,
    submitting: false,
  })
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

  const handleBallotStateChange = useCallback((next) => {
    setBallotState(next)
  }, [])

  useEffect(() => {
    if (!ballotPoll || !voterId) {
      clearVoteNav()
      return
    }

    const hasVoted = initialSelections.length > 0
    const showResults =
      hasVoted && ballotState.selectionsUnchanged && !ballotState.submitting

    setVoteNav({
      showResults,
      formId: VOTE_BALLOT_FORM_ID,
      submitLabel: hasVoted ? 'Update vote' : 'Submit vote',
      submitting: ballotState.submitting,
    })

    return () => clearVoteNav()
  }, [
    ballotPoll,
    voterId,
    initialSelections,
    ballotState,
    setVoteNav,
    clearVoteNav,
  ])

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
    return <Navigate to="/polls" replace />
  }

  if (pollLoading || loading) {
    return <p className="poll-loading">Loading ballot…</p>
  }

  if (pollError) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <p className="poll-message poll-message-error">{pollError}</p>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <p className="poll-message">There is no active poll right now.</p>
      </div>
    )
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
        formId={VOTE_BALLOT_FORM_ID}
        hideSubmitButton
        submitLabel={initialSelections.length > 0 ? 'Update vote' : 'Submit vote'}
        onBallotStateChange={handleBallotStateChange}
        onSubmit={submitVote}
      />
    </div>
  )
}
