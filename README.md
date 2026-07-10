# Crystal Command

A tiny real-time strategy game in the spirit of Command & Conquer / StarCraft.
Runs entirely in your browser — no install needed.

## Play

**▶ [Play it right now](https://bronsongannon.github.io/crystal-command/)** — or
double-click `index.html` locally (works offline).

## Goal

Mine crystals, build an army, and destroy the enemy HQ before their escalating
assaults overwhelm your base. Pick a map and difficulty from the start menu.

## Dinosaurs 🦖

The planet's rich crystal fields are guarded by **dino nests**. Each nest keeps a
brood of **Spitters** on patrol — get close and they attack; retreat far enough
and they return home. Kill a spitter and the nest hatches a replacement within
seconds, forever, until you **destroy the nest itself**.

Clear the nest or mine poor: the richest expansions are always guarded.
Artillery is the tool of choice — it outranges the brood's patrol radius
entirely. A tank push or a big marine squad works too, it just costs blood.

### Eggs 🥚

A destroyed nest leaves its **clutch of 3 eggs** behind. Right-click an egg
with a harvester and it hauls them home to the HQ, one at a time (it keeps
going back until the clutch is empty). Each banked egg lets you **hatch your
own Spitter** from the HQ (`R`, costs 1 supply) — a fast, expendable raider
that fights for you in team colors. Each side fields at most **5 spitters** at
a time; spare eggs keep until you have room.

## Veterancy ★

Every unit remembers its kills. At **2 / 4 / 8 kills** it becomes a
**Veteran / Elite / Legend** — +10% damage and −8% damage taken per rank, and
Legends slowly heal in the field. Ranked units wear gold chevrons. Keep your
heroes alive; a Legend tank is a monster.

## Maps & terrain

Impassable **rock ridges** carve every map into lanes and chokepoints — armies
path around them automatically (gunships just fly over). Hold a gate with
hunkered marines and a flak turret; slip raiders through the back lane.

- **Crystal Basin** — the classic. Corner bases, twin rich fields mid-map, each
  watched by a nest; two staggered ridges bend the middle into an S-corridor.
- **The Gauntlet** — bases face off across a nest-choked center column, walled
  in by twin ridgelines with a single center gate. Win the middle, win the game.
- **Fossil Valley** — quiet corner expansions, and a mega-field dead center
  under double nest guard, ringed by rock arcs with gates at N/E/S/W.

## Difficulty

**Easy** (slower assaults, lazier enemy economy) · **Normal** (the intended
fight) · **Hard** (early pressure, relentless waves, a rich enemy).

## Controls

| Input | Action |
|---|---|
| Left-drag | Select your units |
| Right-click (two-finger tap) | Move / attack / harvest |
| A, then click | Attack-move (fight everything on the way) |
| S | Stop |
| H | Marines & artillery hunker down — half damage, hold position (press again to release) |
| Q / W / E / R / D | Train units & research upgrades (select a production building first) |
| T / B / V / C / G / X / Y, then click | Place a Turret / Barracks / Factory / Supply Depot / Refinery / Airpad / Flak Turret |
| Arrow keys / screen edge / minimap | Move the camera |
| Right-click the minimap | Send selected units there |
| Ctrl+1–5 / 1–5 | Save / recall control groups |
| F | Toggle fog memory (explored ground stays visible vs. re-fogs) |
| M | Mute |

## Units

- **Harvester** (60) — mines crystals and hauls them back to the HQ
- **Engineer** (90) — repairs damaged buildings; right-click a building, or leave
  him near the base and he'll fix things on his own
- **Marine** (80) — fast, cheap ranged infantry; can hunker down to hold ground (Barracks)
- **Sniper** (130) — fragile, but huge range and the best eyesight in the game (Barracks)
- **Medic** (100) — unarmed. Automatically heals nearby wounded infantry and
  dinos, and follows the fight; right-click a hurt friend to assign her. Keep
  one behind your marine line and it lives twice as long (Barracks)
- **Raider** (150) — very fast attack buggy; great for scouting and harassing harvesters (Factory)
- **Tank** (220) — slow, heavily armored, big cannon (Factory)
- **Artillery** (270) — siege gun with huge range and splash damage. Shells land
  where the target *was* — buildings can't dodge, fast units can. Can't fire at
  anything close, so escort it — or hunker it down (`H`) to take half damage
  while it holds the line. The dead zone still applies, dug in or not (Factory)
- **Gunship** (240) — flying attack helicopter. Ignores terrain and walls,
  rapid-fire chaingun, superb harasser. Tanks and artillery **cannot shoot
  upward** — but marines, snipers, raiders, spitters, and turrets all can (Airpad)

## Buildings

- **Barracks** (150) — trains infantry: Marine, Sniper, Medic
- **Factory** (200) — builds vehicles: Raider, Tank
- **Supply Depot** (100) — raises your supply cap by 8
- **Refinery** (175) — crystal drop-off point; build next to far-away patches to
  expand your economy. Comes online with a free harvester.
- **Airpad** (175) — builds Gunships and adds +2 supply
- **Flak Turret** (160) — anti-air battery; shreds gunships, ignores the ground war
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

## Alerts

When your buildings or workers take fire somewhere off-screen, you'll hear an
alarm and see a red ping pulsing on the minimap. When the dust settles at the
end of a match, a scoreboard shows your time, units fielded and lost, kills,
and crystals mined.

## Pausing

The **? controls** popup pauses the game while it's open — it also appears at
the start of every match; close it when you're ready to command.

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
