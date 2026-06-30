import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import PageQRCode from './PageQRCode'
import PhotoWatermark from './PhotoWatermark'

function useFullscreenQrSize(fullscreen) {
  const [size, setSize] = useState(168)

  useEffect(() => {
    if (!fullscreen) {
      setSize(168)
      return undefined
    }

    function update() {
      const side = Math.min(window.innerWidth * 0.36, window.innerHeight * 0.3, 280)
      setSize(Math.max(132, Math.round(side)))
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [fullscreen])

  return size
}

export function PhotoWallUploadCtaSlide({ uploadsOpen = true, fullscreen = false }) {
  const qrSize = useFullscreenQrSize(fullscreen)

  return (
    <div className={`photo-wall-cta-slide${fullscreen ? ' photo-wall-cta-slide-fullscreen' : ''}`}>
      <p className="photo-wall-cta-eyebrow">Oducado Family Reunion 2026</p>
      <h2 className="photo-wall-cta-title">Share your favorite moments</h2>
      <p className="photo-wall-cta-desc">
        {uploadsOpen
          ? 'Scan with your phone to take or upload photos — no app needed.'
          : 'Photo uploads are closed, but you can still browse everything shared so far.'}
      </p>
      {uploadsOpen && (
        <>
          <PageQRCode
            path="/photos/upload"
            linkTo="/photos/upload"
            label="Scan to share photos"
            size={qrSize}
          />
          <Link to="/photos" className="photo-wall-cta-link">
            Or find your table to upload →
          </Link>
        </>
      )}
      {!uploadsOpen && (
        <Link to="/photos" className="poll-button poll-button-secondary poll-button-small">
          Browse photo drop box
        </Link>
      )}
    </div>
  )
}

const SWIPE_THRESHOLD_PX = 48

export default function PhotoLightbox({ photo, photos, onPhotoChange, onClose, onRotate }) {
  useBodyScrollLock(Boolean(photo))
  const touchStartX = useRef(null)

  const navigablePhotos = photos?.length ? photos : photo ? [photo] : []
  const currentIndex = photo
    ? navigablePhotos.findIndex((entry) => entry.id === photo.id)
    : -1
  const canNavigate = navigablePhotos.length > 1 && currentIndex >= 0
  const hasPrev = canNavigate && currentIndex > 0
  const hasNext = canNavigate && currentIndex < navigablePhotos.length - 1

  function goToIndex(index) {
    if (!onPhotoChange || index < 0 || index >= navigablePhotos.length) return
    onPhotoChange(navigablePhotos[index])
  }

  function goPrev() {
    if (hasPrev) goToIndex(currentIndex - 1)
  }

  function goNext() {
    if (hasNext) goToIndex(currentIndex + 1)
  }

  useEffect(() => {
    if (!photo) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (!canNavigate) return
      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault()
        onPhotoChange?.(navigablePhotos[currentIndex - 1])
      }
      if (event.key === 'ArrowRight' && currentIndex < navigablePhotos.length - 1) {
        event.preventDefault()
        onPhotoChange?.(navigablePhotos[currentIndex + 1])
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canNavigate, currentIndex, navigablePhotos, onClose, onPhotoChange, photo])

  function handleTouchStart(event) {
    if (!canNavigate) return
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
  }

  function handleTouchEnd(event) {
    if (!canNavigate || touchStartX.current == null) return

    const endX = event.changedTouches[0]?.clientX
    if (endX == null) return

    const delta = endX - touchStartX.current
    touchStartX.current = null

    if (delta <= -SWIPE_THRESHOLD_PX) goNext()
    else if (delta >= SWIPE_THRESHOLD_PX) goPrev()
  }

  if (!photo) return null

  return createPortal(
    <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo preview">
      <button
        type="button"
        className="photo-lightbox-close"
        onClick={onClose}
        aria-label="Close photo preview"
      >
        ×
      </button>
      <button
        type="button"
        className="photo-lightbox-backdrop"
        onClick={onClose}
        aria-label="Close photo preview"
      />
      {hasPrev && (
        <button
          type="button"
          className="photo-lightbox-nav photo-lightbox-nav-prev"
          onClick={goPrev}
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          className="photo-lightbox-nav photo-lightbox-nav-next"
          onClick={goNext}
          aria-label="Next photo"
        >
          ›
        </button>
      )}
      <figure
        className="photo-lightbox-panel"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="photo-lightbox-image-wrap">
          <img src={photo.public_url} alt="" className="photo-lightbox-image" key={photo.id} />
          <PhotoWatermark
            displayName={photo.display_name}
            tableName={photo.table_name}
            createdAt={photo.created_at}
            size="large"
          />
        </div>
        {canNavigate && (
          <figcaption className="photo-lightbox-counter">
            {currentIndex + 1} / {navigablePhotos.length}
          </figcaption>
        )}
      </figure>
      {onRotate && (
        <div className="photo-lightbox-toolbar">
          <button
            type="button"
            className="poll-button poll-button-secondary poll-button-small"
            onClick={() => onRotate(photo)}
          >
            Rotate photo
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}
