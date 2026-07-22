# App icon pipeline

`master.png` (1024×1024) is the single source. Everything downstream is scripted:

```
python3 make-icon.py            # master.png -> AppIcon.appiconset (all 10 macOS sizes)
```

The asset catalog lives in `mac/Broodfall/Assets.xcassets` and is wired into
the build (`ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon`) — rebuild and the app
has the new icon. The same 1024 master is the App Store icon for the store
listing (ap5).

## Current master

Composed from the game's own crystal sprite by `make-placeholder.py` (squircle
per Apple's icon grid, radial expedition-teal background, faint RTS grid, glow).
It reads well from 1024 down to 16 and is **archive-ready** — the commissioned /
Gemini upgrade below is optional polish, not a blocker.

## Upgrading the icon (optional, the ~$100 budget)

Drop a new 1024×1024 `master.png` here, rerun `make-icon.py`, rebuild. Done.

**Gemini prompt (matches the game's art style guide):**
> macOS app icon for "Crystal Command", a retro RTS where a human mining
> expedition battles dinosaurs. Rounded-square macOS icon (Apple squircle,
> full-bleed artwork, no border, no text). A cluster of glowing teal crystals
> erupts from dark rocky ground; behind it, the amber eye-shine and dark
> silhouette of a raptor lurks in the shadows. Deep green-black background
> with a faint tactical grid. Painted, saturated, cartoon-adjacent — clean
> silhouettes readable at 32 pixels. Dramatic rim lighting from the crystal
> glow. 1024x1024.

**Fiverr brief (if commissioning):** attach `master.png` as the concept +
`assets/sprites/STYLE-GUIDE.md` excerpts; ask for a 1024×1024 PNG on
transparency following Apple's macOS icon grid (832px squircle), flat
deliverable, source file included, commercial license.

## Gotcha log

- **Dock shows a generic icon after rebuilding in place:** LaunchServices
  caches the icon per bundle path. Launch from a fresh path (or
  `lsregister -f` + `killall Dock`) and it resolves. Store/notarized installs
  are unaffected.
