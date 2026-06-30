const DEVICE_KEY = 'oducado_device_id'
const NAMES_KEY = 'oducado_voter_names'

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
