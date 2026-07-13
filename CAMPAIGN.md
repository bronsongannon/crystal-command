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

### Act 1 — The Crystal War (missions 1–7) — detailed design (2026-07-12)

Teal vs red, pure human RTS — **this is the act that ships in v1**, so it earns
the same depth as the others. Dinos are background wildlife: the nest problem,
scary but neutral. Escalation lever: red mines *recklessly* — strip-mining
nests, tactical nukes — and Lin's warnings accumulate mission by mission so the
Act 2 turn is paid for, not announced. Design bonus: Act 1 doubles as the
systems tutorial — each mission teaches exactly one system that already exists,
so the act needs almost no new engine work.

**M1 — "Landfall."** ✅ BUILT (2026-07-11, reworked 2026-07-12). Establish the
outpost, scout the fields, survive the retaliation probe, capture a live
spitter for Lin. Rubicon's survey fleet burns for the planet in the debrief.

**M2 — "Claim Jumpers."** ✅ BUILT (2026-07-12). First contact with red. Escort your harvester convoy
between two outposts while Krauss's raiders hit-and-run the line — his voice
debut is a *mining claim dispute*, corporate and smug, not military. The war
starts as paperwork with guns. Teaches escorting, raider counters, and reading
the minimap under harassment. *needs: convoy/keepAlive logic — the same tech
M12 "Exodus" reuses in Act 2, so it pays twice.*

**M3 — "The Nest Problem."** ✅ BUILT (2026-07-12). The signature mechanic gets its mission. A rich
field sits under nest guard between your claim and Krauss's; crack it with your
first artillery battery (sight < range — spotters!) while he bulldozes his side
with brute infantry losses broadcast on open comms. Lin objects ON THE RECORD:
"we don't know what these are connected to" — the first seed of Act 2. Egg
salvage introduces hatching your own spitters. *needs: nothing — artillery,
nests, eggs, and capture all exist today.*

**M4 — "Dig In."** Red's answer: his first real offensive. Hold your expansion
through escalating assault waves — and his raiders target your POWER PLANTS
first, teaching the brownout lesson from the receiving end while turrets slow
to half rate. Turrets, flak, repair bays, depot fields, grid discipline: the
whole defensive toolkit in one siege. *needs: survive-N-waves objective
(timer + wave-count trigger).*

**M5 — "Ghost Survey."** The commando raid: no base, one APC of infantry and a
medic, deep in red territory through heavy fog. Destroy three survey relays and
steal Krauss's geological data from his field lab — data that reveals what he's
REALLY drilling toward: a crystal signal too deep and too big to be a deposit.
The Heart Crystal enters the story fifteen missions before anyone sees it.
Teaches APC micro, hunker, medics, and fighting without an economy. *needs:
destroy-tagged-buildings objective (bldGroup dead — small).*

**M6 — "Countdown."** Krauss builds a silo with your HQ's name on it. Kill it
before the launch clock runs out — punching through a defense line built to buy
that clock time. Meanwhile his tac nukes are strip-mining nest fields off-map
and Lin's seismographs are screaming: the direct fuse for M8. Teaches the nuke
endgame from both sides + deadline pressure. *needs: deadline timer objective,
scripted enemy launch event (trigger-driven launchNuke).*

**M7 — "High Water Mark."** The set-piece: break red's forward fortress and win
the war. And you DO — the fortress falls, Vega starts the victory speech… and a
den erupts under the ruins mid-sentence. A raptor pack sweeps the wreckage of
the base you just conquered, and the act ends on Lin, quietly: "They waited
until you were done." Cliffhanger straight into Act 2 — and the v1 cliffhanger
that sells the free update. *needs: Raptor + Raptor Den — already roadmap
item 3.*

### Act 2 — The Awakening (missions 8–13) — detailed design (2026-07-12)

The turn. Red loses the human war to the planet itself, and the player watches it
happen. Krauss goes from rival → desperate → ally across the act; Lin's warnings
become the main plot. Each mission's `needs:` line lists engine work it depends on
(cumulative — later missions assume earlier needs are built).

**M8 — "Strip Mine."** Rubicon strip-mines a nest field with impunity — until it
isn't. Race economy: out-mine Krauss to claim the basin (mine N before a timer /
before his counter hits N), then destroy his forward refinery. Mid-mission his
miners crack a nest cluster with a tactical nuke; Lin's seismographs go wild.
First **Raptor Den** appears at mission end and sends a hunting pack at BOTH sides —
the first time dinos attack unprovoked. *needs: Raptor + Raptor Den (already
planned); `enemyMined` trigger condition; timer objective (`survive`/`deadline`).*

**M9 — "The Silence."** A Rubicon outpost goes dark and Krauss, swallowing pride,
asks the expedition to look. Commando mission (no base, one combat squad + a medic):
push through fog into a wrecked red camp — pre-placed ruined buildings, eggs in the
streets — and discover what did it: **Screechers**, the first flying dinos. Extract
the three surviving red engineers to the LZ. Dread mission; small scale, heavy
fog. *needs: Screecher; `keepAlive` objective (fail if a tagged group dies);
pre-damaged/ruined building spawns in mission specs.*

