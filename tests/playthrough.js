// Records a real-time bot playthrough of the whole campaign, with every screen and scene.
// Usage: node tests/playthrough.js OUT_DIR   Needs NODE_PATH and CHROME like the other browser tests.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const serve = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); } }); });

// Plays like a person who has read the signs: follows the route, jumps what is in the way, shoots what is ahead.
const pilot = () => {
  setInterval(() => {
    const pr = window.__pr, r = pr.run, input = pr.input;
    if (!r || r.done) { input.right = false; return; }
    input.right = true; input.jumpHeld = true;
    const { p } = r, ahead = r.actors.filter(a => !a.leaving && a.rise > 0.3 && a.x > p.x - 40 && a.x - p.x < 560 && Math.abs(a.y - p.y) < 300);
    const near = ahead.sort((a, b) => a.x - b.x)[0];
    const block = r.solids().find(c => c.x > p.x && c.x - p.x - p.w < 60 && p.y + p.h > 600 - c.h);
    if (block && p.grounded) input.queued.jump = true;
    if (near) {
      if (near.e.type === 'ninja' || near.e.type === 'teen' || near.e.type === 'mutant') input.queued.power = r.frame % 24 === 0;
      if (near.e.type === 'turtle' && near.state === 'walk' && near.x - p.x < 190 && p.grounded) input.queued.jump = true;
    }
    if (r.offer && r.heading && r.heading.kind === 'turn') input.queued.turn = true;
    if (r.frame % 200 === 0 && r.style.special && near) input.queued.special = true;
  }, 16);
};

(async () => {
  await new Promise(r => serve.listen(0, r));
  const browser = await chromium.launch({ executablePath: process.env.CHROME });
  const size = { width: 1280, height: 720 };
  const context = await browser.newContext({ viewport: size, recordVideo: { dir: out, size } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${serve.address().port}/?debug=1`);
  await page.evaluate(pilot);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const started = Date.now();
  const log = [];
  for (let guard = 0; Date.now() - started < 50 * 60000; guard++) {
    if (await page.locator('.card').count()) break;
    if (await page.locator('#dialog:not(.hidden)').count()) {
      const line = await page.locator('#dialog .line').innerText();
      await page.waitForTimeout(600 + Math.min(1800, line.length * 34));
      await page.locator('#dialog').click({ timeout: 1000 }).catch(() => {});
      continue;
    }
    if (await page.locator('#screen.hidden').count()) { await page.waitForTimeout(400); continue; }
    const deploy = page.getByRole('button', { name: 'Deploy' });
    if (await deploy.count()) { await page.waitForTimeout(1600); await deploy.click({ timeout: 1000 }).catch(() => {}); continue; }
    await page.waitForTimeout(1300);
    await page.locator('#screen:not(.hidden) .actions button').first().click({ timeout: 1000 }).catch(() => {});
  }
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => ({ receipts: __pr.camp.receipts.length, attempts: __pr.camp.attempts, delivered: __pr.camp.counts.delivered, lost: __pr.camp.counts.lost }));
  console.log(JSON.stringify({ minutes: ((Date.now() - started) / 60000).toFixed(1), ended: await page.locator('.card').count() === 1, errors, ...state }));
  const video = page.video();
  await context.close();
  fs.renameSync(await video.path(), path.join(out, 'playthrough.webm'));
  await browser.close(); serve.close();
})().catch(e => { console.error(e); process.exit(1); });
