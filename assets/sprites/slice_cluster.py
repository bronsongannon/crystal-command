import os, math
from PIL import Image
from slice_death import (flood_bg, key_pockets, components, opaque_area,
                         target_area, POCKET_TOL, SRC, OUT)

CASES = [
    ("marine teal spritesheet.png", "marine",  "teal", 560, 880),
    ("marine red spritesheet.png",  "marine",  "red",  560, 880),
    ("dino spritesheet.png",        "spitter", "teal", 600, 980),
    ("dino bone spritesheet.png",   "spitter", "wild", 600, 980),
]
MIN_COMP = 400      # px: keeps dropped rifles/gear, drops dust
CLUSTER_KEEP = 0.06 # inside a frame cluster, keep comps >= 6% of its largest


def lum(c):
    return (0.299*c[0] + 0.587*c[1] + 0.114*c[2]) / 255


for fname, unit, cw, by0, by1 in CASES:
    sheet = Image.open(os.path.join(SRC, fname)).convert("RGBA")
    H = sheet.size[1]; s = H/1024
    y0, y1 = int(by0*s), int(by1*s)
    ref = flood_bg(sheet)
    key_pockets(sheet, ref, POCKET_TOL)
    band = sheet.crop((0, y0, sheet.size[0], y1))
    bp = band.load()
    comps = [c for c in components(band) if len(c) >= MIN_COMP*s*s]
    # drop small near-white comps (Gemini sparkle watermark)
    def mean_lum(c):
        t = [0, 0, 0]
        for x, y in c[::max(1, len(c)//200)]:
            p = bp[x, y]
            for i in range(3):
                t[i] += p[i]
        n = len(c[::max(1, len(c)//200)])
        return lum((t[0]/n, t[1]/n, t[2]/n))
    comps = [c for c in comps if not (len(c) < 2500*s*s and mean_lum(c) > 0.92)]
    centers = sorted(range(len(comps)), key=lambda i: sum(p[0] for p in comps[i])/len(comps[i]))
    xs = [sum(p[0] for p in comps[i])/len(comps[i]) for i in centers]
    gaps = sorted(range(len(xs)-1), key=lambda i: xs[i+1]-xs[i], reverse=True)[:3]
    cuts = sorted(gaps)
    clusters, cur = [], []
    for idx in range(len(centers)):
        cur.append(comps[centers[idx]])
        if idx in cuts:
            clusters.append(cur); cur = []
    clusters.append(cur)
    if len(clusters) != 4:
        print(f"!! {fname}: {len(clusters)} clusters"); continue
    tgt = target_area(unit, cw)
    for i, cl in enumerate(clusters, 1):
        big = max(len(c) for c in cl)
        cl = [c for c in cl if len(c) >= big*CLUSTER_KEEP]
        frame = Image.new("RGBA", band.size, (0, 0, 0, 0))
        fp = frame.load()
        for c in cl:
            for x, y in c:
                fp[x, y] = bp[x, y]
        frame = frame.crop(frame.getbbox())
        area = opaque_area(frame)
        k = math.sqrt(tgt/area)
        nw, nh = max(1, round(frame.size[0]*k)), max(1, round(frame.size[1]*k))
        if max(nw, nh) > 256:
            f = 256/max(nw, nh); nw, nh = round(nw*f), round(nh*f)
        frame = frame.resize((nw, nh), Image.LANCZOS)
        canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        canvas.paste(frame, ((256-nw)//2, (256-nh)//2))
        out = os.path.join(OUT, f"unit_{unit}_death{i}_{cw}.png")
        canvas.save(out)
        print(f"{fname} [{i}] -> {os.path.basename(out)}  parts {len(cl)}  area {area} tgt {tgt} scale {k:.2f}")
