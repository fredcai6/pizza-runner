// Runs the real Run class on set-up situations and checks each enemy and pizza does what it should.
// Usage: node tests/behavior.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const serve = http.createServer((q, s) => { const u = q.url.split('?')[0]; const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); } }); });
(async () => {
  await new Promise(r => serve.listen(0, r));
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const page = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  page.on('pageerror', e => { console.log('page error', e.message); process.exitCode = 1; });
  await page.goto(`http://localhost:${serve.address().port}/?debug=1`);
  const results = await page.evaluate(async () => {
    const C = PR_CONTENT, R = PR_RULES, P = PR_PLAY, GROUND = R.GROUND, out = [];
    const ok = (name, pass, detail = '') => out.push([name, !!pass, String(detail)]);
    const SAFE = C.TUNING.spawnSafe;
    await Promise.all(C.CITIES.map(c => PR_SPRITES.loadCity(c)));
    const canvas = document.getElementById('stage');
    // One empty street with just the enemy under test on it.
    const scene = (cityIndex, style, topping, enemies = []) => {
      C.TUNING.spawnSafe = 0; // these scenes place enemies right next to the start on purpose
      const city = C.CITIES[cityIndex], camp = R.newCampaign(); camp.cityIndex = cityIndex;
      camp.pies[city.id] = { slices: [{ id: 0, style, topping, status: 'ready' }, { id: 1, style, topping, status: 'ready' }] };
      camp.world = R.newWorld(city, 1); camp.phase = 'map';
      const street = Object.values(camp.world.streets).filter(x => x.id !== 'lead').sort((a, b) => b.length - a.length)[0], id = street.id;
      Object.assign(street, { platforms: [], fires: [], boxes: [], barricades: [], pickups: [], drains: [], enemies: [] });
      enemies.forEach((e, i) => street.enemies.push({ id: i, x: 900, y: GROUND, range: 40, alive: true, power: 0, toppings: [], hits: 0, ...e }));
      const input = { left: false, right: false, q: {}, take(k) { const v = this.q[k]; this.q[k] = false; return v; } };
      let result = null;
      const run = new P.Run(canvas, input, { camp, city, world: camp.world, slice: camp.pies[city.id].slices[0], start: { street: id, x: 300 }, onEnd: r => { result = r; } });
      return { camp, city, street, run, input, get result() { return result; }, steps(n) { for (let i = 0; i < n && !run.done; i++) run.step(); } };
    };

    { // Teenager: a shot sends it away for good.
      const s = scene(0, 'ny', 'pepperoni', [{ type: 'teen', x: 700 }]);
      s.input.q.power = true; s.steps(90);
      ok('teen runs off from one pepperoni', !s.street.enemies[0].alive && s.camp.seen['teen.flees']);
      const s2 = scene(0, 'ny', 'pepperoni', [{ type: 'teen', x: 500 }]);
      s2.run.p.x = 460; s2.run.p.y = GROUND - 360; s2.run.p.vy = 5; s2.run.p.grounded = false; s2.steps(40);
      ok('teen stomp bounces and it leaves', !s2.street.enemies[0].alive && s2.run.bounced !== undefined);
      const s3 = scene(0, 'ny', 'pepperoni', [{ type: 'teen', x: 640 }]);
      s3.run.invuln = 500; s3.steps(140);
      ok('teen takes a photo with no speed change', s3.street.filmed != null);
    }
    { // Turtle: nothing removes it.
      const s = scene(0, 'ny', 'pepperoni', [{ type: 'turtle', x: 560 }]);
      s.input.q.power = true; s.steps(30);
      ok('thrown food makes a turtle munch', s.run.actors[0].state === 'munch', s.run.actors[0].state);
      ok('turtle survives the shot', s.street.enemies[0].alive);
      const s2 = scene(0, 'ny', 'pepperoni', [{ type: 'turtle', x: 500 }]);
      s2.run.p.x = 460; s2.run.p.y = GROUND - 330; s2.run.p.vy = 5; s2.run.p.grounded = false;
      let top = 0; for (let i = 0; i < 70; i++) { s2.run.step(); top = Math.max(top, GROUND - s2.run.p.y - s2.run.p.h); }
      ok('stomp stuns it and springs high', s2.run.actors[0].state === 'stun' && top > 300, top);
      const s3 = scene(1, 'deep', 'sausage', [{ type: 'turtle', x: 460 }]);
      s3.input.q.special = true; s3.steps(90);
      ok('a slam only stuns a turtle', s3.street.enemies[0].alive && s3.run.actors[0].state === 'stun', s3.run.actors[0].state);
      const s4 = scene(3, 'naples', 'basil', [{ type: 'turtle', x: 480 }]);
      s4.input.right = true; s4.input.q.special = true; s4.steps(50);
      ok('dash carries past a stunned turtle', s4.street.enemies[0].alive && s4.run.actors[0].state === 'stun' && s4.run.p.x > 560, s4.run.p.x);
    }
    { // Mutant: warns, chases from behind, leaves after one bite.
      const s = scene(1, 'ny', 'pepperoni', [{ type: 'mutant', x: 300, drain: 300 }]);
      s.street.length = 20000; s.street.turnAt = 19000;
      s.run.p.x = 420; s.steps(4);
      ok('mutant peeks from the drain', s.run.actors[0].state === 'peek', s.run.actors[0].state);
      s.input.right = true; s.steps(420);
      ok('it catches up and bites once', s.run.heat < 80 && s.run.heat > 65, s.run.heat);
      s.input.right = false; s.steps(40);
      ok('then it is gone for good', !s.street.enemies[0].alive && s.run.actors.length === 0);
      const s2 = scene(1, 'ny', 'pepperoni', [{ type: 'mutant', x: 300, drain: 300 }]);
      s2.run.p.x = 460; s2.steps(58); s2.run.p.facing = -1; s2.input.q.power = true; s2.steps(60);
      ok('it catches thrown food and goes down', !s2.street.enemies[0].alive && s2.run.heat > 95, s2.run.heat);
    }
    { // Ninja: catches what you throw, bows, throws it back; the second hit sends it off. Hits last across slices.
      const s = scene(2, 'jumbo', 'pepperoni', [{ type: 'ninja', x: 720 }]);
      s.street.platforms.push({ x: 0, y: GROUND - 330, w: 3000, ledge: true }); s.run.enter(s.street.id, 300);
      s.input.q.power = true; s.steps(20);
      const e = s.street.enemies[0];
      ok('a thrown topping is caught, and it bows', e.hits === 1 && s.run.actors[0].state === 'bow' && s.run.actors[0].caught === 'pepperoni', s.run.actors[0].state);
      s.run.invuln = 0;
      for (let i = 0; i < 60 && !s.run.foes.some(f => f.topping === 'pepperoni'); i++) s.run.step();
      ok('then throws it back', s.run.foes.some(f => f.topping === 'pepperoni'), s.run.foes.length);
      s.steps(40);
      ok('and it hits for a bite', s.run.bites === 1, s.run.bites);
      ok('then it goes up to the fire escapes', ['leap', 'perch'].includes(s.run.actors[0].state), s.run.actors[0].state);
      s.steps(50);
      ok('it follows along up there', s.run.actors[0].y < GROUND - 200, s.run.actors[0].y);
      const again = new P.Run(canvas, s.input, { camp: s.camp, city: s.city, world: s.camp.world, slice: s.camp.pies.dc.slices[1], start: { street: s.street.id, x: 300 }, onEnd: () => {} });
      ok('a new slice finds its hit still counted', again.actors[0].e.hits === 1 && again.actors[0].state === 'perch');
      ok('and it has not left yet', e.alive);
      again.hit(again.actors[0], 'shot', 'pepperoni');
      ok('the second hit sends it off for good', !e.alive && again.actors[0].state === 'flee' && !again.foes.length, again.actors[0].state);
      const s2 = scene(2, 'ny', 'pepperoni', [{ type: 'ninja', x: 500 }]);
      s2.run.p.x = 470; s2.run.p.y = GROUND - 280; s2.run.p.vy = 6; s2.run.p.grounded = false; const heat = s2.run.heat; s2.steps(40);
      ok('jumping on a ninja hurts', s2.run.heat < heat - 5 && s2.street.enemies[0].alive, s2.run.heat);
    }
    { // Bites: each hit takes a chunk that heat can never come back past.
      const s = scene(0, 'ny', 'pepperoni');
      s.run.hurt(null, 0);
      ok('a hit takes a bite and lowers the cap', s.run.bites === 1 && s.run.cap === 80 && s.run.heat <= 80, `${s.run.cap} ${s.run.heat}`);
      s.street.fires.push({ x: 360, lit: true }); s.run.p.x = 300; s.steps(2);
      ok('a fire cannot warm it past the bite', s.run.heat <= s.run.cap, `${s.run.heat} / ${s.run.cap}`);
      for (let i = 0; i < 3; i++) { s.run.invuln = 0; s.run.hurt(null, 0); }
      ok('four bites and it is still going', !s.run.done && s.run.bites === 4, s.run.heat);
      s.run.invuln = 0; s.run.hurt(null, 0);
      ok('the fifth finishes a fresh slice', s.run.done && s.result.outcome === 'dead' && s.result.bites === 5);
      const s2 = scene(0, 'ny', 'pepperoni');
      s2.run.heat = 45;
      for (let i = 0; i < 3 && !s2.run.done; i++) { s2.run.invuln = 0; s2.run.hurt(null, 0); }
      ok('a cooled slice goes in three', s2.run.done, s2.run.heat);
    }
    { // Pickups and boxes.
      const s = scene(0, 'ny', 'pepperoni');
      s.street.pickups.push({ x: 420, y: GROUND - 60, topping: 'jalapeno' });
      s.run.p.x = 380; s.steps(2);
      ok('a pickup is three uses', s.run.held() === 'jalapeno' && s.run.left() === 3);
      for (let i = 0; i < 3; i++) { s.input.q.power = true; s.steps(3); }
      ok('used up, the slice is plain cheese', s.run.held() === null && s.run.left() === 0, s.run.left());
      const fresh = scene(0, 'ny', 'pepperoni');
      ok('a slice starts with three', fresh.run.left() === 3, fresh.run.left());
      fresh.input.q.power = true; fresh.steps(3);
      fresh.street.pickups.push({ x: 420, y: GROUND - 60, topping: 'jalapeno' });
      fresh.run.p.x = 380; fresh.steps(2);
      ok('a new topping replaces the old one', fresh.run.held() === 'jalapeno' && fresh.run.left() === 3 && fresh.run.topping === 'jalapeno');
      const s2 = scene(0, 'ny', 'pepperoni');
      s2.street.boxes.push({ x: 560, w: 84, h: 84, broken: false });
      s2.input.q.power = true; s2.steps(30);
      ok('a shot breaks a box and it stays broken', s2.street.boxes[0].broken);
    }
    { // How each pizza moves.
      const airtime = (style, cityIndex = 0) => { const s = scene(cityIndex, style, 'pepperoni'); s.input.jumpHeld = undefined; s.input.q.jump = true; s.run.step(); let f = 0, top = 0; while (!s.run.p.grounded && f < 300) { s.run.step(); f++; top = Math.max(top, GROUND - s.run.p.y - s.run.p.h); } return { f, top }; };
      const ny = airtime('ny'), deep = airtime('deep'), jumbo = airtime('jumbo'), naples = airtime('naples');
      ok('Deep Dish jumps lower and lands sooner', deep.top < ny.top * 0.75 && deep.f < ny.f, `${deep.top} vs ${ny.top}`);
      ok('Jumbo hangs in the air far longer', jumbo.f > ny.f * 1.5, `${jumbo.f} vs ${ny.f} frames`);
      const reach = style => { const s = scene(0, style, 'pepperoni'); s.input.right = true; s.steps(40); return s.run.p.x - 300; };
      ok('Deep Dish is slow to get going, Margherita quick', reach('deep') < reach('ny') * 0.7 && reach('naples') > reach('ny') * 1.2, `${reach('deep')} / ${reach('ny')} / ${reach('naples')}`);
    }
    { // A deploy is clear of enemies, and a stomp is forgiving without making a side hit free.
      const s = scene(0, 'ny', 'pepperoni', [{ type: 'teen', x: 330, range: 160 }, { type: 'teen', x: 420, range: 160, arrived: true }, { type: 'turtle', x: 520, range: 160 }]);
      C.TUNING.spawnSafe = SAFE; s.run.enter(s.street.id, 300);
      ok('enemies near the deploy point are moved out of its safe zone', s.run.actors.length === 3 && s.run.actors.every(a => Math.abs(a.x - 300) >= SAFE + 160), s.run.actors.map(a => Math.round(a.x)).join(','));
      s.steps(240);
      ok('and nothing bites in the first moments', s.run.bites === 0, s.run.bites);
      C.TUNING.spawnSafe = 0;

      const stomp = (dx, dyInto, vy = 6) => { const t = scene(0, 'ny', 'pepperoni', [{ type: 'teen', x: 700, range: 0 }]); const a = t.run.actors[0], p = t.run.p; p.x = a.x - a.size / 2 - p.w + 6 + dx; p.y = a.y - a.size + dyInto - p.h - vy; p.vy = vy; p.grounded = false; t.run.step(); return { gone: !t.street.enemies[0].alive, bites: t.run.bites }; };
      ok('a stomp lands on the head', stomp(30, 10).gone);
      ok('a stomp lands a bit late, feet deep in the enemy', stomp(30, 60).gone);
      ok('a stomp counts a little off the edge', stomp(-12, 10).gone);
      ok('but not far off it', !stomp(-60, 10).gone && stomp(-60, 10).bites === 0);
      ok('a stomp counts just past the top of the jump', (() => { const r = stomp(30, 10, -2); return r.gone; })());
      const walk = scene(0, 'ny', 'pepperoni', [{ type: 'teen', x: 480, range: 0 }]);
      walk.input.right = true; walk.steps(60);
      ok('walking into one from the side is still a bite', walk.run.bites === 1 && walk.street.enemies[0].alive, walk.run.bites);
      const low = stomp(30, 100);
      ok('feet low on the enemy is a bite, not a stomp', !low.gone && low.bites === 1, JSON.stringify(low));
    }
    { // Specials wait out a real cooldown, and the dial follows it.
      const s = scene(1, 'deep', 'sausage');
      const want = C.TUNING.cooldown.deep * 60;
      ok('Deep Dish SLAM has a cooldown of several seconds', want >= 300 && s.run.specialMax === want, `${s.run.specialMax} frames`);
      s.input.q.special = true; s.steps(2);
      ok('using it starts the cooldown', s.run.specialCd > want - 5 && s.run.pounding !== undefined, s.run.specialCd);
      s.steps(100); s.run.pounding = false; s.run.smash = 0; s.input.q.special = true; s.steps(2);
      ok('it cannot be used again while cooling', !s.run.pounding && s.run.denied > 0, s.run.specialCd);
      s.steps(want); s.input.q.special = true; s.steps(2);
      ok('and works again once ready', s.run.specialCd > 0 && s.run.smash > 0 || s.run.pounding, s.run.specialCd);
      for (const [ci, style] of [[2, 'jumbo'], [3, 'naples']]) ok(`${style} special has a cooldown too`, scene(ci, style, 'pepperoni').run.specialMax >= 300, style);
    }
    { // Onion and garlic reaches a long way, and still only hurts what stands in it.
      const reach = dx => { const t = scene(0, 'ny', 'garlic', [{ type: 'teen', x: 300 + dx, range: 0 }]); t.run.aura = true; t.run.p.x = 300 - t.run.p.w / 2; t.run.p.x = 300 - t.run.p.w / 2; t.steps(60); return !t.street.enemies[0].alive; };
      ok('the stank gets a teen at 300 px', reach(300));
      ok('but not one at 420 px', !reach(420));
    }

    { // Feet land on what is drawn: a solid is as tall as its painting, for every city's barricade and every pizza.
      for (const [ci, style] of [[0, 'ny'], [1, 'deep'], [2, 'jumbo'], [3, 'naples']]) {
        const city = C.CITIES[ci], s = scene(ci, style, 'pepperoni');
        s.street.barricades.push({ x: 560, w: 80, h: 100 }); s.street.boxes.push({ x: 900, w: 84, h: 84, broken: false });
        s.run.enter(s.street.id, 300);
        const bar = s.street.barricades[0], want = PR_SPRITES.surface(`${city.id}/barricade`), box = s.street.boxes[0];
        s.run.p.x = 520; s.run.p.y = GROUND - bar.h - s.run.p.h - 200; s.run.p.vy = 4; s.run.p.grounded = false; s.steps(120);
        ok(`${style}: the ${city.id} barricade is as tall as it is painted`, want > 40 && bar.h === want, `${bar.h} vs ${want}`);
        ok(`${style}: feet rest on the barricade's painted top`, s.run.p.grounded && Math.abs(s.run.p.y + s.run.p.h - (GROUND - want)) < 0.01, s.run.p.y + s.run.p.h);
        ok(`${style}: a crate is as tall as its painting`, box.h === PR_SPRITES.surface('props/box'), box.h);
      }
    }
    { // Garlic and onion work on every kind, and a ninja runs from it for good, even from a fire escape.
      const stank = (type, extra = {}, ci = 2) => { const t = scene(ci, 'ny', 'garlic', [{ type, x: 560, range: 0, ...extra }]); t.run.aura = true; t.steps(45); return t; };
      ok('the stank stuns a turtle', stank('turtle').run.actors[0].state === 'stun');
      ok('and a teen runs off', !stank('teen').street.enemies[0].alive);
      const m = stank('mutant', { drain: 560 }); m.run.actors[0].state = 'chase'; m.run.actors[0].rise = 1; m.steps(45);
      ok('and a mutant is seen off', !m.street.enemies[0].alive);
      const n = stank('ninja');
      ok('a ninja runs away from it for good', !n.street.enemies[0].alive && n.camp.seen['ninja.gone']);
      const high = scene(2, 'ny', 'garlic', [{ type: 'ninja', x: 560, range: 0, hits: 1 }]);
      high.street.platforms.push({ x: 0, y: GROUND - 330, w: 3000, ledge: true }); high.run.enter(high.street.id, 300);
      high.run.aura = true; high.steps(50);
      ok('even one up on a fire escape', !high.street.enemies[0].alive, high.run.actors[0] && high.run.actors[0].y);
    }
    { // Two quick hits on a ninja are two hits.
      const s = scene(2, 'ny', 'pepperoni', [{ type: 'ninja', x: 640, range: 0 }]);
      s.run.charges = 3; s.input.q.power = true; s.steps(1);
      const first = s.run.actors[0].e.hits;
      s.steps(12); s.input.q.power = true; s.steps(30);
      ok('the first shot counts', first === 0 || first === 1, first);
      ok('a second shot a moment later counts too, and it is gone', s.street.enemies[0].hits === 2 && !s.street.enemies[0].alive, s.street.enemies[0].hits);
      const sc = scene(2, 'ny', 'pineapple', [{ type: 'ninja', x: 640, range: 0 }]);
      sc.input.q.power = true; sc.steps(40);
      ok('three scattered shots landing together are one hit', sc.street.enemies[0].hits === 1 && sc.street.enemies[0].alive, sc.street.enemies[0].hits);
      const f = scene(2, 'ny', 'pepperoni', [{ type: 'ninja', x: 640, range: 0 }]); f.run.hit(f.run.actors[0], 'shot', null);
      ok('a hit shows a hurt flash', f.run.actors[0].hurt > 0);
    }
    { // A ninja on a fire escape cannot be bumped, so a tall pizza walks the platform beneath it.
      const s = scene(2, 'jumbo', 'pepperoni', [{ type: 'ninja', x: 700, range: 0, hits: 1 }]);
      s.street.platforms.push({ x: 0, y: GROUND - 330, w: 3000, ledge: true }, { x: 500, y: GROUND - 215, w: 400 }); s.run.enter(s.street.id, 300);
      s.run.p.x = 560; s.run.p.y = GROUND - 215 - s.run.p.h; s.run.p.grounded = true; s.run.invuln = 0; s.run.actors[0].cd = 1e9; s.input.right = true; s.steps(60);
      ok('Jumbo walks under it without a bite', s.run.bites === 0 && s.run.p.x > 700, `${s.run.bites} ${s.run.p.x}`);
    }
    { // A special does not stack hit-stops into a stutter, and costs no more to draw than a still frame.
      const s = scene(1, 'deep', 'sausage', [{ type: 'turtle', x: 500, range: 0 }, { type: 'teen', x: 560, range: 0 }, { type: 'ninja', x: 620, range: 0 }, { type: 'turtle', x: 440, range: 0 }]);
      s.run.p.x = 470; s.input.q.special = true;
      let frozen = 0, peak = 0;
      for (let i = 0; i < 160 && !s.run.done; i++) { s.run.step(); if (s.run.freeze > 0) frozen++; peak = Math.max(peak, s.run.freeze); }
      ok('a slam into four enemies holds the picture a few frames in all', frozen <= 8 && peak <= 4, `${frozen} frames, peak ${peak}`);
      const a = scene(1, 'ny', 'garlic', [{ type: 'teen', x: 520, range: 0 }, { type: 'turtle', x: 560, range: 0 }, { type: 'turtle', x: 600, range: 0 }]);
      a.run.aura = true; let held = 0; for (let i = 0; i < 120; i++) { a.run.step(); if (a.run.freeze > 0) held++; }
      ok('the stank never freezes the picture', held === 0, held);
    }
    { // Crates give and barricades do not, and bumping one says which.
      const s = scene(0, 'ny', 'pepperoni');
      s.street.barricades.push({ x: 540, w: 80, h: 100 }); s.run.enter(s.street.id, 300);
      s.input.q.power = true; s.steps(30);
      ok('a shot does not break a barricade', s.run.solids().includes(s.street.barricades[0]));
      s.input.right = true; s.steps(60);
      ok('walking into a barricade says it is solid', s.run.bark === C.TUNING.hints.barricade, s.run.bark);
      const b = scene(0, 'ny', null);
      b.street.boxes.push({ x: 540, w: 84, h: 84, broken: false }); b.run.enter(b.street.id, 300); b.input.right = true; b.steps(60);
      ok('walking into a crate says it gives', b.run.bark === C.TUNING.hints.box, b.run.bark);
    }
    { // The corner of the screen carries a thermometer and the spare slices, and no counter text.
      const s = scene(0, 'ny', 'pepperoni');
      s.camp.pies.newyork.slices = [0, 1, 2, 3].map(id => ({ id, style: 'ny', topping: 'pepperoni', status: id === 3 ? 'lost' : 'ready' }));
      s.run.slice = s.camp.pies.newyork.slices[0];
      const texts = [], g = s.run.ctx, orig = g.fillText.bind(g); g.fillText = (t, ...r) => { texts.push(t); return orig(t, ...r); };
      s.run.draw(); g.fillText = orig;
      ok('no slice or topping counter is written', !texts.some(t => /Topping|×|plain cheese/.test(t)), texts.join(' | '));
    }
    return out;
  });
  let bad = 0;
  for (const [name, pass, detail] of results) { if (!pass) bad++; console.log(`${pass ? 'ok  ' : 'FAIL'} ${name} ${detail}`); }
  await b.close(); serve.close();
  process.exit(bad || process.exitCode ? 1 : 0);
})();
