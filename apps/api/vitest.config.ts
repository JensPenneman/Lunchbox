import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@lunchbox/contracts': path.resolve(__dirname, '../../libs/contracts/src/index.ts'),
    },
  },
});
