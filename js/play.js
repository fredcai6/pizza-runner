// One slice, out on the city's streets. Reads the world, changes it through the rules, reports how it ended.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES, S = root.PR_SPRITES, A = root.PR_SOUND;
  const W = 1280, H = 720, GROUND = R.GROUND;
  const HIT = 12, BITE = 16, TALK_RANGE = 180, TURN_ZONE = [-240, 80];
  const FACE = { turtle: '🐢', teen: '🧑‍🎤', mutant: '🧟', ninja: '🥷' };
  const SIZE = { turtle: 92, teen: 118, mutant: 120, ninja: 118 };
  const CHOMP = 170, STUN = 150, WIPE = 22;

  class Run {
    constructor(canvas, input, { camp, city, world, slice, start, onEnd }) {
      Object.assign(this, { canvas, ctx: canvas.getContext('2d'), input, camp, city, world, slice, onEnd });
      this.style = C.STYLES[slice.style];
      const st = this.style;
      this.topping = slice.topping;
      this.charges = slice.topping ? C.TOPPINGS[slice.topping].charges : 0;
      this.override = null;
      this.heat = this.heatMax = st.heatMax;
      this.p = { x: 0, y: GROUND - st.h, vx: 0, vy: 0, w: st.w, h: st.h, grounded: true, facing: 1 };
      this.invuln = 0; this.specialCd = 0; this.smash = 0; this.pounding = false; this.splat = 0; this.pace = 0;
      this.coyote = 0; this.buffer = 0; this.bounced = false;
      this.wob = 0; this.wobV = 0; this.trauma = 0; this.freeze = 0;
      this.aura = false; this.auraTick = 0;
      this.bursts = []; this.dust = [];
      this.look = 0; this.cam = 0; this.frame = 0; this.paused = false; this.bark = null; this.barkT = 0; this.heatBand = 'hot';
      this.toppingGone = false; this.done = false; this.nearby = null; this.offer = null;
      this.wipe = 0; this.pending = null; this.removed = 0; this.found = 0; this.taken = new Set(); this.warned = false;
      this.enter(start.street, start.x);
      const gone = Object.values(world.streets).reduce((n, s) => n + s.enemies.filter(e => !e.alive).length, 0);
      this.say(gone ? `${gone} still gone from these streets. Deliver to ${this.area0().customer}.` : `Deliver to: ${this.area0().customer}`);
    }

    area0() { return this.city.areas[Math.min(this.world.delivery, this.city.areas.length - 1)]; }

    // Puts the slice on a stretch. Whatever is left alive on it comes along, as it was left.
    enter(id, x) {
      const street = this.street = this.world.streets[id];
      R.travel(this.world, id);
      this.area = this.city.areas[street.area];
      this.ledge = street.platforms.find(l => l.ledge && l.w > 1000) || street.platforms.find(l => l.ledge) || { y: GROUND - 330 };
      this.junction = R.junction(this.world, street);
      this.actors = street.enemies.filter(e => e.alive).map(e => this.actor(e));
      this.shots = []; this.foes = []; this.drops = []; this.temp = [];
      this.p.x = x; this.p.y = GROUND - this.p.h; this.p.vy = 0; this.p.vx *= 0.5; this.p.grounded = true;
      this.cam = this.camera(); this.warned = false;
    }

    actor(e) {
      const a = { e, x: e.x, y: e.y, dir: -1, home: e.x, cd: 40 + e.id * 13 % 60, state: 'walk', t: 0, rise: 1, size: SIZE[e.type] * (1 + Math.min(e.power, 4) * 0.16) };
      if (e.type === 'mutant') { a.state = 'lurk'; a.rise = 0; }
      if (e.type === 'ninja' && e.hits) { a.state = 'perch'; a.y = this.ledge.y; }
      return a;
    }

    // The simulation runs at a fixed 60 steps a second, whatever the display does.
    start() {
      let last = performance.now(), spare = 0;
      const tick = now => {
        if (this.done) return;
        spare = Math.min(spare + (now - last), 100); last = now;
        while (spare >= 1000 / 60 && !this.done) { if (!this.paused) this.step(); spare -= 1000 / 60; }
        if (!this.done) { this.draw(); this.raf = requestAnimationFrame(tick); }
      };
      this.raf = requestAnimationFrame(tick);
    }
    stop() { this.done = true; cancelAnimationFrame(this.raf); }
    say(text) { this.bark = text; this.barkT = 170; }
    jolt(t) { this.trauma = Math.min(1, this.trauma + t); }

    end(outcome, killer) {
      if (this.done) return;
      this.stop();
      A.play(outcome === 'delivered' ? 'deliver' : 'lost');
      this.onEnd({ outcome, killer: killer == null ? null : { street: this.street.id, id: killer }, street: this.street.id, x: this.p.x, toppingGone: this.toppingGone, seconds: Math.round(this.frame / 60), removed: this.removed, checkpoints: this.found });
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
      if (this.wipe > 0) {
        if (--this.wipe === WIPE / 2) { const { id, x } = this.pending; this.enter(id, x); }
        return;
      }
      this.frame++;
      this.trauma = Math.max(0, this.trauma - 0.022);
      const { p, input, style: st } = this;
      if (this.barkT > 0) this.barkT--;
      if (this.invuln > 0) this.invuln--;
      if (this.specialCd > 0) this.specialCd--;
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
          if (dashing && c.h === 84) { this.breakBox(c); continue; }
          p.x = p.vx > 0 ? c.x - p.w : c.x + c.w; p.vx = 0;
        }
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
      if (!p.grounded && !this.bounced && p.vy < -7 && input.jumpHeld === false) p.vy = -7;
      if (input.take('special')) this.special();
      if (input.take('power')) this.power();
      if (input.take('give')) this.give();
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
      const tops = this.solids().map(c => ({ x: c.x, w: c.w, y: GROUND - c.h, box: c.h === 84 ? c : null }));
      for (const pl of [...this.street.platforms, ...tops]) {
        if (p.vy >= 0 && lastBottom <= pl.y + 1 && p.y + p.h >= pl.y && p.x + p.w > pl.x && p.x < pl.x + pl.w) {
          if (pl.box && (this.pounding || (st.stomp && fall > 10))) { this.breakBox(pl.box); continue; }
          p.y = pl.y - p.h; p.vy = 0; p.grounded = true;
          if (this.pounding) { this.pounding = false; this.smash = 0; this.shockwave(); }
        }
      }

      if (p.grounded && !wasGrounded) this.landed(fall);
      this.stride();
      this.dust = this.dust.filter(d => { d.x += d.vx; d.y += d.vy; d.vy += 0.05; return --d.t > 0; });

      this.heat -= st.heatDecay / 60;
      this.updateBand();
      this.fires();
      this.actorsStep();
      this.shotsStep();
      this.foesStep();
      this.dropsStep();
      this.pickupsStep();
      this.auraStep();
      this.bursts = this.bursts.filter(b => --b.t > 0);
      this.junctionStep();
      // The camera leans toward where the slice is heading, so there is room to react.
      this.look += (p.facing * 170 - this.look) * 0.04;
      this.cam += (this.camera() - this.cam) * 0.16;
      if (this.done) return;
      if (this.heat <= 0) return this.end('cold');
      this.doorStep();
    }

    solids() { return [...this.street.barricades, ...this.street.boxes.filter(b => !b.broken)]; }

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
      if (cx > street.turnAt - 320 && R.reach(this.world, street)) { this.found++; this.say(`${C.BARKS.checkpoint} ${j.name}`); A.play('note'); }
      const inZone = cx > street.turnAt + TURN_ZONE[0] && cx < street.turnAt + TURN_ZONE[1] && !!j.turn;
      this.offer = inZone && j.open ? j.turn : null;
      if (inZone && !j.open && !this.warned) { this.warned = true; this.say(C.BARKS.gate); }
      if (p.x + p.w >= street.length - 2 && !this.wipe) this.go(j.keep.id);
    }

    takeTurn() { if (this.offer) { A.play('jump'); this.go(this.offer.id); } }
    go(id) { this.pending = { id, x: 120 }; this.wipe = WIPE; this.offer = null; }

    doorStep() {
      const { p, street, world } = this;
      if (street.door == null || p.x + p.w / 2 < street.door) return;
      if (street.address === world.delivery) this.end('delivered');
      else if (street.address > world.delivery && !this.warned) { this.warned = true; this.say(C.BARKS.nope); }
    }

    updateBand() {
      const f = this.heat / this.heatMax;
      const band = f > 0.6 ? 'hot' : f > 0.3 ? 'warm' : 'cold';
      if (band !== this.heatBand) { this.heatBand = band; this.say(C.BARKS[band]); }
    }

    fires() {
      for (const f of this.street.fires) {
        if (f.lit && Math.abs(this.p.x + this.p.w / 2 - f.x) < 58 && this.p.y + this.p.h > GROUND - 90) {
          f.lit = false; this.heat = Math.min(this.heatMax, this.heat + 40); this.say(C.BARKS.fire); A.play('fire');
        }
      }
    }

    special() {
      const { p, style: st } = this;
      if (!st.special || this.specialCd > 0) return;
      this.specialCd = st.special === 'dash' ? 60 : 75;
      if (st.special === 'dash') { this.smash = 24; this.jolt(0.14); this.invuln = Math.max(this.invuln, 24); A.play('jump'); return; }
      if (p.grounded) { p.vy = st.flop ? -15 : -16; p.grounded = false; this.bounced = true; } else p.vy = 26;
      this.pounding = true; this.smash = 90;
    }

    shockwave() {
      const { p, style: st } = this;
      const reach = st.flop ? 340 : 260, x = p.x + p.w / 2;
      A.play('smash');
      this.bursts.push({ x, y: GROUND, r: reach, t: 16, color: '#f3e2bd' });
      this.jolt(st.flop ? 0.7 : 0.85); this.freeze = 4; this.wobV += st.flop ? 0.7 : 0.4;
      if (st.flop) this.splat = 26;
      this.puff(x, GROUND, 16);
      for (const a of this.actors) if (Math.abs(a.x - x) < reach && a.y > GROUND - 110) this.hit(a, 'smash');
      for (const b of this.street.boxes) if (!b.broken && Math.abs(b.x - x) < reach) this.breakBox(b);
      this.gateHit(x, reach);
    }

    // Whichever topping is in hand: a pickup while it lasts, then the slice's own.
    held() { return this.override ? this.override.topping : this.topping; }
    left() { return this.override ? this.override.uses : this.charges; }

    power() {
      const held = this.held();
      if (!held || this.left() <= 0) return;
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
        case 'reheat': this.heat = Math.min(this.heatMax, this.heat + 28); this.bursts.push({ x, y, r: 80, t: 12, color: '#7fd46a' }); break;
        case 'aura': this.aura = !this.aura; return;
      }
      this.spend(1);
    }

    spend(n) {
      if (this.override) {
        this.override.uses -= n;
        if (this.override.uses <= 0) { this.override = null; this.aura = false; this.say(C.BARKS.spent); }
        return;
      }
      this.charges = Math.max(0, this.charges - n);
      if (!this.charges) this.aura = false;
    }

    canGive(a) {
      if (!this.held() || this.left() <= 0 || a.leaving || R.peaceful(a.e, this.world.run)) return false;
      if (a.e.type === 'teen') return !a.distracted;
      return a.e.type === 'ninja' || (a.e.type === 'mutant' && a.state !== 'lurk');
    }

    give() {
      const a = this.nearby;
      if (!a || !this.canGive(a)) return;
      const held = this.held();
      if (a.e.type === 'teen') { a.distracted = true; this.spend(1); this.camp.counts.distracted++; this.say(C.BARKS.distract); this.note('teen', 'distract'); return; }
      if (a.e.type === 'mutant') { this.spend(1); this.feedMutant(a); return; }
      R.bribe(this.camp, this.world, a.e, held);
      this.say(C.BARKS.bribe); this.note('ninja', 'bribe'); A.play('bribe');
      if (this.override) this.override = null;
      else { this.topping = null; this.charges = 0; this.toppingGone = true; }
      this.aura = false;
    }

    feedMutant(a) {
      R.feed(this.camp, a.e);
      this.removed++; this.say(C.BARKS.feed); this.note('mutant', 'feed'); A.play('bribe');
      a.state = 'sink'; a.leaving = true; a.t = 0;
      this.temp.push(a.x);
    }

    // Enemies
    actorsStep() {
      const { p, street } = this, run = this.world.run;
      this.nearby = null;
      const cx = p.x + p.w / 2;
      for (const a of this.actors) {
        const e = a.e, dist = Math.abs(a.x - cx), power = 1 + Math.min(e.power, 4) * 0.12;
        if (dist < TALK_RANGE && this.canGive(a) && (!this.nearby || dist < Math.abs(this.nearby.x - cx))) this.nearby = a;
        if (a.leaving) { this.leave(a); continue; }
        if (dist > 1350 && a.state !== 'chase' && a.state !== 'perch') continue;
        if (e.type === 'teen') this.teen(a, dist, power);
        else if (e.type === 'turtle') this.turtle(a, power);
        else if (e.type === 'ninja') this.ninja(a, dist, power, run);
        else this.mutant(a, cx);
        if (this.touching(a) && !a.leaving) this.collide(a);
      }
      this.actors = this.actors.filter(a => !a.goneNow);
    }

    leave(a) {
      a.t++;
      if (a.state === 'sink') { a.rise = Math.max(0, a.rise - 0.05); if (a.rise <= 0) a.goneNow = true; return; }
      if (a.state === 'smoke') { a.goneNow = true; return; }
      a.x += a.dir * 9;
      if (a.t > 90) a.goneNow = true;
    }

    patrol(a, pace) {
      a.x += a.dir * pace;
      if (Math.abs(a.x - a.home) > a.e.range) { a.x = a.home + Math.sign(a.x - a.home) * a.e.range; a.dir *= -1; }
    }

    teen(a, dist, power) {
      if (a.distracted) { a.x += 2; return; }
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
          this.say(C.BARKS.filmed); this.note('teen', 'films');
        }
      }
    }

    turtle(a, power) {
      if (a.state === 'munch' || a.state === 'stun') { if (--a.t <= 0) a.state = 'walk'; return; }
      this.patrol(a, 1.3 * power);
    }

    ninja(a, dist, power, run) {
      if (R.peaceful(a.e, run)) return;
      if (a.state === 'leap') {
        a.t++;
        const f = a.t / 34;
        a.y = GROUND + (this.ledge.y - GROUND) * f - Math.sin(f * Math.PI) * 90;
        if (f >= 1) { a.y = this.ledge.y; a.state = 'perch'; }
        return;
      }
      if (a.state === 'perch') {
        const want = this.p.x + this.p.facing * 240;
        a.dir = Math.sign(this.p.x - a.x) || 1;
        a.x += Math.max(-7, Math.min(7, (want - a.x) * 0.05));
        a.x = Math.max(this.ledge.x + 30, Math.min(this.ledge.x + this.ledge.w - 30, a.x));
      } else this.patrol(a, 2.7 * power);
      if (dist < 900) this.attack(a);
    }

    mutant(a, cx) {
      switch (a.state) {
        case 'lurk':
          if (cx > a.x + 60 && cx < a.x + 900) {
            a.state = 'peek'; a.t = 0; this.say(C.BARKS.drain); this.note('mutant', 'peeks'); A.play('note');
          }
          break;
        case 'peek':
          a.t++;
          a.rise = a.t < 12 ? a.t / 12 * 0.35 : 0.35;
          if (a.t > 72) { a.state = 'rise'; a.t = 0; }
          break;
        case 'rise':
          a.rise = Math.min(1, a.rise + 0.05);
          if (a.rise >= 1) { a.state = 'chase'; this.note('mutant', 'chases'); }
          break;
        case 'chase': {
          const speed = Math.max(this.style.speed * 1.35, 8);
          a.dir = Math.sign(cx - a.x) || 1;
          a.x += a.dir * Math.min(speed, Math.abs(cx - a.x));
          break;
        }
      }
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
      if (a.rise < 0.5) return false;
      return p.x + p.w - 6 > a.x - half && p.x + 6 < a.x + half && p.y + p.h > a.y - a.size && p.y < a.y;
    }

    collide(a) {
      const { p } = this, e = a.e;
      if (R.peaceful(e, this.world.run) || a.distracted) return;
      const stomped = p.vy > 1 && p.y + p.h < a.y - a.size * 0.45;
      if (this.smash > 0) { this.hit(a, 'smash'); return; }
      if (e.type === 'turtle') {
        if (stomped) { a.state = 'stun'; a.t = STUN; this.bounce(27); this.note('turtle', 'stun'); this.note('turtle', 'armored'); return; }
        if (a.state !== 'walk') return;
        this.hurt(HIT, e.id, a.x);
        a.state = 'munch'; a.t = CHOMP; this.note('turtle', 'bites');
        return;
      }
      if (e.type === 'teen' && stomped) { this.bounce(16); this.note('teen', 'stomp'); this.flee(a); return; }
      if (e.type === 'ninja' && stomped) this.note('ninja', 'bounce');
      if (e.type === 'mutant') {
        this.hurt(BITE, e.id, a.x);
        if (this.done) return;
        R.feed(this.camp, e); this.removed++; this.note('mutant', 'bite'); this.say(C.BARKS.bite);
        a.state = 'sink'; a.leaving = true; a.t = 0; this.temp.push(a.x);
        return;
      }
      this.hurt(HIT + Math.min(e.power, 4) * 3, e.id, a.x);
    }

    bounce(v) { this.p.vy = -v; this.p.grounded = false; this.bounced = true; this.wobV += 0.14; A.play('jump'); }

    flee(a) {
      const dropped = R.defeat(this.camp, a.e);
      this.removed++;
      for (const t of dropped) this.drops.push({ x: a.x, y: a.y - 50, topping: t });
      a.leaving = true; a.t = 0; a.state = 'flee'; a.dir = Math.sign(a.x - this.p.x) || 1;
      this.say(C.BARKS.flees);
    }

    // What each hit does depends entirely on who it hits. how is 'shot', 'wave', 'aura' or 'smash'.
    hit(a, how) {
      const e = a.e;
      if (R.peaceful(e, this.world.run) || a.leaving) return;
      A.play('smash');
      this.jolt(0.2); this.freeze = 3;
      this.bursts.push({ x: a.x, y: a.y - 40, r: 48, t: 10, color: '#ffffff' });
      switch (e.type) {
        case 'teen': this.note('teen', 'flees'); this.flee(a); break;
        case 'turtle':
          a.state = how === 'smash' ? 'stun' : 'munch'; a.t = how === 'smash' ? STUN : CHOMP;
          this.note('turtle', how === 'smash' ? 'armored' : 'munch');
          break;
        case 'mutant': this.feedMutant(a); break;
        case 'ninja': {
          if (this.frame - (a.struck ?? -99) < 40) return;
          a.struck = this.frame;
          const dropped = R.strike(this.camp, e);
          if (dropped) {
            this.removed++; a.leaving = true; a.state = 'smoke';
            for (const t of dropped) this.drops.push({ x: a.x, y: Math.min(a.y, GROUND) - 50, topping: t });
            this.bursts.push({ x: a.x, y: a.y - 50, r: 110, t: 18, color: '#3a3148' });
            this.say(C.BARKS.ninjaGone); this.note('ninja', 'gone');
          } else {
            this.say(C.BARKS.ninjaHit); this.note('ninja', 'climbs');
            if (a.state === 'walk') { a.state = 'leap'; a.t = 0; }
          }
          break;
        }
      }
    }

    // A learned behavior goes on the board at once, in case she pauses to look.
    note(type, key) {
      if (R.learn(this.camp, type, key)) { this.say(C.BARKS.note); A.play('note'); }
    }

    hurt(amount, owner, fromX) {
      if (this.invuln > 0) return;
      this.heat -= amount; this.invuln = 90; this.jolt(0.55); this.freeze = 5; this.wobV += 0.2;
      A.play('hit');
      this.p.vy = -10; this.p.vx = this.p.x < fromX ? -9 : 9;
      if (this.heat <= 0) this.end('dead', owner);
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
    }

    gateHit(x, reach) {
      const { junction: j, street } = this;
      if (!j.turn || !j.turn.gated || j.open || Math.abs(x - street.turnAt) > reach) return false;
      R.breakGate(this.camp, j.turn.id);
      this.junction = R.junction(this.world, street);
      this.bursts.push({ x: street.turnAt, y: GROUND - 50, r: 110, t: 14, color: '#b8843f' });
      A.play('smash'); this.jolt(0.3);
      this.say(R.nextPaper(this.camp) ? C.BARKS.paper : `${j.turn.name} is open.`);
      return true;
    }

    shotsStep() {
      for (const s of this.shots) {
        s.x += s.vx; s.y += s.vy; s.life--;
        if (s.bounce) { s.vy += 0.7; if (s.y > GROUND - 14) { s.y = GROUND - 14; s.vy = -12; } }
        for (const b of this.street.boxes) {
          if (!b.broken && s.life > 0 && s.x > b.x - 8 && s.x < b.x + b.w + 8 && s.y > GROUND - b.h) { this.breakBox(b); s.life = 0; }
        }
        if (s.life > 0 && s.y > GROUND - 130 && this.gateHit(s.x, 60)) s.life = 0;
        for (const a of this.actors) {
          if (a.leaving || s.life <= 0 || a.rise < 0.3 || R.peaceful(a.e, this.world.run)) continue;
          if (Math.abs(s.x - a.x) < a.size / 2 + 10 && s.y > a.y - a.size - 6 && s.y < a.y + 6) {
            this.hit(a, s.wave ? 'wave' : 'shot');
            s.life = 0;
          }
        }
      }
      this.shots = this.shots.filter(s => s.life > 0);
    }

    foesStep() {
      const { p } = this;
      for (const f of this.foes) {
        f.x += f.vx; f.y += f.vy; f.life--;
        if (f.bounce) { f.vy += 0.55; if (f.y > GROUND - 14) { f.y = GROUND - 14; f.vy = -11; } }
        if (f.y > GROUND) f.life = 0;
        if (f.x > p.x && f.x < p.x + p.w && f.y > p.y && f.y < p.y + p.h) {
          this.hurt(9, f.owner, f.x); f.life = 0;
        }
      }
      this.foes = this.foes.filter(f => f.life > 0);
    }

    // A pickup takes over for three uses, then the slice's own topping comes back.
    grab(topping) {
      this.override = { topping, uses: C.PICKUP_USES };
      this.aura = false;
      A.play('fire');
    }

    dropsStep() {
      const { p } = this;
      for (const d of this.drops) {
        if (d.y < GROUND - 28) d.y += 4;
        if (Math.abs(d.x - p.x - p.w / 2) < 62 && Math.abs(d.y - p.y - p.h / 2) < 80) {
          d.taken = true;
          this.say(C.BARKS.recovered);
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
          this.say(`${C.TOPPINGS[k.topping].name}! ${C.BARKS.pickup}`);
        }
      });
    }

    auraStep() {
      if (!this.aura) return;
      if (++this.auraTick % 60 === 0) this.spend(1);
      if (this.auraTick % 20) return;
      for (const a of this.actors) {
        if (a.rise > 0.3 && Math.hypot(a.x - this.p.x - this.p.w / 2, a.y - 50 - this.p.y - this.p.h / 2) < 170 && a.e.type !== 'turtle') this.hit(a, 'aura');
      }
    }

    // Drawing
    art(name) {
      const here = `${this.city.id}/${this.area.id}/${name}`;
      return S.layer(here) ? here : `${this.city.id}/${name}`;
    }

    draw() {
      const { ctx, cam, area } = this, pal = area.palette, t = this.trauma * this.trauma, f = this.frame;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, pal.skyTop); sky.addColorStop(1, pal.skyBottom);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      const dx = t * 26 * Math.sin(f * 1.7), dy = t * 18 * Math.sin(f * 2.3 + 1), lean = t * 0.012 * Math.sin(f * 1.1);
      ctx.save();
      // Shake draws slightly zoomed in, so no edge of the stage ever shows.
      const zoom = 1 + t * 0.06;
      ctx.translate(W / 2 + dx, H / 2 + dy); ctx.rotate(lean); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
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
      for (const c of this.street.barricades) {
        if (S.prop(ctx, `${this.city.id}/barricade`, c.x + c.w / 2, GROUND)) continue;
        ctx.fillStyle = '#5b4a3a'; ctx.fillRect(c.x, GROUND - c.h, c.w, c.h);
      }
      for (const b of this.street.boxes) this.drawBox(b);
      this.drawFires(); this.drawDead(); this.drawDoor();
      this.drawPickups();
      for (const a of this.actors) this.drawActor(a);
      for (const d of this.drops) this.drawToken(d.topping, d.x, d.y);
      for (const s of this.shots) this.drawShot(s, s.wave ? 16 : 11);
      for (const k of this.foes) {
        if (k.star && S.prop(ctx, 'props/star', k.x, k.y + 12)) continue;
        if (k.topping) { this.drawShot(k, 11); continue; }
        ctx.fillStyle = k.color; ctx.fillRect(k.x - 9, k.y - 9, 18, 18);
      }
      if (this.aura) { ctx.fillStyle = 'rgba(180,200,90,0.22)'; dot(ctx, this.p.x + this.p.w / 2, this.p.y + this.p.h / 2, 170 + Math.sin(f / 6) * 8); }
      ctx.fillStyle = 'rgba(235,225,205,0.45)';
      for (const d of this.dust) dot(ctx, d.x, d.y, d.r * (d.t / 22));
      this.drawPlayer();
      for (const b of this.bursts) this.drawBurst(b);
      this.drawParty();
      ctx.restore();
      ctx.restore();
      this.hud();
      if (this.wipe > 0) this.drawWipe();
    }

    // The next stretch comes in like a comic panel turning over.
    drawWipe() {
      const { ctx } = this, half = WIPE / 2, cover = 1 - Math.abs(this.wipe - half) / half;
      ctx.fillStyle = '#17110e';
      ctx.fillRect(0, 0, W, H / 2 * cover); ctx.fillRect(0, H - H / 2 * cover, W, H / 2 * cover);
      if (cover > 0.8 && this.pending) {
        ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 34px Georgia, serif'; ctx.textAlign = 'center';
        ctx.fillText(this.world.streets[this.pending.id].name, W / 2, H / 2 + 12);
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
      if (b.broken) { if (!S.prop(ctx, 'props/box-broken', b.x + b.w / 2, GROUND)) { ctx.fillStyle = '#8a6030'; ctx.fillRect(b.x, GROUND - 12, b.w, 12); } return; }
      if (S.prop(ctx, 'props/box', b.x + b.w / 2, GROUND)) return;
      ctx.fillStyle = '#b8843f'; ctx.fillRect(b.x, GROUND - b.h, b.w, b.h);
      ctx.strokeStyle = '#2a1830'; ctx.lineWidth = 5; ctx.strokeRect(b.x + 3, GROUND - b.h + 3, b.w - 6, b.h - 6);
      ctx.beginPath(); ctx.moveTo(b.x + 4, GROUND - b.h + 4); ctx.lineTo(b.x + b.w - 4, GROUND - 4); ctx.moveTo(b.x + b.w - 4, GROUND - b.h + 4); ctx.lineTo(b.x + 4, GROUND - 4); ctx.stroke();
    }

    drawJunction() {
      const { ctx, street, junction: j, frame, cam } = this, x = street.turnAt;
      if (x < cam - 400 || x > cam + W + 400) return;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 8; i++) ctx.fillRect(x - 170 + i * 48, GROUND + 4, 28, 60);
      if (j.turn && j.turn.gated && !j.open) {
        if (!S.prop(ctx, 'props/box-pile', x, GROUND)) { ctx.fillStyle = '#b8843f'; ctx.fillRect(x - 90, GROUND - 120, 180, 120); ctx.strokeStyle = '#2a1830'; ctx.lineWidth = 5; ctx.strokeRect(x - 87, GROUND - 117, 174, 114); }
      }
      if (!S.prop(ctx, 'props/sign', x + 150, GROUND)) { ctx.fillStyle = '#3a4a3a'; ctx.fillRect(x + 145, GROUND - 200, 10, 200); }
      const label = (text, y, color) => {
        ctx.font = 'bold 21px system-ui, sans-serif'; ctx.textAlign = 'left';
        const w = ctx.measureText(text).width + 22;
        ctx.fillStyle = color; ctx.fillRect(x + 160, y, w, 32);
        ctx.fillStyle = '#fff'; ctx.fillText(text, x + 171, y + 23);
      };
      label(`${j.keep.name} ▶`, GROUND - 232, '#2f6b3f');
      if (j.turn) label(`▲ ${j.turn.name}`, GROUND - 194, j.open ? '#2b5f8a' : '#6b5a4a');
      if (this.offer) { ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 40px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▲', x, GROUND - 150 + Math.sin(frame / 6) * 8); }
      // A sly lookout in Chicago, before the ninjas are anyone's problem.
      if (this.city.watchers && street.role === 'next' && this.p.x < x - 500) {
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
      if (S.prop(ctx, `props/pickup-${topping}`, x, y + 26)) return;
      ctx.fillStyle = '#fff3c4'; dot(ctx, x, y, 24);
      ctx.fillStyle = C.TOPPINGS[topping].color; dot(ctx, x, y, 17);
    }

    drawShot(s, r) {
      const { ctx } = this;
      if (s.topping && S.prop(ctx, `props/shot-${s.topping}`, s.x, s.y + 14)) return;
      ctx.fillStyle = s.color; dot(ctx, s.x, s.y, r);
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

    drawFires() {
      const { ctx } = this;
      for (const f of this.street.fires) {
        if (S.prop(ctx, `${this.city.id}/${f.lit ? 'barrel' : 'barrel-out'}`, f.x, GROUND)) continue;
        ctx.fillStyle = '#39302b'; ctx.fillRect(f.x - 27, GROUND - 62, 54, 62);
        if (f.lit) { ctx.font = '46px serif'; ctx.textAlign = 'center'; ctx.fillText('🔥', f.x, GROUND - 62); }
      }
    }

    drawDead() {
      for (const d of this.street.dead) {
        const st = C.STYLES[d.style];
        if (!S.draw(this.ctx, sliceArt(d.style), 'cold', 0, d.x, GROUND, st.height)) drawSlice(this.ctx, d.x, GROUND - 38, d.style, d.topping, '#8f8f8a', 1.5, true);
      }
    }

    drawDoor() {
      const { ctx, street, world, frame } = this;
      if (street.door == null) return;
      const x = street.door, active = street.address === world.delivery;
      const name = S.layer(this.art('door')) ? this.art('door') : null;
      if (!name || !S.prop(ctx, name, x, GROUND)) {
        ctx.fillStyle = '#2b1d14'; ctx.fillRect(x - 56, GROUND - 165, 112, 165);
        ctx.fillStyle = active ? '#ffd76a' : '#6b5a4a'; ctx.fillRect(x - 42, GROUND - 150, 84, 150);
      }
      if (active) {
        ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 44px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('▼', x, GROUND - 190 + Math.sin(frame / 7) * 9);
      } else if (street.address < world.delivery) {
        ctx.fillStyle = '#b8843f'; ctx.fillRect(x + 66, GROUND - 16, 62, 16);
      }
    }

    drawActor(a) {
      const { ctx } = this, e = a.e, calm = R.peaceful(e, this.world.run) || a.distracted;
      const bob = { walk: 'walk', film: 'film', flee: 'flee', munch: 'munch', stun: 'stun', leap: 'leap', perch: 'crouch', chase: 'run', rise: 'idle', peek: 'idle', lurk: 'idle', sink: 'idle', smoke: 'hurt' }[a.state] || 'walk';
      let anim = a.threw > this.frame && S.has(e.type, 'throw') ? 'throw' : bob;
      if (calm) anim = 'idle';
      if (!S.has(e.type, anim)) anim = S.has(e.type, 'walk') ? 'walk' : 'run';
      if (a.rise <= 0) return;
      ctx.save();
      // Mutants come up through the street, so the ground hides whatever has not risen yet.
      if (a.rise < 1) { ctx.beginPath(); ctx.rect(a.x - 200, a.y - a.size - 40, 400, a.size + 40); ctx.clip(); ctx.translate(0, a.size * (1 - a.rise)); }
      const facing = a.dir;
      if (!S.draw(ctx, e.type, anim, this.frame * 16.7, a.x, a.y, a.size, facing)) {
        ctx.font = `${a.size}px serif`; ctx.textAlign = 'center'; ctx.fillText(FACE[e.type], a.x, a.y - 4);
      }
      ctx.restore();
      e.toppings.slice(0, 5).forEach((t, i) => { ctx.fillStyle = C.TOPPINGS[t].color; dot(ctx, a.x - 34 + i * 17, a.y - a.size - 14, 7); });
      if (e.type === 'ninja' && e.hits) { ctx.fillStyle = '#ff3b1f'; for (let i = 0; i < e.hits; i++) ctx.fillRect(a.x - 18 + i * 14, a.y - a.size - 26, 10, 10); }
      if (a.state === 'stun') { ctx.fillStyle = '#ffd76a'; for (let i = 0; i < 3; i++) dot(ctx, a.x + Math.cos(this.frame / 7 + i * 2.1) * 34, a.y - a.size - 8 + Math.sin(this.frame / 7 + i * 2.1) * 9, 5); }
      if (calm) { ctx.fillStyle = '#fff'; ctx.font = '19px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(a.distracted ? 'scrolling' : 'paid', a.x, a.y - a.size - 26); }
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
      if (!S.draw(ctx, art, anim, this.animMs, cx, p.y + p.h, st.height, p.facing, squash, { wide, tilt, flop })) {
        drawSlice(ctx, cx, p.y + p.h * 0.5 + (1 - squash) * 36, this.slice.style, this.topping, cheese, 2.15 * st.height / 124, false, p.facing, squash);
      }
      if (this.smash > 0) { ctx.strokeStyle = '#ff3b1f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, p.y + p.h / 2, st.height * 0.5, 0, 7); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }

    hud() {
      const { ctx, world, city } = this;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(16, 16, 372, 74);
      ctx.fillStyle = '#333'; ctx.fillRect(28, 28, 348, 20);
      const f = Math.max(0, this.heat / this.heatMax);
      ctx.fillStyle = f > 0.6 ? '#ff5a24' : f > 0.3 ? '#f0a53a' : '#7fb6d6'; ctx.fillRect(28, 28, 348 * f, 20);
      ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'; ctx.textAlign = 'left';
      const held = this.held(), t = held ? `${C.TOPPINGS[held].name} ×${this.left()}` : 'no topping';
      ctx.fillText(`${this.style.name}: ${t}`, 28, 76);
      // Addresses done, and the street we are on.
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(410, 16, 340, 36);
      city.areas.forEach((a, i) => { ctx.fillStyle = i < world.delivery ? '#7fd46a' : i === world.delivery ? '#ffd76a' : '#555'; dot(ctx, 432 + i * 26, 34, 9); });
      ctx.fillStyle = '#fff'; ctx.font = '19px sans-serif'; ctx.fillText(this.street.name, 512, 41);
      if (this.barkT > 0) {
        ctx.font = 'italic 26px Georgia, serif'; ctx.textAlign = 'center';
        const w = ctx.measureText(this.bark).width + 40;
        ctx.fillStyle = 'rgba(255,248,225,0.93)'; ctx.fillRect(W / 2 - w / 2, 96, w, 46);
        ctx.fillStyle = '#2a1a10'; ctx.fillText(this.bark, W / 2, 128);
      }
    }
  }

  const sliceArt = style => `slice-${style}`;

  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fill(); }

  // Placeholder slices: wedge, charred round, jumbo wedge, or thick pan square.
  function drawSlice(ctx, x, y, style, topping, cheese, scale = 1, dead = false, facing = 1, squash = 1) {
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

  root.PR_PLAY = { Run, W, H, drawSlice, dot };
})(window);
