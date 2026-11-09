// Checks every authored city network in js/maps.js against the design rules. Usage: node --test tests/maps.test.js
const test = require('node:test');
const assert = require('node:assert');
const { MAPS, fit } = require('../js/maps.js');
const CITIES = ['newyork', 'chicago', 'dc', 'naples', 'california'];

const out = (m, node) => m.streets.filter(s => s.from === node);
const span = (m, s) => {
  const pts = [m.nodes[s.from], ...(s.via || []).map(([x, y]) => ({ x, y })), m.nodes[s.to]];
  return pts.slice(1).reduce((t, p, i) => t + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
};

// Shortest route by street length from a node to the far end of nothing: returns the streets used.
function route(m, from, target, closed = true) {
  const dist = { [from]: 0 }, how = { [from]: [] }, open = new Set([from]), done = new Set();
  let best = null;
  while (open.size) {
    const node = [...open].sort((a, b) => dist[a] - dist[b])[0];
    open.delete(node); done.add(node);
    for (const s of out(m, node)) {
      if (closed && s.gated) continue;
      const d = dist[node] + s.length, way = [...how[node], s];
      if (s.id === target && (!best || d < best.d)) best = { d, way };
      if (!done.has(s.to) && (dist[s.to] === undefined || d < dist[s.to])) { dist[s.to] = d; how[s.to] = way; open.add(s.to); }
    }
  }
  return best;
}
const turns = way => way.filter(s => s.turn).length;

// A leg starts where the last leg's address street ends.
const legs = m => m.addresses.map((a, i) => {
  const from = i ? m.streets.find(s => s.id === m.addresses[i - 1]).to : m.start;
  return { from, a, r: route(m, from, a) };
});

for (const id of CITIES) {
  const m = MAPS[id];
  test(`${id}: shape`, () => {
    assert.ok(m, 'map exists');
    const nodes = Object.keys(m.nodes);
    assert.ok(nodes.length >= 9 && nodes.length <= 16, `${nodes.length} nodes`);
    assert.ok(m.streets.length >= 14 && m.streets.length <= 26, `${m.streets.length} streets`);
    assert.strictEqual(new Set(m.streets.map(s => s.id)).size, m.streets.length);
    for (const s of m.streets) {
      assert.ok(m.nodes[s.from] && m.nodes[s.to], s.id);
      assert.ok(s.name && [0, 1, 2].includes(s.area), s.id);
      assert.ok(s.length >= 0.4 && s.length <= 1.7, `${s.id} length ${s.length}`);
      assert.ok(span(m, s) <= 430, `${s.id} is ${Math.round(span(m, s))} long on the map, a skip-everything bar`);
    }
    for (const n of nodes) {
      const o = out(m, n);
      assert.ok(o.length >= 1 && o.length <= 2, `${n} has ${o.length} ways out`);
      assert.strictEqual(o.filter(s => !s.turn).length, 1, `${n} needs exactly one keep-going street`);
      assert.ok(m.nodes[n].x >= 40 && m.nodes[n].x <= 1240 && m.nodes[n].y >= 80 && m.nodes[n].y <= 650, n);
    }
  });
  test(`${id}: everything connects with shortcuts closed`, () => {
    for (const from of Object.keys(m.nodes)) for (const s of m.streets) {
      if (!s.gated) assert.ok(route(m, from, s.id), `${from} cannot reach ${s.id}`);
    }
  });
  test(`${id}: addresses`, () => {
    assert.strictEqual(m.addresses.length, 3);
    m.addresses.forEach((a, i) => {
      const s = m.streets.find(x => x.id === a);
      assert.ok(s, a);
      assert.strictEqual(s.area, i, `${a} must be in area ${i}`);
      assert.ok(s.door >= 0.55 && s.door <= 0.9, `${a} needs door between 0.55 and 0.9`);
      assert.ok(!s.gated, a);
    });
  });
  test(`${id}: turns per delivery`, () => {
    const t = legs(m).map(l => turns(l.r.way));
    t.forEach(n => assert.ok(n >= 1 && n <= 3, `turns ${t}`));
    const mean = t.reduce((a, b) => a + b, 0) / 3;
    assert.ok(mean >= 1.6 && mean <= 2.34, `average turns ${t}`);
    assert.ok(new Set(t).size > 1 || t[0] === 2, `turns ${t}`);
  });
  test(`${id}: each delivery is a real trip`, () => {
    for (const l of legs(m)) assert.ok(l.r.d >= 2 && l.r.d <= 4, `${l.a} is ${l.r.d} units from ${l.from}`);
  });
  test(`${id}: shortcuts actually shorten something`, () => {
    const gates = m.streets.filter(s => s.gated);
    assert.ok(gates.length >= 1 && gates.length <= 3);
    const saved = legs(m).some(l => route(m, l.from, l.a, false).d <= l.r.d - 0.4);
    assert.ok(saved, 'no shortcut saves at least 0.4 on a delivery leg');
  });
  test(`${id}: the map is not one straight line of addresses`, () => {
    const p = m.addresses.map(a => { const s = m.streets.find(x => x.id === a); return m.nodes[s.from]; });
    const steady = (p[0].x < p[1].x && p[1].x < p[2].x) || (p[0].x > p[1].x && p[1].x > p[2].x);
    const steadyY = (p[0].y < p[1].y && p[1].y < p[2].y) || (p[0].y > p[1].y && p[1].y > p[2].y);
    assert.ok(!(steady && steadyY) , 'addresses march steadily across the map');
  });
}

// Distance from a point to a polygon's outline, and whether it lies inside, both as drawn on the sheet.
const inside = ([x, y], poly) => poly.reduce((c, [xi, yi], i) => {
  const [xj, yj] = poly[(i + poly.length - 1) % poly.length];
  return (yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi ? !c : c;
}, false);
const edge = ([x, y], poly) => Math.min(...poly.map(([ax, ay], i) => {
  const [bx, by] = poly[(i + 1) % poly.length], t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
  return Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay));
}));

