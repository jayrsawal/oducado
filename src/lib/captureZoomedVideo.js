export const CAMERA_MIN_ZOOM = 1
export const CAMERA_MAX_ZOOM = 4

export function clampPan(zoom, panX, panY, viewportWidth, viewportHeight) {
  const maxPanX = Math.max(0, ((zoom - 1) * viewportWidth) / 2)
  const maxPanY = Math.max(0, ((zoom - 1) * viewportHeight) / 2)
  return {
    x: Math.min(maxPanX, Math.max(-maxPanX, panX)),
    y: Math.min(maxPanY, Math.max(-maxPanY, panY)),
  }
}

export function captureZoomedVideoFrame(video, viewport, { zoom, panX, panY, mirror = false }) {
  const vw = viewport.clientWidth
  const vh = viewport.clientHeight
  if (!vw || !vh || !video.videoWidth || !video.videoHeight) return null

  const dpr = window.devicePixelRatio || 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(vw * dpr)
  canvas.height = Math.round(vh * dpr)

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const videoW = video.videoWidth
  const videoH = video.videoHeight
  const coverScale = Math.max(vw / videoW, vh / videoH)
  const dw = videoW * coverScale
  const dh = videoH * coverScale
  const dx = (vw - dw) / 2
  const dy = (vh - dh) / 2

  ctx.save()
  if (mirror) {
    ctx.translate(vw, 0)
    ctx.scale(-1, 1)
  }
  ctx.translate(vw / 2 + panX, vh / 2 + panY)
  ctx.scale(zoom, zoom)
  ctx.translate(-vw / 2, -vh / 2)
  ctx.drawImage(video, dx, dy, dw, dh)
  ctx.restore()

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
}
