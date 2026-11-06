// The city map between slices: where she has been, where the address is, and where to start.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES;
  const SLOTS = [[0.06, 0.52], [0.42, 0.12], [0.9, 0.3], [0.72, 0.9]];
  const AREA = { w: 400, h: 500, x: 40, y: 110, gap: 410 };

  // Each area keeps the same shape, mirrored in turn so the city does not look like a stamp.
  function place(world, id) {
    const node = world.nodes[id];
    if (id === 'start') return [110, 680];
    const [u, v] = SLOTS[node.slot], flip = node.area % 2 ? 1 - v : v;
    return [AREA.x + node.area * AREA.gap + u * AREA.w, AREA.y + flip * AREA.h];
  }

  function curve(a, b, street) {
    const bend = street.role === 'link' || street.role === 'loop' ? 70 : street.role === 'alley' ? -40 : 24;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    return { d: `M${a[0]} ${a[1]} Q${mx - dy / len * bend} ${my + dx / len * bend} ${b[0]} ${b[1]}`, mid: [mx - dy / len * bend / 2, my + dx / len * bend / 2] };
  }

  function svg(camp, picked) {
    const city = R.currentCity(camp), world = camp.world, out = [];
    const paper = root.PR_SPRITES.layer(`maps/${city.id}`);
    out.push(`<svg class="citymap" viewBox="0 0 1280 720">${paper ? `<image href="${paper.src}" width="1280" height="720"/>` : ''}`);
    city.areas.forEach((a, i) => {
      out.push(`<text class="areaname" x="${AREA.x + i * AREA.gap + AREA.w / 2}" y="60">${a.name}</text>`);
    });
    for (const s of Object.values(world.streets)) {
      const line = curve(place(world, s.from), place(world, s.to), s);
      if (world.known[s.id]) {
        out.push(`<path class="road" d="${line.d}"/><path class="roadline" d="${line.d}"/>`);
        out.push(`<text class="roadname" x="${line.mid[0]}" y="${line.mid[1]}">${s.name}</text>`);
      } else if (world.reached[s.from]) {
        const a = place(world, s.from), b = line.mid, cut = [(a[0] * 2 + b[0]) / 3, (a[1] * 2 + b[1]) / 3];
        out.push(`<path class="stub" d="M${a[0]} ${a[1]} L${cut[0]} ${cut[1]}"/><text class="unknown" x="${cut[0]}" y="${cut[1] + 6}">${s.gated && !world.opened[s.id] ? '✕' : '?'}</text>`);
      }
    }
    // Every address is marked from the start. The roads to it are what she has to learn.
    city.areas.forEach((a, i) => {
      const s = world.streets[`${a.id}.door`], line = curve(place(world, s.from), place(world, s.to), s);
      const state = i < world.delivery ? 'done' : i === world.delivery ? 'active' : 'later';
      out.push(`<g class="addr ${state}" transform="translate(${line.mid[0]} ${line.mid[1]})"><circle r="26"/><text y="10">${state === 'done' ? '✓' : i + 1}</text></g>`);
      if (state === 'active') out.push(`<text class="pinlabel" x="${line.mid[0]}" y="${line.mid[1] + 58}">${a.customer}</text>`);
    });
    for (const id of Object.keys(world.reached)) {
      const [x, y] = place(world, id), on = id === picked;
      out.push(`<g class="check${on ? ' on' : ''}" data-node="${id}"><circle class="hit" cx="${x}" cy="${y}" r="42"/><circle class="dot" cx="${x}" cy="${y}" r="${on ? 20 : 14}"/><text class="nodename" x="${x}" y="${y - 28}">${world.nodes[id].name}</text></g>`);
    }
    out.push('</svg>');
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

  root.PR_MAP = { svg, closest, place };
})(window);
