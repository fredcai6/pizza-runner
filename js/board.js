// The corkboard: what happened, what has been learned, what the pizzas believe, and who is left.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES;
  const TABS = [['history', 'Attempts'], ['enemies', 'Enemies'], ['theory', 'Who is The Order?'], ['roster', 'Operatives']];

  // Thermal paper: the print is inside .r-body so it can fade while the paper keeps its stains and torn edges.
  const receiptHtml = r => `<div class="receipt"><div class="r-body">
    <div class="r-head">ORDER #${r.order}</div><div>PLACED: ${r.placed}</div>
    <div>DELIVER TO: <b>${r.to}</b></div><hr><div>${r.city}</div>
    ${(r.lines || []).map(l => `<div>${l}</div>`).join('')}
    ${r.instructions ? `<hr><div>NOTES: ${r.instructions}</div>` : ''}</div></div>`;

  // Everything on the cork is pinned loosely: a seeded scatter with tilt and overlap, joined by sagging yarn.
  const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // The cork is laid out at full size, then scaled down (never below FLOOR) so the whole page fits the phone.
  const FLOOR = 0.62;
  const room = () => ({ w: Math.min(window.innerWidth - 56, 880), h: window.innerHeight - 84 });
  // tape: some notes are taped as well as pinned. notes: a page of stickies, each row laid over the one above (so a
  // sticky only ever covers the blank foot of the one behind it), with room made under the yarn (see strings).
  // head: a title pinned across the top of the cork, [html, height]; it scales with everything else.
  function scatter(items, { cell, salt, h, jit = 0.3, tape: tapes = true, notes = false, head = null }) {
    if (!items.length) return '';
    const { w: width, h: tall } = room(), avail = h || tall, rowH = cell[1] * 0.92;
    const top = head ? head[1] : 0, fit = cols => { const rows = Math.ceil(items.length / cols); return { cols, rows, high: Math.round(top + (rows - 1) * rowH + cell[1] + 40) }; };
    // Most readable layout: full size beats shrunk, and crowding the columns together costs more than shrinking.
    let best = null;
    for (let c = 2; c <= Math.max(2, items.length); c++) {
      if (width / c < cell[0] * 0.8 && c > 2) break;
      const f = fit(c), k = Math.min(1, avail / f.high), crowd = Math.min(1, width / c / (cell[0] * 0.95)), q = Math.max(FLOOR, k) * crowd * crowd;
      if (!best || q > best.q + 0.01 || (q > best.q - 0.01 && k > best.k)) best = { ...f, k, q };   // at the floor, the one that shrinks least
    }
    const { cols, rows, high } = best, k = Math.max(FLOOR, best.k), rnd = seeded(salt * 131 + items.length * 17 + 5), colW = width / cols;
    const spots = items.map((html, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = Math.max(2, Math.min(width - cell[0] - 2, c * colW + (colW - cell[0]) / 2 + (rnd() - 0.5) * colW * jit + (r % 2 ? colW * 0.1 : 0)));
      const y = top + 14 + r * rowH + rnd() * (notes ? 34 : 16), tilt = (rnd() - 0.5) * 11, z = notes ? 1 + r : 1 + Math.floor(rnd() * 4), tape = rnd() < 0.3 && tapes;
      return `<div class="spot${tape ? ' taped' : ''}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;--tilt:${tilt.toFixed(1)}deg;z-index:${z}">${html}</div>`;
    });
    return `<div class="cork-fit" style="width:${Math.round(width * k)}px;height:${Math.round(high * k)}px"><div class="cork${notes ? ' notes' : ''}" style="height:${high}px;width:${width}px;transform:scale(${k.toFixed(3)})">${head ? head[0] : ''}<svg class="yarn"></svg>${spots.join('')}</div></div>`;
  }

  // Red yarn from pin to pin, each loop sagging under its own weight.
  const quad = ([a, c, b], t) => [(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]];
  const pathOf = segs => segs.map(([a, c, b]) => `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]} `).join('');
  const draw = (svg, segs, w, h) => {
    const d = pathOf(segs);
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.innerHTML = d ? `<path class="y-shadow" d="${d}" transform="translate(2 3)"/><path class="y-line" d="${d}"/><path class="y-glint" d="${d}" transform="translate(0 -1)"/>` : '';
  };
  function strings(host) {
    host.querySelectorAll('.cork').forEach(cork => {
      const svg = cork.querySelector('.yarn'), spots = [...cork.querySelectorAll('.spot')];
      const pts = spots.map(e => [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + 8]);
      if (cork.classList.contains('notes')) return web(cork, svg, spots, pts);
      const segs = [];
      for (let i = 1; i < pts.length; i++) {
        if (i % 6 === 0) continue;
        const [a, b] = [pts[i - 1], pts[i]], sag = 18 + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.18;
        segs.push([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag], b]);
      }
      draw(svg, segs, cork.clientWidth, cork.clientHeight);
    });
  }

  // A page of notes is strung as a web: each pin to its two nearest, most also to the nearest pin in another row, and
  // now and then one further off. A strand goes over the stickies when it crosses the writing steeply (it nicks a word
  // on a line or two), and behind them when it would run along the writing, so no whole line is ever covered.
  const ALONG = 46, DOWN = 44;   // most a strand may run sideways, or down (about two lines), across one note's writing and stay on top
  function web(cork, svg, spots, pts) {
    const rnd = seeded(pts.length * 977 + 13), edges = new Map();
    pts.forEach((p, i) => {
      const near = pts.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]);
      const pick = near.slice(0, 2), other = near.find(([, j]) => Math.abs(pts[j][1] - p[1]) > 60 && Math.abs(pts[j][0] - p[0]) > 70);
      if (other && rnd() < 0.75) pick.push(other);
      if (near[2] && rnd() < 0.3) pick.push(near[2 + Math.floor(rnd() * Math.min(2, near.length - 2))]);
      for (const [, j] of pick) edges.set(i < j ? `${i}-${j}` : `${j}-${i}`, [Math.min(i, j), Math.max(i, j)]);
    });
    const text = spots.map(spot => {
      const n = spot.querySelector('.sticky'), cs = getComputedStyle(n);
      return { x0: spot.offsetLeft + parseFloat(cs.paddingLeft), x1: spot.offsetLeft + n.offsetWidth - parseFloat(cs.paddingRight), y0: spot.offsetTop + parseFloat(cs.paddingTop), y1: spot.offsetTop + n.offsetHeight - parseFloat(cs.paddingBottom) };
    });
    const over = [], under = [];
    for (const [i, j] of edges.values()) {
      const [a, b] = [pts[i], pts[j]], len = Math.hypot(b[0] - a[0], b[1] - a[1]), sag = 8 + len * 0.07;
      const seg = [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag], b];
      const along = text.map(() => 0), down = text.map(() => 0);
      let last = quad(seg, 0);
      for (let t = 0.02; t <= 1.0001; t += 0.02) {
        const q = quad(seg, t);
        text.forEach((r, k) => { if (q[0] > r.x0 && q[0] < r.x1 && q[1] > r.y0 - 3 && q[1] < r.y1) { along[k] += Math.abs(q[0] - last[0]); down[k] += Math.abs(q[1] - last[1]); } });
        last = q;
      }
      (Math.max(...along) <= ALONG && Math.max(...down) <= DOWN ? over : under).push(seg);
    }
    let low = cork.querySelector('.yarn.low');
    if (!low) { low = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); low.setAttribute('class', 'yarn low'); cork.prepend(low); }
    draw(svg, over, cork.clientWidth, cork.clientHeight);
    draw(low, under, cork.clientWidth, cork.clientHeight);
  }

  function history(camp) {
    if (!camp.receipts.length) return '<p class="empty">Nothing yet.</p>';
    const papers = camp.papers.map(p => `<div class="paper">${p}</div>`);
    const slips = camp.receipts.map((r, i) => `<button class="pin ${r.outcome}" data-receipt="${i}">#${r.n}<br>${r.city}${r.attempt > 1 ? ` (try ${r.attempt})` : ''}<br><b>${r.outcome === 'delivered' ? 'DONE' : r.outcome === 'cold' ? 'COLD' : 'EATEN'}</b></button>`);
    return scatter([...slips, ...papers], { cell: [150, 110], salt: 1 });
  }

  function enemies(camp) {
    return scatter(Object.keys(C.ENEMIES).map(type => {
      const file = R.enemyFile(camp, type);
      // Tommy's painted Polaroids (the ones on the board in the briefing), with a paper label pinned under each.
      return `<button class="polaroid painted" data-enemy="${type}"><img src="assets/cutscenes/board/polaroid-${type}.webp" alt=""><span class="label"><b>${file.name}</b><span>${file.notes.length ? `${file.notes.length} note${file.notes.length > 1 ? 's' : ''}` : '???'}</span></span></button>`;
    }), { cell: [170, 180], salt: 2 });
  }

  // Just the stickies, in Dayold's scrawl: his notes, and one more listing the customer names he thinks are aliases.
  // A few have had a slice set down on them. No tape; the yarn runs over the top and the writing starts below it.
  const GREASY = [1, 4, 6];
  // Scrawl: every word sits a little off the line, tilted and sized its own way, and now and then a word starts further
  // in, as a hand writes in a hurry. Seeded per note, so a note looks the same each time.
  function scrawl(text, seed) {
    const rnd = seeded(seed * 7919 + 101);
    return text.split(' ').map((w, i) => {
      const dy = ((rnd() - 0.5) * 6).toFixed(1), r = ((rnd() - 0.5) * 7).toFixed(1), k = (0.9 + rnd() * 0.22).toFixed(2);
      const gap = i && rnd() < 0.18 ? ` style="margin-left:${(4 + rnd() * 10).toFixed(0)}px;--dy:${dy}px;--r:${r}deg;--k:${k}"` : ` style="--dy:${dy}px;--r:${r}deg;--k:${k}"`;
      return `<span class="w"${gap}>${w}</span>`;
    }).join(' ');
  }
  function theory(camp) {
    const sticky = (i, html, extra = '') => `<div class="sticky s${i % 3}${GREASY.includes(i) ? ` greasy g${1 + (i % 3)}` : ''}${extra}" style="--indent:${[4, 0, 10, 2, 7][i % 5]}px">${html}</div>`;
    const notes = R.theory(camp).filter(t => !t.title).map((t, i) => sticky(i, scrawl(t.text, i + 1)));
    const names = R.aliases(camp);
    if (names.length) notes.push(sticky(notes.length, `${scrawl('Customer names. Aliases?', 40)}<span>${scrawl(names.join(', '), 41)}</span>`, ' names'));
    // The title is the torn-paper banner cut from Tommy's painted board room (art/paper/order_banner.py), pinned up top.
    const banner = '<div class="order-banner"><img src="assets/paper/order-banner.png" alt="Who is The Order?"></div>';
    return scatter(notes, { cell: window.innerHeight <= 420 ? [150, 196] : [176, 214], salt: 3, jit: 0.42, tape: false, notes: true, head: [banner, window.innerHeight <= 420 ? 84 : 96] });
  }

  function roster(camp) {
    return scatter(R.roster(camp).map(r => {
      const s = C.STYLES[r.style], city = C.CITIES.find(c => c.id === r.city).name;
      const pie = camp.pies[r.city], pic = root.PR_SPRITES.portraitUrl(r.style, pie && pie.topping);
      return `<div class="agent ${r.taped ? 'taped' : ''}"><img class="agentpic" src="${pic}" alt=""><b>${C.SPEAKERS[r.style]}</b><span>${s.name} of ${city}</span><span class="bio">${s.bio}</span><span>${s.specialName || 'No special'}</span>${r.taped ? '' : `<span>${r.left} of 6 left</span>`}${r.taped ? '<div class="tape">DEEP UNDERCOVER</div>' : ''}</div>`;
    }), { cell: [170, 190], salt: 5, jit: 0 });
  }

  const PAGES = { history, enemies, theory, roster };

  function open(host, camp, onClose) {
    let tab = 'history';
    const render = () => {
      host.classList.remove('hidden');
      host.innerHTML = `<div class="board"><div class="tabs">${TABS.map(([id, label]) => `<button class="tab${id === tab ? ' on' : ''}" data-tab="${id}">${label}</button>`).join('')}<button class="tab close">✕</button></div>
        <div class="page">${PAGES[tab](camp)}</div><div class="detail hidden"></div></div>`;
      host.scrollTop = 0;
      strings(host);
      host.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
      host.querySelector('.close').onclick = onClose;
      const detail = host.querySelector('.detail');
      const pop = html => { detail.innerHTML = html; detail.classList.remove('hidden'); detail.onclick = () => detail.classList.add('hidden'); };
      host.querySelectorAll('[data-receipt]').forEach(b => { b.onclick = () => pop(receiptHtml(camp.receipts[b.dataset.receipt])); });
      host.querySelectorAll('[data-enemy]').forEach(b => {
        b.onclick = () => {
          const f = R.enemyFile(camp, b.dataset.enemy);
          pop(`<div class="file"><h3>${f.name}</h3><p class="claim">Sgt. Dayold: ${f.claim}</p><h4>Seen in the field</h4>${f.notes.length ? f.notes.map(n => `<p>${n}</p>`).join('') : '<p>???</p>'}</div>`);
        };
      });
    };
    render();
  }

  root.PR_BOARD = { open, receiptHtml };
})(window);
