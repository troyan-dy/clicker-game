import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Dev only: the gym's P key posts the tuning panel values here; they land next to the captures. */
function tuningDump(): Plugin {
  return {
    name: 'tuning-dump',
    configureServer(server) {
      server.middlewares.use('/__tuning', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const id = (new URL(req.url ?? '', 'http://x').searchParams.get('id') ?? 'gym').replace(/[^\w-]/g, '');
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          const dir = path.resolve('.studioigor/captures/tuning');
          fs.mkdirSync(dir, { recursive: true });
          const file = path.join(dir, `${id}-${Math.floor(Date.now() / 1000)}.json`);
          fs.writeFileSync(file, body);
          res.end(file);
        });
      });
    },
  };
}

export default defineConfig({
  // relative paths: the build must run from any folder of a site or a storefront iframe
  base: './',
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2500 },
  plugins: [tuningDump()],
});
