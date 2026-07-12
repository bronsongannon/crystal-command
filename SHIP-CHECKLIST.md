# Ship checklist — Mac App Store by July 31, 2026

Working checklist (2026-07-11). Goal: submit a v1 (skirmish + Mission 1) to Apple
by end of month. Apple Developer membership already covered by the existing
account (one membership, unlimited apps) — no enrollment wait.

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
- [ ] Team color pass — wild dino bone/moss, red identity touches
- [ ] Raptor + Raptor Den — the Act 1 finale swarm tease
- [ ] Missions 2–3: harvester convoy escort, first nest crack
- [ ] Pacing pass toward 20–30 minute matches

## Art and audio

- [ ] Source the 14 sound-effect slots (Kenney / Freesound CC0 — assets/sfx/README.md)
- [ ] Generate unit_rig.png and bld_power.png (prompts in assets/sprites/ART-WANTED.md)
- [ ] Dino art hunt — itch.io CC0 packs first, AI-generate if nothing fits
- [ ] Standing sniper art (only the prone pose exists today)
