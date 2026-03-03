# Registry Sync Viewer

A Figma plugin that visualizes the sync status between your design system registry (`figma-registry.json`) and the actual components and variables in a Figma file.

Built as a lightweight alternative to Figma Code Connect for teams on Pro plans.

## What it does

Upload your project's `figma-registry.json` and the plugin scans the current Figma file, then shows you:

- **Components Tab** — Which components are synced, code-only, missing from Figma, or untracked. Variant sets are grouped under their parent component with tracked/untracked breakdowns. Expandable rows show sync notes, variants, CSS scope, and related Figma nodes.
- **Tokens Tab** — Color, semantic, and spacing tokens matched by variable ID. Color swatches, CSS variable names, and value diff detection (RGBA float normalization built in).
- **Decisions Tab** — Design decision log grouped by date, filterable by action type (Figma update needed, completed, no action, etc.).
- **Settings Tab** — Current file info, registry stats, export/copy registry, ignored component management, and actions to replace the registry, rescan, or clear cached data.

## Features

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
| **drift** | Component exists in both, but differences were detected |

### Ignore & restore components
Any component can be moved to the "Ignored" list via the dismiss button on its row. Ignored components are hidden from the main list and summary counts but remain accessible in a collapsible "Ignored" section at the bottom of the Components tab. Click the restore button to bring a component back. The ignore list persists across sessions.

### Export updated registry
The Settings tab includes **Export Registry** and **Copy Registry** buttons. Both produce an updated `figma-registry.json` that merges untracked (non-ignored) Figma components into the registry with `status: "untracked"` and pre-filled Figma metadata — ready to paste into your project or hand to an LLM for processing.

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

The registry JSON is cached in localStorage, so it persists between sessions (note: cache is cleared when the plugin is rebuilt during development). To switch projects, go to **Settings > Replace Registry JSON** and upload a different file.

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
  "decisions": {
    "2026-03-02": [
      { "component": "Dashboard", "issue": "...", "decision": "...", "action": "completed" }
    ]
  }
}
```

See the [types](src/types.ts) for the full schema.

## How comparison works

**Components** are matched by `figmaComponentKey` (primary) or `figmaNodeId` (fallback). Components in Figma but not in the registry show as "untracked" (excluding remote library components). Variant COMPONENT nodes are grouped under their parent COMPONENT_SET.

**Tokens** are matched by `figmaId` (Figma variable ID). Color values are normalized from Figma's RGBA floats to uppercase hex for comparison. Spacing values compare as numbers.

## Pro plan compatibility

`figma.fileKey` is `undefined` on Figma Pro plans. The plugin works regardless — all matching uses component keys and variable IDs, not the file key. A note in Settings explains this.

## Development

```bash
npm run watch   # Rebuild on file changes
npm run build   # Production build with typecheck + minify
```

Built with [create-figma-plugin](https://yuanqing.github.io/create-figma-plugin/) (esbuild + Preact).
