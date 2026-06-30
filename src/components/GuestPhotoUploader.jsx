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
  const [uploadProgress, setUploadProgress] = useState(null)
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

  async function uploadPreparedBlob(blob) {
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
  }

  async function saveBlob(blob) {
    if (!canUpload) return

    setUploading(true)
    setPageError(null)
    setCameraError(null)
    try {
      await uploadPreparedBlob(blob)
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

  async function uploadGalleryFiles(files) {
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress({ done: 0, total: files.length })
    setPageError(null)
    setCameraError(null)

    let uploaded = 0
    let limitReached = false

    try {
      for (const file of files) {
        const slotsLeft = maxPhotos - photos.length - uploaded
        if (slotsLeft <= 0) {
          limitReached = true
          break
        }

        const blob = await prepareImageFile(file)
        await uploadPreparedBlob(blob)
        uploaded += 1
        setUploadProgress({ done: uploaded, total: files.length })
        await onPhotosChange()
      }

      if (limitReached && uploaded < files.length) {
        setPageError(
          `Uploaded ${uploaded} photo${uploaded === 1 ? '' : 's'}. ` +
            `${files.length - uploaded} skipped because you reached the ${maxPhotos}-photo limit.`
        )
      }
    } catch (err) {
      const message = err.message ?? 'Upload failed'
      if (uploaded > 0) {
        setPageError(`Uploaded ${uploaded} photo${uploaded === 1 ? '' : 's'}, then failed: ${message}`)
      } else {
        setPageError(message)
      }
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  function handleCameraCapture(blob) {
    openOrientPreview(blob, { closeCameraAfter: true })
  }

  async function handleGalleryChange(event) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    const slotsLeft = maxPhotos - photos.length
    if (slotsLeft <= 0) return

    await uploadGalleryFiles(files.slice(0, slotsLeft))
  }

  async function handleCameraFileChange(event) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    setOpen(false)
    const slotsLeft = maxPhotos - photos.length
    if (slotsLeft <= 0) return

    await uploadGalleryFiles(files.slice(0, slotsLeft))
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
            {' '}Select multiple from your gallery at once.
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
            <span className="guest-photo-action-label">Add photos</span>
          </button>
        </div>
      )}

      <input
        ref={galleryFileRef}
        type="file"
        accept="image/*"
        multiple
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
      {uploading && uploadProgress && (
        <p className="poll-hint guest-photo-upload-progress">
          Uploading {uploadProgress.done} of {uploadProgress.total}…
        </p>
      )}
      {uploading && !open && !orientPreview && !lightboxPhoto && !uploadProgress && (
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
