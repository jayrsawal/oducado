import { Link, useLocation } from 'react-router-dom'
import { useResultsNav } from '../contexts/ResultsNavContext'
import { useVoteNav } from '../contexts/VoteNavContext'

const GUEST_PATHS = new Set(['/', '/vote', '/results'])

function guestNav(location, voteNav, resultsNav) {
  if (!GUEST_PATHS.has(location.pathname)) return null

  if (location.pathname === '/') {
    return {
      back: null,
      forward: { type: 'link', to: '/results', label: 'Results' },
    }
  }

  if (location.pathname === '/vote') {
    let forward = null

    if (voteNav?.showResults) {
      forward = { type: 'link', to: '/results', label: 'Results' }
    } else if (voteNav) {
      forward = {
        type: 'submit',
        formId: voteNav.formId,
        label: voteNav.submitting ? 'Submitting…' : voteNav.submitLabel,
        disabled: voteNav.submitting,
      }
    }

    return {
      back: { type: 'link', to: '/', label: 'Guest list' },
      forward,
    }
  }

  if (location.pathname === '/results') {
    return {
      back: { type: 'link', to: '/', label: 'Guest list' },
      forward: resultsNav
        ? {
            type: 'refresh',
            label: resultsNav.refreshing ? 'Refreshing…' : 'Refresh',
            disabled: resultsNav.refreshing,
            onClick: resultsNav.onRefresh,
          }
        : null,
    }
  }

  return null
}

function NavBack({ back }) {
  if (!back) return <span className="floating-poll-nav-spacer" />

  if (back.type === 'link') {
    return (
      <Link to={back.to} className="floating-poll-nav-btn floating-poll-nav-back">
        <span className="floating-poll-nav-icon" aria-hidden="true">
          ←
        </span>
        <span className="floating-poll-nav-label">{back.label}</span>
      </Link>
    )
  }

  return <span className="floating-poll-nav-spacer" />
}

function NavForward({ forward }) {
  if (!forward) return <span className="floating-poll-nav-spacer" />

  if (forward.type === 'submit') {
    return (
      <button
        type="submit"
        form={forward.formId}
        className="floating-poll-nav-btn floating-poll-nav-forward floating-poll-nav-btn-cta"
        disabled={forward.disabled}
      >
        <span className="floating-poll-nav-label">{forward.label}</span>
        <span className="floating-poll-nav-icon" aria-hidden="true">
          →
        </span>
      </button>
    )
  }

  if (forward.type === 'refresh') {
    return (
      <button
        type="button"
        className="floating-poll-nav-btn floating-poll-nav-forward"
        onClick={forward.onClick}
        disabled={forward.disabled}
        aria-label="Refresh results"
      >
        <span className="floating-poll-nav-label">{forward.label}</span>
        <span className="floating-poll-nav-icon" aria-hidden="true">
          ↻
        </span>
      </button>
    )
  }

  return (
    <Link to={forward.to} className="floating-poll-nav-btn floating-poll-nav-forward">
      <span className="floating-poll-nav-label">{forward.label}</span>
      <span className="floating-poll-nav-icon" aria-hidden="true">
        →
      </span>
    </Link>
  )
}

export default function FloatingPollNav() {
  const location = useLocation()
  const { voteNav } = useVoteNav()
  const { resultsNav } = useResultsNav()
  const nav = guestNav(location, voteNav, resultsNav)

  if (!nav) return null

  return (
    <nav className="floating-poll-nav" aria-label="Page navigation">
      <NavBack back={nav.back} />
      <NavForward forward={nav.forward} />
    </nav>
  )
}
