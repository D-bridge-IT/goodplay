// Waldklicker: forest tycoon on canvas. Plant plots, shake trees, upgrades, weather, visitors. Partner: Waldfreunde.
Games.register({
  id: 'waldklicker', icon: '🌳', bg: '#dff1e7', partner: 'p1',
  name: { de: 'Waldklicker', ru: 'Лесной кликер' },
  tagline: { de: 'Pflanze 12 Parzellen, schüttle Blätter, hol dir Regen, Bienen und Besuch vom Reh.', ru: 'Засади 12 участков, тряси деревья, лови дождь, пчёл и оленя в гости.' },
  mount(root, ctx) {
    const S = {
      de: { leaves: 'Blätter', trees: 'Bäume', title: 'WALDKLICKER', hint: 'Tippe eine Parzelle: pflanzen · Baum schütteln · Reh streicheln', go: 'Los!', can: 'Gießkanne', can_d: '+1 Blatt pro Schütteln', bees: 'Bienen', bees_d: 'Blätter pro Sekunde je Baum', sprinkler: 'Sprinkler', sprinkler_d: 'Bäume wachsen schneller', ranger: 'Förster', ranger_d: 'schüttelt automatisch', boost: 'Sonnenschein ×2 (30 s)', planted: 'Gepflanzt!', grown: 'Baum ausgewachsen!', rain: 'REGEN! Wachstum ×2', deer: 'Reh!', seed: 'Setzling', noleaves: 'Zu wenig Blätter', fruit: 'Apfel!', ten: '10 Bäume! Ein Partner pflanzt (Demo) einen echten Baum.' },
      ru: { leaves: 'Листья', trees: 'Деревья', title: 'ЛЕСНОЙ КЛИКЕР', hint: 'Тапай участок: посадить · потрясти дерево · погладить оленя', go: 'Погнали!', can: 'Лейка', can_d: '+1 лист за встряску', bees: 'Пчёлы', bees_d: 'листьев в секунду с дерева', sprinkler: 'Спринклер', sprinkler_d: 'деревья растут быстрее', ranger: 'Лесник', ranger_d: 'трясёт автоматически', boost: 'Солнце ×2 (30 с)', planted: 'Посажено!', grown: 'Дерево выросло!', rain: 'ДОЖДЬ! Рост ×2', deer: 'Олень!', seed: 'Саженец', noleaves: 'Мало листьев', fruit: 'Яблоко!', ten: '10 деревьев! Партнёр сажает (демо) настоящее дерево.' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const d = ctx.data;
    if (!d.plots) Object.assign(d, { leaves: 20, trees: 0, plots: Array.from({ length: 12 }, () => ({ st: 0, g: 0 })), up: { can: 0, bees: 0, sprinkler: 0, ranger: 0 }, boostUntil: 0, total: 0 });
    d.plots.forEach((p, i) => { if (p.st === 0 && i === 4 && d.total === 0) { p.st = 1; p.g = 0.1; } }); // one starter sapling
    const UP = [{ id: 'can', ico: '🚿', base: 30, k: 1.6 }, { id: 'bees', ico: '🐝', base: 120, k: 1.8 }, { id: 'sprinkler', ico: '💦', base: 90, k: 1.7 }, { id: 'ranger', ico: '🧑‍🌾', base: 300, k: 2.1 }];
    const cost = u => Math.round(u.base * Math.pow(u.k, d.up[u.id]));
    const seedCost = () => 15 + d.trees * 10;
    root.innerHTML = `
      <div class="game-head">
        <span class="stat">🍃 <b id="wk-leaves">0</b></span>
        <span class="stat">📈 <b id="wk-rate">0</b>/s</span>
        <span class="stat">🌳 <b id="wk-trees">0</b>/12</span>
        <span class="stat muted" id="wk-boost"></span>
      </div>`;
    const { wrap, cv, overlay } = Gfx.mountCanvas(root, { title: s('title'), hint: s('hint'), cta: s('go') });
    const shop = document.createElement('div'); shop.className = 'wk-shop'; root.appendChild(shop);
    const st = Gfx.setup(cv, wrap, 1.05, 440), g = st.g, P = Gfx.particles(), F = Gfx.floats();
    const $ = id => root.querySelector('#' + id);
    let tm = 0, started = false, rainT = 0, nextRain = 25, deer = null, nextDeer = 18, birds = [], shake = 0, bannerT = 0, bannerTxt = '', fruits = [], rangerT = 0, acc = 0, daylight = 0;
    const boosted = () => d.boostUntil > Date.now();
    const mult = () => boosted() ? 2 : 1;

    // plot layout: 3 rows × 4, perspective
    const plotPos = i => { const r = Math.floor(i / 4), c = i % 4, sc = 0.7 + r * 0.15, y = st.H * (0.5 + r * 0.16), spread = st.W * (0.72 + r * 0.14); return { x: st.W / 2 + (c - 1.5) * spread / 3.6, y, sc, r }; };
    const yieldFor = p => (p.st === 3 ? 6 : p.st === 2 ? 3 : p.st === 1 ? 1 : 0) + d.up.can;
    const rate = () => d.plots.filter(p => p.st === 3).length * d.up.bees * 0.5 * mult();

    function renderShop() {
      shop.innerHTML = UP.map(u => `<button class="wk-item ${d.leaves >= cost(u) ? '' : 'poor'}" data-up="${u.id}"><span class="ico">${u.ico}</span><b>${s(u.id)} <small>×${d.up[u.id]}</small></b><span class="small">${s(u.id + '_d')}</span><span class="price">🍃 ${cost(u)}</span></button>`).join('') +
        `<button class="btn btn-ad btn-block" id="wk-ad" style="grid-column:1/-1">☀️ ${s('boost')} · ${t('watch_ad')}</button>`;
      shop.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => { const u = UP.find(x => x.id === b.dataset.up); const c = cost(u); if (d.leaves < c) { ctx.sound('bad'); FX.shake(b); return; } d.leaves -= c; d.up[u.id]++; ctx.sound('buy'); FX.burstAt(b, { type: 'leaves', count: 10 }); ctx.save(); renderShop(); hud(); }));
      $('wk-ad').addEventListener('click', async () => { const ok = await ctx.ad(); if (ok) { d.boostUntil = Date.now() + 30000; ctx.save(); hud(); } });
    }
    function hud() { $('wk-leaves').textContent = Math.floor(d.leaves); $('wk-rate').textContent = rate().toFixed(1); $('wk-trees').textContent = d.plots.filter(p => p.st === 3).length; $('wk-boost').textContent = boosted() ? '☀️ ×2 ' + Math.ceil((d.boostUntil - Date.now()) / 1000) + 's' : (rainT > 0 ? '🌧️ ×2' : ''); shop.querySelectorAll('[data-up]').forEach(b => { const u = UP.find(x => x.id === b.dataset.up); b.classList.toggle('poor', d.leaves < cost(u)); }); }
    function gain(n, x, y, big) { d.leaves += n; d.total += n; F.add(x, y, `+${Math.round(n)} 🍃`, '#dcfce7', big ? 20 : 14); }
    function tapPlot(i) {
      const p = d.plots[i], pos = plotPos(i);
      if (p.st === 0) {
        if (d.leaves < seedCost()) { ctx.toast(s('noleaves')); ctx.sound('bad'); return; }
        d.leaves -= seedCost(); p.st = 1; p.g = 0; ctx.sound('plant'); F.add(pos.x, pos.y - 40, s('planted'), '#fff', 15); P.burst(pos.x, pos.y, ['#86efac', '#bbf7d0', '#92400e'], 12, 160, { up: 1.2 });
      } else {
        const fi = fruits.findIndex(f => f.plot === i);
        if (fi >= 0) { fruits.splice(fi, 1); gain(25 * mult(), pos.x, pos.y - 70 * pos.sc, true); ctx.sound('coin'); P.burst(pos.x, pos.y - 60 * pos.sc, ['#ef4444', '#fca5a5'], 10, 200, { shape: 'circle' }); }
        else { const n = yieldFor(p) * mult(); gain(n, pos.x, pos.y - 70 * pos.sc); p.g = Math.min(1, p.g + 0.02); p.shake = 1; ctx.sound('leaf'); for (let k = 0; k < 4 + p.st * 2; k++) P.add({ x: pos.x + Gfx.rnd(-30, 30) * pos.sc, y: pos.y - Gfx.rnd(30, 80) * pos.sc, vx: Gfx.rnd(-30, 30), vy: Gfx.rnd(-20, 20), grav: 120, drag: 1.5, life: Gfx.rnd(.8, 1.4), color: ['#22c55e', '#4ade80', '#86efac', '#a3e635'][k % 4], size: Gfx.rnd(5, 8) * pos.sc, shape: 'leaf', vr: Gfx.rnd(-6, 6) }); }
      }
      ctx.save(); hud();
    }
    function growAll(dt) {
      const sp = (0.025 + d.up.sprinkler * 0.012) * (rainT > 0 ? 2 : 1) * mult();
      d.plots.forEach((p, i) => {
        if (p.st === 0 || p.st === 3) return;
        p.g += sp * dt;
        if (p.g >= 1) { p.g = 0; p.st++; const pos = plotPos(i); ctx.sound('plant'); P.burst(pos.x, pos.y - 40 * pos.sc, ['#86efac', '#fde047', '#fff'], 14, 200, { up: 1 });
          if (p.st === 3) { d.trees++; ctx.stars(2, true); F.add(pos.x, pos.y - 90 * pos.sc, s('grown'), '#fde047', 16); const grown = d.plots.filter(q => q.st === 3).length; if (grown === 12) FX.confetti(); if (d.trees === 10) { ctx.badge('forest'); ctx.toast(s('ten'), 'good'); FX.confetti(); } }
        }
      });
    }
    function update(dt) {
      tm += dt; daylight = (Math.sin(tm * 0.05) + 1) / 2; if (shake > 0) shake = Math.max(0, shake - dt * 3); if (bannerT > 0) bannerT -= dt;
      if (!started) { P.update(dt); F.update(dt); return; }
      growAll(dt);
      acc += rate() * dt; if (acc >= 1) { const n = Math.floor(acc); acc -= n; d.leaves += n; d.total += n; }
      if (d.up.ranger) { rangerT += dt; if (rangerT > 2.5 / d.up.ranger) { rangerT = 0; const trees = d.plots.map((p, i) => p.st > 0 ? i : -1).filter(i => i >= 0); if (trees.length) { const i = trees[Math.floor(Math.random() * trees.length)]; const p = d.plots[i], pos = plotPos(i); gain(yieldFor(p) * mult(), pos.x, pos.y - 60 * pos.sc); p.shake = 1; } } }
      // weather & visitors
      nextRain -= dt; if (nextRain <= 0 && rainT <= 0) { rainT = 9; nextRain = Gfx.rnd(35, 55); bannerTxt = `🌧️ ${s('rain')}`; bannerT = 1.5; ctx.sound('whoosh'); }
      if (rainT > 0) { rainT -= dt; for (let k = 0; k < 4; k++) P.add({ x: Math.random() * st.W, y: -10, vx: -40, vy: 320, grav: 0, life: 1.3, color: 'rgba(147,197,253,.8)', size: 3, shape: 'rect' }); if (rainT <= 0) nextRain = Gfx.rnd(35, 55); }
      nextDeer -= dt; if (nextDeer <= 0 && !deer) { deer = { x: -40, dir: 1, y: st.H * 0.86, hop: 0 }; nextDeer = Gfx.rnd(30, 50); }
      if (deer) { deer.x += 45 * dt; deer.hop += dt * 9; if (deer.x > st.W + 40) deer = null; }
      if (Math.random() < dt * 0.15) birds.push({ x: -20, y: Gfx.rnd(20, st.H * 0.3), v: Gfx.rnd(40, 70), ph: Math.random() * 6 });
      for (const b of birds) b.x += b.v * dt; birds = birds.filter(b => b.x < st.W + 30);
      if (Math.random() < dt * 0.08) { const grown = d.plots.map((p, i) => p.st === 3 && !fruits.find(f => f.plot === i) ? i : -1).filter(i => i >= 0); if (grown.length) fruits.push({ plot: grown[Math.floor(Math.random() * grown.length)], t: 0 }); }
      for (const f of fruits) f.t += dt;
      for (const p of d.plots) if (p.shake > 0) p.shake = Math.max(0, p.shake - dt * 2.5);
      P.update(dt); F.update(dt);
      if (Math.floor(tm * 4) !== Math.floor((tm - dt) * 4)) hud();
    }
    function draw() {
      const W = st.W, H = st.H, night = Math.max(0, 0.5 - daylight) * 1.4;
      Gfx.sky(g, W, H, { hue: 200 + daylight * 10, t: tm, night, sunX: 0.15 + daylight * 0.7, sunY: 0.3 - daylight * 0.18 });
      Gfx.hills(g, W, H * 0.42, 16, `rgba(74,222,128,${0.35 - night * 0.2})`, 0.5);
      Gfx.hills(g, W, H * 0.48, 10, '#4ade80', 2);
      const grd = g.createLinearGradient(0, H * 0.46, 0, H); grd.addColorStop(0, '#22c55e'); grd.addColorStop(1, '#15803d'); g.fillStyle = grd; g.fillRect(0, H * 0.48, W, H);
      for (const b of birds) { g.strokeStyle = 'rgba(30,41,59,.7)'; g.lineWidth = 2; const f = Math.sin(tm * 12 + b.ph) * 4; g.beginPath(); g.moveTo(b.x - 7, b.y - f); g.lineTo(b.x, b.y); g.lineTo(b.x + 7, b.y - f); g.stroke(); }
      g.save(); const [sx, sy] = Gfx.shakeXY(shake); g.translate(sx, sy);
      // plots back to front
      d.plots.forEach((p, i) => {
        const { x, y, sc } = plotPos(i);
        g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x, y + 4, 34 * sc, 10 * sc, 0, 0, 7); g.fill();
        g.fillStyle = p.st === 0 ? '#a16207' : '#854d0e'; g.beginPath(); g.ellipse(x, y, 30 * sc, 9 * sc, 0, 0, 7); g.fill();
        if (p.st === 0) { g.fillStyle = 'rgba(255,255,255,.8)'; g.font = `bold ${16 * sc}px system-ui`; g.textAlign = 'center'; g.fillText('+', x, y - 8 * sc); g.font = `${10 * sc}px system-ui`; g.fillText(`🍃${seedCost()}`, x, y - 22 * sc); }
        else {
          const sway = Math.sin(tm * 1.5 + i) * 1 + (p.shake || 0) * Math.sin(tm * 40) * 4;
          if (p.st === 1) { g.save(); g.translate(x, y); g.rotate(sway * 0.05); g.fillStyle = '#16a34a'; g.beginPath(); g.ellipse(-6 * sc, -12 * sc, 7 * sc, 4 * sc, -0.6, 0, 7); g.ellipse(6 * sc, -14 * sc, 7 * sc, 4 * sc, 0.6, 0, 7); g.fill(); g.fillStyle = '#15803d'; g.fillRect(-1.5 * sc, -16 * sc, 3 * sc, 16 * sc); g.restore(); }
          else Gfx.tree(g, x, y, (p.st === 2 ? 70 : 110) * sc, sway, { layers: p.st === 2 ? 2 : 3, color: p.st === 2 ? '#4ade80' : '#22c55e' });
          if (p.st < 3) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x - 18 * sc, y + 10 * sc, 36 * sc, 4 * sc); g.fillStyle = '#fde047'; g.fillRect(x - 18 * sc, y + 10 * sc, 36 * sc * p.g, 4 * sc); }
          const fr = fruits.find(f => f.plot === i); if (fr) { const fy = y - 80 * sc + Math.sin(fr.t * 3) * 4; g.fillStyle = '#ef4444'; g.beginPath(); g.arc(x + 14 * sc, fy, 7 * sc, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 11 * sc, fy - 2 * sc, 2 * sc, 0, 7); g.fill(); }
        }
        if (d.up.bees && p.st === 3) { g.fillStyle = '#fbbf24'; for (let k = 0; k < Math.min(3, d.up.bees); k++) { const a = tm * 3 + k * 2 + i; g.beginPath(); g.arc(x + Math.cos(a) * 26 * sc, y - 60 * sc + Math.sin(a * 1.7) * 14 * sc, 2.5, 0, 7); g.fill(); } }
      });
      if (deer) { // blocky deer
        const dy = deer.y - Math.abs(Math.sin(deer.hop)) * 8; g.fillStyle = '#b45309'; g.fillRect(deer.x - 18, dy - 22, 36, 18); g.fillRect(deer.x + 12, dy - 36, 14, 18); g.fillStyle = '#92400e'; g.fillRect(deer.x - 14, dy - 4, 5, 12); g.fillRect(deer.x + 8, dy - 4, 5, 12); g.strokeStyle = '#78350f'; g.lineWidth = 2; g.beginPath(); g.moveTo(deer.x + 18, dy - 36); g.lineTo(deer.x + 14, dy - 46); g.moveTo(deer.x + 22, dy - 36); g.lineTo(deer.x + 26, dy - 46); g.stroke(); g.fillStyle = '#1e293b'; g.fillRect(deer.x + 21, dy - 32, 2, 2); g.fillStyle = '#fff'; g.font = 'bold 11px system-ui'; g.textAlign = 'center'; g.fillText('❤️ +30', deer.x, dy - 52); }
      P.draw(g); F.draw(g);
      g.restore();
      if (night > 0.05) { g.fillStyle = `rgba(15,23,42,${night * 0.35})`; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(253,224,71,.8)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc((Gfx.hash(k) * W + Math.sin(tm + k) * 20), H * 0.5 + Gfx.hash(k + 4) * H * 0.4 + Math.cos(tm * 0.7 + k) * 10, 1.5 + Math.sin(tm * 3 + k), 0, 7); g.fill(); } }
      if (rainT > 0) { g.fillStyle = 'rgba(100,116,139,.25)'; g.fillRect(0, 0, W, H); }
      Gfx.banner(g, W, H * 0.3, bannerTxt, bannerT);
    }
    const stop = Gfx.loop(dt => { update(dt); draw(); });
    wrap.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!started) { started = true; overlay.classList.add('hidden'); return; }
      const pt = Gfx.point(e, cv);
      if (deer && Math.abs(pt.x - deer.x) < 40 && Math.abs(pt.y - deer.y + 20) < 40) { gain(30 * mult(), deer.x, deer.y - 50, true); ctx.sound('win'); P.burst(deer.x, deer.y - 20, ['#f472b6', '#fb7185', '#fff'], 14, 200, { shape: 'circle' }); deer = null; ctx.save(); hud(); return; }
      let best = -1, bd = 1e9;
      d.plots.forEach((p, i) => { const pos = plotPos(i); const dx = pt.x - pos.x, dy = pt.y - (pos.y - 35 * pos.sc); const dist = dx * dx / (40 * pos.sc) ** 2 + dy * dy / (60 * pos.sc) ** 2; if (dist < bd) { bd = dist; best = i; } });
      if (best >= 0 && bd < 1.3) tapPlot(best);
    });
    const onResize = () => st.resize();
    window.addEventListener('resize', onResize);
    renderShop(); hud();
    cv.__wk = { get: () => ({ d, deer, rainT, fruits, started }), tapPlot, start: () => { started = true; overlay.classList.add('hidden'); } }; // debug hook
    return { destroy() { stop(); window.removeEventListener('resize', onResize); ctx.save(); } };
  }
});
