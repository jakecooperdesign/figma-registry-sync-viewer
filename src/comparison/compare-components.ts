import {
  ComponentComparisonResult,
  ComponentEntry,
  FigmaComponentInfo,
  RegistryJson,
} from '../types'

export function compareComponents(
  registry: RegistryJson,
  figmaComponents: FigmaComponentInfo[]
): ComponentComparisonResult[] {
  const results: ComponentComparisonResult[] = []

  // Build lookup maps from Figma scan
  const byKey = new Map<string, FigmaComponentInfo>()
  const byNodeId = new Map<string, FigmaComponentInfo>()
  const matchedFigmaKeys = new Set<string>()

  for (const fc of figmaComponents) {
    if (fc.key) byKey.set(fc.key, fc)
    if (fc.id) byNodeId.set(fc.id, fc)
  }

  // Match registry entries to Figma components
  for (const [name, entry] of Object.entries(registry.components)) {
    let figmaMatch: FigmaComponentInfo | null = null

    // Primary: match by component key
    if (entry.figmaComponentKey) {
      figmaMatch = byKey.get(entry.figmaComponentKey) ?? null
    }

    // Fallback: match by node ID
    if (!figmaMatch && entry.figmaNodeId) {
      figmaMatch = byNodeId.get(entry.figmaNodeId) ?? null
    }

    if (figmaMatch) {
      matchedFigmaKeys.add(figmaMatch.key)
    }

    const status = resolveStatus(entry, figmaMatch)
    results.push({ name, registryEntry: entry, figmaComponent: figmaMatch, status })
  }

  // Find untracked Figma components (in Figma but not in registry)
  for (const fc of figmaComponents) {
    if (matchedFigmaKeys.has(fc.key)) continue
    if (fc.remote) continue // Skip library components

    results.push({
      name: fc.name,
      registryEntry: null,
      figmaComponent: fc,
      status: 'untracked',
    })
  }

  return results
}

function resolveStatus(
  entry: ComponentEntry,
  figmaMatch: FigmaComponentInfo | null
): ComponentComparisonResult['status'] {
  // If registry says code-only (no Figma mapping), keep it
  if (entry.status === 'code-only' || !entry.figmaNodeId) {
    return 'code-only'
  }

  // If registry has a Figma mapping but component not found in scan
  if (!figmaMatch) {
    return 'missing'
  }

  // Figma component found — use registry status
  if (entry.status === 'unverified') return 'unverified'
  if (entry.status === 'drift') return 'missing'

  // synced or in-sync
  return entry.status === 'in-sync' ? 'in-sync' : 'synced'
}
