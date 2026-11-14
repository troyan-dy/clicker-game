"""The planet of the eighth screen, cut for the game out of the night Earth of the epilogue.

  python tools/earth_patches.py

Writes public/assets/img/nodes/earth_dark.webp — the planet with its lights put out (every coral square
becomes a dim one: a place for capsules nobody lies in yet) — and lit_00…lit_NN.webp: the lights around
every node of towers, each a patch that fades in when its node fills. Where the nodes stand, how the
cable runs and where every patch lies goes to src/data/layout/globe.json.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NODES = ROOT / 'public/assets/img/nodes'
# the circle of the planet in the picture
CENTER = (766, 505)
RADIUS = 483
# the regions in the order the cable reaches them: where the cable touches down and where their nodes stand.
# The first one is home: its first node is the quarter of the seventh screen and stands from the start.
REGIONS = [
    ('europe', (790, 285), [(775, 262), (850, 312)]),
    ('siberia', (1000, 225), [(1012, 240)]),
    ('eastasia', (1065, 370), [(1020, 322), (1110, 345), (1062, 440)]),
    ('southasia', (975, 455), [(900, 400), (975, 472), (1040, 500)]),
    ('australia', (1095, 675), [(1100, 690)]),
    ('southamerica', (490, 640), [(470, 560), (500, 722)]),
    ('northamerica', (455, 340), [(400, 320), (470, 392), (505, 300)]),
    ('africa', (770, 520), [(700, 450), (832, 480), (790, 650)]),
]
# between Australia and South America the cable goes round the back of the planet: along its rim, degrees clockwise from the east
RIM = (35, 150)

im = Image.open(NODES / 'earth_night.webp').convert('RGB')
a = np.asarray(im).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
warm = (r - b > 35) & (r > 95) & (r - g > 18)
# how lit a pixel is, 0..1: the edges of a square stay soft
k = np.clip((r - b - 35) / 60.0, 0, 1) * warm
dim = np.array([52, 50, 47], dtype=np.float32)
dark = (a * (1 - k[..., None]) + dim * k[..., None]).astype(np.uint8)
Image.fromarray(dark, 'RGB').save(NODES / 'earth_dark.webp', 'WEBP', quality=90, method=6)

# every light belongs to the node nearest to it
spots = [p for _, _, nodes in REGIONS for p in nodes]
ys, xs = np.mgrid[0:a.shape[0], 0:a.shape[1]]
dist = np.stack([(xs - x) ** 2 + (ys - y) ** 2 for x, y in spots])
owner = dist.argmin(axis=0)
for old in NODES.glob('lit_*.webp'):
    old.unlink()
patches = []
for i in range(len(spots)):
    alpha = np.where(owner == i, k, 0)
    rows = np.where(alpha.max(axis=1) > 0)[0]
    cols = np.where(alpha.max(axis=0) > 0)[0]
    y0, y1, x0, x1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
    rgba = np.dstack([a[y0:y1, x0:x1], alpha[y0:y1, x0:x1] * 255]).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(NODES / f'lit_{i:02d}.webp', 'WEBP', quality=88, method=6)
    patches.append({'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)})

regions = []
n = 0
for name, anchor, nodes in REGIONS:
    regions.append({'id': name, 'anchor': list(anchor), 'nodes': [{'x': x, 'y': y, 'patch': patches[n + j]} for j, (x, y) in enumerate(nodes)]})
    n += len(nodes)
out = {'size': list(im.size), 'center': list(CENTER), 'radius': RADIUS, 'rim': list(RIM), 'regions': regions}
(ROOT / 'src/data/layout/globe.json').write_text(json.dumps(out, indent=2) + '\n', encoding='utf-8', newline='\n')
print('nodes:', len(spots), 'patches:', [(p['w'], p['h']) for p in patches])
