// Minensucher / Сапёр — classic Minesweeper themed as a forest clearing ("Waldräumer").
// Part 1: pure engine (no DOM, Node-testable). Part 2: UI with beveled tiles, reveal ripple,
// long-press / right-click / flag-mode flagging, chording, best times, second chance via ctx.ad().
(function () {
  'use strict';

  /* ======================================================================
   * Engine. Board cells are indexed i = y * w + x.
   * Game: { level, w, h, m, seed, mines:null|0/1[], open:0/1[], flag:0/1[], defused:[], state, hit, chance }
   * state: 'ready' (no mines yet) → 'play' → 'won' | 'lost'. Functions never mutate their input.
   * ==================================================================== */
  const M = (function () {
    const LEVELS = { easy: { w: 9, h: 9, m: 10 }, medium: { w: 12, h: 12, m: 24 }, hard: { w: 12, h: 16, m: 40 } };

    function rng(seed) {
      let a = seed >>> 0;
      return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }

    function create(level, seed) {
      const L = LEVELS[level] || LEVELS.easy, n = L.w * L.h;
      return {
        level: LEVELS[level] ? level : 'easy', w: L.w, h: L.h, m: L.m,
        seed: seed == null ? (Math.random() * 2 ** 31) >>> 0 : seed >>> 0,
        mines: null, open: new Array(n).fill(0), flag: new Array(n).fill(0), defused: [], state: 'ready', hit: -1, chance: false
      };
    }
    function clone(g) {
      return Object.assign({}, g, { mines: g.mines && g.mines.slice(), open: g.open.slice(), flag: g.flag.slice(), defused: g.defused.slice() });
    }

    function nb(g, i) {
      const x = i % g.w, y = (i / g.w) | 0, out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h) out.push(ny * g.w + nx);
      }
      return out;
    }
    const count = (g, i) => nb(g, i).reduce((a, j) => a + g.mines[j], 0);
    const counts = g => g.mines ? g.mines.map((_, i) => count(g, i)) : null;

    // Mines are placed on the first tap, never on that cell or its neighbours, so it opens an area.
    // Several random layouts are tried and the one with the most generous first opening is kept.
    function place(g, safe) {
      const r = rng(g.seed ^ (safe * 2654435761));
      const excl = new Set([safe].concat(nb(g, safe)));
      let base = [];
      for (let i = 0; i < g.w * g.h; i++) if (!excl.has(i)) base.push(i);
      if (base.length < g.m) { base = []; for (let i = 0; i < g.w * g.h; i++) if (i !== safe) base.push(i); }
      const target = Math.round(g.w * g.h * 0.12);
      let best = null, bestSize = -1;
      for (let tries = 0; tries < 30 && bestSize < target; tries++) {
        const cand = base.slice();
        for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
        const mines = new Array(g.w * g.h).fill(0);
        for (let k = 0; k < g.m; k++) mines[cand[k]] = 1;
        const size = openingSize({ w: g.w, h: g.h, mines }, safe);
        if (size > bestSize) { best = mines; bestSize = size; }
      }
      g.mines = best;
    }
    function openingSize(g, start) {
      const seen = new Uint8Array(g.w * g.h); const q = [start]; seen[start] = 1;
      for (let h = 0; h < q.length; h++) {
        const i = q[h]; if (g.mines[i] || count(g, i)) continue;
        for (const j of nb(g, i)) if (!seen[j] && !g.mines[j]) { seen[j] = 1; q.push(j); }
      }
      return q.length;
    }

    // Opens the start cells and flood-fills from zeros. Returns [{i, d}] with BFS distance (for the ripple).
    function flood(g, starts) {
      const out = [], q = [];
      for (const [i, d] of starts) if (!g.open[i] && !g.flag[i]) { g.open[i] = 1; q.push([i, d]); out.push({ i, d }); }
      for (let h = 0; h < q.length; h++) {
        const [i, d] = q[h];
        if (g.mines[i] || count(g, i)) continue;
        for (const j of nb(g, i)) if (!g.open[j] && !g.flag[j] && !g.mines[j]) { g.open[j] = 1; q.push([j, d + 1]); out.push({ i: j, d: d + 1 }); }
      }
      return out;
    }

    const isWon = g => !!g.mines && g.mines.every((mn, i) => mn || g.open[i]);
    const knownMine = (g, j) => g.flag[j] || (g.open[j] && g.mines && g.mines[j]);

    function finish(n, opened) {
      const hit = opened.find(o => n.mines[o.i]);
      if (hit) { n.state = 'lost'; n.hit = hit.i; }
      else if (isWon(n)) n.state = 'won';
      return { g: n, opened };
    }

    // Chording: tapping a number whose flags are all placed opens the remaining neighbours.
    function chord(g, i) {
      if (!g.mines || !g.open[i] || g.mines[i]) return null;
      const c = count(g, i); if (!c) return null;
      const ns = nb(g, i);
      if (ns.filter(j => knownMine(g, j)).length !== c) return null;
      const targets = ns.filter(j => !g.open[j] && !g.flag[j]);
      if (!targets.length) return null;
      const n = clone(g);
      return finish(n, flood(n, targets.map(j => [j, 1])));
    }

    function reveal(g, i) {
      if (g.state === 'won' || g.state === 'lost' || i < 0 || i >= g.w * g.h || g.flag[i]) return null;
      if (g.open[i]) return chord(g, i);
      const n = clone(g);
      if (!n.mines) { place(n, i); n.state = 'play'; }
      return finish(n, flood(n, [[i, 0]]));
    }

    function toggleFlag(g, i) {
      if (g.state === 'won' || g.state === 'lost' || g.open[i]) return null;
      const n = clone(g); n.flag[i] = n.flag[i] ? 0 : 1; return n;
    }

    // Second chance: every mine that was just uncovered is defused and play continues.
    function defuse(g) {
      if (g.state !== 'lost') return null;
      const n = clone(g);
      n.mines.forEach((mn, i) => { if (mn && n.open[i] && n.defused.indexOf(i) < 0) { n.defused.push(i); n.flag[i] = 0; } });
      n.state = isWon(n) ? 'won' : 'play'; n.hit = -1; n.chance = true;
      return n;
    }

    const flagsLeft = g => g.m - g.flag.reduce((a, f) => a + f, 0) - g.defused.length;

    // Cells that simple logic proves safe / mined, assuming the player's flags are right.
    function deduce(g) {
      const safe = new Set(), mine = new Set();
      if (!g.mines) return { safe, mine };
      const isMine = j => knownMine(g, j) || mine.has(j);
      let changed = true, guard = 0;
      while (changed && guard++ < 50) {
        changed = false;
        for (let i = 0; i < g.w * g.h; i++) {
          if (!g.open[i] || g.mines[i]) continue;
          const c = count(g, i); if (!c) continue;
          const ns = nb(g, i);
          const hidden = ns.filter(j => !g.open[j] && !g.flag[j] && !mine.has(j) && !safe.has(j));
          if (!hidden.length) continue;
          const known = ns.filter(isMine).length;
          if (known === c) { hidden.forEach(j => safe.add(j)); changed = true; }
          else if (known + hidden.length === c) { hidden.forEach(j => mine.add(j)); changed = true; }
        }
      }
      return { safe, mine };
    }

    // A cell worth revealing: logically safe first, then any truly safe frontier cell.
    function hintCell(g) {
      if (g.state === 'won' || g.state === 'lost') return -1;
      if (!g.mines) return ((g.h / 2) | 0) * g.w + ((g.w / 2) | 0);
      const ok = j => !g.open[j] && !g.flag[j] && !g.mines[j];
      const ded = [...deduce(g).safe].filter(ok);
      if (ded.length) return ded[0];
      const frontier = [];
      for (let i = 0; i < g.w * g.h; i++) if (ok(i) && nb(g, i).some(j => g.open[j])) frontier.push(i);
      if (frontier.length) return frontier[(frontier.length / 2) | 0];
      for (let i = 0; i < g.w * g.h; i++) if (ok(i)) return i;
      return -1;
    }

    function valid(g) {
      try {
        if (!g || !LEVELS[g.level]) return false;
        const n = g.w * g.h;
        if (g.w !== LEVELS[g.level].w || g.h !== LEVELS[g.level].h || g.open.length !== n || g.flag.length !== n) return false;
        if (g.mines && (g.mines.length !== n || g.mines.reduce((a, b) => a + b, 0) !== g.m)) return false;
        return ['ready', 'play', 'won', 'lost'].indexOf(g.state) >= 0;
      } catch (e) { return false; }
    }

    return { LEVELS, rng, create, clone, nb, count, counts, place, reveal, chord, toggleFlag, defuse, isWon, flagsLeft, deduce, hintCell, valid };
  })();

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  if (typeof Games === 'undefined' || typeof Kit === 'undefined') return;

  /* ======================================================================
   * Graphics
   * ==================================================================== */
  const SVG_MINE = '<svg viewBox="0 0 24 24" class="ms-svg"><g stroke="#2a2f36" stroke-width="2.3" stroke-linecap="round"><path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2M5.4 5.4l2.2 2.2M16.4 16.4l2.2 2.2M5.4 18.6l2.2-2.2M16.4 7.6l2.2-2.2"/></g>' +
    '<circle cx="12" cy="12" r="6.7" fill="#434951"/><path d="M8.2 14.6c1.6 1.8 5.4 2.4 8-.2" stroke="#9c5a26" stroke-width="1.4" fill="none" opacity=".75"/><circle cx="14.6" cy="13.8" r="1.2" fill="#a8622c" opacity=".7"/>' +
    '<path d="M6.4 10.6c.6-2.6 2.8-4.4 5-4.5-.6 1.5-2.6 3.6-5 4.5z" fill="#6fae4f"/><circle cx="10.2" cy="9.6" r="1.6" fill="#fff" opacity=".5"/></svg>';
  const SVG_FLAG = '<svg viewBox="0 0 24 24" class="ms-svg"><ellipse cx="11" cy="20.2" rx="6" ry="1.9" fill="#3f6b2c" opacity=".55"/><path d="M8.6 3.2v16.6" stroke="#6b4a2f" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M9.4 3.6c3-1 5 1 8.6-.2v7.4c-3.6 1.2-5.6-.8-8.6.2z" fill="#ef4444"/><path d="M9.4 3.6c3-1 5 1 8.6-.2v2.2c-3.6 1.2-5.6-.8-8.6.2z" fill="#fff" opacity=".22"/></svg>';
  const SVG_X = '<svg viewBox="0 0 24 24" class="ms-x"><path d="M5 5l14 14M19 5L5 19" stroke="#e11d48" stroke-width="3" stroke-linecap="round"/></svg>';

  const ICON = {
    neu: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
    flag: '<path d="M6 21V4"/><path d="M6 4.5c3.5-1.6 6 1.6 12 0v8c-6 1.6-8.5-1.6-12 0"/>',
    hint: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.8 10.6c.6.6.8 1.3.8 2.4h6c0-1.1.2-1.8.8-2.4A6 6 0 0 0 12 3z"/>',
    rules: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/><path d="M9 7.5h6M9 11h4"/>'
  };
  const icon = k => `<span class="ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg></span>`;

  const RULES = {
    de: `<ul>
      <li><b>Ziel:</b> Auf dieser Waldlichtung liegen alte Minen und Fallen versteckt. Decke alle Felder <i>ohne</i> Mine auf.</li>
      <li>Eine Zahl zeigt, wie viele Minen in den 8 Nachbarfeldern liegen.</li>
      <li>Der erste Tipp ist immer sicher und öffnet eine Fläche.</li>
      <li><b>Flagge setzen:</b> lange drücken (≈ 0,35 s), Rechtsklick oder den Flaggen-Modus einschalten.</li>
      <li><b>Akkord:</b> Tippe auf eine Zahl, deren Minen alle markiert sind – dann öffnen sich die übrigen Nachbarn auf einmal.</li>
      <li>Stufen: Leicht 9×9 (10 Minen), Mittel 12×12 (24), Schwer 12×16 (40). Bestzeiten werden je Stufe gespeichert.</li>
      <li><b>Zweite Chance:</b> Einmal pro Spiel kannst du nach einem Treffer per Anzeige weiterspielen – die Anzeige spendet an den Partner.</li></ul>`,
    ru: `<ul>
      <li><b>Цель:</b> на лесной поляне спрятаны старые мины и ловушки. Открой все клетки <i>без</i> мин.</li>
      <li>Число показывает, сколько мин в 8 соседних клетках.</li>
      <li>Первое нажатие всегда безопасно и открывает область.</li>
      <li><b>Флажок:</b> долгое нажатие (≈ 0,35 с), правая кнопка мыши или режим флажков.</li>
      <li><b>Аккорд:</b> нажми на число, вокруг которого уже отмечены все мины, — остальные соседи откроются сразу.</li>
      <li>Уровни: лёгкий 9×9 (10 мин), средний 12×12 (24), сложный 12×16 (40). Лучшее время хранится для каждого уровня.</li>
      <li><b>Второй шанс:</b> один раз за игру после подрыва можно продолжить за рекламу — она приносит пожертвование партнёру.</li></ul>`,
    en: `<ul>
      <li><b>Goal:</b> old mines and traps are hidden in this forest clearing. Uncover every square <i>without</i> a mine.</li>
      <li>A number shows how many mines lie in the 8 neighbouring squares.</li>
      <li>The first tap is always safe and opens an area.</li>
      <li><b>Place a flag:</b> long press (≈ 0.35 s), right-click or switch on flag mode.</li>
      <li><b>Chord:</b> tap a number whose mines are all flagged – the remaining neighbours open at once.</li>
      <li>Levels: Easy 9×9 (10 mines), Medium 12×12 (24), Hard 12×16 (40). Best times are saved per level.</li>
      <li><b>Second chance:</b> once per game you can keep playing after a hit by watching an ad – the ad donates to the partner.</li></ul>`,
    uk: `<ul>
      <li><b>Мета:</b> на лісовій галявині заховані старі міни й пастки. Відкрий усі клітинки <i>без</i> мін.</li>
      <li>Число показує, скільки мін у 8 сусідніх клітинках.</li>
      <li>Перше натискання завжди безпечне й відкриває ділянку.</li>
      <li><b>Прапорець:</b> довге натискання (≈ 0,35 с), права кнопка миші або режим прапорців.</li>
      <li><b>Акорд:</b> натисни на число, навколо якого вже позначені всі міни, — решта сусідів відкриються одразу.</li>
      <li>Рівні: легкий 9×9 (10 мін), середній 12×12 (24), складний 12×16 (40). Найкращий час зберігається для кожного рівня.</li>
      <li><b>Другий шанс:</b> один раз за гру після підриву можна продовжити за рекламу — вона приносить пожертву партнерові.</li></ul>`
  };

  const s = Kit.strings({
    de: {
      flag: 'Flagge', theme: 'Waldräumer', hitTitle: 'Mine getroffen!', hitText: 'Zweite Chance: Sieh dir eine kurze Anzeige an – die Mine wird entschärft und du spielst weiter. Die Spende geht an {p}.',
      watch: '▶ Weiterspielen', giveUp: 'Aufgeben', loseTitle: 'Boom – eine alte Mine!', lineTime: 'Zeit: {t}', newBest: 'Neue Bestzeit!', bestLine: 'Bestzeit: {t}',
      hintSafe: 'Dieses Feld ist sicher.', confirmLevel: 'Stufe wechseln? Das laufende Spiel wird abgebrochen.', defused: 'Mine entschärft – weiter geht’s!',
      flagOn: 'Flaggen-Modus an', flagOff: 'Flaggen-Modus aus', cleared: '{n} % geräumt', chanceUsed: 'Zweite Chance genutzt'
    },
    ru: {
      flag: 'Флажок', theme: 'Лесник', hitTitle: 'Подрыв!', hitText: 'Второй шанс: посмотри короткую рекламу — мина будет обезврежена, и игра продолжится. Пожертвование получит {p}.',
      watch: '▶ Продолжить', giveUp: 'Сдаться', loseTitle: 'Бум — старая мина!', lineTime: 'Время: {t}', newBest: 'Новый рекорд времени!', bestLine: 'Лучшее время: {t}',
      hintSafe: 'Эта клетка безопасна.', confirmLevel: 'Сменить уровень? Текущая игра будет прервана.', defused: 'Мина обезврежена — играем дальше!',
      flagOn: 'Режим флажков включён', flagOff: 'Режим флажков выключен', cleared: 'Расчищено {n} %', chanceUsed: 'Второй шанс использован'
    },
    en: {
      flag: 'Flag', theme: 'Forest clearer', hitTitle: 'Mine hit!', hitText: 'Second chance: watch a short ad – the mine is defused and you keep playing. The donation goes to {p}.',
      watch: '▶ Keep playing', giveUp: 'Give up', loseTitle: 'Boom – an old mine!', lineTime: 'Time: {t}', newBest: 'New best time!', bestLine: 'Best time: {t}',
      hintSafe: 'This square is safe.', confirmLevel: 'Change level? The current game will be abandoned.', defused: 'Mine defused – let’s go on!',
      flagOn: 'Flag mode on', flagOff: 'Flag mode off', cleared: '{n} % cleared', chanceUsed: 'Second chance used'
    },
    uk: {
      flag: 'Прапорець', theme: 'Лісник', hitTitle: 'Підрив!', hitText: 'Другий шанс: переглянь коротку рекламу — міну буде знешкоджено, і гра продовжиться. Пожертву отримає {p}.',
      watch: '▶ Продовжити', giveUp: 'Здатися', loseTitle: 'Бум — стара міна!', lineTime: 'Час: {t}', newBest: 'Новий рекорд часу!', bestLine: 'Найкращий час: {t}',
      hintSafe: 'Ця клітинка безпечна.', confirmLevel: 'Змінити рівень? Поточну гру буде перервано.', defused: 'Міну знешкоджено — граємо далі!',
      flagOn: 'Режим прапорців увімкнено', flagOff: 'Режим прапорців вимкнено', cleared: 'Розчищено {n} %', chanceUsed: 'Другий шанс використано'
    }
  });

  const STARS = { easy: 5, medium: 12, hard: 25 };
  const LONG_PRESS = 350;
  const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  Games.register({
    id: 'mines', icon: '💣', partner: 'p1', isNew: true,
    name: { de: 'Minensucher', en: 'Minesweeper', ru: 'Сапёр', uk: 'Сапер' },
    tagline: { de: 'Räume die Waldlichtung: Zahlen lesen, Fallen markieren.', en: 'Clear the forest glade: read the numbers, mark the traps.', ru: 'Расчисти лесную поляну: читай цифры, отмечай ловушки.', uk: 'Розчисти лісову галявину: читай цифри, позначай пастки.' },
    badges: [
      { id: 'mines_win', icon: '🚩', name: { de: 'Lichtung geräumt', en: 'Clearing cleared', ru: 'Поляна расчищена', uk: 'Галявину розчищено' } },
      { id: 'mines_hard', icon: '🌲', name: { de: 'Waldräumer-Profi', en: 'Forest clearing pro', ru: 'Профи-сапёр', uk: 'Профі-сапер' } }
    ],

    thumb() {
      const tile = (x, y, kind, n) => {
        const open = kind !== 'h' && kind !== 'f';
        let t = `<rect x="${x}" y="${y}" width="15" height="15" rx="3" fill="${open ? ((x + y) % 2 ? '#f1e3c4' : '#e9d8b3') : ((x + y) % 2 ? '#7cc47f' : '#70b974')}"/>`;
        if (!open) t += `<rect x="${x}" y="${y}" width="15" height="3" rx="1.5" fill="#fff" opacity=".25"/>`;
        if (n) t += `<text x="${x + 7.5}" y="${y + 11.5}" text-anchor="middle" font-family="Inter,Segoe UI,Arial" font-weight="800" font-size="11" fill="${['', '#2563eb', '#16a34a', '#dc2626'][n]}">${n}</text>`;
        if (kind === 'f') t += `<path d="M${x + 5} ${y + 3}v10" stroke="#6b4a2f" stroke-width="1.4"/><path d="M${x + 5.6} ${y + 3.2}l6 2.3-6 2.3z" fill="#ef4444"/>`;
        if (kind === 'm') t += `<circle cx="${x + 7.5}" cy="${y + 7.5}" r="3.6" fill="#434951"/><path d="M${x + 7.5} ${y + 2}v11M${x + 2} ${y + 7.5}h11" stroke="#2a2f36" stroke-width="1.4"/>`;
        return t;
      };
      const map = ['ooo1hhh', 'o12fhhh', '1fhhhmh'];
      const nums = { '0,3': 1, '1,1': 1, '1,2': 2, '2,0': 1 };
      let cells = '';
      map.forEach((row, ry) => [...row].forEach((k, rx) => { cells += tile(28 + rx * 15.5, 15 + ry * 15.5, k === 'o' || k === '1' || k === '2' ? 'o' : k, nums[ry + ',' + rx] || 0); }));
      return `<defs><linearGradient id="msThBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6f4a"/><stop offset="1" stop-color="#173f2b"/></linearGradient></defs>
        <rect width="160" height="80" fill="url(#msThBg)"/>
        <path d="M8 80V52l8-14 8 14v28zM140 80V46l9-16 9 16v34z" fill="#0f2e1f" opacity=".7"/>
        <circle cx="138" cy="14" r="8" fill="#fde68a" opacity=".85"/>
        <rect x="24" y="11" width="116" height="55" rx="8" fill="#1d4a33"/>${cells}`;
    },

    mount(root, ctx) {
      const d = ctx.data;
      d.best = d.best || {}; d.wins = d.wins || {};
      let alive = true, busy = false, flagMode = false, reveal = null; // reveal: null | 'lost' | 'won'
      let g = null, cnt = null, cs = 30;
      const timers = new Set();
      const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
      const wait = ms => new Promise(r => later(r, ms));
      const partnerName = () => ctx.partner ? ctx.partner.name.replace(' (Beispiel)', '') : '';

      const ui = Kit.shell(root, {
        theme: 'ms', top: true, cls: 'ms-board',
        stats: [{ id: 'mines', icon: '🚩', value: 0 }, { id: 'time', icon: '⏱', value: '0:00' }, { id: 'best', icon: '🏆', value: '–' }]
      });
      const timer = Kit.timer(t => ui.stat('time', t));

      const seg = Kit.segmented([{ id: 'easy', label: Kit.t('easy') }, { id: 'medium', label: Kit.t('medium') }, { id: 'hard', label: Kit.t('hard') }], d.level || 'easy', id => {
        seg.set(g.level);
        const go = () => newGame(id);
        if (g.state === 'play' && !reveal) Kit.confirm(s('confirmLevel'), go); else go();
      });
      const chip = document.createElement('span'); chip.className = 'gk-chip ms-chip'; chip.textContent = '🌲 ' + s('theme');
      ui.top.append(seg.el, chip);

      const grid = document.createElement('div'); grid.className = 'ms-grid';
      ui.board.appendChild(grid);
      let cells = [], looks = [];

      const btnNew = ui.tool(icon('neu') + Kit.t('newGame'), () => { if (busy) return; if (g.state === 'play' && !reveal) Kit.confirm(Kit.t('confirmNew'), () => newGame(g.level)); else newGame(g.level); });
      const btnFlag = ui.tool(icon('flag') + s('flag'), () => setFlagMode(!flagMode), 'ms-flagbtn');
      const btnHint = ui.tool(icon('hint') + Kit.t('hint'), () => hint());
      ui.tool(icon('rules') + Kit.t('rules'), () => Kit.rules(Kit.t('rules') + ' · ' + L({ de: 'Minensucher', en: 'Minesweeper', ru: 'Сапёр', uk: 'Сапер' }), L(RULES)));

      function setFlagMode(on) {
        flagMode = on; btnFlag.classList.toggle('on', on); grid.classList.toggle('flagmode', on);
        ctx.toast(s(on ? 'flagOn' : 'flagOff'));
      }

      /* ---------------- sizing ---------------- */
      function availHeight(fallback) {
        const sc = root.closest('.screen'); if (!sc) return fallback;
        const scR = sc.getBoundingClientRect(), bR = ui.board.getBoundingClientRect(), shR = ui.el.getBoundingClientRect();
        const padB = parseFloat(getComputedStyle(sc).paddingBottom) || 0;
        return Math.floor(sc.clientHeight - padB - (bR.top - scR.top + sc.scrollTop) - (shR.bottom - bR.bottom) - 2);
      }
      function fit() {
        const cst = getComputedStyle(ui.board);
        const padX = parseFloat(cst.paddingLeft) + parseFloat(cst.paddingRight), padY = parseFloat(cst.paddingTop) + parseFloat(cst.paddingBottom);
        const W = ui.board.clientWidth - padX;
        const H = availHeight(9999) - padY;
        const gap = W < 330 ? 1.5 : 2;
        let size = Math.floor(Math.min((W - gap * (g.w - 1)) / g.w, (H - gap * (g.h - 1)) / g.h, 46));
        size = Math.max(22, size);
        cs = size;
        grid.style.setProperty('--cs', size + 'px'); grid.style.setProperty('--gap', gap + 'px');
        grid.style.gridTemplateColumns = `repeat(${g.w}, ${size}px)`;
      }

      /* ---------------- rendering ---------------- */
      function build() {
        grid.innerHTML = ''; cells = []; looks = [];
        const frag = document.createDocumentFragment();
        for (let i = 0; i < g.w * g.h; i++) {
          const el = document.createElement('div'); el.dataset.i = i;
          const x = i % g.w, y = (i / g.w) | 0;
          el.dataset.alt = (x + y) % 2;
          // a few grass tufts / pebbles for texture, stable per board
          const hsh = (Math.imul(i + 1, 2654435761) ^ g.seed) >>> 0;
          el.dataset.deco = hsh % 9 === 0 ? 't' : hsh % 11 === 0 ? 'p' : '';
          frag.appendChild(el); cells.push(el); looks.push('');
        }
        grid.appendChild(frag);
        fit();
      }

      function lookOf(i) {
        const mine = g.mines && g.mines[i];
        if (g.open[i]) {
          if (mine) return g.defused.indexOf(i) >= 0 ? 'defused' : 'boom';
          return 'n' + cnt[i];
        }
        if (reveal === 'won' && mine) return 'flag';
        if (reveal === 'lost') {
          if (mine) return g.flag[i] ? 'flag' : 'mine';
          if (g.flag[i]) return 'wrong';
        }
        return g.flag[i] ? 'flag' : 'hid';
      }

      function paint(i, look, extra) {
        const el = cells[i];
        const open = look[0] === 'n' || look === 'boom' || look === 'defused' || look === 'mine';
        el.className = 'ms-c ' + (open ? 'open ' : 'hid ') + look + (el.dataset.alt === '1' ? ' alt' : '') + (el.dataset.deco ? ' deco-' + el.dataset.deco : '') + (extra ? ' ' + extra : '');
        if (look[0] === 'n') el.innerHTML = look === 'n0' ? '' : `<span>${look.slice(1)}</span>`;
        else if (look === 'flag') el.innerHTML = SVG_FLAG;
        else if (look === 'wrong') el.innerHTML = SVG_FLAG + SVG_X;
        else if (look === 'mine' || look === 'boom' || look === 'defused') el.innerHTML = SVG_MINE;
        else el.innerHTML = '';
      }

      // delays: Map index → ms (ripple) ; anim: class to add for those cells
      function render(delays, anim) {
        for (let i = 0; i < cells.length; i++) {
          const lk = lookOf(i);
          if (lk === looks[i] && !(delays && delays.has(i))) continue;
          looks[i] = lk;
          if (delays && delays.has(i)) { paint(i, lk, anim); cells[i].style.setProperty('--d', delays.get(i) + 'ms'); }
          else { paint(i, lk); cells[i].style.removeProperty('--d'); }
        }
        ui.stat('mines', M.flagsLeft(g));
        const b = d.best[g.level]; ui.stat('best', b ? fmt(b) : '–');
        btnHint.disabled = g.state === 'won' || g.state === 'lost' || !!reveal;
      }

      /* ---------------- game flow ---------------- */
      function newGame(level) {
        g = M.create(level); cnt = null; reveal = null; busy = false;
        d.level = g.level; seg.set(g.level);
        grid.classList.remove('shake', 'won', 'lost');
        timer.reset(0);
        build(); render();
        // board entry animation
        cells.forEach((el, i) => { el.style.setProperty('--d', (((i % g.w) + ((i / g.w) | 0)) * 14) + 'ms'); el.classList.add('enter'); });
        later(() => cells.forEach(el => el.classList.remove('enter')), (g.w + g.h) * 14 + 400);
        save();
      }

      function save() {
        if (!g) return;
        if (g.state === 'play' || g.state === 'ready') d.cur = { g, ms: timer.ms };
        else d.cur = null;
        ctx.save();
      }

      function applyResult(res, i) {
        if (!res) return false;
        const first = !g.mines;
        g = res.g; if (!cnt || first) cnt = M.counts(g);
        if (g.state === 'play' && !timer.running) timer.start();
        const delays = new Map();
        res.opened.forEach(o => delays.set(o.i, Math.min(o.d * 24, 720)));
        render(delays, 'pop');
        if (res.opened.length > 1) ctx.sound(res.opened.length > 12 ? 'cascade' : 'pop');
        else if (res.opened.length === 1 && g.state !== 'lost') ctx.sound('tap');
        if (g.state === 'lost') onHit();
        else if (g.state === 'won') onWin();
        else save();
        return true;
      }

      function tapCell(i) {
        if (busy || reveal || g.state === 'won' || g.state === 'lost') return;
        if (flagMode && !g.open[i]) { flagCell(i); return; }
        if (g.flag[i]) { nudge(i); return; }
        if (g.open[i]) {
          const res = M.chord(g, i);
          if (res) applyResult(res, i); else if (cnt && cnt[i]) pulseNeighbors(i);
          return;
        }
        applyResult(M.reveal(g, i), i);
      }

      function flagCell(i) {
        if (busy || reveal) return;
        const n = M.toggleFlag(g, i); if (!n) return;
        g = n;
        render(new Map([[i, 0]]), g.flag[i] ? 'plant' : 'unplant');
        ctx.sound(g.flag[i] ? 'place' : 'tap');
        if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
        save();
      }

      function nudge(i) { const el = cells[i]; el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); later(() => el.classList.remove('nudge'), 320); }
      function pulseNeighbors(i) {
        M.nb(g, i).forEach(j => { if (!g.open[j] && !g.flag[j]) { cells[j].classList.add('peek'); later(() => cells[j].classList.remove('peek'), 260); } });
      }

      async function onHit() {
        busy = true; timer.stop();
        ctx.sound('crash'); if (navigator.vibrate) try { navigator.vibrate([60, 40, 90]); } catch (e) { }
        grid.classList.remove('shake'); void grid.offsetWidth; grid.classList.add('shake');
        if (!g.chance) {
          await wait(520);
          UI.modal({
            dismissible: false,
            html: `<div class="ms-chance">${SVG_MINE}<h3>${UI.escapeHtml(s('hitTitle'))}</h3><p>${UI.escapeHtml(s('hitText', { p: partnerName() }))}</p></div>`,
            actions: [
              { label: s('giveUp'), cls: 'btn-ghost', onClick: () => lose() },
              { label: s('watch'), cls: 'btn-ad', onClick: () => { secondChance(); } }
            ]
          });
        } else lose();
      }

      async function secondChance() {
        const ok = await ctx.ad();
        if (!alive) return;
        if (!ok) { lose(); return; }
        const hits = g.mines.map((mn, i) => mn && g.open[i] ? i : -1).filter(i => i >= 0 && g.defused.indexOf(i) < 0);
        g = M.defuse(g);
        busy = false;
        render(new Map(hits.map(i => [i, 0])), 'saved');
        ctx.toast(s('defused'), 'good');
        ctx.sound('ok');
        if (g.state === 'won') { onWin(); return; }
        timer.start(); save();
      }

      function lose() {
        if (!alive) return;
        reveal = 'lost'; busy = true;
        const hx = g.hit % g.w, hy = (g.hit / g.w) | 0;
        const delays = new Map();
        for (let i = 0; i < cells.length; i++) {
          if ((g.mines[i] && !g.open[i] && !g.flag[i]) || (g.flag[i] && !g.mines[i])) {
            const dist = Math.hypot(i % g.w - hx, ((i / g.w) | 0) - hy);
            delays.set(i, Math.round(dist * 55));
          }
        }
        render(delays, 'blast');
        grid.classList.add('lost');
        d.cur = null; ctx.save();
        const pct = clearedPct();
        later(() => {
          busy = false;
          Kit.result(ctx, { result: 'lose', title: s('loseTitle'), lines: [s('lineTime', { t: timer.text() }), s('cleared', { n: pct })], onAgain: () => newGame(g.level) });
        }, 900 + Math.min(900, Math.max(0, ...delays.values())));
      }

      function clearedPct() {
        let safe = 0, open = 0;
        for (let i = 0; i < cells.length; i++) if (!g.mines[i]) { safe++; if (g.open[i]) open++; }
        return Math.round(open / safe * 100);
      }

      function onWin() {
        reveal = 'won'; busy = true; timer.stop();
        const secs = timer.seconds, lvl = g.level;
        const prev = d.best[lvl], record = !prev || secs < prev;
        if (record) d.best[lvl] = secs;
        d.wins[lvl] = (d.wins[lvl] || 0) + 1;
        d.cur = null; ctx.save();
        ctx.badge('mines_win'); if (lvl === 'hard') ctx.badge('mines_hard');
        const delays = new Map();
        for (let i = 0; i < cells.length; i++) delays.set(i, ((i % g.w) + ((i / g.w) | 0)) * 22);
        render(delays, 'sweep');
        grid.classList.add('won');
        ctx.sound('bell');
        later(() => {
          busy = false;
          const lines = [s('lineTime', { t: fmt(secs) }), record ? s('newBest') : s('bestLine', { t: fmt(d.best[lvl]) })];
          if (g.chance) lines.push(s('chanceUsed'));
          Kit.result(ctx, { result: 'win', lines, stars: STARS[lvl], onAgain: () => newGame(lvl) });
        }, 700 + (g.w + g.h) * 22);
      }

      let hintT = 0;
      async function hint() {
        if (busy || reveal || g.state === 'won' || g.state === 'lost') return;
        busy = true;
        const ok = await Kit.useHelp(ctx);
        busy = false;
        if (!ok || !alive) return;
        const i = M.hintCell(g); if (i < 0) return;
        cells.forEach(el => el.classList.remove('hintc'));
        cells[i].classList.add('hintc');
        ctx.toast(s('hintSafe'));
        clearTimeout(hintT); hintT = setTimeout(() => cells[i] && cells[i].classList.remove('hintc'), 3000);
      }

      /* ---------------- input: tap, long-press, right-click ---------------- */
      let press = null;
      function cellAt(e) { const el = e.target.closest('.ms-c'); return el && grid.contains(el) ? +el.dataset.i : -1; }
      function onDown(e) {
        const i = cellAt(e); if (i < 0 || busy || reveal) return;
        if (e.button === 2) { e.preventDefault(); if (!g.open[i]) flagCell(i); press = null; return; }
        if (e.button > 0) return;
        press = { i, x: e.clientX, y: e.clientY, fired: false, id: e.pointerId };
        cells[i].classList.add('press');
        if (!g.open[i]) {
          press.t = setTimeout(() => {
            if (!press || press.i !== i) return;
            press.fired = true; cells[i].classList.remove('press');
            flagCell(i);
          }, LONG_PRESS);
        }
      }
      function cancelPress() { if (!press) return; clearTimeout(press.t); if (cells[press.i]) cells[press.i].classList.remove('press'); press = null; }
      function onMove(e) {
        if (!press || e.pointerId !== press.id) return;
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress();
      }
      function onUp(e) {
        if (!press || e.pointerId !== press.id) return;
        const p = press; cancelPress();
        if (p.fired || e.type === 'pointercancel') return;
        if (cellAt(e) !== p.i && e.pointerType === 'mouse') return;
        tapCell(p.i);
      }
      const onCtx = e => e.preventDefault();
      grid.addEventListener('pointerdown', onDown);
      grid.addEventListener('pointermove', onMove);
      grid.addEventListener('pointerup', onUp);
      grid.addEventListener('pointercancel', onUp);
      grid.addEventListener('pointerleave', cancelPress);
      grid.addEventListener('contextmenu', onCtx);

      let roT = 0;
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(() => { if (alive && g) fit(); }, 60); }) : null;
      if (ro) { ro.observe(ui.board); const sc = root.closest('.screen'); if (sc) ro.observe(sc); }

      /* ---------------- start / resume ---------------- */
      const saved = d.cur;
      if (saved && saved.g && M.valid(saved.g) && (saved.g.state === 'play' || saved.g.state === 'ready')) {
        g = saved.g; cnt = M.counts(g); d.level = g.level; seg.set(g.level);
        timer.reset(saved.ms || 0);
        build(); render();
        if (g.state === 'play') timer.start();
      } else newGame(d.level || 'easy');
      requestAnimationFrame(() => { if (alive) fit(); });

      root.__game = {
        engine: M,
        state: () => M.clone(g),
        tap: (x, y) => tapCell(y * g.w + x),
        flag: (x, y) => flagCell(y * g.w + x),
        newGame: lvl => newGame(lvl || g.level),
        cellSize: () => cs,
        // reveal every safe cell (test helper)
        solve: () => { if (!g.mines) tapCell(((g.h / 2) | 0) * g.w + ((g.w / 2) | 0)); for (let i = 0; i < g.w * g.h && g.state === 'play'; i++) if (!g.mines[i] && !g.open[i]) { if (g.flag[i]) g = M.toggleFlag(g, i); applyResult(M.reveal(g, i), i); } },
        hitMine: () => { if (!g.mines) return false; const i = g.mines.findIndex((mn, k) => mn && !g.flag[k] && !g.open[k]); return i >= 0 && applyResult(M.reveal(g, i), i); }
      };

      return {
        destroy() {
          alive = false;
          if (g && g.state === 'play' && !reveal) save();
          timer.stop(); cancelPress();
          timers.forEach(clearTimeout); timers.clear(); clearTimeout(hintT); clearTimeout(roT);
          if (ro) ro.disconnect();
          grid.removeEventListener('pointerdown', onDown);
          grid.removeEventListener('pointermove', onMove);
          grid.removeEventListener('pointerup', onUp);
          grid.removeEventListener('pointercancel', onUp);
          grid.removeEventListener('pointerleave', cancelPress);
          grid.removeEventListener('contextmenu', onCtx);
          delete root.__game;
        }
      };
    }
  });
})();
