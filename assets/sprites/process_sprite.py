"""Turn a raw Gemini sprite into a game-ready colorway PNG.

Usage:  python3 assets/sprites/process_sprite.py "raw.png" unit_medic_teal.png
Steps: flood-fill the solid background to transparent (from the borders, so
off-white details inside the sprite survive), drop floating islands like
watermarks, crop to the sprite bounds, pad square, resize to 256.
"""
import sys, os
from collections import deque
from PIL import Image

SIZE = 256
TOL = 34          # background match tolerance
MARGIN = 6        # transparent margin kept around the crop, px (pre-resize scale ~1024)

def close(a, b, tol=TOL):
    return abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol and abs(a[2] - b[2]) <= tol

def process(src, dst):
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    px = im.load()
    # background color = median-ish of the four corners
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = corners[0]
    # flood fill from every border pixel that matches the background
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if close(px[x, y], bg): q.append((x, y)); seen[y * w + x] = 1
    for y in range(h):
        for x in (0, w - 1):
            if close(px[x, y], bg) and not seen[y * w + x]: q.append((x, y)); seen[y * w + x] = 1
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and close(px[nx, ny], bg):
                seen[ny * w + nx] = 1
                q.append((nx, ny))
    # keep only the largest opaque component (kills watermarks/specks)
    comp = [0] * (w * h)
    sizes = {0: 0}
    cid = 0
    for yy in range(h):
        for xx in range(w):
            i = yy * w + xx
            if comp[i] or px[xx, yy][3] == 0: continue
            cid += 1
            sizes[cid] = 0
            dq = deque([(xx, yy)])
            comp[i] = cid
            while dq:
                x, y = dq.popleft()
                sizes[cid] += 1
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    j = ny * w + nx
                    if 0 <= nx < w and 0 <= ny < h and not comp[j] and px[nx, ny][3] > 0:
                        comp[j] = cid
                        dq.append((nx, ny))
    if cid > 1:
        keep = max(sizes, key=lambda k: sizes[k] if k else -1)
        for yy in range(h):
            for xx in range(w):
                c = comp[yy * w + xx]
                if c and c != keep:
                    px[xx, yy] = (0, 0, 0, 0)
    # crop to content + margin, pad to square, resize
    bbox = im.getbbox()
    if not bbox:
        raise SystemExit('nothing left after background removal — check the input')
    l, t, r, b = bbox
    l = max(0, l - MARGIN); t = max(0, t - MARGIN)
    r = min(w, r + MARGIN); b = min(h, b + MARGIN)
    im = im.crop((l, t, r, b))
    cw, ch = im.size
    side = max(cw, ch)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - cw) // 2, (side - ch) // 2))
    sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
    sq.save(dst)
    print('%s -> %s  (cropped %dx%d of %dx%d, %d islands removed)'
          % (os.path.basename(src), os.path.basename(dst), cw, ch, w, h, max(0, cid - 1)))

if __name__ == '__main__':
    process(sys.argv[1], sys.argv[2])
