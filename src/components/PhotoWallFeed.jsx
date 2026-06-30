import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFeedNav } from '../contexts/FeedNavContext'
import FeedDisplayNamePrompt from './FeedDisplayNamePrompt'
import PhotoFeedPost from './PhotoFeedPost'
import PhotoFeedStories from './PhotoFeedStories'
import PhotoStoryViewer from './PhotoStoryViewer'
import PhotoLightbox from './PhotoWallExtras'
import { useAlbumPhotoSocial } from '../hooks/useAlbumPhotoSocial'
import { useFeedDisplayName } from '../hooks/useFeedDisplayName'
import { buildTableStories } from '../lib/photoStoryGroups'

export function PhotoWallFeed({ albumId, photos, onRefresh }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [storyView, setStoryView] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const { setFeedNav, clearFeedNav } = useFeedNav()
  const { displayName, needsPrompt, setDisplayName } = useFeedDisplayName()
  const { socialByPhotoId, loading, error, toggleLike, postComment, reload: reloadSocial } =
    useAlbumPhotoSocial(albumId, photos)

  const ordered = useMemo(
    () => [...photos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [photos]
  )

  const tableStories = useMemo(() => buildTableStories(photos), [photos])

  const handleRefresh = useCallback(async () => {
    if (refreshing || !onRefresh) return

    setRefreshing(true)
    try {
      await Promise.all([onRefresh(), reloadSocial()])
    } catch {
      // Errors surface via hooks on next render
    } finally {
      setRefreshing(false)
    }
  }, [onRefresh, refreshing, reloadSocial])

  useEffect(() => {
    setFeedNav({
      refreshing,
      onRefresh: handleRefresh,
    })

    return () => clearFeedNav()
  }, [clearFeedNav, handleRefresh, refreshing, setFeedNav])

  if (ordered.length === 0) {
    return (
      <>
        {needsPrompt && <FeedDisplayNamePrompt onSave={setDisplayName} />}
        <p className="poll-hint">No photos yet. Be the first to share a favorite moment!</p>
      </>
    )
  }

  return (
    <>
      {needsPrompt && <FeedDisplayNamePrompt onSave={setDisplayName} />}
      {error && <p className="poll-message poll-message-error">{error}</p>}
      {loading && Object.keys(socialByPhotoId).length === 0 && (
        <p className="poll-hint">Loading feed…</p>
      )}
      <PhotoFeedStories
        stories={tableStories}
        onSelectStory={(storyIndex) => setStoryView({ storyIndex, photoIndex: 0 })}
      />
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
            busy={loading}
          />
        ))}
      </div>
      <PhotoLightbox
        photo={lightboxPhoto}
        photos={ordered}
        onPhotoChange={setLightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
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
