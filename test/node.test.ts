import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openNodeDir, writeManifest } from '../src/node';
import { openManifestDir } from '../src/ManifestDirList';
import type { DirChange } from '../src/types';

let root = '';

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), 'webdirlist-'));
	await mkdir(join(root, 'audio/se'), { recursive: true });
	await mkdir(join(root, 'node_modules/junk'), { recursive: true });
	await writeFile(join(root, 'audio/bgm.wav'), 'x'.repeat(100));
	await writeFile(join(root, 'audio/se/hit.wav'), 'x'.repeat(10));
	await writeFile(join(root, 'node_modules/junk/index.js'), 'nope');
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

const settle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('NodeDirList', () => {
	it('walks the real filesystem and skips the folders nobody means to ship', async () => {
		const list = await openNodeDir(root);
		expect(list.files().map((e) => e.path)).toEqual(['audio/bgm.wav', 'audio/se/hit.wav']);
		expect(list.folders()).toEqual(['audio']);
		expect(list.totalSize()).toBe(110);
	});

	// The whole reason the node backend exists: no manifest sits between the answer and the disk.
	it('sees a file that changed after it was opened, on refresh', async () => {
		const list = await openNodeDir(root);
		expect(list.get('audio/bgm.wav')?.size).toBe(100);

		await writeFile(join(root, 'audio/bgm.wav'), 'x'.repeat(250));
		await writeFile(join(root, 'audio/se/new.wav'), 'x');
		expect(list.get('audio/bgm.wav')?.size).toBe(100); // still the old snapshot

		await list.refresh();
		expect(list.get('audio/bgm.wav')?.size).toBe(250);
		expect(list.get('audio/se/new.wav')).toBeDefined();
	});

	it('reports a changed file to watchers without moving the snapshot under them', async () => {
		const list = await openNodeDir(root, { watchDebounceMs: 20 });
		const seen: DirChange[] = [];
		const stop = list.watch((c) => seen.push(c));

		await settle(50);
		await writeFile(join(root, 'audio/bgm.wav'), 'x'.repeat(250));
		await settle(400);
		stop();

		expect(seen.map((c) => [c.type, c.path])).toContainEqual(['changed', 'audio/bgm.wav']);
		expect(seen.find((c) => c.path === 'audio/bgm.wav')?.entry?.size).toBe(250);
		expect(list.get('audio/bgm.wav')?.size).toBe(100); // queries still answer from the last refresh
	});

	it('gives the absolute path of a listed file', async () => {
		const list = await openNodeDir(root);
		expect(list.absolute('audio/bgm.wav')).toBe(join(root, 'audio', 'bgm.wav'));
	});
});

describe('writeManifest', () => {
	it('writes a files.txt the web backend reads back identically', async () => {
		await writeManifest(root);
		const text = await readFile(join(root, 'files.txt'), 'utf8');

		const web = await openManifestDir('/assets', {
			fetchImpl: (async () => new Response(text, { status: 200 })) as unknown as typeof fetch,
		});
		const node = await openNodeDir(root);

		expect(web.files().map((e) => e.path)).toEqual(node.files().map((e) => e.path));
		expect(web.get('audio/bgm.wav')?.size).toBe(100);
		// The manifest never lists itself.
		expect(web.get('files.txt')).toBeUndefined();
	});

	it('writes to a separate output directory, creating it if need be', async () => {
		const target = join(root, 'out', 'nested', 'files.txt');
		await writeManifest(root, target);
		expect(await readFile(target, 'utf8')).toContain('audio/bgm.wav');
	});
});
