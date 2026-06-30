function compareNames(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function sortTablesAlphabetically(tables) {
  return tables
    .slice()
    .sort((a, b) => compareNames(a.name, b.name))
}

export function sortGuestsAlphabetically(entries) {
  return entries
    .slice()
    .sort((a, b) => compareNames(a.display_name, b.display_name))
}

export function groupRosterByTable(tables, entries) {
  const groups = sortTablesAlphabetically(tables).map((table) => ({
    id: table.id,
    name: table.name,
    entries: sortGuestsAlphabetically(
      entries.filter((entry) => entry.table_id === table.id)
    ),
  }))

  const unassigned = sortGuestsAlphabetically(
    entries.filter((entry) => !entry.table_id)
  )

  if (unassigned.length > 0) {
    groups.push({ id: null, name: 'Other guests', entries: unassigned })
  }

  return groups
}

const EXTRA_GROUP_ID = '__extra_voters__'

export function appendNonRosterVoters(groups, roster, votedDisplayNames) {
  const rosterLower = new Set(
    roster.map((entry) => entry.display_name.toLowerCase())
  )

  const extras = [...votedDisplayNames]
    .filter((name) => !rosterLower.has(name.toLowerCase()))
    .sort(compareNames)
    .map((display_name, index) => ({
      id: `extra-${display_name.toLowerCase()}`,
      display_name,
      display_order: index,
      table_id: null,
      isExtra: true,
    }))

  if (extras.length === 0) {
    return groups
  }

  return [
    ...groups,
    {
      id: EXTRA_GROUP_ID,
      name: 'Additional voters',
      entries: extras,
    },
  ]
}

export function buildRosterDisplayGroups(tables, roster, votedDisplayNames) {
  const groups = groupRosterByTable(tables, roster).filter(
    (group) => group.entries.length > 0
  )
  return appendNonRosterVoters(groups, roster, votedDisplayNames)
}
