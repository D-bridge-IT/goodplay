// Waldgarten: tree-nursery tycoon with real-time (offline) growth, mutations, weather and a seed shop (Phaser 3).
(function () {
  const U = PhaserHost.U, W = 375, H = 600;
  const SEEDS = [
    { id: 'wildflower', de: 'Wildblume', ru: 'Полевой цветок', cost: 8, grow: 20e3, sell: 14, lvl: 1, color: 0xf472b6, tree: false },
    { id: 'clover', de: 'Klee', ru: 'Клевер', cost: 20, grow: 60e3, sell: 40, lvl: 2, color: 0x22c55e, tree: false },
    { id: 'mushroom', de: 'Pilz', ru: 'Гриб', cost: 50, grow: 180e3, sell: 110, lvl: 3, color: 0xef4444, tree: false },
    { id: 'berry', de: 'Beerenstrauch', ru: 'Ягодный куст', cost: 120, grow: 480e3, sell: 300, lvl: 4, color: 0x7c3aed, tree: false },
    { id: 'hazel', de: 'Hasel', ru: 'Лещина', cost: 300, grow: 1500e3, sell: 800, lvl: 5, color: 0x65a30d, tree: true },
    { id: 'birch', de: 'Birke', ru: 'Берёза', cost: 800, grow: 5400e3, sell: 2400, lvl: 6, color: 0x86efac, tree: true },
    { id: 'oak', de: 'Eiche', ru: 'Дуб', cost: 2500, grow: 18000e3, sell: 8000, lvl: 8, color: 0x15803d, tree: true },
    { id: 'fir', de: 'Bergtanne', ru: 'Пихта', cost: 8000, grow: 43200e3, sell: 30000, lvl: 10, color: 0x166534, tree: true }
  ];
  const TIERS = [{ id: 'normal', mult: 1, p: 0 }, { id: 'gold', de: 'GOLD', ru: 'ЗОЛОТО', mult: 3, p: .09, color: 0xfde047 }, { id: 'giant', de: 'RIESIG', ru: 'ГИГАНТ', mult: 8, p: .035, color: 0xfb923c }, { id: 'shimmer', de: 'SCHIMMER', ru: 'МЕРЦАНИЕ', mult: 25, p: .012, color: 0x22d3ee }, { id: 'moonlit', de: 'MONDLICHT', ru: 'ЛУННЫЙ', mult: 80, p: .003, color: 0x93c5fd }];
  const LEVELS = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6500, 10000, 15000];
  const PLOT_PRICES = [0, 0, 0, 0, 60, 150, 350, 800, 1800, 4000, 9000, 20000];
  const C = { START: 30, OFFLINE_CAP: 8 * 3600e3, BASKET: 20, XP_PER_COIN: .1, WEATHER_INT: 8 * 60e3, WEATHER_DUR: 2 * 60e3, RAIN_MULT: 2, WATER_MULT: 2, WATER_MAX: 5000, STARS_PER: 300, AD_RAIN: 3 * 60e3, AD_CD: 30 * 60e3 };
  const S = {
    de: { title: 'WALDGARTEN', hint: 'Samen wählen · Beet antippen · Ernte einsammeln · Verkaufen', go: 'Los!', sell: 'Verkaufen', basket: 'Korb', ready: 'Fertig!', locked: 'Kaufen', level: 'Level', seedlings: 'Setzlinge', sun: 'Sonne', rain: 'Regen', fog: 'Nebel', adrain: 'Regenwolke', back: 'Willkommen zurück!', away: 'Du warst {t} weg', readyN: '{n} Pflanzen sind fertig', full: 'Korb voll – verkaufen!', nocoins: 'Zu wenig Münzen', needlvl: 'Ab Level {l}', bought: 'Neues Beet!', sold: 'Verkauft', mut: 'Mutation!', water: 'Gießen…', min: 'min', h: 'h', s: 's', hintTree: 'Jeder Baum erinnert an echte Aufforstung (symbolisch).' },
    ru: { title: 'ЛЕСНОЙ САД', hint: 'Выбери семена · тапни грядку · собери урожай · продай', go: 'Погнали!', sell: 'Продать', basket: 'Корзина', ready: 'Готово!', locked: 'Купить', level: 'Уровень', seedlings: 'Саженцы', sun: 'Солнце', rain: 'Дождь', fog: 'Туман', adrain: 'Дождевая туча', back: 'С возвращением!', away: 'Тебя не было {t}', readyN: 'Созрело растений: {n}', full: 'Корзина полна — продай!', nocoins: 'Мало монет', needlvl: 'С уровня {l}', bought: 'Новая грядка!', sold: 'Продано', mut: 'Мутация!', water: 'Полив…', min: 'мин', h: 'ч', s: 'с', hintTree: 'Каждое дерево напоминает о настоящих посадках (символично).' }
  };
  const s = (k, v) => { let str = (S[LANG] || S.de)[k] || k; if (v) for (const kk in v) str = str.replace('{' + kk + '}', v[kk]); return str; };
  const nm = o => LANG === 'ru' ? o.ru : o.de;
  const fmtT = ms => { const m = Math.floor(ms / 60000), h = Math.floor(m / 60); return h ? `${h} ${s('h')} ${m % 60} ${s('min')}` : m ? `${m} ${s('min')}` : `${Math.ceil(ms / 1000)} ${s('s')}`; };

  class GardenScene extends Phaser.Scene {
    constructor() { super('main'); }
    init(data) { this.bridge = this.registry.get('bridge'); this.d = data.save; }
    create() {
      const sc = this, d = sc.d;
      sc.cameras.main.setBackgroundColor('#bbf7d0');
      const bg = sc.add.graphics(); bg.fillGradientStyle(0x7dd3fc, 0x7dd3fc, 0xbae6fd, 0xbae6fd, 1); bg.fillRect(0, 0, W, 90); bg.fillStyle(0x86efac); bg.fillRect(0, 86, W, 350); bg.fillStyle(0x65a30d); bg.fillRect(0, 436, W, H - 436);
      for (let i = 0; i < 5; i++) { const c = sc.add.circle(40 + i * 80, 30 + (i % 2) * 18, 14, 0xffffff, .8); sc.tweens.add({ targets: c, x: c.x + 30, duration: 9000 + i * 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      sc.weatherTxt = sc.add.text(16, 72, '', { fontFamily: 'system-ui', fontSize: '13px', fontStyle: 'bold', color: '#1e3a8a' }).setDepth(5);
      sc.rainG = sc.add.graphics().setDepth(40); sc.fogG = sc.add.graphics().setDepth(39);
      // plots
      sc.cells = [];
      for (let i = 0; i < 12; i++) {
        const r = Math.floor(i / 3), c = i % 3, x = 20 + c * 115 + 52, y = 110 + r * 82 + 38;
        const g = sc.add.graphics(); const cell = { i, x, y, g, plant: null, ring: sc.add.graphics(), label: sc.add.text(x, y + 28, '', { fontFamily: 'system-ui', fontSize: '11px', fontStyle: 'bold', color: '#fff', stroke: '#1e293b', strokeThickness: 3 }).setOrigin(0.5).setDepth(8) };
        const hit = sc.add.rectangle(x, y, 104, 78, 0, 0).setInteractive(); cell.hit = hit;
        hit.on('pointerdown', p => sc.onPlotDown(cell, p)); hit.on('pointerup', () => sc.onPlotUp(cell)); hit.on('pointerout', () => sc.onPlotUp(cell));
        sc.cells.push(cell);
      }
      // seed tray (2 rows × 4)
      sc.cards = SEEDS.map((sd, i) => {
        const x = 20 + (i % 4) * 86 + 40, y = 452 + Math.floor(i / 4) * 52 + 24;
        const cont = sc.add.container(x, y).setDepth(10); const g = sc.add.graphics(); cont.add(g);
        const icon = sc.add.graphics(); sc.drawPlant(icon, sd, 1, 0, 0.45); icon.setPosition(-26, 8); cont.add(icon);
        const name = sc.add.text(-8, -16, nm(sd), { fontFamily: 'system-ui', fontSize: '11px', fontStyle: 'bold', color: '#1e293b' }).setOrigin(0, 0); cont.add(name);
        const price = sc.add.text(-8, 0, `🪙 ${sd.cost}`, { fontFamily: 'system-ui', fontSize: '11px', color: '#92400e' }).setOrigin(0, 0); cont.add(price);
        const lock = sc.add.text(-8, 14, '', { fontFamily: 'system-ui', fontSize: '10px', color: '#64748b' }).setOrigin(0, 0); cont.add(lock);
        const hit = sc.add.rectangle(0, 0, 80, 46, 0, 0).setInteractive(); cont.add(hit); hit.on('pointerdown', () => sc.selectSeed(i));
        return { sd, cont, g, name, price, lock, i };
      });
      sc.sel = 0;
      // basket + sell
      sc.basketTxt = sc.add.text(20, 560, '', { fontFamily: 'system-ui', fontSize: '14px', fontStyle: 'bold', color: '#fff' }).setDepth(10);
      sc.sellBtn = U.button(sc, 270, 568, 170, 44, '', 0x16a34a, () => sc.sell());
      sc.toast = sc.add.text(W / 2, 92, '', { fontFamily: 'system-ui', fontSize: '13px', fontStyle: 'bold', color: '#fff', stroke: '#14532d', strokeThickness: 3 }).setOrigin(0.5).setDepth(50).setAlpha(0);
      sc.applyOffline();
      sc.refreshAll();
      sc.time.addEvent({ delay: 250, loop: true, callback: () => sc.tick() });
    }
    /* ---------- state helpers ---------- */
    now() { return Date.now(); }
    weather() {
      const d = this.d, n = this.now();
      if (d.adRainUntil > n) return { id: 'rain', left: d.adRainUntil - n, mult: 3, ad: true };
      const phase = n % C.WEATHER_INT, slot = Math.floor(n / C.WEATHER_INT) % 3;
      if (phase < C.WEATHER_DUR && slot !== 0) return { id: slot === 1 ? 'rain' : 'fog', left: C.WEATHER_DUR - phase, mult: slot === 1 ? C.RAIN_MULT : 1 };
      return { id: 'sun', mult: 1 };
    }
    progress(p) { if (!p) return 0; return Math.min(1, (this.now() - p.plantedAt + (p.boost || 0)) / p.growMs); }
    levelFor(xp) { let l = 1; for (let i = 1; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i + 1; return l; }
    applyOffline() {
      const d = this.d, n = this.now(); if (!d.lastSeen) { d.lastSeen = n; return; }
      let elapsed = n - d.lastSeen; if (elapsed < 0) elapsed = 0; if (elapsed > C.OFFLINE_CAP) elapsed = C.OFFLINE_CAP;
      const ready = d.plots.filter(p => p && this.progress(p) >= 1).length;
      if (n - d.lastSeen > 60e3 && ready) this.bridge.welcome(fmtT(n - d.lastSeen), ready);
      d.lastSeen = n;
    }
    /* ---------- drawing ---------- */
    drawPlant(g, sd, stage, tier, scale) {
      g.clear(); const sc1 = (0.35 + 0.65 * stage) * (scale || 1) * (tier === 2 ? 1.4 : 1);
      const col = tier === 1 ? 0xfde047 : tier === 3 ? 0x67e8f9 : tier === 4 ? 0xbfdbfe : sd.color;
      g.save(); g.scale && 0;
      const S2 = v => v * sc1;
      g.fillStyle(0x92400e); g.fillEllipse(0, S2(6), S2(44), S2(14)); // soil mound
      switch (sd.id) {
        case 'wildflower': g.fillStyle(0x16a34a); g.fillRect(-S2(2), -S2(26), S2(4), S2(30)); g.fillStyle(col); for (let a = 0; a < 6; a++) g.fillCircle(Math.cos(a) * S2(9), -S2(30) + Math.sin(a) * S2(9), S2(6)); g.fillStyle(0xfde047); g.fillCircle(0, -S2(30), S2(5)); break;
        case 'clover': g.fillStyle(0x16a34a); g.fillRect(-S2(2), -S2(20), S2(4), S2(24)); g.fillStyle(col); g.fillCircle(-S2(8), -S2(24), S2(8)); g.fillCircle(S2(8), -S2(24), S2(8)); g.fillCircle(0, -S2(32), S2(8)); break;
        case 'mushroom': g.fillStyle(0xfef3c7); g.fillRect(-S2(6), -S2(22), S2(12), S2(26)); g.fillStyle(col); g.fillEllipse(0, -S2(24), S2(36), S2(20)); g.fillStyle(0xffffff); g.fillCircle(-S2(8), -S2(26), S2(3)); g.fillCircle(S2(6), -S2(28), S2(3)); break;
        case 'berry': g.fillStyle(0x16a34a); g.fillCircle(-S2(10), -S2(18), S2(13)); g.fillCircle(S2(10), -S2(18), S2(13)); g.fillCircle(0, -S2(28), S2(13)); g.fillStyle(col); for (const [a, b] of [[-12, -18], [8, -22], [0, -32], [12, -12]]) g.fillCircle(S2(a), S2(b), S2(3.5)); break;
        case 'hazel': g.fillStyle(0x92400e); g.fillRect(-S2(3), -S2(28), S2(6), S2(32)); g.fillStyle(col); g.fillTriangle(-S2(22), -S2(20), S2(22), -S2(20), 0, -S2(56)); break;
        case 'birch': g.fillStyle(0xf8fafc); g.fillRect(-S2(3), -S2(34), S2(6), S2(38)); g.fillStyle(0x1e293b); g.fillRect(-S2(3), -S2(20), S2(3), S2(2)); g.fillRect(0, -S2(10), S2(3), S2(2)); g.fillStyle(col); g.fillCircle(0, -S2(42), S2(18)); break;
        case 'oak': g.fillStyle(0x78350f); g.fillRect(-S2(5), -S2(30), S2(10), S2(34)); g.fillStyle(col); g.fillCircle(-S2(14), -S2(36), S2(15)); g.fillCircle(S2(14), -S2(36), S2(15)); g.fillCircle(0, -S2(48), S2(17)); break;
        case 'fir': g.fillStyle(0x78350f); g.fillRect(-S2(3), -S2(20), S2(6), S2(24)); g.fillStyle(col); g.fillTriangle(-S2(22), -S2(14), S2(22), -S2(14), 0, -S2(38)); g.fillTriangle(-S2(17), -S2(30), S2(17), -S2(30), 0, -S2(52)); g.fillTriangle(-S2(12), -S2(44), S2(12), -S2(44), 0, -S2(64)); break;
      }
      g.restore();
    }
    refreshCell(cell) {
      const sc = this, d = sc.d, g = cell.g, p = d.plots[cell.i], unlocked = cell.i < d.unlocked;
      g.clear();
      g.fillStyle(0x3f6212, 1); g.fillRoundedRect(cell.x - 52 + 3, cell.y - 39 + 4, 104, 78, 12);
      g.fillStyle(unlocked ? 0xa16207 : 0x4d7c0f, 1); g.fillRoundedRect(cell.x - 52, cell.y - 39, 104, 78, 12);
      g.fillStyle(unlocked ? 0x854d0e : 0x3f6212, 1); g.fillRoundedRect(cell.x - 46, cell.y - 33, 92, 66, 10);
      if (!unlocked) { g.fillStyle(0xfef3c7); g.fillRoundedRect(cell.x - 10, cell.y - 8, 20, 16, 3); g.lineStyle(3, 0xfef3c7); g.beginPath(); g.arc(cell.x, cell.y - 8, 7, Math.PI, 0); g.strokePath(); cell.label.setText(`🔒 ${PLOT_PRICES[cell.i]}`); }
      else if (!p) { g.fillStyle(0xfef3c7, 0.6); g.fillRect(cell.x - 2, cell.y - 10, 4, 20); g.fillRect(cell.x - 10, cell.y - 2, 20, 4); cell.label.setText(''); }
      else cell.label.setText('');
      if (!cell.plant) { cell.plant = sc.add.graphics().setDepth(6); cell.plant.setPosition(cell.x, cell.y + 10); }
      if (p) { const sd = SEEDS.find(x => x.id === p.seed); const pr = sc.progress(p); const stage = pr < 0.33 ? 0 : pr < 0.8 ? 0.5 : 1; if (cell.stage !== stage || cell.seed !== p.seed) { sc.drawPlant(cell.plant, sd, stage, 0, 1); if (cell.stage != null && stage > cell.stage) { sc.bridge.sound('pop'); U.pop(sc, cell.plant, 1.2); } cell.stage = stage; cell.seed = p.seed; } cell.plant.setVisible(true); }
      else { cell.plant.setVisible(false); cell.stage = null; cell.seed = null; }
    }
    refreshAll() { const sc = this; sc.cells.forEach(c => sc.refreshCell(c)); sc.refreshCards(); sc.refreshBar(); sc.bridge.hud(); }
    refreshCards() {
      const sc = this, d = sc.d, lvl = sc.levelFor(d.xp);
      sc.cards.forEach(card => {
        const ok = card.sd.lvl <= lvl, can = d.coins >= card.sd.cost; card.g.clear();
        card.g.fillStyle(0x14532d, 1); card.g.fillRoundedRect(-40, -22 + 3, 80, 46, 10); card.g.fillStyle(sc.sel === card.i ? 0xfef9c3 : 0xffffff, ok ? 1 : 0.6); card.g.fillRoundedRect(-40, -22 - (sc.sel === card.i ? 4 : 0), 80, 46, 10);
        card.price.setColor(can ? '#92400e' : '#dc2626'); card.lock.setText(ok ? '' : s('needlvl', { l: card.sd.lvl })); card.name.setAlpha(ok ? 1 : .5);
      });
    }
    refreshBar() { const d = this.d; const total = d.basket.reduce((a, b) => a + SEEDS.find(x => x.id === b.seed).sell * TIERS[b.tier].mult, 0); this.basketTxt.setText(`🧺 ${s('basket')} ${d.basket.length}/${C.BASKET}`); this.sellBtn.label.setText(`${s('sell')} · 🪙 ${total}`); this.sellBtn.setAlpha(d.basket.length ? 1 : 0.5); }
    say(txt, color) { const t = this.toast; t.setText(txt).setAlpha(1).setColor(color || '#fff'); this.tweens.killTweensOf(t); this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 400 }); }
    /* ---------- interactions ---------- */
    selectSeed(i) { this.sel = i; this.bridge.sound('click'); this.refreshCards(); }
    onPlotDown(cell, pointer) {
      const sc = this, d = sc.d, p = d.plots[cell.i];
      if (cell.i >= d.unlocked) { if (cell.i !== d.unlocked) return; const price = PLOT_PRICES[cell.i]; if (d.coins < price) { sc.say(s('nocoins'), '#fecaca'); sc.bridge.sound('bad'); return; } d.coins -= price; d.unlocked++; sc.bridge.sound('buy'); sc.bridge.stars(1); U.burst(sc, cell.x, cell.y, [0xfde047, 0xffffff, 0x86efac], 16, 220); sc.say(s('bought')); sc.refreshAll(); sc.bridge.save(); return; }
      if (!p) { const sd = SEEDS[sc.sel]; if (sd.lvl > sc.levelFor(d.xp)) { sc.say(s('needlvl', { l: sd.lvl }), '#fecaca'); sc.bridge.sound('bad'); return; } if (d.coins < sd.cost) { sc.say(s('nocoins'), '#fecaca'); sc.bridge.sound('bad'); sc.tweens.add({ targets: sc.cards[sc.sel].cont, x: sc.cards[sc.sel].cont.x + 4, duration: 40, yoyo: true, repeat: 3 }); return; }
        d.coins -= sd.cost; d.plots[cell.i] = { seed: sd.id, plantedAt: sc.now(), growMs: sd.grow, boost: 0, waterUsed: 0, waterMin: Math.floor(sc.now() / 60000) }; sc.bridge.sound('plant');
        const fly = sc.add.circle(sc.cards[sc.sel].cont.x, sc.cards[sc.sel].cont.y, 6, sd.color).setDepth(30); sc.tweens.add({ targets: fly, x: cell.x, y: cell.y, duration: 250, ease: 'Quad.easeIn', onComplete: () => { fly.destroy(); U.burst(sc, cell.x, cell.y + 6, [0x92400e, 0xa16207, 0x86efac], 8, 120, { up: 1.2 }); } });
        sc.refreshAll(); sc.bridge.save(); return; }
      if (sc.progress(p) >= 1) { sc.harvest(cell); return; }
      // growing: start watering
      cell.watering = true; sc.say(`💧 ${s('water')} ${fmtT((1 - sc.progress(p)) * p.growMs)}`);
    }
    onPlotUp(cell) { cell.watering = false; }
    harvest(cell) {
      const sc = this, d = sc.d, p = d.plots[cell.i]; if (!p) return;
      if (d.basket.length >= C.BASKET) { sc.say(s('full'), '#fecaca'); sc.bridge.sound('bad'); U.shake(sc, .5); return; }
      const sd = SEEDS.find(x => x.id === p.seed), w = sc.weather(), hour = new Date().getHours();
      let r = Math.random(), tier = 0; const pM = (hour >= 22 || hour < 6) ? TIERS[4].p : 0, pS = TIERS[3].p * (w.id === 'fog' ? 3 : 1), pG = TIERS[1].p + (w.id === 'rain' ? .05 : 0), pGi = TIERS[2].p;
      if (r < pM) tier = 4; else if (r < pM + pS) tier = 3; else if (r < pM + pS + pGi) tier = 2; else if (r < pM + pS + pGi + pG) tier = 1;
      d.plots[cell.i] = null; d.basket.push({ seed: sd.id, tier });
      sc.bridge.sound('harvest', d.basket.length);
      const colors = tier ? [TIERS[tier].color, 0xffffff] : [sd.color, 0x86efac, 0xffffff];
      U.burst(sc, cell.x, cell.y - 10, colors, tier ? 24 : 10, tier ? 320 : 160, { circle: true });
      if (tier) { sc.bridge.sound('rare'); U.float(sc, cell.x, cell.y - 40, `✨ ${nm(TIERS[tier])} ×${TIERS[tier].mult}`, { fontSize: '16px', color: '#' + TIERS[tier].color.toString(16).padStart(6, '0') }); U.shake(sc, tier >= 3 ? 1 : .4); if (!d.counters.mut.includes(tier)) { d.counters.mut.push(tier); sc.bridge.stars(2); } if (tier === 4) { const dim = sc.add.rectangle(W / 2, H / 2, W, H, 0x1e3a8a, .5).setDepth(45); sc.tweens.add({ targets: dim, alpha: 0, duration: 1000, onComplete: () => dim.destroy() }); } }
      else U.float(sc, cell.x, cell.y - 30, `+1 🧺`, { fontSize: '14px' });
      sc.refreshAll(); sc.bridge.save();
    }
    sell() {
      const sc = this, d = sc.d; if (!d.basket.length) return;
      let total = 0; d.basket.forEach(b => { const sd = SEEDS.find(x => x.id === b.seed); const v = sd.sell * TIERS[b.tier].mult; total += v; if (sd.tree) d.counters.trees++; });
      d.basket = []; d.coins += total; d.xp += Math.round(total * C.XP_PER_COIN); d.counters.earned += total;
      const stars = Math.floor(d.counters.earned / C.STARS_PER) - Math.floor((d.counters.earned - total) / C.STARS_PER); if (stars) sc.bridge.stars(stars);
      const lvl = sc.levelFor(d.xp); if (lvl > (d.level || 1)) { d.level = lvl; sc.bridge.sound('levelup'); U.float(sc, W / 2, 300, `${s('level')} ${lvl}!`, { fontSize: '26px', color: '#fde047' }); U.burst(sc, W / 2, 300, [0xfde047, 0xffffff, 0x86efac], 30, 300); if (lvl >= 5) sc.bridge.badge(); }
      sc.bridge.sound('buy'); U.float(sc, 270, 540, `+${total} 🪙`, { fontSize: '20px', color: '#fde047' });
      for (let i = 0; i < 12; i++) { const c = sc.add.circle(60 + Math.random() * 40, 560, 5, 0xfde047).setDepth(40); sc.tweens.add({ targets: c, x: 40, y: -20, duration: 500 + i * 40, ease: 'Quad.easeIn', onComplete: () => c.destroy() }); }
      sc.say(`${s('sold')} +${total} 🪙`); sc.refreshAll(); sc.bridge.save();
    }
    /* ---------- tick ---------- */
    tick() {
      const sc = this, d = sc.d, w = sc.weather(), n = sc.now();
      // watering + weather boosts accumulate as bonus ms
      d.plots.forEach((p, i) => { if (!p) return; const cell = sc.cells[i]; let extra = 0; if (w.mult > 1) extra += 250 * (w.mult - 1); if (cell.watering) { const minute = Math.floor(n / 60000); if (p.waterMin !== minute) { p.waterMin = minute; p.waterUsed = 0; } if (p.waterUsed < C.WATER_MAX) { p.waterUsed += 250; extra += 250 * (C.WATER_MULT - 1); if (Math.random() < .6) { const dr = sc.add.circle(cell.x + (Math.random() - .5) * 40, cell.y - 30, 3, 0x60a5fa).setDepth(30); sc.tweens.add({ targets: dr, y: cell.y, alpha: 0, duration: 400, onComplete: () => dr.destroy() }); } } } p.boost = (p.boost || 0) + extra; });
      // rings & ready state
      d.plots.forEach((p, i) => { const cell = sc.cells[i]; cell.ring.clear(); if (!p) return; const pr = sc.progress(p); if (pr >= 1) { if (!cell.readyShown) { cell.readyShown = true; sc.refreshCell(cell); sc.tweens.add({ targets: cell.plant, y: cell.y + 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); cell.label.setText(`✨ ${s('ready')}`); sc.bridge.sound('bell'); } if (Math.random() < .3) { const sp = sc.add.circle(cell.x + (Math.random() - .5) * 60, cell.y - 20 - Math.random() * 30, 2, 0xfef9c3).setDepth(30); sc.tweens.add({ targets: sp, alpha: 0, y: sp.y - 10, duration: 700, onComplete: () => sp.destroy() }); } }
        else { if (cell.readyShown) { cell.readyShown = false; sc.tweens.killTweensOf(cell.plant); cell.plant.y = cell.y + 10; } sc.refreshCell(cell); cell.ring.lineStyle(4, 0x14532d, .35); cell.ring.beginPath(); cell.ring.arc(cell.x + 38, cell.y - 26, 8, 0, Math.PI * 2); cell.ring.strokePath(); cell.ring.lineStyle(4, 0xfde047, 1); cell.ring.beginPath(); cell.ring.arc(cell.x + 38, cell.y - 26, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pr); cell.ring.strokePath(); } });
      // weather visuals
      sc.weatherTxt.setText(w.id === 'sun' ? `☀️ ${s('sun')}` : w.id === 'rain' ? `🌧️ ${s('rain')} ×${w.mult} · ${fmtT(w.left)}` : `🌫️ ${s('fog')} ✨×3 · ${fmtT(w.left)}`);
      sc.rainG.clear(); sc.fogG.clear();
      if (w.id === 'rain') { sc.rainG.lineStyle(2, 0x60a5fa, .7); for (let i = 0; i < 30; i++) { const x = Math.random() * W, y = Math.random() * 440; sc.rainG.lineBetween(x, y, x - 3, y + 10); } }
      if (w.id === 'fog') { sc.fogG.fillStyle(0xffffff, .22); sc.fogG.fillRect(0, 80, W, 360); }
      if (d.lastSeen < n - 5000) { d.lastSeen = n; sc.bridge.save(); }
      sc.bridge.hud();
      sc.bridge.weather(w);
    }
  }

  Games.register({
    id: 'garden', icon: '🌱', bg: '#dcfce7', partner: 'p1', tier: 'top', isNew: true, kicker: { de: 'Wächst auch offline', ru: 'Растёт даже офлайн' }, art: () => Art.topScene('garden'),
    name: { de: 'Waldgarten', ru: 'Лесной сад' },
    tagline: { de: 'Pflanze Samen, lass Bäume in Echtzeit wachsen, ernte goldene Mutationen und baue die Baumschule aus.', ru: 'Сажай семена, выращивай деревья в реальном времени, лови золотые мутации и расширяй питомник.' },
    mount(root, ctx) {
      const d = ctx.data;
      if (!d.plots) Object.assign(d, { coins: C.START, xp: 0, level: 1, plots: Array(12).fill(null), unlocked: 4, basket: [], counters: { earned: 0, trees: 0, mut: [] }, lastSeen: 0, adRainUntil: 0, adNext: 0 });
      root.innerHTML = `
        <div class="game-head">
          <span class="stat">🪙 <b id="gd-coins">0</b></span>
          <span class="stat">⭐ <b id="gd-lvl">1</b></span>
          <span class="stat">🌳 <b id="gd-trees">0</b></span>
          <button class="btn btn-ad btn-sm" id="gd-ad">🌧️ ${s('adrain')}</button>
        </div>
        <div class="progress" style="margin:-4px 0 8px"><i id="gd-xp" style="width:0%"></i></div>`;
      const ov = document.createElement('div'); ov.className = 'cv-overlay ph-overlay'; ov.innerHTML = `<b>${s('title')}</b><span>${s('hint')}</span><em>${s('go')}</em>`;
      const $ = id => root.querySelector('#' + id);
      const foot = document.createElement('p'); foot.className = 'small muted center'; foot.style.margin = '8px 0 0'; foot.textContent = s('hintTree');
      let scene;
      const bridge = {
        sound: (n, a) => ctx.sound(n, a), save: () => ctx.save(), stars: n => ctx.stars(n, true), badge: () => ctx.badge('garden'),
        hud() { $('gd-coins').textContent = d.coins; const lvl = scene ? scene.levelFor(d.xp) : 1; $('gd-lvl').textContent = lvl; $('gd-trees').textContent = d.counters.trees; const lo = LEVELS[lvl - 1] || 0, hi = LEVELS[lvl] || (lo * 1.6); $('gd-xp').style.width = Math.min(100, (d.xp - lo) / (hi - lo) * 100) + '%'; },
        weather(w) { const b = $('gd-ad'); const cd = d.adNext - Date.now(); b.disabled = w.id !== 'sun' || cd > 0; b.textContent = cd > 0 ? `🌧️ ${fmtT(cd)}` : `🌧️ ${s('adrain')} · ${t('watch_ad')}`; },
        welcome(away, n) { ctx.modal({ title: s('back'), html: `<div class="center" style="font-size:44px">🌱</div><p class="center">${s('away', { t: away })}<br><b>${s('readyN', { n })}</b></p>`, actions: [{ label: t('continue'), cls: 'btn-primary' }] }); }
      };
      const host = PhaserHost.mount(root, GardenScene, { bridge, data: { save: d }, physics: { default: 'arcade', arcade: { gravity: { y: 0 } } }, bg: '#bbf7d0' });
      const wrap = root.querySelector('.ph-wrap'); wrap.appendChild(ov); root.appendChild(foot);
      ov.addEventListener('pointerdown', () => ov.classList.add('hidden')); ov.style.pointerEvents = 'auto';
      $('gd-ad').addEventListener('click', async () => { const ok = await ctx.ad(); if (ok) { d.adRainUntil = Date.now() + C.AD_RAIN; d.adNext = Date.now() + C.AD_CD; ctx.save(); } });
      setTimeout(() => { scene = host.game.scene.getScene('main'); }, 50);
      return { destroy() { d.lastSeen = Date.now(); ctx.save(); host.destroy(); } };
    }
  });
})();
