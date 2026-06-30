import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPhotoModeration from '../components/AdminPhotoModeration'
import AdminPhotoQRCodes from '../components/AdminPhotoQRCodes'
import AlbumRosterEditor from '../components/AlbumRosterEditor'
import { useAlbumRoster } from '../hooks/useAlbumRoster'
import { importPollRosterToAlbum } from '../lib/guestPhoto'
import { supabase } from '../lib/supabase'

const TABS = ['details', 'moderate', 'roster', 'qrcodes']

export default function AdminPhotosPage() {
  const [album, setAlbum] = useState(null)
  const [tab, setTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [polls, setPolls] = useState([])
  const [importPollId, setImportPollId] = useState('')

  const { reload: reloadRoster } = useAlbumRoster(album?.id)

  const loadAlbum = useCallback(async () => {
    setError(null)

    const { data: existing, error: fetchError } = await supabase
      .from('photo_albums')
      .select('id, title, status, created_at, guest_upload_limit, open_upload_limit')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    if (existing) {
      setAlbum(existing)
      setLoading(false)
      return
    }

    const { data: created, error: createError } = await supabase
      .from('photo_albums')
      .insert({ title: 'Family photo album', status: 'draft' })
      .select('id, title, status, created_at, guest_upload_limit, open_upload_limit')
      .single()

    if (createError) {
      setError(createError.message)
    } else {
      setAlbum(created)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAlbum()
  }, [loadAlbum])

  useEffect(() => {
    async function loadPolls() {
      const { data } = await supabase
        .from('polls')
        .select('id, title, status')
        .order('created_at', { ascending: false })
      setPolls(data ?? [])
      if (data?.[0]) setImportPollId(data[0].id)
    }
    loadPolls()
  }, [])

  async function saveAlbum(fields) {
    if (!album) return

    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('photo_albums')
      .update(fields)
      .eq('id', album.id)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    await loadAlbum()
  }

  async function openAlbum() {
    setSaving(true)
    setError(null)

    const { error: closeError } = await supabase
      .from('photo_albums')
      .update({ status: 'closed' })
      .eq('status', 'open')
      .neq('id', album.id)

    if (closeError) {
      setSaving(false)
      setError(closeError.message)
      return
    }

    const { error: openError } = await supabase
      .from('photo_albums')
      .update({ status: 'open' })
      .eq('id', album.id)

    setSaving(false)
    if (openError) {
      setError(openError.message)
      return
    }
    await loadAlbum()
  }

  async function handleImport() {
    if (!importPollId || !album) return
    if (!confirm('Import tables and guests from this poll? Existing photo roster entries are kept; new names are added.')) {
      return
    }

    setImporting(true)
    setError(null)
    try {
      const result = await importPollRosterToAlbum(album.id, importPollId)
      await reloadRoster()
      alert(`Imported ${result.guests_added} guest(s) and ${result.tables_added} table(s).`)
    } catch (err) {
      setError(err.message ?? 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return <p className="poll-loading">Loading photo album…</p>
  }

  if (!album) {
    return (
      <div className="poll-page art-deco-border">
        <p className="poll-message poll-message-error">{error ?? 'Could not load photo album.'}</p>
      </div>
    )
  }

  return (
    <div className="poll-page art-deco-border">
      <Link to="/admin" className="poll-back-link">
        ← Back to admin
      </Link>

      <header className="poll-page-header">
        <h1 className="poll-page-title">Photo album</h1>
        <span className={`poll-status poll-status-${album.status}`}>{album.status}</span>
      </header>

      <div className="poll-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`poll-tab${tab === t ? ' poll-tab-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'qrcodes'
              ? 'QR codes'
              : t === 'moderate'
                ? 'Moderate'
                : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="poll-message poll-message-error">{error}</p>}

      {tab === 'details' && (
        <section className="poll-section">
          <form
            className="poll-form"
            onSubmit={(e) => {
              e.preventDefault()
              saveAlbum({ title: album.title })
            }}
          >
            <label className="poll-field">
              <span>Album title</span>
              <input
                className="poll-input poll-input-title"
                value={album.title}
                onChange={(e) => setAlbum((prev) => ({ ...prev, title: e.target.value }))}
                onBlur={(e) => saveAlbum({ title: e.target.value })}
              />
            </label>
          </form>

          <form
            className="poll-form admin-photo-limits-form"
            onSubmit={(e) => {
              e.preventDefault()
              saveAlbum({ open_upload_limit: album.open_upload_limit })
            }}
          >
            <label className="poll-field">
              <span>Photos per device</span>
              <input
                type="number"
                className="poll-input"
                min={1}
                max={999}
                value={album.open_upload_limit ?? 10}
                onChange={(e) =>
                  setAlbum((prev) => ({
                    ...prev,
                    open_upload_limit: Number(e.target.value),
                  }))
                }
                onBlur={() => saveAlbum({ open_upload_limit: album.open_upload_limit })}
              />
            </label>
            <p className="poll-hint">
              Each phone or browser can share up to this many photos total — quick shares and any
              older table uploads count toward the same limit.
            </p>
          </form>

          <div className="admin-status-actions">
            {album.status === 'draft' && (
              <button
                type="button"
                className="poll-button poll-button-primary"
                disabled={saving}
                onClick={openAlbum}
              >
                Open photo uploads
              </button>
            )}
            {album.status === 'open' && (
              <button
                type="button"
                className="poll-button poll-button-secondary"
                disabled={saving}
                onClick={() => saveAlbum({ status: 'closed' })}
              >
                Close photo uploads
              </button>
            )}
            {album.status === 'closed' && (
              <button
                type="button"
                className="poll-button poll-button-primary"
                disabled={saving}
                onClick={openAlbum}
              >
                Reopen photo uploads
              </button>
            )}
          </div>

          <p className="poll-hint">
            Guests can upload while the album is <strong>open</strong>. The photo wall stays visible when open or closed.
          </p>

          <p className="poll-page-footer-link">
            <a href="/photos/wall" target="_blank" rel="noreferrer">
              Open photo feed →
            </a>
          </p>
        </section>
      )}

      {tab === 'moderate' && (
        <section className="poll-section">
          <AdminPhotoModeration albumId={album.id} />
        </section>
      )}

      {tab === 'roster' && (
        <section className="poll-section">
          {polls.length > 0 && (
            <div className="admin-photo-import-panel">
              <p className="poll-hint">
                Optionally copy tables and guests from a poll roster (adds missing names only).
              </p>
              <div className="poll-form poll-form-inline">
                <label className="poll-field">
                  <span>Poll</span>
                  <select
                    className="poll-select"
                    value={importPollId}
                    onChange={(e) => setImportPollId(e.target.value)}
                  >
                    {polls.map((poll) => (
                      <option key={poll.id} value={poll.id}>
                        {poll.title} ({poll.status})
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="poll-button poll-button-secondary"
                  disabled={importing || !importPollId}
                  onClick={handleImport}
                >
                  {importing ? 'Importing…' : 'Import from poll'}
                </button>
              </div>
            </div>
          )}
          <AlbumRosterEditor albumId={album.id} />
        </section>
      )}

      {tab === 'qrcodes' && (
        <section className="poll-section">
          <p className="poll-hint">
            Print or display this QR code at the reunion. Guests scan it to open the photo feed,
            share photos, and optionally tag a table for story rings.
          </p>
          <AdminPhotoQRCodes albumTitle={album.title} />
        </section>
      )}
    </div>
  )
}
