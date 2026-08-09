// The `files.txt` format: one file per line, `path<TAB>size<TAB>mtime`.
//
// Unchanged from v1 on purpose — a manifest already deployed next to a static site keeps
// working. What changed is that parsing is now total: a malformed line is skipped rather than
// producing a half-filled entry, and blank lines and `#` comments are allowed so a generator can
// stamp one in without breaking every reader.
import { baseName, dirName, extName, normalisePath } from './paths.js';
import type { FileEntry } from './types.js';

/** The file a static host is expected to serve beside the directory it describes. */
export const MANIFEST_NAME = 'files.txt';

/** Build a `FileEntry` from the three things the manifest stores. */
export function makeEntry(path: string, size: number, mtime: number): FileEntry {
	const p = normalisePath(path);
	return { path: p, name: baseName(p), ext: extName(p), dir: dirName(p), size, mtime };
}

/** Serialise entries to manifest text, sorted by path so a rebuild is a stable diff. */
export function formatManifest(entries: readonly FileEntry[]): string {
	return [...entries]
		.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
		.map((e) => `${e.path}\t${e.size}\t${e.mtime}`)
		.join('\n');
}

/** Parse manifest text. Lines that are not `path<TAB>size<TAB>mtime` are skipped, not guessed at. */
export function parseManifest(text: string): FileEntry[] {
	const out: FileEntry[] = [];
	for (const raw of text.split('\n')) {
		const line = raw.replace(/\r$/, '');
		if (line === '' || line.startsWith('#')) continue;
		const parts = line.split('\t');
		if (parts.length !== 3) continue;
		const [path, sizeText, mtimeText] = parts;
		const size = Number(sizeText);
		const mtime = Number(mtimeText);
		if (path === '' || !Number.isFinite(size) || !Number.isFinite(mtime)) continue;
		out.push(makeEntry(path, size, mtime));
	}
	return out;
}
