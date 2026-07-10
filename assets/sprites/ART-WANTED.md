# Art drop-in guide

Every sprite in this folder is **hot-swappable**: replace a PNG (same filename)
and the game uses it on next reload. No code changes, ever. If a file is
missing or fails to load, the game falls back to its built-in drawing.

## Global rules (apply to every image)

- **Top-down orthographic** view (straight down, like the existing Kenney art)
- **PNG with transparent background**, subject centered, filling ~85–90% of the canvas
- **256×256 px** is plenty (in-game sizes are 20–100 px)
- **Facing UP** (nose/gun/head toward the top of the image) unless noted
- Cartoonish/clean, chunky silhouettes — think Kenney.nl style, readable at 30 px.
  Keep violence-free: no gore, kid-friendly

### Team tinting — IMPORTANT
Units and buildings are recolored in-game by multiplying the image with the
team color (teal / red / dino-green). So paint them in **neutral desaturated
sand/khaki/light-gray**. Anything painted dark stays dark; anything colorful
will tint weirdly. (Exceptions below say "natural colors".)

## New art wanted (currently procedurally drawn — biggest wins)

| filename | what | notes |
|---|---|---|
| `dino_spitter.png` | small raptor-like dino, venom spitter | neutral sand tones (gets team-tinted: wild=green, tamed=teal). Distinct throat sac |
| `dino_nest.png` | dirt/bone nest mound with 3 speckled eggs | **natural colors**, not tinted. Read as organic vs the tech buildings |
| `gunship.png` | attack helicopter / VTOL gunship | neutral tones, tinted. Rotor is drawn by the game — leave the top center clear-ish |
| `artillery.png` | long-barreled siege gun on tracks, barrel up | neutral tones, tinted. Should look longer/thinner than the tank |
| `egg.png` | single dino egg, speckled | **natural colors** (off-white + green speckles) |
| `medic.png` | field medic with backpack + red-cross armband | neutral tones, tinted. Faces **RIGHT** like the other infantry |

## Existing art you can replace anytime (same filenames)

Units: `inf_marine.png`, `inf_sniper.png`, `inf_engineer.png` (these three face
**RIGHT**, not up — legacy), `tank_body.png`, `tank_barrel.png`,
`raider_barrel.png`
Buildings: `bld_plate.png` (square base), `bld_plate_oct.png` (octagon base —
HQ & refinery), `bld_vent_a.png`, `bld_vent_b.png`, `crate.png`,
`turret_gun.png`
Effects (in `../fx/`): explosion0-8, smoke0-7, puff0-5, shot_large, shot_thin

All neutral-toned for tinting except the fx, which are natural.

## How to generate with AI

Prompt skeleton that works well:

> top-down orthographic 2D game sprite of a [SUBJECT], facing up, centered,
> cartoonish chunky style like Kenney game assets, flat shading, desaturated
> sand and khaki colors, plain solid background, no text, no shadows

Then remove the background (any background-remover tool) and save as
transparent PNG with the filename above. Generate 3–4 candidates per subject
and drop them in one at a time — reload the game to compare.
