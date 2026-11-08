// Headless render of the served page through caddy: node shot.js CHROME_PATH  (NODE_PATH must reach playwright)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.argv[2] });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 }, extraHTTPHeaders: { 'Cf-Access-Jwt-Assertion': 'x' } });
  const errs = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://172.20.0.2:8080/analysis/pizza-runner-soft-pizzas/', { waitUntil: 'load' });
  const broken = await p.evaluate(() => [...document.images].filter(i => i.naturalWidth === 0).length);
  console.log('broken images', broken, 'errors', JSON.stringify(errs));
  await p.screenshot({ path: '/tmp/soft-pizzas/shot.png', clip: { x: 0, y: 0, width: 1500, height: 1500 }, fullPage: true });
  await b.close();
})();
