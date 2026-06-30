import { useEffect } from 'react'

let lockCount = 0

function applyBodyScrollLock() {
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden'
  }
}

function releaseBodyScrollLock() {
  if (lockCount === 0) {
    document.body.style.overflow = ''
  }
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
