import { useMemo } from 'react'
import PhotoWatermark from './PhotoWatermark'

export default function TablePhotoGallery({
  photos,
  tableName,
  title,
  compact = false,
  showAttribution = true,
  enlargeable = false,
  onPhotoClick,
}) {
  const ordered = useMemo(
    () =>
      [...photos].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      ),
    [photos]
  )

  if (ordered.length === 0) {
    return compact ? null : (
      <p className="poll-hint table-photo-gallery-empty">
        No photos from this table yet. Be the first to share!
      </p>
    )
  }

  return (
    <section
      className={`table-photo-gallery${compact ? ' table-photo-gallery-compact' : ''}`}
      aria-label={tableName ? `Photos from ${tableName}` : 'Table photos'}
    >
      {!compact && (
        <header className="table-photo-gallery-header">
          <h2 className="table-photo-gallery-title">
            {title ?? tableName ?? 'Table photos'}
          </h2>
          <p className="table-photo-gallery-count">
            {ordered.length} photo{ordered.length === 1 ? '' : 's'}
          </p>
        </header>
      )}
      <div className="table-photo-gallery-grid">
        {ordered.map((photo) => {
          const interactive = enlargeable && onPhotoClick

          return (
            <figure
              key={photo.id}
              className={`table-photo-gallery-item${interactive ? ' table-photo-gallery-item-enlargeable' : ''}`}
              onClick={interactive ? () => onPhotoClick(photo) : undefined}
              onKeyDown={
                interactive
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onPhotoClick(photo)
                      }
                    }
                  : undefined
              }
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `View full size photo${photo.display_name ? ` from ${photo.display_name}` : ''}` : undefined}
            >
              <img src={photo.public_url} alt="" className="table-photo-gallery-image" />
              {showAttribution && !photo.is_open_upload && (
                <PhotoWatermark
                  displayName={photo.display_name}
                  tableName={photo.table_name}
                  createdAt={photo.created_at}
                  size="small"
                />
              )}
            </figure>
          )
        })}
      </div>
    </section>
  )
}
