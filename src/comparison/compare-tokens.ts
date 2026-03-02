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

      if (figmaVar) {
        const registryValue = normalizeValue(entry.value, entry)
        const figmaValue = extractFigmaValue(figmaVar)

        if (registryValue && figmaValue && registryValue !== figmaValue) {
          status = 'value-diff'
          valueDiff = { registry: registryValue, figma: figmaValue }
        } else {
          status = 'matched'
        }
      }

      results.push({ name, category, registryEntry: entry, figmaVariable: figmaVar, status, valueDiff })
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

/** Extract the first mode's value from a Figma variable */
function extractFigmaValue(variable: FigmaVariableInfo): string | null {
  const modes = Object.values(variable.valuesByMode)
  if (modes.length === 0) return null

  const val = modes[0]

  // RGBA object → hex
  if (isRGBA(val)) {
    return rgbaToHex(val)
  }

  // Number (spacing)
  if (typeof val === 'number') {
    return String(val)
  }

  // String
  if (typeof val === 'string') {
    return normalizeHex(val)
  }

  // Alias reference — skip value comparison
  if (isAlias(val)) {
    return null
  }

  return null
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
