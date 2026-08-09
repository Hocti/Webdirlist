// Posix path arithmetic on *listing-relative* paths — the only path work this library does.
//
// It replaces the `path-browserify-esm` dependency, and with it the idea that a listing has a
// "current working directory". Every path in a listing is relative to that listing's root and
// spelled with forward slashes, on every platform and in every environment: `audio/se-hit.wav`,
// never `/assets/audio/se-hit.wav` and never `audio\se-hit.wav`. Turning one of those into a URL
// or an OS path is the caller's job, because only the caller knows which of the two it wants.

/**
 * A path in listing form: forward slashes, no leading or trailing slash, no `.` or `..`
 * segments, no repeated slashes. The root itself is `''`.
 */
export function normalisePath(path: string): string {
	const parts = path.replace(/\\/g, '/').split('/');
	const out: string[] = [];
	for (const part of parts) {
		if (part === '' || part === '.') continue;
		if (part === '..') {
			out.pop();
			continue;
		}
		out.push(part);
	}
	return out.join('/');
}

/** Join path segments and normalise the result. */
export function joinPath(...parts: string[]): string {
	return normalisePath(parts.join('/'));
}

/** The parent directory of a normalised path; `''` for anything directly at the root. */
export function dirName(path: string): string {
	const i = path.lastIndexOf('/');
	return i < 0 ? '' : path.slice(0, i);
}

/** The last segment of a path, extension included. */
export function baseName(path: string): string {
	const i = path.lastIndexOf('/');
	return i < 0 ? path : path.slice(i + 1);
}

/**
 * The extension without its dot, lower-cased; `''` when there is none. A leading dot is part of
 * the name, not an extension — `.DS_Store` has no extension, which is what makes it matchable by
 * the ignored-*files* list rather than accidentally by an ignored-*extension* list.
 */
export function extName(path: string): string {
	const name = baseName(path);
	const i = name.lastIndexOf('.');
	return i <= 0 ? '' : name.slice(i + 1).toLowerCase();
}

/** Every directory on the way from the root down to `path`, root first, `path` last. */
export function ancestorDirs(path: string): string[] {
	if (path === '') return [];
	const parts = path.split('/');
	const out: string[] = [];
	for (let i = 1; i <= parts.length; i++) out.push(parts.slice(0, i).join('/'));
	return out;
}

/** True when `path` is `dir` itself or sits underneath it. `dir === ''` is the whole listing. */
export function isUnder(path: string, dir: string): boolean {
	if (dir === '') return true;
	return path === dir || path.startsWith(dir + '/');
}

/** `path` re-expressed relative to `dir`, which must contain it. */
export function relativeTo(path: string, dir: string): string {
	if (dir === '') return path;
	return path === dir ? '' : path.slice(dir.length + 1);
}
