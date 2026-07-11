# Crystal Command — Campaign & Faction Design Plan

Working design doc (2026-07-11). Covers the ~20-mission campaign arc, per-team color
schemes, and the expanded dino roster. Locked story beat from Bronson: **the red team
loses the human war, dinosaurs overrun their camp mid-campaign, and the dino-occupied
red faction becomes the enemy for the back half.**

---

## Team color schemes

The tint pipeline (`teamSprite()` multiply in game.js) centralizes coloring, so each
scheme is cheap to add. Four identities that tell the story visually:

| Team | Scheme | Notes |
|---|---|---|
| Player | **Teal** (current) | Established, reads great on sand terrain |
| Red team | **Red** (current) + identity touches | A rival mining corporation, not "evil" — slightly darker structures, own HQ banner |
| Wild dinos | **Earthy bone / moss** | Should read as *nature*, not a faction (currently procedural, team 3) |
| The Broodfallen (dino-occupied red) | **Corrupted red** — desaturated rust + sickly green/purple accents, overgrowth decals on captured buildings | Player instantly reads "that used to be red's stuff." One tint change + an overgrowth decal pass gets 80% of it |

Caution: teal-vs-red is colorblind-friendly; keep new colors distinct in **brightness**,
not just hue, so minimap dots stay readable.

---

## Campaign: three acts, ~20 missions

**Prerequisite before writing mission 1:** a tiny mission framework — a `MISSIONS`
table + objectives/triggers system, same data-driven style as `MAPS`. Twenty missions
only work if missions are cheap to author.

### Act 1 — The Crystal War (missions 1–7)

Teal vs red, pure human RTS. You land, establish mining, red contests the crystal
fields. Dinos are background wildlife — the nest problem, scary but neutral.

**Escalation lever:** red mines *recklessly* — strip-mining nests, using nukes —
and briefings drop hints the planet is reacting.

Mission variety across the act:
1. Tutorial base-build
2. Harvester convoy escort
3. First nest crack
4. Base defense
5. Commando raid (no base, one squad)
6. Nuke race
7. Set-piece assault on a red outpost (finale should include a taste of the raptor swarm)

### Act 2 — The Awakening (missions 8–13)

The turn. **Mission ~10 is the one players will remember:** you launch your final
assault on red's main base, and mid-mission a massive dino swarm hits it from the
other side. You watch red's base fall in real time — scripted, unstoppable — and
your objective flips from "destroy red" to "get out alive."

Follow with an uneasy-truce stretch: escorting red survivors, joint defense with red
AI allies, evacuations. Giving the player a mission or two fighting *alongside* red
makes the loss land emotionally — red's fall is earned, not a briefing sentence.

### Act 3 — Broodfall (missions 14–20)

The dino-occupied red camp is now the enemy faction — nests grown into red's ruined
structures, corrupted buildings as objectives. Escalate the dino roster act by act.
Retake red's territory zone by zone.

**Two-stage finale:** crack the mega-hive built in red's old HQ crater, then a final
stand against the Broodmother.

**Ending decision (briefing-level, no cutscenes):** destroy the Heart Crystal that's
driving the frenzy — giving "Crystal Command" a double meaning — or extract it and leave.

### Ship plan

Maps directly onto the "tease then deliver" gate:
- **v1 ships Act 1 + skirmish**
- **Acts 2–3 land as the free update**

20 missions need ~12–15 distinct maps minimum. Reusing maps across acts (same valley,
now overgrown and dino-held) is both cheaper *and* better storytelling.

---

## Dino roster expansion

Current roster: Spitter + Nest. Key constraint: dinos have no economy — they spawn
from nests — so **every new dino comes with a nest variant**, which doubles as the
campaign escalation lever (new act = new nest types on the map).

Engine note: there is no melee system. "Melee" = very short range (~15) — no new
systems needed.

Four species, in build order:

1. **Raptor** — fast melee pack hunter, low HP, bonus vs infantry. Cheapest to build,
   delivers the swarm fantasy. Spawns from a **Raptor Den** that sends periodic hunting
   packs (unlike the defensive spitter nest — this makes dinos *proactive* in Act 2+).
2. **Screecher** (pterosaur) — flying harasser that targets harvesters. Gives dinos an
   air game, makes flak matter vs dinos, attacks the player's economy.
3. **Ironback** (ankylosaur-style) — slow, huge HP, bonus vs buildings. The dino "siege
   tank" — why Act 3 base defense gets scary. Countered by artillery + rocket troopers,
   so the existing RPS keeps working.
4. **Broodmother** — one boss unit for the finale. Spawns raptors while alive, massive
   HP. Campaign-only, so no balance debt.

Hold for post-launch: spitting artillery-dino, burrower. Elite tinted spitter variants
can pad the late acts cheaply.

---

## Order of work

1. **Mission framework** (`MISSIONS` table + objectives/triggers) — prerequisite for everything
2. **Team color pass** — small, and Act 1 needs it
3. **Raptor + Raptor Den** — Act 1's finale wants the swarm tease
4. Rest of the roster as the acts demand (Screecher → Ironback → Broodmother)
