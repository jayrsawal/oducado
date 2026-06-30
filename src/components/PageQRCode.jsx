import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

export function appPageUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (typeof window === 'undefined') return normalized
  return `${window.location.origin}${normalized}`
}

export default function PageQRCode({ path, label, linkTo, size = 140 }) {
  const url = appPageUrl(path)
  const qr = (
    <QRCodeSVG value={url} size={size} bgColor="#0f0f0f" fgColor="#d4af37" level="M" />
  )

  return (
    <div className="page-qr">
      <div className="photo-qr-code-wrap page-qr-code-wrap">
        {linkTo ? (
          <Link to={linkTo} className="photo-qr-code-link" aria-label={label}>
            {qr}
          </Link>
        ) : (
          qr
        )}
      </div>
      {label && <p className="page-qr-label">{label}</p>}
    </div>
  )
}
