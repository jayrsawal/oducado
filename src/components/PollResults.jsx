import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OptionVisual from './OptionVisual'
import { useResultsNav } from '../contexts/ResultsNavContext'
import { shuffleContenders } from '../lib/shuffle'
import { scrollToCarouselPage } from '../lib/smoothScroll'
import { compareOptionLabels, supabase } from '../lib/supabase'

const TOP_CONTENDER_COUNT = 5
const CARDS_PER_PAGE = 3

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

function chunkOptions(options, size) {
  const pages = []
  for (let index = 0; index < options.length; index += size) {
    pages.push(options.slice(index, index + size))
  }
  return pages
}

function ResultTile({
  option,
  index,
  isWinner = false,
  hideVotes = false,
  hideRank = false,
  placementOnly = false,
  interactive = false,
  onSelect,
}) {
  return (
    <div
      className={[
        'poll-results-tile',
        'poll-results-tile-has-photo',
        isWinner ? 'poll-results-tile-winner' : 'poll-results-tile-runner',
        hideVotes && 'poll-results-tile-contender',
        option.vote_count === 0 && !hideVotes && 'poll-results-tile-empty',
        interactive && 'poll-results-tile-interactive',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect?.()
              }
            }
          : undefined
      }
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={
        interactive ? `Show next page after ${option.option_label}` : undefined
      }
    >
      {isWinner && <span className="poll-results-tile-badge">Leading</span>}
      {!hideRank && (
        <span
          className={[
            'poll-results-tile-rank',
            placementOnly && 'poll-results-tile-rank-subtle',
            isWinner && placementOnly && 'poll-results-tile-rank-leader',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          #{index + 1}
        </span>
      )}
      <OptionVisual
        src={option.option_image_url}
        frameClass="poll-results-photo-frame"
        imageClass="poll-results-tile-image"
        placeholderClass="poll-results-photo-placeholder"
      />
      <span className="poll-results-tile-caption">
        <span className="poll-results-tile-label" title={option.option_label}>
          {option.option_label}
        </span>
        {!hideVotes && (
          <span className="poll-results-tile-votes-meta">
            {option.vote_count} vote{option.vote_count === 1 ? '' : 's'}
          </span>
        )}
      </span>
    </div>
  )
}

function ResultsCarousel({ options, pageKey, contenders = false, renderTile }) {
  const trackRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(0)
  const currentPageRef = useRef(0)
  const isAnimatingRef = useRef(false)
  const scrollIdleRef = useRef(null)

  const pages = useMemo(
    () => chunkOptions(options, CARDS_PER_PAGE),
    [options]
  )

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  useEffect(() => {
    setCurrentPage(0)
    currentPageRef.current = 0
    const track = trackRef.current
    if (track) track.scrollLeft = 0
  }, [pageKey, options.length])

  const goToPage = useCallback((pageIndex, smooth = true) => {
    const track = trackRef.current
    if (!track || pages.length <= 1) return

    const nextPage = Math.max(0, Math.min(pageIndex, pages.length - 1))
    if (nextPage === currentPageRef.current && Math.abs(track.scrollLeft - nextPage * track.clientWidth) < 2) {
      return
    }

    isAnimatingRef.current = true
    setCurrentPage(nextPage)
    currentPageRef.current = nextPage

    scrollToCarouselPage(track, nextPage, smooth ? undefined : 0, () => {
      isAnimatingRef.current = false
    })
  }, [pages.length])

  const snapToNearestPage = useCallback(() => {
    const track = trackRef.current
    if (!track || pages.length <= 1 || isAnimatingRef.current) return

    const pageWidth = track.clientWidth
    if (!pageWidth) return

    const nearestPage = Math.max(
      0,
      Math.min(Math.round(track.scrollLeft / pageWidth), pages.length - 1)
    )
    const targetLeft = nearestPage * pageWidth

    if (Math.abs(track.scrollLeft - targetLeft) > 4) {
      goToPage(nearestPage)
      return
    }

    if (nearestPage !== currentPageRef.current) {
      setCurrentPage(nearestPage)
      currentPageRef.current = nearestPage
    }
  }, [goToPage, pages.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track || pages.length <= 1) return undefined

    function onScroll() {
      if (isAnimatingRef.current) return

      window.clearTimeout(scrollIdleRef.current)
      scrollIdleRef.current = window.setTimeout(snapToNearestPage, 120)
    }

    function onScrollEnd() {
      if (!isAnimatingRef.current) snapToNearestPage()
    }

    function onWheel(event) {
      if (pages.length <= 1 || isAnimatingRef.current) return

      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (Math.abs(delta) < 6) return

      event.preventDefault()

      const direction = delta > 0 ? 1 : -1
      const nextPage = currentPageRef.current + direction
      if (nextPage >= 0 && nextPage < pages.length) {
        goToPage(nextPage)
      }
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    track.addEventListener('scrollend', onScrollEnd)
    track.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      window.clearTimeout(scrollIdleRef.current)
      track.removeEventListener('scroll', onScroll)
      track.removeEventListener('scrollend', onScrollEnd)
      track.removeEventListener('wheel', onWheel)
    }
  }, [goToPage, pages.length, snapToNearestPage])

  const goToNextPage = useCallback(() => {
    goToPage(currentPageRef.current < pages.length - 1 ? currentPageRef.current + 1 : 0)
  }, [goToPage, pages.length])

  if (options.length === 0) return null

  return (
    <div className="poll-results-leaderboard">
      <div
        ref={trackRef}
        className={[
          'poll-results-track',
          contenders && 'poll-results-track-contenders',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {pages.map((pageOptions, pageIndex) => (
          <div
            key={`${pageKey}-page-${pageIndex}`}
            className={[
              'poll-results-carousel-page',
              pageIndex === currentPage && 'poll-results-carousel-page-visible',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={pageIndex !== currentPage}
          >
            {pageOptions.map((option, optionIndex) => {
              const globalIndex = pageIndex * CARDS_PER_PAGE + optionIndex
              return renderTile(option, globalIndex, {
                interactive: pages.length > 1,
                onSelect: goToNextPage,
              })
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function RevealedCategory({ category }) {
  const hasVotes = category.maxVotes > 0
  const winner = hasVotes ? category.options[0] : null
  const runners = hasVotes ? category.options.slice(1) : category.options

  return (
    <section className="poll-results-category">
      <h3 className="poll-results-category-title">{category.name}</h3>

      {winner && (
        <div className="poll-results-winner-spotlight">
          <ResultTile
            option={winner}
            index={0}
            isWinner
            hideVotes
            placementOnly
          />
        </div>
      )}

      {runners.length > 0 && (
        <div className="poll-results-runners">
          {runners.length > 1 && (
            <p className="poll-results-scroll-hint">
              Scroll or tap a photo to browse the other options
            </p>
          )}
          <ResultsCarousel
            pageKey={`${category.id}-runners-${runners.length}`}
            options={runners}
            renderTile={(option, index, interaction) => (
              <ResultTile
                key={option.option_id}
                option={option}
                index={index + 1}
                hideVotes
                placementOnly
                interactive={interaction.interactive}
                onSelect={interaction.onSelect}
              />
            )}
          />
        </div>
      )}
    </section>
  )
}

function ClosedLeaderCategory({ category, pollId }) {
  const hasVotes = category.maxVotes > 0
  const leader = hasVotes ? category.options[0] : null
  const others = useMemo(() => {
    if (!hasVotes) return []
    const rest = category.options.slice(1, TOP_CONTENDER_COUNT)
    return shuffleContenders(rest, pollId, `${category.id}-closed`)
  }, [category.options, category.id, pollId, hasVotes])

  if (!hasVotes) {
    return (
      <section className="poll-results-category">
        <h3 className="poll-results-category-title">{category.name}</h3>
        <p className="poll-hint">No votes in this category yet.</p>
      </section>
    )
  }

  return (
    <section className="poll-results-category">
      <h3 className="poll-results-category-title">{category.name}</h3>

      {leader && (
        <div className="poll-results-winner-spotlight">
          <ResultTile
            option={leader}
            index={0}
            isWinner
            hideVotes
            placementOnly
          />
        </div>
      )}

      {others.length > 0 && (
        <div className="poll-results-runners">
          {others.length > 1 && (
            <p className="poll-results-scroll-hint">
              Scroll or tap a photo to browse the other contenders
            </p>
          )}
          <ResultsCarousel
            pageKey={`${category.id}-closed-${others.length}`}
            options={others}
            contenders
            renderTile={(option, _index, interaction) => (
              <ResultTile
                key={option.option_id}
                option={option}
                hideVotes
                hideRank
                interactive={interaction.interactive}
                onSelect={interaction.onSelect}
              />
            )}
          />
        </div>
      )}
    </section>
  )
}

function AdminResultsCategory({ category }) {
  const categoryVotes = category.options.reduce((sum, option) => sum + option.vote_count, 0)

  return (
    <section className="admin-results-category">
      <h3 className="admin-results-category-title">{category.name}</h3>
      {category.options.length === 0 ? (
        <p className="poll-hint">No options in this category.</p>
      ) : (
        <div className="admin-results-table-wrap">
          <table className="admin-results-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Option</th>
                <th scope="col">Votes</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {category.options.map((option, index) => {
                const share =
                  categoryVotes > 0
                    ? Math.round((option.vote_count / categoryVotes) * 100)
                    : 0

                return (
                  <tr key={option.option_id}>
                    <td className="admin-results-rank">#{index + 1}</td>
                    <td className="admin-results-option-cell">
                      <div className="admin-results-option">
                        <OptionVisual
                          src={option.option_image_url}
                          frameClass="admin-results-thumb-frame"
                          imageClass="admin-results-thumb"
                          placeholderClass="admin-results-thumb-placeholder"
                        />
                        <span className="admin-results-option-label">{option.option_label}</span>
                      </div>
                    </td>
                    <td className="admin-results-votes">{option.vote_count}</td>
                    <td className="admin-results-share">
                      <span className="admin-results-share-value">{share}%</span>
                      <span className="admin-results-share-bar" aria-hidden="true">
                        <span
                          className="admin-results-share-bar-fill"
                          style={{ width: `${share}%` }}
                        />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Category total</td>
                <td>{categoryVotes}</td>
                <td>100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

function AdminResultsView({ categories, summary }) {
  return (
    <div className="admin-results">
      {summary && (
        <div className="admin-results-summary-panel">
          <p className="admin-results-summary-stat">
            <span className="admin-results-summary-value">{summary.voter_count}</span>
            <span className="admin-results-summary-label">
              ballot{summary.voter_count === 1 ? '' : 's'} cast
            </span>
          </p>
          <p className="admin-results-summary-stat">
            <span className="admin-results-summary-value">{summary.total_votes}</span>
            <span className="admin-results-summary-label">
              total selection{summary.total_votes === 1 ? '' : 's'}
            </span>
          </p>
        </div>
      )}

      {categories.map((category) => (
        <AdminResultsCategory key={category.id} category={category} />
      ))}
    </div>
  )
}

function ContenderCategory({ category, pollId }) {
  const contenders = useMemo(() => {
    const top = category.options.slice(0, TOP_CONTENDER_COUNT)
    return shuffleContenders(top, pollId, category.id)
  }, [category.options, category.id, pollId])

  if (contenders.length === 0) {
    return (
      <section className="poll-results-category">
        <h3 className="poll-results-category-title">{category.name}</h3>
        <p className="poll-hint">No votes in this category yet.</p>
      </section>
    )
  }

  return (
    <section className="poll-results-category">
      <h3 className="poll-results-category-title">{category.name}</h3>
      <p className="poll-results-contender-hint">
        Top {Math.min(TOP_CONTENDER_COUNT, category.options.length)} in contention
      </p>
      {contenders.length > 1 && (
        <p className="poll-results-scroll-hint">
          Scroll or tap a photo to browse contenders
        </p>
      )}
      <ResultsCarousel
        pageKey={`${category.id}-contenders-${contenders.length}`}
        options={contenders}
        contenders
        renderTile={(option, _index, interaction) => (
          <ResultTile
            key={option.option_id}
            option={option}
            hideVotes
            hideRank
            interactive={interaction.interactive}
            onSelect={interaction.onSelect}
          />
        )}
      />
    </section>
  )
}

export default function PollResults({
  pollId,
  pollStatus,
  resultsRevealed = false,
  showRevealControl = false,
  onRevealWinners,
  revealing = false,
  inlineRefresh = false,
}) {
  const { setResultsNav, clearResultsNav } = useResultsNav()
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const showFullResults = pollStatus === 'closed' && resultsRevealed
  const showClosedLeader = pollStatus === 'closed' && !resultsRevealed

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `id=eq.${pollId}` },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pollId, load])

  const refreshResults = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useEffect(() => {
    if (inlineRefresh) {
      clearResultsNav()
      return undefined
    }

    setResultsNav({
      onRefresh: refreshResults,
      refreshing: refreshing || loading,
    })

    return () => clearResultsNav()
  }, [
    inlineRefresh,
    refreshResults,
    refreshing,
    loading,
    setResultsNav,
    clearResultsNav,
  ])

  const categories = useMemo(() => groupAndSortResults(rows), [rows])

  if (loading) {
    return <p className="poll-loading">Loading results…</p>
  }

  if (error) {
    return <p className="poll-message poll-message-error">{error}</p>
  }

  return (
    <div className="poll-results">
      {showRevealControl && pollStatus === 'closed' && !resultsRevealed && (
        <div className="poll-results-reveal-panel">
          <p className="poll-hint">
            The poll is closed. Reveal winners when you&apos;re ready to announce them.
          </p>
          <button
            type="button"
            className="poll-button poll-button-primary"
            disabled={revealing}
            onClick={onRevealWinners}
          >
            {revealing ? 'Revealing…' : 'Reveal winners'}
          </button>
        </div>
      )}

      {showRevealControl && resultsRevealed && (
        <p className="poll-hint poll-hint-success poll-results-revealed-banner">
          Winners are visible to everyone.
        </p>
      )}

      {!showRevealControl && !showFullResults && (
        <p className="poll-results-mode-hint">
          {showClosedLeader
            ? 'The leading option in each category is shown — full results will be announced soon.'
            : 'Order is randomized — rankings stay hidden until the organizer reveals winners.'}
        </p>
      )}

      {showRevealControl ? (
        <AdminResultsView categories={categories} summary={summary} />
      ) : (
        categories.map((category) => {
          if (showFullResults) {
            return <RevealedCategory key={category.id} category={category} />
          }
          if (showClosedLeader) {
            return (
              <ClosedLeaderCategory
                key={category.id}
                category={category}
                pollId={pollId}
              />
            )
          }
          return (
            <ContenderCategory key={category.id} category={category} pollId={pollId} />
          )
        })
      )}

      <footer className="poll-results-footer">
        {inlineRefresh && (
          <button
            type="button"
            className="poll-button poll-button-secondary poll-button-small"
            onClick={refreshResults}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </footer>
    </div>
  )
}
