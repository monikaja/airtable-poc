import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // Never expose environment variables to the browser: secrets live only in /api.
  envPrefix: '__NO_CLIENT_ENV__',
});
