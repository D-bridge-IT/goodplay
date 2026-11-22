// Pfoten in Reihe: match-3 with shelter animals. 20 moves, target 1 000 points.
Games.register({
  id: 'pfoten', icon: '🐾', bg: '#fde7ec', partner: 'p2',
  name: { de: 'Pfoten in Reihe', ru: 'Лапки в ряд' },
  tagline: { de: 'Drei gleiche Tiere in eine Reihe – klassisches Match-3.', ru: 'Три одинаковых животных в ряд — классический match-3.' },
  mount(root, ctx) {
    const S = {
      de: { target: 'Ziel', over: 'Runde vorbei', reached: 'Ziel erreicht!', missed: 'Knapp daneben', more: '+5 Züge', newround: 'Neue Runde', intro: 'Tippe zwei benachbarte Felder, um sie zu tauschen.' },
      ru: { target: 'Цель', over: 'Раунд окончен', reached: 'Цель достигнута!', missed: 'Чуть-чуть не хватило', more: '+5 ходов', newround: 'Новый раунд', intro: 'Нажми два соседних поля, чтобы поменять их местами.' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const N = 7, TYPES = ['paw', 'dog', 'cat', 'rabbit', 'hamster'], TARGET = 1000, MOVES = 20;
    const d = ctx.data; d.best = d.best || 0;
    let grid, sel, moves, score, busy, extraUsed, popping = new Set(), fresh = new Set(), over = false;
    const rnd = () => TYPES[Math.floor(Math.random() * TYPES.length)];
    const wait = ms => new Promise(r => setTimeout(r, ms));

    function createsMatch(r, c, tp) {
      return (c >= 2 && grid[r][c - 1] === tp && grid[r][c - 2] === tp) || (r >= 2 && grid[r - 1][c] === tp && grid[r - 2][c] === tp);
    }
    function newGame() {
      moves = MOVES; score = 0; sel = null; busy = false; extraUsed = false; over = false; grid = [];
      for (let r = 0; r < N; r++) { grid[r] = []; for (let c = 0; c < N; c++) { let tp; do { tp = rnd(); } while (createsMatch(r, c, tp)); grid[r][c] = tp; } }
      render();
    }
    function findMatches() {
      const m = new Set();
      for (let r = 0; r < N; r++) for (let c = 0; c < N - 2; c++) {
        const tp = grid[r][c]; if (!tp) continue;
        let k = c; while (k < N && grid[r][k] === tp) k++;
        if (k - c >= 3) { for (let i = c; i < k; i++) m.add(r * N + i); c = k - 1; }
      }
      for (let c = 0; c < N; c++) for (let r = 0; r < N - 2; r++) {
        const tp = grid[r][c]; if (!tp) continue;
        let k = r; while (k < N && grid[k][c] === tp) k++;
        if (k - r >= 3) { for (let i = r; i < k; i++) m.add(i * N + c); r = k - 1; }
      }
      return m;
    }
    function collapse() {
      fresh = new Set();
      for (let c = 0; c < N; c++) {
        const col = []; for (let r = N - 1; r >= 0; r--) if (grid[r][c]) col.push(grid[r][c]);
        const missing = N - col.length;
        for (let r = N - 1; r >= 0; r--) { grid[r][c] = col[N - 1 - r] || rnd(); if (r < missing) fresh.add(r * N + c); }
      }
    }
    async function onCell(r, c) {
      if (busy || over) return;
      if (!sel) { sel = [r, c]; ctx.sound('tap'); render(); return; }
      const [sr, sc] = sel;
      if (sr === r && sc === c) { sel = null; render(); return; }
      if (Math.abs(sr - r) + Math.abs(sc - c) !== 1) { sel = [r, c]; ctx.sound('tap'); render(); return; }
      busy = true;
      [grid[sr][sc], grid[r][c]] = [grid[r][c], grid[sr][sc]]; render(); await wait(160);
      let m = findMatches();
      if (!m.size) { [grid[sr][sc], grid[r][c]] = [grid[r][c], grid[sr][sc]]; ctx.sound('bad'); sel = null; busy = false; render(); return; }
      moves--; sel = null; let chain = 0;
      while (m.size) {
        chain++; const pts = m.size * 10 * chain; score += pts; ctx.sound(chain > 1 ? 'cascade' : 'match', chain);
        popping = m; render();
        const first = [...m][Math.floor(m.size / 2)]; const cell = root.querySelectorAll('.m3-cell')[first];
        FX.burstAt(cell, { type: chain > 1 ? 'sparks' : 'hearts', count: 10, spread: 70 });
        FX.floatAt(cell, chain > 1 ? `×${chain} +${pts}` : `+${pts}`, chain > 1 ? 'indigo big' : 'rose');
        await wait(260);
        m.forEach(i => { grid[Math.floor(i / N)][i % N] = null; }); popping = new Set();
        collapse(); render(); fresh = new Set(); await wait(220);
        m = findMatches();
      }
      busy = false; render();
      if (moves <= 0) endRound();
    }
    function endRound() {
      over = true;
      if (score > d.best) { d.best = score; ctx.save(); }
      const reached = score >= TARGET;
      const stars = reached ? 25 : Math.floor(score / 50);
      if (stars) ctx.stars(stars);
      if (reached) { ctx.sound('win'); ctx.badge('paws'); FX.confetti(); }
      const actions = [];
      if (!reached && !extraUsed) actions.push({ label: `📺 ${s('more')} · ${t('watch_ad')}`, cls: 'btn-ad', async onClick() { const ok = await ctx.ad(); if (ok) { extraUsed = true; moves = 5; over = false; render(); } } });
      actions.push({ label: s('newround'), cls: 'btn-primary', onClick: newGame });
      ctx.modal({ title: reached ? s('reached') : s('over'), dismissible: false,
        html: `<div class="center" style="font-size:44px">${reached ? '🏆' : '🐾'}</div><p class="center"><b style="font-size:24px;color:var(--ink)">${score}</b> ${t('score')} · ${s('target')} ${TARGET}</p>${!reached ? `<p class="center">${s('missed')}</p>` : ''}`,
        actions });
    }
    function render() {
      root.innerHTML = `
        <div class="game-head">
          <span class="stat">🏅 ${score} / ${TARGET}</span>
          <span class="stat">🔁 ${moves} ${t('moves')}</span>
          <span class="stat muted">🥇 ${d.best}</span>
        </div>
        <div class="game-area">
          <div class="progress indigo" style="margin-bottom:10px"><i style="width:${Math.min(100, score / TARGET * 100)}%"></i></div>
          <div class="m3-grid">${grid.map((row, r) => row.map((tp, c) =>
            `<button class="m3-cell ${sel && sel[0] === r && sel[1] === c ? 'sel' : ''} ${popping.has(r * N + c) ? 'pop' : ''} ${fresh.has(r * N + c) ? 'fall' : ''} ${tp ? '' : 'empty'}" data-r="${r}" data-c="${c}">${tp ? Art.animal(tp) : ''}</button>`).join('')).join('')}</div>
          <p class="small muted center" style="margin:10px 0 0">${s('intro')}</p>
        </div>`;
      root.querySelectorAll('.m3-cell').forEach(b => b.addEventListener('click', () => onCell(+b.dataset.r, +b.dataset.c)));
    }
    newGame();
    return { destroy() { } };
  }
});
