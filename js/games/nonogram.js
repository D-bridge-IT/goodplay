// Nonogram (Japanese crossword / Picross) — 31 hand-made pictures in 4 packs, every one
// verified to be uniquely solvable by pure line logic. Prefix: .ng-
(function () {
  'use strict';

  /* =====================================================================
     Puzzles: '#' = filled, '.' = empty. Packs group them by size/theme.
     ===================================================================== */
  const PUZZLES = [
    { id: 'heart5', name: { de: 'Herz', en: 'Heart', ru: 'Сердце', uk: 'Серце' }, color: '#e11d48', g: ['.#.#.', '#####', '#####', '.###.', '..#..'] },
    { id: 'house5', name: { de: 'Haus', en: 'House', ru: 'Домик', uk: 'Хатинка' }, color: '#f97316', g: ['..#..', '.###.', '#####', '.#.##', '.#.##'] },
    { id: 'tree5', name: { de: 'Baum', en: 'Tree', ru: 'Дерево', uk: 'Дерево' }, color: '#16a34a', g: ['.###.', '#####', '.###.', '..#..', '.###.'] },
    { id: 'fish5', name: { de: 'Fisch', en: 'Fish', ru: 'Рыбка', uk: 'Рибка' }, color: '#0ea5e9', g: ['.....', '.##.#', '#####', '.##.#', '.....'] },
    { id: 'sun5', name: { de: 'Sonne', en: 'Sun', ru: 'Солнце', uk: 'Сонце' }, color: '#f59e0b', g: ['#.#.#', '.###.', '#####', '.###.', '#.#.#'] },
    { id: 'paw5', name: { de: 'Pfote', en: 'Paw', ru: 'Лапка', uk: 'Лапка' }, color: '#b45309', g: ['#.#.#', '.....', '.###.', '#####', '.###.'] },
    { id: 'cup5', name: { de: 'Tasse', en: 'Cup', ru: 'Чашка', uk: 'Чашка' }, color: '#92400e', g: ['.#.#.', '.....', '#####', '###.#', '###..'] },
    { id: 'star5', name: { de: 'Stern', en: 'Star', ru: 'Звезда', uk: 'Зірка' }, color: '#eab308', g: ['..#..', '#####', '.###.', '.#.#.', '#...#'] },
    { id: 'cat10', name: { de: 'Katze', en: 'Cat', ru: 'Кошка', uk: 'Кішка' }, color: '#f97316', g: ['.#......#.', '.##....##.', '.########.', '##########', '##.####.##', '##########', '####..####', '.###..###.', '..######..', '...####...'] },
    { id: 'dog10', name: { de: 'Hund', en: 'Dog', ru: 'Собака', uk: 'Собака' }, color: '#a16207', g: ['.##.......', '####......', '#####....#', '..###...#.', '..#######.', '..#######.', '..#######.', '..#.#..#.#', '..#.#..#.#', '.##.##.##.'] },
    { id: 'paw10', name: { de: 'Pfote', en: 'Paw', ru: 'Лапка', uk: 'Лапка' }, color: '#db2777', g: ['..##..##..', '..##..##..', '##......##', '##.####.##', '..######..', '.########.', '.########.', '.########.', '..######..', '...####...'] },
    { id: 'bird10', name: { de: 'Vogel', en: 'Bird', ru: 'Птичка', uk: 'Пташка' }, color: '#0284c7', g: ['...###....', '..##.##...', '######....', '..#######.', '..########', '..#######.', '...#####..', '....#.#...', '....#.#...', '...##.##..'] },
    { id: 'fish10', name: { de: 'Fisch', en: 'Fish', ru: 'Рыба', uk: 'Риба' }, color: '#06b6d4', g: ['..........', '....###...', '..######.#', '.##.######', '#########.', '#########.', '.########.', '..######.#', '....###...', '..........'] },
    { id: 'tree10', name: { de: 'Baum', en: 'Tree', ru: 'Дерево', uk: 'Дерево' }, color: '#15803d', g: ['...####...', '..######..', '.########.', '##########', '##########', '.########.', '..######..', '....##....', '....##....', '..######..'] },
    { id: 'heart10', name: { de: 'Herz', en: 'Heart', ru: 'Сердце', uk: 'Серце' }, color: '#e11d48', g: ['.##....##.', '####..####', '##########', '##########', '##########', '.########.', '..######..', '...####...', '....##....', '..........'] },
    { id: 'leaf10', name: { de: 'Blatt', en: 'Leaf', ru: 'Лист', uk: 'Листок' }, color: '#65a30d', g: ['......####', '....######', '...####.##', '..####.###', '.####.####', '.###.####.', '.##.####..', '..#####...', '.#........', '##........'] },
    { id: 'sun10', name: { de: 'Sonne', en: 'Sun', ru: 'Солнце', uk: 'Сонце' }, color: '#f59e0b', g: ['....##....', '.#..##..#.', '...####...', '..######..', '##.####.##', '##.####.##', '..######..', '...####...', '.#......#.', '....##....'] },
    { id: 'coffee10', name: { de: 'Kaffee', en: 'Coffee', ru: 'Кофе', uk: 'Кава' }, color: '#92400e', g: ['..#..#....', '...#..#...', '..#..#....', '########..', '##########', '########.#', '##########', '.######...', '..####....', '##########'] },
    { id: 'mush10', name: { de: 'Pilz', en: 'Mushroom', ru: 'Гриб', uk: 'Гриб' }, color: '#dc2626', g: ['...####...', '.########.', '##.####.##', '##########', '##########', '...####...', '...####...', '...####...', '..######..', '..........'] },
    { id: 'bfly10', name: { de: 'Schmetterling', en: 'Butterfly', ru: 'Бабочка', uk: 'Метелик' }, color: '#8b5cf6', g: ['##......##', '###.##.###', '####..####', '####..####', '.###..###.', '.###..###.', '####..####', '###.##.###', '##......##', '..........'] },
    { id: 'hedge10', name: { de: 'Igel', en: 'Hedgehog', ru: 'Ёжик', uk: 'Їжачок' }, color: '#78350f', g: ['..........', '....#.#.#.', '...#######', '..########', '.#.#######', '##########', '.#########', '..#######.', '...##..#..', '..........'] },
    { id: 'apple10', name: { de: 'Apfel', en: 'Apple', ru: 'Яблоко', uk: 'Яблуко' }, color: '#dc2626', g: ['....#.....', '....#.##..', '.###.###..', '#########.', '##########', '##########', '##########', '.########.', '.########.', '..##..##..'] },
    { id: 'bike15', name: { de: 'Fahrrad', en: 'Bicycle', ru: 'Велосипед', uk: 'Велосипед' }, color: '#0ea5e9', g: ['...............', '..###.....###..', '...#.......#...', '...#.......#...', '...#########...', '...#......##...', '...#....##.#...', '...#....#..#...', '...#####...#...', '.####..#..####.', '######.#.######', '##..##.#.##..##', '##..#######..##', '######...######', '.####.....####.'] },
    { id: 'owl15', name: { de: 'Eule', en: 'Owl', ru: 'Сова', uk: 'Сова' }, color: '#7c3aed', g: ['.##.........##.', '.###.......###.', '.#############.', '###############', '##...#####...##', '#.....###.....#', '#..#..###..#..#', '#.....###.....#', '##...##.##...##', '#######.#######', '####.#####.####', '###.#.###.#.###', '####.#####.####', '.#############.', '...##.....##...'] },
    { id: 'whale15', name: { de: 'Wal', en: 'Whale', ru: 'Кит', uk: 'Кит' }, color: '#2563eb', g: ['..........#.#..', '...........#...', '...........#...', '.....#####.#...', '...#########...', '..###########..', '.###.#########.', '.#############.', '###############', '###############', '.#######......#', '..######.....##', '...#########.##', '.....######.###', '..............#'] },
    { id: 'bunny15', name: { de: 'Hase', en: 'Hare', ru: 'Заяц', uk: 'Заєць' }, color: '#a8a29e', g: ['...##.....##...', '..####...####..', '..####...####..', '..####...####..', '...###...###...', '...###...###...', '..###########..', '.#############.', '.###.#####.###.', '.###.#####.###.', '.######.######.', '..####...####..', '..###########..', '...#########...', '.....#####.....'] },
    { id: 'hands15', name: { de: 'Helfende Hände', en: 'Helping hands', ru: 'Руки помощи', uk: 'Руки допомоги' }, color: '#e11d48', g: ['...............', '...###...###...', '..#####.#####..', '..###########..', '..###########..', '...#########...', '....#######....', '.#...#####...#.', '.##...###...##.', '.###...#...###.', '.####.....####.', '..####...####..', '...####.####...', '....#######....', '.....#####.....'] },
    { id: 'home15', name: { de: 'Haus mit Herz', en: 'House with a heart', ru: 'Дом с сердцем', uk: 'Дім із серцем' }, color: '#ea580c', g: ['.......#.......', '......###..##..', '.....#####.##..', '....#########..', '...##########..', '..###########..', '.#############.', '..###########..', '..####.#.####..', '..###.....###..', '..####...####..', '..#####.#####..', '..###########..', '..###########..', '###############'] },
    { id: 'cat15', name: { de: 'Katze', en: 'Cat', ru: 'Кошка', uk: 'Кішка' }, color: '#ea580c', g: ['..#.....#......', '..##...##......', '..#######......', '.#########.....', '.##.###.##.....', '.#########.....', '..##...##......', '...#####.......', '..#######....#.', '.#########...##', '.##########...#', '.###########..#', '.###########.##', '.############..', '..##.....##....'] },
    { id: 'sunflower15', name: { de: 'Blume', en: 'Flower', ru: 'Цветок', uk: 'Квітка' }, color: '#eab308', g: ['.....#####.....', '...##.###.##...', '..####...####..', '.###..###..###.', '.##.#######.##.', '##.#########.##', '##.#########.##', '##.#########.##', '.##.#######.##.', '.###..###..###.', '..####...####..', '...##.###.##...', '.....#####.....', '.......#.......', '......###......'] },
    { id: 'penguin15', name: { de: 'Pinguin', en: 'Penguin', ru: 'Пингвин', uk: 'Пінгвін' }, color: '#334155', g: ['.....#####.....', '....#######....', '...##.###.##...', '...#########...', '...###...###...', '..###.....###..', '.###.......###.', '####.......####', '###.........###', '.##.........##.', '..#.........#..', '..##.......##..', '...##.....##...', '....#######....', '..####...####..'] }
  ];
  const PACKS = [
    { id: 'start', name: { de: 'Erste Schritte', en: 'First steps', ru: 'Первые шаги', uk: 'Перші кроки' }, icon: '🌱', ids: ['heart5', 'house5', 'tree5', 'fish5', 'sun5', 'paw5', 'cup5', 'star5'] },
    { id: 'animals', name: { de: 'Tierfreunde', en: 'Animal friends', ru: 'Друзья животных', uk: 'Друзі тварин' }, icon: '🐾', ids: ['cat10', 'dog10', 'paw10', 'bird10', 'fish10', 'hedge10', 'bfly10'] },
    { id: 'nature', name: { de: 'Natur & Herz', en: 'Nature & heart', ru: 'Природа и сердце', uk: 'Природа і серце' }, icon: '🍃', ids: ['tree10', 'heart10', 'leaf10', 'sun10', 'coffee10', 'mush10', 'apple10'] },
    { id: 'master', name: { de: 'Meisterwerke', en: 'Masterpieces', ru: 'Шедевры', uk: 'Шедеври' }, icon: '🏆', ids: ['bike15', 'owl15', 'whale15', 'bunny15', 'hands15', 'home15', 'cat15', 'sunflower15', 'penguin15'] }
  ];
  const STARS = { 5: 5, 10: 12, 15: 25 };

  /* =====================================================================
     Pure logic (no DOM)
     ===================================================================== */
  function cluesOf(line) { const r = []; let n = 0; for (const x of line) { if (x === 1) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r; }
  function prepare(p) {
    const N = p.g.length; const sol = [];
    for (const row of p.g) for (const ch of row) sol.push(ch === '#' ? 1 : 0);
    const rows = [], cols = [];
    for (let r = 0; r < N; r++) rows.push(cluesOf(sol.slice(r * N, r * N + N)));
    for (let c = 0; c < N; c++) { const l = []; for (let r = 0; r < N; r++) l.push(sol[r * N + c]); cols.push(cluesOf(l)); }
    return { N, sol, rows, cols };
  }
  // Exact line solver: cells -1 unknown, 0 empty, 1 filled. Returns the line with every forced cell set, or null on contradiction.
  function solveLine(clue, cells) {
    const n = cells.length, k = clue.length;
    const noZero = (a, b) => { for (let t = a; t < b; t++) if (cells[t] === 0) return false; return true; };
    const f = []; for (let j = 0; j <= k; j++) f.push(new Uint8Array(n + 1));
    f[0][0] = 1; for (let i = 1; i <= n; i++) f[0][i] = f[0][i - 1] && cells[i - 1] !== 1 ? 1 : 0;
    for (let j = 1; j <= k; j++) {
      const L = clue[j - 1];
      for (let i = 1; i <= n; i++) {
        let ok = cells[i - 1] !== 1 && f[j][i - 1];
        if (!ok && i >= L && noZero(i - L, i)) ok = j === 1 ? f[0][i - L] : (i - L >= 1 && cells[i - L - 1] !== 1 && f[j - 1][i - L - 1]);
        f[j][i] = ok ? 1 : 0;
      }
    }
    const g = []; for (let j = 0; j <= k; j++) g.push(new Uint8Array(n + 2));
    g[k][n] = 1; for (let i = n - 1; i >= 0; i--) g[k][i] = g[k][i + 1] && cells[i] !== 1 ? 1 : 0;
    for (let j = k - 1; j >= 0; j--) {
      const L = clue[j];
      for (let i = n - 1; i >= 0; i--) {
        let ok = cells[i] !== 1 && g[j][i + 1];
        if (!ok && i + L <= n && noZero(i, i + L)) ok = j === k - 1 ? g[k][i + L] : (i + L < n && cells[i + L] !== 1 && g[j + 1][i + L + 1]);
        g[j][i] = ok ? 1 : 0;
      }
    }
    if (!f[k][n]) return null;
    const canE = new Uint8Array(n), canF = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (cells[i] !== 1) for (let j = 0; j <= k; j++) if (f[j][i] && g[j][i + 1]) { canE[i] = 1; break; }
    for (let j = 0; j < k; j++) {
      const L = clue[j];
      for (let s = 0; s + L <= n; s++) {
        if (!noZero(s, s + L)) continue;
        if (!(j === 0 ? f[0][s] : (s >= 1 && cells[s - 1] !== 1 && f[j][s - 1]))) continue;
        if (!(j === k - 1 ? g[k][s + L] : (s + L < n && cells[s + L] !== 1 && g[j + 1][s + L + 1]))) continue;
        for (let t = s; t < s + L; t++) canF[t] = 1;
      }
    }
    const out = cells.slice();
    for (let i = 0; i < n; i++) { if (!canE[i] && !canF[i]) return null; if (!canF[i]) out[i] = 0; else if (!canE[i]) out[i] = 1; }
    return out;
  }
  const lineIdx = (N, isRow, k) => { const a = []; for (let t = 0; t < N; t++) a.push(isRow ? k * N + t : t * N + k); return a; };
  // Full line-logic solve from scratch (or from a partial grid). ok=true means uniquely solvable by line logic.
  function solveGrid(rows, cols, start) {
    const N = rows.length; const g = start ? start.slice() : new Array(N * N).fill(-1);
    let changed = true, passes = 0;
    while (changed) {
      changed = false; passes++;
      for (let pass = 0; pass < 2; pass++) for (let k = 0; k < N; k++) {
        const idx = lineIdx(N, pass === 0, k); const line = idx.map(i => g[i]);
        const o = solveLine(pass === 0 ? rows[k] : cols[k], line);
        if (!o) return { ok: false, contradiction: true, grid: g, passes };
        idx.forEach((i, t) => { if (o[t] !== line[t]) { g[i] = o[t]; changed = true; } });
      }
    }
    return { ok: !g.includes(-1), grid: g, passes };
  }
  // Which clue numbers of a line are already satisfied (edge-anchored), and whether the line is complete.
  function lineStatus(vals, clue) {
    const runs = cluesOf(vals.map(v => v === 1 ? 1 : 0));
    if (runs.length === clue.length && runs.every((r, i) => r === clue[i])) return { done: true, dims: clue.map(() => true) };
    const dims = clue.map(() => false), n = vals.length;
    const scan = (dir) => {
      const hits = []; let i = dir > 0 ? 0 : n - 1, k = dir > 0 ? 0 : clue.length - 1;
      while (i >= 0 && i < n && k >= 0 && k < clue.length) {
        if (vals[i] === 2) { i += dir; continue; }
        if (vals[i] === 0) break;
        let j = i, len = 0; while (j >= 0 && j < n && vals[j] === 1) { j += dir; len++; }
        if (j >= 0 && j < n && vals[j] === 0) break;
        if (len !== clue[k]) break;
        hits.push(k); k += dir; i = j;
      }
      return hits;
    };
    const L = scan(1), R = scan(-1);
    L.forEach(k => { dims[k] = true; });
    if (L.length + R.length <= clue.length) R.forEach(k => { dims[k] = true; });
    return { done: false, dims };
  }
  // Hint: the line where line logic (from the player's correct marks) deduces the most new cells.
  function hintLine(P, state) {
    const N = P.N; const known = state.map(v => v === 1 ? 1 : v === 2 ? 0 : -1);
    let best = null;
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < N; k++) {
      const idx = lineIdx(N, pass === 0, k); const line = idx.map(i => known[i]);
      const o = solveLine(pass === 0 ? P.rows[k] : P.cols[k], line);
      if (!o) continue;
      const cells = []; idx.forEach((i, t) => { if (line[t] === -1 && o[t] !== -1) cells.push([i, o[t] ? 1 : 2]); });
      if (cells.length && (!best || cells.length > best.cells.length)) best = { isRow: pass === 0, k, cells };
    }
    return best;
  }

  const LOGIC = { PUZZLES, PACKS, prepare, solveLine, solveGrid, lineStatus, hintLine, cluesOf };

  /* =====================================================================
     Strings
     ===================================================================== */
  const s = Kit.strings({
    de: {
      overview: 'Übersicht', fill: 'Füllen', cross: 'Kreuz', reset: 'Leeren', showErr: 'Fehler anzeigen', solvedOf: '{a} von {b} gelöst',
      packDone: 'Paket fertig!', mistakes: 'Fehler', solved: 'Bild gelöst!', next: 'Nächstes Bild', already: 'Schon einmal gelöst – Sterne gibt es nur beim ersten Mal.',
      time: 'Zeit', best: 'Rekord', confirmReset: 'Alle Markierungen in diesem Bild löschen?', row: 'Zeile', col: 'Spalte',
      hintLine: '{l} {n}: logisch ergänzt.', hintFix: 'Ein falsches Feld wurde korrigiert.', allDone: 'Alle Bilder gelöst – großartig!',
      mystery: 'Rätselbild', size: '{n}×{n}', start: 'Tippe auf ein Bild, um zu starten.',
      rulesHtml: `<ul>
        <li>Die Zahlen am Rand verraten, wie viele <b>zusammenhängende</b> Felder in dieser Zeile bzw. Spalte gefüllt sind – in dieser Reihenfolge, mit mindestens einem leeren Feld dazwischen.</li>
        <li>Tippe zum Füllen, oder <b>ziehe</b> über eine Reihe. Im Modus <b>✕</b> markierst du sicher leere Felder (Rechtsklick geht auch).</li>
        <li>Erfüllte Zahlen werden blass, fertige Reihen bekommen automatisch Kreuze.</li>
        <li>Jedes Bild ist eindeutig und allein mit Logik lösbar – raten ist nie nötig.</li>
        <li><b>Tipp</b> ergänzt die Reihe, in der sich gerade am meisten folgern lässt.</li>
        <li>Sterne beim ersten Lösen: 5×5 → 5 · 10×10 → 12 · 15×15 → 25.</li></ul>`
    },
    ru: {
      overview: 'К списку', fill: 'Закрасить', cross: 'Крестик', reset: 'Очистить', showErr: 'Показывать ошибки', solvedOf: 'Решено {a} из {b}',
      packDone: 'Набор пройден!', mistakes: 'Ошибки', solved: 'Картинка готова!', next: 'Следующая', already: 'Уже решено раньше — звёзды даются только за первое решение.',
      time: 'Время', best: 'Рекорд', confirmReset: 'Стереть все отметки на этой картинке?', row: 'Строка', col: 'Столбец',
      hintLine: '{l} {n}: дополнено логикой.', hintFix: 'Исправлена неверная клетка.', allDone: 'Все картинки решены — великолепно!',
      mystery: 'Загадка', size: '{n}×{n}', start: 'Нажмите на картинку, чтобы начать.',
      rulesHtml: `<ul>
        <li>Числа у края показывают, сколько <b>подряд идущих</b> клеток закрашено в строке или столбце — по порядку, с хотя бы одной пустой клеткой между группами.</li>
        <li>Нажмите, чтобы закрасить, или <b>проведите</b> вдоль ряда. В режиме <b>✕</b> отмечайте точно пустые клетки (или правой кнопкой мыши).</li>
        <li>Выполненные числа бледнеют, в готовых рядах крестики ставятся сами.</li>
        <li>Каждая картинка решается однозначно и только логикой — угадывать не нужно.</li>
        <li><b>Подсказка</b> дополняет ряд, в котором сейчас можно вывести больше всего клеток.</li>
        <li>Звёзды за первое решение: 5×5 → 5 · 10×10 → 12 · 15×15 → 25.</li></ul>`
    },
    en: {
      overview: 'Overview', fill: 'Fill', cross: 'Cross', reset: 'Clear', showErr: 'Show mistakes', solvedOf: '{a} of {b} solved',
      packDone: 'Pack complete!', mistakes: 'Mistakes', solved: 'Picture solved!', next: 'Next picture', already: 'Solved before – stars are only given the first time.',
      time: 'Time', best: 'Best', confirmReset: 'Erase all marks in this picture?', row: 'Row', col: 'Column',
      hintLine: '{l} {n}: completed by logic.', hintFix: 'A wrong square was corrected.', allDone: 'All pictures solved – brilliant!',
      mystery: 'Mystery picture', size: '{n}×{n}', start: 'Tap a picture to start.',
      rulesHtml: `<ul>
        <li>The numbers at the edge tell you how many <b>consecutive</b> squares are filled in that row or column – in this order, with at least one empty square between the groups.</li>
        <li>Tap to fill, or <b>drag</b> along a row. In <b>✕</b> mode you mark squares that are certainly empty (right-click works too).</li>
        <li>Satisfied numbers fade, and finished rows get crosses automatically.</li>
        <li>Every picture has a unique solution that can be found by logic alone – guessing is never needed.</li>
        <li><b>Hint</b> completes the row where the most can be deduced right now.</li>
        <li>Stars for the first solve: 5×5 → 5 · 10×10 → 12 · 15×15 → 25.</li></ul>`
    },
    uk: {
      overview: 'До списку', fill: 'Заливка', cross: 'Хрестик', reset: 'Очистити', showErr: 'Показувати помилки', solvedOf: 'Розв’язано {a} з {b}',
      packDone: 'Набір пройдено!', mistakes: 'Помилки', solved: 'Малюнок готовий!', next: 'Наступний', already: 'Уже розв’язано раніше — зірки даються лише за перше розв’язання.',
      time: 'Час', best: 'Рекорд', confirmReset: 'Стерти всі позначки на цьому малюнку?', row: 'Рядок', col: 'Стовпчик',
      hintLine: '{l} {n}: доповнено логікою.', hintFix: 'Виправлено неправильну клітинку.', allDone: 'Усі малюнки розв’язано — чудово!',
      mystery: 'Загадка', size: '{n}×{n}', start: 'Натисніть на малюнок, щоб почати.',
      rulesHtml: `<ul>
        <li>Числа біля краю показують, скільки клітинок <b>поспіль</b> зафарбовано в рядку чи стовпчику — по порядку, з принаймні однією порожньою клітинкою між групами.</li>
        <li>Натисніть, щоб зафарбувати, або <b>проведіть</b> уздовж ряду. У режимі <b>✕</b> позначайте клітинки, які точно порожні (або правою кнопкою миші).</li>
        <li>Виконані числа бліднуть, у готових рядах хрестики ставляться самі.</li>
        <li>Кожен малюнок має єдиний розв’язок і розв’язується лише логікою — вгадувати не потрібно.</li>
        <li><b>Підказка</b> доповнює ряд, у якому зараз можна вивести найбільше клітинок.</li>
        <li>Зірки за перше розв’язання: 5×5 → 5 · 10×10 → 12 · 15×15 → 25.</li></ul>`
    }
  });

  const ICON = {
    undo: '<svg viewBox="0 0 24 24"><path d="M9 7H4V2M4.3 7A8 8 0 1 1 4 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hint: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fill: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3.5" fill="currentColor"/></svg>',
    cross: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
    reset: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    rules: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const esc = x => UI.escapeHtml(x);
  const byId = {}; PUZZLES.forEach(p => { byId[p.id] = p; });
  const packOf = id => PACKS.find(pk => pk.ids.includes(id));

  // Small pixel-art SVG of a puzzle (solution or the player's progress).
  function pixelSvg(p, cells, color, cls) {
    const N = p.g.length; let rects = '';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cells[r * N + c] === 1) rects += `<rect x="${c}" y="${r}" width="1.04" height="1.04"/>`;
    return `<svg viewBox="0 0 ${N} ${N}" class="${cls || ''}" shape-rendering="crispEdges"><g fill="${color}">${rects}</g></svg>`;
  }

  let uid = 0;

  Games.register({
    id: 'nonogram', icon: '🧩', partner: 'p2', isNew: true,
    name: { de: 'Nonogramm', en: 'Nonogram', ru: 'Японский кроссворд', uk: 'Японський кросворд' },
    tagline: { de: 'Zahlen am Rand verraten ein verstecktes Bild', en: 'Numbers at the edges reveal a hidden picture', ru: 'Числа по краям открывают скрытую картинку', uk: 'Числа по краях відкривають прихований малюнок' },
    badges: [
      { id: 'nonogram_10', icon: '🧩', name: { de: '10 Bilder gelöst', en: '10 pictures solved', ru: '10 картинок решено', uk: '10 малюнків розв’язано' } },
      { id: 'nonogram_all15', icon: '🏆', name: { de: 'Alle Meisterwerke (15×15)', en: 'All masterpieces (15×15)', ru: 'Все шедевры (15×15)', uk: 'Усі шедеври (15×15)' } }
    ],
    logic: LOGIC,
    thumb() {
      const id = 'ngT' + (uid++);
      const pic = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
      let cells = '';
      for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
        const on = pic[r][c] === '#'; const x = 62 + c * 9, y = 20 + r * 9;
        const reveal = c < 4;
        cells += `<rect x="${x}" y="${y}" width="8" height="8" rx="1.6" fill="${on ? (reveal ? '#f43f5e' : '#334155') : '#fff'}"/>`;
        if (!on && c >= 5 && r > 2) cells += `<path d="M${x + 2} ${y + 2}l4 4M${x + 6} ${y + 2}l-4 4" stroke="#94a3b8" stroke-width="1.1"/>`;
      }
      const colClues = ['2', '4', '5', '5', '5', '4', '2'].map((t, c) => `<text x="${66 + c * 9}" y="16" text-anchor="middle" font-size="6.5" font-weight="700" fill="#0f766e">${t}</text>`).join('');
      const rowClues = ['2 2', '7', '7', '5', '3', '1'].map((t, r) => `<text x="58" y="${26 + r * 9}" text-anchor="end" font-size="6.5" font-weight="700" fill="#0f766e">${t}</text>`).join('');
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#99f6e4"/><stop offset="1" stop-color="#5eead4"/></linearGradient></defs>
        <rect width="160" height="80" fill="url(#${id})"/>
        <circle cx="14" cy="70" r="26" fill="#fff" opacity=".25"/><circle cx="150" cy="8" r="22" fill="#fff" opacity=".25"/>
        <rect x="59" y="17" width="67" height="58" rx="5" fill="#0f766e" opacity=".18" transform="translate(1.5 2)"/>
        <rect x="60" y="18" width="65" height="56" rx="4" fill="#cbd5e1"/>
        ${cells}<g font-family="system-ui,Segoe UI,sans-serif">${colClues}${rowClues}</g>
        <g transform="translate(136 56)"><rect width="16" height="16" rx="4" fill="#fff"/><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="#0f766e" stroke-width="1.8" stroke-linecap="round"/></g>`;
    },

    mount(root, ctx) {
      const D = ctx.data;
      D.prog = D.prog || {}; D.solved = D.solved || {};
      if (D.showErr == null) D.showErr = false;

      let destroyed = false, view = null, cleanupView = null;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!destroyed) fn(); }, ms); timers.add(t); return t; };
      const solvedCount = () => PUZZLES.filter(p => D.solved[p.id]).length;

      /* ---------------- Overview (packs) ---------------- */
      function showMenu(focusPack) {
        if (cleanupView) cleanupView(); cleanupView = null; view = 'menu'; D.cur = null; ctx.save();
        const ui = Kit.shell(root, { top: true, cls: 'clear ng-menuboard', stats: [
          { id: 'solved', icon: '🧩', value: `${solvedCount()}/${PUZZLES.length}` },
          { id: 'stars', icon: '⭐', value: String(PUZZLES.filter(p => D.solved[p.id]).reduce((a, p) => a + STARS[p.g.length], 0)) }
        ] });
        ui.el.classList.add('ng', 'ng-menu');
        ui.top.innerHTML = `<div class="ng-hello"><b>${esc(s('solvedOf', { a: solvedCount(), b: PUZZLES.length }))}</b><small>${esc(s('start'))}</small></div>`;
        const list = document.createElement('div'); list.className = 'ng-packs';
        PACKS.forEach((pk, pi) => {
          const done = pk.ids.filter(id => D.solved[id]).length; const N = byId[pk.ids[0]].g.length;
          const card = document.createElement('section'); card.className = 'ng-pack'; card.style.setProperty('--i', pi);
          card.innerHTML = `
            <header><span class="ng-pk-ico">${pk.icon}</span><div><b>${esc(L(pk.name))}</b><small>${N}×${N} · ${done}/${pk.ids.length}${done === pk.ids.length ? ' · ✓' : ''}</small></div>
              <span class="ng-ring" style="--p:${Math.round(done / pk.ids.length * 100)}"><i>${Math.round(done / pk.ids.length * 100)}%</i></span></header>
            <div class="ng-tiles">${pk.ids.map((id, k) => {
              const p = byId[id]; const sv = D.solved[id]; const pr = D.prog[id];
              let inner;
              if (sv) inner = pixelSvg(p, p.g.join('').split('').map(ch => ch === '#' ? 1 : 0), p.color, 'ng-mini');
              else if (pr && pr.s && pr.s.includes('1')) inner = pixelSvg(p, Array.from(pr.s, ch => +ch), '#64748b', 'ng-mini ng-mini-wip');
              else inner = `<span class="ng-q">${k + 1}</span>`;
              return `<button class="ng-tile ${sv ? 'solved' : pr ? 'wip' : ''}" data-id="${id}" title="${esc(sv ? L(p.name) : s('mystery'))}">${inner}${sv ? `<em>${esc(L(p.name))}</em>` : ''}</button>`;
            }).join('')}</div>`;
          list.appendChild(card);
        });
        ui.board.appendChild(list);
        list.querySelectorAll('.ng-tile').forEach(b => b.addEventListener('click', () => { UI.sound('click'); openPuzzle(b.dataset.id); }));
        ui.tool(`<span class="ico">${ICON.rules}</span>${Kit.t('rules')}`, () => Kit.rules(Kit.t('rules') + ' · ' + L({ de: 'Nonogramm', en: 'Nonogram', ru: 'Японский кроссворд', uk: 'Японський кросворд' }), s('rulesHtml')));
        if (focusPack) { const el = list.children[PACKS.findIndex(pk => pk.id === focusPack)]; if (el) later(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60); }
        root.__game.view = 'menu';
      }

      /* ---------------- Puzzle view ---------------- */
      function openPuzzle(id) {
        if (cleanupView) cleanupView(); cleanupView = null;
        const p = byId[id]; if (!p) return showMenu();
        view = 'play'; D.cur = id; ctx.save();
        const P = prepare(p); const N = P.N;
        const pr = D.prog[id];
        let state = pr && pr.s && pr.s.length === N * N ? Array.from(pr.s, ch => +ch) : new Array(N * N).fill(0);
        let mistakes = (pr && pr.m) || 0, undoStack = (pr && pr.u) || [], mode = D.mode === 'cross' ? 'cross' : 'fill', won = false, busy = false;
        const pk = packOf(id); const num = pk.ids.indexOf(id) + 1;

        const ui = Kit.shell(root, { top: true, cls: 'ng-boardwrap', stats: [
          { id: 'name', icon: pk.icon, value: `${num}/${pk.ids.length}` },
          { id: 'size', icon: '▦', value: `${N}×${N}` },
          { id: 'time', icon: '⏱', value: '0:00' }
        ] });
        ui.el.classList.add('ng', 'ng-play');
        ui.top.innerHTML = `<button class="ng-back">${ICON.back}<span>${esc(s('overview'))}</span></button>
          <label class="ng-errsw"><span>${esc(s('showErr'))}</span><button class="ng-switch ${D.showErr ? 'on' : ''}" role="switch" aria-checked="${D.showErr}"></button></label>`;
        ui.top.querySelector('.ng-back').addEventListener('click', () => { UI.sound('click'); saveProg(); showMenu(pk.id); });
        const sw = ui.top.querySelector('.ng-switch');
        sw.addEventListener('click', () => { D.showErr = !D.showErr; sw.classList.toggle('on', D.showErr); sw.setAttribute('aria-checked', D.showErr); UI.sound('toggle'); ctx.save(); if (!D.showErr) ui.msg(''); render(); });

        // Board DOM
        const wrap = document.createElement('div'); wrap.className = 'ng-wrap';
        const corner = document.createElement('div'); corner.className = 'ng-corner';
        const colEl = document.createElement('div'); colEl.className = 'ng-cols';
        const rowEl = document.createElement('div'); rowEl.className = 'ng-rows';
        const gridEl = document.createElement('div'); gridEl.className = 'ng-grid'; gridEl.style.setProperty('--n', N);
        const lines5 = document.createElement('div'); lines5.className = 'ng-lines';
        const banner = document.createElement('div'); banner.className = 'ng-banner';
        const colClueEls = P.cols.map(cl => { const d = document.createElement('div'); d.className = 'ng-cc'; d.innerHTML = (cl.length ? cl : [0]).map(n => `<span>${n}</span>`).join(''); colEl.appendChild(d); return d; });
        const rowClueEls = P.rows.map(cl => { const d = document.createElement('div'); d.className = 'ng-rc'; d.innerHTML = (cl.length ? cl : [0]).map(n => `<span>${n}</span>`).join(''); rowEl.appendChild(d); return d; });
        const cellEls = [];
        for (let i = 0; i < N * N; i++) { const c = document.createElement('div'); c.className = 'ng-cell'; cellEls.push(c); gridEl.appendChild(c); }
        gridEl.appendChild(lines5);
        wrap.append(corner, colEl, rowEl, gridEl);
        ui.board.append(wrap, banner);

        // Tools
        const tFill = ui.tool(`<span class="ico">${ICON.fill}</span>${s('fill')}`, () => setMode('fill'), 'ng-mode');
        const tCross = ui.tool(`<span class="ico">${ICON.cross}</span>${s('cross')}`, () => setMode('cross'), 'ng-mode');
        const tUndo = ui.tool(`<span class="ico">${ICON.undo}</span>${Kit.t('undo')}`, () => undo());
        const tHint = ui.tool(`<span class="ico">${ICON.hint}</span>${Kit.t('hint')}<em class="ng-cnt"></em>`, () => hint());
        ui.tool(`<span class="ico">${ICON.reset}</span>${s('reset')}`, () => { if (!won && state.some(v => v)) Kit.confirm(s('confirmReset'), resetPuzzle); });
        ui.tool(`<span class="ico">${ICON.rules}</span>${Kit.t('rules')}`, () => Kit.rules(Kit.t('rules') + ' · ' + L({ de: 'Nonogramm', en: 'Nonogram', ru: 'Японский кроссворд', uk: 'Японський кросворд' }), s('rulesHtml')));

        const timer = Kit.timer(t => ui.stat('time', t));
        timer.reset((pr && pr.t) || 0);

        // ---- sizing: fit the clues + grid into the column width ----
        let cs = 20;
        const maxColClues = Math.max(1, ...P.cols.map(c => c.length));
        const rowUnits = Math.max(1.3, ...P.rows.map(cl => { const a = cl.length ? cl : [0]; return a.reduce((t, n) => t + String(n).length * 0.62, 0) + (a.length - 1) * 0.42 + 0.7; }));
        function layout() {
          const avail = Math.max(240, ui.board.clientWidth - 16);
          const availH = Math.max(260, (window.innerHeight || 780) - 340);
          const csW = Math.floor((avail - N - 1) / (N + 0.6 * rowUnits));
          const csH = Math.floor((availH - N - 1) / (N + 0.6 * 1.18 * maxColClues + 0.3));
          cs = Math.max(14, Math.min(52, csW, csH));
          const fs = Math.max(9, Math.min(17, Math.round(cs * 0.6)));
          const gw = N * (cs + 1) + 1;
          const lw = Math.ceil(rowUnits * fs) + 4;
          const th = Math.ceil(maxColClues * fs * 1.18) + 6;
          wrap.style.setProperty('--cs', cs + 'px'); wrap.style.setProperty('--fs', fs + 'px');
          wrap.style.gridTemplateColumns = `${lw}px ${gw}px`; wrap.style.gridTemplateRows = `${th}px ${gw}px`;
          lines5.style.backgroundSize = `${5 * (cs + 1)}px ${5 * (cs + 1)}px`;
          wrap.classList.toggle('ng-small', cs < 22);
        }
        layout();
        const onResize = () => layout();
        window.addEventListener('resize', onResize);

        // ---- rendering ----
        let hover = -1;
        function rowVals(r) { return state.slice(r * N, r * N + N); }
        function colVals(c) { const a = []; for (let r = 0; r < N; r++) a.push(state[r * N + c]); return a; }
        function render() {
          const hr = hover >= 0 ? (hover / N) | 0 : -1, hc = hover >= 0 ? hover % N : -1;
          for (let i = 0; i < N * N; i++) {
            const el = cellEls[i], v = state[i], r = (i / N) | 0, c = i % N;
            el.classList.toggle('f', v === 1);
            el.classList.toggle('x', v === 2);
            el.classList.toggle('err', D.showErr && !won && ((v === 1 && !P.sol[i]) || (v === 2 && P.sol[i] === 1)));
            el.classList.toggle('hl', !won && (r === hr || c === hc));
          }
          for (let r = 0; r < N; r++) {
            const st = lineStatus(rowVals(r), P.rows[r]); const el = rowClueEls[r];
            el.classList.toggle('done', st.done); el.classList.toggle('hl', r === hr);
            if (P.rows[r].length) [...el.children].forEach((sp, k) => sp.classList.toggle('dim', st.dims[k])); else el.firstChild.classList.add('dim');
          }
          for (let c = 0; c < N; c++) {
            const st = lineStatus(colVals(c), P.cols[c]); const el = colClueEls[c];
            el.classList.toggle('done', st.done); el.classList.toggle('hl', c === hc);
            if (P.cols[c].length) [...el.children].forEach((sp, k) => sp.classList.toggle('dim', st.dims[k])); else el.firstChild.classList.add('dim');
          }
          tFill.classList.toggle('on', mode === 'fill'); tCross.classList.toggle('on', mode === 'cross');
          tUndo.disabled = !undoStack.length || won;
          const h = (window.State && State.data.hints) || 0;
          tHint.querySelector('.ng-cnt').textContent = h > 0 ? h : '▶';
          tHint.classList.toggle('ng-adhint', !(h > 0));
          if (D.showErr) ui.msg(mistakes ? `${s('mistakes')}: ${mistakes}` : '', mistakes ? 'bad' : '');
        }
        function anim(el, cls, delay = 0) {
          el.style.setProperty('--d', delay + 'ms');
          el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
          later(() => el.classList.remove(cls), 800 + delay);
        }

        function saveProg() {
          if (won) return;
          D.prog[id] = { s: state.join(''), t: timer.ms, m: mistakes, u: undoStack.slice(-60) };
          ctx.save();
        }

        function setMode(m) { mode = m; D.mode = m; ctx.save(); render(); }

        // Apply a batch of [i, newState]; returns the undo entry ([i, old] list) incl. auto-crosses.
        function applyChanges(list, opts = {}) {
          const entry = []; const touchedRows = new Set(), touchedCols = new Set();
          for (const [i, v] of list) { if (state[i] === v) continue; entry.push([i, state[i]]); state[i] = v; touchedRows.add((i / N) | 0); touchedCols.add(i % N); }
          if (!entry.length) return entry;
          // auto-cross completed lines
          const completed = [];
          const cross = idx => { for (const i of idx) if (state[i] === 0) { entry.push([i, 0]); state[i] = 2; } };
          touchedRows.forEach(r => { if (lineStatus(rowVals(r), P.rows[r]).done) { const idx = lineIdx(N, true, r); cross(idx); completed.push(idx); } });
          touchedCols.forEach(c => { if (lineStatus(colVals(c), P.cols[c]).done) { const idx = lineIdx(N, false, c); cross(idx); completed.push(idx); } });
          if (!opts.quiet) completed.forEach((idx, li) => idx.forEach((i, t) => anim(cellEls[i], 'ng-sweep', t * 22 + li * 40)));
          if (completed.length && !opts.quiet) UI.sound('match');
          return entry;
        }
        function isSolved() { for (let i = 0; i < N * N; i++) if ((state[i] === 1) !== (P.sol[i] === 1)) return false; return true; }

        // ---- pointer: tap / drag a straight line ----
        let drag = null;
        function cellAt(e) {
          const rect = gridEl.getBoundingClientRect();
          const x = e.clientX - rect.left - 1, y = e.clientY - rect.top - 1;
          const c = Math.min(N - 1, Math.max(0, Math.floor(x / (cs + 1)))), r = Math.min(N - 1, Math.max(0, Math.floor(y / (cs + 1))));
          return { r, c };
        }
        function onDown(e) {
          if (won || busy || drag) return;
          if (e.button != null && e.button > 2) return;
          e.preventDefault();
          try { gridEl.setPointerCapture(e.pointerId); } catch (er) { }
          const { r, c } = cellAt(e); const i = r * N + c;
          const m = e.button === 2 ? 'cross' : mode;
          const from = state[i];
          const target = m === 'fill' ? (from === 1 ? 0 : 1) : (from === 2 ? 0 : 2);
          drag = { id: e.pointerId, r0: r, c0: c, from, target, snap: state.slice(), axis: null, last: [i] };
          state[i] = target; hover = i;
          UI.sound(target === 1 ? 'pop' : 'tap');
          render(); anim(cellEls[i], target === 1 ? 'ng-pop' : 'ng-xpop');
          if (!timer.running) timer.start();
        }
        function onMove(e) {
          if (!drag) {
            if (e.pointerType === 'mouse' && !won) { const { r, c } = cellAt(e); const i = r * N + c; if (i !== hover) { hover = i; render(); } }
            return;
          }
          if (e.pointerId !== drag.id) return;
          let { r, c } = cellAt(e);
          if (!drag.axis) { if (r === drag.r0 && c === drag.c0) return; drag.axis = Math.abs(r - drag.r0) >= Math.abs(c - drag.c0) ? 'v' : 'h'; }
          if (drag.axis === 'v') c = drag.c0; else r = drag.r0;
          const cells = [];
          if (drag.axis === 'v') { const a = Math.min(r, drag.r0), b = Math.max(r, drag.r0); for (let k = a; k <= b; k++) cells.push(k * N + c); }
          else { const a = Math.min(c, drag.c0), b = Math.max(c, drag.c0); for (let k = a; k <= b; k++) cells.push(r * N + k); }
          for (const i of drag.last) state[i] = drag.snap[i];
          const painted = [];
          for (const i of cells) if (drag.snap[i] === drag.from) { state[i] = drag.target; painted.push(i); }
          const newOnes = painted.filter(i => !drag.last.includes(i));
          drag.last = painted; hover = r * N + c;
          if (newOnes.length) { UI.sound('tick'); newOnes.forEach(i => anim(cellEls[i], drag.target === 1 ? 'ng-pop' : 'ng-xpop')); }
          render();
        }
        function onUp(e) {
          if (!drag || (e.pointerId !== drag.id)) return;
          const d = drag; drag = null;
          if (e.pointerType !== 'mouse') hover = -1;
          const list = []; for (let i = 0; i < N * N; i++) if (state[i] !== d.snap[i]) list.push([i, state[i]]);
          state = d.snap.slice();
          commit(list);
        }
        function commit(list, opts = {}) {
          // mistakes are counted when "Fehler anzeigen" is on
          if (D.showErr && !opts.hint) {
            let bad = 0;
            for (const [i, v] of list) if ((v === 1 && !P.sol[i]) || (v === 2 && P.sol[i] === 1)) { bad++; }
            if (bad) { mistakes += bad; UI.sound('bad'); list.forEach(([i, v]) => { if ((v === 1 && !P.sol[i]) || (v === 2 && P.sol[i] === 1)) anim(cellEls[i], 'ng-shake'); }); }
          }
          const entry = applyChanges(list, opts);
          if (entry.length) { undoStack.push(entry); if (undoStack.length > 300) undoStack.shift(); }
          if (!timer.running && entry.length) timer.start();
          render(); saveProg();
          if (isSolved()) winReveal();
        }

        function undo() {
          if (won || busy || !undoStack.length) return;
          const entry = undoStack.pop();
          for (let k = entry.length - 1; k >= 0; k--) { const [i, v] = entry[k]; state[i] = v; anim(cellEls[i], 'ng-xpop'); }
          UI.sound('whoosh'); render(); saveProg();
        }
        function resetPuzzle() {
          const entry = []; for (let i = 0; i < N * N; i++) if (state[i]) { entry.push([i, state[i]]); state[i] = 0; }
          if (entry.length) undoStack.push(entry);
          mistakes = 0; UI.sound('whoosh'); ui.msg(''); render(); saveProg();
          cellEls.forEach((el, i) => anim(el, 'ng-xpop', ((i / N | 0) + i % N) * 12));
        }

        async function hint() {
          if (won || busy) return;
          // 1) a wrong mark is fixed first, 2) otherwise the most productive line is filled in logically
          let plan = null;
          const wrong = []; for (let i = 0; i < N * N; i++) if ((state[i] === 1 && !P.sol[i]) || (state[i] === 2 && P.sol[i] === 1)) wrong.push(i);
          if (wrong.length) plan = { cells: [[wrong[0], P.sol[wrong[0]] ? 1 : 2]], text: s('hintFix') };
          else {
            const h = hintLine(P, state);
            if (h) plan = { cells: h.cells, line: lineIdx(N, h.isRow, h.k), text: s('hintLine', { l: h.isRow ? s('row') : s('col'), n: h.k + 1 }) };
            else { const i = state.findIndex((v, k) => v === 0 && P.sol[k]); if (i < 0) return; plan = { cells: [[i, 1]], text: '' }; }
          }
          busy = true;
          const ok = await Kit.useHelp(ctx);
          busy = false;
          if (destroyed || view !== 'play' || D.cur !== id || !ok) return;
          if (!timer.running) timer.start();
          if (plan.line) plan.line.forEach((i, t) => anim(cellEls[i], 'ng-hint', t * 30));
          plan.cells.forEach(([i]) => anim(cellEls[i], 'ng-pop', 120));
          commit(plan.cells, { hint: true });
          if (!won) ui.msg('💡 ' + plan.text, 'accent');
        }

        function winReveal() {
          won = true; timer.stop(); hover = -1;
          const secs = timer.seconds; const first = !D.solved[id];
          const prevBest = D.solved[id] && D.solved[id].t;
          D.solved[id] = { t: prevBest ? Math.min(prevBest, secs) : secs };
          delete D.prog[id]; D.cur = null; ctx.save();
          render();
          wrap.style.setProperty('--pc', p.color);
          wrap.classList.add('ng-won');
          const cr = (N - 1) / 2;
          cellEls.forEach((el, i) => { const r = (i / N) | 0, c = i % N; el.style.setProperty('--d', Math.round(Math.hypot(r - cr, c - cr) * 55) + 'ms'); el.style.setProperty('--sh', (0.16 - r / N * 0.22).toFixed(3)); });
          UI.sound('cascade');
          banner.innerHTML = `<span>${esc(L(p.name))}</span>`;
          later(() => { banner.classList.add('show'); UI.sound('bell'); }, 650 + N * 30);
          const solvedTotal = solvedCount();
          if (solvedTotal >= 10) ctx.badge('nonogram_10');
          if (PACKS[3].ids.every(x => D.solved[x])) ctx.badge('nonogram_all15');
          const stars = first ? STARS[N] : 0;
          const nextId = nextUnsolved(id);
          const lines = [`${s('time')}: ${timer.fmt(secs)} · ${s('best')}: ${timer.fmt(D.solved[id].t)}`];
          if (D.showErr) lines.push(`${s('mistakes')}: ${mistakes}`);
          if (!first) lines.push(s('already'));
          if (pk.ids.every(x => D.solved[x])) lines.push('🎉 ' + s('packDone') + ' · ' + L(pk.name));
          if (!nextId) lines.push(s('allDone'));
          later(() => Kit.result(ctx, {
            result: 'win', title: `${s('solved')} · ${L(p.name)}`, lines, stars,
            onNext: nextId ? () => openPuzzle(nextId) : null, nextLabel: s('next'),
            againLabel: s('overview'), onAgain: () => showMenu(pk.id)
          }), 1900 + N * 30);
        }

        gridEl.addEventListener('pointerdown', onDown);
        gridEl.addEventListener('pointermove', onMove);
        gridEl.addEventListener('pointerup', onUp);
        gridEl.addEventListener('pointercancel', onUp);
        gridEl.addEventListener('pointerleave', () => { if (!drag && hover >= 0) { hover = -1; render(); } });
        gridEl.addEventListener('contextmenu', e => e.preventDefault());
        function onKey(e) {
          if (destroyed || view !== 'play' || document.querySelector('#modal-root .modal-backdrop')) return;
          if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); }
          else if (!e.ctrlKey && !e.metaKey && (e.key === 'x' || e.key === 'X')) setMode(mode === 'fill' ? 'cross' : 'fill');
        }
        document.addEventListener('keydown', onKey);
        function onVis() { if (document.hidden) { timer.stop(); saveProg(); } }
        document.addEventListener('visibilitychange', onVis);

        render();
        if (state.some(v => v) && !won) timer.start();
        ui.board.classList.add('ng-enter');
        cleanupView = () => { saveProg(); timer.stop(); window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); };

        root.__game.view = 'play';
        root.__game.state = () => ({ id, N, state: state.slice(), solution: P.sol.slice(), mistakes, mode, won, cs });
        root.__game.paint = (list) => commit(list);           // [[i, 0|1|2], ...]
        root.__game.solve = (leave = 0) => { const list = []; let left = leave; for (let i = 0; i < N * N; i++) { const want = P.sol[i] ? 1 : 0; if (state[i] !== want && !(want === 0 && state[i] === 2)) { if (want === 1 && left > 0) { left--; continue; } list.push([i, want]); } } commit(list); };
        root.__game.hint = hint; root.__game.undo = undo; root.__game.setMode = setMode;
      }

      function nextUnsolved(after) {
        const order = PACKS.flatMap(pk => pk.ids); const start = order.indexOf(after);
        for (let k = 1; k <= order.length; k++) { const id = order[(start + k) % order.length]; if (!D.solved[id]) return id; }
        return null;
      }

      root.__game = { logic: LOGIC, open: id => openPuzzle(id), menu: () => showMenu(), view: null };
      if (D.cur && byId[D.cur] && !D.solved[D.cur]) openPuzzle(D.cur); else showMenu();

      return {
        destroy() {
          if (cleanupView) cleanupView(); cleanupView = null;
          destroyed = true;
          timers.forEach(clearTimeout); timers.clear();
        }
      };
    }
  });
})();
