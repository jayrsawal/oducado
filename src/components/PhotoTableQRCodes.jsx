import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

export function tablePhotoUrl(tableId) {
  if (typeof window === 'undefined') return `/photos/table/${tableId}`
  return `${window.location.origin}/photos/table/${tableId}`
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

        return (
          <article key={table.id} className="photo-qr-card">
            <h3 className="photo-qr-title">{table.name}</h3>
            <div className="photo-qr-code-wrap">
              {variant === 'guest' ? (
                <Link to={uploadPath} className="photo-qr-code-link" aria-label={`Open upload portal for ${table.name}`}>
                  <QRCodeSVG value={url} size={180} bgColor="#0f0f0f" fgColor="#d4af37" level="M" />
                </Link>
              ) : (
                <QRCodeSVG value={url} size={180} bgColor="#0f0f0f" fgColor="#d4af37" level="M" />
              )}
            </div>
            {variant === 'guest' ? (
              <Link to={uploadPath} className="poll-button poll-button-secondary poll-button-small">
                Open upload portal
              </Link>
            ) : (
              <>
                <p className="photo-qr-url">
                  <a href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                </p>
                <button
                  type="button"
                  className="poll-button poll-button-secondary poll-button-small"
                  onClick={() => navigator.clipboard?.writeText(url)}
                >
                  Copy link
                </button>
              </>
            )}
          </article>
        )
      })}
    </div>
  )
}
