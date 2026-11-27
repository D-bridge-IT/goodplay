// Tiefsee-Expedition / Deep Sea Expedition — a calm, free-roaming underwater exploration game.
// The research sub "Perle" collects plastic litter, frees animals from ghost nets and scans
// 37 species across six depth zones. Canvas 2D, everything procedural: the static terrain is
// baked into cached tiles, deep zones use a darkness mask with a headlight cone, bioluminescent
// glows are drawn additively on top.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const L4 = (de, en, ru, uk) => ({ de, en, ru, uk });

  /* ======================= world layout ======================= */
  const WORLD_W = 3000, WORLD_H = 5050, SKY = 150, YOFF = 800;
  const ZONE_Y = [0, 360, 820, 1500, 2900, 4500, 5050];
  const DEPTH_MAP = [[0, 0], [360, 30], [820, 70], [1500, 200], [2900, 1000], [4500, 3000], [5050, 3800]];
  const BOAT_X = 560, SUB_R = 17;
  const STATIONS = [{ x: 1150, y: 600 }, { x: 2600, y: 2700 }, { x: 2050, y: 4150 }];
  const TP = [[560, 150], [1150, 500], [2100, 1100], [2150, 2200], [2050, 3700], [2000, 4760]];
  const AREA = {
    reef: [300, 840, 110, 355], kelp: [860, 1385, 380, 770], open: [1500, 2820, 380, 1470],
    twi: [1500, 2820, 1560, 2860], trench: [1720, 2400, 2960, 4470], vent: [1770, 2310, 4560, 4965]
  };
  const CURRENTS = [{ y0: 930, y1: 1010, v: 150 }, { y0: 1160, y1: 1232, v: -170 }, { y0: 1360, y1: 1424, v: 130 }];
  const CHIMNEYS = [{ x: 1849, y: 4855 }, { x: 2049, y: 4812 }, { x: 2234, y: 4878 }];
  // Outline of the water/air region (clockwise, y down). A third element 1 = keep the point exact (no noise).
  const OUTLINE = [
    [-120, -700, 1], [3120, -700, 1], [3120, 190, 1], [3020, 205], [2960, 215], [2905, 250], [2880, 330], [2870, 520], [2895, 760], [2860, 1050], [2900, 1400],
    [2850, 1800], [2890, 2200], [2840, 2550], [2800, 2820], [2700, 2870], [2560, 2895], [2480, 3050], [2440, 3300], [2420, 3700], [2460, 4100], [2400, 4450],
    [2370, 4750], [2330, 4930], [2280, 4955],
    [2256, 4975, 1], [2246, 4900, 1], [2240, 4878, 1], [2228, 4882, 1], [2222, 4980, 1], [2150, 4985], [2080, 4962],
    [2072, 4962, 1], [2062, 4860, 1], [2056, 4815, 1], [2042, 4812, 1], [2036, 4850, 1], [2028, 4962, 1], [1960, 4995], [1900, 4985],
    [1872, 4975, 1], [1863, 4890, 1], [1856, 4855, 1], [1843, 4858, 1], [1835, 4900, 1], [1828, 4972, 1], [1780, 4955], [1740, 4940],
    [1700, 4700], [1660, 4350], [1630, 4000], [1650, 3650], [1590, 3300], [1540, 3050], [1500, 2900], [1490, 2600], [1440, 2250], [1475, 1900],
    [1420, 1550], [1450, 1200], [1405, 950], [1395, 830], [1310, 775], [1200, 735], [1090, 680], [1000, 600], [930, 520], [860, 445], [800, 400],
    [720, 365], [640, 385], [560, 370], [480, 335], [400, 345], [320, 310], [250, 250], [200, 150], [165, 60], [130, 0], [95, -45], [40, -70], [-120, -80, 1]
  ];
  const HULL = [1600, 3000, 4600, 5100];
  const UPG = [
    { id: 'battery', ic: 'bolt', cost: [40, 90, 150], val: [100, 150, 210, 280] },
    { id: 'light', ic: 'sun', cost: [30, 70, 120], val: [130, 180, 235, 300] },
    { id: 'motor', ic: 'fan', cost: [30, 70, 120], val: [150, 180, 210, 245] },
    { id: 'sonar', ic: 'radar', cost: [50, 90, 140], val: [0, 550, 850, 1250] },
    { id: 'hull', ic: 'shield', cost: [50, 120, 200], val: HULL },
    { id: 'cargo', ic: 'box', cost: [25, 60, 100], val: [4, 6, 8, 10] }
  ];
  const WASTE_PLAN = [
    [AREA.reef, 18, ['bottle', 'can', 'bag', 'bottle', 'can'], 6],
    [AREA.kelp, 14, ['bag', 'bottle', 'rope', 'can'], 8],
    [AREA.open, 10, ['bag', 'bottle', 'crate'], 10],
    [AREA.twi, 10, ['net', 'barrel', 'bottle', 'tire'], 14],
    [AREA.trench, 10, ['tire', 'barrel', 'bottle', 'can'], 18],
    [AREA.vent, 8, ['barrel', 'can', 'tire'], 22]
  ];
  const NETS = [
    { id: 'n1', sp: 'turtle', x: 720, y: 300 }, { id: 'n2', sp: 'seal', x: 1040, y: 560 }, { id: 'n3', sp: 'dolphin', x: 1900, y: 380 },
    { id: 'n4', sp: 'manta', x: 2450, y: 1100 }, { id: 'n5', sp: 'sunfish', x: 1760, y: 1330 }, { id: 'n6', sp: 'shark', x: 2250, y: 1900 },
    { id: 'n7', sp: 'swordfish', x: 2650, y: 2450 }, { id: 'n8', sp: 'dumbo', x: 2100, y: 3500 }
  ];
  const GOALS = [
    { id: 'clean15', k: 'delivered', n: 15, stars: 8, cr: 30 },
    { id: 'scan10', k: 'species', n: 10, stars: 8, cr: 30 },
    { id: 'free3', k: 'freed', n: 3, stars: 8, cr: 30 },
    { id: 'twilight', k: 'depth', n: 1520, stars: 6, cr: 30 },
    { id: 'scan20', k: 'species', n: 20, stars: 12, cr: 40 },
    { id: 'clean40', k: 'delivered', n: 40, stars: 12, cr: 50, badge: 'deepsea_clean' },
    { id: 'trench', k: 'depth', n: 2920, stars: 12, cr: 40 },
    { id: 'free8', k: 'freed', n: 8, stars: 15, cr: 60 },
    { id: 'vents', k: 'depth', n: 4520, stars: 15, cr: 50 },
    { id: 'scanAll', k: 'species', n: 37, stars: 20, cr: 0, badge: 'deepsea_catalog' }
  ];

  function depthM(y) {
    if (y <= 0) return 0;
    for (let i = 1; i < DEPTH_MAP.length; i++) { const a = DEPTH_MAP[i - 1], b = DEPTH_MAP[i]; if (y <= b[0]) return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]); }
    return 3800;
  }
  function zoneAt(y) { for (let i = 1; i < ZONE_Y.length; i++) if (y < ZONE_Y[i]) return i - 1; return 5; }
  const DARK = [[0, 0], [650, 0], [1500, 0.5], [2900, 0.78], [4500, 0.85], [5050, 0.8]];
  function darkAt(y) { for (let i = 1; i < DARK.length; i++) { const a = DARK[i - 1], b = DARK[i]; if (y <= b[0]) return a[1] + (b[1] - a[1]) * clamp((y - a[0]) / (b[0] - a[0]), 0, 1); } return 0.93; }

  // Smooth 1-D value noise (seeded table)
  const NT = (() => { const r = mulberry(91); const a = new Float32Array(512); for (let i = 0; i < 512; i++) a[i] = r() * 2 - 1; return a; })();
  function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(NT[i & 511], NT[(i + 1) & 511], u); }
  function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ======================= terrain geometry (pure, no DOM) ======================= */
  function buildTerrain() {
    const pts = [];
    let arc = 0;
    for (let i = 0; i < OUTLINE.length; i++) {
      const a = OUTLINE[i], b = OUTLINE[(i + 1) % OUTLINE.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      const smooth = a[2] || b[2] || (a[1] < -100 && b[1] < -100);
      const n = smooth ? 1 : Math.max(1, Math.ceil(len / 22));
      const nx = -dy / len, ny = dx / len;
      for (let k = 0; k < n; k++) {
        const t = k / n, x = a[0] + dx * t, y = a[1] + dy * t;
        let d = 0;
        if (!smooth) { const s = arc + len * t; d = (noise1(s * 0.018) * 12 + noise1(s * 0.07 + 40) * 5) * Math.sin(Math.PI * t) + (noise1(s * 0.018) * 4); }
        pts.push(x + nx * d, y + ny * d);
      }
      arc += len;
    }
    const N = pts.length / 2;
    const seg = new Float32Array(N * 6); // ax ay bx by nx ny (normal points into water)
    for (let i = 0; i < N; i++) {
      const ax = pts[i * 2], ay = pts[i * 2 + 1], j = (i + 1) % N, bx = pts[j * 2], by = pts[j * 2 + 1];
      const l = Math.hypot(bx - ax, by - ay) || 1;
      seg.set([ax, ay, bx, by, -(by - ay) / l, (bx - ax) / l], i * 6);
    }
    // row bands for point-in-polygon
    const BAND = 32, nb = Math.ceil((WORLD_H + YOFF + 100) / BAND);
    const bands = Array.from({ length: nb }, () => []);
    // cell grid for proximity queries
    const CELL = 96, cw = Math.ceil((WORLD_W + 400) / CELL), ch = Math.ceil((WORLD_H + YOFF + 200) / CELL);
    const cells = Array.from({ length: cw * ch }, () => []);
    for (let i = 0; i < N; i++) {
      const o = i * 6, ax = seg[o], ay = seg[o + 1], bx = seg[o + 2], by = seg[o + 3];
      const y0 = Math.min(ay, by), y1 = Math.max(ay, by);
      for (let b = Math.max(0, Math.floor((y0 + YOFF) / BAND)); b <= Math.min(nb - 1, Math.floor((y1 + YOFF) / BAND)); b++) bands[b].push(i);
      const cx0 = Math.floor((Math.min(ax, bx) - 30 + 200) / CELL), cx1 = Math.floor((Math.max(ax, bx) + 30 + 200) / CELL);
      const cy0 = Math.floor((y0 - 30 + YOFF) / CELL), cy1 = Math.floor((y1 + 30 + YOFF) / CELL);
      for (let cy = Math.max(0, cy0); cy <= Math.min(ch - 1, cy1); cy++) for (let cx = Math.max(0, cx0); cx <= Math.min(cw - 1, cx1); cx++) cells[cy * cw + cx].push(i);
    }
    function water(x, y) {
      const b = Math.floor((y + YOFF) / BAND); if (b < 0) return true; if (b >= nb) return false;
      const list = bands[b]; let c = 0;
      for (let k = 0; k < list.length; k++) {
        const o = list[k] * 6, ay = seg[o + 1], by = seg[o + 3];
        if ((ay > y) !== (by > y)) { const ax = seg[o], bx = seg[o + 2]; if (ax + (y - ay) / (by - ay) * (bx - ax) > x) c++; }
      }
      return (c & 1) === 1;
    }
    function cellAt(x, y) { const cx = Math.floor((x + 200) / CELL), cy = Math.floor((y + YOFF) / CELL); if (cx < 0 || cy < 0 || cx >= cw || cy >= ch) return null; return cells[cy * cw + cx]; }
    // nearest point on the outline among segments in the cell: returns distance and fills out[]
    const out = [0, 0, 0, 0];
    function nearest(x, y) {
      const list = cellAt(x, y); let best = 1e9;
      if (!list) return best;
      for (let k = 0; k < list.length; k++) {
        const o = list[k] * 6, ax = seg[o], ay = seg[o + 1], bx = seg[o + 2], by = seg[o + 3];
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
        const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1), qx = ax + dx * t, qy = ay + dy * t;
        const d = Math.hypot(x - qx, y - qy);
        if (d < best) { best = d; out[0] = qx; out[1] = qy; out[2] = seg[o + 4]; out[3] = seg[o + 5]; }
      }
      return best;
    }
    function floorBelow(x, y, maxD) { let yy = y; const lim = y + (maxD || 800); if (!water(x, yy)) return null; while (yy < lim) { yy += 6; if (!water(x, yy)) { let lo = yy - 6, hi = yy; for (let k = 0; k < 5; k++) { const m = (lo + hi) / 2; if (water(x, m)) lo = m; else hi = m; } return lo; } } return null; }
    function segsInRect(x0, y0, x1, y1) {
      const res = [];
      for (let i = 0; i < N; i++) { const o = i * 6; const ax = seg[o], ay = seg[o + 1], bx = seg[o + 2], by = seg[o + 3]; if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 || Math.min(ay, by) > y1) continue; res.push(i); }
      return res;
    }
    return { pts, seg, N, water, nearest, out, floorBelow, segsInRect };
  }

  /* ======================= small drawing helpers ======================= */
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); }
  // gradient cached per object and per context (gradients are evaluated in the current transform)
  function cg(o, key, g, make) { const k = '_' + key; if (o[k] && o[k + 'c'] === g) return o[k]; o[k + 'c'] = g; return (o[k] = make(g)); }
  function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((s, i) => gr.addColorStop(s[0], s[1])); return gr; }
  function eye(g, x, y, r, dark) { g.fillStyle = dark ? '#0a0d14' : '#fff'; circ(g, x, y, r); g.fill(); g.fillStyle = dark ? '#3b4b66' : '#0d1620'; circ(g, x + r * 0.15, y, r * 0.62); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; circ(g, x + r * 0.35, y - r * 0.3, r * 0.22); g.fill(); }

  /* ---------- generic fish ---------- */
  function fishBody(g, hl, hh) {
    g.beginPath(); g.moveTo(hl, 0);
    g.bezierCurveTo(hl * 0.55, -hh * 1.1, -hl * 0.45, -hh * 1.0, -hl * 0.9, -hh * 0.22);
    g.lineTo(-hl * 0.9, hh * 0.22);
    g.bezierCurveTo(-hl * 0.45, hh * 1.0, hl * 0.55, hh * 1.1, hl, 0); g.closePath();
  }
  function drawFish(g, P, t) {
    const hl = P.L / 2, hh = P.H / 2, w = Math.sin(t * (P.wag || 9));
    const tx = -hl * 0.86, sw = w * hh * 0.35, tl = P.tailL || hh * 1.1;
    g.fillStyle = P.tailC || P.top; g.beginPath();
    if (P.tail === 'round') { g.moveTo(tx + 2, 0); g.quadraticCurveTo(tx - tl * 0.5, sw - hh * 1.2, tx - tl, sw - hh * 0.65); g.quadraticCurveTo(tx - tl * 1.2, sw, tx - tl, sw + hh * 0.65); g.quadraticCurveTo(tx - tl * 0.5, sw + hh * 1.2, tx + 2, 0); }
    else { const s = P.tail === 'lunate' ? 1.45 : 1.0; g.moveTo(tx + 3, 0); g.quadraticCurveTo(tx - tl * 0.4, sw - hh * 0.3, tx - tl, sw - hh * s); g.quadraticCurveTo(tx - tl * 0.55, sw, tx - tl, sw + hh * s); g.quadraticCurveTo(tx - tl * 0.4, sw + hh * 0.3, tx + 3, 0); }
    g.fill();
    if (P.dorsal) {
      const dh = P.dorsal * hh; g.fillStyle = P.finC || P.top;
      g.beginPath(); g.moveTo(hl * 0.35, -hh * 0.8); g.quadraticCurveTo(-hl * 0.05, -hh - dh * 1.2, -hl * 0.6, -hh * 0.5); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-hl * 0.1, hh * 0.8); g.quadraticCurveTo(-hl * 0.35, hh + dh * 0.7, -hl * 0.62, hh * 0.42); g.closePath(); g.fill();
    }
    fishBody(g, hl, hh);
    g.fillStyle = cg(P, 'g', g, gg => vgrad(gg, -hh, hh, P.mid ? [[0, P.top], [0.5, P.mid], [1, P.bot]] : [[0, P.top], [1, P.bot]])); g.fill();
    if (P.marks) { g.save(); fishBody(g, hl, hh); g.clip(); P.marks(g, hl, hh, t); g.restore(); }
    g.fillStyle = 'rgba(255,255,255,.16)'; ell(g, hl * 0.05, -hh * 0.45, hl * 0.55, hh * 0.22); g.fill();
    g.fillStyle = P.pecC || 'rgba(255,255,255,.35)'; ell(g, hl * 0.15, hh * 0.28, hh * 0.45, hh * 0.17, 0.5 + w * 0.3); g.fill();
    if (P.extra) P.extra(g, hl, hh, t, w);
    eye(g, hl * 0.56, -hh * 0.18, Math.max(1.3, P.eye || hh * 0.22), P.darkEye);
  }
  const fish = P => (g, c, t) => drawFish(g, P, t);

  /* ---------- special bodies ---------- */
  function drawShark(g, c, t) {
    const sp = c.sp, L = sp.L, hl = L / 2, w = Math.sin(t * 4.5), sw = w * L * 0.05;
    g.fillStyle = '#3a68a8';
    g.beginPath(); g.moveTo(-hl * 0.74, -L * 0.02); g.quadraticCurveTo(-hl * 1.0, -L * 0.1 + sw, -hl * 1.2, -L * 0.2 + sw); g.quadraticCurveTo(-hl * 1.04, -L * 0.02 + sw, -hl * 1.1, L * 0.09 + sw); g.quadraticCurveTo(-hl * 0.95, L * 0.04, -hl * 0.74, L * 0.03); g.fill();
    g.beginPath(); g.moveTo(hl * 0.12, -L * 0.09); g.lineTo(-hl * 0.06, -L * 0.21); g.quadraticCurveTo(-hl * 0.12, -L * 0.12, -hl * 0.26, -L * 0.08); g.fill();
    g.beginPath(); g.moveTo(-hl * 0.5, -L * 0.05); g.lineTo(-hl * 0.58, -L * 0.1); g.lineTo(-hl * 0.62, -L * 0.04); g.fill();
    g.fillStyle = cg(sp, 'g', g, gg => vgrad(gg, -L * 0.1, L * 0.09, [[0, '#2f5d9e'], [0.45, '#4f86c8'], [0.62, '#dfe8f2'], [1, '#f4f7fb']]));
    g.beginPath(); g.moveTo(hl, L * 0.01); g.quadraticCurveTo(hl * 0.82, -L * 0.085, hl * 0.2, -L * 0.1); g.quadraticCurveTo(-hl * 0.5, -L * 0.075, -hl * 0.8, -L * 0.02); g.lineTo(-hl * 0.8, L * 0.03); g.quadraticCurveTo(-hl * 0.3, L * 0.09, hl * 0.3, L * 0.08); g.quadraticCurveTo(hl * 0.86, L * 0.06, hl, L * 0.01); g.fill();
    g.fillStyle = '#3a68a8'; g.beginPath(); g.moveTo(hl * 0.35, L * 0.05); g.quadraticCurveTo(hl * 0.12, L * 0.18 + w * 2, -hl * 0.08, L * 0.22 + w * 2); g.quadraticCurveTo(hl * 0.1, L * 0.1, hl * 0.18, L * 0.05); g.fill();
    g.strokeStyle = 'rgba(20,40,70,.45)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(hl * (0.5 - i * 0.05), -L * 0.03); g.lineTo(hl * (0.47 - i * 0.05), L * 0.04); g.stroke(); }
    eye(g, hl * 0.72, -L * 0.025, 2.2, true);
  }
  function drawDolphin(g, c, t) {
    const sp = c.sp, L = sp.L, hl = L / 2, w = Math.sin(t * 5);
    g.fillStyle = '#6f879c';
    g.save(); g.translate(-hl * 0.82, 0); g.rotate(w * 0.25); g.beginPath(); g.moveTo(4, 0); g.quadraticCurveTo(-L * 0.1, -L * 0.03, -L * 0.17, -L * 0.1); g.quadraticCurveTo(-L * 0.11, 0, -L * 0.17, L * 0.1); g.quadraticCurveTo(-L * 0.1, L * 0.03, 4, 0); g.fill(); g.restore();
    g.beginPath(); g.moveTo(hl * 0.05, -L * 0.1); g.quadraticCurveTo(-hl * 0.15, -L * 0.24, -hl * 0.32, -L * 0.24); g.quadraticCurveTo(-hl * 0.2, -L * 0.15, -hl * 0.25, -L * 0.08); g.fill();
    g.fillStyle = cg(sp, 'g', g, gg => vgrad(gg, -L * 0.12, L * 0.11, [[0, '#5d768c'], [0.5, '#8aa1b4'], [0.7, '#dfe7ee'], [1, '#f1f5f8']]));
    g.beginPath(); g.moveTo(hl, L * 0.02); g.quadraticCurveTo(hl * 0.92, -L * 0.005, hl * 0.78, -L * 0.03); g.quadraticCurveTo(hl * 0.6, -L * 0.13, hl * 0.1, -L * 0.12);
    g.quadraticCurveTo(-hl * 0.5, -L * 0.09, -hl * 0.86, -L * 0.015); g.lineTo(-hl * 0.86, L * 0.02); g.quadraticCurveTo(-hl * 0.4, L * 0.1, hl * 0.2, L * 0.1); g.quadraticCurveTo(hl * 0.7, L * 0.08, hl, L * 0.02); g.fill();
    g.fillStyle = '#6f879c'; g.save(); g.translate(hl * 0.35, L * 0.06); g.rotate(0.7 + w * 0.15); ell(g, 0, L * 0.06, L * 0.03, L * 0.08); g.fill(); g.restore();
    g.strokeStyle = 'rgba(40,55,70,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(hl * 0.98, L * 0.025); g.quadraticCurveTo(hl * 0.9, L * 0.04, hl * 0.8, L * 0.02); g.stroke();
    eye(g, hl * 0.7, -L * 0.03, 2, true);
  }
  function drawWhale(g, c, t) {
    const sp = c.sp, L = sp.L, hl = L / 2, w = Math.sin(t * 1.4);
    g.fillStyle = '#26344a';
    g.save(); g.translate(-hl * 0.86, 0); g.rotate(w * 0.18); g.beginPath(); g.moveTo(6, 0); g.quadraticCurveTo(-L * 0.08, -L * 0.02, -L * 0.15, -L * 0.1); g.quadraticCurveTo(-L * 0.1, -L * 0.01, -L * 0.15, L * 0.09); g.quadraticCurveTo(-L * 0.08, L * 0.02, 6, 0); g.fill(); g.restore();
    // far pectoral
    g.fillStyle = '#41536b'; g.save(); g.translate(hl * 0.3, L * 0.05); g.rotate(0.55 - w * 0.25); ell(g, -L * 0.01, L * 0.11, L * 0.022, L * 0.115); g.fill(); g.restore();
    g.fillStyle = cg(sp, 'g', g, gg => vgrad(gg, -L * 0.12, L * 0.12, [[0, '#1d2a3c'], [0.55, '#2f4058'], [0.75, '#5d6f85'], [1, '#9aa9b9']]));
    g.beginPath(); g.moveTo(hl, -L * 0.005); g.quadraticCurveTo(hl * 0.95, -L * 0.07, hl * 0.6, -L * 0.1); g.quadraticCurveTo(0, -L * 0.13, -hl * 0.5, -L * 0.07);
    g.quadraticCurveTo(-hl * 0.75, -L * 0.035, -hl * 0.88, -L * 0.01); g.lineTo(-hl * 0.88, L * 0.015); g.quadraticCurveTo(-hl * 0.4, L * 0.1, hl * 0.2, L * 0.12); g.quadraticCurveTo(hl * 0.8, L * 0.1, hl * 0.98, L * 0.03); g.closePath(); g.fill();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(220,230,240,.35)'; g.lineWidth = 1.4;
    for (let i = 0; i < 9; i++) { const y = L * 0.04 + i * L * 0.008; g.beginPath(); g.moveTo(hl * 0.95, y); g.quadraticCurveTo(hl * 0.4, y + L * 0.02, -hl * 0.05, y + L * 0.005); g.stroke(); }
    g.fillStyle = 'rgba(200,210,220,.5)'; for (let i = 0; i < 6; i++) { circ(g, hl * (0.9 - i * 0.07), -L * (0.06 - i * 0.004), 2.2); g.fill(); }
    g.restore();
    g.fillStyle = '#26344a'; g.beginPath(); g.moveTo(-hl * 0.32, -L * 0.085); g.quadraticCurveTo(-hl * 0.38, -L * 0.12, -hl * 0.46, -L * 0.075); g.fill();
    g.fillStyle = '#c9d4de'; g.save(); g.translate(hl * 0.4, L * 0.06); g.rotate(0.75 + w * 0.3); g.beginPath(); g.ellipse(-L * 0.005, L * 0.12, L * 0.026, L * 0.13, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(40,52,70,.35)'; for (let i = 0; i < 5; i++) { circ(g, L * 0.016, L * (0.03 + i * 0.045), 2.2); g.fill(); } g.restore();
    eye(g, hl * 0.62, L * 0.02, 3, true);
  }
  function drawSeal(g, c, t) {
    const sp = c.sp, L = sp.L, hl = L / 2, w = Math.sin(t * 6);
    g.fillStyle = '#5f6a74';
    g.save(); g.translate(-hl * 0.8, 0); g.rotate(w * 0.3); g.beginPath(); g.moveTo(2, 0); g.lineTo(-L * 0.16, -L * 0.07); g.lineTo(-L * 0.12, 0); g.lineTo(-L * 0.16, L * 0.07); g.closePath(); g.fill(); g.restore();
    g.fillStyle = cg(sp, 'g', g, gg => vgrad(gg, -L * 0.14, L * 0.14, [[0, '#56616c'], [0.6, '#8b959e'], [1, '#c9ced2']]));
    g.beginPath(); g.moveTo(hl, 0); g.quadraticCurveTo(hl * 0.95, -L * 0.13, hl * 0.55, -L * 0.13); g.quadraticCurveTo(0, -L * 0.15, -hl * 0.82, -L * 0.03); g.lineTo(-hl * 0.82, L * 0.03); g.quadraticCurveTo(0, L * 0.16, hl * 0.6, L * 0.11); g.quadraticCurveTo(hl * 0.96, L * 0.08, hl, 0); g.fill();
    g.fillStyle = 'rgba(40,46,52,.35)'; for (let i = 0; i < 9; i++) { circ(g, hl * (0.4 - i * 0.13), -L * 0.05 + (i % 3) * L * 0.035, 1.6); g.fill(); }
    g.fillStyle = '#5f6a74'; g.save(); g.translate(hl * 0.3, L * 0.07); g.rotate(0.9 + w * 0.3); ell(g, 0, L * 0.06, L * 0.03, L * 0.08); g.fill(); g.restore();
    g.strokeStyle = 'rgba(240,240,240,.6)'; g.lineWidth = 0.7; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(hl * 0.92, L * 0.02); g.lineTo(hl * 1.12, L * 0.02 + i * 3); g.stroke(); }
    g.fillStyle = '#1b1f24'; circ(g, hl * 0.97, -L * 0.01, 1.8); g.fill();
    eye(g, hl * 0.72, -L * 0.06, 2.6, true);
  }
  function drawOtter(g, c, t) {
    const L = c.sp.L, hl = L / 2, b = Math.sin(t * 1.6) * 1.5;
    g.save(); g.translate(0, b);
    g.fillStyle = '#5a3d2a'; ell(g, -hl * 0.95, -2, L * 0.16, L * 0.06, -0.2); g.fill();
    g.fillStyle = cg(c.sp, 'g', g, gg => vgrad(gg, -L * 0.18, L * 0.12, [[0, '#9a7556'], [0.5, '#6e4c34'], [1, '#4a3122']]));
    ell(g, 0, 0, hl * 0.82, L * 0.13); g.fill();
    g.fillStyle = '#d9c3a3'; circ(g, hl * 0.78, -L * 0.07, L * 0.14); g.fill();
    g.fillStyle = '#c8ad88'; ell(g, hl * 0.95, -L * 0.04, L * 0.06, L * 0.045); g.fill();
    g.fillStyle = '#231a14'; circ(g, hl * 1.0, -L * 0.06, 1.8); g.fill(); circ(g, hl * 0.72, -L * 0.12, 1.4); g.fill();
    g.fillStyle = '#b8a4c9'; ell(g, hl * 0.2, -L * 0.13, L * 0.07, L * 0.05); g.fill();
    g.fillStyle = '#5a3d2a'; circ(g, hl * 0.32, -L * 0.13, L * 0.035); g.fill(); circ(g, hl * 0.08, -L * 0.14, L * 0.035); g.fill();
    g.fillStyle = '#4a3122'; ell(g, -hl * 0.55, -L * 0.1, L * 0.05, L * 0.03, 0.5); g.fill();
    g.restore();
  }
  function drawTurtle(g, c, t) {
    const sp = c.sp, L = sp.L, f = Math.sin(t * 2.2);
    g.fillStyle = '#6f7f45'; g.save(); g.translate(L * 0.12, 0); g.rotate(-0.4 - f * 0.55); ell(g, 0, -L * 0.15, L * 0.06, L * 0.2); g.fill(); g.restore();
    g.fillStyle = '#8a9a5b'; g.save(); g.translate(-L * 0.26, L * 0.08); g.rotate(0.5 + f * 0.25); ell(g, -L * 0.08, 0, L * 0.12, L * 0.045); g.fill(); g.restore();
    g.fillStyle = '#9aab66'; ell(g, L * 0.38, -L * 0.01, L * 0.12, L * 0.08, -0.1); g.fill();
    g.fillStyle = cg(sp, 'g', g, gg => { const gr = gg.createRadialGradient(-L * 0.05, -L * 0.14, 2, 0, -L * 0.03, L * 0.36); gr.addColorStop(0, '#a4b763'); gr.addColorStop(0.6, '#6b7f3a'); gr.addColorStop(1, '#3f5223'); return gr; });
    g.beginPath(); g.ellipse(0, -L * 0.03, L * 0.34, L * 0.19, 0, Math.PI, TAU); g.lineTo(L * 0.34, L * 0.02); g.quadraticCurveTo(0, L * 0.1, -L * 0.34, L * 0.02); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(45,55,22,.55)'; g.lineWidth = 1.2;
    g.beginPath(); for (let i = -1; i <= 1; i++) { const x = i * L * 0.13; g.moveTo(x - L * 0.06, -L * 0.15); g.lineTo(x + L * 0.06, -L * 0.15); g.lineTo(x + L * 0.08, -L * 0.07); g.lineTo(x - L * 0.08, -L * 0.07); g.closePath(); } g.stroke();
    g.fillStyle = '#e1d39b'; g.beginPath(); g.moveTo(-L * 0.3, L * 0.03); g.quadraticCurveTo(0, L * 0.11, L * 0.3, L * 0.03); g.quadraticCurveTo(0, L * 0.07, -L * 0.3, L * 0.03); g.fill();
    g.fillStyle = '#9aab66'; g.save(); g.translate(L * 0.16, L * 0.05); g.rotate(0.6 + f * 0.6); ell(g, 0, L * 0.15, L * 0.055, L * 0.19); g.fill(); g.restore();
    eye(g, L * 0.43, -L * 0.03, 2.1, true);
  }
  function drawSeahorse(g, c, t) {
    const sp = c.sp, L = sp.L, s = L / 26, leafy = sp.leafy, fl = Math.sin(t * 14) * 0.4;
    g.save(); g.scale(s, s);
    if (leafy) { g.rotate(-1.1); }
    g.lineCap = 'round';
    g.strokeStyle = sp.col; g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, -8); g.quadraticCurveTo(4, -2, 2, 4); g.quadraticCurveTo(-1, 9, 0, 12); g.quadraticCurveTo(1, 16, -3, 16); g.quadraticCurveTo(-6, 15, -4, 12); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.moveTo(0, -7); g.quadraticCurveTo(5, -1, 2, 4); g.stroke();
    g.fillStyle = sp.col; ell(g, 1, -10, 4, 3.4, 0.3); g.fill();
    g.beginPath(); g.moveTo(3, -11); g.lineTo(10, -9); g.lineTo(10, -7); g.lineTo(3, -8); g.fill();
    g.fillStyle = sp.col2; ell(g, -3, -2, 2.5, 4 + fl, 0.2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 0.8; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-1, -5 + i * 2.6); g.lineTo(4, -5 + i * 2.6); g.stroke(); }
    if (leafy) { g.fillStyle = '#c7b347'; const lf = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a + Math.sin(t * 2 + x) * 0.15); ell(g, 0, -4, 1.8, 4.5); g.fill(); g.restore(); }; lf(-2, -12, -0.6); lf(5, -4, 0.8); lf(-3, 2, -1.2); lf(3, 8, 1.0); lf(-4, 12, -1.6); lf(0, 16, 2.2); }
    eye(g, 2, -11, 1.3, true);
    g.restore();
  }
  function drawOcto(g, c, t) {
    const sp = c.sp, L = sp.L, v = sp.variant, k = L / 34;
    g.save(); g.scale(k, k);
    let col = sp.col;
    if (v === 'common') { const h = 16 + Math.sin(t * 0.7) * 10; col = `hsl(${h},62%,${48 + Math.sin(t * 1.3) * 6}%)`; }
    if (v === 'dumbo') { const e = Math.sin(t * 3); g.fillStyle = '#f7b9c6'; g.save(); g.translate(-6, -12); g.rotate(-0.4 + e * 0.5); ell(g, -5, 0, 7, 3.5); g.fill(); g.restore(); g.save(); g.translate(6, -12); g.rotate(0.4 - e * 0.5); ell(g, 5, 0, 7, 3.5); g.fill(); g.restore(); }
    // arms
    g.strokeStyle = col; g.lineCap = 'round';
    const n = v === 'dumbo' ? 6 : 7;
    for (let i = 0; i < n; i++) {
      const bx = -8 + i * (16 / (n - 1)); g.lineWidth = v === 'vampire' ? 3 : 3.4;
      g.beginPath(); g.moveTo(bx, 2);
      const len = v === 'dumbo' ? 10 : 18, ph = t * 2.4 + i * 0.9;
      g.bezierCurveTo(bx + Math.sin(ph) * 4, 2 + len * 0.4, bx + (i - n / 2) * 2 + Math.sin(ph + 1) * 5, 2 + len * 0.8, bx + (i - n / 2) * 3.2 + Math.sin(ph + 2) * 4, 2 + len);
      g.stroke();
    }
    if (v === 'vampire') { g.fillStyle = 'rgba(90,10,30,.85)'; g.beginPath(); g.moveTo(-10, 1); g.quadraticCurveTo(-14, 14, -4, 16); g.lineTo(4, 16); g.quadraticCurveTo(14, 14, 10, 1); g.fill(); }
    g.fillStyle = col; ell(g, 0, -8, 11, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; ell(g, -3, -13, 5, 4); g.fill();
    if (v !== 'vampire') { g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 6; i++) { circ(g, -6 + (i % 3) * 5, -10 + Math.floor(i / 3) * 6, 1.2); g.fill(); } }
    eye(g, -4, -1, v === 'vampire' ? 3 : 2.4, v !== 'vampire'); eye(g, 4, -1, v === 'vampire' ? 3 : 2.4, v !== 'vampire');
    if (v === 'vampire') { g.fillStyle = '#4fc3ff'; circ(g, -4, -1, 1.6); g.fill(); circ(g, 4, -1, 1.6); g.fill(); }
    g.restore();
  }
  function drawSquid(g, c, t) {
    const sp = c.sp, L = sp.L, hl = L / 2, p = Math.sin(t * 2), mw = L * 0.085 * (1 + p * 0.05);
    g.strokeStyle = '#a5452f'; g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const y0 = (i - 3.5) * 2.2; g.lineWidth = 3.2 - i * 0.12; g.beginPath(); g.moveTo(-hl * 0.15, y0);
      const ph = t * 2.2 + i; g.bezierCurveTo(-hl * 0.45, y0 + Math.sin(ph) * 8, -hl * 0.65, y0 * 1.6 + Math.sin(ph + 1) * 10, -hl * 0.8, y0 * 2 + Math.sin(ph + 2) * 9); g.stroke();
    }
    g.lineWidth = 1.6; for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; g.beginPath(); g.moveTo(-hl * 0.15, s * 3); g.bezierCurveTo(-hl * 0.6, s * 12 + Math.sin(t * 1.6 + i) * 14, -hl * 1.0, s * 6 + Math.sin(t * 1.3 + i) * 18, -hl * 1.25, s * 10 + Math.sin(t * 1.1 + i) * 16); g.stroke(); g.fillStyle = '#a5452f'; ell(g, -hl * 1.25, s * 10 + Math.sin(t * 1.1 + i) * 16, 6, 2.5); g.fill(); }
    g.fillStyle = cg(sp, 'g', g, gg => vgrad(gg, -mw, mw, [[0, '#c45a3f'], [0.6, '#b04a33'], [1, '#e08a6c']]));
    g.beginPath(); g.moveTo(-hl * 0.18, -mw * 0.8); g.quadraticCurveTo(hl * 0.3, -mw * 1.15, hl * 0.62, -mw * 0.25); g.lineTo(hl * 0.62, mw * 0.25); g.quadraticCurveTo(hl * 0.3, mw * 1.15, -hl * 0.18, mw * 0.8); g.closePath(); g.fill();
    g.fillStyle = '#b04a33'; g.beginPath(); g.moveTo(hl * 0.4, 0); g.quadraticCurveTo(hl * 0.62, -mw * 1.9 - p * 2, hl * 0.72, 0); g.quadraticCurveTo(hl * 0.62, mw * 1.9 + p * 2, hl * 0.4, 0); g.fill();
    g.fillStyle = 'rgba(255,220,200,.2)'; ell(g, hl * 0.15, -mw * 0.45, hl * 0.3, mw * 0.25); g.fill();
    g.fillStyle = '#c45a3f'; ell(g, -hl * 0.18, 0, L * 0.05, mw * 0.85); g.fill();
    eye(g, -hl * 0.16, -mw * 0.1, L * 0.028, true);
  }
  function drawManta(g, c, t) {
    const sp = c.sp, L = sp.L, f = Math.sin(t * 1.5);
    g.fillStyle = '#1c2a40'; g.globalAlpha = 0.75;
    g.beginPath(); g.moveTo(L * 0.18, 0); g.quadraticCurveTo(-L * 0.02, L * 0.02 + f * L * 0.28, -L * 0.15, L * 0.06 + f * L * 0.42); g.quadraticCurveTo(-L * 0.12, L * 0.06, -L * 0.25, 0); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = '#1c2a40'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-L * 0.25, 0); g.quadraticCurveTo(-L * 0.4, Math.sin(t * 2) * 3, -L * 0.55, 0); g.stroke();
    g.fillStyle = cg(sp, 'g', g, gg => vgrad(gg, -L * 0.1, L * 0.05, [[0, '#24344d'], [0.7, '#33496a'], [1, '#e9eef3']]));
    g.beginPath(); g.moveTo(L * 0.3, -L * 0.01); g.quadraticCurveTo(L * 0.2, -L * 0.07, 0, -L * 0.06); g.quadraticCurveTo(-L * 0.2, -L * 0.04, -L * 0.27, 0); g.quadraticCurveTo(-L * 0.1, L * 0.05, L * 0.2, L * 0.04); g.quadraticCurveTo(L * 0.3, L * 0.03, L * 0.3, -L * 0.01); g.fill();
    g.fillStyle = cg(sp, 'w', g, gg => vgrad(gg, -L * 0.45, 0, [[0, '#2b3d58'], [1, '#1c2a40']]));
    g.beginPath(); g.moveTo(L * 0.2, -L * 0.04); g.quadraticCurveTo(L * 0.02, -L * 0.06 - f * L * 0.32, -L * 0.14, -L * 0.04 - f * L * 0.46); g.quadraticCurveTo(-L * 0.12, -L * 0.05, -L * 0.24, -L * 0.01); g.fill();
    g.fillStyle = 'rgba(240,245,250,.5)'; g.beginPath(); g.moveTo(L * 0.12, -L * 0.05); g.quadraticCurveTo(0, -L * 0.1 - f * L * 0.2, -L * 0.06, -L * 0.06 - f * L * 0.26); g.quadraticCurveTo(0, -L * 0.06, L * 0.12, -L * 0.05); g.fill();
    g.fillStyle = '#24344d'; g.beginPath(); g.moveTo(L * 0.28, -L * 0.02); g.quadraticCurveTo(L * 0.36, -L * 0.05, L * 0.38, -L * 0.01); g.quadraticCurveTo(L * 0.33, -L * 0.01, L * 0.28, 0); g.fill();
    g.beginPath(); g.moveTo(L * 0.28, L * 0.02); g.quadraticCurveTo(L * 0.36, L * 0.04, L * 0.37, L * 0.01); g.fill();
    eye(g, L * 0.24, -L * 0.025, 1.8, true);
  }
  function drawJelly(g, c, t) {
    const sp = c.sp, v = sp.variant, r = sp.L / 2, p = Math.sin(t * 2.6), sx = 1 + p * 0.08, sy = 1 - p * 0.1;
    if (v === 'comb') {
      g.fillStyle = 'rgba(210,235,255,.28)'; ell(g, 0, 0, r * 0.7, r); g.fill();
      g.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) { const x = (i - 1.5) * r * 0.36; g.strokeStyle = `hsla(${(t * 120 + i * 70) % 360},95%,65%,.9)`; g.beginPath(); g.moveTo(x * 0.6, -r * 0.85); g.quadraticCurveTo(x * 1.2, 0, x * 0.6, r * 0.85); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 0.8; ell(g, 0, 0, r * 0.7, r); g.stroke();
      return;
    }
    const red = v === 'atolla';
    g.save(); g.scale(sx, sy);
    g.strokeStyle = red ? 'rgba(200,40,60,.7)' : 'rgba(220,235,255,.55)'; g.lineWidth = 0.8;
    for (let i = 0; i < 9; i++) { const x = (i - 4) * r * 0.22; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + Math.sin(t * 2 + i) * 4, r * 0.9, x + Math.sin(t * 1.5 + i) * 6, r * (red ? 1.2 : 1.7)); g.stroke(); }
    if (!red) { g.strokeStyle = 'rgba(255,200,230,.55)'; g.lineWidth = 2.2; for (let i = 0; i < 4; i++) { const x = (i - 1.5) * r * 0.2; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + Math.sin(t * 1.4 + i) * 5, r * 0.6, x + Math.sin(t + i) * 3, r * 1.1); g.stroke(); } }
    g.fillStyle = cg(sp, 'g', g, gg => vgrad(gg, -r, 0, red ? [[0, 'rgba(210,40,60,.95)'], [1, 'rgba(120,10,30,.9)']] : [[0, 'rgba(225,240,255,.75)'], [1, 'rgba(170,205,240,.35)']]));
    g.beginPath(); g.moveTo(-r, 0); g.bezierCurveTo(-r, -r * 1.25, r, -r * 1.25, r, 0); g.quadraticCurveTo(0, r * 0.22, -r, 0); g.fill();
    if (red) { g.strokeStyle = 'rgba(255,120,140,.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, -r * 0.35, r * 0.6, r * 0.3, 0, Math.PI, TAU); g.stroke(); }
    else { g.fillStyle = 'rgba(255,160,210,.75)'; for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.5; g.beginPath(); g.arc(Math.cos(a) * r * 0.32, -r * 0.42 + Math.sin(a) * r * 0.12, r * 0.15, 0, TAU); g.fill(); } }
    g.restore();
  }
  function drawEel(g, c, t) {
    const sp = c.sp, L = sp.L, gul = sp.variant === 'gulper';
    const out = c.out == null ? 1 : c.out, N = 16, len = L * out;
    if (!gul) { g.fillStyle = 'rgba(10,12,8,.75)'; ell(g, 0, 2, 9, 7); g.fill(); }
    g.beginPath();
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, x = gul ? -s * len : s * len * 0.9, amp = gul ? L * 0.07 : L * 0.05;
      const y = Math.sin(t * 3 - s * 6) * amp * (gul ? s : (1 - s) * 0.6 + 0.2) + (gul ? 0 : -s * len * 0.25);
      const wd = gul ? (i < 3 ? 2.5 : 2.2 * (1 - s) + 0.5) : (L * 0.075) * (1 - s * 0.35);
      top.push(x, y - wd); bot.push(x, y + wd);
    }
    g.moveTo(top[0], top[1]); for (let i = 1; i <= N; i++) g.lineTo(top[i * 2], top[i * 2 + 1]);
    for (let i = N; i >= 0; i--) g.lineTo(bot[i * 2], bot[i * 2 + 1]); g.closePath();
    g.fillStyle = gul ? '#14121a' : '#5f7f2c'; g.fill();
    if (!gul) {
      g.fillStyle = 'rgba(230,220,90,.55)'; for (let i = 2; i < N; i += 2) { circ(g, top[i * 2] + 1, (top[i * 2 + 1] + bot[i * 2 + 1]) / 2, 1.3); g.fill(); }
      const hx = top[N * 2], hy = (top[N * 2 + 1] + bot[N * 2 + 1]) / 2;
      g.fillStyle = '#6f912f'; ell(g, hx + 3, hy, 7, 5.5, -0.25); g.fill();
      g.fillStyle = '#2a1a12'; g.beginPath(); g.moveTo(hx + 4, hy + 1); g.lineTo(hx + 10, hy + 1 + Math.sin(t * 2) * 1.5 + 2); g.lineTo(hx + 4, hy + 3); g.fill();
      eye(g, hx + 5, hy - 2.5, 1.5, true);
    } else {
      const jaw = 6 + Math.sin(t * 1.2) * 3;
      g.fillStyle = '#1d1a26'; g.beginPath(); g.moveTo(-2, 0); g.lineTo(L * 0.22, -jaw); g.quadraticCurveTo(L * 0.18, 0, L * 0.22, jaw); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,110,150,.5)'; g.lineWidth = 0.8; g.stroke();
      eye(g, 3, -2, 1.1, true);
    }
  }
  function drawAngler(g, c, t) {
    const L = c.sp.L, r = L * 0.42, m = Math.sin(t * 1.5) * 0.08;
    g.strokeStyle = '#4b4152'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(r * 0.2, -r * 0.9); g.quadraticCurveTo(r * 1.2, -r * 1.9, r * 1.6, -r * 0.9 + Math.sin(t * 2) * 2); g.stroke();
    g.fillStyle = '#2d2733'; g.beginPath(); g.moveTo(-r * 0.9, 0); g.lineTo(-r * 1.55, -r * 0.6 + Math.sin(t * 4) * 2); g.lineTo(-r * 1.45, 0); g.lineTo(-r * 1.55, r * 0.6 + Math.sin(t * 4) * 2); g.closePath(); g.fill();
    g.fillStyle = cg(c.sp, 'g', g, gg => { const gr = gg.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r * 1.1); gr.addColorStop(0, '#5b4f63'); gr.addColorStop(1, '#221d27'); return gr; });
    circ(g, 0, 0, r); g.fill();
    g.fillStyle = '#120d14'; g.beginPath(); g.moveTo(r * 0.98, -r * 0.15); g.quadraticCurveTo(r * 0.35, r * (0.2 + m), r * 0.98, r * (0.55 + m)); g.closePath(); g.fill();
    g.fillStyle = '#e8e1d0';
    for (let i = 0; i < 5; i++) { const x = r * (0.95 - i * 0.12); g.beginPath(); g.moveTo(x, -r * 0.12 + i * r * 0.03); g.lineTo(x - 1.3, r * 0.08); g.lineTo(x - 2.6, -r * 0.1 + i * r * 0.03); g.fill(); g.beginPath(); g.moveTo(x, r * (0.52 + m) - i * r * 0.03); g.lineTo(x - 1.3, r * (0.3 + m)); g.lineTo(x - 2.6, r * (0.5 + m) - i * r * 0.03); g.fill(); }
    g.fillStyle = '#3c3443'; ell(g, -r * 0.1, r * 0.5, r * 0.35, r * 0.15, 0.6); g.fill();
    eye(g, r * 0.45, -r * 0.45, 1.6, true);
    g.fillStyle = '#d9fff6'; circ(g, r * 1.6, -r * 0.9 + Math.sin(t * 2) * 2, 2.4); g.fill();
  }
  function drawSunfish(g, c, t) {
    const sp = c.sp, L = sp.L, f = Math.sin(t * 2.2);
    g.fillStyle = '#7d8b98';
    g.beginPath(); g.moveTo(-L * 0.05, -L * 0.3); g.quadraticCurveTo(-L * 0.15 + f * 3, -L * 0.75, -L * 0.28 + f * 5, -L * 0.8); g.quadraticCurveTo(-L * 0.24, -L * 0.45, -L * 0.3, -L * 0.25); g.fill();
    g.beginPath(); g.moveTo(-L * 0.05, L * 0.3); g.quadraticCurveTo(-L * 0.15 - f * 3, L * 0.75, -L * 0.28 - f * 5, L * 0.8); g.quadraticCurveTo(-L * 0.24, L * 0.45, -L * 0.3, L * 0.25); g.fill();
    g.fillStyle = cg(sp, 'g', g, gg => vgrad(gg, -L * 0.36, L * 0.36, [[0, '#6c7a88'], [0.5, '#a3b0bb'], [1, '#d7dee4']]));
    g.beginPath(); g.moveTo(L * 0.42, -L * 0.02); g.quadraticCurveTo(L * 0.35, -L * 0.36, 0, -L * 0.37); g.quadraticCurveTo(-L * 0.3, -L * 0.36, -L * 0.38, -L * 0.18);
    for (let i = 0; i <= 6; i++) { const y = -L * 0.18 + i * L * 0.06; g.quadraticCurveTo(-L * 0.45, y + L * 0.03, -L * 0.38, y + L * 0.06); }
    g.quadraticCurveTo(-L * 0.3, L * 0.36, 0, L * 0.37); g.quadraticCurveTo(L * 0.35, L * 0.36, L * 0.42, -L * 0.02); g.fill();
    g.fillStyle = 'rgba(255,255,255,.13)'; for (let i = 0; i < 7; i++) { circ(g, -L * 0.1 + (i % 4) * L * 0.1, -L * 0.15 + Math.floor(i / 4) * L * 0.18, L * 0.025); g.fill(); }
    g.fillStyle = '#8a97a3'; ell(g, L * 0.12, L * 0.03, L * 0.05, L * 0.03, -0.4 + f * 0.3); g.fill();
    g.fillStyle = '#3b4652'; ell(g, L * 0.41, L * 0.01, 2, 1.4); g.fill();
    eye(g, L * 0.27, -L * 0.07, 2.8, true);
  }
  function drawStar(g, c, t) {
    const r = c.sp.L / 2, rot = c.ph * 0.3;
    g.save(); g.rotate(rot); g.fillStyle = c.sp.col;
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.75; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath();
    g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = c.sp.col; g.stroke(); g.fill();
    g.fillStyle = 'rgba(255,240,220,.6)'; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; for (let k = 1; k < 3; k++) { circ(g, Math.cos(a) * r * 0.3 * k, Math.sin(a) * r * 0.22 * k, 0.9); g.fill(); } }
    g.restore();
  }
  function drawUrchin(g, c, t) {
    const r = c.sp.L / 2;
    g.strokeStyle = '#2a1238'; g.lineWidth = 1.1;
    for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 17) * Math.PI + Math.sin(t + i) * 0.05; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); g.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); g.stroke(); }
    g.fillStyle = '#4a2463'; g.beginPath(); g.ellipse(0, 0, r * 0.7, r * 0.6, 0, Math.PI, TAU); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.15)'; ell(g, -r * 0.2, -r * 0.35, r * 0.25, r * 0.12); g.fill();
  }
  function drawCrab(g, c, t) {
    const r = c.sp.L / 2, w = Math.sin(t * 5);
    g.strokeStyle = '#e9e1d2'; g.lineWidth = 1.6; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.4, 0); g.lineTo(s * r * (0.9 + i * 0.12), -r * 0.1 + w * s * 1.5 * (i % 2 ? 1 : -1)); g.lineTo(s * r * (1.1 + i * 0.12), r * 0.55); g.stroke(); }
    for (const s of [-1, 1]) { g.lineWidth = 3; g.beginPath(); g.moveTo(s * r * 0.5, -r * 0.2); g.lineTo(s * r * 1.1, -r * 0.7 + Math.sin(t * 1.5 + s) * 2); g.stroke();
      g.strokeStyle = 'rgba(245,240,230,.7)'; g.lineWidth = 0.7; for (let k = 0; k < 8; k++) { const px = lerp(s * r * 0.5, s * r * 1.1, k / 7), py = lerp(-r * 0.2, -r * 0.7, k / 7); g.beginPath(); g.moveTo(px, py); g.lineTo(px + s * 1.5, py - 3.5); g.stroke(); } g.strokeStyle = '#e9e1d2'; }
    g.fillStyle = '#f1ebdf'; ell(g, 0, -r * 0.1, r * 0.55, r * 0.38); g.fill();
    g.fillStyle = 'rgba(180,170,150,.5)'; ell(g, 0, 0, r * 0.4, r * 0.14); g.fill();
    g.fillStyle = '#222'; circ(g, -r * 0.15, -r * 0.42, 1); g.fill(); circ(g, r * 0.15, -r * 0.42, 1); g.fill();
  }
  function drawShrimp(g, c, t) {
    const L = c.sp.L, w = Math.sin(t * 9) * 0.15;
    g.fillStyle = '#f3d6cf';
    for (let i = 0; i < 5; i++) { const x = L * 0.35 - i * L * 0.17; ell(g, x, i * 0.6 + (i > 2 ? (i - 2) * 1.2 : 0), L * 0.12, L * 0.11 - i * 0.3, w * i); g.fill(); }
    g.beginPath(); g.moveTo(-L * 0.42, L * 0.15); g.lineTo(-L * 0.62, L * 0.02); g.lineTo(-L * 0.6, L * 0.3); g.fill();
    g.fillStyle = 'rgba(255,170,120,.55)'; ell(g, L * 0.2, -L * 0.04, L * 0.1, L * 0.05); g.fill();
    g.strokeStyle = 'rgba(243,214,207,.8)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(L * 0.45, 0); g.quadraticCurveTo(L * 0.8, -L * 0.3, L * 1.0, -L * 0.1 + w * 3); g.stroke();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(L * (0.3 - i * 0.12), L * 0.08); g.lineTo(L * (0.28 - i * 0.12) + Math.sin(t * 12 + i) * 1.2, L * 0.28); g.stroke(); }
  }
  function drawSnail(g, c, t) {
    const r = c.sp.L / 2;
    g.fillStyle = '#20232a'; ell(g, 0, r * 0.35, r * 1.1, r * 0.3); g.fill();
    g.fillStyle = '#3a3f4a'; for (let i = 0; i < 6; i++) { circ(g, -r * 0.8 + i * r * 0.32, r * 0.42, r * 0.14); g.fill(); }
    g.fillStyle = cg(c.sp, 'g', g, gg => { const gr = gg.createRadialGradient(-r * 0.2, -r * 0.3, 1, 0, 0, r); gr.addColorStop(0, '#8d7a5c'); gr.addColorStop(1, '#3d342a'); return gr; });
    circ(g, 0, 0, r * 0.8); g.fill();
    g.strokeStyle = 'rgba(20,16,12,.6)'; g.lineWidth = 0.9; g.beginPath(); for (let a = 0; a < 9; a += 0.3) { const rr = r * 0.75 * (1 - a / 10); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  }
  function drawTubeworms(g, c, t) {
    const n = 7, h = c.sp.L;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 5 + Math.sin(i * 2.3) * 2, hh = h * (0.55 + ((i * 37) % 10) / 22), sw = Math.sin(t * 1.3 + i) * 3;
      g.fillStyle = '#e9e4da'; g.beginPath(); g.moveTo(x - 2.2, 0); g.quadraticCurveTo(x - 2 + sw * 0.3, -hh * 0.5, x - 1.6 + sw, -hh); g.lineTo(x + 1.6 + sw, -hh); g.quadraticCurveTo(x + 2 + sw * 0.3, -hh * 0.5, x + 2.2, 0); g.fill();
      g.fillStyle = '#d71f3a'; ell(g, x + sw, -hh - 4, 3.6, 5.2 + Math.sin(t * 2 + i) * 0.6); g.fill();
      g.fillStyle = 'rgba(255,140,150,.5)'; ell(g, x + sw - 1, -hh - 6, 1.4, 2.2); g.fill();
    }
  }

  /* ======================= species catalogue (37) ======================= */
  const KELP_PTS = [];
  const SPECIES = [
    // ---- zone 0: reef
    { id: 'clown', z: 0, area: 'reef', beh: 'hover', anchor: 'anemone', n: 4, L: 22, spd: 26, draw: fish({ L: 22, H: 12, top: '#ff6f10', bot: '#ffa04a', finC: '#ff7a1a', tail: 'round', dorsal: 0.4, marks(g, hl, hh) { const b = (x, w) => { g.fillStyle = '#16120f'; g.fillRect(x - w / 2 - 0.9, -hh, w + 1.8, hh * 2); g.fillStyle = '#fff'; g.fillRect(x - w / 2, -hh, w, hh * 2); }; b(hl * 0.42, hl * 0.2); b(-hl * 0.08, hl * 0.26); b(-hl * 0.65, hl * 0.14); } }),
      name: L4('Clownfisch', 'Clownfish', 'Рыба-клоун', 'Риба-клоун'),
      fact: L4('Eine Schleimschicht schützt ihn vor den Nesseln seiner Seeanemone – dort ist er sicher vor Feinden.', 'A layer of mucus protects it from the stinging tentacles of its sea anemone, where it hides from predators.', 'Слой слизи защищает её от стрекательных щупалец актинии, среди которых она прячется от хищников.', 'Шар слизу захищає її від жалких щупалець актинії, серед яких вона ховається від хижаків.') },
    { id: 'tang', z: 0, area: 'reef', beh: 'school', n: 9, L: 24, spd: 55, draw: fish({ L: 24, H: 15, top: '#1d4fcf', mid: '#2f6be6', bot: '#4b86f0', tailC: '#ffd23f', finC: '#1a3e9e', dorsal: 0.35, marks(g, hl, hh) { g.fillStyle = '#0b1630'; g.beginPath(); g.moveTo(hl * 0.5, -hh * 0.6); g.quadraticCurveTo(-hl * 0.1, -hh * 0.15, -hl * 0.86, -hh * 0.42); g.quadraticCurveTo(-hl * 0.3, hh * 0.5, hl * 0.12, -hh * 0.02); g.quadraticCurveTo(hl * 0.3, -hh * 0.62, hl * 0.5, -hh * 0.6); g.fill(); } }),
      name: L4('Paletten-Doktorfisch', 'Blue tang', 'Голубой хирург', 'Блакитний хірург'),
      fact: L4('An der Schwanzwurzel trägt er einen skalpellscharfen Dorn – daher der Name „Doktorfisch“.', 'It has a scalpel-sharp spine at the base of its tail, which gave surgeonfish their name.', 'У основания хвоста у него острый, как скальпель, шип — отсюда название «рыба-хирург».', 'Біля основи хвоста в нього гострий, як скальпель, шип — звідси назва «риба-хірург».') },
    { id: 'turtle', z: 0, area: 'reef', beh: 'cruise', n: 2, L: 64, spd: 30, draw: drawTurtle,
      name: L4('Grüne Meeresschildkröte', 'Green sea turtle', 'Зелёная черепаха', 'Зелена черепаха'),
      fact: L4('Erwachsene fressen vor allem Seegras und Algen. Der Name kommt von ihrem grünlichen Körperfett.', 'Adults eat mostly seagrass and algae. Its name comes from the greenish colour of its body fat.', 'Взрослые едят в основном морскую траву и водоросли. Название дано за зеленоватый цвет жира.', 'Дорослі їдять переважно морську траву й водорості. Назва — через зеленуватий колір жиру.') },
    { id: 'parrot', z: 0, area: 'reef', beh: 'cruise', n: 2, L: 40, spd: 40, draw: fish({ L: 40, H: 19, top: '#0f9e93', mid: '#2cc2ad', bot: '#9ff0d2', tailC: '#e86fa0', finC: '#e86fa0', dorsal: 0.25, marks(g, hl, hh) { g.fillStyle = 'rgba(255,140,190,.55)'; for (let i = 0; i < 4; i++) { ell(g, hl * (0.3 - i * 0.35), -hh * 0.1, hl * 0.08, hh * 0.9); g.fill(); } g.strokeStyle = 'rgba(0,60,60,.18)'; g.lineWidth = 0.8; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(hl * (0.4 - i * 0.2), 0, hh * 0.7, -0.9, 0.9); g.stroke(); } },
      extra(g, hl, hh) { g.fillStyle = '#d8f3ec'; g.beginPath(); g.moveTo(hl * 0.86, -hh * 0.3); g.quadraticCurveTo(hl * 1.08, 0, hl * 0.86, hh * 0.3); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,80,70,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(hl * 0.9, 0); g.lineTo(hl * 1.0, 0); g.stroke(); } }),
      name: L4('Papageifisch', 'Parrotfish', 'Рыба-попугай', 'Риба-папуга'),
      fact: L4('Mit seinem schnabelartigen Gebiss raspelt er Algen von Korallen – sein Kot wird zu feinem weißem Sand.', 'It scrapes algae off coral with its beak-like teeth, and its droppings turn into fine white sand.', 'Клювовидными зубами она соскребает водоросли с кораллов, а её помёт превращается в белый песок.', 'Дзьобоподібними зубами вона зіскрібає водорості з коралів, а її послід перетворюється на білий пісок.') },
    { id: 'butterfly', z: 0, area: 'reef', beh: 'hover', n: 2, L: 20, spd: 30, draw: fish({ L: 20, H: 17, top: '#ffd000', bot: '#fff07a', finC: '#ffc300', tail: 'round', dorsal: 0.45, marks(g, hl, hh) { g.fillStyle = '#16120f'; g.fillRect(hl * 0.44, -hh, hl * 0.2, hh * 2); g.fillStyle = '#fff'; g.fillRect(hl * 0.2, -hh, hl * 0.22, hh * 2); g.fillStyle = '#16120f'; circ(g, -hl * 0.55, -hh * 0.35, hh * 0.22); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); } }),
      name: L4('Falterfisch', 'Butterflyfish', 'Рыба-бабочка', 'Риба-метелик'),
      fact: L4('Viele Falterfische leben in festen Paaren. Bei manchen Arten verwirrt ein Augenfleck am Schwanz die Räuber.', 'Many butterflyfish live in long-term pairs. In some species an eyespot near the tail confuses predators.', 'Многие рыбы-бабочки живут постоянными парами. У некоторых видов ложный «глаз» у хвоста сбивает хищников с толку.', 'Багато риб-метеликів живуть постійними парами. У деяких видів несправжнє «око» біля хвоста збиває хижаків з пантелику.') },
    { id: 'lionfish', z: 0, area: 'reef', beh: 'hover', n: 1, L: 34, spd: 18, draw: fish({ L: 34, H: 15, top: '#b8392f', bot: '#f2c2ae', finC: 'rgba(200,70,60,.5)', tail: 'round', marks(g, hl, hh) { g.fillStyle = 'rgba(255,245,235,.85)'; for (let i = 0; i < 7; i++) { g.fillRect(hl * (0.75 - i * 0.26), -hh, hl * 0.08, hh * 2); } },
      extra(g, hl, hh, t) { g.strokeStyle = 'rgba(190,60,50,.85)'; g.lineWidth = 0.9; for (let i = 0; i < 9; i++) { const x = hl * (0.4 - i * 0.12), a = -1.25 - i * 0.07 + Math.sin(t * 2 + i) * 0.05; g.beginPath(); g.moveTo(x, -hh * 0.75); g.lineTo(x + Math.cos(a) * hh * 1.9, -hh * 0.75 + Math.sin(a) * hh * 1.9); g.stroke(); }
        g.fillStyle = 'rgba(230,140,120,.45)'; g.beginPath(); g.moveTo(hl * 0.25, hh * 0.2); for (let i = 0; i <= 6; i++) { const a = 1.0 + i * 0.25 + Math.sin(t * 1.5) * 0.08; g.lineTo(hl * 0.25 + Math.cos(a) * hh * 2.1 - hh, hh * 0.2 + Math.sin(a) * hh * 1.8); } g.closePath(); g.fill(); } }),
      name: L4('Rotfeuerfisch', 'Lionfish', 'Крылатка', 'Крилатка'),
      fact: L4('Seine giftigen Flossenstrahlen dienen nur der Verteidigung. In der Karibik ist er eine eingeschleppte Art.', 'Its venomous spines are only for defence. In the Caribbean it is an invasive species.', 'Ядовитые лучи плавников служат только для защиты. В Карибском море это инвазивный вид.', 'Отруйні промені плавців служать лише для захисту. У Карибському морі це інвазивний вид.') },
    { id: 'star', z: 0, area: 'reef', beh: 'crawl', n: 3, L: 18, spd: 2, col: '#ff6847', orient: false, draw: drawStar,
      name: L4('Seestern', 'Sea star', 'Морская звезда', 'Морська зірка'),
      fact: L4('Seesterne können verlorene Arme nachwachsen lassen und haben an jeder Armspitze ein einfaches Auge.', 'Sea stars can regrow lost arms and have a simple eye at the tip of each arm.', 'Морские звёзды отращивают потерянные лучи, а на кончике каждого луча у них есть простой глаз.', 'Морські зірки відрощують втрачені промені, а на кінчику кожного променя мають просте око.') },
    { id: 'octopus', z: 0, area: 'reef', beh: 'hover', n: 1, L: 34, spd: 16, variant: 'common', col: '#d9734e', orient: false, draw: drawOcto,
      name: L4('Gewöhnlicher Krake', 'Common octopus', 'Обыкновенный осьминог', 'Звичайний восьминіг'),
      fact: L4('Er hat drei Herzen, blaues Blut und kann in Sekundenbruchteilen Farbe und Muster wechseln.', 'It has three hearts and blue blood, and can change colour and pattern in a split second.', 'У него три сердца и голубая кровь, а цвет и узор он меняет за доли секунды.', 'У нього три серця й блакитна кров, а колір і візерунок він змінює за частки секунди.') },
    { id: 'moray', z: 0, area: 'reef', beh: 'lurk', n: 1, L: 60, spd: 0, orient: false, draw: drawEel,
      name: L4('Muräne', 'Moray eel', 'Мурена', 'Мурена'),
      fact: L4('Im Rachen sitzt ein zweites Kiefernpaar, das die Beute nach innen zieht.', 'A second set of jaws in its throat pulls prey down inside.', 'В глотке у неё вторые челюсти, которые затягивают добычу внутрь.', 'У глотці в неї другі щелепи, що затягують здобич усередину.') },
    { id: 'seahorse', z: 0, area: 'reef', beh: 'hover', n: 2, L: 26, spd: 8, col: '#f2b33d', col2: '#ffd98a', orient: false, draw: drawSeahorse,
      name: L4('Seepferdchen', 'Seahorse', 'Морской конёк', 'Морський коник'),
      fact: L4('Beim Seepferdchen trägt das Männchen die Eier in einer Bruttasche und bringt die Jungen zur Welt.', 'In seahorses the male carries the eggs in a brood pouch and gives birth to the young.', 'У морских коньков икру вынашивает самец в выводковой сумке и сам «рожает» мальков.', 'У морських коників ікру виношує самець у виводковій сумці й сам «народжує» мальків.') },
    // ---- zone 1: kelp
    { id: 'otter', z: 1, area: 'kelp', beh: 'surface', n: 2, L: 48, spd: 10, orient: false, draw: drawOtter,
      name: L4('Seeotter', 'Sea otter', 'Калан', 'Калан'),
      fact: L4('Kein Tier hat ein dichteres Fell: bis zu 150 000 Haare pro cm². Muscheln knackt er mit Steinen.', 'No animal has denser fur: up to 150,000 hairs per cm². It uses stones as tools to crack shells.', 'Ни у кого нет меха гуще: до 150 000 волосков на см². Раковины калан разбивает камнями.', 'Ні в кого немає густішого хутра: до 150 000 волосин на см². Мушлі калан розбиває камінням.') },
    { id: 'seal', z: 1, area: 'kelp', beh: 'cruise', n: 1, L: 72, spd: 95, draw: drawSeal,
      name: L4('Seehund', 'Harbour seal', 'Обыкновенный тюлень', 'Звичайний тюлень'),
      fact: L4('Seehunde können rund 30 Minuten tauchen und verlangsamen dabei ihren Herzschlag stark.', 'Harbour seals can dive for about 30 minutes, slowing their heartbeat dramatically.', 'Тюлени могут нырять примерно на 30 минут, сильно замедляя сердцебиение.', 'Тюлені можуть пірнати приблизно на 30 хвилин, сильно сповільнюючи серцебиття.') },
    { id: 'garibaldi', z: 1, area: 'kelp', beh: 'cruise', n: 2, L: 26, spd: 34, draw: fish({ L: 26, H: 15, top: '#ff5e00', bot: '#ffa245', finC: '#ff6a00', tail: 'round', dorsal: 0.35 }),
      name: L4('Garibaldi', 'Garibaldi', 'Гарибальди', 'Гарібальді'),
      fact: L4('Der leuchtend orange Fisch ist der Staatsfisch Kaliforniens. Männchen pflegen ein Nest aus Rotalgen.', 'This bright orange fish is California’s state marine fish. Males tend a nest of red algae.', 'Эта ярко-оранжевая рыба — морской символ Калифорнии. Самцы ухаживают за гнездом из красных водорослей.', 'Ця яскраво-помаранчева риба — морський символ Каліфорнії. Самці доглядають гніздо з червоних водоростей.') },
    { id: 'seadragon', z: 1, area: 'kelp', beh: 'hover', n: 1, L: 40, spd: 7, col: '#d9a441', col2: '#f0cf7a', leafy: true, orient: false, draw: drawSeahorse,
      name: L4('Großer Fetzenfisch', 'Leafy seadragon', 'Листовой морской дракон', 'Листяний морський дракон'),
      fact: L4('Seine blattartigen Anhänge dienen nur der Tarnung – er schwimmt mit winzigen, durchsichtigen Flossen.', 'Its leaf-like appendages are pure camouflage; it swims with tiny transparent fins.', 'Листовидные выросты — только маскировка: плавает он крошечными прозрачными плавниками.', 'Листоподібні вирости — лише маскування: плаває він крихітними прозорими плавцями.') },
    { id: 'urchin', z: 1, area: 'kelp', beh: 'crawl', n: 4, L: 14, spd: 1, orient: false, draw: drawUrchin,
      name: L4('Seeigel', 'Sea urchin', 'Морской ёж', 'Морський їжак'),
      fact: L4('Fehlen Fressfeinde wie Seeotter, können Seeigel ganze Kelpwälder kahl fressen.', 'Without predators such as sea otters, sea urchins can graze entire kelp forests bare.', 'Без хищников вроде каланов морские ежи могут объесть целые леса ламинарии.', 'Без хижаків на кшталт каланів морські їжаки можуть об’їсти цілі ліси ламінарії.') },
    { id: 'sardine', z: 1, area: 'kelp', beh: 'school', n: 24, L: 14, spd: 70, draw: fish({ L: 14, H: 5, top: '#3d6a8c', mid: '#b5cbd9', bot: '#f0f5f8', tailC: '#6f8fa8', dorsal: 0.2, wag: 14 }),
      name: L4('Sardine', 'Sardine', 'Сардина', 'Сардина'),
      fact: L4('Sardinen bilden riesige Schwärme, die sich wie ein einziges Tier bewegen und Räuber verwirren.', 'Sardines form huge schools that move like a single animal to confuse predators.', 'Сардины собираются в огромные косяки, движущиеся как единое целое, чтобы запутать хищников.', 'Сардини збираються у величезні зграї, що рухаються як одне ціле, аби заплутати хижаків.') },
    { id: 'jelly', z: 1, area: 'kelpopen', beh: 'drift', n: 7, L: 26, spd: 10, variant: 'moon', orient: false, haz: 9, draw: drawJelly, glows: [[0, -6, 16, 'white', 0.35]],
      name: L4('Ohrenqualle', 'Moon jellyfish', 'Аурелия', 'Аурелія'),
      fact: L4('Ohrenquallen haben weder Gehirn noch Herz noch Knochen und bestehen zu etwa 95 % aus Wasser.', 'Moon jellies have no brain, heart or bones and are about 95 % water.', 'У аурелии нет ни мозга, ни сердца, ни костей; она примерно на 95 % состоит из воды.', 'Аурелія не має ні мозку, ні серця, ні кісток і приблизно на 95 % складається з води.') },
    // ---- zone 2: open blue
    { id: 'dolphin', z: 2, area: 'open', beh: 'school', n: 3, L: 82, spd: 130, draw: drawDolphin, sep: 70,
      name: L4('Großer Tümmler', 'Bottlenose dolphin', 'Афалина', 'Афаліна'),
      fact: L4('Jeder Delfin hat einen eigenen Erkennungspfiff – fast wie einen Namen.', 'Every dolphin has its own signature whistle – almost like a name.', 'У каждого дельфина есть собственный свист-«подпись» — почти как имя.', 'Кожен дельфін має власний свист-«підпис» — майже як ім’я.') },
    { id: 'manta', z: 2, area: 'open', beh: 'cruise', n: 1, L: 130, spd: 34, draw: drawManta, layer: 0,
      name: L4('Mantarochen', 'Manta ray', 'Манта', 'Манта'),
      fact: L4('Mit bis zu 7 m Spannweite gehört er zu den größten Fischen – und frisst doch nur Plankton.', 'With a wingspan of up to 7 m it is one of the largest fish – yet it feeds only on plankton.', 'С размахом «крыльев» до 7 м это одна из крупнейших рыб — и питается она лишь планктоном.', 'З розмахом «крил» до 7 м це одна з найбільших риб — і живиться вона лише планктоном.') },
    { id: 'whale', z: 2, area: 'open', beh: 'cruise', n: 1, L: 340, spd: 32, draw: drawWhale, layer: 0, big: true, maxPitch: 0.15,
      name: L4('Buckelwal', 'Humpback whale', 'Горбатый кит', 'Горбатий кит'),
      fact: L4('Männchen singen komplexe Lieder, die bis zu 20 Minuten dauern und kilometerweit zu hören sind.', 'Males sing complex songs that last up to 20 minutes and carry for many kilometres.', 'Самцы поют сложные песни длиной до 20 минут, слышные за много километров.', 'Самці співають складні пісні тривалістю до 20 хвилин, які чути за багато кілометрів.') },
    { id: 'shark', z: 2, area: 'open', beh: 'cruise', n: 2, L: 112, spd: 62, draw: drawShark, bump: 8,
      name: L4('Blauhai', 'Blue shark', 'Синяя акула', 'Блакитна акула'),
      fact: L4('Blauhaie wandern Tausende Kilometer durch die Ozeane. Für Menschen sind sie selten gefährlich.', 'Blue sharks migrate thousands of kilometres across oceans and rarely pose a danger to people.', 'Синие акулы мигрируют на тысячи километров и редко опасны для человека.', 'Блакитні акули мігрують на тисячі кілометрів і рідко становлять небезпеку для людей.') },
    { id: 'tuna', z: 2, area: 'open', beh: 'school', n: 8, L: 56, spd: 115, sep: 40, draw: fish({ L: 56, H: 18, top: '#132a5c', mid: '#5577a3', bot: '#e5edf4', tailC: '#132a5c', finC: '#24407a', tail: 'lunate', dorsal: 0.4, wag: 11, extra(g, hl, hh) { g.fillStyle = '#ffd54a'; for (let i = 0; i < 5; i++) { const x = -hl * (0.45 + i * 0.08); g.beginPath(); g.moveTo(x, -hh * 0.45 + i * 0.6); g.lineTo(x - 2, -hh * 0.75 + i * 0.6); g.lineTo(x - 3.5, -hh * 0.4 + i * 0.6); g.fill(); g.beginPath(); g.moveTo(x, hh * 0.45 - i * 0.6); g.lineTo(x - 2, hh * 0.75 - i * 0.6); g.lineTo(x - 3.5, hh * 0.4 - i * 0.6); g.fill(); } } }),
      name: L4('Roter Thun', 'Atlantic bluefin tuna', 'Голубой тунец', 'Блакитний тунець'),
      fact: L4('Er hält seinen Körper wärmer als das Wasser und erreicht Spitzengeschwindigkeiten von über 60 km/h.', 'It keeps its body warmer than the water and can reach bursts of over 60 km/h.', 'Он поддерживает температуру тела выше, чем у воды, и развивает скорость свыше 60 км/ч.', 'Він підтримує температуру тіла вищу, ніж у води, і розвиває швидкість понад 60 км/год.') },
    { id: 'sunfish', z: 2, area: 'open', beh: 'cruise', n: 1, L: 84, spd: 20, draw: drawSunfish, maxPitch: 0.2,
      name: L4('Mondfisch', 'Ocean sunfish', 'Рыба-луна', 'Риба-місяць'),
      fact: L4('Der schwerste Knochenfisch der Welt kann über 2 Tonnen wiegen und sonnt sich gern an der Oberfläche.', 'The world’s heaviest bony fish can weigh over 2 tonnes and likes to bask at the surface.', 'Самая тяжёлая костная рыба весит более 2 тонн и любит греться у поверхности.', 'Найважча кісткова риба важить понад 2 тонни й любить грітися біля поверхні.') },
    // ---- zone 3: twilight
    { id: 'lantern', z: 3, area: 'twi', beh: 'school', n: 16, L: 17, spd: 48, draw: fish({ L: 17, H: 6, top: '#1b2030', mid: '#3d4659', bot: '#7d8799', tailC: '#222838', dorsal: 0.2, eye: 2.1, wag: 13 }),
      glows: [[2, 2.6, 3, 'cyan', 1], [-1, 2.8, 3, 'cyan', 1], [-4, 2.6, 3, 'cyan', 1], [5, 1.5, 3.4, 'cyan', 1], [0, 0, 11, 'cyan', 0.3]],
      name: L4('Laternenfisch', 'Lanternfish', 'Светящийся анчоус', 'Світний анчоус'),
      fact: L4('Laternenfische steigen jede Nacht nach oben – Teil der größten täglichen Wanderung der Erde.', 'Lanternfish rise towards the surface every night – part of the largest daily migration on Earth.', 'Каждую ночь светящиеся анчоусы поднимаются к поверхности — это крупнейшая суточная миграция на Земле.', 'Щоночі світні анчоуси піднімаються до поверхні — це наймасштабніша добова міграція на Землі.') },
    { id: 'hatchet', z: 3, area: 'twi', beh: 'hover', n: 4, L: 18, spd: 14, draw: fish({ L: 18, H: 16, top: '#7d8a99', mid: '#d5dee7', bot: '#f5f9fc', tailC: '#a9b5c2', tail: 'fork', eye: 2.6, marks(g, hl, hh) { g.fillStyle = 'rgba(40,55,70,.35)'; g.fillRect(-hl, -hh, hl * 2, hh * 0.35); } }),
      glows: [[3, 6, 3.4, 'blue', 1], [-1, 6.4, 3.4, 'blue', 1], [-5, 5, 3, 'blue', 1], [0, 2, 12, 'blue', 0.28]],
      name: L4('Tiefsee-Beilfisch', 'Hatchetfish', 'Рыба-топорик', 'Риба-сокирка'),
      fact: L4('Leuchtorgane am Bauch imitieren das schwache Licht von oben – von unten ist er so fast unsichtbar.', 'Light organs on its belly mimic the faint light from above, making it almost invisible from below.', 'Светящиеся органы на брюхе имитируют слабый свет сверху, и снизу рыбу почти не видно.', 'Світні органи на череві імітують слабке світло згори, тож знизу рибу майже не видно.') },
    { id: 'squid', z: 3, area: 'twideep', beh: 'cruise', n: 1, L: 210, spd: 40, draw: drawSquid, layer: 0, big: true, maxPitch: 0.2,
      name: L4('Riesenkalmar', 'Giant squid', 'Гигантский кальмар', 'Гігантський кальмар'),
      fact: L4('Seine Augen werden bis zu 27 cm groß – sie gehören zu den größten im ganzen Tierreich.', 'Its eyes can be up to 27 cm across – among the largest in the animal kingdom.', 'Его глаза достигают 27 см в диаметре — одни из самых больших в животном мире.', 'Його очі сягають 27 см у діаметрі — одні з найбільших у тваринному світі.') },
    { id: 'comb', z: 3, area: 'twi', beh: 'drift', n: 5, L: 22, spd: 8, variant: 'comb', orient: false, draw: drawJelly, glows: [[0, 0, 14, 'pink', 0.45]],
      name: L4('Rippenqualle', 'Comb jelly', 'Гребневик', 'Реброплав'),
      fact: L4('Rippenquallen sind keine echten Quallen. Ihre schlagenden Wimpernreihen streuen das Licht in Regenbogenfarben.', 'Comb jellies are not true jellyfish. Their beating rows of cilia scatter light into rainbow colours.', 'Гребневики — не настоящие медузы. Ряды бьющихся ресничек разлагают свет в радугу.', 'Реброплави — не справжні медузи. Ряди війок, що б’ються, розкладають світло на веселку.') },
    { id: 'swordfish', z: 3, area: 'twi', beh: 'cruise', n: 1, L: 116, spd: 88, draw: fish({ L: 92, H: 22, top: '#26294d', mid: '#5a6286', bot: '#c8d0de', tailC: '#26294d', finC: '#2f335c', tail: 'lunate', dorsal: 1.0, wag: 8, extra(g, hl, hh) { g.fillStyle = '#3a3f66'; g.beginPath(); g.moveTo(hl * 0.92, -hh * 0.12); g.lineTo(hl * 1.55, 0); g.lineTo(hl * 0.92, hh * 0.08); g.fill(); } }),
      name: L4('Schwertfisch', 'Swordfish', 'Меч-рыба', 'Риба-меч'),
      fact: L4('Ein spezielles Organ wärmt Augen und Gehirn – so sieht er im kalten Tiefenwasser besser.', 'A special organ warms its eyes and brain, helping it see better in cold deep water.', 'Особый орган подогревает глаза и мозг, помогая лучше видеть в холодной глубине.', 'Особливий орган підігріває очі й мозок, допомагаючи краще бачити в холодній глибині.') },
    // ---- zone 4: trench
    { id: 'angler', z: 4, area: 'trench', beh: 'hover', n: 2, L: 32, spd: 10, orient: false, draw: drawAngler, glows: [[21.5, -10.5, 18, 'teal', 1]], lureGlow: true,
      name: L4('Tiefsee-Anglerfisch', 'Anglerfish', 'Удильщик', 'Вудильник'),
      fact: L4('Die leuchtende Angel auf ihrem Kopf enthält Bakterien, die Licht erzeugen.', 'The glowing lure on its head contains bacteria that produce light.', 'Светящаяся «удочка» на голове содержит бактерии, которые излучают свет.', 'Світна «вудка» на голові містить бактерії, що випромінюють світло.') },
    { id: 'dumbo', z: 4, area: 'trench', beh: 'hover', n: 2, L: 30, spd: 12, variant: 'dumbo', col: '#f29db0', orient: false, draw: drawOcto,
      name: L4('Dumbo-Oktopus', 'Dumbo octopus', 'Осьминог Дамбо', 'Восьминіг Дамбо'),
      fact: L4('Er lebt tiefer als jeder andere bekannte Krake – bis in rund 7000 m Tiefe.', 'It lives deeper than any other known octopus – down to about 7,000 m.', 'Он живёт глубже всех известных осьминогов — почти до 7000 м.', 'Він живе глибше за всіх відомих восьминогів — майже до 7000 м.') },
    { id: 'gulper', z: 4, area: 'trench', beh: 'cruise', n: 1, L: 96, spd: 28, variant: 'gulper', draw: drawEel, glows: [[-92, 0, 7, 'pink', 1]],
      name: L4('Pelikanaal', 'Gulper eel', 'Мешкорот', 'Мішкорот'),
      fact: L4('Sein riesiges Maul kann Beute verschlucken, die größer ist als er selbst. Die Schwanzspitze leuchtet.', 'Its enormous mouth can swallow prey larger than itself, and the tip of its tail glows.', 'Огромная пасть может проглотить добычу крупнее его самого, а кончик хвоста светится.', 'Величезна паща може проковтнути здобич, більшу за нього самого, а кінчик хвоста світиться.') },
    { id: 'vampire', z: 4, area: 'trench', beh: 'hover', n: 2, L: 28, spd: 12, variant: 'vampire', col: '#6b1426', orient: false, draw: drawOcto, glows: [[-10, 14, 4, 'blue', 1], [10, 14, 4, 'blue', 1], [0, -16, 4, 'blue', 0.8]],
      name: L4('Vampirtintenfisch', 'Vampire squid', 'Адский вампир', 'Пекельний вампір'),
      fact: L4('Trotz des Namens frisst er „Meeresschnee“ – herabrieselnde Reste von abgestorbenem Leben.', 'Despite its name it feeds on “marine snow” – drifting bits of dead organic matter.', 'Несмотря на название, он питается «морским снегом» — оседающими остатками органики.', 'Попри назву, він живиться «морським снігом» — рештками органіки, що осідають.') },
    { id: 'atolla', z: 4, area: 'trench', beh: 'drift', n: 3, L: 26, spd: 8, variant: 'atolla', orient: false, haz: 12, draw: drawJelly, alarm: true,
      glows: [[-11, -2, 4, 'blue', 1], [-6, -10, 4, 'blue', 1], [0, -12, 4, 'blue', 1], [6, -10, 4, 'blue', 1], [11, -2, 4, 'blue', 1], [0, -5, 18, 'blue', 0.5]],
      name: L4('Atolla-Qualle', 'Atolla jellyfish', 'Медуза атолла', 'Медуза атола'),
      fact: L4('Bei Gefahr blinkt ein Ring aus blauem Licht – eine „Alarmanlage“, die größere Räuber anlockt.', 'When attacked it flashes a ring of blue light – a “burglar alarm” that lures bigger predators.', 'При нападении она вспыхивает кольцом синего света — «сигнализацией», привлекающей крупных хищников.', 'Під час нападу вона спалахує кільцем синього світла — «сигналізацією», що приваблює більших хижаків.') },
    // ---- zone 5: vents
    { id: 'tubeworm', z: 5, area: 'vent', beh: 'static', n: 4, L: 34, spd: 0, orient: false, draw: drawTubeworms,
      name: L4('Riesenröhrenwurm', 'Giant tube worm', 'Рифтия', 'Рифтія'),
      fact: L4('Er hat weder Mund noch Darm: Bakterien in seinem Körper machen aus Schlotchemikalien Nahrung.', 'It has no mouth or gut: bacteria inside its body turn chemicals from the vents into food.', 'У рифтии нет ни рта, ни кишечника: бактерии внутри превращают химические вещества источников в пищу.', 'У рифтії немає ні рота, ні кишечника: бактерії всередині перетворюють хімічні речовини джерел на їжу.') },
    { id: 'yeti', z: 5, area: 'vent', beh: 'crawl', n: 3, L: 22, spd: 6, orient: false, draw: drawCrab,
      name: L4('Yeti-Krabbe', 'Yeti crab', 'Краб-йети', 'Краб-єті'),
      fact: L4('Sie züchtet Bakterien auf ihren haarigen Scheren und fächelt ihnen mineralreiches Wasser zu.', 'It farms bacteria on its hairy claws and waves them in the mineral-rich water to feed them.', 'Он выращивает бактерии на волосатых клешнях и обмахивает их богатой минералами водой.', 'Він вирощує бактерії на волохатих клешнях і обмахує їх багатою на мінерали водою.') },
    { id: 'shrimp', z: 5, area: 'ventwater', beh: 'school', n: 14, L: 12, spd: 26, sep: 12, draw: drawShrimp,
      name: L4('Schlotgarnele', 'Vent shrimp', 'Гидротермальная креветка', 'Гідротермальна креветка'),
      fact: L4('Sie hat keine normalen Augen, aber einen lichtempfindlichen Fleck auf dem Rücken – vermutlich für das Glühen der Schlote.', 'It has no normal eyes but a light-sensitive patch on its back, probably to sense the faint glow of the vents.', 'Обычных глаз у неё нет, зато на спине есть светочувствительное пятно — вероятно, для слабого свечения источников.', 'Звичайних очей у неї немає, зате на спині є світлочутлива пляма — імовірно, для слабкого світіння джерел.') },
    { id: 'snail', z: 5, area: 'vent', beh: 'crawl', n: 3, L: 12, spd: 1, orient: false, draw: drawSnail,
      name: L4('Schuppenfuß-Schnecke', 'Scaly-foot snail', 'Чешуеногая улитка', 'Лусконогий равлик'),
      fact: L4('Ihr Fuß ist mit Schuppen aus Eisensulfid bedeckt – eine natürliche Metallrüstung.', 'Its foot is covered in iron-sulfide scales – a natural suit of metal armour.', 'Её нога покрыта чешуйками из сульфида железа — природной металлической бронёй.', 'Його нога вкрита лусочками із сульфіду заліза — природною металевою бронею.') }
  ];
  const SPM = {}; SPECIES.forEach(s => { SPM[s.id] = s; });
  const AREAS = Object.assign({}, AREA, { kelpopen: [880, 2800, 420, 1300], twideep: [1560, 2800, 2200, 2840], ventwater: [1780, 2300, 4700, 4930] });

  /* ======================= UI strings ======================= */
  const STR = {
    de: {
      intro: 'Steuere das Forschungs-U-Boot Perle durch sechs Meereszonen: Sammle Plastikmüll und bring ihn zum Boot, befreie Tiere aus Geisternetzen und scanne Arten für deinen Katalog.',
      ctrl: 'Ziehen = steuern (Joystick) · Knopf = greifen / gedrückt halten zum Schneiden · Tastatur: Pfeile/WASD + Leertaste',
      dive: 'Abtauchen', resume: 'Weiter tauchen', welcome: 'Willkommen an Bord!', back: 'Willkommen zurück!',
      z0: 'Sonniges Korallenriff', z1: 'Kelpwald', z2: 'Offenes Blau', z3: 'Dämmerzone', z4: 'Tiefseegraben', z5: 'Hydrothermalquellen', zoneNew: 'Neue Zone entdeckt',
      battery: 'Akku', hull: 'Rumpf', credits: 'Credits', cargo: 'Ladung', grab: 'Greifen', cut: 'Halten', scan: 'Scan', full: 'Voll', sonar: 'Sonar',
      catalog: 'Artenkatalog', upgrades: 'Werft', goals: 'Logbuch', found: '{n} von {m} Arten entdeckt', all: 'Alle', unknown: 'Noch nicht entdeckt', where: 'Lebensraum',
      newSpecies: 'Neu im Katalog!', scanHint: 'Bleib 1,5 s nah an einem Tier, um es zu scannen.', cargoFull: 'Laderaum voll – bring den Müll zum Boot!',
      unload: 'Müll abgeliefert', netHint: 'Knopf gedrückt halten, um das Netz zu zerschneiden', freed: '{name} ist frei!', lowBat: 'Akku schwach – auftauchen oder Station anfahren!',
      pressure: 'Druckgrenze! Verbessere den Druckrumpf in der Werft.', station: 'Station: Akku lädt, Rumpf wird repariert', boat: 'Am Boot: aufgeladen und repariert',
      towTitle: 'Perle muss abgeschleppt werden', towBat: 'Der Akku ist leer.', towHull: 'Der Rumpf ist zu stark beschädigt.', towText: 'Noch nicht abgelieferter Müll sinkt zurück an seinen Fundort.',
      towAd: '▶ Reparieren & hier weiter', towAdSub: 'Anzeige ansehen – Spende an {p}', towBoat: 'Zum Boot schleppen',
      buy: 'Kaufen', max: 'MAX', lvl: 'Stufe {n}/3', need: 'Dir fehlen {n} Credits', installed: 'Upgrade installiert!',
      u_battery: 'Großer Akku', u_battery_d: 'Kapazität {a} → {b}', u_light: 'Starker Scheinwerfer', u_light_d: 'Lichtweite {a} → {b}',
      u_motor: 'Schneller Motor', u_motor_d: 'Tempo {a} → {b}', u_sonar: 'Sonar', u_sonar_d1: 'Ortet unentdeckte Arten in der Nähe', u_sonar_d2: 'Mehr Reichweite, zeigt auch Müll', u_sonar_d3: 'Maximale Reichweite, zeigt auch Geisternetze',
      u_hull: 'Druckrumpf', u_hull_d: 'Max. Tiefe {a} → {b} m', u_cargo: 'Laderaum', u_cargo_d: 'Plätze {a} → {b}',
      goalDone: 'Expeditionsziel erreicht!', bonus: '+{n} Credits Bonus', keepDiving: 'Weiter tauchen',
      g_clean15: 'Riff säubern: 15 Teile Müll abliefern', g_scan10: '10 Arten entdecken', g_free3: '3 Tiere aus Geisternetzen befreien', g_twilight: 'Die Dämmerzone erreichen',
      g_scan20: '20 Arten entdecken', g_clean40: '40 Teile Müll abliefern', g_trench: 'Den Tiefseegraben erreichen', g_free8: 'Alle 8 Tiere befreien', g_vents: 'Die Hydrothermalquellen erreichen', g_scanAll: 'Den kompletten Katalog füllen',
      stats: 'Abgeliefert: {d} · Befreit: {f}/8 · Tiefster Punkt: {m} m',
      whale: 'Ein Buckelwal! Bleib in seiner Nähe, um ihn zu scannen.', squid: 'Ein Riesenkalmar – kaum ein Mensch hat ihn je lebend gesehen!',
      sting: 'Autsch – Nesselqualle!', bump: 'Vorsicht, nicht anrempeln!', rock: 'Steinschlag!', repaired: 'Repariert – weiter geht’s!', paused: 'Pause', toBoat: 'Boot', toStation: 'Station',
      first: 'Sammle den Müll am Riff ein und bring ihn zum Boot.', done: 'Erledigt',
      rulesHtml: '<ul><li><b>Steuern:</b> irgendwo auf das Bild tippen und ziehen (Joystick) oder Pfeile/WASD.</li><li><b>Müll:</b> mit dem Greifer einsammeln (Knopf oder Leertaste) und zum Boot an der Oberfläche bringen. Jedes Teil bringt Credits.</li><li><b>Geisternetze:</b> Knopf gedrückt halten, bis das gefangene Tier frei ist.</li><li><b>Arten:</b> 1,5 Sekunden nah an einem Tier bleiben – es landet mit einem echten Fakt im Katalog.</li><li><b>Akku &amp; Rumpf:</b> Der Akku leert sich in der Tiefe schneller. An der Oberfläche, am Boot und an Stationen lädt er auf. Quallen, Haie und Steinschlag beschädigen den Rumpf.</li><li><b>Werft:</b> Mit Credits Akku, Licht, Motor, Sonar, Laderaum und Druckrumpf verbessern. Erst der Druckrumpf öffnet die tiefen Zonen.</li><li>Expeditionsziele im Logbuch bringen Sterne für das Partnerprojekt.</li></ul>'
    },
    en: {
      intro: 'Pilot the research sub Perle through six ocean zones: collect plastic litter and bring it to the boat, free animals from ghost nets and scan species for your catalogue.',
      ctrl: 'Drag = steer (joystick) · Button = grab / hold to cut · Keyboard: arrows/WASD + Space',
      dive: 'Dive', resume: 'Keep diving', welcome: 'Welcome aboard!', back: 'Welcome back!',
      z0: 'Sunny coral reef', z1: 'Kelp forest', z2: 'Open blue', z3: 'Twilight zone', z4: 'Deep-sea trench', z5: 'Hydrothermal vents', zoneNew: 'New zone discovered',
      battery: 'Battery', hull: 'Hull', credits: 'Credits', cargo: 'Cargo', grab: 'Grab', cut: 'Hold', scan: 'Scan', full: 'Full', sonar: 'Sonar',
      catalog: 'Species catalogue', upgrades: 'Workshop', goals: 'Logbook', found: '{n} of {m} species discovered', all: 'All', unknown: 'Not discovered yet', where: 'Habitat',
      newSpecies: 'New in the catalogue!', scanHint: 'Stay close to an animal for 1.5 s to scan it.', cargoFull: 'Cargo full – bring the litter to the boat!',
      unload: 'Litter delivered', netHint: 'Hold the button to cut the net', freed: '{name} is free!', lowBat: 'Battery low – surface or head to a station!',
      pressure: 'Pressure limit! Upgrade the pressure hull in the workshop.', station: 'Station: charging battery, repairing hull', boat: 'At the boat: charged and repaired',
      towTitle: 'Perle needs a tow', towBat: 'The battery is empty.', towHull: 'The hull is too badly damaged.', towText: 'Litter you have not delivered yet sinks back to where you found it.',
      towAd: '▶ Repair & continue here', towAdSub: 'Watch an ad – donation to {p}', towBoat: 'Tow to the boat',
      buy: 'Buy', max: 'MAX', lvl: 'Level {n}/3', need: 'You need {n} more credits', installed: 'Upgrade installed!',
      u_battery: 'Big battery', u_battery_d: 'Capacity {a} → {b}', u_light: 'Strong headlight', u_light_d: 'Light range {a} → {b}',
      u_motor: 'Fast motor', u_motor_d: 'Speed {a} → {b}', u_sonar: 'Sonar', u_sonar_d1: 'Pings undiscovered species nearby', u_sonar_d2: 'More range, also shows litter', u_sonar_d3: 'Maximum range, also shows ghost nets',
      u_hull: 'Pressure hull', u_hull_d: 'Max depth {a} → {b} m', u_cargo: 'Cargo bay', u_cargo_d: 'Slots {a} → {b}',
      goalDone: 'Expedition goal reached!', bonus: '+{n} bonus credits', keepDiving: 'Keep diving',
      g_clean15: 'Clean the reef: deliver 15 pieces of litter', g_scan10: 'Discover 10 species', g_free3: 'Free 3 animals from ghost nets', g_twilight: 'Reach the twilight zone',
      g_scan20: 'Discover 20 species', g_clean40: 'Deliver 40 pieces of litter', g_trench: 'Reach the deep-sea trench', g_free8: 'Free all 8 animals', g_vents: 'Reach the hydrothermal vents', g_scanAll: 'Complete the whole catalogue',
      stats: 'Delivered: {d} · Freed: {f}/8 · Deepest point: {m} m',
      whale: 'A humpback whale! Stay close to scan it.', squid: 'A giant squid – hardly anyone has ever seen one alive!',
      sting: 'Ouch – a stinging jellyfish!', bump: 'Careful, don’t bump into it!', rock: 'Falling rocks!', repaired: 'Repaired – off you go!', paused: 'Paused', toBoat: 'Boat', toStation: 'Station',
      first: 'Collect the litter on the reef and bring it to the boat.', done: 'Done',
      rulesHtml: '<ul><li><b>Steering:</b> touch anywhere on the picture and drag (joystick), or use arrows/WASD.</li><li><b>Litter:</b> pick it up with the grabber (button or Space) and bring it to the boat at the surface. Every piece earns credits.</li><li><b>Ghost nets:</b> hold the button until the trapped animal is free.</li><li><b>Species:</b> stay close to an animal for 1.5 seconds – it goes into the catalogue with a real fact.</li><li><b>Battery &amp; hull:</b> the battery drains faster at depth. It recharges at the surface, at the boat and at stations. Jellyfish, sharks and falling rocks damage the hull.</li><li><b>Workshop:</b> spend credits on battery, light, motor, sonar, cargo bay and pressure hull. Only the pressure hull opens the deep zones.</li><li>Expedition goals in the logbook earn stars for the partner project.</li></ul>'
    },
    ru: {
      intro: 'Веди исследовательскую подлодку «Жемчужина» через шесть зон океана: собирай пластиковый мусор и вези его на судно, освобождай животных из брошенных сетей и сканируй виды для каталога.',
      ctrl: 'Тяни = управление (джойстик) · Кнопка = схватить / удерживать, чтобы резать · Клавиатура: стрелки/WASD + пробел',
      dive: 'Погружение', resume: 'Нырять дальше', welcome: 'Добро пожаловать на борт!', back: 'С возвращением!',
      z0: 'Солнечный коралловый риф', z1: 'Лес ламинарии', z2: 'Открытый океан', z3: 'Сумеречная зона', z4: 'Глубоководный жёлоб', z5: 'Гидротермальные источники', zoneNew: 'Открыта новая зона',
      battery: 'Заряд', hull: 'Корпус', credits: 'Кредиты', cargo: 'Груз', grab: 'Взять', cut: 'Держи', scan: 'Скан', full: 'Полно', sonar: 'Сонар',
      catalog: 'Каталог видов', upgrades: 'Верфь', goals: 'Бортжурнал', found: 'Открыто видов: {n} из {m}', all: 'Все', unknown: 'Ещё не открыт', where: 'Среда обитания',
      newSpecies: 'Новый вид в каталоге!', scanHint: 'Побудь рядом с животным 1,5 с, чтобы отсканировать его.', cargoFull: 'Трюм полон — вези мусор на судно!',
      unload: 'Мусор сдан', netHint: 'Удерживай кнопку, чтобы разрезать сеть', freed: '{name} на свободе!', lowBat: 'Заряд на исходе — всплывай или плыви к станции!',
      pressure: 'Предел давления! Улучши прочный корпус на верфи.', station: 'Станция: зарядка и ремонт корпуса', boat: 'У судна: заряжено и отремонтировано',
      towTitle: '«Жемчужину» нужно отбуксировать', towBat: 'Аккумулятор разряжен.', towHull: 'Корпус слишком сильно повреждён.', towText: 'Мусор, который ты ещё не сдал, опустится обратно на место находки.',
      towAd: '▶ Починить и продолжить здесь', towAdSub: 'Посмотреть рекламу — пожертвование: {p}', towBoat: 'Отбуксировать к судну',
      buy: 'Купить', max: 'МАКС', lvl: 'Уровень {n}/3', need: 'Не хватает {n} кредитов', installed: 'Улучшение установлено!',
      u_battery: 'Большой аккумулятор', u_battery_d: 'Ёмкость {a} → {b}', u_light: 'Мощный прожектор', u_light_d: 'Дальность света {a} → {b}',
      u_motor: 'Быстрый мотор', u_motor_d: 'Скорость {a} → {b}', u_sonar: 'Сонар', u_sonar_d1: 'Находит неоткрытые виды поблизости', u_sonar_d2: 'Больше дальность, видно и мусор', u_sonar_d3: 'Максимальная дальность, видно и сети',
      u_hull: 'Прочный корпус', u_hull_d: 'Макс. глубина {a} → {b} м', u_cargo: 'Трюм', u_cargo_d: 'Мест {a} → {b}',
      goalDone: 'Цель экспедиции выполнена!', bonus: '+{n} бонусных кредитов', keepDiving: 'Нырять дальше',
      g_clean15: 'Очистить риф: сдать 15 предметов мусора', g_scan10: 'Открыть 10 видов', g_free3: 'Освободить 3 животных из сетей', g_twilight: 'Достичь сумеречной зоны',
      g_scan20: 'Открыть 20 видов', g_clean40: 'Сдать 40 предметов мусора', g_trench: 'Достичь глубоководного жёлоба', g_free8: 'Освободить всех 8 животных', g_vents: 'Достичь гидротермальных источников', g_scanAll: 'Заполнить весь каталог',
      stats: 'Сдано: {d} · Спасено: {f}/8 · Глубже всего: {m} м',
      whale: 'Горбатый кит! Держись рядом, чтобы отсканировать его.', squid: 'Гигантский кальмар — живым его видели единицы!',
      sting: 'Ай — жгучая медуза!', bump: 'Осторожно, не толкай!', rock: 'Камнепад!', repaired: 'Отремонтировано — вперёд!', paused: 'Пауза', toBoat: 'Судно', toStation: 'Станция',
      first: 'Собери мусор на рифе и отвези его на судно.', done: 'Готово',
      rulesHtml: '<ul><li><b>Управление:</b> коснись картинки в любом месте и тяни (джойстик) или используй стрелки/WASD.</li><li><b>Мусор:</b> подбирай манипулятором (кнопка или пробел) и вези на судно у поверхности. За каждый предмет — кредиты.</li><li><b>Брошенные сети:</b> удерживай кнопку, пока животное не освободится.</li><li><b>Виды:</b> побудь рядом с животным 1,5 секунды — оно попадёт в каталог с настоящим фактом.</li><li><b>Заряд и корпус:</b> на глубине заряд тратится быстрее. Он восстанавливается у поверхности, у судна и на станциях. Медузы, акулы и камнепад повреждают корпус.</li><li><b>Верфь:</b> трать кредиты на аккумулятор, свет, мотор, сонар, трюм и прочный корпус. Только прочный корпус открывает глубокие зоны.</li><li>Цели экспедиции в бортжурнале приносят звёзды для проекта-партнёра.</li></ul>'
    },
    uk: {
      intro: 'Керуй дослідницьким підводним човном «Перлина» в шести зонах океану: збирай пластикове сміття й вези його на судно, звільняй тварин із покинутих сіток і скануй види для каталогу.',
      ctrl: 'Тягни = керування (джойстик) · Кнопка = схопити / утримуй, щоб різати · Клавіатура: стрілки/WASD + пробіл',
      dive: 'Занурення', resume: 'Пірнати далі', welcome: 'Ласкаво просимо на борт!', back: 'З поверненням!',
      z0: 'Сонячний кораловий риф', z1: 'Ліс ламінарії', z2: 'Відкритий океан', z3: 'Сутінкова зона', z4: 'Глибоководний жолоб', z5: 'Гідротермальні джерела', zoneNew: 'Відкрито нову зону',
      battery: 'Заряд', hull: 'Корпус', credits: 'Кредити', cargo: 'Вантаж', grab: 'Узяти', cut: 'Тримай', scan: 'Скан', full: 'Повно', sonar: 'Сонар',
      catalog: 'Каталог видів', upgrades: 'Верф', goals: 'Бортовий журнал', found: 'Відкрито видів: {n} з {m}', all: 'Усі', unknown: 'Ще не відкрито', where: 'Середовище',
      newSpecies: 'Новий вид у каталозі!', scanHint: 'Побудь поруч із твариною 1,5 с, щоб її відсканувати.', cargoFull: 'Трюм повний — вези сміття на судно!',
      unload: 'Сміття здано', netHint: 'Утримуй кнопку, щоб розрізати сітку', freed: '{name} на волі!', lowBat: 'Заряд закінчується — спливай або пливи до станції!',
      pressure: 'Межа тиску! Покращ міцний корпус на верфі.', station: 'Станція: заряджання й ремонт корпусу', boat: 'Біля судна: заряджено й відремонтовано',
      towTitle: '«Перлину» треба відбуксирувати', towBat: 'Акумулятор розряджено.', towHull: 'Корпус надто пошкоджений.', towText: 'Сміття, яке ти ще не здав, опуститься назад туди, де ти його знайшов.',
      towAd: '▶ Полагодити й продовжити тут', towAdSub: 'Переглянути рекламу — пожертва: {p}', towBoat: 'Відбуксирувати до судна',
      buy: 'Купити', max: 'МАКС', lvl: 'Рівень {n}/3', need: 'Бракує {n} кредитів', installed: 'Покращення встановлено!',
      u_battery: 'Великий акумулятор', u_battery_d: 'Ємність {a} → {b}', u_light: 'Потужний прожектор', u_light_d: 'Дальність світла {a} → {b}',
      u_motor: 'Швидкий мотор', u_motor_d: 'Швидкість {a} → {b}', u_sonar: 'Сонар', u_sonar_d1: 'Знаходить невідкриті види поблизу', u_sonar_d2: 'Більша дальність, видно й сміття', u_sonar_d3: 'Максимальна дальність, видно й сітки',
      u_hull: 'Міцний корпус', u_hull_d: 'Макс. глибина {a} → {b} м', u_cargo: 'Трюм', u_cargo_d: 'Місць {a} → {b}',
      goalDone: 'Мету експедиції досягнуто!', bonus: '+{n} бонусних кредитів', keepDiving: 'Пірнати далі',
      g_clean15: 'Очистити риф: здати 15 предметів сміття', g_scan10: 'Відкрити 10 видів', g_free3: 'Звільнити 3 тварин із сіток', g_twilight: 'Дістатися сутінкової зони',
      g_scan20: 'Відкрити 20 видів', g_clean40: 'Здати 40 предметів сміття', g_trench: 'Дістатися глибоководного жолоба', g_free8: 'Звільнити всіх 8 тварин', g_vents: 'Дістатися гідротермальних джерел', g_scanAll: 'Заповнити весь каталог',
      stats: 'Здано: {d} · Врятовано: {f}/8 · Найглибше: {m} м',
      whale: 'Горбатий кит! Тримайся поруч, щоб його відсканувати.', squid: 'Гігантський кальмар — живим його бачили одиниці!',
      sting: 'Ой — жалка медуза!', bump: 'Обережно, не штовхай!', rock: 'Камінепад!', repaired: 'Відремонтовано — уперед!', paused: 'Пауза', toBoat: 'Судно', toStation: 'Станція',
      first: 'Збери сміття на рифі й відвези його на судно.', done: 'Готово',
      rulesHtml: '<ul><li><b>Керування:</b> торкнися зображення будь-де й тягни (джойстик) або використовуй стрілки/WASD.</li><li><b>Сміття:</b> підбирай маніпулятором (кнопка або пробіл) і вези на судно біля поверхні. За кожен предмет — кредити.</li><li><b>Покинуті сітки:</b> утримуй кнопку, доки тварина не звільниться.</li><li><b>Види:</b> побудь поруч із твариною 1,5 секунди — вона потрапить до каталогу зі справжнім фактом.</li><li><b>Заряд і корпус:</b> на глибині заряд витрачається швидше. Він відновлюється біля поверхні, біля судна й на станціях. Медузи, акули й камінепад пошкоджують корпус.</li><li><b>Верф:</b> витрачай кредити на акумулятор, світло, мотор, сонар, трюм і міцний корпус. Лише міцний корпус відкриває глибокі зони.</li><li>Цілі експедиції в бортовому журналі приносять зірки для проєкту-партнера.</li></ul>'
    }
  };

  const IC = {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/></svg>',
    tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4.4"/><path d="M12 17.6h.01"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 5v6.5c0 5 3.4 9.3 8 10.5 4.6-1.2 8-5.5 8-10.5V5z"/></svg>',
    gem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 2.5 20 7v10l-8 4.5L4 17V7z"/><path d="M12 7.5 16 10v4.5L12 17l-4-2.5V10z" fill="currentColor" stroke="none"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7.2 12 12l8.7-4.8M12 21.6V12"/></svg>',
    claw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v7"/><path d="M12 9c-4 0-6 3-6 6.5 0 2 1 3.5 2.5 4.5"/><path d="M12 9c4 0 6 3 6 6.5 0 2-1 3.5-2.5 4.5"/><circle cx="12" cy="9" r="1.6" fill="currentColor"/></svg>',
    cut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
    radar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6.4-6.4"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l7-2v10l-7-2z" fill="currentColor"/><path d="M14 8l6-3M14 12h7M14 16l6 3"/></svg>',
    fan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 2.5 3-4 7zM14 12c4 0 7 1 7 4 0 2-3 2.5-7-4zM12 14c0 4-1 7-4 7-2 0-2.5-3 4-7zM10 12c-4 0-7-1-7-4 0-2 3-2.5 7 4z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  /* ======================= card art ======================= */
  function subSvg(x, y, s, id) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-15 -4 L-22 -10 L-21 0 L-22 10 L-15 4Z" fill="#7aa3ba"/>
      <ellipse cx="-24" cy="0" rx="2" ry="7" fill="#c9d9e2"/>
      <circle r="13" fill="url(#${id}s)"/>
      <path d="M-9 -9.5a13 13 0 0 1 0 19" stroke="#2fb6a8" stroke-width="3.4" fill="none"/>
      <circle cx="4" cy="-2" r="7.2" fill="#0d4c6a" stroke="#e6c27a" stroke-width="2"/>
      <path d="M0 -6a6 6 0 0 1 7 0" stroke="#bff2ff" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="12.5" cy="5" r="2.2" fill="#fff7cf"/>
      <path d="M3 12 l4 5 m-4 -5 l-2 6" stroke="#6b7a88" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="-1" cy="-13" r="1.6" fill="#ff5a6e"/>
    </g>`;
  }
  function svgFish(x, y, s, flip, c1, c2, band) {
    return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><path d="M-6 0 L-11 -4 L-10 0 L-11 4Z" fill="${c1}"/><ellipse rx="7" ry="4" fill="${c1}"/>${band ? `<rect x="-1.5" y="-4" width="2.4" height="8" fill="${band}"/><rect x="3" y="-3.6" width="1.8" height="7.2" fill="${band}"/>` : `<ellipse cx="0" cy="1.6" rx="5" ry="1.6" fill="${c2}"/>`}<circle cx="4" cy="-1" r="1" fill="#0d1620"/></g>`;
  }
  function thumbSvg() {
    return `<defs><linearGradient id="dsTw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3cc6ec"/><stop offset=".55" stop-color="#0f5f8f"/><stop offset="1" stop-color="#062440"/></linearGradient>
      <linearGradient id="dsTb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".75"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>
      <radialGradient id="dsTs" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e3eef4"/><stop offset="1" stop-color="#8fb4c9"/></radialGradient></defs>
      <rect width="160" height="80" fill="url(#dsTw)"/>
      <g fill="#fff" opacity=".1"><path d="M22 0h14L16 80H2z"/><path d="M74 0h10L64 80H52z"/><path d="M124 0h16l-24 80h-12z"/></g>
      <path d="M0 6 Q20 2 40 6 T80 6 T120 6 T160 6 V0 H0Z" fill="#bff3ff" opacity=".35"/>
      <path d="M64 44 L160 18 L160 74Z" fill="url(#dsTb)"/>
      ${svgFish(112, 40, 1.15, false, '#ff7a1a', '#ffb066', '#fff')}${svgFish(132, 54, 1.0, false, '#ff7a1a', '#ffb066', '#fff')}${svgFish(140, 30, 0.9, true, '#2563eb', '#60a5fa')}${svgFish(122, 24, 0.8, true, '#2563eb', '#60a5fa')}
      <g opacity=".85"><path d="M0 80 C4 62 10 60 12 68 C14 56 22 54 24 66 C28 60 34 62 34 80Z" fill="#f472b6"/><path d="M30 80 C32 70 40 66 46 72 C50 68 56 70 58 80Z" fill="#fb923c"/><circle cx="14" cy="76" r="7" fill="#fbbf24"/></g>
      <path d="M150 80 C148 66 152 54 146 40 C150 52 156 62 154 80Z" fill="#4d7c0f" opacity=".8"/>
      ${subSvg(50, 42, 1.25, 'dsT')}
      <g fill="none" stroke="#e0f7ff" stroke-width="1" opacity=".7"><circle cx="20" cy="36" r="2.2"/><circle cx="16" cy="28" r="1.5"/><circle cx="22" cy="20" r="1.1"/></g>`;
  }
  function artSvg() {
    return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display:block">
      <defs><linearGradient id="dsAw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fd3f0"/><stop offset=".45" stop-color="#1580b0"/><stop offset="1" stop-color="#06284a"/></linearGradient>
      <linearGradient id="dsAb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".8"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>
      <linearGradient id="dsAr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="dsAs" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e3eef4"/><stop offset="1" stop-color="#8fb4c9"/></radialGradient></defs>
      <rect width="320" height="170" fill="url(#dsAw)"/>
      <g fill="url(#dsAr)"><path d="M40 0h24L30 170H0z"/><path d="M130 0h18l-30 170H96z"/><path d="M230 0h28l-40 170h-26z"/></g>
      <path d="M0 10 Q20 4 40 10 T80 10 T120 10 T160 10 T200 10 T240 10 T280 10 T320 10 V0 H0Z" fill="#d8f8ff" opacity=".5"/>
      <g opacity=".35" fill="#0b3a5c"><path d="M250 64 q30 -12 56 0 q-26 6 -56 0z"/><path d="M262 64 l10 -16 l6 16z"/></g>
      <path d="M96 96 L320 50 L320 150Z" fill="url(#dsAb)"/>
      <g opacity=".9">${svgFish(200, 92, 1.4, false, '#ff7a1a', '#ffb066', '#fff')}${svgFish(226, 108, 1.2, false, '#ff7a1a', '#ffb066', '#fff')}${svgFish(250, 82, 1.1, true, '#2563eb', '#60a5fa')}${svgFish(268, 96, 1.0, true, '#2563eb', '#60a5fa')}${svgFish(284, 78, 0.9, true, '#2563eb', '#60a5fa')}${svgFish(262, 116, 0.95, true, '#2563eb', '#60a5fa')}</g>
      <g transform="translate(180 50)"><ellipse rx="20" ry="11" fill="#6b8f3a"/><path d="M-14 -4 h28" stroke="#3f5223" stroke-width="1.2"/><ellipse cx="24" cy="0" rx="7" ry="5" fill="#9aab66"/><ellipse cx="4" cy="12" rx="5" ry="10" transform="rotate(40 4 12)" fill="#9aab66"/><circle cx="26" cy="-1.5" r="1.2" fill="#111"/></g>
      <g stroke-linecap="round" fill="none"><path d="M22 170 C16 140 30 120 20 92 C14 74 26 60 22 40" stroke="#4d7c0f" stroke-width="4"/><path d="M40 170 C46 140 34 118 44 96 C50 80 40 66 46 52" stroke="#65a30d" stroke-width="3.5"/></g>
      <g fill="#84cc16" opacity=".85"><ellipse cx="27" cy="70" rx="6" ry="2.5" transform="rotate(-30 27 70)"/><ellipse cx="16" cy="100" rx="6" ry="2.5" transform="rotate(30 16 100)"/><ellipse cx="50" cy="84" rx="6" ry="2.5" transform="rotate(-25 50 84)"/><ellipse cx="38" cy="120" rx="6" ry="2.5" transform="rotate(25 38 120)"/></g>
      <path d="M0 170 L0 156 Q40 146 80 154 T160 152 T240 156 T320 150 V170Z" fill="#e8cf98"/>
      <g><path d="M70 160 C66 142 76 136 80 146 C82 132 92 130 94 144 C98 138 106 140 106 160Z" fill="#f472b6"/><circle cx="120" cy="156" r="10" fill="#fbbf24"/><path d="M120 148 v16 M112 156 h16" stroke="#d97706" stroke-width="1" opacity=".5"/><path d="M134 162 C136 146 146 140 150 150 C156 142 164 146 164 162Z" fill="#fb923c"/><path d="M290 160 l-10 -30 M290 160 l0 -34 M290 160 l10 -30" stroke="#c0397b" stroke-width="3" stroke-linecap="round"/></g>
      ${subSvg(80, 96, 2.1, 'dsA')}
      <g fill="none" stroke="#e0f7ff" stroke-width="1.2" opacity=".75"><circle cx="34" cy="90" r="3"/><circle cx="28" cy="78" r="2"/><circle cx="34" cy="66" r="1.4"/></g>
    </svg>`;
  }

  /* ======================= the game ======================= */
  function mountGame(root, ctx) {
    const s = Kit.strings(STR);
    const nm = o => L(o);
    const esc = x => UI.escapeHtml(String(x));
    const terr = buildTerrain();
    const { water, nearest, floorBelow } = terr, NO = terr.out;
    const rng = mulberry(20261127);
    const R = (a, b) => a + rng() * (b - a);

    /* ---------- save data ---------- */
    const d = ctx.data;
    d.credits = d.credits || 0; d.up = Object.assign({ battery: 0, light: 0, motor: 0, sonar: 0, hull: 0, cargo: 0 }, d.up || {});
    d.found = d.found || {}; d.collected = d.collected || []; d.freed = d.freed || []; d.delivered = d.delivered || 0;
    d.goals = d.goals || []; d.maxY = d.maxY || 0; d.zones = d.zones || [0]; d.plays = (d.plays || 0) + 1;
    const collectedSet = new Set(d.collected), freedSet = new Set(d.freed);
    const save = () => { d.collected = Array.from(collectedSet); d.freed = Array.from(freedSet); ctx.save(); };
    const U = id => UPG.find(u => u.id === id).val[d.up[id]];

    /* ---------- DOM ---------- */
    root.innerHTML = `<div class="ds">
      <div class="ds-stage">
        <canvas class="ds-cv"></canvas>
        <div class="ds-hud">
          <div class="ds-top">
            <div class="ds-glass ds-depth"><b>0 m</b><small></small></div>
            <div class="ds-glass ds-bars">
              <div class="ds-bar ds-bat"><span class="ic">${IC.bolt}</span><span class="tr"><i></i></span></div>
              <div class="ds-bar ds-hull"><span class="ic">${IC.shield}</span><span class="tr"><i></i></span></div>
            </div>
            <div class="ds-glass ds-cred"><b><span class="ic">${IC.gem}</span><em>0</em></b><small><span class="ic">${IC.box}</span><em>0/4</em></small></div>
          </div>
          <div class="ds-side">
            <button class="ds-glass ds-ib" data-p="goals" aria-label="goals">${IC.flag}<span class="ds-dot"></span></button>
            <button class="ds-glass ds-ib" data-p="catalog" aria-label="catalog">${IC.book}</button>
            <button class="ds-glass ds-ib" data-p="upgrades" aria-label="upgrades">${IC.tool}<span class="ds-dot"></span></button>
            <button class="ds-glass ds-ib" data-p="rules" aria-label="rules">${IC.help}</button>
          </div>
          <div class="ds-gauge"><i class="ds-glim"></i><i class="ds-gmk"></i></div>
          <div class="ds-banner"><b></b><small></small></div>
          <div class="ds-hint"></div>
          <div class="ds-card"><canvas width="128" height="88"></canvas><div><small></small><b></b><p></p></div></div>
          <button class="ds-act idle"><svg class="ds-ring" viewBox="0 0 80 80"><circle cx="40" cy="40" r="36"/></svg><span class="ic">${IC.radar}</span><span class="lb">${esc(s('scan'))}</span></button>
        </div>
        <div class="ds-panel"><div class="ds-sheet"></div></div>
        <div class="ds-ov"></div>
      </div>
    </div>`;
    const $ = sel => root.querySelector(sel);
    const stage = $('.ds-stage'), cv = $('.ds-cv'), g = cv.getContext('2d');
    const hud = {
      depthB: $('.ds-depth b'), depthS: $('.ds-depth small'), bat: $('.ds-bat'), batI: $('.ds-bat i'), hull: $('.ds-hull'), hullI: $('.ds-hull i'),
      cred: $('.ds-cred b em'), cargo: $('.ds-cred small em'), gauge: $('.ds-gauge'), gmk: $('.ds-gmk'), glim: $('.ds-glim'),
      banner: $('.ds-banner'), bannerB: $('.ds-banner b'), bannerS: $('.ds-banner small'), hint: $('.ds-hint'), card: $('.ds-card'), act: $('.ds-act'),
      actIc: $('.ds-act .ic'), actLb: $('.ds-act .lb'), ring: $('.ds-ring circle'), panel: $('.ds-panel'), sheet: $('.ds-sheet'), ov: $('.ds-ov'),
      dotGoals: $('[data-p="goals"] .ds-dot'), dotUp: $('[data-p="upgrades"] .ds-dot')
    };
    // depth gauge segments
    hud.gauge.insertAdjacentHTML('afterbegin', ZONE_Y.slice(0, 6).map((y, i) => `<span style="top:${y / WORLD_H * 100}%;height:${(ZONE_Y[i + 1] - y) / WORLD_H * 100}%" class="z${i}"></span>`).join(''));

    /* ---------- sizes ---------- */
    let W = 380, H = 560, DPR = 1, RS = 1, MS = 0.5;
    const maskCv = document.createElement('canvas'), mg = maskCv.getContext('2d');
    let vignette = null;
    function resize() {
      DPR = Math.min(2, window.devicePixelRatio || 1); RS = Math.min(DPR, 1.5);
      W = Math.max(280, Math.round(stage.clientWidth || 380));
      const top = stage.getBoundingClientRect().top;
      const avail = (window.innerHeight || 800) - Math.max(0, top) - 14;
      H = Math.round(clamp(avail, 440, 600));
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.height = H + 'px';
      maskCv.width = Math.ceil(W * MS); maskCv.height = Math.ceil(H * MS);
      vignette = document.createElement('canvas'); vignette.width = W; vignette.height = H;
      const vg = vignette.getContext('2d'), gr = vg.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      gr.addColorStop(0, 'rgba(0,10,25,0)'); gr.addColorStop(1, 'rgba(0,10,25,.42)'); vg.fillStyle = gr; vg.fillRect(0, 0, W, H);
      if (paused()) render();
    }

    /* ---------- sprites ---------- */
    function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
    const radial = mk(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); });
    const GLOWC = { cyan: '95,246,255', blue: '90,140,255', teal: '170,255,235', pink: '255,110,215', warm: '255,170,80', white: '220,245,255', green: '120,255,170' };
    const glow = {};
    Object.keys(GLOWC).forEach(k => { glow[k] = mk(64, 64, (x) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(255,255,255,1)`); gr.addColorStop(0.18, `rgba(${GLOWC[k]},.95)`); gr.addColorStop(0.5, `rgba(${GLOWC[k]},.3)`); gr.addColorStop(1, `rgba(${GLOWC[k]},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }); });
    // headlight cone: origin at (0, h/2), pointing +x
    const cone = mk(256, 200, (x, w, h) => {
      for (let k = 0; k < 5; k++) {
        const a = 0.26 + k * 0.055; x.globalAlpha = 0.24;
        const gr = x.createRadialGradient(0, h / 2, 0, 0, h / 2, w); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.65)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.beginPath(); x.moveTo(0, h / 2); x.arc(0, h / 2, w, -a, a); x.closePath(); x.fill();
      }
    });
    const rays = mk(140, 700, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,235,.55)'); gr.addColorStop(1, 'rgba(255,255,235,0)'); x.fillStyle = gr; x.beginPath(); x.moveTo(w * 0.38, 0); x.lineTo(w * 0.62, 0); x.lineTo(w, h); x.lineTo(0, h); x.closePath(); x.fill(); x.globalCompositeOperation = 'destination-in'; const g2 = x.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(0.5, 'rgba(0,0,0,1)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, w, h); });
    // caustics: tileable Voronoi edge pattern
    const caustic = mk(192, 192, (x, w, h) => {
      const r = mulberry(7), P = [], n = 5;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) P.push([(i + 0.15 + r() * 0.7) * w / n, (j + 0.15 + r() * 0.7) * h / n]);
      const img = x.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
        let f1 = 1e9, f2 = 1e9;
        for (let k = 0; k < P.length; k++) for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const dx = xx - (P[k][0] + ox * w), dy = y - (P[k][1] + oy * h); const dd = dx * dx + dy * dy;
          if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
        }
        const e = Math.sqrt(f2) - Math.sqrt(f1), a = Math.pow(clamp(1 - e / 7, 0, 1), 2.4);
        const o = (y * w + xx) * 4; img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 235; img.data[o + 3] = a * 255;
      }
      x.putImageData(img, 0, 0);
    });
    let causticPat = null;
    // water gradient strip (world y from -SKY .. WORLD_H)
    const WSTOPS = [[0, '#59d3ea'], [360, '#22a6cb'], [820, '#127aa2'], [1500, '#0d5687'], [2900, '#0c3a68'], [4500, '#0b2a50'], [5050, '#2a1c2a']];
    const waterStrip = mk(1, 1024, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); WSTOPS.forEach(st => gr.addColorStop(clamp(st[0] / WORLD_H, 0, 1), st[1])); x.fillStyle = gr; x.fillRect(0, 0, 1, h); });
    const stripCtx = waterStrip.getContext('2d'), stripData = stripCtx.getImageData(0, 0, 1, 1024).data;
    function waterRGB(y, k) { const i = clamp(Math.round(y / WORLD_H * 1023), 0, 1023) * 4; return [stripData[i] * k | 0, stripData[i + 1] * k | 0, stripData[i + 2] * k | 0]; }

    /* ---------- parallax background rocks ---------- */
    const PAR = [{ f: 0.3, shapes: [] }, { f: 0.58, shapes: [] }];
    PAR.forEach((layer, li) => {
      const r = mulberry(300 + li), cnt = li ? 18 : 16;
      for (let i = 0; i < cnt; i++) {
        const D = 500 + r() * 4300; // world depth this shape belongs to
        const lx = r() * (WORLD_W * layer.f + 420) - 60;
        const w = (li ? 120 : 160) + r() * 220, h = (li ? 260 : 360) + r() * 520;
        const p = new Path2D(); const steps = 10; p.moveTo(-w / 2, h);
        for (let k = 0; k <= steps; k++) { const t = k / steps, y = h - t * h, sw = Math.sin(t * Math.PI * 0.95 + 0.1); p.lineTo(-w / 2 * sw * (0.6 + 0.4 * (1 - t)) + (r() - 0.5) * 16, y); }
        for (let k = steps; k >= 0; k--) { const t = k / steps, y = h - t * h, sw = Math.sin(t * Math.PI * 0.95 + 0.1); p.lineTo(w / 2 * sw * (0.6 + 0.4 * (1 - t)) + (r() - 0.5) * 16, y); }
        p.closePath();
        const ly = D * layer.f + 280 * (1 - layer.f) - h * 0.35;
        const c = waterRGB(D, li ? 0.62 : 0.8);
        layer.shapes.push({ x: lx, y: ly, w, h, p, col: `rgb(${c[0]},${c[1]},${c[2]})` });
      }
    });

    /* ---------- tiles (terrain + static decor) ---------- */
    const TILE = 512, tiles = new Map(); let tileQueue = 0;
    const waterPath = new Path2D(); { const P = terr.pts; waterPath.moveTo(P[0], P[1]); for (let i = 2; i < P.length; i += 2) waterPath.lineTo(P[i], P[i + 1]); waterPath.closePath(); }
    const rockPath = new Path2D(); rockPath.rect(-300, -900, WORLD_W + 600, WORLD_H + 1200); rockPath.addPath(waterPath);
    const ROCK = [[-300, '#d6bf8a'], [0, '#c8ad77'], [380, '#bba070'], [520, '#76664c'], [850, '#4b5260'], [1500, '#34425a'], [2900, '#2c3650'], [4500, '#2e2834'], [5050, '#4a2c1c']];
    const RIM = [[-300, '#f4e2b4'], [0, '#efdcae'], [380, '#e6cf9c'], [520, '#9c8a66'], [850, '#6d7685'], [1500, '#5a6b88'], [2900, '#4a5878'], [4500, '#56404a'], [5050, '#8a5530']];
    function wgrad(x, stops) { const gr = x.createLinearGradient(0, -300, 0, 5050); stops.forEach(st => gr.addColorStop((st[0] + 300) / 5350, st[1])); return gr; }
    const decor = []; // baked decor items
    const kelp = [], anemones = [], glowDots = [], tubeSpots = [];
    function bakeTile(tx, ty) {
      const x0 = tx * TILE, y0 = ty * TILE - YOFF;
      if (!terr.segsInRect(x0 - 40, y0 - 40, x0 + TILE + 40, y0 + TILE + 40).length && water(x0 + TILE / 2, y0 + TILE / 2)) {
        const any = decor.some(o => o.x > x0 - 90 && o.x < x0 + TILE + 90 && o.y > y0 - 160 && o.y < y0 + TILE + 90);
        if (!any) return null;
      }
      const c = document.createElement('canvas'); c.width = c.height = Math.ceil(TILE * RS); const x = c.getContext('2d');
      x.setTransform(RS, 0, 0, RS, -x0 * RS, -y0 * RS);
      x.fillStyle = wgrad(x, ROCK); x.fillRect(x0, y0, TILE, TILE);
      const r = mulberry(tx * 131 + ty * 977 + 5);
      for (let i = 0; i < 90; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; ell(x, x0 + r() * TILE, y0 + r() * TILE, 3 + r() * 14, 2 + r() * 8, r() * 3); x.fill(); }
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.fill(waterPath);
      x.globalCompositeOperation = 'source-atop'; x.lineJoin = 'round';
      x.strokeStyle = wgrad(x, RIM);
      x.globalAlpha = 0.18; x.lineWidth = 56; x.stroke(waterPath);
      x.globalAlpha = 0.28; x.lineWidth = 26; x.stroke(waterPath);
      x.globalAlpha = 0.6; x.lineWidth = 8; x.stroke(waterPath);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      for (const o of decor) if (o.x > x0 - 90 && o.x < x0 + TILE + 90 && o.y > y0 - 160 && o.y < y0 + TILE + 90) bakeDecor(x, o);
      return c;
    }
    function getTile(tx, ty, allowBake) {
      const key = tx + ty * 64; let t = tiles.get(key);
      if (t === undefined) { if (!allowBake) return undefined; t = bakeTile(tx, ty); tiles.set(key, t); if (tiles.size > 28) { for (const k of tiles.keys()) { if (k !== key) { tiles.delete(k); break; } } } }
      else { tiles.delete(key); tiles.set(key, t); }
      return t;
    }
    function bakeDecor(x, o) {
      x.save(); x.translate(o.x, o.y); x.rotate(o.rot);
      const s = o.s, col = o.col, r = mulberry(o.seed);
      switch (o.t) {
        case 'branch': {
          const br = (len, a, w, dep) => { x.save(); x.rotate(a); x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -len); x.stroke(); x.translate(0, -len); if (dep > 0) { br(len * 0.72, -0.45 - r() * 0.3, w * 0.72, dep - 1); br(len * 0.72, 0.45 + r() * 0.3, w * 0.72, dep - 1); if (r() < 0.4) br(len * 0.6, (r() - 0.5) * 0.3, w * 0.7, dep - 1); } else { x.fillStyle = o.col2; circ(x, 0, 0, w * 0.75); x.fill(); } x.restore(); };
          br(10 * s, 0, 4.2 * s, 3); break;
        }
        case 'brain': {
          x.fillStyle = col; x.beginPath(); x.ellipse(0, 0, 16 * s, 12 * s, 0, Math.PI, TAU); x.closePath(); x.fill();
          x.strokeStyle = 'rgba(80,50,20,.35)'; x.lineWidth = 1.2; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(-14 * s + i * 5 * s, -1); x.bezierCurveTo(-12 * s + i * 5 * s, -6 * s, -8 * s + i * 4 * s, -8 * s, -6 * s + i * 4.5 * s, -11 * s + Math.abs(i - 2.5) * 2 * s); x.stroke(); }
          x.fillStyle = 'rgba(255,255,255,.18)'; ell(x, -5 * s, -8 * s, 6 * s, 2.5 * s); x.fill(); break;
        }
        case 'fan': {
          x.strokeStyle = col; x.lineCap = 'round';
          for (let i = 0; i < 12; i++) { const a = -1.1 + i * 0.2; x.lineWidth = 1.4; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(Math.sin(a) * 10 * s, -16 * s, Math.sin(a) * 22 * s, -Math.cos(a) * 30 * s); x.stroke(); }
          x.globalAlpha = 0.5; x.lineWidth = 0.8; for (let k = 1; k < 5; k++) { x.beginPath(); x.arc(0, 0, k * 7 * s, -Math.PI / 2 - 1.1, -Math.PI / 2 + 1.1); x.stroke(); } x.globalAlpha = 1; break;
        }
        case 'tube': {
          for (let i = 0; i < 4; i++) { const h = (14 + r() * 18) * s, xx = (i - 1.5) * 6 * s, w = (4 + r() * 2) * s; x.fillStyle = col; x.beginPath(); x.moveTo(xx - w / 2, 0); x.lineTo(xx - w / 2 - 1, -h); x.lineTo(xx + w / 2 + 1, -h); x.lineTo(xx + w / 2, 0); x.fill(); x.fillStyle = 'rgba(40,10,40,.55)'; ell(x, xx, -h, w / 2 + 1, 1.6 * s); x.fill(); }
          break;
        }
        case 'grass': {
          x.strokeStyle = col; x.lineCap = 'round'; for (let i = 0; i < 6; i++) { const xx = (i - 2.5) * 3 * s, h = (12 + r() * 16) * s; x.lineWidth = 2 * s; x.beginPath(); x.moveTo(xx, 2); x.quadraticCurveTo(xx + (r() - 0.5) * 8, -h * 0.6, xx + (r() - 0.5) * 10, -h); x.stroke(); }
          break;
        }
        case 'rock': {
          const gr = x.createLinearGradient(0, -14 * s, 0, 4); gr.addColorStop(0, o.col2); gr.addColorStop(1, col); x.fillStyle = gr;
          x.beginPath(); x.moveTo(-16 * s, 3); x.quadraticCurveTo(-15 * s, -10 * s, -4 * s, -13 * s); x.quadraticCurveTo(8 * s, -15 * s, 15 * s, -4 * s); x.quadraticCurveTo(17 * s, 2, 12 * s, 4); x.closePath(); x.fill(); break;
        }
        case 'sponge': {
          x.fillStyle = col; x.globalAlpha = 0.8; x.beginPath(); x.moveTo(-4 * s, 0); x.quadraticCurveTo(-9 * s, -16 * s, -6 * s, -30 * s); x.lineTo(6 * s, -30 * s); x.quadraticCurveTo(9 * s, -16 * s, 4 * s, 0); x.fill();
          x.globalAlpha = 0.35; x.strokeStyle = '#fff'; x.lineWidth = 0.7; for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(-7 * s, -i * 5 * s); x.lineTo(7 * s, -i * 5 * s); x.stroke(); } x.globalAlpha = 1; break;
        }
        case 'pen': {
          x.strokeStyle = col; x.lineWidth = 1.6; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -26 * s); x.stroke(); x.lineWidth = 1; for (let i = 0; i < 9; i++) { const y = -8 * s - i * 2 * s; x.beginPath(); x.moveTo(0, y); x.lineTo(-5 * s, y - 3 * s); x.moveTo(0, y); x.lineTo(5 * s, y - 3 * s); x.stroke(); }
          break;
        }
        case 'chimney': {
          x.fillStyle = 'rgba(255,120,40,.32)'; for (let i = 0; i < 6; i++) { ell(x, (r() - 0.5) * 14, -r() * o.h, 2 + r() * 3, 6 + r() * 10); x.fill(); }
          x.fillStyle = 'rgba(230,220,200,.35)'; for (let i = 0; i < 10; i++) { circ(x, (r() - 0.5) * 18, -r() * o.h, 1 + r() * 1.5); x.fill(); }
          x.fillStyle = '#3a2418'; ell(x, 0, -o.h, 9, 4); x.fill(); break;
        }
        case 'ripple': {
          x.strokeStyle = 'rgba(255,245,215,.35)'; x.lineWidth = 1.2; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-14 * s, -2 - i * 3); x.quadraticCurveTo(0, -5 - i * 3, 14 * s, -2 - i * 3); x.stroke(); }
          break;
        }
      }
      x.restore();
    }
    /* ---------- populate decor along the terrain ---------- */
    (function populate() {
      const seg = terr.seg, N = terr.N, r = mulberry(4242);
      const CORAL = [['#ff7aa2', '#ffc2d4'], ['#ff9f5a', '#ffd2a8'], ['#b07cff', '#e3d0ff'], ['#ffd166', '#fff0c2'], ['#4fd1c5', '#c7fff7']];
      for (let i = 0; i < N; i++) {
        const o = i * 6, ax = seg[o], ay = seg[o + 1], bx = seg[o + 2], by = seg[o + 3], nx = seg[o + 4], ny = seg[o + 5];
        const mx = (ax + bx) / 2, my = (ay + by) / 2; if (my < 8 || mx < 120 || mx > 2960) continue;
        const rot = Math.atan2(ny, nx) + Math.PI / 2, floor = ny < -0.55, z = zoneAt(my);
        const add = (t, extra) => decor.push(Object.assign({ t, x: mx, y: my + 2, rot, s: 0.8 + r() * 0.6, seed: (r() * 1e9) | 0 }, extra));
        if (z === 0) {
          if (!floor && r() < 0.5) continue;
          const k = r(); const cc = CORAL[(r() * CORAL.length) | 0];
          if (k < 0.3) add('branch', { col: cc[0], col2: cc[1] }); else if (k < 0.48) add('brain', { col: r() < 0.5 ? '#e9b872' : '#c9a0dc' }); else if (k < 0.62) add('fan', { col: r() < 0.5 ? '#c0397b' : '#9b5de5' });
          else if (k < 0.76) add('tube', { col: r() < 0.5 ? '#8a5cf6' : '#f4a261' }); else if (k < 0.9) add('grass', { col: '#3f9d4a' }); else add('ripple', {});
          if (floor && r() < 0.25) decor.push({ t: 'rock', x: mx + (r() - 0.5) * 10, y: my + 3, rot, s: 0.6 + r() * 0.5, col: '#9c8358', col2: '#cdb586', seed: 1 });
        } else if (z === 1) {
          const k = r();
          if (k < 0.3) add('rock', { col: '#4c4a3c', col2: '#7a7660' }); else if (k < 0.45) add('grass', { col: '#5d7d2c' }); else if (k < 0.55) add('branch', { col: '#c8553d', col2: '#f08a6c', s: 0.7 });
          if (floor && mx > 880 && mx < 1390 && r() < 0.6) kelp.push({ x: mx, y: my + 2, h: Math.min(140 + r() * 210, my - 40), ph: r() * TAU, seg: 12, fg: r() < 0.22, hue: r() });
        } else if (z === 2 || z === 3) {
          const k = r();
          if (k < 0.12) add('sponge', { col: '#9fb4c7' }); else if (k < 0.22) add('pen', { col: '#e58fb0' }); else if (k < 0.36) add('rock', { col: '#232b38', col2: '#3a4659' });
          if (z === 3 && r() < 0.18) glowDots.push({ x: mx + nx * 6, y: my + ny * 6, ph: r() * TAU, c: r() < 0.5 ? 'cyan' : 'green', r: 3 + r() * 3 });
        } else if (z === 4) {
          const k = r();
          if (k < 0.14) add('sponge', { col: '#cfd8dc' }); else if (k < 0.24) add('rock', { col: '#141821', col2: '#2b3243' });
          if (r() < 0.35) glowDots.push({ x: mx + nx * 6, y: my + ny * 6, ph: r() * TAU, c: ['cyan', 'green', 'blue', 'pink'][(r() * 4) | 0], r: 3 + r() * 4 });
        } else if (z === 5 && floor && my > 4900) {
          if (r() < 0.3) add('rock', { col: '#2a1c16', col2: '#4b3326' });
        }
      }
      CHIMNEYS.forEach((c, i) => decor.push({ t: 'chimney', x: c.x, y: 4970, rot: 0, s: 1, h: 4970 - c.y, seed: 50 + i }));
      // anemones for the clownfish
      [430, 620].forEach(ax => { const fy = floorBelow(ax, 150, 400); if (fy) anemones.push({ x: ax, y: fy + 2, ph: r() * TAU }); });
      [1800, 1990, 2140, 2290].forEach(tx => { const fy = floorBelow(tx, 4700, 400); if (fy) tubeSpots.push({ x: tx, y: fy + 2 }); });
    })();

    /* ---------- creatures ---------- */
    const creatures = [], schools = [];
    function freeSpot(area, clear, tries) {
      const a = AREAS[area] || area;
      for (let k = 0; k < (tries || 60); k++) { const x = R(a[0], a[1]), y = R(a[2], a[3]); if (y > 12 && water(x, y) && nearest(x, y) > clear) return [x, y]; }
      return [(a[0] + a[1]) / 2, (a[2] + a[3]) / 2];
    }
    function floorSpot(area) {
      const a = AREAS[area] || area;
      for (let k = 0; k < 80; k++) { const x = R(a[0], a[1]), fy = floorBelow(x, a[2], a[3] - a[2] + 120); if (fy && fy > a[2] && fy < a[3] + 100) { nearest(x, fy - 1); if (NO[3] < -0.5) return [x, fy]; } }
      return null;
    }
    function makeCreature(sp, x, y, home) {
      const c = { sp, x, y, vx: R(-1, 1) * sp.spd * 0.5, vy: R(-0.3, 0.3) * sp.spd * 0.3, ang: 0, faceS: 1, face: 1, ph: R(0, 10), home: home || { x, y, r: 60 }, t: 0, cool: 0, avoidX: 0, avoidY: 0, idx: creatures.length, out: 1, flash: 0 };
      creatures.push(c); return c;
    }
    function spawnSpecies(sp) {
      if (sp.beh === 'school') {
        const p = freeSpot(sp.area, 40);
        const sc = { sp, fish: [], hx: p[0], hy: p[1], tx: p[0], ty: p[1], timer: 0 };
        for (let i = 0; i < sp.n; i++) { const c = makeCreature(sp, p[0] + R(-30, 30), p[1] + R(-20, 20)); c.school = sc; sc.fish.push(c); }
        schools.push(sc); return;
      }
      for (let i = 0; i < sp.n; i++) {
        if (sp.beh === 'crawl' || sp.beh === 'static' || sp.beh === 'lurk') {
          let p;
          if (sp.id === 'tubeworm') { const t = tubeSpots[i % tubeSpots.length]; p = t ? [t.x, t.y] : null; }
          else if (sp.id === 'snail') { const ch = CHIMNEYS[i % 3]; const fy = floorBelow(ch.x + 22, 4800, 300); p = fy ? [ch.x + 22, fy] : null; }
          else p = floorSpot(sp.area);
          if (!p) continue;
          const c = makeCreature(sp, p[0], p[1] - (sp.beh === 'crawl' ? sp.L * 0.25 : 0)); c.vx = c.vy = 0; c.floorY = p[1];
          continue;
        }
        if (sp.beh === 'surface') { const x = R(900, 1350); makeCreature(sp, x, 5, { x, y: 5, r: 120 }); continue; }
        if (sp.anchor === 'anemone') { const an = anemones[i % anemones.length]; if (an) { makeCreature(sp, an.x + R(-10, 10), an.y - 22, { x: an.x, y: an.y - 24, r: 22 }); } continue; }
        const big = sp.L > 100; const p = freeSpot(sp.area, big ? 60 : 24);
        makeCreature(sp, p[0], p[1], { x: p[0], y: p[1], r: sp.beh === 'hover' ? 50 : 0 });
      }
    }
    SPECIES.forEach(spawnSpecies);
    // freed animals join the world as normal creatures
    function addFreed(net) { const sp = SPM[net.sp]; const c = makeCreature(sp, net.x, net.y, { x: net.x, y: net.y, r: sp.beh === 'hover' ? 50 : 0 }); c.freedFrom = net.id; return c; }
    NETS.forEach(n => { if (freedSet.has(n.id)) addFreed(n); });

    /* ---------- waste & nets ---------- */
    const waste = [];
    WASTE_PLAN.forEach((plan, zi) => {
      const [area, count, types, val] = plan;
      for (let i = 0; i < count; i++) {
        const type = types[i % types.length], id = 'w' + zi + '_' + i;
        let x, y, onFloor = false;
        for (let tries = 0; tries < 8; tries++) {
          const p = type !== 'bag' ? floorSpot(area) : null;
          if (p && rng() < 0.8) { x = p[0]; y = p[1] - 6; onFloor = true; } else { const q = freeSpot(area, 22); x = q[0]; y = q[1]; onFloor = false; }
          if (!NETS.some(n => Math.hypot(n.x - x, n.y - y) < 120) && Math.hypot(x - BOAT_X, y) > 150) break;
        }
        if (!collectedSet.has(id)) waste.push({ id, type, x, y, ox: x, oy: y, val, onFloor, ph: rng() * TAU, rot: (rng() - 0.5) * 1.2, state: 'free' });
      }
    });
    let driftId = 0, driftT = 30;
    const nets = NETS.map(n => Object.assign({ prog: 0, freed: freedSet.has(n.id), wig: Math.random() * TAU }, n));

    /* ---------- particles ---------- */
    const parts = []; const MAXP = 260;
    function part(type, x, y, vx, vy, life, size, col) {
      let p = null; for (let i = 0; i < parts.length; i++) if (parts[i].life <= 0) { p = parts[i]; break; }
      if (!p) { if (parts.length >= MAXP) return null; p = {}; parts.push(p); }
      p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size; p.col = col || null; p.ph = Math.random() * TAU; return p;
    }
    const snow = []; for (let i = 0; i < 70; i++) snow.push({ x: Math.random(), y: Math.random(), z: 0.4 + Math.random() * 0.9, s: Math.random() < 0.15 ? 2 : 1.2 });
    const floats = [];
    function floatText(x, y, text, col) { floats.push({ x, y, text, col: col || '#fff', t: 0 }); if (floats.length > 12) floats.shift(); }
    const rocks = [];

    /* ---------- sub state ---------- */
    const sub = { x: BOAT_X + 30, y: 60, vx: 0, vy: 0, tilt: 0, faceS: 1, face: 1, spin: 0, battery: U('battery'), hull: 100, inv: 0, flash: 0, arm: null, thrust: 0 };
    let cargo = [];
    let camX = 0, camY = 0, shakeT = 0, shakeK = 0, time = 0;
    let lastZone = zoneAt(sub.y), bannerT = 0, hintTimer = 0, hintKey = '', cardT = 0;
    let scanTarget = null, scanT = 0, sonarT = 3, sonarRing = null, blips = [];
    let falling = 4, warnT = 0, lowWarned = 0, unloadQ = [], unloadT = 0, cutSndT = 0, creakT = 0;
    const moments = {};
    let ctxMode = 'scan', ctxObj = null;
    let frameN = 0, fpsAcc = 0, fpsN = 0, fps = 60;

    /* ---------- input ---------- */
    const keys = {};
    const joy = { on: false, id: null, bx: 0, by: 0, x: 0, y: 0, vx: 0, vy: 0 };
    let actHeld = false, actEdge = false;
    function onKey(e, down) {
      const k = e.key; if (hud.panel.classList.contains('on') || hud.ov.classList.contains('on')) { if (down && k === 'Escape') closePanel(); return; }
      const map = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'dn', s: 'dn', S: 'dn' };
      if (map[k]) { keys[map[k]] = down; e.preventDefault(); }
      if (k === ' ' || k === 'Enter' || k === 'e' || k === 'E') { if (down && !actHeld) actEdge = true; actHeld = down; e.preventDefault(); }
      if (down && (k === 'c' || k === 'C')) openPanel('catalog');
      if (down && (k === 'u' || k === 'U')) openPanel('upgrades');
    }
    const kd = e => onKey(e, true), ku = e => onKey(e, false);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    function ptrDown(e) {
      if (paused() || joy.on) return; e.preventDefault();
      const r = cv.getBoundingClientRect(); joy.on = true; joy.id = e.pointerId; joy.bx = joy.x = e.clientX - r.left; joy.by = joy.y = e.clientY - r.top; joy.vx = joy.vy = 0;
      try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    }
    function ptrMove(e) { if (!joy.on || e.pointerId !== joy.id) return; const r = cv.getBoundingClientRect(); joy.x = e.clientX - r.left; joy.y = e.clientY - r.top; let dx = joy.x - joy.bx, dy = joy.y - joy.by; const m = Math.hypot(dx, dy), R0 = 46; if (m > R0) { joy.bx += dx * (1 - R0 / m) * 0.35; joy.by += dy * (1 - R0 / m) * 0.35; dx = joy.x - joy.bx; dy = joy.y - joy.by; } const mm = Math.max(R0, Math.hypot(dx, dy)); joy.vx = dx / mm; joy.vy = dy / mm; }
    function ptrUp(e) { if (e.pointerId !== joy.id) return; joy.on = false; joy.vx = joy.vy = 0; }
    cv.addEventListener('pointerdown', ptrDown); cv.addEventListener('pointermove', ptrMove); cv.addEventListener('pointerup', ptrUp); cv.addEventListener('pointercancel', ptrUp);
    const actDown = e => { e.preventDefault(); e.stopPropagation(); if (!actHeld) actEdge = true; actHeld = true; try { hud.act.setPointerCapture(e.pointerId); } catch (er) { } };
    const actUp = e => { actHeld = false; };
    hud.act.addEventListener('pointerdown', actDown); hud.act.addEventListener('pointerup', actUp); hud.act.addEventListener('pointercancel', actUp); hud.act.addEventListener('lostpointercapture', actUp);
    root.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); UI.sound('click'); const p = b.dataset.p; if (p === 'rules') { setPause('rules', true); Kit.rules(s('rules'), s('rulesHtml')); watchModal('rules'); } else openPanel(p); }));
    hud.card.addEventListener('click', () => { if (hud.card.dataset.sp) openPanel('catalog', hud.card.dataset.sp); });
    // pause reasons
    const pauses = new Set(['start']); let hidden = document.hidden;
    const paused = () => pauses.size > 0 || hidden;
    function setPause(k, on) { const was = paused(); if (on) pauses.add(k); else pauses.delete(k); if (was && !paused()) { last = performance.now(); joy.on = false; joy.vx = joy.vy = 0; actHeld = false; } }
    // Kit.rules opens a UI.modal outside our root; resume when it is gone.
    let modalWatch = null;
    function watchModal(k) { clearInterval(modalWatch); const mr = document.getElementById('modal-root'); modalWatch = setInterval(() => { if (!mr || !mr.children.length) { clearInterval(modalWatch); setPause(k, false); } }, 250); }
    const onVis = () => { hidden = document.hidden; if (!hidden) last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    const onResize = () => resize(); window.addEventListener('resize', onResize);

    /* ---------- helpers ---------- */
    function shake(k) { shakeT = 0.3; shakeK = Math.max(shakeK, k); }
    function hint(key, text, dur) { if (hintKey === key && hintTimer > 0) { hintTimer = Math.max(hintTimer, dur || 2.5); return; } hintKey = key; hintTimer = dur || 2.5; hud.hint.textContent = text; hud.hint.classList.add('on'); }
    function banner(big, small) { hud.bannerB.textContent = big; hud.bannerS.textContent = small || ''; hud.banner.classList.remove('on'); void hud.banner.offsetWidth; hud.banner.classList.add('on'); bannerT = 3.2; }
    function cargoMax() { return U('cargo'); }
    function damage(n, why) {
      if (sub.inv > 0) return; sub.hull = Math.max(0, sub.hull - n); sub.inv = 1.1; sub.flash = 0.5; shake(1);
      ctx.sound(why === 'rock' ? 'crash' : why === 'sting' ? 'zap' : 'oof'); hint('dmg', s(why), 1.8);
      for (let i = 0; i < 8; i++) part('debris', sub.x, sub.y, R(-60, 60), R(-60, 30), 0.6, 2, '#ffd1a1');
      if (sub.hull <= 0) tow('hull');
    }
    function discover(sp) {
      if (d.found[sp.id]) return;
      d.found[sp.id] = Date.now(); const cr = 10 + sp.z * 2; d.credits += cr; save();
      ctx.sound('rare'); floatText(sub.x, sub.y - 30, `+${cr}`, '#7ff5e4');
      showCard(sp); checkGoals(); updateDots();
    }
    function showCard(sp) {
      const c = hud.card.querySelector('canvas'); portrait(c, sp, true);
      hud.card.querySelector('small').textContent = s('newSpecies'); hud.card.querySelector('b').textContent = nm(sp.name); hud.card.querySelector('p').textContent = nm(sp.fact);
      hud.card.dataset.sp = sp.id; hud.card.classList.add('on'); cardT = 6;
    }
    function portrait(c, sp, known) {
      const x = c.getContext('2d'), w = c.width, h = c.height; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
      // per-species framing: [width factor, height factor, x offset (×L), y offset (×L)]
      const PF = { whale: [1.25, 0.6, 0, 0], squid: [1.2, 0.45, 0.22, 0], swordfish: [1.2, 0.5, -0.1, 0], manta: [0.95, 1.0, 0, 0.12], sunfish: [1.0, 1.75, 0, 0], gulper: [1.15, 0.4, 0.45, 0], moray: [1.0, 0.9, -0.45, 0.2], otter: [1.2, 0.5, 0, 0.05], lionfish: [1.3, 1.1, 0, 0.1], turtle: [1.0, 0.7, -0.05, 0] };
      const pf = PF[sp.id] || [sp.beh === 'school' && sp.L < 20 ? 1.4 : 1.05, sp.orient === false ? 1.2 : 0.65, 0, sp.beh === 'crawl' || sp.beh === 'static' ? 0.25 : 0];
      const sc = Math.min((w * 0.8) / (sp.L * pf[0]), (h * 0.74) / (sp.L * pf[1]), sp.L < 20 ? 3.2 : 2.6);
      x.setTransform(sc, 0, 0, sc, w / 2 + pf[2] * sp.L * sc, h / 2 + pf[3] * sp.L * sc);
      const fake = { sp, ph: 1.2, out: 1 };
      try { sp.draw(x, fake, 1.2); } catch (e) { }
      x.setTransform(1, 0, 0, 1, 0, 0);
      if (!known) { x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(24,52,80,.55)'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over'; }
    }

    /* ---------- tow / repair ---------- */
    function tow(why) {
      if (pauses.has('tow')) return;
      setPause('tow', true); ctx.sound('fail');
      const partner = ctx.partner ? ctx.partner.name.replace(' (Beispiel)', '') : '';
      hud.ov.innerHTML = `<div class="ds-ovc"><div class="ds-ovi">🛟</div><h3>${esc(s('towTitle'))}</h3><p>${esc(s(why === 'hull' ? 'towHull' : 'towBat'))} ${esc(s('towText'))}</p>
        <button class="ds-btn ad" data-a="ad">${esc(s('towAd'))}<small>${esc(s('towAdSub', { p: partner }))}</small></button>
        <button class="ds-btn ghost" data-a="boat">${esc(s('towBoat'))}</button></div>`;
      hud.ov.classList.add('on');
      hud.ov.querySelector('[data-a="ad"]').addEventListener('click', async () => {
        UI.sound('click'); const ok = await ctx.ad();
        if (ok) { sub.hull = 100; sub.battery = U('battery'); sub.inv = 2; hud.ov.classList.remove('on'); setPause('tow', false); hint('rep', s('repaired'), 2.2); ctx.sound('checkpoint'); }
      });
      hud.ov.querySelector('[data-a="boat"]').addEventListener('click', () => {
        UI.sound('click');
        cargo.forEach(w => { w.state = 'free'; w.x = w.ox; w.y = w.oy; }); cargo = [];
        if (sub.arm && sub.arm.item) { sub.arm.item.state = 'free'; sub.arm.item.x = sub.arm.item.ox; sub.arm.item.y = sub.arm.item.oy; } sub.arm = null;
        sub.x = BOAT_X + 30; sub.y = 40; sub.vx = sub.vy = 0; sub.hull = 100; sub.battery = U('battery'); sub.inv = 2;
        camX = clamp(sub.x - W / 2, 0, WORLD_W - W); camY = clamp(sub.y - H * 0.45, -SKY, WORLD_H - H);
        hud.ov.classList.remove('on'); setPause('tow', false); ctx.sound('splash');
      });
    }

    /* ---------- goals ---------- */
    const resultQ = []; let resultOpen = false;
    function goalProgress(gl) {
      if (gl.k === 'delivered') return d.delivered; if (gl.k === 'species') return Object.keys(d.found).length; if (gl.k === 'freed') return freedSet.size; if (gl.k === 'depth') return d.maxY; return 0;
    }
    function checkGoals() {
      GOALS.forEach(gl => {
        if (d.goals.includes(gl.id)) return;
        if (goalProgress(gl) >= gl.n) { d.goals.push(gl.id); d.credits += gl.cr; if (gl.badge) ctx.badge(gl.badge); save(); resultQ.push(gl); }
      });
      if (resultQ.length && !resultOpen) setTimeout(showResult, 700);
    }
    function showResult() {
      if (resultOpen || !resultQ.length || destroyed) return;
      const gl = resultQ.shift(); resultOpen = true; setPause('result', true);
      const lines = [s('g_' + gl.id)]; if (gl.cr) lines.push(s('bonus', { n: gl.cr }));
      lines.push(s('stats', { d: d.delivered, f: freedSet.size, m: Math.round(depthM(d.maxY)) }));
      Kit.result(ctx, { result: 'win', title: s('goalDone'), lines, stars: gl.stars, againLabel: s('keepDiving'), onAgain: () => { resultOpen = false; setPause('result', false); updateDots(); if (resultQ.length) setTimeout(showResult, 600); } });
    }
    function updateDots() {
      const affordable = UPG.some(u => d.up[u.id] < 3 && d.credits >= u.cost[d.up[u.id]]);
      hud.dotUp.classList.toggle('on', affordable);
    }

    /* ---------- panels ---------- */
    let panelKind = null, catZone = -1;
    function openPanel(kind, focus) {
      if (pauses.has('start') || pauses.has('tow') || resultOpen) return;
      panelKind = kind; setPause('panel', true); UI.sound('open'); renderPanel(focus); hud.panel.classList.add('on');
    }
    function closePanel() { if (!panelKind) return; panelKind = null; hud.panel.classList.remove('on'); setPause('panel', false); UI.sound('close'); }
    hud.panel.addEventListener('click', e => { if (e.target === hud.panel) closePanel(); });
    function renderPanel(focus) {
      const sh = hud.sheet;
      const head = (title, sub2) => `<div class="ds-sh-head"><div><h3>${esc(title)}</h3>${sub2 ? `<small>${esc(sub2)}</small>` : ''}</div><button class="ds-x" aria-label="close">${IC.x}</button></div>`;
      if (panelKind === 'catalog') {
        const nFound = Object.keys(d.found).length;
        if (focus) {
          const sp = SPM[focus], known = !!d.found[sp.id];
          sh.innerHTML = head(s('catalog'), s('found', { n: nFound, m: SPECIES.length })) + `<div class="ds-detail z${sp.z}"><canvas width="300" height="170"></canvas><h4>${esc(known ? nm(sp.name) : '???')}</h4><span class="ds-chip">${esc(s('where'))}: ${esc(s('z' + sp.z))}</span><p>${esc(known ? nm(sp.fact) : s('unknown'))}</p><button class="ds-btn ghost" data-back>← ${esc(s('catalog'))}</button></div>`;
          portrait(sh.querySelector('canvas'), sp, known);
          sh.querySelector('[data-back]').addEventListener('click', () => { UI.sound('click'); renderPanel(); });
        } else {
          const list = SPECIES.filter(sp => catZone < 0 || sp.z === catZone);
          sh.innerHTML = head(s('catalog'), s('found', { n: nFound, m: SPECIES.length })) +
            `<div class="ds-prog"><i style="width:${nFound / SPECIES.length * 100}%"></i></div>
            <div class="ds-tabs"><button data-z="-1" class="${catZone < 0 ? 'on' : ''}">${esc(s('all'))}</button>${[0, 1, 2, 3, 4, 5].map(z => `<button data-z="${z}" class="${catZone === z ? 'on' : ''}">${z + 1}</button>`).join('')}</div>
            ${catZone >= 0 ? `<div class="ds-zname">${esc(s('z' + catZone))}</div>` : ''}
            <div class="ds-grid">${list.map(sp => `<button class="ds-sp z${sp.z} ${d.found[sp.id] ? '' : 'lock'}" data-sp="${sp.id}"><canvas width="132" height="88"></canvas><span>${esc(d.found[sp.id] ? nm(sp.name) : '???')}</span></button>`).join('')}</div>`;
          sh.querySelectorAll('.ds-sp').forEach(b => { portrait(b.querySelector('canvas'), SPM[b.dataset.sp], !!d.found[b.dataset.sp]); b.addEventListener('click', () => { UI.sound('tap'); renderPanel(b.dataset.sp); }); });
          sh.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => { UI.sound('toggle'); catZone = +b.dataset.z; renderPanel(); }));
        }
      } else if (panelKind === 'upgrades') {
        sh.innerHTML = head(s('upgrades'), `${s('credits')}: ${d.credits}`) + UPG.map(u => {
          const lv = d.up[u.id], maxed = lv >= 3, cost = maxed ? 0 : u.cost[lv];
          const fmt = v => u.id === 'hull' ? Math.round(depthM(v)) : v;
          const desc = u.id === 'sonar' ? s('u_sonar_d' + Math.min(3, lv + 1)) : s('u_' + u.id + '_d', { a: fmt(u.val[lv]), b: fmt(u.val[Math.min(3, lv + 1)]) });
          return `<div class="ds-up"><span class="ds-uic">${IC[u.ic]}</span><div class="ds-ub"><b>${esc(s('u_' + u.id))}</b><small>${esc(maxed ? s('lvl', { n: 3 }) : desc)}</small><span class="ds-pips">${[0, 1, 2].map(i => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span></div>
            <button class="ds-buy" data-u="${u.id}" ${maxed || d.credits < cost ? 'disabled' : ''}>${maxed ? esc(s('max')) : `${IC.gem}<span>${cost}</span>`}</button></div>`;
        }).join('');
        sh.querySelectorAll('[data-u]').forEach(b => b.addEventListener('click', () => buy(b.dataset.u)));
      } else if (panelKind === 'goals') {
        sh.innerHTML = head(s('goals'), s('stats', { d: d.delivered, f: freedSet.size, m: Math.round(depthM(d.maxY)) })) + GOALS.map(gl => {
          const done = d.goals.includes(gl.id), p = goalProgress(gl), pct = done ? 100 : gl.k === 'depth' ? clamp(p / gl.n, 0, 1) * 100 : clamp(p / gl.n, 0, 1) * 100;
          return `<div class="ds-goal ${done ? 'done' : ''}"><span class="ds-gck">${done ? '✓' : ''}</span><div><b>${esc(s('g_' + gl.id))}</b><span class="ds-prog sm"><i style="width:${pct}%"></i></span></div><em>${done ? esc(s('done')) : gl.k === 'depth' ? Math.round(depthM(Math.min(p, gl.n))) + ' m' : Math.min(p, gl.n) + '/' + gl.n}</em><span class="ds-gst">+${gl.stars} ★</span></div>`;
        }).join('');
      }
      const x = sh.querySelector('.ds-x'); if (x) x.addEventListener('click', closePanel);
    }
    function buy(id) {
      const u = UPG.find(q => q.id === id), lv = d.up[id]; if (lv >= 3) return;
      const cost = u.cost[lv]; if (d.credits < cost) { ctx.sound('bad'); ctx.toast(s('need', { n: cost - d.credits })); return; }
      const oldBat = U('battery');
      d.credits -= cost; d.up[id] = lv + 1; save();
      if (id === 'battery') sub.battery = Math.min(U('battery'), sub.battery + (U('battery') - oldBat));
      ctx.sound('buy'); ctx.toast(s('installed'), 'good'); renderPanel(); updateDots(); updateHud(true);
    }

    /* ---------- start overlay ---------- */
    function showStart() {
      const returning = d.plays > 1 || Object.keys(d.found).length > 0;
      hud.ov.innerHTML = `<div class="ds-ovc start"><canvas class="ds-ovsub" width="180" height="96"></canvas><h3>${esc(s(returning ? 'back' : 'welcome'))}</h3><p>${esc(s('intro'))}</p>
        ${returning ? `<p class="ds-ovst">${esc(s('stats', { d: d.delivered, f: freedSet.size, m: Math.round(depthM(d.maxY)) }))}</p>` : ''}
        <p class="ds-ovctl">${esc(s('ctrl'))}</p><button class="ds-btn pri" data-a="go">${esc(s(returning ? 'resume' : 'dive'))}</button></div>`;
      const sc = hud.ov.querySelector('canvas'), x = sc.getContext('2d'); x.setTransform(2.2, 0, 0, 2.2, 90, 50); drawSub(x, 0, 0, 0, 1, 0.5, true);
      hud.ov.classList.add('on');
      hud.ov.querySelector('[data-a="go"]').addEventListener('click', () => { UI.sound('click'); ctx.sound('splash'); hud.ov.classList.remove('on'); setPause('start', false); if (!returning) setTimeout(() => hint('first', s('first'), 4.5), 600); });
    }

    /* ---------- update ---------- */
    let last = performance.now(), raf = 0, destroyed = false;
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (paused()) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      fpsAcc += dt; fpsN++; if (fpsAcc > 1) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
      update(dt); render();
    }
    function inputVec() {
      let ix = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = (keys.dn ? 1 : 0) - (keys.u ? 1 : 0);
      if (joy.on) { ix += joy.vx; iy += joy.vy; }
      const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; } return [ix, iy];
    }
    function update(dt) {
      time += dt; frameN++;
      const [ix, iy] = inputVec(), maxV = U('motor');
      sub.thrust = Math.hypot(ix, iy);
      const acc = 3.2;
      sub.vx += (ix * maxV - sub.vx) * Math.min(1, acc * dt * (sub.thrust > 0.05 ? 1 : 0.55));
      sub.vy += (iy * maxV - sub.vy) * Math.min(1, acc * dt * (sub.thrust > 0.05 ? 1 : 0.55));
      if (sub.thrust < 0.05) sub.vy += Math.sin(time * 1.3) * 3 * dt;
      // currents
      let cur = 0; if (sub.x > 1470 && sub.x < 2860) for (const c of CURRENTS) if (sub.y > c.y0 && sub.y < c.y1) cur = c.v * Math.sin(Math.PI * (sub.y - c.y0) / (c.y1 - c.y0));
      // pressure limit
      const lim = U('hull');
      if (sub.y > lim) { sub.vy -= (sub.y - lim) * 6 * dt + 40 * dt; sub.hull -= 5 * dt; hint('press', s('pressure'), 2); creakT -= dt; if (creakT <= 0) { ctx.sound('crack'); creakT = 1.2; shake(0.4); } if (sub.hull <= 0) { sub.hull = 0; tow('hull'); } }
      const px = sub.x, py = sub.y;
      sub.x += (sub.vx + cur) * dt; sub.y += sub.vy * dt;
      if (sub.y < 14) { sub.y = 14; if (sub.vy < 0) sub.vy *= 0.3; }
      sub.x = clamp(sub.x, 30, WORLD_W - 40);
      // terrain collision
      let hit = 0;
      for (let pass = 0; pass < 2; pass++) {
        const dd = nearest(sub.x, sub.y);
        if (dd < SUB_R) {
          let nx = (sub.x - NO[0]) / (dd || 1), ny = (sub.y - NO[1]) / (dd || 1);
          if (nx * NO[2] + ny * NO[3] < 0 || dd < 0.01) { nx = NO[2]; ny = NO[3]; }
          sub.x += nx * (SUB_R - dd); sub.y += ny * (SUB_R - dd);
          const vn = sub.vx * nx + sub.vy * ny; if (vn < 0) { hit = Math.max(hit, -vn); sub.vx -= nx * vn * 1.35; sub.vy -= ny * vn * 1.35; }
        }
      }
      if (!water(sub.x, sub.y)) { sub.x = px; sub.y = py; sub.vx *= -0.3; sub.vy *= -0.3; }
      if (hit > 90) { ctx.sound('bounce'); shake(0.35); for (let i = 0; i < 5; i++) part('debris', sub.x - NO[2] * SUB_R, sub.y - NO[3] * SUB_R, R(-30, 30), R(-30, 10), 0.8, 2, '#cbb78f'); }
      // tilt and facing
      if (Math.abs(sub.vx) > 12) sub.face = sub.vx > 0 ? 1 : -1;
      sub.faceS += (sub.face - sub.faceS) * Math.min(1, dt * 7);
      const tTilt = clamp(sub.vy / maxV * 0.45, -0.45, 0.45) * (Math.abs(sub.faceS) > 0.3 ? Math.sign(sub.faceS) : 0) + Math.sin(time * 1.6) * 0.03;
      sub.tilt += (tTilt - sub.tilt) * Math.min(1, dt * 4);
      sub.spin += dt * (4 + sub.thrust * 22);
      sub.inv = Math.max(0, sub.inv - dt); sub.flash = Math.max(0, sub.flash - dt);
      // bubbles
      if (Math.random() < dt * (3 + sub.thrust * 26)) { const bx = sub.x - sub.faceS * (SUB_R + 8), by = sub.y + R(-3, 3); part('bubble', bx, by, -sub.faceS * R(10, 30), R(-30, -10), R(1.2, 2.4), R(1.5, 3.5)); }
      if (darkAt(sub.y) > 0.5 && sub.thrust > 0.3 && Math.random() < dt * 14) part('spark', sub.x - sub.faceS * (SUB_R + 6) + R(-6, 6), sub.y + R(-8, 8), R(-10, 10), R(-10, 10), R(0.6, 1.4), R(2, 4), Math.random() < 0.5 ? 'cyan' : 'green');
      // battery
      const drain = 0.5 + 1.7 * clamp(sub.y / 5000, 0, 1) + sub.thrust * 0.35;
      const bmax = U('battery'); let charging = false;
      const nearBoat = Math.hypot(sub.x - BOAT_X, sub.y - 18) < 130;
      if (nearBoat) { sub.battery = Math.min(bmax, sub.battery + 70 * dt); sub.hull = Math.min(100, sub.hull + 35 * dt); charging = true; }
      else if (sub.y < 34) { sub.battery = Math.min(bmax, sub.battery + 30 * dt); charging = true; }
      for (const st of STATIONS) if (Math.hypot(sub.x - st.x, sub.y - st.y) < 90) { sub.battery = Math.min(bmax, sub.battery + 45 * dt); sub.hull = Math.min(100, sub.hull + 15 * dt); charging = true; hint('st', s('station'), 1.2); }
      if (!charging) sub.battery -= drain * dt;
      const frac = sub.battery / bmax;
      if (!charging && frac < 0.25 && lowWarned < 1) { lowWarned = 1; ctx.sound('alarm'); hint('low', s('lowBat'), 3.5); }
      if (!charging && frac < 0.1 && lowWarned < 2) { lowWarned = 2; ctx.sound('alarm'); hint('low', s('lowBat'), 3.5); }
      if (frac > 0.4) lowWarned = 0;
      if (sub.battery <= 0) { sub.battery = 0; tow('bat'); }
      if (nearBoat && sub.hull < 100 && hintKey !== 'boat') hint('boat', s('boat'), 1.5);
      // zones & depth record
      const z = zoneAt(sub.y);
      if (sub.y > d.maxY) { d.maxY = sub.y; if (frameN % 30 === 0) checkGoals(); }
      if (z !== lastZone) { lastZone = z; const fresh = !d.zones.includes(z); if (fresh) { d.zones.push(z); save(); ctx.sound('checkpoint'); } banner(s('z' + z), fresh ? s('zoneNew') : `${Math.round(depthM(sub.y))} m`); checkGoals(); }
      // creatures, schools, nets, waste
      updateCreatures(dt);
      updateWaste(dt);
      updateNets(dt);
      updateHazards(dt);
      updateScan(dt);
      updateSonar(dt);
      updateContext(dt);
      updateArm(dt);
      updateUnload(dt);
      // particles
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]; if (p.life <= 0) continue; p.life -= dt;
        if (p.type === 'bubble') { p.vy -= 40 * dt; p.vx *= 0.97; p.x += (p.vx + Math.sin(time * 5 + p.ph) * 12) * dt; p.y += p.vy * dt; if (p.y < 2) p.life = 0; }
        else if (p.type === 'smoke') { p.x += (p.vx + Math.sin(time * 1.5 + p.ph) * 8) * dt; p.y += p.vy * dt; p.size += dt * 9; }
        else if (p.type === 'pebble' || p.type === 'debris') { p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
      }
      for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.4) floats.splice(i, 1); }
      // camera
      const tx = clamp(sub.x + sub.vx * 0.45 - W / 2, 0, WORLD_W - W), ty = clamp(sub.y + sub.vy * 0.35 - H * 0.47, -SKY, WORLD_H - H);
      const ce = 1 - Math.exp(-dt * 3.2); camX += (tx - camX) * ce; camY += (ty - camY) * ce;
      shakeT = Math.max(0, shakeT - dt); if (shakeT <= 0) shakeK = 0;
      // timers
      if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) hud.hint.classList.remove('on'); }
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) hud.banner.classList.remove('on'); }
      if (cardT > 0) { cardT -= dt; if (cardT <= 0) hud.card.classList.remove('on'); }
      // drift litter near the surface so the reef always has something to clean
      driftT -= dt; if (driftT <= 0) { driftT = 40; if (waste.filter(w => w.drift && w.state === 'free').length < 4) { const x = R(300, 2700), y = R(30, 220); if (water(x, y) && nearest(x, y) > 20) waste.push({ id: 'd' + (driftId++), type: rng() < 0.5 ? 'bag' : 'bottle', x, y, ox: x, oy: y, val: 4, onFloor: false, ph: rng() * TAU, rot: rng() - 0.5, state: 'free', drift: true }); } }
      if (frameN % 600 === 0) save();
      if (frameN % 6 === 0) updateHud();
      actEdge = false;
      // pre-bake one upcoming tile per frame
      prebake();
    }
    function steerAvoid(c, dt, ahead) {
      // every few frames look ahead; steer away from rock and the surface
      if ((frameN + c.idx) % 4 === 0) {
        const sp = Math.hypot(c.vx, c.vy) || 1, lx = c.x + c.vx / sp * ahead, ly = c.y + c.vy / sp * ahead;
        c.avoidX = 0; c.avoidY = 0;
        const dd = nearest(lx, ly);
        if (dd < ahead * 0.8 || !water(lx, ly)) { c.avoidX = NO[2] * 2.4; c.avoidY = NO[3] * 2.4; if (!water(lx, ly)) { c.avoidX *= 2; c.avoidY *= 2; } }
        if (ly < 26) c.avoidY += 1.6;
      }
    }
    function updateCreatures(dt) {
      const cx = camX + W / 2, cy = camY + H / 2;
      // schools
      for (const sc of schools) {
        if (Math.abs(sc.hx - cx) > 1000 || Math.abs(sc.hy - cy) > 1000) continue;
        const sp = sc.sp; sc.timer -= dt;
        if (sc.timer <= 0) { const p = freeSpot(sp.area, 30, 20); sc.tx = p[0]; sc.ty = p[1]; sc.timer = R(7, 13); }
        const dx = sc.tx - sc.hx, dy = sc.ty - sc.hy, dl = Math.hypot(dx, dy) || 1; sc.hx += dx / dl * Math.min(dl, sp.spd * 0.45 * dt); sc.hy += dy / dl * Math.min(dl, sp.spd * 0.45 * dt);
        const f = sc.fish, n = f.length, NR = Math.max(40, sp.L * 2.6), SR = sp.sep || Math.max(14, sp.L * 1.1);
        for (let i = 0; i < n; i++) {
          const a = f[i]; let ax = 0, ay = 0, cxs = 0, cys = 0, sx = 0, sy = 0, k = 0;
          for (let j = 0; j < n; j++) { if (i === j) continue; const b = f[j], ddx = b.x - a.x, ddy = b.y - a.y, d2 = ddx * ddx + ddy * ddy; if (d2 < NR * NR) { k++; ax += b.vx; ay += b.vy; cxs += b.x; cys += b.y; if (d2 < SR * SR) { const inv = 1 / (Math.sqrt(d2) + 0.1); sx -= ddx * inv; sy -= ddy * inv; } } }
          let fx = 0, fy = 0;
          if (k) { fx += (ax / k - a.vx) * 0.9 / sp.spd + ((cxs / k - a.x)) * 0.012 + sx * 1.4; fy += (ay / k - a.vy) * 0.9 / sp.spd + ((cys / k - a.y)) * 0.012 + sy * 1.4; }
          const hx = sc.hx - a.x, hy = sc.hy - a.y, hd = Math.hypot(hx, hy) || 1; fx += hx / hd * Math.min(1.2, hd / 120); fy += hy / hd * Math.min(1.2, hd / 120);
          const sdx = a.x - sub.x, sdy = a.y - sub.y, sd = Math.hypot(sdx, sdy); if (sd < 95 && sp.id !== 'dolphin') { fx += sdx / sd * 2.6; fy += sdy / sd * 2.6; }
          steerAvoid(a, dt, Math.max(24, sp.L)); fx += a.avoidX; fy += a.avoidY;
          a.vx += fx * sp.spd * 2.2 * dt; a.vy += fy * sp.spd * 2.2 * dt;
          moveSwimmer(a, dt, sp.spd);
        }
      }
      for (let i = 0; i < creatures.length; i++) {
        const c = creatures[i], sp = c.sp; if (c.school) continue;
        if (Math.abs(c.x - cx) > 1100 + sp.L || Math.abs(c.y - cy) > 1000 + sp.L) continue;
        c.flash = Math.max(0, c.flash - dt);
        switch (sp.beh) {
          case 'cruise': {
            c.t -= dt;
            if (c.t <= 0 || Math.hypot(c.tx - c.x, c.ty - c.y) < 40) { const p = freeSpot(c.freedFrom ? [c.home.x - 300, c.home.x + 300, Math.max(30, c.home.y - 200), c.home.y + 200] : sp.area, sp.L > 100 ? 70 : 24, 20); c.tx = p[0]; c.ty = p[1]; c.t = R(6, 12); }
            let fx = c.tx - c.x, fy = c.ty - c.y; const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl;
            steerAvoid(c, dt, Math.max(30, sp.L * 0.6)); fx += c.avoidX; fy += c.avoidY;
            if (sp.bump) { const sdx = c.x - sub.x, sdy = c.y - sub.y, sd = Math.hypot(sdx, sdy); if (sd < 140) { fx += sdx / sd * 0.6; fy += sdy / sd * 0.6; } }
            const spd = sp.spd * (sp.id === 'squid' ? 0.7 + Math.max(0, Math.sin(time * 1.4 + c.ph)) * 0.9 : 1);
            c.vx += (fx * spd - c.vx) * Math.min(1, dt * 0.9); c.vy += (fy * spd - c.vy) * Math.min(1, dt * 0.9);
            moveSwimmer(c, dt, spd * 1.2); break;
          }
          case 'hover': {
            c.t -= dt; if (c.t <= 0) { const r = c.home.r || 40; const a = R(0, TAU); c.tx = c.home.x + Math.cos(a) * r * R(0.2, 1); c.ty = c.home.y + Math.sin(a) * r * R(0.2, 0.8); if (!water(c.tx, c.ty) || nearest(c.tx, c.ty) < 14) { c.tx = c.home.x; c.ty = c.home.y; } c.t = R(1.5, 4); }
            let fx = c.tx - c.x, fy = c.ty - c.y; const fl = Math.hypot(fx, fy); if (fl > 1) { fx /= fl; fy /= fl; } else { fx = fy = 0; }
            if (sp.anchor === 'anemone') { const sd = Math.hypot(c.x - sub.x, c.y - sub.y); if (sd < 70) { fx += (c.home.x - c.x) * 0.05; fy += (c.home.y + 10 - c.y) * 0.05; } }
            c.vx += (fx * sp.spd - c.vx) * Math.min(1, dt * 1.5); c.vy += (fy * sp.spd - c.vy) * Math.min(1, dt * 1.5);
            c.x += c.vx * dt; c.y += c.vy * dt + Math.sin(time * 1.4 + c.ph) * 4 * dt;
            if (Math.abs(c.vx) > 3) c.face = c.vx > 0 ? 1 : -1; c.faceS += (c.face - c.faceS) * Math.min(1, dt * 4);
            c.ang = sp.orient === false ? Math.sin(time + c.ph) * 0.06 : clamp(Math.atan2(c.vy, Math.abs(c.vx) + 4), -0.4, 0.4);
            break;
          }
          case 'drift': {
            const pulse = Math.max(0, Math.sin(time * 2.6 + c.ph));
            c.t -= dt; if (c.t <= 0) { c.dir = R(-0.6, 0.6); c.t = R(3, 7); }
            c.vy = -pulse * sp.spd * 1.6 + 6; c.vx = (c.dir || 0) * sp.spd;
            if (c.y < (AREAS[sp.area] || AREA.reef)[2]) c.vy += 18; if (c.y > (AREAS[sp.area] || AREA.reef)[3]) c.vy -= 18;
            steerAvoid(c, dt, 30); c.vx += c.avoidX * 20; c.vy += c.avoidY * 20;
            c.x += c.vx * dt; c.y += c.vy * dt; c.ang = c.vx * 0.01;
            if (sp.alarm && Math.hypot(c.x - sub.x, c.y - sub.y) < 130) c.flash = 1;
            break;
          }
          case 'crawl': {
            c.t -= dt; if (c.t <= 0) { c.dir = rng() < 0.4 ? 0 : (rng() < 0.5 ? -1 : 1); c.t = R(2, 6); }
            if (c.dir) { const nx = c.x + c.dir * sp.spd * dt; const fy = floorBelow(nx, c.floorY - 30, 70); if (fy && Math.abs(fy - c.floorY) < 12) { c.x = nx; c.floorY = fy; c.y = fy - sp.L * 0.25; c.face = c.dir; } else c.dir = -c.dir; }
            c.faceS = c.face || 1; c.ang = 0; break;
          }
          case 'lurk': { const sd = Math.hypot(c.x - sub.x, c.y - sub.y); const target = sd < 80 ? 0.25 : 0.55 + Math.sin(time * 0.5 + c.ph) * 0.25; c.out += (target - c.out) * Math.min(1, dt * 2); break; }
          case 'surface': {
            c.t -= dt; if (c.t <= 0) { c.dir = R(-1, 1); c.t = R(3, 8); }
            c.x += (c.dir || 0) * sp.spd * dt; if (Math.abs(c.x - c.home.x) > c.home.r) c.dir = -Math.sign(c.x - c.home.x) * 0.6;
            c.y = 6 + Math.sin(time * 1.2 + c.ph) * 1.5; c.face = (c.dir || 1) > 0 ? 1 : -1; c.faceS += (c.face - c.faceS) * Math.min(1, dt * 3); c.ang = Math.sin(time * 1.2 + c.ph) * 0.05; break;
          }
        }
        // hazards from creatures
        if (sp.haz || sp.bump) {
          const sd = Math.hypot(c.x - sub.x, c.y - sub.y);
          if (sp.haz && sd < SUB_R + sp.L * 0.42) { damage(sp.haz, 'sting'); const k = 160 / (sd || 1); sub.vx += (sub.x - c.x) * k; sub.vy += (sub.y - c.y) * k; c.flash = 1; }
          if (sp.bump && sd < SUB_R + sp.L * 0.22 && Math.hypot(sub.vx - c.vx, sub.vy - c.vy) > 50) { damage(sp.bump, 'bump'); c.vx += (c.x - sub.x) / (sd || 1) * 160; c.vy += (c.y - sub.y) / (sd || 1) * 160; c.t = 0; }
        }
        // big moments
        if (sp.big && !moments[sp.id] && Math.hypot(c.x - sub.x, c.y - sub.y) < 360) { moments[sp.id] = 1; banner(nm(sp.name), s(sp.id)); ctx.sound('bell'); }
      }
    }
    function moveSwimmer(c, dt, maxS) {
      const sp = Math.hypot(c.vx, c.vy); if (sp > maxS) { c.vx *= maxS / sp; c.vy *= maxS / sp; }
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x > 1470 && c.x < 2860) for (const cu of CURRENTS) if (c.y > cu.y0 && c.y < cu.y1) c.x += cu.v * 0.5 * Math.sin(Math.PI * (c.y - cu.y0) / (cu.y1 - cu.y0)) * dt;
      if (c.y < 16) { c.y = 16; c.vy = Math.abs(c.vy) * 0.5; }
      if (!water(c.x, c.y)) { c.x -= c.vx * dt * 2; c.y -= c.vy * dt * 2; c.vx *= -0.5; c.vy *= -0.5; }
      if (Math.abs(c.vx) > 4) c.face = c.vx > 0 ? 1 : -1;
      c.faceS += (c.face - c.faceS) * Math.min(1, dt * 5);
      const mp = c.sp.maxPitch || 0.55; c.ang += (clamp(Math.atan2(c.vy, Math.abs(c.vx) + 1), -mp, mp) - c.ang) * Math.min(1, dt * 4);
    }
    function updateWaste(dt) {
      for (const w of waste) { if (w.state !== 'free') continue; if (!w.onFloor) { w.y = w.oy + Math.sin(time * 0.9 + w.ph) * 4; w.x = w.ox + Math.sin(time * 0.5 + w.ph) * 3; } }
    }
    function updateNets(dt) { for (const n of nets) { if (n.freed) continue; if (ctxObj !== n || !actHeld) n.prog = Math.max(0, n.prog - dt * 0.25); } }
    function updateHazards(dt) {
      // falling rocks near the vents
      if (sub.y > 4250 && sub.x > 1700 && sub.x < 2360) {
        falling -= dt;
        if (falling <= 0) {
          falling = R(2.6, 5); const x = sub.x + R(-110, 110) + sub.vx * 0.6;
          for (let i = 0; i < 6; i++) part('pebble', x + R(-14, 14), sub.y - 300 + R(-20, 20), R(-8, 8), R(30, 80), 2.2, R(1.5, 2.5), '#7a5a46');
          rocks.push({ x, y: sub.y - 320, vy: 20, r: R(8, 14), rot: 0, warn: 0.9 }); ctx.sound('rumble'); shake(0.25);
        }
      }
      for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i]; r.warn -= dt; if (r.warn > 0) continue;
        r.vy += 260 * dt; r.y += r.vy * dt; r.rot += dt * 3;
        if (Math.hypot(r.x - sub.x, r.y - sub.y) < r.r + SUB_R) { damage(15, 'rock'); burstRock(r); rocks.splice(i, 1); continue; }
        if (!water(r.x, r.y + r.r) || r.y > WORLD_H) { burstRock(r); rocks.splice(i, 1); }
      }
      // vent smoke
      if (sub.y > 4000) for (const ch of CHIMNEYS) if (Math.random() < dt * 9) part('smoke', ch.x + R(-4, 4), ch.y, R(-6, 6), R(-40, -24), R(2.5, 4), R(4, 7), Math.random() < 0.4 ? '#8a7466' : '#4e423c');
    }
    function burstRock(r) { for (let i = 0; i < 10; i++) part('debris', r.x, r.y, R(-70, 70), R(-90, -10), 0.9, R(1.5, 3.5), '#6b4c3a'); ctx.sound('brick'); }
    function updateScan(dt) {
      let best = null, bd = 1e9;
      for (const c of creatures) {
        if (d.found[c.sp.id]) continue;
        const reach = 92 + c.sp.L * 0.4; const dx = c.x - sub.x, dy = c.y - sub.y; if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
        const dd = Math.hypot(dx, dy); if (dd < reach && dd < bd) { bd = dd; best = c; }
      }
      if (best) { if (best.sp !== (scanTarget && scanTarget.sp)) scanT = 0; scanTarget = best; scanT += dt; if (scanT >= 1.5) { discover(best.sp); scanTarget = null; scanT = 0; } }
      else { scanTarget = null; scanT = Math.max(0, scanT - dt * 2); }
    }
    function updateSonar(dt) {
      const lv = d.up.sonar; for (let i = blips.length - 1; i >= 0; i--) { blips[i].t -= dt; if (blips[i].t <= 0) blips.splice(i, 1); }
      if (sonarRing) { sonarRing.r += dt * 520; if (sonarRing.r > sonarRing.max) sonarRing = null; }
      if (!lv) return;
      sonarT -= dt; if (sonarT > 0) return;
      sonarPing();
    }
    function sonarPing() {
      const lv = d.up.sonar; if (!lv) return;
      sonarT = [0, 7, 6, 5][lv]; const rad = UPG[3].val[lv];
      sonarRing = { r: 10, max: Math.min(rad, 700) }; ctx.sound('tick');
      const seen = {};
      for (const c of creatures) { if (d.found[c.sp.id] || seen[c.sp.id]) continue; const dd = Math.hypot(c.x - sub.x, c.y - sub.y); if (dd < rad) { seen[c.sp.id] = 1; blips.push({ x: c.x, y: c.y, ref: c, t: 4, k: 'sp' }); } }
      if (lv >= 2) for (const w of waste) if (w.state === 'free' && Math.hypot(w.x - sub.x, w.y - sub.y) < rad) blips.push({ x: w.x, y: w.y, t: 4, k: 'w' });
      if (lv >= 3) for (const n of nets) if (!n.freed && Math.hypot(n.x - sub.x, n.y - sub.y) < rad * 1.5) blips.push({ x: n.x, y: n.y, t: 4, k: 'n' });
    }
    function clawPos() { const ca = Math.cos(sub.tilt), sa = Math.sin(sub.tilt), lx = 6 * sub.faceS, ly = SUB_R - 1; return [sub.x + lx * ca - ly * sa, sub.y + lx * sa + ly * ca]; }
    function updateContext(dt) {
      let mode = 'scan', obj = null;
      // litter within reach wins (a quick grab), unless a net is already being cut
      if (!sub.arm) {
        const [cx, cy] = clawPos(); let bd = 64;
        for (const w of waste) { if (w.state !== 'free') continue; const dd = Math.hypot(w.x - cx, w.y - cy); if (dd < bd) { bd = dd; obj = w; } }
        if (obj) mode = cargo.length >= cargoMax() ? 'full' : 'grab';
      }
      for (const n of nets) { if (n.freed) continue; if (Math.hypot(n.x - sub.x, n.y - sub.y) < 88 && (mode !== 'grab' || (n.prog > 0 && actHeld))) { mode = 'cut'; obj = n; break; } }
      ctxMode = mode; ctxObj = obj;
      if (actEdge) {
        if (mode === 'grab') { sub.arm = { t: 0, phase: 'out', item: obj }; obj.state = 'grab'; ctx.sound('whoosh'); }
        else if (mode === 'full') { ctx.sound('bad'); hint('full', s('cargoFull'), 2.5); }
        else if (mode === 'scan') { if (d.up.sonar && sonarT < [0, 7, 6, 5][d.up.sonar] - 1.5) sonarPing(); else hint('scan', s('scanHint'), 2.5); }
      }
      if (mode === 'cut') {
        if (actHeld) { obj.prog += dt / 2; cutSndT -= dt; if (cutSndT <= 0) { ctx.sound('crack'); cutSndT = 0.32; } if (Math.random() < dt * 20) part('debris', obj.x + R(-20, 20), obj.y + R(-20, 20), R(-30, 30), R(-40, 0), 0.6, 1.6, '#d8d0b0'); if (obj.prog >= 1) freeNet(obj); }
        else if (hintKey !== 'net' || hintTimer <= 0) hint('net', s('netHint'), 1.5);
      }
    }
    function freeNet(n) {
      n.freed = true; freedSet.add(n.id); const sp = SPM[n.sp]; const c = addFreed(n); c.vx = (Math.random() < 0.5 ? -1 : 1) * sp.spd; c.vy = -20;
      d.credits += 20; ctx.sound('fanfare'); hint('freed', s('freed', { name: nm(sp.name) }), 3); floatText(n.x, n.y - 30, '+20', '#7ff5e4');
      for (let i = 0; i < 18; i++) part('bubble', n.x + R(-20, 20), n.y + R(-20, 20), R(-30, 30), R(-60, -20), R(1, 2), R(2, 4));
      // the cut net becomes a piece of litter (worth 15)
      const w = { id: 'net_' + n.id, type: 'net', x: n.x, y: n.y, ox: n.x, oy: n.y, val: 15, onFloor: false, ph: 0, rot: 0.2, state: 'free' };
      if (cargo.length < cargoMax()) { w.state = 'cargo'; cargo.push(w); } else waste.push(w);
      if (!d.found[sp.id]) discover(sp);
      save(); checkGoals();
    }
    function updateArm(dt) {
      const a = sub.arm; if (!a) return;
      a.t += dt / 0.22;
      if (a.phase === 'out' && a.t >= 1) { a.phase = 'in'; a.t = 0; ctx.sound('pop'); }
      else if (a.phase === 'in') { if (a.t >= 1) { a.item.state = 'cargo'; cargo.push(a.item); sub.arm = null; ctx.sound('coin'); floatText(sub.x, sub.y - 26, `${cargo.length}/${cargoMax()}`, '#ffe08a'); if (cargo.length >= cargoMax()) hint('full', s('cargoFull'), 3); } else { const [cx, cy] = clawPos(); a.item.x = lerp(a.ix, cx, a.t); a.item.y = lerp(a.iy, cy, a.t); } }
      if (a.phase === 'in' && a.t === 0) { a.ix = a.item.x; a.iy = a.item.y; }
      if (a.phase === 'in' && a.ix == null) { a.ix = a.item.x; a.iy = a.item.y; }
    }
    function updateUnload(dt) {
      const near = Math.hypot(sub.x - BOAT_X, sub.y - 18) < 130;
      if (near && cargo.length && !unloadQ.length) { unloadQ = cargo.slice(); cargo = []; unloadT = 0; }
      if (!unloadQ.length) return;
      unloadT -= dt; if (unloadT > 0) return; unloadT = 0.16;
      const w = unloadQ.shift(); w.state = 'done';
      const idx = waste.indexOf(w); if (idx >= 0) waste.splice(idx, 1);
      if (!w.drift && !w.id.startsWith('net_')) collectedSet.add(w.id);
      d.credits += w.val; d.delivered++; ctx.sound('coin', unloadQ.length ? 6 - unloadQ.length : 6);
      floatText(BOAT_X + R(-20, 20), -26, `+${w.val}`, '#ffe08a');
      for (let i = 0; i < 4; i++) part('bubble', sub.x + R(-10, 10), sub.y, R(-20, 20), R(-80, -40), 0.8, R(2, 3));
      if (!unloadQ.length) { save(); hint('unl', s('unload'), 2); checkGoals(); updateDots(); }
    }

    /* ---------- HUD ---------- */
    let hudCache = {};
    function updateHud(force) {
      const dm = Math.round(depthM(sub.y)), z = zoneAt(sub.y), bmax = U('battery');
      const set = (k, v, fn) => { if (force || hudCache[k] !== v) { hudCache[k] = v; fn(v); } };
      set('dm', dm, v => { hud.depthB.textContent = v.toLocaleString(LOCALE()) + ' m'; });
      set('z', z, v => { hud.depthS.textContent = s('z' + v); });
      const bp = Math.round(sub.battery / bmax * 100), hp = Math.round(sub.hull);
      set('bp', bp, v => { hud.batI.style.width = v + '%'; hud.bat.classList.toggle('low', v < 25); });
      set('hp', hp, v => { hud.hullI.style.width = v + '%'; hud.hull.classList.toggle('low', v < 30); });
      set('cr', d.credits, v => { hud.cred.textContent = v; });
      set('cg', cargo.length + '/' + cargoMax(), v => { hud.cargo.textContent = v; hud.cargo.parentElement.classList.toggle('full', cargo.length >= cargoMax()); });
      set('gm', Math.round(sub.y / 10), () => { hud.gmk.style.top = clamp(sub.y / WORLD_H * 100, 0, 100) + '%'; });
      set('gl', U('hull'), v => { hud.glim.style.top = clamp(v / WORLD_H * 100, 0, 100) + '%'; hud.glim.style.display = d.up.hull >= 3 ? 'none' : ''; });
      const mode = ctxMode;
      set('mode', mode, v => {
        hud.act.className = 'ds-act ' + (v === 'scan' ? (d.up.sonar ? 'sonar' : 'idle') : v);
        hud.actIc.innerHTML = v === 'cut' ? IC.cut : v === 'grab' || v === 'full' ? IC.claw : IC.radar;
        hud.actLb.textContent = s(v === 'scan' && d.up.sonar ? 'sonar' : v);
      });
      const ring = mode === 'cut' && ctxObj ? ctxObj.prog : 0;
      set('ring', Math.round(ring * 50), () => { hud.ring.style.strokeDashoffset = String(226 * (1 - ring)); hud.act.classList.toggle('cutting', ring > 0); });
    }

    /* ---------- render ---------- */
    function render() {
      const sx = shakeK ? (Math.random() - 0.5) * 6 * shakeK : 0, sy = shakeK ? (Math.random() - 0.5) * 6 * shakeK : 0;
      const cx = Math.round((camX + sx) * DPR) / DPR, cy = Math.round((camY + sy) * DPR) / DPR;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      const midY = cy + H / 2, dk = darkAt(midY);
      // water gradient
      const sy0 = Math.max(0, cy), y0 = (sy0 / WORLD_H) * 1024, y1 = ((cy + H) / WORLD_H) * 1024;
      g.drawImage(waterStrip, 0, y0, 1, Math.max(0.5, y1 - y0), 0, sy0 - cy, W, H - (sy0 - cy));
      if (cy < 0) drawSky(cx, cy);
      // god rays
      if (cy < 950) {
        const a = clamp(1 - (cy + H * 0.3) / 950, 0, 1) * 0.32;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
        for (let i = 0; i < 6; i++) { const x = ((i * 190 + 80 - cx * 0.35 + Math.sin(time * 0.25 + i * 1.7) * 26) % (W + 260) + W + 260) % (W + 260) - 130; g.save(); g.translate(x, -cy); g.transform(1, 0, -0.18 + Math.sin(time * 0.2 + i) * 0.04, 1, 0, 0); g.drawImage(rays, -70, 0, 140 + (i % 3) * 30, 760); g.restore(); }
        g.restore();
      }
      // parallax rocks (only below the surface)
      g.save(); if (cy < 0) { g.beginPath(); g.rect(0, -cy, W, H + cy); g.clip(); }
      for (let li = 0; li < PAR.length; li++) {
        const layer = PAR[li], pc = waterRGB(midY + (li ? 60 : 160), li ? 0.74 : 0.87); g.fillStyle = `rgb(${pc[0]},${pc[1]},${pc[2]})`;
        for (const sh of layer.shapes) {
          const x = sh.x - cx * layer.f, y = sh.y - cy * layer.f;
          if (x + sh.w < -20 || x - sh.w > W + 20 || y > H + 20 || y + sh.h < -20) continue;
          g.save(); g.translate(x, y); g.fill(sh.p); g.restore();
        }
      }
      g.restore();
      // world
      g.save(); g.translate(-cx, -cy);
      drawKelp(false);
      drawTiles(cx, cy);
      if (cy < 700) drawCaustics(cx, cy);
      drawAnemones();
      drawStations();
      drawBoat();
      drawCreatures(cx, cy, 0);
      drawWaste(cx, cy);
      drawNets(cx, cy);
      drawCreatures(cx, cy, 1);
      drawRocks();
      drawParticles(cx, cy, false);
      drawSubFull();
      drawKelp(true);
      drawTubes(cx, cy);
      drawSurface(cx, cy);
      g.restore();
      drawSnow(cx, cy, dk);
      // darkness mask
      if (dk > 0.02) drawMask(cx, cy, dk);
      // glows
      if (dk > 0.2) drawGlows(cx, cy, dk);
      // screen-space fx
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawFX(cx, cy);
      g.drawImage(vignette, 0, 0);
      if (sub.flash > 0 || sub.hull < 30 || sub.y > U('hull')) { const k = Math.max(sub.flash * 1.2, sub.hull < 30 ? (0.25 + Math.sin(time * 6) * 0.15) : 0, sub.y > U('hull') ? 0.35 + Math.sin(time * 8) * 0.15 : 0); g.save(); g.globalAlpha = clamp(k, 0, 0.6); g.strokeStyle = '#ff3355'; g.lineWidth = 16; g.strokeRect(0, 0, W, H); g.restore(); }
      drawJoystick();
    }
    function drawSky(cx, cy) {
      const h = -cy; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7cc8ee'); gr.addColorStop(1, '#d9f3fb'); g.fillStyle = gr; g.fillRect(0, 0, W, h);
      g.save(); g.globalAlpha = 0.9; const sx = W * 0.78 - cx * 0.05, sy = h - 110; const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 60); sg.addColorStop(0, 'rgba(255,253,230,1)'); sg.addColorStop(0.25, 'rgba(255,245,200,.8)'); sg.addColorStop(1, 'rgba(255,245,200,0)'); g.fillStyle = sg; g.fillRect(sx - 60, sy - 60, 120, 120); g.restore();
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 4; i++) { const x = ((i * 260 + 40 - cx * 0.2 + time * 6) % (W + 300) + W + 300) % (W + 300) - 150, y = h - 120 + (i % 2) * 34; ell(g, x, y, 34, 9); g.fill(); ell(g, x + 18, y - 6, 22, 10); g.fill(); ell(g, x - 16, y - 3, 18, 7); g.fill(); }
      const ix = 2650 - cx * 0.6; g.fillStyle = '#6aa7a0'; g.beginPath(); g.moveTo(ix - 80, h); g.quadraticCurveTo(ix - 30, h - 26, ix, h - 22); g.quadraticCurveTo(ix + 40, h - 30, ix + 90, h); g.fill();
    }
    function drawTiles(cx, cy) {
      const tx0 = Math.floor(cx / TILE), tx1 = Math.floor((cx + W) / TILE), ty0 = Math.floor((cy + YOFF) / TILE), ty1 = Math.floor((cy + H + YOFF) / TILE);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const t = getTile(tx, ty, true); if (t) g.drawImage(t, tx * TILE, ty * TILE - YOFF, TILE + 0.6, TILE + 0.6); }
    }
    function prebake() {
      if (frameN % 3) return;
      const ax = camX + W / 2 + sub.vx * 1.5, ay = camY + H / 2 + sub.vy * 1.5;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const tx = Math.floor((ax + dx * W * 0.8) / TILE), ty = Math.floor((ay + dy * H * 0.8 + YOFF) / TILE); if (tx < 0 || ty < 0) continue; if (getTile(tx, ty, false) === undefined) { getTile(tx, ty, true); return; } }
    }
    function drawCaustics(cx, cy) {
      if (!causticPat) causticPat = g.createPattern(caustic, 'repeat');
      const a = clamp(1 - (cy + H * 0.5) / 760, 0, 1) * 0.34; if (a <= 0.02) return;
      g.save(); g.beginPath(); g.rect(cx, 0, W, 800); g.clip(); g.clip(rockPath, 'evenodd');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = causticPat;
      g.globalAlpha = a; g.save(); g.translate(time * 9, time * 4); g.scale(2.2, 1.25); g.fillRect((cx - time * 9) / 2.2 - 10, (cy - time * 4) / 1.25 - 10, W / 2.2 + 20, (Math.min(H, 760 - cy)) / 1.25 + 20); g.restore();
      g.globalAlpha = a * 0.7; g.save(); g.translate(-time * 7, time * 3); g.scale(1.7, 1.0); g.fillRect((cx + time * 7) / 1.7 - 10, (cy - time * 3) - 10, W / 1.7 + 20, (Math.min(H, 760 - cy)) + 20); g.restore();
      g.restore();
    }
    function drawKelp(fg) {
      const x0 = camX - 60, x1 = camX + W + 60;
      for (const k of kelp) {
        if (k.fg !== fg || k.x < x0 || k.x > x1 || k.y - k.h > camY + H || k.y < camY) continue;
        const n = k.seg, sl = k.h / n; let x = k.x, y = k.y, a = -Math.PI / 2;
        const pts = KELP_PTS; pts.length = 0; pts.push(x, y);
        const pushS = clamp(1 - Math.abs(sub.x - k.x) / 70, 0, 1) * (sub.y < k.y && sub.y > k.y - k.h ? 1 : 0) * Math.sign(k.x - sub.x || 1);
        for (let i = 1; i <= n; i++) { const t = i / n; a = -Math.PI / 2 + Math.sin(time * 0.9 + k.ph + i * 0.35) * 0.09 * (0.4 + t) + pushS * 0.12 * t; x += Math.cos(a) * sl; y += Math.sin(a) * sl; pts.push(x, y); }
        const dark = fg ? 0.55 : 1;
        g.strokeStyle = fg ? '#2c3d14' : `hsl(${80 + k.hue * 20},${45}%,${26 * dark + 6}%)`; g.lineCap = 'round';
        g.lineWidth = fg ? 5 : 3.2; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke();
        g.fillStyle = fg ? 'rgba(52,72,22,.92)' : `hsl(${75 + k.hue * 25},50%,${34}%)`;
        for (let i = 2; i < n; i += 1) { const px = pts[i * 2], py = pts[i * 2 + 1], side = i % 2 ? 1 : -1, sw = Math.sin(time * 1.2 + k.ph + i) * 0.25; g.save(); g.translate(px, py); g.rotate(side * (1.0 + sw)); ell(g, 0, -9 * (fg ? 1.3 : 1), 3.2 * (fg ? 1.3 : 1), 10 * (fg ? 1.3 : 1)); g.fill(); g.restore(); if (i % 3 === 0) { g.fillStyle = fg ? '#4d5f1c' : '#a3a83a'; circ(g, px + side * 2, py, 2.2); g.fill(); g.fillStyle = fg ? 'rgba(52,72,22,.92)' : `hsl(${75 + k.hue * 25},50%,34%)`; } }
      }
    }
    function drawAnemones() {
      for (const an of anemones) {
        if (an.x < camX - 60 || an.x > camX + W + 60 || an.y < camY - 60 || an.y > camY + H + 60) continue;
        g.save(); g.translate(an.x, an.y);
        g.fillStyle = '#b4416b'; ell(g, 0, -4, 14, 6); g.fill();
        g.lineCap = 'round';
        for (let i = 0; i < 16; i++) { const bx = -12 + i * 1.6, a = -Math.PI / 2 + (i - 7.5) * 0.12 + Math.sin(time * 1.6 + i * 0.5 + an.ph) * 0.22; g.strokeStyle = i % 2 ? '#f6a6c1' : '#ffd0e0'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, -6); g.quadraticCurveTo(bx + Math.cos(a) * 9, -6 + Math.sin(a) * 9, bx + Math.cos(a) * 18, -6 + Math.sin(a) * 18); g.stroke(); g.fillStyle = '#fff0f6'; circ(g, bx + Math.cos(a) * 18, -6 + Math.sin(a) * 18, 1.8); g.fill(); }
        g.restore();
      }
    }
    function drawTubes(cx, cy) { /* tube worms are creatures; vents base glow drawn here */
      if (cy + H < 4500) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const ch of CHIMNEYS) { g.globalAlpha = 0.5 + Math.sin(time * 3 + ch.x) * 0.1; g.drawImage(glow.warm, ch.x - 30, ch.y - 30, 60, 60); }
      g.restore();
    }
    function drawStations() {
      for (const st of STATIONS) {
        if (Math.abs(st.x - camX - W / 2) > W || Math.abs(st.y - camY - H / 2) > H) continue;
        if (!st.fy) st.fy = floorBelow(st.x, st.y + 30, 1200) || st.y + 600;
        g.strokeStyle = 'rgba(200,220,230,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(st.x, st.y + 20); g.lineTo(st.x, st.fy); g.stroke();
        g.save(); g.translate(st.x, st.y + Math.sin(time + st.x) * 2);
        g.fillStyle = '#5e7487'; g.fillRect(-26, 10, 52, 10);
        const gr = g.createLinearGradient(0, -24, 0, 12); gr.addColorStop(0, '#f2f7fa'); gr.addColorStop(1, '#9fb3c2'); g.fillStyle = gr;
        g.beginPath(); g.arc(0, 10, 26, Math.PI, TAU); g.closePath(); g.fill();
        g.fillStyle = '#123a52'; for (let i = -1; i <= 1; i++) { circ(g, i * 12, 0, 4.5); g.fill(); }
        g.fillStyle = 'rgba(160,240,255,.9)'; for (let i = -1; i <= 1; i++) { circ(g, i * 12 - 1, -1, 2); g.fill(); }
        g.fillStyle = '#2e7d5b'; g.fillRect(-26, 8, 52, 3);
        g.strokeStyle = '#8fa3b2'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -16); g.lineTo(0, -26); g.stroke();
        g.fillStyle = Math.sin(time * 4 + st.x) > 0 ? '#5ff6ff' : '#2a8fa0'; circ(g, 0, -28, 3); g.fill();
        g.restore();
      }
    }
    function drawBoat() {
      if (camY > 260 || Math.abs(BOAT_X - camX - W / 2) > W) return;
      const b = Math.sin(time * 1.3) * 2.2, r = Math.sin(time * 1.1) * 0.03;
      g.save(); g.translate(BOAT_X, b); g.rotate(r);
      g.strokeStyle = 'rgba(40,50,60,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(52, -58); g.lineTo(52, 34); g.stroke();
      g.fillStyle = '#e8b04a'; g.beginPath(); g.moveTo(42, 34); g.lineTo(62, 34); g.lineTo(58, 50); g.lineTo(46, 50); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,80,20,.6)'; g.lineWidth = 0.8; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(44 + i * 6, 34); g.lineTo(47 + i * 5, 50); g.stroke(); }
      g.fillStyle = '#f7fafc'; g.beginPath(); g.moveTo(-78, -14); g.lineTo(84, -14); g.lineTo(70, 10); g.quadraticCurveTo(0, 16, -66, 10); g.closePath(); g.fill();
      g.fillStyle = '#2e7d5b'; g.beginPath(); g.moveTo(-76, -6); g.lineTo(80, -6); g.lineTo(77, -1); g.lineTo(-73, -1); g.closePath(); g.fill();
      g.fillStyle = '#22313f'; g.beginPath(); g.moveTo(-66, 10); g.quadraticCurveTo(0, 16, 70, 10); g.lineTo(66, 14); g.quadraticCurveTo(0, 20, -62, 14); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(-40, -38, 52, 24); g.fillStyle = '#d7e3ea'; g.fillRect(-40, -40, 56, 4);
      g.fillStyle = '#2d5d7b'; for (let i = 0; i < 4; i++) g.fillRect(-35 + i * 12, -32, 8, 8);
      g.strokeStyle = '#4b5b68'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(30, -14); g.lineTo(30, -50); g.lineTo(54, -58); g.stroke();
      g.strokeStyle = '#8b98a3'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-14, -40); g.lineTo(-14, -66); g.stroke();
      g.fillStyle = '#ff5a6e'; g.beginPath(); g.moveTo(-14, -66); g.lineTo(2, -61 + Math.sin(time * 4) * 1.5); g.lineTo(-14, -56); g.fill();
      g.fillStyle = '#2e7d5b'; g.font = 'bold 8px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('GoodPlay', -2, 5);
      g.restore();
    }
    function drawSurface(cx, cy) {
      if (cy > 60) return;
      g.save();
      const gr = g.createLinearGradient(0, 0, 0, 46); gr.addColorStop(0, 'rgba(220,250,255,.65)'); gr.addColorStop(1, 'rgba(220,250,255,0)');
      g.fillStyle = gr; g.fillRect(cx, 0, W, 46);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath();
      for (let x = cx - 10; x <= cx + W + 10; x += 12) { const y = Math.sin(x * 0.03 + time * 1.6) * 2 + Math.sin(x * 0.011 - time) * 1.5; x === cx - 10 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
      g.globalAlpha = 0.35; g.fillStyle = '#e8fbff'; for (let i = 0; i < 8; i++) { const x = cx + ((i * 97 + time * 20) % (W + 40)) - 20; g.fillRect(x, 3 + Math.sin(i + time) * 2, 18, 1.5); }
      g.restore();
    }
    function drawCreatures(cx, cy, layer) {
      for (let i = 0; i < creatures.length; i++) {
        const c = creatures[i], sp = c.sp; if ((sp.layer === 0 ? 0 : 1) !== layer) continue;
        const m = sp.L * (sp.id === 'squid' ? 1.4 : 0.8) + 20; if (c.x < cx - m || c.x > cx + W + m || c.y < cy - m || c.y > cy + H + m) continue;
        g.save(); g.translate(c.x, c.y);
        if (sp.orient !== false || sp.beh === 'hover' || sp.beh === 'surface' || sp.beh === 'crawl') { const fs = Math.abs(c.faceS) < 0.12 ? 0.12 * Math.sign(c.faceS || 1) : c.faceS; g.scale(fs, 1); }
        g.rotate(c.ang || 0);
        sp.draw(g, c, time + c.ph);
        g.restore();
      }
    }
    const WC = { bottle: ['#7fd1b9', '#2f8f78'], can: ['#e5484d', '#c9ced6'], bag: ['rgba(240,248,255,.55)', 'rgba(200,220,235,.8)'], rope: ['#d9a54a', '#a8742a'], crate: ['#4da3ff', '#2563eb'], net: ['#8fd0c6', '#2f7f75'], barrel: ['#c2611f', '#7a3a12'], tire: ['#22252b', '#4a4f58'] };
    function drawWasteItem(x, w, t) {
      const c = WC[w.type];
      switch (w.type) {
        case 'bottle': x.fillStyle = c[0]; x.globalAlpha = 0.85; x.beginPath(); x.moveTo(-9, -4); x.lineTo(4, -4); x.lineTo(8, -2); x.lineTo(12, -2); x.lineTo(12, 2); x.lineTo(8, 2); x.lineTo(4, 4); x.lineTo(-9, 4); x.quadraticCurveTo(-11, 0, -9, -4); x.fill(); x.globalAlpha = 1; x.fillStyle = '#2b6cb0'; x.fillRect(11, -2.4, 3, 4.8); x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(-7, -3, 9, 1.2); x.fillStyle = '#f5f5f5'; x.fillRect(-5, -4, 6, 8); break;
        case 'can': x.fillStyle = c[1]; x.fillRect(-7, -5, 14, 10); x.fillStyle = c[0]; x.fillRect(-6, -5, 12, 10); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(-3, -3, 6, 1.5); x.fillStyle = c[1]; ell(x, 7, 0, 1.5, 5); x.fill(); break;
        case 'bag': { const wv = Math.sin(t * 2) * 2; x.fillStyle = c[0]; x.strokeStyle = c[1]; x.lineWidth = 1; x.beginPath(); x.moveTo(-8, -10); x.quadraticCurveTo(-12 + wv, 0, -7, 10); x.quadraticCurveTo(0, 13 - wv, 7, 10); x.quadraticCurveTo(12 - wv, 0, 8, -10); x.lineTo(4, -6); x.lineTo(2, -12); x.lineTo(-2, -12); x.lineTo(-4, -6); x.closePath(); x.fill(); x.stroke(); break; }
        case 'rope': x.strokeStyle = c[0]; x.lineWidth = 2.6; x.lineCap = 'round'; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(i * 2 - 2, 0, 10 - i * 2, 5 - i, 0.2, 0, TAU); x.stroke(); } break;
        case 'crate': x.fillStyle = c[0]; x.fillRect(-10, -7, 20, 14); x.strokeStyle = c[1]; x.lineWidth = 1.5; x.strokeRect(-10, -7, 20, 14); x.beginPath(); for (let i = -1; i <= 1; i++) { x.moveTo(i * 6, -7); x.lineTo(i * 6, 7); } x.stroke(); break;
        case 'net': x.strokeStyle = c[0]; x.lineWidth = 1; x.beginPath(); for (let i = -2; i <= 2; i++) { x.moveTo(-12, i * 4 + Math.sin(t + i) * 1.5); x.quadraticCurveTo(0, i * 4 + 3, 12, i * 4 - 1); x.moveTo(i * 5, -9); x.quadraticCurveTo(i * 5 + 2, 0, i * 5 - 1, 9); } x.stroke(); x.fillStyle = '#ff8a3d'; circ(x, -11, -7, 2.4); x.fill(); break;
        case 'barrel': x.fillStyle = c[0]; x.fillRect(-8, -11, 16, 22); x.fillStyle = c[1]; x.fillRect(-8, -5, 16, 2); x.fillRect(-8, 4, 16, 2); x.fillStyle = 'rgba(80,40,10,.5)'; circ(x, 3, -8, 2.5); x.fill(); circ(x, -4, 8, 2); x.fill(); break;
        case 'tire': x.fillStyle = c[0]; ell(x, 0, 0, 12, 12); x.fill(); x.fillStyle = c[1]; ell(x, 0, 0, 6, 6); x.fill(); x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1.2; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; x.beginPath(); x.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); x.lineTo(Math.cos(a) * 11.5, Math.sin(a) * 11.5); x.stroke(); } break;
      }
    }
    function drawWaste(cx, cy) {
      for (const w of waste) {
        if (w.state === 'cargo' || w.state === 'done') continue;
        if (w.x < cx - 30 || w.x > cx + W + 30 || w.y < cy - 30 || w.y > cy + H + 30) continue;
        g.save(); g.translate(w.x, w.y); g.rotate(w.rot + (w.onFloor ? 0 : Math.sin(time * 0.8 + w.ph) * 0.15)); drawWasteItem(g, w, time + w.ph); g.restore();
        if (ctxObj === w && (ctxMode === 'grab' || ctxMode === 'full')) { g.save(); g.strokeStyle = ctxMode === 'full' ? 'rgba(255,120,120,.9)' : 'rgba(255,224,138,.95)'; g.lineWidth = 2; g.setLineDash([4, 4]); g.lineDashOffset = -time * 20; circ(g, w.x, w.y, 17 + Math.sin(time * 6) * 1.5); g.stroke(); g.restore(); }
      }
    }
    function drawNets(cx, cy) {
      for (const n of nets) {
        if (n.freed) continue; if (n.x < cx - 140 || n.x > cx + W + 140 || n.y < cy - 140 || n.y > cy + H + 140) continue;
        const sp = SPM[n.sp], k = Math.min(1, 60 / sp.L) * 1.1, wig = Math.sin(time * 5 + n.wig) * 0.08;
        g.save(); g.translate(n.x, n.y);
        g.save(); g.scale(k, k); g.rotate(wig); const fake = { sp, ph: n.wig, out: 1 }; sp.draw(g, fake, time * 0.6 + n.wig); g.restore();
        const r = 34; g.strokeStyle = 'rgba(160,220,200,.85)'; g.lineWidth = 1.1; g.beginPath();
        for (let i = -4; i <= 4; i++) { const yy = i * r / 4; g.moveTo(-r, yy + Math.sin(time + i) * 2); g.quadraticCurveTo(0, yy + 6 * Math.sin(time * 0.7 + i), r, yy - 2); const xx = i * r / 4; g.moveTo(xx + Math.sin(time + i) * 2, -r); g.quadraticCurveTo(xx + 6 * Math.sin(time * 0.8 + i), 0, xx - 2, r); }
        g.stroke();
        g.fillStyle = '#ff8a3d'; circ(g, -r, -r, 3.5); g.fill(); circ(g, r, -r + 4, 3.5); g.fill();
        if (n.prog > 0) { g.strokeStyle = '#ff6b8a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * n.prog); g.stroke(); }
        g.restore();
      }
    }
    function drawRocks() {
      for (const r of rocks) { if (r.warn > 0) continue; g.save(); g.translate(r.x, r.y); g.rotate(r.rot); g.fillStyle = '#5a4033'; g.beginPath(); for (let i = 0; i < 7; i++) { const a = i * TAU / 7, rr = r.r * (0.8 + ((i * 37) % 5) / 12); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.fillStyle = 'rgba(255,170,90,.35)'; circ(g, -r.r * 0.3, -r.r * 0.3, r.r * 0.3); g.fill(); g.restore(); }
    }
    function drawParticles(cx, cy) {
      for (const p of parts) {
        if (p.life <= 0 || p.type === 'spark') continue; if (p.x < cx - 20 || p.x > cx + W + 20 || p.y < cy - 20 || p.y > cy + H + 20) continue;
        const a = clamp(p.life / p.max, 0, 1);
        if (p.type === 'bubble') { g.strokeStyle = `rgba(230,250,255,${0.75 * a})`; g.lineWidth = 1; circ(g, p.x, p.y, p.size); g.stroke(); g.fillStyle = `rgba(255,255,255,${0.5 * a})`; circ(g, p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.3); g.fill(); }
        else if (p.type === 'smoke') { g.fillStyle = p.col; g.globalAlpha = 0.5 * a; circ(g, p.x, p.y, p.size); g.fill(); g.globalAlpha = 1; }
        else { g.fillStyle = p.col || '#ccc'; g.globalAlpha = a; g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); g.globalAlpha = 1; }
      }
    }
    function drawSubFull() {
      // grabber arm (world coords)
      const [bx, by] = clawPos(); let ex = bx + sub.faceS * 2, ey = by + 6, open = 0.25;
      if (sub.arm) { const a = sub.arm, t = a.phase === 'out' ? a.t : 1 - a.t, tx = a.phase === 'out' ? a.item.x : a.item.x, ty = a.phase === 'out' ? a.item.y : a.item.y; const e = t * t * (3 - 2 * t); ex = lerp(bx, tx, a.phase === 'out' ? e : 1); ey = lerp(by + 6, ty, a.phase === 'out' ? e : 1); open = a.phase === 'out' ? 0.6 : 0.1; if (a.phase === 'in') { ex = a.item.x; ey = a.item.y; } }
      const mx = (bx + ex) / 2 - sub.faceS * 6, my = (by + ey) / 2 + 8;
      g.strokeStyle = '#5f6f7d'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(mx, my); g.lineTo(ex, ey); g.stroke();
      g.fillStyle = '#8899a6'; circ(g, mx, my, 2.4); g.fill();
      const ang = Math.atan2(ey - my, ex - mx); g.save(); g.translate(ex, ey); g.rotate(ang); g.strokeStyle = '#4a5864'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(5, -5 - open * 6, 9, -2 - open * 4); g.moveTo(0, 0); g.quadraticCurveTo(5, 5 + open * 6, 9, 2 + open * 4); g.stroke(); g.restore();
      // cargo net basket under the sub shows how full it is
      drawSub(g, sub.x, sub.y, sub.tilt, sub.faceS, sub.spin, false);
      if (sub.inv > 0 && Math.floor(time * 16) % 2 === 0) { g.save(); g.globalAlpha = 0.35; g.fillStyle = '#ff6b8a'; circ(g, sub.x, sub.y, SUB_R + 2); g.fill(); g.restore(); }
    }
    const subParts = {};
    function drawSub(x, px, py, tilt, faceS, spin, still) {
      x.save(); x.translate(px, py); x.rotate(tilt); const fs = Math.abs(faceS) < 0.15 ? 0.15 * Math.sign(faceS || 1) : faceS; x.scale(fs, 1);
      const r = SUB_R;
      // propeller
      x.fillStyle = '#c4d3dc'; x.fillRect(-r - 6, -2, 6, 4);
      const pb = Math.cos(spin * 1.0), pb2 = Math.sin(spin * 1.0);
      x.fillStyle = '#e8eef2'; ell(x, -r - 7, -6 * pb, 2.2, 5 * Math.abs(pb) + 0.6); x.fill(); ell(x, -r - 7, 6 * pb2, 2.2, 5 * Math.abs(pb2) + 0.6); x.fill();
      x.fillStyle = '#7d93a3'; circ(x, -r - 7, 0, 2); x.fill();
      // fins
      x.fillStyle = '#2fb6a8'; x.beginPath(); x.moveTo(-r * 0.6, -r * 0.75); x.lineTo(-r * 1.15, -r * 1.15); x.lineTo(-r * 1.05, -r * 0.45); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(-r * 0.6, r * 0.75); x.lineTo(-r * 1.15, r * 1.15); x.lineTo(-r * 1.05, r * 0.45); x.closePath(); x.fill();
      // body
      x.fillStyle = cg(subParts, 'b' + (still ? 's' : ''), x, xx => { const gr = xx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.05); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#eef4f8'); gr.addColorStop(0.8, '#c3d6e2'); gr.addColorStop(1, '#8eaec2'); return gr; });
      circ(x, 0, 0, r); x.fill();
      // pearl sheen
      x.strokeStyle = 'rgba(255,200,230,.45)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, r * 0.82, -2.6, -1.6); x.stroke();
      x.strokeStyle = 'rgba(170,230,255,.5)'; x.beginPath(); x.arc(0, 0, r * 0.82, 0.6, 1.5); x.stroke();
      // accent band
      x.save(); circ(x, 0, 0, r); x.clip(); x.fillStyle = '#2fb6a8'; x.fillRect(-r * 0.62, -r, r * 0.26, r * 2); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(-r * 0.62, -r, r * 0.07, r * 2); x.restore();
      // headlamp
      x.fillStyle = '#5b6d7a'; x.fillRect(r * 0.72, r * 0.18, 6, 7); x.fillStyle = '#fff6c8'; circ(x, r * 0.72 + 6, r * 0.18 + 3.5, 2.6); x.fill();
      // porthole
      x.fillStyle = '#e6c27a'; circ(x, r * 0.3, -r * 0.12, r * 0.52); x.fill();
      x.fillStyle = cg(subParts, 'p' + (still ? 's' : ''), x, xx => { const gr = xx.createRadialGradient(r * 0.2, -r * 0.3, 1, r * 0.3, -r * 0.12, r * 0.45); gr.addColorStop(0, '#3fa3c4'); gr.addColorStop(1, '#0b3d57'); return gr; });
      circ(x, r * 0.3, -r * 0.12, r * 0.43); x.fill();
      x.strokeStyle = 'rgba(200,245,255,.85)'; x.lineWidth = 1.6; x.lineCap = 'round'; x.beginPath(); x.arc(r * 0.3, -r * 0.12, r * 0.3, -2.5, -1.4); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.7)'; circ(x, r * 0.43, -r * 0.33, 1.2); x.fill();
      // skid
      x.strokeStyle = '#6b7a88'; x.lineWidth = 2; x.beginPath(); x.moveTo(-r * 0.5, r * 0.85); x.lineTo(-r * 0.6, r * 1.12); x.lineTo(r * 0.3, r * 1.12); x.stroke();
      // beacon
      x.fillStyle = '#8fa3b2'; x.fillRect(-2, -r - 3, 3, 4);
      x.fillStyle = (still || Math.sin(time * 5) > 0) ? '#ff5a6e' : '#7a2a33'; circ(x, -0.5, -r - 4, 2.1); x.fill();
      x.restore();
    }
    function drawSnow(cx, cy, dk) {
      const a = 0.18 + dk * 0.35;
      g.fillStyle = cy < 400 ? 'rgba(255,255,240,1)' : 'rgba(230,240,255,1)';
      for (const p of snow) {
        p.y += 0.00004 * p.z * (1 + dk); if (p.y > 1) p.y -= 1;
        const x = ((p.x * (W + 40) - cx * p.z * 0.9 + Math.sin(time * 0.4 + p.x * 20) * 6) % (W + 40) + W + 40) % (W + 40) - 20;
        const y = ((p.y * (H + 40) - cy * p.z * 0.9) % (H + 40) + H + 40) % (H + 40) - 20;
        if (cy + y < 0) continue;
        g.globalAlpha = a * p.z; g.fillRect(x, y, p.s, p.s);
      }
      g.globalAlpha = 1;
    }
    function lampWorld() { const ca = Math.cos(sub.tilt), sa = Math.sin(sub.tilt), lx = (SUB_R * 0.72 + 8) * sub.faceS, ly = SUB_R * 0.18 + 3.5; return [sub.x + lx * ca - ly * sa, sub.y + lx * sa + ly * ca, sub.faceS > 0 ? sub.tilt : Math.PI + sub.tilt]; }
    function drawMask(cx, cy, dk) {
      const m = mg; m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, maskCv.width, maskCv.height);
      m.fillStyle = `rgba(1,6,16,${dk.toFixed(3)})`; m.fillRect(0, 0, maskCv.width, maskCv.height);
      m.globalCompositeOperation = 'destination-out';
      m.setTransform(MS, 0, 0, MS, -cx * MS, -cy * MS);
      m.globalAlpha = 0.9; m.drawImage(radial, sub.x - 62, sub.y - 62, 124, 124);
      const [lx, ly, la] = lampWorld(), LR = U('light');
      m.globalAlpha = 1; m.save(); m.translate(lx, ly); m.rotate(la); m.drawImage(cone, -4, -LR * 0.39, LR * 1.0, LR * 0.78); m.restore();
      m.globalAlpha = 0.9;
      for (const st of STATIONS) if (Math.abs(st.x - sub.x) < 700 && Math.abs(st.y - sub.y) < 700) m.drawImage(radial, st.x - 80, st.y - 80, 160, 160);
      if (cy + H > 4400) for (const ch of CHIMNEYS) m.drawImage(radial, ch.x - 110, ch.y - 70, 220, 220);
      for (const c of creatures) {
        const sp = c.sp; if (!sp.glows) continue; if (c.x < cx - 60 || c.x > cx + W + 60 || c.y < cy - 60 || c.y > cy + H + 60) continue;
        const big = sp.glows[sp.glows.length - 1]; const rr = Math.max(14, big[2] * 1.6);
        m.globalAlpha = 0.5 + (c.flash || 0) * 0.4; m.drawImage(radial, c.x - rr, c.y - rr, rr * 2, rr * 2);
      }
      m.globalAlpha = 1;
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.drawImage(maskCv, 0, 0, W, H);
    }
    function drawGlows(cx, cy, dk) {
      const k = clamp((dk - 0.2) / 0.5, 0, 1);
      g.setTransform(DPR, 0, 0, DPR, -cx * DPR, -cy * DPR);
      g.save(); g.globalCompositeOperation = 'lighter';
      // soft volumetric beam
      const [lx, ly, la] = lampWorld(), LR = U('light');
      g.globalAlpha = 0.07 * k; g.save(); g.translate(lx, ly); g.rotate(la); g.drawImage(cone, -4, -LR * 0.39, LR, LR * 0.78); g.restore();
      for (const gd of glowDots) { if (gd.x < cx - 20 || gd.x > cx + W + 20 || gd.y < cy - 20 || gd.y > cy + H + 20) continue; g.globalAlpha = k * (0.35 + 0.35 * Math.sin(time * 1.7 + gd.ph)); const r = gd.r * 2.4; g.drawImage(glow[gd.c], gd.x - r, gd.y - r, r * 2, r * 2); }
      for (const c of creatures) {
        const sp = c.sp; if (!sp.glows) continue; if (c.x < cx - 80 || c.x > cx + W + 80 || c.y < cy - 80 || c.y > cy + H + 80) continue;
        g.save(); g.translate(c.x, c.y); if (sp.orient !== false || sp.beh === 'hover') g.scale(Math.abs(c.faceS) < 0.12 ? 0.12 : c.faceS, 1); g.rotate(c.ang || 0);
        const fl = sp.alarm ? (c.flash > 0 ? (Math.sin(time * 18) > 0 ? 1 : 0.25) : 0.3) : (0.75 + 0.25 * Math.sin(time * 3 + c.ph));
        for (const gl of sp.glows) { const r = gl[2] * 2.2; g.globalAlpha = k * gl[4] * fl; g.drawImage(glow[gl[3]], gl[0] - r, gl[1] - r, r * 2, r * 2); }
        g.restore();
      }
      for (const p of parts) { if (p.life <= 0 || p.type !== 'spark') continue; const a = clamp(p.life / p.max, 0, 1); g.globalAlpha = k * a; g.drawImage(glow[p.col], p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4); }
      for (const st of STATIONS) { if (Math.abs(st.x - cx - W / 2) > W || Math.abs(st.y - cy - H / 2) > H) continue; g.globalAlpha = k * (Math.sin(time * 4 + st.x) > 0 ? 0.9 : 0.3); g.drawImage(glow.cyan, st.x - 16, st.y - 44, 32, 32); g.globalAlpha = k * 0.5; g.drawImage(glow.cyan, st.x - 40, st.y - 24, 80, 40); }
      if (Math.sin(time * 5) > 0) { g.globalAlpha = k * 0.8; const ca = Math.cos(sub.tilt), sa = Math.sin(sub.tilt), bx = sub.x + 0.5 * sa - (-SUB_R - 4) * sa * 0, by = sub.y - (SUB_R + 4) * ca; g.drawImage(glow.pink, sub.x + (SUB_R + 4) * sa - 8, by - 8, 16, 16); }
      g.restore();
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    function toScreen(x, y) { return [x - camX, y - camY]; }
    function drawFX(cx, cy) {
      // scan beam + ring
      if (scanTarget && scanT > 0) {
        const [ax, ay] = [sub.x - cx, sub.y - cy], [bx, by] = [scanTarget.x - cx, scanTarget.y - cy];
        g.save(); g.strokeStyle = 'rgba(127,245,228,.75)'; g.lineWidth = 1.5; g.setLineDash([3, 5]); g.lineDashOffset = -time * 30; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
        const rr = Math.max(16, scanTarget.sp.L * 0.45);
        g.strokeStyle = 'rgba(127,245,228,.3)'; g.lineWidth = 3; circ(g, bx, by, rr); g.stroke();
        g.strokeStyle = '#7ff5e4'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(bx, by, rr, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(scanT / 1.5, 0, 1)); g.stroke();
        g.restore();
      }
      // sonar ring and blips
      if (sonarRing) { g.save(); g.strokeStyle = `rgba(127,245,228,${0.5 * (1 - sonarRing.r / sonarRing.max)})`; g.lineWidth = 2; circ(g, sub.x - cx, sub.y - cy, sonarRing.r); g.stroke(); g.restore(); }
      for (const b of blips) {
        const x = (b.ref ? b.ref.x : b.x) - cx, y = (b.ref ? b.ref.y : b.y) - cy, a = clamp(b.t / 1.2, 0, 1), col = b.k === 'sp' ? '127,245,228' : b.k === 'w' ? '255,214,102' : '255,107,138';
        if (x > 10 && x < W - 10 && y > 10 && y < H - 10) { g.strokeStyle = `rgba(${col},${0.8 * a})`; g.lineWidth = 2; circ(g, x, y, 12 + Math.sin(time * 6) * 3); g.stroke(); }
        else edgeArrow(x, y, `rgba(${col},${0.9 * a})`, b.k === 'sp' ? '?' : b.k === 'w' ? '•' : '!');
      }
      // guidance arrow: cargo full → boat; battery low → nearest charge point
      const bf = sub.battery / U('battery');
      if (cargo.length >= cargoMax() || bf < 0.3) {
        let tx = BOAT_X, ty = 10, label = s('toBoat');
        if (bf < 0.3) { let bd = Math.hypot(sub.x - BOAT_X, sub.y) * 0.9; for (const st of STATIONS) { const dd = Math.hypot(st.x - sub.x, st.y - sub.y); if (dd < bd) { bd = dd; tx = st.x; ty = st.y; label = s('toStation'); } } if (label === s('toBoat') && sub.y > 260) { tx = sub.x; ty = 0; } }
        const x = tx - cx, y = ty - cy; if (x < 0 || x > W || y < 0 || y > H) edgeArrow(x, y, 'rgba(255,224,138,.95)', label);
      }
      // floating texts
      g.save(); g.font = '800 15px system-ui, sans-serif'; g.textAlign = 'center';
      for (const f of floats) { const a = 1 - f.t / 1.4; g.globalAlpha = a; g.lineWidth = 3; g.strokeStyle = 'rgba(5,25,45,.7)'; g.strokeText(f.text, f.x - cx, f.y - cy - f.t * 30); g.fillStyle = f.col; g.fillText(f.text, f.x - cx, f.y - cy - f.t * 30); }
      g.restore();
    }
    function edgeArrow(x, y, col, label) {
      const cx0 = W / 2, cy0 = H / 2, dx = x - cx0, dy = y - cy0, m = 26;
      const k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m - 50) / Math.abs(dy || 1e-6));
      const ax = cx0 + dx * k, ay = cy0 + dy * k + 10, ang = Math.atan2(dy, dx);
      g.save(); g.translate(ax, ay); g.fillStyle = 'rgba(5,25,45,.55)'; circ(g, 0, 0, 15); g.fill();
      g.rotate(ang); g.fillStyle = col; g.beginPath(); g.moveTo(14, 0); g.lineTo(4, -7); g.lineTo(4, 7); g.closePath(); g.fill(); g.rotate(-ang);
      g.font = '700 10px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(label.length > 3 ? label.slice(0, 1) : label, 0, 0);
      if (label.length > 3) { g.font = '700 10px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText(label, 0, 24); }
      g.restore();
    }
    function drawJoystick() {
      if (!joy.on) return;
      g.save(); g.globalAlpha = 0.9;
      g.fillStyle = 'rgba(8,28,48,.28)'; g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; circ(g, joy.bx, joy.by, 46); g.fill(); g.stroke();
      const kx = joy.bx + joy.vx * 46, ky = joy.by + joy.vy * 46; const gr = g.createRadialGradient(kx - 6, ky - 6, 2, kx, ky, 22); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#bfe9f5');
      g.fillStyle = gr; circ(g, kx, ky, 20); g.fill();
      g.restore();
    }

    /* ---------- debug hook ---------- */
    root.__game = {
      state: () => ({ x: Math.round(sub.x), y: Math.round(sub.y), zone: zoneAt(sub.y), depth: Math.round(depthM(sub.y)), battery: +sub.battery.toFixed(1), batteryMax: U('battery'), hull: Math.round(sub.hull), credits: d.credits, cargo: cargo.length, cargoMax: cargoMax(), up: Object.assign({}, d.up), found: Object.keys(d.found).length, species: SPECIES.length, delivered: d.delivered, freed: freedSet.size, goals: d.goals.slice(), wasteLeft: waste.filter(w => w.state === 'free' && !w.drift).length, paused: paused(), pauses: Array.from(pauses), fps, mode: ctxMode, maxDepthAllowed: Math.round(depthM(U('hull'))) }),
      teleport(z) { const i = typeof z === 'number' ? clamp(z | 0, 0, 5) : ['reef', 'kelp', 'open', 'twilight', 'trench', 'vents'].indexOf(z); const p = TP[Math.max(0, i)]; sub.x = p[0]; sub.y = p[1]; sub.vx = sub.vy = 0; camX = clamp(sub.x - W / 2, 0, WORLD_W - W); camY = clamp(sub.y - H * 0.47, -SKY, WORLD_H - H); return this.state(); },
      goto(x, y) { sub.x = x; sub.y = y; sub.vx = sub.vy = 0; camX = clamp(sub.x - W / 2, 0, WORLD_W - W); camY = clamp(sub.y - H * 0.47, -SKY, WORLD_H - H); return [sub.x, sub.y]; },
      discoverAll() { SPECIES.forEach(sp => { if (!d.found[sp.id]) d.found[sp.id] = Date.now(); }); save(); checkGoals(); return Object.keys(d.found).length; },
      credits(n) { d.credits += n | 0; save(); updateDots(); updateHud(true); return d.credits; },
      buy(id) { buy(id); return Object.assign({}, d.up); },
      refill() { sub.battery = U('battery'); sub.hull = 100; },
      action(hold) { actEdge = true; actHeld = !!hold; }, release() { actHeld = false; },
      nearestWaste() { let best = null, bd = 1e9; for (const w of waste) { if (w.state !== 'free') continue; const dd = Math.hypot(w.x - sub.x, w.y - sub.y); if (dd < bd) { bd = dd; best = w; } } return best && { id: best.id, x: Math.round(best.x), y: Math.round(best.y), type: best.type, dist: Math.round(bd) }; },
      wasteList() { return waste.filter(w => w.state === 'free').map(w => ({ id: w.id, x: Math.round(w.x), y: Math.round(w.y), z: zoneAt(w.y) })); },
      nets() { return nets.map(n => ({ id: n.id, x: n.x, y: n.y, freed: n.freed, prog: +n.prog.toFixed(2) })); },
      creatures(id) { return creatures.filter(c => !id || c.sp.id === id).map(c => ({ id: c.sp.id, x: Math.round(c.x), y: Math.round(c.y) })); },
      water: (x, y) => water(x, y), clearance: (x, y) => Math.round(nearest(x, y)),
      tileAlpha(x, y, fresh) { const tx = Math.floor(x / TILE), ty = Math.floor((y + YOFF) / TILE); if (fresh) tiles.delete(tx + ty * 64); const t = getTile(tx, ty, true); if (!t) return null; return t.getContext('2d').getImageData(Math.floor((x - tx * TILE) * RS), Math.floor((y + YOFF - ty * TILE) * RS), 1, 1).data[3]; },
      // deterministic simulation for tests (independent of rAF throttling)
      sim(sec) { const n = Math.round((sec || 0.5) * 60); for (let i = 0; i < n && !paused(); i++) update(1 / 60); render(); return this.state(); },
      start() { if (pauses.has('start')) { hud.ov.classList.remove('on'); setPause('start', false); } },
      openPanel, closePanel, damage: n => damage(n, 'rock'), drain() { sub.battery = 0.5; }
    };

    /* ---------- go ---------- */
    resize();
    camX = clamp(sub.x - W / 2, 0, WORLD_W - W); camY = clamp(sub.y - H * 0.47, -SKY, WORLD_H - H);
    updateHud(true); updateDots();
    showStart();
    render();
    raf = requestAnimationFrame(loop);

    return {
      destroy() {
        destroyed = true; cancelAnimationFrame(raf); clearInterval(modalWatch);
        window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVis);
        try { save(); } catch (e) { }
        tiles.clear(); delete root.__game;
      }
    };
  }

  Games.register({
    id: 'deepsea', icon: '🐠', partner: 'p2', tier: 'top', cat: 'adventure', isNew: true,
    name: L4('Tiefsee-Expedition', 'Deep Sea Expedition', 'Глубоководная экспедиция', 'Глибоководна експедиція'),
    tagline: L4('Tauche mit der Perle, räume Müll weg und entdecke 37 Meerestiere.', 'Dive in the Perle, clear litter and discover 37 sea creatures.', 'Ныряй на «Жемчужине», убирай мусор и открой 37 морских обитателей.', 'Пірнай на «Перлині», прибирай сміття й відкрий 37 морських мешканців.'),
    kicker: L4('Tauch-Abenteuer', 'Dive adventure', 'Подводное приключение', 'Підводна пригода'),
    badges: [
      { id: 'deepsea_clean', icon: '♻️', name: L4('Meeresputzer (40 Teile Müll)', 'Ocean cleaner (40 pieces of litter)', 'Чистильщик океана (40 предметов)', 'Прибиральник океану (40 предметів)') },
      { id: 'deepsea_catalog', icon: '🐋', name: L4('Meeresforscher (alle Arten)', 'Marine biologist (all species)', 'Морской биолог (все виды)', 'Морський біолог (усі види)') }
    ],
    thumb: thumbSvg, art: artSvg,
    mount: mountGame,
    _logic: { buildTerrain, depthM, zoneAt, darkAt, SPECIES, UPG, GOALS, WASTE_PLAN, NETS, HULL, ZONE_Y, STATIONS, TP }
  });
})();
