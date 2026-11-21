/**
 * Room geometry, measured in "room pixels". The whole room is drawn at
 * ROOM_W x ROOM_H and scaled up with nearest-neighbour filtering.
 */
import type { StationId } from '../data/portfolioData';

export const ROOM_W = 320;
export const ROOM_H = 224;

/** Back wall height; the floor starts below it. */
export const WALL_H = 76;

export type Dir = 'down' | 'up' | 'left' | 'right';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Area Nasywa's feet may stand in. */
export const WALKABLE: Rect = { x: 12, y: 82, w: 296, h: 132 };

/** Nasywa's foot box, centred horizontally on her position, bottom at her y. */
export const FOOT = { w: 10, h: 4 };

export const START: Point = { x: 150, y: 152 };

export interface FurnitureRect extends Rect {
  id: string;
}

/** Sprite placement of every piece of furniture and decor (top-left + size). */
export const FURNITURE = {
  desk: { id: 'desk', x: 14, y: 44, w: 88, h: 50 },
  chair: { id: 'chair', x: 39, y: 84, w: 20, h: 24 },
  fern: { id: 'fern', x: 103, y: 56, w: 24, h: 36 },
  bookshelf: { id: 'bookshelf', x: 130, y: 12, w: 50, h: 74 },
  monstera: { id: 'monstera', x: 181, y: 46, w: 28, h: 46 },
  polaroids: { id: 'polaroids', x: 188, y: 16, w: 74, h: 32 },
  catTree: { id: 'catTree', x: 274, y: 46, w: 38, h: 90 },
  coffee: { id: 'coffee', x: 238, y: 160, w: 70, h: 48 },
  floorLamp: { id: 'floorLamp', x: 12, y: 136, w: 16, h: 58 },
  armchair: { id: 'armchair', x: 31, y: 160, w: 34, h: 34 },
  sideTable: { id: 'sideTable', x: 66, y: 168, w: 18, h: 26 },
  basket: { id: 'basket', x: 98, y: 194, w: 22, h: 18 },
  bigPlant: { id: 'bigPlant', x: 182, y: 176, w: 26, h: 38 },
  windowLeft: { id: 'windowLeft', x: 104, y: 14, w: 22, h: 28 },
  windowRight: { id: 'windowRight', x: 280, y: 6, w: 26, h: 28 },
} satisfies Record<string, FurnitureRect>;

/** Blocks the feet can't enter. */
export const COLLIDERS: Rect[] = [
  { x: 14, y: 70, w: 88, h: 26 }, // desk
  { x: 43, y: 98, w: 12, h: 9 }, // chair
  { x: 106, y: 78, w: 18, h: 14 }, // fern
  { x: 130, y: 70, w: 50, h: 18 }, // bookshelf
  { x: 186, y: 80, w: 18, h: 12 }, // monstera
  { x: 274, y: 118, w: 38, h: 20 }, // cat tree base
  { x: 238, y: 184, w: 70, h: 26 }, // coffee bar
  { x: 12, y: 184, w: 16, h: 10 }, // floor lamp
  { x: 33, y: 178, w: 30, h: 16 }, // armchair
  { x: 67, y: 184, w: 16, h: 10 }, // side table
  { x: 99, y: 202, w: 20, h: 10 }, // basket
  { x: 186, y: 204, w: 18, h: 10 }, // big plant
];

export interface StationGeom {
  id: StationId;
  /** Where Nasywa stands to use the station. */
  stand: Point;
  face: Dir;
  /** Clickable area in the room (furniture bounds). */
  hotspot: Rect;
  /** Where the floating label sits. */
  labelAt: Point;
}

export const STATION_GEOM: Record<Exclude<StationId, 'nasywa'>, StationGeom> = {
  desk: {
    id: 'desk',
    stand: { x: 76, y: 108 },
    face: 'up',
    hotspot: { x: 14, y: 44, w: 88, h: 52 },
    labelAt: { x: 58, y: 40 },
  },
  bookshelf: {
    id: 'bookshelf',
    stand: { x: 155, y: 100 },
    face: 'up',
    hotspot: { x: 130, y: 2, w: 50, h: 86 },
    labelAt: { x: 155, y: 2 },
  },
  polaroids: {
    id: 'polaroids',
    stand: { x: 226, y: 94 },
    face: 'up',
    hotspot: { x: 186, y: 14, w: 78, h: 36 },
    labelAt: { x: 225, y: 52 },
  },
  coffee: {
    id: 'coffee',
    stand: { x: 228, y: 202 },
    face: 'right',
    hotspot: { x: 238, y: 158, w: 70, h: 52 },
    labelAt: { x: 273, y: 150 },
  },
};

/** Interaction radius for keyboard "Enter / Space". */
export const INTERACT_RADIUS = 26;

/** String-light wire: a gentle sag across the top of the wall. */
export function wireY(x: number): number {
  const segment = 64;
  const t = (x % segment) / segment;
  return 5 + Math.sin(t * Math.PI) * 5;
}

export const BULB_XS = Array.from({ length: 19 }, (_, i) => 8 + i * 16.5);

export const PALETTE_BULBS = ['#ffc874', '#f4a7b9', '#fff1c8', '#c9e2b8', '#ffd3de'];

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function footRect(p: Point): Rect {
  return { x: p.x - FOOT.w / 2, y: p.y - FOOT.h, w: FOOT.w, h: FOOT.h };
}

/** True if Nasywa can stand at this point. */
export function isFree(p: Point): boolean {
  const f = footRect(p);
  if (f.x < WALKABLE.x || f.y < WALKABLE.y) return false;
  if (f.x + f.w > WALKABLE.x + WALKABLE.w || f.y + f.h > WALKABLE.y + WALKABLE.h) return false;
  return !COLLIDERS.some((c) => rectsOverlap(f, c));
}

export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
