import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  test: {
    // Component tests opt into a DOM with `// @vitest-environment happy-dom`.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
