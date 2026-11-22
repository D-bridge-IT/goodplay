// Pfotenfreunde: adopt surprise animals, pets follow you and dig up coin piles, nurse injured newcomers, fill the adoption book (Phaser 3).
(function () {
  const U = PhaserHost.U, W = 375, H = 600, WW = 750, WH = 900;
  const RAR = [{ id: 'common', de: 'Gewöhnlich', ru: 'Обычный', color: 0x94a3b8, pow: 1 }, { id: 'uncommon', de: 'Ungewöhnlich', ru: 'Необычный', color: 0x22c55e, pow: 1.6 }, { id: 'rare', de: 'Selten', ru: 'Редкий', color: 0x3b82f6, pow: 2.5 }, { id: 'epic', de: 'Episch', ru: 'Эпический', color: 0xa855f7, pow: 4 }, { id: 'legendary', de: 'Legendär', ru: 'Легендарный', color: 0xf59e0b, pow: 8 }, { id: 'mythic', de: 'Mythisch', ru: 'Мифический', color: 0xf43f5e, pow: 20 }];
  // 3 baskets × 9 species: [name de, name ru, rarity idx, body color, kind]
  const SPECIES = {
    hof: [['Maus', 'Мышь', 0, 0x9ca3af, 'round'], ['Hamster', 'Хомяк', 0, 0xf59e0b, 'round'], ['Meerschweinchen', 'Морская свинка', 0, 0xd97706, 'long'], ['Kaninchen', 'Кролик', 1, 0xf5f5f4, 'ears'], ['Huhn', 'Курица', 1, 0xfef3c7, 'bird'], ['Katze', 'Кошка', 2, 0x374151, 'ears'], ['Hund', 'Собака', 3, 0xb45309, 'long'], ['Igel', 'Ёж', 4, 0x78350f, 'spiky'], ['Schleiereule', 'Сипуха', 5, 0xfde68a, 'bird']],
    park: [['Taube', 'Голубь', 0, 0x9ca3af, 'bird'], ['Eichhörnchen', 'Белка', 0, 0xea580c, 'long'], ['Frosch', 'Лягушка', 0, 0x22c55e, 'round'], ['Ente', 'Утка', 1, 0x15803d, 'bird'], ['Schildkröte', 'Черепаха', 1, 0x65a30d, 'round'], ['Papagei', 'Попугай', 2, 0xef4444, 'bird'], ['Fuchs', 'Лиса', 3, 0xf97316, 'ears'], ['Schwan', 'Лебедь', 4, 0xffffff, 'bird'], ['Reh', 'Косуля', 5, 0xa16207, 'long']],
    wald: [['Käfer', 'Жук', 0, 0x1e293b, 'round'], ['Molch', 'Тритон', 0, 0xf59e0b, 'long'], ['Hase', 'Заяц', 0, 0xa8a29e, 'ears'], ['Dachs', 'Барсук', 1, 0x475569, 'long'], ['Waschbär', 'Енот', 1, 0x6b7280, 'ears'], ['Luchs', 'Рысь', 2, 0xd6d3d1, 'ears'], ['Wolf', 'Волк', 3, 0x64748b, 'ears'], ['Adler', 'Орёл', 4, 0x7c2d12, 'bird'], ['Waldgeist', 'Лесной дух', 5, 0x86efac, 'spirit']]
  };
  const BASKETS = [{ id: 'hof', de: 'Hof-Körbchen', ru: 'Дворовая корзинка', price: 100, unlock: 0, odds: [60, 25, 10, 4, .9, .1] }, { id: 'park', de: 'Park-Körbchen', ru: 'Парковая корзинка', price: 1500, unlock: 1500, odds: [45, 30, 16, 7, 1.8, .2] }, { id: 'wald', de: 'Wald-Körbchen', ru: 'Лесная корзинка', price: 12000, unlock: 20000, odds: [30, 32, 22, 11, 4.4, .6] }];
  const ZONES = [{ id: 'hof', de: 'Hof', ru: 'Двор', unlock: 0, hp: 10, coins: 12, color: 0xbef264, x: 0, y: 450, w: 750, h: 450 }, { id: 'park', de: 'Park', ru: 'Парк', unlock: 1500, hp: 50, coins: 65, color: 0x86efac, x: 0, y: 0, w: 375, h: 450 }, { id: 'wald', de: 'Wald', ru: 'Лес', unlock: 20000, hp: 250, coins: 350, color: 0x4ade80, x: 375, y: 0, w: 375, h: 450 }];
  const C = { SPEED: 140, SPACING: 18, RADIUS: 90, HIT: 0.5, MAXPET: 3, RESPAWN: [6, 8, 10], INJ: .25, SHINY: .02, OFFLINE: .1, OFFCAP: 4 * 3600e3 };
  const S = {
    de: { title: 'PFOTENFREUNDE', hint: 'Tippen = laufen · Tiere buddeln Münzen · am Tor neue Tiere adoptieren', go: 'Los!', gate: 'Tierheim-Tor', book: 'Buch', team: 'Team', vet: 'Tierarzt', open: 'Öffnen', tap3: 'Tippe 3× zum Öffnen', newpet: 'NEU!', dup: 'Schon im Buch · Herz +1', injured: 'verletzt', heal: 'Behandeln', step: ['Reinigen', 'Verbinden', 'Kuscheln'], healed: 'Gesund!', healedPlus: 'Perfekt gepflegt (+10 %)', again: 'Noch einmal', stray: 'Fundtier des Tages', offline: 'Deine Tiere haben {n} 🪙 gefunden', locked: 'Freischalten bei {n} 🪙 verdient', zone: 'Zone', adday: 'Tierheim-Tag', shiny: 'SHINY', power: 'Kraft', slot: 'Teamplatz', buy: 'Kaufen', tip: 'Jede Behandlung kostet ein echtes Tierheim Geld – Spenden helfen.' },
    ru: { title: 'ЛАПКИ', hint: 'Тап = идти · питомцы роют монеты · у ворот — новые животные', go: 'Погнали!', gate: 'Ворота приюта', book: 'Книга', team: 'Команда', vet: 'Ветеринар', open: 'Открыть', tap3: 'Тапни 3 раза, чтобы открыть', newpet: 'НОВЫЙ!', dup: 'Уже в книге · сердце +1', injured: 'ранен', heal: 'Лечить', step: ['Очистить', 'Перевязать', 'Обнять'], healed: 'Здоров!', healedPlus: 'Идеальный уход (+10 %)', again: 'Ещё раз', stray: 'Найдёныш дня', offline: 'Твои питомцы нашли {n} 🪙', locked: 'Откроется при {n} 🪙 заработанных', zone: 'Зона', adday: 'День приюта', shiny: 'СИЯЮЩИЙ', power: 'Сила', slot: 'Место в команде', buy: 'Купить', tip: 'Каждое лечение стоит настоящему приюту денег — пожертвования помогают.' }
  };
  const s = (k, v) => { let str = (S[LANG] || S.de)[k]; if (typeof str === 'string' && v) for (const kk in v) str = str.replace('{' + kk + '}', v[kk]); return str; };
  const nm = o => LANG === 'ru' ? o.ru : o.de;
  const spec = id => { const [b, i] = id.split(':'); const r = SPECIES[b][+i]; return { id, basket: b, de: r[0], ru: r[1], rar: r[2], color: r[3], kind: r[4] }; };
  const petPower = p => { const sp = spec(p.id); return RAR[sp.rar].pow * (p.shiny ? 1.5 : 1) * (1 + 0.1 * Math.min(5, p.heart || 0)) * (p.healed ? 1.1 : 1) * (p.injured ? 0.5 : 1); };
  const hex = c => '#' + c.toString(16).padStart(6, '0');

  function drawPet(g, sp, scale, shiny) {
    const k = scale || 1, col = shiny ? (0xffffff ^ sp.color) & 0xffffff : sp.color, dark = U.shade(col, -0.3);
    g.clear();
    if (sp.kind === 'spirit') { g.fillStyle(col, .85); g.fillCircle(0, -4 * k, 12 * k); g.fillStyle(0xffffff, .9); g.fillCircle(-4 * k, -6 * k, 2.5 * k); g.fillCircle(4 * k, -6 * k, 2.5 * k); g.fillStyle(col, .5); g.fillCircle(-10 * k, 4 * k, 4 * k); g.fillCircle(10 * k, 2 * k, 3 * k); return; }
    g.fillStyle(0x000000, .15); g.fillEllipse(0, 10 * k, 22 * k, 7 * k);
    if (sp.kind === 'bird') { g.fillStyle(col); g.fillEllipse(0, 0, 20 * k, 16 * k); g.fillCircle(7 * k, -9 * k, 7 * k); g.fillStyle(0xf59e0b); g.fillTriangle(13 * k, -9 * k, 19 * k, -7 * k, 13 * k, -5 * k); g.fillStyle(dark); g.fillEllipse(-4 * k, 0, 10 * k, 7 * k); }
    else { g.fillStyle(col); g.fillEllipse(0, 0, (sp.kind === 'long' ? 26 : 20) * k, 15 * k); g.fillCircle(9 * k, -8 * k, 8 * k); if (sp.kind === 'ears') { g.fillTriangle(4 * k, -14 * k, 7 * k, -24 * k, 11 * k, -14 * k); g.fillTriangle(11 * k, -14 * k, 14 * k, -24 * k, 17 * k, -14 * k); } if (sp.kind === 'spiky') { g.fillStyle(dark); for (let i = -8; i <= 4; i += 4) g.fillTriangle(i * k, -6 * k, (i + 2) * k, -16 * k, (i + 4) * k, -6 * k); } g.fillStyle(dark); g.fillRect(-9 * k, 4 * k, 4 * k, 6 * k); g.fillRect(3 * k, 4 * k, 4 * k, 6 * k); }
    g.fillStyle(0x1e293b); g.fillCircle(11 * k, -9 * k, 1.6 * k); if (shiny) { g.fillStyle(0xfef9c3); g.fillCircle(-6 * k, -12 * k, 2 * k); g.fillCircle(2 * k, -16 * k, 1.5 * k); }
  }

  class PetsScene extends Phaser.Scene {
    constructor() { super('main'); }
    init(data) { this.bridge = this.registry.get('bridge'); this.d = data.save; }
    create() {
      const sc = this, d = sc.d;
      sc.physics.world.setBounds(0, 0, WW, WH); sc.cameras.main.setBounds(0, 0, WW, WH);
      // zones
      ZONES.forEach(z => { const g = sc.add.graphics(); g.fillStyle(z.color); g.fillRect(z.x, z.y, z.w, z.h); g.lineStyle(4, 0x854d0e, .6); g.strokeRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4); for (let i = 0; i < 18; i++) { g.fillStyle(U.shade(z.color, -0.12), .6); g.fillCircle(z.x + (Math.sin(i * 7.1 + z.x) * .5 + .5) * z.w, z.y + (Math.cos(i * 3.7 + z.y) * .5 + .5) * z.h, 6 + (i % 4) * 3); } z.g = g; z.label = sc.add.text(z.x + z.w / 2, z.y + 18, nm(z), { fontFamily: 'system-ui', fontSize: '14px', fontStyle: 'bold', color: '#14532d' }).setOrigin(0.5).setAlpha(.7); z.lock = sc.add.text(z.x + z.w / 2, z.y + z.h / 2, `🔒\n${s('locked', { n: z.unlock })}`, { fontFamily: 'system-ui', fontSize: '14px', fontStyle: 'bold', color: '#fff', align: 'center', stroke: '#14532d', strokeThickness: 4 }).setOrigin(0.5).setDepth(30); });
      // trees in forest, pond in park
      for (let i = 0; i < 9; i++) { const x = 400 + (i % 3) * 120 + (i % 2) * 30, y = 60 + Math.floor(i / 3) * 130; sc.add.circle(x, y, 26, 0x15803d).setDepth(y); sc.add.rectangle(x, y + 24, 8, 16, 0x78350f).setDepth(y + 1); }
      sc.add.ellipse(190, 230, 160, 100, 0x7dd3fc).setDepth(1); sc.add.ellipse(190, 230, 130, 76, 0xbae6fd).setDepth(2);
      // buildings: gate (yard bottom-left), vet hut (yard right), book sign
      sc.gate = sc.buildSpot(120, 820, 0x92400e, '🏠', s('gate')); sc.vet = sc.buildSpot(620, 820, 0xf8fafc, '🩺', s('vet')); sc.bookSpot = sc.buildSpot(375, 870, 0x4f46e5, '📖', s('book'));
      // player
      sc.player = U.avatar(sc, 375, 650, { torso: 0xf472b6 }); sc.player.setDepth(650); sc.physics.add.existing(sc.player); sc.player.body.setSize(24, 40).setOffset(-12, -17).setCollideWorldBounds(true);
      sc.cameras.main.startFollow(sc.player, true, 0.1, 0.1);
      sc.target = null; sc.dragging = false;
      sc.input.on('pointerdown', p => { if (sc.uiLock) return; sc.target = { x: p.worldX, y: p.worldY }; sc.dragging = true; sc.dragT = sc.time.now; sc.bridge.sound('tap'); const m = sc.add.circle(p.worldX, p.worldY, 10, 0xffffff, .6).setDepth(5); sc.tweens.add({ targets: m, scale: 2, alpha: 0, duration: 400, onComplete: () => m.destroy() }); });
      sc.input.on('pointermove', p => { if (sc.dragging && p.isDown) sc.target = { x: p.worldX, y: p.worldY }; });
      sc.input.on('pointerup', () => { sc.dragging = false; });
      // piles
      sc.piles = []; ZONES.forEach((z, zi) => { for (let i = 0; i < 6; i++) sc.spawnPile(zi, i); });
      sc.pets = []; sc.rebuildTeam();
      sc.coinsFx = []; sc.cpmWindow = [];
      sc.applyOffline();
      sc.checkStray();
      sc.bridge.hud();
    }
    buildSpot(x, y, color, emoji, label) { const sc = this; const g = sc.add.graphics().setDepth(y - 30); g.fillStyle(U.shade(color, -0.35)); g.fillRoundedRect(x - 40, y - 26 + 6, 80, 52, 10); g.fillStyle(color); g.fillRoundedRect(x - 40, y - 32, 80, 52, 10); const t = sc.add.text(x, y - 10, emoji, { fontSize: '28px' }).setOrigin(0.5).setDepth(y - 29); const l = sc.add.text(x, y + 30, label, { fontFamily: 'system-ui', fontSize: '12px', fontStyle: 'bold', color: '#1e293b', backgroundColor: '#ffffffcc', padding: { x: 6, y: 2 } }).setOrigin(0.5).setDepth(y + 40); return { x, y, g, t, l }; }
    spawnPile(zi, slot) {
      const sc = this, z = ZONES[zi], d = sc.d; d.pileCount = (d.pileCount || 0) + 1; const treasure = d.pileCount % 20 === 0;
      const x = z.x + 60 + ((slot * 97 + zi * 31) % (z.w - 120)), y = z.y + 70 + ((slot * 151 + zi * 47) % (z.h - 160));
      const hp = z.hp * (treasure ? 5 : 1), coins = z.coins * (treasure ? 8 : 1);
      const g = sc.add.graphics().setDepth(y); const p = { zi, slot, x, y, hp, maxHp: hp, coins, g, treasure, alive: true, bar: sc.add.graphics().setDepth(y + 1) };
      sc.drawPile(p); sc.piles.push(p); return p;
    }
    drawPile(p) { const g = p.g, k = 0.8 + p.zi * 0.25; g.clear(); const col = p.treasure ? 0xfbbf24 : 0xf59e0b; g.fillStyle(0x000000, .15); g.fillEllipse(p.x, p.y + 8 * k, 44 * k, 14 * k); const frac = p.hp / p.maxHp; for (let i = 0; i < 3; i++) { if (frac < (3 - i) / 3 - 0.001 && i < 2) continue; g.fillStyle(U.shade(col, -0.2 + i * 0.15)); g.fillEllipse(p.x, p.y - i * 7 * k, (36 - i * 8) * k, 14 * k); } if (p.treasure) { g.fillStyle(0x7c2d12); g.fillRect(p.x - 14 * k, p.y - 26 * k, 28 * k, 6 * k); } }
    rebuildTeam() {
      const sc = this, d = sc.d; sc.pets.forEach(p => p.g.destroy()); sc.pets = [];
      const slots = d.slots || 3; const sorted = d.pets.slice().sort((a, b) => petPower(b) - petPower(a)).slice(0, slots); d.team = sorted.map(p => p.uid);
      sorted.forEach((p, i) => { const sp = spec(p.id); const g = sc.add.graphics(); drawPet(g, sp, 1, p.shiny); g.setPosition(sc.player.x - 20 * (i + 1), sc.player.y); g.setDepth(sc.player.y); const bandage = p.injured ? sc.add.text(0, 0, '🩹', { fontSize: '12px' }).setOrigin(0.5).setDepth(2000) : null; sc.pets.push({ data: p, sp, g, bandage, hopT: Math.random() * 6, trailIdx: (i + 1) * C.SPACING, attackT: 0, target: null }); });
      sc.trail = sc.trail || [];
      sc.bridge.hud();
    }
    teamPower() { return this.pets.reduce((a, p) => a + petPower(p.data), 0); }
    /* ---------- economy ---------- */
    addCoins(n, x, y) { const sc = this, d = sc.d; d.coins += n; d.earned += n; sc.cpmWindow.push([sc.time.now, n]); sc.bridge.hud(); sc.checkUnlocks(); for (let i = 0; i < Math.min(6, Math.ceil(n / 10)); i++) { const c = sc.add.circle(x + (Math.random() - .5) * 20, y, 6, 0xfde047).setDepth(3000).setStrokeStyle(2, 0xf59e0b); const cam = sc.cameras.main; sc.tweens.add({ targets: c, x: cam.scrollX + 40, y: cam.scrollY + 20, duration: 500 + i * 60, ease: 'Quad.easeIn', onComplete: () => c.destroy() }); } sc.comboN = (sc.lastCoinT && sc.time.now - sc.lastCoinT < 1000) ? (sc.comboN || 0) + 1 : 1; sc.lastCoinT = sc.time.now; sc.bridge.sound('coin', sc.comboN); U.float(sc, x, y - 20, `+${n} 🪙`, { fontSize: '14px', color: '#fde047' }); }
    checkUnlocks() { const sc = this, d = sc.d; ZONES.forEach((z, i) => { if (d.earned >= z.unlock && !d.zones.includes(z.id)) { d.zones.push(z.id); z.lock.setVisible(false); sc.bridge.sound('levelup'); sc.bridge.stars(1); U.float(sc, sc.player.x, sc.player.y - 50, `${s('zone')} ${nm(z)} ✓`, { fontSize: '20px', color: '#fde047' }); } }); ZONES.forEach(z => z.lock.setVisible(!d.zones.includes(z.id))); if (d.earned >= 3000 && (d.slots || 3) < 4) { d.slots = 4; sc.rebuildTeam(); } if (d.earned >= 25000 && d.slots < 5) { d.slots = 5; sc.rebuildTeam(); } }
    applyOffline() { const sc = this, d = sc.d, n = Date.now(); if (d.lastSeen && d.cpm > 0) { const el = Math.min(Math.max(0, n - d.lastSeen), C.OFFCAP); const got = Math.floor(el / 60000 * d.cpm * C.OFFLINE); if (got > 0 && el > 60e3) { d.coins += got; d.earned += got; sc.bridge.toast(s('offline', { n: got })); } } d.lastSeen = n; }
    checkStray() { const d = this.d, today = new Date().toISOString().slice(0, 10); if (d.strayDate !== today) { d.strayDate = today; d.strayWaiting = true; } this.gate.l.setText(d.strayWaiting ? `${s('gate')} · 🐾!` : s('gate')); }
    rollRarity(odds) { let r = Math.random() * 100; for (let i = 0; i < odds.length; i++) { if (r < odds[i]) return i; r -= odds[i]; } return 0; }
    adopt(basketId, forcedRar) {
      const sc = this, d = sc.d, b = BASKETS.find(x => x.id === basketId); const rar = forcedRar == null ? sc.rollRarity(b.odds) : forcedRar;
      const pool = SPECIES[basketId].map((x, i) => i).filter(i => SPECIES[basketId][i][2] === rar); const idx = pool[Math.floor(Math.random() * pool.length)];
      const id = `${basketId}:${idx}`, shiny = Math.random() < C.SHINY, injured = rar <= 1 && Math.random() < C.INJ;
      const existing = d.pets.find(p => p.id === id && !!p.shiny === shiny); let pet, isNew = false;
      if (existing) { if ((existing.heart || 0) < 5) existing.heart = (existing.heart || 0) + 1; else d.coins += 50; pet = existing; }
      else { pet = { uid: Date.now() + '' + Math.floor(Math.random() * 1e4), id, shiny, heart: 0, injured, healed: false }; d.pets.push(pet); isNew = true; const key = id + (shiny ? '*' : ''); if (!d.seen.includes(key)) { d.seen.push(key); sc.bridge.stars(1 + (rar === 4 ? 2 : rar === 5 ? 5 : 0)); } }
      if (d.seen.length >= 9) sc.bridge.badge();
      sc.rebuildTeam(); sc.bridge.save();
      return { pet, sp: spec(id), isNew, rar, shiny, injured };
    }
    /* ---------- update ---------- */
    update(time, delta) {
      const sc = this, dt = Math.min(delta, 50) / 1000, pl = sc.player, d = sc.d;
      // movement
      if (sc.target) { const dx = sc.target.x - pl.x, dy = sc.target.y - pl.y, dist = Math.hypot(dx, dy); if (dist > 6) { pl.body.setVelocity(dx / dist * C.SPEED, dy / dist * C.SPEED); pl.run(dt, 1); pl.setScale(dx < 0 ? -1 : 1, 1); } else { pl.body.setVelocity(0, 0); pl.idle(); if (!sc.dragging) sc.target = null; } } else { pl.body.setVelocity(0, 0); pl.idle(); }
      // zone lock: push back if entering a locked zone
      const z = ZONES.find(z => pl.x >= z.x && pl.x < z.x + z.w && pl.y >= z.y && pl.y < z.y + z.h); if (z && !d.zones.includes(z.id)) { pl.y = Math.max(pl.y, 452); if (pl.y < 455) { pl.body.setVelocity(0, 0); sc.target = null; sc.bridge.sound('bad'); } }
      pl.setDepth(pl.y);
      // trail & pets follow
      if (!sc.lastTrail || Math.hypot(pl.x - sc.lastTrail.x, pl.y - sc.lastTrail.y) > 4) { sc.trail.unshift({ x: pl.x, y: pl.y }); sc.lastTrail = { x: pl.x, y: pl.y }; if (sc.trail.length > 120) sc.trail.length = 120; }
      sc.pets.forEach((p, i) => { const node = sc.trail[Math.min(sc.trail.length - 1, Math.floor((i + 1) * C.SPACING / 4))] || { x: pl.x - 20 * (i + 1), y: pl.y }; p.hopT += dt * 9; const hop = Math.abs(Math.sin(p.hopT)) * 4; if (!p.target) { p.g.x += (node.x - p.g.x) * Math.min(1, dt * 8); p.g.y += (node.y - p.g.y) * Math.min(1, dt * 8) - 0; } p.g.setDepth(p.g.y); p.g.y -= 0; if (p.bandage) p.bandage.setPosition(p.g.x + 8, p.g.y - 16); p.g.setScale(pl.scaleX < 0 ? -1 : 1, 1 - hop / 40); });
      // piles: pets attack within radius
      const near = sc.piles.filter(p => p.alive && Math.hypot(p.x - pl.x, p.y - pl.y) < C.RADIUS).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y));
      const counts = new Map();
      sc.pets.forEach(p => { p.attackT += dt; let tgt = near.find(q => (counts.get(q) || 0) < C.MAXPET); if (tgt) { counts.set(tgt, (counts.get(tgt) || 0) + 1); p.target = tgt; const ang = Math.atan2(tgt.y - p.g.y, tgt.x - p.g.x); const gx = tgt.x - Math.cos(ang) * 22, gy = tgt.y - Math.sin(ang) * 22; p.g.x += (gx - p.g.x) * Math.min(1, dt * 6); p.g.y += (gy - p.g.y) * Math.min(1, dt * 6); if (p.attackT >= C.HIT) { p.attackT = 0; sc.hitPile(tgt, petPower(p.data) * C.HIT, p.g); } } else p.target = null; });
      // player alone: 1 DPS when adjacent
      if (near[0] && Math.hypot(near[0].x - pl.x, near[0].y - pl.y) < 40) { sc.selfT = (sc.selfT || 0) + dt; if (sc.selfT >= 0.5) { sc.selfT = 0; sc.hitPile(near[0], 0.5, pl); } }
      // spots
      const spot = [['gate', sc.gate], ['vet', sc.vet], ['book', sc.bookSpot]].find(([, sp]) => Math.hypot(sp.x - pl.x, sp.y - pl.y) < 46);
      if (spot && !sc.uiLock && (!sc.lastSpot || sc.lastSpot !== spot[0] || time - sc.spotT > 1500)) { sc.lastSpot = spot[0]; sc.spotT = time; sc.target = null; pl.body.setVelocity(0, 0); sc.bridge.open(spot[0]); }
      if (!spot) sc.lastSpot = null;
      // cpm
      sc.cpmWindow = sc.cpmWindow.filter(([t]) => time - t < 180000); d.cpm = sc.cpmWindow.reduce((a, [, n]) => a + n, 0) / 3;
      if (Math.floor(time / 5000) !== Math.floor((time - delta) / 5000)) { d.lastSeen = Date.now(); sc.bridge.save(); }
    }
    hitPile(p, dmg, from) {
      const sc = this; if (!p.alive) return; p.hp -= dmg; sc.drawPile(p); sc.tweens.add({ targets: from, angle: from.angle + 10, duration: 60, yoyo: true }); if (Math.random() < .5) sc.bridge.sound('step'); U.burst(sc, p.x, p.y - 6, [0xf59e0b, 0xfde68a], 3, 90, { size: .6, lift: 30 });
      p.bar.clear(); p.bar.fillStyle(0x1e293b, .4); p.bar.fillRect(p.x - 16, p.y - 30, 32, 4); p.bar.fillStyle(0xfde047); p.bar.fillRect(p.x - 16, p.y - 30, 32 * Math.max(0, p.hp / p.maxHp), 4);
      if (p.hp <= 0) { p.alive = false; p.g.clear(); p.bar.clear(); sc.bridge.sound(p.treasure ? 'rare' : 'pop'); U.burst(sc, p.x, p.y, [0xfde047, 0xf59e0b, 0xffffff], p.treasure ? 30 : 12, 240, { circle: true }); sc.addCoins(p.coins, p.x, p.y); const zi = p.zi, slot = p.slot; sc.piles = sc.piles.filter(q => q !== p); p.g.destroy(); p.bar.destroy(); sc.time.delayedCall(C.RESPAWN[zi] * 1000, () => sc.spawnPile(zi, slot)); }
    }
  }

  Games.register({
    id: 'pets', icon: '🐾', bg: '#fce7f3', partner: 'p2', tier: 'top', isNew: true, kicker: { de: '27 Tiere sammeln', ru: 'Собери 27 животных' }, art: () => Art.topScene('pets'),
    name: { de: 'Pfotenfreunde', ru: 'Лапки' },
    tagline: { de: 'Adoptiere Überraschungstiere, lass sie Münzen buddeln, pflege verletzte Neuankömmlinge und fülle das Adoptionsbuch.', ru: 'Усыновляй животных-сюрпризов, пусть роют монеты, лечи раненых новичков и заполняй книгу усыновлений.' },
    mount(root, ctx) {
      const d = ctx.data;
      if (!d.pets) Object.assign(d, { coins: 0, earned: 0, pets: [], team: [], seen: [], zones: ['hof'], slots: 3, treatments: 0, strayDate: '', strayWaiting: false, adDate: '', cpm: 0, lastSeen: 0, freeBasket: true });
      root.innerHTML = `
        <div class="game-head">
          <span class="stat">🪙 <b id="pt-coins">0</b></span>
          <span class="stat">📖 <b id="pt-book">0</b>/27</span>
          <span class="stat">💪 <b id="pt-pow">0</b></span>
          <button class="btn btn-outline btn-sm" id="pt-team">🐾 ${s('team')}</button>
        </div>`;
      const ov = document.createElement('div'); ov.className = 'cv-overlay ph-overlay'; ov.innerHTML = `<b>${s('title')}</b><span>${s('hint')}</span><em>${s('go')}</em>`;
      const $ = id => root.querySelector('#' + id);
      let scene;
      const petCard = (p, big) => { const sp = spec(p.id); return `<div class="pet-card ${big ? 'big' : ''}" style="--c:${hex(RAR[sp.rar].color)}"><div class="pet-ico">${petSvg(sp, p.shiny)}</div><b>${nm(sp)}</b><small>${nm(RAR[sp.rar])}${p.shiny ? ' · ✨' + s('shiny') : ''}${p.injured ? ' · 🩹 ' + s('injured') : ''}</small><small>❤️ ${p.heart || 0} · ${s('power')} ${petPower(p).toFixed(1)}</small></div>`; };
      const petSvg = (sp, shiny) => { const col = shiny ? hex((0xffffff ^ sp.color) & 0xffffff) : hex(sp.color), dark = hex(U.shade(shiny ? (0xffffff ^ sp.color) & 0xffffff : sp.color, -0.3)); if (sp.kind === 'spirit') return `<svg viewBox="-20 -30 40 40"><circle cx="0" cy="-4" r="12" fill="${col}" opacity=".85"/><circle cx="-4" cy="-6" r="2.5" fill="#fff"/><circle cx="4" cy="-6" r="2.5" fill="#fff"/></svg>`; const body = sp.kind === 'bird' ? `<ellipse cx="0" cy="0" rx="10" ry="8" fill="${col}"/><circle cx="7" cy="-9" r="7" fill="${col}"/><path d="M13 -9 l6 2 l-6 2z" fill="#f59e0b"/>` : `<ellipse cx="0" cy="0" rx="${sp.kind === 'long' ? 13 : 10}" ry="7.5" fill="${col}"/><circle cx="9" cy="-8" r="8" fill="${col}"/>${sp.kind === 'ears' ? `<path d="M4 -14 l3 -10 l4 10z M11 -14 l3 -10 l3 10z" fill="${col}"/>` : ''}${sp.kind === 'spiky' ? `<path d="M-8 -6 l2 -10 l2 10z M-4 -6 l2 -10 l2 10z M0 -6 l2 -10 l2 10z" fill="${dark}"/>` : ''}<rect x="-9" y="4" width="4" height="6" fill="${dark}"/><rect x="3" y="4" width="4" height="6" fill="${dark}"/>`; return `<svg viewBox="-20 -30 44 44">${body}<circle cx="11" cy="-9" r="1.6" fill="#1e293b"/></svg>`; };
      function openGate() {
        scene.uiLock = true;
        const canAd = d.adDate !== new Date().toISOString().slice(0, 10);
        const html = `<p class="small muted" style="margin:0 0 8px">${s('tip')}</p><div class="basket-list">${BASKETS.map(b => { const locked = d.earned < b.unlock; return `<button class="basket ${locked ? 'locked' : ''}" data-b="${b.id}" ${locked ? 'disabled' : ''}><span class="ico">🧺</span><b>${nm(b)}</b><small>${locked ? s('locked', { n: b.unlock }) : '🪙 ' + (d.freeBasket && b.id === 'hof' ? '0 (frei)' : b.price)}</small><small class="odds">${b.odds.map((o, i) => `<i style="color:${hex(RAR[i].color)}">${o}%</i>`).join(' ')}</small></button>`; }).join('')}</div>
          ${d.strayWaiting ? `<button class="btn btn-amber btn-block mt" id="pt-stray">🐾 ${s('stray')} · ${s('heal')}</button>` : ''}
          ${canAd ? `<button class="btn btn-ad btn-block mt" id="pt-adday">📺 ${s('adday')} · ${t('watch_ad')}</button>` : ''}`;
        const m = ctx.modal({ title: s('gate'), html, actions: [{ label: t('cancel'), cls: 'btn-ghost', onClick: () => { scene.uiLock = false; } }] });
        m.box.querySelectorAll('.basket:not(.locked)').forEach(b => b.addEventListener('click', () => { const bk = BASKETS.find(x => x.id === b.dataset.b); const free = d.freeBasket && bk.id === 'hof'; if (!free && d.coins < bk.price) { ctx.sound('bad'); FX.shake(b); return; } if (free) d.freeBasket = false; else d.coins -= bk.price; m.close(); reveal(bk.id); }));
        const st = m.box.querySelector('#pt-stray'); if (st) st.addEventListener('click', () => { m.close(); d.strayWaiting = false; scene.checkStray(); const r = scene.adopt('hof', scene.rollRarity([70, 25, 5, 0, 0, 0])); r.pet.injured = true; scene.rebuildTeam(); vet(r.pet, true); });
        const ad = m.box.querySelector('#pt-adday'); if (ad) ad.addEventListener('click', async () => { m.close(); const ok = await ctx.ad(); if (ok) { d.adDate = new Date().toISOString().slice(0, 10); reveal(d.earned >= 1500 ? 'park' : 'hof'); } else scene.uiLock = false; });
      }
      function reveal(basketId) {
        let taps = 0; const bk = BASKETS.find(x => x.id === basketId);
        const m = ctx.modal({ title: nm(bk), dismissible: false, html: `<div class="egg-stage"><div class="egg" id="pt-egg">🧺</div><p class="small muted center" id="pt-eggtxt">${s('tap3')}</p></div>`, actions: [] });
        const egg = m.box.querySelector('#pt-egg');
        egg.addEventListener('click', () => {
          taps++; ctx.sound('crack', taps); egg.style.animation = 'none'; void egg.offsetWidth; egg.style.animation = `eggShake .3s ease ${taps === 3 ? '' : ''}`; egg.style.setProperty('--amp', (taps * 3) + 'px');
          if (taps < 3) return;
          const r = scene.adopt(basketId); const rar = RAR[r.rar];
          setTimeout(() => {
            m.close(); ctx.sound(r.rar >= 4 ? 'fanfare' : r.rar >= 2 ? 'rare' : 'hatch');
            if (r.rar >= 2) FX.confetti();
            const m2 = ctx.modal({ title: r.isNew ? `${s('newpet')} ${nm(r.sp)}` : nm(r.sp), dismissible: false, html: `<div class="reveal" style="--c:${hex(rar.color)}">${petCard(r.pet, true)}<p class="center small" style="margin:8px 0 0">${r.isNew ? '' : s('dup')}</p></div>`, actions: [{ label: r.pet.injured ? `🩹 ${s('heal')}` : t('continue'), cls: 'btn-primary', onClick: () => { if (r.pet.injured) vet(r.pet); else scene.uiLock = false; } }] });
            FX.burstAt(m2.box, { type: 'confetti', count: r.rar >= 4 ? 60 : 20 });
          }, 350);
        });
      }
      function vet(pet, fromStray) {
        scene.uiLock = true; let step = 0, hits = 0, pos = 0, dir = 1, raf;
        const m = ctx.modal({ title: `🩺 ${s('vet')} · ${nm(spec(pet.id))}`, dismissible: false, html: `<div class="vet"><div class="vet-pet">${petSvg(spec(pet.id), pet.shiny)}</div><p class="center"><b id="vt-step">${s('step')[0]}</b> · ${hits}/3</p><div class="vet-bar" id="vt-bar"><div class="vet-zone"></div><div class="vet-marker" id="vt-m"></div></div><button class="btn btn-indigo btn-block mt" id="vt-tap">${s('heal')}</button><p class="small muted center" style="margin:8px 0 0">${s('tip')}</p></div>`, actions: [] });
        const mk = m.box.querySelector('#vt-m'), stepEl = m.box.querySelector('#vt-step');
        let last = performance.now(); const loop = now => { const dt = (now - last) / 1000; last = now; pos += dir * dt / 0.6; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } mk.style.left = (pos * 100) + '%'; raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
        m.box.querySelector('#vt-tap').addEventListener('click', () => {
          const ok = Math.abs(pos - 0.5) <= 0.15; ctx.sound(ok ? 'ok' : 'bad'); if (ok) { hits++; FX.burstAt(mk, { type: 'hearts', count: 8 }); } else FX.shake(m.box.querySelector('#vt-bar'));
          step++; if (step < 3) { stepEl.textContent = `${s('step')[step]}`; stepEl.nextSibling.textContent = ` · ${hits}/3`; return; }
          cancelAnimationFrame(raf); m.close();
          if (hits >= 2) { pet.injured = false; if (hits === 3) pet.healed = true; d.treatments++; if (d.treatments % 10 === 0) ctx.stars(1); ctx.sound('win'); FX.confetti(); ctx.toast(hits === 3 ? s('healedPlus') : s('healed'), 'good'); scene.rebuildTeam(); ctx.save(); scene.uiLock = false; }
          else { ctx.modal({ title: s('vet'), html: `<p class="center">${hits}/3</p>`, actions: [{ label: s('again'), cls: 'btn-primary', onClick: () => vet(pet) }] }); }
        });
      }
      function openBook() {
        scene.uiLock = true;
        const html = Object.keys(SPECIES).map(b => `<h4 style="margin:10px 0 6px">${nm(BASKETS.find(x => x.id === b))}</h4><div class="book-grid">${SPECIES[b].map((_, i) => { const id = `${b}:${i}`, sp = spec(id), have = d.pets.find(p => p.id === id); return `<div class="book-cell ${have ? '' : 'unknown'}" style="--c:${hex(RAR[sp.rar].color)}"><div class="pet-ico">${petSvg(sp, have && have.shiny)}</div><small>${have ? nm(sp) : '???'}</small>${have && have.shiny ? '<i>✨</i>' : ''}</div>`; }).join('')}</div>`).join('');
        ctx.modal({ title: `📖 ${s('book')} ${d.seen.filter(k => !k.endsWith('*')).length}/27`, html: `<div class="book">${html}</div>`, actions: [{ label: t('continue'), cls: 'btn-primary', onClick: () => { scene.uiLock = false; } }] });
      }
      function openTeam() { scene.uiLock = true; const list = d.pets.slice().sort((a, b) => petPower(b) - petPower(a)); ctx.modal({ title: `🐾 ${s('team')} (${Math.min(list.length, d.slots || 3)}/${d.slots || 3})`, html: `<div class="pet-list">${list.map((p, i) => `<div class="${i < (d.slots || 3) ? 'in-team' : 'bench'}">${petCard(p)}</div>`).join('') || '<p class="center muted">–</p>'}</div>`, actions: [{ label: t('continue'), cls: 'btn-primary', onClick: () => { scene.uiLock = false; } }] }); }
      const bridge = {
        sound: (n, a) => ctx.sound(n, a), save: () => ctx.save(), stars: n => ctx.stars(n, true), badge: () => ctx.badge('pets'), toast: m => ctx.toast(m, 'good'),
        hud() { $('pt-coins').textContent = d.coins; $('pt-book').textContent = d.seen.filter(k => !k.endsWith('*')).length; $('pt-pow').textContent = scene ? scene.teamPower().toFixed(1) : '0'; },
        open(which) { if (!scene) return; ctx.sound('open'); if (which === 'gate') openGate(); else if (which === 'vet') { const inj = d.pets.find(p => p.injured); if (inj) vet(inj); else { ctx.toast(`🩺 ${s('healed')}`); } } else openBook(); }
      };
      const host = PhaserHost.mount(root, PetsScene, { bridge, data: { save: d }, physics: { default: 'arcade', arcade: { gravity: { y: 0 } } }, bg: '#bef264' });
      root.querySelector('.ph-wrap').appendChild(ov); ov.style.pointerEvents = 'auto'; ov.addEventListener('pointerdown', () => ov.classList.add('hidden'));
      $('pt-team').addEventListener('click', () => openTeam());
      setTimeout(() => { scene = host.game.scene.getScene('main'); bridge.hud(); }, 50);
      return { destroy() { d.lastSeen = Date.now(); ctx.save(); host.destroy(); } };
    }
  });
})();
