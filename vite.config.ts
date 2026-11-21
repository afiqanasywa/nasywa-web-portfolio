import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const IMAGES_DIR = resolve(__dirname, 'public/images');
const PHOTO_RE = /^nasywa-profile\.(jpe?g|png|webp|avif)$/i;

/** Finds public/images/nasywa-profile.<ext> and returns "images/nasywa-profile.<ext>" ("" if missing). */
function findProfilePhoto(): string {
  try {
    const file = readdirSync(IMAGES_DIR).find((f) => PHOTO_RE.test(f));
    return file ? `images/${file}` : '';
  } catch {
    return '';
  }
}

/** Restarts the dev server when the profile photo is added, renamed or removed, so the path stays exact. */
function profilePhotoWatcher(): Plugin {
  return {
    name: 'nasywa-profile-photo',
    configureServer(server) {
      const onChange = (file: string) => {
        if (PHOTO_RE.test(file.split(/[\\/]/).pop() ?? '')) void server.restart();
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}

// BASE_PATH lets the same build work on Vercel ("/") and GitHub Pages ("/<repo-name>/").
// The GitHub Actions workflow sets it automatically.
export default defineConfig({
  plugins: [react(), profilePhotoWatcher()],
  base: process.env.BASE_PATH ?? '/',
  define: {
    __NASYWA_PHOTO__: JSON.stringify(findProfilePhoto()),
  },
});
