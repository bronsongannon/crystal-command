# Nano Banana prompt pack — full art overhaul

Generate one image per row, save as **256×256 transparent PNG** with the exact
filename, drop it into `assets/sprites/`, reload the game. Every file is
optional and independent — the game falls back to its current look for any
file that's missing. You can do these in any order; **`unit_marine`,
`unit_tank`, `unit_spitter`, and `bld_hq` change the look of the game the most.**

## The style block (paste at the START of every prompt)

> top-down orthographic 2D video game sprite, viewed directly from above,
> single object centered on a plain solid light-gray background, cartoonish
> chunky proportions with flat cel shading and clean dark outlines, like
> Kenney game assets, crisp silhouette readable at small size, no text, no
> watermark, no shadow on the ground

## The color rule (append to every TINTED prompt)

> desaturated sand, khaki and warm gray color scheme only, no bright colors

The game multiplies team color (teal/red/green) onto these sprites — colorful
art tints muddy. Rows marked **NATURAL** skip this line and use real colors.

## Orientation

Everything faces **UP** (nose/gun/head toward the top of the image).

## After generating

1. Remove the background (any online background remover, or Preview → Instant Alpha)
2. Crop to a square with the subject filling ~85%
3. Export PNG-with-transparency at 256×256, name it exactly, drop in this folder

Consistency tip: do them all in ONE Nano Banana session and say "same art
style as the previous image" after the first one you like.

---

## Infantry (tinted)

| file | prompt (after the style block) |
|---|---|
| `unit_marine.png` | futuristic space marine infantry soldier in light combat armor holding a compact rifle pointed up, small backpack, seen from directly above, facing up |
| `unit_sniper.png` | prone sniper soldier in a hooded ghillie cloak aiming a very long anti-materiel rifle pointed up, bipod deployed, seen from directly above, facing up |
| `unit_medic.png` | combat field medic with a bulky medical backpack marked with a cross symbol, no weapon, one hand carrying a medkit case, seen from directly above, facing up |
| `unit_rocket.png` | heavy weapons soldier carrying a large rocket launcher tube over the shoulder pointed up, missile tip visible, wide stance, seen from directly above, facing up |
| `unit_engineer.png` | engineer worker in a hard hat and tool vest carrying a large wrench, tool belt with pouches, seen from directly above, facing up |

## Vehicles (tinted)

| file | prompt |
|---|---|
| `unit_harvester.png` | boxy industrial mining truck with a wide front scoop and an open cargo bed of glowing crystals, heavy tires, seen from directly above, facing up |
| `unit_raider.png` | fast wedge-shaped attack buggy with oversized off-road wheels, small roof-mounted machine gun pointing up, seen from directly above, facing up |
| `unit_tank.png` | heavy main battle tank with wide treads and a rotating turret, long cannon pointing up, armor plating details, seen from directly above, facing up |
| `unit_artillery.png` | self-propelled artillery vehicle on tracks with an extremely long siege cannon pointing up, narrow hull, recoil struts, seen from directly above, facing up |
| `unit_apc.png` | eight-wheeled armored personnel carrier with a flat roof, top hatch, small machine gun stub pointing up, seen from directly above, facing up |

## Aircraft (tinted)

| file | prompt |
|---|---|
| `unit_gunship.png` | military attack helicopter gunship with stub wings carrying rocket pods, twin cockpit, tail rotor, main rotor blades faint and blurred, seen from directly above, nose pointing up |
| `unit_harrier.png` | delta-wing VTOL strike jet fighter with twin tail fins and a single bomb mounted under the fuselage centerline, seen from directly above, nose pointing up |

## Dinosaurs (tinted — wild ones render green, tamed ones teal)

| file | prompt |
|---|---|
| `unit_spitter.png` | small feisty raptor-like dinosaur with an inflated venom throat sac, long counterbalancing tail, clawed feet mid-stride, seen from directly above, head pointing up |

## Buildings (tinted)

| file | prompt |
|---|---|
| `bld_hq.png` | large octagonal sci-fi command headquarters building with a glowing central core, antenna arrays, landing beacon lights at the corners, seen from directly above |
| `bld_barracks.png` | rectangular military barracks building with a reinforced entry door at the bottom edge, roof vents and a small flag, seen from directly above |
| `bld_factory.png` | wide industrial vehicle factory with a large roll-up bay door at the bottom edge, twin smokestacks, roof crane rail, seen from directly above |
| `bld_supply.png` | small square supply depot stacked with cargo crates and fuel barrels under a partial canopy roof, seen from directly above |
| `bld_refinery.png` | octagonal ore refinery building with a central glowing crystal intake port, pipes and holding tanks around the rim, seen from directly above |
| `bld_airpad.png` | square helicopter landing pad building with a painted H in a circle, edge lights, small control kiosk in one corner, seen from directly above |
| `bld_turret.png` | round armored gun turret BASE PLATFORM only with no gun barrel, bolted deck plates and a central mounting ring, seen from directly above |
| `bld_flak.png` | round anti-aircraft battery BASE PLATFORM only with no gun barrels, radar dish on the rim and a central mounting ring, seen from directly above |
| `bld_silo.png` | underground nuclear missile silo building seen from directly above, massive circular blast doors split down the middle, hazard chevron markings around the rim, warning lights |

The game draws the rotating gun on turret/flak itself — that's why those two
are bases only. To upgrade the gun too, replace `turret_gun.png` (existing
file): *"twin-barreled turret gun assembly pointing up, seen from above"*.

## NATURAL COLOR (skip the color rule — these are never tinted)

| file | prompt |
|---|---|
| `dino_nest.png` | dinosaur nest built of packed earth, bones and branches, containing three large speckled cream-colored eggs, ring of rib bones around the rim, seen from directly above — natural earthy browns and bone white |
| `egg.png` | single large dinosaur egg, cream colored with olive-green speckles, slightly glossy, seen from directly above at a slight angle |

## Optional flavor (existing filenames, replace anytime)

`crate.png` (supply crate), `bld_vent_a.png` / `bld_vent_b.png` (roof vent
units), effects in `../fx/` (explosion0-8, smoke0-7, puff0-5) — natural colors.
