import { useEffect, useId, useRef, useState } from 'react'

import LazyPhoto from './LazyPhoto'

function formatRelativeTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function authorInitial(name) {
  return (name?.trim()?.[0] ?? '?').toUpperCase()
}

export default function PhotoFeedPost({
  photo,
  social,
  userDisplayName,
  onToggleLike,
  onPostComment,
  onImageClick,
  onDelete,
  onEditAssignment,
  canEditAssignment = false,
  canDelete = false,
  busy = false,
  deleting = false,
}) {
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const commentInputRef = useRef(null)
  const menuRef = useRef(null)
  const menuButtonId = useId()
  const menuId = useId()

  const likeCount = social?.likeCount ?? 0
  const likedByMe = social?.likedByMe ?? false
  const comments = social?.comments ?? []

  const displayName = photo.display_name?.trim() || 'Guest'
  const subtitle = photo.poll_option_label
    ? photo.poll_category_name
      ? `${photo.poll_option_label} · ${photo.poll_category_name}`
      : photo.poll_option_label
    : photo.poll_id && photo.poll_title
      ? photo.poll_title
      : photo.is_open_upload
        ? photo.table_id
          ? photo.table_name ?? 'Table'
          : 'Shared Moment'
        : photo.table_name ?? 'Family reunion'

  async function handleLike() {
    if (busy || !userDisplayName) return
    try {
      await onToggleLike(photo.id)
    } catch (err) {
      setLocalError(err.message ?? 'Could not update like')
    }
  }

  function focusCommentInput() {
    commentInputRef.current?.focus()
  }

  async function handleCommentSubmit(event) {
    event.preventDefault()
    const body = commentBody.trim()
    if (!userDisplayName || !body || submitting) return

    setSubmitting(true)
    setLocalError(null)
    try {
      await onPostComment(photo.id, userDisplayName, body)
      setCommentBody('')
    } catch (err) {
      setLocalError(err.message ?? 'Could not post comment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!canDelete || !onDelete || deleting) return
    try {
      await onDelete(photo)
    } catch (err) {
      setLocalError(err.message ?? 'Could not remove photo')
    }
  }

  function handleEditAssignment() {
    if (!canEditAssignment || !onEditAssignment || deleting) return
    onEditAssignment(photo)
  }

  useEffect(() => {
    if (!menuOpen) return undefined

    function handlePointerDown(event) {
      if (menuRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  async function handleDeleteFromMenu() {
    setMenuOpen(false)
    await handleDelete()
  }

  const showPostMenu = canDelete && onDelete

  return (
    <article className="photo-feed-post">
      <header className="photo-feed-post-header">
        <div className="photo-feed-post-avatar" aria-hidden="true">
          {authorInitial(displayName)}
        </div>
        <div className="photo-feed-post-meta">
          <p className="photo-feed-post-author">{displayName}</p>
          {canEditAssignment && onEditAssignment ? (
            <button
              type="button"
              className="photo-feed-post-subtitle-edit"
              onClick={handleEditAssignment}
              disabled={busy || deleting}
              aria-label={`Change story: ${subtitle}`}
            >
              <span className="photo-feed-post-subtitle">{subtitle}</span>
            </button>
          ) : (
            <p className="photo-feed-post-subtitle">{subtitle}</p>
          )}
        </div>
        {showPostMenu && (
          <div className="photo-feed-post-menu" ref={menuRef}>
            <button
              type="button"
              id={menuButtonId}
              className="photo-feed-post-menu-btn"
              onClick={() => setMenuOpen((open) => !open)}
              disabled={busy || deleting}
              aria-label="Post options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
            >
              <svg className="photo-feed-post-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="5" cy="12" r="2" fill="currentColor" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <circle cx="19" cy="12" r="2" fill="currentColor" />
              </svg>
            </button>
            {menuOpen && (
              <div
                id={menuId}
                className="photo-feed-post-menu-dropdown"
                role="menu"
                aria-labelledby={menuButtonId}
              >
                <button
                  type="button"
                  className="photo-feed-post-menu-item photo-feed-post-menu-item-danger"
                  role="menuitem"
                  onClick={handleDeleteFromMenu}
                  disabled={busy || deleting}
                >
                  {deleting ? 'Removing…' : 'Remove photo'}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="photo-feed-post-media">
        <button
          type="button"
          className="photo-feed-post-image-btn"
          onClick={() => onImageClick?.(photo)}
          aria-label={`View photo from ${displayName}`}
        >
          <LazyPhoto src={photo.public_url} alt="" className="photo-feed-post-image" />
        </button>
      </div>

      <div className="photo-feed-post-toolbar">
        <div className="photo-feed-post-actions">
          <button
            type="button"
            className={`photo-feed-action-btn photo-feed-like-btn${likedByMe ? ' photo-feed-like-btn-active' : ''}`}
            onClick={handleLike}
            disabled={busy || !userDisplayName}
            aria-label={likedByMe ? 'Unlike photo' : 'Like photo'}
            aria-pressed={likedByMe}
          >
            <svg className="photo-feed-icon" viewBox="0 0 24 24" aria-hidden="true">
              {likedByMe ? (
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              ) : (
                <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
              )}
            </svg>
          </button>
          <button
            type="button"
            className="photo-feed-action-btn photo-feed-comment-btn"
            onClick={focusCommentInput}
            disabled={!userDisplayName}
            aria-label="Comment on photo"
          >
            <svg className="photo-feed-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm0 15.17L18.83 16H4V4h16v13.17z" />
            </svg>
          </button>
        </div>
      </div>

      {likeCount > 0 && (
        <p className="photo-feed-likes-line">
          <strong>
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </strong>
        </p>
      )}

      {comments.length > 0 && (
        <ul className="photo-feed-comments">
          {comments.map((comment) => (
            <li key={comment.id} className="photo-feed-comment">
              <span className="photo-feed-comment-author">{comment.author_name}</span>
              <span className="photo-feed-comment-body">{comment.body}</span>
            </li>
          ))}
        </ul>
      )}

      <time className="photo-feed-post-time" dateTime={photo.created_at}>
        {formatRelativeTime(photo.created_at)}
      </time>

      <form className="photo-feed-comment-form" onSubmit={handleCommentSubmit}>
        <input
          ref={commentInputRef}
          className="poll-input photo-feed-comment-input"
          value={commentBody}
          onChange={(event) => setCommentBody(event.target.value)}
          placeholder="Add a comment…"
          disabled={submitting || busy || !userDisplayName}
          maxLength={500}
          aria-label="Add a comment"
        />
        {commentBody.trim() && (
          <button
            type="submit"
            className="photo-feed-comment-submit"
            disabled={submitting || busy || !userDisplayName}
          >
            {submitting ? '…' : 'Post'}
          </button>
        )}
      </form>

      {localError && <p className="poll-message poll-message-error photo-feed-post-error">{localError}</p>}
    </article>
  )
}
