// Careless bots on real streets. Usage: node tests/balance.js
// walk holds right and jumps on a timer. mash does the same and hammers every button.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const serve = http.createServer((q, s) => { const u = q.url.split('?')[0]; const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); } }); });
(async () => {
  await new Promise(r => serve.listen(0, r));
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const page = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  await page.goto(`http://localhost:${serve.address().port}/?debug=1`);
  const out = await page.evaluate(() => {
    const C = PR_CONTENT, R = PR_RULES, P = PR_PLAY, canvas = document.getElementById('stage');
    return C.CITIES.map((city, index) => {
      const rows = [];
      for (let trial = 0; trial < 20; trial++) {
        const camp = R.newCampaign(); camp.cityIndex = index;
        const skill = trial % 2 ? 'mash' : 'walk';
        const pick = city.menu.a[Math.floor(trial / 2) % city.menu.a.length], pick2 = city.menu.b[Math.floor(trial / 2) % city.menu.b.length];
        R.placeOrder(camp, pick, pick2);
        const street = camp.streets[city.id];
        let tries = 0, won = false; const secs = [];
        const pies = city.final ? 8 : 1;
        for (let n = 0; n < pies && !won; n++) {
        if (n) { camp.cityIndex = index; R.placeOrder(camp, pick, pick2); }
        for (const slice of camp.pies[city.id].slices) {
          tries++;
          let result = null;
          const input = { left: false, right: true, q: {}, take(k) { const v = this.q[k]; this.q[k] = false; return v; } };
          const run = new P.Run(canvas, input, { camp, city, street, slice, onEnd: r => { result = r; } });
          let f = 0, stuck = 0, lastX = 0;
          while (!result && f < 60 * 240) {
            if (run.p.x === lastX) stuck++; else stuck = 0;
            lastX = run.p.x;
            if (stuck > 8 || f % 80 === (trial * 11) % 80) input.q.jump = true;
            if (skill === 'mash' && f % 25 === 0) input.q.power = true;
            if (skill === 'mash' && f % 90 === 0) input.q.special = true;
            run.step(); f++;
          }
          secs.push(Math.round(f / 60));
          R.finishRun(camp, slice, result || { outcome: 'cold', x: 0 });
          if (result && result.outcome === 'delivered') { won = true; break; }
        }
        }
        rows.push({ skill, tries, won, secs });
      }
      return { city: city.id, rows };
    });
  });
  for (const { city, rows } of out) for (const s of ['walk', 'mash']) {
    const r = rows.filter(x => x.skill === s), w = r.filter(x => x.won);
    const secs = r.flatMap(x => x.secs);
    console.log(city.padEnd(11), s, `won ${w.length}/${r.length}`, `tries when won ${(w.reduce((a, x) => a + x.tries, 0) / (w.length || 1)).toFixed(1)}`, `run ${Math.round(secs.reduce((a, x) => a + x, 0) / secs.length)}s`);
  }
  await b.close(); serve.close();
})();
