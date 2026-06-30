const UNASSIGNED_STORY_KEY = '__unassigned__'

function openStoryKey(photo) {
  const name = photo.display_name?.trim()
  if (name && name.toLowerCase() !== 'shared moment') {
    return `open:name:${name.toLowerCase()}`
  }
  return `open:device:${photo.device_id}`
}

function openStoryName(photo) {
  const name = photo.display_name?.trim()
  if (name && name.toLowerCase() !== 'shared moment') return name
  return 'Guest'
}

export function buildTableStories(photos) {
  const groups = new Map()

  for (const photo of photos) {
    if (photo.media_type === 'video') continue
    if (photo.poll_id && !photo.table_id) continue

    const key = photo.is_open_upload
      ? photo.table_id
        ? photo.table_id
        : openStoryKey(photo)
      : photo.table_id ?? UNASSIGNED_STORY_KEY
    const name = photo.is_open_upload
      ? photo.table_id
        ? photo.table_name ?? 'Table'
        : openStoryName(photo)
      : photo.table_name ?? 'Other'

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        kind: 'table',
        tableId: photo.is_open_upload && !photo.table_id ? null : photo.table_id,
        name,
        photos: [],
      })
    }

    groups.get(key).photos.push(photo)
  }

  return finalizeStoryGroups(groups)
}

export function buildPollStories(photos) {
  const groups = new Map()

  for (const photo of photos) {
    if (!photo.poll_id || photo.media_type === 'video') continue

    const key = `poll:${photo.poll_id}`
    const name = photo.poll_title ?? 'Poll'

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        kind: 'poll',
        pollId: photo.poll_id,
        name,
        photos: [],
      })
    }

    groups.get(key).photos.push(photo)
  }

  return finalizeStoryGroups(groups)
}

export function buildFeedStories(photos) {
  return [...buildPollStories(photos), ...buildTableStories(photos)].sort(
    (a, b) => new Date(b.latestAt) - new Date(a.latestAt)
  )
}

function finalizeStoryGroups(groups) {
  return [...groups.values()]
    .map((group) => {
      const ordered = [...group.photos].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      )
      const latest = ordered[ordered.length - 1]

      return {
        ...group,
        photos: ordered,
        coverPhoto: latest,
        latestAt: latest?.created_at ?? '',
      }
    })
    .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt))
}
