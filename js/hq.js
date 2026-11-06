// The back room. One drawing of it, reflecting the campaign, with a camera that cuts and pans.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES, P = root.PR_PLAY, S = root.PR_SPRITES;
  const W = P.W, H = P.H, dot = P.dot;

  // Camera targets in room coordinates.
  const CAMERAS = {
    wide: { from: [640, 360, 1], to: [640, 360, 1.06] },
    board: { from: [930, 250, 1.75], to: [980, 270, 2] },
    oldtimer: { from: [300, 400, 2.1], to: [300, 380, 2.35] },
    pies: { from: [560, 520, 1.7], to: [720, 520, 1.7] },
    polaroid: { from: [1090, 262, 1.9], to: [1090, 252, 2.4] },
  };

  const OUTLINE_CSS = '#1e1030';
  const SPOTS = { ny: [[-16, 84], [14, 74], [0, 50]], deep: [[-26, 120], [24, 112], [0, 76]], jumbo: [[-46, 170], [40, 160], [0, 104]], naples: [[-12, 70], [12, 62], [0, 42]] };
  let spots = SPOTS;
  fetch('assets/backgrounds/hq/recruit-spots.json').then(r => (r.ok ? r.json() : null)).then(j => { if (j) spots = j; }).catch(() => {});

  // The recruits stand on the table: plain and cold at first, then wearing their topping
  // once they have been out. The row of wedges beneath shows the slices still left.
  function recruit(ctx, x, foot, z, ms) {
    const plain = `recruit-${z.style}`, st = C.STYLES[z.style];
    if (!S.draw(ctx, plain, 'idle', ms, x, foot, st.height)) S.draw(ctx, `slice-${z.style}`, 'idle', ms, x, foot, st.height) || P.drawSlice(ctx, x, foot - 50, z.style, null, '#d9d0ae', 2);
    if (z.topping) {
      const art = S.layer(`props/shot-${z.topping}`);
      for (const [dx, up] of spots[z.style]) {
        if (art) { ctx.imageSmoothingEnabled = false; ctx.drawImage(art, x + dx - 11, foot - up - 11, 22, 22); }
        else { ctx.fillStyle = C.TOPPINGS[z.topping].color; dot(ctx, x + dx, foot - up, 9); }
      }
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = OUTLINE_CSS; ctx.fillRect(x - 45 + i * 16, foot + 8, 12, 12);
      ctx.fillStyle = i < z.left ? '#ffcc33' : '#4a3a3a'; ctx.fillRect(x - 43 + i * 16, foot + 10, 8, 8);
    }
  }

  // The board draws itself, including the photo of itself, so later evidence shows up at every depth.
  function board(ctx, x, y, w, h, hq, depth = 0) {
    // The top level sits on the painted cork. Only the board inside the photo draws its own.
    if (depth > 0 || !S.layer('hq/back')) {
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
      ctx.fillRect(x + w * (0.05 + i * 0.09), y + h * 0.72, w * 0.075, h * 0.17);
    }
    if (hq.notes > 1) {
      ctx.strokeStyle = '#c41e1e'; ctx.lineWidth = Math.max(0.5, w * 0.005); ctx.beginPath();
      for (let i = 0; i < hq.notes; i++) ctx.lineTo(x + w * (0.09 + i * 0.09), y + h * (i % 2 ? 0.72 : 0.76));
      ctx.lineTo(x + w * 0.74, y + h * 0.3);
      ctx.stroke();
    }
    const px = x + w * 0.56, py = y + h * 0.08, pw = w * 0.38, ph = h * 0.62;
    ctx.fillStyle = '#f7f4ea'; ctx.fillRect(px, py, pw, ph);
    const ix = px + pw * 0.06, iy = py + ph * 0.05, iw = pw * 0.88, ih = ph * 0.74;
    if (hq.alewife && depth === 0) {
      ctx.fillStyle = '#2a2230'; ctx.fillRect(ix, iy, iw, ih);
      const photo = S.layer('hq/alewife-polaroid');
      if (photo) { ctx.imageSmoothingEnabled = false; ctx.drawImage(photo, ix, iy, iw, ih); }
      else S.draw(ctx, 'alewife', 'idle', 0, ix + iw / 2, iy + ih, ih * 0.92) || placeholderAlewife(ctx, ix + iw / 2, iy + ih, ih * 0.9);
    } else {
      ctx.fillStyle = '#6d5a4c'; ctx.fillRect(ix, iy, iw, ih);
      if (depth < 3) board(ctx, ix + iw * 0.1, iy + ih * 0.12, iw * 0.8, ih * 0.76, { ...hq, alewife: false }, depth + 1);
    }
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
    hq.pizzas.forEach((z, i) => recruit(ctx, 470 + i * 196, 480, z, ms + i * 400));
    oldTimer(ctx, 300, 410, ms, view.mood);
    layer(ctx, 'hq/front', camX, -0.18);
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
    const art = n => (S.layer(`${city.id}/${area.id}/${n}`) ? `${city.id}/${area.id}/${n}` : `${city.id}/${n}`);
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
    S.draw(ctx, `slice-${style}`, 'idle', ms, 380, 610, C.STYLES[style].height) || P.drawSlice(ctx, 380, 540, style, null, '#ffcc33', 2.4);
    ctx.restore();
  }

  // Plays shots of lines over the canvas. Tap to advance.
  function play(canvas, dialog, shots, view, onDone) {
    const ctx = canvas.getContext('2d');
    let s = 0, l = 0, raf, stopped = false, start = performance.now(), lineAt = start, cutAt = start;
    const text = dialog.querySelector('.line'), name = dialog.querySelector('.who');
    const NAMES = { old: 'The Old Timer', recruit: 'Recruit', customer: view.customer || 'Customer', alewife: 'DJ Alewife' };
    const show = () => {
      const line = shots[s].lines[l];
      name.textContent = NAMES[line.who]; text.textContent = line.text;
      dialog.classList.remove('hidden');
      root.PR_SOUND.play('print');
    };
    const frame = now => {
      if (stopped) return;
      const shot = shots[s], t = Math.min(1, (now - start) / 6000), cam = CAMERAS[shot.comp] || CAMERAS.wide;
      const eased = t * t * (3 - 2 * t);
      const [x, y, z0] = cam.from.map((v, i) => v + (cam.to[i] - v) * eased);
      // Each new line punches in a little, and each new shot whips into place.
      const punch = Math.max(0, 1 - (now - lineAt) / 220), z = z0 * (1 + 0.035 * punch * punch);
      const whip = Math.max(0, 1 - (now - cutAt) / 240) ** 2 * 260;
      ctx.save();
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const line = shot.lines[l], talking = now - lineAt < Math.min(2400, line.text.length * 42);
      view.mood = line.mood || (line.who === 'old' && talking ? 'talk' : 'idle');
      view.camX = x;
      if (shot.comp === 'door') door(ctx, view, now);
      else {
        ctx.translate(W / 2, H / 2); ctx.scale(z, z);
        ctx.translate(-Math.max(W / 2 / z, Math.min(W - W / 2 / z, x)) + whip / z, -Math.max(H / 2 / z, Math.min(H - H / 2 / z, y)));
        room(ctx, view.hq, now, view);
      }
      ctx.restore();
      const edge = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 800);
      edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(frame);
    };
    const advance = () => {
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
    show();
    raf = requestAnimationFrame(frame);
  }

  root.PR_HQ = { play, board };
})(window);
