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

### Rolled out to the other cities (2026-11-07)
`paper_build.py CITY OUT` builds Chicago, DC, Naples and Long Beach with the New York steps (specs: `make_paper_spec_rest.py`,
second-pass shots: `make_paper_fixups.py`, picks and cleared boxes: `paper_picks_rest.json`). Findings that changed the recipe:
- A far layer carries no near-black: `lift_dark` pulls a model-drawn black tower to a slate. Far also drops any band of dark hills or houses
  along its bottom edge by choosing the seed that has none.
- The Loop's elevated railway is drawn in code (`paper_near.elevated_line`) and goes behind the mid buildings; Qwen drew it as floating
  lilac pillars once keyed. `BEHIND` in `paper_build.py` lists such pieces per area.
- Anything a back layer must not contain (a clock tower, potted plants) is asked away in a second-pass prompt, or cut with a `clear` box.
- Grounds differ per area (slabs, bricks, cobbles, sand) but every one starts with a cut line on its first row, so the street reads as
  starting at y 600, where the mid's street line sits and the characters' feet sink 8 px.
- Shared props (`paper_props_shared.py`) and topping pickups are drawn in code at 1:1; pickups are sticker discs with the topping drawn large.
- `shoot_areas.js` and `seams.py` make the review screenshots: each area in play, each door scene and each wrap point.

## Characters recipe (settled on the New York cast, 2026-11-07)
Tools live in `art/paper/`: `paperkit.py` (frames and masters to sheets), `pizzarig.py` (pizza run on the code rig),
`paperpose.py` (humans on a pose skeleton). Run them with `FORGE_PROJECT=art PYTHONPATH=~/projects/sprite-forge`
and sprite-forge's venv.
1. **Master:** Qwen-Image-Edit 2511 on the current art plus `style_pm_sq.png` (`style_pm_tall.png` for tall figures). Generate 3 seeds
   of 1-2 prompt variants in one job and pick one. Pick on: dot eyes, no brows, no lettering, two arms and two legs, flat fills.
   The model's own white border is welcome but not needed: the next step normalises it.
2. **Frames:** every other pose is Qwen on the finished master plus the same style reference, with the master named "image 1"
   and the paper look restated. Pizzas run on the code rig; humans walk and flee on a pose skeleton (`paperpose.py`).
3. **Reduction (`paperkit.py`):** key the figure off the magenta backdrop; peel the model's white border (near-white pixels connected
   to the outside, up to twice its measured width) so every frame is borderless; reduce with one 48-colour palette from the master
   and one scale for all frames; then add a 4 px (3 px under 110 px tall) #fbf6ea border and a 1 px #2a1830 rim in code. The border is
   code-made on every frame, so a pose the model drew without one still has it.
4. **Frame heights:** figure plus border plus rim fills the canvas height of the old art (hero 124, old timer 130, teen 118,
   turtle 92, customers 150), so collision and the game's foot-pad grounding are untouched.
5. **Check:** every frame at 2x for extra limbs, lettering and stray cast shadow before it is imported.

## Rest of the cast (settled 2026-11-07)
Same recipe, plus what the other twenty characters taught. Specs are scripts, not hand-edited tomls: `make_rest_spec.py` (masters, Polaroid prompts),
`make_rest_frames.py` (key poses), `make_rest_anims.py` (anim files with the picked shot/seed), `pick.py` (copies a pick in with its record and job).
- **Image 1 is the finished paper art, never the old pixel art, for a pizza.** With the pixel master as image 1 the model kept the old brows and big
  cartoon eyes (Stan, Phil); with Vinny's paper master as image 1 and the new character described in words, the dot-eye face came back every time.
  Humans (customers, ninja, mutant, DJ Alewife) are fine with the old art as image 1.
- **No pink or magenta on a figure.** The backdrop key is magenta: Lincoln Park's pink top and sneakers were keyed away with it.
- Recruits are the picked pizza master redrawn as plain cheese; their idle is the master held with a settle (no extra key poses).
- paperkit frame keys: `clip` (paint over everything below a height, for a pose the model drew resting on a ledge), `rot` (turn the source picture),
  `own_palette` (a recoloured pose such as cold cuts its own 48 colours; the master's palette has no blue).
- Decals: a pose rotated or squashed past forge.decals' registration range keeps its toppings (see the jumbo flop); use an upright pose before it.
- Candid Polaroids: `polaroids.py` (generation to `assets/polaroids/TYPE.png`, softened). DJ Alewife's ending photo is `alewife_polaroid.py`: the model drew pixel art
  and a laptop logo, so the room is drawn in code around her master.

## Tommy's character sheets (2026-11-08)
Tommy drew model sheets for Vinny, Phil, Big Stan, La Contessa and Sergeant Dayold (`references/sheet.png` in each folder: turnaround, expressions,
idle/run/jump/land poses). **They are the masters now**: where a sheet and the rules above disagree (faces: open smiling mouths, oval eyes, brows
on Contessa and Dayold; a bold brown outline and soft shading inside the white border), the sheet wins. Vinny has no sheet yet.
- `sheetcut.py` cuts the poses (seeds in `characters/NAME/sheet.toml`) onto magenta for paperkit, all on one drawing scale (the sheets draw the
  pose row smaller than the turnaround: `row_scale`), with leaps capped to the master's height so nothing is cut off by the frame.
- The front pose is the master (idle, and the body the code rig runs). Jump, fall and special come straight from the sheet's jump and land poses.
- paperkit's `presample = true` box-averages onto the stage grid before the palette vote: the sheets' smooth shading otherwise turns into a dot grid.
- What the sheets do not draw is Qwen with the sheet pose as image 1 and the sheet itself as image 2 (`make_sheet_runs.py`): cold poses, Dayold's
  talk and squint, the plain recruits, and Phil and Vinny without their printed pepperoni (toppings are the player's pick; painting them out in
  code tore Phil's face). Their front is a redraw (`plain_front`, it comes out larger: the leaps carry `scale` to match); their jump and land are
  an *edit* prompt with the pose as the only image (`edit_jump`, `edit_land`): told to redraw, the model stood him up again.
- A rig whose body rides above the frame: lower `[gait] hip` (the body is placed so the hip sits a leg above the ground).
- Cutscenes: Tommy paints them; `assets/cutscenes/NAME.webp`, shown by a `pic` shot with an eased `pan` (js/hq.js). The corkboard stays procedural.
- Rig limbs are the sheets' dark brown (`[limb]` in each `rig/run.toml`); the rig runs without a bob because the master fills the frame height.
