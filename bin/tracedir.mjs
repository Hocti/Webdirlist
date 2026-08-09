#!/usr/bin/env node
// Hand-written rather than built: a bin script is three lines and a shebang, and `tsc` emits
// neither. Points at dist/, so `pnpm build` has to have run — which it has for anyone who
// installed the package.
import { tracedir } from '../dist/tracedir.js';

tracedir(process.argv.slice(2)).catch((err) => {
	console.error(`[tracedir] ${err instanceof Error ? err.message : String(err)}`);
	process.exitCode = 1;
});
