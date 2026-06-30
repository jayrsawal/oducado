function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - (-2 * progress + 2) ** 3 / 2
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const CAROUSEL_SCROLL_DURATION = 850

export function smoothScrollTo(element, targetLeft, duration = CAROUSEL_SCROLL_DURATION, onComplete) {
  if (!element) return

  if (prefersReducedMotion()) {
    element.scrollLeft = targetLeft
    onComplete?.()
    return
  }

  const startLeft = element.scrollLeft
  const distance = targetLeft - startLeft

  if (Math.abs(distance) < 1) {
    onComplete?.()
    return
  }

  const startTime = performance.now()

  function step(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    element.scrollLeft = startLeft + distance * easeInOutCubic(progress)

    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      onComplete?.()
    }
  }

  requestAnimationFrame(step)
}

export function scrollToCarouselPage(container, pageIndex, duration = CAROUSEL_SCROLL_DURATION, onComplete) {
  if (!container) return

  const targetLeft = pageIndex * container.clientWidth
  const previousSnap = container.style.scrollSnapType
  container.style.scrollSnapType = 'none'

  smoothScrollTo(container, targetLeft, duration, () => {
    container.style.scrollSnapType = previousSnap
    onComplete?.()
  })
}
