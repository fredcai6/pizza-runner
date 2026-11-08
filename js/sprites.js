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
    loaded[`${character}/${anim}`] = { atlas, image, mask, pad: footPad(image, atlas), rims: character.startsWith('slice-') ? rims(image, atlas) : null };
  }

  // Transparent rows under the lowest foot in a strip, taken over every frame. Art is painted with a margin
  // under its feet, and a run cycle can float higher than an idle, so drawing sinks each animation by this much
  // and the lowest foot always lands on the ground line.
  function footPad(image, { frame: { w, h }, count }) {
    const c = document.createElement('canvas');
    c.width = image.width; c.height = image.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    const data = g.getImageData(0, 0, c.width, c.height).data;
    let pad = h;
    for (let i = 0; i < count; i++) {
      let y = h - 1;
      for (; y >= 0; y--) { let hit = false; for (let x = 0; x < w && !hit; x++) hit = data[(y * c.width + i * w + x) * 4 + 3] > 128; if (hit) break; }
      pad = Math.min(pad, h - 1 - y);
    }
    return pad === h ? 0 : pad;
  }

  // Where bites come out of a slice, frame by frame: the corners and sides of the crust end,
  // found from the drawing itself so they follow it as it runs. Each is [x, y, side].
  const BITE = 0.15;
  function rims(image, { frame: { w, h }, count }) {
    const c = document.createElement('canvas');
    c.width = image.width; c.height = image.height;
    const g = c.getContext('2d');
    g.drawImage(image, 0, 0);
    const alpha = g.getImageData(0, 0, c.width, c.height).data, solid = (x, y) => alpha[(y * c.width + x) * 4 + 3] > 128;
    const out = [];
    for (let i = 0; i < count; i++) {
      let top = h;
      for (let y = 0; y < h && top === h; y++) for (let x = 0; x < w; x++) if (solid(i * w + x, y)) { top = y; break; }
      const span = y => {
        let l = -1, r = -1;
        for (let x = 0; x < w; x++) if (solid(i * w + x, y)) { if (l < 0) l = x; r = x; }
        return [l, r];
      };
      const r = Math.round(h * BITE), at = f => Math.min(h - 1, top + Math.round(h * f));
      const [, r1] = span(at(0.2)), [l0] = span(at(0.06)), [l2] = span(at(0.3)), [l3, r3] = span(top);
      out.push([
        [r1 + r * 0.1, at(0.2), 'side'],
        [l0 - r * 0.1, at(0.06), 'side'],
        [l3 + (r3 - l3) * 0.55, top - r * 0.15, 'top'],
        [l2 - r * 0.1, at(0.3), 'side'],
      ]);
    }
    return out;
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


  // A pizza character as a sticker: one idle frame, dressed in its topping, cropped to the drawing. The
  // size comes from the atlas, so redrawn art drops in. grey is a spent slice: drained of colour and faded.
  const portraits = {}, portraitUrls = {};
  function portrait(style, topping, { grey = false, count = 3 } = {}) {
    const key = `${style}|${topping || ''}|${topping ? count : 0}|${grey}`;
    if (portraits[key]) return portraits[key];
    const s = loaded[`slice-${style}/idle`];
    if (!s) return null;
    const { w, h } = s.atlas.frame;
    const worn = topping && dressed(s, 0, { piece: `props/piece-${topping}-${style}`, count });
    const full = document.createElement('canvas');
    full.width = w; full.height = h;
    const g = full.getContext('2d', { willReadFrequently: true });
    if (worn) g.drawImage(worn, 0, 0); else g.drawImage(s.image, 0, 0, w, h, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h), d = px.data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    if (grey) for (let i = 0; i < d.length; i += 4) { const v = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; d[i] = d[i + 1] = d[i + 2] = 120 + v * 0.35; d[i + 3] *= 0.5; }
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    const o = out.getContext('2d');
    if (grey) { g.putImageData(px, 0, 0); o.drawImage(full, x0, y0, out.width, out.height, 0, 0, out.width, out.height); }
    else o.drawImage(full, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return (portraits[key] = out);
  }
  const portraitUrl = (style, topping, opts) => {
    const key = `${style}|${topping || ''}|${JSON.stringify(opts || {})}`;
    if (!portraitUrls[key]) { const c = portrait(style, topping, opts); portraitUrls[key] = c ? c.toDataURL() : ''; }
    return portraitUrls[key];
  };

  // Draws a portrait contained in a box, bottom centre at (x, bottom). False when there is no art.
  function stamp(ctx, style, topping, x, bottom, boxW, boxH, opts) {
    const c = portrait(style, topping, opts);
    if (!c) return false;
    const k = Math.min(boxW / c.width, boxH / c.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, Math.round(x - c.width * k / 2), Math.round(bottom - c.height * k), Math.round(c.width * k), Math.round(c.height * k));
    return true;
  }

  const size = (character, anim = 'idle') => { const s = loaded[`${character}/${anim}`]; return s ? s.atlas.frame : null; };

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

  // Takes the bites out of one frame: a round chunk with tooth marks, the drawing's outline around it.
  const biteCanvas = document.createElement('canvas');
  function bitten(s, i, source, sx, n) {
    const { w, h } = s.atlas.frame, spots = s.rims[i];
    if (biteCanvas.width !== w || biteCanvas.height !== h) { biteCanvas.width = w; biteCanvas.height = h; }
    const g = biteCanvas.getContext('2d');
    g.clearRect(0, 0, w, h);
    g.drawImage(source, sx, 0, w, h, 0, 0, w, h);
    const r = Math.round(h * BITE), disc = (x, y, radius, paint) => {
      for (let dy = -radius; dy <= radius; dy++) {
        const half = Math.floor(Math.sqrt(radius * radius - dy * dy));
        paint(Math.round(x) - half, Math.round(y) + dy, half * 2 + 1, 1);
      }
    };
    spots.slice(0, n).forEach(([x, y, side]) => {
      const teeth = side === 'top' ? [[0, 0, r], [-r * 0.8, r * 0.15, r * 0.55], [r * 0.8, r * 0.15, r * 0.55]] : [[0, 0, r], [r * 0.15, -r * 0.8, r * 0.55], [r * 0.15, r * 0.8, r * 0.55]];
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#2a1810';
      for (const [dx, dy, k] of teeth) disc(x + dx, y + dy, Math.round(k) + 2, (a, b, c, d) => g.fillRect(a, b, c, d));
      g.globalCompositeOperation = 'source-over';
      for (const [dx, dy, k] of teeth) disc(x + dx, y + dy, Math.round(k), (a, b, c, d) => g.clearRect(a, b, c, d));
    });
    return biteCanvas;
  }

  // Standing still holds one pose, with a slow breath and, where the art has one, a blink.
  const BLINK_EVERY = 4300, BLINK_MS = 130;
  function calm(s, ms) { return s.atlas.blink != null && ms % BLINK_EVERY > BLINK_EVERY - BLINK_MS ? s.atlas.blink : 0; }

  // Draws feet-down at (x, foot). Returns false when there is no art, so the caller draws its own.
  // wide and tilt give a pizza its jelly, and flop bends the top of the frame like a floppy slice.
  function draw(ctx, character, anim, ms, x, foot, height, facing = 1, squash = 1, { wide = 1, tilt = 0, flop = 0, dress = null, bites = 0, sink = 0 } = {}) {
    const s = loaded[`${character}/${anim}`];
    if (!s) return false;
    const { w, h } = s.atlas.frame, count = s.atlas.count;
    const idle = anim === 'idle';
    let i = Math.floor(ms / s.atlas.frame_ms);
    i = idle ? calm(s, ms) : s.atlas.loop ? i % count : Math.min(i, count - 1);
    let source = (dress && dress.count > 0 && dressed(s, i, dress)) || s.image, sx = source === s.image ? i * w : 0;
    if (bites > 0 && s.rims) { source = bitten(s, i, source, sx, bites); sx = 0; }
    const scale = height / h;
    if (idle) squash *= 1 + Math.sin(ms / 800) * 0.012;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, foot + sink + s.pad * scale);
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

  root.PR_SPRITES = { load, loadLayers, loadCity, needsCity, layer, tile, ground, prop, strip, has, draw, portrait, portraitUrl, stamp, size };
})(window);
