import { Link } from 'react-router-dom'
import FloatingPollNav from './FloatingPollNav'
import PageTransition from './PageTransition'
import { VoteNavProvider } from '../contexts/VoteNavContext'
import { ResultsNavProvider } from '../contexts/ResultsNavContext'
import '../App.css'
import '../polls.css'

export default function Layout() {
  return (
    <>
      <div className="sparkle" />
      <div className="container">
        <nav className="site-nav">
          <Link to="/" className="site-nav-brand">
            Oducado Reunion Polls
          </Link>
          <div className="site-nav-links">
            <Link to="/admin" className="site-nav-link site-nav-link-muted">
              Admin
            </Link>
          </div>
        </nav>
        <VoteNavProvider>
          <ResultsNavProvider>
            <PageTransition />
            <FloatingPollNav />
          </ResultsNavProvider>
        </VoteNavProvider>
      </div>
    </>
  )
}
