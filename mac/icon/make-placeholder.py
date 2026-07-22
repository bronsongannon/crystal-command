#!/usr/bin/env python3
"""Compose the placeholder master.png from the game's own crystal sprite.

macOS icon-grid squircle (832px rounded rect on a 1024 transparent canvas),
deep expedition-teal radial background, glowing crystal cluster front and
center. Good enough to archive with; the real art replaces master.png.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
CRYSTAL = os.path.join(HERE, '..', '..', 'assets', 'sprites', 'crystal.png')
OUT = os.path.join(HERE, 'master.png')

S = 1024
PLATE = 832          # Apple icon-grid squircle size at 1024
RADIUS = 186         # corner radius at that size
inset = (S - PLATE) // 2

canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))

# --- squircle plate with radial gradient (deep space -> mossy teal) ---
plate = Image.new('RGBA', (PLATE, PLATE), (0, 0, 0, 0))
grad = Image.new('RGBA', (PLATE, PLATE))
cx, cy = PLATE / 2, PLATE * 0.42
maxd = math.hypot(PLATE, PLATE) / 2
top, bottom = (26, 66, 54), (7, 13, 10)
px = grad.load()
for y in range(PLATE):
    for x in range(0, PLATE, 2):          # 2px columns, plenty at icon scale
        t = min(1.0, math.hypot(x - cx, y - cy) / maxd)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,)
        px[x, y] = c
        if x + 1 < PLATE:
            px[x + 1, y] = c
mask = Image.new('L', (PLATE, PLATE), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, PLATE - 1, PLATE - 1], RADIUS, fill=255)
plate.paste(grad, (0, 0), mask)

# faint horizon grid, RTS map flavor
grid = Image.new('RGBA', (PLATE, PLATE), (0, 0, 0, 0))
gd = ImageDraw.Draw(grid)
for i in range(1, 12):
    y = int(PLATE * 0.55 + (i ** 1.6) * 14)
    if y < PLATE:
        gd.line([(0, y), (PLATE, y)], fill=(95, 220, 197, 14), width=2)
for i in range(-6, 7):
    gd.line([(PLATE / 2 + i * 60, PLATE * 0.55), (PLATE / 2 + i * 260, PLATE)],
            fill=(95, 220, 197, 10), width=2)
plate.paste(Image.composite(grid, Image.new('RGBA', grid.size, (0, 0, 0, 0)), mask), (0, 0), grid)

# --- crystal: nearest-upscale the game sprite (keeps the in-game look) ---
crystal = Image.open(CRYSTAL).convert('RGBA')
# kill the sprite's near-invisible background alpha (reads as a boxy halo once glowed)
r, g, b, a = crystal.split()
a = a.point(lambda v: 0 if v < 48 else v)
crystal = Image.merge('RGBA', (r, g, b, a))
bbox = crystal.getbbox()
crystal = crystal.crop(bbox)
target_h = int(PLATE * 0.62)
scale = target_h / crystal.height
crystal = crystal.resize((int(crystal.width * scale), target_h), Image.NEAREST)

# teal glow behind it — blurred in a padded canvas so it fades out instead of
# clipping at the crystal's bounding box (clipped blur reads as a dark rect)
PAD = 160
glow_src = Image.new('RGBA', (crystal.width + PAD * 2, crystal.height + PAD * 2), (0, 0, 0, 0))
glow_src.paste(Image.new('RGBA', crystal.size, (93, 234, 197, 255)), (PAD, PAD), crystal)
glow = glow_src.filter(ImageFilter.GaussianBlur(46))
gx = (PLATE - crystal.width) // 2
gy = int(PLATE * 0.50 - crystal.height / 2)
for _ in range(2):
    plate.alpha_composite(glow, (gx - PAD, gy - PAD))

# ground shadow ellipse
shadow = Image.new('RGBA', (PLATE, PLATE), (0, 0, 0, 0))
sw = int(crystal.width * 1.05)
sh = int(PLATE * 0.06)
sx, sy = (PLATE - sw) // 2, gy + crystal.height - sh // 2
ImageDraw.Draw(shadow).ellipse([sx, sy, sx + sw, sy + sh], fill=(0, 0, 0, 130))
plate.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)), (0, 0))

plate.alpha_composite(crystal, (gx, gy))

canvas.paste(plate, (inset, inset), mask)
canvas.save(OUT)
print(f'placeholder master written: {OUT}')
