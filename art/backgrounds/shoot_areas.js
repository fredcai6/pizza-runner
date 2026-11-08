// Screenshots every area in play (?playtest=1), its door scene and the layer seams, for reviewing the paper backgrounds.
//   node art/backgrounds/shoot_areas.js OUT_DIR [city/area ...]      (CHROME and NODE_PATH set as for tests/browser.js)
// Per area: OUT/CITY-AREA-play-{start,mid,door}.png, OUT/CITY-AREA-door-scene.png. Seam views come from seams.py.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..'), out = process.argv[2];
const only = process.argv.slice(3);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const serve = http.createServer((q, s) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); } });
});
fs.mkdirSync(out, { recursive: true });

(async () => {
  await new Promise(r => serve.listen(0, r));
  const url = `http://localhost:${serve.address().port}/?debug=1&playtest=1`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const btn = t => page.getByRole('button', { name: t, exact: true }).first();
  const cities = await (async () => { await page.goto(url); return page.evaluate(() => PR_CONTENT.CITIES.map(c => ({ id: c.id, areas: c.areas.map(a => a.id) }))); })();
  for (let ci = 1; ci < cities.length; ci++) {
    for (let ai = 0; ai < cities[ci].areas.length; ai++) {
      const key = `${cities[ci].id}/${cities[ci].areas[ai]}`, name = key.replace('/', '-');
      if (only.length && !only.includes(key)) continue;
      await page.goto(url);
      await btn('Playtest').click();
      await page.locator(`.warp[data-city="${ci}"][data-at="${ai}"]`).click();
      for (let i = 0; i < 12 && !(await page.evaluate(() => !!(window.__pr.run && !window.__pr.run.done))); i++) {
        for (const t of ['Build the pie', 'Box it', 'Deploy']) if (await btn(t).count()) { await btn(t).click(); break; }
        await page.waitForTimeout(250);
      }
      await page.evaluate(() => { __pr.run.god = true; });
      // a street of this area (the one with the door if it has one); the deployment point may be in another area
      const info = await page.evaluate(ai => {
        const ss = Object.values(__pr.camp.world.streets).filter(x => x.area === ai);
        const s = ss.find(x => x.door != null) || ss[0];
        __pr.run.enter(s.id, 300);
        return { area: __pr.run.area.id, street: s.id, door: s.door, len: s.length };
      }, ai);
      console.log(key, JSON.stringify(info));
      const at = async (x, tag) => {
        await page.evaluate(x => { const r = __pr.run; r.actors.length = 0; r.p.x = x; r.p.vx = 0; }, x);
        await page.waitForTimeout(350);
        await page.screenshot({ path: path.join(out, `${name}-play-${tag}.png`) });
      };
      await at(300, 'start');
      await at(Math.min(1600, Math.max(400, info.len / 2)), 'mid');
      if (info.door != null) await at(Math.max(300, info.door - 340), 'door');
      // the door scene: the delivery at this address, as the game stages it
      await page.evaluate(ai => { const c = __pr.camp; c.world.delivery = ai + 1; c.phase = 'door'; __pr.run.stop && __pr.run.stop(); __pr.route(); }, ai);
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(out, `${name}-door-scene.png`) });
    }
  }
  if (errors.length) console.log('page errors', errors);
  await browser.close(); serve.close();
})();
