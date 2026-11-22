// Pfoten in Reihe: canvas match-3 with specials, cascades, levels. Partner: Tierheim.
Games.register({
  id: 'pfoten', icon: '🐾', bg: '#fde7ec', partner: 'p2',
  name: { de: 'Pfoten in Reihe', ru: 'Лапки в ряд' },
  tagline: { de: 'Match-3 mit Streifen-Tieren und Regenbogen-Knochen. Level für Level.', ru: 'Match-3 с полосатыми зверями и радужной косточкой. Уровень за уровнем.' },
  mount(root, ctx) {
    const S = {
      de: { level: 'Level', moves: 'Züge', score: 'Punkte', goal: 'Ziel', won: 'Level geschafft!', lost: 'Keine Züge mehr', more: '+5 Züge', again: 'Noch einmal', next: 'Nächstes Level', title: 'PFOTEN IN REIHE', hint: 'Tausche zwei Nachbarn · 4er = Streifen · 5er = Regenbogen', go: 'Los!', combo: 'KOMBO', shuffle: 'Neu gemischt' },
      ru: { level: 'Уровень', moves: 'Ходы', score: 'Очки', goal: 'Цель', won: 'Уровень пройден!', lost: 'Ходы кончились', more: '+5 ходов', again: 'Ещё раз', next: 'Следующий уровень', title: 'ЛАПКИ В РЯД', hint: 'Меняй соседей · 4 в ряд = полоска · 5 = радуга', go: 'Погнали!', combo: 'КОМБО', shuffle: 'Перемешано' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const d = ctx.data; d.level = d.level || 1; d.best = d.best || 0;
    root.innerHTML = `
      <div class="game-head">
        <span class="stat">🏆 ${s('level')} <b id="m3-level">${d.level}</b></span>
        <span class="stat">🎯 <b id="m3-score">0</b> / <span id="m3-goal">0</span></span>
        <span class="stat">👣 <b id="m3-moves">20</b></span>
      </div>
      <div class="progress rose" style="margin-bottom:8px"><i id="m3-bar" style="width:0%"></i></div>`;
    const { wrap, cv, overlay } = Gfx.mountCanvas(root, { title: s('title'), hint: s('hint'), cta: s('go') });
    const st = Gfx.setup(cv, wrap, 1.02, 440), g = st.g;
    const P = Gfx.particles(), F = Gfx.floats();
    const N = 7, TYPES = ['cat', 'dog', 'rabbit', 'hamster', 'paw'];
    const COL = { cat: '#f472b6', dog: '#fbbf24', rabbit: '#a78bfa', hamster: '#fb923c', paw: '#60a5fa', bomb: '#1e293b' };
    let cell, ox, oy, grid, sel, moves, score, goal, chain, busy, phase, drag, tm = 0, shake = 0, idle = 0, hintCell = null, extraUsed = false, bannerT = 0, bannerTxt = '', started = false;
    const $ = id => root.querySelector('#' + id);

    const layout = () => { cell = Math.floor(Math.min(st.W - 24, st.H - 24) / N); ox = (st.W - cell * N) / 2; oy = (st.H - cell * N) / 2; };
    const mk = (t, r) => ({ t, y: r, vy: 0, scale: 1, pop: 0, special: null });
    const rndType = () => TYPES[Math.floor(Math.random() * TYPES.length)];
    function newGrid() {
      grid = [];
      for (let r = 0; r < N; r++) { grid.push([]); for (let c = 0; c < N; c++) { let tp; do { tp = rndType(); } while ((c >= 2 && grid[r][c - 1].t === tp && grid[r][c - 2].t === tp) || (r >= 2 && grid[r - 1][c].t === tp && grid[r - 2][c].t === tp)); grid[r].push(mk(tp, r)); } }
      if (!findMove()) newGrid();
    }
    function newLevel() { moves = 20; score = 0; goal = 700 + d.level * 400; chain = 0; busy = false; phase = 'idle'; sel = null; extraUsed = false; newGrid(); hud(); }
    function hud() { $('m3-level').textContent = d.level; $('m3-score').textContent = score; $('m3-goal').textContent = goal; $('m3-moves').textContent = moves; $('m3-bar').style.width = Math.min(100, score / goal * 100) + '%'; }

    /* ---------- matching ---------- */
    function runs(gr) {
      const marks = new Set(), specials = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N;) { const tp = gr[r][c].t; if (tp === 'bomb') { c++; continue; } let k = c; while (k < N && gr[r][k].t === tp) k++; if (k - c >= 3) { for (let i = c; i < k; i++) marks.add(r * N + i); if (k - c >= 4) specials.push({ r, c: c + Math.floor((k - c) / 2), kind: k - c >= 5 ? 'bomb' : 'h' }); } c = k; }
      for (let c = 0; c < N; c++) for (let r = 0; r < N;) { const tp = gr[r][c].t; if (tp === 'bomb') { r++; continue; } let k = r; while (k < N && gr[k][c].t === tp) k++; if (k - r >= 3) { for (let i = r; i < k; i++) marks.add(i * N + c); if (k - r >= 4) specials.push({ r: r + Math.floor((k - r) / 2), c, kind: k - r >= 5 ? 'bomb' : 'v' }); } r = k; }
      return { marks, specials };
    }
    function findMove() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc; if (r2 >= N || c2 >= N) continue;
        if (grid[r][c].t === 'bomb' || grid[r2][c2].t === 'bomb') return [r, c, r2, c2];
        [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
        const ok = runs(grid).marks.size > 0;
        [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
        if (ok) return [r, c, r2, c2];
      }
      return null;
    }
    function expand(marks) { // striped tiles in a match clear their line; iterate until stable
      let changed = true;
      while (changed) {
        changed = false;
        for (const k of Array.from(marks)) { const r = Math.floor(k / N), c = k % N, sp = grid[r][c].special; if (!sp) continue;
          if (sp === 'h') for (let i = 0; i < N; i++) { if (!marks.has(r * N + i)) { marks.add(r * N + i); changed = true; } }
          if (sp === 'v') for (let i = 0; i < N; i++) { if (!marks.has(i * N + c)) { marks.add(i * N + c); changed = true; } }
          grid[r][c].special = null; }
      }
    }
    async function trySwap(r1, c1, r2, c2) {
      if (busy) return; busy = true; idle = 0; hintCell = null;
      const a = grid[r1][c1], b = grid[r2][c2];
      ctx.sound('tap');
      await animSwap(r1, c1, r2, c2);
      [grid[r1][c1], grid[r2][c2]] = [b, a];
      let marks;
      if (a.t === 'bomb' || b.t === 'bomb') {
        const other = a.t === 'bomb' ? b.t : a.t; marks = new Set();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c].t === other || grid[r][c].t === 'bomb') marks.add(r * N + c);
        ctx.sound('win'); shake = 1;
      } else {
        const res = runs(grid); marks = res.marks;
        if (!marks.size) { ctx.sound('bad'); await animSwap(r2, c2, r1, c1); [grid[r1][c1], grid[r2][c2]] = [a, b]; busy = false; return; }
        for (const sp of res.specials) { const tgt = grid[sp.r][sp.c]; tgt.special = sp.kind === 'bomb' ? null : sp.kind; if (sp.kind === 'bomb') { tgt.t = 'bomb'; } marks.delete(sp.r * N + sp.c); }
      }
      moves--; chain = 0; hud();
      await resolve(marks);
      if (score >= goal) return levelWon();
      if (moves <= 0) return levelLost();
      if (!findMove()) { bannerTxt = s('shuffle'); bannerT = 1.2; newGrid(); }
      busy = false;
    }
    function animSwap(r1, c1, r2, c2) {
      return new Promise(res => { const a = grid[r1][c1], b = grid[r2][c2]; a.dx = c2 - c1; a.dy = r2 - r1; b.dx = c1 - c2; b.dy = r1 - r2; a.sw = 0; b.sw = 0; const t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / 150); a.sw = k; b.sw = k; if (k < 1) requestAnimationFrame(step); else { delete a.dx; delete b.dx; delete a.sw; delete b.sw; res(); } }; step(); });
    }
    async function resolve(marks) {
      while (marks.size) {
        chain++; expand(marks);
        const pts = marks.size * 10 * chain; score += pts; if (score > d.best) { d.best = score; ctx.save(); }
        let cx = 0, cy = 0;
        for (const k of marks) { const r = Math.floor(k / N), c = k % N, tile = grid[r][c]; tile.pop = 1; const px = ox + c * cell + cell / 2, py = oy + tile.y * cell + cell / 2; cx += px; cy += py; P.burst(px, py, [COL[tile.t] || '#fff', '#fff', '#fda4af'], 6, 160, { shape: 'circle', size: .8 }); }
        cx /= marks.size; cy /= marks.size;
        F.add(cx, cy, `+${pts}`, '#fff', chain > 1 ? 20 : 15);
        if (chain > 1) { F.add(st.W / 2, oy - 6, `${s('combo')} ×${chain}`, '#fde047', 22); shake = Math.min(1, .3 + chain * .2); ctx.sound('cascade', chain); } else ctx.sound('match');
        hud();
        await wait(220);
        // remove & gravity
        for (let c = 0; c < N; c++) {
          const keep = []; for (let r = N - 1; r >= 0; r--) if (!marks.has(r * N + c)) keep.push(grid[r][c]);
          let r = N - 1; for (const tile of keep) { grid[r][c] = tile; r--; }
          let k = 1; for (; r >= 0; r--) { const tile = mk(rndType(), -k); tile.vy = 0; grid[r][c] = tile; k++; }
        }
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c].pop = 0;
        await settle();
        marks = runs(grid).marks;
        for (const sp of runs(grid).specials) { const tg = grid[sp.r][sp.c]; if (sp.kind === 'bomb') tg.t = 'bomb'; else tg.special = sp.kind; marks.delete(sp.r * N + sp.c); }
      }
    }
    const wait = ms => new Promise(r => setTimeout(r, ms));
    function settle() { return new Promise(res => { const check = () => { let moving = false; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (Math.abs(grid[r][c].y - r) > 0.01 || grid[r][c].vy !== 0) moving = true; if (moving) requestAnimationFrame(check); else res(); }; check(); }); }
    function levelWon() {
      phase = 'won'; ctx.sound('win'); FX.confetti(); const stars = 5 + d.level * 2;
      if (d.level >= 3) ctx.badge('paws');
      setTimeout(() => { ctx.stars(stars); ctx.modal({ title: s('won'), dismissible: false, html: `<div class="center" style="font-size:48px">🐾</div><div class="stats" style="margin-top:8px"><div class="box"><b>${score}</b><span>${s('score')}</span></div><div class="box"><b>${d.level}</b><span>${s('level')}</span></div></div>`, actions: [{ label: s('next'), cls: 'btn-primary', onClick() { d.level++; ctx.save(); newLevel(); } }] }); }, 500);
    }
    function levelLost() {
      phase = 'lost'; ctx.sound('fail');
      const actions = [];
      if (!extraUsed) actions.push({ label: `📺 ${s('more')} · ${t('watch_ad')}`, cls: 'btn-ad', async onClick() { const ok = await ctx.ad(); if (ok) { extraUsed = true; moves = 5; phase = 'idle'; busy = false; hud(); } else levelLost(); } });
      actions.push({ label: s('again'), cls: 'btn-primary', onClick() { newLevel(); } });
      setTimeout(() => ctx.modal({ title: s('lost'), dismissible: false, html: `<div class="center" style="font-size:48px">😿</div><p class="center">${score} / ${goal} ${s('score')}</p>`, actions }), 400);
    }

    /* ---------- drawing ---------- */
    function pet(tp, x, y, size, sc, special) {
      const r = size * 0.42 * sc; g.save(); g.translate(x, y);
      if (tp === 'bomb') { // rainbow bone
        const grd = g.createLinearGradient(-r, -r, r, r); ['#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'].forEach((c, i) => grd.addColorStop(i / 4, c));
        g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.fillStyle = '#fff'; Gfx.roundRect(g, -r * .6, -r * .18, r * 1.2, r * .36, r * .18); g.fill(); [[-r * .6, -r * .25], [-r * .6, r * .25], [r * .6, -r * .25], [r * .6, r * .25]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, r * .22, 0, 7); g.fill(); });
        g.restore(); return;
      }
      const c = COL[tp];
      g.fillStyle = Gfx.shade(c, -0.25); Gfx.roundRect(g, -r + 3, -r + 4, r * 2, r * 2, r * .45); g.fill();
      g.fillStyle = c; Gfx.roundRect(g, -r, -r, r * 2, r * 2, r * .45); g.fill();
      g.fillStyle = Gfx.shade(c, 0.35); Gfx.roundRect(g, -r, -r, r * 2, r * .5, r * .45); g.fill();
      g.fillStyle = c; g.fillRect(-r, -r * .6, r * 2, r * .3);
      // ears / details per type
      g.fillStyle = Gfx.shade(c, -0.15);
      if (tp === 'cat') { g.beginPath(); g.moveTo(-r * .9, -r * .7); g.lineTo(-r * .6, -r * 1.35); g.lineTo(-r * .2, -r * .8); g.fill(); g.beginPath(); g.moveTo(r * .9, -r * .7); g.lineTo(r * .6, -r * 1.35); g.lineTo(r * .2, -r * .8); g.fill(); }
      if (tp === 'dog') { Gfx.roundRect(g, -r * 1.15, -r * .7, r * .45, r * 1.1, r * .2); g.fill(); Gfx.roundRect(g, r * .7, -r * .7, r * .45, r * 1.1, r * .2); g.fill(); }
      if (tp === 'rabbit') { Gfx.roundRect(g, -r * .7, -r * 1.9, r * .45, r * 1.2, r * .22); g.fill(); Gfx.roundRect(g, r * .25, -r * 1.9, r * .45, r * 1.2, r * .22); g.fill(); }
      if (tp === 'hamster') { g.beginPath(); g.arc(-r * .75, -r * .85, r * .3, 0, 7); g.arc(r * .75, -r * .85, r * .3, 0, 7); g.fill(); }
      if (tp === 'paw') { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, r * .25, r * .5, r * .4, 0, 0, 7); g.fill(); [[-r * .55, -r * .3], [-r * .2, -r * .55], [r * .2, -r * .55], [r * .55, -r * .3]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, r * .18, 0, 7); g.fill(); }); g.restore(); if (special) stripes(x, y, r, special); return; }
      // face
      g.fillStyle = '#1e293b'; g.beginPath(); g.arc(-r * .32, -r * .1, r * .13, 0, 7); g.arc(r * .32, -r * .1, r * .13, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * .28, -r * .14, r * .05, 0, 7); g.arc(r * .36, -r * .14, r * .05, 0, 7); g.fill();
      g.fillStyle = tp === 'rabbit' ? '#fda4af' : '#1e293b'; g.beginPath(); g.ellipse(0, r * .25, r * .14, r * .1, 0, 0, 7); g.fill();
      g.strokeStyle = '#1e293b'; g.lineWidth = Math.max(1, r * .08); g.beginPath(); g.arc(-r * .14, r * .3, r * .15, 0.1, Math.PI - .3); g.arc(r * .14, r * .3, r * .15, 0.3, Math.PI - .1); g.stroke();
      g.restore();
      if (special) stripes(x, y, r, special);
    }
    function stripes(x, y, r, sp) { g.save(); g.translate(x, y); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; for (let i = -2; i <= 2; i += 2) { g.beginPath(); if (sp === 'h') { g.moveTo(-r * .8, i * r * .3); g.lineTo(r * .8, i * r * .3); } else { g.moveTo(i * r * .3, -r * .8); g.lineTo(i * r * .3, r * .8); } g.stroke(); } g.restore(); }
    function draw() {
      const W = st.W, H = st.H;
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fbcfe8'); bg.addColorStop(1, '#fde68a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) { const px = (Gfx.hash(i) * W + tm * (8 + i)) % (W + 40) - 20, py = Gfx.hash(i + 7) * H; g.beginPath(); g.arc(px, py, 3 + Gfx.hash(i + 3) * 5, 0, 7); g.fill(); }
      g.save(); const [sx, sy] = Gfx.shakeXY(shake); g.translate(sx, sy);
      g.fillStyle = 'rgba(255,255,255,.55)'; Gfx.roundRect(g, ox - 8, oy - 8, cell * N + 16, cell * N + 16, 18); g.fill();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { g.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.15)'; Gfx.roundRect(g, ox + c * cell + 2, oy + r * cell + 2, cell - 4, cell - 4, 8); g.fill(); }
      if (hintCell) { const [r, c] = hintCell; g.strokeStyle = `rgba(255,255,255,${.5 + Math.sin(tm * 8) * .4})`; g.lineWidth = 3; Gfx.roundRect(g, ox + c * cell + 2, oy + r * cell + 2, cell - 4, cell - 4, 8); g.stroke(); }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const tile = grid[r][c]; let x = ox + c * cell + cell / 2, y = oy + tile.y * cell + cell / 2;
        if (tile.sw != null) { x += tile.dx * cell * tile.sw; y += tile.dy * cell * tile.sw; }
        let sc = tile.scale; if (tile.pop) sc *= Math.max(0.05, 1 - tile.pop * 0.9 + Math.sin(tm * 40) * .05);
        const isSel = sel && sel[0] === r && sel[1] === c;
        if (isSel) { sc *= 1.12 + Math.sin(tm * 10) * .04; g.fillStyle = 'rgba(255,255,255,.7)'; Gfx.roundRect(g, ox + c * cell + 1, oy + r * cell + 1, cell - 2, cell - 2, 9); g.fill(); }
        if (tile.y < -0.5) continue;
        pet(tile.t, x, y, cell, sc, tile.special);
      }
      P.draw(g); F.draw(g);
      g.restore();
      Gfx.banner(g, W, H * 0.4, bannerTxt, bannerT);
    }
    function update(dt) {
      tm += dt; if (shake > 0) shake = Math.max(0, shake - dt * 3); if (bannerT > 0) bannerT -= dt;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const tile = grid[r][c];
        if (tile.y < r || tile.vy !== 0) { tile.vy += 38 * dt; tile.y += tile.vy * dt; if (tile.y >= r) { tile.y = r; if (tile.vy > 2) { tile.vy = -tile.vy * 0.25; tile.scale = 1.15; } else tile.vy = 0; } }
        else if (tile.y > r) { tile.y = r; tile.vy = 0; }
        if (tile.pop) tile.pop = Math.min(1, tile.pop + dt * 3);
        tile.scale += (1 - tile.scale) * Math.min(1, dt * 12);
      }
      P.update(dt); F.update(dt);
      if (started && !busy && phase === 'idle') { idle += dt; if (idle > 5 && !hintCell) { const m = findMove(); if (m) hintCell = [m[0], m[1]]; } }
    }
    const stop = Gfx.loop(dt => { update(dt); draw(); });

    /* ---------- input ---------- */
    const cellAt = e => { const p = Gfx.point(e, cv); const c = Math.floor((p.x - ox) / cell), r = Math.floor((p.y - oy) / cell); return (r >= 0 && r < N && c >= 0 && c < N) ? [r, c] : null; };
    wrap.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!started) { started = true; overlay.classList.add('hidden'); return; }
      if (busy || phase !== 'idle') return;
      const rc = cellAt(e); if (!rc) return;
      idle = 0; hintCell = null;
      if (sel && Math.abs(sel[0] - rc[0]) + Math.abs(sel[1] - rc[1]) === 1) { const [r1, c1] = sel; sel = null; trySwap(r1, c1, rc[0], rc[1]); return; }
      sel = rc; drag = rc; ctx.sound('click');
    });
    wrap.addEventListener('pointermove', e => {
      if (!drag || busy) return; const rc = cellAt(e); if (!rc) return;
      if (Math.abs(drag[0] - rc[0]) + Math.abs(drag[1] - rc[1]) === 1) { const [r1, c1] = drag; drag = null; sel = null; trySwap(r1, c1, rc[0], rc[1]); }
    });
    wrap.addEventListener('pointerup', () => { drag = null; });
    const onResize = () => { st.resize(); layout(); };
    window.addEventListener('resize', onResize);
    layout(); newLevel();
    cv.__m3 = { get: () => ({ grid, moves, score, goal, busy, phase, chain }), findMove, trySwap, start: () => { started = true; overlay.classList.add('hidden'); } }; // debug hook
    return { destroy() { stop(); window.removeEventListener('resize', onResize); } };
  }
});
