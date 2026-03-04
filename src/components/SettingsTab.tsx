import { h } from 'preact'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'

import { STATUS_COLORS } from '../constants'
import { ComponentComparisonResult, ComponentEntry, DriftEntry, RegistryJson } from '../types'
import { Icon } from './Icon'
import styles from '../styles/plugin.module.css'

interface Props {
  registry: RegistryJson
  fileName: string
  lastLoadedAt: string | null
  componentResults: ComponentComparisonResult[]
  ignoredComponents: string[]
  registryOverrides: Map<string, ComponentEntry>
  driftOverrides: { resolved: DriftEntry[] }
  onReplace: (registry: RegistryJson) => void
  onRescan: () => void
  onClear: () => void
  onClearIgnored: () => void
  onAcceptAllDrift: () => void
  onUndoAllDrift: () => void
  onClearOverrides: () => void
}

function buildExportJson(
  registry: RegistryJson,
  componentResults: ComponentComparisonResult[],
  ignoredNames: Set<string>,
  overrides: Map<string, ComponentEntry>,
  driftOverrides: { resolved: DriftEntry[] }
): string {
  const components: Record<string, ComponentEntry> = {}

  // Preserve all existing component fields (spread existing, overlay plugin fields)
  for (const [key, entry] of Object.entries(registry.components)) {
    components[key] = { ...entry }
  }

  // Apply overrides (takes precedence)
  overrides.forEach((entry, key) => {
    const existing = components[key]
    if (existing) {
      // Merge: preserve unknown fields from existing, overlay plugin fields
      components[key] = { ...existing, ...entry }
    } else {
      components[key] = entry
    }
  })

  // Add untracked components not already covered by overrides
  for (const r of componentResults) {
    if (r.status !== 'untracked') continue
    if (!r.figmaComponent) continue
    if (ignoredNames.has(r.name)) continue

    const key = r.name
    if (components[key]) continue // Already exists or overridden

    components[key] = {
      codePath: '',
      cssScope: [],
      figmaNodeId: r.figmaComponent.id,
      figmaComponentKey: r.figmaComponent.key,
      figmaName: r.figmaComponent.name,
      lastVerified: '',
      status: 'untracked',
    }
  }

  // Build drift section with overrides merged in
  let drift = registry.drift
  if (driftOverrides.resolved.length > 0) {
    drift = {
      active: drift?.active ?? [],
      resolved: [...(drift?.resolved ?? []), ...driftOverrides.resolved],
      adopted: drift?.adopted ?? [],
    }
  }

  // Preserve all unknown top-level keys
  const exported: Record<string, unknown> = { ...registry, components }
  if (drift) {
    exported.drift = drift
  }

  return JSON.stringify(exported, null, 2)
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

const SEVERITY_CLASS: Record<string, string> = {
  error: styles.auditFlagError,
  warning: styles.auditFlagWarning,
  info: styles.auditFlagInfo,
}

export function SettingsTab({
  registry,
  fileName,
  lastLoadedAt,
  componentResults,
  ignoredComponents,
  registryOverrides,
  driftOverrides,
  onReplace,
  onRescan,
  onClear,
  onClearIgnored,
  onAcceptAllDrift,
  onUndoAllDrift,
  onClearOverrides,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copiedRegistry, setCopiedRegistry] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmClearOverrides, setConfirmClearOverrides] = useState(false)

  const ignoredSet = useMemo(() => new Set(ignoredComponents), [ignoredComponents])

  const componentCount = Object.keys(registry.components).length
  const primCount = Object.keys(registry.tokens.primitives).length
  const semCount = Object.keys(registry.tokens.semantics).length
  const spacingCount = Object.keys(registry.tokens.spacing).length
  const tokenCount = primCount + semCount + spacingCount
  const decisionCount = registry.decisions
    ? Object.values(registry.decisions).reduce((sum, arr) => sum + arr.length, 0)
    : 0
  const driftActiveCount = registry.drift?.active?.length ?? 0
  const auditFlagCount = registry.auditFlags?.length ?? 0

  const overrideCount = registryOverrides.size

  // Check if there are active drift entries (from registry or component results)
  const hasActiveDrift = useMemo(() => {
    if (driftActiveCount > 0) return true
    return componentResults.some((r) => r.status === 'drift-detected' || r.status === 'drift')
  }, [driftActiveCount, componentResults])

  const handleReplace = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: Event) => {
      const input = e.target as HTMLInputElement
      const file = input.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string)
          if (!json.meta || !json.tokens || !json.components) {
            return
          }
          onReplace(json as RegistryJson)
        } catch {
          // Invalid JSON
        }
      }
      reader.readAsText(file)
      input.value = ''
    },
    [onReplace]
  )

  const handleExport = useCallback(() => {
    const json = buildExportJson(registry, componentResults, ignoredSet, registryOverrides, driftOverrides)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'figma-registry.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [registry, componentResults, ignoredSet, registryOverrides, driftOverrides])

  const handleCopyRegistry = useCallback(() => {
    const json = buildExportJson(registry, componentResults, ignoredSet, registryOverrides, driftOverrides)
    const textarea = document.createElement('textarea')
    textarea.value = json
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    setCopiedRegistry(true)
    setTimeout(() => setCopiedRegistry(false), 1500)
  }, [registry, componentResults, ignoredSet, registryOverrides, driftOverrides])

  const handleClearOverrides = useCallback(() => {
    if (!confirmClearOverrides) {
      setConfirmClearOverrides(true)
      setTimeout(() => setConfirmClearOverrides(false), 3000)
      return
    }
    setConfirmClearOverrides(false)
    onClearOverrides()
  }, [confirmClearOverrides, onClearOverrides])

  const handleClear = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    setConfirmClear(false)
    onClear()
  }, [confirmClear, onClear])

  return (
    <div>
      {/* File & Registry Info — compact header */}
      <div class={styles.settingsSection}>
        <div class={styles.settingsLabel}>Connected File</div>
        <div class={styles.settingsValue} style={{ fontWeight: 600, fontSize: '1.083rem' }}>
          {fileName || 'Unknown'}
        </div>
        <div class={styles.settingsMeta}>
          {registry.meta.lastFullSync && (
            <span>Synced {formatDate(registry.meta.lastFullSync)}</span>
          )}
          {lastLoadedAt && (
            <span>Loaded {formatDate(lastLoadedAt)}</span>
          )}
        </div>
      </div>

      {/* File key warning */}
      {registry.meta.fileKey && (
        <div class={styles.warning}>
          File key matching is unavailable on Figma Pro plans. Comparison uses component keys and variable IDs instead.
        </div>
      )}

      {/* Stats — metric cards */}
      <div class={styles.settingsSection}>
        <div class={styles.settingsLabel}>Registry Overview</div>
        <div class={styles.metricGrid}>
          <div class={styles.metricCard}>
            <div class={styles.metricNumber}>{componentCount}</div>
            <div class={styles.metricLabel}>Components</div>
          </div>
          <div class={styles.metricCard}>
            <div class={styles.metricNumber}>{tokenCount}</div>
            <div class={styles.metricLabel}>Tokens</div>
            <div class={styles.metricBreakdown}>{primCount} prim / {semCount} sem / {spacingCount} spacing</div>
          </div>
          <div class={styles.metricCard}>
            <div class={styles.metricNumber}>{decisionCount + driftActiveCount}</div>
            <div class={styles.metricLabel}>Drift / Decisions</div>
          </div>
          {overrideCount > 0 && (
            <div class={styles.metricCard} style={{ borderColor: '#92400E' }}>
              <div class={styles.metricNumber} style={{ color: '#FBBF24' }}>{overrideCount}</div>
              <div class={styles.metricLabel}>Pending Overrides</div>
            </div>
          )}
          {auditFlagCount > 0 && (
            <div class={styles.metricCard} style={{ borderColor: '#991B1B' }}>
              <div class={styles.metricNumber} style={{ color: '#F87171' }}>{auditFlagCount}</div>
              <div class={styles.metricLabel}>Audit Flags</div>
            </div>
          )}
        </div>
      </div>

      {/* Audit Flags */}
      {registry.auditFlags && registry.auditFlags.length > 0 && (
        <div class={styles.settingsSection}>
          <div class={styles.settingsLabel}>Audit Flags</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {registry.auditFlags.map((flag, i) => (
              <div
                key={i}
                class={`${styles.auditFlag} ${SEVERITY_CLASS[flag.severity] ?? ''}`}
              >
                <Icon name={flag.severity === 'error' ? 'warning' : flag.severity === 'warning' ? 'warning' : 'check-circle'} size={12} />
                <div>
                  <strong>{flag.location}:</strong> {flag.issue}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <div class={styles.settingsSection}>
        <div class={styles.settingsLabel}>Export</div>
        <div class={styles.settingsDesc}>
          Download or copy the registry JSON, including any overrides and untracked components discovered in this session.
        </div>
        <div class={styles.settingsActions}>
          <button class={styles.actionBtn} onClick={handleExport}>
            Download JSON
          </button>
          <button
            class={`${styles.actionBtn} ${copiedRegistry ? styles.actionBtnSuccess : ''}`}
            onClick={handleCopyRegistry}
          >
            {copiedRegistry ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>

      {/* Ignored Components */}
      {ignoredComponents.length > 0 && (
        <div class={styles.settingsSection}>
          <div class={styles.settingsLabel}>Ignored Components</div>
          <div class={styles.settingsDesc}>
            {ignoredComponents.length} component{ignoredComponents.length !== 1 ? 's' : ''} hidden from the Components tab. They won't appear in comparison results.
          </div>
          <div class={styles.settingsActions} style={{ marginTop: '6px' }}>
            <button class={styles.actionBtn} onClick={onClearIgnored}>
              Restore All Ignored
            </button>
          </div>
        </div>
      )}

      {/* Actions — each with description */}
      <div class={styles.settingsSection}>
        <div class={styles.settingsLabel}>Actions</div>
        <div class={styles.actionList}>
          <div class={styles.actionItem}>
            <button class={styles.actionBtn} onClick={onRescan}>
              Rescan File
            </button>
            <div class={styles.actionDesc}>
              Re-read all components and variables from the current Figma file and re-run comparison.
            </div>
          </div>

          <div class={styles.actionItem}>
            <button
              class={styles.actionBtn}
              onClick={onAcceptAllDrift}
              disabled={!hasActiveDrift}
              style={!hasActiveDrift ? { opacity: 0.5, cursor: 'default' } : undefined}
            >
              Accept All Drift
            </button>
            <div class={styles.actionDesc}>
              Acknowledge all detected drift as intentional design decisions. Moves active drift entries to resolved and marks affected components as synced. Dev tooling will see these as accepted in the exported registry.
            </div>
          </div>

          {driftOverrides.resolved.length > 0 && (
            <div class={styles.actionItem}>
              <button class={styles.actionBtn} onClick={onUndoAllDrift}>
                Undo All Drift ({driftOverrides.resolved.length})
              </button>
              <div class={styles.actionDesc}>
                Revert all drift acceptances from this session. Components will return to their detected drift status.
              </div>
            </div>
          )}

          {(overrideCount > 0 || driftOverrides.resolved.length > 0) && (
            <div class={styles.actionItem}>
              <button
                class={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                onClick={handleClearOverrides}
              >
                {confirmClearOverrides
                  ? 'Click Again to Confirm'
                  : `Clear All Overrides (${overrideCount + driftOverrides.resolved.length})`}
              </button>
              <div class={styles.actionDesc}>
                Discard all pending overrides and drift acceptances from this session. Components revert to their original registry status.
              </div>
            </div>
          )}

          <div class={styles.actionItem}>
            <button class={styles.actionBtn} onClick={handleReplace}>
              Replace Registry
            </button>
            <div class={styles.actionDesc}>
              Upload a new figma-registry.json to replace the current one. This discards all pending overrides.
            </div>
          </div>

          <div class={styles.actionItem}>
            <button
              class={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={handleClear}
            >
              {confirmClear ? 'Click Again to Confirm' : 'Remove Registry'}
            </button>
            <div class={styles.actionDesc}>
              Unload the registry and clear all plugin data — ignored list, pins, and overrides. The Figma file itself is not modified.
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
