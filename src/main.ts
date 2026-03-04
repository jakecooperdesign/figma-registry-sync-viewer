import { emit, on, showUI } from '@create-figma-plugin/utilities'

import {
  ClearStateHandler,
  FigmaComponentInfo,
  FigmaVariableInfo,
  FileInfoHandler,
  LoadStateHandler,
  NavigateToNodeHandler,
  PersistedState,
  RequestScanHandler,
  ResizeWindowHandler,
  SaveStateHandler,
  ScanCompleteHandler,
  ScanErrorHandler,
  StateLoadedHandler,
  UiReadyHandler,
} from './types'

const CLIENT_STORAGE_KEY = 'registry-sync-viewer-state'

export default function () {
  // Handle resize
  on<ResizeWindowHandler>('RESIZE_WINDOW', function (windowSize) {
    figma.ui.resize(windowSize.width, windowSize.height)
  })

  // Wait for UI to signal it's ready before sending file info
  on<UiReadyHandler>('UI_READY', function () {
    emit<FileInfoHandler>('FILE_INFO', { fileName: figma.root.name })
  })

  // Handle navigate-to-node request from UI
  on<NavigateToNodeHandler>('NAVIGATE_TO_NODE', async function ({ nodeId }) {
    try {
      const node = await figma.getNodeByIdAsync(nodeId)
      if (node) {
        const page = findPage(node)
        if (page && page !== figma.currentPage) {
          await figma.setCurrentPageAsync(page)
        }
        figma.viewport.scrollAndZoomIntoView([node])
        if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE' || node.type === 'FRAME' || node.type === 'GROUP') {
          figma.currentPage.selection = [node]
        }
      }
    } catch {
      // Node may not exist in the file
    }
  })

  // Handle scan request from UI
  on<RequestScanHandler>('REQUEST_SCAN', async function () {
    try {
      // Load all pages so we can find components across the file
      await figma.loadAllPagesAsync()

      // Find all components (COMPONENT and COMPONENT_SET)
      const componentNodes = figma.root.findAll(
        (node) => node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
      )

      const components: FigmaComponentInfo[] = componentNodes.map((node) => {
        const comp = node as ComponentNode | ComponentSetNode
        return {
          id: comp.id,
          name: comp.name,
          key: comp.key,
          description: comp.description,
          remote: comp.remote,
          parent: comp.parent ? comp.parent.name : null,
          parentId: comp.parent && comp.parent.type === 'COMPONENT_SET' ? comp.parent.id : null,
          nodeType: comp.type as 'COMPONENT' | 'COMPONENT_SET',
        }
      })

      // Get local variables
      let variables: FigmaVariableInfo[] = []
      try {
        const localVars = await figma.variables.getLocalVariablesAsync()
        const collections = await figma.variables.getLocalVariableCollectionsAsync()
        const collectionMap = new Map(collections.map((c) => [c.id, c.name]))

        variables = localVars.map((v) => ({
          id: v.id,
          name: v.name,
          resolvedType: v.resolvedType,
          valuesByMode: v.valuesByMode as Record<string, unknown>,
          collectionName: collectionMap.get(v.variableCollectionId) ?? 'Unknown',
        }))
      } catch {
        // Variables API may not be available — continue without them
      }

      emit<ScanCompleteHandler>('SCAN_COMPLETE', {
        components,
        variables,
        fileName: figma.root.name,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scan error'
      emit<ScanErrorHandler>('SCAN_ERROR', { message })
    }
  })

  // Handle persisted state via clientStorage (survives plugin close/reopen)
  on<LoadStateHandler>('LOAD_STATE', async function () {
    try {
      const state = await figma.clientStorage.getAsync(CLIENT_STORAGE_KEY) as PersistedState | undefined
      emit<StateLoadedHandler>('STATE_LOADED', state ?? null)
    } catch {
      emit<StateLoadedHandler>('STATE_LOADED', null)
    }
  })

  on<SaveStateHandler>('SAVE_STATE', async function (data) {
    try {
      await figma.clientStorage.setAsync(CLIENT_STORAGE_KEY, data)
    } catch {
      // Storage full or unavailable
    }
  })

  on<ClearStateHandler>('CLEAR_STATE', async function () {
    try {
      await figma.clientStorage.deleteAsync(CLIENT_STORAGE_KEY)
    } catch {
      // Ignore
    }
  })

  // Show UI first — handlers above are registered and ready
  showUI({
    height: 560,
    width: 520,
  })
}

function findPage(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node
  while (current) {
    if (current.type === 'PAGE') return current as PageNode
    current = current.parent
  }
  return null
}
