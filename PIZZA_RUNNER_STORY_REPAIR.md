# Pizza Runner story repair handoff

Status: Living design notes from the plot discussion. This is a theoretical repair brief for a future coding agent, not authorization to implement changes yet. Add decisions as the conversation continues.

## Handoff scope and iteration goal

The eventual coding agent should take a first pass at names, individual voices, dialogue, commentary triggers, sound details, and GUI layout within this brief. These remain **refined placeholders**, not final writing or design. The immediate goal is a playable pass with slightly less wrong dialogue, so the user can play through it and discover what inspires the next revision. Unspecified details need not all be resolved before that pass. No implementation is being performed during this discussion.

## Character continuity

The same pizza character returns for its HQ cutscene after delivery. Do not introduce a replacement character or surviving-teammate explanation to resolve the disappearance. Preserve this convention alongside the finite-slice GUI and implied eating joke; no additional in-world explanation has been requested.

## Source context

Repository: https://github.com/fredcai6/pizza-runner

Current writing is primarily in `js/content.js`; HQ scene presentation is in `js/hq.js`. The current route is New York → Chicago → Washington, DC → Naples → Long Beach, with DJ Alewife at the final door. The repository README identifies story text as draft.

## Confirmed creative direction

### Discussion workflow

- Build a brief scene-by-scene outline first, then double back to develop specific dialogue and details. Do not treat illustrative lines as finished scripting.

### The Order is the Old Timer's conspiracy theory

- The Old Timer forces the plot forward through his conspiracy thinking.
- In reality, there is no established conspiracy or organization called The Order. The customers sharing variations of Caitlin's name is a coincidence.
- At minimum, the game must not confirm his belief in The Order. His interpretation is not an objective statement of the world's truth.
- Give the concept of The Order more focus as his organizing obsession, while preserving that distinction.

### Let the player discover what delivery means

- The Old Timer tells the recruits they are going undercover, including “deep undercover.”
- The player should infer from context that delivered recruits are being eaten.
- Remove the opening recruit's explicit “Are we... being eaten?” exchange and repair the surrounding dialogue. It explains the joke too directly.
- Preserve the gap between the Old Timer's mission language and what the player understands. Do not replace the removed line with another explicit explanation.

### Save the stale punchline

- The current first-scene “I'm too stale for this” spends the punchline too early.
- The desired wording is “I'm too stale for this shit.”
- Place it right before the cut to Long Beach, at the end of scene five. The coding agent can draft the surrounding setup as a refined placeholder.

## Implementation implications for the eventual agent

### Opening scene: confirmed sequence and intent

The opening should provide more exposition and establish the mission through the Old Timer's briefing. The user's spoken examples convey semantic intent, not approved final dialogue. Rewrite them through the character voices before implementation.

1. The Old Timer welcomes the new recruits to Pizza HQ and runs through some basic housekeeping. Specific housekeeping details remain unwritten.
2. He reminds them that they are going **deep undercover** to find The Order.
3. He claims The Order is linked to mysterious slice disappearances across the world, and charges the recruits with solving the mystery. This is his theory, consistent with the unconfirmed conspiracy framing above.
4. The Neapolitan pizza reacts with a comic exclamation, along the lines of “Mamma mia.” The exact line is provisional.
5. A “pipe down” response reins in the interruption. Exact wording and speaker remain to be settled.
6. The New York slice responds with bravado. Its exact line remains unwritten.
7. The Old Timer turns that bravado into an assignment: he is glad the slice feels brave, because it is going on the first mission.
8. Cut to New York.

### Character voices

- Establish a distinct voice for the Old Timer and each of the four pizzas; pass all eventual dialogue through those voices.
- Give all four pizzas some individual character rather than treating them as a single generic recruit voice.
- New York: bravado is established for its opening response; a fuller voice definition is still needed.
- Neapolitan / Margherita: a comic reaction is established for the opening; “Mamma mia” is an example, not a complete voice specification.
- Deep Dish and Jumbo: individual voices still to be defined.
- Old Timer: mission briefing and command authority drive this opening; a fuller voice specification is still to be defined.

### Squad introductions and names

