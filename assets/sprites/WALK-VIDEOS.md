# Walk-cycle videos — DaVinci AI prompt pack

The marine walk cycle came from an AI-generated walk-in-place video sliced by
`slice_walk.py`. This is the queue for every other unit that walks (vehicles
roll and aircraft fly — they never get walk cycles; drive dust covers them).

## The workflow (proven with the marine, 2026-07-20)

1. In DaVinci, attach the unit's static sprite (listed per unit below) as the
   character reference and use the prompt.
2. Save the video anywhere (Downloads is fine).
3. Run the slicer:
   `python3 assets/sprites/slice_walk.py <video.mp4> <unit_type> <colorway> 8`
4. Frames land as `unit_<type>_walk1..8_<cw>.png` and the game picks them up on
   reload — no code changes. Units without frames keep the procedural sway.

## The prompt template

> Straight top-down orthographic view, camera completely locked. [CHARACTER]
> (match the attached reference image exactly) walking in place, facing
> straight up, legs cycling at a steady march. The body stays centered in
> frame the whole time. Flat even lighting, NO drop shadow on the ground,
> plain solid gray background. Seamless loop, 2 to 4 seconds.

The deal-breakers: camera locked, walking IN PLACE (not across frame), plain
background. Ask for **no drop shadow** — the marine video had one and the
slicer had to carve it out; a shadowless take slices cleaner. Expect a few
attempts before one holds the character design through the whole loop.

## Queue (rough priority order)

| # | Unit | Colorway | Reference sprite | [CHARACTER] text |
|---|------|----------|------------------|------------------|
| ~~1~~ | ~~marine~~ | ~~red~~ | DERIVED 2026-07-21 via recolor_walk.py (from the teal video) | |
| ~~2~~ | ~~rocket~~ | ~~teal~~ | DERIVED 2026-07-21 via recolor_walk.py (from the red video; right pad hides under the tube — replace with a real video if playtest objects) | |
| ~~3~~ | ~~rocket~~ | ~~red~~ | DONE 2026-07-21 (light-gray bg + baked dust-kick; slicer gained bg-adaptive outline/shadow caps) | |
| ~~4~~ | ~~sniper~~ | ~~teal~~ | DONE 2026-07-20 (stride period 48 — DaVinci's slower gait sliced fine) | |
| ~~5~~ | ~~sniper~~ | ~~red~~ | DERIVED 2026-07-21 via recolor_walk.py (from the teal video) | |
| ~~6~~ | ~~medic~~ | ~~teal~~ | DONE 2026-07-21 (best on-model video yet — matched the static's dual med kits) | |
| ~~7~~ | ~~medic~~ | ~~red~~ | DERIVED 2026-07-21 via recolor_walk.py | |
| ~~8~~ | ~~engineer~~ | ~~teal~~ | DONE 2026-07-21 (gray boots = shadow color; slicer gained the hard-edge flood gate) | |
| ~~9~~ | ~~engineer~~ | ~~red~~ | DERIVED 2026-07-21 via recolor_walk.py | |
| ~~10~~ | ~~spitter~~ | ~~wild~~ | DONE 2026-07-21 (tail sway loops clean) | |
| ~~11~~ | ~~spitter~~ | ~~teal~~ | DERIVED 2026-07-21 via recolor_walk.py (throat sac stays venom green) | |
| ~~12~~ | ~~raptor~~ | ~~wild~~ | DONE 2026-07-21 | |
| 13 | critter | wild | `unit_critter_wild.png` | a docile bone-hided grazing dinosaur |

Snipers keep their prone art for hunker only — the walk video is the STANDING
pose. Same for marines (hunker pose art is separate and untouched).

## Colorway derivation (2026-07-21)

`recolor_walk.py <type> <src_cw> <dst_cw>` derives a second colorway from an
existing set of walk frames — it learns the color mapping from the unit's
pixel-aligned static colorway pair (color + position matched, median-smoothed)
so only ONE video per body is ever needed. Marine red, sniper red, and rocket
teal all shipped this way. Videos still wanted: critter wild — the grazer is the LAST one.

## Dino caveat

`slice_walk.py` only removes ground shadow from the bottom half of the frame
(SHADOW_Y = 0.52) — for a long quadruped body whose shadow rides under the
belly, that constant may need loosening per video, same spirit as the per-sheet
threshold tuning in the death slicers. Asking DaVinci for no shadow avoids the
problem entirely.
