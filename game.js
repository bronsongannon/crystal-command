'use strict';
/* ============================================================
   CRYSTAL COMMAND — a tiny real-time strategy game
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

// ---------------- World ----------------
const TILE = 32, MAP_W = 64, MAP_H = 48;
const W = MAP_W * TILE, H = MAP_H * TILE;      // 2048 x 1536 world px
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
  raider:    { label: 'Raider',    cost: 150, supply: 1, hp: 155, speed: 3.0,  r: 11, dmg: 7,  range: 100, cooldown: 20,  buildTime: 6 * 60,  sight: 240 },
  tank:      { label: 'Tank',      cost: 220, supply: 2, hp: 280, speed: 1.25, r: 14, dmg: 34, range: 155, cooldown: 95,  buildTime: 10 * 60, sight: 210, noAA: 1 },
  // Air. Fast harasser that flies over everything; helpless targets: tanks,
  // artillery, workers. Countered by marines/snipers/raiders/spitters/turrets.
  gunship:   { label: 'Gunship',   cost: 240, supply: 2, hp: 150, speed: 3.2,  r: 12, dmg: 10, range: 130, cooldown: 18,  buildTime: 11 * 60, sight: 260, fly: 1 },
  // Siege piece. Shells fly to where the target WAS (no homing) and splash on
  // impact — devastating vs buildings/nests, whiffs vs anything fast. Can't
  // fire inside minRange, and sight < range means it wants spotters.
  artillery: { label: 'Artillery', cost: 270, supply: 2, hp: 110, speed: 0.95, r: 13, dmg: 55, range: 300, minRange: 90, cooldown: 170, buildTime: 12 * 60, sight: 230, splash: 40, bldBonus: 1.5, noAA: 1 },
  // Native wildlife (team 3) — but also hatchable by the player from captured
  // eggs. Cost 0 because nobody buys them with crystals; supply only bites for
  // player-owned ones (supplyUsed is per-team; wild team-3 dinos aren't counted).
  spitter:   { label: 'Spitter',   cost: 0,   supply: 1, hp: 95,  speed: 2.1,  r: 10, dmg: 11, range: 115, cooldown: 44,  buildTime: 0, sight: 200 },
};
const BLD = {
  hq:       { label: 'Headquarters', hp: 2200, w: 96, h: 96, supply: 20, sight: 300, trains: ['harvester', 'engineer'] },
  barracks: { label: 'Barracks',     hp: 1100, w: 78, h: 78, supply: 4,  sight: 250, trains: ['marine', 'sniper'],  cost: 150, buildTime: 13 * 60 },
  factory:  { label: 'Factory',      hp: 1000, w: 88, h: 72, supply: 4,  sight: 220, trains: ['raider', 'tank', 'artillery'], cost: 200, buildTime: 15 * 60 },
  supply:   { label: 'Supply Depot', hp: 500,  w: 56, h: 56, supply: 8,  sight: 180, cost: 100, buildTime: 10 * 60 },
  refinery: { label: 'Refinery',     hp: 700,  w: 70, h: 70, supply: 0,  sight: 240, cost: 175, buildTime: 12 * 60 },
  airpad:   { label: 'Airpad',       hp: 600,  w: 62, h: 62, supply: 2,  sight: 220, trains: ['gunship'], cost: 175, buildTime: 12 * 60 },
  turret:   { label: 'Turret',       hp: 450,  w: 40, h: 40, supply: 0,  sight: 260, dmg: 15, range: 200, cooldown: 42, cost: 140, buildTime: 8 * 60 },
  // Dino nest (team 3): guards a rich crystal patch and respawns spitters
  // until it's destroyed. Clear it or mine poor — the expansion gatekeeper.
  nest:     { label: 'Dino Nest',    hp: 850,  w: 64, h: 64, supply: 0,  sight: 200 },
};
const NEST_BROOD = 3;          // spitters alive per nest
const NEST_RESPAWN = 7 * 60;   // one replacement every 7s
const NEST_LEASH = 360;        // guards give up the chase past this radius from home
const NEST_EGGS = 3;           // eggs left in the rubble when a nest dies
const SPITTER_CAP = 5;         // max hatched spitters a side can field at once

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
      { p: [W / 2, H / 2 - 200], n: 8, a: 2200, nests: [[W / 2 + 110, H / 2 - 290]] },
      { p: [W / 2, H / 2 + 200], n: 8, a: 2200, nests: [[W / 2 - 110, H / 2 + 290]] },
    ],
  },
  gauntlet: {
    label: 'The Gauntlet',
    desc: 'Bases face off across a nest-choked center column. Win the middle, win the game.',
    pHQ: [230, H / 2 + 40], pRax: [420, H / 2 + 150], pPatch: [270, H / 2 - 240],
    eHQ: [W - 230, H / 2 - 40], eRax: [W - 420, H / 2 - 150], eFac: [W - 580, H / 2 + 10],
    eSup: [[W - 260, H / 2 + 200], [W - 160, H / 2 - 260]], eTur: [[W - 430, H / 2 + 110], [W - 430, H / 2 - 200]],
    eAir: [W - 620, H / 2 + 170],
    ePatch: [W - 270, H / 2 + 240],
    patches: [
      { p: [W / 2, 260], n: 8, a: 2200, nests: [[W / 2 + 100, 170]] },
      { p: [W / 2, H / 2], n: 9, a: 2600, nests: [[W / 2 - 120, H / 2 - 90]] },
      { p: [W / 2, H - 260], n: 8, a: 2200, nests: [[W / 2 + 100, H - 170]] },
    ],
  },
  valley: {
    label: 'Fossil Valley',
    desc: 'Quiet corner expansions — and a mega-field dead center under double nest guard.',
    pHQ: [W - 210, H - 210], pRax: [W - 400, H - 140], pPatch: [W - 260, H - 440],
    eHQ: [210, 210], eRax: [400, 140], eFac: [560, 200],
    eSup: [[300, 100], [150, 340]], eTur: [[350, 330], [480, 220]],
    eAir: [660, 300],
    ePatch: [260, 440],
    patches: [
      { p: [W - 320, 320], n: 6, a: 1800, nests: [[W - 440, 250]] },
      { p: [320, H - 320], n: 6, a: 1800, nests: [[440, H - 250]] },
      { p: [W / 2, H / 2], n: 10, a: 3000, nests: [[W / 2 - 130, H / 2 - 110], [W / 2 + 130, H / 2 + 110]] },
    ],
  },
};

// ---------------- Difficulty ----------------
// All knobs the AI cares about; 'normal' is the pre-difficulty baseline.
const DIFFS = {
  easy:   { label: 'Easy',   desc: 'Slower assaults, lazier enemy economy. Learn the ropes.',
            firstWave: 150, waveEvery: 1.4, capRate: 1.2, trickle: 0.55, aiUpgrades: false },
  normal: { label: 'Normal', desc: 'The intended fight.',
            firstWave: 100, waveEvery: 1.0, capRate: 2.0, trickle: 1.0, aiUpgrades: true },
  hard:   { label: 'Hard',   desc: 'Early pressure, relentless waves, a rich enemy. Good luck.',
            firstWave: 75,  waveEvery: 0.75, capRate: 3.0, trickle: 1.7, aiUpgrades: true },
};
let diff = DIFFS.normal;
// Research, StarCraft-style: bought at the producing building, occupies its queue.
// Levels live on teams[t].up; effects applied via weaponMult/armorMult/carryCap/effSpeed.
const UPG = {
  infWeapons: { label: 'Infantry Weapons', at: 'barracks', max: 3, cost: [100, 175, 250], time: [20 * 60, 25 * 60, 30 * 60] },
  infArmor:   { label: 'Infantry Armor',   at: 'barracks', max: 3, cost: [100, 175, 250], time: [20 * 60, 25 * 60, 30 * 60] },
  vehWeapons: { label: 'Vehicle Weapons',  at: 'factory',  max: 3, cost: [125, 200, 275], time: [22 * 60, 27 * 60, 32 * 60] },
  vehArmor:   { label: 'Vehicle Armor',    at: 'factory',  max: 3, cost: [125, 200, 275], time: [22 * 60, 27 * 60, 32 * 60] },
  harvest:    { label: 'Harvester Systems', at: 'hq',      max: 3, cost: [125, 200, 275], time: [20 * 60, 25 * 60, 30 * 60] },
};
const IS_INF = { marine: 1, sniper: 1, engineer: 1 };
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
const BUILD_MENU = [['turret', 'T'], ['barracks', 'B'], ['factory', 'V'], ['supply', 'C'], ['refinery', 'G'], ['airpad', 'X']];
const COLORS = {
  1: { main: '#3fb9c9', dark: '#1e6570', light: '#9fe8ef' },
  2: { main: '#e0564a', dark: '#7c2a24', light: '#f5a89a' },
  3: { main: '#8fc94a', dark: '#48661f', light: '#d6f0a0' },   // dinos: acid green
};
const CRYSTAL_COLOR = '#6fe3d0';

// ---------------- State ----------------
let nextId = 1;
let units = [], buildings = [], crystals = [], bullets = [], fxs = [], eggs = [];
const newUp = () => ({ infWeapons: 0, infArmor: 0, vehWeapons: 0, vehArmor: 0, harvest: 0 });
// team 3 = neutral dinos — no economy, but weaponMult/armorMult index into it
const teams = {
  1: { crystals: 180, eggs: 0, up: newUp() },
  2: { crystals: 180, eggs: 0, up: newUp() },
  3: { crystals: 0, eggs: 0, up: newUp() },
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
const isCombat = (u) => u.type !== 'harvester' && u.type !== 'engineer';

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

// team-color tinted copies, built once per (sprite, team) on first use
const tintCache = new Map();
function teamSprite(img, team) {
  const key = img.src + '|' + team;
  let c = tintCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'multiply';          // team color, keeps shading
    g.fillStyle = COLORS[team].main;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';    // restore transparency
    g.drawImage(img, 0, 0);
    tintCache.set(key, c);
  }
  return c;
}

// distance from unit/building center to the muzzle tip of its drawn barrel
const MUZZLE_LEN = { marine: 15, sniper: 24, raider: 17, tank: 22, artillery: 28, gunship: 13, turret: 22, engineer: 11, harvester: 12 };
const FX_CAP = 450;

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

function stampVision(x, y, r) {
  const cx0 = Math.floor(x / TILE), cy0 = Math.floor(y / TILE);
  const cr = Math.ceil(r / TILE), r2 = r * r;
  for (let gy = Math.max(0, cy0 - cr); gy <= Math.min(fogH - 1, cy0 + cr); gy++) {
    for (let gx = Math.max(0, cx0 - cr); gx <= Math.min(fogW - 1, cx0 + cr); gx++) {
      const dx = (gx + 0.5) * TILE - x, dy = (gy + 0.5) * TILE - y;
      if (dx * dx + dy * dy <= r2) { const i = gy * fogW + gx; visible[i] = 1; explored[i] = 1; }
    }
  }
}
let devReveal = false;   // dev mode: the whole map, no fog — for judging layouts
function updateFog() {
  if (devReveal) {
    visible.fill(1); explored.fill(1);
    const d = fogImg.data;
    for (let i = 0; i < visible.length; i++) d[i * 4 + 3] = 0;
    fogCx.putImageData(fogImg, 0, 0);
    return;
  }
  visible.fill(0);
  for (const u of units) if (u.team === 1) stampVision(u.x, u.y, UNIT[u.type].sight);
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
const snd = {
  shot()    { if (tick - lastShotSound < 4) return; lastShotSound = tick; beep(880, 0.05, 'square', 0.018); },
  shell()   { if (tick - lastShotSound < 4) return; lastShotSound = tick; beep(170, 0.16, 'sawtooth', 0.05, 60); },
  thump()   { if (tick - lastShotSound < 4) return; lastShotSound = tick; beep(90, 0.24, 'sawtooth', 0.07, 30); },
  spit()    { if (tick - lastShotSound < 4) return; lastShotSound = tick; beep(340, 0.09, 'triangle', 0.035, 120); },
  snipe()   { if (tick - lastShotSound < 4) return; lastShotSound = tick; beep(1600, 0.09, 'square', 0.03, 220); },
  boom()    { beep(95, 0.32, 'sawtooth', 0.07, 28); },
  deposit() { beep(1240, 0.07, 'sine', 0.035); },
  repair()  { beep(760, 0.05, 'triangle', 0.03, 980); },
  ready()   { beep(620, 0.07, 'sine', 0.045); setTimeout(() => beep(880, 0.09, 'sine', 0.045), 80); },
  error()   { beep(170, 0.11, 'square', 0.045); },
  alarm()   { beep(520, 0.14, 'square', 0.06, 320); setTimeout(() => beep(520, 0.14, 'square', 0.06, 320), 200); },
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
    kills: 0, eggCarry: false, fly: !!d.fly,
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

// place one team's base from a map spec; returns its HQ
function placeBase(team, M) {
  const p = team === 1;
  const hq = makeBuilding('hq', team, ...(p ? M.pHQ : M.eHQ));
  makeBuilding('barracks', team, ...(p ? M.pRax : M.eRax));
  if (!p) {
    makeBuilding('factory', 2, ...M.eFac);
    makeBuilding('airpad', 2, ...M.eAir);
    for (const s of M.eSup) makeBuilding('supply', 2, ...s);
    for (const t of M.eTur) makeBuilding('turret', 2, ...t);
  }
  const patch = addPatch(...(p ? M.pPatch : M.ePatch), 7, 1400);
  hq.rally = { x: patch[0].x, y: patch[0].y };               // fresh harvesters auto-mine
  for (let i = 0; i < 3; i++) {
    // string the starting harvesters out along the HQ→patch line
    const t = 0.5 + i * 0.12;
    const u = makeUnit('harvester', team,
      hq.x + (patch[0].x - hq.x) * t, hq.y + (patch[0].y - hq.y) * t);
    u.order = { type: 'harvest', target: patch[i % patch.length] };
  }
  // two starter marines, posted toward the middle of the map
  const a = Math.atan2(H / 2 - hq.y, W / 2 - hq.x);
  makeUnit('marine', team, hq.x + Math.cos(a) * 135, hq.y + Math.sin(a) * 135);
  makeUnit('marine', team, hq.x + Math.cos(a) * 165 + 22, hq.y + Math.sin(a) * 165 - 20);
  return hq;
}

function setup(mapKey) {
  const M = MAPS[mapKey] || MAPS.basin;
  const pHQ = placeBase(1, M);
  placeBase(2, M);

  // neutral fields + their nest guards — clear the nest or mine poor
  for (const spec of M.patches) {
    addPatch(spec.p[0], spec.p[1], spec.n, spec.a);
    for (const nx of (spec.nests || [])) makeNest(nx[0], nx[1]);
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
  for (const u of units) if (u.team === team) s += UNIT[u.type].supply;
  return s;
}
function supplyMax(team) {
  let s = 0;
  for (const b of buildings) if (b.team === team && b.built >= 1) s += BLD[b.type].supply;
  return Math.min(SUPPLY_HARD_CAP, s);
}
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
  let best = null, bd = 1e18;
  for (const b of buildings) {
    if (b.team !== team || b.built < 1 || (b.type !== 'hq' && b.type !== 'refinery')) continue;
    const d = dist2(x, y, b.x, b.y);
    if (d < bd) { bd = d; best = b; }
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
function nearestEnemyUnit(x, y, team, range, aa) {
  let best = null, bd = 1e18;
  for (const u of units) {
    if (u.team === team) continue;
    if (aa === false && UNIT[u.type].fly) continue;       // gun can't elevate — skip flyers
    if (team === 1 && !isVisibleAt(u.x, u.y)) continue;   // player can't target into the fog
    const d = dist(x, y, u.x, u.y) - u.r;
    if (d <= range && d * d < bd) { bd = d * d; best = u; }
  }
  return best;
}
function nearestEnemyBuilding(x, y, team, range) {
  let best = null, bd = 1e18;
  for (const b of buildings) {
    if (b.team === team) continue;
    if (team === 1 && !isVisibleAt(b.x, b.y)) continue;
    const d = dist(x, y, b.x, b.y) - b.r;
    if (d <= range && d * d < bd) { bd = d * d; best = b; }
  }
  return best;
}
function acquireTarget(x, y, team, range, attacker) {
  const aa = attacker ? canAA(attacker) : true;
  return nearestEnemyUnit(x, y, team, range, aa) || nearestEnemyBuilding(x, y, team, range);
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
    e.order = { type: 'attack', target, resume: null };
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
  if (b.prog < queueTime(b.team, item)) { b.prog += b.boost; return; }
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

// ---------------- Combat ----------------
function fire(src, target) {
  src.cool = src.cooldown;
  src.faceA = Math.atan2(target.y - src.y, target.x - src.x);
  const kind = src.type === 'artillery' ? 'arc' : src.type === 'tank' ? 'shell'
    : src.type === 'sniper' ? 'snipe' : src.type === 'spitter' ? 'spit' : 'bolt';
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
    bullets.push({
      x: sx, y: sy, tx: target.x, ty: target.y,
      target, dmg: src.dmg * weaponMult(src), team: src.team, src,
      speed: kind === 'shell' ? 6.5 : kind === 'snipe' ? 13 : kind === 'spit' ? 6 : 9,
      kind,
    });
  }
  if (kind !== 'spit') fxMuzzle(src, kind === 'arc' ? 'shell' : kind);   // no muzzle flash from a mouth
  if (src.team === 1 || Math.random() < 0.4) {
    if (kind === 'arc') snd.thump();
    else if (kind === 'shell') snd.shell(); else if (kind === 'snipe') snd.snipe();
    else if (kind === 'spit') snd.spit(); else snd.shot();
  }
}
function damage(e, d, src) {
  d *= armorMult(e);
  if (e.kind === 'unit' && e.order.type === 'hunker') d *= 0.5;
  e.hp -= d;
  // fight back if idle
  if (e.kind === 'unit' && isCombat(e) && e.order.type === 'idle' && src && src.hp > 0) {
    e.order = { type: 'attack', target: src, resume: null };
  }
  if (e.hp <= 0) {
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
  fxs.push({ kind: 'boom', x: e.x, y: e.y, t: 0, max: 26, size: (e.r || 16) * 1.6 });
  fxExplosion(e.x, e.y, (e.r || 16) * 1.3, e.kind === 'building');
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
  snd.boom();
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
  // If a building blocks the path just ahead, slide along its wall toward the
  // clear side instead of grinding into it until separation() shoves us around.
  const look = u.r + 12;
  const lx = u.x + Math.cos(a) * look, ly = u.y + Math.sin(a) * look;
  for (const b of buildings) {
    if (Math.abs(lx - b.x) >= b.w / 2 + u.r || Math.abs(ly - b.y) >= b.h / 2 + u.r) continue;
    // if the waypoint is at/inside this building (attack, repair, drop-off), walk straight in
    if (Math.abs(tx - b.x) < b.w / 2 + u.r + 10 && Math.abs(ty - b.y) < b.h / 2 + u.r + 10) break;
    const cross = (tx - u.x) * (b.y - u.y) - (ty - u.y) * (b.x - u.x);
    a += (cross > 0 ? -1 : 1) * Math.PI / 2;   // turn away from the blocked side
    break;
  }
  u.faceA = a;
  const step = Math.min(effSpeed(u), d);
  u.x += Math.cos(a) * step;
  u.y += Math.sin(a) * step;
  return d - step < 5;
}

function updateUnit(u) {
  if (u.cool > 0) u.cool--;
  if (u.hp < u.maxHp && rankOf(u) >= 3) u.hp = Math.min(u.maxHp, u.hp + 0.05);   // Legends field-patch themselves
  const o = u.order;

  switch (o.type) {
    case 'idle': {
      if (u.type === 'engineer') {
        const nb = nearestDamagedBuilding(u.team, u.x, u.y, 240);
        if (nb) u.order = { type: 'repair', target: nb };
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
      const t = acquireTarget(u.x, u.y, u.team, u.range + 90, u);
      if (t && dist(t.x, t.y, o.hx, o.hy) < NEST_LEASH) {
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
    case 'attackmove': {
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
        if (u.cool <= 0 && !(min && d < min)) fire(u, t);
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
      if (!hq) { u.order = { type: 'idle' }; break; }
      const d = dist(u.x, u.y, hq.x, hq.y);
      if (d > hq.r + u.r + 8) moveToward(u, hq.x, hq.y);
      else {
        teams[u.team].crystals += u.carry;
        if (u.team === 1) {
          fxs.push({ kind: 'text', x: u.x, y: u.y - 14, t: 0, max: 50, msg: '+' + u.carry });
          snd.deposit();
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
    for (const bl of buildings) {
      if (a.fly) break;                    // flyers hover over rooftops
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
  if (b.built < 1) {
    b.built = Math.min(1, b.built + 1 / (BLD[b.type].buildTime || BLD.turret.buildTime));
    b.hp = Math.min(b.maxHp, Math.max(b.hp, b.maxHp * b.built));
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
    if (b.respawnT >= NEST_RESPAWN) {
      b.respawnT = 0;
      spawnSpitter(b);
    }
    return;
  }
  if (b.cool > 0) b.cool--;
  if (b.dmg > 0) {
    const t = acquireTarget(b.x, b.y, b.team, b.range, b);
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
      }
      continue;
    }
    const a = Math.atan2(p.ty - p.y, p.tx - p.x);
    p.a = a;
    p.x += Math.cos(a) * p.speed;
    p.y += Math.sin(a) * p.speed;
  }
  bullets = bullets.filter(p => !p.dead);
}
function updateFx() {
  for (const f of fxs) f.t++;
  fxs = fxs.filter(f => f.t < f.max);
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
function aiUpdate() {
  if (tick % 30 !== 0 || gameOver) return;
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
    s + (bld ? bld.queue.reduce((q, ty) => q + UNIT[ty].supply, 0) : 0), 0);
  const armySupply = units.reduce((s, u) => (u.team === 2 && isCombat(u) ? s + UNIT[u.type].supply : s), 0) + queued;
  const armyCap = 3 + Math.floor((tick / 3600) * diff.capRate);   // +capRate supply per minute
  if (rax && rax.queue.length < 2 && armySupply < armyCap) {
    const roll = Math.random();
    if (t.crystals >= UNIT.sniper.cost && roll < 0.3) trainUnit(rax, 'sniper');
    else if (t.crystals >= UNIT.marine.cost) trainUnit(rax, 'marine');
  }
  if (fac && fac.queue.length < 2 && armySupply < armyCap) {
    const roll = Math.random();
    // artillery only after 4 min — early arty waves would out-range every defense
    if (tick > 4 * 3600 && t.crystals >= UNIT.artillery.cost && roll < 0.15) trainUnit(fac, 'artillery');
    else if (t.crystals >= UNIT.tank.cost && roll < 0.45) trainUnit(fac, 'tank');
    else if (t.crystals >= UNIT.raider.cost && roll < 0.75) trainUnit(fac, 'raider');
  }
  // gunships arrive mid-game — the AI holds off so early waves stay learnable
  if (air && air.queue.length < 1 && armySupply < armyCap && tick > 6 * 3600
      && t.crystals >= UNIT.gunship.cost && Math.random() < 0.35) {
    trainUnit(air, 'gunship');
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
  if (tick < waveAt) return;
  waveNum++;
  waveAt = tick + Math.max(45, 75 - waveNum * 4) * 60 * diff.waveEvery;
  const targ = buildings.find(b => b.team === 1 && b.type === 'hq')
            || buildings.find(b => b.team === 1)
            || units.find(u => u.team === 1);
  if (!targ) return;
  let sent = 0;
  for (const u of units) {
    if (u.team === 2 && isCombat(u)) {
      const p = spreadPoint(targ.x, targ.y, sent++);
      u.order = { type: 'attackmove', x: p.x, y: p.y };
    }
  }
  if (sent > 0) { toast('⚔ Enemy assault incoming!'); snd.alarm(); }
}

// ---------------- End condition ----------------
function checkEnd() {
  if (gameOver) return;
  const pAlive = buildings.some(b => b.team === 1 && b.type === 'hq');
  const eAlive = buildings.some(b => b.team === 2 && b.type === 'hq');
  if (!pAlive || !eAlive) {
    gameOver = pAlive ? 'win' : 'lose';
    // let the HQ explosion play out before the verdict drops
    setTimeout(() => {
      elOvTitle.textContent = pAlive ? 'VICTORY' : 'DEFEAT';
      elOvTitle.className = pAlive ? 'win' : 'lose';
      elOvSub.textContent = pAlive
        ? 'The enemy headquarters is rubble. The crystal fields are yours, Commander.'
        : 'Your headquarters has fallen. The crystals belong to the enemy… for now.';
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
  cv.style.cursor = (attackMoveMode || placing) ? 'crosshair' : 'default';
}
function pruneSelection() {
  selection = selection.filter(e => e.hp > 0);
}
const canHunker = (u) => u.type === 'marine' || u.type === 'artillery';
function toggleHunker() {
  const diggers = selection.filter(s => s.kind === 'unit' && canHunker(s) && s.hp > 0);
  if (!diggers.length) return;
  const allDown = diggers.every(m => m.order.type === 'hunker');
  for (const m of diggers) m.order = allDown ? { type: 'idle' } : { type: 'hunker' };
  if (!allDown) {
    const label = diggers.every(d => d.type === 'artillery') ? 'Artillery dug in'
      : diggers.every(d => d.type === 'marine') ? 'Marines hunkered down' : 'Troops dug in';
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
});
cv.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  audioInit();
  const wx = mouse.sx + cam.x, wy = mouse.sy + cam.y;
  if (placing || attackMoveMode) { placing = null; attackMoveMode = false; setCursor(); return; }
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
  else if (t && t.kind === 'egg') {
    commandCollect(selection, t);
    fxs.push({ kind: 'ping', x: t.x, y: t.y, t: 0, max: 22, color: '#e8e2cc' });
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
mini.addEventListener('contextmenu', (e) => e.preventDefault());

// keyboard
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code.startsWith('Arrow')) e.preventDefault();
  audioInit();

  if (e.code === 'Escape') {
    if (!elHelp.classList.contains('hidden')) { setHelp(false); return; }
    attackMoveMode = false; placing = null; selection = []; setCursor(); return;
  }
  if (e.code === 'KeyM') { muted = !muted; btnMute.textContent = muted ? '🔇' : '🔊'; return; }
  if (e.code === 'KeyF') { toggleFogMemory(); return; }
  if (e.code === 'Backquote') {   // dev mode: reveal the whole map
    devReveal = !devReveal;
    updateFog();
    toast(devReveal ? '🔧 Dev: full map revealed' : '🔧 Dev: fog restored');
    return;
  }
  if (gameOver) return;

  pruneSelection();
  if (e.code === 'KeyA' && selection.some(s => s.kind === 'unit' && isCombat(s))) { attackMoveMode = true; placing = null; setCursor(); return; }
  if (e.code === 'KeyS') { for (const s of selection) if (s.kind === 'unit') s.order = { type: 'idle' }; return; }
  if (e.code === 'KeyH' && selection.some(s => s.kind === 'unit' && canHunker(s))) { toggleHunker(); return; }
  if (!e.metaKey && !e.ctrlKey) {
    const bm = BUILD_MENU.find(([, k]) => e.code === 'Key' + k);
    if (bm) { placing = bm[0]; attackMoveMode = false; setCursor(); return; }
  }

  // production/research hotkeys on a selected building
  const prodKeys = { KeyQ: 0, KeyW: 1, KeyE: 2, KeyR: 3, KeyD: 4 };
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
    else if (groups[m[1]]) { selection = groups[m[1]].filter(u => u.hp > 0); }
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// controls modal: pauses the sim while open; shows automatically at game start
let paused = false;
function setHelp(open) {
  elHelp.classList.toggle('hidden', !open);
  paused = open;
}
btnHelp.addEventListener('click', () => { audioInit(); setHelp(elHelp.classList.contains('hidden')); });
document.getElementById('btn-help-close').addEventListener('click', () => { audioInit(); setHelp(false); });
btnMute.addEventListener('click', () => { audioInit(); muted = !muted; btnMute.textContent = muted ? '🔇' : '🔊'; });
function toggleFogMemory() {
  fogMemory = !fogMemory;
  btnFog.textContent = fogMemory ? '🌫 map: remembered' : '🌫 map: re-fogs';
  updateFog();
  toast(fogMemory ? 'Explored ground stays visible' : 'Ground re-fogs when unwatched');
}
btnFog.addEventListener('click', () => { audioInit(); toggleFogMemory(); });

// building placement
function canPlaceBuilding(type, wx, wy) {
  const d = BLD[type];
  if (teams[1].crystals < d.cost) return false;
  if (wx < 40 || wy < 40 || wx > W - 40 || wy > H - 40) return false;
  for (const b of buildings) {
    if (Math.abs(wx - b.x) < (b.w + d.w) / 2 + 10 && Math.abs(wy - b.y) < (b.h + d.h) / 2 + 10) return false;
  }
  for (const c of crystals) if (c.amount > 0 && dist2(wx, wy, c.x, c.y) < (d.w / 2 + 26) ** 2) return false;
  if (type === 'refinery') {
    return crystals.some(c => c.amount > 0 && dist2(wx, wy, c.x, c.y) < REFINERY_NEAR_CRYSTAL ** 2);
  }
  // turrets must anchor to a permanent structure (HQ/Barracks/Factory/…) — no turret-to-turret creep
  return buildings.some(b => b.team === 1 && (type !== 'turret' || b.type !== 'turret') &&
    dist2(wx, wy, b.x, b.y) < PLACE_NEAR_BASE ** 2);
}
function tryPlaceBuilding(type, wx, wy) {
  const d = BLD[type];
  if (!canPlaceBuilding(type, wx, wy)) {
    if (teams[1].crystals < d.cost) toast(`Not enough crystals (${d.cost} ⬡)`);
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
    BUILD_MENU.map(([t]) => (teams[1].crystals >= BLD[t].cost ? 'y' : 'n')).join('') + '|' +
    Object.values(teams[1].up).join('') + '.' + Math.floor(teams[1].crystals / 25) + '.' + teams[1].eggs +
    '.' + units.reduce((s, u) => s + (u.team === 1 && u.type === 'spitter' ? 1 : 0), 0);
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
      const key = ['Q', 'W', 'E', 'R', 'D'][i];
      if (a.kind === 'train') {
        const ud = UNIT[a.t];
        const dim = teams[1].crystals < ud.cost ? ' class="dim"' : '';
        html += `<button data-act="train:${a.t}"${dim}>${ud.label} · ${ud.cost} ⬡ <small>[${key}]</small></button>`;
      } else if (a.kind === 'hatch') {
        const pack = units.filter(u => u.team === 1 && u.type === 'spitter').length;
        const dim = (teams[1].eggs < 1 || pack >= SPITTER_CAP) ? ' class="dim"' : '';
        html += `<button data-act="hatch"${dim}>🦖 Hatch Spitter · 1 🥚 (${teams[1].eggs} 🥚 · pack ${pack}/${SPITTER_CAP}) <small>[${key}]</small></button>`;
      } else {
        const g = UPG[a.k];
        const pending = buildings.reduce((s, x) =>
          s + (x.team === 1 ? x.queue.filter(q => q === 'up:' + a.k).length : 0), 0);
        const lvl = teams[1].up[a.k] + pending;
        if (lvl >= g.max) html += `<button class="dim">⬆ ${g.label} MAX</button>`;
        else {
          const dim = teams[1].crystals < g.cost[lvl] ? ' class="dim"' : '';
          html += `<button data-act="research:${a.k}"${dim}>⬆ ${g.label} ${lvl + 1} · ${g.cost[lvl]} ⬡ <small>[${key}]</small></button>`;
        }
      }
    });
    html += '</div>';
  } else if (b) {
    const desc = b.type === 'supply' ? 'Raises your supply cap by ' + BLD.supply.supply + '.'
      : b.type === 'refinery' ? 'Harvesters drop crystals off here. Build more near far-away patches to expand.'
      : 'Defensive structure. It shoots on its own.';
    html = `<h3>${BLD[b.type].label}</h3><div class="sub">${desc}</div>`;
  } else if (selection.length) {
    const counts = {};
    for (const u of selection) counts[u.type] = (counts[u.type] || 0) + 1;
    const label = Object.entries(counts).map(([t, n]) => `${n}× ${UNIT[t].label}`).join(', ');
    const engHint = selection.some(u => u.type === 'engineer') ? 'Right-click a damaged building to repair it. ' : '';
    html = `<h3>${label}</h3><div class="sub">${engHint}Right-click: move · attack · harvest</div><div class="row">`;
    if (selection.some(u => isCombat(u))) html += '<button data-act="amove">Attack-move [A]</button>';
    if (selection.some(u => u.kind === 'unit' && canHunker(u))) html += '<button data-act="hunker">Hunker down [H]</button>';
    html += '<button data-act="stop">Stop [S]</button></div>';
  } else {
    html = '<h3>Crystal Command</h3><div class="sub">Drag to select units. Right-click to give orders. Select a building to train units.</div>';
  }
  if (!placing && !attackMoveMode) {
    html += '<div class="row">';
    for (const [t, k] of BUILD_MENU) {
      const d = BLD[t];
      const dim = teams[1].crystals < d.cost ? ' class="dim"' : '';
      html += `<button data-act="build:${t}"${dim}>${d.label} · ${d.cost} ⬡ <small>[${k}]</small></button>`;
    }
    html += '</div>';
  }
  elCard.innerHTML = html;
}

// production queue lives in its own strip ABOVE the card, so appearing /
// disappearing never shifts the card's buttons (playtest feedback)
let lastQSig = '';
function refreshQueue() {
  const b = selection.length === 1 && selection[0].kind === 'building'
    && selection[0].queue && selection[0].queue.length ? selection[0] : null;
  const sig = b ? b.id + '|' + b.queue.join('.') + '|' + b.boost + '|' + Math.floor(teams[1].crystals / 25) : '';
  if (sig === lastQSig) return;
  lastQSig = sig;
  if (!b) { elQpanel.classList.add('hidden'); return; }
  elQpanel.classList.remove('hidden');
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
elDock.addEventListener('click', (e) => {
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
  } else if (act === 'hatch') {
    const b = selection.find(s => s.kind === 'building' && s.type === 'hq');
    if (b) hatchSpitter(b);
    lastCardSig = '';
  } else if (act.startsWith('rush:')) {
    const b = selection.find(s => s.kind === 'building' && s.queue && s.queue.length);
    if (b) rushProduction(b, act.slice(5) === 'instant');
    lastCardSig = ''; lastQSig = '';
  }
  else if (act.startsWith('build:')) { placing = act.slice(6); attackMoveMode = false; setCursor(); lastCardSig = ''; }
  else if (act === 'stop') { for (const s of selection) if (s.kind === 'unit') s.order = { type: 'idle' }; }
  else if (act === 'hunker') { toggleHunker(); }
  else if (act === 'amove') { attackMoveMode = true; setCursor(); lastCardSig = ''; }
});

function refreshTopbar() {
  elCrystals.textContent = '⬡ ' + Math.floor(teams[1].crystals);
  elSupply.textContent = '☰ ' + supplyUsed(1) + ' / ' + supplyMax(1);
  // the egg chip only appears once eggs enter your life
  const showEggs = teams[1].eggs > 0 || units.some(u => u.team === 1 && u.eggCarry);
  elEggs.style.display = showEggs ? '' : 'none';
  elEggs.textContent = '🥚 ' + teams[1].eggs;
  const s = Math.max(0, Math.ceil((waveAt - tick) / 60));
  elWave.textContent = waveNum === 0 ? `⚔ first assault: ${s}s` : `⚔ next assault: ${s}s`;
}
function refreshProgressBar() {
  const el = document.getElementById('prog');
  if (!el) return;
  const b = selection.length === 1 && selection[0].queue && selection[0].queue.length ? selection[0] : null;
  if (b) el.style.width = Math.min(100, (b.prog / queueTime(b.team, b.queue[0])) * 100) + '%';
}

// ---------------- Ground texture (pre-rendered) ----------------
const groundCv = document.createElement('canvas');
groundCv.width = W; groundCv.height = H;
(function paintGround() {
  const g = groundCv.getContext('2d');
  g.fillStyle = '#171c16';
  g.fillRect(0, 0, W, H);
  // mottled soil
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = 8 + Math.random() * 42;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.05)';
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  // faint grid
  g.strokeStyle = 'rgba(160,220,200,0.028)';
  g.lineWidth = 1;
  for (let x = 0; x <= W; x += TILE) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
  for (let y = 0; y <= H; y += TILE) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
  // scattered pebbles
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    g.fillStyle = 'rgba(190,200,190,0.06)';
    g.beginPath(); g.arc(x, y, 1 + Math.random() * 2.5, 0, Math.PI * 2); g.fill();
  }
})();

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
  cx.save();
  cx.translate(e.x, e.y);
  cx.fillStyle = 'rgba(232,226,204,0.16)';   // soft glow so they read on dark ground
  cx.beginPath(); cx.arc(0, 0, e.r + 5, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#e8e2cc';
  cx.beginPath(); cx.ellipse(0, 0, e.r * 0.72, e.r, 0.15, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = COLORS[3].main;             // speckles
  cx.beginPath(); cx.arc(-2, -3, 1.2, 0, Math.PI * 2); cx.fill();
  cx.beginPath(); cx.arc(2, 1, 1, 0, Math.PI * 2); cx.fill();
  cx.beginPath(); cx.arc(-1, 3.5, 0.9, 0, Math.PI * 2); cx.fill();
  cx.restore();
}

// sprite bodies for buildings; keeps the shared selection/hp/queue drawing in drawBuilding
function drawBuildingSprite(b, x, y) {
  const C = COLORS[b.team];
  if (b.built < 1) {
    cx.globalAlpha = 0.55;
    cx.strokeStyle = 'rgba(200,220,210,0.5)';
    cx.lineWidth = 2;
    cx.setLineDash([6, 5]);
    rr(cx, x, y, b.w, b.h, 8); cx.stroke();
    cx.setLineDash([]);
  }
  if (b.type === 'hq') {
    cx.drawImage(teamSprite(BODY.bld_plate_oct, b.team), x, y, b.w, b.h);
    cx.drawImage(BODY.bld_vent_a, b.x - 15, b.y - 15, 30, 30);
    const pulse = 8 + Math.sin(tick * 0.08) * 2;
    cx.fillStyle = C.main;
    cx.save(); cx.translate(b.x, b.y); cx.rotate(Math.PI / 4);
    cx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
    cx.restore();
  } else if (b.type === 'barracks') {
    cx.drawImage(teamSprite(BODY.bld_plate, b.team), x, y, b.w, b.h);
    cx.drawImage(BODY.bld_vent_b, b.x - 12, y + 10, 24, 24);
    cx.fillStyle = C.dark;
    cx.fillRect(b.x - 12, y + b.h - 22, 24, 22);
  } else if (b.type === 'factory') {
    cx.drawImage(teamSprite(BODY.bld_plate, b.team), x, y, b.w, b.h);
    cx.drawImage(BODY.bld_vent_b, x + 8, b.y - 14, 24, 24);
    cx.drawImage(BODY.bld_vent_b, x + b.w - 32, b.y - 14, 24, 24);
    cx.fillStyle = C.dark;
    cx.fillRect(b.x - 17, y + b.h - 20, 34, 20);   // vehicle bay door
  } else if (b.type === 'supply') {
    cx.drawImage(teamSprite(BODY.bld_plate, b.team), x, y, b.w, b.h);
    cx.drawImage(BODY.crate, b.x - 18, b.y - 14, 16, 16);
    cx.drawImage(BODY.crate, b.x + 2, b.y - 14, 16, 16);
    cx.drawImage(BODY.crate, b.x - 8, b.y + 0, 16, 16);
  } else if (b.type === 'refinery') {
    cx.drawImage(teamSprite(BODY.bld_plate_oct, b.team), x, y, b.w, b.h);
    const r = 11 + Math.sin(tick * 0.06) * 1.5;    // pulsing crystal emblem
    cx.fillStyle = CRYSTAL_COLOR;
    cx.beginPath();
    cx.moveTo(b.x, b.y - r); cx.lineTo(b.x + r * 0.7, b.y); cx.lineTo(b.x, b.y + r); cx.lineTo(b.x - r * 0.7, b.y);
    cx.closePath(); cx.fill();
  } else if (b.type === 'airpad') {
    cx.drawImage(teamSprite(BODY.bld_plate, b.team), x, y, b.w, b.h);
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
  } else { // turret
    cx.drawImage(teamSprite(BODY.bld_plate, b.team), b.x - 22, b.y - 22, 44, 44);
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

// mound + eggs + rib bones; pulses so it reads as alive
function drawNest(b) {
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
  } else if (b.type === 'refinery') {
    cx.fillStyle = CRYSTAL_COLOR;
    cx.beginPath();
    cx.moveTo(b.x, b.y - 12); cx.lineTo(b.x + 8, b.y); cx.lineTo(b.x, b.y + 12); cx.lineTo(b.x - 8, b.y);
    cx.closePath(); cx.fill();
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
    // narrow chassis, extra-long tube — reads as "siege" next to the tank
    cx.drawImage(teamSprite(BODY.tank_body, u.team), -12, -14, 24, 28);
    cx.drawImage(teamSprite(BODY.tank_barrel, u.team), -3, -32, 6, 34);
  } else if (u.type === 'raider') {
    cx.drawImage(teamSprite(BODY.tank_body, u.team), -10, -13, 20, 26);
    cx.drawImage(teamSprite(BODY.raider_barrel, u.team), -2.5, -22, 5, 24);
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

// procedural dino — drawn inside the unit's translate+rotate frame, +x forward.
// Team-colored: wild ones are acid green, hatched player dinos wear teal.
// No sprite art yet; when dino sprites land they slot in via drawUnitSprite.
function drawDino(u) {
  const C = COLORS[u.team];
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
  cx.fillStyle = C.light;                           // throat sac — the spitter bit
  cx.beginPath(); cx.arc(7, 0, 2, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#1a200e';                         // eyes
  cx.beginPath(); cx.arc(9.5, -2.2, 1, 0, Math.PI * 2); cx.arc(9.5, 2.2, 1, 0, Math.PI * 2); cx.fill();
}

// gunship — drawn inside translate+rotate, +x forward. Procedural (no air art yet).
function drawGunship(u) {
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

function drawUnit(u) {
  const C = COLORS[u.team];
  const sel = selection.includes(u);
  if (sel) {
    cx.strokeStyle = 'rgba(143,216,207,0.9)';
    cx.lineWidth = 1.5;
    cx.beginPath(); cx.arc(u.x, u.y, u.r + 5, 0, Math.PI * 2); cx.stroke();
  }
  if (u.type === 'gunship') {
    cx.fillStyle = 'rgba(0,0,0,0.3)';   // ground shadow sells the altitude
    cx.beginPath(); cx.ellipse(u.x + 8, u.y + 13, u.r * 0.9, u.r * 0.45, 0, 0, Math.PI * 2); cx.fill();
    cx.save();
    cx.translate(u.x, u.y);
    cx.rotate(u.faceA);
    drawGunship(u);
    cx.restore();
    if (sel || u.hp < u.maxHp) drawHpBar(u.x, u.y - u.r - 12, u.r * 2.4, u.hp, u.maxHp);
    drawRank(u);
    return;
  }
  if (u.type === 'spitter') {
    cx.save();
    cx.translate(u.x, u.y);
    cx.rotate(u.faceA);
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
  if (bodiesReady) {
    drawUnitSprite(u);
    cx.restore();
    if (sel || u.hp < u.maxHp) drawHpBar(u.x, u.y - u.r - 10, u.r * 2.4, u.hp, u.maxHp);
    drawRank(u);
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
  if (sel || u.hp < u.maxHp) drawHpBar(u.x, u.y - u.r - 10, u.r * 2.4, u.hp, u.maxHp);
  drawRank(u);
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
    cx.strokeStyle = C.light;
    cx.lineWidth = 2;
    cx.beginPath();
    cx.moveTo(p.x, p.y);
    cx.lineTo(p.x - Math.cos(p.a || 0) * 8, p.y - Math.sin(p.a || 0) * 8);
    cx.stroke();
  }
}

function drawFx(f) {
  const k = f.t / f.max;
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

  cx.drawImage(groundCv, 0, 0);
  for (const c of crystals) if (isShownAt(c.x, c.y)) drawCrystal(c);
  for (const e of eggs) if (isShownAt(e.x, e.y)) drawEgg(e);
  for (const b of buildings) if (b.team === 1 || isShownAt(b.x, b.y)) drawBuilding(b);
  for (const u of units) if (u.team === 1 || isVisibleAt(u.x, u.y)) drawUnit(u);
  for (const p of bullets) if (p.team === 1 || isVisibleAt(p.x, p.y)) drawBullet(p);
  for (const f of fxs) {
    const worldFx = f.kind === 'boom' || f.kind === 'sprite' || f.kind === 'muzzle';
    if (!worldFx || isVisibleAt(f.x, f.y)) drawFx(f);
  }

  // fog of war (small canvas scaled up = soft edges)
  cx.drawImage(fogCv, 0, 0, fogW, fogH, 0, 0, W, H);

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
    if (placing === 'turret') {
      cx.strokeStyle = ok ? 'rgba(63,185,201,0.35)' : 'rgba(224,86,74,0.35)';
      cx.setLineDash([4, 6]);
      cx.beginPath(); cx.arc(mouse.wx, mouse.wy, BLD.turret.range, 0, Math.PI * 2); cx.stroke();
      cx.setLineDash([]);
    }
  }
  cx.restore();
  renderMinimap();
}

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
    mcx.fillStyle = '#e8e2cc';
    mcx.fillRect(e.x * sx - 1, e.y * sy - 1, 2, 2);
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
  mcx.strokeStyle = 'rgba(255,255,255,0.7)';
  mcx.lineWidth = 1;
  mcx.strokeRect(cam.x * sx, cam.y * sy, view.w * sx, view.h * sy);
}

// ---------------- Main loop ----------------
function update() {
  tick++;
  updateCamera();
  if (tick % 8 === 1) updateFog();

  for (const u of units) updateUnit(u);
  separation();
  for (const b of buildings) updateBuilding(b);
  updateBullets();
  updateFx();
  aiUpdate();
  waveUpdate();

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
    if (!started || paused) { /* menu or controls modal is up — world waits */ }
    else if (!gameOver) update();
    else { tick++; updateFx(); updateCamera(); }   // aftermath keeps burning behind the overlay
    acc -= 1000 / 60;
  }
  render();
}

