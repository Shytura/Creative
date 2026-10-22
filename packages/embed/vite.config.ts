import { defineConfig } from 'vite';

/** Builds a single self-contained ES module: dist/mnemo-embed.js */
export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'mnemo-embed.js' },
    target: 'es2022',
  },
});
