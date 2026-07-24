'use strict';
/* ============================================================
   BROODFALL — a tiny real-time strategy game
   Harvest crystals · train an army · destroy the enemy HQ
   ============================================================ */

// ---------------- DOM ----------------
const cv = document.getElementById('game');
const cx = cv.getContext('2d');
const mini = document.getElementById('minimap');
const mcx = mini.getContext('2d');
const elCrystals = document.getElementById('res-crystals');
const elSupply = document.getElementById('res-supply');
const elWave = document.getElementById('wave-timer');
const elEggs = document.getElementById('res-eggs');
const elCard = document.getElementById('card');
const elQpanel = document.getElementById('qpanel');
const elDock = document.getElementById('dock');
const elToast = document.getElementById('toast');
const elOverlay = document.getElementById('overlay');
const elOvTitle = document.getElementById('ov-title');
const elOvSub = document.getElementById('ov-sub');
const elHelp = document.getElementById('help');
const btnHelp = document.getElementById('btn-help');
const btnMute = document.getElementById('btn-mute');
const btnFog = document.getElementById('btn-fog');
const btnPause = document.getElementById('btn-pause');
const btnQuit = document.getElementById('btn-quit');
const elPauseBanner = document.getElementById('pause-banner');

// ---------------- World ----------------
const TILE = 32, MAP_W = 96, MAP_H = 72;
const W = MAP_W * TILE, H = MAP_H * TILE;      // 3072 x 2304 world px
const view = { w: window.innerWidth, h: window.innerHeight };
let dpr = window.devicePixelRatio || 1;
function resize() {
  dpr = window.devicePixelRatio || 1;
  view.w = window.innerWidth; view.h = window.innerHeight;
  cv.width = view.w * dpr; cv.height = view.h * dpr;
  cv.style.width = view.w + 'px'; cv.style.height = view.h + 'px';
}
window.addEventListener('resize', resize);
resize();

const cam = { x: 0, y: 0 };
function clampCam() {
  cam.x = Math.max(0, Math.min(Math.max(0, W - view.w), cam.x));
  cam.y = Math.max(0, Math.min(Math.max(0, H - view.h), cam.y));
}

// ---------------- Data ----------------
// noAA: this unit's weapon cannot hit flyers. fly: this unit is airborne —
// ignores ground collision, only noAA-free weapons can touch it.
const UNIT = {
  harvester: { label: 'Harvester', cost: 60,  supply: 1, hp: 90,  speed: 1.7,  r: 11, dmg: 2,  range: 26,  cooldown: 50,  buildTime: 6 * 60,  sight: 170, carry: 12, noAA: 1 },
  engineer:  { label: 'Engineer',  cost: 90,  supply: 1, hp: 60,  speed: 1.9,  r: 9,  dmg: 2,  range: 22,  cooldown: 55,  buildTime: 6 * 60,  sight: 190, repair: 0.55, noAA: 1 },
  marine:    { label: 'Marine',    cost: 80,  supply: 1, hp: 70,  speed: 1.9,  r: 9,  dmg: 9,  range: 125, cooldown: 36,  buildTime: 5 * 60,  sight: 200 },
  sniper:    { label: 'Sniper',    cost: 130, supply: 1, hp: 45,  speed: 1.7,  r: 8,  dmg: 30, range: 190, cooldown: 110, buildTime: 7 * 60,  sight: 310 },
  // Unarmed. Follows wounded flesh (infantry + dinos) and patches it up.
  medic:     { label: 'Medic',     cost: 100, supply: 1, hp: 60,  speed: 2.0,  r: 9,  dmg: 0,  range: 0,   cooldown: 0,   buildTime: 6 * 60,  sight: 200, heal: 0.4, noAA: 1 },
  raider:    { label: 'Raider',    cost: 150, supply: 1, hp: 155, speed: 3.0,  r: 11, dmg: 7,  range: 100, cooldown: 20,  buildTime: 6 * 60,  sight: 240 },
  tank:      { label: 'Tank',      cost: 220, supply: 2, hp: 280, speed: 1.25, r: 14, dmg: 34, range: 155, cooldown: 95,  buildTime: 10 * 60, sight: 210, noAA: 1 },
  // Anti-armor specialist: slow rockets that hit vehicles 1.6x — and can hit air.
  rocket:    { label: 'Rocket Trooper', cost: 140, supply: 1, hp: 55, speed: 1.7, r: 9, dmg: 28, range: 160, cooldown: 90, buildTime: 8 * 60, sight: 210, vehBonus: 1.6 },
  // Battle bus: hauls 4 infantry. Light MG, no AA. Cargo dies with the ride.
  apc:       { label: 'APC',       cost: 200, supply: 2, hp: 240, speed: 2.6,  r: 13, dmg: 5,  range: 100, cooldown: 30,  buildTime: 9 * 60,  sight: 220, noAA: 1, cargo: 4 },
  // Air. Fast harasser that flies over everything; helpless targets: tanks,
  // artillery, workers. Countered by marines/snipers/raiders/spitters/turrets.
  gunship:   { label: 'Gunship',   cost: 240, supply: 2, hp: 150, speed: 3.2,  r: 12, dmg: 10, range: 130, cooldown: 18,  buildTime: 11 * 60, sight: 260, fly: 1 },
  // Strike bomber: one devastating bomb per run, then home to the Airpad to rearm.
  harrier:   { label: 'Harrier',   cost: 320, supply: 2, hp: 120, speed: 4.2,  r: 12, dmg: 0,  range: 0,   cooldown: 0,   buildTime: 13 * 60, sight: 240, fly: 1, bomb: 120, bombSplash: 55, bombBldBonus: 1.4 },
  // Siege piece. Shells fly to where the target WAS (no homing) and splash on
  // impact — devastating vs buildings/nests, whiffs vs anything fast. Can't
  // fire inside minRange, and sight < range means it wants spotters.
  artillery: { label: 'Artillery', cost: 270, supply: 2, hp: 110, speed: 0.95, r: 13, dmg: 55, range: 300, minRange: 90, cooldown: 170, buildTime: 12 * 60, sight: 230, splash: 40, bldBonus: 1.5, noAA: 1 },
  // Native wildlife (team 3) — but also hatchable by the player from captured
  // eggs. Cost 0 because nobody buys them with crystals; supply only bites for
  // player-owned ones (supplyUsed is per-team; wild team-3 dinos aren't counted).
  spitter:   { label: 'Spitter',   cost: 0,   supply: 1, hp: 95,  speed: 2.1,  r: 10, dmg: 11, range: 115, cooldown: 44,  buildTime: 0, sight: 200 },
  // Fast melee pack hunter, spawned by Raptor Dens. "Melee" is faked with a very
  // short range (the engine has no melee system and doesn't need one) — fire()
  // skips the projectile and lands the bite directly. Claws shred infantry
  // (infBonus, the flesh mirror of the rocket trooper's vehBonus).
  raptor:    { label: 'Raptor',    cost: 0,   supply: 1, hp: 65,  speed: 3.4,  r: 9,  dmg: 9,  range: 16,  cooldown: 32,  buildTime: 0, sight: 220, noAA: 1, infBonus: 1.5 },
  // Ambient wildlife: harmless grazers that wander campaign maps. No weapon
  // auto-targets them — but a deliberate kill enrages every real dino on the
  // level (dinoRage). Atmosphere with a conscience.
  critter:   { label: 'Grazer',    cost: 0,   supply: 0, hp: 45,  speed: 1.1,  r: 8,  dmg: 0,  range: 0,   cooldown: 0,   buildTime: 0, sight: 120, noAA: 1, stridePx: 85 },
  // Xenobiology field unit: unarmed harvester chassis with a containment cage.
  // Right-click a spitter to capture it (short channel at contact range), then
  // haul it back to the HQ lab. Campaign-granted for now — not in any trains list.
  // supply 0: mission-granted drops must never push a capped player over the
  // limit and silently stall every production queue
  rig:       { label: 'Capture Rig', cost: 140, supply: 0, hp: 150, speed: 2.0, r: 11, dmg: 0, range: 0, cooldown: 0, buildTime: 8 * 60, sight: 210, noAA: 1 },
};
const RIG_CAP_RANGE = 40;        // capture channel starts at contact range
const RIG_CAP_TIME = 3 * 60;     // seconds of channeling to bag a specimen
// req: tech tree — every listed building must STAND (built) on your team before
// you can place this one. The chain: Depot → Barracks → Factory → Airpad → Silo,
// with defenses hanging off the tier that fights their target. Refinery is
// economy and stays ungated. Pre-placed buildings ignore req (only placement checks).
// gen/pow: the power grid — gen produces, pow draws. Demand over capacity =
// LOW POWER: production at half speed, towers fire at half rate, nukes grounded.
const BLD = {
  hq:       { label: 'Headquarters', hp: 3000, w: 96, h: 96, supply: 20, sight: 300, trains: ['harvester', 'engineer'], gen: 8 },
  barracks: { label: 'Barracks',     hp: 1100, w: 78, h: 78, supply: 4,  sight: 250, trains: ['marine', 'sniper', 'medic', 'rocket'], cost: 150, buildTime: 13 * 60, req: ['supply'], pow: 3 },
  factory:  { label: 'Factory',      hp: 1000, w: 88, h: 72, supply: 4,  sight: 220, trains: ['raider', 'tank', 'artillery', 'apc'], cost: 200, buildTime: 15 * 60, req: ['barracks'], pow: 4 },
  // Beyond housing: the depot is the base's logistics hub — it slowly patches
  // up nearby friendly buildings (a weak, free engineer that never wanders off).
  supply:   { label: 'Supply Depot', hp: 500,  w: 56, h: 56, supply: 8,  sight: 180, cost: 100, buildTime: 10 * 60, sink: 1 },
  // Cheap and fragile — the classic raid target. The HQ's reactor covers a
  // small base; every plant past that buys 10 more grid capacity.
  power:    { label: 'Power Plant',  hp: 400,  w: 60, h: 60, supply: 0,  sight: 180, cost: 120, buildTime: 9 * 60, gen: 10, req: ['supply'], sink: 1 },
  refinery: { label: 'Refinery',     hp: 700,  w: 70, h: 70, supply: 0,  sight: 240, cost: 175, buildTime: 12 * 60, req: ['supply'] },
  airpad:   { label: 'Airpad',       hp: 600,  w: 62, h: 62, supply: 2,  sight: 220, trains: ['gunship', 'harrier'], cost: 175, buildTime: 12 * 60, req: ['factory'], pow: 3 },
  // Endgame. Buy warheads here; the defender gets 30 loud seconds to react.
  silo:     { label: 'Missile Silo', hp: 900,  w: 70, h: 70, supply: 0,  sight: 200, cost: 500, buildTime: 20 * 60, req: ['airpad'], pow: 6 },
  turret:   { label: 'Turret',       hp: 450,  w: 40, h: 40, supply: 0,  sight: 260, dmg: 15, range: 200, cooldown: 42, cost: 140, buildTime: 8 * 60, req: ['barracks'], pow: 2 },
  // Dino nest (team 3): guards a rich crystal patch and respawns spitters
  // until it's destroyed. Clear it or mine poor — the expansion gatekeeper.
  // airOnly: this defense only engages flyers
  flak:     { label: 'Flak Turret',  hp: 420,  w: 40, h: 40, supply: 0,  sight: 280, dmg: 14, range: 240, cooldown: 16, cost: 160, buildTime: 8 * 60, airOnly: 1, req: ['factory'], pow: 2 },
  nest:     { label: 'Dino Nest',    hp: 850,  w: 64, h: 64, supply: 0,  sight: 200 },
  // Raptor Den (team 3): the nest's evil twin. Where nests defend a patch, the
  // den HUNTS — periodic raptor packs sent at the nearest structure of ANY
  // faction (dinos are weather, not a team). Act 2's proactive-dino lever;
  // no skirmish map places one yet, missions spawn them via bld triggers.
  den:      { label: 'Raptor Den',   hp: 1100, w: 72, h: 72, supply: 0,  sight: 220 },
};
const DEPOT_HEAL_RADIUS = 240;   // the depot's repair field
const DEPOT_HEAL_RATE = 0.06;    // hp/tick per depot — a fraction of an engineer's 0.55
const BAY_REPAIR_RADIUS = 200;   // factory (ground) / airpad (flyers) vehicle repair bay
const BAY_REPAIR_RATE = 0.5;     // hp/tick — close to an engineer, but…
const BAY_REPAIR_COST = 0.15;    // …it bills you: crystals per hp restored
const NEST_BROOD = 3;          // spitters alive per nest
const NEST_RESPAWN = 7 * 60;   // one replacement every 7s
const NEST_LEASH = 360;        // guards give up the chase past this radius from home
const NEST_EGGS = 3;           // eggs left in the rubble when a nest dies
const NEST_BURST_CD = 30 * 60; // hitting a nest makes 2-3 extra defenders erupt (once per cooldown)
const SPITTER_CAP = 5;         // max hatched spitters a side can field at once
const DEN_GUARDS = 2;          // raptors watching the den door from birth
const DEN_PACK_SIZE = 3;       // raptors per hunting pack
const DEN_PACK_EVERY = 50 * 60; // a new hunt leaves the den every 50s
const DEN_RAPTOR_CAP = 9;      // max living raptors per den — hunts pause at cap
const HARRIER_CAP = 5;         // max harriers a side can field (alive + queued)
const HARRIER_REARM = 7 * 60;  // seconds on the pad between sorties

// ---------------- Maps ----------------
// Every position is explicit — no procedural generation, each map is authored.
// patches: neutral fields; nests: guard positions (per patch, may be several).
const MAPS = {
  basin: {
    label: 'Crystal Basin',
    desc: 'The classic. Twin rich fields mid-map, each watched by a nest.',
    pHQ: [210, H - 210], pRax: [400, H - 140], pPatch: [260, H - 440],
    eHQ: [W - 210, 210], eRax: [W - 400, 140], eFac: [W - 560, 200],
    eSup: [[W - 300, 100], [W - 150, 340]], eTur: [[W - 350, 330], [W - 480, 220]],
    eAir: [W - 660, 300],
    ePatch: [W - 260, 440],
    patches: [
      { p: [W / 2, H / 2 - 200], n: 8, a: 2600, nests: [[W / 2 + 110, H / 2 - 290]] },
      { p: [W / 2, H / 2 + 200], n: 8, a: 2600, nests: [[W / 2 - 110, H / 2 + 290]] },
    ],
    // two staggered ridges pinch the middle into an S-shaped corridor
    ridges: [
      [W * 0.40, H * 0.08, W * 0.50, H * 0.28, 48],
      [W * 0.50, H * 0.72, W * 0.60, H * 0.92, 48],
    ],
    boulders: [[W * 0.17, H * 0.46, 55], [W * 0.83, H * 0.54, 55]],
  },
  gauntlet: {
    label: 'The Gauntlet',
    desc: 'Bases face off across a nest-choked center column. Win the middle, win the game.',
    ground: { base: '#211710', mottle: 'rgba(255,180,110,0.02)', pebble: 'rgba(225,175,120,0.07)', grid: 'rgba(230,185,140,0.026)' },   // rust badlands
    pHQ: [230, H / 2 + 40], pRax: [420, H / 2 + 150], pPatch: [270, H / 2 - 240],
    eHQ: [W - 230, H / 2 - 40], eRax: [W - 420, H / 2 - 150], eFac: [W - 580, H / 2 + 10],
    eSup: [[W - 260, H / 2 + 200], [W - 160, H / 2 - 260]], eTur: [[W - 430, H / 2 + 110], [W - 430, H / 2 - 200]],
    eAir: [W - 620, H / 2 + 170],
    ePatch: [W - 270, H / 2 + 240],
    patches: [
      { p: [W / 2, 260], n: 8, a: 2600, nests: [[W / 2 + 100, 170]] },
      { p: [W / 2, H / 2], n: 9, a: 3000, nests: [[W / 2 - 120, H / 2 - 90]] },
      { p: [W / 2, H - 260], n: 8, a: 2600, nests: [[W / 2 + 100, H - 170]] },
    ],
    // twin walls with a center gate and edge runs — the gauntlet itself
    ridges: [
      [W * 0.34, H * 0.16, W * 0.34, H * 0.40, 46],
      [W * 0.34, H * 0.60, W * 0.34, H * 0.84, 46],
      [W * 0.66, H * 0.16, W * 0.66, H * 0.40, 46],
      [W * 0.66, H * 0.60, W * 0.66, H * 0.84, 46],
    ],
  },
  boneyard: {
    label: 'The Boneyard',
    desc: 'North vs south across three broken lanes — and a monstrously rich middle.',
    ground: { base: '#1b1b1e', mottle: 'rgba(210,215,235,0.016)', pebble: 'rgba(215,215,230,0.075)', grid: 'rgba(185,195,225,0.026)' },   // cold ash flats
    pHQ: [W / 2, H - 200], pRax: [W / 2 + 200, H - 140], pPatch: [W / 2 - 260, H - 380],
    eHQ: [W / 2, 200], eRax: [W / 2 - 200, 140], eFac: [W / 2 - 400, 240],
    eSup: [[W / 2 + 180, 100], [W / 2 - 140, 340]], eTur: [[W / 2 + 260, 330], [W / 2 - 330, 300]],
    eAir: [W / 2 + 350, 250],
    ePatch: [W / 2 + 260, 380],
    patches: [
      { p: [W * 0.16, H * 0.5], n: 8, a: 2600, nests: [[W * 0.16 + 120, H * 0.5 - 120]] },
      { p: [W * 0.84, H * 0.5], n: 8, a: 2600, nests: [[W * 0.84 - 120, H * 0.5 + 120]] },
      { p: [W / 2, H / 2], n: 12, a: 3400, nests: [[W / 2 - 150, H / 2 - 100], [W / 2 + 150, H / 2 + 100]] },
    ],
    // two broken walls make three north-south gates: west run, center punch, east run
    ridges: [
      [W * 0.27, H * 0.36, W * 0.43, H * 0.36, 46],
      [W * 0.57, H * 0.36, W * 0.73, H * 0.36, 46],
      [W * 0.27, H * 0.64, W * 0.43, H * 0.64, 46],
      [W * 0.57, H * 0.64, W * 0.73, H * 0.64, 46],
    ],
    boulders: [[W * 0.08, H * 0.26, 55], [W * 0.92, H * 0.74, 55]],
  },
  valley: {
    label: 'Fossil Valley',
    desc: 'Quiet corner expansions — and a mega-field dead center under double nest guard.',
    ground: { base: '#121a0e', mottle: 'rgba(160,220,120,0.018)', pebble: 'rgba(155,205,135,0.06)', grid: 'rgba(150,220,150,0.028)' },   // deep moss
    // twin overlooks flanking the center approaches — artillery perches with
    // one ramp each (N ramp faces west, S ramp faces east)
    plateaus: [
      { c: [[W * 0.5, H * 0.13, 150]], ramps: [[W * 0.5 - 150, H * 0.13, 95]] },
      { c: [[W * 0.5, H * 0.87, 150]], ramps: [[W * 0.5 + 150, H * 0.87, 95]] },
    ],
    pHQ: [W - 210, H - 210], pRax: [W - 400, H - 140], pPatch: [W - 260, H - 440],
    eHQ: [210, 210], eRax: [400, 140], eFac: [560, 200],
    eSup: [[300, 100], [150, 340]], eTur: [[350, 330], [480, 220]],
    eAir: [660, 300],
    ePatch: [260, 440],
    patches: [
      { p: [W - 320, 320], n: 6, a: 2100, nests: [[W - 440, 250]] },
      { p: [320, H - 320], n: 6, a: 2100, nests: [[440, H - 250]] },
      { p: [W / 2, H / 2], n: 10, a: 3400, nests: [[W / 2 - 130, H / 2 - 110], [W / 2 + 130, H / 2 + 110]] },
    ],
    // a broken ring around the mega-field: gates at N/E/S/W, diagonals blocked
    ridges: [
      [W * 0.37, H * 0.37, W * 0.44, H * 0.29, 44],
      [W * 0.56, H * 0.29, W * 0.63, H * 0.37, 44],
      [W * 0.37, H * 0.63, W * 0.44, H * 0.71, 44],
      [W * 0.56, H * 0.71, W * 0.63, H * 0.63, 44],
    ],
    boulders: [[W * 0.25, H * 0.25, 60], [W * 0.75, H * 0.75, 60]],
  },
};

// ---------------- Difficulty ----------------
// All knobs the AI cares about; 'normal' is the pre-difficulty baseline.
const DIFFS = {
  easy:   { label: 'Easy',    desc: 'Slower assaults, lazier enemy economy. Learn the ropes.',
            firstWave: 150, waveEvery: 1.4, capRate: 1.2, trickle: 0.55, aiUpgrades: false },
  normal: { label: 'Normal',  desc: 'The intended fight.',
            firstWave: 95,  waveEvery: 0.95, capRate: 2.4, trickle: 1.2, aiUpgrades: true, aiNukes: false },
  hard:   { label: 'Hard',    desc: 'Early pressure, relentless waves, a rich enemy. Good luck.',
            firstWave: 75,  waveEvery: 0.75, capRate: 3.2, trickle: 1.8, aiUpgrades: true, aiNukes: true },
  specops: { label: 'Spec Ops', desc: 'The enemy cheats. Openly. Bring everything you have.',
            firstWave: 60,  waveEvery: 0.55, capRate: 4.5, trickle: 2.6, aiUpgrades: true, aiNukes: true },
};
let diff = DIFFS.normal;

// ---------------- Campaign ----------------
// Recurring voices. Lines are plain prefixed text; the dialogue bar shows a
// portrait PiP per speaker (art optional, monogram fallback).
const CAST = {
  ops: { name: 'CPT. VEGA',   color: '#8fd8cf', init: 'V' },   // expedition ops commander
  sci: { name: 'DR. LIN',     color: '#e8d38a', init: 'L' },   // xenobiologist
  red: { name: 'CDR. KRAUSS', color: '#f0a898', init: 'K' },   // Rubicon Mining field commander
};
// Cast portraits (optional art slots, same philosophy as sfx): drop
// assets/portraits/<who>.png (ops/sci/red) — square bust crop, ~256px.
// Missing file = colored monogram fallback in the PiP.
const PORTRAITS = {};
for (const who of Object.keys(CAST)) {
  const img = new Image();
  img.onload = () => { PORTRAITS[who] = img; };
  img.src = 'assets/portraits/' + who + '.png';
}
// Mission specs are pure data, same philosophy as MAPS. Objective types:
// unitCount / built / mined / flag (set by a trigger). hidden objectives appear
// when a trigger activates them. Triggers: {when:{time|done|groupDead|mined},
// delay?, say?, objective?, complete?, spawn?, alarm?}. winWhen lists the
// objective ids that must all be done; player HQ loss is always a defeat.
const MISSIONS = [
  {
    title: 'Landfall', act: 'Act I — The Crystal War',
    map: 'basin', diff: 'easy', noEnemy: true, bare: true,
    // Landfall spreads the neutral fields to opposite corners of the valley so
    // scouting is a real trip — and keeps the nests well away from the base.
    fields: [
      { p: [W * 0.30, H * 0.22], n: 8, a: 2600, nests: [[W * 0.30 + 110, H * 0.22 - 110]] },
      { p: [W * 0.72, H * 0.62], n: 8, a: 2600, nests: [[W * 0.72 + 120, H * 0.62 + 100]] },
    ],
    brief: [
      ['ops', 'Dropships are down and the beacon is live, Commander. This valley holds the richest crystal signature on the planet — and Rubicon Mining wants it as badly as we do.'],
      ['ops', 'Before their survey teams arrive, I want a working outpost: crystals in the bank, rifles on the wall — then push out and map the valley.'],
      ['sci', 'And Commander — the mounds near the large fields are nesting sites. Xenobiology would be very grateful for a look at the local wildlife. A close look.'],
    ],
    intro: [
      ['ops', 'First order of business: more hands on the crystal. Select the HQ and press Q to train another Harvester.'],
    ],
    objectives: [
      { id: 'harv',    text: 'Train another Harvester (HQ — Q)',       type: 'unitCount', unit: 'harvester', count: 4 },
      { id: 'depot',   text: 'Build a Supply Depot (C)',               type: 'built', bld: 'supply', count: 1, hidden: true },
      { id: 'rax',     text: 'Build a Barracks (B)',                   type: 'built', bld: 'barracks', count: 1, hidden: true },
      { id: 'marines', text: 'Train 4 Marines (Barracks — Q)',         type: 'unitCount', unit: 'marine', count: 4, hidden: true },
      { id: 'turret',  text: 'Build a Turret on the perimeter (T)',    type: 'built', bld: 'turret', count: 1, hidden: true },
      { id: 'scout1',  text: 'Scout the northern crystal field',       type: 'reach', x: W * 0.30, y: H * 0.22, r: 250, hidden: true },
      { id: 'scout2',  text: 'Scout the eastern crystal field',        type: 'reach', x: W * 0.72, y: H * 0.62, r: 250, hidden: true },
      { id: 'repel',   text: 'Repel the spitter pack',                 type: 'flag', hidden: true },
      { id: 'capture', text: 'Capture the marked spitter with the Capture Rig (right-click it) and haul it to the HQ', type: 'captive', count: 1, hidden: true, mark: [1050, 1650] },
      { id: 'mine',    text: 'Mine 1000 crystals',                     type: 'mined', amount: 1000 },
    ],
    winWhen: ['harv', 'depot', 'rax', 'marines', 'turret', 'scout1', 'scout2', 'repel', 'capture', 'mine'],
    // The wildlife never hunts what it hasn't seen: the retaliation probe only
    // comes AFTER your patrol is spotted at the fields (playtest feedback).
    triggers: [
      { when: { done: ['harv'] }, objective: 'depot',
        say: [['ops', 'Good. Now stretch our supply line — press C and place a Supply Depot near the base. Nothing else goes up without logistics.']] },
      { when: { done: ['depot'] }, objective: 'rax',
        say: [['ops', 'Depot is up — its crews will quietly patch nearby buildings, and new construction is unlocking. Next: a Barracks, key B.']] },
      { when: { done: ['rax'] }, objective: ['marines', 'turret'],
        say: [['ops', 'Barracks online. Train four Marines — select it and press Q — and anchor a Turret to the perimeter with T. Standard doctrine, even on a quiet world.']] },
      { when: { done: ['marines', 'turret'] }, objective: ['scout1', 'scout2'],
        say: [['ops', 'Perimeter is set. Time to learn the neighborhood — push a patrol out to the two marked crystal fields: one up north, one out east.'],
              ['sci', 'Quietly, Commander. The wildlife hasn\'t noticed us yet — observe them, don\'t provoke them. They only defend what they can see.']] },
      { when: { done: ['scout1', 'scout2'] },
        say: [['sci', 'Nesting colonies, live broods… magnificent. Ah — Commander, they\'ve spotted your patrol. Seismic contacts converging on your base. Fast.']] },
      { when: { done: ['scout1', 'scout2'] }, delay: 12, objective: 'repel', alarm: '⚠ Wildlife closing on the perimeter!',
        spawn: { group: 'probe', unit: 'spitter', team: 3, n: 3, at: [1050, H - 130], order: 'attackhq' },
        say: [['ops', 'Contacts! They followed the patrol home — marines, weapons free!']] },
      { when: { groupDead: 'probe' }, complete: 'repel',
        say: [['ops', 'Clean work. The perimeter holds.'],
              ['sci', 'They only came because we were seen. Noted. Now — before anything else, I need one alive. A living specimen changes everything.']] },
      { when: { groupDead: 'probe' }, delay: 10, objective: 'capture',
        spawn: [
          { group: 'rig',   unit: 'rig',     team: 1, n: 1, at: [380, H - 340] },
          { group: 'scout', unit: 'spitter', team: 3, n: 1, at: [1050, 1650], order: 'guard', specimen: true },
        ],
        say: [['ops', 'Lin\'s Capture Rig just dropped at the base — the caged harvester wearing the green ring. It is the ONLY unit that can take the specimen alive. A lone spitter is prowling the flats, marked on your map and wearing the SAME green ring: select the rig and right-click it. Your troops fire at half rate near the specimen — keep them clear and let the rig work. Lin needs this one breathing.']] },
      // safety nets: the tutorial can't dead-end — a lost rig (or specimen) respawns
      { when: { groupDead: 'scout', notDone: ['capture'], noCaptive: true }, delay: 10, repeat: true,
        spawn: { group: 'scout', unit: 'spitter', team: 3, n: 1, at: [1050, 1650], order: 'guard', specimen: true },
        say: [['sci', 'We lost track of that one. Another is prowling the same ground — send the rig, Commander.']] },
      { when: { groupDead: 'rig', notDone: ['capture'] }, delay: 8, repeat: true,
        spawn: { group: 'rig', unit: 'rig', team: 1, n: 1, at: [380, H - 340] },
        say: [['ops', 'We lost the rig. Orbital is dropping another — they are not cheap, Commander. Patch the next one with an engineer.']] },
    ],
    outro: [
      ['ops', 'Specimen crated, walls manned, stockpile growing. Textbook landfall, Commander.'],
      ['sci', 'Remarkable… its tissue is laced with crystal. They aren\'t just defending territory — they\'re connected to it. I need time. And a much bigger lab.'],
    ],
    winText: 'The expedition has its foothold — and its first live specimen. High above, Rubicon Mining\'s survey fleet has just made its burn for the planet.',
    loseText: 'The outpost fell before it ever stood. Expedition command is reconsidering the landing site.',
  },
  {
    title: 'Claim Jumpers', act: 'Act I — The Crystal War',
    map: 'basin', diff: 'easy', noEnemy: true,
    patches: [[2870, 590, 6, 2200]],   // Survey Post Beta's rich field
    brief: [
      ['ops', 'Survey Post Beta sits on a rich northern field, but its silos are empty and our home patch is thinning. We are opening a convoy route across the valley — today.'],
      ['red', 'Intercepted, unregistered channel: "To the expedition in grid four: this valley is a Rubicon Mining resource corridor. Consider your route subject to... review." — C. Krauss, Field Commander.'],
      ['ops', 'That would be Rubicon. Escort the convoy out and back, Commander — and shoot anything that touches a harvester.'],
    ],
    intro: [
      ['ops', 'The convoy is fueled and your escorts are standing by. Take them north-east along the marked route — swing EAST around the nest mounds, and keep rifles between the raiders and the haulers.'],
    ],
    objectives: [
      { id: 'out',  text: 'Escort the convoy to Survey Post Beta (4+ harvesters alive)', type: 'groupReach', group: 'convoy', x: 2760, y: 520, r: 240, count: 4, mark: [2760, 520] },
      { id: 'back', text: 'Bring the convoy home (4+ harvesters alive)', type: 'groupReach', group: 'convoy', x: 300, y: 2000, r: 260, count: 4, hidden: true, mark: [300, 2000] },
    ],
    winWhen: ['out', 'back'],
    triggers: [
      { when: { time: 0.5 }, crystals: 250,
        spawn: [
          { group: 'convoy', unit: 'harvester', team: 1, n: 6, at: [380, 1960] },
          { unit: 'marine', team: 1, n: 2, at: [470, 1880] },
          { unit: 'rocket', team: 1, n: 2, at: [530, 1930] },
          { bld: 'refinery', team: 1, at: [2700, 470] },
          { bld: 'turret',   team: 1, at: [2570, 560] },
          { bld: 'supply',   team: 1, at: [2820, 360] },
        ] },
      // the toll collectors arrive once the convoy is committed to the road
      { when: { near: [2200, 1250, 500] }, alarm: '⚠ Raiders closing on the convoy!',
        spawn: [
          { unit: 'raider', team: 2, n: 2, at: [2350, 100], to: [2050, 1350] },
          { unit: 'raider', team: 2, n: 1, at: [2990, 1500], to: [2400, 1100] },
        ],
        say: [['red', 'Attention, expedition convoy: you are traversing a Rubicon resource corridor. Per intersystem claim law, your cargo is subject to a toll. My associates will collect.']] },
      { when: { done: ['out'] },
        spawn: [
          { unit: 'marine', team: 1, n: 2, at: [2650, 600] },
          { unit: 'rocket', team: 1, n: 1, at: [2700, 640] },
        ],
        say: [['ops', 'Beta\'s silos are filling — sixty seconds to load the haulers. The post garrison is yours, Commander. Dig in; nobody rolls until the cargo is aboard.'],
              ['red', 'Still rolling? I respect persistence. My accountants do not.']] },
      // the loading siege: Krauss hits the post while the convoy is pinned
      { when: { done: ['out'] }, delay: 10, alarm: '⚠ Raiders hitting Survey Post Beta!',
        spawn: [
          { unit: 'raider', team: 2, n: 3, at: [2990, 200], to: [2760, 520] },
          { unit: 'tank',   team: 2, n: 1, at: [2200, 60],  to: [2700, 470] },
        ],
        say: [['red', 'You parked a fortune in my corridor. Collections — move in.']] },
      { when: { done: ['out'] }, delay: 60, objective: 'back',
        say: [['ops', 'Cargo aboard! Turn it around, Commander — the road home is never the same road.']] },
      // they set the southern ambush AHEAD of the convoy, on the home stretch
      { when: { done: ['out'] }, delay: 70, alarm: '⚠ Ambush forming on the southern leg!',
        spawn: [
          { unit: 'raider', team: 2, n: 4, at: [1500, 2240], to: [900, 1900] },
          { unit: 'raider', team: 2, n: 3, at: [60, 1400], to: [500, 1850] },
        ] },
      // background pressure: toll collectors every so often until it's over
      { when: { time: 100, notDone: ['back'] }, repeat: true, every: 45,
        spawn: { unit: 'raider', team: 2, n: 1, at: [2200, 60], to: [350, 1950] } },
      // lose the convoy, lose the contract
      { when: { groupBelow: ['convoy', 4] }, lose: true },
    ],
    outro: [
      ['ops', 'Convoy home, silos full, and every raider they sent is cooling in the flats. That is a route, Commander.'],
      ['red', 'A courtesy visit, nothing more. The next one is a billing dispute.'],
      ['sci', 'Odd detail: the raiders drove within meters of two nest mounds and the broods never stirred. The wildlife has... opinions about who it minds.'],
    ],
    winText: 'The route is open — and Rubicon now knows your convoy schedule. This stopped being a survey the moment Krauss put a price on the road.',
    loseText: 'The convoy is scrap on the valley floor. Survey Post Beta goes hungry, and Krauss bills the expedition for "corridor cleanup."',
  },
  {
    title: 'The Nest Problem', act: 'Act I — The Crystal War',
    map: 'valley', diff: 'easy', noEnemy: true,
    brief: [
      ['ops', 'Dead center of Fossil Valley: the richest field either outfit has surveyed, and two nest mounds sitting on it like a padlock.'],
      ['red', 'Open broadcast, Rubicon side of the valley: "Clearance operations commence at dawn. The mounds are geological obstructions. Bonuses per acre cleared."'],
      ['sci', 'They are not obstructions, they are colonies. And since nobody will stop the dig — at least let me show you how to take one apart properly. From a distance.'],
    ],
    intro: [
      ['ops', 'Rubicon is throwing riflemen at their mound and calling it a strategy. We do math instead: build a Factory — key V.'],
    ],
    objectives: [
      { id: 'fac',   text: 'Build a Factory (V)', type: 'built', bld: 'factory', count: 1 },
      { id: 'arty',  text: 'Field two Artillery (Factory — D)', type: 'unitCount', unit: 'artillery', count: 2, hidden: true },
      { id: 'nest',  text: 'Destroy the southern nest — from beyond its leash', type: 'destroy', bld: 'nest', x: 1666, y: 1262, r: 160, hidden: true, mark: [1666, 1262] },
      { id: 'hatch', text: 'Salvage an egg and hatch your own Spitter (HQ — R)', type: 'unitCount', unit: 'spitter', count: 1, hidden: true },
      { id: 'mine8', text: 'Mine 800 crystals', type: 'mined', amount: 800 },
    ],
    winWhen: ['fac', 'arty', 'nest', 'hatch', 'mine8'],
    triggers: [
      { when: { done: ['fac'] }, objective: 'arty',
        say: [['ops', 'Factory online. Two Artillery — key D. Their guns out-range their own eyes, so walk a marine ahead as a spotter.']] },
      { when: { done: ['arty'] }, objective: 'nest',
        say: [['sci', 'On the record: I object to this entire doctrine. Off the record — your shells fly farther than the brood will chase. Park past their leash and the mound cannot answer you.'],
              ['ops', 'You heard the doctor. Crack the southern mound, Commander. Artillery talks, everybody walks.']] },
      // Rubicon's clearance "strategy", on open comms, forever
      { when: { time: 75, notDone: ['nest'] },
        say: [['red', 'First shift, forward! Every acre of mound is an acre of bonus!']] },
      { when: { time: 78, notDone: ['nest'] }, repeat: true, every: 55,
        spawn: { unit: 'marine', team: 2, n: 4, at: [420, 320], to: [1406, 1042] } },
      { when: { time: 170, notDone: ['nest'] },
        say: [['red', '...Casualty reports are a rounding error. Second shift, forward. Payroll — stop counting.']] },
      { when: { time: 290, notDone: ['nest'] },
        say: [['red', 'Where is my third shift? ...Fine. Contractors, then. Contractors love bonuses.']] },
      { when: { done: ['nest'] }, objective: 'hatch',
        say: [['ops', 'Mound down, brood scattered, nobody scratched. Salvage crew — those eggs ride home with the crystal.'],
              ['sci', 'Careful with the clutch! I want one incubated. If we cannot stop the digging, we will at least understand what it wakes.']] },
    ],
    outro: [
      ['ops', 'The field is ours and Rubicon is still feeding riflemen to their own mound. Efficiency, Commander.'],
      ['sci', 'The moment our mound fell, the seismic hum deepened — and two valleys over, something answered it. I am filing that under "later."'],
    ],
    winText: 'The mega-field is under expedition control. On the survey charts, the hum keeps spreading — deeper, and wider.',
    loseText: 'The nest problem solved you instead. Survey command is re-reading Dr. Lin\'s objection with fresh respect.',
  },
];

