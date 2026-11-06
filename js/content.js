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

  const STYLES = {
    ny: { name: 'Slice', speed: 7.2, jump: 23, heatDecay: 1.0, heatMax: 100, blurb: 'A classic. Pepperoni is all the power you need.' },
    deep: { name: 'Deep Dish', speed: 5.9, jump: 22, heatDecay: 0.7, heatMax: 120, special: 'pound', specialName: 'POUND', blurb: 'Slow and heavy, and holds heat longest. POUND from the air.' },
    jumbo: { name: 'Jumbo', speed: 6.7, jump: 22, heatDecay: 0.9, heatMax: 110, special: 'pound', specialName: 'FLOP', scale: 1.2, blurb: 'Far too big. FLOP flattens whatever is underneath.' },
    naples: { name: 'Margherita', speed: 7, jump: 23, heatDecay: 1.5, heatMax: 135, special: 'flare', specialName: 'FLARE', blurb: 'Starts the hottest. FLARE spends heat to burn everything nearby.' },
    thin: { name: 'Thin Crust', speed: 8.3, jump: 23.5, heatDecay: 1.35, heatMax: 100, special: 'dash', specialName: 'DASH', blurb: 'Fast and light, but cools quickly. DASH smashes through anything.' },
  };

  // Route is New York to Long Beach. Menus past New York are provisional.
  const CITIES = [
    {
      id: 'newyork', name: 'New York', style: 'ny', seed: 23, length: 12000, gap: 620,
      menu: { whole: true, a: ['pepperoni'], b: ['pepperoni'] },
      mix: ['teen', 'teen', 'turtle', 'teen', 'turtle'],
      palette: { skyTop: '#55606e', skyBottom: '#a8a29a', ground: '#4a4744', top: '#6c6862', far: '#3a3f47', scenery: 'skyline' },
      customer: 'K8lyn', instructions: 'Leave at the door. Do not ring. Do not linger.',
      door: [{ who: 'customer', text: 'Oh. Pizza. Great, thanks.' }],
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
      id: 'chicago', name: 'Chicago', style: 'deep', seed: 53, length: 15000, gap: 400,
      menu: { a: ['sausage', 'pepperoni', 'mushroom'], b: ['sausage', 'pepperoni', 'mushroom'] },
      mix: ['turtle', 'ninja', 'teen', 'ninja', 'turtle'],
      palette: { skyTop: '#25364d', skyBottom: '#7f9db0', ground: '#3e4a52', top: '#5f6e77', far: '#1f2c3b', scenery: 'towers' },
      customer: 'Kæthlynn', instructions: 'Trust the crust. Keep the box level. It goes all the way to the top.',
      door: [{ who: 'customer', text: 'Took long enough. Is this the deep dish?' }],
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
      id: 'dc', name: 'Washington, DC', style: 'jumbo', seed: 41, length: 14000, gap: 640,
      menu: { a: ['pepperoni', 'garlic', 'mushroom'], b: ['pepperoni', 'garlic', 'mushroom'] },
      mix: ['ninja', 'mutant', 'teen', 'turtle', 'mutant'],
      palette: { skyTop: '#6f8fb0', skyBottom: '#dfe3d8', ground: '#a39c8c', top: '#c9c3b4', far: '#8fa0ad', scenery: 'monument' },
      customer: 'Xaitlyn', instructions: 'Security will wave you through. Nobody will mention this.',
      door: [{ who: 'customer', text: 'That is an enormous slice. Why did I order this?' }],
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
      id: 'naples', name: 'Naples', style: 'naples', seed: 37, length: 16000, gap: 420, predicts: true,
      menu: { a: ['basil', 'garlic', 'pepperoni'], b: ['basil', 'garlic', 'pepperoni'] },
      mix: ['mutant', 'turtle', 'ninja', 'mutant', 'teen', 'ninja'],
      palette: { skyTop: '#47303f', skyBottom: '#e0733f', ground: '#6b5a4b', top: '#8d7867', far: '#35262f', scenery: 'volcano' },
      customer: 'Caterlynna', instructions: 'Il forno sa.',
      door: [{ who: 'customer', text: 'Mamma mia. Who folded this?' }],
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
      id: 'california', name: 'Long Beach', style: 'thin', seed: 11, length: 20000, gap: 430, final: true,
      menu: { a: ['pineapple'], b: ['pepperoni', 'jalapeno', 'garlic', 'mushroom'] },
      mix: ['teen', 'ninja', 'mutant', 'turtle', 'ninja', 'mutant'],
      palette: { skyTop: '#ff9e6d', skyBottom: '#ffe1a8', ground: '#e9cf94', top: '#f5e3b5', far: '#c97b5f', scenery: 'palms' },
      customer: 'KATELYN™', instructions: 'Ring the bell. She is expecting you. She has always been expecting you.',
      door: [{ who: 'alewife', text: '[DJ ALEWIFE AT THE DOOR: LINE TO COME]' }],
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
    teen: { name: 'Teenager', notes: { stomp: 'Soft on top.', films: 'SURVEILLANCE. Takes your picture, and everyone hears about it.', distract: 'Easily distracted. Do not trust it.' } },
    turtle: { name: 'Turtle', notes: { armored: 'Shell stops everything small.', smash: 'A hard enough smash breaks the shell. Paper inside.' } },
    ninja: { name: 'Ninja', notes: { throws: 'Throws things. Keeps its distance.', bribe: 'Takes a topping and looks the other way.', debt: 'Expects paying again. Fights with whatever you paid.' } },
    mutant: { name: 'Mutant', notes: { chases: 'It follows you. It seems sad about it.', feed: 'It chews, and something changes.' } },
  };

  const BARKS = {
    hot: 'Heat holding. You are magnificent.', warm: 'Lukewarm. Stay focused.', cold: 'Cold now. The cheese has given up on you.',
    bribe: 'The ninja bows. It keeps the topping.', feed: 'The mutant chews, and seems to remember something.',
    distract: 'The teenager has found something better.', filmed: 'A teenager took your picture.', fire: 'Warm again, for now.',
    recovered: 'You took your topping back.', note: 'New note on the board.', paper: 'Something fell out of the shell.',
  };

  const SHELL_PAPER = [
    'CARBON COPY: "Still warm?" "Still warm." The same exchange, over and over.',
    'PERSONNEL FILE: Beer Sprite Lite. Powers: none. Performance: exemplary.',
    'TICKET STUB: Slice must build a band of brothers. The handwriting looks young.',
    'NOTE ON GREASY NAPKIN: The Kates, Katies, Kaitlins and Caitlyns do not meet. They do not need to.',
  ];

  // Zanier as the run goes on. Each city's customer is listed on its own order.
  const SPELLINGS = ['Kaytlynne', 'Qatelyn', 'Ceightlyn', 'Cat Lynn', 'Katelynnnnn', 'KTLN', 'Kate? Lin?', 'Caitlyn (the C is silent)', 'Kaetlinne', 'Ketlin', "Kay T'Lynn", 'Cateliñ', 'K-Lyn', 'Katelyn²', 'Kaitlyn (ask for Dave)'];
  const ORDER_NUMBER = '0825';
  const PRINTER_CLOCK = '12:00 AM';

  const ENDING = {
    finale: [{ comp: 'polaroid', lines: [{ who: 'old', mood: 'squint', text: 'Know thy enemy...' }] }],
    card: { line: 'To be continued...', listen: 'Listen to DJ Alewife here', youtube: null, birthday: '(Happy birthday Katelyn!)' },
  };

  // Where the corkboard sits in the HQ painting. The game draws live evidence onto it.
  const HQ_BOARD = { x: 712, y: 82, w: 496, h: 326 };

  const api = { TOPPINGS, STYLES, CITIES, RETURNS, THEORY, ENEMIES, BARKS, SHELL_PAPER, SPELLINGS, ORDER_NUMBER, PRINTER_CLOCK, ENDING, HQ_BOARD };
  if (typeof module !== 'undefined') module.exports = api; else root.PR_CONTENT = api;
})(typeof window !== 'undefined' ? window : globalThis);
