import { Link, useLocation } from 'react-router-dom'
import { useResultsNav } from '../contexts/ResultsNavContext'
import { useFeedNav } from '../contexts/FeedNavContext'
import { useVoteNav } from '../contexts/VoteNavContext'

const GUEST_PATHS = new Set(['/polls', '/vote', '/results', '/photos/wall'])

function guestNav(location, voteNav, resultsNav, feedNav) {
  if (!GUEST_PATHS.has(location.pathname)) {
    return null
  }

  if (location.pathname === '/polls') {
    return {
      back: { type: 'link', to: '/', label: 'Home' },
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
      back: { type: 'link', to: '/polls', label: 'Polls' },
      forward,
    }
  }

  if (location.pathname === '/results') {
    return {
      back: { type: 'link', to: '/polls', label: 'Polls' },
      forward: resultsNav
        ? {
            type: 'refresh',
            label: resultsNav.refreshing ? 'Refreshing…' : 'Refresh',
            disabled: resultsNav.refreshing,
            onClick: resultsNav.onRefresh,
            ariaLabel: 'Refresh results',
          }
        : null,
    }
  }

  if (location.pathname === '/photos/wall') {
    return {
      back: feedNav?.onOpenCamera
        ? {
            type: 'action',
            label: 'Camera',
            icon: '📷',
            onClick: feedNav.onOpenCamera,
            disabled: feedNav.cameraDisabled,
            ariaLabel: 'Share a photo',
          }
        : null,
      forward: feedNav
        ? {
            type: 'refresh',
            label: feedNav.refreshing ? 'Refreshing…' : 'Refresh',
            disabled: feedNav.refreshing,
            onClick: feedNav.onRefresh,
            ariaLabel: 'Refresh feed',
          }
        : null,
    }
  }

  return null
}

function NavBack({ back }) {
  if (!back) return <span className="floating-poll-nav-spacer" />

  if (back.type === 'action') {
    return (
      <button
        type="button"
        className="floating-poll-nav-btn floating-poll-nav-back floating-poll-nav-btn-cta"
        onClick={back.onClick}
        disabled={back.disabled}
        aria-label={back.ariaLabel ?? back.label}
      >
        <span className="floating-poll-nav-icon" aria-hidden="true">
          {back.icon}
        </span>
        <span className="floating-poll-nav-label">{back.label}</span>
      </button>
    )
  }

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
        aria-label={forward.ariaLabel ?? 'Refresh'}
      >
        <span className="floating-poll-nav-label">{forward.label}</span>
        <span className="floating-poll-nav-icon" aria-hidden="true">
          ↻
        </span>
      </button>
    )
  }

  if (forward.type === 'action') {
    return (
      <button
        type="button"
        className="floating-poll-nav-btn floating-poll-nav-forward floating-poll-nav-btn-cta"
        onClick={forward.onClick}
        disabled={forward.disabled}
        aria-label={forward.ariaLabel ?? forward.label}
      >
        <span className="floating-poll-nav-label">{forward.label}</span>
        <span className="floating-poll-nav-icon" aria-hidden="true">
          {forward.icon}
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
  const { feedNav } = useFeedNav()
  const nav = guestNav(location, voteNav, resultsNav, feedNav)

  if (!nav) return null

  return (
    <nav className="floating-poll-nav" aria-label="Page navigation">
      <NavBack back={nav.back} />
      <NavForward forward={nav.forward} />
    </nav>
  )
}
