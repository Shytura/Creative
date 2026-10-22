import { defineProject } from 'vitest/config';

export default defineProject({
  test: { name: 'storage-dexie', environment: 'node', setupFiles: ['fake-indexeddb/auto'] },
});
