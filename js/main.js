// The loop between runs: comic, pie, wheel, street, receipt.
(function () {
  const C = window.PR_CONTENT, R = window.PR_RULES, P = window.PR_PLAY;
  const SAVE = 'pizzaRunnerSave';
  const $ = id => document.getElementById(id);
  const screen = $('screen'), canvas = $('stage'), controls = $('controls');
  const debug = new URLSearchParams(location.search).has('debug');
  let camp = load(), run = null;

  function load() { try { return JSON.parse(localStorage.getItem(SAVE)); } catch { return null; } }
  function save() { localStorage.setItem(SAVE, JSON.stringify(camp)); }

  function show(html, actions = []) {
    controls.classList.add('hidden');
    screen.classList.remove('hidden');
    screen.innerHTML = `<div class="sheet">${html}<div class="actions"></div></div>`;
    screen.scrollTop = 0;
    const row = screen.querySelector('.actions');
    for (const [label, fn, cls] of actions) {
      const b = document.createElement('button');
      b.textContent = label; if (cls) b.className = cls; b.onclick = fn;
      row.appendChild(b);
    }
  }

  const panels = list => `<div class="comic">${list.map(t => `<div class="panel">${t}</div>`).join('')}</div>`;

  function receiptHtml(r, real = false) {
    return `<div class="receipt${real ? ' real' : ''}">
      <div class="r-head">THE ORDER</div><div>ORDER #${r.order}</div><div>PLACED: ${r.date}</div>
      <div>DELIVER TO: <b>${r.to}</b></div><hr><div>${r.city}</div>
      ${r.lines.map(l => `<div>${l}</div>`).join('')}</div>`;
  }

  function title() {
    const acts = [];
    if (camp) acts.push(['Continue', route]);
    acts.push([camp ? 'New order' : 'Start your order', () => { camp = R.newCampaign(); save(); route(); }]);
    show(`<h1>PIZZA RUNNER</h1><p class="sub">Hot. Boxed. Late.</p>`, acts);
  }

  function route() {
    save();
    if (camp.phase === 'intro') return intro();
    if (camp.phase === 'finale-intro') return finaleIntro();
    if (camp.phase === 'slice') return pickSlice();
    if (camp.phase === 'ending') return ending();
  }

  function intro() {
    const city = R.currentCity(camp), st = C.STYLES[city.style];
    show(`<h2>${city.name}</h2>${panels(city.panels)}
      <p><b>${st.name}.</b> ${st.blurb}</p>`, [['Build the pie', () => pieBuilder(city)]]);
  }

  function pieBuilder(city) {
    const pick = { a: city.pantry[0], b: city.pantry[0] };
    const render = () => {
      const col = side => `<div class="side"><h3>${side === 'a' ? 'Slices 1-3' : 'Slices 4-6'}</h3>${city.pantry.map(t => {
        const on = pick[side] === t;
        return `<button class="top${on ? ' on' : ''}" data-side="${side}" data-t="${t}"><i style="background:${C.TOPPINGS[t].color}"></i>${C.TOPPINGS[t].name}</button>`;
      }).join('')}</div>`;
      show(`<h2>Build your pie</h2><p>Whole pie or half and half.</p><div class="pie">${col('a')}${col('b')}</div>
        <p class="blurb">${C.TOPPINGS[pick.a].blurb}${pick.a !== pick.b ? ' ' + C.TOPPINGS[pick.b].blurb : ''}</p>`,
        [['Box it', () => confirmPie(city, pick)]]);
      screen.querySelectorAll('.top').forEach(b => { b.onclick = () => { pick[b.dataset.side] = b.dataset.t; render(); }; });
    };
    render();
  }

  function confirmPie(city, pick) {
    R.startCity(camp, pick.a, pick.b);
    // In the last city the Order already has your choice on file, dated before you made it.
    if (city.tier >= 3) {
      const r = { order: C.ORDER_NUMBER, date: '08/25/????', to: 'KATE?', city: city.name, lines: [`${C.TOPPINGS[pick.a].name} / ${C.TOPPINGS[pick.b].name}`, 'PRINTED BEFORE YOU CHOSE'] };
      camp.receipts.push(r);
      show(`<h2>This was already in the printer</h2>${receiptHtml(r)}`, [['...okay', route]]);
    } else route();
  }

  function roster() {
    const city = R.currentCity(camp);
    return city.finale ? R.finaleRoster(camp) : camp.pies[city.id];
  }

  function pickSlice() {
    const city = R.currentCity(camp), street = camp.streets[city.id];
    const list = roster().filter(s => s.status === 'ready');
    const dead = city.finale ? '' : `<p>${street.deaths} of 6 lost on this street.</p>`;
    show(`<h2>${city.name}</h2><p class="radio">"${R.radio(camp)}"</p>${dead}
      <div class="slices">${list.map(s => `<button class="slice" data-id="${s.id}" data-origin="${s.origin}">
        <b>${C.STYLES[s.style].name}</b><span>${s.topping ? C.TOPPINGS[s.topping].name : 'plain'}</span></button>`).join('')}</div>
      <div class="lore">${camp.lore.slice(-2).map(l => `<p>${l}</p>`).join('')}</div>`);
    screen.querySelectorAll('.slice').forEach(b => {
      b.onclick = () => spinWheel(list.find(s => String(s.id) === b.dataset.id && s.origin === b.dataset.origin));
    });
  }

  function spinWheel(slice) {
    const city = R.currentCity(camp), street = camp.streets[city.id];
    const ticket = R.spin(city, street);
    R.applyTicket(camp, ticket);
    show(`<h2>The Lazy Susan</h2><div class="wheel spinning"></div><div id="ticket" class="ticket hidden">
      <h3>${ticket.title}</h3><p>${ticket.text}</p></div>`);
    setTimeout(() => {
      $('ticket').classList.remove('hidden');
      screen.querySelector('.wheel').classList.remove('spinning');
      const b = document.createElement('button');
      b.textContent = 'Run'; b.onclick = () => startRun(slice, ticket);
      screen.querySelector('.actions').appendChild(b);
    }, debug ? 10 : 1400);
  }

  function startRun(slice, ticket) {
    const city = R.currentCity(camp), street = camp.streets[city.id];
    screen.classList.add('hidden');
    controls.classList.remove('hidden');
    $('specialBtn').textContent = C.STYLES[slice.style].specialName;
    run = new P.Run(canvas, input, { camp, city, street, slice, ticket, onEnd: result => afterRun(slice, result) });
    if (debug) window.__pr.run = run;
    run.start();
  }

  function afterRun(slice, result) {
    const city = R.currentCity(camp);
    const receipt = R.finishRun(camp, slice, result);
    save();
    const heading = result.outcome === 'delivered' ? 'Delivered' : result.outcome === 'cold' ? 'Gone cold' : 'Eaten';
    const kept = result.outcome === 'delivered' && !city.finale ? `<p>${camp.crew.filter(s => s.origin === city.id).length} slices go on to the finale.</p>` : '';
    show(`<h2>${heading}</h2>${receiptHtml(receipt)}${kept}`, [['Next', route]]);
  }

  function finaleIntro() {
    show(`<h2>${C.FINALE.name}</h2>${panels(C.FINALE.panels)}<p>${camp.crew.length} slices made it this far.</p>`,
      [['Go', () => { camp.phase = 'slice'; route(); }]]);
  }

  function ending() {
    show(`<div class="ending">${panels(C.ENDING.panels)}${receiptHtml(R.finalReceipt(camp), true)}
      <p class="note">${C.ENDING.note}</p></div>`, [['Back to title', title]]);
  }

  // One input object, fed by keyboard and touch.
  const input = {
    left: false, right: false, queued: {},
    take(k) { const v = this.queued[k]; this.queued[k] = false; return v; },
  };
  const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump', Shift: 'special', f: 'power', e: 'give' };
  addEventListener('keydown', ev => { const k = KEYS[ev.key]; if (!k) return; if (k === 'left' || k === 'right') input[k] = true; else if (!ev.repeat) input.queued[k] = true; });
  addEventListener('keyup', ev => { const k = KEYS[ev.key]; if (k === 'left' || k === 'right') input[k] = false; });
  document.querySelectorAll('#controls button').forEach(b => {
    const k = b.dataset.key;
    const down = ev => { ev.preventDefault(); if (k === 'left' || k === 'right') input[k] = true; else input.queued[k] = true; };
    const up = ev => { ev.preventDefault(); if (k === 'left' || k === 'right') input[k] = false; };
    b.addEventListener('pointerdown', down);
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(name, up);
    b.addEventListener('contextmenu', ev => ev.preventDefault());
  });
  setInterval(() => {
    const live = run && !run.done;
    const near = live && run.nearby;
    const label = near ? { ninja: 'BRIBE', mutant: 'FEED', teen: 'DISTRACT' }[near.e.type] : null;
    $('giveBtn').textContent = label || '';
    $('giveBtn').classList.toggle('off', !label);
  }, 100);

  if (debug) window.__pr = { get camp() { return camp; }, set camp(c) { camp = c; }, run: null, route, input, save };
  title();
})();
