// Audio v4: recorded sound effects (Kenney, CC0) + public-domain classical music synthesized live (js/music.js).
// Snd.sfx(name, arg) · Snd.music(themeId) · Snd.setMusic(on) · Snd.setVolume(v) · Snd.duck(on) · Snd.preload()
(function () {
  const BASE = 'assets/';
  let ctx = null, master, sfxBus, comp, noiseBuffer;
  let unlocked = false, pendingTheme = null, lastTheme = null, ducked = false;
  const S = () => window.State ? State.data : { sound: true, music: true, volume: 0.7 };
  const vol = () => { const v = S().volume; return typeof v === 'number' ? v : 0.7; };

  /* ---------- sound bank: event → files (random pick), volume, pitch variation, pitch per combo step ---------- */
  const B = (files, vol, rate, step) => ({ files: [].concat(files), vol: vol == null ? 1 : vol, rate: rate || [1, 1], step: step || 0 });
  const BANK = {
    click: B(['ui_click_001', 'ui_click_002', 'ui_click_003'], .7, [.97, 1.03]),
    tap: B(['ui_click_004', 'ui_select_001'], .8, [.95, 1.08]),
    pop: B('ui_pluck_001', .8, [.9, 1.1]),
    back: B('ui_back_001', .7), open: B('ui_open_001', .7), close: B('ui_close_001', .7), toggle: B('ui_switch_002', .8),
    bad: B(['ui_error_004'], .7, [.95, 1.02]),
    ok: B(['ui_confirmation_001', 'ui_confirmation_002'], .8),
    coin: B(['ui_glass_002', 'ui_glass_003', 'ui_glass_001'], .7, [.98, 1.02], 1),
    buy: B(['dg_power_up_6'], .7),
    star: B(['dg_power_up_8'], .6),
    levelup: B(['dg_power_up_12'], .8),
    fanfare: B(['dg_power_up_11'], .8),
    win: B(['dg_three_tone_1', 'dg_power_up_11'], .8),
    checkpoint: B(['dg_three_tone_2'], .8),
    hint: B(['dg_high_up'], .7),
    tick: B(['ui_tick_001'], .6),
    alarm: B(['ui_error_006'], .8),
    adstart: B(['ui_maximize_002'], .7),
    jump: B(['dg_phase_jump_1', 'dg_phase_jump_2', 'dg_phase_jump_3'], .55, [.95, 1.08]),
    djump: B(['dg_phaser_up_1'], .5, [1, 1.1]),
    bounce: B(['dg_phaser_up_3', 'dg_phase_jump_3'], .65),
    land: B(['im_footstep_grass_000', 'im_footstep_grass_001', 'im_footstep_grass_002'], .5, [.9, 1.1]),
    step: B(['im_footstep_concrete_000', 'im_footstep_wood_000'], .35, [.9, 1.1]),
    speed: B(['dg_phaser_up_3'], .6, [1.1, 1.2]),
    whoosh: B(['dg_phaser_down_1'], .35, [1.2, 1.4]),
    oof: B(['im_impact_punch_medium_000', 'im_impact_punch_medium_001', 'dg_low_down'], .8),
    hit: B(['im_impact_punch_heavy_000'], .8),
    fail: B(['dg_zap_three_tone_down'], .7),
    gameover: B(['dg_low_three_tone'], .8),
    place: B(['im_impact_plank_medium_000', 'im_impact_plank_medium_001', 'im_impact_wood_medium_000'], .8, [.95, 1.05]),
    brick: B(['im_impact_mining_000', 'im_impact_wood_heavy_000'], .8),
    crash: B(['im_impact_plate_heavy_000', 'im_impact_wood_heavy_000'], .8),
    glass: B(['im_impact_glass_light_000', 'im_impact_glass_light_001'], .6),
    shatter: B(['im_impact_glass_heavy_000'], .7),
    bell: B(['im_impact_bell_heavy_000'], .6),
    leaf: B(['im_footstep_grass_001', 'im_footstep_grass_002'], .5, [1.1, 1.3]),
    plant: B(['im_impact_soft_heavy_000', 'dg_high_up'], .7),
    harvest: B(['ui_glass_005', 'dg_pep_sound_1'], .7, [.98, 1.04], 1),
    match: B(['im_impact_glass_light_000', 'ui_glass_001'], .6, [1, 1.05]),
    cascade: B(['ui_glass_003', 'dg_pep_sound_3'], .7, [1, 1], 1.5),
    hatch: B(['im_impact_glass_light_001', 'dg_power_up_3'], .8),
    crack: B(['im_impact_generic_light_000', 'im_impact_metal_light_000'], .7, [.9, 1.1]),
    rare: B(['dg_power_up_11', 'dg_two_tone_1'], .9),
    pet: B(['dg_pep_sound_1', 'dg_pep_sound_3'], .5, [.9, 1.2]),
    zap: B(['dg_zap_1'], .6),
    rumble: B(['im_impact_soft_heavy_000', 'im_impact_plate_heavy_000'], .9, [.6, .8]),
    splash: B(['im_impact_soft_medium_000'], .7, [.8, .9]),
    wind: B(['dg_phaser_down_1'], .4, [.5, .6]),
    question: B(['ui_question_001'], .7),
    drop: B(['ui_drop_002'], .7), scroll: B(['ui_scroll_002'], .6), bong: B(['ui_bong_001'], .6)
  };
  const buffers = {}, loading = {};
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = vol();
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1;
    sfxBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    return ctx;
  }
  function load(name) {
    if (buffers[name] || loading[name] || !ctx) return;
    loading[name] = fetch(`${BASE}sfx/${name}.mp3`).then(r => r.arrayBuffer()).then(ab => ctx.decodeAudioData(ab)).then(b => { buffers[name] = b; }).catch(() => { }).finally(() => { delete loading[name]; });
  }
  function preload() { if (!ensure()) return; const all = new Set(); Object.values(BANK).forEach(b => b.files.forEach(f => all.add(f))); all.forEach(load); }

  function noiseBuf() { if (noiseBuffer) return noiseBuffer; const len = ctx.sampleRate, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return (noiseBuffer = b); }
  // Minimal synth fallback while a sample is still loading.
  function synthFallback(name, t) {
    const g = ctx.createGain(), o = ctx.createOscillator(); o.type = 'triangle';
    const f = { bad: 180, oof: 160, coin: 1200, click: 700, tap: 520 }[name] || 600;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (name === 'coin' ? 1.5 : 0.6), t + 0.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.15);
  }
  function sfx(name, arg) {
    if (!S().sound) return;
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    const def = BANK[name] || BANK.click;
    const file = def.files[Math.floor(Math.random() * def.files.length)];
    const buf = buffers[file];
    const t = ctx.currentTime;
    if (!buf) { load(file); def.files.forEach(load); try { synthFallback(name, t); } catch (e) { } return; }
    try {
      const src = ctx.createBufferSource(); src.buffer = buf;
      let rate = def.rate[0] + Math.random() * (def.rate[1] - def.rate[0]);
      if (def.step && arg) rate *= Math.pow(2, Math.min(arg - 1, 10) * def.step / 12);
      src.playbackRate.value = rate;
      const g = ctx.createGain(); g.gain.value = def.vol * 0.9;
      src.connect(g); g.connect(sfxBus); src.start(t);
    } catch (e) { }
  }

  /* ---------- music: public-domain classical pieces synthesized live by js/music.js (window.Music) ---------- */
  const PIECE = {
    hub: 'satie',
    chess: 'bach', sudoku: 'satie', solitaire: 'mozart', wordle: 'traumerei', nonogram: 'clair',
    checkers: 'canon', connect4: 'elise', mines: 'chopin', g2048: 'canon', blocks: 'elise',
    platformer: 'mozart', explorer: 'canon', deepsea: 'clair',
    obby: 'mozart', tower: 'mozart', garden: 'satie', pets: 'elise', island: 'canon',
    pfoten: 'traumerei', projekt: 'bach', doktorquiz: 'bach', kleinstadt: 'mozart', wortbruecke: 'traumerei', waldklicker: 'canon'
  };
  const DEFAULT_PIECE = 'satie';
  let cur = null, attached = false;
  function M() {
    const m = window.Music; if (!m || !ensure()) return null;
    if (!attached) { m.attach(ctx, comp); m.setVolume(vol()); m.duck(ducked); attached = true; }
    return m;
  }
  function start(id) {
    const piece = PIECE[id] || DEFAULT_PIECE, m = M();
    if (!m) return;
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => { });
    if (cur && cur.piece === piece && m.current() === piece) { cur.id = id; return; }
    cur = { id, piece };
    m.play(piece);
  }
  function stop() { cur = null; if (attached && window.Music) Music.stop(0.8); }
  function music(id) {
    lastTheme = id;
    if (!S().music) { stop(); return; }
    if (!unlocked) { pendingTheme = id; return; }
    start(id);
  }
  function duck(on) { ducked = on; if (attached && window.Music) Music.duck(on); }
  function setVolume(v) { if (window.State) { State.data.volume = v; State.save(); } if (master && ctx) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(v, t + 0.15); } if (attached && window.Music) Music.setVolume(v); }
  function setMusic(on) { if (window.State) { State.data.music = on; State.save(); } if (on) { if (lastTheme) music(lastTheme); } else stop(); }

  function unlock() {
    if (unlocked) return; unlocked = true;
    if (!ensure()) return;
    ctx.resume().catch(() => { }); preload();
    if (pendingTheme && S().music) { const p = pendingTheme; pendingTheme = null; music(p); }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (ctx) ctx.suspend().catch(() => { }); } // pauses sound effects and music together
    else if (ctx && unlocked) ctx.resume().catch(() => { });
  });

  window.Snd = { sfx, music, stop, duck, setVolume, setMusic, preload, themes: Object.keys(PIECE), playing: () => cur ? cur.id : null, pieceOf: id => PIECE[id] || DEFAULT_PIECE, bank: BANK, _nodes: () => ({ ctx, master }) };
})();
