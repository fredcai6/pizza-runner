// The back room. One drawing of it, reflecting the campaign, with a camera that cuts and pans.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES, P = root.PR_PLAY, S = root.PR_SPRITES;
  const W = P.W, H = P.H, dot = P.dot;

  // Camera targets in room coordinates: [centre x, centre y, scale]. Scales are whole numbers so
  // pixels stay square (art/characters/STYLE.md). A shot whose scale changes steps to the new one
  // `at` of the way through (a punch-in) while the centre keeps gliding. The camera centre is clamped
  // so the frame never leaves the room. Shots park the speaker on one side so the dialogue box has the other.
  const CAMERAS = {
    wide: { from: [640, 360, 1], to: [640, 360, 1] },
    board: { from: [900, 250, 2], to: [960, 270, 2] },
    oldtimer: { from: [400, 410, 2], to: [400, 390, 2] },
    pies: { from: [560, 410, 2], to: [720, 410, 2] },
    polaroid: { from: [1090, 262, 2], to: [1090, 252, 2] },
    boardTeen: { from: [1000, 180, 3], to: [1040, 175, 3] },
    boardTurtle: { from: [1110, 175, 3], to: [1150, 175, 3] },
    ny: { from: [500, 410, 2], to: [500, 400, 2] },
    deep: { from: [780, 410, 2], to: [780, 400, 2] },
    jumbo: { from: [960, 370, 2], to: [960, 360, 2] },
    naples: { from: [900, 413, 1], to: [1060, 413, 3], at: 0.1, ms: 4000 },
  };
  const STAGE_CENTER = [W / 2, H / 2];
  // The same shots on Tommy's painted board room (paintedBoard below), which has its own 1280x720 space.
  const BOARD_CAMERAS = {
    // A gentle push held to the left edge, so Dayold stays whole while he talks and the banner stays in.
    board: { from: [640, 360, 1], to: [593, 345, 1.08], ms: 9000 },
    boardTeen: { from: [455, 215, 2.4], to: [460, 205, 2.6] },
    boardTurtle: { from: [470, 380, 2.4], to: [475, 370, 2.6] },
    polaroid: { from: [930, 280, 1.6], to: [930, 270, 1.75] },
    boardDayold: { from: [250, 390, 1.7], to: [260, 375, 1.85] },
  };
  const cameraOf = comp => (paintedReady() && BOARD_CAMERAS[comp]) || CAMERAS[comp] || CAMERAS.wide;

  // Painted cutscene pictures (assets/cutscenes/NAME.webp). A shot with `pic` shows one instead of the room and pans across it:
  // pan = [[x, y, zoom], [x, y, zoom]], x and y the frame's centre as fractions of the picture, zoom 1 = the picture just covers
  // the frame. `ms` is how long the pan takes; it eases, then holds. `card: 'right'` puts a name card on the right.
  const PICS = {};
  function still(src) {
    if (!PICS[src]) { PICS[src] = new Image(); PICS[src].src = src; }
    return PICS[src];
  }
  const pic = name => still(`assets/cutscenes/${name}.webp`);
  function painting(ctx, shot, t) {
    const img = pic(shot.pic);
    if (!img.complete || !img.naturalWidth) return;
    const [a, b] = shot.pan || [[0.5, 0.5, 1], [0.5, 0.5, 1]], e = t * t * (3 - 2 * t);
    const at = i => a[i] + (b[i] - a[i]) * e, iw = img.naturalWidth, ih = img.naturalHeight;
    const k = Math.max(W / iw, H / ih) * Math.max(1, at(2)), vw = W / k, vh = H / k;
    const cx = Math.max(vw / 2, Math.min(iw - vw / 2, at(0) * iw)), cy = Math.max(vh / 2, Math.min(ih - vh / 2, at(1) * ih));
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // `lift` raises the painting by that share of the screen, so faces stay above the dialogue box. The strip it
    // uncovers along the bottom is the painting's own last rows, stretched, and sits under the box.
    const lift = (shot.lift || 0) * H;
    if (lift) {
      ctx.translate(0, -lift);
      ctx.drawImage(img, cx - vw / 2, cy + vh / 2 - 2 / k, vw, 2 / k, 0, H - 1, W, lift + 2);
    }
    ctx.drawImage(img, cx - vw / 2, cy - vh / 2, vw, vh, 0, 0, W, H);
    ctx.restore();
  }

  // Where the camera is, in room units, a fraction t through a shot.
  function camAt(shot, t) {
    const cam = cameraOf(shot.comp), e = t * t * (3 - 2 * t);
    const z = t < (cam.at == null ? 0.5 : cam.at) ? cam.from[2] : cam.to[2];
    const lerp = i => cam.from[i] + (cam.to[i] - cam.from[i]) * e;
    return { z, x: Math.round(Math.max(W / 2 / z, Math.min(W - W / 2 / z, lerp(0)))), y: Math.round(Math.max(H / 2 / z, Math.min(H - H / 2 / z, lerp(1)))) };
  }

  // Who stands where in room coordinates, so the dialogue box can keep clear of the speaker.
  function standing(who, view) {
    if (who === 'old') return { x: 300, foot: 470, h: 130 };
    const i = view.hq.pizzas.findIndex(z => z.style === who);
    return i < 0 ? null : { x: 470 + i * 196, foot: 480, h: C.STYLES[who].height };
  }

  // The speaker's box on the stage over the whole shot, or null when they are out of frame or in a painted scene.
  function speakerBox(shot, who, view) {
    if (shot.pic) return null;
    if (shot.comp === 'door') {
      const final = view.city.final && view.area === view.city.areas[view.city.areas.length - 1];
      const sty = view.slice && view.slice.style ? view.slice.style : (view.city.style || 'ny');
      const at = who === 'customer' || who === 'alewife' ? { x: 760, foot: 520, h: final ? 340 : 300 } : { x: 380, foot: 520, h: C.STYLES[sty].height };
      return pad(at, 1, 640, 360, 1);
    }
    if (OVER_TABLE.has(shot.comp) && paintedReady()) return null;
    const at = OVER_TABLE.has(shot.comp) && who !== 'old' ? null : standing(who, view);
    if (!at) return null;
    const a = camAt(shot, 0), b = camAt(shot, 1), r1 = pad(at, a.z, a.x, a.y, a.z), r2 = pad(at, b.z, b.x, b.y, b.z);
    return [Math.min(r1[0], r2[0]), Math.min(r1[1], r2[1]), Math.max(r1[2], r2[2]), Math.max(r1[3], r2[3])];
  }
  function pad(at, z, cx, cy) {
    const sx = STAGE_CENTER[0] + (at.x - cx) * z, foot = STAGE_CENTER[1] + (at.foot - cy) * z, h = at.h * z;
    return [sx - h * 0.45, foot - h, sx + h * 0.45, foot];
  }

  // Seats the box on whichever part of the stage the speaker is not in: centred, else right, else left.
  function dock(canvas, dialog, box) {
    const r = canvas.getBoundingClientRect(), k = r.width / W, gap = 10 * k;
    dialog.style.setProperty('--fs', Math.max(15, 24 * k) + 'px');
    dialog.style.bottom = (innerHeight - r.bottom + 14 * k) + 'px';
    let best = null;
    for (const side of ['center', 'right', 'left']) {
      const w = r.width * (side === 'center' ? 0.625 : 0.44), margin = r.width * 0.02;
      dialog.style.width = w + 'px';
      dialog.style.left = (r.left + (side === 'center' ? (r.width - w) / 2 : side === 'right' ? r.width - w - margin : margin)) + 'px';
      const d = dialog.getBoundingClientRect(), ox = box ? Math.min(d.right, r.left + box[2] * k + gap) - Math.max(d.left, r.left + box[0] * k - gap) : -1;
      const oy = box ? Math.min(d.bottom, r.top + box[3] * k + gap) - Math.max(d.top, r.top + box[1] * k - gap) : -1;
      const hit = ox > 0 && oy > 0 ? ox * oy : 0;
      if (!best || hit < best.hit) best = { side, hit, w, left: dialog.style.left };
      if (!hit) break;
    }
    dialog.style.width = best.w + 'px'; dialog.style.left = best.left; dialog.dataset.side = best.side;
  }

  // These shots lean over the table, so the recruits are out of the picture.
  const OVER_TABLE = new Set(['board', 'polaroid', 'boardTeen', 'boardTurtle', 'boardDayold']);
  let spots = { ny: [], deep: [], jumbo: [], naples: [] };
  fetch('assets/backgrounds/hq/recruit-spots.json').then(r => (r.ok ? r.json() : null)).then(j => { if (j) spots = j; }).catch(() => {});

  // The recruits stand on the table: plain and cold at first, then wearing their topping
  // once they have been out. The row of little portraits beneath shows the slices still left.
  function recruit(ctx, x, foot, z, ms) {
    const plain = `recruit-${z.style}`, st = C.STYLES[z.style];
    if (!S.draw(ctx, plain, 'idle', ms, x, foot, st.height)) S.draw(ctx, `slice-${z.style}`, 'idle', ms, x, foot, st.height) || P.drawSlice(ctx, x, foot - 50, z.style, null, '#d9d0ae', 2);
    const art = z.topping && S.layer(P.pieceArt(z.topping, z.style));
    if (art) {
      ctx.imageSmoothingEnabled = false;
      for (const [dx, dy] of spots[z.style]) ctx.drawImage(art, Math.round(x + dx - art.width / 2), Math.round(foot + dy - art.height / 2));
    }
    for (let i = 0; i < R.SLICES; i++) S.stamp(ctx, z.style, z.topping, x - 42 + i * 17, foot + 28, 16, 19, { grey: i >= z.left });
  }

  // Dossier photos on the cork, as fractions of the board, each a little off true: [type, fx, fy, tilt in degrees, dx, dy].
  const DOSSIERS = [['teen', 0.555, 0.055, -3.5, 2, 0], ['turtle', 0.775, 0.085, 2.5, 0, 3], ['ninja', 0.575, 0.47, 3, -3, 0], ['mutant', 0.785, 0.5, -2.5, 0, -2]];

  // The same scatter every frame: a small seeded generator.
  const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // A pin: shadow, red head, glint.
  function pin(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; dot(ctx, x + r * 0.45, y + r * 0.55, r);
    ctx.fillStyle = '#b3201c'; dot(ctx, x, y, r);
    ctx.fillStyle = '#ff8a73'; dot(ctx, x - r * 0.3, y - r * 0.3, r * 0.35);
  }

  // A strip of tape across a corner.
  function tape(ctx, x, y, w, h, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180);
    ctx.fillStyle = 'rgba(236,222,150,.78)'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.3);
    ctx.restore();
  }

  function dossier(ctx, type, x, y, w, h, tilt) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tilt * Math.PI / 180); ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(3, 4, w, h);
    ctx.fillStyle = '#f7f4ea'; ctx.fillRect(0, 0, w, h);
    const ix = w * 0.07, iy = h * 0.06, iw = w * 0.86, ih = h * 0.74;
    ctx.fillStyle = '#6d5a4c'; ctx.fillRect(ix, iy, iw, ih);
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    S.draw(ctx, type, 'idle', 0, ix + iw / 2, iy + ih * 1.02, ih * 0.98);
    ctx.restore();
    pin(ctx, w / 2, 3, Math.max(2.5, w * 0.045));
    ctx.restore();
  }

  // A curled receipt scrap: cream, torn along the bottom, with a few printed lines.
  function scrap(ctx, x, y, w, h, rot, n) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot * Math.PI / 180); ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(2, 3, w, h);
    ctx.fillStyle = '#f1e6c8'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h);
    const teeth = 6; for (let i = teeth; i >= 0; i--) ctx.lineTo(w * i / teeth, h + (i % 2 ? 0 : 3));
    ctx.closePath(); ctx.fill();
    const edge = ctx.createLinearGradient(0, 0, w, 0); edge.addColorStop(0, 'rgba(90,60,20,.25)'); edge.addColorStop(0.15, 'rgba(90,60,20,0)'); edge.addColorStop(0.85, 'rgba(90,60,20,0)'); edge.addColorStop(1, 'rgba(90,60,20,.25)');
    ctx.fillStyle = edge; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(60,45,25,.55)';
    // Every ticket prints its header: ORDER.
    ctx.font = `bold ${Math.max(6, w * 0.2)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ORDER', w / 2, h * 0.16, w * 0.8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    for (let i = 1; i < 4; i++) ctx.fillRect(w * 0.14, h * (0.16 + i * 0.19), w * (0.72 - ((n + i) % 3) * 0.15), Math.max(1, h * 0.05));
    if (n % 3 === 0) { ctx.fillStyle = 'rgba(168,52,28,.22)'; dot(ctx, w * 0.7, h * 0.7, w * 0.16); }
    pin(ctx, w / 2, 2, 2.4);
    ctx.restore();
  }

  function sticky(ctx, x, y, w, h, rot, tone) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot * Math.PI / 180); ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(2, 3, w, h);
    ctx.fillStyle = tone ? '#ffd98a' : '#ffe66b'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(160,110,20,.18)'; ctx.fillRect(0, h * 0.82, w, h * 0.18);
    ctx.fillStyle = 'rgba(80,50,10,.5)'; for (let i = 0; i < 3; i++) ctx.fillRect(w * 0.14, h * (0.2 + i * 0.2), w * (0.7 - i * 0.12), Math.max(1, h * 0.05));
    tape(ctx, w / 2, 0, w * 0.45, h * 0.16, tone ? 4 : -3);
    ctx.restore();
  }

  // Yarn from pin to pin with the sag of a real string.
  function yarn(ctx, a, b, w) {
    const sag = 10 + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.16, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = w + 1; ctx.beginPath(); ctx.moveTo(a[0] + 1, a[1] + 2); ctx.quadraticCurveTo(mx + 1, my + 2, b[0] + 1, b[1] + 2); ctx.stroke();
    ctx.strokeStyle = '#c41e1e'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mx, my, b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,150,130,.55)'; ctx.lineWidth = Math.max(0.4, w * 0.3); ctx.beginPath(); ctx.moveTo(a[0], a[1] - 0.5); ctx.quadraticCurveTo(mx, my - 0.5, b[0], b[1] - 0.5); ctx.stroke();
  }

  // The board is live evidence on the painted cork: receipts, his notes, the dossiers, strung together with yarn.
  function board(ctx, x, y, w, h, hq) {
    if (!S.layer('hq/back')) {
      ctx.fillStyle = '#4a3020'; ctx.fillRect(x - w * 0.03, y - h * 0.04, w * 1.06, h * 1.08);
      ctx.fillStyle = '#b98d5e'; ctx.fillRect(x, y, w, h);
    }
    const rnd = seeded(97), pins = [];
    // Receipts overlap in a loose drift down the left of the cork. Three are his from the
    // tapped dispatch line, there from the start; the player's add to them.
    const n = Math.min(hq.receipts + 3, 18);
    for (let i = 0; i < n; i++) {
      const col = i % 6, row = Math.floor(i / 6), rw = w * 0.07, rh = h * 0.17;
      const rx = x + w * (0.03 + col * 0.072) + (rnd() - 0.5) * w * 0.03, ry = y + h * (0.05 + row * 0.2) + (rnd() - 0.5) * h * 0.05, rot = (rnd() - 0.5) * 16;
      scrap(ctx, rx, ry, rw, rh, rot, i);
      if (i % 4 === 1) pins.push([rx + rw / 2, ry + 3]);
    }
    const notes = [];
    for (let i = 0; i < hq.notes; i++) {
      const nx = x + w * (0.05 + i * 0.066) + (rnd() - 0.5) * w * 0.02, ny = y + h * (0.7 + (i % 2) * 0.05 + (rnd() - 0.5) * 0.05), nr = (rnd() - 0.5) * 14;
      sticky(ctx, nx, ny, w * 0.07, h * 0.17, nr, i % 2);
      notes.push([nx + w * 0.035, ny + 2]);
    }
    const posts = [];
    for (const [type, fx, fy, tilt, dx, dy] of DOSSIERS) { const px = x + w * fx + dx, py = y + h * fy + dy, pw = w * 0.19; dossier(ctx, type, px, py, pw, h * 0.38, tilt); posts.push([px + pw / 2, py + 3]); }
    // Yarn: note to note along the bottom, then up to the dossiers, with sag.
    const draw = chain => { for (let i = 1; i < chain.length; i++) yarn(ctx, chain[i - 1], chain[i], Math.max(0.8, w * 0.006)); };
    if (hq.notes > 1) draw([...notes, posts[2], posts[3]]);
    draw([...pins.slice(0, 3), posts[0], posts[1]]);
    for (const k of [...notes, ...pins]) pin(ctx, k[0], k[1], 2.4);
    if (!hq.alewife) return;
    const px = x + w * 0.56, py = y + h * 0.08, pw = w * 0.38, ph = h * 0.62;
    ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); ctx.rotate(-1.5 * Math.PI / 180); ctx.translate(-pw / 2, -ph / 2);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(4, 5, pw, ph);
    ctx.fillStyle = '#f7f4ea'; ctx.fillRect(0, 0, pw, ph);
    const ix = pw * 0.06, iy = ph * 0.05, iw = pw * 0.88, ih = ph * 0.74;
    ctx.fillStyle = '#2a2230'; ctx.fillRect(ix, iy, iw, ih);
    const photo = S.layer('hq/alewife-polaroid');
    if (photo) { ctx.imageSmoothingEnabled = false; ctx.drawImage(photo, ix, iy, iw, ih); }
    else S.draw(ctx, 'alewife', 'idle', 0, ix + iw / 2, iy + ih, ih * 0.92) || placeholderAlewife(ctx, ix + iw / 2, iy + ih, ih * 0.9);
    pin(ctx, pw / 2, 4, 5);
    tape(ctx, pw * 0.1, 3, pw * 0.2, 12, -35);
    ctx.restore();
  }

  // Tommy's board room (art/cutscenes/board): the painted room, the live evidence pinned on its cork, Dayold at his chair, and the
  // recruits from behind, cut from the same painting, drawn last so he sits behind them. Room space is 1280x720.
  const BOARD_ART = ['room', 'room-front', 'dayold', 'dayold-pointer', 'dayold-think', 'dayold-salute', 'dayold-slam', 'polaroid-teen', 'polaroid-turtle', 'polaroid-ninja', 'polaroid-mutant', 'order-1', 'order-2'];
  const paintedReady = () => BOARD_ART.every(n => { const i = pic(`board/${n}`); return i.complete && i.naturalWidth; });
  // Suspects: [type, centre x, centre y, width, tilt]. Teens and turtles are his from the start; ninjas and mutants go up after the
  // level that reveals them (once met: headquarters().known).
  const SUSPECTS = [['teen', 445, 205, 196, -4], ['turtle', 455, 372, 196, 3], ['ninja', 668, 200, 214, 3], ['mutant', 672, 365, 214, -3]];
  // A cut-out pinned on the cork. Returns where its pin goes.
  function stuck(ctx, img, cx, cy, w, tilt) {
    const h = w * img.naturalHeight / img.naturalWidth, r = tilt * Math.PI / 180;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(r);
    ctx.shadowColor = 'rgba(20,8,0,.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 4;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return [cx + Math.sin(r) * h * 0.42, cy - Math.cos(r) * h * 0.42];
  }
  function paintedBoard(ctx, hq, ms, view, shot) {
    const art = n => pic(`board/${n}`);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(art('room'), 0, 0, W, H);
    const rnd = seeded(97), pins = [], posts = {};
    // Receipts drift across the right of the cork: three from his tapped line, then the player's.
    const n = Math.min(hq.receipts + 3, 18);
    for (let i = 0; i < n; i++) {
      const col = i % 6, row = Math.floor(i / 6);
      const at = stuck(ctx, art(`order-${1 + (i % 2)}`), 832 + col * 70 + (rnd() - 0.5) * 22, 168 + row * 92 + (rnd() - 0.5) * 18, 88, (rnd() - 0.5) * 16);
      if (i % 3 === 0) pins.push(at);
    }
    for (const [type, cx, cy, w, tilt] of SUSPECTS) {
      if (!(hq.known || ['teen', 'turtle']).includes(type)) continue;
      posts[type] = stuck(ctx, art(`polaroid-${type}`), cx, cy, w, tilt);
    }
    // His notes along the foot of the cork. The first one (WHO IS THE ORDER?) is painted on.
    const notes = [];
    for (let i = 1; i < hq.notes; i++) {
      const nx = 610 + (i - 1) * 74 + (rnd() - 0.5) * 10, ny = 418 + (rnd() - 0.5) * 12;
      sticky(ctx, nx, ny, 52, 46, (rnd() - 0.5) * 14, i % 2);
      notes.push([nx + 26, ny + 2]);
    }
    const string = chain => { for (let i = 1; i < chain.length; i++) yarn(ctx, chain[i - 1], chain[i], 2.2); };
    string([...pins.slice(0, 3).reverse(), posts.turtle, posts.teen]);
    if (notes.length > 1) string([...notes, posts.mutant || posts.turtle, posts.ninja || posts.teen]);
    for (const k of [...notes, ...pins, ...Object.values(posts)]) pin(ctx, k[0], k[1], 4);
    if (hq.alewife) {
      const pw = 380, ph = 300, photo = S.layer('hq/alewife-polaroid'), ix = pw * 0.06, iy = ph * 0.05, iw = pw * 0.88, ih = ph * 0.74;
      ctx.save(); ctx.translate(930, 280); ctx.rotate(-1.5 * Math.PI / 180); ctx.translate(-pw / 2, -ph / 2);
      ctx.fillStyle = 'rgba(20,8,0,.4)'; ctx.fillRect(5, 7, pw, ph);
      ctx.fillStyle = '#f7f4ea'; ctx.fillRect(0, 0, pw, ph);
      ctx.fillStyle = '#2a2230'; ctx.fillRect(ix, iy, iw, ih);
      if (photo) ctx.drawImage(photo, ix, iy, iw, ih);
      pin(ctx, pw / 2, 6, 6); tape(ctx, pw * 0.1, 3, pw * 0.2, 14, -35);
      ctx.restore();
    }
    // Dayold at his chair, rocking a little while he talks. `sticker` picks the pose: pointing (scene 1), pointer (the intel),
    // think (stroking the mustache), slam (fist on the desk), salute (a lost city).
    const d = art(shot.sticker ? `dayold-${shot.sticker}` : 'dayold'), dw = 340, dh = dw * d.naturalHeight / d.naturalWidth;
    const bob = view.mood === 'talk' ? Math.sin(ms / 110) * 3 : Math.sin(ms / 900) * 1.5;
    ctx.drawImage(d, -6, 538 - dh + bob, dw, dh);
    ctx.drawImage(art('room-front'), 0, 0, W, H);
    ctx.restore();
  }

  function placeholderAlewife(ctx, x, foot, h) {
    ctx.fillStyle = '#d9a37c'; dot(ctx, x, foot - h * 0.66, h * 0.2);
    ctx.fillStyle = '#3e2c55'; ctx.fillRect(x - h * 0.24, foot - h * 0.46, h * 0.48, h * 0.46);
    ctx.strokeStyle = '#111'; ctx.lineWidth = h * 0.05; ctx.beginPath(); ctx.arc(x, foot - h * 0.68, h * 0.25, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#111'; dot(ctx, x - h * 0.25, foot - h * 0.66, h * 0.07); dot(ctx, x + h * 0.25, foot - h * 0.66, h * 0.07);
  }

  function oldTimer(ctx, x, y, ms, mood) {
    const anim = S.has('old-timer', mood) ? mood : 'idle';
    if (S.draw(ctx, 'old-timer', anim, ms, x, y + 60, 130)) return;
    const breath = Math.sin(ms / 700) * 1.5, talk = mood === 'talk' ? Math.abs(Math.sin(ms / 90)) * 3 : 0;
    P.drawSlice(ctx, x, y - breath - talk, 'ny', null, '#b7a06e', 2.5);
    y -= breath + talk;
    ctx.strokeStyle = '#3a2413'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 24, y - 42); ctx.lineTo(x - 6, y - 36); ctx.moveTo(x + 28, y - 42); ctx.lineTo(x + 10, y - 36); ctx.stroke();
  }

  // Everyone but the recruit in focus drops into the dark.
  function spotlight(ctx, x, y, size) {
    const inner = size * 0.55 + 20, glow = ctx.createRadialGradient(x, y, inner, x, y, inner + 70);
    glow.addColorStop(0, 'rgba(8,6,20,0)'); glow.addColorStop(1, 'rgba(8,6,20,0.72)');
    ctx.fillStyle = glow; ctx.fillRect(-100, -100, W + 200, H + 200);
  }

  // Layers shift against the camera at different rates, so the room has real depth.
  function layer(ctx, name, camX, rate) {
    const image = S.layer(name);
    if (!image) return false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round((camX - W / 2) * rate), 0);
    return true;
  }

  function room(ctx, hq, ms, view) {
    const camX = view.camX, flicker = 0.08 + 0.025 * Math.sin(ms / 130) + (Math.sin(ms / 1700) > 0.97 ? -0.05 : 0);
    if (!layer(ctx, 'hq/back', camX, 0.12)) {
      ctx.fillStyle = '#3b2a22'; ctx.fillRect(-60, -60, W + 120, H + 120);
      ctx.fillStyle = '#4c382c'; for (let i = 0; i < 8; i++) ctx.fillRect(i * 190 + 10 + (camX - W / 2) * 0.1, 0, 170, 460);
    }
    layer(ctx, 'hq/mid', camX, 0.05);
    ctx.fillStyle = `rgba(255,220,150,${flicker})`; ctx.beginPath(); ctx.moveTo(640, 34); ctx.lineTo(90, 720); ctx.lineTo(1190, 720); ctx.fill();
    if (!S.layer('hq/back')) { ctx.fillStyle = '#ffdc96'; dot(ctx, 640, 34, 26); }
    const rect = C.HQ_BOARD;
    board(ctx, rect.x, rect.y, rect.w, rect.h, hq);
    if (!layer(ctx, 'hq/table', camX, 0)) {
      ctx.fillStyle = '#5e4128'; ctx.fillRect(100, 470, 1080, 34);
      ctx.fillStyle = '#3e2a19'; ctx.fillRect(140, 504, 34, 216); ctx.fillRect(1106, 504, 34, 216);
    }
    if (!OVER_TABLE.has(view.comp)) hq.pizzas.forEach((z, i) => recruit(ctx, 470 + i * 196, 480, z, ms + i * 400));
    oldTimer(ctx, 300, 410, ms, view.mood);
    layer(ctx, 'hq/front', camX, -0.18);
    const star = hq.pizzas.findIndex(z => z.style === view.comp);
    if (star >= 0) spotlight(ctx, 470 + star * 196, 400, C.STYLES[view.comp].height);
    ctx.fillStyle = 'rgba(255,235,190,0.28)';
    for (let i = 0; i < 26; i++) {
      const x = (i * 197 + ms * (0.006 + (i % 5) * 0.002)) % W, y = (i * 113 + Math.sin(ms / 2000 + i) * 26 + ms * 0.004) % 620;
      dot(ctx, x, y, 1.6 + (i % 3));
    }
  }

  // Each door painting carries a blank signboard on top. This is how many rows of the art to leave off so it is not drawn.
  const DOOR_SIGN = {
    'newyork/centralpark': 0, 'newyork/brooklyn': 70, 'chicago/loop': 66, 'chicago/lincolnpark': 60, 'chicago/wickerpark': 68,
    'dc/georgetown': 62, 'naples/harbor': 60, 'naples/center': 48, 'naples/hillside': 72,
    'california/downtown': 74, 'california/beach': 68, 'california/bungalows': 0,
  };

  // The delivery: the neighborhood behind, the door, whoever ordered, and the pizza that made it.
  function door(ctx, view, ms) {
    const { city, area, slice } = view, pal = area.palette, drift = ms * 0.012;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, pal.skyTop); sky.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const art = n => `${city.id}/${area.id}/${n}`;
    // Everyone stands a little higher here, clear of the dialogue box on a phone.
    ctx.save(); ctx.translate(0, -90);
    S.tile(ctx, art('far'), drift, 0.2, W);
    S.tile(ctx, art('mid'), drift, 0.5, W);
    ctx.fillStyle = pal.ground; ctx.fillRect(0, 600, W, 210);
    S.ground(ctx, `${city.id}/${area.id}/ground`, drift, 600, W);
    S.ground(ctx, `${city.id}/${area.id}/ground`, drift, 720, W);
    const name = art('door');
    if (S.layer(name)) {
      const image = S.layer(name), scale = image.height > 240 ? 1 : 2, cut = DOOR_SIGN[`${city.id}/${area.id}`] || 0, rows = image.height - cut;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, cut, image.width, rows, 760 - image.width * scale / 2, 600 - rows * scale, image.width * scale, rows * scale);
    } else {
      ctx.fillStyle = '#6b5344'; ctx.fillRect(620, 200, 300, 400);
      ctx.fillStyle = '#20150f'; ctx.fillRect(660, 250, 220, 350);
    }
    const final = city.final && area === city.areas[city.areas.length - 1];
    if (final) {
      const tint = ['#ff3fa4', '#4fd8ff', '#ffe14f', '#b45cff'][Math.floor(ms / 240) % 4];
      ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = tint; ctx.beginPath(); ctx.moveTo(735, 90); ctx.lineTo(785, 90); ctx.lineTo(1240, 720); ctx.lineTo(240, 720); ctx.fill(); ctx.restore();
    }
    const who = final ? 'alewife' : `customer-${city.id}-${area.id}`, height = final ? 220 : 200;
    if (!S.draw(ctx, who, 'idle', ms, 760, 610, height, -1)) placeholderAlewife(ctx, 760, 610, 300);
    const style = view.slice && view.slice.style ? view.slice.style : (city.style || 'ny');
    const worn = view.slice && view.slice.topping, dress = worn ? { piece: P.pieceArt(worn, style), count: view.slice.left } : null;
    S.draw(ctx, `slice-${style}`, 'idle', ms, 380, 610, C.STYLES[style].height, 1, 1, { dress }) || P.drawSlice(ctx, 380, 540, style, worn, '#ffcc33', 2.4);
    ctx.restore();
  }

  const TYPE_MS = 26, THUMP_MS = 380;
  const escape = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // **bold** marks emphasis. Returns the spans, and how many letters they hold.
  function spans(text) {
    const parts = text.split(/\*\*/).map((t, i) => ({ t, bold: i % 2 === 1 }));
    return { parts, total: parts.reduce((n, p) => n + p.t.length, 0) };
  }

  function typed({ parts }, n) {
    let html = '', rest = '';
    for (const { t, bold } of parts) {
      const part = escape(t.slice(0, Math.max(0, n)));
      html += bold ? `<b>${part}</b>` : part;
      rest += escape(t.slice(Math.max(0, n)));
      n -= t.length;
    }
    // The unwritten rest is laid out but invisible, so the box does not grow as the line types.
    return rest ? `${html}<span class="rest">${rest}</span>` : html;
  }

  // A card across the shot, Ocean's Eleven style, when a recruit is introduced.
  // It takes the side of the stage the introduced recruit is not standing on.
  function nameCard(ctx, [name, title], age, right) {
    const slide = 1 - Math.min(1, age / 260) ** 3, K = root.PR_PAPER;
    ctx.save(); ctx.translate(right ? W - 560 + 560 * slide : -560 * slide, 0);
    // A paper card pasted across the shot. Its far end runs off the edge of the screen.
    const x = right ? 0 : -60;
    ctx.save(); ctx.translate(280, 110); ctx.rotate(right ? 0.012 : -0.012); ctx.translate(-280, -110);
    K.card(ctx, x, 54, 620, 112, { r: 16, shadow: 6 });
    ctx.fillStyle = K.CORAL; ctx.fillRect(x, 54, 620, 12); ctx.fillStyle = K.SUN; ctx.fillRect(x, 66, 620, 5);
    ctx.textAlign = 'left';
    ctx.fillStyle = K.TEXT; ctx.font = K.display(52, 700); ctx.fillText(name, 34, 125, 500);
    ctx.fillStyle = K.CORAL; ctx.font = K.body(26, 800); ctx.fillText(title, 36, 155, 500);
    ctx.restore(); ctx.restore();
  }

  // Plays shots of lines over the canvas. A tap finishes the line, the next tap moves on.
  // One scene at a time: starting a scene (or a jump elsewhere) stops the one still running.
  let live = null;
  function play(canvas, dialog, shots, view, done) {
    if (live) live.stop();
    const bar = document.getElementById('sceneBar'), skipBtn = document.getElementById('skipBtn');
    const ctx = canvas.getContext('2d'), A = root.PR_SOUND;
    let s = 0, l = 0, raf, stopped = false, start = performance.now(), lineAt = start, cutAt = start, thumpAt = -1e9, opened = start;
    let script = null, shown = 0, full = false, box = null;
    shots.forEach(sh => sh.pic && pic(sh.pic));
    BOARD_ART.forEach(n => pic(`board/${n}`));
    const text = dialog.querySelector('.line'), name = dialog.querySelector('.who');
    const nameOf = who => C.SPEAKERS[who] || view.customer || 'Customer';
    const show = () => {
      const line = shots[s].lines[l];
      name.textContent = nameOf(line.who);
      name.dataset.who = line.who; // the tag's colour, one per speaker (style.css)
      script = spans(line.text); shown = 0; full = false;
      text.innerHTML = typed(script, 0); text.dataset.full = line.text.replace(/\*\*/g, '');
      dialog.classList.remove('hidden', 'done');
      box = speakerBox(shots[s], line.who, view); dock(canvas, dialog, box);
      if (line.thump) { thumpAt = performance.now(); A.play('smash'); }
    };
    const type = now => {
      if (full) return;
      const n = Math.min(script.total, Math.floor((now - lineAt) / TYPE_MS));
      if (n === shown) return;
      const line = shots[s].lines[l], plain = script.parts.map(p => p.t).join('');
      if (n % 2 === 0 && /\S/.test(plain[n - 1] || '')) A.dit(line.who);
      shown = n; text.innerHTML = typed(script, n);
      if (n === script.total) { full = true; dialog.classList.add('done'); }
    };
    const frame = now => {
      if (stopped) return;
      raf = requestAnimationFrame(frame); // first, so one bad frame cannot end the loop for good
      // Until the painted board room has loaded (a fresh visit after a publish), hold on black with the clocks stopped,
      // rather than flash the old drawn room. After 4 s of waiting (a file that never came) the drawn room stands in.
      const painted = paintedReady();
      if (OVER_TABLE.has(shots[s].comp) && !painted && now - opened < 4000) {
        start = lineAt = cutAt = now;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        return;
      }
      const shot = shots[s], cam = cameraOf(shot.comp), t = Math.min(1, (now - start) / (shot.ms || cam.ms || 6000));
      const { x, y, z } = camAt(shot, t);
      type(now);
      // Each new shot whips into place.
      const whip = Math.max(0, 1 - (now - cutAt) / 240) ** 2 * 260;
      const thump = Math.max(0, 1 - (now - thumpAt) / THUMP_MS) ** 2 * 26;
      ctx.save();
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const line = shot.lines[l];
      view.mood = line.mood || (line.who === 'old' && !full ? 'talk' : 'idle');
      view.camX = x; view.comp = shot.comp;
      if (thump) ctx.translate(Math.sin(now / 21) * thump, Math.cos(now / 17) * thump);
      if (shot.pic) painting(ctx, shot, t);
      else if (shot.comp === 'door') door(ctx, view, now);
      else {
        ctx.translate(W / 2, H / 2); ctx.scale(z, z);
        ctx.translate(-x + Math.round(whip / z), -y);
        if (OVER_TABLE.has(shot.comp) && painted) paintedBoard(ctx, view.hq, now, view, shot);
        else room(ctx, view.hq, now, view);
      }
      ctx.restore();
      const edge = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 800);
      edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);
      if (shot.card && shot.pic) nameCard(ctx, shot.card, now - cutAt, shot.cardSide === 'right');
      else if (shot.card) {
        const who = standing(shot.comp, view), c = who && camAt(shot, t), onLeft = who && STAGE_CENTER[0] + (who.x - c.x) * c.z < W / 2;
        nameCard(ctx, shot.card, now - cutAt, !!onLeft);
      }
    };
    const advance = () => {
      if (!full) { shown = script.total; full = true; text.innerHTML = typed(script, shown); dialog.classList.add('done'); return; }
      l++;
      lineAt = performance.now();
      if (l >= shots[s].lines.length) { l = 0; s++; start = cutAt = lineAt; }
      if (s >= shots.length) return finish();
      show();
    };
    const relayout = () => { if (!stopped) dock(canvas, dialog, box); };
    // Every exit (last line, Skip, being replaced) tears the scene down; only the first two call done.
    const stop = () => {
      if (stopped) return;
      stopped = true; cancelAnimationFrame(raf);
      removeEventListener('resize', relayout);
      dialog.classList.add('hidden'); dialog.onclick = null;
      if (bar) bar.classList.add('hidden');
      if (skipBtn) skipBtn.onclick = null;
      if (live === handle) live = null;
    };
    const finish = () => { if (stopped) return; stop(); done(); };
    const handle = { stop, skip: finish };
    live = handle;
    dialog.onclick = advance;
    addEventListener('resize', relayout);
    if (skipBtn) skipBtn.onclick = finish;
    if (bar) bar.classList.remove('hidden');
    show();
    raf = requestAnimationFrame(frame);
    return handle;
  }

  const stopScene = () => { if (live) live.stop(); };

  root.PR_HQ = { play, stopScene };
})(window);
