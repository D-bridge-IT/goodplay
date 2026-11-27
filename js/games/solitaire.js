// Klondike Solitaire (Solitär / Пасьянс «Косынка») for GoodPlay.
// Part 1 is a pure rules engine (no DOM) that Node can require for tests.
// Part 2 is the UI: SVG cards, drag & drop, tap-to-move, undo/hint via Kit, auto-complete,
// Windows-style scoring, the bouncing-cards win celebration and save/resume in ctx.data.
(function () {
  'use strict';

  /* ======================================================================
   * Engine — cards are integers 0..51: suit = c / 13 (0 ♠, 1 ♥, 2 ♦, 3 ♣), rank = c % 13 + 1.
   * State: { draw, seed, stock[], waste[], found[4][], tab[7][], down[7], pass, score, moves }
   * stock/waste/found/tab arrays have their top card LAST. down[p] = number of face-down
   * cards at the bottom of tableau pile p. Moves never mutate: they return a new state.
   * ==================================================================== */
  const E = (function () {
    const suitOf = c => (c / 13) | 0;
    const rankOf = c => (c % 13) + 1;
    const isRed = c => { const s = suitOf(c); return s === 1 || s === 2; };

    function rng(seed) {
      let a = seed >>> 0;
      return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }

    function deal(draw, seed) {
      if (seed == null) seed = (Math.random() * 2 ** 31) >>> 0;
      const r = rng(seed); const deck = [];
      for (let i = 0; i < 52; i++) deck.push(i);
      for (let i = 51; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      const tab = [], down = []; let k = 0;
      for (let p = 0; p < 7; p++) { tab.push(deck.slice(k, k + p + 1)); k += p + 1; down.push(p); }
      return { draw: draw === 3 ? 3 : 1, seed, stock: deck.slice(k), waste: [], found: [[], [], [], []], tab, down, pass: 1, score: 0, moves: 0 };
    }

    function clone(s) {
      return { draw: s.draw, seed: s.seed, stock: s.stock.slice(), waste: s.waste.slice(), found: s.found.map(f => f.slice()), tab: s.tab.map(t => t.slice()), down: s.down.slice(), pass: s.pass, score: s.score, moves: s.moves };
    }

    const MAX_PASSES_DRAW1 = 3;
    const maxPasses = s => s.draw === 1 ? MAX_PASSES_DRAW1 : Infinity;
    const canRecycle = s => !s.stock.length && s.waste.length > 0 && s.pass < maxPasses(s);
    const canDraw = s => s.stock.length > 0 || canRecycle(s);

    function canTab(s, c, p) {
      const t = s.tab[p]; if (!t) return false;
      if (!t.length) return rankOf(c) === 13;
      const top = t[t.length - 1];
      return isRed(top) !== isRed(c) && rankOf(top) === rankOf(c) + 1;
    }
    function canFound(s, c, f) {
      const fd = s.found[f]; if (!fd) return false;
      if (!fd.length) return rankOf(c) === 1;
      const top = fd[fd.length - 1];
      return suitOf(top) === suitOf(c) && rankOf(c) === rankOf(top) + 1;
    }
    // Best foundation slot for a card (aces prefer the slot of their own suit when it is free).
    function foundFor(s, c) {
      if (rankOf(c) === 1) {
        if (!s.found[suitOf(c)].length) return suitOf(c);
        for (let f = 0; f < 4; f++) if (!s.found[f].length) return f;
        return -1;
      }
      for (let f = 0; f < 4; f++) if (canFound(s, c, f)) return f;
      return -1;
    }

    // Cards picked up by a source: {from:'waste'} | {from:'found', f} | {from:'tab', p, i}
    function cardsOf(s, src) {
      if (!src) return [];
      if (src.from === 'waste') return s.waste.length ? [s.waste[s.waste.length - 1]] : [];
      if (src.from === 'found') { const f = s.found[src.f]; return f && f.length ? [f[f.length - 1]] : []; }
      if (src.from === 'tab') {
        const t = s.tab[src.p];
        if (!t || src.i < s.down[src.p] || src.i >= t.length) return [];
        const run = t.slice(src.i);
        for (let k = 1; k < run.length; k++) if (isRed(run[k]) === isRed(run[k - 1]) || rankOf(run[k]) !== rankOf(run[k - 1]) - 1) return [];
        return run;
      }
      return [];
    }

    function canMove(s, src, dst) {
      const cards = cardsOf(s, src); if (!cards.length || !dst) return false;
      if (dst.to === 'found') {
        if (src.from === 'found') return false;
        return cards.length === 1 && canFound(s, cards[0], dst.f);
      }
      if (dst.to === 'tab') {
        if (src.from === 'tab' && src.p === dst.p) return false;
        return canTab(s, cards[0], dst.p);
      }
      return false;
    }

    // Windows standard scoring.
    const PTS = { wasteTab: 5, wasteFound: 10, tabFound: 10, flip: 5, foundTab: -15, recycle1: -100, recycle3: -20 };

    function move(s, src, dst) {
      if (!canMove(s, src, dst)) return null;
      const cards = cardsOf(s, src); const n = clone(s);
      if (src.from === 'waste') n.waste.pop();
      else if (src.from === 'found') n.found[src.f].pop();
      else n.tab[src.p].length = src.i;
      if (dst.to === 'found') n.found[dst.f].push(cards[0]); else n.tab[dst.p].push(...cards);
      let pts = 0;
      if (src.from === 'waste') pts = dst.to === 'found' ? PTS.wasteFound : PTS.wasteTab;
      else if (src.from === 'tab' && dst.to === 'found') pts = PTS.tabFound;
      else if (src.from === 'found' && dst.to === 'tab') pts = PTS.foundTab;
      if (src.from === 'tab') {
        const t = n.tab[src.p];
        if (t.length && n.down[src.p] >= t.length) { n.down[src.p] = t.length - 1; pts += PTS.flip; }
      }
      n.score = Math.max(0, n.score + pts); n.moves++;
      return n;
    }

    // Turn 1 or 3 cards from the stock, or recycle the waste when the stock is empty.
    function draw(s) {
      const n = clone(s);
      if (n.stock.length) {
        const k = Math.min(n.draw, n.stock.length);
        for (let i = 0; i < k; i++) n.waste.push(n.stock.pop());
      } else if (canRecycle(n)) {
        n.stock = n.waste.reverse(); n.waste = []; n.pass++;
        if (n.draw === 1) n.score = Math.max(0, n.score + PTS.recycle1);
        else if (n.pass > 3) n.score = Math.max(0, n.score + PTS.recycle3);
      } else return null;
      n.moves++;
      return n;
    }

    const isWon = s => s.found.every(f => f.length === 13);
    const allUp = s => s.down.every(d => d === 0);

    function sources(s) {
      const out = [];
      if (s.waste.length) out.push({ from: 'waste' });
      for (let f = 0; f < 4; f++) if (s.found[f].length) out.push({ from: 'found', f });
      for (let p = 0; p < 7; p++) for (let i = s.down[p]; i < s.tab[p].length; i++) if (cardsOf(s, { from: 'tab', p, i }).length) out.push({ from: 'tab', p, i });
      return out;
    }
    function legalMoves(s) {
      const out = [];
      for (const src of sources(s)) {
        for (let f = 0; f < 4; f++) { const dst = { to: 'found', f }; if (canMove(s, src, dst)) out.push({ src, dst }); }
        for (let p = 0; p < 7; p++) { const dst = { to: 'tab', p }; if (canMove(s, src, dst)) out.push({ src, dst }); }
      }
      return out;
    }

    // Moves worth suggesting, best first. Pointless shuffles (a bottom king to an empty column,
    // moving part of a run without gaining anything) are left out.
    function useful(s) {
      const out = [];
      for (const m of legalMoves(s)) {
        const { src, dst } = m; let pri = 0;
        if (dst.to === 'found') pri = 100;
        else if (src.from === 'waste') pri = 70;
        else if (src.from === 'tab') {
          const destEmpty = !s.tab[dst.p].length;
          if (src.i === s.down[src.p] && s.down[src.p] > 0) pri = 80;                 // reveals a face-down card
          else if (src.i === 0) pri = destEmpty ? 0 : 50;                              // empties a column
          else if (src.i > s.down[src.p]) {                                            // partial run: only if it frees a foundation card
            const under = s.tab[src.p][src.i - 1];
            if (foundFor(s, under) >= 0) pri = 45;
          }
        }
        if (pri > 0) out.push({ src, dst, pri });
      }
      out.sort((a, b) => b.pri - a.pri);
      return out;
    }

    function hintMove(s) {
      const u = useful(s);
      if (u.length) return u[0];
      if (canDraw(s)) return { draw: true };
      return null;
    }

    // Where a tapped card should go: foundation first, then a non-empty pile, then an empty one.
    function tapTarget(s, src) {
      const cards = cardsOf(s, src); if (!cards.length) return null;
      if (cards.length === 1 && src.from !== 'found') { const f = foundFor(s, cards[0]); if (f >= 0) return { to: 'found', f }; }
      let empty = null;
      for (let p = 0; p < 7; p++) {
        const dst = { to: 'tab', p };
        if (!canMove(s, src, dst)) continue;
        if (s.tab[p].length) return dst;
        if (!empty && !(src.from === 'tab' && src.i === 0)) empty = dst;
      }
      return empty;
    }

    // Greedy plan that finishes the game using foundation moves and the stock; null if it cannot.
    function autoPlan(s) {
      let n = clone(s); const steps = []; let idle = 0, guard = 0;
      while (!isWon(n) && guard++ < 3000) {
        let best = null, bestRank = 99;
        const consider = src => { const c = cardsOf(n, src)[0]; if (c == null) return; const f = foundFor(n, c); if (f >= 0 && rankOf(c) < bestRank) { best = { src, dst: { to: 'found', f } }; bestRank = rankOf(c); } };
        if (n.waste.length) consider({ from: 'waste' });
        for (let p = 0; p < 7; p++) if (n.tab[p].length && n.down[p] < n.tab[p].length) consider({ from: 'tab', p, i: n.tab[p].length - 1 });
        if (best) { n = move(n, best.src, best.dst); steps.push(best); idle = 0; continue; }
        if (canDraw(n) && idle <= n.stock.length + n.waste.length + 2) { n = draw(n); steps.push({ draw: true }); idle++; continue; }
        break;
      }
      return isWon(n) ? steps : null;
    }

    // True when nothing sensible is left: no useful move now and no waste card that would ever play.
    function isStuck(s) {
      if (isWon(s) || useful(s).length) return false;
      let n = clone(s); const lim = n.stock.length + n.waste.length + 3;
      for (let k = 0; k <= lim; k++) {
        if (n.waste.length) {
          const src = { from: 'waste' };
          for (let f = 0; f < 4; f++) if (canMove(n, src, { to: 'found', f })) return false;
          for (let p = 0; p < 7; p++) if (canMove(n, src, { to: 'tab', p })) return false;
        }
        const d = draw(n); if (!d) break; n = d;
      }
      return true;
    }

    // Sanity check for restored saves: 52 distinct cards and coherent face-down counts.
    function valid(s) {
      try {
        if (!s || !Array.isArray(s.stock) || !Array.isArray(s.waste) || s.found.length !== 4 || s.tab.length !== 7 || s.down.length !== 7) return false;
        const all = [].concat(s.stock, s.waste, ...s.found, ...s.tab);
        if (all.length !== 52 || new Set(all).size !== 52 || all.some(c => !(c >= 0 && c < 52))) return false;
        for (let p = 0; p < 7; p++) if (s.down[p] < 0 || (s.tab[p].length && s.down[p] >= s.tab[p].length) || (!s.tab[p].length && s.down[p])) return false;
        return true;
      } catch (e) { return false; }
    }

    return { suitOf, rankOf, isRed, rng, deal, clone, canRecycle, canDraw, canTab, canFound, foundFor, cardsOf, canMove, move, draw, isWon, allUp, legalMoves, useful, hintMove, tapTarget, autoPlan, isStuck, valid, maxPasses, PTS, MAX_PASSES_DRAW1 };
  })();

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
  if (typeof Games === 'undefined' || typeof Kit === 'undefined') return;

  /* ======================================================================
   * Card graphics (SVG strings, no external assets)
   * ==================================================================== */
  const COL = ['#1c2530', '#d1293f', '#d1293f', '#1c2530'];
  const TINT = ['#eef1f5', '#fdecef', '#fdecef', '#eef1f5'];
  const GOLD = '#e8b54a', GOLD_D = '#8d6414';
  const FONT = "Inter, 'Segoe UI', Roboto, -apple-system, Helvetica, Arial, sans-serif";
  const labels = () => LANG === 'ru'
    ? ['Т', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К']
    : ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K'];

  const SUIT_D = [
    'M50 6C41 22 8 40 8 62c0 13 10 22 22 22 8 0 14-3 18-9-1 9-5 16-13 21h30c-8-5-12-12-13-21 4 6 10 9 18 9 12 0 22-9 22-22C92 40 59 22 50 6z',
    'M50 90C22 68 6 52 6 32 6 17 17 7 30 7c9 0 16 5 20 12 4-7 11-12 20-12 13 0 24 10 24 25 0 20-16 36-44 58z',
    'M50 4C62 22 76 36 92 50 76 64 62 78 50 96 38 78 24 64 8 50 24 36 38 22 50 4z'
  ];
  function suitSvg(s, x, y, size, color) {
    const tr = `transform="translate(${x} ${y}) scale(${size / 100})"`;
    if (s === 3) return `<g ${tr} fill="${color}"><circle cx="50" cy="28" r="20"/><circle cx="27" cy="57" r="20"/><circle cx="73" cy="57" r="20"/><path d="M40 44h20v18H40z"/><path d="M46 58c0 17-5 28-14 36h36c-9-8-14-19-14-36z"/></g>`;
    return `<path ${tr} fill="${color}" d="${SUIT_D[s]}"/>`;
  }

  function courtGlyph(r, col) {
    const st = `stroke="${GOLD_D}" stroke-width="2" stroke-linejoin="round"`;
    if (r === 13) return `<path d="M24 94 20 62l15 12 15-21 15 21 15-12-4 32z" fill="${GOLD}" ${st}/><rect x="24" y="93" width="52" height="8" rx="2" fill="${GOLD}" ${st}/>` +
      `<circle cx="20" cy="60" r="4" fill="${col}"/><circle cx="50" cy="51" r="4" fill="${col}"/><circle cx="80" cy="60" r="4" fill="${col}"/><circle cx="50" cy="97" r="2.6" fill="${col}"/><circle cx="36" cy="97" r="2" fill="#fff"/><circle cx="64" cy="97" r="2" fill="#fff"/>`;
    if (r === 12) return `<path d="M22 98c8-11 48-11 56 0l-4-27c-8 8-14 6-16-4-3 8-6 0-8-12-2 12-5 20-8 12-2 10-8 12-16 4z" fill="${GOLD}" ${st}/>` +
      `<circle cx="26" cy="69" r="3.6" fill="#fff" ${st}/><circle cx="42" cy="66" r="3.2" fill="#fff" ${st}/><circle cx="50" cy="53" r="4.4" fill="${col}"/><circle cx="58" cy="66" r="3.2" fill="#fff" ${st}/><circle cx="74" cy="69" r="3.6" fill="#fff" ${st}/><path d="M34 89q16-6 32 0" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
    // Jack: plumed cap
    return `<path d="M60 80C66 62 80 54 88 49c-3 13-10 24-22 34z" fill="${col}" opacity=".9"/><path d="M27 92q23-34 46 0z" fill="${GOLD}" ${st}/><rect x="20" y="90" width="60" height="9" rx="4.5" fill="${GOLD}" ${st}/><circle cx="50" cy="72" r="4" fill="${col}"/>`;
  }

  // Face of card c as an <svg> (viewBox 100×140). full=true adds the white card body (for images/art).
  function cardSvg(c, attrs, full) {
    const s = E.suitOf(c), r = E.rankOf(c), col = COL[s], lab = labels()[r - 1];
    const two = lab.length > 1;
    let body = `<text x="${two ? 5 : 8}" y="31" font-family="${FONT}" font-size="${two ? 27 : 31}" font-weight="800" fill="${col}" letter-spacing="${two ? -2 : 0}">${lab}</text>` + suitSvg(s, 71, 9, 22, col);
    if (r === 1) body += `<circle cx="50" cy="86" r="32" fill="none" stroke="${col}" stroke-opacity=".18" stroke-width="2"/>` + suitSvg(s, 25, 61, 50, col);
    else if (r > 10) body += `<rect x="12" y="42" width="76" height="90" rx="8" fill="${TINT[s]}" stroke="${col}" stroke-opacity=".3" stroke-width="1.5"/><rect x="16" y="46" width="68" height="82" rx="6" fill="none" stroke="${col}" stroke-opacity=".14"/>` + courtGlyph(r, col) + suitSvg(s, 41, 106, 18, col);
    else body += suitSvg(s, 28, 62, 44, col);
    const bg = full ? `<rect x="1.5" y="1.5" width="97" height="137" rx="10" fill="#fff" stroke="#cbd3dc" stroke-width="2"/>` : '';
    return `<svg ${attrs || ''} viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">${bg}${body}</svg>`;
  }
  // Card back for the hub art (the in-game back is CSS).
  function backSvg(attrs, id) {
    return `<svg ${attrs} viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#2e7d5b"/><path d="M0 0h10M0 0v10" stroke="#6cc39b" stroke-width="2" opacity=".55"/></pattern></defs>` +
      `<rect x="1.5" y="1.5" width="97" height="137" rx="10" fill="#fff" stroke="#cbd3dc" stroke-width="2"/><rect x="7" y="7" width="86" height="126" rx="7" fill="url(#${id})"/>` +
      `<circle cx="50" cy="70" r="17" fill="#2e7d5b" stroke="#fff" stroke-opacity=".7" stroke-width="2"/><path d="M50 80c-7-5-11-9-11-13.5a5.3 5.3 0 0 1 11-2.6 5.3 5.3 0 0 1 11 2.6C61 71 57 75 50 80z" fill="#fff"/></svg>`;
  }

  const ICON = {
    neu: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    hint: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.8 10.6c.6.6.8 1.3.8 2.4h6c0-1.1.2-1.8.8-2.4A6 6 0 0 0 12 3z"/>',
    auto: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    rules: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/><path d="M9 7.5h6M9 11h4"/>'
  };
  const icon = k => `<span class="ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg></span>`;

  const RULES = {
    de: `<ul>
      <li><b>Ziel:</b> alle 52 Karten nach Farbe von Ass bis König auf die vier Ablagen oben rechts legen.</li>
      <li>Im Tableau legst du absteigend und abwechselnd Rot/Schwarz an, z. B. eine schwarze 7 auf eine rote 8. Geordnete Reihen ziehst du gemeinsam.</li>
      <li>Auf eine freie Spalte darf nur ein König (oder eine Reihe mit König).</li>
      <li>Tippe auf den Stapel oben links, um 1 bzw. 3 Karten aufzudecken. <b>Ziehen 1:</b> höchstens 3 Durchgänge. <b>Ziehen 3:</b> unbegrenzt.</li>
      <li><b>Bedienung:</b> Karten ziehen und ablegen · antippen = bester Zug (Ablage zuerst) · Doppeltipp = auf die Ablage.</li>
      <li><b>Punkte (Windows-Wertung):</b> Stapel → Tableau +5, auf die Ablage +10, Karte aufdecken +5, Ablage → Tableau −15, neuer Durchgang −100 (Ziehen 1) bzw. −20 ab dem 4. Durchgang (Ziehen 3), −2 je 10 Sekunden. Beim Sieg gibt es einen Zeitbonus.</li>
      <li>3× „Zurück“ pro Spiel sind gratis, danach gegen Tipp oder Anzeige. Sind alle Karten aufgedeckt, legt „Auto“ den Rest ab.</li></ul>`,
    ru: `<ul>
      <li><b>Цель:</b> разложить все 52 карты по мастям от туза до короля в четыре «дома» справа вверху.</li>
      <li>В раскладе карты кладутся по убыванию с чередованием цвета: чёрная 7 на красную 8. Упорядоченные ряды переносятся целиком.</li>
      <li>На пустую колонку можно положить только короля (или ряд, начинающийся с короля).</li>
      <li>Нажми на колоду слева вверху, чтобы открыть 1 или 3 карты. <b>По 1:</b> не больше 3 кругов. <b>По 3:</b> без ограничений.</li>
      <li><b>Управление:</b> перетаскивание · нажатие = лучший ход (сначала в дом) · двойное нажатие = в дом.</li>
      <li><b>Очки (как в Windows):</b> колода → расклад +5, в дом +10, открыть карту +5, из дома в расклад −15, новый круг −100 (по 1) или −20 начиная с 4-го круга (по 3), −2 за каждые 10 секунд. За победу — бонус за время.</li>
      <li>3 отмены за партию бесплатно, дальше — за подсказку или рекламу. Когда все карты открыты, кнопка «Авто» доиграет сама.</li></ul>`
  };

  const s = Kit.strings({
    de: {
      draw1: 'Ziehen 1', draw3: 'Ziehen 3', auto: 'Auto', pass: 'Durchgang {n}/3', passInf: 'Durchgang {n}', free: '{n} frei', adUndo: 'per Tipp',
      noMoves: 'Keine sinnvollen Züge mehr.', noMovesSub: 'Mach einen Zug rückgängig oder starte ein neues Spiel.', keep: 'Weiterspielen',
      noRecycle: 'Keine Durchgänge mehr', hintDraw: 'Tipp: Karte vom Stapel aufdecken', changeMode: 'Spielart wechseln? Das laufende Spiel wird abgebrochen.',
      lineScore: 'Punkte: {n}', lineBonus: 'davon Zeitbonus: +{n}', lineTime: 'Zeit {t} · {m} Züge', record: 'Neuer Rekord!', mode1: 'Ziehen 1', mode3: 'Ziehen 3', tapSkip: 'Tippen zum Überspringen'
    },
    ru: {
      draw1: 'По 1', draw3: 'По 3', auto: 'Авто', pass: 'Круг {n}/3', passInf: 'Круг {n}', free: '{n} беспл.', adUndo: 'за подсказку',
      noMoves: 'Полезных ходов больше нет.', noMovesSub: 'Отмени ход или начни новую партию.', keep: 'Играть дальше',
      noRecycle: 'Круги закончились', hintDraw: 'Подсказка: открой карту из колоды', changeMode: 'Сменить режим? Текущая партия будет прервана.',
      lineScore: 'Очки: {n}', lineBonus: 'из них бонус за время: +{n}', lineTime: 'Время {t} · ходов: {m}', record: 'Новый рекорд!', mode1: 'По 1', mode3: 'По 3', tapSkip: 'Нажми, чтобы пропустить'
    }
  });

  const FREE_UNDO = 3;
  const STARS = { 1: 15, 3: 25 };

  Games.register({
    id: 'solitaire', icon: '🃏', partner: 'p5', tier: 'top', isNew: true,
    name: { de: 'Solitär', ru: 'Пасьянс «Косынка»' },
    tagline: { de: 'Klondike mit Ziehen 1 oder 3 – der Kartenklassiker, frisch gelegt.', ru: 'Классическая «Косынка»: сдача по одной или по три карты.' },
    kicker: { de: 'Der Kartenklassiker', ru: 'Карточная классика' },
    badges: [
      { id: 'solitaire_win', icon: '🃏', name: { de: 'Solitär gelegt', ru: 'Пасьянс сошёлся' } },
      { id: 'solitaire_draw3', icon: '🎴', name: { de: 'Meister „Ziehen 3“', ru: 'Мастер «по 3»' } }
    ],

    thumb() {
      return `<defs><linearGradient id="soThBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a9b74"/><stop offset="1" stop-color="#14523b"/></linearGradient></defs>
        <rect width="160" height="80" fill="url(#soThBg)"/>
        <circle cx="136" cy="14" r="26" fill="#fff" opacity=".07"/><circle cx="20" cy="78" r="30" fill="#000" opacity=".08"/>
        <g transform="translate(46 22) rotate(-16)">${backSvg('x="-18" y="-4" width="36" height="50"', 'soThBk')}</g>
        <g transform="translate(80 18) rotate(-2)">${cardSvg(26 + 12, 'x="-18" y="-4" width="36" height="50"', true)}</g>
        <g transform="translate(114 22) rotate(14)">${cardSvg(0, 'x="-18" y="-4" width="36" height="50"', true)}</g>`;
    },

    art() {
      return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="soArtBg" cx="50%" cy="15%" r="95%"><stop offset="0" stop-color="#46a97f"/><stop offset=".55" stop-color="#226c50"/><stop offset="1" stop-color="#103b2c"/></radialGradient>
          <radialGradient id="soArtGl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
          <filter id="soArtSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity=".35"/></filter>
        </defs>
        <rect width="320" height="170" fill="url(#soArtBg)"/>
        <g opacity=".08" fill="#fff">${Array.from({ length: 9 }, (_, i) => `<circle cx="${20 + i * 36}" cy="${i % 2 ? 150 : 22}" r="${10 + (i % 3) * 6}"/>`).join('')}</g>
        <ellipse cx="160" cy="88" rx="120" ry="70" fill="url(#soArtGl)"/>
        <g filter="url(#soArtSh)">
          <g transform="translate(20 48)">${[0, 1, 2, 3].map(i => `<g transform="translate(0 ${i * -2})">${i < 3 ? backSvg('width="44" height="62"', 'soArtB' + i) : cardSvg(13 + 4, 'width="44" height="62"', true)}</g>`).join('')}</g>
          <g transform="translate(256 44)">${cardSvg(39, 'width="44" height="62"', true)}</g>
          <g transform="translate(160 196) rotate(-28)">${backSvg('x="-37" y="-166" width="74" height="104"', 'soArtB9')}</g>
          <g transform="translate(160 196) rotate(-10)">${cardSvg(25, 'x="-37" y="-166" width="74" height="104"', true)}</g>
          <g transform="translate(160 196) rotate(9)">${cardSvg(12, 'x="-37" y="-166" width="74" height="104"', true)}</g>
          <g transform="translate(160 196) rotate(27)">${cardSvg(0, 'x="-37" y="-166" width="74" height="104"', true)}</g>
        </g>
        <g fill="#fde68a">
          <path d="M262 122l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M58 128l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity=".8"/><path d="M290 24l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" opacity=".7"/>
        </g>
      </svg>`;
    },

    mount(root, ctx) {
      const d = ctx.data;
      d.best = d.best || {}; d.wins = d.wins || {};
      let alive = true, busy = false, won = false;
      let st = null, hist = [], undoUsed = 0, stuckShown = false;
      let lay = null, G = null;
      const timers = new Set();
      const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
      const wait = ms => new Promise(r => later(r, ms));

      const ui = Kit.shell(root, {
        theme: 'so', top: true, cls: 'so-board',
        stats: [{ id: 'score', icon: '🏅', value: 0 }, { id: 'time', icon: '⏱', value: '0:00' }, { id: 'moves', icon: '↔', value: 0 }]
      });
      const timer = Kit.timer(() => { updateStats(); });

      // --- top bar: draw mode + pass chip
      const seg = Kit.segmented([{ id: '1', label: s('draw1') }, { id: '3', label: s('draw3') }], String(d.mode === 3 ? 3 : 1), id => {
        seg.set(String(st.draw));
        const go = () => newGame(+id);
        if (inProgress()) Kit.confirm(s('changeMode'), go); else go();
      });
      const chip = document.createElement('span'); chip.className = 'gk-chip so-chip';
      ui.top.append(seg.el, chip);

      // --- table
      const table = document.createElement('div'); table.className = 'so-table';
      ui.board.appendChild(table);
      const slots = {};
      const mkSlot = (key, cls, html) => { const el = document.createElement('div'); el.className = 'so-slot ' + (cls || ''); el.dataset.slot = key; el.innerHTML = html || ''; table.appendChild(el); slots[key] = el; return el; };
      mkSlot('stock', 'so-stock', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/></svg>');
      mkSlot('waste', 'so-waste');
      for (let f = 0; f < 4; f++) mkSlot('f' + f, 'so-found', `<svg viewBox="0 0 100 100">${suitSvg(f, 18, 18, 64, 'currentColor')}</svg>`);
      for (let p = 0; p < 7; p++) mkSlot('t' + p, 'so-tabslot', '<b>K</b>');
      const badge = document.createElement('div'); badge.className = 'so-badge'; table.appendChild(badge);

      const els = [], inners = [], flyT = [];
      for (let c = 0; c < 52; c++) {
        const el = document.createElement('div'); el.className = 'so-card down'; el.dataset.c = c;
        el.innerHTML = `<div class="so-inner"><div class="so-face">${cardSvg(c)}</div><div class="so-back"></div></div>`;
        table.appendChild(el); els.push(el); inners.push(el.firstChild);
      }

      // --- tools
      const btnNew = ui.tool(icon('neu') + Kit.t('newGame'), () => { if (busy) return; if (inProgress()) Kit.confirm(Kit.t('confirmNew'), () => newGame(st.draw)); else newGame(st.draw); });
      const btnUndo = ui.tool('', () => undo());
      const btnHint = ui.tool(icon('hint') + Kit.t('hint'), () => hint());
      const btnAuto = ui.tool(icon('auto') + s('auto'), () => autoComplete(), 'so-auto');
      ui.tool(icon('rules') + Kit.t('rules'), () => Kit.rules(Kit.t('rules') + ' · ' + L({ de: 'Solitär', ru: 'Косынка' }), RULES[LANG] || RULES.de));
      function L(o) { return o[LANG] || o.de; }

      /* ---------------- geometry & layout ---------------- */
      function availHeight(fallback) {
        const sc = root.closest('.screen');
        if (!sc) return fallback;
        const scR = sc.getBoundingClientRect(), bR = ui.board.getBoundingClientRect(), shR = ui.el.getBoundingClientRect();
        const padB = parseFloat(getComputedStyle(sc).paddingBottom) || 0;
        const top = bR.top - scR.top + sc.scrollTop;
        const below = shR.bottom - bR.bottom;
        return Math.floor(sc.clientHeight - padB - top - below - 2);
      }
      function geometry() {
        const W = table.clientWidth || 360;
        const pad = Math.max(4, Math.round(W * 0.016)), gap = Math.max(3, Math.round(W * 0.012));
        const cw = Math.floor((W - 2 * pad - 6 * gap) / 7), ch = Math.round(cw * 1.4);
        const left = Math.round((W - (7 * cw + 6 * gap)) / 2);
        const xs = []; for (let i = 0; i < 7; i++) xs.push(left + i * (cw + gap));
        const topY = pad, tabY = pad + ch + Math.round(Math.max(8, gap * 2.4));
        const minH = tabY + Math.round(ch * 3.2), maxH = tabY + ch + Math.round(ch * 0.3 * 16) + pad;
        const H = Math.max(minH, Math.min(maxH, availHeight(Math.round(W * 1.3))));
        G = { W, H, pad, gap, cw, ch, xs, topY, tabY, fan: Math.round(cw * 0.32) };
        table.style.height = H + 'px';
        table.style.setProperty('--cw', cw + 'px'); table.style.setProperty('--ch', ch + 'px');
      }

      function pileOffsets(p) {
        const n = st.tab[p].length, dn = st.down[p], up = Math.max(0, n - dn - 1);
        const avail = G.H - G.tabY - G.pad - G.ch;
        let dd = G.ch * 0.11, du = G.ch * 0.29;
        if (dn * dd + up * du > avail && up) du = Math.max(G.ch * 0.2, (avail - dn * dd) / up);
        if (dn * dd + up * du > avail && dn) dd = Math.max(G.ch * 0.05, (avail - up * du) / dn);
        if (dn * dd + up * du > avail && up) du = Math.max(2, (avail - dn * dd) / up);
        return { dd, du };
      }

      function computeLayout() {
        const L = new Array(52);
        const { xs, topY, tabY } = G;
        st.stock.forEach((c, i) => { L[c] = { x: xs[0], y: topY - Math.min(3, (i / 8) | 0), z: 1 + i, up: false }; });
        const wn = st.waste.length, vis = Math.min(st.draw === 3 ? 3 : 1, wn);
        st.waste.forEach((c, i) => { const j = i - (wn - vis); L[c] = { x: xs[1] + (j > 0 ? j * G.fan : 0), y: topY, z: 1 + i, up: true }; });
        st.found.forEach((fd, f) => fd.forEach((c, i) => { L[c] = { x: xs[3 + f], y: topY, z: 1 + i, up: true }; }));
        G.bottom = [];
        st.tab.forEach((t, p) => {
          const { dd, du } = pileOffsets(p); let y = tabY;
          t.forEach((c, i) => { L[c] = { x: xs[p], y: Math.round(y), z: 100 + i, up: i >= st.down[p] }; y += i < st.down[p] ? dd : du; });
          G.bottom[p] = t.length ? L[t[t.length - 1]].y + G.ch : tabY + G.ch;
        });
        return L;
      }

      const pos = (el, x, y) => { el.style.transform = `translate3d(${x}px,${y}px,0)`; };

      function placeSlots() {
        const { xs, topY, tabY } = G;
        pos(slots.stock, xs[0], topY); pos(slots.waste, xs[1], topY);
        for (let f = 0; f < 4; f++) pos(slots['f' + f], xs[3 + f], topY);
        for (let p = 0; p < 7; p++) pos(slots['t' + p], xs[p], tabY);
        pos(badge, xs[0] + G.cw - 12, topY - 6);
      }

      function render(opts = {}) {
        if (!G || opts.geo) { geometry(); placeSlots(); }
        const prev = lay; lay = computeLayout();
        for (let c = 0; c < 52; c++) {
          const Lc = lay[c], el = els[c];
          const moved = prev && prev[c] && (prev[c].x !== Lc.x || prev[c].y !== Lc.y) && !opts.instant;
          pos(el, Lc.x, Lc.y);
          el.classList.toggle('down', !Lc.up);
          if (moved) {
            el.style.zIndex = 2000 + Lc.z; clearTimeout(flyT[c]);
            flyT[c] = setTimeout(() => { flyT[c] = 0; if (lay && !el.classList.contains('drag')) el.style.zIndex = lay[c].z; }, 260);
          } else if (!flyT[c] || opts.instant) el.style.zIndex = Lc.z;
        }
        // stock slot look + passes badge
        const rec = E.canRecycle(st);
        slots.stock.classList.toggle('dead', !st.stock.length && !rec);
        if (st.draw === 1) { const left = E.MAX_PASSES_DRAW1 - st.pass; badge.textContent = '↻' + left; badge.style.display = ''; badge.classList.toggle('zero', left <= 0); }
        else badge.style.display = 'none';
        chip.textContent = st.draw === 1 ? s('pass', { n: st.pass }) : s('passInf', { n: st.pass });
        updateStats(); updateTools();
      }

      function scoreNow() { return Math.max(0, st.score - 2 * Math.floor(timer.seconds / 10)); }
      function updateStats() {
        if (!st) return;
        ui.stat('time', timer.text()); ui.stat('score', scoreNow()); ui.stat('moves', st.moves);
      }
      function updateTools() {
        const freeLeft = Math.max(0, FREE_UNDO - undoUsed);
        btnUndo.innerHTML = icon('undo') + `<span>${Kit.t('undo')}</span><small class="so-sub">${freeLeft ? s('free', { n: freeLeft }) : '▶ ' + s('adUndo')}</small>`;
        btnUndo.disabled = !hist.length || won;
        const canAuto = !won && E.allUp(st) && !E.isWon(st) && !!E.autoPlan(st);
        btnAuto.disabled = !canAuto; btnAuto.classList.toggle('ready', canAuto);
        btnHint.disabled = won;
      }

      /* ---------------- game flow ---------------- */
      function inProgress() { return st && !won && st.moves > 0; }

      function newGame(mode, seed) {
        mode = mode === 3 ? 3 : 1;
        d.mode = mode; seg.set(String(mode));
        st = E.deal(mode, seed); hist = []; undoUsed = 0; won = false; stuckShown = false; busy = false;
        timer.reset(0);
        clearHints();
        save();
        dealAnimation();
      }

      function dealAnimation() {
        if (!G) geometry(); placeSlots();
        // start every card on the stock, face down, then fly to its place with a stagger
        table.classList.add('so-noanim');
        for (let c = 0; c < 52; c++) { pos(els[c], G.xs[0], G.topY); els[c].classList.add('down'); els[c].style.zIndex = 1; }
        void table.offsetWidth;
        table.classList.remove('so-noanim');
        lay = null;
        const order = [];
        for (let row = 0; row < 7; row++) for (let p = row; p < 7; p++) order.push(st.tab[p][row]);
        order.forEach((c, k) => { els[c].style.transitionDelay = (k * 28) + 'ms'; inners[c].style.transitionDelay = (k * 28 + 120) + 'ms'; });
        render();
        ctx.sound('whoosh');
        later(() => { for (let c = 0; c < 52; c++) { els[c].style.transitionDelay = ''; inners[c].style.transitionDelay = ''; } }, order.length * 28 + 500);
      }

      function save() {
        if (!st) return;
        if (won) { d.game = null; ctx.save(); return; }
        d.game = { st, hist: hist.slice(-80), ms: timer.ms, undoUsed };
        ctx.save();
      }

      function commit(next, sound) {
        if (!next) return false;
        hist.push(st); if (hist.length > 300) hist.shift();
        st = next; stuckShown = false;
        if (!timer.running && !won) timer.start();
        clearHints();
        render();
        if (sound) ctx.sound(sound);
        save();
        if (E.isWon(st)) { onWin(); return true; }
        later(checkStuck, 320);
        return true;
      }

      function doMove(src, dst) {
        const before = st;
        const ok = commit(E.move(st, src, dst), dst.to === 'found' ? 'match' : 'tap');
        if (ok && src.from === 'tab' && st.down[src.p] < before.down[src.p]) later(() => ctx.sound('pop'), 160);
        if (ok && dst.to === 'found') {
          const fd = st.found[dst.f];
          if (fd.length === 13) { const el = els[fd[12]]; el.classList.add('so-kingglow'); later(() => el.classList.remove('so-kingglow'), 900); }
        }
        return ok;
      }

      function doDraw() {
        if (busy || won) return;
        if (!st.stock.length && !E.canRecycle(st)) {
          if (st.waste.length) { ctx.toast(s('noRecycle')); ctx.sound('bad'); }
          return;
        }
        const recycling = !st.stock.length;
        commit(E.draw(st), recycling ? 'whoosh' : 'tap');
      }

      function checkStuck() {
        if (won || busy || stuckShown || !E.isStuck(st)) return;
        stuckShown = true;
        ctx.sound('bad');
        UI.modal({
          html: `<div class="so-stuck"><div class="so-stuck-ico">🃏</div><h3>${UI.escapeHtml(s('noMoves'))}</h3><p>${UI.escapeHtml(s('noMovesSub'))}</p></div>`,
          actions: [
            { label: s('keep'), cls: 'btn-ghost' },
            { label: Kit.t('undo'), cls: 'btn-outline', onClick: () => { later(undo, 50); } },
            { label: Kit.t('again'), cls: 'btn-primary', onClick: () => newGame(st.draw) }
          ]
        });
      }

      async function undo() {
        if (busy || won || !hist.length) return;
        if (undoUsed >= FREE_UNDO) {
          busy = true;
          const ok = await Kit.useHelp(ctx, 'undo');
          busy = false;
          if (!ok || !alive || !hist.length) return;
        }
        undoUsed++;
        st = hist.pop(); stuckShown = false;
        clearHints(); render(); save();
        ctx.sound('back');
      }

      let hintIds = [];
      function clearHints() {
        table.querySelectorAll('.hint,.glow').forEach(el => el.classList.remove('hint', 'glow'));
        hintIds.forEach(clearTimeout); hintIds = [];
      }
      async function hint() {
        if (busy || won) return;
        if (E.isStuck(st) || !E.hintMove(st)) { ctx.toast(s('noMoves')); ctx.sound('bad'); return; }
        busy = true;
        const ok = await Kit.useHelp(ctx);
        busy = false;
        if (!ok || !alive) return;
        const h = E.hintMove(st); if (!h) return;
        clearHints();
        if (h.draw) {
          const target = st.stock.length ? els[st.stock[st.stock.length - 1]] : slots.stock;
          target.classList.add('hint'); ctx.toast(s('hintDraw'));
        } else {
          E.cardsOf(st, h.src).forEach(c => els[c].classList.add('hint'));
          let tgt;
          if (h.dst.to === 'found') { const fd = st.found[h.dst.f]; tgt = fd.length ? els[fd[fd.length - 1]] : slots['f' + h.dst.f]; }
          else { const t = st.tab[h.dst.p]; tgt = t.length ? els[t[t.length - 1]] : slots['t' + h.dst.p]; }
          tgt.classList.add('glow');
        }
        hintIds.push(setTimeout(clearHints, 2600));
      }

      async function autoComplete() {
        if (busy || won) return;
        const plan = E.autoPlan(st); if (!plan) return;
        busy = true; clearHints();
        if (!timer.running) timer.start();
        for (const step of plan) {
          if (!alive) return;
          const next = step.draw ? E.draw(st) : E.move(st, step.src, step.dst);
          if (!next) break;
          hist.push(st); st = next; render();
          ctx.sound(step.draw ? 'tap' : 'match');
          await wait(step.draw ? 140 : 95);
        }
        if (!alive) return;
        busy = false; save();
        if (E.isWon(st)) onWin(); else updateTools();
      }

      function onWin() {
        if (won) return;
        won = true; busy = true; timer.stop();
        const secs = timer.seconds, base = scoreNow();
        const bonus = secs >= 30 ? Math.round(700000 / secs) : 0;
        const total = base + bonus, key = 'd' + st.draw;
        const prev = d.best[key];
        const record = !prev || total > prev.score;
        if (record) d.best[key] = { score: total, time: secs, moves: st.moves };
        d.wins[key] = (d.wins[key] || 0) + 1;
        d.game = null; ctx.save();
        ctx.badge('solitaire_win'); if (st.draw === 3) ctx.badge('solitaire_draw3');
        ui.stat('score', total);
        updateTools();
        const show = () => {
          if (!alive) return;
          busy = false;
          const lines = [s('lineScore', { n: total })];
          if (bonus) lines.push(s('lineBonus', { n: bonus }));
          lines.push(s('lineTime', { t: timer.text(), m: st.moves }));
          lines.push(`${st.draw === 3 ? s('mode3') : s('mode1')} · ${record ? s('record') : Kit.t('best') + ': ' + d.best[key].score}`);
          Kit.result(ctx, { result: 'win', lines, stars: STARS[st.draw], onAgain: () => newGame(st.draw) });
        };
        later(() => celebrate(show), 280);
      }

      /* ---------------- win celebration: classic bouncing cards on a canvas ---------------- */
      function celebrate(done) {
        const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { done(); return; }
        const cv = document.createElement('canvas'); cv.className = 'so-fx';
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(G.W * dpr); cv.height = Math.round(G.H * dpr);
        const tip = document.createElement('div'); tip.className = 'so-fx-tip'; tip.textContent = s('tapSkip');
        table.append(cv, tip);
        const g = cv.getContext('2d'); g.scale(dpr, dpr);
        const imgs = [];
        const load = c => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cardSvg(c, 'width="100" height="140"', true)); imgs[c] = im; });
        // launch order: kings first, round-robin over the four foundations
        const order = [];
        for (let r = 12; r >= 0; r--) for (let f = 0; f < 4; f++) if (st.found[f][r] != null) order.push({ c: st.found[f][r], f });
        let finished = false, raf = 0;
        const end = () => {
          if (finished) return; finished = true; cancelAnimationFrame(raf);
          cv.removeEventListener('pointerdown', end);
          cv.style.transition = 'opacity .35s'; cv.style.opacity = '0'; tip.remove();
          later(() => { cv.remove(); for (let c = 0; c < 52; c++) els[c].style.visibility = ''; done(); }, 360);
        };
        cv.addEventListener('pointerdown', end);
        Promise.all(order.map(o => load(o.c))).then(() => {
          if (!alive || finished) return;
          const flying = []; let next = 0, t0 = performance.now(), last = t0, lastLaunch = -1e9;
          const k = G.W / 360, floor = G.H - G.ch;
          const step = now => {
            if (!alive || finished) return;
            const dt = Math.min(2.5, (now - last) / 16.67); last = now;
            if (next < order.length && now - lastLaunch > 150) {
              const o = order[next++]; lastLaunch = now;
              els[o.c].style.visibility = 'hidden';
              const dir = Math.random() < 0.5 ? -1 : 1;
              flying.push({ c: o.c, x: G.xs[3 + o.f], y: G.topY, vx: dir * (1.6 + Math.random() * 3) * k, vy: -(Math.random() * 4) * k });
              if (next % 4 === 1) ctx.sound('tap');
            }
            g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.035)'; g.fillRect(0, 0, G.W, G.H); g.restore();
            for (const p of flying) {
              if (p.out) continue;
              p.vy += 0.42 * k * dt; p.x += p.vx * dt; p.y += p.vy * dt;
              if (p.y > floor) { p.y = floor; p.vy = -p.vy * 0.74; if (Math.abs(p.vy) < 1.2 * k) p.vy = -(4 + Math.random() * 3) * k; }
              if (p.x < -G.cw || p.x > G.W) { p.out = true; continue; }
              const im = imgs[p.c]; if (im) g.drawImage(im, p.x, p.y, G.cw, G.ch);
            }
            if ((next >= order.length && flying.every(p => p.out)) || now - t0 > 7500) { end(); return; }
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
          cleanupFx = () => { finished = true; cancelAnimationFrame(raf); };
        });
      }
      let cleanupFx = null;

      /* ---------------- pointer input: drag & drop, tap, double tap ---------------- */
      let drag = null, lastTap = { c: -1, t: 0 };
      function where(c) {
        let i = st.stock.indexOf(c); if (i >= 0) return { area: 'stock', i };
        i = st.waste.indexOf(c); if (i >= 0) return { area: 'waste', i, top: i === st.waste.length - 1 };
        for (let f = 0; f < 4; f++) { i = st.found[f].indexOf(c); if (i >= 0) return { area: 'found', f, i, top: i === st.found[f].length - 1 }; }
        for (let p = 0; p < 7; p++) { i = st.tab[p].indexOf(c); if (i >= 0) return { area: 'tab', p, i }; }
        return null;
      }

      function onDown(e) {
        if (busy || won || (e.button != null && e.button > 0)) return;
        const cardEl = e.target.closest('.so-card'), slotEl = e.target.closest('.so-slot');
        let src = null;
        if (cardEl) {
          const w = where(+cardEl.dataset.c); if (!w) return;
          if (w.area === 'stock') { drag = { kind: 'stock', x0: e.clientX, y0: e.clientY }; return; }
          if (w.area === 'waste' && w.top) src = { from: 'waste' };
          else if (w.area === 'found' && w.top) src = { from: 'found', f: w.f };
          else if (w.area === 'tab' && w.i >= st.down[w.p]) src = { from: 'tab', p: w.p, i: w.i };
        } else if (slotEl && slotEl.dataset.slot === 'stock') { drag = { kind: 'stock', x0: e.clientX, y0: e.clientY }; return; }
        if (!src) return;
        const cards = E.cardsOf(st, src); if (!cards.length) return;
        drag = { kind: 'card', src, cards, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moving: false };
        try { table.setPointerCapture(e.pointerId); } catch (err) { }
      }

      function legalTargets(src) {
        const out = [];
        for (let f = 0; f < 4; f++) if (E.canMove(st, src, { to: 'found', f })) out.push({ to: 'found', f });
        for (let p = 0; p < 7; p++) if (E.canMove(st, src, { to: 'tab', p })) out.push({ to: 'tab', p });
        return out;
      }
      const targetEl = dst => {
        if (dst.to === 'found') { const fd = st.found[dst.f]; return fd.length ? els[fd[fd.length - 1]] : slots['f' + dst.f]; }
        const t = st.tab[dst.p]; return t.length ? els[t[t.length - 1]] : slots['t' + dst.p];
      };

      function onMove(e) {
        if (!drag || drag.kind !== 'card') return;
        drag.dx = e.clientX - drag.x0; drag.dy = e.clientY - drag.y0;
        if (!drag.moving) {
          if (Math.hypot(drag.dx, drag.dy) < 6) return;
          drag.moving = true; clearHints();
          drag.cards.forEach((c, k) => { els[c].classList.add('drag'); els[c].style.zIndex = 3000 + k; });
          drag.targets = legalTargets(drag.src);
          drag.targets.forEach(t => targetEl(t).classList.add('glow'));
        }
        drag.cards.forEach(c => pos(els[c], lay[c].x + drag.dx, lay[c].y + drag.dy));
        e.preventDefault();
      }

      function dropTarget(dr) {
        const top = lay[dr.cards[0]];
        const x = top.x + dr.dx, y = top.y + dr.dy, w = G.cw, h = G.ch;
        const overlap = (rx, ry, rw, rh) => Math.max(0, Math.min(x + w, rx + rw) - Math.max(x, rx)) * Math.max(0, Math.min(y + h, ry + rh) - Math.max(y, ry));
        const cand = [];
        if (dr.cards.length === 1) for (let f = 0; f < 4; f++) cand.push({ dst: { to: 'found', f }, a: overlap(G.xs[3 + f], G.topY, w, h) });
        for (let p = 0; p < 7; p++) cand.push({ dst: { to: 'tab', p }, a: overlap(G.xs[p], G.tabY - G.gap, w, Math.max(G.bottom[p], G.tabY + h) - G.tabY + G.gap + h * 0.4) });
        cand.sort((a, b) => b.a - a.a);
        for (const c of cand) if (c.a > 0 && E.canMove(st, dr.src, c.dst)) return c.dst;
        return null;
      }

      function onUp(e) {
        const dr = drag; drag = null; if (!dr) return;
        if (dr.kind === 'stock') { if (Math.hypot(e.clientX - dr.x0, e.clientY - dr.y0) < 12) doDraw(); return; }
        if (dr.moving) {
          dr.cards.forEach(c => els[c].classList.remove('drag'));
          table.querySelectorAll('.glow').forEach(el => el.classList.remove('glow'));
          const dst = e.type === 'pointercancel' ? null : dropTarget(dr);
          if (!(dst && doMove(dr.src, dst))) { render(); }
          return;
        }
        // tap / double tap
        const c = dr.cards[0], now = performance.now();
        const dbl = lastTap.c === c && now - lastTap.t < 380;
        lastTap = { c, t: now };
        if (dbl) {
          lastTap = { c: -1, t: 0 };
          if (dr.cards.length === 1 && dr.src.from !== 'found') { const f = E.foundFor(st, c); if (f >= 0) doMove(dr.src, { to: 'found', f }); }
          return;
        }
        const dst = E.tapTarget(st, dr.src);
        if (dst) doMove(dr.src, dst);
        else { dr.cards.forEach(cc => { els[cc].classList.remove('shake'); void els[cc].offsetWidth; els[cc].classList.add('shake'); }); ctx.sound('bad'); later(() => dr.cards.forEach(cc => els[cc].classList.remove('shake')), 360); }
      }

      table.addEventListener('pointerdown', onDown);
      table.addEventListener('pointermove', onMove);
      table.addEventListener('pointerup', onUp);
      table.addEventListener('pointercancel', onUp);
      const noCtx = e => e.preventDefault();
      table.addEventListener('contextmenu', noCtx);

      // relayout on size changes (phone rotation, desktop frame)
      let roT = 0;
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(() => { if (alive && st && !drag) { const w = G && G.W, h = G && G.H; geometry(); if (G.W !== w || G.H !== h) { placeSlots(); render({ instant: true }); } } }, 60); }) : null;
      if (ro) { ro.observe(table); const sc = root.closest('.screen'); if (sc) ro.observe(sc); }

      /* ---------------- start / resume ---------------- */
      const saved = d.game;
      if (saved && E.valid(saved.st) && !E.isWon(saved.st)) {
        st = saved.st; hist = (saved.hist || []).filter(E.valid); undoUsed = saved.undoUsed || 0;
        d.mode = st.draw; seg.set(String(st.draw));
        timer.reset(saved.ms || 0);
        geometry(); placeSlots(); table.classList.add('so-noanim'); render({ instant: true }); void table.offsetWidth; table.classList.remove('so-noanim');
        if (st.moves > 0) timer.start();
      } else {
        // the board must be laid out once before the deal animation can measure it
        requestAnimationFrame(() => { if (alive) { geometry(); newGame(d.mode === 3 ? 3 : 1); } });
        st = E.deal(d.mode === 3 ? 3 : 1); geometry(); placeSlots(); render({ instant: true });
      }

      root.__game = {
        engine: E,
        state: () => E.clone(st),
        move: (src, dst) => doMove(src, dst),
        draw: () => doDraw(),
        tap: src => { const dst = E.tapTarget(st, src); return dst ? doMove(src, dst) : false; },
        hint: () => E.hintMove(st),
        auto: () => autoComplete(),
        undo: () => undo(),
        newGame: (mode, seed) => newGame(mode, seed),
        setState: ns => { if (!E.valid(ns)) return false; hist.push(st); st = E.clone(ns); won = false; d.mode = st.draw; seg.set(String(st.draw)); render(); save(); return true; },
        layout: () => ({ G, lay }),
        // Puts the game one move before the win (all cards on foundations except the ♣ king).
        nearWin: () => {
          const ns = E.clone(st);
          ns.found = [0, 1, 2, 3].map(sx => Array.from({ length: 13 }, (_, r) => sx * 13 + r));
          ns.found[3].pop(); ns.tab = [[51], [], [], [], [], [], []]; ns.down = [0, 0, 0, 0, 0, 0, 0]; ns.stock = []; ns.waste = [];
          hist.push(st); st = ns; won = false; render(); return true;
        }
      };

      return {
        destroy() {
          alive = false;
          if (st && !won && st.moves > 0) save();
          timer.stop();
          timers.forEach(clearTimeout); timers.clear();
          flyT.forEach(clearTimeout); hintIds.forEach(clearTimeout); clearTimeout(roT);
          if (cleanupFx) cleanupFx();
          if (ro) ro.disconnect();
          table.removeEventListener('pointerdown', onDown);
          table.removeEventListener('pointermove', onMove);
          table.removeEventListener('pointerup', onUp);
          table.removeEventListener('pointercancel', onUp);
          table.removeEventListener('contextmenu', noCtx);
          delete root.__game;
        }
      };
    }
  });
})();
