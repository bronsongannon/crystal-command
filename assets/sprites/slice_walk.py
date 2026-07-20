#!/usr/bin/env python3
"""Slice an AI-generated walk-in-place video into game walk-cycle frames.

Usage:
  python3 slice_walk.py <video> <unit_type> <colorway> [nframes]
  python3 slice_walk.py walk.mp4 marine teal 8

Expects the video spec from the art pipeline: straight top-down, camera
locked, character walking IN PLACE facing up, flat uniform background
(DaVinci/Runway/Kling all comply when asked). Output:
  unit_<type>_walk1..N_<cw>.png   (256px, transparent, area-normalized
                                   to the unit's static colorway sprite)

Pipeline per frame:
  1. bg + ground-shadow removal by border BFS: walk from the frame edge
     through any pixel that is background-colored OR shadow-like (low
     saturation, mid-dark luminance). The character's near-black outline
     (lum < LUM_OUTLINE) blocks the flood, so interior grays (gun barrel)
     survive even though they match the shadow band exactly.
  2. stride detection: per-frame difference of the leg band vs frame 0
     gives a periodic signal; the loop picks one full cycle and samples
     N frames evenly across it.
  3. all frames share ONE union crop box (per-frame crops would jitter),
     then scale so the mean opaque area matches the static sprite mass.

Needs: pip install imageio imageio-ffmpeg pillow numpy
"""
import sys, os, colorsys
import numpy as np
import imageio.v3 as iio
from PIL import Image
from collections import deque

LUM_OUTLINE = 0.12   # darker than this = character outline, blocks the flood
SHADOW_LUM_MAX = 0.60
GRAY_SPREAD = 22     # max-min channel spread; true grays only (teal blends block)
BG_TOL = 35          # straight distance-to-bg floods from the border (uniform bg)
SHADOW_Y = 0.52      # shadow pass only runs below this fraction of the frame —
                     # the pipeline spec locks the shadow at the feet, while the
                     # (equally gray) gun lives at the top. Spatial split beats
                     # any color rule h264 compression can't blur away.
OUT_SIZE = 256

def _bfs(floodable, seeds):
    h, w = floodable.shape
    seen = np.zeros((h, w), bool)
    q = deque()
    for y, x in seeds:
        if floodable[y, x] and not seen[y, x]:
            seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and floodable[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen

def mask_frame(rgb):
    h, w, _ = rgb.shape
    f = rgb.astype(np.float32) / 255.0
    mx, mn = f.max(2), f.min(2)
    lum = (mx + mn) / 2
    spread = (rgb.astype(np.int16).max(2) - rgb.astype(np.int16).min(2))
    corners = np.concatenate([rgb[:8, :8].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3),
                              rgb[-8:, :8].reshape(-1, 3), rgb[-8:, -8:].reshape(-1, 3)])
    bg = corners.mean(0)
    dist = np.abs(rgb.astype(np.float32) - bg).sum(2)
    border = ([(y, x) for x in range(w) for y in (0, h - 1)] +
              [(y, x) for y in range(h) for x in (0, w - 1)])
    # pass 1: plain background, flooded from the frame border
    removed = _bfs(dist < BG_TOL, border)
    # pass 2: the ground shadow — gray, mid-dark, feet-area only, and reachable
    # from already-removed background (so enclosed grays like the gun survive)
    ys = np.arange(h)[:, None]
    shadowish = ((spread < GRAY_SPREAD) & (lum > LUM_OUTLINE) & (lum < SHADOW_LUM_MAX)
                 & (ys > h * SHADOW_Y))
    edge = removed & np.roll(~removed, 1, 0) | removed & np.roll(~removed, -1, 0) \
         | removed & np.roll(~removed, 1, 1) | removed & np.roll(~removed, -1, 1)
    seeds = list(zip(*np.where(edge)))
    removed |= _bfs(shadowish | removed, seeds)
    return ~removed

def largest_component(keep):
    h, w = keep.shape
    lbl = np.zeros((h, w), np.int32)
    sizes, cur = [0], 0
    for y0 in range(h):
        for x0 in range(w):
            if keep[y0, x0] and not lbl[y0, x0]:
                cur += 1
                n = 0
                q = deque([(y0, x0)]); lbl[y0, x0] = cur
                while q:
                    y, x = q.popleft(); n += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and keep[ny, nx] and not lbl[ny, nx]:
                            lbl[ny, nx] = cur; q.append((ny, nx))
                sizes.append(n)
    if cur == 0: return keep
    return lbl == int(np.argmax(sizes))

def main():
    video, utype, cw = sys.argv[1], sys.argv[2], sys.argv[3]
    n_out = int(sys.argv[4]) if len(sys.argv) > 4 else 8
    here = os.path.dirname(os.path.abspath(__file__))
    frames = iio.imread(video, index=None)[..., :3]
    nf, h, w, _ = frames.shape
    # stride signal: mean abs diff of the leg band (bottom 35%) vs frame 0
    band = frames[:, int(h * 0.62):, :, :].astype(np.float32)
    sig = np.abs(band - band[0]).mean(axis=(1, 2, 3))
    # period = spacing of the deepest local minima after the start
    minima = [i for i in range(3, nf - 3) if sig[i] <= sig[i-1] and sig[i] <= sig[i+1]
              and sig[i] < sig.mean() * 0.6]
    period = minima[0] if minima else nf // 2
    # sample one cycle starting mid-video (models often wobble in the first frames)
    start = min(nf - period - 1, max(period, nf // 3))
    picks = [start + round(i * period / n_out) for i in range(n_out)]
    print(f"{nf} frames, stride period {period}, sampling {picks}")
    masks, rgbs = [], []
    for i in picks:
        keep = largest_component(mask_frame(frames[i]))
        masks.append(keep); rgbs.append(frames[i])
    ys, xs = np.where(np.any(masks, axis=0))
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    side = max(y1 - y0, x1 - x0)
    cy, cx0 = (y0 + y1) // 2, (x0 + x1) // 2
    # static sprite mass target (same normalization as the death slicers)
    ref = Image.open(os.path.join(here, f"unit_{utype}_{cw}.png")).convert("RGBA")
    ref_mass = (np.array(ref)[..., 3] > 8).sum() * (side / ref.width) ** 2
    mean_mass = np.mean([m.sum() for m in masks])
    side = int(side * (mean_mass / ref_mass) ** -0.5) if mean_mass > 0 else side
    half = side // 2
    for k, (keep, rgb) in enumerate(zip(masks, rgbs)):
        out = np.zeros((side, side, 4), np.uint8)
        sy0, sy1 = max(0, cy - half), min(h, cy - half + side)
        sx0, sx1 = max(0, cx0 - half), min(w, cx0 - half + side)
        dy, dx = sy0 - (cy - half), sx0 - (cx0 - half)
        out[dy:dy + sy1 - sy0, dx:dx + sx1 - sx0, :3] = rgb[sy0:sy1, sx0:sx1]
        out[dy:dy + sy1 - sy0, dx:dx + sx1 - sx0, 3] = keep[sy0:sy1, sx0:sx1] * 255
        img = Image.fromarray(out).resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
        dst = os.path.join(here, f"unit_{utype}_walk{k+1}_{cw}.png")
        img.save(dst)
        print("wrote", dst, "mass", int(keep.sum()))

if __name__ == "__main__":
    main()
