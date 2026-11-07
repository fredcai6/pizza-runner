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
  const advance = async () => { for (let i = 0; i < 120 && await page.locator('#dialog:not(.hidden)').count(); i++) await page.locator('#dialog').click(); };

  await page.goto(url);
  await click('Start');
  await page.locator('#dialog:not(.hidden)').waitFor(); await page.waitForTimeout(250); await shot('01-hq-opening');
  const firstLine = await page.locator('#dialog .line').getAttribute('data-full');
  ok('opening scene plays', /New recruits/.test(firstLine), firstLine);
  await advance();
  await shot('03-order');
  ok('first order shows the customer alias', (await page.locator('.receipt').innerText()).includes('K8lyn'));
  await click('Build the pie'); await shot('04-new-york-pie');
  await click('Box it');
  await page.locator('#screen .citymap').waitFor();
  await shot('05-map');
  ok('map shows the address and one checkpoint', await page.locator('#screen .addr.active').count() === 1 && await page.locator('#screen .check').count() === 1);
  await click('Deploy');

  await page.waitForTimeout(150);
  const jumpBox = await page.locator('#controls .jump').boundingBox();
  await page.touchscreen.tap(jumpBox.x + 20, jumpBox.y + 20);
  await page.waitForTimeout(50);
  ok('touch jump works', await page.evaluate(() => !__pr.run.p.grounded || __pr.run.p.y < 480));
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1800); await page.keyboard.up('ArrowRight');
  await shot('06-street');
  ok('New York shows no special button', !(await page.locator('#specialBtn').isVisible()));
  ok('slice moved', await page.evaluate(() => __pr.run.p.x > 400));
  // The pause button is always on screen, clear of the stage edge, and works for a tap; P pauses too.
  const pauseBox = await page.locator('#pauseBtn').boundingBox();
  ok('pause button is visible and on screen', pauseBox && pauseBox.x >= 0 && pauseBox.y >= 0 && pauseBox.x + pauseBox.width <= 844 && pauseBox.y + pauseBox.height <= 390 && /PAUSE/.test(await page.locator('#pauseBtn').innerText()), JSON.stringify(pauseBox));
  await page.touchscreen.tap(pauseBox.x + pauseBox.width / 2, pauseBox.y + pauseBox.height / 2);
  ok('tapping pause pauses', await page.evaluate(() => __pr.run.paused));
  await click('Resume');
  await page.keyboard.press('p');
  ok('P pauses', await page.evaluate(() => __pr.run.paused));
  await click('Resume');
  ok('the Power button is now the Topping button', (await page.locator('#controls [data-key=power]').innerText()) === 'TOPPING');
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => __pr.run.frame);
  await page.waitForTimeout(250);
  ok('pause stops the street', before === await page.evaluate(() => __pr.run.frame));
  await shot('07-pause');
  await click('Corkboard');
  await shot('08-board-empty');
  await page.locator('[data-tab=enemies]').click();
  ok('enemy polaroids start unknown', (await page.locator('.polaroid').first().innerText()).includes('???'));
  await page.locator('.tab.close').click();
  await click('Map'); await shot('09-pause-map');
  await page.locator('.mapback').click();
  await click('Resume');

  // Reach the junction, carry on past it: a real keep-going, then a real turn at the next one offering one.
  await page.evaluate(() => { const r = __pr.run; r.p.x = r.street.turnAt - 340; });
  await page.waitForTimeout(120);
  ok('junction unlocks a checkpoint', await page.evaluate(() => Object.keys(__pr.camp.world.reached).length === 1 + 0 || !!__pr.camp.world.reached[__pr.run.street.to]));
  ok('TURN sits greyed out when no turn is available', await page.evaluate(() => { const r = __pr.run; r.p.x = 400; r.junctionStep(); return !r.offer; }));
  await page.evaluate(() => { const r = __pr.run; const next = r.junction.keep.id; r.p.x = r.street.length - r.p.w - 6; __pr.input.right = true; __pr.want = next; });
  await page.waitForTimeout(900);
  ok('keep going moves onto the next stretch', await page.evaluate(() => __pr.run.street.id === __pr.want));
  await page.evaluate(() => { __pr.input.right = false; const r = __pr.run, w = r.world; const s = Object.values(w.streets).find(x => { const j = PR_RULES.junction(w, x); return j.turn && j.open; }); r.enter(s.id, 300); r.p.x = r.street.turnAt - 100; r.junctionStep(); __pr.want = r.offer && r.offer.id; });
  await page.waitForTimeout(150);
  ok('a side turn is on offer', await page.evaluate(() => !!__pr.want));
  ok('TURN lights up', !(await page.locator('#turnBtn.dim').count()));
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(700);
  ok('turning changes street', await page.evaluate(() => __pr.run.street.id === __pr.want));
  await page.evaluate(() => __pr.run.end('dead', (__pr.run.actors[0] || { e: {} }).e.id));
  await page.waitForTimeout(80); await shot('11-debrief');
  ok('debrief prints a receipt', (await page.locator('.stamp').innerText()) === 'Eaten');
  await click('Back to the map');
  await page.locator('#screen .citymap').waitFor(); await shot('12-map-second');
  ok('two checkpoints to choose from after a loss', await page.locator('#screen .check').count() >= 2);
  await page.reload();
  await click('Continue');
  await page.locator('#screen .citymap').waitFor();
  ok('save survives reload', await page.evaluate(() => __pr.camp.pies.newyork.slices.filter(s => s.status === 'ready').length === 5));

  // The rest of the campaign, through every real screen. Chicago and Long Beach each lose a whole pie first.
  const seen = new Set(), losses = {};
  for (let guard = 0; guard < 1800; guard++) {
    if (await page.locator('.card').count()) break;
    if (await page.locator('#dialog:not(.hidden)').count()) {
      seen.add(await page.evaluate(() => __pr.camp.cityIndex + ':' + __pr.camp.phase));
      const line = await page.locator('#dialog .line').getAttribute('data-full');
      if (line === 'Know thy enemy...') { seen.add('final'); await page.waitForTimeout(1500); await shot('16-know-thy-enemy'); }
      if (/DJ ALEWIFE/.test(line)) { await page.waitForTimeout(200); await shot('15-alewife-door'); }
      const door = await page.evaluate(() => __pr.camp.phase === 'door' && __pr.camp.cityIndex + '.' + __pr.camp.world.delivery);
      if (door && !seen.has(door)) { seen.add(door); await page.waitForTimeout(120); await shot(`14-door-${door}`); }
      await page.locator('#dialog').click(); continue;
    }
    if (await page.locator('#screen.hidden').count()) {
      await page.evaluate(() => {
        const c = __pr.camp, r = __pr.run, tries = c.attempts[PR_RULES.currentCity(c).id];
        const lose = (c.cityIndex === 1 || c.cityIndex === 4) && tries === 1;
        r.end(lose ? 'cold' : 'delivered');
      });
      await page.waitForTimeout(20); continue;
    }
    if (await page.locator('.top').count()) {
      const k = 'pie-' + await page.evaluate(() => __pr.camp.cityIndex);
      if (!seen.has(k)) { seen.add(k); await shot(`13-${k}`); }
    }
    if (await page.getByRole('button', { name: 'Deploy' }).count()) {
      const k = 'map-' + await page.evaluate(() => __pr.camp.cityIndex);
      if (!seen.has(k)) { seen.add(k); await shot(`13-${k}`); }
      if (!seen.has('taped') && await page.evaluate(() => __pr.camp.undercover.length && __pr.camp.cityIndex >= 2)) {
        seen.add('taped');
        await click('Corkboard');
        await page.locator('[data-tab=theory]').click(); await shot('13-board-theory');
        ok('the board does not picture itself', (await page.locator('#recursive').count()) === 0);
        await page.locator('[data-tab=history]').click(); await page.locator('button.pin').first().click(); await shot('13-board-receipt');
        await page.locator('.detail').click();
        await page.locator('.tab.close').click();
        continue;
      }
      await click('Deploy'); await page.waitForTimeout(30); continue;
    }
    await page.locator('#screen:not(.hidden) .actions button').first().click({ timeout: 600 }).catch(() => {});
    await page.waitForTimeout(15);
  }
  await shot('17-end-card');
  const card = await page.locator('.card').innerText();
  ok('ending reaches the card', /To be continued/.test(card) && /Happy birthday Katelyn/.test(card), card.replace(/\n+/g, ' | '));
  ok('final scene played', seen.has('final'));
  ok('a lost city was retried, earlier cities kept', await page.evaluate(() => __pr.camp.attempts.chicago === 2 && __pr.camp.attempts.newyork === 1));
  ok('Long Beach was retried with the same eight', await page.evaluate(() => __pr.camp.attempts.california === 2 && __pr.camp.pies.california.slices.length === 8));
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
