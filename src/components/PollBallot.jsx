import { useEffect, useMemo, useState } from 'react'
import OptionVisual from './OptionVisual'
import { sortPollOptions } from '../lib/supabase'

function selectionsMatch(selected, initialSelections) {
  const initial = new Set(initialSelections)
  if (selected.size !== initial.size) return false
  for (const id of selected) {
    if (!initial.has(id)) return false
  }
  return true
}

function selectionHint(category) {
  const { min_selections: min, max_selections: max } = category
  if (min > 0 && max != null && min === max) {
    return `Select exactly ${min}`
  }
  if (min > 0 && max != null) {
    return `Select ${min}–${max}`
  }
  if (min > 0) {
    return `Select at least ${min}`
  }
  if (max != null) {
    return `Select up to ${max}`
  }
  return 'Optional'
}

export default function PollBallot({
  poll,
  initialSelections = [],
  submitLabel = 'Submit vote',
  onSubmit,
  disabled = false,
  formId,
  hideSubmitButton = false,
  onBallotStateChange,
}) {
  const [selected, setSelected] = useState(() => new Set(initialSelections))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setSelected(new Set(initialSelections))
    setSuccess(false)
    setError(null)
  }, [initialSelections])

  const categories = useMemo(
    () =>
      [...(poll.poll_categories ?? [])]
        .sort((a, b) => a.display_order - b.display_order)
        .map((category) => ({
          ...category,
          poll_options: sortPollOptions(category.poll_options),
        })),
    [poll.poll_categories]
  )

  const selectionsUnchanged = useMemo(
    () => selectionsMatch(selected, initialSelections),
    [selected, initialSelections]
  )

  useEffect(() => {
    onBallotStateChange?.({ selectionsUnchanged, submitting })
  }, [selectionsUnchanged, submitting, onBallotStateChange])

  function toggleOption(category, optionId) {
    setError(null)
    setSuccess(false)
    setSelected((prev) => {
      const next = new Set(prev)
      const categoryOptionIds = new Set(
        category.poll_options.map((option) => option.id)
      )
      const selectedInCategory = [...next].filter((id) =>
        categoryOptionIds.has(id)
      )

      if (next.has(optionId)) {
        next.delete(optionId)
        return next
      }

      if (
        category.max_selections != null &&
        selectedInCategory.length >= category.max_selections
      ) {
        if (category.max_selections === 1) {
          for (const id of selectedInCategory) next.delete(id)
          next.add(optionId)
        } else {
          setError(
            `"${category.name}" allows at most ${category.max_selections} selection(s).`
          )
        }
        return next
      }

      next.add(optionId)
      return next
    })
  }

  function validate() {
    for (const category of categories) {
      const categoryOptionIds = new Set(
        category.poll_options.map((option) => option.id)
      )
      const count = [...selected].filter((id) => categoryOptionIds.has(id)).length

      if (count < category.min_selections) {
        return `"${category.name}" requires at least ${category.min_selections} selection(s).`
      }
      if (
        category.max_selections != null &&
        count > category.max_selections
      ) {
        return `"${category.name}" allows at most ${category.max_selections} selection(s).`
      }
    }
    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit([...selected])
      setSuccess(true)
    } catch (err) {
      setError(err.message ?? 'Failed to submit vote')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form id={formId} className="poll-ballot" onSubmit={handleSubmit}>
      {categories.map((category) => (
        <fieldset key={category.id} className="poll-category" disabled={disabled}>
          <legend className="poll-category-header">
            <span className="poll-category-name">{category.name}</span>
            <span className="poll-category-hint">{selectionHint(category)}</span>
          </legend>
          {category.description && (
            <p className="poll-category-description">{category.description}</p>
          )}
          <div className="poll-options">
            {category.poll_options.map((option) => {
              const isSelected = selected.has(option.id)
              return (
                <label
                  key={option.id}
                  className={[
                    'poll-option',
                    'poll-option-tile',
                    'poll-option-tile-has-photo',
                    isSelected && 'poll-option-selected',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <input
                    type="checkbox"
                    className="poll-option-input"
                    checked={isSelected}
                    onChange={() => toggleOption(category, option.id)}
                    disabled={disabled || submitting}
                  />
                  <span className="poll-option-check" aria-hidden="true" />
                  <span className="poll-option-content">
                    <OptionVisual
                      src={option.image_url}
                      frameClass="poll-option-photo-frame"
                      imageClass="poll-option-image"
                      placeholderClass="poll-option-photo-placeholder"
                    />
                    <span className="poll-option-caption">
                      <span className="poll-option-label">{option.label}</span>
                      {option.description && (
                        <span className="poll-option-description">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}

      {error && <p className="poll-message poll-message-error">{error}</p>}
      {success && (
        <p className="poll-message poll-message-success">Vote submitted!</p>
      )}

      {!disabled && !hideSubmitButton && (
        <button
          type="submit"
          className="poll-button poll-button-primary"
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : submitLabel}
        </button>
      )}
    </form>
  )
}
