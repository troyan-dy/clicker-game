import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

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

/** The release build ships only what the game shows: the look-dev picture stays with the tools. */
function dropToolAssets(on: boolean): Plugin {
  return {
    name: 'drop-tool-assets',
    apply: 'build',
    closeBundle() {
      if (on) fs.rmSync(path.resolve('dist/assets/img/scene_blueprint.webp'), { force: true });
    },
  };
}

const version = (JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8')) as { version: string }).version;

// `vite build` is the release; `vite build --mode gym` (npm run build:gym) keeps the gyms for scripted captures
export default defineConfig(({ mode }) => ({
  // relative paths: the build must run from any folder of a site or a storefront iframe
  base: './',
  server: { port: 5173 },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // New modules enter the check automatically. The scene and view adapters drive Phaser, DOM and CSS.
      exclude: [
        '**/*.d.ts', 'src/main.ts', 'src/game/GameScene.ts', 'src/debug/**', 'src/gyms/**',
        'src/data/palette.ts', // colours for the HelloScene graphics demo
        'src/ui/{hud,scale,bench/bench,blueprint/blueprint,card/card,credits/credits,intern/intern,terminal/terminal}.ts',
        'src/view/{benchView,blueprintView,globeView,HelloScene,hubView,nodeTextures,squares,towerView,walkers}.ts',
      ],
      reporter: ['text', 'json', 'json-summary'],
      thresholds: { perFile: true, lines: 100, functions: 100, statements: 100, branches: 100 },
    },
  },
  build: { chunkSizeWarningLimit: 2500 },
  define: {
    // gyms, quick starts, cheat keys, scripted hooks: everywhere but in the release
    __TOOLS__: JSON.stringify(mode !== 'production'),
    __VERSION__: JSON.stringify(version),
  },
  plugins: [tuningDump(), dropToolAssets(mode === 'production')],
}));
