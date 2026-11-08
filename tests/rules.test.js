const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/rules.js');
const C = require('../js/content.js');

const { MAPS } = require('../js/maps.js');
const city = c => R.currentCity(c);
const pie = c => c.pies[city(c).id];
const order = (c, a) => R.placeOrder(c, a || city(c).signature);
const fresh = () => { const c = R.newCampaign(); order(c); return c; };
const lose = c => R.finishRun(c, R.ready(pie(c))[0], { outcome: 'cold', x: 100 });
const deliver = c => { R.finishRun(c, R.ready(pie(c))[0], { outcome: 'delivered', x: 100 }); R.afterDoor(c); };
const finishCity = (c, a) => { if (!city(c).final) order(c, a); else R.startFinale(c); for (let i = 0; i < city(c).areas.length; i++) deliver(c); R.leaveCity(c); };

test('the route runs New York to Long Beach with four city pizzas', () => {
  assert.deepStrictEqual(C.CITIES.map(x => x.id), ['newyork', 'chicago', 'dc', 'naples', 'california']);
  assert.deepStrictEqual(Object.keys(C.STYLES), ['ny', 'deep', 'jumbo', 'naples']);
  assert.strictEqual(C.CITIES.filter(x => x.final).length, 1);
});

test('New York is pepperoni only, with no special move', () => {
  const c = R.newCampaign();
  assert.throws(() => R.placeOrder(c, 'garlic'));
  R.placeOrder(c, 'pepperoni');
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
    for (const a of MAPS[x.id].addresses) for (const node of Object.keys(world.nodes)) {
      assert.ok(R.routes(world, node, a), `${x.id}: ${node} to ${a}`);
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
        while (street.id !== target && steps++ < 30) {
          const g = R.guide(c, street, 200);
          assert.notStrictEqual(g.kind, 'door');
          street = g.street;
        }
        assert.strictEqual(street.id, target, `${x.id}: from ${start.id} to ${target}`);
        assert.ok(steps <= 14, `${start.id} took ${steps} stretches`);
      }
    }
  }
});

test('playtest jumps land in any city at any address with the map open', () => {
  C.CITIES.forEach((x, i) => {
    for (let d = 0; d < 3; d++) {
      const c = R.jumpTo(i, d);
      assert.strictEqual(c.phase, 'map');
      assert.strictEqual(R.addressStreet(c), MAPS[x.id].addresses[d]);
      assert.strictEqual(Object.keys(c.world.reached).length, Object.keys(c.world.nodes).length);
      assert.strictEqual(R.ready(c.pies[x.id]).length, x.final ? 8 : 6);
    }
  });
});

test('every street is keep-going or a side turn, one of each at most', () => {
  for (const x of C.CITIES) {
    const { nodes, streets } = R.network(x);
    for (const n of Object.values(nodes)) assert.ok(n.keep, n.id);
    for (const s of Object.values(streets)) if (s.id !== 'lead') assert.ok(nodes[s.from] && nodes[s.to], s.id);
  }
});

test('required obstacles are within every pizza jump', () => {
  for (const s of Object.values(C.STYLES)) assert.ok(s.jump ** 2 / (2 * s.gravity) > 110, s.name);
  for (const x of C.CITIES) for (const s of Object.values(R.newWorld(x).streets)) {
    for (const b of [...s.barricades, ...s.boxes]) assert.ok(b.h <= 100);
  }
});

