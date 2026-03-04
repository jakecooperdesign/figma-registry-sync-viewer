# Registry Sync Viewer

A Figma plugin that visualizes the sync status between your design system registry (`figma-registry.json`) and the actual components and variables in a Figma file.

Built as a lightweight alternative to Figma Code Connect for teams on Pro plans.

## What it does

Upload your project's `figma-registry.json` and the plugin scans the current Figma file, then shows you:

- **Components Tab** — Which components are synced, code-only, missing from Figma, untracked, or drifted. Variant sets are grouped under their parent component with tracked/untracked breakdowns. Expandable rows show sync notes, drift reasons, pending changes, variants, CSS scope, and related Figma nodes. Inline sync actions let you accept drift, mark as synced, add to registry, or update from Figma — all without leaving the plugin.
- **Tokens Tab** — Color, semantic, and spacing tokens matched by variable ID. Color swatches, CSS variable names, and value diff detection (RGBA float normalization built in).
- **Drift Tab** — Active, resolved, and adopted drift entries from the registry. Filterable by status, searchable, and sortable by date or component name. Accept individual drift entries inline.
- **Settings Tab** — File info, registry overview with metric cards, audit flags, export/copy registry (with overrides merged), ignored component management, and bulk actions for drift and overrides.

## Features

### Sync actions

Each component row has contextual action buttons based on its status:

| Action | Available when | What it does |
|--------|---------------|--------------|
| **Add to Registry** | Untracked | Creates a new registry entry from the Figma component |
| **Mark as Synced** | Unverified, missing | Marks the component as synced with today's date |
| **Accept Drift** | Drift detected | Acknowledges drift as intentional and marks as synced |
| **Update from Figma** | Drift detected | Pulls the latest name, key, and variants from Figma |
| **Undo** | Any overridden component | Reverts the component to its original registry status |

All sync actions are tracked as pending overrides until you export the updated registry.

### Drift detection

Components matched in both the registry and Figma are checked for drift:
- Name mismatches between registry and Figma
- Variant count discrepancies
- Missing specific variants

Drift reasons are shown as badges in the expanded component row, along with any pending changes and their priority.

### Status filtering

Click any status pill in the summary bar (e.g. "15 synced", "3 missing") to filter the component list to that status. Click again to clear the filter. Works alongside the text search.

### Status descriptions

Hover over a status pill to see a plain-English description of what it means. Expanding a component row also shows the description inline. The statuses are:

| Status | Meaning |
|--------|---------|
| **synced** | Component exists in both the registry and Figma, and they match |
| **code-only** | Component is in the registry but has no linked Figma component |
| **missing** | Component is in the registry with a Figma mapping, but wasn't found in the file |
| **untracked** | Component exists in the Figma file but isn't tracked in the registry |
| **unverified** | Component is in the registry but hasn't been verified against Figma yet |
| **drift-detected** | Component exists in both, but differences were detected |
| **outdated** | Registry data for this component is stale |

### Sorting

Components can be sorted by:
- Status priority (default)
- Name A–Z / Z–A
- Last verified (newest or oldest first)
- Kind (page / section / component)

### Pin & unpin

Star any component to pin it to the top of the list regardless of sort order. Pins persist across sessions.

### Ignore & restore components

Any component can be moved to the "Ignored" list via the dismiss button on its row. Ignored components are hidden from the main list and summary counts but remain accessible in a collapsible "Ignored" section at the bottom of the Components tab. Click the restore button to bring a component back. The ignore list persists across sessions.

### Export updated registry

The Settings tab includes **Download JSON** and **Copy to Clipboard** buttons. Both produce an updated `figma-registry.json` that merges:
- Pending sync overrides (add to registry, mark synced, update from Figma)
- Accepted drift entries moved to the `drift.resolved` section
- Untracked (non-ignored) Figma components with pre-filled metadata

The exported file preserves all unknown top-level keys and per-component fields from the original registry.

### Audit flags

