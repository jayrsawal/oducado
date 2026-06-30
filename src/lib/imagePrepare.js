const JPEG_QUALITY = 0.88

function loadImageElement(blob) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(blob)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    image.src = url
  })
}

async function loadImageSource(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' })
    } catch {
      // Fall back to Image for older browsers.
    }
  }
  return loadImageElement(blob)
}

function sourceSize(source) {
  return {
    width: source.width,
    height: source.height,
  }
}

export async function rasterizeImageSource(source, rotationDeg = 0, maxEdge = 1920) {
  const { width: srcW, height: srcH } = sourceSize(source)
  const radians = (rotationDeg * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  const boundW = srcW * cos + srcH * sin
  const boundH = srcW * sin + srcH * cos
  const scale = Math.min(1, maxEdge / Math.max(boundW, boundH))
  const outW = Math.round(boundW * scale)
  const outH = Math.round(boundH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate(radians)
  ctx.drawImage(source, (-srcW * scale) / 2, (-srcH * scale) / 2, srcW * scale, srcH * scale)

  if ('close' in source && typeof source.close === 'function') {
    source.close()
  }

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not process image'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })

  return blob
}

export async function prepareImageBlob(blob, rotationDeg = 0, maxEdge = 1920) {
  const source = await loadImageSource(blob)
  return rasterizeImageSource(source, rotationDeg, maxEdge)
}

export async function prepareImageFile(file, maxEdge = 1920) {
  const source = await loadImageSource(file)
  return rasterizeImageSource(source, 0, maxEdge)
}

export function previewUrlForBlob(blob) {
  return URL.createObjectURL(blob)
}
