// One run down one street. Reads the street, changes it through the rules, reports how it ended.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES, S = root.PR_SPRITES, A = root.PR_SOUND;
  const G = 1.05, W = 1280, H = 720, GROUND = R.GROUND;
  const HIT = 12, TALK_RANGE = 180, HERO = 124;
  const FACE = { turtle: '🐢', teen: '🧑‍🎤', mutant: '👾', ninja: '🥷' };
  const SIZE = { turtle: 92, teen: 118, mutant: 100, ninja: 118 };

  class Run {
    constructor(canvas, input, { camp, city, street, slice, onEnd }) {
      Object.assign(this, { canvas, ctx: canvas.getContext('2d'), input, camp, city, street, slice, onEnd });
      this.enemySpeed = street.filmed ? 1.3 : 1;
      this.style = C.STYLES[slice.style];
      this.topping = slice.topping;
      const base = slice.topping ? C.TOPPINGS[slice.topping].charges : 0;
      this.charges = base;
      this.heat = this.heatMax = this.style.heatMax;
      this.p = { x: 140, y: GROUND - 96, vx: 0, vy: 0, w: 72, h: 96, grounded: true, facing: 1 };
      this.invuln = 0; this.specialCd = 0; this.smash = 0; this.pounding = false;
      this.aura = false; this.auraTick = 0;
      this.shots = []; this.foes = []; this.drops = []; this.bursts = []; this.dust = [];
      this.shake = 0; this.freeze = 0; this.land = 0; this.look = 0;
      this.cam = 0; this.frame = 0; this.paused = false; this.bark = null; this.barkT = 0; this.heatBand = 'hot';
      this.filmed = false; this.toppingGone = false; this.done = false; this.nearby = null;
      this.actors = street.enemies.filter(e => e.alive).map(e => ({ e, x: e.x, y: e.y, dir: -1, home: e.x, cd: 40 + e.id * 13 % 60, distracted: false, phase: e.id }));
      this.say(`Deliver to: ${city.customer}`);
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

    end(outcome, killer) {
      if (this.done) return;
      this.stop();
      A.play(outcome === 'delivered' ? 'deliver' : 'lost');
      this.onEnd({ outcome, killer, x: this.p.x, filmed: this.filmed, toppingGone: this.toppingGone, seconds: Math.round(this.frame / 60) });
    }

    speed() {
      let s = this.style.speed;
      if (this.heat / this.heatMax < 0.3) s *= 0.8;
      if (this.smash > 0 && this.style.special === 'dash') s *= 2;
      return s;
    }

    step() {
      // A brief freeze on a hit gives it weight.
      if (this.freeze > 0) { this.freeze--; return; }
      this.frame++;
      if (this.shake > 0) this.shake--;
      if (this.land > 0) this.land--;
      const { p, input } = this;
      if (this.barkT > 0) this.barkT--;
      if (this.invuln > 0) this.invuln--;
      if (this.specialCd > 0) this.specialCd--;
      if (this.smash > 0) this.smash--;

      p.vx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (p.vx) p.facing = p.vx;
      if (this.smash > 0 && this.style.special === 'dash' && !p.vx) p.vx = p.facing;
      p.x = Math.max(0, Math.min(this.city.length - p.w, p.x + p.vx * this.speed()));
      for (const c of this.street.barricades) {
        if (p.y + p.h > GROUND - c.h + 3 && p.x + p.w > c.x && p.x < c.x + c.w) {
          p.x = p.vx > 0 ? c.x - p.w : c.x + c.w;
        }
      }

      if (input.take('jump') && p.grounded) { p.vy = -this.style.jump; p.grounded = false; A.play('jump'); }
      if (input.take('special')) this.special();
      if (input.take('power')) this.power();
      if (input.take('give')) this.give();

      const lastBottom = p.y + p.h, wasGrounded = p.grounded, fall = p.vy;
      p.vy += G;
      p.y += p.vy;
      p.grounded = false;
      if (p.y + p.h >= GROUND) {
        p.y = GROUND - p.h; p.vy = 0; p.grounded = true;
        if (this.pounding) { this.pounding = false; this.smash = 0; this.shockwave(); }
      }
      const tops = this.street.barricades.map(c => ({ x: c.x, w: c.w, y: GROUND - c.h }));
      for (const pl of [...this.street.platforms, ...tops]) {
        if (p.vy >= 0 && lastBottom <= pl.y + 1 && p.y + p.h >= pl.y && p.x + p.w > pl.x && p.x < pl.x + pl.w) {
          p.y = pl.y - p.h; p.vy = 0; p.grounded = true;
        }
      }

      if (p.grounded && !wasGrounded && fall > 8) {
        this.land = 12;
        this.puff(p.x + 36, p.y + p.h, 7);
      }
      if (p.grounded && p.vx && this.frame % 7 === 0) this.puff(p.x + 36 - p.facing * 34, p.y + p.h, 1);
      this.dust = this.dust.filter(d => { d.x += d.vx; d.y += d.vy; d.vy += 0.05; return --d.t > 0; });

      this.heat -= this.style.heatDecay / 60;
      this.updateBand();
      this.fires();
      this.actorsStep();
      this.shotsStep();
      this.foesStep();
      this.dropsStep();
      this.auraStep();
      this.bursts = this.bursts.filter(b => --b.t > 0);
      // The camera leans toward where she is heading, so there is room to react.
      this.look += (p.facing * 170 - this.look) * 0.04;
      this.cam = Math.max(0, Math.min(this.city.length - W, p.x - W / 2.6 + this.look));
      if (this.done) return;
      if (this.heat <= 0) return this.end('cold');
      if (p.x + p.w >= this.street.door) this.end('delivered');
    }

    updateBand() {
      const f = this.heat / this.heatMax;
      const band = f > 0.6 ? 'hot' : f > 0.3 ? 'warm' : 'cold';
      if (band !== this.heatBand) { this.heatBand = band; this.say(C.BARKS[band]); }
    }

    fires() {
      for (const f of this.street.fires) {
        if (f.lit && Math.abs(this.p.x + 36 - f.x) < 58 && this.p.y + this.p.h > GROUND - 90) {
          f.lit = false; this.heat = Math.min(this.heatMax, this.heat + 45); this.say(C.BARKS.fire); A.play('fire');
        }
      }
    }

    special() {
      if (!this.style.special || this.specialCd > 0) return;
      const { p } = this;
      this.specialCd = 75;
      switch (this.style.special) {
        case 'dash': this.smash = 26; break;
        case 'flare':
          this.heat -= 2;
          this.bursts.push({ x: p.x + 36, y: p.y + 48, r: 190, t: 16, color: '#ff8a2a' });
          for (const a of this.actors) if (Math.hypot(a.x - p.x, a.y - 50 - p.y) < 225 && !R.peaceful(a.e, this.street.run)) this.hit(a, true);
          break;
        case 'pound':
          if (p.grounded) { p.vy = -16; p.grounded = false; }
          else p.vy = 22;
          this.pounding = true; this.smash = 60;
          break;
      }
    }

    shockwave() {
      const { p } = this;
      const reach = 230 * (this.style.scale || 1);
      A.play('smash');
      this.bursts.push({ x: p.x + 36, y: GROUND, r: reach, t: 14, color: '#f3e2bd' });
      for (const a of this.actors) if (Math.abs(a.x - p.x) < reach && a.y > GROUND - 110 && !R.peaceful(a.e, this.street.run)) this.hit(a, true);
    }

    power() {
      if (!this.topping || this.charges <= 0) return;
      const { p } = this, t = C.TOPPINGS[this.topping], d = p.facing, x = p.x + 36, y = p.y + 44;
      const shot = (o) => this.shots.push({ x, y, vx: 18 * d, vy: 0, color: t.color, life: 70, ...o });
      A.play('shot');
      switch (t.kind) {
        case 'shot': shot({}); break;
        case 'bounce': shot({ vx: 13 * d, vy: -5, bounce: true, life: 150, color: '#ff6a1f' }); break;
        case 'scatter': for (const vy of [-5, 0, 5]) shot({ vy }); break;
        case 'slam':
          for (const s of [-1, 1]) this.shots.push({ x, y: GROUND - 22, vx: 14 * s, vy: 0, color: t.color, life: 45, wave: true });
          break;
        case 'leap': p.vy = -27; p.grounded = false; break;
        case 'reheat': this.heat = Math.min(this.heatMax, this.heat + 28); this.bursts.push({ x, y, r: 80, t: 12, color: '#7fd46a' }); break;
        case 'aura': this.aura = !this.aura; return;
      }
      this.spend(1);
    }

    spend(n) {
      this.charges = Math.max(0, this.charges - n);
      if (!this.charges) { this.aura = false; }
    }

    canGive(a) { return !!this.topping && this.charges > 0 && !R.peaceful(a.e, this.street.run) && !a.distracted && a.e.type !== 'turtle'; }

    give() {
      const a = this.nearby;
      if (!a || !this.canGive(a)) return;
      if (a.e.type === 'teen') { a.distracted = true; this.spend(1); this.camp.counts.distracted++; this.say(C.BARKS.distract); this.note('teen', 'distract'); return; }
      if (a.e.type === 'ninja') { R.bribe(this.camp, a.e, this.topping, this.street.run); this.say(C.BARKS.bribe); this.note('ninja', 'bribe'); }
      if (a.e.type === 'mutant') { R.feed(this.camp, a.e, this.topping); this.say(C.BARKS.feed); this.note('mutant', 'feed'); }
      A.play('bribe');
      this.topping = null; this.charges = 0; this.aura = false; this.toppingGone = true;
    }

    actorsStep() {
      const { p, street } = this;
      const run = street.run, sp = this.enemySpeed;
      this.nearby = null;
      for (const a of this.actors) {
        const e = a.e, power = 1 + Math.min(e.power, 4) * 0.12, size = SIZE[e.type] * (1 + Math.min(e.power, 4) * 0.16);
        a.size = size;
        const calm = R.peaceful(e, run) || a.distracted;
        const dist = Math.abs(a.x - p.x);
        if (dist < TALK_RANGE && this.canGive(a) && (!this.nearby || dist < Math.abs(this.nearby.x - p.x))) this.nearby = a;
        if (dist > 1250) continue;
        if (a.distracted) a.x += 2;
        else if (e.type === 'mutant' && !e.fed) {
          a.phase += 0.05;
          a.x += Math.sign(p.x - a.x) * 2.2 * sp * power;
          a.y = GROUND - 90 + Math.sin(a.phase) * 75;
          if (dist < 500) this.note('mutant', 'chases');
        } else if (!calm) {
          const pace = (e.type === 'turtle' ? 1.4 : 2.7) * sp * power;
          a.x += a.dir * pace;
          if (Math.abs(a.x - a.home) > e.range) { a.x = a.home + Math.sign(a.x - a.home) * e.range; a.dir *= -1; }
        }
        if (!calm && (e.type === 'ninja' || e.toppings.length) && e.type !== 'turtle') this.attack(a);
        if (e.type === 'teen' && !calm && dist < 520) {
          a.watch = (a.watch || 0) + 1;
          if (a.watch === 120 && !this.filmed) { this.filmed = true; this.say(C.BARKS.filmed); this.note('teen', 'films'); }
        }
        if (!calm && this.touching(a)) this.collide(a);
      }
      this.actors = this.actors.filter(a => a.e.alive);
    }

    attack(a) {
      if (--a.cd > 0) return;
      const e = a.e, dx = this.p.x - a.x;
      a.cd = 110; a.threw = this.frame + 30;
      if (Math.abs(dx) > 760) return;
      if (e.type === 'ninja') this.note('ninja', e.toppings.length ? 'debt' : 'throws');
      const t = e.toppings.length ? e.toppings[this.frame % e.toppings.length] : null;
      const spec = t ? C.TOPPINGS[t] : null;
      this.foes.push({
        x: a.x, y: a.y - a.size / 2, vx: Math.sign(dx) * 10, vy: spec && spec.kind === 'bounce' ? -5 : 0,
        bounce: !!spec && spec.kind === 'bounce', color: spec ? spec.color : '#444', star: !spec, owner: e.id, life: 130,
      });
    }

    touching(a) {
      const { p } = this, half = a.size / 2;
      return p.x + p.w - 6 > a.x - half && p.x + 6 < a.x + half && p.y + p.h > a.y - a.size && p.y < a.y;
    }

    collide(a) {
      const { p } = this, e = a.e;
      if (this.smash > 0) { this.hit(a, true); return; }
      const stomped = p.vy > 1 && p.y + p.h < a.y - a.size * 0.45;
      if (stomped && (e.type === 'teen' || e.type === 'turtle')) {
        p.vy = -16;
        if (e.type === 'teen') { this.note('teen', 'stomp'); this.defeat(a); } else this.note('turtle', 'armored');
        return;
      }
      this.hurt(HIT + Math.min(e.power, 4) * 3, e.id, a.x);
    }

    // Turtles only break to a smash. Everything else goes down to anything.
    hit(a, smash = false) {
      if (a.e.type === 'turtle' && !smash) { this.note('turtle', 'armored'); return; }
      this.bursts.push({ x: a.x, y: a.y - 40, r: 48, t: 10, color: '#ffffff' });
      A.play('smash');
      this.shake = 10; this.freeze = 3;
      this.defeat(a);
    }

    defeat(a) {
      const dropped = R.defeat(this.camp, a.e);
      for (const t of dropped) this.drops.push({ x: a.x, y: a.y - 50, topping: t });
      if (a.e.type === 'turtle') {
        this.note('turtle', 'smash');
        if (R.nextPaper(this.camp)) this.say(C.BARKS.paper);
      }
    }

    // A learned behavior goes on the board at once, in case she pauses to look.
    note(type, key) {
      if (R.learn(this.camp, type, key)) { this.say(C.BARKS.note); A.play('note'); }
    }

    hurt(amount, owner, fromX) {
      if (this.invuln > 0) return;
      this.heat -= amount; this.invuln = 100; this.shake = 16; this.freeze = 5;
      A.play('hit');
      this.p.vy = -10; this.p.x += this.p.x < fromX ? -44 : 44;
      if (this.heat <= 0) this.end('dead', owner);
    }

    puff(x, y, n) {
      for (let i = 0; i < n; i++) {
        const spread = n > 1 ? (i - n / 2) * 0.7 : -this.p.facing * 0.8;
        this.dust.push({ x, y: y - 4, vx: spread, vy: -0.6 - (i % 3) * 0.3, t: 22, r: 7 + (i % 3) * 3 });
      }
    }

    shotsStep() {
      for (const s of this.shots) {
        s.x += s.vx; s.y += s.vy; s.life--;
        if (s.bounce) { s.vy += 0.7; if (s.y > GROUND - 14) { s.y = GROUND - 14; s.vy = -12; } }
        for (const a of this.actors) {
          if (!a.e.alive || s.life <= 0 || R.peaceful(a.e, this.street.run)) continue;
          if (Math.abs(s.x - a.x) < a.size / 2 + 10 && s.y > a.y - a.size - 6 && s.y < a.y + 6) {
            this.hit(a, !!s.wave);
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
        if (f.x > p.x && f.x < p.x + p.w && f.y > p.y && f.y < p.y + p.h) {
          this.hurt(9, f.owner, f.x); f.life = 0;
        }
      }
      this.foes = this.foes.filter(f => f.life > 0);
    }

    dropsStep() {
      const { p } = this;
      for (const d of this.drops) {
        if (d.y < GROUND - 28) d.y += 4;
        if (Math.abs(d.x - p.x - 36) < 62 && Math.abs(d.y - p.y - 48) < 80) {
          d.taken = true;
          this.say(C.BARKS.recovered);
          if (!this.topping) { this.topping = d.topping; this.charges = 6; this.toppingGone = false; } else this.charges += 4;
        }
      }
      this.drops = this.drops.filter(d => !d.taken);
    }

    auraStep() {
      if (!this.aura) return;
      if (++this.auraTick % 60 === 0) this.spend(1);
      if (this.auraTick % 20) return;
      for (const a of this.actors) {
        if (Math.hypot(a.x - this.p.x - 36, a.y - 50 - this.p.y - 48) < 170 && !R.peaceful(a.e, this.street.run)) this.hit(a);
      }
    }

    // Drawing
    draw() {
      const { ctx, city, cam } = this, pal = city.palette;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, pal.skyTop); sky.addColorStop(1, pal.skyBottom);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      const jolt = this.shake ? (this.shake % 2 ? 1 : -1) * this.shake * 0.7 : 0;
      ctx.save(); ctx.translate(jolt, -jolt * 0.5);
      const far = S.tile(ctx, `${city.id}/far`, cam, 0.2, W);
      if (!far) this.scenery(pal);
      S.tile(ctx, `${city.id}/mid`, cam, 0.5, W);
      ctx.save(); ctx.translate(-Math.round(cam), 0);
      ctx.fillStyle = pal.ground; ctx.fillRect(cam - 30, GROUND, W + 60, H - GROUND + 40);
      ctx.fillStyle = pal.top; ctx.fillRect(cam - 30, GROUND, W + 60, 12);
      ctx.restore();
      S.tile(ctx, `${city.id}/near`, cam, 1, W);
      ctx.save(); ctx.translate(-Math.round(cam), 0);
      for (const pl of this.street.platforms) {
        if (S.strip(ctx, `${city.id}/platform`, pl.x, pl.y, pl.w)) continue;
        ctx.fillStyle = pal.ground; ctx.fillRect(pl.x, pl.y, pl.w, 24);
        ctx.fillStyle = pal.top; ctx.fillRect(pl.x, pl.y, pl.w, 7);
      }
      for (const c of this.street.barricades) {
        if (S.prop(ctx, `${city.id}/barricade`, c.x + c.w / 2, GROUND)) continue;
        ctx.fillStyle = '#5b4a3a'; ctx.fillRect(c.x, GROUND - c.h, c.w, c.h);
        ctx.strokeStyle = '#2b2119'; ctx.lineWidth = 5; ctx.strokeRect(c.x + 3, GROUND - c.h + 3, c.w - 6, c.h - 6);
      }
      this.drawFires(); this.drawDead(); this.drawDoor();
      for (const a of this.actors) this.drawActor(a);
      for (const d of this.drops) { ctx.fillStyle = C.TOPPINGS[d.topping].color; dot(ctx, d.x, d.y, 16); }
      for (const s of this.shots) { ctx.fillStyle = s.color; dot(ctx, s.x, s.y, s.wave ? 16 : 11); }
      for (const f of this.foes) { ctx.fillStyle = f.color; f.star ? ctx.fillRect(f.x - 9, f.y - 9, 18, 18) : dot(ctx, f.x, f.y, 11); }
      if (this.aura) { ctx.fillStyle = 'rgba(180,200,90,0.22)'; dot(ctx, this.p.x + 36, this.p.y + 48, 170 + Math.sin(this.frame / 6) * 8); }
      ctx.fillStyle = 'rgba(235,225,205,0.45)';
      for (const d of this.dust) dot(ctx, d.x, d.y, d.r * (d.t / 22));
      this.drawPlayer();
      for (const b of this.bursts) this.drawBurst(b);
      ctx.restore();
      ctx.restore();
      this.hud();
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

    scenery(pal) {
      const { ctx, cam } = this;
      const off = -(cam * 0.25) % W;
      ctx.fillStyle = pal.far;
      for (let i = -1; i < 3; i++) {
        const x = off + i * W;
        if (pal.scenery === 'volcano') {
          ctx.beginPath(); ctx.moveTo(x + 190, GROUND); ctx.lineTo(x + 590, 190); ctx.lineTo(x + 690, 190); ctx.lineTo(x + 1100, GROUND); ctx.fill();
        } else if (pal.scenery === 'palms') {
          for (const k of [140, 530, 980]) {
            ctx.fillRect(x + k, 300, 16, GROUND - 300);
            for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + k + 8 + s * 46, 298, 56, 15, s * 0.35, 0, 7); ctx.fill(); }
          }
        } else if (pal.scenery === 'monument') {
          ctx.beginPath(); ctx.moveTo(x + 610, GROUND); ctx.lineTo(x + 630, 150); ctx.lineTo(x + 645, 130); ctx.lineTo(x + 660, 150); ctx.lineTo(x + 680, GROUND); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x + 200, GROUND, 170, 150, 0, Math.PI, 0); ctx.fill();
        } else {
          const tall = pal.scenery === 'towers' ? 1.5 : 1;
          for (let k = 0; k < 9; k++) { const h = (130 + (k * 73) % 230) * tall; ctx.fillRect(x + k * 144, GROUND - h, 122, h); }
        }
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
        if (!S.draw(this.ctx, sliceArt(d.style), 'cold', 0, d.x, GROUND, HERO)) drawSlice(this.ctx, d.x, GROUND - 38, d.style, d.topping, '#8f8f8a', 1.5, true);
      }
    }

    drawDoor() {
      const { ctx } = this, x = this.street.door;
      if (S.prop(ctx, `${this.city.id}/door`, x + 56, GROUND)) return;
      ctx.fillStyle = '#2b1d14'; ctx.fillRect(x, GROUND - 165, 112, 165);
      ctx.fillStyle = '#ffd76a'; ctx.fillRect(x + 14, GROUND - 150, 84, 150);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('DELIVER', x + 56, GROUND - 176);
    }

    drawActor(a) {
      const { ctx } = this, e = a.e;
      const calm = R.peaceful(e, this.street.run) || a.distracted;
      ctx.globalAlpha = calm ? 0.65 : 1;
      const anim = calm ? 'idle' : a.threw > this.frame && S.has(e.type, 'throw') ? 'throw' : 'walk';
      if (!S.draw(ctx, e.type, anim, this.frame * 16.7, a.x, a.y, a.size, a.dir)) {
        ctx.font = `${a.size}px serif`; ctx.textAlign = 'center'; ctx.fillText(FACE[e.type], a.x, a.y - 4);
      }
      ctx.globalAlpha = 1;
      e.toppings.slice(0, 5).forEach((t, i) => { ctx.fillStyle = C.TOPPINGS[t].color; dot(ctx, a.x - 34 + i * 17, a.y - a.size - 14, 7); });
      if (calm) { ctx.fillStyle = '#fff'; ctx.font = '19px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(a.distracted ? 'scrolling' : e.fed ? 'remembering' : 'paid', a.x, a.y - a.size - 26); }
    }

    drawPlayer() {
      const { ctx, p } = this;
      if (this.invuln > 0 && this.frame % 10 < 5) ctx.globalAlpha = 0.5;
      const f = this.heat / this.heatMax;
      const cheese = f > 0.6 ? '#ffcc33' : f > 0.3 ? '#e8bc55' : '#c9b48a';
      const landing = this.land / 12, stretch = !p.grounded ? Math.min(0.14, Math.abs(p.vy) * 0.008) : 0;
      const squash = 1 - landing * 0.25 + stretch, scale = this.style.scale || 1;
      const cold = f <= 0.3 && p.grounded && !p.vx;
      const anim = this.smash > 0 && S.has(sliceArt(this.slice.style), 'special') ? 'special' : !p.grounded ? 'jump' : p.vx ? 'run' : cold ? 'cold' : 'idle';
      // One-shot animations play from their own start.
      if (anim !== this.anim) { this.anim = anim; this.animFrame = this.frame; }
      if (!S.draw(ctx, sliceArt(this.slice.style), anim, (this.frame - this.animFrame) * 16.7, p.x + 36, p.y + p.h, HERO * scale, p.facing, squash)) {
        drawSlice(ctx, p.x + 36, p.y + 48 + (1 - squash) * 36, this.slice.style, this.topping, cheese, 2.15 * scale, false, p.facing, squash);
      }
      if (this.smash > 0) { ctx.strokeStyle = '#ff3b1f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x + 36, p.y + 48, 62 * scale, 0, 7); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }

    hud() {
      const { ctx } = this;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(16, 16, 372, 74);
      ctx.fillStyle = '#333'; ctx.fillRect(28, 28, 348, 20);
      const f = Math.max(0, this.heat / this.heatMax);
      ctx.fillStyle = f > 0.6 ? '#ff5a24' : f > 0.3 ? '#f0a53a' : '#7fb6d6'; ctx.fillRect(28, 28, 348 * f, 20);
      ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'; ctx.textAlign = 'left';
      const t = this.topping ? `${C.TOPPINGS[this.topping].name} ×${this.charges}` : 'no topping';
      ctx.fillText(`${this.style.name}: ${t}`, 28, 76);
      const prog = this.p.x / this.street.door;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(420, 22, 440, 8);
      ctx.fillStyle = '#ffd76a'; ctx.fillRect(420, 22, 440 * prog, 8);
      if (this.barkT > 0) {
        ctx.font = 'italic 26px Georgia, serif'; ctx.textAlign = 'center';
        const w = ctx.measureText(this.bark).width + 40;
        ctx.fillStyle = 'rgba(255,248,225,0.93)'; ctx.fillRect(W / 2 - w / 2, 44, w, 46);
        ctx.fillStyle = '#2a1a10'; ctx.fillText(this.bark, W / 2, 76);
      }
    }
  }

  const sliceArt = style => `slice-${style}`;

  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fill(); }

  // Placeholder slices: wedge, charred round, jumbo wedge, or thick pan square.
  function drawSlice(ctx, x, y, style, topping, cheese, scale = 1, dead = false, facing = 1, squash = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale * facing, scale * squash);
    if (dead) ctx.rotate(1.35);
    const crust = dead ? '#77736b' : { thin: '#e7b96b', ny: '#d59a4c', naples: '#c98a44', deep: '#a8662b', jumbo: '#d59a4c' }[style];
    const thick = style === 'deep' ? 12 : style === 'thin' ? 3 : 6;
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
