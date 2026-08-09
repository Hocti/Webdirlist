// Everything a `DirList` does once it holds a set of entries — which is everything except
// obtaining them. A backend supplies `scan()`; this supplies the queries, the folder index and
// the change fan-out, identically for all of them.
import { accepts, folderIgnored, makeFilter } from './filter.js';
import { makeEntry } from './manifest.js';
import { ancestorDirs, baseName, isUnder, normalisePath, relativeTo } from './paths.js';
import type { DirChange, DirList, FileEntry, ListOptions } from './types.js';

export abstract class SnapshotDirList implements DirList {
	readonly root: string;

	/** path → entry, for the whole tree. Replaced wholesale by `refresh()`, never mutated in place. */
	protected entries = new Map<string, FileEntry>();
	/** every directory that contains at least one file, plus each of its ancestors, plus `''`. */
	protected dirs = new Set<string>(['']);

	private readonly listeners = new Set<(change: DirChange) => void>();

	/** Options every query inherits unless it overrides them field by field. */
	protected readonly defaults: ListOptions;

	constructor(root: string, defaults: ListOptions = {}) {
		this.root = root;
		this.defaults = defaults;
	}

	/** Read the source and return the whole tree. Called by `refresh()` and nothing else. */
	protected abstract scan(): Promise<FileEntry[]>;

	async refresh(): Promise<void> {
		this.replace(await this.scan());
	}

	/** Install a freshly scanned tree. Kept separate from `refresh` so tests can seed a listing. */
	protected replace(entries: readonly FileEntry[]): void {
		const map = new Map<string, FileEntry>();
		const dirs = new Set<string>(['']);
		for (const entry of entries) {
			map.set(entry.path, entry);
			for (const dir of ancestorDirs(entry.dir)) dirs.add(dir);
		}
		this.entries = map;
		this.dirs = dirs;
	}

	files(dir = '', options: ListOptions = {}): FileEntry[] {
		const base = normalisePath(dir);
		const filter = makeFilter(this.defaults, options);
		const out: FileEntry[] = [];
		for (const entry of this.entries.values()) {
			if (accepts(entry, base, filter)) out.push(entry);
		}
		return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
	}

	folders(dir = ''): string[] {
		const base = normalisePath(dir);
		const filter = makeFilter(this.defaults);
		const out: string[] = [];
		for (const candidate of this.dirs) {
			if (candidate === base || !isUnder(candidate, base)) continue;
			const rel = relativeTo(candidate, base);
			if (rel.includes('/')) continue; // immediate children only
			if (folderIgnored(baseName(candidate), filter)) continue;
			out.push(candidate);
		}
		return out.sort();
	}

	get(path: string): FileEntry | undefined {
		return this.entries.get(normalisePath(path));
	}

	totalSize(dir = '', options: ListOptions = {}): number {
		let total = 0;
		for (const entry of this.files(dir, options)) total += entry.size;
		return total;
	}

	watch(listener: (change: DirChange) => void): () => void {
		this.listeners.add(listener);
		this.onWatchersChanged(this.listeners.size);
		return () => {
			this.listeners.delete(listener);
			this.onWatchersChanged(this.listeners.size);
		};
	}

	/**
	 * A backend that can observe its source starts doing so on the first listener and stops on the
	 * last — so a listing nobody is watching costs nothing. The default does nothing, which is
	 * what a fetched manifest can do about a file changing on the server.
	 */
	protected onWatchersChanged(_count: number): void {}

	protected emit(change: DirChange): void {
		for (const listener of this.listeners) {
			try {
				listener(change);
			} catch {
				// one bad listener must not stop the others
			}
		}
	}

	/** Compare a path's current state against the snapshot and emit the difference, if any. */
	protected emitDiff(path: string, current: { size: number; mtime: number } | undefined): void {
		const previous = this.entries.get(path);
		if (!current) {
			if (previous) this.emit({ type: 'removed', path });
			return;
		}
		if (previous && previous.size === current.size && previous.mtime === current.mtime) return;
		const entry = makeEntry(path, current.size, current.mtime);
		this.emit({ type: previous ? 'changed' : 'added', path, entry });
	}
}
