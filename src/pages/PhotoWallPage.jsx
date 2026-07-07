import { useCallback, useRef, useState } from 'react'
import PhotoWallCarousel, { PhotoWallGallery } from '../components/PhotoWall'
import { PhotoWallFeed } from '../components/PhotoWallFeed'
import PhotoWallUpload from '../components/PhotoWallUpload'
import PhotoStoryAssignPrompt from '../components/PhotoStoryAssignPrompt'
import { useActivePhotoAlbum } from '../hooks/useActivePhotoAlbum'
import { useAlbumPhotos } from '../hooks/useAlbumPhotos'
import { useFeedDisplayName } from '../hooks/useFeedDisplayName'
import { usePhotoStoryAssignOptions } from '../hooks/usePhotoStoryAssignOptions'
import { getDeviceId } from '../lib/deviceId'
import { deleteGuestPhoto, updatePhotoAssignment } from '../lib/guestPhoto'
import { canEditPhotoAssignment } from '../lib/photoOwnership'
import { downloadAllAlbumMedia } from '../lib/albumMediaDownload'

export default function PhotoWallPage() {
  const { album, loading: albumLoading, error: albumError } = useActivePhotoAlbum({
    includeClosed: true,
  })
  const { photos, loading: photosLoading, error: photosError, reload } = useAlbumPhotos(album?.id)
  const [mode, setMode] = useState('feed')
  const [slideSeconds, setSlideSeconds] = useState(7)
  const [adEveryPhotos, setAdEveryPhotos] = useState(7)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [assignEditPhoto, setAssignEditPhoto] = useState(null)
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [exportProgress, setExportProgress] = useState(null)
  const refreshExtraRef = useRef(null)
  const deviceId = getDeviceId()
  const { displayName } = useFeedDisplayName()
  const { tableAssignOptions, pollAssign, rosterTableIds, hasStoryTargets } =
    usePhotoStoryAssignOptions(album?.id, displayName)

  const handleRegisterRefreshExtra = useCallback((handler) => {
    refreshExtraRef.current = handler
  }, [])

  const runRefreshExtra = useCallback(async () => {
    await refreshExtraRef.current?.()
  }, [])

  const handleDeletePhoto = useCallback(
    async (photo) => {
      if (!window.confirm('Remove this photo?')) return

      setDeleting(true)
      setDeleteError(null)
      try {
        await deleteGuestPhoto(photo.id, deviceId)
        await reload()
        await runRefreshExtra()
      } catch (err) {
        setDeleteError(err.message ?? 'Could not remove photo')
        throw err
      } finally {
        setDeleting(false)
      }
    },
    [deviceId, reload, runRefreshExtra]
  )

  const canEditAssignment = useCallback(
    (photo) => canEditPhotoAssignment(photo, deviceId, hasStoryTargets),
    [deviceId, hasStoryTargets]
  )

  const handleEditAssignment = useCallback((photo) => {
    setAssignError(null)
    setAssignEditPhoto(photo)
  }, [])

  const handleCloseAssignment = useCallback(() => {
    if (assignSaving) return
    setAssignEditPhoto(null)
    setAssignError(null)
  }, [assignSaving])

  const handleSaveAssignment = useCallback(
    async (assignment) => {
      if (!assignEditPhoto) return
      setAssignSaving(true)
      setAssignError(null)
      try {
        await updatePhotoAssignment({
          photoId: assignEditPhoto.id,
          deviceId,
          tableId: assignment.tableId ?? null,
          pollId: assignment.pollId ?? null,
          pollOptionId: assignment.pollOptionId ?? null,
        })
        await reload()
        await runRefreshExtra()
        setAssignEditPhoto(null)
      } catch (err) {
        setAssignError(err.message ?? 'Could not update assignment')
      } finally {
        setAssignSaving(false)
      }
    },
    [assignEditPhoto, deviceId, reload, runRefreshExtra]
  )

  const handleExportAll = useCallback(async () => {
    if (!photos.length || exporting) return

    setExporting(true)
    setExportError(null)
    setExportProgress(null)
    try {
      await downloadAllAlbumMedia(photos, {
        albumTitle: album?.title ?? 'album',
        onProgress: (current, total) => setExportProgress({ current, total }),
      })
    } catch (err) {
      setExportError(err.message ?? 'Could not export photos')
    } finally {
      setExporting(false)
      setExportProgress(null)
    }
  }, [album?.title, exporting, photos])

  if (albumLoading || photosLoading) {
    return <p className="poll-loading">Loading photo wall…</p>
  }

  if (albumError || photosError) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <p className="poll-message poll-message-error">{albumError ?? photosError}</p>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <header className="poll-page-header">
          <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
          <h1 className="poll-page-title">Photo wall</h1>
          <p className="poll-page-subtitle">No photo album is set up yet.</p>
        </header>
      </div>
    )
  }

  const navActive = mode === 'feed' || mode === 'gallery'

  return (
    <div className="poll-page art-deco-border poll-page-with-float-nav">
      <header className="poll-page-header poll-page-header-compact">
        <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
        <h1 className="poll-page-title">{album.title}</h1>
        <p className="poll-page-subtitle">Favorite moments shared by our family</p>
      </header>

      <PhotoWallUpload
        albumId={album.id}
        album={album}
        photos={photos}
        onRefresh={reload}
        onRegisterRefreshExtra={runRefreshExtra}
        navActive={navActive}
        tableAssignOptions={tableAssignOptions}
        pollAssign={pollAssign}
        rosterTableIds={rosterTableIds}
      />

    {photos.length > 0 && (
        <div className="photo-wall-export-bar">
          <button
            type="button"
            className="poll-button poll-button-secondary poll-button-small"
            onClick={handleExportAll}
            disabled={exporting}
          >
            {exporting
              ? exportProgress
                ? `Downloading ${exportProgress.current} of ${exportProgress.total}…`
                : 'Preparing download…'
              : `Download all (${photos.length})`}
          </button>
        </div>
      )}

      <div className="photo-wall-mode-toggle" role="tablist" aria-label="Photo wall view">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'feed'}
          className={`photo-wall-mode-btn${mode === 'feed' ? ' photo-wall-mode-btn-active' : ''}`}
          onClick={() => setMode('feed')}
        >
          Feed
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'gallery'}
          className={`photo-wall-mode-btn${mode === 'gallery' ? ' photo-wall-mode-btn-active' : ''}`}
          onClick={() => setMode('gallery')}
        >
          Gallery
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'carousel'}
          className={`photo-wall-mode-btn${mode === 'carousel' ? ' photo-wall-mode-btn-active' : ''}`}
          onClick={() => setMode('carousel')}
        >
          Carousel
        </button>
      </div>

      {exportError && (
        <p className="poll-message poll-message-error photo-wall-export-error">{exportError}</p>
      )}

      {deleteError && (
        <p className="poll-message poll-message-error photo-wall-delete-error">{deleteError}</p>
      )}

      {mode === 'carousel' && (
        <div className="photo-wall-carousel-settings">
          <label className="photo-wall-interval-label">
            <span className="photo-wall-interval-text">Seconds per slide</span>
            <input
              type="range"
              className="photo-wall-interval-slider"
              min={1}
              max={10}
              step={1}
              value={slideSeconds}
              onChange={(event) => setSlideSeconds(Number(event.target.value))}
            />
            <span className="photo-wall-interval-value">{slideSeconds}s</span>
          </label>
          <label className="photo-wall-interval-label">
            <span className="photo-wall-interval-text">QR ad every</span>
            <input
              type="range"
              className="photo-wall-interval-slider"
              min={4}
              max={12}
              step={1}
              value={adEveryPhotos}
              onChange={(event) => setAdEveryPhotos(Number(event.target.value))}
            />
            <span className="photo-wall-interval-value">{adEveryPhotos}</span>
          </label>
        </div>
      )}

      {mode === 'carousel' ? (
        <PhotoWallCarousel
          photos={photos}
          intervalSeconds={slideSeconds}
          adEveryPhotos={adEveryPhotos}
          uploadsOpen={album.status === 'open'}
        />
      ) : mode === 'gallery' ? (
        <PhotoWallGallery
          photos={photos}
          deviceId={deviceId}
          onDeletePhoto={handleDeletePhoto}
          deleting={deleting}
          onEditAssignment={handleEditAssignment}
          canEditAssignment={canEditAssignment}
        />
      ) : (
        <PhotoWallFeed
          albumId={album.id}
          photos={photos}
          deviceId={deviceId}
          onDeletePhoto={handleDeletePhoto}
          deleting={deleting}
          onRegisterRefreshExtra={handleRegisterRefreshExtra}
          onEditAssignment={handleEditAssignment}
          canEditAssignment={canEditAssignment}
        />
      )}

      {assignEditPhoto && (
        <PhotoStoryAssignPrompt
          mode="edit"
          previewUrl={
            assignEditPhoto.media_type === 'video'
              ? assignEditPhoto.poster_url ?? assignEditPhoto.public_url
              : assignEditPhoto.public_url
          }
          tables={tableAssignOptions}
          rosterTableIds={rosterTableIds}
          poll={pollAssign?.poll ?? null}
          pollOptions={pollAssign?.options ?? []}
          currentPhoto={assignEditPhoto}
          allowPollAssign={assignEditPhoto.media_type !== 'video'}
          onAssign={handleSaveAssignment}
          onClose={handleCloseAssignment}
          uploading={assignSaving}
          error={assignError}
        />
      )}
    </div>
  )
}
