import { useEffect } from 'react'

let lockCount = 0
let lockedScrollY = 0

function applyBodyScrollLock() {
  if (lockCount !== 1) return

  lockedScrollY = window.scrollY
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${lockedScrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
}

function releaseBodyScrollLock() {
  if (lockCount !== 0) return

  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  window.scrollTo(0, lockedScrollY)
}

export default function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined

    lockCount += 1
    applyBodyScrollLock()

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      releaseBodyScrollLock()
    }
  }, [locked])
}