If the registry includes an `auditFlags` array, the Settings tab displays them with severity-based coloring (error, warning, info) and location context.

### Bulk actions

The Settings tab provides bulk operations:
- **Accept All Drift** — Acknowledge all active drift as intentional in one click
- **Undo All Drift** — Revert all drift acceptances from the current session
- **Clear All Overrides** — Discard all pending overrides and drift acceptances (requires confirmation)

### Variant grouping

Component variant sets (COMPONENT_SET nodes in Figma) are grouped together rather than listed individually. Each group shows:
- Total variant count in the row header
- A tracked/untracked breakdown when expanded
- Individual variant rows with their own status badges

### Navigate to component

Each component and variant with a known node ID has a navigate button that scrolls and zooms to the component in the Figma file, switching pages if necessary and selecting the node.

### Copy prompt snippet

Each component row has a copy button that copies a prompt-ready snippet to the clipboard. The snippet identifies the component by name, code path, Figma name, node ID, and CSS selectors, plus a one-line status summary — enough context to start an LLM conversation about that specific component.

Example:
> I'm working on the Button component (src/components/Button.tsx, Figma: "Button", node: 4:123, CSS: .btn, .btn-primary). It's drifted out of sync between code and Figma.

## Install

```bash
git clone <repo-url>
cd figma-registry-sync-viewer
npm install
npm run build
```

In Figma Desktop: **Plugins > Development > Import plugin from manifest** and point to the `manifest.json` in the repo root.

## Usage

1. Open the plugin in any Figma file
2. Upload your `figma-registry.json` (drag and drop or file picker)
3. The plugin scans the file for components and variables, then runs the comparison
4. Browse results across the four tabs
5. Use sync actions to accept drift, mark components as synced, or add untracked components
6. Export the updated registry from Settings when ready

The registry JSON is cached in localStorage, so it persists between sessions (note: cache is cleared when the plugin is rebuilt during development). To switch projects, go to **Settings > Replace Registry** and upload a different file.

## Registry JSON format

The plugin expects a JSON file with this structure:

```json
{
  "meta": {
    "fileKey": "your-figma-file-key",
    "lastFullSync": "2026-03-02"
  },
  "tokens": {
    "primitives": { "brand/base": { "figmaId": "VariableID:...", "value": "#178BFF", "cssVar": "--tv-brand-base" } },
    "semantics": { "..." : "..." },
    "spacing": { "..." : "..." }
  },
  "components": {
    "ShowCard": {
      "codePath": "components/shows/ShowCard.tsx",
      "figmaComponentKey": "00c73e...",
      "figmaNodeId": "93:9791",
      "status": "synced",
      "syncNotes": "..."
    }
  },
  "drift": {
    "active": [{ "component": "Header", "issue": "Name mismatch", "date": "2026-03-01" }],
    "resolved": [],
    "adopted": []
  },
  "auditFlags": [
    { "severity": "warning", "issue": "Missing figmaNodeId", "location": "components.Footer" }
  ]
}
```

See the [types](src/types.ts) for the full schema.

## How comparison works

**Components** are matched by `figmaComponentKey` (primary) or `figmaNodeId` (fallback). Components in Figma but not in the registry show as "untracked" (excluding remote library components). Variant COMPONENT nodes are grouped under their parent COMPONENT_SET. Matched components are checked for drift by comparing names, variant counts, and specific variant presence.

**Tokens** are matched by `figmaId` (Figma variable ID). Color values are normalized from Figma's RGBA floats to uppercase hex for comparison. Spacing values compare as numbers.

## Pro plan compatibility

`figma.fileKey` is `undefined` on Figma Pro plans. The plugin works regardless — all matching uses component keys and variable IDs, not the file key. A note in Settings explains this.

## Development

```bash
npm run watch   # Rebuild on file changes
npm run build   # Production build with typecheck + minify
```

Built with [create-figma-plugin](https://yuanqing.github.io/create-figma-plugin/) (esbuild + Preact).
