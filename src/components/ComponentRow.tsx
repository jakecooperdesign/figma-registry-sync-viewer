import { h } from 'preact'
import { useState } from 'preact/hooks'

import { ComponentComparisonResult } from '../types'
import { StatusBadge } from './StatusBadge'
import styles from '../styles/plugin.module.css'

interface Props {
  result: ComponentComparisonResult
}

export function ComponentRow({ result }: Props) {
  const [expanded, setExpanded] = useState(false)
  const entry = result.registryEntry
  const figma = result.figmaComponent

  return (
    <div class={styles.row}>
      <div class={styles.rowHeader} onClick={() => setExpanded(!expanded)}>
        <span class={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>▶</span>
        <span class={styles.rowName}>{result.name}</span>
        <StatusBadge status={result.status} />
      </div>

      {expanded && (
        <div class={styles.rowDetails}>
          {entry?.codePath && (
            <div class={styles.rowDetail}>
              <span class={styles.rowDetailLabel}>Code:</span>
              <span class={styles.rowDetailValue}>{entry.codePath}</span>
            </div>
          )}
          {entry?.figmaName && (
            <div class={styles.rowDetail}>
              <span class={styles.rowDetailLabel}>Figma:</span>
              <span class={styles.rowDetailValue}>{entry.figmaName}</span>
            </div>
          )}
          {figma && !entry?.figmaName && (
            <div class={styles.rowDetail}>
              <span class={styles.rowDetailLabel}>Figma:</span>
              <span class={styles.rowDetailValue}>{figma.name}</span>
            </div>
          )}
          {entry?.figmaVariants && (
            <div class={styles.rowDetail}>
              <span class={styles.rowDetailLabel}>Variants:</span>
              <span class={styles.rowDetailValue}>{entry.figmaVariants}</span>
            </div>
          )}
          {entry?.cssScope && entry.cssScope.length > 0 && (
            <div class={styles.rowDetail}>
              <span class={styles.rowDetailLabel}>CSS:</span>
              <span class={styles.rowDetailValue}>{entry.cssScope.join(', ')}</span>
            </div>
          )}
          {entry?.lastVerified && (
            <div class={styles.rowDetail}>
              <span class={styles.rowDetailLabel}>Verified:</span>
              <span class={styles.rowDetailValue}>{entry.lastVerified}</span>
            </div>
          )}
          {entry?.syncNotes && (
            <div class={styles.rowDetail}>
              <span class={styles.rowDetailLabel}>Notes:</span>
              <span class={styles.rowDetailValue}>{entry.syncNotes}</span>
            </div>
          )}
          {entry?.relatedFigma && (
            <div class={styles.rowDetail}>
              <span class={styles.rowDetailLabel}>Related:</span>
              <span class={styles.rowDetailValue}>
                {Object.entries(entry.relatedFigma).map(([k, v]) => `${k} (${v})`).join(', ')}
              </span>
            </div>
          )}
          {entry?.children && entry.children.length > 0 && (
            <div class={styles.rowDetail}>
              <span class={styles.rowDetailLabel}>Children:</span>
              <span class={styles.rowDetailValue}>{entry.children.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