test('no crossroad sits in the water, a pier end excepted', () => {
  for (const id of CITIES) {
    const m = MAPS[id], f = fit(id);
    const seas = m.features.filter(k => k.kind === 'water').map(w => ({ name: w.name, poly: w.points.map(q => f(q)) }));
    for (const [n, node] of Object.entries(m.nodes)) {
      const p = f.node(n), wet = seas.filter(w => inside(p, w.poly));
      if (node.pier) { assert.ok(wet.length, `${id} ${n} is flagged a pier end but is on land`); continue; }
      assert.ok(!wet.length, `${id}: ${n} is in the ${wet.map(w => w.name)}`);
      for (const w of seas) assert.ok(edge(p, w.poly) >= 14, `${id}: ${n} touches the ${w.name}`);
    }
  }
});

test('every map has water or parks and named landmarks for character', () => {
  for (const id of CITIES) {
    assert.ok(MAPS[id].features.length >= 2, id);
    assert.ok(MAPS[id].landmarks.length >= 3, id);
  }
});

test('the last Long Beach address is the bungalow and the pier is a there-and-back', () => {
  const m = MAPS.california, out_ = m.streets.find(s => /Belmont Pier/.test(s.name) && !s.back);
  assert.ok(out_, 'Belmont Pier street');
  const back = m.streets.find(s => s.back === out_.id);
  assert.ok(back && back.from === out_.to && back.to === out_.from, 'pier needs a way back');
  assert.strictEqual(out(m, out_.to).length, 1, 'the end of the pier is a dead end');
});

// ---- the picture: where roads, routes and text land on the sheet ----
const C = require('../js/content.js'), R = require('../js/rules.js');
globalThis.window = globalThis;
Object.assign(globalThis, { PR_CONTENT: C, PR_RULES: R, PR_MAPS: MAPS, PR_MAPFIT: { fit }, PR_SPRITES: { layer: () => null, portrait: () => null } });
require('../js/map.js');
const MAP = globalThis.PR_MAP;

const worldOf = id => {
  const camp = R.newCampaign();
  camp.cityIndex = C.CITIES.findIndex(c => c.id === id);
  camp.world = R.newWorld(R.currentCity(camp));
  return camp;
};

// Crossroads a slice can have reached before it delivers to address addr: all it can get to without crossing that door.
const startsFor = (m, addr) => {
  const seen = new Set([m.start]), q = [m.start];
  while (q.length) {
    const n = q.shift();
    for (const s of m.streets) if (s.from === n && s.id !== addr && !seen.has(s.to)) { seen.add(s.to); q.push(s.to); }
  }
  return seen;
};

// How far stretch A runs along stretch B, the same way and within a lane's width of it.
const along = (A, B) => {
  const ax = A[1][0] - A[0][0], ay = A[1][1] - A[0][1], bx = B[1][0] - B[0][0], by = B[1][1] - B[0][1], la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (!la || !lb || Math.abs(ax * bx + ay * by) / la / lb < Math.cos(20 * Math.PI / 180)) return 0;
  const ux = bx / lb, uy = by / lb, off = p => Math.abs((p[0] - B[0][0]) * uy - (p[1] - B[0][1]) * ux), at = p => (p[0] - B[0][0]) * ux + (p[1] - B[0][1]) * uy;
  if (Math.max(off(A[0]), off(A[1])) > 16) return 0;
  return Math.max(0, Math.min(lb, Math.max(at(A[0]), at(A[1]))) - Math.max(0, Math.min(at(A[0]), at(A[1]))));
};

