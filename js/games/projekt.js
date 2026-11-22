// Projekt des Monats · Brückenbauer: timing game. Tap when the marker is in the green zone.
Games.register({
  id: 'projekt', icon: '🧱', bg: '#ffedd5', partner: 'p6',
  name: { de: 'Brückenbauer', ru: 'Строитель моста' },
  tagline: { de: 'Projekt des Monats: Setze Steine im richtigen Moment.', ru: 'Проект месяца: ставь камни в нужный момент.' },
  mount(root, ctx) {
    const S = {
      de: { stones: 'Steine', lives: 'Leben', tap: 'Stein setzen', intro: 'Tippe, wenn der Marker im grünen Bereich ist. 12 Steine bauen den Bogen.', done: 'Brücke steht!', fail: 'Die Brücke ist eingestürzt', again: 'Noch einmal', repair: 'Reparieren (+2 Leben)', yours: 'Deine Beiträge zu diesem Projekt', community: 'Gemeinschaftsziel', double: 'Beitrag leisten', built: 'Brücken gebaut' },
      ru: { stones: 'Камни', lives: 'Жизни', tap: 'Поставить камень', intro: 'Нажми, когда маркер в зелёной зоне. 12 камней строят арку.', done: 'Мост стоит!', fail: 'Мост обрушился', again: 'Ещё раз', repair: 'Починить (+2 жизни)', yours: 'Твои взносы в этот проект', community: 'Общая цель', double: 'Внести вклад', built: 'Построено мостов' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const TOTAL = 12;
    const d = ctx.data; d.built = d.built || 0;
    let bricks, lives, speed, pos, dir, raf, last, zone, over, repaired, fresh = false;

    function newGame() { bricks = 0; lives = 3; speed = 0.9; pos = 0; dir = 1; zone = 0.26; over = false; repaired = false; last = performance.now(); render(); loop(last); }
    function loop(now) {
      if (over) return;
      const dt = (now - last) / 1000; last = now;
      pos += dir * speed * dt;
      if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
      const m = root.querySelector('#pb-marker'); if (m) { m.style.left = (pos * 100) + '%'; m.classList.toggle('hot', Math.abs(pos - 0.5) <= zone / 2); }
      raf = requestAnimationFrame(loop);
    }
    function tap() {
      if (over) return;
      const hit = Math.abs(pos - 0.5) <= zone / 2;
      const marker = root.querySelector('#pb-marker'), area = root.querySelector('#pb-area');
      if (hit) {
        bricks++; speed *= 1.08; zone = Math.max(0.12, zone - 0.012); fresh = true; ctx.sound('place');
        FX.burstAt(marker, { type: 'sparks', count: 12, spread: 80 }); FX.floatAt(marker, '+2 ⭐', 'gold');
        ctx.stars(2, true, marker);
        if (bricks >= TOTAL) { over = true; cancelAnimationFrame(raf); d.built++; ctx.save(); ctx.sound('win'); ctx.badge('builder'); setTimeout(() => { ctx.stars(25); FX.confetti(); }, 300); }
      } else {
        lives--; ctx.sound('brick'); FX.shake(area); FX.flash(area, 'rgba(225,29,72,.55)'); FX.burstAt(marker, { type: 'bricks', count: 8, spread: 60 }); FX.floatAt(marker, '💔', 'rose big');
        if (lives <= 0) { over = true; cancelAnimationFrame(raf); ctx.sound('fail'); }
      }
      render();
      if (over) setTimeout(endModal, 300);
    }
    function endModal() {
      const won = bricks >= TOTAL;
      const actions = [];
      if (!won && !repaired) actions.push({ label: `📺 ${s('repair')} · ${t('watch_ad')}`, cls: 'btn-ad', async onClick() { const ok = await ctx.ad(); if (ok) { repaired = true; lives = 2; over = false; last = performance.now(); render(); loop(last); } } });
      actions.push({ label: won ? t('continue') : s('again'), cls: 'btn-primary', onClick: () => { if (won) Hub.show('home'); else newGame(); } });
      ctx.modal({ title: won ? s('done') : s('fail'), dismissible: false,
        html: `<div class="center" style="font-size:52px">${won ? '🌉' : '💥'}</div><p class="center">${bricks}/${TOTAL} ${s('stones')}</p>`, actions });
    }
    function bridgeSvg() { const f = fresh; fresh = false; return Art.archScene(bricks, TOTAL, f); }
    function render() {
      const p = ctx.partner; const pct = Math.round(p.raised / p.goal * 100);
      const mine = State.data.perPartner.p6 || 0;
      root.innerHTML = `
        <div class="pom" style="margin-top:8px">
          <div class="row between"><span class="pill amber">☕ ${t('project_month')}</span><span class="pill demo">${t('demo')}</span></div>
          <h3 style="font-size:15px">${UI.escapeHtml(p.name)}</h3>
          <div class="progress amber"><i style="width:${pct}%"></i></div>
          <div class="row between small mt" style="margin-top:6px"><span>${s('community')}: <b>${State.fmtEuro(p.raised)}</b> / ${State.fmtEuro(p.goal)}</span><span>${s('yours')}: <b>${State.fmtCents(mine)}</b></span></div>
        </div>
        <div class="game-head">
          <span class="stat">🧱 ${bricks}/${TOTAL} ${s('stones')}</span>
          <span class="stat pb-lives">${'❤️'.repeat(lives)}${'🖤'.repeat(Math.max(0, 3 - lives))}</span>
          <span class="stat muted">🌉 ${d.built}</span>
        </div>
        <div class="game-area" id="pb-area">
          ${bridgeSvg()}
          <div class="pb-bar" id="pb-bar">
            <div class="pb-zone" style="left:${(0.5 - zone / 2) * 100}%;width:${zone * 100}%"></div>
            <div class="pb-marker" id="pb-marker" style="left:${pos * 100}%"></div>
          </div>
          <button class="btn btn-indigo btn-block pb-tap" id="pb-tap">🧱 ${s('tap')}</button>
          <p class="small muted center" style="margin:10px 0 0">${s('intro')}</p>
          <button class="btn btn-ad btn-block mt" id="pb-ad">💚 ${s('double')} · ${t('watch_ad')}</button>
        </div>`;
      root.querySelector('#pb-tap').addEventListener('pointerdown', e => { e.preventDefault(); tap(); });
      root.querySelector('#pb-bar').addEventListener('pointerdown', e => { e.preventDefault(); tap(); });
      root.querySelector('#pb-ad').addEventListener('click', async () => { const wasOver = over; over = true; cancelAnimationFrame(raf); await ctx.ad(); if (!wasOver) { over = false; last = performance.now(); render(); loop(last); } else render(); });
    }
    newGame();
    return { destroy() { over = true; cancelAnimationFrame(raf); } };
  }
});
