// Screenshots of the rest of the cast in play (Chicago, DC, Naples, California, HQ, the corkboard, the ending).
// Usage: node art/paper/shots_rest.js OUT_DIR
// export CHROME=$(ls -d ~/.cache/ms-playwright/chromium-1243/*/)chrome NODE_PATH=/usr/lib/chatgpt/resources/cua_node/lib/node_modules
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..'), out = process.argv[2] || '/tmp/paper-rest-chars';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const serve = http.createServer((q, s) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); } });
});
const ONLY = process.env.ONLY || '';
const CITIES = [['chicago', 1, ['loop', 'lincolnpark', 'wickerpark']], ['dc', 2, ['georgetown', 'mall', 'federal']], ['naples', 3, ['harbor', 'center', 'hillside']], ['california', 4, ['downtown', 'beach', 'alewife']]];

(async () => {
  await new Promise(r => serve.listen(0, r));
  const url = `http://localhost:${serve.address().port}/?debug=1&playtest=1`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errors = [], bad = [];
  page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('response', r => { if (r.status() >= 400) bad.push(r.url()); });
  const shot = async n => { await page.screenshot({ path: path.join(out, `${n}.png`) }); console.log('shot', n); };
  const click = t => page.getByRole('button', { name: t, exact: true }).first().click();
  const warp = async (city, at) => {
    await page.goto(url);
    await click('Playtest');
    await page.locator(`.warp[data-city="${city}"][data-at="${at}"]`).click();
    await page.waitForTimeout(600);
  };

  // HQ: the opening has Dayold and every recruit.
  if (!ONLY) {
  await page.goto(url);
  await click('Start');
  await page.locator('#dialog:not(.hidden)').waitFor();
  for (let i = 0; i < 30 && await page.locator('#dialog:not(.hidden)').count(); i++) {
    await page.waitForTimeout(450); if (i % 3 === 0) await shot(`hq-${String(i).padStart(2, '0')}`);
    await page.locator('#dialog').click();
  }

  }
  if (!ONLY) for (const [name, c, areas] of CITIES) {
    await warp(c, 0);
    await click('Deploy').catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await shot(`${name}-run`);
    await page.keyboard.press('ArrowUp'); await page.waitForTimeout(260); await shot(`${name}-jump`);
    await page.waitForTimeout(420); await shot(`${name}-fall-or-land`);
    await page.evaluate(() => { __pr.run.heat = 100; });
    await page.keyboard.press('Shift'); await page.waitForTimeout(160); await shot(`${name}-special-a`);
    await page.waitForTimeout(220); await shot(`${name}-special-b`);
    await page.keyboard.up('ArrowRight');
    await page.evaluate(() => { __pr.run.heat = 3; });
    await page.waitForTimeout(500); await shot(`${name}-cold`);
    await page.evaluate(() => { __pr.run.heat = 100; });
    for (const type of ['teen', 'turtle', 'ninja', 'mutant']) {
      let found = false;
      for (let x = 300; x < 6000 && !found; x += 350) {
        found = await page.evaluate(([t, x]) => { const r = __pr.run; r.heat = 100; const a = r.actors.find(q => q.e && q.e.type === t && q.x > r.p.x - 400); if (a) { r.p.x = a.x - 330; return true; } r.p.x = x; return false; }, [type, x]);
        await page.waitForTimeout(250);
      }
      console.log(name, type, found);
      if (found) { await page.waitForTimeout(500); await shot(`${name}-street-${type}`); }
    }
    for (let n = 0; n < areas.length; n++) {
      await warp(c, n);
      await click('Deploy');
      await page.waitForTimeout(500);
      await page.evaluate(() => __pr.run && __pr.run.end('delivered'));
      for (let i = 0; i < 60; i++) {
        if (await page.locator('#dialog:not(.hidden)').count()) { await page.waitForTimeout(500); break; }
        await page.waitForTimeout(100);
      }
      await shot(`door-${name}-${areas[n]}`);
    }
  }

  // The corkboard's enemy tab, from the map.
  if (!ONLY) {
  await warp(1, 0);
  await click('Corkboard');
  await page.waitForTimeout(400);
  await page.locator('[data-tab="enemies"]').click();
  await page.waitForTimeout(500); await shot('corkboard-enemies');
  await page.locator('.polaroid').nth(2).click().catch(() => {}); await page.waitForTimeout(300); await shot('corkboard-ninja-file');

  }
  // The ending: the Polaroid.
  await page.goto(url);
  await click('Playtest');
  await click('See the door and ending scenes');
  await page.waitForTimeout(1500); await shot('ending-start'); console.log(await page.evaluate(() => document.body.innerText.slice(0, 300)));
  for (let i = 0; i < 80 && await page.locator('#dialog:not(.hidden)').count(); i++) {
    await page.waitForTimeout(1300);
    if (i % 6 === 0) await shot(`ending-${i}`);
    const txt = await page.locator('#dialog').innerText().catch(() => '');
    if (/Know thy enemy/.test(txt)) { await page.waitForTimeout(900); await shot('ending-polaroid'); break; }
    await page.locator('#dialog').click();
  }
  console.log('errors', errors, 'missing', bad);
  await browser.close(); serve.close();
})();
