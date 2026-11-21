"""Generates the blossom cursor PNGs (32x32) and prints matching SVG data URIs.

Run:  python3 scripts/make_cursors.py   (requires Pillow)
"""
from pathlib import Path
from urllib.parse import quote
from PIL import Image

PAL = {
    'K': (46, 34, 30, 255),     # outline
    'G': (143, 174, 139, 255),  # sage
    'g': (109, 143, 106, 255),  # sage shadow
    'L': (196, 220, 186, 255),  # sage highlight
    'B': (122, 82, 56, 255),    # branch
    'b': (92, 60, 40, 255),     # branch dark
    'P': (242, 143, 170, 255),  # blossom pink
    'p': (255, 211, 222, 255),  # blossom light
    'Y': (255, 214, 120, 255),  # blossom centre
    'W': (255, 255, 255, 255),  # sparkle
}

DEFAULT = [
    "K...............",
    "KK..............",
    "KLK.............",
    "KLGK...p........",
    "KLGGK.pPp.......",
    "KLGGGKbPB.......",
    "KLGGGGK.BB.P....",
    "KLGGGGGK..BPp...",
    "KLGGGGGgK..B....",
    "KLGGGgKKKK..Pp..",
    "KLGKGgK.....p...",
    "KGK.KGgK........",
    "KK..KGgK........",
    "K....KGgK.......",
    ".....KgGK.......",
    "......KK........",
]

POINTER = [
    "K...........W...",
    "KK.........WWW..",
    "KLK.....p...W...",
    "KLLK...pPp......",
    "KLGLK.pPYPp.....",
    "KLGGLKbPPpB.....",
    "KLGGGLK.BB.pPp..",
    "KLGGGGLK..BPYP..",
    "KLGGGGGgK..BpP..",
    "KLGGGgKKKK..pPp.",
    "KLGKGgK....pPYP.",
    "KGK.KGgK....pPp.",
    "KK..KGgK........",
    "K....KGgK.......",
    ".....KgGK.......",
    "......KK........",
]

def to_png(rows, path, scale=2):
    img = Image.new('RGBA', (16 * scale, 16 * scale), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in PAL:
                for dy in range(scale):
                    for dx in range(scale):
                        px[x * scale + dx, y * scale + dy] = PAL[ch]
    img.save(path)

def to_svg(rows):
    rects = []
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in PAL:
                r, g, b, _ = PAL[ch]
                rects.append(f"<rect x='{x*2}' y='{y*2}' width='2' height='2' fill='#{r:02x}{g:02x}{b:02x}'/>")
    svg = "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' shape-rendering='crispEdges'>" + ''.join(rects) + "</svg>"
    return "data:image/svg+xml," + quote(svg, safe="=:/'#, ")

if __name__ == '__main__':
    out = Path(__file__).resolve().parent.parent / 'public' / 'images'
    out.mkdir(parents=True, exist_ok=True)
    to_png(DEFAULT, out / 'cursor-blossom.png')
    to_png(POINTER, out / 'cursor-blossom-pointer.png')
    Path('/tmp/cursor_default.txt').write_text(to_svg(DEFAULT))
    Path('/tmp/cursor_pointer.txt').write_text(to_svg(POINTER))
    print('cursors written to', out)
