import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { synth } from '../audio/retroSynth';
import { portfolioData, stationById, type CatInfo, type StationId } from '../data/portfolioData';
import {
  BULB_XS,
  FURNITURE,
  INTERACT_RADIUS,
  PALETTE_BULBS,
  ROOM_H,
  ROOM_W,
  START,
  STATION_GEOM,
  dist,
  isFree,
  wireY,
  type Dir,
  type Point,
} from '../game/layout';
import { findPath } from '../game/pathfinding';
import {
  armchairUrl,
  basketUrl,
  bigPlantUrl,
  bookshelfUrl,
  catTreeUrl,
  chairUrl,
  coffeeUrl,
  deskUrl,
  fernUrl,
  floorLampUrl,
  monsteraUrl,
  polaroidsUrl,
  roomUrl,
  sideTableUrl,
  spriteUrl,
} from '../pixel/painters';
import {
  CAT_SPRITES,
  HEART,
  NASYWA_H,
  NASYWA_W,
  SPARKLE,
  ZED,
  nasywaFrame,
  type CatId,
  type Facing,
  type WalkFrame,
} from '../pixel/sprites';

export interface WalkRequest {
  id: StationId;
  nonce: number;
}

interface Props {
  lampOn: boolean;
  onToggleLamp: () => void;
  onStationReached: (id: StationId) => void;
  inputLocked: boolean;
  walkRequest: WalkRequest | null;
}

type RoomStation = Exclude<StationId, 'nasywa'>;

interface CatPlacement {
  id: CatId;
  x: number;
  y: number;
  z: number;
}

interface CatReaction {
  key: number;
  line: string;
}

const SPEED = 72; // room px / second
const WALK_CYCLE: WalkFrame[] = [1, 2, 3, 2];
const FRAME_MS = 120;
const REACTION_MS = 2800;

const CAT_SPOTS: CatPlacement[] = [
  { id: 'kishi', x: FURNITURE.catTree.x + 11, y: FURNITURE.catTree.y + 1, z: 137 },
  { id: 'nining', x: FURNITURE.catTree.x + 12, y: FURNITURE.catTree.y + 54, z: 137 },
  { id: 'miu', x: FURNITURE.desk.x + 74, y: FURNITURE.desk.y + 21, z: 95 },
];

const CAT_INFO = Object.fromEntries(portfolioData.cats.map((c) => [c.id, c])) as Record<CatId, CatInfo>;

const KEY_DIRS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

/** Deterministic pseudo-random particle layout. */
const PARTICLES = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
  return {
    left: 12 + r(1) * (ROOM_W - 24),
    top: 40 + r(2) * (ROOM_H - 60),
    dur: 7 + r(3) * 7,
    delay: -r(4) * 12,
    dx: (r(5) - 0.5) * 24,
    size: r(6) > 0.75 ? 2 : 1,
    color: r(7) > 0.66 ? '#ffe7a8' : r(7) > 0.33 ? '#ffd3de' : '#d7ecc8',
  };
});

const SPARKLE_OFFSETS = [
  { x: -3, y: 0, sx: -4, d: 0 },
  { x: 7, y: -3, sx: 0, d: 0.12 },
  { x: 15, y: 0, sx: 4, d: 0.24 },
  { x: 3, y: 2, sx: -2, d: 0.36 },
];

const dirFromVector = (dx: number, dy: number, fallback: Dir): Dir => {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
};

function nearestStation(p: Point): RoomStation | null {
  let best: RoomStation | null = null;
  let bestD = INTERACT_RADIUS;
  (Object.keys(STATION_GEOM) as RoomStation[]).forEach((id) => {
    const d = dist(p, STATION_GEOM[id].stand);
    if (d <= bestD) {
      bestD = d;
      best = id;
    }
  });
  return best;
}

