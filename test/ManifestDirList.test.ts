import { describe, expect, it, vi } from 'vitest';
import { ManifestDirList, joinUrl, openManifestDir } from '../src/ManifestDirList';

const TREE = [
	'audio/bgm/menu.wav	2048	10',
	'audio/se/hit.wav	512	11',
	'audio/se/click.WAV	256	12',
	'audio/readme.txt	9	13',
	'characters/knight/model.json	64	14',
	'characters/knight/temp/wip.json	64	15',
	'.DS_Store	6148	16',
	'art/source.psd	999	17',
].join('\n');

const list = (): ManifestDirList => {
	const l = new ManifestDirList('/assets');
	l.load(TREE);
	return l;
};

describe('queries', () => {
	it('returns the whole tree, sorted, minus the built-in noise', () => {
		expect(
			list()
				.files()
				.map((e) => e.path)
		).toEqual([
			'audio/bgm/menu.wav',
			'audio/readme.txt',
			'audio/se/click.WAV',
			'audio/se/hit.wav',
			'characters/knight/model.json',
		]);
	});

	it('scopes to a directory, and `subfolders: false` means this directory only', () => {
		expect(
			list()
				.files('audio/se')
				.map((e) => e.name)
		).toEqual(['click.WAV', 'hit.wav']);
		expect(
			list()
				.files('audio', { subfolders: false })
				.map((e) => e.name)
		).toEqual(['readme.txt']);
	});

	it('filters by extension case-insensitively', () => {
		// Sorted by path, so `audio/bgm/menu.wav` comes before either file in `audio/se`.
		expect(
			list()
				.files('audio', { includeExt: ['WAV'] })
				.map((e) => e.name)
		).toEqual(['menu.wav', 'click.WAV', 'hit.wav']);
		expect(
			list()
				.files('audio', { excludeExt: ['txt'] })
				.map((e) => e.name)
		).not.toContain('readme.txt');
	});

	// The bug this library shipped with: `ignoreFolder` was accepted and documented by the web
	// path and only ever applied by the node one.
	it('applies ignoreFolders on the web exactly as node does', () => {
		expect(
			list()
				.files('characters')
				.map((e) => e.path)
		).toEqual(['characters/knight/model.json']);
		expect(list().files('characters', { applyDefaultIgnores: false, ignoreFolders: ['knight'] })).toEqual([]);
	});

	it('lists immediate sub-directories only', () => {
		expect(list().folders()).toEqual(['art', 'audio', 'characters']);
		expect(list().folders('audio')).toEqual(['audio/bgm', 'audio/se']);
		expect(list().folders('audio/se')).toEqual([]);
	});

	it('answers by path, and totals the bytes a loading bar needs', () => {
		expect(list().get('audio/se/hit.wav')?.size).toBe(512);
		expect(list().get('/audio/se/hit.wav')?.size).toBe(512); // normalised on the way in
		expect(list().get('nope.wav')).toBeUndefined();
		expect(list().totalSize('audio/se')).toBe(768);
	});

	it('maps a listing path back to the URL it is served from', () => {
		expect(list().url('audio/se/hit.wav')).toBe('/assets/audio/se/hit.wav');
		expect(joinUrl('https://cdn.example.com/pack/', '/a.wav')).toBe('https://cdn.example.com/pack/a.wav');
	});
});

describe('fetching', () => {
	it('loads the manifest from the base url', async () => {
		const fetchImpl = vi.fn(async (_url: string) => new Response(TREE, { status: 200 }));
		const l = await openManifestDir('/assets', { fetchImpl: fetchImpl as unknown as typeof fetch });
		expect(fetchImpl.mock.calls[0]?.[0]).toBe('/assets/files.txt');
		expect(l.get('audio/se/hit.wav')).toBeDefined();
	});

	// v1 resolved with an empty listing here, so a deploy that forgot to run the generator was
	// indistinguishable from a game with no assets.
	it('rejects when the manifest is missing', async () => {
		const fetchImpl = vi.fn(async () => new Response('Not Found', { status: 404 }));
		await expect(openManifestDir('/assets', { fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(
			/404/
		);
	});
});

describe('watching', () => {
	it('accepts listeners it can never call, so callers need not ask which backend they hold', () => {
		const stop = list().watch(() => expect.unreachable());
		expect(typeof stop).toBe('function');
		stop();
	});
});
