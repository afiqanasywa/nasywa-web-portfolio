# Nasywa’s Cozy Cabin

An interactive pixel-art portfolio for **Afiqa Fadhya Nasywa**. Visitors walk Nasywa around a plant-filled pink-and-sage cabin at night, visit furniture to open each part of her story, and pat three sleeping cats, all to a soft lofi soundtrack. Recruiters can skip the room entirely with the **Recruiter fast-view** CV.

Built with Vite, React 18, TypeScript and Tailwind CSS. All pixel art is generated in code, and all music and sound effects are synthesized live with the Web Audio API — the only image files are the profile photo and the blossom cursor.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks, then builds to dist/
npm run preview   # serves the production build locally
```

Requires Node.js 18 or newer.

## How to explore

| Input | Action |
| --- | --- |
| Click / tap the floor | Walk there (routes around furniture) |
| Click / tap furniture | Walk to it and open its dialog |
| Click Nasywa | Open her bio |
| `W A S D` or arrow keys | Move |
| `Enter` or `Space` | Interact with the station you’re standing at |
| `1` – `5` | Walk to a station |
| D-pad + **A** button | Move and interact on touch screens |
| Click a lamp or the lamp button | Toggle the lights |
| Click / tap a cat | A purr, an ear and tail twitch, hearts and sparkles, and a short cozy line |
| **BGM** / **SFX** (header) | Switch the lofi music and the 8-bit sound effects on or off |
| `Esc` | Close a dialog |

## Stations

1. **Nasywa** — bio, profile photo, tech stack, tools, languages
2. **Coding desk** (upper left) — work experience and featured projects
3. **Bookshelf & trophy** (upper centre) — education, certifications and awards
4. **Polaroid string** (upper wall) — community and creative highlights
5. **Coffee bar** (lower right) — contact hub with copy buttons

Cats: **Kishi** on top of the cat tree, **Nining** in its cubby hole, and **Miu** asleep on the desk. Their bubble lines live in `portfolioData.cats` and rotate on each pat.

## Nasywa’s look

Nasywa is a 16×32 slim chibi with a 4-frame walk in four directions, arm swing and an idle blink. She wears a soft blush-pink pashmina with a loose wrap and relaxed drape (the long end falls over her left shoulder), sleek over-ear headphones, a cream chunky-knit cardigan over a dark botanical top, a brown belt with a small gold buckle, wide-leg dark denim and dark brown ankle boots. The RPG dialog uses a separate 32×32 portrait bust. Colours live in `NASYWA_PALETTE` in `src/pixel/sprites.ts`, so outfit tweaks are one-line edits.

## Music & sound

`src/audio/retroSynth.ts` holds both:

- **BGM:** a 16-bar lofi loop (Fmaj7 – Em7 – Dm7 – Cmaj7 at 74 BPM) with warm pads, a round bass, a lazy swung drum groove, a little chiptune melody, a music-box arpeggio and soft vinyl crackle. It is scheduled ahead of time with a look-ahead timer so it stays in time.
- **SFX:** click, footstep tick, dialog open/close, lamp, copy and dialog text blips.
- **Cat purr:** band-passed soft noise (around 150 Hz) pulsed by a 24 Hz amplitude LFO, shaped into a fuller exhale and a softer inhale, then a delicate sine chime. There are no square or sawtooth tones in it.

Browsers block sound until a visitor interacts, so the music starts on the first click, tap or key press (if BGM is on). Both switches are remembered between visits, and audio pauses while the tab is hidden.

## Custom cursor

`public/images/cursor-blossom.png` (default) and `cursor-blossom-pointer.png` (hovering anything clickable — furniture, cats, buttons) are 32×32 sage-green arrows with a brown branch and pink blossom buds. `src/styles/pixelTheme.css` contains matching SVG fallbacks. To tweak the design, edit the pixel maps in `scripts/make_cursors.py` and run `python3 scripts/make_cursors.py` (needs Pillow).

## Editing content

Everything lives in **`src/data/portfolioData.ts`**. The cabin dialogs and the Recruiter CV both read from it, so one edit updates both.

- **Fast-View vs Full CV:** each job's `highlights` are the full bullets (cabin dialog + Full CV); the optional `fastView` line is the one-sentence summary used in the Recruiter Fast-View. The top-of-page summary lives in `profile.atAGlance`.
- **Dates:** each experience and highlight has an optional `period` field (for example `'Feb 2025 – Jul 2025'`). Add it and it appears everywhere.
- **LinkedIn:** replace the `LINKEDIN` constant near the top with your exact profile URL.
- **Project repos:** each project has its own `repoUrl`; point them at specific repositories when they’re public.
- **Highlights section:** rename `highlights.title`, rewrite `intro`, or add items. Each item can take an optional `photo`.
- **Station speech lines:** edit `stations[].speech`.

### Profile photo

Put a portrait at `public/images/nasywa-profile.jpg` (or `.jpeg`, `.png`, `.webp`, `.avif`; about 4:5). `vite.config.ts` scans `public/images/` when the dev server or a build starts and wires up the exact file name, so the path is correct locally, on Vercel and under a GitHub Pages sub-path. Adding or renaming the file while `npm run dev` is running restarts the server automatically. If no photo is found, Nasywa's pixel portrait (`profile-placeholder.png`) is shown. During `npm run dev` only, the Bio dialog has a **Preview another photo** tool for trying pictures locally; it is gated behind `import.meta.env.DEV`, so production builds never include it.

## Project structure

```
src/
  App.tsx                     App shell: header, room, dock, modals, toast
  main.tsx, index.css         Entry point, global styles and animations
  styles/pixelTheme.css       Pixel styling, gold RPG frames, buttons, cat bubble, cursor rules
  data/portfolioData.ts       All typed portfolio content (incl. cat lines)
  audio/retroSynth.ts         Lofi BGM loop + 8-bit SFX, with BGM/SFX switches
  game/layout.ts              Room geometry, furniture, colliders, stations
  game/pathfinding.ts         Grid A* with line-of-sight smoothing
  pixel/sprites.ts            Hand-authored pixel maps (Nasywa's walk/blink frames + 32x32 portrait, cats, motes)
  pixel/painters.ts           Canvas painters for the room, furniture and plants (auto-outlined)
  components/
    CabinViewport.tsx         The interactive room (movement, Y-sorting, lighting, D-pad)
    RpgDialogModal.tsx        Gold-bordered RPG dialog with typewriter speech
    StationContent.tsx        Content panels for each station
    RecruiterCvModal.tsx      Fast-view / full CV with print-to-PDF
    BottomDock.tsx            Station navigation, lamp and sound toggles
    Header.tsx                Title, BGM/SFX switches, controls help, CV button
public/images/                Profile photo, placeholder and blossom cursors
scripts/make_cursors.py       Regenerates the cursor PNGs
```

### How the room works

The room is drawn at 320×224 “room pixels” and scaled up with `image-rendering: pixelated`. Furniture and characters are positioned in room pixels and their `z-index` equals the y-coordinate of their bottom edge, which gives correct depth sorting as Nasywa walks in front of or behind things. Click-to-walk uses A* over a 4-pixel grid built from the furniture colliders, then smooths the path so she walks in straight lines where she can.

Every furniture painter runs an automatic outline pass, so new props get the same clean dark pixel edge, then adds a soft ground shadow. On tall, narrow phone screens the room zooms in to fill the height and the camera follows Nasywa sideways.

## Deployment

### Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Vercel detects Vite automatically (`vercel.json` is included). Build command `npm run build`, output `dist`.
4. Deploy. No environment variables are needed.

### GitHub Pages

The included workflow `.github/workflows/deploy.yml` builds and publishes on every push to `main`.

1. Push the repository to GitHub.
2. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).
4. The site appears at `https://<username>.github.io/<repository-name>/`.

The workflow sets `BASE_PATH` to `/<repository-name>/` so assets resolve correctly. If you deploy to a `<username>.github.io` repository, change it to `/` in the workflow.

## Accessibility

- Every interactive object in the room is a real button with a label, reachable by Tab.
- Dialogs trap focus, close with `Esc` and return focus afterwards.
- Animations are reduced when the system “reduce motion” setting is on.
- Sound starts only after a user action and can be muted; the choice is remembered.
