import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import PhotoWatermark from './PhotoWatermark'

const STORY_SLIDE_MS = 5000
const SWIPE_THRESHOLD_PX = 48

export default function PhotoStoryViewer({ stories, storyIndex, photoIndex, onChange, onClose }) {
  useBodyScrollLock(true)

  const [paused, setPaused] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const timerRef = useRef(null)

  const story = stories[storyIndex]
  const photos = story?.photos ?? []
  const photo = photos[photoIndex]
  const hasPrevPhoto = photoIndex > 0
  const hasNextPhoto = photoIndex < photos.length - 1
  const hasPrevStory = storyIndex > 0
  const hasNextStory = storyIndex < stories.length - 1

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const goTo = useCallback(
    (nextStoryIndex, nextPhotoIndex) => {
      if (!stories[nextStoryIndex]?.photos[nextPhotoIndex]) return
      onChange(nextStoryIndex, nextPhotoIndex)
    },
    [onChange, stories]
  )

  const goNext = useCallback(() => {
    if (hasNextPhoto) {
      goTo(storyIndex, photoIndex + 1)
      return
    }
    if (hasNextStory) {
      goTo(storyIndex + 1, 0)
    } else {
      onClose()
    }
  }, [goTo, hasNextPhoto, hasNextStory, onClose, photoIndex, stories, storyIndex])

  const goPrev = useCallback(() => {
    if (hasPrevPhoto) {
      goTo(storyIndex, photoIndex - 1)
      return
    }
    if (hasPrevStory) {
      const prevPhotos = stories[storyIndex - 1].photos
      goTo(storyIndex - 1, prevPhotos.length - 1)
    }
  }, [goTo, hasPrevPhoto, hasPrevStory, photoIndex, stories, storyIndex])

  useEffect(() => {
    if (!photo || paused) {
      clearTimer()
      return undefined
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return undefined

    timerRef.current = setTimeout(() => {
      goNext()
    }, STORY_SLIDE_MS)

    return clearTimer
  }, [clearTimer, goNext, paused, photo, photoIndex, storyIndex])

  useEffect(() => {
    if (!photo) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev, onClose, photo])

  function handlePointerDown() {
    setPaused(true)
  }

  function handlePointerUp() {
    setPaused(false)
  }

  function handleTapZone(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const third = rect.width / 3

    if (x < third) goPrev()
    else if (x > third * 2) goNext()
  }

  function handleTouchStart(event) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
    touchStartY.current = event.changedTouches[0]?.clientY ?? null
    setPaused(true)
  }

  function handleTouchEnd(event) {
    setPaused(false)

    const startX = touchStartX.current
    const startY = touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    const endX = event.changedTouches[0]?.clientX
    const endY = event.changedTouches[0]?.clientY
    if (endX == null || endY == null || startX == null || startY == null) return

    const deltaX = endX - startX
    const deltaY = endY - startY

    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > SWIPE_THRESHOLD_PX * 1.5) {
      onClose()
      return
    }

    if (deltaX <= -SWIPE_THRESHOLD_PX) goNext()
    else if (deltaX >= SWIPE_THRESHOLD_PX) goPrev()
  }

  if (!story || !photo) return null

  return createPortal(
    <div className="photo-story-viewer" role="dialog" aria-modal="true" aria-label={`${story.name} story`}>
      <div className="photo-story-viewer-top">
        <div className="photo-story-progress" aria-hidden="true">
          {photos.map((entry, index) => (
            <div key={entry.id} className="photo-story-progress-segment">
              <div
                className={`photo-story-progress-fill${
                  index < photoIndex ? ' photo-story-progress-fill-complete' : ''
                }${index === photoIndex ? ' photo-story-progress-fill-active' : ''}${
                  index === photoIndex && paused ? ' photo-story-progress-fill-paused' : ''
                }`}
                style={
                  index === photoIndex && !paused
                    ? { animationDuration: `${STORY_SLIDE_MS}ms` }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
        <div className="photo-story-viewer-header">
          <div className="photo-story-viewer-meta">
            <span className="photo-story-viewer-avatar" aria-hidden="true">
              {(story.name?.trim()?.[0] ?? '?').toUpperCase()}
            </span>
            <span className="photo-story-viewer-name">{story.name}</span>
          </div>
          <button
            type="button"
            className="photo-story-viewer-close"
            onClick={onClose}
            aria-label="Close story"
          >
            ×
          </button>
        </div>
      </div>

      <button
        type="button"
        className="photo-story-viewer-stage"
        onClick={handleTapZone}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="Story photo"
      >
        <figure className="photo-story-viewer-frame">
          <img
            key={photo.id}
            src={photo.public_url}
            alt=""
            className="photo-story-viewer-image"
          />
          <PhotoWatermark
            displayName={photo.display_name}
            tableName={photo.table_name}
            createdAt={photo.created_at}
            size="large"
          />
        </figure>
      </button>
    </div>,
    document.body
  )
}
