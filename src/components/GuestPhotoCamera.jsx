import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import {
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  captureZoomedVideoFrame,
  clampPan,
} from '../lib/captureZoomedVideo'

function attachStreamToVideo(video, stream) {
  if (!video || !stream) return
  video.srcObject = stream
  void video.play().catch(() => {})
}

function pointerDistance(a, b) {
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.hypot(dx, dy)
}

export default function GuestPhotoCamera({
  open,
  onClose,
  onCapture,
  onOpenDeviceCamera,
  uploading = false,
}) {
  const videoRef = useRef(null)
  const viewportRef = useRef(null)
  const streamRef = useRef(null)
  const pointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const dragRef = useRef(null)

  const [facingMode, setFacingMode] = useState('environment')
  const [cameraError, setCameraError] = useState(null)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [streamReady, setStreamReady] = useState(false)
  const [zoom, setZoom] = useState(CAMERA_MIN_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [capturing, setCapturing] = useState(false)

  useBodyScrollLock(open)

  const resetView = useCallback(() => {
    setZoom(CAMERA_MIN_ZOOM)
    setPan({ x: 0, y: 0 })
    pinchRef.current = null
    dragRef.current = null
    pointersRef.current.clear()
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStreamReady(false)
  }, [])

  const applyPan = useCallback((nextPanX, nextPanY, nextZoom = zoom) => {
    const viewport = viewportRef.current
    if (!viewport) {
      setPan({ x: nextPanX, y: nextPanY })
      return
    }
    const clamped = clampPan(
      nextZoom,
      nextPanX,
      nextPanY,
      viewport.clientWidth,
      viewport.clientHeight
    )
    setPan(clamped)
  }, [zoom])

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false

    resetView()
    setCameraError(null)

    async function startCamera() {
      setCameraLoading(true)
      setStreamReady(false)
      stopStream()

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera preview is not supported here. Use the device camera button below.')
        setCameraLoading(false)
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        setStreamReady(true)
      } catch (err) {
        setCameraError(
          err.message ?? 'Could not access camera. Try the device camera button below.'
        )
      } finally {
        if (!cancelled) setCameraLoading(false)
      }
    }

    startCamera()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [open, facingMode, resetView, stopStream])

  useEffect(() => {
    if (!open || !streamReady) return
    attachStreamToVideo(videoRef.current, streamRef.current)
  }, [open, streamReady, facingMode])

  useEffect(() => {
    if (!open) resetView()
  }, [open, resetView])

  const handlePointerDown = useCallback((event) => {
    if (cameraError || cameraLoading || !streamReady) return
    const viewport = viewportRef.current
    if (!viewport) return

    viewport.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()]
      pinchRef.current = {
        startDistance: pointerDistance(first, second),
        startZoom: zoom,
      }
      dragRef.current = null
      return
    }

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      }
    }
  }, [cameraError, cameraLoading, pan.x, pan.y, streamReady, zoom])

  const handlePointerMove = useCallback((event) => {
    if (!pointersRef.current.has(event.pointerId)) return

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()]
      const distance = pointerDistance(first, second)
      const ratio = distance / pinchRef.current.startDistance
      const nextZoom = Math.min(
        CAMERA_MAX_ZOOM,
        Math.max(CAMERA_MIN_ZOOM, pinchRef.current.startZoom * ratio)
      )
      setZoom(nextZoom)
      applyPan(pan.x, pan.y, nextZoom)
      return
    }

    if (pointersRef.current.size === 1 && dragRef.current && zoom > CAMERA_MIN_ZOOM) {
      const dx = event.clientX - dragRef.current.startX
      const dy = event.clientY - dragRef.current.startY
      applyPan(dragRef.current.startPanX + dx, dragRef.current.startPanY + dy)
    }
  }, [applyPan, pan.x, pan.y, zoom])

  const handlePointerUp = useCallback((event) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) dragRef.current = null

    if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId)
    }
  }, [])

  const handleWheel = useCallback((event) => {
    if (cameraError || cameraLoading || !streamReady) return
    event.preventDefault()

    const delta = event.deltaY > 0 ? -0.12 : 0.12
    const nextZoom = Math.min(CAMERA_MAX_ZOOM, Math.max(CAMERA_MIN_ZOOM, zoom + delta))
    setZoom(nextZoom)
    applyPan(pan.x, pan.y, nextZoom)
  }, [applyPan, cameraError, cameraLoading, pan.x, pan.y, streamReady, zoom])

  const flipCamera = useCallback(() => {
    resetView()
    setFacingMode((value) => (value === 'environment' ? 'user' : 'environment'))
  }, [resetView])

  const handleCapture = useCallback(async () => {
    const video = videoRef.current
    const viewport = viewportRef.current
    if (!video || !viewport || capturing || uploading) return

    if (!video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is still starting. Wait a moment, then try again.')
      return
    }

    setCapturing(true)
    try {
      const blob = await captureZoomedVideoFrame(video, viewport, {
        zoom,
        panX: pan.x,
        panY: pan.y,
        mirror: facingMode === 'user',
      })
      if (blob) {
        stopStream()
        onCapture(blob)
      }
    } finally {
      setCapturing(false)
    }
  }, [capturing, facingMode, onCapture, pan.x, pan.y, stopStream, uploading, zoom])

  if (!open) return null

  const busy = uploading || capturing
  const showViewfinder = !cameraError && !cameraLoading && streamReady

  return createPortal(
    <div
      className="guest-camera"
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
    >
      <div
        ref={viewportRef}
        className="guest-camera-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {showViewfinder && (
          <div
            className="guest-camera-video-layer"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`guest-camera-video${facingMode === 'user' ? ' guest-camera-video-mirror' : ''}`}
            />
          </div>
        )}

        {cameraLoading && (
          <div className="guest-camera-overlay guest-camera-overlay-center">
            <p className="guest-camera-status">Starting camera…</p>
          </div>
        )}

        {cameraError && (
          <div className="guest-camera-overlay guest-camera-overlay-center guest-camera-fallback">
            <p className="guest-camera-error">{cameraError}</p>
            <button
              type="button"
              className="guest-camera-fallback-btn"
              onClick={onOpenDeviceCamera}
              disabled={busy}
            >
              Open device camera
            </button>
          </div>
        )}

        {showViewfinder && zoom > CAMERA_MIN_ZOOM + 0.05 && (
          <div className="guest-camera-zoom-badge" aria-live="polite">
            {zoom.toFixed(1)}×
          </div>
        )}
      </div>

      <div className="guest-camera-top-bar">
        <button
          type="button"
          className="guest-camera-icon-btn"
          onClick={onClose}
          disabled={busy}
          aria-label="Close camera"
        >
          ×
        </button>
      </div>

      <div className="guest-camera-bottom-bar">
        <button
          type="button"
          className="guest-camera-icon-btn guest-camera-side-btn"
          onClick={onOpenDeviceCamera}
          disabled={busy}
          aria-label="Open device camera"
          title="Device camera"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="guest-camera-svg-icon">
            <path
              fill="currentColor"
              d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
            />
          </svg>
        </button>

        <button
          type="button"
          className="guest-camera-shutter"
          onClick={handleCapture}
          disabled={busy || !showViewfinder}
          aria-label="Take photo"
        >
          <span className="guest-camera-shutter-inner" />
        </button>

        <button
          type="button"
          className="guest-camera-icon-btn guest-camera-side-btn"
          onClick={flipCamera}
          disabled={busy || !!cameraError}
          aria-label="Flip camera"
          title="Flip camera"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="guest-camera-svg-icon">
            <path
              fill="currentColor"
              d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 9.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
            />
          </svg>
        </button>
      </div>

      {showViewfinder && zoom === CAMERA_MIN_ZOOM && (
        <p className="guest-camera-hint">Pinch or scroll to zoom · drag when zoomed</p>
      )}
    </div>,
    document.body
  )
}
