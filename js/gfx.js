// Gfx: shared canvas toolkit for the games (blocky "toy world" look, particles, avatar, sky, game loop).
(function () {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const cache = {};
  function shade(hex, p) { // lighten (+) / darken (-) a #rrggbb colour
    const k = hex + p; if (cache[k]) return cache[k];
    const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = c => Math.round(p > 0 ? c + (255 - c) * p : c * (1 + p));
    return (cache[k] = `rgb(${f(r)},${f(g)},${f(b)})`);
  }

  // Canvas setup with DPR handling. ratio = height/width.
  function setup(cv, wrap, ratio, maxH) {
    const g = cv.getContext('2d');
    const st = { g, W: 360, H: 400, DPR: 1 };
    st.resize = () => {
      st.DPR = Math.min(2, window.devicePixelRatio || 1);
      st.W = Math.max(280, wrap.clientWidth || 360); st.H = Math.round(Math.min(maxH || 480, st.W * (ratio || 1.1)));
      cv.width = Math.round(st.W * st.DPR); cv.height = Math.round(st.H * st.DPR); cv.style.height = st.H + 'px';
      g.setTransform(st.DPR, 0, 0, st.DPR, 0, 0);
    };
    st.resize();
    return st;
  }
  // rAF loop with clamped dt; returns stop(). Skips updates while the tab is hidden.
  function loop(fn) {
    let running = true, last = 0, id = 0;
    const frame = now => { if (!running) return; const dt = Math.min(0.033, last ? (now - last) / 1000 : 0); last = now; if (!document.hidden) fn(dt, now / 1000); id = requestAnimationFrame(frame); };
    id = requestAnimationFrame(frame);
    return () => { running = false; cancelAnimationFrame(id); };
  }
  function point(e, cv) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  // Side-view 2.5D block with studs on top.
  function block(g, x, y, w, h, color, o) {
    o = o || {}; const dx = o.dx == null ? 8 : o.dx, dy = o.dy == null ? -6 : o.dy;
    g.fillStyle = shade(color, -0.28); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w + dx, y + dy); g.lineTo(x + w + dx, y + h + dy); g.lineTo(x + w, y + h); g.closePath(); g.fill();
    g.fillStyle = shade(color, 0.32); g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w + dx, y + dy); g.lineTo(x + dx, y + dy); g.closePath(); g.fill();
    g.fillStyle = color; g.fillRect(x, y, w, h);
    if (o.studs) { g.fillStyle = shade(color, 0.55); const step = o.studs === true ? 34 : o.studs; for (let sx = x + step / 2 + 3; sx < x + w; sx += step) { g.beginPath(); g.ellipse(sx, y + dy / 2, 4, 2.6, 0, 0, Math.PI * 2); g.fill(); } }
  }
  // Isometric cube (2:1). (cx, cy) = centre of the top face at ground level; s = half tile width; h = height.
  function cube(g, cx, cy, s, h, color, o) {
    o = o || {}; const hs = s / 2;
    // left face
    g.fillStyle = o.left || shade(color, -0.22); g.beginPath(); g.moveTo(cx - s, cy); g.lineTo(cx, cy + hs); g.lineTo(cx, cy + hs - h); g.lineTo(cx - s, cy - h); g.closePath(); g.fill();
    // right face
    g.fillStyle = o.right || shade(color, -0.42); g.beginPath(); g.moveTo(cx + s, cy); g.lineTo(cx, cy + hs); g.lineTo(cx, cy + hs - h); g.lineTo(cx + s, cy - h); g.closePath(); g.fill();
    // top
    g.fillStyle = o.top || shade(color, 0.22); g.beginPath(); g.moveTo(cx, cy - hs - h); g.lineTo(cx + s, cy - h); g.lineTo(cx, cy + hs - h); g.lineTo(cx - s, cy - h); g.closePath(); g.fill();
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = 1; g.stroke(); }
  }
  function isoTile(g, cx, cy, s, color, stroke) {
    const hs = s / 2; g.fillStyle = color; g.beginPath(); g.moveTo(cx, cy - hs); g.lineTo(cx + s, cy); g.lineTo(cx, cy + hs); g.lineTo(cx - s, cy); g.closePath(); g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
  }

  // Blocky avatar, 26×44 at scale 1, origin top-left.
  function avatar(g, x, y, o) {
    o = o || {}; const sc = o.scale || 1, c = Object.assign({ head: '#fcd34d', torso: '#3b82f6', legs: '#22c55e', arms: '#fcd34d' }, o.colors || {});
    g.save(); g.translate(x + 13 * sc, y + 22 * sc);
    if (o.spin) g.rotate(o.spin);
    if (o.squash) g.scale(1 + o.squash * 0.25, 1 - o.squash * 0.25);
    if (o.flip) g.scale(-1, 1);
    g.scale(sc, sc); g.translate(-13, -22);
    const swing = o.swing || 0, air = o.air ? 1 : 0;
    [[-1, 8], [1, 16]].forEach(([dir, lx]) => { g.save(); g.translate(lx + 1, 32); g.rotate(swing * dir + air * 0.4 * dir); g.fillStyle = c.legs; g.fillRect(-4, 0, 8, 13); g.restore(); });
    [[1, 0], [-1, 22]].forEach(([dir, ax]) => { g.save(); g.translate(ax + 2, 18); g.rotate(swing * dir * 0.8 - air * 1.6 - (o.cheer ? 2.6 : 0)); g.fillStyle = c.arms; g.fillRect(-3, 0, 6, 13); g.restore(); });
    g.fillStyle = c.torso; g.fillRect(3, 16, 20, 17); g.fillStyle = shade(c.torso, 0.25); g.fillRect(3, 16, 20, 4);
    g.fillStyle = c.head; roundRect(g, 3, 0, 20, 17, 4); g.fill();
    g.fillStyle = '#1e293b';
    if (o.expr === 'oof') { g.fillRect(9, 5, 4, 1.6); g.fillRect(16, 5, 4, 1.6); g.beginPath(); g.ellipse(14.5, 11.5, 3, 2.4, 0, 0, 7); g.fill(); }
    else { g.fillRect(10, 6, 3, 3); g.fillRect(17, 6, 3, 3); g.strokeStyle = '#1e293b'; g.lineWidth = 1.6; g.beginPath(); if (o.expr === 'happy') { g.arc(15, 9, 5, 0.1, Math.PI - 0.1); } else g.arc(15, 10, 4, 0.2, Math.PI - 0.2); g.stroke(); }
    g.restore();
  }

  // Sky with sun, parallax clouds; hue in degrees.
  function sky(g, W, H, o) {
    o = o || {}; const hue = o.hue == null ? 205 : o.hue, t = o.t || 0, camX = o.camX || 0, night = o.night || 0;
    const sk = g.createLinearGradient(0, 0, 0, H);
    sk.addColorStop(0, `hsl(${hue},${75 - night * 40}%,${58 - night * 45}%)`); sk.addColorStop(1, `hsl(${(hue + 40) % 360},${90 - night * 40}%,${86 - night * 60}%)`);
    g.fillStyle = sk; g.fillRect(0, 0, W, H);
    if (night > 0.3) { g.fillStyle = `rgba(255,255,255,${(night - 0.3)})`; for (let i = 0; i < 30; i++) { g.fillRect(hash(i) * W, hash(i + 50) * H * 0.6, 2, 2); } }
    if (o.sun !== false) { g.fillStyle = night > 0.5 ? 'rgba(255,255,230,.9)' : 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(W * (o.sunX || 0.8), H * (o.sunY || 0.16), o.sunR || 24, 0, Math.PI * 2); g.fill(); }
    if (o.clouds !== false) {
      g.fillStyle = `rgba(255,255,255,${0.75 - night * 0.5})`;
      for (let i = 0; i < 7; i++) { const span = W + 240, cx = ((i * 173 - camX * 0.15 - t * 6) % span + span) % span - 120, cy = 20 + hash(i) * H * 0.28, r = 12 + hash(i + 9) * 14; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.arc(cx + r, cy + 4, r * .8, 0, 7); g.arc(cx - r, cy + 5, r * .7, 0, 7); g.fill(); }
    }
  }
  // Rolling hills in a given colour; y = baseline, amp = wave amplitude.
  function hills(g, W, y, amp, color, phase, camX) {
    g.fillStyle = color; g.beginPath(); g.moveTo(0, y + 400);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin((x + (camX || 0) * 0.4) * 0.012 + (phase || 0)) * amp + Math.sin((x + (camX || 0) * 0.4) * 0.03 + (phase || 0) * 2) * amp * 0.4);
    g.lineTo(W, y + 400); g.closePath(); g.fill();
  }
  // Low-poly tree: trunk + stacked triangles; size in px.
  function tree(g, x, y, size, sway, o) {
    o = o || {}; const leaf = o.color || '#22c55e';
    g.save(); g.translate(x, y); g.rotate((sway || 0) * 0.03);
    g.fillStyle = '#92400e'; g.fillRect(-size * 0.08, -size * 0.25, size * 0.16, size * 0.28);
    const layers = o.layers || 3;
    for (let i = 0; i < layers; i++) {
      const w = size * (0.55 - i * 0.12), top = -size * (0.45 + i * 0.28), base = top + size * 0.42;
      g.fillStyle = shade(leaf, -0.2 + i * 0.12); g.beginPath(); g.moveTo(0, top); g.lineTo(w, base); g.lineTo(-w, base); g.closePath(); g.fill();
      g.fillStyle = shade(leaf, 0.05 + i * 0.12); g.beginPath(); g.moveTo(0, top); g.lineTo(w, base); g.lineTo(0, base); g.closePath(); g.fill();
    }
    g.restore();
  }

  // Particle system.
  function particles() {
    const list = [];
    return {
      list,
      add(p) { list.push(Object.assign({ life: 1, max: 1, grav: 900, size: 6, rot: 0, vr: 0, vx: 0, vy: 0, color: '#fff', shape: 'rect' }, p)); if (p.max == null) list[list.length - 1].max = list[list.length - 1].life; },
      burst(x, y, colors, n, power, o) { o = o || {}; for (let i = 0; i < n; i++) { const a = o.up ? -Math.PI / 2 + rnd(-o.up, o.up) : Math.random() * Math.PI * 2, v = rnd(60, power || 320); this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.lift == null ? 120 : o.lift), life: rnd(.5, 1) * (o.life || 1), color: colors[i % colors.length], size: rnd(4, 9) * (o.size || 1), grav: o.grav == null ? 900 : o.grav, rot: Math.random() * 6, vr: rnd(-8, 8), shape: o.shape || 'rect' }); } },
      update(dt) { for (const q of list) { q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; if (q.drag) { q.vx *= (1 - q.drag * dt); q.vy *= (1 - q.drag * dt); } } for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1); },
      draw(g, camX, camY) { camX = camX || 0; camY = camY || 0; for (const q of list) { g.save(); g.globalAlpha = Math.max(0, Math.min(1, q.life / q.max)); g.translate(q.x - camX, q.y - camY); g.rotate(q.rot); g.fillStyle = q.color; if (q.shape === 'circle') { g.beginPath(); g.arc(0, 0, q.size / 2, 0, 7); g.fill(); } else if (q.shape === 'leaf') { g.beginPath(); g.ellipse(0, 0, q.size / 2, q.size / 4, 0, 0, 7); g.fill(); } else g.fillRect(-q.size / 2, -q.size / 2, q.size, q.size); g.restore(); } g.globalAlpha = 1; }
    };
  }
  // Floating texts.
  function floats() {
    const list = [];
    return {
      add(x, y, text, color, size) { list.push({ x, y, text, color: color || '#fff', size: size || 14, life: 1 }); },
      update(dt) { for (const f of list) { f.life -= dt * 1.1; f.y -= 42 * dt; } for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1); },
      draw(g, camX, camY) { camX = camX || 0; camY = camY || 0; g.textAlign = 'center'; for (const f of list) { g.globalAlpha = Math.max(0, f.life); g.font = `bold ${f.size}px system-ui`; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillText(f.text, f.x - camX + 1, f.y - camY + 1); g.fillStyle = f.color; g.fillText(f.text, f.x - camX, f.y - camY); } g.globalAlpha = 1; }
    };
  }
  // Centre banner (fades out).
  function banner(g, W, y, text, life, sub) {
    if (life <= 0) return; g.save(); g.globalAlpha = Math.min(1, life * 2); g.fillStyle = 'rgba(15,23,42,.55)'; g.fillRect(0, y, W, sub ? 70 : 56);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 26px system-ui'; g.fillText(text, W / 2, y + 38);
    if (sub) { g.font = 'bold 13px system-ui'; g.fillText(sub, W / 2, y + 58); } g.restore();
  }
  function shakeXY(shake) { return shake > 0 ? [(Math.random() - .5) * 14 * shake, (Math.random() - .5) * 14 * shake] : [0, 0]; }

  // Standard game canvas markup: returns {wrap, cv, overlay}; overlay shows title + hint until hidden.
  function mountCanvas(root, o) {
    const wrap = document.createElement('div'); wrap.className = 'cv-wrap';
    wrap.innerHTML = `<canvas></canvas>${o && o.title ? `<div class="cv-overlay"><b>${o.title}</b><span>${o.hint || ''}</span><em>${o.cta || 'GO'}</em></div>` : ''}`;
    root.appendChild(wrap);
    return { wrap, cv: wrap.querySelector('canvas'), overlay: wrap.querySelector('.cv-overlay') };
  }

  window.Gfx = { rnd, clamp, hash, lerp, shade, setup, loop, point, roundRect, block, cube, isoTile, avatar, sky, hills, tree, particles, floats, banner, shakeXY, mountCanvas };
})();