// Research, StarCraft-style: bought at the producing building, occupies its queue.
// Levels live on teams[t].up; effects applied via weaponMult/armorMult/carryCap/effSpeed.
const UPG = {
  infWeapons: { label: 'Infantry Weapons', at: 'barracks', max: 3, cost: [100, 175, 250], time: [20 * 60, 25 * 60, 30 * 60] },
  infArmor:   { label: 'Infantry Armor',   at: 'barracks', max: 3, cost: [100, 175, 250], time: [20 * 60, 25 * 60, 30 * 60] },
  vehWeapons: { label: 'Vehicle Weapons',  at: 'factory',  max: 3, cost: [125, 200, 275], time: [22 * 60, 27 * 60, 32 * 60] },
  vehArmor:   { label: 'Vehicle Armor',    at: 'factory',  max: 3, cost: [125, 200, 275], time: [22 * 60, 27 * 60, 32 * 60] },
  harvest:    { label: 'Harvester Systems', at: 'hq',      max: 3, cost: [125, 200, 275], time: [20 * 60, 25 * 60, 30 * 60] },
};
const IS_INF = { marine: 1, sniper: 1, engineer: 1, medic: 1, rocket: 1 };
const IS_DINO = { spitter: 1, raptor: 1, critter: 1 };
const isFlesh = (u) => !!IS_INF[u.type] || !!IS_DINO[u.type];   // what a medic can heal: infantry + dinos
const isVehicle = (u) => u.kind === 'unit' && !IS_INF[u.type] && !IS_DINO[u.type];   // what an engineer can repair
// Veterancy: every unit remembers its kills. 2/4/8 kills → +10% damage and
// −8% damage taken per rank, and Legends (rank 3) slowly self-heal.
const RANK_AT = [2, 4, 8];
const RANK_NAMES = ['', 'Veteran', 'Elite', 'Legend'];
const rankOf = (u) => (u.kills >= RANK_AT[2] ? 3 : u.kills >= RANK_AT[1] ? 2 : u.kills >= RANK_AT[0] ? 1 : 0);
const weaponMult = (e) => e.kind === 'unit'
  ? (1 + 0.12 * teams[e.team].up[IS_INF[e.type] ? 'infWeapons' : 'vehWeapons']) * (1 + 0.10 * rankOf(e)) : 1;
const armorMult = (e) => e.kind === 'unit'
  ? (1 - 0.10 * teams[e.team].up[IS_INF[e.type] ? 'infArmor' : 'vehArmor']) * (1 - 0.08 * rankOf(e)) : 1;
const carryCap = (u) => UNIT.harvester.carry + 3 * teams[u.team].up.harvest;
const effSpeed = (u) => u.speed * (u.type === 'harvester' ? 1 + 0.10 * teams[u.team].up.harvest : 1);

const PLACE_NEAR_BASE = 300;       // most buildings must go near an existing friendly building
const REFINERY_NEAR_CRYSTAL = 240; // refineries instead must go near a live crystal patch
const SUPPLY_HARD_CAP = 100;
// player-placeable buildings and their hotkeys (shown on the command card)
const BUILD_MENU = [['turret', 'T'], ['barracks', 'B'], ['factory', 'V'], ['supply', 'C'], ['power', 'O'], ['refinery', 'G'], ['airpad', 'X'], ['flak', 'Y'], ['silo', 'N']];
// tech tree checks (see BLD req fields)
function hasTech(team, type) {
  if (devMode && team === 1) return true;   // dev mode: the whole tree, no prerequisites
  const req = BLD[type].req;
  return !req || req.every(r => buildings.some(b => b.team === team && b.type === r && b.built >= 1));
}
const techLabel = (type) => (BLD[type].req || []).map(r => BLD[r].label).join(' + ');
// Team color schemes (CAMPAIGN.md). Colorblind rule: the three teams separate
// by BRIGHTNESS, not just hue — teal mid (lum ~.59), red dark (~.49), wild
// dinos pale bone (~.72) — so minimap dots stay readable under any color vision.
// bld: optional darker tint for STRUCTURES (red's identity touch — Rubicon
// architecture reads heavier than its vehicles). Wild dinos read as *nature*,
// not a faction: bone hide, moss darks. Broodfallen (corrupted red) comes in Act 3.
// Five-role palettes (assets/sprites/STYLE-GUIDE.md): main=hull, trim=panels,
// accent=lights/tips (the 5% that pops), bld=structures, fx=projectiles/glow.
const COLORS = {
  1: { main: '#3fb9c9', dark: '#1e6570', light: '#9fe8ef', trim: '#e8e4d8', accent: '#f0c86a', bld: '#2f97a6', fx: '#9fe8ef' },
  2: { main: '#e0564a', dark: '#7c2a24', light: '#f5a89a', trim: '#3a3f45', accent: '#f2b63d', bld: '#b8443a', fx: '#f5a89a' },
  3: { main: '#c2bb96', dark: '#5f5c3e', light: '#eae4cb', trim: '#5f5c3e', accent: '#a8d060', bld: '#c2bb96', fx: '#b6e06a' },   // dinos: bone hide, moss, venom
};
const HAZARD_YELLOW = '#f2b63d';   // industrial hazard striping is universal, not a team color
const CRYSTAL_COLOR = '#6fe3d0';

// ---------------- State ----------------
let nextId = 1;
let units = [], buildings = [], crystals = [], bullets = [], fxs = [], eggs = [];
let rocks = [];   // impassable terrain circles {x, y, r} — flyers ignore them
let nukes = [];          // inbound warheads {x, y, team, tier, t, max}
let nukeTargeting = null;   // the silo currently picking a target
const NUKE = {
  tac: { label: 'Tactical Nuke', cost: 10000, radius: 170, dmg: 1300, hqSafe: true },
  hq:  { label: 'Bunker Buster', cost: 25000, radius: 200, dmg: 3200, hqSafe: false },
};
const NUKE_COUNTDOWN = 30 * 60;     // both sides get 30 loud seconds
const NUKE_HQ_EXCLUSION = 180;      // tactical warheads can't be aimed at an HQ itself (blast still spares HQs entirely)
const newUp = () => ({ infWeapons: 0, infArmor: 0, vehWeapons: 0, vehArmor: 0, harvest: 0 });
// team 3 = neutral dinos — no economy, but weaponMult/armorMult index into it
const teams = {
  1: { crystals: 180, eggs: 0, captives: 0, up: newUp() },
  2: { crystals: 180, eggs: 0, captives: 0, up: newUp() },
  3: { crystals: 0, eggs: 0, captives: 0, up: newUp() },
};
let tick = 0;
let gameOver = null;                 // null | 'win' | 'lose'
let waveAt = 100 * 60, waveNum = 0;  // first enemy assault at 100s
let muted = false;
let fogMemory = true;   // true = explored ground stays dimly visible; false = re-fogs to black

// ---------------- Utils ----------------
const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
const dist = (x1, y1, x2, y2) => Math.sqrt(dist2(x1, y1, x2, y2));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isCombat = (u) => u.type !== 'harvester' && u.type !== 'engineer' && u.type !== 'medic' && u.type !== 'rig' && u.type !== 'critter';

// ---------------- FX sprites (Kenney particle packs, CC0 — see assets/fx/) ----------------
// If the images fail to load (e.g. moved/deleted), spritesReady stays false and
// every effect falls back to the original procedural drawing.
const SPR = { explosion: [], smoke: [], puff: [], shotLarge: new Image(), shotThin: new Image() };
let spritesReady = false;
(function loadSprites() {
  let pending = 0, failed = false;
  const done = () => { if (--pending === 0 && !failed) spritesReady = true; };
  const load = (img, src) => { pending++; img.onload = done; img.onerror = () => { failed = true; }; img.src = src; return img; };
  for (let i = 0; i < 9; i++) SPR.explosion.push(load(new Image(), 'assets/fx/explosion' + i + '.png'));
  for (let i = 0; i < 8; i++) SPR.smoke.push(load(new Image(), 'assets/fx/smoke' + i + '.png'));
  for (let i = 0; i < 6; i++) SPR.puff.push(load(new Image(), 'assets/fx/puff' + i + '.png'));
  load(SPR.shotLarge, 'assets/fx/shot_large.png');
  load(SPR.shotThin, 'assets/fx/shot_thin.png');
})();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------------- Body sprites (units & buildings) ----------------
// Kenney Top-Down Tanks / Top-Down Shooter / Tower Defense packs (CC0).
// Same deal as the FX: if anything fails to load, bodiesReady stays false and
// units/buildings keep their procedural look.
const BODY = {};
let bodiesReady = false;
(function loadBodies() {
  const names = ['tank_body', 'tank_barrel', 'raider_barrel', 'crate',
    'inf_marine', 'inf_sniper', 'inf_engineer',
    'bld_plate', 'bld_plate_oct', 'turret_gun', 'bld_vent_a', 'bld_vent_b'];
  let pending = names.length, failed = false;
  for (const n of names) {
    const i = new Image();
    i.onload = () => { if (--pending === 0 && !failed) bodiesReady = true; };
    i.onerror = () => { failed = true; };
    i.src = 'assets/sprites/' + n + '.png';
    BODY[n] = i;
  }
})();

// Optional art slots — no files exist for these yet. Drop a PNG with the
// right name into assets/sprites/ and it's used automatically next reload;
// until then the procedural drawing stays. See assets/sprites/ART-WANTED.md.
const OPT = {};
(function loadOptional() {
  const names = ['dino_spitter', 'dino_nest', 'dino_den', 'gunship', 'artillery', 'egg', 'medic', 'rocket_trooper', 'apc', 'harrier'];
  for (const k in UNIT) names.push('unit_' + k);   // unit_marine.png, unit_tank.png, …
  for (const k in BLD) if (k !== 'nest' && k !== 'den') names.push('bld_' + k);   // bld_hq.png, … (dino structures use dino_* slots)
  names.push('unit_marine_hunker', 'unit_sniper_hunker', 'unit_artillery_hunker');   // dug-in poses
  names.push('rock', 'crystal');   // terrain art (natural colors, not tinted)
  // pre-colored colorway slots (STYLE-GUIDE.pdf / Gemini pipeline): drawn AS-IS,
  // no team tint. _teal = team 1, _red = team 2, _wild = untamed dinos.
  for (const k in UNIT) names.push('unit_' + k + '_teal', 'unit_' + k + '_red');
  for (const k in BLD) if (k !== 'nest' && k !== 'den') names.push('bld_' + k + '_teal', 'bld_' + k + '_red');
  names.push('unit_marine_hunker_teal', 'unit_marine_hunker_red',
    'unit_sniper_hunker_teal', 'unit_sniper_hunker_red',
    'unit_artillery_hunker_teal', 'unit_artillery_hunker_red',
    'unit_spitter_wild', 'unit_raptor_wild', 'unit_critter_wild', 'turret_gun_teal', 'turret_gun_red');
  // animation frame slots. Any prefix of frames works — the game uses however
  // many it finds. death: sliced from Gemini spritesheets. walk: sliced from
  // AI walk-in-place videos via slice_walk.py (2026-07-20, DaVinci marine first;
  // units without walk art keep the procedural sway fallback).
  for (const k in UNIT) {
    for (const cw of ['_teal', '_red', '_wild']) {
      for (let i = 1; i <= 4; i++) names.push('unit_' + k + '_death' + i + cw);
      for (let i = 1; i <= 8; i++) names.push('unit_' + k + '_walk' + i + cw);
    }
  }
  for (const n of names) {
    const i = new Image();
    OPT[n] = { img: i, ok: false };
    i.onload = () => { OPT[n].ok = true; };
    i.onerror = () => { OPT[n].err = true; };   // settled-absent, distinct from still-loading
    i.src = 'assets/sprites/' + n + '.png';
  }
})();
const opt = (n) => (OPT[n] && OPT[n].ok) ? OPT[n].img : null;

// team-color tinted copies, built once per (sprite, tint) on first use
const tintCache = new Map();
function teamSprite(img, team, tint) {
  tint = tint || COLORS[team].main;
  const key = img.src + '|' + tint;
  let c = tintCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'multiply';          // team color, keeps shading
    g.fillStyle = tint;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';    // restore transparency
    g.drawImage(img, 0, 0);
    tintCache.set(key, c);
  }
  return c;
}
// structures can run a darker tint than the team's vehicles (red's identity touch)
const bldSprite = (img, team) => teamSprite(img, team, COLORS[team].bld || COLORS[team].main);
// pre-colored colorway art (Gemini pipeline): full-color sprites that bypass
// the tint entirely. Missing files fall through to tinted neutral art as ever.
const CW = { 1: '_teal', 2: '_red', 3: '_wild' };
const optCW = (base, team) => opt(base + (CW[team] || ''));
// animation frames: consecutive numbered slots, memoized once found (images
// load async, so an empty result is retried until the files settle)
const animCache = {};
function animFrames(type, kind, team, max) {
  const key = type + kind + team;
  const hit = animCache[key];
  if (hit && hit.length) return hit;
  const a = [];
  let settled = true;
  for (let i = 1; i <= max; i++) {
    const n = 'unit_' + type + '_' + kind + i + (CW[team] || '');
    const f = opt(n);
    if (f) { a.push(f); continue; }
    // stop at the first missing frame — but only memoize if that slot has
    // SETTLED (unregistered or 404'd). A still-loading slot means the prefix
    // may grow: return it uncached and re-collect until the files decide.
    settled = !OPT[n] || !!OPT[n].err;
    break;
  }
  if (a.length && settled) animCache[key] = a;
  return a;
}

// world px of ground covered per full walk cycle — cadence knob for walk
// frames (smaller = faster leg churn; feet look planted when this ≈ sprite size).
// UNIT[type].stridePx overrides per unit: heavy quadrupeds need a long stride
// or their amble plays back frantic (grazer playtest 2026-07-21).
const WALK_STRIDE_PX = 34;
const strideOf = (t) => UNIT[t].stridePx || WALK_STRIDE_PX;

// distance from unit/building center to the muzzle tip of its drawn barrel
const MUZZLE_LEN = { marine: 15, sniper: 24, rocket: 16, raider: 17, tank: 22, artillery: 28, gunship: 13, turret: 22, flak: 20, engineer: 11, harvester: 12 };
const FX_CAP = 450;

// "base under attack" alerts: pulsing minimap pings + a throttled alarm
// end-of-match scoreboard for the player
let stats = { built: 0, lost: 0, kills: 0, mined: 0 };

let alerts = [];          // {x, y, t}
let lastAlert = -1e9;
let lastNoRefinery = -1e9;   // throttled 'nowhere to deliver' warning
function raiseAlert(x, y, msg) {
  alerts.push({ x, y, t: 0 });
  if (tick - lastAlert < 12 * 60) return;   // one alarm per 12s, pings always show
  lastAlert = tick;
  toast(msg);
  snd.alarm();
}

let shakeAmp = 0;
function addShake(x, y, amp) {
  if (!isVisibleAt(x, y)) return;
  if (x < cam.x - 100 || x > cam.x + view.w + 100 || y < cam.y - 100 || y > cam.y + view.h + 100) return;
  // normal cap is 14; a single huge event (HQ collapse) may exceed it up to its own amp
  shakeAmp = Math.min(Math.max(14, amp), shakeAmp + amp);
}

function fxSprite(o) {
  if (fxs.length > FX_CAP) return;
  fxs.push(Object.assign({
    kind: 'sprite', t: 0, delay: 0, vx: 0, vy: 0,
    rot: Math.random() * Math.PI * 2, rotV: 0, a0: 1, a1: 0, add: false,
  }, o));
}
function fxExplosion(x, y, size, big) {
  addShake(x, y, big ? 9 : Math.min(6, size * 0.3));
  if (!spritesReady) return;
  const nf = big ? 4 : 2;
  for (let i = 0; i < nf; i++) {
    const off = i ? size * 1.1 : 0;
    fxSprite({
      img: pick(SPR.explosion),
      x: x + (Math.random() - 0.5) * off, y: y + (Math.random() - 0.5) * off,
      s0: size * 0.9, s1: size * (big ? 3.2 : 2.4),
      max: (big ? 30 : 20) + i * 4, delay: i * 4,
      rotV: (Math.random() - 0.5) * 0.05, add: true,
    });
  }
  const ns = big ? 6 : 3;
  for (let i = 0; i < ns; i++) {
    fxSprite({
      img: pick(SPR.smoke),
      x: x + (Math.random() - 0.5) * size, y: y + (Math.random() - 0.5) * size,
      vx: (Math.random() - 0.5) * 0.5, vy: -0.25 - Math.random() * 0.4,
      s0: size * 0.8, s1: size * (big ? 2.6 : 2), a0: 0.55,
      max: (big ? 90 : 55) + Math.random() * 20, delay: 6 + i * (big ? 6 : 4),
      rotV: (Math.random() - 0.5) * 0.02,
    });
  }
}
function fxDamageSmoke(x, y, size) {
  if (!spritesReady) return;
  fxSprite({
    img: pick(SPR.smoke), x, y: y - size * 0.3,
    vx: (Math.random() - 0.5) * 0.3, vy: -0.35 - Math.random() * 0.25,
    s0: size * 0.7, s1: size * 2, a0: 0.6,
    max: 70 + Math.random() * 30, rotV: (Math.random() - 0.5) * 0.015,
  });
}
// open flame for badly damaged things — flickers bright then dies fast
function fxDamageFire(x, y, size) {
  if (!spritesReady) return;
  fxSprite({
    img: pick(SPR.explosion), x, y,
    vy: -0.15, s0: size * 0.6, s1: size,
    a0: 0.9, max: 14 + Math.random() * 8,
    rotV: (Math.random() - 0.5) * 0.06, add: true,
  });
}
function fxMinePuff(c, u) {
  if (!spritesReady) return;
  const a = Math.atan2(u.y - c.y, u.x - c.x);
  fxSprite({
    img: pick(SPR.puff),
    x: c.x + Math.cos(a) * (c.r + 2), y: c.y + Math.sin(a) * (c.r + 2),
    vx: Math.cos(a) * 0.3, vy: Math.sin(a) * 0.3 - 0.15,
    s0: 6, s1: 16, a0: 0.4, max: 26,
  });
}
function fxMuzzle(src, kind) {
  if (!spritesReady || fxs.length > FX_CAP) return;
  const len = MUZZLE_LEN[src.type] || 16;
  const tipX = src.x + Math.cos(src.faceA) * len, tipY = src.y + Math.sin(src.faceA) * len;
  fxs.push({
    kind: 'muzzle', img: kind === 'shell' ? SPR.shotLarge : SPR.shotThin,
    x: tipX, y: tipY, a: src.faceA,
    s: kind === 'shell' ? 30 : kind === 'snipe' ? 22 : 14,
    t: 0, max: kind === 'shell' ? 7 : 5,
  });
  if (kind === 'shell') {
    fxSprite({
      img: pick(SPR.puff),
      x: tipX + Math.cos(src.faceA) * 6, y: tipY + Math.sin(src.faceA) * 6,
      vx: Math.cos(src.faceA) * 0.6, vy: Math.sin(src.faceA) * 0.6,
      s0: 8, s1: 22, a0: 0.5, max: 30,
    });
    addShake(src.x, src.y, 1.5);
  }
}

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------- Fog of war ----------------
// One cell per map tile. `explored` is permanent; `visible` is what your
// units/buildings can currently see (recomputed every few ticks).
const fogW = MAP_W, fogH = MAP_H;
const explored = new Uint8Array(fogW * fogH);
const visible = new Uint8Array(fogW * fogH);
const fogCv = document.createElement('canvas');
fogCv.width = fogW; fogCv.height = fogH;
const fogCx = fogCv.getContext('2d');
const fogImg = fogCx.createImageData(fogW, fogH);

function fogCell(wx, wy) {
  const gx = Math.max(0, Math.min(fogW - 1, Math.floor(wx / TILE)));
  const gy = Math.max(0, Math.min(fogH - 1, Math.floor(wy / TILE)));
  return gy * fogW + gx;
}
const isVisibleAt = (wx, wy) => visible[fogCell(wx, wy)] === 1;
const isExploredAt = (wx, wy) => explored[fogCell(wx, wy)] === 1;
// what the player can currently make out on screen (depends on the fog-memory toggle)
const isShownAt = (wx, wy) => {
  const i = fogCell(wx, wy);
  return visible[i] === 1 || (fogMemory && explored[i] === 1);
};

// ---------------- Elevation (vision high ground) ----------------
// Plateaus are authored per map (MAPS.plateaus): raised discs whose rims grow
// a chain of cliff slabs (impassable — ramps are the only ground route up) and
// whose tiles sit at elev 1. Rules: low ground never REVEALS high tiles, and
// nothing AUTO-acquires a target standing above it. Explicit orders and
// retaliation still pierce; flyers ignore elevation entirely.
const elev = new Uint8Array(MAP_W * MAP_H);
const elevAt = (wx, wy) => elev[fogCell(wx, wy)];

function stampVision(x, y, r, fly) {
  const cx0 = Math.floor(x / TILE), cy0 = Math.floor(y / TILE);
  const cr = Math.ceil(r / TILE), r2 = r * r;
  const ve = fly ? 9 : elev[fogCell(x, y)];   // flyers see over cliffs
  for (let gy = Math.max(0, cy0 - cr); gy <= Math.min(fogH - 1, cy0 + cr); gy++) {
    for (let gx = Math.max(0, cx0 - cr); gx <= Math.min(fogW - 1, cx0 + cr); gx++) {
      const dx = (gx + 0.5) * TILE - x, dy = (gy + 0.5) * TILE - y;
      if (dx * dx + dy * dy <= r2) {
        const i = gy * fogW + gx;
        if (elev[i] > ve) continue;   // the cliff top stays dark from below
        visible[i] = 1; explored[i] = 1;
      }
    }
  }
}
let devReveal = false;   // dev mode: the whole map, no fog — for judging layouts
let devMode = false;     // cheat mode: free tech + bottomless crystals (Space x5 over the ? chip)
let dinoRage = 0;        // every murdered grazer makes the planet's dinos angrier (wider aggro, faster respawns)
const dinoAggro = () => Math.min(dinoRage * 25, 150);
let wildSeen = false;    // has the player laid eyes on any wildlife yet? Roamers stay clear of camp until then
// nearest standing player building within r — shared by the shy-wildlife logic
function nearestPlayerBld(x, y, r) {
  let best = null, bd = r * r;
  for (const b of buildings) {
    if (b.team !== 1 || b.hp <= 0) continue;
    const d2b = dist2(x, y, b.x, b.y);
    if (d2b < bd) { bd = d2b; best = b; }
  }
  return best;
}
function updateFog() {
  if (devReveal) {
    visible.fill(1); explored.fill(1);
    const d = fogImg.data;
    for (let i = 0; i < visible.length; i++) d[i * 4 + 3] = 0;
    fogCx.putImageData(fogImg, 0, 0);
    return;
  }
  visible.fill(0);
  for (const u of units) if (u.team === 1) stampVision(u.x, u.y, UNIT[u.type].sight, u.fly);
  for (const b of buildings) if (b.team === 1) stampVision(b.x, b.y, BLD[b.type].sight);
  const d = fogImg.data;
  for (let i = 0; i < visible.length; i++) {
    d[i * 4 + 3] = visible[i] ? 0 : (fogMemory && explored[i]) ? 150 : 255;   // rgb stays black
  }
  fogCx.putImageData(fogImg, 0, 0);
}

// ---------------- Audio ----------------
let actx = null;
let lastShotSound = 0;
function audioInit() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ } }
  if (actx && actx.state === 'suspended') actx.resume();
}
function beep(freq, dur, type, vol, slideTo) {
  if (muted || !actx) return;
  try {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, actx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), actx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.04, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { /* ignore */ }
}
// Sample sfx (optional, like the OPT sprite slots): drop assets/sfx/<name>.wav|ogg|mp3 and it
// plays instead of the procedural beep. Each file independent; missing file = beep fallback.
const SFX_NAMES = ['shot', 'shell', 'thump', 'spit', 'rocket', 'launch', 'snipe', 'boom',
                   'deposit', 'repair', 'ready', 'error', 'alarm', 'select',
                   'bite', 'screech', 'collapse', 'nuke'];
const SFX_EXTS = ['wav', 'ogg', 'mp3'];
const SFX_VOL = { shot: 0.16, shell: 0.3, thump: 0.35, spit: 0.2, rocket: 0.25, snipe: 0.2,
                  launch: 0.6, boom: 0.45, deposit: 0.2, repair: 0.15, ready: 0.3,
                  error: 0.3, alarm: 0.4, select: 0.12,
                  bite: 0.25, screech: 0.3, collapse: 0.5, nuke: 0.7 };
const SFX_POOL = 4;   // simultaneous overlapping plays per sound
const sfx = {};       // name -> { pool: [HTMLAudio...], i }
(function loadSfx() {
  for (const name of SFX_NAMES) tryExt(name, 0);
  function tryExt(name, i) {
    if (i >= SFX_EXTS.length) return;
    const el = new Audio();
    el.preload = 'auto';
    el.oncanplaythrough = () => {
      if (sfx[name]) return;
      const pool = [el];
      for (let k = 1; k < SFX_POOL; k++) pool.push(el.cloneNode());
      sfx[name] = { pool, i: 0 };
    };
    el.onerror = () => tryExt(name, i + 1);
    el.src = 'assets/sfx/' + name + '.' + SFX_EXTS[i];
  }
})();
function playSfx(name) {
  const s = sfx[name];
  if (!s) return false;   // no sample loaded — caller falls back to beep
  if (!muted) {
    const el = s.pool[s.i = (s.i + 1) % s.pool.length];
    el.volume = SFX_VOL[name] !== undefined ? SFX_VOL[name] : 0.3;
    try { el.currentTime = 0; el.play().catch(() => { /* pre-gesture autoplay block */ }); } catch (e) { /* ignore */ }
  }
  return true;
}
const snd = {
  shot()    { if (tick - lastShotSound < 4) return; lastShotSound = tick; if (!playSfx('shot')) beep(880, 0.05, 'square', 0.018); },
  shell()   { if (tick - lastShotSound < 4) return; lastShotSound = tick; if (!playSfx('shell')) beep(170, 0.16, 'sawtooth', 0.05, 60); },
  thump()   { if (tick - lastShotSound < 4) return; lastShotSound = tick; if (!playSfx('thump')) beep(90, 0.24, 'sawtooth', 0.07, 30); },
  spit()    { if (tick - lastShotSound < 4) return; lastShotSound = tick; if (!playSfx('spit')) beep(340, 0.09, 'triangle', 0.035, 120); },
  rocket()  { if (tick - lastShotSound < 4) return; lastShotSound = tick; if (!playSfx('rocket')) beep(420, 0.18, 'sawtooth', 0.04, 90); },
  launch()  { if (playSfx('launch')) return; beep(60, 0.9, 'sawtooth', 0.09, 400); setTimeout(() => beep(52, 0.9, 'sawtooth', 0.08, 300), 350); },
  snipe()   { if (tick - lastShotSound < 4) return; lastShotSound = tick; if (!playSfx('snipe')) beep(1600, 0.09, 'square', 0.03, 220); },
  boom()    { if (!playSfx('boom')) beep(95, 0.32, 'sawtooth', 0.07, 28); },
  deposit() { if (!playSfx('deposit')) beep(1240, 0.07, 'sine', 0.035); },
  repair()  { if (!playSfx('repair')) beep(760, 0.05, 'triangle', 0.03, 980); },
  ready()   { if (playSfx('ready')) return; beep(620, 0.07, 'sine', 0.045); setTimeout(() => beep(880, 0.09, 'sine', 0.045), 80); },
  error()   { if (!playSfx('error')) beep(170, 0.11, 'square', 0.045); },
  alarm()   { if (playSfx('alarm')) return; beep(520, 0.14, 'square', 0.06, 320); setTimeout(() => beep(520, 0.14, 'square', 0.06, 320), 200); },
  select()  { if (!playSfx('select')) beep(540, 0.035, 'sine', 0.02); },
  // raptor claws: sample or a short snap
  bite()    { if (!playSfx('bite')) beep(220, 0.06, 'square', 0.03, 90); },
  // dino death cry: organic, no explosion — dinos are meat, not machines
  screech() { if (!playSfx('screech')) beep(680, 0.12, 'sawtooth', 0.045, 1400); },
  // building death: rubble if we have it, else the plain boom
  collapse() { if (!playSfx('collapse')) this.boom(); },
  // the big one — sample, else the old triple boom
  nuke()    { if (playSfx('nuke')) return; this.boom(); setTimeout(() => this.boom(), 160); setTimeout(() => this.boom(), 340); },
};

// ---------------- Factories ----------------
function makeUnit(type, team, x, y) {
  const d = UNIT[type];
  const u = {
    id: nextId++, kind: 'unit', type, team,
    x, y, r: d.r, hp: d.hp, maxHp: d.hp,
    speed: d.speed, dmg: d.dmg, range: d.range, cooldown: d.cooldown,
    cool: 0, faceA: team === 1 ? -Math.PI / 4 : Math.PI * 0.75,
    carry: 0, mineT: 0, lastCrystal: null,
    kills: 0, eggCarry: false, fly: !!d.fly, stuckT: 0, ghostT: 0,
    capT: 0, captive: false,
    cargo: d.cargo ? [] : null, armed: !!d.bomb,
    walkT: 0, moving: false, recoil: 0,
    order: { type: 'idle' },
  };
  units.push(u);
  return u;
}
function makeBuilding(type, team, x, y, constructing) {
  const d = BLD[type];
  const b = {
    id: nextId++, kind: 'building', type, team,
    x, y, w: d.w, h: d.h, r: Math.max(d.w, d.h) / 2,
    hp: constructing ? 60 : d.hp, maxHp: d.hp,
    dmg: d.dmg || 0, range: d.range || 0, cooldown: d.cooldown || 0, cool: 0, faceA: 0,
    queue: [], prog: 0, boost: 1,   // boost 2 = rush-paid double production speed (current item only)
    warhead: null,                  // silos only: 'tac' | 'hq' when armed
    sunk: false,                    // depots/plants only: lowered flush with the ground, units drive over
    built: constructing ? 0 : 1,
    rally: null,
  };
  if (d.trains) {
    const dir = team === 1 ? -1 : 1;
    b.rally = { x: clamp(x + 120 * -dir, 40, W - 40), y: clamp(y + 90 * dir, 40, H - 40) };
  }
  buildings.push(b);
  return b;
}
function makeCrystal(x, y, amount) {
  const c = { id: nextId++, kind: 'crystal', x, y, r: 13, amount, maxAmount: amount };
  crystals.push(c);
  return c;
}
function makeEgg(x, y) {
  const e = { id: nextId++, kind: 'egg', x: clamp(x, 20, W - 20), y: clamp(y, 20, H - 20), r: 8 };
  eggs.push(e);
  return e;
}

// ---------------- Dino nests ----------------
function spawnSpitter(nest) {
  const a = Math.random() * Math.PI * 2;
  const u = makeUnit('spitter', 3,
    clamp(nest.x + Math.cos(a) * (nest.r + 18), 20, W - 20),
    clamp(nest.y + Math.sin(a) * (nest.r + 18), 20, H - 20));
  u.home = nest.id;
  u.order = { type: 'guard', hx: nest.x, hy: nest.y };
  return u;
}
function makeNest(x, y) {
  const b = makeBuilding('nest', 3, x, y);
  for (let i = 0; i < NEST_BROOD; i++) spawnSpitter(b);
  return b;
}
// ---------------- Raptor dens ----------------
function spawnRaptor(den) {
  const a = Math.random() * Math.PI * 2;
  const u = makeUnit('raptor', 3,
    clamp(den.x + Math.cos(a) * (den.r + 18), 20, W - 20),
    clamp(den.y + Math.sin(a) * (den.r + 18), 20, H - 20));
  u.home = den.id;
  u.order = { type: 'guard', hx: den.x, hy: den.y };
  return u;
}
function makeDen(x, y) {
  const b = makeBuilding('den', 3, x, y);
  b.packT = 0;
  for (let i = 0; i < DEN_GUARDS; i++) spawnRaptor(b);
  return b;
}

// ---------------- Map setup ----------------
function addPatch(px, py, n, amount) {
  const made = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    const rad = i === 0 ? 0 : 26 + (i % 3) * 16;
    made.push(makeCrystal(px + Math.cos(a) * rad, py + Math.sin(a) * rad, amount));
  }
  return made;
}

// ---------------- Terrain pathfinding ----------------
// Rocks are static, so they live in a tile grid. Movement uses straight-line
// walking when line-of-sight is clear (the common case) and a cached A* path
// around ridges when it isn't. Buildings stay dynamic (wall-slide handles them).
const blocked = new Uint8Array(MAP_W * MAP_H);
function buildTerrainGrid() {
  blocked.fill(0);
  for (const rk of rocks) {
    const x0 = Math.max(0, Math.floor((rk.x - rk.r - 12) / TILE));
    const x1 = Math.min(MAP_W - 1, Math.floor((rk.x + rk.r + 12) / TILE));
    const y0 = Math.max(0, Math.floor((rk.y - rk.r - 12) / TILE));
    const y1 = Math.min(MAP_H - 1, Math.floor((rk.y + rk.r + 12) / TILE));
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      if (dist2(gx * TILE + 16, gy * TILE + 16, rk.x, rk.y) < (rk.r + 22) ** 2) blocked[gy * MAP_W + gx] = 1;
    }
  }
}
function losClear(x0, y0, x1, y1) {
  const steps = Math.ceil(dist(x0, y0, x1, y1) / 16);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const gx = Math.floor((x0 + (x1 - x0) * t) / TILE), gy = Math.floor((y0 + (y1 - y0) * t) / TILE);
    if (blocked[gy * MAP_W + gx]) return false;
  }
  return true;
}
function nearestFreeTile(gx, gy) {
  if (!blocked[gy * MAP_W + gx]) return [gx, gy];
  for (let r = 1; r < 14; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (!blocked[ny * MAP_W + nx]) return [nx, ny];
    }
  }
  return null;
}
function findPath(x0, y0, x1, y1) {
  const start = nearestFreeTile(Math.floor(x0 / TILE), Math.floor(y0 / TILE));
  const goal = nearestFreeTile(Math.floor(x1 / TILE), Math.floor(y1 / TILE));
  if (!start || !goal) return null;
  const [sx, sy] = start, [gx, gy] = goal;
  const sIdx = sy * MAP_W + sx, gIdx = gy * MAP_W + gx;
  if (sIdx === gIdx) return [{ x: x1, y: y1 }];
  const g = new Float32Array(MAP_W * MAP_H).fill(Infinity);
  const from = new Int32Array(MAP_W * MAP_H).fill(-1);
  const heap = [], hIdx = [];   // parallel arrays: fscore, node
  const push = (f, n) => {
    let i = heap.length; heap.push(f); hIdx.push(n);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p] <= heap[i]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]]; [hIdx[p], hIdx[i]] = [hIdx[i], hIdx[p]];
      i = p;
    }
  };
  const pop = () => {
    const n = hIdx[0], last = heap.length - 1;
    heap[0] = heap[last]; hIdx[0] = hIdx[last];
    heap.pop(); hIdx.pop();
    let i = 0;
    while (true) {
      const l = i * 2 + 1, r = l + 1;
      let s = i;
      if (l < heap.length && heap[l] < heap[s]) s = l;
      if (r < heap.length && heap[r] < heap[s]) s = r;
      if (s === i) break;
      [heap[s], heap[i]] = [heap[i], heap[s]]; [hIdx[s], hIdx[i]] = [hIdx[i], hIdx[s]];
      i = s;
    }
    return n;
  };
  const hFn = (n) => {
    const nx = n % MAP_W, ny = (n / MAP_W) | 0;
    return Math.hypot(nx - gx, ny - gy);
  };
  g[sIdx] = 0;
  push(hFn(sIdx), sIdx);
  let found = false, guard = 0;
  while (heap.length && guard++ < 20000) {
    const cur = pop();
    if (cur === gIdx) { found = true; break; }
    const cx0 = cur % MAP_W, cy0 = (cur / MAP_W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx0 + dx, ny = cy0 + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const n = ny * MAP_W + nx;
      if (blocked[n]) continue;
      if (dx && dy && (blocked[cy0 * MAP_W + nx] || blocked[ny * MAP_W + cx0])) continue;   // no corner cutting
      const cost = g[cur] + (dx && dy ? 1.414 : 1);
      if (cost < g[n]) { g[n] = cost; from[n] = cur; push(cost + hFn(n), n); }
    }
  }
  if (!found) return null;
  // reconstruct, then smooth with line-of-sight so units cut natural corners
  const tiles = [];
  for (let n = gIdx; n !== -1; n = from[n]) tiles.push(n);
  tiles.reverse();
  const pts = tiles.map(n => ({ x: (n % MAP_W) * TILE + 16, y: ((n / MAP_W) | 0) * TILE + 16 }));
  pts.push({ x: x1, y: y1 });
  const out = [];
  let anchor = { x: x0, y: y0 }, i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i && !losClear(anchor.x, anchor.y, pts[j].x, pts[j].y)) j--;
    if (j === i) j = i + 1;   // can't skip — take the next step anyway
    out.push(pts[j]);
    anchor = pts[j];
    i = j;
  }
  return out;
}

// place one team's base from a map spec; returns its HQ
function placeBase(team, M) {
  const p = team === 1;
  const bare = p && mission && mission.bare;   // tutorial missions start with just the HQ + harvesters
  const hq = makeBuilding('hq', team, ...(p ? M.pHQ : M.eHQ));
  if (!bare) makeBuilding('barracks', team, ...(p ? M.pRax : M.eRax));
  if (!p) {
    makeBuilding('factory', 2, ...M.eFac);
    makeBuilding('airpad', 2, ...M.eAir);
    for (const s of M.eSup) makeBuilding('supply', 2, ...s);
    for (const t of M.eTur) makeBuilding('turret', 2, ...t);
  }
  const patch = addPatch(...(p ? M.pPatch : M.ePatch), 7, 1700);
  if (!p) {
    // one starting plant keeps the enemy base on the grid (HQ 8 + plant 10 ≥ its 14
    // draw). Placed AFTER the home patch exists so aiSpotFree can dodge the crystals.
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 160;
      const x = clamp(hq.x + Math.cos(a) * r, 60, W - 60);
      const y = clamp(hq.y + Math.sin(a) * r, 60, H - 60);
      if (aiSpotFree('power', x, y)) { makeBuilding('power', 2, x, y); break; }
    }
  }
  // starting refinery: crystals only deliver here now, so every base opens with
  // one — dropped along the HQ->patch line (bare tutorial starts included)
  const mx = hq.x + (patch[0].x - hq.x) * 0.55, my = hq.y + (patch[0].y - hq.y) * 0.55;
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 60 + Math.random() * 130;
    const x = clamp(mx + Math.cos(a) * r, 60, W - 60);
    const y = clamp(my + Math.sin(a) * r, 60, H - 60);
    if (aiSpotFree('refinery', x, y)) { makeBuilding('refinery', team, x, y); break; }
  }
  hq.rally = { x: patch[0].x, y: patch[0].y };               // fresh harvesters auto-mine
  for (let i = 0; i < 3; i++) {
    // string the starting harvesters out along the HQ→patch line
    const t = 0.5 + i * 0.12;
    const u = makeUnit('harvester', team,
      hq.x + (patch[0].x - hq.x) * t, hq.y + (patch[0].y - hq.y) * t);
    u.order = { type: 'harvest', target: patch[i % patch.length] };
  }
  // two starter marines, posted toward the middle of the map
  if (!bare) {
    const a = Math.atan2(H / 2 - hq.y, W / 2 - hq.x);
    makeUnit('marine', team, hq.x + Math.cos(a) * 135, hq.y + Math.sin(a) * 135);
    makeUnit('marine', team, hq.x + Math.cos(a) * 165 + 22, hq.y + Math.sin(a) * 165 - 20);
  }
  return hq;
}

