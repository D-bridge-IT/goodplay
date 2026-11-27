// Vier gewinnt / Четыре в ряд — 7×6, negamax alpha-beta (center-first ordering, transposition
// table, threat extensions), three levels + 2 players on one device, drop animation, save/resume.
// Prefix: .c4-
(function () {
  'use strict';

  /* =====================================================================
     Pure engine (no DOM) — require()-able in Node for tests
     ===================================================================== */
  const C4 = (function () {
    const W = 7, H = 6, N = 42, WIN = 1000000, INF = 1e9;
    const idx = (c, r) => c * H + r;                 // r = 0 is the bottom row
    const LINES = [], CELL_LINES = Array.from({ length: N }, () => []);
    for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const ec = c + 3 * dc, er = r + 3 * dr;
      if (ec < 0 || ec >= W || er < 0 || er >= H) continue;
      const L = [0, 1, 2, 3].map(k => idx(c + k * dc, r + k * dr));
      L.forEach(i => CELL_LINES[i].push(LINES.length));
      LINES.push(L);
    }
    const ORDER = [3, 2, 4, 1, 5, 0, 6];

    // Zobrist keys (two independent 32-bit keys: index + verification).
    let seed = 0x9e3779b9;
    const rnd32 = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return (t ^ t >>> 14) | 0; };
    const Z1 = [new Int32Array(N), new Int32Array(N)], Z2 = [new Int32Array(N), new Int32Array(N)];
    for (let p = 0; p < 2; p++) for (let i = 0; i < N; i++) { Z1[p][i] = rnd32(); Z2[p][i] = rnd32() | 1; }

    // Transposition table.
    const TBITS = 20, TSIZE = 1 << TBITS, TMASK = TSIZE - 1;
    const TK = new Int32Array(TSIZE), TS = new Int32Array(TSIZE), TD = new Int8Array(TSIZE), TF = new Int8Array(TSIZE), TB = new Int8Array(TSIZE);
    const EXACT = 1, LOWER = 2, UPPER = 3;
    function clearTT() { TK.fill(0); TF.fill(0); }

    function create(starter = 1) { return { cells: new Int8Array(N), h: new Int8Array(W), n: 0, turn: starter, starter, moves: [], k1: 0, k2: 0 }; }
    function clone(st) { return { cells: Int8Array.from(st.cells), h: Int8Array.from(st.h), n: st.n, turn: st.turn, starter: st.starter, moves: st.moves.slice(), k1: st.k1, k2: st.k2 }; }
    const canPlay = (st, c) => c >= 0 && c < W && st.h[c] < H;
    function play(st, c) {
      const i = idx(c, st.h[c]), p = st.turn;
      st.cells[i] = p; st.h[c]++; st.n++; st.moves.push(c);
      st.k1 ^= Z1[p - 1][i]; st.k2 ^= Z2[p - 1][i]; st.turn = 3 - p;
      return i;
    }
    function undo(st) {
      const c = st.moves.pop(); st.h[c]--;
      const i = idx(c, st.h[c]), p = st.cells[i];
      st.cells[i] = 0; st.n--; st.k1 ^= Z1[p - 1][i]; st.k2 ^= Z2[p - 1][i]; st.turn = p;
      return c;
    }
    // Would player p complete four by occupying cell i? (cell i itself is ignored)
    function winsAt(st, i, p) {
      const L0 = CELL_LINES[i];
      for (let a = 0; a < L0.length; a++) {
        const L = LINES[L0[a]]; let ok = true;
        for (let k = 0; k < 4; k++) { const j = L[k]; if (j !== i && st.cells[j] !== p) { ok = false; break; } }
        if (ok) return L;
      }
      return null;
    }
    const isWinningMove = (st, c, p) => canPlay(st, c) && !!winsAt(st, idx(c, st.h[c]), p);
    function lastWin(st) {
      if (!st.moves.length) return null;
      const c = st.moves[st.moves.length - 1], i = idx(c, st.h[c] - 1);
      return winsAt(st, i, st.cells[i]);
    }
    function fromMoves(moves, starter = 1) { const st = create(starter); for (const c of moves) { if (!canPlay(st, c)) throw new Error('bad move ' + c); play(st, c); } return st; }

    // Static evaluation from the point of view of player p (the side to move).
    function evaluate(st, p) {
      const o = 3 - p, cells = st.cells, starter = st.starter;
      let s = 0;
      for (let li = 0; li < LINES.length; li++) {
        const L = LINES[li]; let a = 0, b = 0, e = -1;
        for (let k = 0; k < 4; k++) { const v = cells[L[k]]; if (v === p) a++; else if (v === o) b++; else e = L[k]; }
        if (a && b) continue;
        if (a === 3) { s += 40; const r = e % H; if ((r % 2 === 0) === (p === starter)) s += 22; }
        else if (a === 2) s += 4;
        else if (b === 3) { s -= 40; const r = e % H; if ((r % 2 === 0) === (o === starter)) s -= 22; }
        else if (b === 2) s -= 4;
      }
      for (let r = 0; r < H; r++) { const v = cells[idx(3, r)]; if (v === p) s += 3; else if (v === o) s -= 3; }
      return s;
    }

    const ABORT = { abort: true };
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let nodes = 0, deadline = Infinity;
    const toTT = (v, ply) => v > WIN - 1000 ? v + ply : v < -(WIN - 1000) ? v - ply : v;
    const fromTT = (v, ply) => v > WIN - 1000 ? v - ply : v < -(WIN - 1000) ? v + ply : v;

    function negamax(st, depth, alpha, beta, ply) {
      if ((++nodes & 1023) === 0 && now() > deadline) throw ABORT;
      if (st.n === N) return 0;
      const p = st.turn, o = 3 - p;
      for (let c = 0; c < W; c++) if (isWinningMove(st, c, p)) return WIN - ply;
      let forced = -1, threats = 0;
      for (let c = 0; c < W; c++) if (isWinningMove(st, c, o)) { threats++; forced = c; }
      if (threats >= 2) return -(WIN - ply - 1);
      if (forced >= 0) { // only one sensible move: extend instead of counting it as a ply of depth
        play(st, forced); const v = -negamax(st, depth, -beta, -alpha, ply + 1); undo(st);
        return v;
      }
      if (depth <= 0) return evaluate(st, p);

      const alpha0 = alpha, ti = st.k1 & TMASK;
      let ttMove = -1;
      if (TF[ti] && TK[ti] === st.k2) {
        ttMove = TB[ti];
        if (TD[ti] >= depth) {
          const v = fromTT(TS[ti], ply), f = TF[ti];
          if (f === EXACT) return v;
          if (f === LOWER && v > alpha) alpha = v;
          else if (f === UPPER && v < beta) beta = v;
          if (alpha >= beta) return v;
        }
      }
      let best = -INF, bestMove = -1;
      for (let k = -1; k < W; k++) {
        const c = k < 0 ? ttMove : ORDER[k];
        if (c < 0 || (k >= 0 && c === ttMove) || !canPlay(st, c)) continue;
        let v;
        const above = st.h[c] + 1 < H ? idx(c, st.h[c] + 1) : -1;
        if (above >= 0 && winsAt(st, above, o)) v = -(WIN - ply - 1); // gives the opponent a win on top
        else { play(st, c); v = -negamax(st, depth - 1, -beta, -alpha, ply + 1); undo(st); }
        if (v > best) { best = v; bestMove = c; }
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
      TK[ti] = st.k2; TS[ti] = toTT(best, ply); TD[ti] = depth; TB[ti] = bestMove;
      TF[ti] = best <= alpha0 ? UPPER : best >= beta ? LOWER : EXACT;
      return best;
    }

    const LEVELS = { easy: { depth: 2, noise: 60 }, medium: { depth: 6, spread: 3 }, hard: { depth: 14, time: 850 } };

    // Picks a column for the side to move. level: 'easy' | 'medium' | 'hard'; opt.time overrides.
    function bestMove(st0, level = 'hard', opt = {}) {
      const st = clone(st0), p = st.turn, o = 3 - p;
      const legal = ORDER.filter(c => canPlay(st, c));
      if (!legal.length) return { col: -1 };
      for (const c of legal) if (isWinningMove(st, c, p)) return { col: c, reason: 'win', score: WIN };
      const threats = legal.filter(c => isWinningMove(st, c, o));
      if (threats.length) return { col: threats[0], reason: 'block' };
      if (legal.length === 1) return { col: legal[0], reason: 'only' };
      const safe = legal.filter(c => !(st.h[c] + 1 < H && winsAt(st, idx(c, st.h[c] + 1), o)));
      const cand = safe.length ? safe : legal;
      if (cand.length === 1) return { col: cand[0], reason: 'only' };
      const L = Object.assign({}, LEVELS[level] || LEVELS.hard, opt);
      const rand = opt.random || Math.random;
      nodes = 0;

      if (level === 'easy' || level === 'medium') {
        deadline = now() + 1500;
        const scores = [];
        try {
          for (const c of cand) { play(st, c); scores.push(-negamax(st, L.depth - 1, -INF, INF, 1)); undo(st); }
        } catch (e) { if (e !== ABORT) throw e; return { col: cand[0], reason: 'timeout' }; }
        let bi = 0;
        if (level === 'easy') {
          let bv = -INF;
          scores.forEach((v, i) => { const x = Math.abs(v) > WIN - 1000 ? v : v + rand() * L.noise; if (x > bv) { bv = x; bi = i; } });
        } else {
          const top = Math.max(...scores);
          const pool = cand.filter((c, i) => scores[i] >= top - (Math.abs(top) > WIN - 1000 ? 0 : L.spread));
          const c = pool[Math.floor(rand() * pool.length)]; bi = cand.indexOf(c);
        }
        return { col: cand[bi], score: scores[bi], depth: L.depth, nodes };
      }

      // Hard: iterative deepening with a time box.
      deadline = now() + (L.time || 850);
      let order = cand.slice(), best = order[0], bestV = -INF, done = 0;
      const maxD = Math.min(L.depth, N - st.n);
      for (let d = 1; d <= maxD; d++) {
        try {
          let alpha = -INF, curBest = order[0], curV = -INF;
          for (const c of order) {
            play(st, c); const v = -negamax(st, d - 1, -INF, -alpha, 1); undo(st);
            if (v > curV) { curV = v; curBest = c; }
            if (v > alpha) alpha = v;
          }
          best = curBest; bestV = curV; done = d;
          order = [best].concat(order.filter(c => c !== best));
          if (Math.abs(curV) > WIN - 1000) break;
        } catch (e) { if (e !== ABORT) throw e; break; }
      }
      return { col: best, score: bestV, depth: done, nodes };
    }

    return { W, H, N, WIN, idx, LINES, create, clone, canPlay, play, undo, winsAt, isWinningMove, lastWin, fromMoves, evaluate, bestMove, clearTT };
  })();

  if (typeof module === 'object' && module.exports) module.exports = C4;
  if (typeof window === 'undefined' || !window.Games) return;

  /* =====================================================================
     UI
     ===================================================================== */
  const STR = {
    de: {
      you: 'Du', cpu: 'Computer', red: 'Rot', yellow: 'Gelb', yourTurn: 'Du bist am Zug', cpuThinks: 'Computer denkt …',
      turnOf: '{who} ist am Zug', full: 'Diese Spalte ist voll', hintCol: 'Tipp: Spalte {n}', thinking: 'Rechne …',
      setupTitle: 'Neues Spiel', opponent: 'Gegner', vsCpu: '🤖 Computer', twoP: '👥 2 Spieler', difficulty: 'Stufe',
      starts: 'Wer beginnt?', me: 'Ich', start: 'Los geht’s', cancel: 'Abbrechen', twoPChip: '2 Spieler',
      winYou: 'Du hast gewonnen!', loseYou: 'Der Computer gewinnt', winColor: '{who} gewinnt!', drawText: 'Das Brett ist voll – keiner hat vier in einer Reihe.',
      inMoves: 'Entschieden nach {n} Zügen.', undoFree: 'Erste Rücknahme ist gratis', noUndo: 'Nichts zum Zurücknehmen',
      newG: 'Neu', rulesT: 'Vier gewinnt – Regeln', record: 'Bilanz', wins: 'S', losses: 'N', draws: 'U',
      rulesHtml: `<ul>
        <li>Ihr werft abwechselnd einen Stein in eine der 7 Spalten. Er fällt bis ganz nach unten.</li>
        <li>Wer zuerst <b>vier eigene Steine in einer Reihe</b> hat – waagerecht, senkrecht oder diagonal – gewinnt.</li>
        <li>Ist das Brett voll und niemand hat vier in einer Reihe, endet das Spiel unentschieden.</li>
        <li>Tipp: Die Mitte ist am wertvollsten. Baue Drohungen, die der Gegner nicht alle blocken kann.</li>
        <li>Tippe oder fahre über eine Spalte, um den Stein zu zielen; loslassen wirft ihn.</li>
        <li><b>Zurück</b>: die erste Rücknahme pro Partie ist gratis, danach gegen Tipp oder Anzeige. <b>Tipp</b> zeigt die beste Spalte.</li>
        <li>Sterne gegen den Computer: Leicht 6, Mittel 12, Schwer 25 – Unentschieden die Hälfte.</li></ul>`
    },
    ru: {
      you: 'Ты', cpu: 'Компьютер', red: 'Красные', yellow: 'Жёлтые', yourTurn: 'Твой ход', cpuThinks: 'Компьютер думает …',
      turnOf: 'Ходят {who}', full: 'Этот столбец заполнен', hintCol: 'Подсказка: столбец {n}', thinking: 'Считаю …',
      setupTitle: 'Новая игра', opponent: 'Соперник', vsCpu: '🤖 Компьютер', twoP: '👥 Вдвоём', difficulty: 'Уровень',
      starts: 'Кто начинает?', me: 'Я', start: 'Начать', cancel: 'Отмена', twoPChip: 'Вдвоём',
      winYou: 'Ты победил!', loseYou: 'Компьютер победил', winColor: 'Победили {who}!', drawText: 'Поле заполнено — ни у кого нет четырёх в ряд.',
      inMoves: 'Партия решилась за {n} ходов.', undoFree: 'Первая отмена бесплатно', noUndo: 'Нечего отменять',
      newG: 'Заново', rulesT: 'Четыре в ряд — правила', record: 'Счёт', wins: 'П', losses: 'П', draws: 'Н',
      rulesHtml: `<ul>
        <li>Игроки по очереди бросают фишку в один из 7 столбцов. Она падает до самого низа.</li>
        <li>Побеждает тот, кто первым выстроит <b>четыре свои фишки в ряд</b> — по горизонтали, вертикали или диагонали.</li>
        <li>Если поле заполнено, а четырёх в ряд нет ни у кого, — ничья.</li>
        <li>Совет: центр ценнее всего. Создавай угрозы, которые соперник не успеет закрыть все.</li>
        <li>Нажми или наведи на столбец, чтобы прицелиться; отпусти — фишка упадёт.</li>
        <li><b>Отмена</b>: первая в партии бесплатно, дальше за подсказку или рекламу. <b>Подсказка</b> показывает лучший столбец.</li>
        <li>Звёзды против компьютера: лёгкий 6, средний 12, сложный 25 — за ничью половина.</li></ul>`
    }
  };
  const STARS = { easy: 6, medium: 12, hard: 25 };

  Games.register({
    id: 'connect4', icon: '🔴', partner: 'p3', isNew: true,
    name: { de: 'Vier gewinnt', ru: 'Четыре в ряд' },
    tagline: { de: 'Der Klassiker: vier in eine Reihe – gegen eine starke KI.', ru: 'Классика: четыре в ряд — против сильного компьютера.' },
    badges: [
      { id: 'connect4_win', icon: '🔴', name: { de: 'Vier in Reihe – erster Sieg', ru: 'Четыре в ряд — первая победа' } },
      { id: 'connect4_hard', icon: '🏆', name: { de: 'Vier gewinnt – Schwer besiegt', ru: 'Четыре в ряд — сложный уровень' } }
    ],
    logic: C4,
    thumb() {
      const cell = (c, r, fill) => `<circle cx="${52 + c * 14}" cy="${18 + r * 14}" r="5.4" fill="${fill}"/>`;
      const map = { '3,3': 'r', '4,3': 'y', '4,2': 'r', '2,3': 'y', '5,3': 'r', '5,2': 'y', '5,1': 'r', '3,2': 'y', '6,3': 'y', '6,2': 'r', '6,1': 'y', '6,0': 'r' };
      let holes = '';
      for (let c = 0; c < 5; c++) for (let r = 0; r < 4; r++) {
        const k = map[(c + 2) + ',' + r]; holes += cell(c, r, k === 'r' ? 'url(#c4tr)' : k === 'y' ? 'url(#c4ty)' : '#1e2b8f');
      }
      return `<defs><linearGradient id="c4tbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0e7ff"/><stop offset="1" stop-color="#c7d2fe"/></linearGradient>
        <linearGradient id="c4tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b74ff"/><stop offset="1" stop-color="#2f3fc4"/></linearGradient>
        <radialGradient id="c4tr" cx=".35" cy=".3"><stop offset="0" stop-color="#ffa3b1"/><stop offset=".5" stop-color="#f43f5e"/><stop offset="1" stop-color="#9f1239"/></radialGradient>
        <radialGradient id="c4ty" cx=".35" cy=".3"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></radialGradient></defs>
        <rect width="160" height="80" fill="url(#c4tbg)"/>
        <circle cx="24" cy="20" r="7" fill="url(#c4tr)" opacity=".9"/><circle cx="136" cy="16" r="6" fill="url(#c4ty)" opacity=".9"/>
        <rect x="42" y="8" width="76" height="62" rx="9" fill="url(#c4tb)"/>
        <rect x="42" y="8" width="76" height="22" rx="9" fill="#fff" opacity=".12"/>${holes}
        <line x1="66" y1="60" x2="108" y2="18" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`;
    },
    mount(root, ctx) {
      const s = Kit.strings(STR);
      const d = ctx.data;
      d.stats = d.stats || {};
      let cfg = Object.assign({ mode: 'cpu', diff: 'medium', first: 1 }, d.cfg || {});
      let st = null, over = false, busy = false, gen = 0, freeUndo = true, hintCol = -1, hoverCol = -1, pointerIn = false;
      const timers = new Set();
      const later = (fn, ms) => { const g = gen; const id = setTimeout(() => { timers.delete(id); if (g === gen) fn(); }, ms); timers.add(id); return id; };
      const diffLabel = () => s(cfg.diff);
      const isCpu = () => cfg.mode === 'cpu';
      const humanTurn = () => !over && (!isCpu() || st.turn === 1);

      const ui = Kit.shell(root, { top: true, cls: 'clear c4-wrap' });
      ui.top.innerHTML = `<span class="gk-chip c4-chip"></span><span class="c4-rec"></span>`;
      const chip = ui.top.querySelector('.c4-chip'), recEl = ui.top.querySelector('.c4-rec');

      // Geometry (units): stage = 7.4 wide × 7.5 high; preview row 1.1, frame 6.4 with 0.2 margin.
      const SW = 7.4, SH = 7.5, PRE = 1.1, M = 0.2, CS = 0.84;
      const pctX = u => (u / SW * 100).toFixed(4) + '%', pctY = u => (u / SH * 100).toFixed(4) + '%';
      const coinX = c => M + c + (1 - CS) / 2, coinY = r => PRE + M + (5 - r) + (1 - CS) / 2;

      let holes = '', rims = '';
      for (let c = 0; c < 7; c++) for (let r = 0; r < 6; r++) {
        const cx = 20 + c * 100 + 50, cy = 20 + r * 100 + 50;
        holes += `<circle cx="${cx}" cy="${cy}" r="43"/>`;
        rims += `<circle cx="${cx}" cy="${cy}" r="44.5"/>`;
      }
      ui.board.innerHTML = `
        <div class="c4-players"><div class="c4-pl" data-p="1"><i class="c4-mini p1"></i><span></span><small></small></div><div class="c4-pl" data-p="2"><i class="c4-mini p2"></i><span></span><small></small></div></div>
        <div class="c4-stage">
          <div class="c4-back" style="top:${pctY(PRE)}"></div>
          <div class="c4-coins"></div>
          <svg class="c4-face" style="top:${pctY(PRE)};height:${pctY(SH - PRE)}" viewBox="0 0 740 640" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="c4-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5873ff"/><stop offset=".55" stop-color="#3a4fe0"/><stop offset="1" stop-color="#2b3ab8"/></linearGradient>
              <linearGradient id="c4-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".38" stop-color="#fff" stop-opacity=".06"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
              <linearGradient id="c4-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1260" stop-opacity=".55"/><stop offset=".5" stop-color="#0b1260" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient>
              <mask id="c4-holes"><rect width="740" height="640" fill="#fff"/><g fill="#000">${holes}</g></mask>
            </defs>
            <g mask="url(#c4-holes)">
              <rect width="740" height="640" rx="36" fill="url(#c4-body)"/>
              <rect width="740" height="640" rx="36" fill="url(#c4-gloss)"/>
            </g>
            <g fill="none" stroke="url(#c4-rim)" stroke-width="3.5">${rims}</g>
            <rect x="2" y="2" width="736" height="636" rx="34" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3"/>
          </svg>
          <div class="c4-colhl" style="top:${pctY(PRE)};height:${pctY(SH - PRE)};width:${pctX(1)}"></div>
          <svg class="c4-over" style="top:${pctY(PRE)};height:${pctY(SH - PRE)}" viewBox="0 0 740 640" preserveAspectRatio="none" aria-hidden="true"></svg>
          <div class="c4-hit" role="grid" aria-label="Board"></div>
        </div>`;
      const stage = ui.board.querySelector('.c4-stage'), coinsEl = ui.board.querySelector('.c4-coins');
      const overEl = ui.board.querySelector('.c4-over'), colhl = ui.board.querySelector('.c4-colhl'), hit = ui.board.querySelector('.c4-hit');
      const plEls = { 1: ui.board.querySelector('.c4-pl[data-p="1"]'), 2: ui.board.querySelector('.c4-pl[data-p="2"]') };
      const ghost = document.createElement('div'); ghost.className = 'c4-coin c4-ghost';
      coinsEl.appendChild(ghost);

      const tool = (ico, label, fn) => ui.tool(`<span class="ico">${ico}</span>${label}`, fn);
      const bUndo = tool('↶', s('undo'), () => doUndo());
      const bHint = tool('💡', s('hint'), () => doHint());
      tool('＋', s('newG'), () => openSetup());
      tool('📖', s('rules'), () => Kit.rules(s('rulesT'), s('rulesHtml')));

      function coinEl(c, r, p) {
        const el = document.createElement('div');
        el.className = 'c4-coin p' + p; el.dataset.cell = C4.idx(c, r);
        el.style.left = pctX(coinX(c)); el.style.top = pctY(coinY(r));
        return el;
      }
      function renderCoins() {
        coinsEl.querySelectorAll('.c4-coin:not(.c4-ghost)').forEach(e => e.remove());
        for (let c = 0; c < 7; c++) for (let r = 0; r < st.h[c]; r++) coinsEl.appendChild(coinEl(c, r, st.cells[C4.idx(c, r)]));
        overEl.innerHTML = '';
      }
      function name(p) { return isCpu() ? (p === 1 ? s('you') : s('cpu')) : (p === 1 ? s('red') : s('yellow')); }
      function renderBar() {
        for (const p of [1, 2]) {
          const el = plEls[p];
          el.querySelector('span').textContent = name(p);
          el.querySelector('small').textContent = '';
          el.classList.toggle('on', !over && st.turn === p);
          el.classList.toggle('think', !over && isCpu() && p === 2 && st.turn === 2);
        }
        chip.textContent = isCpu() ? `🤖 ${diffLabel()}` : `👥 ${s('twoPChip')}`;
        const r = d.stats[cfg.diff] || { w: 0, d: 0, l: 0 };
        recEl.textContent = isCpu() ? `${s('record')}: ${r.w} – ${r.d} – ${r.l}` : '';
        bHint.disabled = over;
        bUndo.disabled = over || !st.moves.length;
      }
      function status() {
        if (over) return;
        if (!isCpu()) ui.msg(s('turnOf', { who: name(st.turn) }), st.turn === 1 ? 'bad' : 'accent');
        else if (st.turn === 1) ui.msg(s('yourTurn'), 'accent');
        else ui.msg(s('cpuThinks'));
      }

      // Preview coin / column highlight
      function showPreview(c) {
        hoverCol = c;
        const can = c >= 0 && humanTurn() && !busy && st.h[c] < 6;
        if (!can) { ghost.classList.remove('show'); colhl.classList.remove('show'); return; }
        ghost.className = 'c4-coin c4-ghost show p' + st.turn + (hintCol === c ? ' hint' : '');
        ghost.style.left = pctX(coinX(c)); ghost.style.top = pctY((PRE - CS) / 2);
        colhl.style.left = pctX(M + c); colhl.classList.add('show');
      }
      function colFromEvent(e) {
        const r = stage.getBoundingClientRect();
        const u = (e.clientX - r.left) / r.width * SW - M;
        return Math.max(0, Math.min(6, Math.floor(u)));
      }
      let downId = null;
      hit.addEventListener('pointerdown', e => {
        if (!humanTurn() || busy) return;
        downId = e.pointerId; try { hit.setPointerCapture(e.pointerId); } catch (_) { }
        showPreview(colFromEvent(e));
      });
      hit.addEventListener('pointermove', e => {
        pointerIn = true;
        if (e.pointerType !== 'mouse' && downId === null) return;
        const c = colFromEvent(e); if (c !== hoverCol || !ghost.classList.contains('show')) showPreview(c);
      });
      hit.addEventListener('pointerup', e => {
        if (downId !== e.pointerId) return;
        downId = null;
        const c = colFromEvent(e);
        if (e.pointerType !== 'mouse') { ghost.classList.remove('show'); colhl.classList.remove('show'); }
        humanDrop(c);
      });
      hit.addEventListener('pointercancel', () => { downId = null; ghost.classList.remove('show'); colhl.classList.remove('show'); });
      hit.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { pointerIn = false; hoverCol = -1; ghost.classList.remove('show'); colhl.classList.remove('show'); } });

      function dropAnim(c, r, p) {
        const el = coinEl(c, r, p); coinsEl.appendChild(el);
        const fall = coinY(r) - (PRE - CS) / 2; // in units
        const pct = fall / CS * 100;
        const dur = Math.round(230 + 75 * Math.sqrt(6 - r));
        if (!el.animate) { ctx.sound('drop'); return Promise.resolve(); }
        const a = el.animate([
          { transform: `translateY(-${pct}%)`, easing: 'cubic-bezier(.55,0,1,.45)' },
          { transform: 'translateY(0)', offset: .72, easing: 'cubic-bezier(0,.4,.6,1)' },
          { transform: 'translateY(-13%)', offset: .86, easing: 'cubic-bezier(.4,0,1,1)' },
          { transform: 'translateY(0)' }
        ], { duration: dur });
        setTimeout(() => ctx.sound('place'), dur * .72);
        return new Promise(res => { a.onfinish = res; a.oncancel = res; later(() => { if (a.playState !== 'finished') a.cancel(); res(); }, dur + 90); });
      }

      function save() {
        if (over) { delete d.save; } else d.save = { cfg: Object.assign({}, cfg), moves: st.moves.slice(), freeUndo };
        d.cfg = cfg; ctx.save();
      }

      function humanDrop(c) {
        if (!humanTurn() || busy) return;
        if (!C4.canPlay(st, c)) {
          ctx.sound('bad'); ui.msg(s('full'), 'bad');
          stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
          later(status, 1100); return;
        }
        clearHint();
        doMove(c);
      }
      async function doMove(c) {
        busy = true; ghost.classList.remove('show'); colhl.classList.remove('show');
        const p = st.turn, r = st.h[c];
        C4.play(st, c);
        save(); renderBar(); status();
        const g = gen;
        await dropAnim(c, r, p);
        if (g !== gen) return;
        busy = false;
        afterMove();
      }
      function afterMove() {
        const line = C4.lastWin(st);
        if (line) return finish(st.cells[line[0]], line);
        if (st.n === 42) return finish(0, null);
        renderBar(); status();
        if (isCpu() && st.turn === 2) cpuTurn();
        else if (pointerIn && hoverCol >= 0) showPreview(hoverCol);
      }
      function cpuTurn() {
        busy = true; renderBar(); status();
        later(() => {
          const t0 = Date.now();
          const res = C4.bestMove(st, cfg.diff);
          later(() => doMove(res.col), Math.max(0, 420 - (Date.now() - t0)));
        }, 60);
      }

      function drawWin(line) {
        const pts = line.map(i => ({ x: 20 + Math.floor(i / 6) * 100 + 50, y: 20 + (5 - i % 6) * 100 + 50 }));
        pts.sort((a, b) => a.x - b.x || a.y - b.y);
        const a = pts[0], b = pts[3];
        overEl.innerHTML = pts.map(q => `<circle class="c4-ring" cx="${q.x}" cy="${q.y}" r="44"/>`).join('') +
          `<line class="c4-line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        const set = new Set(line.map(String));
        coinsEl.querySelectorAll('.c4-coin:not(.c4-ghost)').forEach(el => el.classList.add(set.has(el.dataset.cell) ? 'win' : 'dim'));
      }
      function finish(winner, line) {
        over = true; busy = false;
        ghost.classList.remove('show'); colhl.classList.remove('show');
        if (line) drawWin(line);
        let res = 'draw', stars = 0, title, lines = [];
        const n = st.moves.length;
        if (isCpu()) {
          const rec = d.stats[cfg.diff] = d.stats[cfg.diff] || { w: 0, d: 0, l: 0 };
          if (winner === 1) {
            res = 'win'; stars = STARS[cfg.diff]; title = s('winYou'); rec.w++;
            ctx.badge('connect4_win'); if (cfg.diff === 'hard') ctx.badge('connect4_hard');
          } else if (winner === 2) { res = 'lose'; title = s('loseYou'); rec.l++; }
          else { stars = Math.round(STARS[cfg.diff] / 2); rec.d++; }
        } else if (winner) { res = 'win'; title = s('winColor', { who: name(winner) }); }
        if (winner) lines.push(s('inMoves', { n })); else lines.push(s('drawText'));
        ui.msg(title || Kit.t('draw'), res === 'win' ? 'good' : res === 'lose' ? 'bad' : '');
        save(); renderBar();
        later(() => Kit.result(ctx, { result: res, title, lines, stars, onAgain: () => newGame() }), line ? 1100 : 500);
      }

      function clearHint() { hintCol = -1; overEl.querySelectorAll('.c4-hintarrow').forEach(e => e.remove()); ghost.classList.remove('hint'); }
      async function doHint() {
        if (over || busy || !humanTurn()) return;
        const ok = await Kit.useHelp(ctx, 'hint'); if (!ok || over || busy) return;
        busy = true; ui.msg(s('thinking'));
        later(() => {
          const res = C4.bestMove(st, 'hard', { time: 700 });
          busy = false; hintCol = res.col;
          ui.msg(s('hintCol', { n: res.col + 1 }), 'good');
          const x = 20 + res.col * 100 + 50;
          overEl.querySelectorAll('.c4-hintarrow').forEach(e => e.remove());
          overEl.insertAdjacentHTML('beforeend', `<g class="c4-hintarrow"><rect x="${x - 46}" y="14" width="92" height="612" rx="40"/></g>`);
          showPreview(res.col);
        }, 40);
      }

      async function doUndo() {
        if (over || busy || !st.moves.length) return;
        const humanMoves = isCpu() ? st.moves.filter((_, i) => ((st.starter + i - 1) % 2) + 1 === 1).length : st.moves.length;
        if (!humanMoves) { ctx.toast(s('noUndo')); return; }
        if (freeUndo) { freeUndo = false; ctx.toast(s('undoFree')); }
        else { const ok = await Kit.useHelp(ctx, 'undo'); if (!ok || over || busy) return; }
        if (isCpu()) { do { C4.undo(st); } while (st.moves.length && st.turn !== 1); }
        else C4.undo(st);
        clearHint(); renderCoins(); save(); renderBar(); status();
        ctx.sound('whoosh');
        if (isCpu() && st.turn === 2) cpuTurn();
      }

      function newGame(fromSave) {
        gen++; timers.forEach(clearTimeout); timers.clear();
        over = false; busy = false; hintCol = -1;
        if (fromSave) {
          st = C4.fromMoves(fromSave.moves, cfg.first); freeUndo = fromSave.freeUndo !== false;
        } else {
          C4.clearTT(); st = C4.create(cfg.first); freeUndo = true;
        }
        renderCoins(); renderBar(); save(); status();
        const line = C4.lastWin(st);
        if (line || st.n === 42) { finish(line ? st.cells[line[0]] : 0, line); return; }
        if (isCpu() && st.turn === 2) cpuTurn();
      }

      function openSetup() {
        const tmp = Object.assign({}, cfg);
        const m = UI.modal({
          title: s('setupTitle'),
          html: `<div class="c4-setup"><label>${s('opponent')}</label><div data-k="mode"></div>
            <label data-row="diff">${s('difficulty')}</label><div data-k="diff" data-row="diff"></div>
            <label>${s('starts')}</label><div data-k="first"></div></div>`,
          actions: [{ label: s('cancel'), cls: 'btn-ghost' }, { label: s('start'), cls: 'btn-primary', onClick: () => { cfg = tmp; d.cfg = cfg; newGame(); } }]
        });
        const box = m.box;
        const put = (k, el) => { const h = box.querySelector(`[data-k="${k}"]`); h.innerHTML = ''; h.appendChild(el); };
        function refresh() {
          box.querySelectorAll('[data-row="diff"]').forEach(e => e.style.display = tmp.mode === 'cpu' ? '' : 'none');
          put('first', Kit.segmented(tmp.mode === 'cpu'
            ? [{ id: '1', label: s('me') }, { id: '2', label: s('cpu') }]
            : [{ id: '1', label: '🔴 ' + s('red') }, { id: '2', label: '🟡 ' + s('yellow') }], String(tmp.first), v => { tmp.first = +v; }).el);
        }
        put('mode', Kit.segmented([{ id: 'cpu', label: s('vsCpu') }, { id: '2p', label: s('twoP') }], tmp.mode, v => { tmp.mode = v; refresh(); }).el);
        put('diff', Kit.segmented(['easy', 'medium', 'hard'].map(id => ({ id, label: s(id) })), tmp.diff, v => { tmp.diff = v; }).el);
        refresh();
      }

      // Start: resume a saved game or begin immediately with the last settings.
      if (d.save && Array.isArray(d.save.moves)) {
        cfg = Object.assign(cfg, d.save.cfg || {});
        try { newGame(d.save); } catch (e) { newGame(); }
      } else newGame();

      root.__game = {
        state: () => ({ moves: st.moves.slice(), turn: st.turn, over, busy, cfg: Object.assign({}, cfg), heights: Array.from(st.h) }),
        move: c => humanDrop(c),
        best: (level = 'hard') => C4.bestMove(st, level).col,
        newGame: (o) => { if (o) cfg = Object.assign(cfg, o); newGame(); },
        engine: C4
      };

      return {
        destroy() {
          gen++; timers.forEach(clearTimeout); timers.clear();
          coinsEl.getAnimations && coinsEl.getAnimations({ subtree: true }).forEach(a => a.cancel());
          delete root.__game;
        }
      };
    }
  });
})();
