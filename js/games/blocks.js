// Bausteine fürs Sprachcafé — 9×9 block puzzle (Woodoku / Block Blast style).
// Drag one of three offered pieces onto the board; full rows, columns and 3×3 boxes clear.
// Every cleared line is one brick for the language café of D-Bridge e.V. (Projekt des Monats).
(function () {
  'use strict';

  /* =====================================================================
     Pure logic (no DOM) — testable in Node via Games.blocks.logic
     ===================================================================== */
  const Logic = (function () {
    const N = 9, CELLS = N * N, COLORS = 8;

    // 20 base shapes: [id, rows, weight, rotations(1|2|4)]
    const BASE = [
      ['dot', ['#'], 2.5, 1],
      ['i2', ['##'], 4, 2],
      ['i3', ['###'], 4, 2],
      ['i4', ['####'], 3, 2],
      ['i5', ['#####'], 2, 2],
      ['o2', ['##', '##'], 4, 1],
      ['o3', ['###', '###', '###'], 1.2, 1],
      ['r23', ['###', '###'], 2, 2],
      ['c3', ['##', '#.'], 4, 4],
      ['c5', ['###', '#..', '#..'], 2, 4],
      ['l4', ['#.', '#.', '##'], 3, 4],
      ['j4', ['.#', '.#', '##'], 3, 4],
      ['t4', ['###', '.#.'], 3, 4],
      ['s4', ['.##', '##.'], 2, 2],
      ['z4', ['##.', '.##'], 2, 2],
      ['t5', ['###', '.#.', '.#.'], 1, 4],
      ['u5', ['#.#', '###'], 1, 4],
      ['p5', ['##', '##', '#.'], 1, 4],
      ['l5', ['#.', '#.', '#.', '##'], 1, 4],
      ['j5', ['.#', '.#', '.#', '##'], 1, 4]
    ];
    const BIG = new Set(['o3', 'i5', 'c5', 't5', 'u5', 'p5', 'l5', 'j5', 'r23']);

    const norm = cells => {
      const mr = Math.min(...cells.map(c => c[0])), mc = Math.min(...cells.map(c => c[1]));
      return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    };
    const rot = cells => norm(cells.map(([r, c]) => [c, -r]));
    const key = cells => cells.map(c => c.join(',')).join(';');

    const SHAPES = [], SH = {};
    BASE.forEach(([id, rows, w, nrot]) => {
      let cells = [];
      rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
      cells = norm(cells);
      const vars = [], seen = new Set();
      for (let k = 0; k < nrot; k++) {
        const kk = key(cells);
        if (!seen.has(kk)) { seen.add(kk); vars.push(cells); }
        cells = rot(cells);
      }
      vars.forEach((v, i) => {
        const sh = {
          id: id + '_' + i, base: id, cells: v, weight: w / vars.length, big: BIG.has(id),
          h: Math.max(...v.map(c => c[0])) + 1, w: Math.max(...v.map(c => c[1])) + 1
        };
        SHAPES.push(sh); SH[sh.id] = sh;
      });
    });
    const SMALL = ['dot_0', 'i2_0', 'i2_1', 'c3_0', 'c3_1', 'c3_2', 'c3_3', 'i3_0', 'i3_1', 'o2_0'];

    const emptyBoard = () => new Array(CELLS).fill(0);

    function fits(board, cells, r, c) {
      for (const [dr, dc] of cells) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= N || cc >= N || board[rr * N + cc]) return false;
      }
      return true;
    }
    function canFitAnywhere(board, cells) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (fits(board, cells, r, c)) return true;
      return false;
    }
    function anyFits(board, tray) { return tray.some(p => p && canFitAnywhere(board, SH[p.s].cells)); }

    // Full rows, columns and 3×3 boxes.
    function findLines(b) {
      const rows = [], cols = [], boxes = [];
      for (let r = 0; r < N; r++) { let ok = true; for (let c = 0; c < N; c++) if (!b[r * N + c]) { ok = false; break; } if (ok) rows.push(r); }
      for (let c = 0; c < N; c++) { let ok = true; for (let r = 0; r < N; r++) if (!b[r * N + c]) { ok = false; break; } if (ok) cols.push(c); }
      for (let k = 0; k < 9; k++) {
        const br = Math.floor(k / 3) * 3, bc = (k % 3) * 3; let ok = true;
        for (let r = br; r < br + 3 && ok; r++) for (let c = bc; c < bc + 3; c++) if (!b[r * N + c]) { ok = false; break; }
        if (ok) boxes.push(k);
      }
      return { rows, cols, boxes, count: rows.length + cols.length + boxes.length };
    }
    function lineCells(L) {
      const s = new Set();
      L.rows.forEach(r => { for (let c = 0; c < N; c++) s.add(r * N + c); });
      L.cols.forEach(c => { for (let r = 0; r < N; r++) s.add(r * N + c); });
      L.boxes.forEach(k => { const br = Math.floor(k / 3) * 3, bc = (k % 3) * 3; for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) s.add(r * N + c); });
      return s;
    }
    // Board after placing (without clearing) — for previews.
    function previewLines(board, cells, r, c) {
      const b = board.slice(); cells.forEach(([dr, dc]) => { b[(r + dr) * N + c + dc] = 9; });
      const L = findLines(b); return { L, cells: lineCells(L) };
    }

    // Scoring: 1 point per placed cell; lines n → 18·n² points × combo multiplier.
    const comboMult = combo => combo > 0 ? Math.min(5, 1 + 0.5 * (combo - 1)) : 1;
    function moveScore(nCells, lines, combo) {
      const mult = lines ? comboMult(combo) : 1;
      const linePts = lines ? Math.round(18 * lines * lines * mult) : 0;
      return { pts: nCells + linePts, linePts, mult };
    }
    const STREAK_BONUS = 100, PERFECT_BONUS = 300;
    const starsFor = score => Math.min(36, Math.floor(score / 1000) * 3);

    function pickWeighted(list, rng) {
      let tot = 0; list.forEach(s => { tot += s.weight; });
      let x = rng() * tot;
      for (const s of list) { x -= s.weight; if (x <= 0) return s; }
      return list[list.length - 1];
    }
    function colors3(rng) {
      const a = [1, 2, 3, 4, 5, 6, 7, 8];
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a.slice(0, 3);
    }
    // Three pieces; at least one must fit (fair dealing), no triple of the same base shape.
    function makeHand(board, rng, score) {
      const pool = score < 150 ? SHAPES.filter(s => !s.big || s.base === 'r23') : SHAPES;
      let hand = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        const cols = colors3(rng);
        hand = [0, 1, 2].map(i => ({ s: pickWeighted(pool, rng).id, col: cols[i] }));
        const bases = new Set(hand.map(p => SH[p.s].base));
        if (bases.size === 1) continue;
        if (anyFits(board, hand)) return hand;
      }
      // Fallback: replace the first piece with a small one that fits.
      const fit = SMALL.find(id => canFitAnywhere(board, SH[id].cells));
      if (fit) hand[0] = { s: fit, col: hand[0].col };
      return hand;
    }
    // "Continue for an ad": three small pieces, as many as possible fitting.
    function smallHand(board, rng) {
      const cols = colors3(rng);
      const fitting = SMALL.filter(id => canFitAnywhere(board, SH[id].cells));
      const src = fitting.length ? fitting : ['dot_0'];
      const ids = [];
      for (let i = 0; i < 3; i++) ids.push(src[Math.floor(rng() * src.length)]);
      if (!ids.some(id => canFitAnywhere(board, SH[id].cells)) && canFitAnywhere(board, SH.dot_0.cells)) ids[0] = 'dot_0';
      if (fitting.includes('dot_0') && !ids.includes('dot_0')) ids[2] = 'dot_0';
      return ids.map((s, i) => ({ s, col: cols[i] }));
    }

    function newState(rng) {
      const board = emptyBoard();
      return { board, tray: makeHand(board, rng, 0), score: 0, combo: 0, idle: 0, handClears: 0, lines: 0, adUsed: false, over: false };
    }

    // Place tray piece ti with its top-left at (r, c). Mutates st. Returns null if illegal.
    function applyMove(st, ti, r, c, rng) {
      const p = st.tray[ti]; if (!p) return null;
      const sh = SH[p.s]; if (!fits(st.board, sh.cells, r, c)) return null;
      const placed = sh.cells.map(([dr, dc]) => (r + dr) * N + c + dc);
      placed.forEach(i => { st.board[i] = p.col; });
      const L = findLines(st.board), n = L.count;
      const clearedIdx = [...lineCells(L)], clearedCols = clearedIdx.map(i => st.board[i]);
      clearedIdx.forEach(i => { st.board[i] = 0; });
      if (n) { st.combo++; st.idle = 0; st.handClears++; } else { st.idle++; if (st.idle >= 3) st.combo = 0; }
      const sc = moveScore(placed.length, n, st.combo);
      const events = []; let bonus = 0;
      if (n && st.board.every(v => !v)) { bonus += PERFECT_BONUS; events.push('perfect'); }
      st.tray[ti] = null;
      let newHand = false;
      if (st.tray.every(x => !x)) {
        if (st.handClears >= 3) { bonus += STREAK_BONUS; events.push('streak'); }
        st.handClears = 0;
        st.tray = makeHand(st.board, rng, st.score + sc.pts + bonus); newHand = true;
      }
      st.score += sc.pts + bonus; st.lines += n;
      st.over = !anyFits(st.board, st.tray);
      return { placed, color: p.col, L, n, clearedIdx, clearedCols, pts: sc.pts + bonus, linePts: sc.linePts, mult: sc.mult, bonus, events, newHand, combo: st.combo };
    }

    function validSave(o) {
      return o && Array.isArray(o.board) && o.board.length === CELLS && Array.isArray(o.tray) && o.tray.length === 3 &&
        o.tray.every(p => p === null || (p && SH[p.s] && p.col >= 1 && p.col <= COLORS)) && typeof o.score === 'number';
    }

    return { N, CELLS, SHAPES, SH, BASE, SMALL, emptyBoard, fits, canFitAnywhere, anyFits, findLines, lineCells, previewLines, moveScore, comboMult, starsFor, makeHand, smallHand, newState, applyMove, validSave, STREAK_BONUS, PERFECT_BONUS };
  })();

  /* =====================================================================
     Art
     ===================================================================== */
  const PAL = [null,
    ['#ff9f7a', '#e4533a'], ['#ffd76a', '#efa400'], ['#a6e57f', '#47a845'], ['#6fe3cc', '#159f8c'],
    ['#86ccff', '#2c7fdc'], ['#b3a6ff', '#6a58e6'], ['#ffa6cb', '#e0508c'], ['#e9bf92', '#a8693d']];

  function thumb() {
    const g = id => `bbT${id}`;
    let cells = '';
    const fill = { '1,2': 2, '1,3': 2, '2,3': 2, '3,0': 5, '3,1': 5, '4,1': 5, '5,5': 3, '5,6': 3, '6,6': 3, '6,7': 3, '7,2': 7, '7,3': 7, '7,4': 7, '8,4': 1, '8,5': 1, '2,7': 4, '3,7': 4, '4,7': 4 };
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const x = 14 + c * 6.6, y = 9 + r * 6.6, f = fill[r + ',' + c];
      const alt = ((Math.floor(r / 3) + Math.floor(c / 3)) % 2) ? '#ead3ad' : '#f6e6c8';
      cells += f ? `<rect x="${x}" y="${y}" width="5.8" height="5.8" rx="1.3" fill="url(#${g('c' + f)})"/>` : `<rect x="${x}" y="${y}" width="5.8" height="5.8" rx="1.3" fill="${alt}"/>`;
    }
    const grads = [1, 2, 3, 4, 5, 7].map(i => `<linearGradient id="${g('c' + i)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PAL[i][0]}"/><stop offset="1" stop-color="${PAL[i][1]}"/></linearGradient>`).join('');
    const piece = [[0, 0], [1, 0], [1, 1], [1, 2]].map(([r, c]) => `<rect x="${c * 9}" y="${r * 9}" width="8.2" height="8.2" rx="2" fill="url(#${g('c5')})"/><rect x="${c * 9 + 1}" y="${r * 9 + 1}" width="6.2" height="2" rx="1" fill="#fff" opacity=".45"/>`).join('');
    return `<defs><linearGradient id="${g('bg')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1dc"/><stop offset="1" stop-color="#f6b48a"/></linearGradient>
      <linearGradient id="${g('wd')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8744a"/><stop offset="1" stop-color="#6c4124"/></linearGradient>${grads}</defs>
      <rect width="160" height="80" fill="url(#${g('bg')})"/>
      <circle cx="132" cy="14" r="22" fill="#fff" opacity=".35"/>
      <rect x="10" y="5" width="66.6" height="66.6" rx="6" fill="url(#${g('wd')})"/>
      <rect x="10" y="66" width="66.6" height="6" rx="3" fill="#000" opacity=".12"/>
      ${cells}
      <rect x="13" y="54.6" width="60" height="6.6" rx="2" fill="#fff" opacity=".5"/>
      <g transform="translate(92 10) rotate(10)">${piece}</g>
      <g transform="translate(104 44)">
        <rect x="0" y="10" width="40" height="22" rx="3" fill="#c8633f"/>
        <clipPath id="${g('wl')}"><rect x="0" y="10" width="40" height="22"/></clipPath>
        <g clip-path="url(#${g('wl')})">${[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${1 + c * 10 - (r % 2) * 5}" y="${11 + r * 7}" width="9" height="6" rx="1" fill="${(r + c) % 3 ? '#d9764f' : '#b9532f'}"/>`).join('')).join('')}</g>
        <path d="M-3 11 L20 -1 L43 11 Z" fill="#2f7d6c"/><rect x="15" y="20" width="10" height="12" rx="2" fill="#5a3218"/>
        <rect x="3" y="15" width="9" height="7" rx="1.5" fill="#ffe7a6"/><rect x="28" y="15" width="9" height="7" rx="1.5" fill="#ffe7a6"/>
      </g>`;
  }

  function art() {
    const g = id => `bbA${id}`;
    const C = 11.6, GAP = 1.6, P = C + GAP;
    const fill = {
      '0,6': 6, '0,7': 6, '1,7': 6, '1,1': 2, '2,1': 2, '2,2': 2, '3,4': 4, '3,5': 4, '4,4': 4, '4,5': 4,
      '6,0': 7, '6,1': 7, '6,2': 7, '6,3': 7, '6,5': 3, '6,6': 3, '6,7': 3, '6,8': 3,
      '7,1': 5, '8,1': 5, '8,2': 5, '7,6': 8, '8,6': 8, '8,7': 8, '2,6': 1, '3,6': 1
    };
    let cells = '';
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const x = c * P, y = r * P, f = fill[r + ',' + c];
      const alt = ((Math.floor(r / 3) + Math.floor(c / 3)) % 2) ? '#ebd4ae' : '#f7e8cc';
      if (f) cells += `<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="2.6" fill="url(#${g('c' + f)})"/><rect x="${x + 1.6}" y="${y + 1.3}" width="${C - 3.2}" height="2.4" rx="1.2" fill="#fff" opacity=".42"/><rect x="${x}" y="${y + C - 2}" width="${C}" height="2" rx="1" fill="#000" opacity=".12"/>`;
      else cells += `<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="2.6" fill="${alt}"/>`;
    }
    // Row 6 gets completed by the falling piece: highlight + sweep.
    const sweep = `<rect x="-3" y="${6 * P - 3}" width="${9 * P + 3}" height="${C + 6}" rx="5" fill="url(#${g('sw')})"/>`;
    const grads = [1, 2, 3, 4, 5, 6, 7, 8].map(i => `<linearGradient id="${g('c' + i)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PAL[i][0]}"/><stop offset="1" stop-color="${PAL[i][1]}"/></linearGradient>`).join('');
    const pc = 15.5, piece = (fillRef, shadow) => [[0, 0], [1, 0], [1, 1]].map(([r, c]) => shadow
      ? `<rect x="${c * (pc + 2)}" y="${r * (pc + 2)}" width="${pc}" height="${pc}" rx="3.6" fill="#3b1d08"/>`
      : `<rect x="${c * (pc + 2)}" y="${r * (pc + 2)}" width="${pc}" height="${pc}" rx="3.6" fill="url(#${fillRef})"/><rect x="${c * (pc + 2) + 2}" y="${r * (pc + 2) + 1.8}" width="${pc - 4}" height="3.2" rx="1.6" fill="#fff" opacity=".5"/><rect x="${c * (pc + 2)}" y="${r * (pc + 2) + pc - 2.6}" width="${pc}" height="2.6" rx="1.3" fill="#000" opacity=".14"/>`).join('');
    const spark = (x, y, s, o) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-6 C1-1 1-1 6 0 C1 1 1 1 0 6 C-1 1-1 1-6 0 C-1-1-1-1 0-6Z" fill="#fff" opacity="${o}"/>`;
    // Brick wall of the café: rows of bricks, top row unfinished.
    let bricks = '';
    const bw = 15, bh = 7.2;
    for (let r = 0; r < 6; r++) {
      const off = (r % 2) * (bw / 2);
      for (let k = -1; k < 8; k++) {
        const x = 4 + k * (bw + 1.2) + off;
        const shade = ['#d0683f', '#c55a34', '#db7a4f', '#b9502c'][(r * 3 + k * 7 + 8) % 4];
        bricks += `<rect x="${x}" y="${88 - r * (bh + 1.2)}" width="${bw}" height="${bh}" rx="1.4" fill="${shade}"/><rect x="${x + 1}" y="${88 - r * (bh + 1.2) + 1}" width="${bw - 2}" height="1.6" rx=".8" fill="#fff" opacity=".18"/>`;
      }
    }
    return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style="display:block">
      <defs>
        <linearGradient id="${g('bg')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3e0"/><stop offset=".55" stop-color="#fdd2a8"/><stop offset="1" stop-color="#f29d72"/></linearGradient>
        <radialGradient id="${g('glow')}" cx=".3" cy=".25" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <linearGradient id="${g('wd')}" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#b07b4f"/><stop offset=".55" stop-color="#835130"/><stop offset="1" stop-color="#5f381c"/></linearGradient>
        <linearGradient id="${g('sw')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".75"/><stop offset=".7" stop-color="#fffbe6" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <linearGradient id="${g('roof')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8f7b"/><stop offset="1" stop-color="#1d6b5b"/></linearGradient>
        <linearGradient id="${g('win')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset="1" stop-color="#ffc861"/></linearGradient>
        <clipPath id="${g('wall')}"><rect x="4" y="40" width="110" height="56"/></clipPath>
        <filter id="${g('sh')}" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="4"/></filter>
        ${grads}
      </defs>
      <rect width="320" height="170" fill="url(#${g('bg')})"/>
      <rect width="320" height="170" fill="url(#${g('glow')})"/>
      <circle cx="292" cy="22" r="40" fill="#fff" opacity=".22"/><circle cx="160" cy="160" r="60" fill="#fff" opacity=".12"/>
      <circle cx="140" cy="24" r="3" fill="#fff" opacity=".7"/><circle cx="182" cy="150" r="2.4" fill="#fff" opacity=".6"/><circle cx="12" cy="150" r="3.4" fill="#fff" opacity=".5"/>
      <!-- board -->
      <g transform="translate(26 22) rotate(-5 62 62)">
        <rect x="-2" y="10" width="${9 * P + 16}" height="${9 * P + 16}" rx="16" fill="#5b2f10" opacity=".35" filter="url(#${g('sh')})"/>
        <rect x="-8" y="-8" width="${9 * P + 14.4}" height="${9 * P + 14.4}" rx="14" fill="url(#${g('wd')})"/>
        <rect x="-8" y="-8" width="${9 * P + 14.4}" height="4" rx="2" fill="#fff" opacity=".22"/>
        <path d="M-6 30 C30 26 60 36 112 30 M-6 74 C34 70 70 80 112 72" stroke="#fff" stroke-opacity=".06" stroke-width="3" fill="none"/>
        <rect x="-2.6" y="-2.6" width="${9 * P + 3.6}" height="${9 * P + 3.6}" rx="9" fill="#5a3418"/>
        ${cells}
        ${sweep}
        ${spark(20, 6 * P + 6, 1, .95)}${spark(70, 6 * P + 3, .7, .9)}${spark(104, 6 * P + 9, .85, .85)}
      </g>
      <!-- falling piece -->
      <g transform="translate(150 30) rotate(9)">
        <g transform="translate(6 10)" opacity=".2" filter="url(#${g('sh')})">${piece('', true)}</g>
        ${piece(g('c5'), false)}
      </g>
      <path d="M152 74 C146 92 140 104 128 112" stroke="#fff" stroke-width="2.4" stroke-dasharray="2 6" stroke-linecap="round" fill="none" opacity=".8"/>
      <!-- café under construction -->
      <g transform="translate(192 42)">
        <ellipse cx="60" cy="102" rx="66" ry="7" fill="#7a3a17" opacity=".18"/>
        <rect x="4" y="44" width="110" height="52" fill="#a94a2a"/>
        <g clip-path="url(#${g('wall')})">${bricks}</g>
        <rect x="2" y="96" width="114" height="4" rx="2" fill="#8a4a26"/>
        <!-- awning -->
        <path d="M0 38 L118 38 L112 52 L6 52 Z" fill="url(#${g('roof')})"/>
        ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${6 + i * 17.7} 52 q8.85 8 17.7 0 Z" fill="${i % 2 ? '#fff4e2' : '#2a8572'}"/><rect x="${6 + i * 17.7}" y="38" width="8.85" height="14" fill="#fff4e2" opacity="${i % 2 ? 0 : .9}"/>`).join('')}
        <!-- windows and door -->
        <rect x="12" y="64" width="26" height="22" rx="4" fill="url(#${g('win')})" stroke="#7b4122" stroke-width="2.4"/>
        <path d="M25 64 V86 M12 75 H38" stroke="#7b4122" stroke-width="1.6"/>
        <rect x="78" y="64" width="26" height="22" rx="4" fill="url(#${g('win')})" stroke="#7b4122" stroke-width="2.4"/>
        <path d="M91 64 V86 M78 75 H104" stroke="#7b4122" stroke-width="1.6"/>
        <rect x="48" y="62" width="22" height="34" rx="5" fill="#6b3a1c"/><circle cx="65" cy="80" r="1.8" fill="#ffcf6b"/>
        <rect x="51" y="66" width="16" height="10" rx="3" fill="url(#${g('win')})" opacity=".9"/>
        <!-- sign with cup -->
        <g transform="translate(36 6)">
          <rect x="0" y="0" width="46" height="26" rx="8" fill="#fff8ec" stroke="#2a8572" stroke-width="2.2"/>
          <path d="M14 10 h14 v5 a7 7 0 0 1 -14 0 Z" fill="#a8693d"/>
          <path d="M28 11.5 h2.6 a3 3 0 0 1 0 6 h-2.8" stroke="#a8693d" stroke-width="2" fill="none"/>
          <rect x="12" y="21" width="20" height="2" rx="1" fill="#a8693d" opacity=".5"/>
          <path d="M18 7 c-2 -2 2 -3 0 -5 M23 7 c-2 -2 2 -3 0 -5" stroke="#a8693d" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        </g>
        <line x1="44" y1="32" x2="44" y2="38" stroke="#7b4122" stroke-width="2"/><line x1="74" y1="32" x2="74" y2="38" stroke="#7b4122" stroke-width="2"/>
        <!-- flying brick -->
        <g transform="translate(100 18) rotate(-14)"><rect width="16" height="7.6" rx="1.6" fill="#d9764f"/><rect x="1" y="1" width="14" height="1.8" rx=".9" fill="#fff" opacity=".3"/></g>
        ${spark(124, 12, .7, .9)}${spark(92, 8, .5, .8)}
      </g>
    </svg>`;
  }

  /* =====================================================================
     Game
     ===================================================================== */
  const MILESTONE = 500;
  const STR = {
    de: {
      cafe: 'Bausteine fürs Café', cafeDone: 'Café-Etappe geschafft! Danke fürs Mitbauen ☕', drag: 'Ziehe ein Teil aufs Brett',
      noFit: 'Kein Platz mehr', noFitSub: 'Keines der Teile passt noch aufs Brett.', cont: '▶ Weiter gegen Anzeige',
      contSub: 'Du bekommst drei kleine Teile – die Anzeige spendet ans Sprachcafé.', end: 'Spiel beenden',
      over: 'Spiel vorbei', newBest: 'Neuer Rekord!', scoreLine: 'Punkte: {n}', bestLine: 'Rekord: {n}',
      bricksLine: '{n} Reihen abgeräumt = {n} Bausteine fürs Café', combo: 'Combo', streak: 'Serie!', perfect: 'Brett leer!',
      lines: 'Reihen', resumed: 'Spiel fortgesetzt', stage: 'Etappe {n}',
      rulesHtml: `<ul>
        <li>Ziehe die drei angebotenen Teile auf das 9×9-Brett. Teile lassen sich nicht drehen.</li>
        <li>Volle <b>Reihen, Spalten und 3×3-Felder</b> werden abgeräumt – auch mehrere gleichzeitig.</li>
        <li>Punkte: 1 pro gesetztem Feld, Abräumen 18 × Linien² (2 Linien = 72, 3 = 162).</li>
        <li><b>Combo:</b> Räumst du innerhalb von 3 Zügen erneut ab, steigt der Multiplikator: ×1,5 · ×2 · … bis ×5.</li>
        <li><b>Serie:</b> Alle drei Teile einer Runde räumen ab → +100. Brett komplett leer → +300.</li>
        <li>Jede abgeräumte Linie ist <b>ein Baustein</b> für das Sprachcafé für Geflüchtete (D-Bridge e.V.). Ziel: 500.</li>
        <li>Passt kein Teil mehr, ist das Spiel vorbei. Einmal pro Spiel kannst du gegen eine Anzeige mit drei kleinen Teilen weiterspielen.</li>
        <li>Am Spielende gibt es je 1000 Punkte 3 ⭐.</li></ul>`
    },
    ru: {
      cafe: 'Кирпичики для кафе', cafeDone: 'Этап кафе построен! Спасибо за помощь ☕', drag: 'Перетащи фигуру на поле',
      noFit: 'Места больше нет', noFitSub: 'Ни одна фигура не помещается на поле.', cont: '▶ Продолжить за рекламу',
      contSub: 'Ты получишь три маленькие фигуры — реклама поддержит языковое кафе.', end: 'Завершить игру',
      over: 'Игра окончена', newBest: 'Новый рекорд!', scoreLine: 'Очки: {n}', bestLine: 'Рекорд: {n}',
      bricksLine: 'Собрано линий: {n} = {n} кирпичиков для кафе', combo: 'Комбо', streak: 'Серия!', perfect: 'Поле чистое!',
      lines: 'Линии', resumed: 'Игра продолжена', stage: 'Этап {n}',
      rulesHtml: `<ul>
        <li>Перетаскивай три предложенные фигуры на поле 9×9. Поворачивать их нельзя.</li>
        <li>Заполненные <b>строки, столбцы и квадраты 3×3</b> исчезают — можно несколько сразу.</li>
        <li>Очки: 1 за каждую клетку, за линии 18 × линии² (2 линии = 72, 3 = 162).</li>
        <li><b>Комбо:</b> если снова собираешь линию в течение 3 ходов, множитель растёт: ×1,5 · ×2 · … до ×5.</li>
        <li><b>Серия:</b> все три фигуры раунда собрали линии → +100. Поле полностью пустое → +300.</li>
        <li>Каждая собранная линия — <b>один кирпичик</b> для языкового кафе для беженцев (D-Bridge e.V.). Цель: 500.</li>
        <li>Если ни одна фигура не помещается, игра окончена. Один раз за игру можно продолжить за рекламу с тремя маленькими фигурами.</li>
        <li>В конце игры — 3 ⭐ за каждые 1000 очков.</li></ul>`
    },
    en: {
      cafe: 'Bricks for the café', cafeDone: 'Café stage complete! Thanks for helping build ☕', drag: 'Drag a piece onto the board',
      noFit: 'No room left', noFitSub: 'None of the pieces fits on the board any more.', cont: '▶ Continue for an ad',
      contSub: 'You get three small pieces – the ad donates to the language café.', end: 'End game',
      over: 'Game over', newBest: 'New best!', scoreLine: 'Score: {n}', bestLine: 'Best: {n}',
      bricksLine: '{n} lines cleared = {n} bricks for the café', combo: 'Combo', streak: 'Streak!', perfect: 'Board clear!',
      lines: 'lines', resumed: 'Game resumed', stage: 'Stage {n}',
      rulesHtml: `<ul>
        <li>Drag the three offered pieces onto the 9×9 board. Pieces cannot be rotated.</li>
        <li>Full <b>rows, columns and 3×3 boxes</b> are cleared – several at once, too.</li>
        <li>Points: 1 per placed cell, clearing 18 × lines² (2 lines = 72, 3 = 162).</li>
        <li><b>Combo:</b> clear again within 3 moves and the multiplier rises: ×1.5 · ×2 · … up to ×5.</li>
        <li><b>Streak:</b> all three pieces of a round clear lines → +100. Board completely empty → +300.</li>
        <li>Every cleared line is <b>one brick</b> for the language café for refugees (D-Bridge e.V.). Goal: 500.</li>
        <li>If no piece fits, the game is over. Once per game you can keep playing with three small pieces for an ad.</li>
        <li>At the end of the game you get 3 ⭐ per 1000 points.</li></ul>`
    },
    uk: {
      cafe: 'Цеглинки для кафе', cafeDone: 'Етап кафе збудовано! Дякуємо за допомогу ☕', drag: 'Перетягни фігуру на поле',
      noFit: 'Місця більше немає', noFitSub: 'Жодна фігура вже не вміщується на поле.', cont: '▶ Продовжити за рекламу',
      contSub: 'Ти отримаєш три маленькі фігури — реклама підтримає мовне кафе.', end: 'Завершити гру',
      over: 'Гру завершено', newBest: 'Новий рекорд!', scoreLine: 'Очки: {n}', bestLine: 'Рекорд: {n}',
      bricksLine: 'Зібрано ліній: {n} = {n} цеглинок для кафе', combo: 'Комбо', streak: 'Серія!', perfect: 'Поле чисте!',
      lines: 'лінії', resumed: 'Гру продовжено', stage: 'Етап {n}',
      rulesHtml: `<ul>
        <li>Перетягуй три запропоновані фігури на поле 9×9. Повертати їх не можна.</li>
        <li>Заповнені <b>рядки, стовпці та квадрати 3×3</b> зникають — можна кілька одразу.</li>
        <li>Очки: 1 за кожну клітинку, за лінії 18 × лінії² (2 лінії = 72, 3 = 162).</li>
        <li><b>Комбо:</b> якщо знову збираєш лінію протягом 3 ходів, множник зростає: ×1,5 · ×2 · … до ×5.</li>
        <li><b>Серія:</b> усі три фігури раунду зібрали лінії → +100. Поле повністю порожнє → +300.</li>
        <li>Кожна зібрана лінія — <b>одна цеглинка</b> для мовного кафе для біженців (D-Bridge e.V.). Мета: 500.</li>
        <li>Якщо жодна фігура не вміщується, гру завершено. Один раз за гру можна продовжити за рекламу з трьома маленькими фігурами.</li>
        <li>Наприкінці гри — 3 ⭐ за кожні 1000 очок.</li></ul>`
    }
  };

  const CROWN = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 11H5L3 8z" fill="#f5b301"/><path d="M5 19h14v2H5z" fill="#d48f00"/></svg>';
  const CUP = '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path d="M6 12h17v6a8.5 8.5 0 0 1-17 0z" fill="#a8693d"/><path d="M23 13.5h2.5a3.6 3.6 0 0 1 0 7.2H23" stroke="#a8693d" stroke-width="2.4" fill="none"/><path d="M4 27h21" stroke="#a8693d" stroke-width="2.4" stroke-linecap="round"/><path d="M11 9c-2-2 2-3 0-5.5M16 9c-2-2 2-3 0-5.5" stroke="#d08b57" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';

  function mount(root, ctx) {
    const s = Kit.strings(STR);
    const d = ctx.data;
    d.best = d.best || 0; d.bricks = d.bricks || 0; d.games = d.games || 0;
    const rng = Math.random;
    const N = Logic.N, SH = Logic.SH;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    let st, drag = null, raf = 0, shownScore = 0, overShown = false, destroyed = false;

    const K = Kit.shell(root, { top: true, cls: 'clear bb-area' });
    K.el.classList.add('bb');
    K.top.innerHTML = `
      <div class="bb-hud">
        <div class="bb-best" title="${UI.escapeHtml(s('best'))}">${CROWN}<b class="bb-best-n">${d.best}</b></div>
        <div class="bb-score"><b class="bb-score-n">0</b></div>
        <div class="bb-combo"><span class="bb-combo-t"></span></div>
      </div>
      <div class="bb-cafe">
        <span class="bb-cafe-ico">${CUP}</span>
        <div class="bb-cafe-body">
          <div class="bb-cafe-row"><b>${UI.escapeHtml(s('cafe'))}</b><span class="bb-cafe-n"></span></div>
          <div class="bb-bar"><i></i></div>
        </div>
      </div>`;
    let cellsHtml = '';
    for (let i = 0; i < N * N; i++) { const r = Math.floor(i / N), c = i % N; cellsHtml += `<div class="bb-cell${((Math.floor(r / 3) + Math.floor(c / 3)) % 2) ? ' bb-alt' : ''}"></div>`; }
    K.board.innerHTML = `
      <div class="bb-frame"><div class="bb-grid">${cellsHtml}<div class="bb-fx"></div></div><div class="bb-float"></div></div>
      <div class="bb-tray">${[0, 1, 2].map(i => `<div class="bb-slot" data-i="${i}"></div>`).join('')}</div>`;
    const $ = sel => K.el.querySelector(sel);
    const grid = $('.bb-grid'), fxLayer = $('.bb-fx'), floatLayer = $('.bb-float'), frame = $('.bb-frame');
    const cellEls = [...grid.querySelectorAll('.bb-cell')];
    const baseCls = cellEls.map(el => el.className);
    const slots = [...K.el.querySelectorAll('.bb-slot')];
    const scoreEl = $('.bb-score-n'), bestEl = $('.bb-best-n'), comboEl = $('.bb-combo');

    K.tool(`<span class="ico">📖</span>${UI.escapeHtml(Kit.t('rules'))}`, () => Kit.rules(Kit.t('rules'), s('rulesHtml')));
    K.tool(`<span class="ico">↻</span>${UI.escapeHtml(Kit.t('newGame'))}`, () => {
      if (st && st.score > 0 && !st.over) Kit.confirm(Kit.t('confirmNew'), () => newGame());
      else newGame();
    });

    /* ---------- rendering ---------- */
    function renderBoard(popIdx) {
      const pop = new Set(popIdx || []);
      for (let i = 0; i < cellEls.length; i++) {
        const v = st.board[i];
        cellEls[i].className = baseCls[i] + (v ? ` bb-tile bb-c${v}` : '') + (pop.has(i) ? ' bb-pop' : '');
      }
    }
    function pieceHtml(p) {
      const sh = SH[p.s];
      const cs = Math.min(21, Math.floor(80 / Math.max(sh.h, sh.w)));
      const cells = sh.cells.map(([r, c]) => `<i class="bb-tile bb-c${p.col}" style="grid-row:${r + 1};grid-column:${c + 1}"></i>`).join('');
      return `<div class="bb-piece" style="--cs:${cs}px;grid-template-columns:repeat(${sh.w},var(--cs));grid-template-rows:repeat(${sh.h},var(--cs))">${cells}</div>`;
    }
    function renderTray(animateIn) {
      slots.forEach((slot, i) => {
        const p = st.tray[i];
        slot.innerHTML = p ? pieceHtml(p) : '';
        slot.classList.toggle('bb-empty', !p);
        slot.classList.toggle('bb-nofit', !!p && !Logic.canFitAnywhere(st.board, SH[p.s].cells));
        if (animateIn && p) { const pc = slot.firstElementChild; pc.style.animationDelay = (i * 70) + 'ms'; pc.classList.add('bb-in'); }
      });
    }
    function renderCafe() {
      const total = d.bricks, stage = Math.floor(total / MILESTONE), inStage = total - stage * MILESTONE;
      $('.bb-cafe-n').textContent = stage > 0 ? `${s('stage', { n: stage + 1 })} · ${inStage} / ${MILESTONE}` : `${total} / ${MILESTONE}`;
      $('.bb-bar i').style.width = (inStage / MILESTONE * 100).toFixed(1) + '%';
    }
    function renderCombo() {
      const on = st.combo >= 2;
      comboEl.classList.toggle('on', on);
      if (on) comboEl.querySelector('.bb-combo-t').textContent = `${s('combo')} ×${Logic.comboMult(st.combo).toLocaleString(LOCALE())}`;
    }
    function animateScore() {
      cancelAnimationFrame(raf);
      const from = shownScore, to = st.score, t0 = performance.now(), dur = Math.min(600, 200 + (to - from) * 2);
      if (to < from || dur <= 0) { shownScore = to; scoreEl.textContent = to; return; }
      const step = now => {
        const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        shownScore = Math.round(from + (to - from) * e); scoreEl.textContent = shownScore;
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      if (to - from >= 10) Kit.bump(scoreEl);
    }
    function renderAll(animTray) {
      renderBoard(); renderTray(animTray); renderCafe(); renderCombo();
      shownScore = st.score; scoreEl.textContent = st.score; bestEl.textContent = Math.max(d.best, st.score);
    }

    /* ---------- persistence ---------- */
    function save() {
      d.saved = { board: st.board.slice(), tray: st.tray.map(p => p && { s: p.s, col: p.col }), score: st.score, combo: st.combo, idle: st.idle, handClears: st.handClears, lines: st.lines, adUsed: st.adUsed };
      ctx.save();
    }
    function newGame() {
      st = Logic.newState(rng); overShown = false;
      clearGhost(); renderAll(true); K.msg(s('drag')); save();
    }

    /* ---------- ghost preview ---------- */
    let ghostIdx = [];
    function clearGhost() {
      ghostIdx.forEach(i => { const v = st.board[i]; cellEls[i].className = baseCls[i] + (v ? ` bb-tile bb-c${v}` : ''); });
      ghostIdx = [];
    }
    function showGhost() {
      clearGhost();
      if (!drag || !drag.valid) return;
      const { r, c, sh, col } = drag;
      const pv = Logic.previewLines(st.board, sh.cells, r, c);
      sh.cells.forEach(([dr, dc]) => { const i = (r + dr) * N + c + dc; cellEls[i].className = baseCls[i] + ` bb-ghost bb-c${col}` + (pv.cells.has(i) ? ' bb-hl' : ''); ghostIdx.push(i); });
      pv.cells.forEach(i => { if (st.board[i]) { cellEls[i].className = baseCls[i] + ` bb-tile bb-c${col} bb-hl`; ghostIdx.push(i); } });
    }

    /* ---------- drag & drop ---------- */
    function metrics() {
      const a = cellEls[0].getBoundingClientRect(), b = cellEls[N - 1].getBoundingClientRect();
      const pitch = (b.left - a.left) / (N - 1);
      return { gx: a.left, gy: a.top, pitch, cs: a.width, gap: pitch - a.width };
    }
    function onDown(e) {
      if (drag || !st || st.over) return;
      if (e.button != null && e.button > 0) return;
      const slot = e.target.closest('.bb-slot'); if (!slot) return;
      const ti = +slot.dataset.i, p = st.tray[ti]; if (!p) return;
      e.preventDefault();
      const m = metrics(), sh = SH[p.s];
      const el = document.createElement('div'); el.className = 'bb-drag';
      el.style.cssText = `--cs:${m.cs}px;--gap:${m.gap}px;grid-template-columns:repeat(${sh.w},var(--cs));grid-template-rows:repeat(${sh.h},var(--cs))`;
      el.innerHTML = sh.cells.map(([r, c]) => `<i class="bb-tile bb-c${p.col}" style="grid-row:${r + 1};grid-column:${c + 1}"></i>`).join('');
      document.body.appendChild(el);
      const pw = sh.w * m.pitch - m.gap, ph = sh.h * m.pitch - m.gap;
      drag = { ti, sh, col: p.col, el, slot, m, pw, ph, touch: e.pointerType !== 'mouse', r: -99, c: -99, valid: false, id: e.pointerId };
      const pieceEl = slot.firstElementChild, pr = pieceEl.getBoundingClientRect();
      position(e.clientX, e.clientY);
      const er = el.getBoundingClientRect();
      const sc = pr.width / er.width;
      el.animate([{ transform: `translate(${pr.left - er.left}px, ${pr.top - er.top}px) scale(${sc})`, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }], { duration: 140, easing: 'cubic-bezier(.2,.8,.3,1)' });
      slot.classList.add('bb-lifted');
      K.msg('');
      ctx.sound('tap');
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    }
    function position(x, y) {
      const { m, pw, ph, el } = drag;
      const left = x - pw / 2;
      const top = drag.touch ? y - ph - Math.max(36, m.pitch * 1.25) : y - ph / 2;
      el.style.left = left + 'px'; el.style.top = top + 'px';
      const c = Math.round((left - m.gx) / m.pitch), r = Math.round((top - m.gy) / m.pitch);
      if (r !== drag.r || c !== drag.c) {
        drag.r = r; drag.c = c;
        const valid = Logic.fits(st.board, drag.sh.cells, r, c);
        if (valid !== drag.valid || valid) { drag.valid = valid; showGhost(); }
      }
    }
    function onMove(e) { if (!drag || e.pointerId !== drag.id) return; e.preventDefault(); position(e.clientX, e.clientY); }
    function endDrag() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      endDrag();
      const dd = drag; drag = null;
      clearGhost();
      if (dd.valid) { dd.el.remove(); dd.slot.classList.remove('bb-lifted'); place(dd.ti, dd.r, dd.c); }
      else returnToTray(dd);
    }
    function onCancel() { if (!drag) return; endDrag(); const dd = drag; drag = null; clearGhost(); returnToTray(dd); }
    function returnToTray(dd) {
      const pieceEl = dd.slot.firstElementChild;
      if (!pieceEl) { dd.el.remove(); dd.slot.classList.remove('bb-lifted'); return; }
      const pr = pieceEl.getBoundingClientRect(), er = dd.el.getBoundingClientRect();
      const a = dd.el.animate([{ transform: 'none', transformOrigin: '0 0' }, { transform: `translate(${pr.left - er.left}px, ${pr.top - er.top}px) scale(${pr.width / er.width})`, transformOrigin: '0 0' }], { duration: 180, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
      const done = () => { dd.el.remove(); dd.slot.classList.remove('bb-lifted'); };
      a.onfinish = done; later(done, 260);
      if (dd.r > -10) ctx.sound('bad');
    }

    /* ---------- placing & clearing ---------- */
    function place(ti, r, c) {
      const before = d.bricks;
      const res = Logic.applyMove(st, ti, r, c, rng);
      if (!res) return false;
      renderBoard(res.placed);
      if (res.n) {
        clearFx(res);
        ctx.sound(res.n > 1 || res.combo > 1 ? 'cascade' : 'brick');
        d.bricks += res.n;
        if (Math.floor(before / MILESTONE) < Math.floor(d.bricks / MILESTONE)) {
          later(() => { ctx.toast(s('cafeDone'), 'good'); if (window.FX) FX.confetti(); ctx.sound('fanfare'); }, 450);
        }
        if (d.bricks >= MILESTONE) ctx.badge('blocks_cafe');
        bumpCafe();
      } else ctx.sound('place');
      floatScore(res);
      animateScore();
      renderTray(res.newHand); renderCafe(); renderCombo();
      if (st.score > d.best) bestEl.textContent = st.score;
      if (st.score >= 1000) ctx.badge('blocks_1000');
      save();
      if (st.over) later(gameOver, res.n ? 750 : 420);
      return true;
    }
    function bumpCafe() { const b = $('.bb-cafe'); b.classList.remove('bb-brick'); void b.offsetWidth; b.classList.add('bb-brick'); }

    function cellPos(i) { const el = cellEls[i]; return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth }; }
    function clearFx(res) {
      // origin = centre of the placed piece, sweep spreads outwards from there
      const pr = res.placed.map(i => Math.floor(i / N)), pc = res.placed.map(i => i % N);
      const or = pr.reduce((a, b) => a + b, 0) / pr.length, oc = pc.reduce((a, b) => a + b, 0) / pc.length;
      const pal = PAL;
      let particles = 0;
      res.clearedIdx.forEach((i, k) => {
        const r = Math.floor(i / N), c = i % N, col = res.clearedCols[k];
        const delay = Math.round(Math.hypot(r - or, c - oc) * 28);
        const p = cellPos(i);
        const t = document.createElement('i'); t.className = `bb-burst bb-tile bb-c${col}`;
        t.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.w}px`;
        fxLayer.appendChild(t);
        t.animate([
          { transform: 'scale(1)', filter: 'brightness(1)', opacity: 1 },
          { transform: 'scale(1.12)', filter: 'brightness(1.8)', opacity: 1, offset: .35 },
          { transform: 'scale(.2) rotate(25deg)', filter: 'brightness(2)', opacity: 0 }
        ], { duration: 380, delay, easing: 'cubic-bezier(.3,.1,.4,1)', fill: 'both' }).onfinish = () => t.remove();
        if (particles < 48 && (k % 2 === 0)) {
          for (let q = 0; q < 2; q++) {
            particles++;
            const sp = document.createElement('i'); sp.className = 'bb-spark';
            const sz = 3 + Math.random() * 5;
            sp.style.cssText = `left:${p.x + p.w / 2}px;top:${p.y + p.w / 2}px;width:${sz}px;height:${sz}px;background:${pal[col][Math.random() < .5 ? 0 : 1]}`;
            fxLayer.appendChild(sp);
            const ang = Math.random() * Math.PI * 2, dist = 18 + Math.random() * 46;
            sp.animate([
              { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
              { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist + 24}px)) scale(.3) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], { duration: 520 + Math.random() * 300, delay: delay + 80, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).onfinish = () => sp.remove();
          }
        }
      });
      // light sweep bars across every cleared line
      const g0 = cellPos(0), gl = cellPos(N * N - 1), full = gl.x + gl.w - g0.x;
      const bar = (x, y, w, h, vertical) => {
        const b = document.createElement('i'); b.className = 'bb-sweep' + (vertical ? ' v' : '');
        b.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
        fxLayer.appendChild(b);
        b.animate([{ opacity: 0, backgroundPosition: vertical ? '0 120%' : '120% 0' }, { opacity: 1, offset: .2 }, { opacity: 0, backgroundPosition: vertical ? '0 -20%' : '-20% 0' }],
          { duration: 460, easing: 'ease-out', fill: 'both' }).onfinish = () => b.remove();
      };
      res.L.rows.forEach(r => { const p = cellPos(r * N); bar(g0.x, p.y, full, p.w, false); });
      res.L.cols.forEach(c => { const p = cellPos(c); bar(p.x, g0.y, p.w, full, true); });
      res.L.boxes.forEach(k => { const p = cellPos(Math.floor(k / 3) * 3 * N + (k % 3) * 3), q = cellPos((Math.floor(k / 3) * 3 + 2) * N + (k % 3) * 3 + 2); bar(p.x, p.y, q.x + q.w - p.x, q.y + q.w - p.y, false); });
      frame.classList.remove('bb-shake'); void frame.offsetWidth; if (res.n >= 2) frame.classList.add('bb-shake');
    }
    function floatScore(res) {
      const pr = res.placed.map(i => cellPos(i));
      const x = pr.reduce((a, p) => a + p.x + p.w / 2, 0) / pr.length, y = Math.min(...pr.map(p => p.y));
      const txt = (cls, text, cx, cy, delay) => {
        const t = document.createElement('span'); t.className = 'bb-ftxt ' + cls; t.textContent = text;
        t.style.left = cx + 'px'; t.style.top = cy + 'px'; floatLayer.appendChild(t);
        t.animate([
          { transform: 'translate(-50%,-30%) scale(.6)', opacity: 0 },
          { transform: 'translate(-50%,-80%) scale(1.1)', opacity: 1, offset: .2 },
          { transform: 'translate(-50%,-90%) scale(1)', opacity: 1, offset: .7 },
          { transform: 'translate(-50%,-160%) scale(.95)', opacity: 0 }
        ], { duration: 1050, delay: delay || 0, easing: 'ease-out', fill: 'both' }).onfinish = () => t.remove();
      };
      const fr = grid.getBoundingClientRect(), W = fr.width;
      const cx = Math.max(40, Math.min(W - 40, x + 8));
      txt(res.n ? 'big' : '', '+' + (res.pts - res.bonus), cx, y + 10);
      if (res.n && res.combo >= 2) txt('combo', `${s('combo')} ×${Number(res.mult).toLocaleString(LOCALE())}`, W / 2 + 8, W / 2 - 10, 120);
      else if (res.n >= 2) txt('combo', `${res.n} ${s('lines')}!`, W / 2 + 8, W / 2 - 10, 120);
      res.events.forEach((ev, k) => txt('bonus', `${s(ev)} +${ev === 'perfect' ? Logic.PERFECT_BONUS : Logic.STREAK_BONUS}`, W / 2 + 8, W / 2 + 30 + k * 34, 300 + k * 150));
    }

    /* ---------- game over ---------- */
    function gameOver() {
      if (destroyed || overShown || !st.over) return;
      overShown = true;
      ctx.sound('bad');
      frame.classList.add('bb-dim');
      const actions = [];
      if (!st.adUsed) actions.push({ label: s('cont'), cls: 'btn-ad', async onClick() {
        const ok = await ctx.ad();
        if (destroyed) return;
        if (ok) {
          st.adUsed = true; st.tray = Logic.smallHand(st.board, rng); st.over = !Logic.anyFits(st.board, st.tray);
          overShown = false; frame.classList.remove('bb-dim'); renderTray(true); save();
          if (st.over) later(gameOver, 300);
        } else { overShown = false; gameOver(); }
      } });
      actions.push({ label: s('end'), cls: st.adUsed ? 'btn-primary' : 'btn-ghost', onClick: () => finish() });
      UI.modal({
        dismissible: false,
        html: `<div class="gk-result"><div class="gk-r-icon">🧱</div><h3>${UI.escapeHtml(s('noFit'))}</h3>
          <p>${UI.escapeHtml(s('noFitSub'))}</p><p><b>${UI.escapeHtml(s('scoreLine', { n: st.score }))}</b></p>
          ${st.adUsed ? '' : `<p class="small muted">${UI.escapeHtml(s('contSub'))}</p>`}</div>`,
        actions
      });
    }
    function finish() {
      if (destroyed) return;
      const score = st.score, lines = st.lines, newBest = score > d.best;
      if (newBest) d.best = score;
      d.games++; d.saved = null; ctx.save();
      frame.classList.remove('bb-dim');
      const stars = Logic.starsFor(score);
      Kit.result(ctx, {
        result: (newBest && score >= 500) || stars > 0 ? 'win' : 'lose',
        title: newBest && score > 0 ? s('newBest') : s('over'),
        lines: [s('scoreLine', { n: score }), s('bestLine', { n: d.best }), s('bricksLine', { n: lines })],
        stars,
        onAgain: () => newGame()
      });
      st.over = true;
      bestEl.textContent = d.best;
    }

    /* ---------- start ---------- */
    K.board.addEventListener('pointerdown', onDown);
    if (Logic.validSave(d.saved)) {
      const sv = d.saved;
      st = { board: sv.board.slice(), tray: sv.tray.map(p => p && { s: p.s, col: p.col }), score: sv.score, combo: sv.combo || 0, idle: sv.idle || 0, handClears: sv.handClears || 0, lines: sv.lines || 0, adUsed: !!sv.adUsed, over: false };
      if (st.tray.every(p => !p)) st.tray = Logic.makeHand(st.board, rng, st.score);
      st.over = !Logic.anyFits(st.board, st.tray);
      renderAll(true);
      K.msg(st.score > 0 ? s('resumed') : s('drag'));
      if (st.over) later(gameOver, 500);
    } else newGame();

    // Debug / test hook
    root.__game = {
      logic: Logic,
      state: () => JSON.parse(JSON.stringify(st)),
      place: (ti, r, c) => place(ti, r, c),
      fitsAt: (ti, r, c) => !!st.tray[ti] && Logic.fits(st.board, SH[st.tray[ti].s].cells, r, c),
      setBoard(arr) { st.board = arr.slice(); st.over = !Logic.anyFits(st.board, st.tray); renderAll(); save(); },
      setTray(ids) { st.tray = ids.map((id, i) => id ? { s: id, col: (i % 8) + 1 } : null); st.over = !Logic.anyFits(st.board, st.tray); renderTray(true); save(); },
      gameOver: () => { st.over = true; gameOver(); },
      newGame
    };

    return {
      destroy() {
        destroyed = true;
        endDrag();
        K.board.removeEventListener('pointerdown', onDown);
        if (drag) { drag.el.remove(); drag = null; }
        document.querySelectorAll('.bb-drag').forEach(el => el.remove());
        cancelAnimationFrame(raf);
        timers.forEach(id => clearTimeout(id)); timers.clear();
        delete root.__game;
      }
    };
  }

  Games.register({
    id: 'blocks', icon: '🧱', partner: 'p6', isNew: true,
    name: { de: 'Bausteine', en: 'Bricks', ru: 'Кирпичики', uk: 'Цеглинки' },
    tagline: { de: 'Jede volle Reihe ist ein Baustein fürs Sprachcafé.', en: 'Every full line is a brick for the language café.', ru: 'Каждая собранная линия — кирпичик для языкового кафе.', uk: 'Кожна зібрана лінія — цеглинка для мовного кафе.' },
    kicker: { de: 'Projekt des Monats', en: 'Project of the month', ru: 'Проект месяца', uk: 'Проєкт місяця' },
    badges: [
      { id: 'blocks_1000', icon: '🏗️', name: { de: '1000 Punkte in Bausteine', en: '1000 points in Bricks', ru: '1000 очков в «Кирпичиках»', uk: '1000 очок у «Цеглинках»' } },
      { id: 'blocks_cafe', icon: '☕', name: { de: 'Café-Bauer: 500 Bausteine', en: 'Café builder: 500 bricks', ru: 'Строитель кафе: 500 кирпичиков', uk: 'Будівничий кафе: 500 цеглинок' } }
    ],
    thumb, art, mount,
    logic: Logic
  });
})();
