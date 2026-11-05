// The loop between runs: back room, order, street, receipt, back room.
(function () {
  const C = window.PR_CONTENT, R = window.PR_RULES, P = window.PR_PLAY, H = window.PR_HQ, B = window.PR_BOARD, A = window.PR_SOUND;
  const SAVE = 'pizzaRunnerSave2';
  const $ = id => document.getElementById(id);
  const screen = $('screen'), canvas = $('stage'), controls = $('controls'), dialog = $('dialog'), overlay = $('overlay');
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

  function scene(shots, done, extra = {}) {
    controls.classList.add('hidden');
    screen.classList.add('hidden');
    H.play(canvas, dialog, shots, { hq: R.headquarters(camp), city: R.currentCity(camp), ...extra }, done);
  }

  const boardButton = back => ['Corkboard', () => B.open(overlay, camp, () => { overlay.classList.add('hidden'); if (back) back(); }), 'quiet'];

  function title() {
    const acts = [];
    if (camp) acts.push(['Continue', route]);
    acts.push([camp ? 'New game' : 'Start', () => { camp = R.newCampaign(); save(); route(); }]);
    show('<h1>PIZZA RUNNER</h1><p class="sub">You have been deployed.</p>', acts);
  }

  function route() {
    save();
    const city = R.currentCity(camp);
    switch (camp.phase) {
      case 'briefing': return scene(city.briefing, orderScreen);
      case 'reorder': return reorder();
      case 'slice': return pickSlice();
      case 'return': return scene(R.returnScene(camp), pickSlice);
      case 'door': return scene([{ comp: 'door', lines: city.door }], leave, { customer: city.customer });
      case 'missed': return scene([{ comp: 'oldtimer', lines: [{ who: 'old', text: 'That whole pizza is gone. Deep undercover. Finest operatives I ever sent.' }] }], leave);
      case 'ending': return scene(C.ENDING.finale, endCard);
    }
  }

  function leave() { R.leaveCity(camp); route(); }

  function reorder() {
    scene([{ comp: 'oldtimer', lines: [{ who: 'old', text: 'Deep undercover, the lot of them. And half that street has gone quiet. Fire up another one.' }] }], orderScreen);
  }

  function orderScreen() {
    const city = R.currentCity(camp), st = C.STYLES[city.style];
    const order = R.printOrder(camp);
    show(`<h2>Incoming order</h2>${B.receiptHtml(order)}<p><b>${st.name}.</b> ${st.blurb}</p>`,
      [['Build the pie', () => pieBuilder(city)], boardButton(() => orderScreen())]);
  }

  function pieBuilder(city) {
    const { a: menuA, b: menuB } = city.menu;
    const pick = { a: menuA[0], b: menuB[0] };
    const render = () => {
      if (city.menu.whole) {
        show(`<h2>Build your pie</h2><p>This order is pepperoni. Just pepperoni.</p><p class="blurb">${C.TOPPINGS[pick.a].blurb}</p>`, [['Box it', () => box(city, pick)]]);
        return;
      }
      const col = (side, menu) => `<div class="side"><h3>${side === 'a' ? 'Slices 1-3' : 'Slices 4-6'}</h3>${menu.map(t => {
        const on = pick[side] === t;
        return `<button class="top${on ? ' on' : ''}" data-side="${side}" data-t="${t}"><i style="background:${C.TOPPINGS[t].color}"></i>${C.TOPPINGS[t].name}</button>`;
      }).join('')}</div>`;
      show(`<h2>Build your pie</h2><div class="pie">${col('a', menuA)}${col('b', menuB)}</div>
        <p class="blurb">${C.TOPPINGS[pick.a].blurb}${pick.a !== pick.b ? ' ' + C.TOPPINGS[pick.b].blurb : ''}</p>`,
        [['Box it', () => box(city, pick)]]);
      screen.querySelectorAll('.top').forEach(b => { b.onclick = () => { pick[b.dataset.side] = b.dataset.t; render(); }; });
    };
    render();
  }

  function box(city, pick) {
    R.placeOrder(camp, pick.a, pick.b);
    save();
    // This receipt was printed before she chose. Nobody mentions it.
    if (city.predicts) {
      const r = { ...R.printOrder(camp), lines: [`${C.TOPPINGS[pick.a].name} / ${C.TOPPINGS[pick.b].name}`, `PRINTED ${C.PRINTER_CLOCK}, BEFORE YOU CHOSE`] };
      show(`<h2>This was already in the printer</h2>${B.receiptHtml(r)}`, [['...okay', route]]);
    } else route();
  }

  function pickSlice() {
    camp.phase = 'slice'; save();
    const city = R.currentCity(camp), pie = camp.pies[city.id], list = R.ready(pie);
    const lost = pie.slices.length - list.length;
    show(`<h2>${city.name}</h2><p>${lost ? `${lost} of 6 gone.` : 'Six slices. Choose who goes.'}</p>
      <div class="slices">${[...new Set(list.map(s => s.topping))].map(t => {
        const s = list.find(x => x.topping === t), n = list.filter(x => x.topping === t).length;
        return `<button class="slice" data-id="${s.id}"><b>${C.STYLES[s.style].name}</b><span>${C.TOPPINGS[t].name} (${n} left)</span></button>`;
      }).join('')}</div>`, [boardButton(() => pickSlice())]);
    screen.querySelectorAll('.slice').forEach(b => { b.onclick = () => startRun(pie.slices[b.dataset.id]); });
  }

  function startRun(slice) {
    const city = R.currentCity(camp), street = camp.streets[city.id];
    screen.classList.add('hidden');
    controls.classList.remove('hidden');
    $('specialBtn').textContent = C.STYLES[slice.style].specialName;
    run = new P.Run(canvas, input, { camp, city, street, slice, onEnd: result => debrief(slice, result) });
    if (debug) window.__pr.run = run;
    run.start();
  }

  // Every attempt ends here, eaten or delivered, before anything else happens.
  function debrief(slice, result) {
    const receipt = R.finishRun(camp, slice, result);
    save();
    A.play('print');
    const heading = { delivered: 'Delivered', cold: 'Gone cold', dead: 'Eaten' }[result.outcome];
    show(`<h2 class="stamp ${result.outcome}">${heading}</h2>${B.receiptHtml(receipt)}`, [['Back to HQ', route], boardButton(() => debriefAgain(receipt, heading, result))]);
  }

  function debriefAgain(receipt, heading, result) {
    show(`<h2 class="stamp ${result.outcome}">${heading}</h2>${B.receiptHtml(receipt)}`, [['Back to HQ', route], boardButton(() => debriefAgain(receipt, heading, result))]);
  }

  function endCard() {
    const card = C.ENDING.card;
    const link = card.youtube ? `<a class="listen" href="${card.youtube}" target="_blank" rel="noopener">${card.listen}</a>` : '';
    show(`<div class="card"><h2>${card.line}</h2>${link}<p class="bday">${card.birthday}</p></div>`, [['Back to title', title, 'quiet']]);
  }

  function pause(on) {
    if (!run || run.done) return;
    run.paused = on;
    $('pause').classList.toggle('hidden', !on);
    $('muteBtn').textContent = A.muted ? 'Sound: off' : 'Sound: on';
  }

  // One input object, fed by keyboard and touch.
  const input = {
    left: false, right: false, queued: {},
    take(k) { const v = this.queued[k]; this.queued[k] = false; return v; },
  };
  const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump', Shift: 'special', f: 'power', e: 'give' };
  addEventListener('keydown', ev => {
    if (ev.key === 'Escape' || ev.key === 'p') return pause(!(run && run.paused));
    const k = KEYS[ev.key]; if (!k) return;
    if (k === 'left' || k === 'right') input[k] = true; else if (!ev.repeat) input.queued[k] = true;
  });
  addEventListener('keyup', ev => { const k = KEYS[ev.key]; if (k === 'left' || k === 'right') input[k] = false; });
  addEventListener('pointerdown', () => A.unlock());
  addEventListener('keydown', () => A.unlock());
  document.querySelectorAll('#controls button[data-key]').forEach(b => {
    const k = b.dataset.key;
    const down = ev => { ev.preventDefault(); if (k === 'left' || k === 'right') input[k] = true; else input.queued[k] = true; };
    const up = ev => { ev.preventDefault(); if (k === 'left' || k === 'right') input[k] = false; };
    b.addEventListener('pointerdown', down);
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(name, up);
    b.addEventListener('contextmenu', ev => ev.preventDefault());
  });
  $('pauseBtn').onclick = () => pause(true);
  $('resumeBtn').onclick = () => pause(false);
  $('pauseBoardBtn').onclick = () => B.open(overlay, camp, () => overlay.classList.add('hidden'));
  $('muteBtn').onclick = () => { A.toggle(); $('muteBtn').textContent = A.muted ? 'Sound: off' : 'Sound: on'; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
  setInterval(() => {
    const near = run && !run.done && run.nearby;
    const label = near ? { ninja: 'BRIBE', mutant: 'FEED', teen: 'DISTRACT' }[near.e.type] : null;
    $('giveBtn').textContent = label || '';
    $('giveBtn').classList.toggle('off', !label);
  }, 100);

  if (debug) window.__pr = { get camp() { return camp; }, set camp(c) { camp = c; }, run: null, route, input, save };
  Promise.all([window.PR_SPRITES.load(), window.PR_SPRITES.loadLayers()]).then(title);
})();
