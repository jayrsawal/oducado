import { useCallback, useEffect, useRef, useState } from 'react'
import GuestPhotoCamera from './GuestPhotoCamera'
import GuestPhotoOrient from './GuestPhotoOrient'
import PhotoLightbox from './PhotoWallExtras'
import {
  deleteGuestPhoto,
  MAX_GUEST_PHOTOS,
  MAX_OPEN_PHOTOS,
  replaceGuestPhotoImage,
  uploadGuestPhoto,
  uploadOpenPhoto,
} from '../lib/guestPhoto'
import { prepareImageBlob, prepareImageFile, previewUrlForBlob } from '../lib/imagePrepare'

export default function GuestPhotoUploader({
  albumId,
  tableId,
  displayName,
  deviceId,
  photos,
  onPhotosChange,
  mode = 'guest',
}) {
  const galleryFileRef = useRef(null)
  const cameraFileRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [orientPreview, setOrientPreview] = useState(null)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [pageError, setPageError] = useState(null)
  const [cameraError, setCameraError] = useState(null)

  const maxPhotos = mode === 'open' ? MAX_OPEN_PHOTOS : MAX_GUEST_PHOTOS
  const remaining = maxPhotos - photos.length
  const canUpload = remaining > 0 && !uploading

  const closeOrientPreview = useCallback(() => {
    setOrientPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
  }, [])

  const openOrientPreview = useCallback(
    (blob, { closeCameraAfter = false, editPhotoId = null } = {}) => {
      closeOrientPreview()
      setOrientPreview({
        blob,
        url: previewUrlForBlob(blob),
        rotation: 0,
        editPhotoId,
      })
      setPageError(null)
      setCameraError(null)
      if (closeCameraAfter) {
        setOpen(false)
      }
    },
    [closeOrientPreview]
  )

  useEffect(() => () => closeOrientPreview(), [closeOrientPreview])

  function openCamera() {
    setPageError(null)
    setCameraError(null)
    setOpen(true)
  }

  function closeCamera() {
    setOpen(false)
    setCameraError(null)
  }

  async function saveBlob(blob) {
    if (!canUpload) return

    setUploading(true)
    setPageError(null)
    setCameraError(null)
    try {
      if (mode === 'open') {
        await uploadOpenPhoto({ albumId, deviceId, blob })
      } else {
        await uploadGuestPhoto({
          albumId,
          tableId,
          displayName,
          deviceId,
          blob,
        })
      }
      await onPhotosChange()
    } catch (err) {
      const message = err.message ?? 'Upload failed'
      if (open || orientPreview) {
        setCameraError(message)
        setPageError(null)
      } else {
        setPageError(message)
      }
      throw err
    } finally {
      setUploading(false)
    }
  }

  function handleCameraCapture(blob) {
    openOrientPreview(blob, { closeCameraAfter: true })
  }

  async function handleGalleryChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const blob = await prepareImageFile(file)
      openOrientPreview(blob)
    } catch (err) {
      setPageError(err.message ?? 'Upload failed')
    }
  }

  async function handleCameraFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const blob = await prepareImageFile(file)
      openOrientPreview(blob, { closeCameraAfter: true })
    } catch (err) {
      setCameraError(err.message ?? 'Upload failed')
    }
  }

  function rotatePreview(delta) {
    setOrientPreview((current) =>
      current
        ? { ...current, rotation: (current.rotation + delta + 360) % 360 }
        : current
    )
  }

  async function confirmOrientPreview() {
    if (!orientPreview) return

    setUploading(true)
    setPageError(null)
    setCameraError(null)
    try {
      if (orientPreview.editPhotoId) {
        if (orientPreview.rotation === 0) {
          closeOrientPreview()
          return
        }
        const blob = await prepareImageBlob(orientPreview.blob, orientPreview.rotation)
        await replaceGuestPhotoImage(orientPreview.editPhotoId, deviceId, blob)
        closeOrientPreview()
        await onPhotosChange()
        return
      }

      const blob =
        orientPreview.rotation === 0
          ? orientPreview.blob
          : await prepareImageBlob(orientPreview.blob, orientPreview.rotation)
      await saveBlob(blob)
      closeOrientPreview()
    } catch (err) {
      const message = err.message ?? 'Could not save photo'
      if (orientPreview) setPageError(message)
    } finally {
      setUploading(false)
    }
  }

  async function startEditPhoto(photo) {
    setLightboxPhoto(null)
    setPageError(null)
    setUploading(true)
    try {
      const response = await fetch(photo.public_url)
      if (!response.ok) throw new Error('Could not load photo')
      const blob = await response.blob()
      openOrientPreview(blob, { editPhotoId: photo.id })
    } catch (err) {
      setPageError(err.message ?? 'Could not load photo')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(photoId) {
    if (!window.confirm('Remove this photo?')) return

    setUploading(true)
    setPageError(null)
    try {
      await deleteGuestPhoto(photoId, deviceId)
      await onPhotosChange()
    } catch (err) {
      setPageError(err.message ?? 'Delete failed')
    } finally {
      setUploading(false)
    }
  }

  const orientModal = (
    <GuestPhotoOrient
      preview={orientPreview}
      onClose={closeOrientPreview}
      onRotateLeft={() => rotatePreview(-90)}
      onRotateRight={() => rotatePreview(90)}
      onConfirm={confirmOrientPreview}
      uploading={uploading}
      error={pageError ?? cameraError}
    />
  )

  return (
    <div className="guest-photo-uploader">
      <div className="guest-photo-uploader-header">
        <p className="guest-photo-uploader-count">
          {photos.length} of {maxPhotos} photos uploaded
        </p>
        {remaining > 0 && (
          <p className="poll-hint">
            You can add {remaining} more favorite photo{remaining === 1 ? '' : 's'}.
          </p>
        )}
      </div>

      {photos.length > 0 && (
        <div className="guest-photo-grid">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="guest-photo-thumb-card guest-photo-thumb-enlargeable"
              onClick={() => setLightboxPhoto(photo)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setLightboxPhoto(photo)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View photo${photo.display_name ? ` from ${photo.display_name}` : ''}`}
            >
              <img src={photo.public_url} alt="" className="guest-photo-thumb-image" />
              <button
                type="button"
                className="guest-photo-thumb-remove"
                onClick={(event) => {
                  event.stopPropagation()
                  handleDelete(photo.id)
                }}
                disabled={uploading}
                aria-label="Remove photo"
              >
                ×
              </button>
            </figure>
          ))}
        </div>
      )}

      {canUpload && (
        <div className="guest-photo-actions">
          <button
            type="button"
            className="guest-photo-action-btn guest-photo-action-btn-primary"
            onClick={openCamera}
            disabled={uploading}
          >
            <span className="guest-photo-action-icon" aria-hidden="true">
              📷
            </span>
            <span className="guest-photo-action-label">Take photo</span>
          </button>
          <button
            type="button"
            className="guest-photo-action-btn"
            onClick={() => galleryFileRef.current?.click()}
            disabled={uploading}
          >
            <span className="guest-photo-action-icon" aria-hidden="true">
              🖼
            </span>
            <span className="guest-photo-action-label">Choose from gallery</span>
          </button>
        </div>
      )}

      <input
        ref={galleryFileRef}
        type="file"
        accept="image/*"
        className="guest-photo-file-input"
        onChange={handleGalleryChange}
      />
      <input
        ref={cameraFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="guest-photo-file-input"
        onChange={handleCameraFileChange}
      />

      {pageError && !orientPreview && <p className="poll-message poll-message-error">{pageError}</p>}
      {uploading && !open && !orientPreview && !lightboxPhoto && (
        <p className="poll-hint">Working…</p>
      )}

      <GuestPhotoCamera
        open={open && !orientPreview}
        onClose={closeCamera}
        onCapture={handleCameraCapture}
        onOpenDeviceCamera={() => cameraFileRef.current?.click()}
        uploading={uploading}
      />
      {orientModal}
      <PhotoLightbox
        photo={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
        onRotate={startEditPhoto}
      />
    </div>
  )
}
