# Crystal Command — visual style guide

Team spec sheet + character spec sheet (2026-07-12). The goal: get past the
single multiply-tint. Every faction gets a five-role palette, and every unit,
building, and dino gets a spec: which palette roles it wears, and one
**signature detail** that makes it readable at 30px.

## How color works (the five roles)

| Role | What it paints | Example |
|---|---|---|
| **Hull** | The body mass — what the multiply tint does today | tank chassis, marine armor |
| **Trim** | Panels, stripes, cloth, secondary mass (~20% of the sprite) | bay doors, shoulder pads, racing stripe |
| **Accent** | Lights, visors, energy, tips (~5%, the "pop") | visor strip, warning lights, barrel band |
| **Structure** | Building-only hull variant (usually darker/heavier) | Rubicon architecture |
| **FX** | That team's projectiles, engine glow, selection feedback | tracer color, spit glob |

Rule of thumb per sprite: 75% hull, 20% trim, 5% accent.

**Colorblind rule (enforced):** teams separate by LUMINANCE, not just hue —
bone .72 / teal .59 / red .49 / (Broodfallen rust ~.38). Any new team scheme
must land on its own brightness band; check the minimap first.

## Team spec sheet

### Expedition (player, team 1) — "survey fleet"
Clean, scientific, a little weather-worn. NASA-meets-field-geology.

| Role | Hex | Notes |
|---|---|---|
| Hull | `#3fb9c9` | established teal |
| Trim | `#e8e4d8` | off-white panels — lab equipment in the dirt |
| Accent | `#f0c86a` | warm amber lights/visors |
| Structure | `#2f97a6` | buildings one shade deeper than vehicles |
| FX | `#9fe8ef` | pale-teal tracers/glow |

### Rubicon Mining (red, team 2) — "strip-mine conglomerate"
Heavy iron, corporate hazard-striping, machines that eat mountains. Not evil — profitable.

| Role | Hex | Notes |
|---|---|---|
| Hull | `#e0564a` | established red |
| Trim | `#3a3f45` | industrial charcoal/iron |
| Accent | `#f2b63d` | hazard yellow — chevrons, warning plates |
| Structure | `#b8443a` | darker corporate architecture (SHIPPED via bldSprite) |
| FX | `#f5a89a` | hot salmon tracers |

Identity extras (shipped): Rubicon pennant on the HQ (`drawRubiconBanner`).

### Wild dinos (team 3) — "fauna, not faction"
Bone hide, moss shadow. They should read like wildlife photography, not a third army.

| Role | Hex | Notes |
|---|---|---|
| Hide | `#c2bb96` | pale bone (SHIPPED) |
| Stripe | `#5f5c3e` | moss back-stripes/tail |
| Accent | `#a8d060` | venom — sac, spit, drool (biology, not faction; SHIPPED on sac) |
| Eyes/claw | `#e0a43c` | amber — predator eyeshine |
| FX | `#b6e06a` | acid spit glob + trail |

