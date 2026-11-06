// The city map: drawn like streets, with one-way arrows, where the slice is, and the way to the address.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES;
  const MAPS = root.PR_MAPS;

  // Every city's roads are stretched to fill the sheet, so no map huddles in one corner.
  const fits = {};
  function fit(city) {
    if (fits[city.id]) return fits[city.id];
    const m = MAPS[city.id], pts = [...Object.values(m.nodes).map(n => [n.x, n.y]), ...m.streets.flatMap(s => s.via || [])];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
    const sx = 1130 / (Math.max(...xs) - x0), sy = 540 / (Math.max(...ys) - y0);
    return (fits[city.id] = ([x, y]) => [Math.round(75 + (x - x0) * sx), Math.round(100 + (y - y0) * sy)]);
  }

  // Each stretch as the line of road it follows on the map, corner by corner.
  function line(city, street, world) {
    const m = MAPS[city.id], def = m.streets.find(s => s.id === street.id), f = fit(city);
    const node = id => f([m.nodes[id].x, m.nodes[id].y]);
    if (!def) return [[node(m.start)[0] - 34, node(m.start)[1]], node(m.start)];
    if (def.back) return line(city, world.streets[def.back], world).slice().reverse();
    return [node(def.from), ...(def.via || []).map(f), node(def.to)];
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
    const p = along(pts, 0.5);
    let turn = p.angle;
    if (turn > 90) turn -= 180;
    if (turn < -90) turn += 180;
    const r = turn * Math.PI / 180;
    return `<text class="roadname" transform="translate(${p.x + Math.sin(r) * 19} ${p.y - Math.cos(r) * 19}) rotate(${turn})">${text}</text>`;
  }

  // picked is the checkpoint chosen, live is the slice out on the street right now.
  function svg(camp, { picked, live } = {}) {
    const city = R.currentCity(camp), world = camp.world, out = [], m = MAPS[city.id];
    const all = Object.values(world.streets).filter(s => s.id !== 'lead');
    const paper = root.PR_SPRITES.layer(`maps/${city.id}`);
    out.push(`<svg class="citymap" viewBox="0 0 1280 720">${paper ? `<image href="${paper.src}" width="1280" height="720" preserveAspectRatio="none"/>` : ''}`);
    const f = fit(city);
    out.push('<rect class="wash" width="1280" height="720"/>');
    for (const k of m.features) out.push(`<polygon class="${k.kind}" points="${k.points.map(p => f(p).join(',')).join(' ')}"/>`);
    city.areas.forEach((a, i) => {
      const ns = Object.values(m.nodes).filter(n => n.area === i).map(n => f([n.x, n.y])), x = ns.reduce((t, n) => t + n[0], 0) / ns.length, y = ns.reduce((t, n) => t + n[1], 0) / ns.length;
      out.push(`<text class="areaname" x="${x}" y="${y}">${a.name}</text>`);
    });
    for (const l of m.landmarks) { const [x, y] = f([l.x, l.y]); out.push(`<text class="landmark" x="${x}" y="${y}">${l.name}</text>`); }
    const lines = Object.fromEntries(Object.values(world.streets).map(s => [s.id, line(city, s, world)]));
    const drawn = all.filter(s => s.role !== 'back');
    for (const s of drawn) out.push(`<path class="casing" d="${path(lines[s.id])}"/>`);
    for (const s of drawn) {
      const blocked = s.gated && !world.opened[s.id];
      out.push(`<path class="road${world.known[s.id] ? ' known' : ''}${blocked ? ' blocked' : ''}" d="${path(lines[s.id])}"/>`);
      out.push(arrows(lines[s.id], 'arrow'));
    }
    // A faint dotted line to the address, from wherever the next slice starts.
    const target = R.addressStreet(camp), from = live ? world.streets[live.street].to : picked;
    const here = live && live.street === target && live.x < world.streets[target].door;
    const route = here ? { path: [target] } : from ? R.routes(world, from, target) : null;
    if (route) route.path.forEach(id => out.push(`<path class="routeline" d="${path(lines[id])}"/>`));
    // A road split into stretches or two directions still gets its name just once.
    const named = new Set();
    for (const s of drawn.slice().sort((a, b) => b.length - a.length)) {
      if (world.known[s.id] && !named.has(s.name)) { named.add(s.name); out.push(roadLabel(lines[s.id], s.name)); }
    }
    // Every address is marked from the start.
    city.areas.forEach((a, i) => {
      const s = world.streets[m.addresses[i]], p = along(lines[s.id], s.door / s.length);
      const state = i < world.delivery ? 'done' : i === world.delivery ? 'active' : 'later';
      out.push(`<g class="addr ${state}" transform="translate(${p.x} ${p.y})"><circle r="27"/><text y="10">${state === 'done' ? '✓' : i + 1}</text></g>`);
      if (state === 'active') out.push(`<text class="pinlabel" x="${p.x}" y="${p.y + 60}">${a.customer}</text>`);
    });
    for (const id of Object.keys(world.reached)) {
      const [x, y] = f([m.nodes[id].x, m.nodes[id].y]), on = id === picked;
      out.push(`<g class="check${on ? ' on' : ''}${picked === undefined ? ' still' : ''}" data-node="${id}"><circle class="hit" cx="${x}" cy="${y}" r="42"/><circle class="dot" cx="${x}" cy="${y}" r="${on ? 22 : 15}"/></g>`);
      if (on) out.push(`<text class="nodename" x="${x}" y="${y + (y < 150 ? 52 : -34)}">${world.nodes[id].name}</text>`);
    }
    if (world.lastSeen && !live) {
      const s = world.streets[world.lastSeen.street], p = along(lines[s.id], world.lastSeen.x / s.length);
      out.push(`<text class="lost" x="${p.x}" y="${p.y + 12}">✕</text>`);
    }
    if (live) {
      const s = world.streets[live.street], p = along(lines[s.id], live.x / s.length);
      out.push(`<g class="you" transform="translate(${p.x} ${p.y})"><circle r="24"/><text y="9">🍕</text></g><text class="youlabel" x="${p.x}" y="${p.y - 34}">YOU</text>`);
    }
    out.push(`<g class="legend"><circle cx="40" cy="692" r="11" class="k-addr"/><text x="58" y="699">Address</text>
      <circle cx="200" cy="692" r="11" class="k-check"/><text x="218" y="699">${live ? 'Checkpoints' : 'Tap to start here'}</text>
      <text x="470" y="700">${live ? '🍕 You are here' : '✕ Last slice ended here'}</text></g></svg>`);
    return out.join('');
  }

  // The reached checkpoint fewest stretches from the address.
  function closest(camp) {
    const { world } = camp, target = R.addressStreet(camp);
    let best = null, steps = Infinity;
    for (const id of Object.keys(world.reached)) {
      const route = R.routes(world, id, target);
      if (route && route.d < steps) { best = id; steps = route.d; }
    }
    return best;
  }

  root.PR_MAP = { svg, closest, line, along };
})(window);
