// Kleinstadt: isometric city builder with roads, cars, day/night and coins popping from buildings. Partner: Spielplatz-Initiative.
Games.register({
  id: 'kleinstadt', icon: '🏘️', bg: '#fef3c7', partner: 'p5',
  name: { de: 'Kleinstadt', ru: 'Маленький город' },
  tagline: { de: 'Baue Straßen, Häuser, Parks und Schulen – schau den Autos zu und mach die Stadt glücklich.', ru: 'Строй дороги, дома, парки и школы, смотри на машинки и делай город счастливым.' },
  mount(root, ctx) {
    const S = {
      de: { treasury: 'Stadtkasse', pop: 'Einwohner', happy: 'Zufriedenheit', income: 'Einnahmen', per: '/ 2 s',
        house: 'Haus', house_d: '+3 pro Takt, +2 je Park nebenan, +20 % an einer Straße.', bakery: 'Bäckerei', bakery_d: '+8 pro Takt, braucht ein Haus nebenan.',
        park: 'Park', park_d: 'Macht Nachbarn glücklich und reicher.', school: 'Schule', school_d: '+10 % auf alle Einnahmen.', road: 'Straße', road_d: 'Verbindet Gebäude, Autos fahren.', bull: 'Abriss', bull_d: 'Entfernen, 50 % zurück.',
        goal: 'Ziel: 10 Häuser und 70 % Zufriedenheit', won: 'Die Kleinstadt blüht!', fest: 'Stadtfest: +150', nomoney: 'Nicht genug in der Stadtkasse', reset: 'Neue Stadt', title: 'KLEINSTADT', hint: 'Werkzeug wählen · auf ein Feld tippen', go: 'Bauen!' },
      ru: { treasury: 'Казна', pop: 'Жители', happy: 'Довольство', income: 'Доход', per: '/ 2 с',
        house: 'Дом', house_d: '+3 за такт, +2 за каждый парк рядом, +20 % у дороги.', bakery: 'Пекарня', bakery_d: '+8 за такт, нужен дом рядом.',
        park: 'Парк', park_d: 'Делает соседей счастливее и богаче.', school: 'Школа', school_d: '+10 % ко всем доходам.', road: 'Дорога', road_d: 'Соединяет здания, ездят машинки.', bull: 'Снос', bull_d: 'Убрать, вернуть 50 %.',
        goal: 'Цель: 10 домов и 70 % довольства', won: 'Городок процветает!', fest: 'Праздник города: +150', nomoney: 'В казне не хватает', reset: 'Новый город', title: 'МАЛЕНЬКИЙ ГОРОД', hint: 'Выбери инструмент · тапни по клетке', go: 'Строить!' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const N = 7;
    const B = { road: { ico: '🛣️', cost: 15 }, house: { ico: '🏠', cost: 60 }, bakery: { ico: '🥐', cost: 150 }, park: { ico: '🌳', cost: 100 }, school: { ico: '🏫', cost: 250 } };
    const d = ctx.data;
    if (!d.cells || d.cells.length !== N * N) Object.assign(d, { cells: Array(N * N).fill(null), money: 300, won: false });
    root.innerHTML = `
      <div class="game-head">
        <span class="stat">💰 <b id="ks-money">0</b></span>
        <span class="stat">👥 <b id="ks-pop">0</b></span>
        <span class="stat">😊 <b id="ks-happy">0</b> %</span>
        <span class="stat">📈 +<b id="ks-inc">0</b> ${s('per')}</span>
      </div>`;
    const { wrap, cv, overlay } = Gfx.mountCanvas(root, { title: s('title'), hint: s('hint'), cta: s('go') });
    const panel = document.createElement('div'); root.appendChild(panel);
    const st = Gfx.setup(cv, wrap, 0.78, 340), g = st.g, P = Gfx.particles(), F = Gfx.floats();
    const $ = id => root.querySelector('#' + id);
    let tool = 'road', tm = 0, started = false, tick = 0, cars = [], placedT = {}, shake = 0, bannerT = 0, bannerTxt = '', day = 0;

    const nb = i => { const r = Math.floor(i / N), c = i % N, out = []; if (r > 0) out.push(i - N); if (r < N - 1) out.push(i + N); if (c > 0) out.push(i - 1); if (c < N - 1) out.push(i + 1); return out; };
    const count = tp => d.cells.filter(x => x === tp).length;
    const onRoad = i => nb(i).some(n => d.cells[n] === 'road');
    function incomeOf(i) {
      const tp = d.cells[i]; let v = 0;
      if (tp === 'house') v = 3 + 2 * nb(i).filter(n => d.cells[n] === 'park').length;
      if (tp === 'bakery' && nb(i).some(n => d.cells[n] === 'house')) v = 8;
      if (v && onRoad(i)) v *= 1.2;
      return v;
    }
    const income = () => Math.floor(d.cells.reduce((a, _, i) => a + incomeOf(i), 0) * (1 + 0.1 * count('school')));
    function happiness() { const h = count('house'); if (!h) return 0; return Math.max(0, Math.min(100, Math.round((count('park') * 2 + count('school') * 3 + count('bakery')) / h * 50 + (count('road') >= 4 ? 5 : 0)))); }
    // iso mapping
    const S0 = () => Math.min(st.W / (N * 2 + 1.5), 26);
    const toScreen = (r, c) => { const sz = S0(); return { x: st.W / 2 + (c - r) * sz, y: st.H * 0.2 + (c + r) * sz / 2, s: sz }; };
    const toCell = (x, y) => { const sz = S0(); const dx = (x - st.W / 2) / sz, dy = (y - st.H * 0.2) / (sz / 2); const c = Math.floor((dx + dy) / 2), r = Math.floor((dy - dx) / 2); return (r >= 0 && r < N && c >= 0 && c < N) ? r * N + c : -1; };

    function renderPanel() {
      panel.innerHTML = `
        <div class="ks-palette" style="margin-top:8px">
          ${Object.entries(B).map(([id, b]) => `<button class="ks-tool ${tool === id ? 'active' : ''}" data-tool="${id}"><span class="ico" style="font-size:22px">${b.ico}</span><b>${s(id)}</b><span>💰 ${b.cost}</span></button>`).join('')}
          <button class="ks-tool ${tool === 'bull' ? 'active' : ''}" data-tool="bull"><span class="ico" style="font-size:22px">🚜</span><b>${s('bull')}</b><span>−50 %</span></button>
        </div>
        <p class="small muted" style="margin:6px 0 0" id="ks-desc">${s(tool + '_d')}</p>
        <p class="small" style="margin:6px 0 0">${d.won ? '🏆 ' + s('won') : '🎯 ' + s('goal')}</p>
        <div class="row mt">
          <button class="btn btn-ad grow" id="ks-fest">🎪 ${s('fest')} · ${t('watch_ad')}</button>
          <button class="btn btn-outline btn-sm" id="ks-reset">${s('reset')}</button>
        </div>`;
      panel.querySelectorAll('.ks-tool').forEach(b => b.addEventListener('click', () => { tool = b.dataset.tool; ctx.sound('click'); panel.querySelectorAll('.ks-tool').forEach(x => x.classList.toggle('active', x.dataset.tool === tool)); $('ks-desc').textContent = s(tool + '_d'); }));
      $('ks-fest').addEventListener('click', async () => { const ok = await ctx.ad(); if (ok) { d.money += 150; ctx.save(); hud(); F.add(st.W / 2, st.H * 0.2, '+150 💰', '#fde047', 22); } });
      $('ks-reset').addEventListener('click', () => { Object.assign(d, { cells: Array(N * N).fill(null), money: 300, won: false }); cars = []; placedT = {}; ctx.save(); hud(); renderPanel(); });
    }
    function hud() { $('ks-money').textContent = d.money; $('ks-pop').textContent = count('house') * 4; $('ks-happy').textContent = happiness(); $('ks-inc').textContent = income(); }
    function place(i) {
      const pos = toScreen(Math.floor(i / N), i % N);
      if (tool === 'bull') { const tp = d.cells[i]; if (!tp) return; const back = Math.floor(B[tp].cost / 2); d.money += back; d.cells[i] = null; ctx.sound('crash'); shake = .3; P.burst(pos.x, pos.y - 10, ['#cbd5e1', '#94a3b8', '#fff'], 12, 200); F.add(pos.x, pos.y - 30, `+${back} 💰`, '#fde047'); cars = cars.filter(c => c.from !== i && c.to !== i); }
      else {
        if (d.cells[i]) return;
        if (d.money < B[tool].cost) { ctx.toast(s('nomoney')); ctx.sound('bad'); return; }
        d.money -= B[tool].cost; d.cells[i] = tool; placedT[i] = 0; ctx.sound(tool === 'road' ? 'tap' : 'place');
        P.burst(pos.x, pos.y - 10, ['#fff', '#fde68a', '#86efac'], 10, 160); F.add(pos.x, pos.y - 30, `−${B[tool].cost}`, '#fecaca');
      }
      ctx.save(); checkWin(); hud();
    }
    function checkWin() {
      if (!d.won && count('house') >= 10 && happiness() >= 70) {
        d.won = true; ctx.save(); ctx.sound('win'); ctx.stars(40); ctx.badge('mayor'); FX.confetti(); bannerTxt = `🏆 ${s('won')}`; bannerT = 2.5; renderPanel();
      }
    }
    function tickIncome() {
      const total = income(); if (!total) return; d.money += total; ctx.save(); hud();
      d.cells.forEach((tp, i) => { const v = incomeOf(i); if (v) { const pos = toScreen(Math.floor(i / N), i % N); F.add(pos.x, pos.y - 34, `+${Math.round(v)}`, '#fde047', 12); } });
      ctx.sound('coin');
    }
    function spawnCars() {
      const roads = d.cells.map((tp, i) => tp === 'road' ? i : -1).filter(i => i >= 0);
      const want = Math.min(4, Math.floor(roads.length / 3));
      cars = cars.filter(c => d.cells[c.from] === 'road' && d.cells[c.to] === 'road');
      while (cars.length < want) { const from = roads[Math.floor(Math.random() * roads.length)]; const opts = nb(from).filter(n => d.cells[n] === 'road'); if (!opts.length) break; cars.push({ from, to: opts[Math.floor(Math.random() * opts.length)], p: Math.random(), speed: Gfx.rnd(.6, 1), color: ['#ef4444', '#3b82f6', '#fbbf24', '#f8fafc'][cars.length % 4] }); }
    }
    function update(dt) {
      tm += dt; day = (Math.sin(tm * 0.07) + 1) / 2; if (shake > 0) shake = Math.max(0, shake - dt * 3); if (bannerT > 0) bannerT -= dt;
      for (const k in placedT) { placedT[k] += dt; if (placedT[k] > 1) delete placedT[k]; }
      if (started) { tick += dt; if (tick >= 2) { tick = 0; tickIncome(); spawnCars(); } }
      for (const c of cars) { c.p += dt * c.speed; if (c.p >= 1) { c.p = 0; const opts = nb(c.to).filter(n => d.cells[n] === 'road' && n !== c.from); const next = opts.length ? opts[Math.floor(Math.random() * opts.length)] : c.from; c.from = c.to; c.to = next; } }
      if (Math.random() < dt * 1.5) { const bk = d.cells.map((tp, i) => tp === 'bakery' ? i : -1).filter(i => i >= 0); if (bk.length) { const i = bk[Math.floor(Math.random() * bk.length)], pos = toScreen(Math.floor(i / N), i % N); P.add({ x: pos.x + 6, y: pos.y - 36, vx: 6, vy: -18, grav: 0, life: 1.6, color: 'rgba(226,232,240,.7)', size: 5, shape: 'circle' }); } }
      P.update(dt); F.update(dt);
    }
    function drawBuilding(tp, x, y, sz, sc, night) {
      g.save(); g.translate(x, y); g.scale(sc, sc); g.translate(-x, -y);
      const s2 = sz * 0.8;
      if (tp === 'house') {
        Gfx.cube(g, x, y, s2, sz * 0.9, '#f8fafc');
        g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(x - s2, y - sz * 0.9); g.lineTo(x, y - sz * 1.5); g.lineTo(x, y + s2 / 2 - sz * 0.9); g.closePath(); g.fill();
        g.fillStyle = '#b91c1c'; g.beginPath(); g.moveTo(x + s2, y - sz * 0.9); g.lineTo(x, y - sz * 1.5); g.lineTo(x, y + s2 / 2 - sz * 0.9); g.closePath(); g.fill();
        g.fillStyle = night > 0.5 ? '#fde68a' : '#60a5fa'; g.fillRect(x - s2 * 0.6, y - sz * 0.6, s2 * 0.25, s2 * 0.25); g.fillRect(x + s2 * 0.35, y - sz * 0.6, s2 * 0.25, s2 * 0.25);
      } else if (tp === 'bakery') {
        Gfx.cube(g, x, y, s2, sz * 1.1, '#fde68a');
        g.fillStyle = '#f472b6'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x - s2 + k * s2 / 2, y - sz * 0.55 + k * s2 / 4); g.lineTo(x - s2 + (k + .5) * s2 / 2, y - sz * 0.55 + (k + .5) * s2 / 4); g.lineTo(x - s2 + (k + .5) * s2 / 2, y - sz * 0.35 + (k + .5) * s2 / 4); g.lineTo(x - s2 + k * s2 / 2, y - sz * 0.35 + k * s2 / 4); g.closePath(); g.fill(); g.fillStyle = k % 2 ? '#f472b6' : '#fff'; }
        g.fillStyle = '#92400e'; g.fillRect(x + s2 * 0.4, y - sz * 1.5, s2 * 0.22, sz * 0.5);
      } else if (tp === 'school') {
        Gfx.cube(g, x, y, s2, sz * 1.6, '#93c5fd');
        g.fillStyle = night > 0.5 ? '#fde68a' : '#1e3a8a'; for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) g.fillRect(x - s2 * 0.85 + k * s2 * 0.3, y - sz * 1.3 + j * sz * 0.5 + k * s2 * 0.15, s2 * 0.16, s2 * 0.22);
        g.fillStyle = '#e2e8f0'; g.fillRect(x - 1, y - sz * 2.3, 2, sz * 0.7); g.fillStyle = '#22c55e'; g.fillRect(x + 1, y - sz * 2.3, s2 * 0.4, s2 * 0.25);
      } else if (tp === 'park') {
        Gfx.tree(g, x - s2 * 0.35, y + 2, sz * 1.1, Math.sin(tm * 2 + x) * 1, { layers: 2 }); Gfx.tree(g, x + s2 * 0.4, y - 4, sz * 0.9, Math.sin(tm * 2.3 + y) * 1, { layers: 2, color: '#4ade80' });
        g.fillStyle = '#f472b6'; g.beginPath(); g.arc(x + s2 * 0.1, y + s2 * 0.3, 2.2, 0, 7); g.fill(); g.fillStyle = '#fde047'; g.beginPath(); g.arc(x - s2 * 0.5, y + s2 * 0.1, 2, 0, 7); g.fill();
      }
      g.restore();
    }
    function draw() {
      const W = st.W, H = st.H, night = Math.max(0, 0.5 - day) * 2;
      Gfx.sky(g, W, H, { hue: 200, t: tm, night, sunX: 0.1 + day * 0.8, sunY: 0.2 - day * 0.1, clouds: true });
      Gfx.hills(g, W, H * 0.3, 10, 'rgba(134,239,172,.5)', 1);
      g.save(); const [sx, sy] = Gfx.shakeXY(shake); g.translate(sx, sy);
      const sz = S0();
      // ground plate
      const a = toScreen(0, 0), b = toScreen(0, N - 1), c2 = toScreen(N - 1, N - 1), e = toScreen(N - 1, 0);
      g.fillStyle = '#65a30d'; g.beginPath(); g.moveTo(a.x, a.y - sz / 2 + 10); g.lineTo(b.x + sz + 0, b.y + 10); g.lineTo(c2.x, c2.y + sz / 2 + 10); g.lineTo(e.x - sz, e.y + 10); g.closePath(); g.fill();
      for (let sum = 0; sum <= 2 * N - 2; sum++) for (let r = 0; r < N; r++) {
        const c = sum - r; if (c < 0 || c >= N) continue;
        const i = r * N + c, tp = d.cells[i], pos = toScreen(r, c);
        const grass = (r + c) % 2 ? '#86efac' : '#a7f3d0';
        if (tp === 'road') {
          Gfx.isoTile(g, pos.x, pos.y, sz, '#64748b');
          g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5; g.setLineDash([3, 3]);
          const hz = d.cells[i - 1] === 'road' || d.cells[i + 1] === 'road' && c < N - 1, vt = (r > 0 && d.cells[i - N] === 'road') || (r < N - 1 && d.cells[i + N] === 'road');
          if (hz || !vt) { g.beginPath(); g.moveTo(pos.x - sz / 2, pos.y - sz / 4); g.lineTo(pos.x + sz / 2, pos.y + sz / 4); g.stroke(); }
          if (vt) { g.beginPath(); g.moveTo(pos.x + sz / 2, pos.y - sz / 4); g.lineTo(pos.x - sz / 2, pos.y + sz / 4); g.stroke(); }
          g.setLineDash([]);
        } else Gfx.isoTile(g, pos.x, pos.y, sz, tp === 'park' ? '#4ade80' : grass, 'rgba(0,0,0,.06)');
        if (tp && tp !== 'road') { const pt = placedT[i]; const sc = pt == null ? 1 : Math.min(1.15, pt * 3) * (pt > 0.4 ? 1 : 1) - (pt > 0.4 && pt < 1 ? (1.15 - 1) * (pt - 0.4) / 0.6 : 0); drawBuilding(tp, pos.x, pos.y, sz, pt == null ? 1 : Math.max(0.05, sc), night); }
        // cars on this tile (draw after tile)
        for (const car of cars) if (car.to === i || (car.from === i && car.p < 0.5)) {
          const f = toScreen(Math.floor(car.from / N), car.from % N), tt = toScreen(Math.floor(car.to / N), car.to % N);
          const x = f.x + (tt.x - f.x) * car.p, y = f.y + (tt.y - f.y) * car.p; if (car.drawn === tm) continue; car.drawn = tm;
          Gfx.cube(g, x, y, sz * 0.28, sz * 0.22, car.color); g.fillStyle = '#fde68a'; g.beginPath(); g.arc(x + (tt.x > f.x ? 4 : -4), y - sz * 0.1, 1.5, 0, 7); g.fill();
        }
      }
      P.draw(g); F.draw(g);
      g.restore();
      if (night > 0.05) { g.fillStyle = `rgba(15,23,42,${night * 0.4})`; g.fillRect(0, 0, W, H); }
      Gfx.banner(g, W, H * 0.35, bannerTxt, bannerT);
    }
    const stop = Gfx.loop(dt => { update(dt); draw(); });
    wrap.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!started) { started = true; overlay.classList.add('hidden'); return; }
      const p = Gfx.point(e, cv); const i = toCell(p.x, p.y + 6); if (i >= 0) place(i);
    });
    const onResize = () => st.resize();
    window.addEventListener('resize', onResize);
    renderPanel(); hud(); spawnCars();
    cv.__ks = { get: () => ({ d, cars, tool }), place, setTool: tp => { tool = tp; }, start: () => { started = true; overlay.classList.add('hidden'); } }; // debug hook
    return { destroy() { stop(); window.removeEventListener('resize', onResize); } };
  }
});
