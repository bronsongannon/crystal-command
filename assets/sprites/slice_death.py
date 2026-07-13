import os, math, sys
from collections import deque
from PIL import Image

SP = "/Users/bronsongannon/Desktop/mini-rts/assets/sprites"
SRC = os.path.join(SP, "Source 2")
OUT = SP

# (sheet file, unit type, colorway, death band y0..y1 at 1024 scale, gray-scrub)
SHEETS = [
    ("rocket trooper red spritesheet.png", "rocket",   "red",  828, 1015, True),
    ("marine teal spritesheet.png",        "marine",   "teal", 560, 880,  False),
    ("marine red spritesheet.png",         "marine",   "red",  560, 880,  False),
    ("dino spritesheet.png",               "spitter",  "teal", 600, 980,  False),
    ("dino bone spritesheet.png",          "spitter",  "wild", 600, 980,  False),
]

FLOOD_TOL = 60      # bg flood-fill tolerance (dark outlines protect sprite interiors)
POCKET_TOL = 22     # enclosed bg-pocket color key
MIN_GAP = 14        # x-projection gap that separates frames (1024 scale)
COMP_KEEP = 0.04    # keep components >= 4% of the largest (keeps dropped gear, kills text)


def dist(a, b):
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)


def flood_bg(img):
    w, h = img.size
    px = img.load()
    # bg reference = average of the four corners
    corners = [px[0, 0], px[w-1, 0], px[0, h-1], px[w-1, h-1]]
    ref = tuple(sum(c[i] for c in corners)//4 for i in range(3))
    seen = [[False]*w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h-1))
    for y in range(h):
        q.append((0, y)); q.append((w-1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            continue
        seen[y][x] = True
        c = px[x, y]
        if dist(c[:3], ref) > FLOOD_TOL:
            continue
        px[x, y] = (0, 0, 0, 0)
        q.append((x+1, y)); q.append((x-1, y)); q.append((x, y+1)); q.append((x, y-1))
    return ref


def gray_scrub(img):
    # kill low-saturation mid-gray (grid lines, ground shading); spares cream (lum > .88),
    # charcoal (lum < .55) and bone hide (sat .23 > cutoff .12)
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if not c[3]:
                continue
            mx, mn = max(c[:3]), min(c[:3])
            sat = 0 if mx == 0 else (mx-mn)/mx
            lum = (0.299*c[0] + 0.587*c[1] + 0.114*c[2]) / 255
            if sat < 0.12 and 0.55 <= lum <= 0.88:
                px[x, y] = (0, 0, 0, 0)
                n += 1
    return n


def key_pockets(img, ref, tol):
    px = img.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c[3] and dist(c[:3], ref) < tol:
                px[x, y] = (0, 0, 0, 0)
                n += 1
    return n


def segments_x(img, y0, y1, min_gap):
    px = img.load()
    w = img.size[0]
    cols = [0]*w
    for x in range(w):
        n = 0
        for y in range(y0, y1):
            if px[x, y][3]:
                n += 1
        cols[x] = n
    segs, start, gap = [], None, 0
    for x in range(w):
        if cols[x] >= 3:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                segs.append((start, x-gap+1)); start = None
    if start is not None:
        segs.append((start, w))
    # drop dust segments (watermark sparkles, stray specks) before merging
    segs = [sg for sg in segs if sum(cols[x] for x in range(sg[0], sg[1])) >= 500]
    # merge closest neighbours until 4 remain
    while len(segs) > 4:
        gaps = [(segs[i+1][0]-segs[i][1], i) for i in range(len(segs)-1)]
        _, i = min(gaps)
        segs[i] = (segs[i][0], segs[i+1][1]); del segs[i+1]
    return segs


def components(img):
    px = img.load()
    w, h = img.size
    lab = [[0]*w for _ in range(h)]
    comps = []
    for yy in range(h):
        for xx in range(w):
            if px[xx, yy][3] and not lab[yy][xx]:
                cid = len(comps)+1
                q = deque([(xx, yy)])
                lab[yy][xx] = cid
                pts = []
                while q:
                    x, y = q.popleft()
                    pts.append((x, y))
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] and not lab[ny][nx]:
                            lab[ny][nx] = cid
                            q.append((nx, ny))
                comps.append(pts)
    return comps


def opaque_area(img):
    px = img.load()
    return sum(1 for y in range(img.size[1]) for x in range(img.size[0]) if px[x, y][3] > 8)


def target_area(unit, cw):
    p = os.path.join(SP, f"unit_{unit}_{cw}.png")
    ref = Image.open(p).convert("RGBA")
    if max(ref.size) != 256:
        ref = ref.resize((256, 256), Image.LANCZOS)
    return opaque_area(ref)


if __name__ == "__main__":
    for fname, unit, cw, by0, by1, scrub in SHEETS:
        sheet = Image.open(os.path.join(SRC, fname)).convert("RGBA")
        W, H = sheet.size
        s = H / 1024
        y0, y1 = int(by0*s), int(by1*s)
        ref = flood_bg(sheet)
        if scrub:
            gray_scrub(sheet)
        key_pockets(sheet, ref, POCKET_TOL)
        segs = segments_x(sheet, y0, y1, max(6, int(MIN_GAP*s)))
        if len(segs) != 4:
            print(f"!! {fname}: got {len(segs)} segments {segs}"); continue
        tgt = target_area(unit, cw)
        for i, (sx0, sx1) in enumerate(segs, 1):
            frame = sheet.crop((sx0, y0, sx1, y1))
            comps = components(frame)
            big = max(len(c) for c in comps)
            keep = [c for c in comps if len(c) >= big*COMP_KEEP]
            clean = Image.new("RGBA", frame.size, (0, 0, 0, 0))
            fp, cp = frame.load(), clean.load()
            for c in keep:
                for x, y in c:
                    cp[x, y] = fp[x, y]
            bbox = clean.getbbox()
            clean = clean.crop(bbox)
            area = opaque_area(clean)
            k = math.sqrt(tgt/area)
            nw, nh = max(1, round(clean.size[0]*k)), max(1, round(clean.size[1]*k))
            if max(nw, nh) > 256:
                f = 256/max(nw, nh); nw, nh = round(nw*f), round(nh*f)
            clean = clean.resize((nw, nh), Image.LANCZOS)
            canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
            canvas.paste(clean, ((256-nw)//2, (256-nh)//2))
            out = os.path.join(OUT, f"unit_{unit}_death{i}_{cw}.png")
            canvas.save(out)
            print(f"{fname} [{i}] -> {os.path.basename(out)}  comps {len(comps)}->{len(keep)}  area {area} tgt {tgt} scale {k:.2f}")
