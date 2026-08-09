// Node entry point: `webdirlist/node`. The one part of the library that touches a filesystem.
//
// Separate from `.` rather than branched inside it. v1 decided at runtime with an `isNode` flag
// and reached the filesystem through `await import('node:fs')`, which meant every web bundle
// carried a code path a browser can never take and every bundler had to be told to leave
// `node:fs` alone. A second entry costs one import specifier and removes the whole problem.
//
// The difference that matters to a caller: this backend has no manifest. `refresh()` walks the
// real directory, so a file edited while the app is running shows its new size and mtime the
// next time anything asks — and `watch()` says so as it happens.
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { watch as fsWatch, type FSWatcher } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { formatManifest, MANIFEST_NAME, makeEntry } from './manifest.js';
import { makeFilter, folderIgnored } from './filter.js';
import { SnapshotDirList } from './SnapshotDirList.js';
import type { FileEntry, ListOptions } from './types.js';

export type NodeDirOptions = ListOptions & {
	/** Coalesce filesystem events this many ms before reporting them (default 120). */
	watchDebounceMs?: number;
};

/** An OS path under `root`, expressed the way a listing spells it. */
function toListingPath(root: string, absolute: string): string {
	return relative(root, absolute).split(sep).join('/');
}

export class NodeDirList extends SnapshotDirList {
	private readonly debounceMs: number;
	private watcher?: FSWatcher;
	private pending = new Map<string, ReturnType<typeof setTimeout>>();

	constructor(dir: string, options: NodeDirOptions = {}) {
		const { watchDebounceMs = 120, ...listOptions } = options;
		super(resolve(dir), listOptions);
		this.debounceMs = watchDebounceMs;
	}

	/** The absolute OS path of a file in this listing — what `fs` and `<img src>` need respectively. */
	absolute(path: string): string {
		return join(this.root, ...path.split('/'));
	}

	protected async scan(): Promise<FileEntry[]> {
		// `ignoreFolders` is applied during the walk, not after it: not descending into
		// `node_modules` is the difference between a scan that takes a millisecond and one that
		// takes a minute. Queries filter again, so a per-query override still behaves.
		const filter = makeFilter(this.defaults);
		const out: FileEntry[] = [];

		const walk = async (dir: string): Promise<void> => {
			const entries = await readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				const absolute = join(dir, entry.name);
				if (entry.isDirectory()) {
					if (!folderIgnored(entry.name, filter)) await walk(absolute);
					continue;
				}
				if (!entry.isFile()) continue; // sockets, fifos, dangling symlinks
				const info = await stat(absolute);
				out.push(makeEntry(toListingPath(this.root, absolute), info.size, Math.floor(info.mtimeMs / 1000)));
			}
		};

		await walk(this.root);
		return out;
	}

	/** Write this listing out as a `files.txt` a browser can read. */
	async writeManifest(target = join(this.root, MANIFEST_NAME)): Promise<string> {
		const text = formatManifest(this.files());
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, text + '\n', 'utf8');
		return text;
	}

	protected onWatchersChanged(count: number): void {
		if (count > 0 && !this.watcher) this.startWatching();
		if (count === 0) this.stopWatching();
	}

	private startWatching(): void {
		// Recursive watching is native on macOS and Windows and has been supported on Linux since
		// node 20. If the platform refuses, the listing still works — it just never reports.
		try {
			this.watcher = fsWatch(this.root, { recursive: true, persistent: false }, (_event, name) => {
				if (!name) return;
				this.queue(toListingPath(this.root, join(this.root, name.toString())));
			});
			this.watcher.on('error', () => this.stopWatching());
		} catch {
			this.watcher = undefined;
		}
	}

	private stopWatching(): void {
		this.watcher?.close();
		this.watcher = undefined;
		for (const timer of this.pending.values()) clearTimeout(timer);
		this.pending.clear();
	}

	/**
	 * One editor save is several filesystem events — truncate, write, set mtime. Reporting each
	 * one is noise, and worse, the middle of them is a half-written file with a nonsense size.
	 * Wait for the path to go quiet, then stat it once.
	 */
	private queue(path: string): void {
		clearTimeout(this.pending.get(path));
		this.pending.set(
			path,
			setTimeout(() => {
				this.pending.delete(path);
				void this.report(path);
			}, this.debounceMs)
		);
	}

	private async report(path: string): Promise<void> {
		try {
			const info = await stat(this.absolute(path));
			if (!info.isFile()) return;
			this.emitDiff(path, { size: info.size, mtime: Math.floor(info.mtimeMs / 1000) });
		} catch {
			this.emitDiff(path, undefined); // gone
		}
	}
}

/** Walk `dir` and return the listing. The node counterpart of `openManifestDir`. */
export async function openNodeDir(dir: string, options: NodeDirOptions = {}): Promise<NodeDirList> {
	const list = new NodeDirList(dir, options);
	await list.refresh();
	return list;
}

/**
 * Scan `dir` and write its `files.txt`. This is what a build step calls — the whole reason the
 * web backend has anything to read.
 *
 * `target` defaults to `files.txt` inside `dir`; pass one when the served copy of the tree is
 * somewhere else (a vite `outDir`, say).
 */
export async function writeManifest(dir: string, target?: string, options: NodeDirOptions = {}): Promise<string> {
	const list = await openNodeDir(dir, options);
	return list.writeManifest(target);
}

// Re-exported so a node-only consumer needs one import, not two.
export * from './index.js';
