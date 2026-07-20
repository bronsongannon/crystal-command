# Cast portraits — drop-in slots

Portraits for the dialogue PiP (in-game comms panel). Missing file = colored
monogram fallback, nothing breaks.

**Filename = CAST key. PNG only.**

| File | Character | Direction |
|---|---|---|
| `ops.png` | Cpt. Vega — expedition ops commander (teal, `#8fd8cf`) | Squared-away professional soldier; player's steady voice |
| `sci.png` | Dr. Lin — xenobiologist (amber, `#e8d38a`) | Curious, principled scientist; the conscience of the arc |
| `red.png` | Cdr. Krauss — Rubicon Mining field commander (rust, `#f0a898`) | Corporate smug in Act 1 → broken survivor by Act 3 |

Spec: square bust crop, ~256×256px, subject centered and filling the frame
(the PiP shows it at 58px with `object-fit: cover` — faces read best tight).
Match the game's painted style — generate with the same Gemini pipeline as the
sprites (style guide: `assets/sprites/STYLE-GUIDE.md`). Dark/neutral background
preferred; the PiP overlays scanlines and a faction-color border.

Later (optional): expression variants per act — the loader is one map, easy to
extend to `red_broken.png` etc. when the campaign needs them.
