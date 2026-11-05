// Everything a writer would touch lives here: words, cities, toppings, tables.
(function (root) {
  const TOPPINGS = {
    pepperoni: { name: 'Pepperoni', color: '#c8321e', kind: 'shot', charges: 12, blurb: 'Fires pepperoni straight ahead.' },
    jalapeno: { name: 'Jalapeño', color: '#3f9b35', kind: 'bounce', charges: 9, blurb: 'Bouncing fireballs.' },
    garlic: { name: 'Onion & garlic', color: '#e6dfb8', kind: 'aura', charges: 14, blurb: 'A stank that hurts whatever stands in it.' },
    mushroom: { name: 'Mushroom', color: '#9c7b5e', kind: 'leap', charges: 8, blurb: 'A huge jump, even in midair.' },
    basil: { name: 'Basil', color: '#2f7d3a', kind: 'reheat', charges: 4, blurb: 'Restores heat. Naples approves.' },
    pineapple: { name: 'Pineapple', color: '#f2c531', kind: 'scatter', charges: 7, blurb: 'Three shots at once. Illegal in Naples.' },
    sausage: { name: 'Sausage', color: '#7a3b22', kind: 'slam', charges: 7, blurb: 'A shockwave along the ground.' },
  };

  const STYLES = {
    thin: { name: 'Thin Crust', speed: 4.6, jump: 13.8, heatDecay: 1.45, heatMax: 100, special: 'dash', specialName: 'DASH', blurb: 'Fast and light, but cools quickly. DASH smashes through anything.' },
    ny: { name: 'Slice', speed: 4, jump: 13.5, heatDecay: 1.1, heatMax: 100, special: 'fold', specialName: 'FOLD', blurb: 'Folds in half to slide through trouble and smash shells.' },
    naples: { name: 'Margherita', speed: 3.9, jump: 13.5, heatDecay: 1.6, heatMax: 135, special: 'flare', specialName: 'FLARE', blurb: 'Starts the hottest. FLARE spends heat to burn everything nearby.' },
    deep: { name: 'Deep Dish', speed: 3.3, jump: 12.8, heatDecay: 0.7, heatMax: 120, special: 'pound', specialName: 'POUND', blurb: 'Slow and heavy, and holds heat longest. POUND from the air.' },
    crust: { name: 'Stale Crust', speed: 3.5, jump: 13, heatDecay: 0.5, heatMax: 70, special: 'dash', specialName: 'DASH', blurb: 'All that is left. It refuses to stop.' },
  };

  const CITIES = [
    {
      id: 'california', name: 'California', style: 'thin', tier: 0, seed: 11, length: 8000,
      pantry: ['pepperoni', 'jalapeno', 'garlic', 'mushroom', 'pineapple'],
      mix: ['teen', 'teen', 'turtle', 'mutant', 'ninja'],
      palette: { skyTop: '#ff9e6d', skyBottom: '#ffe1a8', ground: '#e9cf94', top: '#f5e3b5', far: '#c97b5f', scenery: 'palms' },
      customer: 'Operative Sandy, last known surfer',
      panels: [
        'Since the Great Recall, pizza is illegal. Ovens are contraband. Crusts are confiscated.',
        'But somewhere The Order still takes orders, and every ticket spins on the Lazy Susan.',
        'A pie has been boxed on what is left of the Pacific Coast Highway. You are that pie. It is delicious and doomed.',
      ],
    },
    {
      id: 'newyork', name: 'New York', style: 'ny', tier: 1, seed: 23, length: 8600,
      pantry: ['pepperoni', 'garlic', 'mushroom', 'jalapeno', 'sausage'],
      mix: ['ninja', 'teen', 'turtle', 'ninja', 'mutant'],
      palette: { skyTop: '#55606e', skyBottom: '#a8a29a', ground: '#4a4744', top: '#6c6862', far: '#3a3f47', scenery: 'skyline' },
      customer: 'Operative Vinny, sewer division',
      panels: [
        'New York survived the end of the world and has complaints.',
        'The ninjas run a protection racket here. The tickets have started to bite back.',
        'The receipt from California was wrong. Nobody at The Order will say why.',
      ],
    },
    {
      id: 'naples', name: 'Naples', style: 'naples', tier: 2, seed: 37, length: 8600,
      pantry: ['basil', 'garlic', 'pepperoni'],
      mix: ['mutant', 'turtle', 'mutant', 'ninja', 'teen'],
      palette: { skyTop: '#47303f', skyBottom: '#e0733f', ground: '#6b5a4b', top: '#8d7867', far: '#35262f', scenery: 'volcano' },
      customer: 'Operative Nonna, who is not impressed',
      panels: [
        'Where it began. The ovens here never went out, and nobody remembers lighting them.',
        'The mutants come to the ovens to smell what they used to be.',
        'Tonight the Lazy Susan is reaching for things that were supposed to be fixed.',
      ],
    },
    {
      id: 'chicago', name: 'Chicago', style: 'deep', tier: 3, seed: 53, length: 9000,
      pantry: ['sausage', 'pepperoni', 'mushroom', 'garlic', 'jalapeno'],
      mix: ['turtle', 'ninja', 'mutant', 'teen', 'turtle'],
      palette: { skyTop: '#25364d', skyBottom: '#7f9db0', ground: '#3e4a52', top: '#5f6e77', far: '#1f2c3b', scenery: 'towers' },
      customer: 'Operative Big Lou, keeper of the pan',
      panels: [
        'The wind off the lake could cool a pie in minutes. A deep dish takes longer.',
        'The turtles here are old. Older than the Recall. Their shells are full of paper.',
        'Your topping receipt came through already. It is dated before you chose.',
      ],
    },
  ];

  const FINALE = {
    id: 'finale', name: 'The Pass', tier: 3, seed: 71, length: 6000, finale: true,
    mix: ['ninja', 'turtle', 'teen', 'mutant'],
    palette: { skyTop: '#1b1420', skyBottom: '#5a2d32', ground: '#2e2528', top: '#4c3b3e', far: '#120d14', scenery: 'tickets' },
    customer: 'The Expediter',
    panels: [
      'Every ticket on the rail has the same order number. They always have.',
      'Everything that ever ate one of you has come to the Pass, and it brought your toppings.',
      'Beyond it, someone has been waiting for this delivery for a very long time.',
    ],
  };

  // Every run spins the Lazy Susan. A ticket's tier is the first city it can appear in.
  const TICKETS = [
    { id: 'extra-cheese', tier: 0, title: 'EXTRA CHEESE', text: 'The Order is feeling generous. +4 topping charges.', mods: { bonusCharges: 4 } },
    { id: 'fresh-box', tier: 0, title: 'FRESH BOX', text: 'A new insulated box. You cool down slower.', mods: { heatDecay: 0.7 } },
    { id: 'tailwind', tier: 0, title: 'TAILWIND', text: 'Somebody up there likes you. Run faster.', mods: { speed: 1.12 } },
    { id: 'nothing', tier: 0, title: 'NO PRIZE', text: 'Thanks for playing.', mods: {} },
    { id: 'cold-snap', tier: 1, title: 'COLD SNAP', text: 'The Order regrets to inform you of weather.', mods: { heatDecay: 1.5 } },
    { id: 'recall', tier: 1, title: 'PARTIAL RECALL', text: 'Half your toppings have been seized.', mods: { chargeScale: 0.5 } },
    { id: 'fires-out', tier: 1, title: 'FIRE MARSHAL', text: 'Every barrel fire on this street is out for this run.', mods: { noFires: true } },
    { id: 'moon', tier: 2, title: 'THE MOON IS CLOSER', text: 'Nobody has an explanation. Gravity is reduced.', mods: { gravity: 0.72 } },
    { id: 'blackout', tier: 2, title: 'BLACKOUT', text: 'The street has been unlit by order of The Order.', mods: { dark: true } },
    { id: 'rewrite', tier: 2, title: 'CLERICAL CORRECTION', text: 'One of your old receipts has been amended. It always said that.', mods: {}, rewrite: true },
    { id: 'heavy', tier: 3, title: 'THE TICKET THAT DREW YOU', text: 'You did not spin this. You are not sure who did.', mods: { gravity: 1.2, speed: 1.15 } },
  ];

  // Shells are full of older paper. These drop in order, one per broken turtle.
  const LORE = [
    'CARBON COPY: "Order received. Do not rush it." Signed with a K, or possibly a C.',
    'INTERNAL MEMO: Is anyone actually spinning the Lazy Susan? Please advise.',
    'INTERNAL MEMO: Disregard the above. The Lazy Susan has always been spinning.',
    'NOTE ON GREASE-STAINED NAPKIN: The Kates, Katies, Kaitlins and Caitlyns do not meet. They do not need to.',
    'TICKET STUB: Jumbo sends regards from D.C. and asks that you stop calling.',
    'PERSONNEL FILE: Beer Sprite Lite. Powers: none. Performance: exemplary.',
    'PAGE TORN FROM A NOTEBOOK: "Slice must build a band of brothers." The handwriting looks young.',
    'CARBON COPY: "Still warm?" "Still warm." The same exchange, repeated for years.',
    'TICKET STUB: The great pizza treasure is not a treasure. It is a customer.',
  ];

  // Radio cards are picked by the highest priority whose condition holds.
  const RADIO = [
    { priority: 90, when: L => L.deathsThisCity >= 5, text: 'Last slice. The Order does not do pep talks. Please come back anyway.' },
    { priority: 80, when: L => L.lastOutcome === 'cold', text: 'That last one went cold on the route. You could just keep moving. That is the whole job.' },
    { priority: 75, when: L => L.owesNinjas > 0, text: 'The ninjas will want paying again. They always do. It is nothing personal, it is just Tuesday.' },
    { priority: 70, when: L => L.lastOutcome === 'dead' && L.nemesisPower >= 2, text: 'That thing out there has eaten more of you than I am comfortable with.' },
    { priority: 60, when: L => L.lastOutcome === 'dead', text: 'One of you did not make it. Same street, same order. Go.' },
    { priority: 50, when: L => L.filmed, text: 'A teenager filmed your last run. It has numbers. Everyone out there knows your moves.' },
    { priority: 40, when: L => L.fed >= 2, text: 'The mutants have been asking about you. Some of them remember lunch.' },
    { priority: 10, when: () => true, text: 'This is the Expediter. You are hot, you are boxed, you are late. Go.' },
  ];

  const BARKS = {
    hot: 'Heat holding. You are magnificent.',
    warm: 'Lukewarm. You have seen better days.',
    cold: 'Cold now. The cheese has given up on you.',
    bribe: 'The ninja bows. It keeps the topping.',
    feed: 'The mutant chews, and seems to remember something.',
    distract: 'The teenager has found something better.',
    filmed: 'A teenager is filming this.',
    lore: 'Something fell out of the shell.',
    fire: 'Warm again, for now.',
    recovered: 'You took your topping back.',
  };

  const SPELLINGS = ['CAITLIN', 'KAITLYN', 'CATELYN', 'KATELYNN', 'KATE?', 'KAITLIN', 'CAITLYNN', 'KATIE (SP?)'];
  const ORDER_NUMBER = '0825';
  const ORDER_DATE = '08/25/2015';
  const DATE_REVEAL = ['??/??/????', '08/??/????', '08/25/????', '08/25/20??', '08/25/201?'];

  const ENDING = {
    panels: [
      'The Pass is quiet. The last ticket is still on the rail.',
      'Nobody was spinning the Lazy Susan. It kept turning because somebody kept ordering.',
      'You check the name on the box. For the first time, somebody spelled it right.',
    ],
    // Tommy writes this one. It is the last thing she reads.
    note: '[ YOUR NOTE TO KATELYN GOES HERE ]',
  };

  const api = { TOPPINGS, STYLES, CITIES, FINALE, TICKETS, LORE, RADIO, BARKS, SPELLINGS, ORDER_NUMBER, ORDER_DATE, DATE_REVEAL, ENDING };
  if (typeof module !== 'undefined') module.exports = api; else root.PR_CONTENT = api;
})(typeof window !== 'undefined' ? window : globalThis);
