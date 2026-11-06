// Small synthesized effects, so the game has sound before it has an audio budget.
(function (root) {
  let ctx = null;
  const state = { muted: localStorage.getItem('pizzaRunnerMuted') === '1' };
  const SOUNDS = {
    jump: [320, 520, 0.09, 'square'], shot: [700, 220, 0.08, 'square'], hit: [190, 70, 0.18, 'sawtooth'], smash: [130, 50, 0.2, 'square'],
    bribe: [440, 660, 0.15, 'triangle'], print: [1200, 1200, 0.05, 'square'], fire: [240, 480, 0.2, 'triangle'],
    deliver: [520, 1040, 0.35, 'triangle'], lost: [300, 90, 0.5, 'sine'], note: [880, 1100, 0.12, 'sine'],
  };

  function unlock() { if (!ctx) ctx = new (root.AudioContext || root.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); }

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

  function toggle() { state.muted = !state.muted; localStorage.setItem('pizzaRunnerMuted', state.muted ? '1' : '0'); return state.muted; }

  root.PR_SOUND = { play, unlock, toggle, get muted() { return state.muted; } };
})(window);