export default function CabinViewport({ lampOn, onToggleLamp, onStationReached, inputLocked, walkRequest }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);
  const [view, setView] = useState({ w: ROOM_W * 2, h: ROOM_H * 2 });

  // --- game state kept in refs (mutated every frame) ---
  const pos = useRef<Point>({ ...START });
  const dirRef = useRef<Dir>('down');
  const path = useRef<Point[]>([]);
  const pending = useRef<StationId | null>(null);
  const keys = useRef<Set<string>>(new Set());
  const pad = useRef<Point>({ x: 0, y: 0 });
  const animTime = useRef(0);
  const lockedRef = useRef(inputLocked);
  const reachedRef = useRef(onStationReached);
  const lineIndex = useRef<Record<CatId, number>>({ kishi: 0, nining: 0, miu: 0 });
  lockedRef.current = inputLocked;
  reachedRef.current = onStationReached;

  // --- render state ---
  const [hero, setHero] = useState({ x: START.x, y: START.y, dir: 'down' as Dir, frame: 0 as WalkFrame, blink: false });
  const [near, setNear] = useState<RoomStation | null>(null);
  const [hovered, setHovered] = useState<RoomStation | null>(null);
  const [marker, setMarker] = useState<{ x: number; y: number; key: number } | null>(null);
  const [reactions, setReactions] = useState<Partial<Record<CatId, CatReaction>>>({});
  const [twitch, setTwitch] = useState(false);
  const [touched, setTouched] = useState(false);

  // --- art (painted once; lamp-dependent pieces repaint per state) ---
  const art = useMemo(() => {
    const frames = {} as Record<Facing, string[]>;
    (['down', 'up', 'side'] as Facing[]).forEach((f) => {
      frames[f] = ([0, 1, 2, 3] as WalkFrame[]).map((n) => spriteUrl(`n-${f}-${n}`, nasywaFrame(f, n)));
    });
    return {
      room: roomUrl(),
      chair: chairUrl(),
      fern: fernUrl(),
      monstera: monsteraUrl(),
      bookshelf: bookshelfUrl(),
      polaroids: polaroidsUrl(),
      catTree: catTreeUrl(),
      coffee: coffeeUrl(),
      armchair: armchairUrl(),
      sideTable: sideTableUrl(),
      basket: basketUrl(),
      bigPlant: bigPlantUrl(),
      heart: spriteUrl('heart', HEART),
      sparkle: spriteUrl('sparkle', SPARKLE),
      zed: spriteUrl('zed', ZED),
      cats: Object.fromEntries(
        (Object.keys(CAT_SPRITES) as CatId[]).map((id) => [
          id,
          { sleep: spriteUrl(`cat-${id}`, CAT_SPRITES[id].sleep), twitch: spriteUrl(`cat-${id}-t`, CAT_SPRITES[id].twitch) },
        ]),
      ) as Record<CatId, { sleep: string; twitch: string }>,
      frames,
      blink: spriteUrl('n-down-blink', nasywaFrame('down', 0, true)),
    };
  }, []);
  const desk = useMemo(() => deskUrl(lampOn), [lampOn]);
  const floorLamp = useMemo(() => floorLampUrl(lampOn), [lampOn]);

  // --- responsive scaling ---
  // Wide screens fit the whole room (quarter steps above 2x keep pixels even).
  // Tall, narrow phones zoom in to fill the height and the camera follows Nasywa.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const fitW = width / ROOM_W;
      const fitH = height / ROOM_H;
      let s = Math.min(fitW, fitH);
      if (fitH > fitW * 1.35) s = Math.min(fitH, fitW * 1.8);
      setScale(Math.max(0.8, s >= 2 ? Math.floor(s * 4) / 4 : s));
      setView({ w: width, h: height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- movement helpers ---
  const arrive = useCallback((id: StationId) => {
    if (id !== 'nasywa') dirRef.current = STATION_GEOM[id].face;
    pending.current = null;
    reachedRef.current(id);
  }, []);

  const walkToStation = useCallback(
    (id: StationId) => {
      setTouched(true);
      if (id === 'nasywa') {
        path.current = [];
        pending.current = null;
        reachedRef.current('nasywa');
        return;
      }
      const stand = STATION_GEOM[id].stand;
      if (dist(pos.current, stand) < 2) {
        path.current = [];
        arrive(id);
        return;
      }
      const route = findPath(pos.current, stand);
      if (!route) {
        synth.bump();
        return;
      }
      path.current = route;
      pending.current = id;
      setMarker({ ...stand, key: Date.now() });
    },
    [arrive],
  );

  const walkToPoint = useCallback((p: Point) => {
    setTouched(true);
    const route = findPath(pos.current, p);
    if (!route) {
      synth.bump();
      return;
    }
    path.current = route;
    pending.current = null;
    const end = route[route.length - 1];
    setMarker({ ...end, key: Date.now() });
  }, []);

  const interact = useCallback(() => {
    const id = nearestStation(pos.current);
    if (id) {
      path.current = [];
      arrive(id);
    } else if (dist(pos.current, START) < 70) {
      reachedRef.current('nasywa');
    } else {
      synth.bump();
    }
  }, [arrive]);

  useEffect(() => {
    if (walkRequest) walkToStation(walkRequest.id);
  }, [walkRequest, walkToStation]);

  // --- keyboard ---
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (lockedRef.current || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (KEY_DIRS[e.code]) {
        e.preventDefault();
        keys.current.add(e.code);
        setTouched(true);
        return;
      }
      if ((e.code === 'Enter' || e.code === 'Space') && tag !== 'BUTTON' && tag !== 'A') {
        e.preventDefault();
        if (!e.repeat) interact();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= portfolioData.stations.length && !e.repeat) {
        walkToStation(portfolioData.stations[n - 1].id);
      }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clear);
    };
  }, [interact, walkToStation]);

  useEffect(() => {
    if (inputLocked) {
      keys.current.clear();
      pad.current = { x: 0, y: 0 };
    }
  }, [inputLocked]);

  // --- cat reaction twitch ticker (only runs while a cat is reacting) ---
  const anyReaction = Object.keys(reactions).length > 0;
  useEffect(() => {
    if (!anyReaction) return;
    const id = window.setInterval(() => setTwitch((t) => !t), 190);
    return () => window.clearInterval(id);
  }, [anyReaction]);

  // --- main loop ---
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastFrame = -1;
    let idleSince = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = pos.current;
      let moving = false;

      let ix = pad.current.x;
      let iy = pad.current.y;
      if (!lockedRef.current) {
        keys.current.forEach((k) => {
          ix += KEY_DIRS[k]?.x ?? 0;
          iy += KEY_DIRS[k]?.y ?? 0;
        });
      } else {
        ix = 0;
        iy = 0;
      }
      ix = Math.sign(ix);
      iy = Math.sign(iy);

      if (ix || iy) {
        path.current = [];
        pending.current = null;
        const len = Math.hypot(ix, iy);
        const step = SPEED * dt;
        const nx = p.x + (ix / len) * step;
        const ny = p.y + (iy / len) * step;
        if (isFree({ x: nx, y: p.y })) p.x = nx;
        if (isFree({ x: p.x, y: ny })) p.y = ny;
        dirRef.current = dirFromVector(ix, iy, dirRef.current);
        moving = true;
      } else if (path.current.length) {
        const target = path.current[0];
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const d = Math.hypot(dx, dy);
        const step = SPEED * dt;
        if (d <= step) {
          p.x = target.x;
          p.y = target.y;
          path.current.shift();
          if (!path.current.length && pending.current) arrive(pending.current);
        } else {
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
        }
        dirRef.current = dirFromVector(dx, dy, dirRef.current);
        moving = true;
      }

      let frame: WalkFrame = 0;
      if (moving) {
        animTime.current += dt * 1000;
        const idx = Math.floor(animTime.current / FRAME_MS) % WALK_CYCLE.length;
        frame = WALK_CYCLE[idx];
        if (idx !== lastFrame && (frame === 1 || frame === 3)) synth.step();
        lastFrame = idx;
        idleSince = now;
      } else {
        animTime.current = 0;
        lastFrame = -1;
      }
      // Idle blink: a 140 ms blink every ~3.6 s
      const blink = !moving && (now - idleSince) % 3600 > 3460;

      const rx = Math.round(p.x);
      const ry = Math.round(p.y);
      const d = dirRef.current;
      setHero((h) =>
        h.x === rx && h.y === ry && h.dir === d && h.frame === frame && h.blink === blink ? h : { x: rx, y: ry, dir: d, frame, blink },
      );
      const ns = nearestStation(p);
      setNear((cur) => (cur === ns ? cur : ns));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [arrive]);

  // --- pointer → room coordinates ---
  const onRoomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (inputLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    walkToPoint({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
  };

  const petCat = (id: CatId) => {
    setTouched(true);
    synth.purr();
    const info = CAT_INFO[id];
    const line = info.lines[lineIndex.current[id] % info.lines.length];
    lineIndex.current[id] += 1;
    const key = Date.now() + Math.random();
    setReactions((r) => ({ ...r, [id]: { key, line } }));
    window.setTimeout(() => {
      setReactions((r) => {
        if (r[id]?.key !== key) return r;
        const next = { ...r };
        delete next[id];
        return next;
      });
    }, REACTION_MS);
  };

  const setPad = (x: number, y: number) => {
    pad.current = { x, y };
    if (x || y) setTouched(true);
  };

  // --- derived render values ---
  const facing: Facing = hero.dir === 'up' ? 'up' : hero.dir === 'down' ? 'down' : 'side';
  const heroSrc = hero.blink && facing === 'down' && hero.frame === 0 ? art.blink : art.frames[facing][hero.frame];
  const labelStation = hovered ?? near;
  const stageW = ROOM_W * scale;
  const camX = stageW > view.w ? Math.min(Math.max(hero.x * scale - view.w / 2, 0), stageW - view.w) : 0;

  const px = (n: number) => `${n}px`;
  const place = (x: number, y: number, w: number, h: number, z: number): CSSProperties => ({
    position: 'absolute',
    left: px(x),
    top: px(y),
    width: px(w),
    height: px(h),
    zIndex: z,
  });

  const F = FURNITURE;
  const furniture: { key: string; src: string; r: { x: number; y: number; w: number; h: number }; sway?: boolean }[] = [
    { key: 'desk', src: desk, r: F.desk },
    { key: 'chair', src: art.chair, r: F.chair },
    { key: 'fern', src: art.fern, r: F.fern, sway: true },
    { key: 'bookshelf', src: art.bookshelf, r: F.bookshelf },
    { key: 'monstera', src: art.monstera, r: F.monstera, sway: true },
    { key: 'catTree', src: art.catTree, r: F.catTree },
    { key: 'coffee', src: art.coffee, r: F.coffee },
    { key: 'floorLamp', src: floorLamp, r: F.floorLamp },
    { key: 'armchair', src: art.armchair, r: F.armchair },
    { key: 'sideTable', src: art.sideTable, r: F.sideTable },
    { key: 'basket', src: art.basket, r: F.basket },
    { key: 'bigPlant', src: art.bigPlant, r: F.bigPlant, sway: true },
  ];

  const stationButton = (id: RoomStation) => {
    const g = STATION_GEOM[id];
    const meta = stationById(id);
    return (
      <button
        key={`hs-${id}`}
        type="button"
        aria-label={`Walk to the ${meta.label.replace(/^\d\.\s*/, '').toLowerCase()} — ${meta.dialogTitle}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!inputLocked) walkToStation(id);
        }}
        onPointerEnter={() => setHovered(id)}
        onPointerLeave={() => setHovered((h) => (h === id ? null : h))}
        onFocus={() => setHovered(id)}
        onBlur={() => setHovered((h) => (h === id ? null : h))}
        className="room-hit rounded-[2px] bg-transparent focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#f4a7b9]"
        style={place(g.hotspot.x, g.hotspot.y, g.hotspot.w, g.hotspot.h, 1000)}
      />
    );
  };

  const glow = (x: number, y: number, r: number, color: string, z = 905): CSSProperties => ({
    position: 'absolute',
    left: px(x - r),
    top: px(y - r),
    width: px(r * 2),
    height: px(r * 2),
    borderRadius: '50%',
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    mixBlendMode: 'screen',
    pointerEvents: 'none',
    zIndex: z,
    transition: 'opacity 400ms ease',
  });

  return (
    <div ref={wrapRef} className={`relative flex h-full w-full items-center overflow-hidden ${camX || stageW > view.w ? 'justify-start' : 'justify-center'}`}>
      <div
        className="relative shrink-0 rounded-[3px] shadow-[0_0_0_3px_#140b0f,0_0_0_6px_#7a4e35,0_0_0_8px_#140b0f,0_24px_60px_rgba(0,0,0,0.6)]"
        style={{ width: stageW, height: ROOM_H * scale, transform: camX ? `translateX(${-camX}px)` : undefined }}
      >
        <div
          role="application"
          aria-label="Nasywa's cabin. Click the floor to walk, or use the buttons on the furniture."
          onClick={onRoomClick}
          className="pixelated absolute left-0 top-0 origin-top-left select-none overflow-hidden"
          style={{ width: ROOM_W, height: ROOM_H, transform: `scale(${scale})` }}
        >
          <img src={art.room} alt="" draggable={false} className="pixelated absolute inset-0" width={ROOM_W} height={ROOM_H} />

          {/* Wall decor */}
          <img src={art.polaroids} alt="" draggable={false} className="pixelated" style={place(F.polaroids.x, F.polaroids.y, F.polaroids.w, F.polaroids.h, 5)} />

          {/* Furniture & plants, Y-sorted by bottom edge */}
          {furniture.map(({ key, src, r, sway }) => (
            <img
              key={key}
              src={src}
              alt=""
              draggable={false}
              className="pixelated pointer-events-none"
              style={{
                ...place(r.x, r.y, r.w, r.h, r.y + r.h),
                transformOrigin: '50% 100%',
                animation: sway ? `sway ${5 + (r.x % 3)}s ease-in-out infinite` : undefined,
              }}
            />
          ))}

          {/* Monitor shimmer + blinking cursor */}
          <div
            className="pointer-events-none absolute"
            style={{
              ...place(F.desk.x + 19, F.desk.y + 4, 52, 15, 95),
              background: 'linear-gradient(90deg, rgba(159,216,176,0.16), transparent 45%, transparent 55%, rgba(244,167,185,0.16))',
              animation: 'screenFlicker 3.2s ease-in-out infinite',
            }}
          />
          <div className="pointer-events-none absolute bg-[#fff1e0]" style={{ ...place(F.desk.x + 31, F.desk.y + 16, 2, 1, 96), animation: 'cursorBlink 1s steps(1) infinite' }} />

          {/* Trophy sparkle */}
          <div className="pointer-events-none absolute" style={{ ...place(F.bookshelf.x + 32, F.bookshelf.y - 2, 5, 5, 120), animation: 'shine 2.6s ease-in-out infinite' }}>
            <div className="absolute left-[2px] top-0 h-[5px] w-[1px] bg-white" />
            <div className="absolute left-0 top-[2px] h-[1px] w-[5px] bg-white" />
          </div>

          {/* Coffee steam */}
          {[0, 1, 2].map((i) => (
            <div
              key={`steam-${i}`}
              className="pointer-events-none absolute rounded-full bg-[#fff6ec]"
              style={
                {
                  ...place(F.coffee.x + 39 + i * 2, F.coffee.y + 10, 2, 2, 220),
                  animation: `steam 2.2s ease-out ${i * 0.7}s infinite`,
                  '--sx': `${i % 2 ? -2 : 2}px`,
                } as CSSProperties
              }
            />
          ))}

          {/* Sleeping cats (art y-sorted with the furniture they rest on) */}
          {CAT_SPOTS.map((spot) => {
            const reacting = Boolean(reactions[spot.id]);
            return (
              <div key={`cat-art-${spot.id}`} className="pointer-events-none absolute" style={place(spot.x, spot.y, 15, 8, spot.z)}>
                <img
                  src={reacting && twitch ? art.cats[spot.id].twitch : art.cats[spot.id].sleep}
                  alt=""
                  draggable={false}
                  className="pixelated absolute inset-0 h-[8px] w-[15px] origin-bottom"
                  style={{ animation: reacting ? undefined : `breathe ${3 + spot.x / 200}s ease-in-out infinite` }}
                />
                {!reacting && (
                  <img
                    src={art.zed}
                    alt=""
                    draggable={false}
                    className="pixelated absolute -top-[6px] left-0 h-[4px] w-[4px] opacity-0"
                    style={{ animation: `zzz 3.4s ease-out ${spot.x / 100}s infinite` }}
                  />
                )}
              </div>
            );
          })}

          {/* Cat reaction motes: heart + sparkles */}
          {CAT_SPOTS.map((spot) => {
            const r = reactions[spot.id];
            if (!r) return null;
            return (
              <div key={`motes-${r.key}`} className="pointer-events-none absolute" style={place(spot.x, spot.y - 4, 15, 4, 1004)}>
                <img
                  src={art.heart}
                  alt=""
                  className="pixelated absolute left-1/2 top-0 h-[6px] w-[7px]"
                  style={{ animation: 'floatUp 1.6s ease-out forwards' }}
                />
                {SPARKLE_OFFSETS.map((s, i) => (
                  <img
                    key={i}
                    src={art.sparkle}
                    alt=""
                    className="pixelated absolute h-[5px] w-[5px] opacity-0"
                    style={{ left: s.x, top: s.y, animation: `sparkle 1.1s ease-out ${s.d}s forwards`, '--sx': `${s.sx}px` } as CSSProperties}
                  />
                ))}
              </div>
            );
          })}

          {CAT_SPOTS.map((spot) => (
            <button
              key={spot.id}
              type="button"
              aria-label={`Pat ${CAT_INFO[spot.id].name}, the ${CAT_INFO[spot.id].description}`}
              onClick={(e) => {
                e.stopPropagation();
                petCat(spot.id);
              }}
              className="room-hit rounded-[3px] bg-transparent p-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#f4a7b9]"
              style={place(spot.x - 2, spot.y - 3, 19, 13, 1002)}
            />
          ))}

          {/* Nasywa */}
          {/* Soft two-tone oval ground shadow */}
          <div className="pointer-events-none absolute" style={place(hero.x - 7, hero.y - 2, 14, 4, hero.y - 1)}>
            <div className="h-full w-full rounded-[50%] bg-[rgba(30,12,10,0.22)]" />
            <div className="absolute inset-x-[3px] inset-y-[1px] rounded-[50%] bg-[rgba(30,12,10,0.3)]" />
          </div>
          <button
            type="button"
            aria-label="Nasywa — open About Nasywa"
            onClick={(e) => {
              e.stopPropagation();
              if (!inputLocked) walkToStation('nasywa');
            }}
            className="room-hit bg-transparent p-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#f4a7b9]"
            style={place(hero.x - NASYWA_W / 2, hero.y - NASYWA_H, NASYWA_W, NASYWA_H, 1001)}
          />
          <img
            src={heroSrc}
            alt=""
            draggable={false}
            className="pixelated pointer-events-none"
            style={{
              ...place(hero.x - NASYWA_W / 2, hero.y - NASYWA_H - (hero.frame === 2 ? 1 : 0), NASYWA_W, NASYWA_H, hero.y),
              transform: hero.dir === 'left' ? 'scaleX(-1)' : undefined,
            }}
          />

          {/* Walk target marker */}
          {marker && (
            <div key={marker.key} className="pointer-events-none absolute" style={{ ...place(marker.x - 3, marker.y - 2, 6, 3, 2), animation: 'fadeIn 150ms ease both' }}>
              <div className="h-full w-full rounded-[50%] border border-[#f4a7b9] opacity-80" />
            </div>
          )}

          {(Object.keys(STATION_GEOM) as RoomStation[]).map(stationButton)}

          {/* Lamp switches */}
          {(
            [
              ['desk lamp', F.desk.x + 2, F.desk.y + 8, 15, 24],
              ['floor lamp', F.floorLamp.x, F.floorLamp.y, F.floorLamp.w, F.floorLamp.h],
            ] as const
          ).map(([label, x, y, w, h]) => (
            <button
              key={label}
              type="button"
              aria-label={lampOn ? `Turn the ${label} off` : `Turn the ${label} on`}
              aria-pressed={lampOn}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLamp();
              }}
              className="room-hit bg-transparent focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#ffc874]"
              style={place(x, y, w, h, 1003)}
            />
          ))}

          {/* ---------- Lighting ---------- */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 900, background: '#140a1c', opacity: lampOn ? 0.16 : 0.5, transition: 'opacity 400ms ease' }}
          />
          <div style={{ ...glow(F.windowLeft.x + 11, F.windowLeft.y + 20, 34, 'rgba(160,150,255,0.35)'), opacity: lampOn ? 0.5 : 1 }} />
          <div style={{ ...glow(F.windowRight.x + 13, F.windowRight.y + 20, 34, 'rgba(160,150,255,0.3)'), opacity: lampOn ? 0.5 : 1 }} />
          <div style={glow(F.desk.x + 45, F.desk.y + 14, 34, 'rgba(159,216,176,0.24)')} />
          <div style={{ ...glow(F.desk.x + 13, F.desk.y + 18, 48, 'rgba(255,200,116,0.6)'), opacity: lampOn ? 1 : 0 }} />
          <div
            className="pointer-events-none absolute"
            style={{
              ...place(F.desk.x + 4, F.desk.y + 14, 22, 18, 904),
              clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)',
              background: 'linear-gradient(180deg, rgba(255,232,170,0.55), rgba(255,200,116,0))',
              mixBlendMode: 'screen',
              opacity: lampOn ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}
          />
          <div style={{ ...glow(F.floorLamp.x + 8, F.floorLamp.y + 8, 60, 'rgba(255,190,110,0.55)'), opacity: lampOn ? 1 : 0 }} />
          <div
            className="pointer-events-none absolute"
            style={{
              ...place(F.floorLamp.x - 8, F.floorLamp.y + 13, 36, 46, 904),
              clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)',
              background: 'linear-gradient(180deg, rgba(255,226,160,0.42), rgba(255,200,116,0.03))',
              mixBlendMode: 'screen',
              opacity: lampOn ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}
          />
          <div style={{ ...glow(F.coffee.x + 14, F.coffee.y + 8, 30, 'rgba(244,167,185,0.3)'), opacity: lampOn ? 1 : 0.5 }} />

          {/* String lights */}
          {BULB_XS.map((bx, i) => {
            const c = PALETTE_BULBS[i % PALETTE_BULBS.length];
            return (
              <div
                key={`bulb-${i}`}
                className="pointer-events-none absolute rounded-[1px]"
                style={{
                  ...place(Math.round(bx) - 1, Math.round(wireY(bx)) + 3, 3, 3, 910),
                  background: c,
                  boxShadow: `0 0 4px 2px ${c}88, 0 0 10px 4px ${c}33`,
                  animation: `twinkle ${2.4 + (i % 4) * 0.6}s ease-in-out ${(i % 5) * 0.4}s infinite`,
                }}
              />
            );
          })}

          {/* Floating dust / light motes */}
          {PARTICLES.map((p, i) => (
            <div
              key={`mote-${i}`}
              className="pointer-events-none absolute rounded-full"
              style={
                {
                  ...place(p.left, p.top, p.size, p.size, 915),
                  background: p.color,
                  boxShadow: `0 0 2px ${p.color}`,
                  animation: `floatDust ${p.dur}s linear ${p.delay}s infinite`,
                  '--dx': `${p.dx}px`,
                  '--o': lampOn ? 0.75 : 0.35,
                } as CSSProperties
              }
            />
          ))}
        </div>

        {/* ---------- Screen-space overlay (crisp, unscaled text) ---------- */}
        <div className="pointer-events-none absolute inset-0 z-[5]">
          {labelStation && (
            <div
              className="absolute whitespace-nowrap rounded-[3px] border-2 border-[#1a0f14] bg-[#2b1a24]/95 px-2 py-0.5 font-pixel text-[11px] text-gold-light shadow-[0_2px_0_#1a0f14] sm:text-xs"
              style={{
                left: STATION_GEOM[labelStation].labelAt.x * scale,
                top: STATION_GEOM[labelStation].labelAt.y * scale,
                transform: 'translate(-50%, 0)',
                animation: 'bob 1.4s ease-in-out infinite',
              }}
            >
              {stationById(labelStation).label}
              {near === labelStation && <span className="ml-2 text-rose-soft">Enter ↵</span>}
            </div>
          )}

          {!touched && (
            <div
              className="absolute whitespace-nowrap rounded-[3px] border-2 border-[#1a0f14] bg-rose-soft px-2 py-0.5 font-pixel text-[11px] text-ink shadow-[0_2px_0_#1a0f14] sm:text-xs"
              style={{ left: hero.x * scale, top: (hero.y - NASYWA_H - 12) * scale, animation: 'bob 1.2s ease-in-out infinite' }}
            >
              {portfolioData.stations[0].label} ▾
            </div>
          )}

          {/* Cat bubbles: name + one cozy line, auto-dismissing */}
          {CAT_SPOTS.map((spot) => {
            const r = reactions[spot.id];
            if (!r) return null;
            const catX = (spot.x + 7) * scale;
            const leftPx = Math.min(Math.max(catX, camX + 112), camX + Math.min(view.w, stageW) - 112);
            return (
              <div
                key={`bubble-${r.key}`}
                className="absolute"
                style={{ left: leftPx, top: (spot.y - 9) * scale, transform: 'translate(-50%, -100%)' }}
              >
                <div
                  role="status"
                  className="cozy-bubble w-max max-w-[210px] px-2.5 py-1.5 text-left"
                  style={{ animation: `bubbleIn ${REACTION_MS}ms ease forwards`, '--ax': `${catX - leftPx}px` } as CSSProperties}
                >
                  <span className="block font-pixel text-[12px] leading-none text-[#c45f86]">{CAT_INFO[spot.id].name} ♡</span>
                  <span className="mt-1 block text-[12px] leading-snug">{r.line}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!touched && (
        <p className="pointer-events-none absolute left-1/2 top-2 hidden -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-center font-pixel text-xs text-parchment/85 sm:block [@media(pointer:coarse)]:hidden">
          Click the floor to walk, or use WASD and arrow keys. Press Enter beside furniture.
        </p>
      )}

      {/* Mobile D-pad (coarse pointers only) */}
      <div className="absolute bottom-2 left-2 hidden select-none [@media(pointer:coarse)]:block" style={{ touchAction: 'none' }}>
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
          {(
            [
              ['↑', 0, -1, 'col-start-2 row-start-1', 'Move up'],
              ['←', -1, 0, 'col-start-1 row-start-2', 'Move left'],
              ['→', 1, 0, 'col-start-3 row-start-2', 'Move right'],
              ['↓', 0, 1, 'col-start-2 row-start-3', 'Move down'],
            ] as const
          ).map(([glyph, x, y, cls, label]) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              className={`pixel-btn ${cls} flex h-11 w-11 items-center justify-center rounded-[4px] bg-[#6e452f]/75 text-lg text-parchment`}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                setPad(x, y);
              }}
              onPointerUp={() => setPad(0, 0)}
              onPointerCancel={() => setPad(0, 0)}
              onLostPointerCapture={() => setPad(0, 0)}
              onContextMenu={(e) => e.preventDefault()}
            >
              {glyph}
            </button>
          ))}
          <div className="col-start-2 row-start-2 rounded-[4px] bg-[#2b1a24]/70" />
        </div>
      </div>
      <button
        type="button"
        aria-label="Interact with nearby furniture"
        onClick={() => !inputLocked && interact()}
        className="pixel-btn absolute bottom-6 right-3 hidden h-14 w-14 items-center justify-center rounded-full bg-rose-soft/90 font-pixel text-lg font-bold text-ink [@media(pointer:coarse)]:flex"
      >
        A
      </button>
    </div>
  );
}
