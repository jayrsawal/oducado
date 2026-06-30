import { useEffect, useRef, useState } from 'react'
import { removeOptionPhoto, uploadOptionPhoto } from '../lib/optionPhoto'

export default function OptionPhotoCapture({
  pollId,
  optionId,
  optionLabel,
  imageUrl,
  onPhotoChange,
}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false

    async function startCamera() {
      setError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        setError(err.message ?? 'Could not access camera')
      }
    }

    startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [open, facingMode])

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setOpen(false)
    setError(null)
  }

  async function saveBlob(blob) {
    setUploading(true)
    setError(null)
    try {
      const url = await uploadOptionPhoto(pollId, optionId, blob)
      onPhotoChange(optionId, url)
      closeCamera()
    } catch (err) {
      setError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function captureFromCamera() {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.88)
    )
    if (blob) await saveBlob(blob)
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    await saveBlob(file)
  }

  async function handleRemove() {
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

      {open && (
        <div className="option-photo-modal-backdrop" onClick={closeCamera}>
          <div
            className="option-photo-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="option-photo-modal-title">{optionLabel}</h3>

            {error ? (
              <p className="poll-message poll-message-error">{error}</p>
            ) : (
              <video
                ref={videoRef}
                className="option-photo-video"
                autoPlay
                playsInline
                muted
              />
            )}

            <div className="option-photo-modal-actions">
              <button
                type="button"
                className="poll-button poll-button-secondary poll-button-small"
                onClick={() =>
                  setFacingMode((mode) =>
                    mode === 'environment' ? 'user' : 'environment'
                  )
                }
              >
                Flip camera
              </button>
              <button
                type="button"
                className="poll-button poll-button-secondary poll-button-small"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                Upload file
              </button>
              <button
                type="button"
                className="poll-button poll-button-primary"
                onClick={captureFromCamera}
                disabled={uploading || !!error}
              >
                {uploading ? 'Saving…' : 'Capture'}
              </button>
              <button
                type="button"
                className="poll-button poll-button-secondary poll-button-small"
                onClick={closeCamera}
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
