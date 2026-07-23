# Ship checklist — Mac App Store by July 31, 2026

Working checklist (updated 2026-07-16). Goal: submit Broodfall v1 (skirmish + Mission 1)
to Apple by end of month. Apple Developer membership already covered by the
existing account (one membership, unlimited apps) — no enrollment wait.

Interactive version: `.claude/ship-widget.html` renders as a widget at the start
of every Claude session (SessionStart hook in `.claude/settings.json`). Keep this
file and the widget's task lists in sync.

## Apple submission track (critical path, in order)

- [x] Developer Program membership — covered by existing account
- [ ] NEXT UP: Create the Broodfall app record in App Store Connect — unblocked by the 2026-07-23 rename; bundle ID `com.bronsongannon.broodfall`, free-with-IAP — **and in the same visit create the IAP itself: non-consumable `com.bronsongannon.broodfall.full`, $9.99** (the code ships expecting exactly that product id) — by Jul 24
- [x] IAP gate — DONE 2026-07-22 (coded + verified, was the last CRITICAL from the audit). `BFStore` entitlement layer in game.js (per-platform backends per BROODFALL-BRIEF item 3: StoreKit via `bfstore` message bridge in the wrapper, all-unlocked on the web build; fails CLOSED in-wrapper until StoreKit answers), gates campaign missions 4+ (list + `startMission` backstop) and all skirmish maps but Crystal Basin (picker + `startGame` backstop + remembered-pick fallback), unlock strip with localized price + restore-purchases UI (guideline 3.1.1), dev mode / `CC.devMode` / `CC.unlockAll` dead in release wrapper builds (DEBUG builds re-enable). Swift side: `mac/Broodfall/StoreBridge.swift` (StoreKit 2, `Transaction.currentEntitlements` + `updates` listener, purchase/restore/error pushes). Local testing: `mac/Products.storekit` wired into the Run scheme — hit Run in Xcode and the buy button completes a test purchase. Verified: wrapper builds; browser harness with a fake bridge passed every gate, the unlock transition, busy/error/debug paths, and a clean 600-tick soak; web build regression-free (no paywall UI).
- [x] Build the Mac wrapper — WKWebView shell in Xcode loading the game locally (2026-07-22: `mac/`, sandboxed + signed, full game verified inside — see mac/README.md)
- [x] App icon + 1024px store icon (2026-07-22: pipeline + archive-ready icon from the game's crystal sprite, `mac/icon/`; commissioned upgrade optional — one-file drop-in, budget can go to store key art instead)
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
- [x] Raptor + Raptor Den — engine complete, M7 scripts the debut (2026-07-13)
- [x] Missions 2–3: harvester convoy escort, first nest crack (2026-07-12)
- [ ] Pacing pass toward 20–30 minute matches

## Art and audio

- [x] Cast portraits: Vega, Lin, Krauss — DONE 2026-07-21 via DaVinci (photorealistic film-still set, bust-cropped for the PiP; full-res originals in assets/portraits/source/)
- [ ] Voice engine pick + generate Act 1 lines — script is exported at assets/voice/voice-script.tsv, workflow in assets/voice/README.md

- [x] Source the 14 sound-effect slots — all filled, Kenney CC0 + one Freesound klaxon (2026-07-13)
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
