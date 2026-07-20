# Voice lines — drop-in slots

AI-voiced dialogue for campaign lines. Missing file = silent typewriter text,
exactly as before — every clip is independent and optional.

## Workflow

1. Open the game in a browser, open the console, run `CC.exportVoiceScript()`.
   It downloads `voice-script.tsv`: every line in every mission with its
   speaker, context (briefing / intro / trigger / outro), **target filename**,
   and the text to read.
2. Generate each line in your voice engine (one consistent voice per
   character — save the exact voice settings so lines generated later match).
3. Save each clip under its filename from the script into this folder.
   Formats tried in order: `.mp3`, `.ogg`, `.wav`.

Filenames look like `red_1a2b3c4d.mp3` — speaker + a hash of the line text.
**Rewording a line in game.js changes its hash**, which correctly orphans the
old clip: re-export the script and re-generate just the changed lines
(diff the old and new TSV).

## Playback behavior (already wired)

- A voiced line holds the dialogue bar for the clip's length (text pacing is
  the floor); briefing lines wait for their clip before the next line types.
- Skipping a briefing, quitting, or a backlog fast-forward cuts the clip —
  radio discipline, clips never overlap.
- Pause / help modal pauses the voice with the sim; `M` mute silences it.
- Master volume: `VOICE_VOL` in game.js (0.9).

## Engine notes

- Keep one voice per character across ALL missions. Document voice + settings
  here once chosen:
  - ops / Cpt. Vega: _TBD_
  - sci / Dr. Lin: _TBD_
  - red / Cdr. Krauss: _TBD_
- Verify the plan's commercial-use license before shipping (the game is paid).
- MP3 ~64-96kbps mono is plenty for radio-flavored dialogue; Act 1 is ~100
  lines ≈ 10-20MB.
