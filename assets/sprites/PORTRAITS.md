# Dialogue portraits + voice briefs

The dialogue bar now shows a 56px character PiP (`#dlg-face`). Drop art into
these slots and it's picked up automatically next reload (same OPT pattern as
sprites); until then each character shows a colored-initials chip.

| File (assets/sprites/) | Character | Accent color |
| --- | --- | --- |
| `portrait_ops.png` | CPT. VEGA — expedition ops commander | teal `#8fd8cf` |
| `portrait_sci.png` | DR. LIN — xenobiologist | amber `#e8d38a` |
| `portrait_red.png` | CDR. KRAUSS — Rubicon Mining field commander | red `#f0a898` |

**Format:** square PNG, 256×256 is plenty (drawn at 56px). The box crops with
`background-size: cover`, so keep the face centered with headroom. Portraits are
**photorealistic** (Bronson's call, 2026-07-14), NOT the sprite style and not
painted — do not run them through process_sprite.py (keep the full-bleed photo
background, no transparency needed).

**Workflow (same trick that worked for unit art):** generate ONE portrait first,
approve it, then attach it as the style anchor when generating the other two so
the set matches. Recolor/adjust rather than regenerate once a face is approved —
these faces will appear hundreds of times across 20 missions.

## Shared style block (paste into every prompt)

> Photorealistic cinematic character portrait, head-and-shoulders, centered,
> facing slightly off-camera. Shot like a film still: 85mm lens look, shallow
> depth of field, strong single key light, dark muted background with a subtle
> hint of the character's accent color. Retro-futuristic expedition military
> wardrobe, grounded and practical — worn fabric, real materials (Command &
> Conquer live-action briefing energy). Natural skin texture, no smoothing,
> no illustration or painterly style. No text, no watermark, no frame.

## Character prompts (casting suggestions — edit before generating)

**CPT. VEGA (`portrait_ops.png`)** — Expedition ops commander, 40s, weathered
and steady. Practical teal-and-charcoal expedition uniform, short hair, thin
comms headset, faint scar through one eyebrow. Expression: calm command, half a
smile at the corner. Accent color teal (#8fd8cf) in collar piping and rim light.

**DR. LIN (`portrait_sci.png`)** — Xenobiologist, 30s, bright-eyed and a little
too delighted about dangerous wildlife. Khaki field-science jacket over
expedition fatigues, sample vials clipped to the strap, smart glasses pushed up.
Expression: fascinated, mid-thought. Accent color amber (#e8d38a) in the lens
glint and jacket trim.

**CDR. KRAUSS (`portrait_red.png`)** — Rubicon Mining field commander, 50s,
corporate menace in a military shell. Rust-red and gunmetal uniform with the
Rubicon pennant pin, gray stubble, close-cropped hair. Expression: unhurried,
amused, doing billing math with your life. Accent color red (#f0a898) rim light.

## Voice briefs (for the AI-TTS test — one voice per character)

Generate each character reading their test lines below. We want distinct,
real-sounding voices (same bar as the sfx: no robo-voice). If the test passes,
every dialogue line ships as a pre-recorded file keyed to the line.

**VEGA** — mid-range, clipped military cadence, dry warmth. Never excited,
never slow. Test lines:
- "Contacts! They followed the patrol home — marines, weapons free!"
- "Beta's silos are filling — sixty seconds to load the haulers. Dig in, Commander."

**LIN** — quick, warm, fascinated; the danger never dampens the curiosity.
Slight academic precision. Test lines:
- "Nesting colonies, live broods… magnificent. Ah — Commander, they've spotted your patrol."
- "They are not obstructions, they are colonies."

**KRAUSS** — smooth, unhurried, corporate-polite menace. A man reading your
obituary off an invoice. Test lines:
- "Attention, expedition convoy: your cargo is subject to a toll. My associates will collect."
- "A courtesy visit, nothing more. The next one is a billing dispute."
