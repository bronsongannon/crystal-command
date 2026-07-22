# Broodfall

A tiny real-time strategy game in the spirit of Command & Conquer / StarCraft.
Runs entirely in your browser — no install needed.

## Play

**▶ [Play it right now](https://bronsongannon.github.io/broodfall/)** — or
double-click `index.html` locally (works offline).

## Goal

Mine crystals, build an army, and destroy the enemy HQ before their escalating
assaults overwhelm your base. Pick a map and difficulty from the start menu.

## Campaign 🎖

The start menu now has two modes. **Skirmish** is the classic open battle.
**Campaign** tells the story of the expedition: full-screen mission briefings
from your officers (Cpt. Vega, ops; Dr. Lin, xenobiology), in-mission dialogue,
and an objectives panel that tracks your progress. Beat a mission to unlock the
next — progress is saved in your browser.

**Mission 1 — Landfall** is live: establish the expedition's first outpost,
scout the crystal fields (the wildlife won't hunt what it hasn't seen — but it
notices patrols), survive the retaliation, and capture a live spitter for
Dr. Lin with the unarmed **Capture Rig**. Your troops fire at half rate around
the protected specimen — keep them busy soaking hits, let the rig do the work,
and haul it home breathing. More of Act I is on the way.

## Dinosaurs 🦖

Herds of harmless **Grazers** wander every campaign map. They won't fight back —
but every one your troops kill agitates the planet's real dinosaurs: nest guards
patrol wider and broods respawn faster for the rest of the level. Hunt at your
own risk.

The planet's rich crystal fields are guarded by **dino nests**. Each nest keeps a
brood of **Spitters** on patrol — get close and they attack; retreat far enough
and they return home. Kill a spitter and the nest hatches a replacement within
seconds, forever, until you **destroy the nest itself** — and the moment your
first shots land on a nest, **2-3 extra defenders erupt from it**. Beat them
and the survivors don't slink home: they stay loose and roam the map.

Clear the nest or mine poor: the richest expansions are always guarded.
Artillery is the tool of choice — it outranges the brood's patrol radius
entirely. A tank push or a big marine squad works too, it just costs blood.

Campaign maps hide something worse: the **Raptor Den**. Dens don't wait to be
provoked — every ~50 seconds a **hunting pack of Raptors** leaves the burrow
and charges the nearest base, yours or the enemy's. Raptors are fast melee
hunters whose claws shred infantry; meet them with turrets and vehicles, or
put the den itself out of business before the packs bleed you dry.

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
- **The Boneyard** — north vs south across three broken lanes, and a
  monstrously rich middle. Pick a gate and punch.

## Difficulty

**Easy** (slower assaults, lazier enemy economy) · **Normal** (the intended
fight) · **Hard** (early pressure, relentless waves, a rich enemy, nukes) ·
**Spec Ops** (the enemy cheats — openly).

## Controls

| Input | Action |
|---|---|
| Left-drag | Select your units |
| Right-click (two-finger tap) | Move / attack / harvest |
| A, then click | Attack-move (fight everything on the way) |
| S | Stop |
| H | Marines, snipers & artillery hunker down — half damage, hold position (snipers go prone) |
| Q / W / E / R / D | Train units & research upgrades (select a production building first) |
| T / B / V / C / G / X / Y, then click | Place a Turret / Barracks / Factory / Supply Depot / Refinery / Airpad / Flak Turret |
| Arrow keys / screen edge / minimap | Move the camera |
| Right-click the minimap | Send selected units there |
| Ctrl+1–5 / 1–5 | Save / recall control groups |
| F | Toggle fog memory (explored ground stays visible vs. re-fogs) |
| P | Pause / resume (or the ⏸ button) |
| M | Mute |

To abandon a match, hit **⏹ menu** in the top bar twice — you'll be back at
map/difficulty select.

## Units

- **Harvester** (60) — mines crystals and hauls them to the nearest Refinery
- **Engineer** (90) — repairs damaged buildings **and vehicles**; right-click a
  target, or leave him near the base and he'll fix things on his own
- **Marine** (80) — fast, cheap ranged infantry; can hunker down to hold ground (Barracks)
- **Sniper** (130) — fragile, but huge range and the best eyesight in the game; press `H` to go prone (Barracks)
- **Medic** (100) — unarmed. Automatically heals nearby wounded infantry and
  dinos, and follows the fight; right-click a hurt friend to assign her. Keep
  one behind your marine line and it lives twice as long (Barracks)
- **Rocket Trooper** (140) — shoulder-fired rockets that hit vehicles for 60%
  extra, and can reach aircraft. Slow reload, soft target — screen him (Barracks)
- **Raider** (150) — very fast attack buggy; great for scouting and harassing harvesters (Factory)
- **Tank** (220) — slow, heavily armored, big cannon (Factory)
- **APC** (200) — armored bus for 4 infantry. Right-click it with troops selected
  to board; `U` unloads. Fast, light MG, no AA — and if it dies, everyone inside
  dies with it (Factory)
- **Artillery** (270) — siege gun with huge range and splash damage. Shells land
  where the target *was* — buildings can't dodge, fast units can. Can't fire at
  anything close, so escort it — or hunker it down (`H`) to take half damage
  while it holds the line. The dead zone still applies, dug in or not (Factory)
- **Gunship** (240) — flying attack helicopter. Ignores terrain and walls,
  rapid-fire chaingun, superb harasser. Tanks and artillery **cannot shoot
  upward** — but marines, snipers, raiders, spitters, and turrets all can (Airpad)
- **Harrier** (320) — strike jet. One devastating bomb per sortie, then it must
  fly home to the Airpad for a 7-second rearm. Click a target and watch the
  run. Each side fields at most **5 Harriers** at a time (Airpad)

## Buildings & the tech tree

Buildings unlock in order — each tier opens the next:

**Supply Depot → Barracks → Factory → Airpad → Missile Silo**

Turrets need a Barracks; Flak needs a Factory; the Power Plant and Refinery
just need a Depot. Locked buildings stay hidden from the command card until
you've built what they need — watch for the 🔓 unlock toasts as your base
grows. Losing a tech building doesn't disable what's already standing — but
you can't build replacements further up the tree until you rebuild it (and
neither can the enemy, so their depots are a real target).

