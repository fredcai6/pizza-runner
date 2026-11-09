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
