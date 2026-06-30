import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import GuestPhotoUploader from '../components/GuestPhotoUploader'
import { useAlbumPhotosForPerson } from '../hooks/useAlbumPhotos'
import { getDeviceId, rememberVoterName } from '../lib/deviceId'
import { supabase } from '../lib/supabase'

export default function TablePhotoUploadPage() {
  const { tableId } = useParams()
  const [searchParams] = useSearchParams()
  const displayName = searchParams.get('name')?.trim() ?? ''
  const deviceId = getDeviceId()

  const [table, setTable] = useState(null)
  const [loadingTable, setLoadingTable] = useState(true)
  const [error, setError] = useState(null)

  const albumId = table?.album_id
  const { photos, loading: loadingPhotos, error: photosError, reload } =
    useAlbumPhotosForPerson(albumId, displayName)

  useEffect(() => {
    async function loadTable() {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('photo_tables')
        .select('id, album_id, name')
        .eq('id', tableId)
        .single()

      if (fetchError) setError(fetchError.message)
      else setTable(data)
      setLoadingTable(false)
    }

    loadTable()
  }, [tableId])

  useEffect(() => {
    if (displayName) rememberVoterName(displayName)
  }, [displayName])

  if (!displayName) {
    return <Navigate to={`/photos/table/${tableId}`} replace />
  }

  if (loadingTable || loadingPhotos) {
    return <p className="poll-loading">Loading your photos…</p>
  }

  if (error || photosError) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <p className="poll-message poll-message-error">{error ?? photosError}</p>
      </div>
    )
  }

  if (!table) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <p className="poll-message">Table not found.</p>
      </div>
    )
  }

  return (
    <div className="poll-page art-deco-border poll-page-with-float-nav">
      <header className="poll-page-header poll-page-header-compact">
        <p className="poll-page-eyebrow">Oducado Family Reunion 2026</p>
        <h1 className="poll-page-title">{table.name}</h1>
        <p className="poll-hint">
          Uploading as <strong>{displayName}</strong>
        </p>
      </header>

      <GuestPhotoUploader
        albumId={table.album_id}
        tableId={table.id}
        displayName={displayName}
        deviceId={deviceId}
        photos={photos}
        onPhotosChange={reload}
      />

      <p className="poll-page-footer-link">
        <Link to={`/photos/table/${tableId}`}>← Choose a different name</Link>
        {' · '}
        <Link to="/photos">All tables</Link>
        {' · '}
        <Link to="/photos/wall">View photo wall →</Link>
      </p>
    </div>
  )
}
