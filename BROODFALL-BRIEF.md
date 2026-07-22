# Broodfall — rename brief & market strategy (2026-07-23)

Status: **LOCKED 2026-07-23 — the game is Broodfall.** Rename executed same day
(game strings, mac/ project + bundle id `com.bronsongannon.broodfall`, repo →
github.com/bronsongannon/broodfall, campaign M10 "Broodfall" title drop, M20
"Heartvein"). ap2 (App Store Connect record) is unblocked — create it as
Broodfall.

**Business model locked (Bronson, 2026-07-23):** free = first 3 campaign
missions + 1 skirmish map; $9.99 one-time unlock for the full game (Apple
stores: free app + non-consumable IAP; Steam: free demo app + paid app). DLC
mission packs planned as ongoing revenue; **Broodfall 2** (new planet, new
conflicts, same style) is the franchise plan.

**Open decision — flag before v1 listing copy is written:** the earlier "tease
then deliver" plan promised Acts 2–3 as FREE updates; the new DLC-revenue idea
can conflict with that. Recommended resolution: keep Acts 2–3 free (review
velocity + goodwill are worth more than early DLC dollars at this scale; DLC
attach rates for premium indies run ~10–30% of base sales), and make PAID DLC
the post-campaign content: new campaigns, challenge packs, maybe a playable
dino faction — with Broodfall 2 as the real second revenue event. Decide
before writing store copy so we never promise the acts twice.

## Why rename at all

- "Crystal Command" collides with an existing Steam game (2019, strategy-action)
  and — worse — **Crystal Commanders**, an actively-marketed Meta Quest RTS.
  Same-genre near-identical name: they'd have the priority claim, not us.
- The original C&C-initials worry is legally weak (nobody owns "Command" in the
  genre) — the real collisions above justify the rename on their own.

## Name vet: Broodfall

- **Clean**: no game, app, or trademark hit anywhere for the word.
- **"BROOD WAR" is a registered Blizzard trademark (1998), same genre.** Low
  risk — shares only the generic word "brood"; games named *Brood* already
  coexist. RULES: never use "brood war" as a phrase in any marketing copy;
  never ape StarCraft trade dress.
- Marvel's "The Brood" (X-Men villains): different market, generic word,
  non-issue.
- *Thronefall* adjacency: "-fall" suffix reads as modern indie strategy —
  mildly helpful shelf positioning.
- Campaign implications when locked: Act 3 keeps or renames "Broodfall"; the
  title drop moves from M20 to M10 (the fall itself). M20 needs a new title.

## Synopsis (store-listing seed)

A crystal rush has come to the frontier world of a thousand nests. You command
a mining expedition racing the ruthless Rubicon corporation for the richest
veins on the planet — harvest crystal, raise a base, and field tanks,
artillery, and gunships in a classic-style RTS built for 20–30 minute battles.
But every claim staked and every nest cracked stirs something older than
either company. Across a 20-mission campaign, a corporate turf war becomes a
fight for survival: you'll watch your rival's army fall to the brood, escort
his survivors through hunting grounds, and return to a hive grown from his
ruins, where the planet's Heart Crystal waits.

*Broodfall* is the moment the game turns — the fall of a human army to the
brood, witnessed live in the campaign's centerpiece mission. One word carries
the store pitch ("classic RTS meets Jurassic Park"): creatures, swarms, and
something that fell.

## Competitive landscape & attack plan

**The window: Dinolords stumbled.** The most-hyped dino RTS (Northplay/Ghost
Ship, PC Gamer darling) missed its Q2 2026 Early Access window and is
overhauling its engine (July 2026). It's PC-only and a lord-control hybrid.
Two years of press taught the market to want a dino RTS; nothing shipped. Own
"dinosaur RTS" on storefronts they don't serve (Mac App Store, iOS) before
they exist.

| Competitor | Weakness | Our wedge |
|---|---|---|
| Dinolords | delayed, engine rework, PC-only | shipped, Mac/iOS, classic command |
| Thronefall | predefined layouts, no army micro, thin | free-form bases + micro + campaign: "your next game after Thronefall" |
| They Are Billions | punishing restarts, hour-long losses | difficulty options, 15–30 min missions, charm, dads-and-kids |
| Crystal Commanders | headset-only MR | the flatscreen answer (and post-rename, no collision) |
| C&C (EA) | dormant, absent from Mac App Store | the nostalgia IS the pitch; empty Mac RTS shelf = discoverability |

