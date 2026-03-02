import { emit } from '@create-figma-plugin/utilities'
import { h } from 'preact'
import { useCallback, useMemo, useState } from 'preact/hooks'

import { STATUS_DESCRIPTIONS } from '../constants'
import { ComponentComparisonResult, NavigateToNodeHandler } from '../types'
import { StatusBadge } from './StatusBadge'
import styles from '../styles/plugin.module.css'

function buildPromptSnippet(result: ComponentComparisonResult): string {
  const entry = result.registryEntry
  const figma = result.figmaComponent
  const nodeId = figma?.id ?? entry?.figmaNodeId
  const figmaName = entry?.figmaName ?? figma?.name

  // Build the parenthetical identifiers
  const details: string[] = []
  if (entry?.codePath) details.push(entry.codePath)
  if (figmaName) details.push(`Figma: "${figmaName}"`)
  if (nodeId) details.push(`node: ${nodeId}`)
  if (entry?.cssScope && entry.cssScope.length > 0) details.push(`CSS: ${entry.cssScope.join(', ')}`)

  const status = result.status
  const identifier = details.length > 0 ? ` (${details.join(', ')})` : ''

  let prompt = `I'm working on the ${result.name} component${identifier}. `

  if (status === 'synced' || status === 'in-sync') {
    prompt += `It's currently in sync between code and Figma.`
  } else if (status === 'missing') {
    prompt += `It's defined in the registry but missing from the Figma file.`
  } else if (status === 'code-only') {
    prompt += `It exists in code but has no Figma component linked yet.`
  } else if (status === 'untracked') {
    prompt += `It exists in Figma but isn't tracked in the component registry.`
  } else if (status === 'unverified') {
    prompt += `It hasn't been verified against Figma yet.`
  } else if (status === 'drift') {
    prompt += `It's drifted out of sync between code and Figma.`
  }

  return prompt
}

interface Props {
  result: ComponentComparisonResult
}

export function ComponentRow({ result }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const entry = result.registryEntry
  const figma = result.figmaComponent
  const nodeId = figma?.id ?? entry?.figmaNodeId
  const variants = result.variants

  const handleCopy = useCallback((e: Event) => {
    e.stopPropagation()
    const text = buildPromptSnippet(result)
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [result])

  const variantSummary = useMemo(() => {
    if (!variants || variants.length === 0) return null
    const tracked = variants.filter((v) => v.status !== 'untracked').length
    const untracked = variants.length - tracked
    return { total: variants.length, tracked, untracked }
  }, [variants])

  function handleNavigate(e: Event) {
    e.stopPropagation()
    if (nodeId) {
      emit<NavigateToNodeHandler>('NAVIGATE_TO_NODE', { nodeId })
    }
  }

  return (
    <div class={styles.row}>
      <div class={styles.rowHeader} onClick={() => setExpanded(!expanded)}>
        <span class={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>▶</span>
        <span class={styles.rowName}>
          {result.name}
          {variantSummary && (
            <span class={styles.variantCount}> ({variantSummary.total} variants)</span>
          )}
        </span>
        <button
          class={`${styles.goToBtn} ${copied ? styles.goToBtnSuccess : ''}`}
          onClick={handleCopy}
          title="Copy component info for LLM prompt"
        >
          {copied ? '✓' : '⎘'}
        </button>
        {nodeId && (
          <button class={styles.goToBtn} onClick={handleNavigate} title="Go to component in file">
            ↗
          </button>
        )}
        <StatusBadge status={result.status} />
      </div>

      {expanded && (
        <div class={styles.rowDetails}>
          {STATUS_DESCRIPTIONS[result.status] && (
            <div class={styles.statusDescription}>
              {STATUS_DESCRIPTIONS[result.status]}
            </div>
          )}
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

          {/* Variant list */}
          {variants && variants.length > 0 && (
            <div class={styles.variantSection}>
              <div class={styles.variantHeader}>
                {variantSummary!.tracked > 0 && (
                  <span class={styles.variantTracked}>{variantSummary!.tracked} tracked</span>
                )}
                {variantSummary!.untracked > 0 && (
                  <span class={styles.variantUntracked}>{variantSummary!.untracked} untracked</span>
                )}
              </div>
              {variants.map((v) => (
                <VariantRow key={v.figmaComponent?.id ?? v.name} variant={v} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VariantRow({ variant }: { variant: ComponentComparisonResult }) {
  const nodeId = variant.figmaComponent?.id ?? variant.registryEntry?.figmaNodeId

  function handleNavigate(e: Event) {
    e.stopPropagation()
    if (nodeId) {
      emit<NavigateToNodeHandler>('NAVIGATE_TO_NODE', { nodeId })
    }
  }

  return (
    <div class={styles.variantRow}>
      <span class={styles.variantName}>{variant.name}</span>
      {nodeId && (
        <button class={styles.goToBtn} onClick={handleNavigate} title="Go to variant in file">
          ↗
        </button>
      )}
      <StatusBadge status={variant.status} />
    </div>
  )
}
