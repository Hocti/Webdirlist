import { describe, expect, it } from 'vitest';
import { ancestorDirs, baseName, dirName, extName, isUnder, joinPath, normalisePath, relativeTo } from '../src/paths';

describe('normalisePath', () => {
	it('spells every path the one way a listing spells it', () => {
		expect(normalisePath('audio\\se\\hit.wav')).toBe('audio/se/hit.wav');
		expect(normalisePath('/audio//se/')).toBe('audio/se');
		expect(normalisePath('./audio/../sfx/hit.wav')).toBe('sfx/hit.wav');
		expect(normalisePath('')).toBe('');
	});

	it('cannot climb above the root', () => {
		expect(normalisePath('../../etc/passwd')).toBe('etc/passwd');
	});
});

describe('name and extension', () => {
	it('lower-cases the extension and drops the dot', () => {
		expect(extName('audio/BGM.WAV')).toBe('wav');
		expect(baseName('audio/BGM.WAV')).toBe('BGM.WAV');
		expect(dirName('audio/BGM.WAV')).toBe('audio');
		expect(dirName('BGM.WAV')).toBe('');
	});

	it('treats a leading dot as part of the name, not an extension', () => {
		expect(extName('.DS_Store')).toBe('');
		expect(extName('README')).toBe('');
	});
});

describe('tree arithmetic', () => {
	it('lists every ancestor, root first', () => {
		expect(ancestorDirs('a/b/c')).toEqual(['a', 'a/b', 'a/b/c']);
		expect(ancestorDirs('')).toEqual([]);
	});

	it('containment is by segment, not by prefix', () => {
		expect(isUnder('audio/hit.wav', 'audio')).toBe(true);
		expect(isUnder('audiobook/hit.wav', 'audio')).toBe(false);
		expect(isUnder('anything', '')).toBe(true);
	});

	it('re-roots a path onto a directory', () => {
		expect(relativeTo('a/b/c.wav', 'a')).toBe('b/c.wav');
		expect(relativeTo('a/b/c.wav', '')).toBe('a/b/c.wav');
		expect(joinPath('a', '/b/', 'c.wav')).toBe('a/b/c.wav');
	});
});