function setup(mapKey) {
  const M = MAPS[mapKey] || MAPS.basin;
  // terrain first, so the ground pre-render includes it
  for (const rg of (M.ridges || [])) {
    const [x1, y1, x2, y2, r] = rg;
    const n = Math.max(1, Math.round(dist(x1, y1, x2, y2) / (r * 1.1)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      rocks.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, r: r * (0.85 + Math.random() * 0.3) });
    }
  }
  for (const [bx, by, br] of (M.boulders || [])) rocks.push({ x: bx, y: by, r: br });
  // plateaus: raise the interior tiles, then grow the cliff rim as a chain of
  // slab rocks — ramps leave gaps, the only ground route up
  elev.fill(0);
  for (const pl of (M.plateaus || [])) {
    const inRamp = (x, y) => (pl.ramps || []).some(([rx, ry, rr]) => dist2(x, y, rx, ry) < rr * rr);
    for (let gy = 0; gy < MAP_H; gy++) for (let gx = 0; gx < MAP_W; gx++) {
      const wx = (gx + 0.5) * TILE, wy = (gy + 0.5) * TILE;
      if (pl.c.some(([px, py, pr]) => dist2(wx, wy, px, py) < pr * pr)) elev[gy * MAP_W + gx] = 1;
    }
    for (const [px, py, pr] of pl.c) {
      const n = Math.max(10, Math.round((Math.PI * 2 * pr) / 30));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = px + Math.cos(a) * pr, y = py + Math.sin(a) * pr;
        // interior seams (inside a sibling disc) and ramp mouths stay open
        if (pl.c.some(([ox, oy, orr]) => (ox !== px || oy !== py) && dist2(x, y, ox, oy) < (orr - 10) ** 2)) continue;
        if (inRamp(x, y)) continue;
        rocks.push({ x, y, r: 17, cliff: true, a });
      }
    }
  }
  buildTerrainGrid();
  paintGround(M);
  const pHQ = placeBase(1, M);
  if (!(mission && mission.noEnemy)) placeBase(2, M);

  // neutral fields + their nest guards — clear the nest or mine poor.
  // A mission can replace the map's fields wholesale (M1 spreads them out).
  for (const spec of ((mission && mission.fields) || M.patches)) {
    addPatch(spec.p[0], spec.p[1], spec.n, spec.a);
    for (const nx of (spec.nests || [])) makeNest(nx[0], nx[1]);
  }
  // missions can author extra fields (e.g. M2's survey-post patch)
  if (mission && mission.patches) {
    for (const [px, py, n, amt] of mission.patches) addPatch(px, py, n, amt);
  }

  // ambient wildlife (campaign only): grazer herds wandering the map. Props
  // with a conscience — kill one and dinoRage rises for the whole level.
  if (mission) {
    let placed = 0;
    for (let i = 0; i < 200 && placed < 8; i++) {
      const x = 60 + Math.random() * (W - 120), y = 60 + Math.random() * (H - 120);
      if (rocks.some(rk => dist2(x, y, rk.x, rk.y) < (rk.r + 40) ** 2)) continue;
      if (buildings.some(b => dist2(x, y, b.x, b.y) < 300 ** 2)) continue;
      if (crystals.some(c => dist2(x, y, c.x, c.y) < 120 ** 2)) continue;
      const u = makeUnit('critter', 3, x, y);
      u.roam = true;
      u.order = { type: 'roam' };
      placed++;
    }
  }

  // camera centered on the player base (clamped to the world edge)
  cam.x = pHQ.x - view.w / 2;
  cam.y = pHQ.y - view.h / 2;
  clampCam();
  updateFog();
}

