// Hub: navigation, home, impact wall, shop, profile, game shell.
(function () {
  const $ = sel => document.querySelector(sel);
  const esc = s => UI.escapeHtml(s);
  let screen = 'home';
  let current = null; // mounted game {game, handle}
  let homeTimer = null;

  const SHOP = [
    { id: 'stars', icon: '⭐', bg: '#fef3c7', price: 199, name: 'item_stars', desc: 'item_stars_d', repeat: true },
    { id: 'adfree', icon: '🚫', bg: '#e0f2fe', price: 499, name: 'item_adfree', desc: 'item_adfree_d', repeat: false },
    { id: 'badge', icon: '🎖️', bg: '#fde7ec', price: 299, name: 'item_badge', desc: 'item_badge_d', repeat: false },
    { id: 'hints', icon: '💡', bg: '#e7e6fb', price: 99, name: 'item_hints', desc: 'item_hints_d', repeat: true }
  ];

  // Card art: a game may bring its own thumbnail (inner SVG for a 160×80 viewBox).
  function thumbOf(g) {
    if (g.thumb) { try { return `<svg viewBox="0 0 160 80" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display:block">${g.thumb()}</svg>`; } catch (e) { } }
    return Art.thumb(g.id);
  }
  const partnerName = id => State.PARTNERS[id].name.replace(' (Beispiel)', '');
  // Achievements: the supporter badge plus whatever every game declares.
  function allBadges() {
    const list = [{ id: 'supporter', icon: '🎖️', name: { de: t('badge_supporter'), ru: t('badge_supporter') } }];
    Games.list.forEach(g => (g.badges || []).forEach(b => list.push(b)));
    return list;
  }
  function badgeName(id) { const b = allBadges().find(x => x.id === id); return b ? L(b.name) : t('badge_' + id); }
  const PROJECT_GAME = 'blocks';
  function featureCard(g) {
    return `<button class="feature-card" data-game="${g.id}">
          <span class="scene">${g.art ? g.art() : thumbOf(g)}</span>
          <span class="body"><span class="kicker">${g.kicker ? `<span class="pill amber">${esc(L(g.kicker))}</span>` : ''}${g.isNew ? `<span class="pill demo">${t('feature_new')}</span>` : ''}</span>
          <b>${esc(L(g.name))}</b><small>${esc(L(g.tagline))}</small>
          <span class="row between"><span class="tag">${State.PARTNERS[g.partner].icon} ${esc(partnerName(g.partner))}</span><span class="btn btn-indigo btn-sm">▶ ${t('play')}</span></span></span>
        </button>`;
  }

  function starsPill() { return `<span class="pill" id="stars-pill">⭐ ${State.data.stars}</span>`; }
  function langToggle() {
    return `<span class="lang-toggle">${LANGS.map(l => `<button data-lang="${l}" class="${LANG === l ? 'active' : ''}">${l === 'uk' ? 'UA' : l.toUpperCase()}</button>`).join('')}</span>`;
  }
  function bindLang(root) {
    root.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { setLang(b.dataset.lang); show(screen); }));
  }

  function renderTabbar() {
    const tabs = [['home', '🎮', 'tab_home'], ['impact', '💚', 'tab_impact'], ['shop', '🛍️', 'tab_shop'], ['profile', '👤', 'tab_profile']];
    $('#tabbar').innerHTML = tabs.map(([id, ico, key]) =>
      `<button class="tab ${screen === id ? 'active' : ''}" data-screen="${id}"><span class="ico">${ico}</span>${t(key)}</button>`).join('');
    $('#tabbar').querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { UI.sound('click'); show(b.dataset.screen); }));
  }

  function unmountGame() {
    if (current) { try { current.handle && current.handle.destroy && current.handle.destroy(); } catch (e) { } current = null; }
    if (homeTimer) { clearInterval(homeTimer); homeTimer = null; }
  }

  function show(name) {
    unmountGame();
    Snd.music('hub');
    screen = name;
    const sc = $('#screen'); sc.className = 'screen'; sc.scrollTop = 0;
    $('#tabbar').classList.remove('hidden');
    if (name === 'home') renderHome();
    else if (name === 'impact') renderImpact();
    else if (name === 'shop') renderShop();
    else if (name === 'profile') renderProfile();
    void sc.offsetWidth; sc.classList.add('enter');
    renderTabbar();
  }

  /* ---------- Home ---------- */
  function renderHome() {
    const d = State.data; const pom = State.PARTNERS.p6;
    const pomPct = Math.round(pom.raised / pom.goal * 100);
    $('#topbar').innerHTML = `<div class="logo"><span class="dot">${Art.logo()}</span>GoodPlay</div>${langToggle()}<button class="icon-btn sm" id="btn-music" title="${t(d.music ? 'music_on' : 'music_off')}">${d.music ? '🎵' : '🔇'}</button>${starsPill()}`;
    bindLang($('#topbar'));
    $('#btn-music').addEventListener('click', () => { Snd.setMusic(!d.music); UI.sound('click'); const b = $('#btn-music'); b.textContent = d.music ? '🎵' : '🔇'; b.title = t(d.music ? 'music_on' : 'music_off'); FX.bump(b); UI.toast(t(d.music ? 'music_on' : 'music_off')); });
    const players = 4860 + Math.floor((Date.now() / 60000) % 240);
    $('#screen').innerHTML = `
      <div class="hero" id="hero">
        ${Art.heroDeco()}
        <div class="row between"><span class="label">${t('community_total')}</span><span class="pill demo">${t('demo')}</span></div>
        <div class="big" id="community">${State.fmtEuro(State.communityCents())}</div>
        <div class="sub">${esc(t('split_note'))}</div>
        <div class="split">
          <div class="box"><b>${State.fmtCents(d.donatedCents)}</b><span>${t('your_share')}</span></div>
          <div class="box"><b>${players.toLocaleString(LOCALE())}</b><span>${t('players_today')}</span></div>
          <div class="box"><b>${t('level')} ${State.level()}</b><span>${d.stars} ${t('stars')}</span></div>
        </div>
      </div>
      <div class="pom">
        <div class="row between"><span class="pill amber">☕ ${t('project_month')}</span><span class="small muted">${t('goal')}: ${State.fmtEuro(pom.goal)}</span></div>
        <span class="cafe">${Art.cafe()}</span>
        <h3>${esc(pom.name)}</h3>
        <p class="small muted" style="margin:0 0 8px">${esc(L({ de: 'Sprachcafé für Geflüchtete in Neuss: zwei Treffen pro Woche mit ehrenamtlichen Muttersprachlern.', en: 'Language café for refugees in Neuss: two meetings a week with volunteer native speakers.', ru: 'Языковое кафе для беженцев в Нойсе: 2 встречи в неделю, волонтёры-носители языка.', uk: 'Мовне кафе для біженців у Нойсі: дві зустрічі на тиждень із волонтерами — носіями мови.' }))}</p>
        <div class="progress amber"><i style="width:${pomPct}%"></i></div>
        <div class="row between mt"><b>${State.fmtEuro(pom.raised)} · ${pomPct} %</b>${Games[PROJECT_GAME] ? `<button class="btn btn-amber btn-sm" data-game="${PROJECT_GAME}">🧱 ${t('join_build')}</button>` : ''}</div>
      </div>
      ${(() => {
        const adv = Games.list.filter(g => g.cat === 'adventure');
        const top = Games.list.filter(g => g.tier === 'top' && g.cat !== 'adventure');
        const T = { adv: { de: 'Abenteuer', en: 'Adventures', ru: 'Приключения', uk: 'Пригоди' }, top: { de: 'Klassiker', en: 'Classics', ru: 'Классика', uk: 'Класика' } };
        return (adv.length ? `<div class="section-title"><h2>🗺️ ${esc(L(T.adv))}</h2><span class="small muted">${adv.length}</span></div>${adv.map(featureCard).join('')}` : '')
          + (top.length ? `<div class="section-title"><h2>🔥 ${esc(L(T.top))}</h2><span class="small muted">${top.length}</span></div><div class="h-scroll">${top.map(featureCard).join('')}</div>` : '');
      })()}
      <div class="section-title"><h2>🧠 ${t('mini_games')}</h2><span class="small muted">${Games.list.filter(g => g.tier !== 'top' && g.cat !== 'adventure').length}</span></div>
      <div class="grid-games" id="game-grid">
        ${Games.list.filter(g => g.tier !== 'top' && g.cat !== 'adventure').map(g => `
          <button class="game-card" data-game="${g.id}">
            <span class="art">${thumbOf(g)}</span>
            <b>${esc(L(g.name))}</b>
            <small>${esc(L(g.tagline))}</small>
            <span class="tag">${State.PARTNERS[g.partner].icon} ${esc(partnerName(g.partner))}</span>
          </button>`).join('')}
      </div>
      <div class="footer">${t('footer')}</div>`;
    $('#screen').querySelectorAll('[data-game]').forEach(b => b.addEventListener('click', () => { UI.sound('click'); openGame(b.dataset.game); }));
    const target = State.communityCents();
    FX.countUp($('#community'), target - 1800, target, v => State.fmtEuro(v), 1400);
    // Live ticking starts once the count-up has finished.
    setTimeout(() => { if (screen === 'home' && !homeTimer) homeTimer = setInterval(() => { const el = $('#community'); if (el) el.textContent = State.fmtEuro(State.communityCents()); }, 1000); }, 1500);
    animateIn();
  }

  function animateIn() {
    const m = window.__motion; if (!m) return;
    try {
      m.animate('#hero', { opacity: [0, 1], y: [16, 0] }, { duration: .45 });
      m.animate('.game-card', { opacity: [0, 1], y: [20, 0] }, { delay: m.stagger(.06), duration: .4 });
    } catch (e) { }
  }

  /* ---------- Impact ---------- */
  function renderImpact() {
    const d = State.data;
    $('#topbar').innerHTML = `<div class="title">💚 ${t('impact_title')}</div>${langToggle()}${starsPill()}`;
    bindLang($('#topbar'));
    const partners = Object.entries(State.PARTNERS).map(([id, p]) => {
      const mine = d.perPartner[id] || 0; const pct = Math.min(100, Math.round(p.raised / p.goal * 100));
      return `<div class="partner">
        <span class="ico" style="background:${p.bg}">${p.icon}</span>
        <div class="grow">
          <b>${esc(p.name)}</b>
          <span class="small muted">${esc(L(p.cat))} · ${t('month_goal')} ${State.fmtEuro(p.goal)}</span>
          <div class="progress bar"><i style="width:${pct}%"></i></div>
          <div class="row between small mt" style="margin-top:4px"><span>${State.fmtEuro(p.raised)} · ${pct} %</span><span class="muted">${t('from_you')}: <b>${State.fmtCents(mine)}</b></span></div>
        </div></div>`;
    }).join('');
    const hist = d.history.length ? d.history.slice(0, 12).map(h => {
      const p = State.PARTNERS[h.partnerId]; const dt = new Date(h.ts);
      return `<div><span>${dt.toLocaleDateString(LOCALE())} ${dt.toLocaleTimeString(LOCALE(), { hour: '2-digit', minute: '2-digit' })} · ${t(h.type === 'ad' ? 'src_ad' : 'src_iap')} → ${p ? p.icon : ''}</span><b>${State.fmtCents(h.cents)}</b></div>`;
    }).join('') : `<p class="muted small">${t('history_empty')}</p>`;
    $('#screen').innerHTML = `
      <div class="card">
        <h3>${t('split_title')}</h3>
        <div class="row" style="gap:18px">
          <div class="donut"><i>50/50</i></div>
          <div class="legend grow">
            <div><span class="sw" style="background:var(--brand)"></span>50 % ${t('split_partner')}</div>
            <div><span class="sw" style="background:var(--indigo)"></span>50 % ${t('split_app')}</div>
            <p class="small muted" style="margin:8px 0 0">${esc(t('split_fee_note'))}</p>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="row between"><h3 style="margin:0">${t('partners_title')}</h3><span class="pill demo">${t('demo')}</span></div>
        ${partners}
      </div>
      <div class="card">
        <h3>${t('history_title')}</h3>
        <div class="hist">${hist}</div>
      </div>
      <div class="card">
        <h3>${t('how_title')}</h3>
        <p>1 · ${esc(t('how_1'))}</p><p>2 · ${esc(t('how_2'))}</p><p>3 · ${esc(t('how_3'))}</p>
      </div>
      <div class="footer">${t('footer')}</div>`;
  }

  /* ---------- Shop ---------- */
  function renderShop() {
    const d = State.data;
    $('#topbar').innerHTML = `<div class="title">🛍️ ${t('shop_title')}</div>${langToggle()}${starsPill()}`;
    bindLang($('#topbar'));
    $('#screen').innerHTML = `
      <div class="card"><p style="margin:0">${esc(t('shop_note'))}</p><p class="small" style="margin:8px 0 0">✅ ${esc(t('no_lootboxes'))}</p></div>
      ${SHOP.map(it => {
        const owned = !it.repeat && State.hasPurchase(it.id);
        const charity = Math.round(it.price * (1 - State.STORE_FEE) / 2);
        return `<div class="card shop-item">
          <span class="ico" style="background:${it.bg}">${it.icon}</span>
          <div class="grow"><b>${t(it.name)}</b><p class="small" style="margin:2px 0">${esc(t(it.desc))}</p><span class="pill soft">💚 ${State.fmtEuro(charity)} ${t('shop_to_partner')}</span></div>
          <div class="center"><div class="price">${State.fmtEuro(it.price)}</div>
            <button class="btn btn-sm ${owned ? '' : 'btn-indigo'}" data-buy="${it.id}" ${owned ? 'disabled' : ''}>${owned ? t('owned') : t('buy')}</button></div>
        </div>`;
      }).join('')}
      ${d.hints ? `<p class="center small muted">💡 ${t('hints_left', { n: d.hints })}</p>` : ''}
      <div class="footer">${t('footer')}</div>`;
    $('#screen').querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => purchase(SHOP.find(i => i.id === b.dataset.buy))));
  }

  function purchase(it) {
    const fee = Math.round(it.price * State.STORE_FEE); const net = it.price - fee; const charity = Math.round(net / 2);
    UI.modal({
      title: t('purchase_title'),
      html: `<div class="row" style="gap:12px"><span class="ico" style="font-size:40px">${it.icon}</span><div><b>${t(it.name)}</b><div class="muted small">Google Play · App Store (${t('demo')})</div></div></div>
             <p>${esc(t('purchase_body', { price: State.fmtEuro(it.price), fee: State.fmtEuro(fee), net: State.fmtEuro(net), charity: State.fmtEuro(charity), app: State.fmtEuro(net - charity) }))}</p>`,
      actions: [
        { label: t('cancel'), cls: 'btn-ghost' },
        { label: `${t('confirm')} · ${State.fmtEuro(it.price)}`, cls: 'btn-indigo', onClick() {
          const d = State.data;
          d.purchases.push({ id: it.id, ts: Date.now(), price: it.price });
          if (it.id === 'stars') State.addStars(500);
          if (it.id === 'hints') d.hints += 5;
          if (it.id === 'adfree') d.adfreeUntil = Date.now() + 30 * 864e5;
          if (it.id === 'badge') State.unlockBadge('supporter');
          // Purchases without a game context go to the project of the month.
          State.donate(charity, { type: 'iap', partnerId: 'p6', itemId: it.id });
          UI.sound('buy'); UI.toast(`${t('bought')} · 💚 ${State.fmtEuro(charity)}`, 'good');
          FX.confetti(); FX.burst(innerWidth / 2, innerHeight * .55, { type: 'hearts', count: 16, spread: 160, gravity: -20, lift: 60 });
          show('shop');
        } }
      ]
    });
  }

  /* ---------- Profile ---------- */
  const AVATARS = ['🦊', '🐼', '🦉', '🐸', '🦄', '🐨', '🦋', '🐙'];
  function renderProfile() {
    const d = State.data; const lp = State.levelProgress();
    $('#topbar').innerHTML = `<div class="title">👤 ${t('profile_title')}</div>${langToggle()}${starsPill()}`;
    bindLang($('#topbar'));
    const badges = allBadges();
    const adfree = d.adfreeUntil > Date.now();
    $('#screen').innerHTML = `
      <div class="card">
        <div class="row" style="gap:14px">
          <div class="avatar">${d.avatar}</div>
          <div class="grow"><b style="font-size:18px">${t('level')} ${lp.lv}</b><div class="small muted">${d.stars} / ${lp.hi} ⭐</div>
            <div class="progress mt" style="margin-top:6px"><i style="width:${lp.pct}%"></i></div></div>
        </div>
        <div class="avatars mt">${AVATARS.map(a => `<button class="${a === d.avatar ? 'active' : ''}" data-avatar="${a}">${a}</button>`).join('')}</div>
      </div>
      <div class="card">
        <div class="stats">
          <div class="box"><b>${d.gamesPlayed}</b><span>${t('stat_games')}</span></div>
          <div class="box"><b>${d.adsWatched}</b><span>${t('stat_ads')}</span></div>
          <div class="box"><b>${State.fmtCents(d.donatedCents)}</b><span>${t('stat_contrib')}</span></div>
          <div class="box"><b>${d.stars}</b><span>${t('stat_stars')}</span></div>
        </div>
      </div>
      <div class="card"><h3>${t('badges')}</h3>
        <div class="badge-list">${badges.map(b => `<span class="badge ${d.badges[b.id] ? '' : 'locked'}">${b.icon} ${esc(L(b.name))}</span>`).join('')}</div>
      </div>
      <div class="card"><h3>${t('settings')}</h3>
        <div class="setting"><span>${t('lang')}</span>${langToggle()}</div>
        <div class="setting"><span>${t('sound')}</span><button class="switch ${d.sound ? 'on' : ''}" id="sw-sound"></button></div>
        <div class="setting"><span>${t('music')}</span><button class="switch ${d.music ? 'on' : ''}" id="sw-music"></button></div>
        <div class="setting"><span>${t('volume')}</span><input type="range" id="rg-vol" min="0" max="1" step="0.05" value="${d.volume}"></div>
        <div class="setting"><span>${t('consent')}: <b>${d.consent === 'all' ? t('consent_all') : t('consent_min')}</b></span><button class="btn btn-sm btn-outline" id="btn-consent">${t('change')}</button></div>
        <div class="setting"><span>${t('age_ok')}</span><span>${d.ageOk ? '✅' : '—'}</span></div>
        ${adfree ? `<div class="setting"><span>🚫 ${t('item_adfree')}</span><span class="pill soft">${t('owned')}</span></div>` : ''}
      </div>
      <div class="card"><h3>${t('about')}</h3><p>${esc(t('about_text'))}</p><p class="small muted" style="margin-top:6px">${esc(t('credits'))}</p>
        <button class="btn btn-outline btn-block mt" id="btn-reset" style="color:var(--rose)">${t('reset')}</button></div>
      <div class="footer">${t('footer')}</div>`;
    bindLang($('#screen'));
    $('#screen').querySelectorAll('[data-avatar]').forEach(b => b.addEventListener('click', () => { d.avatar = b.dataset.avatar; State.save(); renderProfile(); }));
    $('#sw-sound').addEventListener('click', () => { d.sound = !d.sound; State.save(); UI.sound('click'); renderProfile(); });
    $('#sw-music').addEventListener('click', () => { Snd.setMusic(!d.music); UI.sound('click'); renderProfile(); });
    $('#rg-vol').addEventListener('input', e => Snd.setVolume(+e.target.value));
    $('#rg-vol').addEventListener('change', () => UI.sound('coin'));
    $('#btn-consent').addEventListener('click', () => welcome(true));
    $('#btn-reset').addEventListener('click', () => UI.modal({
      title: t('reset'), html: `<p>${esc(t('reset_confirm'))}</p>`,
      actions: [{ label: t('cancel'), cls: 'btn-ghost' }, { label: t('reset'), cls: 'btn-indigo', onClick() { State.reset(); welcome(); show('home'); } }]
    }));
  }

  /* ---------- Consent / welcome ---------- */
  function welcome(change) {
    const d = State.data;
    const m = UI.modal({
      title: t('welcome_title'), dismissible: !!change,
      html: `<p>${esc(t('welcome_text'))}</p>
             <label class="row" style="margin-top:10px;font-size:14px;cursor:pointer"><input type="checkbox" id="age-ck" ${d.ageOk ? 'checked' : ''} style="width:20px;height:20px"> ${esc(t('welcome_age'))}</label>`,
      actions: [
        { label: t('accept_min'), cls: 'btn-outline', onClick: api => pick('min', api) },
        { label: t('accept_all'), cls: 'btn-primary', onClick: api => pick('all', api) }
      ]
    });
    function pick(v, api) {
      const ok = api.box.querySelector('#age-ck').checked;
      if (!ok) { UI.toast(t('need_age')); return false; }
      d.ageOk = true; d.consent = v; State.save();
      if (screen === 'profile') renderProfile();
    }
    return m;
  }

  /* ---------- Game shell ---------- */
  function openGame(id) {
    const g = Games[id]; if (!g) return;
    unmountGame();
    Snd.music(id);
    screen = 'game';
    $('#tabbar').classList.add('hidden');
    const partner = State.PARTNERS[g.partner];
    $('#topbar').innerHTML = `<button class="icon-btn" id="btn-back">←</button><div class="title">${g.icon} ${esc(L(g.name))}</div>${starsPill()}`;
    $('#btn-back').addEventListener('click', () => {
      UI.sound('click');
      const h = current && current.handle;
      if (h && typeof h.leaveGuard === 'function' && h.leaveGuard()) {
        Kit.confirm(L({ de: 'Level verlassen? Der Fortschritt in diesem Level geht verloren.', en: 'Leave the level? Progress in this level will be lost.', ru: 'Выйти из уровня? Прогресс на этом уровне пропадёт.', uk: 'Вийти з рівня? Прогрес на цьому рівні буде втрачено.' }), () => show('home'));
        return;
      }
      show('home');
    });
    const sc = $('#screen'); sc.className = 'screen game'; sc.scrollTop = 0;
    sc.innerHTML = `<div class="row small muted" style="padding:2px 6px 0">💚 ${t('partner')}: <b style="color:var(--brand)">${partner.icon} ${esc(partner.name.replace(' (Beispiel)', ''))}</b></div><div class="game-wrap" id="game-root"></div>`;
    State.data.gamesPlayed++; State.save();
    const ctx = {
      gameId: id, data: State.game(id), save: State.save,
      stars(n, silent, fromEl) {
        const r = State.addStars(n);
        const pill = $('#stars-pill');
        const from = fromEl || $('#game-root .game-area') || $('#game-root');
        if (pill) { FX.fly(from, pill, '⭐'); setTimeout(() => { pill.textContent = `⭐ ${State.data.stars}`; }, 700); }
        if (!silent) { UI.sound('star'); UI.toast(t('stars_earned', { n }), 'good'); FX.floatAt(from, `+${n} ⭐`, 'gold big'); }
        if (r.levelUp) setTimeout(() => { UI.sound('levelup'); UI.toast(`🎉 ${t('new_level', { n: r.level })}`, 'good'); FX.confetti(); }, 500);
      },
      ad() { return UI.rewardedAd({ partnerId: g.partner, gameId: id }); },
      badge(bid) { if (State.unlockBadge(bid)) setTimeout(() => UI.toast(`🏅 ${badgeName(bid)}`, 'good'), 600); },
      toast: UI.toast, sound: UI.sound, modal: UI.modal, partner: State.PARTNERS[g.partner]
    };
    current = { game: g, handle: g.mount($('#game-root'), ctx) };
  }

  window.Hub = { init() { renderTabbar(); show('home'); if (!State.data.consent) welcome(); }, show, openGame, welcome };
  document.addEventListener('state-changed', () => { const pill = $('#stars-pill'); if (pill) pill.textContent = `⭐ ${State.data.stars}`; });
})();
