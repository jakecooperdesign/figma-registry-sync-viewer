# Registry Sync Viewer

A Figma plugin that visualizes the sync status between your design system registry (`figma-registry.json`) and the actual components and variables in a Figma file.

Built as a lightweight alternative to Figma Code Connect for teams on Pro plans.

## What it does

Upload your project's `figma-registry.json` and the plugin scans the current Figma file, then shows you:

- **Components Tab** — Which components are synced, code-only, missing from Figma, or untracked. Expandable rows show sync notes, variants, CSS scope, and related Figma nodes.
- **Tokens Tab** — Color, semantic, and spacing tokens matched by variable ID. Color swatches, CSS variable names, and value diff detection (RGBA float normalization built in).
- **Decisions Tab** — Design decision log grouped by date, filterable by action type (Figma update needed, completed, no action, etc.).
- **Settings Tab** — Current file info, registry stats, and actions to replace the registry, rescan, or clear cached data.

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

The registry JSON is cached in Figma's client storage, so it persists between sessions. To switch projects, go to **Settings > Replace Registry JSON** and upload a different file.

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

**Components** are matched by `figmaComponentKey` (primary) or `figmaNodeId` (fallback). Components in Figma but not in the registry show as "untracked" (excluding remote library components).

**Tokens** are matched by `figmaId` (Figma variable ID). Color values are normalized from Figma's RGBA floats to uppercase hex for comparison. Spacing values compare as numbers.

## Pro plan compatibility

`figma.fileKey` is `undefined` on Figma Pro plans. The plugin works regardless — all matching uses component keys and variable IDs, not the file key. A note in Settings explains this.

## Development

```bash
npm run watch   # Rebuild on file changes
npm run build   # Production build with typecheck + minify
```

Built with [create-figma-plugin](https://yuanqing.github.io/create-figma-plugin/) (esbuild + Preact).
