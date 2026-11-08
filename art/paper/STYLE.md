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

## The recipe (settled on the New York cast, 2026-11-07)
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
