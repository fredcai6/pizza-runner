// The loop between slices: order, map, street, receipt, map, then the back room between cities.
(function () {
  const C = window.PR_CONTENT, R = window.PR_RULES, P = window.PR_PLAY, H = window.PR_HQ, B = window.PR_BOARD, A = window.PR_SOUND, M = window.PR_MAP, S = window.PR_SPRITES;
  const SAVE = 'pizzaRunnerSave3';
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

  // Android and desktop can take the whole screen. iPhones cannot, so they get no button.
  const stageRoot = document.documentElement;
  const canFull = !!(stageRoot.requestFullscreen || stageRoot.webkitRequestFullscreen);
  async function goFull() {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) return (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      await (stageRoot.requestFullscreen || stageRoot.webkitRequestFullscreen).call(stageRoot, { navigationUI: 'hide' });
      await window.screen.orientation?.lock?.('landscape');
    } catch { /* The browser said no. The game plays fine in a window. */ }
  }
  // Playtest menu: add ?playtest=1 to the address once and it stays on. ?playtest=0 turns it off.
  const asked = new URLSearchParams(location.search).get('playtest');
  if (asked !== null) localStorage.setItem('pizzaRunnerPlaytest', asked);
  const playtest = localStorage.getItem('pizzaRunnerPlaytest') === '1';
  let god = false;

  function playtestMenu() {
    if (run) { run.stop(); run = null; }
    $('pause').classList.add('hidden');
    const rows = C.CITIES.map((city, i) => `<div class="jumprow"><b>${city.name}</b>${city.areas.map((a, n) => `<button class="warp" data-city="${i}" data-at="${n}">${n + 1}. ${a.name}</button>`).join('')}</div>`).join('');
    show(`<h2>Playtest</h2>${rows}<p class="tally">Jumping starts that city fresh with the whole map open. It replaces the saved game.</p>`,
      [[god ? 'Never go cold: on' : 'Never go cold: off', () => { god = !god; playtestMenu(); }, 'quiet'],
       ['See the door and ending scenes', () => { camp = R.jumpTo(4, 2); camp.phase = 'ending'; save(); route(); }, 'quiet'],
       ['Back to title', title, 'quiet']]);
    screen.querySelectorAll(".warp").forEach(b => { b.onclick = () => { camp = R.jumpTo(+b.dataset.city, +b.dataset.at); save(); route(); }; });
  }

  const fullButton = () => (canFull ? [['Full screen', goFull, 'quiet']] : []);

  function title() {
    const acts = [];
    if (camp) acts.push(['Continue', route]);
    acts.push([camp ? 'New game' : 'Start', () => {
      if (canFull && matchMedia('(pointer: coarse)').matches) goFull();
      camp = R.newCampaign(); save(); route();
    }]);
    if (playtest) acts.push(['Playtest', playtestMenu, 'quiet']);
    show('<h1>PIZZA RUNNER</h1><p class="sub">You have been deployed.</p>', [...acts, ...fullButton()]);
  }

  // A city's street art loads behind whatever is on screen, never behind a screen of its own.
  // The briefing is back-room art that is already loaded, so it plays while the city arrives.
  const loading = {};
  const preload = city => (loading[city.id] = loading[city.id] || S.loadCity(city));

  async function route() {
    save();
    const city = R.currentCity(camp), ready = preload(city);
    if (camp.phase !== 'briefing') await ready;
    switch (camp.phase) {
      case 'briefing': return scene(city.briefing, async () => {
        await ready;
        if (city.final) { R.startFinale(camp); route(); } else orderScreen();
      });
      case 'order': return orderScreen();
      case 'map': return mapScreen();
      case 'door': return doorScene();
      case 'cityDone': return leave();
      case 'gameover': return scene([{ comp: 'oldtimer', lines: R.epitaph(camp) }], lostCity);
      case 'ending': return scene(C.ENDING.finale, endCard);
    }
  }

  function leave() { R.leaveCity(camp); route(); }

  function lostCity() {
    const city = R.currentCity(camp);
    show(`<h2>${city.name} went cold</h2><p>All the slices are gone. The streets reset, and everything before ${city.name} stays done.</p>`,
      [[`Back to ${city.name}`, () => { R.retryCity(camp); route(); }], boardButton(lostCity)]);
  }

  function doorScene() {
    const city = R.currentCity(camp), area = city.areas[camp.world.delivery - 1], last = camp.receipts[camp.receipts.length - 1];
    // The last door of a city: start fetching the next city while the customer talks.
    if (R.cityComplete(camp) && C.CITIES[camp.cityIndex + 1]) preload(C.CITIES[camp.cityIndex + 1]);
    scene([{ comp: 'door', lines: area.door }], () => {
      show(`<h2 class="stamp delivered">Delivered</h2>${B.receiptHtml(last)}`, [['Next', () => { R.afterDoor(camp); route(); }]]);
    }, { customer: area.customer, area, slice: { style: camp.world.lastStyle, topping: camp.world.lastTopping, left: camp.world.lastLeft } });
  }

  function orderScreen() {
    const city = R.currentCity(camp), st = C.STYLES[city.style];
    const order = R.printOrder(camp);
    show(`<h2>Incoming order</h2>${B.receiptHtml(order)}<p><b>${st.name}.</b> ${st.blurb}</p>`,
      [['Build the pie', () => pieBuilder(city)], boardButton(() => orderScreen())]);
  }

  // Old-school character select: a grid of topping tiles with a cursor, a big pie beside it wearing
  // the highlighted topping, and the topping's name and blurb as the fighter's stats.
  const TOPPING_ORDER = ['pepperoni', 'jalapeno', 'garlic', 'mushroom', 'basil', 'pineapple', 'sausage'];
  const CLASS = { shot: 'Ranged', bounce: 'Ricochet', aura: 'Area', leap: 'Mobility', reheat: 'Recovery', scatter: 'Spread', slam: 'Ground' };
  const COLS = 4;

  // Bits of a topping, scattered the same way every time so the pie does not shimmer as the cursor moves.
  function bits(t, cx, cy, r, count, scale = 1) {
    let seed = [...t].reduce((h, c) => h * 31 + c.charCodeAt(0), 7), out = '';
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const color = C.TOPPINGS[t].color;
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.82, x = (cx + Math.cos(a) * d).toFixed(1), y = (cy + Math.sin(a) * d).toFixed(1), rot = Math.floor(rnd() * 360);
      const k = 11 * scale;
      if (t === 'pepperoni') out += `<circle cx="${x}" cy="${y}" r="${k * 1.15}" fill="#c8321e" stroke="#7a1a10" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${k * 0.35}" fill="#e46a4c"/>`;
      else if (t === 'jalapeno') out += `<circle cx="${x}" cy="${y}" r="${k}" fill="#6cc15a" stroke="#2f6d28" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="${k * 0.45}" fill="#d7ef9a"/>`;
      else if (t === 'garlic') out += `<ellipse cx="${x}" cy="${y}" rx="${k * 0.9}" ry="${k * 0.5}" transform="rotate(${rot} ${x} ${y})" fill="#f3efd2" stroke="#b8ad7d" stroke-width="2"/>`;
      else if (t === 'mushroom') out += `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-${k} 2 A${k} ${k} 0 0 1 ${k} 2 Z" fill="#b99573" stroke="#6b4c34" stroke-width="2"/><rect x="-${k * 0.3}" y="2" width="${k * 0.6}" height="${k * 0.7}" fill="#e6d3bb" stroke="#6b4c34" stroke-width="2"/></g>`;
      else if (t === 'basil') out += `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0 -${k} Q${k} -${k * 0.2} 0 ${k} Q-${k} -${k * 0.2} 0 -${k} Z" fill="#3f9b4a" stroke="#1d5a2a" stroke-width="2"/>`;
      else if (t === 'pineapple') out += `<rect x="${x - k * 0.8}" y="${y - k * 0.8}" width="${k * 1.6}" height="${k * 1.6}" transform="rotate(${rot} ${x} ${y})" rx="3" fill="#ffd84a" stroke="#b58a12" stroke-width="2.5"/>`;
      else if (t === 'sausage') out += `<circle cx="${x}" cy="${y}" r="${k * 0.85}" fill="#8b4a2b" stroke="#4a2414" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="${k * 0.25}" fill="#b56a45"/>`;
      else out += `<circle cx="${x}" cy="${y}" r="${k}" fill="${color}"/>`;
    }
    return out;
  }

  const pieSvg = t => `<svg class="bigpie" viewBox="0 0 300 300"><ellipse cx="150" cy="276" rx="110" ry="14" fill="rgba(0,0,0,.25)"/>
    <circle cx="150" cy="150" r="136" fill="#d9954a" stroke="#6b3c18" stroke-width="6"/><circle cx="150" cy="150" r="116" fill="#c8321e"/>
    <circle cx="150" cy="150" r="108" fill="#f6c94a"/><path d="M60 120 Q110 90 150 112 T240 120" stroke="#ffe27a" stroke-width="8" fill="none" opacity=".7"/>
    ${bits(t, 150, 150, 120, 13)}</svg>`;
  const tileSvg = t => `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="#f6c94a" stroke="#c28a3a" stroke-width="4"/>${bits(t, 30, 30, 24, 3, 0.62)}</svg>`;

  function pieBuilder(city) {
    let pick = city.menu[0];
    const done = () => { removeEventListener('keydown', keys); box(city, pick); };
    const slot = TOPPING_ORDER.indexOf.bind(TOPPING_ORDER);
    // Cursor moves over the tiles on the order's menu, nearest in the direction pressed, wrapping around.
    const step = (dx, dy) => {
      const n = TOPPING_ORDER.length, jump = dx || dy * COLS;
      for (let k = 1; k <= n * 2; k++) {
        const t = TOPPING_ORDER[(((slot(pick) + jump * k) % n) + n) % n];
        if (city.menu.includes(t) && t !== pick) return t;
      }
      return pick;
    };
    const keys = ev => {
      const move = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1] }[ev.key];
      if (move) { pick = step(...move); render(); ev.preventDefault(); }
      else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); done(); }
    };
    const render = () => {
      if (city.menu.length === 1) {
        removeEventListener('keydown', keys);
        show(`<h2>Build your pie</h2><p>This order is ${C.TOPPINGS[pick].name.toLowerCase()}. Just ${C.TOPPINGS[pick].name.toLowerCase()}.</p><p class="blurb">${C.TOPPINGS[pick].blurb}</p>`, [['Box it', () => box(city, pick)]]);
        return;
      }
      const T = C.TOPPINGS[pick];
      const tiles = TOPPING_ORDER.concat([null]).map(t => !t ? '<div class="tile lock"><span>?</span></div>'
        : city.menu.includes(t) ? `<button class="tile${pick === t ? ' on' : ''}" data-t="${t}" aria-label="${C.TOPPINGS[t].name}">${tileSvg(t)}<span>${C.TOPPINGS[t].name}</span></button>`
        : `<div class="tile lock"><span>?</span></div>`).join('');
      show(`<div class="select"><div class="selgrid"><h2>Pick the topping</h2><div class="tiles">${tiles}</div><p class="hint">Arrows to move, Enter to box it.</p></div>
        <div class="fighter"><div class="stage">${pieSvg(pick)}</div>
          <div class="plate"><b class="fname">${T.name}</b><span class="fclass">${CLASS[T.kind] || T.kind}</span><p class="blurb">${T.blurb}</p></div></div></div>`,
        [['Box it', done]]);
      screen.querySelectorAll('.tile[data-t]').forEach(b => { b.onclick = () => { if (pick === b.dataset.t) done(); else { pick = b.dataset.t; render(); } }; });
    };
    addEventListener('keydown', keys);
    render();
  }

  function box(city, pick) {
    R.placeOrder(camp, pick);
    save();
    // This receipt was printed before she chose. Nobody mentions it.
    if (city.predicts) {
      const r = { ...R.printOrder(camp), lines: [C.TOPPINGS[pick].name, `PRINTED ${C.PRINTER_CLOCK}, BEFORE YOU CHOSE`] };
      show(`<h2>This was already in the printer</h2>${B.receiptHtml(r)}`, [['...okay', route]]);
    } else route();
  }

  // Every slice starts here: the full map, the address, and any checkpoint reached so far.
  function mapScreen() {
    const city = R.currentCity(camp), world = camp.world, pie = camp.pies[city.id];
    let node = M.closest(camp), chosen = null;
    const render = () => {
      const list = R.ready(pie);
      const groups = [...new Set(list.map(s => `${s.style}|${s.topping}`))].map(k => list.find(s => `${s.style}|${s.topping}` === k));
      chosen = chosen && chosen.status === 'ready' ? chosen : groups[0];
      const line = world.run ? R.dispatch(camp).map(l => l.text).join(' ') : '';
      const n = (s) => list.filter(x => x.style === s.style && x.topping === s.topping).length;
      show(`<div class="mapscreen">${M.svg(camp, { picked: node })}<div class="mapside">
        <h2>${city.name}</h2>
        <p class="tally">Address ${world.delivery + 1} of ${city.areas.length}. ${list.length} slice${list.length === 1 ? '' : 's'} left.</p>
        ${line ? `<p class="dispatch">${line}</p>` : ''}
        <div class="slices">${groups.map(s => `<button class="slice${s === chosen ? ' on' : ''}" data-id="${s.id}"><b>${C.STYLES[s.style].name}</b><span>${C.TOPPINGS[s.topping].name} (${n(s)})</span></button>`).join('')}</div>
        <p class="tally">Start from <b>${world.nodes[node].name}</b></p>
        <div class="mapactions"></div></div></div>`, [['Deploy', () => startRun(chosen, node)], boardButton(mapScreen)]);
      screen.querySelector('.mapactions').appendChild(screen.querySelector('.actions'));
      screen.querySelectorAll('.slice').forEach(b => { b.onclick = () => { chosen = pie.slices[b.dataset.id]; render(); }; });
      screen.querySelectorAll('[data-node]').forEach(g => { g.onclick = () => { node = g.dataset.node; render(); }; });
    };
    render();
  }

  function startRun(slice, node) {
    const city = R.currentCity(camp), world = camp.world;
    world.checkpoint = node;
    screen.classList.add('hidden');
    controls.classList.remove('hidden');
    const special = C.STYLES[slice.style].specialName;
    $('specialBtn').textContent = special || '';
    $('specialBtn').classList.toggle('off', !special);
    run = new P.Run(canvas, input, { camp, city, world, slice, start: R.deployment(world, node), onEnd: result => debrief(slice, result) });
    run.god = god;
    if (debug) window.__pr.run = run;
    run.start();
  }

  // Every attempt ends with a quick receipt. A delivery goes to the door first.
  function debrief(slice, result) {
    R.finishRun(camp, slice, result);
    save();
    A.play('print');
    if (result.outcome === 'delivered') return route();
    const receipt = camp.receipts[camp.receipts.length - 1];
    const heading = { cold: 'Gone cold', dead: 'Eaten' }[result.outcome];
    const again = () => show(`<h2 class="stamp ${result.outcome}">${heading}</h2>${B.receiptHtml(receipt)}`, [[camp.phase === 'map' ? 'Back to the map' : 'Next', route], boardButton(again)]);
    again();
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
    left: false, right: false, jumpHeld: false, queued: {},
    take(k) { const v = this.queued[k]; this.queued[k] = false; return v; },
  };
  const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump', Shift: 'special', f: 'power', ArrowDown: 'turn', s: 'turn' };
  addEventListener('keydown', ev => {
    if (ev.key === 'Escape' || ev.key.toLowerCase() === 'p') return pause(!(run && run.paused));
    const k = KEYS[ev.key]; if (!k) return;
    if (k === 'left' || k === 'right') input[k] = true; else if (!ev.repeat) { input.queued[k] = true; if (k === 'jump') input.jumpHeld = true; }
  });
  addEventListener('keyup', ev => { const k = KEYS[ev.key]; if (k === 'left' || k === 'right') input[k] = false; if (k === 'jump') input.jumpHeld = false; });
  addEventListener('pointerdown', () => A.unlock());
  addEventListener('keydown', () => A.unlock());
  document.querySelectorAll('#controls button[data-key]').forEach(b => {
    const k = b.dataset.key;
    const down = ev => { ev.preventDefault(); if (k === 'left' || k === 'right') input[k] = true; else { input.queued[k] = true; if (k === 'jump') input.jumpHeld = true; } };
    const up = ev => { ev.preventDefault(); if (k === 'left' || k === 'right') input[k] = false; if (k === 'jump') input.jumpHeld = false; };
    b.addEventListener('pointerdown', down);
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(name, up);
    b.addEventListener('contextmenu', ev => ev.preventDefault());
  });
  $('pauseBtn').onclick = () => pause(true);
  $('resumeBtn').onclick = () => pause(false);
  $('pauseBoardBtn').onclick = () => B.open(overlay, camp, () => overlay.classList.add('hidden'));
  $('pauseMapBtn').onclick = () => {
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="mapview">${M.svg(camp, { live: { street: run.street.id, x: run.p.x } })}<button class="mapback">◀ Back to the street</button></div>`;
    overlay.querySelector('.mapback').onclick = () => overlay.classList.add('hidden');
  };
  $('pausePlaytestBtn').onclick = playtestMenu;
  $('pausePlaytestBtn').classList.toggle('hidden', !playtest);
  $('fullBtn').onclick = goFull;
  $('fullBtn').classList.toggle('hidden', !canFull);
  $('muteBtn').onclick = () => { A.toggle(); $('muteBtn').textContent = A.muted ? 'Sound: off' : 'Sound: on'; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
  setInterval(() => {
    const offer = run && !run.done && run.offer;
    $('turnBtn').classList.toggle('dim', !offer);
  }, 100);

  if (debug) window.__pr = { get camp() { return camp; }, set camp(c) { camp = c; }, run: null, route, input, save };
  Promise.all([S.load(), S.loadLayers(), document.fonts.load('600 24px Fredoka'), document.fonts.load('700 24px Fredoka'), document.fonts.load('700 24px Nunito'), document.fonts.load('800 24px Nunito')]).then(title);
})();
