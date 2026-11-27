// Dame / Шашки — Russian draughts rules: mandatory capture, multi-jumps, men capture backwards,
// promotion mid-capture (continues as king), flying kings, Turkish strike, draw by 30 quiet moves
// or threefold repetition. Alpha-beta AI with TT + capture quiescence. Prefix: .dm-
(function () {
  'use strict';

  /* =====================================================================
     Pure engine (no DOM) — require()-able in Node for tests
     Board: Int8Array(64), index = r*8 + c, r = 0 is the top (black's home).
     1 white man, 2 white king, -1 black man, -2 black king. White moves "up" (r decreasing).
     ===================================================================== */
  const DM = (function () {
    const DR = [-1, -1, 1, 1], DC = [-1, 1, -1, 1];
    const DARK = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) & 1) DARK.push(r * 8 + c);
    const RAY = []; // RAY[sq][d] = squares along direction d
    for (let sq = 0; sq < 64; sq++) {
      RAY.push([0, 1, 2, 3].map(d => { const a = []; let r = (sq >> 3) + DR[d], c = (sq & 7) + DC[d]; while (r >= 0 && r < 8 && c >= 0 && c < 8) { a.push(r * 8 + c); r += DR[d]; c += DC[d]; } return a; }));
    }
    const WIN = 100000, INF = 1e9;
    const promoRow = side => side === 1 ? 0 : 7;

    function initial() {
      const b = new Int8Array(64);
      for (const sq of DARK) { const r = sq >> 3; if (r < 3) b[sq] = -1; else if (r > 4) b[sq] = 1; }
      return b;
    }
    const CH = { 0: '.', 1: 'w', 2: 'W', '-1': 'b', '-2': 'B' }, VAL = { '.': 0, w: 1, W: 2, b: -1, B: -2 };
    function toStr(b) { let s = ''; for (const sq of DARK) s += CH[b[sq]]; return s; }
    function fromStr(s) { const b = new Int8Array(64); DARK.forEach((sq, i) => { b[sq] = VAL[s[i]] || 0; }); return b; }
    // Test helper: 8 strings of 8 chars, top row first ('.', ' ', '-' = empty; w W b B).
    function fromRows(rows) { const b = new Int8Array(64); rows.forEach((row, r) => { for (let c = 0; c < 8; c++) { const v = VAL[row[c]]; if (v) { if (!((r + c) & 1)) throw new Error('piece on light square ' + r + ',' + c); b[r * 8 + c] = v; } } }); return b; }
    const sqName = sq => 'abcdefgh'[sq & 7] + (8 - (sq >> 3));
    const nameSq = n => (8 - +n[1]) * 8 + 'abcdefgh'.indexOf(n[0]);

    // ---- move generation ----
    const capMark = new Uint8Array(64);
    function mk(path, caps, b, piece, kingNow) {
      return { from: path[0], to: path[path.length - 1], path: path.slice(), caps: caps.slice(), capv: caps.map(c => b[c]), piece, promote: Math.abs(piece) === 1 && kingNow };
    }
    function capturesFrom(b, sq, out) {
      const p = b[sq], side = p > 0 ? 1 : -1, pr = promoRow(side);
      const path = [sq], caps = [];
      b[sq] = 0; // the moving piece leaves its square (it may pass over / return to it)
      function canJump(pos, king) {
        for (let d = 0; d < 4; d++) {
          const ray = RAY[pos][d];
          if (!king) {
            if (ray.length >= 2 && b[ray[0]] * side < 0 && !capMark[ray[0]] && b[ray[1]] === 0) return true;
          } else {
            let i = 0; while (i < ray.length && b[ray[i]] === 0) i++;
            if (i < ray.length - 1 && b[ray[i]] * side < 0 && !capMark[ray[i]] && b[ray[i + 1]] === 0) return true;
          }
        }
        return false;
      }
      function dfs(pos, king) {
        let any = false;
        for (let d = 0; d < 4; d++) {
          const ray = RAY[pos][d];
          if (!king) {
            if (ray.length < 2) continue;
            const m = ray[0], t = ray[1];
            if (!(b[m] * side < 0 && !capMark[m] && b[t] === 0)) continue;
            any = true; capMark[m] = 1; caps.push(m); path.push(t);
            const nk = (t >> 3) === pr; // promotion mid-capture: continues as a king
            if (!dfs(t, nk)) out.push(mk(path, caps, b, p, nk));
            path.pop(); caps.pop(); capMark[m] = 0;
          } else {
            let i = 0; while (i < ray.length && b[ray[i]] === 0) i++;
            if (i >= ray.length - 1) continue;
            const m = ray[i];
            if (!(b[m] * side < 0 && !capMark[m])) continue; // own piece, or an already jumped one (Turkish strike: it stays and blocks)
            const lands = [];
            for (let j = i + 1; j < ray.length && b[ray[j]] === 0; j++) lands.push(ray[j]);
            if (!lands.length) continue;
            any = true; capMark[m] = 1; caps.push(m);
            const cont = lands.filter(t => canJump(t, true)); // must land where the capture can continue, if possible
            for (const t of (cont.length ? cont : lands)) {
              path.push(t);
              if (!dfs(t, true)) out.push(mk(path, caps, b, p, true));
              path.pop();
            }
            caps.pop(); capMark[m] = 0;
          }
        }
        return any;
      }
      dfs(sq, Math.abs(p) === 2);
      b[sq] = p;
    }
    function quietFrom(b, sq, out) {
      const p = b[sq], side = p > 0 ? 1 : -1;
      if (Math.abs(p) === 1) {
        const ds = side === 1 ? [0, 1] : [2, 3];
        for (const d of ds) { const t = RAY[sq][d][0]; if (t !== undefined && b[t] === 0) out.push({ from: sq, to: t, path: [sq, t], caps: [], capv: [], piece: p, promote: (t >> 3) === promoRow(side) }); }
      } else {
        for (let d = 0; d < 4; d++) for (const t of RAY[sq][d]) { if (b[t] !== 0) break; out.push({ from: sq, to: t, path: [sq, t], caps: [], capv: [], piece: p, promote: false }); }
      }
    }
    function captures(b, side) { const out = []; for (const sq of DARK) if (b[sq] * side > 0) capturesFrom(b, sq, out); return out; }
    function legal(b, side) {
      const out = captures(b, side);
      if (out.length) return out;
      for (const sq of DARK) if (b[sq] * side > 0) quietFrom(b, sq, out);
      return out;
    }
    function make(b, m) {
      b[m.from] = 0;
      for (const c of m.caps) b[c] = 0;
      b[m.to] = m.promote ? m.piece * 2 : m.piece;
    }
    function unmake(b, m) {
      b[m.to] = 0;
      for (let i = 0; i < m.caps.length; i++) b[m.caps[i]] = m.capv[i];
      b[m.from] = m.piece;
    }
    const sameMove = (a, b) => a && b && a.path.length === b.path.length && a.path.every((x, i) => x === b.path[i]);
    function notation(m) { return m.path.map(sqName).join(m.caps.length ? ':' : '-'); }

    // ---- evaluation (white's point of view) ----
    const ADV = [0, 22, 15, 10, 7, 4, 2, 0]; // white man bonus by row (row 7 = home)
    function evaluate(b) {
      let s = 0, mat = 0, n = 0;
      for (let k = 0; k < 32; k++) {
        const sq = DARK[k], v = b[sq]; if (!v) continue;
        n++;
        const r = sq >> 3, c = sq & 7, center = (c >= 2 && c <= 5 && r >= 2 && r <= 5) ? 1 : 0;
        if (v === 1) { mat += 100; s += ADV[r] + center * 5 + (r === 7 ? 7 : 0) + ((c === 0 || c === 7) ? -3 : 0); }
        else if (v === -1) { mat -= 100; s -= ADV[7 - r] + center * 5 + (r === 0 ? 7 : 0) + ((c === 0 || c === 7) ? -3 : 0); }
        else if (v === 2) { mat += 250; s += (r + c === 7 ? 14 : 0) + center * 4; }
        else { mat -= 250; s -= (r + c === 7 ? 14 : 0) + center * 4; }
      }
      // when ahead, trading down is good
      return mat + s + Math.round(mat * (24 - n) / 60);
    }

    // ---- Zobrist hashing + transposition table ----
    let seed = 0x2545F491;
    const rnd32 = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return (t ^ t >>> 14) | 0; };
    const PI = v => v === 1 ? 0 : v === 2 ? 1 : v === -1 ? 2 : 3;
    const Z1 = [], Z2 = [];
    for (let p = 0; p < 4; p++) { Z1.push(new Int32Array(64)); Z2.push(new Int32Array(64)); for (let i = 0; i < 64; i++) { Z1[p][i] = rnd32(); Z2[p][i] = rnd32() | 1; } }
    const ZS1 = rnd32(), ZS2 = rnd32();
    let h1 = 0, h2 = 0;
    function hash(b, side) { h1 = side === 1 ? 0 : ZS1; h2 = side === 1 ? 0 : ZS2; for (let k = 0; k < 32; k++) { const sq = DARK[k], v = b[sq]; if (v) { const pi = PI(v); h1 ^= Z1[pi][sq]; h2 ^= Z2[pi][sq]; } } }
    const TBITS = 19, TMASK = (1 << TBITS) - 1;
    const TK = new Int32Array(1 << TBITS), TS = new Int32Array(1 << TBITS), TD = new Int8Array(1 << TBITS), TF = new Int8Array(1 << TBITS), TB = new Int16Array(1 << TBITS);
    function clearTT() { TF.fill(0); }

    const ABORT = { abort: true };
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let nodes = 0, deadline = Infinity;
    const toTT = (v, ply) => v > WIN - 1000 ? v + ply : v < -(WIN - 1000) ? v - ply : v;
    const fromTT = (v, ply) => v > WIN - 1000 ? v - ply : v < -(WIN - 1000) ? v + ply : v;

    function orderMoves(moves, ttIdx) {
      const sc = moves.map((m, i) => (i === ttIdx ? 1e6 : 0) + m.caps.length * 1000 + (m.promote ? 500 : 0) + (Math.abs(m.piece) === 1 ? (m.piece > 0 ? (m.from >> 3) - (m.to >> 3) : (m.to >> 3) - (m.from >> 3)) : 0));
      return moves.map((m, i) => i).sort((a, b) => sc[b] - sc[a]);
    }
    function negamax(b, side, depth, alpha, beta, ply) {
      if ((++nodes & 1023) === 0 && now() > deadline) throw ABORT;
      const moves = legal(b, side);
      if (!moves.length) return -WIN + ply;
      const isCap = moves[0].caps.length > 0;
      if ((depth <= 0 && !isCap) || ply > 60) return side * evaluate(b);
      let ti = -1, ttIdx = -1;
      const alpha0 = alpha;
      if (depth > 0) {
        hash(b, side); ti = h1 & TMASK;
        if (TF[ti] && TK[ti] === h2) {
          ttIdx = TB[ti] < moves.length ? TB[ti] : -1;
          if (TD[ti] >= depth) {
            const v = fromTT(TS[ti], ply), f = TF[ti];
            if (f === 1) return v;
            if (f === 2 && v > alpha) alpha = v; else if (f === 3 && v < beta) beta = v;
            if (alpha >= beta) return v;
          }
        }
      }
      const key2 = h2;
      let best = -INF, bestI = 0;
      const ord = moves.length > 1 ? orderMoves(moves, ttIdx) : [0];
      for (const i of ord) {
        const m = moves[i];
        make(b, m);
        const v = -negamax(b, -side, depth - 1, -beta, -alpha, ply + 1);
        unmake(b, m);
        if (v > best) { best = v; bestI = i; }
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
      if (ti >= 0) {
        TK[ti] = key2; TS[ti] = toTT(best, ply); TD[ti] = depth; TB[ti] = bestI;
        TF[ti] = best <= alpha0 ? 3 : best >= beta ? 2 : 1;
      }
      return best;
    }

    const LEVELS = { easy: { depth: 2, noise: 70, blunder: .12 }, medium: { depth: 5 }, hard: { depth: 40, time: 1000 } };
    // Returns {move, score, depth}. opt: {time, depth, random}
    function search(b0, side, level = 'hard', opt = {}) {
      const b = Int8Array.from(b0);
      const moves = legal(b, side);
      if (!moves.length) return { move: null, score: -WIN };
      if (moves.length === 1) return { move: moves[0], score: 0, depth: 0, forced: true };
      const L = Object.assign({}, LEVELS[level] || LEVELS.hard, opt);
      const rand = opt.random || Math.random;
      nodes = 0;
      let order = moves.slice();
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }

      if (level === 'easy') {
        deadline = now() + 1200;
        if (rand() < L.blunder) {
          // occasional casual move, but never one that hangs a piece for nothing at depth 1
          const safe = order.filter(m => { make(b, m); const v = -negamax(b, -side, 1, -INF, INF, 1); unmake(b, m); return v > -60; });
          if (safe.length) return { move: safe[0], score: 0, depth: 1 };
        }
        let best = order[0], bv = -INF;
        try {
          for (const m of order) {
            make(b, m); const v = -negamax(b, -side, L.depth - 1, -INF, INF, 1); unmake(b, m);
            const x = Math.abs(v) > WIN - 1000 ? v : v + rand() * L.noise;
            if (x > bv) { bv = x; best = m; }
          }
        } catch (e) { if (e !== ABORT) throw e; }
        return { move: best, score: bv, depth: L.depth };
      }

      deadline = now() + (L.time || 1500);
      let best = order[0], bestV = -INF, done = 0;
      for (let d = 1; d <= L.depth; d++) {
        try {
          let alpha = -INF, cb = order[0], cv = -INF;
          for (const m of order) {
            make(b, m); const v = -negamax(b, -side, d - 1, -INF, -alpha, 1); unmake(b, m);
            if (v > cv) { cv = v; cb = m; }
            if (v > alpha) alpha = v;
          }
          best = cb; bestV = cv; done = d;
          order = [cb].concat(order.filter(m => m !== cb));
          if (Math.abs(cv) > WIN - 1000) break;
        } catch (e) {
          if (e !== ABORT) throw e;
          b.set(b0); // board may be mid-search: restore
          break;
        }
      }
      return { move: best, score: bestV, depth: done, nodes };
    }

    // ---- game record + draw rules ----
    const QUIET_LIMIT = 30; // half-moves in a row without a capture or a man move
    function keyOf(b, turn) { return toStr(b) + (turn > 0 ? 'w' : 'b'); }
    function newGame() { const b = initial(); return { b, turn: 1, quiet: 0, keys: [keyOf(b, 1)], capW: 0, capB: 0, last: null, ply: 0 }; }
    function applyGame(g, m) {
      make(g.b, m);
      if (m.caps.length) { if (m.piece > 0) g.capW += m.caps.length; else g.capB += m.caps.length; }
      const irreversible = m.caps.length > 0 || Math.abs(m.piece) === 1;
      g.quiet = irreversible ? 0 : g.quiet + 1;
      g.turn = -g.turn; g.ply++;
      const k = keyOf(g.b, g.turn);
      if (irreversible) g.keys = [k]; else g.keys.push(k);
      g.last = { from: m.from, to: m.to, path: m.path.slice() };
    }
    function status(g) {
      const moves = legal(g.b, g.turn);
      if (!moves.length) return { over: true, winner: -g.turn, reason: 'nomoves', moves };
      if (g.quiet >= QUIET_LIMIT) return { over: true, winner: 0, reason: 'quiet', moves };
      const k = g.keys[g.keys.length - 1];
      if (g.keys.filter(x => x === k).length >= 3) return { over: true, winner: 0, reason: 'repetition', moves };
      return { over: false, moves };
    }
    function count(b) { let w = 0, bl = 0; for (const sq of DARK) { if (b[sq] > 0) w++; else if (b[sq] < 0) bl++; } return { w, b: bl }; }

    return { DARK, RAY, WIN, QUIET_LIMIT, initial, toStr, fromStr, fromRows, sqName, nameSq, legal, captures, make, unmake, evaluate, search, clearTT, sameMove, notation, keyOf, newGame, applyGame, status, count };
  })();

  if (typeof module === 'object' && module.exports) module.exports = DM;
  if (typeof window === 'undefined' || !window.Games) return;

  /* =====================================================================
     UI
     ===================================================================== */
  const STR = {
    de: {
      you: 'Du', cpu: 'Computer', white: 'Weiß', black: 'Schwarz', yourTurn: 'Du bist am Zug', cpuThinks: 'Computer denkt …',
      mustCapture: 'Schlagen ist Pflicht!', mustCaptureShort: 'Schlagpflicht', continueJump: 'Weiterschlagen – wähle das nächste Feld', choosePath: 'Mehrere Wege – wähle das nächste Feld',
      hintMove: 'Tipp: {m}', thinking: 'Rechne …', noUndo: 'Nichts zum Zurücknehmen', undoFree: 'Erste Rücknahme ist gratis',
      setupTitle: 'Neue Partie', resign: 'Aufgeben', resignQ: 'Partie wirklich aufgeben?', resignText: 'Du hast aufgegeben.', notStarted: 'Die Partie hat noch nicht begonnen', difficulty: 'Stufe', color: 'Deine Farbe', start: 'Los geht’s', cancel: 'Abbrechen', newG: 'Neu',
      winText: 'Der Computer kann nicht mehr ziehen.', loseText: 'Du kannst nicht mehr ziehen.', drawQuiet: 'Remis: 30 Züge ohne Schlagen und ohne Steinzug.',
      drawRep: 'Remis: dreimal dieselbe Stellung.', winTitle: 'Gewonnen!', loseTitle: 'Der Computer gewinnt', captured: 'geschlagen', record: 'Bilanz',
      inMoves: 'Partie mit {n} Zügen.', rulesT: 'Dame – Regeln (russische Variante)',
      rulesHtml: `<ul>
        <li>Gespielt wird auf den dunklen Feldern eines 8×8-Bretts, jede Seite hat 12 Steine. <b>Weiß beginnt.</b></li>
        <li>Steine ziehen ein Feld diagonal <b>vorwärts</b>. Geschlagen wird, indem man über einen gegnerischen Stein auf das freie Feld dahinter springt – Steine dürfen dabei <b>auch rückwärts</b> schlagen.</li>
        <li><b>Schlagen ist Pflicht.</b> Kann nach einem Sprung weiter geschlagen werden, muss die Kette im selben Zug zu Ende gesprungen werden. Gibt es mehrere Möglichkeiten, darfst du frei wählen (keine Mehrheitspflicht).</li>
        <li>Erreicht ein Stein die gegnerische Grundreihe, wird er zur <b>Dame</b> (Krone). Geschieht das mitten im Schlagen und kann weiter geschlagen werden, schlägt er sofort <b>als Dame</b> weiter.</li>
        <li>Die Dame ist <b>weitschrittig</b>: Sie zieht und schlägt beliebig weit diagonal und darf hinter dem geschlagenen Stein auf jedem freien Feld landen – außer wenn nur bestimmte Felder ein Weiterschlagen erlauben; dann muss sie dort landen.</li>
        <li>Geschlagene Steine werden erst <b>nach dem Zug</b> entfernt und dürfen nicht zweimal übersprungen werden („türkischer Schlag“) – sie blockieren solange den Weg.</li>
        <li>Wer nicht mehr ziehen kann (keine Steine oder alle blockiert), verliert.</li>
        <li><b>Remis</b>: 30 Züge in Folge (beide Seiten zusammen) ohne Schlagen und ohne Steinzug, oder dreimal dieselbe Stellung.</li>
        <li>Sterne: Leicht 8, Mittel 15, Schwer 30 – Remis die Hälfte. Erste Rücknahme pro Partie gratis.</li></ul>`
    },
    ru: {
      you: 'Ты', cpu: 'Компьютер', white: 'Белые', black: 'Чёрные', yourTurn: 'Твой ход', cpuThinks: 'Компьютер думает …',
      mustCapture: 'Бить обязательно!', mustCaptureShort: 'Обязательное взятие', continueJump: 'Бей дальше — выбери следующее поле', choosePath: 'Несколько путей — выбери следующее поле',
      hintMove: 'Подсказка: {m}', thinking: 'Считаю …', noUndo: 'Нечего отменять', undoFree: 'Первая отмена бесплатно',
      setupTitle: 'Новая партия', resign: 'Сдаться', resignQ: 'Точно сдать партию?', resignText: 'Ты сдался.', notStarted: 'Партия ещё не началась', difficulty: 'Уровень', color: 'Твой цвет', start: 'Начать', cancel: 'Отмена', newG: 'Заново',
      winText: 'У компьютера не осталось ходов.', loseText: 'У тебя не осталось ходов.', drawQuiet: 'Ничья: 30 ходов без взятий и без ходов простыми.',
      drawRep: 'Ничья: позиция повторилась трижды.', winTitle: 'Победа!', loseTitle: 'Компьютер победил', captured: 'взято', record: 'Счёт',
      inMoves: 'Партия из {n} ходов.', rulesT: 'Шашки — правила (русские)',
      rulesHtml: `<ul>
        <li>Игра идёт на тёмных полях доски 8×8, у каждой стороны 12 шашек. <b>Первыми ходят белые.</b></li>
        <li>Простая шашка ходит на одно поле по диагонали <b>вперёд</b>. Бьют, перепрыгивая через шашку соперника на свободное поле за ней — простые бьют <b>и назад</b>.</li>
        <li><b>Бить обязательно.</b> Если после прыжка можно бить дальше, серию нужно довести до конца в том же ходе. Если вариантов несколько, можно выбрать любой (не обязательно самый длинный).</li>
        <li>Дойдя до последнего ряда, шашка становится <b>дамкой</b> (корона). Если это случилось во время взятия и бить можно дальше, она продолжает бить <b>уже как дамка</b>.</li>
        <li>Дамка <b>дальнобойная</b>: ходит и бьёт на любое расстояние по диагонали и может встать на любое свободное поле за побитой шашкой — кроме случая, когда продолжить взятие можно лишь с некоторых полей: тогда встать нужно на них.</li>
        <li>Побитые шашки снимаются <b>только после хода</b> и не могут быть перепрыгнуты дважды («турецкий удар») — до конца хода они загораживают путь.</li>
        <li>Кто не может сделать ход (нет шашек или все заперты), проигрывает.</li>
        <li><b>Ничья</b>: 30 ходов подряд (обеих сторон вместе) без взятий и без ходов простыми, или трёхкратное повторение позиции.</li>
        <li>Звёзды: лёгкий 8, средний 15, сложный 30 — за ничью половина. Первая отмена в партии бесплатно.</li></ul>`
    },
    en: {
      you: 'You', cpu: 'Computer', white: 'White', black: 'Black', yourTurn: 'Your turn', cpuThinks: 'Computer is thinking …',
      mustCapture: 'Capturing is compulsory!', mustCaptureShort: 'Must capture', continueJump: 'Keep jumping – choose the next square', choosePath: 'Several paths – choose the next square',
      hintMove: 'Hint: {m}', thinking: 'Calculating …', noUndo: 'Nothing to undo', undoFree: 'Your first undo is free',
      setupTitle: 'New game', resign: 'Resign', resignQ: 'Really resign this game?', resignText: 'You resigned.', notStarted: 'The game has not started yet', difficulty: 'Level', color: 'Your colour', start: 'Let’s go', cancel: 'Cancel', newG: 'New',
      winText: 'The computer has no moves left.', loseText: 'You have no moves left.', drawQuiet: 'Draw: 30 moves without a capture or a man move.',
      drawRep: 'Draw: the same position occurred three times.', winTitle: 'You won!', loseTitle: 'The computer wins', captured: 'captured', record: 'Record',
      inMoves: 'Game of {n} moves.', rulesT: 'Checkers – rules (Russian draughts)',
      rulesHtml: `<ul>
        <li>The game is played on the dark squares of an 8×8 board; each side has 12 men. <b>White moves first.</b></li>
        <li>Men move one square diagonally <b>forward</b>. You capture by jumping over an opponent’s piece onto the empty square behind it – men may capture <b>backwards too</b>.</li>
        <li><b>Capturing is compulsory.</b> If you can keep capturing after a jump, the whole chain must be completed in the same move. If there are several options, you may choose freely (no majority rule).</li>
        <li>A man that reaches the far row becomes a <b>king</b> (crown). If this happens in the middle of a capture and it can capture further, it continues <b>as a king</b> right away.</li>
        <li>Kings are <b>flying kings</b>: they move and capture any distance diagonally and may land on any empty square behind the captured piece – unless only certain squares allow a further capture; then they must land there.</li>
        <li>Captured pieces are removed only <b>after the move</b> and may not be jumped twice (“Turkish strike”) – until then they block the way.</li>
        <li>A player who cannot move (no pieces left or all blocked) loses.</li>
        <li><b>Draw</b>: 30 moves in a row (both sides together) without a capture and without a man move, or the same position three times.</li>
        <li>Stars: Easy 8, Medium 15, Hard 30 – half for a draw. The first undo per game is free.</li></ul>`
    },
    uk: {
      you: 'Ти', cpu: 'Комп’ютер', white: 'Білі', black: 'Чорні', yourTurn: 'Твій хід', cpuThinks: 'Комп’ютер думає …',
      mustCapture: 'Бити обов’язково!', mustCaptureShort: 'Обов’язкове взяття', continueJump: 'Бий далі — обери наступне поле', choosePath: 'Кілька шляхів — обери наступне поле',
      hintMove: 'Підказка: {m}', thinking: 'Рахую …', noUndo: 'Немає чого скасовувати', undoFree: 'Перше скасування безкоштовне',
      setupTitle: 'Нова партія', resign: 'Здатися', resignQ: 'Справді здати партію?', resignText: 'Ти здався.', notStarted: 'Партія ще не почалася', difficulty: 'Рівень', color: 'Твій колір', start: 'Почати', cancel: 'Скасувати', newG: 'Заново',
      winText: 'У комп’ютера не залишилося ходів.', loseText: 'У тебе не залишилося ходів.', drawQuiet: 'Нічия: 30 ходів без взяття і без ходів простими.',
      drawRep: 'Нічия: позиція повторилася тричі.', winTitle: 'Перемога!', loseTitle: 'Комп’ютер переміг', captured: 'взято', record: 'Рахунок',
      inMoves: 'Партія з {n} ходів.', rulesT: 'Шашки — правила (російські)',
      rulesHtml: `<ul>
        <li>Гра йде на темних полях дошки 8×8, у кожної сторони 12 шашок. <b>Першими ходять білі.</b></li>
        <li>Проста шашка ходить на одне поле по діагоналі <b>вперед</b>. Б’ють, перестрибуючи через шашку суперника на вільне поле за нею, — прості б’ють <b>і назад</b>.</li>
        <li><b>Бити обов’язково.</b> Якщо після стрибка можна бити далі, серію треба довести до кінця в тому самому ході. Якщо варіантів кілька, можна обрати будь-який (не обов’язково найдовший).</li>
        <li>Дійшовши до останнього ряду, шашка стає <b>дамкою</b> (корона). Якщо це сталося під час взяття і бити можна далі, вона продовжує бити <b>вже як дамка</b>.</li>
        <li>Дамка <b>далекобійна</b>: ходить і б’є на будь-яку відстань по діагоналі й може стати на будь-яке вільне поле за побитою шашкою — крім випадку, коли продовжити взяття можна лише з деяких полів: тоді стати треба на них.</li>
        <li>Побиті шашки знімаються <b>лише після ходу</b> і не можуть бути перестрибнуті двічі («турецький удар») — до кінця ходу вони загороджують шлях.</li>
        <li>Хто не може зробити хід (немає шашок або всі заблоковані), програє.</li>
        <li><b>Нічия</b>: 30 ходів поспіль (обох сторін разом) без взяття і без ходів простими, або триразове повторення позиції.</li>
        <li>Зірки: легкий 8, середній 15, складний 30 — за нічию половина. Перше скасування в партії безкоштовне.</li></ul>`
    }
  };
  const STARS = { easy: 8, medium: 15, hard: 30 };

  const DEFS = `<svg class="dm-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
    <radialGradient id="dm-gw-top" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#f6efe0"/><stop offset="1" stop-color="#d4c6a6"/></radialGradient>
    <linearGradient id="dm-gw-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdbf9f"/><stop offset="1" stop-color="#8d7b58"/></linearGradient>
    <radialGradient id="dm-gb-top" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#6b6670"/><stop offset=".45" stop-color="#36323a"/><stop offset="1" stop-color="#17151a"/></radialGradient>
    <linearGradient id="dm-gb-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a262d"/><stop offset="1" stop-color="#060507"/></linearGradient>
    <linearGradient id="dm-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#f5b70a"/><stop offset="1" stop-color="#b8780a"/></linearGradient>
    <symbol id="dm-sym-w" viewBox="0 0 100 100">
      <ellipse cx="50" cy="60" rx="42" ry="37" fill="#000" opacity=".28"/>
      <circle cx="50" cy="55" r="41" fill="url(#dm-gw-side)"/>
      <circle cx="50" cy="48" r="41" fill="url(#dm-gw-top)"/>
      <circle cx="50" cy="48" r="40" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/>
      <circle cx="50" cy="48" r="31" fill="none" stroke="#8a7550" stroke-opacity=".35" stroke-width="2.4"/>
      <circle cx="50" cy="48" r="23" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.6"/>
      <circle cx="50" cy="48" r="21" fill="none" stroke="#8a7550" stroke-opacity=".22" stroke-width="1.6"/>
      <ellipse cx="37" cy="31" rx="17" ry="8" fill="#fff" opacity=".6" transform="rotate(-28 37 31)"/>
    </symbol>
    <symbol id="dm-sym-b" viewBox="0 0 100 100">
      <ellipse cx="50" cy="60" rx="42" ry="37" fill="#000" opacity=".32"/>
      <circle cx="50" cy="55" r="41" fill="url(#dm-gb-side)"/>
      <circle cx="50" cy="48" r="41" fill="url(#dm-gb-top)"/>
      <circle cx="50" cy="48" r="40" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.4"/>
      <circle cx="50" cy="48" r="31" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="2.4"/>
      <circle cx="50" cy="48" r="23" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="1.6"/>
      <circle cx="50" cy="48" r="21" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.6"/>
      <ellipse cx="37" cy="31" rx="17" ry="8" fill="#fff" opacity=".22" transform="rotate(-28 37 31)"/>
    </symbol>
    <symbol id="dm-crown" viewBox="0 0 100 100"><g transform="translate(50 50)">
      <path d="M-21 7 L-24 -11 L-11.5 -1.5 L0 -16 L11.5 -1.5 L24 -11 L21 7 Z" fill="url(#dm-gold)" stroke="#8a5a00" stroke-width="1.8" stroke-linejoin="round"/>
      <rect x="-21" y="7" width="42" height="7" rx="2.5" fill="url(#dm-gold)" stroke="#8a5a00" stroke-width="1.6"/>
      <circle cx="-24" cy="-12" r="3" fill="#fff4b8" stroke="#8a5a00" stroke-width="1.2"/><circle cx="0" cy="-17" r="3.2" fill="#fff4b8" stroke="#8a5a00" stroke-width="1.2"/><circle cx="24" cy="-12" r="3" fill="#fff4b8" stroke="#8a5a00" stroke-width="1.2"/>
      <circle cx="0" cy="3" r="2.6" fill="#e11d48"/><circle cx="-11" cy="4" r="1.9" fill="#2563eb"/><circle cx="11" cy="4" r="1.9" fill="#2563eb"/>
    </g></symbol>
  </defs></svg>`;
  const pieceSvg = v => `<svg viewBox="0 0 100 100"><use href="#dm-sym-${v > 0 ? 'w' : 'b'}"/>${Math.abs(v) === 2 ? '<use class="dm-crown" href="#dm-crown"/>' : ''}</svg>`;

  Games.register({
    id: 'checkers', icon: '⚪', partner: 'p5', isNew: true,
    name: { de: 'Dame', en: 'Checkers', ru: 'Шашки', uk: 'Шашки' },
    tagline: { de: 'Russische Dame mit Schlagzwang und Langschritt-Damen.', en: 'Russian draughts with compulsory capture and flying kings.', ru: 'Русские шашки: обязательное взятие и дальнобойные дамки.', uk: 'Російські шашки: обов’язкове взяття й далекобійні дамки.' },
    badges: [
      { id: 'checkers_win', icon: '⚪', name: { de: 'Dame – erster Sieg', en: 'Checkers – first win', ru: 'Шашки — первая победа', uk: 'Шашки — перша перемога' } },
      { id: 'checkers_hard', icon: '👑', name: { de: 'Dame – Schwer besiegt', en: 'Checkers – Hard beaten', ru: 'Шашки — сложный уровень', uk: 'Шашки — складний рівень' } }
    ],
    logic: DM,
    thumb() {
      let sq = '';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) sq += `<rect x="${48 + c * 8}" y="${8 + r * 8}" width="8" height="8" fill="${(r + c) & 1 ? '#9a6234' : '#f0d6aa'}"/>`;
      const pc = (x, y, w, k) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3.4" rx="11" ry="10" fill="#000" opacity=".25"/><circle r="11" cy="2" fill="${w ? '#b9a682' : '#0b0a0d'}"/><circle r="11" fill="url(#${w ? 'dmtw' : 'dmtb'})"/><circle r="7.5" fill="none" stroke="${w ? '#8a7550' : '#000'}" stroke-opacity=".35" stroke-width="1.2"/>${k ? '<path d="M-6 3 L-7 -4 L-3 -1 L0 -6 L3 -1 L7 -4 L6 3 Z" fill="#f5b70a" stroke="#8a5a00" stroke-width=".8"/>' : ''}</g>`;
      return `<defs><linearGradient id="dmtbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdf0dc"/><stop offset="1" stop-color="#f1d3a6"/></linearGradient>
        <radialGradient id="dmtw" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d4c6a6"/></radialGradient>
        <radialGradient id="dmtb" cx=".35" cy=".3"><stop offset="0" stop-color="#6b6670"/><stop offset="1" stop-color="#17151a"/></radialGradient></defs>
        <rect width="160" height="80" fill="url(#dmtbg)"/>
        <rect x="44" y="4" width="72" height="80" rx="6" fill="#5b3519"/>${sq}
        <rect x="48" y="40" width="64" height="40" fill="#9a6234" opacity=".0"/>
        ${pc(30, 46, false, false)}${pc(80, 48, true, true)}${pc(130, 44, false, true)}`;
    },
    mount(root, ctx) {
      const s = Kit.strings(STR);
      const d = ctx.data;
      d.stats = d.stats || {};
      let cfg = Object.assign({ diff: 'medium', color: 1 }, d.cfg || {});
      let g = null, over = false, busy = false, gen = 0, freeUndo = true, snaps = [];
      let legalNow = [], sel = null, prefix = [], cands = [], hint = null;
      const timers = new Set();
      const later = (fn, ms) => { const gg = gen; const id = setTimeout(() => { timers.delete(id); if (gg === gen) fn(); }, ms); timers.add(id); return id; };
      const human = () => cfg.color;
      const humanTurn = () => !over && g.turn === human();

      const ui = Kit.shell(root, { top: true, cls: 'clear dm-wrap' });
      ui.top.innerHTML = `<span class="gk-chip dm-chip"></span><span class="dm-rec"></span>`;
      const chip = ui.top.querySelector('.dm-chip'), recEl = ui.top.querySelector('.dm-rec');
      ui.board.innerHTML = `${DEFS}
        <div class="dm-bar" data-who="cpu"></div>
        <div class="dm-frame">
          <div class="dm-files"></div><div class="dm-ranks"></div>
          <div class="dm-board">
            <div class="dm-squares"></div>
            <div class="dm-marks"></div>
            <div class="dm-pieces"></div>
          </div>
        </div>
        <div class="dm-bar" data-who="you"></div>`;
      const boardEl = ui.board.querySelector('.dm-board'), squaresEl = ui.board.querySelector('.dm-squares');
      const marksEl = ui.board.querySelector('.dm-marks'), piecesEl = ui.board.querySelector('.dm-pieces');
      const bars = { cpu: ui.board.querySelector('[data-who="cpu"]'), you: ui.board.querySelector('[data-who="you"]') };
      let sqHtml = '';
      for (let i = 0; i < 64; i++) sqHtml += `<div class="dm-sq ${((i >> 3) + (i & 7)) & 1 ? 'd' : 'l'}"></div>`;
      squaresEl.innerHTML = sqHtml;
      let pieceEls = {};

      const tool = (ico, label, fn) => ui.tool(`<span class="ico">${ico}</span>${label}`, fn);
      const bUndo = tool('↶', s('undo'), () => doUndo());
      const bHint = tool('💡', s('hint'), () => doHint());
      tool('🏳️', s('resign'), () => doResign());
      tool('＋', s('newG'), () => openSetup());
      tool('📖', s('rules'), () => Kit.rules(s('rulesT'), s('rulesHtml')));

      // ---- geometry ----
      const flip = () => human() === -1;
      const disp = sq => { const r = sq >> 3, c = sq & 7; return flip() ? [7 - r, 7 - c] : [r, c]; };
      const tf = sq => { const [r, c] = disp(sq); return `translate(${c * 100}%, ${r * 100}%)`; };
      function sqFromPoint(x, y) {
        const rc = boardEl.getBoundingClientRect();
        let c = Math.floor((x - rc.left) / rc.width * 8), r = Math.floor((y - rc.top) / rc.height * 8);
        if (c < 0 || c > 7 || r < 0 || r > 7) return -1;
        if (flip()) { r = 7 - r; c = 7 - c; }
        return r * 8 + c;
      }
      function renderLabels() {
        const files = 'abcdefgh'.split(''), ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        if (flip()) { files.reverse(); ranks.reverse(); }
        ui.board.querySelector('.dm-files').innerHTML = files.map(f => `<span>${f}</span>`).join('');
        ui.board.querySelector('.dm-ranks').innerHTML = ranks.map(f => `<span>${f}</span>`).join('');
      }

      // ---- rendering ----
      function render() {
        piecesEl.innerHTML = ''; pieceEls = {};
        for (const sq of DM.DARK) {
          const v = g.b[sq]; if (!v) continue;
          const el = document.createElement('div');
          el.className = 'dm-p ' + (v > 0 ? 'w' : 'b') + (Math.abs(v) === 2 ? ' k' : '');
          el.style.transform = tf(sq); el.innerHTML = pieceSvg(v);
          piecesEl.appendChild(el); pieceEls[sq] = el;
        }
        renderBars(); drawMarks();
      }
      const miniPiece = v => `<i class="dm-mini">${pieceSvg(v)}</i>`;
      function renderBars() {
        const cnt = DM.count(g.b);
        const capBy = side => side === 1 ? g.capW : g.capB;
        for (const who of ['cpu', 'you']) {
          const side = who === 'you' ? human() : -human();
          const n = capBy(side);
          const active = !over && g.turn === side;
          bars[who].className = 'dm-bar' + (active ? ' on' : '') + (active && who === 'cpu' ? ' think' : '');
          bars[who].innerHTML = `${miniPiece(side)}<b>${who === 'you' ? s('you') : s('cpu')}</b><small class="dm-lvl">${who === 'cpu' ? s(cfg.diff) : (side === 1 ? s('white') : s('black'))}</small>
            <span class="dm-caps" title="${s('captured')}">${n ? `<span class="dm-capstack">${Array.from({ length: Math.min(n, 4) }, () => miniPiece(-side)).join('')}</span>` : ''}<em>×${n}</em></span>
            <span class="dm-left">${side === 1 ? cnt.w : cnt.b}</span>`;
        }
        chip.textContent = `🤖 ${s(cfg.diff)} · ${human() === 1 ? '⚪ ' + s('white') : '⚫ ' + s('black')}`;
        const r = d.stats[cfg.diff] || { w: 0, d: 0, l: 0 };
        recEl.textContent = `${s('record')}: ${r.w} – ${r.d} – ${r.l}`;
        bUndo.disabled = over || !snaps.length;
        bHint.disabled = over;
      }
      const mark = (sq, cls) => `<div class="dm-mk ${cls}" style="transform:${tf(sq)}"></div>`;
      function drawMarks() {
        const out = [];
        Object.values(pieceEls).forEach(el => el.classList.remove('taken'));
        if (g.last) { out.push(mark(g.last.from, 'last')); if (g.last.to !== g.last.from) out.push(mark(g.last.to, 'last')); }
        if (hint) { hint.path.forEach((sq, i) => out.push(mark(sq, 'hint' + (i === 0 ? ' from' : '')))); }
        if (humanTurn() && !busy) {
          const forced = legalNow.length && legalNow[0].caps.length;
          if (sel == null && forced) [...new Set(legalNow.map(m => m.from))].forEach(sq => out.push(mark(sq, 'force')));
          if (sel != null) {
            out.push(mark(sel, 'sel'));
            const k = prefix.length;
            const nexts = [...new Set(cands.map(m => m.path[k]).filter(x => x !== undefined))];
            const fins = [...new Set(cands.map(m => m.to))].filter(x => !nexts.includes(x));
            nexts.forEach(sq => out.push(mark(sq, 'dot' + (forced ? ' cap' : ''))));
            fins.forEach(sq => out.push(mark(sq, 'dot fin')));
            prefix.slice(1).forEach(sq => out.push(mark(sq, 'trail')));
            if (k > 1) cands[0].caps.slice(0, k - 1).forEach(c => pieceEls[c] && pieceEls[c].classList.add('taken'));
          }
        }
        marksEl.innerHTML = out.join('');
      }
      function status() {
        if (over) return;
        if (g.turn === human()) {
          if (sel != null && prefix.length > 1) ui.msg(s('continueJump'), 'accent');
          else if (legalNow.length && legalNow[0].caps.length) ui.msg(s('mustCapture'), 'bad');
          else ui.msg(s('yourTurn'), 'accent');
        } else ui.msg(s('cpuThinks'));
      }

      // ---- animation ----
      const anim = (el, kf, o) => el.animate ? new Promise(res => { const a = el.animate(kf, o); a.onfinish = res; a.oncancel = res; later(() => { if (a.playState !== 'finished') a.cancel(); res(); }, (o.duration || 0) + 90); }) : Promise.resolve();
      async function animateMove(m, startTf) {
        const el = pieceEls[m.from]; if (!el) return;
        el.classList.add('moving');
        let cur = startTf || tf(m.from);
        const pr = m.piece > 0 ? 0 : 7;
        let crowned = Math.abs(m.piece) === 2;
        for (let i = 1; i < m.path.length; i++) {
          const nxt = tf(m.path[i]);
          const dist = Math.abs((m.path[i] >> 3) - (m.path[i - 1] >> 3)) || 1;
          const dur = Math.min(430, 150 + 42 * dist);
          const cap = m.caps.length > 0;
          const svg = el.querySelector('svg');
          if (cap && svg && svg.animate) svg.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)', offset: .45 }, { transform: 'scale(1)' }], { duration: dur, easing: 'ease-in-out' });
          await anim(el, [{ transform: cur }, { transform: nxt }], { duration: dur, easing: cap ? 'cubic-bezier(.45,.05,.35,1)' : 'cubic-bezier(.3,.7,.25,1)' });
          el.style.transform = nxt; cur = nxt;
          if (cap) {
            const ce = pieceEls[m.caps[i - 1]]; if (ce) ce.classList.add('taken');
            ctx.sound('tap');
          }
          if (!crowned && (m.path[i] >> 3) === pr) {
            crowned = true; el.classList.add('k'); el.innerHTML = pieceSvg(m.piece * 2);
            const cr = el.querySelector('.dm-crown'); if (cr && cr.animate) cr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
            el.classList.add('promo'); ctx.sound('bell');
          }
          if (i < m.path.length - 1) await new Promise(r => later(r, 40));
        }
        if (m.caps.length) {
          ctx.sound('pop');
          await Promise.all(m.caps.map(c => pieceEls[c] ? anim(pieceEls[c], [{ opacity: .45, transform: tf(c) + ' scale(1)' }, { opacity: 0, transform: tf(c) + ' scale(.35)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' }) : null));
        } else ctx.sound('place');
      }

      // ---- flow ----
      function snapshot() { return { b: DM.toStr(g.b), turn: g.turn, quiet: g.quiet, keys: g.keys.slice(), capW: g.capW, capB: g.capB, last: g.last, ply: g.ply }; }
      function restore(sn) { g = { b: DM.fromStr(sn.b), turn: sn.turn, quiet: sn.quiet, keys: sn.keys.slice(), capW: sn.capW, capB: sn.capB, last: sn.last, ply: sn.ply || 0 }; }
      function save() {
        if (over) delete d.save;
        else d.save = { cfg: Object.assign({}, cfg), game: snapshot(), undo: snaps.slice(-20), freeUndo };
        d.cfg = cfg; ctx.save();
      }
      function clearSel() { sel = null; prefix = []; cands = []; }

      async function doMove(m, startTf) {
        busy = true; hint = null;
        if (g.turn === human()) { snaps.push(snapshot()); if (snaps.length > 20) snaps.shift(); }
        clearSel(); drawMarks();
        const gg = gen;
        await animateMove(m, startTf);
        if (gg !== gen) return;
        DM.applyGame(g, m);
        save(); render();
        busy = false;
        afterMove();
      }
      function afterMove() {
        const stt = DM.status(g);
        if (stt.over) return finish(stt);
        legalNow = stt.moves;
        renderBars(); drawMarks(); status();
        if (g.turn !== human()) cpuTurn();
      }
      function cpuTurn() {
        busy = true; renderBars(); drawMarks(); status();
        later(() => {
          const t0 = Date.now();
          const res = DM.search(g.b, g.turn, cfg.diff);
          later(() => doMove(res.move), Math.max(0, 380 - (Date.now() - t0)));
        }, 80);
      }
      function doResign() {
        if (over) return;
        if (!g || !g.ply) { ctx.toast(s('notStarted')); return; }
        Kit.confirm(s('resignQ'), () => {
          if (over) return;
          gen++; timers.forEach(clearTimeout); timers.clear(); busy = false;
          finish({ winner: -human(), reason: 'resign' });
        });
      }
      function finish(stt) {
        over = true; busy = false; legalNow = [];
        clearSel();
        const rec = d.stats[cfg.diff] = d.stats[cfg.diff] || { w: 0, d: 0, l: 0 };
        let res, stars = 0, title, line;
        if (stt.winner === human()) {
          res = 'win'; stars = STARS[cfg.diff]; title = s('winTitle'); line = s('winText'); rec.w++;
          ctx.badge('checkers_win'); if (cfg.diff === 'hard') ctx.badge('checkers_hard');
        } else if (stt.winner === -human()) { res = 'lose'; title = s('loseTitle'); line = stt.reason === 'resign' ? s('resignText') : s('loseText'); rec.l++; }
        else { res = 'draw'; stars = Math.round(STARS[cfg.diff] / 2); line = stt.reason === 'quiet' ? s('drawQuiet') : s('drawRep'); rec.d++; }
        ui.msg(title || Kit.t('draw'), res === 'win' ? 'good' : res === 'lose' ? 'bad' : '');
        save(); renderBars(); drawMarks();
        later(() => Kit.result(ctx, { result: res, title, lines: [line, s('inMoves', { n: Math.ceil(g.ply / 2) })], stars, onAgain: () => newGame() }), 700);
      }

      // ---- input ----
      function onSquare(sq, startTf) {
        if (!humanTurn() || busy || sq < 0) return;
        const v = g.b[sq];
        if (sel != null) {
          const k = prefix.length;
          const step = cands.filter(m => m.path[k] === sq);
          if (step.length) {
            prefix.push(sq); cands = step;
            if (cands.length === 1) return commit(cands[0], startTf);
            ctx.sound('tap'); drawMarks(); status(); return;
          }
          const fin = cands.filter(m => m.to === sq);
          if (fin.length === 1) return commit(fin[0], startTf);
          if (fin.length > 1) { cands = fin; ui.msg(s('choosePath'), 'accent'); drawMarks(); return; }
        }
        if (v * human() > 0) {
          const ms = legalNow.filter(m => m.from === sq);
          if (ms.length) { if (sel === sq && prefix.length === 1) { clearSel(); drawMarks(); status(); return; } sel = sq; prefix = [sq]; cands = ms; ctx.sound('tap'); drawMarks(); status(); return; }
          ctx.sound('bad');
          if (legalNow.length && legalNow[0].caps.length) {
            ui.msg(s('mustCapture'), 'bad');
            const fr = new Set(legalNow.map(m => m.from));
            fr.forEach(f => { const el = pieceEls[f]; if (el) { el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); } });
          }
        }
        clearSel(); drawMarks(); status();
      }
      function commit(m, startTf) {
        // a drag that ends on the target of a one-step move continues from where the piece was dropped
        doMove(m, m.path.length === 2 ? startTf : null);
      }

      let drag = null;
      boardEl.addEventListener('pointerdown', e => {
        if (!humanTurn() || busy) return;
        const sq = sqFromPoint(e.clientX, e.clientY); if (sq < 0) return;
        try { boardEl.setPointerCapture(e.pointerId); } catch (_) { }
        const own = g.b[sq] * human() > 0 && legalNow.some(m => m.from === sq);
        drag = { id: e.pointerId, sq, x: e.clientX, y: e.clientY, moved: false, own };
      });
      boardEl.addEventListener('pointermove', e => {
        if (!drag || drag.id !== e.pointerId || !drag.own) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 7) return;
        const el = pieceEls[drag.sq]; if (!el) return;
        if (!drag.moved) {
          drag.moved = true;
          if (sel !== drag.sq) { sel = drag.sq; prefix = [drag.sq]; cands = legalNow.filter(m => m.from === drag.sq); drawMarks(); }
          el.classList.add('drag');
        }
        const rc = boardEl.getBoundingClientRect(), cell = rc.width / 8;
        const px = e.clientX - rc.left - cell / 2, py = e.clientY - rc.top - cell / 2;
        el.style.transform = `translate(${px}px, ${py}px)`;
        drag.tf = el.style.transform;
      });
      const endDrag = (e, cancel) => {
        if (!drag || drag.id !== e.pointerId) return;
        const dr = drag; drag = null;
        const target = cancel ? -1 : sqFromPoint(e.clientX, e.clientY);
        if (!dr.moved) { onSquare(target); return; }
        const el = pieceEls[dr.sq];
        if (el) el.classList.remove('drag');
        const ok = target >= 0 && target !== dr.sq && cands.some(m => m.path[1] === target || m.to === target);
        if (ok) { onSquare(target, dr.tf); return; }
        if (el) { if (el.animate) el.animate([{ transform: dr.tf }, { transform: tf(dr.sq) }], { duration: 180, easing: 'ease-out' }); el.style.transform = tf(dr.sq); }
      };
      boardEl.addEventListener('pointerup', e => endDrag(e, false));
      boardEl.addEventListener('pointercancel', e => endDrag(e, true));

      // ---- tools ----
      async function doHint() {
        if (over || busy || !humanTurn()) return;
        const ok = await Kit.useHelp(ctx, 'hint'); if (!ok || over || busy || !humanTurn()) return;
        busy = true; ui.msg(s('thinking')); drawMarks();
        later(() => {
          const res = DM.search(g.b, g.turn, 'hard', { time: 700 });
          busy = false;
          if (!res.move) return;
          hint = res.move;
          sel = res.move.from; prefix = [sel]; cands = legalNow.filter(m => m.from === sel);
          drawMarks();
          ui.msg(s('hintMove', { m: DM.notation(res.move) }), 'good');
        }, 40);
      }
      async function doUndo() {
        if (over || busy) return;
        if (!snaps.length) { ctx.toast(s('noUndo')); return; }
        if (freeUndo) { freeUndo = false; ctx.toast(s('undoFree')); }
        else { const ok = await Kit.useHelp(ctx, 'undo'); if (!ok || over || busy) return; }
        restore(snaps.pop());
        hint = null; clearSel();
        ctx.sound('whoosh');
        render(); save(); afterMove();
      }

      function newGame(fromSave) {
        gen++; timers.forEach(clearTimeout); timers.clear();
        over = false; busy = false; hint = null; clearSel();
        if (fromSave) {
          restore(fromSave.game); snaps = (fromSave.undo || []).slice(); freeUndo = fromSave.freeUndo !== false;
        } else {
          DM.clearTT(); g = DM.newGame(); snaps = []; freeUndo = true;
        }
        renderLabels(); render(); save();
        afterMove();
      }

      function openSetup() {
        const tmp = Object.assign({}, cfg);
        const m = UI.modal({
          title: s('setupTitle'),
          html: `<div class="dm-setup"><label>${s('difficulty')}</label><div data-k="diff"></div><label>${s('color')}</label><div data-k="color"></div></div>`,
          actions: [{ label: s('cancel'), cls: 'btn-ghost' }, { label: s('start'), cls: 'btn-primary', onClick: () => { cfg = tmp; d.cfg = cfg; newGame(); } }]
        });
        const put = (k, el) => { const h = m.box.querySelector(`[data-k="${k}"]`); h.innerHTML = ''; h.appendChild(el); };
        put('diff', Kit.segmented(['easy', 'medium', 'hard'].map(id => ({ id, label: s(id) })), tmp.diff, v => { tmp.diff = v; }).el);
        put('color', Kit.segmented([{ id: '1', label: '⚪ ' + s('white') }, { id: '-1', label: '⚫ ' + s('black') }], String(tmp.color), v => { tmp.color = +v; }).el);
      }

      if (d.save && d.save.game) {
        cfg = Object.assign(cfg, d.save.cfg || {});
        try { newGame(d.save); } catch (e) { newGame(); }
      } else newGame();

      root.__game = {
        state: () => ({ board: DM.toStr(g.b), turn: g.turn, human: human(), over, busy, quiet: g.quiet, capW: g.capW, capB: g.capB, legal: legalNow.map(DM.notation) }),
        legal: () => legalNow.map(DM.notation),
        move: (note) => { const m = legalNow.find(x => DM.notation(x) === note); if (m && humanTurn() && !busy) { doMove(m); return true; } return false; },
        setPosition: (rowsOrStr, turn = 1) => { gen++; timers.forEach(clearTimeout); timers.clear(); over = false; busy = false; hint = null; clearSel(); const b = Array.isArray(rowsOrStr) ? DM.fromRows(rowsOrStr) : DM.fromStr(rowsOrStr); g = { b, turn, quiet: 0, keys: [DM.keyOf(b, turn)], capW: 0, capB: 0, last: null, ply: 0 }; snaps = []; render(); afterMove(); },
        newGame: (o) => { if (o) cfg = Object.assign(cfg, o); newGame(); },
        engine: DM
      };

      return {
        destroy() {
          gen++; timers.forEach(clearTimeout); timers.clear();
          piecesEl.getAnimations && piecesEl.getAnimations({ subtree: true }).forEach(a => a.cancel());
          delete root.__game;
        }
      };
    }
  });
})();
