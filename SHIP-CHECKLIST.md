# Ship checklist — Mac App Store by July 31, 2026

Working checklist (updated 2026-07-12). Goal: submit a v1 (skirmish + Mission 1)
to Apple by end of month. Apple Developer membership already covered by the
existing account (one membership, unlimited apps) — no enrollment wait.

Interactive version: `.claude/ship-widget.html` renders as a widget at the start
of every Claude session (SessionStart hook in `.claude/settings.json`). Keep this
file and the widget's task lists in sync.

## Apple submission track (critical path, in order)

- [x] Developer Program membership — covered by existing account
- [ ] Create the app record + bundle ID in App Store Connect — by Jul 14
- [ ] Build the Mac wrapper — WKWebView shell in Xcode loading the game locally — by Jul 18
- [ ] App icon + 1024px store icon (the ~$100 art budget goes here) — by Jul 22
- [ ] Store listing: screenshots, description, keywords, $9.99 price — by Jul 25
- [ ] Privacy policy page (game collects nothing — one static page) — by Jul 25
- [ ] Sandbox entitlements, code signing, notarize, test on a clean Mac — by Jul 27
      (native menu bar + fullscreen + quit in the wrapper to dodge guideline 4.2)
- [ ] Archive, upload, submit for review — by Jul 29 (2-day buffer)

## Game build roadmap

- [x] Mission framework + Mission 1 "Landfall" (briefings, objectives, capture op)
- [x] Tech tree, power grid, depot repair field, factory/airpad repair bays
- [ ] Playtest Landfall — does it land in the 15-minute window?
- [x] Team color pass — wild dino bone/moss, red identity touches (2026-07-12)
- [ ] Raptor + Raptor Den — the Act 1 finale swarm tease
- [x] Missions 2–3: harvester convoy escort, first nest crack (2026-07-12)
- [ ] Pacing pass toward 20–30 minute matches

## Art and audio

- [ ] Source the 14 sound-effect slots (Kenney / Freesound CC0 — assets/sfx/README.md)
- [x] Generate unit_rig.png and bld_power.png — superseded by full colorway art set (2026-07-12)
- [x] Dino art hunt — resolved via Gemini colorway pipeline (2026-07-12)
- [x] Standing sniper art (2026-07-12)
- [x] Turret gun red (2026-07-12)
- [x] Rocket trooper death sheet — red recolor (2026-07-12; teal frames re-sliced too, old grid artifacts fixed)
- [x] Spitter death sheets — wild AND teal colorways (2026-07-12)
- [x] Infantry death sheets: marine, sniper, medic, engineer, teal + red (2026-07-12)
      (death frames: infantry + dinos only; vehicles keep the fireball, aircraft skip;
      every future dino sheet includes IDLE + DEATH from day one)

## Shipped — playtest round + full code audit (Jul 11–12)

- [x] Mission 1 reworked: exploration first — dinos only retaliate after your patrol is spotted
- [x] Specimen weapons-lock: player fire (including splash) physically can't hurt the capture target
- [x] Progressive build menu: locked buildings hidden, unlock toasts; Depot is the true tier-0
- [x] Dialogue backlog fast-forward — tutorial commentary drains in ~16s instead of ~45s
- [x] Constructing buildings no longer heal away combat damage (were nearly unkillable mid-build)
- [x] Interrupted specimen/egg hauls auto-resume — killed a tutorial soft-lock
- [x] Units killed mid-tick can no longer act or count toward mission objectives
- [x] Nuke safety: no dead-silo launches, no mode-stacking accidental launches, no overlay race on quit
- [x] Menu hotkeys gated off, mission rig costs no supply, enemy plant can't spawn on crystals, AI refineries obey the tech tree
