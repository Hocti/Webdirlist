// The shape every backend agrees on. Nothing here imports a backend, so this file is safe in a
// browser bundle, in a worker, in node, and in a test.

/** One file in a listing. All paths are listing-relative posix paths — see `paths.ts`. */
export type FileEntry = {
	/** e.g. `audio/se-hit.wav` */
	path: string;
	/** e.g. `se-hit.wav` */
	name: string;
	/** lower-cased, no dot, `''` when the file has none */
	ext: string;
	/** the containing directory, `''` at the root */
	dir: string;
	/** bytes */
	size: number;
	/** last-modified time, **unix seconds** (not milliseconds — the manifest stores seconds) */
	mtime: number;
};

/**
 * Which files a query returns. Every field is optional; a `DirList` may also be constructed with
 * defaults, in which case a per-query option overrides the default of the same name.
 *
 * `includeExt` wins over `excludeExt`: given both, a file must be in `includeExt` *and* out of
 * `excludeExt`.
 */
export type ListOptions = {
	/** descend into sub-directories (default `true`) */
	subfolders?: boolean;
	/** extensions to keep, without dots, case-insensitive — when set, nothing else is returned */
	includeExt?: readonly string[];
	/** extensions to drop, without dots, case-insensitive */
	excludeExt?: readonly string[];
	/** file names (not paths) to drop */
	ignoreFiles?: readonly string[];
	/** directory names (not paths) to drop, at any depth */
	ignoreFolders?: readonly string[];
	/** drop the built-in noise lists too (default `true`) — see `DEFAULT_IGNORE_*` */
	applyDefaultIgnores?: boolean;
};

/** What a watcher reports. `removed` carries no entry; the others carry the file as it now is. */
export type DirChange = {
	type: 'added' | 'changed' | 'removed';
	/** listing-relative path */
	path: string;
	entry?: FileEntry;
};

/**
 * A directory tree that has already been read, and can be read again.
 *
 * Queries are **synchronous** on purpose: a game asks "what is in `characters/`?" in the middle
 * of building a screen, and every backend can answer from a snapshot it already holds. Getting a
 * *newer* snapshot is the async part, and it is one explicit call — {@link DirList.refresh}.
 * That is the whole difference between the two environments this library exists for: on the web
 * a refresh re-fetches a manifest generated at build time, in node it re-walks the real
 * filesystem, and the code asking the questions cannot tell which it got.
 */
export interface DirList {
	/** A label for the tree — a base URL on the web, an absolute directory in node. Diagnostics only. */
	readonly root: string;

	/** Files under `dir` (default: the whole tree), sorted by path. */
	files(dir?: string, options?: ListOptions): FileEntry[];

	/** Immediate sub-directory paths of `dir`, sorted. Directories with no files in them do not exist. */
	folders(dir?: string): string[];

	/** One file by listing-relative path, or `undefined`. */
	get(path: string): FileEntry | undefined;

	/** Total bytes of the files a query returns — what a loading bar needs before it starts. */
	totalSize(dir?: string, options?: ListOptions): number;

	/** Read the tree again. Everything the queries return is from the latest completed refresh. */
	refresh(): Promise<void>;

	/**
	 * Watch for changes made after the last refresh. Returns an unsubscribe function.
	 *
	 * Backends that cannot observe their source (a fetched manifest) accept listeners and never
	 * call them, so a caller never has to ask which backend it has. **A change does not update
	 * the snapshot** — the queries keep answering from the last {@link DirList.refresh} until
	 * something calls it again. That keeps "what the listing says" a single, explicit moment.
	 */
	watch(listener: (change: DirChange) => void): () => void;
}
