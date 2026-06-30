import { useId } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock'

export default function PhotoTableAssignPrompt({
  previewUrl,
  tables,
  rosterTableIds = [],
  onAssign,
  onClose,
  uploading = false,
  error = null,
}) {
  const titleId = useId()
  useBodyScrollLock(true)

  const rosterSet = new Set(rosterTableIds)

  return createPortal(
    <div className="feed-name-prompt-backdrop" role="presentation">
      <div
        className="photo-table-assign-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="photo-table-assign-close"
          onClick={onClose}
          disabled={uploading}
          aria-label="Cancel upload"
        >
          ×
        </button>

        {previewUrl && (
          <div className="photo-table-assign-preview">
            <img src={previewUrl} alt="" />
          </div>
        )}

        <p className="feed-name-prompt-eyebrow">Almost done</p>
        <h2 className="feed-name-prompt-title" id={titleId}>
          Add to a table story?
        </h2>
        <p className="feed-name-prompt-desc">
          Tag a table so this photo shows up in that table&apos;s story ring on the feed. It will
          still appear in the main feed as a quick share.
        </p>

        <div className="photo-table-assign-options" role="list">
          <button
            type="button"
            className="photo-table-assign-option photo-table-assign-option-muted"
            onClick={() => onAssign(null)}
            disabled={uploading}
            role="listitem"
          >
            <span className="photo-table-assign-option-label">Feed only</span>
            <span className="photo-table-assign-option-hint">Skip table story</span>
          </button>

          {tables.map((table) => (
            <button
              key={table.tableId}
              type="button"
              className="photo-table-assign-option"
              onClick={() => onAssign(table.tableId)}
              disabled={uploading}
              role="listitem"
            >
              <span className="photo-table-assign-option-label">{table.tableName}</span>
              {rosterSet.has(table.tableId) && (
                <span className="photo-table-assign-option-hint">Your table</span>
              )}
            </button>
          ))}
        </div>

        {error && <p className="poll-message poll-message-error">{error}</p>}
        {uploading && <p className="poll-hint">Uploading…</p>}
      </div>
    </div>,
    document.body
  )
}
