import { emit } from '@create-figma-plugin/utilities'
import { h } from 'preact'
import { useCallback, useMemo, useState } from 'preact/hooks'

import { KIND_COLORS, STATUS_DESCRIPTIONS } from '../constants'
import { ComponentComparisonResult, NavigateToNodeHandler } from '../types'
import { Icon } from './Icon'
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

  const kindLabel = result.kind === 'page' ? 'page' : result.kind === 'section' ? 'section' : 'component'
  let prompt = `I'm working on the ${result.name} ${kindLabel}${identifier}. `

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
  } else if (status === 'drift' || status === 'drift-detected') {
    prompt += `It's drifted out of sync between code and Figma.`
    if (result.driftReasons?.length) {
      prompt += ` Drift: ${result.driftReasons.join('; ')}`
    }
  } else if (status === 'outdated') {
    prompt += `Its registry data is stale and needs updating.`
  }

  return prompt
}

interface Props {
  result: ComponentComparisonResult
  onIgnore?: (name: string) => void
  onRestore?: (name: string) => void
  isPinned?: boolean
  onPin?: (name: string) => void
  onUnpin?: (name: string) => void
  isFocused?: boolean
  rowIndex?: number
  onAddToRegistry?: (result: ComponentComparisonResult) => void
  onMarkSynced?: (result: ComponentComparisonResult) => void
  onUpdateFromFigma?: (result: ComponentComparisonResult) => void
  onAcceptDrift?: (name: string) => void
  onUndoOverride?: (name: string) => void
  isOverridden?: boolean
  isDriftAccepted?: boolean
}

