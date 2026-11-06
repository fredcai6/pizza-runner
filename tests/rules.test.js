const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/rules.js');
const C = require('../js/content.js');

const city = c => R.currentCity(c);
const pie = c => c.pies[city(c).id];
const order = (c, a, b) => { const m = city(c).menu; R.placeOrder(c, a || m.a[0], b || m.b[0]); };
const fresh = () => { const c = R.newCampaign(); order(c); return c; };
const lose = c => R.finishRun(c, R.ready(pie(c))[0], { outcome: 'cold', x: 100 });
const deliver = c => { R.finishRun(c, R.ready(pie(c))[0], { outcome: 'delivered', x: 100 }); R.afterDoor(c); };
const finishCity = (c, a, b) => { if (!city(c).final) order(c, a, b); else R.startFinale(c); for (let i = 0; i < city(c).areas.length; i++) deliver(c); R.leaveCity(c); };

test('the route runs New York to Long Beach with four city pizzas', () => {
  assert.deepStrictEqual(C.CITIES.map(x => x.id), ['newyork', 'chicago', 'dc', 'naples', 'california']);
  assert.deepStrictEqual(Object.keys(C.STYLES), ['ny', 'deep', 'jumbo', 'naples']);
  assert.strictEqual(C.CITIES.filter(x => x.final).length, 1);
});

test('New York is pepperoni only, with no special move', () => {
  const c = R.newCampaign();
  assert.throws(() => R.placeOrder(c, 'pepperoni', 'garlic'));
  R.placeOrder(c, 'pepperoni', 'pepperoni');
  assert.ok(pie(c).slices.every(s => s.topping === 'pepperoni'));
  assert.strictEqual(C.STYLES.ny.special, undefined);
});

test('the pizzas move differently and the heavy ones get no extra health', () => {
  const { ny, deep, jumbo, naples } = C.STYLES;
  assert.ok(deep.height > ny.height && deep.speed < ny.speed && deep.jump < ny.jump);
  assert.ok(jumbo.height > deep.height && jumbo.fall < ny.fall / 2);
  assert.ok(naples.height < ny.height && naples.speed > ny.speed && naples.heatDecay > ny.heatDecay);
  assert.strictEqual(naples.special, 'dash');
  for (const s of [deep, jumbo, naples]) assert.strictEqual(s.heatMax, ny.heatMax);
});

test('worlds are identical every time', () => {
  for (const x of C.CITIES) assert.deepStrictEqual(R.newWorld(x), R.newWorld(x));
});

test('every address can be reached from every junction, shortcuts closed', () => {
  for (const x of C.CITIES) {
    const world = R.newWorld(x);
    for (const area of x.areas) for (const node of Object.keys(world.nodes)) {
      assert.ok(R.routes(world, node, `${area.id}.door`), `${x.id}: ${node} to ${area.id}`);
    }
  }
});

test('guidance always points at the address, and stays honest after a missed turn', () => {
  for (const x of C.CITIES) {
    const c = R.newCampaign(); c.cityIndex = C.CITIES.indexOf(x);
    if (x.final) { c.world = R.newWorld(x); } else order(c);
    for (let d = 0; d < x.areas.length; d++) {
      c.world.delivery = d;
      const target = R.addressStreet(c);
      // Follow only the guidance from every street in the city: it must always arrive.
      for (const start of Object.values(c.world.streets)) {
        let street = start, steps = 0;
        while (street.id !== target && steps++ < 20) {
          const g = R.guide(c, street, 200);
          assert.notStrictEqual(g.kind, 'door');
          street = g.street;
        }
        assert.strictEqual(street.id, target, `${x.id}: from ${start.id} to ${target}`);
        assert.ok(steps <= 9, `${start.id} took ${steps} stretches`);
      }
    }
  }
});

test('a straight run to an address needs few decisions', () => {
  const c = fresh(), route = R.routes(c.world, 'start', R.addressStreet(c));
  assert.ok(route.path.length <= 3, route.path.join());
});

test('playtest jumps land in any city at any address with the map open', () => {
  C.CITIES.forEach((x, i) => {
    for (let d = 0; d < 3; d++) {
      const c = R.jumpTo(i, d);
      assert.strictEqual(c.phase, 'map');
      assert.strictEqual(R.addressStreet(c), `${x.areas[d].id}.door`);
      assert.strictEqual(Object.keys(c.world.reached).length, Object.keys(c.world.nodes).length);
      assert.strictEqual(R.ready(c.pies[x.id]).length, x.final ? 8 : 6);
    }
  });
});

