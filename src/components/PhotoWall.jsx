import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import { isMyPhoto } from '../lib/photoOwnership'
import PhotoLightbox, { PhotoWallUploadCtaSlide } from './PhotoWallExtras'
import PhotoWatermark from './PhotoWatermark'

const FADE_MS = 1000
const CTA_SLIDE_ID = '__upload-cta__'

function getFullscreenElement() {
  return document.fullscreenElement ?? document.webkitFullscreenElement ?? null
}

async function requestNodeFullscreen(node) {
  const request =
    node.requestFullscreen?.bind(node) ?? node.webkitRequestFullscreen?.bind(node)
  if (!request) return false
  await request()
  return getFullscreenElement() === node
}

async function exitNodeFullscreen() {
  if (!getFullscreenElement()) return
  const exit =
    document.exitFullscreen?.bind(document) ??
    document.webkitExitFullscreen?.bind(document)
  if (exit) await exit()
}

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
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const isFullscreen = isNativeFullscreen || isExpanded

  useBodyScrollLock(isExpanded)

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
      setIsNativeFullscreen(getFullscreenElement() === containerRef.current)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
    }
  }, [])

  useEffect(() => {
    if (!isExpanded) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') setIsExpanded(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isExpanded])

  const goPrev = useCallback(() => {
    setIndex((value) => (value - 1 + slides.length) % slides.length)
  }, [slides.length])

  const goNext = useCallback(() => {
    setIndex((value) => (value + 1) % slides.length)
  }, [slides.length])

  const toggleFullscreen = useCallback(async () => {
    const node = containerRef.current
    if (!node) return

    const active = isExpanded || getFullscreenElement() === node

    if (active) {
      setIsExpanded(false)
      try {
        await exitNodeFullscreen()
      } catch {
        // Ignore exit errors.
      }
      return
    }

    try {
      const entered = await requestNodeFullscreen(node)
      if (entered) return
    } catch {
      // Fall through to CSS fullscreen (mobile Safari, etc.).
    }

    setIsExpanded(true)
  }, [isExpanded])

  const carousel = (
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
                    createdAt={slide.created_at}
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

  if (isExpanded) {
    return createPortal(carousel, document.body)
  }

  return carousel
}

export function PhotoWallGallery({ photos, deviceId, onDeletePhoto, deleting = false }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [filter, setFilter] = useState('all')

  const ordered = useMemo(
    () => [...photos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [photos]
  )

  const visible = useMemo(() => {
    if (filter !== 'mine') return ordered
    return ordered.filter((photo) => isMyPhoto(photo, deviceId))
  }, [deviceId, filter, ordered])

  const myPhotoCount = useMemo(
    () => ordered.filter((photo) => isMyPhoto(photo, deviceId)).length,
    [deviceId, ordered]
  )

  async function handleDeletePhoto(photo) {
    await onDeletePhoto?.(photo)
    setLightboxPhoto((current) => (current?.id === photo.id ? null : current))
  }

  if (ordered.length === 0) {
    return <p className="poll-hint">No photos yet. Be the first to share a favorite moment!</p>
  }

  return (
    <>
      <div className="photo-gallery-filter" role="tablist" aria-label="Gallery filter">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`photo-gallery-filter-btn${filter === 'all' ? ' photo-gallery-filter-btn-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All photos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'mine'}
          className={`photo-gallery-filter-btn${filter === 'mine' ? ' photo-gallery-filter-btn-active' : ''}`}
          onClick={() => setFilter('mine')}
        >
          My photos{myPhotoCount > 0 ? ` (${myPhotoCount})` : ''}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="poll-hint">
          {filter === 'mine'
            ? "You haven't shared any photos yet. Use Camera or Upload many to get started."
            : 'No photos yet. Be the first to share a favorite moment!'}
        </p>
      ) : (
        <div className="photo-event-grid">
          {visible.map((photo) => (
            <div key={photo.id} className="photo-event-grid-item">
              <button
                type="button"
                className="photo-event-grid-hit"
                onClick={() => setLightboxPhoto(photo)}
                aria-label={`View photo${photo.display_name ? ` from ${photo.display_name}` : ''}`}
              >
                <img src={photo.public_url} alt="" className="photo-event-grid-image" />
              </button>
            </div>
          ))}
        </div>
      )}
      <PhotoLightbox
        photo={lightboxPhoto}
        photos={visible}
        onPhotoChange={setLightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
        onDelete={handleDeletePhoto}
        canDelete={lightboxPhoto ? isMyPhoto(lightboxPhoto, deviceId) : false}
        deleting={deleting}
      />
    </>
  )
}
