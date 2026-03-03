import { h } from 'preact'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'

import { ComponentComparisonResult, RegistryJson } from '../types'
import styles from '../styles/plugin.module.css'

interface Props {
  registry: RegistryJson
  fileName: string
  lastLoadedAt: string | null
  componentResults: ComponentComparisonResult[]
  ignoredComponents: string[]
  onReplace: (registry: RegistryJson) => void
  onRescan: () => void
  onClear: () => void
  onClearIgnored: () => void
}

function buildExportJson(registry: RegistryJson, componentResults: ComponentComparisonResult[], ignoredNames: Set<string>): string {
  const components = { ...registry.components }

  for (const r of componentResults) {
    if (r.status !== 'untracked') continue
    if (!r.figmaComponent) continue
    if (ignoredNames.has(r.name)) continue

    // Use the Figma component name as the registry key
    const key = r.name
    if (components[key]) continue // Already exists

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

  const exported = { ...registry, components }
  return JSON.stringify(exported, null, 2)
}

export function SettingsTab({
  registry,
  fileName,
  lastLoadedAt,
  componentResults,
  ignoredComponents,
  onReplace,
  onRescan,
  onClear,
  onClearIgnored,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copiedRegistry, setCopiedRegistry] = useState(false)

  const ignoredSet = useMemo(() => new Set(ignoredComponents), [ignoredComponents])

  const fileKeyMatch = !registry.meta.fileKey || fileName.length === 0
    ? null
    : null // Can't check fileKey on Pro plans — always show info

  const componentCount = Object.keys(registry.components).length
  const tokenCount =
    Object.keys(registry.tokens.primitives).length +
    Object.keys(registry.tokens.semantics).length +
    Object.keys(registry.tokens.spacing).length
  const decisionCount = Object.values(registry.decisions).reduce((sum, arr) => sum + arr.length, 0)

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
      // Reset so same file can be re-selected
      input.value = ''
    },
    [onReplace]
  )

  const handleExport = useCallback(() => {
    const json = buildExportJson(registry, componentResults, ignoredSet)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'figma-registry.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [registry, componentResults, ignoredSet])

  const handleCopyRegistry = useCallback(() => {
    const json = buildExportJson(registry, componentResults, ignoredSet)
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
  }, [registry, componentResults, ignoredSet])

  return (
    <div>
      {/* File Info */}
      <div class={styles.settingsSection}>
        <div class={styles.settingsLabel}>Current Figma File</div>
        <div class={styles.settingsValue}>{fileName || 'Unknown'}</div>
      </div>

      {/* Registry Info */}
      <div class={styles.settingsSection}>
        <div class={styles.settingsLabel}>Registry</div>
        <div class={styles.settingsValue}>
          File Key: {registry.meta.fileKey}
          <br />
          Last Full Sync: {registry.meta.lastFullSync}
          <br />
          {lastLoadedAt && <span>Loaded: {lastLoadedAt}</span>}
        </div>
      </div>

      {/* File key warning */}
      {registry.meta.fileKey && (
        <div class={styles.warning}>
          File key matching is unavailable on Figma Pro plans (figma.fileKey returns undefined).
          Comparison uses component keys and variable IDs instead.
        </div>
      )}

      {/* Stats */}
      <div class={styles.settingsSection}>
        <div class={styles.settingsLabel}>Registry Stats</div>
        <div class={styles.settingsValue}>
          {componentCount} component{componentCount !== 1 ? 's' : ''}
          <br />
          {tokenCount} token{tokenCount !== 1 ? 's' : ''} ({Object.keys(registry.tokens.primitives).length} prim / {Object.keys(registry.tokens.semantics).length} sem / {Object.keys(registry.tokens.spacing).length} spacing)
          <br />
          {decisionCount} decision{decisionCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Export */}
      <div class={styles.settingsSection}>
        <div class={styles.settingsLabel}>Export</div>
        <div class={styles.settingsActions}>
          <button class={styles.actionBtn} onClick={handleExport}>
            Export Registry
          </button>
          <button
            class={`${styles.actionBtn} ${copiedRegistry ? styles.actionBtnSuccess : ''}`}
            onClick={handleCopyRegistry}
          >
            {copiedRegistry ? 'Copied!' : 'Copy Registry'}
          </button>
        </div>
      </div>

      {/* Ignored Components */}
      {ignoredComponents.length > 0 && (
        <div class={styles.settingsSection}>
          <div class={styles.settingsLabel}>Ignored Components</div>
          <div class={styles.settingsValue}>
            {ignoredComponents.length} component{ignoredComponents.length !== 1 ? 's' : ''} hidden
          </div>
          <div class={styles.settingsActions} style={{ marginTop: '6px' }}>
            <button class={styles.actionBtn} onClick={onClearIgnored}>
              Clear Ignore List
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div class={styles.settingsSection}>
        <div class={styles.settingsLabel}>Actions</div>
        <div class={styles.settingsActions}>
          <button class={styles.actionBtn} onClick={onRescan}>
            Rescan File
          </button>
          <button class={styles.actionBtn} onClick={handleReplace}>
            Replace Registry
          </button>
          <button class={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={onClear}>
            Clear Data
          </button>
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
