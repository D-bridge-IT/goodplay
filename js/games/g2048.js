// 2048 — forest edition. Slide tiles, equal tiles merge (seed → sapling → deep forest).
// Absolutely positioned tiles moved with CSS transforms; 4×4 classic plus 5×5 and 6×6.
(function () {
  'use strict';

  /* =====================================================================
     Pure logic (no DOM) — testable in Node via Games.g2048.logic
     ===================================================================== */
  const Logic = (function () {
    let uid = 1;
    const tile = v => ({ id: uid++, v });

    // Slide one line toward index 0. line: array of tile objects ({v}) or null.
    // Each tile merges at most once per move (no double merges).
    function slide(line) {
      const out = [], merges = [], dest = new Map();
      let gained = 0, open = null; // open = last placed tile that may still merge
      for (const t of line) {
        if (!t) continue;
        if (open && open.v === t.v) {
          const nt = tile(t.v * 2), idx = out.length - 1;
          out[idx] = nt; dest.set(t, idx);
          merges.push({ tile: nt, from: [open, t], idx });
          gained += nt.v; open = null;
        } else {
          out.push(t); dest.set(t, out.length - 1); open = t;
        }
      }
      while (out.length < line.length) out.push(null);
      return { out, merges, dest, gained };
    }
    // Numeric convenience: slideLine([2,2,2,2]) → { line:[4,4,0,0], gained:8, moved:true }
    function slideLine(nums) {
      const r = slide(nums.map(v => (v ? { v } : null)));
      const line = r.out.map(t => (t ? t.v : 0));
      return { line, gained: r.gained, moved: line.some((v, i) => v !== nums[i]) };
    }

    const DIRS = ['left', 'right', 'up', 'down'];
    function coords(n, dir, k) {
      const a = [];
      for (let i = 0; i < n; i++) {
        if (dir === 'left') a.push([k, i]);
        else if (dir === 'right') a.push([k, n - 1 - i]);
        else if (dir === 'up') a.push([i, k]);
        else a.push([n - 1 - i, k]);
      }
      return a;
    }
    const emptyGrid = n => Array.from({ length: n }, () => new Array(n).fill(null));

    // grid: n×n of tile|null. Returns new grid plus animation data.
    function move(grid, dir) {
      const n = grid.length, ng = emptyGrid(n), moves = [], merges = [];
      let gained = 0, moved = false;
      for (let k = 0; k < n; k++) {
        const cs = coords(n, dir, k), line = cs.map(([r, c]) => grid[r][c]);
        const res = slide(line);
        res.out.forEach((t, i) => { const [r, c] = cs[i]; ng[r][c] = t; });
        line.forEach((t, j) => {
          if (!t) return;
          const i = res.dest.get(t), [r, c] = cs[i];
          moves.push({ tile: t, r, c });
          if (i !== j) moved = true;
        });
        res.merges.forEach(m => { const [r, c] = cs[m.idx]; merges.push({ tile: m.tile, from: m.from, r, c }); });
        gained += res.gained;
      }
      if (merges.length) moved = true;
      return { grid: ng, moved, gained, moves, merges };
    }

    function empties(grid) { const e = []; grid.forEach((row, r) => row.forEach((t, c) => { if (!t) e.push([r, c]); })); return e; }
    function addRandom(grid, rng) {
      const e = empties(grid); if (!e.length) return null;
      const [r, c] = e[Math.floor(rng() * e.length)];
      const t = tile(rng() < 0.9 ? 2 : 4); grid[r][c] = t;
      return { tile: t, r, c };
    }
    function canMove(grid) {
      const n = grid.length;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const t = grid[r][c]; if (!t) return true;
        if (c + 1 < n && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true;
        if (r + 1 < n && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true;
      }
      return false;
    }
    const maxTile = grid => grid.reduce((m, row) => row.reduce((mm, t) => Math.max(mm, t ? t.v : 0), m), 0);
    const toValues = grid => grid.map(row => row.map(t => (t ? t.v : 0)));
    const fromValues = vals => vals.map(row => row.map(v => (v ? tile(v) : null)));
    function validValues(vals, n) {
      return Array.isArray(vals) && vals.length === n && vals.every(row => Array.isArray(row) && row.length === n &&
        row.every(v => v === 0 || (Number.isInteger(v) && v >= 2 && (v & (v - 1)) === 0)));
    }
    function newGrid(n, rng) { const g = emptyGrid(n); addRandom(g, rng); addRandom(g, rng); return g; }
    const WIN = 2048;
    const winStars = n => (n === 4 ? 30 : n === 5 ? 20 : 15);
    const overStars = score => Math.min(40, Math.floor(score / 1000));

    return { slide, slideLine, move, coords, emptyGrid, empties, addRandom, canMove, maxTile, toValues, fromValues, validValues, newGrid, DIRS, WIN, winStars, overStars };
  })();

  /* =====================================================================
     Card art
     ===================================================================== */
  const COL = { 2: ['#f4f9ec', '#3d5a2a'], 4: ['#e3f2cf', '#3d5a2a'], 8: ['#c8e6a0', '#2b4a1c'], 16: ['#a5d67a', '#21401a'], 32: ['#86c463', '#1b3a13'], 64: ['#4f9f46', '#fff'], 128: ['#3c8d49', '#fff'], 256: ['#2f7b47', '#fff'], 512: ['#256b43', '#fff'], 1024: ['#1d5a3d', '#fff'], 2048: ['#134a34', '#ffe38a'] };
  function thumb() {
    const g = id => `g48T${id}`;
    const tiles = [[2, 0, 0], [4, 1, 0], [8, 2, 0], [16, 3, 0], [0, 0, 1], [32, 1, 1], [64, 2, 1], [128, 3, 1], [0, 0, 2], [0, 1, 2], [512, 2, 2], [2048, 3, 2]];
    const sz = 15.6, gap = 2.6, ox = 52, oy = 12;
    const cells = tiles.map(([v, c, r]) => {
      const x = ox + c * (sz + gap), y = oy + r * (sz + gap);
      if (!v) return `<rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="3.2" fill="#fff" opacity=".45"/>`;
      const [bg, fg] = COL[v], fs = v >= 1000 ? 5.2 : v >= 100 ? 6.4 : 8.4;
      return `<rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="3.2" fill="${bg}"/>${v === 2048 ? `<rect x="${x - 1}" y="${y - 1}" width="${sz + 2}" height="${sz + 2}" rx="4" fill="none" stroke="#f5c542" stroke-width="1.4"/>` : ''}<text x="${x + sz / 2}" y="${y + sz / 2 + fs * .36}" text-anchor="middle" font-family="system-ui,Segoe UI,Arial" font-weight="800" font-size="${fs}" fill="${fg}">${v}</text>`;
    }).join('');
    return `<defs><linearGradient id="${g('bg')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef8e4"/><stop offset="1" stop-color="#8fca78"/></linearGradient>
      <linearGradient id="${g('bd')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd9a7"/><stop offset="1" stop-color="#9cc584"/></linearGradient></defs>
      <rect width="160" height="80" fill="url(#${g('bg')})"/>
      <path d="M0 80 L0 58 Q14 44 22 58 Q30 40 40 58 L40 80Z" fill="#5aa24f" opacity=".55"/>
      <path d="M124 80 L130 52 L136 80Z M140 80 L148 44 L156 80Z" fill="#2f7b47" opacity=".5"/>
      <circle cx="18" cy="16" r="10" fill="#fff" opacity=".5"/>
      <rect x="${ox - 4}" y="${oy - 4}" width="${4 * sz + 3 * gap + 8}" height="${3 * sz + 2 * gap + 8}" rx="7" fill="url(#${g('bd')})"/>
      ${cells}`;
  }

  /* =====================================================================
     Game
     ===================================================================== */
  const STR = {
    de: {
      size: 'Feld', win2048: '2048 erreicht!', winLine: 'Der Wald steht – {n} Punkte.', cont: 'Weiterspielen',
      overTitle: 'Keine Züge mehr', overLine: 'Punkte: {n}', bestLine: 'Rekord ({s}): {n}', newBest: 'Neuer Rekord!',
      swipe: 'Wische oder nutze die Pfeiltasten', free: '1× gratis', adSub: 'Anzeige', noUndo: 'Kein Zug zum Zurücknehmen', goal: 'Ziel 2048',
      resumed: 'Spiel fortgesetzt', r1024: '1024! Fast ein Wald 🌳',
      rulesHtml: `<ul>
        <li>Wische (oder Pfeiltasten / WASD), um alle Plättchen in eine Richtung zu schieben.</li>
        <li>Zwei gleiche Plättchen verschmelzen zu ihrer Summe – vom Samen (2) bis zum tiefen Wald (2048). Jedes Plättchen verschmilzt pro Zug nur einmal.</li>
        <li>Nach jedem Zug wächst ein neues Plättchen (2 oder 4) nach.</li>
        <li>Punkte = Summe aller verschmolzenen Plättchen. Ziel: das Plättchen <b>2048</b>. Danach darfst du weiterspielen.</li>
        <li>Kein Feld frei und keine Verschmelzung möglich → Spielende.</li>
        <li>Ein Zug zurück ist gratis, weitere gegen Anzeige (Spende an den Partner).</li>
        <li>Sterne: 2048 erreicht = 30 ⭐ (5×5: 20, 6×6: 15). Spielende: 1 ⭐ je 1000 Punkte.</li></ul>`
    },
    ru: {
      size: 'Поле', win2048: '2048 собрано!', winLine: 'Лес вырос — {n} очков.', cont: 'Играть дальше',
      overTitle: 'Ходов больше нет', overLine: 'Очки: {n}', bestLine: 'Рекорд ({s}): {n}', newBest: 'Новый рекорд!',
      swipe: 'Свайпай или используй стрелки', free: '1× бесплатно', adSub: 'реклама', noUndo: 'Нечего отменять', goal: 'Цель 2048',
      resumed: 'Игра продолжена', r1024: '1024! Почти лес 🌳',
      rulesHtml: `<ul>
        <li>Свайп (или стрелки / WASD) сдвигает все плитки в одну сторону.</li>
        <li>Две одинаковые плитки сливаются в их сумму — от семечка (2) до густого леса (2048). За ход каждая плитка сливается только один раз.</li>
        <li>После каждого хода появляется новая плитка (2 или 4).</li>
        <li>Очки = сумма всех слитых плиток. Цель — плитка <b>2048</b>. После этого можно играть дальше.</li>
        <li>Нет свободных клеток и слияний → конец игры.</li>
        <li>Одна отмена хода бесплатно, дальше — за рекламу (пожертвование партнёру).</li>
        <li>Звёзды: 2048 = 30 ⭐ (5×5: 20, 6×6: 15). Конец игры: 1 ⭐ за каждые 1000 очков.</li></ul>`
    }
  };
  const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
  const SLIDE_MS = 120;

  function mount(root, ctx) {
    const s = Kit.strings(STR);
    const d = ctx.data;
    d.best = Object.assign({ 4: 0, 5: 0, 6: 0 }, d.best || {});
    d.saves = d.saves || {};
    let n = [4, 5, 6].includes(d.size) ? d.size : 4;
    const rng = Math.random;
    let grid, score = 0, won = false, undoFree = 1, prev = null, over = false;
    let pending = null, destroyed = false;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

    const K = Kit.shell(root, {
      top: true, cls: 'clear g48-area',
      stats: [{ id: 'score', icon: '🌱', value: 0, label: Kit.t('score') }, { id: 'best', icon: '🏆', value: d.best[n], label: Kit.t('best') }]
    });
    K.el.classList.add('g48');
    const seg = Kit.segmented([{ id: '4', label: '4×4' }, { id: '5', label: '5×5' }, { id: '6', label: '6×6' }], String(n), id => switchSize(+id));
    K.top.appendChild(seg.el);
    const goal = document.createElement('span'); goal.className = 'gk-chip g48-goal'; goal.textContent = s('goal'); K.top.appendChild(goal);
    K.board.innerHTML = `<div class="g48-board"><div class="g48-bgrid"></div><div class="g48-tiles"></div></div>`;
    const boardEl = K.board.querySelector('.g48-board'), bgEl = boardEl.querySelector('.g48-bgrid'), tilesEl = boardEl.querySelector('.g48-tiles');
    const scoreStat = K.head.querySelector('[data-stat="score"]');

    const undoBtn = K.tool('', () => undo());
    K.tool(`<span class="ico">↻</span>${UI.escapeHtml(Kit.t('newGame'))}`, () => {
      if (score > 0 && !over) Kit.confirm(Kit.t('confirmNew'), () => newGame()); else newGame();
    });
    K.tool(`<span class="ico">📖</span>${UI.escapeHtml(Kit.t('rules'))}`, () => Kit.rules(Kit.t('rules'), s('rulesHtml')));

    /* ---------- rendering ---------- */
    function digits(v) { return String(v).length; }
    function tileEl(t, r, c, cls) {
      const el = document.createElement('div');
      el.className = `g48-tile g48-v${Math.min(t.v, 4096)} g48-d${Math.min(5, digits(t.v))}` + (cls ? ' ' + cls : '');
      el.style.setProperty('--x', c); el.style.setProperty('--y', r);
      el.innerHTML = `<div class="g48-in">${t.v}</div>`;
      tilesEl.appendChild(el); t.el = el;
      return el;
    }
    function setPos(t, r, c) { t.el.style.setProperty('--x', c); t.el.style.setProperty('--y', r); }
    function buildBoard() {
      boardEl.style.setProperty('--n', n);
      boardEl.dataset.n = n;
      bgEl.innerHTML = '<i></i>'.repeat(n * n);
      tilesEl.innerHTML = '';
      grid.forEach((row, r) => row.forEach((t, c) => { if (t) tileEl(t, r, c); }));
    }
    function renderUndo() {
      undoBtn.innerHTML = `<span class="ico">↶</span>${UI.escapeHtml(Kit.t('undo'))}<small class="g48-undo-sub">${undoFree > 0 ? s('free') : '▶ ' + UI.escapeHtml(s('adSub'))}</small>`;
      undoBtn.disabled = !prev;
    }
    function renderStats() {
      K.stat('score', score);
      K.stat('best', Math.max(d.best[n], score));
    }
    function plus(v) {
      const el = document.createElement('span'); el.className = 'g48-plus'; el.textContent = '+' + v;
      scoreStat.appendChild(el);
      el.animate([{ transform: 'translate(-50%,0)', opacity: 1 }, { transform: 'translate(-50%,-26px)', opacity: 0 }], { duration: 700, easing: 'ease-out', fill: 'forwards' }).onfinish = () => el.remove();
    }

    /* ---------- persistence ---------- */
    function save() {
      d.size = n;
      d.saves[n] = over ? null : { vals: Logic.toValues(grid), score, won, undoFree, prev };
      ctx.save();
    }
    function load() {
      const sv = d.saves[n];
      if (sv && Logic.validValues(sv.vals, n) && typeof sv.score === 'number' && Logic.toValues(Logic.fromValues(sv.vals)).flat().some(Boolean)) {
        grid = Logic.fromValues(sv.vals); score = sv.score; won = !!sv.won; undoFree = sv.undoFree != null ? sv.undoFree : 1;
        prev = sv.prev && Logic.validValues(sv.prev.vals, n) ? sv.prev : null;
        over = !Logic.canMove(grid);
        return true;
      }
      return false;
    }
    function newGame() {
      flush();
      grid = Logic.newGrid(n, rng); score = 0; won = false; undoFree = 1; prev = null; over = false;
      buildBoard();
      grid.forEach(row => row.forEach(t => { if (t) t.el.classList.add('g48-new'); }));
      renderStats(); renderUndo(); K.msg(s('swipe')); save();
    }
    function switchSize(m) {
      flush(); save();
      n = m; d.size = n;
      if (load()) { buildBoard(); renderStats(); renderUndo(); K.msg(score ? s('resumed') : s('swipe')); ctx.save(); if (over) later(gameOver, 400); }
      else newGame();
    }

    /* ---------- moves ---------- */
    function flush() { if (pending) { clearTimeout(pending.id); timers.delete(pending.id); const fn = pending.fn; pending = null; fn(); } }
    function doMove(dir) {
      if (destroyed || over || !grid) return false;
      flush();
      const res = Logic.move(grid, dir);
      if (!res.moved) { boardEl.classList.remove('g48-nudge-' + dir); void boardEl.offsetWidth; boardEl.classList.add('g48-nudge-' + dir); return false; }
      prev = { vals: Logic.toValues(grid), score, won };
      // slide every existing tile to its destination
      res.moves.forEach(m => setPos(m.tile, m.r, m.c));
      // merged tiles pop in on top after the slide; their sources are removed
      res.merges.forEach(m => { tileEl(m.tile, m.r, m.c, 'g48-merged'); });
      grid = res.grid;
      const spawn = Logic.addRandom(grid, rng);
      if (spawn) tileEl(spawn.tile, spawn.r, spawn.c, 'g48-new');
      const removed = res.merges.flatMap(m => m.from);
      const fin = () => { removed.forEach(t => t.el && t.el.remove()); };
      pending = { id: later(() => { pending = null; fin(); }, SLIDE_MS + 10), fn: fin };
      score += res.gained;
      if (res.gained) {
        plus(res.gained);
        const top = Math.max(...res.merges.map(m => m.tile.v));
        ctx.sound(top >= 2048 ? 'bell' : top >= 128 ? 'match' : 'pop');
      } else ctx.sound('tap');
      renderStats(); renderUndo(); K.msg('');
      if (score > d.best[n]) d.best[n] = score;
      const mx = Logic.maxTile(grid);
      if (mx >= 1024) ctx.badge('g2048_1024');
      over = !Logic.canMove(grid);
      save();
      if (mx >= Logic.WIN && !won) { won = true; save(); later(winDialog, SLIDE_MS + 260); }
      else if (over) later(gameOver, SLIDE_MS + 420);
      else if (mx === 1024 && res.merges.some(m => m.tile.v === 1024)) K.msg(s('r1024'), 'good');
      return true;
    }
    async function undo() {
      if (!prev || destroyed) { K.msg(s('noUndo')); return; }
      if (undoFree > 0) undoFree--;
      else { const okk = await Kit.useHelp(ctx, 'undo'); if (!okk || destroyed || !prev) return; }
      flush();
      grid = Logic.fromValues(prev.vals); score = prev.score; won = prev.won; prev = null; over = false;
      buildBoard();
      tilesEl.querySelectorAll('.g48-tile').forEach(el => el.classList.add('g48-fade'));
      ctx.sound('whoosh');
      renderStats(); renderUndo(); save();
    }

    function winDialog() {
      if (destroyed) return;
      ctx.badge('g2048_win');
      boardEl.classList.add('g48-glow');
      Kit.result(ctx, {
        result: 'win', title: s('win2048'),
        lines: [s('winLine', { n: score })],
        stars: Logic.winStars(n),
        // Continue is the main action (3 buttons keep the sheet roomy; "Neu" stays in the toolbar).
        againLabel: s('cont'),
        onAgain: () => { boardEl.classList.remove('g48-glow'); if (over) later(gameOver, 200); }
      });
    }
    function gameOver() {
      if (destroyed || !over) return;
      const best = d.best[n], isBest = score > 0 && score >= best;
      d.best[n] = Math.max(best, score);
      d.saves[n] = null; ctx.save();
      Kit.result(ctx, {
        result: isBest && score >= 1000 ? 'win' : 'lose',
        title: isBest ? s('newBest') : s('overTitle'),
        lines: [s('overLine', { n: score }), s('bestLine', { s: `${n}×${n}`, n: d.best[n] })],
        stars: Logic.overStars(score),
        onAgain: () => newGame()
      });
    }

    /* ---------- input ---------- */
    function modalOpen() { const m = document.getElementById('modal-root'); return !!(m && m.children.length); }
    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const dir = KEYS[e.key]; if (!dir) return;
      if (modalOpen() || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      if (!root.isConnected) return;
      e.preventDefault();
      doMove(dir);
    }
    let sw = null;
    function onDown(e) {
      if (e.button != null && e.button > 0) return;
      sw = { x: e.clientX, y: e.clientY, id: e.pointerId, done: false };
      try { boardEl.setPointerCapture(e.pointerId); } catch (_) { }
    }
    function swipeDir(dx, dy, th) {
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < th) return null;
      if (ax > ay * 1.15) return dx > 0 ? 'right' : 'left';
      if (ay > ax * 1.15) return dy > 0 ? 'down' : 'up';
      return null; // too diagonal
    }
    function onMove(e) {
      if (!sw || sw.done || e.pointerId !== sw.id) return;
      const dir = swipeDir(e.clientX - sw.x, e.clientY - sw.y, 34);
      if (dir) { sw.done = true; doMove(dir); }
    }
    function onUp(e) {
      if (!sw || e.pointerId !== sw.id) return;
      if (!sw.done) { const dir = swipeDir(e.clientX - sw.x, e.clientY - sw.y, 22); if (dir) doMove(dir); }
      sw = null;
    }
    window.addEventListener('keydown', onKey);
    boardEl.addEventListener('pointerdown', onDown);
    boardEl.addEventListener('pointermove', onMove);
    boardEl.addEventListener('pointerup', onUp);
    boardEl.addEventListener('pointercancel', () => { sw = null; });

    /* ---------- start ---------- */
    if (load()) {
      buildBoard(); renderStats(); renderUndo(); K.msg(score ? s('resumed') : s('swipe'));
      if (over) later(gameOver, 500);
    } else newGame();

    root.__game = {
      logic: Logic,
      state: () => ({ n, score, won, over, undoFree, canUndo: !!prev, grid: Logic.toValues(grid), best: d.best[n] }),
      move: dir => doMove(dir),
      undo: () => undo(),
      setGrid(vals) { flush(); grid = Logic.fromValues(vals); n = vals.length; over = !Logic.canMove(grid); seg.set(String(n)); buildBoard(); renderStats(); save(); if (over) later(gameOver, 300); },
      size: m => switchSize(m),
      newGame
    };

    return {
      destroy() {
        destroyed = true;
        window.removeEventListener('keydown', onKey);
        timers.forEach(id => clearTimeout(id)); timers.clear(); pending = null;
        delete root.__game;
      }
    };
  }

  Games.register({
    id: 'g2048', icon: '🌳', partner: 'p1', isNew: true,
    name: { de: '2048', ru: '2048' },
    tagline: { de: 'Vom Samen zum Wald: verschmelze Plättchen bis 2048.', ru: 'От семечка до леса: сливай плитки до 2048.' },
    badges: [
      { id: 'g2048_win', icon: '🌳', name: { de: '2048 erreicht', ru: 'Собрано 2048' } },
      { id: 'g2048_1024', icon: '🌱', name: { de: 'Plättchen 1024', ru: 'Плитка 1024' } }
    ],
    thumb, mount,
    logic: Logic
  });
})();
