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
  function scatter(items, { cell, salt, h, jit = 0.3, tape: tapes = true, notes = false }) {
    if (!items.length) return '';
    const { w: width, h: tall } = room(), avail = h || tall, rowH = cell[1] * 0.92;
    const fit = cols => { const rows = Math.ceil(items.length / cols); return { cols, rows, high: Math.round((rows - 1) * rowH + cell[1] + 40) }; };
    // Most readable layout: full size beats shrunk, and crowding the columns together costs more than shrinking.
    let best = null;
    for (let c = 2; c <= Math.max(2, items.length); c++) {
      if (width / c < cell[0] * 0.8 && c > 2) break;
      const f = fit(c), k = Math.min(1, avail / f.high), crowd = Math.min(1, width / c / (cell[0] * 0.95)), q = Math.max(FLOOR, k) * crowd * crowd;
      if (!best || q > best.q + 0.01) best = { ...f, k, q };
    }
    const { cols, rows, high } = best, k = Math.max(FLOOR, best.k), rnd = seeded(salt * 131 + items.length * 17 + 5), colW = width / cols;
    const spots = items.map((html, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = Math.max(2, Math.min(width - cell[0] - 2, c * colW + (colW - cell[0]) / 2 + (rnd() - 0.5) * colW * jit + (r % 2 ? colW * 0.1 : 0)));
      const y = 14 + r * rowH + rnd() * 16, tilt = (rnd() - 0.5) * 11, z = notes ? 1 + r : 1 + Math.floor(rnd() * 4), tape = rnd() < 0.3 && tapes;
      return `<div class="spot${tape ? ' taped' : ''}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;--tilt:${tilt.toFixed(1)}deg;z-index:${z}">${html}</div>`;
    });
    return `<div class="cork-fit" style="width:${Math.round(width * k)}px;height:${Math.round(high * k)}px"><div class="cork${notes ? ' notes' : ''}" style="height:${high}px;width:${width}px;transform:scale(${k.toFixed(3)})"><svg class="yarn"></svg>${spots.join('')}</div></div>`;
  }

  // Red yarn from pin to pin, each loop sagging under its own weight. On a page of notes the yarn runs along each
  // row only, and every sticky's writing starts below the lowest the yarn (or its pin) comes over it.
  function strings(host) {
    host.querySelectorAll('.cork').forEach(cork => {
      const svg = cork.querySelector('.yarn'), spots = [...cork.querySelectorAll('.spot')], notes = cork.classList.contains('notes');
      const pts = spots.map(e => [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + 8]);
      svg.setAttribute('width', cork.clientWidth); svg.setAttribute('height', cork.clientHeight);
      const segs = [];
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        if (notes ? Math.abs(b[1] - a[1]) > 60 || b[0] < a[0] : i % 6 === 0) continue;
        const sag = 18 + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.18;
        segs.push([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag], b]);
      }
      const d = segs.map(([a, c, b]) => `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]} `).join('');
      svg.innerHTML = `<path class="y-shadow" d="${d}" transform="translate(2 3)"/><path class="y-line" d="${d}"/><path class="y-glint" d="${d}" transform="translate(0 -1)"/>`;
      if (!notes) return;
      for (const spot of spots) {
        const note = spot.querySelector('.sticky');
        if (!note) continue;
        const x0 = spot.offsetLeft, x1 = x0 + spot.offsetWidth, top = spot.offsetTop;
        let low = top + 20;   // the pin and its shadow
        for (const [a, c, b] of segs.filter(([a]) => Math.abs(a[1] - top - 8) < 60)) for (let t = 0; t <= 1; t += 0.02) {   // its own row's yarn
          const x = (1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], y = (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1];
          if (x > x0 - 6 && x < x1 + 6) low = Math.max(low, y + 4);   // the yarn is 3 px with a shadow below
        }
        note.style.paddingTop = `${Math.ceil(low - top + 8)}px`;
      }
    });
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
  function theory(camp) {
    const sticky = (i, html, extra = '') => `<div class="sticky s${i % 3}${GREASY.includes(i) ? ` greasy g${1 + (i % 3)}` : ''}${extra}">${html}</div>`;
    const notes = R.theory(camp).map((t, i) => sticky(i, t.text));
    const names = R.aliases(camp);
    if (names.length) notes.push(sticky(notes.length, `Customer names. Aliases?<span>${names.join(', ')}</span>`, ' names'));
    return scatter(notes, { cell: window.innerHeight <= 420 ? [150, 196] : [176, 214], salt: 3, jit: 0.16, tape: false, notes: true });
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
