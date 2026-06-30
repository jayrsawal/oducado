const DEVICE_KEY = 'oducado_device_id'
const NAMES_KEY = 'oducado_voter_names'
const FEED_NAME_KEY = 'oducado_feed_name'

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function getRecentVoterNames() {
  try {
    const names = JSON.parse(localStorage.getItem(NAMES_KEY))
    return Array.isArray(names) ? names : []
  } catch {
    return []
  }
}

export function rememberVoterName(name) {
  const trimmed = name.trim()
  if (!trimmed) return

  const names = getRecentVoterNames().filter(
    (entry) => entry.toLowerCase() !== trimmed.toLowerCase()
  )
  names.unshift(trimmed)
  localStorage.setItem(NAMES_KEY, JSON.stringify(names.slice(0, 8)))
}

export function getFeedDisplayName() {
  return localStorage.getItem(FEED_NAME_KEY) ?? ''
}

export function rememberFeedDisplayName(name) {
  const trimmed = name.trim()
  if (!trimmed) return
  localStorage.setItem(FEED_NAME_KEY, trimmed)
  rememberVoterName(trimmed)
}
