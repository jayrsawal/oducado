const OPEN_STORY_KEY = '__open__'
const UNASSIGNED_STORY_KEY = '__unassigned__'

export function buildTableStories(photos) {
  const groups = new Map()

  for (const photo of photos) {
    const key = photo.is_open_upload
      ? OPEN_STORY_KEY
      : photo.table_id ?? UNASSIGNED_STORY_KEY
    const name = photo.is_open_upload ? 'Quick share' : photo.table_name ?? 'Other'

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        tableId: photo.is_open_upload ? null : photo.table_id,
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
