import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { QRCodeCanvas } from 'qrcode.react'

const QR_THEMES = {
  color: {
    bgColor: '#0f0f0f',
    fgColor: '#d4af37',
    canvasBg: '#0f0f0f',
    titleColor: '#d4af37',
    fileSuffix: '',
  },
  print: {
    bgColor: '#ffffff',
    fgColor: '#000000',
    canvasBg: '#ffffff',
    titleColor: '#000000',
    fileSuffix: '-bw',
  },
}

function sanitizeFileName(title) {
  const base = title
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return `${base || 'qr-code'}.png`
}

function resolveFileName(fileName, title, variant) {
  const base = (fileName ?? sanitizeFileName(title ?? 'qr-code')).replace(/\.png$/i, '')
  return `${base}${QR_THEMES[variant].fileSuffix}.png`
}

export async function downloadQrCodePng({
  value,
  title,
  fileName,
  size = 1200,
  variant = 'color',
}) {
  const theme = QR_THEMES[variant] ?? QR_THEMES.color

  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-9999px'
  host.style.top = '0'
  document.body.appendChild(host)

  const root = createRoot(host)
  root.render(
    createElement(QRCodeCanvas, {
      value,
      size,
      bgColor: theme.bgColor,
      fgColor: theme.fgColor,
      level: 'M',
    })
  )

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })

  const qrCanvas = host.querySelector('canvas')
  if (!qrCanvas) {
    root.unmount()
    host.remove()
    throw new Error('Could not render QR code')
  }

  const padding = 56
  const titleHeight = title ? 80 : 0
  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = size + padding * 2
  exportCanvas.height = size + padding * 2 + titleHeight

  const ctx = exportCanvas.getContext('2d')
  ctx.fillStyle = theme.canvasBg
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
  ctx.drawImage(qrCanvas, padding, padding, size, size)

  if (title) {
    ctx.fillStyle = theme.titleColor
    ctx.font = '600 52px Cinzel, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, exportCanvas.width / 2, size + padding * 2 + titleHeight / 2)
  }

  const blob = await new Promise((resolve, reject) => {
    exportCanvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not export QR code'))),
      'image/png',
      1
    )
  })

  root.unmount()
  host.remove()

  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  link.download = resolveFileName(fileName, title, variant)
  link.click()
  URL.revokeObjectURL(objectUrl)
}
