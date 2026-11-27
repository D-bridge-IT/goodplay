// Sudoku — generator with uniqueness check, technique-based difficulty rating, daily puzzle,
// notes, hints with explanations, mistakes limit, save/resume. Prefix: .su-
(function () {
  'use strict';

  /* =====================================================================
     Pure logic (no DOM) — testable in Node via the registered game's .logic
     ===================================================================== */
  const R = new Uint8Array(81), C = new Uint8Array(81), B = new Uint8Array(81);
  for (let i = 0; i < 81; i++) { R[i] = (i / 9) | 0; C[i] = i % 9; B[i] = ((R[i] / 3) | 0) * 3 + ((C[i] / 3) | 0); }
  const UNITS = [];
  for (let r = 0; r < 9; r++) { const u = []; for (let c = 0; c < 9; c++) u.push(r * 9 + c); UNITS.push(u); }
  for (let c = 0; c < 9; c++) { const u = []; for (let r = 0; r < 9; r++) u.push(r * 9 + c); UNITS.push(u); }
  for (let b = 0; b < 9; b++) { const r0 = ((b / 3) | 0) * 3, c0 = (b % 3) * 3, u = []; for (let k = 0; k < 9; k++) u.push((r0 + ((k / 3) | 0)) * 9 + c0 + (k % 3)); UNITS.push(u); }
  const PEERS = [];
  for (let i = 0; i < 81; i++) {
    const s = new Set();
    for (const u of [UNITS[R[i]], UNITS[9 + C[i]], UNITS[18 + B[i]]]) for (const j of u) if (j !== i) s.add(j);
    PEERS.push([...s]);
  }
  const POP = new Uint8Array(512); for (let m = 1; m < 512; m++) POP[m] = POP[m >> 1] + (m & 1);
  const LOW = new Uint8Array(512); for (let m = 1; m < 512; m++) { let d = 1; while (!(m & (1 << (d - 1)))) d++; LOW[m] = d; }
  const bit = d => 1 << (d - 1);
  const digitsOf = m => { const a = []; for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) a.push(d); return a; };
  const sees = (a, b) => a !== b && (R[a] === R[b] || C[a] === C[b] || B[a] === B[b]);
  const shuffleArr = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  function combos(arr, n, fn) { // calls fn(combo) for every n-subset; stops when fn returns true
    const idx = []; const rec = (start, depth) => {
      if (depth === n) return fn(idx.map(k => arr[k]));
      for (let k = start; k <= arr.length - (n - depth); k++) { idx[depth] = k; if (rec(k + 1, depth + 1)) return true; }
      return false;
    }; return rec(0, 0);
  }

  // Backtracking solver with MRV. Counts solutions up to `limit`; rnd randomises digit order.
  function solve(grid, limit = 2, rnd = null) {
    const v = Array.from(grid); const rm = new Int32Array(9), cm = new Int32Array(9), bm = new Int32Array(9);
    for (let i = 0; i < 81; i++) if (v[i]) {
      const b = bit(v[i]); if ((rm[R[i]] | cm[C[i]] | bm[B[i]]) & b) return { count: 0, solution: null };
      rm[R[i]] |= b; cm[C[i]] |= b; bm[B[i]] |= b;
    }
    let count = 0, first = null;
    const rec = () => {
      let best = -1, bmask = 0, bc = 10;
      for (let i = 0; i < 81; i++) if (!v[i]) {
        const m = ~(rm[R[i]] | cm[C[i]] | bm[B[i]]) & 511; const p = POP[m];
        if (p < bc) { bc = p; best = i; bmask = m; if (p < 2) break; }
      }
      if (best < 0) { count++; if (!first) first = v.slice(); return count >= limit; }
      if (!bc) return false;
      let ds = digitsOf(bmask); if (rnd) ds = shuffleArr(ds, rnd);
      const r = R[best], c = C[best], x = B[best];
      for (const d of ds) {
        const b = bit(d); v[best] = d; rm[r] |= b; cm[c] |= b; bm[x] |= b;
        if (rec()) return true;
        rm[r] &= ~b; cm[c] &= ~b; bm[x] &= ~b;
      }
      v[best] = 0; return false;
    };
    rec();
    return { count, solution: first };
  }

  // ---- human-style logical solver (used for rating and hints) ----
  function candidates(v) {
    const c = new Int32Array(81);
    for (let i = 0; i < 81; i++) if (!v[i]) { let m = 511; for (const p of PEERS[i]) if (v[p]) m &= ~bit(v[p]); c[i] = m; }
    return c;
  }
  function assign(v, c, i, d) { v[i] = d; c[i] = 0; const nb = ~bit(d); for (const p of PEERS[i]) c[p] &= nb; }
  const UNIT_ORDER = [18, 19, 20, 21, 22, 23, 24, 25, 26, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const unitKind = u => u < 9 ? 'row' : u < 18 ? 'col' : 'box';
  function singleAt(v, c, i) {
    if (v[i]) return null;
    for (const d of digitsOf(c[i])) {
      const b = bit(d);
      for (const u of [18 + B[i], R[i], 9 + C[i]]) {
        let only = true; for (const j of UNITS[u]) if (j !== i && !v[j] && (c[j] & b)) { only = false; break; }
        if (only) return { i, d, kind: unitKind(u), unit: u };
      }
    }
    if (POP[c[i]] === 1) return { i, d: LOW[c[i]], kind: 'naked', unit: -1 };
    return null;
  }
  function findSingle(v, c) {
    for (const u of UNIT_ORDER) {
      const cells = UNITS[u];
      for (let d = 1; d <= 9; d++) {
        const b = bit(d); let pos = -1, n = 0, placed = false;
        for (const j of cells) { if (v[j] === d) { placed = true; break; } if (!v[j] && (c[j] & b)) { n++; pos = j; } }
        if (!placed && n === 1) return { i: pos, d, kind: unitKind(u), unit: u };
      }
    }
    for (let i = 0; i < 81; i++) if (!v[i] && POP[c[i]] === 1) return { i, d: LOW[c[i]], kind: 'naked', unit: -1 };
    return null;
  }
  const elim = (c, i, mask) => { if (c[i] & mask) { c[i] &= ~mask; return true; } return false; };

  function lockedCandidates(v, c) {
    let any = false;
    for (let b = 0; b < 9; b++) for (let d = 1; d <= 9; d++) { // pointing
      const bb = bit(d); const cells = UNITS[18 + b].filter(j => !v[j] && (c[j] & bb)); if (cells.length < 2) continue;
      if (cells.every(j => R[j] === R[cells[0]])) for (const j of UNITS[R[cells[0]]]) if (B[j] !== b && !v[j] && elim(c, j, bb)) any = true;
      if (cells.every(j => C[j] === C[cells[0]])) for (const j of UNITS[9 + C[cells[0]]]) if (B[j] !== b && !v[j] && elim(c, j, bb)) any = true;
    }
    if (any) return true;
    for (let u = 0; u < 18; u++) for (let d = 1; d <= 9; d++) { // claiming
      const bb = bit(d); const cells = UNITS[u].filter(j => !v[j] && (c[j] & bb)); if (cells.length < 2) continue;
      if (cells.every(j => B[j] === B[cells[0]])) for (const j of UNITS[18 + B[cells[0]]]) if (!UNITS[u].includes(j) && !v[j] && elim(c, j, bb)) any = true;
    }
    return any;
  }
  function nakedSubset(v, c, n) {
    let any = false;
    for (const u of UNITS) {
      const empt = u.filter(j => !v[j]); if (empt.length <= n) continue;
      const cand = empt.filter(j => POP[c[j]] >= 2 && POP[c[j]] <= n);
      combos(cand, n, set => {
        let m = 0; for (const j of set) m |= c[j];
        if (POP[m] !== n) return false;
        for (const j of empt) if (!set.includes(j) && elim(c, j, m)) any = true;
        return any;
      });
      if (any) return true;
    }
    return false;
  }
  function hiddenSubset(v, c, n) {
    let any = false;
    for (const u of UNITS) {
      const empt = u.filter(j => !v[j]); if (empt.length <= n) continue;
      const pos = {}; const ds = [];
      for (let d = 1; d <= 9; d++) { const b = bit(d); let pm = 0; empt.forEach((j, k) => { if (c[j] & b) pm |= 1 << k; }); if (pm && POP[pm] <= n) { pos[d] = pm; ds.push(d); } }
      combos(ds, n, set => {
        let pm = 0, dm = 0; for (const d of set) { pm |= pos[d]; dm |= bit(d); }
        if (POP[pm] !== n) return false;
        empt.forEach((j, k) => { if ((pm >> k) & 1) { if (c[j] & ~dm) { c[j] &= dm; any = true; } } });
        return any;
      });
      if (any) return true;
    }
    return false;
  }
  function fish(v, c, n) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      for (const rowsBase of [true, false]) {
        const lines = []; const masks = {};
        for (let L = 0; L < 9; L++) {
          let m = 0, placed = false;
          for (let k = 0; k < 9; k++) { const j = rowsBase ? L * 9 + k : k * 9 + L; if (v[j] === d) placed = true; if (!v[j] && (c[j] & b)) m |= 1 << k; }
          if (!placed && POP[m] >= 2 && POP[m] <= n) { lines.push(L); masks[L] = m; }
        }
        let any = false;
        combos(lines, n, set => {
          let m = 0; for (const L of set) m |= masks[L];
          if (POP[m] !== n) return false;
          for (let k = 0; k < 9; k++) if ((m >> k) & 1) for (let L = 0; L < 9; L++) {
            if (set.includes(L)) continue; const j = rowsBase ? L * 9 + k : k * 9 + L;
            if (!v[j] && elim(c, j, b)) any = true;
          }
          return any;
        });
        if (any) return true;
      }
    }
    return false;
  }
  function xyWing(v, c) {
    const bi = []; for (let i = 0; i < 81; i++) if (!v[i] && POP[c[i]] === 2) bi.push(i);
    for (const p of bi) {
      const pm = c[p];
      for (const q1 of bi) {
        if (!sees(p, q1) || c[q1] === pm || POP[c[q1] & pm] !== 1) continue;
        const z = c[q1] & ~pm; const other = pm & ~c[q1];
        for (const q2 of bi) {
          if (q2 === q1 || !sees(p, q2) || c[q2] !== (other | z)) continue;
          let any = false;
          for (let j = 0; j < 81; j++) if (j !== q1 && j !== q2 && j !== p && !v[j] && sees(j, q1) && sees(j, q2) && elim(c, j, z)) any = true;
          if (any) return true;
        }
      }
    }
    return false;
  }
  // Techniques in order of difficulty: [name, level, fn]
  const TECHS = [
    ['locked', 2, lockedCandidates],
    ['pair', 3, (v, c) => nakedSubset(v, c, 2)],
    ['hpair', 3, (v, c) => hiddenSubset(v, c, 2)],
    ['triple', 3, (v, c) => nakedSubset(v, c, 3)],
    ['htriple', 3, (v, c) => hiddenSubset(v, c, 3)],
    ['xwing', 3, (v, c) => fish(v, c, 2)],
    ['xywing', 4, xyWing],
    ['swordfish', 4, (v, c) => fish(v, c, 3)],
    ['quad', 4, (v, c) => nakedSubset(v, c, 4)]
  ];
  const TECH_LEVEL = {}; TECHS.forEach(t => { TECH_LEVEL[t[0]] = t[1]; });

  // Rate a puzzle: 1 = singles only, 2 = locked candidates / pairs, 3 = triples / X-Wing,
  // 4 = XY-Wing / Swordfish / quads, 5 = needs more than these techniques.
  function rate(grid, cap = 9) {
    const v = Array.from(grid), c = candidates(v); let level = 1; const used = {};
    for (;;) {
      const s = findSingle(v, c);
      if (s) { assign(v, c, s.i, s.d); continue; }
      let empty = false; for (let i = 0; i < 81; i++) if (!v[i]) { if (!c[i]) return { level: 9, solved: false, used }; empty = true; }
      if (!empty) break;
      let applied = null;
      for (const t of TECHS) { if (t[1] > cap) break; if (t[2](v, c)) { applied = t; break; } }
      if (!applied) return { level: 5, solved: false, used };
      used[applied[0]] = (used[applied[0]] || 0) + 1;
      if (applied[1] > level) level = applied[1];
    }
    return { level, solved: true, used };
  }

  // Next logical placement for the hint: prefers the selected cell, otherwise any single.
  function hintStep(values, sel = -1) {
    const v = Array.from(values), c = candidates(v); let tech = null;
    for (let guard = 0; guard < 200; guard++) {
      if (sel >= 0 && !v[sel]) { const s = singleAt(v, c, sel); if (s) return Object.assign(s, { tech }); }
      const s = findSingle(v, c); if (s) return Object.assign(s, { tech });
      let applied = null; for (const t of TECHS) if (t[2](v, c)) { applied = t; break; }
      if (!applied) return null;
      if (!tech || TECH_LEVEL[applied[0]] > TECH_LEVEL[tech]) tech = applied[0];
    }
    return null;
  }

  // target: stop removing at this many givens; stopAt: stop early once the wanted level is reached;
  // cap: never let the puzzle need techniques above this level while removing.
  const DIFF = {
    easy: { target: 38, stopAt: 38, maxGivens: 41, cap: 1, tries: 20, ok: l => l === 1 },
    medium: { target: 27, stopAt: 32, maxGivens: 34, cap: 2, tries: 100, ok: l => l === 2 },
    hard: { target: 22, stopAt: 28, maxGivens: 31, cap: 3, tries: 160, ok: l => l === 3 },
    // Expert prefers puzzles that XY-Wing / Swordfish crack; falls back to harder ones after 30 tries.
    expert: { target: 20, stopAt: 0, maxGivens: 28, cap: 9, tries: 120, ok: l => l >= 4, prefer: l => l === 4, preferTries: 30 }
  };
  const DIFF_IDS = ['easy', 'medium', 'hard', 'expert'];
  const levelScore = (diff, l) => { const want = { easy: 1, medium: 2, hard: 3, expert: 4 }[diff]; return diff === 'expert' ? Math.min(l, 5) : 10 - Math.abs(l - want) * 3; };

  // Generator as an iterator so the UI can run it in small time-boxed chunks.
  // Deterministic for a given rnd (attempt cap instead of a time cap) → same daily puzzle everywhere.
  function* generator(diff, rnd, maxAttempts) {
    const cfg = DIFF[diff]; let best = null, bestScore = -1e9, okRes = null;
    maxAttempts = maxAttempts || cfg.tries;
    for (let a = 0; a < maxAttempts; a++) {
      const sol = solve(new Array(81).fill(0), 1, rnd).solution;
      const pz = sol.slice(); let givens = 81;
      for (const i of shuffleArr([...Array(41).keys()], rnd)) {
        if (givens <= cfg.target) break;
        const j = 80 - i, vi = pz[i], vj = pz[j];
        pz[i] = 0; pz[j] = 0;
        let lv = 0;
        if (solve(pz, 2).count !== 1 || (cfg.cap < 9 && (lv = rate(pz, cfg.cap).level) > cfg.cap)) { pz[i] = vi; pz[j] = vj; }
        else {
          givens -= (i === j ? 1 : 2);
          if (lv && cfg.ok(lv) && givens <= cfg.stopAt) { yield null; break; }
        }
        yield null;
      }
      const lv = rate(pz).level;
      const res = { puzzle: pz, solution: sol, level: lv, givens, attempts: a + 1 };
      if (cfg.ok(lv) && givens <= cfg.maxGivens) {
        if (!cfg.prefer || cfg.prefer(lv)) return res;
        if (!okRes) okRes = res;
      }
      if (okRes && a + 1 >= cfg.preferTries) return okRes;
      const sc = levelScore(diff, lv) - (givens > cfg.maxGivens ? 5 : 0);
      if (sc > bestScore) { bestScore = sc; best = res; }
      yield null;
    }
    return best;
  }
  function generateSync(diff, rnd, maxAttempts) { const it = generator(diff, rnd, maxAttempts); let r; do { r = it.next(); } while (!r.done); return r.value; }

  const LOGIC = { solve, rate, hintStep, generator, generateSync, candidates, UNITS, PEERS, R, C, B, DIFF, TECHS };

  /* =====================================================================
     Strings
     ===================================================================== */
  const s = Kit.strings({
    de: {
      daily: 'Rätsel des Tages', dailyShort: 'Tag', mistakes: 'Fehler', pause: 'Pause', paused: 'Pausiert', resume: 'Weiter',
      notes: 'Notizen', erase: 'Löschen', generating: 'Rätsel wird erstellt …', newPuzzle: 'Neues Rätsel',
      solved: 'Gelöst!', bestTime: 'Rekord', yourTime: 'Deine Zeit', newRecord: 'Neuer Rekord!', dailyDone: 'Tagesrätsel heute schon gelöst ✓ – morgen gibt es ein neues.',
      dailyBonus: '+10 ⭐ Tagesbonus', streak: 'Serie: {n} Tage',
      overTitle: 'Drei Fehler', overText: 'Das Fehlerlimit ist erreicht. Mit einer Anzeige spielst du weiter – und spendest dabei.',
      continueAd: 'Weiterspielen (Anzeige)', secondChance: 'Weiter geht\'s – noch ein Fehler erlaubt.',
      wrong: 'Das passt hier nicht.', locked: 'Dieses Feld steht schon fest.', selectCell: 'Wähle zuerst ein Feld.',
      h_naked: 'In diesem Feld ist nur noch die {d} möglich.',
      h_row: 'Nur hier passt die {d} in diese Zeile.', h_col: 'Nur hier passt die {d} in diese Spalte.', h_box: 'Nur hier passt die {d} in diesen Block.',
      h_reveal: 'Hier gehört die {d} hin.', h_with: 'Nach „{t}“: ', h_fixed: 'Falsche Ziffer korrigiert: hier gehört die {d} hin.',
      t_locked: 'Gesperrte Kandidaten', t_pair: 'Nacktes Paar', t_hpair: 'Verstecktes Paar', t_triple: 'Nacktes Tripel', t_htriple: 'Verstecktes Tripel',
      t_xwing: 'X-Wing', t_xywing: 'XY-Wing', t_swordfish: 'Schwertfisch', t_quad: 'Nacktes Quartett',
      rulesHtml: `<ul>
        <li>Fülle das 9×9-Gitter so, dass jede <b>Zeile</b>, jede <b>Spalte</b> und jeder <b>3×3-Block</b> die Ziffern 1–9 genau einmal enthält.</li>
        <li>Tippe ein Feld an und dann eine Ziffer. Jedes Rätsel hat genau <b>eine</b> Lösung.</li>
        <li><b>Notizen</b> (N) merken mögliche Ziffern; sie verschwinden automatisch, wenn die Ziffer in Zeile, Spalte oder Block gesetzt wird.</li>
        <li>Nach <b>3 Fehlern</b> ist das Spiel vorbei – oder du spielst mit einer Anzeige weiter.</li>
        <li><b>Tipp</b> deckt ein logisch bestimmbares Feld auf und erklärt, warum.</li>
        <li>Tastatur: 1–9, Pfeiltasten, Rücktaste, N für Notizen, Strg+Z.</li>
        <li>Sterne: Leicht 8 · Mittel 15 · Schwer 25 · Experte 40, Tagesrätsel +10.</li></ul>`
    },
    ru: {
      daily: 'Головоломка дня', dailyShort: 'День', mistakes: 'Ошибки', pause: 'Пауза', paused: 'Пауза', resume: 'Продолжить',
      notes: 'Заметки', erase: 'Стереть', generating: 'Создаём головоломку …', newPuzzle: 'Новая головоломка',
      solved: 'Решено!', bestTime: 'Рекорд', yourTime: 'Ваше время', newRecord: 'Новый рекорд!', dailyDone: 'Головоломка дня уже решена ✓ — завтра будет новая.',
      dailyBonus: '+10 ⭐ бонус дня', streak: 'Серия: {n} дн.',
      overTitle: 'Три ошибки', overText: 'Лимит ошибок исчерпан. Посмотрите рекламу, чтобы продолжить, — и сделайте пожертвование.',
      continueAd: 'Продолжить (реклама)', secondChance: 'Продолжаем — можно ошибиться ещё раз.',
      wrong: 'Сюда это не подходит.', locked: 'Эта клетка уже заполнена.', selectCell: 'Сначала выберите клетку.',
      h_naked: 'В этой клетке возможна только {d}.',
      h_row: 'Только сюда в этой строке подходит {d}.', h_col: 'Только сюда в этом столбце подходит {d}.', h_box: 'Только сюда в этом блоке подходит {d}.',
      h_reveal: 'Здесь должна стоять {d}.', h_with: 'После приёма «{t}»: ', h_fixed: 'Ошибка исправлена: здесь должна стоять {d}.',
      t_locked: 'Запертые кандидаты', t_pair: 'Открытая пара', t_hpair: 'Скрытая пара', t_triple: 'Открытая тройка', t_htriple: 'Скрытая тройка',
      t_xwing: 'X-Wing', t_xywing: 'XY-Wing', t_swordfish: 'Рыба-меч', t_quad: 'Открытая четвёрка',
      rulesHtml: `<ul>
        <li>Заполните сетку 9×9 так, чтобы в каждой <b>строке</b>, каждом <b>столбце</b> и каждом <b>блоке 3×3</b> цифры 1–9 встречались ровно один раз.</li>
        <li>Нажмите на клетку, затем на цифру. У каждой головоломки ровно <b>одно</b> решение.</li>
        <li><b>Заметки</b> (N) помогают отмечать варианты; они исчезают сами, когда цифра ставится в строке, столбце или блоке.</li>
        <li>После <b>3 ошибок</b> игра окончена — или продолжите за просмотр рекламы.</li>
        <li><b>Подсказка</b> открывает логически определимую клетку и объясняет почему.</li>
        <li>Клавиатура: 1–9, стрелки, Backspace, N — заметки, Ctrl+Z.</li>
        <li>Звёзды: лёгкий 8 · средний 15 · сложный 25 · эксперт 40, головоломка дня +10.</li></ul>`
    },
    en: {
      daily: 'Puzzle of the day', dailyShort: 'Day', mistakes: 'Mistakes', pause: 'Pause', paused: 'Paused', resume: 'Resume',
      notes: 'Notes', erase: 'Erase', generating: 'Creating puzzle …', newPuzzle: 'New puzzle',
      solved: 'Solved!', bestTime: 'Best', yourTime: 'Your time', newRecord: 'New record!', dailyDone: 'Today’s puzzle is already solved ✓ – a new one comes tomorrow.',
      dailyBonus: '+10 ⭐ daily bonus', streak: 'Streak: {n} days',
      overTitle: 'Three mistakes', overText: 'You’ve reached the mistake limit. Watch an ad to keep playing – and donate while you’re at it.',
      continueAd: 'Keep playing (ad)', secondChance: 'Here we go – one more mistake allowed.',
      wrong: 'That doesn’t fit here.', locked: 'This cell is already fixed.', selectCell: 'Select a cell first.',
      h_naked: 'Only {d} is still possible in this cell.',
      h_row: 'This is the only place for {d} in this row.', h_col: 'This is the only place for {d} in this column.', h_box: 'This is the only place for {d} in this box.',
      h_reveal: '{d} goes here.', h_with: 'After “{t}”: ', h_fixed: 'Wrong digit corrected: {d} goes here.',
      t_locked: 'Locked candidates', t_pair: 'Naked pair', t_hpair: 'Hidden pair', t_triple: 'Naked triple', t_htriple: 'Hidden triple',
      t_xwing: 'X-Wing', t_xywing: 'XY-Wing', t_swordfish: 'Swordfish', t_quad: 'Naked quad',
      rulesHtml: `<ul>
        <li>Fill the 9×9 grid so that every <b>row</b>, every <b>column</b> and every <b>3×3 box</b> contains the digits 1–9 exactly once.</li>
        <li>Tap a cell, then a digit. Every puzzle has exactly <b>one</b> solution.</li>
        <li><b>Notes</b> (N) keep track of possible digits; they disappear automatically when the digit is placed in the row, column or box.</li>
        <li>After <b>3 mistakes</b> the game is over – or you keep playing with an ad.</li>
        <li><b>Hint</b> reveals a cell that can be found by logic and explains why.</li>
        <li>Keyboard: 1–9, arrow keys, Backspace, N for notes, Ctrl+Z.</li>
        <li>Stars: Easy 8 · Medium 15 · Hard 25 · Expert 40, puzzle of the day +10.</li></ul>`
    },
    uk: {
      daily: 'Головоломка дня', dailyShort: 'День', mistakes: 'Помилки', pause: 'Пауза', paused: 'Пауза', resume: 'Продовжити',
      notes: 'Нотатки', erase: 'Стерти', generating: 'Створюємо головоломку …', newPuzzle: 'Нова головоломка',
      solved: 'Розв’язано!', bestTime: 'Рекорд', yourTime: 'Твій час', newRecord: 'Новий рекорд!', dailyDone: 'Головоломку дня вже розв’язано ✓ — завтра буде нова.',
      dailyBonus: '+10 ⭐ бонус дня', streak: 'Серія: {n} дн.',
      overTitle: 'Три помилки', overText: 'Ліміт помилок вичерпано. Переглянь рекламу, щоб продовжити, — і зроби пожертву.',
      continueAd: 'Продовжити (реклама)', secondChance: 'Продовжуємо — можна помилитися ще раз.',
      wrong: 'Сюди це не підходить.', locked: 'Ця клітинка вже заповнена.', selectCell: 'Спершу вибери клітинку.',
      h_naked: 'У цій клітинці можлива лише цифра {d}.',
      h_row: 'Лише сюди в цьому рядку підходить {d}.', h_col: 'Лише сюди в цьому стовпці підходить {d}.', h_box: 'Лише сюди в цьому блоці підходить {d}.',
      h_reveal: 'Тут має стояти {d}.', h_with: 'Після прийому «{t}»: ', h_fixed: 'Помилку виправлено: тут має стояти {d}.',
      t_locked: 'Заблоковані кандидати', t_pair: 'Відкрита пара', t_hpair: 'Прихована пара', t_triple: 'Відкрита трійка', t_htriple: 'Прихована трійка',
      t_xwing: 'X-Wing', t_xywing: 'XY-Wing', t_swordfish: 'Риба-меч', t_quad: 'Відкрита четвірка',
      rulesHtml: `<ul>
        <li>Заповни сітку 9×9 так, щоб у кожному <b>рядку</b>, кожному <b>стовпці</b> і кожному <b>блоці 3×3</b> цифри 1–9 траплялися рівно один раз.</li>
        <li>Торкнися клітинки, потім цифри. Кожна головоломка має рівно <b>один</b> розв’язок.</li>
        <li><b>Нотатки</b> (N) допомагають позначати варіанти; вони зникають самі, коли цифру ставлять у рядку, стовпці чи блоці.</li>
        <li>Після <b>3 помилок</b> гру завершено — або продовж за перегляд реклами.</li>
        <li><b>Підказка</b> відкриває клітинку, яку можна визначити логічно, і пояснює чому.</li>
        <li>Клавіатура: 1–9, стрілки, Backspace, N — нотатки, Ctrl+Z.</li>
        <li>Зірки: легкий 8 · середній 15 · складний 25 · експерт 40, головоломка дня +10.</li></ul>`
    }
  });
  const NAME = { de: 'Sudoku', en: 'Sudoku', ru: 'Судоку', uk: 'Судоку' };

  const STARS = { easy: 8, medium: 15, hard: 25, expert: 40 };
  const MAX_MISTAKES = 3;
  const DAILY_DIFF = ['expert', 'easy', 'medium', 'medium', 'hard', 'medium', 'hard']; // by weekday (Sun..Sat)
  const dayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  const prevDayKey = () => { const d = new Date(Date.now() - 864e5); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  const enc = a => a.join('');
  const dec = str => Array.from(str, ch => +ch);

  const ICON = {
    undo: '<svg viewBox="0 0 24 24"><path d="M9 7H4V2M4.3 7A8 8 0 1 1 4 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    erase: '<svg viewBox="0 0 24 24"><path d="M20 20H9L4 15a2 2 0 0 1 0-2.8L13.2 3a2 2 0 0 1 2.8 0l4 4a2 2 0 0 1 0 2.8L11 19" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 9.5l6 6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>',
    notes: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/><path d="M14 7l3 3" stroke="currentColor" stroke-width="2.1"/></svg>',
    hint: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    rules: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>'
  };
  const calIcon = day => `<svg viewBox="0 0 24 24" class="su-cal"><rect x="3" y="4.5" width="18" height="16.5" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9.5h18" stroke="currentColor" stroke-width="2"/><path d="M8 2.5v4M16 2.5v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="12" y="18.3" text-anchor="middle" font-size="8.5" font-weight="800" fill="currentColor" font-family="system-ui,Segoe UI,sans-serif">${day}</text></svg>`;

  let uid = 0;

  /* =====================================================================
     Game registration + UI
     ===================================================================== */
  Games.register({
    id: 'sudoku', icon: '🔢', partner: 'p3', tier: 'top', isNew: true,
    name: NAME,
    tagline: { de: 'Klassisches Zahlenrätsel – jedes mit genau einer Lösung', en: 'The classic number puzzle – each with exactly one solution', ru: 'Классика с цифрами — у каждой задачи ровно одно решение', uk: 'Класика з цифрами — кожна задача має рівно один розв’язок' },
    kicker: { de: 'Täglich neu', en: 'New every day', ru: 'Новая каждый день', uk: 'Нова щодня' },
    badges: [
      { id: 'sudoku_win', icon: '🔢', name: { de: 'Erstes Sudoku gelöst', en: 'First Sudoku solved', ru: 'Первое судоку решено', uk: 'Перше судоку розв’язано' } },
      { id: 'sudoku_expert', icon: '🧠', name: { de: 'Sudoku-Experte', en: 'Sudoku expert', ru: 'Эксперт судоку', uk: 'Експерт судоку' } }
    ],
    logic: LOGIC,
    thumb() {
      const id = 'suT' + (uid++);
      const digits = [[5, 3, 0], [0, 7, 0], [9, 0, 1]];
      let cells = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x = 54 + c * 18, y = 13 + r * 18, d = digits[r][c], hl = r === 1 && c === 1;
        cells += `<rect x="${x}" y="${y}" width="17" height="17" rx="3" fill="${hl ? '#c7d2fe' : '#fff'}"/>`;
        if (d) cells += `<text x="${x + 8.5}" y="${y + 13}" text-anchor="middle" font-size="12" font-weight="700" fill="${hl ? '#4338ca' : '#1e293b'}" font-family="system-ui,Segoe UI,sans-serif">${d}</text>`;
      }
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
        <rect width="160" height="80" fill="url(#${id})"/>
        <circle cx="18" cy="16" r="26" fill="#fff" opacity=".08"/><circle cx="150" cy="74" r="34" fill="#fff" opacity=".08"/>
        <rect x="50" y="9" width="61" height="61" rx="7" fill="#312e81" opacity=".35" transform="translate(2 3)"/>
        <rect x="50" y="9" width="61" height="61" rx="7" fill="#e0e7ff"/>${cells}
        <text x="24" y="58" font-size="22" font-weight="800" fill="#fff" opacity=".55" font-family="system-ui,Segoe UI,sans-serif">7</text>
        <text x="128" y="34" font-size="18" font-weight="800" fill="#fff" opacity=".5" font-family="system-ui,Segoe UI,sans-serif">4</text>`;
    },
    art() {
      const id = 'suA' + (uid++);
      const g = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
      let cells = '';
      const cs = 15, x0 = 168, y0 = 18;
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const d = +g[r * 9 + c]; const x = x0 + c * cs + Math.floor(c / 3) * 2, y = y0 + r * cs + Math.floor(r / 3) * 2;
        const sel = r === 4 && c === 4, line = r === 4 || c === 4;
        cells += `<rect x="${x}" y="${y}" width="${cs - 1}" height="${cs - 1}" rx="2" fill="${sel ? '#a5b4fc' : line ? '#eef2ff' : '#fff'}"/>`;
        if (d) cells += `<text x="${x + 7}" y="${y + 11}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${sel ? '#312e81' : '#1e293b'}" font-family="system-ui,Segoe UI,sans-serif">${d}</text>`;
      }
      return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4338ca"/><stop offset=".55" stop-color="#6d28d9"/><stop offset="1" stop-color="#a21caf"/></linearGradient>
          <radialGradient id="${id}gl" cx=".7" cy=".45" r=".5"><stop offset="0" stop-color="#c4b5fd" stop-opacity=".55"/><stop offset="1" stop-color="#c4b5fd" stop-opacity="0"/></radialGradient>
          <filter id="${id}sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#1e1b4b" flood-opacity=".45"/></filter>
        </defs>
        <rect width="320" height="170" fill="url(#${id}bg)"/>
        <rect width="320" height="170" fill="url(#${id}gl)"/>
        <g opacity=".13" fill="#fff" font-family="system-ui,Segoe UI,sans-serif" font-weight="800">
          <text x="18" y="52" font-size="40">3</text><text x="70" y="140" font-size="54">8</text><text x="118" y="70" font-size="30">1</text><text x="20" y="160" font-size="26">6</text>
        </g>
        <g filter="url(#${id}sh)"><rect x="${x0 - 5}" y="${y0 - 5}" width="${9 * cs + 4 + 9}" height="${9 * cs + 4 + 9}" rx="10" fill="#c7d2fe"/></g>
        <rect x="${x0 - 2}" y="${y0 - 2}" width="${9 * cs + 4 + 3}" height="${9 * cs + 4 + 3}" rx="7" fill="#3f3d8f"/>
        ${cells}
        <g transform="translate(26 92)">
          ${[1, 2, 3, 4].map((d, k) => `<g transform="translate(${k * 30} 0)"><rect width="25" height="31" rx="8" fill="#fff" opacity="${k === 3 ? 1 : .92}"/><text x="12.5" y="21.5" text-anchor="middle" font-size="16" font-weight="800" fill="${k === 3 ? '#4f46e5' : '#334155'}" font-family="system-ui,Segoe UI,sans-serif">${d}</text></g>`).join('')}
        </g>
        <g transform="translate(26 32)" font-family="system-ui,Segoe UI,sans-serif"><rect width="96" height="26" rx="13" fill="#fff" opacity=".18"/><text x="48" y="17.5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">9 × 9</text></g>
      </svg>`;
    },

    mount(root, ctx) {
      const D = ctx.data;
      D.best = D.best || {}; D.wins = D.wins || {}; D.pool = D.pool || {}; D.daily = D.daily || { last: 0, streak: 0 };
      if (!DIFF[D.diff]) D.diff = 'easy';

      const ui = Kit.shell(root, {
        top: true, cls: 'su-wrap',
        stats: [
          { id: 'diff', icon: '◆', value: Kit.t(D.diff) },
          { id: 'err', icon: '✕', value: `0/${MAX_MISTAKES}` },
          { id: 'time', icon: '⏱', value: '0:00' }
        ]
      });
      ui.el.classList.add('su');

      // --- top row: difficulty + daily ---
      const seg = Kit.segmented(DIFF_IDS.map(id => ({ id, label: Kit.t(id) })), D.diff, id => {
        const go = () => { D.diff = id; ctx.save(); newGame(id); };
        if (inProgress()) Kit.confirm(Kit.t('confirmNew'), go), seg.set(G && !G.daily ? G.diff : D.diff); else go();
      });
      seg.el.classList.add('su-seg');
      const dailyBtn = document.createElement('button');
      dailyBtn.className = 'su-daily'; dailyBtn.title = s('daily');
      dailyBtn.innerHTML = `${calIcon(new Date().getDate())}<span>${s('dailyShort')}</span>`;
      dailyBtn.addEventListener('click', () => {
        UI.sound('click');
        if (G && G.daily === dayKey() && !G.done) return;
        if (D.daily.last === dayKey()) { ctx.toast(s('dailyDone')); return; }
        if (inProgress()) Kit.confirm(Kit.t('confirmNew'), () => newGame(null, true)); else newGame(null, true);
      });
      ui.top.append(seg.el, dailyBtn);

      // pause button in the stats row
      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'su-pausebtn'; pauseBtn.title = s('pause'); pauseBtn.innerHTML = ICON.pause;
      pauseBtn.addEventListener('click', () => { UI.sound('click'); setPaused(!paused); });
      ui.head.appendChild(pauseBtn);

      // --- board ---
      const gridEl = document.createElement('div'); gridEl.className = 'su-grid';
      const cells = new Array(81);
      for (let b = 0; b < 9; b++) {
        const box = document.createElement('div'); box.className = 'su-box';
        for (const i of UNITS[18 + b]) {
          const cell = document.createElement('div'); cell.className = 'su-cell'; cell.dataset.i = i;
          cell.innerHTML = `<span class="su-v"></span><span class="su-notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<i>${d}</i>`).join('')}</span>`;
          cells[i] = cell; box.appendChild(cell);
        }
        gridEl.appendChild(box);
      }
      const stage = document.createElement('div'); stage.className = 'su-stage';
      const overlay = document.createElement('div'); overlay.className = 'su-overlay';
      stage.append(gridEl, overlay);
      const pad = document.createElement('div'); pad.className = 'su-pad';
      const padBtns = [];
      for (let d = 1; d <= 9; d++) {
        const b = document.createElement('button'); b.className = 'su-key'; b.dataset.d = d;
        b.innerHTML = `<b>${d}</b><small></small>`;
        b.addEventListener('click', () => input(d));
        padBtns.push(b); pad.appendChild(b);
      }
      ui.board.append(stage, pad);

      // --- tools ---
      const tUndo = ui.tool(`<span class="ico">${ICON.undo}</span>${Kit.t('undo')}`, () => undo());
      ui.tool(`<span class="ico">${ICON.erase}</span>${s('erase')}`, () => erase());
      const tNotes = ui.tool(`<span class="ico">${ICON.notes}</span>${s('notes')}<em class="su-sw">OFF</em>`, () => toggleNotes());
      const tHint = ui.tool(`<span class="ico">${ICON.hint}</span>${Kit.t('hint')}<em class="su-cnt"></em>`, () => hint());
      ui.tool(`<span class="ico">${ICON.fresh}</span>${Kit.t('newGame')}`, () => {
        if (inProgress()) Kit.confirm(Kit.t('confirmNew'), () => newGame(D.diff)); else newGame(D.diff);
      });
      ui.tool(`<span class="ico">${ICON.rules}</span>${Kit.t('rules')}`, () => Kit.rules(Kit.t('rules') + ' · ' + L(NAME), s('rulesHtml')));

      // --- state ---
      let G = null, sel = -1, focusDigit = 0, notesMode = false, paused = false, busy = false, job = null, poolJob = null, destroyed = false;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!destroyed) fn(); }, ms); timers.add(t); return t; };
      const timer = Kit.timer(txt => ui.stat('time', txt));

      function inProgress() { return G && !G.done && !G.over && G.undo.length > 0; }

      // Chunked runner for the generator iterator: ~12 ms of work per slice.
      function runJob(it, done, slice = 12, gap = 0) {
        const j = { cancelled: false };
        const step = () => {
          if (j.cancelled || destroyed) return;
          const t0 = performance.now(); let r;
          do { r = it.next(); } while (!r.done && performance.now() - t0 < slice);
          if (r.done) { j.done = true; done(r.value); } else later(step, gap);
        };
        later(step, 0);
        return j;
      }
      function cancelPool() { if (poolJob) { poolJob.cancelled = true; poolJob = null; } }
      function refillPool() {
        cancelPool();
        const missing = DIFF_IDS.find(d => !D.pool[d]);
        if (!missing || destroyed) return;
        const rnd = Kit.rng((Math.random() * 2 ** 31) | 0);
        poolJob = runJob(generator(missing, rnd), res => {
          poolJob = null; if (!res) return;
          D.pool[missing] = { p: enc(res.puzzle), s: enc(res.solution) }; ctx.save();
          later(refillPool, 300);
        }, 6, 25);
      }

      function newGame(diff, daily) {
        if (job) { job.cancelled = true; job = null; }
        cancelPool(); timer.stop(); setPaused(false, true);
        sel = -1; focusDigit = 0;
        if (daily) {
          const wd = new Date().getDay(); diff = DAILY_DIFF[wd];
          busy = true; showLoading(true);
          const key = dayKey();
          job = runJob(generator(diff, Kit.rng(Kit.daySeed(4049))), res => { job = null; busy = false; showLoading(false); start(res.puzzle, res.solution, diff, key); });
          return;
        }
        const pooled = D.pool[diff];
        if (pooled) { delete D.pool[diff]; ctx.save(); start(dec(pooled.p), dec(pooled.s), diff, null); return; }
        busy = true; showLoading(true);
        job = runJob(generator(diff, Kit.rng((Math.random() * 2 ** 31) | 0)), res => { job = null; busy = false; showLoading(false); start(res.puzzle, res.solution, diff, null); });
      }

      function start(puzzle, solution, diff, daily) {
        G = { puzzle: puzzle.slice(), solution: solution.slice(), v: puzzle.slice(), notes: new Array(81).fill(0), mistakes: 0, diff, daily, undo: [], done: false, over: false };
        timer.reset(0); ui.msg('');
        if (!daily) D.diff = diff;
        seg.set(daily ? '' : diff);
        afterLoad(true);
        ui.board.classList.remove('su-enter'); void ui.board.offsetWidth; ui.board.classList.add('su-enter');
        save();
        later(refillPool, 1200);
      }

      function afterLoad(fresh) {
        ui.stat('diff', Kit.t(G.diff));
        const di = ui.head.querySelector('[data-stat="diff"] i'); if (di) di.textContent = G.daily ? '📅' : '◆';
        ui.stat('err', `${G.mistakes}/${MAX_MISTAKES}`);
        dailyBtn.classList.toggle('on', !!G.daily);
        dailyBtn.classList.toggle('done', D.daily.last === dayKey());
        render();
        if (!G.done && !G.over) timer.start();
        if (G.over && !fresh) later(gameOver, 250);
      }

      function save() {
        if (!G) return;
        if (G.done) { D.cur = null; ctx.save(); return; }
        D.cur = { p: enc(G.puzzle), s: enc(G.solution), v: enc(G.v), n: G.notes.slice(), m: G.mistakes, d: G.diff, day: G.daily, ms: timer.ms, u: G.undo.slice(-80), over: G.over };
        ctx.save();
      }

      function resume() {
        const c = D.cur;
        if (!c || !c.p || c.p.length !== 81) return false;
        if (c.day && c.day !== dayKey()) return false; // yesterday's daily expired
        G = { puzzle: dec(c.p), solution: dec(c.s), v: dec(c.v), notes: (c.n || []).slice(0, 81), mistakes: c.m || 0, diff: c.d, daily: c.day || null, undo: c.u || [], done: false, over: !!c.over };
        while (G.notes.length < 81) G.notes.push(0);
        seg.set(G.daily ? '' : G.diff);
        timer.reset(c.ms || 0);
        afterLoad(false);
        return true;
      }

      // --- rendering ---
      const correct = i => G.v[i] && G.v[i] === G.solution[i];
      function counts() { const n = new Array(10).fill(0); for (let i = 0; i < 81; i++) if (correct(i)) n[G.v[i]]++; return n; }
      function render() {
        if (!G) return;
        const sv = sel >= 0 ? (G.v[sel] || 0) : 0;
        const hd = sv && correct(sel) ? sv : (focusDigit || 0);
        for (let i = 0; i < 81; i++) {
          const el = cells[i], v = G.v[i];
          const given = !!G.puzzle[i], wrong = v && v !== G.solution[i];
          el.classList.toggle('given', given);
          el.classList.toggle('user', !!v && !given && !wrong);
          el.classList.toggle('wrong', !!wrong);
          el.classList.toggle('sel', i === sel);
          el.classList.toggle('hl', sel >= 0 && i !== sel && (R[i] === R[sel] || C[i] === C[sel] || B[i] === B[sel]));
          el.classList.toggle('same', !!hd && v === hd && !wrong && i !== sel);
          el.firstChild.textContent = v ? v : '';
          const nm = v ? 0 : G.notes[i];
          el.classList.toggle('has-notes', !!nm);
          const ns = el.lastChild.children;
          for (let d = 1; d <= 9; d++) { const on = !!(nm & bit(d)); ns[d - 1].className = on ? (hd === d ? 'on hd' : 'on') : ''; }
        }
        const n = counts();
        for (let d = 1; d <= 9; d++) {
          const b = padBtns[d - 1], left = 9 - n[d];
          b.classList.toggle('done', left === 0);
          b.lastChild.textContent = left;
          b.classList.toggle('focus', hd === d);
        }
        pad.classList.toggle('notes', notesMode);
        tNotes.classList.toggle('on', notesMode);
        tNotes.querySelector('.su-sw').textContent = notesMode ? 'ON' : 'OFF';
        tUndo.disabled = !G.undo.length || G.done;
        const h = (window.State && State.data.hints) || 0;
        tHint.querySelector('.su-cnt').textContent = h > 0 ? h : '▶';
        tHint.classList.toggle('su-adhint', !(h > 0));
      }
      function anim(el, cls, delay = 0) {
        el.style.setProperty('--d', delay + 'ms');
        el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
        later(() => el.classList.remove(cls), 900 + delay);
      }

      function showLoading(on) {
        stage.classList.toggle('loading', on);
        overlay.innerHTML = on ? `<div class="su-ov-card"><span class="su-spin"></span><b>${s('generating')}</b></div>` : '';
        if (!on && paused) setPaused(true, true);
      }
      function setPaused(on, silent) {
        if (!G || G.done || G.over) on = false;
        paused = on;
        stage.classList.toggle('paused', on);
        pauseBtn.innerHTML = on ? ICON.play : ICON.pause;
        pauseBtn.classList.toggle('on', on);
        if (on) {
          timer.stop();
          overlay.innerHTML = `<button class="su-ov-card su-resume">${ICON.play}<b>${s('paused')}</b><small>${s('resume')}</small></button>`;
          overlay.querySelector('.su-resume').addEventListener('click', () => { UI.sound('click'); setPaused(false); });
          save();
        } else {
          if (!stage.classList.contains('loading')) overlay.innerHTML = '';
          if (!silent && G && !G.done && !G.over) timer.start();
        }
      }

      // --- actions ---
      function selectCell(i) {
        if (!G || busy || paused) return;
        sel = i; focusDigit = 0;
        UI.sound('tap'); render();
      }
      function pushUndo(changes) { G.undo.push(changes); if (G.undo.length > 200) G.undo.shift(); }

      function input(d) {
        if (!G || G.done || G.over || paused || busy) return;
        if (sel < 0) { focusDigit = focusDigit === d ? 0 : d; UI.sound('tap'); render(); return; }
        const i = sel;
        if (G.puzzle[i] || correct(i)) { focusDigit = d; sel = -1; render(); return; }
        if (notesMode) {
          if (G.v[i]) { ui.msg(s('wrong'), 'bad'); return; }
          pushUndo([[i, G.v[i], G.notes[i]]]);
          G.notes[i] ^= bit(d);
          UI.sound('tap'); render(); anim(cells[i].lastChild.children[d - 1], 'su-npop'); save(); return;
        }
        if (G.v[i] === d) return;
        place(i, d, false);
      }

      function place(i, d, fromHint) {
        const changes = [[i, G.v[i], G.notes[i]]];
        G.v[i] = d; G.notes[i] = 0;
        if (d === G.solution[i]) {
          const b = bit(d);
          for (const p of PEERS[i]) if (G.notes[p] & b) { changes.push([p, G.v[p], G.notes[p]]); G.notes[p] &= ~b; }
          pushUndo(changes);
          if (!fromHint) ui.msg('');
          UI.sound('place');
          render(); anim(cells[i], 'su-pop');
          celebrateUnits(i, d);
          if (G.v.every((x, k) => x === G.solution[k])) { win(); return; }
        } else {
          pushUndo(changes);
          G.mistakes++;
          ui.stat('err', `${G.mistakes}/${MAX_MISTAKES}`);
          UI.sound('bad'); ui.msg(s('wrong'), 'bad');
          render(); anim(cells[i], 'su-shake');
          if (G.mistakes >= MAX_MISTAKES) { G.over = true; timer.stop(); save(); later(gameOver, 450); return; }
        }
        save();
      }

      function celebrateUnits(i, d) {
        const done = [R[i], 9 + C[i], 18 + B[i]].filter(u => UNITS[u].every(correct));
        if (done.length) UI.sound(done.length > 1 ? 'cascade' : 'match');
        const seen = new Set();
        for (const u of done) for (const j of UNITS[u]) {
          if (seen.has(j)) continue; seen.add(j);
          const dist = Math.abs(R[j] - R[i]) + Math.abs(C[j] - C[i]);
          anim(cells[j], 'su-flash', dist * 45);
        }
        if (counts()[d] === 9) { anim(padBtns[d - 1], 'su-keydone'); }
      }

      function erase() {
        if (!G || G.done || G.over || paused || busy || sel < 0) return;
        const i = sel;
        if (G.puzzle[i] || correct(i)) { ui.msg(s('locked')); return; }
        if (!G.v[i] && !G.notes[i]) return;
        pushUndo([[i, G.v[i], G.notes[i]]]);
        G.v[i] = 0; G.notes[i] = 0;
        UI.sound('pop'); ui.msg(''); render(); save();
      }

      function undo() {
        if (!G || G.done || G.over || paused || busy || !G.undo.length) return;
        const ch = G.undo.pop();
        for (let k = ch.length - 1; k >= 0; k--) { const [i, v, n] = ch[k]; G.v[i] = v; G.notes[i] = n; }
        sel = ch[0][0];
        UI.sound('whoosh'); ui.msg(''); render(); anim(cells[sel], 'su-pop'); save();
      }

      function toggleNotes() { if (!G) return; notesMode = !notesMode; render(); }

      async function hint() {
        if (!G || G.done || G.over || paused || busy) return;
        const vals = G.v.map((x, i) => (x && x === G.solution[i]) ? x : 0);
        const target = sel >= 0 && !vals[sel] ? sel : -1;
        let h = null, fixWrong = false;
        if (target >= 0 && G.v[target]) { h = { i: target, d: G.solution[target], kind: 'fixed' }; fixWrong = true; }
        else h = LOGIC.hintStep(vals, target);
        if (!h || h.d !== G.solution[h.i]) {
          let i = target >= 0 ? target : -1;
          if (i < 0) { const empt = []; for (let k = 0; k < 81; k++) if (!vals[k]) empt.push(k); i = empt[Math.floor(Math.random() * empt.length)]; }
          h = { i, d: G.solution[i], kind: 'reveal' };
        }
        busy = true;
        const ok = await Kit.useHelp(ctx);
        busy = false;
        if (destroyed || !ok || !G || G.done) { render(); return; }
        sel = h.i; focusDigit = 0;
        let text = s('h_' + (h.kind === 'fixed' ? 'fixed' : h.kind), { d: h.d });
        if (h.tech && !fixWrong) text = s('h_with', { t: s('t_' + h.tech) }) + text;
        place(h.i, h.d, true);
        if (G.done) return;
        ui.msg('💡 ' + text, 'accent');
        if (h.unit >= 0) UNITS[h.unit].forEach((j, k) => anim(cells[j], 'su-hint', k * 30));
        else anim(cells[h.i], 'su-hint');
      }

      function gameOver() {
        if (destroyed || !G || !G.over) return;
        UI.sound('gameover');
        UI.modal({
          dismissible: false,
          html: `<div class="gk-result gk-r-lose"><div class="gk-r-icon">💭</div><h3>${UI.escapeHtml(s('overTitle'))}</h3><p>${UI.escapeHtml(s('overText'))}</p></div>`,
          actions: [
            { label: '▶ ' + s('continueAd'), cls: 'btn-ad', async onClick() {
              const ok = await ctx.ad();
              if (destroyed) return;
              if (ok && G) { G.over = false; G.mistakes = MAX_MISTAKES - 1; ui.stat('err', `${G.mistakes}/${MAX_MISTAKES}`); ui.msg(s('secondChance'), 'good'); timer.start(); save(); render(); }
              else gameOver();
            } },
            { label: s('newPuzzle'), cls: 'btn-primary', onClick: () => { G.over = false; newGame(D.diff); } },
            { label: Kit.t('home'), cls: 'btn-ghost', onClick: () => Hub.show('home') }
          ]
        });
      }

      function win() {
        G.done = true; timer.stop(); sel = -1; focusDigit = 0; render();
        const secs = timer.seconds, diff = G.diff, key = G.daily;
        const prev = D.best[diff];
        const record = !prev || secs < prev;
        if (record) D.best[diff] = secs;
        D.wins[diff] = (D.wins[diff] || 0) + 1;
        let stars = STARS[diff]; const lines = [];
        if (key) {
          stars += 10;
          D.daily.streak = D.daily.last === prevDayKey() ? (D.daily.streak || 0) + 1 : 1;
          D.daily.last = key;
          lines.push(s('dailyBonus') + ' · ' + s('streak', { n: D.daily.streak }));
        }
        lines.unshift(`${s('yourTime')}: ${timer.fmt(secs)} · ${s('bestTime')}: ${timer.fmt(D.best[diff])}${record && prev ? ' · ' + s('newRecord') : ''}`, `${Kit.t(diff)} · ${s('mistakes')}: ${G.mistakes}/${MAX_MISTAKES}`);
        D.cur = null; ctx.save();
        ctx.badge('sudoku_win');
        if (diff === 'expert') ctx.badge('sudoku_expert');
        dailyBtn.classList.toggle('done', D.daily.last === dayKey());
        // win wave across the board
        for (let i = 0; i < 81; i++) anim(cells[i], 'su-wave', (R[i] + C[i]) * 38);
        UI.sound('cascade');
        later(() => Kit.result(ctx, {
          result: 'win', title: s('solved'), lines, stars,
          againLabel: s('newPuzzle'), onAgain: () => newGame(D.diff)
        }), 1100);
      }

      // --- input wiring ---
      gridEl.addEventListener('pointerdown', e => {
        const cell = e.target.closest('.su-cell'); if (!cell) return;
        e.preventDefault(); selectCell(+cell.dataset.i);
      });
      function onKey(e) {
        if (destroyed || !root.isConnected || !G) return;
        if (document.querySelector('#modal-root .modal-backdrop')) return;
        const tag = (e.target && e.target.tagName) || ''; if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const k = e.key;
        if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); undo(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (/^[1-9]$/.test(k)) { e.preventDefault(); input(+k); return; }
        if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); erase(); return; }
        if (k === 'n' || k === 'N') { e.preventDefault(); toggleNotes(); return; }
        if (k === 'p' || k === 'P') { e.preventDefault(); setPaused(!paused); return; }
        const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
        if (mv) {
          e.preventDefault(); if (paused || busy) return;
          if (sel < 0) { selectCell(40); return; }
          const r = (R[sel] + mv[0] + 9) % 9, c = (C[sel] + mv[1] + 9) % 9; selectCell(r * 9 + c);
        }
      }
      document.addEventListener('keydown', onKey);
      function onVis() { if (document.hidden && G && !G.done && !G.over && !paused) setPaused(true); }
      document.addEventListener('visibilitychange', onVis);

      // --- boot ---
      if (!resume()) newGame(D.diff);

      root.__game = {
        logic: LOGIC,
        state: () => G && { puzzle: G.puzzle.slice(), solution: G.solution.slice(), values: G.v.slice(), notes: G.notes.slice(), mistakes: G.mistakes, diff: G.diff, daily: G.daily, done: G.done, over: G.over, sel, notesMode, paused, busy, seconds: timer.seconds },
        select: i => selectCell(i),
        input: d => input(d),
        erase, undo, hint, toggleNotes, pause: on => setPaused(on !== false),
        newGame: (diff, daily) => newGame(diff || D.diff, !!daily),
        // fill every cell but `leave` with the solution (for testing the win flow)
        solve(leave = 0) {
          if (!G || G.done) return;
          const empt = []; for (let i = 0; i < 81; i++) if (!correct(i)) empt.push(i);
          const keep = empt.slice(0, leave);
          for (const i of empt) if (!keep.includes(i)) { G.v[i] = G.solution[i]; G.notes[i] = 0; }
          render(); save();
          if (!keep.length) win();
        },
        ready: () => !!G && !busy
      };

      return {
        destroy() {
          if (G && !G.done) save();
          destroyed = true;
          if (job) job.cancelled = true; cancelPool();
          timer.stop();
          timers.forEach(clearTimeout); timers.clear();
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVis);
        }
      };
    }
  });
})();
