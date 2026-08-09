// One implementation of "does this file belong in the answer?", shared by every backend.
//
// It used to be copy-pasted between the browser and the node path, with the folder rule present
// in one and missing in the other — `ignoreFolder` was accepted, documented, and silently
// ignored by the web listing. Filtering identically in both is the point of the library.
import { extName, isUnder, relativeTo } from './paths.js';
import type { FileEntry, ListOptions } from './types.js';

/** Source files that describe art, not art a game can load. */
export const DEFAULT_IGNORE_EXT: readonly string[] = ['fla', 'psd', 'ai', 'db'];

/** The manifest itself, plus what the two desktop platforms scatter through every folder. */
export const DEFAULT_IGNORE_FILES: readonly string[] = ['files.txt', 'desktop.ini', '.DS_Store', 'Thumbs.db'];

export const DEFAULT_IGNORE_FOLDERS: readonly string[] = ['temp', '.git', '.svn', 'node_modules', '__MACOSX'];

const lower = (values: readonly string[] | undefined): Set<string> | undefined =>
	values && new Set(values.map((v) => v.toLowerCase()));

/** `ListOptions` resolved once per query, so the per-file test is set lookups and nothing else. */
export type Filter = {
	subfolders: boolean;
	includeExt?: Set<string>;
	excludeExt: Set<string>;
	ignoreFiles: Set<string>;
	ignoreFolders: Set<string>;
};

export function makeFilter(...layers: (ListOptions | undefined)[]): Filter {
	const o: ListOptions = Object.assign({}, ...layers.filter(Boolean));
	const defaults = o.applyDefaultIgnores ?? true;
	return {
		subfolders: o.subfolders ?? true,
		includeExt: lower(o.includeExt),
		excludeExt: new Set(
			[...(o.excludeExt ?? []), ...(defaults ? DEFAULT_IGNORE_EXT : [])].map((v) => v.toLowerCase())
		),
		ignoreFiles: new Set([...(o.ignoreFiles ?? []), ...(defaults ? DEFAULT_IGNORE_FILES : [])]),
		ignoreFolders: new Set([...(o.ignoreFolders ?? []), ...(defaults ? DEFAULT_IGNORE_FOLDERS : [])]),
	};
}

/** True when a directory *name* (one segment, not a path) is one the query does not want. */
export function folderIgnored(name: string, filter: Filter): boolean {
	return filter.ignoreFolders.has(name);
}

/**
 * Does `entry` belong in the answer to a query rooted at `dir`?
 *
 * `dir` matters twice: it bounds the search, and it is where the `subfolders` and `ignoreFolders`
 * rules start counting from — a folder named `temp` *above* the queried directory is not a reason
 * to hide what the caller explicitly asked for.
 */
export function accepts(entry: FileEntry, dir: string, filter: Filter): boolean {
	if (!isUnder(entry.path, dir)) return false;

	const rel = relativeTo(entry.dir, dir);
	if (rel !== '' && !filter.subfolders) return false;
	if (rel !== '' && rel.split('/').some((name) => folderIgnored(name, filter))) return false;

	if (filter.ignoreFiles.has(entry.name)) return false;

	const ext = entry.ext || extName(entry.name);
	if (filter.includeExt && !filter.includeExt.has(ext)) return false;
	if (filter.excludeExt.has(ext)) return false;

	return true;
}
