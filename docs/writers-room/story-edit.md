# Story-editor check: Pizza Runner showrunner cut

**Verdict:** the script mostly makes sense now. The causal chain holds: the ticket gives "The Order", Vinny's missing slice gives the intel and the tape, Stan's chase gives the speech, the names give "the top", Phil's lids give Naples, and the spelling gives Long Beach. "Deep undercover" now has a working premise (under a cover, lid down). The problems below are a few "wait, what?" leaps, some rule leaks, and a few dropped threads. I read only the script text you pasted and did not open `content.js`.

## Ranked issues

1. **Eating leaks, against the hard rule.** The "What changed" section claims these are cut, but several remain:
   - Scene 1, Old Timer: "Some nights all that turns up is the crust." Leftover crust says something was eaten, and it is the strongest leak.
   - Naples, Nonna: "Who made this? Your mother? Tell her too much basil. ...Tell her nothing, is perfect." That is a flavour review of the food.
   - Scene 2, turtles: "take a bite out of many a tough slice." This may be legacy text, but it is still a bite.
   - Return `nemesisPower >= 2`: "Bigger means somebody fed it." This is a mild case. It reads as feeding the mutant, not eating slices.
   - Fixes:
     - Change the crust line to "Some nights all that turns up is the box."
     - Make the Nonna line about the delivery, for example "Tell her nothing, is perfect" with no basil. Or aim the basil joke at the pizza's history instead of the taste.
     - Change the turtle line to "take a swing at many a tough slice."

2. **"Nobody else says it. Yet." is ambiguous.** After "That's how good they are", "it" is unclear. It could mean the word "order", or the theory, or the noticing. Try "Nobody else has noticed. Yet."

3. **Scene 2 never names deep undercover for Vinny.**
   - The sticky note reads "Vinny's missing slice. No call = DEEP UNDERCOVER. Proud."
   - The scene only gives "Some of the best don't. These jobs aren't for the **limp crusted**." The phrase "deep undercover" is never attached to Vinny's lost slice, so the player has to infer it from a sticky note.
   - Add one beat after the limp-crusted line: "Silence from a slice? That's **deep undercover**."
   - This also does a lot of work in a scene that is otherwise mostly the board gags.

4. **"Why Chicago" is thin.**
   - "Chicago's next. I need something that digs." / "I'm a dish. I don't dig." / "Second City. Dig anyway."
   - "Second City" does not answer "I don't dig". It reads as filler, and the player never learns why Chicago, as opposed to why Stan.
   - The strongest link is already in the world: deep dish and deep undercover.
   - Try "Deep undercover needs a deep dish." / "I'm a dish. I don't dig." / "Dig anyway." / "...Fine."

5. **The stale-line placement claim is wrong.**
   - Section 5 says "I'm too stale for this shit" "is now the end of the whole story". It is actually the last line of the Scene 5 briefing, the same place as in the current script.
   - The line itself lands well on the 1987 setup, and "1987" is a good gag. Just correct the changelog.
   - There is also a mild contradiction: "I left the building." and then "I've been in this box since before you were dough." Pick one, for example "Not since 1987."

6. **The "Original Italian" rebuttal doesn't cover Stan's box.**
   - Contessa says "It is printed because it is true. Is a fact, not a clue. Everybody knows where I'm from."
   - Stan then says "Mine too", so a Chicago box says Original Italian. That is not true, and her defence only covers her own box, so the Old Timer's point stands unchallenged.
   - This is not fatal, because the Old Timer's logic is meant to be shaky. But a player may wonder why only the Naples slice defends it.
   - "Then you won't mind going home" is also a loose connective. Try "Then you won't mind us checking the source."

7. **Stan's "You weren't lying, boss" has no setup.** Scene 2 contains no warning to Stan about mutants. Either Stan overheard Vinny's report in that scene, or change the line to "Vinny wasn't lying."

8. **"Fire up the oven" is unclear.** In `left === 2`, "Don't make me fire up the oven." could mean baking new slices or something sinister. Say "Don't make me bake more of you." Or cut the line.

9. **Dropped or unpaid threads:**
   - Scene 2 `boardTease`: "I don't like the other reports. Read the **corkboard**." Nothing follows from it. Pay it off, for example with a sticky or a Long Beach callback, or cut it.
   - "Phil is the slice who reads the fine print" is only established in Scene 4. Plant it in Scene 1, for example "Reads every lid. Twice."
   - The string: "I'm getting to the string" is a callback to nothing, and "Ran out of string" is gone. It works as a pun, but it is a one-off.
   - Vinny's "never been indoors" is set up and never paid.
   - The Old Timer's "down to his last slice" is paid only by "Kid, I know the feeling" in the `left === 1` return. That return is the one good payoff.

