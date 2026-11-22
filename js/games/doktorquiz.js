// Doktor Quiz: run down a hospital corridor, pick the right door. 8 questions per round, 15 s each. Partner: Gesund im Quartier.
Games.register({
  id: 'doktorquiz', icon: '🩺', bg: '#e0f2fe', partner: 'p3',
  name: { de: 'Doktor Quiz', ru: 'Доктор-квиз' },
  tagline: { de: 'Quiz-Lauf durch die Klinik: Wähle die richtige Tür, bevor die Zeit abläuft.', ru: 'Квиз-забег по клинике: выбери правильную дверь, пока не вышло время.' },
  mount(root, ctx) {
    const Q = [
      { q: { de: 'Wie viele Knochen hat ein erwachsener Mensch ungefähr?', ru: 'Сколько примерно костей у взрослого человека?' }, a: ['120', '206', '350', '412'], c: 1, e: { de: 'Erwachsene haben 206 Knochen; Babys mehr, weil einige später verwachsen.', ru: 'У взрослых 206 костей; у младенцев больше, часть позже срастается.' } },
      { q: { de: 'Welche Notrufnummer gilt in Deutschland und der ganzen EU?', ru: 'Какой номер экстренной помощи действует в Германии и во всём ЕС?' }, a: ['110', '911', '112', '116 117'], c: 2, e: { de: '112 ist der europaweite Notruf. 116 117 ist der ärztliche Bereitschaftsdienst.', ru: '112 — общеевропейский номер. 116 117 — дежурный врач.' } },
      { q: { de: 'Welches Vitamin bildet der Körper mit Sonnenlicht?', ru: 'Какой витамин организм вырабатывает на солнце?' }, a: [{ de: 'Vitamin A', ru: 'Витамин A' }, { de: 'Vitamin C', ru: 'Витамин C' }, { de: 'Vitamin D', ru: 'Витамин D' }, { de: 'Vitamin K', ru: 'Витамин K' }], c: 2, e: { de: 'UV-B-Strahlung regt die Vitamin-D-Bildung in der Haut an.', ru: 'УФ-B излучение запускает синтез витамина D в коже.' } },
      { q: { de: 'Wie lange sollte man die Hände mindestens mit Seife waschen?', ru: 'Сколько минимум нужно мыть руки с мылом?' }, a: [{ de: '5 Sekunden', ru: '5 секунд' }, { de: '20–30 Sekunden', ru: '20–30 секунд' }, { de: '2 Minuten', ru: '2 минуты' }, { de: '5 Minuten', ru: '5 минут' }], c: 1, e: { de: '20–30 Sekunden gründliches Einseifen entfernt die meisten Keime.', ru: '20–30 секунд намыливания удаляют большинство микробов.' } },
      { q: { de: 'Was ist das größte Organ des Menschen?', ru: 'Какой самый большой орган человека?' }, a: [{ de: 'Leber', ru: 'Печень' }, { de: 'Lunge', ru: 'Лёгкие' }, { de: 'Haut', ru: 'Кожа' }, { de: 'Darm', ru: 'Кишечник' }], c: 2, e: { de: 'Die Haut wiegt rund 3–4 kg und misst etwa 2 m².', ru: 'Кожа весит около 3–4 кг и имеет площадь около 2 м².' } },
      { q: { de: 'Wie viel Blut hat ein Erwachsener ungefähr?', ru: 'Сколько примерно крови у взрослого?' }, a: [{ de: '1–2 Liter', ru: '1–2 литра' }, { de: '5–6 Liter', ru: '5–6 литров' }, { de: '10–12 Liter', ru: '10–12 литров' }, { de: '20 Liter', ru: '20 литров' }], c: 1, e: { de: 'Etwa 7–8 % des Körpergewichts sind Blut.', ru: 'Кровь составляет около 7–8 % массы тела.' } },
      { q: { de: 'Wie viel Schlaf wird Erwachsenen empfohlen?', ru: 'Сколько сна рекомендуется взрослым?' }, a: [{ de: '4–5 Stunden', ru: '4–5 часов' }, { de: '7–9 Stunden', ru: '7–9 часов' }, { de: '10–12 Stunden', ru: '10–12 часов' }, { de: 'Egal', ru: 'Не важно' }], c: 1, e: { de: 'Die meisten Fachgesellschaften empfehlen 7–9 Stunden.', ru: 'Большинство медицинских обществ рекомендуют 7–9 часов.' } },
      { q: { de: 'Welche Frequenz gilt bei der Herzdruckmassage?', ru: 'С какой частотой делают непрямой массаж сердца?' }, a: [{ de: '30–40 / min', ru: '30–40 в мин' }, { de: '60–80 / min', ru: '60–80 в мин' }, { de: '100–120 / min', ru: '100–120 в мин' }, { de: '200 / min', ru: '200 в мин' }], c: 2, e: { de: '100–120 Kompressionen pro Minute, 5–6 cm tief.', ru: '100–120 нажатий в минуту, глубина 5–6 см.' } },
      { q: { de: 'Welches Organ filtert das Blut und bildet Urin?', ru: 'Какой орган фильтрует кровь и образует мочу?' }, a: [{ de: 'Leber', ru: 'Печень' }, { de: 'Nieren', ru: 'Почки' }, { de: 'Milz', ru: 'Селезёнка' }, { de: 'Pankreas', ru: 'Поджелудочная' }], c: 1, e: { de: 'Die Nieren filtern täglich rund 180 Liter Primärharn.', ru: 'Почки ежедневно фильтруют около 180 литров первичной мочи.' } },
      { q: { de: 'Welche Blutgruppe ist Universalspender für rote Blutkörperchen?', ru: 'Какая группа крови — универсальный донор эритроцитов?' }, a: ['AB+', 'A−', '0−', 'B+'], c: 2, e: { de: '0 negativ hat weder A-, B- noch Rhesus-Antigene.', ru: '0 отрицательная не имеет антигенов A, B и резус-фактора.' } },
      { q: { de: 'Wie oft am Tag sollte man Zähne putzen?', ru: 'Сколько раз в день чистить зубы?' }, a: [{ de: 'Einmal pro Woche', ru: 'Раз в неделю' }, { de: 'Einmal täglich', ru: 'Раз в день' }, { de: 'Zweimal täglich', ru: 'Два раза в день' }, { de: 'Nach jedem Schluck', ru: 'После каждого глотка' }], c: 2, e: { de: 'Zweimal täglich zwei Minuten mit Fluorid-Zahnpasta.', ru: 'Два раза в день по две минуты пастой с фтором.' } },
      { q: { de: 'Was ist eine normale Körpertemperatur?', ru: 'Какая температура тела нормальна?' }, a: ['32–34 °C', '36,5–37,4 °C', '38–39 °C', '40–41 °C'], c: 1, e: { de: 'Ab etwa 38 °C spricht man von Fieber.', ru: 'Примерно с 38 °C говорят о лихорадке.' } },
      { q: { de: 'Wie viel sollte ein Erwachsener etwa am Tag trinken?', ru: 'Сколько примерно воды пить взрослому в день?' }, a: [{ de: '0,5 Liter', ru: '0,5 литра' }, { de: '1,5–2 Liter', ru: '1,5–2 литра' }, { de: '5 Liter', ru: '5 литров' }, { de: '10 Liter', ru: '10 литров' }], c: 1, e: { de: 'Rund 1,5–2 Liter, bei Hitze und Sport mehr.', ru: 'Около 1,5–2 литров, в жару и при спорте больше.' } },
      { q: { de: 'Welche Impfung wird etwa alle 10 Jahre aufgefrischt?', ru: 'Какую прививку обновляют примерно раз в 10 лет?' }, a: [{ de: 'Masern', ru: 'Корь' }, { de: 'Tetanus', ru: 'Столбняк' }, { de: 'Windpocken', ru: 'Ветрянка' }, { de: 'Grippe', ru: 'Грипп' }], c: 1, e: { de: 'Tetanus und Diphtherie: Auffrischung alle 10 Jahre.', ru: 'Столбняк и дифтерия: ревакцинация каждые 10 лет.' } },
      { q: { de: 'Was ist ein normaler Ruhepuls bei Erwachsenen?', ru: 'Какой пульс в покое нормален у взрослых?' }, a: ['20–40', '60–80', '120–140', '180–200'], c: 1, e: { de: 'Etwa 60–80 Schläge pro Minute; Sportler oft darunter.', ru: 'Около 60–80 ударов в минуту; у спортсменов часто ниже.' } },
      { q: { de: 'Was hilft zuerst bei Sonnenbrand?', ru: 'Что делать первым делом при солнечном ожоге?' }, a: [{ de: 'Kühlen und Schatten', ru: 'Охладить и в тень' }, { de: 'Mehr Sonne', ru: 'Больше солнца' }, { de: 'Heiß duschen', ru: 'Горячий душ' }, { de: 'Abwarten', ru: 'Подождать' }], c: 0, e: { de: 'Raus aus der Sonne, kühlen, viel trinken.', ru: 'Уйти с солнца, охладить кожу, много пить.' } },
      { q: { de: 'Wie viele Zähne hat ein Erwachsener mit Weisheitszähnen?', ru: 'Сколько зубов у взрослого с зубами мудрости?' }, a: ['20', '28', '32', '40'], c: 2, e: { de: '32 Zähne, davon 4 Weisheitszähne.', ru: '32 зуба, из них 4 зуба мудрости.' } },
      { q: { de: 'Wie viele Schritte am Tag gelten oft als Richtwert?', ru: 'Сколько шагов в день часто называют ориентиром?' }, a: ['500', '2 000', '7 000–10 000', '50 000'], c: 2, e: { de: 'Schon 7 000 Schritte täglich senken das Risiko deutlich.', ru: 'Уже 7 000 шагов в день заметно снижают риски.' } }
    ];
    const S = {
      de: { q: 'Frage', joker: '50:50', result: 'Ergebnis', perfect: 'Perfekt – Quiz-Doktor!', good: 'Gut gemacht!', ok: 'Weiter üben!', again: 'Noch eine Runde', correct: 'richtig', timeout: 'Zeit abgelaufen!', title: 'DOKTOR QUIZ', hint: 'Lies die Frage oben · tippe die richtige Tür', go: 'Los!', streak: 'SERIE', score: 'Punkte' },
      ru: { q: 'Вопрос', joker: '50:50', result: 'Результат', perfect: 'Идеально — доктор-эрудит!', good: 'Отлично!', ok: 'Продолжай тренироваться!', again: 'Ещё раунд', correct: 'правильно', timeout: 'Время вышло!', title: 'ДОКТОР-КВИЗ', hint: 'Читай вопрос сверху · тапни правильную дверь', go: 'Погнали!', streak: 'СЕРИЯ', score: 'Очки' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const TIME = 15, ROUND = 8;
    const d = ctx.data; d.rounds = d.rounds || 0; d.best = d.best || 0;
    root.innerHTML = `
      <div class="game-head">
        <span class="stat">❓ <b id="qz-i">1</b>/${ROUND}</span>
        <span class="stat">⭐ <b id="qz-score">0</b></span>
        <span class="stat" id="qz-time">${TIME}.0 s</span>
        <button class="btn btn-outline btn-sm" id="qz-joker">💡 ${s('joker')}</button>
      </div>
      <div class="progress quiz-timer sky"><i id="qz-bar" style="width:100%;background:var(--sky);transition:none"></i></div>
      <div class="quiz-head"><span class="doc">${Art.doctor()}</span><p class="quiz-q" id="qz-q"></p></div>`;
    const { wrap, cv, overlay } = Gfx.mountCanvas(root, { title: s('title'), hint: s('hint'), cta: s('go') });
    const exp = document.createElement('div'); exp.className = 'quiz-exp'; exp.style.display = 'none'; root.appendChild(exp);
    const st = Gfx.setup(cv, wrap, 0.95, 400), g = st.g, P = Gfx.particles(), F = Gfx.floats();
    const $ = id => root.querySelector('#' + id);
    let qs, i, correct, score, remaining, timer, answered, jokerUsed, dimmed, streak, started = false, tm = 0, approach = 0, lane = 1.5, px, runT = 0, hit = null, warp = 0, shake = 0, expr = 'smile';

    function startRound() { qs = Q.slice().sort(() => Math.random() - .5).slice(0, ROUND); i = 0; correct = 0; score = 0; streak = 0; jokerUsed = false; $('qz-joker').disabled = false; next(); }
    function next() {
      if (i >= ROUND) return finish();
      answered = null; dimmed = []; remaining = TIME; approach = 0; hit = null; expr = 'smile';
      const q = qs[i]; $('qz-q').textContent = L(q.q); $('qz-i').textContent = i + 1; exp.style.display = 'none';
      if (started) startTimer();
    }
    function startTimer() {
      clearInterval(timer);
      timer = setInterval(() => {
        remaining -= 0.1;
        if (remaining <= 0) { remaining = 0; answer(-1); return; }
        if (remaining <= 5.05 && Math.abs(remaining - Math.round(remaining)) < 0.051) ctx.sound('tick');
        updateTimer();
      }, 100);
    }
    function updateTimer() { const bar = $('qz-bar'); if (bar) { bar.style.width = (remaining / TIME * 100) + '%'; bar.style.background = remaining < 4 ? 'var(--rose)' : remaining < 8 ? 'var(--amber)' : 'var(--sky)'; } const tt = $('qz-time'); if (tt) { tt.textContent = remaining.toFixed(1) + ' s'; tt.style.color = remaining < 4 ? 'var(--rose)' : ''; } }
    function answer(k) {
      if (answered != null) return;
      clearInterval(timer); answered = k; const q = qs[i]; hit = { k, ok: k === q.c, t: 0 };
      if (k >= 0) lane = k;
      if (k === q.c) { correct++; streak++; const pts = 10 + Math.floor(remaining / 3) + (streak - 1) * 5; score += pts; expr = 'happy'; ctx.sound('ok'); ctx.stars(3, true); F.add(doorX(k), st.H * 0.45, `+${pts}`, '#fff', 20); if (streak > 1) F.add(st.W / 2, st.H * 0.2, `${s('streak')} ×${streak}`, '#fde047', 18); }
      else { streak = 0; expr = 'oof'; ctx.sound(k === -1 ? 'alarm' : 'oof'); shake = 1; }
      $('qz-score').textContent = score;
      exp.innerHTML = (k === q.c ? '✅ ' : k === -1 ? '⏰ ' + s('timeout') + ' ' : '❌ ') + UI.escapeHtml(L(q.e)); exp.style.display = 'block';
      setTimeout(() => { warp = 1; }, 1100);
      setTimeout(() => { i++; next(); }, 1700);
    }
    async function joker() {
      if (jokerUsed || answered != null || !started) return;
      clearInterval(timer);
      let ok;
      if (State.data.hints > 0) { State.data.hints--; State.save(); ok = true; } else ok = await ctx.ad();
      if (answered != null) return;
      if (ok) { ctx.sound('hint'); jokerUsed = true; $('qz-joker').disabled = true; dimmed = [0, 1, 2, 3].filter(k => k !== qs[i].c).sort(() => Math.random() - .5).slice(0, 2); }
      startTimer();
    }
    function finish() {
      clearInterval(timer); d.rounds++; if (score > d.best) d.best = score; ctx.save();
      const msg = correct === ROUND ? s('perfect') : correct >= 5 ? s('good') : s('ok');
      if (correct === ROUND) { ctx.sound('win'); ctx.badge('doctor'); FX.confetti(); } else ctx.sound('ok');
      const stars = 5 + correct * 2;
      setTimeout(() => ctx.stars(stars), 300);
      ctx.modal({ title: s('result'), dismissible: false, html: `<div class="center" style="font-size:48px">${correct === ROUND ? '🏆' : correct >= 5 ? '🩺' : '📚'}</div><div class="stats" style="margin-top:8px"><div class="box"><b>${correct}/${ROUND}</b><span>${s('correct')}</span></div><div class="box"><b>${score}</b><span>${s('score')}</span></div></div><p class="center" style="margin:10px 0 0">${msg}</p>`,
        actions: [{ label: s('again'), cls: 'btn-primary', onClick: () => startRound() }, { label: t('continue'), cls: 'btn-ghost', onClick: () => Hub.show('home') }] });
    }

    /* ---------- drawing: pseudo-3D corridor ---------- */
    const doorX = k => st.W / 2 + (k - 1.5) * st.W * 0.235;
    function wrapText(text, maxW, size) { g.font = `bold ${size}px system-ui`; const words = String(text).split(' '), lines = []; let line = ''; for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; } if (line) lines.push(line); return lines.slice(0, 3); }
    function draw() {
      const W = st.W, H = st.H, vpY = H * 0.36, vpX = W / 2;
      g.fillStyle = '#e0f2fe'; g.fillRect(0, 0, W, H);
      // back wall
      g.fillStyle = '#bae6fd'; g.fillRect(W * 0.2, vpY - H * 0.12, W * 0.6, H * 0.3);
      // floor
      const fl = g.createLinearGradient(0, vpY, 0, H); fl.addColorStop(0, '#cbd5e1'); fl.addColorStop(1, '#f8fafc'); g.fillStyle = fl; g.beginPath(); g.moveTo(W * 0.2, vpY + H * 0.18); g.lineTo(W * 0.8, vpY + H * 0.18); g.lineTo(W + 80, H); g.lineTo(-80, H); g.closePath(); g.fill();
      // perspective lines (zoom while warping)
      g.strokeStyle = 'rgba(148,163,184,.5)'; g.lineWidth = 1;
      for (let k = 0; k <= 8; k++) { const x0 = W * 0.2 + k * W * 0.6 / 8, x1 = -80 + k * (W + 160) / 8; g.beginPath(); g.moveTo(x0, vpY + H * 0.18); g.lineTo(x1, H); g.stroke(); }
      for (let k = 1; k <= 6; k++) { const f = ((k / 6 + (warp > 0 ? (1 - warp) : tm * 0.15)) % 1); const yy = vpY + H * 0.18 + f * f * (H - vpY - H * 0.18); const half = W * 0.3 + f * f * (W * 0.5 + 80); g.beginPath(); g.moveTo(vpX - half, yy); g.lineTo(vpX + half, yy); g.stroke(); }
      // side walls
      g.fillStyle = '#7dd3fc'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.2, vpY - H * 0.12); g.lineTo(W * 0.2, vpY + H * 0.18); g.lineTo(-80, H); g.lineTo(0, H); g.closePath(); g.fill();
      g.fillStyle = '#38bdf8'; g.beginPath(); g.moveTo(W, 0); g.lineTo(W * 0.8, vpY - H * 0.12); g.lineTo(W * 0.8, vpY + H * 0.18); g.lineTo(W + 80, H); g.lineTo(W, H); g.closePath(); g.fill();
      // wall signs
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(W * 0.05, H * 0.12, W * 0.08, H * 0.1); g.fillRect(W * 0.87, H * 0.12, W * 0.08, H * 0.1);
      g.fillStyle = '#ef4444'; g.fillRect(W * 0.085, H * 0.14, W * 0.01, H * 0.06); g.fillRect(W * 0.065, H * 0.16, W * 0.05, H * 0.02);
      g.save(); const [sx, sy] = Gfx.shakeXY(shake); g.translate(sx, sy);
      // doors
      const q = qs[i] || qs[qs.length - 1], scale = 0.55 + 0.45 * easeOut(approach), dw = W * 0.2 * scale, dh = H * 0.36 * scale, dy = vpY + H * 0.18 - dh + (1 - scale) * 10;
      const cols = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24'];
      for (let k = 0; k < 4; k++) {
        const x = doorX(k) - dw / 2, dim = dimmed.includes(k);
        let col = cols[k]; if (hit && hit.k === k) col = hit.ok ? '#22c55e' : '#ef4444'; if (hit && !hit.ok && k === q.c && hit.t > 0.4) col = '#22c55e';
        g.globalAlpha = dim ? 0.25 : 1;
        g.fillStyle = 'rgba(15,23,42,.15)'; g.fillRect(x + 4, dy + 6, dw, dh);
        g.fillStyle = Gfx.shade(col, -0.35); Gfx.roundRect(g, x - 4, dy - 4, dw + 8, dh + 4, 6); g.fill();
        g.fillStyle = col; Gfx.roundRect(g, x, dy, dw, dh, 4); g.fill();
        if (hit && hit.k === k && hit.ok) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x + dw * 0.1, dy, dw * 0.8 * Math.min(1, hit.t * 2), dh); }
        g.fillStyle = Gfx.shade(col, 0.4); g.fillRect(x + dw * 0.15, dy + dh * 0.1, dw * 0.7, dh * 0.22); // window
        g.fillStyle = '#fde68a'; g.beginPath(); g.arc(x + dw * 0.82, dy + dh * 0.55, 3 * scale, 0, 7); g.fill();
        // label
        const lines = wrapText(L(q.a[k]), dw * 0.85, Math.max(10, 13 * scale)); g.fillStyle = '#0f172a'; g.textAlign = 'center';
        g.fillStyle = 'rgba(255,255,255,.85)'; Gfx.roundRect(g, x + dw * 0.06, dy + dh * 0.4, dw * 0.88, Math.min(dh * 0.5, 16 * scale * lines.length + 8), 6); g.fill();
        g.fillStyle = '#0f172a'; lines.forEach((ln, j) => g.fillText(ln, x + dw / 2, dy + dh * 0.4 + 14 * scale + j * 15 * scale));
        g.globalAlpha = 1;
      }
      // avatar (runs to the door when answered)
      const targetX = doorX(lane) - 13 * 1.3; px = px == null ? targetX : px + (targetX - px) * 0.2;
      let ay = H - 80, asc = 1.3, air = false, swing = Math.sin(tm * 6) * 0.15;
      if (hit) { const run = Math.min(1, hit.t / 0.6); ay = H - 80 - run * (H - 80 - (dy + dh - 52 * scale)); asc = 1.3 - run * (1.3 - scale * 0.9); swing = Math.sin(tm * 18) * 0.7; if (!hit.ok && hit.t > 0.6) { ay += Math.min(40, (hit.t - 0.6) * 160); air = true; } }
      Gfx.avatar(g, px, ay, { scale: asc, swing, air, expr, colors: { torso: '#f8fafc', legs: '#38bdf8' }, flip: hit && !hit.ok && hit.t > 0.6 });
      P.draw(g); F.draw(g);
      g.restore();
      if (warp > 0) { g.fillStyle = `rgba(255,255,255,${warp * 0.6})`; g.fillRect(0, 0, W, H); }
      if (remaining < 5 && answered == null && started) { g.fillStyle = `rgba(239,68,68,${(0.25 + Math.sin(tm * 10) * 0.15) * (1 - remaining / 5)})`; g.fillRect(0, 0, W, H); }
    }
    const easeOut = x => 1 - Math.pow(1 - x, 3);
    function update(dt) {
      tm += dt; if (approach < 1) approach = Math.min(1, approach + dt * 1.6); if (shake > 0) shake = Math.max(0, shake - dt * 3); if (warp > 0) warp = Math.max(0, warp - dt * 2.5);
      if (hit) { hit.t += dt; if (hit.ok && hit.t > 0.55 && !hit.fx) { hit.fx = true; P.burst(doorX(hit.k), st.H * 0.45, ['#86efac', '#fff', '#fde047'], 18, 220, { shape: 'circle' }); } if (!hit.ok && hit.t > 0.6 && !hit.fx) { hit.fx = true; P.burst(doorX(hit.k), st.H * 0.5, ['#fecaca', '#ef4444'], 12, 180); } }
      P.update(dt); F.update(dt);
    }
    const stop = Gfx.loop(dt => { update(dt); draw(); });
    wrap.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!started) { started = true; overlay.classList.add('hidden'); startTimer(); return; }
      if (answered != null) return;
      const p = Gfx.point(e, cv); const k = Math.min(3, Math.max(0, Math.floor((p.x - st.W / 2) / (st.W * 0.235) + 2)));
      if (dimmed.includes(k)) return;
      answer(k);
    });
    $('qz-joker').addEventListener('click', joker);
    const onResize = () => st.resize();
    window.addEventListener('resize', onResize);
    startRound();
    cv.__qz = { get: () => ({ i, correct, score, answered, started, q: qs[i] }), answer, start: () => { started = true; overlay.classList.add('hidden'); startTimer(); } }; // debug hook
    return { destroy() { stop(); clearInterval(timer); window.removeEventListener('resize', onResize); } };
  }
});
