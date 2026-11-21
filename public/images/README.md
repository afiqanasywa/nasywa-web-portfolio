# Images

- `nasywa-profile.jpg` (or `.jpeg` / `.png` / `.webp` / `.avif`) — Nasywa's profile photo, portrait, roughly 4:5 (e.g. 800×1000). The exact extension is detected automatically by `vite.config.ts`. When no such file exists, `profile-placeholder.png` (Nasywa's pixel portrait) is shown.
- Optional community photos: add files such as `bayanaka.jpg` here and reference them with the `photo` field of a highlight in `src/data/portfolioData.ts`.

While running `npm run dev`, the Bio dialog shows a dev-only "Preview another photo" tool so you can try a picture before committing it. It never appears in production builds, and the preview is never uploaded anywhere.
