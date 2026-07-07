export const MAX_VIDEO_DURATION_SEC = 60

const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

export function isVideoFile(file) {
  return Boolean(file?.type && VIDEO_TYPES.has(file.type))
}

export function extensionForVideoMime(mimeType) {
  switch (mimeType) {
    case 'video/quicktime':
      return 'mov'
    case 'video/webm':
      return 'webm'
    default:
      return 'mp4'
  }
}

function readVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight,
      })
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video'))
    }

    video.src = url
  })
}

export async function validateVideoFile(file) {
  if (!isVideoFile(file)) {
    throw new Error('Unsupported video format. Use MP4, MOV, or WebM.')
  }

  const { duration } = await readVideoMetadata(file)

  if (duration > MAX_VIDEO_DURATION_SEC) {
    throw new Error(`Videos must be ${MAX_VIDEO_DURATION_SEC} seconds or shorter.`)
  }

  if (duration <= 0) {
    throw new Error('Could not read video duration')
  }
}

export function extractVideoPoster(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)

    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    const cleanup = () => URL.revokeObjectURL(url)

    video.onloadeddata = () => {
      const seekTo = Math.min(0.25, Math.max(0, (video.duration || 1) / 2))
      video.currentTime = seekTo
    }

    video.onseeked = () => {
      const maxEdge = 1920
      let width = video.videoWidth
      let height = video.videoHeight

      if (!width || !height) {
        cleanup()
        reject(new Error('Could not read video frame'))
        return
      }

      if (width > height && width > maxEdge) {
        height = Math.round((height * maxEdge) / width)
        width = maxEdge
      } else if (height >= width && height > maxEdge) {
        width = Math.round((width * maxEdge) / height)
        height = maxEdge
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          cleanup()
          if (blob) resolve(blob)
          else reject(new Error('Could not create video poster'))
        },
        'image/jpeg',
        0.88
      )
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Could not read video'))
    }

    video.src = url
  })
}

export async function prepareVideoFile(file) {
  await validateVideoFile(file)
  const posterBlob = await extractVideoPoster(file)
  return {
    mediaType: 'video',
    blob: file,
    posterBlob,
  }
}