- Include an **Ocean's Eleven–style squad introduction** within the Old Timer's briefing: he is introducing the recruits to one another, rather than presenting a separate introduction sequence.
- Overall opening structure: **introduce the problem → introduce the team → launch the first mission**. Integrate the earlier opening beats into this structure.
- Tentative ordering: introduce New York last. Its bravado then gives the Old Timer the immediate opening to assign it the first mission and cut to New York. The user proposed this ordering with “maybe,” so retain it as the preferred working arrangement rather than locked dialogue or staging.
- Develop deliberately over-the-top character names for the pizzas. No names have been selected yet.
- “Mr. New York” was a working example during discussion, not an approved name.
- For New York's introduction, explore an exaggerated, stereotypical New York / from-the-streets persona and a comic introductory line. Exact wording remains unwritten.
- Use the introductions to establish individual voices and personalities. Exact introduction order for the other three pizzas and the placement of the Neapolitan interruption remain to be worked out within the briefing.

### Cross-scene review

- Review briefings, delivery scenes, return dialogue, corkboard theories, clues, and the finale for accidental confirmation of the conspiracy or explicit explanation of the eating joke.
- Attribute conspiracy claims to the Old Timer's perspective. The board can reflect his beliefs; its contents should not automatically establish them as facts.
- Do not turn ordinary deliveries into evidence proving The Order exists merely to make the investigation advance.
- The coding agent can draft replacement dialogue and unspecified presentation details as refined placeholders; preserve the agreed opening beat sequence above.

## Working cutscene outline

### 1. Opening briefing → New York

- Establish Pizza HQ and the Old Timer's disappearance / Order theory.
- Introduce the squad within his briefing, provisionally ending with New York.
- New York's bravado earns it the first assignment; cut to New York. See the opening notes above for supporting beats.

### 2. New York returns → intel and dossiers

- New York comes back and reacts to what it experienced outside. The spoken example was transcribed as “it's all out there”; exact meaning and final wording remain to be developed.
- The Old Timer responds along the lines of “These jobs aren't for the **limp crusted**.” The user explicitly corrected “light crusted” to “limp crusted”; preserve that correction.
- He frames the work as collecting intel, leading into the corkboard presentation.
- The board already contains intel from previous missions. This scene should draw attention to that material, rather than suggest the board begins empty.
- Explicitly point out dossiers for each enemy type.
- The corkboard also contains information about each pizza character. Exact fields, wording, and presentation remain unspecified.
- The board's timing and emphasis should support this intel introduction. Whether it is entirely hidden before this scene has not been decided.
- Stage this introduction as a **pan across the corkboard**.
- The corkboard functions as an interactive menu for the player. The cutscene briefly directs the player there to read the latest intel; it need not recite every dossier.
- In the briefing's voice, refer to the enemies as suspected “agents of The Order.” This is the Old Timer's interpretation, not confirmation of an actual organization.
- Consider one or two throwaway lines casting teenagers and turtles as agents of The Order, with notes about behavior the team has observed. Exact jokes and wording remain open.
- Ground behavioral intel in observed behavior; distinguish those useful observations from the Old Timer's conspiratorial explanation of them.
- Specific pan beats, with final dialogue still to be written in the Old Timer's voice:
  - **Teenager dossier:** warn recruits not to let teenagers photograph them; if they get a picture, more teenagers will be waiting the next time the recruit comes around. Convey the gameplay consequence through the briefing.
  - **Turtle dossier:** they move slowly, but the Old Timer has seen them take a bite out of many a tough slice. The user's trailing phrase was unfinished; do not invent an additional consequence or punchline from it.
  - **Ninja and mutant tease:** the Old Timer mentions troubling reports, and the camera pans quickly across a ninja Polaroid and a mutant Polaroid. Keep this brief; no additional behavior explanation is needed here.
- End the exposition after that tease. The Old Timer turns to Deep Dish: it is its time to shine, and it should head out to see what else it can dig up about The Order. These are semantic dialogue notes, not final lines.
- Transition into Deep Dish's Chicago mission. This completes the working outline for scene two.

### 3. Deep Dish returns → Jumbo to DC

- Deep Dish returns shaken and acknowledges that the boss was not lying about the dangers outside. It reports being chased by some sort of mutant. Exact dialogue remains provisional.
- The Old Timer slams his fist on the table and launches into a pseudo-patriotic response: these threats are why they work long and hard to keep pizzas in hot ovens, protecting the families back home.
- Lean into his military-style, “families at home,” rah-rah rhetoric. The user's attempts at the hot-oven line are semantic sketches; develop the joke through his voice rather than locking either attempt as final wording.
- **“Families” means pizza families:** slices of pizza together, warm and cozy in their boxes. This is the domestic image behind his protection rhetoric, not human families waiting for a delivery. Preserve this meaning when developing the speech.
- He turns to the similar customer names: they are suspicious, so this must go “all the way to the top.” This is his conspiratorial leap, not new proof.
- He assigns Jumbo to “go shake down DC.” Exact surrounding wording remains open.
- Transition into Jumbo's Washington, DC mission.

