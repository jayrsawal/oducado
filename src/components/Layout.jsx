import { Link } from 'react-router-dom'
import PageTransition from './PageTransition'
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
            <Link to="/" className="site-nav-link">
              Guest list
            </Link>
            <Link to="/results" className="site-nav-link">
              Results
            </Link>
            <Link to="/admin" className="site-nav-link site-nav-link-muted">
              Admin
            </Link>
          </div>
        </nav>
        <PageTransition />
      </div>
    </>
  )
}
