// One slice, out on the city's streets. Reads the world, changes it through the rules, reports how it ended.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES, S = root.PR_SPRITES, A = root.PR_SOUND, K = root.PR_PAPER;
  const W = 1280, H = 720, GROUND = R.GROUND;
  // The painted cheese and sauce pieces (assets/backgrounds/props/), by kind.
  const FX = {};
  for (const what of ['cheese', 'sauce']) for (const [kind, n] of [['drop', 4], ['drip', 2], ['string', 2], ['splat', 4]]) FX[`${what}-${kind}`] = Array.from({ length: n }, (_, i) => `${what}-${kind}-${i + 1}`);
  const rand = k => { const v = Math.sin(k * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const TURN_ZONE = [-420, 110];
  const FACE = { turtle: '🐢', teen: '🧑‍🎤', mutant: '🧟', ninja: '🥷' };
  // Drawn at their frame heights, so sprites stay 1:1 and every paper border is the same width on screen.
  const SIZE = { turtle: 94, teen: 118, mutant: 120, ninja: 118 };
  const INK = '#2a1830';
  // Characters stand this far into the street surface, as feet do in a picture seen from slightly above.
  const FOOT_SINK = 8;
  // On a platform's painted top face the feet sink a little, as on the street; on a crate or barricade, barely.
  // Standing on top of something, the pizza's paper border overlaps that thing's border, so the two drawings touch:
  // its rim and border (6 px) go over the top's rim and border (6 px), less a pixel. Same on a platform and on a solid.
  const TOP_SINK = { platform: 11, solid: 11 };
  // Painted props stand in the pavement as the characters' feet do: the bottom of their border sits FOOT_SINK below
  // the ground line. Debris has no border and lies just into the pavement.
  const PROP_SINK = FOOT_SINK, DEBRIS_SINK = 3;
  const HIT_GAP = 8, MUTANT_GAP = 450;
  const BARK_TIME = 170, BARK_READ = 100, QUIP_GAP = 540, QUIP_HOLD = 130, WISP_RISE = 0.8, WISP_SWEEP = 2.4, CHOMP = 170, STUN = 150, WIPE = 22, AURA_USE = 180, BOW = 40;

  class Run {
    constructor(canvas, input, { camp, city, world, slice, start, onEnd, onStreet }) {
      Object.assign(this, { canvas, ctx: canvas.getContext('2d'), input, camp, city, world, slice, onEnd, onStreet });
      this.style = C.STYLES[slice.style];
      const st = this.style;
      this.topping = slice.topping;
      this.charges = slice.topping ? C.CHARGES : 0;
      this.heat = this.heatMax = st.heatMax;
      // Every hit takes a bite, and nothing grows it back: heat can only come back up to what is left.
      this.bites = 0; this.cap = this.heatMax;
      this.p = { x: 0, y: GROUND - st.h, vx: 0, vy: 0, w: st.w, h: st.h, grounded: true, facing: 1 };
      this.invuln = 0; this.specialCd = 0; this.specialMax = Math.round(((C.TUNING.cooldown || {})[slice.style] || 0) * 60); this.shownHeat = this.heat; this.shownCap = this.cap; this.ghost = this.heat; this.fumes = []; this.smash = 0; this.pounding = false; this.splat = 0; this.pace = 0;
      this.coyote = 0; this.buffer = 0; this.bounced = false; this.perch = 0;
      this.wob = 0; this.wobV = 0; this.trauma = 0; this.freeze = 0;
      this.aura = false; this.auraTick = 0;
      this.speech = null; this.quipGap = 0;
      this.bursts = []; this.cheeseBits = []; this.flour = []; this.dust = []; this.sauce = []; this.wisps = []; this.sweep = 0;
      this.look = 0; this.cam = 0; this.frame = 0; this.paused = false; this.bark = null; this.barkT = 0; this.heatBand = 'hot';
      this.done = false; this.offer = null;
      this.wipe = 0; this.pending = null; this.removed = 0; this.found = 0; this.taken = new Set(); this.warned = false;
      this.enter(start.street, start.x);
      const gone = Object.values(world.streets).reduce((n, s) => n + s.enemies.filter(e => !e.alive).length, 0);
      this.speak(gone ? 'deliverToGone' : 'deliverTo', { gone, customer: this.area0().customer });
      this.speak('deploy', {}, true);
    }

    area0() { return this.city.areas[Math.min(this.world.delivery, this.city.areas.length - 1)]; }

    // Puts the slice on a stretch. Whatever is left alive on it comes along, as it was left.
    enter(id, x) {
      const street = this.street = this.world.streets[id];
      if (this.onStreet) this.onStreet(street);
      R.travel(this.world, id);
      this.area = this.city.areas[street.area];
      this.junction = R.junction(this.world, street);
      R.clearSpawn(street, x);
      this.fit(street);
      this.actors = street.enemies.filter(e => e.alive).map(e => this.actor(e));
      this.shots = []; this.foes = []; this.drops = []; this.temp = []; this.sauce = []; this.flour = []; this.cheeseBits = [];
      this.p.x = x; this.p.y = GROUND - this.p.h; this.p.vy = 0; this.p.vx *= 0.5; this.p.grounded = true;
      this.cam = this.camera(); this.warned = false;
    }

    // What you can stand on is as tall as it is drawn, so feet land on the painted top.
    fit(street) {
      // A solid is as wide as its drawing inside the border, kept centred where the street put it.
      for (const c of street.barricades) {
        const art = this.barArt(c), top = S.surface(art), img = S.layer(art);
        if (top) c.h = top - PROP_SINK;
        if (img && !c.fitted) { const w = S.width(art) - 12; c.x += (c.w - w) / 2; c.w = w; c.fitted = true; }
      }
      // A stack is drawn sunk by its back corner's rise, so it stands on the street; its top comes down with it.
      for (const b of street.boxes) { const art = this.boxArt('box'), top = S.surface(art); if (top) b.h = top - S.rise(art) - PROP_SINK; }
    }

    // The solid blocks are pizza-shop stock (flour, cans, parmesan, salami); the city's old barricade stands in without the art.
    barArt(c) { return c.kind && S.layer(`props/obstacle-${c.kind}`) ? `props/obstacle-${c.kind}` : `${this.city.id}/barricade`; }

    // Hitting stock makes it jiggle in its own way: flour sacks squash and puff, cans wobble and drip sauce, the parmesan
    // rocks and drops crumbs, the salamis sway. A push held against it does not keep setting it off.
    poke(c, power = 1) {
      if (!c.kind || this.frame - (c.pokedAt ?? -99) < 24) return;
      c.pokedAt = this.frame; c.jig = Math.min(1.3, Math.max(c.jig || 0, power)); c.jt = 0;
      const cx = c.x + c.w / 2, top = GROUND - c.h;
      if (c.kind === 'flour') for (let i = 0; i < 3 + Math.round(power * 2); i++) {
        const r = rand(this.frame + i * 3.7);
        this.flour.push({ x: cx + (r - 0.5) * c.w, y: top + 10 + r * 20, vx: (r - 0.5) * 2.4, vy: -0.8 - r * 1.2, t: 0, life: 40 + Math.round(r * 20), size: 0.5 + r * 0.5 * power, pick: this.frame + i });
      }
      if (c.kind === 'cans') for (const k of [0.2, 0.8]) this.cheeseBits.push({ what: 'sauce', art: 'drip', x: c.x + c.w * k, y: top + 6, vx: 0, vy: 0.5, t: 0, stuck: 0, pick: this.frame + k * 10, size: 0.55, spin: 0, rot: Math.PI / 2 });
      if (c.kind === 'parm') for (let i = 0; i < 4; i++) {
        const r = rand(this.frame * 1.3 + i);
        this.cheeseBits.push({ what: 'cheese', art: 'drop', x: cx + (r - 0.5) * c.w, y: top + 4, vx: (r - 0.5) * 5, vy: -4 - r * 3, t: 0, stuck: 0, pick: i, size: 0.3 + r * 0.15, spin: 0.2, rot: 0 });
      }
    }

    obstacleStep() {
      for (const c of this.street.barricades) if (c.jig) { c.jt++; c.jig *= 0.955; if (c.jig < 0.02) c.jig = 0; }
      this.flour = this.flour.filter(f => { f.x += f.vx; f.y += f.vy; f.vx *= 0.96; f.vy *= 0.97; return ++f.t < f.life; });
    }

    // Each city stacks its own pizza boxes; the plain crates stand in where a city has none.
    boxArt(name) { return S.layer(`${this.city.id}/${name}`) ? `${this.city.id}/${name}` : `props/${name}`; }

    isBox(c) { return this.street.boxes.includes(c); }

    actor(e) {
      const a = { e, x: e.x, y: e.y, dir: -1, home: e.x, cd: 40 + e.id * 13 % 60, state: 'walk', t: 0, rise: 1, size: SIZE[e.type] * (1 + Math.min(e.power, 4) * 0.16) };
      if (e.type === 'mutant') { a.state = 'lurk'; a.rise = 0; }
      if (e.type === 'ninja' && e.hits) { a.state = 'perch'; a.ledge = this.railFor(a.x); a.y = a.ledge.y; a.x = this.onRail(a.ledge, a.x); }
      return a;
    }

    // The simulation runs at a fixed 60 steps a second, whatever the display does.
    start() {
      let last = performance.now(), spare = 0;
      const tick = now => {
        if (this.done) return;
        this.raf = requestAnimationFrame(tick); // first, so a throw in step/draw cannot end the loop for good
        spare = Math.min(spare + (now - last), 100); last = now;
        while (spare >= 1000 / 60 && !this.done) { if (!this.paused) this.step(); spare -= 1000 / 60; }
        if (!this.done) this.draw();
      };
      this.raf = requestAnimationFrame(tick);
    }
    stop() { this.done = true; cancelAnimationFrame(this.raf); this.paused = false; }
    // One pop-up at a time. A new one waits until the current one has been up long enough to read (BARK_READ frames),
    // and only the newest waiting line is kept: if two arrive while one is up, the later one is the one that matters.
    say(text) {
      if (this.barkT > BARK_TIME - BARK_READ) this.barkNext = text;
      else { this.bark = text; this.barkT = BARK_TIME; this.barkNext = null; }
    }

    // The pizza out there says something about what just happened (C.VOICES). Every event is counted per pizza in the
    // save: the count decides whether this one speaks (C.VOICE_RATE) and which line is next, so lines take turns and
    // a thing that happens all the time is answered now and then rather than every time, or never.
    speak(event, vars = {}, urgent = false) {
      const style = C.VOICES[this.slice.style] ? this.slice.style : 'ny', lines = C.VOICES[style][event];
      if (!lines) return;
      const said = this.camp.said || (this.camp.said = {}), k = `${style}.${event}`, c = said[k] || (said[k] = { n: 0, spoke: 0 });
      const n = c.n++, rate = C.VOICE_RATE[event];
      if (rate === 'often' && n >= 3 && n % 2) return;
      if (rate === 'sometimes' && n > 0 && n % 3) return;
      const bubble = C.BUBBLE.has(event);
      if (bubble && (this.speech || (this.quipGap > 0 && !urgent))) return;
      const text = lines[c.spoke++ % lines.length].replace(/\{(\w+)\}/g, (_, x) => vars[x] ?? '');
      if (bubble) { this.speech = { text, age: 0 }; this.quipGap = QUIP_GAP; } else this.say(text);
    }
    jolt(t) { this.trauma = Math.min(1, this.trauma + t); }
    // A hit holds the picture for a few frames. Holds never add up: a second one inside the first just extends to its end.
    hold(n) { this.freeze = Math.max(this.freeze, Math.min(n, 4)); }

    end(outcome, killer) {
      if (this.done) return;
      this.stop();
      A.play(outcome === 'delivered' ? 'deliver' : 'lost');
      this.onEnd({ outcome, killer: killer == null ? null : { street: this.street.id, id: killer }, street: this.street.id, x: this.p.x, topping: this.held(), left: this.left(), bites: this.bites, heat: Math.max(0, this.heat / this.heatMax), seconds: Math.round(this.frame / 60), removed: this.removed, checkpoints: this.found });
    }

    speed() {
      let s = this.style.speed;
      if (this.heat / this.heatMax < 0.3) s *= 0.85;
      return s;
    }

    camera() {
      return Math.max(0, Math.min(this.street.length - W, this.p.x - W / 2.6 + this.look));
    }

    step() {
      // A brief freeze on a hit gives it weight.
      if (this.freeze > 0) { this.freeze--; return; }
      // A stomp's bounce, held back while the pizza stood on the head it landed on.
      if (this.spring) { const v = this.spring; this.spring = 0; this.bounce(v); }
      if (this.wipe > 0) {
        if (--this.wipe === WIPE / 2) { const { id, x } = this.pending; this.enter(id, x); }
        return;
      }
      this.frame++;
      this.trauma = Math.max(0, this.trauma - 0.022);
      const { p, input, style: st } = this;
      if (this.barkT > 0) this.barkT--;
      if (this.barkNext && this.barkT <= BARK_TIME - BARK_READ) { this.bark = this.barkNext; this.barkT = BARK_TIME; this.barkNext = null; }
      if (this.quipGap > 0) this.quipGap--;
      if (this.speech && ++this.speech.age > this.speech.text.length * 2 + QUIP_HOLD) this.speech = null;
      if (this.invuln > 0) this.invuln--;
      if (this.denied > 0) this.denied--;
      if (this.specialCd > 0 && --this.specialCd === 0) A.play('note');
      if (this.smash > 0) this.smash--;
      if (this.splat > 0) this.splat--;
      this.wobbleStep();

      const dir = this.splat ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (dir) p.facing = dir;
      const dashing = this.smash > 0 && st.special === 'dash';
      const want = dashing ? p.facing * this.speed() * 2.3 : dir * this.speed();
      const rate = (dir ? st.accel : st.decel) * (p.grounded ? 1 : 0.7);
      p.vx += Math.max(-rate, Math.min(rate, want - p.vx));
      p.x = Math.max(0, Math.min(this.street.length - p.w, p.x + p.vx));
      for (const c of this.solids()) {
        if (p.y + p.h > GROUND - c.h + 3 && p.x + p.w > c.x && p.x < c.x + c.w) {
          if (dashing && this.isBox(c)) { this.breakBox(c); continue; }
          if (!this.isBox(c)) this.poke(c, Math.min(1, 0.4 + Math.abs(p.vx) / 12) * (dashing ? 1.3 : 1));
          p.x = p.vx > 0 ? c.x - p.w : c.x + c.w; p.vx = 0;
          this.bump(c);
        }
      }

      if (dashing) for (const a of this.actors) {
        if (a.cheesed || a.rise < 0.5 || a.y < GROUND - 60 || Math.abs(a.x - (p.x + p.w / 2)) > a.size / 2 + p.w / 2) continue;
        a.cheesed = true; this.cheese(a.x, a.y - a.size * 0.5, 0.75, p.facing);
      }
      if (input.take('jump')) this.buffer = 9;
      if (this.buffer > 0) this.buffer--;
      this.coyote = p.grounded ? 7 : Math.max(0, this.coyote - 1);
      if (this.buffer && this.coyote) {
        p.vy = -st.jump; p.grounded = false; this.coyote = 0; this.buffer = 0; this.bounced = false;
        this.wobV -= st.flop ? 0.05 : 0.02;
        A.play('jump');
      }
      // Letting go early cuts the jump short.
      if (!p.grounded && !this.bounced && p.vy < -10 && input.jumpHeld === false) p.vy = -10;
      if (input.take('special')) this.special();
      if (input.take('power')) this.power();
      if (input.take('turn')) this.takeTurn();

      const lastBottom = p.y + p.h, wasGrounded = p.grounded, fall = p.vy;
      p.vy += p.vy > 0 ? st.fall : st.gravity;
      p.vy = Math.min(p.vy, this.pounding ? 34 : st.maxFall);
      p.y += p.vy;
      p.grounded = false;
      if (p.y + p.h >= GROUND) {
        p.y = GROUND - p.h; p.vy = 0; p.grounded = true;
        if (this.pounding) { this.pounding = false; this.smash = 0; this.shockwave(); }
      }
      const tops = this.solids().map(c => ({ x: c.x, w: c.w, y: GROUND - c.h, solid: true, box: this.isBox(c) ? c : null, stock: this.isBox(c) ? null : c }));
      for (const pl of [...this.street.platforms, ...tops]) {
        if (p.vy >= 0 && lastBottom <= pl.y + 1 && p.y + p.h >= pl.y && p.x + p.w > pl.x && p.x < pl.x + pl.w) {
          if (pl.box && (this.pounding || (st.stomp && fall > 10))) { this.breakBox(pl.box); continue; }
          p.y = pl.y - p.h; p.vy = 0; p.grounded = true; this.perch = pl.solid ? TOP_SINK.solid : TOP_SINK.platform;
          if (pl.stock && !wasGrounded && fall > 3) this.poke(pl.stock, Math.min(1.2, 0.3 + fall / 18 + (this.pounding ? 0.6 : 0)));
          if (this.pounding) { this.pounding = false; this.smash = 0; this.shockwave(); }
        }
      }

      if (p.grounded && !wasGrounded) this.landed(fall);
      this.stride();
      this.sauceStep();
      this.dust = this.dust.filter(d => { d.x += d.vx; d.y += d.vy; d.vy += 0.05; return --d.t > 0; });
      this.wispStep();

      // Streets are longer than the heat tuning was set for, so the slice cools in step with them.
      this.heat -= st.heatDecay / C.TUNING.streetScale / 60;
      this.updateBand();
      this.fires();
      this.actorsStep();
      this.shotsStep();
      this.foesStep();
      this.dropsStep();
      this.pickupsStep();
      this.auraStep();
      this.bursts = this.bursts.filter(b => --b.t > 0);
      this.cheeseStep();
      this.obstacleStep();
      this.junctionStep();
      // The camera leans toward where the slice is heading, so there is room to react.
      this.look += (p.facing * 170 - this.look) * 0.04;
      this.cam += (this.camera() - this.cam) * 0.16;
      if (this.done) return;
      if (this.god) this.heat = this.cap;
      if (this.heat <= 0) return this.end('cold');
      this.doorStep();
    }

    solids() { return [...this.street.barricades, ...this.street.boxes.filter(b => !b.broken)]; }

    // Walking into something solid says once what it is: a crate gives, a barricade does not.
    bump(c) {
      const kind = this.isBox(c) ? 'box' : 'barricade', seen = this.hinted || (this.hinted = new Set());
      if (seen.has(kind)) return;
      seen.add(kind); this.speak(kind === 'box' ? 'hintBox' : 'hintBarricade');
    }

    // Jelly on a spring: every pizza has one, and each has its own stiffness.
    wobbleStep() {
      const st = this.style;
      this.wobV += -this.wob * st.spring;
      this.wobV *= st.damp;
      this.wob += this.wobV;
    }

    landed(fall) {
      const { p, style: st } = this;
      this.wobV += Math.min(0.42, fall * 0.018) * (st.flop ? 1.6 : 1);
      if (fall > 6) this.puff(p.x + p.w / 2, p.y + p.h, st.stomp ? 12 : 7);
      if (st.stomp && fall > 8) { this.jolt(0.34); A.play('smash'); }
      else if (st.flop) this.jolt(0.16);
      this.bounced = false;
    }

    // Deep Dish is so full of sauce it leaves a trail.
    sauceStep() {
      const { p, style: st } = this;
      for (const d of this.sauce) {
        if (d.pool) { d.t--; continue; }
        d.vy += 0.5; d.x += d.vx; d.y += d.vy;
        if (d.y >= GROUND) { d.y = GROUND; d.pool = true; d.t = 240; d.w = 10 + (d.seed % 3) * 8; }
      }
      this.sauce = this.sauce.filter(d => !d.pool || d.t > 0);
      if (!st.sauce || this.frame % (Math.abs(p.vx) > 1 ? 7 : 40)) return;
      const seed = this.frame * 7919 % 97, side = p.x + p.w * (0.2 + (seed % 7) / 10);
      this.sauce.push({ x: side, y: p.y + p.h * (0.45 + (seed % 4) / 10), vx: -p.vx * 0.15, vy: 1, seed });
    }

    drawSauce() {
      const { ctx } = this;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      for (const d of this.sauce) {
        const set = FX[d.pool ? 'sauce-splat' : 'sauce-drip'], img = S.layer(`props/${set[d.seed % set.length]}`);
        if (img) {
          const k = d.pool ? Math.min(1, d.t / 40) * (0.45 + (d.seed % 3) * 0.15) : 0.45;
          ctx.drawImage(img, Math.round(d.x - img.width * k / 2), Math.round(d.pool ? GROUND + 4 - img.height * k : d.y - img.height * k / 2), Math.round(img.width * k), Math.round(img.height * k));
          continue;
        }
        ctx.fillStyle = '#b3201a';
        if (d.pool) ctx.fillRect(Math.round(d.x - d.w / 2), GROUND + 2, d.w, 5);
        else ctx.fillRect(Math.round(d.x) - 3, Math.round(d.y) - 5, 6, 10);
      }
      ctx.restore();
    }

    // A heavy pizza's every step lands on the street.
    stride() {
      const { p, style: st } = this;
      const pace = Math.abs(p.vx) / st.speed;
      if (!p.grounded || pace < 0.2) return;
      this.pace += pace;
      const period = st.stomp ? 19 : st.flop ? 16 : 8;
      if (this.pace < period) return;
      this.pace = 0;
      this.puff(p.x + p.w / 2 - p.facing * p.w * 0.45, p.y + p.h, st.stomp ? 3 : 1);
      if (st.stomp) { this.jolt(0.12); this.wobV += 0.05; }
      if (st.flop) this.wobV += 0.06;
    }

    junctionStep() {
      const { p, street, junction: j } = this, cx = p.x + p.w / 2;
      if (cx > street.turnAt - 320 && R.reach(this.world, street)) { this.found++; this.speak('checkpoint', { name: j.name }); A.play('note'); }
      const inZone = cx > street.turnAt + TURN_ZONE[0] && cx < street.turnAt + TURN_ZONE[1] && !!j.turn;
      this.offer = inZone && j.open ? j.turn : null;
      this.heading = R.guide(this.camp, street, cx);
      if (this.heading.kind === 'door' && this.heading.left < 700 && !this.warned) { this.warned = true; this.speak('doorAhead', { customer: this.area0().customer }); }
      if (inZone && !j.open && !this.warned) { this.warned = true; this.speak('gate'); }
      if (p.x + p.w >= street.length - 2 && !this.wipe) this.go(j.keep.id);
    }

    takeTurn() { if (this.offer) { A.play('jump'); this.go(this.offer.id); } }
    go(id) { this.pending = { id, x: 120 }; this.wipe = WIPE; this.offer = null; }

    doorStep() {
      const { p, street, world } = this;
      if (street.door == null || p.x + p.w / 2 < street.door) return;
      if (street.address === world.delivery) this.end('delivered');
      else if (street.address > world.delivery && !this.warned) { this.warned = true; this.speak('nope'); }
    }

    updateBand() {
      const f = this.heat / this.heatMax;
      const band = f > 0.6 ? 'hot' : f > 0.3 ? 'warm' : 'cold';
      if (band !== this.heatBand) { this.heatBand = band; this.speak(band); }
    }

    fires() {
      for (const f of this.street.fires) {
        if (f.lit && Math.abs(this.p.x + this.p.w / 2 - f.x) < 58 && this.p.y + this.p.h > GROUND - 90) {
          f.lit = false; this.heat = Math.min(this.cap, this.heat + 40); this.speak('fire'); A.play('fire');
        }
      }
    }

    special() {
      const { p, style: st } = this;
      if (!st.special) return;
      if (this.specialCd > 0) { this.denied = 14; return; }
      this.specialCd = this.specialMax;
      if (st.special === 'dash') { this.smash = 24; this.jolt(0.14); this.invuln = Math.max(this.invuln, 24); A.play('jump'); this.chaseOff(); return; }
      if (p.grounded) { p.vy = st.flop ? -15 : -16; p.grounded = false; this.bounced = true; } else p.vy = 26;
      this.pounding = true; this.smash = 90;
    }

    shockwave() {
      const { p, style: st } = this;
      const reach = st.flop ? 340 : 260, x = p.x + p.w / 2;
      A.play('smash');
      this.bursts.push({ x, y: GROUND, r: reach, t: 16, color: '#f3e2bd' });
      this.jolt(st.flop ? 0.5 : 0.6); this.hold(3); this.wobV += st.flop ? 0.7 : 0.4;
      if (st.flop) this.splat = 26;
      this.puff(x, GROUND, 8);
      this.cheese(x, GROUND - 8, st.flop ? 1.4 : 1.15, 0, true);
      this.chaseOff(a => Math.abs(a.x - x) < reach && a.y > GROUND - 110);
      for (const b of this.street.boxes) if (!b.broken && Math.abs(b.x - x) < reach) this.breakBox(b);
      for (const c of this.street.barricades) if (Math.abs(c.x + c.w / 2 - x) < reach) this.poke(c, 1.2);
      this.gateHit(x, reach);
    }

    // One topping at a time, and when it is used up the slice is plain cheese.
    held() { return this.topping; }
    left() { return this.charges; }

    power() {
      const held = this.held();
      if (!held) return;
      const { p } = this, t = C.TOPPINGS[held], d = p.facing, x = p.x + p.w / 2, y = p.y + p.h * 0.45;
      const shot = o => this.shots.push({ x, y, vx: 18 * d, vy: 0, topping: held, color: t.color, life: 70, ...o });
      A.play('shot');
      switch (t.kind) {
        case 'shot': shot({}); break;
        case 'bounce': shot({ vx: 13 * d, vy: -5, bounce: true, life: 150, color: '#ff6a1f' }); break;
        case 'scatter': for (const vy of [-5, 0, 5]) shot({ vy }); break;
        case 'slam':
          for (const s of [-1, 1]) this.shots.push({ x, y: GROUND - 22, vx: 14 * s, vy: 0, topping: held, color: t.color, life: 45, wave: true });
          break;
        case 'leap': p.vy = -27; p.grounded = false; this.bounced = true; break;
        case 'reheat': this.heat = Math.min(this.cap, this.heat + 28); this.bursts.push({ x, y, r: 80, t: 12, color: '#7fd46a' }); break;
        case 'aura': this.aura = !this.aura; return;
      }
      this.spend(1);
    }

    spend(n) {
      this.charges = Math.max(0, this.charges - n);
      if (this.charges) return;
      this.topping = null; this.aura = false;
      this.speak('spent');
    }

    // A special sends every enemy in sight packing for good, and a mutant already on the slice's tail.
    chaseOff(near = null) {
      let n = 0;
      for (const a of this.actors) {
        if (a.leaving || a.rise < 0.3) continue;
        if (!(a.x > this.cam - 120 && a.x < this.cam + W + 120) && a.state !== 'chase') continue;
        // Turtles are as they were: a landing stuns those within its reach, and nothing removes one.
        if (a.e.type === 'turtle') { if (near && near(a)) this.hit(a, 'smash'); continue; }
        const e = a.e, dropped = R.defeat(this.camp, e);
        this.removed++; n++;
        a.hitAt = this.frame; a.hurt = 0; a.caught = null; a.leaving = true; a.t = 0; a.dir = Math.sign(a.x - this.p.x) || 1;
        for (const t of dropped) this.drops.push({ x: a.x, y: Math.min(a.y, GROUND) - 50, topping: t });
        this.bursts.push({ x: a.x, y: a.y - 40, r: 48, t: 10, color: '#ffffff' });
        if (e.type === 'mutant') { a.state = 'sink'; this.temp.push(a.x); continue; }
        a.state = 'flee';
        this.note(e.type, { teen: 'flees', ninja: 'gone' }[e.type]);
      }
      if (n) this.speak('scatter');
    }

    // Cheese goes everywhere: gooey blobs fly out, a few on stretchy strings, with a fleck or two of sauce, then drop
    // and splat flat on the street. power scales the count and the throw; dir leans it forward for a dash; pool
    // leaves a big puddle under a landing. The pieces are painted sprites; this only throws them.
    cheese(x, y, power = 1, dir = 0, pool = false) {
      const bits = this.cheeseBits, n = Math.round(10 + 12 * power);
      for (let i = 0; i < n; i++) {
        const r = rand(this.frame * 31 + i * 7), q = rand(this.frame * 17 + i * 13 + 5);
        const ang = -Math.PI / 2 + (r - 0.5) * (dir ? 1.6 : 2.6) + dir * 0.9, v = (6 + q * 10) * power;
        const what = i % 7 === 6 ? 'sauce' : 'cheese';
        bits.push({ what, x, y, ox: x, oy: y, vx: Math.cos(ang) * v + dir * 4, vy: Math.sin(ang) * v, t: 0, stuck: 0,
          art: i % 2 ? 'drip' : 'drop', pick: i, size: 0.55 + q * 0.6 * Math.min(power, 1.3), spin: (r - 0.5) * 0.3, rot: ang, string: what === 'cheese' && i % 4 === 0 });
      }
      if (pool) bits.push({ what: 'cheese', x, y: GROUND, vx: 0, vy: 0, t: 0, stuck: 1, pool: true, pick: this.frame, size: 1.6 * power });
      if (bits.length > 160) bits.splice(0, bits.length - 160);
    }

    cheeseStep() {
      this.cheeseBits = this.cheeseBits.filter(c => {
        c.t++;
        if (c.stuck) return ++c.stuck < (c.pool ? 80 : 50);
        c.vy += 0.62; c.vx *= 0.985; c.x += c.vx; c.y += c.vy; c.rot += c.spin;
        if (c.y >= GROUND - 2 && c.vy > 0) { c.y = GROUND; c.stuck = 1; c.string = false; }
        return c.t < 120;
      });
    }

    feedMutant(a) {
      R.feed(this.camp, a.e);
      this.removed++; this.note('mutant', 'feed'); this.speak('feed'); A.play('bribe');
      a.state = 'sink'; a.leaving = true; a.t = 0;
      this.temp.push(a.x);
    }

    // Enemies
    actorsStep() {
      const { p } = this;
      const cx = p.x + p.w / 2;
      for (const a of this.actors) {
        const e = a.e, dist = Math.abs(a.x - cx), power = 1 + Math.min(e.power, 4) * 0.12;
        if (a.hurt > 0) a.hurt--;
        if (a.leaving) { this.leave(a); continue; }
        if (dist > 1350 && a.state !== 'chase' && a.state !== 'perch') continue;
        if (e.type === 'teen') this.teen(a, dist, power);
        else if (e.type === 'turtle') this.turtle(a, power);
        else if (e.type === 'ninja') this.ninja(a, dist, power);
        else this.mutant(a, cx);
        if (a.leaving) continue;
        // A stomp counts a little before the boxes touch, so a jump that lands on a head is a stomp.
        const stomp = (e.type === 'teen' || e.type === 'turtle') && this.stompable(a);
        if (stomp || this.touching(a)) this.collide(a);
      }
      this.actors = this.actors.filter(a => !a.goneNow);
    }

    // The nearest fire escape, and the closest spot on it.
    railFor(x) {
      const rails = this.street.platforms.filter(l => l.ledge);
      const gap = l => Math.max(0, l.x - x, x - l.x - l.w);
      return rails.reduce((best, l) => (gap(l) < gap(best) ? l : best), rails[0]) || { x: x - 30, w: 60, y: GROUND - 330 };
    }

    onRail(l, x) { return Math.max(l.x + 30, Math.min(l.x + l.w - 30, x)); }

    leave(a) {
      a.t++;
      if (a.state === 'sink') { a.rise = Math.max(0, a.rise - 0.05); if (a.rise <= 0) a.goneNow = true; return; }
      a.x += a.dir * 9;
      if (a.t > 90) a.goneNow = true;
    }

    // Wandering respects the crates and barricades: a teen or turtle turns round at one, a ninja hops up onto it
    // and drops off the far side. One that starts the street overlapping a block may walk out of it.
    // (Fleeing and chasing are not wandering: a fleeing teen or a mutant on the chase still goes straight through.)
    patrol(a, pace) {
      const half = a.size * 0.3, next = a.x + a.dir * pace;
      const hit = x => this.solids().find(c => x + half > c.x && x - half < c.x + c.w);
      if (a.e.type === 'ninja') {
        a.x = next;
        const under = hit(a.x), floor = under ? GROUND - under.h : GROUND;
        a.y += (floor - a.y) * (floor < a.y ? 0.45 : 0.3);   // up quickly, down a touch slower: a hop
        if (Math.abs(a.y - floor) < 1) a.y = floor;
      } else {
        const ahead = hit(next);
        if (ahead && ahead !== hit(a.x)) a.dir *= -1; else a.x = next;
      }
      if (Math.abs(a.x - a.home) > a.e.range) { a.x = a.home + Math.sign(a.x - a.home) * a.e.range; a.dir *= -1; }
    }

    teen(a, dist, power) {
      if (a.state === 'film') {
        if (--a.t <= 0) a.state = 'walk';
        return;
      }
      this.patrol(a, 2.7 * power);
      if (a.e.toppings.length) this.attack(a);
      if (dist < 520) {
        a.watch = (a.watch || 0) + 1;
        if (a.watch === 120 && this.street.filmed == null) {
          a.state = 'film'; a.t = 50; a.dir = Math.sign(this.p.x - a.x) || 1;
          this.street.filmed = a.x;
          this.bursts.push({ x: a.x, y: a.y - 100, r: 40, t: 8, color: '#ffffff' });
          this.note('teen', 'films'); this.speak('filmed');
        }
      }
    }

    turtle(a, power) {
      if (a.state === 'munch' || a.state === 'stun') { if (--a.t <= 0) a.state = 'walk'; return; }
      this.patrol(a, 1.3 * power);
    }

    ninja(a, dist, power) {
      // Caught it, bows, and sends it straight back. Then off up the fire escapes.
      if (a.state === 'bow') {
        a.dir = Math.sign(this.p.x + this.p.w / 2 - a.x) || 1;
        if (++a.t === BOW) this.throwBack(a);
        if (a.t >= BOW + 14) { a.state = a.ledge && a.y < GROUND - 1 ? 'perch' : 'leap'; a.t = 0; }
        return;
      }
      if (a.state === 'leap') {
        a.t++;
        const f = a.t / 34;
        if (a.t === 1) a.ledge = this.railFor(a.x);
        a.x += (this.onRail(a.ledge, a.x) - a.x) * 0.2;
        a.y = GROUND + (a.ledge.y - GROUND) * f - Math.sin(f * Math.PI) * 90;
        if (f >= 1) { a.y = a.ledge.y; a.state = 'perch'; }
        return;
      }
      if (a.state === 'perch') {
        const want = this.p.x + this.p.facing * 240;
        a.dir = Math.sign(this.p.x - a.x) || 1;
        a.x += Math.max(-7, Math.min(7, (want - a.x) * 0.05));
        a.x = this.onRail(a.ledge, a.x);
      } else this.patrol(a, 2.7 * power);
      if (dist < 900) this.attack(a);
    }

    mutant(a, cx) {
      switch (a.state) {
        case 'lurk':
          if (cx > a.x + 60 && cx < a.x + 900) {
            a.state = 'peek'; a.t = 0; this.note('mutant', 'peeks'); this.speak('drain'); A.play('note'); this.puff(a.x, GROUND, 6);
          }
          break;
        case 'peek':
          a.t++;
          a.rise = a.t < 12 ? a.t / 12 * 0.45 : 0.45;
          if (a.t > 54) { a.state = 'rise'; a.t = 0; }
          break;
        case 'rise':
          a.rise = Math.min(1, a.rise + 0.05);
          if (a.rise >= 1) { a.state = 'chase'; this.note('mutant', 'chases'); }
          break;
        case 'chase': {
          // Far behind, it sprints to close the gap so it is seen on the screen before it arrives.
          const speed = Math.max(this.style.speed * 1.35, 8) * (Math.abs(cx - a.x) > MUTANT_GAP ? 1.6 : 1);
          a.dir = Math.sign(cx - a.x) || 1;
          a.x += a.dir * Math.min(speed, Math.abs(cx - a.x));
          break;
        }
      }
    }

    throwBack(a) {
      const t = a.caught, spec = C.TOPPINGS[t], dx = this.p.x + this.p.w / 2 - a.x, high = a.y < GROUND - 120;
      const span = Math.max(30, Math.abs(dx) / 13);
      a.threw = this.frame + 30; a.caught = null;
      this.foes.push({
        x: a.x, y: a.y - a.size / 2, vx: Math.sign(dx) * 13, vy: high ? (this.p.y + this.p.h / 2 - a.y + a.size / 2) / span : spec.kind === 'bounce' ? -5 : 0,
        bounce: spec.kind === 'bounce', color: spec.color, topping: t, owner: a.e.id, life: 130,
      });
    }

    attack(a) {
      if (--a.cd > 0) return;
      const e = a.e, dx = this.p.x - a.x;
      a.cd = e.toppings.length ? 80 : 110; a.threw = this.frame + 30;
      if (Math.abs(dx) > 800) return;
      if (e.type === 'ninja') this.note('ninja', e.toppings.length ? 'debt' : 'throws');
      const t = e.toppings.length ? e.toppings[this.frame % e.toppings.length] : null;
      const spec = t ? C.TOPPINGS[t] : null, high = a.y < GROUND - 120;
      const span = Math.max(30, Math.abs(dx) / 10);
      this.foes.push({
        x: a.x, y: a.y - a.size / 2, vx: Math.sign(dx) * 10, vy: high ? (this.p.y + this.p.h / 2 - a.y + a.size / 2) / span : spec && spec.kind === 'bounce' ? -5 : 0,
        bounce: !!spec && spec.kind === 'bounce', color: spec ? spec.color : '#444', topping: t, star: !spec, owner: e.id, life: 130,
      });
    }

    touching(a) {
      const { p } = this, half = a.size / 2;
      // Up on a fire escape it throws from above and cannot be bumped, so a tall pizza walks under it.
      if (a.rise < 0.5 || a.y < GROUND - 60) return false;
      return p.x + p.w - 6 > a.x - half && p.x + 6 < a.x + half && p.y + p.h > a.y - a.size && p.y < a.y;
    }

    // Coming down on an enemy, or just past the top of the jump: feet in the upper part of it, with slack
    // at its sides. Walking into it from the side keeps the feet low, so that stays a bite.
    stompable(a) {
      const { p } = this, k = C.TUNING.stomp;
      if (a.rise < 0.5 || p.grounded || p.vy < k.apexVy) return false;
      const feet = p.y + p.h, top = a.y - a.size, half = a.size / 2;
      if (feet < top - k.reachAbove || feet > top + a.size * k.window) return false;
      return p.x + p.w - 6 + k.slack > a.x - half && p.x + 6 - k.slack < a.x + half;
    }

    collide(a) {
      const { p } = this, e = a.e;
      const stomped = this.stompable(a);
      if (this.smash > 0) { this.hit(a, 'smash'); return; }
      if (e.type === 'turtle') {
        if (stomped) { a.state = 'stun'; a.t = STUN; this.plant(a); this.bounce(27); this.note('turtle', 'stun'); this.note('turtle', 'armored'); return; }
        if (a.state !== 'walk') return;
        this.hurt(e.id, a.x);
        a.state = 'munch'; a.t = CHOMP; this.note('turtle', 'bites');
        return;
      }
      if (e.type === 'teen' && stomped) { this.plant(a); this.bounce(16); this.note('teen', 'stomp'); this.speak('stomp'); this.flee(a); return; }
      if (e.type === 'ninja' && stomped) this.note('ninja', 'bounce');
      if (e.type === 'mutant') {
        this.hurt(e.id, a.x);
        if (this.done) return;
        R.feed(this.camp, e); this.removed++; this.note('mutant', 'bite'); this.speak('bite');
        a.state = 'sink'; a.leaving = true; a.t = 0; this.temp.push(a.x);
        return;
      }
      if (e.type === 'ninja' && a.state === 'bow') return;
      this.hurt(e.id, a.x);
    }

    bounce(v) {
      if (this.planting) { this.spring = v; this.planting = false; return; }
      this.p.vy = -v; this.p.grounded = false; this.bounced = true; this.wobV += 0.14; A.play('jump'); }

    flee(a) {
      const dropped = R.defeat(this.camp, a.e);
      this.removed++;
      for (const t of dropped) this.drops.push({ x: a.x, y: a.y - 50, topping: t });
      a.leaving = true; a.t = 0; a.state = 'flee'; a.dir = Math.sign(a.x - this.p.x) || 1;
      this.speak('flees');
    }

    // What each hit does depends entirely on who it hits. how is 'shot', 'wave', 'aura' or 'smash',
    // and topping is what was thrown, if anything was. A hit that lands within a few frames of the last one
    // on the same enemy is the same hit (a scatter's three shots, a dash dragging through); a second one after that counts.
    hit(a, how, topping = null) {
      const e = a.e;
      if (a.leaving || this.frame - (a.hitAt ?? -99) < HIT_GAP) return;
      if (e.type === 'turtle') {
        const state = how === 'smash' || how === 'aura' ? 'stun' : 'munch';
        if (a.state === state) { a.t = Math.max(a.t, 30); return; }
      }
      a.hitAt = this.frame;
      if (how !== 'aura') { A.play('smash'); if (how !== 'smash') { this.jolt(0.14); this.hold(2); } }
      this.bursts.push({ x: a.x, y: a.y - 40, r: 48, t: 10, color: '#ffffff' });
      switch (e.type) {
        case 'teen': this.note('teen', 'flees'); this.flee(a); break;
        case 'turtle':
          a.state = how === 'smash' || how === 'aura' ? 'stun' : 'munch'; a.t = a.state === 'stun' ? STUN : CHOMP;
          this.note('turtle', how === 'smash' ? 'armored' : 'munch');
          break;
        case 'mutant': this.feedMutant(a); break;
        case 'ninja': {
          // The stank is too much for a ninja: it is off at once and stays off. Otherwise each hit counts.
          const dropped = how === 'aura' ? R.defeat(this.camp, e) : R.strike(this.camp, e);
          a.hurt = 22;
          if (dropped) {
            this.removed++; a.leaving = true; a.t = 0; a.state = 'flee'; a.dir = Math.sign(a.x - this.p.x) || 1;
            for (const t of dropped) this.drops.push({ x: a.x, y: Math.min(a.y, GROUND) - 50, topping: t });
            this.note('ninja', 'gone'); this.speak('ninjaGone');
          } else if (topping) {
            a.state = 'bow'; a.t = 0; a.caught = topping;
            this.note('ninja', 'bows'); this.speak('bow'); A.play('bribe');
          } else {
            this.note('ninja', 'climbs'); this.speak('ninjaHit');
            if (a.state === 'walk') { a.state = 'leap'; a.t = 0; }
          }
          break;
        }
      }
    }

    // A learned behavior goes on the board at once, in case she pauses to look.
    note(type, key) {
      if (R.learn(this.camp, type, key)) { this.speak('note'); A.play('note'); }
    }

    // A bite comes off the slice, and with it a share of the heat it can ever hold again.
    hurt(owner, fromX) {
      if (this.invuln > 0) return;
      this.speak('hurt');
      const chunk = this.heatMax / C.BITES;
      this.bites++; this.cap = this.heatMax - this.bites * chunk; this.heat = Math.min(this.cap, this.heat - chunk);
      this.invuln = 90; this.jolt(0.45); this.hold(4); this.wobV += 0.2;
      A.play('hit');
      this.p.vy = -10; this.p.vx = this.p.x < fromX ? -9 : 9;
      if (this.heat <= 0.01) this.end('dead', owner);
    }

    puff(x, y, n) {
      for (let i = 0; i < n; i++) {
        const spread = n > 1 ? (i - n / 2) * 0.7 : -this.p.facing * 0.8;
        this.dust.push({ x, y: y - 4, vx: spread, vy: -0.6 - (i % 3) * 0.3, t: 22, r: 7 + (i % 3) * 3 });
      }
    }

    breakBox(b) {
      if (b.broken) return;
      b.broken = true;
      A.play('smash'); this.jolt(0.16);
      this.bursts.push({ x: b.x + b.w / 2, y: GROUND - 40, r: 70, t: 12, color: '#b8843f' });
      if (this.smash > 0) this.cheese(b.x + b.w / 2, GROUND - b.h * 0.6, 0.8, this.style.special === 'dash' ? this.p.facing : 0);
    }

    gateHit(x, reach) {
      const { junction: j, street } = this;
      if (!j.turn || !j.turn.gated || j.open || Math.abs(x - street.turnAt) > reach) return false;
      R.breakGate(this.camp, j.turn.id);
      this.junction = R.junction(this.world, street);
      this.bursts.push({ x: street.turnAt, y: GROUND - 50, r: 110, t: 14, color: '#b8843f' });
      A.play('smash'); this.jolt(0.3);
      if (R.nextPaper(this.camp)) this.speak('paper'); else this.speak('opened', { street: j.turn.name });
      return true;
    }

    shotsStep() {
      for (const s of this.shots) {
        s.x += s.vx; s.y += s.vy; s.life--; s.age = (s.age || 0) + 1;
        if (s.bounce) { s.vy += 0.7; if (s.y > GROUND - 14) { s.y = GROUND - 14; s.vy = -12; } }
        for (const b of this.street.boxes) {
          if (!b.broken && s.life > 0 && s.x > b.x - 8 && s.x < b.x + b.w + 8 && s.y > GROUND - b.h) { this.breakBox(b); s.life = 0; }
        }
        if (s.life > 0 && s.y > GROUND - 130 && this.gateHit(s.x, 60)) s.life = 0;
        for (const a of this.actors) {
          if (a.leaving || s.life <= 0 || a.rise < 0.3) continue;
          if (Math.abs(s.x - a.x) < a.size / 2 + 10 && s.y > a.y - a.size - 6 && s.y < a.y + 6) {
            this.hit(a, s.wave ? 'wave' : 'shot', s.topping);
            s.life = 0;
          }
        }
      }
      this.shots = this.shots.filter(s => s.life > 0);
    }

    foesStep() {
      const { p } = this;
      for (const f of this.foes) {
        f.x += f.vx; f.y += f.vy; f.life--; f.age = (f.age || 0) + 1;
        if (f.bounce) { f.vy += 0.55; if (f.y > GROUND - 14) { f.y = GROUND - 14; f.vy = -11; } }
        if (f.y > GROUND) f.life = 0;
        if (f.x > p.x && f.x < p.x + p.w && f.y > p.y && f.y < p.y + p.h) {
          this.hurt(f.owner, f.x); f.life = 0;
        }
      }
      this.foes = this.foes.filter(f => f.life > 0);
    }

    // A new topping replaces whatever was on the slice.
    grab(topping) {
      this.topping = topping; this.charges = C.CHARGES;
      this.speak('grab');
      this.aura = false;
      A.play('fire');
    }

    dropsStep() {
      const { p } = this;
      for (const d of this.drops) {
        if (d.y < GROUND - 28) d.y += 4;
        if (Math.abs(d.x - p.x - p.w / 2) < 62 && Math.abs(d.y - p.y - p.h / 2) < 80) {
          d.taken = true;
          this.speak('recovered');
          this.grab(d.topping);
        }
      }
      this.drops = this.drops.filter(d => !d.taken);
    }

    pickupsStep() {
      const { p, street } = this;
      street.pickups.forEach((k, i) => {
        const key = `${street.id}.${i}`;
        if (this.taken.has(key)) return;
        if (Math.abs(k.x - p.x - p.w / 2) < p.w / 2 + 26 && k.y > p.y - 26 && k.y < p.y + p.h + 26) {
          this.taken.add(key);
          this.grab(k.topping);
          // A first pickup of a topping also unlocks it for every pie after this one.
          const fresh = R.collect(this.camp, k.topping);
          this.speak(fresh ? 'unlocked' : 'pickup', { topping: C.TOPPINGS[k.topping].name });
        }
      });
    }

    // Heat rising off the crust: a lot when fresh out of the oven, thinning as it cools.
    wispStep() {
      const { p } = this, f = Math.max(0, this.heat / this.heatMax);
      this.sweep += (p.vx - this.sweep) * 0.12;
      if (Math.random() < f * f * 0.16 * (p.w / 72)) this.wisps.push({ at: 0.1 + Math.random() * 0.8, seed: Math.random() * 7, age: 0, t: 30 + Math.random() * 24, len: 16 + f * 30 * Math.sqrt(p.w / 72), size: f > 0.55 ? 6 : 5 });
      this.wisps = this.wisps.filter(w => ++w.age < w.t);
    }

    auraStep() {
      this.fumes = this.fumes.filter(w => ++w.age < w.t);
      if (!this.aura) { this.fumes.length = 0; return; }
      if (this.frame % 3 === 0 && this.fumes.length < 46) {
        const R = C.TUNING.auraRadius, a = Math.random() * 7, d = R * (0.2 + Math.random() * 0.75);
        this.fumes.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, vx: Math.cos(a) * 0.35 + (Math.random() - 0.5) * 0.4, vy: -0.5 - Math.random() * 0.5, age: 0, t: 70 + Math.random() * 60, seed: Math.random() * 7, size: 6 + Math.floor(Math.random() * 3) * 2, green: Math.random() < 0.55 });
      }
      if (++this.auraTick % AURA_USE === 0) this.spend(1);
      if (this.auraTick % 20) return;
      // It rises, so it counts as half as far up: whoever is on a fire escape above is in it too. Every kind is.
      const cx = this.p.x + this.p.w / 2, cy = this.p.y + this.p.h / 2;
      for (const a of this.actors) {
        if (a.rise > 0.3 && Math.hypot(a.x - cx, (a.y - 50 - cy) * 0.5) < C.TUNING.auraRadius) this.hit(a, 'aura');
      }
    }


    // The stank: rippling green and cream bands out to the edge of its reach, a wobbling dashed rim, stink
    // lines wafting up through it, and puffs drifting off.
    drawAura() {
      const { ctx, p } = this, f = this.frame, R = C.TUNING.auraRadius, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      const pulse = 1 + Math.sin(f / 14) * 0.025;
      ctx.save();
      ctx.beginPath(); ctx.rect(this.cam - 40, -40, W + 80, GROUND + 40 + 22); ctx.clip();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const ring = (scale, lobes, speed, wave) => {
        ctx.beginPath();
        for (let i = 0; i <= 90; i++) {
          const a = i / 90 * Math.PI * 2, r = R * scale * pulse * (1 + Math.sin(a * lobes + f * speed) * wave + Math.sin(a * (lobes + 3) - f * speed * 1.3) * wave * 0.6);
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.92;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
      };
      // Bands, outside in: each a wavy-edged cloud at its own speed, so the edges slide over each other.
      [[1, '#4a8a2e', 0.3, 5, 0.035, 0.035], [0.86, '#f1ecc0', 0.36, 4, -0.045, 0.045], [0.7, '#6aa83c', 0.38, 6, 0.05, 0.05], [0.54, '#f1ecc0', 0.4, 3, -0.06, 0.06], [0.36, '#a9d462', 0.45, 5, 0.07, 0.07]]
        .forEach(([scale, color, alpha, lobes, speed, wave]) => { ctx.globalAlpha = alpha; ctx.fillStyle = color; ring(scale, lobes, speed, wave); ctx.fill(); });
      // The rim of the reach, so the edge reads: heavy ink, a cream dash crawling along it.
      ring(1, 5, 0.035, 0.035);
      ctx.globalAlpha = 0.75; ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#d9ec96'; ctx.lineWidth = 3; ctx.setLineDash([22, 12]); ctx.lineDashOffset = -f * 0.6; ctx.stroke(); ctx.setLineDash([]);
      // Stink lines: wavy strands that rise, thin out, and start again somewhere else.
      for (let i = 0; i < 14; i++) {
        const seed = i * 2.399, d = R * (0.2 + ((i * 37) % 11) / 11 * 0.7), life = (f / 100 + i * 0.137) % 1, len = 64 + (i % 3) * 20;
        const bx = cx + Math.cos(seed) * d, by = cy + Math.sin(seed) * d * 0.7 + 30 - life * 150;
        ctx.globalAlpha = Math.min(1, Math.sin(life * Math.PI) * 1.8);
        for (const [w, color] of [[9, INK], [5, '#7cbb3c'], [2, '#f6f0c8']]) {
          ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
          for (let k = 0; k <= len; k += 5) {
            const x = bx + Math.sin(k / 11 + f / 9 + i) * (6 + k * 0.1), y = by - k;
            if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      }
      // Puffs: fumes that drift out and up, wobbling, fattening as they thin.
      for (const w of this.fumes) {
        const t = w.age / w.t, x = cx + w.x + w.vx * w.age + Math.sin(w.age / 9 + w.seed) * 9, y = cy + w.y + w.vy * w.age, r = w.size * (1.6 + t * 1.6);
        ctx.globalAlpha = Math.sin(t * Math.PI) * 0.75;
        ctx.fillStyle = w.green ? '#8fc653' : '#f1ecc0';
        for (const [dx, dy, k] of [[0, 0, 1], [-r * 0.8, r * 0.2, 0.7], [r * 0.7, r * 0.15, 0.75]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r * k, 0, 7); ctx.fill(); }
      }
      ctx.restore();
    }

    // Drawing
    art(name) { return `${this.city.id}/${this.area.id}/${name}`; }

    draw() {
      const shake = this.trauma * this.trauma, real = this.ctx;
      // A shaking frame is drawn flat into a spare canvas and moved as one picture. Drawing every painted layer
      // through a rotated, zoomed transform made each shake frame several times dearer than a still one.
      if (shake > 0.002) {
        const buf = this.shakeBuf || (this.shakeBuf = Object.assign(document.createElement('canvas'), { width: W, height: H }));
        this.ctx = buf.getContext('2d');
        this.drawWorld();
        this.ctx = real;
        const f = this.frame, dx = shake * 14 * Math.sin(f * 1.7), dy = shake * 9 * Math.sin(f * 2.3 + 1), lean = shake * 0.006 * Math.sin(f * 1.1);
        // Zoomed in a little, so no edge of the stage ever shows.
        real.save();
        real.translate(W / 2 + dx, H / 2 + dy); real.rotate(lean); real.scale(1 + shake * 0.05, 1 + shake * 0.05); real.translate(-W / 2, -H / 2);
        real.drawImage(buf, 0, 0);
        real.restore();
      } else this.drawWorld();
      this.hud();
      this.drawSpeech();
      if (this.wipe > 0) this.drawWipe();
    }

    drawWorld() {
      const { ctx, cam, area } = this, pal = area.palette, f = this.frame;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, pal.skyTop); sky.addColorStop(1, pal.skyBottom);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      S.tile(ctx, this.art('far'), cam, 0.2, W);
      S.tile(ctx, this.art('mid'), cam, 0.5, W);
      ctx.save(); ctx.translate(-Math.round(cam), 0);
      ctx.fillStyle = pal.ground; ctx.fillRect(cam - 30, GROUND, W + 60, H - GROUND + 40);
      ctx.fillStyle = pal.top; ctx.fillRect(cam - 30, GROUND, W + 60, 12);
      ctx.restore();
      S.ground(ctx, `${this.city.id}/${area.id}/ground`, cam, GROUND, W);
      S.tile(ctx, this.art('near'), cam, 1, W);
      ctx.save(); ctx.translate(-Math.round(cam), 0);
      this.drawJunction();
      for (const pl of this.street.platforms) this.drawPlatform(pl);
      for (const x of this.street.drains) S.prop(ctx, 'props/drain', x, GROUND + 8);
      for (const x of this.temp) S.prop(ctx, 'props/drain', x, GROUND + 8);
      for (const c of this.street.barricades) this.drawObstacle(c);
      for (const b of this.street.boxes) this.drawBox(b);
      this.drawFires(); this.drawDead(); this.drawDoor();
      this.drawPickups();
      for (const a of this.actors) this.drawActor(a);
      for (const d of this.drops) this.drawToken(d.topping, d.x, d.y);
      for (const s of this.shots) this.drawShot(s, s.wave ? 16 : 11);
      for (const k of this.foes) {
        if (k.star && S.prop(ctx, 'props/star', k.x, k.y + 16)) continue;
        if (k.topping) { this.drawShot(k, 11); continue; }
        ctx.fillStyle = k.color; ctx.fillRect(k.x - 9, k.y - 9, 18, 18);
      }
      if (this.aura) this.drawAura();
      ctx.fillStyle = 'rgba(235,225,205,0.45)';
      for (const d of this.dust) dot(ctx, d.x, d.y, d.r * (d.t / 22));
      this.drawSauce();
      this.drawWisps();
      this.drawPlayer();
      for (const b of this.bursts) this.drawBurst(b);
      this.drawCheese();
      this.drawFlour();
      this.drawParty();
      ctx.restore();
    }

    // The next stretch comes in like a comic panel turning over.
    drawWipe() {
      const { ctx } = this, half = WIPE / 2, cover = 1 - Math.abs(this.wipe - half) / half;
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, H / 2 * cover); ctx.fillRect(0, H - H / 2 * cover, W, H / 2 * cover);
      ctx.fillStyle = K.CORAL; ctx.fillRect(0, H / 2 * cover - 10, W, 10 * Math.min(1, cover * 4)); ctx.fillRect(0, H - H / 2 * cover, W, 10 * Math.min(1, cover * 4));
      if (cover > 0.8 && this.pending) {
        const name = this.world.streets[this.pending.id].name;
        ctx.font = K.display(40, 700); ctx.textAlign = 'center';
        const w = ctx.measureText(name).width + 70;
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.025); ctx.translate(-W / 2, -H / 2);
        K.card(ctx, W / 2 - w / 2, H / 2 - 38, w, 76, { r: 14, shadow: 6 });
        ctx.fillStyle = K.TEXT; ctx.fillText(name, W / 2, H / 2 + 14);
        ctx.restore();
      }
    }

    // Flashing lights all down the street to her porch, as though a DJ is playing inside.
    drawParty() {
      const { ctx, street, frame } = this;
      if (!this.city.final || street.address !== 2) return;
      const beat = Math.floor(frame / 12) % 4, tint = ['#ff3fa4', '#4fd8ff', '#ffe14f', '#b45cff'][beat];
      const near = Math.max(0, 1 - Math.abs(this.p.x - street.door) / 1400);
      ctx.save(); ctx.globalAlpha = 0.28 * near; ctx.fillStyle = tint;
      ctx.beginPath(); ctx.moveTo(street.door, GROUND - 240); ctx.lineTo(street.door - 620 + beat * 90, GROUND + 20); ctx.lineTo(street.door + 420 - beat * 70, GROUND + 20); ctx.fill();
      ctx.restore();
    }

    drawPlatform(pl) {
      const { ctx, area } = this, x0 = Math.max(pl.x, this.cam - 80), x1 = Math.min(pl.x + pl.w, this.cam + W + 80);
      if (x1 <= x0) return;
      const start = pl.x + Math.floor((x0 - pl.x) / 64) * 64;
      if (S.strip(ctx, pl.ledge ? 'props/ledge' : `${this.city.id}/platform`, start, pl.y, x1 - start)) return;
      ctx.fillStyle = area.palette.ground; ctx.fillRect(start, pl.y, x1 - start, pl.ledge ? 12 : 24);
      ctx.fillStyle = area.palette.top; ctx.fillRect(start, pl.y, x1 - start, 7);
    }

    drawBox(b) {
      const { ctx } = this;
      if (b.broken) { if (!S.prop(ctx, this.boxArt('box-broken'), b.x + b.w / 2, GROUND + DEBRIS_SINK)) { ctx.fillStyle = '#8a6030'; ctx.fillRect(b.x, GROUND - 12, b.w, 12); } return; }
      if (S.prop(ctx, this.boxArt('box'), b.x + b.w / 2, GROUND + PROP_SINK + S.rise(this.boxArt('box')))) { this.drawCrack(b); return; }
      ctx.fillStyle = '#b8843f'; ctx.fillRect(b.x, GROUND - b.h, b.w, b.h);
      ctx.strokeStyle = '#2a1830'; ctx.lineWidth = 5; ctx.strokeRect(b.x + 3, GROUND - b.h + 3, b.w - 6, b.h - 6);
      ctx.beginPath(); ctx.moveTo(b.x + 4, GROUND - b.h + 4); ctx.lineTo(b.x + b.w - 4, GROUND - 4); ctx.moveTo(b.x + b.w - 4, GROUND - b.h + 4); ctx.lineTo(b.x + 4, GROUND - 4); ctx.stroke();
    }

    drawObstacle(c) {
      const { ctx } = this, cx = c.x + c.w / 2;
      ctx.save();
      if (c.jig) {
        const k = c.jig, t = c.jt;
        ctx.translate(cx, GROUND);
        if (c.kind === 'flour') { const o = Math.sin(t * 0.5) * k; ctx.scale(1 + o * 0.1, 1 - o * 0.1); }
        else if (c.kind === 'cans') ctx.rotate(Math.sin(t * 0.55) * k * 0.07);
        else if (c.kind === 'parm') ctx.rotate(Math.sin(t * 0.26) * k * 0.06);
        else if (c.kind === 'salami') ctx.transform(1, 0, -Math.sin(t * 0.3) * k * 0.14, 1, 0, 0);
        ctx.translate(-cx, -GROUND);
      }
      if (!S.prop(ctx, this.barArt(c), cx, GROUND + PROP_SINK)) { ctx.fillStyle = '#5b4a3a'; ctx.fillRect(c.x, GROUND - c.h, c.w, c.h); }
      ctx.restore();
    }

    // Flour hangs in the air and thins out; puffs swell as they fade.
    drawFlour() {
      const { ctx } = this;
      if (!this.flour.length) return;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      for (const f of this.flour) {
        const img = S.layer(`props/flour-puff-${1 + (f.pick % 8)}`);
        if (!img) continue;
        const life = f.t / f.life, k = f.size * (0.7 + life * 0.6);
        ctx.globalAlpha = Math.min(1, (1 - life) * 1.6);
        ctx.drawImage(img, Math.round(f.x - img.width * k / 2), Math.round(f.y - img.height * k / 2), Math.round(img.width * k), Math.round(img.height * k));
      }
      ctx.restore();
    }

    // A stack that gives way shows a small tear in its front; a barricade is whole.
    drawCrack(b) {
      const { ctx } = this, x = b.x, y = GROUND - b.h, w = b.w;
      const at = (u, v) => [Math.round(x + (0.12 + u * 0.42) * w), Math.round(y + (0.42 + v * 0.5) * b.h)];
      const line = [[0.7, 0.02], [0.56, 0.2], [0.66, 0.34], [0.48, 0.52], [0.56, 0.62], [0.4, 0.8]];
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const [lw, color] of [[5, INK], [2, '#fff3d6']]) {
        ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
        line.forEach(([u, v], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, ...at(u, v)));
        ctx.moveTo(...at(0.66, 0.34)); ctx.lineTo(...at(0.84, 0.44));
        ctx.stroke();
      }
      ctx.restore();
    }

    // The corner: a crosswalk and a sign with the real street names. Reading it is the player's job.
    drawJunction() {
      const { ctx, street, junction: j, frame, cam } = this, x = street.turnAt;
      if (x < cam - 500 || x > cam + W + 500) return;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 8; i++) ctx.fillRect(x - 170 + i * 48, GROUND + 4, 28, 60);
      if (j.turn && j.turn.gated && !j.open) {
        if (!S.prop(ctx, this.boxArt('box-pile'), x, GROUND + PROP_SINK + S.rise(this.boxArt('box-pile')))) { ctx.fillStyle = '#b8843f'; ctx.fillRect(x - 90, GROUND - 120, 180, 120); }
      }
      if (!S.prop(ctx, 'props/sign', x + 150, GROUND)) { ctx.fillStyle = '#3a4a3a'; ctx.fillRect(x + 145, GROUND - 200, 10, 200); }
      const label = (text, y, color) => {
        ctx.font = K.display(22, 600); ctx.textAlign = 'left';
        const w = ctx.measureText(text).width + 24;
        K.card(ctx, x + 164, y, w, 32, { fill: color, r: 8, b: 3, shadow: 3 });
        ctx.fillStyle = '#fff'; ctx.fillText(text, x + 176, y + 24);
      };
      label(`${j.keep.name} ▶`, GROUND - 232, '#2f6b3f');
      if (j.turn) label(`▲ ${j.turn.name}`, GROUND - 194, j.open ? '#2b5f8a' : '#6b5a4a');
      // A sly lookout in Chicago, before the ninjas are anyone's problem.
      if (this.city.watchers && street.turn !== null && street.length > 3500 && this.p.x < x - 500) {
        S.draw(ctx, 'ninja', S.has('ninja', 'crouch') ? 'crouch' : 'walk', frame * 16.7, x + 150, GROUND - 200, 118);
      }
    }

    drawPickups() {
      const { street, frame } = this;
      street.pickups.forEach((k, i) => {
        if (!this.taken.has(`${street.id}.${i}`)) this.drawToken(k.topping, k.x, k.y + Math.sin(frame / 14 + i) * 7);
      });
    }

    drawToken(topping, x, y) {
      const { ctx } = this;
      if (S.prop(ctx, `props/pickup-${topping}`, x, y + 28)) return;
      ctx.fillStyle = '#fff3c4'; dot(ctx, x, y, 24);
      ctx.fillStyle = C.TOPPINGS[topping].color; dot(ctx, x, y, 17);
    }

    // Thrown toppings tumble end over end, flip like a coin, and flex as they fly: stretched along the
    // throw, then squashed, with a wobble across the path. Wave shots just flex.
    drawShot(s, r) {
      const { ctx } = this, art = s.topping && S.layer(`props/shot-${s.topping}`), t = (s.age || 0) + (s.x * 0.013 % 3);
      const dir = Math.sign(s.vx) || 1, bobY = s.wave ? 0 : Math.sin(t * 0.5) * 4;
      const flex = Math.sin(t * 0.7), flip = s.wave ? 1 : 0.3 + 0.7 * Math.abs(Math.cos(t * 0.33));
      const sx = 1 + flex * 0.3, sy = (1 - flex * 0.24) * flip;
      // A couple of ghost copies trail behind it, smaller and fainter.
      const draw = (x, y, scale, alpha, spin) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(spin * dir);
        ctx.scale(sx * scale, sy * scale);
        if (art) { ctx.imageSmoothingEnabled = false; ctx.drawImage(art, -art.width / 2, -art.height / 2); }
        else {
          ctx.fillStyle = '#2a1830'; dot(ctx, 0, 0, r + 3);
          ctx.fillStyle = s.color; dot(ctx, 0, 0, r);
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; dot(ctx, -r * 0.3, -r * 0.3, r * 0.35);
        }
        ctx.restore();
      };
      if (!s.wave) for (const k of [2, 1]) draw(s.x - s.vx * k * 0.9, s.y + bobY - s.vy * k * 0.9, 1 - k * 0.12, 0.18 / k, (t - k) * 0.4);
      draw(s.x, s.y + bobY, 1, 1, s.wave ? 0 : t * 0.4);
    }

    // Bursts are hard pixel shards flying out, in keeping with the art, not soft discs.
    drawBurst(b) {
      const { ctx } = this, life = b.t / (b.life || (b.life = b.t)), reach = b.r * (1 - life * life);
      const size = Math.max(4, Math.round(b.r / 14));
      const count = Math.round(10 + b.r / 8);
      ctx.fillStyle = b.color;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.399, far = reach * (0.45 + ((i * 37) % 11) / 18);
        ctx.fillRect(Math.round(b.x + Math.cos(angle) * far) - size / 2, Math.round(b.y + Math.sin(angle) * far) - size / 2, size, size);
      }
    }

    // Flying pieces turn along their path; early on a few still hang from the middle on a stretched cheese string.
    // On the street each becomes a splat that shrinks away. Without the painted pieces nothing is drawn.
    drawCheese() {
      const { ctx } = this;
      if (!this.cheeseBits.length) return;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      const piece = (what, kind, pick) => { const set = FX[`${what}-${kind}`]; return set && S.layer(`props/${set[pick % set.length]}`); };
      const blit = (img, x, y, rot, sx, sy, ax = 0.5, ay = 0.5) => {
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); ctx.scale(sx, sy);
        ctx.drawImage(img, -img.width * ax, -img.height * ay); ctx.restore();
      };
      for (const c of this.cheeseBits) {
        if (!c.string || c.t >= 16) continue;
        const img = piece('cheese', 'string', c.pick);
        if (!img) continue;
        const len = Math.hypot(c.x - c.ox, c.y - c.oy), thin = 1 - c.t / 16;
        if (len > 4) blit(img, c.ox, c.oy, Math.atan2(c.y - c.oy, c.x - c.ox), len / img.width, Math.max(0.3, thin), 0, 0.5);
      }
      for (const c of this.cheeseBits) {
        if (c.stuck) {
          const img = piece(c.what, 'splat', c.pick);
          if (!img) continue;
          const life = c.pool ? 80 : 50, fade = Math.min(1, (life - c.stuck) / 18), grow = Math.min(1, 0.4 + c.stuck / 5);
          blit(img, c.x, GROUND + 3, 0, c.size * grow * fade, c.size * fade, 0.5, 1);
        } else {
          const img = piece(c.what, c.art, c.pick);
          if (!img) continue;
          const st = Math.min(1.5, 1 + Math.hypot(c.vx, c.vy) / 30);
          blit(img, c.x, c.y, c.art === 'drip' ? Math.atan2(c.vy, c.vx) + Math.PI / 2 : c.rot, c.size / Math.sqrt(st), c.size * st);
        }
      }
      ctx.restore();
    }

    drawFires() {
      const { ctx } = this;
      for (const f of this.street.fires) {
        // A little pixel campfire with a plus on it, flickering between two frames; embers once used.
        if (S.prop(ctx, `props/${f.lit ? (Math.floor(this.frame / 9) % 2 ? 'fire-2' : 'fire') : 'fire-out'}`, f.x, GROUND + PROP_SINK)) continue;
        ctx.fillStyle = '#39302b'; ctx.fillRect(f.x - 27, GROUND - 62, 54, 62);
        if (f.lit) { ctx.font = '46px serif'; ctx.textAlign = 'center'; ctx.fillText('🔥', f.x, GROUND - 62); }
      }
    }

    drawDead() {
      for (const d of this.street.dead) {
        const st = C.STYLES[d.style];
        if (!S.draw(this.ctx, sliceArt(d.style), 'cold', 0, d.x, GROUND, st.height, 1, 1, { bites: d.bites || 0, sink: FOOT_SINK })) drawSlice(this.ctx, d.x, GROUND - 38, d.style, d.topping, '#8f8f8a', 1.5, true);
      }
    }

    drawDoor() {
      const { ctx, street, world, frame } = this;
      if (street.door == null) return;
      const x = street.door, active = street.address === world.delivery;
      const name = S.layer(this.art('door')) ? this.art('door') : null;
      if (!name || !S.prop(ctx, name, x, GROUND + PROP_SINK)) {
        ctx.fillStyle = '#2b1d14'; ctx.fillRect(x - 56, GROUND - 165, 112, 165);
        ctx.fillStyle = active ? '#ffd76a' : '#6b5a4a'; ctx.fillRect(x - 42, GROUND - 150, 84, 150);
        this.drawDoorSign(x - 56, GROUND - 206, 112, 41, active);
      } else {
        // The painted doors carry a lettered board across the top. A new one, wordless, hangs over it.
        const art = S.layer(name), big = art.height > 220;
        const [bx, by, bw, bh] = big ? [18, 20, art.width - 36, 58] : [0, 0, art.width, 41];
        this.drawDoorSign(x - art.width / 2 + bx, GROUND - art.height + by, bw, bh, active);
      }
      if (active) {
        ctx.fillStyle = '#ffd76a'; ctx.strokeStyle = '#1f1410'; ctx.lineWidth = 5; ctx.font = 'bold 52px system-ui, sans-serif'; ctx.textAlign = 'center';
        const y = GROUND - 190 + Math.sin(frame / 7) * 9;
        ctx.strokeText('▼', x, y); ctx.fillText('▼', x, y);
      } else if (street.address < world.delivery) {
        ctx.fillStyle = '#b8843f'; ctx.fillRect(x + 66, GROUND - 16, 62, 16);
      }
    }

    // The delivery sign: a wooden shingle with the pizza character on it, no words, glowing gold when this is the door.
    drawDoorSign(x, y, w, h, active) {
      const { ctx, frame } = this, cx = x + w / 2;
      ctx.save();
      ctx.lineJoin = 'round';
      if (active) { ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 14 + Math.sin(frame / 8) * 6; }
      ctx.fillStyle = INK; ctx.fillRect(x, y, w, h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = active ? '#8a5430' : '#5e4234'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      ctx.fillStyle = active ? '#a8693a' : '#74554a'; ctx.fillRect(x + 4, y + 4, w - 8, 4);
      ctx.fillStyle = active ? '#6e4223' : '#4a342b'; ctx.fillRect(x + 4, y + h * 0.5 - 1, w - 8, 2);
      ctx.strokeStyle = active ? '#e8b64a' : '#a08a5a'; ctx.lineWidth = 2; ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
      ctx.fillStyle = '#e9d8a0'; for (const [rx, ry] of [[x + 9, y + 9], [x + w - 12, y + 9], [x + 9, y + h - 12], [x + w - 12, y + h - 12]]) ctx.fillRect(rx, ry, 3, 3);
      // The pizza character on it, wearing its topping, greyed when this is not the door.
      S.stamp(ctx, this.slice.style, this.slice.topping, cx, y + h - 8, w - 16, h - 14, { grey: !active, count: C.CHARGES });
      ctx.restore();
    }

    // Which animation an enemy shows for its state.
    actorAnim(a) {
      const e = a.e;
      const bob = a.hurt > 0 && S.has(e.type, 'hurt') ? 'hurt' : { walk: 'walk', film: 'film', flee: 'flee', munch: 'munch', stun: 'stun', leap: 'leap', perch: 'crouch', chase: 'run', rise: 'idle', peek: 'idle', lurk: 'idle', sink: 'idle', bow: 'crouch' }[a.state] || 'walk';
      let anim = a.threw > this.frame && S.has(e.type, 'throw') ? 'throw' : bob;
      if (!S.has(e.type, anim)) anim = S.has(e.type, 'walk') ? 'walk' : 'run';
      return anim;
    }

    // How far an enemy's feet sink into what it stands on: the pavement, a fire escape, or (a wandering ninja) a block's top.
    actorSink(a, grounded) {
      if (grounded) return FOOT_SINK;
      if (a.state === 'perch') return TOP_SINK.platform;
      return a.e.type === 'ninja' && a.state === 'walk' && this.solids().some(c => a.y === GROUND - c.h && a.x > c.x && a.x < c.x + c.w) ? TOP_SINK.solid : 0;
    }

    // A stomp lands all the way: the pizza stands on the top of the enemy's drawing, its border over the enemy's as on
    // any top, and the picture holds there a moment. The bounce waits until the hold is over.
    plant(a) {
      const grounded = a.y >= GROUND - 1, sink = this.actorSink(a, grounded);
      const top = S.top(a.e.type, this.actorAnim(a), this.frame * 16.7, a.y, a.size, sink);
      if (top == null) return;
      const { p } = this;
      p.y = top - p.h; p.vy = 0; p.grounded = true; this.perch = TOP_SINK.solid; this.planting = true;
      this.hold(3);
    }

    // Which drawing an enemy uses. Teens are one of their city's three (C.TEENS), fixed per teen so the same kid
    // is the same kid every time the street is entered.
    artOf(e) {
      const kids = e.type === 'teen' && C.TEENS[this.city.id];
      if (!kids) return e.type;
      let h = e.id * 31;
      for (const ch of this.street.id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
      return kids[h % kids.length];
    }

    drawActor(a) {
      const { ctx } = this, e = a.e;
      const anim = this.actorAnim(a);
      if (a.rise <= 0) return;
      ctx.save();
      // Mutants come up through the street, so the ground hides whatever has not risen yet.
      if (a.rise < 1) { ctx.beginPath(); ctx.rect(a.x - 200, a.y - a.size - 40, 400, a.size + 40); ctx.clip(); ctx.translate(0, a.size * (1 - a.rise)); }
      const facing = a.dir, bow = a.state === 'bow' ? Math.sin(Math.min(1, a.t / (BOW * 0.6)) * Math.PI) : 0;
      // The bow: a dip and a lean toward the slice, holding up what it caught.
      if (bow) { ctx.translate(a.x, a.y); ctx.rotate(bow * 0.45 * facing); ctx.translate(-a.x, -a.y); }
      const grounded = a.y >= GROUND - 1, sink = this.actorSink(a, grounded);
      if (grounded) this.shadow(a.x, GROUND + FOOT_SINK * 0.6, a.size * 0.3, 0.3);
      const look = this.artOf(e), args = [anim, this.frame * 16.7, a.x, a.y, a.size, facing, 1 - bow * 0.12, { sink }];
      if (!S.draw(ctx, look, ...args) && (look === e.type || !S.draw(ctx, e.type, ...args))) {
        ctx.font = `${a.size}px serif`; ctx.textAlign = 'center'; ctx.fillText(FACE[e.type], a.x, a.y - 4);
      }
      ctx.restore();
      if (a.caught) this.drawToken(a.caught, a.x + facing * a.size * 0.3, a.y - a.size * 0.95);
      e.toppings.slice(0, 5).forEach((t, i) => { ctx.fillStyle = C.TOPPINGS[t].color; dot(ctx, a.x - 34 + i * 17, a.y - a.size - 14, 7); });
      if (e.type === 'ninja' && e.hits) { ctx.fillStyle = '#ff3b1f'; for (let i = 0; i < e.hits; i++) ctx.fillRect(a.x - 18 + i * 14, a.y - a.size - 26, 10, 10); }
      if (a.state === 'stun') { ctx.fillStyle = '#ffd76a'; for (let i = 0; i < 3; i++) dot(ctx, a.x + Math.cos(this.frame / 7 + i * 2.1) * 34, a.y - a.size - 8 + Math.sin(this.frame / 7 + i * 2.1) * 9, 5); }
    }

    // Each wisp is a wavy line that lifts off the crust, and running bends it back.
    drawWisps() {
      const { ctx, p, style: st } = this, crust = p.y + p.h - st.height;
      const paint = (color, grow, alpha) => {
        ctx.fillStyle = color;
        for (const w of this.wisps) {
          const base = crust + 6 - w.age * WISP_RISE, x = p.x + p.w * w.at, len = w.len * Math.min(1, w.age / 10);
          ctx.globalAlpha = alpha * Math.min(1, (1 - w.age / w.t) * 2.5);
          for (let d = 0; d < len; d += 2) {
            const up = (crust + 6 - (base - d)) / 60;
            const wave = Math.sin(d / 7 + w.age / 6 + w.seed) * 3.5, back = this.sweep * WISP_SWEEP * up * up;
            const n = w.size + grow - (d > len - 8 || d < 4 ? 1 : 0);
            ctx.fillRect(Math.round((x + wave - back) / 2) * 2 - grow / 2, Math.round((base - d) / 2) * 2 - grow / 2, n, n);
          }
        }
      };
      // Paper-cutout heat: an orange strip with a thick white edge round it.
      paint('#fffbe8', 6, 0.95);
      paint('#ff7a2e', 0, 1);
      ctx.globalAlpha = 1;
    }

    drawPlayer() {
      const { ctx, p, style: st } = this;
      if (this.invuln > 0 && this.frame % 10 < 5) ctx.globalAlpha = 0.5;
      const f = this.heat / this.heatMax, art = sliceArt(this.slice.style), cx = p.x + p.w / 2;
      const cheese = f > 0.6 ? '#ffcc33' : f > 0.3 ? '#e8bc55' : '#c9b48a';
      const stretch = !p.grounded ? Math.min(0.14, Math.abs(p.vy) * 0.008) : 0;
      const splat = this.splat / 26, squash = Math.max(0.35, 1 - Math.max(-0.2, this.wob) + stretch - splat * 0.5);
      const wide = 1 + Math.max(-0.1, this.wob) * 0.8 - stretch * 0.5 + splat * 0.45;
      const moving = Math.abs(p.vx) > 0.5, pace = Math.abs(p.vx) / st.speed;
      const cold = f <= 0.3 && p.grounded && !moving;
      const special = this.smash > 0 && S.has(art, 'special');
      const anim = special ? 'special' : !p.grounded ? (p.vy > 2 && S.has(art, 'fall') ? 'fall' : 'jump') : moving ? 'run' : cold ? 'cold' : 'idle';
      // One-shot animations play from their own start, and a run plays at the speed of the feet.
      if (anim !== this.anim) { this.anim = anim; this.animMs = 0; }
      this.animMs += 16.7 * (anim === 'run' ? Math.max(0.5, pace) : 1);
      const flop = st.flop ? Math.sin(this.frame / 9) * (moving ? 7 : 2.5) - p.vx * 1.3 + p.vy * 0.6 + this.wob * 30 : 0;
      const tilt = (p.vx / st.speed) * (st.flop ? 0.05 : 0.07);
      const air = Math.max(0, GROUND - (p.y + p.h)), sink = p.grounded && air > 1 ? this.perch : FOOT_SINK * Math.max(0, 1 - air / 14);
      this.shadow(cx, GROUND + FOOT_SINK * 0.6, st.height * 0.34 * (1 + Math.max(-0.1, this.wob) * 0.5), 0.34 * Math.max(0, 1 - air / 260));
      const dress = this.held() ? { piece: pieceArt(this.held(), this.slice.style), count: this.left() } : null;
      if (!S.draw(ctx, art, anim, this.animMs, cx, p.y + p.h, st.height, p.facing, squash, { wide, tilt, flop, dress, bites: this.bites, sink })) {
        drawSlice(ctx, cx, p.y + p.h * 0.5 + (1 - squash) * 36, this.slice.style, this.held(), cheese, 2.15 * st.height / 124, false, p.facing, squash);
      }
      ctx.globalAlpha = 1;
    }

    // What the pizza just said, typed out in a box over its head.
    drawSpeech() {
      const { ctx, p, style: st, speech } = this;
      if (!speech) return;
      const shown = Math.min(speech.text.length, Math.floor(speech.age / 1.6));
      // Drawing goes on while paused but the age does not, so a dit here would repeat every frame.
      if (!this.paused && shown < speech.text.length && speech.age % 4 === 0) A.dit(this.slice.style);
      ctx.font = K.body(23, 800); ctx.textAlign = 'left';
      const w = ctx.measureText(speech.text).width + 30, h = 40;
      const cx = p.x + p.w / 2 - this.cam, x = Math.max(12, Math.min(W - w - 12, cx - w / 2)), y = Math.max(176, p.y + p.h - st.height - h - 30);
      // The tail first, so the card's border covers where it joins.
      const tx = Math.round(Math.max(x + 22, Math.min(x + w - 22, cx)));
      const tail = (grow, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(tx - 11 - grow, y + h - 4); ctx.lineTo(tx + 11 + grow, y + h - 4); ctx.lineTo(tx + 2, y + h + 15 + grow); ctx.closePath(); ctx.fill(); };
      tail(4, INK); ctx.save(); ctx.translate(3, 4); tail(4, INK); ctx.restore(); tail(2, '#fff');
      K.card(ctx, x, y, w, h, { r: 12, shadow: 3 });
      tail(-1, K.PAPER);
      ctx.fillStyle = K.TEXT; ctx.fillText(speech.text.slice(0, shown), x + 15, y + 28);
    }

    // The slices still in the box, as small portraits of their characters wearing their toppings, in a row at the
    // far end of the heat bar. The one out on the street is the bulb.
    drawSlices(x, cy) {
      const { ctx } = this, CW = 36, CH = 42, STEP = 40;
      this.camp.pies[this.city.id].slices.filter(sl => sl !== this.slice && sl.status === 'ready').forEach((sl, i) => {
        const cx = x + i * STEP + CW / 2;
        K.card(ctx, cx - CW / 2, cy - CH / 2, CW, CH, { r: 8, b: 2, shadow: 2 });
        S.stamp(ctx, sl.style, sl.topping, cx, cy + CH / 2 - 3, CW - 4, CH - 6, { count: C.CHARGES });
      });
    }

    // A little GPS: how far, and the next thing to do. The street signs do the rest.
    guideBar() {
      const { ctx, heading: h } = this;
      if (!h) return;
      const cx = this.p.x + this.p.w / 2, past = h.kind === 'turn' && cx > this.street.turnAt + TURN_ZONE[1];
      const feet = n => `${Math.max(0, Math.round(n / 10) * 10).toLocaleString()} ft`;
      let text;
      if (h.kind === 'door') text = `${feet(h.left)} to ${this.area0().customer}`;
      else if (past) text = C.BARKS.missed;
      else if (h.kind === 'turn') text = `${feet(h.left)} to the turn onto ${h.street.name}`;
      else text = `${feet(h.left)}, then ${h.street.name}`;
      ctx.font = K.body(22, 800); ctx.textAlign = 'center';
      const w = ctx.measureText(text).width + 40, x = 880;
      K.card(ctx, x - w / 2, 16, w, 42, { r: 21, shadow: 4 });
      ctx.fillStyle = K.TEXT; ctx.fillText(text, x, 46);
    }

    // A soft contact shadow flat on the street under whatever stands on it.
    shadow(x, y, rx, alpha) {
      if (alpha <= 0.01) return;
      const { ctx } = this;
      ctx.save(); ctx.fillStyle = INK; ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rx, rx * 0.16 + 3, 0, 0, 7); ctx.fill();
      ctx.restore();
    }

    // A label on a paper sticker; (x, y) is the left end of the text's baseline.
    inkText(text, x, y, size = 20) {
      const { ctx } = this;
      ctx.font = K.body(size, 800); ctx.textAlign = 'left';
      const w = ctx.measureText(text).width + 24;
      K.card(ctx, x - 12, y - size - 4, w, size + 14, { r: 10, b: 3, shadow: 3 });
      ctx.fillStyle = K.TEXT; ctx.fillText(text, x, y + 1);
    }

    // Health is a heat bar, a thermometer sticker with the active pizza as its bulb. Heat fills it from the bulb,
    // a bite takes a scalloped chunk off the far end for good, and a lost chunk drains away slowly in cream.
    drawHealth(x, y) {
      const { ctx } = this, GW = 322, GH = 34, PAD = 10, R = 34, w = GW + PAD * 2, h = GH + PAD * 2, f = this.frame, bx = R - 4, bodyLen = GW - bx;
      if (!this.gauge) { this.gauge = document.createElement('canvas'); this.gaugeInk = document.createElement('canvas'); for (const c of [this.gauge, this.gaugeInk]) { c.width = w; c.height = h; } }
      // Smooth: the bar eases to the true heat, and what a hit took trails behind in cream.
      const heat = Math.max(0, this.heat);
      this.shownHeat += (heat - this.shownHeat) * (heat > this.shownHeat ? 0.25 : 0.18);
      this.shownCap += (this.cap - this.shownCap) * 0.14;
      this.ghost = heat > this.ghost ? heat : Math.max(heat, this.ghost - 0.12 - (this.ghost - heat) * 0.025);
      const max = this.heatMax, fill = this.shownHeat / max, capF = this.shownCap / max, ghostF = Math.min(capF, this.ghost / max);
      const g = this.gauge.getContext('2d');
      g.clearRect(0, 0, w, h);
      g.save(); g.translate(PAD, PAD);
      const shape = () => { g.beginPath(); if (g.roundRect) g.roundRect(0, 0, GW, GH, GH / 2); else g.rect(0, 0, GW, GH); };
      shape(); g.fillStyle = '#e8dcc0'; g.fill();
      g.save(); shape(); g.clip();
      // Colour runs warm to cold with the heat.
      const mix = (a, b, k) => { const n = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const A = n(a), B = n(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
      const hot = fill > 0.5, k = Math.max(0, Math.min(1, hot ? (fill - 0.5) * 2 : fill * 2));
      const c1 = hot ? mix('#ffb23a', '#ff6a1f', k) : mix('#8fc4e0', '#ffb23a', k);
      const edge = bx + bodyLen * ghostF, mid = bx + bodyLen * fill;
      if (ghostF > fill) { g.fillStyle = '#fff'; g.fillRect(mid, 0, edge - mid, GH); }
      g.fillStyle = c1; g.fillRect(0, 0, Math.max(0, mid), GH);
      g.fillStyle = 'rgba(255,255,255,.38)'; g.fillRect(0, 4, Math.max(0, mid), 5);
      // Marks along the edge, one per bite the slice can take.
      g.fillStyle = INK;
      for (let i = 1; i < C.BITES; i++) { const mx = Math.round(bx + bodyLen * i / C.BITES); g.globalAlpha = 0.55; g.fillRect(mx - 1, 0, 2, 7); g.fillRect(mx - 1, GH - 7, 2, 7); }
      g.globalAlpha = 1;
      g.restore();
      // Bites: whatever lies past the cap is gone, with scalloped teeth marks along the new edge.
      if (capF < 0.999) {
        const cut = bx + bodyLen * capF;
        g.globalCompositeOperation = 'destination-out';
        g.fillRect(cut + 8, -4, GW, GH + 8);
        for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cut + 8, GH * (0.17 + i * 0.33), GH * 0.22, 0, 7); g.fill(); }
        g.globalCompositeOperation = 'source-over';
      }
      g.restore();
      // The cut: the bar's silhouette stamped around itself in the game's ink, then white, with a solid shadow.
      const k2 = this.gaugeInk.getContext('2d');
      k2.clearRect(0, 0, w, h); k2.globalCompositeOperation = 'source-over'; k2.drawImage(this.gauge, 0, 0);
      k2.globalCompositeOperation = 'source-in'; k2.fillStyle = INK; k2.fillRect(0, 0, w, h);
      const k3 = this.gaugeCut || (this.gaugeCut = document.createElement('canvas')); k3.width = w; k3.height = h;
      const kc = k3.getContext('2d'); kc.drawImage(this.gauge, 0, 0); kc.globalCompositeOperation = 'source-in'; kc.fillStyle = '#fff'; kc.fillRect(0, 0, w, h);
      ctx.save();
      // A hit shakes the gauge.
      const shake = this.invuln > 70 ? Math.sin(f * 2.4) * 3 : 0, hit = this.invuln > 70;
      ctx.translate(x + shake, y);
      const left = R * 2 - 36, top = R - GH / 2 - PAD;
      for (let a = 0; a < 20; a++) ctx.drawImage(this.gaugeInk, left + 3 + Math.round(Math.cos(a / 20 * 6.2832) * 5), top + 4 + Math.round(Math.sin(a / 20 * 6.2832) * 5));
      for (let a = 0; a < 20; a++) ctx.drawImage(this.gaugeInk, left + Math.round(Math.cos(a / 20 * 6.2832) * 5), top + Math.round(Math.sin(a / 20 * 6.2832) * 5));
      for (let a = 0; a < 20; a++) ctx.drawImage(this.gaugeCut, left + Math.round(Math.cos(a / 20 * 6.2832) * 3), top + Math.round(Math.sin(a / 20 * 6.2832) * 3));
      ctx.drawImage(this.gauge, left, top);
      // The bulb: a sticker disc with the pizza in it, tinted blue as it cools and red when it is hit.
      const cx = R + 4, cy = R + 4, bob = Math.round(Math.sin(f / 14) * 1.5);
      K.disc(ctx, cx, cy, R, hit ? '#ffb3a8' : fill < 0.3 ? '#cfe6f0' : K.PAPER, { b: 4, shadow: 4 });
      S.stamp(ctx, this.slice.style, this.held(), cx, cy + R - 5 + bob, R * 1.75, R * 1.8, { count: this.left() });
      ctx.restore();
    }

    // The special button on the touch pad shows its progress as a dial filling round it.
    syncSpecialButton() {
      const btn = this.btn || (this.btn = document.getElementById('specialBtn'));
      if (!btn || !this.style.special) return;
      const cd = this.specialMax ? Math.round(this.specialCd / this.specialMax * 100) / 100 : 0;
      if (cd !== this.btnCd) { this.btnCd = cd; btn.style.setProperty('--cd', cd); btn.classList.toggle('ready', cd === 0); }
    }

    hud() {
      const { ctx, world, city } = this;
      this.drawHealth(14, 12);
      this.drawSlices(392, 50);
      // Addresses done, and the street we are on.
      city.areas.forEach((a, i) => {
        K.disc(ctx, 36 + i * 32, 124, 8, i < world.delivery ? '#4fcf6a' : i === world.delivery ? K.SUN : '#e6dcc0', { b: 3, shadow: 2 });
      });
      this.inkText(this.street.name, 36 + city.areas.length * 32 + 8, 130, 17);
      this.syncSpecialButton();
      this.guideBar();
      if (this.barkT > 0) {
        ctx.font = K.body(26, 700); ctx.textAlign = 'center';
        const w = ctx.measureText(this.bark).width + 44, bx = W / 2 + 110;
        K.card(ctx, bx - w / 2, 96, w, 46, { r: 14, shadow: 4 });
        ctx.fillStyle = K.TEXT; ctx.fillText(this.bark, bx, 129);
      }
    }
  }

  const sliceArt = style => `slice-${style}`;
  const pieceArt = (topping, style) => `props/piece-${topping}-${style}`;

  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fill(); }

  // Placeholder slices: wedge, charred round, jumbo wedge, or thick pan square.
  function drawSlice(ctx, x, y, style, topping, cheese, scale = 1, dead = false, facing = 1, squash = 1) {
    api.fallbackDraws++;
    ctx.save(); ctx.translate(x, y); ctx.scale(scale * facing, scale * squash);
    if (dead) ctx.rotate(1.35);
    const crust = dead ? '#77736b' : { ny: '#d59a4c', naples: '#c98a44', deep: '#a8662b', jumbo: '#d59a4c' }[style];
    const thick = style === 'deep' ? 12 : 6;
    if (style === 'deep') { ctx.fillStyle = crust; ctx.fillRect(-20, -22, 40, 46); ctx.fillStyle = cheese; ctx.fillRect(-16, -16, 32, 30); }
    else {
      ctx.fillStyle = cheese; ctx.beginPath(); ctx.moveTo(-20, -18); ctx.lineTo(20, -18); ctx.lineTo(0, 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = crust; ctx.fillRect(-23, -23, 46, thick + 3);
      if (style === 'naples') { ctx.fillStyle = '#3a2413'; for (const c of [-14, 2, 15]) dot(ctx, c, -20, 3); }
    }
    if (topping) {
      ctx.fillStyle = dead ? '#666' : C.TOPPINGS[topping].color;
      for (const [a, b] of [[-9, -8], [8, -6], [0, 5]]) dot(ctx, a, b, 4);
    }
    if (!dead) { ctx.fillStyle = '#20140c'; dot(ctx, -5, -13, 2.2); dot(ctx, 7, -13, 2.2); }
    ctx.restore();
  }

  const api = root.PR_PLAY = { Run, W, H, drawSlice, dot, pieceArt, fallbackDraws: 0 };
})(window);
