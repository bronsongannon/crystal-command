# Crystal Command

A tiny browser RTS in the spirit of Command & Conquer / StarCraft 2, built for and with Bronson (a big fan of those games). Pure canvas + vanilla JS, zero dependencies, runs from `file://` by double-clicking `index.html`.

- **Repo:** https://github.com/bronsongannon/crystal-command (public)
- **Live / shareable:** https://bronsongannon.github.io/crystal-command/ — GitHub Pages serves the `main` branch root, so **every push to `main` auto-deploys** (~1 min).

## Files

- `index.html` — page shell, all CSS, UI DOM (top bar, minimap, command card, help, toasts, game-over overlay)
- `game.js` — the entire game (~1,100 lines): data tables, fog of war, economy, combat, enemy AI, input, rendering, WebAudio sfx
- `README.md` — player-facing docs (controls, units); keep it updated when gameplay changes

## Game snapshot (as of 2026-07-08)

- **Loop:** harvest crystals → train army → survive escalating AI assault waves → destroy enemy HQ (top-right; player is bottom-left).
- **Units:** Harvester (60) · Engineer (90, repairs buildings, trained from HQ, auto-repairs nearby damage when idle) · Marine (80) · Sniper (130, prone silhouette, longest sight) · Raider (150, fast wedge buggy) · Tank (220). Turret (140) via `T`-placement near own buildings.
- **Buildings:** HQ (trains harvester/engineer, supply 20), Barracks (trains the 4 combat units, Q/W/E/R), Turret. No other construction yet.
- **Fog of war:** tile-grid, `explored` (persistent) + `visible` (recomputed every 8 ticks). Toggle `F` / top-bar button: "remembered" (explored stays dimmed) vs "re-fogs" (blacks out when unwatched). Player targeting/clicking respects fog; AI cheats (knows player HQ location).
- **Enemy AI:** mines its own economy + passive trickle, trains a mixed army capped by a ramp (`3 + 2·minutes` supply — deliberate, keeps wave 1 beatable), keeps 1 engineer after 2 min, waves at 100s then every ~70s, shrinking.
- **Controls:** drag-select, right-click smart orders (move/attack/harvest/repair), `A` attack-move, `S` stop, control groups `⌃1–5`, arrows/edge/minimap camera (WASD deliberately NOT camera — A/S/W/Q/E/R are command keys), `M` mute.

## Conventions & knobs

- All balance lives in the `UNIT` / `BLD` tables at the top of `game.js` plus `waveAt`/`armyCap` in the AI section. Tweak numbers there; no magic constants buried in logic (or if you add one, hoist it).
- 60 ticks/sec fixed-step loop; times in code are `seconds * 60`.
- `window.CC` is a debug handle (units, buildings, teams, fog, trainUnit, damage, commandMove, waveAt…) — used for automated browser testing; keep it working.
- Team 1 = player (teal), team 2 = enemy (red). `isCombat(u)` excludes harvester + engineer — check its call sites before adding non-combat units.

## Testing / verification

- `node --check game.js` for syntax.
- To drive it in a browser from a Claude session: serve the folder (`python3 -m http.server`) and use the preview tools + `window.CC` for assertions. **Gotcha:** a tool-spawned server may be blocked by macOS TCC from reading `~/Desktop` — if you get 404s on files that exist, copy the folder to the session scratchpad and serve from there.
- No test framework, intentionally — it's a ~3-file toy. Verify by playing/driving the real game.

## Owner context

- Bronson playtests between changes and brings feedback — expect iterative balance/feel requests.
- Open thread: he's comparing the two fog modes ("remembered" vs "re-fogs") across rounds.
- Graphics upgrade discussed, not started. Ladder: (1) richer procedural canvas art (animations, muzzle flashes, props), (2) sprite PNGs from a free pack (Kenney.nl top-down packs suggested) via a small sprite renderer, (3) AI-generated sprites he'd make with an image tool and drop in. Bigger jump: port to Phaser/Godot.
- Feature ideas floated: more buildings (supply/factory), air units, hero units, repair costing crystals if too forgiving.
- **Keep this project fully separate from Point Bandit** (his credit-card rewards app). No cross-references, no shared config.
