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
    loaded[`${character}/${anim}`] = { atlas, image };
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
  const CITY_LAYERS = ['far', 'mid', 'near', 'platform', 'barricade', 'barrel', 'barrel-out', 'door'];
  const LAYERS = ['hq/back', 'hq/mid', 'hq/table', 'hq/front', 'hq/box', ...['newyork', 'chicago', 'dc', 'naples', 'california'].flatMap(c => CITY_LAYERS.map(l => `${c}/${l}`))];

  function loadLayers() {
    return Promise.all(LAYERS.map(name => new Promise(done => {
      const image = new Image();
      image.onload = () => { layers[name] = image; done(); };
      image.onerror = done;
      image.src = `assets/backgrounds/${name}.png`;
    })));
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

  // Draws feet-down at (x, foot). Returns false when there is no art, so the caller draws its own.
  function draw(ctx, character, anim, ms, x, foot, height, facing = 1, squash = 1) {
    const s = loaded[`${character}/${anim}`];
    if (!s) return false;
    const { w, h } = s.atlas.frame, count = s.atlas.count;
    let i = Math.floor(ms / s.atlas.frame_ms);
    i = s.atlas.loop ? i % count : Math.min(i, count - 1);
    const scale = height / h;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, foot);
    ctx.scale(facing, squash);
    ctx.drawImage(s.image, i * w, 0, w, h, -w * scale / 2, -h * scale, w * scale, h * scale);
    ctx.restore();
    return true;
  }

  root.PR_SPRITES = { load, loadLayers, layer, tile, prop, strip, has, draw };
})(window);
