import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OptionVisual from './OptionVisual'
import { centerElementInScrollContainer } from '../lib/smoothScroll'
import { compareOptionLabels, supabase } from '../lib/supabase'

function groupAndSortResults(rows) {
  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.category_id]) {
      acc[row.category_id] = {
        id: row.category_id,
        name: row.category_name,
        order: row.category_order,
        options: [],
      }
    }
    acc[row.category_id].options.push(row)
    return acc
  }, {})

  return Object.values(grouped)
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const options = [...category.options].sort(
        (a, b) =>
          b.vote_count - a.vote_count ||
          compareOptionLabels(a.option_label, b.option_label)
      )
      const maxVotes = Math.max(...options.map((o) => o.vote_count), 0)
      return { ...category, options, maxVotes }
    })
}

function ResultTile({ option, index, isWinner = false, onSelect }) {
  const tileRef = useRef(null)

  const handleSelect = useCallback(() => {
    onSelect?.(tileRef.current)
  }, [onSelect])

  function handleKeyDown(event) {
    if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      handleSelect()
    }
  }

  return (
    <div
      ref={tileRef}
      className={[
        'poll-results-tile',
        'poll-results-tile-has-photo',
        isWinner ? 'poll-results-tile-winner' : 'poll-results-tile-runner',
        onSelect && 'poll-results-tile-interactive',
        option.vote_count === 0 && 'poll-results-tile-empty',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect ? handleSelect : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {isWinner && <span className="poll-results-tile-badge">Leading</span>}
      {!isWinner && (
        <span className="poll-results-tile-rank">#{index + 1}</span>
      )}
      <OptionVisual
        src={option.option_image_url}
        frameClass="poll-results-photo-frame"
        imageClass="poll-results-tile-image"
        placeholderClass="poll-results-photo-placeholder"
      />
      <span className="poll-results-tile-caption">
        <span className="poll-results-tile-label">{option.option_label}</span>
        <span className="poll-results-tile-votes-meta">
          {option.vote_count} vote{option.vote_count === 1 ? '' : 's'}
        </span>
      </span>
    </div>
  )
}

function ResultsCategory({ category }) {
  const trackRef = useRef(null)
  const hasVotes = category.maxVotes > 0
  const winner = hasVotes ? category.options[0] : null
  const runners = hasVotes ? category.options.slice(1) : category.options

  const centerRunner = useCallback((tile) => {
    centerElementInScrollContainer(trackRef.current, tile)
  }, [])

  return (
    <section className="poll-results-category">
      <h3 className="poll-results-category-title">{category.name}</h3>

      {winner && (
        <div className="poll-results-winner-spotlight">
          <ResultTile option={winner} index={0} isWinner />
        </div>
      )}

      {runners.length > 0 && (
        <div className="poll-results-runners">
          {hasVotes && runners.length > 1 && (
            <p className="poll-results-scroll-hint">Tap an option to center it</p>
          )}
          <div className="poll-results-leaderboard">
            <div className="poll-results-track" ref={trackRef}>
              {runners.map((option, index) => (
                <ResultTile
                  key={option.option_id}
                  option={option}
                  index={index + 1}
                  onSelect={centerRunner}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default function PollResults({ pollId }) {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    const [resultsRes, summaryRes] = await Promise.all([
      supabase
        .from('poll_option_results')
        .select('*')
        .eq('poll_id', pollId),
      supabase
        .from('poll_summary')
        .select('*')
        .eq('poll_id', pollId)
        .maybeSingle(),
    ])

    if (resultsRes.error) {
      setError(resultsRes.error.message)
      setLoading(false)
      return
    }

    setRows(resultsRes.data ?? [])
    setSummary(summaryRes.data)
    setLoading(false)
  }, [pollId])

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`poll-results-${pollId}`)
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

  const categories = useMemo(() => groupAndSortResults(rows), [rows])

  if (loading) {
    return <p className="poll-loading">Loading results…</p>
  }

  if (error) {
    return <p className="poll-message poll-message-error">{error}</p>
  }

  return (
    <div className="poll-results">
      {categories.map((category) => (
        <ResultsCategory key={category.id} category={category} />
      ))}

      <footer className="poll-results-footer">
        {summary && (
          <p className="poll-results-summary">
            {summary.voter_count} ballot{summary.voter_count === 1 ? '' : 's'} ·{' '}
            {summary.total_votes} total selection
            {summary.total_votes === 1 ? '' : 's'}
          </p>
        )}
        <button
          type="button"
          className="poll-button poll-button-secondary poll-button-small"
          onClick={load}
        >
          Refresh
        </button>
      </footer>
    </div>
  )
}
