import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDeviceId } from '../lib/deviceId'
import FeedDisplayNamePrompt from './FeedDisplayNamePrompt'
import GuestPhotoUploader from './GuestPhotoUploader'
import { useAlbumRoster } from '../hooks/useAlbumRoster'
import { useFeedDisplayName } from '../hooks/useFeedDisplayName'
import { useFeedNav } from '../contexts/FeedNavContext'
import { MAX_DEVICE_PHOTOS } from '../lib/guestPhoto'

export default function PhotoWallUpload({
  albumId,
  album,
  photos,
  onRefresh,
  onRegisterRefreshExtra,
  navActive = true,
  showBulkUpload = true,
}) {
  const deviceId = getDeviceId()
  const [refreshing, setRefreshing] = useState(false)
  const [shareActions, setShareActions] = useState(null)
  const { setFeedNav, clearFeedNav } = useFeedNav()
  const { displayName, needsPrompt, setDisplayName } = useFeedDisplayName()
  const { roster, tables } = useAlbumRoster(albumId)

  const myDevicePhotos = useMemo(
    () => photos.filter((photo) => photo.device_id === deviceId),
    [photos, deviceId]
  )

  const tableAssignOptions = useMemo(
    () => tables.map((table) => ({ tableId: table.id, tableName: table.name })),
    [tables]
  )

  const rosterTableIds = useMemo(() => {
    const name = displayName?.trim().toLowerCase()
    if (!name) return []

    return roster
      .filter((entry) => entry.table_id && entry.display_name.trim().toLowerCase() === name)
      .map((entry) => entry.table_id)
  }, [displayName, roster])

  const galleryPreviewUrl = myDevicePhotos[0]?.public_url ?? null
  const uploadsOpen = album?.status === 'open'
  const deviceUploadLimit = album?.open_upload_limit ?? MAX_DEVICE_PHOTOS

  const handleRefresh = useCallback(async () => {
    if (refreshing) return

    setRefreshing(true)
    try {
      await onRefresh?.()
      await onRegisterRefreshExtra?.()
    } catch {
      // Errors surface via hooks on next render
    } finally {
      setRefreshing(false)
    }
  }, [onRefresh, onRegisterRefreshExtra, refreshing])

  const handlePhotosChange = useCallback(async () => {
    await onRefresh?.()
    await onRegisterRefreshExtra?.()
  }, [onRefresh, onRegisterRefreshExtra])

  const handleExposeActions = useCallback((actions) => {
    setShareActions(actions)
  }, [])

  useEffect(() => {
    if (!navActive) {
      clearFeedNav()
      return undefined
    }

    setFeedNav({
      refreshing,
      onRefresh: handleRefresh,
      onOpenCamera: shareActions?.openCamera,
      cameraDisabled: !uploadsOpen || !displayName || !shareActions?.canUpload,
    })

    return () => clearFeedNav()
  }, [
    clearFeedNav,
    displayName,
    handleRefresh,
    navActive,
    refreshing,
    setFeedNav,
    shareActions,
    uploadsOpen,
  ])

  const showBulkBar =
    showBulkUpload && uploadsOpen && displayName && !needsPrompt && navActive

  return (
    <>
      {needsPrompt && (
        <FeedDisplayNamePrompt
          onSave={setDisplayName}
          eyebrow={uploadsOpen ? 'Share a photo' : 'Photo feed'}
          title="What should we call you?"
          description="Your name appears on photos you share and on likes and comments. We'll remember it on this device."
        />
      )}

      {uploadsOpen && displayName && (
        <GuestPhotoUploader
          mode="open"
          headless
          albumId={albumId}
          displayName={displayName}
          deviceId={deviceId}
          photos={myDevicePhotos}
          allPhotos={photos}
          onPhotosChange={handlePhotosChange}
          maxPhotos={deviceUploadLimit}
          uploadLimit={deviceUploadLimit}
          singleGalleryPick
          orientGalleryPicks
          tableAssignOptions={tableAssignOptions}
          rosterTableIds={rosterTableIds}
          onExposeActions={handleExposeActions}
          galleryPreviewUrl={galleryPreviewUrl}
        />
      )}

      {showBulkBar && (
        <div className="photo-wall-share-actions">
          <button
            type="button"
            className="poll-button poll-button-secondary poll-button-small photo-wall-bulk-upload-btn"
            onClick={shareActions?.openBulkGallery}
            disabled={!shareActions?.canUpload || shareActions?.uploading}
          >
            Upload multiple photos
          </button>
          {shareActions?.uploading && shareActions?.uploadProgress && (
            <p className="poll-hint photo-wall-bulk-upload-progress">
              Uploading {shareActions.uploadProgress.done} of {shareActions.uploadProgress.total}…
            </p>
          )}
          {shareActions?.error && (
            <p className="poll-message poll-message-error photo-wall-bulk-upload-progress">
              {shareActions.error}
            </p>
          )}
        </div>
      )}
    </>
  )
}
