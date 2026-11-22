// Waldklicker: idle/clicker. Tap the sapling, grow trees, buy helpers.
Games.register({
  id: 'waldklicker', icon: '🌳', bg: '#dff1e7', partner: 'p1',
  name: { de: 'Waldklicker', ru: 'Лесной кликер' },
  tagline: { de: 'Tippen, gießen, pflanzen – lass deinen Wald wachsen.', ru: 'Нажимай, поливай, сажай — выращивай лес.' },
  mount(root, ctx) {
    const S = {
      de: { leaves: 'Blätter', trees: 'Bäume', tap: 'Tippe auf den Spross!', can: 'Gießkanne', can_d: '+3 Wachstum pro Sekunde', fert: 'Dünger', fert_d: '+5 Wachstum & +1 Blatt pro Tipp', bees: 'Bienenstock', bees_d: '+25 % Blätter', boost: 'Sonnenschein ×2 (30 s)', planted: 'Baum gepflanzt!', ten: '10 Bäume! Ein Partner pflanzt (Demo) einen echten Baum.', boosted: 'Sonnenschein aktiv' },
      ru: { leaves: 'Листья', trees: 'Деревья', tap: 'Нажимай на росток!', can: 'Лейка', can_d: '+3 роста в секунду', fert: 'Удобрение', fert_d: '+5 роста и +1 лист за нажатие', bees: 'Улей', bees_d: '+25 % листьев', boost: 'Солнце ×2 (30 с)', planted: 'Дерево посажено!', ten: '10 деревьев! Партнёр сажает (демо) настоящее дерево.', boosted: 'Солнце активно' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const d = ctx.data;
    if (d.leaves == null) Object.assign(d, { leaves: 0, progress: 0, trees: 0, can: 0, fert: 0, bees: 0, boostUntil: 0 });
    const ITEMS = [
      { id: 'can', ico: '🚿', base: 40, growth: 1.6 },
      { id: 'fert', ico: '🧪', base: 80, growth: 1.7 },
      { id: 'bees', ico: '🐝', base: 250, growth: 2.0 }
    ];
    const cost = it => Math.round(it.base * Math.pow(it.growth, d[it.id]));
    const mult = () => (1 + 0.25 * d.bees) * (d.boostUntil > Date.now() ? 2 : 1);
    let timer;

    function stage() { return d.progress < 34 ? '🌱' : d.progress < 67 ? '🌿' : '🌳'; }

    function render() {
      const boosted = d.boostUntil > Date.now();
      const circ = 2 * Math.PI * 70;
      root.innerHTML = `
        <div class="game-head">
          <span class="stat">🍃 ${Math.floor(d.leaves)} ${s('leaves')}</span>
          <span class="stat">🌳 ${d.trees} ${s('trees')}</span>
          ${boosted ? `<span class="stat" style="background:var(--amber-soft);color:#92400e">☀️ ${s('boosted')} ${Math.ceil((d.boostUntil - Date.now()) / 1000)} s</span>` : ''}
        </div>
        <div class="game-area center">
          <div class="wk-tree" id="wk-tap">
            <svg width="170" height="170" viewBox="0 0 170 170" style="position:absolute">
              <circle cx="85" cy="85" r="70" fill="none" stroke="#edf0ed" stroke-width="10"/>
              <circle cx="85" cy="85" r="70" fill="none" stroke="var(--brand)" stroke-width="10" stroke-linecap="round"
                stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - d.progress / 100)}" transform="rotate(-90 85 85)" style="transition:stroke-dashoffset .15s"/>
            </svg>
            <div class="scene">${Art.growingTree(d.progress)}</div>
          </div>
          <p class="small muted" style="margin:4px 0 10px">${s('tap')} · ${Math.floor(d.progress)} %</p>
          <div class="wk-forest">${Art.treeSmall().repeat(Math.min(d.trees, 40))}${d.trees > 40 ? ` +${d.trees - 40}` : ''}</div>
        </div>
        <div class="game-area">
          <div class="wk-shop">
            ${ITEMS.map(it => `<div class="wk-item"><span class="ico">${it.ico}</span>
              <div class="grow"><b>${s(it.id)} <span class="muted">×${d[it.id]}</span></b><small>${s(it.id + '_d')}</small></div>
              <button class="btn btn-sm ${d.leaves >= cost(it) ? 'btn-primary' : 'btn-outline'}" data-buy="${it.id}" ${d.leaves >= cost(it) ? '' : 'disabled'}>🍃 ${cost(it)}</button></div>`).join('')}
            <button class="btn btn-ad btn-block" id="wk-boost" ${boosted ? 'disabled' : ''}>☀️ ${s('boost')} · ${t('watch_ad')}</button>
          </div>
        </div>`;
      root.querySelector('#wk-tap').addEventListener('pointerdown', tap);
      root.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
        const it = ITEMS.find(i => i.id === b.dataset.buy); const c = cost(it);
        if (d.leaves >= c) { d.leaves -= c; d[it.id]++; ctx.sound('coin'); ctx.save(); render(); }
      }));
      root.querySelector('#wk-boost').addEventListener('click', async () => { const ok = await ctx.ad(); if (ok) { d.boostUntil = Date.now() + 30000; ctx.save(); render(); } });
    }

    function grow(amount) {
      d.progress += amount;
      while (d.progress >= 100) {
        d.progress -= 100; d.trees++; d.leaves += 20 * mult();
        const scene = root.querySelector('.wk-tree');
        FX.burstAt(scene, { type: 'leaves', count: 26, spread: 150, gravity: 120, lift: 90 }); FX.floatAt(scene, `🌳 +20 🍃`, 'big');
        ctx.sound('plant'); ctx.toast(`🌳 ${s('planted')} +20 🍃`, 'good');
        if (d.trees % 10 === 0) { ctx.toast(s('ten'), 'good'); ctx.stars(15, false, scene); FX.confetti(); if (d.trees >= 10) ctx.badge('forest'); }
        else if (d.trees % 3 === 0) ctx.stars(3, true, scene);
      }
    }
    function tap(e) {
      e.preventDefault();
      const gain = (1 + d.fert) * mult();
      grow(10 + 5 * d.fert); d.leaves += gain;
      FX.float(e.clientX, e.clientY - 10, `+${Math.round(gain * 10) / 10} 🍃`);
      FX.burst(e.clientX, e.clientY, { type: 'leaves', count: 4, spread: 50, gravity: 40, lift: 30 });
      ctx.sound('leaf'); ctx.save(); render();
    }
    timer = setInterval(() => {
      if (d.can > 0) { grow(3 * d.can); d.leaves += 0.5 * d.can * mult(); }
      ctx.save(); render();
    }, 1000);

    render();
    return { destroy() { clearInterval(timer); } };
  }
});