Ethical framing: serve their unserved segments, don't attack. Channels:
storefront keywords (dinosaur RTS / base building / RTS Mac), free demo
funnel, real gameplay posts in r/RealTimeStrategy + r/macgaming. **Steam is
the eventual revenue unlock** — that's where these audiences live; sequence it
after Mac App Store v1.

## Monetization: premium + free-to-try. NOT freemium.

- F2P dominates mobile scale but requires live-ops/servers/content treadmill —
  antithetical to hobby-pace + offline + "collects nothing."
- Audience (nostalgic 30–50, parents) is the most freemium-averse segment.
- Proof case: **Northgard iOS — $8.99 flat premium, successful** (Playdigious
  port after 2M+ PC sales).
- Model: Mac $9.99 (decided earlier, stands). iOS: free download = first 3
  campaign missions + 1 skirmish map; single one-time unlock ~$7.99. No ads,
  ever. No consumable IAP, ever. Free content updates (Acts 2–3) are the
  marketing beats.

## iOS plan

- Same codebase, same WKWebView wrapper approach as mac/. Bundled-in-binary
  HTML5 is the safe side of App Store guideline 4.7 (which targets
  downloaded/streamed content); the bar is 4.2 minimum functionality, same as
  the Mac shell already clears.
- Real work = touch layer: tap-select + drag-box, touch command palette (the
  horizontal command bar is already thumb-shaped), pinch-zoom camera, hotkey
  alternatives. iPad-first; iPhone is a later design question.
- ~2–4 focused weeks. Universal purchase with the Mac app.
- **Sequencing: nothing starts until Mac v1 ships (Jul 31).** The dino-RTS
  window is even wider on iOS — nobody is shipping one there.

## Steam release — code checklist (sequenced after Mac App Store v1)

1. **Windows wrapper** (the big one — WKWebView is Apple-only): Electron
   recommended over Tauri for a game (bundled Chromium = identical renderer,
   audio, and perf on every machine; known-good Steam overlay). One repo,
   `steam/` next to `mac/`, same rsync-the-game-in pattern.
2. **Persistence bridge**: localStorage is wrong for Steam — move saves/settings
   behind a tiny storage abstraction (`cc.*` keys are already centralized) with
   backends: localStorage (web), file via IPC (Electron) → enables **Steam
   Auto-Cloud**. Do this once; Mac wrapper can adopt the same bridge later.
3. **Entitlement abstraction**: one `owns('full') / owns(packId)` API with
   per-store backends — StoreKit non-consumable (Apple), Steam appid ownership
   + `BIsDlcInstalled` (Steam DLC), all-unlocked (dev). Gate missions 4+ and
   locked skirmish maps through it. This is also the DLC architecture: mission
   packs are pure data (MISSIONS table) + an entitlement key.
4. **Demo**: Steam's model is a separate free Demo appid built from the same
   code with the gate forced shut — plan the build flag now.
5. **Achievements** (expected on Steam): stats system already tracks
   built/lost/kills/mined — bridge JS→IPC→steamworks.js. Design ~15
   achievements cheaply from existing stats + mission completions.
6. **High-refresh correctness — VERIFY BEFORE ANY STEAM WORK**: the sim is a
   60tps fixed-step loop driven by rAF; on 120–144Hz monitors (ubiquitous on
   Steam) confirm the accumulator holds 60tps and doesn't fast-forward the
   game. Also test ProMotion Macs for the same reason.
7. **Steam Deck**: defer. Runs via Linux Electron or Proton, but RTS controller
   support is a real project — mark Unsupported at launch; the eventual touch
   layer (iOS) and Deck UI share design work.
8. Logistics: $100 Steam Direct fee, builds via steampipe (depots per OS),
   store page needs capsule art + trailer (reuse DaVinci pipeline).

## Sources

- steamspy.com/app/1073850 (Crystal Command, 2019)
- crystalcommanders.com + uploadvr.com hands-on (Quest MR RTS)
- trademarks.justia.com/owners/blizzard-entertainment-inc-603558 (BROOD WAR)
- techtimes.com 2026-07-19 (Dinolords delay + engine overhaul)
- pcgamer.com Dinolords coverage
- newgamenetwork.com Thronefall review; metacritic.com They Are Billions
- playdigious.com Northgard iOS launch ($8.99 premium)
- developer.apple.com App Review Guidelines (4.7 / 4.2)
