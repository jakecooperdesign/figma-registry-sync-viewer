import { h } from 'preact'
import { useMemo, useState } from 'preact/hooks'

import { KIND_COLORS } from '../constants'
import { ComponentComparisonResult, ComponentKind } from '../types'
import { ComponentRow } from './ComponentRow'
import { Icon } from './Icon'
import { SummaryBar } from './SummaryBar'
import styles from '../styles/plugin.module.css'

const STATUS_ORDER: Record<string, number> = {
  'drift': 0,
  'missing': 1,
  'unverified': 2,
  'code-only': 3,
  'in-sync': 4,
  'synced': 4,
}

interface Props {
  results: ComponentComparisonResult[]
  ignoredComponents: string[]
  onIgnore: (name: string) => void
  onRestore: (name: string) => void
}

export function ComponentsTab({ results, ignoredComponents, onIgnore, onRestore }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<ComponentKind | null>(null)
  const [showIgnored, setShowIgnored] = useState(false)

  const ignoredSet = useMemo(() => new Set(ignoredComponents), [ignoredComponents])

  const applyFilters = (r: ComponentComparisonResult) => {
    if (statusFilter) {
      const normalized = r.status === 'in-sync' ? 'synced' : r.status
      if (normalized !== statusFilter) return false
    }
    if (kindFilter && r.kind !== kindFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !r.name.toLowerCase().includes(q) &&
        !r.registryEntry?.codePath?.toLowerCase().includes(q) &&
        !r.registryEntry?.figmaName?.toLowerCase().includes(q)
      ) return false
    }
    return true
  }

  const { active, ignored } = useMemo(() => {
    const active: ComponentComparisonResult[] = []
    const ignored: ComponentComparisonResult[] = []
    for (const r of results) {
      if (!applyFilters(r)) continue
      if (ignoredSet.has(r.name)) {
        ignored.push(r)
      } else {
        active.push(r)
      }
    }
    return { active, ignored }
  }, [results, search, statusFilter, kindFilter, ignoredSet])

  const sorted = useMemo(() => {
    return [...active].sort((a, b) => {
      const aPri = STATUS_ORDER[a.status] ?? 5
      const bPri = STATUS_ORDER[b.status] ?? 5
      if (aPri !== bPri) return aPri - bPri
      return a.name.localeCompare(b.name)
    })
  }, [active])

  const sortedIgnored = useMemo(() => {
    return [...ignored].sort((a, b) => a.name.localeCompare(b.name))
  }, [ignored])

  const registry = sorted.filter((r) => r.status !== 'untracked')
  const untracked = sorted.filter((r) => r.status === 'untracked')

  const summaryItems = useMemo(() => {
    // Count from non-ignored results only
    const counts: Record<string, number> = {}
    for (const r of results) {
      if (ignoredSet.has(r.name)) continue
      const s = r.status === 'in-sync' ? 'synced' : r.status
      counts[s] = (counts[s] ?? 0) + 1
    }
    return [
      { label: 'synced', count: counts['synced'] ?? 0, status: 'synced' },
      { label: 'code-only', count: counts['code-only'] ?? 0, status: 'code-only' },
      { label: 'missing', count: counts['missing'] ?? 0, status: 'missing' },
      { label: 'untracked', count: counts['untracked'] ?? 0, status: 'untracked' },
      { label: 'unverified', count: counts['unverified'] ?? 0, status: 'unverified' },
    ].filter((i) => i.count > 0)
  }, [results, ignoredSet])

  return (
    <div>
      <SummaryBar items={summaryItems} activeFilter={statusFilter} onFilterChange={setStatusFilter} />

      <div class={styles.filterBar}>
        {(['page', 'section', 'component'] as const).map((k) => {
          const isActive = kindFilter === k
          const colors = KIND_COLORS[k]
          return (
            <button
              key={k}
              class={`${styles.filterBtn} ${isActive ? styles.filterBtnActive : ''}`}
              style={isActive ? { color: colors.text } : undefined}
              onClick={() => setKindFilter(isActive ? null : k)}
            >
              {k}
            </button>
          )
        })}
      </div>

      <div class={styles.searchWrap}>
        <input
          class={styles.searchInput}
          type="text"
          placeholder="Search components..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
      </div>

      {registry.length > 0 && (
        <div>
          <div class={styles.sectionTitle}>Registry ({registry.length})</div>
          {registry.map((r) => (
            <ComponentRow key={r.name} result={r} onIgnore={onIgnore} />
          ))}
        </div>
      )}

      {untracked.length > 0 && (
        <div>
          <div class={styles.sectionTitle}>Untracked in Figma ({untracked.length})</div>
          {untracked.map((r) => (
            <ComponentRow key={r.figmaComponent?.id ?? r.name} result={r} onIgnore={onIgnore} />
          ))}
        </div>
      )}

      {active.length === 0 && ignored.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--figma-color-text-secondary)' }}>
          No components match {search ? `"${search}"` : ''}{search && statusFilter ? ' with ' : ''}{statusFilter ? `status "${statusFilter}"` : ''}
        </div>
      )}

      {ignored.length > 0 && (
        <div>
          <div
            class={styles.sectionTitle}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowIgnored(!showIgnored)}
          >
            <span class={`${styles.chevron} ${showIgnored ? styles.chevronOpen : ''}`} style={{ marginRight: '4px' }}><Icon name="caret-right" size={10} /></span>
            Ignored ({ignored.length})
          </div>
          {showIgnored && sortedIgnored.map((r) => (
            <ComponentRow key={r.name} result={r} onRestore={onRestore} />
          ))}
        </div>
      )}
    </div>
  )
}
