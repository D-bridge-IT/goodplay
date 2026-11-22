// Turmlauf: vertical playground tower with rising lava (Phaser 3). Auto-run, tap = jump, hold = higher, tap in air = flip.
(function () {
  const U = PhaserHost.U, W = 375, H = 600;
  const C = { RUN: 150, G: 1500, JUMP: -480, HOLD_MS: 150, HOLD_G: 300, COYOTE: 80, BUFFER: 100, SEG: 600, DAILY: 8, LAVA_BASE: 24, LAVA_PER: 5, LAVA_CAP: 80, GRACE: 3000, CATCH_D: 800, CATCH_M: 2.5, CRUMBLE: 350, RESPAWN: 2000, SPIN_DPS: 120, BOUNCE: -820 };
  const PAL = [0x60a5fa, 0xf472b6, 0x34d399, 0xfbbf24, 0xa78bfa, 0xfb923c];
  const S = {
    de: { height: 'Höhe', best: 'Rekord', seg: 'Segment', lava: 'Lava', title: 'TURMLAUF', hint: 'Tippen = Sprung · Halten = höher · Tipp in der Luft = Richtung wechseln', go: 'Los!', dead: 'Verglüht!', rope: 'Rettungsseil', again: 'Nochmal', summit: 'GIPFEL!', daily: 'Tagesturm', endless: 'Endlos', reached: 'erreicht', mfmt: 'm', grace: 'Lava kommt in' },
    ru: { height: 'Высота', best: 'Рекорд', seg: 'Сегмент', lava: 'Лава', title: 'БАШНЯ', hint: 'Тап = прыжок · держи = выше · тап в воздухе = смена направления', go: 'Погнали!', dead: 'Сгорел!', rope: 'Спасательный трос', again: 'Ещё раз', summit: 'ВЕРШИНА!', daily: 'Башня дня', endless: 'Бесконечно', reached: 'достигнут', mfmt: 'м', grace: 'Лава через' }
  };
  const s = k => (S[LANG] || S.de)[k];
  function seeded(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

  class TowerScene extends Phaser.Scene {
    constructor() { super('main'); }
    init(data) { this.bridge = this.registry.get('bridge'); this.d = data.save; this.hud = data.hud; }
    create() {
      const sc = this;
      // textures
      U.tex(sc, 'tw_player', 24, 24, g => { g.fillStyle(0xf97316); g.fillRoundedRect(0, 0, 24, 24, 7); g.fillStyle(0xfff7ed); g.fillCircle(8, 10, 4); g.fillCircle(16, 10, 4); g.fillStyle(0x1e293b); g.fillCircle(9, 10, 2); g.fillCircle(17, 10, 2); g.fillStyle(0x7c2d12); g.fillRect(8, 16, 8, 2); });
      U.tex(sc, 'tw_dot', 6, 6, g => { g.fillStyle(0xffffff); g.fillCircle(3, 3, 3); });
      PAL.forEach((c, i) => U.tex(sc, 'tw_plat' + i, 125, 14, g => { g.fillStyle(U.shade(c, -0.3)); g.fillRoundedRect(0, 4, 125, 10, 4); g.fillStyle(c); g.fillRoundedRect(0, 0, 125, 11, 4); g.fillStyle(U.shade(c, 0.4)); for (let x = 10; x < 125; x += 25) g.fillCircle(x, 4, 2.5); }));
      U.tex(sc, 'tw_bounce', 50, 14, g => { g.fillStyle(0x1e293b); g.fillRoundedRect(0, 4, 50, 10, 4); g.fillStyle(0x22c55e); g.fillRoundedRect(0, 0, 50, 11, 4); g.fillStyle(0xbbf7d0); for (let x = 2; x < 50; x += 10) g.fillTriangle(x, 10, x + 5, 2, x + 10, 10); });
      U.tex(sc, 'tw_crumble', 60, 14, g => { g.fillStyle(0x92400e); g.fillRoundedRect(0, 4, 60, 10, 4); g.fillStyle(0xd6a35c); g.fillRoundedRect(0, 0, 60, 11, 4); g.lineStyle(2, 0x92400e); g.lineBetween(15, 2, 20, 9); g.lineBetween(38, 1, 33, 9); g.lineBetween(50, 3, 54, 9); });
      U.tex(sc, 'tw_conv', 75, 14, g => { g.fillStyle(0x334155); g.fillRoundedRect(0, 4, 75, 10, 4); g.fillStyle(0x64748b); g.fillRoundedRect(0, 0, 75, 11, 4); g.fillStyle(0xfde047); for (let x = 4; x < 70; x += 14) g.fillTriangle(x, 2, x + 8, 5.5, x, 9); });
      U.tex(sc, 'tw_spike', 60, 14, g => { g.fillStyle(0xe2e8f0); for (let x = 0; x < 60; x += 20) g.fillTriangle(x, 14, x + 10, 0, x + 20, 14); g.fillStyle(0xef4444); for (let x = 0; x < 60; x += 20) g.fillTriangle(x + 6, 14, x + 10, 4, x + 14, 14); });
      U.tex(sc, 'tw_bar', 90, 10, g => { g.fillStyle(0x1e293b); g.fillRoundedRect(0, 0, 90, 10, 5); g.fillStyle(0xf472b6); g.fillRoundedRect(2, 3, 86, 4, 2); });

      sc.cameras.main.setBackgroundColor('#4338ca');
      sc.bg = sc.add.graphics().setDepth(-10).setScrollFactor(0);
      sc.marks = sc.add.group();
      sc.platforms = sc.physics.add.staticGroup();
      sc.movers = sc.physics.add.group({ allowGravity: false, immovable: true });
      sc.spinners = []; sc.plats = [];
      sc.lava = sc.add.graphics().setDepth(50);
      sc.vignette = sc.add.graphics().setDepth(60).setScrollFactor(0);
      sc.embers = [];

      // player
      sc.player = sc.physics.add.sprite(W / 2, 0, 'tw_player').setDepth(20);
      sc.player.body.setSize(20, 22).setOffset(2, 2); sc.player.body.setGravityY(0); sc.player.setMaxVelocity(400, 900);
      sc.physics.add.collider(sc.player, sc.platforms, (p, pl) => sc.onLand(pl), (p, pl) => sc.oneWay(p, pl), sc);
      sc.physics.add.collider(sc.player, sc.movers, (p, pl) => sc.onLand(pl), (p, pl) => sc.oneWay(p, pl), sc);

      sc.input.on('pointerdown', () => sc.press());
      sc.input.on('pointerup', () => { sc.holding = false; });
      sc.input.keyboard && sc.input.keyboard.on('keydown-SPACE', () => sc.press());
      sc.input.keyboard && sc.input.keyboard.on('keyup-SPACE', () => { sc.holding = false; });

      sc.rng = seeded(sc.d.mode === 'daily' ? sc.d.seed : (Date.now() & 0xffffff));
      sc.newRun();
    }
    /* ---------- run lifecycle ---------- */
    newRun(fromSeg) {
      const sc = this;
      sc.plats.forEach(p => p.obj.destroy()); sc.plats = []; sc.platforms.clear(true, true); sc.movers.clear(true, true);
      sc.spinners.forEach(sp => { sp.bar.destroy(); sp.pivot.destroy(); }); sc.spinners = [];
      sc.marks.clear(true, true);
      sc.segment = fromSeg || 1; sc.genTop = 0; sc.topY = 0; sc.started = false; sc.dead = false; sc.flipAvail = true; sc.coyote = 0; sc.buffer = 0; sc.holdT = 0; sc.holding = false; sc.dir = 1; sc.runT = 0; sc.lavaWarned = false; sc.summitDone = sc.summitDone && !!fromSeg;
      const startY = -(sc.segment - 1) * C.SEG;
      sc.lavaY = startY + (fromSeg ? 400 : 260); sc.lavaT = 0;
      // base platform
      sc.addPlat(W / 2, startY - 20, W - 24, 'static', 0); // full-width start floor: bounce between the walls until you jump
      sc.player.setPosition(W / 2, startY - 60).setVelocity(0, 0).setAlpha(1).setScale(1).setVisible(true); sc.player.body.enable = true;
      sc.cameras.main.scrollY = startY - H + 80; sc.camMin = sc.cameras.main.scrollY;
      sc.genTop = startY - 20;
      sc.generate();
      sc.hud(sc.hudData());
    }
    hudData() { return { height: Math.max(0, Math.round((-this.player.y) / 10)), segment: this.segment, lava: Math.max(0, Math.round((this.lavaY - this.player.y) / 10)) }; }
    tierFor(seg) { return seg <= 2 ? 0 : seg <= 5 ? 1 : 2; }
    addPlat(x, y, w, type, idx) {
      const sc = this; let obj;
      const key = type === 'bounce' ? 'tw_bounce' : type === 'crumble' ? 'tw_crumble' : type === 'conv' ? 'tw_conv' : 'tw_plat' + (idx % PAL.length);
      if (type === 'mover') { obj = sc.movers.create(x, y, key).setDisplaySize(w, 14); obj.body.setSize(w, 14); obj.body.friction.x = 1; obj.moveDir = 1; obj.baseX = x; }
      else { obj = sc.platforms.create(x, y, key).setDisplaySize(w, 14); obj.refreshBody(); }
      obj.body.checkCollision.down = false; obj.body.checkCollision.left = false; obj.body.checkCollision.right = false;
      const p = { obj, x, y, w, type, idx, alive: true };
      if (type === 'spikes') { p.spikeX = x + (sc.rng() < .5 ? -1 : 1) * (w / 2 - 30); p.spike = sc.add.image(p.spikeX, y - 12, 'tw_spike').setDepth(15); }
      if (type === 'conv') p.convDir = sc.rng() < .5 ? -1 : 1, obj.setFlipX(p.convDir < 0);
      if (type === 'spinner') {
        const pivot = sc.add.circle(x, y - 10, 6, 0xf8fafc).setDepth(16), bar = sc.add.image(x, y - 10, 'tw_bar').setDepth(16); bar.angle = sc.rng() * 360;
        sc.spinners.push({ pivot, bar, x, y: y - 10, dir: sc.rng() < .5 ? -1 : 1, plat: p });
      }
      sc.plats.push(p); return p;
    }
    generate() {
      const sc = this, r = sc.rng;
      while (sc.genTop > sc.cameras.main.scrollY - 900) {
        const seg = Math.floor((-sc.genTop) / C.SEG) + 1, tier = sc.tierFor(seg);
        const maxRise = [85, 108, 125][tier], minRise = [48, 56, 64][tier];
        const rise = minRise + r() * (maxRise - minRise);
        const y = sc.genTop - rise;
        const w = [75, 50, 50][tier] + Math.round(r() * (125 - [75, 50, 50][tier]) / 25) * 25;
        const margin = 12 + w / 2 + 4, x = margin + r() * (W - 2 * margin);
        let type = 'static'; const t = r();
        if (tier === 0) type = t < .72 ? 'static' : t < .86 ? 'mover' : 'bounce';
        else if (tier === 1) type = t < .5 ? 'static' : t < .62 ? 'mover' : t < .74 ? 'bounce' : t < .88 ? 'crumble' : 'conv';
        else type = t < .36 ? 'static' : t < .48 ? 'mover' : t < .58 ? 'bounce' : t < .72 ? 'crumble' : t < .82 ? 'conv' : t < .92 ? 'spinner' : 'spikes';
        if (type === 'spikes' && w < 100) type = 'static';
        if (type === 'bounce') { sc.addPlat(x, y, 50, 'bounce', 0); sc.genTop = y - 60; } // bouncer gives extra height: skip some
        else { sc.addPlat(x, y, type === 'mover' ? 70 : type === 'crumble' ? 60 : type === 'conv' ? 75 : type === 'spinner' ? 90 : w, type, Math.floor(r() * PAL.length)); sc.genTop = y; }
        // segment line markers
        const segTop = -seg * C.SEG;
        if (y < segTop + 60 && !sc.marks.getChildren().some(m => m.segY === segTop)) {
          const line = sc.add.rectangle(W / 2, segTop, W, 2, 0xffffff, 0.35).setDepth(5); line.segY = segTop; sc.marks.add(line);
          const label = sc.add.text(W - 16, segTop + 6, `${s('seg')} ${seg} ✓  ${seg * 60} ${s('mfmt')}`, { fontFamily: 'system-ui', fontSize: '11px', color: '#ffffff' }).setOrigin(1, 0).setAlpha(.8).setDepth(5); label.segY = segTop; sc.marks.add(label);
        }
      }
      // cull far below
      const limit = sc.lavaY + 400;
      sc.plats = sc.plats.filter(p => { if (p.y > limit) { p.obj.destroy(); if (p.spike) p.spike.destroy(); return false; } return true; });
      sc.spinners = sc.spinners.filter(sp => { if (sp.y > limit) { sp.bar.destroy(); sp.pivot.destroy(); return false; } return true; });
    }
    oneWay(player, pl) { const prevBottom = player.body.prev.y + player.body.height; return player.body.velocity.y >= 0 && prevBottom <= pl.body.top + 6 && !this.dead; }
    onLand(obj) {
      const sc = this, p = sc.plats.find(q => q.obj === obj); if (!p || !sc.player.body.touching.down) return;
      if (!sc.wasGround) { sc.squash(1.25, 0.8); sc.bridge.sound('land'); U.burst(sc, sc.player.x, sc.player.y + 12, [0xffffff], 3, 90, { up: 1, lift: 40, size: .6 }); }
      sc.flipAvail = true; sc.onPlat = p;
      if (p.type === 'bounce') { sc.player.setVelocityY(C.BOUNCE); sc.bridge.sound('bounce'); sc.squash(0.7, 1.4); sc.tweens.add({ targets: obj, scaleY: 0.5, duration: 80, yoyo: true }); U.burst(sc, p.x, p.y, [0x22c55e, 0xbbf7d0], 10, 200, { up: 1 }); }
      if (p.type === 'crumble' && !p.crumbling) { p.crumbling = true; sc.bridge.sound('crack'); sc.tweens.add({ targets: obj, x: p.x + 2, duration: 40, yoyo: true, repeat: 6 }); sc.time.delayedCall(C.CRUMBLE, () => { if (!p.alive) return; obj.body.enable = false; obj.setAlpha(0.15); U.burst(sc, p.x, p.y, [0xd6a35c, 0x92400e], 8, 150); sc.bridge.sound('brick'); sc.time.delayedCall(C.RESPAWN, () => { if (!p.alive) return; obj.body.enable = true; obj.setAlpha(1); p.crumbling = false; }); }); }
      if (p.type === 'spikes' && Math.abs(sc.player.x - p.spikeX) < 30 + 8) sc.die('spikes');
      if (sc.buffer > 0) { sc.buffer = 0; sc.jump(); }
    }
    squash(sx, sy) { this.tweens.add({ targets: this.player, scaleX: sx, scaleY: sy, duration: 60, yoyo: true, ease: 'Quad.easeOut' }); }
    press() {
      const sc = this;
      if (!sc.started) { sc.started = true; sc.bridge.started(); sc.lavaT = 0; }
      if (sc.dead) return;
      const now = sc.time.now; if (now - (sc.lastPress || 0) < 50) return; sc.lastPress = now;
      sc.holding = true; sc.holdT = 0;
      if (sc.player.body.touching.down || sc.coyote > 0) sc.jump();
      else if (sc.flipAvail) { sc.flipAvail = false; sc.dir = -sc.dir; sc.bridge.sound('whoosh'); sc.player.setFlipX(sc.dir < 0); U.burst(sc, sc.player.x, sc.player.y, [0xffffff], 4, 80, { size: .5, lift: 0 }); }
      else sc.buffer = C.BUFFER;
    }
    jump() { const sc = this; sc.player.setVelocityY(C.JUMP); sc.coyote = 0; sc.holdT = 0; sc.flipAvail = true; sc.bridge.sound('jump'); sc.squash(0.8, 1.25); }
    die(cause) {
      const sc = this; if (sc.dead) return; sc.dead = true; sc.lastCause = cause; sc.deathLog = (sc.deathLog || []).concat([cause + '@' + Math.round(-sc.player.y / 10)]);
      const h = Math.round(-sc.player.y / 10); sc.d.lifetime = (sc.d.lifetime || 0) + Math.max(0, h);
      if (h > (sc.d.best || 0)) sc.d.best = h; sc.bridge.save();
      sc.bridge.sound(cause === 'lava' ? 'oof' : 'hit'); sc.bridge.sound('fail');
      U.burst(sc, sc.player.x, sc.player.y, [0xf97316, 0xfed7aa, 0xfff7ed], 14, 320); U.shake(sc, 1.2);
      sc.player.setVisible(false); sc.player.body.enable = false; sc.player.setVelocity(0, 0);
      sc.time.timeScale = 0.25; sc.time.delayedCall(30, () => { sc.time.timeScale = 1; });
      sc.bridge.died({ height: h, segment: sc.segment, canRope: sc.segment >= 3 && !sc.ropeUsed, restart: () => { sc.newRun(); sc.started = true; sc.player.body.setGravityY(0); }, rope: () => { sc.ropeUsed = true; sc.newRun(sc.segment); sc.started = true; sc.player.body.setGravityY(0); } });
    }
    /* ---------- update ---------- */
    update(time, delta) {
      const sc = this, dt = Math.min(delta, 50) / 1000, pl = sc.player;
      // background gradient by segment
      sc.bg.clear(); const hue = (240 + sc.segment * 18) % 360; const col = Phaser.Display.Color.HSLToColor(hue / 360, 0.55, 0.42).color, col2 = Phaser.Display.Color.HSLToColor(((hue + 30) % 360) / 360, 0.7, 0.75).color;
      sc.bg.fillGradientStyle(col, col, col2, col2, 1); sc.bg.fillRect(0, 0, W, H);
      sc.bg.fillStyle(0x1e1b4b, 0.35); sc.bg.fillRect(0, 0, 12, H); sc.bg.fillRect(W - 12, 0, 12, H);
      sc.bg.fillStyle(0xffffff, 0.08); for (let i = 0; i < 14; i++) { const yy = ((i * 47 + 20) + (sc.cameras.main.scrollY * 0.3)) % H; sc.bg.fillCircle(6, (yy + H) % H, 3); sc.bg.fillCircle(W - 6, (yy * 1.3 + 30 + H) % H, 3); }
      if (!sc.started && !sc.dead) { pl.setVelocity(0, 0); pl.body.setGravityY(-C.G); return; }
      if (sc.dead) { sc.drawLava(dt); return; }
      // horizontal auto-run & walls
      pl.setVelocityX(sc.dir * C.RUN);
      if (pl.x < 12 + 11 && sc.dir < 0) { sc.dir = 1; sc.wallKick(); } if (pl.x > W - 12 - 11 && sc.dir > 0) { sc.dir = -1; sc.wallKick(); }
      pl.setFlipX(sc.dir < 0);
      // conveyor
      if (pl.body.touching.down && sc.onPlat && sc.onPlat.type === 'conv') pl.x += sc.onPlat.convDir * 80 * dt;
      // jump hold / coyote / buffer
      const ground = pl.body.touching.down;
      if (ground) sc.coyote = C.COYOTE; else sc.coyote = Math.max(0, sc.coyote - delta);
      if (sc.buffer > 0) sc.buffer -= delta;
      if (sc.holding && pl.body.velocity.y < 0 && sc.holdT < C.HOLD_MS) { sc.holdT += delta; pl.body.setGravityY(-(C.G - C.HOLD_G)); } else pl.body.setGravityY(0);
      sc.wasGround = ground;
      if (!ground) sc.onPlat = null;
      // movers
      sc.movers.getChildren().forEach(m => { m.body.setVelocityX(m.moveDir * 50); if (m.x > m.baseX + 60) m.moveDir = -1; if (m.x < m.baseX - 60) m.moveDir = 1; });
      // spinners
      for (const sp of sc.spinners) {
        sp.bar.angle += sp.dir * C.SPIN_DPS * dt;
        const a = Phaser.Math.DegToRad(sp.bar.angle), ca = Math.cos(a), sa = Math.sin(a), L = 45;
        const dx = pl.x - sp.x, dy = pl.y - sp.y, proj = Phaser.Math.Clamp(dx * ca + dy * sa, -L, L), ex = sp.x + ca * proj, ey = sp.y + sa * proj;
        if (Math.hypot(pl.x - ex, pl.y - ey) < 15 && Math.hypot(dx, dy) > 9) { sc.die('spinner'); return; }
      }
      // camera (upward only, allow 150 px back)
      const cam = sc.cameras.main; const target = pl.y - 330;
      if (target < cam.scrollY) cam.scrollY += (target - cam.scrollY) * Math.min(1, dt * 8);
      if (pl.y - 150 > cam.scrollY + H - 60) cam.scrollY = pl.y - 150 - H + 60; // falling back: follow down a bit
      sc.generate();
      // segments
      const topSeg = Math.floor((-pl.y) / C.SEG) + 1;
      if (topSeg > sc.segment && ground) {
        sc.segment = topSeg; sc.bridge.segment(sc.segment);
        const line = sc.add.rectangle(W / 2, pl.y + 20, 0, 3, 0xffffff).setDepth(40); sc.tweens.add({ targets: line, width: W, alpha: 0, duration: 500, onComplete: () => line.destroy() });
        U.float(sc, pl.x, pl.y - 30, '+1 ★', { color: '#fde047' }); cam.scrollY -= 4;
        if (sc.segment === C.DAILY + 1 && !sc.summitDone) { sc.summitDone = true; sc.bridge.summit(); U.float(sc, W / 2, pl.y - 70, s('summit'), { fontSize: '30px', color: '#fde047' }); U.burst(sc, W / 2, pl.y - 40, PAL, 40, 400, { up: 2 }); sc.tweens.add({ targets: pl, angle: 360, duration: 500 }); }
      }
      // lava
      sc.lavaT += delta;
      if (sc.lavaT > C.GRACE) {
        let speed = Math.min(C.LAVA_CAP, C.LAVA_BASE + C.LAVA_PER * (sc.segment - 1));
        if (sc.lavaY - pl.y > C.CATCH_D) speed *= C.CATCH_M;
        sc.lavaY -= Math.min(speed * dt, 4);
      }
      sc.drawLava(dt);
      const dist = sc.lavaY - pl.y;
      if (dist < 250 && !sc.lavaWarned) { sc.lavaWarned = true; sc.bridge.sound('alarm'); } if (dist > 300) sc.lavaWarned = false;
      sc.vignette.clear(); if (dist < 250) { const k = 1 - dist / 250; sc.vignette.fillStyle(0xf97316, 0.25 * k * (0.7 + 0.3 * Math.sin(time / 120))); sc.vignette.fillRect(0, 0, 10 + 20 * k, H); sc.vignette.fillRect(W - 10 - 20 * k, 0, 10 + 20 * k, H); sc.vignette.fillRect(0, H - 10 - 30 * k, W, 10 + 30 * k); }
      if (pl.y + 8 > sc.lavaY) { sc.die('lava'); return; }
      if (pl.y > cam.scrollY + H + 400) { sc.die('fall'); return; }
      if (Math.floor(time / 100) !== Math.floor((time - delta) / 100)) sc.hud(sc.hudData());
    }
    wallKick() { const pl = this.player; if (!pl.body.touching.down) pl.setVelocityY(Math.min(pl.body.velocity.y, pl.body.velocity.y - 120)); this.flipAvail = true; this.bridge.sound('tap'); U.burst(this, pl.x + (this.dir < 0 ? 12 : -12), pl.y, [0xffffff], 3, 60, { size: .5, lift: 0 }); }
    drawLava(dt) {
      const sc = this, g = sc.lava, cam = sc.cameras.main, y = sc.lavaY, t = sc.time.now / 1000;
      g.clear(); if (y > cam.scrollY + H + 40) return;
      g.fillStyle(0xdc2626); g.fillRect(0, y, W, cam.scrollY + H - y + 50);
      g.fillStyle(0xf97316); g.beginPath(); g.moveTo(0, y + 20); for (let x = 0; x <= W; x += 10) g.lineTo(x, y + Math.sin(x * 0.05 + t * 3) * 4 + Math.sin(x * 0.11 - t * 5) * 2); g.lineTo(W, y + 20); g.closePath(); g.fillPath();
      g.fillStyle(0xfde047, 0.9); for (let i = 0; i < 6; i++) g.fillCircle(((i * 73 + t * 30) % W), y + 12 + ((t * 25 + i * 17) % 30), 2 + (i % 3));
      if (Math.random() < 0.3) { const e = sc.add.circle(Math.random() * W, y - 4, 2, 0xfbbf24).setDepth(49); sc.tweens.add({ targets: e, y: y - 60 - Math.random() * 60, alpha: 0, duration: 900, onComplete: () => e.destroy() }); }
    }
  }

  Games.register({
    id: 'tower', icon: '🗼', bg: '#e0e7ff', partner: 'p5', tier: 'top', isNew: true, kicker: { de: 'Turm-Obby mit Lava', ru: 'Башня-обби с лавой' }, art: () => Art.topScene('tower'),
    name: { de: 'Turmlauf', ru: 'Башня' },
    tagline: { de: 'Klettere den Spielplatz-Turm hoch, bevor die Lava dich holt. Kein Checkpoint, nur Nerven.', ru: 'Карабкайся по башне, пока лава не догнала. Без чекпоинтов, только нервы.' },
    mount(root, ctx) {
      const d = ctx.data; d.best = d.best || 0; d.lifetime = d.lifetime || 0;
      const today = new Date().toISOString().slice(0, 10); if (d.dailyDate !== today) { d.dailyDate = today; d.dailySummit = false; }
      d.mode = 'daily'; d.seed = parseInt(today.replace(/-/g, '')) >>> 0;
      root.innerHTML = `
        <div class="game-head">
          <span class="stat">📏 <b id="tw-h">0</b> ${s('mfmt')}</span>
          <span class="stat">🚩 <b id="tw-seg">1</b>/${C.DAILY}</span>
          <span class="stat" id="tw-lava">🌋 –</span>
          <span class="stat muted">🏆 <span id="tw-best">${d.best}</span> ${s('mfmt')}</span>
        </div>`;
      const ov = document.createElement('div'); ov.className = 'cv-overlay ph-overlay'; ov.innerHTML = `<b>${s('title')}</b><span>${s('hint')}</span><em>${s('go')}</em>`;
      const $ = id => root.querySelector('#' + id);
      let host;
      const bridge = {
        sound: (n, a) => ctx.sound(n, a), save: () => ctx.save(),
        started() { ov.classList.add('hidden'); },
        segment(n) { ctx.stars(1, true); ctx.sound('checkpoint'); },
        summit() { if (!d.dailySummit) { d.dailySummit = true; ctx.save(); ctx.stars(4); } ctx.sound('fanfare'); FX.confetti(); ctx.badge('tower'); },
        died(info) {
          $('tw-best').textContent = d.best;
          if (info.canRope) {
            ctx.modal({ title: s('dead'), dismissible: false, html: `<div class="center" style="font-size:48px">🌋</div><p class="center">${s('height')}: <b>${info.height} ${s('mfmt')}</b> · ${s('seg')} ${info.segment}</p>`,
              actions: [{ label: `🪢 ${s('rope')} · ${t('watch_ad')}`, cls: 'btn-ad', async onClick() { const ok = await ctx.ad(); if (ok) info.rope(); else info.restart(); } }, { label: s('again'), cls: 'btn-primary', onClick: () => info.restart() }, { label: t('continue'), cls: 'btn-ghost', onClick: () => Hub.show('home') }] });
          } else setTimeout(() => { if (host && host.game && !host.game.isDestroyed) info.restart(); }, 700);
        }
      };
      const hud = h => { $('tw-h').textContent = h.height; $('tw-seg').textContent = Math.min(h.segment, C.DAILY) + (h.segment > C.DAILY ? '+' : ''); const lv = $('tw-lava'); lv.textContent = `🌋 ${h.lava} ${s('mfmt')}`; lv.style.color = h.lava < 25 ? 'var(--rose)' : ''; };
      host = PhaserHost.mount(root, TowerScene, { bridge, data: { save: d, hud }, physics: { default: 'arcade', arcade: { gravity: { y: C.G }, debug: false } }, bg: '#4338ca' });
      root.querySelector('.ph-wrap').appendChild(ov);
      return { destroy() { host.destroy(); } };
    }
  });
})();