// ---------------- Start menu ----------------
let started = false;
const elMenu = document.getElementById('menu');
let chosenMap = localStorage.getItem('cc.map') || 'basin';
let chosenDiff = localStorage.getItem('cc.diff') || 'normal';
if (!MAPS[chosenMap]) chosenMap = 'basin';
if (!DIFFS[chosenDiff]) chosenDiff = 'normal';

function menuButtons(el, table, chosen, pick) {
  el.innerHTML = '';
  for (const key in table) {
    const b = document.createElement('button');
    b.className = 'opt' + (key === chosen ? ' sel' : '');
    b.innerHTML = `<b>${table[key].label}</b><span>${table[key].desc}</span>`;
    b.onclick = () => { audioInit(); pick(key); };
    el.appendChild(b);
  }
}
function renderMenu() {
  menuButtons(document.getElementById('menu-maps'), MAPS, chosenMap, k => { chosenMap = k; renderMenu(); });
  menuButtons(document.getElementById('menu-diffs'), DIFFS, chosenDiff, k => { chosenDiff = k; renderMenu(); });
}
// wipe the world so startGame can never stack two setups (also enables restarts)
function resetWorld() {
  units = []; buildings = []; crystals = []; bullets = []; fxs = []; eggs = [];
  selection = [];
  for (const k in groups) delete groups[k];
  teams[1] = { crystals: 180, eggs: 0, up: newUp() };
  teams[2] = { crystals: 180, eggs: 0, up: newUp() };
  teams[3] = { crystals: 0, eggs: 0, up: newUp() };
  tick = 0; gameOver = null; waveNum = 0; shakeAmp = 0;
  placing = null; attackMoveMode = false; setCursor();
  explored.fill(0); visible.fill(0);
  elOverlay.classList.add('hidden');
  lastCardSig = '';
}
function startGame(mapKey, diffKey) {
  resetWorld();
  diff = DIFFS[diffKey] || DIFFS.normal;
  waveAt = diff.firstWave * 60;
  setup(mapKey);
  started = true;
  elMenu.classList.add('hidden');
  refreshTopbar();
  refreshCard();
  refreshQueue();
  setHelp(true);   // show the controls first — closing them starts the clock
  toast('Your harvesters are mining. Select the Barracks and press Q to train Marines!');
}
renderMenu();
document.getElementById('btn-start').addEventListener('click', () => {
  audioInit();
  localStorage.setItem('cc.map', chosenMap);
  localStorage.setItem('cc.diff', chosenDiff);
  startGame(chosenMap, chosenDiff);
});

requestAnimationFrame(frame);

// debug handle (used for automated testing; harmless to leave in)
window.CC = {
  get units() { return units; },
  get buildings() { return buildings; },
  get crystals() { return crystals; },
  get eggs() { return eggs; },
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
  get fxs() { return fxs; },
  get spritesReady() { return spritesReady; },
  isVisibleAt, isExploredAt, isShownAt, updateFog, toggleFogMemory,
  damage, trainUnit, commandMove, fxExplosion,
  canPlaceBuilding, tryPlaceBuilding, makeBuilding, makeUnit, makeNest, makeEgg, startResearch,
  hatchSpitter, rankOf, startGame, MAPS, DIFFS,
  get started() { return started; },
  get diff() { return diff; },
  // run n game ticks synchronously — lets automated tests advance the sim even
  // when the tab is backgrounded and requestAnimationFrame is asleep
  step(n) { for (let i = 0; i < (n || 1) && !gameOver; i++) update(); },
};
