import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { groupRosterByTable, sortTablesAlphabetically } from '../lib/roster'

export default function AlbumRosterEditor({ albumId }) {
  const [tables, setTables] = useState([])
  const [entries, setEntries] = useState([])
  const [newTableName, setNewTableName] = useState('')
  const [newGuestName, setNewGuestName] = useState('')
  const [newGuestTableId, setNewGuestTableId] = useState('')
  const [bulkNames, setBulkNames] = useState('')
  const [bulkTableId, setBulkTableId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showBulk, setShowBulk] = useState(false)

  const grouped = useMemo(() => groupRosterByTable(tables, entries), [tables, entries])
  const sortedTables = useMemo(() => sortTablesAlphabetically(tables), [tables])

  const load = useCallback(async () => {
    setError(null)
    const [tablesRes, rosterRes] = await Promise.all([
      supabase
        .from('photo_tables')
        .select('id, name, display_order')
        .eq('album_id', albumId)
        .order('name'),
      supabase
        .from('photo_roster')
        .select('id, display_name, display_order, table_id')
        .eq('album_id', albumId)
        .order('display_name'),
    ])

    if (tablesRes.error) setError(tablesRes.error.message)
    else setTables(tablesRes.data ?? [])

    if (rosterRes.error) setError(rosterRes.error.message)
    else setEntries(rosterRes.data ?? [])

    setLoading(false)
  }, [albumId])

  useEffect(() => {
    load()
  }, [load])

  async function addTable(name) {
    const trimmed = name.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('photo_tables').insert({
      album_id: albumId,
      name: trimmed,
      display_order: tables.length,
    })

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setNewTableName('')
    await load()
  }

  async function updateTable(tableId, fields) {
    const { error: updateError } = await supabase
      .from('photo_tables')
      .update(fields)
      .eq('id', tableId)
    if (updateError) setError(updateError.message)
    else await load()
  }

  async function deleteTable(tableId) {
    if (!confirm('Delete this table? Guests will move to Other guests.')) return
    const { error: deleteError } = await supabase.from('photo_tables').delete().eq('id', tableId)
    if (deleteError) setError(deleteError.message)
    else await load()
  }

  async function addGuest(name, tableId) {
    const trimmed = name.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)
    const tableEntries = entries.filter((e) => e.table_id === (tableId || null))

    const { error: insertError } = await supabase.from('photo_roster').insert({
      album_id: albumId,
      display_name: trimmed,
      table_id: tableId || null,
      display_order: tableEntries.length,
    })

    setSaving(false)
    if (insertError) {
      if (insertError.code === '23505') {
        setError(`"${trimmed}" is already on the guest list.`)
      } else {
        setError(insertError.message)
      }
      return
    }
    setNewGuestName('')
    await load()
  }

  async function addBulk(tableId) {
    const names = bulkNames
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

    if (names.length === 0) return

    setSaving(true)
    setError(null)

    let order = entries.filter((e) => e.table_id === (tableId || null)).length
    for (const name of names) {
      const { error: insertError } = await supabase.from('photo_roster').insert({
        album_id: albumId,
        display_name: name,
        table_id: tableId || null,
        display_order: order,
      })
      if (insertError && insertError.code !== '23505') {
        setError(insertError.message)
        setSaving(false)
        return
      }
      if (!insertError) order += 1
    }

    setSaving(false)
    setBulkNames('')
    setShowBulk(false)
    await load()
  }

  async function moveGuest(entryId, tableId) {
    const { error: updateError } = await supabase
      .from('photo_roster')
      .update({ table_id: tableId || null })
      .eq('id', entryId)
    if (updateError) setError(updateError.message)
    else await load()
  }

  async function updateGuest(entryId, displayName) {
    const trimmed = displayName.trim()
    if (!trimmed) {
      setError('Guest name cannot be empty.')
      await load()
      return
    }

    const existing = entries.find((entry) => entry.id === entryId)
    if (existing?.display_name === trimmed) return

    setError(null)
    const { error: updateError } = await supabase
      .from('photo_roster')
      .update({ display_name: trimmed })
      .eq('id', entryId)

    if (updateError) {
      if (updateError.code === '23505') {
        setError(`"${trimmed}" is already on the guest list.`)
      } else {
        setError(updateError.message)
      }
      await load()
      return
    }

    await load()
  }

  async function deleteGuest(id) {
    if (!confirm('Remove this guest from the list?')) return
    const { error: deleteError } = await supabase.from('photo_roster').delete().eq('id', id)
    if (deleteError) setError(deleteError.message)
    else await load()
  }

  if (loading) {
    return <p className="poll-loading">Loading guest list…</p>
  }

  return (
    <div className="admin-roster">
      <p className="poll-hint">
        Organize guests by table for the photo drop box. Each table gets its own QR code.
      </p>

      <form
        className="poll-form poll-form-inline"
        onSubmit={(e) => {
          e.preventDefault()
          addTable(newTableName)
        }}
      >
        <label className="poll-field">
          <span>New table</span>
          <input
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="e.g. Table 1"
          />
        </label>
        <button
          type="submit"
          className="poll-button poll-button-primary"
          disabled={saving || !newTableName.trim()}
        >
          Add table
        </button>
      </form>

      <form
        className="poll-form poll-form-inline"
        onSubmit={(e) => {
          e.preventDefault()
          addGuest(newGuestName, newGuestTableId || null)
        }}
      >
        <label className="poll-field">
          <span>Add guest</span>
          <input
            value={newGuestName}
            onChange={(e) => setNewGuestName(e.target.value)}
            placeholder="e.g. Maria Oducado"
          />
        </label>
        <label className="poll-field">
          <span>Table</span>
          <select
            className="poll-select"
            value={newGuestTableId}
            onChange={(e) => setNewGuestTableId(e.target.value)}
          >
            <option value="">Other guests</option>
            {sortedTables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="poll-button poll-button-secondary"
          disabled={saving || !newGuestName.trim()}
        >
          Add guest
        </button>
      </form>

      <button
        type="button"
        className="poll-manual-name-toggle"
        onClick={() => setShowBulk((v) => !v)}
      >
        {showBulk ? 'Hide bulk add' : 'Add multiple guests at once'}
      </button>

      {showBulk && (
        <div className="admin-roster-bulk">
          <label className="poll-field">
            <span>Table</span>
            <select
              className="poll-select"
              value={bulkTableId}
              onChange={(e) => setBulkTableId(e.target.value)}
            >
              <option value="">Other guests</option>
              {sortedTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
            </select>
          </label>
          <label className="poll-field">
            <span>One name per line</span>
            <textarea
              rows={6}
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              placeholder={'Maria Oducado\nJuan Oducado\n...'}
            />
          </label>
          <button
            type="button"
            className="poll-button poll-button-secondary"
            disabled={saving || !bulkNames.trim()}
            onClick={() => addBulk(bulkTableId || null)}
          >
            Add all
          </button>
        </div>
      )}

      {error && <p className="poll-message poll-message-error">{error}</p>}

      {tables.length === 0 && entries.length === 0 ? (
        <p className="poll-empty">Add tables and guests before opening photo uploads.</p>
      ) : (
        <div className="admin-table-groups">
          {grouped.map((group) => (
            <section key={group.id ?? 'unassigned'} className="admin-table-group">
              <div className="admin-table-group-header">
                {group.id ? (
                  <input
                    className="poll-input poll-input-title"
                    value={group.name}
                    onChange={(e) =>
                      setTables((prev) =>
                        prev.map((t) =>
                          t.id === group.id ? { ...t, name: e.target.value } : t
                        )
                      )
                    }
                    onBlur={(e) => updateTable(group.id, { name: e.target.value })}
                  />
                ) : (
                  <h3 className="admin-table-group-title">{group.name}</h3>
                )}
                {group.id && (
                  <button
                    type="button"
                    className="poll-button poll-button-danger poll-button-small"
                    onClick={() => deleteTable(group.id)}
                  >
                    Delete table
                  </button>
                )}
              </div>

              {group.entries.length === 0 ? (
                <p className="poll-hint">No guests at this table yet.</p>
              ) : (
                <ul className="admin-roster-list">
                  {group.entries.map((entry) => (
                    <li key={entry.id} className="admin-roster-item">
                      <input
                        className="poll-input admin-roster-item-name"
                        value={entry.display_name}
                        aria-label="Guest name"
                        onChange={(e) =>
                          setEntries((prev) =>
                            prev.map((item) =>
                              item.id === entry.id
                                ? { ...item, display_name: e.target.value }
                                : item
                            )
                          )
                        }
                        onBlur={(e) => updateGuest(entry.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                      />
                      <div className="admin-roster-item-actions">
                        <select
                          className="poll-select poll-select-compact"
                          value={entry.table_id ?? ''}
                          onChange={(e) => moveGuest(entry.id, e.target.value || null)}
                        >
                          <option value="">Other guests</option>
                          {sortedTables.map((table) => (
                            <option key={table.id} value={table.id}>
                              {table.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="poll-button poll-button-danger poll-button-small"
                          onClick={() => deleteGuest(entry.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