- **Supply Depot** (100) — raises your supply cap by 8, unlocks the Barracks,
  **and slowly repairs friendly buildings near it** (a weak, free engineer that
  never wanders off — the ring shows when you select or place one)
- **Power Plant** (120, hotkey `O`) — feeds the grid. Military buildings draw
  power (the HQ's reactor covers a small base); go over capacity and you hit
  **⚡ LOW POWER**: production crawls at half speed, turrets and flak fire at
  half rate, and nukes can't launch. Plants are cheap and fragile — guard
  yours, and raid theirs. The top bar shows your draw vs. capacity.
- **Barracks** (150) — trains infantry: Marine, Sniper, Medic, Rocket Trooper
- **Factory** (200) — builds vehicles: Raider, Tank, Artillery, APC — **and
  repairs ground vehicles** parked near it, billing you crystals per point of
  armor restored. Drive home damaged, drive out patched and poorer.
- **Refinery** (175) — the ONLY crystal drop-off (the HQ is a command post, not an ore chute); every base starts with one. Build next to far-away patches to
  expand your economy. Comes online with a free harvester.
- **Airpad** (175) — builds Gunships and Harriers, adds +2 supply, and repairs
  aircraft the same way the Factory fixes vehicles (paid)
- **Flak Turret** (160) — anti-air battery; shreds gunships, ignores the ground war
- **Turret** (140) — stationary base defense; must anchor to a main building
  (HQ, Barracks, Factory…), so no turret-chaining across the map
- **Missile Silo** (500) — unlocks the endgame. See below ☢

## The Nuclear Option ☢

Build a **Missile Silo** (500), then save up:

- **Tactical Nuke** — 10,000 ⬡. Huge blast, flattens anything it lands on —
  but it **cannot be aimed at an HQ**, and HQs take zero damage from it.
- **Bunker Buster** — 25,000 ⬡. The HQ killer. One hit, game over.

Select the armed silo, press `L`, click the map. Both sides then get **30 very
loud seconds** — the target zone pulses on the map and minimap, so if you hear
"NUCLEAR LAUNCH DETECTED," move everything you love. On Hard and Spec Ops, the
enemy builds silos too. Warheads don't care whose units are under them.

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
