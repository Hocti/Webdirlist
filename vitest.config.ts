import { defineConfig } from 'vitest/config';

// node, not happy-dom: half of what is tested here *is* the filesystem backend.
export default defineConfig({ test: { environment: 'node', include: ['test/**/*.test.ts'] } });
