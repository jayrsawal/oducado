import { useEffect, useMemo, useRef, useState } from 'react'
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

function buildExpandedCategoryIds(categories, selections) {
  const selected = new Set(selections)
  const expanded = new Set()

  for (const category of categories) {
    const hasSelection = category.poll_options.some((option) => selected.has(option.id))
    if (hasSelection) expanded.add(category.id)
  }

  return expanded
}

function selectedLabelsForCategory(category, selected) {
  return category.poll_options
    .filter((option) => selected.has(option.id))
    .map((option) => option.label)
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
  const [invalidCategoryIds, setInvalidCategoryIds] = useState(() => new Set())
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(() => new Set())
  const categoryRefs = useRef({})

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

  useEffect(() => {
    setSelected(new Set(initialSelections))
    setExpandedCategoryIds(buildExpandedCategoryIds(categories, initialSelections))
    setSuccess(false)
    setError(null)
    setInvalidCategoryIds(new Set())
  }, [initialSelections, categories])

  const selectionsUnchanged = useMemo(
    () => selectionsMatch(selected, initialSelections),
    [selected, initialSelections]
  )

  useEffect(() => {
    onBallotStateChange?.({ selectionsUnchanged, submitting })
  }, [selectionsUnchanged, submitting, onBallotStateChange])

  function selectionCountForCategory(category) {
    const categoryOptionIds = new Set(
      category.poll_options.map((option) => option.id)
    )
    return [...selected].filter((id) => categoryOptionIds.has(id)).length
  }

  function scrollToCategory(categoryId) {
    const node = categoryRefs.current[categoryId]
    if (!node) return
    setExpandedCategoryIds((prev) => new Set(prev).add(categoryId))
    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function toggleCategoryExpanded(categoryId) {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function toggleOption(category, optionId) {
    setError(null)
    setInvalidCategoryIds(new Set())
    setSuccess(false)
    setExpandedCategoryIds((prev) => new Set(prev).add(category.id))
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
    const errors = []
    const invalidIds = []

    for (const category of categories) {
      const count = selectionCountForCategory(category)
      let invalid = false

      if (count < category.min_selections) {
        errors.push(
          `"${category.name}" needs at least ${category.min_selections} selection(s) (you chose ${count}).`
        )
        invalid = true
      }
      if (
        category.max_selections != null &&
        count > category.max_selections
      ) {
        errors.push(
          `"${category.name}" allows at most ${category.max_selections} selection(s).`
        )
        invalid = true
      }

      if (invalid) invalidIds.push(category.id)
    }

    return {
      message: errors.length > 0 ? errors.join(' ') : null,
      invalidCategoryIds: invalidIds,
      firstInvalidCategoryId: invalidIds[0] ?? null,
    }
  }

  function shouldCollapseCategoryOptions(category) {
    if (category.max_selections !== 1) return false
    return selectionCountForCategory(category) > 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validation = validate()
    if (validation.message) {
      setError(validation.message)
      setInvalidCategoryIds(new Set(validation.invalidCategoryIds))
      setExpandedCategoryIds((prev) => {
        const next = new Set(prev)
        for (const id of validation.invalidCategoryIds) next.add(id)
        return next
      })
      if (validation.firstInvalidCategoryId) {
        scrollToCategory(validation.firstInvalidCategoryId)
      }
      return
    }

    setInvalidCategoryIds(new Set())
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
      {error && (
        <p
          className={`poll-message poll-message-error poll-ballot-error${
            hideSubmitButton ? ' poll-ballot-error-floating' : ''
          }`}
          role="alert"
        >
          {error}
        </p>
      )}

      {categories.map((category) => {
        const isExpanded = expandedCategoryIds.has(category.id)
        const selectionCount = selectionCountForCategory(category)
        const selectedLabels = selectedLabelsForCategory(category, selected)

        return (
        <section
          key={category.id}
          ref={(node) => {
            if (node) categoryRefs.current[category.id] = node
            else delete categoryRefs.current[category.id]
          }}
          className={`poll-category${
            invalidCategoryIds.has(category.id) ? ' poll-category-incomplete' : ''
          }${isExpanded ? ' poll-category-expanded' : ' poll-category-collapsed'}`}
          aria-disabled={disabled || undefined}
        >
          <button
            type="button"
            className="poll-category-toggle"
            onClick={() => toggleCategoryExpanded(category.id)}
            aria-expanded={isExpanded}
            disabled={disabled || submitting}
          >
            <span className="poll-category-toggle-main">
              <span className="poll-category-name">{category.name}</span>
              <span className="poll-category-hint">{selectionHint(category)}</span>
            </span>
            <span className="poll-category-toggle-meta">
              <span className="poll-category-summary">
                {selectionCount > 0
                  ? selectedLabels.join(', ')
                  : 'Not chosen yet'}
              </span>
              <span className="poll-category-chevron" aria-hidden="true" />
            </span>
          </button>

          {isExpanded && (
            <div className="poll-category-body">
          {category.description && (
            <p className="poll-category-description">{category.description}</p>
          )}
          <div
            className={`poll-options${
              shouldCollapseCategoryOptions(category) ? ' poll-options-collapsed' : ''
            }`}
          >
            {category.poll_options.map((option) => {
              const isSelected = selected.has(option.id)
              if (shouldCollapseCategoryOptions(category) && !isSelected) {
                return null
              }

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
            </div>
          )}
        </section>
        )
      })}

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