**M10 — "The Fall."** The one players will remember. Full war footing: destroy
Krauss's main base — the finale Act 1 promised. As his HQ hits half health, the
map edge erupts: a scripted, unkillable swarm (raptor floods + Screecher wings +
the first **Ironbacks**) hits red's base from the far side. His turrets browns
out, his silo dies, his base falls IN REAL TIME while Krauss's voice cracks on
the radio. Objective flips — "destroy Rubicon HQ" is CANCELLED, replaced with
"evacuate through the eastern pass with 8+ units." The swarm does not chase
efficiently (leash walls) — the terror is theater, the escape is winnable.
*needs: objective `cancel`/replace trigger action; scripted swarm spawns with
scale; Ironback; hp-threshold trigger condition (`bldBelow`).*

**M11 — "Strange Bedfellows."** Uneasy truce. Krauss's survivors hold a ruined
fort; you share a map, a wall, and nothing else. Joint defense: allied red AI
units fight beside yours against escalating den waves; you cannot build in his
half, he can't in yours. Krauss and Vega bicker in the dialogue bar; Lin quietly
extracts data from every dino corpse. Win = survive N waves + both HQs standing.
Lose = EITHER HQ falls — protecting the man you spent seven missions fighting.
*needs: **allied AI team** (team 4 or an `allies` flag — the biggest Act 2
engine item: targeting, fog-sharing, wave AI for a friendly faction).*

**M12 — "Exodus."** Escort Krauss's civilian convoy (harvesters + APCs full of
miners) across a den-infested valley to the evac site — the convoy tech from M2,
but reversed: the cargo isn't crystal, it's people, and the road is watched.
**Ironbacks** block the passes like living roadblocks (artillery + rockets crack
them; going around costs time and raptor attrition). Convoy moves when you move
it; every vehicle lost is named in the debrief. *needs: convoy group orders
(reuse M2 escort work); named-unit loss reporting in debrief (cosmetic).*

**M13 — "The Broodmother Wakes."** Act finale: last stand at the evacuation LZ.
Hold the perimeter while transports lift off in waves (each wave = a timer +
a supply-of-units-you-must-keep-alive), against everything the planet has:
raptor floods, Screecher dives, Ironback sieges. As the last transport loads,
the ground splits and the **Broodmother** makes her entrance — invulnerable,
scripted, walking through red's ruins and your abandoned outer wall like paper.
You don't fight her. You LEAVE. Act 3 is about coming back. *needs: Broodmother
(scripted-invulnerable variant only); staged evacuation objectives; `unitLost`
count trigger.*

### Act 3 — Broodfall (missions 14–20) — detailed design (2026-07-12)

The dino-occupied red territory — **the Broodfallen** — is now the enemy: corrupted
red ruins (rust + sickly green tint, overgrowth decals) with nests grown INTO the
buildings. Dens spawn attack packs on timers, corrupted structures are objectives,
and the roster is fully unlocked. Krauss survives as the bitter third voice.
Reuse Act 1 maps overgrown — cheaper AND better storytelling.

**M14 — "Return to Ruin."** Beachhead. Land back in the Act 1 basin — now
unrecognizable: crystal fields doubled in size, red's old expansion buildings
corrupted into spawner-structures. Establish a base under periodic den waves,
clear the valley's three corrupted clusters, hold for extraction of Lin's
sensor package. Teaches the act's grammar: corrupted building = nest that looks
like architecture. *needs: Broodfallen corrupted-building type (nest variant
wearing red building sprites + overgrowth overlay); corrupted-red team color
scheme (COLORS entry + teamSprite pass).*

**M15 — "The Overgrowth."** The corruption SPREADS. Dens multiply on a visible
timer — every 90 seconds a surviving den seeds a new one at a marked site.
Destroy all dens before they hit 12, with the map slowly closing in around your
expansion economy. The mission is a race between your artillery production and
exponential growth; playtests tune the curve. *needs: den-seeding mission logic
(spawn trigger with `repeat` already supports most of it); den-count objective
(`bldCountBelow`).*

**M16 — "Lin's Gambit."** Science mission, the Act 1 capture arc paying off.
Lin can synthesize a pheromone countermeasure — if you bring her THREE live
raptors and the data cores from red's ruined lab row. Capture Rigs return
(now buildable at the Factory for this mission), raptors are fast and furious,
and the lab row is deep in Broodfallen territory. Low army cap; escort-and-grab
gameplay, sneaking past what you can't fight. *needs: rig capture generalized to
raptors (`capturable` unit flag); `collect`-style data-core pickups (reuse egg
pickup code with a new skin).*

