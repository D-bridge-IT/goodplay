// Kleinstadt: tiny city builder on a 6×6 grid.
Games.register({
  id: 'kleinstadt', icon: '🏘️', bg: '#fef3c7', partner: 'p5',
  name: { de: 'Kleinstadt', ru: 'Маленький город' },
  tagline: { de: 'Baue Häuser, Parks und Schulen – mach die Stadt glücklich.', ru: 'Строй дома, парки и школы — сделай город счастливым.' },
  mount(root, ctx) {
    const S = {
      de: { treasury: 'Stadtkasse', pop: 'Einwohner', happy: 'Zufriedenheit', income: 'Einnahmen', per: 'alle 2 s',
        house: 'Haus', house_d: '+3 pro Takt, +2 je Park nebenan. 4 Einwohner.', bakery: 'Bäckerei', bakery_d: '+8 pro Takt, braucht ein Haus nebenan.',
        park: 'Park', park_d: 'Macht Nachbarn glücklich und reicher.', school: 'Schule', school_d: '+10 % auf alle Einnahmen.', bull: 'Abriss', bull_d: 'Entfernen, 50 % zurück.',
        goal: 'Ziel: 10 Häuser und 70 % Zufriedenheit', won: 'Die Kleinstadt blüht!', fest: 'Stadtfest: +150', nomoney: 'Nicht genug in der Stadtkasse', reset: 'Neue Stadt' },
      ru: { treasury: 'Казна', pop: 'Жители', happy: 'Довольство', income: 'Доход', per: 'каждые 2 с',
        house: 'Дом', house_d: '+3 за такт, +2 за каждый парк рядом. 4 жителя.', bakery: 'Пекарня', bakery_d: '+8 за такт, нужен дом рядом.',
        park: 'Парк', park_d: 'Делает соседей счастливее и богаче.', school: 'Школа', school_d: '+10 % ко всем доходам.', bull: 'Снос', bull_d: 'Убрать, вернуть 50 %.',
        goal: 'Цель: 10 домов и 70 % довольства', won: 'Городок процветает!', fest: 'Праздник города: +150', nomoney: 'В казне не хватает', reset: 'Новый город' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const N = 6;
    const B = { house: { ico: '🏠', cost: 60 }, bakery: { ico: '🥐', cost: 150 }, park: { ico: '🌳', cost: 100 }, school: { ico: '🏫', cost: 250 } };
    const d = ctx.data;
    if (!d.cells) Object.assign(d, { cells: Array(N * N).fill(null), money: 300, won: false });
    let tool = 'house', timer, placed = -1;

    const neighbors = i => { const r = Math.floor(i / N), c = i % N, out = []; if (r > 0) out.push(i - N); if (r < N - 1) out.push(i + N); if (c > 0) out.push(i - 1); if (c < N - 1) out.push(i + 1); return out; };
    const count = tp => d.cells.filter(x => x === tp).length;
    function income() {
      let sum = 0;
      d.cells.forEach((tp, i) => {
        if (tp === 'house') sum += 3 + 2 * neighbors(i).filter(n => d.cells[n] === 'park').length;
        if (tp === 'bakery' && neighbors(i).some(n => d.cells[n] === 'house')) sum += 8;
      });
      return Math.floor(sum * (1 + 0.1 * count('school')));
    }
    function happiness() {
      const h = count('house'); if (!h) return 0;
      return Math.max(0, Math.min(100, Math.round((count('park') * 2 + count('school') * 3 + count('bakery')) / h * 50)));
    }
    function place(i) {
      const cellEl = root.querySelectorAll('.ks-cell')[i];
      if (tool === 'bull') { const tp = d.cells[i]; if (tp) { const back = Math.floor(B[tp].cost / 2); d.money += back; d.cells[i] = null; ctx.sound('pop'); FX.burstAt(cellEl, { type: 'bricks', count: 10, spread: 60 }); FX.floatAt(cellEl, `+${back} 💰`, 'gold'); } }
      else if (!d.cells[i]) {
        if (d.money < B[tool].cost) { ctx.toast(s('nomoney')); ctx.sound('bad'); FX.shake(cellEl); return; }
        d.money -= B[tool].cost; d.cells[i] = tool; placed = i; ctx.sound('coin');
        FX.burstAt(cellEl, { type: 'sparks', count: 10, spread: 60 }); FX.floatAt(cellEl, `−${B[tool].cost}`, 'rose');
      }
      ctx.save(); checkWin(); render();
    }
    function checkWin() {
      if (!d.won && count('house') >= 10 && happiness() >= 70) {
        d.won = true; ctx.save(); ctx.sound('win'); ctx.stars(40); ctx.badge('mayor'); FX.confetti();
        ctx.modal({ title: s('won'), html: `<div class="center" style="font-size:52px">🏘️</div><p class="center">${s('pop')}: ${count('house') * 4} · ${s('happy')}: ${happiness()} %</p>`, actions: [{ label: t('continue'), cls: 'btn-primary' }] });
      }
    }
    function render() {
      root.innerHTML = `
        <div class="game-head">
          <span class="stat">💰 ${d.money}</span>
          <span class="stat">👥 ${count('house') * 4}</span>
          <span class="stat">😊 ${happiness()} %</span>
          <span class="stat">📈 +${income()} ${s('per')}</span>
        </div>
        <div class="game-area">
          <div class="ks-grid">${d.cells.map((tp, i) => `<button class="ks-cell" data-i="${i}">${tp ? `<span class="${placed === i ? 'fx-popin' : ''}" style="display:block;width:94%;height:94%">${Art.building(tp)}</span>` : Art.grassTile()}</button>`).join('')}</div>
          <div class="ks-palette mt">
            ${Object.entries(B).map(([id, b]) => `<button class="ks-tool ${tool === id ? 'active' : ''}" data-tool="${id}"><span class="ico">${Art.building(id)}</span><b>${s(id)}</b><span>💰 ${b.cost}</span></button>`).join('')}
            <button class="ks-tool ${tool === 'bull' ? 'active' : ''}" data-tool="bull"><span class="ico">🚜</span><b>${s('bull')}</b><span>−50 %</span></button>
          </div>
          <p class="small muted" style="margin:6px 0 0">${s(tool + '_d')}</p>
          <p class="small" style="margin:6px 0 0">${d.won ? '🏆 ' + s('won') : '🎯 ' + s('goal')}</p>
          <div class="row mt">
            <button class="btn btn-ad grow" id="ks-fest">🎪 ${s('fest')} · ${t('watch_ad')}</button>
            <button class="btn btn-outline btn-sm" id="ks-reset">${s('reset')}</button>
          </div>
        </div>`;
      placed = -1;
      root.querySelectorAll('.ks-cell').forEach(b => b.addEventListener('click', () => place(+b.dataset.i)));
      root.querySelectorAll('.ks-tool').forEach(b => b.addEventListener('click', () => { tool = b.dataset.tool; ctx.sound('click'); render(); }));
      root.querySelector('#ks-fest').addEventListener('click', async () => { const ok = await ctx.ad(); if (ok) { d.money += 150; ctx.save(); render(); } });
      root.querySelector('#ks-reset').addEventListener('click', () => { Object.assign(d, { cells: Array(N * N).fill(null), money: 300, won: false }); ctx.save(); render(); });
    }
    timer = setInterval(() => {
      const inc = income(); if (inc) { d.money += inc; ctx.save(); }
      const m = root.querySelector('.stat'); if (m) { m.textContent = `💰 ${d.money}`; if (inc) { FX.floatAt(m, `+${inc}`, 'gold'); FX.bump(m); } }
    }, 2000);
    render();
    return { destroy() { clearInterval(timer); } };
  }
});
