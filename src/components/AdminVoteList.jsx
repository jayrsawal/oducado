import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function voterLabel(voter) {
  if (!voter) return 'Unknown voter'
  if (voter.display_name) return voter.display_name
  if (voter.device_id) return `Device ${voter.device_id.slice(0, 8)}…`
  return 'Unknown voter'
}

function groupVotesByVoter(votes) {
  const grouped = new Map()

  for (const vote of votes) {
    const voterId = vote.poll_voters?.id ?? vote.voter_id
    if (!grouped.has(voterId)) {
      grouped.set(voterId, {
        voter: vote.poll_voters,
        votes: [],
      })
    }
    grouped.get(voterId).votes.push(vote)
  }

  return [...grouped.values()].sort((a, b) => {
    const aTime = a.votes[0]?.created_at ?? ''
    const bTime = b.votes[0]?.created_at ?? ''
    return bTime.localeCompare(aTime)
  })
}

export default function AdminVoteList({ pollId }) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('poll_votes')
      .select(`
        id,
        voter_id,
        created_at,
        cast_by,
        poll_voters (
          id,
          device_id,
          display_name,
          is_proxy
        ),
        poll_options (
          label,
          poll_categories (
            name
          )
        )
      `)
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setVotes(data ?? [])
    }
    setLoading(false)
  }, [pollId])

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`admin-votes-${pollId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${pollId}` },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pollId, load])

  const ballots = useMemo(() => groupVotesByVoter(votes), [votes])

  async function deleteVote(voteId, optionLabel) {
    if (!confirm(`Remove this vote for "${optionLabel}"?`)) return

    setDeletingId(voteId)
    setError(null)
    const { error: deleteError } = await supabase
      .from('poll_votes')
      .delete()
      .eq('id', voteId)

    setDeletingId(null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await load()
  }

  async function deleteBallot(voterId, voterName) {
    if (!confirm(`Remove all votes for ${voterName}?`)) return

    setError(null)
    const { error: deleteError } = await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('voter_id', voterId)

    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await load()
  }

  if (loading) {
    return <p className="poll-loading">Loading votes…</p>
  }

  if (error && votes.length === 0) {
    return <p className="poll-message poll-message-error">{error}</p>
  }

  return (
    <div className="admin-votes">
      <p className="poll-hint">
        {votes.length} individual vote{votes.length === 1 ? '' : 's'} across{' '}
        {ballots.length} ballot{ballots.length === 1 ? '' : 's'}
      </p>

      {error && <p className="poll-message poll-message-error">{error}</p>}

      <button type="button" className="poll-button poll-button-secondary" onClick={load}>
        Refresh
      </button>

      {ballots.length === 0 ? (
        <p className="poll-empty">No votes yet.</p>
      ) : (
        <ul className="admin-vote-ballots">
          {ballots.map(({ voter, votes: voterVotes }) => {
            const label = voterLabel(voter)
            const voterId = voter?.id ?? voterVotes[0]?.voter_id
            return (
              <li key={voterId ?? label} className="admin-vote-ballot">
                <div className="admin-vote-ballot-header">
                  <div>
                    <span className="admin-vote-voter">{label}</span>
                    {voter?.is_proxy && (
                      <span className="admin-vote-tag">Proxy ballot</span>
                    )}
                    {!voter?.is_proxy && voter?.device_id && (
                      <span className="admin-vote-tag">Self-service</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="poll-button poll-button-danger poll-button-small"
                    onClick={() => deleteBallot(voterId, label)}
                  >
                    Clear ballot
                  </button>
                </div>

                <ul className="admin-vote-rows">
                  {voterVotes.map((vote) => (
                    <li key={vote.id} className="admin-vote-row">
                      <div className="admin-vote-row-body">
                        <span className="admin-vote-category">
                          {vote.poll_options?.poll_categories?.name ?? 'Category'}
                        </span>
                        <span className="admin-vote-option">
                          {vote.poll_options?.label ?? 'Option'}
                        </span>
                        <span className="admin-vote-meta">
                          {new Date(vote.created_at).toLocaleString()}
                          {vote.cast_by && ' · Admin cast'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="poll-button poll-button-danger poll-button-small"
                        disabled={deletingId === vote.id}
                        onClick={() =>
                          deleteVote(vote.id, vote.poll_options?.label ?? 'this option')
                        }
                      >
                        {deletingId === vote.id ? '…' : 'Delete'}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
