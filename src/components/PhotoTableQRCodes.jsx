import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { downloadQrCodePng } from '../lib/qrCodeExport'
import QrCodeLightbox from './QrCodeLightbox'

export function tablePhotoUrl(tableId) {
  if (typeof window === 'undefined') return `/photos/table/${tableId}`
  return `${window.location.origin}/photos/table/${tableId}`
}

function qrFileName(tableName) {
  const base = tableName
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return `${base || 'table'}-qr-code.png`
}

function AdminQrCard({ table, url }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  const lightboxQr = lightboxOpen
    ? {
        title: table.name,
        value: url,
        urlLabel: url,
        fileName: qrFileName(table.name),
      }
    : null

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    try {
      await downloadQrCodePng({
        value: url,
        title: table.name,
        fileName: qrFileName(table.name),
      })
    } catch (err) {
      setError(err.message ?? 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article className="photo-qr-card">
      <h3 className="photo-qr-title">{table.name}</h3>
      <button
        type="button"
        className="photo-qr-code-wrap photo-qr-code-button"
        onClick={() => setLightboxOpen(true)}
        aria-label={`Maximize QR code for ${table.name}`}
      >
        <QRCodeSVG value={url} size={180} bgColor="#0f0f0f" fgColor="#d4af37" level="M" />
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
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Preparing…' : 'Download PNG'}
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

export default function PhotoTableQRCodes({ tables, variant = 'guest' }) {
  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => a.name.localeCompare(b.name)),
    [tables]
  )

  if (sortedTables.length === 0) {
    return (
      <p className="poll-hint">
        {variant === 'admin'
          ? 'Add seating tables on the Roster tab first, then share a QR code with each table.'
          : 'Table QR codes will appear here once the organizer sets them up.'}
      </p>
    )
  }

  return (
    <div className="photo-qr-grid">
      {sortedTables.map((table) => {
        const url = tablePhotoUrl(table.id)
        const uploadPath = `/photos/table/${table.id}`

        if (variant === 'admin') {
          return <AdminQrCard key={table.id} table={table} url={url} />
        }

        return (
          <article key={table.id} className="photo-qr-card">
            <h3 className="photo-qr-title">{table.name}</h3>
            <div className="photo-qr-code-wrap">
              <Link to={uploadPath} className="photo-qr-code-link" aria-label={`Open upload portal for ${table.name}`}>
                <QRCodeSVG value={url} size={180} bgColor="#0f0f0f" fgColor="#d4af37" level="M" />
              </Link>
            </div>
            <Link to={uploadPath} className="poll-button poll-button-secondary poll-button-small">
              Open upload portal
            </Link>
          </article>
        )
      })}
    </div>
  )
}
