import { h } from 'preact'

import { TokenComparisonResult } from '../types'
import { ColorSwatch } from './ColorSwatch'
import { StatusBadge } from './StatusBadge'
import styles from '../styles/plugin.module.css'

interface Props {
  result: TokenComparisonResult
}

export function TokenRow({ result }: Props) {
  const value = result.registryEntry.value
  const isColor = typeof value === 'string' && value.startsWith('#')

  return (
    <div class={styles.row}>
      <div class={styles.rowHeader}>
        <div class={styles.tokenInfo}>
          {isColor && <ColorSwatch color={value as string} />}
          <div class={styles.tokenNames}>
            <span class={styles.tokenFigmaName}>{result.name}</span>
            <span class={styles.tokenCssVar}>{result.registryEntry.cssVar}</span>
          </div>
        </div>
        <StatusBadge status={result.status} />
      </div>

      {result.valueDiff && (
        <div class={styles.valueDiff}>
          <span class={styles.valueDiffRegistry}>Registry: {result.valueDiff.registry}</span>
          <span class={styles.valueDiffFigma}>Figma: {result.valueDiff.figma}</span>
        </div>
      )}
    </div>
  )
}