export function ComponentRow({
  result,
  onIgnore,
  onRestore,
  isPinned,
  onPin,
  onUnpin,
  isFocused,
  rowIndex,
  onAddToRegistry,
  onMarkSynced,
  onUpdateFromFigma,
  onAcceptDrift,
  onUndoOverride,
  isOverridden,
  isDriftAccepted,
}: Props) {
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

  function handlePinToggle(e: Event) {
    e.stopPropagation()
    if (isPinned) {
      onUnpin?.(result.name)
    } else {
      onPin?.(result.name)
    }
  }

  const displayStatus = result.status === 'drift' ? 'drift-detected' : result.status

  const rowClasses = [
    styles.row,
    isFocused ? styles.rowFocused : '',
  ].filter(Boolean).join(' ')

  return (
    <div class={rowClasses} data-row-index={rowIndex}>
      <div class={styles.rowHeader} onClick={() => setExpanded(!expanded)}>
        <span class={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>
          <Icon name="caret-right" size={10} />
        </span>
        <span class={styles.rowName}>
          {result.name}
          {variantSummary && (
            <span class={styles.variantCount}> ({variantSummary.total} variants)</span>
          )}
          {result.kind !== 'component' && (
            <span
              class={styles.kindBadge}
              style={{
                background: KIND_COLORS[result.kind].bg,
                color: KIND_COLORS[result.kind].text,
              }}
            >
              {result.kind}
            </span>
          )}
        </span>
        <div class={styles.rowActions}>
          <StatusBadge status={isOverridden ? 'synced' : displayStatus} />
          {onRestore && (
            <button
              class={styles.goToBtn}
              onClick={(e: Event) => {
                e.stopPropagation()
                onRestore(result.name)
              }}
              title="Restore this component"
            >
              <Icon name="arrow-counter-clockwise" size={14} />
            </button>
          )}
          {onIgnore && (
            <button
              class={styles.goToBtn}
              onClick={(e: Event) => {
                e.stopPropagation()
                onIgnore(result.name)
              }}
              title="Ignore this component"
            >
              <Icon name="x" size={14} />
            </button>
          )}
          <button
            class={`${styles.goToBtn} ${copied ? styles.goToBtnSuccess : ''}`}
            onClick={handleCopy}
            title="Copy component info for LLM prompt"
          >
            <Icon name={copied ? 'check' : 'copy'} size={14} />
          </button>
          <button
            class={`${styles.goToBtn} ${!nodeId ? styles.goToBtnDisabled : ''}`}
            onClick={nodeId ? handleNavigate : undefined}
            title={nodeId ? 'Go to component in file' : 'No linked Figma component'}
            disabled={!nodeId}
          >
            <Icon name="arrow-square-out" size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div class={styles.rowDetails}>
          {STATUS_DESCRIPTIONS[displayStatus] && (
            <div class={styles.statusDescription}>
              {STATUS_DESCRIPTIONS[displayStatus]}
            </div>
          )}

          {/* Drift reasons */}
          {result.driftReasons && result.driftReasons.length > 0 && (
            <div class={styles.driftReasons}>
              {result.driftReasons.map((reason, i) => (
                <div key={i} class={styles.driftReason}>
                  <Icon name="warning" size={12} />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pending changes */}
          {result.pendingChanges && (
            <div class={styles.pendingChanges}>
              <div class={styles.pendingChangesLabel}>
                Pending Changes (detected {result.pendingChanges.detectedAt})
              </div>
              {result.pendingChanges.diffs.map((diff, i) => (
                <div key={i}>{diff}</div>
              ))}
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

          {/* Sync action buttons */}
          {!isOverridden && (
            <div class={styles.syncActions}>
              {result.status === 'untracked' && onAddToRegistry && (
                <button
                  class={styles.syncActionBtn}
                  onClick={() => onAddToRegistry(result)}
                  title="Add this component to the registry"
                >
                  <Icon name="plus" size={12} />
                  Add to Registry
                </button>
              )}
              {(result.status === 'unverified' || result.status === 'missing') && onMarkSynced && (
                <button
                  class={styles.syncActionBtn}
                  onClick={() => onMarkSynced(result)}
                  title="Mark this component as synced"
                >
                  <Icon name="check-circle" size={12} />
                  Mark as Synced
                </button>
              )}
              {(result.status === 'drift-detected' || result.status === 'drift') && onAcceptDrift && (
                <button
                  class={styles.syncActionBtn}
                  onClick={() => onAcceptDrift(result.name)}
                  title="Accept drift as intentional"
                >
                  <Icon name="shield-check" size={12} />
                  Accept Drift
                </button>
              )}
              {(result.status === 'drift-detected' || result.status === 'drift') && onUpdateFromFigma && (
                <button
                  class={styles.syncActionBtn}
                  onClick={() => onUpdateFromFigma(result)}
                  title="Update registry entry from Figma"
                >
                  <Icon name="arrows-clockwise" size={12} />
                  Update from Figma
                </button>
              )}
            </div>
          )}
          {isOverridden && (
            <div class={styles.syncActions}>
              <div class={styles.statusDescription} style={{ color: '#4ADE80', marginBottom: 0 }}>
                {isDriftAccepted
                  ? 'Drift accepted — will be exported as resolved.'
                  : 'Updated — changes will be included in export.'}
              </div>
              {onUndoOverride && (
                <button
                  class={styles.syncActionBtn}
                  onClick={() => onUndoOverride(result.name)}
                  title="Undo this change"
                >
                  <Icon name="arrow-counter-clockwise" size={12} />
                  Undo
                </button>
              )}
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
                <VariantRow key={v.figmaComponent?.id ?? v.name} variant={v} onAcceptDrift={onAcceptDrift} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VariantRow({ variant, onAcceptDrift }: { variant: ComponentComparisonResult; onAcceptDrift?: (name: string) => void }) {
  const nodeId = variant.figmaComponent?.id ?? variant.registryEntry?.figmaNodeId
  const isDrift = variant.status === 'drift-detected' || variant.status === 'drift'

  function handleNavigate(e: Event) {
    e.stopPropagation()
    if (nodeId) {
      emit<NavigateToNodeHandler>('NAVIGATE_TO_NODE', { nodeId })
    }
  }

  return (
    <div class={styles.variantRow}>
      <span class={styles.variantName}>{variant.name}</span>
      <div class={styles.rowActions}>
        <StatusBadge status={variant.status} />
        {isDrift && onAcceptDrift && (
          <button
            class={styles.goToBtn}
            onClick={(e: Event) => {
              e.stopPropagation()
              onAcceptDrift(variant.name)
            }}
            title="Accept drift for this variant"
          >
            <Icon name="shield-check" size={14} />
          </button>
        )}
        <button
          class={`${styles.goToBtn} ${!nodeId ? styles.goToBtnDisabled : ''}`}
          onClick={nodeId ? handleNavigate : undefined}
          title={nodeId ? 'Go to variant in file' : 'No linked Figma component'}
          disabled={!nodeId}
        >
          <Icon name="arrow-square-out" size={14} />
        </button>
      </div>
    </div>
  )
}
