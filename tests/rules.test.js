const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/rules.js');
const C = require('../js/content.js');

const city = c => R.currentCity(c);
const street = c => c.streets[city(c).id];
const pie = c => c.pies[city(c).id];
const order = c => { const m = city(c).menu; R.placeOrder(c, m.a[0], m.b[0]); };
const fresh = () => { const c = R.newCampaign(); order(c); return c; };
const lose = (c, s = R.ready(pie(c))[0]) => R.finishRun(c, s, { outcome: 'cold', x: 100 });
const deliver = (c, s = R.ready(pie(c))[0]) => R.finishRun(c, s, { outcome: 'delivered', x: 100 });

test('the route runs New York to Long Beach and ends there', () => {
  assert.deepStrictEqual(C.CITIES.map(x => x.id), ['newyork', 'chicago', 'dc', 'naples', 'california']);
  assert.ok(C.CITIES[4].final);
  assert.strictEqual(C.CITIES.filter(x => x.final).length, 1);
});

test('New York is pepperoni only', () => {
  const c = R.newCampaign();
  assert.throws(() => R.placeOrder(c, 'pepperoni', 'garlic'));
  R.placeOrder(c, 'pepperoni', 'pepperoni');
  assert.ok(pie(c).slices.every(s => s.topping === 'pepperoni'));
});

test('New York has no special move', () => {
  assert.strictEqual(C.STYLES.ny.special, undefined);
  for (const [k, v] of Object.entries(C.STYLES)) if (k !== 'ny') assert.ok(v.special && v.specialName);
});

test('a pie is half and half, three slices a side', () => {
  const p = R.buildPie(C.CITIES[1], 'sausage', 'mushroom');
  assert.deepStrictEqual(p.slices.map(s => s.topping), ['sausage', 'sausage', 'sausage', 'mushroom', 'mushroom', 'mushroom']);
});

test('streets are identical every time', () => {
  for (const x of C.CITIES) assert.deepStrictEqual(R.generateStreet(x), R.generateStreet(x));
});

test('every barricade and platform can be reached by the heaviest pie', () => {
  const lift = Math.min(...Object.values(C.STYLES).map(s => s.jump ** 2 / (2 * 1.05)));
  for (const x of C.CITIES) {
    const s = R.generateStreet(x);
    for (const b of s.barricades) assert.ok(b.h < lift);
    for (const p of s.platforms) assert.ok(R.GROUND - p.y < lift);
  }
});

test('a defeated enemy stays gone and hands back its toppings', () => {
  const c = fresh(), e = street(c).enemies[0];
  e.toppings.push('pepperoni');
  assert.deepStrictEqual(R.defeat(c, e), ['pepperoni']);
  lose(c);
  assert.strictEqual(street(c).enemies[0].alive, false);
});

test('the enemy that gets you grows and takes your topping', () => {
  const c = fresh(), e = street(c).enemies[1];
  R.finishRun(c, pie(c).slices[0], { outcome: 'dead', killer: e.id, x: 300 });
  assert.strictEqual(e.power, 1);
  assert.deepStrictEqual(e.toppings, ['pepperoni']);
  assert.strictEqual(street(c).dead.length, 1);
});

test('a ninja bribe lasts one run, and a fed mutant stays calm', () => {
  const c = fresh();
  const n = { toppings: [], bribedRun: -1 }, m = { toppings: [], bribedRun: -1 };
  R.bribe(c, n, 'pepperoni', 0);
  R.feed(c, m, 'garlic');
  assert.ok(R.peaceful(n, 0) && !R.peaceful(n, 1));
  assert.ok(R.peaceful(m, 0) && R.peaceful(m, 9));
});

test('a delivery ends the city, and its leftovers stay behind', () => {
  const c = fresh();
  lose(c);
  assert.strictEqual(c.phase, 'return');
  deliver(c);
  assert.strictEqual(c.phase, 'door');
  R.leaveCity(c);
  assert.strictEqual(c.cityIndex, 1);
  assert.strictEqual(c.phase, 'briefing');
  assert.strictEqual(c.pies.newyork.slices.filter(s => s.status === 'ready').length, 4);
});

test('every city uses its own fresh pie', () => {
  const c = fresh(); deliver(c); R.leaveCity(c); order(c);
  assert.strictEqual(R.ready(pie(c)).length, 6);
  assert.strictEqual(pie(c).slices[0].style, 'deep');
});

test('losing all six goes undercover and the story moves on', () => {
  const c = fresh();
  for (let i = 0; i < 6; i++) lose(c);
  assert.strictEqual(c.phase, 'missed');
  assert.strictEqual(R.roster(c).filter(r => r.taped).length, 1);
  R.leaveCity(c);
  assert.strictEqual(c.cityIndex, 1);
});

