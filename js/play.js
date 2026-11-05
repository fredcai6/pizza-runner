// One run down one street. Reads the street, mutates it through the rules, reports how it ended.
(function (root) {
  const C = root.PR_CONTENT, R = root.PR_RULES;
  const G = 0.6, W = 800, H = 400, GROUND = R.GROUND;
  const HIT = 12, TALK_RANGE = 95;
  const FACE = { turtle: '🐢', teen: '🧑‍🎤', mutant: '👾', ninja: '🥷', boss: '🐢' };
  const SIZE = { turtle: 38, teen: 40, mutant: 38, ninja: 40, boss: 96 };

  class Run {
    constructor(canvas, input, { camp, city, street, slice, ticket, onEnd }) {
      Object.assign(this, { canvas, ctx: canvas.getContext('2d'), input, camp, city, street, slice, ticket, onEnd });
      this.mods = R.modsFor(street, ticket);
      this.style = C.STYLES[slice.style];
      this.topping = slice.topping;
      const base = slice.topping ? C.TOPPINGS[slice.topping].charges : 0;
      this.charges = slice.topping ? Math.ceil((base + this.mods.bonusCharges) * this.mods.chargeScale) : 0;
      this.heat = this.heatMax = this.style.heatMax;
      this.p = { x: 80, y: GROUND - 44, vx: 0, vy: 0, w: 40, h: 44, grounded: true, facing: 1 };
      this.invuln = 0; this.specialCd = 0; this.smash = 0; this.pounding = false; this.folded = 0;
      this.aura = false; this.auraTick = 0;
      this.shots = []; this.foes = []; this.drops = []; this.bursts = [];
      this.cam = 0; this.frame = 0; this.bark = null; this.barkT = 0; this.heatBand = 'hot';
      this.filmed = false; this.toppingGone = false; this.done = false; this.nearby = null;
      this.actors = street.enemies.filter(e => e.alive).map(e => ({ e, x: e.x, y: e.y, dir: -1, home: e.x, cd: 40 + e.id * 13 % 60, distracted: false, phase: e.id }));
      this.say(`${city.customer} is waiting.`);
    }

    start() { const tick = () => { if (this.done) return; this.step(); this.draw(); this.raf = requestAnimationFrame(tick); }; tick(); }
    stop() { this.done = true; cancelAnimationFrame(this.raf); }
    say(text) { this.bark = text; this.barkT = 170; }

    end(outcome, killer) {
      if (this.done) return;
      this.stop();
      this.onEnd({ outcome, killer, x: this.p.x, filmed: this.filmed, toppingGone: this.toppingGone });
    }

    speed() {
      let s = this.style.speed * this.mods.speed;
      if (this.heat / this.heatMax < 0.3) s *= 0.8;
      if (this.smash > 0 && this.style.special === 'dash') s *= 2;
      if (this.folded > 0) s *= 1.35;
      return s;
    }

    step() {
      this.frame++;
      const { p, input, mods } = this;
      if (this.barkT > 0) this.barkT--;
      if (this.invuln > 0) this.invuln--;
      if (this.specialCd > 0) this.specialCd--;
      if (this.smash > 0) this.smash--;
      if (this.folded > 0) this.folded--;

      p.vx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (p.vx) p.facing = p.vx;
      if (this.smash > 0 && this.style.special === 'dash' && !p.vx) p.vx = p.facing;
      p.x = Math.max(0, Math.min(this.city.length - p.w, p.x + p.vx * this.speed()));
      for (const c of this.street.barricades) {
        if (p.y + p.h > GROUND - c.h + 2 && p.x + p.w > c.x && p.x < c.x + c.w) {
          p.x = p.vx > 0 ? c.x - p.w : c.x + c.w;
        }
      }

      if (input.take('jump') && p.grounded) { p.vy = -this.style.jump; p.grounded = false; }
      if (input.take('special')) this.special();
      if (input.take('power')) this.power();
      if (input.take('give')) this.give();

      const lastBottom = p.y + p.h;
      p.vy += G * mods.gravity;
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

      this.heat -= (this.style.heatDecay * mods.heatDecay) / 60;
      this.updateBand();
      this.fires();
      this.actorsStep();
      this.shotsStep();
      this.foesStep();
      this.dropsStep();
      this.auraStep();
      this.bursts = this.bursts.filter(b => --b.t > 0);
      this.cam = Math.max(0, Math.min(this.city.length - W, p.x - W / 3));
      if (this.done) return;
      if (this.heat <= 0) return this.end('cold');
      if (p.x + p.w >= this.street.door && this.doorOpen()) this.end('delivered');
    }

    doorOpen() { return !this.street.enemies.some(e => e.type === 'boss' && e.alive); }

    updateBand() {
      const f = this.heat / this.heatMax;
      const band = f > 0.6 ? 'hot' : f > 0.3 ? 'warm' : 'cold';
      if (band !== this.heatBand) { this.heatBand = band; this.say(C.BARKS[band]); }
    }

    fires() {
      if (this.mods.noFires) return;
      for (const f of this.street.fires) {
        if (f.lit && Math.abs(this.p.x + 20 - f.x) < 32 && this.p.y + this.p.h > GROUND - 50) {
          f.lit = false; this.heat = Math.min(this.heatMax, this.heat + 45); this.say(C.BARKS.fire);
        }
      }
    }

    special() {
      if (this.specialCd > 0) return;
      const { p } = this;
      this.specialCd = 75;
      switch (this.style.special) {
        case 'dash': this.smash = 26; break;
        case 'fold': this.smash = 30; this.folded = 34; break;
        case 'flare':
          this.heat -= 4;
          this.bursts.push({ x: p.x + 20, y: p.y + 22, r: 105, t: 16, color: 'rgba(255,120,30,0.45)' });
          for (const a of this.actors) if (Math.hypot(a.x - p.x, a.y - p.y) < 125 && !R.peaceful(a.e, this.street.run)) this.hit(a, 2);
          break;
        case 'pound':
          if (p.grounded) { p.vy = -9; p.grounded = false; }
          p.vy = Math.max(p.vy, 0) + 15; this.pounding = true; this.smash = 60;
          break;
      }
    }

    shockwave() {
      const { p } = this;
      this.bursts.push({ x: p.x + 20, y: GROUND, r: 120, t: 14, color: 'rgba(255,230,180,0.5)' });
      for (const a of this.actors) if (Math.abs(a.x - p.x) < 130 && a.y > GROUND - 60) this.hit(a, 2, true);
    }

    power() {
      if (!this.topping || this.charges <= 0) return;
      const { p } = this, t = C.TOPPINGS[this.topping], d = p.facing, x = p.x + 20, y = p.y + 20;
      const shot = (o) => this.shots.push({ x, y, vx: 10 * d, vy: 0, color: t.color, life: 70, ...o });
      switch (t.kind) {
        case 'shot': shot({}); break;
        case 'bounce': shot({ vx: 7 * d, vy: -3, bounce: true, life: 150, color: '#ff6a1f' }); break;
        case 'scatter': for (const vy of [-3, 0, 3]) shot({ vy }); break;
        case 'slam':
          for (const s of [-1, 1]) this.shots.push({ x, y: GROUND - 12, vx: 8 * s, vy: 0, color: t.color, life: 45, wave: true });
          break;
        case 'leap': p.vy = -16; p.grounded = false; break;
        case 'reheat': this.heat = Math.min(this.heatMax, this.heat + 28); this.bursts.push({ x, y, r: 45, t: 12, color: 'rgba(80,200,90,0.4)' }); break;
        case 'aura': this.aura = !this.aura; return;
      }
      this.spend(1);
    }

    spend(n) {
      this.charges = Math.max(0, this.charges - n);
      if (!this.charges) { this.aura = false; }
    }

    canGive(a) { return !!this.topping && this.charges > 0 && !R.peaceful(a.e, this.street.run) && !a.distracted && a.e.type !== 'turtle' && a.e.type !== 'boss'; }

    give() {
      const a = this.nearby;
      if (!a || !this.canGive(a)) return;
      if (a.e.type === 'teen') { a.distracted = true; this.spend(1); this.say(C.BARKS.distract); return; }
      if (a.e.type === 'ninja') { R.bribe(this.camp, a.e, this.topping, this.street.run); this.say(C.BARKS.bribe); }
      if (a.e.type === 'mutant') { R.feed(this.camp, a.e, this.topping); this.say(C.BARKS.feed); }
      this.topping = null; this.charges = 0; this.aura = false; this.toppingGone = true;
    }

    actorsStep() {
      const { p, street } = this;
      const run = street.run, sp = this.mods.enemySpeed;
      this.nearby = null;
      for (const a of this.actors) {
        const e = a.e, power = 1 + Math.min(e.power, 4) * 0.12, size = SIZE[e.type] * (1 + Math.min(e.power, 4) * 0.2);
        a.size = size;
        const calm = R.peaceful(e, run) || a.distracted;
        const dist = Math.abs(a.x - p.x);
        if (dist < TALK_RANGE && this.canGive(a) && (!this.nearby || dist < Math.abs(this.nearby.x - p.x))) this.nearby = a;
        if (dist > 760) continue;
        if (a.distracted) a.x += 1.1;
        else if (e.type === 'mutant' && !e.fed) {
          a.phase += 0.05;
          a.x += Math.sign(p.x - a.x) * 1.2 * sp * power;
          a.y = GROUND - 62 + Math.sin(a.phase) * 42;
        } else if (e.type === 'boss') {
          a.x += Math.sign(p.x - a.x) * 0.9 * sp;
          a.x = Math.max(e.x - e.range * 3, Math.min(e.x + e.range, a.x));
        } else if (!calm) {
          const pace = (e.type === 'turtle' ? 0.8 : 1.5) * sp * power;
          a.x += a.dir * pace;
          if (Math.abs(a.x - a.home) > e.range) { a.x = a.home + Math.sign(a.x - a.home) * e.range; a.dir *= -1; }
        }
        if (!calm && (e.type === 'ninja' || e.type === 'boss' || e.toppings.length) && e.type !== 'turtle') this.attack(a);
        if (e.type === 'teen' && !calm && dist < 300) {
          a.watch = (a.watch || 0) + 1;
          if (a.watch === 120 && !this.filmed) { this.filmed = true; this.say(C.BARKS.filmed); }
        }
        if (!calm && this.touching(a)) this.collide(a);
      }
      this.actors = this.actors.filter(a => a.e.alive);
    }

    attack(a) {
      if (--a.cd > 0) return;
      const e = a.e, dx = this.p.x - a.x;
      a.cd = e.type === 'boss' ? 75 : 110;
      if (Math.abs(dx) > 420) return;
      const t = e.toppings.length ? e.toppings[this.frame % e.toppings.length] : null;
      const spec = t ? C.TOPPINGS[t] : null;
      this.foes.push({
        x: a.x, y: a.y - a.size / 2, vx: Math.sign(dx) * 5.5, vy: spec && spec.kind === 'bounce' ? -3 : 0,
        bounce: !!spec && spec.kind === 'bounce', color: spec ? spec.color : '#444', star: !spec, owner: e.id, life: 130,
      });
    }

    touching(a) {
      const { p } = this, half = a.size / 2;
      const pH = this.folded > 0 ? p.h * 0.5 : p.h;
      return p.x + p.w - 6 > a.x - half && p.x + 6 < a.x + half && p.y + p.h > a.y - a.size && p.y + (p.h - pH) < a.y;
    }

    collide(a) {
      const { p } = this, e = a.e;
      if (this.smash > 0) { this.hit(a, 1, true); return; }
      const stomped = p.vy > 1 && p.y + p.h < a.y - a.size * 0.45;
      if (stomped && (e.type === 'teen' || e.type === 'turtle')) {
        p.vy = -9;
        if (e.type === 'teen') this.defeat(a);
        return;
      }
      this.hurt(HIT + e.power * 3, e.id, a.x);
    }

    // Turtles only break to a smash. Everything else goes down to anything.
    hit(a, amount, smash = false) {
      if (a.e.type === 'turtle' && !smash) return;
      this.bursts.push({ x: a.x, y: a.y - 20, r: 26, t: 10, color: 'rgba(255,255,255,0.6)' });
      if (a.e.type === 'boss') {
        if ((a.hitCd || 0) > this.frame) return;
        a.hitCd = this.frame + 40;
      }
      this.defeat(a, amount);
    }

    defeat(a, amount) {
      const dropped = R.defeat(this.camp, a.e, amount);
      for (const t of dropped) this.drops.push({ x: a.x, y: a.y - 26, topping: t });
      if (a.e.type === 'turtle') {
        const text = R.nextLore(this.camp);
        if (text) this.say(C.BARKS.lore);
      }
    }

    hurt(amount, owner, fromX) {
      if (this.invuln > 0) return;
      this.heat -= amount; this.invuln = 100;
      this.p.vy = -6; this.p.x += this.p.x < fromX ? -24 : 24;
      if (this.heat <= 0) this.end('dead', owner);
    }

    shotsStep() {
      for (const s of this.shots) {
        s.x += s.vx; s.y += s.vy; s.life--;
        if (s.bounce) { s.vy += 0.4; if (s.y > GROUND - 8) { s.y = GROUND - 8; s.vy = -7; } }
        for (const a of this.actors) {
          if (!a.e.alive || s.life <= 0 || R.peaceful(a.e, this.street.run)) continue;
          if (Math.abs(s.x - a.x) < a.size / 2 + 6 && s.y > a.y - a.size - 4 && s.y < a.y + 4) {
            this.hit(a, 1, !!s.wave);
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
        if (f.bounce) { f.vy += 0.3; if (f.y > GROUND - 8) { f.y = GROUND - 8; f.vy = -6; } }
        if (f.x > p.x && f.x < p.x + p.w && f.y > p.y && f.y < p.y + p.h && this.folded <= 0) {
          this.hurt(9, f.owner, f.x); f.life = 0;
        }
      }
      this.foes = this.foes.filter(f => f.life > 0);
    }

    dropsStep() {
      const { p } = this;
      for (const d of this.drops) {
        if (d.y < GROUND - 16) d.y += 2;
        if (Math.abs(d.x - p.x - 20) < 34 && Math.abs(d.y - p.y - 22) < 44) {
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
        if (Math.hypot(a.x - this.p.x - 20, a.y - this.p.y - 22) < 92 && !R.peaceful(a.e, this.street.run)) this.hit(a, 1);
      }
    }

    // Drawing
    draw() {
      const { ctx, city, cam } = this, pal = city.palette;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, pal.skyTop); sky.addColorStop(1, pal.skyBottom);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      this.scenery(pal);
      ctx.save(); ctx.translate(-cam, 0);
      ctx.fillStyle = pal.ground; ctx.fillRect(cam, GROUND, W, H - GROUND);
      ctx.fillStyle = pal.top; ctx.fillRect(cam, GROUND, W, 7);
      for (const pl of this.street.platforms) {
        ctx.fillStyle = pal.ground; ctx.fillRect(pl.x, pl.y, pl.w, 14);
        ctx.fillStyle = pal.top; ctx.fillRect(pl.x, pl.y, pl.w, 4);
      }
      for (const c of this.street.barricades) {
        ctx.fillStyle = '#5b4a3a'; ctx.fillRect(c.x, GROUND - c.h, c.w, c.h);
        ctx.strokeStyle = '#2b2119'; ctx.lineWidth = 3; ctx.strokeRect(c.x + 2, GROUND - c.h + 2, c.w - 4, c.h - 4);
      }
      this.drawFires(); this.drawDead(); this.drawDoor();
      for (const a of this.actors) this.drawActor(a);
      for (const d of this.drops) { ctx.fillStyle = C.TOPPINGS[d.topping].color; dot(ctx, d.x, d.y, 9); }
      for (const s of this.shots) { ctx.fillStyle = s.color; dot(ctx, s.x, s.y, s.wave ? 9 : 6); }
      for (const f of this.foes) { ctx.fillStyle = f.color; f.star ? ctx.fillRect(f.x - 5, f.y - 5, 10, 10) : dot(ctx, f.x, f.y, 6); }
      if (this.aura) {
        ctx.fillStyle = 'rgba(180,200,90,0.22)'; dot(ctx, this.p.x + 20, this.p.y + 22, 92 + Math.sin(this.frame / 6) * 5);
      }
      this.drawPlayer();
      for (const b of this.bursts) { ctx.fillStyle = b.color; dot(ctx, b.x, b.y, b.r * (1 - b.t / 22)); }
      ctx.restore();
      if (this.mods.dark) {
        const px = this.p.x - cam + 20, py = this.p.y + 22;
        const g = ctx.createRadialGradient(px, py, 70, px, py, 240);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.93)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      this.hud();
    }

    scenery(pal) {
      const { ctx, cam } = this;
      const off = -(cam * 0.25) % 800;
      ctx.fillStyle = pal.far;
      for (let i = -1; i < 3; i++) {
        const x = off + i * 800;
        if (pal.scenery === 'volcano') {
          ctx.beginPath(); ctx.moveTo(x + 120, GROUND); ctx.lineTo(x + 370, 110); ctx.lineTo(x + 430, 110); ctx.lineTo(x + 690, GROUND); ctx.fill();
        } else if (pal.scenery === 'palms') {
          for (const k of [90, 330, 610]) {
            ctx.fillRect(x + k, 170, 9, GROUND - 170);
            for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + k + 5 + s * 26, 168, 32, 9, s * 0.35, 0, 7); ctx.fill(); }
          }
        } else if (pal.scenery === 'tickets') {
          for (let k = 0; k < 9; k++) ctx.fillRect(x + k * 90 + 14, 26, 50, 92 + (k * 37) % 70);
        } else {
          const tall = pal.scenery === 'towers' ? 1.5 : 1;
          for (let k = 0; k < 9; k++) { const h = (70 + (k * 73) % 130) * tall; ctx.fillRect(x + k * 90, GROUND - h, 76, h); }
        }
      }
    }

    drawFires() {
      const { ctx } = this;
      for (const f of this.street.fires) {
        ctx.fillStyle = '#39302b'; ctx.fillRect(f.x - 15, GROUND - 34, 30, 34);
        if (f.lit && !this.mods.noFires) { ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.fillText('🔥', f.x, GROUND - 34); }
      }
    }

    drawDead() {
      const { ctx } = this;
      for (const d of this.street.dead) {
        drawSlice(ctx, d.x, GROUND - 22, d.style, d.topping, '#8f8f8a', 0.8, true);
      }
    }

    drawDoor() {
      const { ctx } = this, x = this.street.door;
      ctx.fillStyle = '#2b1d14'; ctx.fillRect(x, GROUND - 92, 62, 92);
      ctx.fillStyle = this.doorOpen() ? '#ffd76a' : '#6b2020'; ctx.fillRect(x + 8, GROUND - 84, 46, 84);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(this.doorOpen() ? 'DELIVER' : 'LOCKED', x + 31, GROUND - 98);
    }

    drawActor(a) {
      const { ctx } = this, e = a.e;
      const calm = R.peaceful(e, this.street.run) || a.distracted;
      ctx.globalAlpha = calm ? 0.65 : 1;
      ctx.font = `${a.size}px serif`; ctx.textAlign = 'center';
      ctx.fillText(FACE[e.type], a.x, a.y - 2);
      if (e.type === 'boss') {
        ctx.font = '26px serif'; ctx.fillText('🥷', a.x - 34, a.y - a.size + 8); ctx.fillText('👾', a.x + 34, a.y - a.size + 8); ctx.fillText('🧑‍🎤', a.x, a.y - a.size - 2);
        ctx.fillStyle = '#300'; ctx.fillRect(a.x - 60, a.y - a.size - 44, 120, 8);
        ctx.fillStyle = '#e33'; ctx.fillRect(a.x - 60, a.y - a.size - 44, 120 * e.hp / e.maxHp, 8);
      }
      ctx.globalAlpha = 1;
      e.toppings.slice(0, 5).forEach((t, i) => { ctx.fillStyle = C.TOPPINGS[t].color; dot(ctx, a.x - 18 + i * 9, a.y - a.size - 8, 4); });
      if (calm) { ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.fillText(a.distracted ? 'scrolling' : e.fed ? 'remembering' : 'paid', a.x, a.y - a.size - 14); }
      else if (e.nemesisFrom) { ctx.fillStyle = '#ffb3a0'; ctx.font = 'bold 11px sans-serif'; ctx.fillText(`from ${e.nemesisFrom}`, a.x, a.y - a.size - 14); }
    }

    drawPlayer() {
      const { ctx, p } = this;
      if (this.invuln > 0 && this.frame % 10 < 5) ctx.globalAlpha = 0.5;
      const f = this.heat / this.heatMax;
      const cheese = f > 0.6 ? '#ffcc33' : f > 0.3 ? '#e8bc55' : '#c9b48a';
      const squash = this.folded > 0 ? 0.55 : 1;
      drawSlice(ctx, p.x + 20, p.y + 22 + (1 - squash) * 20, this.slice.style, this.topping, cheese, squash, false, p.facing);
      if (this.smash > 0) { ctx.strokeStyle = '#ff3b1f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x + 20, p.y + 22, 30, 0, 7); ctx.stroke(); }
      if (f > 0.6 && this.frame % 40 < 20) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(p.x + 14, p.y - 4); ctx.lineTo(p.x + 18, p.y - 16); ctx.moveTo(p.x + 26, p.y - 4); ctx.lineTo(p.x + 22, p.y - 16); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }

    hud() {
      const { ctx } = this;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(10, 10, 212, 44);
      ctx.fillStyle = '#333'; ctx.fillRect(18, 18, 196, 12);
      const f = Math.max(0, this.heat / this.heatMax);
      ctx.fillStyle = f > 0.6 ? '#ff5a24' : f > 0.3 ? '#f0a53a' : '#7fb6d6'; ctx.fillRect(18, 18, 196 * f, 12);
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
      const t = this.topping ? `${C.TOPPINGS[this.topping].name} ×${this.charges}` : 'no topping';
      ctx.fillText(`${this.style.name}: ${t}`, 18, 46);
      if (this.barkT > 0) {
        ctx.font = 'italic 15px Georgia, serif'; ctx.textAlign = 'center';
        const w = ctx.measureText(this.bark).width + 26;
        ctx.fillStyle = 'rgba(255,248,225,0.93)'; ctx.fillRect(W / 2 + 40 - w / 2, 12, w, 28);
        ctx.fillStyle = '#2a1a10'; ctx.fillText(this.bark, W / 2 + 40, 31);
      }
    }
  }

  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fill(); }

  // Each style reads differently: wedge, fold, charred round, or thick pan square.
  function drawSlice(ctx, x, y, style, topping, cheese, squash = 1, dead = false, facing = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(facing, squash);
    if (dead) ctx.rotate(1.35);
    const crust = dead ? '#77736b' : { thin: '#e7b96b', ny: '#d59a4c', naples: '#c98a44', deep: '#a8662b', crust: '#a07a4a' }[style];
    const thick = style === 'deep' ? 12 : style === 'thin' ? 3 : 6;
    if (style === 'deep') { ctx.fillStyle = crust; ctx.fillRect(-20, -22, 40, 46); ctx.fillStyle = cheese; ctx.fillRect(-16, -16, 32, 30); }
    else {
      ctx.fillStyle = cheese; ctx.beginPath(); ctx.moveTo(-20, -18); ctx.lineTo(20, -18); ctx.lineTo(0, 24); ctx.closePath();
      if (style !== 'crust') ctx.fill();
      ctx.fillStyle = crust; ctx.fillRect(-23, -23, 46, thick + 3);
      if (style === 'naples') { ctx.fillStyle = '#3a2413'; for (const c of [-14, 2, 15]) dot(ctx, c, -20, 3); }
    }
    if (topping && style !== 'crust') {
      ctx.fillStyle = dead ? '#666' : C.TOPPINGS[topping].color;
      for (const [a, b] of [[-9, -8], [8, -6], [0, 5]]) dot(ctx, a, b, 4);
    }
    if (!dead) { ctx.fillStyle = '#20140c'; dot(ctx, -5, -13, 2.2); dot(ctx, 7, -13, 2.2); }
    ctx.restore();
  }

  root.PR_PLAY = { Run, W, H, drawSlice };
})(window);
