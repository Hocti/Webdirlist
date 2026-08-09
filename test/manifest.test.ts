import { describe, expect, it } from 'vitest';
import { formatManifest, makeEntry, parseManifest } from '../src/manifest';

const MANIFEST = ['audio/bgm-menu.wav	2048	1702310819', 'audio/se-hit.wav	512	1702310820'].join('\n');

describe('parseManifest', () => {
	it('reads path, size and mtime, and derives the rest', () => {
		const [first] = parseManifest(MANIFEST);
		expect(first).toEqual({
			path: 'audio/bgm-menu.wav',
			name: 'bgm-menu.wav',
			ext: 'wav',
			dir: 'audio',
			size: 2048,
			mtime: 1702310819,
		});
	});

	it('accepts windows separators, CRLF, blank lines and comments', () => {
		const entries = parseManifest('# generated\r\n\r\naudio\\se-hit.wav\t512\t1\r\n');
		expect(entries.map((e) => e.path)).toEqual(['audio/se-hit.wav']);
	});

	it('skips malformed lines instead of producing half-filled entries', () => {
		const entries = parseManifest(['ok.wav\t1\t2', 'no-tabs-here', 'bad.wav\tNaN\t2', 'x\t1\t2\t3'].join('\n'));
		expect(entries.map((e) => e.path)).toEqual(['ok.wav']);
	});
});

describe('formatManifest', () => {
	it('round-trips and sorts, so a regenerated manifest is a stable diff', () => {
		const entries = [makeEntry('b.wav', 2, 20), makeEntry('a.wav', 1, 10)];
		expect(formatManifest(entries)).toBe('a.wav\t1\t10\nb.wav\t2\t20');
		expect(parseManifest(formatManifest(entries)).map((e) => e.path)).toEqual(['a.wav', 'b.wav']);
	});
});
