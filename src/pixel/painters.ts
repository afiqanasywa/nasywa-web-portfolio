/**
 * Procedural pixel-art painters. Everything is drawn 1:1 in room pixels onto
 * small canvases, given a clean dark outline, converted to data URLs once, and
 * scaled up with `image-rendering: pixelated`.
 */
import { BULB_XS, FURNITURE, ROOM_H, ROOM_W, WALL_H, wireY } from '../game/layout';
import type { SpriteDef } from './sprites';

type Ctx = CanvasRenderingContext2D;

interface PaintOpts {
  /** Colour of the automatic 1px outline drawn around every opaque shape. */
  outline?: string;
  /** Drawn after the outline pass (soft shadows, glows). */
  after?: (ctx: Ctx) => void;
}

const cache = new Map<string, string>();

const OUTLINE = '#2a1712';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Adds a 1px outline to every fully transparent pixel touching an opaque one. */
function outlinePass(ctx: Ctx, w: number, h: number, color: string) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, g, b] = hexToRgb(color);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] === 255;
  const marks: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] !== 0) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) marks.push((y * w + x) * 4);
    }
  }
  marks.forEach((i) => {
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  });
  ctx.putImageData(img, 0, 0);
}

function paint(key: string, w: number, h: number, fn: (ctx: Ctx) => void, opts: PaintOpts = {}): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  fn(ctx);
  if (opts.outline) outlinePass(ctx, w, h, opts.outline);
  opts.after?.(ctx);
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

const R = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

/** Pixel-exact filled ellipse (no anti-aliasing). */
function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string) {
  ctx.fillStyle = c;
  for (let y = -ry; y <= ry; y++) {
    const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(Math.round(cx - span), Math.round(cy + y), span * 2 + 1, 1);
  }
}

/** Deterministic random so the room looks identical on every visit. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- palette ---------------- */

const GREEN = { dark: '#3f6a43', mid: '#5f8f57', light: '#8dbb74', sage: '#8fae8b', pale: '#b9d6a3' };
const PINK = { deep: '#c45f86', mid: '#e7a0b4', light: '#f6c1d0', pale: '#ffe1e8' };
const CREAM = { base: '#efe0c8', light: '#fbf1e1', shade: '#d8c3a5' };
const WOOD = { dark: '#4a2d1f', mid: '#7a4a2f', base: '#a8714a', light: '#c48a5c', pale: '#ddb07e' };

/** A 3x3 pixel leaf with highlight and shadow. */
function leaf(ctx: Ctx, x: number, y: number, flip = false, tone: 'mid' | 'light' | 'sage' = 'mid') {
  const main = tone === 'light' ? GREEN.light : tone === 'sage' ? GREEN.sage : GREEN.mid;
  const hi = tone === 'light' ? GREEN.pale : GREEN.light;
  R(ctx, x + 1, y, 1, 1, hi);
  R(ctx, x, y + 1, 3, 1, main);
  R(ctx, flip ? x : x + 2, y + 2, 1, 1, GREEN.dark);
  R(ctx, x + 1, y + 2, 1, 1, main);
}

/** A trailing vine hanging down from (x, y). */
function vine(ctx: Ctx, x: number, y: number, len: number, seed: number) {
  const rand = rng(seed);
  let cx = x;
  for (let i = 0; i < len; i++) {
    if (i % 5 === 4) cx += rand() > 0.5 ? 1 : -1;
    R(ctx, cx, y + i, 1, 1, GREEN.dark);
    if (i % 3 === 1) {
      const left = (i / 3) % 2 < 1;
      leaf(ctx, left ? cx - 3 : cx + 1, y + i - 1, left, rand() > 0.6 ? 'light' : 'mid');
    }
  }
  leaf(ctx, cx - 1, y + len - 1, false, 'light');
}

/** Little pot with a rim highlight. */
function pot(ctx: Ctx, x: number, y: number, w: number, h: number, base: string, light: string, dark: string) {
  R(ctx, x, y, w, 2, light);
  R(ctx, x + 1, y + 2, w - 2, h - 2, base);
  R(ctx, x + 1, y + 2, 1, h - 2, light);
  R(ctx, x + w - 2, y + 2, 1, h - 2, dark);
  R(ctx, x + 1, y + h - 1, w - 2, 1, dark);
}

const groundShadow = (ctx: Ctx, cx: number, y: number, rx: number) => {
  ellipse(ctx, cx, y, rx, 1, 'rgba(25,12,8,0.32)');
  ellipse(ctx, cx, y, Math.max(1, rx - 3), 1, 'rgba(25,12,8,0.22)');
};

