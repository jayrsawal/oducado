import JSZip from 'jszip'

function isVideoMedia(item) {
  return item?.media_type === 'video'
}

function sanitizeFileName(value) {
  return (
    value
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'photo'
  )
}

function extensionForPhoto(photo) {
  const fromPath = photo.storage_path?.match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromPath) return fromPath.toLowerCase()
  if (isVideoMedia(photo)) return 'mp4'
  return 'jpg'
}

export function downloadFileNameForPhoto(photo) {
  const name = sanitizeFileName(photo.display_name || 'guest')
  const shortId = photo.id.slice(0, 8)
  return `${name}-${shortId}.${extensionForPhoto(photo)}`
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function downloadAlbumMedia(photo) {
  const response = await fetch(photo.public_url)
  if (!response.ok) throw new Error('Could not download file')

  const blob = await response.blob()
  triggerBlobDownload(blob, downloadFileNameForPhoto(photo))
}

export async function downloadAllAlbumMedia(photos, { albumTitle = 'album', onProgress } = {}) {
  if (!photos.length) throw new Error('No photos to export')

  const zip = new JSZip()
  const usedNames = new Set()

  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index]
    const response = await fetch(photo.public_url)
    if (!response.ok) {
      throw new Error(`Could not download ${photo.display_name || 'photo'}`)
    }

    let fileName = downloadFileNameForPhoto(photo)
    if (usedNames.has(fileName)) {
      fileName = `${index + 1}-${fileName}`
    }
    usedNames.add(fileName)

    const blob = await response.blob()
    zip.file(fileName, blob)
    onProgress?.(index + 1, photos.length)
  }

  const archive = await zip.generateAsync({ type: 'blob' })
  const archiveName = `${sanitizeFileName(albumTitle)}-photos.zip`
  triggerBlobDownload(archive, archiveName)
}
