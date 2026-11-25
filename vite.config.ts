import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'offline-game',
      apply: 'build',
      closeBundle(error?: Error) {
        if (error) return;
        const dist = path.resolve(import.meta.dirname, 'dist');
        const files = fs.readdirSync(path.join(dist, 'assets')).sort().map(file => '/assets/' + file);
        const index = fs.readFileSync(path.join(dist, 'index.html'));
        const version = createHash('sha256').update(index).update(JSON.stringify(files)).digest('hex').slice(0, 16);
        const worker = path.join(dist, 'sw.js');
        const source = fs.readFileSync(worker, 'utf8');
        fs.writeFileSync(worker, source.replace('__BUILD_VERSION__', version).replace('/* BUILD_ASSETS */', files.map(file => ', ' + JSON.stringify(file)).join('')));
      },
    },
  ],
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
  server: {
    // Disable live reload in AI Studio when requested.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
