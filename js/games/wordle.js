// Wort des Tages / Слово дня: a daily five-letter word puzzle (six tries, coloured feedback).
// Language follows LANG (German with Ä Ö Ü, or Russian with Ё → Е). After every game the word is
// explained in the other language, which helps language learners. Partner: p4 (Bildung & Integration).
// Word lists live in js/games/wordle-words.js (window.WORDLE_WORDS), loaded before this file.
(function () {
  'use strict';

  /* ================= pure logic (no DOM) ================= */
  const ROWS = 6, LEN = 5;
  const ALPHA = { de: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ', ru: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' };
  const STAR_TABLE = [0, 30, 20, 15, 10, 7, 5];
  const DAILY_BONUS = 5;

  function norm(w, lang) {
    w = String(w == null ? '' : w).trim().toUpperCase();
    return lang === 'ru' ? w.replace(/Ё/g, 'Е') : w;
  }

  // src: {answers: "disp=translation|…", valid: "WORD WORD …"} → {answers:[{w,disp,art,word,tr}], map, valid:Set}
  function parse(src, lang) {
    const answers = [], map = new Map();
    String((src && src.answers) || '').split('|').forEach(entry => {
      const i = entry.indexOf('='); if (i < 0) return;
      const disp = entry.slice(0, i).trim(), tr = entry.slice(i + 1).trim();
      const toks = disp.split(/\s+/), word = toks[toks.length - 1];
      const w = norm(word, lang);
      if (w.length !== LEN || map.has(w) || [...w].some(c => !ALPHA[lang].includes(c))) return;
      const o = { w, disp, word, art: toks.slice(0, -1).join(' '), tr };
      answers.push(o); map.set(w, o);
    });
    const valid = new Set(String((src && src.valid) || '').split(/\s+/).map(x => norm(x, lang)).filter(x => x.length === LEN));
    answers.forEach(a => valid.add(a.w));
    return { answers, map, valid };
  }

  // Colour a guess against the answer: 'c' correct spot, 'p' in word, 'a' absent.
  // Two passes so duplicate letters are only marked as often as they occur in the answer.
  function evaluate(guess, answer) {
    const g = [...guess], a = [...answer], res = new Array(LEN).fill('a'), left = {};
    for (let i = 0; i < LEN; i++) {
      if (g[i] === a[i]) res[i] = 'c';
      else left[a[i]] = (left[a[i]] || 0) + 1;
    }
    for (let i = 0; i < LEN; i++) {
      if (res[i] !== 'c' && left[g[i]] > 0) { res[i] = 'p'; left[g[i]]--; }
    }
    return res;
  }

  // Best known state per letter for the on-screen keyboard (hinted letters count as correct).
  function keyStates(guesses, answer, hints) {
    const rank = { a: 1, p: 2, c: 3 }, m = {};
    guesses.forEach(g => {
      const r = evaluate(g, answer), gl = [...g];
      gl.forEach((L, i) => { if (!m[L] || rank[r[i]] > rank[m[L]]) m[L] = r[i]; });
    });
    (hints || []).forEach(i => { m[[...answer][i]] = 'c'; });
    return m;
  }

  function knownPositions(guesses, answer, hints) {
    const k = new Set(hints || []);
    guesses.forEach(g => evaluate(g, answer).forEach((s, i) => { if (s === 'c') k.add(i); }));
    return k;
  }

  // Position for a hint: one not yet known; at least one position always stays a secret.
  function pickHint(guesses, answer, hints, rnd) {
    const k = knownPositions(guesses, answer, hints);
    const free = []; for (let i = 0; i < LEN; i++) if (!k.has(i)) free.push(i);
    if (free.length <= 1) return -1;
    return free[Math.floor((rnd || Math.random)() * free.length)];
  }

  function starsFor(tries, daily) {
    const base = STAR_TABLE[tries] || 0;
    return base ? base + (daily ? DAILY_BONUS : 0) : 0;
  }

  const pad = n => String(n).padStart(2, '0');
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function keyToDate(k) { const p = String(k).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function prevDayKey(d) { return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)); }
  function dayNumber(d) { return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5) + 1; }
  function msToMidnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - d; }
  // Daily word index from Kit.daySeed(): same date → same word for everybody.
  function dailyIndex(seed, n, rngFn) { const r = rngFn(seed); r(); return Math.floor(r() * n); }

  function shareText(o) {
    const sq = o.hc ? { c: '🟧', p: '🟦', a: '⬜' } : { c: '🟩', p: '🟨', a: '⬜' };
    const head = `GoodPlay · ${o.title} #${o.no} ${o.won ? o.guesses.length : 'X'}/${ROWS}${o.hints ? ' 💡' + o.hints : ''}`;
    return [head, ...o.guesses.map(g => evaluate(g, o.answer).map(s => sq[s]).join(''))].join('\n');
  }

  function blankStats() { return { played: 0, wins: 0, cur: 0, max: 0, dist: [0, 0, 0, 0, 0, 0], last: '', lastN: 0 }; }
  // Daily streak = daily words won on consecutive days; practice streak = consecutive wins.
  function recordResult(S, won, tries, daily, today, yesterday) {
    S.played++;
    if (won) { S.wins++; S.dist[tries - 1]++; }
    if (daily) {
      if (won) { S.cur = S.last === yesterday ? S.cur + 1 : S.last === today ? S.cur : 1; S.last = today; }
      else S.cur = 0;
    } else S.cur = won ? S.cur + 1 : 0;
    S.max = Math.max(S.max, S.cur); S.lastN = won ? tries : 0;
    return S;
  }
  function shownStreak(S, daily, today, yesterday) { return !daily || S.last === today || S.last === yesterday ? S.cur : 0; }

  const Logic = { ROWS, LEN, ALPHA, norm, parse, evaluate, keyStates, knownPositions, pickHint, starsFor, dayKey, keyToDate, prevDayKey, dayNumber, msToMidnight, dailyIndex, shareText, blankStats, recordResult, shownStreak };
  window.WordleLogic = Logic;

  /* ================= presentation ================= */
  const KB = {
    de: ['QWERTZUIOPÜ', 'ASDFGHJKLÖÄ', '+YXCVBNM-'],
    ru: ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', '+ЯЧСМИТЬБЮ-']
  };
  // Physical keys on a Latin layout → ЙЦУКЕН, and the German umlaut positions on a US layout.
  const RU_CODE = { KeyQ: 'Й', KeyW: 'Ц', KeyE: 'У', KeyR: 'К', KeyT: 'Е', KeyY: 'Н', KeyU: 'Г', KeyI: 'Ш', KeyO: 'Щ', KeyP: 'З', BracketLeft: 'Х', BracketRight: 'Ъ', KeyA: 'Ф', KeyS: 'Ы', KeyD: 'В', KeyF: 'А', KeyG: 'П', KeyH: 'Р', KeyJ: 'О', KeyK: 'Л', KeyL: 'Д', Semicolon: 'Ж', Quote: 'Э', KeyZ: 'Я', KeyX: 'Ч', KeyC: 'С', KeyV: 'М', KeyB: 'И', KeyN: 'Т', KeyM: 'Ь', Comma: 'Б', Period: 'Ю', Backquote: 'Е' };
  const DE_CODE = { BracketLeft: 'Ü', Semicolon: 'Ö', Quote: 'Ä' };

  const ICON = {
    enter: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 5v7a3 3 0 0 1-3 3H6"/><path d="M10 11l-4 4 4 4"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
    stats: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V12M10 20V6M15 20v-9M20 20V9"/></svg>',
    contrast: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/></svg>',
    help: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.1-2.4 3.6"/><path d="M12 17h.01"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12M7 8l5-5 5 5"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.6"/><path d="M20 3.5v5.1h-5.1"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.4"/><path d="M4 20.5v-5.1h5.1"/></svg>'
  };

  const STR = {
    de: {
      daily: 'Täglich', free: 'Training', shareTitle: 'Wort des Tages', notWord: 'Nicht im Wörterbuch', short: 'Zu wenige Buchstaben',
      tryN: 'Versuch {n} von 6', dailyNo: 'Wort Nr. {n}', solvedShort: 'gelöst in {n}/6', notSolved: 'nicht gelöst',
      next: 'Nächstes Wort in', explain: 'Wort-Erklärung', inLang: 'Russisch', share: 'Teilen', copied: 'Ergebnis kopiert – jetzt einfügen und teilen',
      copyManual: 'Text markieren und kopieren:', newWord: 'Neues Wort', practice: 'Training spielen', stats: 'Statistik',
      played: 'Gespielt', winPct: 'Siege %', streak: 'Serie', maxStreak: 'Beste Serie', dist: 'Verteilung der Versuche',
      hcOn: 'Hoher Kontrast an', hcOff: 'Hoher Kontrast aus', hintNone: 'Mehr Tipps gibt es für dieses Wort nicht',
      hintGot: 'Tipp: Buchstabe {p} ist „{l}“', hintDone: 'Das Spiel ist schon vorbei', solved: 'Gelöst in {n} von 6 Versuchen',
      dailyBonus: 'Tagesbonus +5 ⭐', lostT: 'Knapp daneben', wordWas: 'Das gesuchte Wort war:', hint: 'Tipp', contrast: 'Kontrast',
      rules: 'Regeln', winT: ['Unglaublich!', 'Fantastisch!', 'Ausgezeichnet!', 'Sehr gut!', 'Gut gemacht!', 'Knapp geschafft!'],
      rulesTitle: 'Wort des Tages – Regeln',
      ex1: 'S ist im Wort und an der richtigen Stelle.', ex2: 'U ist im Wort, aber an einer anderen Stelle.', ex3: 'Z kommt im Wort nicht vor.',
      rulesHtml: '<p>Errate das gesuchte Wort in <b>6 Versuchen</b>. Jeder Versuch muss ein gültiges Wort mit 5 Buchstaben sein – tippe es ein und bestätige mit ⏎.</p><p>Die Farben zeigen nach jedem Versuch, wie nah du dran bist:</p>{ex}<ul><li><b>Ä, Ö, Ü</b> sind eigene Buchstaben. Wörter mit ß kommen nicht vor.</li><li>Doppelte Buchstaben werden einzeln bewertet: nur so oft farbig, wie sie im Wort vorkommen.</li><li><b>Täglich:</b> ein Wort für alle, jeden Tag neu, mit Teilen-Funktion. <b>Training:</b> unbegrenzt viele Wörter.</li><li><b>Tipp</b> deckt einen richtigen Buchstaben auf: erst ein gespeicherter Tipp, sonst eine Werbung, die an den Partner spendet.</li><li><b>Sterne:</b> 1 Versuch 30 · 2: 20 · 3: 15 · 4: 10 · 5: 7 · 6: 5. Das Tageswort bringt +5.</li><li>Nach jedem Spiel zeigt die <b>Wort-Erklärung</b> die Bedeutung auf Russisch – ideal zum Sprachenlernen.</li></ul>'
    },
    ru: {
      daily: 'Дневное', free: 'Тренировка', shareTitle: 'Слово дня', notWord: 'Нет в словаре', short: 'Недостаточно букв',
      tryN: 'Попытка {n} из 6', dailyNo: 'Слово № {n}', solvedShort: 'угадано за {n}/6', notSolved: 'не угадано',
      next: 'Новое слово через', explain: 'Значение слова', inLang: 'по-немецки', share: 'Поделиться', copied: 'Результат скопирован — вставь и поделись',
      copyManual: 'Выдели текст и скопируй:', newWord: 'Новое слово', practice: 'Играть тренировку', stats: 'Статистика',
      played: 'Сыграно', winPct: 'Побед %', streak: 'Серия', maxStreak: 'Лучшая серия', dist: 'Распределение попыток',
      hcOn: 'Высокий контраст включён', hcOff: 'Высокий контраст выключен', hintNone: 'Больше подсказок для этого слова нет',
      hintGot: 'Подсказка: буква {p} — «{l}»', hintDone: 'Игра уже окончена', solved: 'Угадано за {n} из 6 попыток',
      dailyBonus: 'Бонус дня +5 ⭐', lostT: 'Почти получилось', wordWas: 'Загаданное слово:', hint: 'Подсказка', contrast: 'Контраст',
      rules: 'Правила', winT: ['Невероятно!', 'Фантастика!', 'Великолепно!', 'Очень хорошо!', 'Молодец!', 'На волоске!'],
      rulesTitle: 'Слово дня — правила',
      ex1: 'Буква С есть в слове и стоит на своём месте.', ex2: 'Буква У есть в слове, но в другом месте.', ex3: 'Буквы Ж в слове нет.',
      rulesHtml: '<p>Угадай загаданное слово за <b>6 попыток</b>. Каждая попытка — существующее слово из 5 букв: набери его и нажми ⏎.</p><p>После каждой попытки цвет подсказывает, насколько ты близко:</p>{ex}<ul><li><b>Ё</b> пишется как Е, <b>Й</b> — отдельная буква.</li><li>Повторяющиеся буквы оцениваются отдельно: окрашиваются столько раз, сколько встречаются в слове.</li><li><b>Дневное:</b> одно слово для всех, каждый день новое, можно поделиться результатом. <b>Тренировка:</b> сколько угодно слов.</li><li><b>Подсказка</b> открывает одну верную букву: сначала сохранённая подсказка, иначе реклама — она приносит пожертвование партнёру.</li><li><b>Звёзды:</b> 1 попытка 30 · 2: 20 · 3: 15 · 4: 10 · 5: 7 · 6: 5. Слово дня даёт +5.</li><li>После игры <b>значение слова</b> показывается по-немецки — удобно для изучения языка.</li></ul>'
    }
  };

  // Used only if wordle-words.js is missing, so the game still starts.
  const FALLBACK = {
    de: { answers: 'das Haus=дом|der Baum=дерево|die Katze=кошка|das Licht=свет|die Blume=цветок|der Tisch=стол|die Sonne=солнце|lesen=читать', valid: '' },
    ru: { answers: 'книга=das Buch|слово=das Wort|школа=die Schule|город=die Stadt|кошка=die Katze|птица=der Vogel|лампа=die Lampe|ветер=der Wind', valid: '' }
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  Games.register({
    id: 'wordle', icon: '🔤', partner: 'p4', isNew: true,
    name: { de: 'Wort des Tages', ru: 'Слово дня' },
    tagline: { de: 'Errate das Wort in sechs Versuchen – jeden Tag ein neues.', ru: 'Угадай слово за шесть попыток — каждый день новое.' },
    badges: [
      { id: 'wordle_win', icon: '🔤', name: { de: 'Erstes Wort erraten', ru: 'Первое слово угадано' } },
      { id: 'wordle_streak7', icon: '🔥', name: { de: '7 Tage in Folge', ru: '7 дней подряд' } }
    ],
    thumb() {
      const col = { c: '#22c55e', p: '#f59e0b', a: 'rgba(255,255,255,.22)' };
      const rows = [['LEBEN', 'ccaap'], ['LERNT', 'ccccc']];
      let tiles = '';
      rows.forEach(([w, st], r) => [...w].forEach((ch, i) => {
        const x = 17 + i * 26, y = 12 + r * 32;
        tiles += `<rect x="${x}" y="${y + 1.5}" width="22" height="22" rx="5" fill="rgba(0,0,0,.18)"/><rect x="${x}" y="${y}" width="22" height="22" rx="5" fill="${col[st[i]]}"/><text x="${x + 11}" y="${y + 15.5}" text-anchor="middle" font-family="Segoe UI,system-ui,sans-serif" font-size="12.5" font-weight="800" fill="#fff">${ch}</text>`;
      }));
      return `<defs><linearGradient id="wd-tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4338ca"/><stop offset=".55" stop-color="#6d28d9"/><stop offset="1" stop-color="#0f766e"/></linearGradient></defs>
        <rect width="160" height="80" fill="url(#wd-tg)"/><circle cx="146" cy="6" r="30" fill="#fff" opacity=".07"/><circle cx="8" cy="78" r="24" fill="#fff" opacity=".06"/>
        <path d="M152 52l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z" fill="#fde68a" opacity=".9"/>${tiles}`;
    },

    mount(root, ctx) {
      const lang = LANG === 'ru' ? 'ru' : 'de';
      const s = Kit.strings(STR);
      const src = (window.WORDLE_WORDS && window.WORDLE_WORDS[lang]) || FALLBACK[lang];
      const W = parse(src, lang);
      const alpha = ALPHA[lang];

      // ---- persistent data ----
      const d = ctx.data;
      d.stats = d.stats || {}; d.games = d.games || {};
      const st = d.stats[lang] = d.stats[lang] || {};
      st.daily = Object.assign(blankStats(), st.daily); st.free = Object.assign(blankStats(), st.free);
      const gs = d.games[lang] = d.games[lang] || {};
      if (d.mode !== 'free') d.mode = 'daily';
      const save = () => ctx.save();

      // ---- runtime ----
      const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      let FLIP = reduce ? 0 : 500, STAG = reduce ? 0 : 280;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms); timers.add(t); return t; };
      let dead = false, busy = false, G = null, cdIv = null, toastT = null;

      // ---- layout ----
      const ui = Kit.shell(root, { top: true, cls: 'wd-board' });
      ui.el.classList.add('wd');
      const seg = Kit.segmented([{ id: 'daily', label: s('daily') }, { id: 'free', label: s('free') }], d.mode, m => setMode(m));
      seg.el.classList.add('wd-seg');
      ui.top.appendChild(seg.el);
      const icons = document.createElement('div'); icons.className = 'wd-icons';
      icons.innerHTML = `
        <button class="wd-ib" data-a="hint" title="${esc(s('hint'))}" aria-label="${esc(s('hint'))}">${ICON.bulb}<i class="wd-badge"></i></button>
        <button class="wd-ib" data-a="stats" title="${esc(s('stats'))}" aria-label="${esc(s('stats'))}">${ICON.stats}</button>
        <button class="wd-ib" data-a="hc" title="${esc(s('contrast'))}" aria-label="${esc(s('contrast'))}" aria-pressed="false">${ICON.contrast}</button>
        <button class="wd-ib" data-a="rules" title="${esc(s('rules'))}" aria-label="${esc(s('rules'))}">${ICON.help}</button>`;
      ui.top.appendChild(icons);
      const hintBtn = icons.querySelector('[data-a="hint"]'), hcBtn = icons.querySelector('[data-a="hc"]');
      icons.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        ctx.sound('click');
        const a = b.dataset.a;
        if (a === 'hint') askHint(); else if (a === 'stats') openStats(d.mode); else if (a === 'hc') toggleHc(); else if (a === 'rules') openRules();
      });

      ui.board.innerHTML = `<div class="wd-grid" role="grid">${Array.from({ length: ROWS }, () => `<div class="wd-row" role="row">${'<div class="wd-tile" role="gridcell"></div>'.repeat(LEN)}</div>`).join('')}</div><div class="wd-toast" role="status"></div>`;
      const rowEls = [...ui.board.querySelectorAll('.wd-row')];
      const tileEls = rowEls.map(r => [...r.children]);
      const toastEl = ui.board.querySelector('.wd-toast');

      ui.tools.classList.add('wd-bottom');
      ui.tools.innerHTML = `<div class="wd-kb">${KB[lang].map(row => `<div class="wd-kr">${[...row].map(ch =>
        ch === '+' ? `<button class="wd-key wd-wide" data-k="ENTER" tabindex="-1" aria-label="Enter">${ICON.enter}</button>`
          : ch === '-' ? `<button class="wd-key wd-wide" data-k="BACK" tabindex="-1" aria-label="Backspace">${ICON.back}</button>`
            : `<button class="wd-key" data-k="${ch}" tabindex="-1">${ch}</button>`).join('')}</div>`).join('')}</div><div class="wd-end" hidden></div>`;
      const kbEl = ui.tools.querySelector('.wd-kb'), endEl = ui.tools.querySelector('.wd-end');
      const keyEls = {}; kbEl.querySelectorAll('[data-k]').forEach(b => { keyEls[b.dataset.k] = b; });
      kbEl.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
      endEl.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        ctx.sound('click');
        if (b.dataset.a === 'share') share(); else if (b.dataset.a === 'new') newFreeGame(); else if (b.dataset.a === 'practice') setMode('free'); else if (b.dataset.a === 'stats') openStats(d.mode);
      });

      // ---- game state ----
      function todayKey() { return dayKey(new Date()); }
      function dailyAnswer() { return W.answers[dailyIndex(Kit.daySeed(lang === 'ru' ? 11 : 3), W.answers.length, Kit.rng)].w; }
      function freshGame(answer, day) { return { day: day || '', answer, guesses: [], hints: [], cur: '', done: false, won: false, rewarded: false }; }
      function newFreeAnswer() {
        const avoid = new Set([gs.daily && gs.daily.answer, gs.free && gs.free.answer]);
        let w, n = 0;
        do { w = W.answers[Math.floor(Math.random() * W.answers.length)].w; } while (avoid.has(w) && ++n < 20);
        return w;
      }
      function valid(g) { return g && W.map.has(g.answer) && Array.isArray(g.guesses) && Array.isArray(g.hints) && typeof g.cur === 'string'; }

      function loadGame() {
        stopCountdown();
        if (d.mode === 'daily') {
          const today = todayKey();
          if (!valid(gs.daily) || gs.daily.day !== today) gs.daily = freshGame(dailyAnswer(), today);
          G = gs.daily;
        } else {
          if (!valid(gs.free)) gs.free = freshGame(newFreeAnswer());
          G = gs.free;
        }
        save();
        busy = false;
        ui.board.classList.remove('wd-win');
        renderAll();
        if (G.done && !G.rewarded) later(showResult, 350);
      }

      // ---- rendering ----
      function setTile(t, ch, state, ghost) {
        t.textContent = ch || ghost || '';
        t.classList.toggle('wd-filled', !!ch && !state);
        t.classList.toggle('wd-ghost', !ch && !!ghost);
        if (state) t.dataset.s = state; else delete t.dataset.s;
      }
      function renderRow(r) {
        const tiles = tileEls[r], g = G.guesses[r];
        if (g) { const res = evaluate(g, G.answer), gl = [...g]; tiles.forEach((t, i) => setTile(t, gl[i], res[i])); return; }
        const active = r === G.guesses.length && !G.done, cur = [...G.cur], ans = [...G.answer];
        tiles.forEach((t, i) => setTile(t, active ? cur[i] : '', '', active && G.hints.includes(i) ? ans[i] : ''));
      }
      function renderKeys() {
        const m = keyStates(G.guesses, G.answer, G.hints);
        Object.keys(keyEls).forEach(k => { if (k.length === 1) { if (m[k]) keyEls[k].dataset.s = m[k]; else delete keyEls[k].dataset.s; } });
      }
      function renderStatus() {
        const n = G.guesses.length;
        const head = d.mode === 'daily' ? s('dailyNo', { n: dayNumber(keyToDate(G.day)) }) : s('free');
        const tail = G.done ? (G.won ? s('solvedShort', { n }) : s('notSolved')) : s('tryN', { n: n + 1 });
        ui.msg(`${head} · ${tail}`, G.done ? (G.won ? 'good' : '') : '');
      }
      function renderHintBtn() {
        const h = (window.State && State.data && State.data.hints) || 0;
        const badge = hintBtn.querySelector('.wd-badge');
        badge.textContent = h > 0 ? String(h) : '▶';
        badge.classList.toggle('wd-ad', h <= 0);
        hintBtn.disabled = G.done || busy;
      }
      function renderBottom() {
        kbEl.hidden = G.done; endEl.hidden = !G.done;
        if (!G.done) return;
        const A = W.map.get(G.answer) || { word: G.answer, art: '', tr: '' };
        const daily = d.mode === 'daily';
        endEl.innerHTML = `<div class="wd-card">
          <div class="wd-lbl">${esc(s('explain'))}</div>
          <div class="wd-word">${A.art ? `<small>${esc(A.art)}</small> ` : ''}<b>${esc(A.word)}</b></div>
          <div class="wd-tr"><span class="wd-flag">${lang === 'de' ? 'RU' : 'DE'}</span><span>${esc(A.tr)}</span></div>
          <div class="wd-actions">
            ${daily ? `<button class="wd-btn wd-primary" data-a="share">${ICON.share}<span>${esc(s('share'))}</span></button>`
            : `<button class="wd-btn wd-primary" data-a="new">${ICON.next}<span>${esc(s('newWord'))}</span></button>`}
            <button class="wd-btn" data-a="stats">${ICON.stats}<span>${esc(s('stats'))}</span></button>
          </div>
          ${daily ? `<div class="wd-next">${esc(s('next'))} <b class="wd-cd">--:--:--</b> · <button class="wd-link" data-a="practice">${esc(s('practice'))}</button></div>` : ''}
        </div>`;
        if (daily) startCountdown();
      }
      function renderAll() {
        for (let r = 0; r < ROWS; r++) renderRow(r);
        renderKeys(); renderStatus(); renderHintBtn(); renderBottom();
        ui.el.classList.toggle('wd-hc', !!d.hc);
        hcBtn.classList.toggle('on', !!d.hc); hcBtn.setAttribute('aria-pressed', d.hc ? 'true' : 'false');
      }

      // ---- micro animations ----
      function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
      function pop(t) { if (!reduce) restart(t, 'wd-pop'); }
      function shake(r) { restart(rowEls[r], 'wd-shake'); later(() => rowEls[r].classList.remove('wd-shake'), 500); }
      function toast(msg) {
        toastEl.textContent = msg; toastEl.classList.add('show');
        if (toastT) { clearTimeout(toastT); timers.delete(toastT); }
        toastT = later(() => toastEl.classList.remove('show'), 1700);
      }
      function reveal(r, done) {
        const res = evaluate(G.guesses[r], G.answer), tiles = tileEls[r];
        if (FLIP) ctx.sound('whoosh');
        tiles.forEach((t, i) => {
          t.style.setProperty('--wd-d', (i * STAG) + 'ms'); t.style.setProperty('--wd-f', FLIP + 'ms');
          if (FLIP) t.classList.add('wd-flip');
          later(() => { t.dataset.s = res[i]; t.classList.remove('wd-filled'); if (FLIP && i === LEN - 1) ctx.sound(res.every(x => x === 'c') ? 'match' : 'tick'); }, i * STAG + FLIP / 2);
        });
        later(() => { tiles.forEach(t => t.classList.remove('wd-flip')); done(); }, (LEN - 1) * STAG + FLIP + 40);
      }
      function bounce(r) {
        ui.board.classList.add('wd-win');
        if (reduce) return;
        tileEls[r].forEach((t, i) => { t.style.setProperty('--wd-d', (i * 95) + 'ms'); restart(t, 'wd-bounce'); });
        later(() => tileEls[r].forEach(t => t.classList.remove('wd-bounce')), 1100);
      }

      // ---- input ----
      function press(k) {
        if (dead || busy || !G || G.done) return;
        if (k === 'ENTER') return submit();
        const r = G.guesses.length;
        if (k === 'BACK') {
          if (!G.cur.length) return;
          G.cur = [...G.cur].slice(0, -1).join(''); ctx.sound('click'); renderRow(r); save(); return;
        }
        if (typeof k !== 'string' || k.length !== 1 || !alpha.includes(k) || [...G.cur].length >= LEN) return;
        G.cur += k; ctx.sound('tap'); renderRow(r); pop(tileEls[r][[...G.cur].length - 1]); save();
      }
      function submit() {
        const r = G.guesses.length, w = G.cur;
        if ([...w].length < LEN) { shake(r); toast(s('short')); ctx.sound('bad'); return; }
        if (!W.valid.has(w)) { shake(r); toast(s('notWord')); ctx.sound('bad'); return; }
        G.guesses.push(w); G.cur = '';
        const won = w === G.answer;
        if (won || G.guesses.length >= ROWS) {
          G.done = true; G.won = won;
          const now = new Date();
          recordResult(st[d.mode], won, G.guesses.length, d.mode === 'daily', dayKey(now), prevDayKey(now));
        }
        save();
        busy = true; renderHintBtn();
        const game = G;
        reveal(r, () => {
          if (game !== G) return;
          busy = false;
          renderKeys(); renderStatus(); renderHintBtn();
          if (G.done) {
            if (G.won) bounce(r);
            later(() => { if (game === G) { renderBottom(); showResult(); } }, G.won ? 900 : 450);
          } else renderRow(r + 1);
        });
      }

      function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || !root.isConnected) return;
        if (document.querySelector('#modal-root .modal-backdrop')) return;
        const tg = e.target;
        if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
        let k = null;
        if (e.key === 'Enter') k = 'ENTER';
        else if (e.key === 'Backspace') k = 'BACK';
        else if (e.key && e.key.length === 1) {
          const c = norm(e.key, lang);
          if (alpha.includes(c)) k = c;
          else if (lang === 'ru' && RU_CODE[e.code]) k = RU_CODE[e.code];
          else if (lang === 'de' && DE_CODE[e.code]) k = DE_CODE[e.code];
        }
        if (!k) return;
        e.preventDefault();
        const b = keyEls[k];
        if (b && !kbEl.hidden) { restart(b, 'wd-press'); later(() => b.classList.remove('wd-press'), 140); }
        press(k);
      }
      document.addEventListener('keydown', onKey);

      // ---- hints ----
      async function askHint() {
        if (busy || !G) return;
        if (G.done) { toast(s('hintDone')); return; }
        if (pickHint(G.guesses, G.answer, G.hints) < 0) { toast(s('hintNone')); return; }
        const game = G;
        const ok = await Kit.useHelp(ctx);
        renderHintBtn();
        if (!ok || dead || game !== G || G.done) return;
        applyHint();
      }
      function applyHint() {
        const pos = pickHint(G.guesses, G.answer, G.hints);
        if (pos < 0) { toast(s('hintNone')); return -1; }
        G.hints.push(pos); save();
        renderRow(G.guesses.length); renderKeys(); renderHintBtn();
        const t = tileEls[G.guesses.length][pos]; if (t) pop(t);
        toast(s('hintGot', { p: pos + 1, l: [...G.answer][pos] }));
        return pos;
      }

      // ---- result, stars, badges ----
      function explainLine(A) { return `${A.art ? A.art + ' ' : ''}${A.word} — ${A.tr}`; }
      function showResult() {
        if (!G || !G.done || G.rewarded) return;
        G.rewarded = true; save();
        const daily = d.mode === 'daily', n = G.guesses.length;
        const A = W.map.get(G.answer) || { word: G.answer, art: '', tr: '' };
        const again = daily ? () => setMode('free') : () => newFreeGame();
        const againLabel = daily ? s('practice') : s('newWord');
        if (G.won) {
          ctx.badge('wordle_win');
          if (daily && st.daily.cur >= 7) ctx.badge('wordle_streak7');
          Kit.result(ctx, {
            result: 'win', title: s('winT')[n - 1],
            lines: [explainLine(A), s('solved', { n }) + (daily ? ' · ' + s('dailyBonus') : '')],
            stars: starsFor(n, daily), onAgain: again, againLabel,
            onNext: daily ? share : null, nextLabel: s('share')
          });
        } else {
          Kit.result(ctx, { result: 'lose', title: s('lostT'), lines: [s('wordWas'), explainLine(A)], onAgain: again, againLabel, onNext: daily ? share : null, nextLabel: s('share') });
        }
      }

      // ---- modes ----
      function setMode(m) {
        if (m !== 'daily' && m !== 'free') return;
        if (busy) { seg.set(d.mode); return; }
        d.mode = m; seg.set(m); loadGame();
      }
      function newFreeGame() {
        if (busy) return;
        gs.free = freshGame(newFreeAnswer());
        if (d.mode !== 'free') { d.mode = 'free'; seg.set('free'); }
        loadGame();
      }

      // ---- countdown to the next daily word ----
      function startCountdown() {
        stopCountdown();
        const tick = () => {
          const el = endEl.querySelector('.wd-cd');
          if (d.mode !== 'daily' || !G || G.day !== todayKey()) { stopCountdown(); if (d.mode === 'daily' && !busy) loadGame(); return; }
          const ms = msToMidnight(new Date()), sec = Math.max(0, Math.floor(ms / 1000));
          if (el) el.textContent = `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
        };
        tick(); cdIv = setInterval(tick, 1000);
      }
      function stopCountdown() { if (cdIv) { clearInterval(cdIv); cdIv = null; } }

      // ---- share ----
      function share() {
        if (!G || !G.done) return;
        const text = shareText({ title: s('shareTitle'), no: dayNumber(keyToDate(G.day)), guesses: G.guesses, answer: G.answer, won: G.won, hc: !!d.hc, hints: G.hints.length });
        copyText(text).then(ok => {
          if (dead) return;
          if (ok) { toast(s('copied')); ctx.sound('ok'); }
          else ctx.modal({ title: s('share'), html: `<p>${esc(s('copyManual'))}</p><textarea class="wd-copy" readonly rows="8">${esc(text)}</textarea>`, actions: [{ label: Kit.t('close'), cls: 'btn-primary' }] });
        });
      }
      function copyText(text) {
        const legacy = () => {
          try {
            const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
            document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
          } catch (e) { return false; }
        };
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => legacy());
        return Promise.resolve(legacy());
      }

      // ---- dialogs ----
      function exampleRow(word, idx, state) {
        return `<div class="wd-ex">${[...word].map((ch, i) => `<span class="wd-tile wd-mini"${i === idx ? ` data-s="${state}"` : ''}>${ch}</span>`).join('')}</div>`;
      }
      function openRules() {
        const ex = lang === 'de'
          ? exampleRow('STERN', 0, 'c') + `<p class="wd-exl">${esc(s('ex1'))}</p>` + exampleRow('BLUME', 2, 'p') + `<p class="wd-exl">${esc(s('ex2'))}</p>` + exampleRow('KATZE', 3, 'a') + `<p class="wd-exl">${esc(s('ex3'))}</p>`
          : exampleRow('СОСНА', 0, 'c') + `<p class="wd-exl">${esc(s('ex1'))}</p>` + exampleRow('ГРУША', 2, 'p') + `<p class="wd-exl">${esc(s('ex2'))}</p>` + exampleRow('ЖИВОТ', 0, 'a') + `<p class="wd-exl">${esc(s('ex3'))}</p>`;
        Kit.rules(s('rulesTitle'), `<div class="wd-rules${d.hc ? ' wd-hc' : ''}">${s('rulesHtml').replace('{ex}', ex)}</div>`);
      }
      function openStats(tab) {
        const m = ctx.modal({
          title: s('stats'),
          html: `<div class="wd-st"><div class="wd-st-tabs"><button data-t="daily">${esc(s('daily'))}</button><button data-t="free">${esc(s('free'))}</button></div><div class="wd-st-body"></div></div>`,
          actions: [{ label: Kit.t('close'), cls: 'btn-primary' }]
        });
        const body = m.box.querySelector('.wd-st-body'), tabs = m.box.querySelectorAll('[data-t]');
        const draw = t => {
          tabs.forEach(b => b.classList.toggle('on', b.dataset.t === t));
          const S = st[t], now = new Date();
          const pct = S.played ? Math.round(S.wins / S.played * 100) : 0;
          const streak = shownStreak(S, t === 'daily', dayKey(now), prevDayKey(now));
          const top = Math.max(1, ...S.dist);
          const hl = G && G.done && G.won && d.mode === t ? G.guesses.length : 0;
          body.innerHTML = `<div class="wd-st-nums">
              <div><b>${S.played}</b><span>${esc(s('played'))}</span></div>
              <div><b>${pct}</b><span>${esc(s('winPct'))}</span></div>
              <div><b>${streak}</b><span>${esc(s('streak'))}</span></div>
              <div><b>${S.max}</b><span>${esc(s('maxStreak'))}</span></div>
            </div>
            <div class="wd-st-h">${esc(s('dist'))}</div>
            <div class="wd-dist">${S.dist.map((v, i) => `<div class="wd-bar${hl === i + 1 ? ' hl' : ''}"><span>${i + 1}</span><div><i style="width:${Math.max(7, Math.round(v / top * 100))}%"><b>${v}</b></i></div></div>`).join('')}</div>`;
        };
        tabs.forEach(b => b.addEventListener('click', () => { UI.sound('toggle'); draw(b.dataset.t); }));
        draw(tab === 'free' ? 'free' : 'daily');
      }
      function toggleHc() {
        d.hc = !d.hc; save(); renderAll();
        toast(s(d.hc ? 'hcOn' : 'hcOff'));
      }

      loadGame();

      // ---- debug hook for automated tests ----
      root.__game = {
        logic: Logic,
        state: () => ({ lang, mode: d.mode, answer: G.answer, guesses: G.guesses.slice(), cur: G.cur, hints: G.hints.slice(), done: G.done, won: G.won, rewarded: G.rewarded, busy, hc: !!d.hc, stats: JSON.parse(JSON.stringify(st)), sizes: { answers: W.answers.length, valid: W.valid.size } }),
        answer: () => G.answer,
        isValid: w => W.valid.has(norm(w, lang)),
        type: str => { [...norm(str, lang)].forEach(ch => press(ch)); },
        back: () => press('BACK'),
        enter: () => press('ENTER'),
        guess: w => { if (busy || G.done) return false; for (let i = 0; i < LEN && G.cur.length; i++) press('BACK'); [...norm(w, lang)].forEach(ch => press(ch)); press('ENTER'); },
        instant: (on = true) => { FLIP = on ? 0 : (reduce ? 0 : 500); STAG = on ? 0 : (reduce ? 0 : 280); },
        setAnswer: w => { G.answer = norm(w, lang); save(); renderAll(); },
        mode: setMode,
        newGame: newFreeGame,
        hint: applyHint,
        share: () => shareText({ title: s('shareTitle'), no: dayNumber(keyToDate(G.day || todayKey())), guesses: G.guesses, answer: G.answer, won: G.won, hc: !!d.hc, hints: G.hints.length })
      };

      return {
        destroy() {
          dead = true;
          document.removeEventListener('keydown', onKey);
          timers.forEach(t => clearTimeout(t)); timers.clear();
          stopCountdown();
          delete root.__game;
        }
      };
    }
  });
})();
