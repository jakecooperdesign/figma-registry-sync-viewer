import { h } from 'preact'
import { useMemo, useState } from 'preact/hooks'

import { STATUS_COLORS } from '../constants'
import type { DriftSection as DriftSectionType } from '../types'
import { DecisionEntry, DriftEntry, RegistryJson } from '../types'
import { DriftCard } from './DriftCard'
import { Icon } from './Icon'
import styles from '../styles/plugin.module.css'

interface Props {
  registry: RegistryJson
  onAcceptDrift?: (entry: DriftEntry) => void
}

type FilterValue = 'all' | 'active' | 'resolved' | 'adopted' | 'legacy'

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Adopted', value: 'adopted' },
]

type SortKey = 'date-desc' | 'date-asc' | 'component' | 'component-desc'
const SORT_OPTIONS: { label: string; key: SortKey }[] = [
  { label: 'Newest first', key: 'date-desc' },
  { label: 'Oldest first', key: 'date-asc' },
  { label: 'Component A–Z', key: 'component' },
  { label: 'Component Z–A', key: 'component-desc' },
]

function sortEntries(entries: DriftEntry[], key: SortKey): DriftEntry[] {
  return [...entries].sort((a, b) => {
    switch (key) {
      case 'date-desc': return b.date.localeCompare(a.date)
      case 'date-asc': return a.date.localeCompare(b.date)
      case 'component': return a.component.localeCompare(b.component)
      case 'component-desc': return b.component.localeCompare(a.component)
      default: return 0
    }
  })
}

function filterBySearch(entries: DriftEntry[], query: string): DriftEntry[] {
  if (!query) return entries
  const q = query.toLowerCase()
  return entries.filter(
    (e) =>
      e.component.toLowerCase().includes(q) ||
      e.issue.toLowerCase().includes(q) ||
      (e.decision?.toLowerCase().includes(q) ?? false)
  )
}

