import { h } from 'preact'
import { useMemo, useState } from 'preact/hooks'

import { DecisionAction, DecisionEntry } from '../types'
import { DecisionCard } from './DecisionCard'
import styles from '../styles/plugin.module.css'

interface Props {
  decisions: Record<string, DecisionEntry[]>
}

type FilterValue = 'all' | DecisionAction

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Figma Update', value: 'figma-update-needed' },
  { label: 'Figma Create', value: 'figma-create-needed' },
  { label: 'Completed', value: 'completed' },
  { label: 'No Action', value: 'none' },
]

export function DecisionsTab({ decisions }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all')

  // Sort dates descending
  const sortedDates = useMemo(
    () => Object.keys(decisions).sort((a, b) => b.localeCompare(a)),
    [decisions]
  )

  const filteredByDate = useMemo(() => {
    const result: [string, DecisionEntry[]][] = []
    for (const date of sortedDates) {
      const entries = decisions[date] ?? []
      const filtered = filter === 'all' ? entries : entries.filter((d) => d.action === filter)
      if (filtered.length > 0) {
        result.push([date, filtered])
      }
    }
    return result
  }, [decisions, sortedDates, filter])

  const totalCount = Object.values(decisions).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--figma-color-text-secondary)', marginBottom: '8px' }}>
        {totalCount} decision{totalCount !== 1 ? 's' : ''} logged
      </div>

      <div class={styles.filterBar}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            class={`${styles.filterBtn} ${filter === f.value ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredByDate.map(([date, entries]) => (
        <div key={date}>
          <div class={styles.dateGroup}>{date}</div>
          {entries.map((d, i) => (
            <DecisionCard key={`${date}-${i}`} decision={d} />
          ))}
        </div>
      ))}

      {filteredByDate.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--figma-color-text-secondary)' }}>
          No decisions match the current filter
        </div>
      )}
    </div>
  )
}
