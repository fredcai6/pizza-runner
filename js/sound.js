// Small synthesized effects, so the game has sound before it has an audio budget.
(function (root) {
  let ctx = null;
  const state = { muted: localStorage.getItem('pizzaRunnerMuted') === '1' };
  const SOUNDS = {
    jump: [320, 520, 0.09, 'square'], shot: [700, 220, 0.08, 'square'], hit: [190, 70, 0.18, 'sawtooth'], smash: [130, 50, 0.2, 'square'],
    bribe: [440, 660, 0.15, 'triangle'], print: [1200, 1200, 0.05, 'square'], fire: [240, 480, 0.2, 'triangle'],
    deliver: [520, 1040, 0.35, 'triangle'], lost: [300, 90, 0.5, 'sine'], note: [880, 1100, 0.12, 'sine'],
  };

  // Each speaker's text sound: wave, pitch, and how far it wanders from note to note.
  const VOICES = {
    old: ['square', 150, 8], ny: ['square', 300, 30], deep: ['sawtooth', 105, 6], jumbo: ['triangle', 215, 55], naples: ['triangle', 560, 60],
    alewife: ['square', 640, 90], customer: ['sine', 380, 25],
  };

  function unlock() { if (!ctx) ctx = new (root.AudioContext || root.webkitAudioContext)(); if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); tune(); }

  function play(name) {
    if (state.muted || !ctx) return;
    const [from, to, length, type] = SOUNDS[name];
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + length);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + length);
  }

  function dit(who) {
    if (state.muted || !ctx) return;
    const [type, pitch, wander] = VOICES[who] || VOICES.customer;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = type;
    o.frequency.value = pitch + (Math.random() - 0.5) * wander;
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.045);
  }

  function toggle() { state.muted = !state.muted; localStorage.setItem('pizzaRunnerMuted', state.muted ? '1' : '0'); return state.muted; }

  // Background music: one looping song at a time, decoded into memory and faded on every change.
  // assets/music/music.json names each place's file and the exact loop length (music/install.py writes it).
  // It has its own switch; the Sound switch is effects only.
  const MUSIC_LEVEL = 0.5, DUCKED = 0.35;
  const music = { on: localStorage.getItem('pizzaRunnerMusic') !== '0', want: null, file: null, node: null, gain: null, list: null, ducked: false, turn: 0 };
  const level = () => MUSIC_LEVEL * (music.ducked ? DUCKED : 1);

  function hush() {
    const { node, gain } = music;
    music.node = music.gain = null; music.file = null; music.turn++;
    if (!node) return;
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    setTimeout(() => { try { node.stop(); } catch { /* never started */ } node.disconnect(); gain.disconnect(); }, 1000);
  }

  // music.file is the song that is playing or on its way; asking again for the same one changes nothing,
  // so taps and scene changes during a load never restart or cancel it.
  async function tune() {
    if (!ctx) return; // No sound until the first tap or key; unlock() calls back here.
    music.list = music.list || fetch('assets/music/music.json').then(r => r.json()).catch(() => { music.list = null; return {}; });
    const list = await music.list;
    const info = music.on && music.want ? list[music.want] : null, target = info ? info.file : null;
    if (target === music.file) return void (music.gain && music.gain.gain.setTargetAtTime(level(), ctx.currentTime, 0.15));
    hush();
    if (!target) return;
    music.file = target;
    const mine = music.turn;
    try {
      const buf = await ctx.decodeAudioData(await (await fetch(`assets/music/${target}`)).arrayBuffer());
      if (mine !== music.turn) return;
      // An MP3 decoder may leave the encoder's lead-in (1105 samples at 48 kHz) at the front. The loop
      // is exactly info.length long, so anything beyond that is lead-in and tail, and stays outside the loop.
      const lead = buf.duration - info.length > 0.02 ? 1105 / 48000 : 0;
      const node = ctx.createBufferSource(), gain = ctx.createGain();
      node.buffer = buf; node.loop = true; node.loopStart = lead; node.loopEnd = Math.min(buf.duration, lead + info.length);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.setTargetAtTime(level(), ctx.currentTime, 0.4);
      node.connect(gain).connect(ctx.destination);
      node.start(0, lead);
      music.node = node; music.gain = gain;
    } catch { if (mine === music.turn) music.file = null; /* No music is fine; the next scene change tries again. */ }
  }

  function song(name) { music.want = name; tune(); }
  function duck(on) { music.ducked = on; if (music.gain) music.gain.gain.setTargetAtTime(level(), ctx.currentTime, 0.15); }
  function musicToggle() { music.on = !music.on; localStorage.setItem('pizzaRunnerMusic', music.on ? '1' : '0'); tune(); return music.on; }
  // A hidden tab makes no sound at all.
  document.addEventListener('visibilitychange', () => { if (ctx) (document.hidden ? ctx.suspend() : ctx.resume()); });

  root.PR_SOUND = { play, dit, unlock, toggle, song, duck, musicToggle, get muted() { return state.muted; }, get musicOn() { return music.on; }, get playing() { return music.node ? music.file : null; } };
})(window);
