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

  // A street is generated once from its seed, then only ever changed by what happens on it.
  function generateStreet(city) {
    const r = rng(city.seed);
    const platforms = [];
    for (let x = 800; x < city.length - 700; x += 450 + Math.floor(r() * 300)) {
      platforms.push({ x, y: GROUND - (r() < 0.5 ? 135 : 215), w: 220 + Math.floor(r() * 160) });
    }
    const enemies = [];
    let id = 0;
    for (let x = 1100; x < city.length - 500; x += city.gap + Math.floor(r() * 200)) {
      const type = city.mix[id % city.mix.length];
      const perch = type === 'ninja' ? platforms.find(p => p.x > x - 280 && p.x < x + 280) : null;
      enemies.push({
        id: id++, type, x: perch ? perch.x + perch.w / 2 : x, y: perch ? perch.y : GROUND,
        range: perch ? perch.w / 2 - 20 : 160, alive: true, power: 0, toppings: [], bribedRun: -1, fed: false,
      });
    }
    const fires = [];
    for (let x = 1700; x < city.length - 500; x += 3400) fires.push({ x: x + Math.floor(r() * 200), lit: true });
    const barricades = [];
    for (let x = 1350; x < city.length - 900; x += 1100 + Math.floor(r() * 750)) barricades.push({ x, w: 80, h: 100 });
    return { platforms, enemies, fires, barricades, door: city.length - 200, run: 0, dead: [], filmed: false, deaths: 0, lastOutcome: null };
  }

  function newCampaign() {
    return {
      version: 2, cityIndex: 0, phase: 'briefing', pies: {}, streets: {}, receipts: [], seen: {}, papers: [],
      undercover: [], counts: { bribed: 0, fed: 0, lost: 0, delivered: 0, distracted: 0, defeated: 0 },
    };
  }

  const currentCity = camp => C.CITIES[camp.cityIndex];

  function allowed(city, a, b) {
    return city.menu.a.includes(a) && city.menu.b.includes(b);
  }

  // Half-and-half is the most a pie can be: three slices of each side.
  function buildPie(city, a, b, reorder = 0) {
    const slices = [];
    for (let i = 0; i < SLICES; i++) slices.push({ id: i, style: city.style, topping: i < SLICES / 2 ? a : b, status: 'ready' });
    return { city: city.id, a, b, reorder, slices };
  }

  function placeOrder(camp, a, b) {
    const city = currentCity(camp);
    if (!allowed(city, a, b)) throw new Error(`${a}/${b} is not on the ${city.id} menu`);
    const previous = camp.pies[city.id];
    camp.pies[city.id] = buildPie(city, a, b, previous ? previous.reorder + 1 : 0);
    // A fresh pie goes out onto the same street, so everything already beaten stays beaten.
    camp.streets[city.id] = camp.streets[city.id] || generateStreet(city);
    if (previous) reinforce(camp.streets[city.id]);
    camp.phase = 'slice';
  }

  // Each lost pie takes half of what is left with it, strongest first, and the fires come back.
  // That is what makes the last street always reachable, however she plays it.
  function reinforce(street) {
    const living = street.enemies.filter(e => e.alive).sort((x, y) => y.power - x.power);
    living.slice(0, Math.ceil(living.length / 2)).forEach(e => { e.alive = false; e.toppings = []; });
    street.fires.forEach(f => { f.lit = true; });
  }

  const ready = pie => pie.slices.filter(s => s.status === 'ready');
  const peaceful = (e, run) => e.bribedRun === run || e.fed;

  function learn(camp, type, note) {
    const key = `${type}.${note}`;
    if (camp.seen[key]) return false;
    camp.seen[key] = true;
    return true;
  }

  function bribe(camp, enemy, topping, run) { enemy.toppings.push(topping); enemy.bribedRun = run; camp.counts.bribed++; }
  function feed(camp, enemy, topping) { enemy.toppings.push(topping); enemy.fed = true; camp.counts.fed++; }

  function defeat(camp, enemy) {
    enemy.alive = false;
    camp.counts.defeated++;
    const dropped = enemy.toppings;
    enemy.toppings = [];
    return dropped;
  }

  function nextPaper(camp) {
    const text = C.SHELL_PAPER[camp.papers.length];
    if (text) camp.papers.push(text);
    return text;
  }

  function finishRun(camp, slice, result) {
    const city = currentCity(camp), street = camp.streets[city.id], pie = camp.pies[city.id];
    const delivered = result.outcome === 'delivered';
    street.run++;
    street.lastOutcome = result.outcome;
    street.filmed = !!result.filmed;
    slice.status = delivered ? 'delivered' : 'lost';
    if (delivered) camp.counts.delivered++;
    else {
      camp.counts.lost++;
      street.deaths++;
      street.dead.push({ x: result.x, topping: slice.topping, style: slice.style });
      const killer = street.enemies.find(e => e.id === result.killer);
      if (killer) {
        killer.power++;
        if (slice.topping && !result.toppingGone) killer.toppings.push(slice.topping);
      }
    }
    const receipt = makeReceipt(camp, city, slice, result);
    camp.receipts.push(receipt);
    const gone = !ready(pie).length;
    if (gone) camp.undercover.push({ city: city.id, style: city.style, reorder: pie.reorder });
    if (delivered) camp.phase = 'door';
    else if (!gone) camp.phase = 'return';
    else if (city.final) camp.phase = 'reorder';
    else camp.phase = 'missed';
    return receipt;
  }

  // Leaving a city, whether delivered or not. The pizza stays at HQ, looking how it looks.
  function leaveCity(camp) {
    if (currentCity(camp).final) { camp.phase = 'ending'; return; }
    camp.cityIndex++;
    camp.phase = 'briefing';
  }

  const spelling = camp => C.SPELLINGS[camp.receipts.length % C.SPELLINGS.length];

  // Each order is printed once, with its own wrong name.
  function printOrder(camp) {
    const city = currentCity(camp);
    const pie = camp.pies[city.id];
    const number = pie ? pie.reorder + 1 : 0;
    const to = number ? spelling(camp) : city.customer;
    return { order: C.ORDER_NUMBER, placed: C.PRINTER_CLOCK, to, city: city.name, instructions: city.instructions };
  }

  function makeReceipt(camp, city, slice, result) {
    const killer = camp.streets[city.id].enemies.find(e => e.id === result.killer);
    const fate = result.outcome === 'delivered' ? 'DELIVERED'
      : result.outcome === 'cold' ? 'WENT COLD ON ROUTE'
      : `EATEN BY ${killer ? describe(killer).toUpperCase() : 'PERSONS UNKNOWN'}`;
    const topping = slice.topping ? C.TOPPINGS[slice.topping].name : 'plain';
    return {
      n: camp.receipts.length + 1, order: C.ORDER_NUMBER, placed: C.PRINTER_CLOCK, to: spelling(camp), city: city.name,
      outcome: result.outcome, lines: [`1 ${C.STYLES[slice.style].name}, ${topping}`, fate, `${result.seconds || 0}s on route`],
    };
  }

  function describe(e) {
    const label = { ninja: 'a ninja', teen: 'a teenager', mutant: 'a mutant', turtle: 'a turtle' }[e.type];
    return e.power >= 2 ? `${label} that has done this before` : label;
  }

  function ledger(camp) {
    const city = currentCity(camp), street = camp.streets[city.id], pie = camp.pies[city.id];
    const list = street ? street.enemies : [];
    return {
      lastOutcome: street ? street.lastOutcome : null, filmed: street ? street.filmed : false,
      left: pie ? ready(pie).length : 0,
      owesNinjas: list.filter(e => e.alive && e.type === 'ninja' && e.toppings.length).length,
      nemesisPower: list.reduce((m, e) => Math.max(m, e.power), 0),
    };
  }

  const returnScene = camp => {
    const L = ledger(camp);
    return [{ comp: 'oldtimer', lines: C.RETURNS.find(c => c.when(L)).lines }];
  };

  // What HQ shows. Every pizza exists from the start, cold and plain, until its order comes in.
  function headquarters(camp) {
    return {
      pizzas: C.CITIES.map(city => {
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
    for (const city of C.CITIES) {
      const taped = camp.undercover.filter(u => u.city === city.id);
      for (const u of taped) rows.push({ city: city.id, style: u.style, taped: true });
      const pie = camp.pies[city.id];
      if (!pie || ready(pie).length) rows.push({ city: city.id, style: city.style, taped: false, left: pie ? ready(pie).length : 6 });
    }
    return rows;
  }

  const theory = camp => C.THEORY.filter(t => t.from <= camp.cityIndex);
  const aliases = camp => [...new Set(camp.receipts.map(r => r.to))];

  function enemyFile(camp, type) {
    const file = C.ENEMIES[type];
    return { name: file.name, notes: Object.entries(file.notes).filter(([k]) => camp.seen[`${type}.${k}`]).map(([, v]) => v) };
  }

  const api = { GROUND, SLICES, rng, generateStreet, newCampaign, currentCity, allowed, buildPie, placeOrder, ready, peaceful, learn, bribe, feed, defeat, nextPaper, finishRun, leaveCity, printOrder, describe, ledger, returnScene, headquarters, roster, theory, aliases, enemyFile };
  if (typeof module !== 'undefined') module.exports = api; else root.PR_RULES = api;
})(typeof window !== 'undefined' ? window : globalThis);
