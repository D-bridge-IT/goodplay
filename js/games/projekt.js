// Projekt des Monats · Brückenbauer: stack bricks from a swinging crane; overhang breaks off, perfect drops combo.
Games.register({
  id: 'projekt', icon: '🧱', bg: '#ffedd5', partner: 'p6',
  name: { de: 'Brückenbauer', ru: 'Строитель моста' },
  tagline: { de: 'Projekt des Monats: Stapel Steine zum Brückenpfeiler. Perfekt getroffen = Kombo.', ru: 'Проект месяца: складывай камни в опору моста. Точное попадание = комбо.' },
  mount(root, ctx) {
    const S = {
      de: { stones: 'Steine', lives: 'Leben', title: 'BRÜCKENBAUER', hint: 'Tippen = Stein fallen lassen · Überstand bricht ab', go: 'Bauen!', done: 'Pfeiler fertig!', fail: 'Der Pfeiler ist eingestürzt', again: 'Noch einmal', repair: 'Reparieren (+2 Leben)', yours: 'Deine Beiträge', community: 'Gemeinschaftsziel', double: 'Beitrag leisten', built: 'Pfeiler', perfect: 'PERFEKT', height: 'Höhe', best: 'Rekord', section: 'Abschnitt' },
      ru: { stones: 'Камни', lives: 'Жизни', title: 'СТРОИТЕЛЬ МОСТА', hint: 'Тап = бросить камень · лишнее отломится', go: 'Строить!', done: 'Опора готова!', fail: 'Опора рухнула', again: 'Ещё раз', repair: 'Починить (+2 жизни)', yours: 'Твои взносы', community: 'Общая цель', double: 'Внести вклад', built: 'Опоры', perfect: 'ИДЕАЛЬНО', height: 'Высота', best: 'Рекорд', section: 'Секция' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const d = ctx.data; d.built = d.built || 0; d.best = d.best || 0;
    const p = ctx.partner, pct = Math.round(p.raised / p.goal * 100), mine = State.data.perPartner.p6 || 0;
    root.innerHTML = `
      <div class="pom" style="margin-top:8px">
        <div class="row between"><span class="pill amber">☕ ${t('project_month')}</span><span class="pill demo">${t('demo')}</span></div>
        <h3 style="font-size:15px">${UI.escapeHtml(p.name)}</h3>
        <div class="progress amber"><i style="width:${pct}%"></i></div>
        <div class="row between small" style="margin-top:6px"><span>${s('community')}: <b>${State.fmtEuro(p.raised)}</b> / ${State.fmtEuro(p.goal)}</span><span>${s('yours')}: <b id="pb-mine">${State.fmtCents(mine)}</b></span></div>
      </div>
      <div class="game-head">
        <span class="stat">🧱 <b id="pb-n">0</b></span>
        <span class="stat" id="pb-lives">❤️❤️❤️</span>
        <span class="stat">🌉 <b id="pb-built">${d.built}</b></span>
        <span class="stat muted">🏆 <span id="pb-best">${d.best}</span></span>
      </div>`;
    const { wrap, cv, overlay } = Gfx.mountCanvas(root, { title: s('title'), hint: s('hint'), cta: s('go') });
    const tools = document.createElement('div'); tools.className = 'cv-tools'; tools.innerHTML = `<button class="btn btn-ad" id="pb-ad">💚 ${s('double')} · ${t('watch_ad')}</button>`; root.appendChild(tools);
    const st = Gfx.setup(cv, wrap, 1.15, 470), g = st.g, P = Gfx.particles(), F = Gfx.floats();
    const $ = id => root.querySelector('#' + id);
    const BH = 26, SECTION = 12, PAL = ['#f97316', '#fb923c', '#ea580c', '#f59e0b', '#fbbf24'];
    let stack, cur, pieces, lives, state = 'ready', camY = 0, tm = 0, shake = 0, streak = 0, bannerT = 0, bannerTxt = '', bannerSub = '', repaired = false, flashT = 0, cheer = 0;

    const sy = i => st.H - 58 - (i + 1) * BH + camY; // screen top of brick i
    function newGame() {
      const w = Math.min(150, st.W * 0.42); stack = [{ x: st.W / 2 - w / 2, w, c: '#94a3b8' }]; pieces = []; lives = 3; streak = 0; camY = 0; repaired = false; spawn(); hud(); state = 'ready'; overlay.classList.remove('hidden');
    }
    function spawn() {
      const top = stack[stack.length - 1], n = stack.length;
      cur = { x: n % 2 ? st.W - top.w - 8 : 8, w: top.w, dir: n % 2 ? -1 : 1, speed: 110 + Math.min(n * 7, 260), y: 0, vy: 0, falling: false, c: PAL[n % PAL.length] };
    }
    function hud() { $('pb-n').textContent = stack.length - 1; $('pb-lives').textContent = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, 3 - lives)); $('pb-built').textContent = d.built; $('pb-best').textContent = d.best; }
    function drop() {
      if (state === 'ready') { state = 'run'; overlay.classList.add('hidden'); return; }
      if (state !== 'run' || cur.falling) return;
      cur.falling = true; cur.vy = 0; ctx.sound('whoosh');
    }
    function land() {
      const top = stack[stack.length - 1], n = stack.length;
      const left = Math.max(cur.x, top.x), right = Math.min(cur.x + cur.w, top.x + top.w), overlap = right - left, dx = cur.x - top.x;
      const cx = cur.x + cur.w / 2, yTop = sy(n);
      if (overlap <= 4) { // missed
        pieces.push({ x: cur.x, w: cur.w, y: yTop - camY, vx: cur.dir * 60, vy: 50, rot: 0, vr: cur.dir * 3, c: cur.c });
        lives--; streak = 0; shake = 1; ctx.sound('oof'); F.add(cx, yTop - 20, '💔', '#fff', 22);
        P.burst(cx, yTop + BH, ['#fed7aa', '#fdba74'], 10, 220);
        hud(); if (lives <= 0) { state = 'over'; setTimeout(endModal, 700); } else spawn();
        return;
      }
      let brick;
      if (Math.abs(dx) <= 6) { // perfect
        streak++; brick = { x: top.x, w: top.w, c: cur.c }; flashT = 1;
        if (streak >= 3 && brick.w < 150) { brick.w = Math.min(150, brick.w + 10); brick.x = top.x + (top.w - brick.w) / 2; }
        ctx.sound('coin', streak); F.add(cx, yTop - 24, streak > 1 ? `${s('perfect')} ×${streak}` : s('perfect'), '#fde047', streak > 1 ? 20 : 16);
        P.burst(cx, yTop + BH / 2, ['#fde047', '#fff', '#fdba74'], 16, 240, { shape: 'circle' });
      } else {
        streak = 0; brick = { x: left, w: overlap, c: cur.c };
        const cutX = dx > 0 ? right : cur.x, cutW = cur.w - overlap;
        pieces.push({ x: cutX, w: cutW, y: yTop - camY, vx: dx > 0 ? 70 : -70, vy: -40, rot: 0, vr: dx > 0 ? 4 : -4, c: cur.c });
        ctx.sound('place'); shake = Math.max(shake, .2);
        P.burst(dx > 0 ? right : left, yTop + BH / 2, ['#fed7aa', '#fdba74', '#fff'], 8, 160);
      }
      stack.push(brick); cheer = 1;
      if ((stack.length - 1) > d.best) { d.best = stack.length - 1; ctx.save(); }
      ctx.stars(1, true);
      if ((stack.length - 1) % SECTION === 0) {
        d.built++; ctx.save(); bannerTxt = `🌉 ${s('done')}`; bannerSub = `${s('section')} ${d.built}`; bannerT = 2; ctx.sound('win'); FX.confetti(); ctx.badge('builder');
        setTimeout(() => ctx.stars(25), 400);
      }
      hud(); spawn();
    }
    function endModal() {
      const actions = [];
      if (!repaired) actions.push({ label: `📺 ${s('repair')} · ${t('watch_ad')}`, cls: 'btn-ad', async onClick() { const ok = await ctx.ad(); if (ok) { repaired = true; lives = 2; hud(); state = 'run'; spawn(); } else endModal(); } });
      actions.push({ label: s('again'), cls: 'btn-primary', onClick: () => newGame() });
      actions.push({ label: t('continue'), cls: 'btn-ghost', onClick: () => Hub.show('home') });
      ctx.modal({ title: s('fail'), dismissible: false, html: `<div class="center" style="font-size:52px">💥</div><div class="stats" style="margin-top:8px"><div class="box"><b>${stack.length - 1}</b><span>${s('height')}</span></div><div class="box"><b>${d.best}</b><span>${s('best')}</span></div></div>`, actions });
    }

    function update(dt) {
      tm += dt; if (shake > 0) shake = Math.max(0, shake - dt * 2.5); if (bannerT > 0) bannerT -= dt; if (flashT > 0) flashT -= dt * 2; if (cheer > 0) cheer -= dt;
      const n = stack.length; const targetCam = Math.max(0, n * BH - st.H * 0.42); camY += (targetCam - camY) * Math.min(1, dt * 5);
      if (state === 'run' && cur) {
        if (!cur.falling) { cur.x += cur.dir * cur.speed * dt; if (cur.x < 4) { cur.x = 4; cur.dir = 1; } if (cur.x + cur.w > st.W - 4) { cur.x = st.W - 4 - cur.w; cur.dir = -1; } }
        else { cur.vy += 2600 * dt; cur.y += cur.vy * dt; if (cur.y >= 60) { cur.y = 60; land(); } }
      }
      for (const q of pieces) { q.vy += 1500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; }
      pieces = pieces.filter(q => q.y + camY < st.H + 200);
      P.update(dt); F.update(dt);
    }
    function draw() {
      const W = st.W, H = st.H, n = stack.length;
      Gfx.sky(g, W, H, { hue: (200 + n * 4) % 360, t: tm, camX: -camY * 0.5, sunX: 0.82, sunY: 0.14 });
      Gfx.hills(g, W, H * 0.55 + camY * 0.2, 14, 'rgba(255,255,255,.35)', 1);
      g.fillStyle = 'rgba(30,41,59,.18)'; for (let i = 0; i < 9; i++) { const bw = 26 + Gfx.hash(i) * 30, bh = 40 + Gfx.hash(i + 3) * 90; g.fillRect(i * W / 8 - 10, H * 0.62 + camY * 0.3 - bh, bw, bh + 200); }
      g.save(); const [sx, sy2] = Gfx.shakeXY(shake); g.translate(sx, sy2);
      // water
      const wy = H - 58 + camY; const grd = g.createLinearGradient(0, wy, 0, H + camY); grd.addColorStop(0, '#60a5fa'); grd.addColorStop(1, '#1d4ed8');
      g.fillStyle = grd; g.beginPath(); g.moveTo(0, H + 400); for (let x = 0; x <= W; x += 10) g.lineTo(x, wy + Math.sin(x * 0.05 + tm * 3) * 3); g.lineTo(W, H + 400); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const yy = wy + 14 + i * 12, ph = tm * 40 + i * 50; g.beginPath(); for (let x = 0; x <= W; x += 6) g.lineTo(x, yy + Math.sin((x + ph) * 0.08) * 2); g.stroke(); }
      // banks with cheering spectators
      Gfx.block(g, -10, wy - 18, 70, 60, '#86efac', { studs: 34 }); Gfx.block(g, W - 60, wy - 18, 70, 60, '#86efac', { studs: 34 });
      const bob = cheer > 0 ? Math.abs(Math.sin(tm * 20)) * 8 : 0;
      Gfx.avatar(g, 14, wy - 18 - 40 - bob, { scale: .9, cheer: cheer > 0, expr: 'happy', colors: { torso: '#f472b6' } });
      Gfx.avatar(g, W - 46, wy - 18 - 40 - bob, { scale: .9, cheer: cheer > 0, expr: 'happy', flip: true, colors: { torso: '#a78bfa', legs: '#1e293b' } });
      // stack
      for (let i = 0; i < n; i++) { const b = stack[i], y = sy(i); if (y > H + 40 || y < -60) continue; Gfx.block(g, b.x, y, b.w, BH, b.c, { studs: 26 }); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(b.x, y + BH - 3, b.w, 3); }
      for (const q of pieces) { g.save(); g.translate(q.x + q.w / 2, q.y + camY + BH / 2); g.rotate(q.rot); Gfx.block(g, -q.w / 2, -BH / 2, q.w, BH, q.c, {}); g.restore(); }
      // crane + current brick
      if (cur && state !== 'over') {
        const y = sy(n) - 60 + cur.y, cx = cur.x + cur.w / 2;
        g.fillStyle = '#475569'; g.fillRect(0, 0, W, 10); g.fillRect(cx - 2, 10, 4, Math.max(0, y - 10)); g.fillRect(cx - 14, y - 8, 28, 8);
        g.fillStyle = '#fbbf24'; g.fillRect(cx - 10, 2, 20, 6);
        Gfx.block(g, cur.x, y, cur.w, BH, cur.c, { studs: 26 });
        const top = stack[n - 1]; g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(cur.x, sy(n), cur.w, 4);
        if (flashT > 0) { g.strokeStyle = `rgba(253,224,71,${flashT})`; g.lineWidth = 4; g.strokeRect(top.x - 4, sy(n - 1) - 4, top.w + 8, BH + 8); }
      }
      P.draw(g); F.draw(g);
      g.restore();
      g.fillStyle = 'rgba(15,23,42,.45)'; Gfx.roundRect(g, 10, 18, 96, 26, 13); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 13px system-ui'; g.textAlign = 'left'; g.fillText(`${s('height')}: ${n - 1}`, 20, 36);
      if (streak > 1) { g.fillStyle = 'rgba(253,224,71,.9)'; Gfx.roundRect(g, W - 96, 18, 86, 26, 13); g.fill(); g.fillStyle = '#78350f'; g.textAlign = 'center'; g.fillText(`🔥 ×${streak}`, W - 53, 36); }
      Gfx.banner(g, W, H * 0.3, bannerTxt, bannerT, bannerSub);
    }
    const stop = Gfx.loop(dt => { update(dt); draw(); });
    wrap.addEventListener('pointerdown', e => { e.preventDefault(); drop(); });
    const onKey = e => { if (e.code === 'Space') { e.preventDefault(); drop(); } };
    window.addEventListener('keydown', onKey);
    $('pb-ad').addEventListener('click', async () => { const was = state; if (state === 'run') state = 'pause'; const ok = await ctx.ad(); if (ok) $('pb-mine').textContent = State.fmtCents(State.data.perPartner.p6 || 0); if (state === 'pause') state = was; });
    const onResize = () => { st.resize(); };
    window.addEventListener('resize', onResize);
    newGame();
    cv.__pb = { get: () => ({ stack, cur, lives, state, streak }), drop, land }; // debug hook
    return { destroy() { stop(); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); } };
  }
});
