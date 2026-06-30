import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PhotoLightbox from '../components/PhotoWallExtras'
import TablePhotoGallery from '../components/TablePhotoGallery'
import TablePhotoGuestList from '../components/TablePhotoGuestList'
import { useAlbumPhotosForTable } from '../hooks/useAlbumPhotos'
import { useAlbumRoster } from '../hooks/useAlbumRoster'
import { supabase } from '../lib/supabase'

export default function TablePhotoGuestPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const [table, setTable] = useState(null)
  const [loadingTable, setLoadingTable] = useState(true)
  const [error, setError] = useState(null)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  const albumId = table?.album_id
  const { roster, loading: loadingRoster, error: rosterError } = useAlbumRoster(albumId)
  const { photos: tablePhotos, loading: loadingPhotos, error: photosError } =
    useAlbumPhotosForTable(albumId, tableId)

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

  function goToUpload(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    navigate(
      `/photos/table/${tableId}/upload?name=${encodeURIComponent(trimmed)}`
    )
  }

  if (loadingTable || (albumId && (loadingRoster || loadingPhotos))) {
    return <p className="poll-loading">Loading table…</p>
  }

  if (error || rosterError || photosError) {
    return (
      <div className="poll-page art-deco-border poll-page-with-float-nav">
        <p className="poll-message poll-message-error">{error ?? rosterError ?? photosError}</p>
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
        <h1 className="poll-page-title">Photo drop box</h1>
        <p className="poll-page-subtitle">{table.name}</p>
        <p className="poll-hint">Select your name to share up to 10 favorite photos from the reunion.</p>
      </header>

      <TablePhotoGuestList table={table} roster={roster} onSelectName={goToUpload} />

      <TablePhotoGallery
        photos={tablePhotos}
        tableName={table.name}
        title="Photos from this table"
        enlargeable
        onPhotoClick={setLightboxPhoto}
      />

      <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />

      <p className="poll-page-footer-link">
        <Link to="/photos">← All tables</Link>
        {' · '}
        <Link to="/photos/wall">View photo wall →</Link>
      </p>
    </div>
  )
}
