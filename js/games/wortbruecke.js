// Wortbrücke: build German words from letter blocks; every word drops a plank, five planks let the avatar cross. Partner: Lesestart.
Games.register({
  id: 'wortbruecke', icon: '🌉', bg: '#e7e6fb', partner: 'p4',
  name: { de: 'Wortbrücke', ru: 'Словарный мост' },
  tagline: { de: 'Lege Buchstabenblöcke zu Wörtern – jede Planke bringt den Läufer näher ans andere Ufer.', ru: 'Складывай буквы в слова — каждая доска ведёт бегуна к другому берегу.' },
  mount(root, ctx) {
    const PUZZLES = [
      { letters: 'GARTEN', words: ['GARTEN', 'TRAGEN', 'RATEN', 'ARTEN', 'NAGER', 'RANG', 'GERN', 'ART', 'RAT', 'TAG'] },
      { letters: 'KINDER', words: ['KINDER', 'KIND', 'RINDE', 'RIND', 'KERN', 'DREI', 'REIN', 'KEIN', 'DEIN', 'DIR', 'DER', 'DIE', 'EIN'] },
      { letters: 'STRAND', words: ['STRAND', 'RAND', 'SAND', 'RAST', 'STAR', 'DRAN', 'ART', 'RAT', 'DAS'] },
      { letters: 'FREUND', words: ['FREUND', 'RUNDE', 'RUND', 'FUND', 'FERN', 'UFER', 'UND', 'NUR', 'DER'] },
      { letters: 'WINTER', words: ['WINTER', 'WEIT', 'WERT', 'TIER', 'REIN', 'WEIN', 'WIRT', 'WIR'] },
      { letters: 'HERBST', words: ['HERBST', 'HERB', 'BEST', 'REST', 'HEBT', 'SEHR', 'HER'] },
      { letters: 'FRIEDEN', words: ['FRIEDEN', 'FERIEN', 'NIEDER', 'FEIND', 'FINDE', 'FEDER', 'REDEN', 'ENDE', 'DREI', 'FREI', 'FEIN', 'NIE', 'DIE', 'DER'] },
      { letters: 'LERNEN', words: ['LERNEN', 'LERNE', 'RENNE', 'NENNE', 'ERLEN', 'LEER'] }
    ];
    const NEED = 5;
    const S = {
      de: { puzzle: 'Brücke', planks: 'Planken', check: 'Prüfen', clear: 'Löschen', shuffle: 'Mischen', hint: 'Hinweis', notlist: 'Nicht in der Wortliste', dup: 'Schon gefunden', short: 'Mindestens 3 Buchstaben', done: 'Brücke fertig!', bonus: 'Bonuswort', all: 'Alle Wörter gefunden – Bonus!', hintAd: 'Hinweis gegen Anzeige', title: 'WORTBRÜCKE', hintT: 'Tippe Buchstaben · „Prüfen“ · 5 Wörter = Brücke', go: 'Los!', found: 'gefunden' },
      ru: { puzzle: 'Мост', planks: 'Доски', check: 'Проверить', clear: 'Стереть', shuffle: 'Перемешать', hint: 'Подсказка', notlist: 'Нет в списке слов', dup: 'Уже найдено', short: 'Минимум 3 буквы', done: 'Мост готов!', bonus: 'Бонусное слово', all: 'Все слова найдены — бонус!', hintAd: 'Подсказка за рекламу', title: 'СЛОВАРНЫЙ МОСТ', hintT: 'Нажимай буквы · «Проверить» · 5 слов = мост', go: 'Погнали!', found: 'найдено' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const d = ctx.data; d.idx = d.idx || 0; d.bridges = d.bridges || 0;
    root.innerHTML = `
      <div class="game-head">
        <span class="stat">🌉 ${s('puzzle')} <b id="wb-idx">1</b></span>
        <span class="stat">🪵 <b id="wb-planks">0</b>/${NEED}</span>
        <span class="stat">💡 <b id="wb-hints">${State.data.hints}</b></span>
        <span class="stat muted">🏁 <span id="wb-bridges">${d.bridges}</span></span>
      </div>`;
    const { wrap, cv, overlay } = Gfx.mountCanvas(root, { title: s('title'), hint: s('hintT'), cta: s('go') });
    const tools = document.createElement('div'); tools.className = 'cv-tools'; root.appendChild(tools);
    const foundEl = document.createElement('div'); foundEl.className = 'wb-found'; root.appendChild(foundEl);
    const st = Gfx.setup(cv, wrap, 0.9, 380), g = st.g, P = Gfx.particles(), F = Gfx.floats();
    const $ = id => root.querySelector('#' + id);
    let p, tiles, cur, found, hint, planks, plankT = [], crossing = null, tm = 0, shake = 0, flash = 0, started = false, bannerT = 0, bannerTxt = '', poof = 0, cheer = 0;
    const shuffle = a => a.slice().sort(() => Math.random() - .5);
    const deckY = () => st.H * 0.44, bankW = () => st.W * 0.18;

    function loadPuzzle() { p = PUZZLES[d.idx % PUZZLES.length]; tiles = shuffle(p.letters.split('')); cur = []; found = []; hint = null; planks = 0; plankT = []; crossing = null; poof = 1; renderTools(); hud(); }
    function hud() { $('wb-idx').textContent = (d.idx % PUZZLES.length) + 1; $('wb-planks').textContent = Math.min(NEED, planks); $('wb-hints').textContent = State.data.hints; $('wb-bridges').textContent = d.bridges; foundEl.innerHTML = found.map(w => `<span>${w}</span>`).join('') + (hint ? `<span class="hint">${hint}</span>` : ''); }
    function renderTools() {
      tools.innerHTML = `<button class="btn btn-indigo" id="wb-check">✓ ${s('check')}</button><button class="btn btn-outline btn-sm" id="wb-clear">⌫</button><button class="btn btn-outline btn-sm" id="wb-shuffle">🔀</button><button class="btn ${State.data.hints > 0 ? 'btn-outline' : 'btn-ad'} btn-sm" id="wb-hint">💡</button>`;
      $('wb-check').addEventListener('click', check); $('wb-clear').addEventListener('click', () => { cur = []; ctx.sound('pop'); }); $('wb-shuffle').addEventListener('click', () => { tiles = shuffle(tiles); cur = []; ctx.sound('whoosh'); });
      $('wb-hint').addEventListener('click', giveHint);
    }
    function check() {
      if (crossing || cur.length === 0) return;
      const w = cur.map(i => tiles[i]).join('');
      if (w.length < 3) { ctx.toast(s('short')); ctx.sound('bad'); shake = .6; cur = []; return; }
      if (found.includes(w)) { ctx.toast(s('dup')); ctx.sound('bad'); shake = .6; cur = []; return; }
      if (!p.words.includes(w)) { ctx.toast(s('notlist')); ctx.sound('bad'); shake = 1; flash = 1; cur = []; return; }
      found.push(w); hint = null; const pts = w.length * 2; ctx.sound('ok');
      // letters fly to the bridge
      const slot = Math.min(NEED - 1, planks), px = bankW() + (st.W - 2 * bankW()) * (slot + .5) / NEED;
      cur.forEach((i, k) => { const r = tileRect(i); P.add({ x: r.x + r.s / 2, y: r.y, vx: (px - r.x) * 1.6 + Gfx.rnd(-20, 20), vy: (deckY() - r.y) * 1.6 - 120, grav: 500, life: .7, color: ['#a78bfa', '#c4b5fd', '#fff'][k % 3], size: 8 }); });
      cur = [];
      if (planks < NEED) { planks++; plankT[planks - 1] = 0; setTimeout(() => ctx.sound('place'), 350); ctx.stars(pts, true); F.add(px, deckY() - 30, `+${pts} ⭐`, '#fde047', 16); }
      else { ctx.stars(pts + 3, true); F.add(st.W / 2, st.H * 0.25, `${s('bonus')} +${pts + 3} ⭐`, '#fde047', 16); }
      hud();
      if (planks >= NEED && found.length === NEED) setTimeout(cross, 500);
      if (found.length === p.words.length) { ctx.toast(s('all'), 'good'); ctx.stars(15); }
    }
    function cross() {
      crossing = { t: 0 }; ctx.sound('win'); d.bridges++; d.puzzlesDone = (d.puzzlesDone || 0) + 1; ctx.save(); hud();
      if (d.bridges >= 3) ctx.badge('words');
    }
    async function giveHint() {
      if (crossing) return;
      const left = p.words.filter(w => !found.includes(w)).sort((a, b) => b.length - a.length); if (!left.length) return;
      let ok;
      if (State.data.hints > 0) { State.data.hints--; State.save(); ok = true; } else ok = await ctx.ad();
      if (!ok) return;
      const w = left[0]; hint = w[0] + ' ' + '_ '.repeat(w.length - 1).trim(); ctx.sound('hint'); renderTools(); hud();
    }
    /* ---------- layout & drawing ---------- */
    function tileRect(i) { const n = tiles.length, sz = Math.min(48, (st.W - 24) / n - 6), total = n * (sz + 6) - 6, x0 = (st.W - total) / 2; const sel = cur.indexOf(i) >= 0; return { x: x0 + i * (sz + 6), y: st.H - sz - 16 - (sel ? 10 : 0), s: sz, sel }; }
    function draw() {
      const W = st.W, H = st.H, dy = deckY(), bw = bankW();
      Gfx.sky(g, W, H, { hue: 250, t: tm, sunX: 0.85, sunY: 0.14 });
      Gfx.hills(g, W, H * 0.3, 12, 'rgba(167,139,250,.35)', 0.4); Gfx.hills(g, W, H * 0.36, 8, 'rgba(134,239,172,.6)', 2);
      // water
      const wg = g.createLinearGradient(0, dy, 0, H); wg.addColorStop(0, '#60a5fa'); wg.addColorStop(1, '#1e3a8a'); g.fillStyle = wg; g.fillRect(0, dy + 8, W, H);
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { const yy = dy + 30 + i * 22, ph = tm * 35 + i * 40; g.beginPath(); for (let x = 0; x <= W; x += 6) g.lineTo(x, yy + Math.sin((x + ph) * 0.06) * 2.5); g.stroke(); }
      g.save(); const [sx, sy] = Gfx.shakeXY(shake); g.translate(sx, sy);
      // banks
      Gfx.block(g, -10, dy, bw + 10, H, '#86efac', { studs: 30 }); Gfx.block(g, W - bw, dy, bw + 20, H, '#86efac', { studs: 30 });
      Gfx.tree(g, W - bw * 0.45, dy, 54, Math.sin(tm) * 1.2, { layers: 2 });
      g.fillStyle = '#e2e8f0'; g.fillRect(W - bw * 0.85, dy - 60, 3, 60); g.fillStyle = '#f472b6'; g.beginPath(); g.moveTo(W - bw * 0.85 + 3, dy - 60); g.lineTo(W - bw * 0.85 + 30 + Math.sin(tm * 6) * 3, dy - 50); g.lineTo(W - bw * 0.85 + 3, dy - 40); g.closePath(); g.fill();
      // ropes
      g.strokeStyle = '#78350f'; g.lineWidth = 3; g.beginPath(); g.moveTo(bw, dy - 30); g.quadraticCurveTo(W / 2, dy - 10, W - bw, dy - 30); g.stroke();
      g.fillStyle = '#92400e'; g.fillRect(bw - 6, dy - 34, 6, 34); g.fillRect(W - bw, dy - 34, 6, 34);
      // planks
      const span = W - 2 * bw, pw = span / NEED;
      for (let i = 0; i < NEED; i++) {
        const x = bw + i * pw;
        if (i < planks) { const k = plankT[i] == null ? 1 : Math.min(1, plankT[i]); const drop = (1 - k) * (1 - k) * -80, bounce = k > 0.8 ? Math.sin((k - 0.8) * 15) * 3 * (1 - k) : 0; Gfx.block(g, x + 2, dy - 6 + drop + bounce, pw - 4, 12, ['#f59e0b', '#fbbf24', '#f97316'][i % 3], { dx: 5, dy: -4 }); }
        else { g.strokeStyle = 'rgba(255,255,255,.5)'; g.setLineDash([4, 4]); g.strokeRect(x + 3, dy - 5, pw - 6, 10); g.setLineDash([]); }
      }
      // avatar
      let ax = bw * 0.35, ay = dy - 44, swing = Math.sin(tm * 3) * 0.1, expr = 'smile', cheerNow = false;
      if (crossing) { const k = Math.min(1, crossing.t / 1.6); ax = bw * 0.35 + (W - bw * 0.35 - 26 - bw * 0.35) * k; swing = Math.sin(tm * 16) * 0.7; expr = 'happy'; if (k >= 1) { cheerNow = true; ay -= Math.abs(Math.sin(tm * 12)) * 8; } }
      if (poof > 0) { g.globalAlpha = 1 - poof; }
      Gfx.avatar(g, ax, ay, { swing, expr, cheer: cheerNow, colors: { torso: '#4f46e5', legs: '#f59e0b' } }); g.globalAlpha = 1;
      // word slots
      const word = cur.map(i => tiles[i]).join('');
      if (word) { const ss = 30, tw = word.length * (ss + 4) - 4, x0 = (W - tw) / 2, yy = H - 110; for (let k = 0; k < word.length; k++) { Gfx.block(g, x0 + k * (ss + 4), yy, ss, ss, flash > 0 ? '#ef4444' : '#4f46e5', { dx: 4, dy: -3 }); g.fillStyle = '#fff'; g.font = 'bold 17px system-ui'; g.textAlign = 'center'; g.fillText(word[k], x0 + k * (ss + 4) + ss / 2, yy + 22); } }
      // rack
      tiles.forEach((ch, i) => { const r = tileRect(i); Gfx.block(g, r.x, r.y, r.s, r.s, r.sel ? '#c4b5fd' : '#ffffff', { dx: 5, dy: -4 }); g.fillStyle = r.sel ? '#4c1d95' : '#1e293b'; g.font = `bold ${Math.round(r.s * 0.5)}px system-ui`; g.textAlign = 'center'; g.fillText(ch, r.x + r.s / 2, r.y + r.s * 0.66); if (r.sel) { g.fillStyle = '#4f46e5'; g.beginPath(); g.arc(r.x + r.s - 6, r.y + 6, 7, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 10px system-ui'; g.fillText(cur.indexOf(i) + 1, r.x + r.s - 6, r.y + 9.5); } });
      P.draw(g); F.draw(g);
      g.restore();
      if (flash > 0) { g.fillStyle = `rgba(239,68,68,${flash * 0.25})`; g.fillRect(0, 0, W, H); }
      Gfx.banner(g, W, H * 0.12, bannerTxt, bannerT);
    }
    function update(dt) {
      tm += dt; if (shake > 0) shake = Math.max(0, shake - dt * 3); if (flash > 0) flash = Math.max(0, flash - dt * 2.5); if (poof > 0) poof = Math.max(0, poof - dt * 2); if (bannerT > 0) bannerT -= dt;
      for (let i = 0; i < plankT.length; i++) if (plankT[i] != null && plankT[i] < 1) plankT[i] += dt * 2.2;
      if (crossing) { crossing.t += dt; if (crossing.t > 1.2 && !crossing.fx) { crossing.fx = true; FX.confetti(); bannerTxt = `🌉 ${s('done')}`; bannerT = 1.6; ctx.stars(20); } if (crossing.t > 2.6) { d.idx++; ctx.save(); loadPuzzle(); } }
      P.update(dt); F.update(dt);
    }
    const stop = Gfx.loop(dt => { update(dt); draw(); });
    wrap.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!started) { started = true; overlay.classList.add('hidden'); return; }
      if (crossing) return;
      const pt = Gfx.point(e, cv);
      for (let i = 0; i < tiles.length; i++) { const r = tileRect(i); if (pt.x >= r.x && pt.x <= r.x + r.s + 5 && pt.y >= r.y - 12 && pt.y <= r.y + r.s) { const k = cur.indexOf(i); if (k >= 0) cur = cur.slice(0, k); else cur.push(i); ctx.sound('tap'); P.burst(r.x + r.s / 2, r.y, ['#c4b5fd', '#fff'], 4, 90); return; } }
    });
    const onKey = e => { if (e.key === 'Enter') check(); if (e.key === 'Backspace') cur = cur.slice(0, -1); const ch = e.key.toUpperCase(); if (ch.length === 1 && /[A-ZÄÖÜ]/.test(ch)) { const i = tiles.findIndex((c, idx) => c === ch && cur.indexOf(idx) < 0); if (i >= 0) { cur.push(i); ctx.sound('tap'); } } };
    window.addEventListener('keydown', onKey);
    const onResize = () => st.resize();
    window.addEventListener('resize', onResize);
    loadPuzzle();
    cv.__wb = { get: () => ({ p, tiles, cur, found, planks, crossing }), submit: w => { cur = []; for (const ch of w) { const i = tiles.findIndex((c, idx) => c === ch && cur.indexOf(idx) < 0); if (i >= 0) cur.push(i); } check(); }, start: () => { started = true; overlay.classList.add('hidden'); } }; // debug hook
    return { destroy() { stop(); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); } };
  }
});
