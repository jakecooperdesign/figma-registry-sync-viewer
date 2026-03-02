import { h } from 'preact'

import { STATUS_COLORS } from '../constants'
import styles from '../styles/plugin.module.css'

interface SummaryItem {
  label: string
  count: number
  status: string
}

interface Props {
  items: SummaryItem[]
}

export function SummaryBar({ items }: Props) {
  return (
    <div class={styles.summaryBar}>
      {items.map((item) => {
        const colors = STATUS_COLORS[item.status] ?? { bg: '#2a2a2a', text: '#94A3B8' }
        return (
          <div class={styles.summaryItem} key={item.label}>
            <span class={styles.summaryDot} style={{ backgroundColor: colors.text }} />
            <span>{item.count} {item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
