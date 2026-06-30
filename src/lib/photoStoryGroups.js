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
        tableId: photo.is_open_upload && !photo.table_id ? null : photo.table_id,
        name,
        photos: [],
      })
    }

    groups.get(key).photos.push(photo)
  }

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
