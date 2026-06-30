import LazyPhoto from './LazyPhoto'

export function isVideoMedia(item) {
  return item?.media_type === 'video'
}

export function albumMediaPreviewUrl(item) {
  if (!item) return ''
  if (isVideoMedia(item)) return item.poster_url ?? item.public_url
  return item.public_url
}

export function AlbumMediaThumb({ item, className = '', thumbClassName = '', loading = 'lazy', alt = '' }) {
  return (
    <div className={`album-media-thumb${className ? ` ${className}` : ''}`}>
      <LazyPhoto
        src={albumMediaPreviewUrl(item)}
        alt={alt}
        className={thumbClassName || 'album-media-thumb-image'}
        loading={loading}
      />
      {isVideoMedia(item) && (
        <span className="album-media-play-badge" aria-hidden="true">
          ▶
        </span>
      )}
    </div>
  )
}

export default function AlbumMedia({
  item,
  className = '',
  thumbClassName = '',
  loading = 'lazy',
  alt = '',
  videoControls = true,
  autoPlay = false,
}) {
  if (!item) return null

  if (isVideoMedia(item)) {
    return (
      <video
        className={`album-media-video${className ? ` ${className}` : ''}`}
        src={item.public_url}
        poster={item.poster_url ?? undefined}
        controls={videoControls}
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        aria-label={alt || 'Video'}
      />
    )
  }

  return (
    <LazyPhoto
      src={item.public_url}
      alt={alt}
      className={className || thumbClassName}
      loading={loading}
    />
  )
}
