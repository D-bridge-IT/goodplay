// Audio: synthesized sound effects + background music. Pure WebAudio, no files.
// Style reference: bouncy, cartoony arcade sounds (boing, pop, ding, "oof") and upbeat lobby music.
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
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
    master = ctx.createGain(); master.gain.value = vol();
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1;
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55;
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
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vibHz || 5.5; lg.gain.value = o.vib; l.connect(lg); lg.connect(osc.detune); l.start(o.t); l.stop(o.t + o.dur + 0.05); }
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
  function bellNote(f, t, dur, v, bus) { tone({ f, t, dur, vol: v, bus }); tone({ f: f * 2.76, t, dur: dur * 0.4, vol: v * 0.25, bus }); tone({ f: f * 5.4, t, dur: dur * 0.15, vol: v * 0.08, bus }); }
  function marimbaNote(f, t, dur, v, bus) { tone({ f, t, dur, vol: v, bus, a: 0.003 }); tone({ f: f * 4, t, dur: dur * 0.25, vol: v * 0.3, bus, a: 0.002 }); }
  function pluckNote(f, t, dur, v, bus) { tone({ f, t, dur, vol: v, bus, type: 'triangle', filter: 'lowpass', fc: 2600, fc2: 500, a: 0.004 }); }
  function chipNote(f, t, dur, v, bus) { tone({ f, t, dur: Math.min(dur, 0.22), vol: v * 0.6, bus, type: 'square', filter: 'lowpass', fc: 3200, a: 0.002 }); }
  function leadNote(f, t, dur, v, bus) {
    [-9, 9].forEach(dt => tone({ f, t, dur, vol: v * 0.55, bus, type: 'sawtooth', detune: dt, filter: 'lowpass', fc: 2400, fc2: 900, a: 0.02, hold: dur * 0.5, vib: 10, vibHz: 5.5 }));
    tone({ f: f * 2, t, dur: dur * 0.6, vol: v * 0.12, bus, type: 'triangle', a: 0.02 });
  }
  function sparkle(t, v) { noise({ t, dur: 0.4, vol: v || 0.05, filter: 'highpass', fc: 6000 }); }
  function chord(freqs, t, dur, v, type) { freqs.forEach(f => tone({ f, t, dur, vol: v, type: type || 'triangle', hold: dur * 0.4 })); }

  /* ---------- sound effects ---------- */
  const SFX = {
    // UI: soft bubble pop
    click: t => { tone({ f: 720, f2: 420, t, dur: 0.06, vol: 0.12 }); noise({ t, dur: 0.025, vol: 0.05, filter: 'lowpass', fc: 1800 }); },
    pop: t => { tone({ f: 900, f2: 380, t, dur: 0.08, vol: 0.14, type: 'triangle' }); noise({ t, dur: 0.03, vol: 0.05, filter: 'lowpass', fc: 2200 }); },
    tap: t => { tone({ f: 520, f2: 300, t, dur: 0.07, vol: 0.14, type: 'triangle' }); noise({ t, dur: 0.03, vol: 0.06, fc: 1400 }); },
    // positive
    ok: t => { bellNote(784, t, 0.3, 0.1); bellNote(1175, t + 0.08, 0.4, 0.1); },
    win: t => {
      chord([523, 659, 784], t, 0.25, 0.07); chord([587, 740, 880], t + 0.18, 0.25, 0.07); chord([659, 831, 988, 1319], t + 0.36, 0.9, 0.08);
      [1319, 1568, 1976].forEach((f, i) => tone({ f, t: t + 0.4 + i * 0.07, dur: 0.5, vol: 0.06 })); sparkle(t + 0.4, 0.07);
    },
    fanfare: t => {
      [[523, 0], [523, .12], [523, .24], [659, .36], [784, .54], [1047, .72]].forEach(([f, d]) => tone({ f, t: t + d, dur: 0.28, type: 'triangle', vol: 0.13 }));
      chord([523, 659, 784, 1047], t + 1.0, 1.0, 0.08); sparkle(t + 1.0, 0.07);
    },
    levelup: t => SFX.fanfare(t),
    coin: (t, n) => { const k = Math.min(n || 0, 8) * 0.5; tone({ f: 988 * Math.pow(2, k / 12), t, dur: 0.08, vol: 0.09 }); tone({ f: 1319 * Math.pow(2, k / 12), t: t + 0.07, dur: 0.3, vol: 0.1 }); sparkle(t + 0.05, 0.025); },
    buy: t => { SFX.coin(t); SFX.ok(t + 0.15); },
    star: t => { tone({ f: 600, f2: 1800, t, dur: 0.35, vol: 0.1 }); sparkle(t + 0.1, 0.04); },
    hint: t => [1047, 1319, 1568].forEach((f, i) => tone({ f, t: t + i * 0.05, dur: 0.22, vol: 0.08 })),
    checkpoint: t => { [784, 988, 1175, 1568].forEach((f, i) => tone({ f, t: t + i * 0.07, dur: 0.35, type: 'triangle', vol: 0.11 })); chord([784, 988, 1175], t + 0.3, 0.7, 0.06); sparkle(t + 0.3, 0.06); },
    // negative
    bad: t => { tone({ f: 170, t, dur: 0.16, type: 'square', vol: 0.06, filter: 'lowpass', fc: 700 }); tone({ f: 220, f2: 110, t, dur: 0.14, vol: 0.1 }); },
    fail: t => [392, 330, 262].forEach((f, i) => tone({ f, t: t + i * 0.18, dur: 0.4, type: 'sawtooth', vol: 0.06, filter: 'lowpass', fc: 1200 })),
    gameover: t => { [392, 370, 349, 330].forEach((f, i) => tone({ f, t: t + i * 0.22, dur: 0.5, type: 'sawtooth', vol: 0.06, filter: 'lowpass', fc: 1100 })); tone({ f: 165, t: t + 0.88, dur: 1.2, type: 'triangle', vol: 0.08 }); },
    // cartoon "uh!" on a knockout: sawtooth glide through vowel formants (original synth)
    oof: t => {
      const src = ctx.createOscillator(); src.type = 'sawtooth'; src.frequency.setValueAtTime(330, t); src.frequency.exponentialRampToValueAtTime(140, t + 0.28);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.02); g.gain.setValueAtTime(0.9, t + 0.09); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      [[620, 7, 1], [1150, 9, .55], [2500, 11, .2]].forEach(([fc, q, a]) => { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(fc, t); f.frequency.exponentialRampToValueAtTime(fc * 0.7, t + 0.3); f.Q.value = q; const gg = ctx.createGain(); gg.gain.value = a; src.connect(f); f.connect(gg); gg.connect(g); });
      g.connect(sfxBus); src.start(t); src.stop(t + 0.4);
      noise({ t, dur: 0.05, vol: 0.08, filter: 'lowpass', fc: 600 });
    },
    // movement
    jump: t => { tone({ f: 230, f2: 560, t, dur: 0.2, slide: 0.12, type: 'triangle', vol: 0.14 }); tone({ f: 460, f2: 1100, t, dur: 0.12, vol: 0.05 }); },
    djump: t => { tone({ f: 330, f2: 820, t, dur: 0.2, slide: 0.1, type: 'triangle', vol: 0.13 }); noise({ t, dur: 0.22, vol: 0.07, fc: 900, fc2: 3500, q: 0.8 }); },
    bounce: t => { tone({ f: 120, f2: 1050, t, dur: 0.26, slide: 0.18, type: 'triangle', vol: 0.16, vib: 25, vibHz: 14 }); sparkle(t + 0.1, 0.04); },
    land: t => { noise({ t, dur: 0.06, vol: 0.12, filter: 'lowpass', fc: 450 }); tone({ f: 130, f2: 80, t, dur: 0.08, vol: 0.12 }); },
    speed: t => { noise({ t, dur: 0.35, vol: 0.1, fc: 300, fc2: 5000, q: 0.7 }); tone({ f: 400, f2: 1600, t, dur: 0.3, vol: 0.06, type: 'triangle' }); },
    whoosh: t => noise({ t, dur: 0.3, vol: 0.1, fc: 400, fc2: 4000, q: 0.7 }),
    // world
    leaf: t => { noise({ t, dur: 0.12, vol: 0.12, fc: 3000, fc2: 1200, q: 1.5 }); tone({ f: 1800, f2: 900, t, dur: 0.06, vol: 0.04 }); },
    plant: t => { noise({ t, dur: 0.25, vol: 0.12, filter: 'lowpass', fc: 900, fc2: 200 }); bellNote(784, t + 0.15, 0.35, 0.08); bellNote(1175, t + 0.25, 0.4, 0.08); },
    match: t => { bellNote(880, t, 0.3, 0.1); bellNote(1320, t + 0.05, 0.35, 0.08); },
    cascade: (t, n) => { const k = Math.min(n || 2, 6); bellNote(880 * Math.pow(2, k / 6), t, 0.3, 0.1); bellNote(1320 * Math.pow(2, k / 6), t + 0.05, 0.35, 0.07); sparkle(t, 0.03); },
    place: t => { noise({ t, dur: 0.08, vol: 0.18, filter: 'lowpass', fc: 500 }); tone({ f: 180, f2: 110, t, dur: 0.1, vol: 0.15 }); tone({ f: 1400, t: t + 0.02, dur: 0.04, vol: 0.05 }); },
    brick: t => { noise({ t, dur: 0.18, vol: 0.25, fc: 400, q: 0.5 }); tone({ f: 120, f2: 60, t, dur: 0.15, vol: 0.2 }); },
    crash: t => { noise({ t, dur: 0.45, vol: 0.25, fc: 600, fc2: 150, q: 0.6 }); tone({ f: 90, f2: 50, t, dur: 0.3, vol: 0.18 }); },
    tick: t => { tone({ f: 1000, t, dur: 0.02, type: 'square', vol: 0.045 }); noise({ t, dur: 0.015, vol: 0.03, filter: 'highpass', fc: 5000 }); },
    alarm: t => { tone({ f: 880, t, dur: 0.1, type: 'square', vol: 0.06 }); tone({ f: 880, t: t + 0.14, dur: 0.1, type: 'square', vol: 0.06 }); },
    adstart: t => { tone({ f: 523, t, dur: 0.2, type: 'triangle', vol: 0.08 }); tone({ f: 659, t: t + 0.15, dur: 0.25, type: 'triangle', vol: 0.08 }); }
  };
  function sfx(name, arg) {
    if (!S().sound) return;
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    try { (SFX[name] || SFX.click)(ctx.currentTime, arg); } catch (e) { }
  }

  /* ---------- music ---------- */
  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10];
  const deg = (root, scale, i) => root + 12 * Math.floor(i / 7) + scale[((i % 7) + 7) % 7];
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // Hand-written hooks: 16 chars per bar, digit/hex = scale degree above root+12, '-' = hold, '.' = rest.
  const SONG_HUB = ['7.7.9.b.9.7.4...', '5.5.7.9.7.5.2...', '4.4.5.7.9...7.5.', '7-------........', '7.7.9.b.c...b.9.', '9.9.b.c.b.9.7...', '5.7.9.b.9.7.5.4.', '7-------........'];
  const SONG_OBBY = ['9.9.b.9.7...4.5.', '7.7.9.7.5...2...', '9.9.b.c.b.9.7.5.', '7-----..4.5.7...', 'c.c.b.9.b...9.7.', '9.9.7.5.7...4...', '5.7.9.b.c.b.9.7.', '9-------..7.9.b.'];

  const THEMES = {
    hub:         { bpm: 112, root: 60, scale: MAJ, prog: [0, 4, 5, 3], drums: 'pop',  pad: true,  bass: 'sub', bassPat: 'steady', arp: .45, arpVoice: 'pluck',   melVoice: 'lead',    song: SONG_HUB, swing: .05, pump: .3,  seed: 11 },
    obby:        { bpm: 142, root: 65, scale: MAJ, prog: [5, 3, 0, 4], drums: 'full', pad: true,  bass: 'saw', bassPat: 'busy',   arp: .55, arpVoice: 'chip',    melVoice: 'lead',    song: SONG_OBBY, swing: 0,  pump: .5,  seed: 81 },
    wortbruecke: { bpm: 92,  root: 62, scale: MAJ, prog: [0, 3, 5, 4], drums: 'none', pad: true,  bass: 'sub', bassPat: 'steady', arp: .4,  arpVoice: 'marimba', mel: .3, melVoice: 'marimba', swing: 0, pump: 0, seed: 21 },
    waldklicker: { bpm: 84,  root: 55, scale: MAJ, prog: [0, 5, 3, 4], drums: 'none', pad: true,  bass: 'sub', bassPat: 'sparse', arp: .25, arpVoice: 'pluck',   mel: .2, melVoice: 'bell',    swing: 0, pump: 0, seed: 31, birds: true },
    pfoten:      { bpm: 124, root: 65, scale: MAJ, prog: [0, 5, 3, 4], drums: 'full', pad: false, bass: 'sub', bassPat: 'busy',   arp: .7,  arpVoice: 'pluck',   mel: .45, melVoice: 'marimba', swing: .18, pump: .35, seed: 41 },
    doktorquiz:  { bpm: 132, root: 64, scale: MIN, prog: [0, 5, 3, 4], drums: 'full', pad: true,  bass: 'saw', bassPat: 'busy',   arp: .6,  arpVoice: 'chip',    mel: .3, melVoice: 'pluck',   swing: 0, pump: .45, seed: 51 },
    kleinstadt:  { bpm: 110, root: 60, scale: MAJ, prog: [0, 3, 4, 0], drums: 'pop',  pad: true,  bass: 'sub', bassPat: 'steady', arp: .5,  arpVoice: 'marimba', mel: .4, melVoice: 'bell',    swing: .22, pump: .25, seed: 61 },
    projekt:     { bpm: 112, root: 57, scale: DOR, prog: [0, 5, 2, 6], drums: 'full', pad: true,  bass: 'saw', bassPat: 'busy',   arp: .5,  arpVoice: 'pluck',   mel: .4, melVoice: 'lead',    swing: .05, pump: .4, seed: 71 }
  };
  const BARS = 8, STEPS = 16;

  function compose(th) {
    const r = rng(th.seed), bars = [];
    let prevIdx = 7;
    for (let b = 0; b < BARS; b++) {
      const d = th.prog[b % 4], ev = [], chord = [d, d + 2, d + 4];
      if (th.pad) ev.push({ step: 0, voice: 'pad', notes: chord.map(i => deg(th.root - 12, th.scale, i)), dur: STEPS });
      const bRoot = deg(th.root - 24, th.scale, d), bFifth = deg(th.root - 24, th.scale, d + 4);
      if (th.bassPat === 'steady') ev.push({ step: 0, voice: 'bass', midi: bRoot, dur: 6 }, { step: 8, voice: 'bass', midi: bRoot, dur: 4 }, { step: 12, voice: 'bass', midi: bFifth, dur: 3 });
      else if (th.bassPat === 'sparse') ev.push({ step: 0, voice: 'bass', midi: bRoot, dur: 14 });
      else for (let s = 0; s < STEPS; s += 2) ev.push({ step: s, voice: 'bass', midi: (s % 8 === 6) ? bFifth : (s % 4 === 2 ? bRoot + 12 : bRoot), dur: 1.6 });
      if (th.drums !== 'none') {
        for (let s = 0; s < STEPS; s += 2) ev.push({ step: s, voice: 'hat', open: th.drums !== 'soft' && s === 14, vel: s % 4 === 0 ? .9 : .55 });
        ev.push({ step: 0, voice: 'kick' }, { step: 8, voice: 'kick' });
        if (th.drums === 'pop') { ev.push({ step: 4, voice: 'snare', vel: .7 }, { step: 12, voice: 'snare', vel: .7 }); if (b % 2 === 1) ev.push({ step: 11, voice: 'kick' }); }
        if (th.drums === 'full') {
          ev.push({ step: 4, voice: 'snare' }, { step: 4, voice: 'clap' }, { step: 12, voice: 'snare' }, { step: 12, voice: 'clap' }, { step: 10, voice: 'kick' });
          if (b % 4 === 3) ev.push({ step: 14, voice: 'snare', vel: .6 }, { step: 15, voice: 'snare', vel: .8 });
        }
      }
      const arpTones = [d, d + 2, d + 4, d + 7]; let ai = Math.floor(r() * 4);
      for (let s = 0; s < STEPS; s++) if (r() < th.arp) { ev.push({ step: s, voice: th.arpVoice, midi: deg(th.root, th.scale, arpTones[ai % 4]), dur: 1.2, vel: .5 }); ai += (r() < .8 ? 1 : 3); }
      if (th.song) {
        const line = th.song[b % th.song.length];
        for (let s = 0; s < STEPS; s++) {
          const c = line[s]; if (c === '.' || c === '-') continue;
          let dur = 1; while (s + dur < STEPS && line[s + dur] === '-') dur++;
          ev.push({ step: s, voice: th.melVoice, midi: deg(th.root + 12, th.scale, parseInt(c, 16)), dur: dur + 0.5, vel: 1, mel: true });
        }
      } else {
        const ct = [d, d + 2, d + 4, d + 7, d + 9, d + 11].filter(i => i >= 0 && i <= 14);
        for (let s = 0; s < STEPS; s += 2) {
          if (r() >= (s === 0 ? th.mel + .3 : th.mel)) continue;
          let idx;
          if (r() < .7) { const sorted = ct.slice().sort((x, y) => Math.abs(x - prevIdx) - Math.abs(y - prevIdx)); idx = sorted[r() < .6 ? 0 : 1] || sorted[0]; }
          else idx = Math.max(0, Math.min(14, prevIdx + (r() < .5 ? -1 : 1)));
          prevIdx = idx;
          ev.push({ step: s, voice: th.melVoice, midi: deg(th.root + 12, th.scale, idx), dur: r() < .3 ? 4 : 2, vel: .9, mel: true });
        }
      }
      bars.push(ev);
    }
    return bars;
  }

  let cur = null;
  function playEvent(e, t, st) {
    const th = st.th, v = e.vel || 1, bus = st.tonal, drums = st.bus, sd = st.stepDur;
    switch (e.voice) {
      case 'pad': e.notes.forEach(m => { const f = NOTE(m); [-7, 0, 7].forEach(dt => tone({ f, t, dur: e.dur * sd + 0.6, type: 'sawtooth', detune: dt, vol: 0.016, a: 0.5, hold: e.dur * sd - 0.4, filter: 'lowpass', fc: 650, bus })); }); break;
      case 'bass':
        if (th.bass === 'saw') tone({ f: NOTE(e.midi), t, dur: e.dur * sd, type: 'sawtooth', vol: 0.16, filter: 'lowpass', fc: 900, fc2: 180, q: 3, a: 0.005, bus });
        else { tone({ f: NOTE(e.midi), t, dur: e.dur * sd, type: 'triangle', vol: 0.2, filter: 'lowpass', fc: 500, a: 0.01, bus }); tone({ f: NOTE(e.midi), t, dur: e.dur * sd * 0.8, vol: 0.12, bus }); }
        break;
      case 'kick':
        tone({ f: 165, f2: 42, t, dur: 0.28, slide: 0.1, vol: 0.55, bus: drums }); noise({ t, dur: 0.012, vol: 0.12, filter: 'highpass', fc: 2500, bus: drums });
        if (th.pump) { const g = st.pump.gain; g.cancelScheduledValues(t); g.setValueAtTime(1 - th.pump, t); g.linearRampToValueAtTime(1, t + sd * 3); }
        break;
      case 'snare': noise({ t, dur: 0.16, vol: 0.16 * v, fc: 1600, q: 0.5, bus: drums }); noise({ t, dur: 0.1, vol: 0.06 * v, filter: 'highpass', fc: 5000, bus: drums }); tone({ f: 185, f2: 110, t, dur: 0.1, vol: 0.14 * v, bus: drums }); break;
      case 'clap': [0, 0.012, 0.026].forEach(o => noise({ t: t + o, dur: 0.07, vol: 0.07 * v, fc: 1300, q: 1.2, bus: drums })); break;
      case 'hat': noise({ t, dur: e.open ? 0.2 : 0.035, vol: 0.055 * v, filter: 'highpass', fc: 8000, bus: drums }); break;
      case 'pluck': pluckNote(NOTE(e.midi), t, e.dur * sd * (e.mel ? 1.4 : 1), 0.1 * v, bus); break;
      case 'chip': chipNote(NOTE(e.midi), t, e.dur * sd, 0.1 * v, bus); break;
      case 'marimba': marimbaNote(NOTE(e.midi), t, Math.max(0.25, e.dur * sd), 0.11 * v, bus); break;
      case 'bell': bellNote(NOTE(e.midi), t, Math.max(0.5, e.dur * sd * 1.6), 0.07 * v, bus); break;
      case 'lead': leadNote(NOTE(e.midi), t, e.dur * sd, 0.09 * v, bus); break;
    }
  }
  function chirp(t, bus) { const f = 2600 + Math.random() * 1200; tone({ f, f2: f * 1.3, t, dur: 0.07, vol: 0.03, bus }); tone({ f: f * 1.2, f2: f * 0.9, t: t + 0.09, dur: 0.08, vol: 0.025, bus }); }

  function start(id) {
    const th = THEMES[id] || THEMES.hub;
    const bus = ctx.createGain(); bus.gain.setValueAtTime(0.0001, ctx.currentTime); bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2); bus.connect(musicBus);
    const pump = ctx.createGain(); pump.connect(bus); // sidechain for tonal voices
    const st = { id, th, bars: compose(th), bar: 0, step: 0, next: ctx.currentTime + 0.1, bus, pump, tonal: pump, stepDur: 60 / th.bpm / 4, timer: null };
    st.timer = setInterval(() => {
      if (ctx.state !== 'running') return;
      while (st.next < ctx.currentTime + 0.15) {
        const evs = st.bars[st.bar], swing = (st.step % 2 === 1) ? th.swing * st.stepDur : 0;
        for (const e of evs) if (e.step === st.step) playEvent(e, st.next + swing, st);
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
    const t = ctx.currentTime; st.bus.gain.cancelScheduledValues(t); st.bus.gain.setValueAtTime(Math.max(st.bus.gain.value, 0.0001), t); st.bus.gain.exponentialRampToValueAtTime(0.0001, t + (fade || 0.6));
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
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => { }); else if (unlocked) ctx.resume().catch(() => { }); });

  window.Snd = { sfx, music, stop, duck, setVolume, setMusic, themes: Object.keys(THEMES), playing: () => cur ? cur.id : null, _nodes: () => ({ ctx, master }) };
})();
