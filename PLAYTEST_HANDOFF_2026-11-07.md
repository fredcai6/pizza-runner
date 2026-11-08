# Pizza Runner playtest notes

This document is an ongoing handoff for a coding agent and script revision work. Capture actionable changes, positive feedback to preserve, and unresolved art or writing decisions. These are playtest observations, not verified code diagnoses. Do not invent exact dialogue where the transcript is unclear. No game changes have been implemented as part of this note-taking session.

## Opening and Pizza HQ

- Establish a consistent style for pizza faces; the Old Timer especially differs from the others.
- Replace the placeholder name “Old Timer” with a better character name.
- Change the first dialogue line from “New recruits, look at you, cold, plain, and full of hope” to “New recruits, look at you, warm, plain, and full of hope.”
- Simplify dialogue line two to exactly: “Welcome to Pizza HQ.” Remove the rest of that line.
- Rework the opening Pizza HQ framing so most of the pizzas are visible. User plans to provide a quick drawing of the desired shots.

## Dialogue pass

- Give the opening dialogue another writing pass overall.
- Rework or replace “They told you this was undercover work. They lied. This is deep undercover.” The joke feels weak, and its premise does not quite make sense to the user. No replacement chosen yet.
- Keep “Slices are vanishing all over the world.” User likes this line.
- Switch the wording around “somebody is giving the orders” / “I call them the order” to “Someone is pulling the strings.” Exact surrounding dialogue should be checked against the script.
- User generally likes the instruction to go out, get in close, and find out what is happening; the full line was not captured clearly.

## Cork board and Polaroids

- Create bespoke illustrations for each complete Polaroid, rather than putting a white border around the standard character illustration.
- Make the photos blurry and candid, as if someone photographed the subjects from the bushes.
- Make the cork board arrangement less neat and aligned, with a more organic composition.
- Move away from the current impression of geometric shapes placed over a background texture.

## Characters and camera

- Keep the zoom toward La Contessa, but adjust camera placement and framing so she is actually visible during it.
- Rework Big Stan’s face; the red nose looks strange. This belongs to the broader effort to unify the face style.
- Rename the Filibuster to “Phil A. Buster,” presented as three names.
- User wants to sketch their intended design for the Old Timer, alongside choosing a proper name for him.

## Receipts and menus

- Give receipts more texture and physical character; they currently read as a plain black box.
- Explore a slight curve and a few subtle stains on the receipts.
- Rework the menus, which currently feel too plain. User has additional ideas to share.
- For “Build Your Pie,” explore an old-school fighting-game character selection screen, with a pizza beside the selection interface showing its toppings.

## Map and environment

- Preserve the generally appealing map direction, but show only the next delivery destination on the map. Later feedback also requests markers for all locations where slices have been lost, with the last lost slice highlighted in particular. Treat lost-slice markers separately from delivery destinations; clarify what “last” means against the story/map context.
- Make maps resemble stylized street maps, with plausible street geometry and highlighted playable routes that follow the streets. Replace arbitrary curved routes and unrealistic bends.
- Fix background objects that are shaded or drawn as foreground silhouettes: a tree in the first level, a bicycle in a Brooklyn scene, and similar shadow shapes in Chicago. The Brooklyn bicycle also appears partly broken.
- Ground the Chicago scene visually; the player currently appears to hover over the street.
- Review background movement while stopped at delivery points. The shifting creates motion but looks odd; the final treatment is still an art-direction decision.
- General first-level presentation needs more character. A phrase in the feedback sounded like “Stan sheriff boringness”; its intended reference is unclear, so do not treat that phrase as a specific implementation request.

## Gameplay and HUD

- Rename the “Power” label to “Topping.”
- Revisit the little hands visually. User likes the underlying idea but not the current appearance; replacement design is undecided.
- Animate pepperoni projectiles with flipping, flopping, and apparent flex as they fly, instead of only rotating flat circles.
- Ensure the level start area is clear of enemies. Teenagers spawned directly on the player and caused immediate bite damage during this playtest.
- Preserve the new health system, which the user likes. Restyle the black health bar and the way health ticks down; the presentation should feel more integrated with the game's art.
- Give pizza special abilities a substantial cooldown and an obvious visual indication of cooldown progress. Exact timing is not specified.
- Make the pause control easy to access when the game is not fullscreen.