Player-hatched spitters stay teal-hulled (they're YOUR fauna) but keep venom accents.

### The Broodfallen (Act 3 preview) — "what the planet did to Rubicon"
Corrupted red: rust eaten by overgrowth, lit from inside by something wrong.

| Role | Hex | Notes |
|---|---|---|
| Hull | `#8f4a3e` | dead rust — recognizably red's bones |
| Trim | `#4a5540` | overgrowth olive |
| Accent | `#9fd44a` | sickly green — infection glow |
| Biolum | `#b48ad8` | purple bioluminescence, night-light pulsing |
| FX | `#a4e05a` | corrupted acid |

## Character spec sheet

Format: **Name — palette usage — signature detail** (the one thing that must
survive at 30px; procedural overlays can draw these today, art bakes them later).

### Infantry (both human teams; trim/accent from their table)
- **Marine** — hull armor, trim shoulder pads — *accent visor strip across the helmet*
- **Sniper** — trim-heavy cloak (drab, low contrast) — *accent scope glint, one pixel of menace*
- **Medic** — WHITE kit body regardless of team (medical is universal) — *red cross armband + team trim boots*
- **Engineer** — hull coveralls — *accent hard hat (shipped) + steel tool arm*
- **Rocket Trooper** — hull armor, charcoal launch tube — *red warhead tip peeking from the tube*

### Vehicles
- **Harvester** — hull chassis, trim cargo bed — *hazard-stripe scoop + bin glows crystal-teal when loaded (partially shipped)*
- **Raider** — hull wedge — *trim racing stripe nose-to-tail + accent headlight*
- **Tank** — hull mass, trim turret ring — *accent muzzle band on the barrel*
- **APC** — hull box, trim bay doors — *hazard chevrons on the rear ramp*
- **Artillery** — hull carriage, trim recoil rails — *accent bands ringing the long barrel*
- **Capture Rig** — harvester spec + bone-white cage — *xeno-green containment glow when loaded (shipped)*

### Air
- **Gunship** — hull fuselage, trim tail boom — *accent nose sensor ball*
- **Harrier** — hull delta, trim wingtips — *accent engine intake glow*

### Dinos (wild palette; tamed swap hide→team hull, keep venom/eyes)
- **Spitter** — bone hide, moss back-stripes — *venom throat sac (shipped) + amber eyes*
- **Raptor** (future) — moss-forward hide (darker than spitter) — *bone claws + eyeshine*
- **Screecher** (future) — bone wings — *venom membrane webbing*
- **Ironback** (future) — slate plate armor over bone — *moss growing ON the plates*
- **Broodmother** (future) — Broodfallen palette — *purple biolum pulse*

### Buildings (structure hull; trim/accent from team table)
- **HQ** — structure mass — *team-FX beacon pulse (exists) + flag (Rubicon shipped; Expedition pennant TBD)*
- **Barracks** — structure walls — *trim awning stripes over the door*
- **Factory** — structure mass — *hazard-striped bay doors*
- **Supply Depot** — structure pad — *natural wood/steel crates + one trim band*
- **Power Plant** — structure dome — *amber coil glow (shipped as bolt emblem)*
- **Refinery** — structure — *crystal-teal intake glow (exists)*
- **Turret / Flak** — structure base — *steel gun + accent status light when powered*
- **Missile Silo** — structure ring — *red warhead + hazard ring around the doors*
- **Airpad** — structure pad — *white pad markings (exists) + accent landing beacon*

## Implementation phases

- **Phase A — SHIPPED (2026-07-12):** single tint + per-team structure tint
  (`bldSprite`, `COLORS[team].bld`) + Rubicon banner + bone/moss dinos + pinned
  venom accents.
- **Phase B — SHIPPED (2026-07-12):** `COLORS` gained `trim`/`accent`/`fx`
  roles (+ `bld` for all teams — player structures now deep teal); per-class
  overlays in `drawUnitDecor` (visor strips, scope glint, warhead tips, hazard
  scoop ticks + cargo state, racing stripes, muzzle/barrel bands, APC chevrons,
  aircraft sensor/intake dots) and `drawBuildingDecor` (barracks awning, factory
  hazard bay door, depot trim band, turret/flak status light, silo hazard ring)
  — drawn over BOTH sprite and procedural bodies via their own transform.
  `HAZARD_YELLOW` is universal industrial, not a team color. Tracers wear the
  team `fx` role; spitter eyes went amber (predator eyeshine).
- **Phase C — SHIPPED engine-side as COLORWAY SLOTS (2026-07-12):** instead of
  trim masks, the game accepts pre-colored art that bypasses tinting entirely:
  `unit_<type>_teal.png` / `unit_<type>_red.png`, `bld_<type>_teal/_red.png`,
  `unit_spitter_wild.png` (+ `_teal` for tamed), `turret_gun_teal/_red.png`,
  and hunker colorways (`unit_<type>_hunker_teal/_red.png`). When present they
  draw AS-IS; anything missing falls back to tinted neutral art, then
  procedural. Generation workflow + per-character prompts: **STYLE-GUIDE.pdf**
  (generated by `style_guide_pdf.py` in this folder) — built for uploading to
  Gemini. Golden rules: generate the teal colorway with the approved marine
  sprite attached as the style anchor, then image-to-image RECOLOR (never
  regenerate) for the red colorway; crop to sprite bounds; 256px transparent
  PNG. Turret/flak/silo art must omit what the game draws (guns, warhead).
