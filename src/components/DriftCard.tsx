import { h } from 'preact'

import { STATUS_COLORS } from '../constants'
import { DriftEntry } from '../types'
import { Icon } from './Icon'
import styles from '../styles/plugin.module.css'

interface Props {
  entry: DriftEntry
  onAcceptDrift?: (entry: DriftEntry) => void
}

export function DriftCard({ entry, onAcceptDrift }: Props) {
  const directionColors = entry.direction === 'figma→code'
    ? STATUS_COLORS['drift-active']
    : entry.direction === 'code→figma'
      ? STATUS_COLORS['code-update-needed']
      : null

  return (
    <div class={styles.decisionCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
        <div class={styles.decisionComponent}>{entry.component}</div>
        {entry.direction && directionColors && (
          <span
            class={styles.badge}
            style={{ backgroundColor: directionColors.bg, color: directionColors.text }}
          >
            {entry.direction}
          </span>
        )}
      </div>
      <div class={styles.decisionIssue}>{entry.issue}</div>
      {entry.decision && (
        <div class={styles.decisionText}>{entry.decision}</div>
      )}
      {entry.change && (
        <div class={styles.decisionText} style={{ color: 'var(--figma-color-text-tertiary)' }}>
          {entry.change}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--figma-color-text-tertiary)' }}>
          {entry.date}
        </span>
        {onAcceptDrift && (
          <button
            class={styles.syncActionBtn}
            onClick={() => onAcceptDrift(entry)}
            title="Accept this drift as intentional"
          >
            <Icon name="shield-check" size={12} />
            Accept Drift
          </button>
        )}
      </div>
    </div>
  )
}
