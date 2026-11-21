/**
 * Hand-authored pixel maps. Each character in a row is one pixel; '.' is transparent.
 * Rows are normalised to the sprite width, so maps stay easy to edit by hand.
 */

export type PixelMap = string[];
export type Palette = Record<string, string>;

export interface SpriteDef {
  w: number;
  h: number;
  rows: PixelMap;
  palette: Palette;
}

const norm = (rows: PixelMap, w: number): PixelMap => rows.map((r) => r.padEnd(w, '.').slice(0, w));
const flipH = (rows: PixelMap): PixelMap => rows.map((r) => r.split('').reverse().join(''));

/** Arm swing: raise the hand in the given columns by one pixel (the sleeve fills in below). */
function liftHand(rows: PixelMap, c0: number, c1: number, handRow: number): PixelMap {
  const out = rows.map((r) => r.split(''));
  for (let c = c0; c <= c1; c++) {
    if (rows[handRow][c] === '.') continue;
    out[handRow - 1][c] = rows[handRow][c];
    out[handRow][c] = rows[handRow + 1]?.[c] ?? '.';
  }
  return out.map((r) => r.join(''));
}

function replaceAt(rows: PixelMap, edits: [number, number, string][]): PixelMap {
  const out = rows.map((r) => r.split(''));
  edits.forEach(([r, c, ch]) => (out[r][c] = ch));
  return out.map((r) => r.join(''));
}

/* ------------------------------------------------------------------ */
/* Nasywa — 16 x 32, slim RPG chibi in a cozy-chic outfit               */
/* ------------------------------------------------------------------ */
/*
 * Outfit: soft blush-pink pashmina with a loose wrap and relaxed drape, sleek mocha over-ear headphones
 * with rose-gold rings, a cream chunky-knit cardigan worn open over a dark
 * botanical-print top, a brown belt with a small gold buckle, wide-leg dark
 * denim and dark brown ankle boots.
 */

export const NASYWA_W = 16;
export const NASYWA_H = 32;

export const NASYWA_PALETTE: Palette = {
  K: '#2b1a24', // outline
  H: '#3a3238', // headphone band
  h: '#6a5e66', // band highlight
  G: '#4a3f46', // headphone cup
  g: '#9b8792', // sleek cup sheen
  P: '#f4b3c2', // blush-pink pashmina
  p: '#e092a8', // pashmina shadow
  q: '#c9768f', // pashmina fold
  L: '#ffe1e8', // pashmina highlight
  S: '#f7d3b6', // skin
  s: '#e8b496', // skin shadow
  E: '#3a2629', // eye (warm charcoal)
  e: '#8a5a42', // iris (warm brown, soft catchlight)
  W: '#fff6ee', // subtle eye highlight
  B: '#f7b0bd', // gentle blush
  M: '#c7707f', // mouth
  C: '#f3e8d6', // cream knit cardigan
  V: '#e9dcc5', // knit texture
  c: '#cbb796', // cardigan shadow
  F: '#2f3a33', // botanical top (dark)
  f: '#e88aa5', // tiny flower
  v: '#8fae8b', // tiny leaf
  Y: '#6b4430', // belt
  Z: '#f2c14e', // gold buckle
  D: '#2f3f5c', // dark denim
  d: '#243049', // denim shadow
  n: '#4d6187', // denim seam highlight
  O: '#4a2c20', // ankle boots
  o: '#7a4e38', // boot highlight
};

