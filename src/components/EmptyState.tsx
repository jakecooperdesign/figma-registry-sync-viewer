import { h } from 'preact'
import { useCallback, useRef, useState } from 'preact/hooks'

import { RegistryJson } from '../types'
import styles from '../styles/plugin.module.css'

interface Props {
  onRegistryLoaded: (registry: RegistryJson) => void
}

export function EmptyState({ onRegistryLoaded }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string)
          if (!json.meta || !json.tokens || !json.components) {
            setError('Invalid registry JSON: missing meta, tokens, or components')
            return
          }
          onRegistryLoaded(json as RegistryJson)
        } catch {
          setError('Failed to parse JSON file')
        }
      }
      reader.readAsText(file)
    },
    [onRegistryLoaded]
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer?.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (e: Event) => {
      const input = e.target as HTMLInputElement
      const file = input.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div class={styles.emptyState}>
      <div class={styles.emptyIcon}>📋</div>
      <div class={styles.emptyTitle}>Registry Sync Viewer</div>
      <div class={styles.emptyDescription}>
        Upload your figma-registry.json to compare your design system registry against
        this Figma file's components and variables.
      </div>

      <div
        class={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        Drop figma-registry.json here
        <br />
        or click to browse
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {error && <div class={styles.warning}>{error}</div>}
    </div>
  )
}
