import { defineConfig } from 'vite';

export default defineConfig({
  // relative paths: the build must run from any folder of a site or a storefront iframe
  base: './',
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2500 },
});
