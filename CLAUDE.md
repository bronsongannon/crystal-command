# Crystal Command

A tiny browser RTS in the spirit of Command & Conquer / StarCraft 2, built for and with Bronson (a big fan of those games). Pure canvas + vanilla JS, zero dependencies, runs from `file://` by double-clicking `index.html`.

- **Repo:** https://github.com/bronsongannon/crystal-command (public)
- **Live / shareable:** https://bronsongannon.github.io/crystal-command/ — GitHub Pages serves the `main` branch root, so **every push to `main` auto-deploys** (~1 min).

## Files

- `index.html` — page shell, all CSS, UI DOM (top bar, minimap, command card, help, toasts, game-over overlay)
- `game.js` — the entire game (~1,300 lines): data tables, fog of war, economy, combat, enemy AI, input, rendering, sprite FX, WebAudio sfx
- `assets/fx/` — Kenney CC0 particle sprites (explosion/smoke/puff variants + two muzzle-flash shapes), downscaled from the source packs. Loaded by the `loadSprites` block in `game.js`; if any image fails, `spritesReady` stays false and effects fall back to the original procedural drawing (game still works from a bare `game.js` + `index.html`).
- `assets/sprites/` — Kenney CC0 body sprites for all units & buildings (tanks pack + Top-Down Shooter infantry + Tower Defense building plates/turret gun). Loaded by `loadBodies`; `bodiesReady` gates sprite vs procedural rendering the same way. Team coloring is done at load via `teamSprite()` (multiply-tint cache) — art is neutral sand/khaki, tinted teal/red per team.
- `README.md` — player-facing docs (controls, units); keep it updated when gameplay changes

## Game snapshot (as of 2026-07-08)

