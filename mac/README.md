# Mac wrapper — WKWebView shell for the App Store

Native macOS app that ships the browser game. Open `Broodfall.xcodeproj`
in Xcode, hit Run. No storyboard, no dependencies — two Swift files.

## What's configured

- **Game loading:** the "Bundle Game Files" build phase rsyncs `index.html`,
  `game.js`, and `assets/` from the repo root into `Resources/game/` on every
  build (excludes `Source 2`, `source`, `.DS_Store`, `*.md`, `voice-script.tsv`
  — app payload ~19MB). The web view loads it via `loadFileURL`.
- **Native feel (guideline 4.2):** programmatic menu bar (App / Game / View /
  Window / Help), fullscreen (⌃⌘F), ⌘Q quit, close-window-quits-app,
  window frame autosaved. The Game and Help menus bridge into the game's own
  JS (pause ⌘P, mute ⇧⌘M, controls modal ⌘?).
- **Sandbox:** `app-sandbox` + `network.client` entitlements. GOTCHA, learned
  the hard way: **without `network.client`, WebKit's helper processes crash on
  launch in a sandboxed app and the window stays black** — even for purely
  local content. The game itself makes zero network requests.
- **Signing:** Apple Development identity, team `X22M9K8T66` (set in the
  project). App Store submission will need the app record's bundle ID to match
  `com.bronsongannon.broodfall` — change both together if you pick a
  different one in App Store Connect.
- **Debug builds** are web-inspectable (Safari → Develop menu) and surface
  load failures in the window title. Release builds carry neither.

## Verified working (2026-07-22)

Sandboxed Debug build: start menu renders, full skirmish sim runs, sprite art
and all 18 sound slots load from the bundle, localStorage persists across
relaunch, native menus drive the game. Verified via a temporary smoke test in
`didFinish` — title reported `launch:2 units:16 sprites:true sfx:18`.

## Still to do before submission (ship checklist ap5–ap8)

- ~~App icon~~ DONE 2026-07-22 — pipeline + archive-ready icon in `icon/`
  (composed from the game's crystal sprite; optional commissioned upgrade is a
  one-file drop-in, see `icon/README.md`)
- Store listing, privacy policy URL
- Archive with a Distribution identity via Xcode Organizer → upload

## CLI build

```
xcodebuild -project mac/Broodfall.xcodeproj -scheme Broodfall \
  -configuration Debug -derivedDataPath mac/build build
```

Product lands in `mac/build/Build/Products/Debug/Broodfall.app`.
`mac/build/` is gitignored.
