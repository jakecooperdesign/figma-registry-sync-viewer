import { h } from 'preact'
import { useMemo, useState } from 'preact/hooks'

import { ComponentComparisonResult } from '../types'
import { ComponentRow } from './ComponentRow'
import { SummaryBar } from './SummaryBar'
import styles from '../styles/plugin.module.css'

interface Props {
  results: ComponentComparisonResult[]
}

export function ComponentsTab({ results }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (statusFilter) {
        const normalized = r.status === 'in-sync' ? 'synced' : r.status
        if (normalized !== statusFilter) return false
      }
      if (search) {
        const q = search.toLowerCase()
        if (
          !r.name.toLowerCase().includes(q) &&
          !r.registryEntry?.codePath?.toLowerCase().includes(q) &&
          !r.registryEntry?.figmaName?.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [results, search, statusFilter])

  const registry = filtered.filter((r) => r.status !== 'untracked')
  const untracked = filtered.filter((r) => r.status === 'untracked')

  const summaryItems = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of results) {
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
  }, [results])

  return (
    <div>
      <SummaryBar items={summaryItems} activeFilter={statusFilter} onFilterChange={setStatusFilter} />

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
            <ComponentRow key={r.name} result={r} />
          ))}
        </div>
      )}

      {untracked.length > 0 && (
        <div>
          <div class={styles.sectionTitle}>Untracked in Figma ({untracked.length})</div>
          {untracked.map((r) => (
            <ComponentRow key={r.figmaComponent?.id ?? r.name} result={r} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--figma-color-text-secondary)' }}>
          No components match {search ? `"${search}"` : ''}{search && statusFilter ? ' with ' : ''}{statusFilter ? `status "${statusFilter}"` : ''}
        </div>
      )}
    </div>
  )
}
