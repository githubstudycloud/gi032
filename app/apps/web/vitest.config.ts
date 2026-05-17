import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// 纯 utils + schema 测试，不需要拉起 Nuxt runtime。
// 如果未来要测 SFC，再加 @vue/test-utils + happy-dom，并切 environment: 'happy-dom'。
export default defineConfig({
  test: {
    include: ['app/**/*.spec.ts', 'tests/**/*.spec.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
});
