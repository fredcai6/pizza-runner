// The city map: drawn like streets, with one-way arrows, where the slice is, and the way to the address.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES;
  const AREA = { x: 110, gap: 390, w: 290, top: 120, bottom: 540, ring: 620 };
  const PARKS = { centralpark: '#9bbf7a', lincolnpark: '#9bbf7a', mall: '#a9c98a', beach: '#ecd9a0' };

  const corners = i => {
    const L = AREA.x + i * AREA.gap, R_ = L + AREA.w, T = AREA.top, B = AREA.bottom, mid = (T + B) / 2;
    return { L, R: R_, T, B, mid, a0: [L, B], a1: [L + AREA.w * 0.55, T], a2: [R_, mid] };
  };

  // Each stretch as the line of road it follows on the map, corner by corner.
  function line(city, street) {
    if (street.id === 'lead') return [[30, AREA.bottom], corners(0).a0];
    const i = street.area, c = corners(i), n = city.areas.length;
    switch (street.role) {
      case 'main': return [c.a0, [c.L, c.T], c.a1];
      case 'door': return [c.a1, [c.R, c.T], c.a2];
      case 'alley': return [c.a0, c.a1];
      case 'cut': return [c.a1, [c.a1[0], c.mid], c.a2];
      case 'loop': return [c.a2, [c.R, c.B], c.a0];
      default: {
        const out = c.R + 50;
        if (i < n - 1) return [c.a2, [out, c.mid], [out, c.B], corners(i + 1).a0];
        const home = corners(0).L;
        return [c.a2, [out, c.mid], [out, AREA.ring], [home, AREA.ring], [home, c.B]];
      }
    }
  }

  const spans = pts => pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));

  function along(pts, t) {
    const lens = spans(pts), total = lens.reduce((a, b) => a + b, 0);
    let left = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < lens.length; i++) {
      if (left <= lens[i] || i === lens.length - 1) {
        const f = lens[i] ? left / lens[i] : 0, [a, b] = [pts[i], pts[i + 1]];
        return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
      }
      left -= lens[i];
    }
    return { x: pts[0][0], y: pts[0][1], angle: 0 };
  }

  const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');

  function arrows(pts, cls, every = 74) {
    const total = spans(pts).reduce((a, b) => a + b, 0), out = [];
    for (let d = every / 2; d < total; d += every) {
      const p = along(pts, d / total);
      out.push(`<path class="${cls}" transform="translate(${p.x} ${p.y}) rotate(${p.angle})" d="M-7 -8 L7 0 L-7 8 Z"/>`);
    }
    return out.join('');
  }

  function roadLabel(pts, text) {
    const p = along(pts, 0.5), flat = Math.abs(p.angle) < 20 || Math.abs(p.angle) > 160;
    const off = flat ? [0, -19] : [19, 0], turn = flat ? 0 : 90;
    return `<text class="roadname" transform="translate(${p.x + off[0]} ${p.y + off[1]}) rotate(${turn})">${text}</text>`;
  }

  // picked is the checkpoint chosen, live is the slice out on the street right now.
  function svg(camp, { picked, live } = {}) {
    const city = R.currentCity(camp), world = camp.world, out = [], all = Object.values(world.streets);
    const paper = root.PR_SPRITES.layer(`maps/${city.id}`);
    out.push(`<svg class="citymap" viewBox="0 0 1280 720">${paper ? `<image href="${paper.src}" width="1280" height="720" preserveAspectRatio="none"/>` : ''}`);
    city.areas.forEach((a, i) => {
      const c = corners(i), tint = PARKS[a.id] || a.palette.top;
      out.push(`<rect class="block" x="${c.L - 26}" y="${c.T - 26}" width="${AREA.w + 52}" height="${AREA.bottom - AREA.top + 52}" fill="${tint}"/>`);
      if (!PARKS[a.id]) for (let k = 1; k < 7; k++) {
        out.push(`<path class="grid" d="M${c.L - 26 + k * 48} ${c.T - 26} V${c.B + 26} M${c.L - 26} ${c.T - 26 + k * 66} H${c.R + 26}"/>`);
      }
      out.push(`<text class="areaname" x="${c.L + AREA.w / 2}" y="62">${a.name}</text>`);
    });
    const lines = Object.fromEntries(all.map(s => [s.id, line(city, s)]));
    for (const s of all) out.push(`<path class="casing" d="${path(lines[s.id])}"/>`);
    for (const s of all) {
      const blocked = s.gated && !world.opened[s.id];
      out.push(`<path class="road${world.known[s.id] ? ' known' : ''}${blocked ? ' blocked' : ''}" d="${path(lines[s.id])}"/>`);
      out.push(arrows(lines[s.id], 'arrow'));
    }
    // The way to the address, from wherever the next slice starts.
    const target = R.addressStreet(camp), from = live ? world.streets[live.street].to : picked;
    const here = live && live.street === target && live.x < world.streets[target].door;
    const route = here ? { path: [target] } : from ? R.routes(world, from, target) : null;
    if (route) {
      if (live && !here) out.push(`<path class="route" d="${path(lines[live.street])}"/>`);
      route.path.forEach(id => { out.push(`<path class="route" d="${path(lines[id])}"/>`); out.push(arrows(lines[id], 'routearrow')); });
    }
    for (const s of all) if (world.known[s.id] || (route && route.path.includes(s.id))) out.push(roadLabel(lines[s.id], s.name));
    // Every address is marked from the start.
    city.areas.forEach((a, i) => {
      const s = world.streets[`${a.id}.door`], p = along(lines[s.id], s.door / s.length);
      const state = i < world.delivery ? 'done' : i === world.delivery ? 'active' : 'later';
      out.push(`<g class="addr ${state}" transform="translate(${p.x} ${p.y})"><circle r="27"/><text y="10">${state === 'done' ? '✓' : i + 1}</text></g>`);
      if (state === 'active') out.push(`<text class="pinlabel" x="${p.x}" y="${p.y + 60}">${a.customer}</text>`);
    });
    for (const id of Object.keys(world.reached)) {
      const p = id === 'start' ? { x: 30, y: AREA.bottom } : corners(world.nodes[id].area)[`a${world.nodes[id].slot}`], x = p.x ?? p[0], y = p.y ?? p[1], on = id === picked;
      out.push(`<g class="check${on ? ' on' : ''}${picked === undefined ? ' still' : ''}" data-node="${id}"><circle class="hit" cx="${x}" cy="${y}" r="42"/><circle class="dot" cx="${x}" cy="${y}" r="${on ? 22 : 15}"/></g>`);
      if (on) out.push(`<text class="nodename" x="${x}" y="${y + (y > 400 ? 52 : -34)}">${world.nodes[id].name}</text>`);
    }
    if (world.lastSeen && !live) {
      const s = world.streets[world.lastSeen.street], p = along(lines[s.id], world.lastSeen.x / s.length);
      out.push(`<text class="lost" x="${p.x}" y="${p.y + 12}">✕</text>`);
    }
    if (live) {
      const s = world.streets[live.street], p = along(lines[s.id], live.x / s.length);
      out.push(`<g class="you" transform="translate(${p.x} ${p.y})"><circle r="24"/><text y="9">🍕</text></g><text class="youlabel" x="${p.x}" y="${p.y - 34}">YOU</text>`);
    }
    out.push(`<g class="legend"><circle cx="40" cy="692" r="11" class="k-route"/><text x="58" y="699" text-anchor="start">Way to the address</text>
      <circle cx="306" cy="692" r="11" class="k-addr"/><text x="324" y="699" text-anchor="start">Address</text>
      <circle cx="470" cy="692" r="11" class="k-check"/><text x="488" y="699" text-anchor="start">${live ? 'Checkpoints' : 'Tap to start here'}</text>
      <text x="720" y="700" class="k-lost" text-anchor="start">${live ? '🍕 You are here' : '✕ Last slice ended here'}</text></g></svg>`);
    return out.join('');
  }

  // The reached checkpoint fewest stretches from the address.
  function closest(camp) {
    const { world } = camp, target = R.addressStreet(camp);
    let best = null, steps = Infinity;
    for (const id of Object.keys(world.reached)) {
      const route = R.routes(world, id, target);
      if (route && route.steps < steps) { best = id; steps = route.steps; }
    }
    return best;
  }

  root.PR_MAP = { svg, closest, line, along };
})(window);
