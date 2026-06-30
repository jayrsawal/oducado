import { useRef, useState } from 'react'
import LazyPhoto from './LazyPhoto'

const DRAG_THRESHOLD_PX = 4

export default function PhotoFeedStories({ stories, onSelectStory }) {
  const scrollRef = useRef(null)
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
    pointerId: null,
  })
  const [isDragging, setIsDragging] = useState(false)

  if (stories.length === 0) return null

  function endDrag() {
    if (!dragRef.current.active) return

    const el = scrollRef.current
    if (el && dragRef.current.moved && dragRef.current.pointerId != null) {
      el.releasePointerCapture(dragRef.current.pointerId)
    }

    dragRef.current.active = false
    dragRef.current.pointerId = null
    setIsDragging(false)
  }

  function handleStoryClick(index, event) {
    if (dragRef.current.moved) {
      event.preventDefault()
      event.stopPropagation()
      dragRef.current.moved = false
      return
    }
    onSelectStory(index)
  }

  function handlePointerDown(event) {
    if (event.button !== 0 || event.pointerType === 'touch') return

    const el = scrollRef.current
    if (!el) return

    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      pointerId: event.pointerId,
    }
  }

  function handlePointerMove(event) {
    if (!dragRef.current.active) return

    const el = scrollRef.current
    if (!el) return

    const deltaX = event.clientX - dragRef.current.startX

    if (!dragRef.current.moved) {
      if (Math.abs(deltaX) <= DRAG_THRESHOLD_PX) return

      dragRef.current.moved = true
      setIsDragging(true)
      if (dragRef.current.pointerId != null) {
        el.setPointerCapture(dragRef.current.pointerId)
      }
    }

    el.scrollLeft = dragRef.current.scrollLeft - deltaX
  }

  return (
    <div className="photo-feed-stories-wrap">
      <div
        ref={scrollRef}
        className={`photo-feed-stories${isDragging ? ' photo-feed-stories-dragging' : ''}`}
        role="list"
        aria-label="Table stories"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {stories.map((story, index) => (
          <button
            key={story.id}
            type="button"
            className="photo-feed-stories-item"
            role="listitem"
            onClick={(event) => handleStoryClick(index, event)}
            aria-label={`View ${story.name} photos, ${story.photos.length} ${
              story.photos.length === 1 ? 'photo' : 'photos'
            }`}
          >
            <span className="photo-feed-stories-ring">
              <span className="photo-feed-stories-thumb">
                <LazyPhoto src={story.coverPhoto.public_url} alt="" draggable={false} />
              </span>
            </span>
            <span className="photo-feed-stories-label">{story.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
