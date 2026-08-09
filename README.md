# webdirlist

[![npm version](https://img.shields.io/npm/v/webdirlist.svg?logo=npm)](https://www.npmjs.com/package/webdirlist)

List a directory tree, and ask the same questions about it in a browser and in node.

A browser cannot list a directory. So on the web, a build step writes down what is there
(`files.txt`) and the library reads that back; in node it walks the real filesystem instead. The
code doing the asking cannot tell which backend it got — same methods, same answers, same
filtering.

The point is data that has **no central index**: the characters in a game are the sub-folders of
`characters/`, and adding one should be adding a folder, not editing a registry file that someone
will forget.

## Install

```sh
npm install webdirlist
npm install -g webdirlist   # to run `tracedir` anywhere
```

Zero runtime dependencies.

## Generate the manifest

```sh
tracedir                       # the current directory → ./files.txt
tracedir ./assets              # ./assets → ./assets/files.txt
tracedir ./assets ./dist/assets/files.txt
tracedir ./assets --ext wav,ogg --skip drafts --flat
```

The format is one file per line, `path<TAB>size<TAB>mtime` (mtime in unix **seconds**), paths
relative to the scanned directory with forward slashes:

```
audio/bgm-menu.wav	132344	1784761347
audio/se-hit.wav	3572	1784761347
```

Blank lines and `#` comments are ignored, and a malformed line is skipped rather than guessed at.
From a build script, call the same work directly:

```js
import { writeManifest } from 'webdirlist/node';

await writeManifest('assets', 'dist/assets/files.txt');
```

## Read it — browser

```js
import { openManifestDir } from 'webdirlist';

const assets = await openManifestDir('/assets'); // fetches /assets/files.txt

assets.files('audio', { includeExt: ['wav'] }); // FileEntry[], sorted by path
assets.folders('characters'); // ['characters/knight', 'characters/mage']
assets.get('audio/se-hit.wav'); // { path, name, ext, dir, size, mtime }
assets.totalSize('audio'); // bytes — what a loading bar needs before it starts
assets.url('audio/se-hit.wav'); // '/assets/audio/se-hit.wav'
```

## Read it — node

```js
import { openNodeDir } from 'webdirlist/node';

const assets = await openNodeDir('./assets');

assets.files('audio'); // same call, no manifest involved
assets.absolute('audio/se-hit.wav'); // '/…/assets/audio/se-hit.wav'

await assets.refresh(); // re-walks the disk — a file edited a moment ago is now current
assets.watch((change) => console.log(change.type, change.path));
```

`webdirlist/node` is a separate entry point so `node:fs` can never reach a web bundle.

## The model

Queries are **synchronous**, because a caller asks "what is in `characters/`?" while building a
screen and every backend can answer from a snapshot it already holds. Getting a *newer* snapshot
is the async part, and it is one explicit call:

| | `refresh()` re-reads | `watch()` reports |
| --- | --- | --- |
| `openManifestDir` (web) | the manifest, over `fetch` | nothing — a static host cannot tell you |
| `openNodeDir` (node) | the real directory | every add / change / remove, debounced |

A watch event does **not** move the snapshot. Queries keep answering from the last `refresh()`
until something calls it again, so "what the listing says" stays one explicit moment rather than
something that shifts under a half-built screen.

## Options

Every query takes these, and a listing can be constructed with defaults that queries override
field by field:

```js
assets.files('audio', {
	subfolders: true, // descend (default true)
	includeExt: ['wav', 'ogg'], // only these — wins over excludeExt
	excludeExt: ['txt'],
	ignoreFiles: ['unused.wav'], // by name, not path
	ignoreFolders: ['drafts'], // by name, at any depth
	applyDefaultIgnores: true, // drop files.txt, .DS_Store, node_modules, .psd … (default true)
});
```

## Migrating from 1.x

- `webdirlist.getInstance()` and its global "current directory" are gone. Open a listing per
  directory: `openManifestDir(baseUrl)` / `openNodeDir(dir)`.
- `getFileList()` returned `string[]`, or tab-joined strings when you passed `detail: true`.
  `files()` returns `FileEntry[]` — no second format, no parsing the result back.
- The environment is chosen by which entry point you import, not by a runtime `isNode` check.
- `ignoreFolder` → `ignoreFolders`, `subfolder` → `subfolders`. The folder rule is now applied on
  the web too; in 1.x the browser accepted the option and ignored it.
- A missing `files.txt` rejects. In 1.x it resolved with an empty listing, so a deploy that forgot
  to run `tracedir` looked exactly like a directory with nothing in it.
- The `path-browserify-esm` re-export (`webPath`) is gone; `webdirlist` exports the small posix
  helpers it actually uses (`joinPath`, `dirName`, `extName`, …).

## License

MIT
