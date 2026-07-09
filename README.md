# Crystal Command

A tiny real-time strategy game in the spirit of Command & Conquer / StarCraft.
Runs entirely in your browser — no install needed.

## Play

**▶ [Play it right now](https://bronsongannon.github.io/crystal-command/)** — or
double-click `index.html` locally (works offline).

## Goal

Mine crystals, build an army, and destroy the enemy HQ (top-right corner of the map)
before their escalating assaults overwhelm your base (bottom-left).

## Controls

| Input | Action |
|---|---|
| Left-drag | Select your units |
| Right-click (two-finger tap) | Move / attack / harvest |
| A, then click | Attack-move (fight everything on the way) |
| S | Stop |
| H | Marines hunker down — half damage, hold position (press again to release) |
| Q / W / E / R | Train units & research upgrades (select a production building first) |
| T / B / V / C / G, then click | Place a Turret / Barracks / Factory / Supply Depot / Refinery |
| Arrow keys / screen edge / minimap | Move the camera |
| Ctrl+1–5 / 1–5 | Save / recall control groups |
| F | Toggle fog memory (explored ground stays visible vs. re-fogs) |
| M | Mute |

## Units

- **Harvester** (60) — mines crystals and hauls them back to the HQ
- **Engineer** (90) — repairs damaged buildings; right-click a building, or leave
  him near the base and he'll fix things on his own
- **Marine** (80) — fast, cheap ranged infantry; can hunker down to hold ground (Barracks)
- **Sniper** (130) — fragile, but huge range and the best eyesight in the game (Barracks)
- **Raider** (150) — very fast attack buggy; great for scouting and harassing harvesters (Factory)
- **Tank** (220) — slow, heavily armored, big cannon (Factory)

## Buildings

- **Barracks** (150) — trains infantry: Marine, Sniper
- **Factory** (200) — builds vehicles: Raider, Tank
- **Supply Depot** (100) — raises your supply cap by 8
- **Refinery** (175) — crystal drop-off point; build next to far-away patches to
  expand your economy. Comes online with a free harvester.
- **Turret** (140) — stationary base defense; must anchor to a main building
  (HQ, Barracks, Factory…), so no turret-chaining across the map

## Upgrades

Research StarCraft-style upgrades from the building that uses them — each takes
crystals and time in that building's queue, and benefits your whole army:

- **Barracks** — Infantry Weapons (+12% damage/level) · Infantry Armor (−10% damage taken/level), 3 levels each
- **Factory** — Vehicle Weapons · Vehicle Armor, same deal
- **HQ** — Harvester Systems: +3 carry and +10% harvester speed per level

In a hurry? Any busy production building offers **⏩ 2× speed** (pay half the
item's cost) or **⚡ Finish now** (pay its full cost again) on whatever it's
working on — units and research alike.

Buildings go near your existing base — except the Refinery, which must go next
to a crystal patch. Expanding is how you out-mine the enemy; expansions are
also juicy targets, so defend them.

## Fog of war

You only see what your units and buildings can see. Unexplored ground is black;
explored-but-unwatched ground is dimmed, and enemy troops in it are hidden.
Snipers and Raiders make the best scouts.

The `🌫 map` button in the top bar (or the `F` key) toggles fog memory:
**remembered** keeps explored ground dimly visible; **re-fogs** blacks it out
again whenever none of your units are watching it. Your scouting progress is
never lost — switching back to "remembered" restores everything you've seen.

## Graphics & effects

Units, buildings, and effects use sprite art from [Kenney](https://kenney.nl)'s
CC0 packs (see `assets/`), tinted to each team's colors. Battles come with the
full light show: muzzle flashes, shell-impact blasts, fireball-and-smoke death
explosions, screen shake on big booms, mining dust at the crystal fields, and
burning smoke on badly damaged buildings and tanks. If the sprite images are
missing, the game falls back to simple procedural drawing.

Made with Claude Code. Everything lives in `game.js` — tweak the numbers at the
top (`UNIT`, `BLD`) to rebalance the game however you like.
