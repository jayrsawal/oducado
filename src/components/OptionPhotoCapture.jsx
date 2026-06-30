import { useCallback, useEffect, useRef, useState } from 'react'
import GuestPhotoCamera from './GuestPhotoCamera'
import GuestPhotoOrient from './GuestPhotoOrient'
import { prepareImageBlob, prepareImageFile, previewUrlForBlob } from '../lib/imagePrepare'
import { removeOptionPhoto, uploadOptionPhoto } from '../lib/optionPhoto'

export default function OptionPhotoCapture({
  pollId,
  optionId,
  optionLabel,
  imageUrl,
  onPhotoChange,
  tilePreview = false,
}) {
  const fileRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [orientPreview, setOrientPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const closeOrientPreview = useCallback(() => {
    setOrientPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
  }, [])

  const openOrientPreview = useCallback(
    (blob, { closeCameraAfter = false } = {}) => {
      closeOrientPreview()
      setOrientPreview({
        blob,
        url: previewUrlForBlob(blob),
        rotation: 0,
      })
      setError(null)
      if (closeCameraAfter) {
        setOpen(false)
      }
    },
    [closeOrientPreview]
  )

  useEffect(() => () => closeOrientPreview(), [closeOrientPreview])

  function closeCamera() {
    setOpen(false)
    setError(null)
  }

  async function uploadPreparedBlob(blob) {
    const url = await uploadOptionPhoto(pollId, optionId, blob)
    onPhotoChange(optionId, url)
    closeOrientPreview()
    closeCamera()
  }

  function handleCameraCapture(blob) {
    openOrientPreview(blob, { closeCameraAfter: true })
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const blob = await prepareImageFile(file)
      openOrientPreview(blob, { closeCameraAfter: true })
    } catch (err) {
      setError(err.message ?? 'Upload failed')
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
    setError(null)
    try {
      const blob =
        orientPreview.rotation === 0
          ? orientPreview.blob
          : await prepareImageBlob(orientPreview.blob, orientPreview.rotation)
      await uploadPreparedBlob(blob)
    } catch (err) {
      setError(err.message ?? 'Could not save photo')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(event) {
    event.stopPropagation()
    if (!confirm(`Remove photo for "${optionLabel}"?`)) return
    setUploading(true)
    setError(null)
    try {
      await removeOptionPhoto(pollId, optionId)
      onPhotoChange(optionId, null)
    } catch (err) {
      setError(err.message ?? 'Remove failed')
    } finally {
      setUploading(false)
    }
  }

  const camera = (
    <GuestPhotoCamera
      open={open && !orientPreview}
      onClose={closeCamera}
      onCapture={handleCameraCapture}
      onOpenDeviceCamera={() => fileRef.current?.click()}
      uploading={uploading}
    />
  )

  const orient = (
    <GuestPhotoOrient
      preview={orientPreview}
      onClose={closeOrientPreview}
      onRotateLeft={() => rotatePreview(-90)}
      onRotateRight={() => rotatePreview(90)}
      onConfirm={confirmOrientPreview}
      uploading={uploading}
      error={error}
    />
  )

  if (tilePreview) {
    return (
      <div className="option-photo option-photo-tile">
        <button
          type="button"
          className="option-photo-tile-hit"
          onClick={() => setOpen(true)}
          disabled={uploading}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={optionLabel} className="option-photo-tile-image" />
          ) : (
            <span className="option-photo-tile-empty">Tap to add photo</span>
          )}
        </button>
        <div className="option-photo-tile-actions">
          <button
            type="button"
            className="poll-button poll-button-secondary poll-button-small"
            disabled={uploading}
            onClick={() => setOpen(true)}
          >
            {imageUrl ? 'Retake' : 'Take photo'}
          </button>
          {imageUrl && (
            <button
              type="button"
              className="poll-button poll-button-danger poll-button-small"
              disabled={uploading}
              onClick={handleRemove}
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="option-photo-file-input"
          onChange={handleFileChange}
        />
        {error && !orientPreview && (
          <p className="poll-message poll-message-error">{error}</p>
        )}
        {camera}
        {orient}
      </div>
    )
  }

  return (
    <div className="option-photo">
      <div className="option-photo-preview">
        {imageUrl ? (
          <img src={imageUrl} alt={optionLabel} className="option-photo-thumb" />
        ) : (
          <div className="option-photo-placeholder">No photo</div>
        )}
      </div>

      <div className="option-photo-actions">
        <button
          type="button"
          className="poll-button poll-button-secondary poll-button-small"
          disabled={uploading}
          onClick={() => setOpen(true)}
        >
          {imageUrl ? 'Retake' : 'Take photo'}
        </button>
        {imageUrl && (
          <button
            type="button"
            className="poll-button poll-button-danger poll-button-small"
            disabled={uploading}
            onClick={handleRemove}
          >
            Remove
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="option-photo-file-input"
        onChange={handleFileChange}
      />
      {error && !orientPreview && <p className="poll-message poll-message-error">{error}</p>}
      {camera}
      {orient}
    </div>
  )
}
