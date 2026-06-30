import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import { downloadQrCodePng } from '../lib/qrCodeExport'

function useQrDisplaySize(open) {
  const [size, setSize] = useState(320)

  useEffect(() => {
    if (!open) {
      setSize(320)
      return undefined
    }

    function update() {
      const side = Math.min(window.innerWidth * 0.78, window.innerHeight * 0.52, 560)
      setSize(Math.max(220, Math.round(side)))
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open])

  return size
}

export default function QrCodeLightbox({ qr, onClose }) {
  const open = Boolean(qr)
  const size = useQrDisplaySize(open)
  const [downloading, setDownloading] = useState(null)
  const [error, setError] = useState(null)

  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) {
      setError(null)
      setDownloading(null)
      return undefined
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  async function handleDownload(variant) {
    setDownloading(variant)
    setError(null)
    try {
      await downloadQrCodePng({
        value: qr.value,
        title: qr.title,
        fileName: qr.fileName,
        variant,
      })
    } catch (err) {
      setError(err.message ?? 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  return createPortal(
    <div className="qr-lightbox" role="dialog" aria-modal="true" aria-label={`${qr.title} QR code`}>
      <button
        type="button"
        className="qr-lightbox-backdrop"
        onClick={onClose}
        aria-label="Close QR preview"
      />
      <div className="qr-lightbox-panel">
        <button
          type="button"
          className="qr-lightbox-close"
          onClick={onClose}
          aria-label="Close QR preview"
        >
          ×
        </button>

        <h2 className="qr-lightbox-title">{qr.title}</h2>
        <p className="qr-lightbox-hint">Scan to open the upload portal for this table.</p>

        <div className="qr-lightbox-code-wrap">
          <QRCodeSVG
            value={qr.value}
            size={size}
            bgColor="#0f0f0f"
            fgColor="#d4af37"
            level="M"
          />
        </div>

        {qr.urlLabel && (
          <p className="qr-lightbox-url">
            <a href={qr.value} target="_blank" rel="noreferrer">
              {qr.urlLabel}
            </a>
          </p>
        )}

        {error && <p className="qr-lightbox-error">{error}</p>}

        <div className="qr-lightbox-actions">
          <button
            type="button"
            className="poll-button poll-button-primary"
            onClick={() => handleDownload('color')}
            disabled={!!downloading}
          >
            {downloading === 'color' ? 'Preparing…' : 'Color PNG'}
          </button>
          <button
            type="button"
            className="poll-button poll-button-secondary"
            onClick={() => handleDownload('print')}
            disabled={!!downloading}
          >
            {downloading === 'print' ? 'Preparing…' : 'B&W PNG'}
          </button>
          <button
            type="button"
            className="poll-button poll-button-secondary"
            onClick={onClose}
            disabled={!!downloading}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
