import { Link } from 'react-router-dom'
import PageQRCode from '../components/PageQRCode'
import { useActivePhotoAlbum } from '../hooks/useActivePhotoAlbum'
import { useActivePoll } from '../hooks/useActivePoll'

export default function HomePage() {
  const { poll, loading: pollLoading, error: pollError } = useActivePoll({
    includeClosed: true,
  })
  const { album, loading: albumLoading, error: albumError } = useActivePhotoAlbum({
    includeClosed: true,
  })

  if (pollLoading || albumLoading) {
    return <p className="poll-loading">Loading…</p>
  }

  if (pollError || albumError) {
    return (
      <div className="poll-page art-deco-border">
        <p className="poll-message poll-message-error">{pollError ?? albumError}</p>
      </div>
    )
  }

  const pollOpen = poll?.status === 'open'
  const pollClosed = poll?.status === 'closed'
  const pollCtaTo = pollOpen ? '/polls' : pollClosed ? '/results' : null
  const pollCtaLabel = pollOpen ? 'Vote now' : pollClosed ? 'View results' : null

  return (
    <div className="poll-page art-deco-border home-landing">
      <header className="poll-page-header">
        <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
        <h1 className="poll-page-title">Welcome, family</h1>
        <p className="poll-page-subtitle">
          Cast your ballot for the live poll or share your favorite reunion moments.
        </p>
      </header>

      <div className="home-landing-grid">
        <article className={`home-landing-card${poll ? '' : ' home-landing-card-muted'}`}>
          <p className="home-landing-card-eyebrow">Family poll</p>
          <h2 className="home-landing-card-title">
            {poll ? poll.title : 'No poll yet'}
          </h2>
          {poll?.description && (
            <p className="home-landing-card-desc">{poll.description}</p>
          )}
          {!poll && (
            <p className="poll-hint home-landing-card-hint">
              The organizer will open voting soon. Check back here.
            </p>
          )}
          {pollOpen && (
            <p className="poll-hint home-landing-card-hint">Voting is open.</p>
          )}
          {pollClosed && !poll.results_revealed && (
            <p className="poll-hint home-landing-card-hint">Voting has closed.</p>
          )}
          {pollClosed && poll.results_revealed && (
            <p className="poll-hint home-landing-card-hint">Winners have been revealed.</p>
          )}
          <PageQRCode path="/polls" linkTo="/polls" label="Scan to open voting" />
          {pollCtaTo ? (
            <Link to={pollCtaTo} className="poll-button poll-button-primary home-landing-card-btn">
              {pollCtaLabel}
            </Link>
          ) : (
            <span className="poll-button poll-button-primary home-landing-card-btn" aria-disabled="true">
              Coming soon
            </span>
          )}
          {pollOpen && (
            <Link to="/results" className="home-landing-card-secondary">
              Peek at live results →
            </Link>
          )}
        </article>

        <article className={`home-landing-card${album ? '' : ' home-landing-card-muted'}`}>
          <p className="home-landing-card-eyebrow">Photo feed</p>
          <h2 className="home-landing-card-title">
            {album ? album.title : 'Share your photos'}
          </h2>
          {album ? (
            <p className="poll-hint home-landing-card-hint">
              {album.status === 'open'
                ? 'Scan to open the photo feed — share moments and tag your table.'
                : 'Uploads are closed — browse what everyone shared.'}
            </p>
          ) : (
            <p className="poll-hint home-landing-card-hint">
              The photo album is being set up. Check back soon.
            </p>
          )}
          <PageQRCode path="/photos/wall" linkTo="/photos/wall" label="Scan to open photo feed" />
          <Link
            to="/photos/wall"
            className="poll-button poll-button-primary home-landing-card-btn"
          >
            Open photo feed
          </Link>
        </article>
      </div>
    </div>
  )
}