/** Convert legacy decisions format into drift entries for display */
function convertLegacyDecisions(decisions: Record<string, DecisionEntry[]>): DriftEntry[] {
  const entries: DriftEntry[] = []
  for (const [date, items] of Object.entries(decisions)) {
    for (const d of items) {
      entries.push({
        component: d.component,
        issue: d.issue,
        date,
        decision: d.decision,
        action: d.action,
      })
    }
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

export function DriftTab({ registry, onAcceptDrift }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all')
  const [search, setSearch] = useState('')
  const [sortIndex, setSortIndex] = useState(0)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const hasDrift = !!registry.drift
  const hasLegacy = !hasDrift && !!registry.decisions && Object.keys(registry.decisions).length > 0

  const drift: DriftSectionType = useMemo(() => {
    if (registry.drift) return registry.drift
    return { active: [], resolved: [], adopted: [] }
  }, [registry.drift])

  const legacyEntries = useMemo(() => {
    if (!hasLegacy || !registry.decisions) return []
    return convertLegacyDecisions(registry.decisions)
  }, [hasLegacy, registry.decisions])

  const filters = useMemo(() => {
    const f = [...FILTERS]
    if (hasLegacy) {
      f.push({ label: 'Legacy', value: 'legacy' })
    }
    return f
  }, [hasLegacy])

  const sortKey = SORT_OPTIONS[sortIndex].key

  // Apply search and sort to each section
  const activeEntries = useMemo(
    () => sortEntries(filterBySearch(drift.active, search), sortKey),
    [drift.active, search, sortKey]
  )
  const resolvedEntries = useMemo(
    () => sortEntries(filterBySearch(drift.resolved, search), sortKey),
    [drift.resolved, search, sortKey]
  )
  const adoptedEntries = useMemo(
    () => sortEntries(filterBySearch(drift.adopted, search), sortKey),
    [drift.adopted, search, sortKey]
  )
  const filteredLegacy = useMemo(
    () => sortEntries(filterBySearch(legacyEntries, search), sortKey),
    [legacyEntries, search, sortKey]
  )

  const counts = useMemo(() => ({
    active: activeEntries.length,
    resolved: resolvedEntries.length,
    adopted: adoptedEntries.length,
    legacy: filteredLegacy.length,
    total: activeEntries.length + resolvedEntries.length + adoptedEntries.length + filteredLegacy.length,
  }), [activeEntries, resolvedEntries, adoptedEntries, filteredLegacy])

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const showSection = (section: FilterValue) =>
    filter === 'all' || filter === section

  const sectionAccent = (section: 'active' | 'resolved' | 'adopted') =>
    STATUS_COLORS[`drift-${section}`]

  if (!hasDrift && !hasLegacy) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--figma-color-text-secondary)' }}>
        No drift entries found. Drift is detected when components in the registry don't match their Figma counterparts.
      </div>
    )
  }

  return (
    <div>
      {/* Summary counts */}
      <div style={{ fontSize: '11px', color: 'var(--figma-color-text-secondary)', marginBottom: '8px', display: 'flex', gap: '12px' }}>
        {counts.active > 0 && (
          <span style={{ color: STATUS_COLORS['drift-active'].text }}>
            {counts.active} active
          </span>
        )}
        {counts.resolved > 0 && (
          <span style={{ color: STATUS_COLORS['drift-resolved'].text }}>
            {counts.resolved} resolved
          </span>
        )}
        {counts.adopted > 0 && (
          <span style={{ color: STATUS_COLORS['drift-adopted'].text }}>
            {counts.adopted} adopted
          </span>
        )}
        {counts.legacy > 0 && (
          <span style={{ color: 'var(--figma-color-text-tertiary)' }}>
            {counts.legacy} legacy
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div class={styles.filterBar}>
        {filters.map((f) => (
          <button
            key={f.value}
            class={`${styles.filterBtn} ${filter === f.value ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div class={styles.searchRow}>
        <input
          class={styles.searchInput}
          type="text"
          placeholder="Search drift entries..."
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

      {/* Active section */}
      {showSection('active') && activeEntries.length > 0 && (
        <DriftSectionGroup
          title="Active"
          entries={activeEntries}
          accent={sectionAccent('active')}
          collapsed={collapsedSections.has('active')}
          onToggle={() => toggleSection('active')}
          onAcceptDrift={onAcceptDrift}
        />
      )}

      {/* Resolved section */}
      {showSection('resolved') && resolvedEntries.length > 0 && (
        <DriftSectionGroup
          title="Resolved"
          entries={resolvedEntries}
          accent={sectionAccent('resolved')}
          collapsed={collapsedSections.has('resolved')}
          onToggle={() => toggleSection('resolved')}
        />
      )}

      {/* Adopted section */}
      {showSection('adopted') && adoptedEntries.length > 0 && (
        <DriftSectionGroup
          title="Adopted"
          entries={adoptedEntries}
          accent={sectionAccent('adopted')}
          collapsed={collapsedSections.has('adopted')}
          onToggle={() => toggleSection('adopted')}
        />
      )}

      {/* Legacy section */}
      {hasLegacy && showSection('legacy') && filteredLegacy.length > 0 && (
        <DriftSectionGroup
          title="Legacy Decisions"
          entries={filteredLegacy}
          accent={{ bg: '#2a2a2a', text: '#94A3B8' }}
          collapsed={collapsedSections.has('legacy')}
          onToggle={() => toggleSection('legacy')}
        />
      )}

      {counts.total === 0 && search && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--figma-color-text-secondary)' }}>
          No drift entries match "{search}"
        </div>
      )}
    </div>
  )
}

function DriftSectionGroup({
  title,
  entries,
  accent,
  collapsed,
  onToggle,
  onAcceptDrift,
}: {
  title: string
  entries: DriftEntry[]
  accent: { bg: string; text: string }
  collapsed: boolean
  onToggle: () => void
  onAcceptDrift?: (entry: DriftEntry) => void
}) {
  return (
    <div class={styles.driftSection}>
      <div
        class={styles.driftSectionHeader}
        style={{ borderLeftColor: accent.text, cursor: 'pointer', userSelect: 'none' }}
        onClick={onToggle}
      >
        <span class={`${styles.chevron} ${!collapsed ? styles.chevronOpen : ''}`}>
          <Icon name="caret-right" size={10} />
        </span>
        <span style={{ color: accent.text }}>{title}</span>
        <span style={{ color: 'var(--figma-color-text-tertiary)', marginLeft: '4px' }}>
          ({entries.length})
        </span>
      </div>
      {!collapsed && entries.map((entry, i) => (
        <DriftCard
          key={`${entry.component}-${i}`}
          entry={entry}
          onAcceptDrift={onAcceptDrift}
        />
      ))}
    </div>
  )
}
