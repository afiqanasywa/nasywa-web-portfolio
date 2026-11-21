/**
 * Grid A* pathfinding over the cabin floor with line-of-sight smoothing,
 * so click/tap-to-walk routes around furniture naturally.
 */
import { ROOM_H, ROOM_W, isFree, type Point } from './layout';

const CELL = 4;
const COLS = Math.ceil(ROOM_W / CELL);
const ROWS = Math.ceil(ROOM_H / CELL);

const cellCenter = (c: number, r: number): Point => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });

// Pre-compute walkability once — the furniture never moves.
const walkable: boolean[] = new Array(COLS * ROWS);
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) walkable[r * COLS + c] = isFree(cellCenter(c, r));
}

const idx = (c: number, r: number) => r * COLS + c;
const inBounds = (c: number, r: number) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
const toCell = (p: Point) => ({ c: Math.floor(p.x / CELL), r: Math.floor(p.y / CELL) });

/** Closest walkable point to an arbitrary click, searching outward in rings. */
export function nearestWalkable(p: Point): Point | null {
  if (isFree(p)) return p;
  const { c, r } = toCell(p);
  for (let radius = 1; radius < 40; radius++) {
    let best: Point | null = null;
    let bestD = Infinity;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
        const cc = c + dc;
        const rr = r + dr;
        if (!inBounds(cc, rr) || !walkable[idx(cc, rr)]) continue;
        const q = cellCenter(cc, rr);
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/** Straight-line check sampled every 2px. */
export function lineClear(a: Point, b: Point): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isFree({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  }
  return true;
}

class MinHeap {
  private items: { i: number; f: number }[] = [];
  get size() {
    return this.items.length;
  }
  push(i: number, f: number) {
    const a = this.items;
    a.push({ i, f });
    let n = a.length - 1;
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (a[p].f <= a[n].f) break;
      [a[p], a[n]] = [a[n], a[p]];
      n = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let n = 0;
      for (;;) {
        const l = n * 2 + 1;
        const r = l + 1;
        let m = n;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === n) break;
        [a[m], a[n]] = [a[n], a[m]];
        n = m;
      }
    }
    return top.i;
  }
}

const NEIGHBOURS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;

/**
 * Returns a list of waypoints (excluding the start) from `from` to `to`,
 * or null when the target can't be reached.
 */
export function findPath(from: Point, to: Point): Point[] | null {
  const goal = nearestWalkable(to);
  if (!goal) return null;
  if (lineClear(from, goal)) return [goal];

  const s = toCell(isFree(from) ? from : nearestWalkable(from) ?? from);
  const g = toCell(goal);
  const start = idx(s.c, s.r);
  const target = idx(g.c, g.r);

  const gScore = new Float32Array(COLS * ROWS).fill(Infinity);
  const came = new Int32Array(COLS * ROWS).fill(-1);
  const closed = new Uint8Array(COLS * ROWS);
  const open = new MinHeap();
  gScore[start] = 0;
  open.push(start, 0);

  while (open.size) {
    const cur = open.pop();
    if (cur === target) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const c = cur % COLS;
    const r = (cur - c) / COLS;
    for (const [dc, dr, cost] of NEIGHBOURS) {
      const nc = c + dc;
      const nr = r + dr;
      if (!inBounds(nc, nr) || !walkable[idx(nc, nr)]) continue;
      // No corner cutting through furniture.
      if (dc && dr && (!walkable[idx(c + dc, r)] || !walkable[idx(c, r + dr)])) continue;
      const n = idx(nc, nr);
      const tentative = gScore[cur] + cost;
      if (tentative < gScore[n]) {
        gScore[n] = tentative;
        came[n] = cur;
        const h = Math.hypot(nc - g.c, nr - g.r);
        open.push(n, tentative + h);
      }
    }
  }

  if (came[target] === -1 && start !== target) return null;

  const raw: Point[] = [];
  for (let n = target; n !== -1 && n !== start; n = came[n]) {
    const c = n % COLS;
    raw.push(cellCenter(c, (n - c) / COLS));
  }
  raw.reverse();
  raw[raw.length - 1] = goal;

  // String-pulling: skip waypoints that are directly visible.
  const smooth: Point[] = [];
  let anchor = from;
  let i = 0;
  while (i < raw.length) {
    let j = raw.length - 1;
    while (j > i && !lineClear(anchor, raw[j])) j--;
    smooth.push(raw[j]);
    anchor = raw[j];
    i = j + 1;
  }
  return smooth;
}
