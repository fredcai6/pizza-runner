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
  function scatter(items, { cell, salt }) {
    if (!items.length) return '';
    const rnd = seeded(salt * 131 + items.length * 17 + 5), width = Math.min(window.innerWidth - 40, 880);
    const cols = Math.max(2, Math.min(Math.floor(width / (cell[0] * 1.2)), Math.ceil(Math.sqrt(items.length * 1.6)))), colW = width / cols, rowH = cell[1] * 0.8, rows = Math.ceil(items.length / cols);
    const spots = items.map((html, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = Math.max(2, Math.min(width - cell[0] - 2, c * colW + (colW - cell[0]) / 2 + (rnd() - 0.5) * colW * 0.5 + (r % 2 ? colW * 0.22 : 0)));
      const y = 14 + r * rowH + rnd() * 16, tilt = (rnd() - 0.5) * 11, z = 1 + Math.floor(rnd() * 4), tape = rnd() < 0.3;
      return `<div class="spot${tape ? ' taped' : ''}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;--tilt:${tilt.toFixed(1)}deg;z-index:${z}">${html}</div>`;
    });
    return `<div class="cork" style="height:${Math.round(rows * rowH + cell[1] + 24)}px;width:${width}px"><svg class="yarn"></svg>${spots.join('')}</div>`;
  }

  // Red yarn from pin to pin, each loop sagging under its own weight.
  function strings(host) {
    host.querySelectorAll('.cork').forEach(cork => {
      const svg = cork.querySelector('.yarn'), pts = [...cork.querySelectorAll('.spot')].map(e => [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + 8]);
      svg.setAttribute('width', cork.clientWidth); svg.setAttribute('height', cork.clientHeight);
      let d = '';
      for (let i = 1; i < pts.length; i++) {
        if (i % 6 === 0) continue;
        const [a, b] = [pts[i - 1], pts[i]], sag = 18 + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.18;
        d += `M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 + sag} ${b[0]} ${b[1]} `;
      }
      svg.innerHTML = `<path class="y-shadow" d="${d}" transform="translate(2 3)"/><path class="y-line" d="${d}"/><path class="y-glint" d="${d}" transform="translate(0 -1)"/>`;
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
      return `<button class="polaroid" data-enemy="${type}"><div class="shot ${type}"></div><b>${file.name}</b><span>${file.notes.length ? `${file.notes.length} note${file.notes.length > 1 ? 's' : ''}` : '???'}</span></button>`;
    }), { cell: [140, 170], salt: 2 });
  }

  function theory(camp) {
    const notes = R.theory(camp).map((t, i) => `<div class="sticky s${i % 3}">${t.text}</div>`);
    const names = R.aliases(camp).map(a => `<span class="alias">${a}</span>`);
    return `<p class="hand">Sergeant Dayold's theory, in his hand.</p>${scatter(notes, { cell: [150, 100], salt: 3 })}${names.length ? `<h4>Customer names. Aliases?</h4>${scatter(names, { cell: [150, 34], salt: 4 })}` : ''}`;
  }

  function roster(camp) {
    return scatter(R.roster(camp).map(r => {
      const s = C.STYLES[r.style], city = C.CITIES.find(c => c.id === r.city).name;
      const pie = camp.pies[r.city], pic = root.PR_SPRITES.portraitUrl(r.style, pie && pie.topping);
      return `<div class="agent ${r.taped ? 'taped' : ''}"><img class="agentpic" src="${pic}" alt=""><b>${C.SPEAKERS[r.style]}</b><span>${s.name} of ${city}</span><span class="bio">${s.bio}</span><span>${s.specialName || 'No special'}</span>${r.taped ? '' : `<span>${r.left} of 6 left</span>`}${r.taped ? '<div class="tape">DEEP UNDERCOVER</div>' : ''}</div>`;
    }), { cell: [170, 150], salt: 5 });
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
