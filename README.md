# Crystal Command

A tiny real-time strategy game in the spirit of Command & Conquer / StarCraft.
Runs entirely in your browser — no install, no internet needed.

## Play

Double-click `index.html` (or drag it onto Safari/Chrome).

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
| Q / W / E / R | Train units (select your HQ or Barracks first) |
| T, then click | Build a turret (140 crystals, near your base) |
| Arrow keys / screen edge / minimap | Move the camera |
| Ctrl+1–5 / 1–5 | Save / recall control groups |
| F | Toggle fog memory (explored ground stays visible vs. re-fogs) |
| M | Mute |

## Units

- **Harvester** (60) — mines crystals and hauls them back to the HQ
- **Engineer** (90) — repairs damaged buildings; right-click a building, or leave
  him near the base and he'll fix things on his own
- **Marine** (80) — fast, cheap ranged infantry
- **Sniper** (130) — fragile, but huge range and the best eyesight in the game
- **Raider** (150) — very fast attack buggy; great for scouting and harassing harvesters
- **Tank** (220) — slow, heavily armored, big cannon
- **Turret** (140) — stationary base defense

## Fog of war

You only see what your units and buildings can see. Unexplored ground is black;
explored-but-unwatched ground is dimmed, and enemy troops in it are hidden.
Snipers and Raiders make the best scouts.

The `🌫 map` button in the top bar (or the `F` key) toggles fog memory:
**remembered** keeps explored ground dimly visible; **re-fogs** blacks it out
again whenever none of your units are watching it. Your scouting progress is
never lost — switching back to "remembered" restores everything you've seen.

Made with Claude Code. Everything lives in `game.js` — tweak the numbers at the
top (`UNIT`, `BLD`) to rebalance the game however you like.