export function spriteUrl(key: string, def: SpriteDef): string {
  return paint(`sprite:${key}`, def.w, def.h, (ctx) => {
    def.rows.forEach((row, y) => {
      for (let x = 0; x < def.w; x++) {
        const ch = row[x];
        if (!ch || ch === '.') continue;
        const color = def.palette[ch];
        if (color) R(ctx, x, y, 1, 1, color);
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Room shell                                                          */
/* ------------------------------------------------------------------ */

function paintWindow(ctx: Ctx, x: number, y: number, w: number, h: number, moon: boolean, seed: number) {
  const rand = rng(seed);
  R(ctx, x - 2, y - 2, w + 4, h + 5, '#2e1c14');
  R(ctx, x - 1, y - 1, w + 2, h + 2, CREAM.shade);
  const bands = ['#151433', '#1c1b3d', '#231f4a', '#2c2556', '#3a2a5c'];
  for (let i = 0; i < h; i++) R(ctx, x, y + i, w, 1, bands[Math.min(bands.length - 1, Math.floor((i / h) * bands.length))]);
  for (let i = 0; i < 10; i++) {
    R(ctx, x + 1 + Math.floor(rand() * (w - 2)), y + 1 + Math.floor(rand() * (h - 4)), 1, 1, rand() > 0.6 ? '#fff6d0' : '#c9c3ff');
  }
  if (moon) {
    const mx = x + w - 7;
    const my = y + 7;
    ellipse(ctx, mx, my, 4, 4, '#fff1c1');
    ellipse(ctx, mx - 2, my - 1, 3, 3, '#1c1b3d');
    R(ctx, mx + 3, my - 1, 1, 2, '#ffe08a');
  }
  // Distant tree silhouettes
  for (let i = 0; i < w; i++) {
    const th = 2 + Math.round(Math.abs(Math.sin(i * 0.9 + seed)) * 3);
    R(ctx, x + i, y + h - th, 1, th, '#1a2a2a');
  }
  R(ctx, x + Math.floor(w / 2), y, 1, h, CREAM.shade);
  R(ctx, x, y + Math.floor(h / 2), w, 1, CREAM.shade);
  // Sill with a tiny succulent
  R(ctx, x - 3, y + h + 1, w + 6, 3, WOOD.base);
  R(ctx, x - 3, y + h + 1, w + 6, 1, WOOD.pale);
  pot(ctx, x + 2, y + h - 3, 5, 4, PINK.mid, PINK.light, PINK.deep);
  leaf(ctx, x + 2, y + h - 6, false, 'light');
  leaf(ctx, x + 4, y + h - 7, true, 'mid');
  // Blush curtains + rod
  for (const cx of [x - 4, x + w + 1]) {
    R(ctx, cx, y - 2, 3, h + 3, PINK.mid);
    R(ctx, cx + 1, y - 2, 1, h + 3, PINK.light);
    R(ctx, cx, y + h - 8, 3, 1, PINK.deep);
    R(ctx, cx, y + h + 1, 3, 1, PINK.deep);
  }
  R(ctx, x - 5, y - 3, w + 10, 2, '#c9956b');
  R(ctx, x - 6, y - 3, 1, 2, '#f0c9a0');
  R(ctx, x + w + 5, y - 3, 1, 2, '#f0c9a0');
}

function paintWallShelf(ctx: Ctx) {
  const x = 22;
  const y = 28;
  const w = 70;
  // brackets
  R(ctx, x + 6, y + 2, 2, 4, WOOD.dark);
  R(ctx, x + w - 8, y + 2, 2, 4, WOOD.dark);
  // little books
  const books = [PINK.mid, GREEN.sage, CREAM.light, '#c9956b', PINK.deep];
  books.forEach((c, i) => R(ctx, x + 30 + i * 2, y - 7 + (i % 2), 2, 7 - (i % 2), c));
  // candle jar
  R(ctx, x + 44, y - 5, 4, 5, CREAM.light);
  R(ctx, x + 45, y - 7, 1, 2, '#ffc874');
  // pots with plants
  pot(ctx, x + 3, y - 6, 7, 6, CREAM.base, CREAM.light, CREAM.shade);
  pot(ctx, x + 18, y - 5, 6, 5, PINK.mid, PINK.light, PINK.deep);
  pot(ctx, x + 56, y - 6, 8, 6, GREEN.sage, GREEN.pale, GREEN.dark);
  leaf(ctx, x + 3, y - 9, false, 'mid');
  leaf(ctx, x + 6, y - 10, true, 'light');
  leaf(ctx, x + 17, y - 8, false, 'light');
  leaf(ctx, x + 20, y - 9, true, 'mid');
  for (let i = 0; i < 4; i++) R(ctx, x + 57 + i * 2, y - 11 + (i % 2), 1, 5, GREEN.dark); // snake plant
  for (let i = 0; i < 4; i++) R(ctx, x + 57 + i * 2, y - 10 + (i % 2), 1, 3, GREEN.mid);
  // shelf plank
  R(ctx, x, y, w, 3, WOOD.base);
  R(ctx, x, y, w, 1, WOOD.pale);
  R(ctx, x, y + 2, w, 1, WOOD.mid);
  // trailing pothos
  vine(ctx, x + 5, y + 3, 12, 3);
  vine(ctx, x + 9, y + 3, 7, 5);
  vine(ctx, x + 21, y + 3, 9, 8);
  vine(ctx, x + 60, y + 3, 11, 13);
}

function paintMacrame(ctx: Ctx, cx: number, top: number, len: number, seed: number) {
  // ropes
  for (let i = 0; i < len; i++) {
    R(ctx, cx - Math.floor(i / 6), top + i, 1, 1, CREAM.shade);
    R(ctx, cx + Math.floor(i / 6), top + i, 1, 1, CREAM.shade);
  }
  R(ctx, cx - 1, top - 1, 3, 2, '#c9956b');
  const py = top + len;
  pot(ctx, cx - 4, py, 9, 6, CREAM.base, CREAM.light, CREAM.shade);
  R(ctx, cx - 3, py + 3, 7, 1, PINK.mid);
  leaf(ctx, cx - 5, py - 3, false, 'light');
  leaf(ctx, cx + 2, py - 3, true, 'mid');
  leaf(ctx, cx - 1, py - 4, false, 'mid');
  vine(ctx, cx - 4, py + 5, 14, seed);
  vine(ctx, cx + 3, py + 5, 18, seed + 1);
  vine(ctx, cx, py + 6, 10, seed + 2);
  R(ctx, cx, py + 6, 1, 3, CREAM.shade); // tassel
}

function paintIvyGarland(ctx: Ctx) {
  const rand = rng(99);
  for (let x = 8; x < ROOM_W - 8; x++) {
    const y = Math.round(wireY(x)) + 1;
    if (x % 4 === 0) leaf(ctx, x - 1, y - 1 + (x % 8 === 0 ? 1 : -1), x % 8 === 0, rand() > 0.5 ? 'light' : 'mid');
  }
  // Dangling strands at intervals
  const strands = [30, 52, 96, 140, 172, 202, 236, 258, 300];
  strands.forEach((sx, i) => vine(ctx, sx, Math.round(wireY(sx)) + 2, 6 + ((i * 7) % 12), 40 + i));
}

export function roomUrl(): string {
  return paint('room', ROOM_W, ROOM_H, (ctx) => {
    const rand = rng(7);

    // Back wall: warm horizontal logs
    for (let y = 0; y < 52; y += 10) {
      R(ctx, 0, y, ROOM_W, 10, '#6b4430');
      R(ctx, 0, y, ROOM_W, 1, '#8a5a3b');
      R(ctx, 0, y + 1, ROOM_W, 2, '#7a4e35');
      R(ctx, 0, y + 8, ROOM_W, 1, '#553424');
      R(ctx, 0, y + 9, ROOM_W, 1, '#3d2619');
      for (let k = 0; k < 6; k++) {
        const kx = Math.floor(rand() * ROOM_W);
        R(ctx, kx, y + 4, 3, 2, '#5a3826');
        R(ctx, kx + 1, y + 4, 1, 1, '#4a2f20');
      }
      for (let g = 0; g < 14; g++) R(ctx, Math.floor(rand() * ROOM_W), y + 3 + Math.floor(rand() * 4), 4 + Math.floor(rand() * 8), 1, '#644029');
    }
    // Chair rail + cream beadboard wainscot
    R(ctx, 0, 50, ROOM_W, 3, WOOD.light);
    R(ctx, 0, 50, ROOM_W, 1, WOOD.pale);
    R(ctx, 0, 52, ROOM_W, 1, WOOD.mid);
    R(ctx, 0, 53, ROOM_W, WALL_H - 57, CREAM.base);
    for (let x = 2; x < ROOM_W; x += 5) {
      R(ctx, x, 53, 1, WALL_H - 57, CREAM.shade);
      R(ctx, x + 1, 53, 1, WALL_H - 57, CREAM.light);
    }
    R(ctx, 0, 53, ROOM_W, 1, '#c9b08f');
    // Baseboard
    R(ctx, 0, WALL_H - 4, ROOM_W, 4, WOOD.mid);
    R(ctx, 0, WALL_H - 4, ROOM_W, 1, WOOD.base);
    R(ctx, 0, WALL_H - 1, ROOM_W, 1, '#3d2619');

    // Floor: horizontal planks with staggered seams
    for (let row = 0, y = WALL_H; y < ROOM_H; row++, y += 8) {
      R(ctx, 0, y, ROOM_W, 8, row % 2 ? '#a06a45' : '#ab744c');
      R(ctx, 0, y, ROOM_W, 1, '#6e4630');
      R(ctx, 0, y + 1, ROOM_W, 1, '#bd8659');
      let sx = (row * 23) % 48;
      while (sx < ROOM_W) {
        R(ctx, sx, y + 1, 1, 7, '#6e4630');
        R(ctx, sx + 2, y + 4, 1, 1, '#5a3826');
        sx += 44 + Math.floor(rand() * 26);
      }
      for (let g = 0; g < 10; g++) R(ctx, Math.floor(rand() * ROOM_W), y + 3 + Math.floor(rand() * 4), 6 + Math.floor(rand() * 10), 1, row % 2 ? '#966140' : '#a06a45');
    }
    R(ctx, 0, WALL_H, ROOM_W, 2, 'rgba(30,15,10,0.4)');
    R(ctx, 0, WALL_H + 2, ROOM_W, 2, 'rgba(30,15,10,0.18)');

    // Windows
    const wl = FURNITURE.windowLeft;
    const wr = FURNITURE.windowRight;
    paintWindow(ctx, wl.x, wl.y, wl.w, wl.h, true, 11);
    paintWindow(ctx, wr.x, wr.y, wr.w, wr.h, false, 23);

    // Wall decor
    paintWallShelf(ctx);
    paintMacrame(ctx, 10, 6, 16, 61);
    paintMacrame(ctx, 268, 4, 14, 71);

    // Sage runner by the coffee bar
    R(ctx, 214, 196, 22, 14, '#7f9f7b');
    R(ctx, 215, 197, 20, 12, GREEN.sage);
    for (let i = 0; i < 5; i++) R(ctx, 217 + i * 4, 199, 2, 8, '#a9c4a3');
    for (let i = 0; i < 6; i++) R(ctx, 215 + i * 4, 210, 1, 1, CREAM.base);

    // Round blush rug
    const cx = 150;
    const cy = 156;
    ellipse(ctx, cx, cy + 2, 50, 25, 'rgba(40,20,15,0.35)');
    ellipse(ctx, cx, cy, 50, 25, PINK.deep);
    ellipse(ctx, cx, cy, 48, 23, '#f2a5b8');
    ellipse(ctx, cx, cy, 40, 19, PINK.pale);
    ellipse(ctx, cx, cy, 38, 18, '#f7b9c8');
    ellipse(ctx, cx, cy, 26, 12, '#e88aa5');
    ellipse(ctx, cx, cy, 24, 11, '#f7b9c8');
    ellipse(ctx, cx, cy, 7, 3, PINK.pale);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      leaf(ctx, Math.round(cx + Math.cos(a) * 31) - 1, Math.round(cy + Math.sin(a) * 14) - 1, i % 2 === 0, 'sage');
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      R(ctx, Math.round(cx + Math.cos(a) * 44), Math.round(cy + Math.sin(a) * 21), 1, 1, '#fff0f4');
    }

    // Room frame (side and bottom walls)
    R(ctx, 0, 0, 7, ROOM_H, '#24150f');
    R(ctx, 6, 0, 1, ROOM_H, '#4a2d1f');
    R(ctx, ROOM_W - 7, 0, 7, ROOM_H, '#24150f');
    R(ctx, ROOM_W - 7, 0, 1, ROOM_H, '#4a2d1f');
    R(ctx, 0, ROOM_H - 7, ROOM_W, 7, '#24150f');
    R(ctx, 6, ROOM_H - 7, ROOM_W - 12, 1, '#4a2d1f');

    // String-light wire + ivy garland
    for (let x = 8; x < ROOM_W - 8; x++) R(ctx, x, Math.round(wireY(x)), 1, 1, '#2a1a12');
    for (const bx of BULB_XS) R(ctx, Math.round(bx), Math.round(wireY(bx)) + 1, 1, 2, '#2a1a12');
    paintIvyGarland(ctx);
  });
}

/* ------------------------------------------------------------------ */
/* Furniture                                                          */
/* ------------------------------------------------------------------ */

export function deskUrl(lampOn: boolean): string {
  const { w, h } = FURNITURE.desk;
  return paint(
    `desk:${lampOn}`,
    w,
    h,
    (ctx) => {
      // Monitors (one blush, one sage bezel)
      for (const [mx, kind, bezel, bezelLight] of [
        [17, 'code', '#e9b6c4', '#fbd9e2'],
        [46, 'chart', '#a9c4a3', '#cfe0c8'],
      ] as const) {
        R(ctx, mx, 2, 27, 20, bezel);
        R(ctx, mx, 2, 27, 1, bezelLight);
        R(ctx, mx + 2, 4, 23, 15, '#172333');
        R(ctx, mx + 2, 4, 23, 1, '#22344a');
        if (kind === 'code') {
          const lines: [number, number, string][] = [
            [2, 10, '#f4a7b9'],
            [4, 14, '#ffc874'],
            [4, 8, '#9fd8b0'],
            [6, 12, '#c9b6ff'],
            [4, 6, '#f4a7b9'],
            [2, 9, '#ffc874'],
          ];
          lines.forEach(([ix, len, c], i) => R(ctx, mx + 2 + ix, 6 + i * 2, len, 1, c));
        } else {
          [4, 7, 5, 9, 11, 8].forEach((b, i) => R(ctx, mx + 5 + i * 3, 17 - b, 2, b, i % 2 ? '#ffc874' : '#f4a7b9'));
          R(ctx, mx + 4, 17, 20, 1, '#5d6b80');
          R(ctx, mx + 15, 6, 7, 1, '#9fd8b0');
        }
        R(ctx, mx + 12, 22, 3, 4, '#d8c3a5');
        R(ctx, mx + 8, 25, 11, 2, CREAM.shade);
      }
      // Pothos trailing off the right monitor
      R(ctx, 66, 0, 5, 3, PINK.mid);
      leaf(ctx, 64, -1, false, 'light');
      leaf(ctx, 69, -1, true, 'mid');
      vine(ctx, 72, 2, 14, 21);

      // Desk lamp
      R(ctx, 3, 29, 9, 2, WOOD.dark);
      R(ctx, 6, 16, 2, 13, '#c9956b');
      R(ctx, 7, 12, 2, 5, '#c9956b');
      R(ctx, 8, 10, 8, 4, lampOn ? PINK.mid : '#b07a8a');
      R(ctx, 9, 9, 6, 1, lampOn ? PINK.light : '#c99aa8');
      R(ctx, 10, 14, 4, 1, lampOn ? '#fff4c9' : '#5b4048');

      // Desk top
      R(ctx, 0, 26, 88, 2, WOOD.pale);
      R(ctx, 0, 28, 88, 6, WOOD.light);
      R(ctx, 0, 33, 88, 1, WOOD.base);
      R(ctx, 0, 34, 88, 4, WOOD.base);
      R(ctx, 0, 37, 88, 1, WOOD.mid);
      // Blush desk mat, keyboard, mouse
      R(ctx, 22, 28, 40, 6, PINK.light);
      R(ctx, 22, 28, 40, 1, PINK.pale);
      R(ctx, 25, 29, 28, 4, CREAM.light);
      for (let k = 0; k < 13; k++) R(ctx, 26 + k * 2, 30, 1, 1, CREAM.shade);
      for (let k = 0; k < 12; k++) R(ctx, 27 + k * 2, 31, 1, 1, CREAM.shade);
      R(ctx, 56, 29, 3, 4, CREAM.light);
      R(ctx, 57, 29, 1, 1, PINK.deep);
      // Sage mug with pens + notebook
      R(ctx, 64, 25, 5, 7, GREEN.sage);
      R(ctx, 64, 25, 5, 1, GREEN.pale);
      R(ctx, 65, 22, 1, 3, PINK.deep);
      R(ctx, 67, 21, 1, 4, '#ffc874');
      // Drawers (cream) + leg
      R(ctx, 3, 38, 22, 11, CREAM.base);
      R(ctx, 3, 38, 22, 1, CREAM.light);
      R(ctx, 3, 43, 22, 1, CREAM.shade);
      R(ctx, 12, 40, 4, 1, '#c9956b');
      R(ctx, 12, 45, 4, 1, '#c9956b');
      R(ctx, 81, 38, 4, 11, WOOD.base);
      R(ctx, 81, 38, 1, 11, WOOD.light);
    },
    { outline: OUTLINE, after: (ctx) => groundShadow(ctx, 44, 49, 42) },
  );
}

export function chairUrl(): string {
  const { w, h } = FURNITURE.chair;
  return paint(
    'chair',
    w,
    h,
    (ctx) => {
      ellipse(ctx, 10, 6, 8, 6, PINK.mid);
      ellipse(ctx, 10, 5, 7, 4, PINK.light);
      R(ctx, 7, 3, 6, 1, PINK.pale);
      R(ctx, 3, 9, 14, 2, PINK.deep);
      R(ctx, 2, 12, 16, 4, GREEN.sage);
      R(ctx, 2, 12, 16, 1, GREEN.pale);
      R(ctx, 2, 15, 16, 1, '#6d8f6a');
      R(ctx, 9, 16, 2, 4, '#c9956b');
      R(ctx, 4, 20, 12, 1, '#c9956b');
      R(ctx, 3, 21, 2, 1, WOOD.dark);
      R(ctx, 15, 21, 2, 1, WOOD.dark);
    },
    { outline: OUTLINE, after: (ctx) => groundShadow(ctx, 10, 23, 8) },
  );
}

export function fernUrl(): string {
  const { w, h } = FURNITURE.fern;
  return paint(
    'fern',
    w,
    h,
    (ctx) => {
      const rand = rng(17);
      const fronds: [number, number, number][] = [
        [12, 22, -1.2],
        [12, 22, -0.6],
        [12, 22, 0],
        [12, 22, 0.6],
        [12, 22, 1.2],
        [12, 22, -0.9],
        [12, 22, 0.9],
      ];
      fronds.forEach(([sx, sy, ang], i) => {
        const len = 13 + (i % 3) * 3;
        for (let t = 0; t < len; t++) {
          const x = sx + Math.sin(ang) * t * 0.9;
          const y = sy - Math.cos(ang * 0.8) * t + (t * t) / 40;
          R(ctx, x, y, 1, 1, GREEN.dark);
          if (t % 2 === 0 && t > 1) {
            R(ctx, x - 1, y, 1, 1, rand() > 0.5 ? GREEN.light : GREEN.mid);
            R(ctx, x + 1, y, 1, 1, GREEN.mid);
          }
        }
      });
      pot(ctx, 6, 23, 12, 10, CREAM.base, CREAM.light, CREAM.shade);
      R(ctx, 7, 27, 10, 1, PINK.mid);
      R(ctx, 7, 28, 10, 1, PINK.light);
    },
    { outline: '#22331f', after: (ctx) => groundShadow(ctx, 12, 34, 8) },
  );
}

export function monsteraUrl(): string {
  const { w, h } = FURNITURE.monstera;
  return paint(
    'monstera',
    w,
    h,
    (ctx) => {
      const leaves: [number, number, number, number][] = [
        [7, 8, 6, 5],
        [19, 6, 6, 5],
        [13, 3, 6, 5],
        [5, 18, 6, 4],
        [21, 17, 6, 4],
        [13, 13, 7, 5],
      ];
      leaves.forEach(([lx, ly, rx, ry], i) => {
        R(ctx, 14, ly + ry, 1, 30 - ly - ry, GREEN.dark);
        ellipse(ctx, lx, ly, rx, ry, i % 2 ? GREEN.mid : '#4f7f4b');
        ellipse(ctx, lx - 1, ly - 1, rx - 2, ry - 2, i % 2 ? GREEN.light : GREEN.mid);
        // splits
        R(ctx, lx - rx, ly, rx - 1, 1, 'rgba(0,0,0,0)');
        ctx.clearRect(lx - rx, ly, Math.max(1, rx - 2), 1);
        ctx.clearRect(lx + 2, ly + 1, rx - 2, 1);
        R(ctx, lx, ly - ry + 1, 1, ry * 2 - 1, '#3f6a43');
      });
      // woven basket pot
      R(ctx, 6, 31, 17, 13, '#c9a36b');
      R(ctx, 5, 30, 19, 2, '#e0bd85');
      for (let y = 33; y < 43; y += 2) R(ctx, 7, y, 15, 1, '#a8824f');
      for (let x = 8; x < 22; x += 3) R(ctx, x, 32, 1, 11, '#b8925a');
      R(ctx, 7, 37, 15, 1, PINK.mid);
    },
    { outline: '#22331f', after: (ctx) => groundShadow(ctx, 14, 45, 10) },
  );
}

export function bookshelfUrl(): string {
  const { w, h } = FURNITURE.bookshelf;
  return paint(
    'bookshelf',
    w,
    h,
    (ctx) => {
      const rand = rng(42);
      // Trophy on top
      const tx = 31;
      R(ctx, tx, 0, 10, 2, '#f2c14e');
      R(ctx, tx + 1, 2, 8, 3, '#e0a92e');
      R(ctx, tx + 2, 0, 2, 4, '#ffe08a');
      R(ctx, tx - 1, 1, 1, 3, '#e0a92e');
      R(ctx, tx + 10, 1, 1, 3, '#e0a92e');
      R(ctx, tx + 4, 5, 2, 2, '#b8862b');
      R(ctx, tx + 2, 7, 6, 2, WOOD.mid);
      R(ctx, tx + 3, 7, 4, 1, '#f2c14e');
      // Plant on top
      pot(ctx, 6, 4, 9, 6, PINK.mid, PINK.light, PINK.deep);
      leaf(ctx, 5, 1, false, 'light');
      leaf(ctx, 9, 0, true, 'mid');
      leaf(ctx, 12, 2, true, 'light');

      // Frame (warm wood with cream back)
      R(ctx, 0, 10, 50, 62, WOOD.base);
      R(ctx, 1, 10, 48, 1, WOOD.pale);
      R(ctx, 1, 11, 1, 60, WOOD.light);
      R(ctx, 3, 13, 44, 55, '#5a3826');
      const shelfYs = [27, 43, 59];
      const bookColors = [PINK.mid, '#c9956b', '#8fb3c9', '#e8c070', GREEN.sage, '#6f9c5f', '#e07a5f', CREAM.light, PINK.deep, '#9a8bc4'];
      let top = 13;
      [...shelfYs, 68].forEach((sy, si) => {
        let bx = 4;
        // leave room for a small potted plant on shelf 2
        const end = si === 1 ? 34 : 46;
        while (bx < end) {
          const bw = 2 + Math.floor(rand() * 3);
          const bh = Math.min(sy - top - 1, 7 + Math.floor(rand() * 6));
          if (bx + bw > end) break;
          if (rand() > 0.9) {
            bx += 3;
            continue;
          }
          const c = bookColors[Math.floor(rand() * bookColors.length)];
          R(ctx, bx, sy - bh, bw, bh, c);
          R(ctx, bx, sy - bh, 1, bh, 'rgba(255,255,255,0.22)');
          R(ctx, bx, sy - bh + 2, bw, 1, 'rgba(0,0,0,0.22)');
          bx += bw;
        }
        top = sy + 2;
      });
      // small plant inside shelf 2
      pot(ctx, 37, 37, 7, 6, CREAM.base, CREAM.light, CREAM.shade);
      leaf(ctx, 36, 34, false, 'light');
      leaf(ctx, 40, 33, true, 'mid');
      shelfYs.forEach((sy) => {
        R(ctx, 3, sy, 44, 2, WOOD.light);
        R(ctx, 3, sy, 44, 1, WOOD.pale);
      });
      R(ctx, 0, 68, 50, 4, WOOD.mid);
      R(ctx, 0, 68, 50, 1, WOOD.base);
      // Trailing pothos from the top and the first shelf
      vine(ctx, 7, 10, 22, 31);
      vine(ctx, 11, 10, 14, 33);
      vine(ctx, 44, 29, 16, 35);
    },
    { outline: OUTLINE, after: (ctx) => groundShadow(ctx, 25, 73, 24) },
  );
}

export function polaroidsUrl(): string {
  const { w, h } = FURNITURE.polaroids;
  return paint(
    'polaroids',
    w,
    h,
    (ctx) => {
      for (let x = 0; x < w; x++) {
        const y = 3 + Math.round(Math.sin((x / w) * Math.PI) * 5);
        R(ctx, x, y, 1, 1, CREAM.shade);
        if (x % 6 === 0) leaf(ctx, x - 1, y - 1, x % 12 === 0, 'mid');
      }
      R(ctx, 0, 1, 2, 4, '#c9956b');
      R(ctx, w - 2, 1, 2, 4, '#c9956b');
      const scenes = [
        ['#f7b9c8', '#e88aa5', '#ffc874'],
        ['#9ad1e8', '#6fae5a', '#3f7440'],
        ['#2c2556', '#f2c14e', '#c9c3ff'],
        ['#fbd5b5', '#d97a95', '#7a4a2f'],
      ];
      [4, 22, 40, 57].forEach((px, i) => {
        const py = 3 + Math.round(Math.sin(((px + 6) / w) * Math.PI) * 5) + 2;
        const [sky, ground, accent] = scenes[i];
        R(ctx, px, py, 13, 17, CREAM.light);
        R(ctx, px + 1, py + 1, 11, 10, sky);
        R(ctx, px + 1, py + 8, 11, 3, ground);
        R(ctx, px + 3 + i, py + 3, 2, 2, accent);
        R(ctx, px + 7, py + 5, 2, 2, '#3b2433');
        R(ctx, px + 7, py + 7, 2, 3, i % 2 ? PINK.mid : GREEN.sage);
        R(ctx, px + 3, py + 13, 7, 1, '#d8c7ad');
        R(ctx, px + 5, py - 2, 3, 3, i % 2 ? PINK.mid : '#c9956b');
      });
    },
    { outline: OUTLINE },
  );
}

export function catTreeUrl(): string {
  const { w, h } = FURNITURE.catTree;
  return paint(
    'catTree',
    w,
    h,
    (ctx) => {
      ellipse(ctx, 18, 10, 16, 4, PINK.deep);
      ellipse(ctx, 18, 9, 16, 4, PINK.mid);
      ellipse(ctx, 18, 8, 13, 2, PINK.light);
      R(ctx, 32, 12, 1, 12, CREAM.shade);
      ellipse(ctx, 32, 26, 2, 2, '#f2c14e');
      R(ctx, 15, 13, 7, 28, '#c9a36b');
      for (let y = 14; y < 41; y += 2) R(ctx, 15, y, 7, 1, '#a8824f');
      R(ctx, 15, 13, 1, 28, '#e0bd85');
      R(ctx, 2, 40, 34, 30, WOOD.base);
      R(ctx, 2, 40, 34, 3, PINK.mid);
      R(ctx, 2, 40, 34, 1, PINK.light);
      R(ctx, 2, 69, 34, 1, WOOD.mid);
      R(ctx, 2, 43, 1, 27, WOOD.light);
      ellipse(ctx, 19, 57, 11, 9, WOOD.mid);
      ellipse(ctx, 19, 57, 10, 8, '#2a1610');
      R(ctx, 9, 62, 21, 4, '#3a2016');
      R(ctx, 15, 70, 7, 12, '#c9a36b');
      for (let y = 71; y < 82; y += 2) R(ctx, 15, y, 7, 1, '#a8824f');
      R(ctx, 0, 81, 38, 6, PINK.deep);
      R(ctx, 0, 80, 38, 2, PINK.mid);
      R(ctx, 0, 86, 38, 1, '#8a3e5e');
      leaf(ctx, 2, 76, false, 'light');
      leaf(ctx, 5, 77, true, 'mid');
    },
    { outline: OUTLINE, after: (ctx) => groundShadow(ctx, 19, 88, 18) },
  );
}

export function coffeeUrl(): string {
  const { w, h } = FURNITURE.coffee;
  return paint(
    'coffee',
    w,
    h,
    (ctx) => {
      const o = 4; // top offset
      // Espresso machine (rose-gold)
      R(ctx, 4, o, 18, 16, '#a8794e');
      R(ctx, 5, o + 1, 16, 14, '#c9956b');
      R(ctx, 6, o + 2, 14, 1, '#f0c9a0');
      R(ctx, 7, o + 5, 4, 3, '#2e1c14');
      R(ctx, 8, o + 6, 2, 1, '#ffc874');
      R(ctx, 14, o + 5, 4, 2, WOOD.dark);
      R(ctx, 11, o + 10, 4, 3, '#3b2433');
      R(ctx, 12, o + 13, 2, 2, CREAM.light);
      // Grinder
      R(ctx, 26, o + 2, 7, 4, '#c9a36b');
      R(ctx, 26, o + 2, 7, 1, '#e0bd85');
      R(ctx, 27, o + 6, 5, 9, GREEN.sage);
      R(ctx, 28, o + 7, 1, 6, GREEN.pale);
      // Steaming blush mug
      R(ctx, 37, o + 9, 8, 6, PINK.mid);
      R(ctx, 37, o + 9, 8, 1, '#7a4a2f');
      R(ctx, 45, o + 10, 2, 3, PINK.deep);
      R(ctx, 38, o + 11, 1, 3, PINK.pale);
      // Bean jar
      R(ctx, 49, o + 3, 8, 12, '#e8eef0');
      R(ctx, 50, o + 6, 6, 8, WOOD.dark);
      for (let i = 0; i < 6; i++) R(ctx, 50 + ((i * 3) % 6), o + 7 + i, 1, 1, WOOD.mid);
      R(ctx, 48, o + 2, 10, 2, '#c9956b');
      // Little trailing plant on the counter
      pot(ctx, 60, o + 8, 8, 7, CREAM.base, CREAM.light, CREAM.shade);
      leaf(ctx, 59, o + 5, false, 'light');
      leaf(ctx, 63, o + 4, true, 'mid');
      leaf(ctx, 65, o + 6, true, 'light');
      // Counter: wood top, sage cabinet, cream panels
      R(ctx, 0, o + 14, 70, 2, WOOD.pale);
      R(ctx, 0, o + 16, 70, 5, WOOD.light);
      R(ctx, 0, o + 21, 70, 1, WOOD.mid);
      R(ctx, 0, o + 22, 70, 20, GREEN.sage);
      R(ctx, 0, o + 22, 70, 1, GREEN.pale);
      R(ctx, 0, o + 23, 70, 1, PINK.mid);
      for (const px of [3, 26, 49]) {
        R(ctx, px, o + 26, 18, 13, '#7f9f7b');
        R(ctx, px + 1, o + 27, 16, 11, CREAM.base);
        R(ctx, px + 1, o + 27, 16, 1, CREAM.light);
        R(ctx, px + 7, o + 31, 4, 1, '#c9956b');
      }
      // Vine spilling over the front
      vine(ctx, 66, o + 22, 13, 77);
    },
    { outline: OUTLINE, after: (ctx) => groundShadow(ctx, 35, 46, 34) },
  );
}

export function floorLampUrl(lampOn: boolean): string {
  const { w, h } = FURNITURE.floorLamp;
  return paint(
    `floorLamp:${lampOn}`,
    w,
    h,
    (ctx) => {
      const shade = lampOn ? '#ffe3b0' : '#a88a6a';
      const edge = lampOn ? '#ffc874' : '#7a634a';
      for (let y = 0; y < 13; y++) {
        const inset = Math.max(0, 4 - Math.floor(y / 3));
        R(ctx, inset, y, w - inset * 2, 1, shade);
      }
      R(ctx, 0, 12, w, 2, edge);
      R(ctx, 3, 4, 1, 6, lampOn ? '#fff4d6' : '#b89a78');
      R(ctx, 2, 9, 12, 1, lampOn ? PINK.light : '#9a7a6a');
      R(ctx, 7, 14, 2, 38, '#c9956b');
      R(ctx, 8, 14, 1, 38, '#f0c9a0');
      ellipse(ctx, 8, 53, 6, 2, WOOD.mid);
      R(ctx, 3, 52, 10, 1, WOOD.light);
    },
    { outline: OUTLINE, after: (ctx) => groundShadow(ctx, 8, 56, 7) },
  );
}

export function armchairUrl(): string {
  const { w, h } = FURNITURE.armchair;
  return paint(
    'armchair',
    w,
    h,
    (ctx) => {
      // Back
      ellipse(ctx, 17, 9, 14, 8, PINK.deep);
      ellipse(ctx, 17, 8, 13, 7, PINK.mid);
      ellipse(ctx, 16, 6, 9, 4, PINK.light);
      // Arms
      R(ctx, 1, 12, 7, 16, PINK.deep);
      R(ctx, 1, 12, 7, 3, PINK.mid);
      R(ctx, 2, 12, 5, 1, PINK.light);
      R(ctx, 26, 12, 7, 16, PINK.deep);
      R(ctx, 26, 12, 7, 3, PINK.mid);
      R(ctx, 27, 12, 5, 1, PINK.light);
      // Seat cushion
      R(ctx, 8, 16, 18, 8, PINK.mid);
      R(ctx, 8, 16, 18, 2, PINK.light);
      R(ctx, 8, 23, 18, 1, PINK.deep);
      // Cream pillow + sage throw
      R(ctx, 11, 10, 9, 7, CREAM.light);
      R(ctx, 11, 16, 9, 1, CREAM.shade);
      R(ctx, 14, 12, 3, 2, PINK.mid);
      R(ctx, 18, 15, 10, 12, GREEN.sage);
      R(ctx, 18, 15, 10, 1, GREEN.pale);
      for (let i = 0; i < 4; i++) R(ctx, 19 + i * 2, 27, 1, 2, GREEN.sage);
      // Skirt + legs
      R(ctx, 1, 24, 32, 5, '#b0567a');
      R(ctx, 1, 24, 32, 1, PINK.deep);
      R(ctx, 3, 29, 2, 3, WOOD.mid);
      R(ctx, 29, 29, 2, 3, WOOD.mid);
    },
    { outline: OUTLINE, after: (ctx) => groundShadow(ctx, 17, 33, 16) },
  );
}

export function sideTableUrl(): string {
  const { w, h } = FURNITURE.sideTable;
  return paint(
    'sideTable',
    w,
    h,
    (ctx) => {
      // books + succulent on top
      R(ctx, 2, 5, 9, 2, PINK.mid);
      R(ctx, 3, 3, 8, 2, GREEN.sage);
      R(ctx, 2, 1, 7, 2, CREAM.light);
      pot(ctx, 11, 3, 5, 5, CREAM.base, CREAM.light, CREAM.shade);
      leaf(ctx, 10, 0, false, 'light');
      leaf(ctx, 13, 0, true, 'mid');
      // round top
      ellipse(ctx, 9, 9, 8, 2, WOOD.light);
      ellipse(ctx, 9, 8, 7, 1, WOOD.pale);
      R(ctx, 1, 10, 16, 2, WOOD.base);
      R(ctx, 8, 12, 2, 10, WOOD.mid);
      R(ctx, 8, 12, 1, 10, WOOD.base);
      R(ctx, 4, 22, 10, 2, WOOD.mid);
    },
    { outline: OUTLINE, after: (ctx) => groundShadow(ctx, 9, 25, 7) },
  );
}

export function basketUrl(): string {
  const { w, h } = FURNITURE.basket;
  return paint(
    'basket',
    w,
    h,
    (ctx) => {
      // sage blanket + pink yarn
      ellipse(ctx, 8, 5, 7, 3, GREEN.sage);
      R(ctx, 3, 4, 10, 1, GREEN.pale);
      ellipse(ctx, 15, 4, 3, 3, PINK.mid);
      R(ctx, 14, 3, 2, 1, PINK.pale);
      R(ctx, 17, 6, 3, 1, PINK.deep);
      // basket
      R(ctx, 1, 7, 20, 9, '#c9a36b');
      R(ctx, 0, 6, 22, 2, '#e0bd85');
      for (let y = 9; y < 16; y += 2) R(ctx, 2, y, 18, 1, '#a8824f');
      for (let x = 3; x < 20; x += 3) R(ctx, x, 8, 1, 8, '#b8925a');
    },
    { outline: OUTLINE, after: (ctx) => groundShadow(ctx, 11, 17, 10) },
  );
}

export function bigPlantUrl(): string {
  const { w, h } = FURNITURE.bigPlant;
  return paint(
    'bigPlant',
    w,
    h,
    (ctx) => {
      // Tall bird-of-paradise style leaves
      const blades: [number, number, number][] = [
        [6, 2, -1],
        [13, 0, 0],
        [20, 3, 1],
        [9, 7, -1],
        [17, 6, 1],
      ];
      blades.forEach(([x, y, dir], i) => {
        R(ctx, 13, y + 6, 1, 26 - y, GREEN.dark);
        for (let t = 0; t < 12; t++) {
          const lx = x + Math.round(dir * Math.sin(t / 3));
          const wdt = t < 2 || t > 10 ? 1 : t < 4 || t > 8 ? 2 : 3;
          R(ctx, lx - Math.floor(wdt / 2), y + t, wdt, 1, i % 2 ? GREEN.mid : '#4f7f4b');
          if (wdt > 1) R(ctx, lx - Math.floor(wdt / 2), y + t, 1, 1, GREEN.light);
        }
      });
      // blush pot
      pot(ctx, 5, 26, 16, 12, PINK.mid, PINK.light, PINK.deep);
      R(ctx, 6, 31, 14, 1, CREAM.light);
      R(ctx, 6, 33, 14, 1, PINK.deep);
    },
    { outline: '#22331f', after: (ctx) => groundShadow(ctx, 13, 37, 9) },
  );
}
