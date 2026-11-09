# Pizza Runner playtest handoff — November 8, 2026

Narrated playtest observations for a coding agent. Unclear wording and unverified diagnoses are explicitly marked. No game changes were implemented during this session.

## Playtest session — 2026-11-08

- Session scope: capture the user’s narrated gameplay observations and requested changes in this local repo handoff. Preserve positive feedback and unresolved questions, and distinguish observations from verified diagnoses. This session is note-taking only unless the user requests implementation.
- Awaiting playthrough observations.

### New game, layout, and fullscreen

- Add a new game logo to the to-do list. This is a future design task, not a request to produce it during this playtest.
- General UI rule: fit each screen into one screen without scrolling. Current scrolling is often unintuitive; reorganize layouts accordingly.
- Starting a new game immediately exits fullscreen. Fullscreen also cannot be entered during cutscenes; the user could only re-enter after gameplay started. Preserve fullscreen across the flow and make it accessible during cutscenes.
- Opening scene drags. Tighten/cut some bits while preserving the exposition of the problem and team introductions. Specific cuts have not been selected.

### Order screen, toppings, and corkboard

- The “Incoming order” button appears to do nothing. Remove it if it has no useful function; this is an observed behavior, not a verified diagnosis.
- Remove the extra copy approximately “Slice o’clock / classic pepperoni’s all the power you need”; check exact text in the UI.
- Rename “Build the pie” to “Choose your toppings.” Arrange the order, Choose your toppings, and Corkboard controls/content next to one another within a single screen.
- Keep the Corkboard even for the first order, although its utility there is unclear.
- User initially suggested switching the corkboard Polaroids to the other Polaroid images, then praised the currently displayed Polaroids and corkboard strongly. Preserve that positive direction; confirm which image set was on screen before replacing any images.
- First order having only pepperoni available was acknowledged as correct.
- Change “Pick the topping” to “Pick your topping.”
- Replace “Box it” with a clearer delivery call to action. User considered “Out for delivery” and leaned toward “Start delivery”; final choice is not fully settled.

### New York City map

- Straighter roads are a clear improvement and look more like roads; preserve that progress.
- Fix intersections appearing in the water and align the street layout better with New York’s diagonal geography.
- Route arrows appear to point the wrong way. The dashed Battery Park-to-first-recipient route (spoken as Caitlin; earlier handoff specifies Katelyn) runs against the delivery direction and has an odd upward blip and return. Check and correct route direction and geometry.
- Change map call to action “Deploy” to “Deliver.”
- Change location label “New York” to “New York City.”

### Gameplay HUD, text, and visuals

- User misses the pizza-style lives display. Explore dedicated pizza artwork for the lives indicator.
- User likes the current health bar and its thermometer-like shape. They suggested the end could simply be the six pizza slices; inspect the HUD to resolve the intended arrangement.
- Remove unnecessary HUD text/counter described as “slice topping pepperoni times two.” Check actual displayed labels before editing.
- Revisit the line approximately “It ran off crying. It will not be back.” User dislikes it. A nearby comment about a “rough location” and “turn off Broadway” was unclear; do not infer a specific text or positioning fix without context.
- Heat-line clarification: preserve the wavy heat squiggles, but change their fill to orange with thick white outlines to match the game’s paper-art style. User briefly mentioned red outlines before correcting to white. Current white squiggles with orange outlines look like steam and feel reversed. This refers to heat rising from the pizza, not ruled paper or notebook lines.

### Freeze during playtest

- Game froze during this playthrough after the map/HUD observations, around the narration mentioning Broadway and the little lines. Exact scene, trigger, and reproduction steps are not yet known. Record as a bug to investigate, not a diagnosed cause.

### Coding-agent priority summary — completed November 8 playthrough

1. Investigate repeated freezes and broken state around stopping, switching levels in playtest, pausing, and entering fullscreen. Special attacks also cause stutters.
2. Make every screen fit the players’ phone viewport without scrolling, especially delivery/order screens, Long Beach slice selection, and the corkboard. Preserve fullscreen and provide cutscene skipping.
3. Fix collision/obstacle grounding, Chicago clipping, ninja balance and damage registration, garlic/onion enemy coverage, mutant presence, and recipient-name consistency.
4. Run a dedicated writing pass to remove nonsensical dialogue and weak UI copy. Preserve the stronger art improvements; address specific effects and cutscene composition below.
5. Future assets: new logo and Sergeant Day-Old alone at a desk examining a Polaroid. Longer-route hard mode is a deferred idea, not current implementation scope.

### Additional stability, navigation, and layout observations