- **Loop:** harvest crystals → train army → survive escalating AI assault waves → destroy enemy HQ (top-right; player is bottom-left).
- **Units:** Harvester (60) · Engineer (90, repairs buildings, trained from HQ, auto-repairs nearby damage when idle) · Marine (80, `H` toggles hunker: ½ damage taken, holds position, still shoots — `order.type==='hunker'`) · Sniper (130, prone silhouette, longest sight) · Raider (150, fast wedge buggy) · Tank (220). Turret (140) must anchor within `PLACE_NEAR_BASE` of a friendly NON-turret building (anti-turret-creep, playtest feedback). Units wall-slide around buildings (`moveToward` lookahead steer, playtest feedback: was "grinds forever", now ~0.25s overhead).
- **Buildings:** HQ (trains harvester/engineer, supply 20) · Barracks (infantry: marine/sniper, buildable 150) · Factory (vehicles: raider/tank, buildable 200) · Supply Depot (+8 supply, 100) · Refinery (175, harvester drop-off = expansion mechanic; must be placed near a live crystal patch, spawns a free harvester on completion) · Turret (140). Placement hotkeys T/B/V/C/G (`BUILD_MENU`); all but refinery must be within `PLACE_NEAR_BASE` of a friendly building. Supply hard cap 100 (`SUPPLY_HARD_CAP`). Enemy base includes a factory + 2 supply depots; AI runs two production queues (rax=infantry, factory=vehicles).
- **Fog of war:** tile-grid, `explored` (persistent) + `visible` (recomputed every 8 ticks). Toggle `F` / top-bar button: "remembered" (explored stays dimmed) vs "re-fogs" (blacks out when unwatched). Player targeting/clicking respects fog; AI cheats (knows player HQ location).
- **Upgrades (StarCraft-style, 2026-07-09):** `UPG` table + `teams[t].up` levels. Researched at the producing building via the same queue as units (entries `'up:<key>'`): Barracks = infWeapons/infArmor, Factory = vehWeapons/vehArmor, HQ = harvest (carry+speed). Effects via `weaponMult`/`armorMult`/`carryCap`/`effSpeed` — +12% dmg, −10% taken, +3 carry & +10% speed per level, 3 levels each. Card slots Q/W/E/R = `cardActions(b)` (units first, then research). AI researches with spare cash after 5 min. **Rush fees** (`rushProduction`): while a queue is active the card offers 2× speed (fee = half item cost, sets `b.boost=2` for the current item) or finish-now (fee = full item cost); instant respects the supply cap.
- **Game-over feel:** HQ death = triple explosion + shake 20 (normal cap 14, see `addShake`) + double boom; overlay delayed 1.4s and fx/camera keep running behind it (`frame()` else-branch).
- **Enemy AI:** mines its own economy + passive trickle, trains a mixed army capped by a ramp (`3 + 2·minutes` supply — deliberate, keeps wave 1 beatable), keeps 1 engineer after 2 min, waves at 100s then every ~70s, shrinking.
- **Controls:** drag-select, right-click smart orders (move/attack/harvest/repair), `A` attack-move, `S` stop, `H` hunker (marines), control groups `⌃1–5`, arrows/edge/minimap camera (WASD deliberately NOT camera — A/S/W/Q/E/R are command keys), `M` mute.

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
- Graphics upgrade (2026-07-08): the game is now fully sprite-based. (1) Sprite *effects* — muzzle flashes, explosion fireballs + smoke, shell impacts, damage fire/smoke on hurt buildings & tanks, mining dust, screen shake (`fxExplosion`/`fxMuzzle`/`fxDamageSmoke`/`fxMinePuff`/`addShake`; knobs in those helpers + `MUZZLE_LEN`/`FX_CAP`). (2) Sprite *bodies* for all units & buildings (`drawUnitSprite`/`drawBuildingSprite`), team-tinted via `teamSprite()`. Procedural drawing remains as automatic fallback for both. Sprite orientation: infantry art faces right (+x), vehicle/turret art points up (drawn with +90° rotation). Next rung if he wants nicer art: commissioned or AI-generated sprites dropped into `assets/sprites/` with the same filenames.
- **Commercial plan (2026-07-08):** Bronson wants to sell this on the Mac App Store — discussed $9.99 (was "with ads" but ads on macOS are impractical/AdMob doesn't support it; steered toward $9.99 no-ads single SKU or IAP tiers). Art budget ~$100 — advice given: keep Kenney CC0 in-game art (free, commercial-safe), spend the budget on a commissioned app icon + store key art (Fiverr). Remember: Apple Developer Program is $99/yr, and shipping needs a native wrapper (WKWebView or Tauri) since it's a browser game.
- **Product direction (2026-07-08, from a Q&A with Bronson):**
  - **Pace:** hobby pace, no release date. Ship when ready.
  - **V1 content:** campaign missions + skirmish (multiple maps, difficulty levels). No survival/challenge modes for now.
  - **Match feel:** 20–30 min games (current game runs shorter — pacing/map size will need tuning as mechanics land).
  - **What he loves:** big army battles + economy/expansion play. Invest polish there first.
  - **Mechanics roadmap (his picks, roughly in build order):** (1) ✅ DONE 2026-07-08: Factory (Barracks=infantry, Factory=vehicles), Supply Depot (+8, cap 100), and Refinery expansions (he came around on these — "a huge piece of this"). (2) NEXT: 1–2 new units with rock-paper-scissors counters (e.g. artillery: long range vs buildings, weak vs fast units). (3) Then the pacing pass toward 20–30 min matches.
  - **Campaign flavor:** light sci-fi story — short mission briefings, simple arc over ~8–10 missions. No cutscenes.
  - **PvP:** explicitly parked ("not sure yet") — decide after single-player ships. Don't architect for it yet.
- **THE HOOK — dinosaurs (2026-07-08, deep design Q&A):** Bronson's idea, validated and committed: humans vs dinosaurs, Turok/Jurassic Park energy. This is now the store pitch ("classic RTS meets Jurassic Park"), not a side feature. Decisions from the Q&A:
  - **Keep the name Crystal Command; reframe fiction:** mining the crystals is what wakes/enrages the planet's native dinos. Campaign = human expedition (player) vs escalating dino threat.
  - **Dino scope, in order:** (1) neutral wildlife first — **the "nest problem" is the signature moment**: rich crystal patches guarded by a dino nest (respawns defenders until destroyed) + spitter dinos; clear it or mine poor. Integrates directly with the refinery/expansion economy. (2) Campaign antagonist faction (AI-only — no dino economy/balance needed). (3) Full playable dino faction only if the game earns it — do NOT start here.
  - **Combat:** start with ranged-ish dinos (spitters) + at most one simple melee charger; build real melee systems (charge/surround/swarm) later. Engine currently has zero melee support — remember this before promising raptor packs.
  - **V1 ship gate:** "tease then deliver" — v1 = skirmish (with nest creeps) + early campaign missions; dino campaign arc lands as a free update.
  - **Audience:** nostalgic RTS 30–50 AND dads-playing-with-kids — keep violence cartoonish (Kenney style already is), difficulty options matter.
  - **Success metric:** craft & hobby first — shipping matters but there is no launch-window pressure; protect the fun of building it.
  - **Dino art:** hunt itch/CC0 top-down dino packs first; if nothing matches, Bronson AI-generates sprites and art-directs, dropped into the existing same-filename sprite pipeline. Kenney has no dinos.
  - **Design synergy to exploit:** nests demand a siege answer → the planned artillery unit becomes the nest-cracker → human counter-unit step and dino step reinforce each other.
- Feature ideas floated: more buildings (supply/factory), air units, hero units, repair costing crystals if too forgiving.
- **Keep this project fully separate from Point Bandit** (his credit-card rewards app). No cross-references, no shared config.
