import { h } from 'preact'
import { useCallback, useRef } from 'preact/hooks'

import { RegistryJson } from '../types'
import styles from '../styles/plugin.module.css'

interface Props {
  registry: RegistryJson
  fileName: string
  lastLoadedAt: string | null
  onReplace: (registry: RegistryJson) => void
  onRescan: () => void
  onClear: () => void
}

export function SettingsTab({ registry, fileName, lastLoadedAt, onReplace, onRescan, onClear }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

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
