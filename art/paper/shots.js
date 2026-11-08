// Screenshots of the New York cast in play. Usage: node art/paper/shots.js OUT_DIR
// export CHROME=$(ls -d ~/.cache/ms-playwright/chromium-1243/*/)chrome NODE_PATH=/usr/lib/chatgpt/resources/cua_node/lib/node_modules
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..'), out = process.argv[2] || '/tmp/paper-ny-chars';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const serve = http.createServer((q, s) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); } });
});

(async () => {
  await new Promise(r => serve.listen(0, r));
  const url = `http://localhost:${serve.address().port}/?debug=1&playtest=1`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const shot = async n => { await page.screenshot({ path: path.join(out, `${n}.png`) }); console.log('shot', n); };
  const click = t => page.getByRole('button', { name: t, exact: true }).first().click();
  const advance = async (stop) => { for (let i = 0; i < 80 && await page.locator('#dialog:not(.hidden)').count(); i++) { if (stop && await stop()) return; await page.locator('#dialog').click(); await page.waitForTimeout(40); } };
  const warp = async (city, at) => {
    await page.goto(url);
    await click('Playtest');
    await page.locator(`.warp[data-city="${city}"][data-at="${at}"]`).click();
    await page.waitForTimeout(600);
  };

  // HQ: the opening scene has Dayold and the recruits.
  await page.goto(url);
  await click('Start');
  await page.locator('#dialog:not(.hidden)').waitFor(); await page.waitForTimeout(500); await shot('hq-1-opening');
  for (let i = 0; i < 6 && await page.locator('#dialog:not(.hidden)').count(); i++) { await page.locator('#dialog').click(); await page.waitForTimeout(500); await shot(`hq-${i + 2}`); }

  // The street: Vinny running, jumping, cold; teen and turtle.
  await warp(0, 0);
  await click('Deploy').catch(() => {});
  await page.waitForTimeout(500);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await shot('street-run');
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(260); await shot('street-jump');
  await page.waitForTimeout(500); await shot('street-fall-or-land');
  await page.keyboard.up('ArrowRight');
  await page.evaluate(() => { __pr.run.heat = 3; });
  await page.waitForTimeout(500); await shot('street-cold');
  await page.evaluate(() => { __pr.run.heat = 100; });
  for (const type of ['teen', 'turtle']) {
    let found = false;
    for (let x = 300; x < 6000 && !found; x += 350) {
      found = await page.evaluate(([t, x]) => { const r = __pr.run; r.heat = 100; const a = r.actors.find(q => q.e && q.e.type === t && q.x > r.p.x - 400); if (a) { r.p.x = a.x - 330; return true; } r.p.x = x; return false; }, [type, x]);
      await page.waitForTimeout(250);
    }
    console.log(type, found);
    await page.waitForTimeout(500); await shot(`street-${type}`);
  }
  // Doors: each New York customer.
  for (const [n, area] of [[0, 'wallstreet'], [1, 'centralpark'], [2, 'brooklyn']]) {
    await warp(0, n);
    await click('Deploy');
    await page.waitForTimeout(500);
    await page.evaluate(() => __pr.run && __pr.run.end('delivered'));
    for (let i = 0; i < 60; i++) {
      if (await page.locator('#dialog:not(.hidden)').count()) { await page.waitForTimeout(500); break; }
      await page.waitForTimeout(100);
    }
    await shot(`door-${area}`);
  }
  console.log('errors', errors);
  await browser.close(); serve.close();
})();
