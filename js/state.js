// Persistent state, economy and partner data (all demo numbers).
(function () {
  const KEY = 'goodplay_proto_v1';
  const DEFAULT = {
    stars: 0, donatedCents: 0, adsWatched: 0, gamesPlayed: 0,
    purchases: [], history: [], perGame: {}, perPartner: {},
    consent: null, ageOk: false, sound: true, avatar: '🦊',
    adfreeUntil: 0, hints: 2, puzzlesDone: 0, badges: {}
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return Object.assign(clone(DEFAULT), JSON.parse(raw)); } catch (e) { }
    return clone(DEFAULT);
  }
  let data = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { } }

  // Fictional partner organisations ("Beispiel" = example). Amounts in cents.
  const PARTNERS = {
    p1: { icon: '🌲', bg: '#dff1e7', name: 'Waldfreunde Ruhr e.V. (Beispiel)', cat: { de: 'Umwelt & Aufforstung', ru: 'Экология и лес' }, goal: 150000, raised: 98400 },
    p2: { icon: '🐾', bg: '#fde7ec', name: 'Tierheim Dortmund-Nord (Beispiel)', cat: { de: 'Tierschutz', ru: 'Защита животных' }, goal: 120000, raised: 61200 },
    p3: { icon: '🩺', bg: '#e0f2fe', name: 'Gesund im Quartier (Beispiel)', cat: { de: 'Gesundheit & Prävention', ru: 'Здоровье и профилактика' }, goal: 100000, raised: 43750 },
    p4: { icon: '📚', bg: '#e7e6fb', name: 'Lesestart Ruhrgebiet (Beispiel)', cat: { de: 'Bildung & Integration', ru: 'Образование и интеграция' }, goal: 90000, raised: 72100 },
    p5: { icon: '🏘️', bg: '#fef3c7', name: 'Spielplatz-Initiative Nordstadt (Beispiel)', cat: { de: 'Nachbarschaft', ru: 'Соседство' }, goal: 80000, raised: 25600 },
    p6: { icon: '☕', bg: '#ffedd5', name: 'Sprachcafé Dortmund · D-Bridge e.V.', cat: { de: 'Projekt des Monats', ru: 'Проект месяца' }, goal: 1200000, raised: 743000 }
  };

  // Economics from the Skizze: eCPM ≈ 10 € → ≈ 1 ct net per rewarded view → 0.5 ct to partners.
  const AD_NET_CENTS = 1;
  const AD_CHARITY_CENTS = 0.5;
  const STORE_FEE = 0.15;

  // Simulated community counter: base + slow growth (≈ 0.08 ct/s ≈ 69 €/day, matches 5k DAU scenario).
  const COMMUNITY_BASE = 1248037; // 12 480,37 €
  const COMMUNITY_EPOCH = 1795305600000; // 2026-11-22 00:00 UTC
  function communityCents() {
    const grown = Math.max(0, (Date.now() - COMMUNITY_EPOCH) / 1000) * 0.08;
    return COMMUNITY_BASE + grown + data.donatedCents;
  }

  function locale() { return LANG === 'ru' ? 'ru-RU' : 'de-DE'; }
  function fmtEuro(cents) {
    return (cents / 100).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
  function fmtCents(cents) {
    if (cents < 100) {
      const v = Math.round(cents * 10) / 10;
      return v.toLocaleString(locale(), { maximumFractionDigits: 1 }) + (LANG === 'ru' ? ' ц' : ' ct');
    }
    return fmtEuro(cents);
  }

  function level() { return Math.floor(Math.sqrt(data.stars / 40)) + 1; }
  function levelProgress() {
    const lv = level(); const lo = 40 * (lv - 1) * (lv - 1); const hi = 40 * lv * lv;
    return { lv, lo, hi, pct: Math.min(100, Math.round((data.stars - lo) / (hi - lo) * 100)) };
  }

  window.State = {
    get data() { return data; },
    save,
    reset() { data = clone(DEFAULT); save(); },
    PARTNERS, AD_NET_CENTS, AD_CHARITY_CENTS, STORE_FEE,
    communityCents, fmtEuro, fmtCents, level, levelProgress,
    addStars(n) {
      const before = level();
      data.stars += n; save();
      return { levelUp: level() > before, level: level() };
    },
    donate(cents, meta) {
      data.donatedCents += cents;
      if (meta.partnerId) data.perPartner[meta.partnerId] = (data.perPartner[meta.partnerId] || 0) + cents;
      data.history.unshift(Object.assign({ ts: Date.now(), cents }, meta));
      data.history = data.history.slice(0, 40);
      save();
    },
    game(id) { if (!data.perGame[id]) data.perGame[id] = {}; return data.perGame[id]; },
    unlockBadge(id) {
      if (data.badges[id]) return false;
      data.badges[id] = Date.now(); save(); return true;
    },
    hasPurchase(id) { return data.purchases.some(p => p.id === id); }
  };
})();
