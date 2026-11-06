// Loads sprite-forge output: a horizontal strip plus atlas.json. Anything without art falls
// back to its placeholder, so art can land one character at a time.
(function (root) {
  const loaded = {};

  async function loadOne(character, anim) {
    const base = `assets/sprites/${character}/${anim}`;
    const atlas = await (await fetch(`${base}/atlas.json`)).json();
    const image = new Image();
    image.src = `${base}/sheet.png`;
    await image.decode();
    const mask = atlas.seats ? new Image() : null;
    if (mask) { mask.src = `${base}/mask.png`; await mask.decode(); }
    loaded[`${character}/${anim}`] = { atlas, image, mask };
  }

  async function load() {
    let manifest;
    try {
      const res = await fetch('assets/manifest.json');
      if (!res.ok) return;
      manifest = await res.json();
    } catch { return; }
    await Promise.all(Object.entries(manifest).flatMap(([c, anims]) => anims.map(a => loadOne(c, a).catch(() => {}))));
  }

  // Painted layers are optional, and each one simply appears once its file exists.
  const layers = {};
  const CITY_LAYERS = ['platform', 'barricade', 'barrel', 'barrel-out'];
  const AREA_LAYERS = ['far', 'mid', 'near', 'ground', 'door'];
  const TOPPINGS = ['pepperoni', 'jalapeno', 'garlic', 'mushroom', 'basil', 'pineapple', 'sausage'];
  const PROPS = ['box', 'box-pile', 'box-broken', 'drain', 'sign', 'ledge', 'star', ...TOPPINGS.flatMap(t => [`pickup-${t}`, `shot-${t}`, ...['ny', 'deep', 'jumbo', 'naples'].map(s => `piece-${t}-${s}`)])];
  const SHARED = ['hq/back', 'hq/mid', 'hq/table', 'hq/front', 'hq/alewife-polaroid', ...PROPS.map(p => `props/${p}`)];

  const fetchLayers = names => Promise.all(names.map(name => new Promise(done => {
    if (layers[name]) return done();
    const image = new Image();
    image.onload = () => { layers[name] = image; done(); };
    image.onerror = done;
    image.src = `assets/backgrounds/${name}.png`;
  })));

  const loadLayers = () => fetchLayers(SHARED);

  // A city's paintings load when the city does, so a phone is not holding all of them at once.
  const cityLayers = city => [`maps/${city.id}`, ...CITY_LAYERS.map(l => `${city.id}/${l}`), ...city.areas.flatMap(a => AREA_LAYERS.map(l => `${city.id}/${a.id}/${l}`))];
  const loadedCities = new Set();
  const needsCity = city => !loadedCities.has(city.id);

  async function loadCity(city) {
    await fetchLayers(cityLayers(city));
    loadedCities.add(city.id);
  }

  const layer = name => layers[name];

  // Draws a horizontally tiling layer scrolled by cam.
  function tile(ctx, name, cam, rate, width) {
    const image = layers[name];
    if (!image) return false;
    ctx.imageSmoothingEnabled = false;
    const w = image.width, x = -((cam * rate) % w);
    for (let i = x; i < width; i += w) ctx.drawImage(image, Math.round(i), 0);
    return true;
  }

  // A wrapping street surface, drawn from the ground line down.
  function ground(ctx, name, cam, y, width) {
    const image = layers[name];
    if (!image) return false;
    ctx.imageSmoothingEnabled = false;
    const w = image.width;
    for (let i = -(cam % w); i < width; i += w) ctx.drawImage(image, Math.round(i), y);
    return true;
  }

  // Draws a painted prop with its bottom center at (x, foot). False when it has not been painted.
  function prop(ctx, name, x, foot) {
    const image = layers[name];
    if (!image) return false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round(x - image.width / 2), Math.round(foot - image.height));
    return true;
  }

  // Repeats a painted tile across a span, top-left at (x, y).
  function strip(ctx, name, x, y, w) {
    const image = layers[name];
    if (!image) return false;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < w; i += image.width) ctx.drawImage(image, 0, 0, Math.min(image.width, w - i), image.height, Math.round(x + i), y, Math.min(image.width, w - i), image.height);
    return true;
  }

  const has = (character, anim) => !!loaded[`${character}/${anim}`];

  // Puts toppings on one frame: pieces at the frame's seats, behind whatever crosses the surface.
  const frameCanvas = document.createElement('canvas'), pieceCanvas = document.createElement('canvas');
  function dressed(s, i, { piece, count }) {
    const art = layers[piece], seats = s.atlas.seats && s.atlas.seats[i];
    if (!art || !seats) return null;
    const { w, h } = s.atlas.frame;
    for (const c of [frameCanvas, pieceCanvas]) if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } else c.getContext('2d').clearRect(0, 0, w, h);
    const a = pieceCanvas.getContext('2d'), b = frameCanvas.getContext('2d');
    seats.slice(0, count).forEach(([x, y], n) => {
      a.save(); a.translate(x, y); a.scale(n % 2 ? -1 : 1, 1);
      a.drawImage(art, -Math.round(art.width / 2), -Math.round(art.height / 2));
      a.restore();
    });
    a.globalCompositeOperation = 'destination-in';
    a.drawImage(s.mask, i * w, 0, w, h, 0, 0, w, h);
    a.globalCompositeOperation = 'source-over';
    b.drawImage(s.image, i * w, 0, w, h, 0, 0, w, h);
    b.drawImage(pieceCanvas, 0, 0);
    return frameCanvas;
  }

  // Standing still holds one pose, with a slow breath and, where the art has one, a blink.
  const BLINK_EVERY = 4300, BLINK_MS = 130;
  function calm(s, ms) { return s.atlas.blink != null && ms % BLINK_EVERY > BLINK_EVERY - BLINK_MS ? s.atlas.blink : 0; }

  // Draws feet-down at (x, foot). Returns false when there is no art, so the caller draws its own.
  // wide and tilt give a pizza its jelly, and flop bends the top of the frame like a floppy slice.
  function draw(ctx, character, anim, ms, x, foot, height, facing = 1, squash = 1, { wide = 1, tilt = 0, flop = 0, dress = null } = {}) {
    const s = loaded[`${character}/${anim}`];
    if (!s) return false;
    const { w, h } = s.atlas.frame, count = s.atlas.count;
    const idle = anim === 'idle';
    let i = Math.floor(ms / s.atlas.frame_ms);
    i = idle ? calm(s, ms) : s.atlas.loop ? i % count : Math.min(i, count - 1);
    const scale = height / h, source = (dress && dress.count > 0 && dressed(s, i, dress)) || s.image, sx = source === s.image ? i * w : 0;
    if (idle) squash *= 1 + Math.sin(ms / 800) * 0.012;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, foot);
    ctx.rotate(tilt * facing);
    ctx.scale(facing * wide, squash);
    if (!flop) ctx.drawImage(source, sx, 0, w, h, -w * scale / 2, -h * scale, w * scale, h * scale);
    else {
      const band = 6;
      for (let y = 0; y < h; y += band) {
        const up = 1 - y / h, shift = Math.round(flop * up * up * up) * 2;
        ctx.drawImage(source, sx, y, w, band, -w * scale / 2 + shift, -h * scale + y * scale, w * scale, band * scale + 0.5);
      }
    }
    ctx.restore();
    return true;
  }

  root.PR_SPRITES = { load, loadLayers, loadCity, needsCity, layer, tile, ground, prop, strip, has, draw };
})(window);