/** Front: asymmetric pashmina — the long end falls over her left shoulder, the other is tucked behind. */
const FRONT_UPPER: PixelMap = [
  '.....KKKKKK.....',
  '....KHhhhhHK....',
  '...KHKKKKKKHK...',
  '..KHKPPLLPPKHK..',
  '..KHPLLLPPPPHK..',
  '.KGgPPPPPPPPgGK.',
  '.KGgPPpSSpPPgGK.',
  '.KGgPpSSSSpPgGK.',
  '.KGgPSESSESPgGK.',
  '.KGgPSeSSeSPgGK.',
  '..KGPBSSSSBPGK..',
  '..KPPpSSMMpPPK..',
  '..KPPPpsspPPPK..',
  '..KPPPPqqPPPPK..',
  '.KPPLPqPPPqPPPK.',
  '.KCPPLqPPPqPPCK.',
  '.KCVPLPPqPPpVCK.',
  '.KCcPLPpFFFqcCK.',
  '.KCcPLpFfFFFVCK.',
  '.KCcPpFFvFfFcCK.',
  '.KScqFfFFFvFcSK.',
  '..KcYYYZZYYYcK..',
  '..KcVDDDDDDVcK..',
  '..KcVDDDDDDVcK..',
  '...KcDDddDDcK...',
];

const BACK_UPPER: PixelMap = [
  '.....KKKKKK.....',
  '....KHhhhhHK....',
  '...KHKKKKKKHK...',
  '..KHKPPPPPPKHK..',
  '..KHPPPLLPPPHK..',
  '.KGgPPPPPPPPgGK.',
  '.KGgPPPLLPPPgGK.',
  '.KGgPpPPPPpPgGK.',
  '.KGgPPpPPpPPgGK.',
  '.KGgPPPppPPPgGK.',
  '..KGPPPPPPPPGK..',
  '..KPPPpPPpPPPK..',
  '..KPPPPppPPPPK..',
  '.KPPpPPPPPPpPPK.',
  '.KCPPpPPPPpPPCK.',
  '.KCPPPpPPpPPPCK.',
  '.KCVPPPppPPPVCK.',
  '.KCcPPPPPPPPcCK.',
  '.KCcVqPPPPqVcCK.',
  '.KCcCVqqqqVCcCK.',
  '.KScCVCVVCVCcSK.',
  '..KcYYYYYYYYcK..',
  '..KcCVCVVCVCcK..',
  '..KcCCVCCVCCcK..',
  '...KcCCccCCcK...',
];

const SIDE_UPPER: PixelMap = [
  '.....KKKK.......',
  '....KHhhhK......',
  '...KHKKKKHK.....',
  '...KHPPPLLK.....',
  '..KPHPPPPLLK....',
  '..KPHPPPPPPK....',
  '..KPGGgPPpSSK...',
  '..KGGGgPpSSSK...',
  '..KGGGgPpSESK...',
  '..KPGGgPPSeSK...',
  '..KPPPPPPBSSK...',
  '..KPPPPPpSMK....',
  '...KPPPPqssK....',
  '...KPPPqPPPK....',
  '..KPPPqPPPPPK...',
  '..KCPqPPPPPPPK..',
  '..KCCVPPPqPPPK..',
  '..KCcCVFFPPPK...',
  '..KCcCVFfPPK....',
  '..KCcCVFvPqK....',
  '..KCSCVFfqK.....',
  '..KCcYYYZK......',
  '..KCcVDDDK......',
  '..KCcVDDDK......',
  '...KcCDDDK......',
];

const LEGS_FRONT_IDLE = norm(
  ['...KDDnDDnDDK...', '...KDDnKKnDDK...', '..KDDDnKKnDDDK..', '..KDDDnKKnDDDK..', '..KdDDdKKdDDdK..', '...KOoK..KoOK...', '...KKKK..KKKK...'],
  16,
);
const LEGS_FRONT_STEP = norm(
  ['...KDDnDDnDDK...', '...KDDnKKnDDK...', '..KDDDnKKnDDDK..', '..KdDDdKKnDDDK..', '..KOoOKKdDDdK...', '..KKKKK.KOoOK...', '........KKKKK...'],
  16,
);

const LEGS_SIDE_IDLE = norm(
  ['...KDDnDDK......', '...KDDnDDK......', '...KDDnDDDK.....', '..KDDDnDDDK.....', '..KdDDdDDdK.....', '...KOoOOOK......', '...KKKKKKK......'],
  16,
);
const LEGS_SIDE_STRIDE = norm(
  ['...KDDnDDDK.....', '..KDDnKDDDDK....', '..KDDK.KDDDK....', '.KDDDK..KDDDK...', '.KdDdK..KdDDdK..', '.KOoK....KOoOOK.', '.KKK.....KKKKKK.'],
  16,
);
const LEGS_SIDE_PASS = norm(
  ['...KDDnDDK......', '...KDDnDDK......', '...KDDnKDDK.....', '..KDDDKKDDK.....', '..KdDdKKdDK.....', '..KOoOKKOOK.....', '..KKKKKKKKK.....'],
  16,
);

