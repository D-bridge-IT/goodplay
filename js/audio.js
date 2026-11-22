// Audio: synthesized sound effects + generative background music. Pure WebAudio, no files.
// Snd.sfx(name, arg) · Snd.music(themeId) · Snd.setMusic(on) · Snd.setVolume(v) · Snd.duck(on)
(function () {
  let ctx = null, master, sfxBus, musicBus, duckGain, comp, noiseBuffer;
  let unlocked = false, pendingTheme = null, lastTheme = null;
  const S = () => window.State ? State.data : { sound: true, music: true, volume: 0.7 };
  const vol = () => { const v = S().volume; return typeof v === 'number' ? v : 0.7; };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = vol();
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1;
    musicBus = ctx.createGain(); musicBus.gain.value = 0.5;
    duckGain = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(duckGain); duckGain.connect(master); master.connect(comp); comp.connect(ctx.destination);
    return ctx;
  }
  function noiseBuf() {
    if (noiseBuffer) return noiseBuffer;
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return (noiseBuffer = b);
  }

  /* ---------- primitive voices ---------- */
  function tone(o) {
    const g = ctx.createGain(), osc = ctx.createOscillator();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, o.t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, o.t + (o.slide || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    let node = osc;
    if (o.filter) { const fl = ctx.createBiquadFilter(); fl.type = o.filter; fl.frequency.setValueAtTime(o.fc || 1200, o.t); if (o.fc2) fl.frequency.exponentialRampToValueAtTime(o.fc2, o.t + o.dur); fl.Q.value = o.q || 1; osc.connect(fl); node = fl; }
    node.connect(g); g.connect(o.bus || sfxBus);
    const a = o.a || 0.005, v = o.vol || 0.15;
    g.gain.setValueAtTime(0.0001, o.t); g.gain.exponentialRampToValueAtTime(v, o.t + a);
    if (o.hold) g.gain.setValueAtTime(v, o.t + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
    osc.start(o.t); osc.stop(o.t + o.dur + 0.03);
  }
  function noise(o) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = o.filter || 'bandpass'; fl.frequency.setValueAtTime(o.fc || 2000, o.t);
    if (o.fc2) fl.frequency.exponentialRampToValueAtTime(o.fc2, o.t + o.dur); fl.Q.value = o.q || 0.8;
    const g = ctx.createGain(); src.connect(fl); fl.connect(g); g.connect(o.bus || sfxBus);
    g.gain.setValueAtTime(0.0001, o.t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, o.t + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
    src.start(o.t); src.stop(o.t + o.dur + 0.03);
  }
  const NOTE = m => 440 * Math.pow(2, (m - 69) / 12);
  function bellNote(f, t, dur, v, bus) {
    tone({ f, t, dur, vol: v, bus }); tone({ f: f * 2.76, t, dur: dur * 0.4, vol: v * 0.25, bus }); tone({ f: f * 5.4, t, dur: dur * 0.15, vol: v * 0.08, bus });
  }
  function marimbaNote(f, t, dur, v, bus) { tone({ f, t, dur, vol: v, bus, a: 0.003 }); tone({ f: f * 4, t, dur: dur * 0.25, vol: v * 0.3, bus, a: 0.002 }); }
  function pluckNote(f, t, dur, v, bus) { tone({ f, t, dur, vol: v, bus, type: 'triangle', filter: 'lowpass', fc: 2600, fc2: 500, a: 0.004 }); }
  function sparkle(t, v) { noise({ t, dur: 0.4, vol: v || 0.05, filter: 'highpass', fc: 6000 }); }

  /* ---------- sound effects ---------- */
  const SFX = {
    click: t => { tone({ f: 620, t, dur: 0.06, vol: 0.1 }); noise({ t, dur: 0.03, vol: 0.04, filter: 'highpass', fc: 4000 }); },
    tap: t => { tone({ f: 260, f2: 170, t, dur: 0.09, vol: 0.18 }); noise({ t, dur: 0.03, vol: 0.08, fc: 1500 }); },
    ok: t => { tone({ f: 660, t, dur: 0.14, type: 'triangle', vol: 0.14 }); tone({ f: 880, t: t + 0.09, dur: 0.2, type: 'triangle', vol: 0.14 }); },
    win: t => { [523, 659, 784, 1047].forEach((f, i) => tone({ f, t: t + i * 0.09, dur: 0.35, type: 'triangle', vol: 0.14 })); sparkle(t + 0.3, 0.05); },
    fanfare: t => {
      [[523, 0], [523, .12], [523, .24], [659, .36], [784, .54], [1047, .72]].forEach(([f, d]) => tone({ f, t: t + d, dur: 0.28, type: 'triangle', vol: 0.13 }));
      [523, 659, 784, 1047].forEach(f => tone({ f, t: t + 1.0, dur: 0.9, type: 'triangle', vol: 0.09, hold: 0.3 }));
      sparkle(t + 1.0, 0.07);
    },
    bad: t => tone({ f: 200, f2: 110, t, dur: 0.22, type: 'square', vol: 0.07, filter: 'lowpass', fc: 900 }),
    fail: t => [392, 330, 262].forEach((f, i) => tone({ f, t: t + i * 0.18, dur: 0.4, type: 'sawtooth', vol: 0.06, filter: 'lowpass', fc: 1200 })),
    coin: t => { tone({ f: 1175, t, dur: 0.06, type: 'square', vol: 0.07 }); tone({ f: 1568, t: t + 0.06, dur: 0.16, type: 'square', vol: 0.07 }); },
    pop: t => tone({ f: 900, f2: 400, t, dur: 0.07, type: 'triangle', vol: 0.12 }),
    leaf: t => { noise({ t, dur: 0.12, vol: 0.12, fc: 3000, fc2: 1200, q: 1.5 }); tone({ f: 1800, f2: 900, t, dur: 0.06, vol: 0.04 }); },
    plant: t => { noise({ t, dur: 0.25, vol: 0.12, filter: 'lowpass', fc: 900, fc2: 200 }); bellNote(784, t + 0.15, 0.35, 0.08); bellNote(1175, t + 0.25, 0.4, 0.08); },
    match: t => { bellNote(880, t, 0.3, 0.1); bellNote(1320, t + 0.05, 0.35, 0.08); },
    cascade: (t, n) => { const k = Math.min(n || 2, 6); bellNote(880 * Math.pow(2, k / 6), t, 0.3, 0.1); bellNote(1320 * Math.pow(2, k / 6), t + 0.05, 0.35, 0.07); sparkle(t, 0.03); },
    place: t => { noise({ t, dur: 0.08, vol: 0.18, filter: 'lowpass', fc: 500 }); tone({ f: 180, f2: 110, t, dur: 0.1, vol: 0.15 }); tone({ f: 1400, t: t + 0.02, dur: 0.04, vol: 0.05 }); },
    brick: t => { noise({ t, dur: 0.18, vol: 0.25, fc: 400, q: 0.5 }); tone({ f: 120, f2: 60, t, dur: 0.15, vol: 0.2 }); },
    crash: t => { noise({ t, dur: 0.45, vol: 0.25, fc: 600, fc2: 150, q: 0.6 }); tone({ f: 90, f2: 50, t, dur: 0.3, vol: 0.18 }); },
    tick: t => { tone({ f: 1000, t, dur: 0.02, type: 'square', vol: 0.045 }); noise({ t, dur: 0.015, vol: 0.03, filter: 'highpass', fc: 5000 }); },
    alarm: t => { tone({ f: 880, t, dur: 0.1, type: 'square', vol: 0.06 }); tone({ f: 880, t: t + 0.14, dur: 0.1, type: 'square', vol: 0.06 }); },
    whoosh: t => noise({ t, dur: 0.3, vol: 0.1, fc: 400, fc2: 4000, q: 0.7 }),
    star: t => { tone({ f: 600, f2: 1800, t, dur: 0.35, vol: 0.1 }); sparkle(t + 0.1, 0.04); },
    hint: t => [1047, 1319, 1568].forEach((f, i) => tone({ f, t: t + i * 0.05, dur: 0.22, vol: 0.08 })),
    adstart: t => { tone({ f: 523, t, dur: 0.2, type: 'triangle', vol: 0.08 }); tone({ f: 659, t: t + 0.15, dur: 0.25, type: 'triangle', vol: 0.08 }); },
    buy: t => { SFX.coin(t); SFX.ok(t + 0.15); },
    levelup: t => SFX.fanfare(t)
  };
  function sfx(name, arg) {
    if (!S().sound) return;
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    try { (SFX[name] || SFX.click)(ctx.currentTime, arg); } catch (e) { }
  }

  /* ---------- generative music ---------- */
  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10];
  const deg = (root, scale, i) => root + 12 * Math.floor(i / 7) + scale[((i % 7) + 7) % 7];
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  const THEMES = {
    hub:         { bpm: 96,  root: 60, scale: MAJ, prog: [0, 4, 5, 3], drums: 'soft', pad: true,  bass: 'steady', arp: .5, arpVoice: 'pluck',   mel: .35, melVoice: 'bell',    swing: .08, seed: 11 },
    wortbruecke: { bpm: 92,  root: 62, scale: MAJ, prog: [0, 3, 5, 4], drums: 'none', pad: true,  bass: 'steady', arp: .4, arpVoice: 'marimba', mel: .3,  melVoice: 'marimba', swing: 0,   seed: 21 },
    waldklicker: { bpm: 84,  root: 55, scale: MAJ, prog: [0, 5, 3, 4], drums: 'none', pad: true,  bass: 'sparse', arp: .25, arpVoice: 'pluck',  mel: .2,  melVoice: 'bell',    swing: 0,   seed: 31, birds: true },
    pfoten:      { bpm: 124, root: 65, scale: MAJ, prog: [0, 5, 3, 4], drums: 'full', pad: false, bass: 'busy',   arp: .7, arpVoice: 'pluck',   mel: .45, melVoice: 'marimba', swing: .18, seed: 41 },
    doktorquiz:  { bpm: 132, root: 64, scale: MIN, prog: [0, 5, 3, 4], drums: 'full', pad: true,  bass: 'busy',   arp: .6, arpVoice: 'pluck',   mel: .3,  melVoice: 'pluck',   swing: 0,   seed: 51 },
    kleinstadt:  { bpm: 110, root: 60, scale: MAJ, prog: [0, 3, 4, 0], drums: 'soft', pad: true,  bass: 'steady', arp: .5, arpVoice: 'marimba', mel: .4,  melVoice: 'bell',    swing: .22, seed: 61 },
    projekt:     { bpm: 112, root: 57, scale: DOR, prog: [0, 5, 2, 6], drums: 'full', pad: true,  bass: 'busy',   arp: .5, arpVoice: 'pluck',   mel: .4,  melVoice: 'pluck',   swing: .05, seed: 71 }
  };
  const BARS = 8, STEPS = 16;

  // Pre-compose BARS bars of events for a theme (deterministic per seed, so the loop feels written).
  function compose(th) {
    const r = rng(th.seed), bars = [];
    let prevIdx = 7;
    for (let b = 0; b < BARS; b++) {
      const d = th.prog[b % 4], ev = [];
      const chord = [d, d + 2, d + 4];
      // pad
      if (th.pad) ev.push({ step: 0, voice: 'pad', notes: chord.map(i => deg(th.root - 12, th.scale, i)), dur: STEPS });
      // bass
      const bRoot = deg(th.root - 24, th.scale, d), bFifth = deg(th.root - 24, th.scale, d + 4);
      if (th.bass === 'steady') { ev.push({ step: 0, voice: 'bass', midi: bRoot, dur: 6 }, { step: 8, voice: 'bass', midi: bRoot, dur: 4 }, { step: 12, voice: 'bass', midi: bFifth, dur: 3 }); }
      else if (th.bass === 'sparse') { ev.push({ step: 0, voice: 'bass', midi: bRoot, dur: 14 }); }
      else { for (let s = 0; s < STEPS; s += 2) ev.push({ step: s, voice: 'bass', midi: (s % 8 === 6) ? bFifth : (s % 4 === 2 ? bRoot + 12 : bRoot), dur: 1.6 }); }
      // drums
      if (th.drums !== 'none') {
        for (let s = 0; s < STEPS; s += 2) ev.push({ step: s, voice: 'hat', open: th.drums === 'full' && s === 14, vel: s % 4 === 0 ? .9 : .55 });
        ev.push({ step: 0, voice: 'kick' }, { step: 8, voice: 'kick' });
        if (th.drums === 'full') { ev.push({ step: 4, voice: 'snare' }, { step: 12, voice: 'snare' }); if (r() < .5) ev.push({ step: 10, voice: 'kick' }); if (b % 4 === 3 && r() < .7) ev.push({ step: 14, voice: 'snare', vel: .6 }, { step: 15, voice: 'snare', vel: .8 }); }
      }
      // arpeggio (16ths, cycling chord tones)
      const arpTones = [d, d + 2, d + 4, d + 7];
      let ai = Math.floor(r() * 4);
      for (let s = 0; s < STEPS; s++) {
        if (r() < th.arp) { ev.push({ step: s, voice: th.arpVoice, midi: deg(th.root, th.scale, arpTones[ai % 4]), dur: 1.2, vel: .55 }); ai += (r() < .8 ? 1 : 3); }
      }
      // melody (8ths, near previous note, mostly chord tones)
      const ct = [d, d + 2, d + 4, d + 7, d + 9, d + 11].filter(i => i >= 0 && i <= 14);
      for (let s = 0; s < STEPS; s += 2) {
        const p = s === 0 ? th.mel + .3 : th.mel;
        if (r() >= p) continue;
        let idx;
        if (r() < .7) { const sorted = ct.slice().sort((x, y) => Math.abs(x - prevIdx) - Math.abs(y - prevIdx)); idx = sorted[r() < .6 ? 0 : 1] ?? sorted[0]; }
        else idx = Math.max(0, Math.min(14, prevIdx + (r() < .5 ? -1 : 1)));
        prevIdx = idx;
        ev.push({ step: s, voice: th.melVoice, midi: deg(th.root + 12, th.scale, idx), dur: r() < .3 ? 4 : 2, vel: .9, mel: true });
      }
      bars.push(ev);
    }
    return bars;
  }

  let cur = null;
  function playEvent(e, t, stepDur, th, bus) {
    const v = e.vel || 1;
    switch (e.voice) {
      case 'pad': e.notes.forEach(m => { const f = NOTE(m); [-6, 6].forEach(dt => tone({ f, t, dur: e.dur * stepDur + 0.6, type: 'sawtooth', detune: dt, vol: 0.022, a: 0.5, hold: e.dur * stepDur - 0.4, filter: 'lowpass', fc: 700, bus })); }); break;
      case 'bass': tone({ f: NOTE(e.midi), t, dur: e.dur * stepDur, type: 'triangle', vol: 0.2, filter: 'lowpass', fc: 500, a: 0.01, bus }); tone({ f: NOTE(e.midi), t, dur: e.dur * stepDur * 0.8, vol: 0.12, bus }); break;
      case 'kick': tone({ f: 150, f2: 45, t, dur: 0.25, slide: 0.12, vol: 0.5, bus }); break;
      case 'snare': noise({ t, dur: 0.14, vol: 0.14 * v, fc: 1800, q: 0.6, bus }); tone({ f: 190, f2: 120, t, dur: 0.09, vol: 0.12 * v, bus }); break;
      case 'hat': noise({ t, dur: e.open ? 0.18 : 0.04, vol: 0.05 * v, filter: 'highpass', fc: 7000, bus }); break;
      case 'pluck': pluckNote(NOTE(e.midi), t, e.dur * stepDur * (e.mel ? 1.4 : 1), 0.1 * v, bus); break;
      case 'marimba': marimbaNote(NOTE(e.midi), t, Math.max(0.25, e.dur * stepDur), 0.11 * v, bus); break;
      case 'bell': bellNote(NOTE(e.midi), t, Math.max(0.5, e.dur * stepDur * 1.6), 0.07 * v, bus); break;
    }
  }
  function chirp(t, bus) { const f = 2600 + Math.random() * 1200; tone({ f, f2: f * 1.3, t, dur: 0.07, vol: 0.03, bus }); tone({ f: f * 1.2, f2: f * 0.9, t: t + 0.09, dur: 0.08, vol: 0.025, bus }); }

  function start(id) {
    const th = THEMES[id] || THEMES.hub;
    const bus = ctx.createGain(); bus.gain.setValueAtTime(0.0001, ctx.currentTime); bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2); bus.connect(musicBus);
    const st = { id, th, bars: compose(th), bar: 0, step: 0, next: ctx.currentTime + 0.1, bus, stepDur: 60 / th.bpm / 4, timer: null };
    st.timer = setInterval(() => {
      if (ctx.state !== 'running') return;
      while (st.next < ctx.currentTime + 0.15) {
        const evs = st.bars[st.bar];
        const swing = (st.step % 2 === 1) ? th.swing * st.stepDur : 0;
        for (const e of evs) if (e.step === st.step) playEvent(e, st.next + swing, st.stepDur, th, bus);
        if (th.birds && Math.random() < 0.03) chirp(st.next + Math.random() * st.stepDur, bus);
        st.next += st.stepDur; st.step++;
        if (st.step >= STEPS) { st.step = 0; st.bar = (st.bar + 1) % BARS; }
      }
    }, 30);
    cur = st;
  }
  function stop(fade) {
    if (!cur) return;
    const st = cur; cur = null; clearInterval(st.timer);
    const t = ctx.currentTime; st.bus.gain.cancelScheduledValues(t); st.bus.gain.setValueAtTime(st.bus.gain.value || 0.0001, t); st.bus.gain.exponentialRampToValueAtTime(0.0001, t + (fade || 0.6));
    setTimeout(() => { try { st.bus.disconnect(); } catch (e) { } }, (fade || 0.6) * 1000 + 300);
  }
  function music(id) {
    lastTheme = id;
    if (!S().music) { stop(); return; }
    if (!unlocked || !ensure()) { pendingTheme = id; return; }
    if (cur && cur.id === id) return;
    stop(); start(id);
  }
  function duck(on) { if (!ctx) return; const t = ctx.currentTime; duckGain.gain.cancelScheduledValues(t); duckGain.gain.setValueAtTime(duckGain.gain.value, t); duckGain.gain.linearRampToValueAtTime(on ? 0.2 : 1, t + 0.4); }
  function setVolume(v) { if (window.State) { State.data.volume = v; State.save(); } if (master) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(v, t + 0.15); } }
  function setMusic(on) { if (window.State) { State.data.music = on; State.save(); } if (on) { if (lastTheme) music(lastTheme); } else stop(); }

  function unlock() {
    if (unlocked) return; unlocked = true;
    if (!ensure()) return;
    ctx.resume().catch(() => { });
    if (pendingTheme && S().music) { const p = pendingTheme; pendingTheme = null; music(p); }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => { });
    else if (unlocked) ctx.resume().catch(() => { });
  });

  window.Snd = { sfx, music, stop, duck, setVolume, setMusic, themes: Object.keys(THEMES), playing: () => cur ? cur.id : null, _nodes: () => ({ ctx, master }) };
})();
