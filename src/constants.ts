export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  synced:      { bg: '#1a3a2a', text: '#4ADE80' },
  'in-sync':   { bg: '#1a3a2a', text: '#4ADE80' },
  matched:     { bg: '#1a3a2a', text: '#4ADE80' },
  missing:     { bg: '#3a1a1a', text: '#F87171' },
  'value-diff': { bg: '#3a2a1a', text: '#FBBF24' },
  untracked:   { bg: '#1a2a3a', text: '#89B1FF' },
  'code-only': { bg: '#2a2a2a', text: '#94A3B8' },
  unverified:  { bg: '#2a2a1a', text: '#FBBF24' },
  drift:       { bg: '#3a1a2a', text: '#F472B6' },
  'drift-detected': { bg: '#3a1a2a', text: '#F472B6' },
  outdated:    { bg: '#3a2a1a', text: '#FBBF24' },
  'figma-only': { bg: '#1a2a3a', text: '#89B1FF' },

  // Decision actions
  'figma-update-needed': { bg: '#3a2a1a', text: '#FBBF24' },
  'figma-create-needed': { bg: '#1a2a3a', text: '#89B1FF' },
  'code-update-needed':  { bg: '#3a2a1a', text: '#FBBF24' },
  completed:             { bg: '#1a3a2a', text: '#4ADE80' },
  none:                  { bg: '#2a2a2a', text: '#94A3B8' },

  // Drift section accents
  'drift-active':   { bg: '#3a1a2a', text: '#F472B6' },
  'drift-resolved': { bg: '#1a3a2a', text: '#4ADE80' },
  'drift-adopted':  { bg: '#1a2a3a', text: '#89B1FF' },
}

export const STATUS_DESCRIPTIONS: Record<string, string> = {
  synced:      'Component exists in both the registry and Figma, and they match.',
  'in-sync':   'Component exists in both the registry and Figma, and they match.',
  'code-only': 'Component is in the registry but has no linked Figma component.',
  missing:     'Component is in the registry with a Figma mapping, but wasn\u2019t found in the file.',
  untracked:   'Component exists in the Figma file but isn\u2019t tracked in the registry.',
  unverified:  'Component is in the registry but hasn\u2019t been verified against Figma yet.',
  drift:       'Component exists in both, but differences were detected.',
  'drift-detected': 'Component exists in both, but differences were detected.',
  outdated:    'Registry data for this component is stale and needs updating.',
  'figma-only': 'Component exists only in Figma with no code counterpart.',
}

export const KIND_COLORS: Record<string, { bg: string; text: string }> = {
  page:      { bg: '#2a1a3a', text: '#C084FC' },
  section:   { bg: '#1a2a2a', text: '#5EEAD4' },
  component: { bg: '#2a2a2a', text: '#94A3B8' },
}

export const TAB_NAMES = ['Components', 'Tokens', 'Drift', 'Settings'] as const
export type TabName = (typeof TAB_NAMES)[number]

export interface SortOption {
  label: string
  key: 'status' | 'name' | 'name-desc' | 'lastVerified' | 'lastVerified-desc' | 'kind'
}

export const SORT_OPTIONS: SortOption[] = [
  { label: 'Status priority', key: 'status' },
  { label: 'Name A\u2013Z', key: 'name' },
  { label: 'Name Z\u2013A', key: 'name-desc' },
  { label: 'Last Verified (newest)', key: 'lastVerified' },
  { label: 'Last Verified (oldest)', key: 'lastVerified-desc' },
  { label: 'Kind', key: 'kind' },
]
