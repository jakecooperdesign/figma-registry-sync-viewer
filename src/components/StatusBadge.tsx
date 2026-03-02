import { h } from 'preact'

import { STATUS_COLORS } from '../constants'
import styles from '../styles/plugin.module.css'

interface Props {
  status: string
  label?: string
}

export function StatusBadge({ status, label }: Props) {
  const colors = STATUS_COLORS[status] ?? { bg: '#2a2a2a', text: '#94A3B8' }
  const displayLabel = label ?? status.replace(/-/g, ' ')

  return (
    <span
      class={styles.badge}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {displayLabel}
    </span>
  )
}
