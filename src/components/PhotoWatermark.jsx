export default function PhotoWatermark({
  displayName,
  tableName,
  className = '',
  size = 'default',
}) {
  if (!displayName && !tableName) return null

  return (
    <figcaption
      className={`photo-watermark photo-watermark-${size}${className ? ` ${className}` : ''}`}
    >
      {displayName && <span className="photo-watermark-name">{displayName}</span>}
      {tableName && <span className="photo-watermark-table">{tableName}</span>}
    </figcaption>
  )
}