export type Facing = 'down' | 'up' | 'side';
/** 0 idle, 1 first step, 2 passing, 3 second step */
export type WalkFrame = 0 | 1 | 2 | 3;

const HAND_ROW = 20;

export function nasywaFrame(facing: Facing, frame: WalkFrame, blink = false): SpriteDef {
  let upper: PixelMap;
  let legs: PixelMap;
  if (facing === 'side') {
    upper = SIDE_UPPER;
    legs = frame === 0 ? LEGS_SIDE_IDLE : frame === 1 || frame === 3 ? LEGS_SIDE_STRIDE : LEGS_SIDE_PASS;
    if (frame === 1) upper = liftHand(upper, 3, 5, HAND_ROW);
    if (blink) upper = replaceAt(upper, [[8, 10, 'S'], [9, 10, 'E']]);
  } else {
    upper = facing === 'down' ? FRONT_UPPER : BACK_UPPER;
    legs = frame === 0 || frame === 2 ? LEGS_FRONT_IDLE : frame === 1 ? LEGS_FRONT_STEP : flipH(LEGS_FRONT_STEP);
    // The opposite hand swings up with each step.
    if (frame === 1) upper = liftHand(upper, 13, 15, HAND_ROW);
    if (frame === 3) upper = liftHand(upper, 0, 2, HAND_ROW);
    if (blink && facing === 'down') {
      // Soft closed eyes: a single low lash line.
      upper = replaceAt(upper, [
        [8, 6, 'S'],
        [8, 9, 'S'],
        [9, 6, 'E'],
        [9, 9, 'E'],
      ]);
    }
  }
  return { w: NASYWA_W, h: NASYWA_H, rows: [...upper, ...legs], palette: NASYWA_PALETTE };
}

/* ------------------------------------------------------------------ */
/* Nasywa — 32 x 32 dialog portrait (bust)                             */
/* ------------------------------------------------------------------ */

/** 32x32 bust: soft pashmina wrap, small warm eyes with a catchlight, relaxed smile. */
const PORTRAIT_ROWS: PixelMap = [
  '..........KKKKKKKKKKKK..........',
  '........KKHHhhhhhhhhHHKK........',
  '.......KHHKKKKKKKKKKKKHHK.......',
  '......KHHKPPPPLLLLPPPPKHHK......',
  '.....KHHKPPPLLLLLLLLPPPKHHK.....',
  '....KHHKPPPPPPLLLLPPPPPPKHHK....',
  '....KGGKPPPPPPPPPPPPPPPPKGGK....',
  '...KGGgKPPPPPPPPPPPPPPPPKgGGK...',
  '...KGGgPPPPPPpSSSSpPPPPPPgGGK...',
  '...KGGgPPPPPpSSSSSSpPPPPPgGGK...',
  '...KGGgPPPPpSSSSSSSSpPPPPgGGK...',
  '...KGGgPPPPSSSSSSSSSSPPPPgGGK...',
  '...KGGgPPPPSKKSSSSKKSPPPPgGGK...',
  '...KGGgPPPPSWESSSSWESPPPPgGGK...',
  '...KGGGPPPPSeeSSSSeeSPPPPGGGK...',
  '...KGGGPPPPBBSSSSSSBBPPPPGGGK...',
  '....KGGPPPPpSSSSSSSSpPPPPGGK....',
  '.....KKPPPPpSSSMMsSSpPPPPKK.....',
  '......KPPPPPpsSSSSspPPPPPK......',
  '.....KPPPPPPPpsssspPPPPPPPK.....',
  '....KPPPPPPPPqqqqqqPPPPPPPPK....',
  '...KPPPPPPqqPPPPPPPPqqPPPPPPK...',
  '..KCCPPLPqPPPPPPPPPPPPqPPPPCCK..',
  '.KCCVCPLPPPPpPPPPPPPPPPqPPCVCCK.',
  '.KCVCCPLPPPPPqFFFFFFpPPPqPCCVCK.',
  'KCCVCCPLPPPPPpFfFFvFFFqPPPCVCCVK',
  'KCVCCVPLPPPPpFFFFfFFvFFqPPCCVCCK',
  'KCCVCCPLPPPPFFvFFFFFFfFFqPCVCVCK',
  'KCVCCVPLPPPpFfFFFFvFFFFFFcCCVCCK',
  'KCCVCcPLPPPFFFFvFFfFFFFvFVcCCVCK',
  'KCVCCcPpPPpFfFFFFFFFvFFFFVcCVCCK',
  'KCCVCcqPPqFFFvFFfFFFFFFfFVcCCVCK',
];

