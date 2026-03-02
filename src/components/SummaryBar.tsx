import { h } from 'preact'

import { STATUS_COLORS, STATUS_DESCRIPTIONS } from '../constants'
import styles from '../styles/plugin.module.css'

interface SummaryItem {
  label: string
  count: number
  status: string
}

interface Props {
  items: SummaryItem[]
  activeFilter?: string | null
  onFilterChange?: (status: string | null) => void
}

export function SummaryBar({ items, activeFilter, onFilterChange }: Props) {
  return (
    <div class={styles.summaryBar}>
      {items.map((item) => {
        const colors = STATUS_COLORS[item.status] ?? { bg: '#2a2a2a', text: '#94A3B8' }
        const isActive = activeFilter === item.status
        return (
          <button
            class={`${styles.summaryItem} ${isActive ? styles.summaryItemActive : ''}`}
            key={item.label}
            onClick={() => onFilterChange?.(isActive ? null : item.status)}
            title={isActive ? 'Clear filter' : (STATUS_DESCRIPTIONS[item.status] ?? `Filter by ${item.label}`)}
          >
            <span class={styles.summaryDot} style={{ backgroundColor: colors.text }} />
            <span>{item.count} {item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