// ---------------- Queries ----------------
function supplyUsed(team) {
  let s = 0;
  for (const u of units) {
    if (u.team !== team) continue;
    s += UNIT[u.type].supply;
    if (u.cargo) for (const c of u.cargo) s += UNIT[c.type].supply;   // passengers count
  }
  return s;
}
function supplyMax(team) {
  let s = 0;
  for (const b of buildings) if (b.team === team && b.built >= 1) s += BLD[b.type].supply;
  return Math.min(SUPPLY_HARD_CAP, s);
}
// the power grid — only standing, living buildings count on either side of the meter
function powerMax(team) {
  let s = 0;
  for (const b of buildings) if (b.team === team && b.built >= 1 && b.hp > 0) s += BLD[b.type].gen || 0;
  return s;
}
function powerUsed(team) {
  let s = 0;
  for (const b of buildings) if (b.team === team && b.built >= 1 && b.hp > 0) s += BLD[b.type].pow || 0;
  return s;
}
const lowPower = (team) => powerUsed(team) > powerMax(team);
function nearestCrystalTo(x, y, maxDist) {
  let best = null, bd = (maxDist || 1e9) ** 2;
  for (const c of crystals) {
    if (c.amount <= 0) continue;
    const d = dist2(x, y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
// harvesters can deliver to the HQ or any refinery — refineries are how you expand
function nearestDropoff(team, x, y) {
  // crystals go through the refinery, period (2026-07-14 playtest) — the HQ is a
  // command post, not an ore chute. Eggs and captives still ride to the HQ lab.
  let best = null, bd = 1e18;
  for (const b of buildings) {
    if (b.team !== team || b.built < 1 || b.type !== 'refinery') continue;
    const d = dist2(x, y, b.x, b.y);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function nearestWoundedAlly(u, range, pred) {
  pred = pred || isFlesh;
  let best = null, bd = 1e18;
  for (const o of units) {
    if (o === u || o.team !== u.team || o.hp <= 0 || o.hp >= o.maxHp || !pred(o)) continue;
    const d = dist(u.x, u.y, o.x, o.y) - o.r;
    if (d <= range && d * d < bd) { bd = d * d; best = o; }
  }
  return best;
}
function nearestDamagedBuilding(team, x, y, range) {
  let best = null, bd = 1e18;
  for (const b of buildings) {
    if (b.team !== team || b.built < 1 || b.hp >= b.maxHp) continue;
    const d = dist(x, y, b.x, b.y) - b.r;
    if (d <= range && d * d < bd) { bd = d * d; best = b; }
  }
  return best;
}
// can this unit/building shoot at flyers?
const canAA = (e) => e.kind === 'unit' ? !UNIT[e.type].noAA : true;   // only turrets fire among buildings, and they have AA
function nearestEnemyUnit(x, y, team, range, aa, airOnly, fromAir) {
  let best = null, bd = 1e18;
  const ve = fromAir ? 9 : elevAt(x, y);
  for (const u of units) {
    if (u.team === team) continue;
    if (u.type === 'critter') continue;                   // wildlife: never auto-targeted, by anyone
    if (airOnly && !UNIT[u.type].fly) continue;           // flak ignores the ground war
    if (aa === false && UNIT[u.type].fly) continue;       // gun can't elevate — skip flyers
    if (team === 1 && !isVisibleAt(u.x, u.y)) continue;   // player can't target into the fog
    if (!u.fly && elevAt(u.x, u.y) > ve) continue;        // can't spot up the cliff — no auto-fire uphill
    const d = dist(x, y, u.x, u.y) - u.r;
    if (d <= range && d * d < bd) { bd = d * d; best = u; }
  }
  return best;
}
function nearestEnemyBuilding(x, y, team, range, fromAir) {
  let best = null, bd = 1e18;
  const ve = fromAir ? 9 : elevAt(x, y);
  for (const b of buildings) {
    if (b.team === team) continue;
    if (team === 1 && !isVisibleAt(b.x, b.y)) continue;
    if (elevAt(b.x, b.y) > ve) continue;                  // cliff-top structures are safe from below
    const d = dist(x, y, b.x, b.y) - b.r;
    if (d <= range && d * d < bd) { bd = d * d; best = b; }
  }
  return best;
}
function acquireTarget(x, y, team, range, attacker) {
  const aa = attacker ? canAA(attacker) : true;
  const air = !!(attacker && attacker.fly);
  return nearestEnemyUnit(x, y, team, range, aa, false, air) || nearestEnemyBuilding(x, y, team, range, air);
}
function thingAtPoint(wx, wy) {
  for (const u of units) {
    if (u.team !== 1 && !isVisibleAt(u.x, u.y)) continue;   // hidden by fog
    if (dist2(wx, wy, u.x, u.y) <= (u.r + 4) ** 2) return u;
  }
  for (const b of buildings) {
    if (b.team !== 1 && !isShownAt(b.x, b.y)) continue;
    if (Math.abs(wx - b.x) <= b.w / 2 + 3 && Math.abs(wy - b.y) <= b.h / 2 + 3) return b;
  }
  for (const c of crystals) if (c.amount > 0 && dist2(wx, wy, c.x, c.y) <= (c.r + 8) ** 2) return c;
  for (const e of eggs) if (isShownAt(e.x, e.y) && dist2(wx, wy, e.x, e.y) <= (e.r + 8) ** 2) return e;
  return null;
}
function nearestEggTo(x, y, maxDist) {
  let best = null, bd = (maxDist || 1e9) ** 2;
  for (const e of eggs) {
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// APC doors: passengers pile out in a ring; dead APCs take everyone with them
function unloadAPC(apc) {
  if (!apc.cargo || !apc.cargo.length) return;
  let i = 0;
  for (const p of apc.cargo) {
    const spot = spreadPoint(apc.x, apc.y + apc.r + 14, i++);
    p.x = clamp(spot.x, 20, W - 20); p.y = clamp(spot.y, 20, H - 20);
    p.order = { type: 'idle' };
    units.push(p);
  }
  apc.cargo = [];
  if (apc.team === 1) { toast('APC unloaded'); beep(500, 0.07, 'triangle', 0.04); }
}

// ---------------- Orders ----------------
function spreadPoint(x, y, i) {
  if (i === 0) return { x, y };
  const a = i * 2.39996, rad = 22 * Math.sqrt(i);
  return { x: clamp(x + Math.cos(a) * rad, 20, W - 20), y: clamp(y + Math.sin(a) * rad, 20, H - 20) };
}
function commandMove(sel, wx, wy, attackMove) {
  let i = 0;
  for (const e of sel) {
    if (e.kind !== 'unit') continue;
    const p = spreadPoint(wx, wy, i++);
    e.order = { type: attackMove && isCombat(e) ? 'attackmove' : 'move', x: p.x, y: p.y };
  }
}
function commandAttack(sel, target) {
  for (const e of sel) {
    if (e.kind !== 'unit') continue;
    e.order = e.type === 'harrier'
      ? { type: 'strike', target }
      : { type: 'attack', target, resume: null };
  }
}
function commandHarvest(sel, c) {
  let i = 0;
  for (const e of sel) {
    if (e.kind !== 'unit') continue;
    if (e.type === 'harvester') e.order = { type: 'harvest', target: c };
    else { const p = spreadPoint(c.x, c.y + 50, i++); e.order = { type: 'move', x: p.x, y: p.y }; }
  }
}
function commandCollect(sel, egg) {
  let i = 0;
  for (const e of sel) {
    if (e.kind !== 'unit') continue;
    if (e.type === 'harvester') e.order = { type: 'collect', target: egg };
    else { const p = spreadPoint(egg.x, egg.y + 40, i++); e.order = { type: 'move', x: p.x, y: p.y }; }
  }
}
function commandRepair(sel, b) {
  let i = 0;
  for (const e of sel) {
    if (e.kind !== 'unit') continue;
    if (e.type === 'engineer') e.order = { type: 'repair', target: b };
    else { const p = spreadPoint(b.x, b.y + b.h / 2 + 30, i++); e.order = { type: 'move', x: p.x, y: p.y }; }
  }
}

// ---------------- Production ----------------
function trainUnit(b, type) {
  const d = UNIT[type];
  const t = teams[b.team];
  if (type === 'harrier') {
    const fleet = units.filter(u => u.team === b.team && u.type === 'harrier').length
      + buildings.reduce((s, x) => s + (x.team === b.team ? x.queue.filter(q => q === 'harrier').length : 0), 0);
    if (fleet >= HARRIER_CAP) {
      if (b.team === 1) { toast(`Harrier fleet is at capacity (${HARRIER_CAP})`); snd.error(); }
      return false;
    }
  }
  if (b.queue.length >= 5) { if (b.team === 1) { toast('Queue is full'); snd.error(); } return false; }
  if (t.crystals < d.cost) { if (b.team === 1) { toast('Not enough crystals'); snd.error(); } return false; }
  t.crystals -= d.cost;
  b.queue.push(type);
  return true;
}
function spawnFromBuilding(b, type) {
  const rally = b.rally || { x: b.x, y: b.y + b.h };
  const a = Math.atan2(rally.y - b.y, rally.x - b.x);
  const sx = b.x + Math.cos(a) * (b.r + 16) + (Math.random() - 0.5) * 10;
  const sy = b.y + Math.sin(a) * (b.r + 16) + (Math.random() - 0.5) * 10;
  const u = makeUnit(type, b.team, clamp(sx, 20, W - 20), clamp(sy, 20, H - 20));
  if (b.team === 1) stats.built++;
  const c = nearestCrystalTo(rally.x, rally.y, 60);
  if (type === 'harvester' && c) u.order = { type: 'harvest', target: c };
  else u.order = { type: 'move', x: rally.x, y: rally.y };
  if (b.team === 1) snd.ready();
}
// queue entries are either a unit type ('marine') or research ('up:infWeapons')
const queueLabel = (q) => q.startsWith('up:') ? UPG[q.slice(3)].label : UNIT[q].label;
function queueTime(team, q) {
  if (!q.startsWith('up:')) return UNIT[q].buildTime;
  const g = UPG[q.slice(3)];
  return g.time[Math.min(teams[team].up[q.slice(3)], g.max - 1)];
}
function startResearch(b, key) {
  const g = UPG[key], t = teams[b.team];
  const pending = buildings.reduce((s, x) =>
    s + (x.team === b.team ? x.queue.filter(q => q === 'up:' + key).length : 0), 0);
  const lvl = t.up[key] + pending;
  if (lvl >= g.max) { if (b.team === 1) { toast(g.label + ' is fully researched'); snd.error(); } return false; }
  if (b.queue.length >= 5) { if (b.team === 1) { toast('Queue is full'); snd.error(); } return false; }
  if (t.crystals < g.cost[lvl]) { if (b.team === 1) { toast('Not enough crystals'); snd.error(); } return false; }
  t.crystals -= g.cost[lvl];
  b.queue.push('up:' + key);
  return true;
}
function updateProduction(b) {
  if (!b.queue.length) return;
  const item = b.queue[0];
  // brownout: assembly lines crawl at half speed (rush boosts still help)
  if (b.prog < queueTime(b.team, item)) { b.prog += b.boost * (lowPower(b.team) ? 0.5 : 1); return; }
  if (item.startsWith('up:')) {
    const key = item.slice(3);
    b.queue.shift(); b.prog = 0; b.boost = 1;
    teams[b.team].up[key]++;
    if (b.team === 1) { toast(`${UPG[key].label} Level ${teams[b.team].up[key]} — complete`); snd.ready(); }
    return;
  }
  const d = UNIT[item];
  if (supplyUsed(b.team) + d.supply > supplyMax(b.team)) {
    if (b.team === 1 && tick % 300 === 0) toast('Supply limit reached — unit on hold');
    return;
  }
  b.queue.shift(); b.prog = 0; b.boost = 1;
  spawnFromBuilding(b, item);
}
// rush fees: pay half the item's cost for double speed, or its full cost to finish now
function queueItemCost(b) {
  const q = b.queue[0];
  if (q.startsWith('up:')) {
    const k = q.slice(3);
    return UPG[k].cost[Math.min(teams[b.team].up[k], UPG[k].max - 1)];
  }
  return UNIT[q].cost;
}
// rush fees for buildings still going up — same price model as unit queues:
// half the building's cost doubles the crew, the full cost finishes it now
function rushConstruction(b, instant) {
  if (b.built >= 1) return;
  if (!instant && (b.buildBoost || 1) > 1) return;
  const cost = BLD[b.type].cost || 0;
  const fee = instant ? cost : Math.ceil(cost / 2);
  const t = teams[b.team];
  if (t.crystals < fee) { if (b.team === 1) { toast(`Not enough crystals (${fee} ⬡)`); snd.error(); } return; }
  t.crystals -= fee;
  if (instant) {
    // jump to one tick from done — the normal update crosses the finish line,
    // so completion side effects (refinery harvester, toasts) still fire
    const bt = BLD[b.type].buildTime || 1;
    const rem = Math.max(0, 1 - b.built - 1 / bt);
    b.hp = Math.min(b.maxHp, b.hp + b.maxHp * rem);
    b.built = Math.max(b.built, 1 - 1 / bt);
  } else b.buildBoost = 2;
  if (b.team === 1) {
    toast(instant ? '⚡ Rush crew — construction finishing now' : '⏩ Construction at double speed');
    beep(instant ? 980 : 720, 0.08, 'sine', 0.05);
  }
}
function rushProduction(b, instant) {
  if (!b.queue.length) return;
  if (!instant && b.boost > 1) return;
  const item = b.queue[0];
  const fee = instant ? queueItemCost(b) : Math.ceil(queueItemCost(b) / 2);
  const t = teams[b.team];
  if (t.crystals < fee) { if (b.team === 1) { toast(`Not enough crystals (${fee} ⬡)`); snd.error(); } return; }
  if (instant && !item.startsWith('up:') && supplyUsed(b.team) + UNIT[item].supply > supplyMax(b.team)) {
    if (b.team === 1) { toast('Supply limit reached — build a Supply Depot first'); snd.error(); }
    return;
  }
  t.crystals -= fee;
  if (instant) b.prog = queueTime(b.team, item);
  else b.boost = 2;
  if (b.team === 1) {
    toast(instant ? '⚡ Rush order — finishing now' : '⏩ Production at double speed');
    beep(instant ? 980 : 720, 0.08, 'sine', 0.05);
  }
}

// ---------------- Nukes ----------------
function buyNuke(b, tier) {
  const t = teams[b.team], spec = NUKE[tier];
  if (b.warhead) { if (b.team === 1) { toast('Silo is already armed'); snd.error(); } return false; }
  if (t.crystals < spec.cost) {
    if (b.team === 1) { toast(`Not enough crystals (${spec.cost.toLocaleString()} ⬡)`); snd.error(); }
    return false;
  }
  t.crystals -= spec.cost;
  b.warhead = tier;
  if (b.team === 1) { toast(`☢ ${spec.label} armed — select the silo and press L to launch`); snd.ready(); }
  return true;
}
function launchNuke(b, wx, wy) {
  const tier = b.warhead;
  if (!tier || b.hp <= 0 || !buildings.includes(b)) return false;   // silo must be standing
  if (lowPower(b.team)) {
    if (b.team === 1) { toast('⚡ LOW POWER — the silo can\'t launch. Build a Power Plant.'); snd.error(); }
    return false;
  }
  const spec = NUKE[tier];
  if (spec.hqSafe && buildings.some(x => x.type === 'hq' && dist2(wx, wy, x.x, x.y) < NUKE_HQ_EXCLUSION ** 2)) {
    if (b.team === 1) { toast('Tactical warheads can\'t be aimed at an HQ — that takes the Bunker Buster'); snd.error(); }
    return false;
  }
  b.warhead = null;
  nukes.push({ x: wx, y: wy, team: b.team, tier, t: 0, max: NUKE_COUNTDOWN });
  toast(b.team === 1 ? '🚀 Launch confirmed — impact in 30 seconds' : '☢ NUCLEAR LAUNCH DETECTED — impact in 30 seconds!');
  snd.launch();
  return true;
}
function detonate(n) {
  const spec = NUKE[n.tier];
  const hit = (e) => {
    const d = Math.max(0, dist(n.x, n.y, e.x, e.y) - (e.r || 0));
    if (d > spec.radius) return;
    const fall = 1 - 0.55 * (d / spec.radius);   // full at center, 45% at the rim
    const before = e.hp;
    damage(e, spec.dmg * fall, null);
    if (n.team === 1 && e.team !== 1 && before > 0 && e.hp <= 0) stats.kills++;
  };
  for (const u of units.slice()) if (u.hp > 0) hit(u);           // friendly fire: yes. It's a nuke.
  for (const b of buildings.slice()) {
    if (b.hp <= 0) continue;
    if (spec.hqSafe && b.type === 'hq') continue;                // tactical warheads spare HQs
    hit(b);
  }
  for (let i = 0; i < 10; i++) {
    fxExplosion(n.x + (Math.random() - 0.5) * spec.radius * 1.3,
                n.y + (Math.random() - 0.5) * spec.radius * 1.3, 28 + Math.random() * 22, true);
  }
  fxs.push({ kind: 'boom', x: n.x, y: n.y, t: 0, max: 45, size: spec.radius });
  addShake(n.x, n.y, 30);
  snd.nuke();
}
function updateNukes() {
  for (const n of nukes) {
    n.t++;
    if (n.t === n.max - 300 && n.team !== 1) { toast('☢ Impact in 5 seconds!'); snd.alarm(); }
    if (n.t >= n.max) detonate(n);
  }
  nukes = nukes.filter(n => n.t < n.max);
}

// ---------------- Combat ----------------
function fire(src, target) {
  if (src.type === 'raptor') {
    // fake melee: no projectile — the pounce IS the hit. Claws land instantly,
    // with the infantry bonus for anything made of meat and cloth.
    src.cool = src.cooldown;
    src.faceA = Math.atan2(target.y - src.y, target.x - src.x);
    src.recoil = 3;   // the recoil kick reads as a lunge-and-recover
    const infBonus = target.kind === 'unit' && IS_INF[target.type] ? UNIT.raptor.infBonus : 1;
    fxs.push({ kind: 'slash', x: target.x, y: target.y, a: src.faceA, t: 0, max: 12 });
    if (src.team === 1 || Math.random() < 0.4) snd.bite();
    damage(target, src.dmg * weaponMult(src) * infBonus, src);
    return;
  }
  // browned-out towers still shoot, just half as often
  src.cool = src.cooldown * (src.kind === 'building' && lowPower(src.team) ? 2 : 1);
  // weapons discipline around a live-capture target: you CAN shoot it, but
  // everyone drags their trigger — half fire rate (was a hard lock; playtest
  // wanted the firefight to stay honest while the rig works)
  if (target.specimen && src.team === 1) src.cool *= 2;
  src.recoil = src.type === 'tank' || src.type === 'artillery' ? 6
    : src.type === 'turret' || src.type === 'flak' ? 4 : 2.5;
  src.faceA = Math.atan2(target.y - src.y, target.x - src.x);
  const kind = src.type === 'artillery' ? 'arc' : src.type === 'tank' ? 'shell'
    : src.type === 'sniper' ? 'snipe' : src.type === 'spitter' ? 'spit'
    : src.type === 'rocket' ? 'rocket' : 'bolt';
  const sx = src.x + Math.cos(src.faceA) * (src.r * 0.8);
  const sy = src.y + Math.sin(src.faceA) * (src.r * 0.8);
  if (kind === 'arc') {
    // artillery lobs at the target's CURRENT spot — no homing, splash on impact.
    // Fast units walk out from under it; buildings never do. That's the whole unit.
    const d = UNIT.artillery;
    bullets.push({
      x: sx, y: sy, x0: sx, y0: sy, tx: target.x, ty: target.y,
      target: null, dmg: src.dmg * weaponMult(src), team: src.team, src,
      speed: 5, kind, splash: d.splash, bldBonus: d.bldBonus,
    });
  } else {
    // rocket troopers punch armor: bonus applies vs vehicles only
    const armorBonus = (UNIT[src.type] && UNIT[src.type].vehBonus
      && target.kind === 'unit' && isVehicle(target)) ? UNIT[src.type].vehBonus : 1;
    bullets.push({
      x: sx, y: sy, tx: target.x, ty: target.y,
      target, dmg: src.dmg * weaponMult(src) * armorBonus, team: src.team, src,
      speed: kind === 'shell' ? 6.5 : kind === 'snipe' ? 13 : kind === 'spit' ? 6 : kind === 'rocket' ? 5.5 : 9,
      kind,
    });
  }
  if (kind !== 'spit') fxMuzzle(src, kind === 'arc' ? 'shell' : kind);   // no muzzle flash from a mouth
  if (src.team === 1 || Math.random() < 0.4) {
    if (kind === 'arc') snd.thump();
    else if (kind === 'shell') snd.shell(); else if (kind === 'snipe') snd.snipe();
    else if (kind === 'spit') snd.spit(); else if (kind === 'rocket') snd.rocket();
    else snd.shot();
  }
}
function damage(e, d, src) {
  d *= armorMult(e);
  if (e.kind === 'unit' && e.order.type === 'hunker') d *= 0.5;
  e.hp -= d;
  // warn the player when the home front takes hits (buildings & workers)
  if (e.team === 1 && !gameOver && src && src.team !== 1) {
    if (e.kind === 'building') raiseAlert(e.x, e.y, '⚠ Your base is under attack!');
    else if (e.type === 'harvester' || e.type === 'engineer') raiseAlert(e.x, e.y, '⚠ Your workers are under attack!');
  }
  // fight back if idle
  if (e.kind === 'unit' && isCombat(e) && e.order.type === 'idle' && src && src.hp > 0) {
    e.order = { type: 'attack', target: src, resume: null };
  }
  // kicking the nest: the brood answers IMMEDIATELY (playtest: nests felt
  // passive). Burst defenders aren't brood — survivors stay loose and roam.
  if (e.kind === 'building' && e.type === 'nest' && e.hp > 0 && src && src.team !== 3
      && tick - (e.burstAt || -1e9) > NEST_BURST_CD) {
    e.burstAt = tick;
    const n = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const d2 = spawnSpitter(e);
      d2.home = null;   // the nest still replaces its normal guards separately
      d2.roam = true;
      d2.order = src.hp > 0 ? { type: 'attack', target: src, resume: null } : { type: 'roam' };
    }
    if (isShownAt(e.x, e.y)) toast('🦖 The nest erupts — defenders pour out!');
  }
  // dead grazer = angry planet: every real dino gets more aggressive for the level
  if (e.hp <= 0 && e.type === 'critter' && src && src.team !== 3) {
    dinoRage++;
    if (src.team === 1) toast('🦖 The wildlife stirs… the dinosaurs grow agitated');
  }
  if (e.hp <= 0) {
    if (src && src.team === 1 && e.team !== 1) stats.kills++;
    if (e.team === 1 && e.kind === 'unit') stats.lost++;
    // veterancy credit: the killer remembers, and might rank up
    if (src && src.kind === 'unit' && src.hp > 0 && src.team !== e.team) {
      const before = rankOf(src);
      src.kills++;
      const after = rankOf(src);
      if (after > before) {
        if (src.team === 1) {
          fxs.push({ kind: 'text', x: src.x, y: src.y - 20, t: 0, max: 70, msg: '★ ' + RANK_NAMES[after] });
          toast(`${UNIT[src.type].label} promoted to ${RANK_NAMES[after]}!`);
          snd.ready();
        }
      }
    }
    kill(e);
  }
}
function kill(e) {
  e.hp = 0;
  if (nukeTargeting === e) { nukeTargeting = null; setCursor(); }   // no launching from rubble
  if (e.kind === 'unit' && e.cargo && e.cargo.length) {
    if (e.team === 1) stats.lost += e.cargo.length;   // passengers are lost too
    e.cargo = [];
  }
  // units with sliced death frames fall over and leave a body — a soft ring
  // instead of the full fireball (vehicles and buildings still explode)
  const corpse = e.kind === 'unit' ? animFrames(e.type, 'death', e.team, 4) : [];
  if (corpse.length) {
    fxs.push({ kind: 'corpse', x: e.x, y: e.y, a: e.faceA, frames: corpse,
               t: 0, max: corpse.length * 9 + 170, size: e.r * 2.7 });
    fxs.push({ kind: 'boom', x: e.x, y: e.y, t: 0, max: 16, size: (e.r || 16) * 0.9 });
  } else if (e.kind === 'unit' && IS_DINO[e.type]) {
    fxs.push({ kind: 'boom', x: e.x, y: e.y, t: 0, max: 18, size: (e.r || 16) * 0.9 });   // animals don't fireball
  } else {
    fxs.push({ kind: 'boom', x: e.x, y: e.y, t: 0, max: 26, size: (e.r || 16) * 1.6 });
    fxExplosion(e.x, e.y, (e.r || 16) * 1.3, e.kind === 'building');
  }
  if (e.kind === 'building' && e.type === 'nest') {
    // the clutch survives the blast — haul the eggs home to hatch your own brood
    for (let i = 0; i < NEST_EGGS; i++) {
      const a = (i / NEST_EGGS) * Math.PI * 2 + 0.7;
      makeEgg(e.x + Math.cos(a) * (e.r + 14), e.y + Math.sin(a) * (e.r + 14));
    }
    if (isShownAt(e.x, e.y)) toast('🥚 The nest left eggs behind — send a harvester to collect them');
  }
  if (e.kind === 'building' && e.type === 'hq') {
    // an HQ going down ends the game — sell it: second blast wave + double quake
    fxExplosion(e.x + 22, e.y + 16, e.r * 0.8, true);
    fxExplosion(e.x - 18, e.y - 14, e.r * 0.6, true);
    addShake(e.x, e.y, 20);
    snd.boom(); setTimeout(() => snd.boom(), 180);
  }
  if (e.kind === 'building') snd.collapse();
  else if (IS_DINO[e.type]) snd.screech();
  else snd.boom();
}

// ---------------- Unit update ----------------
function moveToward(u, tx, ty) {
  const d = dist(u.x, u.y, tx, ty);
  if (d < 5) return true;
  let a = Math.atan2(ty - u.y, tx - u.x);
  if (u.fly) {   // flyers go straight over everything
    u.faceA = a;
    const step = Math.min(effSpeed(u), d);
    u.x += Math.cos(a) * step;
    u.y += Math.sin(a) * step;
    return d - step < 5;
  }
  // ground units path around terrain: straight line when clear, cached A* when not
  let gx = tx, gy = ty;
  if (rocks.length && !losClear(u.x, u.y, tx, ty)) {
    const o = u.order;
    if (!o._path || !o._path.length || Math.abs(tx - o._pgx) + Math.abs(ty - o._pgy) > 56) {
      o._path = findPath(u.x, u.y, tx, ty) || [];
      o._pgx = tx; o._pgy = ty;
    }
    while (o._path.length && dist2(u.x, u.y, o._path[0].x, o._path[0].y) < 24 * 24) o._path.shift();
    if (o._path.length) { gx = o._path[0].x; gy = o._path[0].y; a = Math.atan2(gy - u.y, gx - u.x); }
  }
  // If a building or rock blocks the path just ahead, slide along its wall
  // toward the clear side instead of grinding into it until separation() helps.
  const look = u.r + 12;
  const lx = u.x + Math.cos(a) * look, ly = u.y + Math.sin(a) * look;
  const o2 = u.order;
  let sliding = false;
  if (!u.ghostT) for (const b of buildings) {
    if (b.sunk) continue;   // lowered depots/plants are drive-over ground
    if (Math.abs(lx - b.x) >= b.w / 2 + u.r || Math.abs(ly - b.y) >= b.h / 2 + u.r) continue;
    // if the waypoint is at/inside this building (attack, repair, drop-off), walk straight in
    if (Math.abs(gx - b.x) < b.w / 2 + u.r + 10 && Math.abs(gy - b.y) < b.h / 2 + u.r + 10) break;
    // sticky slide: pick a side ONCE per wall and keep it — re-deciding every
    // tick flip-flopped the sign as the unit jittered, which read as a spin-out
    if (o2._slideB !== b.id) {
      const cross = (gx - u.x) * (b.y - u.y) - (gy - u.y) * (b.x - u.x);
      o2._slideB = b.id;
      o2._slideS = cross > 0 ? -1 : 1;
    }
    a += o2._slideS * Math.PI / 2;
    sliding = true;
    break;
  }
  // hysteresis: hold the dodge a few ticks past the last blocked frame —
  // without it the heading alternated goal/slide every other tick (the shimmy)
  if (sliding) o2._slideHold = 6;
  else if (o2._slideHold > 0) {
    o2._slideHold--;
    a += (o2._slideS || 1) * Math.PI / 2;
    sliding = true;
  }
  if (sliding) {
    // wedged on the same wall too long (concave corner, crowd) — ghost past the
    // lip instead of orbiting it. Mirrors the A* watchdog, which never fires
    // for building bumps because buildings aren't in the path grid.
    o2._slideT = (o2._slideT || 0) + 1;
    if (o2._slideT > 45) { u.ghostT = 40; o2._slideT = 0; o2._slideB = null; }
  } else { o2._slideT = 0; o2._slideB = null; }
  // building-pocket watchdog: on rock-free ground there is no A* path, so the
  // progress watchdog in updateUnit never runs — and inside a roomy pocket
  // between buildings the unit gets enough open ticks between wall bumps that
  // _slideT keeps resetting. Track raw distance-to-goal here instead: no new
  // best for 3s while trying to move = orbiting a building cluster. Ghost out.
  // (Playtest, M2: a convoy harvester circled Survey Post Beta's three
  // buildings forever without either escape ever firing.)
  if (!u.fly) {
    // new goal, or a gap in movement (unit stood mining/firing) — start fresh,
    // else the stale timer would fire a ghost on the first step after any pause
    if (o2._gx !== tx || o2._gy !== ty || tick - (o2._gTick || -9) > 2) {
      o2._gx = tx; o2._gy = ty; o2._gBest = Infinity; o2._gT = tick;
    }
    o2._gTick = tick;
    const dg = dist2(u.x, u.y, tx, ty);
    if (dg < o2._gBest - 400) { o2._gBest = dg; o2._gT = tick; }
    else if (tick - o2._gT > 180) { u.ghostT = 60; o2._gT = tick; }
  }
  // vehicles steer, they don't teleport-rotate: cap the hull turn rate so a
  // wall bump reads as a swerve, not a spin (infantry and dinos still snap)
  if (!IS_INF[u.type] && !IS_DINO[u.type]) {
    let da = a - u.faceA;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    u.faceA += Math.abs(da) > 0.22 ? Math.sign(da) * 0.22 : da;
  } else u.faceA = a;
  const step = Math.min(effSpeed(u), d);
  u.x += Math.cos(a) * step;
  u.y += Math.sin(a) * step;
  if (step > 0.2) {
    u.walkT += step;
    u.moving = true;
    // ground vehicles kick up dust while driving
    if (spritesReady && step > 0.6 && !IS_INF[u.type] && u.type !== 'spitter' && (tick + u.id) % 8 === 0) {
      fxSprite({
        img: pick(SPR.puff),
        x: u.x - Math.cos(a) * u.r, y: u.y - Math.sin(a) * u.r,
        vx: -Math.cos(a) * 0.25, vy: -Math.sin(a) * 0.25,
        s0: 5, s1: 14, a0: 0.22, max: 22,
      });
    }
  }
  return d - step < 5;
}

function updateUnit(u) {
  if (u.hp <= 0) return;   // killed earlier this tick (splash, capture) — the dead don't act
  // first contact: the moment any wild dino stands in player vision AWAY from
  // the base ("in the wild"), the wildlife stops being shy. A sighting at the
  // camp fence doesn't count — otherwise approaching = permission to enter.
  if (!wildSeen && u.team === 3 && (tick + u.id) % 30 === 0 &&
      isVisibleAt(u.x, u.y) && !nearestPlayerBld(u.x, u.y, 480)) wildSeen = true;
  if (u.cool > 0) u.cool--;
  // a ghost never re-solidifies while inside a building footprint — expiring
  // mid-building lets separation() eject it to the nearest face, which can be
  // right back into the pocket it was escaping
  if (u.ghostT > 0 && !(u.ghostT === 1 && !u.fly && buildings.some(b =>
    Math.abs(u.x - b.x) < b.w / 2 + u.r && Math.abs(u.y - b.y) < b.h / 2 + u.r))) u.ghostT--;
  u.moving = false;
  if (u.recoil) { u.recoil *= 0.78; if (u.recoil < 0.3) u.recoil = 0; }
  // pathing watchdog: while following a path, require steady progress toward
  // the goal. No progress for 2.5s = orbiting or wedged on a rock face —
  // re-route and briefly ghost through the obstacle lip to break the cycle.
  const op = u.order;
  if (op._path) {
    const dGoal = dist2(u.x, u.y, op._pgx, op._pgy);
    if (op._best === undefined || dGoal < op._best - 400) {
      op._best = dGoal; op._bestT = tick;
    } else if (tick - op._bestT > 90) {
      op._path = null; op._best = undefined;
      u.ghostT = 60;
    }
  }
  if (u.hp < u.maxHp && rankOf(u) >= 3) u.hp = Math.min(u.maxHp, u.hp + 0.05);   // Legends field-patch themselves
  const o = u.order;

  switch (o.type) {
    case 'idle': {
      // undelivered cargo always resumes its run — a move/stop order mid-haul
      // must never strand a specimen or egg (soft-locked the tutorial once)
      if (u.captive) { u.order = { type: 'returnCaptive' }; break; }
      if (u.eggCarry) { u.order = { type: 'returnEgg' }; break; }
      if (u.roam) { u.order = { type: 'roam' }; break; }   // loose dinos go back to wandering
      if (u.type === 'medic') {
        const w = nearestWoundedAlly(u, 260);
        if (w) u.order = { type: 'heal', target: w };
      } else if (u.type === 'engineer') {
        const nb = nearestDamagedBuilding(u.team, u.x, u.y, 240);
        if (nb) u.order = { type: 'repair', target: nb };
        else {
          const v = nearestWoundedAlly(u, 240, isVehicle);
          if (v) u.order = { type: 'heal', target: v };
        }
      } else if (u.type === 'harrier') {
        if (!u.armed) { u.order = { type: 'rearm' }; break; }
        const t = acquireTarget(u.x, u.y, u.team, UNIT.harrier.sight, u);
        if (t) u.order = { type: 'strike', target: t };
      } else if (isCombat(u)) {
        const t = acquireTarget(u.x, u.y, u.team, u.range + 70, u);
        if (t) u.order = { type: 'attack', target: t, resume: null };
      }
      break;
    }
    case 'move': {
      if (moveToward(u, o.x, o.y)) u.order = { type: 'idle' };
      break;
    }
    case 'hunker': {
      // dug in: half damage taken, holds position, still shoots what's in range.
      // Artillery keeps its dead zone while dug in — closing the gap still beats it.
      const t = acquireTarget(u.x, u.y, u.team, u.range, u);
      if (t) {
        u.faceA = Math.atan2(t.y - u.y, t.x - u.x);
        const min = UNIT[u.type].minRange;
        const d = dist(u.x, u.y, t.x, t.y) - (t.r || 0);
        if (u.cool <= 0 && !(min && d < min)) fire(u, t);
      }
      break;
    }
    case 'guard': {
      // nest creep AI: pounce on anything near home, chase to the leash, then walk back.
      // Never leaves this order, so artillery pounding from beyond aggro range goes unanswered.
      const t = acquireTarget(u.x, u.y, u.team, u.range + 90 + (u.team === 3 ? dinoAggro() : 0), u);
      if (t && dist(t.x, t.y, o.hx, o.hy) < NEST_LEASH + (u.team === 3 ? dinoAggro() : 0)) {
        const d = dist(u.x, u.y, t.x, t.y) - (t.r || 0);
        if (d > u.range) moveToward(u, t.x, t.y);
        else {
          u.faceA = Math.atan2(t.y - u.y, t.x - u.x);
          if (u.cool <= 0) fire(u, t);
        }
      } else if (dist(u.x, u.y, o.hx, o.hy) > 55) {
        moveToward(u, o.hx, o.hy);
      }
      break;
    }
    case 'roam': {
      // loose wildlife: fight whatever comes close (if armed), otherwise amble
      if (u.dmg > 0) {
        const t = acquireTarget(u.x, u.y, u.team, u.range + 110 + dinoAggro(), u);
        if (t) { u.order = { type: 'attack', target: t, resume: null }; break; }
      }
      // shy phase: until the player has actually SEEN wildlife, roamers keep
      // out of camp — no dinos strolling through the base before first contact.
      // The flee point is STICKY: picked once and held until reached — re-aiming
      // every tick made the heading whipsaw between base buildings (spin-out).
      if (!wildSeen && u.team === 3) {
        if (o.flee && dist(u.x, u.y, o.x, o.y) < 26) o.flee = false;
        if (!o.flee) {
          const nb = nearestPlayerBld(u.x, u.y, 480);
          if (nb) {
            const a = Math.atan2(u.y - nb.y, u.x - nb.x);
            o.x = clamp(u.x + Math.cos(a) * 520, 30, W - 30);
            o.y = clamp(u.y + Math.sin(a) * 520, 30, H - 30);
            o.flee = true;
            o._path = null;
          }
        }
      } else o.flee = false;
      if (o.x === undefined || dist(u.x, u.y, o.x, o.y) < 26) {
        if (Math.random() < 0.008) {   // graze a while, then drift somewhere new
          o.x = clamp(u.x + (Math.random() - 0.5) * 800, 30, W - 30);
          o.y = clamp(u.y + (Math.random() - 0.5) * 800, 30, H - 30);
          o._path = null;
        }
      } else moveToward(u, o.x, o.y);
      break;
    }
    case 'attackmove': {
      if (u.type === 'harrier') {
        if (!u.armed) { u.order = { type: 'rearm' }; break; }
        const ht = acquireTarget(u.x, u.y, u.team, UNIT.harrier.sight, u);
        if (ht) { u.order = { type: 'strike', target: ht }; break; }
        if (moveToward(u, o.x, o.y)) u.order = { type: 'idle' };
        break;
      }
      const t = acquireTarget(u.x, u.y, u.team, u.range + 90, u);
      if (t) { u.order = { type: 'attack', target: t, resume: { x: o.x, y: o.y } }; break; }
      if (moveToward(u, o.x, o.y)) u.order = { type: 'idle' };
      break;
    }
    case 'attack': {
      const t = o.target;
      if (!t || t.hp <= 0) {
        u.order = o.resume ? { type: 'attackmove', x: o.resume.x, y: o.resume.y } : { type: 'idle' };
        break;
      }
      // ordered at a flyer with a gun that can't elevate — give up rather than chase forever
      if (t.kind === 'unit' && UNIT[t.type].fly && !canAA(u)) {
        u.order = o.resume ? { type: 'attackmove', x: o.resume.x, y: o.resume.y } : { type: 'idle' };
        break;
      }
      const d = dist(u.x, u.y, t.x, t.y) - (t.r || 0);
      if (d > u.range) moveToward(u, t.x, t.y);
      else {
        u.faceA = Math.atan2(t.y - u.y, t.x - u.x);
        // artillery has a dead zone — anything that closes inside minRange is safe from it
        const min = UNIT[u.type].minRange;
        if (u.cool <= 0 && u.dmg > 0 && !(min && d < min)) fire(u, t);
      }
      break;
    }
    case 'harvest': {
      let c = o.target;
      if (!c || c.amount <= 0) {
        c = nearestCrystalTo(u.x, u.y, 600);
        if (!c) { u.order = { type: 'idle' }; break; }
        o.target = c;
      }
      if (u.carry >= carryCap(u)) { u.lastCrystal = c; u.order = { type: 'return' }; break; }
      const d = dist(u.x, u.y, c.x, c.y);
      if (d > c.r + u.r + 4) moveToward(u, c.x, c.y);
      else {
        u.faceA = Math.atan2(c.y - u.y, c.x - u.x);
        u.mineT++;
        if (u.mineT >= 9) {
          u.mineT = 0;
          u.carry++;
          c.amount--;
          fxMinePuff(c, u);
        }
      }
      break;
    }
    case 'board': {
      const apc = o.target;
      if (!apc || apc.hp <= 0 || !units.includes(apc) || !apc.cargo || apc.cargo.length >= UNIT.apc.cargo) {
        u.order = { type: 'idle' };
        break;
      }
      const d = dist(u.x, u.y, apc.x, apc.y);
      if (d > apc.r + u.r + 8) moveToward(u, apc.x, apc.y);
      else {
        apc.cargo.push(u);
        units = units.filter(x => x !== u);       // inside now — out of the world
        selection = selection.filter(s => s !== u);
        if (u.team === 1) beep(440, 0.06, 'triangle', 0.04);
      }
      break;
    }
    case 'strike': {
      // bomb run: fly at the target, one devastating hit, then home to rearm
      const t = o.target;
      if (!u.armed) { u.order = { type: 'rearm' }; break; }
      if (!t || t.hp <= 0) { u.order = { type: 'idle' }; break; }
      if (!moveToward(u, t.x, t.y) && dist(u.x, u.y, t.x, t.y) > 30) break;
      // bombs away
      u.armed = false;
      const D = UNIT.harrier;
      for (const e of units.slice()) {
        if (e.team === u.team || e.hp <= 0) continue;
        if (e.specimen && u.team === 1) continue;   // protected specimens shrug off player splash
        if (dist(t.x, t.y, e.x, e.y) <= D.bombSplash + e.r) damage(e, D.bomb * weaponMult(u), u);
      }
      for (const b of buildings.slice()) {
        if (b.team === u.team || b.hp <= 0) continue;
        if (dist(t.x, t.y, b.x, b.y) <= D.bombSplash + b.r) damage(b, D.bomb * D.bombBldBonus * weaponMult(u), u);
      }
      fxs.push({ kind: 'boom', x: t.x, y: t.y, t: 0, max: 20, size: D.bombSplash });
      fxExplosion(t.x, t.y, 26, true);
      addShake(t.x, t.y, 8);
      snd.boom();
      u.order = { type: 'rearm' };
      break;
    }
    case 'rearm': {
      const pad = buildings.find(b => b.team === u.team && b.type === 'airpad' && b.built >= 1);
      if (!pad) { u.order = { type: 'idle' }; break; }
      const d = dist(u.x, u.y, pad.x, pad.y);
      if (d > 30) { moveToward(u, pad.x, pad.y); o.t = 0; }
      else if ((o.t = (o.t || 0) + 1) >= HARRIER_REARM) {   // 7s on the pad
        u.armed = true;
        u.order = { type: 'idle' };
        if (u.team === 1) { toast('Harrier rearmed'); snd.ready(); }
      }
      break;
    }
    case 'heal': {
      const pred = u.type === 'engineer' ? isVehicle : isFlesh;
      const rate = u.type === 'engineer' ? UNIT.engineer.repair : UNIT.medic.heal;
      const t = o.target;
      if (!t || t.hp <= 0 || t.hp >= t.maxHp || !units.includes(t)) {
        const w = nearestWoundedAlly(u, 300, pred);
        if (w) { o.target = w; break; }
        u.order = { type: 'idle' };
        break;
      }
      const d = dist(u.x, u.y, t.x, t.y) - t.r;
      if (d > 26) moveToward(u, t.x, t.y);
      else {
        u.faceA = Math.atan2(t.y - u.y, t.x - u.x);
        t.hp = Math.min(t.maxHp, t.hp + rate);
        if (tick % 12 === 0) {
          fxs.push({ kind: 'spark', x: t.x + (Math.random() - 0.5) * 10, y: t.y - 8, t: 0, max: 18 });
        }
        if (tick % 60 === 0 && u.team === 1) snd.repair();
      }
      break;
    }
    case 'repair': {
      const b = o.target;
      if (!b || b.hp <= 0 || b.hp >= b.maxHp) {
        const nb = nearestDamagedBuilding(u.team, u.x, u.y, 280);
        if (nb) { o.target = nb; break; }
        u.order = { type: 'idle' };
        break;
      }
      const d = dist(u.x, u.y, b.x, b.y);
      if (d > b.r + u.r + 10) moveToward(u, b.x, b.y);
      else {
        u.faceA = Math.atan2(b.y - u.y, b.x - u.x);
        b.hp = Math.min(b.maxHp, b.hp + UNIT.engineer.repair);
        if (tick % 10 === 0) {
          fxs.push({ kind: 'spark', x: b.x + (Math.random() - 0.5) * b.w * 0.7, y: b.y + (Math.random() - 0.5) * b.h * 0.7, t: 0, max: 18 });
        }
        if (tick % 40 === 0 && u.team === 1) snd.repair();
      }
      break;
    }
    case 'collect': {
      // egg run: walk to the egg, scoop it up, bring it home to the HQ lab
      let egg = o.target;
      if (!egg || !eggs.includes(egg)) {
        egg = nearestEggTo(u.x, u.y, 500);
        if (!egg) { u.order = { type: 'idle' }; break; }
        o.target = egg;
      }
      if (u.eggCarry) { u.order = { type: 'returnEgg' }; break; }
      const d = dist(u.x, u.y, egg.x, egg.y);
      if (d > egg.r + u.r + 4) moveToward(u, egg.x, egg.y);
      else {
        u.eggCarry = true;
        u.lastEggSite = { x: egg.x, y: egg.y };   // remember the clutch for repeat trips
        eggs = eggs.filter(e => e !== egg);
        u.order = { type: 'returnEgg' };
      }
      break;
    }
    case 'capture': {
      // capture rig: close to contact range, channel, and bag a live specimen
      const tgt = o.target;
      if (u.captive) { u.order = { type: 'returnCaptive' }; break; }
      if (!tgt || tgt.hp <= 0 || !units.includes(tgt) || !tgt.specimen) { u.capT = 0; u.order = { type: 'idle' }; break; }
      const d = dist(u.x, u.y, tgt.x, tgt.y) - tgt.r;
      if (d > RIG_CAP_RANGE) { u.capT = 0; moveToward(u, tgt.x, tgt.y); }
      else {
        u.faceA = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        u.capT++;
        if (tick % 9 === 0) {
          fxs.push({ kind: 'spark', x: tgt.x + (Math.random() - 0.5) * 16, y: tgt.y + (Math.random() - 0.5) * 16, t: 0, max: 16 });
        }
        if (u.capT >= RIG_CAP_TIME) {
          u.capT = 0;
          tgt.hp = 0;                       // silent removal — no death fx, no kill credit
          u.captive = true;
          if (u.team === 1) { toast('🦖 Specimen bagged — haul the rig back to the HQ'); snd.ready(); }
          u.order = { type: 'returnCaptive' };
        }
      }
      break;
    }
    case 'returnCaptive': {
      const hq = buildings.find(b => b.team === u.team && b.type === 'hq' && b.built >= 1);
      if (!hq) { u.order = { type: 'idle' }; break; }
      const d = dist(u.x, u.y, hq.x, hq.y);
      if (d > hq.r + u.r + 8) moveToward(u, hq.x, hq.y);
      else {
        u.captive = false;
        teams[u.team].captives++;
        if (u.team === 1) {
          fxs.push({ kind: 'text', x: u.x, y: u.y - 14, t: 0, max: 60, msg: '🦖 specimen delivered' });
          toast('🦖 Live specimen delivered to the lab');
          snd.deposit();
        }
        u.order = { type: 'idle' };
      }
      break;
    }
    case 'returnEgg': {
      const hq = buildings.find(b => b.team === u.team && b.type === 'hq' && b.built >= 1);
      if (!hq) { u.order = { type: 'idle' }; break; }
      const d = dist(u.x, u.y, hq.x, hq.y);
      if (d > hq.r + u.r + 8) moveToward(u, hq.x, hq.y);
      else {
        u.eggCarry = false;
        teams[u.team].eggs++;
        if (u.team === 1) {
          fxs.push({ kind: 'text', x: u.x, y: u.y - 14, t: 0, max: 50, msg: '+1 🥚' });
          toast(`Egg secured (${teams[1].eggs} 🥚) — select the HQ to hatch a Spitter`);
          snd.deposit();
        }
        // more eggs at the clutch (or nearby)? keep hauling; otherwise back to normal life
        const next = (u.lastEggSite && nearestEggTo(u.lastEggSite.x, u.lastEggSite.y, 400))
          || nearestEggTo(u.x, u.y, 900);
        u.order = next ? { type: 'collect', target: next } : { type: 'idle' };
      }
      break;
    }
    case 'return': {
      const hq = nearestDropoff(u.team, u.x, u.y);
      if (!hq) {
        if (u.team === 1 && tick - lastNoRefinery > 12 * 60) {
          lastNoRefinery = tick;
          toast('⚠ No refinery standing — crystals have nowhere to go');
          snd.error();
        }
        u.order = { type: 'idle' }; break;
      }
      const d = dist(u.x, u.y, hq.x, hq.y);
      if (d > hq.r + u.r + 8) moveToward(u, hq.x, hq.y);
      else {
        teams[u.team].crystals += u.carry;
        if (u.team === 1) {
          stats.mined += u.carry;
          fxs.push({ kind: 'text', x: u.x, y: u.y - 14, t: 0, max: 50, msg: '+' + u.carry });
          // no deposit sound for crystals (playtest: too chatty) — eggs/captives keep it
        }
        u.carry = 0;
        const c = (u.lastCrystal && u.lastCrystal.amount > 0) ? u.lastCrystal : nearestCrystalTo(u.x, u.y, 700);
        u.order = c ? { type: 'harvest', target: c } : { type: 'idle' };
      }
      break;
    }
  }
}

// keep units from stacking, and out of buildings
function separation() {
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      if (!!a.fly !== !!b.fly) continue;   // different altitudes never collide
      const dx = b.x - a.x, dy = b.y - a.y;
      const min = a.r + b.r;
      if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2), push = (min - d) / 2;
      const nx = dx / d, ny = dy / d;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
    }
    if (!a.fly) for (const rk of rocks) {
      if (a.ghostT > 0 && !rk.cliff) continue;   // ghosts slip pinch rocks — never cliff walls (ramps stay the only way up)
      const dx = a.x - rk.x, dy = a.y - rk.y;
      const min = rk.r + a.r;
      if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      if (d2 === 0) { a.x = rk.x + min; continue; }
      const d = Math.sqrt(d2), push = min - d;
      a.x += (dx / d) * push; a.y += (dy / d) * push;
    }
    for (const bl of buildings) {
      if (a.fly || a.ghostT > 0) break;    // flyers hover; ghosting units slip out of pockets
      if (bl.sunk) continue;               // lowered depots/plants are drive-over ground
      const cxp = clamp(a.x, bl.x - bl.w / 2, bl.x + bl.w / 2);
      const cyp = clamp(a.y, bl.y - bl.h / 2, bl.y + bl.h / 2);
      const dx = a.x - cxp, dy = a.y - cyp;
      const d2 = dx * dx + dy * dy;
      if (d2 >= a.r * a.r) continue;
      if (d2 === 0) { a.x = bl.x + (bl.w / 2 + a.r + 2) * (a.x >= bl.x ? 1 : -1); continue; }
      const d = Math.sqrt(d2), push = a.r - d;
      a.x += (dx / d) * push; a.y += (dy / d) * push;
    }
    a.x = clamp(a.x, a.r, W - a.r);
    a.y = clamp(a.y, a.r, H - a.r);
  }
}

// ---------------- Buildings ----------------
function updateBuilding(b) {
  if (b.hp <= 0) return;   // dead this tick — no healing, firing, or spawning from the grave
  if (b.built < 1) {
    const bt = BLD[b.type].buildTime || BLD.turret.buildTime;
    b.built = Math.min(1, b.built + (b.buildBoost || 1) / bt);
    // hp accrues incrementally so combat damage during construction STICKS —
    // the old max(hp, maxHp*built) floor silently healed any non-lethal hit
    b.hp = Math.min(b.maxHp, b.hp + (b.maxHp / bt) * (b.buildBoost || 1));
    if (b.built >= 1 && b.type === 'refinery') {
      // refineries come online with a free harvester, C&C style
      const u = makeUnit('harvester', b.team, b.x, b.y + b.h / 2 + 16);
      const c = nearestCrystalTo(b.x, b.y, 500);
      u.order = c ? { type: 'harvest', target: c } : { type: 'idle' };
      if (b.team === 1) { toast('Refinery online — free harvester deployed'); snd.ready(); }
    }
    return;
  }
  if (b.type === 'nest') {
    // keep the brood topped up until the nest dies; the clock only runs while
    // short a dino, so each loss costs the full respawn delay
    const brood = units.filter(u => u.team === 3 && u.home === b.id).length;
    if (brood >= NEST_BROOD) { b.respawnT = 0; return; }
    b.respawnT = (b.respawnT || 0) + 1;
    if (b.respawnT >= Math.max(3 * 60, NEST_RESPAWN - dinoRage * 45)) {
      b.respawnT = 0;
      spawnSpitter(b);
    }
    return;
  }
  if (b.type === 'den') {
    // the den HUNTS. Every DEN_PACK_EVERY it births a raptor pack and sends it
    // at the nearest standing structure of ANY faction — dens don't pick sides.
    // Survivors that finish a hunt trot home and thicken the door guard.
    const pack = units.filter(u => u.team === 3 && u.home === b.id);
    for (const u of pack) {
      if (u.order.type === 'idle') u.order = { type: 'guard', hx: b.x, hy: b.y };
    }
    if (pack.length >= DEN_RAPTOR_CAP) return;   // hunts pause at cap, clock and all
    b.packT = (b.packT || 0) + 1;
    if (b.packT >= Math.max(25 * 60, DEN_PACK_EVERY - dinoRage * 90)) {
      b.packT = 0;
      let t = null, bd = 1e18;
      for (const o of buildings) {
        if (o.team === 3 || o.hp <= 0 || o.built < 1) continue;
        const d = dist2(b.x, b.y, o.x, o.y);
        if (d < bd) { bd = d; t = o; }
      }
      for (let i = 0; i < DEN_PACK_SIZE; i++) {
        const u = spawnRaptor(b);
        if (t) u.order = { type: 'attackmove', x: t.x + (i - 1) * 26, y: t.y + 26 };
      }
      // warn at the TARGET, not the den — pinging the den would leak its
      // location through the fog before the player has ever seen it
      if (t && t.team === 1) raiseAlert(t.x, t.y, '🦖 A raptor pack is on the hunt — it smells your base!');
    }
    return;
  }
  if (b.type === 'supply') {
    // logistics field: the depot slowly patches up nearby friendly buildings —
    // a weak, free engineer that never wanders off (fields from several depots stack)
    for (const o of buildings) {
      if (o.team !== b.team || o.built < 1 || o.hp <= 0 || o.hp >= o.maxHp) continue;
      if (dist2(b.x, b.y, o.x, o.y) > DEPOT_HEAL_RADIUS ** 2) continue;
      o.hp = Math.min(o.maxHp, o.hp + DEPOT_HEAL_RATE);
      if ((tick + o.id) % 60 === 0) {
        fxs.push({ kind: 'spark', x: o.x + (Math.random() - 0.5) * o.w * 0.6, y: o.y + (Math.random() - 0.5) * o.h * 0.6, t: 0, max: 18 });
      }
    }
  }
  if (b.type === 'factory' || b.type === 'airpad') {
    // repair bay: the factory fixes ground vehicles, the airpad fixes flyers —
    // for a fee. Drive home damaged, drive out patched and poorer.
    const t = teams[b.team];
    for (const u of units) {
      if (t.crystals < 1) break;
      if (u.team !== b.team || u.hp <= 0 || u.hp >= u.maxHp || !isVehicle(u)) continue;
      if (!!u.fly !== (b.type === 'airpad')) continue;
      if (dist2(b.x, b.y, u.x, u.y) > BAY_REPAIR_RADIUS ** 2) continue;
      const healed = Math.min(BAY_REPAIR_RATE, u.maxHp - u.hp, t.crystals / BAY_REPAIR_COST);
      u.hp += healed;
      t.crystals -= healed * BAY_REPAIR_COST;
      if ((tick + u.id) % 30 === 0) {
        fxs.push({ kind: 'spark', x: u.x + (Math.random() - 0.5) * 14, y: u.y + (Math.random() - 0.5) * 14, t: 0, max: 16 });
        if (b.team === 1) snd.repair();
      }
    }
  }
  if (b.cool > 0) b.cool--;
  if (b.recoil) { b.recoil *= 0.78; if (b.recoil < 0.3) b.recoil = 0; }
  if (b.dmg > 0) {
    const t = BLD[b.type].airOnly
      ? nearestEnemyUnit(b.x, b.y, b.team, b.range, true, true)
      : acquireTarget(b.x, b.y, b.team, b.range, b);
    if (t) {
      b.faceA = Math.atan2(t.y - b.y, t.x - b.x);
      if (b.cool <= 0) fire(b, t);
    }
  }
  updateProduction(b);
}

// ---------------- Bullets & FX ----------------
function updateBullets() {
  for (const p of bullets) {
    if (p.target && p.target.hp > 0) { p.tx = p.target.x; p.ty = p.target.y; }
    const d = dist(p.x, p.y, p.tx, p.ty);
    if (d <= p.speed + 2) {
      p.dead = true;
      if (p.kind === 'arc') {
        // splash at the impact point: full damage to everything hostile in the
        // radius; buildings eat the siege bonus on top
        for (const u of units) {
          if (u.team === p.team || u.hp <= 0) continue;
          if (dist(p.tx, p.ty, u.x, u.y) <= p.splash + u.r) damage(u, p.dmg, p.src);
        }
        for (const b of buildings) {
          if (b.team === p.team || b.hp <= 0) continue;
          if (dist(p.tx, p.ty, b.x, b.y) <= p.splash + b.r) damage(b, p.dmg * p.bldBonus, p.src);
        }
        fxs.push({ kind: 'boom', x: p.tx, y: p.ty, t: 0, max: 18, size: p.splash * 0.8 });
        fxExplosion(p.tx, p.ty, 18, false);
        addShake(p.tx, p.ty, 3);
        continue;
      }
      if (p.target && p.target.hp > 0 && dist(p.tx, p.ty, p.target.x, p.target.y) < (p.target.r || 12) + 14) {
        damage(p.target, p.dmg, p.src);
      }
      if (p.kind === 'shell') {
        fxs.push({ kind: 'boom', x: p.tx, y: p.ty, t: 0, max: 14, size: 14 });
        fxExplosion(p.tx, p.ty, 12, false);
      } else if (p.kind === 'rocket') {
        fxs.push({ kind: 'boom', x: p.tx, y: p.ty, t: 0, max: 12, size: 11 });
        fxExplosion(p.tx, p.ty, 9, false);
      }
      continue;
    }
    const a = Math.atan2(p.ty - p.y, p.tx - p.x);
    p.a = a;
    p.x += Math.cos(a) * p.speed;
    p.y += Math.sin(a) * p.speed;
    if (p.kind === 'rocket' && spritesReady && tick % 3 === 0) {
      fxSprite({ img: pick(SPR.puff), x: p.x, y: p.y, s0: 5, s1: 12, a0: 0.35, max: 20 });
    }
  }
  bullets = bullets.filter(p => !p.dead);
}
function updateFx() {
  for (const f of fxs) f.t++;
  fxs = fxs.filter(f => f.t < f.max);
  for (const a of alerts) a.t++;
  alerts = alerts.filter(a => a.t < 150);
  // smoke + fire from badly damaged buildings and tanks (only where the player can see)
  if (spritesReady && tick % 7 === 0) {
    for (const b of buildings) {
      if (b.built < 1 || b.hp >= b.maxHp * 0.65 || !isVisibleAt(b.x, b.y)) continue;
      const frac = 1 - b.hp / b.maxHp;
      const sx = b.x + (Math.random() - 0.5) * b.w * 0.6, sy = b.y + (Math.random() - 0.5) * b.h * 0.6;
      if (Math.random() < frac * 1.2) fxDamageSmoke(sx, sy, 18 + frac * 14);
      if (frac > 0.5 && Math.random() < frac * 0.8) fxDamageFire(sx, sy, 10 + frac * 10);
    }
    for (const u of units) {
      if (u.type !== 'tank' || u.hp >= u.maxHp * 0.55 || !isVisibleAt(u.x, u.y)) continue;
      if (Math.random() < 0.85) fxDamageSmoke(u.x, u.y, 13);
      if (u.hp < u.maxHp * 0.3 && Math.random() < 0.5) fxDamageFire(u.x, u.y, 8);
    }
  }
}

// ---------------- Enemy AI ----------------
// site check mirroring canPlaceBuilding, minus the team-1-only rules
function aiSpotFree(type, wx, wy) {
  const d = BLD[type];
  if (wx < 40 || wy < 40 || wx > W - 40 || wy > H - 40) return false;
  for (const b of buildings) {
    if (Math.abs(wx - b.x) < (b.w + d.w) / 2 + 10 && Math.abs(wy - b.y) < (b.h + d.h) / 2 + 10) return false;
  }
  // refineries keep a wider standoff from the crystals themselves — auto-placed
  // ones were landing right on the field's doorstep (playtest feedback)
  const cGap = d.w / 2 + (type === 'refinery' ? 65 : 26);
  for (const c of crystals) if (c.amount > 0 && dist2(wx, wy, c.x, c.y) < cGap ** 2) return false;
  for (const rk of rocks) if (Math.abs(wx - rk.x) < d.w / 2 + rk.r && Math.abs(wy - rk.y) < d.h / 2 + rk.r) return false;
  if (type === 'refinery' && !crystals.some(c => c.amount > 0 && dist2(wx, wy, c.x, c.y) < REFINERY_NEAR_CRYSTAL ** 2)) return false;
  return true;
}
function aiPlace(type, nearX, nearY) {
  const t = teams[2];
  if (t.crystals < BLD[type].cost) return false;
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = type === 'refinery' ? 50 + Math.random() * 120 : 90 + Math.random() * 190;
    const x = clamp(nearX + Math.cos(a) * r, 60, W - 60);
    const y = clamp(nearY + Math.sin(a) * r, 60, H - 60);
    if (!aiSpotFree(type, x, y)) continue;
    t.crystals -= BLD[type].cost;
    makeBuilding(type, 2, x, y, true);
    return true;
  }
  return false;
}
// richest live crystal that has no AI drop-off yet and no nest standing guard
function aiExpansionSpot() {
  let best = null, bestAmt = 0;
  for (const c of crystals) {
    if (c.amount <= 0 || c.amount <= bestAmt) continue;
    if (buildings.some(b => b.team === 2 && (b.type === 'hq' || b.type === 'refinery') && dist2(b.x, b.y, c.x, c.y) < 500 ** 2)) continue;
    if (buildings.some(b => (b.type === 'nest' || b.type === 'den') && dist2(b.x, b.y, c.x, c.y) < 420 ** 2)) continue;
    bestAmt = c.amount; best = c;
  }
  return best;
}
// the AI plays by the same tech tree: if a requirement is missing, build that
// first; if it's already under construction, wait for it instead of stacking dupes
function aiBuild(type, nearX, nearY) {
  const miss = (BLD[type].req || []).find(r => !buildings.some(b => b.team === 2 && b.type === r && b.built >= 1));
  if (miss) {
    if (buildings.some(b => b.team === 2 && b.type === miss)) return false;   // requirement is going up — wait
    return aiBuild(miss, nearX, nearY);
  }
  return aiPlace(type, nearX, nearY);
}
function aiUpdate() {
  if (tick % 30 !== 0 || gameOver) return;
  if (mission && mission.noEnemy) return;   // scripted missions may field no red team
  const t = teams[2];
  // small passive trickle that grows over time, so the AI never fully stalls
  t.crystals += (1.2 + Math.min(3, tick / 21600)) * diff.trickle;

  const hq = buildings.find(b => b.team === 2 && b.type === 'hq');
  const rax = buildings.find(b => b.team === 2 && b.type === 'barracks');
  const harvesters = units.filter(u => u.team === 2 && u.type === 'harvester');

  if (hq && harvesters.length < 3 && hq.queue.length === 0 && t.crystals >= UNIT.harvester.cost) {
    trainUnit(hq, 'harvester');
  }
  // keep one engineer on staff for base repairs (after the opening)
  const engineers = units.filter(u => u.team === 2 && u.type === 'engineer');
  if (hq && engineers.length < 1 && tick > 120 * 60 && hq.queue.length === 0 && t.crystals >= UNIT.engineer.cost) {
    trainUnit(hq, 'engineer');
  }
  // army size ramps over time so the first assaults are survivable while learning
  const fac = buildings.find(b => b.team === 2 && b.type === 'factory' && b.built >= 1);
  const air = buildings.find(b => b.team === 2 && b.type === 'airpad' && b.built >= 1);
  const queued = [rax, fac, air].reduce((s, bld) =>
    s + (bld ? bld.queue.reduce((q, ty) => q + (ty.startsWith('up:') ? 0 : UNIT[ty].supply), 0) : 0), 0);
  const armySupply = units.reduce((s, u) => (u.team === 2 && isCombat(u) ? s + UNIT[u.type].supply : s), 0) + queued;
  const armyCap = 3 + Math.floor((tick / 3600) * diff.capRate);   // +capRate supply per minute
  if (rax && rax.queue.length < 2 && armySupply < armyCap) {
    const roll = Math.random();
    const medics = units.filter(u => u.team === 2 && u.type === 'medic').length;
    if (t.crystals >= UNIT.sniper.cost && roll < 0.3) trainUnit(rax, 'sniper');
    else if (tick > 4 * 3600 && medics < 2 && t.crystals >= UNIT.medic.cost && roll < 0.45) trainUnit(rax, 'medic');
    else if (tick > 5 * 3600 && t.crystals >= UNIT.rocket.cost && roll < 0.6) trainUnit(rax, 'rocket');
    else if (t.crystals >= UNIT.marine.cost) trainUnit(rax, 'marine');
  }
  if (fac && fac.queue.length < 2 && armySupply < armyCap) {
    const roll = Math.random();
    // artillery only after 4 min — early arty waves would out-range every defense
    if (tick > 4 * 3600 && t.crystals >= UNIT.artillery.cost && roll < 0.15) trainUnit(fac, 'artillery');
    else if (t.crystals >= UNIT.tank.cost && roll < 0.45) trainUnit(fac, 'tank');
    else if (t.crystals >= UNIT.raider.cost && roll < 0.75) trainUnit(fac, 'raider');
  }
  // --- base building: fix supply crunches, rebuild losses, expand when flush ---
  if (tick % 150 === 0 && hq) {
    const have = (ty) => buildings.filter(b => b.team === 2 && b.type === ty).length;
    if (lowPower(2) && t.crystals > BLD.power.cost + 50
        && !buildings.some(b => b.team === 2 && b.type === 'power' && b.built < 1)) {
      aiBuild('power', hq.x, hq.y);   // a browned-out army loses wars — fix the grid first (one at a time)
    } else if (supplyMax(2) - supplyUsed(2) < 5 && supplyMax(2) < SUPPLY_HARD_CAP && t.crystals > BLD.supply.cost + 100) {
      aiBuild('supply', hq.x, hq.y);
    } else if (!buildings.some(b => b.team === 2 && b.type === 'refinery')
               && t.crystals > BLD.refinery.cost) {
      // no refinery in ANY state = no income at all now — rebuild before anything
      // military (built<1 counts: one rebuild at a time, same rule as power)
      const c = nearestCrystalTo(hq.x, hq.y, 900);
      aiBuild('refinery', c ? c.x + 70 : hq.x, c ? c.y + 70 : hq.y);
    } else if (!have('barracks') && t.crystals > BLD.barracks.cost) {
      aiBuild('barracks', hq.x, hq.y);
    } else if (!have('factory') && t.crystals > BLD.factory.cost + 150) {
      aiBuild('factory', hq.x, hq.y);
    } else if (!have('airpad') && tick > 5 * 3600 && t.crystals > BLD.airpad.cost + 250) {
      aiBuild('airpad', hq.x, hq.y);
    } else if (units.some(u => u.team === 1 && u.fly) && have('flak') < 2 && t.crystals > 300) {
      aiBuild('flak', hq.x, hq.y);   // player went air — answer with AA
    } else if (diff.aiNukes && !have('silo') && tick > 8 * 3600 && t.crystals > BLD.silo.cost + 400) {
      aiBuild('silo', hq.x, hq.y);
    } else if (t.crystals > 400 && have('refinery') < 3 && tick > 4 * 3600) {
      const spot = aiExpansionSpot();
      // aiBuild, not aiPlace: refineries need a depot now — if the AI somehow lost
      // every depot, this builds one at the expansion (an outpost wants supply anyway)
      if (spot) aiBuild('refinery', spot.x + 60, spot.y + 60);
    }
  }
  // nuclear ambitions (Hard / Spec Ops only)
  if (diff.aiNukes) {
    const silo = buildings.find(b => b.team === 2 && b.type === 'silo' && b.built >= 1);
    if (silo) {
      if (!silo.warhead && t.crystals >= NUKE.hq.cost + 500) buyNuke(silo, 'hq');
      else if (!silo.warhead && t.crystals >= NUKE.tac.cost + 500) buyNuke(silo, 'tac');
      else if (silo.warhead && Math.random() < 0.02) {
        let target = null;
        if (silo.warhead === 'hq') target = buildings.find(b => b.team === 1 && b.type === 'hq');
        else {
          const cands = buildings.filter(b => b.team === 1 && b.type !== 'hq' &&
            !buildings.some(h => h.type === 'hq' && dist2(b.x, b.y, h.x, h.y) < NUKE_HQ_EXCLUSION ** 2));
          target = cands[Math.floor(Math.random() * cands.length)];
        }
        if (target) launchNuke(silo, target.x, target.y);
      }
    }
  }
  // gunships arrive mid-game — the AI holds off so early waves stay learnable
  if (air && air.queue.length < 1 && armySupply < armyCap && tick > 6 * 3600 && Math.random() < 0.35) {
    if (tick > 9 * 3600 && t.crystals >= UNIT.harrier.cost && Math.random() < 0.4) trainUnit(air, 'harrier');
    else if (t.crystals >= UNIT.gunship.cost) trainUnit(air, 'gunship');
  }
  // once the economy is rolling, the AI researches upgrades with spare cash
  if (diff.aiUpgrades && tick > 5 * 3600 && t.crystals > 350 && Math.random() < 0.06) {
    const keys = Object.keys(UPG);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const host = buildings.find(b => b.team === 2 && b.type === UPG[key].at && b.built >= 1 && b.queue.length === 0);
    if (host) startResearch(host, key);
  }
}
function waveUpdate() {
  if (gameOver) return;
  if (mission && (mission.noEnemy || mission.noWaves)) return;
  if (tick < waveAt) return;
  waveNum++;
  waveAt = tick + Math.max(55, 82 - waveNum * 3) * 60 * diff.waveEvery;
  const targ = buildings.find(b => b.team === 1 && b.type === 'hq')
            || buildings.find(b => b.team === 1)
            || units.find(u => u.team === 1);
  if (!targ) return;
  let sent = 0;
  for (const u of units) {
    if (u.team !== 2) continue;
    if (isCombat(u)) {
      const p = spreadPoint(targ.x, targ.y, sent++);
      u.order = { type: 'attackmove', x: p.x, y: p.y };
    } else if (u.type === 'medic') {
      const p = spreadPoint(targ.x, targ.y, sent);
      u.order = { type: 'move', x: p.x, y: p.y };   // tags along, heals on arrival
    }
  }
  if (sent > 0) { toast('⚔ Enemy assault incoming!'); snd.alarm(); }
}

// ---------------- End condition ----------------
// the verdict overlay is delayed so the HQ explosion can play out — but the
// pending timeout must die with the world, or it fires over the menu / next game
let overlayTimer = null;
function overlayStats() {
  const mins = Math.floor(tick / 3600), secs = Math.floor((tick % 3600) / 60);
  document.getElementById('ov-stats').innerHTML =
    `<div><b>${mins}:${String(secs).padStart(2, '0')}</b><span>match time</span></div>` +
    `<div><b>${stats.built}</b><span>units fielded</span></div>` +
    `<div><b>${stats.lost}</b><span>units lost</span></div>` +
    `<div><b>${stats.kills}</b><span>kills</span></div>` +
    `<div><b>${Math.floor(stats.mined)}</b><span>crystals mined</span></div>`;
}
function checkEnd() {
  if (gameOver) return;
  const pAlive = buildings.some(b => b.team === 1 && b.type === 'hq');
  if (mission) {
    // campaign: victory comes from objectives (missionUpdate); HQ loss is always defeat
    if (!pAlive) missionEnd(false);
    return;
  }
  const eAlive = buildings.some(b => b.team === 2 && b.type === 'hq');
  if (!pAlive || !eAlive) {
    gameOver = pAlive ? 'win' : 'lose';
    // let the HQ explosion play out before the verdict drops
    overlayTimer = setTimeout(() => {
      elOvTitle.textContent = pAlive ? 'VICTORY' : 'DEFEAT';
      elOvTitle.className = pAlive ? 'win' : 'lose';
      elOvSub.textContent = pAlive
        ? 'The enemy headquarters is rubble. The crystal fields are yours, Commander.'
        : 'Your headquarters has fallen. The crystals belong to the enemy… for now.';
      overlayStats();
      document.getElementById('btn-again').textContent = '↻ Play again';
      elOverlay.classList.remove('hidden');
      beep(pAlive ? 520 : 220, 0.5, 'sine', 0.06, pAlive ? 1040 : 80);
    }, 1400);
  }
}

// ---------------- Input ----------------
const mouse = { sx: 0, sy: 0, wx: 0, wy: 0, overCanvas: false, inWindow: false };
let dragging = false, dragStart = null;
let selection = [];
let attackMoveMode = false;
let placing = null;                  // 'turret' while placing
const groups = {};
const keys = {};

function setCursor() {
  cv.style.cursor = (attackMoveMode || placing || nukeTargeting) ? 'crosshair' : 'default';
}
function pruneSelection() {
  selection = selection.filter(e => e.hp > 0 && (e.kind !== 'unit' || units.includes(e)));
}
const canHunker = (u) => u.type === 'marine' || u.type === 'artillery' || u.type === 'sniper';
function toggleHunker() {
  const diggers = selection.filter(s => s.kind === 'unit' && canHunker(s) && s.hp > 0);
  if (!diggers.length) return;
  const allDown = diggers.every(m => m.order.type === 'hunker');
  for (const m of diggers) m.order = allDown ? { type: 'idle' } : { type: 'hunker' };
  if (!allDown) {
    const label = diggers.every(d => d.type === 'artillery') ? 'Artillery dug in'
      : diggers.every(d => d.type === 'marine') ? 'Marines hunkered down'
      : diggers.every(d => d.type === 'sniper') ? 'Snipers gone prone' : 'Troops dug in';
    toast(label + ' — half damage, holding position');
  }
  beep(allDown ? 500 : 380, 0.07, 'triangle', 0.04);
}

cv.addEventListener('mousemove', (e) => {
  mouse.sx = e.clientX; mouse.sy = e.clientY;
  mouse.overCanvas = true;
});
window.addEventListener('mousemove', (e) => {
  mouse.sx = e.clientX; mouse.sy = e.clientY;
  mouse.inWindow = true;
});
document.addEventListener('mouseleave', () => { mouse.inWindow = false; });

cv.addEventListener('mousedown', (e) => {
  audioInit();
  if (e.button !== 0) return;
  const wx = mouse.sx + cam.x, wy = mouse.sy + cam.y;
  if (nukeTargeting) {
    if (nukeTargeting.warhead && launchNuke(nukeTargeting, wx, wy)) { nukeTargeting = null; setCursor(); }
    return;
  }
  if (placing) { tryPlaceBuilding(placing, wx, wy); return; }
  if (attackMoveMode) {
    commandMove(selection, wx, wy, true);
    attackMoveMode = false; setCursor();
    fxs.push({ kind: 'ping', x: wx, y: wy, t: 0, max: 22, color: '#e0564a' });
    return;
  }
  dragging = true;
  dragStart = { x: wx, y: wy };
});
window.addEventListener('mouseup', (e) => {
  if (e.button !== 0 || !dragging) return;
  dragging = false;
  const wx = mouse.sx + cam.x, wy = mouse.sy + cam.y;
  const x0 = Math.min(dragStart.x, wx), x1 = Math.max(dragStart.x, wx);
  const y0 = Math.min(dragStart.y, wy), y1 = Math.max(dragStart.y, wy);
  if (x1 - x0 < 6 && y1 - y0 < 6) {
    // point select (own things only)
    const t = thingAtPoint(wx, wy);
    selection = (t && t.team === 1 && t.hp > 0) ? [t] : [];
  } else {
    const picked = units.filter(u => u.team === 1 && u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1);
    if (picked.length) selection = picked;
    else {
      const b = buildings.find(b => b.team === 1 && b.x >= x0 && b.x <= x1 && b.y >= y0 && b.y <= y1);
      selection = b ? [b] : [];
    }
  }
  if (selection.length) snd.select();   // soft select blip
});
cv.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  audioInit();
  const wx = mouse.sx + cam.x, wy = mouse.sy + cam.y;
  if (placing || attackMoveMode || nukeTargeting) { placing = null; attackMoveMode = false; nukeTargeting = null; setCursor(); return; }
  pruneSelection();
  if (!selection.length) return;

  const hasUnits = selection.some(s => s.kind === 'unit');
  if (!hasUnits) {
    // building(s) selected → set rally
    for (const b of selection) if (b.rally) b.rally = { x: wx, y: wy };
    fxs.push({ kind: 'ping', x: wx, y: wy, t: 0, max: 22, color: '#8fd8cf' });
    return;
  }
  const t = thingAtPoint(wx, wy);
  if (t && t.kind === 'crystal') commandHarvest(selection, t);
  else if (t && t.kind === 'unit' && t.team === 1 && t.type === 'apc'
           && selection.some(s => s.kind === 'unit' && IS_INF[s.type] && s !== t)) {
    for (const s of selection) {
      if (s.kind !== 'unit' || s === t) continue;
      if (s.type === 'engineer' && t.hp < t.maxHp) s.order = { type: 'heal', target: t };
      else if (IS_INF[s.type]) s.order = { type: 'board', target: t };
    }
    fxs.push({ kind: 'ping', x: t.x, y: t.y, t: 0, max: 22, color: '#8fd8cf' });
  }
  else if (t && t.kind === 'unit' && t.team === 1 && t.hp < t.maxHp
           && selection.some(s => s.kind === 'unit' &&
                ((s.type === 'medic' && isFlesh(t)) || (s.type === 'engineer' && isVehicle(t))))) {
    for (const s of selection) {
      if (s.kind !== 'unit') continue;
      if ((s.type === 'medic' && isFlesh(t)) || (s.type === 'engineer' && isVehicle(t))) {
        s.order = { type: 'heal', target: t };
      }
    }
    fxs.push({ kind: 'ping', x: t.x, y: t.y, t: 0, max: 22, color: '#8ce6a0' });
  }
  else if (t && t.kind === 'egg') {
    commandCollect(selection, t);
    fxs.push({ kind: 'ping', x: t.x, y: t.y, t: 0, max: 22, color: '#e8e2cc' });
  }
  else if (t && t.kind === 'unit' && t.specimen && t.team !== 1
           && selection.some(s => s.kind === 'unit' && s.type === 'rig')) {
    // capture rigs take THE specimen — the rig is calibrated for the marked
    // target only; everyone else holds their orders so an over-eager escort
    // doesn't gun down the science project
    for (const s of selection) {
      if (s.kind === 'unit' && s.type === 'rig') { s.capT = 0; s.order = { type: 'capture', target: t }; }
    }
    fxs.push({ kind: 'ping', x: t.x, y: t.y, t: 0, max: 22, color: '#8fc94a' });
  }
  else if (t && t.kind === 'unit' && t.team === 3 && !t.specimen
           && selection.some(s => s.kind === 'unit' && s.type === 'rig')) {
    // rig + ordinary wildlife: escorts engage as usual, the rig holds — it
    // can only capture the marked specimen
    toast('The rig is calibrated for the marked specimen — it can\'t capture wild dinos');
    commandAttack(selection.filter(s => !(s.kind === 'unit' && s.type === 'rig')), t);
    fxs.push({ kind: 'ping', x: t.x, y: t.y, t: 0, max: 22, color: '#e0564a' });
  }
  else if (t && t.kind === 'unit' && t.specimen) {
    // no rig in the selection: a protected specimen can't be attacked — walk over instead
    commandMove(selection, wx, wy, false);
    fxs.push({ kind: 'ping', x: wx, y: wy, t: 0, max: 22, color: '#8fc94a' });
  }
  else if (t && t.kind === 'building' && t.team === 1 && selection.some(s => s.kind === 'unit' && s.type === 'engineer')) {
    commandRepair(selection, t);
    fxs.push({ kind: 'ping', x: t.x, y: t.y, t: 0, max: 22, color: '#8ce6a0' });
  }
  else if (t && t.team && t.team !== 1) { commandAttack(selection, t); fxs.push({ kind: 'ping', x: t.x, y: t.y, t: 0, max: 22, color: '#e0564a' }); }
  else { commandMove(selection, wx, wy, false); fxs.push({ kind: 'ping', x: wx, y: wy, t: 0, max: 22, color: '#8fd8cf' }); }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// minimap
let miniDown = false;
function miniToCam(e) {
  const r = mini.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  cam.x = fx * W - view.w / 2;
  cam.y = fy * H - view.h / 2;
  clampCam();
}
mini.addEventListener('mousedown', (e) => { audioInit(); if (e.button === 0) { miniDown = true; miniToCam(e); } });
window.addEventListener('mousemove', (e) => { if (miniDown) miniToCam(e); });
window.addEventListener('mouseup', () => { miniDown = false; });
mini.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  audioInit();
  pruneSelection();
  if (!selection.some(s => s.kind === 'unit')) return;
  const r = mini.getBoundingClientRect();
  const wx = clamp(((e.clientX - r.left) / r.width) * W, 20, W - 20);
  const wy = clamp(((e.clientY - r.top) / r.height) * H, 20, H - 20);
  commandMove(selection, wx, wy, false);
  fxs.push({ kind: 'ping', x: wx, y: wy, t: 0, max: 22, color: '#8fd8cf' });
});

