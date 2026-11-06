// Everything a writer would touch lives here. All dialogue is first-draft placeholder
// unless the handoff quotes it as settled. Long Beach specifics are still to come.
(function (root) {
  const TOPPINGS = {
    pepperoni: { name: 'Pepperoni', color: '#c8321e', kind: 'shot', charges: 14, blurb: 'Fires pepperoni straight ahead.' },
    jalapeno: { name: 'Jalapeño', color: '#3f9b35', kind: 'bounce', charges: 10, blurb: 'Bouncing fireballs.' },
    garlic: { name: 'Onion & garlic', color: '#e6dfb8', kind: 'aura', charges: 16, blurb: 'A stank that hurts whatever stands in it.' },
    mushroom: { name: 'Mushroom', color: '#9c7b5e', kind: 'leap', charges: 9, blurb: 'A huge jump, even in midair.' },
    basil: { name: 'Basil', color: '#2f7d3a', kind: 'reheat', charges: 5, blurb: 'Restores heat.' },
    pineapple: { name: 'Pineapple', color: '#f2c531', kind: 'scatter', charges: 8, blurb: 'Three shots at once.' },
    sausage: { name: 'Sausage', color: '#7a3b22', kind: 'slam', charges: 8, blurb: 'A shockwave along the ground.' },
  };

  // height is the art's height. w and h are the body it collides with.
  const STYLES = {
    ny: { name: 'Slice', speed: 7.4, accel: 0.9, decel: 1.1, jump: 23, gravity: 1.05, fall: 1.05, maxFall: 24, spring: 0.22, damp: 0.72, heatDecay: 1, heatMax: 100, height: 124, w: 72, h: 96, blurb: 'A classic. Pepperoni is all the power you need.' },
    deep: { name: 'Deep Dish', speed: 5.7, accel: 0.32, decel: 0.42, jump: 19.5, gravity: 1.3, fall: 1.7, maxFall: 30, spring: 0.16, damp: 0.7, heatDecay: 1, heatMax: 100, height: 170, w: 104, h: 132, stomp: true, special: 'pound', specialName: 'SLAM', blurb: 'Enormously heavy. Slow to start, slow to stop, barely leaves the ground. SLAM from the air.' },
    jumbo: { name: 'Jumbo', speed: 6.5, accel: 0.42, decel: 0.3, jump: 22, gravity: 1, fall: 0.3, maxFall: 6.5, spring: 0.09, damp: 0.86, flop: 1, heatDecay: 1, heatMax: 100, height: 240, w: 150, h: 186, special: 'pound', specialName: 'FLOP', blurb: 'Far too big. Drifts down like a wet napkin. FLOP flattens whatever is underneath.' },
    naples: { name: 'Margherita', speed: 9.6, accel: 1.5, decel: 1.5, jump: 23, gravity: 1.05, fall: 1.1, maxFall: 24, spring: 0.3, damp: 0.66, heatDecay: 1.55, heatMax: 100, height: 104, w: 60, h: 80, special: 'dash', specialName: 'DASH', blurb: 'Small, quick, and cools fast. DASH barrels through anything.' },
  };

  // Route is New York to Long Beach. Menus past New York are provisional.
  const CITIES = [
    {
      id: 'newyork', name: 'New York', style: 'ny', seed: 23, stretch: 3900, gap: 720,
      menu: { whole: true, a: ['pepperoni'], b: ['pepperoni'] },
      mix: ['teen', 'teen', 'turtle', 'teen', 'turtle'], pickups: ['pepperoni'],
      areas: [
        { id: 'wallstreet', name: "Wall Street", palette: { skyTop: '#8fa3bb', skyBottom: '#e6d9c6', ground: '#6d6a68', top: '#8d8983' },
          customer: "K8lyn", who: "Stockbroker", instructions: "Leave at the door. Do not ring. Do not linger.",
          door: [{ who: 'customer', text: "I'm on with Tokyo. Put it on the expense account. Sell! SELL!" }] },
        { id: 'centralpark', name: "Central Park", palette: { skyTop: '#9cc3d6', skyBottom: '#eee8c8', ground: '#7d8a5a', top: '#a3ab7a' },
          customer: "Cat Lynn", who: "Bench Guy", instructions: "Third bench past the fountain. He will know.",
          door: [{ who: 'customer', text: "Sit. Sit. The pigeons know you're here. I've been on this bench since 1974." }] },
        { id: 'brooklyn', name: "Brooklyn", palette: { skyTop: '#c9a6a0', skyBottom: '#f3dcc0', ground: '#6f5b56', top: '#94807a' },
          customer: "Katelynnnnn", who: "Local Artisan", instructions: "Gluten is fine. Irony is fine. Ring twice.",
          door: [{ who: 'customer', text: "Is this sourdough? I ferment my own, actually. Bagel the dog says thanks." }] },
      ],
      briefing: [
        { comp: 'wide', lines: [
          { who: 'old', text: 'New recruits. Look at you. Cold, plain, and full of hope.' },
          { who: 'old', text: 'I was a whole pie once. Now I run this room.' },
          { who: 'recruit', text: 'Are we... being eaten?' },
        ] },
        { comp: 'board', lines: [
          { who: 'old', text: 'You are being deployed. There is a difference. Probably.' },
          { who: 'old', text: 'Somebody out there issues The Order. We go undercover and find out who.' },
        ] },
        { comp: 'oldtimer', lines: [
          { who: 'recruit', text: 'What about you, sir?' },
          { who: 'old', text: "I'm too stale for this." },
          { who: 'old', text: 'An order just came through. Pick your toppings.' },
        ] },
      ],
    },
    {
      id: 'chicago', name: 'Chicago', style: 'deep', seed: 53, stretch: 3200, gap: 620,
      menu: { a: ['sausage', 'pepperoni', 'mushroom'], b: ['sausage', 'pepperoni', 'mushroom'] },
      mix: ['teen', 'turtle', 'mutant', 'teen', 'turtle'], pickups: ['jalapeno', 'pepperoni'], watchers: true,
      areas: [
        { id: 'loop', name: "The Loop", palette: { skyTop: '#7f98b3', skyBottom: '#d4dde0', ground: '#49545c', top: '#6c7a83' },
          customer: "Kæthlynn", who: "Da Guy", instructions: "Trust the crust. Keep the box level. It goes all the way to the top.",
          door: [{ who: 'customer', text: "Took long enough. Now that is a pizza. Yous want a beef with that?" }] },
        { id: 'lincolnpark', name: "Lincoln Park", palette: { skyTop: '#a6c9d9', skyBottom: '#f0ead0', ground: '#6f8460', top: '#94a67e' },
          customer: "Caytlinn", who: "Jogging Mom", instructions: "Hand it over while moving. She does not stop.",
          door: [{ who: 'customer', text: "I'm on mile nine. Is it organic? Tyler, say thank you to the pizza." }] },
        { id: 'wickerpark', name: "Wicker Park", palette: { skyTop: '#b39aa0', skyBottom: '#ecd5c0', ground: '#5d4e4c', top: '#83706c' },
          customer: "Kay T'Lynn", who: "Bartender", instructions: "Round the back. Mind the porch stairs.",
          door: [{ who: 'customer', text: "Corner tavern's closed till four. This is the most honest thing that's happened all week." }] },
      ],
      briefing: [
        { comp: 'board', lines: [
          { who: 'old', text: 'Look at the names on these orders. Look at them.' },
          { who: 'recruit', text: 'They all seem kind of similar?' },
          { who: 'old', text: 'Aliases. One operator. Dozens of spellings.' },
        ] },
        { comp: 'oldtimer', lines: [
          { who: 'old', text: "I've been in the dispatch system. Another one just came through." },
          { who: 'old', text: 'Chicago. Go heavy.' },
        ] },
      ],
    },
    {
      id: 'dc', name: 'Washington, DC', style: 'jumbo', seed: 41, stretch: 3500, gap: 600,
      menu: { a: ['pepperoni', 'garlic', 'mushroom'], b: ['pepperoni', 'garlic', 'mushroom'] },
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
        { comp: 'oldtimer', lines: [
          { who: 'recruit', text: 'How far does this go?' },
          // Quoted in Chicago's delivery instructions before he ever says it. Nobody remarks on it.
          { who: 'old', text: 'Trust the crust. Keep the box level. It goes all the way to the top.' },
        ] },
        { comp: 'board', lines: [
          { who: 'old', text: 'The next order is from Washington.' },
          { who: 'old', text: 'Send the big one.' },
        ] },
      ],
    },
    {
      id: 'naples', name: 'Naples', style: 'naples', seed: 37, stretch: 4600, gap: 640, predicts: true,
      menu: { a: ['basil', 'garlic', 'pepperoni'], b: ['basil', 'garlic', 'pepperoni'] },
      mix: ['mutant', 'turtle', 'ninja', 'teen', 'mutant', 'ninja'], pickups: ['jalapeno', 'sausage'],
      areas: [
        { id: 'harbor', name: "The Harbor", palette: { skyTop: '#8fc3d6', skyBottom: '#f6dfb2', ground: '#7a6650', top: '#a58f73' },
          customer: "Caterlynna", who: "Fisherman", instructions: "Il forno sa.",
          door: [{ who: 'customer', text: "From the sea this morning. You, this morning also? Sit, eat, you are too thin." }] },
        { id: 'center', name: "Centro Storico", palette: { skyTop: '#d9a97c', skyBottom: '#f7dcae', ground: '#6b5140', top: '#94765f' },
          customer: "Kate? Lin?", who: "Nonna", instructions: "Fourth floor. Lower the basket.",
          door: [{ who: 'customer', text: "Who made this? Your mother? Tell her she used too much. Mangia." }] },
        { id: 'hillside', name: "Vomero Hill", palette: { skyTop: '#a6c2dc', skyBottom: '#fbe2c8', ground: '#8a6d5a', top: '#b3957f' },
          customer: "Qatelyn", who: "Signore", instructions: "Up the steps. All of them.",
          door: [{ who: 'customer', text: "Ma che bello! A pizza! In THIS house! *gestures at the entire bay*" }] },
      ],
      briefing: [
        { comp: 'board', lines: [
          { who: 'old', text: 'It says "Original Italian Recipe" on the box. Original.' },
          { who: 'recruit', text: 'Sir, that is just printed on every box.' },
          { who: 'old', text: 'Exactly. It is international.' },
        ] },
        { comp: 'oldtimer', lines: [
          { who: 'old', text: 'We go back to where it began. Naples.' },
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
          customer: "KATELYN™", who: "DJ Alewife", instructions: "Ring the bell. She is expecting you. She has always been expecting you.",
          door: [{ who: 'alewife', text: "[DJ ALEWIFE AT THE DOOR: LINE TO COME]" }] },
      ],
      briefing: [
        { comp: 'board', lines: [
          { who: 'old', text: 'Every thread on this board ends in one house.' },
          { who: 'old', text: 'Long Beach, California.' },
        ] },
        { comp: 'oldtimer', lines: [
          { who: 'old', text: 'This is the one. Go find out who has been giving The Order.' },
        ] },
      ],
    },
  ];

  // The short scene after a slice comes back. First match wins.
  const RETURNS = [
    { when: L => L.lastOutcome === 'delivered', lines: [{ who: 'old', text: 'They do not come back. That is how we know they completed the mission.' }] },
    { when: L => L.left === 2 && L.remaining > 1, lines: [{ who: 'old', text: 'Two left and work to do. Do not make me fire up the oven.' }] },
    { when: L => L.left === 1, lines: [{ who: 'recruit', text: 'I am the last one.' }, { who: 'old', text: 'Kid, I know the feeling.' }] },
    { when: L => L.filmed, lines: [{ who: 'old', text: 'They got you on camera. That is surveillance. Put it on the board.' }] },
    { when: L => L.lastOutcome === 'cold', lines: [{ who: 'recruit', text: 'It was so cold out there.' }, { who: 'old', text: 'It always is. Go. Stay moving.' }] },
    { when: L => L.nemesisPower >= 2, lines: [{ who: 'recruit', text: 'That thing out there is getting bigger.' }, { who: 'old', text: 'Then The Order knows we are close.' }] },
    { when: L => L.owesNinjas > 0, lines: [{ who: 'old', text: 'The ninjas will want paying again. Nothing personal. It is just Tuesday.' }] },
    { when: () => true, lines: [{ who: 'recruit', text: 'You did not tell us about that.' }, { who: 'old', text: 'Would you have gone? Next.' }] },
  ];

  // Sticky notes on "Who is The Order?". They appear on fixed city milestones.
  const THEORY = [
    { from: 0, text: 'WHO IS THE ORDER?' },
    { from: 0, text: 'Recruits leave. Recruits do not return. WHERE ARE THEY?' },
    { from: 1, text: 'The names are ALIASES' },
    { from: 2, text: 'It goes ALL THE WAY TO THE TOP' },
    { from: 3, text: 'INTERNATIONAL' },
    { from: 4, text: 'Every thread ends in LONG BEACH' },
  ];

  // Polaroids start as a name and question marks. Notes appear once the behavior has been seen.
  const ENEMIES = {
    teen: { name: 'Teenager', notes: { flees: 'One good pepperoni and it runs home for good.', stomp: 'Soft on top. Cries.', films: 'SURVEILLANCE. Takes your picture, and its friends show up next time.', distract: 'Easily distracted. Do not trust it.' } },
    turtle: { name: 'Turtle', notes: { bites: 'Bites, then stops to chew.', munch: 'Throw it something. It will stop to chew.', stun: 'Jump on it and it tucks in. It makes an excellent springboard.', armored: 'Nothing removes a turtle. It was here before us.' } },
    ninja: { name: 'Ninja', notes: { throws: 'Throws things. Keeps its distance.', bounce: 'Do not jump on its head.', climbs: 'Hit it and it takes to the fire escapes. It remembers every hit.', bribe: 'Takes a topping and looks the other way, for now.', debt: 'Expects paying again. Fights with whatever you paid.', gone: 'Three hits and it does not come back.' } },
    mutant: { name: 'Mutant', notes: { peeks: 'Watch the storm drains. It looks before it comes.', chases: 'It comes up behind you, fast.', feed: 'Catches food and goes back down, for good.', bite: 'One bite and it goes home. One.' } },
  };

  const BARKS = {
    hot: 'Heat holding. You are magnificent.', warm: 'Lukewarm. Stay focused.', cold: 'Cold now. The cheese has given up on you.',
    bribe: 'The ninja bows. It keeps the topping.', feed: 'It catches it and goes back down the drain.',
    distract: 'The teenager has found something better.', filmed: 'A teenager took your picture.', fire: 'Warm again, for now.',
    recovered: 'Topping back in hand.', note: 'New note on the board.', paper: 'Something was in the box.',
    pickup: 'Three uses, then back to the usual.', spent: 'Back to the usual.', checkpoint: 'Checkpoint:', gate: 'The boxes block the way. Break them.',
    flees: 'It ran off crying. It will not be back.', ninjaGone: 'Gone in a puff of smoke. It will not be back.', ninjaHit: 'It remembers that.',
    drain: 'Something in the storm drain.', almost: 'just ahead', missed: 'Rerouting...', bite: 'One bite and it goes home.', nope: 'Not this address yet.',
  };

  const BOX_PAPER = [
    'CARBON COPY: "Still warm?" "Still warm." The same exchange, over and over.',
    'PERSONNEL FILE: Beer Sprite Lite. Powers: none. Performance: exemplary.',
    'TICKET STUB: Slice must build a band of brothers. The handwriting looks young.',
    'NOTE ON GREASY NAPKIN: The Kates, Katies, Kaitlins and Caitlyns do not meet. They do not need to.',
  ];

  // Zanier as the run goes on. Each city's customer is listed on its own order.
  const SPELLINGS = ['Kaetlinne', 'Ketlin', "Kay T'Lynn", 'Cateliñ', 'K-Lyn', 'Katelyn²', 'Kaitlyn (ask for Dave)'];
  // Where a photo's new teenagers turn up, relative to where it was taken.
  const PHOTO_ARRIVALS = [-260, 320];
  const NINJA_HITS = 3;
  const PICKUP_USES = 3;
  const ORDER_NUMBER = '0825';
  const PRINTER_CLOCK = '12:00 AM';

  const CITY_DONE = [{ who: 'old', text: 'All three addresses. Nobody asked any questions. That is the worst part.' }, { who: 'old', text: 'Put it on the board. The next one is already printing.' }];
  const CITY_LOST = [{ who: 'old', text: 'That whole pizza is gone. Deep undercover. Finest operatives I ever sent.' }, { who: 'old', text: 'The order still stands. Send another.' }];

  const ENDING = {
    finale: [{ comp: 'polaroid', lines: [{ who: 'old', mood: 'squint', text: 'Know thy enemy...' }] }],
    card: { line: 'To be continued...', listen: 'Listen to DJ Alewife here', youtube: 'https://www.youtube.com/@djalewife', birthday: '(Happy birthday Katelyn!)' },
  };

  // Where the corkboard sits in the HQ painting. The game draws live evidence onto it.
  const HQ_BOARD = { x: 712, y: 82, w: 496, h: 326 };

  const api = { CITY_DONE, CITY_LOST, TOPPINGS, STYLES, CITIES, RETURNS, THEORY, ENEMIES, BARKS, BOX_PAPER, PHOTO_ARRIVALS, NINJA_HITS, PICKUP_USES, SPELLINGS, ORDER_NUMBER, PRINTER_CLOCK, ENDING, HQ_BOARD };
  if (typeof module !== 'undefined') module.exports = api; else root.PR_CONTENT = api;
})(typeof window !== 'undefined' ? window : globalThis);
