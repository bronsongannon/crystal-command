"""Generates STYLE-GUIDE.pdf — the Gemini art-direction brief for Broodfall.

One sheet per character: subject description, signature detail, colorway swatches
with exact output filenames, and ready-to-paste generation + recolor prompts.
Run:  python3 assets/sprites/style_guide_pdf.py   (from the repo root)
"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'STYLE-GUIDE.pdf')
W, H = letter
M = 0.6 * inch
INK = HexColor('#22261f')
MUTE = HexColor('#5a6157')
PANEL = HexColor('#f2f0e8')
CALLOUT_BG = HexColor('#fdf3dc')
CALLOUT_INK = HexColor('#7a5a12')

c = canvas.Canvas(OUT, pagesize=letter)

def wrap(text, font, size, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if c.stringWidth(t, font, size) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines

def para(x, y, text, size=9.5, leading=13, font='Helvetica', color=INK, maxw=None):
    c.setFillColor(color)
    c.setFont(font, size)
    for ln in wrap(text, font, size, maxw or (W - 2 * M)):
        c.drawString(x, y, ln)
        y -= leading
    return y

def swatch_row(x, y, sw):
    n = len(sw)
    gap = 0.12 * inch
    chip_w = min(1.12 * inch, (W - 2 * M - gap * (n - 1)) / n)
    chip_h = 0.4 * inch
    for i, (hx, role, note) in enumerate(sw):
        cx0 = x + i * (chip_w + gap)
        c.setFillColor(HexColor(hx))
        c.setStrokeColor(HexColor('#c9c5b8'))
        c.roundRect(cx0, y - chip_h, chip_w, chip_h, 4, fill=1, stroke=1)
        c.setFillColor(INK)
        c.setFont('Helvetica-Bold', 8)
        c.drawString(cx0, y - chip_h - 10, role)
        c.setFillColor(MUTE)
        c.setFont('Courier', 7.5)
        c.drawString(cx0, y - chip_h - 19, hx.upper())
        c.setFont('Helvetica', 7)
        for j, ln in enumerate(wrap(note, 'Helvetica', 7, chip_w + gap * 0.6)[:2]):
            c.drawString(cx0, y - chip_h - 28 - j * 8, ln)
    return y - chip_h - 46

def prompt_box(y, title, text):
    y = para(M, y, title, 9.5, 13, 'Helvetica-Bold')
    lines = wrap(text, 'Courier', 7.6, W - 2 * M - 20)
    box_h = len(lines) * 9.6 + 14
    c.setFillColor(PANEL)
    c.roundRect(M, y - box_h + 4, W - 2 * M, box_h, 5, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont('Courier', 7.6)
    ty = y - 9
    for ln in lines:
        c.drawString(M + 10, ty, ln)
        ty -= 9.6
    return y - box_h - 8

def callout(y, head, body):
    body_lines = wrap(body, 'Helvetica', 9, W - 2 * M - 20)
    h = 16 + len(body_lines) * 11 + 6
    c.setFillColor(CALLOUT_BG)
    c.roundRect(M, y - h, W - 2 * M, h, 5, fill=1, stroke=0)
    c.setFillColor(CALLOUT_INK)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(M + 10, y - 13, head)
    c.setFont('Helvetica', 9)
    ty = y - 25
    for ln in body_lines:
        c.drawString(M + 10, ty, ln)
        ty -= 11
    return y - h - 12

PAGE_NO = [0]
def header(title, sub):
    PAGE_NO[0] += 1
    y = H - M
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 17)
    c.drawString(M, y, title)
    y -= 14
    c.setFillColor(MUTE)
    c.setFont('Helvetica', 9)
    c.drawString(M, y, sub)
    c.drawRightString(W - M, y, 'Broodfall style guide  ·  p.%d' % PAGE_NO[0])
    return y - 20

def banner(y, name, tagline):
    c.setFillColor(PANEL)
    c.roundRect(M, y - 42, W - 2 * M, 42, 6, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 14)
    c.drawString(M + 12, y - 18, name.upper())
    c.setFillColor(MUTE)
    c.setFont('Helvetica', 9)
    c.drawString(M + 12, y - 32, tagline)
    return y - 58

P1 = ('Top-down orthographic 2D video game sprite of {subj}, viewed from directly above, '
      'facing up. Chunky cartoonish proportions, flat shading, bold clean dark outlines, '
      'exactly matching the art style of the attached marine sprite. {colors} Kid-friendly. '
      'Centered, filling 85% of a square canvas, plain solid light-gray background, no text, '
      'no drop shadow.')
P2 = ('Recolor this exact sprite: {recolor} Keep the pose, proportions, outline, and every '
      'detail identical - change colors only.')

def sheet(e):
    y = header('CHARACTER SHEET', e.get('group', ''))
    y = banner(y, e['name'], e['tag'])
    y = para(M, y, 'SUBJECT', 10, 13, 'Helvetica-Bold')
    y = para(M, y, e['subj_full'], 9.5, 12.5) - 6
    y = callout(y, 'SIGNATURE DETAIL (must survive at 30 px):', e['sig'])
    y = para(M, y, 'COLORWAY A - EXPEDITION (save as %s)' % e['file_teal'], 9.5, 13, 'Helvetica-Bold')
    y = swatch_row(M, y - 2, e['sw_teal'])
    if e.get('sw_red'):
        y = para(M, y, 'COLORWAY B - RUBICON (save as %s)' % e['file_red'], 9.5, 13, 'Helvetica-Bold')
        y = swatch_row(M, y - 2, e['sw_red'])
    y = prompt_box(y, 'PROMPT 1 - generate colorway A (attach the approved marine sprite as style reference)',
                   P1.format(subj=e['subj'], colors=e['colors']))
    if e.get('recolor'):
        y = prompt_box(y, 'PROMPT 2 - recolor to colorway B (upload the colorway-A result with this; do NOT regenerate)',
                       P2.format(recolor=e['recolor']))
    if e.get('note'):
        para(M, y, 'NOTE: ' + e['note'], 8.5, 11, 'Helvetica', MUTE)
    c.showPage()

# ---------------------------------------------------------------- cover
y = header('CRYSTAL COMMAND - SPRITE GENERATION BRIEF', 'for Gemini image generation')
y = para(M, y, 'This document specifies every sprite for the game Broodfall: colors, signature '
               'details, and ready-to-paste prompts. Each character page is self-contained.', 10, 14) - 8
y = para(M, y, 'WORKFLOW (follow for every character)', 10.5, 14, 'Helvetica-Bold')
steps = [
    '1.  Generate colorway A with PROMPT 1. Always attach the approved marine sprite as a style reference so every character matches.',
    '2.  Check the SIGNATURE DETAIL survived. If a color zone is wrong, reply with a one-line correction (e.g. "make the shoulder trim charcoal #3A3F45").',
    '3.  Upload the colorway-A image with PROMPT 2 to get colorway B. Never regenerate from scratch - recoloring keeps the two sprites identical.',
    '4.  Remove the background to transparent, CROP TO THE SPRITE BOUNDS (no empty margins), export 256 x 256 PNG.',
    '5.  Save with the exact filename on the sheet and drop into assets/sprites/. The game uses colorway art as-is; anything missing falls back automatically.',
]
for s in steps:
    y = para(M, y, s, 9.5, 12.5) - 3
y -= 6
y = para(M, y, 'GLOBAL STYLE RULES', 10.5, 14, 'Helvetica-Bold')
y = para(M, y, 'Top-down orthographic (camera straight down) - facing UP - chunky cartoon proportions - flat '
               'shading with bold dark outlines - readable at 30 pixels - kid-friendly, no gore - buildings are '
               'architecture seen from above, vehicles show their roofs, infantry show helmet and shoulders.', 9.5, 12.5) - 10
y = para(M, y, 'TEAM PALETTES', 10.5, 14, 'Helvetica-Bold')
y = para(M, y, 'Expedition (teal) - the player: clean survey-fleet science gear.', 9.5, 12)
y = swatch_row(M, y - 2, [
    ('#3fb9c9', 'Hull', 'vehicles, armor'), ('#e8e4d8', 'Trim', 'panels, pads'),
    ('#f0c86a', 'Accent', 'lights, visors'), ('#2f97a6', 'Structure', 'buildings'), ('#9fe8ef', 'FX', 'glow')])
y = para(M, y, 'Rubicon Mining (red) - the rival: heavy industrial mining conglomerate.', 9.5, 12)
y = swatch_row(M, y - 2, [
    ('#e0564a', 'Hull', 'vehicles, armor'), ('#3a3f45', 'Trim', 'iron panels'),
    ('#f2b63d', 'Accent', 'hazard yellow'), ('#b8443a', 'Structure', 'buildings'), ('#f5a89a', 'FX', 'glow')])
y = para(M, y, 'Universal colors (identical on every team):', 9.5, 12)
y = swatch_row(M, y - 2, [
    ('#f2b63d', 'Hazard', 'stripes, chevrons'), ('#3a3f45', 'Gunmetal', 'weapons'),
    ('#9aa0a6', 'Steel', 'machinery'), ('#e8e2cc', 'Bone', 'cages, eggs'),
    ('#a8d060', 'Venom', 'dino biology'), ('#6fe3d0', 'Crystal', 'the resource')])
para(M, y, 'Wild dinos use their own sheet (bone hide, moss stripes) - they are wildlife, not a faction.',
     9, 11, 'Helvetica', MUTE)
c.showPage()

# ---------------------------------------------------------------- data
TE = {'hull': '#3fb9c9', 'trim': '#e8e4d8', 'acc': '#f0c86a', 'bld': '#2f97a6'}
RU = {'hull': '#e0564a', 'trim': '#3a3f45', 'acc': '#f2b63d', 'bld': '#b8443a'}
GUN, STEEL, BONE, VEN, CRY, HAZ = '#3a3f45', '#9aa0a6', '#e8e2cc', '#a8d060', '#6fe3d0', '#f2b63d'

def U(key, name, tag, subj, subj_extra, sig, colors, recolor, sw_t, sw_r, note=None, group='Unit'):
    return {'name': name, 'tag': tag, 'group': group,
            'subj': subj, 'subj_full': subj_extra, 'sig': sig, 'colors': colors, 'recolor': recolor,
            'file_teal': 'unit_%s_teal.png' % key, 'file_red': 'unit_%s_red.png' % key,
            'sw_teal': sw_t, 'sw_red': sw_r, 'note': note}

def B(key, name, tag, subj, subj_extra, sig, colors, recolor, sw_t, sw_r, note=None):
    e = U(key, name, tag, subj, subj_extra, sig, colors, recolor, sw_t, sw_r, note, group='Building')
    e['file_teal'] = 'bld_%s_teal.png' % key
    e['file_red'] = 'bld_%s_red.png' % key
    return e

ENTRIES = [
U('marine', 'Marine', 'Infantry · fast, cheap rifleman - the workhorse of both armies',
  'a single sci-fi marine soldier with a rifle held pointing up',
  'A single sci-fi marine rifleman seen from directly above, helmet at the top, rifle held ready pointing up. This is the STYLE ANCHOR - every other sprite must match it.',
  'one glowing visor strip across the helmet - the accent color, and nothing else, on the head',
  'Teal armor #3FB9C9 covering about 75% of the body, off-white trim panels #E8E4D8 on the shoulder pads and backpack, one small glowing amber visor strip #F0C86A across the helmet, dark gunmetal rifle #3A3F45.',
  'armor becomes red #E0564A, shoulder trim becomes charcoal #3A3F45, the visor strip becomes hazard yellow #F2B63D, rifle stays dark gunmetal.',
  [(TE['hull'], 'Hull · 75%', 'armor, helmet'), (TE['trim'], 'Trim · 20%', 'pads, backpack'), (TE['acc'], 'Accent · 5%', 'visor strip'), (GUN, 'Gunmetal', 'rifle, boots')],
  [(RU['hull'], 'Hull · 75%', 'armor, helmet'), (RU['trim'], 'Trim · 20%', 'pads, backpack'), (RU['acc'], 'Accent · 5%', 'visor strip'), ('#2c3036', 'Gunmetal', 'rifle, boots')]),
U('sniper', 'Sniper', 'Infantry · fragile marksman with the longest sight in the game',
  'a single prone sniper lying flat with a very long anti-materiel rifle pointing up, low wide silhouette',
  'A sniper lying PRONE (flat on the ground), long rifle with bipod extending up past the body. The silhouette should read long and thin next to the chunky marine.',
  'a tiny glowing scope lens on the rifle - the only bright pixel on a deliberately drab sprite',
  'Dark desaturated teal cloak #2F97A6 over the whole body, dark gunmetal rifle #3A3F45 with a tiny glowing amber scope lens #F0C86A, moss-drab boots #5A6157.',
  'the cloak becomes dark rust red #B8443A, the scope lens becomes hazard yellow #F2B63D, everything else stays.',
  [(TE['bld'], 'Cloak · 80%', 'body, hood'), (GUN, 'Gunmetal', 'long rifle'), (TE['acc'], 'Accent', 'scope lens'), ('#5a6157', 'Drab', 'boots, wrap')],
  [(RU['bld'], 'Cloak · 80%', 'body, hood'), (GUN, 'Gunmetal', 'long rifle'), (RU['acc'], 'Accent', 'scope lens'), ('#5a6157', 'Drab', 'boots, wrap')],
  note='Also save a copy of each as unit_sniper_hunker_teal.png / _red.png - the game shows the same prone art while dug in.'),
U('medic', 'Medic', 'Infantry · unarmed field medic - heals infantry and dinos',
  'a single unarmed field medic with a bulky medical backpack, both hands free',
  'An unarmed medic with a big square medical backpack. No weapon anywhere. Softer, rounder posture than the marine.',
  'the red cross on the backpack - visible from above, dead center',
  'Off-white uniform #F2F2EE over most of the body, a bold red cross #D84A3E on the backpack, teal boots and gloves #3FB9C9, amber headlamp #F0C86A.',
  'boots and gloves become red #E0564A; the white uniform and red cross stay exactly the same.',
  [('#f2f2ee', 'Kit · 70%', 'uniform, pack'), ('#d84a3e', 'Cross', 'backpack, helmet'), (TE['hull'], 'Team · 20%', 'boots, gloves'), (TE['acc'], 'Accent', 'headlamp')],
  [('#f2f2ee', 'Kit · 70%', 'uniform, pack'), ('#d84a3e', 'Cross', 'backpack, helmet'), (RU['hull'], 'Team · 20%', 'boots, gloves'), (RU['acc'], 'Accent', 'headlamp')],
  note='Medical white is universal - the two colorways differ only in boots/gloves.'),
U('engineer', 'Engineer', 'Infantry · repairs buildings and vehicles',
  'a single engineer in work coveralls holding a big wrench, wearing a hard hat',
  'An engineer in coveralls, wrench in one hand, hard hat clearly visible from above. Reads as a worker, not a soldier.',
  'the amber hard hat - a bright disc where a soldier would have armor',
  'Teal coveralls #3FB9C9, glowing amber hard hat #F0C86A, steel wrench #9AA0A6, off-white tool belt #E8E4D8.',
  'coveralls become red #E0564A, the hard hat becomes hazard yellow #F2B63D, tool belt becomes charcoal #3A3F45.',
  [(TE['hull'], 'Hull · 70%', 'coveralls'), (TE['acc'], 'Hard hat', 'the disc on top'), (STEEL, 'Steel', 'wrench, tools'), (TE['trim'], 'Trim', 'tool belt')],
  [(RU['hull'], 'Hull · 70%', 'coveralls'), (RU['acc'], 'Hard hat', 'the disc on top'), (STEEL, 'Steel', 'wrench, tools'), (RU['trim'], 'Trim', 'tool belt')]),
U('rocket', 'Rocket Trooper', 'Infantry · anti-vehicle specialist, can hit aircraft',
  'a single soldier with a large launch tube over the right shoulder',
  'A rocket trooper: same chunky body as the marine but with a fat launch tube across the right shoulder, rocket loaded.',
  'the red rocket tip visible in the mouth of the tube',
  'Teal armor #3FB9C9, charcoal launch tube #3A3F45 over the right shoulder with a red rocket tip #E0564A peeking out, off-white shoulder pads #E8E4D8.',
  'armor becomes red #E0564A, shoulder pads become charcoal #3A3F45; the tube and red rocket tip stay.',
  [(TE['hull'], 'Hull · 70%', 'armor, helmet'), (GUN, 'Tube', 'launcher'), ('#e0564a', 'Warhead', 'rocket tip'), (TE['trim'], 'Trim', 'pads')],
  [(RU['hull'], 'Hull · 70%', 'armor, helmet'), (GUN, 'Tube', 'launcher'), ('#e0564a', 'Warhead', 'rocket tip'), (RU['trim'], 'Trim', 'pads')]),
U('harvester', 'Harvester', 'Vehicle · mines crystals and hauls them home',
  'a boxy mining truck with a wide front scoop and an open cargo bed',
  'A stubby industrial mining truck: wide hazard-striped scoop at the front, open cargo bed behind the cab. Friendly and utilitarian, not military.',
  'the hazard-striped scoop - mining equipment is striped on EVERY team',
  'Teal hull #3FB9C9, hazard-yellow and black striped front scoop #F2B63D, off-white cab roof #E8E4D8, dark gray tires #2C3036, empty gray cargo bed.',
  'hull becomes red #E0564A, cab roof becomes charcoal #3A3F45; the hazard scoop and tires stay.',
  [(TE['hull'], 'Hull · 70%', 'body, bed'), (HAZ, 'Hazard', 'front scoop'), (TE['trim'], 'Trim', 'cab roof'), ('#2c3036', 'Tires', 'wheels')],
  [(RU['hull'], 'Hull · 70%', 'body, bed'), (HAZ, 'Hazard', 'front scoop'), (RU['trim'], 'Trim', 'cab roof'), ('#2c3036', 'Tires', 'wheels')],
  note='Leave the cargo bed EMPTY - the game draws the crystal/egg load on top.'),
U('raider', 'Raider', 'Vehicle · fast attack buggy, scout and harasser',
  'a fast wedge-shaped attack buggy with a small roof-mounted gun',
  'A low wedge-shaped buggy, wide rear wheels, narrow nose, small roof gun. Should look FAST standing still.',
  'the racing stripe, nose to tail',
  'Teal wedge body #3FB9C9 with one off-white racing stripe #E8E4D8 running nose to tail, amber headlights #F0C86A, dark gunmetal roof gun #3A3F45, dark wheels.',
  'body becomes red #E0564A, the racing stripe becomes charcoal #3A3F45, headlights become hazard yellow #F2B63D.',
  [(TE['hull'], 'Hull · 70%', 'wedge body'), (TE['trim'], 'Stripe', 'nose to tail'), (TE['acc'], 'Accent', 'headlights'), (GUN, 'Gunmetal', 'roof gun')],
  [(RU['hull'], 'Hull · 70%', 'wedge body'), (RU['trim'], 'Stripe', 'nose to tail'), (RU['acc'], 'Accent', 'headlights'), (GUN, 'Gunmetal', 'roof gun')]),
U('tank', 'Tank', 'Vehicle · slow, heavily armored main battle tank',
  'a heavy battle tank with a long cannon pointing up',
  'A wide, heavy main battle tank: broad tracks, round turret, one long cannon pointing straight up. The biggest, most armored-looking ground unit.',
  'one bright band ringing the cannon near the muzzle',
  'Teal hull and turret #3FB9C9, dark charcoal tracks #2C3036, off-white turret ring #E8E4D8, one amber band #F0C86A around the cannon near the muzzle.',
  'hull and turret become red #E0564A, turret ring becomes charcoal #3A3F45, the muzzle band becomes hazard yellow #F2B63D.',
  [(TE['hull'], 'Hull · 75%', 'hull, turret'), ('#2c3036', 'Tracks', 'both sides'), (TE['trim'], 'Trim', 'turret ring'), (TE['acc'], 'Accent', 'muzzle band')],
  [(RU['hull'], 'Hull · 75%', 'hull, turret'), ('#2c3036', 'Tracks', 'both sides'), (RU['trim'], 'Trim', 'turret ring'), (RU['acc'], 'Accent', 'muzzle band')]),
U('apc', 'APC', 'Vehicle · armored bus for four infantry',
  'an eight-wheeled armored personnel carrier with a roof hatch',
  'A long eight-wheeled armored box with a prominent roof hatch and a rear ramp. Utility armor, not a gun platform - the tiny roof MG is barely visible.',
  'hazard chevrons on the rear ramp',
  'Teal armored hull #3FB9C9, four pairs of dark wheels, off-white roof hatch #E8E4D8, hazard-yellow chevrons #F2B63D painted on the rear ramp.',
  'hull becomes red #E0564A, roof hatch becomes charcoal #3A3F45; the rear chevrons stay hazard yellow.',
  [(TE['hull'], 'Hull · 75%', 'armored box'), (TE['trim'], 'Hatch', 'roof center'), (HAZ, 'Hazard', 'rear chevrons'), ('#2c3036', 'Wheels', '8 wheels')],
  [(RU['hull'], 'Hull · 75%', 'armored box'), (RU['trim'], 'Hatch', 'roof center'), (HAZ, 'Hazard', 'rear chevrons'), ('#2c3036', 'Wheels', '8 wheels')]),
U('artillery', 'Artillery', 'Vehicle · long-range siege gun, the nest-cracker',
  'a tracked siege gun with a very long barrel pointing up on a narrow chassis',
  'A narrow tracked carriage dwarfed by its own barrel - the cannon should be nearly as long as the chassis. Reads long and thin next to the tank.',
  'two bright bands ringing the long barrel',
  'Teal narrow chassis #3FB9C9, long steel barrel #9AA0A6 with two amber bands #F0C86A along its length, charcoal tracks and recoil rails #3A3F45.',
  'chassis becomes red #E0564A, the barrel bands become hazard yellow #F2B63D; steel barrel and tracks stay.',
  [(TE['hull'], 'Hull · 60%', 'chassis'), (STEEL, 'Steel', 'long barrel'), (TE['acc'], 'Accent', 'barrel bands'), (GUN, 'Rails', 'tracks, rails')],
  [(RU['hull'], 'Hull · 60%', 'chassis'), (STEEL, 'Steel', 'long barrel'), (RU['acc'], 'Accent', 'barrel bands'), (GUN, 'Rails', 'tracks, rails')],
  note='Also save copies as unit_artillery_hunker_teal.png / _red.png (dug-in pose: add small stabilizer legs splayed out).'),
U('rig', 'Capture Rig', 'Vehicle · unarmed science truck that captures live dinos',
  'a mining truck chassis carrying a large cage of pale bars on its flatbed',
  'The harvester chassis, but the bed carries a big rounded CAGE of pale bone-white bars. Unarmed, scientific, slightly comical - a dogcatcher truck for dinosaurs.',
  'the bone-white cage with a faint green glow between the bars',
  'Teal cab #3FB9C9, bone-white cage bars #E8E2CC over the bed with a faint venom-green glow #A8D060 inside, hazard-striped front bumper #F2B63D, dark tires.',
  'cab becomes red #E0564A; the cage, glow, and hazard bumper stay exactly the same.',
  [(TE['hull'], 'Cab · 55%', 'front chassis'), (BONE, 'Cage', 'bed, bars'), (VEN, 'Glow', 'inside cage'), (HAZ, 'Hazard', 'front bumper')],
  [(RU['hull'], 'Cab · 55%', 'front chassis'), (BONE, 'Cage', 'bed, bars'), (VEN, 'Glow', 'inside cage'), (HAZ, 'Hazard', 'front bumper')]),
U('gunship', 'Gunship', 'Air · fast attack helicopter, terror of slow armor',
  'an attack helicopter seen from directly above with stub wings and a slim tail boom',
  'An attack helicopter from above: slim fuselage, two stub wings with rocket pods, thin tail boom. Keep the rotor blades THIN and semi-transparent so the body reads underneath.',
  'the amber sensor ball on the nose',
  'Teal fuselage #3FB9C9, off-white stripe along the tail boom #E8E4D8, amber nose sensor ball #F0C86A, dark gunmetal rotor and rocket pods #3A3F45.',
  'fuselage becomes red #E0564A, tail stripe becomes charcoal #3A3F45, sensor ball becomes hazard yellow #F2B63D.',
  [(TE['hull'], 'Hull · 70%', 'fuselage, wings'), (TE['trim'], 'Stripe', 'tail boom'), (TE['acc'], 'Accent', 'nose sensor'), (GUN, 'Gunmetal', 'rotor, pods')],
  [(RU['hull'], 'Hull · 70%', 'fuselage, wings'), (RU['trim'], 'Stripe', 'tail boom'), (RU['acc'], 'Accent', 'nose sensor'), (GUN, 'Gunmetal', 'rotor, pods')]),
U('harrier', 'Harrier', 'Air · strike jet - one devastating bomb per sortie',
  'a delta-wing VTOL strike jet seen from directly above, nose up',
  'A sleek delta-wing jet from above: triangular wings, pointed nose at the top, two visible engine intakes near the wing roots.',
  'two glowing engine intakes near the wing roots',
  'Teal delta wings and body #3FB9C9, off-white wingtips #E8E4D8, two glowing amber engine intakes #F0C86A near the wing roots, dark canopy #3A3F45.',
  'body becomes red #E0564A, wingtips become charcoal #3A3F45, intakes become hazard yellow #F2B63D.',
  [(TE['hull'], 'Hull · 75%', 'delta body'), (TE['trim'], 'Wingtips', 'both tips'), (TE['acc'], 'Accent', 'intakes'), (GUN, 'Canopy', 'cockpit')],
  [(RU['hull'], 'Hull · 75%', 'delta body'), (RU['trim'], 'Wingtips', 'both tips'), (RU['acc'], 'Accent', 'intakes'), (GUN, 'Canopy', 'cockpit')]),
# ------------------------------------------------------------ buildings
B('hq', 'Headquarters', 'Building · the heart of the base - lose it, lose the game',
  'a large octagonal sci-fi command headquarters building with a central reactor dome',
  'A big octagonal command center seen from above: layered roof plates around a glowing central reactor. The most important-looking building in the game. NO flag - the game draws faction banners itself.',
  'the glowing crystal-teal reactor core at dead center (both teams - everyone mines the same crystals)',
  'Deep teal roof plates #2F97A6 in octagonal layers, off-white walkway trim #E8E4D8, a glowing crystal-teal reactor core #6FE3D0 at the center, small amber warning lights #F0C86A at the corners.',
  'roof plates become dark corporate red #B8443A, walkway trim becomes charcoal #3A3F45; the teal reactor core stays.',
  [(TE['bld'], 'Structure · 75%', 'roof plates'), (TE['trim'], 'Trim', 'walkways'), (CRY, 'Reactor', 'center glow'), (TE['acc'], 'Accent', 'corner lights')],
  [(RU['bld'], 'Structure · 75%', 'roof plates'), (RU['trim'], 'Trim', 'walkways'), (CRY, 'Reactor', 'center glow'), (RU['acc'], 'Accent', 'corner lights')]),
B('barracks', 'Barracks', 'Building · trains all infantry',
  'a square military barracks building with a striped awning over its main door',
  'A squat square barracks from above: flat roof with vents, a clearly visible striped awning over the door on the bottom edge.',
  'the striped awning over the door',
  'Deep teal roof #2F97A6, an awning striped off-white and amber (#E8E4D8 / #F0C86A) over the bottom door, charcoal roof vents #3A3F45.',
  'roof becomes dark red #B8443A, the awning stripes become charcoal and hazard yellow (#3A3F45 / #F2B63D).',
  [(TE['bld'], 'Structure · 75%', 'roof, walls'), (TE['trim'], 'Awning A', 'stripe 1'), (TE['acc'], 'Awning B', 'stripe 2'), (GUN, 'Vents', 'rooftop')],
  [(RU['bld'], 'Structure · 75%', 'roof, walls'), (RU['trim'], 'Awning A', 'stripe 1'), (RU['acc'], 'Awning B', 'stripe 2'), (GUN, 'Vents', 'rooftop')]),
B('factory', 'Factory', 'Building · builds all ground vehicles',
  'a wide rectangular vehicle factory with a large hazard-striped bay door',
  'A wide industrial factory from above: big rectangular footprint (wider than tall), large vehicle bay door on the bottom edge with a hazard-striped lintel, steel rooftop machinery.',
  'the hazard-striped bay door',
  'Deep teal roof #2F97A6, a big bay door on the bottom edge with a hazard-yellow and black striped lintel #F2B63D, steel rooftop vents and pipes #9AA0A6.',
  'roof becomes dark red #B8443A; the hazard bay door and steel machinery stay.',
  [(TE['bld'], 'Structure · 70%', 'roof, walls'), (HAZ, 'Hazard', 'bay door'), (STEEL, 'Steel', 'vents, pipes'), (GUN, 'Door', 'bay panel')],
  [(RU['bld'], 'Structure · 70%', 'roof, walls'), (HAZ, 'Hazard', 'bay door'), (STEEL, 'Steel', 'vents, pipes'), (GUN, 'Door', 'bay panel')]),
B('supply', 'Supply Depot', 'Building · raises the supply cap; repairs nearby buildings',
  'a small square supply depot: an open storage pad stacked with crates and barrels',
  'An open-air storage pad from above: neat stacks of crates and barrels on a plated pad. Logistics, not fortification.',
  'natural wood-and-steel crates - cargo looks the same on every team',
  'Deep teal pad plating #2F97A6 with one off-white trim band #E8E4D8 across the top edge, natural wooden crates #A9825A and steel barrels #9AA0A6 stacked on it.',
  'pad becomes dark red #B8443A, the trim band becomes charcoal #3A3F45; crates and barrels stay natural.',
  [(TE['bld'], 'Structure · 60%', 'pad plating'), (TE['trim'], 'Trim', 'edge band'), ('#a9825a', 'Wood', 'crates'), (STEEL, 'Steel', 'barrels')],
  [(RU['bld'], 'Structure · 60%', 'pad plating'), (RU['trim'], 'Trim', 'edge band'), ('#a9825a', 'Wood', 'crates'), (STEEL, 'Steel', 'barrels')]),
B('power', 'Power Plant', 'Building · feeds the grid - fragile, precious',
  'a compact power plant with a central reactor dome and two cooling stacks',
  'A compact power station from above: one glowing dome in the middle, two round cooling stacks in a corner, thick cables.',
  'the glowing amber coil ring around the dome',
  'Deep teal housing #2F97A6, a glowing amber coil ring #F0C86A around the central dome, steel cooling stacks #9AA0A6, charcoal cables #3A3F45.',
  'housing becomes dark red #B8443A; the amber coils and steel stacks stay.',
  [(TE['bld'], 'Structure · 65%', 'housing'), (TE['acc'], 'Coils', 'dome ring glow'), (STEEL, 'Steel', 'stacks'), (GUN, 'Cables', 'ground runs')],
  [(RU['bld'], 'Structure · 65%', 'housing'), (RU['acc'], 'Coils', 'dome ring glow'), (STEEL, 'Steel', 'stacks'), (GUN, 'Cables', 'ground runs')]),
B('refinery', 'Refinery', 'Building · crystal drop-off - the expansion building',
  'an octagonal crystal refinery with a glowing intake hopper and external piping',
  'An octagonal processing plant from above: a glowing crystal intake hopper on one side, pipes wrapping the roof.',
  'the crystal-teal glow of the intake hopper (both teams - the crystals glow, not the faction)',
  'Deep teal octagonal body #2F97A6, a glowing crystal-teal intake hopper #6FE3D0 on one edge, steel piping #9AA0A6 across the roof.',
  'body becomes dark red #B8443A; the crystal glow and steel piping stay.',
  [(TE['bld'], 'Structure · 70%', 'octagon body'), (CRY, 'Intake', 'hopper glow'), (STEEL, 'Steel', 'piping'), (TE['trim'], 'Trim', 'edge walkway')],
  [(RU['bld'], 'Structure · 70%', 'octagon body'), (CRY, 'Intake', 'hopper glow'), (STEEL, 'Steel', 'piping'), (RU['trim'], 'Trim', 'edge walkway')]),
B('airpad', 'Airpad', 'Building · builds and rearms aircraft',
  'a square aircraft landing pad with a painted H and a small control kiosk',
  'A flat landing pad from above: big painted H with a circle, small control kiosk in one corner, landing lights along the edges.',
  'the white H and pad ring - flight markings look the same everywhere',
  'Deep teal pad #2F97A6, bright white H and landing circle #F2F2EE painted on it, a small kiosk with an amber beacon #F0C86A in one corner.',
  'pad becomes dark red #B8443A, beacon becomes hazard yellow #F2B63D; the white flight markings stay.',
  [(TE['bld'], 'Structure · 70%', 'pad'), ('#f2f2ee', 'Markings', 'H + circle'), (TE['acc'], 'Beacon', 'kiosk light'), (GUN, 'Kiosk', 'corner box')],
  [(RU['bld'], 'Structure · 70%', 'pad'), ('#f2f2ee', 'Markings', 'H + circle'), (RU['acc'], 'Beacon', 'kiosk light'), (GUN, 'Kiosk', 'corner box')]),
B('turret', 'Turret (base only)', 'Building · base defense - THE GAME DRAWS THE GUN',
  'a small round gun turret mounting base with NO gun - an empty armored ring with a center socket',
  'IMPORTANT: base only, no gun barrel. A small round armored mounting ring with a center socket - the game draws a separate rotating gun on top.',
  'the empty center socket (the game\'s rotating gun sits there)',
  'Deep teal armored ring #2F97A6, steel center socket #9AA0A6, one small amber status light #F0C86A on the rim.',
  'ring becomes dark red #B8443A, status light becomes hazard yellow #F2B63D.',
  [(TE['bld'], 'Structure · 75%', 'armor ring'), (STEEL, 'Socket', 'center mount'), (TE['acc'], 'Status', 'rim light')],
  [(RU['bld'], 'Structure · 75%', 'armor ring'), (STEEL, 'Socket', 'center mount'), (RU['acc'], 'Status', 'rim light')]),
B('flak', 'Flak Turret (base only)', 'Building · anti-air battery - THE GAME DRAWS THE GUNS',
  'a small square anti-air mounting platform with NO guns - an armored plate with a center socket and a tiny radar dish',
  'IMPORTANT: base only, no guns. A square armored platform with a center socket and a small radar dish on one corner - the game draws twin rotating AA guns on top.',
  'the tiny radar dish - reads "anti-AIR" without any guns',
  'Deep teal square platform #2F97A6, steel center socket #9AA0A6, a small steel radar dish on one corner, amber status light #F0C86A.',
  'platform becomes dark red #B8443A, status light becomes hazard yellow #F2B63D.',
  [(TE['bld'], 'Structure · 75%', 'platform'), (STEEL, 'Socket + dish', 'center, corner'), (TE['acc'], 'Status', 'rim light')],
  [(RU['bld'], 'Structure · 75%', 'platform'), (STEEL, 'Socket + dish', 'center, corner'), (RU['acc'], 'Status', 'rim light')]),
B('silo', 'Missile Silo', 'Building · the endgame - THE GAME DRAWS THE WARHEAD',
  'a round missile silo with closed steel blast doors and a hazard ring painted around them',
  'A heavy round silo from above: CLOSED steel blast doors at center (no missile visible - the game draws the warhead when armed), a painted hazard ring around the doors, armored rim.',
  'the hazard-striped ring around the blast doors',
  'Deep teal armored rim #2F97A6, closed steel blast doors #9AA0A6 at center, a hazard-yellow and black ring #F2B63D painted around the doors, small amber warning lights #F0C86A.',
  'rim becomes dark red #B8443A; the steel doors and hazard ring stay.',
  [(TE['bld'], 'Structure · 65%', 'armored rim'), (STEEL, 'Doors', 'closed, center'), (HAZ, 'Hazard', 'painted ring'), (TE['acc'], 'Lights', 'warning dots')],
  [(RU['bld'], 'Structure · 65%', 'armored rim'), (STEEL, 'Doors', 'closed, center'), (HAZ, 'Hazard', 'painted ring'), (RU['acc'], 'Lights', 'warning dots')]),
]

# spitter: wild + tamed recolor
SPITTER = {'name': 'Spitter (wild + tamed)', 'tag': 'Dino · venom-spitting pack wildlife - and hatchable ally',
  'group': 'Dino',
  'subj': 'a small raptor-like dinosaur with a bulging venom throat sac',
  'subj_full': 'A small two-legged raptor-like dinosaur from directly above, head at the top, long tail behind: pale bone hide, moss back stripes, and a clearly bulging venom sac at the throat. Wildlife, not a monster - keep it a little cute.',
  'sig': 'the bright venom-green throat sac + amber eyes',
  'colors': 'Pale bone hide #C2BB96, moss-green back stripes and tail bands #5F5C3E, a bulging bright venom-green throat sac #A8D060, small amber eyes #E0A43C.',
  'recolor': 'the bone hide becomes teal #3FB9C9; the moss stripes, venom sac, and amber eyes stay exactly the same.',
  'file_teal': 'unit_spitter_wild.png', 'file_red': 'unit_spitter_teal.png',
  'sw_teal': [('#c2bb96', 'Hide · 70%', 'body, head'), ('#5f5c3e', 'Stripes', 'back, tail'), (VEN, 'Venom', 'throat sac'), ('#e0a43c', 'Eyes', 'both eyes')],
  'sw_red': [(TE['hull'], 'Hide · 70%', 'tamed: teal'), ('#5f5c3e', 'Stripes', 'back, tail'), (VEN, 'Venom', 'throat sac'), ('#e0a43c', 'Eyes', 'both eyes')],
  'note': 'Colorway A is the WILD dino (file: unit_spitter_wild.png). Colorway B is the player-tamed version (file: unit_spitter_teal.png) - a recolor of the same sprite.'}

GUNART = {'name': 'Turret Gun (overlay)', 'tag': 'Overlay · the rotating gun the game draws on turret/flak bases',
  'group': 'Overlay',
  'subj': 'a standalone twin-barreled turret gun assembly pointing up, no base, no platform',
  'subj_full': 'Just the gun: a compact rotating turret gun assembly seen from above, barrels pointing up, mounted on nothing (transparent all around). The game composites it onto the turret and flak bases and rotates it.',
  'sig': 'clean silhouette on full transparency - no base pixels at all',
  'colors': 'Teal gun housing #3FB9C9, dark gunmetal barrels #3A3F45, one small amber band #F0C86A at the barrel base.',
  'recolor': 'housing becomes red #E0564A, band becomes hazard yellow #F2B63D; barrels stay gunmetal.',
  'file_teal': 'turret_gun_teal.png', 'file_red': 'turret_gun_red.png',
  'sw_teal': [(TE['hull'], 'Housing', 'gun body'), (GUN, 'Barrels', 'pointing up'), (TE['acc'], 'Band', 'barrel base')],
  'sw_red': [(RU['hull'], 'Housing', 'gun body'), (GUN, 'Barrels', 'pointing up'), (RU['acc'], 'Band', 'barrel base')]}

for e in ENTRIES:
    sheet(e)
sheet(SPITTER)
sheet(GUNART)

c.save()
print('wrote %s (%d pages)' % (OUT, PAGE_NO[0]))
