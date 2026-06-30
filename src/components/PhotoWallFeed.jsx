import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFeedDisplayName } from '../hooks/useFeedDisplayName'
import { useAlbumPhotoSocial } from '../hooks/useAlbumPhotoSocial'
import { isMyPhoto } from '../lib/photoOwnership'
import PhotoFeedPost from './PhotoFeedPost'
import PhotoFeedStories from './PhotoFeedStories'
import PhotoStoryViewer from './PhotoStoryViewer'
import PhotoLightbox from './PhotoWallExtras'
import { buildFeedStories } from '../lib/photoStoryGroups'

export function PhotoWallFeed({
  albumId,
  photos,
  deviceId,
  onDeletePhoto,
  deleting = false,
  onRegisterRefreshExtra,
  onEditAssignment,
  canEditAssignment,
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

  const feedStories = useMemo(() => buildFeedStories(photos), [photos])

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

  const handleEditAssignment = useCallback(
    (photo) => {
      setLightboxPhoto(null)
      onEditAssignment?.(photo)
    },
    [onEditAssignment]
  )

  return (
    <>
      {error && <p className="poll-message poll-message-error">{error}</p>}
      {loading && Object.keys(socialByPhotoId).length === 0 && ordered.length > 0 && (
        <p className="poll-hint">Loading feed…</p>
      )}

      {feedStories.length > 0 && (
        <PhotoFeedStories
          stories={feedStories}
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
              onEditAssignment={handleEditAssignment}
              canEditAssignment={canEditAssignment?.(photo) ?? false}
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
        onEditAssignment={handleEditAssignment}
        canEditAssignment={lightboxPhoto ? (canEditAssignment?.(lightboxPhoto) ?? false) : false}
        canDelete={lightboxPhoto ? isMyPhoto(lightboxPhoto, deviceId) : false}
        deleting={deleting}
      />
      {storyView && (
        <PhotoStoryViewer
          stories={feedStories}
          storyIndex={storyView.storyIndex}
          photoIndex={storyView.photoIndex}
          onChange={(storyIndex, photoIndex) => setStoryView({ storyIndex, photoIndex })}
          onClose={() => setStoryView(null)}
        />
      )}
    </>
  )
}
