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

  // Decision actions
  'figma-update-needed': { bg: '#3a2a1a', text: '#FBBF24' },
  'figma-create-needed': { bg: '#1a2a3a', text: '#89B1FF' },
  'code-update-needed':  { bg: '#3a2a1a', text: '#FBBF24' },
  completed:             { bg: '#1a3a2a', text: '#4ADE80' },
  none:                  { bg: '#2a2a2a', text: '#94A3B8' },
}

export const STATUS_DESCRIPTIONS: Record<string, string> = {
  synced:      'Component exists in both the registry and Figma, and they match.',
  'in-sync':   'Component exists in both the registry and Figma, and they match.',
  'code-only': 'Component is in the registry but has no linked Figma component.',
  missing:     'Component is in the registry with a Figma mapping, but wasn\u2019t found in the file.',
  untracked:   'Component exists in the Figma file but isn\u2019t tracked in the registry.',
  unverified:  'Component is in the registry but hasn\u2019t been verified against Figma yet.',
  drift:       'Component exists in both, but differences were detected.',
}

export const KIND_COLORS: Record<string, { bg: string; text: string }> = {
  page:      { bg: '#2a1a3a', text: '#C084FC' },
  section:   { bg: '#1a2a2a', text: '#5EEAD4' },
  component: { bg: '#2a2a2a', text: '#94A3B8' },
}

export const TAB_NAMES = ['Components', 'Tokens', 'Decisions', 'Settings'] as const
export type TabName = (typeof TAB_NAMES)[number]