## Delivery scenes

- Preserve the large yellow delivery indicator, but rework the delivery sign and remove the “Deliver” text.
- Make delivery entrances specific to each location. The current generic foreground door feels disconnected from the background; user likes the door concept but wants it integrated into each scene.
- Resolve the mismatch where the Brooklyn or Central Park woman mentions sitting on a bench but is not shown on one. Confirm the relevant scene before editing.
- Position dialogue boxes so they do not cover the characters.

## Level transitions and Vinny Twofold

- Cut the post-level “three-eyed / nobody asks any questions, that's the worst part” cutscene. The quoted fragments identify the scene; check the actual script for exact wording.
- Cut the intermediate “On the way to Chicago” screen and go directly into the next full cutscene, such as Vinny Twofold's scene.
- Improve Vinny Twofold's pepperoni artwork in the cutscene.
- Correct the misrecognized “It's all out there” line to the intended “Boss, it's hell out there.”
- Preserve the second line beginning “I ain't saying I'm rattled…”; user likes it. The rest was unclear in the transcript and should be checked against the script.
- Keep the red yarn, but add more to its presentation. The phrase describing where more is needed was unclear; inspect the scene before choosing a treatment.

## Follow-up art direction

- Characters are improving; preserve that progress while developing a more coherent overall design and face style.
- Pending user input: opening-shot sketch, Old Timer sketch and name, additional menu ideas, and decisions on the hands, health presentation, and delivery background motion. See later feedback below for the Old Timer concept and context-specific positive feedback on hands.

## Later playthrough: gameplay and abilities

- Make jumping onto enemies more forgiving. The current collision/timing tolerance feels too strict; determine a suitable adjustment through playtesting.
- Toppings feel too similar in use. Explore more distinct behavior or feel, while treating this as a design observation rather than a request for a specific mechanic.
- The character/action transcribed as “jump off” appears to have too many legs while flailing. Identify the relevant animation before editing; preserve the flailing motion, which the user likes.
- User likes the sense of progression; preserve it.
- User likes the onions-and-garlic ability, but its effect does not extend far enough outward. Increase its reach and revisit the dull, generic yellow background/effect treatment. Confirm which visual element this refers to in-game.

## Later playthrough: art direction and anatomy

- Create a mood board and several bold design/style options to compare. Delivery recipients currently feel too generically AI-generated; aim for a cohesive visual identity across the game.
- User liked how the hands came out in a later scene. This is context-specific positive feedback and does not cancel the earlier concern about the little hands' visual design.
- Fix the surfer on the pier, who has an extra hand. Audit character artwork and animation for extra hands, limbs, and similar anatomy defects.
- User is willing to spend time evaluating better image models if needed to improve artwork. No model choice has been made; image generation is not part of this note-taking task.
- Fix Napoli's plants that look shaded as foreground objects despite being in the background, consistent with the earlier depth complaints.
- Revisit the clock tower in Long Beach; the user finds it out of place. Check the intended location and replace or remove the landmark as appropriate.
- Old Timer concept clarified: a pizza slice with an angry mustache and an old-school police hat. A final name and user sketch remain pending.

## Later playthrough: dialogue and order details

- For the character transcribed as “DJ Alyf,” simplify the dialogue to “Pizza party!” Confirm the character's actual identifier in the project.
- Change the associated order's delivery recipient name to “Katelyn,” explicitly spelled K-A-T-E-L-Y-N. The spoken “Caitlin” was corrected by that spelling.

## Suggested verification for the implementing agent

- Play the opening and confirm revised lines, character visibility during zooms, and unobstructed dialogue placement.
- Start a level repeatedly and confirm enemies do not overlap or immediately damage the player at spawn.
- Check that only the next delivery is marked and that highlighted routes follow the stylized street layout.
- Check delivery scenes for location-specific entrances, matching dialogue and scenery, and correct visual depth of background objects.
- Complete the first level and confirm the transition goes directly to the next full cutscene.
- Use a special ability and confirm cooldown progress is clear; check pause access in a non-fullscreen window.