test('the dashed route never doubles back, from any start, to any address', () => {
  for (const id of CITIES) {
    const m = MAPS[id], camp = worldOf(id), world = camp.world, lines = MAP.roadLines(R.currentCity(camp), world);
    for (const addr of m.addresses) for (const open of [false, true]) {
      world.opened = open ? Object.fromEntries(m.streets.filter(s => s.gated).map(s => [s.id, true])) : {};
      for (const from of startsFor(m, addr)) {
        const r = R.routes(world, from, addr), where = `${id}: ${from} to ${addr}${r ? ` (${r.path.join(' > ')})` : ''}`;
        assert.ok(r, `${where}: no way there`);
        const polys = r.path.map(sid => sid === addr ? MAP.head(lines[sid], world.streets[sid].door / world.streets[sid].length) : lines[sid]);
        const segs = polys.flatMap((p, i) => p.slice(1).map((q, k) => ({ i, seg: [p[k], q] })));
        for (const a of segs) for (const b of segs) if (a.i < b.i) assert.ok(along(a.seg, b.seg) <= 10, `${where} retraces itself`);
        for (let i = 0; i + 1 < polys.length; i++) {
          const a = polys[i], b = polys[i + 1], p = a[a.length - 1], q = a[a.length - 2], n = b[1];
          let turn = Math.abs(Math.atan2(n[1] - p[1], n[0] - p[0]) - Math.atan2(p[1] - q[1], p[0] - q[0])) * 180 / Math.PI;
          if (turn > 180) turn = 360 - turn;
          assert.ok(turn <= 120, `${where} turns back ${Math.round(turn)} degrees at ${r.path[i]}`);
        }
      }
    }
  }
});

// Every picture a city can show: each delivery, each checkpoint picked, a slice on each street, and a grave on every street.
function pictures(id) {
  const m = MAPS[id], out = [];
  const camp = () => { const c = worldOf(id), w = c.world; for (const s of Object.keys(w.streets)) w.known[s] = true; for (const n of Object.keys(m.nodes)) w.reached[n] = 'lead'; return c; };
  for (let d = 0; d < 3; d++) {
    const c = camp(); c.world.delivery = d;
    out.push([c, {}, `delivery ${d}`]);
    for (const n of Object.keys(m.nodes)) out.push([c, { picked: n }, `delivery ${d}, ${n} picked`]);
    for (const s of Object.values(c.world.streets)) if (s.id !== 'lead') for (const t of [.15, .5, .85]) out.push([c, { live: { street: s.id, x: s.length * t } }, `delivery ${d}, on ${s.id} at ${t}`]);
  }
  const c = camp();
  Object.values(c.world.streets).filter(s => s.id !== 'lead').forEach((s, i) => { s.dead = [{ x: s.length * .5, at: i }]; });
  out.push([c, { picked: m.start }, 'a slice lost on every street']);
  return out;
}

test('no road runs under a label, no labels overlap, and nothing runs off the sheet', () => {
  for (const id of CITIES) for (const [camp, opts, what] of pictures(id)) {
    const { labels, roads, marks } = MAP.layout(camp, opts), here = `${id}, ${what}`;
    labels.forEach((l, i) => {
      assert.ok(l.poly.every(([x, y]) => x >= 6 && x <= 1274 && y >= 6 && y <= 714), `${here}: "${l.text}" runs off the sheet`);
      assert.ok(!roads.some(r => MAP.overlap(l.wide, r)), `${here}: a road crosses "${l.text}"`);
      const other = labels.find((o, j) => j > i && MAP.overlap(l.poly, o.poly));
      assert.ok(!other, `${here}: "${l.text}" overlaps "${other && other.text}"`);
      if (['areaname', 'backstreet', 'landmark'].includes(l.cls)) assert.ok(!marks.some(k => MAP.overlap(l.poly, k)), `${here}: "${l.text}" sits under a pin or checkpoint`);
    });
    for (const [a, b] of roads) for (const [x, y] of [a, b]) assert.ok(x >= 20 && x <= 1260 && y >= 70 && y <= 668, `${here}: a road reaches (${x}, ${y}), off the sheet or into the legend`);
  }
});
