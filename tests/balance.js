// Careless bots working real cities. Usage: node tests/balance.js
// walk holds right, jumps on a timer and takes the shortest known way. mash also hammers every button.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const serve = http.createServer((q, s) => { const u = q.url.split('?')[0]; const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); } }); });
const TRIALS = Number(process.argv[2] || 12);
(async () => {
  await new Promise(r => serve.listen(0, r));
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const page = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  await page.goto(`http://localhost:${serve.address().port}/?debug=1`);
  const out = await page.evaluate(TRIALS => {
    const C = PR_CONTENT, R = PR_RULES, P = PR_PLAY, M = PR_MAP, canvas = document.getElementById('stage');
    return C.CITIES.map((city, index) => {
      const rows = [];
      for (let trial = 0; trial < TRIALS; trial++) {
        const camp = R.newCampaign(); camp.cityIndex = index;
        const skill = trial % 2 ? 'mash' : 'walk';
        if (city.final) {
          for (const c of C.CITIES.filter(c => !c.final)) camp.reserves[c.id] = [0, 1].map(() => ({ style: c.style, topping: c.menu[(trial >> 1) % c.menu.length], from: c.id }));
          R.startFinale(camp);
        } else {
          R.placeOrder(camp, city.menu[Math.floor(trial / 2) % city.menu.length]);
        }
        const secs = [];
        const outcomes = { delivered: 0, cold: 0, dead: 0 };
        while (camp.phase === 'map') {
          const list = R.ready(camp.pies[city.id]), slice = list[trial % list.length], node = M.closest(camp);
          let result = null;
          const input = { left: false, right: true, q: {}, take(k) { const v = this.q[k]; this.q[k] = false; return v; } };
          const run = new P.Run(canvas, input, { camp, city, world: camp.world, slice, start: R.deployment(camp.world, node), onEnd: r => { result = r; } });
          let f = 0, stuck = 0, lastX = 0;
          while (!result && f < 60 * 240) {
            if (run.p.x === lastX) stuck++; else stuck = 0;
            lastX = run.p.x;
            if (stuck > 8 || f % 80 === (trial * 11) % 80) input.q.jump = true;
            if (skill === 'mash' && f % 25 === 0) input.q.power = true;
            if (skill === 'mash' && f % 90 === 0) input.q.special = true;
            if (run.offer) {
              const here = run.street, route = R.routes(camp.world, here.to, R.addressStreet(camp));
              if (route && route.first === run.offer.id && here.id !== R.addressStreet(camp)) input.q.turn = true;
            }
            run.step(); f++;
          }
          secs.push(Math.round(f / 60));
          result = result || { outcome: 'cold', x: 0 };
          outcomes[result.outcome]++;
          R.finishRun(camp, slice, result);
          if (camp.phase === 'door') R.afterDoor(camp);
        }
        rows.push({ skill, won: camp.phase === 'cityDone', outcomes, secs, total: secs.reduce((a, x) => a + x, 0), used: secs.length });
      }
      return { city: city.id, rows };
    });
  }, TRIALS);
  for (const { city, rows } of out) for (const s of ['walk', 'mash']) {
    const r = rows.filter(x => x.skill === s), w = r.filter(x => x.won);
    const secs = r.flatMap(x => x.secs), mean = a => (a.reduce((x, y) => x + y, 0) / (a.length || 1));
    console.log(city.padEnd(11), s, `won ${w.length}/${r.length}`, `slices ${mean(r.map(x => x.used)).toFixed(1)}`, `run ${Math.round(mean(secs))}s`, `city ${Math.round(mean(r.map(x => x.total)))}s`, `longest ${Math.max(...secs)}s`);
  }
  await b.close(); serve.close();
})();
