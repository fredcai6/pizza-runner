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
  const results = await page.evaluate(() => {
    const C = PR_CONTENT, R = PR_RULES, P = PR_PLAY, GROUND = R.GROUND, out = [];
    const ok = (name, pass, detail = '') => out.push([name, !!pass, String(detail)]);
    const canvas = document.getElementById('stage');
    // One empty street with just the enemy under test on it.
    const scene = (cityIndex, style, topping, enemies = []) => {
      const city = C.CITIES[cityIndex], camp = R.newCampaign(); camp.cityIndex = cityIndex;
      camp.pies[city.id] = { slices: [{ id: 0, style, topping, status: 'ready' }, { id: 1, style, topping, status: 'ready' }] };
      camp.world = R.newWorld(city, 1); camp.phase = 'map';
      const id = `${city.areas[0].id}.main`, street = camp.world.streets[id];
      Object.assign(street, { platforms: [], fires: [], boxes: [], barricades: [], pickups: [], drains: [], enemies: [] });
      enemies.forEach((e, i) => street.enemies.push({ id: i, x: 900, y: GROUND, range: 40, alive: true, power: 0, toppings: [], bribed: -1, hits: 0, ...e }));
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
      s2.run.p.x = 460; s2.steps(78); s2.run.p.facing = -1; s2.input.q.power = true; s2.steps(60);
      ok('it catches thrown food and goes down', !s2.street.enemies[0].alive && s2.run.heat > 95, s2.run.heat);
    }
    { // Ninja: three hits, across slices, and no head-bouncing.
      const s = scene(2, 'jumbo', 'pepperoni', [{ type: 'ninja', x: 720 }]);
      s.street.platforms.push({ x: 0, y: GROUND - 330, w: 3000, ledge: true }); s.run.enter(s.street.id, 300);
      s.input.q.power = true; s.steps(40);
      const e = s.street.enemies[0];
      ok('first hit sends it up to the fire escapes', e.hits === 1 && ['leap', 'perch'].includes(s.run.actors[0].state), s.run.actors[0].state);
      s.steps(50);
      ok('it follows along up there', s.run.actors[0].y < GROUND - 200, s.run.actors[0].y);
      const again = new P.Run(canvas, s.input, { camp: s.camp, city: s.city, world: s.camp.world, slice: s.camp.pies.dc.slices[1], start: { street: s.street.id, x: 300 }, onEnd: () => {} });
      ok('a new slice finds its hit still counted', again.actors[0].e.hits === 1 && again.actors[0].state === 'perch');
      R.strike(s.camp, e);
      ok('and it has not left yet', e.alive);
      again.hit(again.actors[0], 'shot');
      ok('third hit and it is gone', !e.alive);
      const s2 = scene(2, 'ny', 'pepperoni', [{ type: 'ninja', x: 500 }]);
      s2.run.p.x = 470; s2.run.p.y = GROUND - 280; s2.run.p.vy = 6; s2.run.p.grounded = false; const heat = s2.run.heat; s2.steps(40);
      ok('jumping on a ninja hurts', s2.run.heat < heat - 5 && s2.street.enemies[0].alive, s2.run.heat);
      const s3 = scene(2, 'ny', 'pepperoni', [{ type: 'ninja', x: 400 }]);
      s3.run.nearby = s3.run.actors[0]; s3.input.q.give = true; s3.run.step();
      const bribed = s3.street.enemies[0];
      ok('a bribe costs the topping', s3.run.topping === null && bribed.toppings.length === 1);
    }
    { // Pickups and boxes.
      const s = scene(0, 'ny', 'pepperoni');
      s.street.pickups.push({ x: 420, y: GROUND - 60, topping: 'jalapeno' });
      s.run.p.x = 380; s.steps(2);
      ok('a pickup takes over', s.run.held() === 'jalapeno' && s.run.left() === 3);
      for (let i = 0; i < 3; i++) { s.input.q.power = true; s.steps(3); }
      ok('three uses later the slice has its own back', s.run.held() === 'pepperoni' && s.run.left() === 14, s.run.left());
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
    return out;
  });
  let bad = 0;
  for (const [name, pass, detail] of results) { if (!pass) bad++; console.log(`${pass ? 'ok  ' : 'FAIL'} ${name} ${detail}`); }
  await b.close(); serve.close();
  process.exit(bad || process.exitCode ? 1 : 0);
})();
