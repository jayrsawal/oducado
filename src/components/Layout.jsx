import { Link, NavLink, useLocation } from 'react-router-dom'
import FloatingPollNav from './FloatingPollNav'
import PageTransition from './PageTransition'
import { VoteNavProvider } from '../contexts/VoteNavContext'
import { ResultsNavProvider } from '../contexts/ResultsNavContext'
import { FeedNavProvider } from '../contexts/FeedNavContext'
import '../App.css'
import '../polls.css'

const POLL_NAV_PATHS = new Set(['/polls', '/vote', '/results'])

function PollsNavLink() {
  const { pathname } = useLocation()
  const active = POLL_NAV_PATHS.has(pathname)

  return (
    <Link to="/polls" className={`site-nav-link${active ? ' site-nav-link-active' : ''}`}>
      Polls
    </Link>
  )
}

export default function Layout() {
  return (
    <>
      <div className="sparkle" />
      <div className="container">
        <nav className="site-nav">
          <Link to="/" className="site-nav-brand">
            ODUCADO
          </Link>
          <div className="site-nav-links">
            <PollsNavLink />
            <NavLink
              to="/photos"
              end
              className={({ isActive }) =>
                `site-nav-link${isActive ? ' site-nav-link-active' : ''}`
              }
            >
              Photos
            </NavLink>
            <NavLink
              to="/photos/wall"
              className={({ isActive }) =>
                `site-nav-link${isActive ? ' site-nav-link-active' : ''}`
              }
            >
              Feed
            </NavLink>
            <Link to="/admin" className="site-nav-link site-nav-link-muted">
              Admin
            </Link>
          </div>
        </nav>
        <VoteNavProvider>
          <ResultsNavProvider>
            <FeedNavProvider>
              <PageTransition />
              <FloatingPollNav />
            </FeedNavProvider>
          </ResultsNavProvider>
        </VoteNavProvider>
      </div>
    </>
  )
}
