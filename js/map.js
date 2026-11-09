// The city map: drawn like streets, with one-way arrows, where the slice is, and the way to the address.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES;
  const MAPS = root.PR_MAPS;

  const { fit: fitMap } = root.PR_MAPFIT;
  const fit = city => fitMap(city.id);

  // Each stretch as the line of road it follows on the map: along the lattice, through its authored corners.
  const hash = id => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function line(city, street, world) {
    const m = MAPS[city.id], def = m.streets.find(s => s.id === street.id), f = fit(city);
    const tilt = m.grid.rot * Math.PI / 180;
    if (!def) return [m.lead || [f.node(m.start)[0] - 34 * Math.cos(tilt), f.node(m.start)[1] - 34 * Math.sin(tilt)], f.node(m.start)];
    if (def.back) return line(city, world.streets[def.back], world).slice().reverse();
    return [f.node(def.from), ...(def.via || []), f.node(def.to)];
  }

  // Straight twins (same two crossroads, opposite directions) are drawn as two lanes.
  function lanes(city, lines, world) {
    const m = MAPS[city.id], out = {};
    for (const [id, pts] of Object.entries(lines)) {
      const def = m.streets.find(s => s.id === id), twin = def && m.streets.find(t => t !== def && ((t.from === def.to && t.to === def.from) || (def.back && t.id === def.back) || (t.back === def.id)));
      if (!twin || pts.length !== 2) { out[id] = pts; continue; }
      const side = hash(id) < hash(twin.id) ? 1 : -1, [a, b] = pts, len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / len * 7 * side, ny = (b[0] - a[0]) / len * 7 * side;
      out[id] = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]];
    }
    return out;
  }

  const roadLines = (city, world) => lanes(city, Object.fromEntries(Object.values(world.streets).map(s => [s.id, line(city, s, world)])), world);

  // The stage, drawn as city blocks with the streets as the gaps between them. A tilted city turns its blocks with its streets.
  const stage = {};
  const blocks = city => stage[city.id] || (stage[city.id] = drawBlocks(city));
  function drawBlocks(city) {
    const out = [], g = MAPS[city.id].grid, c = Math.cos(g.rot * Math.PI / 180), sn = Math.sin(g.rot * Math.PI / 180);
    for (let b = -30; b < 30; b++) for (let a = -30; a < 50; a++) {
      const x = g.ox + (a + .5) * g.ga * c + (b + .5) * g.gb * sn, y = g.oy + (a + .5) * g.ga * sn - (b + .5) * g.gb * c;
      if (x < 40 || x > 1240 || y < 80 || y > 660) continue;
      out.push(`<rect class="blk t${hash(`${a},${b},${city.id}`) % 5}" x="${a * g.ga + 4}" y="${-(b + 1) * g.gb + 4}" width="${g.ga - 8}" height="${g.gb - 8}" rx="3"/>`);
    }
    return `<g transform="translate(${g.ox} ${g.oy}) rotate(${g.rot})">${out.join('')}</g>`;
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

  // The first part of a line, up to a fraction of its length.
  function head(pts, t) {
    const lens = spans(pts);
    let left = t * lens.reduce((a, b) => a + b, 0);
    const out = [pts[0]];
    for (let i = 0; i < lens.length; i++) {
      if (left <= lens[i]) { const f = lens[i] ? left / lens[i] : 0; out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]); return out; }
      out.push(pts[i + 1]); left -= lens[i];
    }
    return out;
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

  // Where text lands. A label's box is estimated from its font size and length, turned with the text; roads,
  // other labels and pins are kept out of it. TEXT is [font size, width per em, letter spacing] by class.
  const TEXT = { roadname: [21, .57, 0], areaname: [34, .62, 3], backstreet: [15, .52, 1], landmark: [20, .54, 0], pinlabel: [26, .58, 0], nodename: [24, .56, 0], youlabel: [26, .72, 0], gravelabel: [22, .5, 0], legend: [22, .53, 0] };
  const HALF_ROAD = 11;
  // A long name breaks into lines at the spaces nearest the even splits, two lines first, then three.
  function wrap(text, n = 2, max = 18) {
    if (text.length <= max) return [text];
    const spaces = [...text].map((c, i) => c === ' ' ? i : -1).filter(i => i > 0), cuts = [];
    for (let k = 1; k < n; k++) {
      const left = spaces.filter(i => !cuts.includes(i)).sort((i, j) => Math.abs(i - text.length * k / n) - Math.abs(j - text.length * k / n))[0];
      if (left !== undefined) cuts.push(left);
    }
    cuts.sort((i, j) => i - j);
    return [...cuts, text.length].map((c, i) => text.slice(i ? cuts[i - 1] + 1 : 0, c));
  }
  const lead = cls => TEXT[cls][0] * 1.15;
  function box(cls, text, x, y, rot = 0, anchor = 'middle') {
    const lines = Array.isArray(text) ? text : [text], [size, em, track] = TEXT[cls], w = Math.max(...lines.map(t => t.length)) * (size * em + track) + 7;
    const r = rot * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
    const corners = grow => {
      const x0 = (anchor === 'start' ? 0 : -w / 2) - grow, x1 = x0 + w + 2 * grow, y0 = -size * .78 - 3 - grow, y1 = size * .22 + 3 + grow + (lines.length - 1) * lead(cls);
      return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([u, v]) => [x + u * c - v * sn, y + u * sn + v * c]);
    };
    return { cls, text: lines.join(' '), lines, x, y, rot, anchor, poly: corners(0), wide: corners(HALF_ROAD) };
  }
  const squareAt = (x, y, r) => [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]];
  const axes = poly => poly.map((p, i) => { const q = poly[(i + 1) % poly.length]; return [q[1] - p[1], p[0] - q[0]]; });
  function overlap(P, Q) {
    for (const [nx, ny] of [...axes(P), ...axes(Q)]) {
      const u = P.map(p => p[0] * nx + p[1] * ny), v = Q.map(p => p[0] * nx + p[1] * ny);
      if (Math.max(...u) < Math.min(...v) || Math.max(...v) < Math.min(...u)) return false;
    }
    return true;
  }
  const onSheet = poly => poly.every(([x, y]) => x >= 6 && x <= 1274 && y >= 6 && y <= 714);
  const textAttrs = l => l.rot ? `transform="translate(${l.x} ${l.y}) rotate(${l.rot})"` : `x="${l.x}" y="${l.y}"`;
  const textSvg = l => `<text class="${l.cls}" ${textAttrs(l)}>${l.lines.length > 1 ? l.lines.map((t, i) => `<tspan x="${l.x}" dy="${i ? lead(l.cls) : 0}">${t}</tspan>`).join('') : l.text}</text>`;

  // The slice out on the street is its own character, as a sticker: bottom centre at (x, y), fitted in a box.
  function youImage({ style, topping }, x, y, box) {
    const S = root.PR_SPRITES, art = S.portrait(style, topping);
    if (!art) return '';
    const k = Math.min(box / art.width, box / art.height), w = Math.round(art.width * k), h = Math.round(art.height * k);
    return `<image href="${S.portraitUrl(style, topping)}" x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" style="image-rendering:pixelated"/>`;
  }

  const ring = turn => [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8].map(k => { const t = turn + k * Math.PI / 8; return [Math.sin(t), -Math.cos(t)]; });
  const UP = ring(0), DOWN = ring(Math.PI);

  // picked is the checkpoint chosen, live is the slice out on the street right now.
  function build(camp, { picked, live } = {}) {
    const city = R.currentCity(camp), world = camp.world, out = [], m = MAPS[city.id];
    const all = Object.values(world.streets).filter(s => s.id !== 'lead');
    const paper = root.PR_SPRITES.layer(`maps/${city.id}`);
    out.push(`<svg class="citymap" viewBox="0 0 1280 720">${paper ? `<image href="${paper.src}" width="1280" height="720" preserveAspectRatio="none"/>` : ''}`);
    const f = fit(city);
    const lines = roadLines(city, world), drawn = all.filter(s => s.role !== 'back');
    const roads = drawn.flatMap(s => lines[s.id].slice(1).map((p, i) => [lines[s.id][i], p]));
    const labels = [], marks = [];
    const clear = (l, soft) => onSheet(l.poly) && !roads.some(r => overlap(l.wide, r)) && !labels.some(o => !(soft && o.cls === 'roadname') && !o.dropped && overlap(l.poly, o.poly)) && !marks.some(k => overlap(l.poly, k));
    const put = l => { labels.push(l); return l; };
    // A label beside a marker: the first side with room, then farther out.
    // A checkpoint's own name outranks a road's: if the only room is under a road name, that road name waits.
    const spot = (cls, text, x, y, r, dirs) => {
      const [size, em, track] = TEXT[cls];
      let first;
      for (const pass of [0, 1]) for (const lines of [wrap(text), wrap(text, 3)]) {
        const w = Math.max(...lines.map(t => t.length)) * (size * em + track) + 7, tall = size + 6 + (lines.length - 1) * lead(cls), mid = (lines.length - 1) * lead(cls) / 2 - size * .28;
        for (const extra of [0, 12, 24, 40, 60, 90, 130, 180, 240]) for (const [ux, uy] of dirs) {
          const l = box(cls, lines, x + ux * (r + 8 + extra + w / 2 * Math.abs(ux)), y + uy * (r + 8 + extra + tall / 2 * Math.abs(uy)) - mid);
          first = first || l;
          if (clear(l, pass)) { for (const o of labels) if (o.cls === 'roadname' && overlap(l.poly, o.poly)) o.dropped = true; return put(l); }
        }
      }
      return put(first);
    };
    // Pins and checkpoints take their room before any road is named.
    for (const a of m.addresses) { const s = world.streets[a], p = along(lines[s.id], s.door / s.length); marks.push(squareAt(p.x, p.y, 30)); }
    for (const n of Object.values(m.nodes)) marks.push(squareAt(n.x, n.y, 26));
    const fixed = marks.slice();
    out.push('<rect class="wash" width="1280" height="720"/>');
    out.push(blocks(city));
    for (const k of m.features) out.push(`<polygon class="${k.kind}" points="${k.points.map(p => f(p).join(',')).join(' ')}"/>`);
    // Area names, back streets and landmarks sit where the map's author left room for them.
    city.areas.forEach((a, i) => {
      const l = put(box('areaname', wrap(a.name, 2, 14), m.areaLabels[i][0], m.areaLabels[i][1]));
      out.push(textSvg(l));
    });
    for (const [name, x, y, up] of m.backdrop) {
      const l = put(box('backstreet', name, x, y, m.grid.rot - (up ? 90 : 0)));
      out.push(`<text class="backstreet" ${textAttrs(l)}>${name}</text>`);
    }
    for (const k of m.landmarks) { const l = put(box('landmark', k.name, k.x, k.y)); out.push(`<text class="landmark" ${textAttrs(l)}>${k.name}</text>`); }
    // The legend runs along the foot of the sheet.
    const lost = lostSlices(world);
    for (const [t, x] of [['Next stop', 58], [live ? 'Checkpoints' : 'Tap to start here', 228], [`Slice lost${lost.length ? ' (' + lost.length + ')' : ''}`, 454]]) put(box('legend', t, x, 699, 0, 'start'));
    const shortcut = drawn.some(s => s.gated && !world.opened[s.id]);
    if (shortcut) put(box('legend', 'Closed shortcut', 954, 699, 0, 'start'));
    if (live) put(box('legend', 'You are here', 736, 699, 0, 'start'));
    for (const s of drawn) out.push(`<path class="casing" d="${path(lines[s.id])}"/>`);
    for (const s of drawn) {
      const blocked = s.gated && !world.opened[s.id];
      out.push(`<path class="road${blocked ? ' blocked' : ''}" d="${path(lines[s.id])}"/>`);
      out.push(arrows(lines[s.id], 'arrow'));
    }
    // A faint dotted line to the address, from wherever the next slice starts.
    const target = R.addressStreet(camp), from = live ? world.streets[live.street].to : picked;
    const here = live && live.street === target && live.x < world.streets[target].door;
    const route = here ? { path: [target] } : from ? R.routes(world, from, target) : null;
    // The route runs forward along each street and stops at the door of the address street.
    if (route) route.path.forEach(id => out.push(`<path class="routeline" d="${path(id === target ? head(lines[id], world.streets[id].door / world.streets[id].length) : lines[id])}"/>`));
    // A road split into stretches or two directions is named once, on its longest stretch with room.
    const named = new Map(), shown = new Set(all.filter(s => world.known[s.id]).map(s => s.name));
    for (const s of drawn.slice().sort((a, b) => b.length - a.length)) {
      if (named.get(s.name)) continue;
      named.set(s.name, null);
      const pts = lines[s.id], lens = spans(pts);
      find: for (const i of lens.map((len, k) => k).sort((p, q) => lens[q] - lens[p])) for (const t of [.5, .3, .7, .15, .85]) for (const side of [1, -1]) {
        const [p, q] = [pts[i], pts[i + 1]], x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
        let turn = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
        if (turn > 90) turn -= 180;
        if (turn < -90) turn += 180;
        const r = turn * Math.PI / 180, l = box('roadname', s.name, x + Math.sin(r) * 21 * side, y - Math.cos(r) * 21 * side, turn);
        if (clear(l)) { named.set(s.name, put(l)); break find; }
      }
    }
    const nameSlot = out.length;
    out.push('');
    // Only the next address is marked.
    const next = world.delivery, as = world.streets[m.addresses[next]];
    let pin = null;
    if (as) {
      const p = along(lines[as.id], as.door / as.length);
      pin = [p.x, p.y];
      out.push(`<g class="addr active" transform="translate(${p.x} ${p.y})"><circle r="27"/><text y="10">${next + 1}</text></g>`);
      const l = spot('pinlabel', city.areas[next].customer, p.x, p.y, 30, DOWN);
      out.push(textSvg(l));
    }
    for (const id of Object.keys(world.reached)) {
      const [x, y] = f([m.nodes[id].x, m.nodes[id].y]), on = id === picked;
      out.push(`<g class="check${on ? ' on' : ''}${picked === undefined ? ' still' : ''}" data-node="${id}"><circle class="hit" cx="${x}" cy="${y}" r="42"/><circle class="dot" cx="${x}" cy="${y}" r="${on ? 22 : 15}"/></g>`);
      if (on) { const l = spot('nodename', world.nodes[id].name, x, y, 27, UP); out.push(textSvg(l)); }
    }
    // Every place a slice was lost this attempt, the most recent one called out.
    lost.forEach((d, i) => {
      const s = world.streets[d.street], p = along(lines[s.id], d.x / s.length), last = i === lost.length - 1;
      out.push(`<g class="grave${last ? ' last' : ''}" transform="translate(${p.x} ${p.y})">${last ? '<circle class="halo" r="26"/>' : ''}<path class="mark" d="M0 -${last ? 19 : 15} L${last ? 19 : 15} 0 L0 ${last ? 19 : 15} L-${last ? 19 : 15} 0 Z"/><path class="cross" d="M-5 -5 L5 5 M5 -5 L-5 5"/></g>`);
      marks.push(squareAt(p.x, p.y, last ? 26 : 20));
    });
    if (lost.length) {
      const d = lost[lost.length - 1], s = world.streets[d.street], p = along(lines[s.id], d.x / s.length);
      const l = spot('gravelabel', 'Last lost slice', p.x, p.y, 26, DOWN);
      out.push(textSvg(l));
    }
    if (live) {
      const s = world.streets[live.street], p = along(lines[s.id], live.x / s.length);
      out.push(`<g class="you" transform="translate(${p.x} ${p.y})">${youImage(live, 0, 8, 56)}</g>`);
      marks.push(squareAt(p.x, p.y - 20, 30));
      const l = spot('youlabel', 'YOU', p.x, p.y - 20, 30, UP);
      out.push(textSvg(l));
    }
    out.push(`<g class="legend"><circle cx="40" cy="692" r="11" class="k-addr"/><text x="58" y="699">Next stop</text>
      <circle cx="210" cy="692" r="11" class="k-check"/><text x="228" y="699">${live ? 'Checkpoints' : 'Tap to start here'}</text>
      <path class="k-lost" d="M430 680 L442 692 L430 704 L418 692 Z"/><text x="454" y="699">Slice lost${lost.length ? ' (' + lost.length + ')' : ''}</text>${shortcut ? '<path class="k-shortcut" d="M900 692 H940"/><text x="954" y="699">Closed shortcut</text>' : ''}${live ? `<g transform="translate(700 700)">${youImage(live, 14, 0, 30)}</g><text x="736" y="699">You are here</text>` : ''}</g></svg>`);
    out[nameSlot] = [...named.values()].filter(l => l && !l.dropped && shown.has(l.text)).map(textSvg).join('');
    return { out, labels: labels.filter(l => !l.dropped), roads, marks: fixed };
  }

  const svg = (camp, opts) => build(camp, opts).out.join('');
  // What the map sets down and where, for the checks that keep text off the roads.
  const layout = (camp, opts) => { const { labels, roads, marks } = build(camp, opts); return { labels, roads, marks }; };

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

  root.PR_MAP = { svg, layout, box, overlap, closest, line, along, lostSlices, roadLines, head };
})(window);
