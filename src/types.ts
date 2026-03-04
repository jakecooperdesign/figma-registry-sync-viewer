import { EventHandler } from '@create-figma-plugin/utilities'

// ── Registry JSON Schema ──────────────────────────────────────────────

export interface RegistryJson {
  meta: RegistryMeta
  tokenTranslation?: TokenTranslation
  tokens: {
    primitives: Record<string, TokenEntry>
    semantics: Record<string, TokenEntry>
    spacing: Record<string, TokenEntry>
  }
  decisions?: Record<string, DecisionEntry[]>
  components: Record<string, ComponentEntry>
  drift?: DriftSection
  unmapped?: UnmappedSection
  auditFlags?: AuditFlag[]
  projectConfig?: Record<string, unknown>
  [key: string]: unknown // preserve unknown top-level keys
}

export interface RegistryMeta {
  fileKey: string
  lastFullSync: string
  spacingCollection?: {
    collectionId: string
    modes: Record<string, string>
  }
}

export interface TokenEntry {
  figmaId: string
  value?: string | number
  aliasOf?: string | Record<string, string>
  cssVar: string
}

export interface ComponentEntry {
  codePath: string
  cssScope: string[]
  figmaNodeId: string | null
  figmaComponentKey?: string
  figmaName?: string
  figmaVariants?: string
  lastVerified: string
  status: ComponentStatus
  children?: string[]
  relatedFigma?: Record<string, string>
  syncNotes?: string
  kind?: ComponentKind
  pendingChanges?: PendingChanges
  [key: string]: unknown // preserve unknown fields
}

export type ComponentKind = 'page' | 'section' | 'component'

export type ComponentStatus =
  | 'synced'
  | 'in-sync'
  | 'unverified'
  | 'code-only'
  | 'missing'
  | 'drift'
  | 'drift-detected'
  | 'outdated'
  | 'figma-only'
  | 'untracked'

export interface DecisionEntry {
  component: string
  issue: string
  decision: string
  action: DecisionAction
}

export type DecisionAction =
  | 'figma-update-needed'
  | 'figma-create-needed'
  | 'code-update-needed'
  | 'completed'
  | 'none'

export interface TokenTranslation {
  primitiveRules: TranslationRule[]
  semanticRules: TranslationRule[]
  spacingRules: TranslationRule[]
  overrides: Record<string, string>
}

export interface TranslationRule {
  figmaPattern: string
  cssPattern: string
  description?: string
}

// ── Drift Types ─────────────────────────────────────────────────────

export interface DriftSection {
  active: DriftEntry[]
  resolved: DriftEntry[]
  adopted: DriftEntry[]
}

export interface DriftEntry {
  component: string
  issue: string
  direction?: string
  status?: string
  date: string
  decision?: string
  action?: string
  change?: string
}

export interface UnmappedSection {
  figmaOnly: UnmappedFigmaEntry[]
  codeOnly: UnmappedCodeEntry[]
}

export interface UnmappedFigmaEntry {
  figmaName: string
  figmaNodeId: string
  possibleCodeMatch?: string | null
  notes?: string
}

export interface UnmappedCodeEntry {
  componentName: string
  codePath: string
  notes?: string
}

export interface AuditFlag {
  severity: 'warning' | 'info' | 'error'
  issue: string
  location: string
}

export interface PendingChanges {
  detectedAt: string
  diffs: string[]
  priority: 'high' | 'medium' | 'low'
}

// ── Figma Scan Results ────────────────────────────────────────────────

export interface FigmaComponentInfo {
  id: string
  name: string
  key: string
  description: string
  remote: boolean
  parent: string | null
  parentId: string | null
  nodeType: 'COMPONENT' | 'COMPONENT_SET'
}

export interface FigmaVariableInfo {
  id: string
  name: string
  resolvedType: string
  valuesByMode: Record<string, unknown>
  collectionName: string
}

// ── Comparison Results ────────────────────────────────────────────────

export interface ComponentComparisonResult {
  name: string
  registryEntry: ComponentEntry | null
  figmaComponent: FigmaComponentInfo | null
  status: ComparisonStatus
  kind: ComponentKind
  driftReasons?: string[]
  pendingChanges?: PendingChanges
  /** If this result is a variant set, its child variants */
  variants?: ComponentComparisonResult[]
  /** True if this result is a variant inside a set (should be hidden at top level) */
  isVariant?: boolean
}

export type ComparisonStatus =
  | 'synced'       // in registry + in Figma
  | 'in-sync'      // alias for synced
  | 'missing'      // in registry but NOT in Figma
  | 'untracked'    // in Figma but NOT in registry
  | 'code-only'    // in registry, no Figma mapping
  | 'unverified'   // in registry, needs verification
  | 'drift'        // in both, but differences detected (internal alias)
  | 'drift-detected' // in both, but differences detected (display status)
  | 'outdated'     // registry data is stale

export interface TokenComparisonResult {
  name: string
  category: TokenCategory
  registryEntry: TokenEntry
  figmaVariable: FigmaVariableInfo | null
  status: 'matched' | 'missing' | 'value-diff'
  valueDiff?: { registry: string; figma: string }
  aliasChain?: string[]
}

export type TokenCategory = 'primitives' | 'semantics' | 'spacing'

// ── Persisted State ───────────────────────────────────────────────────

export interface PersistedState {
  registry: RegistryJson | null
  lastLoadedAt: string | null
  ignoredComponents?: string[]
  pinnedComponents?: string[]
}

// ── Event Handlers ────────────────────────────────────────────────────

export interface ResizeWindowHandler extends EventHandler {
  name: 'RESIZE_WINDOW'
  handler: (windowSize: { width: number; height: number }) => void
}

export interface RequestScanHandler extends EventHandler {
  name: 'REQUEST_SCAN'
  handler: () => void
}

export interface ScanCompleteHandler extends EventHandler {
  name: 'SCAN_COMPLETE'
  handler: (data: {
    components: FigmaComponentInfo[]
    variables: FigmaVariableInfo[]
    fileName: string
  }) => void
}

export interface FileInfoHandler extends EventHandler {
  name: 'FILE_INFO'
  handler: (data: { fileName: string }) => void
}

export interface ScanErrorHandler extends EventHandler {
  name: 'SCAN_ERROR'
  handler: (data: { message: string }) => void
}

export interface UiReadyHandler extends EventHandler {
  name: 'UI_READY'
  handler: () => void
}

export interface NavigateToNodeHandler extends EventHandler {
  name: 'NAVIGATE_TO_NODE'
  handler: (data: { nodeId: string }) => void
}

export interface SaveStateHandler extends EventHandler {
  name: 'SAVE_STATE'
  handler: (data: PersistedState) => void
}

export interface LoadStateHandler extends EventHandler {
  name: 'LOAD_STATE'
  handler: () => void
}

export interface StateLoadedHandler extends EventHandler {
  name: 'STATE_LOADED'
  handler: (data: PersistedState | null) => void
}

export interface ClearStateHandler extends EventHandler {
  name: 'CLEAR_STATE'
  handler: () => void
}