test('no rail runs longer than 700, and every ninja has one within reach', () => {
  for (const cityDef of C.CITIES) {
    for (const s of Object.values(R.newWorld(cityDef).streets)) {
      const rails = s.platforms.filter(p => p.ledge);
      for (const p of s.platforms) assert.ok(p.w <= 700, `${cityDef.id}/${s.id} rail ${p.w}`);
      for (const e of s.enemies.filter(e => e.type === 'ninja')) {
        assert.ok(rails.some(l => e.x > l.x - 700 && e.x < l.x + l.w + 700), `${cityDef.id}/${s.id} ninja at ${e.x}`);
      }
    }
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
  assert.strictEqual(R.addressStreet(c), MAPS.newyork.addresses[0]);
  deliver(c);
  assert.strictEqual(R.addressStreet(c), MAPS.newyork.addresses[1]);
});

test('a junction reached on a losing slice stays reached', () => {
  const c = fresh(), first = c.world.streets[c.world.nodes[MAPS.newyork.start].keep];
  R.reach(c.world, first);
  lose(c);
  assert.ok(c.world.reached[first.to]);
  const d = R.deployment(c.world, first.to);
  assert.strictEqual(d.street, first.id);
  assert.ok(d.x < first.turnAt);
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
  R.collect(c, 'sausage');
  finishCity(c, 'sausage');
  finishCity(c, 'garlic');
  finishCity(c, 'basil');
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

test('a photo brings local teenagers next attempt and changes no speeds', () => {
  const c = fresh(), street = Object.values(c.world.streets).find(s => s.length > 3000), before = street.enemies.length;
  street.filmed = 1500;
  lose(c);
  assert.strictEqual(street.enemies.length, before + C.PHOTO_ARRIVALS.length);
  assert.ok(street.enemies.slice(-2).every(e => e.type === 'teen' && Math.abs(e.x - 1500) < 400));
  assert.strictEqual(street.filmed, null);
});

test('a killer that survives keeps growing and keeps the topping it took', () => {
  const c = fresh(), street = Object.values(c.world.streets).find(s => s.enemies.some(x => x.type === 'teen')), e = street.enemies.find(x => x.type === 'teen');
  R.finishRun(c, R.ready(pie(c))[0], { outcome: 'dead', x: 100, street: street.id, topping: 'pepperoni', killer: { street: street.id, id: e.id } });
  assert.strictEqual(e.power, 1);
  assert.deepStrictEqual(e.toppings, ['pepperoni']);
  assert.strictEqual(street.dead.length, 1);
});

test('broken shortcut boxes stay broken and open the turn', () => {
  const c = fresh(), gate = Object.values(c.world.streets).find(s => s.gated);
  const before = Object.values(c.world.streets).find(s => s.to === gate.from);
  assert.strictEqual(R.junction(c.world, before).open, false);
  assert.ok(R.breakGate(c, gate.id));
  assert.strictEqual(R.junction(c.world, before).open, true);
  lose(c);
  assert.strictEqual(R.junction(c.world, before).open, true);
});

test('each receipt spells the name differently', () => {
  const c = fresh();
  lose(c); lose(c); lose(c);
  assert.strictEqual(new Set(c.receipts.map(r => r.to)).size, 3);
});

test('a pie is one topping, all six slices', () => {
  const c = fresh();
  assert.strictEqual(pie(c).slices.length, 6);
  assert.ok(pie(c).slices.every(s => s.topping === 'pepperoni'));
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
    if (x.signature) assert.ok(C.TOPPINGS[x.signature], x.signature);
  }
});

test('the story keeps its secrets', () => {
  const said = [...C.CITIES.flatMap(c => c.briefing.flatMap(b => b.lines)), ...C.RETURNS.flatMap(r => r.lines)];
  assert.ok(!said.some(l => /being eaten/i.test(l.text || '')));
  const stale = C.CITIES.map(c => c.briefing.flatMap(b => b.lines).findIndex(l => /too stale/.test(l.text)));
  assert.deepStrictEqual(stale.slice(0, 4), [-1, -1, -1, -1]);
  const last = C.CITIES.at(-1).briefing.flatMap(b => b.lines).at(-1);
  assert.strictEqual(last.text, "I'm too stale for this shit.");
});

test('every speaker and every pizza has a voice', () => {
  for (const city of C.CITIES) for (const b of city.briefing) for (const l of b.lines) assert.ok(C.SPEAKERS[l.who], l.who);
  const events = Object.keys(C.QUIPS.ny);
  for (const style of ['ny', 'deep', 'jumbo', 'naples']) {
    assert.deepStrictEqual(Object.keys(C.QUIPS[style]), events);
    for (const r of C.RETURNS) for (const l of r.lines) if (l.by) assert.ok(l.by[style]);
  }
});

test('losing a city names the pizza that was lost, and falls back when none is known', () => {
  for (const [i, style] of [[0, 'ny'], [1, 'deep'], [2, 'jumbo'], [3, 'naples']]) {
    const c = R.newCampaign(); c.cityIndex = i; order(c);
    while (c.phase !== 'gameover') lose(c);
    const lines = R.epitaph(c);
    assert.strictEqual(lines[0].text, C.CITY_LOST[0].by[style]);
    assert.strictEqual(lines.length, C.CITY_LOST.length);
  }
  const c = fresh(); c.world.lastStyle = null;
  assert.strictEqual(R.epitaph(c)[0].text, C.CITY_LOST[0].text);
});

test('the old timer is Sergeant Dayold and the tickets say ORDER', () => {
  assert.strictEqual(C.SPEAKERS.old, 'Sergeant Dayold');
  assert.match(R.printOrder(fresh()).order, /^\d+$/);
  assert.ok(C.THEORY.some(t => /Every ticket says ORDER/.test(t.text)));
  assert.strictEqual(C.CITIES.flatMap(x => x.areas).find(a => a.id === 'centralpark').who, 'Pigeon Lady');
});

test('a deploy keeps a safe zone clear of enemies, photo arrivals included', () => {
  const c = fresh(), world = c.world, safe = C.TUNING.spawnSafe, mk = (street, o) => street.enemies.push({ id: street.nextId++, y: R.GROUND, range: 160, alive: true, power: 0, toppings: [], hits: 0, ...o });
  let checked = 0;
  for (const st of Object.values(world.streets)) world.reached[st.to] = world.reached[st.to] || st.id;
  for (const node of Object.keys(world.nodes)) {
    const dep = R.deployment(world, node), street = world.streets[dep.street];
    if (street.length < 2500) continue;
    // Teenagers filmed us right here last time, a turtle sits on the spot, and a mutant's drain is behind it.
    for (const offset of C.PHOTO_ARRIVALS) mk(street, { type: 'teen', x: Math.max(500, dep.x + offset), arrived: true });
    mk(street, { type: 'turtle', x: dep.x + 20 });
    mk(street, { type: 'mutant', x: dep.x - 60, drain: dep.x - 60 });
    street.drains.push(dep.x - 60);
    R.clearSpawn(street, dep.x);
    for (const e of street.enemies.filter(e => e.alive)) {
      const reach = e.type === 'mutant' ? 0 : e.range;
      assert.ok(Math.abs(e.x - dep.x) >= safe + reach, `${street.id}: ${e.type} at ${e.x} is within ${safe} of ${dep.x}`);
    }
    for (const e of street.enemies.filter(e => e.drain != null)) assert.ok(street.drains.includes(e.drain));
    checked++;
  }
  assert.ok(checked > 0);
});

test('toppings unlock by signature city and by pickup', () => {
  const camp = R.newCampaign();
  assert.deepEqual(R.menu(camp), ['pepperoni']);
  assert.equal(R.collect(camp, 'mushroom'), true);
  assert.equal(R.collect(camp, 'mushroom'), false);
  assert.deepEqual(R.menu(camp), ['pepperoni', 'mushroom']);
  assert.deepEqual(R.menu(camp, C.CITIES[2]), ['pepperoni', 'garlic', 'jalapeno', 'mushroom']);
  assert.throws(() => R.placeOrder(camp, 'basil'));
  R.placeOrder(camp, 'mushroom');
});