test('every street is keep-going or a side turn, one of each at most', () => {
  for (const x of C.CITIES) {
    const { nodes, streets } = R.network(x);
    for (const n of Object.values(nodes)) assert.ok(n.keep, n.id);
    for (const s of Object.values(streets)) assert.ok(nodes[s.from] && nodes[s.to], s.id);
  }
});

test('required obstacles are within every pizza jump', () => {
  for (const s of Object.values(C.STYLES)) assert.ok(s.jump ** 2 / (2 * s.gravity) > 110, s.name);
  for (const x of C.CITIES) for (const s of Object.values(R.newWorld(x).streets)) {
    for (const b of [...s.barricades, ...s.boxes]) assert.ok(b.h <= 100);
  }
});

test('enemies arrive in the agreed order', () => {
  const types = id => new Set(Object.values(R.newWorld(C.CITIES.find(x => x.id === id)).streets).flatMap(s => s.enemies.map(e => e.type)));
  assert.deepStrictEqual([...types('newyork')].sort(), ['teen', 'turtle']);
  assert.ok(types('chicago').has('mutant') && !types('chicago').has('ninja'));
  assert.ok(types('dc').has('ninja') && types('dc').has('mutant'));
});

test('each delivery uses a slice and only the third finishes the city', () => {
  const c = fresh();
  deliver(c);
  assert.strictEqual(c.world.delivery, 1);
  assert.strictEqual(c.phase, 'map');
  assert.strictEqual(R.ready(pie(c)).length, 5);
  deliver(c);
  assert.strictEqual(c.phase, 'map');
  deliver(c);
  assert.strictEqual(c.phase, 'cityDone');
  R.leaveCity(c);
  assert.strictEqual(c.cityIndex, 1);
});

test('the delivery target moves through the areas in order', () => {
  const c = fresh();
  assert.strictEqual(R.addressStreet(c), 'wallstreet.door');
  deliver(c);
  assert.strictEqual(R.addressStreet(c), 'centralpark.door');
});

test('a junction reached on a losing slice stays reached', () => {
  const c = fresh(), street = c.world.streets.lead;
  R.reach(c.world, street);
  lose(c);
  assert.ok(c.world.reached['wallstreet.0']);
  const d = R.deployment(c.world, 'wallstreet.0');
  assert.strictEqual(d.street, 'lead');
  assert.ok(d.x < street.turnAt);
});

test('running out of slices is a city game over, and the world resets', () => {
  const c = R.newCampaign();
  finishCity(c);
  order(c);
  const gone = Object.values(c.world.streets).find(s => s.enemies.length).enemies[0];
  gone.alive = false;
  deliver(c);
  for (let i = 0; i < 5; i++) lose(c);
  assert.strictEqual(c.phase, 'gameover');
  R.retryCity(c);
  assert.strictEqual(c.cityIndex, 1);
  assert.strictEqual(c.phase, 'order');
  order(c);
  assert.strictEqual(c.world.delivery, 0);
  assert.ok(Object.values(c.world.streets).every(s => s.enemies.every(e => e.alive)));
  assert.strictEqual(R.ready(pie(c)).length, 6);
  assert.strictEqual(c.attempts.chicago, 2);
  assert.ok(c.reserves.newyork);
});

test('delivering on the very last slice before the third address still ends the city', () => {
  const c = fresh();
  for (let i = 0; i < 4; i++) lose(c);
  deliver(c);
  assert.strictEqual(c.phase, 'map');
  deliver(c);
  assert.strictEqual(c.phase, 'gameover');
});

test('winning on the last slice wins', () => {
  const c = fresh();
  for (let i = 0; i < 3; i++) lose(c);
  for (let i = 0; i < 3; i++) deliver(c);
  assert.strictEqual(c.phase, 'cityDone');
});

test('Long Beach is exactly eight slices, two from each city, same on every retry', () => {
  const c = R.newCampaign();
  finishCity(c);
  finishCity(c, 'sausage', 'sausage');
  finishCity(c, 'pepperoni', 'garlic');
  finishCity(c, 'basil', 'garlic');
  assert.strictEqual(city(c).id, 'california');
  R.startFinale(c);
  const first = JSON.stringify(pie(c).slices);
  assert.strictEqual(pie(c).slices.length, 8);
  assert.deepStrictEqual(pie(c).slices.map(s => s.style), ['ny', 'ny', 'deep', 'deep', 'jumbo', 'jumbo', 'naples', 'naples']);
  assert.deepStrictEqual(pie(c).slices.slice(2, 4).map(s => s.topping), ['sausage', 'sausage']);
  for (let i = 0; i < 8; i++) lose(c);
  assert.strictEqual(c.phase, 'gameover');
  R.retryCity(c);
  assert.strictEqual(c.phase, 'map');
  assert.strictEqual(JSON.stringify(pie(c).slices), first);
  assert.strictEqual(Object.keys(c.reserves).length, 4);
});

