function formatPhotoTimestamp(value) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function PhotoWatermark({
  displayName,
  tableName,
  createdAt,
  className = '',
  size = 'default',
}) {
  const timestamp = formatPhotoTimestamp(createdAt)

  if (!displayName && !tableName && !timestamp) return null

  return (
    <figcaption
      className={`photo-watermark photo-watermark-${size}${className ? ` ${className}` : ''}`}
    >
      {displayName && <span className="photo-watermark-name">{displayName}</span>}
      {tableName && <span className="photo-watermark-table">{tableName}</span>}
      {timestamp && <time className="photo-watermark-time" dateTime={createdAt}>{timestamp}</time>}
    </figcaption>
  )
}
