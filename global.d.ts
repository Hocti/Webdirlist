declare type uint = number;
declare type int = number;

declare module '*.css';

// vite's `?raw` suffix — e.g. `import txt from 'gamepad_standardizer/local_override.txt?raw'`.
// Belongs here rather than in one package's own global.d.ts: `pnpm sync-configs` copies this
// file over every package's copy, so a local addition is deleted on the next run.
declare module '*.txt?raw' {
	const content: string;
	export default content;
}
