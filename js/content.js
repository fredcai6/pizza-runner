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
    naples: { bio: 'Certified. Quick. Cools fast, tells you so anyway.', name: 'Margherita', speed: 9.6, accel: 1.5, decel: 1.5, jump: 23, gravity: 1.05, fall: 1.1, maxFall: 24, spring: 0.3, damp: 0.66, heatDecay: 1.55, heatMax: 100, height: 104, w: 60, h: 80, special: 'dash', specialName: 'DASH', blurb: 'Small, quick, and cools fast. DASH barrels through anything.' },
  };

  // Route is New York to Long Beach. Menus past New York are provisional.
  const CITIES = [
    {
      id: 'newyork', name: 'New York', style: 'ny', seed: 23, stretch: 3900, gap: 720,
      menu: ['pepperoni'],
      mix: ['teen', 'teen', 'turtle', 'teen', 'turtle'], pickups: ['pepperoni'],
      areas: [
        { id: 'wallstreet', name: "Wall Street", palette: { skyTop: '#8fa3bb', skyBottom: '#e6d9c6', ground: '#6d6a68', top: '#8d8983' },
          customer: "K8lyn", who: "Stockbroker", instructions: "Leave at the door. Do not ring. Do not linger.",
          door: [{ who: 'customer', text: "I'm on with Tokyo. Put it on the expense account. Sell! SELL!" }] },
        { id: 'centralpark', name: "Central Park", palette: { skyTop: '#9cc3d6', skyBottom: '#eee8c8', ground: '#7d8a5a', top: '#a3ab7a' },
          customer: "Cat Lynn", who: "Bench Lady", instructions: "Third bench past the fountain. She will know.",
          door: [{ who: 'customer', text: "Sit. Sit. The pigeons know you're here. I've been on this bench since 1974." }] },
        { id: 'brooklyn', name: "Brooklyn", palette: { skyTop: '#c9a6a0', skyBottom: '#f3dcc0', ground: '#6f5b56', top: '#94807a' },
          customer: "Katelynnnnn", who: "Local Artisan", instructions: "Gluten is fine. Irony is fine. Ring twice.",
          door: [{ who: 'customer', text: "Is this sourdough? I ferment my own, actually. Bagel the dog says thanks." }] },
      ],
      briefing: [

        // Problem, then team, then first mission. New York goes last so its bravado earns the assignment.
        { comp: 'wide', lines: [
          { who: 'old', text: 'New recruits. Look at you. Warm, plain, and full of hope.' },
          { who: 'old', text: 'Welcome to Pizza HQ.' },
          { who: 'old', text: 'They told you this was undercover work. They lied. This is **deep undercover**.' },
        ] },
        { comp: 'board', lines: [
          { who: 'old', text: 'Slices are vanishing. All over the world. Whole pies, gone in a night. Some nights all that turns up is the crust.' },
          { who: 'old', text: 'Somebody is giving the orders. I call them **The Order**. Nobody else does. That is how deep this goes.' },
          { who: 'old', text: 'You will go out there, get in close, and find out who.' },
        ] },
        { comp: 'naples', lines: [
          { who: 'naples', text: 'Mamma mia! The whole world? And nobody tells Napoli?' },
          { who: 'old', text: '**Pipe down**, Contessa. You have the floor? Fine. People, meet your team.' },
        ] },
        { comp: 'naples', card: ['La Contessa', 'Margherita of Naples'], lines: [
          { who: 'old', text: 'La Contessa. Fastest thing in the oven, and cools just as fast. Certified as a pizza by an actual government.' },
          { who: 'naples', text: 'Ninety seconds in the fire. You would not last **nine**.' },
        ] },
        { comp: 'deep', card: ['Big Stan', 'Deep Dish of Chicago'], lines: [
          { who: 'old', text: 'Big Stan. Two inches of sauce, four inches of grudge. Slow to start. Slower to stop.' },
          { who: 'deep', text: "It's not a casserole." },
          { who: 'old', text: 'Nobody said it was.' },
          { who: 'deep', text: 'Somebody will.' },
        ] },
        { comp: 'jumbo', card: ['Phil A. Buster', 'Jumbo Slice of Washington'], lines: [
          { who: 'old', text: 'Phil A. Buster. Largest slice in the free world. Structural integrity, none.' },
          { who: 'jumbo', text: 'Thank you. If I may, I would like to yield my time to myself, for some brief remarks on the subject of...' },
          { who: 'old', text: 'You may not.' },
        ] },
        { comp: 'ny', card: ['Vinny Two-Fold', 'Slice of New York'], lines: [
          { who: 'old', text: 'And this is Vinny Two-Fold. Off the streets. Nobody would have him indoors.' },
          { who: 'ny', text: "Mysterious disappearances? Boss, that's a **Tuesday** where I'm from. I ain't scared a nothin'. I fold for nobody." },
          { who: 'old', text: 'Glad to hear it, Vinny. I like a brave slice. You go first.' },
          { who: 'ny', text: 'Wait, what?' },
        ] },
      ],
    },
    {
      id: 'chicago', name: 'Chicago', style: 'deep', seed: 53, stretch: 3200, gap: 620,
      menu: ['sausage', 'pepperoni', 'mushroom'],
      mix: ['teen', 'turtle', 'mutant', 'teen', 'turtle'], pickups: ['jalapeno', 'pepperoni'], watchers: true,
      areas: [
        { id: 'loop', name: "The Loop", palette: { skyTop: '#7f98b3', skyBottom: '#d4dde0', ground: '#49545c', top: '#6c7a83' },
          customer: "Kæthlynn", who: "Da Gal", instructions: "Top floor. Keep the box level. Buzzer is broken.",
          door: [{ who: 'customer', text: "Took long enough. Now that is a pizza. Yous want a beef with that?" }] },
        { id: 'lincolnpark', name: "Lincoln Park", palette: { skyTop: '#a6c9d9', skyBottom: '#f0ead0', ground: '#6f8460', top: '#94a67e' },
          customer: "Caytlinn", who: "Jogging Mom", instructions: "Hand it over while moving. She does not stop.",
          door: [{ who: 'customer', text: "I'm on mile nine. Is it organic? Tyler, say thank you to the pizza." }] },
        { id: 'wickerpark', name: "Wicker Park", palette: { skyTop: '#b39aa0', skyBottom: '#ecd5c0', ground: '#5d4e4c', top: '#83706c' },
          customer: "Kay T'Lynn", who: "Bartender", instructions: "Round the back. Mind the porch stairs.",
          door: [{ who: 'customer', text: "Corner tavern's closed till four. This is the most honest thing that's happened all week." }] },
      ],
      briefing: [

        { comp: 'ny', lines: [
          { who: 'ny', text: "Boss, it's hell out there." },
          { who: 'ny', text: "And I ain't sayin' I'm rattled. I'm sayin' some a me didn't come back." },
          { who: 'old', text: "These jobs aren't for the **limp crusted**." },
          { who: 'old', text: 'What you saw out there is called intel. Intel goes on the board.' },
        ] },
        { comp: 'board', lines: [
          { who: 'old', text: 'Every scrap we ever pulled is up here. A lot of good slices paid for this cork.' },
          { who: 'old', text: 'Everything you see out there is an agent of The Order until proven otherwise. Nothing has ever been proven otherwise.' },
        ] },
        { comp: 'boardTeen', lines: [
          { who: 'old', text: '**Teenagers.** Do not let them take your picture. If they get one, more of them will be waiting next time you come around.' },
          { who: 'old', text: 'Why would a teenager need that many pictures? Think about it.' },
        ] },
        { comp: 'boardTurtle', lines: [
          { who: 'old', text: '**Turtles.** They move slow. But I have seen them take a bite out of many a tough slice.' },
          { who: 'old', text: 'Slow is what they want you to think. It is also what they are.' },
        ] },
        { comp: 'boardTease', lines: [
          { who: 'old', text: 'Then there are the other reports. I do not like the other reports.' },
        ] },
        { comp: 'board', lines: [
          { who: 'old', text: 'Read the **corkboard** before you deploy. Every dossier, every operative. It may save your crust.' },
        ] },
        { comp: 'deep', lines: [
          { who: 'old', text: 'Big Stan. Your time to shine. Get to Chicago and see what else you can dig up on The Order.' },
          { who: 'deep', text: '...Fine.' },
        ] },
      ],
    },
    {
      id: 'dc', name: 'Washington, DC', style: 'jumbo', seed: 41, stretch: 3500, gap: 600,
      menu: ['pepperoni', 'garlic', 'mushroom'],
      mix: ['ninja', 'teen', 'turtle', 'mutant', 'teen', 'ninja'], pickups: ['pineapple', 'jalapeno'],
      areas: [
        { id: 'georgetown', name: "Georgetown", palette: { skyTop: '#c4b5a8', skyBottom: '#f1e3cf', ground: '#7c5a4b', top: '#a18072' },
          customer: "Xaitlyn", who: "Professor", instructions: "Security will wave you through. Nobody will mention this.",
          door: [{ who: 'customer', text: "Ah. A rather large slice. Are you familiar with my monograph on the subject?" }] },
        { id: 'mall', name: "National Mall", palette: { skyTop: '#a9cfe6', skyBottom: '#f4f0db', ground: '#9a9c7a', top: '#c2c29c' },
          customer: "Ceightlyn", who: "Tourist", instructions: "South side of the Monument. Look for the fanny pack.",
          door: [{ who: 'customer', text: "Honey, get a picture of me with this! Which one's the Washington Monument? Is this it?" }] },
        { id: 'federal', name: "Federal Triangle", palette: { skyTop: '#b9c2c7', skyBottom: '#ecead9', ground: '#8f8c80', top: '#b3b0a2' },
          customer: "KTLN", who: "Agent", instructions: "You were never here.",
          door: [{ who: 'customer', text: "I can neither confirm nor deny this pizza." }] },
      ],
      briefing: [

        { comp: 'deep', lines: [
          { who: 'deep', text: "You weren't lying, boss. Something came up out of the storm drain. Some kind of mutant." },
          { who: 'deep', text: 'It chased me for three blocks. I do not do three blocks.' },
        ] },
        { comp: 'oldtimer', lines: [
          { who: 'old', thump: true, text: '**THAT** is why we do this!' },
          { who: 'old', text: 'Why we work long and hard to keep the ovens hot! So that tonight, somewhere out there, a family sleeps warm!' },
          { who: 'old', text: 'Eight slices, side by side in the box. Little ones by the crust. Lid down. Cozy. They will never know your name.' },
          { who: 'old', text: 'They sleep warm because you stand out there in the cold!' },
        ] },
        { comp: 'board', lines: [
          { who: 'old', text: 'And another thing. These customers. K8lyn. Cat Lynn. Kæthlynn. Tell me that is a coincidence.' },
          { who: 'ny', text: 'I mean, it could be a popular name, boss.' },
          { who: 'old', text: 'Suspicious is what it is. This goes **all the way to the top**.' },
        ] },
        { comp: 'jumbo', lines: [
          { who: 'old', text: 'Phil. Go shake down DC.' },
          { who: 'jumbo', text: 'I accept with humility, and I shall begin with a statement of no more than four hours.' },
          { who: 'old', text: 'Go.' },
        ] },
      ],
    },
    {
      id: 'naples', name: 'Naples', style: 'naples', seed: 37, stretch: 4600, gap: 640, predicts: true,
      menu: ['basil', 'garlic', 'pepperoni'],
      mix: ['mutant', 'turtle', 'ninja', 'teen', 'mutant', 'ninja'], pickups: ['jalapeno', 'sausage'],
      areas: [
        { id: 'harbor', name: "The Harbor", palette: { skyTop: '#8fc3d6', skyBottom: '#f6dfb2', ground: '#7a6650', top: '#a58f73' },
          customer: "Caterlynna", who: "Fisherwoman", instructions: "Il forno sa.",
          door: [{ who: 'customer', text: "From the sea this morning. You, this morning also? Sit, eat, you are too thin." }] },
        { id: 'center', name: "Centro Storico", palette: { skyTop: '#d9a97c', skyBottom: '#f7dcae', ground: '#6b5140', top: '#94765f' },
          customer: "Kate? Lin?", who: "Nonna", instructions: "Fourth floor. Lower the basket.",
          door: [{ who: 'customer', text: "Who made this? Your mother? Tell her she used too much. Mangia." }] },
        { id: 'hillside', name: "Vomero Hill", palette: { skyTop: '#a6c2dc', skyBottom: '#fbe2c8', ground: '#8a6d5a', top: '#b3957f' },
          customer: "Qatelyn", who: "Signora", instructions: "Up the steps. All of them.",
          door: [{ who: 'customer', text: "Ma che bello! A pizza! In THIS house! *gestures at the entire bay*" }] },
      ],
      briefing: [

        { comp: 'jumbo', lines: [
          { who: 'jumbo', text: 'Mr. Chairman, I rise today as a mere fraction of my former self.' },
          { who: 'jumbo', text: 'But let the record show that every one of them says it. On every box. **Original Italian.**' },
          { who: 'naples', text: 'That is just printed on the boxes.' },
          { who: 'old', text: 'Original. Italian. Then we go back to where it all began.' },
          { who: 'old', text: '**Naples.**' },
        ] },
      ],
    },
    {
      id: 'california', name: 'Long Beach', style: null, seed: 11, stretch: 3700, gap: 560, final: true,
      mix: ['teen', 'ninja', 'mutant', 'turtle', 'ninja', 'mutant'], pickups: ['pineapple', 'jalapeno', 'mushroom'],
      areas: [
        { id: 'downtown', name: "Downtown", palette: { skyTop: '#f7b98a', skyBottom: '#ffe6b8', ground: '#a58a70', top: '#cdb28e' },
          customer: "Caitlyn (the C is silent)", who: "Roller Skater", instructions: "Meet at the fountain. She is skating.",
          door: [{ who: 'customer', text: "Oh my gosh, you're so warm! I have, like, zero cash. Good vibes okay?" }] },
        { id: 'beach', name: "The Beach", palette: { skyTop: '#8fd8e6', skyBottom: '#ffeec4', ground: '#dcc38a', top: '#f2deaa' },
          customer: "Kaytlynne", who: "Surfer", instructions: "Tower 3. Leave it above the tide line.",
          door: [{ who: 'customer', text: "Duuude. Pizza. On the sand. The ocean provides, bro." }] },
        { id: 'bungalows', name: "The Bungalows", palette: { skyTop: '#3d3a6b', skyBottom: '#e0729a', ground: '#5a5048', top: '#7d6e62' },
          customer: "Katelyn", who: "DJ Alewife", instructions: "Ring the bell. Follow the bass.",
          door: [{ who: 'alewife', text: "Pizza party!" }] },
      ],
      briefing: [

        { comp: 'wide', lines: [
          { who: 'old', text: 'Look at you. Look at what is left of you.' },
          { who: 'old', text: 'Good. That means they are scared. I think we have found the head of The Order.' },
        ] },
        // PROVISIONAL: what points him to Long Beach is unsettled. The string running out there is a
        // draft bridge, and deliberately no evidence of anything.
        { comp: 'board', lines: [
          { who: 'old', text: 'I ran red string from every order, in every city. And right here, I ran out of string.' },
          { who: 'old', text: '**Long Beach, California.** One house. The top Katelyn. Tell me that is an accident.' },
          { who: 'deep', text: 'Did you buy more string?' },
          { who: 'old', text: 'They would be expecting that.' },
        ] },
        { comp: 'wide', lines: [
          { who: 'old', text: 'One slice will not do it. This takes all of you. Every crumb. Find out where it leads.' },
          { who: 'jumbo', text: 'A point of order. Will you be joining us in the field, sir?' },
          { who: 'naples', text: 'Sì. You, who have seen so much. Who sends us out there. You come, yes?' },
        ] },
        { comp: 'oldtimer', lines: [
          { who: 'old', text: "Me? Kid, I've been in this box for a long time." },
          { who: 'old', text: "I'm too stale for this shit." },
        ] },
      ],
    },
  ];

  // A word between slices. First match wins. `by` gives each pizza its own version of a line.
  const RETURNS = [
    { when: L => L.lastOutcome === 'delivered', lines: [{ who: 'old', text: 'Good. The customer suspects nothing.' }] },
    { when: L => L.left === 2 && L.remaining > 1, lines: [{ who: 'old', text: 'Two left and work to do. Do not make me fire up the oven.' }] },
    { when: L => L.left === 1, lines: [{ who: 'pizza', by: { ny: "This is the last a me, boss.", deep: 'This is all of me there is.', jumbo: 'Let the record show that I am down to one.', naples: 'Uno. I am uno.' } }, { who: 'old', text: 'Kid, I know the feeling.' }] },
    { when: L => L.filmed, lines: [{ who: 'old', text: 'They got your picture. Put it on the board.' }] },
    { when: L => L.lastOutcome === 'cold', lines: [{ who: 'pizza', by: { ny: "It's freezin' out there, boss.", deep: 'Cold. Should have stayed in the pan.', jumbo: 'I wish to enter into the record that it was very cold.', naples: 'I was made in a fire. I do not do this.' } }, { who: 'old', text: 'It always is. Go. Stay moving.' }] },
    { when: L => L.nemesisPower >= 2, lines: [{ who: 'pizza', by: { ny: 'That thing out there, it got bigger.', deep: 'It got bigger.', jumbo: 'That thing has, by all estimates, grown.', naples: 'Is bigger now. Why is it bigger?' } }, { who: 'old', text: 'Then The Order knows we are close.' }] },
    { when: L => L.owesNinjas > 0, lines: [{ who: 'old', text: 'The ninjas will want paying again. Nothing personal. It is just Tuesday.' }] },
    { when: () => true, lines: [{ who: 'pizza', by: { ny: 'You didn\'t tell us about that.', deep: 'You did not mention that.', jumbo: 'I was not briefed on that.', naples: 'Nobody told me about this.' } }, { who: 'old', text: 'Would you have gone? Next.' }] },
  ];

  // Who says what, and their sound. Everything in a pizza's mouth goes through its voice.
  const SPEAKERS = {
    old: 'The Old Timer', ny: 'Vinny Two-Fold', deep: 'Big Stan', jumbo: 'Phil A. Buster', naples: 'La Contessa', alewife: 'DJ Alewife',
  };

  // What a pizza says out loud on the street, by event. One at a time, and not often.
  const QUIPS = {
    ny: {
      deploy: ["Awright, let's get this over with.", 'Outta my way, comin\' through.'], hurt: ['Hey! Watch the crust!', 'Oh, you wanna go?', "That's comin' outta your tip."],
      cold: ["I'm losin' my edge here."], stomp: ['Fuhgeddaboudit.', 'Get outta here!'], grab: ['Now we\'re talkin\'.'], spent: ['Aw, nuts. Plain.'],
      filmed: ['Hey! No pictures!'], mutant: ['What was that? In the drain?'], box: ['Thank you, I do my own stunts.'], door: ["That's the place."],
    },
    deep: {
      deploy: ['Slowly, then.', 'This better be worth it.'], hurt: ['That left a mark.', 'Hey.', 'I felt that.'],
      cold: ['Sauce is setting.'], stomp: ['Sorry.', 'I warned you.'], grab: ['More. Good.'], spent: ['That was the good part.'],
      filmed: ['Not my good side.'], mutant: ['Oh no. Not running.'], box: ['Walls are a suggestion.'], door: ['Finally.'],
    },
    jumbo: {
      deploy: ['I shall be brief. I shall be enormous.', 'Mind the overhang.'], hurt: ['I object!', 'Point of order!', 'Noted, and resented!'],
      cold: ['I am drooping, and I yield.'], stomp: ['Motion carried.', 'Sustained!'], grab: ['An earmark! For me!'], spent: ['The funds are exhausted.'],
      filmed: ['No comment. Well, a short comment...'], mutant: ['I move to adjourn. Quickly.'], box: ['Bipartisan demolition.'], door: ['I see my constituent.'],
    },
    naples: {
      deploy: ['Ninety seconds. Andiamo.', 'Try to keep up, America.'], hurt: ['Mamma mia!', 'Barbaro!', 'Ma che fai?'],
      cold: ['Fredda! I am going fredda!'], stomp: ['Scusi.', 'Ciao ciao.'], grab: ['At last, an ingredient.'], spent: ['Is better without.'],
      filmed: ['My left, please. My left!'], mutant: ['Madonna, what is that?'], box: ['Cardboard. Everywhere, cardboard.'], door: ['Ecco.'],
    },
  };

  // Sticky notes on "Who is The Order?", all in the Old Timer's hand. They appear on fixed city milestones.
  const THEORY = [
    { from: 0, text: 'WHO IS THE ORDER?' },
    { from: 0, text: 'Slices go out. Less of them come back. WHERE IS THE REST?' },
    { from: 1, text: 'Teenagers and turtles: AGENTS? (yes)' },
    { from: 2, text: 'The names are ALIASES. Has to be.' },
    { from: 2, text: 'ALL THE WAY TO THE TOP' },
    { from: 3, text: '"Original Italian". On EVERY box. Why??' },
    { from: 4, text: 'Ran out of string at LONG BEACH. NOT an accident.' },
  ];

  // Polaroids start as a name and question marks. Notes appear once the behavior has been seen.
  const ENEMIES = {
    teen: { name: 'Teenager', claim: 'Agent of The Order. Reports back with photographs.', notes: { flees: 'One good pepperoni and it runs home for good.', stomp: 'Soft on top. Cries.', films: 'Takes your picture, and its friends show up next time.', } },
    turtle: { name: 'Turtle', claim: 'Agent of The Order. In place for ninety years, minimum.', notes: { bites: 'Bites, then stops to chew.', munch: 'Throw it something. It will stop to chew.', stun: 'Jump on it and it tucks in. It makes an excellent springboard.', armored: 'Nothing removes a turtle. It was here before us.' } },
    ninja: { name: 'Ninja', claim: 'Senior agent of The Order. I do not like the reports.', notes: { throws: 'Throws things. Keeps its distance.', bounce: 'Do not jump on its head.', climbs: 'Hit it and it takes to the fire escapes. It remembers every hit.', bows: 'Catches whatever you throw. Bows. Throws it straight back.', debt: 'Fights with whatever it took off a fallen slice.', gone: 'The third time, it runs off and does not come back.' } },
    mutant: { name: 'Mutant', claim: 'What is The Order feeding them?', notes: { peeks: 'Watch the storm drains. It looks before it comes.', chases: 'It comes up behind you, fast.', feed: 'Catches food and goes back down, for good.', bite: 'One bite and it goes home. One.' } },
  };

  const BARKS = {
    hot: 'Heat holding. You are magnificent.', warm: 'Lukewarm. Stay focused.', cold: 'Cold now. The cheese has given up on you.',
    bow: 'The ninja catches it. Bows. Here it comes back.', feed: 'It catches it and goes back down the drain.',
    filmed: 'A teenager took your picture.', fire: 'Warm again, for now.',
    recovered: 'Topping back in hand.', note: 'New note on the board.', paper: 'Something was in the box.',
    pickup: 'Three uses. The old topping is gone.', spent: 'Back to plain cheese.', checkpoint: 'Checkpoint:', gate: 'The boxes block the way. Break them.',
    flees: 'It ran off crying. It will not be back.', ninjaGone: 'It has had enough. It runs off and will not be back.', ninjaHit: 'It remembers that.',
    drain: 'Something in the storm drain.', almost: 'just ahead', missed: 'Rerouting...', bite: 'One bite and it goes home.', nope: 'Not this address yet.',
  };

  const BOX_PAPER = [
    'CARBON COPY: "Still warm?" "Still warm." The same exchange, over and over.',
    'PERSONNEL FILE: Beer Sprite Lite. Powers: none. Performance: exemplary.',
    'TICKET STUB: Slice must build a band of brothers. The handwriting looks young.',
    'NAPKIN, IN THE OLD TIMER\'S HAND: The Kates, Katies, Kaitlins and Caitlyns do not meet. They do not need to.',
  ];

  // Zanier as the run goes on. Each city's customer is listed on its own order.
  const SPELLINGS = ['Kaetlinne', 'Ketlin', "Kay T'Lynn", 'Cateliñ', 'K-Lyn', 'Katelyn²', 'Kaitlyn (ask for Dave)'];
  // Where a photo's new teenagers turn up, relative to where it was taken.
  const PHOTO_ARRIVALS = [-260, 320];
  const NINJA_HITS = 3;
  // A slice can lose this many bites. Each one takes the same share of its heat, and that share never comes back.
  const BITES = 5;
  const CHARGES = 3;
  const ORDER_NUMBER = '0825';
  const PRINTER_CLOCK = '12:00 AM';

  const CITY_LOST = [{ who: 'old', text: 'That whole pizza is gone. Deep undercover. Finest operatives I ever sent.' }, { who: 'old', text: 'The order still stands. Send another.' }];

  const ENDING = {
    finale: [{ comp: 'polaroid', lines: [{ who: 'old', mood: 'squint', text: 'Know thy enemy...' }] }],
    card: { line: 'To be continued...?', listen: 'Listen to DJ Alewife here', youtube: 'https://www.youtube.com/@djalewife', birthday: '(Happy birthday Katelyn!)' },
  };

  // Where the corkboard sits in the HQ painting. The game draws live evidence onto it.
  const HQ_BOARD = { x: 712, y: 82, w: 496, h: 326 };

  const api = { CITY_LOST, TOPPINGS, STYLES, SPEAKERS, QUIPS, CITIES, RETURNS, THEORY, ENEMIES, BARKS, BOX_PAPER, PHOTO_ARRIVALS, NINJA_HITS, BITES, CHARGES, SPELLINGS, ORDER_NUMBER, PRINTER_CLOCK, ENDING, HQ_BOARD };
  if (typeof module !== 'undefined') module.exports = api; else root.PR_CONTENT = api;
})(typeof window !== 'undefined' ? window : globalThis);