- Map streets bounce between colors with no understandable meaning. Remove unnecessary color changes or make any retained meaning clear.
- A severe freeze/broken state happened again: stopping may freeze things, then jumping to another level causes further problems. User restarted everything. This is a tentative reproduction hypothesis.
- More concrete repeat: entering playtest, pausing, then going fullscreen caused the game to break again. Prioritize reproducing this sequence; exact cause unverified.
- Title tagline “You have been deployed” is disliked. Remove the tagline entirely.
- Main-menu calls to action are confusing and excessive (described as four lines). Simplify toward two main choices: start delivery and continue. User also wanted to go straight into playtest during this session; exact permanent playtest-menu treatment needs interpretation against the current UI.
- Add a small Skip cutscene button, especially accessible in playtest. A later spoken “skip playtest” appears to refer to this same cutscene skip request.
- Delivery screens stack too much vertically to fit a phone screen. Reorganizing all content to fit one screen is the main overall priority.
- Corkboard is poorly fitted to the phone screen. Red strings overlap the selected/open ninja note; put the active note above strings so it is readable.
- Optimize for the actual phone size used by both players. User described the same latest Android/Pixel phone for both, with uncertain model/version (“Android 11 … Pixel 11 or whatever”); do not treat that as a confirmed device model. Obtain real viewport dimensions when verifying.
- Long Beach has too many slices/options to fit and requires scrolling; explicitly cover this case in the layout pass. A following “Margherita” fragment did not include a complete request.

### Collision, enemies, abilities, and effects

- Jumping onto some obstacles leaves the player visibly too high above the surface. Inspect sprite/collision alignment.
- Hazard-guy/unbreakable-box feedback was partly unclear. User identified boxes in the way as unbreakable; verify intended breakability and readability rather than inventing a mechanic change.
- Chicago clipping is particularly severe when Stan stands on a yellow object. Inspect this scene and grounding/overlap.
- Remove the unexplained little yellow circle underneath Stan and the meaningless flying circles; identify their effect sources in-game.
- Remove the red circle around Stan when using Slam.
- Remove/rework the vibrating circle behind Slam that keeps building up; user dislikes this accumulating/pulsing presentation.
- Garlic/onion ability appears ineffective against turtles and possibly ninjas. It should work against all enemy types. User suggested, as a humorous design option, making ninjas run away entirely.
- No mutants were encountered during the entire playtest. Ensure mutants appear, since they are central to the premise; do not assume an exact spawn bug without inspecting encounters.
- Ninjas should take one or two hits; three feels too difficult.
- In DC, a ninja waits on the highest part of a jumping obstacle and Jumbo Slice cannot get past it. Fix this blocking encounter. User considered a broader rule against combining jumping obstacles and ninjas but did not settle on a blanket prohibition.
- Two rapid consecutive hits on a ninja appear to register only the first. Investigate hit feedback and damage/invulnerability timing; user finds the ignored second hit annoying.
- User dislikes railings above doors. Review placement/treatment in the relevant delivery environment.
- Special attacks against enemies cause noticeable game stutters. Investigate performance or intentional hit-stop; cause is not established.
- Burning-barrel artwork/effect is visually unappealing; rework its look. No replacement design chosen.

### Writing and cutscene pass

- Schedule another writers-room-style revision focused on nonsensical lines and generic filler. This request records future work; no separate agent was launched.
- Weak commentary examples: “pepperoni three uses” and “warm again for now.” Check exact strings and their context.
- Big Stan is a promising character whose writing needs work. “I’m a dish, I don’t dig” makes no sense to the user, and the following “fine” response also falls flat; check exact dialogue.
- Other disliked/meaningless lines: “Nothing honest announces itself,” “Tell her nothing is perfect” (approximate fragment), and “you never leave the building.” Locate exact script passages before revising.
- The ellipsis-like “dun dot, dot dot dot, okay” call to action is weak; inspect actual displayed text rather than treating this transcript fragment as an exact quote.
- In the second cutscene, use the existing Sergeant Day-Old fist-slamming sticker. Reserve his saluting image for losing a level.
- Review cutscene composition generally, especially return scenes. Dialogue covers a character’s face in the return scene showing Phil A. Buster bitten/eaten; fix text placement and framing.

### Final deliveries and ending art

- “Delivered to [name]” can show a different name from the person just served. Fix recipient data/copy consistency throughout the game.
- Preserve the final house artwork: user likes that it resembles their home without reproducing it exactly, and does not want an exact depiction of their actual house.
- Preserve Katelyn’s portrait/screen artwork. User likes it; hair is a little large but acceptable. Spoken Caitlin/Caitlyn refers to the recipient previously explicitly spelled Katelyn; verify identifiers before changing text.
- Flashing light should originate at the top of the screen, rather than around the middle. Identify the effect in this final sequence.
- Remove the remaining sign/blank sign area in scenes showing people in front of doors; it wastes space and detracts from the scene.
- New art request: Sergeant Day-Old alone at a table/desk, holding or staring at a Polaroid. Use this for the ending beat described as “know thy enemy” (transcribed “no thy enemy”; verify intended caption).
- For “To be continued,” show a Polaroid of Katelyn standing in front of the house. Existing portrait/house imagery may provide the basis; do not invent an additional scene requirement.

### Preserve and defer

- User says much of the game looks substantially better; retain the successful visual improvements along with specific praise recorded above.
- Entire playthrough took roughly fifteen minutes. User appreciates the short length.
- Possible future hard mode selectable from the main page, primarily with significantly longer routes. User explicitly does not want to do this yet; keep it in the backlog.
- All entries are narrated playtest observations and design requests. No gameplay implementation or confirmed root-cause diagnosis was performed in this note-taking session.
