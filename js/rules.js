// Campaign rules with no drawing in them: what persists, what it costs, what gets recorded.
(function (root) {
  const C = typeof module !== 'undefined' ? require('./content.js') : root.PR_CONTENT;
  const GROUND = 600;
  const SLICES = 6;

  function rng(seed) {
    let a = seed;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A city is its street network: nodes joined by one-way stretches. Generated once per city
  // attempt from the city's seed, then only ever changed by what happens on it.
  function network(city) {
    const nodes = {}, streets = {}, n = city.areas.length;
    nodes.start = { id: 'start', name: `${city.name} depot`, area: 0, slot: -1 };
    city.areas.forEach((area, i) => area.nodes.forEach((name, slot) => { nodes[`${area.id}.${slot}`] = { id: `${area.id}.${slot}`, name, area: i, slot }; }));
    city.areas.forEach((area, i) => {
      C.STREET_ROLES.forEach((role, r) => {
        const id = `${area.id}.${role.role}`;
        const to = role.to === 'next' ? `${city.areas[(i + 1) % n].id}.0` : `${area.id}.${role.to}`;
        streets[id] = { id, name: area.streets[r], role: role.role, area: i, from: `${area.id}.${role.from}`, to, length: Math.round(city.stretch * role.length), gated: !!role.gated };
        const from = nodes[`${area.id}.${role.from}`];
        from[role.turn ? 'turn' : 'keep'] = id;
      });
    });
    streets.lead = { id: 'lead', name: 'Depot Road', role: 'lead', area: 0, from: 'start', to: `${city.areas[0].id}.0`, length: Math.round(city.stretch * 0.45), gated: false };
    nodes.start.keep = 'lead';
    return { nodes, streets };
  }

  function generateStreet(city, def, addressed) {
    const r = rng(city.seed * 977 + [...def.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7));
    const { length, role } = def, quiet = role === 'alley' || role === 'lead';
    const turnAt = length - 420, stop = length - 900;
    const platforms = [];
    for (let x = 700; x < stop; x += 460 + Math.floor(r() * 300)) platforms.push({ x, y: GROUND - (r() < 0.5 ? 135 : 215), w: 220 + Math.floor(r() * 160) });
    const enemies = [], drains = [];
    let id = 0;
    if (!quiet) {
      for (let x = 900; x < stop; x += city.gap + Math.floor(r() * 200)) {
        const type = city.mix[(id + Math.floor(r() * 2)) % city.mix.length];
        const e = { id: id++, type, x, y: GROUND, range: 160, alive: true, power: 0, toppings: [], bribed: -1, hits: 0 };
        if (type === 'mutant') { e.drain = x; drains.push(x); }
        enemies.push(e);
      }
    }
    const ledges = [];
    if (enemies.some(e => e.type === 'ninja')) ledges.push({ x: 300, y: GROUND - 330, w: length - 900, ledge: true });
    else for (const e of enemies) if (e.type === 'turtle' && r() < 0.6) ledges.push({ x: e.x - 170, y: GROUND - 300, w: 340, ledge: true });
    const pickups = [];
    for (const l of ledges.slice(0, 2)) pickups.push({ x: l.x + Math.min(l.w, 700) / 2, y: l.y - 40, topping: city.pickups[pickups.length % city.pickups.length] });
    if (!quiet) pickups.push({ x: 600 + Math.floor(r() * (length - 1400)), y: GROUND - 60, topping: city.pickups[Math.floor(r() * city.pickups.length)] });
    const fires = length > 2500 ? [{ x: Math.floor(length * (0.45 + r() * 0.2)), lit: true }] : [];
    const boxes = [], barricades = [];
    for (let x = 1250; x < stop; x += 800 + Math.floor(r() * 700)) {
      if (Math.abs(x - fires[0]?.x) < 200) continue;
      if (r() < 0.65) boxes.push({ x, w: 84, h: 84, broken: false }); else barricades.push({ x, w: 80, h: 100 });
    }
    return { ...def, turnAt, platforms: [...platforms, ...ledges], enemies, drains, pickups, fires, boxes, barricades, nextId: id, door: addressed === undefined ? null : Math.round(length * 0.72), address: addressed === undefined ? null : addressed, dead: [], filmed: null };
  }

  function newWorld(city, attempt = 0) {
    const { nodes, streets } = network(city);
    const built = {};
    for (const [id, def] of Object.entries(streets)) {
      const area = city.areas.findIndex(a => id === `${a.id}.door`);
      built[id] = generateStreet(city, def, area < 0 ? undefined : area);
    }
    return { city: city.id, attempt, nodes, streets: built, delivery: 0, run: 0, reached: { start: 'lead' }, known: { lead: true }, opened: {}, checkpoint: 'start' };
  }

  // The stretch a checkpoint deploys onto: the road that led up to it, just before the junction,
  // so both choices at that junction are still ahead.
  function deployment(world, node) {
    const street = world.streets[world.reached[node]];
    return { street: street.id, x: node === 'start' ? 140 : Math.max(140, street.turnAt - 620) };
  }

  const addressStreet = (camp, city = currentCity(camp)) => `${city.areas[camp.world.delivery].id}.door`;

  // What a junction offers right now. A blocked shortcut stays on offer once its boxes are gone.
  function junction(world, street) {
    const node = world.nodes[street.to];
    const turn = node.turn ? world.streets[node.turn] : null;
    return { node: node.id, name: node.name, keep: world.streets[node.keep], turn, open: !!turn && (!turn.gated || !!world.opened[turn.id]) };
  }

  function reach(world, street) {
    const node = street.to;
    if (world.reached[node]) return false;
    world.reached[node] = street.id;
    return true;
  }

  function travel(world, streetId) { world.known[streetId] = true; }

  // Every stretch reachable from a node, following one-way streets. Shortcuts count only once open.
  function routes(world, from, target) {
    const seen = new Set(), queue = [[from, 0, null]];
    while (queue.length) {
      const [node, steps, first] = queue.shift();
      if (seen.has(node)) continue;
      seen.add(node);
      const n = world.nodes[node];
      for (const s of [n.keep, n.turn].filter(Boolean)) {
        const street = world.streets[s];
        if (street.gated && !world.opened[s]) continue;
        const via = first || s;
        if (s === target) return { steps: steps + 1, first: via };
        queue.push([street.to, steps + 1, via]);
      }
    }
    return null;
  }

  function newCampaign() {
    return {
      version: 3, cityIndex: 0, phase: 'briefing', pies: {}, world: null, reserves: {}, attempts: {}, receipts: [], seen: {}, papers: [],
      undercover: [], counts: { bribed: 0, fed: 0, lost: 0, delivered: 0, distracted: 0, defeated: 0 },
    };
  }

  const currentCity = camp => C.CITIES[camp.cityIndex];

  function allowed(city, a, b) {
    return city.menu.a.includes(a) && city.menu.b.includes(b);
  }

  // Half-and-half is the most a pie can be: three slices of each side.
  function buildPie(city, a, b) {
    const slices = [];
    for (let i = 0; i < SLICES; i++) slices.push({ id: i, style: city.style, topping: i < SLICES / 2 ? a : b, status: 'ready' });
    return { city: city.id, a, b, slices };
  }

  function startCity(camp, pie) {
    const city = currentCity(camp), attempt = camp.attempts[city.id] = (camp.attempts[city.id] || 0) + 1;
    camp.pies[city.id] = pie;
    camp.world = newWorld(city, attempt);
    camp.phase = 'map';
  }

  function placeOrder(camp, a, b) {
    const city = currentCity(camp);
    if (!allowed(city, a, b)) throw new Error(`${a}/${b} is not on the ${city.id} menu`);
    startCity(camp, buildPie(city, a, b));
  }

  // Long Beach is always the same eight: two of each earlier pizza, one per chosen half.
  function finaleRoster(camp) {
    const slices = C.CITIES.filter(c => !c.final).flatMap(c => camp.reserves[c.id]);
    return { city: 'california', a: null, b: null, slices: slices.map((s, id) => ({ id, ...s, status: 'ready' })) };
  }

  function startFinale(camp) { startCity(camp, finaleRoster(camp)); }

  const ready = pie => pie.slices.filter(s => s.status === 'ready');
  const peaceful = (e, run) => e.bribed === run;

  function learn(camp, type, note) {
    const key = `${type}.${note}`;
    if (camp.seen[key]) return false;
    camp.seen[key] = true;
    return true;
  }

  function bribe(camp, world, enemy, topping) { enemy.toppings.push(topping); enemy.bribed = world.run; camp.counts.bribed++; }
  function feed(camp, enemy) { enemy.alive = false; camp.counts.fed++; }

  function defeat(camp, enemy) {
    enemy.alive = false;
    camp.counts.defeated++;
    const dropped = enemy.toppings;
    enemy.toppings = [];
    return dropped;
  }

  // A ninja keeps every hit between slices, and three drive it away.
  function strike(camp, enemy) {
    enemy.hits++;
    return enemy.hits >= C.NINJA_HITS ? defeat(camp, enemy) : null;
  }

  function nextPaper(camp) {
    const text = C.BOX_PAPER[camp.papers.length];
    if (text) camp.papers.push(text);
    return text;
  }

  function breakGate(camp, streetId) {
    if (camp.world.opened[streetId]) return false;
    camp.world.opened[streetId] = true;
    return true;
  }

  // A photo brings a couple more local teenagers next attempt, near where it was taken.
  function reinforceFilmed(world) {
    for (const street of Object.values(world.streets)) {
      if (street.filmed == null) continue;
      for (const offset of C.PHOTO_ARRIVALS) {
        const x = Math.max(500, Math.min(street.length - 900, street.filmed + offset));
        street.enemies.push({ id: street.nextId++, type: 'teen', x, y: GROUND, range: 160, alive: true, power: 0, toppings: [], bribed: -1, hits: 0, arrived: true });
      }
      street.filmed = null;
    }
  }

  const killerOf = (world, k) => (k ? world.streets[k.street].enemies.find(e => e.id === k.id) : null);

  function finishRun(camp, slice, result) {
    const city = currentCity(camp), world = camp.world, pie = camp.pies[city.id];
    const delivered = result.outcome === 'delivered', here = result.street ? world.streets[result.street] : null;
    world.run++;
    world.lastOutcome = result.outcome;
    world.lastStyle = slice.style;
    world.filmedLast = Object.values(world.streets).some(s => s.filmed != null);
    reinforceFilmed(world);
    slice.status = delivered ? 'delivered' : 'lost';
    const receipt = makeReceipt(camp, city, slice, result);
    camp.receipts.push(receipt);
    if (delivered) {
      camp.counts.delivered++;
      world.delivery++;
    } else {
      camp.counts.lost++;
      if (here) here.dead.push({ x: result.x, topping: slice.topping, style: slice.style });
      const killer = killerOf(world, result.killer);
      if (killer) {
        killer.power++;
        if (slice.topping && !result.toppingGone && (killer.type === 'ninja' || killer.type === 'teen')) killer.toppings.push(slice.topping);
      }
    }
    if (!ready(pie).length) camp.undercover.push({ city: city.id, attempt: world.attempt });
    camp.phase = delivered ? 'door' : ready(pie).length ? 'map' : 'gameover';
    return receipt;
  }

  const cityComplete = camp => !!camp.world && camp.world.delivery >= currentCity(camp).areas.length;

  // After the customer's door: on to the next address, the next city, or out of slices.
  function afterDoor(camp) {
    const city = currentCity(camp), pie = camp.pies[city.id];
    if (cityComplete(camp)) { camp.phase = 'cityDone'; return; }
    camp.phase = ready(pie).length ? 'map' : 'gameover';
  }

  // Leaving a finished city banks its two reserves for Long Beach.
  function leaveCity(camp) {
    const city = currentCity(camp), pie = camp.pies[city.id];
    if (city.final) { camp.phase = 'ending'; return; }
    camp.reserves[city.id] = [pie.a, pie.b].map(topping => ({ style: city.style, topping, from: city.id }));
    camp.world = null;
    camp.cityIndex++;
    camp.phase = 'briefing';
  }

  // Out of slices: the same city, a fresh world, and everything earlier left alone.
  function retryCity(camp) {
    const city = currentCity(camp);
    camp.world = null;
    delete camp.pies[city.id];
    if (city.final) startFinale(camp); else camp.phase = 'order';
  }

  const spelling = camp => C.SPELLINGS[camp.receipts.length % C.SPELLINGS.length];

  // Each order is printed once, with its own wrong name.
  function printOrder(camp) {
    const city = currentCity(camp), area = city.areas[camp.world ? camp.world.delivery : 0];
    return { order: C.ORDER_NUMBER, placed: C.PRINTER_CLOCK, to: area.customer, city: `${city.name}, ${area.name}`, instructions: area.instructions };
  }

  const persistentGone = world => Object.values(world.streets).reduce((n, s) => n + s.enemies.filter(e => !e.alive).length, 0);

  function makeReceipt(camp, city, slice, result) {
    const world = camp.world, killer = killerOf(world, result.killer);
    const fate = result.outcome === 'delivered' ? 'DELIVERED'
      : result.outcome === 'cold' ? 'WENT COLD ON ROUTE'
      : `EATEN BY ${killer ? describe(killer).toUpperCase() : 'PERSONS UNKNOWN'}`;
    const topping = slice.topping ? C.TOPPINGS[slice.topping].name : 'plain';
    const where = result.street ? world.streets[result.street].name : '';
    const moved = result.removed || 0;
    const lines = [`1 ${C.STYLES[slice.style].name}, ${topping}`, fate];
    if (where) lines.push(`Last seen: ${where}`);
    lines.push(`${result.seconds || 0}s on route`);
    if (result.checkpoints) lines.push(`Checkpoints found: ${result.checkpoints}`);
    if (moved) lines.push(`Cleared this trip: ${moved}`);
    lines.push(`Stays cleared: ${persistentGone(world)}`);
    lines.push(`Addresses done: ${world.delivery + (result.outcome === 'delivered' ? 1 : 0)} of ${city.areas.length}`);
    return { n: camp.receipts.length + 1, order: C.ORDER_NUMBER, placed: C.PRINTER_CLOCK, to: spelling(camp), city: city.name, attempt: world.attempt, outcome: result.outcome, lines };
  }

  function describe(e) {
    const label = { ninja: 'a ninja', teen: 'a teenager', mutant: 'a mutant', turtle: 'a turtle' }[e.type];
    return e.power >= 2 ? `${label} that has done this before` : label;
  }

  function ledger(camp) {
    const city = currentCity(camp), world = camp.world, pie = camp.pies[city.id];
    const list = world ? Object.values(world.streets).flatMap(st => st.enemies) : [];
    return {
      lastOutcome: world ? world.lastOutcome : null, filmed: world ? !!world.filmedLast : false,
      left: pie ? ready(pie).length : 0, remaining: world ? city.areas.length - world.delivery : 0,
      owesNinjas: list.filter(e => e.alive && e.type === 'ninja' && e.toppings.length).length,
      nemesisPower: list.reduce((m, e) => Math.max(m, e.power), 0),
    };
  }

  // A word from the old timer on the map screen, between slices.
  const dispatch = camp => C.RETURNS.find(c => c.when(ledger(camp))).lines;

  // What HQ shows. The four recruits exist from the start, cold and plain, until their orders come in.
  function headquarters(camp) {
    return {
      pizzas: C.CITIES.filter(c => !c.final).map(city => {
        const pie = camp.pies[city.id];
        return { city: city.id, style: city.style, a: pie ? pie.a : null, b: pie ? pie.b : null, left: pie ? ready(pie).length : 6, used: !!pie };
      }),
      receipts: camp.receipts.length,
      notes: C.THEORY.filter(t => t.from <= camp.cityIndex).length,
      alewife: camp.phase === 'ending',
    };
  }

  function roster(camp) {
    const rows = [];
    for (const city of C.CITIES.filter(c => !c.final)) {
      const pie = camp.pies[city.id];
      const taped = camp.undercover.some(u => u.city === city.id) && (!pie || !ready(pie).length);
      rows.push({ city: city.id, style: city.style, taped, left: pie ? ready(pie).length : 6 });
    }
    return rows;
  }

  const theory = camp => C.THEORY.filter(t => t.from <= camp.cityIndex);
  const aliases = camp => [...new Set(camp.receipts.map(r => r.to))];

  function enemyFile(camp, type) {
    const file = C.ENEMIES[type];
    return { name: file.name, notes: Object.entries(file.notes).filter(([k]) => camp.seen[`${type}.${k}`]).map(([, v]) => v) };
  }

  const api = { GROUND, SLICES, rng, network, generateStreet, newWorld, deployment, addressStreet, junction, reach, travel, routes, newCampaign, currentCity, allowed, buildPie, placeOrder, finaleRoster, startFinale, ready, peaceful, learn, bribe, feed, defeat, strike, nextPaper, breakGate, finishRun, cityComplete, afterDoor, leaveCity, retryCity, printOrder, describe, ledger, dispatch, headquarters, roster, theory, aliases, enemyFile };
  if (typeof module !== 'undefined') module.exports = api; else root.PR_RULES = api;
})(typeof window !== 'undefined' ? window : globalThis);
