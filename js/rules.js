// Campaign rules with no drawing in them: what persists, what it costs, what the Order prints.
(function (root) {
  const C = typeof module !== 'undefined' ? require('./content.js') : root.PR_CONTENT;
  const GROUND = 320;
  const SLICES_PER_PIE = 6;

  function rng(seed) {
    let a = seed;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The street is generated once from the seed, so it is the same street every run.
  function generateStreet(city) {
    const r = rng(city.seed);
    const platforms = [];
    for (let x = 460; x < city.length - 420; x += 250 + Math.floor(r() * 170)) {
      platforms.push({ x, y: GROUND - (r() < 0.5 ? 80 : 125), w: 120 + Math.floor(r() * 90) });
    }
    const enemies = [];
    let id = 0;
    const end = city.finale ? city.length - 900 : city.length - 260;
    for (let x = 620; x < end; x += 240 + Math.floor(r() * 110)) {
      const type = city.mix[id % city.mix.length];
      const perch = type === 'ninja' ? platforms.find(p => p.x > x - 150 && p.x < x + 150) : null;
      enemies.push({
        id: id++, type, x: perch ? perch.x + perch.w / 2 : x, y: perch ? perch.y : GROUND,
        range: perch ? perch.w / 2 - 12 : 90, alive: true, power: 0, toppings: [], bribedRun: -1, fed: false,
      });
    }
    const fires = [];
    for (let x = 900; x < city.length - 300; x += 1900) fires.push({ x: x + Math.floor(r() * 120), lit: true });
    const barricades = [];
    for (let x = 760; x < city.length - 500; x += 620 + Math.floor(r() * 420)) barricades.push({ x, w: 44, h: 56 });
    return { platforms, enemies, fires, barricades, door: city.length - 110 };
  }

  function newCampaign() {
    return { cityIndex: 0, phase: 'intro', pies: {}, crew: [], streets: {}, receipts: [], lore: [], counts: { bribed: 0, fed: 0, deaths: 0, distracted: 0, defeated: 0, deliveries: 0 }, boss: null, finished: false };
  }

  const currentCity = camp => C.CITIES[camp.cityIndex] || C.FINALE;

  // Half-and-half is the most a pie can be: three slices of each side.
  function buildPie(city, sideA, sideB) {
    const slices = [];
    for (let i = 0; i < SLICES_PER_PIE; i++) {
      slices.push({ id: i, style: city.style, topping: i < SLICES_PER_PIE / 2 ? sideA : sideB, status: 'ready', origin: city.id });
    }
    return slices;
  }

  function startCity(camp, sideA, sideB) {
    const city = currentCity(camp);
    camp.pies[city.id] = buildPie(city, sideA, sideB);
    camp.streets[city.id] = { ...generateStreet(city), run: 0, dead: [], filmed: false, deaths: 0, lastOutcome: null };
    camp.phase = 'slice';
  }

  function startFinale(camp) {
    const city = C.FINALE;
    if (camp.streets.finale) return;
    const street = { ...generateStreet(city), run: 0, dead: [], filmed: false, deaths: 0, lastOutcome: null };
    // Whatever ate the most of you in each city comes to the Pass and brings your toppings.
    let id = street.enemies.length;
    const toppings = [];
    let x = city.length - 860;
    for (const c of C.CITIES) {
      const s = camp.streets[c.id];
      if (!s) continue;
      const worst = s.enemies.filter(e => e.alive && (e.power > 0 || e.toppings.length)).sort((a, b) => b.power - a.power)[0];
      if (!worst) continue;
      toppings.push(...worst.toppings);
      street.enemies.push({ ...worst, id: id++, x, y: GROUND, range: 70, bribedRun: -1, nemesisFrom: c.name });
      x += 130;
    }
    const hp = 6 + Math.min(toppings.length, 8);
    street.enemies.push({
      id: id++, type: 'boss', x: city.length - 300, y: GROUND, range: 120, alive: true,
      power: 2, toppings, bribedRun: -1, fed: false, hp, maxHp: hp,
    });
    camp.streets.finale = street;
  }

  // Every remaining slice is a run you can still take. Running out of the crew leaves the
  // crust, which never runs out, so the finale can always be finished.
  function finaleRoster(camp) {
    const ready = camp.crew.filter(s => s.status === 'ready');
    if (ready.length) return ready;
    return [{ id: 'crust', style: 'crust', topping: null, status: 'ready', origin: 'crust' }];
  }

  function spin(city, street, random = Math.random) {
    const pool = C.TICKETS.filter(t => t.tier <= city.tier);
    // Later cities favor the tickets that first appear there, so the lottery visibly grows.
    const weighted = pool.flatMap(t => Array(t.tier === city.tier ? 3 : 1).fill(t));
    return weighted[Math.floor(random() * weighted.length)];
  }

  function applyTicket(camp, ticket) {
    if (ticket.rewrite && camp.receipts.length) {
      const old = camp.receipts[camp.receipts.length - 1];
      old.amended = true;
      old.lines = old.lines.map(l => l.replace('Thank you', 'You are welcome'));
      old.lines.push('AMENDED. IT ALWAYS SAID THIS.');
    }
  }

  const peaceful = (e, run) => e.bribedRun === run || e.fed;

  function modsFor(street, ticket) {
    const mods = { heatDecay: 1, speed: 1, gravity: 1, bonusCharges: 0, chargeScale: 1, ...ticket.mods };
    mods.enemySpeed = street.filmed ? 1.3 : 1;
    return mods;
  }

  function bribe(camp, enemy, topping, run) {
    enemy.toppings.push(topping);
    enemy.bribedRun = run;
    camp.counts.bribed++;
  }

  function feed(camp, enemy, topping) {
    enemy.toppings.push(topping);
    enemy.fed = true;
    camp.counts.fed++;
  }

  // A defeated enemy stays gone, and hands back what it was carrying. A boss wears down
  // across runs, because damage to it is permanent too.
  function defeat(camp, enemy, amount = 1) {
    if (enemy.type === 'boss') {
      enemy.hp = Math.max(0, enemy.hp - amount);
      if (enemy.hp > 0) return [];
    }
    enemy.alive = false;
    camp.counts.defeated++;
    const dropped = enemy.toppings;
    enemy.toppings = [];
    return dropped;
  }

  function nextLore(camp) {
    const text = C.LORE[camp.lore.length];
    if (text) camp.lore.push(text);
    return text;
  }

  function finishRun(camp, slice, result) {
    const city = currentCity(camp);
    const street = camp.streets[city.id];
    street.run++;
    street.lastOutcome = result.outcome;
    street.filmed = !!result.filmed;
    const lost = result.outcome !== 'delivered';
    if (lost) {
      slice.status = 'dead';
      street.deaths++;
      camp.counts.deaths++;
      street.dead.push({ x: result.x, topping: slice.topping, style: slice.style });
      const killer = street.enemies.find(e => e.id === result.killer);
      if (killer) {
        killer.power++;
        if (slice.topping && !result.toppingGone) killer.toppings.push(slice.topping);
      }
    } else {
      slice.status = 'delivered';
      camp.counts.deliveries++;
    }
    const receipt = makeReceipt(camp, city, slice, result);
    camp.receipts.push(receipt);
    if (city.finale) {
      if (!lost) { camp.finished = true; camp.phase = 'ending'; }
      return receipt;
    }
    const left = camp.pies[city.id].filter(s => s.status === 'ready');
    if (!lost || !left.length) {
      camp.crew.push(...left.map(s => ({ ...s })));
      camp.cityIndex++;
      camp.phase = camp.cityIndex < C.CITIES.length ? 'intro' : 'finale-intro';
      if (camp.phase === 'finale-intro') startFinale(camp);
    }
    return receipt;
  }

  const misspell = camp => C.SPELLINGS[camp.receipts.length % C.SPELLINGS.length];
  const dateSoFar = camp => C.DATE_REVEAL[Math.min(camp.cityIndex, C.DATE_REVEAL.length - 1)];

  function makeReceipt(camp, city, slice, result) {
    const killer = camp.streets[city.id].enemies.find(e => e.id === result.killer);
    const fate = result.outcome === 'delivered' ? `DELIVERED TO ${city.customer}`
      : result.outcome === 'cold' ? 'WENT COLD ON ROUTE'
      : `EATEN BY ${killer ? describe(killer).toUpperCase() : 'PERSONS UNKNOWN'}`;
    const topping = slice.topping ? C.TOPPINGS[slice.topping].name : 'plain';
    return {
      order: C.ORDER_NUMBER, date: dateSoFar(camp), to: misspell(camp), city: city.name, amended: false,
      lines: [`1 ${C.STYLES[slice.style].name}, ${topping}`, fate, result.outcome === 'delivered' ? 'Thank you for choosing The Order' : 'Thank you for your sacrifice'],
    };
  }

  function describe(e) {
    const label = { ninja: 'a ninja', teen: 'a teenager', mutant: 'a mutant', turtle: 'a turtle', boss: 'the thing at the Pass' }[e.type];
    if (e.power >= 2) return `${label} that has done this before`;
    return label;
  }

  function ledger(camp) {
    const city = currentCity(camp);
    const street = camp.streets[city.id];
    const list = street ? street.enemies : [];
    return {
      deathsThisCity: street ? street.deaths : 0,
      lastOutcome: street ? street.lastOutcome : null,
      filmed: street ? street.filmed : false,
      owesNinjas: list.filter(e => e.alive && e.type === 'ninja' && e.toppings.length).length,
      nemesisPower: list.reduce((m, e) => Math.max(m, e.power), 0),
      fed: camp.counts.fed,
    };
  }

  function radio(camp) {
    const L = ledger(camp);
    return C.RADIO.filter(c => c.when(L)).sort((a, b) => b.priority - a.priority)[0].text;
  }

  function finalReceipt(camp) {
    const crew = camp.crew.filter(s => s.status === 'ready').length;
    return {
      order: C.ORDER_NUMBER, date: C.ORDER_DATE, to: 'KATELYN', city: 'Delivered',
      lines: [
        `${camp.counts.deliveries} deliveries`, `${camp.counts.deaths} slices lost along the way`,
        `${crew} slices still warm`, `${camp.counts.bribed} ninjas paid, ${camp.counts.fed} mutants fed`,
        'Sorry it took so long', 'Still warm',
      ],
    };
  }

  const api = { GROUND, rng, generateStreet, newCampaign, currentCity, buildPie, startCity, startFinale, finaleRoster, spin, applyTicket, peaceful, modsFor, bribe, feed, defeat, nextLore, finishRun, describe, ledger, radio, finalReceipt };
  if (typeof module !== 'undefined') module.exports = api; else root.PR_RULES = api;
})(typeof window !== 'undefined' ? window : globalThis);
