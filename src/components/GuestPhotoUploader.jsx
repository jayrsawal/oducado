import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GuestPhotoCamera from './GuestPhotoCamera'
import GuestPhotoOrient from './GuestPhotoOrient'
import PhotoTableAssignPrompt from './PhotoTableAssignPrompt'
import PhotoLightbox from './PhotoWallExtras'
import {
  deleteGuestPhoto,
  MAX_DEVICE_PHOTOS,
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
  allPhotos = [],
  onPhotosChange,
  mode = 'guest',
  maxPhotos: maxPhotosProp,
  uploadLimit = MAX_DEVICE_PHOTOS,
  compact = false,
  headless = false,
  singleGalleryPick = false,
  orientGalleryPicks = false,
  tableAssignOptions = [],
  rosterTableIds = [],
  onExposeActions,
  galleryPreviewUrl = null,
}) {
  const galleryFileRef = useRef(null)
  const bulkGalleryFileRef = useRef(null)
  const cameraFileRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [orientPreview, setOrientPreview] = useState(null)
  const [pendingUpload, setPendingUpload] = useState(null)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [pageError, setPageError] = useState(null)
  const [cameraError, setCameraError] = useState(null)

  const useOrientForGallery = orientGalleryPicks || singleGalleryPick

  const devicePhotoCount = useMemo(() => {
    const source = allPhotos.length > 0 ? allPhotos : photos
    return source.filter((photo) => photo.device_id === deviceId).length
  }, [allPhotos, deviceId, photos])

  const maxPhotos = useMemo(() => {
    if (maxPhotosProp != null) return maxPhotosProp
    return uploadLimit
  }, [maxPhotosProp, uploadLimit])

  const uploadedCount = useMemo(() => {
    if (mode === 'guest') return photos.length
    return devicePhotoCount
  }, [devicePhotoCount, mode, photos.length])

  const remaining = maxPhotos - uploadedCount
  const canUpload =
    remaining > 0 &&
    !uploading &&
    !pendingUpload &&
    (mode !== 'open' || Boolean(displayName?.trim()))

  const closeOrientPreview = useCallback(() => {
    setOrientPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
  }, [])

  const clearPendingUpload = useCallback(() => {
    setPendingUpload((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
    setPageError(null)
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

  useEffect(
    () => () => {
      closeOrientPreview()
      clearPendingUpload()
    },
    [clearPendingUpload, closeOrientPreview]
  )

  const openCamera = useCallback(() => {
    if (!canUpload) return
    setPageError(null)
    setCameraError(null)
    setOpen(true)
  }, [canUpload])

  const openGallery = useCallback(() => {
    if (!canUpload) return
    galleryFileRef.current?.click()
  }, [canUpload])

  const openBulkGallery = useCallback(() => {
    if (!canUpload) return
    bulkGalleryFileRef.current?.click()
  }, [canUpload])

  useEffect(() => {
    onExposeActions?.({
      openCamera,
      openGallery,
      openBulkGallery,
      canUpload,
      uploading,
      uploadProgress,
      error: pageError,
    })
  }, [
    canUpload,
    onExposeActions,
    openBulkGallery,
    openCamera,
    openGallery,
    pageError,
    uploadProgress,
    uploading,
  ])

  function closeCamera() {
    setOpen(false)
    setCameraError(null)
  }

  async function uploadPreparedBlob(blob, assignTableId = null) {
    if (mode === 'open') {
      const name = displayName?.trim()
      if (!name) throw new Error('Your name is required before uploading')

      await uploadOpenPhoto({
        albumId,
        deviceId,
        displayName: name,
        blob,
        tableId: assignTableId,
      })
      return
    }

    await uploadGuestPhoto({
      albumId,
      tableId,
      displayName,
      deviceId,
      blob,
    })
  }

  async function saveBlob(blob, assignTableId = null) {
    if (!canUpload && !pendingUpload) return

    setUploading(true)
    setPageError(null)
    setCameraError(null)
    try {
      await uploadPreparedBlob(blob, assignTableId)
      await onPhotosChange()
    } catch (err) {
      const message = err.message ?? 'Upload failed'
      if (open || orientPreview || pendingUpload) {
        setPageError(message)
        setCameraError(null)
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
        const slotsLeft = maxPhotos - uploadedCount - uploaded
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

    const slotsLeft = maxPhotos - uploadedCount
    if (slotsLeft <= 0) return

    if (useOrientForGallery) {
      const blob = await prepareImageFile(files[0])
      openOrientPreview(blob, { closeCameraAfter: open })
      return
    }

    await uploadGalleryFiles(files.slice(0, slotsLeft))
  }

  async function handleBulkGalleryChange(event) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    const slotsLeft = maxPhotos - uploadedCount
    if (slotsLeft <= 0) return

    await uploadGalleryFiles(files.slice(0, slotsLeft))
  }

  const galleryAcceptMultiple = !singleGalleryPick && !compact && !useOrientForGallery

  async function handleCameraFileChange(event) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    setOpen(false)
    const slotsLeft = maxPhotos - uploadedCount
    if (slotsLeft <= 0) return

    if (useOrientForGallery) {
      const blob = await prepareImageFile(files[0])
      openOrientPreview(blob)
      return
    }

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

    setPageError(null)
    setCameraError(null)
    try {
      if (orientPreview.editPhotoId) {
        setUploading(true)
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

      if (mode === 'open' && tableAssignOptions.length > 0) {
        closeOrientPreview()
        setPendingUpload({
          blob,
          url: previewUrlForBlob(blob),
        })
        return
      }

      setUploading(true)
      await saveBlob(blob)
      closeOrientPreview()
    } catch (err) {
      const message = err.message ?? 'Could not save photo'
      setPageError(message)
    } finally {
      setUploading(false)
    }
  }

  async function handleTableAssign(assignTableId) {
    if (!pendingUpload) return

    setUploading(true)
    setPageError(null)
    try {
      await uploadPreparedBlob(pendingUpload.blob, assignTableId)
      await onPhotosChange()
      clearPendingUpload()
    } catch (err) {
      setPageError(err.message ?? 'Upload failed')
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

  const tableAssignModal = pendingUpload && (
    <PhotoTableAssignPrompt
      previewUrl={pendingUpload.url}
      tables={tableAssignOptions}
      rosterTableIds={rosterTableIds}
      onAssign={handleTableAssign}
      onClose={clearPendingUpload}
      uploading={uploading}
      error={pageError}
    />
  )

  const showChrome = !headless

  return (
    <div className={`guest-photo-uploader${compact ? ' guest-photo-uploader-compact' : ''}${headless ? ' guest-photo-uploader-headless' : ''}`}>
      {showChrome && (
        <div className="guest-photo-uploader-header">
          <p className="guest-photo-uploader-count">
            {uploadedCount} of {maxPhotos} photos uploaded
          </p>
          {remaining > 0 && (
            <p className="poll-hint">
              You can add {remaining} more favorite photo{remaining === 1 ? '' : 's'}.
              {galleryAcceptMultiple && ' Select multiple from your gallery at once.'}
            </p>
          )}
        </div>
      )}

      {showChrome && photos.length > 0 && (
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

      {showChrome && canUpload && (
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
            <span className="guest-photo-action-label">
              {compact ? 'Camera' : 'Take photo'}
            </span>
          </button>
          <button
            type="button"
            className="guest-photo-action-btn"
            onClick={openGallery}
            disabled={uploading}
          >
            <span className="guest-photo-action-icon" aria-hidden="true">
              🖼
            </span>
            <span className="guest-photo-action-label">
              {compact ? 'Upload' : 'Add photos'}
            </span>
          </button>
        </div>
      )}

      {showChrome && compact && remaining <= 0 && (
        <p className="poll-hint guest-photo-uploader-compact-limit">
          You&apos;ve reached the {maxPhotos}-photo limit on this device.
        </p>
      )}

      <input
        ref={galleryFileRef}
        type="file"
        accept="image/*"
        multiple={galleryAcceptMultiple}
        className="guest-photo-file-input"
        onChange={handleGalleryChange}
      />
      <input
        ref={bulkGalleryFileRef}
        type="file"
        accept="image/*"
        multiple
        className="guest-photo-file-input"
        onChange={handleBulkGalleryChange}
      />
      <input
        ref={cameraFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="guest-photo-file-input"
        onChange={handleCameraFileChange}
      />

      {showChrome && pageError && !orientPreview && !pendingUpload && (
        <p className="poll-message poll-message-error">{pageError}</p>
      )}
      {showChrome && uploading && uploadProgress && (
        <p className="poll-hint guest-photo-upload-progress">
          Uploading {uploadProgress.done} of {uploadProgress.total}…
        </p>
      )}
      {showChrome && uploading && !open && !orientPreview && !lightboxPhoto && !uploadProgress && !pendingUpload && (
        <p className="poll-hint">Working…</p>
      )}

      <GuestPhotoCamera
        open={open && !orientPreview && !pendingUpload}
        onClose={closeCamera}
        onCapture={handleCameraCapture}
        onOpenGallery={openGallery}
        onOpenDeviceCamera={() => cameraFileRef.current?.click()}
        uploading={uploading}
        galleryPreviewUrl={galleryPreviewUrl}
      />
      {orientModal}
      {tableAssignModal}
      {!headless && (
        <PhotoLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onRotate={startEditPhoto}
        />
      )}
    </div>
  )
}
