// Everything a writer would touch lives here. All dialogue is first-draft placeholder
// unless the handoff quotes it as settled. Long Beach specifics are still to come.
(function (root) {
  const TOPPINGS = {
    pepperoni: { name: 'Pepperoni', color: '#c8321e', kind: 'shot', blurb: 'Fires pepperoni straight ahead.' },
    jalapeno: { name: 'Jalapeño', color: '#3f9b35', kind: 'bounce', blurb: 'Bouncing fireballs.' },
    garlic: { name: 'Onion & garlic', color: '#e6dfb8', kind: 'aura', blurb: 'A stank that hurts whatever stands in it.' },
    mushroom: { name: 'Mushroom', color: '#9c7b5e', kind: 'leap', blurb: 'A huge jump, even in midair.' },
    basil: { name: 'Basil', color: '#2f7d3a', kind: 'reheat', blurb: 'Restores heat.' },
    pineapple: { name: 'Pineapple', color: '#f2c531', kind: 'scatter', blurb: 'Three shots at once.' },
    sausage: { name: 'Sausage', color: '#7a3b22', kind: 'slam', blurb: 'A shockwave along the ground.' },
  };

  // height is the art's height. w and h are the body it collides with.
  const STYLES = {
    ny: { bio: 'Off the streets. Fears nothing, says so often.', name: 'Slice', speed: 7.4, accel: 0.9, decel: 1.1, jump: 23, gravity: 1.05, fall: 1.05, maxFall: 24, spring: 0.22, damp: 0.72, heatDecay: 1, heatMax: 100, height: 124, w: 72, h: 96, blurb: 'A classic. Pepperoni is all the power you need.' },
    deep: { bio: 'Heavy. Sauced. Holds a grudge about casseroles.', name: 'Deep Dish', speed: 5.7, accel: 0.32, decel: 0.42, jump: 19.5, gravity: 1.3, fall: 1.7, maxFall: 30, spring: 0.16, damp: 0.7, heatDecay: 1, heatMax: 100, height: 170, w: 104, h: 132, stomp: true, sauce: true, special: 'pound', specialName: 'SLAM', blurb: 'Enormously heavy. Slow to start, slow to stop, barely leaves the ground. SLAM from the air.' },
    jumbo: { bio: 'Far too big. Will speak at length if not stopped.', name: 'Jumbo', speed: 6.5, accel: 0.42, decel: 0.3, jump: 22, gravity: 1, fall: 0.3, maxFall: 6.5, spring: 0.09, damp: 0.86, flop: 1, heatDecay: 1, heatMax: 100, height: 240, w: 150, h: 186, special: 'pound', specialName: 'FLOP', blurb: 'Far too big. Drifts down like a wet napkin. FLOP flattens whatever is underneath.' },
    naples: { bio: 'Certified. Quick. Cools fast, tells you so anyway.', name: 'Margherita', speed: 9.6, accel: 1.5, decel: 1.5, jump: 23, gravity: 1.05, fall: 1.1, maxFall: 24, spring: 0.3, damp: 0.66, heatDecay: 1.55, heatMax: 100, height: 106, w: 60, h: 80, special: 'dash', specialName: 'DASH', blurb: 'Small, quick, and cools fast. DASH barrels through anything.' },
  };

  // Route is New York to Long Beach. Each city's pizza brings its signature topping; the rest are collected
  // as pickups on the street. A pie can wear any topping unlocked so far (R.menu).
  const CITIES = [
    {
      id: 'newyork', name: 'New York City', style: 'ny', seed: 23, stretch: 3900, gap: 720,
      signature: 'pepperoni',
      mix: ['teen', 'teen', 'turtle', 'teen', 'turtle'], pickups: ['pepperoni'],
      areas: [
        { id: 'wallstreet', name: "Wall Street", palette: { skyTop: '#8fa3bb', skyBottom: '#e6d9c6', ground: '#6d6a68', top: '#8d8983' },
          customer: 'K8lyn', who: 'Stockbroker', instructions: 'Leave it at the door. Do not ring, do not linger. He bills by the second.',
          door: [{ who: 'customer', text: "I'm on with Tokyo! SELL! SELL! ...Not you, pizza. You I'm buying." }] },
        { id: 'centralpark', name: "Central Park", palette: { skyTop: '#9cc3d6', skyBottom: '#eee8c8', ground: '#7d8a5a', top: '#a3ab7a' },
          customer: 'Cat Lynn', who: 'Pigeon Lady', instructions: 'Past the fountain. Follow the pigeons. She will know.',
          door: [{ who: 'customer', text: "The pigeons said you'd come. They're never wrong. They owe me money." }] },
        { id: 'brooklyn', name: "Brooklyn", palette: { skyTop: '#c9a6a0', skyBottom: '#f3dcc0', ground: '#6f5b56', top: '#94807a' },
          customer: 'Katelynnnnn', who: 'Local Artisan', instructions: 'Gluten is fine. Irony is fine. Ring twice.',
          door: [{ who: 'customer', text: 'Is this sourdough? I ferment my own, actually. Bagel the dog says thank you.' }] },
      ],
      briefing: [

        // Scene 1 is Tommy's paintings (assets/cutscenes), panned (`pic` in js/hq.js), and his painted board room.
        { comp: 'board', lines: [
          { who: 'old', text: 'New recruits. Look at you. Warm, plain, and full of hope. Welcome to Pizza HQ.' },
          { who: 'old', text: 'Slices are vanishing all over the world. Whole pies, gone in a night. Someone is pulling the strings.' },
          { who: 'old', text: 'I tapped the dispatch line. Every vanishing starts with a ticket that says **ORDER**. I call them **The Order**.' },
          { who: 'old', text: "You go **undercover**. Under a cover. Lid down. Nobody asks a box what's inside." },
          { who: 'old', text: "Most come back with a report. The best don't come back at all. That is **deep undercover**. So get in close and find out who." },
        ] },
        { pic: 'recruits-table', pan: [[0.17, 0.46, 1.6], [0.21, 0.43, 1.75]], ms: 6000, card: ['La Contessa', 'Margherita of Naples'], cardSide: 'right', lines: [
          { who: 'old', text: 'La Contessa. Fastest thing in the oven. Cools just as fast. Certified a pizza by a government.' },
          { who: 'naples', text: 'Ninety seconds in the fire. You would not last **nine**.' },
        ] },
        { pic: 'recruits-table', pan: [[0.82, 0.46, 1.6], [0.86, 0.43, 1.75]], ms: 6000, card: ['Big Stan', 'Deep Dish of Chicago'], lines: [
          { who: 'old', text: 'Big Stan. Two inches of sauce, four inches of grudge. Slow to start. Slower to stop.' },
          { who: 'deep', text: "I'm not a casserole." },
          { who: 'old', text: "I didn't say you were." },
          { who: 'deep', text: 'Someone would.' },
        ] },
        { pic: 'recruits-table', pan: [[0.37, 0.42, 1.5], [0.42, 0.39, 1.65]], ms: 6000, card: ['Phil A. Buster', 'Jumbo Slice of Washington'], cardSide: 'right', lines: [
          { who: 'old', text: 'Phil A. Buster. Largest slice in the free world. Three names, because one would not hold him. Reads every lid. Twice.' },
          { who: 'jumbo', text: 'Thank you. I wish to yield my time to myself, for brief remarks on the subject of...' },
          { who: 'old', text: 'You may not.' },
        ] },
        { pic: 'recruits-table', pan: [[0.6, 0.46, 1.6], [0.64, 0.43, 1.75]], ms: 6000, card: ['Vinny Two-Fold', 'Slice of New York'], lines: [
          { who: 'old', text: 'And last, Vinny Two-Fold. Off the streets. Nobody would take him indoors.' },
          { who: 'ny', text: "Disappearances? Boss, that's a **Tuesday** where I'm from. I ain't scared a nothin'. I fold for nobody." },
        ] },
        { pic: 'vinny-new-york', lift: 0.1, pan: [[0.4, 0.5, 1.1], [0.62, 0.5, 1]], ms: 10000, lines: [
          { who: 'old', text: 'I like a brave slice. New York first. Nobody looks twice at a loud one.' },
          { who: 'ny', text: 'Wait, what?' },
          { who: 'old', text: "Lid's open. Get in the box." },
        ] },
      ],
    },
    {
      id: 'chicago', name: 'Chicago', style: 'deep', seed: 53, stretch: 3200, gap: 620,
      signature: 'garlic',
      mix: ['teen', 'turtle', 'mutant', 'teen', 'turtle'], pickups: ['sausage', 'pepperoni', 'garlic'], watchers: true,
      areas: [
        { id: 'loop', name: "The Loop", palette: { skyTop: '#7f98b3', skyBottom: '#d4dde0', ground: '#49545c', top: '#6c7a83' },
          customer: 'Kæthlynn', who: 'Da Gal', instructions: "Top floor. Keep the box level. The buzzer's broken. So is the elevator.",
          door: [{ who: 'customer', text: "Took yous long enough. Da Bears are on. You're blockin' da Bears." }] },
        { id: 'lincolnpark', name: "Lincoln Park", palette: { skyTop: '#a6c9d9', skyBottom: '#f0ead0', ground: '#6f8460', top: '#94a67e' },
          customer: 'Caytlinn', who: 'Jogging Mom', instructions: 'Hand it over while she moves. She does not stop.',
          door: [{ who: 'customer', text: "I'm on mile nine and I'm not stopping. Is it organic? Tyler, thank the pizza." }] },
        { id: 'wickerpark', name: "Wicker Park", palette: { skyTop: '#b39aa0', skyBottom: '#ecd5c0', ground: '#5d4e4c', top: '#83706c' },
          customer: "Kay T'Lynn", who: 'Bartender', instructions: 'Back door. Mind the porch stairs. Knock like a regular.',
          door: [{ who: 'customer', text: "Tavern's closed till four. Ooh, a casserole! ...No? Fine. I'm telling everyone it's a casserole." }] },
      ],
      briefing: [

        { pic: 'vinny-beat-up', lift: 0.12, pan: [[0.4, 0.5, 1.15], [0.46, 0.48, 1.04]], ms: 12000, lines: [
          { who: 'ny', text: "Boss. It's hell out there." },
          { who: 'ny', text: 'Teenagers. Turtles. Teenagers with cameras. I got my picture took four times.' },
          { who: 'ny', text: "And I ain't sayin' I'm rattled. I'm sayin' some a me didn't come back." },
          { who: 'old', text: "Some of the best don't. These jobs aren't for the **limp crusted**." },
          { who: 'old', text: "Silence from a slice? That's **deep undercover**. Intel goes on the board." },
        ] },
        { comp: 'board', sticker: 'pointer', lines: [
          { who: 'old', text: 'Every scrap we ever pulled is up here. A lot of good slices paid for this cork.' },
          { who: 'old', text: 'Anything out there is an agent of The Order until proven otherwise. Nothing has been.' },
          { who: 'ny', text: "Has anybody tried? Provin' it?" },
          { who: 'old', text: "That's how they get you." },
        ] },
        { comp: 'boardTeen', sticker: 'pointer', lines: [
          { who: 'old', text: '**Teenagers.** One picture, then more show up next time. Why would a teenager need that many?' },
          { who: 'old', text: 'Think about it.' },
        ] },
        { comp: 'boardTurtle', sticker: 'pointer', lines: [
          { who: 'old', text: "**Turtles.** Slow. But I've seen them take a bite out of many a tough slice." },
          { who: 'old', text: 'Slow is what they want you to think.' },
        ] },
        { pic: 'assign-chicago', lift: 0.1, pan: [[0.3, 0.5, 1.25], [0.64, 0.48, 1.1]], ms: 9000, lines: [
          { who: 'old', text: 'Big Stan. Chicago. Deep undercover needs a deep dish.' },
          { who: 'deep', text: "That's a pun, boss. You're sending me on a pun." },
          { who: 'old', text: "I'm sending you on a **plan**. The pun is a bonus." },
          { who: 'deep', text: "...Fine. I'm bringing the sauce." },
        ] },
      ],
    },
    {
      id: 'dc', name: 'Washington, DC', style: 'jumbo', seed: 41, stretch: 3500, gap: 600,
      signature: 'jalapeno',
      mix: ['ninja', 'teen', 'turtle', 'mutant', 'teen', 'ninja'], pickups: ['sausage', 'pepperoni', 'pineapple'],
      areas: [
        { id: 'georgetown', name: "Georgetown", palette: { skyTop: '#c4b5a8', skyBottom: '#f1e3cf', ground: '#7c5a4b', top: '#a18072' },
          customer: 'Xaitlyn', who: 'Professor', instructions: 'Security will wave you through. Walk like you belong.',
          door: [{ who: 'customer', text: 'Ah. A rather large slice. Have you read my monograph on the subject? Nobody has.' }] },
        { id: 'mall', name: "National Mall", palette: { skyTop: '#a9cfe6', skyBottom: '#f4f0db', ground: '#9a9c7a', top: '#c2c29c' },
          customer: 'Ceightlyn', who: 'Tourist', instructions: 'South side of the Monument. Look for the fanny pack. There will be forty.',
          door: [{ who: 'customer', text: "Honey, get my picture with this! Which one's the Washington Monument? Is it **you**?" }] },
        { id: 'federal', name: "Federal Triangle", palette: { skyTop: '#b9c2c7', skyBottom: '#ecead9', ground: '#8f8c80', top: '#b3b0a2' },
          customer: 'KTLN', who: 'Agent', instructions: 'You were never here. Neither was the pizza.',
          door: [{ who: 'customer', text: 'I can neither confirm nor deny this pizza.' }] },
      ],
      briefing: [

        { pic: 'stan-beat-up', lift: 0.12, pan: [[0.42, 0.5, 1.15], [0.48, 0.48, 1.04]], ms: 10000, lines: [
          { who: 'deep', text: "Vinny wasn't lying, boss. Something came up out of the storm drain. Some kind of mutant." },
          { who: 'deep', text: 'It chased me three blocks. I do not do three blocks. Is any of this worth it?' },
        ] },
        { comp: 'boardDayold', sticker: 'slam', lines: [
          { who: 'old', thump: true, text: '**THAT** is why we do this!' },
          { who: 'old', text: 'Why we keep the ovens hot! So tonight, somewhere, a family sleeps warm!' },
          { who: 'old', text: "A whole pie, shoulder to shoulder in the box. Lid down. Cozy. They'll never know your name." },
          { who: 'old', text: 'They sleep warm because you stand out there in the cold! One nation, under cheese. **Indivisible!**' },
        ] },
        { comp: 'board', sticker: 'pointer', lines: [
          { who: 'old', text: "And these tickets. K8lyn. Cat Lynn. Kæthlynn. Tell me that's a coincidence." },
          { who: 'ny', text: 'I mean, it could be a popular name, boss.' },
          { who: 'old', text: "Nobody spells their own name six ways. That's not a name. That's a cover with a typo." },
          { who: 'old', text: 'This goes **all the way to the top**.' },
        ] },
        { pic: 'assign-dc', lift: 0.1, pan: [[0.3, 0.5, 1.25], [0.66, 0.48, 1.1]], ms: 9000, lines: [
          { who: 'old', text: "The top of the government is Washington. Phil, nobody turns you away. You're the size of a door." },
          { who: 'jumbo', text: 'I accept with humility, and shall begin with a statement of no more than four hours.' },
          { who: 'old', text: 'Go.' },
        ] },
      ],
    },
    {
      id: 'naples', name: 'Naples', style: 'naples', seed: 37, stretch: 4600, gap: 640, predicts: true,
      signature: 'basil',
      mix: ['mutant', 'turtle', 'ninja', 'teen', 'mutant', 'ninja'], pickups: ['basil', 'garlic', 'mushroom'],
      areas: [
        { id: 'harbor', name: "The Harbor", palette: { skyTop: '#8fc3d6', skyBottom: '#f6dfb2', ground: '#7a6650', top: '#a58f73' },
          customer: 'Caterlynna', who: 'Fisherwoman', instructions: 'Il forno sa. Follow the smell of the sea.',
          door: [{ who: 'customer', text: 'From the sea this morning. You, from the oven? Same hour. We understand each other.' }] },
        { id: 'center', name: "Centro Storico", palette: { skyTop: '#d9a97c', skyBottom: '#f7dcae', ground: '#6b5140', top: '#94765f' },
          customer: 'Kate? Lin?', who: 'Nonna', instructions: 'Fourth floor. Lower the basket. Do not make conversation.',
          door: [{ who: 'customer', text: 'Who sent you? Your mother? Tell her she is late. ...Tell her I kept her seat warm.' }] },
        { id: 'hillside', name: "Vomero Hill", palette: { skyTop: '#a6c2dc', skyBottom: '#fbe2c8', ground: '#8a6d5a', top: '#b3957f' },
          customer: 'Qatelyn', who: 'Signora', instructions: 'Up the steps. All of them. Do not ask how many.',
          door: [{ who: 'customer', text: "Ma che bello! A pizza, in THIS house! With THIS view! Is mine. Don't tell the neighbors." }] },
      ],
      briefing: [

        { pic: 'phil-beat-up', lift: 0.12, pan: [[0.4, 0.5, 1.15], [0.46, 0.48, 1.04]], ms: 12000, lines: [
          { who: 'jumbo', text: 'Mr. Chairman, I rise today a mere fraction of my former self.' },
          { who: 'jumbo', text: 'I entered that city whole. The record shows nothing. It is classified.' },
          { who: 'jumbo', text: 'But I read every lid in the capital. Every one says **Original Italian.**' },
          { who: 'deep', text: "Mine says it too. I'm from Chicago." },
        ] },
        { pic: 'assign-naples', lift: 0.1, pan: [[0.66, 0.48, 1.2], [0.36, 0.5, 1.1]], ms: 14000, lines: [
          { who: 'naples', text: "Then somebody copies me. Is flattery, not a clue. Everybody knows where I'm from." },
          { who: 'old', text: 'A box that has to say it is hiding something.' },
          { who: 'naples', text: 'Honest things announce themselves **constantly**. This is Italy.' },
          { who: 'old', text: "Then you won't mind us checking the source. **Naples.**" },
          { who: 'naples', text: '...Finalmente. Somebody takes me home.' },
        ] },
      ],
    },
    {
      id: 'california', name: 'Long Beach', style: null, seed: 11, stretch: 3700, gap: 560, final: true,
      mix: ['teen', 'ninja', 'mutant', 'turtle', 'ninja', 'mutant'], pickups: ['pineapple', 'jalapeno', 'mushroom'],
      areas: [
        { id: 'downtown', name: "Downtown", palette: { skyTop: '#f7b98a', skyBottom: '#ffe6b8', ground: '#a58a70', top: '#cdb28e' },
          customer: 'Caitlyn (the C is silent)', who: 'Roller Skater', instructions: "Meet at the fountain. She is skating, so it's a moving handoff.",
          door: [{ who: 'customer', text: "Oh my gosh, you're so warm! I have, like, zero cash. Good vibes okay?" }] },
        { id: 'beach', name: "The Beach", palette: { skyTop: '#8fd8e6', skyBottom: '#ffeec4', ground: '#dcc38a', top: '#f2deaa' },
          customer: 'Kaytlynne', who: 'Surfer', instructions: 'Tower 3. Above the tide line. The tide has opinions.',
          door: [{ who: 'customer', text: 'Duuude. A pizza, on the beach. The ocean provides, bro.' }] },
        { id: 'bungalows', name: "The Bungalows", palette: { skyTop: '#3d3a6b', skyBottom: '#e0729a', ground: '#5a5048', top: '#7d6e62' },
          customer: 'Katelyn', who: 'DJ Alewife', instructions: 'Ring the bell. Follow the bass.',
          door: [{ who: 'alewife', text: "Pizza party!" }] },
      ],
      briefing: [

        { pic: 'contessa-beat-up', lift: 0.12, pan: [[0.42, 0.5, 1.06], [0.47, 0.5, 1]], ms: 8000, lines: [
          { who: 'old', text: "Look at what's left of you. Good. Nobody swings that hard at a bluff. We're close." },
        ] },
        { comp: 'board', sticker: 'think', lines: [
          { who: 'old', text: 'Twelve tickets. Twelve spellings. Twelve disguises.' },
          { who: 'old', text: 'Then Long Beach prints. Three stops. One spelled **right**. K-A-T-E-L-Y-N.' },
          { who: 'deep', text: "Or she's just a person who can spell." },
          { who: 'old', text: "That's exactly what she'd want you to think." },
          { who: 'old', text: 'Twelve disguises, then one real name. You only drop the disguise at **home**.' },
        ] },
        { pic: 'group-long-beach', lift: 0.1, pan: [[0.5, 0.5, 1], [0.48, 0.5, 1.08]], ms: 12000, lines: [
          { who: 'old', text: "One slice won't do it. This takes all four of you." },
          { who: 'jumbo', text: 'A point of order. Will you be joining us in the field, sir?' },
          { who: 'naples', text: 'Sì. You send us out. You come too, yes?' },
        ] },
        { comp: 'boardDayold', sticker: 'think', lines: [
          { who: 'deep', text: 'So when did you last go out there, boss?' },
          { who: 'old', text: 'Not since 1987.' },
          { who: 'deep', text: 'What happened in 1987?' },
          { who: 'old', text: "...Nothing. That's what bothers me." },
          { who: 'old', text: "I'm too stale for this shit." },
        ] },
      ],
    },
  ];

  // A word between slices. First match wins. `by` gives each pizza its own version of a line.
  const RETURNS = [
    { when: L => L.lastOutcome === 'delivered', lines: [{ who: 'pizza', by: { ny: "Dropped him at the door, boss. He didn't come back out.", deep: 'Dropped one off. Door closed. Nothing.', jumbo: 'The slice entered the residence. The record is silent thereafter.', naples: 'He goes inside. The door closes. Is very quiet inside.' } }, { who: 'old', text: 'No contact. That means it\'s working.' }] },
    { when: L => L.left === 2 && L.remaining > 1, lines: [{ who: 'old', text: "Two left and work to do. Don't make me bake more of you." }] },
    { when: L => L.left === 1, lines: [{ who: 'pizza', by: { ny: 'This is the last a me, boss. Go easy.', deep: "This is all of me there is. It's enough. It's a lot.", jumbo: 'Let the record show that I am down to one. A very large one.', naples: 'Uno. I am uno. Is a very Italian number.' } }, { who: 'old', text: 'Kid, I know the feeling.' }] },
    { when: L => L.filmed, lines: [{ who: 'pizza', by: { ny: "A kid took my picture, boss. I wasn't ready.", deep: 'I blinked.', jumbo: 'I was photographed without comment. Without **adequate** comment.', naples: 'My left! I said my left!' } }, { who: 'old', text: 'Pin it up. Somewhere a teenager is looking at your face right now.' }] },
    { when: L => L.lastOutcome === 'cold', lines: [{ who: 'pizza', by: { ny: "It's freezin' out there, boss.", deep: 'Cold. Should have stayed in the pan.', jumbo: 'I wish to enter into the record that it was very cold.', naples: 'I was made in a fire. I do not do this.' } }, { who: 'old', text: 'It always is. Go. Stay moving.' }] },
    { when: L => L.nemesisPower >= 2, lines: [{ who: 'pizza', by: { ny: 'That thing out there, it got bigger.', deep: 'It got bigger.', jumbo: 'That thing has, by all estimates, grown.', naples: 'Is bigger now. Why is it bigger?' } }, { who: 'old', text: 'Bigger means somebody\'s behind it. Somebody means The Order.' }] },
    { when: L => L.owesNinjas > 0, lines: [{ who: 'old', text: "The ninjas want paying again. It's not personal. It's a retainer." }] },
    { when: () => true, lines: [{ who: 'pizza', by: { ny: 'You didn\'t tell us about that.', deep: 'You did not mention that.', jumbo: 'I was not briefed on that.', naples: 'Nobody told me about this.' } }, { who: 'old', text: 'Would you have gone? Next.' }] },
  ];

  // Who says what, and their sound. Everything in a pizza's mouth goes through its voice.
  const SPEAKERS = {
    old: 'Sergeant Dayold', ny: 'Vinny Two-Fold', deep: 'Big Stan', jumbo: 'Phil A. Buster', naples: 'La Contessa', alewife: 'DJ Alewife',
  };

  // Sticky notes on "Who is The Order?", all in Sergeant Dayold's hand. They appear on fixed city milestones.
  const THEORY = [
    { from: 0, text: 'WHO IS THE ORDER?', title: true },   // the corkboard shows this one as the banner from the briefing board
    { from: 0, text: 'Every ticket says ORDER. Printed right on it. HIDING IN PLAIN SIGHT.' },
    { from: 0, text: 'Slices go out. Fewer come back. WHERE IS THE REST?' },
    { from: 1, text: "Vinny's missing slice. No call = DEEP UNDERCOVER. Proud." },
    { from: 1, text: 'Teenagers and turtles: AGENTS? (yes)' },
    { from: 2, text: 'The names are ALIASES. Has to be.' },
    { from: 2, text: 'ALL THE WAY TO THE TOP' },
    { from: 3, text: '"Original Italian". On EVERY box. Why??' },
    { from: 4, text: 'Twelve disguises. ONE name spelled RIGHT. Long Beach. You only drop the disguise at HOME.' },
  ];

  // Polaroids start as a name and question marks. Notes appear once the behavior has been seen.
  const ENEMIES = {
    teen: { name: 'Teenager', claim: 'Agent of The Order. Reports back with photographs.', notes: { flees: 'One good pepperoni and it runs home for good.', stomp: 'Soft on top. Folds like a lawn chair.', films: 'Takes your picture, and its friends show up next time.', } },
    turtle: { name: 'Turtle', claim: 'Agent of The Order. In place for ninety years, minimum.', notes: { bites: 'Bites, then stops to chew.', munch: 'Throw it something. It will stop to chew.', stun: 'Jump on it and it tucks in. It makes an excellent springboard.', armored: 'Nothing removes a turtle. It was here before us.' } },
    ninja: { name: 'Ninja', claim: 'Senior agent of The Order. I do not like the reports.', notes: { throws: 'Throws things. Keeps its distance.', bounce: 'Do not jump on its head.', climbs: 'Hit it and it takes to the fire escapes. It remembers every hit.', bows: 'Catches whatever you throw. Bows. Throws it straight back.', debt: 'Fights with whatever it took off a fallen slice.', gone: 'Hit it enough and it bows out for good.' } },
    mutant: { name: 'Mutant', claim: 'What is The Order feeding them?', notes: { peeks: 'Watch the storm drains. It looks before it comes.', chases: 'It comes up behind you, fast.', feed: 'Catches food and goes back down, for good.', bite: 'One bite and it goes home. One.' } },
  };

  // Everything said on the street, in the voice of the pizza out there: pop-ups along the top and the bubble over its head.
  // Each event's lines rotate, and its count is kept per pizza in the save (camp.said), so a line comes round again only after
  // the others have had a turn. VOICE_RATE thins out events that happen a lot: 'always' speaks every time (anything that tells
  // you where to go or what you hold), 'often' speaks the first three times and then every other time, 'sometimes' speaks the
  // first time and then every third time. Nothing goes quiet for good. {name}, {customer}, {topping}, {street}, {gone} fill in.
  // BUBBLE events go in the bubble over the slice; everything else is a pop-up.
  const VOICES = {
    ny: {
      deploy: ["Awright, let's get this over with.", "Outta my way, comin' through.", "I fold for nobody. Let's go.", "Here we go again, boss."],
      deliverTo: ["Deliverin' to {customer}. Easy money.", "Next stop, {customer}. I got this, boss.", "{customer}. Whatever ya say, boss."],
      deliverToGone: ["{gone} a us still gone from these streets. Deliverin' to {customer}.", "We're down {gone} out here, boss. Still goin' to {customer}."],
      checkpoint: ["Checkpoint: {name}. Remember that, boss.", "{name}. I'm markin' it.", "Checkpoint, {name}. Good, my feet hurt."],
      doorAhead: ["{customer}'s door, right up here.", "That's {customer}'s place up ahead.", "Door's comin' up. {customer}."],
      gate: ["Boxes blockin' the way. I'm breakin' 'em.", "A cardboard wall? Seriously? Bust it."],
      nope: ["Not this door yet, boss.", "Wrong address. I ain't wastin' a delivery."],
      unlocked: ["{topping}! That's new. Three uses, and every pie after me can wear it."],
      pickup: ["{topping}. Three uses. Now we're talkin'.", "Swappin' in {topping}. Three shots.", "{topping}! Don't mind if I do."],
      spent: ["Aw, nuts. Back to plain.", "Outta toppings. Just me and the cheese now.", "Plain again. I'm still a classic."],
      recovered: ["Got my topping back.", "That's mine, thank you.", "Back in my hands, where it belongs."],
      paper: ["Somethin' was in that box, boss. Bringin' it home.", "Paperwork in the box. Dayold's gonna love this."],
      opened: ["{street}'s open. Let's go.", "That opened up {street}.", "Thank you, I do my own stunts. {street}'s open."],
      note: ["Dayold's gonna want that on the board.", "Somethin' for the board, boss.", "Remember that one. For the board."],
      hot: ["I'm hot. I'm magnificent.", "Feelin' toasty, boss.", "Heat's holdin'. I fold for nobody."],
      warm: ["Gettin' lukewarm here.", "Losin' a little heat. I ain't worried.", "I ain't sayin' I'm cold. I'm sayin' I'm not hot."],
      cold: ["I'm losin' my edge here, boss. Move it!", "Cheese is givin' up on me.", "Cold. Real cold. Hurry."],
      fire: ["Ahh. Back in the glow.", "Warm again. That's the stuff.", "Toasty. Don't tell nobody I needed that."],
      filmed: ["Hey! No pictures!", "A kid took my picture. I wasn't ready.", "Great. Now I'm online."],
      flees: ["Yeah, run home, kid. Phone first.", "Look at 'em go.", "And stay off my block.", "Scram!"],
      scatter: ["Everybody's got somewhere else to be. Good.", "Clear the block!", "That's right, scatter."],
      feed: ["It took the bait and went back down.", "Enjoy your snack, pal. Stay down there.", "Back in the drain. Smart."],
      bite: ["One bite and it goes home. Weird, but okay.", "It got a taste. It's leavin'."],
      drain: ["What was that? In the drain?", "Somethin's in the storm drain, boss.", "Drain's movin'. I ain't scared."],
      bow: ["The ninja caught it! And bowed! Here it comes back!", "It caught it. Duck!", "Polite, but here it comes."],
      ninjaHit: ["It'll remember that.", "Ooh, now it's personal.", "That one's gonna hold a grudge."],
      ninjaGone: ["The ninja bowed out. Respect.", "One bow and gone. Classy."],
      hintBox: ["Just pizza boxes. Shoot 'em, slam 'em or bust right through."],
      hintBarricade: ["That's solid. I'm jumpin' it."],
      hurt: ["Hey! Watch the crust!", "Oh, you wanna go?", "That's comin' outta your tip."],
      stomp: ["Fuhgeddaboudit.", "Get outta here!", "Folded like a lawn chair."],
      grab: ["Now we're talkin'.", "Oh yeah.", "Gimme that."],
    },
    deep: {
      deploy: ['Slowly, then.', 'This better be worth it.', 'Fine.', 'Here I go. Eventually.'],
      deliverTo: ['{customer}. Fine.', 'Taking it to {customer}. Slowly.', '{customer}. They better be home.'],
      deliverToGone: ['{gone} of us still gone out here. Taking it to {customer}.', 'Down {gone}. Still going to {customer}.'],
      checkpoint: ["{name}. I'll remember it.", 'Checkpoint. {name}. Good.', "{name}. I'm starting here next time."],
      doorAhead: ["{customer}'s door. Up ahead.", "That's the door. {customer}.", 'Door. Finally. {customer}.'],
      gate: ["Boxes. In the way. They won't be.", 'Walls are a suggestion.'],
      nope: ['Not this one.', 'Wrong door. ...Fine.'],
      unlocked: ["{topping}. New. Three uses. Every pie gets it now. You're welcome."],
      pickup: ['{topping}. Three uses.', '{topping}. More. Good.', '{topping}. Heavy. I like it.'],
      spent: ['That was the good part.', 'Plain. Fine.', "Out of toppings. I'm still deep."],
      recovered: ['Mine.', 'Got it back.', 'That was mine. Is mine.'],
      paper: ["Something in the box. I'm keeping it.", 'Paperwork. For the board.'],
      opened: ['{street} is open.', "{street}. Open now. You're welcome."],
      note: ['That goes on the board.', 'Board material.', 'Dayold will want that.'],
      hot: ['Hot. Good.', 'Still hot. Two inches of hot.', "I'm holding heat. It's what I do."],
      warm: ['Lukewarm.', "Cooling. I'm not worried. ...I'm a little worried.", 'Losing heat. Slowly. Like everything.'],
      cold: ['Sauce is setting.', 'Cold. I hate this.', "I'm setting. Like a casserole. I'm not a casserole."],
      fire: ['Warm. Good.', "That's better.", 'Heat. Finally.'],
      filmed: ['Not my good side.', 'I blinked.', 'They took my picture. ...Fine.'],
      flees: ['It ran.', 'Bye.', 'Go home.', 'Phone first. Every time.'],
      scatter: ['Everyone left. Good.', 'Nobody stays. ...Fine.'],
      feed: ['It took it. It went down. Good.', 'Snack. Drain. Gone.'],
      bite: ['One bite. It went home.', "It had a bite. It's leaving."],
      drain: ["Something's in the drain.", 'Oh no. Not running.', 'Drain. Moving. I see it.'],
      bow: ["It caught it. It's bowing. It's throwing it back.", 'Incoming. Politely.'],
      ninjaHit: ["It'll remember that.", "Now it's mad. Quietly."],
      ninjaGone: ['It bowed and left. Respect.', 'Gone. Good manners.'],
      hintBox: ['Pizza boxes. I go through them.'],
      hintBarricade: ['Solid. I have to jump. ...Fine.'],
      hurt: ['That left a mark.', 'Hey.', 'I felt that.'],
      stomp: ['Sorry.', 'I warned you.', 'Heavy. Told you.'],
      grab: ['More. Good.', 'Mine now.', 'Heavier. Better.'],
    },
    jumbo: {
      deploy: ['I shall be brief. I shall be enormous.', 'Mind the overhang.', 'Mr. Chairman, I rise.', 'I yield my time to myself.'],
      deliverTo: ['Let the record show: we deliver to {customer}.', 'Mr. Chairman, the recipient is {customer}.', 'On the matter of {customer}, I rise to deliver.'],
      deliverToGone: ['Let the record show {gone} of us remain missing. We deliver to {customer}.', '{gone} of our members are absent. We proceed to {customer}.'],
      checkpoint: ['Checkpoint: {name}. So entered into the record.', '{name}. I move that we remember it.', 'Let the minutes reflect {name}.'],
      doorAhead: ["{customer}'s door, just ahead. I shall be brief.", 'The residence of {customer}, approaching.', 'I see my constituent. {customer}.'],
      gate: ['The boxes block the way. Bipartisan demolition.', 'A blockade! Of cardboard! I object!'],
      nope: ['Point of order: not this address yet.', 'Out of order. Wrong door.'],
      unlocked: ['{topping}! A new provision, binding on every pie hereafter. Three uses.'],
      pickup: ['{topping}! An earmark! Three uses!', 'The chair recognizes {topping}.', '{topping}, appropriated.'],
      spent: ['The funds are exhausted.', 'Back to plain cheese. A lean budget.', 'Appropriations: none.'],
      recovered: ['The topping is restored to its rightful owner.', 'Recovered! Let the record show.', 'Returned to committee. My committee.'],
      paper: ['Documents in the box! I shall read them in full.', 'A paper trail! I do love a paper trail.'],
      opened: ['{street} is open, by unanimous consent.', 'The floor is open: {street}.'],
      note: ['Enter that into the record.', 'A note for the board, Mr. Chairman.', 'The board will want this, in triplicate.'],
      hot: ['Heat holding. I am, if I may, magnificent.', 'Warm, and in session.', 'The heat is sustained.'],
      warm: ['Lukewarm. I shall continue regardless.', 'I note a decline in temperature.', 'Cooling. Noted, and resented.'],
      cold: ['I am drooping, and I yield.', 'I wish to enter into the record that it is very cold.', 'Cold! I object, with what little warmth remains!'],
      fire: ['Back in the glow. Sustained!', 'Warmth! The motion carries.', 'Toasty. I withdraw my objection.'],
      filmed: ['I was photographed without comment. Without adequate comment.', 'No comment. Well, a short comment...', 'The press!'],
      flees: ['The witness flees, phone first.', 'Let the record show it ran.', 'Dismissed!', 'Adjourned, apparently.'],
      scatter: ['The gallery has emptied.', 'Everyone recalls a prior engagement.'],
      feed: ['It accepts the offering and withdraws.', 'Bribery works. Noted with concern.'],
      bite: ['One bite, and it retires.', 'A taste, then recess.'],
      drain: ['Something stirs in the storm drain.', 'I move to adjourn. Quickly.'],
      bow: ['The ninja catches it, bows, and returns it! Most irregular!', 'It is returned to sender!'],
      ninjaHit: ['It will remember that, I suspect, at length.', 'A grievance has been filed.'],
      ninjaGone: ['The ninja bows out for good. Respect.', 'It yields the floor.'],
      hintBox: ['Mere pizza boxes. Shoot, slam or dash through them.'],
      hintBarricade: ['Solid. One must jump it.'],
      hurt: ['I object!', 'Point of order!', 'Noted, and resented!'],
      stomp: ['Motion carried.', 'Sustained!', 'Overruled!'],
      grab: ['An earmark! For me!', 'Appropriated!', 'Mine, by statute.'],
    },
    naples: {
      deploy: ['Ninety seconds. Andiamo.', 'Try to keep up, America.', 'Va bene. I go.', 'Certified. Ready.'],
      deliverTo: ['To {customer}. Ninety seconds.', 'For {customer}. Andiamo.', '{customer}. Let us not keep them waiting.'],
      deliverToGone: ['{gone} of us still gone from these streets. For {customer}.', 'We are {gone} fewer. Still, for {customer}.'],
      checkpoint: ['{name}. I remember.', 'Checkpoint, {name}. Ecco.', '{name}. Is noted.'],
      doorAhead: ["{customer}'s door. Ecco.", 'Is the door. {customer}.', 'There. {customer}.'],
      gate: ['Cardboard. Everywhere, cardboard. Break it.', 'A wall of boxes. Is an insult.'],
      nope: ['Not this door. Not yet.', 'Wrong address. Ma dai.'],
      unlocked: ['{topping}! New. Three uses, and every pie after me may wear it.'],
      pickup: ['{topping}. At last, an ingredient.', '{topping}. Three uses. Basta.', '{topping}. Acceptable.'],
      spent: ['Plain again. Is better without.', 'No more toppings. Margherita is enough.', 'Back to the classic.'],
      recovered: ['Mine. Grazie.', 'Is back where it belongs.', 'Returned. As it should be.'],
      paper: ['Something in the box. I take it home.', 'Papers. Dayold will be happy.'],
      opened: ['{street} is open. Finally.', '{street}. Andiamo.'],
      note: ['For the board.', 'Dayold will want this.', 'Another note. Is getting crowded, the board.'],
      hot: ['Hot. As it should be.', 'From the fire. Still.', 'Perfetto.'],
      warm: ['Lukewarm. Is not acceptable.', 'I am cooling. Hurry, America.', 'Losing heat. Already.'],
      cold: ['Fredda! I am going fredda!', 'I was made in a fire. I do not do this.', 'Cold. Mamma mia.'],
      fire: ['Ah. Like home.', 'Fire. Finally, something civilized.', 'Warm again. Grazie.'],
      filmed: ['My left, please. My left!', 'A picture? I was not ready!', 'They photograph me. Naturally.'],
      flees: ['Run. Run home.', 'Ciao ciao.', 'Phone first. Always phone first.', 'Va bene, go.'],
      scatter: ['Everyone runs. As they should.', 'Scattered. Bene.'],
      feed: ['It eats and goes down. Bene.', 'Fed. Gone.'],
      bite: ['One bite, and it goes home.', 'A taste. Now it leaves.'],
      drain: ['Madonna, what is that? In the drain?', 'Something in the drain. I do not like it.'],
      bow: ['It catches it! It bows! It throws it back!', 'Is coming back! Polite, but coming back!'],
      ninjaHit: ['It remembers that.', 'Now it is angry. Quietly.'],
      ninjaGone: ['The ninja bows and vanishes. Elegant.', 'Gone. Molto elegante.'],
      hintBox: ['Only pizza boxes. Shoot, slam or dash through.'],
      hintBarricade: ['Solid. Jump.'],
      hurt: ['Mamma mia!', 'Barbaro!', 'Ma che fai?'],
      stomp: ['Scusi.', 'Ciao ciao.', 'Permesso.'],
      grab: ['At last, an ingredient.', 'Bene.', 'This, I accept.'],
    },
  };
  const VOICE_RATE = {
    hot: 'often', warm: 'often', fire: 'often', spent: 'often', recovered: 'often', filmed: 'often', grab: 'often', bow: 'often',
    flees: 'sometimes', scatter: 'sometimes', feed: 'sometimes', bite: 'sometimes', drain: 'sometimes', ninjaHit: 'sometimes', ninjaGone: 'sometimes',
    hurt: 'sometimes', stomp: 'sometimes',
  };
  const BUBBLE = new Set(['deploy', 'hurt', 'stomp', 'grab']);

  // The heading line under the HUD when the slice is off its route. Not speech.
  const BARKS = { missed: 'Rerouting...' };

  // The solid blocks on every street are pizza-shop stock, each with its own jiggle when hit.
  const OBSTACLES = ['flour', 'cans', 'parm', 'salami'];

  const BOX_PAPER = [
    'CARBON COPY: "Still warm?" "Still warm." The same exchange, over and over.',
    'PERSONNEL FILE: Beer Sprite Lite. Powers: none. Performance: exemplary.',
    'TICKET STUB: Slice must build a band of brothers. The handwriting looks young.',
    'NAPKIN, IN SERGEANT DAYOLD\'S HAND: The Kates, Katies, Kaitlins and Caitlyns do not meet. They do not need to.',
  ];

  // Where a photo's new teenagers turn up, relative to where it was taken.
  const PHOTO_ARRIVALS = [-260, 320];
  const NINJA_HITS = 2;
  // A slice can lose this many bites. Each one takes the same share of its heat, and that share never comes back.
  const BITES = 5;
  const CHARGES = 3;
  // Gameplay feel. Distances are stage pixels, times are seconds, frames run at 60 a second.
  const TUNING = {
    // Dollars a delivered slice earns straight from the oven. It falls in a straight line with the slice's heat, to $0 at stone cold.
    tipPerSlice: 5,
    // Nothing alive stands or patrols within this far of where a slice is put down.
    spawnSafe: 520,
    // Every street is this much longer than its city's stretch says (1.5 since the 11-11 playtest: bigger levels).
    streetScale: 1.5,
    // Enemies sit this much further apart than the city's gap, so the longer streets hold about a quarter more of them.
    enemySpread: 1.2,
    // Seconds before a pizza's special (SLAM, FLOP, DASH) can be used again.
    cooldown: { deep: 6, jumbo: 7, naples: 5 },
    // Onion & garlic: how far the stank reaches.
    auraRadius: 330,
    // A stomp: feet may be this far into the top share of an enemy, hands-off slack at its sides, and a few frames of apex grace.
    stomp: { window: 0.62, reachAbove: 16, slack: 18, apexVy: -3 },
    // What walking into a stack of pizza boxes or a barricade says, once a slice.
  };
  const ORDER_NUMBER = '0825';
  const PRINTER_CLOCK = '12:00 AM';

  // The first line is the lost pizza's epitaph, chosen by `by`. Without a known pizza the generic text stands.
  const CITY_LOST = [
    { who: 'old', text: 'That whole pie is gone. Not a crumb on the radio. **Deep undercover.**', by: { ny: 'Vinny Two-Fold. Folded for nobody. Went in deep.', deep: 'Big Stan. Heavy to the last. Not a word out of him.', jumbo: 'Phil A. Buster. Gone silent. First time in his career.', naples: 'La Contessa. Ninety seconds in the fire, then silence.' } },
    { who: 'old', text: 'Tape goes over the photo. Regulation. Finest operatives I ever sent.' },
    { who: 'old', text: '...I keep the tape handy. The order still stands. Send another.' },
  ];

  const ENDING = {
    finale: [{ pic: 'dayold-desk', lift: 0.12, pan: [[0.5, 0.5, 1], [0.5, 0.5, 1]], ms: 8000, lines: [{ who: 'old', text: 'Know thy enemy...' }] }],
    card: { line: 'To be continued...?', listen: 'Listen to DJ Alewife here', youtube: 'https://www.youtube.com/@djalewife', birthday: '(Happy birthday Katelyn!)' },
  };

  // Where the corkboard sits in the HQ painting. The game draws live evidence onto it.
  const HQ_BOARD = { x: 712, y: 82, w: 496, h: 326 };

  // Which teens hang around each city: three apiece, a mix of girls and boys, with a different set of hoodies per city.
  // Art in assets/sprites/teen-*; specs in art/paper/make_teen_cast.py. teen = the original orange hoodie.
  //   teen-b green (puffs), teen-c navy (bowl cut), teen-d yellow (ponytail), teen-e red (braid), teen-f teal (twists), teen-g grey (red bun)
  const TEENS = {
    newyork: ['teen', 'teen-c', 'teen-g'],
    chicago: ['teen-b', 'teen-e', 'teen-f'],
    dc: ['teen-d', 'teen-c', 'teen-b'],
    naples: ['teen-e', 'teen-g', 'teen-d'],
    california: ['teen-f', 'teen-d', 'teen'],
  };

  const api = { TEENS, CITY_LOST, TOPPINGS, STYLES, SPEAKERS, VOICES, VOICE_RATE, BUBBLE, CITIES, RETURNS, THEORY, ENEMIES, BARKS, OBSTACLES, BOX_PAPER, PHOTO_ARRIVALS, NINJA_HITS, BITES, CHARGES, ORDER_NUMBER, PRINTER_CLOCK, ENDING, HQ_BOARD, TUNING };
  if (typeof module !== 'undefined') module.exports = api; else root.PR_CONTENT = api;
})(typeof window !== 'undefined' ? window : globalThis);
