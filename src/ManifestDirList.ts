// The web backend: a directory listing read from a `files.txt` that a build step generated.
//
// A browser cannot list a directory, so something has to have written down what is there. That
// is the only thing this backend does differently — the questions and the answers are the same
// ones `NodeDirList` gives.
import { MANIFEST_NAME, parseManifest } from './manifest.js';
import { SnapshotDirList } from './SnapshotDirList.js';
import type { FileEntry, ListOptions } from './types.js';

export type ManifestDirOptions = ListOptions & {
	/** Manifest file name, if the build writes something other than `files.txt`. */
	manifestName?: string;
	/** Injected for tests; defaults to the global `fetch`. */
	fetchImpl?: typeof fetch;
};

/** Join a base URL and a listing-relative path without collapsing the `//` in `https://`. */
export function joinUrl(baseUrl: string, path: string): string {
	const base = baseUrl.replace(/\/+$/, '');
	const rel = path.replace(/^\/+/, '');
	return rel === '' ? base : `${base}/${rel}`;
}

export class ManifestDirList extends SnapshotDirList {
	private readonly manifestName: string;
	private readonly fetchImpl: typeof fetch;

	/** `baseUrl` is where the tree is served from — `/assets`, `https://cdn.example.com/pack`. */
	constructor(baseUrl: string, options: ManifestDirOptions = {}) {
		const { manifestName = MANIFEST_NAME, fetchImpl, ...listOptions } = options;
		super(baseUrl.replace(/\/+$/, ''), listOptions);
		this.manifestName = manifestName;
		this.fetchImpl = fetchImpl ?? ((...args) => fetch(...args));
	}

	/** The URL a file in this listing is actually loaded from. */
	url(path: string): string {
		return joinUrl(this.root, path);
	}

	/** Seed the listing from manifest text already in hand — an inlined manifest, or a test. */
	load(text: string): void {
		this.replace(parseManifest(text));
	}

	protected async scan(): Promise<FileEntry[]> {
		const url = joinUrl(this.root, this.manifestName);
		// A missing manifest is a real failure and must reject. v1 caught it, called
		// `Promise.reject` on a value nobody returned, and resolved with an empty listing — so a
		// deploy that forgot to run the generator looked exactly like a game with no assets.
		const response = await this.fetchImpl(url, { cache: 'no-cache' });
		if (!response.ok) throw new Error(`[webdirlist] ${url} → HTTP ${response.status}`);
		return parseManifest(await response.text());
	}
}

/** Fetch a manifest and return the listing it describes. */
export async function openManifestDir(baseUrl: string, options: ManifestDirOptions = {}): Promise<ManifestDirList> {
	const list = new ManifestDirList(baseUrl, options);
	await list.refresh();
	return list;
}