export const NASYWA_PORTRAIT: SpriteDef = { w: 32, h: 32, rows: PORTRAIT_ROWS, palette: NASYWA_PALETTE };

/* ------------------------------------------------------------------ */
/* Sleeping cats — 15 x 8 curled loaf, plus a reaction frame           */
/* ------------------------------------------------------------------ */

const CAT_SLEEP = norm(
  [
    '.K.K...........',
    'KAKAK..KKKKK...',
    'KAAAAKKBAABAKK.',
    'KAKKAAAAABAABAK',
    'KWWAAAABAABAAAK',
    '.KCXCAAAAAAAAAK',
    '..KTTTTTTAAABK.',
    '...KKKKKKKKKK..',
  ],
  15,
);

/** Ears perk, one sleepy eye peeks open, tail tip flicks up. */
const CAT_TWITCH = norm(
  [
    'K...K..........',
    'KAKAK..KKKKK..K',
    'KAAAAKKBAABAKKT',
    'KAEKAAAAABAABAK',
    'KWWAAAABAABAAAK',
    '.KCXCAAAAAAAAAK',
    '..KTTTTTTAAABK.',
    '...KKKKKKKKKK..',
  ],
  15,
);

export type CatId = 'kishi' | 'nining' | 'miu';

function catSprites(p: Palette) {
  const palette = { K: '#2a1a1f', ...p };
  return {
    sleep: { w: 15, h: 8, rows: CAT_SLEEP, palette } as SpriteDef,
    twitch: { w: 15, h: 8, rows: CAT_TWITCH, palette } as SpriteDef,
  };
}

export const CAT_SPRITES: Record<CatId, { sleep: SpriteDef; twitch: SpriteDef }> = {
  kishi: catSprites({ A: '#fbf3e6', B: '#e8873a', W: '#ffffff', T: '#e8873a', C: '#fbf3e6', X: '#fbf3e6', E: '#e3a43b' }),
  nining: catSprites({ A: '#e98b3a', B: '#b85a1f', W: '#f6c08a', T: '#c96a28', C: '#d62e3c', X: '#d62e3c', E: '#6fbf73' }),
  miu: catSprites({ A: '#7a5a44', B: '#4a4550', W: '#b08a66', T: '#5d4436', C: '#2ec4b6', X: '#f2c14e', E: '#e6d35a' }),
};

/** A tiny pixel heart for the cat easter egg. */
export const HEART: SpriteDef = {
  w: 7,
  h: 6,
  rows: ['.RR.RR.', 'RLRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
  palette: { R: '#f2678a', L: '#ffd3de' },
};

/** Four-point sparkle mote. */
export const SPARKLE: SpriteDef = {
  w: 5,
  h: 5,
  rows: ['..Y..', '..W..', 'YWWWY', '..W..', '..Y..'],
  palette: { Y: '#ffe08a', W: '#ffffff' },
};

export const ZED: SpriteDef = {
  w: 4,
  h: 4,
  rows: ['ZZZZ', '..Z.', '.Z..', 'ZZZZ'],
  palette: { Z: '#fff1e0' },
};
