import { useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock'

function normalizeSearch(value) {
  return value.trim().toLowerCase()
}

function isFeedOnlyAssignment(photo) {
  return !photo?.table_id && !photo?.poll_id
}

function isTableSelected(tableId, photo) {
  return Boolean(photo?.table_id && photo.table_id === tableId)
}

function isPollStorySelected(pollId, photo) {
  return Boolean(photo?.poll_id === pollId && !photo?.poll_option_id)
}

function isPollOptionSelected(optionId, photo) {
  return Boolean(photo?.poll_option_id && photo.poll_option_id === optionId)
}

export default function PhotoStoryAssignPrompt({
  previewUrl,
  tables = [],
  rosterTableIds = [],
  poll = null,
  pollOptions = [],
  allowPollAssign = true,
  currentPhoto = null,
  mode = 'upload',
  onAssign,
  onClose,
  uploading = false,
  error = null,
}) {
  const titleId = useId()
  const searchId = useId()
  const isEdit = mode === 'edit'
  const [searchQuery, setSearchQuery] = useState('')
  const [showPollOptions, setShowPollOptions] = useState(
    () => isEdit && Boolean(currentPhoto?.poll_id)
  )
  useBodyScrollLock(true)

  const rosterSet = new Set(rosterTableIds)

  const filteredPollOptions = useMemo(() => {
    const query = normalizeSearch(searchQuery)
    if (!query) return pollOptions

    return pollOptions.filter((option) => {
      const haystack = `${option.label} ${option.categoryName}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [pollOptions, searchQuery])

  function handleAssign(assignment) {
    onAssign?.(assignment)
  }

  const pollTitle = poll?.title ?? 'Poll'
  const busyLabel = isEdit ? 'Saving…' : 'Uploading…'

  return createPortal(
    <div className="feed-name-prompt-backdrop" role="presentation">
      <div
        className="photo-table-assign-prompt photo-story-assign-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="photo-table-assign-close"
          onClick={onClose}
          disabled={uploading}
          aria-label={isEdit ? 'Cancel' : 'Cancel upload'}
        >
          ×
        </button>

        {previewUrl && (
          <div className="photo-table-assign-preview">
            <img src={previewUrl} alt="" />
          </div>
        )}

        <p className="feed-name-prompt-eyebrow">{isEdit ? 'Your photo' : 'Almost done'}</p>
        <h2 className="feed-name-prompt-title" id={titleId}>
          {showPollOptions
            ? isEdit
              ? `Change ${pollTitle} assignment`
              : `Assign to ${pollTitle}`
            : isEdit
              ? 'Change story?'
              : 'Add to a story?'}
        </h2>
        <p className="feed-name-prompt-desc">
          {showPollOptions
            ? isEdit
              ? 'Pick a different poll option, move to the poll story only, or go back to change table or feed.'
              : 'Search for a poll option to use this as its photo, or add to the poll story without picking an option.'
            : isEdit
              ? 'Update where this photo appears in story rings. It still stays in the main feed.'
              : 'Tag a table or poll so this photo shows up in story rings. It still appears in the main feed.'}
        </p>

        {showPollOptions ? (
          <div className="photo-story-assign-poll-panel">
            <button
              type="button"
              className="photo-story-assign-back"
              onClick={() => setShowPollOptions(false)}
              disabled={uploading}
            >
              ← Back
            </button>

            <label className="photo-story-assign-search-label" htmlFor={searchId}>
              Search options
            </label>
            <input
              id={searchId}
              type="search"
              className="poll-input photo-story-assign-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Type a name or category…"
              disabled={uploading}
              autoFocus
            />

            <div className="photo-table-assign-options" role="list">
              <button
                type="button"
                className={`photo-table-assign-option photo-table-assign-option-muted${
                  isPollStorySelected(poll.id, currentPhoto)
                    ? ' photo-table-assign-option-selected'
                    : ''
                }`}
                onClick={() => handleAssign({ pollId: poll.id, pollOptionId: null })}
                disabled={uploading}
                role="listitem"
              >
                <span className="photo-table-assign-option-label">{pollTitle} story</span>
                <span className="photo-table-assign-option-hint">Poll ring only</span>
              </button>

              {filteredPollOptions.length === 0 ? (
                <p className="poll-hint photo-story-assign-empty">No options match your search.</p>
              ) : (
                filteredPollOptions.map((option) => (
                  <button
                    key={option.optionId}
                    type="button"
                    className={`photo-table-assign-option${
                      isPollOptionSelected(option.optionId, currentPhoto)
                        ? ' photo-table-assign-option-selected'
                        : ''
                    }`}
                    onClick={() =>
                      handleAssign({ pollId: poll.id, pollOptionId: option.optionId })
                    }
                    disabled={uploading}
                    role="listitem"
                  >
                    <span className="photo-table-assign-option-label">{option.label}</span>
                    <span className="photo-table-assign-option-hint">{option.categoryName}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="photo-table-assign-options" role="list">
            <button
              type="button"
              className={`photo-table-assign-option photo-table-assign-option-muted${
                isEdit && isFeedOnlyAssignment(currentPhoto)
                  ? ' photo-table-assign-option-selected'
                  : ''
              }`}
              onClick={() => handleAssign({})}
              disabled={uploading}
              role="listitem"
            >
              <span className="photo-table-assign-option-label">Feed only</span>
              <span className="photo-table-assign-option-hint">Skip story rings</span>
            </button>

            {allowPollAssign && poll && pollOptions.length > 0 && (
              <button
                type="button"
                className={`photo-table-assign-option photo-table-assign-option-poll${
                  isEdit && currentPhoto?.poll_id ? ' photo-table-assign-option-selected' : ''
                }`}
                onClick={() => setShowPollOptions(true)}
                disabled={uploading}
                role="listitem"
              >
                <span className="photo-table-assign-option-label">{pollTitle}</span>
                <span className="photo-table-assign-option-hint">Poll story · pick an option</span>
              </button>
            )}

            {tables.map((table) => (
              <button
                key={table.tableId}
                type="button"
                className={`photo-table-assign-option${
                  isEdit && isTableSelected(table.tableId, currentPhoto)
                    ? ' photo-table-assign-option-selected'
                    : ''
                }`}
                onClick={() => handleAssign({ tableId: table.tableId })}
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
        )}

        {error && <p className="poll-message poll-message-error">{error}</p>}
        {uploading && <p className="poll-hint">{busyLabel}</p>}
      </div>
    </div>,
    document.body
  )
}
