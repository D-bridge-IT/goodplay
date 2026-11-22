// Hand-drawn SVG art: scenes, sprites and thumbnails. Pure strings, no assets.
(function () {
  let uid = 0;
  const g = (id, from, to, vertical = true) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;
  const sky = (id, w, h) => `<defs>${g(id, '#bfe3ff', '#eef8ff')}</defs><rect width="${w}" height="${h}" fill="url(#${id})"/>`;
  const sun = (x, y, r) => `<g class="fx-sun"><circle cx="${x}" cy="${y}" r="${r + 6}" fill="#ffe08a" opacity=".45"/><circle cx="${x}" cy="${y}" r="${r}" fill="#ffd54f"/></g>`;
  let cloudN = 0;
  const cloud = (x, y, s) => `<g class="fx-cloud ${(cloudN++) % 2 ? 'slow' : ''}"><g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".95"><ellipse cx="0" cy="0" rx="16" ry="9"/><ellipse cx="12" cy="-4" rx="12" ry="9"/><ellipse cx="-12" cy="-2" rx="10" ry="7"/></g></g>`;
  const hills = (w, y) => `<path d="M0 ${y + 30} Q${w * .2} ${y} ${w * .4} ${y + 22} T${w * .8} ${y + 14} T${w + 20} ${y + 26} V${y + 60} H0Z" fill="#a9d88f"/><path d="M0 ${y + 42} Q${w * .3} ${y + 20} ${w * .55} ${y + 36} T${w + 10} ${y + 30} V${y + 70} H0Z" fill="#8cc96f"/>`;
  const water = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#7cc4ea"/><path class="fx-wave" d="M${x - 20} ${y + 10} q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#a8dcf5" stroke-width="2.5" fill="none"/><path class="fx-wave w2" d="M${x - 20} ${y + 24} q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#a8dcf5" stroke-width="2" fill="none" opacity=".7"/>`;

  /* ---------- trees ---------- */
  function tree(x, y, s, shade) {
    const c1 = shade ? '#2e7d5b' : '#3f9d4a', c2 = shade ? '#3b8f68' : '#56b25f';
    return `<g transform="translate(${x} ${y}) scale(${s})"><g class="fx-sway ${shade ? 's2' : ''}">
      <rect x="-4" y="-22" width="8" height="24" rx="2" fill="#8b5a2b"/>
      <circle cx="0" cy="-34" r="16" fill="${c1}"/><circle cx="-11" cy="-26" r="12" fill="${c2}"/><circle cx="11" cy="-27" r="12" fill="${c2}"/>
      <circle cx="-4" cy="-38" r="4" fill="#fff" opacity=".25"/></g></g>`;
  }
  function growingTree(p) {
    const id = 'gt' + (uid++);
    const s = 0.35 + (p / 100) * 0.65;
    let plant;
    if (p < 34) {
      plant = `<g transform="translate(85 120)"><g class="fx-sway"><path d="M0 0 V-26" stroke="#5aa843" stroke-width="4" stroke-linecap="round"/>
        <path d="M0 -14 q-18 -14 -22 -2 q10 10 22 2Z" fill="#6cc24a"/><path d="M0 -22 q18 -14 22 -2 q-10 10 -22 2Z" fill="#7fd45c"/></g></g>`;
    } else if (p < 67) {
      plant = `<g transform="translate(85 122) scale(${s + .2})"><g class="fx-sway"><rect x="-5" y="-40" width="10" height="42" rx="3" fill="#8b5a2b"/><circle cx="0" cy="-52" r="24" fill="#3f9d4a"/><circle cx="-14" cy="-40" r="14" fill="#56b25f"/><circle cx="14" cy="-42" r="14" fill="#56b25f"/></g></g>`;
    } else {
      plant = `<g transform="translate(85 124) scale(${s + .25})"><g class="fx-sway"><rect x="-7" y="-50" width="14" height="52" rx="3" fill="#8b5a2b"/><path d="M-7 -30 l-10 -10" stroke="#8b5a2b" stroke-width="4" stroke-linecap="round"/><path d="M7 -36 l10 -8" stroke="#8b5a2b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="0" cy="-70" r="28" fill="#2e7d5b"/><circle cx="-20" cy="-52" r="18" fill="#3f9d4a"/><circle cx="20" cy="-54" r="18" fill="#3f9d4a"/><circle cx="0" cy="-48" r="16" fill="#56b25f"/>
        <circle cx="-8" cy="-78" r="5" fill="#fff" opacity=".3"/><circle cx="12" cy="-60" r="3" fill="#e74c3c"/><circle cx="-16" cy="-58" r="3" fill="#e74c3c"/></g></g>`;
    }
    return `<svg viewBox="0 0 170 170" width="100%" height="100%">${sky(id, 170, 170)}${sun(138, 34, 14)}${cloud(40, 36, .7)}
      <ellipse cx="85" cy="128" rx="60" ry="14" fill="#8cc96f"/><ellipse cx="85" cy="126" rx="40" ry="8" fill="#6f4f2a" opacity=".55"/>${plant}
      <g stroke="#5aa843" stroke-width="2" stroke-linecap="round"><path d="M30 118 l-3 -8"/><path d="M34 118 l2 -7"/><path d="M136 120 l3 -8"/><path d="M132 120 l-2 -7"/></g></svg>`;
  }
  const treeSmall = () => `<svg viewBox="0 0 24 24" width="22" height="22">${tree(12, 23, .45)}</svg>`;

  /* ---------- animals (match-3) ---------- */
  const eyes = (c = '#2b2b2b') => `<circle cx="25" cy="30" r="3" fill="${c}"/><circle cx="39" cy="30" r="3" fill="${c}"/><circle cx="26" cy="29" r="1" fill="#fff"/><circle cx="40" cy="29" r="1" fill="#fff"/>`;
  const ANIMALS = {
    dog: `<ellipse cx="13" cy="34" rx="8" ry="15" fill="#8a5a3b"/><ellipse cx="51" cy="34" rx="8" ry="15" fill="#8a5a3b"/><circle cx="32" cy="34" r="20" fill="#c9915e"/><ellipse cx="32" cy="42" rx="11" ry="9" fill="#f3e0c8"/>${eyes()}<ellipse cx="32" cy="40" rx="4.5" ry="3.2" fill="#2b2b2b"/><path d="M27 46 q5 5 10 0" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="22" cy="24" rx="5" ry="3" fill="#fff" opacity=".2"/>`,
    cat: `<path d="M14 24 L12 6 L28 16Z" fill="#f0a04b"/><path d="M50 24 L52 6 L36 16Z" fill="#f0a04b"/><path d="M16 20 L15 10 L25 16Z" fill="#f7c9a0"/><path d="M48 20 L49 10 L39 16Z" fill="#f7c9a0"/><circle cx="32" cy="34" r="20" fill="#f0a04b"/><path d="M18 24 l6 4 M46 24 l-6 4 M32 14 v6" stroke="#d9823a" stroke-width="3" stroke-linecap="round"/>${eyes('#2f5d3a')}<path d="M29 39 h6 l-3 3Z" fill="#e26d8a"/><path d="M32 42 v3 M26 46 q6 3 12 0" stroke="#2b2b2b" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M10 40 h12 M10 46 h12 M42 40 h12 M42 46 h12" stroke="#2b2b2b" stroke-width="1.5" stroke-linecap="round"/>`,
    rabbit: `<ellipse cx="23" cy="16" rx="6.5" ry="15" fill="#c4cad1"/><ellipse cx="41" cy="16" rx="6.5" ry="15" fill="#c4cad1"/><ellipse cx="23" cy="17" rx="3" ry="10" fill="#f4b8c6"/><ellipse cx="41" cy="17" rx="3" ry="10" fill="#f4b8c6"/><circle cx="32" cy="38" r="18" fill="#d6dbe0"/>${eyes()}<ellipse cx="32" cy="41" rx="3.5" ry="2.5" fill="#e26d8a"/><path d="M32 43 v3 M27 47 q5 3 10 0" stroke="#2b2b2b" stroke-width="1.8" fill="none" stroke-linecap="round"/><rect x="29" y="46" width="6" height="5" rx="1" fill="#fff"/>`,
    hamster: `<circle cx="17" cy="20" r="8" fill="#d9a066"/><circle cx="47" cy="20" r="8" fill="#d9a066"/><circle cx="17" cy="20" r="4" fill="#f4c7a0"/><circle cx="47" cy="20" r="4" fill="#f4c7a0"/><circle cx="32" cy="36" r="20" fill="#e8b97e"/><ellipse cx="19" cy="42" rx="8" ry="6" fill="#f4c7a0"/><ellipse cx="45" cy="42" rx="8" ry="6" fill="#f4c7a0"/>${eyes()}<ellipse cx="32" cy="40" rx="3" ry="2.2" fill="#2b2b2b"/><path d="M28 45 q4 3 8 0" stroke="#2b2b2b" stroke-width="1.8" fill="none" stroke-linecap="round"/><rect x="29" y="44" width="6" height="4" rx="1" fill="#fff"/>`,
    paw: `<ellipse cx="32" cy="42" rx="14" ry="11" fill="#e05a7a"/><circle cx="17" cy="27" r="6" fill="#e05a7a"/><circle cx="27" cy="18" r="6" fill="#e05a7a"/><circle cx="37" cy="18" r="6" fill="#e05a7a"/><circle cx="47" cy="27" r="6" fill="#e05a7a"/><ellipse cx="28" cy="40" rx="3" ry="2" fill="#fff" opacity=".35"/>`
  };
  const animal = key => `<svg viewBox="0 0 64 64" width="100%" height="100%">${ANIMALS[key] || ''}</svg>`;

  /* ---------- buildings ---------- */
  const BUILDINGS = {
    house: `<path d="M6 32 L32 8 L58 32Z" fill="#c0392b"/><path d="M12 32 L32 14 L52 32Z" fill="#e74c3c"/><rect x="14" y="31" width="36" height="27" fill="#fbe9c8"/><rect x="27" y="42" width="10" height="16" rx="1" fill="#8b5a2b"/><circle cx="35" cy="50" r="1" fill="#f1c40f"/><rect x="17" y="35" width="8" height="8" fill="#9fd3ee" stroke="#fff" stroke-width="1.5"/><rect x="39" y="35" width="8" height="8" fill="#9fd3ee" stroke="#fff" stroke-width="1.5"/><rect x="44" y="12" width="6" height="12" fill="#7a4a2a"/>`,
    bakery: `<rect x="8" y="28" width="48" height="30" fill="#fde8c8"/><rect x="8" y="22" width="48" height="10" fill="#e74c3c"/><g fill="#fff"><rect x="14" y="22" width="6" height="10"/><rect x="26" y="22" width="6" height="10"/><rect x="38" y="22" width="6" height="10"/><rect x="50" y="22" width="6" height="10"/></g><path d="M8 32 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0" fill="#e74c3c"/><rect x="26" y="40" width="12" height="18" rx="1" fill="#8b5a2b"/><rect x="12" y="38" width="10" height="9" fill="#9fd3ee"/><rect x="42" y="38" width="10" height="9" fill="#9fd3ee"/><path d="M24 14 q8 -12 16 0 q-4 8 -8 0 q-4 8 -8 0Z" fill="none" stroke="#b5733a" stroke-width="3" stroke-linejoin="round"/>`,
    park: `<ellipse cx="32" cy="54" rx="28" ry="7" fill="#8cc96f"/>${tree(18, 52, .9, true)}${tree(44, 54, 1.05)}<rect x="24" y="48" width="18" height="3" rx="1" fill="#8b5a2b"/><rect x="26" y="51" width="2" height="5" fill="#8b5a2b"/><rect x="38" y="51" width="2" height="5" fill="#8b5a2b"/>`,
    school: `<rect x="4" y="26" width="56" height="32" fill="#f3c98b"/><path d="M20 26 L32 12 L44 26Z" fill="#c0392b"/><circle cx="32" cy="22" r="4" fill="#fff" stroke="#2b2b2b" stroke-width="1"/><path d="M32 22 v-3 M32 22 h2" stroke="#2b2b2b" stroke-width="1"/><g fill="#9fd3ee" stroke="#fff" stroke-width="1.2"><rect x="8" y="31" width="8" height="8"/><rect x="20" y="31" width="8" height="8"/><rect x="36" y="31" width="8" height="8"/><rect x="48" y="31" width="8" height="8"/><rect x="8" y="44" width="8" height="8"/><rect x="48" y="44" width="8" height="8"/></g><rect x="26" y="44" width="12" height="14" rx="1" fill="#8b5a2b"/><rect x="50" y="8" width="2" height="18" fill="#555"/><path d="M52 8 h10 l-3 4 l3 4 h-10Z" fill="#2e7d5b"/>`
  };
  const building = key => `<svg viewBox="0 0 64 64" width="100%" height="100%">${BUILDINGS[key] || ''}</svg>`;
  const grassTile = () => `<svg viewBox="0 0 64 64" width="100%" height="100%" opacity=".55"><g stroke="#6fb55a" stroke-width="2" stroke-linecap="round"><path d="M16 44 l-3 -8 M20 44 l1 -7 M44 40 l3 -8 M40 40 l-2 -6 M30 52 l1 -6"/></g></svg>`;

  /* ---------- scenes ---------- */
  function walker(x, y, flip) {
    return `<g transform="translate(${x} ${y}) ${flip ? 'scale(-1 1)' : ''}"><g class="fx-bob"><circle cx="0" cy="-26" r="6" fill="#f4c7a0"/><path d="M-6 -30 q6 -8 12 0" fill="#5d4037"/><rect x="-5" y="-20" width="10" height="14" rx="3" fill="#4f46e5"/><path d="M-3 -6 l-3 8 M3 -6 l4 8" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/><path d="M-5 -16 l-6 6 M5 -16 l7 2" stroke="#f4c7a0" stroke-width="3" stroke-linecap="round"/></g></g>`;
  }
  function bridgeScene(found, need, finished, fresh) {
    const id = 'bs' + (uid++);
    const w = (272 - 48) / need;
    let planks = '';
    for (let i = 0; i < need; i++) {
      const x = 48 + i * w;
      planks += i < found.length
        ? `<g class="${fresh === i ? 'fx-drop' : ''}"><rect x="${x + 2}" y="88" width="${w - 4}" height="14" rx="3" fill="#b5733a" stroke="#7a4a2a"/><rect x="${x + 4}" y="90" width="${w - 8}" height="3" rx="1" fill="#fff" opacity=".2"/><text x="${x + w / 2}" y="99" font-size="8.5" fill="#fff" text-anchor="middle" font-weight="700" font-family="Segoe UI, sans-serif">${found[i]}</text></g>`
        : `<rect x="${x + 2}" y="88" width="${w - 4}" height="14" rx="3" fill="#fff" opacity=".35" stroke="#7a4a2a" stroke-dasharray="4 3"/>`;
    }
    const rope = `<path d="M44 84 Q160 ${found.length >= need ? 70 : 100} 276 84" stroke="#7a4a2a" stroke-width="2" fill="none"/><path d="M44 78 Q160 ${found.length >= need ? 64 : 94} 276 78" stroke="#7a4a2a" stroke-width="1.5" fill="none" opacity=".6"/>`;
    const wx = finished ? 288 : (found.length ? 48 + Math.min(found.length, need) * w - w / 2 : 24);
    return `<svg viewBox="0 0 320 150" width="100%" height="150" style="display:block;border-radius:14px">${sky(id, 320, 150)}${sun(270, 30, 14)}${cloud(60, 32, .8)}${cloud(190, 22, .55)}${hills(320, 60)}
      ${water(0, 104, 320, 46)}
      <path d="M0 80 h48 v70 H0Z" fill="#8cc96f"/><path d="M0 96 h48 v54 H0Z" fill="#8b5a2b"/><path d="M272 80 h48 v70 h-48Z" fill="#8cc96f"/><path d="M272 96 h48 v54 h-48Z" fill="#8b5a2b"/>
      <rect x="40" y="76" width="8" height="40" rx="2" fill="#7a4a2a"/><rect x="272" y="76" width="8" height="40" rx="2" fill="#7a4a2a"/>
      ${rope}${planks}${walker(wx, 86, false)}
      ${finished ? `<text x="160" y="40" font-size="22" text-anchor="middle">🎉</text>` : ''}</svg>`;
  }
  function archScene(bricks, total, fresh) {
    const id = 'as' + (uid++);
    let b = '';
    for (let i = 0; i < total; i++) {
      const a = Math.PI - (i + 0.5) * Math.PI / total;
      const x = 160 + 112 * Math.cos(a), y = 118 - 64 * Math.sin(a);
      const deg = -(a * 180 / Math.PI - 90);
      b += i < bricks
        ? `<g transform="rotate(${deg} ${x} ${y})"><g class="${fresh && i === bricks - 1 ? 'fx-drop' : ''}"><rect x="${x - 13}" y="${y - 8}" width="26" height="16" rx="2" fill="#c0392b" stroke="#7b241c"/><rect x="${x - 11}" y="${y - 6}" width="22" height="4" rx="1" fill="#fff" opacity=".18"/></g></g>`
        : `<rect x="${x - 13}" y="${y - 8}" width="26" height="16" rx="2" transform="rotate(${deg} ${x} ${y})" fill="#fff" opacity=".35" stroke="#95a5a6" stroke-dasharray="4 3"/>`;
    }
    const stones = (x) => { let s = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) s += `<rect x="${x + 4 + c * 22 + (r % 2) * 6}" y="${84 + r * 16}" width="18" height="12" rx="2" fill="#aab4bb" stroke="#8a959c"/>`; return s; };
    return `<svg viewBox="0 0 320 150" width="100%" height="150" style="display:block;border-radius:14px">${sky(id, 320, 150)}${sun(48, 30, 13)}${cloud(230, 30, .8)}
      <path d="M0 90 L60 40 L110 86 L160 48 L220 90 L270 56 L320 92 V150 H0Z" fill="#b9c8d6"/><path d="M60 40 L48 52 L72 52Z M160 48 L148 60 L172 60Z M270 56 L258 68 L282 68Z" fill="#fff" opacity=".8"/>
      ${water(0, 118, 320, 32)}
      <rect x="0" y="80" width="54" height="70" fill="#9aa5ad"/><rect x="266" y="80" width="54" height="70" fill="#9aa5ad"/>${stones(0)}${stones(262)}
      <rect x="0" y="76" width="54" height="6" fill="#7f8c8d"/><rect x="266" y="76" width="54" height="6" fill="#7f8c8d"/>
      ${b}${bricks >= total ? `<rect x="54" y="52" width="212" height="6" fill="#7f8c8d"/>${walker(100, 52)}${walker(200, 52, true)}<text x="160" y="40" font-size="20" text-anchor="middle">🎉</text>` : ''}
      <text x="160" y="142" font-size="11" text-anchor="middle" fill="#fff" font-weight="700">${bricks}/${total}</text></svg>`;
  }
  const doctor = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><circle cx="32" cy="32" r="30" fill="#e0f2fe"/><path d="M12 62 q4 -22 20 -22 q16 0 20 22Z" fill="#fff"/><path d="M26 40 l6 8 l6 -8" fill="#9fd3ee"/><circle cx="32" cy="24" r="12" fill="#f4c7a0"/><path d="M20 22 q2 -12 12 -12 q10 0 12 12 q-4 -6 -12 -6 q-8 0 -12 6Z" fill="#5d4037"/><circle cx="28" cy="25" r="1.5" fill="#2b2b2b"/><circle cx="36" cy="25" r="1.5" fill="#2b2b2b"/><path d="M29 30 q3 2 6 0" stroke="#2b2b2b" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M24 44 q-2 10 6 12 M40 44 q2 10 -6 12" stroke="#2e7d5b" stroke-width="2" fill="none"/><circle cx="34" cy="57" r="3" fill="#2e7d5b"/><rect x="38" y="46" width="8" height="8" rx="1" fill="#e74c3c"/><path d="M42 47.5 v5 M39.5 50 h5" stroke="#fff" stroke-width="1.5"/></svg>`;
  const cafe = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M22 14 q-4 6 0 12 M32 10 q-4 6 0 12 M42 14 q-4 6 0 12" stroke="#b5733a" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/><path d="M14 30 h36 v12 q0 14 -18 14 q-18 0 -18 -14Z" fill="#fff" stroke="#b5733a" stroke-width="2"/><path d="M50 34 h5 q6 0 6 6 q0 6 -6 6 h-5" fill="none" stroke="#b5733a" stroke-width="2.5"/><ellipse cx="32" cy="36" rx="14" ry="3" fill="#8b5a2b"/><ellipse cx="32" cy="58" rx="20" ry="3" fill="#b5733a" opacity=".3"/></svg>`;
  const logo = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><defs>${g('lg', '#2e7d5b', '#4f46e5', false)}</defs><rect width="64" height="64" rx="18" fill="url(#lg)"/><path d="M32 50 C14 38 10 28 18 20 c6 -6 12 -2 14 2 c2 -4 8 -8 14 -2 c8 8 4 18 -14 30Z" fill="#fff"/><rect x="26" y="27" width="12" height="4" rx="2" fill="#4f46e5"/><rect x="30" y="23" width="4" height="12" rx="2" fill="#4f46e5"/></svg>`;
  const heroDeco = () => `<svg viewBox="0 0 120 120" width="120" height="120" style="position:absolute;right:-6px;top:-4px;opacity:.9"><g fill="#fff" opacity=".18"><circle cx="90" cy="30" r="26"/></g><g transform="translate(70 26)"><g class="hero-float"><circle r="14" fill="#ffd54f"/><circle r="10" fill="none" stroke="#f1b31c" stroke-width="2"/><text y="4.5" font-size="12" text-anchor="middle" font-weight="800" fill="#b8860b">€</text></g></g><g transform="translate(98 60)"><g class="hero-float f2"><circle r="11" fill="#ffd54f"/><circle r="7.5" fill="none" stroke="#f1b31c" stroke-width="2"/></g></g><g transform="translate(84 92)"><path class="hero-float f3" d="M0 10 C-10 2 -12 -4 -8 -8 c3 -3 7 -1 8 1 c1 -2 5 -4 8 -1 c4 4 2 10 -8 18Z" fill="#ff8fa3"/></g></svg>`;

  /* ---------- thumbnails for game cards (160×80) ---------- */
  const THUMBS = {
    wortbruecke() { const id = 't' + (uid++); return `${sky(id, 160, 80)}${sun(136, 16, 8)}${hills(160, 26)}${water(0, 56, 160, 24)}<rect x="0" y="44" width="28" height="36" fill="#8b5a2b"/><rect x="132" y="44" width="28" height="36" fill="#8b5a2b"/><path d="M26 46 Q80 60 134 46" stroke="#7a4a2a" stroke-width="2" fill="none"/>${[0, 1, 2, 3, 4].map(i => `<rect x="${30 + i * 20.5}" y="${49 + Math.sin((i + .5) / 5 * Math.PI) * 5}" width="18" height="7" rx="2" fill="${i < 3 ? '#b5733a' : '#fff'}" stroke="#7a4a2a" opacity="${i < 3 ? 1 : .6}"/>`).join('')}<text x="56" y="30" font-size="12" font-weight="800" fill="#4f46e5" font-family="Segoe UI">W</text><text x="72" y="24" font-size="12" font-weight="800" fill="#4f46e5" font-family="Segoe UI">O</text><text x="88" y="30" font-size="12" font-weight="800" fill="#4f46e5" font-family="Segoe UI">R</text><text x="104" y="24" font-size="12" font-weight="800" fill="#4f46e5" font-family="Segoe UI">T</text>`; },
    waldklicker() { const id = 't' + (uid++); return `${sky(id, 160, 80)}${sun(24, 18, 9)}${cloud(110, 18, .6)}<rect y="60" width="160" height="20" fill="#8cc96f"/><ellipse cx="80" cy="62" rx="90" ry="10" fill="#a9d88f"/>${tree(40, 66, 1, true)}${tree(80, 70, 1.3)}${tree(120, 66, 1, true)}${tree(140, 70, .7)}${tree(16, 70, .7)}`; },
    pfoten() { return `<rect width="160" height="80" fill="#fde7ec"/><g transform="translate(30 42) rotate(-20) scale(.9)">${ANIMALS.paw.replace(/#e05a7a/g, '#f4a3b5')}</g><g transform="translate(118 44) scale(.9)">${ANIMALS.paw.replace(/#e05a7a/g, '#f4a3b5')}</g><g transform="translate(50 10) scale(.95)">${ANIMALS.dog}</g><g transform="translate(90 6) scale(1)">${ANIMALS.cat}</g>`; },
    doktorquiz() { return `<rect width="160" height="80" fill="#e0f2fe"/><path d="M0 50 h40 l8 -18 l10 36 l10 -28 l6 10 h86" stroke="#0284c7" stroke-width="3" fill="none" stroke-linejoin="round"/><g transform="translate(96 8) scale(1)">${doctor()}</g><rect x="16" y="12" width="26" height="26" rx="6" fill="#e74c3c"/><path d="M29 17 v16 M21 25 h16" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`; },
    kleinstadt() { const id = 't' + (uid++); return `${sky(id, 160, 80)}${sun(140, 16, 9)}<rect y="62" width="160" height="18" fill="#8cc96f"/><g transform="translate(6 22) scale(.7)">${BUILDINGS.house}</g><g transform="translate(46 18) scale(.75)">${BUILDINGS.school}</g><g transform="translate(96 22) scale(.7)">${BUILDINGS.bakery}</g><g transform="translate(128 24) scale(.65)">${BUILDINGS.park}</g>`; },
    projekt() { const id = 't' + (uid++); return `${sky(id, 160, 80)}<path d="M0 50 L30 26 L60 48 L90 30 L130 52 L160 36 V80 H0Z" fill="#b9c8d6"/>${water(0, 64, 160, 16)}<rect y="46" width="26" height="34" fill="#9aa5ad"/><rect x="134" y="46" width="26" height="34" fill="#9aa5ad"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = Math.PI - (i + .5) * Math.PI / 8; const x = 80 + 54 * Math.cos(a), y = 62 - 30 * Math.sin(a); return `<rect x="${x - 7}" y="${y - 4}" width="14" height="9" rx="1.5" transform="rotate(${-(a * 180 / Math.PI - 90)} ${x} ${y})" fill="${i < 5 ? '#c0392b' : '#fff'}" stroke="${i < 5 ? '#7b241c' : '#95a5a6'}"/>`; }).join('')}`; }
  };
  const thumb = id => `<svg viewBox="0 0 160 80" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display:block">${THUMBS[id] ? THUMBS[id]() : ''}</svg>`;

  // Obby Rush feature illustration: blocky platforms, kill brick, spinner, bounce pad, jumping avatar, lava.
  function obbyScene() {
    const blk = (x, y, w, h, c, lite, dark) => `<path d="M${x + w} ${y} l8 -6 v${h} l-8 6z" fill="${dark}"/><path d="M${x} ${y} h${w} l8 -6 h-${w}z" fill="${lite}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
    return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" class="obby-art">
      <defs><linearGradient id="obSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#bae6fd"/></linearGradient>
      <linearGradient id="obLava" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset=".4" stop-color="#f97316"/><stop offset="1" stop-color="#b91c1c"/></linearGradient></defs>
      <rect width="320" height="170" rx="18" fill="url(#obSky)"/>
      <circle cx="262" cy="34" r="16" fill="#fff" opacity=".9" class="fx-sun"/>
      <g class="fx-cloud" opacity=".8"><circle cx="60" cy="38" r="12" fill="#fff"/><circle cx="76" cy="42" r="10" fill="#fff"/><circle cx="46" cy="44" r="9" fill="#fff"/></g>
      <g class="fx-cloud slow" opacity=".7"><circle cx="190" cy="56" r="9" fill="#fff"/><circle cx="202" cy="60" r="8" fill="#fff"/></g>
      ${blk(10, 110, 80, 46, '#60a5fa', '#a8ccfd', '#2f5fb3')}
      ${blk(126, 92, 70, 60, '#f472b6', '#f9b4d7', '#b24a84')}
      ${blk(230, 118, 80, 40, '#34d399', '#9fe8cd', '#1f8f69')}
      <rect x="160" y="78" width="26" height="14" fill="#ef4444"/><path d="M186 78 l6 -5 v14 l-6 5z" fill="#b91c1c"/><path d="M160 78 h26 l6 -5 h-26z" fill="#fca5a5"/><text x="173" y="89" font-size="10" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui">✕</text>
      <rect x="236" y="110" width="30" height="8" fill="#22c55e"/><path d="M243 116 l8 -5 l8 5" stroke="#dcfce7" stroke-width="2" fill="none"/>
      <g transform="translate(270 96)"><rect x="-3" y="0" width="6" height="22" fill="#475569"/><g class="ob-spin"><rect x="-30" y="-4" width="60" height="8" rx="4" fill="#1e293b"/><rect x="-30" y="-2" width="60" height="4" rx="2" fill="#f472b6"/></g><circle r="4" fill="#f8fafc"/></g>
      <g class="fx-bob" transform="translate(96 54) rotate(-12)"><rect x="4" y="34" width="7" height="12" fill="#22c55e" transform="rotate(-25 7 34)"/><rect x="13" y="34" width="7" height="12" fill="#22c55e" transform="rotate(20 16 34)"/><rect x="-1" y="18" width="6" height="12" fill="#fcd34d" transform="rotate(-60 2 18)"/><rect x="19" y="18" width="6" height="12" fill="#fcd34d" transform="rotate(50 22 18)"/><rect x="2" y="17" width="20" height="18" fill="#3b82f6"/><rect x="2" y="17" width="20" height="4" fill="#60a5fa"/><rect x="2" y="0" width="20" height="17" rx="4" fill="#fcd34d"/><rect x="8" y="6" width="3" height="3" fill="#1e293b"/><rect x="15" y="6" width="3" height="3" fill="#1e293b"/><path d="M9 11 q4 4 8 0" stroke="#1e293b" stroke-width="1.5" fill="none"/></g>
      <g fill="#fde047" stroke="#f59e0b" stroke-width="1.5"><circle cx="112" cy="40" r="5"/><circle cx="124" cy="30" r="5"/><circle cx="136" cy="26" r="5"/><circle cx="148" cy="30" r="5"/></g>
      <path d="M0 150 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 v20 h-320z" fill="url(#obLava)" class="fx-wave"/>
    </svg>`;
  }
  // Card scenes for the Phaser top games.
  const AV = (x, y, s, torso) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="4" y="34" width="7" height="12" fill="#22c55e"/><rect x="13" y="34" width="7" height="12" fill="#22c55e"/><rect x="-1" y="18" width="6" height="12" fill="#fcd34d"/><rect x="19" y="18" width="6" height="12" fill="#fcd34d"/><rect x="2" y="17" width="20" height="18" fill="${torso || '#3b82f6'}"/><rect x="2" y="0" width="20" height="17" rx="4" fill="#fcd34d"/><rect x="8" y="6" width="3" height="3" fill="#1e293b"/><rect x="15" y="6" width="3" height="3" fill="#1e293b"/><path d="M9 11 q4 4 8 0" stroke="#1e293b" stroke-width="1.5" fill="none"/></g>`;
  const CUBE = (x, y, w, h, c, lite, dark) => `<path d="M${x + w} ${y} l8 -6 v${h} l-8 6z" fill="${dark}"/><path d="M${x} ${y} h${w} l8 -6 h-${w}z" fill="${lite}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  function topScene(kind) {
    const head = (g1, g2, id) => `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs><rect width="320" height="170" rx="18" fill="url(#${id})"/>`;
    let body = '';
    if (kind === 'tower') body = head('#312e81', '#6366f1', 'tsk') + `
      <g class="fx-cloud" opacity=".5"><circle cx="60" cy="40" r="12" fill="#fff"/><circle cx="76" cy="44" r="10" fill="#fff"/></g>
      ${CUBE(40, 120, 60, 40, '#f472b6', '#f9b4d7', '#b24a84')}${CUBE(130, 92, 50, 70, '#60a5fa', '#a8ccfd', '#2f5fb3')}${CUBE(210, 64, 60, 100, '#34d399', '#9fe8cd', '#1f8f69')}${CUBE(100, 40, 44, 14, '#fbbf24', '#fde68a', '#b45309')}${CUBE(250, 26, 44, 14, '#a78bfa', '#d8ccfd', '#6d4bd6')}
      <path d="M0 150 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 v20 h-320z" fill="#f97316" class="fx-wave"/><path d="M0 158 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 v12 h-320z" fill="#dc2626"/>
      <g class="fx-bob">${AV(150, 44, 1.1, '#f97316')}</g>
      <text x="16" y="28" font-family="system-ui" font-weight="800" font-size="13" fill="#fff" opacity=".9">LAVA ↑</text>`;
    else if (kind === 'garden') body = head('#38bdf8', '#bae6fd', 'gsk') + `
      <circle cx="270" cy="34" r="16" fill="#fff" opacity=".9" class="fx-sun"/>
      <path d="M0 110 q80 -30 160 0 t160 0 v60 h-320z" fill="#86efac"/><rect x="0" y="128" width="320" height="42" fill="#65a30d"/>
      ${[30, 90, 150, 210, 270].map(x => `<rect x="${x - 22}" y="118" width="44" height="22" rx="4" fill="#92400e"/><rect x="${x - 22}" y="118" width="44" height="6" rx="3" fill="#b45309"/>`).join('')}
      <g class="fx-sway"><rect x="28" y="96" width="4" height="24" fill="#16a34a"/><circle cx="30" cy="92" r="10" fill="#ef4444"/><circle cx="26" cy="88" r="3" fill="#fff" opacity=".7"/></g>
      <g class="fx-sway s2"><rect x="88" y="100" width="4" height="20" fill="#16a34a"/><ellipse cx="80" cy="100" rx="9" ry="5" fill="#22c55e"/><ellipse cx="98" cy="96" rx="9" ry="5" fill="#22c55e"/></g>
      <g class="fx-sway"><rect x="148" y="86" width="4" height="34" fill="#16a34a"/><circle cx="150" cy="80" r="14" fill="#fde047"/><circle cx="150" cy="80" r="6" fill="#a16207"/></g>
      <g class="fx-sway s2"><rect x="208" y="104" width="4" height="16" fill="#16a34a"/><circle cx="206" cy="100" r="7" fill="#a855f7"/><circle cx="214" cy="104" r="6" fill="#a855f7"/><circle cx="210" cy="96" r="5" fill="#c084fc"/></g>
      <g class="fx-bob"><circle cx="270" cy="86" r="18" fill="#f472b6"/><text x="270" y="92" text-anchor="middle" font-size="16">✨</text></g>
      ${AV(236, 112, .9, '#22c55e')}`;
    else if (kind === 'pets') body = head('#fbcfe8', '#fde68a', 'psk') + `
      <path d="M0 120 q80 -20 160 0 t160 0 v50 h-320z" fill="#86efac"/>
      <g class="fx-bob"><ellipse cx="70" cy="96" rx="26" ry="32" fill="#fff"/><ellipse cx="70" cy="96" rx="26" ry="32" fill="none" stroke="#e2e8f0" stroke-width="3"/><path d="M52 96 l8 -8 l8 8 l8 -8 l8 8" stroke="#f472b6" stroke-width="3" fill="none"/><circle cx="60" cy="80" r="3" fill="#60a5fa"/><circle cx="82" cy="108" r="3" fill="#fbbf24"/></g>
      <g class="fx-bob"><rect x="130" y="80" width="40" height="40" rx="12" fill="#f472b6"/><path d="M134 84 l6 -14 l10 10z M166 84 l-6 -14 l-10 10z" fill="#ec4899"/><circle cx="143" cy="96" r="3" fill="#1e293b"/><circle cx="157" cy="96" r="3" fill="#1e293b"/><path d="M144 106 q6 5 12 0" stroke="#1e293b" stroke-width="2" fill="none"/></g>
      <g class="fx-bob"><rect x="190" y="86" width="36" height="36" rx="10" fill="#a78bfa"/><rect x="194" y="66" width="8" height="24" rx="4" fill="#8b5cf6"/><rect x="214" y="66" width="8" height="24" rx="4" fill="#8b5cf6"/><circle cx="201" cy="100" r="2.5" fill="#1e293b"/><circle cx="215" cy="100" r="2.5" fill="#1e293b"/></g>
      <g class="fx-bob"><rect x="240" y="92" width="32" height="30" rx="9" fill="#fbbf24"/><rect x="232" y="94" width="8" height="18" rx="4" fill="#d97706"/><rect x="272" y="94" width="8" height="18" rx="4" fill="#d97706"/><circle cx="250" cy="104" r="2.5" fill="#1e293b"/><circle cx="262" cy="104" r="2.5" fill="#1e293b"/></g>
      <g fill="#fde047" stroke="#f59e0b" stroke-width="1.5"><circle cx="110" cy="60" r="5"/><circle cx="180" cy="50" r="5"/><circle cx="250" cy="56" r="5"/></g>
      <text x="16" y="28" font-family="system-ui" font-weight="800" font-size="13" fill="#9d174d">LEGENDÄR ✦</text>`;
    else if (kind === 'island') body = head('#0ea5e9', '#7dd3fc', 'isk') + `
      <ellipse cx="160" cy="130" rx="150" ry="40" fill="#38bdf8" opacity=".6"/><ellipse cx="160" cy="124" rx="110" ry="30" fill="#fde68a"/><ellipse cx="160" cy="118" rx="80" ry="20" fill="#86efac"/>
      ${CUBE(120, 92, 30, 24, '#f8fafc', '#fff', '#cbd5e1')}<path d="M118 92 l15 -14 l15 14z" fill="#ef4444"/>
      <g class="fx-sway"><rect x="196" y="86" width="4" height="30" fill="#92400e"/><path d="M198 86 q-18 -12 -24 -2 q14 -2 24 2 q10 -12 24 -6 q-14 2 -24 6 q4 -16 0 -22 q-4 6 0 22" fill="#16a34a"/></g>
      <g class="ob-spin" style="transform-origin:60px 60px"><path d="M60 20 q30 20 0 40 q-30 20 0 40" stroke="#cbd5e1" stroke-width="6" fill="none" opacity=".8"/><path d="M60 20 q-30 20 0 40 q30 20 0 40" stroke="#94a3b8" stroke-width="6" fill="none" opacity=".8"/></g>
      <g class="fx-drop"><circle cx="250" cy="40" r="9" fill="#f97316"/><path d="M258 32 l24 -24" stroke="#fbbf24" stroke-width="4"/></g>
      ${AV(150, 70, .9, '#0ea5e9')}
      <text x="16" y="28" font-family="system-ui" font-weight="800" font-size="13" fill="#fff">ÜBERLEBE!</text>`;
    else return obbyScene();
    return body + '</svg>';
  }
  window.Art = { tree, growingTree, treeSmall, animal, building, grassTile, bridgeScene, archScene, doctor, cafe, logo, heroDeco, thumb, obbyScene, topScene };
})();
