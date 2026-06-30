import { useMemo } from 'react'
import PollRosterBoard from './PollRosterBoard'
import { sortGuestsAlphabetically } from '../lib/roster'

export default function TablePhotoGuestList({ table, roster, onSelectName }) {
  const entries = useMemo(
    () => sortGuestsAlphabetically(roster.filter((entry) => entry.table_id === table.id)),
    [roster, table.id]
  )

  const groups = useMemo(
    () => [{ id: table.id, name: table.name, entries }],
    [table, entries]
  )

  if (entries.length === 0) {
    return (
      <p className="poll-hint">
        No guests are assigned to {table.name} yet. Ask an organizer to update the roster.
      </p>
    )
  }

  return (
    <PollRosterBoard
      groups={groups}
      votedNames={new Set()}
      interactive
      onSelectName={onSelectName}
      title={`${table.name} — select your name`}
      showSummary={false}
    />
  )
}
