import { useEffect, useState } from 'react'
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

export default function PhotoLightbox({ photo, onClose, onRotate }) {
  useBodyScrollLock(Boolean(photo))

  useEffect(() => {
    if (!photo) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, photo])

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
      <figure className="photo-lightbox-panel">
        <div className="photo-lightbox-image-wrap">
          <img src={photo.public_url} alt="" className="photo-lightbox-image" />
          <PhotoWatermark
            displayName={photo.display_name}
            tableName={photo.table_name}
            createdAt={photo.created_at}
            size="large"
          />
        </div>
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
