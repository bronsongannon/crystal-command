#!/usr/bin/env python3
"""Derive a unit's walk frames in a second colorway — no new video needed.

Usage:
  python3 recolor_walk.py <unit_type> <src_colorway> <dst_colorway>
  python3 recolor_walk.py marine teal red

The static colorway pair (unit_<type>_teal.png / unit_<type>_red.png) is
pixel-aligned — Gemini image-to-image recolors kept the sprites identical —
so every aligned opaque pixel is a (src color -> dst color) training pair.
We quantize those into a palette LUT and snap each walk-frame pixel to its
nearest source color's destination. Flat cel art makes this exact enough
that the derived frames pass for hand-recolored.

Reads  unit_<type>_walk1..8_<src>.png
Writes unit_<type>_walk1..8_<dst>.png
"""
import sys, os, glob
import numpy as np
from PIL import Image

POS_W = 60 / 256   # position weight in the match feature — color dominates,
                   # position breaks ties where two REGIONS share one color but
                   # recolor differently (rocket: charcoal pads -> white trim,
                   # charcoal launch tube -> charcoal)
TRAIN_CAP = 6000

def main():
    utype, src_cw, dst_cw = sys.argv[1], sys.argv[2], sys.argv[3]
    here = os.path.dirname(os.path.abspath(__file__))
    a = np.array(Image.open(os.path.join(here, f"unit_{utype}_{src_cw}.png")).convert("RGBA"), np.int32)
    b = np.array(Image.open(os.path.join(here, f"unit_{utype}_{dst_cw}.png")).convert("RGBA"), np.int32)
    if a.shape != b.shape:
        sys.exit("static colorway pair is not aligned — cannot build the LUT")
    H, W, _ = a.shape
    both = (a[..., 3] > 128) & (b[..., 3] > 128)
    yy, xx = np.where(both)
    src_px = a[both][:, :3].astype(np.float32)
    dst_px = b[both][:, :3].astype(np.float32)
    pos = np.stack([xx, yy], 1).astype(np.float32) * POS_W
    if len(src_px) > TRAIN_CAP:
        idx = np.random.RandomState(7).choice(len(src_px), TRAIN_CAP, replace=False)
        src_px, dst_px, pos = src_px[idx], dst_px[idx], pos[idx]
    feat_train = np.concatenate([src_px, pos], 1)
    delta = dst_px - src_px
    print(f"train: {len(feat_train)} (color+position) pairs from the static pair")
    frames = sorted(glob.glob(os.path.join(here, f"unit_{utype}_walk[1-8]_{src_cw}.png")))
    if not frames:
        sys.exit(f"no unit_{utype}_walk*_{src_cw}.png frames found")
    for f in frames:
        im = np.array(Image.open(f).convert("RGBA"), np.int32)
        h, w, _ = im.shape
        gy, gx = np.mgrid[0:h, 0:w]
        px = im[..., :3].reshape(-1, 3).astype(np.float32)
        fpos = np.stack([gx.ravel(), gy.ravel()], 1).astype(np.float32) * POS_W * (W / w)
        alpha = im[..., 3].reshape(-1)
        vis = np.where(alpha > 8)[0]
        feat = np.concatenate([px[vis], fpos[vis]], 1)
        # chunked nearest-neighbor; collect the matched pair's (dst - src) delta
        # so the video's own shading survives the recolor
        dmap = np.full((h * w, 3), np.nan, np.float32)
        for i in range(0, len(feat), 8000):
            chunk = feat[i:i + 8000]
            d = ((chunk[:, None, :] - feat_train[None, :, :]) ** 2).sum(2)
            nn = d.argmin(1)
            dmap[vis[i:i + 8000]] = delta[nn]
        # 5x5 median over the delta field: where two regions share a color and
        # the position tiebreak lands pixel-salt, the neighborhood outvotes it
        dm = dmap.reshape(h, w, 3)
        stack = []
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                stack.append(np.roll(np.roll(dm, dy, 0), dx, 1))
        dm = np.nanmedian(np.stack(stack), 0)
        dm[np.isnan(dm)] = 0
        res = im.copy()
        res[..., :3] = np.clip(px.reshape(h, w, 3) + dm, 0, 255).astype(np.int32)
        dst = f.replace(f"_{src_cw}.png", f"_{dst_cw}.png")
        Image.fromarray(res.astype(np.uint8)).save(dst)
        print("wrote", os.path.basename(dst))

if __name__ == "__main__":
    main()
