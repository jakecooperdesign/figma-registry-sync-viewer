export const STORAGE_KEY = 'registry-sync-viewer-state'

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

export const TAB_NAMES = ['Components', 'Tokens', 'Decisions', 'Settings'] as const
export type TabName = (typeof TAB_NAMES)[number]
