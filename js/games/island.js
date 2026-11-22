// Inselalarm: survive rounds of disasters on a tiny island; learn a safety tip between rounds (Phaser 3).
(function () {
  const U = PhaserHost.U, W = 375, H = 600, PH = 520; // play area 0–520, card area below
  const ISLE = { cx: 187, cy: 290, rx: 150, ry: 200 }, HILL = { x: 120, y: 210, r: 50 }, HUT = { x: 250, y: 240, w: 60, h: 50 }, WELL = { x: 190, y: 360, r: 12 }, FIRE = { x: 275, y: 310 };
  const TREES = [[80, 330], [140, 420], [250, 430], [300, 150], [120, 120], [230, 110], [60, 230]];
  const DIS = ['flood', 'tornado', 'debris', 'quake', 'blizzard', 'fire', 'heat', 'lightning'];
  const INFO = {
    flood: { de: 'Flut', ru: 'Наводнение', icon: '🌊', hint: { de: '→ Hügel oder Hütte!', ru: '→ На холм или в хижину!' } },
    tornado: { de: 'Tornado', ru: 'Торнадо', icon: '🌪️', hint: { de: '→ In die Hütte!', ru: '→ В хижину!' } },
    debris: { de: 'Trümmerregen', ru: 'Град обломков', icon: '☄️', hint: { de: '→ Schatten meiden!', ru: '→ Избегай теней!' } },
    quake: { de: 'Erdbeben', ru: 'Землетрясение', icon: '🌍', hint: { de: '→ Freie Fläche, weg von Bäumen!', ru: '→ Открытое место, подальше от деревьев!' } },
    blizzard: { de: 'Schneesturm', ru: 'Метель', icon: '❄️', hint: { de: '→ Hütte oder Lagerfeuer!', ru: '→ Хижина или костёр!' } },
    fire: { de: 'Feuer', ru: 'Пожар', icon: '🔥', hint: { de: '→ Zum Strand!', ru: '→ На пляж!' } },
    heat: { de: 'Hitzewelle', ru: 'Жара', icon: '🥵', hint: { de: '→ Schatten & Brunnen!', ru: '→ Тень и колодец!' } },
    lightning: { de: 'Gewitter', ru: 'Гроза', icon: '⚡', hint: { de: '→ Weg von Bäumen und Hügel!', ru: '→ Подальше от деревьев и холма!' } }
  };
  const TIPS = {
    flood: [{ de: 'Bei Hochwasser höher gelegene Orte aufsuchen. Nie durch fließendes Wasser gehen oder fahren.', ru: 'При наводнении поднимайтесь выше. Никогда не идите и не езжайте через текущую воду.' }, { q: { de: 'Hochwasser: Schnell mit dem Auto durch die überflutete Straße?', ru: 'Наводнение: быстро проехать на машине по затопленной улице?' }, a: false }],
    tornado: [{ de: 'Bei Sturm drinnen bleiben, weg von Fenstern. Nicht unter Bäumen oder Gerüsten warten.', ru: 'В шторм оставайтесь внутри, подальше от окон. Не стойте под деревьями и лесами.' }, { q: { de: 'Sturm: Unter einem großen Baum Schutz suchen?', ru: 'Шторм: укрыться под большим деревом?' }, a: false }],
    debris: [{ de: 'Kopf schützen, stabilen Unterschlupf suchen, Abstand zu Glas halten.', ru: 'Защитите голову, найдите прочное укрытие, держитесь подальше от стекла.' }, { q: { de: 'Hagel: Den Kopf mit Armen oder Tasche schützen?', ru: 'Град: защитить голову руками или сумкой?' }, a: true }],
    quake: [{ de: 'Drinnen: runter, unter einen Tisch, festhalten. Draußen: freie Fläche, weg von Gebäuden und Bäumen.', ru: 'В помещении: пригнуться, под стол, держаться. На улице: открытое место, подальше от зданий и деревьев.' }, { q: { de: 'Erdbeben draußen: Schnell ins nächste Haus laufen?', ru: 'Землетрясение на улице: бежать в ближайший дом?' }, a: false }],
    blizzard: [{ de: 'Mehrere Schichten tragen, trocken bleiben. Zittern und Verwirrtheit sind Warnzeichen für Unterkühlung.', ru: 'Несколько слоёв одежды, оставаться сухим. Дрожь и спутанность — признаки переохлаждения.' }, { q: { de: 'Kälte: Zittern ist ein Warnzeichen für Unterkühlung?', ru: 'Холод: дрожь — признак переохлаждения?' }, a: true }],
    fire: [{ de: 'Raus, unter dem Rauch bleiben, Türen schließen, 112 rufen. Nie zurückgehen.', ru: 'Выходите, держитесь ниже дыма, закрывайте двери, звоните 112. Никогда не возвращайтесь.' }, { q: { de: 'Brand: Noch einmal zurück, um das Handy zu holen?', ru: 'Пожар: вернуться за телефоном?' }, a: false }],
    heat: [{ de: 'Regelmäßig Wasser trinken, Schatten suchen, Mittagssonne meiden. Ältere Menschen checken.', ru: 'Регулярно пейте воду, ищите тень, избегайте полуденного солнца. Проверяйте пожилых.' }, { q: { de: 'Hitze: Erst trinken, wenn man Durst hat?', ru: 'Жара: пить только когда захочется?' }, a: false }],
    lightning: [{ de: 'Nie unter einzelne Bäume, weg von Hügelkuppen. Hocken, nicht liegen. 30 Minuten nach dem letzten Donner warten.', ru: 'Никогда не стойте под одиночными деревьями, уходите с вершин. Присядьте, не ложитесь. Ждите 30 минут после грома.' }, { q: { de: 'Gewitter: Flach auf den Boden legen?', ru: 'Гроза: лечь плашмя на землю?' }, a: false }]
  };
  const S = {
    de: { title: 'INSELALARM', hint: 'Finger ziehen = laufen · Warnung lesen · richtigen Ort finden', go: 'Start!', round: 'Runde', streak: 'Serie', survived: 'ÜBERLEBT', over: 'Run vorbei', best: 'Rekord', again: 'Nochmal', tip: 'Sicherheitstipp', quiz: 'Quiz', yes: 'Richtig', no: 'Falsch', heart: '+1 ❤️', wrong: 'Leider falsch', kit: 'Notfallrucksack (4 ❤️)', ready: 'Bereit?', combo: 'Doppelte Gefahr!' },
    ru: { title: 'ОСТРОВ-ТРЕВОГА', hint: 'Веди пальцем = бежать · читай предупреждение · найди безопасное место', go: 'Старт!', round: 'Раунд', streak: 'Серия', survived: 'ВЫЖИЛ', over: 'Забег окончен', best: 'Рекорд', again: 'Ещё раз', tip: 'Совет по безопасности', quiz: 'Викторина', yes: 'Верно', no: 'Неверно', heart: '+1 ❤️', wrong: 'Увы, неверно', kit: 'Аварийный рюкзак (4 ❤️)', ready: 'Готов?', combo: 'Двойная опасность!' }
  };
  const s = k => (S[LANG] || S.de)[k];
  const L2 = o => LANG === 'ru' ? o.ru : o.de;
  const inHut = (x, y) => x > HUT.x - HUT.w / 2 && x < HUT.x + HUT.w / 2 && y > HUT.y - HUT.h / 2 && y < HUT.y + HUT.h / 2;
  const onHill = (x, y) => Math.hypot(x - HILL.x, y - HILL.y) < HILL.r;
  const inIsland = (x, y) => ((x - ISLE.cx) / ISLE.rx) ** 2 + ((y - ISLE.cy) / ISLE.ry) ** 2 <= 1;
  const onBeach = (x, y) => { const v = ((x - ISLE.cx) / ISLE.rx) ** 2 + ((y - ISLE.cy) / ISLE.ry) ** 2; return v > 0.78 && v <= 1; };
  const nearTree = (x, y, r) => TREES.some(([tx, ty]) => Math.hypot(x - tx, y - ty) < (r || 30));

  class IslandScene extends Phaser.Scene {
    constructor() { super('main'); }
    init(data) { this.bridge = this.registry.get('bridge'); this.d = data.save; }
    create() {
      const sc = this;
      sc.cameras.main.setBackgroundColor('#0ea5e9');
      const g = sc.add.graphics().setDepth(0);
      g.fillStyle(0x7dd3fc); g.fillEllipse(ISLE.cx, ISLE.cy, ISLE.rx * 2 + 36, ISLE.ry * 2 + 36);
      g.fillStyle(0xfde68a); g.fillEllipse(ISLE.cx, ISLE.cy, ISLE.rx * 2, ISLE.ry * 2);
      g.fillStyle(0x86efac); g.fillEllipse(ISLE.cx, ISLE.cy, ISLE.rx * 2 * 0.88, ISLE.ry * 2 * 0.88);
      g.fillStyle(0xbbf7d0); g.fillCircle(HILL.x, HILL.y, HILL.r); g.fillStyle(0xdcfce7); g.fillCircle(HILL.x, HILL.y, HILL.r * .55);
      g.fillStyle(0x64748b); g.fillCircle(WELL.x, WELL.y, WELL.r + 3); g.fillStyle(0x38bdf8); g.fillCircle(WELL.x, WELL.y, WELL.r - 2);
      sc.fireSpot = sc.add.text(FIRE.x, FIRE.y, '🔥', { fontSize: '22px' }).setOrigin(0.5).setDepth(5).setVisible(false);
      sc.treeObjs = TREES.map(([x, y]) => { const t = sc.add.container(x, y, [sc.add.rectangle(0, 8, 8, 18, 0x78350f), sc.add.circle(0, -6, 18, 0x15803d)]).setDepth(y); return t; });
      sc.hutG = sc.add.graphics().setDepth(HUT.y + 20); sc.hutState = 0; sc.drawHut();
      sc.gfx = sc.add.graphics().setDepth(2); sc.fx = sc.add.graphics().setDepth(400); sc.overlay = sc.add.graphics().setDepth(500); sc.dark = sc.add.graphics().setDepth(450);
      sc.player = U.avatar(sc, 187, 330, { torso: 0x0ea5e9, head: 0xfcd34d }); sc.player.setDepth(330); sc.player.setScale(0.9);
      sc.joy = sc.add.graphics().setDepth(600).setScrollFactor(0);
      sc.meterG = sc.add.graphics().setDepth(420);
      sc.hintTxt = sc.add.text(W / 2, PH + 36, '', { fontFamily: 'system-ui', fontSize: '15px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5).setDepth(600);
      sc.cardLayer = sc.add.container(0, 0).setDepth(700);
      sc.input.on('pointerdown', p => { if (sc.phase !== 'play' || p.y > PH) return; sc.joyO = { x: p.x, y: p.y }; sc.joyV = { x: 0, y: 0 }; sc.tapT = sc.time.now; sc.tapP = { x: p.x, y: p.y }; });
      sc.input.on('pointermove', p => { if (!sc.joyO || !p.isDown) return; const dx = p.x - sc.joyO.x, dy = p.y - sc.joyO.y, d = Math.hypot(dx, dy); const k = Math.min(1, d / 40); sc.joyV = d > 4 ? { x: dx / d * k, y: dy / d * k } : { x: 0, y: 0 }; });
      sc.input.on('pointerup', p => { if (sc.joyO && sc.time.now - sc.tapT < 150 && Math.hypot(p.x - sc.tapP.x, p.y - sc.tapP.y) < 8 && p.y < PH) sc.moveTarget = { x: p.x, y: p.y }; sc.joyO = null; sc.joyV = null; });
      sc.resetRun();
    }
    drawHut() { const g = this.hutG, st = this.hutState; g.clear(); if (st >= 3) { g.fillStyle(0x94a3b8); for (let i = 0; i < 5; i++) g.fillTriangle(HUT.x - 26 + i * 12, HUT.y + 20, HUT.x - 20 + i * 12, HUT.y + 2 - (i % 2) * 8, HUT.x - 14 + i * 12, HUT.y + 20); return; } g.fillStyle(0xf8fafc); g.fillRect(HUT.x - HUT.w / 2, HUT.y - HUT.h / 2 + 10, HUT.w, HUT.h - 10); g.fillStyle(0xef4444); g.fillTriangle(HUT.x - HUT.w / 2 - 6, HUT.y - HUT.h / 2 + 12, HUT.x, HUT.y - HUT.h / 2 - 16, HUT.x + HUT.w / 2 + 6, HUT.y - HUT.h / 2 + 12); g.fillStyle(0x78350f); g.fillRect(HUT.x - 8, HUT.y + HUT.h / 2 - 16, 16, 16); if (st > 0) { g.lineStyle(2, 0x475569); for (let i = 0; i < st; i++) g.lineBetween(HUT.x - 20 + i * 15, HUT.y - 5, HUT.x - 12 + i * 15, HUT.y + 14); } }
    resetRun() { const sc = this; sc.hearts = sc.d.kit ? 4 : 3; sc.d.kit = false; sc.round = 0; sc.streak = 0; sc.bag = []; sc.recent = []; sc.phase = 'idle'; sc.player.setPosition(187, 330); sc.hutState = 0; sc.drawHut(); sc.clearFx(); sc.bridge.hud(sc); }
    startRun() { this.resetRun(); this.nextRound(); }
    pick() { const sc = this; if (sc.round === 1 && !sc.d.totalRounds) return 'flood'; if (sc.round === 2 && !sc.d.totalRounds) return 'fire'; if (!sc.bag.length) sc.bag = Phaser.Utils.Array.Shuffle(DIS.slice()); let id = sc.bag.pop(); let tries = 0; while (sc.recent.includes(id) && tries++ < 5) { sc.bag.unshift(id); id = sc.bag.pop(); } sc.recent.push(id); if (sc.recent.length > 3) sc.recent.shift(); return id; }
    nextRound() {
      const sc = this; sc.round++; sc.clearFx(); sc.phase = 'warn';
      const ids = [sc.pick()]; if (sc.round >= 5 && sc.round % 2 === 1) { let o = sc.pick(); if (o === ids[0]) o = DIS[(DIS.indexOf(o) + 3) % 8]; ids.push(o); }
      sc.cur = ids; sc.intensity = Math.min(1.9, 1 + 0.06 * (sc.round - 1)) * (ids.length > 1 ? 0.7 : 1);
      if (sc.round >= 9 && (sc.round - 9) % 4 === 0) { sc.hutState = 2; sc.drawHut(); } else if (sc.hutState >= 3) { sc.hutState = 0; sc.drawHut(); }
      const warn = Math.max(2.5, 4 - 0.15 * (sc.round - 1));
      sc.bridge.sound('alarm'); sc.showWarning(ids, warn);
      sc.time.delayedCall(warn * 1000, () => sc.beginDisaster());
      sc.bridge.hud(sc);
    }
    showWarning(ids, secs) {
      const sc = this, c = sc.cardLayer; c.removeAll(true);
      const bg = sc.add.rectangle(W / 2, PH / 2, W, PH, 0x7f1d1d, 0.55); c.add(bg);
      const stripes = sc.add.graphics(); stripes.fillStyle(0xfacc15, .9); for (let i = -2; i < 12; i++) { stripes.fillRect(i * 40, 0, 20, 14); stripes.fillRect(i * 40 + 20, PH - 14, 20, 14); } c.add(stripes);
      const icon = sc.add.text(W / 2, PH / 2 - 60, ids.map(i => INFO[i].icon).join(' '), { fontSize: '64px' }).setOrigin(0.5).setScale(0); c.add(icon); sc.tweens.add({ targets: icon, scale: 1, duration: 400, ease: 'Back.easeOut' });
      const name = sc.add.text(W / 2, PH / 2 + 10, ids.map(i => L2(INFO[i])).join(' + '), { fontFamily: 'system-ui', fontSize: '28px', fontStyle: 'bold', color: '#fff', stroke: '#450a0a', strokeThickness: 6 }).setOrigin(0.5); c.add(name);
      if (ids.length > 1) c.add(sc.add.text(W / 2, PH / 2 + 44, s('combo'), { fontFamily: 'system-ui', fontSize: '14px', fontStyle: 'bold', color: '#fde047' }).setOrigin(0.5));
      const cnt = sc.add.text(W / 2, PH / 2 + 80, '', { fontFamily: 'system-ui', fontSize: '40px', fontStyle: 'bold', color: '#fde047' }).setOrigin(0.5); c.add(cnt);
      let n = Math.ceil(secs); const tick = () => { if (!cnt.active || sc.phase !== 'warn') return; cnt.setText(n); sc.bridge.sound('tick'); n--; if (n >= 0) sc.time.delayedCall(1000, tick); }; tick();
      sc.hintTxt.setText(sc.round <= 3 ? ids.map(i => L2(INFO[i].hint)).join('  ') : '');
    }
    beginDisaster() {
      const sc = this; sc.cardLayer.removeAll(true); sc.phase = 'play'; sc.roundT = 0; sc.hurtT = 0; sc.cold = 0; sc.heat = 0; sc.state = {};
      sc.bridge.sound('whoosh');
      sc.cur.forEach(id => {
        const st = sc.state;
        if (id === 'tornado') st.torn = { x: 60, y: 120, tx: 300, ty: 400 };
        if (id === 'fire') { st.cells = {}; const [tx, ty] = TREES[Math.floor(Math.random() * TREES.length)]; st.fireFront = [[Math.round(tx / 25), Math.round(ty / 25)]]; st.spreadT = 0; }
        if (id === 'quake') st.fallen = new Set();
        if (id === 'debris') { st.shadows = []; st.debT = 0; }
        if (id === 'lightning') { st.strikes = []; st.ltT = 0; }
        if (id === 'blizzard') sc.fireSpot.setVisible(true);
      });
    }
    hurt(n, why) { const sc = this; if (sc.phase !== 'play' || sc.hurtT > 0) return; sc.hurtT = 1; sc.hearts -= n; sc.bridge.sound('oof'); U.shake(sc, 1); sc.tweens.add({ targets: sc.player, alpha: .3, duration: 100, yoyo: true, repeat: 4 }); U.float(sc, sc.player.x, sc.player.y - 40, `-${n} ❤️`, { color: '#fecaca' }); if (sc.hearts === 1) { sc.time.timeScale = 0.4; sc.time.delayedCall(160, () => sc.time.timeScale = 1); sc.bridge.sound('fail'); } sc.bridge.hud(sc); if (sc.hearts <= 0) sc.gameOver(); }
    clearFx() { this.fx.clear(); this.gfx.clear(); this.overlay.clear(); this.dark.clear(); this.meterG.clear(); this.fireSpot.setVisible(false); this.treeObjs.forEach(t => { t.angle = 0; t.setAlpha(1); }); this.hintTxt.setText(''); }
    survived() {
      const sc = this; sc.phase = 'result'; sc.streak++; sc.clearFx(); sc.cur.forEach(id => { if (!sc.d.survived.includes(id)) { sc.d.survived.push(id); sc.bridge.stars(1); } }); sc.d.totalRounds++; if (sc.round % 2 === 0) sc.bridge.stars(1); if (sc.streak === 8) sc.bridge.stars(3); if (sc.streak === 12) sc.bridge.stars(5); if (sc.d.survived.length >= 8) sc.bridge.badge(); if (sc.streak > sc.d.best) sc.d.best = sc.streak; sc.bridge.save();
      sc.bridge.sound(sc.streak >= 3 ? 'checkpoint' : 'ok');
      const c = sc.cardLayer; const flash = sc.add.rectangle(W / 2, PH / 2, W, PH, 0x22c55e, .45); c.add(flash); sc.tweens.add({ targets: flash, alpha: 0, duration: 600 });
      const stamp = sc.add.text(W / 2, PH / 2, `${s('survived')} ×${sc.streak}`, { fontFamily: 'system-ui', fontSize: '34px', fontStyle: 'bold', color: '#fff', stroke: '#14532d', strokeThickness: 8 }).setOrigin(0.5).setScale(0.3).setAngle(-8); c.add(stamp); sc.tweens.add({ targets: stamp, scale: 1, duration: 350, ease: 'Back.easeOut' });
      U.burst(sc, W / 2, PH / 2, [0x86efac, 0xfde047, 0xffffff], 24, 300);
      sc.bridge.hud(sc);
      sc.time.delayedCall(1600, () => sc.showTip());
    }
    showTip() {
      const sc = this, c = sc.cardLayer; c.removeAll(true); sc.phase = 'tip';
      const id = sc.cur[0], quiz = sc.round >= 3 && sc.round % 2 === 1 && sc.d.tipsSeen.includes(id);
      const entry = quiz ? TIPS[id][1] : TIPS[id][0]; if (!quiz && !sc.d.tipsSeen.includes(id)) sc.d.tipsSeen.push(id);
      const bg = sc.add.graphics(); bg.fillStyle(0x0f172a, .72); bg.fillRect(0, 0, W, H); bg.fillStyle(0xffffff); bg.fillRoundedRect(20, 120, W - 40, 280, 20); c.add(bg);
      c.add(sc.add.text(W / 2, 150, `${INFO[id].icon} ${quiz ? s('quiz') : s('tip')}`, { fontFamily: 'system-ui', fontSize: '18px', fontStyle: 'bold', color: '#1e293b' }).setOrigin(0.5));
      c.add(sc.add.text(W / 2, 240, quiz ? L2(entry.q) : L2(entry), { fontFamily: 'system-ui', fontSize: '16px', color: '#1e293b', align: 'center', wordWrap: { width: W - 80 } }).setOrigin(0.5));
      sc.bridge.sound('question');
      const go = () => { c.removeAll(true); sc.nextRound(); };
      if (quiz) {
        const answer = v => { const ok = v === entry.a; if (ok) { sc.hearts = Math.min(4, sc.hearts + 1); sc.d.quizCorrect++; sc.bridge.sound('levelup'); U.float(sc, W / 2, 300, s('heart'), { fontSize: '26px', color: '#f43f5e' }); } else { sc.bridge.sound('bad'); U.float(sc, W / 2, 300, s('wrong'), { color: '#fecaca' }); } sc.bridge.hud(sc); sc.time.delayedCall(900, go); };
        c.add(U.button(sc, W / 2 - 80, 350, 140, 48, `✓ ${s('yes')}`, 0x16a34a, () => answer(true)));
        c.add(U.button(sc, W / 2 + 80, 350, 140, 48, `✗ ${s('no')}`, 0xdc2626, () => answer(false)));
      } else c.add(U.button(sc, W / 2, 350, 180, 48, t('continue'), 0x4f46e5, go));
    }
    gameOver() { const sc = this; sc.phase = 'over'; sc.clearFx(); sc.bridge.sound('gameover'); sc.bridge.over({ streak: sc.streak, round: sc.round, best: sc.d.best, restart: () => sc.startRun() }); }
    update(time, delta) {
      const sc = this, dt = Math.min(delta, 50) / 1000, pl = sc.player;
      sc.joy.clear(); if (sc.joyO) { sc.joy.lineStyle(3, 0xffffff, .6); sc.joy.strokeCircle(sc.joyO.x, sc.joyO.y, 40); sc.joy.fillStyle(0xffffff, .7); sc.joy.fillCircle(sc.joyO.x + (sc.joyV ? sc.joyV.x * 40 : 0), sc.joyO.y + (sc.joyV ? sc.joyV.y * 40 : 0), 14); }
      if (sc.phase !== 'play') { pl.idle(); return; }
      // movement
      let vx = 0, vy = 0;
      if (sc.joyV && (sc.joyV.x || sc.joyV.y)) { vx = sc.joyV.x; vy = sc.joyV.y; sc.moveTarget = null; }
      else if (sc.moveTarget) { const dx = sc.moveTarget.x - pl.x, dy = sc.moveTarget.y - pl.y, d = Math.hypot(dx, dy); if (d > 5) { vx = dx / d; vy = dy / d; } else sc.moveTarget = null; }
      if (vx || vy) { let nx = pl.x + vx * 140 * dt, ny = pl.y + vy * 140 * dt; const fireRound = sc.cur.includes('fire'); const allowed = inIsland(nx, ny) || (fireRound && ((nx - ISLE.cx) / (ISLE.rx + 14)) ** 2 + ((ny - ISLE.cy) / (ISLE.ry + 14)) ** 2 <= 1); if (allowed && !(sc.hutState >= 3 && inHut(nx, ny))) { pl.x = nx; pl.y = ny; } pl.run(dt, 1); pl.setScale(vx < 0 ? -0.9 : 0.9, 0.9); } else pl.idle();
      pl.setDepth(pl.y);
      if (sc.hurtT > 0) sc.hurtT -= dt;
      sc.roundT += dt; const T = sc.roundT, I = sc.intensity, st = sc.state;
      sc.fx.clear(); sc.gfx.clear(); sc.overlay.clear(); sc.dark.clear(); sc.meterG.clear();
      pl.setDepth(sc.cur.includes('blizzard') || sc.cur.includes('heat') || sc.cur.includes('lightning') ? 455 : pl.y);
      // round timer bar
      sc.overlay.fillStyle(0x0f172a, .4); sc.overlay.fillRect(0, 0, W, 6); sc.overlay.fillStyle(0xfde047); sc.overlay.fillRect(0, 0, W * Math.max(0, 1 - T / 16), 6);
      const inside = inHut(pl.x, pl.y) && sc.hutState < 3;
      for (const id of sc.cur) {
        if (id === 'flood') { const k = Math.min(1, T / 6); const f = 1 - k * 0.65; sc.gfx.fillStyle(0x3b82f6, .75); sc.gfx.fillEllipse(ISLE.cx, ISLE.cy, ISLE.rx * 2 + 60, ISLE.ry * 2 + 60); sc.gfx.fillStyle(0x86efac); sc.gfx.fillEllipse(ISLE.cx, ISLE.cy, ISLE.rx * 2 * f * 0.88, ISLE.ry * 2 * f * 0.88); sc.gfx.fillStyle(0xbbf7d0); sc.gfx.fillCircle(HILL.x, HILL.y, HILL.r); sc.gfx.fillStyle(0xffffff, .5); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + T; sc.gfx.fillCircle(ISLE.cx + Math.cos(a) * ISLE.rx * f * 0.9, ISLE.cy + Math.sin(a) * ISLE.ry * f * 0.9, 3); } const v = ((pl.x - ISLE.cx) / ISLE.rx) ** 2 + ((pl.y - ISLE.cy) / ISLE.ry) ** 2; const wet = v > (f * 0.88) ** 2 && !onHill(pl.x, pl.y) && !inside; if (wet) { st.wetT = (st.wetT || 0) + dt; if (st.wetT > 2.5) { st.wetT = 0; sc.hurt(1, 'flood'); } } else st.wetT = 0; }
        if (id === 'tornado') { const tn = st.torn; const dx = tn.tx - tn.x, dy = tn.ty - tn.y, d = Math.hypot(dx, dy); if (d < 10) { do { tn.tx = 60 + Math.random() * 255; tn.ty = 100 + Math.random() * 380; } while (inHut(tn.tx, tn.ty)); } else { tn.x += dx / d * 90 * I * dt; tn.y += dy / d * 90 * I * dt; } for (let i = 0; i < 4; i++) { sc.fx.fillStyle(0xe2e8f0, .55 - i * .1); sc.fx.fillCircle(tn.x + Math.sin(T * 10 + i) * 6, tn.y - i * 16, 10 + i * 6); } const pd = Math.hypot(pl.x - tn.x, pl.y - tn.y); if (!inside) { if (pd < 90 && pd > 1) { pl.x -= (pl.x - tn.x) / pd * 60 * dt; pl.y -= (pl.y - tn.y) / pd * 60 * dt; } if (pd < 22) sc.hurt(1, 'tornado'); } sc.treeObjs.forEach(tr => { const td = Math.hypot(tr.x - tn.x, tr.y - tn.y); tr.angle = td < 80 ? (tn.x > tr.x ? -15 : 15) : 0; }); }
        if (id === 'debris') { st.debT += dt; if (st.debT > 0.9 / I) { st.debT = 0; st.shadows.push({ x: 50 + Math.random() * 275, y: 100 + Math.random() * 380, t: 0 }); } st.shadows.forEach(sh => { sh.t += dt; sc.fx.fillStyle(0x1e293b, .35); sc.fx.fillCircle(sh.x, sh.y, 26 - sh.t * 10); if (sh.t >= 1.1 && !sh.hit) { sh.hit = true; sc.bridge.sound('crash'); U.burst(sc, sh.x, sh.y, [0x94a3b8, 0x475569], 10, 200); U.shake(sc, .4); if (Math.hypot(pl.x - sh.x, pl.y - sh.y) < 26 && !inside) sc.hurt(1, 'debris'); if (inHut(sh.x, sh.y) && sc.hutState < 3) { sc.hutState++; sc.drawHut(); if (sc.hutState >= 3 && inside) sc.hurt(2, 'hut'); } } }); st.shadows = st.shadows.filter(sh => sh.t < 1.4); }
        if (id === 'quake') { sc.cameras.main.shake(100, 0.004); sc.treeObjs.forEach((tr, i) => { const fallAt = 2 + i * 1.6; if (T > fallAt - 1 && T < fallAt) { sc.fx.lineStyle(3, 0x1e293b, .4); sc.fx.lineBetween(tr.x, tr.y, tr.x + 55, tr.y + 10); } if (T >= fallAt && !st.fallen.has(i)) { st.fallen.add(i); tr.angle = 80; sc.bridge.sound('brick'); } if (T >= fallAt && T < fallAt + 0.6 && Math.abs(pl.y - tr.y - 5) < 12 && pl.x > tr.x && pl.x < tr.x + 60) sc.hurt(1, 'tree'); }); if (T > 4.5 && T < 6 && sc.hutState < 3) { sc.fx.lineStyle(2, 0x1e293b); sc.fx.lineBetween(HUT.x - 20, HUT.y - 10, HUT.x - 5, HUT.y + 15); } if (T >= 6 && sc.hutState < 3) { sc.hutState = 3; sc.drawHut(); sc.bridge.sound('crash'); if (inside) sc.hurt(2, 'hut'); } if (T >= 9) { [[100, 300], [230, 380], [170, 170]].forEach(([cx, cy]) => { sc.fx.lineStyle(4, 0x1e293b, .8); sc.fx.lineBetween(cx - 30, cy, cx - 10, cy + 8); sc.fx.lineBetween(cx - 10, cy + 8, cx + 10, cy - 6); sc.fx.lineBetween(cx + 10, cy - 6, cx + 30, cy + 4); if (Math.abs(pl.y - cy) < 10 && Math.abs(pl.x - cx) < 30) sc.hurt(1, 'crack'); }); } }
        if (id === 'blizzard') { const warm = inside || Math.hypot(pl.x - FIRE.x, pl.y - FIRE.y) < 50; sc.cold = Phaser.Math.Clamp(sc.cold + (warm ? -25 : 100 / 8 * I) * dt, 0, 100); if (sc.cold >= 100) { sc.cold = 50; sc.hurt(1, 'cold'); } sc.dark.fillStyle(0x0f172a, .6); sc.dark.fillRect(0, 0, W, PH); sc.dark.fillStyle(0xffffff, .25); for (let i = 0; i < 40; i++) sc.dark.fillRect((i * 37 + T * 60) % W, (i * 53 + T * 90) % PH, 2, 2); sc.dark.fillStyle(0xf8fafc, .08); sc.dark.fillCircle(pl.x, pl.y, 110); sc.meterG.lineStyle(5, 0x93c5fd); sc.meterG.beginPath(); sc.meterG.arc(pl.x, pl.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sc.cold / 100); sc.meterG.strokePath(); }
        if (id === 'fire') { st.spreadT += dt; if (st.spreadT > 0.7 / I) { st.spreadT = 0; const next = []; st.fireFront.forEach(([cx, cy]) => { const k = cx + ',' + cy; if (st.cells[k] == null) st.cells[k] = 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy, kk = nx + ',' + ny; const px = nx * 25, py = ny * 25; if (st.cells[kk] == null && inIsland(px, py) && !onBeach(px, py) && !inHut(px, py)) { st.cells[kk] = 0; next.push([nx, ny]); } }); }); st.fireFront = next; } Object.keys(st.cells).forEach(k => { st.cells[k] += dt; const [cx, cy] = k.split(',').map(Number); const age = st.cells[k]; if (age < 5) { sc.gfx.fillStyle(Math.floor(T * 8 + cx) % 2 ? 0xf97316 : 0xfb923c, .85); sc.gfx.fillRect(cx * 25 - 12, cy * 25 - 12, 25, 25); if (Math.random() < 0.05) { const sm = sc.add.circle(cx * 25, cy * 25 - 10, 5, 0x94a3b8, .5).setDepth(410); sc.tweens.add({ targets: sm, y: sm.y - 40, alpha: 0, duration: 900, onComplete: () => sm.destroy() }); } } else { sc.gfx.fillStyle(0x64748b, .6); sc.gfx.fillRect(cx * 25 - 12, cy * 25 - 12, 25, 25); } }); const pk = Math.round(pl.x / 25) + ',' + Math.round(pl.y / 25); if (st.cells[pk] != null && st.cells[pk] < 5 && !inside) { st.burnT = (st.burnT || 0) + dt; if (st.burnT > 1) { st.burnT = 0; sc.hurt(1, 'fire'); } } else st.burnT = 0; }
        if (id === 'heat') { const shade = inside || nearTree(pl.x, pl.y, 24); const atWell = Math.hypot(pl.x - WELL.x, pl.y - WELL.y) < 22; if (atWell && (!st.wellT || T - st.wellT > 2)) { st.wellT = T; sc.heat = 0; sc.bridge.sound('splash'); U.float(sc, pl.x, pl.y - 30, '💧', {}); } sc.heat = Phaser.Math.Clamp(sc.heat + (shade ? -20 : 100 / 7 * I) * dt, 0, 100); if (sc.heat >= 100) { sc.heat = 50; sc.hurt(1, 'heat'); } sc.dark.fillStyle(0xfde047, .12 + Math.sin(T * 3) * .05); sc.dark.fillRect(0, 0, W, PH); sc.meterG.lineStyle(5, 0xf97316); sc.meterG.beginPath(); sc.meterG.arc(pl.x, pl.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sc.heat / 100); sc.meterG.strokePath(); }
        if (id === 'lightning') { st.ltT += dt; if (st.ltT > 1.2 / I) { st.ltT = 0; const tgt = Math.random() < .3 ? [HILL.x, HILL.y] : TREES[Math.floor(Math.random() * TREES.length)]; st.strikes.push({ x: tgt[0], y: tgt[1], t: 0 }); } sc.dark.fillStyle(0x1e293b, .25); sc.dark.fillRect(0, 0, W, PH); st.strikes.forEach(sk => { sk.t += dt; if (sk.t < 0.8) { sc.fx.fillStyle(0xfde047, .25 + Math.sin(sk.t * 30) * .1); sc.fx.fillCircle(sk.x, sk.y, 40); } else if (!sk.hit) { sk.hit = true; sc.bridge.sound('zap'); const fl = sc.add.rectangle(W / 2, PH / 2, W, PH, 0xffffff, .8).setDepth(480); sc.tweens.add({ targets: fl, alpha: 0, duration: 200, onComplete: () => fl.destroy() }); sc.fx.lineStyle(4, 0xffffff); if (Math.hypot(pl.x - sk.x, pl.y - sk.y) < 40 && !inside) sc.hurt(1, 'lightning'); } }); st.strikes = st.strikes.filter(sk => sk.t < 1.2); }
      }
      if (T >= 16) sc.survived();
    }
  }

  Games.register({
    id: 'island', icon: '🏝️', bg: '#e0f2fe', partner: 'p3', tier: 'top', isNew: true, kicker: { de: 'Katastrophen überleben', ru: 'Пережить катастрофы' }, art: () => Art.topScene('island'),
    name: { de: 'Inselalarm', ru: 'Остров-тревога' },
    tagline: { de: 'Flut, Tornado, Feuer, Blizzard: Lauf zum richtigen Ort und lerne zwischen den Runden echte Sicherheitstipps.', ru: 'Наводнение, торнадо, пожар, метель: беги в нужное место и учи настоящие правила безопасности между раундами.' },
    mount(root, ctx) {
      const d = ctx.data; if (!d.survived) Object.assign(d, { best: 0, totalRounds: 0, survived: [], quizCorrect: 0, tipsSeen: [], kit: false, adNext: 0 });
      root.innerHTML = `
        <div class="game-head">
          <span class="stat" id="is-hearts">❤️❤️❤️</span>
          <span class="stat">🔁 <b id="is-round">0</b> · <b id="is-streak">0</b></span>
          <span class="stat muted">🏆 <span id="is-best">${d.best}</span></span>
        </div>`;
      const $ = id => root.querySelector('#' + id);
      let scene;
      const startOverlay = () => {
        const canKit = Date.now() > (d.adNext || 0);
        ctx.modal({ title: s('title'), dismissible: false, html: `<div class="center" style="font-size:44px">🏝️</div><p class="center small">${s('hint')}</p>`, actions: [
          ...(canKit ? [{ label: `🎒 ${s('kit')} · ${t('watch_ad')}`, cls: 'btn-ad', async onClick() { const ok = await ctx.ad(); if (ok) { d.kit = true; d.adNext = Date.now() + 20 * 60e3; ctx.save(); } scene.startRun(); } }] : []),
          { label: s('go'), cls: 'btn-primary', onClick: () => scene.startRun() }, { label: t('continue'), cls: 'btn-ghost', onClick: () => Hub.show('home') }] });
      };
      const bridge = {
        sound: (n, a) => ctx.sound(n, a), save: () => ctx.save(), stars: n => ctx.stars(n, true), badge: () => ctx.badge('island'),
        hud(sc) { $('is-hearts').textContent = '❤️'.repeat(Math.max(0, sc.hearts)) + '🖤'.repeat(Math.max(0, 3 - sc.hearts)); $('is-round').textContent = sc.round; $('is-streak').textContent = sc.streak; $('is-best').textContent = d.best; },
        over(info) { ctx.modal({ title: s('over'), dismissible: false, html: `<div class="center" style="font-size:48px">💥</div><div class="stats" style="margin-top:8px"><div class="box"><b>${info.streak}</b><span>${s('streak')}</span></div><div class="box"><b>${info.best}</b><span>${s('best')}</span></div></div>`, actions: [{ label: s('again'), cls: 'btn-primary', onClick: () => startOverlay() }, { label: t('continue'), cls: 'btn-ghost', onClick: () => Hub.show('home') }] }); }
      };
      const host = PhaserHost.mount(root, IslandScene, { bridge, data: { save: d }, physics: { default: 'arcade', arcade: { gravity: { y: 0 } } }, bg: '#0ea5e9' });
      setTimeout(() => { scene = host.game.scene.getScene('main'); startOverlay(); }, 80);
      return { destroy() { host.destroy(); } };
    }
  });
})();