10. **Scene length is over budget, and the opening carries a lot.**
    - The opening runs about 28 lines over 7 compositions. Squad intros are allowed, but "Whole pies, gone in a night" and "Most come back with a report" could merge.
    - Scene 2 is about 18 lines over 6 compositions. The three board sub-compositions (`boardTeen`, `boardTurtle`, `boardTease`) are the cuts to make first.
    - Scene 5 is about 16 lines over 4 compositions. Cut "Look at you. Look at what's left of you." or merge it into the next line.
    - Scene 3 is 13 lines, which is acceptable.

11. **Small premise nits that could still draw a "wait, what?":**
    - "Three houses" in Long Beach. The stops are a fountain handoff, a lifeguard tower and a bungalow, so say "Three stops."
    - Naples instruction "Il forno sa." gives no direction. It is untranslated and does not tell the player where to go. It reads as the Old Timer speaking Italian, and its joke only pays off in the Fisherwoman's reply.
    - Georgetown: "Security will wave you through. Nobody will mention it." The second sentence is a non sequitur.
    - Federal Triangle: "You were never here. Neither was the pizza." This works as a joke.
    - Scene 3 patriotic speech: "a family sleeps warm" first reads as a human family, then flips to a pie. That flip is the joke, and it works. But "They sleep warm because you stand out there in the cold" blurs who the deliverer is protecting. Keep it as is if the flip is intentional.

12. **Open question 4 (casserole) is already answered.** Each city's slice delivers in its own city, as the returns show. So Stan makes every Chicago delivery, and "Ooh, a casserole!" always lands. Keep it, and drop the question.

## Joke premises that hold

These are good, and I would keep them:
- **"It's printed right on the ticket. That's how good they are."** The ticket word is mundane, and the misreading is his.
- **"Under a cover. Lid down. Nobody asks a box what's inside."**
- **"Has anybody tried? Provin' it?" / "That's how they get you."** The unfalsifiable gag is established cleanly. It returns in Scene 5 as "That's exactly what she'd want you to think."
- **"Nobody spells their own name six ways. That's not a name. That's a cover with a typo."**
- **"You're the size of a door."**
- **"Honest things announce themselves constantly. This is Italy."**
- **"Or she's just a person who can spell."**
- **The 1987 exchange.**

## Voice consistency

Each voice is consistent, with a few light spots.
- **Vinny** is consistent. He uses "a" for "of" ("scared a nothin'", "some a me"), says "boss", and has "I fold for nobody". His "I ain't sayin' I'm rattled" tic appears once, which is fine. "I mean, it could be a popular name, boss" is the plainest line he has.
- **Stan** is consistent with "...Fine" and the pauses. "Mine too. I figured it was a font." is slightly more chatty than his flat voice, but it works. As the Scene 5 skeptic he sounds sharp rather than aggrieved, but the skeptic role needs that.
- **Contessa** keeps the dropped articles and the "Mamma mia" rationing, and her homesick softening lands in Scene 4. Her Scene 5 line "Sì. You, who send us out. You come, yes?" is a little stiff.
- **Phil** is consistent. The voice sheet says his speeches are "cut off at the first comma", but in the scenes he is cut off only once. In Scene 3 the Old Timer lets him go ("Go."). That still works as a joke.
- **Old Timer** is consistent. He ends beats on "Next." / "Think about it.", and the warmth flashes are in place.

## Rule check

- **Confirms The Order:** no. The Scene 4 and Scene 5 pushbacks do not debunk him either. Good.
- **Eating:** see issue 1.
- **Line length:** no line is over about 110 characters. The longest Contessa line, "It is printed because it is true. Is a fact, not a clue. Everybody knows where I'm from. I tell them.", is about 101.
- **Scene length:** see issue 10.
- **Cut post-city scene:** not reintroduced.
- **Bench:** no bench-dependent line. The Pigeon Lady's "Past the fountain" is safe.

## The Long Beach bridge

**It works, as his reading and not as proof.**
- The chain is clear: twelve different spellings, then one spelled right, so the disguise is dropped at home.
- It uses the Old Timer's own rule that evidence against the theory counts double. Stan's skeptic line gets turned back into suspicion, and nothing is confirmed.
- Two small fixes:
  - Change "Three houses" to "Three stops".
  - Make clear whether "she" is The Order or one operative. At the moment "The Order" and "she" are both in play, so a short line such as "She is the Order's name on the ticket" would tidy it. Otherwise leave it, since the ending is a personal enemy and the Polaroid scene gives it its beat.

## Open questions

- The ticket art needs to show "ORDER". If it does not, the Scene 1 line falls back to "Nobody else says it. Yet." with the ticket line removed.
- Confirm that "Original Italian" is on every box in the art.
- Whether CITY_LOST can be chosen per pizza is a code question.