test('leftover lives do not change the reserves', () => {
  const c = R.newCampaign();
  order(c);
  lose(c); lose(c); lose(c);
  for (let i = 0; i < 3; i++) deliver(c);
  R.leaveCity(c);
  assert.strictEqual(c.reserves.newyork.length, 2);
});

test('the third Long Beach delivery goes to the ending', () => {
  const c = R.newCampaign();
  for (let i = 0; i < 5; i++) finishCity(c);
  assert.strictEqual(c.phase, 'ending');
  assert.strictEqual(R.headquarters(c).alewife, true);
});

test('a ninja keeps its hits across slices and leaves on the third', () => {
  const c = fresh(), e = { hits: 0, alive: true, toppings: ['basil'] };
  assert.strictEqual(R.strike(c, e), null);
  assert.strictEqual(R.strike(c, e), null);
  assert.deepStrictEqual(R.strike(c, e), ['basil']);
  assert.strictEqual(e.alive, false);
});

test('a bribe buys this attempt only', () => {
  const c = fresh(), e = { toppings: [], bribed: -1 };
  R.bribe(c, c.world, e, 'pepperoni');
  assert.ok(R.peaceful(e, c.world.run));
  lose(c);
  assert.ok(!R.peaceful(e, c.world.run));
  assert.deepStrictEqual(e.toppings, ['pepperoni']);
});

test('a photo brings local teenagers next attempt and changes no speeds', () => {
  const c = fresh(), street = c.world.streets['wallstreet.main'], before = street.enemies.length;
  street.filmed = 1500;
  lose(c);
  assert.strictEqual(street.enemies.length, before + C.PHOTO_ARRIVALS.length);
  assert.ok(street.enemies.slice(-2).every(e => e.type === 'teen' && Math.abs(e.x - 1500) < 400));
  assert.strictEqual(street.filmed, null);
});

test('a killer that survives keeps growing and keeps the topping it took', () => {
  const c = fresh(), street = c.world.streets['wallstreet.main'], e = street.enemies.find(x => x.type === 'teen');
  R.finishRun(c, R.ready(pie(c))[0], { outcome: 'dead', x: 100, street: street.id, killer: { street: street.id, id: e.id } });
  assert.strictEqual(e.power, 1);
  assert.deepStrictEqual(e.toppings, ['pepperoni']);
  assert.strictEqual(street.dead.length, 1);
});

test('broken shortcut boxes stay broken and open the turn', () => {
  const c = fresh(), lead = c.world.streets.lead;
  assert.strictEqual(R.junction(c.world, lead).open, false);
  assert.ok(R.breakGate(c, 'wallstreet.alley'));
  assert.strictEqual(R.junction(c.world, lead).open, true);
  lose(c);
  assert.strictEqual(R.junction(c.world, lead).open, true);
});

test('each receipt spells the name differently', () => {
  const c = fresh();
  lose(c); lose(c); lose(c);
  assert.strictEqual(new Set(c.receipts.map(r => r.to)).size, 3);
});

test('notes appear only once the behavior is seen', () => {
  const c = fresh();
  assert.strictEqual(R.enemyFile(c, 'mutant').notes.length, 0);
  R.learn(c, 'mutant', 'peeks');
  assert.strictEqual(R.enemyFile(c, 'mutant').notes.length, 1);
});

test('HQ shows four recruits, cold and plain until ordered', () => {
  const c = R.newCampaign();
  const hq = R.headquarters(c);
  assert.strictEqual(hq.pizzas.length, 4);
  assert.ok(hq.pizzas.every(p => !p.used && p.left === 6));
});

test('a used-up pie is taped over as deep undercover', () => {
  const c = fresh();
  for (let i = 0; i < 6; i++) lose(c);
  assert.ok(R.roster(c).find(r => r.city === 'newyork').taped);
});

test('every topping named by a city exists', () => {
  for (const x of C.CITIES) {
    for (const t of x.pickups) assert.ok(C.TOPPINGS[t], t);
    if (x.menu) for (const t of [...x.menu.a, ...x.menu.b]) assert.ok(C.TOPPINGS[t], t);
  }
});
