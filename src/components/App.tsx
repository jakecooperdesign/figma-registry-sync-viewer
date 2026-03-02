import { h } from 'preact'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { emit, on } from '@create-figma-plugin/utilities'

import { STORAGE_KEY, TAB_NAMES, TabName } from '../constants'
import { compareComponents } from '../comparison/compare-components'
import { compareTokens } from '../comparison/compare-tokens'
import {
  ComponentComparisonResult,
  FigmaComponentInfo,
  FigmaVariableInfo,
  PersistedState,
  RegistryJson,
  RequestScanHandler,
  ScanCompleteHandler,
  ScanErrorHandler,
  FileInfoHandler,
  TokenComparisonResult,
  UiReadyHandler,
} from '../types'
import { ComponentsTab } from './ComponentsTab'
import { DecisionsTab } from './DecisionsTab'
import { EmptyState } from './EmptyState'
import { SettingsTab } from './SettingsTab'
import { TokensTab } from './TokensTab'
import styles from '../styles/plugin.module.css'

export function App() {
  const [registry, setRegistry] = useState<RegistryJson | null>(null)
  const [fileName, setFileName] = useState('')
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabName>('Components')

  // Scan results
  const [figmaComponents, setFigmaComponents] = useState<FigmaComponentInfo[]>([])
  const [figmaVariables, setFigmaVariables] = useState<FigmaVariableInfo[]>([])

  // Load persisted state on mount, then signal ready to main thread
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const state: PersistedState = JSON.parse(stored)
        if (state.registry) {
          setRegistry(state.registry)
          setLastLoadedAt(state.lastLoadedAt)
        }
      }
    } catch {
      // Ignore storage errors
    }
    // Tell main thread we're ready to receive messages
    emit<UiReadyHandler>('UI_READY')
  }, [])

  // Listen for file info
  useEffect(() => {
    return on<FileInfoHandler>('FILE_INFO', (data) => {
      setFileName(data.fileName)
    })
  }, [])

  // Listen for scan results
  useEffect(() => {
    return on<ScanCompleteHandler>('SCAN_COMPLETE', (data) => {
      setFigmaComponents(data.components)
      setFigmaVariables(data.variables)
      setFileName(data.fileName)
      setScanning(false)
      setScanError(null)
    })
  }, [])

  // Listen for scan errors
  useEffect(() => {
    return on<ScanErrorHandler>('SCAN_ERROR', (data) => {
      setScanError(data.message)
      setScanning(false)
    })
  }, [])

  // Persist state when registry changes
  useEffect(() => {
    if (registry) {
      const state: PersistedState = { registry, lastLoadedAt }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Storage full or unavailable
      }
    }
  }, [registry, lastLoadedAt])

  // Trigger scan
  const triggerScan = useCallback(() => {
    setScanning(true)
    setScanError(null)
    emit<RequestScanHandler>('REQUEST_SCAN')
  }, [])

  // Handle registry loaded (from file picker or replace)
  const handleRegistryLoaded = useCallback(
    (reg: RegistryJson) => {
      setRegistry(reg)
      setLastLoadedAt(new Date().toISOString())
      triggerScan()
    },
    [triggerScan]
  )

  // Handle clear
  const handleClear = useCallback(() => {
    setRegistry(null)
    setLastLoadedAt(null)
    setFigmaComponents([])
    setFigmaVariables([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }, [])

  // Comparison results
  const componentResults: ComponentComparisonResult[] = useMemo(() => {
    if (!registry) return []
    return compareComponents(registry, figmaComponents)
  }, [registry, figmaComponents])

  const tokenResults: TokenComparisonResult[] = useMemo(() => {
    if (!registry) return []
    return compareTokens(registry, figmaVariables)
  }, [registry, figmaVariables])

  // Empty state: no registry loaded
  if (!registry) {
    return <EmptyState onRegistryLoaded={handleRegistryLoaded} />
  }

  // Scanning state
  if (scanning) {
    return (
      <div class={styles.scanning}>
        <div class={styles.spinner} />
        <div>Scanning Figma file...</div>
      </div>
    )
  }

  return (
    <div class={styles.container}>
      {/* Tab Bar */}
      <div class={styles.tabBar}>
        {TAB_NAMES.map((tab) => (
          <button
            key={tab}
            class={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Scan Error */}
      {scanError && (
        <div class={styles.warning} style={{ margin: '8px 12px 0' }}>
          Scan error: {scanError}
        </div>
      )}

      {/* Content */}
      <div class={styles.content}>
        {activeTab === 'Components' && <ComponentsTab results={componentResults} />}
        {activeTab === 'Tokens' && <TokensTab results={tokenResults} />}
        {activeTab === 'Decisions' && <DecisionsTab decisions={registry.decisions} />}
        {activeTab === 'Settings' && (
          <SettingsTab
            registry={registry}
            fileName={fileName}
            lastLoadedAt={lastLoadedAt}
            onReplace={handleRegistryLoaded}
            onRescan={triggerScan}
            onClear={handleClear}
          />
        )}
      </div>
    </div>
  )
}
