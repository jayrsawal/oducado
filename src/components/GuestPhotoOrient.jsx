import { createPortal } from 'react-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock'

export default function GuestPhotoOrient({
  preview,
  onClose,
  onRotateLeft,
  onRotateRight,
  onConfirm,
  uploading = false,
  error = null,
}) {
  const open = Boolean(preview)
  useBodyScrollLock(open)

  if (!open) return null

  const confirmLabel = preview.editPhotoId ? 'Save photo' : 'Keep photo'

  return createPortal(
    <div
      className="guest-camera guest-photo-orient"
      role="dialog"
      aria-modal="true"
      aria-label={preview.editPhotoId ? 'Re-orient photo' : 'Review photo'}
    >
      <div className="guest-camera-viewport guest-photo-orient-viewport">
        <div
          className="guest-photo-orient-layer"
          style={{ transform: `rotate(${preview.rotation}deg)` }}
        >
          <img
            src={preview.url}
            alt="Photo preview"
            className="guest-photo-orient-preview"
          />
        </div>

        {error && (
          <p className="guest-photo-orient-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="guest-camera-top-bar">
        <button
          type="button"
          className="guest-camera-icon-btn"
          onClick={onClose}
          disabled={uploading}
          aria-label="Discard photo"
        >
          ×
        </button>
      </div>

      <div className="guest-camera-bottom-bar guest-photo-orient-bottom-bar">
        <button
          type="button"
          className="guest-camera-icon-btn guest-camera-side-btn"
          onClick={onRotateLeft}
          disabled={uploading}
          aria-label="Rotate left"
          title="Rotate left"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="guest-camera-svg-icon">
            <path
              fill="currentColor"
              d="M7.34 6.41 5.93 5 2 8.93l3.93 3.93 1.41-1.41L6.83 10H13a5 5 0 0 1 5 5v2h2v-2a7 7 0 0 0-7-7H6.83l.51-.59zM5 20a7 7 0 0 0 7-7h6.17l-.51.59 1.41 1.41L22 15.07l-3.93-3.93-1.41 1.41L17.17 13H11a5 5 0 0 0-5 5v2H5v-2z"
            />
          </svg>
        </button>

        <button
          type="button"
          className="guest-camera-shutter guest-photo-orient-confirm"
          onClick={onConfirm}
          disabled={uploading}
          aria-label={uploading ? 'Saving photo' : confirmLabel}
        >
          <span className="guest-camera-shutter-inner guest-photo-orient-confirm-inner">
            {uploading ? (
              <span className="guest-photo-orient-saving" aria-hidden="true" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="guest-photo-orient-confirm-icon"
              >
                <path
                  fill="currentColor"
                  d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                />
              </svg>
            )}
          </span>
        </button>

        <button
          type="button"
          className="guest-camera-icon-btn guest-camera-side-btn"
          onClick={onRotateRight}
          disabled={uploading}
          aria-label="Rotate right"
          title="Rotate right"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="guest-camera-svg-icon">
            <path
              fill="currentColor"
              d="M16.66 6.41 18.07 5 22 8.93l-3.93 3.93-1.41-1.41L17.17 10H11a5 5 0 0 0-5 5v2H4v-2a7 7 0 0 1 7-7h6.17l-.51-.59zM19 20a7 7 0 0 1-7-7H5.83l.51.59-1.41 1.41L2 15.07l3.93-3.93 1.41 1.41L6.83 13H13a5 5 0 0 1 5 5v2h1v-2z"
            />
          </svg>
        </button>
      </div>

      <p className="guest-camera-hint">
        {uploading ? 'Saving…' : 'Rotate if needed, then tap ✓ to keep'}
      </p>
    </div>,
    document.body
  )
}
