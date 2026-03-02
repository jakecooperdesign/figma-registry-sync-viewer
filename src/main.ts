import { emit, on, showUI } from '@create-figma-plugin/utilities'

import {
  FigmaComponentInfo,
  FigmaVariableInfo,
  FileInfoHandler,
  RequestScanHandler,
  ResizeWindowHandler,
  ScanCompleteHandler,
  ScanErrorHandler,
  UiReadyHandler,
} from './types'

export default function () {
  // Handle resize
  on<ResizeWindowHandler>('RESIZE_WINDOW', function (windowSize) {
    figma.ui.resize(windowSize.width, windowSize.height)
  })

  // Wait for UI to signal it's ready before sending file info
  on<UiReadyHandler>('UI_READY', function () {
    emit<FileInfoHandler>('FILE_INFO', { fileName: figma.root.name })
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

  // Show UI first — handlers above are registered and ready
  showUI({
    height: 560,
    width: 400,
  })
}
