import { useMemo, useState } from 'react'
import LazyPhoto from './LazyPhoto'
import { albumMediaPreviewUrl } from './AlbumMedia'
import PhotoLightbox from './PhotoWallExtras'
import { useAlbumPhotos } from '../hooks/useAlbumPhotos'
import { deleteAlbumPhotoAdmin } from '../lib/guestPhoto'

function formatUploadedAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function photoSubtitle(photo) {
  if (photo.media_type === 'video') {
    if (photo.table_name) return `${photo.table_name} · Video`
    return 'Quick share video'
  }
  if (photo.poll_option_label) {
    return photo.poll_category_name
      ? `${photo.poll_option_label} · ${photo.poll_category_name}`
      : photo.poll_option_label
  }
  if (photo.poll_id && photo.poll_title) return photo.poll_title
  if (photo.is_open_upload) {
    return photo.table_name ? `${photo.table_name} · Quick share` : 'Quick share'
  }
  return photo.table_name ?? 'Table upload'
}

export default function AdminPhotoModeration({ albumId }) {
  const { photos, loading, error, reload } = useAlbumPhotos(albumId)
  const [deletingId, setDeletingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  const ordered = useMemo(
    () => [...photos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [photos]
  )

  async function handleDelete(photo) {
    const label = photo.display_name?.trim() || 'this guest'
    if (!window.confirm(`Remove the photo shared by ${label}? This cannot be undone.`)) {
      return
    }

    setDeletingId(photo.id)
    setActionError(null)
    try {
      await deleteAlbumPhotoAdmin(photo.id)
      setLightboxPhoto((current) => (current?.id === photo.id ? null : current))
      await reload()
    } catch (err) {
      setActionError(err.message ?? 'Could not remove photo')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <p className="poll-hint">Loading photos…</p>
  }

  if (error) {
    return <p className="poll-message poll-message-error">{error}</p>
  }

  return (
    <>
      <p className="poll-hint admin-photo-moderation-intro">
        {ordered.length === 0
          ? 'No photos have been shared yet.'
          : `${ordered.length} photo${ordered.length === 1 ? '' : 's'} in the album. Remove anything inappropriate — likes and comments are deleted too.`}
      </p>

      {actionError && <p className="poll-message poll-message-error">{actionError}</p>}

      {ordered.length > 0 && (
        <ul className="admin-photo-moderation-list">
          {ordered.map((photo) => (
            <li key={photo.id} className="admin-photo-moderation-item">
              <button
                type="button"
                className="admin-photo-moderation-thumb-btn"
                onClick={() => setLightboxPhoto(photo)}
                aria-label={`Preview photo from ${photo.display_name}`}
              >
                <LazyPhoto
                  src={albumMediaPreviewUrl(photo)}
                  alt=""
                  className="admin-photo-moderation-thumb"
                />
              </button>
              <div className="admin-photo-moderation-meta">
                <p className="admin-photo-moderation-name">{photo.display_name}</p>
                <p className="admin-photo-moderation-subtitle">{photoSubtitle(photo)}</p>
                <time className="admin-photo-moderation-time" dateTime={photo.created_at}>
                  {formatUploadedAt(photo.created_at)}
                </time>
              </div>
              <button
                type="button"
                className="poll-button poll-button-secondary poll-button-small admin-photo-moderation-delete"
                onClick={() => handleDelete(photo)}
                disabled={deletingId === photo.id}
              >
                {deletingId === photo.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <PhotoLightbox
        photo={lightboxPhoto}
        photos={ordered}
        onPhotoChange={setLightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
        onDelete={handleDelete}
        canDelete={Boolean(lightboxPhoto)}
        deleting={Boolean(deletingId)}
      />
    </>
  )
}
