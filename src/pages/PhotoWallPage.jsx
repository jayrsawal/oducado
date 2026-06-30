import { useState } from 'react'
import PhotoWallCarousel, { PhotoWallGallery } from '../components/PhotoWall'
import { PhotoWallFeed } from '../components/PhotoWallFeed'
import { useActivePhotoAlbum } from '../hooks/useActivePhotoAlbum'
import { useAlbumPhotos } from '../hooks/useAlbumPhotos'

export default function PhotoWallPage() {
  const { album, loading: albumLoading, error: albumError } = useActivePhotoAlbum({
    includeClosed: true,
  })
  const { photos, loading: photosLoading, error: photosError, reload } = useAlbumPhotos(album?.id)
  const [mode, setMode] = useState('feed')
  const [slideSeconds, setSlideSeconds] = useState(7)

  if (albumLoading || photosLoading) {
    return <p className="poll-loading">Loading photo wall…</p>
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
          <h1 className="poll-page-title">Photo wall</h1>
          <p className="poll-page-subtitle">No photo album is set up yet.</p>
        </header>
      </div>
    )
  }

  return (
    <div className="poll-page art-deco-border poll-page-with-float-nav">
      <header className="poll-page-header poll-page-header-compact">
        <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
        <h1 className="poll-page-title">{album.title}</h1>
        <p className="poll-page-subtitle">Favorite moments shared by our family</p>
      </header>

      <div className="photo-wall-mode-toggle" role="tablist" aria-label="Photo wall view">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'feed'}
          className={`photo-wall-mode-btn${mode === 'feed' ? ' photo-wall-mode-btn-active' : ''}`}
          onClick={() => setMode('feed')}
        >
          Feed
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'gallery'}
          className={`photo-wall-mode-btn${mode === 'gallery' ? ' photo-wall-mode-btn-active' : ''}`}
          onClick={() => setMode('gallery')}
        >
          Gallery
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'carousel'}
          className={`photo-wall-mode-btn${mode === 'carousel' ? ' photo-wall-mode-btn-active' : ''}`}
          onClick={() => setMode('carousel')}
        >
          Carousel
        </button>
      </div>

      {mode === 'carousel' && (
        <div className="photo-wall-carousel-settings">
          <label className="photo-wall-interval-label">
            <span className="photo-wall-interval-text">Seconds per photo</span>
            <input
              type="range"
              className="photo-wall-interval-slider"
              min={5}
              max={10}
              step={1}
              value={slideSeconds}
              onChange={(event) => setSlideSeconds(Number(event.target.value))}
            />
            <span className="photo-wall-interval-value">{slideSeconds}s</span>
          </label>
        </div>
      )}

      {mode === 'carousel' ? (
        <PhotoWallCarousel
          photos={photos}
          intervalSeconds={slideSeconds}
          uploadsOpen={album.status === 'open'}
        />
      ) : mode === 'gallery' ? (
        <PhotoWallGallery photos={photos} />
      ) : (
        <PhotoWallFeed albumId={album.id} photos={photos} onRefresh={reload} />
      )}
    </div>
  )
}
