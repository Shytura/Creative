import { readFileSync } from 'node:fs';
import { defineProject } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineProject({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: { name: 'web', environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
