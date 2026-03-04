import { h } from 'preact'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'

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

type SortKey = 'status' | 'name' | 'name-desc' | 'category'
const SORT_OPTIONS: { label: string; key: SortKey }[] = [
  { label: 'Status priority', key: 'status' },
  { label: 'Name A\u2013Z', key: 'name' },
  { label: 'Name Z\u2013A', key: 'name-desc' },
  { label: 'Category', key: 'category' },
]

const STATUS_ORDER: Record<string, number> = {
  'value-diff': 0,
  'missing': 1,
  'matched': 2,
}

const CATEGORY_ORDER: Record<string, number> = {
  'primitives': 0,
  'semantics': 1,
  'spacing': 2,
}

export function TokensTab({ results }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all')
  const [search, setSearch] = useState('')
  const [sortIndex, setSortIndex] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)

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

  const sorted = useMemo(() => {
    const key = SORT_OPTIONS[sortIndex].key
    return [...filtered].sort((a, b) => {
      switch (key) {
        case 'status': {
          const aPri = STATUS_ORDER[a.status] ?? 3
          const bPri = STATUS_ORDER[b.status] ?? 3
          if (aPri !== bPri) return aPri - bPri
          return a.name.localeCompare(b.name)
        }
        case 'name':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'category': {
          const aCat = CATEGORY_ORDER[a.category] ?? 3
          const bCat = CATEGORY_ORDER[b.category] ?? 3
          if (aCat !== bCat) return aCat - bCat
          return a.name.localeCompare(b.name)
        }
        default:
          return 0
      }
    })
  }, [filtered, sortIndex])

  // Reset focus when filters change
  useEffect(() => {
    setFocusedIndex(-1)
  }, [filter, search, sortIndex])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, sorted.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Escape') {
        setFocusedIndex(-1)
      }
    },
    [sorted.length]
  )

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const rows = listRef.current.querySelectorAll('[data-row-index]')
      const row = rows[focusedIndex] as HTMLElement | undefined
      row?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

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
    <div onKeyDown={handleKeyDown} tabIndex={0} ref={listRef}>
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

      <div class={styles.searchRow}>
        <input
          class={styles.searchInput}
          type="text"
          placeholder="Search tokens..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
        <select
          class={styles.sortSelect}
          value={sortIndex}
          onChange={(e) => setSortIndex(Number((e.target as HTMLSelectElement).value))}
        >
          {SORT_OPTIONS.map((opt, i) => (
            <option key={opt.key} value={i}>{opt.label}</option>
          ))}
        </select>
      </div>

      {sorted.map((r, i) => (
        <TokenRow
          key={`${r.category}-${r.name}`}
          result={r}
          isFocused={focusedIndex === i}
          rowIndex={i}
        />
      ))}

      {sorted.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--figma-color-text-secondary)' }}>
          No tokens match the current filters
        </div>
      )}
    </div>
  )
}
