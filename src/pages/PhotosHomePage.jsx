import { Link } from 'react-router-dom'
import PageQRCode from '../components/PageQRCode'
import PhotoTableQRCodes from '../components/PhotoTableQRCodes'
import { useActivePhotoAlbum } from '../hooks/useActivePhotoAlbum'
import { useAlbumRoster } from '../hooks/useAlbumRoster'

export default function PhotosHomePage() {
  const { album, loading: albumLoading, error: albumError } = useActivePhotoAlbum({
    includeClosed: true,
  })
  const { tables, loading: rosterLoading, error: rosterError } = useAlbumRoster(album?.id)

  if (albumLoading || rosterLoading) {
    return <p className="poll-loading">Loading photo drop box…</p>
  }

  if (albumError || rosterError) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <p className="poll-message poll-message-error">{albumError ?? rosterError}</p>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <header className="poll-page-header">
          <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
          <h1 className="poll-page-title">Photo drop box</h1>
          <p className="poll-page-subtitle">The photo album is not set up yet. Check back soon!</p>
        </header>
      </div>
    )
  }

  return (
    <div className="poll-page art-deco-border poll-page-with-float-nav">
      <header className="poll-page-header poll-page-header-compact">
        <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
        <h1 className="poll-page-title">Photo drop box</h1>
        <p className="poll-page-subtitle">{album.title}</p>
      </header>

      <section className="photo-home-actions">
        <Link to="/photos/upload" className="poll-button poll-button-primary photo-home-wall-btn">
          Share a photo
        </Link>
        <Link to="/photos/wall" className="poll-button poll-button-secondary photo-home-wall-btn">
          View photo wall
        </Link>
        {album.status !== 'open' && (
          <p className="poll-hint photo-home-status-hint">
            Photo uploads are closed right now. You can still browse the wall.
          </p>
        )}
      </section>

      <section className="photo-home-open-upload">
        <h2 className="photo-home-section-title">Quick share</h2>
        <p className="poll-hint photo-home-section-hint">
          No table or name needed — scan this code to upload reunion photos from your phone.
        </p>
        <PageQRCode path="/photos/upload" linkTo="/photos/upload" label="Open upload portal" />
      </section>

      <section className="photo-home-tables">
        <h2 className="photo-home-section-title">Find your table</h2>
        <p className="poll-hint photo-home-section-hint">
          Scan your table&apos;s QR code or tap a card below to upload up to 10 favorite photos.
        </p>
        <PhotoTableQRCodes tables={tables} variant="guest" />
      </section>
    </div>
  )
}
