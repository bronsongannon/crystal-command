#!/usr/bin/env python3
"""Build the AppIcon asset catalog from a 1024x1024 master.

Usage:
    python3 make-icon.py [master.png]

Reads master.png (this folder) by default, writes every required macOS size
into ../Broodfall/Assets.xcassets/AppIcon.appiconset/. Drop in a new
master (Gemini/Fiverr art) and rerun — the build picks it up automatically.
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'master.png')
ICONSET = os.path.join(HERE, '..', 'Broodfall', 'Assets.xcassets', 'AppIcon.appiconset')

SIZES = [16, 32, 128, 256, 512]

master = Image.open(MASTER).convert('RGBA')
assert master.size == (1024, 1024), f'master must be 1024x1024, got {master.size}'

os.makedirs(ICONSET, exist_ok=True)
images = []
for pt in SIZES:
    for scale in (1, 2):
        px = pt * scale
        name = f'icon_{pt}x{pt}' + ('@2x' if scale == 2 else '') + '.png'
        master.resize((px, px), Image.LANCZOS).save(os.path.join(ICONSET, name))
        images.append({
            'filename': name,
            'idiom': 'mac',
            'scale': f'{scale}x',
            'size': f'{pt}x{pt}',
        })

with open(os.path.join(ICONSET, 'Contents.json'), 'w') as f:
    json.dump({'images': images, 'info': {'author': 'xcode', 'version': 1}}, f, indent=2)

# top-level catalog Contents.json (idempotent)
catalog = os.path.join(HERE, '..', 'Broodfall', 'Assets.xcassets', 'Contents.json')
if not os.path.exists(catalog):
    with open(catalog, 'w') as f:
        json.dump({'info': {'author': 'xcode', 'version': 1}}, f, indent=2)

print(f'AppIcon.appiconset written: {len(images)} images from {os.path.basename(MASTER)}')
