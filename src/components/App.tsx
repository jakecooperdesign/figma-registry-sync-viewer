import { h } from 'preact'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { emit, on } from '@create-figma-plugin/utilities'

import { TAB_NAMES, TabName } from '../constants'
import { compareComponents } from '../comparison/compare-components'
import { compareTokens } from '../comparison/compare-tokens'
import {
  ClearStateHandler,
  ComponentComparisonResult,
  ComponentEntry,
  DriftEntry,
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
import { DriftTab } from './DriftTab'
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

  // Pinned components (by name)
  const [pinnedComponents, setPinnedComponents] = useState<string[]>([])

  // Registry overrides from sync actions
  const [registryOverrides, setRegistryOverrides] = useState<Map<string, ComponentEntry>>(new Map())

  // Drift overrides: resolved entries from accept drift actions
  const [driftOverrides, setDriftOverrides] = useState<{ resolved: DriftEntry[] }>({ resolved: [] })

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
        setPinnedComponents(data.pinnedComponents ?? [])
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

  // Persist state to clientStorage when registry, ignored, or pinned list changes
  useEffect(() => {
    if (registry) {
      const state: PersistedState = { registry, lastLoadedAt, ignoredComponents, pinnedComponents }
      emit<SaveStateHandler>('SAVE_STATE', state)
    }
  }, [registry, lastLoadedAt, ignoredComponents, pinnedComponents])

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
      setRegistryOverrides(new Map())
      setDriftOverrides({ resolved: [] })
      triggerScan()
    },
    [triggerScan]
  )

  // Handle clear
  const handleClear = useCallback(() => {
    setRegistry(null)
    setLastLoadedAt(null)
    setIgnoredComponents([])
    setPinnedComponents([])
    setRegistryOverrides(new Map())
    setDriftOverrides({ resolved: [] })
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

  // Pin / Unpin
  const handlePin = useCallback((name: string) => {
    setPinnedComponents((prev) => prev.includes(name) ? prev : [...prev, name])
  }, [])

  const handleUnpin = useCallback((name: string) => {
    setPinnedComponents((prev) => prev.filter((n) => n !== name))
  }, [])

  // Sync actions
  const handleAddToRegistry = useCallback((result: ComponentComparisonResult) => {
    if (!result.figmaComponent) return
    const fc = result.figmaComponent
    const entry: ComponentEntry = {
      codePath: '',
      cssScope: [],
      figmaNodeId: fc.id,
      figmaComponentKey: fc.key,
      figmaName: fc.name,
      lastVerified: new Date().toISOString().slice(0, 10),
      status: 'unverified',
    }
    setRegistryOverrides((prev) => {
      const next = new Map(prev)
      next.set(result.name, entry)
      return next
    })
  }, [])

  const handleMarkSynced = useCallback((result: ComponentComparisonResult) => {
    const base = result.registryEntry ?? {
      codePath: '',
      cssScope: [],
      figmaNodeId: result.figmaComponent?.id ?? null,
      lastVerified: '',
      status: 'synced' as const,
    }
    const entry: ComponentEntry = {
      ...base,
      status: 'synced',
      lastVerified: new Date().toISOString().slice(0, 10),
    }
    setRegistryOverrides((prev) => {
      const next = new Map(prev)
      next.set(result.name, entry)
      return next
    })
  }, [])

  const handleUpdateFromFigma = useCallback((result: ComponentComparisonResult) => {
    if (!result.figmaComponent || !result.registryEntry) return
    const fc = result.figmaComponent
    const entry: ComponentEntry = {
      ...result.registryEntry,
      figmaName: fc.name,
      figmaNodeId: fc.id,
      figmaComponentKey: fc.key,
      status: 'synced',
      lastVerified: new Date().toISOString().slice(0, 10),
    }
    // Update children from Figma if it's a COMPONENT_SET
    if (fc.nodeType === 'COMPONENT_SET') {
      const figmaChildren = figmaComponents.filter((c) => c.parentId === fc.id)
      entry.children = figmaChildren.map((c) => c.name)
    }
    // Clear pendingChanges on acceptance
    delete entry.pendingChanges
    setRegistryOverrides((prev) => {
      const next = new Map(prev)
      next.set(result.name, entry)
      return next
    })
  }, [figmaComponents])

  // Accept drift for a single component
  const handleAcceptDrift = useCallback((componentName: string) => {
    const result = componentResults.find((r) => r.name === componentName)
    if (!result) return

    const today = new Date().toISOString().slice(0, 10)

    // Create resolved drift entry
    const driftEntry: DriftEntry = {
      component: componentName,
      issue: result.driftReasons?.join('; ') ?? 'Drift accepted',
      decision: 'design-accepted',
      date: today,
    }

    setDriftOverrides((prev) => ({
      resolved: [...prev.resolved, driftEntry],
    }))

    // Mark component as synced
    if (result.registryEntry) {
      const entry: ComponentEntry = {
        ...result.registryEntry,
        status: 'synced',
        lastVerified: today,
      }
      delete entry.pendingChanges
      setRegistryOverrides((prev) => {
        const next = new Map(prev)
        next.set(componentName, entry)
        return next
      })
    }
  }, []) // componentResults accessed via closure below

  // Undo any override for a single component (drift acceptance, add to registry, mark synced, etc.)
  const handleUndoOverride = useCallback((componentName: string) => {
    // Remove from drift overrides if present
    setDriftOverrides((prev) => ({
      resolved: prev.resolved.filter((e) => e.component !== componentName),
    }))
    // Remove from registry overrides so it reverts to original status
    setRegistryOverrides((prev) => {
      const next = new Map(prev)
      next.delete(componentName)
      return next
    })
  }, [])

  // Accept drift for a DriftEntry (from DriftTab)
  const handleAcceptDriftEntry = useCallback((entry: DriftEntry) => {
    const today = new Date().toISOString().slice(0, 10)
    const resolvedEntry: DriftEntry = {
      ...entry,
      decision: 'design-accepted',
      date: today,
    }
    setDriftOverrides((prev) => ({
      resolved: [...prev.resolved, resolvedEntry],
    }))
  }, [])

  // Accept all drift
  const handleAcceptAllDrift = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    const newResolved: DriftEntry[] = []

    for (const r of componentResults) {
      if (r.status !== 'drift-detected' && r.status !== 'drift') continue
      if (registryOverrides.has(r.name)) continue // Already overridden

      newResolved.push({
        component: r.name,
        issue: r.driftReasons?.join('; ') ?? 'Drift accepted',
        decision: 'design-accepted',
        date: today,
      })

      // Mark as synced
      if (r.registryEntry) {
        const entry: ComponentEntry = {
          ...r.registryEntry,
          status: 'synced',
          lastVerified: today,
        }
        delete entry.pendingChanges
        setRegistryOverrides((prev) => {
          const next = new Map(prev)
          next.set(r.name, entry)
          return next
        })
      }
    }

    // Also resolve active drift entries from registry
    if (registry?.drift?.active) {
      for (const entry of registry.drift.active) {
        newResolved.push({
          ...entry,
          decision: 'design-accepted',
          date: today,
        })
      }
    }

    setDriftOverrides((prev) => ({
      resolved: [...prev.resolved, ...newResolved],
    }))
  }, [figmaComponents, registry])

  // Clear all pending overrides (registry + drift)
  const handleClearOverrides = useCallback(() => {
    setRegistryOverrides(new Map())
    setDriftOverrides({ resolved: [] })
  }, [])

  // Undo all accepted drift
  const handleUndoAllDrift = useCallback(() => {
    // Get all component names that were drift-accepted
    const acceptedNames = driftOverrides.resolved.map((e) => e.component)
    // Clear all drift overrides
    setDriftOverrides({ resolved: [] })
    // Remove registry overrides for those components
    setRegistryOverrides((prev) => {
      const next = new Map(prev)
      acceptedNames.forEach((name) => next.delete(name))
      return next
    })
  }, [driftOverrides])

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
            pinnedComponents={pinnedComponents}
            onIgnore={handleIgnore}
            onRestore={handleRestore}
            onPin={handlePin}
            onUnpin={handleUnpin}
            onAddToRegistry={handleAddToRegistry}
            onMarkSynced={handleMarkSynced}
            onUpdateFromFigma={handleUpdateFromFigma}
            onAcceptDrift={handleAcceptDrift}
            onUndoOverride={handleUndoOverride}
            registryOverrides={registryOverrides}
            driftOverrides={driftOverrides}
          />
        )}
        {activeTab === 'Tokens' && <TokensTab results={tokenResults} />}
        {activeTab === 'Drift' && (
          <DriftTab
            registry={registry}
            onAcceptDrift={handleAcceptDriftEntry}
          />
        )}
        {activeTab === 'Settings' && (
          <SettingsTab
            registry={registry}
            fileName={fileName}
            lastLoadedAt={lastLoadedAt}
            componentResults={componentResults}
            ignoredComponents={ignoredComponents}
            registryOverrides={registryOverrides}
            driftOverrides={driftOverrides}
            onReplace={handleRegistryLoaded}
            onRescan={triggerScan}
            onClear={handleClear}
            onClearIgnored={handleClearIgnored}
            onAcceptAllDrift={handleAcceptAllDrift}
            onUndoAllDrift={handleUndoAllDrift}
            onClearOverrides={handleClearOverrides}
          />
        )}
      </div>
    </div>
  )
}
