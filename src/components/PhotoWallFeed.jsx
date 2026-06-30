import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFeedDisplayName } from '../hooks/useFeedDisplayName'
import { useAlbumPhotoSocial } from '../hooks/useAlbumPhotoSocial'
import { isMyPhoto } from '../lib/photoOwnership'
import PhotoFeedPost from './PhotoFeedPost'
import PhotoFeedStories from './PhotoFeedStories'
import PhotoStoryViewer from './PhotoStoryViewer'
import PhotoLightbox from './PhotoWallExtras'
import { buildTableStories } from '../lib/photoStoryGroups'

export function PhotoWallFeed({
  albumId,
  photos,
  deviceId,
  onDeletePhoto,
  deleting = false,
  onRegisterRefreshExtra,
}) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [storyView, setStoryView] = useState(null)
  const { displayName } = useFeedDisplayName()
  const { socialByPhotoId, loading, error, toggleLike, postComment, reload: reloadSocial } =
    useAlbumPhotoSocial(albumId, photos)

  const ordered = useMemo(
    () => [...photos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [photos]
  )

  const tableStories = useMemo(() => buildTableStories(photos), [photos])

  const registerRefreshExtra = useCallback(async () => {
    await reloadSocial()
  }, [reloadSocial])

  useEffect(() => {
    onRegisterRefreshExtra?.(registerRefreshExtra)
    return () => onRegisterRefreshExtra?.(null)
  }, [onRegisterRefreshExtra, registerRefreshExtra])

  const handleDeletePhoto = useCallback(
    async (photo) => {
      await onDeletePhoto?.(photo)
      setLightboxPhoto((current) => (current?.id === photo.id ? null : current))
    },
    [onDeletePhoto]
  )

  return (
    <>
      {error && <p className="poll-message poll-message-error">{error}</p>}
      {loading && Object.keys(socialByPhotoId).length === 0 && ordered.length > 0 && (
        <p className="poll-hint">Loading feed…</p>
      )}

      {tableStories.length > 0 && (
        <PhotoFeedStories
          stories={tableStories}
          onSelectStory={(storyIndex) => setStoryView({ storyIndex, photoIndex: 0 })}
        />
      )}

      {ordered.length === 0 ? (
        <p className="poll-hint">No photos yet. Be the first to share a favorite moment!</p>
      ) : (
        <div className="photo-feed">
          {ordered.map((photo) => (
            <PhotoFeedPost
              key={photo.id}
              photo={photo}
              social={socialByPhotoId[photo.id]}
              userDisplayName={displayName}
              onToggleLike={toggleLike}
              onPostComment={postComment}
              onImageClick={setLightboxPhoto}
              onDelete={handleDeletePhoto}
              canDelete={isMyPhoto(photo, deviceId)}
              busy={loading}
              deleting={deleting}
            />
          ))}
        </div>
      )}

      <PhotoLightbox
        photo={lightboxPhoto}
        photos={ordered}
        onPhotoChange={setLightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
        onDelete={handleDeletePhoto}
        canDelete={lightboxPhoto ? isMyPhoto(lightboxPhoto, deviceId) : false}
        deleting={deleting}
      />
      {storyView && (
        <PhotoStoryViewer
          stories={tableStories}
          storyIndex={storyView.storyIndex}
          photoIndex={storyView.photoIndex}
          onChange={(storyIndex, photoIndex) => setStoryView({ storyIndex, photoIndex })}
          onClose={() => setStoryView(null)}
        />
      )}
    </>
  )
}
