# `webdirlist`

One directory-listing API, two backends: a generated `files.txt` on the web, live `fs` in node.

## Boundary

- Standalone publishable library. It may depend on external packages or other `libs/`, never on
  `packages/`, a game, a shell, Electron or Steam. It currently has **zero runtime dependencies**
  and should keep them.
- **`.` must stay browser-safe.** Nothing reachable from `src/index.ts` may import `node:*`. The
  filesystem backend is the separate `webdirlist/node` entry (`src/node.ts`) for that reason, not
  for tidiness — a runtime `isNode` branch put `node:fs` in every web bundle in v1.
- `./node` deliberately has **no `development` export condition**: it is imported by build tooling
  (vite configs, scripts) that node resolves itself, so it must land on built JS, not TypeScript.
  Run `pnpm --filter webdirlist build` before anything that imports it.
- Relative imports inside `src/` carry explicit `.js` extensions, because `dist/node.js` is loaded
  by node directly (`bin/tracedir.mjs`), not only by bundlers.
- Public exported `.d.ts` signatures use `number`, never the ambient `int`/`uint`.

## Shape

| file | what it owns |
| --- | --- |
| `src/types.ts` | `FileEntry`, `ListOptions`, `DirChange`, the `DirList` interface |
| `src/paths.ts` | posix arithmetic on listing-relative paths — replaces `path-browserify-esm` |
| `src/filter.ts` | the single implementation of "does this file belong in the answer?" |
| `src/manifest.ts` | the `files.txt` format, both directions |
| `src/SnapshotDirList.ts` | queries, folder index, watcher fan-out — everything but obtaining entries |
| `src/ManifestDirList.ts` | web backend: `scan()` = fetch the manifest |
| `src/node.ts` | node backend: `scan()` = walk the disk; `watch()` = `fs.watch`; `writeManifest` |
| `src/tracedir.ts` | the CLI, a thin parser over `writeManifest` |

A backend supplies `scan()`. It supplies nothing else — if a change needs touching in both
backends, it is in the wrong place.

## Invariants worth keeping

1. **Queries are synchronous, refreshing is not.** A caller mid-render asks `files()`; only
   `refresh()` awaits. This is what lets one call site serve both environments.
2. **A watch event does not move the snapshot.** Queries answer from the last `refresh()` until
   something calls it again. Auto-refreshing on a change would mutate a listing under a half-built
   screen.
3. **A missing manifest rejects.** v1 resolved with an empty listing, making a forgotten build
   step indistinguishable from an empty directory.
4. **Both backends filter through `filter.ts`.** v1 copy-pasted the rules and the browser copy was
   missing the folder one.

## In this monorepo

`packages/configs/assetsDir.mjs` is the vite plugin that serves `<root>/assets` and regenerates
its `files.txt`; `packages/platform_env`'s `openAssetDir()` picks the backend (manifest in a
browser, an IPC bridge to a `NodeDirList` in the electron main process). The game only ever calls
`platform_env` — see the root `AGENTS.md` rule 3.

Run `pnpm test`, `pnpm typecheck` and `pnpm build` inside this directory before publishing.
