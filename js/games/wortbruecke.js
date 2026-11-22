// Wortbrücke: build German words from letters; every word is a plank of the bridge.
Games.register({
  id: 'wortbruecke', icon: '🌉', bg: '#e7e6fb', partner: 'p4',
  name: { de: 'Wortbrücke', ru: 'Словарный мост' },
  tagline: { de: 'Finde Wörter aus Buchstaben und schließe die Brücke.', ru: 'Собирай слова из букв и достраивай мост.' },
  mount(root, ctx) {
    const PUZZLES = [
      { letters: 'GARTEN', words: ['GARTEN', 'TRAGEN', 'RATEN', 'ARTEN', 'NAGER', 'RANG', 'GERN', 'ART', 'RAT', 'TAG'] },
      { letters: 'KINDER', words: ['KINDER', 'KIND', 'RINDE', 'RIND', 'KERN', 'DREI', 'REIN', 'KEIN', 'DEIN', 'DIR', 'DER', 'DIE', 'EIN'] },
      { letters: 'STRAND', words: ['STRAND', 'RAND', 'SAND', 'RAST', 'STAR', 'DRAN', 'ART', 'RAT', 'DAS'] },
      { letters: 'FREUND', words: ['FREUND', 'RUNDE', 'RUND', 'FUND', 'FERN', 'UFER', 'UND', 'NUR', 'DER'] },
      { letters: 'WINTER', words: ['WINTER', 'WEIT', 'WERT', 'TIER', 'REIN', 'WEIN', 'WIRT', 'WIR'] },
      { letters: 'HERBST', words: ['HERBST', 'HERB', 'BEST', 'REST', 'HEBT', 'SEHR', 'HER'] },
      { letters: 'FRIEDEN', words: ['FRIEDEN', 'FERIEN', 'NIEDER', 'FEIND', 'FINDE', 'FEDER', 'REDEN', 'ENDE', 'DREI', 'FREI', 'FEIN', 'NIE', 'DIE', 'DER'] },
      { letters: 'LERNEN', words: ['LERNEN', 'LERNE', 'RENNE', 'NENNE', 'ERLEN', 'LEER'] }
    ];
    const NEED = 5;
    const S = {
      de: { puzzle: 'Rätsel', planks: 'Planken', check: 'Prüfen', shuffle: 'Mischen', hint: 'Hinweis', notlist: 'Nicht in der Wortliste', dup: 'Schon gefunden', short: 'Mindestens 3 Buchstaben', done: 'Brücke fertig!', bonus: 'Bonuswort', next: 'Nächste Brücke', all: 'Alle Wörter gefunden – Bonus!', hintAd: 'Hinweis gegen Anzeige', found: 'gefunden', intro: 'Tippe Buchstaben, bilde ein deutsches Wort und drücke „Prüfen“. Fünf Wörter = eine fertige Brücke.' },
      ru: { puzzle: 'Задание', planks: 'Доски', check: 'Проверить', shuffle: 'Перемешать', hint: 'Подсказка', notlist: 'Нет в списке слов', dup: 'Уже найдено', short: 'Минимум 3 буквы', done: 'Мост готов!', bonus: 'Бонусное слово', next: 'Следующий мост', all: 'Все слова найдены — бонус!', hintAd: 'Подсказка за рекламу', found: 'найдено', intro: 'Нажимай буквы, собери немецкое слово и нажми «Проверить». Пять слов = готовый мост.' }
    };
    const s = k => S[LANG] ? S[LANG][k] : S.de[k];
    const d = ctx.data; if (d.idx == null) d.idx = 0; d.done = d.done || 0;
    let p, tiles, cur, found, hint, finished = false, fresh = -1;

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
    function loadPuzzle() { p = PUZZLES[d.idx % PUZZLES.length]; tiles = shuffle(p.letters.split('')); cur = []; found = []; hint = null; finished = false; render(); }

    function bridgeSvg() { const f = fresh; fresh = -1; return Art.bridgeScene(found.slice(0, NEED), NEED, finished, f); }

    function render() {
      root.innerHTML = `
        <div class="game-head">
          <span class="stat">${s('puzzle')} ${d.idx % PUZZLES.length + 1}/${PUZZLES.length}</span>
          <span class="stat">🪵 ${s('planks')} ${Math.min(found.length, NEED)}/${NEED}</span>
          <span class="stat">💡 ${State.data.hints}</span>
        </div>
        <div class="game-area">
          ${bridgeSvg()}
          <p class="small muted center" style="margin:6px 0 0">${s('intro')}</p>
          <div class="wb-word" id="wb-word">${cur.map(i => `<span>${tiles[i]}</span>`).join('') || '<span style="background:transparent"></span>'}</div>
          <div class="wb-tiles">${tiles.map((l, i) => `<button class="wb-tile ${cur.includes(i) ? 'used' : ''}" data-i="${i}">${l}</button>`).join('')}</div>
          <div class="row mt" style="justify-content:center">
            <button class="btn btn-outline btn-sm" id="wb-del">⌫</button>
            <button class="btn btn-outline btn-sm" id="wb-shuffle">🔀 ${s('shuffle')}</button>
            <button class="btn btn-indigo" id="wb-check">${s('check')}</button>
          </div>
          <div class="wb-found">${found.map(w => `<span>${w}</span>`).join('')}${hint ? `<span class="hint">${hint}</span>` : ''}</div>
          <div class="row mt" style="justify-content:center">
            <button class="btn btn-sm ${State.data.hints > 0 ? 'btn-outline' : 'btn-ad'}" id="wb-hint">💡 ${State.data.hints > 0 ? s('hint') : s('hintAd')}</button>
          </div>
        </div>
        ${finished ? `<div class="overlay"><div class="card"><div style="font-size:48px">🌉</div><h3>${s('done')}</h3>
            <p>${found.length}/${p.words.length} ${s('found')}</p><button class="btn btn-primary btn-block" id="wb-next">${s('next')} →</button></div></div>` : ''}`;
      root.querySelectorAll('.wb-tile').forEach(b => b.addEventListener('click', () => { ctx.sound('tap'); cur.push(+b.dataset.i); render(); }));
      root.querySelector('#wb-del').addEventListener('click', () => { cur.pop(); render(); });
      root.querySelector('#wb-shuffle').addEventListener('click', () => { const word = cur.map(i => tiles[i]); tiles = shuffle(tiles.slice()); cur = []; word.forEach(l => { const i = tiles.findIndex((x, k) => x === l && !cur.includes(k)); if (i >= 0) cur.push(i); }); render(); });
      root.querySelector('#wb-check').addEventListener('click', check);
      root.querySelector('#wb-hint').addEventListener('click', giveHint);
      const n = root.querySelector('#wb-next'); if (n) n.addEventListener('click', () => { d.idx++; ctx.save(); loadPuzzle(); });
    }

    function check() {
      const w = cur.map(i => tiles[i]).join('');
      const box = root.querySelector('#wb-word');
      if (w.length < 3) { ctx.toast(s('short')); return; }
      if (found.includes(w)) { ctx.toast(s('dup')); cur = []; render(); return; }
      if (!p.words.includes(w)) { ctx.sound('bad'); box.classList.add('shake'); setTimeout(() => { cur = []; render(); }, 300); ctx.toast(s('notlist')); return; }
      found.push(w); cur = []; hint = null; fresh = found.length - 1;
      const pts = w.length >= 5 ? 10 : 5;
      const btn = root.querySelector('#wb-check');
      FX.burstAt(btn, { type: 'sparks', count: 14, spread: 90 }); FX.floatAt(box, `+${pts} ⭐`, 'gold big');
      ctx.sound('ok'); ctx.stars(pts, true, btn);
      if (found.length === NEED) {
        finished = true; d.done++; State.data.puzzlesDone++; ctx.save();
        ctx.sound('win'); setTimeout(() => { ctx.stars(20); FX.confetti(); }, 350);
        if (d.done >= 3) ctx.badge('words');
      } else if (found.length > NEED) {
        ctx.toast(`${s('bonus')} +${pts} ⭐`, 'good');
      }
      if (found.length === p.words.length) { ctx.toast(s('all'), 'good'); ctx.stars(15); }
      render();
    }

    function revealHint() {
      const left = p.words.filter(w => !found.includes(w)).sort((a, b) => b.length - a.length);
      if (!left.length) return;
      const w = left[0]; hint = w[0] + ' ' + '_ '.repeat(w.length - 1).trim(); ctx.sound('hint');
      render();
    }
    async function giveHint() {
      if (State.data.hints > 0) { State.data.hints--; State.save(); revealHint(); return; }
      const ok = await ctx.ad(); if (ok) revealHint();
    }

    loadPuzzle();
    return { destroy() { } };
  }
});
