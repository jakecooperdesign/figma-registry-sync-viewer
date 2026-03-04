import {
  FigmaVariableInfo,
  RegistryJson,
  TokenCategory,
  TokenComparisonResult,
  TokenEntry,
} from '../types'

export function compareTokens(
  registry: RegistryJson,
  figmaVariables: FigmaVariableInfo[]
): TokenComparisonResult[] {
  const results: TokenComparisonResult[] = []

  // Build lookup by variable ID
  const byId = new Map<string, FigmaVariableInfo>()
  for (const v of figmaVariables) {
    byId.set(v.id, v)
  }

  const categories: TokenCategory[] = ['primitives', 'semantics', 'spacing']

  for (const category of categories) {
    const tokens = registry.tokens[category]
    if (!tokens) continue

    for (const [name, entry] of Object.entries(tokens)) {
      const figmaVar = entry.figmaId ? byId.get(entry.figmaId) ?? null : null

      let status: TokenComparisonResult['status'] = 'missing'
      let valueDiff: TokenComparisonResult['valueDiff'] | undefined
      let aliasChain: string[] | undefined

      if (figmaVar) {
        const registryValue = normalizeValue(entry.value, entry)
        const { value: figmaValue, chain } = extractFigmaValue(figmaVar, byId)

        if (chain && chain.length > 1) {
          aliasChain = chain
        }

        if (registryValue && figmaValue && registryValue !== figmaValue) {
          status = 'value-diff'
          valueDiff = { registry: registryValue, figma: figmaValue }
        } else {
          status = 'matched'
        }
      }

      results.push({ name, category, registryEntry: entry, figmaVariable: figmaVar, status, valueDiff, aliasChain })
    }
  }

  return results
}

/** Normalize registry value to a comparable string */
function normalizeValue(value: string | number | undefined, entry: TokenEntry): string | null {
  if (value === undefined || value === null) {
    // Alias-only tokens don't have a direct value to compare
    if (entry.aliasOf) return null
    return null
  }

  if (typeof value === 'number') {
    return String(value)
  }

  // Normalize hex colors to uppercase
  return normalizeHex(value)
}

/** Resolve a chain of VARIABLE_ALIAS references to the final value */
function resolveAliasChain(
  variable: FigmaVariableInfo,
  byId: Map<string, FigmaVariableInfo>,
  maxDepth = 10
): { value: string | null; chain: string[] } | null {
  const chain: string[] = [variable.name]
  const visited = new Set<string>([variable.id])
  let current = variable

  for (let i = 0; i < maxDepth; i++) {
    const modes = Object.values(current.valuesByMode)
    if (modes.length === 0) return { value: null, chain }

    const val = modes[0]

    if (!isAlias(val)) {
      // Reached a concrete value
      const resolved = resolveConcreteValue(val)
      return { value: resolved, chain }
    }

    // Follow the alias
    if (visited.has(val.id)) return null // Cycle detected
    const next = byId.get(val.id)
    if (!next) return null // Broken chain

    visited.add(val.id)
    chain.push(next.name)
    current = next
  }

  return null // Max depth exceeded
}

/** Resolve a non-alias value to string */
function resolveConcreteValue(val: unknown): string | null {
  if (isRGBA(val)) return rgbaToHex(val)
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') return normalizeHex(val)
  return null
}

/** Extract the first mode's value from a Figma variable, resolving aliases */
function extractFigmaValue(
  variable: FigmaVariableInfo,
  byId: Map<string, FigmaVariableInfo>
): { value: string | null; chain?: string[] } {
  const modes = Object.values(variable.valuesByMode)
  if (modes.length === 0) return { value: null }

  const val = modes[0]

  // Alias reference — resolve the chain
  if (isAlias(val)) {
    const result = resolveAliasChain(variable, byId)
    if (result) return result
    return { value: null }
  }

  // RGBA object → hex
  if (isRGBA(val)) {
    return { value: rgbaToHex(val) }
  }

  // Number (spacing)
  if (typeof val === 'number') {
    return { value: String(val) }
  }

  // String
  if (typeof val === 'string') {
    return { value: normalizeHex(val) }
  }

  return { value: null }
}

/** Normalize hex string to uppercase with # prefix */
export function normalizeHex(hex: string): string {
  const clean = hex.trim().toUpperCase()
  if (!clean.startsWith('#')) return clean
  // Expand 3-char hex to 6-char
  if (clean.length === 4) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`
  }
  return clean
}

/** Convert Figma RGBA float object to hex string */
export function rgbaToHex(rgba: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(rgba.r * 255)
  const g = Math.round(rgba.g * 255)
  const b = Math.round(rgba.b * 255)
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`

  if (rgba.a !== undefined && rgba.a < 1) {
    const a = Math.round(rgba.a * 255)
    return `${hex}${toHex(a)}`
  }

  return hex
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0').toUpperCase()
}

function isRGBA(val: unknown): val is { r: number; g: number; b: number; a?: number } {
  return typeof val === 'object' && val !== null && 'r' in val && 'g' in val && 'b' in val
}

function isAlias(val: unknown): val is { type: string; id: string } {
  return typeof val === 'object' && val !== null && 'type' in val && (val as Record<string, unknown>).type === 'VARIABLE_ALIAS'
}