// keyboard
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code.startsWith('Arrow')) e.preventDefault();
  audioInit();
  if (!started) return;   // menu / briefing on screen — gameplay hotkeys stay cold

  if (e.code === 'Escape') {
    if (!elHelp.classList.contains('hidden')) { setHelp(false); return; }
    attackMoveMode = false; placing = null; nukeTargeting = null; selection = []; setCursor(); return;
  }
  if (e.code === 'KeyM') { muted = !muted; btnMute.textContent = muted ? '🔇' : '🔊'; if (muted) stopVoice(); return; }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'KeyF') { toggleFogMemory(); return; }
  if (e.code === 'Backquote') {   // dev mode: reveal the whole map
    devReveal = !devReveal;
    updateFog();
    toast(devReveal ? '🔧 Dev: full map revealed' : '🔧 Dev: fog restored');
    return;
  }
  if (gameOver) return;

  pruneSelection();
  if (e.code === 'KeyA' && selection.some(s => s.kind === 'unit' && isCombat(s))) { attackMoveMode = true; placing = null; nukeTargeting = null; setCursor(); return; }
  if (e.code === 'KeyS') { for (const s of selection) if (s.kind === 'unit') s.order = { type: 'idle' }; return; }
  if (e.code === 'KeyH' && selection.some(s => s.kind === 'unit' && canHunker(s))) { toggleHunker(); return; }
  if (e.code === 'KeyU' && selection.some(s => s.kind === 'unit' && s.cargo && s.cargo.length)) {
    for (const s of selection) if (s.kind === 'unit' && s.cargo && s.cargo.length) unloadAPC(s);
    return;
  }
  // silo controls: Q/W buy warheads, L opens targeting
  const silo = selection.length === 1 && selection[0].kind === 'building'
    && selection[0].type === 'silo' && selection[0].built >= 1 ? selection[0] : null;
  if (silo) {
    if (e.code === 'KeyQ') { buyNuke(silo, 'tac'); lastCardSig = ''; return; }
    if (e.code === 'KeyW') { buyNuke(silo, 'hq'); lastCardSig = ''; return; }
    if (e.code === 'KeyL' && silo.warhead) {
      nukeTargeting = silo; placing = null; attackMoveMode = false; setCursor();
      toast('Pick a target — right-click to abort');
      return;
    }
  }
  if (!e.metaKey && !e.ctrlKey) {
    const bm = BUILD_MENU.find(([, k]) => e.code === 'Key' + k);
    if (bm) { startPlacing(bm[0]); return; }
  }

  // lower/raise a selected depot or power plant (no trains, so Q is free)
  if (e.code === 'KeyQ' && !selection.some(s => s.kind === 'building' && BLD[s.type].trains)) {
    const sb = selection.find(s => s.kind === 'building' && BLD[s.type].sink && s.built >= 1);
    if (sb) { toggleSink(sb); return; }
  }
  // production/research hotkeys on a selected building
  const prodKeys = { KeyQ: 0, KeyW: 1, KeyE: 2, KeyR: 3, KeyD: 4, KeyZ: 5 };
  if (prodKeys[e.code] !== undefined) {
    const b = selection.find(s => s.kind === 'building' && BLD[s.type].trains);
    if (b) {
      const a = cardActions(b)[prodKeys[e.code]];
      if (a) {
        if (a.kind === 'train') trainUnit(b, a.t);
        else if (a.kind === 'hatch') hatchSpitter(b);
        else startResearch(b, a.k);
      }
      return;
    }
  }
  // control groups 1-5
  const m = e.code.match(/^Digit([1-5])$/);
  if (m) {
    if (e.ctrlKey || e.metaKey) { groups[m[1]] = [...selection]; toast('Group ' + m[1] + ' saved'); e.preventDefault(); }
    else if (groups[m[1]]) { selection = groups[m[1]].filter(u => u.hp > 0 && (u.kind !== 'unit' || units.includes(u))); }
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// controls modal: pauses the sim while open; shows automatically at game start
let paused = false;       // help modal open
let userPaused = false;   // the pause button / P key
let quitArm = 0;          // quit needs two clicks within 3s
function togglePause() {
  if (!started || gameOver) return;
  userPaused = !userPaused;
  elPauseBanner.classList.toggle('hidden', !userPaused);
  btnPause.textContent = userPaused ? '▶ resume' : '⏸ pause';
  syncVoicePause();
}
function quitToMenu() {
  started = false;
  userPaused = false;
  quitArm = 0;
  elPauseBanner.classList.add('hidden');
  btnPause.textContent = '⏸ pause';
  btnQuit.textContent = '⏹ menu';
  setHelp(false);
  resetWorld();
  renderMenu();
  elMenu.classList.remove('hidden');
}
btnPause.addEventListener('click', () => { audioInit(); togglePause(); });
btnQuit.addEventListener('click', () => {
  audioInit();
  if (!started) return;
  if (Date.now() - quitArm < 3000) { quitToMenu(); return; }
  quitArm = Date.now();
  btnQuit.textContent = '⏹ sure?';
  toast('Click again to abandon the match');
  setTimeout(() => { if (Date.now() - quitArm >= 2900) btnQuit.textContent = '⏹ menu'; }, 3100);
});
function setHelp(open) {
  elHelp.classList.toggle('hidden', !open);
  paused = open;
  syncVoicePause();
}
btnHelp.addEventListener('click', () => { audioInit(); setHelp(elHelp.classList.contains('hidden')); });
document.getElementById('btn-help-close').addEventListener('click', () => { audioInit(); setHelp(false); });
btnMute.addEventListener('click', () => { audioInit(); muted = !muted; btnMute.textContent = muted ? '🔇' : '🔊'; if (muted) stopVoice(); });
function toggleFogMemory() {
  fogMemory = !fogMemory;
  btnFog.textContent = fogMemory ? '🌫 map: remembered' : '🌫 map: re-fogs';
  updateFog();
  toast(fogMemory ? 'Explored ground stays visible' : 'Ground re-fogs when unwatched');
}
btnFog.addEventListener('click', () => { audioInit(); toggleFogMemory(); });

// building placement
function startPlacing(type) {
  if (!hasTech(1, type)) {
    toast(`${BLD[type].label} requires: ${techLabel(type)}`);
    snd.error();
    return;
  }
  placing = type; attackMoveMode = false; nukeTargeting = null; setCursor(); lastCardSig = '';
}
function canPlaceBuilding(type, wx, wy) {
  const d = BLD[type];
  if (!hasTech(1, type)) return false;
  if (teams[1].crystals < d.cost) return false;
  if (wx < 40 || wy < 40 || wx > W - 40 || wy > H - 40) return false;
  for (const b of buildings) {
    if (Math.abs(wx - b.x) < (b.w + d.w) / 2 + 10 && Math.abs(wy - b.y) < (b.h + d.h) / 2 + 10) return false;
  }
  for (const c of crystals) if (c.amount > 0 && dist2(wx, wy, c.x, c.y) < (d.w / 2 + 26) ** 2) return false;
  for (const rk of rocks) if (Math.abs(wx - rk.x) < d.w / 2 + rk.r && Math.abs(wy - rk.y) < d.h / 2 + rk.r) return false;
  if (type === 'refinery') {
    return crystals.some(c => c.amount > 0 && dist2(wx, wy, c.x, c.y) < REFINERY_NEAR_CRYSTAL ** 2);
  }
  // defense towers must anchor to a permanent structure (HQ/Barracks/Factory/…) — no tower-to-tower creep
  const isDef = (t) => t === 'turret' || t === 'flak';
  return buildings.some(b => b.team === 1 && (!isDef(type) || !isDef(b.type)) &&
    dist2(wx, wy, b.x, b.y) < PLACE_NEAR_BASE ** 2);
}
function tryPlaceBuilding(type, wx, wy) {
  const d = BLD[type];
  if (!canPlaceBuilding(type, wx, wy)) {
    if (!hasTech(1, type)) toast(`${d.label} requires: ${techLabel(type)}`);
    else if (teams[1].crystals < d.cost) toast(`Not enough crystals (${d.cost} ⬡)`);
    else if (type === 'refinery') toast('Build the refinery next to a crystal patch, on open ground');
    else toast('Build closer to your base, on open ground');
    snd.error();
    return;
  }
  teams[1].crystals -= d.cost;
  makeBuilding(type, 1, wx, wy, true);
  placing = null; setCursor();
  beep(440, 0.09, 'sine', 0.05);
}

// camera pan (arrows + screen edge)
function updateCamera() {
  const sp = 16;
  if (keys['ArrowLeft']) cam.x -= sp;
  if (keys['ArrowRight']) cam.x += sp;
  if (keys['ArrowUp']) cam.y -= sp;
  if (keys['ArrowDown']) cam.y += sp;
  if (mouse.inWindow && !miniDown) {
    const edge = 14;
    if (mouse.sx < edge) cam.x -= sp;
    if (mouse.sx > view.w - edge) cam.x += sp;
    if (mouse.sy < edge) cam.y -= sp;
    if (mouse.sy > view.h - edge) cam.y += sp;
  }
  clampCam();
  mouse.wx = mouse.sx + cam.x;
  mouse.wy = mouse.sy + cam.y;
}

// ---------------- UI ----------------
let toastTimer = null;
function toast(msg) {
  elToast.textContent = msg;
  elToast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { elToast.style.opacity = '0'; }, 2400);
}

// the Q/W/E/R/D slots on a production building: its units, research, then specials
function cardActions(b) {
  const acts = BLD[b.type].trains.map(t => ({ kind: 'train', t }));
  for (const k in UPG) if (UPG[k].at === b.type) acts.push({ kind: 'up', k });
  if (b.type === 'hq') acts.push({ kind: 'hatch' });   // captured dino eggs hatch at the lab
  return acts;
}

// lower a depot/plant flush with the ground so units drive over it (SC2-style).
// Function is fully retained while sunk — supply, power gen, and the depot
// repair field all keep working; it just stops being a wall. Still attackable.
function toggleSink(b) {
  if (!BLD[b.type].sink || b.built < 1 || b.hp <= 0) return;
  b.sunk = !b.sunk;
  // raising with units on top is safe: separation() ejects footprint overlaps
  // to the nearest face on the next tick
  if (b.team === 1) {
    toast(b.sunk ? `⬇ ${BLD[b.type].label} lowered — units can drive over it` : `⬆ ${BLD[b.type].label} raised`);
    snd.select();
  }
  lastCardSig = '';
}

// deploy a spitter from a banked egg — instant, no queue: it's hatching, not manufacturing
function hatchSpitter(b) {
  const t = teams[b.team];
  if (t.eggs < 1) {
    if (b.team === 1) { toast('No eggs — destroy a dino nest and haul its clutch home'); snd.error(); }
    return false;
  }
  const pack = units.filter(u => u.team === b.team && u.type === 'spitter').length;
  if (pack >= SPITTER_CAP) {
    if (b.team === 1) { toast(`Your spitter pack is full (${SPITTER_CAP}) — the eggs will keep`); snd.error(); }
    return false;
  }
  if (supplyUsed(b.team) + UNIT.spitter.supply > supplyMax(b.team)) {
    if (b.team === 1) { toast('Supply limit reached — build a Supply Depot first'); snd.error(); }
    return false;
  }
  t.eggs--;
  spawnFromBuilding(b, 'spitter');
  if (b.team === 1) toast(`🦖 Spitter hatched! (${t.eggs} 🥚 left)`);
  return true;
}

let lastCardSig = '';
function cardSig() {
  pruneSelection();
  return selection.map(e => e.id).join(',') + '|' +
    selection.filter(e => e.queue).map(e => e.queue.join('.') + ':' + e.boost).join(';') + '|' +
    (placing || '') + (attackMoveMode ? 'A' : '') + '|' +
    BUILD_MENU.map(([t]) => (teams[1].crystals >= BLD[t].cost ? 'y' : 'n') + (hasTech(1, t) ? 'u' : 'l')).join('') + '|' +
    Object.values(teams[1].up).join('') + '.' + Math.floor(teams[1].crystals / 25) + '.' + teams[1].eggs +
    '.' + units.reduce((s, u) => s + (u.team === 1 && (u.type === 'spitter' || u.type === 'harrier') ? 1 : 0), 0) +
    '.' + selection.map(e => (e.warhead || '') + (e.cargo ? e.cargo.length : '') + (e.sunk ? 's' : '')).join('') +
    (nukeTargeting ? 'N' : '');
}
function refreshCard() {
  const sig = cardSig();
  if (sig === lastCardSig) return;
  lastCardSig = sig;

  let html = '';
  const b = selection.length === 1 && selection[0].kind === 'building' ? selection[0] : null;

  if (placing) {
    const hint = placing === 'refinery'
      ? 'Click open ground next to a crystal patch — harvesters will drop off there. Comes with a free harvester.'
      : 'Click open ground near your base. Right-click or Esc to cancel.';
    html = `<h3>Placing ${BLD[placing].label.toLowerCase()}</h3><div class="sub">${hint}</div>`;
  } else if (attackMoveMode) {
    html = '<h3>Attack-move</h3><div class="sub">Click a location — your troops will fight anything on the way.</div>';
  } else if (b && BLD[b.type].trains) {
    const d = BLD[b.type];
    html = `<h3>${d.label}</h3><div class="sub">Right-click the map to set the rally point.</div><div class="row">`;
    cardActions(b).forEach((a, i) => {
      const key = ['Q', 'W', 'E', 'R', 'D', 'Z'][i];
      if (a.kind === 'train') {
        const ud = UNIT[a.t];
        let label = `${ud.label} · ${ud.cost} ⬡`, capped = false;
        if (a.t === 'harrier') {
          const fleet = units.filter(u => u.team === 1 && u.type === 'harrier').length
            + buildings.reduce((s, x) => s + (x.team === 1 ? x.queue.filter(q => q === 'harrier').length : 0), 0);
          label = `${ud.label} · ${ud.cost} ⬡ (${fleet}/${HARRIER_CAP})`;
          capped = fleet >= HARRIER_CAP;
        }
        const dim = (teams[1].crystals < ud.cost || capped) ? ' class="dim"' : '';
        html += `<button data-act="train:${a.t}"${dim}>${label} <small>[${key}]</small></button>`;
      } else if (a.kind === 'hatch') {
        const pack = units.filter(u => u.team === 1 && u.type === 'spitter').length;
        const cls = ' class="wide' + ((teams[1].eggs < 1 || pack >= SPITTER_CAP) ? ' dim' : '') + '"';
        html += `<button data-act="hatch"${cls}>🦖 Hatch Spitter · 1 🥚 (${teams[1].eggs} 🥚 · pack ${pack}/${SPITTER_CAP}) <small>[${key}]</small></button>`;
      } else {
        const g = UPG[a.k];
        const pending = buildings.reduce((s, x) =>
          s + (x.team === 1 ? x.queue.filter(q => q === 'up:' + a.k).length : 0), 0);
        const lvl = teams[1].up[a.k] + pending;
        if (lvl >= g.max) html += `<button class="wide dim">⬆ ${g.label} MAX</button>`;
        else {
          const cls = ' class="wide' + (teams[1].crystals < g.cost[lvl] ? ' dim' : '') + '"';
          html += `<button data-act="research:${a.k}"${cls}>⬆ ${g.label} ${lvl + 1} · ${g.cost[lvl]} ⬡ <small>[${key}]</small></button>`;
        }
      }
    });
    html += '</div>';
  } else if (b && b.type === 'silo') {
    html = '<h3>Missile Silo</h3>';
    if (b.built < 1) {
      html += '<div class="sub">Under construction…</div>';
    } else if (b.warhead) {
      html += `<div class="sub">${NUKE[b.warhead].label} armed and ready. Tactical warheads can’t be aimed near an HQ.</div><div class="row">`;
      html += `<button data-act="nuke:launch" class="wide">🚀 Launch ${NUKE[b.warhead].label} <small>[L]</small></button></div>`;
    } else {
      html += '<div class="sub">Buy a warhead. The Bunker Buster is the only one that can hit an HQ.</div><div class="row">';
      const d1 = teams[1].crystals < NUKE.tac.cost ? ' dim' : '';
      const d2 = teams[1].crystals < NUKE.hq.cost ? ' dim' : '';
      html += `<button data-act="nuke:tac" class="wide${d1}">☢ Tactical Nuke · 10,000 ⬡ <small>[Q]</small></button>`;
      html += `<button data-act="nuke:hq" class="wide${d2}">💥 Bunker Buster · 25,000 ⬡ <small>[W]</small></button></div>`;
    }
  } else if (b) {
    const desc = b.type === 'supply' ? 'Raises your supply cap by ' + BLD.supply.supply + ', unlocks the Barracks, and slowly repairs nearby buildings.'
      : b.type === 'power' ? 'Feeds the grid +' + BLD.power.gen + ' power. Run out and production slows, towers fire at half rate, and nukes stay grounded.'
      : b.type === 'refinery' ? 'Harvesters drop crystals off here. Build more near far-away patches to expand.'
      : b.type === 'flak' ? 'Anti-air battery. Shreds gunships; ignores everything on the ground.'
      : 'Defensive structure. It shoots on its own.';
    html = `<h3>${BLD[b.type].label}</h3><div class="sub">${desc}</div>`;
    if (BLD[b.type].sink && b.built >= 1) {
      html += '<div class="row">' + (b.sunk
        ? '<button data-act="sink" class="wide">⬆ Raise structure <small>[Q]</small></button>'
        : '<button data-act="sink" class="wide">⬇ Lower into ground <small>[Q]</small></button>') + '</div>';
    }
  } else if (selection.length) {
    const counts = {};
    for (const u of selection) counts[u.type] = (counts[u.type] || 0) + 1;
    const label = Object.entries(counts).map(([t, n]) => `${n}× ${UNIT[t].label}`).join(', ');
    const engHint = selection.some(u => u.type === 'engineer') ? 'Right-click a damaged building or vehicle to repair it. ' : '';
    const rigHint = selection.some(u => u.type === 'rig') ? 'Right-click a spitter to capture it, then haul it to the HQ. ' : '';
    html = `<h3>${label}</h3><div class="sub">${rigHint}${engHint}Right-click: move · attack · harvest</div><div class="row">`;
    if (selection.some(u => isCombat(u))) html += '<button data-act="amove">Attack-move [A]</button>';
    if (selection.some(u => u.kind === 'unit' && canHunker(u))) html += '<button data-act="hunker">Hunker down [H]</button>';
    const aboard = selection.reduce((s, u) => s + (u.cargo ? u.cargo.length : 0), 0);
    if (aboard > 0) html += `<button data-act="unload">Unload ${aboard} [U]</button>`;
    html += '<button data-act="stop">Stop [S]</button></div>';
  } else {
    html = '<h3>Broodfall</h3><div class="sub">Drag to select units. Right-click to give orders. Select a building to train units.</div>';
  }
  if (!placing && !attackMoveMode) {
    html += '<div class="row">';
    for (const [t, k] of BUILD_MENU) {
      if (!hasTech(1, t)) continue;   // progressive disclosure — locked buildings stay hidden
      const d = BLD[t];
      const dim = teams[1].crystals < d.cost ? ' class="dim"' : '';
      html += `<button data-act="build:${t}"${dim}>${d.label} · ${d.cost} ⬡ <small>[${k}]</small></button>`;
    }
    html += '</div>';
  }
  // fold the leading title+hint into a fixed-width block; buttons flow beside it
  html = html.replace(/^<h3>(.*?)<\/h3>(<div class="sub">.*?<\/div>)?/,
    (m, t, s) => `<div class="hd"><h3>${t}</h3>${s || ''}</div>`);
  elCard.innerHTML = html;
}

// production queue lives in its own strip ABOVE the card, so appearing /
// disappearing never shifts the card's buttons (playtest feedback)
let lastQSig = '';
function refreshQueue() {
  const sel = selection.length === 1 && selection[0].kind === 'building' ? selection[0] : null;
  const con = sel && sel.built < 1 ? sel : null;                       // under construction
  const b = !con && sel && sel.queue && sel.queue.length ? sel : null; // producing
  const sig = con ? 'c' + con.id + '|' + Math.floor(con.built * 40) + '|' + (con.buildBoost || 1) + '|' + Math.floor(teams[1].crystals / 25)
    : b ? b.id + '|' + b.queue.join('.') + '|' + b.boost + '|' + Math.floor(teams[1].crystals / 25)
    : 'none';   // 'none', not '' — the click handlers use '' as a force-refresh sentinel
  if (sig === lastQSig) return;
  lastQSig = sig;
  if (!b && !con) {
    elQpanel.innerHTML = '<div class="queue">Production</div><div class="idle-note">nothing in the works — select a building and queue something up</div>';
    return;
  }
  if (con) {
    const cost = BLD[con.type].cost || 0;
    let html = `<div class="queue">Constructing: ${BLD[con.type].label}</div>`;
    html += '<div class="prog-wrap"><div class="prog" id="prog"></div></div><div class="row">';
    if ((con.buildBoost || 1) === 1) {
      const dblFee = Math.ceil(cost / 2);
      html += `<button data-act="crush:double"${teams[1].crystals < dblFee ? ' class="dim"' : ''}>⏩ 2× speed · ${dblFee} ⬡</button>`;
    }
    html += `<button data-act="crush:instant"${teams[1].crystals < cost ? ' class="dim"' : ''}>⚡ Finish now · ${cost} ⬡</button></div>`;
    elQpanel.innerHTML = html;
    return;
  }
  let html = `<div class="queue">Building: ${b.queue.map(queueLabel).join(' → ')}</div>`;
  html += '<div class="prog-wrap"><div class="prog" id="prog"></div></div>';
  const base = queueItemCost(b);
  const dblFee = Math.ceil(base / 2);
  html += '<div class="row">';
  if (b.boost === 1) {
    const dim = teams[1].crystals < dblFee ? ' class="dim"' : '';
    html += `<button data-act="rush:double"${dim}>⏩ 2× speed · ${dblFee} ⬡</button>`;
  }
  const dimI = teams[1].crystals < base ? ' class="dim"' : '';
  html += `<button data-act="rush:instant"${dimI}>⚡ Finish now · ${base} ⬡</button></div>`;
  elQpanel.innerHTML = html;
}
// pointerdown, not click: the panels rebuild their HTML when crystals cross a
// 25-step, and a rebuild between mousedown and mouseup silently eats a click.
// Acting on the press is immune to that (and feels snappier mid-battle).
elDock.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  audioInit();
  const btn = e.target.closest('[data-act]');
  if (!btn || gameOver) return;
  const act = btn.getAttribute('data-act');
  if (act.startsWith('train:')) {
    const b = selection.find(s => s.kind === 'building' && BLD[s.type].trains);
    if (b) trainUnit(b, act.slice(6));
    lastCardSig = '';
  } else if (act.startsWith('research:')) {
    const b = selection.find(s => s.kind === 'building' && BLD[s.type].trains);
    if (b) startResearch(b, act.slice(9));
    lastCardSig = '';
  } else if (act.startsWith('nuke:')) {
    const b = selection.find(s => s.kind === 'building' && s.type === 'silo' && s.built >= 1);
    if (b) {
      const what = act.slice(5);
      if (what === 'launch') {
        if (b.warhead) { nukeTargeting = b; placing = null; attackMoveMode = false; setCursor(); toast('Pick a target — right-click to abort'); }
      } else buyNuke(b, what);
    }
    lastCardSig = '';
  } else if (act === 'unload') {
    for (const s of selection) if (s.kind === 'unit' && s.cargo && s.cargo.length) unloadAPC(s);
    lastCardSig = '';
  } else if (act === 'hatch') {
    const b = selection.find(s => s.kind === 'building' && s.type === 'hq');
    if (b) hatchSpitter(b);
    lastCardSig = '';
  } else if (act === 'sink') {
    const b = selection.find(s => s.kind === 'building' && BLD[s.type].sink && s.built >= 1);
    if (b) toggleSink(b);
    lastCardSig = '';
  } else if (act.startsWith('crush:')) {
    const cb = selection.find(x => x.kind === 'building' && x.built < 1);
    if (cb) rushConstruction(cb, act.slice(6) === 'instant');
    lastCardSig = ''; lastQSig = '';
  } else if (act.startsWith('rush:')) {
    const b = selection.find(s => s.kind === 'building' && s.queue && s.queue.length);
    if (b) rushProduction(b, act.slice(5) === 'instant');
    lastCardSig = ''; lastQSig = '';
  }
  else if (act.startsWith('build:')) { startPlacing(act.slice(6)); }
  else if (act === 'stop') { for (const s of selection) if (s.kind === 'unit') s.order = { type: 'idle' }; }
  else if (act === 'hunker') { toggleHunker(); }
  else if (act === 'amove') { attackMoveMode = true; placing = null; nukeTargeting = null; setCursor(); lastCardSig = ''; }
});

let wasLowPower = false;
let lastAvail = null;   // build-menu availability — announces newly unlocked buildings
function refreshTopbar() {
  const avail = BUILD_MENU.filter(([t]) => hasTech(1, t)).map(([t]) => t);
  if (lastAvail) {
    const fresh = avail.filter(t => !lastAvail.includes(t));
    if (fresh.length) {
      toast('🔓 Construction unlocked: ' + fresh.map(t => BLD[t].label).join(', '));
      snd.ready();
      lastCardSig = '';
    }
  }
  lastAvail = avail;
  elCrystals.textContent = '⬡ ' + Math.floor(teams[1].crystals);
  elSupply.textContent = '☰ ' + supplyUsed(1) + ' / ' + supplyMax(1);
  const pu = powerUsed(1), pm = powerMax(1), low = pu > pm;
  const elPower = document.getElementById('res-power');
  elPower.textContent = '⚡ ' + pu + ' / ' + pm;
  elPower.className = low ? 'chip warn' : 'chip';
  if (low && !wasLowPower) { toast('⚡ LOW POWER — production slowed, defenses degraded. Build a Power Plant (O).'); snd.alarm(); }
  wasLowPower = low;
  // the egg chip only appears once eggs enter your life
  const showEggs = teams[1].eggs > 0 || units.some(u => u.team === 1 && u.eggCarry);
  elEggs.style.display = showEggs ? '' : 'none';
  elEggs.textContent = '🥚 ' + teams[1].eggs;
  const noWaves = mission && (mission.noEnemy || mission.noWaves);
  elWave.style.display = noWaves ? 'none' : '';
  if (!noWaves) {
    const s = Math.max(0, Math.ceil((waveAt - tick) / 60));
    elWave.textContent = waveNum === 0 ? `⚔ first assault: ${s}s` : `⚔ next assault: ${s}s`;
  }
}
function refreshProgressBar() {
  const el = document.getElementById('prog');
  if (!el) return;
  const sel = selection.length === 1 ? selection[0] : null;
  if (sel && sel.kind === 'building' && sel.built < 1) {
    el.style.width = Math.min(100, sel.built * 100) + '%';
  } else if (sel && sel.queue && sel.queue.length) {
    el.style.width = Math.min(100, (sel.prog / queueTime(sel.team, sel.queue[0])) * 100) + '%';
  }
}

