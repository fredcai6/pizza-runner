# Paper Theatre: the art direction (chosen by Tommy, 2026-11-07)

Every character is a flat card standee cut out with a white paper border, standing in a paper diorama.
Paper Mario's material, Charlie the Unicorn's faces. The test that chose it:
archerpeligo.club/analysis/pizza-runner-paper-theatre/ (sources in `art/tests/paper-theatre/`).
This replaces the pixel-mascot look in `art/characters/STYLE.md` for outlines, faces and backgrounds;
that file's rules on the 1:1 stage-pixel grid, sprite heights and no fake text still hold.

## The two masters
- `art/characters/slice-ny/references/paper-master.png` is Vinny, variant D: Tommy's pick. Every pizza and
  the old timer match it in material, border, shading and face formula.
- `art/characters/customer-newyork-wallstreet/paper-master.png` is the stockbroker, variant C: the look for
  every human (customers, teen, DJ Alewife).
- Both came from Qwen-Image-Edit 2511 editing the current art, with `art/paper/style_pm_sq.png` (or
  `style_pm_tall.png` for tall figures) as a style reference. The exact prompts are shots `slice_D` and
  `cust_C` in `art/tests/paper-theatre/runs/run.toml`; start from those. Klein washed out at game size:
  use Qwen.

## Characters
- A white sticker-style cut border around the whole silhouette, then a 1 px rim in #2a1830 outside it so the
  white holds against light streets. This replaces the 4 px near-black outline.
- Flat fills with at most one soft shade per colour. Saturated colour: the characters are the brightest,
  cleanest things on screen.
- Pizzas, recruits and the old timer get the deadpan face: two small blank black dot eyes, a flat or slightly
  bent line mouth, no brows. The old timer adds an angry mustache and an old-school police hat. Mood shows
  with the mouth line and the body, not with eye detail.
- Humans and enemies keep a readable, simple expression (the stockbroker yells). Same border, same flat fills.
- Sprite heights, 48-colour reduction onto the 1:1 stage grid, and anatomy checks (two arms, two legs, two
  hands) are unchanged. Pizzas still animate on the code rig (`forge.runrig`); humans still use pose guidance.

## Backgrounds: the paper diorama
- Each street layer is cut paper: flat shapes, soft pastel colour, a faint paper grain, gentle cut edges.
  No outlines heavier than a hairline, and no white border on scenery.
- Far: 2-3 pale tones. Mid: flat shapes with one shade. Near: a few paper cut-outs, coloured, never black.
- Only things you can touch get the white border and a drop shadow: platforms, barrels, barricades, doors,
  boxes. Scenery never does. This settles the "background drawn like foreground" complaints by rule.

## UI
- Cardstock and paper: menus are card tabs, dialogue boxes are paper cards with the white border and a small
  drop shadow, HUD pieces are stickers. The receipts, corkboard and Polaroids are already paper; bring them
  into the same palette.
- One readable rounded display font. The pixel font draws "C" like "O" and drops accents.

## No fake text
Unchanged: no model-drawn lettering may reach an asset. Prompt against it and inspect at 2x.

## Backgrounds recipe (settled on New York, 2026-11-07)
Scripts: `art/backgrounds/{paper_prep,paper_prep_props,paper_edit,paper,paper_near,paper_ny_build}.py`,
`newyork/make_paper_spec.py` (all prompts), `hq/make_paper_spec.py`, `hq/paper_build.py`. Picks in `paper_picks.json`.
- Qwen-Image-Edit 2511 edits the old layer (image 1) with `style_pm_sq.png` as image 2, prompt "Rebuild it as cut paper ... in
  the material of image 2". The input is first median-filtered and cut to 20 colours so the model has no pen lines to copy.
- Work at half scale (layer 1408x360 with a 128-column wrap overhang, 13 s). At 2560x720 the model re-inks every window; at half
  scale it draws bold flat shapes. Upscale 2x with Lanczos, key, then `tile_seam` cuts where the overhang closes.
- Far must be asked for as skyline only ("remove everything near the camera"): the old far layers were whole street scenes.
- Mid and doors go on magenta. `paper.key_rgb` measures the key colour (Qwen darkens it), `peel_halo` removes the white sticker
  border Qwen adds. Touchable things then get the build's own border (`paper.sticker`): 4 px white, 1 px #2a1830 rim, solid
  shadow, feet on the bottom row. Scenery gets none.
- Near is drawn in code (`paper_near.py`): Qwen turned dark clutter into big white-bordered stickers at the wrong scale.
- Paper grain is added after palette reduction (`paper.add_grain`, seeded white noise plus short fibres), so it survives.
- Hazard tape, door numbers and white highlight bricks read as letters: redraw or fill them (see `clean_tape`, `ERASE`).
