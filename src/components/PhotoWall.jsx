import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PhotoLightbox, { PhotoWallUploadCtaSlide } from './PhotoWallExtras'
import PhotoWatermark from './PhotoWatermark'
import TablePhotoGallery from './TablePhotoGallery'

const FADE_MS = 1000
const CTA_SLIDE_ID = '__upload-cta__'

function buildSlides(photos) {
  const ordered = [...photos].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )
  return [{ id: CTA_SLIDE_ID, type: 'cta' }, ...ordered]
}

export default function PhotoWallCarousel({
  photos,
  intervalSeconds = 7,
  uploadsOpen = true,
}) {
  const containerRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const slides = useMemo(() => buildSlides(photos), [photos])
  const intervalMs = Math.max(5, Math.min(10, intervalSeconds)) * 1000

  useEffect(() => {
    setIndex(0)
  }, [photos.length])

  useEffect(() => {
    if (slides.length <= 1) return undefined

    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % slides.length)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [slides.length, intervalMs])

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const goPrev = useCallback(() => {
    setIndex((value) => (value - 1 + slides.length) % slides.length)
  }, [slides.length])

  const goNext = useCallback(() => {
    setIndex((value) => (value + 1) % slides.length)
  }, [slides.length])

  const toggleFullscreen = useCallback(async () => {
    const node = containerRef.current
    if (!node) return

    try {
      if (document.fullscreenElement === node) {
        await document.exitFullscreen()
      } else {
        await node.requestFullscreen()
      }
    } catch {
      // Fullscreen may be blocked by the browser.
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`photo-wall-carousel${isFullscreen ? ' photo-wall-carousel-fullscreen' : ''}`}
    >
      <div className="photo-wall-carousel-viewport">
        <div
          className="photo-wall-carousel-fade-stack"
          style={{ '--photo-wall-fade-ms': `${FADE_MS}ms` }}
        >
          {slides.map((slide, slideIndex) => (
            <figure
              key={slide.id}
              className={`photo-wall-carousel-slide${slideIndex === index ? ' is-active' : ''}${
                slide.type === 'cta' ? ' photo-wall-carousel-slide-cta' : ''
              }`}
              aria-hidden={slideIndex !== index}
            >
              {slide.type === 'cta' ? (
                <PhotoWallUploadCtaSlide uploadsOpen={uploadsOpen} fullscreen={isFullscreen} />
              ) : (
                <div className="photo-wall-carousel-image-wrap">
                  <img src={slide.public_url} alt="" className="photo-wall-carousel-image" />
                  <PhotoWatermark
                    displayName={slide.display_name}
                    tableName={slide.table_name}
                  />
                </div>
              )}
            </figure>
          ))}
        </div>
      </div>

      <div className="photo-wall-carousel-controls">
        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="poll-button poll-button-secondary poll-button-small"
              onClick={goPrev}
            >
              ← Prev
            </button>
            <span className="photo-wall-carousel-count">
              {index + 1} / {slides.length}
            </span>
            <button
              type="button"
              className="poll-button poll-button-secondary poll-button-small"
              onClick={goNext}
            >
              Next →
            </button>
          </>
        )}
        <button
          type="button"
          className="poll-button poll-button-secondary poll-button-small"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        </button>
      </div>
    </div>
  )
}

export function PhotoWallGallery({ photos }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  const { tableGroups, openPhotos } = useMemo(() => {
    const map = new Map()

    for (const photo of photos) {
      if (photo.is_open_upload || !photo.table_id) continue

      if (!map.has(photo.table_id)) {
        map.set(photo.table_id, {
          table_id: photo.table_id,
          table_name: photo.table_name ?? 'Table',
          photos: [],
        })
      }
      map.get(photo.table_id).photos.push(photo)
    }

    return {
      tableGroups: [...map.values()].sort((a, b) =>
        a.table_name.localeCompare(b.table_name)
      ),
      openPhotos: photos.filter((photo) => photo.is_open_upload),
    }
  }, [photos])

  if (tableGroups.length === 0 && openPhotos.length === 0) {
    return <p className="poll-hint">No photos yet. Be the first to share a favorite moment!</p>
  }

  return (
    <>
      <div className="photo-wall-gallery">
        {tableGroups.map((group) => (
          <TablePhotoGallery
            key={group.table_id}
            photos={group.photos}
            tableName={group.table_name}
            enlargeable
            onPhotoClick={setLightboxPhoto}
          />
        ))}
        {openPhotos.length > 0 && (
          <TablePhotoGallery
            photos={openPhotos}
            tableName="Quick share"
            showAttribution={false}
            enlargeable
            onPhotoClick={setLightboxPhoto}
          />
        )}
      </div>
      <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </>
  )
}
