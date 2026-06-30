function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - (-2 * progress + 2) ** 3 / 2
}

export function smoothScrollTo(element, targetLeft, duration = 650) {
  if (!element) return

  const startLeft = element.scrollLeft
  const distance = targetLeft - startLeft

  if (Math.abs(distance) < 1) return

  const startTime = performance.now()

  function step(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    element.scrollLeft = startLeft + distance * easeInOutCubic(progress)

    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

export function centerElementInScrollContainer(container, element, duration) {
  if (!container || !element) return

  const scrollLeft =
    element.offsetLeft - (container.clientWidth - element.offsetWidth) / 2

  smoothScrollTo(container, Math.max(0, scrollLeft), duration)
}
