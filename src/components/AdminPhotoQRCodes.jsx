import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { appPageUrl } from './PageQRCode'
import { downloadQrCodePng } from '../lib/qrCodeExport'
import QrCodeLightbox from './QrCodeLightbox'

const WALL_PATH = '/photos/wall'
const QR_TITLE = 'Photo feed'

export default function AdminPhotoQRCodes({ albumTitle }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [error, setError] = useState(null)

  const url = appPageUrl(WALL_PATH)
  const displayTitle = albumTitle?.trim() || QR_TITLE

  const lightboxQr = lightboxOpen
    ? {
        title: displayTitle,
        value: url,
        urlLabel: url,
        fileName: 'photo-feed-qr-code.png',
      }
    : null

  async function handleDownload(variant) {
    setDownloading(variant)
    setError(null)
    try {
      await downloadQrCodePng({
        value: url,
        title: displayTitle,
        fileName: 'photo-feed-qr-code',
        variant,
      })
    } catch (err) {
      setError(err.message ?? 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <article className="photo-qr-card photo-qr-card-single">
      <h3 className="photo-qr-title">{displayTitle}</h3>
      <p className="poll-hint photo-qr-card-desc">
        One code for the whole reunion — guests open the feed, share photos, and optionally tag a
        table for story rings.
      </p>

      <button
        type="button"
        className="photo-qr-code-wrap photo-qr-code-button"
        onClick={() => setLightboxOpen(true)}
        aria-label="Maximize photo feed QR code"
      >
        <QRCodeSVG value={url} size={220} bgColor="#0f0f0f" fgColor="#d4af37" level="M" />
      </button>

      <div className="photo-qr-admin-actions">
        <button
          type="button"
          className="poll-button poll-button-secondary poll-button-small"
          onClick={() => setLightboxOpen(true)}
        >
          Maximize
        </button>
        <button
          type="button"
          className="poll-button poll-button-secondary poll-button-small"
          onClick={() => handleDownload('color')}
          disabled={!!downloading}
        >
          {downloading === 'color' ? 'Preparing…' : 'Color PNG'}
        </button>
        <button
          type="button"
          className="poll-button poll-button-secondary poll-button-small"
          onClick={() => handleDownload('print')}
          disabled={!!downloading}
        >
          {downloading === 'print' ? 'Preparing…' : 'B&W PNG'}
        </button>
        <button
          type="button"
          className="poll-button poll-button-secondary poll-button-small"
          onClick={() => navigator.clipboard?.writeText(url)}
        >
          Copy link
        </button>
      </div>

      <p className="photo-qr-url">
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </p>

      {error && <p className="poll-message poll-message-error photo-qr-inline-error">{error}</p>}

      <QrCodeLightbox qr={lightboxQr} onClose={() => setLightboxOpen(false)} />
    </article>
  )
}
