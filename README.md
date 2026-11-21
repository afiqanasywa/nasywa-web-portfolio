# Nasywa’s Cozy Cabin

**An interactive pixel-art portfolio** for **Afiqa Fadhya Nasywa**, full stack developer and data enthusiast.

Instead of a scrolling page, visitors walk a little pixel Nasywa around a plant-filled, pink-and-sage cabin at night. Each piece of furniture opens a part of her story, three sleeping cats can be patted, and a soft lofi soundtrack plays in the background. Recruiters who are short on time can open the **Recruiter fast-view** for a clean, printable CV.

## Highlights

- **Walkable 2.5D room** in a Stardew-style top-down view: click or tap to walk (A\* pathfinding around furniture), WASD / arrow keys, or an on-screen D-pad on phones.
- **Depth-sorted pixel art drawn entirely in code**: room, furniture, plants, Nasywa’s 4-direction walk cycle and the cats are all generated at runtime and scaled with crisp `image-rendering: pixelated`.
- **Live-synthesized audio** with the Web Audio API: a looping lofi track plus 8-bit sound effects and a soft cat purr, with separate music and SFX switches. No audio files.
- **Three interactive cats** (Kishi, Nining and Miu) that twitch, purr and say a short line when patted.
- **Recruiter fast-view and full CV**, generated from the same typed data as the room, with print / save-as-PDF.
- **Responsive and accessible**: works with mouse, keyboard and touch; every object is a labelled button; respects reduced-motion settings.

## Explore the cabin

| Station | What’s inside |
| --- | --- |
| 1. Nasywa | Bio, tech stack, tools and languages |
| 2. Coding desk | Work experience and featured projects |
| 3. Bookshelf & trophy | Education, certifications and awards |
| 4. Polaroid string | Community and creative highlights |
| 5. Coffee bar | Contact links |

Click the floor to walk, click furniture to visit it, or press `1`–`5` to jump straight to a station. `Enter` / `Space` interacts, `Esc` closes a dialog.

## Tech stack

Vite · React 18 · TypeScript · Tailwind CSS · Web Audio API · Canvas 2D

## Run it locally

```bash
npm install
npm run dev
```

## Contact

- Email: afiqafadya07@gmail.com
- GitHub: [@afiqanasywa](https://github.com/afiqanasywa)