// ---------------- Ground texture (pre-rendered per map) ----------------
const groundCv = document.createElement('canvas');
groundCv.width = W; groundCv.height = H;
function paintRock(g, rk) {
  if (rk.cliff) {
    // cliff-face slab: tangential wedge with a lit lip on the high side and a
    // shadow skirt falling outward — chained slabs read as one wall
    g.save();
    g.translate(rk.x, rk.y);
    g.rotate(rk.a || 0);   // +x points away from the plateau
    g.fillStyle = 'rgba(0,0,0,0.38)';
    g.fillRect(2, -rk.r * 1.15, rk.r * 0.95, rk.r * 2.3);
    g.fillStyle = '#252b25';
    g.fillRect(-rk.r * 0.55, -rk.r * 1.15, rk.r * 0.95, rk.r * 2.3);
    g.fillStyle = '#39413a';
    g.fillRect(-rk.r * 0.68, -rk.r * 1.15, rk.r * 0.22, rk.r * 2.3);
    g.restore();
    return;
  }
  g.fillStyle = 'rgba(0,0,0,0.35)';   // ground shadow
  g.beginPath(); g.ellipse(rk.x + 5, rk.y + 7, rk.r * 1.02, rk.r * 0.88, 0, 0, Math.PI * 2); g.fill();
  const img = opt('rock');
  if (img) {
    const s = rk.r * 2.3;
    g.save();
    g.translate(rk.x, rk.y);
    g.rotate((rk.x * 7.3 + rk.y * 13.7) % (Math.PI * 2));   // stable variety per rock
    g.drawImage(img, -s / 2, -s / 2, s, s);
    g.restore();
    return;
  }
  const blob = (rad, fill, ox, oy) => {
    g.fillStyle = fill;
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr2 = rad * (0.82 + Math.random() * 0.3);
      const px = rk.x + ox + Math.cos(a) * rr2, py = rk.y + oy + Math.sin(a) * rr2 * 0.92;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fill();
  };
  blob(rk.r, '#2c322c', 0, 0);                    // rock body
  blob(rk.r * 0.62, '#3a423a', -rk.r * 0.12, -rk.r * 0.16);   // upper facet
  blob(rk.r * 0.3, '#485148', -rk.r * 0.2, -rk.r * 0.28);     // highlight
}
function paintGround(M) {
  // per-map ground palette — each battlefield gets its own soil so maps stop
  // looking interchangeable (playtest feedback). All fields optional.
  const pal = (M && M.ground) || {};
  const g = groundCv.getContext('2d');
  const area = (W * H) / (2048 * 1536);   // texture density scales with map area
  g.fillStyle = pal.base || '#171c16';
  g.fillRect(0, 0, W, H);
  // mottled soil
  for (let i = 0; i < 1400 * area; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = 8 + Math.random() * 42;
    g.fillStyle = Math.random() < 0.5 ? (pal.mottle || 'rgba(255,255,255,0.012)') : 'rgba(0,0,0,0.05)';
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  // faint grid
  g.strokeStyle = pal.grid || 'rgba(160,220,200,0.028)';
  g.lineWidth = 1;
  for (let x = 0; x <= W; x += TILE) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
  for (let y = 0; y <= H; y += TILE) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
  // scattered pebbles
  for (let i = 0; i < 240 * area; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    g.fillStyle = pal.pebble || 'rgba(190,200,190,0.06)';
    g.beginPath(); g.arc(x, y, 1 + Math.random() * 2.5, 0, Math.PI * 2); g.fill();
  }
  // raised ground: drop shadow + lifted tone so plateaus read at a glance;
  // ramps get a half-lift so the way up is visible from across the map
  for (const pl of ((M && M.plateaus) || [])) {
    for (const [px, py, pr] of pl.c) {
      g.fillStyle = 'rgba(0,0,0,0.24)';
      g.beginPath(); g.arc(px + 7, py + 10, pr + 9, 0, Math.PI * 2); g.fill();
    }
    for (const [px, py, pr] of pl.c) {
      g.fillStyle = pal.hi || 'rgba(235,240,225,0.08)';
      g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    }
    for (const [rx, ry, rr] of (pl.ramps || [])) {
      g.fillStyle = pal.hi || 'rgba(235,240,225,0.05)';
      g.beginPath(); g.arc(rx, ry, rr * 0.8, 0, Math.PI * 2); g.fill();
    }
  }
  for (const rk of rocks) paintRock(g, rk);
}
paintGround();   // pre-menu backdrop; setup() repaints with the map's terrain

// ---------------- Drawing ----------------
// gold chevrons above a ranked unit — one per rank, stacked
function drawRank(u) {
  const rank = rankOf(u);
  if (!rank) return;
  cx.strokeStyle = '#f0c86a';
  cx.lineWidth = 1.6;
  const bx = u.x + u.r + 4, by = u.y - u.r - 4;
  for (let i = 0; i < rank; i++) {
    const yy = by - i * 4;
    cx.beginPath();
    cx.moveTo(bx - 3, yy); cx.lineTo(bx, yy - 3); cx.lineTo(bx + 3, yy);
    cx.stroke();
  }
}

function drawHpBar(x, y, w, hp, maxHp) {
  const f = clamp(hp / maxHp, 0, 1);
  cx.fillStyle = 'rgba(0,0,0,0.6)';
  cx.fillRect(x - w / 2, y, w, 4);
  cx.fillStyle = f > 0.55 ? '#7fd8a8' : f > 0.25 ? '#e8c46a' : '#e0564a';
  cx.fillRect(x - w / 2, y, w * f, 4);
}

function drawCrystal(c) {
  const f = 0.45 + 0.55 * (c.amount / c.maxAmount);
  const r = c.r * f + 3;
  if (c.amount <= 0) {
    cx.fillStyle = 'rgba(110,140,135,0.25)';
    cx.beginPath(); cx.arc(c.x, c.y, 5, 0, Math.PI * 2); cx.fill();
    return;
  }
  cx.save();
  cx.translate(c.x, c.y);
  cx.fillStyle = 'rgba(111,227,208,0.14)';
  cx.beginPath(); cx.arc(0, 0, r + 6, 0, Math.PI * 2); cx.fill();
  const img = opt('crystal');
  if (img) {
    const s = (r + 4) * 2.3;
    cx.rotate((c.id * 2.399) % (Math.PI * 2));
    cx.drawImage(img, -s / 2, -s / 2, s, s);
    cx.restore();
    return;
  }
  cx.fillStyle = CRYSTAL_COLOR;
  cx.beginPath();
  cx.moveTo(0, -r); cx.lineTo(r * 0.7, 0); cx.lineTo(0, r); cx.lineTo(-r * 0.7, 0);
  cx.closePath(); cx.fill();
  cx.fillStyle = 'rgba(255,255,255,0.55)';
  cx.beginPath();
  cx.moveTo(0, -r); cx.lineTo(r * 0.28, -r * 0.2); cx.lineTo(-r * 0.28, -r * 0.2);
  cx.closePath(); cx.fill();
  cx.restore();
}

function drawEgg(e) {
  // pickup ring: the same pulsing green "interact" language as the specimen —
  // reads as "this is collectible" without a word of tutorial
  cx.strokeStyle = `rgba(143,201,74,${0.45 + 0.25 * Math.sin(tick * 0.08)})`;
  cx.lineWidth = 2;
  cx.setLineDash([4, 5]);
  cx.beginPath(); cx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2); cx.stroke();
  cx.setLineDash([]);
  const img = opt('egg');
  if (img) {
    cx.drawImage(img, e.x - 9, e.y - 11, 18, 22);
    return;
  }
  cx.save();
  cx.translate(e.x, e.y);
  cx.fillStyle = 'rgba(232,226,204,0.16)';   // soft glow so they read on dark ground
  cx.beginPath(); cx.arc(0, 0, e.r + 5, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#e8e2cc';
  cx.beginPath(); cx.ellipse(0, 0, e.r * 0.72, e.r, 0.15, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = COLORS[3].dark;             // moss speckles on bone shell
  cx.beginPath(); cx.arc(-2, -3, 1.2, 0, Math.PI * 2); cx.fill();
  cx.beginPath(); cx.arc(2, 1, 1, 0, Math.PI * 2); cx.fill();
  cx.beginPath(); cx.arc(-1, 3.5, 0.9, 0, Math.PI * 2); cx.fill();
  cx.restore();
}

// sprite bodies for buildings; keeps the shared selection/hp/queue drawing in drawBuilding
function drawBuildingSprite(b, x, y) {
  const C = COLORS[b.team];
  const pre = optCW('bld_' + b.type, b.team);   // pre-colored colorway art: no tint
  const whole = pre || opt('bld_' + b.type);
  if (whole) {
    if (b.built < 1) {
      cx.globalAlpha = 0.55;
      cx.strokeStyle = 'rgba(200,220,210,0.5)';
      cx.lineWidth = 2;
      cx.setLineDash([6, 5]);
      rr(cx, x, y, b.w, b.h, 8); cx.stroke();
      cx.setLineDash([]);
    }
    cx.drawImage(pre ? whole : bldSprite(whole, b.team), x, y, b.w, b.h);
    if (b.type === 'turret' || b.type === 'flak') {   // rotating gun stays game-drawn
      cx.save();
      cx.translate(b.x, b.y);
      cx.rotate(b.faceA + Math.PI / 2);
      if (b.recoil) cx.translate(0, b.recoil);        // gun art points up: recoil = slide back
      const gunCW = optCW('turret_gun', b.team);
      cx.drawImage(gunCW || bldSprite(BODY.turret_gun, b.team), -14, -19, 28, 28);
      cx.restore();
    }
    if (b.type === 'silo' && b.warhead) {
      cx.fillStyle = '#e0564a';
      cx.beginPath(); cx.ellipse(b.x, b.y, 5, 11, 0, 0, Math.PI * 2); cx.fill();
    }
    if (b.built < 1) {
      cx.globalAlpha = 1;
      cx.fillStyle = 'rgba(255,255,255,0.8)';
      cx.font = '11px -apple-system, sans-serif';
      cx.textAlign = 'center';
      cx.fillText(Math.floor(b.built * 100) + '%', b.x, b.y - b.h / 2 - 8);
    }
    cx.globalAlpha = 1;
    return;
  }
  if (b.built < 1) {
    cx.globalAlpha = 0.55;
    cx.strokeStyle = 'rgba(200,220,210,0.5)';
    cx.lineWidth = 2;
    cx.setLineDash([6, 5]);
    rr(cx, x, y, b.w, b.h, 8); cx.stroke();
    cx.setLineDash([]);
  }
  if (b.type === 'hq') {
    cx.drawImage(bldSprite(BODY.bld_plate_oct, b.team), x, y, b.w, b.h);
    cx.drawImage(BODY.bld_vent_a, b.x - 15, b.y - 15, 30, 30);
    const pulse = 8 + Math.sin(tick * 0.08) * 2;
    cx.fillStyle = C.main;
    cx.save(); cx.translate(b.x, b.y); cx.rotate(Math.PI / 4);
    cx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
    cx.restore();
  } else if (b.type === 'barracks') {
    cx.drawImage(bldSprite(BODY.bld_plate, b.team), x, y, b.w, b.h);
    cx.drawImage(BODY.bld_vent_b, b.x - 12, y + 10, 24, 24);
    cx.fillStyle = C.dark;
    cx.fillRect(b.x - 12, y + b.h - 22, 24, 22);
  } else if (b.type === 'factory') {
    cx.drawImage(bldSprite(BODY.bld_plate, b.team), x, y, b.w, b.h);
    cx.drawImage(BODY.bld_vent_b, x + 8, b.y - 14, 24, 24);
    cx.drawImage(BODY.bld_vent_b, x + b.w - 32, b.y - 14, 24, 24);
    cx.fillStyle = C.dark;
    cx.fillRect(b.x - 17, y + b.h - 20, 34, 20);   // vehicle bay door
  } else if (b.type === 'supply') {
    cx.drawImage(bldSprite(BODY.bld_plate, b.team), x, y, b.w, b.h);
    cx.drawImage(BODY.crate, b.x - 18, b.y - 14, 16, 16);
    cx.drawImage(BODY.crate, b.x + 2, b.y - 14, 16, 16);
    cx.drawImage(BODY.crate, b.x - 8, b.y + 0, 16, 16);
  } else if (b.type === 'power') {
    cx.drawImage(bldSprite(BODY.bld_plate, b.team), x, y, b.w, b.h);
    drawPowerBolt(b);
  } else if (b.type === 'refinery') {
    cx.drawImage(bldSprite(BODY.bld_plate_oct, b.team), x, y, b.w, b.h);
    const r = 11 + Math.sin(tick * 0.06) * 1.5;    // pulsing crystal emblem
    cx.fillStyle = CRYSTAL_COLOR;
    cx.beginPath();
    cx.moveTo(b.x, b.y - r); cx.lineTo(b.x + r * 0.7, b.y); cx.lineTo(b.x, b.y + r); cx.lineTo(b.x - r * 0.7, b.y);
    cx.closePath(); cx.fill();
  } else if (b.type === 'silo') {
    cx.drawImage(bldSprite(BODY.bld_plate_oct, b.team), x, y, b.w, b.h);
    cx.strokeStyle = C.dark; cx.lineWidth = 3;     // blast doors
    cx.beginPath(); cx.arc(b.x, b.y, 17, 0, Math.PI * 2); cx.stroke();
    cx.fillStyle = '#141a15';
    cx.beginPath(); cx.arc(b.x, b.y, 14, 0, Math.PI * 2); cx.fill();
    if (b.warhead) {
      cx.fillStyle = '#e0564a';                    // warhead riding the elevator
      cx.beginPath(); cx.ellipse(b.x, b.y, 5, 11, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#f2f2ee';
      cx.beginPath(); cx.arc(b.x, b.y - 8, 3, 0, Math.PI * 2); cx.fill();
      if (tick % 40 < 20) {                        // armed strobe
        cx.fillStyle = '#ffb060';
        cx.beginPath(); cx.arc(x + b.w - 9, y + 9, 3, 0, Math.PI * 2); cx.fill();
      }
    } else {
      cx.strokeStyle = '#3a423a'; cx.lineWidth = 2;   // empty tube stripes
      cx.beginPath(); cx.moveTo(b.x - 9, b.y - 9); cx.lineTo(b.x + 9, b.y + 9); cx.stroke();
      cx.beginPath(); cx.moveTo(b.x + 9, b.y - 9); cx.lineTo(b.x - 9, b.y + 9); cx.stroke();
    }
  } else if (b.type === 'airpad') {
    cx.drawImage(bldSprite(BODY.bld_plate, b.team), x, y, b.w, b.h);
    cx.strokeStyle = C.light; cx.lineWidth = 2;    // helipad ring + H
    cx.beginPath(); cx.arc(b.x, b.y, 16, 0, Math.PI * 2); cx.stroke();
    cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(b.x - 5, b.y - 6); cx.lineTo(b.x - 5, b.y + 6);
    cx.moveTo(b.x + 5, b.y - 6); cx.lineTo(b.x + 5, b.y + 6);
    cx.moveTo(b.x - 5, b.y); cx.lineTo(b.x + 5, b.y);
    cx.stroke();
    if (tick % 90 < 45) {                          // blinking pad beacon
      cx.fillStyle = '#f0c86a';
      cx.beginPath(); cx.arc(x + b.w - 8, y + 8, 2.5, 0, Math.PI * 2); cx.fill();
    }
  } else if (b.type === 'flak') {
    cx.drawImage(bldSprite(BODY.bld_plate, b.team), b.x - 22, b.y - 22, 44, 44);
    cx.save();
    cx.translate(b.x, b.y);
    cx.rotate(b.faceA + Math.PI / 2);   // twin AA guns, splayed
    cx.drawImage(BODY.turret_gun, -18, -18, 24, 24);
    cx.drawImage(BODY.turret_gun, -6, -18, 24, 24);
    cx.restore();
    cx.fillStyle = C.light;             // sky-watch radar dot
    cx.beginPath(); cx.arc(b.x, b.y - 14, 2.5 + Math.sin(tick * 0.15) * 1, 0, Math.PI * 2); cx.fill();
  } else { // turret
    cx.drawImage(bldSprite(BODY.bld_plate, b.team), b.x - 22, b.y - 22, 44, 44);
    cx.save();
    cx.translate(b.x, b.y);
    cx.rotate(b.faceA + Math.PI / 2);   // gun art points up
    cx.drawImage(BODY.turret_gun, -14, -19, 28, 28);
    cx.restore();
  }
  if (b.built < 1) {
    cx.globalAlpha = 1;
    cx.fillStyle = 'rgba(255,255,255,0.8)';
    cx.font = '11px -apple-system, sans-serif';
    cx.textAlign = 'center';
    cx.fillText(Math.floor(b.built * 100) + '%', b.x, b.y - b.h / 2 - 8);
  }
  cx.globalAlpha = 1;
}

// industrial hazard striping: yellow band with dark diagonals, clipped to a rect
function drawHazardBand(x, y, w, h) {
  cx.save();
  cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
  cx.fillStyle = HAZARD_YELLOW;
  cx.fillRect(x, y, w, h);
  cx.strokeStyle = '#26241f';
  cx.lineWidth = 3;
  cx.beginPath();
  for (let i = -h; i < w + h; i += 8) { cx.moveTo(x + i, y + h + 2); cx.lineTo(x + i + h + 4, y - 2); }
  cx.stroke();
  cx.restore();
}

// Phase B accent overlays (STYLE-GUIDE.md): each building's signature detail,
// drawn over the tinted body so sprite and procedural paths both get it
function drawBuildingDecor(b) {
  if (b.built < 1) return;
  const C = COLORS[b.team];
  const x = b.x - b.w / 2, y = b.y - b.h / 2;
  if (b.type === 'barracks') {
    // awning stripes over the door
    for (let i = 0; i < 5; i++) {
      cx.fillStyle = i % 2 ? C.trim : C.accent;
      cx.fillRect(b.x - 15 + i * 6, y + b.h - 27, 6, 5);
    }
  } else if (b.type === 'factory') {
    drawHazardBand(b.x - 17, y + b.h - 23, 34, 5);   // hazard-striped bay door lintel
  } else if (b.type === 'supply') {
    cx.fillStyle = C.trim;
    cx.globalAlpha = 0.75;
    cx.fillRect(x + 7, y + 5, b.w - 14, 3);          // one trim band across the pad
    cx.globalAlpha = 1;
  } else if (b.type === 'turret' || b.type === 'flak') {
    // status light: steady blink while the grid holds (brownout swaps it for the ⚡)
    if (tick % 70 < 45 && !lowPower(b.team)) {
      cx.fillStyle = C.accent;
      cx.beginPath(); cx.arc(x + b.w - 5, y + 5, 2, 0, Math.PI * 2); cx.fill();
    }
  } else if (b.type === 'silo') {
    cx.strokeStyle = C.accent;
    cx.globalAlpha = 0.7;
    cx.setLineDash([5, 4]);
    cx.lineWidth = 2;
    cx.beginPath(); cx.arc(b.x, b.y, 20, 0, Math.PI * 2); cx.stroke();
    cx.setLineDash([]);
    cx.globalAlpha = 1;
  }
}

// Rubicon Mining's pennant: dark-red flag on a pole at the HQ's corner, waving
// on the sim tick, with the company's diamond sigil. Cheap, reads at a glance.
function drawRubiconBanner(b) {
  const px = b.x - b.w / 2 + 12, py = b.y - b.h / 2 + 6;
  cx.strokeStyle = '#22201d';
  cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(px, py); cx.lineTo(px, py + 28); cx.stroke();
  const wave = Math.sin(tick * 0.06) * 2;
  cx.fillStyle = '#8f2f27';
  cx.beginPath();
  cx.moveTo(px, py);
  cx.lineTo(px + 21 + wave, py + 3);
  cx.lineTo(px + 15 + wave * 0.6, py + 6);
  cx.lineTo(px + 21 + wave, py + 9);
  cx.lineTo(px, py + 12);
  cx.closePath(); cx.fill();
  cx.fillStyle = '#f5a89a';   // diamond sigil
  cx.save();
  cx.translate(px + 7, py + 6);
  cx.rotate(Math.PI / 4);
  cx.fillRect(-2.5, -2.5, 5, 5);
  cx.restore();
}

// the plant's humming lightning-bolt emblem (shared by sprite + procedural paths)
function drawPowerBolt(b) {
  const hum = 0.8 + Math.sin(tick * 0.12) * 0.2;
  cx.fillStyle = `rgba(240,200,106,${hum})`;
  cx.beginPath();
  cx.moveTo(b.x + 3, b.y - 13); cx.lineTo(b.x - 7, b.y + 2); cx.lineTo(b.x - 1, b.y + 2);
  cx.lineTo(b.x - 3, b.y + 13); cx.lineTo(b.x + 7, b.y - 2); cx.lineTo(b.x + 1, b.y - 2);
  cx.closePath(); cx.fill();
}

// mound + eggs + rib bones; pulses so it reads as alive
function drawNest(b) {
  const img = opt('dino_nest');
  if (img) {
    const pulse = 1 + Math.sin(tick * 0.05) * 0.02;
    const w = b.w * 1.15 * pulse, h = b.h * 1.15 * pulse;
    cx.drawImage(img, b.x - w / 2, b.y - h / 2, w, h);
    return;
  }
  const C = COLORS[3];
  const pulse = 1 + Math.sin(tick * 0.05) * 0.03;
  cx.save();
  cx.translate(b.x, b.y);
  cx.fillStyle = '#3a3226';                                  // dirt mound
  cx.beginPath(); cx.ellipse(0, 0, b.w / 2 * pulse, b.h / 2 * 0.82 * pulse, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = C.dark;                                     // mossy rim
  cx.beginPath(); cx.ellipse(0, 0, b.w / 2 * 0.8, b.h / 2 * 0.62, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#2a2419';                                  // inner hollow
  cx.beginPath(); cx.ellipse(0, 2, b.w / 2 * 0.55, b.h / 2 * 0.42, 0, 0, Math.PI * 2); cx.fill();
  cx.strokeStyle = '#cfc5a8'; cx.lineWidth = 2;              // rib bones around the rim
  for (const a of [0.6, 1.6, 2.7, 4.1, 5.2]) {
    cx.beginPath();
    cx.arc(Math.cos(a) * b.w * 0.36, Math.sin(a) * b.h * 0.3, 6, a - 1.2, a + 1.2);
    cx.stroke();
  }
  for (let i = 0; i < 3; i++) {                              // egg clutch
    const ex = (i - 1) * 9, ey = 2 + (i % 2) * 5;
    cx.fillStyle = '#e8e2cc';
    cx.beginPath(); cx.ellipse(ex, ey, 5, 6.5, 0.2 * (i - 1), 0, Math.PI * 2); cx.fill();
    cx.fillStyle = C.main;
    cx.beginPath(); cx.arc(ex - 1, ey - 2, 1.3, 0, Math.PI * 2); cx.fill();   // speckle
  }
  cx.restore();
}

function drawBuilding(b) {
  const C = COLORS[b.team];
  const x = b.x - b.w / 2, y = b.y - b.h / 2;
  const sel = selection.includes(b);

  if (b.type === 'nest') {
    drawNest(b);
    if (b.hp < b.maxHp) drawHpBar(b.x, y - 10, b.w * 0.8, b.hp, b.maxHp);
    return;
  }
  if (b.type === 'den') {
    drawDen(b);
    if (b.hp < b.maxHp) drawHpBar(b.x, y - 10, b.w * 0.8, b.hp, b.maxHp);
    return;
  }
  // a lowered structure draws as a recessed pit: full-footprint dark plate,
  // then the body squashed and dimmed inside it (units drive over the top)
  const sunk = b.sunk && b.built >= 1;
  if (sunk) {
    cx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(cx, x, y, b.w, b.h, 10); cx.fill();
    cx.strokeStyle = 'rgba(0,0,0,0.45)'; cx.lineWidth = 2;
    rr(cx, x + 2, y + 2, b.w - 4, b.h - 4, 8); cx.stroke();
    cx.save();
    cx.translate(b.x, b.y);
    cx.scale(0.6, 0.6);
    cx.translate(-b.x, -b.y);
    cx.globalAlpha *= 0.85;
  }
  if (bodiesReady) {
    drawBuildingSprite(b, x, y);
  } else {
  cx.fillStyle = '#232a25';
  rr(cx, x, y, b.w, b.h, 8); cx.fill();
  cx.strokeStyle = b.built < 1 ? 'rgba(200,220,210,0.5)' : C.main;
  cx.lineWidth = 2;
  if (b.built < 1) cx.setLineDash([6, 5]);
  rr(cx, x, y, b.w, b.h, 8); cx.stroke();
  cx.setLineDash([]);

  if (b.type === 'hq') {
    cx.fillStyle = '#1a201c';
    rr(cx, x + 13, y + 13, b.w - 26, b.h - 26, 6); cx.fill();
    cx.strokeStyle = C.dark; rr(cx, x + 13, y + 13, b.w - 26, b.h - 26, 6); cx.stroke();
    const pulse = 8 + Math.sin(tick * 0.08) * 2;
    cx.fillStyle = C.main;
    cx.save(); cx.translate(b.x, b.y); cx.rotate(Math.PI / 4);
    cx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
    cx.restore();
    cx.fillStyle = C.light;
    cx.beginPath(); cx.arc(x + b.w - 16, y + 14, 3, 0, Math.PI * 2); cx.fill();
  } else if (b.type === 'barracks') {
    cx.fillStyle = C.dark;
    cx.fillRect(b.x - 12, y + b.h - 26, 24, 26);
    cx.fillStyle = C.main;
    for (let i = 0; i < 3; i++) cx.fillRect(x + 10, y + 12 + i * 10, b.w - 20, 3);
  } else if (b.type === 'turret') {
    cx.fillStyle = '#1a201c';
    cx.beginPath(); cx.arc(b.x, b.y, 13, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = C.main; cx.lineWidth = 4;
    cx.beginPath();
    cx.moveTo(b.x, b.y);
    cx.lineTo(b.x + Math.cos(b.faceA) * 22, b.y + Math.sin(b.faceA) * 22);
    cx.stroke();
    cx.fillStyle = C.main;
    cx.beginPath(); cx.arc(b.x, b.y, 6, 0, Math.PI * 2); cx.fill();
    if (b.built < 1) {
      cx.fillStyle = 'rgba(255,255,255,0.8)';
      cx.font = '11px -apple-system, sans-serif';
      cx.textAlign = 'center';
      cx.fillText(Math.floor(b.built * 100) + '%', b.x, b.y - b.h / 2 - 8);
    }
  } else if (b.type === 'factory') {
    cx.fillStyle = C.dark;
    cx.fillRect(b.x - 17, y + b.h - 20, 34, 20);
    cx.fillStyle = C.main;
    cx.fillRect(x + 10, y + 12, b.w - 20, 4);
  } else if (b.type === 'supply') {
    cx.fillStyle = C.main;
    cx.fillRect(b.x - 16, b.y - 12, 13, 13);
    cx.fillRect(b.x + 3, b.y - 12, 13, 13);
    cx.fillRect(b.x - 6, b.y + 3, 13, 13);
  } else if (b.type === 'power') {
    drawPowerBolt(b);
  } else if (b.type === 'refinery') {
    cx.fillStyle = CRYSTAL_COLOR;
    cx.beginPath();
    cx.moveTo(b.x, b.y - 12); cx.lineTo(b.x + 8, b.y); cx.lineTo(b.x, b.y + 12); cx.lineTo(b.x - 8, b.y);
    cx.closePath(); cx.fill();
  } else if (b.type === 'silo') {
    cx.strokeStyle = C.main; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(b.x, b.y, 16, 0, Math.PI * 2); cx.stroke();
    cx.fillStyle = '#141a15';
    cx.beginPath(); cx.arc(b.x, b.y, 13, 0, Math.PI * 2); cx.fill();
    if (b.warhead) {
      cx.fillStyle = '#e0564a';
      cx.beginPath(); cx.ellipse(b.x, b.y, 4.5, 10, 0, 0, Math.PI * 2); cx.fill();
    }
  } else if (b.type === 'flak') {
    cx.fillStyle = '#1a201c';
    cx.beginPath(); cx.arc(b.x, b.y, 13, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = C.main; cx.lineWidth = 3;
    for (const off of [-0.22, 0.22]) {
      cx.beginPath();
      cx.moveTo(b.x, b.y);
      cx.lineTo(b.x + Math.cos(b.faceA + off) * 20, b.y + Math.sin(b.faceA + off) * 20);
      cx.stroke();
    }
    cx.fillStyle = C.light;
    cx.beginPath(); cx.arc(b.x, b.y, 4, 0, Math.PI * 2); cx.fill();
  } else if (b.type === 'airpad') {
    cx.strokeStyle = C.light; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(b.x, b.y, 15, 0, Math.PI * 2); cx.stroke();
    cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(b.x - 5, b.y - 6); cx.lineTo(b.x - 5, b.y + 6);
    cx.moveTo(b.x + 5, b.y - 6); cx.lineTo(b.x + 5, b.y + 6);
    cx.moveTo(b.x - 5, b.y); cx.lineTo(b.x + 5, b.y);
    cx.stroke();
  }
  }

  // Phase B signature details + Rubicon's flag (drawn here so sprite AND
  // procedural paths both get them)
  drawBuildingDecor(b);
  if (b.type === 'hq' && b.team === 2 && b.built >= 1) drawRubiconBanner(b);
  if (sunk) cx.restore();   // selection corners + hp bar stay full-footprint

  if (sel) {
    cx.strokeStyle = 'rgba(255,255,255,0.85)';
    cx.lineWidth = 2;
    const m = 6, L = 12;
    const x0 = x - m, y0 = y - m, x1 = x + b.w + m, y1 = y + b.h + m;
    cx.beginPath();
    cx.moveTo(x0, y0 + L); cx.lineTo(x0, y0); cx.lineTo(x0 + L, y0);
    cx.moveTo(x1 - L, y0); cx.lineTo(x1, y0); cx.lineTo(x1, y0 + L);
    cx.moveTo(x1, y1 - L); cx.lineTo(x1, y1); cx.lineTo(x1 - L, y1);
    cx.moveTo(x0 + L, y1); cx.lineTo(x0, y1); cx.lineTo(x0, y1 - L);
    cx.stroke();
    // rally line
    if (b.rally && BLD[b.type].trains) {
      cx.strokeStyle = 'rgba(143,216,207,0.5)';
      cx.setLineDash([5, 6]);
      cx.beginPath(); cx.moveTo(b.x, b.y); cx.lineTo(b.rally.x, b.rally.y); cx.stroke();
      cx.setLineDash([]);
      cx.fillStyle = '#8fd8cf';
      cx.beginPath(); cx.arc(b.rally.x, b.rally.y, 4, 0, Math.PI * 2); cx.fill();
    }
    // repair field ring on a selected depot
    if (b.type === 'supply' && b.built >= 1) {
      cx.strokeStyle = 'rgba(140,230,160,0.35)';
      cx.setLineDash([4, 6]);
      cx.beginPath(); cx.arc(b.x, b.y, DEPOT_HEAL_RADIUS, 0, Math.PI * 2); cx.stroke();
      cx.setLineDash([]);
    }
  }
  // browned-out consumers wave a blinking bolt so the shortage is visible on the map
  if (BLD[b.type].pow && b.built >= 1 && tick % 50 < 30 && lowPower(b.team)) {
    cx.fillStyle = '#f0c86a';
    cx.font = 'bold 14px -apple-system, sans-serif';
    cx.textAlign = 'center';
    cx.fillText('⚡', b.x, y - 16);
  }
  if (sel || b.hp < b.maxHp) drawHpBar(b.x, y - 12, b.w * 0.8, b.hp, b.maxHp);
  if (b.queue && b.queue.length) {
    const f = clamp(b.prog / queueTime(b.team, b.queue[0]), 0, 1);
    cx.fillStyle = 'rgba(0,0,0,0.6)'; cx.fillRect(b.x - 20, y - 6, 40, 3);
    cx.fillStyle = '#3fb9c9'; cx.fillRect(b.x - 20, y - 6, 40 * f, 3);
  }
}

// called inside a translate(u.x,u.y)+rotate(u.faceA) transform, so +x is forward.
// Infantry art faces right (no extra rotation); vehicle art points up (rotate +90°).
function drawUnitSprite(u) {
  // walk cycle: real frames sliced from an AI walk video (slice_walk.py).
  // Frame advances with DISTANCE (walkT), not time, so feet read planted.
  // (A 2026-07-12 spritesheet walk attempt was reverted — too few frames,
  // wrong cadence; this 8-frame video slice is the do-over, 2026-07-20.)
  let walk = null;
  if (u.moving && u.order.type !== 'hunker') {
    const wf = animFrames(u.type, 'walk', u.team, 8);
    if (wf.length) walk = wf[Math.floor(u.walkT / (strideOf(u.type) / wf.length)) % wf.length];
  }
  // pre-colored colorway art wins outright — drawn as-is, no tint
  const pre = walk
    || (u.order.type === 'hunker' && optCW('unit_' + u.type + '_hunker', u.team))
    || optCW('unit_' + u.type, u.team);
  if (pre) {
    cx.rotate(Math.PI / 2);              // generated art faces up
    const s = u.r * 2.7;
    cx.drawImage(pre, -s / 2, -s / 2, s, s);
    return;
  }
  // dug-in units swap to their hunker pose; a missing standing sprite falls
  // back to the hunker art so partial art sets never break
  const hk = opt('unit_' + u.type + '_hunker');
  const whole = (u.order.type === 'hunker' && hk) || opt('unit_' + u.type) || hk;
  if (whole) {
    cx.rotate(Math.PI / 2);              // generated art faces up
    const s = u.r * 2.7;
    cx.drawImage(teamSprite(whole, u.team), -s / 2, -s / 2, s, s);
    return;
  }
  if (u.type === 'medic') {
    const img = opt('medic');
    if (img) {
      cx.drawImage(teamSprite(img, u.team), -12, -12, 24, 24);   // dedicated art faces right like infantry
    } else {
      const base = teamSprite(BODY.inf_engineer, u.team);
      const w = 24, h = w * base.height / base.width;
      cx.drawImage(base, -w * 0.45, -h / 2, w, h);
    }
    cx.rotate(-u.faceA);                    // badge stays upright
    cx.fillStyle = '#f2f2ee';
    cx.beginPath(); cx.arc(0, -9, 4.5, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#d84a3e';
    cx.fillRect(-1.2, -12.2, 2.4, 6.4); cx.fillRect(-3.2, -10.2, 6.4, 2.4);
    cx.rotate(u.faceA);
    return;
  }
  if (u.type === 'rocket') {
    const img = opt('rocket_trooper');
    if (img) { cx.drawImage(teamSprite(img, u.team), -12, -12, 24, 24); return; }
    const base = teamSprite(BODY.inf_marine, u.team);
    const w = 25, h = w * base.height / base.width;
    cx.drawImage(base, -w * 0.45, -h / 2, w, h);
    cx.fillStyle = '#3a3f38';                    // launch tube over the shoulder
    cx.fillRect(-6, -8, 17, 4);
    cx.fillStyle = '#e0564a';
    cx.fillRect(10, -8, 2.5, 4);                 // loaded rocket tip
    return;
  }
  if (u.type === 'marine' || u.type === 'sniper' || u.type === 'engineer') {
    const img = teamSprite(BODY['inf_' + u.type], u.team);
    const w = u.type === 'sniper' ? 30 : u.type === 'marine' ? 26 : 24;
    const h = w * img.height / img.width;
    cx.drawImage(img, -w * 0.45, -h / 2, w, h);
    return;
  }
  cx.rotate(Math.PI / 2);   // vehicle sprites point up
  if (u.type === 'tank') {
    cx.drawImage(teamSprite(BODY.tank_body, u.team), -16, -15, 32, 30);
    cx.drawImage(teamSprite(BODY.tank_barrel, u.team), -3.5, -21, 7, 24);
  } else if (u.type === 'artillery') {
    const art = opt('artillery');
    if (art) { cx.drawImage(teamSprite(art, u.team), -16, -20, 32, 40); return; }
    // narrow chassis, extra-long tube — reads as "siege" next to the tank
    cx.drawImage(teamSprite(BODY.tank_body, u.team), -12, -14, 24, 28);
    cx.drawImage(teamSprite(BODY.tank_barrel, u.team), -3, -32, 6, 34);
  } else if (u.type === 'apc') {
    const img = opt('apc');
    if (img) { cx.drawImage(teamSprite(img, u.team), -16, -15, 32, 30); }
    else {
      cx.drawImage(teamSprite(BODY.tank_body, u.team), -16, -14, 32, 28);
      cx.drawImage(BODY.crate, -8, -10, 16, 16);
      cx.fillStyle = '#12171380';                // troop bay doors
      cx.fillRect(-13, 6, 26, 5);
    }
  } else if (u.type === 'raider') {
    cx.drawImage(teamSprite(BODY.tank_body, u.team), -10, -13, 20, 26);
    cx.drawImage(teamSprite(BODY.raider_barrel, u.team), -2.5, -22, 5, 24);
  } else if (u.type === 'rig') {
    // harvester chassis with a containment cage bolted on the bed
    const hv = opt('unit_harvester');
    if (hv) { const s = u.r * 2.7; cx.drawImage(teamSprite(hv, u.team), -s / 2, -s / 2, s, s); }
    else cx.drawImage(teamSprite(BODY.tank_body, u.team), -13, -12, 26, 24);
    drawRigCage(u);
  } else { // harvester
    cx.drawImage(teamSprite(BODY.tank_body, u.team), -13, -12, 26, 24);
    cx.drawImage(BODY.crate, -7, -7, 14, 14);
    if (u.eggCarry) {
      cx.fillStyle = '#e8e2cc';
      cx.beginPath(); cx.ellipse(0, 0, 4, 5.2, 0, 0, Math.PI * 2); cx.fill();
    } else if (u.carry > 0) {
      cx.fillStyle = CRYSTAL_COLOR;
      cx.fillRect(-4, -4, 8, 8);
    }
  }
}

// the rig's cage, drawn in the unit's rotated frame (+y = rear of the truck
// after the vehicle-sprite rotate). Glows green with a specimen inside.
function drawRigCage(u) {
  if (u.captive) {
    cx.fillStyle = 'rgba(143,201,74,0.5)';
    rr(cx, -7, -3, 14, 12, 3); cx.fill();
    cx.fillStyle = '#8fc94a';
    cx.beginPath(); cx.ellipse(0, 3, 4.5, 3.2, 0, 0, Math.PI * 2); cx.fill();
  }
  cx.strokeStyle = u.captive ? '#c7f08a' : '#e8e2cc';
  cx.lineWidth = 1.5;
  rr(cx, -7, -3, 14, 12, 3); cx.stroke();
  cx.beginPath();
  cx.moveTo(-7, 3); cx.lineTo(7, 3);
  cx.moveTo(-2.5, -3); cx.lineTo(-2.5, 9);
  cx.moveTo(2.5, -3); cx.lineTo(2.5, 9);
  cx.stroke();
}

// procedural dino — drawn inside the unit's translate+rotate frame, +x forward.
// Team-colored: wild ones are acid green, hatched player dinos wear teal.
// No sprite art yet; when dino sprites land they slot in via drawUnitSprite.
function drawDino(u) {
  // pre-colored colorway first (wild bone/moss art, or teal for tamed).
  // raptor art is extremely elongated (whip tail) — drawn bigger so the BODY
  // matches spitter mass while the tail overhangs the hit circle harmlessly
  const half = u.type === 'raptor' ? 17 : 13;
  // walk frames (sliced dino videos) win while moving — same distance-driven
  // cycle as infantry, so the gait speed tracks actual ground covered
  let pre = null;
  if (u.moving) {
    const wf = animFrames(u.type, 'walk', u.team, 8);
    if (wf.length) pre = wf[Math.floor(u.walkT / (strideOf(u.type) / wf.length)) % wf.length];
  }
  pre = pre || optCW('unit_' + u.type, u.team);
  if (pre) {
    cx.rotate(Math.PI / 2);   // art faces up
    cx.drawImage(pre, -half, -half, half * 2, half * 2);
    return;
  }
  const img = opt('unit_' + u.type) || (u.type === 'spitter' && opt('dino_spitter'));
  if (img) {
    cx.rotate(Math.PI / 2);   // art faces up
    cx.drawImage(teamSprite(img, u.team), -half, -half, half * 2, half * 2);
    return;
  }
  const C = COLORS[u.team];
  if (u.type === 'critter') {
    // dumpy little grazer: dome back, head down in the moss, stub tail
    const bob = Math.sin(tick * 0.06 + u.id) * 0.8;
    cx.fillStyle = C.dark;                            // stub tail
    cx.beginPath(); cx.moveTo(-6, -1.5); cx.lineTo(-9.5, 0); cx.lineTo(-6, 1.5); cx.closePath(); cx.fill();
    cx.fillStyle = C.main;                            // dome body
    cx.beginPath(); cx.ellipse(0, 0, 6.5, 4.5, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = C.dark;                            // moss saddle
    cx.beginPath(); cx.ellipse(-0.5, 0, 3.4, 2.2, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = C.main;                            // grazing head, bobbing
    cx.beginPath(); cx.ellipse(6.5 + bob * 0.4, 0, 2.8, 2.1, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#e0a43c';                         // one placid amber eye
    cx.beginPath(); cx.arc(6.8 + bob * 0.4, -1, 0.7, 0, Math.PI * 2); cx.fill();
    return;
  }
  if (u.type === 'raptor') {
    // sleek pack hunter: whip tail, coiled haunches, head low and forward
    const wag = Math.sin(tick * 0.35 + u.id) * 3.5;
    cx.fillStyle = C.dark;                            // whip tail
    cx.beginPath();
    cx.moveTo(-3, -2); cx.lineTo(-16, wag); cx.lineTo(-3, 2);
    cx.closePath(); cx.fill();
    cx.fillStyle = C.main;                            // low lean body
    cx.beginPath(); cx.ellipse(0, 0, 8, 3.8, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = C.dark;                            // back stripes
    cx.beginPath(); cx.ellipse(-1.5, 0, 3.5, 1.8, 0, 0, Math.PI * 2); cx.fill();
    const gait = u.moving ? Math.sin(u.walkT * 0.7) * 2.5 : 0;
    cx.strokeStyle = C.dark; cx.lineWidth = 2;        // sickle-claw legs
    cx.beginPath();
    cx.moveTo(1, -3); cx.lineTo(4 + gait, -6);
    cx.moveTo(1, 3); cx.lineTo(4 - gait, 6);
    cx.stroke();
    cx.fillStyle = C.main;                            // narrow snout
    cx.beginPath(); cx.ellipse(9.5, 0, 4.5, 2.4, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#e0a43c';                         // amber predator eyeshine
    cx.beginPath(); cx.arc(8.5, -1.7, 0.9, 0, Math.PI * 2); cx.arc(8.5, 1.7, 0.9, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = '#cfc5a8'; cx.lineWidth = 1;     // bared teeth at the jaw line
    cx.beginPath(); cx.moveTo(11, -1); cx.lineTo(13.5, 0); cx.lineTo(11, 1); cx.stroke();
    return;
  }
  const wag = Math.sin(tick * 0.25 + u.id) * 3;    // tail sway
  cx.fillStyle = C.dark;                            // tail
  cx.beginPath();
  cx.moveTo(-4, -3); cx.lineTo(-15, wag); cx.lineTo(-4, 3);
  cx.closePath(); cx.fill();
  cx.fillStyle = C.main;                            // body
  cx.beginPath(); cx.ellipse(0, 0, 8.5, 5.5, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = C.dark;                            // back stripes
  cx.beginPath(); cx.ellipse(-1, 0, 4.5, 2.5, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = C.main;                            // head
  cx.beginPath(); cx.ellipse(9, 0, 4.5, 3.4, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#a8d060';                         // throat sac — venom is biology, not faction
  cx.beginPath(); cx.arc(7, 0, 2, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#e0a43c';                         // amber predator eyeshine
  cx.beginPath(); cx.arc(9.5, -2.2, 1, 0, Math.PI * 2); cx.arc(9.5, 2.2, 1, 0, Math.PI * 2); cx.fill();
}

// raptor den — a burrow torn into the dirt, ringed by kill-trophies. Where the
// nest reads "clutch to defend", the den reads "something lives here and leaves".
function drawDen(b) {
  const img = opt('dino_den');
  if (img) {
    const pulse = 1 + Math.sin(tick * 0.05) * 0.02;
    const w = b.w * 1.15 * pulse, h = b.h * 1.15 * pulse;
    cx.drawImage(img, b.x - w / 2, b.y - h / 2, w, h);
    return;
  }
  const C = COLORS[3];
  cx.save();
  cx.translate(b.x, b.y);
  cx.fillStyle = '#3a3226';                                  // torn-earth mound
  cx.beginPath(); cx.ellipse(0, 0, b.w / 2, b.h / 2 * 0.85, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = C.dark;                                     // trampled moss ring
  cx.beginPath(); cx.ellipse(0, 1, b.w / 2 * 0.82, b.h / 2 * 0.66, 0, 0, Math.PI * 2); cx.fill();
  const breathe = 1 + Math.sin(tick * 0.05) * 0.05;
  cx.fillStyle = '#171310';                                  // the burrow mouth — deep and dark
  cx.beginPath(); cx.ellipse(2, 3, b.w / 2 * 0.42 * breathe, b.h / 2 * 0.3 * breathe, 0.3, 0, Math.PI * 2); cx.fill();
  cx.strokeStyle = '#cfc5a8'; cx.lineWidth = 2.5;            // kill-trophy ribs staked around the rim
  for (const a of [0.9, 2.1, 3.4, 4.6, 5.6]) {
    const rx = Math.cos(a) * b.w * 0.38, ry = Math.sin(a) * b.h * 0.3;
    cx.beginPath(); cx.moveTo(rx, ry); cx.lineTo(rx * 1.28, ry * 1.28 - 6); cx.stroke();
  }
  cx.strokeStyle = C.dark; cx.lineWidth = 1.5;               // claw drag-marks out the door
  for (const off of [-5, 0, 5]) {
    cx.beginPath(); cx.moveTo(10 + off * 0.3, 8 + off); cx.lineTo(b.w / 2 * 0.95, 12 + off * 1.6); cx.stroke();
  }
  cx.fillStyle = '#e0a43c';                                  // eyeshine in the dark
  const blink = Math.sin(tick * 0.03 + b.id) > -0.85 ? 1 : 0;
  if (blink) {
    cx.beginPath(); cx.arc(-2, 2, 1.2, 0, Math.PI * 2); cx.arc(4, 4, 1.2, 0, Math.PI * 2); cx.fill();
  }
  cx.restore();
}

// gunship — drawn inside translate+rotate, +x forward. Procedural (no air art yet).
function drawGunship(u) {
  const img = opt('unit_gunship') || opt('gunship');
  if (img) {
    cx.rotate(Math.PI / 2);   // art faces up
    cx.drawImage(teamSprite(img, u.team), -17, -17, 34, 34);
    cx.rotate(-Math.PI / 2);
    const ra = tick * 0.55 + u.id;   // keep the spinning rotor over the art
    cx.strokeStyle = 'rgba(220,235,230,0.55)';
    cx.lineWidth = 1.4;
    cx.beginPath();
    cx.moveTo(Math.cos(ra) * 15, Math.sin(ra) * 15);
    cx.lineTo(-Math.cos(ra) * 15, -Math.sin(ra) * 15);
    cx.moveTo(Math.cos(ra + Math.PI / 2) * 15, Math.sin(ra + Math.PI / 2) * 15);
    cx.lineTo(-Math.cos(ra + Math.PI / 2) * 15, -Math.sin(ra + Math.PI / 2) * 15);
    cx.stroke();
    return;
  }
  const C = COLORS[u.team];
  cx.fillStyle = C.dark;                              // tail boom
  cx.fillRect(-16, -1.5, 10, 3);
  cx.fillStyle = C.main;                              // tail fin
  cx.beginPath(); cx.moveTo(-16, 0); cx.lineTo(-19, -5); cx.lineTo(-13, 0); cx.closePath(); cx.fill();
  cx.fillStyle = C.dark;                              // fuselage
  cx.beginPath(); cx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2); cx.fill();
  cx.strokeStyle = C.main; cx.lineWidth = 1.5;
  cx.beginPath(); cx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2); cx.stroke();
  cx.fillStyle = C.light;                             // canopy
  cx.beginPath(); cx.ellipse(4.5, 0, 4, 3, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#0e1210';                           // weapon stubs
  cx.fillRect(-2, -8.5, 7, 2.5); cx.fillRect(-2, 6, 7, 2.5);
  const ra = tick * 0.55 + u.id;                      // main rotor
  cx.strokeStyle = 'rgba(220,235,230,0.75)';
  cx.lineWidth = 1.6;
  cx.beginPath();
  cx.moveTo(Math.cos(ra) * 15, Math.sin(ra) * 15);
  cx.lineTo(-Math.cos(ra) * 15, -Math.sin(ra) * 15);
  cx.moveTo(Math.cos(ra + Math.PI / 2) * 15, Math.sin(ra + Math.PI / 2) * 15);
  cx.lineTo(-Math.cos(ra + Math.PI / 2) * 15, -Math.sin(ra + Math.PI / 2) * 15);
  cx.stroke();
  cx.strokeStyle = 'rgba(220,235,230,0.18)';          // rotor blur disc
  cx.lineWidth = 1;
  cx.beginPath(); cx.arc(0, 0, 15, 0, Math.PI * 2); cx.stroke();
}

// delta-wing strike jet — +x forward. Red belly light = bomb still aboard.
function drawJet(u) {
  const C = COLORS[u.team];
  const img = opt('unit_harrier') || opt('harrier');
  if (img) {
    cx.rotate(Math.PI / 2);
    cx.drawImage(teamSprite(img, u.team), -16, -16, 32, 32);
    cx.rotate(-Math.PI / 2);
  } else {
    cx.fillStyle = C.dark;                        // delta wing
    cx.beginPath(); cx.moveTo(17, 0); cx.lineTo(-7, -12); cx.lineTo(-3, 0); cx.lineTo(-7, 12); cx.closePath(); cx.fill();
    cx.strokeStyle = C.main; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(17, 0); cx.lineTo(-7, -12); cx.lineTo(-3, 0); cx.lineTo(-7, 12); cx.closePath(); cx.stroke();
    cx.fillStyle = C.main;                        // fuselage
    cx.beginPath(); cx.ellipse(4, 0, 8, 2.8, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = C.light;                       // canopy
    cx.beginPath(); cx.arc(9, 0, 2.2, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = C.dark;                        // twin tails
    cx.fillRect(-9, -7, 4, 2.5); cx.fillRect(-9, 4.5, 4, 2.5);
  }
  if (u.armed) {                                  // the payload
    cx.fillStyle = '#e0564a';
    cx.beginPath(); cx.arc(-1, 0, 2.2, 0, Math.PI * 2); cx.fill();
  }
}

function drawCargoPips(u) {
  if (!u.cargo || !u.cargo.length) return;
  cx.fillStyle = '#e8e2cc';
  for (let i = 0; i < u.cargo.length; i++) cx.fillRect(u.x - 11 + i * 6.5, u.y + u.r + 4, 4.5, 4.5);
}

function drawUnit(u) {
  const C = COLORS[u.team];
  const sel = selection.includes(u);
  if (sel) {
    cx.strokeStyle = 'rgba(143,216,207,0.9)';
    cx.lineWidth = 1.5;
    cx.beginPath(); cx.arc(u.x, u.y, u.r + 5, 0, Math.PI * 2); cx.stroke();
  }
  if (u.type === 'gunship' || u.type === 'harrier') {
    cx.fillStyle = 'rgba(0,0,0,0.3)';   // ground shadow sells the altitude
    cx.beginPath(); cx.ellipse(u.x + 8, u.y + 13, u.r * 0.9, u.r * 0.45, 0, 0, Math.PI * 2); cx.fill();
    cx.save();
    cx.translate(u.x, u.y);
    cx.rotate(u.faceA);
    if (u.type === 'gunship') drawGunship(u); else drawJet(u);
    cx.restore();
    drawUnitDecor(u);
    if (sel || u.hp < u.maxHp) drawHpBar(u.x, u.y - u.r - 12, u.r * 2.4, u.hp, u.maxHp);
    drawRank(u);
    return;
  }
  if (IS_DINO[u.type]) {
    if (u.specimen) {
      // protected specimen: pulsing field ring so "don't shoot" reads at a glance
      cx.strokeStyle = `rgba(143,201,74,${0.5 + 0.3 * Math.sin(tick * 0.1)})`;
      cx.lineWidth = 2;
      cx.setLineDash([4, 5]);
      cx.beginPath(); cx.arc(u.x, u.y, u.r + 7, 0, Math.PI * 2); cx.stroke();
      cx.setLineDash([]);
    }
    cx.save();
    cx.translate(u.x, u.y);
    cx.rotate(u.faceA);
    if (u.moving && !animFrames(u.type, 'walk', u.team, 8).length)
      cx.rotate(Math.sin(u.walkT * 0.55) * 0.09);   // scurry wiggle (no-frames fallback)
    drawDino(u);
    cx.restore();
    if (sel || u.hp < u.maxHp) drawHpBar(u.x, u.y - u.r - 10, u.r * 2.4, u.hp, u.maxHp);
    drawRank(u);
    return;
  }
  if (u.order.type === 'hunker') {
    // sandbag ring so dug-in marines read at a glance
    cx.strokeStyle = 'rgba(232,196,106,0.85)';
    cx.lineWidth = 3;
    cx.setLineDash([5, 4]);
    cx.beginPath(); cx.arc(u.x, u.y, u.r + 3, 0, Math.PI * 2); cx.stroke();
    cx.setLineDash([]);
  }
  cx.save();
  cx.translate(u.x, u.y);
  cx.rotate(u.faceA);
  if (u.recoil) cx.translate(-u.recoil, 0);                       // gun kick
  // infantry with walk frames animate via the frame cycle (drawUnitSprite);
  // the rest keep the original subtle sway until their walk video lands.
  // (A translate weight-shift was tried 2026-07-20 and read worse — don't.)
  if ((IS_INF[u.type]) && u.moving && !animFrames(u.type, 'walk', u.team, 8).length)
    cx.rotate(Math.sin(u.walkT * 0.4) * 0.07);
  if (bodiesReady) {
    drawUnitSprite(u);
    cx.restore();
    drawUnitDecor(u);
    if (sel || u.hp < u.maxHp) drawHpBar(u.x, u.y - u.r - 10, u.r * 2.4, u.hp, u.maxHp);
    drawRank(u);
    drawCargoPips(u);
    drawCapRing(u);
    return;
  }
  if (u.type === 'marine') {
    cx.fillStyle = C.dark;
    cx.beginPath(); cx.arc(0, 0, u.r, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = C.main;
    cx.beginPath(); cx.arc(0, 0, u.r - 3, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = '#0e1210'; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(2, 0); cx.lineTo(u.r + 6, 0); cx.stroke();
    cx.fillStyle = '#0e1210';
    cx.beginPath(); cx.arc(2, 0, 2.5, 0, Math.PI * 2); cx.fill();
  } else if (u.type === 'sniper') {
    // prone marksman: slim low body, hood at the back, long rifle with bipod
    cx.fillStyle = C.dark;
    rr(cx, -11, -4, 17, 8, 4); cx.fill();
    cx.strokeStyle = C.light; cx.lineWidth = 1.5;
    rr(cx, -11, -4, 17, 8, 4); cx.stroke();
    cx.fillStyle = C.light;
    cx.beginPath(); cx.arc(-6, 0, 3.2, 0, Math.PI * 2); cx.fill();          // hood
    cx.strokeStyle = '#0e1210'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(4, 0); cx.lineTo(u.r + 15, 0); cx.stroke();   // long rifle
    cx.fillStyle = '#0e1210';
    cx.beginPath(); cx.arc(5, -3.5, 1.8, 0, Math.PI * 2); cx.fill();        // scope
    cx.strokeStyle = '#0e1210'; cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(u.r + 10, 0); cx.lineTo(u.r + 14, -4);                        // bipod legs
    cx.moveTo(u.r + 10, 0); cx.lineTo(u.r + 14, 4);
    cx.stroke();
  } else if (u.type === 'medic') {
    cx.fillStyle = C.dark;
    cx.beginPath(); cx.arc(0, 0, u.r, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#f2f2ee';
    cx.beginPath(); cx.arc(0, 0, u.r - 3, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#d84a3e';                                               // red cross
    cx.fillRect(-1.5, -5, 3, 10); cx.fillRect(-5, -1.5, 10, 3);
  } else if (u.type === 'engineer') {
    cx.fillStyle = C.dark;
    cx.beginPath(); cx.arc(0, 0, u.r, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#f0c86a';                                               // hard hat ring
    cx.beginPath(); cx.arc(0, 0, u.r - 2.5, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = C.main;
    cx.beginPath(); cx.arc(0, 0, u.r - 5.5, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = '#c8d4cc'; cx.lineWidth = 2.5;                         // wrench arm
    cx.beginPath(); cx.moveTo(2, 0); cx.lineTo(u.r + 5, 0); cx.stroke();
    cx.strokeStyle = '#c8d4cc'; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(u.r + 6, 0, 2.6, Math.PI * 0.6, Math.PI * 1.4, true); cx.stroke();
  } else if (u.type === 'raider') {
    cx.fillStyle = 'rgba(18,23,19,0.7)';
    cx.fillRect(-10, -11, 13, 4); cx.fillRect(-10, 7, 13, 4);                // wheels
    cx.fillStyle = C.dark;
    cx.beginPath(); cx.moveTo(15, 0); cx.lineTo(-11, -8); cx.lineTo(-11, 8); cx.closePath(); cx.fill();
    cx.strokeStyle = C.main; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(15, 0); cx.lineTo(-11, -8); cx.lineTo(-11, 8); cx.closePath(); cx.stroke();
    cx.fillStyle = C.main;
    cx.beginPath(); cx.arc(-2, 0, 3.5, 0, Math.PI * 2); cx.fill();           // cockpit
    cx.strokeStyle = '#0e1210'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(3, 0); cx.lineTo(17, 0); cx.stroke();          // gun
  } else if (u.type === 'tank') {
    cx.fillStyle = C.dark;
    rr(cx, -15, -11, 30, 22, 5); cx.fill();
    cx.fillStyle = '#12171380';
    cx.fillRect(-15, -11, 30, 5); cx.fillRect(-15, 6, 30, 5);
    cx.fillStyle = C.main;
    cx.beginPath(); cx.arc(0, 0, 8, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = C.main; cx.lineWidth = 4;
    cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(22, 0); cx.stroke();
  } else if (u.type === 'apc') {
    cx.fillStyle = C.dark;
    rr(cx, -15, -12, 30, 24, 6); cx.fill();
    cx.fillStyle = '#12171380';
    cx.fillRect(-15, -12, 30, 5); cx.fillRect(-15, 7, 30, 5);
    cx.fillStyle = C.main;
    rr(cx, -8, -6, 16, 12, 3); cx.fill();        // troop bay
    cx.strokeStyle = '#0e1210'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(8, 0); cx.lineTo(18, 0); cx.stroke();   // MG stub
  } else if (u.type === 'artillery') {
    cx.fillStyle = C.dark;
    rr(cx, -13, -9, 26, 18, 4); cx.fill();
    cx.fillStyle = '#12171380';
    cx.fillRect(-13, -9, 26, 4); cx.fillRect(-13, 5, 26, 4);
    cx.fillStyle = C.main;
    cx.beginPath(); cx.arc(-2, 0, 6, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = C.main; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(-2, 0); cx.lineTo(28, 0); cx.stroke();   // long siege tube
    cx.strokeStyle = C.light; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(24, -3); cx.lineTo(24, 3); cx.stroke();  // muzzle brake
  } else if (u.type === 'rig') {
    cx.fillStyle = C.dark;
    rr(cx, -12, -9, 24, 18, 5); cx.fill();
    cx.strokeStyle = C.main; cx.lineWidth = 1.5;
    rr(cx, -12, -9, 24, 18, 5); cx.stroke();
    cx.rotate(Math.PI / 2);   // cage helper expects the vehicle-sprite frame
    drawRigCage(u);
    cx.rotate(-Math.PI / 2);
  } else { // harvester
    cx.fillStyle = C.dark;
    rr(cx, -12, -9, 24, 18, 5); cx.fill();
    cx.fillStyle = C.main;
    rr(cx, -12, -9, 24, 18, 5); cx.strokeStyle = C.main; cx.lineWidth = 1.5; cx.stroke();
    cx.fillStyle = '#c8d4cc';
    cx.fillRect(10, -7, 4, 14); // front scoop
    if (u.eggCarry) {
      cx.fillStyle = '#e8e2cc';
      cx.beginPath(); cx.ellipse(-3, 0, 4, 5.2, 0, 0, Math.PI * 2); cx.fill();
    } else {
      cx.fillStyle = u.carry > 0 ? CRYSTAL_COLOR : '#26302a';
      rr(cx, -8, -5, 10, 10, 2); cx.fill();
    }
  }
  cx.restore();
  drawUnitDecor(u);
  if (sel || u.hp < u.maxHp) drawHpBar(u.x, u.y - u.r - 10, u.r * 2.4, u.hp, u.maxHp);
  drawRank(u);
  drawCargoPips(u);
  drawCapRing(u);
}

// Phase B accent overlays (STYLE-GUIDE.md): tiny signature details drawn over
// the tinted body — 5% of the pixels, most of the identity. Own transform so it
// works over sprite AND procedural bodies. Local frame: +x = facing.
function drawUnitDecor(u) {
  const C = COLORS[u.team];
  cx.save();
  cx.translate(u.x, u.y);
  cx.rotate(u.faceA);
  switch (u.type) {
    case 'marine':      // accent visor strip across the helmet
      cx.strokeStyle = C.accent;
      cx.lineWidth = 2;
      cx.beginPath(); cx.arc(1, 0, 4.5, -0.65, 0.65); cx.stroke();
      break;
    case 'sniper':      // scope glint — steady, not blinking (playtest 2026-07-20:
      // the blink read as unexplained muzzle flash)
      cx.fillStyle = C.accent;
      cx.beginPath(); cx.arc(7, -2, 1.4, 0, Math.PI * 2); cx.fill();
      break;
    case 'rocket':      // red warhead tip peeking from the tube
      cx.fillStyle = '#e0564a';
      cx.beginPath(); cx.arc(8, -5, 1.8, 0, Math.PI * 2); cx.fill();
      break;
    case 'harvester':
    case 'rig': {       // hazard ticks on the scoop; cargo state readable on any art
      cx.strokeStyle = HAZARD_YELLOW;
      cx.lineWidth = 2;
      cx.beginPath();
      for (const oy of [-6, -1, 4]) { cx.moveTo(9, oy); cx.lineTo(12, oy + 3); }
      cx.stroke();
      if (u.type === 'harvester') {
        if (u.eggCarry) {
          cx.fillStyle = '#e8e2cc';
          cx.beginPath(); cx.ellipse(-2, 0, 3.5, 4.5, 0, 0, Math.PI * 2); cx.fill();
        } else if (u.carry > 0) {
          cx.fillStyle = CRYSTAL_COLOR;
          cx.fillRect(-5, -3.5, 7, 7);
        }
      }
      break;
    }
    case 'raider':      // racing stripe + headlight
      cx.strokeStyle = C.trim;
      cx.globalAlpha = 0.85;
      cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(-9, 0); cx.lineTo(9, 0); cx.stroke();
      cx.globalAlpha = 1;
      cx.fillStyle = C.accent;
      cx.beginPath(); cx.arc(11, 0, 1.6, 0, Math.PI * 2); cx.fill();
      break;
    case 'tank':        // muzzle band
      cx.strokeStyle = C.accent;
      cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(14, -2.2); cx.lineTo(14, 2.2); cx.stroke();
      break;
    case 'apc':         // hazard chevrons on the rear ramp
      cx.strokeStyle = HAZARD_YELLOW;
      cx.lineWidth = 1.8;
      cx.beginPath();
      cx.moveTo(-8, -4); cx.lineTo(-11, 0); cx.lineTo(-8, 4);
      cx.moveTo(-5, -4); cx.lineTo(-8, 0); cx.lineTo(-5, 4);
      cx.stroke();
      break;
    case 'artillery':   // bands ringing the long barrel
      cx.strokeStyle = C.accent;
      cx.lineWidth = 1.8;
      cx.beginPath();
      cx.moveTo(17, -2); cx.lineTo(17, 2);
      cx.moveTo(22, -1.8); cx.lineTo(22, 1.8);
      cx.stroke();
      break;
    case 'gunship':     // nose sensor ball
      cx.fillStyle = C.accent;
      cx.beginPath(); cx.arc(9, 0, 1.8, 0, Math.PI * 2); cx.fill();
      break;
    case 'harrier':     // engine intake glow
      cx.fillStyle = C.accent;
      cx.globalAlpha = 0.9;
      cx.beginPath();
      cx.arc(2, -3.5, 1.4, 0, Math.PI * 2);
      cx.arc(2, 3.5, 1.4, 0, Math.PI * 2);
      cx.fill();
      cx.globalAlpha = 1;
      break;
  }
  cx.restore();
}

// capture channel progress — a green arc closing around the rig
function drawCapRing(u) {
  // player rigs wear the specimen's green field ring at all times — the rig
  // and its target share one visual language, so the pairing reads at a glance
  if (u.type === 'rig' && u.team === 1) {
    cx.strokeStyle = `rgba(143,201,74,${0.5 + 0.3 * Math.sin(tick * 0.1)})`;
    cx.lineWidth = 2;
    cx.setLineDash([4, 5]);
    cx.beginPath(); cx.arc(u.x, u.y, u.r + 9, 0, Math.PI * 2); cx.stroke();
    cx.setLineDash([]);
  }
  if (!u.capT || u.order.type !== 'capture') return;   // progress arc only while channeling
  cx.strokeStyle = '#8fc94a';
  cx.lineWidth = 3;
  cx.beginPath();
  cx.arc(u.x, u.y, u.r + 7, -Math.PI / 2, -Math.PI / 2 + (u.capT / RIG_CAP_TIME) * Math.PI * 2);
  cx.stroke();
}

function drawBullet(p) {
  if (p.kind === 'arc') {
    // fake a lob: shadow tracks the flight line, the shell rises on a parabola
    const total = dist(p.x0, p.y0, p.tx, p.ty) || 1;
    const k = clamp(1 - dist(p.x, p.y, p.tx, p.ty) / total, 0, 1);
    const lift = Math.sin(k * Math.PI) * Math.min(60, total * 0.22);
    cx.fillStyle = 'rgba(0,0,0,0.35)';
    cx.beginPath(); cx.ellipse(p.x, p.y, 4, 2.5, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#f0c86a';
    cx.beginPath(); cx.arc(p.x, p.y - lift, 4.2, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.7)';
    cx.beginPath(); cx.arc(p.x - 1, p.y - lift - 1, 1.5, 0, Math.PI * 2); cx.fill();
  } else if (p.kind === 'shell') {
    cx.fillStyle = '#f0c86a';
    cx.beginPath(); cx.arc(p.x, p.y, 3.4, 0, Math.PI * 2); cx.fill();
  } else if (p.kind === 'rocket') {
    cx.save();
    cx.translate(p.x, p.y);
    cx.rotate(p.a || 0);
    cx.fillStyle = '#d8dcd0';
    cx.fillRect(-5, -1.5, 8, 3);
    cx.fillStyle = '#e0564a';
    cx.beginPath(); cx.moveTo(3, -1.5); cx.lineTo(6.5, 0); cx.lineTo(3, 1.5); cx.closePath(); cx.fill();
    cx.restore();
  } else if (p.kind === 'spit') {
    cx.fillStyle = '#a8e05a';
    cx.beginPath(); cx.arc(p.x, p.y, 3, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = 'rgba(168,224,90,0.4)';   // dribbling acid trail
    cx.beginPath(); cx.arc(p.x - Math.cos(p.a || 0) * 5, p.y - Math.sin(p.a || 0) * 5, 1.8, 0, Math.PI * 2); cx.fill();
  } else if (p.kind === 'snipe') {
    cx.strokeStyle = 'rgba(255,255,255,0.9)';
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(p.x, p.y);
    cx.lineTo(p.x - Math.cos(p.a || 0) * 18, p.y - Math.sin(p.a || 0) * 18);
    cx.stroke();
  } else {
    const C = COLORS[p.team];
    cx.strokeStyle = C.fx || C.light;   // team FX role: tracers wear the faction's glow
    cx.lineWidth = 2;
    cx.beginPath();
    cx.moveTo(p.x, p.y);
    cx.lineTo(p.x - Math.cos(p.a || 0) * 8, p.y - Math.sin(p.a || 0) * 8);
    cx.stroke();
  }
}

function drawFx(f) {
  const k = f.t / f.max;
  if (f.kind === 'slash') {
    // three bone-white claw rakes across the victim, angled from the attacker
    cx.save();
    cx.translate(f.x, f.y);
    cx.rotate((f.a || 0) + 0.5);
    cx.strokeStyle = `rgba(232,226,204,${0.9 * (1 - k)})`;
    cx.lineWidth = 2;
    for (const off of [-4.5, 0, 4.5]) {
      cx.beginPath();
      cx.moveTo(-7, off - 2);
      cx.quadraticCurveTo(0, off + 1, 8, off + 3);
      cx.stroke();
    }
    cx.restore();
    return;
  }
  if (f.kind === 'boom') {
    cx.strokeStyle = `rgba(240,180,100,${1 - k})`;
    cx.lineWidth = 3;
    cx.beginPath(); cx.arc(f.x, f.y, f.size * k + 4, 0, Math.PI * 2); cx.stroke();
    cx.fillStyle = `rgba(240,140,80,${0.5 * (1 - k)})`;
    cx.beginPath(); cx.arc(f.x, f.y, f.size * k * 0.7, 0, Math.PI * 2); cx.fill();
  } else if (f.kind === 'text') {
    cx.fillStyle = `rgba(111,227,208,${1 - k})`;
    cx.font = 'bold 13px -apple-system, sans-serif';
    cx.textAlign = 'center';
    cx.fillText(f.msg, f.x, f.y - 22 * k);
  } else if (f.kind === 'spark') {
    cx.strokeStyle = `rgba(140,230,160,${1 - k})`;
    cx.lineWidth = 2;
    const s = 4 * (1 - k) + 1;
    cx.beginPath();
    cx.moveTo(f.x - s, f.y); cx.lineTo(f.x + s, f.y);
    cx.moveTo(f.x, f.y - s); cx.lineTo(f.x, f.y + s);
    cx.stroke();
  } else if (f.kind === 'ping') {
    cx.strokeStyle = f.color;
    cx.globalAlpha = 1 - k;
    cx.lineWidth = 2;
    cx.beginPath(); cx.arc(f.x, f.y, 16 * (1 - k) + 3, 0, Math.PI * 2); cx.stroke();
    cx.globalAlpha = 1;
  } else if (f.kind === 'corpse') {
    // sliced death animation: play the fall, then the body lingers and fades
    const img = f.frames[Math.min(f.frames.length - 1, Math.floor(f.t / 9))];
    if (!img.complete || !img.naturalWidth) return;
    cx.save();
    cx.globalAlpha = Math.max(0, Math.min(1, (f.max - f.t) / 60));
    cx.translate(f.x, f.y);
    cx.rotate(f.a + Math.PI / 2);   // art faces up
    cx.drawImage(img, -f.size / 2, -f.size / 2, f.size, f.size);
    cx.restore();
  } else if (f.kind === 'sprite') {
    if (f.t < f.delay) return;
    const img = f.img;
    if (!img.complete || !img.naturalWidth) return;
    const dt = f.t - f.delay, kk = dt / (f.max - f.delay);
    const s = f.s0 + (f.s1 - f.s0) * kk;
    cx.save();
    cx.globalAlpha = Math.max(0, f.a0 + (f.a1 - f.a0) * kk);
    if (f.add) cx.globalCompositeOperation = 'lighter';
    cx.translate(f.x + f.vx * dt, f.y + f.vy * dt);
    cx.rotate(f.rot + f.rotV * dt);
    cx.drawImage(img, -s / 2, -s / 2, s, s);
    cx.restore();
  } else if (f.kind === 'muzzle') {
    const img = f.img;
    if (!img.complete || !img.naturalWidth) return;
    const h = f.s, w = h * (img.naturalWidth / img.naturalHeight);
    cx.save();
    cx.globalAlpha = 1 - k;
    cx.globalCompositeOperation = 'lighter';
    cx.translate(f.x, f.y);
    cx.rotate(f.a + Math.PI / 2);   // sprite art points up; face along the shot
    cx.drawImage(img, -w / 2, -h, w, h);
    cx.restore();
  }
}

function render() {
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, view.w, view.h);
  cx.save();
  shakeAmp *= 0.9;
  if (shakeAmp < 0.3) shakeAmp = 0;
  cx.translate(-cam.x + (Math.random() - 0.5) * shakeAmp, -cam.y + (Math.random() - 0.5) * shakeAmp);

  // only touch the pixels the camera can see — full-world blits were the
  // number one frame cost on the big map (padded for screen shake)
  const vx = Math.max(0, cam.x - 24), vy = Math.max(0, cam.y - 24);
  const vw = Math.min(W - vx, view.w + 48), vh = Math.min(H - vy, view.h + 48);
  const inView = (x, y, m) => x > vx - m && x < vx + vw + m && y > vy - m && y < vy + vh + m;
  cx.drawImage(groundCv, vx, vy, vw, vh, vx, vy, vw, vh);
  for (const c of crystals) if (inView(c.x, c.y, 40) && isShownAt(c.x, c.y)) drawCrystal(c);
  for (const e of eggs) if (inView(e.x, e.y, 30) && isShownAt(e.x, e.y)) drawEgg(e);
  for (const b of buildings) if (inView(b.x, b.y, 130) && (b.team === 1 || isShownAt(b.x, b.y))) drawBuilding(b);
  for (const u of units) if (inView(u.x, u.y, 60) && (u.team === 1 || isVisibleAt(u.x, u.y))) drawUnit(u);
  for (const p of bullets) if (inView(p.x, p.y, 60) && (p.team === 1 || isVisibleAt(p.x, p.y))) drawBullet(p);
  for (const f of fxs) {
    if (!inView(f.x, f.y, 260)) continue;
    const worldFx = f.kind === 'boom' || f.kind === 'sprite' || f.kind === 'muzzle' || f.kind === 'corpse';
    if (!worldFx || isVisibleAt(f.x, f.y)) drawFx(f);
  }

  // fog of war (small canvas scaled up = soft edges), viewport slice only
  cx.drawImage(fogCv, vx / TILE, vy / TILE, vw / TILE, vh / TILE, vx, vy, vw, vh);

  // inbound nukes: pulsing ground zero + countdown, visible through fog
  for (const n of nukes) {
    if (!inView(n.x, n.y, 340)) continue;
    const spec = NUKE[n.tier];
    const pulse = 0.5 + 0.4 * Math.abs(Math.sin(tick * 0.12));
    cx.strokeStyle = `rgba(255,86,60,${pulse})`;
    cx.lineWidth = 2.5;
    cx.beginPath(); cx.arc(n.x, n.y, spec.radius, 0, Math.PI * 2); cx.stroke();
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(n.x - 16, n.y); cx.lineTo(n.x + 16, n.y);
    cx.moveTo(n.x, n.y - 16); cx.lineTo(n.x, n.y + 16);
    cx.stroke();
    cx.fillStyle = `rgba(255,120,90,${0.6 + 0.4 * pulse})`;
    cx.font = 'bold 18px -apple-system, sans-serif';
    cx.textAlign = 'center';
    cx.fillText('☢ ' + Math.ceil((n.max - n.t) / 60), n.x, n.y - spec.radius - 10);
  }

  // mission objective beacons: pulsing markers, visible through fog
  if (mission && ms) {
    for (const o of ms.objectives) {
      if (!o.active || o.done || !o.mark) continue;
      const [mx, my] = o.mark;
      if (!inView(mx, my, 120)) continue;
      const k = Math.abs(Math.sin(tick * 0.06));
      const rad = 24 + 9 * k;
      cx.strokeStyle = `rgba(111,227,208,${0.4 + 0.4 * k})`;
      cx.lineWidth = 2.5;
      cx.beginPath(); cx.arc(mx, my, rad, 0, Math.PI * 2); cx.stroke();
      cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(mx, my, 5, 0, Math.PI * 2); cx.stroke();
      cx.fillStyle = `rgba(159,232,239,${0.6 + 0.35 * k})`;
      cx.font = 'bold 13px -apple-system, sans-serif';
      cx.textAlign = 'center';
      cx.fillText('◈', mx, my - rad - 8);
    }
  }

  // nuke targeting ghost
  if (nukeTargeting && mouse.overCanvas && nukeTargeting.warhead) {
    const spec = NUKE[nukeTargeting.warhead];
    const bad = spec.hqSafe && buildings.some(x => x.type === 'hq' && dist2(mouse.wx, mouse.wy, x.x, x.y) < NUKE_HQ_EXCLUSION ** 2);
    cx.strokeStyle = bad ? 'rgba(255,60,40,0.9)' : 'rgba(255,180,80,0.8)';
    cx.setLineDash([6, 6]);
    cx.lineWidth = 2;
    cx.beginPath(); cx.arc(mouse.wx, mouse.wy, spec.radius, 0, Math.PI * 2); cx.stroke();
    cx.setLineDash([]);
    if (bad) {
      cx.font = 'bold 14px -apple-system, sans-serif';
      cx.textAlign = 'center';
      cx.fillStyle = 'rgba(255,80,60,0.95)';
      cx.fillText('too close to an HQ', mouse.wx, mouse.wy - spec.radius - 8);
    }
  }

  // drag select rect
  if (dragging && dragStart) {
    const wx = mouse.wx, wy = mouse.wy;
    cx.strokeStyle = 'rgba(143,216,207,0.9)';
    cx.fillStyle = 'rgba(143,216,207,0.08)';
    cx.lineWidth = 1;
    const x = Math.min(dragStart.x, wx), y = Math.min(dragStart.y, wy);
    cx.fillRect(x, y, Math.abs(wx - dragStart.x), Math.abs(wy - dragStart.y));
    cx.strokeRect(x, y, Math.abs(wx - dragStart.x), Math.abs(wy - dragStart.y));
  }
  // building placement ghost
  if (placing && mouse.overCanvas) {
    const d = BLD[placing];
    const ok = canPlaceBuilding(placing, mouse.wx, mouse.wy);
    cx.globalAlpha = 0.55;
    cx.fillStyle = ok ? '#3fb9c9' : '#e0564a';
    rr(cx, mouse.wx - d.w / 2, mouse.wy - d.h / 2, d.w, d.h, 6); cx.fill();
    cx.globalAlpha = 1;
    const ringR = BLD[placing].range || (placing === 'supply' ? DEPOT_HEAL_RADIUS : 0);
    if (ringR) {
      cx.strokeStyle = placing === 'supply'
        ? (ok ? 'rgba(140,230,160,0.35)' : 'rgba(224,86,74,0.35)')
        : (ok ? 'rgba(63,185,201,0.35)' : 'rgba(224,86,74,0.35)');
      cx.setLineDash([4, 6]);
      cx.beginPath(); cx.arc(mouse.wx, mouse.wy, ringR, 0, Math.PI * 2); cx.stroke();
      cx.setLineDash([]);
    }
  }
  cx.restore();
  if (++frameNo % 3 === 0) renderMinimap();
}
let frameNo = 0;

function renderMinimap() {
  const sx = mini.width / W, sy = mini.height / H;
  mcx.fillStyle = '#0c100c';
  mcx.fillRect(0, 0, mini.width, mini.height);
  for (const c of crystals) {
    if (c.amount <= 0 || !isShownAt(c.x, c.y)) continue;
    mcx.fillStyle = CRYSTAL_COLOR;
    mcx.fillRect(c.x * sx - 1, c.y * sy - 1, 2, 2);
  }
  for (const e of eggs) {
    if (!isShownAt(e.x, e.y)) continue;
    mcx.fillStyle = tick % 60 < 34 ? '#8fc94a' : '#e8e2cc';   // green blink: "come get these"
    mcx.fillRect(e.x * sx - 1.5, e.y * sy - 1.5, 3, 3);
  }
  mcx.fillStyle = '#3d443d';
  for (const rk of rocks) {
    mcx.beginPath(); mcx.arc(rk.x * sx, rk.y * sy, Math.max(1.5, rk.r * sx), 0, Math.PI * 2); mcx.fill();
  }
  for (const b of buildings) {
    if (b.team !== 1 && !isShownAt(b.x, b.y)) continue;
    mcx.fillStyle = COLORS[b.team].main;
    mcx.fillRect(b.x * sx - 2, b.y * sy - 2, 4, 4);
  }
  for (const u of units) {
    if (u.team !== 1 && !isVisibleAt(u.x, u.y)) continue;
    mcx.fillStyle = COLORS[u.team].main;
    mcx.fillRect(u.x * sx - 1, u.y * sy - 1, 2, 2);
  }
  mcx.drawImage(fogCv, 0, 0, mini.width, mini.height);
  for (const n of nukes) {
    if (tick % 24 >= 12) continue;
    mcx.fillStyle = '#ff5040';
    mcx.beginPath(); mcx.arc(n.x * sx, n.y * sy, 3.5, 0, Math.PI * 2); mcx.fill();
  }
  for (const a of alerts) {                       // attack pings pulse over the fog
    const k = (a.t % 40) / 40;
    mcx.strokeStyle = `rgba(240,90,70,${1 - k})`;
    mcx.lineWidth = 1.5;
    mcx.beginPath(); mcx.arc(a.x * sx, a.y * sy, 2 + k * 8, 0, Math.PI * 2); mcx.stroke();
  }
  if (mission && ms) {                            // objective beacons blink teal over the fog
    for (const o of ms.objectives) {
      if (!o.active || o.done || !o.mark || tick % 40 >= 28) continue;
      mcx.strokeStyle = '#6fe3d0';
      mcx.lineWidth = 1.5;
      mcx.beginPath(); mcx.arc(o.mark[0] * sx, o.mark[1] * sy, 4, 0, Math.PI * 2); mcx.stroke();
    }
  }
  mcx.strokeStyle = 'rgba(255,255,255,0.7)';
  mcx.lineWidth = 1;
  mcx.strokeRect(cam.x * sx, cam.y * sy, view.w * sx, view.h * sy);
}

// ---------------- Main loop ----------------
function update() {
  if (devMode && teams[1]) teams[1].crystals = Math.max(teams[1].crystals, 99999);
  tick++;
  updateCamera();
  if (tick % 8 === 1) updateFog();

  for (const u of units) updateUnit(u);
  separation();
  for (const b of buildings) updateBuilding(b);
  updateBullets();
  updateFx();
  updateNukes();
  aiUpdate();
  waveUpdate();
  missionUpdate();

  const anyDead = units.some(u => u.hp <= 0) || buildings.some(b => b.hp <= 0);
  if (anyDead) {
    units = units.filter(u => u.hp > 0);
    buildings = buildings.filter(b => b.hp > 0);
    pruneSelection();
    checkEnd();
  }

  if (tick % 8 === 0) { refreshTopbar(); refreshCard(); refreshQueue(); }
  refreshProgressBar();
}

let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= 1000 / 60) {
    if (!started || paused || userPaused) { /* menu, controls, or pause — world waits */ }
    else if (!gameOver) update();
    else { tick++; updateFx(); updateCamera(); }   // aftermath keeps burning behind the overlay
    acc -= 1000 / 60;
  }
  render();
}

// ---------------- Mission engine ----------------
// mission = the static MISSIONS entry; ms = this run's cloned state, so specs
// stay pristine across restarts. All timing rides the sim tick, so pause and
// the help modal freeze dialogue and triggers along with the world.
let mission = null, ms = null;
const elObjectives = document.getElementById('objectives');
const elObjTitle = document.getElementById('obj-title');
const elObjList = document.getElementById('obj-list');
const elDialogue = document.getElementById('dialogue');
const elDlgName = document.getElementById('dlg-name');
const elDlgText = document.getElementById('dlg-text');
const elDlgPip = document.getElementById('dlg-pip');
const elDlgImg = document.getElementById('dlg-img');
const elDlgInit = document.getElementById('dlg-init');
const elDlgWave = document.getElementById('dlg-wave');
const CAMPAIGN_KEY = 'cc.campaign';
const campaignDone = () => parseInt(localStorage.getItem(CAMPAIGN_KEY) || '0', 10) || 0;

function missionInit(idx) {
  mission = MISSIONS[idx];
  preloadVoices(mission);
  ms = {
    idx,
    // reach objectives mark their own spot; anything else can set an explicit mark
    objectives: mission.objectives.map(o => ({
      ...o, done: false, active: !o.hidden,
      mark: o.mark || (o.type === 'reach' ? [o.x, o.y] : null),
    })),
    triggers: (mission.triggers || []).map(t => ({ ...t, fired: false, armedAt: -1 })),
    groups: {}, flags: {}, winAt: 0, outroDone: false,
  };
}

// Voice lines (optional, like sfx/portrait slots): drop
// assets/voice/<who>_<hash8>.mp3|ogg|wav and the line plays voiced; missing file
// = silent typewriter as before. Filenames come from voiceKey(who, text) — the
// hash covers speaker + text, so rewording a line correctly orphans its old clip.
// CC.exportVoiceScript() downloads the full studio script with filenames.
const VOICE_EXTS = ['mp3', 'ogg', 'wav'];
const VOICE_VOL = 0.9;
const voice = {};        // key -> loaded HTMLAudio
const voiceTried = {};   // key -> probe already issued
const voiceFailed = {};  // key -> probe settled with NO file (all exts 404'd)
function voiceKey(who, text) {
  const s = who + '|' + text;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return who + '_' + h.toString(16).padStart(8, '0');
}
function loadVoice(who, text) {
  const key = voiceKey(who, text);
  if (voiceTried[key]) return;
  voiceTried[key] = true;
  (function tryExt(i) {
    if (i >= VOICE_EXTS.length) { voiceFailed[key] = true; return; }
    const el = new Audio();
    el.preload = 'auto';
    el.oncanplaythrough = () => { if (!voice[key]) voice[key] = el; };
    el.onerror = () => tryExt(i + 1);
    el.src = 'assets/voice/' + key + '.' + VOICE_EXTS[i];
  })(0);
}
// probe every line a mission can speak, so clips are buffered before they fire
function preloadVoices(m) {
  for (const [w, t] of (m.brief || [])) loadVoice(w, t);
  for (const [w, t] of (m.intro || [])) loadVoice(w, t);
  for (const tr of (m.triggers || [])) for (const [w, t] of (tr.say || [])) loadVoice(w, t);
  for (const [w, t] of (m.outro || [])) loadVoice(w, t);
}
let voiceCur = null;
function playVoice(who, text) {
  stopVoice();
  const clip = voice[voiceKey(who, text)];
  if (!clip || muted) return null;
  clip.volume = VOICE_VOL;
  try { clip.currentTime = 0; clip.play().catch(() => { /* pre-gesture autoplay block */ }); } catch (e) { /* ignore */ }
  voiceCur = clip;
  return clip;
}
function stopVoice() {
  if (voiceCur) { try { voiceCur.pause(); } catch (e) { /* ignore */ } voiceCur = null; }
}
// pause/help freeze the sim tick, so dialogue timing stops — hold the audio with it
function syncVoicePause() {
  if (!voiceCur || voiceCur.ended) return;
  if (userPaused || paused) { try { voiceCur.pause(); } catch (e) {} }
  else { try { voiceCur.play().catch(() => {}); } catch (e) {} }
}
function exportVoiceScript() {
  const rows = [], seen = new Set();
  const add = (mi, ctx, who, text) => {
    const key = voiceKey(who, text);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push([mi + 1, ctx, CAST[who].name, key + '.mp3', text]);
  };
  MISSIONS.forEach((m, i) => {
    for (const [w, t] of (m.brief || [])) add(i, 'briefing', w, t);
    for (const [w, t] of (m.intro || [])) add(i, 'intro', w, t);
    for (const tr of (m.triggers || [])) for (const [w, t] of (tr.say || [])) add(i, 'trigger', w, t);
    for (const [w, t] of (m.outro || [])) add(i, 'outro', w, t);
  });
  const tsv = 'mission\tcontext\tspeaker\tfile\tline\n' + rows.map(r => r.join('\t')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([tsv], { type: 'text/tab-separated-values' }));
  a.download = 'voice-script.tsv';
  a.click();
  return rows.length + ' lines exported';
}

// dialogue: a queue of speaker lines, revealed typewriter-style on the sim tick.
// When lines back up (fast players out-build the script), the current line types
// faster and holds shorter so the commentary catches up instead of lagging.
let dlgQueue = [], dlgCur = null, dlgStart = 0, dlgUntil = 0, dlgHold = 0, dlgClipEnd = 0;
const dlgDur = (text) => Math.min(7 * 60, Math.floor((2.2 + text.length * 0.035) * 60));
function say(who, text) { dlgQueue.push({ who, text }); }
function dlgUpdate() {
  if (!dlgCur && dlgQueue.length) {
    // cold-load grace: if this line's clip probe is still in flight (fresh page,
    // slow network), hold up to 1s so the line starts voiced, not silent.
    // Unvoiced lines settle to voiceFailed almost instantly, so they don't wait.
    const peek = dlgQueue[0];
    loadVoice(peek.who, peek.text);   // no-op if already probed
    const vk = voiceKey(peek.who, peek.text);
    if (!voice[vk] && !voiceFailed[vk] && dlgHold < 60) { dlgHold++; return; }
    dlgHold = 0;
    dlgCur = dlgQueue.shift();
    dlgStart = tick; dlgUntil = tick + dlgDur(dlgCur.text);
    const c = CAST[dlgCur.who];
    elDlgName.textContent = c.name; elDlgName.style.color = c.color;
    elDlgText.textContent = '';
    elDlgPip.style.borderColor = c.color;
    elDlgWave.style.color = c.color;
    const art = PORTRAITS[dlgCur.who];
    if (art) {
      elDlgImg.src = art.src;
      elDlgImg.classList.remove('hidden'); elDlgInit.classList.add('hidden');
    } else {
      elDlgImg.classList.add('hidden'); elDlgInit.classList.remove('hidden');
      elDlgInit.textContent = c.init; elDlgInit.style.color = c.color;
    }
    elDialogue.classList.remove('hidden');
    elDialogue.classList.add('talking');
    // a voiced line holds the bar for the clip's length (metadata is in — the
    // clip only registers on canplaythrough); text pacing stays the floor
    dlgClipEnd = 0;
    const clip = playVoice(dlgCur.who, dlgCur.text);
    if (clip && isFinite(clip.duration) && clip.duration > 0) {
      dlgClipEnd = tick + Math.ceil(clip.duration * 60);
      dlgUntil = tick + Math.max(dlgDur(dlgCur.text), Math.ceil(clip.duration * 60) + 24);
    }
  }
  if (!dlgCur) return;
  const rush = dlgQueue.length > 0;
  const rate = rush ? 2.6 : 1.4;
  const chars = Math.floor((tick - dlgStart) * rate);
  if (chars <= dlgCur.text.length + 3) elDlgText.textContent = dlgCur.text.slice(0, chars);
  // rush-cut trims the post-line hold, NEVER a playing clip — a voiced line
  // always finishes speaking before the next one starts (playtest: Krauss got
  // cut off mid-sentence when Lin's line was queued behind his)
  const until = rush
    ? Math.max(dlgClipEnd + 12, Math.min(dlgUntil, dlgStart + Math.ceil(dlgCur.text.length / rate) + 60))
    : dlgUntil;
  if (tick >= until) {
    dlgCur = null;
    dlgClipEnd = 0;
    stopVoice();   // safety stop — the clip has already ended unless the line was skipped
    elDialogue.classList.remove('talking');
    if (!dlgQueue.length) elDialogue.classList.add('hidden');
  }
}

let lastObjSig = '';
function refreshObjectives() {
  if (!mission || !ms) { elObjectives.classList.add('hidden'); lastObjSig = ''; return; }
  const objs = ms.objectives.filter(o => o.active);
  const sig = objs.map(o => o.id + (o.done ? '1' : '0')).join(',');
  if (sig === lastObjSig) return;
  lastObjSig = sig;
  elObjTitle.textContent = `Mission ${ms.idx + 1} — ${mission.title}`;
  elObjList.innerHTML = objs.map(o =>
    `<div class="obj${o.done ? ' done' : ''}">${o.done ? '✔' : '◈'} ${o.text}</div>`).join('');
  elObjectives.classList.remove('hidden');
}

function objMet(o) {
  switch (o.type) {
    case 'unitCount': return units.filter(u => u.team === 1 && u.hp > 0 && u.type === o.unit).length >= o.count;
    case 'built': return buildings.filter(b => b.team === 1 && b.hp > 0 && b.type === o.bld && b.built >= 1).length >= o.count;
    case 'mined': return stats.mined >= o.amount;
    case 'reach': return units.some(u => u.team === 1 && u.hp > 0 && dist2(u.x, u.y, o.x, o.y) < o.r * o.r);
    case 'captive': return teams[1].captives >= o.count;
    // enough of a named group has made it to the marked spot (convoy escort)
    case 'groupReach': {
      const g = groupAlive(o.group) || [];
      return g.filter(u => dist2(u.x, u.y, o.x, o.y) < o.r * o.r).length >= o.count;
    }
    // no living hostile building of this type left near the mark (nest cracks)
    case 'destroy': return !buildings.some(b =>
      b.team !== 1 && b.hp > 0 && b.type === o.bld && dist2(b.x, b.y, o.x, o.y) < o.r * o.r);
    case 'flag': return !!ms.flags[o.id];
  }
  return false;
}
function condMet(w) {
  if (!w) return true;
  if (w.time != null && tick < w.time * 60) return false;
  if (w.done) for (const id of w.done) {
    const o = ms.objectives.find(o => o.id === id);
    if (!o || !o.done) return false;
  }
  if (w.notDone) for (const id of w.notDone) {
    const o = ms.objectives.find(o => o.id === id);
    if (o && o.done) return false;
  }
  // "no specimen in play" — guards respawn triggers while a rig is mid-haul
  if (w.noCaptive && units.some(u => u.team === 1 && u.captive)) return false;
  if (w.mined != null && stats.mined < w.mined) return false;
  if (w.groupDead) {
    const g = groupAlive(w.groupDead);
    if (!g || g.length) return false;
  }
  // too few of a group left alive (convoy attrition → mission failure)
  if (w.groupBelow) {
    const g = groupAlive(w.groupBelow[0]);
    if (!g || g.length >= w.groupBelow[1]) return false;
  }
  // any player unit near a point (route progress, ambush triggers)
  if (w.near && !units.some(u => u.team === 1 && u.hp > 0
      && dist2(u.x, u.y, w.near[0], w.near[1]) < w.near[2] * w.near[2])) return false;
  return true;
}
function activateObjective(id) {
  const o = ms.objectives.find(o => o.id === id);
  if (!o || o.active) return;
  o.active = true;
  toast('◈ New objective: ' + o.text); snd.ready();
}
function doSpawn(sp) {
  const ids = sp.group ? (ms.groups[sp.group] = ms.groups[sp.group] || []) : null;
  const hq = buildings.find(b => b.team === 1 && b.type === 'hq');
  if (sp.bld) {   // pre-built structures (outposts, survey posts, dino lairs)
    // dino structures come alive: dens get their door guard + hunt clock,
    // nests their brood — a bare makeBuilding would spawn them inert
    const b = sp.bld === 'den' ? makeDen(sp.at[0], sp.at[1])
      : sp.bld === 'nest' ? makeNest(sp.at[0], sp.at[1])
      : makeBuilding(sp.bld, sp.team || 1, sp.at[0], sp.at[1]);
    if (ids) ids.push(b.id);
    return;
  }
  for (let i = 0; i < sp.n; i++) {
    const u = makeUnit(sp.unit, sp.team || 3,
      clamp(sp.at[0] + (i % 3) * 30 - 30, 20, W - 20),
      clamp(sp.at[1] + ((i / 3) | 0) * 30 - i * 10, 20, H - 20));
    if (sp.order === 'attackhq' && hq) u.order = { type: 'attackmove', x: hq.x, y: hq.y };
    else if (sp.order === 'guard') u.order = { type: 'guard', hx: u.x, hy: u.y };
    else if (sp.to) u.order = { type: isCombat(u) ? 'attackmove' : 'move', x: sp.to[0], y: sp.to[1] };
    if (sp.specimen) u.specimen = true;   // protected: player weapons won't track it
    if (ids) ids.push(u.id);
  }
}
// living members of a spawn group (units and buildings both count)
function groupAlive(name) {
  const g = ms.groups[name];
  if (!g) return null;
  const out = [];
  for (const id of g) {
    const u = units.find(x => x.id === id && x.hp > 0) || buildings.find(x => x.id === id && x.hp > 0);
    if (u) out.push(u);
  }
  return out;
}
function fireTrigger(t) {
  if (t.say) for (const [who, line] of t.say) say(who, line);
  if (t.objective) for (const id of [].concat(t.objective)) activateObjective(id);
  if (t.complete) ms.flags[t.complete] = true;
  if (t.spawn) for (const sp of [].concat(t.spawn)) doSpawn(sp);
  if (t.alarm) { toast(t.alarm); snd.alarm(); }
  if (t.crystals) teams[1].crystals += t.crystals;
  if (t.lose) missionEnd(false);   // scripted defeat (convoy lost, etc.)
}

function missionUpdate() {
  if (!mission || gameOver) return;
  dlgUpdate();
  if (tick % 10 !== 0) return;
  for (const o of ms.objectives) {
    if (!o.active || o.done || !objMet(o)) continue;
    o.done = true;
    toast('✔ ' + o.text); snd.ready();
  }
  for (const t of ms.triggers) {
    if (t.fired) continue;
    if (t.armedAt < 0 && tick >= (t.coolUntil || 0) && condMet(t.when)) t.armedAt = tick;
    if (t.armedAt >= 0 && tick >= t.armedAt + (t.delay || 0) * 60) {
      if (t.repeat) {
        // repeatables re-verify at fire time — the world may have moved on.
        // `every` throttles periodic repeats (theater waves, harassers).
        t.armedAt = -1;
        t.coolUntil = tick + (t.every || 0) * 60;
        if (condMet(t.when)) fireTrigger(t);
      } else { t.fired = true; fireTrigger(t); }
    }
  }
  if (!ms.outroDone && mission.winWhen.every(id => {
    const o = ms.objectives.find(o => o.id === id);
    return o && o.done;
  })) {
    ms.outroDone = true;
    let wait = 150;   // headroom for per-line cold-load holds
    for (const [who, line] of (mission.outro || [])) {
      say(who, line);
      // a voiced line holds the bar for the clip, so the win timer must too —
      // otherwise MISSION COMPLETE lands mid-sentence (mirrors dlgUpdate)
      const clip = voice[voiceKey(who, line)];
      wait += (clip && isFinite(clip.duration) && clip.duration > 0)
        ? Math.max(dlgDur(line), Math.ceil(clip.duration * 60) + 24)
        : dlgDur(line);
    }
    ms.winAt = tick + wait;
  }
  // winAt is an estimate over the OUTRO lines only — if another trigger's
  // dialogue was already queued when the last objective completed, the outro
  // starts late. The drain guard makes it exact: never drop MISSION COMPLETE
  // while anyone is still talking (missionEnd freezes dlgUpdate mid-line).
  if (ms.outroDone && ms.winAt && tick >= ms.winAt && !dlgCur && !dlgQueue.length) missionEnd(true);
  refreshObjectives();
}

function missionEnd(win) {
  if (gameOver) return;
  gameOver = win ? 'win' : 'lose';
  if (win) localStorage.setItem(CAMPAIGN_KEY, String(Math.max(campaignDone(), ms.idx + 1)));
  overlayTimer = setTimeout(() => {
    elOvTitle.textContent = win ? 'MISSION COMPLETE' : 'MISSION FAILED';
    elOvTitle.className = win ? 'win' : 'lose';
    elOvSub.textContent = (win ? mission.winText : mission.loseText) || '';
    overlayStats();
    document.getElementById('btn-again').textContent = win ? '▶ Continue' : '↻ Back to base';
    elOverlay.classList.remove('hidden');
    beep(win ? 520 : 220, 0.5, 'sine', 0.06, win ? 1040 : 80);
  }, win ? 600 : 1400);
}

// ---------------- Store / entitlements ----------------
// One owns() API with per-platform backends (BROODFALL-BRIEF item 3):
//  - Mac App Store wrapper: webkit.messageHandlers.bfstore bridges to StoreKit 2
//    (mac/Broodfall/StoreBridge.swift); state arrives via BFStore._update().
//  - web / file:// (no bridge): everything unlocked — GitHub Pages stays the
//    free playtest build. Steam later plugs in as its own backend here.
// Free tier (locked 2026-07-23): first FREE_MISSIONS campaign missions and the
// FREE_MAPS skirmish maps; one non-consumable purchase unlocks the rest.
const FREE_MISSIONS = 3;
const FREE_MAPS = ['basin'];
const BFStore = (() => {
  const native = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bfstore);
  // In the wrapper, fail CLOSED until StoreKit answers — a paywall that flashes
  // open is a refund ticket; one that flashes shut is a beat of patience.
  let state = { owned: !native, price: null, debug: false, busy: false };
  const post = (msg) => { try { window.webkit.messageHandlers.bfstore.postMessage(msg); } catch (e) { /* bridge gone */ } };
  if (native) post({ cmd: 'state' });
  return {
    native,
    owns() { return state.owned; },
    // dev cheats live only where there is no paywall (web) or no customer (DEBUG builds)
    devAllowed() { return !native || state.debug; },
    get price() { return state.price; },
    get busy() { return state.busy; },
    buy() { if (native && !state.owned && !state.busy) { state.busy = true; post({ cmd: 'buy' }); renderMenu(); } },
    restore() { if (native && !state.busy) { state.busy = true; post({ cmd: 'restore' }); renderMenu(); } },
    _update(s) {
      const hadIt = state.owned;
      state = { ...state, ...s, busy: false };
      if (s.error) toast('⚠ ' + s.error);
      else if (state.owned && !hadIt) toast('💎 Full game unlocked — every mission, every map. Good hunting, commander.');
      if (!started) renderMenu();
    },
  };
})();
const missionPaywalled = (i) => i >= FREE_MISSIONS && !BFStore.owns();
const mapPaywalled = (k) => !FREE_MAPS.includes(k) && !BFStore.owns();
function storeNudge() {
  toast(`🔒 That's part of the full game — one purchase (${BFStore.price || '$9.99'}) unlocks everything, forever.`);
  const el = document.getElementById('menu-store');
  el.classList.remove('nudge');
  void el.offsetWidth;   // restart the shake animation
  el.classList.add('nudge');
}
function renderStoreStrip() {
  const el = document.getElementById('menu-store');
  if (!BFStore.native || BFStore.owns()) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  if (BFStore.busy) {
    el.innerHTML = '<div class="store-note">Contacting the App Store…</div>';
    return;
  }
  el.innerHTML =
    `<button id="btn-buy">💎 Unlock the full game — ${BFStore.price || '$9.99'}</button>` +
    '<div class="store-sub">Every campaign mission — including the free story updates — and every skirmish map. One purchase, no ads, ever.</div>' +
    '<button id="btn-restore">Restore purchase</button>';
  document.getElementById('btn-buy').onclick = () => { audioInit(); BFStore.buy(); };
  document.getElementById('btn-restore').onclick = () => { audioInit(); BFStore.restore(); };
}

// ---------------- Start menu ----------------
let started = false;
const elMenu = document.getElementById('menu');
let chosenMap = localStorage.getItem('cc.map') || 'basin';
let chosenDiff = localStorage.getItem('cc.diff') || 'normal';
if (!MAPS[chosenMap]) chosenMap = 'basin';
if (!DIFFS[chosenDiff]) chosenDiff = 'normal';

function menuButtons(el, table, chosen, pick, lockedFn) {
  el.innerHTML = '';
  for (const key in table) {
    const locked = lockedFn ? lockedFn(key) : false;
    const b = document.createElement('button');
    b.className = 'opt' + (key === chosen ? ' sel' : '') + (locked ? ' opt-locked' : '');
    b.innerHTML = `<b>${locked ? '🔒 ' : ''}${table[key].label}</b><span>${table[key].desc}</span>`;
    b.onclick = () => { audioInit(); if (locked) { storeNudge(); return; } pick(key); };
    el.appendChild(b);
  }
}
const MENU_MODES = {
  skirmish: { label: 'Skirmish', desc: 'One map, one enemy, no script. Pick your battlefield.' },
  campaign: { label: 'Campaign', desc: 'The story of the expedition, one mission at a time.' },
};
let chosenMode = localStorage.getItem('cc.mode') || 'skirmish';
if (!MENU_MODES[chosenMode]) chosenMode = 'skirmish';
function renderMenu() {
  menuButtons(document.getElementById('menu-modes'), MENU_MODES, chosenMode, k => {
    chosenMode = k; localStorage.setItem('cc.mode', k); renderMenu();
  });
  document.getElementById('menu-skirmish').classList.toggle('hidden', chosenMode !== 'skirmish');
  document.getElementById('menu-campaign').classList.toggle('hidden', chosenMode !== 'campaign');
  if (chosenMode === 'skirmish') {
    // a remembered pick from an unlocked build must not smuggle a locked map past the gate
    if (mapPaywalled(chosenMap)) chosenMap = FREE_MAPS[0];
    menuButtons(document.getElementById('menu-maps'), MAPS, chosenMap, k => { chosenMap = k; renderMenu(); }, mapPaywalled);
    menuButtons(document.getElementById('menu-diffs'), DIFFS, chosenDiff, k => { chosenDiff = k; renderMenu(); });
  } else {
    renderMissionList();
  }
  renderStoreStrip();
}
function renderMissionList() {
  const el = document.getElementById('menu-missions');
  el.innerHTML = '';
  const doneN = campaignDone();
  MISSIONS.forEach((m, i) => {
    const paywalled = missionPaywalled(i);
    const locked = i > doneN || paywalled;
    const b = document.createElement('button');
    b.className = 'mrow' + (locked ? ' locked' : '');
    b.innerHTML =
      `<span class="mnum">${String(i + 1).padStart(2, '0')}</span>` +
      `<span class="mtitle"><b>${m.title}</b><span>${m.act}</span></span>` +
      `<span class="mstat">${paywalled ? '💎' : locked ? '🔒' : i < doneN ? '✔' : '▶'}</span>`;
    if (!locked) b.onclick = () => { audioInit(); openBriefing(i); };
    else if (paywalled) { b.onclick = () => { audioInit(); storeNudge(); }; b.style.cursor = 'pointer'; }
    el.appendChild(b);
  });
}

// ---------------- Briefing screen ----------------
const elBriefing = document.getElementById('briefing');
let briefIdx = null, briefTimer = null;
function briefLineHtml(who, text) {
  const c = CAST[who];
  return `<p><b style="color:${c.color}">${c.name}</b><span>${text}</span></p>`;
}
function openBriefing(idx) {
  briefIdx = idx;
  const m = MISSIONS[idx];
  preloadVoices(m);
  document.getElementById('brief-kicker').textContent = `${m.act} · Mission ${idx + 1}`;
  document.getElementById('brief-title').textContent = m.title;
  document.getElementById('brief-objs').innerHTML =
    m.objectives.filter(o => !o.hidden).map(o => `<li>${o.text}</li>`).join('');
  // typewriter reveal, one line at a time; click the text to skip ahead.
  // A voiced line holds the next line until its clip ends (a blocked/missing
  // clip is paused, so it can never wedge the reveal).
  const box = document.getElementById('brief-lines');
  box.innerHTML = '';
  clearInterval(briefTimer);
  let li = 0, ci = 0, span = null, briefClip = null, briefHold = 0;
  briefTimer = setInterval(() => {
    if (li >= m.brief.length) {
      if (briefClip && !briefClip.paused) return;
      clearInterval(briefTimer); briefTimer = null; return;
    }
    const [who, text] = m.brief[li];
    if (!span) {
      if (briefClip && !briefClip.paused) return;   // let the previous line finish speaking
      // cold-load grace: on a fresh page the clip probe may still be in flight —
      // hold this line up to ~1.5s for it (settled misses skip straight through)
      const vk = voiceKey(who, text);
      if (!voice[vk] && !voiceFailed[vk] && ++briefHold < 90) return;
      briefHold = 0;
      const c = CAST[who];
      const p = document.createElement('p');
      const name = document.createElement('b');
      name.textContent = c.name; name.style.color = c.color;
      span = document.createElement('span');
      p.appendChild(name); p.appendChild(span); box.appendChild(p);
      briefClip = playVoice(who, text);
    }
    ci += 2;
    span.textContent = text.slice(0, ci);
    if (ci >= text.length) { li++; ci = 0; span = null; }
  }, 16);
  box.onclick = () => {
    clearInterval(briefTimer); briefTimer = null;
    stopVoice();
    box.innerHTML = m.brief.map(([who, text]) => briefLineHtml(who, text)).join('');
  };
  elBriefing.classList.remove('hidden');
}
function closeBriefing() {
  clearInterval(briefTimer); briefTimer = null;
  stopVoice();
  elBriefing.classList.add('hidden');
}
document.getElementById('btn-brief-back').addEventListener('click', () => { audioInit(); closeBriefing(); });
document.getElementById('btn-deploy').addEventListener('click', () => {
  audioInit();
  const idx = briefIdx;
  closeBriefing();
  startMission(idx);
});
// wipe the world so startGame can never stack two setups (also enables restarts)
function resetWorld() {
  units = []; buildings = []; crystals = []; bullets = []; fxs = []; eggs = []; alerts = []; rocks = [];
  nukes = []; nukeTargeting = null;
  blocked.fill(0);
  lastAlert = -1e9;
  stats = { built: 0, lost: 0, kills: 0, mined: 0 };
  selection = [];
  for (const k in groups) delete groups[k];
  teams[1] = { crystals: 180, eggs: 0, captives: 0, up: newUp() };
  teams[2] = { crystals: 180, eggs: 0, captives: 0, up: newUp() };
  teams[3] = { crystals: 0, eggs: 0, captives: 0, up: newUp() };
  tick = 0; gameOver = null; waveNum = 0; shakeAmp = 0;
  placing = null; attackMoveMode = false; setCursor();
  explored.fill(0); visible.fill(0);
  elOverlay.classList.add('hidden');
  clearTimeout(overlayTimer); overlayTimer = null;
  lastCardSig = '';
  mission = null; ms = null;
  wasLowPower = false; lastAvail = null; dinoRage = 0; wildSeen = false;
  dlgQueue = []; dlgCur = null; dlgHold = 0; dlgClipEnd = 0;
  stopVoice();
  elDialogue.classList.add('hidden');
  elDialogue.classList.remove('talking');
  refreshObjectives();
}
function startGame(mapKey, diffKey, missionIdx) {
  // paywall backstop — the menu shouldn't get here, but console calls can
  if (missionIdx == null && mapPaywalled(mapKey)) { storeNudge(); return; }
  resetWorld();
  if (missionIdx != null) missionInit(missionIdx);
  diff = DIFFS[diffKey] || DIFFS.normal;
  waveAt = diff.firstWave * 60;
  setup(mapKey);
  started = true;
  userPaused = false;
  elPauseBanner.classList.add('hidden');
  btnPause.textContent = '⏸ pause';
  elMenu.classList.add('hidden');
  refreshTopbar();
  refreshCard();
  refreshQueue();
  setHelp(true);   // show the controls first — closing them starts the clock
  if (mission) {
    for (const [who, line] of (mission.intro || [])) say(who, line);
    refreshObjectives();
  } else {
    toast('Your harvesters are mining. Select the Barracks and press Q to train Marines!');
  }
}
function startMission(idx) {
  const m = MISSIONS[idx];
  if (!m) return;
  if (missionPaywalled(idx)) { storeNudge(); return; }   // paywall backstop (CC/console path)
  startGame(m.map, m.diff || 'normal', idx);
}
renderMenu();
document.getElementById('btn-start').addEventListener('click', () => {
  audioInit();
  localStorage.setItem('cc.map', chosenMap);
  localStorage.setItem('cc.diff', chosenDiff);
  startGame(chosenMap, chosenDiff);
});
// end-of-match button: skirmish restarts fresh; campaign returns to the mission list
document.getElementById('btn-again').addEventListener('click', () => {
  if (!mission) { location.reload(); return; }
  audioInit();
  chosenMode = 'campaign'; localStorage.setItem('cc.mode', 'campaign');
  quitToMenu();
});

// ---- dev mode: hover the "?  controls" chip and tap Space five times ----
// Toggles free tech + bottomless crystals + full campaign unlock, for skipping
// ahead in playtests. Works at the menu too; same gesture switches it back off.
let devHover = false, devTaps = 0, devTapAt = 0;
const devChip = document.getElementById('btn-help');
devChip.addEventListener('mouseenter', () => { devHover = true; devTaps = 0; });
devChip.addEventListener('mouseleave', () => { devHover = false; devTaps = 0; });
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || !devHover) return;
  e.preventDefault();
  const now = performance.now();
  if (now - devTapAt > 2500) devTaps = 0;   // taps must come in one burst
  devTapAt = now;
  if (++devTaps < 5) return;
  devTaps = 0;
  // App Store release builds: cheats stay off — free tech + a fully open
  // campaign would be a paywall bypass. DEBUG wrapper builds re-enable them.
  if (!BFStore.devAllowed()) { toast('🛠 Dev mode is disabled in this build.'); return; }
  devMode = !devMode;
  devChip.style.borderColor = devMode ? 'rgba(240,200,106,0.8)' : '';
  devChip.style.color = devMode ? '#f0c86a' : '';
  lastAvail = null;   // rebaseline the build menu silently (no unlock-toast burst)
  if (devMode) {
    // back up real progress before unlocking — dev mode must never eat the save
    if (localStorage.getItem(CAMPAIGN_KEY + '.bak') === null) {
      localStorage.setItem(CAMPAIGN_KEY + '.bak', localStorage.getItem(CAMPAIGN_KEY) || '0');
    }
    localStorage.setItem(CAMPAIGN_KEY, String(MISSIONS.length));   // every mission open
    if (!started) renderMenu();
    if (teams[1]) teams[1].crystals = Math.max(teams[1].crystals, 99999);
    toast('🛠 DEV MODE — free tech, bottomless crystals, campaign unlocked');
  } else {
    const bak = localStorage.getItem(CAMPAIGN_KEY + '.bak');
    if (bak !== null) {
      localStorage.setItem(CAMPAIGN_KEY, bak);
      localStorage.removeItem(CAMPAIGN_KEY + '.bak');
      if (!started) renderMenu();
    }
    toast('🛠 Dev mode off — tech, wallet, and campaign progress back to normal');
  }
  snd.ready();
});

requestAnimationFrame(frame);

// debug handle (used for automated testing; harmless to leave in)
window.CC = {
  elevAt,
  get units() { return units; },
  get buildings() { return buildings; },
  get crystals() { return crystals; },
  get eggs() { return eggs; },
  get rocks() { return rocks; },
  get stats() { return stats; },
  get teams() { return teams; },
  get tick() { return tick; },
  get selection() { return selection; },
  set selection(s) { selection = s; },
  get waveAt() { return waveAt; },
  set waveAt(v) { waveAt = v; },
  get gameOver() { return gameOver; },
  get fog() { return { visible, explored }; },
  get fogMemory() { return fogMemory; },
  get devReveal() { return devReveal; },
  set devReveal(v) { devReveal = !!v; updateFog(); },
  get devMode() { return devMode; },
  set devMode(v) { if (BFStore.devAllowed()) devMode = !!v; },
  get fxs() { return fxs; },
  get spritesReady() { return spritesReady; },
  isVisibleAt, isExploredAt, isShownAt, updateFog, toggleFogMemory,
  damage, trainUnit, commandMove, fxExplosion,
  canPlaceBuilding, tryPlaceBuilding, makeBuilding, makeUnit, makeNest, makeDen, spawnRaptor, makeEgg, startResearch,
  hatchSpitter, rankOf, startGame, MAPS, DIFFS,
  startMission, MISSIONS, CAST,
  exportVoiceScript, voiceKey, voice, PORTRAITS,
  get mission() { return mission; },
  get missionState() { return ms; },
  unlockAll() { if (!BFStore.devAllowed()) return; localStorage.setItem(CAMPAIGN_KEY, String(MISSIONS.length)); renderMenu(); },
  buyNuke, launchNuke, unloadAPC, NUKE,
  get nukes() { return nukes; },
  get started() { return started; },
  get diff() { return diff; },
  // run n game ticks synchronously — lets automated tests advance the sim even
  // when the tab is backgrounded and requestAnimationFrame is asleep
  step(n) { for (let i = 0; i < (n || 1) && !gameOver; i++) update(); },
};