### 4. Jumbo returns → Naples

- Jumbo returns diminished / battered, with a line along the lines of “I'm a fraction of my old self.” Final wording depends on its still-undefined character voice.
- It reports that every one says “Original Italian” (the wording on the boxes).
- The Old Timer interprets this as a reason to go back to where it all started: Naples. Preserve the leap of logic as his interpretation.
- Smash cut to Naples. Keep this scene straightforward and brief.

### 5. Battered team at HQ → Long Beach

- Return to Pizza HQ (final HQ naming remains open). All the slices sit together looking beat up.
- The Old Timer stands and announces that he thinks they have found the destination / head of The Order: all the orders seem to lead to one house in Long Beach, California, and the “top Caitlyn.”
- This remains his theory, not an objective confirmation of a conspiracy.
- He declares that this will take a team effort and sends all four out to find out where it leads.
- Cut to Long Beach and proceed to the final delivery / ending.
- Land “I'm too stale for this shit” immediately before the cut to Long Beach.
- **Needs development:** the user finds this setup less compelling than the other scenes. Preserve its purpose and team-effort direction, but revisit the connective logic and dramatic / comic payoff during the dialogue pass. Do not treat it as a finished solution.
- **Explicit open question:** what makes the Old Timer point to Long Beach? The user has not settled this connection. Any agent-proposed bridge must be marked provisional and must not validate the conspiracy.

### Ending

- The Old Timer holds a Polaroid of DJ Alewife and says “Know thy enemy.”
- Cut to a “To be continued...?” card, including the question mark.
- Include side notes / links such as “Listen to DJ Alewife here” and a happy-birthday message to Caitlin. Verify the intended spelling for the final birthday card; the current repository uses “Katelyn.”
- Do not add dialogue or a reveal that validates The Order merely because Alewife appears in the photo.

## Dialogue presentation: retro game feel

- Give text boxes more of an old-school Nintendo / retro video game feel.
- Reveal dialogue character by character with a typewriter effect.
- Support bold emphasis on selected words within dialogue.
- These are presentation requirements, not finalized typography, timing, or interaction specifications.
- Give each pizza a distinct text-reveal / typing “dit” sound so New York, Chicago, and the other characters sound more personal as their dialogue appears. Exact sound design remains open; this is text accompaniment, not a request for recorded voice acting.

## Pizza commentary during play

- Have the pizza characters comment along the way during gameplay, using their individual voices.
- Identify key gameplay events that should trigger commentary during the next design pass. The event list, lines, frequency, and presentation have not yet been chosen.

## Main GUI: whole-pizza life display

- Add a life / reserve display on the main gameplay GUI that depicts a whole pizza.
- Visually remove slices as they are delivered or eaten, making the diminishing pizza visible to the player.
- Exact placement, styling, and mapping to the existing reserve / delivery state remain to be specified. Preserve the contextual eating joke; the visual does not require an explicit explanatory label about being eaten.

## Confirmed visual repair: corkboard

- Remove the recursive picture of the corkboard inside itself. The user finds the recursion unnecessarily weird and does not see a useful payoff.
- In `js/hq.js`, the current `board()` renderer draws nested versions of the board inside its photo. Replace that recursive presentation while preserving the useful intel / dossier role.
- Replacement image or layout is still to be designed. Do not infer that all photographs or the eventual Alewife portrait must be removed.

## Open discussion

- Final opening wording and pacing within the agreed sequence.
- Character voice definitions for the Old Timer and all four pizzas.
- The pizzas' over-the-top names and individual introduction beats; working order ends with New York.
- The setup for the stale punchline immediately before Long Beach (placement is settled).
- How each city develops the Old Timer's obsession without validating it.
- Corkboard layout, pizza character information, and how scene two highlights enemy dossiers; removal of the recursive image is confirmed.
- Final encounter and ending treatment.

## Review criteria

- A player can understand the Old Timer's theory without the game endorsing it.
- The eating realization comes from context rather than an explicit recruit question or explanation.
- The stale line is absent from its current early placement and saved for a deliberate payoff.
- The opening establishes HQ, the undercover assignment, and the Old Timer's disappearance theory, then uses New York's bravado to launch the first mission.
- Dialogue examples are rewritten in the established character voices before implementation.
- Future additions distinguish confirmed decisions from unresolved ideas.
