export default function PollRosterBoard({
  groups,
  votedNames,
  interactive = false,
  registering = false,
  onSelectName,
  title = 'Guest list',
  showSummary = true,
}) {
  const rosterCount = groups.reduce(
    (total, group) =>
      total + group.entries.filter((entry) => !entry.isExtra).length,
    0
  )
  const extraCount = groups.reduce(
    (total, group) =>
      total + group.entries.filter((entry) => entry.isExtra).length,
    0
  )
  const totalGuests = rosterCount + extraCount
  const votedCount = votedNames.size

  if (totalGuests === 0) {
    return null
  }

  return (
    <section className="poll-roster-board" aria-label="Guest voting status">
      <div className="poll-roster-board-header">
        <h2 className="poll-roster-board-title">{title}</h2>
        {showSummary && (
          <p className="poll-roster-board-summary">
            <span className="poll-roster-board-summary-count">{votedCount}</span>
            {' of '}
            <span className="poll-roster-board-summary-count">{totalGuests}</span>
            {' guests have voted'}
          </p>
        )}
      </div>

      <div className="poll-roster-groups">
        {groups.map((group) => (
          <section
            key={group.id ?? 'unassigned'}
            className="poll-roster-group"
          >
            <h3 className="poll-roster-group-title">{group.name}</h3>
            <div className="poll-roster-tiles">
              {group.entries.map((entry) => {
                const hasVoted = votedNames.has(entry.display_name.toLowerCase())
                const tileClass = [
                  'poll-roster-tile',
                  hasVoted ? 'poll-roster-tile-voted' : 'poll-roster-tile-pending',
                  entry.isExtra ? 'poll-roster-tile-extra' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                if (interactive) {
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={tileClass}
                      disabled={registering}
                      onClick={() => onSelectName?.(entry.display_name)}
                    >
                      <span className="poll-roster-tile-status" aria-hidden="true">
                        {hasVoted ? '✓' : '·'}
                      </span>
                      <span className="poll-roster-tile-name">{entry.display_name}</span>
                      <span className="poll-roster-tile-badge">
                        {hasVoted ? 'Voted' : 'Not yet'}
                      </span>
                    </button>
                  )
                }

                return (
                  <div key={entry.id} className={tileClass}>
                    <span className="poll-roster-tile-status" aria-hidden="true">
                      {hasVoted ? '✓' : '·'}
                    </span>
                    <span className="poll-roster-tile-name">{entry.display_name}</span>
                    <span className="poll-roster-tile-badge">
                      {hasVoted ? 'Voted' : 'Not yet'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
