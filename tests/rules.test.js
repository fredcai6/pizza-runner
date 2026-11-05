const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/rules.js');
const C = require('../js/content.js');

const fresh = () => { const c = R.newCampaign(); R.startCity(c, 'pepperoni', 'garlic'); return c; };
const street = c => c.streets[R.currentCity(c).id];
const pie = c => c.pies[R.currentCity(c).id];

test('a pie is half and half, three slices a side', () => {
  const p = pie(fresh());
  assert.deepStrictEqual(p.map(s => s.topping), ['pepperoni', 'pepperoni', 'pepperoni', 'garlic', 'garlic', 'garlic']);
});

test('the street is identical every time', () => {
  for (const city of [...C.CITIES, C.FINALE]) {
    assert.deepStrictEqual(R.generateStreet(city), R.generateStreet(city));
  }
});

test('platforms can be reached from the ground', () => {
  for (const city of C.CITIES) for (const p of R.generateStreet(city).platforms) assert.ok(R.GROUND - p.y <= 125);
});

test('every barricade can be jumped by the heaviest pie', () => {
  const lift = C.STYLES.deep.jump ** 2 / (2 * 0.6);
  for (const city of C.CITIES) for (const c of R.generateStreet(city).barricades) assert.ok(c.h < lift);
});

test('a defeated enemy stays defeated and hands back its toppings', () => {
  const c = fresh(); const e = street(c).enemies[0];
  e.toppings.push('garlic');
  assert.deepStrictEqual(R.defeat(c, e), ['garlic']);
  R.finishRun(c, pie(c)[0], { outcome: 'cold', x: 100 });
  assert.strictEqual(street(c).enemies[0].alive, false);
});

test('the enemy that gets you grows and takes your topping', () => {
  const c = fresh(); const e = street(c).enemies[1];
  R.finishRun(c, pie(c)[0], { outcome: 'dead', killer: e.id, x: 300 });
  assert.strictEqual(e.power, 1);
  assert.deepStrictEqual(e.toppings, ['pepperoni']);
  assert.strictEqual(street(c).dead.length, 1);
});

test('a ninja bribe only lasts the run it was paid in', () => {
  const c = fresh(); const n = street(c).enemies.find(e => e.type === 'ninja');
  R.bribe(c, n, 'pepperoni', 0);
  assert.ok(R.peaceful(n, 0));
  assert.ok(!R.peaceful(n, 1));
  assert.deepStrictEqual(n.toppings, ['pepperoni']);
});

test('a fed mutant stays calm', () => {
  const c = fresh(); const m = street(c).enemies.find(e => e.type === 'mutant');
  R.feed(c, m, 'garlic');
  assert.ok(R.peaceful(m, 0) && R.peaceful(m, 5));
});

test('being filmed speeds up only the next run', () => {
  const c = fresh(); const t = { mods: {} };
  R.finishRun(c, pie(c)[0], { outcome: 'cold', x: 1, filmed: true });
  assert.strictEqual(R.modsFor(street(c), t).enemySpeed, 1.3);
  R.finishRun(c, pie(c)[1], { outcome: 'cold', x: 1, filmed: false });
  assert.strictEqual(R.modsFor(street(c), t).enemySpeed, 1);
});

test('a delivery moves unused slices to the crew and opens the next city', () => {
  const c = fresh();
  R.finishRun(c, pie(c)[0], { outcome: 'cold', x: 1 });
  R.finishRun(c, c.pies.california[1], { outcome: 'delivered', x: 1 });
  assert.strictEqual(c.crew.length, 4);
  assert.strictEqual(c.cityIndex, 1);
  assert.strictEqual(c.phase, 'intro');
});

test('losing all six slices still moves on, with nothing kept', () => {
  const c = fresh();
  for (const s of c.pies.california) R.finishRun(c, s, { outcome: 'cold', x: 1 });
  assert.strictEqual(c.crew.length, 0);
  assert.strictEqual(c.cityIndex, 1);
});

function toFinale(outcomes) {
  const c = R.newCampaign();
  for (const city of C.CITIES) {
    R.startCity(c, city.pantry[0], city.pantry[1]);
    for (const s of c.pies[city.id]) {
      if (c.cityIndex >= C.CITIES.length || R.currentCity(c).id !== city.id) break;
      R.finishRun(c, s, outcomes(c, city));
    }
  }
  return c;
}

test('a campaign with zero slices left can still be won', () => {
  const c = toFinale(() => ({ outcome: 'cold', x: 1 }));
  assert.strictEqual(c.phase, 'finale-intro');
  const boss = c.streets.finale.enemies.find(e => e.type === 'boss');
  for (let i = 0; i < 3; i++) {
    const roster = R.finaleRoster(c);
    assert.strictEqual(roster[0].style, 'crust');
    R.finishRun(c, roster[0], { outcome: 'dead', killer: boss.id, x: 1 });
    roster[0].status = 'ready';
  }
  while (boss.alive) R.defeat(c, boss);
  R.finishRun(c, R.finaleRoster(c)[0], { outcome: 'delivered', x: 1 });
  assert.strictEqual(c.phase, 'ending');
  assert.strictEqual(R.finalReceipt(c).to, 'KATELYN');
  assert.strictEqual(R.finalReceipt(c).date, '08/25/2015');
});

test('the best nemesis of each city comes to the Pass with its toppings', () => {
  const c = toFinale((camp, city) => {
    const e = camp.streets[city.id].enemies[0];
    return { outcome: 'dead', killer: e.id, x: 1 };
  });
  const fin = c.streets.finale.enemies;
  assert.strictEqual(fin.filter(e => e.nemesisFrom).length, 4);
  const boss = fin.find(e => e.type === 'boss');
  assert.ok(boss.toppings.length >= 4);
  assert.strictEqual(boss.hp, 6 + Math.min(boss.toppings.length, 8));
});

test('no receipt before the last spells her name right or shows the date', () => {
  const c = toFinale(() => ({ outcome: 'cold', x: 1 }));
  for (const r of c.receipts) {
    assert.notStrictEqual(r.to, 'KATELYN');
    assert.notStrictEqual(r.date, C.ORDER_DATE);
  }
});

test('later cities can draw tickets earlier ones cannot', () => {
  const draw = city => new Set(Array.from({ length: 400 }, (_, i) => R.spin(city, null, () => (i % 40) / 40).id));
  assert.ok(![...draw(C.CITIES[0])].includes('moon'));
  assert.ok([...draw(C.CITIES[2])].includes('moon'));
});

test('a rewrite ticket amends the last receipt', () => {
  const c = fresh();
  R.finishRun(c, pie(c)[0], { outcome: 'cold', x: 1 });
  R.applyTicket(c, C.TICKETS.find(t => t.rewrite));
  assert.ok(c.receipts[0].amended);
});

test('the radio reacts to the ledger', () => {
  const c = fresh();
  assert.match(R.radio(c), /Expediter/);
  R.finishRun(c, pie(c)[0], { outcome: 'cold', x: 1 });
  assert.match(R.radio(c), /cold/);
});
