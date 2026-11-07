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
    boardTease: { from: [1030, 300, 3], to: [1160, 300, 3], ms: 1500 },
    ny: { from: [500, 410, 2], to: [500, 400, 2] },
    deep: { from: [780, 410, 2], to: [780, 400, 2] },
    jumbo: { from: [960, 370, 2], to: [960, 360, 2] },
    naples: { from: [900, 413, 1], to: [1060, 413, 3], at: 0.1, ms: 4000 },
  };
  const STAGE_CENTER = [W / 2, H / 2];

  // Where the camera is, in room units, a fraction t through a shot.
  function camAt(shot, t) {
    const cam = CAMERAS[shot.comp] || CAMERAS.wide, e = t * t * (3 - 2 * t);
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
    if (shot.comp === 'door') {
      const final = view.city.final && view.area === view.city.areas[view.city.areas.length - 1];
      const sty = view.slice && view.slice.style ? view.slice.style : (view.city.style || 'ny');
      const at = who === 'customer' || who === 'alewife' ? { x: 760, foot: 520, h: final ? 340 : 300 } : { x: 380, foot: 520, h: C.STYLES[sty].height };
      return pad(at, 1, 640, 360, 1);
    }
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
  const OVER_TABLE = new Set(['board', 'polaroid', 'boardTeen', 'boardTurtle', 'boardTease']);
  const OUTLINE_CSS = '#1e1030';
  let spots = { ny: [], deep: [], jumbo: [], naples: [] };
  fetch('assets/backgrounds/hq/recruit-spots.json').then(r => (r.ok ? r.json() : null)).then(j => { if (j) spots = j; }).catch(() => {});

  // The recruits stand on the table: plain and cold at first, then wearing their topping
  // once they have been out. The row of wedges beneath shows the slices still left.
  function recruit(ctx, x, foot, z, ms) {
    const plain = `recruit-${z.style}`, st = C.STYLES[z.style];
    if (!S.draw(ctx, plain, 'idle', ms, x, foot, st.height)) S.draw(ctx, `slice-${z.style}`, 'idle', ms, x, foot, st.height) || P.drawSlice(ctx, x, foot - 50, z.style, null, '#d9d0ae', 2);
    const art = z.topping && S.layer(P.pieceArt(z.topping, z.style));
    if (art) {
      ctx.imageSmoothingEnabled = false;
      for (const [dx, dy] of spots[z.style]) ctx.drawImage(art, Math.round(x + dx - art.width / 2), Math.round(foot + dy - art.height / 2));
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = OUTLINE_CSS; ctx.fillRect(x - 45 + i * 16, foot + 8, 12, 12);
      ctx.fillStyle = i < z.left ? '#ffcc33' : '#4a3a3a'; ctx.fillRect(x - 43 + i * 16, foot + 10, 8, 8);
    }
  }

  // Dossier photos on the cork, as fractions of the board.
  const DOSSIERS = [['teen', 0.56, 0.06], ['turtle', 0.78, 0.06], ['ninja', 0.56, 0.48], ['mutant', 0.78, 0.48]];

  function dossier(ctx, type, x, y, w, h) {
    ctx.fillStyle = '#f7f4ea'; ctx.fillRect(x, y, w, h);
    const ix = x + w * 0.07, iy = y + h * 0.06, iw = w * 0.86, ih = h * 0.74;
    ctx.fillStyle = '#6d5a4c'; ctx.fillRect(ix, iy, iw, ih);
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    S.draw(ctx, type, 'idle', 0, ix + iw / 2, iy + ih * 1.02, ih * 0.98);
    ctx.restore();
    ctx.fillStyle = '#c41e1e'; dot(ctx, x + w / 2, y + 2, Math.max(2, w * 0.05));
  }

  // The board is live evidence on the painted cork: receipts, his notes, the dossiers.
  function board(ctx, x, y, w, h, hq) {
    if (!S.layer('hq/back')) {
      ctx.fillStyle = '#4a3020'; ctx.fillRect(x - w * 0.03, y - h * 0.04, w * 1.06, h * 1.08);
      ctx.fillStyle = '#b98d5e'; ctx.fillRect(x, y, w, h);
    }
    const n = Math.min(hq.receipts, 18);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = '#fffef6';
      ctx.fillRect(x + w * (0.04 + (i % 6) * 0.075), y + h * (0.06 + Math.floor(i / 6) * 0.2), w * 0.055, h * 0.15);
    }
    for (let i = 0; i < hq.notes; i++) {
      ctx.fillStyle = '#ffe66b';
      ctx.fillRect(x + w * (0.05 + i * 0.07), y + h * 0.72, w * 0.06, h * 0.17);
    }
    for (const [type, fx, fy] of DOSSIERS) dossier(ctx, type, x + w * fx, y + h * fy, w * 0.19, h * 0.38);
    if (hq.notes > 1) {
      ctx.strokeStyle = '#c41e1e'; ctx.lineWidth = Math.max(0.5, w * 0.005); ctx.beginPath();
      for (let i = 0; i < hq.notes; i++) ctx.lineTo(x + w * (0.08 + i * 0.07), y + h * (i % 2 ? 0.72 : 0.76));
      ctx.lineTo(x + w * 0.655, y + h * 0.1);
      ctx.stroke();
    }
    if (!hq.alewife) return;
    const px = x + w * 0.56, py = y + h * 0.08, pw = w * 0.38, ph = h * 0.62;
    ctx.fillStyle = '#f7f4ea'; ctx.fillRect(px, py, pw, ph);
    const ix = px + pw * 0.06, iy = py + ph * 0.05, iw = pw * 0.88, ih = ph * 0.74;
    ctx.fillStyle = '#2a2230'; ctx.fillRect(ix, iy, iw, ih);
    const photo = S.layer('hq/alewife-polaroid');
    if (photo) { ctx.imageSmoothingEnabled = false; ctx.drawImage(photo, ix, iy, iw, ih); }
    else S.draw(ctx, 'alewife', 'idle', 0, ix + iw / 2, iy + ih, ih * 0.92) || placeholderAlewife(ctx, ix + iw / 2, iy + ih, ih * 0.9);
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
      const image = S.layer(name), scale = image.height > 240 ? 1 : 2;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 760 - image.width * scale / 2, 600 - image.height * scale, image.width * scale, image.height * scale);
    } else {
      ctx.fillStyle = '#6b5344'; ctx.fillRect(620, 200, 300, 400);
      ctx.fillStyle = '#20150f'; ctx.fillRect(660, 250, 220, 350);
    }
    const final = city.final && area === city.areas[city.areas.length - 1];
    if (final) {
      const tint = ['#ff3fa4', '#4fd8ff', '#ffe14f', '#b45cff'][Math.floor(ms / 240) % 4];
      ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = tint; ctx.beginPath(); ctx.moveTo(760, 260); ctx.lineTo(240, 720); ctx.lineTo(1240, 720); ctx.fill(); ctx.restore();
    }
    const who = final ? 'alewife' : `customer-${city.id}-${area.id}`, height = final ? 340 : 300;
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
    const slide = 1 - Math.min(1, age / 260) ** 3;
    ctx.save(); ctx.translate(right ? W - 560 + 560 * slide : -560 * slide, 0);
    ctx.fillStyle = 'rgba(16,14,36,0.92)'; ctx.fillRect(0, 54, 560, 112);
    ctx.fillStyle = '#ffd76a'; ctx.fillRect(0, 54, 560, 5); ctx.fillRect(0, 161, 560, 5);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 54px "Pixelify Sans", monospace'; ctx.fillText(name, 34, 116);
    ctx.fillStyle = '#fff'; ctx.font = '26px "Pixelify Sans", monospace'; ctx.fillText(title, 36, 148);
    ctx.restore();
  }

  // Plays shots of lines over the canvas. A tap finishes the line, the next tap moves on.
  function play(canvas, dialog, shots, view, done) {
    let onDone = done;
    const ctx = canvas.getContext('2d'), A = root.PR_SOUND;
    let s = 0, l = 0, raf, stopped = false, start = performance.now(), lineAt = start, cutAt = start, thumpAt = -1e9;
    let script = null, shown = 0, full = false, box = null;
    const text = dialog.querySelector('.line'), name = dialog.querySelector('.who');
    const nameOf = who => C.SPEAKERS[who] || view.customer || 'Customer';
    const show = () => {
      const line = shots[s].lines[l];
      name.textContent = nameOf(line.who);
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
      const shot = shots[s], cam = CAMERAS[shot.comp] || CAMERAS.wide, t = Math.min(1, (now - start) / (cam.ms || 6000));
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
      if (shot.comp === 'door') door(ctx, view, now);
      else {
        ctx.translate(W / 2, H / 2); ctx.scale(z, z);
        ctx.translate(-x + Math.round(whip / z), -y);
        room(ctx, view.hq, now, view);
      }
      ctx.restore();
      const edge = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 800);
      edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);
      if (shot.card) {
        const who = standing(shot.comp, view), c = who && camAt(shot, t), onLeft = who && STAGE_CENTER[0] + (who.x - c.x) * c.z < W / 2;
        nameCard(ctx, shot.card, now - cutAt, !!onLeft);
      }
      raf = requestAnimationFrame(frame);
    };
    const advance = () => {
      if (!full) { shown = script.total; full = true; text.innerHTML = typed(script, shown); dialog.classList.add('done'); return; }
      l++;
      lineAt = performance.now();
      if (l >= shots[s].lines.length) { l = 0; s++; start = cutAt = lineAt; }
      if (s >= shots.length) {
        stopped = true; cancelAnimationFrame(raf);
        dialog.classList.add('hidden'); dialog.onclick = null;
        return onDone();
      }
      show();
    };
    dialog.onclick = advance;
    const relayout = () => { if (!stopped) dock(canvas, dialog, box); };
    addEventListener('resize', relayout);
    const finish = onDone;
    onDone = () => { removeEventListener('resize', relayout); finish(); };
    show();
    raf = requestAnimationFrame(frame);
  }

  root.PR_HQ = { play };
})(window);
