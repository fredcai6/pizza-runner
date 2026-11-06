// The corkboard: what happened, what has been learned, what the pizzas believe, and who is left.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES;
  const TABS = [['history', 'Attempts'], ['enemies', 'Enemies'], ['theory', 'Who is The Order?'], ['roster', 'Operatives']];

  const receiptHtml = r => `<div class="receipt">
    <div class="r-head">ORDER #${r.order}</div><div>PLACED: ${r.placed}</div>
    <div>DELIVER TO: <b>${r.to}</b></div><hr><div>${r.city}</div>
    ${(r.lines || []).map(l => `<div>${l}</div>`).join('')}
    ${r.instructions ? `<hr><div>NOTES: ${r.instructions}</div>` : ''}</div>`;

  function history(camp) {
    if (!camp.receipts.length) return '<p class="empty">Nothing yet.</p>';
    const papers = camp.papers.map(p => `<div class="paper">${p}</div>`).join('');
    return `<div class="pins">${camp.receipts.map((r, i) => `<button class="pin ${r.outcome}" data-receipt="${i}">#${r.n}<br>${r.city}${r.attempt > 1 ? ` (try ${r.attempt})` : ''}<br><b>${r.outcome === 'delivered' ? 'DONE' : r.outcome === 'cold' ? 'COLD' : 'EATEN'}</b></button>`).join('')}</div>${papers}`;
  }

  function enemies(camp) {
    return `<div class="pins">${Object.keys(C.ENEMIES).map(type => {
      const file = R.enemyFile(camp, type);
      return `<button class="polaroid" data-enemy="${type}"><div class="shot ${type}"></div><b>${file.name}</b><span>${file.notes.length ? `${file.notes.length} note${file.notes.length > 1 ? 's' : ''}` : '???'}</span></button>`;
    }).join('')}</div>`;
  }

  function theory(camp) {
    const notes = R.theory(camp).map((t, i) => `<div class="sticky s${i % 3}">${t.text}</div>`).join('');
    const names = R.aliases(camp).map(a => `<span class="alias">${a}</span>`).join('');
    return `<p class="hand">The Old Timer's theory, in his hand.</p><div class="stickies">${notes}</div>${names ? `<h4>Customer names. Aliases?</h4><div class="aliases">${names}</div>` : ''}`;
  }

  function roster(camp) {
    return `<div class="roster">${R.roster(camp).map(r => {
      const s = C.STYLES[r.style], city = C.CITIES.find(c => c.id === r.city).name;
      return `<div class="agent ${r.taped ? 'taped' : ''}"><b>${C.SPEAKERS[r.style]}</b><span>${s.name} of ${city}</span><span class="bio">${s.bio}</span><span>${s.specialName || 'No special'}</span>${r.taped ? '' : `<span>${r.left} of 6 left</span>`}${r.taped ? '<div class="tape">DEEP UNDERCOVER</div>' : ''}</div>`;
    }).join('')}</div>`;
  }

  const PAGES = { history, enemies, theory, roster };

  function open(host, camp, onClose) {
    let tab = 'history';
    const render = () => {
      host.classList.remove('hidden');
      host.innerHTML = `<div class="board"><div class="tabs">${TABS.map(([id, label]) => `<button class="tab${id === tab ? ' on' : ''}" data-tab="${id}">${label}</button>`).join('')}<button class="tab close">✕</button></div>
        <div class="page">${PAGES[tab](camp)}</div><div class="detail hidden"></div></div>`;
      host.scrollTop = 0;
      host.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
      host.querySelector('.close').onclick = onClose;
      const detail = host.querySelector('.detail');
      const pop = html => { detail.innerHTML = html; detail.classList.remove('hidden'); detail.onclick = () => detail.classList.add('hidden'); };
      host.querySelectorAll('[data-receipt]').forEach(b => { b.onclick = () => pop(receiptHtml(camp.receipts[b.dataset.receipt])); });
      host.querySelectorAll('[data-enemy]').forEach(b => {
        b.onclick = () => {
          const f = R.enemyFile(camp, b.dataset.enemy);
          pop(`<div class="file"><h3>${f.name}</h3><p class="claim">O.T.: ${f.claim}</p><h4>Seen in the field</h4>${f.notes.length ? f.notes.map(n => `<p>${n}</p>`).join('') : '<p>???</p>'}</div>`);
        };
      });
    };
    render();
  }

  root.PR_BOARD = { open, receiptHtml };
})(window);
