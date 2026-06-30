import { Link } from 'react-router-dom'
import GuestPhotoUploader from '../components/GuestPhotoUploader'
import { useAlbumOpenPhotos } from '../hooks/useAlbumPhotos'
import { useActivePhotoAlbum } from '../hooks/useActivePhotoAlbum'
import { getDeviceId } from '../lib/deviceId'

export default function OpenPhotoUploadPage() {
  const deviceId = getDeviceId()
  const { album, loading: albumLoading, error: albumError } = useActivePhotoAlbum({
    includeClosed: true,
  })
  const albumId = album?.id
  const { photos, loading: photosLoading, error: photosError, reload } =
    useAlbumOpenPhotos(albumId, deviceId)

  if (albumLoading || photosLoading) {
    return <p className="poll-loading">Loading photo upload…</p>
  }

  if (albumError || photosError) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <p className="poll-message poll-message-error">{albumError ?? photosError}</p>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <header className="poll-page-header">
          <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
          <h1 className="poll-page-title">Share a photo</h1>
          <p className="poll-page-subtitle">The photo album is not set up yet. Check back soon!</p>
        </header>
      </div>
    )
  }

  if (album.status !== 'open') {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <header className="poll-page-header poll-page-header-compact">
          <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
          <h1 className="poll-page-title">{album.title}</h1>
          <p className="poll-page-subtitle">Photo uploads are closed right now.</p>
        </header>
        <p className="poll-page-footer-link">
          <Link to="/photos/wall">View the photo wall →</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="poll-page art-deco-border poll-page-with-float-nav">
      <header className="poll-page-header poll-page-header-compact">
        <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
        <h1 className="poll-page-title">Share a moment</h1>
        <p className="poll-page-subtitle">{album.title}</p>
        <p className="poll-hint">
          No table or name needed — upload reunion photos for everyone to enjoy.
        </p>
      </header>

      <GuestPhotoUploader
        mode="open"
        albumId={album.id}
        deviceId={deviceId}
        photos={photos}
        onPhotosChange={reload}
      />

      <p className="poll-page-footer-link">
        <Link to="/photos">Table uploads</Link>
        {' · '}
        <Link to="/photos/wall">View photo wall →</Link>
      </p>
    </div>
  )
}