**M17 — "The Screeching Sky."** Air supremacy mission. Screecher roosts on
cliff shelves (ringed by impassable rock — only air and artillery reach them)
strangle your mining. Build the expedition's air wing: flak lines to blunt the
dive waves, Harrier strikes on the roosts, gunship screens for the harvesters.
Economy pressure mission — the roosts hunt WORKERS, echoing Act 1 M1's lesson.
*needs: roost = air-focused den variant; nothing else new if M13 shipped.*

**M18 — "Krauss's Debt."** Joint assault, the truce's payoff. Krauss's remnant
brings the guns of his last silo; you bring the army. Crack the outer hive ring
protecting the crater: three fortified corrupted strongpoints, each one falling
lets Krauss reposition his artillery line forward (scripted ally advances).
Finale: his silo fires its last tactical warhead to breach the crater wall —
his arc closes paying his debt. *needs: allied AI from M11; scripted ally
advance triggers (`move` order action on named groups).*

**M19 — "The Mega-Hive."** Siege of the crater. Red's old HQ is now a mega-hive:
a multi-structure fortress of corrupted buildings, den rings, and Ironback
counter-sieges, all feeding off the Heart Crystal glowing beneath. Full 20-30
minute set-piece: expansion economy, power-grid warfare (the hive structures
brown out your forward pylons — flavor reskin of power raids), rolling artillery
fronts. Destroying the hive core exposes the Heart Crystal site and the way in.
*needs: nothing new — this is the "every system at once" mission; it exists to
prove the machine we already built.*

**M20 — "Crystal Command."** Title drop. The Heart Crystal chamber: the
**Broodmother** (killable now, spawning raptor broods while she lives) and
endless den reinforcements. Two mutually exclusive win objectives, both live
from the start — the player's CHOICE is the ending:
- **Shatter it:** siege the Heart Crystal with artillery/nukes — the frenzy
  dies with it, and so does every crystal on the planet. The expedition goes
  home poor and right. (Lin's ending.)
- **Take it:** fight the Capture Rig convoy to the crystal, extract it under
  fire, and haul it to the evac pad. Rubicon's board applauds. The planet
  never forgives. (Krauss's ending — he knows which one his company picks.)
Whichever completes first fires its own outro + winText; the debrief owns the
consequences, no cutscenes needed. *needs: Broodmother (combat version);
`winAny` — alternative win groups in the mission spec (small framework add);
heavy-object haul (rig carry variant with slow speed).*

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

1. ✅ DONE 2026-07-11: **Mission framework** (`MISSIONS` table + objectives/triggers, campaign
   menu with linear unlock, typewriter briefings, in-mission dialogue + objectives HUD,
   world/minimap objective beacons) — shipped with **Mission 1 "Landfall"**: full tutorial
   base-build, scripted spitter probe, scouting the mid-map fields, and capturing a live
   spitter for Dr. Lin with the new **Capture Rig** unit (~10–15 min).
   Cast established: Cpt. Vega (ops), Dr. Lin (xenobiology), Cdr. Krauss (Rubicon — unused yet).
2. ✅ DONE 2026-07-12: **Team color pass** — wild dinos now bone hide / moss shadow
   (COLORS[3]), red structures run a darker corporate tint than red units
   (`COLORS[2].bld` via `bldSprite`), red HQ flies the Rubicon pennant
   (`drawRubiconBanner`), spitter throat sac pinned venom-green (biology, not
   faction). Colorblind rule enforced by luminance ladder: bone .72 / teal .59 /
   red .49 (structures .40).
3. ✅ DONE 2026-07-13: **Raptor + Raptor Den** — engine-side complete (melee raptor, hunting-pack den, both-sides targeting, mission bld spawns); M7 scripts the first appearance

### Engine work implied by Acts 2–3 (rollup, in rough build order)

Framework additions (each small, per the M1 pattern):
- Trigger conditions: `bldBelow` (hp threshold), `enemyMined`, `unitLost` count
- Objective types: timer (`survive`/`deadline`), `keepAlive` (fail if group dies),
  `bldCountBelow`; trigger action `cancel` (replace an objective mid-mission)
- `winAny` — alternative win groups (M20's two endings)
- Mission-spec extras: pre-damaged/ruined building spawns, scripted `move` orders
  for named groups (ally advances)

Bigger systems (schedule deliberately):
- **Allied AI faction** (M11, M18) — the largest single item: friendly team,
  shared fog, wave AI fighting FOR the player
- **Dino roster**: Raptor+Den (Act 1 tease) → Screecher (M9) → Ironback (M10) →
  Broodmother scripted (M13) → Broodmother combat (M20)
- **Broodfallen dressing**: corrupted-red color scheme, nest-buildings wearing
  red sprites + overgrowth overlay, den variants (roost, seeder)
- Capture generalization: `capturable` flag (raptors, M16), heavy-haul rig (M20)
4. Rest of the roster as the acts demand (Screecher → Ironback → Broodmother)
