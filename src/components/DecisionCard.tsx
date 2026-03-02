import { h } from 'preact'

import { DecisionEntry } from '../types'
import { StatusBadge } from './StatusBadge'
import styles from '../styles/plugin.module.css'

interface Props {
  decision: DecisionEntry
}

const ACTION_LABELS: Record<string, string> = {
  'figma-update-needed': 'Figma Update',
  'figma-create-needed': 'Figma Create',
  'code-update-needed': 'Code Update',
  completed: 'Completed',
  none: 'No Action',
}

export function DecisionCard({ decision }: Props) {
  return (
    <div class={styles.decisionCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div class={styles.decisionComponent}>{decision.component}</div>
        <StatusBadge
          status={decision.action}
          label={ACTION_LABELS[decision.action] ?? decision.action}
        />
      </div>
      <div class={styles.decisionIssue}>{decision.issue}</div>
      <div class={styles.decisionText}>{decision.decision}</div>
    </div>
  )
}
