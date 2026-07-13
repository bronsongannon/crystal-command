# Sound effects — drop-in slots

Drop audio files in this folder and the game picks them up automatically (each file
independent — anything missing keeps its procedural WebAudio beep as fallback).

**Filename = slot name. Formats tried in order: `.wav`, `.ogg`, `.mp3`.**

| File | Played when | What to look for |
|---|---|---|
| `shot.wav` | Marine / raider / turret fire | Light rifle burst or laser zap, short |
| `shell.wav` | Tank cannon fire | Heavy cannon boom, punchy |
| `thump.wav` | Artillery fire | Deep mortar/howitzer launch thump |
| `spit.wav` | Dino spitter attack | Wet organic spit/hiss |
| `rocket.wav` | Rocket trooper fire | Rocket whoosh/launch |
| `snipe.wav` | Sniper fire | Sharp high-caliber crack |
| `launch.wav` | Nuke launch | Long rumble / missile ignition (~1–2s) |
| `boom.wav` | Explosions, unit/building deaths | General explosion. Fires often — pick one that layers well |
| `deposit.wav` | Harvester delivers crystals | Positive chime / cash register |
| `repair.wav` | Engineer/medic repairing (throttled tick) | Short wrench/weld tick |
| `ready.wav` | Unit trained / research done / good news | Confirmation chime |
| `error.wav` | Can't afford / queue full / bad order | Negative buzz, short |
| `alarm.wav` | Base under attack / nuke inbound | Klaxon, 0.5–1s |
| `select.wav` | Units selected | Very short soft click/blip (plays constantly — keep subtle) |

## Current install (2026-07-13) — all 14 slots filled

All Kenney CC0 except the alarm. Zips live in `assets/sprites/Source 2/` (untracked).

| Slot | Source |
|---|---|
| shot | Sci-fi Sounds `laserSmall_004` |
| shell | Sci-fi Sounds `explosionCrunch_004` |
| thump | Sci-fi Sounds `lowFrequency_explosion_000` |
| spit | Sci-fi Sounds `slime_000` |
| rocket | Sci-fi Sounds `thrusterFire_000`, trimmed 5s -> 0.75s w/ fade |
| snipe | Sci-fi Sounds `laserRetro_000` |
| launch | Sci-fi Sounds `spaceEngineLarge_000` (5s — deliberate, nuke drama) |
| boom | Sci-fi Sounds `explosionCrunch_000` |
| deposit | RPG Audio `handleCoins` |
| repair | Impact Sounds `impactMining_001` |
| ready | Interface Sounds `confirmation_001` |
| error | Interface Sounds `error_006` (004 was a 0.1s blip) |
| select | Interface Sounds `click_001` (002 was 10ms — inaudible) |
| alarm | Freesound #704445 "klaxon-10" by SieuAmThanh (CC0), trimmed 21s -> 1.6s w/ fade |

Playtest levers: shell/thump have ~2s tails (swap to `_00X` siblings if muddy);
every Kenney pick has 4 sibling takes in the same pack.

Per-slot volumes live in `SFX_VOL` in `game.js` — tweak there, keep source files
normalized loud.

Keep files short (most < 1s) and small; `boom`/`shot` fire many times per second in
big fights (the engine throttles shots to one per 4 ticks and rotates a 4-element
pool per sound for overlap).

## Where to get sounds (free + commercial-safe)

- **Kenney.nl** — CC0. *Sci-Fi Sounds*, *Impact Sounds*, *Interface Sounds* packs. Best first stop, matches our sprite style.
- **Sonniss GDC bundles** (sonniss.com/gameaudiogdc) — royalty-free pro SFX, huge archives.
- **OpenGameArt.org** — filter license CC0.
- **Freesound.org** — use the CC0 license filter.
- **ChipTone / sfxr.me** — design retro effects in-browser, export WAV.

Avoid ripping from commercial games (C&C, StarCraft) — copyrighted.

## Note on `file://`

Samples load via `<audio>` elements (like the sprites' `<img>`), so they work when
double-clicking `index.html` — no server needed.
