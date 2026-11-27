// Effects layer: particles, floating numbers, count-up, flights, ripples. Web Animations API; Motion when present.
(function () {
  const root = () => { let r = document.getElementById('fx-root'); if (!r) { r = document.createElement('div'); r.id = 'fx-root'; document.body.appendChild(r); } return r; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PAL = {
    confetti: ['#f59e0b', '#4f46e5', '#2e7d5b', '#e11d48', '#0284c7', '#ffd54f'],
    leaves: ['#56b25f', '#3f9d4a', '#8cc96f', '#2e7d5b'],
    hearts: ['#ff8fa3', '#e11d48', '#f472b6'],
    coins: ['#ffd54f', '#f1b31c', '#ffe08a'],
    sparks: ['#ffffff', '#ffd54f', '#f59e0b'],
    bricks: ['#c0392b', '#e74c3c', '#7b241c']
  };
  const GLYPH = { leaves: '🍃', hearts: '❤', sparks: '✦', coins: '●' };

  function burst(x, y, o = {}) {
    const type = o.type || 'confetti', n = o.count || 18, r = root();
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span'); el.className = 'fx-p';
      const col = PAL[type][i % PAL[type].length];
      if (GLYPH[type]) { el.textContent = GLYPH[type]; el.style.color = col; el.style.fontSize = rnd(11, 20) + 'px'; }
      else { el.style.background = col; el.style.width = rnd(6, 11) + 'px'; el.style.height = rnd(6, 11) + 'px'; el.style.borderRadius = Math.random() < .5 ? '50%' : '2px'; }
      el.style.left = x + 'px'; el.style.top = y + 'px'; r.appendChild(el);
      const ang = rnd(0, Math.PI * 2), dist = rnd(30, o.spread || 110);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - (o.lift || 40) + (o.gravity || 70);
      el.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rnd(-300, 300)}deg) scale(${rnd(.3, .9)})`, opacity: 0 }
      ], { duration: rnd(600, 1100), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).onfinish = () => el.remove();
    }
  }
  const center = el => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
  function burstAt(el, o) { if (!el) return; const [x, y] = center(el); burst(x, y, o); }
  function confetti() {
    const w = innerWidth, h = innerHeight;
    for (let k = 0; k < 3; k++) setTimeout(() => burst(rnd(w * .25, w * .75), h * .3, { type: 'confetti', count: 30, spread: 240, gravity: 260, lift: 140 }), k * 160);
  }
  function float(x, y, text, cls) {
    const el = document.createElement('span'); el.className = 'fx-float ' + (cls || ''); el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px'; root().appendChild(el);
    el.animate([
      { transform: 'translate(-50%,-50%) scale(.7)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: .25 },
      { transform: 'translate(-50%,-230%) scale(1)', opacity: 0 }
    ], { duration: 950, easing: 'ease-out', fill: 'forwards' }).onfinish = () => el.remove();
  }
  function floatAt(el, text, cls) { if (!el) return; const [x, y] = center(el); float(x, y, text, cls); }
  function fly(fromEl, toEl, text) {
    if (!fromEl || !toEl) return;
    const [ax, ay] = center(fromEl), [bx, by] = center(toEl);
    const el = document.createElement('span'); el.className = 'fx-float'; el.textContent = text;
    el.style.left = ax + 'px'; el.style.top = ay + 'px'; el.style.fontSize = '22px'; root().appendChild(el);
    const dx = bx - ax, dy = by - ay;
    el.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * .45}px), calc(-50% + ${dy * .45 - 90}px)) scale(1.5)`, opacity: 1, offset: .5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.5)`, opacity: .8 }
    ], { duration: 750, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).onfinish = () => { el.remove(); bump(toEl); };
  }
  function countUp(el, from, to, fmt, dur = 1000) {
    if (!el) return;
    const m = window.__motion;
    if (m) { try { m.animate(from, to, { duration: dur / 1000, ease: [.2, .7, .2, 1], onUpdate: v => { el.textContent = fmt(v); } }); return; } catch (e) { } }
    const t0 = performance.now();
    (function step(now) { const p = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); })(t0);
  }
  const reclass = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const shake = el => reclass(el, 'shake');
  const bump = el => reclass(el, 'bump');
  function flash(el, color) { if (!el) return; el.animate([{ boxShadow: `inset 0 0 0 5px ${color}` }, { boxShadow: 'inset 0 0 0 0 transparent' }], { duration: 450, easing: 'ease-out' }); }

  // Ripple on tappable things.
  document.addEventListener('pointerdown', e => {
    const b = e.target && e.target.closest && e.target.closest('.btn, .tab, .game-card, .m3-cell, .ks-cell, .wb-tile, .quiz-opt, .ks-tool, .wk-item button');
    if (!b) return;
    const r = b.getBoundingClientRect(); const s = Math.max(r.width, r.height) * 1.3;
    const rip = document.createElement('span'); rip.className = 'fx-ripple';
    rip.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.appendChild(rip); setTimeout(() => rip.remove(), 550);
  }, { passive: true });

  window.FX = { burst, burstAt, confetti, float, floatAt, fly, countUp, shake, bump, flash };
})();
