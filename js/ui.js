// UI helpers: toast, modal, sound, rewarded ads, game registry.
(function () {
  // Sounds live in audio.js (Snd); UI.sound is kept as the public name used by games.
  const sound = (n, a) => window.Snd && Snd.sfx(n, a);

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function toast(msg, cls) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div'); el.className = 'toast' + (cls ? ' ' + cls : ''); el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2200);
  }

  function modal(opts) {
    const root = document.getElementById('modal-root');
    const back = document.createElement('div'); back.className = 'modal-backdrop';
    const box = document.createElement('div'); box.className = 'modal';
    box.innerHTML = (opts.title ? `<h3>${escapeHtml(opts.title)}</h3>` : '') + (opts.html || '');
    const actions = document.createElement('div'); actions.className = 'actions';
    const api = { close() { back.remove(); }, box, actions };
    (opts.actions || []).forEach(a => {
      const b = document.createElement('button'); b.className = 'btn ' + (a.cls || 'btn-outline'); b.textContent = a.label;
      if (a.id) b.dataset.id = a.id;
      b.addEventListener('click', () => { const r = a.onClick ? a.onClick(api) : undefined; if (r !== false && !a.keepOpen) api.close(); });
      actions.appendChild(b);
    });
    if (opts.actions && opts.actions.length) box.appendChild(actions);
    back.appendChild(box);
    if (opts.dismissible !== false) back.addEventListener('click', e => { if (e.target === back) api.close(); });
    root.appendChild(back);
    return api;
  }

  // Rewarded ad simulation. Resolves true when the reward was claimed.
  function rewardedAd(meta) {
    return new Promise(resolve => {
      const partner = State.PARTNERS[meta.partnerId];
      let s = 5; let done = false;
      if (window.Snd) { Snd.duck(true); Snd.sfx('adstart'); }
      const m = modal({
        title: t('ad_title'), dismissible: false,
        html: `
          <div class="ad-creative">
            <span class="tag">${t('demo')}</span>
            <div><h4>${escapeHtml(t('ad_brand'))}</h4><p style="color:#fff;opacity:.9;margin:4px 0 0">${escapeHtml(t('ad_slogan'))}</p></div>
            <div class="count" id="ad-count">${s}</div>
          </div>
          <p class="small">${escapeHtml(t('ad_sub'))}</p>
          <p class="small">${escapeHtml(t('ad_math'))}</p>
          ${State.data.consent === 'min' ? `<p class="small">${escapeHtml(t('ad_nonpers'))}</p>` : ''}
        `,
        actions: [{ id: 'cancel', label: t('ad_cancel'), cls: 'btn-ghost', onClick: () => { if (done) return false; clearInterval(iv); if (window.Snd) Snd.duck(false); resolve(false); } }]
      });
      const btn = m.actions.querySelector('[data-id="cancel"]');
      const iv = setInterval(() => {
        s--; const c = m.box.querySelector('#ad-count'); if (c) c.textContent = s;
        if (s <= 0) {
          clearInterval(iv); done = true;
          btn.textContent = t('ad_claim'); btn.className = 'btn btn-primary';
          btn.onclick = () => {
            State.data.adsWatched++;
            State.donate(State.AD_CHARITY_CENTS, { type: 'ad', partnerId: meta.partnerId, gameId: meta.gameId });
            m.close(); if (window.Snd) { Snd.duck(false); Snd.sfx('coin'); }
            if (window.FX) FX.burst(innerWidth / 2, innerHeight * .6, { type: 'hearts', count: 18, spread: 170, gravity: -30, lift: 80 });
            toast(t('ad_donated', { amt: State.fmtCents(State.AD_CHARITY_CENTS), partner: partner ? partner.name.replace(' (Beispiel)', '') : '' }), 'good');
            document.dispatchEvent(new Event('state-changed'));
            resolve(true);
          };
        }
      }, 1000);
    });
  }

  window.Games = {
    list: [],
    register(g) { this.list.push(g); this[g.id] = g; }
  };

  window.UI = { toast, modal, sound, rewardedAd, escapeHtml };
})();
