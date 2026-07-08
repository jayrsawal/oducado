import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import { getRecentVoterNames } from '../lib/deviceId'

export default function FeedDisplayNamePrompt({
  onSave,
  eyebrow = 'Photo wall',
  title = 'What should we call you?',
  description = "Pick a display name for likes and comments. We'll remember it on this device.",
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const inputId = useId()
  const inputRef = useRef(null)
  const recentNames = getRecentVoterNames()

  useBodyScrollLock(true)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter your name')
      return
    }
    onSave(trimmed)
  }

  return createPortal(
    <div className="feed-name-prompt-backdrop" role="presentation">
      <div
        className="feed-name-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby={inputId}
      >
        <p className="feed-name-prompt-eyebrow">{eyebrow}</p>
        <h2 className="feed-name-prompt-title" id={inputId}>
          {title}
        </h2>
        <p className="feed-name-prompt-desc">{description}</p>
        <form className="feed-name-prompt-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="poll-input feed-name-prompt-input"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            placeholder="Your name"
            autoComplete="name"
            enterKeyHint="done"
            maxLength={80}
            list="feed-name-suggestions"
          />
          <datalist id="feed-name-suggestions">
            {recentNames.map((entry) => (
              <option key={entry} value={entry} />
            ))}
          </datalist>
          {error && <p className="poll-message poll-message-error">{error}</p>}
          <button type="submit" className="poll-button poll-button-primary feed-name-prompt-submit">
            Continue
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
