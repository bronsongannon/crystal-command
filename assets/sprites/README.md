# Body sprites

From [Kenney](https://kenney.nl) asset packs (CC0 / public domain):

- `tank_body.png`, `tank_barrel.png`, `raider_barrel.png`, `crate.png` — Top-Down Tanks Redux
- `inf_marine.png` (survivor), `inf_sniper.png` (hitman), `inf_engineer.png` (robot) — Top-Down Shooter
- `bld_plate.png`, `bld_plate_oct.png`, `turret_gun.png`, `bld_vent_a.png`, `bld_vent_b.png` — Tower Defense (top-down)

Art is neutral-colored; the game tints it per team at load (`teamSprite()` in `game.js`).
To reskin a unit, drop in a replacement PNG with the same filename (infantry face
right, vehicles/turret guns point up).
