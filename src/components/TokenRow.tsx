import { h } from 'preact'

import { TokenComparisonResult } from '../types'
import { ColorSwatch } from './ColorSwatch'
import { StatusBadge } from './StatusBadge'
import styles from '../styles/plugin.module.css'

interface Props {
  result: TokenComparisonResult
  isFocused?: boolean
  rowIndex?: number
}

export function TokenRow({ result, isFocused, rowIndex }: Props) {
  const value = result.registryEntry.value
  const isColor = typeof value === 'string' && value.startsWith('#')

  const rowClasses = [
    styles.row,
    isFocused ? styles.rowFocused : '',
  ].filter(Boolean).join(' ')

  return (
    <div class={rowClasses} data-row-index={rowIndex}>
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

      {result.aliasChain && result.aliasChain.length > 1 && (
        <div class={styles.aliasChain}>
          {result.aliasChain.map((name, i) => (
            <span key={i}>
              {i > 0 && <span class={styles.aliasArrow}> → </span>}
              <span class={styles.aliasName}>{name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
