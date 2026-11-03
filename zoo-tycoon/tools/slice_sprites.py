"""Cut sprite sheets (white background) into trimmed transparent frames and pack one atlas per sheet."""
# Usage (from zoo-tycoon/): python3 tools/slice_sprites.py art assets
# Then paste assets/manifest.json into the ATLAS constant in index.html.
import sys, json
import numpy as np
from PIL import Image, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
SENT = (255, 0, 255)

def cutout(cell):
    """Flood-fill the white background from the border; return RGBA with soft edges."""
    pad = Image.new('RGB', (cell.width + 4, cell.height + 4), (255, 255, 255))
    pad.paste(cell, (2, 2))
    ImageDraw.floodfill(pad, (0, 0), SENT, thresh=60)
    a = np.asarray(pad).astype(np.int16)[2:-2, 2:-2]
    bg = (a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255)
    rgb = np.asarray(cell).astype(np.int16)
    alpha = np.where(bg, 0, 255).astype(np.int16)
    # soften the fringe: light pixels touching the background get partial alpha
    near = np.zeros_like(bg)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        near |= np.roll(np.roll(bg, dy, 0), dx, 1)
    light = rgb.min(axis=2)
    fringe = (~bg) & near & (light > 200)
    alpha[fringe] = np.clip((255 - light[fringe]) * 4, 40, 255)
    rgb[bg] = 255
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def trim(im, min_px=60):
    a = np.asarray(im)[..., 3] > 30
    # ignore tiny specks: keep rows/cols with a few solid pixels
    ys = np.where(a.sum(1) > 2)[0]; xs = np.where(a.sum(0) > 2)[0]
    return im.crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))

def run(sheet, name, rows, cols, scale, row_names, cells_override=None):
    im = Image.open(f'{SRC}/{sheet}').convert('RGB')
    W, H = im.size
    frames, groups = [], {}
    for r in range(rows):
        for c in range(cols):
            box = (round(c * W / cols), round(r * H / rows), round((c + 1) * W / cols), round((r + 1) * H / rows))
            f = trim(cutout(im.crop(box)))
            f = f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS)
            frames.append(f); groups.setdefault(row_names[r], []).append(len(frames) - 1)
    # pack in rows
    pad = 2; maxw = 1024; x = y = rowh = 0; rects = []
    for f in frames:
        if x + f.width + pad > maxw: x = 0; y += rowh + pad; rowh = 0
        rects.append([x, y, f.width, f.height]); x += f.width + pad; rowh = max(rowh, f.height)
    atlas = Image.new('RGBA', (maxw, y + rowh), (0, 0, 0, 0))
    for f, (fx, fy, _, _) in zip(frames, rects): atlas.paste(f, (fx, fy))
    atlas.save(f'{OUT}/{name}.webp', 'WEBP', quality=90, method=6)
    return {g: [rects[i] for i in idx] for g, idx in groups.items()}

man = {}
man['keeper'] = run('keeper-sheet.webp', 'keeper', 4, 4, 0.34, ['down', 'left', 'right', 'tools'])
man['babypanda'] = run('babypanda-sheet.webp', 'babypanda', 3, 3, 0.26, ['a', 'b', 'c'])
man['savanna'] = run('giraffe-lion-sheet.webp', 'savanna', 2, 6, 0.36, ['giraffe', 'lion'])
man['jungle'] = run('monkey-zebra-sheet.webp', 'jungle', 2, 6, 0.36, ['monkey', 'zebra'])

# ground textures from the tile sheet (inner crops, used as repeating patterns)
t = Image.open(f'{SRC}/tiles-sheet.webp').convert('RGB')
crops = { 'grass': (30, 30, 370, 350), 'sand': (430, 30, 750, 350) }
from PIL import ImageOps
for k, b in crops.items():
    c = t.crop(b)
    if k in ('grass', 'sand'):  # mirror into a 2x2 block so the edges match when it repeats
        m = Image.new('RGB', (c.width * 2, c.height * 2))
        m.paste(c, (0, 0)); m.paste(ImageOps.mirror(c), (c.width, 0))
        m.paste(ImageOps.flip(c), (0, c.height)); m.paste(ImageOps.flip(ImageOps.mirror(c)), (c.width, c.height))
        c = m
    c.save(f'{OUT}/tex-{k}.webp', 'WEBP', quality=88)
# pen floors: one scene per pen, cut where the tile sheet has no animal painted in
floors = { 'savanna': (12, 392, 388, 734), 'ice': (1182, 118, 1402, 318), 'jungle': (1578, 12, 1822, 234),
           'dirt': (1182, 566, 1382, 748), 'bamboo': (1578, 392, 1732, 532), 'meadow': (20, 20, 380, 345) }
for k, b in floors.items():
    t.crop(b).resize((264, 240), Image.LANCZOS).save(f'{OUT}/floor-{k}.webp', 'WEBP', quality=86)
json.dump(man, open(f'{OUT}/manifest.json', 'w'))
print(json.dumps({k: {g: len(v) for g, v in d.items()} for k, d in man.items()}))
