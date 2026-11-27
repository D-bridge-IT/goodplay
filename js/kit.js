// Kit: shared chrome for the logic games — header stats, board, toolbar, segmented
// difficulty picker, timer, hint/undo-for-ad helper and the win/lose result sheet.
// Every game builds on this so the whole catalogue looks and behaves the same.
(function () {
  const esc = s => UI.escapeHtml(s);

  // Local strings shared by all games.
  const S = {
    de: {
      win: 'Gewonnen!', lose: 'Verloren', draw: 'Remis', again: 'Neues Spiel', home: 'Zur Übersicht', next: 'Weiter',
      double: 'Sterne verdoppeln', doubleSub: 'Anzeige ansehen – 0,5 ct gehen an', time: 'Zeit', moves: 'Züge',
      score: 'Punkte', best: 'Rekord', level: 'Stufe', hint: 'Tipp', undo: 'Zurück', newGame: 'Neu', noHints: 'Keine Tipps mehr – Tipp gegen Anzeige?',
      hintAd: 'Tipp gegen Anzeige', undoAd: 'Zug zurück gegen Anzeige', rules: 'Regeln', close: 'Schließen', earned: 'verdient',
      easy: 'Leicht', medium: 'Mittel', hard: 'Schwer', expert: 'Experte', confirmNew: 'Laufendes Spiel abbrechen?', yes: 'Ja', no: 'Nein'
    },
    ru: {
      win: 'Победа!', lose: 'Поражение', draw: 'Ничья', again: 'Новая игра', home: 'К списку игр', next: 'Дальше',
      double: 'Удвоить звёзды', doubleSub: 'Посмотреть рекламу — 0,5 ц получит', time: 'Время', moves: 'Ходы',
      score: 'Очки', best: 'Рекорд', level: 'Уровень', hint: 'Подсказка', undo: 'Отмена', newGame: 'Заново', noHints: 'Подсказки закончились — подсказка за рекламу?',
      hintAd: 'Подсказка за рекламу', undoAd: 'Отмена хода за рекламу', rules: 'Правила', close: 'Закрыть', earned: 'получено',
      easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный', expert: 'Эксперт', confirmNew: 'Прервать текущую игру?', yes: 'Да', no: 'Нет'
    },
    en: {
      win: 'You won!', lose: 'You lost', draw: 'Draw', again: 'New game', home: 'Back to games', next: 'Next',
      double: 'Double the stars', doubleSub: 'Watch an ad – 0.5 ct goes to', time: 'Time', moves: 'Moves',
      score: 'Score', best: 'Best', level: 'Level', hint: 'Hint', undo: 'Undo', newGame: 'New', noHints: 'No hints left – hint for an ad?',
      hintAd: 'Hint for an ad', undoAd: 'Undo for an ad', rules: 'Rules', close: 'Close', earned: 'earned',
      easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert', confirmNew: 'Abandon the current game?', yes: 'Yes', no: 'No'
    },
    uk: {
      win: 'Перемога!', lose: 'Поразка', draw: 'Нічия', again: 'Нова гра', home: 'До списку ігор', next: 'Далі',
      double: 'Подвоїти зірки', doubleSub: 'Переглянути рекламу — 0,5 ц отримає', time: 'Час', moves: 'Ходи',
      score: 'Очки', best: 'Рекорд', level: 'Рівень', hint: 'Підказка', undo: 'Скасувати', newGame: 'Заново', noHints: 'Підказки закінчилися — підказка за рекламу?',
      hintAd: 'Підказка за рекламу', undoAd: 'Скасування ходу за рекламу', rules: 'Правила', close: 'Закрити', earned: 'отримано',
      easy: 'Легкий', medium: 'Середній', hard: 'Складний', expert: 'Експерт', confirmNew: 'Перервати поточну гру?', yes: 'Так', no: 'Ні'
    }
  };
  const chain = () => (window.LANG_FALLBACK && LANG_FALLBACK[LANG]) || [LANG, 'de'];
  const k = key => { for (const l of chain()) if (S[l] && S[l][key] != null) return S[l][key]; return key; };

  // Per-game string table helper: Kit.strings({de:{...}, ru:{...}}) → s(key, vars)
  function strings(dict) {
    return (key, vars) => {
      let v = null;
      for (const l of chain()) if (dict[l] && dict[l][key] != null) { v = dict[l][key]; break; }
      if (v == null) v = (dict.de || {})[key];
      if (v == null) v = k(key);
      if (vars) for (const n in vars) v = v.replace(new RegExp('\\{' + n + '\\}', 'g'), vars[n]);
      return v;
    };
  }

  // Build the standard layout inside the game root.
  // opts.stats: [{id, icon, value}] ; opts.cls: extra class on the board.
  function shell(root, opts = {}) {
    root.innerHTML = '';
    const el = document.createElement('div'); el.className = 'gk' + (opts.theme ? ' gk-' + opts.theme : '');
    el.innerHTML = `
      ${opts.top ? `<div class="gk-top"></div>` : ''}
      <div class="gk-head">${(opts.stats || []).map(s => `<span class="gk-stat" data-stat="${s.id}"><i>${s.icon || ''}</i><b>${s.value != null ? esc(String(s.value)) : ''}</b>${s.label ? `<small>${esc(s.label)}</small>` : ''}</span>`).join('')}</div>
      <div class="gk-board ${opts.cls || ''}"></div>
      <div class="gk-msg" aria-live="polite"></div>
      <div class="gk-tools"></div>`;
    root.appendChild(el);
    const api = {
      el,
      top: el.querySelector('.gk-top'),
      head: el.querySelector('.gk-head'),
      board: el.querySelector('.gk-board'),
      msgEl: el.querySelector('.gk-msg'),
      tools: el.querySelector('.gk-tools'),
      stat(id, v) { const b = el.querySelector(`[data-stat="${id}"] b`); if (b && b.textContent !== String(v)) { b.textContent = v; bump(b.parentElement); } },
      msg(text, cls) { api.msgEl.className = 'gk-msg' + (cls ? ' ' + cls : ''); api.msgEl.textContent = text || ''; },
      tool(label, onClick, cls, title) {
        const b = document.createElement('button'); b.className = 'gk-btn ' + (cls || ''); b.innerHTML = label; if (title) b.title = title;
        b.addEventListener('click', e => { UI.sound('click'); onClick(e, b); });
        api.tools.appendChild(b); return b;
      }
    };
    return api;
  }

  function bump(node) { if (!node) return; node.classList.remove('gk-bump'); void node.offsetWidth; node.classList.add('gk-bump'); }

  // Segmented control. items: [{id, label}] ; returns {el, set(id)}
  function segmented(items, value, onChange) {
    const el = document.createElement('div'); el.className = 'gk-seg';
    el.innerHTML = items.map(it => `<button data-id="${it.id}" class="${it.id === value ? 'on' : ''}">${esc(it.label)}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('on')) return;
      UI.sound('toggle');
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      onChange(b.dataset.id);
    }));
    return { el, set(id) { el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.id === id)); } };
  }

  // Stopwatch: calls onTick(secondsText) once per second while running.
  function timer(onTick) {
    let t0 = 0, acc = 0, iv = null;
    const secs = () => Math.floor((acc + (iv ? Date.now() - t0 : 0)) / 1000);
    const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    return {
      start() { if (iv) return; t0 = Date.now(); iv = setInterval(() => onTick && onTick(fmt(secs())), 1000); onTick && onTick(fmt(secs())); },
      stop() { if (!iv) return; acc += Date.now() - t0; clearInterval(iv); iv = null; },
      reset(ms = 0) { this.stop(); acc = ms; onTick && onTick(fmt(secs())); },
      get seconds() { return secs(); }, get ms() { return acc + (iv ? Date.now() - t0 : 0); }, fmt, text() { return fmt(secs()); }, get running() { return !!iv; }
    };
  }

  // Spend a stored hint, otherwise offer a rewarded ad. Resolves true if the player may use the help.
  async function useHelp(ctx, kind = 'hint') {
    if (kind === 'hint' && State.data.hints > 0) { State.data.hints--; State.save(); UI.sound('hint'); return true; }
    const ok = await ctx.ad();
    if (ok) UI.sound('hint');
    return ok;
  }

  // Result sheet. o: {result:'win'|'lose'|'draw', title, lines:[str], stars, onAgain, againLabel, onNext, nextLabel}
  function result(ctx, o) {
    const res = o.result || 'win';
    const icon = res === 'win' ? '🏆' : res === 'draw' ? '🤝' : '💭';
    const stars = o.stars || 0;
    if (!o.quiet) {
      if (res === 'win') { UI.sound('win'); setTimeout(() => FX.confetti(), 150); }
      else if (res === 'lose') UI.sound('gameover'); else UI.sound('ok');
      if (stars) ctx.stars(stars, true);
    }
    const partner = ctx.partner ? ctx.partner.name.replace(' (Beispiel)', '') : '';
    const actions = [];
    if (stars > 0 && !o.doubled) actions.push({ label: `▶ ${k('double')} (+${stars} ⭐)`, cls: 'btn-ad', async onClick(api) {
      api.close(); const ok = await ctx.ad(); if (ok) ctx.stars(stars);
      result(ctx, Object.assign({}, o, { quiet: true, doubled: ok }));
    } });
    if (o.onNext) actions.push({ label: o.nextLabel || k('next'), cls: 'btn-primary', onClick: () => o.onNext() });
    actions.push({ label: o.againLabel || k('again'), cls: o.onNext ? 'btn-outline' : 'btn-primary', onClick: () => o.onAgain && o.onAgain() });
    actions.push({ label: k('home'), cls: 'btn-ghost', onClick: () => Hub.show('home') });
    const m = UI.modal({
      dismissible: false,
      html: `<div class="gk-result gk-r-${res}">
        <div class="gk-r-icon">${icon}</div>
        <h3>${esc(o.title || k(res))}</h3>
        ${(o.lines || []).map(l => `<p>${esc(l)}</p>`).join('')}
        ${stars ? `<div class="gk-r-stars">+${o.doubled ? stars * 2 : stars} ⭐ <small>${k('earned')}</small></div>${o.doubled ? '' : `<p class="small muted">${esc(k('doubleSub'))} ${esc(partner)}</p>`}` : ''}
      </div>`,
      actions
    });
    if (actions.length > 2) m.actions.classList.add('stack');
    return m;
  }

  // Rules dialog.
  function rules(title, html) { UI.modal({ title, html: `<div class="gk-rules">${html}</div>`, actions: [{ label: k('close'), cls: 'btn-primary' }] }); }

  function confirm(text, onYes) {
    UI.modal({ html: `<p style="font-size:16px;margin:6px 0 2px">${esc(text)}</p>`, actions: [{ label: k('no'), cls: 'btn-ghost' }, { label: k('yes'), cls: 'btn-primary', onClick: onYes }] });
  }

  // Seeded RNG (mulberry32) and day seed for "puzzle of the day".
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function daySeed(extra = 0) { const d = new Date(); return (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) * 7 + extra; }
  function shuffle(a, r = Math.random) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Load a script once (e.g. vendor/phaser.min.js for the action games). Resolves when ready.
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) loaded[src] = new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = () => res(); el.onerror = () => { delete loaded[src]; rej(new Error('load ' + src)); }; document.head.appendChild(el); });
    return loaded[src];
  }

  window.Kit = { loadScript, strings, shell, segmented, timer, useHelp, result, rules, confirm, bump, rng, daySeed, shuffle, t: k };
})();
