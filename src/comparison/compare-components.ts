import {
  ComponentComparisonResult,
  ComponentEntry,
  ComponentKind,
  FigmaComponentInfo,
  PendingChanges,
  RegistryJson,
} from '../types'

export function compareComponents(
  registry: RegistryJson,
  figmaComponents: FigmaComponentInfo[]
): ComponentComparisonResult[] {
  const flat: ComponentComparisonResult[] = []

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

    const { status, driftReasons } = resolveStatus(entry, figmaMatch, figmaComponents)

    // Build pendingChanges when drift detected
    let pendingChanges: PendingChanges | undefined
    if (status === 'drift-detected' && driftReasons && driftReasons.length > 0) {
      pendingChanges = {
        detectedAt: new Date().toISOString().slice(0, 10),
        diffs: driftReasons,
        priority: 'medium',
      }
    }

    const kind = resolveKind(name, entry)
    flat.push({ name, registryEntry: entry, figmaComponent: figmaMatch, status, kind, driftReasons, pendingChanges })
  }

  // Find untracked Figma components (in Figma but not in registry)
  for (const fc of figmaComponents) {
    if (matchedFigmaKeys.has(fc.key)) continue
    if (fc.remote) continue // Skip library components

    flat.push({
      name: fc.name,
      registryEntry: null,
      figmaComponent: fc,
      status: 'untracked',
      kind: resolveKind(fc.name, null),
    })
  }

  return groupVariants(flat, figmaComponents)
}

/** Group variant COMPONENT nodes under their parent COMPONENT_SET */
function groupVariants(
  results: ComponentComparisonResult[],
  figmaComponents: FigmaComponentInfo[]
): ComponentComparisonResult[] {
  // Build a map of COMPONENT_SET id → its child variant Figma nodes
  const setChildren = new Map<string, FigmaComponentInfo[]>()
  for (const fc of figmaComponents) {
    if (fc.parentId) {
      const list = setChildren.get(fc.parentId) ?? []
      list.push(fc)
      setChildren.set(fc.parentId, list)
    }
  }

  // Index results by figma component id for quick lookup
  const resultByFigmaId = new Map<string, ComponentComparisonResult>()
  for (const r of results) {
    if (r.figmaComponent) resultByFigmaId.set(r.figmaComponent.id, r)
  }

  // Find results that are COMPONENT_SET parents
  const variantChildIds = new Set<string>()
  const grouped: ComponentComparisonResult[] = []

  for (const r of results) {
    const fc = r.figmaComponent
    // If this result is a COMPONENT_SET, gather its variant children
    if (fc && fc.nodeType === 'COMPONENT_SET') {
      const childFigma = setChildren.get(fc.id) ?? []
      const variants: ComponentComparisonResult[] = []
      for (const childFc of childFigma) {
        const existing = resultByFigmaId.get(childFc.id)
        if (existing) {
          variants.push({ ...existing, isVariant: true })
          variantChildIds.add(childFc.id)
        } else {
          // Variant exists in Figma but not matched to any result — untracked variant
          variants.push({
            name: childFc.name,
            registryEntry: null,
            figmaComponent: childFc,
            status: 'untracked',
            kind: resolveKind(childFc.name, null),
            isVariant: true,
          })
          variantChildIds.add(childFc.id)
        }
      }
      grouped.push({ ...r, variants })
    } else {
      grouped.push(r)
    }
  }

  // Also handle results whose figma component is a child variant but the parent set
  // wasn't in the results (e.g. registry entry matched directly to a variant)
  // — group those under a synthetic parent
  const orphanVariants = new Map<string, ComponentComparisonResult[]>()
  const orphanParents = new Map<string, FigmaComponentInfo>()
  for (const r of grouped) {
    if (variantChildIds.has(r.figmaComponent?.id ?? '')) continue
    const fc = r.figmaComponent
    if (fc && fc.parentId && fc.nodeType === 'COMPONENT') {
      const parentFc = figmaComponents.find((c) => c.id === fc.parentId)
      if (parentFc && parentFc.nodeType === 'COMPONENT_SET') {
        const list = orphanVariants.get(fc.parentId) ?? []
        list.push({ ...r, isVariant: true })
        orphanVariants.set(fc.parentId, list)
        orphanParents.set(fc.parentId, parentFc)
        variantChildIds.add(fc.id)
      }
    }
  }

  // Insert synthetic parent sets for orphan groups
  orphanVariants.forEach((variants, parentId) => {
    const parentFc = orphanParents.get(parentId)!
    const parentResult = resultByFigmaId.get(parentId)
    if (!parentResult) {
      // Create a synthetic set entry
      grouped.push({
        name: parentFc.name,
        registryEntry: null,
        figmaComponent: parentFc,
        status: 'untracked',
        kind: resolveKind(parentFc.name, null),
        variants,
      })
    }
  })

  // Filter out results that are now nested as variants
  return grouped.filter((r) => !variantChildIds.has(r.figmaComponent?.id ?? ''))
}

function resolveKind(name: string, entry: ComponentEntry | null): ComponentKind {
  if (entry?.kind) return entry.kind
  if (/Dashboard|View$|Page$|Wizard$/.test(name)) return 'page'
  if (/Section$/.test(name)) return 'section'
  return 'component'
}

function resolveStatus(
  entry: ComponentEntry,
  figmaMatch: FigmaComponentInfo | null,
  allFigmaComponents: FigmaComponentInfo[]
): { status: ComponentComparisonResult['status']; driftReasons?: string[] } {
  // If registry says code-only (no Figma mapping), keep it
  if (entry.status === 'code-only' || !entry.figmaNodeId) {
    return { status: 'code-only' }
  }

  // If registry has a Figma mapping but component not found in scan
  if (!figmaMatch) {
    return { status: 'missing' }
  }

  // Figma component found — check for drift (skip code-only/unverified)
  if (entry.status === 'unverified') return { status: 'unverified' }

  const reasons: string[] = []

  // Name mismatch
  if (entry.figmaName && figmaMatch.name !== entry.figmaName) {
    reasons.push(`Name mismatch: registry "${entry.figmaName}" vs Figma "${figmaMatch.name}"`)
  }

  // Variant checks (only for COMPONENT_SET)
  if (entry.children && entry.children.length > 0 && figmaMatch.nodeType === 'COMPONENT_SET') {
    const figmaChildren = allFigmaComponents.filter((c) => c.parentId === figmaMatch.id)

    // Variant count mismatch
    if (figmaChildren.length !== entry.children.length) {
      reasons.push(
        `Variant count: registry has ${entry.children.length}, Figma has ${figmaChildren.length}`
      )
    }

    // Missing specific variants
    const figmaChildNames = new Set(figmaChildren.map((c) => c.name))
    const missingVariants = entry.children.filter((name) => !figmaChildNames.has(name))
    if (missingVariants.length > 0) {
      reasons.push(`Missing variants: ${missingVariants.join(', ')}`)
    }
  }

  if (reasons.length > 0) {
    return { status: 'drift-detected', driftReasons: reasons }
  }

  // synced or in-sync
  return { status: entry.status === 'in-sync' ? 'in-sync' : 'synced' }
}
