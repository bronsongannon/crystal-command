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
| 1 | marine | red | `unit_marine_red.png` | a red-armored sci-fi marine with charcoal trim |
| 2 | rocket | teal | `unit_rocket_teal.png` | a teal sci-fi rocket trooper carrying a launch tube on the shoulder |
| 3 | rocket | red | `unit_rocket_red.png` | a red sci-fi rocket trooper carrying a launch tube on the shoulder |
| ~~4~~ | ~~sniper~~ | ~~teal~~ | DONE 2026-07-20 (stride period 48 — DaVinci's slower gait sliced fine) | |
| 5 | sniper | red | `unit_sniper_red.png` | a cloaked red sci-fi sniper with a long rifle over the shoulder |
| 6 | medic | teal | `unit_medic_teal.png` | a white-armored field medic with teal boots and a red cross |
| 7 | medic | red | `unit_medic_red.png` | a white-armored field medic with red boots and a red cross |
| 8 | engineer | teal | `unit_engineer_teal.png` | a teal-coveralled engineer with a hard hat and tool arm |
| 9 | engineer | red | `unit_engineer_red.png` | a red-coveralled engineer with a hard hat and tool arm |
| 10 | spitter | wild | `unit_spitter_wild.png` | a bone-hided two-legged spitter dinosaur with a green throat sac |
| 11 | spitter | teal | `unit_spitter_teal.png` | a teal-hided two-legged spitter dinosaur with a green throat sac |
| 12 | raptor | wild | `unit_raptor_wild.png` | a bone-hided raptor with moss back-stripes and a whip tail |
| 13 | critter | wild | `unit_critter_wild.png` | a docile bone-hided grazing dinosaur |

Snipers keep their prone art for hunker only — the walk video is the STANDING
pose. Same for marines (hunker pose art is separate and untouched).

## Dino caveat

`slice_walk.py` only removes ground shadow from the bottom half of the frame
(SHADOW_Y = 0.52) — for a long quadruped body whose shadow rides under the
belly, that constant may need loosening per video, same spirit as the per-sheet
threshold tuning in the death slicers. Asking DaVinci for no shadow avoids the
problem entirely.
