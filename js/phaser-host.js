// PhaserHost: mounts a Phaser 3 scene inside the hub's game root with a phone-sized logical canvas (375×600),
// FIT scaling, and a bridge object the scene can use for hub features (stars, ads, sounds, modals).
(function () {
  const W = 375, H = 600;
  function mount(root, SceneClass, opts) {
    opts = opts || {};
    const wrap = document.createElement('div'); wrap.className = 'ph-wrap'; wrap.style.aspectRatio = `${W} / ${opts.height || H}`;
    const holder = document.createElement('div'); holder.className = 'ph-holder'; holder.id = 'ph-' + Math.random().toString(36).slice(2, 8);
    wrap.appendChild(holder); root.appendChild(wrap);
    if (!window.Phaser) { holder.innerHTML = '<div class="ph-missing">Phaser konnte nicht geladen werden.</div>'; return { destroy() { } }; }
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: holder.id, width: W, height: opts.height || H, backgroundColor: opts.bg || '#bae6fd',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, width: W, height: opts.height || H },
      physics: opts.physics || { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
      render: { antialias: true, roundPixels: false, pixelArt: false },
      audio: { noAudio: true }, // the hub's Snd layer owns audio
      input: { activePointers: 2 },
      scene: []
    });
    game.registry.set('bridge', opts.bridge || {}); window.__ph = game; // debug handle
    game.scene.add('main', SceneClass, true, opts.data || {});
    return {
      game,
      destroy() { try { game.destroy(true); } catch (e) { } wrap.remove(); }
    };
  }
  // Small helpers shared by scenes.
  const U = {
    W, H,
    // Draw a rounded rect into a Graphics and return it.
    rrect(g, x, y, w, h, r, color, alpha) { g.fillStyle(color, alpha == null ? 1 : alpha); g.fillRoundedRect(x, y, w, h, r); return g; },
    // Create a texture from a draw callback (cached by key).
    tex(scene, key, w, h, draw) { if (scene.textures.exists(key)) return key; const g = scene.make.graphics({ x: 0, y: 0, add: false }); draw(g); g.generateTexture(key, w, h); g.destroy(); return key; },
    shade(hex, p) { const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255; const f = c => Math.round(p > 0 ? c + (255 - c) * p : c * (1 + p)); return (f(r) << 16) | (f(g) << 8) | f(b); },
    // Floating text that rises and fades.
    float(scene, x, y, text, style) { const t = scene.add.text(x, y, text, Object.assign({ fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#fff', stroke: '#1e293b', strokeThickness: 4 }, style || {})).setOrigin(0.5).setDepth(1000); scene.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() }); return t; },
    // Burst of colored squares/circles.
    burst(scene, x, y, colors, n, power, opts) {
      opts = opts || {};
      for (let i = 0; i < n; i++) {
        const a = opts.up ? -Math.PI / 2 + (Math.random() - .5) * opts.up : Math.random() * Math.PI * 2, v = 60 + Math.random() * (power || 260);
        const size = (4 + Math.random() * 5) * (opts.size || 1);
        const p = opts.circle ? scene.add.circle(x, y, size / 2, colors[i % colors.length]) : scene.add.rectangle(x, y, size, size, colors[i % colors.length]);
        p.setDepth(900); const vx = Math.cos(a) * v, vy = Math.sin(a) * v - (opts.lift == null ? 120 : opts.lift), life = 500 + Math.random() * 500;
        scene.tweens.add({ targets: p, x: x + vx * life / 1000, y: y + vy * life / 1000 + 0.5 * (opts.grav == null ? 900 : opts.grav) * (life / 1000) ** 2, angle: (Math.random() - .5) * 720, alpha: 0, duration: life, ease: 'Quad.easeOut', onComplete: () => p.destroy() });
      }
    },
    // Camera shake shortcut.
    shake(scene, k) { scene.cameras.main.shake(180 * (k || 1), 0.006 * (k || 1)); },
    // Pulse-scale a game object.
    pop(scene, obj, s) { scene.tweens.add({ targets: obj, scaleX: (obj.scaleX || 1) * (s || 1.2), scaleY: (obj.scaleY || 1) * (s || 1.2), duration: 90, yoyo: true, ease: 'Quad.easeOut' }); },
    // Button: rounded rect + label, returns container with .onTap.
    button(scene, x, y, w, h, label, color, onTap, style) {
      const c = scene.add.container(x, y).setDepth(500);
      const g = scene.add.graphics(); U.rrect(g, -w / 2, -h / 2 + 4, w, h, h / 2, U.shade(color, -0.35)); U.rrect(g, -w / 2, -h / 2, w, h, h / 2, color);
      const t = scene.add.text(0, -2, label, Object.assign({ fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#fff' }, style || {})).setOrigin(0.5);
      c.add([g, t]); c.setSize(w, h); c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => { scene.tweens.add({ targets: c, scaleX: .94, scaleY: .94, duration: 70, yoyo: true }); onTap && onTap(); });
      c.label = t; return c;
    },
    // Blocky avatar as a container (head/torso/legs), ~26×44 at scale 1.
    avatar(scene, x, y, colors) {
      colors = Object.assign({ head: 0xfcd34d, torso: 0x3b82f6, legs: 0x22c55e, arms: 0xfcd34d }, colors || {});
      const c = scene.add.container(x, y);
      const legL = scene.add.rectangle(-5, 16, 8, 13, colors.legs).setOrigin(0.5, 0), legR = scene.add.rectangle(5, 16, 8, 13, colors.legs).setOrigin(0.5, 0);
      const armL = scene.add.rectangle(-13, 0, 6, 13, colors.arms).setOrigin(0.5, 0), armR = scene.add.rectangle(13, 0, 6, 13, colors.arms).setOrigin(0.5, 0);
      const torso = scene.add.rectangle(0, 0, 20, 17, colors.torso).setOrigin(0.5, 0);
      const head = scene.add.rectangle(0, -17, 20, 17, colors.head).setOrigin(0.5, 0);
      const eyeL = scene.add.rectangle(-4, -10, 3, 3, 0x1e293b), eyeR = scene.add.rectangle(4, -10, 3, 3, 0x1e293b);
      const mouth = scene.add.arc(0, -7, 4, 20, 160, false, 0x000000, 0).setStrokeStyle(1.6, 0x1e293b);
      c.add([legL, legR, armL, armR, torso, head, eyeL, eyeR, mouth]);
      c.parts = { legL, legR, armL, armR, torso, head, eyeL, eyeR, mouth }; c.runT = 0;
      c.run = (dt, speed) => { c.runT += dt * (speed || 1) * 12; const s = Math.sin(c.runT) * 0.6; legL.rotation = s; legR.rotation = -s; armL.rotation = -s * 0.8; armR.rotation = s * 0.8; };
      c.idle = () => { legL.rotation = legR.rotation = armL.rotation = armR.rotation = 0; };
      c.jumpPose = () => { legL.rotation = -0.4; legR.rotation = 0.4; armL.rotation = 2.6; armR.rotation = -2.6; };
      return c;
    }
  };
  window.PhaserHost = { mount, U };
})();
