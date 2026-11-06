// Drives the real game in Chromium. Usage: node tests/browser.js [screenshot-dir]
// Needs NODE_PATH to reach playwright and CHROME to name the browser binary.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const forge = path.join(process.env.HOME, 'projects/sprite-forge/characters/derek/sprites/nod');
const serve = http.createServer((q, s) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); } });
});
const checks = [];
const ok = (name, pass, detail = '') => { checks.push(pass); console.log(`${pass ? 'ok  ' : 'FAIL'} ${name} ${detail}`); };

(async () => {
  await new Promise(r => serve.listen(0, r));
  const url = `http://localhost:${serve.address().port}/?debug=1`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  const shot = async n => { if (out) await page.screenshot({ path: path.join(out, `${n}.png`) }); };
  const click = t => page.getByRole('button', { name: t, exact: true }).first().click();
  const advance = async () => { for (let i = 0; i < 14 && await page.locator('#dialog:not(.hidden)').count(); i++) await page.locator('#dialog').click(); };

  await page.goto(url);
  await click('Start');
  await page.waitForTimeout(200); await shot('01-hq-opening');
  const firstLine = await page.locator('#dialog .line').innerText();
  ok('opening scene plays', /New recruits/.test(firstLine), firstLine);
  await page.locator('#dialog').click(); await page.locator('#dialog').click(); await page.locator('#dialog').click();
  await page.waitForTimeout(150); await shot('02-hq-board');
  await advance();
  await shot('03-order');
  ok('first order shows the customer alias', (await page.locator('.receipt').innerText()).includes('K8lyn'));
  await click('Build the pie'); await shot('04-new-york-pie');
  await click('Box it');
  await page.locator('.slice').first().click();

  await page.waitForTimeout(150);
  const jumpBox = await page.locator('#controls .jump').boundingBox();
  await page.touchscreen.tap(jumpBox.x + 20, jumpBox.y + 20);
  await page.waitForTimeout(120);
  ok('touch jump works', await page.evaluate(() => __pr.run.p.y < 450));
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1800); await page.keyboard.up('ArrowRight');
  await shot('05-street');
  ok('New York shows no special button', !(await page.locator('#specialBtn').isVisible()));
  ok('slice moved', await page.evaluate(() => __pr.run.p.x > 400));
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => __pr.run.frame);
  await page.waitForTimeout(250);
  ok('pause stops the street', before === await page.evaluate(() => __pr.run.frame));
  await shot('06-pause');
  await click('Corkboard');
  await shot('07-board-empty');
  await page.locator('[data-tab=enemies]').click(); await shot('08-board-enemies');
  ok('enemy polaroids start unknown', (await page.locator('.polaroid').first().innerText()).includes('???'));
  await page.locator('.tab.close').click();
  await click('Resume');
  await page.evaluate(() => __pr.run.end('dead', __pr.run.street.enemies[0].id));
  await page.waitForTimeout(80); await shot('09-debrief');
  ok('debrief prints a receipt', (await page.locator('.stamp').innerText()) === 'Eaten');
  await click('Back to HQ');
  await page.waitForTimeout(100); await shot('10-return');
  await advance();
  ok('killer grew', await page.evaluate(() => __pr.camp.streets.newyork.enemies[0].power === 1));
  await page.reload();
  await click('Continue');
  await page.waitForTimeout(100);
  ok('save survives reload', await page.evaluate(() => __pr.camp.pies.newyork.slices.filter(s => s.status === 'ready').length === 5));
  await advance();

  // The rest of the campaign, through every real screen. Long Beach loses a whole pie first.
  const seen = new Set();
  for (let guard = 0; guard < 300; guard++) {
    if (await page.locator('.card').count()) break;
    if (await page.locator('#dialog:not(.hidden)').count()) {
      seen.add(await page.evaluate(() => __pr.camp.cityIndex + ':' + __pr.camp.phase));
      const line = await page.locator('#dialog .line').innerText();
      if (line === 'Know thy enemy...') { seen.add('final'); await page.waitForTimeout(1500); await shot('13-know-thy-enemy'); }
      if (/DJ ALEWIFE/.test(line)) await shot('12-door');
      await page.locator('#dialog').click(); continue;
    }
    if (await page.locator('#screen.hidden').count()) {
      await page.evaluate(() => {
        const c = __pr.camp, r = __pr.run;
        const lastCity = c.cityIndex === 4 && c.pies.california.reorder === 0;
        r.end(lastCity ? 'cold' : 'delivered');
      });
      await page.waitForTimeout(20); continue;
    }
    if (await page.locator('.top').count() && !seen.has('board-' + await page.evaluate(() => __pr.camp.cityIndex))) {
      seen.add('board-' + await page.evaluate(() => __pr.camp.cityIndex));
      await shot(`11-pie-city${await page.evaluate(() => __pr.camp.cityIndex)}`);
    }
    if (await page.locator('.slice').count()) { await page.locator('.slice').first().click(); await page.waitForTimeout(30); continue; }
    if (!seen.has('taped') && await page.evaluate(() => __pr.camp.undercover.length && __pr.camp.phase === 'reorder') && await page.getByRole('button', { name: 'Corkboard' }).count()) {
      seen.add('taped');
      await click('Corkboard');
      await page.locator('[data-tab=roster]').click(); await shot('12-board-roster');
      ok('roster tape appears', (await page.locator('.tape').count()) > 0);
      await page.locator('[data-tab=theory]').click(); await shot('12-board-theory');
      ok('recursive photo shown', (await page.locator('#recursive').count()) === 1);
      await page.locator('[data-tab=history]').click(); await page.locator('.pin').first().click(); await shot('12-board-receipt');
      await page.locator('.detail').click();
      await page.locator('.tab.close').click();
      continue;
    }
    await page.locator('#screen:not(.hidden) .actions button').first().click();
    await page.waitForTimeout(15);
  }
  await shot('14-end-card');
  const card = await page.locator('.card').innerText();
  ok('ending reaches the card', /To be continued/.test(card) && /Happy birthday Katelyn/.test(card), card.replace(/\n+/g, ' | '));
  ok('final scene played', seen.has('final'));
  ok('no listen link without a real URL', !(await page.locator('.listen').count()));
  ok('lost pie reordered in Long Beach', await page.evaluate(() => __pr.camp.pies.california.reorder === 1));

  await page.evaluate(() => __pr.camp.cityIndex = 4);
  const camp = await page.evaluate(() => JSON.stringify(__pr.camp));
  fs.writeFileSync('/tmp/pr_final_camp.json', camp);
  await click('Back to title');
  await click('Continue').catch(() => {});
  await page.waitForTimeout(100);

  // Real pipeline output, with Derek standing in for the Old Timer and a teenager.
  if (fs.existsSync(forge)) {
    const art = await context.newPage();
    art.on('pageerror', e => errors.push(e.message));
    await art.route('**/assets/manifest.json', r => r.fulfill({ json: { 'old-timer': ['idle'], teen: ['walk'] } }));
    await art.route('**/assets/sprites/**/atlas.json', r => r.fulfill({ path: path.join(forge, 'atlas.json') }));
    await art.route('**/assets/sprites/**/sheet.png', r => r.fulfill({ path: path.join(forge, 'sheet.png') }));
    await art.goto(url);
    await art.evaluate(() => localStorage.clear());
    await art.reload();
    await art.getByRole('button', { name: 'Start', exact: true }).click();
    await art.waitForTimeout(300);
    ok('sprite-forge sheet loads', await art.evaluate(() => PR_SPRITES.has('old-timer', 'idle') && PR_SPRITES.has('teen', 'walk')));
    if (out) await art.screenshot({ path: path.join(out, '15-derek-sprite.png') });
    await art.close();
  }
  ok('no page errors', !errors.length, errors.slice(0, 3).join(' / '));
  await browser.close(); serve.close();
  process.exit(checks.every(Boolean) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
