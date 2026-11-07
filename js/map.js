// The city map: drawn like streets, with one-way arrows, where the slice is, and the way to the address.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES;
  const MAPS = root.PR_MAPS;

  // Every city's roads are stretched to fill the sheet, then pinned to a street grid so every road
  // runs along a grid line and turns at a corner, like a street map.
  const G = 40;
  const fits = {};
  function fit(city) {
    if (fits[city.id]) return fits[city.id];
    const m = MAPS[city.id], pts = [...Object.values(m.nodes).map(n => [n.x, n.y]), ...m.streets.flatMap(s => s.via || [])];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
    const sx = 1130 / (Math.max(...xs) - x0), sy = 540 / (Math.max(...ys) - y0);
    const stretch = ([x, y]) => [75 + (x - x0) * sx, 100 + (y - y0) * sy];
    const snap = ([x, y]) => [Math.round(x / G) * G, Math.round(y / G) * G];
    // Two crossroads never share a grid point: the later one takes the nearest free corner.
    const taken = new Set(), nodes = {};
    for (const [id, n] of Object.entries(m.nodes)) {
      const [x, y] = snap(stretch([n.x, n.y]));
      let best = null;
      for (let r = 0; r < 4 && !best; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        const k = `${x + dx * G},${y + dy * G}`;
        if (!taken.has(k) && (!best || Math.hypot(dx, dy) < best[2])) best = [x + dx * G, y + dy * G, Math.hypot(dx, dy), k];
      }
      taken.add(best[3]); nodes[id] = [best[0], best[1]];
    }
    // Landscape keeps its own shape; only the roads are gridded.
    const f = p => stretch(p).map(Math.round);
    f.node = id => nodes[id];
    return (fits[city.id] = f);
  }

  // Each stretch as the line of road it follows on the map: along the grid, with corners.
  // A road and the road back the other way take opposite corners, so a pair rings a block.
  const hash = id => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function line(city, street, world) {
    const m = MAPS[city.id], def = m.streets.find(s => s.id === street.id), f = fit(city);
    if (!def) return [[f.node(m.start)[0] - 34, f.node(m.start)[1]], f.node(m.start)];
    if (def.back) return line(city, world.streets[def.back], world).slice().reverse();
    const a = f.node(def.from), b = f.node(def.to);
    if (a[0] === b[0] || a[1] === b[1]) return [a, b];
    const twin = m.streets.find(t => t !== def && !t.back && t.from === def.to && t.to === def.from);
    const horizontalFirst = twin ? hash(def.id) < hash(twin.id) : hash(def.id) % 2 === 0;
    return [a, horizontalFirst ? [b[0], a[1]] : [a[0], b[1]], b];
  }

  // Straight twins (same two crossroads, opposite directions) are drawn as two lanes.
  function lanes(city, lines, world) {
    const m = MAPS[city.id], f = fit(city), out = {};
    for (const [id, pts] of Object.entries(lines)) {
      const def = m.streets.find(s => s.id === id), twin = def && m.streets.find(t => t !== def && ((t.from === def.to && t.to === def.from) || (def.back && t.id === def.back) || (t.back === def.id)));
      if (!twin || pts.length !== 2) { out[id] = pts; continue; }
      const side = hash(id) < hash(twin.id) ? 1 : -1, [a, b] = pts, len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / len * 7 * side, ny = (b[0] - a[0]) / len * 7 * side;
      out[id] = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]];
    }
    return out;
  }

  // Streets for the faded backdrop, real for each area. [name, x, y, vertical] on the raw map sheet.
  const BACKDROP = {
    newyork: [['Houston St', 400, 465, 0], ['14th St', 440, 395, 0], ['34th St', 520, 335, 0], ['Lafayette St', 478, 470, 1], ['Varick St', 380, 500, 1], ['Court St', 640, 570, 1], ['Court St', 650, 440, 1], ['Henry St', 580, 590, 1], ['Lexington Ave', 520, 220, 1]],
    chicago: [['Madison St', 790, 530, 0], ['Adams St', 790, 560, 0], ['Division St', 850, 360, 0], ['Armitage Ave', 840, 200, 0], ['Halsted St', 640, 300, 1], ['Ashland Ave', 520, 250, 1], ['Dearborn St', 840, 520, 1], ['Webster Ave', 880, 170, 0]],
    dc: [['K Street', 700, 270, 0], ['H Street', 800, 250, 0], ['Constitution Ave', 600, 360, 0], ['Independence Ave', 700, 470, 0], ['14th Street', 640, 330, 1], ['7th Street', 800, 380, 1], ['Wisconsin Ave', 330, 300, 1], ['Rhode Island Ave', 520, 190, 0]],
    naples: [['Via Chiaia', 360, 520, 0], ['Via Caracciolo', 270, 620, 0], ['Via Foria', 800, 300, 0], ['Via Duomo', 780, 380, 1], ['Via Medina', 560, 560, 0], ['Via Cilea', 280, 270, 0], ['Corso Garibaldi', 850, 480, 0]],
    california: [['Ocean Blvd', 520, 560, 0], ['Anaheim St', 560, 380, 0], ['Atlantic Ave', 860, 420, 1], ['Redondo Ave', 840, 520, 1], ['Elm Ave', 330, 520, 1], ['3rd St', 460, 480, 0], ['Locust Ave', 520, 430, 1]],
  };

  // The stage, drawn as city blocks with the streets as the gaps between them.
  function blocks(city) {
    const out = [];
    for (let y = 80; y < 660; y += G) for (let x = 40; x < 1240; x += G) {
      const tone = (hash(`${x},${y},${city.id}`) % 5);
      out.push(`<rect class="blk t${tone}" x="${x + 4}" y="${y + 4}" width="${G - 8}" height="${G - 8}" rx="3"/>`);
    }
    return out.join('');
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
    out.push(blocks(city));
    for (const k of m.features) out.push(`<polygon class="${k.kind}" points="${k.points.map(p => f(p).join(',')).join(' ')}"/>`);
    city.areas.forEach((a, i) => {
      const ns = Object.values(m.nodes).filter(n => n.area === i).map(n => f([n.x, n.y])), x = ns.reduce((t, n) => t + n[0], 0) / ns.length, y = ns.reduce((t, n) => t + n[1], 0) / ns.length;
      out.push(`<text class="areaname" x="${x}" y="${y}">${a.name}</text>`);
    });
    for (const [name, x, y, up] of BACKDROP[city.id] || []) {
      const [px, py] = f([x, y]), gx = Math.round(px / G) * G, gy = Math.round(py / G) * G;
      out.push(up ? `<text class="backstreet" transform="translate(${gx} ${py}) rotate(-90)">${name}</text>` : `<text class="backstreet" x="${px}" y="${gy + 4}">${name}</text>`);
    }
    for (const l of m.landmarks) { const [x, y] = f([l.x, l.y]); out.push(`<text class="landmark" x="${x}" y="${y}">${l.name}</text>`); }
    const lines = lanes(city, Object.fromEntries(Object.values(world.streets).map(s => [s.id, line(city, s, world)])), world);
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
    // Only the next address is marked.
    const next = world.delivery, as = world.streets[m.addresses[next]];
    let pin = null;
    if (as) {
      const p = along(lines[as.id], as.door / as.length);
      pin = [p.x, p.y];
      out.push(`<g class="addr active" transform="translate(${p.x} ${p.y})"><circle r="27"/><text y="10">${next + 1}</text></g>`);
      out.push(`<text class="pinlabel" x="${p.x}" y="${p.y + 60}">${city.areas[next].customer}</text>`);
    }
    for (const id of Object.keys(world.reached)) {
      const [x, y] = f([m.nodes[id].x, m.nodes[id].y]), on = id === picked;
      out.push(`<g class="check${on ? ' on' : ''}${picked === undefined ? ' still' : ''}" data-node="${id}"><circle class="hit" cx="${x}" cy="${y}" r="42"/><circle class="dot" cx="${x}" cy="${y}" r="${on ? 22 : 15}"/></g>`);
      if (on) {
        // Above or below the dot, whichever side stays clear of the next stop's pin and its label.
        const [ax, ay] = pin || [-999, -999], clash = dy => Math.abs(ax - x) < 260 && ay + 60 > y + dy - 30 && ay - 30 < y + dy + 10;
        const dy = y < 150 ? 52 : clash(-34) ? 52 : -34;
        out.push(`<text class="nodename" x="${x}" y="${y + dy}">${world.nodes[id].name}</text>`);
      }
    }
    // Every place a slice was lost this attempt, the most recent one called out.
    const lost = lostSlices(world);
    lost.forEach((d, i) => {
      const s = world.streets[d.street], p = along(lines[s.id], d.x / s.length), last = i === lost.length - 1;
      out.push(`<g class="grave${last ? ' last' : ''}" transform="translate(${p.x} ${p.y})">${last ? '<circle class="halo" r="26"/>' : ''}<path class="mark" d="M0 -${last ? 19 : 15} L${last ? 19 : 15} 0 L0 ${last ? 19 : 15} L-${last ? 19 : 15} 0 Z"/><path class="cross" d="M-5 -5 L5 5 M5 -5 L-5 5"/></g>`);
      if (last) out.push(`<text class="gravelabel" x="${p.x}" y="${p.y + (p.y > 600 ? -34 : 44)}">Last lost slice</text>`);
    });
    if (live) {
      const s = world.streets[live.street], p = along(lines[s.id], live.x / s.length);
      out.push(`<g class="you" transform="translate(${p.x} ${p.y})"><circle r="24"/><text y="9">🍕</text></g><text class="youlabel" x="${p.x}" y="${p.y - 34}">YOU</text>`);
    }
    out.push(`<g class="legend"><circle cx="40" cy="692" r="11" class="k-addr"/><text x="58" y="699">Next stop</text>
      <circle cx="210" cy="692" r="11" class="k-check"/><text x="228" y="699">${live ? 'Checkpoints' : 'Tap to start here'}</text>
      <path class="k-lost" d="M430 680 L442 692 L430 704 L418 692 Z"/><text x="454" y="699">Slice lost${lost.length ? ' (' + lost.length + ')' : ''}</text>${live ? '<text x="700" y="699">🍕 You are here</text>' : ''}</g></svg>`);
    return out.join('');
  }

  // Every slice lost this attempt, oldest first. Older saves without an order use their place in the list.
  function lostSlices(world) {
    const all = [];
    for (const s of Object.values(world.streets)) for (const d of s.dead || []) all.push({ street: s.id, x: d.x, at: d.at == null ? -1 : d.at });
    return all.map((d, i) => ({ ...d, i })).sort((a, b) => a.at - b.at || a.i - b.i);
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

  root.PR_MAP = { svg, closest, line, along, lostSlices };
})(window);
