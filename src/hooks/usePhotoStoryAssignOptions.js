import { useMemo } from 'react'
import { useAlbumRoster } from './useAlbumRoster'
import { flattenPollOptions, useActivePollWithOptions } from './useActivePollWithOptions'

export function usePhotoStoryAssignOptions(albumId, displayName) {
  const { roster, tables } = useAlbumRoster(albumId)
  const { poll } = useActivePollWithOptions({ includeClosed: true })

  const tableAssignOptions = useMemo(
    () => tables.map((table) => ({ tableId: table.id, tableName: table.name })),
    [tables]
  )

  const pollAssign = useMemo(() => {
    const options = flattenPollOptions(poll)
    if (!poll || options.length === 0) return null
    return { poll, options }
  }, [poll])

  const rosterTableIds = useMemo(() => {
    const name = displayName?.trim().toLowerCase()
    if (!name) return []

    return roster
      .filter((entry) => entry.table_id && entry.display_name.trim().toLowerCase() === name)
      .map((entry) => entry.table_id)
  }, [displayName, roster])

  const hasStoryTargets =
    tableAssignOptions.length > 0 || (pollAssign?.options?.length ?? 0) > 0

  return {
    tableAssignOptions,
    pollAssign,
    rosterTableIds,
    hasStoryTargets,
  }
}