test('delivering with the last slice also tapes the roster', () => {
  const c = fresh();
  for (let i = 0; i < 5; i++) lose(c);
  deliver(c);
  assert.strictEqual(c.phase, 'door');
  assert.ok(R.roster(c).find(r => r.city === 'newyork').taped);
});

test('in the last city a lost pie reorders onto the same street', () => {
  const c = R.newCampaign();
  for (let i = 0; i < 4; i++) { order(c); deliver(c); R.leaveCity(c); }
  order(c);
  const first = street(c).enemies[0];
  R.defeat(c, first);
  const living = street(c).enemies.filter(e => e.alive).length;
  street(c).fires[0].lit = false;
  for (let i = 0; i < 6; i++) lose(c);
  assert.strictEqual(c.phase, 'reorder');
  order(c);
  assert.strictEqual(R.ready(pie(c)).length, 6);
  assert.strictEqual(pie(c).reorder, 1);
  assert.strictEqual(street(c).enemies[0].alive, false);
  assert.strictEqual(street(c).dead.length, 6);
  assert.ok(street(c).fires.every(f => f.lit));
  assert.strictEqual(street(c).enemies.filter(e => e.alive).length, Math.floor(living / 2));
  deliver(c);
  R.leaveCity(c);
  assert.strictEqual(c.phase, 'ending');
  assert.strictEqual(R.headquarters(c).alewife, true);
});

test('enough lost pies always empties the last street', () => {
  const c = R.newCampaign();
  for (let i = 0; i < 4; i++) { order(c); deliver(c); R.leaveCity(c); }
  order(c);
  street(c).enemies[3].power = 5;
  let pies = 1;
  while (street(c).enemies.some(e => e.alive)) {
    for (let i = 0; i < 6; i++) lose(c);
    order(c); pies++;
    assert.ok(!street(c).enemies[3].alive);
    assert.ok(pies < 12);
  }
});

test('HQ starts with five cold plain pizzas and shows what happened', () => {
  const c = R.newCampaign();
  const before = R.headquarters(c);
  assert.strictEqual(before.pizzas.length, 5);
  assert.ok(before.pizzas.every(p => !p.a && p.left === 6));
  order(c); deliver(c);
  const after = R.headquarters(c).pizzas[0];
  assert.strictEqual(after.a, 'pepperoni');
  assert.strictEqual(after.left, 5);
});

test('enemy notes stay hidden until the behavior is seen', () => {
  const c = fresh();
  assert.deepStrictEqual(R.enemyFile(c, 'teen').notes, []);
  assert.strictEqual(R.learn(c, 'teen', 'films'), true);
  assert.strictEqual(R.learn(c, 'teen', 'films'), false);
  assert.strictEqual(R.enemyFile(c, 'teen').notes.length, 1);
});

test('theory notes follow city milestones regardless of enemy encounters', () => {
  const c = fresh();
  const n = R.theory(c).length;
  deliver(c); R.leaveCity(c);
  assert.ok(R.theory(c).length > n);
});

test('every receipt is an alias and a different spelling from the last', () => {
  const c = fresh();
  for (let i = 0; i < 3; i++) lose(c);
  const names = c.receipts.map(r => r.to);
  assert.strictEqual(new Set(names).size, 3);
  assert.ok(!names.includes('Katelyn'));
  assert.deepStrictEqual(R.aliases(c), names);
});

test('being filmed lasts only the next run', () => {
  const c = fresh();
  R.finishRun(c, pie(c).slices[0], { outcome: 'cold', x: 1, filmed: true });
  assert.strictEqual(street(c).filmed, true);
  lose(c);
  assert.strictEqual(street(c).filmed, false);
});

test('scenes stay within the cutscene budget', () => {
  const check = shots => {
    assert.ok(shots.length <= 3);
    assert.ok(shots.flatMap(s => s.lines).length <= 10);
  };
  for (const x of C.CITIES) check(x.briefing);
  for (const r of C.RETURNS) check([{ lines: r.lines }]);
  check(C.ENDING.finale);
});

test('Chicago quotes what the old slice only says later', () => {
  const said = C.CITIES[2].briefing.flatMap(s => s.lines).map(l => l.text);
  assert.ok(said.includes(C.CITIES[1].instructions));
});

test('the story has nothing left from the old design', () => {
  const text = JSON.stringify(C);
  for (const word of ['Lazy Susan', 'Great Recall', 'contraband', 'stale crust', 'The Pass']) assert.ok(!text.includes(word), word);
});

test('the end card has no link until a real one is supplied', () => {
  assert.strictEqual(C.ENDING.card.youtube, null);
  assert.match(C.ENDING.finale[0].lines[0].text, /^Know thy enemy\.\.\.$/);
});

test('a save survives a trip through JSON', () => {
  const c = fresh(); lose(c);
  const back = JSON.parse(JSON.stringify(c));
  assert.deepStrictEqual(R.headquarters(back), R.headquarters(c));
  assert.strictEqual(R.ready(back.pies.newyork).length, 5);
});
