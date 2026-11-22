// Obby Rush: an auto-run obstacle course in the spirit of Roblox obbies.
// Canvas 2D, procedural stages, kill bricks, spinners, bounce pads, speed pads, moving platforms, coins, lava, checkpoints.
Games.register({
  id: 'obby', icon: '🏃', bg: '#dbeafe', partner: 'p5', tier: 'top', kicker: { de: 'Obby-Parcours', ru: 'Обби-паркур' },
  name: { de: 'Obby Rush', ru: 'Obby Rush' },
  tagline: { de: 'Killbricks, Spinner, Lava: Wie viele Stages schaffst du?', ru: 'Ловушки, спиннеры, лава: сколько этапов осилишь?' },
  mount(root, ctx) {
    const S = {
      de: { title: 'OBBY RUSH', tap: 'Tippen = Springen · 2× = Doppelsprung', intro: 'Spring über rote Killbricks, weiche Spinnern aus, nutze grüne Sprungfelder. Jede Fahne = neue Stage, schneller und fieser.', stage: 'Stage', over: 'Rausgeflogen!', reached: 'Stage erreicht', coins: 'Münzen', best: 'Rekord', revive: 'Extra-Leben', again: 'Noch einmal', home: 'Zum Hub', go: 'Los!', newbest: 'Neuer Rekord!' },
      ru: { title: 'OBBY RUSH', tap: 'Тап = прыжок · 2× = двойной', intro: 'Перепрыгивай красные блоки, уворачивайся от спиннеров, используй зелёные батуты. Каждый флаг = новый этап, быстрее и злее.', stage: 'Этап', over: 'Вылетел!', reached: 'Достигнут этап', coins: 'Монеты', best: 'Рекорд', revive: 'Доп. жизнь', again: 'Ещё раз', home: 'В хаб', go: 'Погнали!', newbest: 'Новый рекорд!' }
    };
    const s = k => (S[LANG] || S.de)[k];
    const d = ctx.data; d.best = d.best || 0; d.runs = d.runs || 0; d.coinsTotal = d.coinsTotal || 0;

    root.innerHTML = `
      <div class="game-head">
        <span class="stat">🚩 <b id="ob-stage">1</b></span>
        <span class="stat">🪙 <b id="ob-coins">0</b></span>
        <span class="stat" id="ob-lives">❤️❤️❤️</span>
        <span class="stat muted">🏆 <span id="ob-best">${d.best}</span></span>
      </div>
      <div class="obby-wrap" id="ob-wrap"><canvas id="ob-cv"></canvas>
        <div class="obby-overlay" id="ob-ov"><b>${s('title')}</b><span>${s('tap')}</span><em>${s('go')}</em></div>
      </div>
      <p class="small muted center" style="margin:8px 0 0">${s('intro')}</p>`;
    const cv = root.querySelector('#ob-cv'), g = cv.getContext('2d'), wrap = root.querySelector('#ob-wrap'), ov = root.querySelector('#ob-ov');
    const $stage = root.querySelector('#ob-stage'), $coins = root.querySelector('#ob-coins'), $lives = root.querySelector('#ob-lives'), $best = root.querySelector('#ob-best');

    /* ---------- constants ---------- */
    const TILE = 34, G = 2300, JUMP = -760, DJUMP = -640, BOUNCE = -1250, PW = 26, PH = 44;
    const PALETTE = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    function shade(hex, p) { // lighten (+) / darken (-) a #rrggbb colour
      const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
      const f = c => Math.round(p > 0 ? c + (255 - c) * p : c * (1 + p));
      return `rgb(${f(r)},${f(gg)},${f(b)})`;
    }

    /* ---------- state ---------- */
    let W = 360, H = 420, DPR = 1, minY, maxY, lavaY;
    let state = 'ready', plats, coins, parts, floats, player, camX, stage, lives, coinCount, platCount, check, shake, boost, timeAcc, deadT, bannerT, invul, comboN, comboT, revived, raf, last, running = true;
    let coyote = 0, jumpBuf = 0; // forgiving controls: late jumps after an edge, early taps before landing

    function resize() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(280, wrap.clientWidth || 360); H = Math.round(Math.min(470, W * 1.2));
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.height = H + 'px';
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      minY = H * 0.28; maxY = H * 0.78; lavaY = H * 0.9;
    }
    function newRun() {
      plats = []; coins = []; parts = []; floats = [];
      stage = 1; lives = 3; coinCount = 0; platCount = 0; shake = 0; boost = 0; timeAcc = 0; bannerT = 0; invul = 0; comboN = 0; comboT = 0; revived = false;
      const first = { x: 0, y: H * 0.6, w: 7 * TILE, h: 70, color: PALETTE[0], check: true, stage: 1, claimed: true };
      plats.push(first); check = first;
      player = { x: 60, y: first.y - PH, vx: 0, vy: 0, onGround: true, canDouble: true, spin: 0, squash: 0, runT: 0, face: 1 };
      camX = 0;
      while (plats[plats.length - 1].x < W * 2.5) addPlatform();
      hud();
    }
    const speedFor = st => Math.min(440, 240 + st * 16);

    /* ---------- procedural course ---------- */
    function addPlatform() {
      const last = plats[plats.length - 1], sp = speedFor(stage), idx = ++platCount;
      const isCheck = idx % 10 === 0;
      let gap, y, w;
      if (isCheck) {
        gap = rnd(60, sp * 0.45); y = clamp(last.y + rnd(-60, 40), minY, maxY); w = 6 * TILE;
        plats.push({ x: last.x + last.w + gap, y, w, h: 70, color: '#34d399', check: true, stage: stage + 1, claimed: false });
        return;
      }
      if (last.pad) { // target of a bounce pad: place it where the bounce arc comes back down to its height
        const padC = last.pad.x + last.pad.w / 2, toEnd = last.x + last.w - padC;
        y = clamp(last.y - rnd(40, 110), minY, maxY);
        const tAir = (-BOUNCE + Math.sqrt(BOUNCE * BOUNCE - 2 * G * (last.y - y))) / G;
        gap = Math.max(40, sp * tAir * rnd(0.58, 0.76) - toEnd); w = Math.round(rnd(5, 6)) * TILE;
      }
      else {
        const ease = Math.min(1, 0.45 + stage * 0.14); // early stages stay flatter
        gap = rnd(sp * 0.2, sp * (0.42 + Math.min(stage, 10) * 0.04)); y = clamp(last.y + rnd(-130, 85) * ease, minY, maxY); if (y < last.y - 88) y = last.y - 88;
        if (y < last.y) gap *= 1 - (last.y - y) / 220; // climbing costs air time, so shorten the gap
        w = Math.round(rnd(Math.max(2, 5 - stage * 0.3), 6)) * TILE;
      }
      const p = { x: last.x + last.w + gap, y, w, h: 70, color: PALETTE[Math.floor(Math.random() * PALETTE.length)] };
      if (stage >= 3 && w <= 3 * TILE && Math.random() < 0.25) p.move = { amp: 35, period: rnd(1.6, 2.6), phase: Math.random() * 6, y0: p.y };
      const difficulty = Math.min(1, 0.12 + stage * 0.09);
      if (w >= 3 * TILE && Math.random() < difficulty * 0.65) {
        if (w >= 4 * TILE && stage >= 3 && Math.random() < 0.45) p.spinner = { cx: p.x + p.w / 2, len: 36 + Math.min(stage * 3, 44), ang: Math.random() * 6, speed: (2.4 + stage * 0.18) * (Math.random() < .5 ? 1 : -1) };
        else p.kill = { x: p.x + rnd(46, p.w - 46 - 34), w: 34 };
      }
      if (!p.spinner && !p.kill && !p.move && w >= 3 * TILE && Math.random() < 0.2 + stage * 0.01) p.pad = { x: p.x + p.w / 2 - 20, w: 40 };
      if (!p.pad && !p.kill && Math.random() < 0.14) p.speed = { x: p.x + 8, w: 52 };
      if (Math.random() < 0.5) { for (let i = 0; i < Math.floor(p.w / TILE); i++) { const cx = p.x + i * TILE + TILE / 2; const nearKill = p.kill && Math.abs(cx - p.kill.x - 17) < 40; coins.push({ x: cx, y: p.y - 42 - (nearKill ? 56 : 0), r: 9, t: Math.random() * 6 }); } }
      else { const n = 5; for (let i = 0; i < n; i++) { const tt = (i + 0.5) / n; coins.push({ x: last.x + last.w + gap * tt, y: Math.min(last.y, y) - 50 - Math.sin(tt * Math.PI) * 70, r: 9, t: i }); } }
      plats.push(p);
    }

    /* ---------- helpers ---------- */
    function hud() { $stage.textContent = stage; $coins.textContent = coinCount; $lives.textContent = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, 3 - lives)); $best.textContent = d.best; }
    function burst(x, y, colors, n, power) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = rnd(60, power || 320); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: rnd(.5, 1), max: 1, color: colors[i % colors.length], size: rnd(4, 9), grav: 900, rot: Math.random() * 6, vr: rnd(-8, 8) }); } }
    function floatText(x, y, text, color) { floats.push({ x, y, text, color: color || '#fff', life: 1 }); }
    function jump() {
      if (state === 'ready') { state = 'run'; ov.classList.add('hidden'); last = performance.now(); return; }
      if (state !== 'run') return;
      if (player.onGround || coyote > 0) { coyote = 0; player.vy = JUMP; player.onGround = false; player.canDouble = true; ctx.sound('jump'); burst(player.x + PW / 2, player.y + PH, ['#ffffff', '#e2e8f0'], 6, 120); }
      else if (player.canDouble) { player.vy = DJUMP; player.canDouble = false; player.spin = 1; ctx.sound('djump'); burst(player.x + PW / 2, player.y + PH / 2, ['#ffffff', '#bae6fd'], 8, 160); }
      else jumpBuf = 0.14;
    }
    let lastDeath = '';
    function die(cause) {
      if (state !== 'run') return;
      lastDeath = cause || '?'; state = 'dead'; deadT = 0; lives--; shake = 1; boost = 0; comboN = 0;
      ctx.sound('oof');
      burst(player.x + PW / 2, player.y + PH / 2, ['#fcd34d', '#3b82f6', '#22c55e', '#fcd34d'], 22, 420);
      hud();
    }
    function respawn() {
      player.x = check.x + 24; player.y = check.y - PH - 1; player.vy = 0; player.onGround = true; player.canDouble = true; player.spin = 0; invul = 1.6; coyote = 0; jumpBuf = 0;
      camX = player.x - W * 0.3; while (plats[plats.length - 1].x < camX + W * 2.2) addPlatform();
      state = 'run';
    }
    function gameOver() {
      state = 'over'; d.runs++; d.coinsTotal += coinCount; ctx.save();
      const isBest = stage > d.best; if (isBest) { d.best = stage; ctx.save(); hud(); }
      const starsEarned = stage * 2 + Math.floor(coinCount / 5);
      ctx.sound('gameover');
      if (stage >= 5) ctx.badge('obby');
      setTimeout(() => {
        if (starsEarned) ctx.stars(starsEarned);
        const actions = [];
        if (!revived) actions.push({ label: `📺 ${s('revive')} · ${t('watch_ad')}`, cls: 'btn-ad', async onClick() { const ok = await ctx.ad(); if (ok) { revived = true; lives = 1; hud(); respawn(); last = performance.now(); } else gameOver(); } });
        actions.push({ label: s('again'), cls: 'btn-primary', onClick() { newRun(); state = 'ready'; ov.classList.remove('hidden'); } });
        actions.push({ label: s('home'), cls: 'btn-ghost', onClick() { Hub.show('home'); } });
        ctx.modal({ title: s('over'), dismissible: false, actions,
          html: `<div class="center" style="font-size:48px">💥</div>
                 <div class="stats" style="margin-top:8px"><div class="box"><b>${stage}</b><span>${s('reached')}</span></div><div class="box"><b>${coinCount}</b><span>${s('coins')}</span></div></div>
                 <p class="center" style="margin:10px 0 0">${isBest ? '🏆 ' + s('newbest') : s('best') + ': ' + d.best}</p>` });
      }, 700);
    }

    /* ---------- update ---------- */
    function update(dt) {
      timeAcc += dt;
      if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
      if (bannerT > 0) bannerT -= dt;
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) comboN = 0; }
      // moving platforms & spinners animate always
      for (const p of plats) {
        if (p.move) { const ny = p.move.y0 + Math.sin(timeAcc * Math.PI * 2 / p.move.period + p.move.phase) * p.move.amp; p.dy = ny - p.y; p.y = ny; }
        if (p.spinner) p.spinner.ang += p.spinner.speed * dt;
      }
      // particles & floats
      for (const q of parts) { q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; }
      parts = parts.filter(q => q.life > 0);
      for (const f of floats) { f.life -= dt * 1.2; f.y -= 40 * dt; }
      floats = floats.filter(f => f.life > 0);
      for (const c of coins) c.t += dt * 4;

      if (state === 'dead') { deadT += dt; if (deadT > 0.9) { if (lives > 0) respawn(); else gameOver(); } return; }
      if (state !== 'run') return;
      if (invul > 0) invul -= dt;
      if (boost > 0) boost -= dt;

      const sp = speedFor(stage) * (boost > 0 ? 1.45 : 1);
      player.vx = sp; player.runT += dt * (sp / 240);
      const prevBottom = player.y + PH, prevRight = player.x + PW;
      player.x += player.vx * dt; player.vy += G * dt; player.y += player.vy * dt;
      if (player.spin > 0) player.spin = Math.max(0, player.spin - dt * 2.4);
      if (player.squash > 0) player.squash = Math.max(0, player.squash - dt * 6);
      const wasGround = player.onGround;
      player.onGround = false;
      let landedOn = null;
      for (const p of plats) {
        if (p.x > player.x + PW + 4 || p.x + p.w < player.x - 4) continue;
        const top = p.y, bottom = player.y + PH;
        if (player.vy >= 0 && prevBottom <= top + 2 + Math.max(0, p.dy || 0) && bottom >= top) {
          player.y = top - PH; player.vy = 0; player.onGround = true; player.canDouble = true; landedOn = p;
          if (p.move) player.y += 0; // rides via dy below
        } else if (bottom > top + 10 && player.y < top + p.h && prevRight <= p.x + 2 && player.x + PW > p.x) {
          if (bottom - top < 40) { player.y = top - PH; player.vy = 0; player.onGround = true; player.canDouble = true; landedOn = p; } // ledge assist: climb up
          else player.x = p.x - PW; // ran into the wall: stop until the player jumps over
        }
      }
      if (wasGround && !landedOn) coyote = 0.11; else if (landedOn) coyote = 0; else coyote = Math.max(0, coyote - dt);
      if (jumpBuf > 0) { jumpBuf -= dt; if (landedOn && jumpBuf > 0) { jumpBuf = 0; setTimeout(jump, 0); } }
      if (landedOn) {
        if (landedOn.dy) player.y += landedOn.dy;
        if (prevBottom < landedOn.y - 2) { player.squash = 1; ctx.sound('land'); burst(player.x + PW / 2, player.y + PH, ['#ffffff'], 4, 90); }
        const cx = player.x + PW / 2;
        if (false) {
          player.vy = BOUNCE; player.onGround = false; player.canDouble = true; player.spin = 1.5; ctx.sound('bounce'); shake = Math.max(shake, .25);
          burst(cx, landedOn.y, ['#4ade80', '#bbf7d0', '#ffffff'], 14, 260); floatText(cx, landedOn.y - 30, 'BOING!', '#bbf7d0');
        }
        if (landedOn.speed && cx > landedOn.speed.x && cx < landedOn.speed.x + landedOn.speed.w && boost <= 0.2) { boost = 2.2; ctx.sound('speed'); floatText(cx, landedOn.y - 30, 'SPEED!', '#fde68a'); }
        if (landedOn.check && !landedOn.claimed) {
          landedOn.claimed = true; check = landedOn; stage = landedOn.stage; bannerT = 1.6;
          ctx.sound('checkpoint'); ctx.stars(3, true); burst(landedOn.x + landedOn.w / 2, landedOn.y - 60, PALETTE, 36, 380);
          if (stage > d.best) { d.best = stage; ctx.save(); }
          hud();
        }
      }
      // bounce pads catch the player on the ground and when skimming low over them
      for (const p of plats) {
        if (!p.pad || p.x > player.x + PW + 10 || p.x + p.w < player.x - 10) continue;
        const cx = player.x + PW / 2, bottom = player.y + PH;
        if (cx > p.pad.x - 8 && cx < p.pad.x + p.pad.w + 8 && bottom > p.y - 34 && bottom < p.y + 6 && player.vy >= -50) {
          player.vy = BOUNCE; player.onGround = false; player.canDouble = true; player.spin = 1.5; ctx.sound('bounce'); shake = Math.max(shake, .25);
          burst(cx, p.y, ['#4ade80', '#bbf7d0', '#ffffff'], 14, 260); floatText(cx, p.y - 30, 'BOING!', '#bbf7d0');
        }
      }
      // hazards
      if (invul <= 0) {
        const pcx = player.x + PW / 2, pcy = player.y + PH / 2;
        for (const p of plats) {
          if (p.x > player.x + PW + 80 || p.x + p.w < player.x - 80) continue;
          if (p.kill && player.x + PW - 4 > p.kill.x && player.x + 4 < p.kill.x + p.kill.w && player.y + PH > p.y - 22 && player.y < p.y) { die('kill'); return; }
          if (p.spinner) {
            const sx = p.spinner.cx, sy = p.y - 34, ca = Math.cos(p.spinner.ang), sa = Math.sin(p.spinner.ang), L = p.spinner.len;
            for (const [qx, qy] of [[pcx, pcy - 14], [pcx, pcy + 14], [pcx - 8, pcy], [pcx + 8, pcy]]) {
              const dx = qx - sx, dy = qy - sy, proj = clamp(dx * ca + dy * sa, -L, L), ex = sx + ca * proj, ey = sy + sa * proj;
              if ((qx - ex) ** 2 + (qy - ey) ** 2 < 11 * 11) { die('spinner'); return; }
            }
          }
        }
      }
      // coins
      for (const c of coins) {
        if (c.got) continue;
        const dx = c.x - (player.x + PW / 2), dy = c.y - (player.y + PH / 2);
        if (dx * dx + dy * dy < 26 * 26) {
          c.got = true; coinCount++; d.coinsTotal++; comboN++; comboT = 1;
          ctx.sound('coin', comboN); burst(c.x, c.y, ['#fde047', '#fbbf24', '#fff7ae'], 6, 150); floatText(c.x, c.y - 14, comboN >= 5 ? `+1 ×${comboN}` : '+1', '#fde047');
          $coins.textContent = coinCount;
        }
      }
      // fell into lava
      if (player.y + PH > lavaY + 6) { burst(player.x + PW / 2, lavaY, ['#f97316', '#fbbf24', '#ef4444'], 18, 300); die('lava'); return; }
      // camera, culling, generation
      const targetCam = player.x - W * 0.3; camX += (targetCam - camX) * Math.min(1, dt * 8); if (camX < targetCam - 40) camX = targetCam - 40;
      while (plats[plats.length - 1].x < camX + W * 2.2) addPlatform();
      const pruneX = Math.min(camX, check.x) - 300; // never drop the course between the checkpoint and the player
      plats = plats.filter(p => p.x + p.w > pruneX || p === check);
      coins = coins.filter(c => !c.got && c.x > pruneX);
    }

    /* ---------- drawing ---------- */
    function block(x, y, w, h, color, studs) {
      const dx = 8, dy = -6;
      g.fillStyle = shade(color, -0.28); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w + dx, y + dy); g.lineTo(x + w + dx, y + h + dy); g.lineTo(x + w, y + h); g.closePath(); g.fill();
      g.fillStyle = shade(color, 0.32); g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w + dx, y + dy); g.lineTo(x + dx, y + dy); g.closePath(); g.fill();
      g.fillStyle = color; g.fillRect(x, y, w, h);
      if (studs) { g.fillStyle = shade(color, 0.55); for (let sx = x + TILE / 2 + 3; sx < x + w; sx += TILE) { g.beginPath(); g.ellipse(sx, y + dy / 2, 4, 2.6, 0, 0, Math.PI * 2); g.fill(); } }
    }
    function drawSky() {
      const hue = (205 + (stage - 1) * 28) % 360;
      const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, `hsl(${hue},75%,58%)`); sk.addColorStop(1, `hsl(${(hue + 40) % 360},90%,86%)`);
      g.fillStyle = sk; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(W * 0.8, H * 0.16, 26, 0, Math.PI * 2); g.fill();
      // clouds (parallax .15)
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 7; i++) { const span = W + 240, cx = ((i * 173 - camX * 0.15) % span + span) % span - 120, cy = 30 + hash(i) * H * 0.3, r = 14 + hash(i + 9) * 14; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.arc(cx + r, cy + 4, r * .8, 0, 7); g.arc(cx - r, cy + 5, r * .7, 0, 7); g.fill(); }
      // blocky skyline (parallax .3)
      const unit = 70, off = camX * 0.3, startI = Math.floor(off / unit) - 1;
      g.fillStyle = `hsla(${hue},45%,70%,.55)`;
      for (let i = startI; i < startI + W / unit + 3; i++) { const hgt = 60 + hash(i * 3) * 110; g.fillRect(i * unit - off, H * 0.62 - hgt, unit + 1, hgt + H); }
      // floating islands (parallax .55)
      const off2 = camX * 0.55, u2 = 190, s2 = Math.floor(off2 / u2) - 1;
      for (let i = s2; i < s2 + W / u2 + 3; i++) { if (hash(i * 7) < 0.45) continue; const ix = i * u2 - off2 + hash(i) * 60, iy = H * 0.2 + hash(i * 5) * H * 0.35, iw = 50 + hash(i * 11) * 50; g.globalAlpha = .55; block(ix, iy, iw, 18, '#86efac', false); g.globalAlpha = 1; }
    }
    function drawLava() {
      const grd = g.createLinearGradient(0, lavaY - 10, 0, H); grd.addColorStop(0, '#fbbf24'); grd.addColorStop(.25, '#f97316'); grd.addColorStop(1, '#b91c1c');
      g.fillStyle = grd; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) g.lineTo(x, lavaY + Math.sin((x + camX * 0.6) * 0.04 + timeAcc * 3) * 4 + Math.sin((x - camX) * 0.09 + timeAcc * 5) * 2);
      g.lineTo(W, H); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,240,150,.5)';
      for (let i = 0; i < 6; i++) { const bx = ((i * 97 - camX * 0.6 + timeAcc * 20) % (W + 40) + W + 40) % (W + 40) - 20, by = lavaY + 10 + ((timeAcc * 30 + i * 37) % 40); g.beginPath(); g.arc(bx, by, 3 + (i % 3), 0, 7); g.fill(); }
    }
    function drawPlatform(p) {
      const x = p.x - camX;
      block(x, p.y, p.w, p.h, p.color, true);
      if (p.check) { // flag pole
        const fx = x + p.w - 30; g.fillStyle = '#e2e8f0'; g.fillRect(fx, p.y - 70, 4, 70);
        g.fillStyle = p.claimed ? '#4ade80' : '#f8fafc'; g.beginPath(); g.moveTo(fx + 4, p.y - 70); g.lineTo(fx + 4 + 34 + Math.sin(timeAcc * 8) * 3, p.y - 58); g.lineTo(fx + 4, p.y - 46); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,.55)'; g.font = 'bold 12px system-ui'; g.textAlign = 'center'; g.fillText(`${s('stage').toUpperCase()} ${p.stage}`, x + p.w / 2, p.y + 44);
      }
      if (p.kill) { const kx = p.kill.x - camX, pulse = .6 + Math.sin(timeAcc * 9) * .4; g.fillStyle = `rgba(248,113,113,${.35 * pulse})`; g.fillRect(kx - 6, p.y - 30, p.kill.w + 12, 34); block(kx, p.y - 22, p.kill.w, 22, '#ef4444', true); g.fillStyle = '#fff'; g.font = 'bold 13px system-ui'; g.textAlign = 'center'; g.fillText('✕', kx + p.kill.w / 2, p.y - 6); }
      if (p.pad) { const px = p.pad.x - camX; block(px, p.y - 12, p.pad.w, 12, '#22c55e', false); g.strokeStyle = '#dcfce7'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 10, p.y - 3); g.lineTo(px + 20, p.y - 10); g.lineTo(px + 30, p.y - 3); g.stroke(); }
      if (p.speed) { const sx = p.speed.x - camX; block(sx, p.y - 8, p.speed.w, 8, '#facc15', false); g.fillStyle = '#854d0e'; g.font = 'bold 11px system-ui'; g.textAlign = 'center'; g.fillText('»»»', sx + p.speed.w / 2, p.y - 1); }
      if (p.spinner) {
        const sx = p.spinner.cx - camX, sy = p.y - 34, L = p.spinner.len, ca = Math.cos(p.spinner.ang), sa = Math.sin(p.spinner.ang);
        g.fillStyle = '#475569'; g.fillRect(sx - 4, sy, 8, 34);
        g.strokeStyle = '#1e293b'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx - ca * L, sy - sa * L); g.lineTo(sx + ca * L, sy + sa * L); g.stroke();
        g.strokeStyle = '#f472b6'; g.lineWidth = 5; g.beginPath(); g.moveTo(sx - ca * L, sy - sa * L); g.lineTo(sx + ca * L, sy + sa * L); g.stroke();
        g.fillStyle = '#f8fafc'; g.beginPath(); g.arc(sx, sy, 6, 0, 7); g.fill();
      }
    }
    function drawCoin(c) {
      const x = c.x - camX, y = c.y + Math.sin(c.t) * 3, sx = Math.abs(Math.cos(c.t * 0.7));
      g.save(); g.translate(x, y); g.scale(Math.max(.25, sx), 1);
      g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(0, 0, c.r, 0, 7); g.fill();
      g.fillStyle = '#fde047'; g.beginPath(); g.arc(0, 0, c.r - 3, 0, 7); g.fill();
      g.fillStyle = '#fff7ae'; g.beginPath(); g.arc(-2, -3, 2.5, 0, 7); g.fill();
      g.restore();
    }
    function drawPlayer() {
      if (state === 'dead') return;
      if (invul > 0 && Math.floor(invul * 12) % 2 === 0) return;
      const x = player.x - camX, y = player.y;
      g.save(); g.translate(x + PW / 2, y + PH / 2);
      if (player.spin > 0) g.rotate((1 - player.spin) * Math.PI * 2 * player.face);
      if (player.squash > 0) g.scale(1 + player.squash * 0.25, 1 - player.squash * 0.25);
      g.translate(-PW / 2, -PH / 2);
      const swing = player.onGround ? Math.sin(player.runT * 14) * 0.7 : 0.5;
      // legs
      [[-1, 8], [1, 16]].forEach(([dir, lx]) => { g.save(); g.translate(lx + 1, 32); g.rotate(swing * dir); g.fillStyle = '#22c55e'; g.fillRect(-4, 0, 8, 13); g.restore(); });
      // arms
      [[1, 0], [-1, 22]].forEach(([dir, ax]) => { g.save(); g.translate(ax + 2, 18); g.rotate(swing * dir * 0.8 - (player.onGround ? 0 : 1.6)); g.fillStyle = '#fcd34d'; g.fillRect(-3, 0, 6, 13); g.restore(); });
      // torso
      g.fillStyle = '#3b82f6'; g.fillRect(3, 16, 20, 17); g.fillStyle = '#60a5fa'; g.fillRect(3, 16, 20, 4);
      // head
      g.fillStyle = '#fcd34d'; g.beginPath(); g.roundRect(3, 0, 20, 17, 4); g.fill();
      g.fillStyle = '#1e293b'; g.fillRect(10, 6, 3, 3); g.fillRect(17, 6, 3, 3);
      g.strokeStyle = '#1e293b'; g.lineWidth = 1.6; g.beginPath(); g.arc(15, 10, 4, 0.2, Math.PI - 0.2); g.stroke();
      g.restore();
      if (boost > 0) { g.fillStyle = 'rgba(253,224,71,.55)'; for (let i = 1; i <= 3; i++) g.fillRect(x - i * 12, y + 10 + i * 6, 10, 4); }
    }
    function draw() {
      g.save();
      if (shake > 0) g.translate((Math.random() - .5) * 14 * shake, (Math.random() - .5) * 14 * shake);
      drawSky();
      for (const p of plats) drawPlatform(p);
      for (const c of coins) drawCoin(c);
      drawPlayer();
      drawLava();
      for (const q of parts) { g.save(); g.globalAlpha = Math.max(0, q.life / q.max); g.translate(q.x - camX, q.y); g.rotate(q.rot); g.fillStyle = q.color; g.fillRect(-q.size / 2, -q.size / 2, q.size, q.size); g.restore(); }
      g.font = 'bold 14px system-ui'; g.textAlign = 'center';
      for (const f of floats) { g.globalAlpha = Math.max(0, f.life); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillText(f.text, f.x - camX + 1, f.y + 1); g.fillStyle = f.color; g.fillText(f.text, f.x - camX, f.y); }
      g.globalAlpha = 1;
      if (bannerT > 0) { const a = Math.min(1, bannerT * 2); g.globalAlpha = a; g.fillStyle = 'rgba(15,23,42,.55)'; g.fillRect(0, H * 0.3, W, 56); g.fillStyle = '#fff'; g.font = 'bold 26px system-ui'; g.fillText(`🚩 ${s('stage').toUpperCase()} ${stage}`, W / 2, H * 0.3 + 38); g.globalAlpha = 1; }
      if (boost > 0) { g.fillStyle = 'rgba(253,224,71,.18)'; g.fillRect(0, 0, W, H); }
      g.restore();
    }

    /* ---------- loop & input ---------- */
    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.033, (now - (last || now)) / 1000); last = now;
      if (!document.hidden) { update(dt); draw(); }
      raf = requestAnimationFrame(frame);
    }
    const onDown = e => { e.preventDefault(); jump(); };
    const onKey = e => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); } };
    wrap.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);

    resize(); newRun(); draw();
    cv.__ob = { get: () => ({ player, plats, coins, state, stage, camX, lives, W, H, lavaY, lastDeath }), jump }; // debug/autopilot hook
    raf = requestAnimationFrame(frame);
    return { destroy() { running = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize); } };
  }
});
