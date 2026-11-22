// Doktor Quiz: health knowledge, 8 questions per round, 15 s each.
Games.register({
  id: 'doktorquiz', icon: '🩺', bg: '#e0f2fe', partner: 'p3',
  name: { de: 'Doktor Quiz', ru: 'Доктор-квиз' },
  tagline: { de: 'Gesundheitswissen in 8 Fragen – gegen die Zeit.', ru: 'Знания о здоровье за 8 вопросов — на время.' },
  mount(root, ctx) {
    const Q = [
      { q: { de: 'Wie viele Knochen hat ein erwachsener Mensch ungefähr?', ru: 'Сколько примерно костей у взрослого человека?' }, a: ['120', '206', '350', '412'], c: 1, e: { de: 'Erwachsene haben 206 Knochen; Babys mehr, weil einige später verwachsen.', ru: 'У взрослых 206 костей; у младенцев больше, часть позже срастается.' } },
      { q: { de: 'Welche Notrufnummer gilt in Deutschland und der ganzen EU für den Rettungsdienst?', ru: 'Какой номер скорой помощи действует в Германии и во всём ЕС?' }, a: ['110', '911', '112', '116 117'], c: 2, e: { de: '112 ist der europaweite Notruf. 116 117 ist der ärztliche Bereitschaftsdienst.', ru: '112 — общеевропейский номер экстренной помощи. 116 117 — дежурный врач.' } },
      { q: { de: 'Welches Vitamin bildet der Körper mit Hilfe von Sonnenlicht?', ru: 'Какой витамин организм вырабатывает с помощью солнечного света?' }, a: [{ de: 'Vitamin A', ru: 'Витамин A' }, { de: 'Vitamin C', ru: 'Витамин C' }, { de: 'Vitamin D', ru: 'Витамин D' }, { de: 'Vitamin K', ru: 'Витамин K' }], c: 2, e: { de: 'UV-B-Strahlung regt die Vitamin-D-Bildung in der Haut an.', ru: 'УФ-B излучение запускает синтез витамина D в коже.' } },
      { q: { de: 'Wie lange sollte man die Hände mindestens mit Seife waschen?', ru: 'Сколько минимум нужно мыть руки с мылом?' }, a: [{ de: '5 Sekunden', ru: '5 секунд' }, { de: '20–30 Sekunden', ru: '20–30 секунд' }, { de: '2 Minuten', ru: '2 минуты' }, { de: '5 Minuten', ru: '5 минут' }], c: 1, e: { de: '20–30 Sekunden gründliches Einseifen entfernt die meisten Keime.', ru: '20–30 секунд тщательного намыливания удаляют большинство микробов.' } },
      { q: { de: 'Was ist das größte Organ des Menschen?', ru: 'Какой самый большой орган человека?' }, a: [{ de: 'Leber', ru: 'Печень' }, { de: 'Lunge', ru: 'Лёгкие' }, { de: 'Haut', ru: 'Кожа' }, { de: 'Darm', ru: 'Кишечник' }], c: 2, e: { de: 'Die Haut wiegt bei Erwachsenen rund 3–4 kg und misst etwa 2 m².', ru: 'Кожа взрослого весит около 3–4 кг и имеет площадь около 2 м².' } },
      { q: { de: 'Wie viel Blut hat ein Erwachsener ungefähr?', ru: 'Сколько примерно крови у взрослого человека?' }, a: [{ de: '1–2 Liter', ru: '1–2 литра' }, { de: '5–6 Liter', ru: '5–6 литров' }, { de: '10–12 Liter', ru: '10–12 литров' }, { de: '20 Liter', ru: '20 литров' }], c: 1, e: { de: 'Etwa 7–8 % des Körpergewichts sind Blut, also 5–6 Liter.', ru: 'Кровь составляет около 7–8 % массы тела, то есть 5–6 литров.' } },
      { q: { de: 'Wie viel Schlaf wird Erwachsenen pro Nacht empfohlen?', ru: 'Сколько сна рекомендуется взрослым за ночь?' }, a: [{ de: '4–5 Stunden', ru: '4–5 часов' }, { de: '7–9 Stunden', ru: '7–9 часов' }, { de: '10–12 Stunden', ru: '10–12 часов' }, { de: 'Egal, Hauptsache am Stück', ru: 'Не важно, главное подряд' }], c: 1, e: { de: 'Die meisten Fachgesellschaften empfehlen 7–9 Stunden.', ru: 'Большинство медицинских обществ рекомендуют 7–9 часов.' } },
      { q: { de: 'Welche Frequenz gilt bei der Herzdruckmassage?', ru: 'С какой частотой делают непрямой массаж сердца?' }, a: [{ de: '30–40 pro Minute', ru: '30–40 в минуту' }, { de: '60–80 pro Minute', ru: '60–80 в минуту' }, { de: '100–120 pro Minute', ru: '100–120 в минуту' }, { de: '200 pro Minute', ru: '200 в минуту' }], c: 2, e: { de: '100–120 Kompressionen pro Minute, 5–6 cm tief. „Stayin’ Alive“ hat das richtige Tempo.', ru: '100–120 нажатий в минуту, глубина 5–6 см. Темп песни «Stayin’ Alive».' } },
      { q: { de: 'Welches Organ filtert das Blut und bildet Urin?', ru: 'Какой орган фильтрует кровь и образует мочу?' }, a: [{ de: 'Leber', ru: 'Печень' }, { de: 'Nieren', ru: 'Почки' }, { de: 'Milz', ru: 'Селезёнка' }, { de: 'Bauchspeicheldrüse', ru: 'Поджелудочная железа' }], c: 1, e: { de: 'Die beiden Nieren filtern täglich rund 180 Liter Primärharn.', ru: 'Две почки ежедневно фильтруют около 180 литров первичной мочи.' } },
      { q: { de: 'Welche Blutgruppe gilt als Universalspender für rote Blutkörperchen?', ru: 'Какая группа крови считается универсальным донором эритроцитов?' }, a: ['AB+', 'A−', '0−', 'B+'], c: 2, e: { de: '0 negativ hat weder A-, B- noch Rhesus-Antigene.', ru: '0 отрицательная не имеет антигенов A, B и резус-фактора.' } },
      { q: { de: 'Wie oft am Tag sollte man sich die Zähne putzen?', ru: 'Сколько раз в день нужно чистить зубы?' }, a: [{ de: 'Einmal pro Woche', ru: 'Раз в неделю' }, { de: 'Einmal täglich', ru: 'Раз в день' }, { de: 'Zweimal täglich', ru: 'Два раза в день' }, { de: 'Nach jedem Schluck Wasser', ru: 'После каждого глотка воды' }], c: 2, e: { de: 'Zweimal täglich zwei Minuten mit fluoridhaltiger Zahnpasta.', ru: 'Два раза в день по две минуты пастой с фтором.' } },
      { q: { de: 'Was ist ein normaler Bereich der Körpertemperatur?', ru: 'Какой диапазон температуры тела считается нормальным?' }, a: ['32–34 °C', '36,5–37,4 °C', '38–39 °C', '40–41 °C'], c: 1, e: { de: 'Ab etwa 38 °C spricht man von Fieber.', ru: 'Примерно с 38 °C говорят о лихорадке.' } }
    ];
    const S = {
      de: { q: 'Frage', joker: '50:50-Joker', result: 'Ergebnis', perfect: 'Perfekt – Quiz-Doktor!', good: 'Gut gemacht!', ok: 'Weiter üben!', again: 'Noch eine Runde', correct: 'richtig', timeout: 'Zeit abgelaufen' },
      ru: { q: 'Вопрос', joker: 'Джокер 50:50', result: 'Результат', perfect: 'Идеально — доктор-эрудит!', good: 'Отлично!', ok: 'Продолжай тренироваться!', again: 'Ещё раунд', correct: 'правильно', timeout: 'Время вышло' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const ROUND = 8, TIME = 15;
    const d = ctx.data; d.best = d.best || 0;
    let qs, i, correct, score, remaining, timer, answered, jokerUsed, dimmed;

    function newRound() {
      qs = Q.slice().sort(() => Math.random() - .5).slice(0, ROUND);
      i = 0; correct = 0; score = 0; jokerUsed = false; next();
    }
    function next() {
      answered = null; dimmed = []; remaining = TIME;
      startTimer();
      render();
    }
    function updateTimer() {
      const bar = root.querySelector('#qz-bar');
      if (bar) { bar.style.width = (remaining / TIME * 100) + '%'; bar.style.background = remaining < 4 ? 'var(--rose)' : remaining < 8 ? 'var(--amber)' : 'var(--sky)'; }
      const tt = root.querySelector('#qz-time'); if (tt) { tt.textContent = remaining.toFixed(1) + ' s'; tt.style.color = remaining < 4 ? 'var(--rose)' : ''; }
    }
    function answer(k) {
      if (answered != null) return;
      clearInterval(timer); answered = k;
      const q = qs[i];
      const opt = root.querySelector(`.quiz-opt[data-k="${k}"]`);
      if (k === q.c) { correct++; const pts = 10 + Math.floor(remaining / 3); score += pts; ctx.sound('ok'); FX.burstAt(opt, { type: 'sparks', count: 14, spread: 110 }); FX.floatAt(opt, `+${pts}`, 'big'); ctx.stars(3, true, opt); }
      else { ctx.sound('bad'); if (opt) FX.shake(opt); FX.flash(root.querySelector('.game-area'), 'rgba(225,29,72,.5)'); }
      setTimeout(render, k === q.c ? 0 : 320);
    }
    function finish() {
      clearInterval(timer);
      if (score > d.best) { d.best = score; ctx.save(); }
      const bonus = correct === ROUND ? 20 : correct >= 6 ? 10 : 0;
      if (bonus) ctx.stars(bonus);
      if (correct === ROUND) { ctx.sound('win'); ctx.badge('doctor'); FX.confetti(); }
      else if (correct >= 6) FX.burst(innerWidth / 2, innerHeight * .4, { type: 'sparks', count: 24, spread: 180 });
      root.innerHTML = `
        <div class="game-area center" style="margin-top:12px">
          <div style="font-size:52px">${correct === ROUND ? '🏆' : correct >= 6 ? '🩺' : '📖'}</div>
          <h3>${s('result')}: ${correct}/${ROUND} ${s('correct')}</h3>
          <p class="muted">${correct === ROUND ? s('perfect') : correct >= 6 ? s('good') : s('ok')}</p>
          <p><b style="font-size:26px">${score}</b> ${t('score')} · 🥇 ${d.best}</p>
          <button class="btn btn-primary btn-block mt" id="qz-again">${s('again')}</button>
        </div>`;
      root.querySelector('#qz-again').addEventListener('click', newRound);
    }
    function startTimer() {
      clearInterval(timer);
      timer = setInterval(() => { remaining -= 0.1; if (remaining <= 0) { remaining = 0; answer(-1); } else updateTimer(); }, 100);
    }
    async function joker() {
      if (jokerUsed || answered != null) return;
      clearInterval(timer); // pause while the hint/ad is handled
      let ok;
      if (State.data.hints > 0) { State.data.hints--; State.save(); ok = true; }
      else ok = await ctx.ad();
      if (answered != null) return;
      if (ok) { jokerUsed = true; dimmed = [0, 1, 2, 3].filter(k => k !== qs[i].c).sort(() => Math.random() - .5).slice(0, 2); }
      startTimer(); render();
    }
    function render() {
      const q = qs[i];
      root.innerHTML = `
        <div class="game-head">
          <span class="stat">${s('q')} ${i + 1}/${ROUND}</span>
          <span class="stat">✅ ${correct}</span>
          <span class="stat">🏅 ${score}</span>
          <span class="stat" id="qz-time">${remaining.toFixed(1)} s</span>
        </div>
        <div class="game-area">
          <div class="progress quiz-timer sky"><i id="qz-bar" style="width:${remaining / TIME * 100}%;background:var(--sky);transition:none"></i></div>
          <div class="quiz-head"><span class="doc">${Art.doctor()}</span><div class="quiz-q">${UI.escapeHtml(L(q.q))}</div></div>
          ${q.a.map((a, k) => {
            let cls = '';
            if (answered != null) { if (k === q.c) cls = 'correct'; else if (k === answered) cls = 'wrong'; else cls = 'dim'; }
            else if (dimmed.includes(k)) cls = 'dim';
            return `<button class="quiz-opt ${cls}" data-k="${k}">${String.fromCharCode(65 + k)} · ${UI.escapeHtml(L(a))}</button>`;
          }).join('')}
          ${answered != null ? `<div class="quiz-exp">${answered === -1 ? '⏱ ' + s('timeout') + '. ' : ''}${UI.escapeHtml(L(q.e))}</div>
            <button class="btn btn-indigo btn-block mt" id="qz-next">${i + 1 < ROUND ? t('continue') + ' →' : s('result')}</button>`
            : `<div class="row mt" style="justify-content:center"><button class="btn btn-sm ${State.data.hints > 0 ? 'btn-outline' : 'btn-ad'}" id="qz-joker" ${jokerUsed ? 'disabled' : ''}>🎲 ${s('joker')}${State.data.hints > 0 ? ` (💡 ${State.data.hints})` : ' · ' + t('watch_ad')}</button></div>`}
        </div>`;
      root.querySelectorAll('.quiz-opt').forEach(b => b.addEventListener('click', () => answer(+b.dataset.k)));
      const n = root.querySelector('#qz-next'); if (n) n.addEventListener('click', () => { i++; if (i >= ROUND) finish(); else next(); });
      const j = root.querySelector('#qz-joker'); if (j) j.addEventListener('click', joker);
    }
    newRound();
    return { destroy() { clearInterval(timer); } };
  }
});
