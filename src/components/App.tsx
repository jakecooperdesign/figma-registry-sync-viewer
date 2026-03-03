import { h } from 'preact'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { emit, on } from '@create-figma-plugin/utilities'

import { TAB_NAMES, TabName } from '../constants'
import { compareComponents } from '../comparison/compare-components'
import { compareTokens } from '../comparison/compare-tokens'
import {
  ClearStateHandler,
  ComponentComparisonResult,
  FigmaComponentInfo,
  FigmaVariableInfo,
  LoadStateHandler,
  PersistedState,
  RegistryJson,
  RequestScanHandler,
  SaveStateHandler,
  ScanCompleteHandler,
  ScanErrorHandler,
  FileInfoHandler,
  StateLoadedHandler,
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

  // Ignored components (by name)
  const [ignoredComponents, setIgnoredComponents] = useState<string[]>([])

  // Scan results
  const [figmaComponents, setFigmaComponents] = useState<FigmaComponentInfo[]>([])
  const [figmaVariables, setFigmaVariables] = useState<FigmaVariableInfo[]>([])

  // Load persisted state from clientStorage on mount
  useEffect(() => {
    const cleanup = on<StateLoadedHandler>('STATE_LOADED', (data) => {
      if (data?.registry) {
        setRegistry(data.registry)
        setLastLoadedAt(data.lastLoadedAt)
        setIgnoredComponents(data.ignoredComponents ?? [])
        // Auto-scan so we compare against the live Figma file
        setScanning(true)
        emit<RequestScanHandler>('REQUEST_SCAN')
      }
      // Tell main thread we're ready to receive messages
      emit<UiReadyHandler>('UI_READY')
    })
    emit<LoadStateHandler>('LOAD_STATE')
    return cleanup
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

  // Persist state to clientStorage when registry or ignored list changes
  useEffect(() => {
    if (registry) {
      const state: PersistedState = { registry, lastLoadedAt, ignoredComponents }
      emit<SaveStateHandler>('SAVE_STATE', state)
    }
  }, [registry, lastLoadedAt, ignoredComponents])

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
    setIgnoredComponents([])
    setFigmaComponents([])
    setFigmaVariables([])
    emit<ClearStateHandler>('CLEAR_STATE')
  }, [])

  // Ignore a component by name
  const handleIgnore = useCallback((name: string) => {
    setIgnoredComponents((prev) => prev.includes(name) ? prev : [...prev, name])
  }, [])

  // Restore a component from the ignored list
  const handleRestore = useCallback((name: string) => {
    setIgnoredComponents((prev) => prev.filter((n) => n !== name))
  }, [])

  // Clear the entire ignore list
  const handleClearIgnored = useCallback(() => {
    setIgnoredComponents([])
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
        {activeTab === 'Components' && (
          <ComponentsTab
            results={componentResults}
            ignoredComponents={ignoredComponents}
            onIgnore={handleIgnore}
            onRestore={handleRestore}
          />
        )}
        {activeTab === 'Tokens' && <TokensTab results={tokenResults} />}
        {activeTab === 'Decisions' && <DecisionsTab decisions={registry.decisions} />}
        {activeTab === 'Settings' && (
          <SettingsTab
            registry={registry}
            fileName={fileName}
            lastLoadedAt={lastLoadedAt}
            componentResults={componentResults}
            ignoredComponents={ignoredComponents}
            onReplace={handleRegistryLoaded}
            onRescan={triggerScan}
            onClear={handleClear}
            onClearIgnored={handleClearIgnored}
          />
        )}
      </div>
    </div>
  )
}
