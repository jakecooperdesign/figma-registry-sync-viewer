import { h } from 'preact'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'

import { KIND_COLORS, SORT_OPTIONS } from '../constants'
import { ComponentComparisonResult, ComponentEntry, ComponentKind, DriftEntry } from '../types'
import { ComponentRow } from './ComponentRow'
import { Icon } from './Icon'
import { SummaryBar } from './SummaryBar'
import styles from '../styles/plugin.module.css'

const STATUS_ORDER: Record<string, number> = {
  'drift-detected': 0,
  'drift': 0,
  'missing': 1,
  'unverified': 2,
  'outdated': 2,
  'code-only': 3,
  'in-sync': 4,
  'synced': 4,
}

const KIND_ORDER: Record<string, number> = {
  'page': 0,
  'section': 1,
  'component': 2,
}

interface Props {
  results: ComponentComparisonResult[]
  ignoredComponents: string[]
  pinnedComponents: string[]
  onIgnore: (name: string) => void
  onRestore: (name: string) => void
  onPin: (name: string) => void
  onUnpin: (name: string) => void
  onAddToRegistry: (result: ComponentComparisonResult) => void
  onMarkSynced: (result: ComponentComparisonResult) => void
  onUpdateFromFigma: (result: ComponentComparisonResult) => void
  onAcceptDrift: (name: string) => void
  onUndoOverride: (name: string) => void
  registryOverrides: Map<string, ComponentEntry>
  driftOverrides: { resolved: DriftEntry[] }
}

export function ComponentsTab({
  results,
  ignoredComponents,
  pinnedComponents,
  onIgnore,
  onRestore,
  onPin,
  onUnpin,
  onAddToRegistry,
  onMarkSynced,
  onUpdateFromFigma,
  onAcceptDrift,
  onUndoOverride,
  registryOverrides,
  driftOverrides,
}: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<ComponentKind | null>(null)
  const [showIgnored, setShowIgnored] = useState(false)
  const [sortIndex, setSortIndex] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)

  const ignoredSet = useMemo(() => new Set(ignoredComponents), [ignoredComponents])
  const pinnedSet = useMemo(() => new Set(pinnedComponents), [pinnedComponents])
  const driftAcceptedSet = useMemo(
    () => new Set(driftOverrides.resolved.map((e) => e.component)),
    [driftOverrides]
  )

  const applyFilters = (r: ComponentComparisonResult) => {
    if (statusFilter) {
      const normalized = r.status === 'in-sync' ? 'synced' : r.status === 'drift' ? 'drift-detected' : r.status
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
    const sortOption = SORT_OPTIONS[sortIndex]
    const sortedList = [...active].sort((a, b) => {
      // Pinned always first
      const aPinned = pinnedSet.has(a.name) ? 0 : 1
      const bPinned = pinnedSet.has(b.name) ? 0 : 1
      if (aPinned !== bPinned) return aPinned - bPinned

      switch (sortOption.key) {
        case 'status': {
          const aPri = STATUS_ORDER[a.status] ?? 5
          const bPri = STATUS_ORDER[b.status] ?? 5
          if (aPri !== bPri) return aPri - bPri
          return a.name.localeCompare(b.name)
        }
        case 'name':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'lastVerified': {
          const aDate = a.registryEntry?.lastVerified ?? ''
          const bDate = b.registryEntry?.lastVerified ?? ''
          return bDate.localeCompare(aDate) || a.name.localeCompare(b.name)
        }
        case 'lastVerified-desc': {
          const aDate = a.registryEntry?.lastVerified ?? ''
          const bDate = b.registryEntry?.lastVerified ?? ''
          return aDate.localeCompare(bDate) || a.name.localeCompare(b.name)
        }
        case 'kind': {
          const aKind = KIND_ORDER[a.kind] ?? 2
          const bKind = KIND_ORDER[b.kind] ?? 2
          if (aKind !== bKind) return aKind - bKind
          return a.name.localeCompare(b.name)
        }
        default:
          return 0
      }
    })
    return sortedList
  }, [active, sortIndex, pinnedSet])

  const sortedIgnored = useMemo(() => {
    return [...ignored].sort((a, b) => a.name.localeCompare(b.name))
  }, [ignored])

  // Reset focus when filters change
  useEffect(() => {
    setFocusedIndex(-1)
  }, [search, statusFilter, kindFilter, sortIndex])

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

  const registry = sorted.filter((r) => r.status !== 'untracked')
  const untracked = sorted.filter((r) => r.status === 'untracked')

  const summaryItems = useMemo(() => {
    // Count from non-ignored results only
    const counts: Record<string, number> = {}
    for (const r of results) {
      if (ignoredSet.has(r.name)) continue
      // Normalize drift → drift-detected for display
      const s = r.status === 'in-sync' ? 'synced' : r.status === 'drift' ? 'drift-detected' : r.status
      counts[s] = (counts[s] ?? 0) + 1
    }
    return [
      { label: 'synced', count: counts['synced'] ?? 0, status: 'synced' },
      { label: 'drift', count: counts['drift-detected'] ?? 0, status: 'drift-detected' },
      { label: 'code-only', count: counts['code-only'] ?? 0, status: 'code-only' },
      { label: 'missing', count: counts['missing'] ?? 0, status: 'missing' },
      { label: 'untracked', count: counts['untracked'] ?? 0, status: 'untracked' },
      { label: 'unverified', count: counts['unverified'] ?? 0, status: 'unverified' },
      { label: 'outdated', count: counts['outdated'] ?? 0, status: 'outdated' },
    ].filter((i) => i.count > 0)
  }, [results, ignoredSet])

  let rowIndex = 0

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0} ref={listRef}>
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

      <div class={styles.searchRow}>
        <input
          class={styles.searchInput}
          type="text"
          placeholder="Search components..."
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

      {registry.length > 0 && (
        <div>
          <div class={styles.sectionTitle}>Registry ({registry.length})</div>
          {registry.map((r) => {
            const idx = rowIndex++
            return (
              <ComponentRow
                key={r.name}
                result={r}
                onIgnore={onIgnore}
                isPinned={pinnedSet.has(r.name)}
                onPin={onPin}
                onUnpin={onUnpin}
                isFocused={focusedIndex === idx}
                rowIndex={idx}
                onAddToRegistry={onAddToRegistry}
                onMarkSynced={onMarkSynced}
                onUpdateFromFigma={onUpdateFromFigma}
                onAcceptDrift={onAcceptDrift}
                onUndoOverride={onUndoOverride}
                isOverridden={registryOverrides.has(r.name)}
                isDriftAccepted={driftAcceptedSet.has(r.name)}
              />
            )
          })}
        </div>
      )}

      {untracked.length > 0 && (
        <div>
          <div class={styles.sectionTitle}>Untracked in Figma ({untracked.length})</div>
          {untracked.map((r) => {
            const idx = rowIndex++
            return (
              <ComponentRow
                key={r.figmaComponent?.id ?? r.name}
                result={r}
                onIgnore={onIgnore}
                isPinned={pinnedSet.has(r.name)}
                onPin={onPin}
                onUnpin={onUnpin}
                isFocused={focusedIndex === idx}
                rowIndex={idx}
                onAddToRegistry={onAddToRegistry}
                onMarkSynced={onMarkSynced}
                onUpdateFromFigma={onUpdateFromFigma}
                onAcceptDrift={onAcceptDrift}
                onUndoOverride={onUndoOverride}
                isOverridden={registryOverrides.has(r.name)}
                isDriftAccepted={driftAcceptedSet.has(r.name)}
              />
            )
          })}
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
