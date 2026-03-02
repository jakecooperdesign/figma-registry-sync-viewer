import { h } from 'preact'
import { useMemo, useState } from 'preact/hooks'

import { TokenCategory, TokenComparisonResult } from '../types'
import { SummaryBar } from './SummaryBar'
import { TokenRow } from './TokenRow'
import styles from '../styles/plugin.module.css'

interface Props {
  results: TokenComparisonResult[]
}

type FilterValue = 'all' | TokenCategory

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Primitives', value: 'primitives' },
  { label: 'Semantics', value: 'semantics' },
  { label: 'Spacing', value: 'spacing' },
]

export function TokensTab({ results }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = results
    if (filter !== 'all') {
      list = list.filter((r) => r.category === filter)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.registryEntry.cssVar.toLowerCase().includes(q)
      )
    }
    return list
  }, [results, filter, search])

  const summaryItems = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of results) {
      counts[r.status] = (counts[r.status] ?? 0) + 1
    }
    return [
      { label: 'matched', count: counts['matched'] ?? 0, status: 'matched' },
      { label: 'missing', count: counts['missing'] ?? 0, status: 'missing' },
      { label: 'value diff', count: counts['value-diff'] ?? 0, status: 'value-diff' },
    ].filter((i) => i.count > 0)
  }, [results])

  return (
    <div>
      <SummaryBar items={summaryItems} />

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

      <div class={styles.searchWrap}>
        <input
          class={styles.searchInput}
          type="text"
          placeholder="Search tokens..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
      </div>

      {filtered.map((r) => (
        <TokenRow key={`${r.category}-${r.name}`} result={r} />
      ))}

      {filtered.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--figma-color-text-secondary)' }}>
          No tokens match the current filters
        </div>
      )}
    </div>
  )
}
