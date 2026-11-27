// Fini's Forest Quest (id: platformer): an original side-scrolling jump'n'run for GoodPlay.
// Hero: Fini, a small red fox with a green scarf, restores the forest: glowing seeds, trapped animals,
// a sapling planted at every goal. Canvas 2D, everything drawn procedurally. The physics core (Core) is
// pure and DOM-free, so the same code can be run headless to verify that every level is completable.
(function () {
  'use strict';
  const TILE = 24, ROWS = 22, SEG_H = 14, STEP = 1 / 120;

  /* ======================================================================
     Strings (de, en, ru, uk)
     ====================================================================== */
  const STR = {
    de: {
      title: 'Finis Waldabenteuer', map: 'Weltkarte', play: 'Spielen', locked: 'Gesperrt', boss: 'Boss',
      world: 'Welt', seeds: 'Samen', animal: 'Tier', rescued: '{name} gerettet!', checkpoint: 'Laterne entzündet',
      paused: 'Pause', resume: 'Weiter', restart: 'Level neu starten', toMap: 'Zur Weltkarte', rules: 'Regeln',
      oops: 'Oh nein!', oopsText: 'Fini ist erschöpft. Weitermachen?', contAd: '▶ An der Laterne weiter (Werbung)',
      retry: 'Level neu starten', timeUp: 'Zeit abgelaufen!', planted: 'Setzling gepflanzt!',
      done: 'Level geschafft!', lineSeeds: 'Samen: {a} / {b}', lineAnimal: '{name}: gerettet', lineNoAnimal: 'Verstecktes Tier nicht gefunden',
      lineTime: 'Zeit: {t}', lineStars: 'Sterne im Level: {n} / 3', again: 'Weltkarte', next: 'Nächstes Level',
      leaf: 'Blatt! Sprung halten zum Gleiten', acorn: 'Eicheln! X oder 🌰 zum Werfen', berry: 'Sternbeere: unbesiegbar!', heart: 'Herz zurück!',
      bossHit: 'Treffer!', bossDown: 'Besiegt! Jetzt den Setzling pflanzen', wall: 'Wandsprung: an der Wand springen',
      keys: '←/→ oder A/D: laufen · Leertaste/W/↑: springen · X: werfen · P: Pause',
      tapStart: 'Tippe auf ein Level', total: 'Gesamt', bossName1: 'Müllmonster', bossName2: 'Smog-Golem', bossName3: 'Dosenkönig',
      rulesT: 'Finis Waldabenteuer',
      rulesHtml: '<p>Hilf Fini, dem kleinen Fuchs, den Wald zu heilen!</p><ul>' +
        '<li><b>Laufen und springen:</b> ◀ ▶ und die große Sprungtaste. Je länger du hältst, desto höher springt Fini.</li>' +
        '<li><b>Leuchtende Samen</b> sammeln – auch in den Holzkisten (von unten anstoßen).</li>' +
        '<li><b>Smog-Wolken</b> besiegst du durch Draufspringen. <b>Stachel-Müllkrabbler</b> nicht – ausweichen oder mit Eicheln bewerfen.</li>' +
        '<li><b>Extras:</b> 🍃 Blatt = gleiten (Sprung halten), 🌰 Eicheln = werfen, ⭐ Sternbeere = kurz unbesiegbar.</li>' +
        '<li>Jedes Level hat <b>3 Herzen</b>. Laternen sind Checkpoints. Ab Welt 2 kannst du an Wänden rutschen und abspringen.</li>' +
        '<li>In jedem Level ist ein <b>Tier versteckt</b>. Suche hinter Büschen und an hohen Stellen!</li>' +
        '<li><b>3 Sterne pro Level:</b> Ziel erreicht · alle Samen · Tier gerettet.</li></ul>'
    },
    en: {
      title: "Fini's Forest Quest", map: 'World map', play: 'Play', locked: 'Locked', boss: 'Boss',
      world: 'World', seeds: 'Seeds', animal: 'Animal', rescued: '{name} rescued!', checkpoint: 'Lantern lit',
      paused: 'Paused', resume: 'Resume', restart: 'Restart level', toMap: 'World map', rules: 'Rules',
      oops: 'Oh no!', oopsText: 'Fini is exhausted. Keep going?', contAd: '▶ Continue at the lantern (ad)',
      retry: 'Restart level', timeUp: 'Time is up!', planted: 'Sapling planted!',
      done: 'Level complete!', lineSeeds: 'Seeds: {a} / {b}', lineAnimal: '{name}: rescued', lineNoAnimal: 'Hidden animal not found',
      lineTime: 'Time: {t}', lineStars: 'Level stars: {n} / 3', again: 'World map', next: 'Next level',
      leaf: 'Leaf! Hold jump to glide', acorn: 'Acorns! Press X or 🌰 to throw', berry: 'Star-berry: invincible!', heart: 'Heart restored!',
      bossHit: 'Hit!', bossDown: 'Defeated! Now plant the sapling', wall: 'Wall jump: jump while sliding',
      keys: '←/→ or A/D: run · Space/W/↑: jump · X: throw · P: pause',
      tapStart: 'Tap a level', total: 'Total', bossName1: 'Trash Monster', bossName2: 'Smog Golem', bossName3: 'Can King',
      rulesT: "Fini's Forest Quest",
      rulesHtml: '<p>Help Fini, the little fox, heal the forest!</p><ul>' +
        '<li><b>Run and jump:</b> ◀ ▶ and the big jump button. The longer you hold, the higher Fini jumps.</li>' +
        '<li>Collect <b>glowing seeds</b> – some hide in wooden crates (bump them from below).</li>' +
        '<li>Defeat <b>smog blobs</b> by jumping on them. <b>Spiky litter crawlers</b> cannot be stomped – dodge them or throw acorns.</li>' +
        '<li><b>Power-ups:</b> 🍃 leaf = glide (hold jump), 🌰 acorns = throw, ⭐ star-berry = short invincibility.</li>' +
        '<li>Every level gives you <b>3 hearts</b>. Lanterns are checkpoints. From world 2 on you can slide down walls and jump off them.</li>' +
        '<li>Every level hides <b>one trapped animal</b>. Look behind bushes and up high!</li>' +
        '<li><b>3 stars per level:</b> reach the goal · all seeds · animal rescued.</li></ul>'
    },
    ru: {
      title: 'Лесное приключение Фини', map: 'Карта мира', play: 'Играть', locked: 'Закрыто', boss: 'Босс',
      world: 'Мир', seeds: 'Семена', animal: 'Зверёк', rescued: '{name}: спасён!', checkpoint: 'Фонарь зажжён',
      paused: 'Пауза', resume: 'Продолжить', restart: 'Начать уровень заново', toMap: 'На карту', rules: 'Правила',
      oops: 'Ой!', oopsText: 'Фини выбился из сил. Продолжить?', contAd: '▶ Продолжить у фонаря (реклама)',
      retry: 'Начать уровень заново', timeUp: 'Время вышло!', planted: 'Саженец посажен!',
      done: 'Уровень пройден!', lineSeeds: 'Семена: {a} / {b}', lineAnimal: '{name}: спасён', lineNoAnimal: 'Спрятанный зверёк не найден',
      lineTime: 'Время: {t}', lineStars: 'Звёзды уровня: {n} / 3', again: 'На карту', next: 'Следующий уровень',
      leaf: 'Листок! Держи прыжок, чтобы парить', acorn: 'Жёлуди! X или 🌰 — бросок', berry: 'Звёздная ягода: неуязвимость!', heart: 'Сердечко вернулось!',
      bossHit: 'Попал!', bossDown: 'Победа! Теперь посади саженец', wall: 'Прыжок от стены: прыгай, скользя по стене',
      keys: '←/→ или A/D: бег · Пробел/W/↑: прыжок · X: бросок · P: пауза',
      tapStart: 'Выбери уровень', total: 'Всего', bossName1: 'Мусорный монстр', bossName2: 'Смоговый голем', bossName3: 'Король банок',
      rulesT: 'Лесное приключение Фини',
      rulesHtml: '<p>Помоги лисёнку Фини вылечить лес!</p><ul>' +
        '<li><b>Бег и прыжки:</b> ◀ ▶ и большая кнопка прыжка. Чем дольше держишь, тем выше прыжок.</li>' +
        '<li>Собирай <b>светящиеся семена</b> — некоторые спрятаны в ящиках (ударь снизу).</li>' +
        '<li><b>Смоговые облачка</b> побеждаются прыжком сверху. <b>Колючих мусорных ползунов</b> так не победить — обходи их или бросай жёлуди.</li>' +
        '<li><b>Бонусы:</b> 🍃 листок — парение (держи прыжок), 🌰 жёлуди — бросок, ⭐ звёздная ягода — недолгая неуязвимость.</li>' +
        '<li>На каждый уровень — <b>3 сердечка</b>. Фонари — контрольные точки. Со 2-го мира можно скользить по стенам и отталкиваться от них.</li>' +
        '<li>На каждом уровне спрятан <b>один зверёк</b>. Ищи за кустами и наверху!</li>' +
        '<li><b>3 звезды за уровень:</b> финиш · все семена · зверёк спасён.</li></ul>'
    },
    uk: {
      title: 'Лісова пригода Фіні', map: 'Мапа світу', play: 'Грати', locked: 'Закрито', boss: 'Бос',
      world: 'Світ', seeds: 'Насіння', animal: 'Звірятко', rescued: '{name}: врятовано!', checkpoint: 'Ліхтар засвічено',
      paused: 'Пауза', resume: 'Продовжити', restart: 'Почати рівень знову', toMap: 'На мапу', rules: 'Правила',
      oops: 'Ой!', oopsText: 'Фіні знесилився. Продовжити?', contAd: '▶ Продовжити біля ліхтаря (реклама)',
      retry: 'Почати рівень знову', timeUp: 'Час вийшов!', planted: 'Саджанець посаджено!',
      done: 'Рівень пройдено!', lineSeeds: 'Насіння: {a} / {b}', lineAnimal: '{name}: врятовано', lineNoAnimal: 'Сховане звірятко не знайдено',
      lineTime: 'Час: {t}', lineStars: 'Зірки рівня: {n} / 3', again: 'На мапу', next: 'Наступний рівень',
      leaf: 'Листочок! Тримай стрибок, щоб ширяти', acorn: 'Жолуді! X або 🌰 — кидок', berry: 'Зоряна ягода: невразливість!', heart: 'Серденько повернулося!',
      bossHit: 'Влучив!', bossDown: 'Перемога! Тепер посади саджанець', wall: 'Стрибок від стіни: стрибай, ковзаючи по стіні',
      keys: '←/→ або A/D: біг · Пробіл/W/↑: стрибок · X: кидок · P: пауза',
      tapStart: 'Обери рівень', total: 'Усього', bossName1: 'Сміттєвий монстр', bossName2: 'Смоговий голем', bossName3: 'Король бляшанок',
      rulesT: 'Лісова пригода Фіні',
      rulesHtml: '<p>Допоможи лисеняті Фіні вилікувати ліс!</p><ul>' +
        '<li><b>Біг і стрибки:</b> ◀ ▶ і велика кнопка стрибка. Що довше тримаєш, то вищий стрибок.</li>' +
        '<li>Збирай <b>світне насіння</b> — дещо сховане в ящиках (вдар знизу).</li>' +
        '<li><b>Смогові хмаринки</b> перемагаєш стрибком згори. <b>Колючих сміттєвих повзунів</b> так не здолати — оминай їх або кидай жолуді.</li>' +
        '<li><b>Бонуси:</b> 🍃 листочок — ширяння (тримай стрибок), 🌰 жолуді — кидок, ⭐ зоряна ягода — коротка невразливість.</li>' +
        '<li>На кожен рівень — <b>3 серденька</b>. Ліхтарі — контрольні точки. З 2-го світу можна ковзати стінами й відштовхуватися від них.</li>' +
        '<li>На кожному рівні сховане <b>одне звірятко</b>. Шукай за кущами та нагорі!</li>' +
        '<li><b>3 зірки за рівень:</b> фініш · усе насіння · звірятко врятовано.</li></ul>'
    }
  };

  const WORLDS = [
    { name: { de: 'Sonniger Wald', en: 'Sunny Forest', ru: 'Солнечный лес', uk: 'Сонячний ліс' } },
    { name: { de: 'Nebelberge', en: 'Misty Mountains', ru: 'Туманные горы', uk: 'Туманні гори' } },
    { name: { de: 'Nachtpark', en: 'Night Park', ru: 'Ночной парк', uk: 'Нічний парк' } }
  ];

  const ANIMALS = {
    hedgehog: { name: { de: 'Igel', en: 'Hedgehog', ru: 'Ёжик', uk: 'Їжачок' }, body: '#8a6a4f', belly: '#e9d2b5', ears: 'round', quills: true },
    squirrel: { name: { de: 'Eichhörnchen', en: 'Squirrel', ru: 'Белочка', uk: 'Білочка' }, body: '#c8642c', belly: '#f6dcc0', ears: 'tuft', tail: 'bushy' },
    rabbit: { name: { de: 'Hase', en: 'Hare', ru: 'Зайчик', uk: 'Зайчик' }, body: '#b49a80', belly: '#efe3d3', ears: 'long' },
    fawn: { name: { de: 'Rehkitz', en: 'Fawn', ru: 'Оленёнок', uk: 'Оленя' }, body: '#c58a52', belly: '#f3dfc3', ears: 'pointy', spots: true },
    marmot: { name: { de: 'Murmeltier', en: 'Marmot', ru: 'Сурок', uk: 'Бабак' }, body: '#9a7a58', belly: '#d8c2a3', ears: 'round' },
    salamander: { name: { de: 'Feuersalamander', en: 'Fire salamander', ru: 'Саламандра', uk: 'Саламандра' }, body: '#22252b', belly: '#22252b', ears: 'none', dots: '#f5c518', tail: 'long' },
    snowhare: { name: { de: 'Schneehase', en: 'Snow hare', ru: 'Беляк', uk: 'Заєць-біляк' }, body: '#eef2f6', belly: '#ffffff', ears: 'long' },
    lynx: { name: { de: 'Luchsjunges', en: 'Lynx cub', ru: 'Рысёнок', uk: 'Рисеня' }, body: '#c9a06a', belly: '#f1e1c6', ears: 'tuft', spots: true },
    owl: { name: { de: 'Eule', en: 'Owl', ru: 'Совушка', uk: 'Совеня' }, body: '#8d6e52', belly: '#e6d3b8', ears: 'tuft', wings: true, beak: true },
    marten: { name: { de: 'Marder', en: 'Marten', ru: 'Куница', uk: 'Куниця' }, body: '#6e4a32', belly: '#f2e2c4', ears: 'round', tail: 'bushy' },
    frog: { name: { de: 'Frosch', en: 'Frog', ru: 'Лягушонок', uk: 'Жабеня' }, body: '#5fae4a', belly: '#d9f0b8', ears: 'none', frog: true },
    badger: { name: { de: 'Dachs', en: 'Badger', ru: 'Барсук', uk: 'Борсук' }, body: '#8b8f96', belly: '#2b2d31', ears: 'round', stripes: true }
  };

  /* ======================================================================
     Levels: hand-designed tile maps. Each level is a list of segments that are
     glued left to right. A segment is bottom-aligned; its last row is the dirt row
     and is repeated downwards. Legend:
       .  air        #  ground        X  block        =  one-way plank   c  crumbling log
       ?  seed crate L  leaf crate    A  acorn crate  R  star-berry crate Y heart crate
       T  mushroom spring  ^ thorns  ~  water  u  seed in water  %  secret cover (passable)
       o  seed   h heart   K lantern (checkpoint)   G goal   @ start   a trapped animal
       &  animal hidden under cover    *  seed hidden under cover
       s  smog blob  k  spiky litter crawler  b  bat  M  boss   | arena gate column
       H  horizontal mover (+ '>' track to the right)   V  vertical mover (+ ':' track above)
     ====================================================================== */
  const ARENA = [
    '.......................a......',
    '......................####....',
    '..............................',
    '..............................',
    '.....====........====.........',
    '..............................',
    '|............M...........G....',
    '##############################',
    '##############################'
  ];
  const LEVELS = [
    { id: '1-1', w: 0, theme: 'forest', time: 180, animal: 'hedgehog',
      name: { de: 'Sonnenlichtung', en: 'Sunny Glade', ru: 'Солнечная поляна', uk: 'Сонячна галявина' },
      map: [
        ['......?.?.?.........', '....................', '....................', '.@.........o.o......', '####################', '####################'],
        ['..............ooo.....', '......................', '.............#####....', '............######....', '.....s.....#######..s.', '######################', '######################'],
        ['.....o.o..........', '....o...o.........', '..................', '..................', '####...#####..####', '####...#####..####'],
        ['..........a.oo..........', '.........#######........', '.........#######........', '..........#####.........', '........................', '........................', '........................', '........................', '......T.............s...', '########################', '########################'],
        ['.........ooo..........', '......................', '........=====.........', '......................', '..K...........s....s..', '######################', '######################'],
        ['...........o..........', '..........o.o.........', '......................', '.........X...X........', '........XX...XX.......', '.......XXX...XXX......', '......XXXX...XXXX.....', '##########...#########', '##########...#########'],
        ['....?..R..?.........', '....................', '....................', '.........s.....s....', '####################', '####################'],
        ['........G.........', '##################', '##################']
      ] },
    { id: '1-2', w: 0, theme: 'forest', time: 200, animal: 'squirrel',
      name: { de: 'Bachufer', en: 'Brookside', ru: 'Берег ручья', uk: 'Берег струмка' },
      map: [
        ['.......L..........', '..................', '..................', '.@.........o.o.o..', '##################', '##################'],
        ['.......o..o...o..o......', '........................', '....====...cc...====....', '###~~~~~~~~~~~~~~~~~~###', '###~~~~~~~~~~~~~~~~~~###'],
        ['..........o.o.o.o.........', '..........................', '..........................', '..........................', '....HHH>>>>>>>>>>.........', '###.................######', '###.................######'],
        ['.............o..o.......', '........................', '........................', '..K....s....cccccc......', '###########......#######', '###########......#######'],
        ['...........%%%%%%...........', '...........%&%*%%...........', '...........======...........', '............................', '............................', '.......=====................', '............................', '............................', '....====.........ooo........', '..T.................s.......', '############################', '############################'],
        ['........o...o..o..............', '..............................', '...###........................', '..####........................', '.#####....XX..................', '######...........s............', '######..........##############', '######..........##############'],
        ['...?.?..............', '....................', '....................', '.....s.......G......', '####################', '####################']
      ] },
    { id: '1-3', w: 0, theme: 'forest', time: 220, animal: 'rabbit',
      name: { de: 'Brombeerhecke', en: 'Bramble Hollow', ru: 'Ежевичная чаща', uk: 'Ожинові хащі' },
      map: [
        ['.....A..?...........', '....................', '....................', '.@..............k...', '####################', '####################'],
        ['......o...o.............', '........................', '.....###...###..........', '.....###...###..........', '.....###^^^###.....s....', '########################', '########################'],
        ['..............########', '..........:...########', '..........:...########', '..........:...########', '..........:...########', '..........:...########', '..........VVV.########', '...k..........########', '######################', '######################'],
        ['...o.o.o.......s..........', '##########%%##########....', '#########......#######....', '#########.ooo.a#######....', '##########################', '##########################', '##########################', '##########################', '##########################', '##########################', '##########################'],
        ['####....................', '####....o...............', '#####...................', '######.....o............', '#######^^^.......k......', '########################', '########################'],
        ['..............ooo.........', '..........................', '...........=========......', '..........................', '..K.....k.........k.......', '##########################', '##########################'],
        ['..............o.o.......', '........:...=====.......', '........:...............', '........:...............', '........:...............', '........:...............', '........VVV.............', '######...........#######', '######...........#######'],
        ['...?..?...........', '..................', '..................', '...........G......', '##################', '##################']
      ] },
    { id: '1-B', w: 0, theme: 'forest', time: 200, animal: 'fawn', boss: 1,
      name: { de: 'Müllberg', en: 'Trash Hill', ru: 'Мусорная гора', uk: 'Сміттєва гора' },
      map: [
        ['.....?.?.?..........', '....................', '....................', '.@..............o.o.', '####################', '####################'],
        ['........o.o.o.........', '......................', '.......=======........', '......................', '..K..s..........s.....', '######################', '######################'],
        ARENA.map((r, i) => i === 6 ? '|T' + r.slice(2) : r)
      ] },
    { id: '2-1', w: 1, theme: 'mountain', time: 220, animal: 'marmot',
      name: { de: 'Nebelpass', en: 'Misty Pass', ru: 'Туманный перевал', uk: 'Туманний перевал' },
      map: [
        ['......?..?..........', '....................', '....................', '.@..........s.......', '####################', '####################'],
        ['.....#............', '.....#.....oo.....', '.....#...#########', '.....#...#########', '.....#...#########', '.....#...#########', '.........#########', '.........#########', '##################', '##################'],
        ['..........o..o..o.........', '..........................', '####...cccccccccc...######', '####................######', '####................######', '####................######', '####................######', '####................######', '####................######', '####................######'],
        ['..K.....s...............', '##############..........', '##############..........', '##############....o.....', '##############..........', '##############.....o....', '##############......k...', '########################', '########################'],
        ['...########...........', '...#..%%%%#...........', '...#..&%*%#...........', '...#..#####...........', '...#..#...............', '...#..#...............', '...#..#...............', '...#..#...............', '......................', '......................', '######################', '######################'],
        ['............o..o..........', '..........................', '..........................', '......HHH>>>>>>>..........', '...s......................', '#####...............######', '#####...............######'],
        ['....?...Y.........', '..................', '..................', '.........G........', '##################', '##################']
      ] },
    { id: '2-2', w: 1, theme: 'cave', cave: true, time: 220, animal: 'salamander',
      name: { de: 'Kristallhöhle', en: 'Crystal Cave', ru: 'Хрустальная пещера', uk: 'Кришталева печера' },
      map: [
        ['####################', '####################', '....................', '....................', '....................', '....................', '......?..?..........', '....................', '....................', '.@...........s......', '####################', '####################'],
        ['########################', '####.b..######.b..######', '........................', '........................', '........................', '........................', '........................', '...........o.o..........', '..........#####.........', '.........#######........', '########################', '########################'],
        ['##########################', '##########################', '............#.............', '............#.............', '............#.............', '............#.............', '............#.............', '....o.o.....#.....o.o.....', '............#.............', '............#.............', '##~~~~~~~~~~~~~~~~~~~~~~##', '##~~~~~~~uuu~~~~~~~~~~~~##'],
        ['############################', '############################', '...b..........b.............', '............................', '............................', '............................', '............................', '..........o.o.o.o...........', '............................', '..K...HHH>>>>>>>>>..........', '#####...............########', '#####...............########'],
        ['##########################', '##########################', '#%%%%%%#.....b............', '#%%%%%%#..................', '#%&%*%%#..................', '###..###..................', '..#..#....................', '..#..#....................', '..........................', '................k.........', '##########################', '##########################'],
        ['####################', '####################', '......b.............', '....................', '....................', '....................', '....?...?...........', '....................', '....................', '............G.......', '####################', '####################']
      ] },
    { id: '2-3', w: 1, theme: 'mountain', time: 240, animal: 'snowhare',
      name: { de: 'Gipfelgrat', en: 'Summit Ridge', ru: 'Горный гребень', uk: 'Гірський хребет' },
      map: [
        ['....L.....?.......', '..................', '..................', '.@................', '##################', '##################'],
        ['...........ooo..........', '........................', '..........######........', '..........######........', '..........######........', '..........######........', '..........######........', '......T...######..k.....', '########################', '########################'],
        ['........o...o..o..............', '..............................', '..##..........................', '.###...cccc...cccc............', '####..........................', '####..................s.......', '####.................#########', '####.................#########'],
        ['..............o.o.o.......', '..........#..########.....', '..........#..#########....', '..........#..##########...', '..........#..###########..', '..........#..############.', '.............#############', '..K..........#############', '##########################', '##########################'],
        ['.................%%%%%......', '.................%&%*%......', '...........:.....########...', '...........:.....########...', '...........:.....########...', '...........:.....########...', '...........:.....########...', '...........VVV...########...', '.....k...........########...', '############################', '############################'],
        ['.......o....o....o........', '..........................', '..........................', '....cc...cc...cc...cc.....', '..s.......................', '###..................#####', '###..................#####'],
        ['....?..?..?.........', '....................', '....................', '..s.........G.......', '####################', '####################']
      ] },
    { id: '2-B', w: 1, theme: 'cave', cave: true, time: 200, animal: 'lynx', boss: 2,
      name: { de: 'Smoggrotte', en: 'Smog Grotto', ru: 'Смоговый грот', uk: 'Смоговий грот' },
      map: [
        ['######################', '######################', '......b........b......', '......................', '......................', '......................', '.....?.?.?............', '......................', '......................', '.@..........K.........', '######################', '######################'],
        ['##############################', '##############################', '..............................'].concat(ARENA)
      ] },
    { id: '3-1', w: 2, theme: 'night', time: 220, animal: 'owl',
      name: { de: 'Glühwürmchenpark', en: 'Firefly Park', ru: 'Парк светлячков', uk: 'Парк світлячків' },
      map: [
        ['.....?.A.?..........', '....................', '....................', '.@..............s...', '####################', '####################'],
        ['..........o.o...........', '........................', '........................', '.....XX.......XX........', '.....XX..====.XX........', '.....XX.......XX..k.....', '########################', '########################'],
        ['........o...o...o.......', '........................', '........................', '........................', '......cc...cc...cc......', '###~~~~~~~~~~~~~~~~~~~##', '###~~~~~~~~~uuu~~~~~~~##'],
        ['.........%%%%%..............', '.........%&%*%..............', '.........=====..............', '............................', '............................', '............................', '............................', '............................', '..K....T..........s....k....', '############################', '############################'],
        ['....b...........b...........', '............................', '............................', '..........o.o.o.o...........', '............................', '............................', '......HHH>>>>>>>>...........', '............................', '#####...............########', '#####...............########'],
        ['...?...?............', '....................', '....................', '......s.....G.......', '####################', '####################']
      ] },
    { id: '3-2', w: 2, theme: 'night', time: 220, animal: 'marten',
      name: { de: 'Stadtrand', en: 'City Edge', ru: 'Окраина города', uk: 'Околиця міста' },
      map: [
        ['.....?..?..?........', '....................', '....................', '.@..............k...', '####################', '####################'],
        ['..........oo..............', '.......XXXXXXXXX..........', '.......XXXXXXXXX..........', '.......XXXXXXXXX..........', '...XX..XXXXXXXXX....XXXX..', '...XX..XXXXXXXXX....XXXX..', '...XX..XXXXXXXXX....XXXX..', '##########################', '##########################'],
        ['.......o...o............', '........................', '......XX...XX...........', '......XX...XX...........', '..k...XX^^^XX......k....', '########################', '########################'],
        ['..................%%%%........', '..................%&%%........', '..........:...XXXXXXXXXX......', '..........:...XXXXXXXXXX......', '..........:...XXXXXXXXXX......', '..........:...XXXXXXXXXX......', '..........:...XXXXXXXXXX......', '..........VVV.XXXXXXXXXX......', '..K...........XXXXXXXXXX......', '##############################', '##############################'],
        ['........o.o.......o.o.......', '............................', '...................k........', '......cccccc...XXXXXXXX.....', '..XXX..........XXXXXXXX.....', '..XXX..........XXXXXXXX.....', '..XXX..........XXXXXXXX.....', '#####..........#############', '#####..........#############'],
        ['....?.Y.?...........', '....................', '....................', '..s........G........', '####################', '####################']
      ] },
    { id: '3-3', w: 2, theme: 'night', time: 240, animal: 'frog',
      name: { de: 'Mondsee', en: 'Moon Lake', ru: 'Лунное озеро', uk: 'Місячне озеро' },
      map: [
        ['....?.L.?.........', '..................', '..................', '.@..........s.....', '##################', '##################'],
        ['......b.........b.............', '..............................', '..............................', '..........o.o.o.o.............', '..............................', '..............................', '.....HHH>>>>>>>>>>............', '..............................', '###~~~~~~~~~~~~~~~~~~~~~~~~###', '###~~~~~~~~uuuu~~~~~~~~~~~~###'],
        ['.............o.o..........', '............XXXXXX........', '............XXXXXX........', '............XXXXXX........', '.........X..XXXXXX........', '.........X..XXXXXX........', '.........X..XXXXXX...k....', '##########################', '##########################'],
        ['......b.......b...........', '..........................', '..........................', '.........o...o...o........', '..........................', '..........................', '.......cc...cc...cc.......', '..K...................s...', '######~~~~~~~~~~~~~~######', '######~~~~~~~~~~~~~~######'],
        ['...............%%%%.........', '...............%&%%.........', '...............####.........', '..........:.................', '..........:.................', '..........:.................', '..........:.................', '..........VVV...............', '....s...................k...', '############################', '############################'],
        ['...?..?..?..........', '....................', '....................', '.....k......G.......', '####################', '####################']
      ] },
    { id: '3-B', w: 2, theme: 'night', time: 200, animal: 'badger', boss: 3,
      name: { de: 'Dosenkönig', en: 'The Can King', ru: 'Король банок', uk: 'Король бляшанок' },
      map: [
        ['.....b..........b.......', '........................', '........................', '........................', '....?.Y.?...............', '........................', '........................', '.@...........K..........', '########################', '########################'],
        ARENA
      ] }
  ];

  /* ======================================================================
     Core: level parsing and player physics. Pure functions, no DOM.
     ====================================================================== */
  const Core = (function () {
    const T = TILE;
    // Tile codes
    const AIR = 0, GROUND = 1, BLOCK = 2, BOX = 3, BOX_LEAF = 4, BOX_ACORN = 5, BOX_BERRY = 6, BOX_USED = 7,
      PLANK = 8, CRUMBLE = 9, SPRING = 10, THORNS = 11, WATER = 12, COVER = 13, GATE = 14, BOX_HEART = 15;
    const CH = { '#': GROUND, 'X': BLOCK, '?': BOX, 'L': BOX_LEAF, 'A': BOX_ACORN, 'R': BOX_BERRY, 'Y': BOX_HEART,
      '=': PLANK, 'c': CRUMBLE, 'T': SPRING, '^': THORNS, '~': WATER, 'u': WATER, '%': COVER, '&': COVER, '*': COVER };
    const SOLID = new Uint8Array(16), ONEWAY = new Uint8Array(16);
    [GROUND, BLOCK, BOX, BOX_LEAF, BOX_ACORN, BOX_BERRY, BOX_USED, SPRING, GATE, BOX_HEART].forEach(k => SOLID[k] = 1);
    [PLANK, CRUMBLE].forEach(k => ONEWAY[k] = 1);
    const CR_FALL = 0.5, CR_BACK = 3.2; // crumbling logs: fall after 0.5 s, come back after 3.2 s

    // Physics constants in px and seconds.
    const PH = {
      w: 14, h: 22,
      maxRun: 150, accel: 1050, airAccel: 780, decel: 1400, airDecel: 380, turn: 2100,
      g: 1500, gFall: 1750, gCut: 3600, maxFall: 430, jumpV: 545, coyote: 0.1, buffer: 0.13,
      springV: 640, springHeld: 880, stompV: 360, stompHeld: 540,
      wallSlide: 90, wallJumpVX: 180, wallJumpVY: 500, wallLock: 0.15,
      swimG: 420, swimMaxFall: 90, swimV: 210, swimMax: 100, swimExit: 470, glideFall: 62
    };
    const EV = { JUMP: 1, LAND: 2, BUMP: 4, SPRING: 8, HAZARD: 16, FELL: 32, WJUMP: 64, SPLASH: 128, SWIM: 256, SKID: 512, CRUMBLE: 1024 };

    function parse(def) {
      const pad = def.cave ? '#' : '.';
      const rows = []; for (let i = 0; i < SEG_H; i++) rows.push('');
      for (const seg of def.map) {
        if (seg.length > SEG_H) throw new Error('segment too tall in ' + def.id);
        let w = 0; for (const r of seg) w = Math.max(w, r.length);
        const off = SEG_H - seg.length;
        for (let i = 0; i < SEG_H; i++) {
          const r = i < off ? pad.repeat(w) : seg[i - off];
          rows[i] += r + '.'.repeat(w - r.length);
        }
      }
      const cols = rows[0].length;
      const full = [];
      for (let i = 0; i < ROWS - SEG_H - 3; i++) full.push(pad.repeat(cols));
      for (const r of rows) full.push(r);
      const last = rows[SEG_H - 1].replace(/[^#X~u%]/g, '.').replace(/u/g, '~');
      for (let i = 0; i < 3; i++) full.push(i === 2 ? last.replace(/~/g, '#') : last);

      const L = { def, cols, rows: ROWS, grid: new Uint8Array(cols * ROWS), start: null, goal: null, gateCol: -1,
        checkpoints: [], seeds: [], hearts: [], enemies: [], movers: [], animal: null, boxes: 0, boss: null };
      for (let r = 0; r < ROWS; r++) {
        const row = full[r];
        for (let c = 0; c < cols; c++) {
          const ch = row[c];
          const i = r * cols + c;
          if (CH[ch] != null) L.grid[i] = CH[ch];
          switch (ch) {
            case '@': L.start = { x: c * T + (T - PH.w) / 2, y: (r + 1) * T - PH.h }; break;
            case 'K': L.checkpoints.push({ c, r, x: c * T + T / 2, y: (r + 1) * T, lit: false }); break;
            case 'G': L.goal = { c, r, x: c * T + T / 2, y: (r + 1) * T }; break;
            case 'a': case '&': L.animal = { c, r, x: c * T + T / 2, y: (r + 1) * T }; break;
            case 'o': case 'u': case '*': L.seeds.push({ c, r, x: c * T + T / 2, y: r * T + T / 2, water: ch === 'u' }); break;
            case 'h': L.hearts.push({ c, r, x: c * T + T / 2, y: r * T + T / 2 }); break;
            case 's': case 'k': case 'b': L.enemies.push({ t: ch, c, r }); break;
            case 'M': L.boss = { c, r, x: c * T + T / 2, y: (r + 1) * T }; break;
            case '|': L.gateCol = c; break;
            case '?': L.boxes++; break;
          }
        }
      }
      // Movers: runs of H (track '>' to the right) and V (track ':' above the first cell).
      for (let r = 0; r < ROWS; r++) {
        const row = full[r];
        for (let c = 0; c < cols; c++) {
          const ch = row[c];
          if ((ch !== 'H' && ch !== 'V') || row[c - 1] === ch) continue;
          let n = 1; while (row[c + n] === ch) n++;
          let k = 0;
          if (ch === 'H') { while (row[c + n + k] === '>') k++; }
          else { while (r - 1 - k >= 0 && full[r - 1 - k][c] === ':') k++; }
          const P = 2 * (1.0 + k * 0.32);
          L.movers.push({ x0: c * T, y0: r * T, w: n * T, dx: ch === 'H' ? k * T : 0, dy: ch === 'V' ? -k * T : 0, P, h: ch === 'H' });
        }
      }
      if (!L.start || !L.goal) throw new Error('level ' + def.id + ' needs @ and G');
      return L;
    }

    function cell(L, c, r) {
      if (c < 0 || c >= L.cols) return GROUND;
      if (r < 0 || r >= L.rows) return AIR;
      return L.grid[r * L.cols + c];
    }
    function moverPos(m, t, out) {
      const f = (1 - Math.cos(2 * Math.PI * t / m.P)) / 2;
      out.x = m.x0 + m.dx * f; out.y = m.y0 + m.dy * f; return out;
    }
    const MA = { x: 0, y: 0 }, MB = { x: 0, y: 0 };

    function newSim(L) {
      return { x: L.start.x, y: L.start.y, vx: 0, vy: 0, gr: true, coy: 0, buf: 0, jp: false, cut: false, face: 1,
        wall: 0, lock: 0, lockDir: 0, water: false, mover: -1, t: 0, cr: [], ev: 0, bump: -1, spring: -1, glide: false,
        hurt: 0, landV: 0, hitWall: 0 };
    }
    function cloneSim(s) {
      const o = Object.assign({}, s);
      o.cr = s.cr.length ? s.cr.map(c => [c[0], c[1]]) : [];
      return o;
    }
    function crGone(s, i) { const cr = s.cr; for (let k = 0; k < cr.length; k++) if (cr[k][0] === i) return cr[k][1] >= CR_FALL; return false; }
    function touchCrumble(s, i) { const cr = s.cr; for (let k = 0; k < cr.length; k++) if (cr[k][0] === i) return; cr.push([i, 0]); s.ev |= EV.CRUMBLE; }
    function rectSolid(L, x, y, w, h) {
      const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.01) / T), r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.01) / T);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (SOLID[cell(L, c, r)]) return true;
      return false;
    }
    function overlapsCell(s, i, L, w, h) {
      const c = i % L.cols, r = (i / L.cols) | 0;
      return s.x < (c + 1) * T && s.x + w > c * T && s.y < (r + 1) * T && s.y + h > r * T;
    }
    function inWater(L, s, w, h) { return cell(L, Math.floor((s.x + w / 2) / T), Math.floor((s.y + h * 0.55) / T)) === WATER; }
    function headDry(L, s, w) { return cell(L, Math.floor((s.x + w / 2) / T), Math.floor((s.y + 4) / T)) !== WATER; }

    function moveX(L, s, dx, w, h, pop) {
      if (!dx) return;
      const nx = s.x + dx;
      const r0 = Math.floor(s.y / T), r1 = Math.floor((s.y + h - 0.01) / T);
      const c = dx > 0 ? Math.floor((nx + w - 0.01) / T) : Math.floor(nx / T);
      for (let r = r0; r <= r1; r++) {
        if (!SOLID[cell(L, c, r)]) continue;
        // Ledge forgiveness: when the feet are only a few px below a ledge top, pop up onto it.
        if (pop && r === r1 && s.vy >= -60 && (s.y + h) - r * T <= 6 && c >= 0 && c < L.cols) {
          const ny = r * T - h;
          if (!rectSolid(L, nx, ny, w, h)) { s.y = ny; s.x = nx; if (s.vy > 0) s.vy = 0; return; }
        }
        s.x = dx > 0 ? c * T - w : (c + 1) * T; s.vx = 0; s.hitWall = dx > 0 ? 1 : -1;
        return;
      }
      s.x = nx;
    }

    // One fixed physics step for the player. inp = {l, r, j}. ab = {wall, leaf}. Returns event bits.
    function step(L, s, inp, dt, P, ab) {
      const w = P.w, h = P.h;
      s.ev = 0; s.bump = -1; s.spring = -1; s.hitWall = 0;
      const t0 = s.t; s.t += dt;
      // crumbling logs
      for (let k = s.cr.length - 1; k >= 0; k--) {
        const c = s.cr[k]; c[1] += dt;
        if (c[1] > CR_BACK && !overlapsCell(s, c[0], L, w, h)) s.cr.splice(k, 1);
      }
      // ride a moving platform
      if (s.mover >= 0) {
        const m = L.movers[s.mover];
        moverPos(m, t0, MA); moverPos(m, s.t, MB);
        s.y = MB.y - h;
        if (MB.x !== MA.x) moveX(L, s, MB.x - MA.x, w, h, false);
        if (s.x + w <= MB.x || s.x >= MB.x + m.w) { s.mover = -1; s.gr = false; }
      }
      // horizontal control
      const raw = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      let dir = raw;
      if (s.hurt > 0) { s.hurt -= dt; dir = 0; }
      if (s.lock > 0) { s.lock -= dt; dir = s.lockDir; }
      const water = inWater(L, s, w, h);
      if (water !== s.water) { s.ev |= EV.SPLASH; s.water = water; if (water && s.vy > 0) s.vy *= 0.35; }
      const max = water ? P.swimMax : P.maxRun;
      const pv = s.vx;
      if (dir) {
        let a = s.gr ? P.accel : P.airAccel;
        if (dir * s.vx < 0) { a = s.gr ? P.turn : P.airAccel * 1.3; if (s.gr && Math.abs(s.vx) > 90) s.ev |= EV.SKID; }
        s.vx += dir * a * dt;
        if (s.vx > max) s.vx = pv > max ? Math.max(max, pv - P.airDecel * dt) : max;
        if (s.vx < -max) s.vx = pv < -max ? Math.min(-max, pv + P.airDecel * dt) : -max;
        s.face = dir;
      } else {
        const d = (s.gr ? P.decel : P.airDecel) * dt * (s.hurt > 0 ? 0.4 : 1);
        if (s.vx > d) s.vx -= d; else if (s.vx < -d) s.vx += d; else s.vx = 0;
      }
      // jump timers (coyote time + jump buffering)
      const pressed = !!inp.j && !s.jp; s.jp = !!inp.j;
      if (pressed) s.buf = P.buffer; else if (s.buf > 0) s.buf -= dt;
      if (s.gr) s.coy = P.coyote; else if (s.coy > 0) s.coy -= dt;
      if (s.hurt > 0) s.buf = 0;
      s.glide = false;
      if (water) {
        s.wall = 0;
        if (s.buf > 0) {
          s.buf = 0; s.vy = headDry(L, s, w) ? -P.swimExit : -P.swimV; s.gr = false; s.mover = -1; s.ev |= EV.SWIM;
        }
        s.vy += P.swimG * dt; if (s.vy > P.swimMaxFall) s.vy = Math.max(P.swimMaxFall, s.vy - 1800 * dt);
      } else {
        if (s.buf > 0 && (s.gr || s.coy > 0)) {
          s.vy = -P.jumpV; s.buf = 0; s.coy = 0; s.gr = false; s.mover = -1; s.cut = true; s.ev |= EV.JUMP;
        } else if (s.buf > 0 && ab.wall && s.wall) {
          s.vy = -P.wallJumpVY; s.vx = -s.wall * P.wallJumpVX; s.lock = P.wallLock; s.lockDir = -s.wall; s.face = -s.wall;
          s.wall = 0; s.buf = 0; s.cut = true; s.ev |= EV.WJUMP;
        }
        const g = s.vy < 0 ? ((s.cut && !inp.j) ? P.gCut : P.g) : P.gFall;
        s.vy += g * dt;
        let mf = P.maxFall;
        if (s.wall && s.vy > 0) mf = P.wallSlide;
        else if (ab.leaf && inp.j && s.vy > 0 && !s.gr) { mf = P.glideFall; s.glide = true; }
        if (s.vy > mf) s.vy = Math.max(mf, s.vy - 2600 * dt);
      }
      if (s.vy >= 0) s.cut = false;

      moveX(L, s, s.vx * dt, w, h, true);

      // vertical movement
      const wasGr = s.gr, oy = s.y, dy = s.vy * dt;
      const c0 = Math.floor((s.x + 0.01) / T), c1 = Math.floor((s.x + w - 0.01) / T);
      if (s.vy >= 0 && s.mover >= 0) { s.vy = 0; s.gr = true; }
      else if (s.vy >= 0) {
        s.y += dy;
        const bot = s.y + h, pbot = oy + h, rr = Math.floor(bot / T);
        let land = false, spring = -1;
        for (let c = c0; c <= c1; c++) {
          const k = cell(L, c, rr), i = rr * L.cols + c;
          if (SOLID[k]) { land = true; if (k === SPRING) spring = i; }
          else if (ONEWAY[k] && pbot <= rr * T + 0.5 && !(k === CRUMBLE && crGone(s, i))) { land = true; if (k === CRUMBLE) touchCrumble(s, i); }
        }
        if (land) s.y = rr * T - h;
        else {
          for (let i = 0; i < L.movers.length; i++) {
            const m = L.movers[i];
            moverPos(m, s.t, MB);
            if (s.x + w <= MB.x || s.x >= MB.x + m.w || bot < MB.y) continue;
            moverPos(m, t0, MA);
            if (pbot <= MA.y + 1) { land = true; s.y = MB.y - h; s.mover = i; break; }
          }
        }
        if (land) {
          if (!wasGr) { s.ev |= EV.LAND; s.landV = s.vy; }
          s.vy = 0; s.gr = true;
          if (spring >= 0) {
            s.vy = -(inp.j ? P.springHeld : P.springV); s.gr = false; s.cut = false; s.spring = spring; s.coy = 0; s.ev |= EV.SPRING;
          }
        } else { s.gr = false; s.mover = -1; }
      } else {
        s.y += dy;
        const rr = Math.floor(s.y / T);
        let hit = -1, hitL = false, hitR = false;
        for (let c = c0; c <= c1; c++) if (SOLID[cell(L, c, rr)]) { hit = c; if (c === c0) hitL = true; if (c === c1) hitR = true; }
        if (hit >= 0 && hitL !== hitR) {
          // Corner correction: slide around a block edge if the overlap is small.
          if (hitL) { const push = (c0 + 1) * T - s.x; if (push <= 7 && !rectSolid(L, s.x + push, s.y, w, h)) { s.x += push; hit = -1; } }
          else { const push = s.x + w - c1 * T; if (push <= 7 && !rectSolid(L, s.x - push, s.y, w, h)) { s.x -= push; hit = -1; } }
        }
        if (hit >= 0) {
          s.y = (rr + 1) * T; s.vy = 0; s.cut = false;
          const cc = Math.floor((s.x + w / 2) / T);
          s.bump = rr * L.cols + (SOLID[cell(L, cc, rr)] ? cc : hit); s.ev |= EV.BUMP;
        }
        s.gr = false; s.mover = -1;
      }
      // wall slide (later worlds)
      s.wall = 0;
      if (ab.wall && !s.gr && !s.water && s.vy > -40 && raw && s.hurt <= 0) {
        const c = Math.floor((raw > 0 ? s.x + w + 1 : s.x - 1) / T);
        if (c >= 0 && c < L.cols && SOLID[cell(L, c, Math.floor((s.y + 3) / T))] && SOLID[cell(L, c, Math.floor((s.y + h - 3) / T))]) s.wall = raw;
      }
      // thorns
      {
        const r0 = Math.floor(s.y / T), r1 = Math.floor((s.y + h - 0.01) / T);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
          if (cell(L, c, r) !== THORNS) continue;
          if (s.x + w > c * T + 3 && s.x < (c + 1) * T - 3 && s.y + h > r * T + 11) s.ev |= EV.HAZARD;
        }
      }
      if (s.y > L.rows * T + 30) s.ev |= EV.FELL;
      return s.ev;
    }

    return { parse, step, newSim, cloneSim, cell, moverPos, rectSolid, crGone, PH, EV, SOLID, ONEWAY, CR_FALL, CR_BACK,
      K: { AIR, GROUND, BLOCK, BOX, BOX_LEAF, BOX_ACORN, BOX_BERRY, BOX_USED, PLANK, CRUMBLE, SPRING, THORNS, WATER, COVER, GATE, BOX_HEART } };
  })();

  /* ======================================================================
     Art: palettes, cached sprites, parallax backgrounds and character drawing.
     Everything is drawn with Canvas 2D paths and cached on offscreen canvases.
     ====================================================================== */
  const THEMES = {
    forest: { id: 'forest', sky: ['#4ea6e6', '#94d1f4', '#fbefcf'], far: '#a5cfc6', far2: '#8dc0b4', mid: '#62ad69', mid2: '#47935a', near: '#2f6f42', near2: '#245a36',
      dirt: '#8d5b37', dirtD: '#5c3822', dirtL: '#a8724a', cap: '#5fbf46', capL: '#a5e46e', capD: '#3a8a31',
      block: '#a7b0b7', blockD: '#69757d', blockL: '#d0d7db', moss: '#6ab84b', plank: '#c38c50', plankD: '#7c522d',
      water: [70, 170, 226], waterTop: '#d4f3ff', thorn: '#2f5d2a', thornTip: '#e6f7d5', cover: '#3f9a45', coverD: '#2c7536', coverL: '#79c95f', bush: 1 },
    mountain: { id: 'mountain', sky: ['#7fa6cc', '#bcd0e4', '#eef2f6'], far: '#b9c9da', far2: '#a4b7cb', mid: '#7f95ad', mid2: '#677e97', near: '#3d5a5c', near2: '#2e4748',
      dirt: '#6f7582', dirtD: '#454a55', dirtL: '#8e939f', cap: '#86bb70', capL: '#c6e8a9', capD: '#5a8c4d',
      block: '#9ca3ad', blockD: '#5f6672', blockL: '#c7ccd3', moss: '#86bb70', plank: '#b98a5a', plankD: '#76552f',
      water: [92, 160, 205], waterTop: '#e3f4ff', thorn: '#59606e', thornTip: '#d4dae3', cover: '#6f7582', coverD: '#454a55', coverL: '#8e939f', mist: 1 },
    cave: { id: 'cave', sky: ['#121722', '#1b2231', '#262d40'], far: '#232a3b', far2: '#2a3247', mid: '#323b55', mid2: '#3b3157', near: '#1a1f2c', near2: '#14181f',
      dirt: '#4b5066', dirtD: '#2b2f3f', dirtL: '#686e88', cap: '#7c829c', capL: '#aab0ca', capD: '#565b72', noBlade: 1,
      block: '#3f4763', blockD: '#262c40', blockL: '#5d6789', moss: '#7ee0ff', plank: '#9b7a58', plankD: '#5e4630',
      water: [52, 128, 196], waterTop: '#9fe3ff', thorn: '#8a6cf0', thornTip: '#e7dcff', cover: '#4b5066', coverD: '#2b2f3f', coverL: '#686e88', dark: 1 },
    night: { id: 'night', sky: ['#0b1230', '#1f2760', '#4a3d7c'], far: '#222a57', far2: '#1b2249', mid: '#183a3d', mid2: '#123033', near: '#0f2629', near2: '#0b1d20',
      dirt: '#43323f', dirtD: '#271d26', dirtL: '#5c4656', cap: '#3f8d69', capL: '#79c79a', capD: '#2a654b',
      block: '#8e4c3d', blockD: '#5a2e25', blockL: '#b0664f', moss: '#3f8d69', plank: '#a77a52', plankD: '#674529', brick: 1,
      water: [56, 96, 170], waterTop: '#bcd4ff', thorn: '#8fdcf2', thornTip: '#e9fbff', glass: 1, cover: '#245c47', coverD: '#163f31', coverL: '#3b8a69', bush: 1, stars: 1 }
  };

  // Deterministic hash / RNG helpers for decoration.
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  let DPR = 1;
  const cache = new Map();
  function sprite(key, w, h, draw) {
    let c = cache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR));
    const g = c.getContext('2d'); g.scale(c.width / w, c.height / h); draw(g);
    c.w = w; c.h = h; cache.set(key, c); return c;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function rrc(g, x, y, w, h, tl, tr, br, bl) {
    g.beginPath(); g.moveTo(x + tl, y); g.lineTo(x + w - tr, y); if (tr) g.arcTo(x + w, y, x + w, y + tr, tr); else g.lineTo(x + w, y);
    g.lineTo(x + w, y + h - br); if (br) g.arcTo(x + w, y + h, x + w - br, y + h, br); else g.lineTo(x + w, y + h);
    g.lineTo(x + bl, y + h); if (bl) g.arcTo(x, y + h, x, y + h - bl, bl); else g.lineTo(x, y + h);
    g.lineTo(x, y + tl); if (tl) g.arcTo(x, y, x + tl, y, tl); else g.lineTo(x, y); g.closePath();
  }
  function star(g, x, y, r1, r2, n, rot) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? r2 : r1; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath();
  }
  function heartPath(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.1, x - s * 0.5, y + s * 0.3);
    g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x - s * 0.1, y + s * 0.75, x, y + s);
    g.bezierCurveTo(x + s * 0.1, y + s * 0.75, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    g.bezierCurveTo(x + s * 0.5, y - s * 0.1, x, y, x, y + s * 0.35); g.closePath();
  }

  /* ---------- tiles (sprites are 28×34 with a 2 px side and 8 px top margin) ---------- */
  const SPR_W = 28, SPR_H = 34, OX = 2, OY = 8;
  function groundBody(g, th, mask, v, cols) {
    const up = mask & 1, rt = mask & 2, dn = mask & 4, lt = mask & 8, R = 7;
    g.save(); g.beginPath(); g.rect(0, 0, 24, 24); g.clip();
    const x0 = lt ? -6 : 0, x1 = rt ? 30 : 24, y0 = up ? -6 : 0, y1 = dn ? 30 : 24;
    rrc(g, x0, y0, x1 - x0, y1 - y0, (!up && !lt) ? R : 0, (!up && !rt) ? R : 0, (!dn && !rt) ? R : 0, (!dn && !lt) ? R : 0);
    g.fillStyle = cols[0]; g.fill();
    const r = rng(v * 7919 + 13);
    for (let i = 0; i < 5; i++) {
      const px = 3 + r() * 18, py = 4 + r() * 17, s = 1.2 + r() * 2.2;
      g.fillStyle = r() < 0.55 ? cols[1] : cols[2]; g.globalAlpha = 0.45 + r() * 0.3;
      g.beginPath(); g.ellipse(px, py, s * 1.3, s, r() * 3, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    if (!dn) { const gr = g.createLinearGradient(0, 14, 0, 24); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = gr; g.fillRect(0, 12, 24, 12); }
    g.lineWidth = 2.4; g.strokeStyle = cols[1]; g.stroke();
    g.restore();
  }
  function drawCap(g, th, mask, v) {
    const rt = mask & 2, lt = mask & 8;
    const xa = lt ? 0 : -1.5, xb = rt ? 24 : 25.5;
    const r = rng(v * 131 + 7);
    g.beginPath(); g.moveTo(xa, 1);
    if (!lt) g.quadraticCurveTo(xa - 1, 4, xa + 1.5, 7);
    const drips = [6.5 + r() * 2, 5 + r() * 2, 7 + r() * 2.5, 5 + r() * 2];
    for (let i = 0; i < 4; i++) { const x = xa + (xb - xa) * (i + 0.5) / 4; g.quadraticCurveTo(x - 2, drips[i] + 2.2, x + (xb - xa) / 8, drips[i]); }
    if (!rt) g.quadraticCurveTo(xb + 1, 4, xb, 1); else g.lineTo(xb, 6);
    g.lineTo(xb, 0); g.lineTo(xa, 0); g.closePath();
    g.fillStyle = th.cap; g.fill();
    g.fillStyle = th.capL; g.fillRect(xa + (lt ? 0 : 1.5), 0, xb - xa - (lt ? 0 : 1.5) - (rt ? 0 : 1.5), 2.2);
    g.strokeStyle = th.capD; g.lineWidth = 1; g.beginPath(); g.moveTo(xa + 1, 6.5); g.lineTo(xb - 1, 6.5); g.globalAlpha = 0.25; g.stroke(); g.globalAlpha = 1;
    if (!th.noBlade) {
      g.fillStyle = th.cap;
      for (let i = 0; i < 5; i++) {
        const x = 2 + r() * 20, hgt = 2 + r() * 3.5;
        g.beginPath(); g.moveTo(x - 1.4, 0.5); g.lineTo(x + r() * 1.6 - 0.8, -hgt); g.lineTo(x + 1.4, 0.5); g.fill();
      }
      g.fillStyle = th.capL;
      for (let i = 0; i < 2; i++) { const x = 3 + r() * 18; g.beginPath(); g.moveTo(x - 0.8, 0.5); g.lineTo(x + 0.4, -2.5 - r() * 2); g.lineTo(x + 1, 0.5); g.fill(); }
    } else {
      g.fillStyle = 'rgba(255,255,255,.18)';
      for (let i = 0; i < 2; i++) { const x = 3 + r() * 16; g.fillRect(x, 3, 3 + r() * 3, 1.2); }
    }
  }
  function tileGround(th, mask, v) {
    return sprite(`g|${th.id}|${mask}|${v}`, SPR_W, SPR_H, g => {
      g.translate(OX, OY);
      groundBody(g, th, mask, v, [th.dirt, th.dirtD, th.dirtL]);
      if (!(mask & 1)) drawCap(g, th, mask, v);
    });
  }
  function tileCover(th, mask, v) {
    return sprite(`cv|${th.id}|${mask}|${v}`, SPR_W, SPR_H, g => {
      g.translate(OX, OY);
      if (!th.bush) { groundBody(g, th, mask, v, [th.cover, th.coverD, th.coverL]); if (!(mask & 1) && th.id !== 'cave') drawCap(g, th, mask, v); return; }
      const r = rng(v * 37 + mask);
      const blobs = [[4, 16, 9], [14, 14, 10], [21, 18, 8], [9, 6, 8], [18, 6, 8], [12, 22, 9]];
      for (const [x, y, s] of blobs) {
        if (!(mask & 1) && y < 8 && r() < 0.2) continue;
        g.fillStyle = th.coverD; g.beginPath(); g.arc(x + 0.5, y + 1.5, s, 0, Math.PI * 2); g.fill();
      }
      for (const [x, y, s] of blobs) { g.fillStyle = th.cover; g.beginPath(); g.arc(x, y, s - 1, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = th.coverL;
      for (let i = 0; i < 7; i++) { const x = 2 + r() * 20, y = 2 + r() * 18; g.beginPath(); g.ellipse(x, y, 2.6, 1.4, r() * 3, 0, Math.PI * 2); g.fill(); }
      if (th.id === 'forest' && v % 3 === 0) { g.fillStyle = '#ff8fb1'; g.beginPath(); g.arc(6 + r() * 12, 6 + r() * 10, 1.8, 0, 7); g.fill(); }
    });
  }
  function tileBlock(th, mask, v) {
    return sprite(`x|${th.id}|${mask}|${v}`, SPR_W, SPR_H, g => {
      g.translate(OX, OY);
      const up = mask & 1, rt = mask & 2, dn = mask & 4, lt = mask & 8;
      if (th.brick) {
        g.save(); g.beginPath(); g.rect(0, 0, 24, 24); g.clip();
        g.fillStyle = th.blockD; g.fillRect(0, 0, 24, 24);
        const r = rng(v * 17 + 3);
        for (let row = 0; row < 3; row++) {
          const off = row % 2 ? -6 : 0;
          for (let k = 0; k < 3; k++) {
            const x = off + k * 12 + 0.8, y = row * 8 + 0.8;
            const c = r(); g.fillStyle = c < 0.3 ? th.blockL : c < 0.85 ? th.block : '#7a4134';
            g.fillRect(x, y, 10.4, 6.4);
            g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, 10.4, 1.2);
          }
        }
        if (up && dn && lt && rt && v % 4 === 0) { // lit window inside big buildings
          g.fillStyle = '#2a1a1a'; g.fillRect(5, 4, 14, 16);
          const gw = g.createLinearGradient(0, 5, 0, 19); gw.addColorStop(0, '#ffe7a3'); gw.addColorStop(1, '#ffb64d');
          g.fillStyle = gw; g.fillRect(6.5, 5.5, 11, 13); g.fillStyle = '#2a1a1a'; g.fillRect(11.4, 5.5, 1.2, 13); g.fillRect(6.5, 11.4, 11, 1.2);
        }
        g.restore();
        g.strokeStyle = '#3a1d17'; g.lineWidth = 2;
        g.beginPath();
        if (!up) { g.moveTo(0, 1); g.lineTo(24, 1); } if (!dn) { g.moveTo(0, 23); g.lineTo(24, 23); }
        if (!lt) { g.moveTo(1, 0); g.lineTo(1, 24); } if (!rt) { g.moveTo(23, 0); g.lineTo(23, 24); }
        g.stroke();
        if (!up) { g.fillStyle = '#c8cbd6'; g.fillRect(-1, -2, 26, 4); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-1, 1.5, 26, 1); }
        return;
      }
      rr(g, 0.5, 0.5, 23, 23, 4); g.fillStyle = th.block; g.fill();
      const gr = g.createLinearGradient(0, 0, 0, 24); gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = gr; g.fill();
      g.strokeStyle = th.blockD; g.lineWidth = 1.6; g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, 9 + (v % 3)); g.lineTo(11, 11 + (v % 4)); g.lineTo(16, 10); g.stroke();
      if (th.id === 'cave') {
        g.fillStyle = v % 2 ? '#7ee0ff' : '#c58bff'; g.globalAlpha = 0.85;
        g.beginPath(); g.moveTo(15, 20); g.lineTo(18, 9); g.lineTo(21, 20); g.fill(); g.globalAlpha = 1;
      }
      if (!up && th.moss && th.id !== 'cave') {
        g.fillStyle = th.moss;
        g.beginPath(); g.moveTo(1, 4); g.quadraticCurveTo(4, 8, 7, 4); g.quadraticCurveTo(10, 7.5, 13, 4); g.quadraticCurveTo(17, 9, 20, 4); g.quadraticCurveTo(22, 6, 23, 3); g.lineTo(23, 0.5); g.lineTo(1, 0.5); g.fill();
      }
    });
  }
  function tileBox(kind) { // 0 seed crate, 1 power crate, 2 used
    return sprite('box|' + kind, SPR_W, SPR_H, g => {
      g.translate(OX, OY);
      rr(g, 0.5, 0.5, 23, 23, 3.5);
      g.fillStyle = kind === 2 ? '#8a6a52' : '#d79a52'; g.fill();
      g.strokeStyle = kind === 2 ? '#4b3626' : '#7a4a22'; g.lineWidth = 1.6; g.stroke();
      g.strokeStyle = kind === 2 ? 'rgba(0,0,0,.25)' : 'rgba(122,74,34,.55)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(3, 8); g.lineTo(21, 8); g.moveTo(3, 16); g.lineTo(21, 16); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(2, 2, 20, 2);
      g.fillStyle = kind === 2 ? '#4b3626' : '#7a4a22';
      for (const [x, y] of [[3.5, 3.5], [20.5, 3.5], [3.5, 20.5], [20.5, 20.5]]) { g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill(); }
      if (kind === 2) return;
      g.fillStyle = 'rgba(80,40,10,.35)'; g.beginPath(); g.arc(12, 12, 6.6, 0, 7); g.fill();
      if (kind === 0) {
        g.fillStyle = '#ffe680'; g.beginPath(); g.ellipse(12, 13, 3.4, 4.4, 0, 0, 7); g.fill();
        g.fillStyle = '#7ccf4a'; g.beginPath(); g.ellipse(14.5, 7.6, 3, 1.6, -0.6, 0, 7); g.fill();
      } else {
        g.fillStyle = '#fff1a8'; star(g, 12, 12, 6, 2.6, 5, -Math.PI / 2); g.fill();
      }
    });
  }
  function tilePlank(th, l, r) {
    return sprite(`p|${th.id}|${l}|${r}`, SPR_W, SPR_H, g => {
      g.translate(OX, OY);
      const x0 = l ? 0 : 1, x1 = r ? 24 : 23;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0 + 1, 8, x1 - x0 - 2, 3);
      rrc(g, x0, 0, x1 - x0, 9, l ? 0 : 3, r ? 0 : 3, r ? 0 : 3, l ? 0 : 3); g.fillStyle = th.plank; g.fill();
      g.strokeStyle = th.plankD; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x0 + 1, 1, x1 - x0 - 2, 1.6);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0 + 3, 5); g.lineTo(x1 - 6, 5); g.stroke();
      g.fillStyle = th.plankD; g.beginPath(); g.arc(12, 4.5, 0.9, 0, 7); g.fill();
    });
  }
  function tileLog(l, r) {
    return sprite(`c|${l}|${r}`, SPR_W, SPR_H, g => {
      g.translate(OX, OY);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(1, 11, 22, 3);
      rrc(g, 0, 0, 24, 12, l ? 0 : 6, r ? 0 : 6, r ? 0 : 6, l ? 0 : 6); g.fillStyle = '#9a6b42'; g.fill();
      g.strokeStyle = '#5b3a20'; g.lineWidth = 1.2; g.stroke();
      g.strokeStyle = 'rgba(60,35,15,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(3, 4); g.lineTo(12, 4); g.moveTo(8, 8); g.lineTo(20, 8); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(4, 1.5, 16, 1.5);
      if (!r) { g.fillStyle = '#d9b07a'; g.beginPath(); g.ellipse(20, 6, 3.4, 5, 0, 0, 7); g.fill(); g.strokeStyle = '#8a5d34'; g.beginPath(); g.ellipse(20, 6, 1.8, 2.8, 0, 0, 7); g.stroke(); }
      g.strokeStyle = '#3d2614'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, 0); g.lineTo(12, 5); g.lineTo(10, 9); g.stroke();
    });
  }
  function tileThorns(th, v) {
    return sprite(`th|${th.id}|${v}`, SPR_W, SPR_H, g => {
      g.translate(OX, OY);
      const r = rng(v * 11 + 5);
      if (th.glass) {
        for (let i = 0; i < 4; i++) {
          const x = 2 + i * 6 + r() * 2, hgt = 7 + r() * 7;
          g.fillStyle = i % 2 ? 'rgba(170,235,255,.85)' : 'rgba(120,210,240,.85)';
          g.beginPath(); g.moveTo(x - 3, 24); g.lineTo(x + r() * 2 - 1, 24 - hgt); g.lineTo(x + 3.5, 24); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - 1, 22); g.lineTo(x, 26 - hgt); g.stroke();
        }
        return;
      }
      if (th.id === 'forest' || th.id === 'night') {
        g.strokeStyle = th.thorn; g.lineWidth = 2.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(6, 10, 12, 26, 18, 13); g.bezierCurveTo(21, 9, 24, 15, 24, 20); g.stroke();
        g.beginPath(); g.moveTo(2, 24); g.bezierCurveTo(8, 16, 14, 22, 23, 17); g.stroke();
        g.fillStyle = th.thornTip;
        for (const [x, y, a] of [[4, 16, -2.2], [10, 18, -1.2], [15, 15, -2.6], [19, 11, -1.4], [7, 20, -0.6], [21, 16, -0.9]]) {
          g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-1.3, 0); g.lineTo(0, -4.5); g.lineTo(1.3, 0); g.fill(); g.restore();
        }
        g.fillStyle = '#7a2f6b'; g.beginPath(); g.arc(13, 20, 1.8, 0, 7); g.arc(16.5, 21.5, 1.6, 0, 7); g.fill();
        return;
      }
      for (let i = 0; i < 4; i++) {
        const x = 3 + i * 6, hgt = 9 + r() * 5;
        g.fillStyle = th.thorn; g.beginPath(); g.moveTo(x - 3.2, 24); g.lineTo(x, 24 - hgt); g.lineTo(x + 3.2, 24); g.fill();
        g.fillStyle = th.thornTip; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(x - 0.6, 22); g.lineTo(x, 25 - hgt); g.lineTo(x + 1.2, 22); g.fill(); g.globalAlpha = 1;
      }
    });
  }
  function tileGate(th) {
    return sprite('gate|' + th.id, SPR_W, SPR_H, g => {
      g.translate(OX, OY);
      for (let i = 0; i < 3; i++) {
        const x = 1 + i * 8;
        g.fillStyle = i % 2 ? '#7a5434' : '#8d6340'; g.fillRect(x, 0, 7, 24);
        g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x + 1, 0, 1.5, 24);
        g.strokeStyle = '#3e2816'; g.lineWidth = 1; g.strokeRect(x + 0.5, 0, 6, 24);
      }
      g.strokeStyle = '#2f5d2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(8, 14, 16, 2, 24, 10); g.stroke();
    });
  }

  /* ---------- small decoration sprites ---------- */
  function decoSprite(th, kind) {
    return sprite(`d|${th.id}|${kind}`, 40, 60, g => {
      g.translate(20, 56); // feet at bottom center
      if (kind === 'tuft') {
        g.fillStyle = th.capD; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 2.5 - 1.6, 0); g.lineTo(i * 3.2, -6 - (2 - Math.abs(i)) * 2.5); g.lineTo(i * 2.5 + 1.6, 0); g.fill(); }
        g.fillStyle = th.cap; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 3 - 1.2, 0); g.lineTo(i * 3.8 + 0.6, -7 - (1 - Math.abs(i)) * 3); g.lineTo(i * 3 + 1.2, 0); g.fill(); }
      } else if (kind.startsWith('flower')) {
        const col = { flower1: '#ff7aa8', flower2: '#ffd34d', flower3: '#ffffff' }[kind];
        g.strokeStyle = th.capD; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-1, -5, 0, -9); g.stroke();
        g.fillStyle = th.cap; g.beginPath(); g.ellipse(-2.5, -4, 2.4, 1.1, -0.5, 0, 7); g.fill();
        g.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.beginPath(); g.ellipse(Math.cos(a) * 2.4, -10 + Math.sin(a) * 2.4, 1.9, 1.3, a, 0, 7); g.fill(); }
        g.fillStyle = '#ffb12e'; g.beginPath(); g.arc(0, -10, 1.3, 0, 7); g.fill();
      } else if (kind === 'mush') {
        g.fillStyle = '#f2e6d0'; g.fillRect(-1.3, -5, 2.6, 5);
        g.fillStyle = '#e8573c'; g.beginPath(); g.ellipse(0, -5.5, 4.5, 3, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-1.8, -7, 0.8, 0, 7); g.arc(1.6, -6.4, 0.7, 0, 7); g.fill();
      } else if (kind === 'rock') {
        g.fillStyle = '#8b939c'; g.beginPath(); g.ellipse(0, -2.5, 5.5, 3.6, 0, Math.PI, 0); g.lineTo(5.5, 0); g.lineTo(-5.5, 0); g.fill();
        g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(-1.5, -4, 2.2, 1, -0.3, 0, 7); g.fill();
      } else if (kind === 'crystal') {
        const cols = ['#7ee0ff', '#c58bff', '#8affc8'];
        for (let i = 0; i < 3; i++) {
          const x = (i - 1) * 4, hgt = 9 + (i === 1 ? 7 : 0);
          g.fillStyle = cols[i]; g.globalAlpha = 0.9;
          g.beginPath(); g.moveTo(x - 2.5, 0); g.lineTo(x - 1.5 + (i - 1), -hgt); g.lineTo(x + 2.5, 0); g.fill();
          g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(x - 1, -1); g.lineTo(x - 1 + (i - 1), -hgt + 2); g.lineTo(x, -1); g.fill();
        }
        g.globalAlpha = 1;
      } else if (kind === 'fern') {
        g.strokeStyle = th.capD; g.lineWidth = 1.4;
        for (const a of [-0.9, -0.3, 0.3, 0.9]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.sin(a) * 6, -8, Math.sin(a) * 10, -6 - Math.cos(a) * 6); g.stroke(); }
      }
    });
  }
  function treeSprite(th, v) {
    return sprite(`tree|${th.id}|${v}`, 90, 140, g => {
      g.translate(45, 138);
      if (th.id === 'mountain') {
        g.fillStyle = '#5b4632'; g.fillRect(-2.5, -18, 5, 18);
        const layers = 4;
        for (let i = 0; i < layers; i++) {
          const w = 26 - i * 5, y = -14 - i * 15;
          g.fillStyle = i % 2 ? '#3f6e5a' : '#355f4e';
          g.beginPath(); g.moveTo(-w, y); g.lineTo(0, y - 26); g.lineTo(w, y); g.closePath(); g.fill();
          g.fillStyle = '#eef6fb'; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(-w * 0.45, y - 13); g.lineTo(0, y - 26); g.lineTo(w * 0.45, y - 13); g.lineTo(w * 0.2, y - 15); g.lineTo(0, y - 12); g.lineTo(-w * 0.25, y - 15); g.fill(); g.globalAlpha = 1;
        }
        return;
      }
      if (th.id === 'cave') {
        // stalagmite with glowing mushrooms
        g.fillStyle = '#323a52'; g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(-6, -40, 0, -70); g.quadraticCurveTo(6, -40, 14, 0); g.fill();
        g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(-2, -40, 0, -66); g.quadraticCurveTo(0, -30, 2, 0); g.fill();
        for (const [x, y, s] of [[-12, -4, 4], [11, -8, 3.4], [-6, -22, 3]]) {
          g.fillStyle = '#e6f7ff'; g.fillRect(x - 0.8, y, 1.6, 4);
          g.fillStyle = '#5fe0ff'; g.beginPath(); g.ellipse(x, y, s, s * 0.6, 0, Math.PI, 0); g.fill();
        }
        return;
      }
      if (th.id === 'night' && v % 3 === 2) {
        // lamp post
        g.fillStyle = '#20283c'; g.fillRect(-2, -78, 4, 78); g.fillRect(-6, -4, 12, 4);
        g.beginPath(); g.moveTo(-7, -78); g.lineTo(7, -78); g.lineTo(4, -90); g.lineTo(-4, -90); g.closePath(); g.fill();
        g.fillStyle = '#ffe9a8'; g.fillRect(-4, -88, 8, 9);
        const rg = g.createRadialGradient(0, -84, 2, 0, -84, 40); rg.addColorStop(0, 'rgba(255,220,140,.55)'); rg.addColorStop(1, 'rgba(255,220,140,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(0, -84, 40, 0, 7); g.fill();
        return;
      }
      const night = th.id === 'night';
      g.fillStyle = night ? '#2b2230' : '#7a5232'; g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(-3, -30, -3, -52); g.lineTo(3, -52); g.quadraticCurveTo(3, -30, 6, 0); g.fill();
      g.strokeStyle = night ? '#2b2230' : '#7a5232'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -40); g.lineTo(-14, -60); g.moveTo(1, -46); g.lineTo(14, -66); g.stroke();
      const c1 = night ? '#1f4a43' : (v % 2 ? '#4da455' : '#3f9a4c'), c2 = night ? '#2a5f55' : (v % 2 ? '#6cc063' : '#5db75a'), c3 = night ? '#357063' : '#92d977';
      const blobs = [[-20, -66, 18], [18, -70, 18], [0, -86, 22], [-8, -98, 15], [12, -96, 14], [0, -62, 16]];
      g.fillStyle = 'rgba(0,0,0,.15)'; for (const [x, y, s] of blobs) { g.beginPath(); g.arc(x + 2, y + 4, s, 0, 7); g.fill(); }
      g.fillStyle = c1; for (const [x, y, s] of blobs) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
      g.fillStyle = c2; for (const [x, y, s] of blobs) { g.beginPath(); g.arc(x - s * 0.25, y - s * 0.3, s * 0.68, 0, 7); g.fill(); }
      g.fillStyle = c3; g.globalAlpha = night ? 0.4 : 0.7; for (const [x, y, s] of blobs) { g.beginPath(); g.arc(x - s * 0.4, y - s * 0.5, s * 0.3, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      if (!night && v % 3 === 0) { g.fillStyle = '#ff5d5d'; for (const [x, y] of [[-14, -70], [10, -80], [-2, -94], [18, -66]]) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); } }
    });
  }

  /* ---------- parallax backgrounds ---------- */
  const SW = 768;
  function wave(x, parts) { let y = 0; for (const [a, k, p] of parts) y += a * Math.sin((x / SW) * Math.PI * 2 * k + p); return y; }
  function layerCanvas(key, h, draw) {
    return sprite(key, SW, h, g => draw(g, h));
  }
  function buildBG(th, H) {
    const id = th.id + '|' + H;
    const sky = sprite('sky|' + id, 8, H, g => {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, th.sky[0]); gr.addColorStop(0.55, th.sky[1]); gr.addColorStop(1, th.sky[2]);
      g.fillStyle = gr; g.fillRect(0, 0, 8, H);
    });
    const layers = [];
    const add = (f, top, draw) => { const h = H - top + 40; layers.push({ f, top, h, cv: layerCanvas(`L|${id}|${layers.length}`, h, draw) }); };
    if (th.id === 'forest') {
      add(0.06, H * 0.28, (g, h) => {
        g.fillStyle = th.far; g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= SW; x += 8) g.lineTo(x, 50 + wave(x, [[22, 2, 0.3], [12, 5, 1.2], [5, 11, 2]]));
        g.lineTo(SW, h); g.fill();
        const gr = g.createLinearGradient(0, 20, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,250,235,.45)'); g.fillStyle = gr; g.fillRect(0, 0, SW, h);
      });
      add(0.18, H * 0.4, (g, h) => {
        g.fillStyle = th.far2; g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= SW; x += 8) g.lineTo(x, 46 + wave(x, [[18, 3, 2.1], [9, 7, 0.4]]));
        g.lineTo(SW, h); g.fill();
        const r = rng(4);
        for (let i = 0; i < 26; i++) {
          const x = (i / 26) * SW + r() * 20, y = 46 + wave(x, [[18, 3, 2.1], [9, 7, 0.4]]) + 4, s = 10 + r() * 8;
          for (const dx of [-SW, 0, SW]) { g.fillStyle = '#7fb3a3'; g.beginPath(); g.arc(x + dx, y - s * 0.6, s, 0, 7); g.fill(); }
        }
      });
      add(0.34, H * 0.5, (g, h) => {
        const yf = x => 60 + wave(x, [[22, 2, 1.1], [10, 5, 2.4], [4, 9, 0.2]]);
        const r = rng(9);
        for (let i = 0; i < 18; i++) {
          const x = (i / 18) * SW + r() * 30, y = yf(x) + 10, s = 16 + r() * 14;
          for (const dx of [-SW, 0, SW]) {
            g.fillStyle = th.mid2; g.fillRect(x + dx - 2, y - s, 4, s);
            g.beginPath(); g.arc(x + dx, y - s - 4, s * 0.8, 0, 7); g.arc(x + dx - s * 0.5, y - s + 4, s * 0.55, 0, 7); g.arc(x + dx + s * 0.5, y - s + 3, s * 0.6, 0, 7); g.fill();
            g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x + dx - s * 0.25, y - s - 10, s * 0.35, 0, 7); g.fill();
          }
        }
        g.fillStyle = th.mid; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= SW; x += 8) g.lineTo(x, yf(x)); g.lineTo(SW, h); g.fill();
        g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); for (let x = 0; x <= SW; x += 8) g.lineTo(x, yf(x)); for (let x = SW; x >= 0; x -= 8) g.lineTo(x, yf(x) + 5); g.fill();
      });
      add(0.55, H * 0.62, (g, h) => {
        const r = rng(21);
        const yf = x => 70 + wave(x, [[10, 3, 0.8], [6, 8, 1.9]]);
        g.fillStyle = th.near;
        for (let i = 0; i < 9; i++) {
          const x = (i / 9) * SW + r() * 40, s = 26 + r() * 20;
          for (const dx of [-SW, 0, SW]) {
            g.fillRect(x + dx - 4, yf(x) - s * 1.6, 8, s * 1.6);
            g.beginPath(); g.arc(x + dx, yf(x) - s * 1.9, s, 0, 7); g.arc(x + dx - s * 0.7, yf(x) - s * 1.4, s * 0.7, 0, 7); g.arc(x + dx + s * 0.7, yf(x) - s * 1.5, s * 0.7, 0, 7); g.fill();
          }
        }
        g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= SW; x += 8) g.lineTo(x, yf(x)); g.lineTo(SW, h); g.fill();
      });
    } else if (th.id === 'mountain') {
      add(0.05, H * 0.18, (g, h) => {
        const yf = x => 90 + wave(x, [[40, 2, 0.5], [22, 4, 1.7], [10, 9, 0.9]]) - Math.abs(wave(x, [[30, 3, 2.2]]));
        g.fillStyle = th.far; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= SW; x += 6) g.lineTo(x, yf(x)); g.lineTo(SW, h); g.fill();
        g.fillStyle = '#f5f9fc'; g.beginPath();
        for (let x = 0; x <= SW; x += 6) g.lineTo(x, yf(x));
        for (let x = SW; x >= 0; x -= 6) g.lineTo(x, yf(x) + Math.max(0, Math.min(14 + 6 * Math.sin(x * 0.1), 96 - yf(x))));
        g.fill();
        const gr = g.createLinearGradient(0, 60, 0, h); gr.addColorStop(0, 'rgba(238,242,246,0)'); gr.addColorStop(0.6, 'rgba(238,242,246,.55)'); gr.addColorStop(1, 'rgba(238,242,246,.8)'); g.fillStyle = gr; g.fillRect(0, 0, SW, h);
      });
      add(0.16, H * 0.36, (g, h) => {
        const yf = x => 60 + wave(x, [[30, 3, 1.1], [14, 6, 0.3]]) - Math.abs(wave(x, [[18, 5, 1.4]]));
        g.fillStyle = th.mid; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= SW; x += 6) g.lineTo(x, yf(x)); g.lineTo(SW, h); g.fill();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); for (let x = 0; x <= SW; x += 6) g.lineTo(x, yf(x)); for (let x = SW; x >= 0; x -= 6) g.lineTo(x, yf(x) + 8); g.fill();
        const gr = g.createLinearGradient(0, 40, 0, h); gr.addColorStop(0, 'rgba(220,230,240,0)'); gr.addColorStop(1, 'rgba(220,230,240,.5)'); g.fillStyle = gr; g.fillRect(0, 0, SW, h);
      });
      add(0.38, H * 0.52, (g, h) => {
        const r = rng(33);
        const yf = x => 70 + wave(x, [[16, 2, 0.7], [8, 7, 2.2]]);
        g.fillStyle = th.near;
        for (let i = 0; i < 46; i++) {
          const x = (i / 46) * SW + r() * 12, s = 16 + r() * 22, y = yf(x) + 6;
          for (const dx of [-SW, 0, SW]) { g.beginPath(); g.moveTo(x + dx - s * 0.42, y); g.lineTo(x + dx, y - s * 1.7); g.lineTo(x + dx + s * 0.42, y); g.fill(); }
        }
        g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= SW; x += 8) g.lineTo(x, yf(x)); g.lineTo(SW, h); g.fill();
      });
    } else if (th.id === 'cave') {
      add(0.1, 0, (g, h) => {
        g.fillStyle = th.far;
        g.beginPath(); g.moveTo(0, 0); for (let x = 0; x <= SW; x += 6) g.lineTo(x, 40 + wave(x, [[16, 4, 0.2], [10, 11, 1.4]]) + Math.max(0, wave(x, [[60, 13, 0.8]]) - 30)); g.lineTo(SW, 0); g.fill();
        g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= SW; x += 6) g.lineTo(x, h - 120 + wave(x, [[18, 3, 2.2], [9, 9, 0.5]]) - Math.max(0, wave(x, [[50, 7, 1.7]]) - 25)); g.lineTo(SW, h); g.fill();
      });
      add(0.25, 0, (g, h) => {
        const r = rng(51);
        for (let i = 0; i < 14; i++) {
          const x = (i / 14) * SW + r() * 30, len = 40 + r() * 90;
          for (const dx of [-SW, 0, SW]) {
            g.fillStyle = th.mid; g.beginPath(); g.moveTo(x + dx - 12, 0); g.quadraticCurveTo(x + dx - 3, len * 0.6, x + dx, len); g.quadraticCurveTo(x + dx + 3, len * 0.6, x + dx + 12, 0); g.fill();
          }
        }
        for (let i = 0; i < 16; i++) {
          const x = (i / 16) * SW + r() * 30, y = h - 70 - r() * 60, s = 5 + r() * 8, c = i % 3 === 0 ? [197, 139, 255] : [126, 224, 255];
          for (const dx of [-SW, 0, SW]) {
            const rg = g.createRadialGradient(x + dx, y, 1, x + dx, y, s * 4); rg.addColorStop(0, rgba(c, 0.35)); rg.addColorStop(1, rgba(c, 0));
            g.fillStyle = rg; g.beginPath(); g.arc(x + dx, y, s * 4, 0, 7); g.fill();
            g.fillStyle = rgba(c, 0.85); g.beginPath(); g.moveTo(x + dx - s * 0.5, y + s); g.lineTo(x + dx, y - s * 1.2); g.lineTo(x + dx + s * 0.5, y + s); g.fill();
          }
        }
      });
      add(0.45, 0, (g, h) => {
        const r = rng(77);
        g.fillStyle = th.near;
        for (let i = 0; i < 6; i++) {
          const x = (i / 6) * SW + r() * 60, w = 30 + r() * 30;
          for (const dx of [-SW, 0, SW]) { g.beginPath(); g.moveTo(x + dx - w, h); g.quadraticCurveTo(x + dx - w * 0.3, h * 0.5, x + dx - w * 0.2, 0); g.lineTo(x + dx + w * 0.2, 0); g.quadraticCurveTo(x + dx + w * 0.3, h * 0.5, x + dx + w, h); g.fill(); }
        }
      });
    } else {
      add(0.05, H * 0.3, (g, h) => {
        const r = rng(91);
        let x = 0;
        while (x < SW) {
          const w = 18 + r() * 34, bh = 40 + r() * 110, y = 140 - bh;
          g.fillStyle = r() < 0.5 ? th.far : th.far2; g.fillRect(x, y + 20, w, h);
          if (r() < 0.25) { g.fillRect(x + w / 2 - 1, y + 4, 2, 18); }
          for (let wy = y + 28; wy < 150; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) {
            if (r() < 0.32) { g.fillStyle = r() < 0.8 ? 'rgba(255,214,120,.85)' : 'rgba(170,220,255,.8)'; g.fillRect(wx, wy, 3.2, 4.2); }
          }
          x += w + 2 + r() * 6;
        }
        g.fillStyle = th.far2; g.fillRect(0, 150, SW, h);
      });
      add(0.2, H * 0.48, (g, h) => {
        const r = rng(12);
        const yf = x => 64 + wave(x, [[8, 3, 0.4], [4, 8, 1.1]]);
        for (let i = 0; i < 16; i++) {
          const x = (i / 16) * SW + r() * 30, s = 14 + r() * 14;
          for (const dx of [-SW, 0, SW]) {
            g.fillStyle = th.mid; g.fillRect(x + dx - 2, yf(x) - s * 1.4, 4, s * 1.4);
            g.beginPath(); g.arc(x + dx, yf(x) - s * 1.6, s, 0, 7); g.arc(x + dx - s * 0.6, yf(x) - s * 1.2, s * 0.7, 0, 7); g.arc(x + dx + s * 0.6, yf(x) - s * 1.25, s * 0.7, 0, 7); g.fill();
            g.fillStyle = 'rgba(160,200,255,.08)'; g.beginPath(); g.arc(x + dx - s * 0.3, yf(x) - s * 2, s * 0.45, 0, 7); g.fill();
          }
        }
        g.fillStyle = th.mid; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= SW; x += 8) g.lineTo(x, yf(x)); g.lineTo(SW, h); g.fill();
      });
      add(0.42, H * 0.62, (g, h) => {
        const yf = x => 74 + wave(x, [[6, 4, 2.2], [3, 11, 0.4]]);
        g.fillStyle = th.near; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= SW; x += 6) g.lineTo(x, yf(x) - 6 * Math.abs(Math.sin(x * 0.09))); g.lineTo(SW, h); g.fill();
        g.strokeStyle = th.near; g.lineWidth = 2;
        for (let x = 0; x < SW; x += 64) {
          g.fillStyle = th.near; g.fillRect(x + 20, yf(x) - 46, 3, 46);
          const rg = g.createRadialGradient(x + 21.5, yf(x) - 48, 1, x + 21.5, yf(x) - 48, 26); rg.addColorStop(0, 'rgba(255,214,140,.55)'); rg.addColorStop(1, 'rgba(255,214,140,0)');
          g.fillStyle = rg; g.beginPath(); g.arc(x + 21.5, yf(x) - 48, 26, 0, 7); g.fill();
          g.fillStyle = '#ffe6a6'; g.beginPath(); g.arc(x + 21.5, yf(x) - 48, 3, 0, 7); g.fill();
        }
      });
    }
    let stars = null;
    if (th.stars) {
      const r = rng(5); stars = [];
      for (let i = 0; i < 60; i++) stars.push({ x: r() * SW, y: r() * H * 0.5, s: 0.5 + r() * 1.3, p: r() * 6 });
    }
    return { sky, layers, stars };
  }
  function cloudSprite(i) {
    return sprite('cloud|' + i, 120, 50, g => {
      const r = rng(100 + i);
      g.fillStyle = 'rgba(255,255,255,.92)';
      const n = 5;
      for (let k = 0; k < n; k++) { const x = 22 + k * 18 + r() * 6, y = 30 - Math.sin((k / (n - 1)) * Math.PI) * 10 - r() * 4, s = 12 + r() * 6; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
      g.fillRect(16, 30, 88, 12);
      g.fillStyle = 'rgba(190,215,235,.5)'; g.fillRect(16, 38, 88, 4);
    });
  }
  function glowSprite(rgb, r) {
    return sprite('glow|' + rgb + '|' + r, r * 2, r * 2, g => {
      const c = rgb.split(',');
      const rg = g.createRadialGradient(r, r, 0, r, r, r);
      rg.addColorStop(0, `rgba(${c},.85)`); rg.addColorStop(0.35, `rgba(${c},.35)`); rg.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = rg; g.fillRect(0, 0, r * 2, r * 2);
    });
  }
  function seedSprite() {
    return sprite('seed', 30, 30, g => {
      const rg = g.createRadialGradient(15, 15, 1, 15, 15, 15);
      rg.addColorStop(0, 'rgba(255,240,150,.75)'); rg.addColorStop(0.45, 'rgba(255,220,90,.25)'); rg.addColorStop(1, 'rgba(255,220,90,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 30, 30);
      const gr = g.createLinearGradient(10, 9, 20, 22); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(1, '#f2b632');
      g.fillStyle = gr; g.beginPath(); g.moveTo(15, 8.5); g.bezierCurveTo(21, 12, 20.5, 21, 15, 21.5); g.bezierCurveTo(9.5, 21, 9, 12, 15, 8.5); g.fill();
      g.strokeStyle = '#b07a14'; g.lineWidth = 0.9; g.stroke();
      g.fillStyle = '#6ccf47'; g.beginPath(); g.ellipse(18.5, 8.6, 3.6, 1.7, -0.5, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(13.3, 13.5, 1.3, 2.4, 0.3, 0, 7); g.fill();
    });
  }

  /* ---------- Fini, the fox ---------- */
  const FOX = { fur: '#ee7230', furD: '#c4501e', cream: '#fff0dc', dark: '#3d2214', line: '#6b2a12', scarf: '#2fae5e', scarfD: '#1f7f43', pink: '#f6a7a0' };
  // o: {pose, t, ph (run phase), vx, star, leaf, acorn, glide, blink}
  function drawFini(g, o) {
    const P = o.pose, t = o.t, ph = o.ph || 0;
    let tailA = -0.55 + Math.sin(t * 3) * 0.12, legF = 0, legB = 0, armF = 0.3, armB = -0.2, bodyY = 0, bodyR = 0, earA = 0, headR = 0;
    if (P === 'run') { const s = Math.sin(ph); legF = s * 0.95; legB = -s * 0.95; armF = -s * 0.8; armB = s * 0.8; bodyY = -Math.abs(Math.cos(ph)) * 1.4; tailA = -0.1 + Math.sin(ph * 2) * 0.15; earA = -0.15; bodyR = 0.08; }
    else if (P === 'jump') { legF = -0.9; legB = 0.6; armF = -2.3; armB = -1.8; tailA = -0.85; earA = -0.25; }
    else if (P === 'fall') { legF = 0.35; legB = -0.25; armF = -2.6; armB = -2.9; tailA = 0.25; earA = 0.25; }
    else if (P === 'glide') { legF = 0.2; legB = -0.1; armF = -2.9; armB = -2.95; tailA = -0.05 + Math.sin(t * 9) * 0.1; earA = 0.1; }
    else if (P === 'hurt') { legF = 0.6; legB = -0.6; armF = -2.2 + Math.sin(t * 30) * 0.4; armB = -1 - Math.sin(t * 30) * 0.4; tailA = 0.4; earA = 0.5; headR = -0.2; }
    else if (P === 'swim') { const s = Math.sin(t * 9); legF = s * 0.8; legB = -s * 0.8; armF = -1.4 + s; armB = -1.4 - s; bodyR = 0.35; tailA = 0.1 + s * 0.15; }
    else if (P === 'wall') { legF = -0.6; legB = 0.4; armF = -1.9; armB = -1.4; tailA = 0.35; bodyR = -0.1; }
    else if (P === 'plant') { legF = -0.5; legB = 0.8; armF = 0.9 + Math.sin(t * 8) * 0.2; armB = 0.6; bodyY = 3; headR = 0.25; tailA = -0.4 + Math.sin(t * 5) * 0.2; }
    else if (P === 'cheer') { const s = Math.sin(t * 10); legF = 0; legB = 0; armF = -2.6 + s * 0.3; armB = -2.6 - s * 0.3; bodyY = -Math.abs(s) * 3; tailA = -0.9 + s * 0.2; }
    else { bodyY = Math.sin(t * 2.4) * 0.5; }

    if (o.star) {
      const rg = g.createRadialGradient(0, -14, 2, 0, -14, 26);
      rg.addColorStop(0, 'rgba(255,240,140,.55)'); rg.addColorStop(1, 'rgba(255,200,80,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(0, -14, 26, 0, 7); g.fill();
    }
    g.lineJoin = 'round'; g.lineCap = 'round';
    const line = o.star ? `hsl(${(t * 400) % 360},90%,45%)` : FOX.line;
    g.save(); g.translate(0, bodyY); g.rotate(bodyR);
    // glide leaf (behind head, held up)
    if (P === 'glide') {
      g.save(); g.translate(1, -44); g.rotate(Math.sin(t * 4) * 0.08);
      g.fillStyle = '#5fbf46'; g.beginPath(); g.moveTo(-17, 2); g.bezierCurveTo(-12, -9, 12, -9, 17, 2); g.bezierCurveTo(8, -1, -8, -1, -17, 2); g.fill();
      g.strokeStyle = '#3a8a31'; g.lineWidth = 1.2; g.stroke();
      g.beginPath(); g.moveTo(-15, 1); g.quadraticCurveTo(0, -6, 15, 1); g.stroke();
      g.strokeStyle = '#6b4a2a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -1); g.lineTo(0, 12); g.stroke();
      g.restore();
    }
    // tail
    g.save(); g.translate(-5, -9); g.rotate(tailA);
    g.fillStyle = FOX.fur; g.strokeStyle = line; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(1, -3); g.bezierCurveTo(-5, -10, -17, -9, -19, -2); g.bezierCurveTo(-17, 4, -6, 5, 1, 3); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = FOX.cream; g.beginPath(); g.moveTo(-13, -7.6); g.bezierCurveTo(-17, -7, -19.2, -4, -19, -2); g.bezierCurveTo(-18, 2, -15, 3.4, -12.5, 3.4); g.quadraticCurveTo(-15, -1, -13, -7.6); g.fill();
    g.restore();
    // scarf tails (behind body)
    const sw = Math.sin(t * 12) * 2, flow = Math.min(1, Math.abs(o.vx || 0) / 150) + (P === 'jump' || P === 'fall' || P === 'glide' ? 0.6 : 0);
    g.fillStyle = FOX.scarfD;
    g.beginPath(); g.moveTo(-3, -17); g.quadraticCurveTo(-9, -16 + sw * 0.5 - flow * 2, -14 - flow * 3, -15 + sw); g.lineTo(-13 - flow * 3, -12 + sw); g.quadraticCurveTo(-8, -13, -2, -14.5); g.fill();
    g.fillStyle = FOX.scarf;
    g.beginPath(); g.moveTo(-3, -17.5); g.quadraticCurveTo(-8, -18 - sw * 0.4 - flow * 3, -12 - flow * 4, -19 - sw * 0.6 - flow * 2); g.lineTo(-12 - flow * 4, -16 - sw * 0.6 - flow); g.quadraticCurveTo(-7, -15, -2, -15); g.fill();
    // back leg + back arm
    const leg = (x, a) => { g.save(); g.translate(x, -7.5); g.rotate(a); g.fillStyle = FOX.dark; rr(g, -2.1, 0, 4.2, 7.5, 2); g.fill(); g.beginPath(); g.ellipse(1, 7.2, 3, 1.8, 0, 0, 7); g.fill(); g.restore(); };
    const arm = (x, a) => { g.save(); g.translate(x, -14); g.rotate(a); g.fillStyle = FOX.furD; rr(g, -1.7, 0, 3.4, 6.5, 1.7); g.fill(); g.fillStyle = FOX.dark; g.beginPath(); g.arc(0, 6.4, 1.9, 0, 7); g.fill(); g.restore(); };
    leg(-2, legB); arm(-2.5, armB);
    if (o.acorn) { g.fillStyle = '#9a6a3c'; g.beginPath(); g.ellipse(-5.5, -10, 3.6, 4.2, 0.2, 0, 7); g.fill(); g.strokeStyle = '#5a3a1c'; g.lineWidth = 1; g.stroke(); g.fillStyle = '#5a3a1c'; g.fillRect(-7.5, -14.5, 4, 1.6); }
    // body
    g.fillStyle = FOX.fur; g.strokeStyle = line; g.lineWidth = 1.1;
    g.beginPath(); g.ellipse(0, -11, 6, 6.6, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = FOX.cream; g.beginPath(); g.ellipse(1.9, -10, 3.4, 4.6, 0, 0, 7); g.fill();
    leg(2, legF);
    // scarf band
    g.fillStyle = FOX.scarf; g.beginPath(); g.ellipse(0.5, -16.5, 6.2, 2.5, 0, 0, 7); g.fill();
    g.fillStyle = FOX.scarfD; g.beginPath(); g.ellipse(0.5, -15.4, 5.4, 1.2, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#ffffff'; g.globalAlpha = 0.35; g.fillRect(-2, -18.4, 5, 0.9); g.globalAlpha = 1;
    // head
    g.save(); g.translate(1.5, -23); g.rotate(headR);
    const ear = (x, y, a) => {
      g.save(); g.translate(x, y); g.rotate(a + earA);
      g.fillStyle = FOX.fur; g.strokeStyle = line; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(-3.4, 2); g.lineTo(0, -7); g.lineTo(3.4, 2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = FOX.pink; g.beginPath(); g.moveTo(-1.6, 1.4); g.lineTo(0, -3.6); g.lineTo(1.6, 1.4); g.fill();
      g.fillStyle = FOX.dark; g.beginPath(); g.moveTo(-1.3, -3.6); g.lineTo(0, -7); g.lineTo(1.3, -3.6); g.fill();
      g.restore();
    };
    ear(-4, -5, -0.25);
    g.fillStyle = FOX.fur; g.strokeStyle = line; g.lineWidth = 1.1;
    g.beginPath(); g.ellipse(0, 0, 8, 7.2, 0, 0, 7); g.fill(); g.stroke();
    ear(2.5, -6, 0.12);
    // muzzle + cheek
    g.fillStyle = FOX.cream;
    g.beginPath(); g.moveTo(1, -0.5); g.quadraticCurveTo(6, -2.5, 10.4, 1.2); g.quadraticCurveTo(7, 5.5, 1.5, 4.8); g.quadraticCurveTo(-1.5, 3, 1, -0.5); g.fill();
    g.strokeStyle = line; g.lineWidth = 0.9; g.beginPath(); g.moveTo(10.4, 1.2); g.quadraticCurveTo(7, 5.5, 1.5, 4.8); g.stroke();
    g.fillStyle = FOX.dark; g.beginPath(); g.arc(10.2, 0.9, 1.6, 0, 7); g.fill();
    g.strokeStyle = FOX.dark; g.lineWidth = 0.9; g.beginPath(); g.moveTo(7.5, 3.4); g.quadraticCurveTo(8.6, 4.2, 9.4, 3.2); g.stroke();
    // eye
    if (P === 'hurt') {
      g.strokeStyle = FOX.dark; g.lineWidth = 1.4; g.beginPath(); g.moveTo(2.4, -3.4); g.lineTo(5, -1.6); g.lineTo(2.4, 0); g.stroke();
    } else if (o.blink || P === 'plant') {
      g.strokeStyle = FOX.dark; g.lineWidth = 1.4; g.beginPath(); g.arc(4, -1.2, 1.8, 0.2, Math.PI - 0.2); g.stroke();
    } else {
      g.fillStyle = FOX.dark; g.beginPath(); g.ellipse(4, -1.6, 1.8, 2.4, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(4.6, -2.5, 0.75, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(255,120,110,.35)'; g.beginPath(); g.ellipse(0.5, 2.5, 2, 1.2, 0, 0, 7); g.fill();
    if (o.leaf && P !== 'glide') {
      g.fillStyle = '#5fbf46'; g.beginPath(); g.ellipse(-1, -7.5, 4.6, 2, -0.35, 0, 7); g.fill();
      g.strokeStyle = '#3a8a31'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-5, -6); g.lineTo(3, -9); g.stroke();
    }
    g.restore();
    arm(2.5, armF);
    g.restore();
  }

  /* ---------- enemies, animals, items ---------- */
  function drawSmog(g, e, t) {
    const wob = Math.sin(t * 5 + e.x * 0.1) * 0.06, sq = e.dead ? Math.max(0.15, 1 - e.deadT * 4) : 1;
    g.save(); g.translate(e.x + e.w / 2, e.y + e.h); g.scale(1 + wob + (1 - sq) * 0.6, (1 - wob) * sq);
    const blobs = [[-6, -7, 6], [5, -8, 6.5], [0, -12, 6.5], [-2, -5, 6], [7, -4, 4.5], [-8, -3, 4]];
    g.fillStyle = '#5f5a78'; for (const [x, y, s] of blobs) { g.beginPath(); g.arc(x, y + 1.2, s, 0, 7); g.fill(); }
    g.fillStyle = '#8e88a8'; for (const [x, y, s] of blobs) { g.beginPath(); g.arc(x, y, s - 0.6, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(-2, -14, 3, 0, 7); g.fill();
    const f = e.vx >= 0 ? 1 : -1;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-2 + f * 2, -8, 2.4, 2.8, 0, 0, 7); g.ellipse(4 + f * 2, -8, 2.4, 2.8, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2438'; g.beginPath(); g.arc(-2 + f * 3, -7.6, 1.3, 0, 7); g.arc(4 + f * 3, -7.6, 1.3, 0, 7); g.fill();
    g.strokeStyle = '#2a2438'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-5 + f * 2, -11.5); g.lineTo(-0.5 + f * 2, -10.4); g.moveTo(7 + f * 2, -11.5); g.lineTo(2.5 + f * 2, -10.4); g.stroke();
    g.beginPath(); g.arc(1 + f * 2, -3, 2, Math.PI + 0.4, -0.4); g.stroke();
    g.restore();
  }
  function drawCrawler(g, e, t) {
    const f = e.vx >= 0 ? 1 : -1;
    g.save(); g.translate(e.x + e.w / 2, e.y + e.h); g.scale(f, 1);
    const step = Math.sin(t * 14 + e.x * 0.2);
    g.strokeStyle = '#33373d'; g.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 5, -3); g.lineTo(i * 5 + (i % 2 ? step : -step) * 2, 0); g.stroke(); }
    g.fillStyle = '#5b6f86'; rr(g, -10, -11, 20, 9, 4); g.fill();
    g.fillStyle = '#c44a3d'; g.fillRect(-6, -10.5, 7, 8);
    g.fillStyle = '#e8ecef'; g.fillRect(-4.6, -8, 4, 1.4);
    g.strokeStyle = '#2b3542'; g.lineWidth = 1; rr(g, -10, -11, 20, 9, 4); g.stroke();
    g.fillStyle = '#d8dee4'; g.strokeStyle = '#4a5560'; g.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 4 - 2, -10.5); g.lineTo(i * 4 + 0.3, -16.5 - (i === 0 ? 1.5 : 0)); g.lineTo(i * 4 + 2, -10.5); g.closePath(); g.fill(); g.stroke(); }
    g.fillStyle = '#ff4d4d'; g.beginPath(); g.arc(8, -7, 1.6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(8.4, -7.4, 0.5, 0, 7); g.fill();
    g.restore();
  }
  function drawBat(g, e, t) {
    g.save(); g.translate(e.x + e.w / 2, e.y + e.h / 2);
    if (!e.awake) {
      g.fillStyle = '#4a3d6b'; g.beginPath(); g.ellipse(0, 0, 4.5, 6.5, 0, 0, 7); g.fill();
      g.fillStyle = '#ffd34d'; g.fillRect(-2.5, 1, 1.4, 0.8); g.fillRect(1.1, 1, 1.4, 0.8);
      g.restore(); return;
    }
    const fl = Math.sin(t * 22 + e.x) * 0.9;
    g.fillStyle = '#5c4b85';
    for (const s of [-1, 1]) {
      g.save(); g.scale(s, 1); g.rotate(-fl * 0.5);
      g.beginPath(); g.moveTo(2, -1); g.quadraticCurveTo(8, -7 - fl * 3, 13, -2 - fl * 2); g.quadraticCurveTo(10, 0, 9, 2); g.quadraticCurveTo(7, 0, 5, 3); g.quadraticCurveTo(4, 1, 2, 2); g.fill();
      g.restore();
    }
    g.fillStyle = '#6e5c99'; g.beginPath(); g.ellipse(0, 0, 4.6, 4.2, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(-3.5, -2); g.lineTo(-2.6, -6.5); g.lineTo(-1, -3); g.moveTo(3.5, -2); g.lineTo(2.6, -6.5); g.lineTo(1, -3); g.fill();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(-1.6, -0.6, 1.1, 0, 7); g.arc(1.6, -0.6, 1.1, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-1.2, 2, 0.9, 1.4); g.fillRect(0.3, 2, 0.9, 1.4);
    g.restore();
  }
  function drawBoss(g, b, t, world) {
    const hurt = b.state === 'hurt' && Math.floor(t * 20) % 2 === 0;
    const sq = b.squash || 0;
    g.save(); g.translate(b.x + b.w / 2, b.y + b.h); g.scale(b.face, 1); g.scale(1 + sq * 0.25, 1 - sq * 0.25);
    if (b.state === 'tele') g.translate(Math.sin(t * 60) * 1.5, 0);
    const base = world === 1 ? ['#6b5c80', '#4d4161', '#8c80a3'] : world === 2 ? ['#4f6b4a', '#3a5236', '#6f8f69'] : ['#5b6470', '#3f4650', '#7c8794'];
    if (hurt) g.globalAlpha = 0.55;
    // body heap
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 0, 28, 5, 0, 0, 7); g.fill();
    g.fillStyle = base[1];
    g.beginPath(); g.moveTo(-28, 0); g.bezierCurveTo(-32, -18, -22, -44, 0, -46); g.bezierCurveTo(22, -44, 32, -18, 28, 0); g.closePath(); g.fill();
    g.fillStyle = base[0];
    g.beginPath(); g.moveTo(-25, -2); g.bezierCurveTo(-28, -18, -20, -41, 0, -43); g.bezierCurveTo(20, -41, 27, -18, 25, -2); g.closePath(); g.fill();
    // bag knots and litter stuck in the heap
    g.fillStyle = base[2]; g.beginPath(); g.ellipse(-12, -30, 7, 5, -0.4, 0, 7); g.ellipse(14, -24, 6, 4.5, 0.5, 0, 7); g.fill();
    if (world === 2) { g.fillStyle = 'rgba(160,150,190,.6)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-14 + i * 9, -46 - Math.sin(t * 3 + i) * 3, 5, 0, 7); g.fill(); } }
    g.fillStyle = '#3e9c5a'; rr(g, 15, -44, 6, 14, 2); g.fill(); g.fillStyle = '#9ee2b1'; g.fillRect(16.5, -42, 1.5, 9);
    g.fillStyle = '#d4483b'; rr(g, -24, -16, 9, 12, 2); g.fill(); g.fillStyle = '#e8e8e8'; g.fillRect(-23, -12, 7, 2);
    g.fillStyle = '#c9a26b'; g.save(); g.translate(10, -8); g.rotate(0.3); g.fillRect(-6, -5, 12, 9); g.restore();
    // face
    const blink = Math.sin(t * 1.7) > 0.97;
    g.fillStyle = '#fff6c9'; g.beginPath(); g.ellipse(-7, -28, 6, blink ? 1 : 6.5, 0, 0, 7); g.ellipse(8, -28, 6, blink ? 1 : 6.5, 0, 0, 7); g.fill();
    if (!blink) { g.fillStyle = '#1e1a24'; g.beginPath(); g.arc(-5, -27, 2.8, 0, 7); g.arc(10, -27, 2.8, 0, 7); g.fill(); }
    g.strokeStyle = '#1e1a24'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-14, -37); g.lineTo(-2, -33); g.moveTo(15, -37); g.lineTo(3, -33); g.stroke();
    g.fillStyle = '#2a1f2e'; g.beginPath(); g.moveTo(-9, -16); g.quadraticCurveTo(1, -10, 12, -16); g.quadraticCurveTo(2, -22, -9, -16); g.fill();
    g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-6 + i * 5, -17.5); g.lineTo(-4.5 + i * 5, -14.5); g.lineTo(-3 + i * 5, -17.5); g.fill(); }
    if (world === 3) { // can crown
      g.fillStyle = '#e6c34a';
      g.beginPath(); g.moveTo(-12, -44); g.lineTo(-10, -55); g.lineTo(-5, -48); g.lineTo(0, -58); g.lineTo(5, -48); g.lineTo(10, -55); g.lineTo(12, -44); g.closePath(); g.fill();
      g.strokeStyle = '#9b7a1d'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = '#d4483b'; g.beginPath(); g.arc(0, -50, 2, 0, 7); g.fill();
    }
    // arms
    const sw = Math.sin(t * 6) * 0.4;
    g.strokeStyle = base[1]; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-24, -14); g.lineTo(-32, -6 + sw * 6); g.moveTo(24, -14); g.lineTo(33, -18 - sw * 6); g.stroke();
    g.restore();
  }
  function drawAnimal(g, kind, x, y, t, happy) {
    const A = ANIMALS[kind] || ANIMALS.hedgehog;
    g.save(); g.translate(x, y);
    const hop = happy ? -Math.abs(Math.sin(t * 9)) * 5 : Math.sin(t * 2) * 0.4;
    g.translate(0, hop);
    if (A.tail === 'bushy') { g.fillStyle = A.body; g.beginPath(); g.ellipse(-7, -9, 4, 7, -0.4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(-8, -12, 1.6, 3, -0.4, 0, 7); g.fill(); }
    if (A.tail === 'long') { g.strokeStyle = A.body; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-4, -3); g.quadraticCurveTo(-10, -2, -12, -5); g.stroke(); }
    if (A.frog) {
      g.fillStyle = A.body; g.beginPath(); g.ellipse(0, -4, 7, 4.6, 0, 0, 7); g.fill();
      g.fillStyle = A.belly; g.beginPath(); g.ellipse(1, -3, 4.5, 2.5, 0, 0, 7); g.fill();
      for (const s of [-1, 1]) { g.fillStyle = A.body; g.beginPath(); g.arc(s * 3.5, -8.5, 2.6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 3.5, -8.8, 1.6, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(s * 3.5 + 0.4, -8.8, 0.8, 0, 7); g.fill(); }
      g.restore(); return;
    }
    if (A.quills) { g.fillStyle = '#5b4535'; for (let i = 0; i < 7; i++) { const a = Math.PI + i * 0.45; g.beginPath(); g.moveTo(Math.cos(a) * 5, -6 + Math.sin(a) * 5); g.lineTo(Math.cos(a) * 10, -6 + Math.sin(a) * 9); g.lineTo(Math.cos(a + 0.3) * 5, -6 + Math.sin(a + 0.3) * 5); g.fill(); } }
    g.fillStyle = A.body; g.beginPath(); g.ellipse(0, -5.5, 6.5, 5.5, 0, 0, 7); g.fill();
    if (A.wings) { g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(-3, -5, 3, 4.5, 0.3, 0, 7); g.fill(); }
    g.fillStyle = A.belly; g.beginPath(); g.ellipse(1.5, -4.5, 3.5, 3.6, 0, 0, 7); g.fill();
    if (A.stripes) { g.fillStyle = '#f2f2f2'; g.fillRect(3, -14, 1.6, 6); }
    if (A.spots) { g.fillStyle = 'rgba(255,255,255,.7)'; for (const [sx, sy] of [[-3, -7], [-1, -9], [-4, -4]]) { g.beginPath(); g.arc(sx, sy, 0.9, 0, 7); g.fill(); } }
    if (A.dots) { g.fillStyle = A.dots; for (const [sx, sy] of [[-3, -7], [0, -9], [-4, -4], [2, -6]]) { g.beginPath(); g.arc(sx, sy, 1.1, 0, 7); g.fill(); } }
    // head
    g.fillStyle = A.body; g.beginPath(); g.arc(4, -11, 4.4, 0, 7); g.fill();
    if (A.ears === 'long') { g.beginPath(); g.ellipse(2.5, -18, 1.4, 4.2, -0.15, 0, 7); g.ellipse(5.5, -18, 1.4, 4.2, 0.15, 0, 7); g.fill(); }
    else if (A.ears === 'round') { g.beginPath(); g.arc(1.5, -14.5, 1.6, 0, 7); g.arc(6.5, -14.5, 1.6, 0, 7); g.fill(); }
    else if (A.ears === 'tuft' || A.ears === 'pointy') { g.beginPath(); g.moveTo(0.5, -13); g.lineTo(1.5, -18); g.lineTo(3.5, -14); g.moveTo(5, -14); g.lineTo(7, -18); g.lineTo(8, -13); g.fill(); }
    if (A.stripes) { g.fillStyle = '#f2f2f2'; g.beginPath(); g.ellipse(4.5, -12, 1.2, 3.5, 0, 0, 7); g.fill(); }
    g.fillStyle = '#1e1a1a'; g.beginPath(); g.arc(5.6, -11.6, 1, 0, 7); g.fill();
    if (A.beak) { g.fillStyle = '#f2b632'; g.beginPath(); g.moveTo(7.5, -10.5); g.lineTo(10, -9.6); g.lineTo(7.5, -8.8); g.fill(); }
    else { g.fillStyle = '#3a2a2a'; g.beginPath(); g.arc(8.3, -10.3, 0.8, 0, 7); g.fill(); }
    if (happy) { g.strokeStyle = '#1e1a1a'; g.lineWidth = 0.8; g.beginPath(); g.arc(6, -9, 1.2, 0.2, Math.PI - 0.2); g.stroke(); }
    g.restore();
  }
  function drawCage(g, x, y, broken, t) {
    g.save(); g.translate(x, y);
    if (!broken) {
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-12, -1, 24, 2);
      g.strokeStyle = '#7a8a99'; g.lineWidth = 1.6;
      for (let i = -10; i <= 10; i += 4) { g.beginPath(); g.moveTo(i, -1); g.lineTo(i, -21); g.stroke(); }
      g.fillStyle = '#8b6a48'; rr(g, -13, -24, 26, 4, 1.5); g.fill(); rr(g, -13, -2, 26, 3, 1.5); g.fill();
      g.strokeStyle = 'rgba(200,220,235,.55)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-11, -18); g.lineTo(11, -6); g.moveTo(11, -18); g.lineTo(-11, -6); g.stroke();
      g.fillStyle = '#d9b44a'; rr(g, -3, -14, 6, 5, 1); g.fill(); g.strokeStyle = '#8a6a1a'; g.lineWidth = 1; g.beginPath(); g.arc(0, -14, 2, Math.PI, 0); g.stroke();
    }
    g.restore();
  }
  function drawLantern(g, x, y, lit, t) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#5a4030'; g.fillRect(-1.5, -34, 3, 34); g.fillRect(-1.5, -34, 10, 2.5);
    g.strokeStyle = '#3a2a1e'; g.lineWidth = 1; g.beginPath(); g.moveTo(7, -31.5); g.lineTo(7, -28); g.stroke();
    if (lit) {
      const f = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
      g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(7, -22, 1, 7, -22, 26 * f); rg.addColorStop(0, 'rgba(255,200,90,.6)'); rg.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(7, -22, 26 * f, 0, 7); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    g.fillStyle = '#3a2a1e'; rr(g, 3, -28, 8, 11, 2); g.fill();
    g.fillStyle = lit ? '#ffd970' : '#56606b'; rr(g, 4.2, -26.5, 5.6, 8, 1.5); g.fill();
    if (lit) { g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(7, -22, 1.3, 2.4 + Math.sin(t * 15) * 0.4, 0, 0, 7); g.fill(); }
    g.fillStyle = '#3a2a1e'; g.beginPath(); g.moveTo(2.5, -28); g.lineTo(7, -31); g.lineTo(11.5, -28); g.fill();
    g.restore();
  }
  function drawGoal(g, x, y, t, grow, show) {
    g.save(); g.translate(x, y);
    if (show < 1) g.globalAlpha = Math.max(0, show);
    // glowing ring
    const pulse = 0.6 + Math.sin(t * 3) * 0.2;
    g.globalCompositeOperation = 'lighter';
    const rg = g.createRadialGradient(0, -6, 2, 0, -6, 30); rg.addColorStop(0, `rgba(160,255,140,${0.35 * pulse})`); rg.addColorStop(1, 'rgba(160,255,140,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(0, -6, 30, 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over';
    // sign
    g.fillStyle = '#7a5434'; g.fillRect(12, -26, 3, 26);
    g.fillStyle = '#c99a62'; rr(g, 4, -32, 20, 12, 2); g.fill(); g.strokeStyle = '#6b4a2a'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#3f9a45'; g.beginPath(); g.ellipse(11, -27, 2.6, 1.4, -0.6, 0, 7); g.ellipse(16, -27.5, 2.6, 1.4, 0.6, 0, 7); g.fill();
    g.strokeStyle = '#3f9a45'; g.beginPath(); g.moveTo(13.5, -22); g.lineTo(13.5, -27); g.stroke();
    // soil mound
    g.fillStyle = '#6b4329'; g.beginPath(); g.ellipse(-2, 0, 13, 5.5, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#8a5a38'; g.beginPath(); g.ellipse(-2, -0.5, 10, 3.6, 0, Math.PI, 0); g.fill();
    if (grow > 0) {
      const s = Math.min(1, grow);
      g.save(); g.translate(-2, -2); g.scale(s, s);
      g.strokeStyle = '#7a5232'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(1, -12, 0, -22); g.stroke();
      const leaves = [[-6, -14, -0.6], [6, -17, 0.6], [-5, -23, -0.9], [5, -25, 0.9], [0, -29, 0]];
      for (const [lx, ly, a] of leaves) { g.fillStyle = '#4fb34a'; g.beginPath(); g.ellipse(lx, ly, 5.5, 2.6, a, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(lx - 1, ly - 0.6, 2.4, 0.9, a, 0, 7); g.fill(); }
      g.restore();
    }
    g.restore();
  }
  function drawSpring(g, x, y, sq, th) {
    g.save(); g.translate(x + 12, y + 24);
    const s = 1 - sq * 0.45;
    g.fillStyle = '#efe2c8'; rr(g, -4, -10 * s, 8, 10 * s, 2); g.fill();
    g.strokeStyle = '#b39c78'; g.lineWidth = 1; g.stroke();
    g.save(); g.translate(0, -10 * s); g.scale(1 + sq * 0.25, 1 - sq * 0.2);
    const gr = g.createLinearGradient(0, -12, 0, 0); gr.addColorStop(0, '#9d7dff'); gr.addColorStop(1, '#5b3fc4');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-12, 0); g.bezierCurveTo(-12, -14, 12, -14, 12, 0); g.closePath(); g.fill();
    g.strokeStyle = '#3d2a8a'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#e9e1ff'; for (const [px, py, r] of [[-6, -5, 2], [1, -8, 2.4], [7, -4, 1.7]]) { g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }
    g.restore(); g.restore();
  }
  function drawPickup(g, kind, x, y, t) {
    g.save(); g.translate(x, y + Math.sin(t * 4) * 2);
    g.drawImage(glowSprite(kind === 'heart' ? '255,120,140' : kind === 'berry' ? '255,230,120' : '170,255,150', 18), -18, -18, 36, 36);
    if (kind === 'leaf') {
      g.rotate(Math.sin(t * 3) * 0.3);
      g.fillStyle = '#5fbf46'; g.beginPath(); g.moveTo(0, -8); g.bezierCurveTo(7, -4, 6, 5, 0, 8); g.bezierCurveTo(-6, 5, -7, -4, 0, -8); g.fill();
      g.strokeStyle = '#3a8a31'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -7); g.lineTo(0, 9); g.stroke();
    } else if (kind === 'acorn') {
      for (const [ax, ay] of [[-4, 2], [4, 2], [0, -3]]) {
        g.fillStyle = '#b07a3e'; g.beginPath(); g.ellipse(ax, ay + 1.5, 3.2, 3.8, 0, 0, 7); g.fill();
        g.fillStyle = '#6b4523'; g.beginPath(); g.ellipse(ax, ay - 1.5, 3.6, 2, 0, Math.PI, 0); g.fill(); g.fillRect(ax - 0.5, ay - 4.5, 1, 2);
      }
    } else if (kind === 'berry') {
      g.rotate(t * 2);
      g.fillStyle = '#ffcf3d'; star(g, 0, 0, 8, 4, 5, -Math.PI / 2); g.fill();
      g.strokeStyle = '#d68a10'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#ff6fa0'; g.beginPath(); g.arc(0, 0, 2.6, 0, 7); g.fill();
    } else if (kind === 'heart') {
      g.fillStyle = '#ff4d6d'; heartPath(g, 0, -6, 13); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-3, -2.5, 1.6, 2.4, -0.5, 0, 7); g.fill();
    }
    g.restore();
  }

  /* ======================================================================
     Runtime: world map, level loop, enemies, boss, HUD, touch controls.
     ====================================================================== */
  const MAPN = [[0.2, 0.93], [0.47, 0.87], [0.76, 0.9], [0.84, 0.73], [0.58, 0.64], [0.28, 0.61], [0.13, 0.49], [0.4, 0.41], [0.68, 0.35], [0.87, 0.24], [0.6, 0.14], [0.27, 0.09]];
  const T = TILE, K = Core.K;

  function mount(root, ctx) {
    const s = Kit.strings(STR);
    const Lx = o => (typeof window.L === 'function' ? window.L(o) : o.de);
    const d = ctx.data;
    if (!Array.isArray(d.lv)) d.lv = [];
    for (let i = 0; i < LEVELS.length; i++) d.lv[i] = Object.assign({ d: 0, s: 0, a: 0, sd: 0, t: 0 }, d.lv[i] || {});
    if (typeof d.sel !== 'number') d.sel = 0;
    const unlocked = i => i === 0 || !!d.lv[i - 1].d;
    const lvStars = i => (d.lv[i].d ? 1 : 0) + (d.lv[i].s ? 1 : 0) + (d.lv[i].a ? 1 : 0);
    if (!unlocked(d.sel)) d.sel = 0;

    root.innerHTML = `<div class="pf-root"><canvas class="pf-cv" aria-label="${UI.escapeHtml(s('title'))}"></canvas>
      <div class="pf-pause" hidden><div class="pf-card"><h3>${UI.escapeHtml(s('paused'))}</h3>
        <button class="btn btn-primary" data-a="resume">${UI.escapeHtml(s('resume'))}</button>
        <button class="btn btn-outline" data-a="restart">${UI.escapeHtml(s('restart'))}</button>
        <button class="btn btn-outline" data-a="map">${UI.escapeHtml(s('toMap'))}</button>
        <button class="btn btn-ghost" data-a="rules">${UI.escapeHtml(s('rules'))}</button>
        <p class="pf-keys">${UI.escapeHtml(s('keys'))}</p></div></div></div>`;
    const wrap = root.querySelector('.pf-root'), cv = root.querySelector('.pf-cv'), g = cv.getContext('2d');
    const pauseEl = root.querySelector('.pf-pause');

    let W = 360, H = 560, bg = null, bgKey = '';
    function resize() {
      const rw = Math.round(wrap.clientWidth) || 360;
      const top = wrap.getBoundingClientRect().top;
      const avail = (window.innerHeight || 700) - Math.max(0, top) - 14;
      W = Math.max(280, Math.min(460, rw));
      H = Math.round(Math.max(440, Math.min(580, avail)));
      const nd = Math.max(1, Math.min(2, Math.round((window.devicePixelRatio || 1) * 4) / 4));
      if (nd !== DPR) { DPR = nd; cache.clear(); if (G) prepTiles(); }
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.height = H + 'px';
      bg = null;
    }

    /* ---------- input ---------- */
    const keys = { l: false, r: false, j: false, th: 0 };
    const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', Space: 'j', ArrowUp: 'j', KeyW: 'j', KeyK: 'j', KeyX: 'x', KeyJ: 'x' };
    const modalOpen = () => !!document.querySelector('#modal-root .modal-backdrop');
    let touchUI = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0;
    function onKey(e) {
      if (!alive) return;
      const down = e.type === 'keydown', k = KEYMAP[e.code];
      if (!down) { if (k && k !== 'x') keys[k] = false; return; }
      if (modalOpen()) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (down && (e.code === 'KeyP' || e.code === 'Escape')) { if (screen === 'level') setPause(!paused); e.preventDefault(); return; }
      if (screen === 'map' && down) {
        if (e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'KeyD' || e.code === 'KeyW') { selectNode(d.sel + 1); e.preventDefault(); }
        else if (e.code === 'ArrowLeft' || e.code === 'ArrowDown' || e.code === 'KeyA' || e.code === 'KeyS') { selectNode(d.sel - 1); e.preventDefault(); }
        else if (e.code === 'Enter' || e.code === 'Space') { playSelected(); e.preventDefault(); }
        return;
      }
      if (!k) return;
      e.preventDefault();
      if (k === 'x') { if (down && !e.repeat) keys.th++; return; }
      keys[k] = down;
      if (down && !e.repeat) touchUI = false;
    }
    const ptrs = new Map();
    function cxy(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }
    function onPDown(e) {
      if (!alive) return;
      if (e.pointerType === 'touch') touchUI = true;
      const [x, y] = cxy(e);
      try { cv.setPointerCapture(e.pointerId); } catch (er) { }
      e.preventDefault();
      if (screen === 'level' && !touchUI && e.pointerType === 'mouse') { if (Math.hypot(x - (W - 26), y - 24) < 22) setPause(true); return; }
      ptrs.set(e.pointerId, { x, y, th: false });
      if (screen === 'map') { mapTap(x, y); return; }
      if (Math.hypot(x - (W - 26), y - 24) < 22) { setPause(true); ptrs.delete(e.pointerId); return; }
      if (G && G.power === 'acorn' && touchUI && Math.hypot(x - thrBtn.x, y - thrBtn.y) < thrBtn.r + 8) { keys.th++; ptrs.get(e.pointerId).th = true; }
    }
    function onPMove(e) { const p = ptrs.get(e.pointerId); if (!p) return; const [x, y] = cxy(e); p.x = x; p.y = y; }
    function onPUp(e) { ptrs.delete(e.pointerId); }
    const ctl = { l: false, r: false, j: false };
    const dirBtn = { lx: 50, rx: 124, y: 0, r: 31 }, jmpBtn = { x: 0, y: 0, r: 40 }, thrBtn = { x: 0, y: 0, r: 25 };
    function layoutCtl() { dirBtn.y = H - 58; jmpBtn.x = W - 60; jmpBtn.y = H - 66; thrBtn.x = W - 142; thrBtn.y = H - 48; }
    function touchInput() {
      ctl.l = ctl.r = ctl.j = false;
      if (screen !== 'level') return ctl;
      for (const p of ptrs.values()) {
        if (p.th) continue;
        if (p.y < H * 0.45) continue;
        if (p.x < W * 0.5) { if (p.x < (dirBtn.lx + dirBtn.rx) / 2) ctl.l = true; else ctl.r = true; }
        else ctl.j = true;
      }
      return ctl;
    }

    /* ---------- particles ---------- */
    const PN = 220, parts = [];
    for (let i = 0; i < PN; i++) parts.push({ a: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, col: '#fff', g: 0, type: 0, rot: 0, vr: 0 });
    let pi = 0;
    function emit(type, x, y, vx, vy, life, size, col, grav) {
      const p = parts[pi]; pi = (pi + 1) % PN;
      p.a = true; p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.size = size; p.col = col; p.g = grav || 0; p.rot = Math.random() * 6; p.vr = (Math.random() - 0.5) * 8;
    }
    function burst(type, x, y, n, spd, life, size, cols, grav, up) {
      for (let i = 0; i < n; i++) {
        const a = up ? -Math.PI / 2 + (Math.random() - 0.5) * up : Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.6);
        emit(type, x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.6 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.6), cols[i % cols.length], grav);
      }
    }
    function dust(x, y, n, spread) { for (let i = 0; i < n; i++) emit(0, x + (Math.random() - 0.5) * (spread || 10), y - 2, (Math.random() - 0.5) * 70, -10 - Math.random() * 30, 0.35 + Math.random() * 0.25, 2.5 + Math.random() * 2.5, G && G.th.id === 'cave' ? '#8a90a8' : G && G.th.id === 'night' ? '#9a8aa0' : '#e9dcc4', -20); }

    /* ---------- level runtime ---------- */
    let screen = 'map', G = null, paused = false, alive = true, god = false, clock = 0;
    let trans = null, banner = null, replayQ = null;
    const inp = { l: false, r: false, j: false };

    function mkEnemy(e) {
      const x = e.c * T, y = (e.r + 1) * T;
      if (e.t === 's') return { t: 's', x: x + 3, y: y - 16, w: 18, h: 16, vx: -28, vy: 0, alive: true, deadT: 0 };
      if (e.t === 'k') return { t: 'k', x: x + 2, y: y - 14, w: 20, h: 14, vx: -36, vy: 0, alive: true, deadT: 0 };
      return { t: 'b', x: x + 4, y: e.r * T + 2, w: 16, h: 12, hx: x + 4, hy: e.r * T + 2, vx: 0, vy: 0, awake: false, alive: true, deadT: 0, ph: Math.random() * 6 };
    }
    function prepTiles() {
      const L = G.L, th = G.th, n = L.cols * L.rows;
      G.spr = new Array(n).fill(null);
      const isG = (c, r) => { if (c < 0 || c >= L.cols) return r >= 0 && (Core.cell(L, Math.max(0, Math.min(L.cols - 1, c)), r) === K.GROUND); if (r >= L.rows) return true; if (r < 0) return !!G.def.cave; const k = L.grid[r * L.cols + c]; return k === K.GROUND || k === K.COVER && !th.bush; };
      for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
        const i = r * L.cols + c, k = L.grid[i], v = (hash(c, r) * 6) | 0;
        if (k === K.GROUND) G.spr[i] = tileGround(th, (isG(c, r - 1) ? 1 : 0) | (isG(c + 1, r) ? 2 : 0) | (isG(c, r + 1) ? 4 : 0) | (isG(c - 1, r) ? 8 : 0), v);
        else if (k === K.COVER) { const same = (cc, rr2) => { const kk = Core.cell(L, cc, rr2); return kk === K.COVER || kk === K.GROUND || rr2 >= L.rows; }; G.spr[i] = tileCover(th, (same(c, r - 1) ? 1 : 0) | (same(c + 1, r) ? 2 : 0) | (same(c, r + 1) ? 4 : 0) | (same(c - 1, r) ? 8 : 0), v); }
        else if (k === K.BLOCK) { const b = (cc, rr2) => Core.cell(L, cc, rr2) === K.BLOCK && cc >= 0 && cc < L.cols; G.spr[i] = tileBlock(th, (b(c, r - 1) ? 1 : 0) | (b(c + 1, r) ? 2 : 0) | (b(c, r + 1) ? 4 : 0) | (b(c - 1, r) ? 8 : 0), v); }
        else if (k === K.PLANK) G.spr[i] = tilePlank(th, Core.cell(L, c - 1, r) === K.PLANK, Core.cell(L, c + 1, r) === K.PLANK);
        else if (k === K.CRUMBLE) G.spr[i] = tileLog(Core.cell(L, c - 1, r) === K.CRUMBLE, Core.cell(L, c + 1, r) === K.CRUMBLE);
        else if (k === K.THORNS) G.spr[i] = tileThorns(th, v % 3);
        else if (k === K.GATE) G.spr[i] = tileGate(th);
      }
      // decoration
      G.deco = []; G.trees = [];
      const kinds = th.id === 'cave' ? ['crystal', 'rock', 'crystal'] : th.id === 'mountain' ? ['tuft', 'rock', 'flower3', 'fern'] : th.id === 'night' ? ['tuft', 'fern', 'flower3', 'tuft'] : ['tuft', 'flower1', 'flower2', 'mush', 'tuft', 'fern', 'flower3'];
      for (let c = 0; c < L.cols; c++) for (let r = 1; r < L.rows; r++) {
        const k = L.grid[r * L.cols + c], up = L.grid[(r - 1) * L.cols + c];
        if (k !== K.GROUND || up !== K.AIR) continue;
        const h1 = hash(c * 3 + 1, r * 7 + 2);
        if (h1 < 0.42) G.deco.push({ x: c * T + 4 + hash(c, r + 9) * 16, y: r * T + 1, spr: decoSprite(th, kinds[(hash(c + 5, r) * kinds.length) | 0]) });
        const h2 = hash(c * 11 + 3, r * 5 + 1);
        let clear = true; for (let k2 = 1; k2 <= 4; k2++) if (Core.cell(L, c, r - k2) !== K.AIR) clear = false;
        if (h2 < (th.id === 'cave' ? 0.08 : 0.1) && clear && c > 2) G.trees.push({ x: c * T + 12, y: r * T + 2, spr: treeSprite(th, (hash(c, 99) * 6) | 0) });
      }
    }
    function startLevel(i) {
      const def = LEVELS[i];
      const L = Core.parse(def);
      G = {
        i, def, L, th: THEMES[def.theme], P: Core.PH, s: Core.newSim(L), ab: { wall: def.w >= 1, leaf: false }, t: 0,
        hearts: 3, power: null, berryT: 0, inv: 0, seedsGot: 0, seedsTotal: L.seeds.length + L.boxes,
        seeds: L.seeds.map(p => Object.assign({ got: false }, p)), items: L.hearts.map(h => ({ kind: 'heart', x: h.x, y: h.y, t: 0, rise: 0, got: false })),
        bumps: new Map(), springs: new Map(), enemies: L.enemies.map(mkEnemy), shots: [], bshots: [], rocks: [],
        boss: L.boss ? { x: L.boss.x - 26, y: L.boss.y - 44, w: 52, h: 44, vx: 0, vy: 0, face: -1, hp: 3, state: 'idle', st: 0, squash: 0, floor: L.boss.y } : null,
        gateClosed: false, animal: L.animal ? Object.assign({ rescued: false, rt: 0 }, L.animal) : null,
        cp: { x: L.start.x, y: L.start.y }, cps: L.checkpoints.map(c => Object.assign({}, c)),
        time: def.time, elapsed: 0, adUsed: false, cam: { x: 0, y: 0 }, shake: 0, sqx: 1, sqy: 1, runPh: 0, blink: 0, blinkT: 2.5,
        state: 'play', stT: 0, goalShow: L.boss ? 0 : 1, goalGrow: 0, goalT: 0, msg: null, coverA: 1, thrCd: 0, combo: 0, comboT: 0, dustT: 0, prevVy: 0, ghost: false
      };
      prepTiles();
      snapCam();
      screen = 'level'; paused = false; pauseEl.hidden = true;
      banner = { t: 0, text: `${def.id}  ·  ${Lx(def.name)}`, sub: def.boss ? s('bossName' + def.boss) : WORLDS[def.w] && Lx(WORLDS[def.w].name) };
      irisIn(G.s.x + 7 - G.cam.x, G.s.y + 11 - G.cam.y);
      d.sel = i; ctx.save();
      if (def.w >= 1 && !d.wallTip) { d.wallTip = 1; ctx.save(); setTimeout(() => G && G.i === i && say(s('wall'), 3.2), 1600); }
    }
    function snapCam() {
      const s0 = G.s, levelH = G.L.rows * T;
      G.cam.x = Math.max(0, Math.min(G.L.cols * T - W, s0.x + 7 - W * 0.4));
      G.cam.y = H >= levelH ? levelH - H : Math.max(0, Math.min(levelH - H, s0.y - H * 0.55));
    }
    function say(text, dur) { if (G) G.msg = { text, t: 0, dur: dur || 2.2 }; }
    function hurt(dir) {
      if (!G || G.inv > 0 || G.berryT > 0 || god || G.state !== 'play') return;
      const S = G.s;
      G.hearts--; G.inv = 1.6; S.hurt = 0.32; S.vx = dir * 170; S.vy = -300; S.gr = false; S.mover = -1; S.lock = 0;
      G.shake = Math.max(G.shake, 5); ctx.sound('oof');
      burst(5, S.x + 7, S.y + 6, 5, 90, 0.7, 5, ['#ff5d7a'], 120, 2);
      if (G.hearts <= 0) { G.state = 'dying'; G.stT = 0; }
    }
    function fell() {
      if (god) { G.s.y = G.L.rows * T - 30; G.s.vy = -760; return; }
      G.hearts--; ctx.sound('fail');
      G.state = 'dying'; G.stT = 0;
    }
    function respawn() {
      const S = Core.newSim(G.L); S.t = G.s.t; S.x = G.cp.x; S.y = G.cp.y; S.gr = false;
      G.s = S; G.inv = 1.5; G.state = 'play'; G.sqx = G.sqy = 1;
      snapCam(); irisIn(S.x + 7 - G.cam.x, S.y + 11 - G.cam.y);
    }
    function gameOver() {
      G.state = 'over'; ctx.sound('gameover');
      const actions = [];
      if (!G.adUsed) actions.push({ label: s('contAd'), cls: 'btn-ad', onClick: () => {
        G.adUsed = true;
        ctx.ad().then(ok => { if (!alive || !G) return; if (ok) { G.hearts = 3; G.time = Math.max(G.time, 90); respawn(); } else gameOver(); });
      } });
      actions.push({ label: s('retry'), cls: 'btn-primary', onClick: () => startLevel(G.i) });
      actions.push({ label: s('toMap'), cls: 'btn-ghost', onClick: () => toMap() });
      const m = UI.modal({ dismissible: false, html: `<div class="pf-over"><div class="pf-over-ic">🦊</div><h3>${UI.escapeHtml(s('oops'))}</h3><p>${UI.escapeHtml(s('oopsText'))}</p></div>`, actions });
      m.actions.classList.add('stack');
    }
    function toMap() { screen = 'map'; G = null; paused = false; pauseEl.hidden = true; mapHop = null; irisIn(nodeXY(d.sel)[0], nodeXY(d.sel)[1]); }
    function setPause(on) {
      if (screen !== 'level' || !G || G.state === 'over') on = false;
      paused = on; pauseEl.hidden = !on;
      for (const k of ['l', 'r', 'j']) keys[k] = false;
      ptrs.clear();
    }
    function startGoal() {
      if (G.state !== 'play') return;
      G.state = 'goal'; G.goalT = 0; G.s.vx = 0; G.inv = 0;
      ctx.sound('bell');
    }
    function finishLevel() {
      const i = G.i, rec = d.lv[i];
      const allSeeds = G.seedsGot >= G.seedsTotal, animal = !!(G.animal && G.animal.rescued);
      const runStars = 1 + (allSeeds ? 1 : 0) + (animal ? 1 : 0);
      const isNew = !rec.d || (allSeeds && !rec.s) || (animal && !rec.a);
      rec.d = 1; if (allSeeds) rec.s = 1; if (animal) rec.a = 1; rec.sd = Math.max(rec.sd || 0, G.seedsGot);
      const secs = Math.round(G.elapsed); rec.t = rec.t ? Math.min(rec.t, secs) : secs;
      const hasNext = i + 1 < LEVELS.length;
      d.sel = i; ctx.save();
      if (i === 3) ctx.badge('platformer_world1');
      if (d.lv.every(r => r.d)) ctx.badge('platformer_all');
      const lines = [s('lineSeeds', { a: G.seedsGot, b: G.seedsTotal }), animal ? s('lineAnimal', { name: Lx(ANIMALS[G.def.animal].name) }) : s('lineNoAnimal'),
        s('lineTime', { t: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` }), s('lineStars', { n: lvStars(i) })];
      const reward = isNew ? 5 * runStars : 2;
      screen = 'map'; G = null; mapHop = null;
      irisIn(nodeXY(i)[0], nodeXY(i)[1]);
      if (hasNext) setTimeout(() => { if (alive && screen === 'map' && d.sel === i) selectNode(i + 1, true); }, 800);
      Kit.result(ctx, { result: 'win', title: `${s('done')} ${'★'.repeat(runStars)}${'☆'.repeat(3 - runStars)}`, lines, stars: reward,
        onNext: hasNext ? () => startLevel(i + 1) : null, nextLabel: s('next'), againLabel: s('again'), onAgain: () => { } });
    }

    /* ---------- level update ---------- */
    function solidAt(L, x, y) { const k = Core.cell(L, Math.floor(x / T), Math.floor(y / T)); return Core.SOLID[k]; }
    function floorAt(L, x, y) { const k = Core.cell(L, Math.floor(x / T), Math.floor(y / T)); return Core.SOLID[k] || Core.ONEWAY[k]; }
    function overlap(a, bx, by, bw, bh) { return a.x < bx + bw && a.x + 14 > bx && a.y < by + bh && a.y + 22 > by; }
    function killEnemy(e, how) {
      e.alive = false; e.deadT = 0.0001;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      if (e.t === 's') { burst(0, cx, cy, 10, 70, 0.6, 5, ['#c9c4dc', '#ffffff', '#a39cbd'], -30); burst(2, cx, cy, 4, 60, 1, 3, ['#7ccf4a', '#a5e46e'], 60, 2); }
      else if (e.t === 'k') { burst(3, cx, cy, 8, 120, 0.6, 3, ['#d8dee4', '#5b6f86', '#c44a3d'], 500, 2.5); }
      else burst(0, cx, cy, 8, 60, 0.5, 4, ['#8f7fbd', '#ffffff'], -20);
      ctx.sound(how === 'stomp' ? 'bounce' : 'pop');
    }
    function updateLevel(dt) {
      const L = G.L, S = G.s;
      G.t += dt;
      if (G.msg) { G.msg.t += dt; if (G.msg.t > G.msg.dur) G.msg = null; }
      if (banner) { banner.t += dt; if (banner.t > 2.6) banner = null; }
      if (G.state === 'dying') {
        G.stT += dt; S.vx *= 0.9;
        if (G.stT > 0.25 && !trans) irisOut(S.x + 7 - G.cam.x, S.y + 11 - G.cam.y, () => { if (!G) return; if (G.hearts <= 0) gameOver(); else respawn(); });
        updateCam(dt); updateParts(dt); return;
      }
      if (G.state === 'over') { updateParts(dt); return; }
      // input
      let th = false;
      if (replayQ) {
        const a = replayQ.q[Math.floor(replayQ.k / replayQ.m)];
        if (a == null) { replayQ = null; inp.l = inp.r = inp.j = false; }
        else { inp.l = a.l; inp.r = a.r; inp.j = a.j; replayQ.k++; }
      } else {
        const tc = touchInput();
        inp.l = keys.l || tc.l; inp.r = keys.r || tc.r; inp.j = keys.j || tc.j;
        if (keys.th > 0) { th = true; keys.th = 0; }
      }
      if (G.state === 'goal') { inp.l = inp.r = false; inp.j = false; }
      // timers
      G.elapsed += dt;
      if (G.state === 'play' && !god) {
        G.time -= dt;
        if (G.time <= 0) { G.time = 60; say(s('timeUp')); G.inv = 0; hurt(0); }
      }
      if (G.inv > 0) G.inv -= dt;
      if (G.berryT > 0) { G.berryT -= dt; if (Math.random() < 0.5) emit(1, S.x + Math.random() * 14, S.y + Math.random() * 22, 0, -20, 0.5, 2.5, Math.random() < 0.5 ? '#fff1a8' : '#ffffff', 0); }
      if (G.thrCd > 0) G.thrCd -= dt;
      if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
      // physics
      const prevY = S.y, prevVy = S.vy, wasGr = S.gr;
      const ev = Core.step(L, S, inp, dt, G.P, G.ab);
      const E = Core.EV;
      if (ev & E.JUMP) { ctx.sound('jump'); G.sqx = 0.8; G.sqy = 1.22; dust(S.x + 7, S.y + 22, 3, 8); }
      if (ev & E.WJUMP) { ctx.sound('djump'); G.sqx = 0.82; G.sqy = 1.18; dust(S.x + (S.vx > 0 ? 0 : 14), S.y + 12, 4, 4); }
      if (ev & E.LAND) {
        const k = Math.min(1, (S.landV || 0) / 620);
        G.sqx = 1 + 0.32 * k; G.sqy = 1 - 0.26 * k;
        if (k > 0.3) { dust(S.x + 7, S.y + 22, 3 + Math.round(k * 5), 14); ctx.sound('land'); }
      }
      if (ev & E.SPRING) { ctx.sound('bounce'); G.springs.set(S.spring, 0); G.sqx = 0.72; G.sqy = 1.32; burst(1, S.x + 7, S.y + 22, 6, 90, 0.5, 3, ['#c9b8ff', '#ffffff'], 0, 2.4); }
      if (ev & E.SKID) { G.dustT -= dt; if (G.dustT <= 0) { G.dustT = 0.05; dust(S.x + 7, S.y + 22, 1, 6); } }
      if (ev & E.SPLASH) {
        ctx.sound('splash');
        for (let i = 0; i < 10; i++) emit(0, S.x + 7 + (Math.random() - 0.5) * 12, S.y + 12, (Math.random() - 0.5) * 120, -80 - Math.random() * 120, 0.6, 2 + Math.random() * 2, '#cdefff', 600);
      }
      if (ev & E.SWIM) { emit(0, S.x + 7, S.y + 18, 0, 20, 0.5, 2, 'rgba(220,245,255,.9)', -60); }
      if (ev & E.CRUMBLE) ctx.sound('crack');
      if (ev & E.BUMP) bumpBox(S.bump);
      if (ev & E.HAZARD) hurt(S.vx > 0 ? -1 : 1);
      if (ev & E.FELL) { fell(); return; }
      if (S.gr && Math.abs(S.vx) > 120) { G.dustT -= dt; if (G.dustT <= 0) { G.dustT = 0.13; dust(S.x + 7 - S.face * 5, S.y + 22, 1, 4); } }
      if (S.wall) { G.dustT -= dt; if (G.dustT <= 0) { G.dustT = 0.07; emit(0, S.x + (S.wall > 0 ? 14 : 0), S.y + 18, -S.wall * 15, -20, 0.35, 2.4, '#e9dcc4', -10); } }
      if (S.glide && Math.random() < 0.15) emit(2, S.x + 7, S.y - 14, (Math.random() - 0.5) * 30, 20, 0.8, 2.6, '#7ccf4a', 30);
      G.runPh += Math.abs(S.vx) * dt * 0.085;
      G.sqx += (1 - G.sqx) * (1 - Math.exp(-dt * 13)); G.sqy += (1 - G.sqy) * (1 - Math.exp(-dt * 13));
      G.blinkT -= dt; if (G.blinkT <= 0) { G.blink = 0.12; G.blinkT = 2 + Math.random() * 3; } if (G.blink > 0) G.blink -= dt;
      for (const [i, t] of G.bumps) { const nt = t + dt; if (nt > 0.22) G.bumps.delete(i); else G.bumps.set(i, nt); }
      for (const [i, t] of G.springs) { const nt = t + dt; if (nt > 0.35) G.springs.delete(i); else G.springs.set(i, nt); }

      // throw acorns
      if (th && G.power === 'acorn' && G.thrCd <= 0 && G.shots.length < 2 && G.state === 'play') {
        G.shots.push({ x: S.x + 7 + S.face * 6, y: S.y + 7, vx: S.face * 250 + S.vx * 0.3, vy: -140, t: 0, b: 0 });
        G.thrCd = 0.28; ctx.sound('whoosh');
      }
      // collectibles
      const pcx = S.x + 7, pcy = S.y + 11;
      for (const p of G.seeds) {
        if (p.got || Math.abs(pcx - p.x) > 14 || Math.abs(pcy - p.y) > 17) continue;
        p.got = true; G.seedsGot++; G.combo++; G.comboT = 0.6;
        ctx.sound('coin', Math.min(G.combo, 8));
        burst(1, p.x, p.y, 7, 80, 0.45, 3, ['#fff3a0', '#ffffff', '#ffd34d'], 0);
      }
      for (const it of G.items) {
        if (it.got) continue;
        it.t += dt;
        if (it.rise > 0) { it.rise -= dt; it.y -= dt * 60; }
        else if (it.phys) { // pop out, then drop and roll a little
          it.vy = Math.min(320, it.vy + 900 * dt);
          const nx = it.x + it.vx * dt;
          if (solidAt(L, nx + Math.sign(it.vx) * 7, it.y)) it.vx = -it.vx; else it.x = nx;
          const ny = it.y + it.vy * dt;
          if (it.vy > 0 && floorAt(L, it.x, ny + 9)) { it.y = Math.floor((ny + 9) / T) * T - 9; it.vy = 0; it.vx *= Math.exp(-dt * 5); }
          else it.y = ny;
          if (it.y > L.rows * T + 20) { it.got = true; continue; }
        }
        if (Math.abs(pcx - it.x) > 14 || Math.abs(pcy - it.y) > 17 || it.rise > 0.15) continue;
        it.got = true;
        burst(1, it.x, it.y, 10, 100, 0.6, 3.5, ['#fff3a0', '#ffffff', '#a5e46e'], 0);
        if (it.kind === 'leaf') { G.power = 'leaf'; G.ab.leaf = true; say(s('leaf'), 3); ctx.sound('leaf'); ctx.sound('star'); }
        else if (it.kind === 'acorn') { G.power = 'acorn'; G.ab.leaf = false; say(s('acorn'), 3); ctx.sound('star'); }
        else if (it.kind === 'berry') { G.berryT = 8; say(s('berry')); ctx.sound('levelup'); }
        else { G.hearts = Math.min(3, G.hearts + 1); say(s('heart')); ctx.sound('harvest'); }
      }
      for (const c of G.cps) {
        if (c.lit || Math.abs(pcx - c.x) > 16 || pcy < c.y - 40 || pcy > c.y + 4) continue;
        c.lit = true; G.cp = { x: c.x - 7, y: c.y - 22 };
        ctx.sound('checkpoint'); say(s('checkpoint'));
        burst(1, c.x + 7, c.y - 22, 12, 90, 0.7, 3, ['#ffd970', '#fff6d0'], 0);
      }
      if (G.animal) {
        const A = G.animal;
        if (!A.rescued && Math.abs(pcx - A.x) < 16 && pcy > A.y - 30 && pcy < A.y + 4) {
          A.rescued = true; A.rt = 0; ctx.sound('rare');
          say(s('rescued', { name: Lx(ANIMALS[G.def.animal].name) }), 2.6);
          burst(3, A.x, A.y - 12, 10, 130, 0.7, 3, ['#8b6a48', '#7a8a99'], 500, 2.4);
          burst(5, A.x, A.y - 16, 6, 70, 1.2, 5, ['#ff7a9a', '#ffb3c6'], -40, 1.6);
        }
        if (A.rescued) A.rt += dt;
      }
      // goal
      if (G.state === 'play' && G.goalShow >= 1 && Math.abs(pcx - G.L.goal.x) < 18 && pcy > G.L.goal.y - 110 && pcy < G.L.goal.y + 4) startGoal();
      if (G.state === 'goal') updateGoal(dt);

      updateEnemies(dt, prevY, prevVy);
      updateBoss(dt, prevY, prevVy);
      updateShots(dt);
      // secret cover fade
      const inCover = coverAt(S.x + 2, S.y + 2) || coverAt(S.x + 12, S.y + 2) || coverAt(S.x + 2, S.y + 20) || coverAt(S.x + 12, S.y + 20);
      G.coverA += ((inCover ? 0.28 : 1) - G.coverA) * (1 - Math.exp(-dt * 8));
      updateCam(dt);
      updateParts(dt);
    }
    function coverAt(x, y) { return Core.cell(G.L, Math.floor(x / T), Math.floor(y / T)) === K.COVER; }
    function bumpBox(i) {
      if (i < 0) return;
      const L = G.L, k = L.grid[i], c = i % L.cols, r = (i / L.cols) | 0;
      G.bumps.set(i, 0);
      // knock out enemies standing on the box
      for (const e of G.enemies) if (e.alive && e.t !== 'b' && e.x + e.w > c * T && e.x < (c + 1) * T && Math.abs(e.y + e.h - r * T) < 3) killEnemy(e, 'bump');
      if (k === K.BOX) {
        L.grid[i] = K.BOX_USED; G.seedsGot++;
        ctx.sound('coin', 3);
        const x = c * T + 12, y = r * T - 6;
        burst(1, x, y, 9, 90, 0.5, 3, ['#fff3a0', '#ffffff', '#ffd34d'], 0, 2);
        G.items.push({ kind: 'seedfx', x, y, t: 0, rise: 0, got: true, fx: 0.5 });
      } else if (k === K.BOX_LEAF || k === K.BOX_ACORN || k === K.BOX_BERRY || k === K.BOX_HEART) {
        L.grid[i] = K.BOX_USED;
        G.items.push({ kind: { 4: 'leaf', 5: 'acorn', 6: 'berry', 15: 'heart' }[k], x: c * T + 12, y: r * T + 4, t: 0, rise: 0.33, got: false, phys: true, vx: 55 * (G.s.face || 1), vy: -120 });
        ctx.sound('pop');
      } else ctx.sound('tap');
    }
    function updateGoal(dt) {
      const S = G.s, gx = G.L.goal.x;
      G.goalT += dt;
      const t = G.goalT;
      if (t < 0.6) { const dx = (gx - 18) - S.x; S.x += Math.max(-90 * dt, Math.min(90 * dt, dx)); S.face = 1; }
      if (t > 0.6 && t < 1.8) {
        const p = (t - 0.6) / 1.1; G.goalGrow = p < 1 ? 1 - Math.pow(1 - p, 3) : 1;
        if (Math.random() < 0.4) emit(1, gx - 2 + (Math.random() - 0.5) * 20, G.L.goal.y - Math.random() * 30, 0, -30, 0.7, 3, Math.random() < 0.5 ? '#c8ff9a' : '#fff3a0', 0);
        if (!G.planted) { G.planted = 1; ctx.sound('plant'); say(s('planted'), 2); }
      }
      if (t > 1.8 && !G.cheer) { G.cheer = 1; ctx.sound('fanfare'); burst(2, gx, G.L.goal.y - 30, 16, 160, 1.4, 3.4, ['#7ccf4a', '#a5e46e', '#ffd34d', '#ff8fb1'], 120, 2.6); }
      if (t > 2.9 && !G.done) { G.done = 1; irisOut(S.x + 7 - G.cam.x, S.y + 11 - G.cam.y, finishLevel); }
    }
    function updateEnemies(dt, prevY, prevVy) {
      const L = G.L, S = G.s, camL = G.cam.x - 80, camR = G.cam.x + W + 80;
      for (const e of G.enemies) {
        if (!e.alive) { if (e.deadT > 0) e.deadT += dt; continue; }
        if (e.x + e.w < camL - 160 || e.x > camR + 160) continue; // asleep off-screen
        if (e.t === 'b') {
          const dx = S.x + 7 - (e.x + e.w / 2), dy = S.y + 6 - (e.y + e.h / 2);
          if (!e.awake && Math.abs(dx) < 120 && dy > -40 && dy < 220) e.awake = true;
          if (e.awake) {
            e.ph += dt;
            e.vx += Math.sign(dx) * 140 * dt; e.vx = Math.max(-62, Math.min(62, e.vx));
            const ty = Math.min(S.y - 4, e.hy + 150) + Math.sin(e.ph * 3) * 22;
            e.vy = (ty - e.y) * 1.6;
            e.x += e.vx * dt; e.y += e.vy * dt;
            if (e.y < e.hy - 10) e.y = e.hy - 10;
          }
        } else {
          e.vy = Math.min(420, e.vy + 1500 * dt);
          const nx = e.x + e.vx * dt;
          const front = e.vx > 0 ? nx + e.w : nx;
          if (solidAt(L, front, e.y + e.h * 0.5) || front < 0 || front > L.cols * T) e.vx = -e.vx;
          else if (!floorAt(L, front, e.y + e.h + 3) && e.vy === 0) e.vx = -e.vx;
          else e.x = nx;
          const ny = e.y + e.vy * dt;
          if (floorAt(L, e.x + e.w / 2, ny + e.h) && e.vy >= 0 && e.y + e.h <= Math.floor((ny + e.h) / T) * T + 2) { e.y = Math.floor((ny + e.h) / T) * T - e.h; e.vy = 0; }
          else e.y = ny;
          if (e.y > L.rows * T + 40) { e.alive = false; continue; }
        }
        if (G.ghost || G.state !== 'play') continue;
        if (!overlap(S, e.x + 2, e.y + 2, e.w - 4, e.h - 3)) continue;
        if (G.berryT > 0) { killEnemy(e, 'star'); G.shake = Math.max(G.shake, 2); continue; }
        const stompable = e.t !== 'k';
        if (prevVy > 0 && prevY + 22 <= e.y + 7) {
          if (stompable) {
            killEnemy(e, 'stomp'); S.vy = -(inp.j ? G.P.stompHeld : G.P.stompV); S.gr = false; S.cut = true; S.mover = -1;
            G.sqx = 0.8; G.sqy = 1.2; G.shake = Math.max(G.shake, 2.5);
            continue;
          }
          S.vy = -280; hurt(S.x + 7 < e.x + e.w / 2 ? -1 : 1); continue;
        }
        hurt(S.x + 7 < e.x + e.w / 2 ? -1 : 1);
      }
    }
    function closeGate() {
      const L = G.L, c = G.L.gateCol;
      for (let r = 0; r < L.rows; r++) { const i = r * L.cols + c; if (L.grid[i] === K.AIR) { L.grid[i] = K.GATE; G.spr[i] = tileGate(G.th); } }
      G.gateClosed = true; G.shake = 6; ctx.sound('rumble');
      say(s('bossName' + G.def.boss), 2);
    }
    function updateBoss(dt, prevY, prevVy) {
      const B = G.boss; if (!B) return;
      const L = G.L, S = G.s;
      if (B.state === 'idle') { if (L.gateCol >= 0 && S.x > (L.gateCol + 2) * T) { closeGate(); B.state = 'walk'; B.st = 0; } return; }
      if (G.goalShowT != null && G.goalShow < 1) { G.goalShowT += dt; G.goalShow = Math.min(1, G.goalShowT / 0.8); }
      if (B.state === 'gone') return;
      B.st += dt;
      const minX = (L.gateCol + 1) * T, maxX = L.cols * T - B.w, bx = B.x + B.w / 2, px = S.x + 7;
      const rage = 3 - B.hp;
      if (B.state === 'walk') {
        B.face = px < bx ? -1 : 1; B.vx = B.face * (48 + rage * 22);
        if (B.st > 1.9 - rage * 0.35) { B.state = 'tele'; B.st = 0; B.vx = 0; }
      } else if (B.state === 'tele') {
        B.vx = 0; B.squash = Math.min(0.5, B.st);
        if (B.st > 0.5) { B.state = 'jump'; B.st = 0; B.vy = -540 - rage * 40; B.vx = B.face * (100 + rage * 30); B.squash = -0.3; ctx.sound('whoosh'); }
      } else if (B.state === 'hurt') { B.vx *= Math.exp(-dt * 4); if (B.st > 1.1) { B.state = 'walk'; B.st = 0; } }
      else if (B.state === 'dying') {
        B.vx = 0; if (Math.random() < 0.6) emit(Math.random() < 0.5 ? 2 : 0, B.x + Math.random() * B.w, B.y + Math.random() * B.h, (Math.random() - 0.5) * 140, -60 - Math.random() * 120, 1, 3.5, ['#7ccf4a', '#ffd34d', '#ff8fb1', '#c9c4dc'][(Math.random() * 4) | 0], 200);
        if (B.st > 1.3) {
          B.state = 'gone'; ctx.sound('fanfare'); G.shake = 6;
          burst(2, bx, B.y + B.h / 2, 26, 220, 1.6, 4, ['#7ccf4a', '#a5e46e', '#ffd34d', '#ff8fb1', '#ffffff'], 160);
          say(s('bossDown'), 3);
          G.goalShowT = 0;
        }
      }
      // physics
      B.vy += 1500 * dt;
      B.x += B.vx * dt; if (B.x < minX) { B.x = minX; B.vx = Math.abs(B.vx) * 0.3; } if (B.x > maxX) { B.x = maxX; B.vx = -Math.abs(B.vx) * 0.3; }
      B.y += B.vy * dt;
      if (B.y + B.h >= B.floor) {
        const landed = B.vy > 300;
        B.y = B.floor - B.h; B.vy = 0;
        if (landed && B.state === 'jump') {
          B.state = 'walk'; B.st = 0; B.squash = 0.55; G.shake = Math.max(G.shake, 7); ctx.sound('rumble');
          for (let i = 0; i < 14; i++) emit(0, bx + (Math.random() - 0.5) * 50, B.floor - 2, (Math.random() - 0.5) * 240, -30 - Math.random() * 60, 0.6, 4 + Math.random() * 3, '#d9ccb4', 100);
          if (G.def.boss === 2) for (let i = 0; i < 3; i++) { const rx = Math.max(minX + 10, Math.min(L.cols * T - 20, px + (i - 1) * 70 + (Math.random() - 0.5) * 30)); G.rocks.push({ x: rx, y: G.cam.y + 20, warn: 0.7 + i * 0.12, vy: 0 }); }
          if (G.def.boss === 3) for (let i = 0; i < 3; i++) { const dx = px - bx; G.bshots.push({ x: bx, y: B.y + 8, vx: Math.max(-260, Math.min(260, dx * 0.9)) + (i - 1) * 60, vy: -380 - i * 30, t: 0 }); }
          if (G.def.boss === 1 && rage > 0) for (const dir of [-1, 1]) G.bshots.push({ x: bx + dir * 30, y: B.floor - 8, vx: dir * 170, vy: -10, t: 0, wave: 1 });
        }
      }
      B.squash += (0 - B.squash) * (1 - Math.exp(-dt * 8));
      // contact
      if (G.state !== 'play' || G.ghost || (B.state !== 'walk' && B.state !== 'tele' && B.state !== 'jump')) return;
      if (!overlap(S, B.x + 4, B.y + 6, B.w - 8, B.h - 6)) return;
      if (prevVy > 0 && prevY + 22 <= B.y + 16) {
        B.hp--; B.st = 0; B.state = B.hp > 0 ? 'hurt' : 'dying'; B.vx = (bx < px ? -1 : 1) * 120;
        S.vy = -560; S.gr = false; S.cut = false; S.mover = -1; G.sqx = 0.75; G.sqy = 1.3;
        G.shake = 8; ctx.sound('crash'); ctx.sound('bounce'); say(s('bossHit'), 1);
        burst(1, px, B.y + 4, 12, 140, 0.6, 3.5, ['#ffffff', '#fff3a0'], 0);
        return;
      }
      hurt(px < bx ? -1 : 1);
    }
    function updateShots(dt) {
      const L = G.L, S = G.s;
      for (let i = G.shots.length - 1; i >= 0; i--) {
        const p = G.shots[i]; p.t += dt; p.vy += 1100 * dt;
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        let dead = p.t > 1.6;
        if (solidAt(L, nx, p.y)) dead = true;
        else if (p.vy > 0 && floorAt(L, nx, ny + 3)) { p.vy = -250; p.b++; if (p.b > 3) dead = true; p.x = nx; }
        else { p.x = nx; p.y = ny; }
        if (!dead) for (const e of G.enemies) if (e.alive && p.x > e.x - 3 && p.x < e.x + e.w + 3 && p.y > e.y - 3 && p.y < e.y + e.h + 3) { killEnemy(e, 'shot'); dead = true; break; }
        if (!dead && G.boss && G.boss.state !== 'gone' && G.boss.state !== 'idle' && p.x > G.boss.x && p.x < G.boss.x + G.boss.w && p.y > G.boss.y && p.y < G.boss.y + G.boss.h) { dead = true; ctx.sound('tap'); burst(1, p.x, p.y, 4, 60, 0.3, 2.5, ['#ffffff'], 0); }
        if (dead) { burst(3, p.x, p.y, 4, 70, 0.4, 2.2, ['#9a6a3c', '#6b4523'], 400); G.shots.splice(i, 1); }
      }
      for (let i = G.bshots.length - 1; i >= 0; i--) {
        const p = G.bshots[i]; p.t += dt;
        if (p.wave) { p.x += p.vx * dt; if (p.t > 1.4 || solidAt(L, p.x, p.y)) { G.bshots.splice(i, 1); continue; } if (Math.random() < 0.5) emit(0, p.x, p.y + 6, 0, -30, 0.3, 3, '#d9ccb4', 0); }
        else { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (floorAt(L, p.x, p.y + 4) || p.t > 3) { burst(3, p.x, p.y, 6, 110, 0.5, 2.5, ['#d4483b', '#e8e8e8', '#9aa7b4'], 500, 2.5); ctx.sound('crack'); G.bshots.splice(i, 1); continue; } }
        if (!G.ghost && G.state === 'play' && overlap(S, p.x - 5, p.y - 5, 10, 10)) { hurt(S.x + 7 < p.x ? -1 : 1); if (!p.wave) G.bshots.splice(i, 1); }
      }
      for (let i = G.rocks.length - 1; i >= 0; i--) {
        const r = G.rocks[i];
        if (r.warn > 0) { r.warn -= dt; continue; }
        r.vy = Math.min(560, r.vy + 1400 * dt); r.y += r.vy * dt;
        if (r.y + 8 >= G.boss.floor) { burst(3, r.x, r.y, 8, 120, 0.6, 3, ['#6f7582', '#8e939f', '#454a55'], 500, 2.5); ctx.sound('brick'); G.rocks.splice(i, 1); continue; }
        if (!G.ghost && G.state === 'play' && overlap(S, r.x - 8, r.y - 8, 16, 16)) { hurt(S.x + 7 < r.x ? -1 : 1); G.rocks.splice(i, 1); }
      }
    }
    function updateCam(dt) {
      const S = G.s, L = G.L, levelH = L.rows * T;
      const tx = S.x + 7 + S.face * 34 + S.vx * 0.2 - W * 0.45;
      G.cam.x += (tx - G.cam.x) * (1 - Math.exp(-dt * 5.5));
      const minX = G.gateClosed ? L.gateCol * T : 0;
      G.cam.x = Math.max(minX, Math.min(L.cols * T - W, G.cam.x));
      if (H >= levelH) G.cam.y = levelH - H;
      else { const ty = S.y - H * 0.55; G.cam.y += (ty - G.cam.y) * (1 - Math.exp(-dt * 4)); G.cam.y = Math.max(0, Math.min(levelH - H, G.cam.y)); }
      if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
    }
    function updateParts(dt) {
      for (const p of parts) {
        if (!p.a) continue;
        p.life -= dt; if (p.life <= 0) { p.a = false; continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.type === 0) { p.vx *= 0.97; }
      }
    }

    /* ---------- transitions ---------- */
    function irisOut(fx, fy, cb) { trans = { dir: -1, t: 0, dur: 0.45, fx, fy, cb }; }
    function irisIn(fx, fy) { trans = { dir: 1, t: 0, dur: 0.5, fx, fy, cb: null }; }
    function updateTrans(dt) {
      if (!trans) return;
      trans.t += dt;
      if (trans.t >= trans.dur) { const cb = trans.cb; trans = null; if (cb) cb(); }
    }
    function drawTrans() {
      if (!trans) return;
      const p = Math.min(1, trans.t / trans.dur), e = p * p * (3 - 2 * p);
      const maxR = Math.hypot(W, H);
      const r = trans.dir > 0 ? e * maxR : (1 - e) * maxR;
      g.save(); g.fillStyle = '#10241a'; g.beginPath(); g.rect(0, 0, W, H); g.arc(trans.fx, trans.fy, Math.max(0.1, r), 0, Math.PI * 2, true); g.fill('evenodd'); g.restore();
    }

    /* ---------- rendering: level ---------- */
    function drawLayers(th, camX, camY) {
      const key = th.id + H;
      if (!bg || bgKey !== key) { bg = buildBG(th, H); bgKey = key; }
      g.drawImage(bg.sky, 0, 0, W, H);
      if (bg.stars) { for (const st of bg.stars) { const a = 0.5 + Math.sin(clock * 2 + st.p) * 0.4; g.globalAlpha = a; g.fillStyle = '#fff'; const x = ((st.x - camX * 0.02) % SW + SW) % SW; if (x < W) g.fillRect(x, st.y, st.s, st.s); } g.globalAlpha = 1; }
      if (th.id === 'forest') { const sx = W * 0.78 - camX * 0.01, sy = H * 0.16; g.drawImage(glowSprite('255,244,190', 70), sx - 70, sy - 70, 140, 140); g.fillStyle = '#fff7cf'; g.beginPath(); g.arc(sx, sy, 18, 0, 7); g.fill(); }
      if (th.id === 'night') { const mx = W * 0.8 - camX * 0.01, my = H * 0.14; g.drawImage(glowSprite('200,210,255', 60), mx - 60, my - 60, 120, 120); g.fillStyle = '#f4f1dc'; g.beginPath(); g.arc(mx, my, 15, 0, 7); g.fill(); g.fillStyle = 'rgba(180,170,140,.35)'; g.beginPath(); g.arc(mx - 4, my - 3, 3.5, 0, 7); g.arc(mx + 5, my + 4, 2.5, 0, 7); g.fill(); }
      if (th.id === 'forest' || th.id === 'mountain') {
        for (let i = 0; i < 4; i++) {
          const cw = 120 * (0.7 + (i % 2) * 0.4), span = W + 260;
          const x = (((i * 211 - camX * (0.08 + i * 0.02) - clock * (6 + i * 2)) % span) + span) % span - 130;
          g.globalAlpha = th.id === 'mountain' ? 0.75 : 0.9; g.drawImage(cloudSprite(i), x, H * (0.06 + i * 0.07), cw, cw * 50 / 120); g.globalAlpha = 1;
        }
      }
      for (const Ly of bg.layers) {
        const y = Ly.top - (camY + (G ? 0 : 0)) * Ly.f * 0.25;
        let x = -((camX * Ly.f) % SW); if (x > 0) x -= SW;
        for (; x < W; x += SW) g.drawImage(Ly.cv, x, y, SW, Ly.h);
      }
      if (th.mist) {
        for (let i = 0; i < 2; i++) {
          const y = H * (0.55 + i * 0.16) + Math.sin(clock * 0.3 + i * 2) * 10;
          const gr = g.createLinearGradient(0, y - 30, 0, y + 30); gr.addColorStop(0, 'rgba(240,245,250,0)'); gr.addColorStop(0.5, 'rgba(240,245,250,.28)'); gr.addColorStop(1, 'rgba(240,245,250,0)');
          g.fillStyle = gr; g.fillRect(0, y - 30, W, 60);
        }
      }
    }
    function renderLevel() {
      const L = G.L, th = G.th, S = G.s;
      let cx = G.cam.x, cy = G.cam.y;
      if (G.shake > 0) { cx += (Math.random() - 0.5) * G.shake; cy += (Math.random() - 0.5) * G.shake; }
      cx = Math.round(cx * DPR) / DPR; cy = Math.round(cy * DPR) / DPR;
      drawLayers(th, G.cam.x, G.cam.y);
      g.save(); g.translate(-cx, -cy);
      const c0 = Math.max(0, Math.floor(cx / T) - 1), c1 = Math.min(L.cols - 1, Math.floor((cx + W) / T) + 1);
      const r0 = Math.max(0, Math.floor(cy / T) - 1), r1 = Math.min(L.rows - 1, Math.floor((cy + H) / T) + 1);
      const xl = cx - 100, xr = cx + W + 100;
      for (const t of G.trees) if (t.x > xl && t.x < xr) g.drawImage(t.spr, t.x - 45, t.y - 138, 90, 140);
      // tiles
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * L.cols + c, k = L.grid[i];
        if (!k || k === K.WATER || k === K.COVER) continue;
        const x = c * T, y = r * T;
        if (k >= K.BOX && k <= K.BOX_USED || k === K.BOX_HEART) {
          const bt = G.bumps.get(i), off = bt != null ? -Math.sin(Math.min(1, bt / 0.22) * Math.PI) * 6 : 0;
          const spr = tileBox(k === K.BOX ? 0 : k === K.BOX_USED ? 2 : 1);
          g.drawImage(spr, x - OX, y - OY + off, SPR_W, SPR_H);
          if (k !== K.BOX_USED) { g.globalAlpha = 0.18 + Math.sin(clock * 4 + c) * 0.12; g.drawImage(glowSprite('255,230,140', 16), x - 4, y - 4 + off, 32, 32); g.globalAlpha = 1; }
          continue;
        }
        if (k === K.SPRING) { const st = G.springs.get(i); drawSpring(g, x, y, st != null ? Math.sin(Math.min(1, st / 0.35) * Math.PI) * (1 - st / 0.35) * 1.6 : 0, th); continue; }
        if (k === K.CRUMBLE) {
          let ct = -1; for (const e of S.cr) if (e[0] === i) ct = e[1];
          if (ct >= Core.CR_FALL) { if (ct < Core.CR_FALL + 0.02) burst(3, x + 12, y + 6, 6, 60, 0.6, 3, ['#9a6a42', '#5b3a20'], 600); continue; }
          const sh = ct >= 0 ? Math.sin(clock * 60) * 1.4 * (ct / Core.CR_FALL) : 0;
          g.drawImage(G.spr[i], x - OX + sh, y - OY, SPR_W, SPR_H); continue;
        }
        const spr = G.spr[i]; if (spr) g.drawImage(spr, x - OX, y - OY, SPR_W, SPR_H);
      }
      if (G.def.cave) { // shade the solid rock above the cave ceiling
        const yb = (ROWS - SEG_H - 1) * T + 18;
        const cg = g.createLinearGradient(0, yb - 120, 0, yb); cg.addColorStop(0, 'rgba(8,10,18,.88)'); cg.addColorStop(1, 'rgba(8,10,18,0)');
        g.fillStyle = cg; g.fillRect(cx, Math.min(yb - 120, cy), W, yb - Math.min(yb - 120, cy));
      }
      // movers
      const MP = { x: 0, y: 0 };
      for (const m of L.movers) {
        Core.moverPos(m, S.t, MP);
        if (MP.x > xr || MP.x + m.w < xl) continue;
        g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, MP.x + 2, MP.y + 8, m.w - 4, 5, 3); g.fill();
        rr(g, MP.x, MP.y, m.w, 10, 4); g.fillStyle = th.id === 'night' ? '#6b7a8f' : th.id === 'cave' ? '#7a6a8f' : '#b98a5a'; g.fill();
        g.strokeStyle = th.id === 'night' ? '#3a4558' : '#6b4a2a'; g.lineWidth = 1.4; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(MP.x + 3, MP.y + 1.5, m.w - 6, 1.6);
        g.fillStyle = th.id === 'night' ? '#ffd970' : '#7ccf4a'; for (let k = 1; k < m.w / T; k++) { g.beginPath(); g.arc(MP.x + k * T, MP.y + 5, 1.6, 0, 7); g.fill(); }
      }
      for (const dd of G.deco) if (dd.x > xl && dd.x < xr) g.drawImage(dd.spr, dd.x - 20, dd.y - 56, 40, 60);
      // goal, lanterns, animal
      if (G.goalShow > 0) drawGoal(g, L.goal.x, L.goal.y, clock, G.goalGrow, G.goalShow);
      for (const c of G.cps) if (c.x > xl && c.x < xr) drawLantern(g, c.x, c.y, c.lit, clock);
      if (G.animal) {
        const A = G.animal;
        if (!A.rescued) { drawAnimal(g, G.def.animal, A.x, A.y - 2, clock, false); drawCage(g, A.x, A.y, false, clock); }
        else if (A.rt < 2.4) { g.globalAlpha = Math.max(0, 1 - Math.max(0, A.rt - 1.6) / 0.8); drawAnimal(g, G.def.animal, A.x + A.rt * 26, A.y, clock, true); g.globalAlpha = 1; if (Math.random() < 0.08) emit(5, A.x + A.rt * 26, A.y - 18, 0, -30, 0.9, 4, '#ff7a9a', -10); }
      }
      // seeds + items
      const sp = seedSprite();
      for (const p of G.seeds) { if (p.got || p.x < xl || p.x > xr) continue; g.drawImage(sp, p.x - 15, p.y - 15 + Math.sin(clock * 3.2 + p.c * 0.7) * 2, 30, 30); }
      for (const it of G.items) {
        if (it.kind === 'seedfx') { it.fx -= 1 / 60; if (it.fx > 0) { g.globalAlpha = Math.min(1, it.fx * 2.5); g.drawImage(sp, it.x - 15, it.y - 15 - (0.5 - it.fx) * 60, 30, 30); g.globalAlpha = 1; } continue; }
        if (!it.got) drawPickup(g, it.kind, it.x, it.y, clock);
      }
      // enemies
      for (const e of G.enemies) {
        if (e.x > xr || e.x + e.w < xl) continue;
        if (!e.alive) { if (e.t === 's' && e.deadT > 0 && e.deadT < 0.25) drawSmog(g, Object.assign({}, e, { dead: true }), clock); continue; }
        if (e.t === 's') drawSmog(g, e, clock); else if (e.t === 'k') drawCrawler(g, e, clock); else drawBat(g, e, clock);
      }
      if (G.boss && G.boss.state !== 'gone') { g.save(); if (G.boss.state === 'dying') { g.globalAlpha = Math.max(0, 1 - G.boss.st / 1.3); } drawBoss(g, G.boss, clock, G.def.boss); g.restore(); }
      for (const r of G.rocks) {
        if (r.warn > 0) { g.fillStyle = `rgba(0,0,0,${0.15 + (Math.sin(clock * 20) + 1) * 0.08})`; g.beginPath(); g.ellipse(r.x, G.boss.floor - 2, 12, 3.5, 0, 0, 7); g.fill(); continue; }
        g.fillStyle = '#6f7582'; g.beginPath(); g.moveTo(r.x - 8, r.y); g.lineTo(r.x - 4, r.y - 8); g.lineTo(r.x + 6, r.y - 7); g.lineTo(r.x + 9, r.y + 2); g.lineTo(r.x + 2, r.y + 8); g.lineTo(r.x - 6, r.y + 6); g.closePath(); g.fill();
        g.strokeStyle = '#3d424c'; g.lineWidth = 1.2; g.stroke();
      }
      for (const p of G.bshots) {
        if (p.wave) { g.fillStyle = 'rgba(217,204,180,.85)'; g.beginPath(); g.ellipse(p.x, p.y + 2, 9, 6, 0, Math.PI, 0); g.fill(); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.t * 10); g.fillStyle = '#d4483b'; rr(g, -4, -5.5, 8, 11, 2); g.fill(); g.fillStyle = '#e8e8e8'; g.fillRect(-4, -2, 8, 2.4); g.restore();
      }
      for (const p of G.shots) { g.save(); g.translate(p.x, p.y); g.rotate(p.t * 14); g.fillStyle = '#b07a3e'; g.beginPath(); g.ellipse(0, 1, 3.2, 3.8, 0, 0, 7); g.fill(); g.fillStyle = '#6b4523'; g.beginPath(); g.ellipse(0, -1.6, 3.6, 2, 0, Math.PI, 0); g.fill(); g.restore(); }
      // player
      const show = !(G.inv > 0 && Math.floor(clock * 16) % 2 === 0 && G.state === 'play');
      if (show || G.state !== 'play') {
        let pose = 'idle';
        if (G.state === 'goal') pose = G.goalT < 0.6 ? 'run' : G.goalT < 1.8 ? 'plant' : 'cheer';
        else if (G.state === 'dying') pose = 'hurt';
        else if (S.hurt > 0) pose = 'hurt';
        else if (S.water) pose = 'swim';
        else if (S.wall) pose = 'wall';
        else if (S.glide) pose = 'glide';
        else if (!S.gr) pose = S.vy < -30 ? 'jump' : 'fall';
        else if (Math.abs(S.vx) > 12) pose = 'run';
        g.save(); g.translate(S.x + 7, S.y + 22); g.scale(S.face * G.sqx, G.sqy);
        if (!show) g.globalAlpha = 0.35;
        drawFini(g, { pose, t: clock, ph: G.state === 'goal' ? clock * 12 : G.runPh, vx: S.vx, star: G.berryT > 0, leaf: G.power === 'leaf', acorn: G.power === 'acorn', blink: G.blink > 0 });
        g.restore();
      }
      // water (in front)
      const wc = th.water;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (L.grid[r * L.cols + c] !== K.WATER) continue;
        const x = c * T, y = r * T, top = Core.cell(L, c, r - 1) !== K.WATER;
        let depth = 0; while (depth < 4 && Core.cell(L, c, r - depth - 1) === K.WATER) depth++;
        g.fillStyle = rgba(wc, 0.42 + depth * 0.07);
        if (top) {
          g.beginPath(); g.moveTo(x, y + 24);
          for (let k = 0; k <= 4; k++) { const xx = x + k * 6; g.lineTo(xx, y + 3 + Math.sin(xx * 0.18 + clock * 3) * 1.6); }
          g.lineTo(x + 24, y + 24); g.closePath(); g.fill();
          g.strokeStyle = th.waterTop; g.lineWidth = 1.6; g.globalAlpha = 0.85; g.beginPath();
          for (let k = 0; k <= 4; k++) { const xx = x + k * 6; g.lineTo(xx, y + 3 + Math.sin(xx * 0.18 + clock * 3) * 1.6); }
          g.stroke(); g.globalAlpha = 1;
        } else g.fillRect(x, y, 24, 24);
      }
      // secret covers (in front of everything)
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * L.cols + c; if (L.grid[i] !== K.COVER) continue;
        const near = Math.abs(c * T + 12 - (S.x + 7)) < 5 * T && Math.abs(r * T + 12 - (S.y + 11)) < 5 * T;
        g.globalAlpha = near ? G.coverA : 1; g.drawImage(G.spr[i], c * T - OX, r * T - OY, SPR_W, SPR_H);
      }
      g.globalAlpha = 1;
      drawParts();
      g.restore();
      // atmosphere
      if (th.dark) {
        const px = S.x + 7 - cx, py = S.y + 8 - cy;
        const rg = g.createRadialGradient(px, py, 50, px, py, Math.max(W, H) * 0.75);
        rg.addColorStop(0, 'rgba(6,8,16,0)'); rg.addColorStop(1, 'rgba(6,8,16,.72)');
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
      }
      if (th.id === 'night') {
        g.globalCompositeOperation = 'lighter';
        const fs = glowSprite('200,255,120', 10);
        for (let i = 0; i < 16; i++) {
          const fx = ((hash(i, 3) * 900 - cx * 0.9 + Math.sin(clock * 0.7 + i) * 30) % (W + 40) + W + 40) % (W + 40) - 20;
          const fy = H * 0.25 + hash(i, 7) * H * 0.6 + Math.sin(clock * 1.3 + i * 2) * 14;
          const a = 0.4 + Math.sin(clock * 3 + i * 1.7) * 0.4;
          if (a > 0.05) { g.globalAlpha = a; g.drawImage(fs, fx - 10, fy - 10, 20, 20); }
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      if (th.id === 'forest') {
        for (let i = 0; i < 7; i++) {
          const fx = ((hash(i, 5) * 1000 - cx * 0.7 + clock * 14 + Math.sin(clock + i) * 20) % (W + 40) + W + 40) % (W + 40) - 20;
          const fy = ((hash(i, 8) * H + clock * (18 + i * 3)) % (H + 20)) - 10;
          g.save(); g.translate(fx, fy); g.rotate(clock * 2 + i); g.fillStyle = i % 2 ? '#e8a23a' : '#8bcf4f'; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(0, 0, 3.4, 1.6, 0, 0, 7); g.fill(); g.restore();
        }
        g.globalAlpha = 1;
      }
      drawHUD();
    }
    function drawParts() {
      for (const p of parts) {
        if (!p.a) continue;
        const a = Math.min(1, p.life / p.max * 1.6);
        g.globalAlpha = a; g.fillStyle = p.col;
        if (p.type === 0) { g.beginPath(); g.arc(p.x, p.y, p.size * (1.3 - p.life / p.max * 0.5), 0, 7); g.fill(); }
        else if (p.type === 1) { star(g, p.x, p.y, p.size, p.size * 0.35, 4, p.rot); g.fill(); }
        else if (p.type === 2) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); g.ellipse(0, 0, p.size * 1.3, p.size * 0.6, 0, 0, 7); g.fill(); g.restore(); }
        else if (p.type === 3) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); g.restore(); }
        else if (p.type === 5) { heartPath(g, p.x, p.y - p.size / 2, p.size); g.fill(); }
      }
      g.globalAlpha = 1;
    }
    function pill(x, y, w, h, a) { rr(g, x, y, w, h, h / 2); g.fillStyle = `rgba(14,22,38,${a || 0.42})`; g.fill(); }
    function drawHUD() {
      const S = G.s;
      pill(8, 8, 158, 30);
      for (let i = 0; i < 3; i++) {
        heartPath(g, 22 + i * 19, 15, 15);
        if (i < G.hearts) { g.fillStyle = '#ff4d6d'; g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(19 + i * 19, 19.5, 1.5, 2.2, -0.5, 0, 7); g.fill(); }
        else { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.4; g.stroke(); }
      }
      g.drawImage(seedSprite(), 72, 8, 30, 30);
      g.font = '800 14px system-ui, -apple-system, Segoe UI, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = '#fff'; g.fillText(`${G.seedsGot}/${G.seedsTotal}`, 99, 24);
      // animal paw
      const ax = 150, ay = 23, got = G.animal && G.animal.rescued;
      g.fillStyle = got ? '#ffd34d' : 'rgba(255,255,255,.35)';
      g.beginPath(); g.ellipse(ax, ay + 2.5, 4.4, 3.6, 0, 0, 7); g.fill();
      for (const [dx, dy] of [[-4.8, -2.5], [-1.6, -5.2], [1.8, -5.2], [4.9, -2.4]]) { g.beginPath(); g.arc(ax + dx, ay + dy, 1.7, 0, 7); g.fill(); }
      // time bar
      const f = Math.max(0, Math.min(1, G.time / G.def.time));
      rr(g, 12, 41, 150, 5, 2.5); g.fillStyle = 'rgba(14,22,38,.35)'; g.fill();
      rr(g, 12, 41, Math.max(5, 150 * f), 5, 2.5); g.fillStyle = f > 0.5 ? '#7ddc5a' : f > 0.22 ? '#ffc93d' : (Math.floor(clock * 4) % 2 ? '#ff5d5d' : '#ff9b9b'); g.fill();
      // power slot
      if (G.power || G.berryT > 0) {
        pill(172, 8, 30, 30);
        if (G.berryT > 0) { g.fillStyle = '#ffcf3d'; star(g, 187, 23, 8, 3.6, 5, -Math.PI / 2 + clock * 3); g.fill(); }
        else if (G.power === 'leaf') { g.fillStyle = '#5fbf46'; g.beginPath(); g.moveTo(187, 14); g.bezierCurveTo(194, 18, 193, 27, 187, 32); g.bezierCurveTo(181, 27, 180, 18, 187, 14); g.fill(); }
        else { g.fillStyle = '#b07a3e'; g.beginPath(); g.ellipse(187, 25, 5, 6, 0, 0, 7); g.fill(); g.fillStyle = '#6b4523'; g.beginPath(); g.ellipse(187, 20, 5.6, 3, 0, Math.PI, 0); g.fill(); }
      }
      // pause
      g.beginPath(); g.arc(W - 26, 24, 17, 0, 7); g.fillStyle = 'rgba(14,22,38,.42)'; g.fill();
      g.fillStyle = '#fff'; rr(g, W - 32, 16, 4.4, 16, 2); g.fill(); rr(g, W - 24.4, 16, 4.4, 16, 2); g.fill();
      // boss bar
      const B = G.boss;
      if (B && B.state !== 'idle' && B.state !== 'gone') {
        const bw = 120, bx = W / 2 - bw / 2;
        pill(bx - 10, 50, bw + 20, 24, 0.5);
        g.font = '700 11px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(s('bossName' + G.def.boss), W / 2, 58);
        for (let i = 0; i < 3; i++) { rr(g, bx + i * 41, 65, 38, 5, 2.5); g.fillStyle = i < B.hp ? '#ff6b6b' : 'rgba(255,255,255,.25)'; g.fill(); }
      }
      // message
      if (G.msg) {
        const m = G.msg, a = Math.min(1, m.t * 5, (m.dur - m.t) * 3);
        g.globalAlpha = Math.max(0, a);
        g.font = '700 13px system-ui, sans-serif'; g.textAlign = 'center';
        const tw = Math.min(W - 30, g.measureText(m.text).width + 28);
        pill(W / 2 - tw / 2, 84 - (1 - a) * 8, tw, 28, 0.55);
        g.fillStyle = '#fff'; g.fillText(m.text, W / 2, 98 - (1 - a) * 8, W - 44);
        g.globalAlpha = 1;
      }
      if (banner) {
        const b = banner, a = Math.min(1, b.t * 3, (2.6 - b.t) * 2.5);
        g.globalAlpha = Math.max(0, a);
        const y = H * 0.32 - (1 - Math.min(1, b.t * 3)) * 20;
        g.textAlign = 'center';
        g.font = '900 24px system-ui, sans-serif'; g.lineWidth = 5; g.strokeStyle = 'rgba(14,22,38,.55)'; g.strokeText(b.text, W / 2, y, W - 30); g.fillStyle = '#fff'; g.fillText(b.text, W / 2, y, W - 30);
        if (b.sub) { g.font = '700 13px system-ui, sans-serif'; g.lineWidth = 4; g.strokeText(b.sub, W / 2, y + 24, W - 30); g.fillStyle = '#ffe9a8'; g.fillText(b.sub, W / 2, y + 24, W - 30); }
        g.globalAlpha = 1;
      }
      // touch controls
      if (touchUI) {
        layoutCtl();
        const tc = ctl;
        const btn = (x, y, r, on) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = on ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.2)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.stroke(); };
        btn(dirBtn.lx, dirBtn.y, dirBtn.r, tc.l); btn(dirBtn.rx, dirBtn.y, dirBtn.r, tc.r); btn(jmpBtn.x, jmpBtn.y, jmpBtn.r, tc.j);
        g.fillStyle = 'rgba(20,30,45,.7)';
        g.beginPath(); g.moveTo(dirBtn.lx - 9, dirBtn.y); g.lineTo(dirBtn.lx + 6, dirBtn.y - 10); g.lineTo(dirBtn.lx + 6, dirBtn.y + 10); g.fill();
        g.beginPath(); g.moveTo(dirBtn.rx + 9, dirBtn.y); g.lineTo(dirBtn.rx - 6, dirBtn.y - 10); g.lineTo(dirBtn.rx - 6, dirBtn.y + 10); g.fill();
        g.beginPath(); g.moveTo(jmpBtn.x, jmpBtn.y - 14); g.lineTo(jmpBtn.x + 13, jmpBtn.y + 4); g.lineTo(jmpBtn.x + 5, jmpBtn.y + 4); g.lineTo(jmpBtn.x + 5, jmpBtn.y + 13); g.lineTo(jmpBtn.x - 5, jmpBtn.y + 13); g.lineTo(jmpBtn.x - 5, jmpBtn.y + 4); g.lineTo(jmpBtn.x - 13, jmpBtn.y + 4); g.closePath(); g.fill();
        if (G.power === 'acorn') {
          btn(thrBtn.x, thrBtn.y, thrBtn.r, G.thrCd > 0.15);
          g.fillStyle = '#b07a3e'; g.beginPath(); g.ellipse(thrBtn.x, thrBtn.y + 2, 6, 7, 0, 0, 7); g.fill(); g.fillStyle = '#6b4523'; g.beginPath(); g.ellipse(thrBtn.x, thrBtn.y - 3, 7, 3.6, 0, Math.PI, 0); g.fill();
        }
      }
    }

    /* ---------- world map ---------- */
    let mapHop = null;
    const mapTop = () => 54, mapBot = () => H - 118;
    function nodeXY(i) { const n = MAPN[i]; return [16 + n[0] * (W - 32), mapTop() + n[1] * (mapBot() - mapTop())]; }
    function selectNode(i, auto) {
      if (i < 0 || i >= LEVELS.length || !unlocked(i) || i === d.sel) return;
      const from = nodeXY(d.sel);
      mapHop = { from, t: 0 };
      d.sel = i; ctx.save(); ctx.sound(auto ? 'whoosh' : 'tap');
    }
    function playSelected() { if (!unlocked(d.sel) || trans) return; ctx.sound('click'); const [x, y] = nodeXY(d.sel); irisOut(x, y, () => startLevel(d.sel)); }
    const playBtn = { x: 0, y: 0, w: 0, h: 0 };
    function mapTap(x, y) {
      if (trans) return;
      if (Math.hypot(x - (W - 26), y - 26) < 20) { ctx.sound('click'); Kit.rules(s('rulesT'), s('rulesHtml')); return; }
      if (x > playBtn.x && x < playBtn.x + playBtn.w && y > playBtn.y && y < playBtn.y + playBtn.h) { playSelected(); return; }
      for (let i = 0; i < LEVELS.length; i++) { const [nx, ny] = nodeXY(i); if (Math.hypot(x - nx, y - ny) < 24) { if (unlocked(i)) { if (i === d.sel) playSelected(); else selectNode(i); } else ctx.sound('bad'); return; } }
    }
    function mapBG() {
      return sprite(`map|${W}|${H}|${window.LANG || 'de'}`, W, H, m => {
        const top = mapTop(), bot = mapBot(), span = bot - top;
        const y3 = top + span * 0.29, y2 = top + span * 0.69;
        const gr = m.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#0d1638'); gr.addColorStop(y3 / H, '#3b3f7d'); gr.addColorStop((y3 + 30) / H, '#8fa9c8'); gr.addColorStop(y2 / H, '#cfdbe7'); gr.addColorStop((y2 + 24) / H, '#a5dc86'); gr.addColorStop(1, '#5fb85a');
        m.fillStyle = gr; m.fillRect(0, 0, W, H);
        const r = rng(3);
        for (let i = 0; i < 50; i++) { m.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; m.fillRect(r() * W, r() * y3 * 0.9, 1 + r() * 1.2, 1 + r() * 1.2); }
        m.fillStyle = '#f4f1dc'; m.beginPath(); m.arc(W * 0.86, top + 18, 11, 0, 7); m.fill();
        // city skyline
        let x = 0; m.fillStyle = '#1b2350';
        while (x < W) { const w = 12 + r() * 20, hgt = 14 + r() * 40; m.fillRect(x, y3 - hgt, w, hgt + 30); for (let wy = y3 - hgt + 5; wy < y3; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (r() < 0.3) { m.fillStyle = 'rgba(255,214,120,.8)'; m.fillRect(wx, wy, 2, 3); m.fillStyle = '#1b2350'; } x += w + 2; }
        // mountains
        for (let layer = 0; layer < 2; layer++) {
          m.fillStyle = layer ? '#7f95ad' : '#a9bbd0';
          m.beginPath(); m.moveTo(0, y2 + 10);
          for (let xx = 0; xx <= W; xx += 6) m.lineTo(xx, y2 - 40 + layer * 22 - Math.abs(Math.sin(xx * (0.018 + layer * 0.01) + layer)) * (54 - layer * 18));
          m.lineTo(W, y2 + 10); m.fill();
        }
        m.fillStyle = 'rgba(255,255,255,.55)'; m.fillRect(0, y2 - 6, W, 14);
        for (let i = 0; i < 18; i++) { const px = r() * W, py = y2 - 4 + r() * 10, s2 = 6 + r() * 8; m.fillStyle = '#3d5a5c'; m.beginPath(); m.moveTo(px - s2 * 0.4, py); m.lineTo(px, py - s2 * 1.6); m.lineTo(px + s2 * 0.4, py); m.fill(); }
        // meadow + trees + brook
        m.strokeStyle = 'rgba(120,200,255,.8)'; m.lineWidth = 5; m.beginPath(); m.moveTo(-10, H - 60); m.bezierCurveTo(W * 0.3, H - 100, W * 0.6, H - 40, W + 10, H - 90); m.stroke();
        for (let i = 0; i < 16; i++) {
          const px = r() * W, py = y2 + 30 + r() * (bot - y2 - 10), s2 = 7 + r() * 7;
          m.fillStyle = '#3f8f4a'; m.beginPath(); m.arc(px, py, s2, 0, 7); m.fill(); m.fillStyle = '#5fb85a'; m.beginPath(); m.arc(px - s2 * 0.3, py - s2 * 0.3, s2 * 0.6, 0, 7); m.fill();
        }
        // fade at bottom for panel
        const fg = m.createLinearGradient(0, bot - 10, 0, H); fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(1, 'rgba(255,255,255,.25)'); m.fillStyle = fg; m.fillRect(0, bot - 10, W, H);
        // world labels
        m.font = '800 10px system-ui, sans-serif'; m.textAlign = 'left';
        const lab = (txt, y, col) => { m.fillStyle = col; m.fillText(txt.toUpperCase(), 12, y); };
        lab(`${s('world')} 3 · ${Lx(WORLDS[2].name)}`, top + 8, 'rgba(255,255,255,.75)');
        lab(`${s('world')} 2 · ${Lx(WORLDS[1].name)}`, y3 + 44, 'rgba(30,45,70,.7)');
        lab(`${s('world')} 1 · ${Lx(WORLDS[0].name)}`, y2 + 38, 'rgba(20,60,25,.7)');
      });
    }
    function renderMap() {
      g.drawImage(mapBG(), 0, 0, W, H);
      // path
      g.lineWidth = 5; g.lineCap = 'round';
      for (let i = 0; i < LEVELS.length - 1; i++) {
        const [x1, y1] = nodeXY(i), [x2, y2] = nodeXY(i + 1), mx = (x1 + x2) / 2 + (y2 - y1) * 0.15, my = (y1 + y2) / 2;
        g.setLineDash(d.lv[i].d ? [] : [2, 8]);
        g.strokeStyle = d.lv[i].d ? 'rgba(255,230,140,.95)' : 'rgba(255,255,255,.8)';
        g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(mx, my, x2, y2); g.stroke();
      }
      g.setLineDash([]);
      // nodes
      for (let i = 0; i < LEVELS.length; i++) {
        const [x, y] = nodeXY(i), def = LEVELS[i], un = unlocked(i), rec = d.lv[i], boss = !!def.boss, R = boss ? 18 : 15;
        if (i === d.sel) { g.beginPath(); g.arc(x, y, R + 6 + Math.sin(clock * 4) * 1.5, 0, 7); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill(); }
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + R - 2, R, 4, 0, 0, 7); g.fill();
        g.beginPath(); g.arc(x, y, R, 0, 7);
        g.fillStyle = !un ? '#9aa3ad' : rec.d ? (boss ? '#e0573f' : '#4fb34a') : (boss ? '#f08a5d' : '#ffffff'); g.fill();
        g.lineWidth = 3; g.strokeStyle = !un ? '#6b7480' : rec.d ? '#2f7a33' : '#4f46e5'; if (boss && un) g.strokeStyle = '#8a2f1f'; g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (!un) { g.fillStyle = '#4b535c'; rr(g, x - 5, y - 1, 10, 8, 2); g.fill(); g.strokeStyle = '#4b535c'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 2, 3.4, Math.PI, 0); g.stroke(); }
        else if (boss) { g.fillStyle = rec.d ? '#fff' : '#5a2a1a'; g.font = '900 11px system-ui, sans-serif'; g.fillText('★', x, y + 1); }
        else { g.fillStyle = rec.d ? '#fff' : '#1e293b'; g.font = '900 12px system-ui, sans-serif'; g.fillText(def.id, x, y + 1); }
        if (un) for (let k = 0; k < 3; k++) { const on = [rec.d, rec.s, rec.a][k]; g.fillStyle = on ? '#ffd34d' : 'rgba(255,255,255,.55)'; star(g, x - 10 + k * 10, y + R + 7, 4.4, 1.9, 5, -Math.PI / 2); g.fill(); if (on) { g.strokeStyle = '#b58410'; g.lineWidth = 0.8; g.stroke(); } }
      }
      // Fini on the selected node
      let [fx, fy] = nodeXY(d.sel), pose = 'idle';
      if (mapHop) {
        mapHop.t += 1 / 60; const p = Math.min(1, mapHop.t / 0.45), e = p * p * (3 - 2 * p);
        fx = mapHop.from[0] + (fx - mapHop.from[0]) * e; fy = mapHop.from[1] + (fy - mapHop.from[1]) * e - Math.sin(p * Math.PI) * 26; pose = p < 0.5 ? 'jump' : 'fall';
        if (p >= 1) mapHop = null;
      }
      g.save(); g.translate(fx, fy - 13); g.scale(0.9, 0.9); drawFini(g, { pose, t: clock, star: false }); g.restore();
      // header
      const total = d.lv.reduce((a, r) => a + (r.d ? 1 : 0) + (r.s ? 1 : 0) + (r.a ? 1 : 0), 0), animals = d.lv.reduce((a, r) => a + (r.a ? 1 : 0), 0);
      pill(8, 9, W - 60, 34, 0.5);
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = '900 14px system-ui, sans-serif';
      g.fillText(s('title'), 20, 26, W - 170);
      g.textAlign = 'right'; g.font = '800 12px system-ui, sans-serif'; g.fillStyle = '#ffe28a';
      g.fillText(`★ ${total}/${LEVELS.length * 3}`, W - 62, 21); g.fillStyle = '#ffd0dc'; g.fillText(`🐾 ${animals}/${LEVELS.length}`, W - 62, 34);
      g.beginPath(); g.arc(W - 26, 26, 17, 0, 7); g.fillStyle = 'rgba(14,22,38,.5)'; g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 17px system-ui, sans-serif'; g.fillText('?', W - 26, 27);
      // bottom panel
      const def = LEVELS[d.sel], rec = d.lv[d.sel], py = H - 108;
      rr(g, 10, py, W - 20, 98, 18); g.fillStyle = 'rgba(255,255,255,.94)'; g.fill();
      g.strokeStyle = 'rgba(15,23,42,.08)'; g.lineWidth = 1; g.stroke();
      g.textAlign = 'left'; g.fillStyle = '#64748b'; g.font = '800 11px system-ui, sans-serif';
      g.fillText(`${s('world')} ${def.w + 1}${def.boss ? ' · ' + s('boss') : ''}`, 24, py + 18);
      g.fillStyle = '#0f172a'; g.font = '900 17px system-ui, sans-serif'; g.fillText(`${def.id} · ${Lx(def.name)}`, 24, py + 38, W - 70);
      g.font = '700 12px system-ui, sans-serif'; g.fillStyle = '#475569';
      const an = Lx(ANIMALS[def.animal].name);
      g.fillText(`${['★', '★', '★'].map((st, k) => [rec.d, rec.s, rec.a][k] ? '★' : '☆').join('')}   ${s('seeds')}: ${rec.sd || 0}   ${s('animal')}: ${rec.a ? an : '?'}`, 24, py + 58, W - 60);
      playBtn.w = W - 48; playBtn.h = 30; playBtn.x = 24; playBtn.y = py + 66;
      const un = unlocked(d.sel);
      rr(g, playBtn.x, playBtn.y, playBtn.w, playBtn.h, 15);
      const pg = g.createLinearGradient(0, playBtn.y, 0, playBtn.y + 30); pg.addColorStop(0, un ? '#5ccf55' : '#a0a8b2'); pg.addColorStop(1, un ? '#2f9e3a' : '#7d8590');
      g.fillStyle = pg; g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 14px system-ui, sans-serif'; g.fillText(un ? `▶  ${s('play')}` : s('locked'), W / 2, playBtn.y + 16);
    }

    /* ---------- main loop ---------- */
    let raf = 0, last = 0, acc = 0;
    function frame(ts) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const now = ts / 1000; let dt = last ? now - last : 0; last = now;
      if (dt > 0.1) dt = 0.1;
      const blocked = paused || modalOpen();
      if (!paused) updateTrans(dt);
      if (!blocked || screen === 'map') clock += dt;
      if (!blocked) {
        if (screen === 'level' && G) {
          acc += dt; let n = 0;
          while (acc >= STEP && n < 14) { if (G && screen === 'level') updateLevel(STEP); acc -= STEP; n++; }
          if (n >= 14) acc = 0;
        } else acc = 0;
      }
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (screen === 'level' && G) renderLevel(); else { if (G == null && screen === 'level') screen = 'map'; renderMap(); }
      drawTrans();
    }
    function onVis() { if (document.hidden && screen === 'level') setPause(true); }
    function onBlur() { if (screen === 'level' && G && G.state === 'play') setPause(true); }
    function onResize() { resize(); }
    pauseEl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      ctx.sound('click');
      const a = b.dataset.a;
      if (a === 'resume') setPause(false);
      else if (a === 'restart') { setPause(false); startLevel(G.i); }
      else if (a === 'map') { setPause(false); toMap(); }
      else if (a === 'rules') Kit.rules(s('rulesT'), s('rulesHtml'));
    });
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    window.addEventListener('resize', onResize); window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    cv.addEventListener('pointerdown', onPDown); cv.addEventListener('pointermove', onPMove);
    cv.addEventListener('pointerup', onPUp); cv.addEventListener('pointercancel', onPUp); cv.addEventListener('lostpointercapture', onPUp);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    resize(); layoutCtl();
    irisIn(nodeXY(d.sel)[0], nodeXY(d.sel)[1]);
    raf = requestAnimationFrame(frame);

    /* ---------- debug hook ---------- */
    root.__game = {
      state() {
        return { screen, paused, level: G ? G.def.id : null, index: G ? G.i : d.sel, gameState: G ? G.state : null,
          x: G ? +G.s.x.toFixed(1) : null, y: G ? +G.s.y.toFixed(1) : null, col: G ? Math.floor((G.s.x + 7) / T) : null, cols: G ? G.L.cols : null,
          hearts: G ? G.hearts : null, seeds: G ? G.seedsGot : null, seedsTotal: G ? G.seedsTotal : null, animal: G && G.animal ? G.animal.rescued : null,
          power: G ? G.power : null, time: G ? Math.round(G.time) : null, boss: G && G.boss ? { hp: G.boss.hp, state: G.boss.state } : null,
          god, size: [W, H], progress: d.lv.map(r => [r.d, r.s, r.a]) };
      },
      warp(i) { if (i < 0 || i >= LEVELS.length) return false; startLevel(i); return true; },
      win() { if (!G) return false; G.goalShow = 1; G.state = 'play'; startGoal(); G.goalT = 2.5; return true; },
      godMode(on) { god = on !== false; return god; },
      replay(inputs, opts) { // feed solver input indices (0..5) into the real game loop
        if (!G) return false; opts = opts || {};
        const ACTS = []; for (const dd of [-1, 0, 1]) for (const j of [0, 1]) ACTS.push({ l: dd < 0, r: dd > 0, j: !!j });
        if (opts.handicap !== false) G.P = Object.assign({}, Core.PH, { maxRun: Core.PH.maxRun * 0.93, jumpV: Core.PH.jumpV * 0.96, wallJumpVY: Core.PH.wallJumpVY * 0.96 });
        G.ghost = true; god = true; replayQ = { q: inputs.map(a => ACTS[a]), k: 0, m: opts.macro || 8 }; return true;
      },
      replaying() { return !!replayQ; },
      teleport(c, r) { if (!G) return; G.s.x = c * T + 5; G.s.y = (r + 1) * T - 22; G.s.vx = G.s.vy = 0; snapCam(); },
      bossHit() { if (G && G.boss && G.boss.state !== 'idle' && G.boss.state !== 'gone') { const B = G.boss; G.ghost = false; G.s.x = B.x + B.w / 2 - 7; G.s.y = B.y - 12; G.s.vy = 200; G.s.gr = false; G.s.mover = -1; return true; } return false; },
      // advance the simulation by `sec` seconds synchronously (for tests in throttled browsers)
      tick(sec) { const n = Math.round((sec || 1) / STEP); for (let i = 0; i < n; i++) { if (!(paused || modalOpen())) { clock += STEP; updateTrans(STEP); if (screen === 'level' && G) updateLevel(STEP); } } g.setTransform(DPR, 0, 0, DPR, 0, 0); if (screen === 'level' && G) renderLevel(); else renderMap(); drawTrans(); return this.state(); },
      // average ms for one 60 Hz frame (2 physics steps + full render)
      bench(n) { n = n || 120; const t0 = performance.now(); for (let i = 0; i < n; i++) { if (screen === 'level' && G) { updateLevel(STEP); if (G) updateLevel(STEP); } clock += 1 / 60; g.setTransform(DPR, 0, 0, DPR, 0, 0); if (screen === 'level' && G) renderLevel(); else renderMap(); } return +((performance.now() - t0) / n).toFixed(2); },
      core: Core, levels: LEVELS, art: { tileGround, tileBlock, THEMES, cache }
    };

    return {
      destroy() {
        alive = false; cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
        window.removeEventListener('resize', onResize); window.removeEventListener('blur', onBlur);
        document.removeEventListener('visibilitychange', onVis);
        ptrs.clear(); G = null; delete root.__game;
      }
    };
  }

  /* ======================================================================
     Card art (SVG) and registration
     ====================================================================== */
  // Fini mid-jump, local coordinates: feet at (0,0), about 34 px tall, facing right.
  function foxSVG(id) {
    const line = '#6b2a12';
    return `<g stroke-linejoin="round" stroke-linecap="round">
      <g transform="translate(-5 -9) rotate(-48)">
        <path d="M1-3C-5-10-17-9-19-2C-17 4-6 5 1 3Z" fill="#ee7230" stroke="${line}" stroke-width="1.1"/>
        <path d="M-13-7.6C-17-7-19.2-4-19-2C-18 2-15 3.4-12.5 3.4Q-15-1-13-7.6Z" fill="#fff0dc"/>
      </g>
      <path d="M-3-17.5Q-9-21-17-23L-17-19.5Q-9-16-2-15Z" fill="#2fae5e"/>
      <path d="M-3-17Q-10-15-16-13L-15-10Q-8-12-2-14.5Z" fill="#1f7f43"/>
      <g transform="translate(-2 -7.5) rotate(34)"><rect x="-2.1" y="0" width="4.2" height="7.5" rx="2" fill="#3d2214"/><ellipse cx="1" cy="7.2" rx="3" ry="1.8" fill="#3d2214"/></g>
      <g transform="translate(-2.5 -14) rotate(-104)"><rect x="-1.7" y="0" width="3.4" height="6.5" rx="1.7" fill="#c4501e"/><circle cy="6.4" r="1.9" fill="#3d2214"/></g>
      <ellipse cy="-11" rx="6" ry="6.6" fill="#ee7230" stroke="${line}" stroke-width="1.1"/>
      <ellipse cx="1.9" cy="-10" rx="3.4" ry="4.6" fill="#fff0dc"/>
      <g transform="translate(2 -7.5) rotate(-52)"><rect x="-2.1" y="0" width="4.2" height="7.5" rx="2" fill="#3d2214"/><ellipse cx="1" cy="7.2" rx="3" ry="1.8" fill="#3d2214"/></g>
      <ellipse cx=".5" cy="-16.5" rx="6.2" ry="2.5" fill="#2fae5e"/>
      <g transform="translate(1.5 -23)">
        <g transform="translate(-4 -5) rotate(-30)"><path d="M-3.4 2L0-7L3.4 2Z" fill="#ee7230" stroke="${line}" stroke-width="1.1"/><path d="M-1.6 1.4L0-3.6L1.6 1.4Z" fill="#f6a7a0"/><path d="M-1.3-3.6L0-7L1.3-3.6Z" fill="#3d2214"/></g>
        <ellipse rx="8" ry="7.2" fill="#ee7230" stroke="${line}" stroke-width="1.1"/>
        <g transform="translate(2.5 -6) rotate(-6)"><path d="M-3.4 2L0-7L3.4 2Z" fill="#ee7230" stroke="${line}" stroke-width="1.1"/><path d="M-1.6 1.4L0-3.6L1.6 1.4Z" fill="#f6a7a0"/><path d="M-1.3-3.6L0-7L1.3-3.6Z" fill="#3d2214"/></g>
        <path d="M1-.5Q6-2.5 10.4 1.2Q7 5.5 1.5 4.8Q-1.5 3 1-.5Z" fill="#fff0dc"/>
        <circle cx="10.2" cy=".9" r="1.6" fill="#3d2214"/>
        <ellipse cx="4" cy="-1.6" rx="1.8" ry="2.4" fill="#3d2214"/><circle cx="4.6" cy="-2.5" r=".75" fill="#fff"/>
        <path d="M6.6 3Q8.4 4.6 9.6 3" fill="none" stroke="#3d2214" stroke-width=".9"/>
        <ellipse cx=".5" cy="2.5" rx="2" ry="1.2" fill="#ff786e" opacity=".35"/>
      </g>
      <g transform="translate(2.5 -14) rotate(-140)"><rect x="-1.7" y="0" width="3.4" height="6.5" rx="1.7" fill="#ee7230"/><circle cy="6.4" r="1.9" fill="#3d2214"/></g>
    </g>`;
  }
  function seedSVG(x, y, s, id) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><circle r="9" fill="url(#${id}-sg)"/>
      <path d="M0-6.5C6-3 5.5 6 0 6.5C-5.5 6-6-3 0-6.5Z" fill="#ffd65a" stroke="#b07a14" stroke-width=".8"/>
      <ellipse cx="3.5" cy="-6.4" rx="3.4" ry="1.6" transform="rotate(-28 3.5 -6.4)" fill="#6ccf47"/></g>`;
  }
  function thumbArt() {
    const id = 'pfT';
    let tiles = '';
    for (let i = 0; i < 9; i++) tiles += `<rect x="${i * 20 - 6}" y="62" width="20" height="20" fill="${i % 2 ? '#8d5b37' : '#94603a'}"/>`;
    return `<defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ea6e6"/><stop offset=".65" stop-color="#9fd8f6"/><stop offset="1" stop-color="#fbefcf"/></linearGradient>
      <radialGradient id="${id}-sun" cx=".82" cy=".2" r=".35"><stop offset="0" stop-color="#fff6c4" stop-opacity=".95"/><stop offset="1" stop-color="#fff6c4" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}-sg"><stop offset="0" stop-color="#fff2a0" stop-opacity=".8"/><stop offset="1" stop-color="#ffd84d" stop-opacity="0"/></radialGradient></defs>
      <rect width="160" height="80" fill="url(#${id}-sky)"/><rect width="160" height="80" fill="url(#${id}-sun)"/>
      <circle cx="132" cy="16" r="7" fill="#fff8d8"/>
      <path d="M0 48Q30 30 62 44T126 40T160 44V80H0Z" fill="#a5cfc6"/>
      <path d="M0 56Q24 44 50 54T104 50T160 56V80H0Z" fill="#62ad69"/>
      <g fill="#47935a"><circle cx="16" cy="46" r="9"/><circle cx="26" cy="42" r="7"/><circle cx="118" cy="44" r="9"/><circle cx="130" cy="47" r="7"/></g>
      ${tiles}<path d="M-2 62Q10 66 20 62T40 62T60 62T80 62T100 62T120 62T140 62T162 62V58H-2Z" fill="#5fbf46"/><rect x="-2" y="58" width="164" height="2" fill="#a5e46e"/>
      <rect x="102" y="26" width="15" height="15" rx="2.5" fill="#d79a52" stroke="#7a4a22" stroke-width="1.2"/><circle cx="109.5" cy="33.5" r="3" fill="#ffe680"/>
      ${seedSVG(58, 30, 0.75, id)}${seedSVG(70, 22, 0.75, id)}${seedSVG(84, 20, 0.75, id)}
      <g transform="translate(42 52) scale(1.25)">${foxSVG(id)}</g>`;
  }
  function bigArt() {
    const id = 'pfA';
    let tiles = '';
    for (let i = 0; i < 15; i++) tiles += `<rect x="${i * 24 - 8}" y="132" width="24" height="40" fill="${i % 2 ? '#8d5b37' : '#94603a'}"/><circle cx="${i * 24 + 2}" cy="${148 + (i % 3) * 6}" r="2" fill="#5c3822" opacity=".5"/>`;
    return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fini">
      <defs>
        <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f9be0"/><stop offset=".6" stop-color="#9ad6f5"/><stop offset="1" stop-color="#fdf0cf"/></linearGradient>
        <radialGradient id="${id}-sun" cx=".8" cy=".18" r=".4"><stop offset="0" stop-color="#fff7cc"/><stop offset=".25" stop-color="#fff2b0" stop-opacity=".7"/><stop offset="1" stop-color="#fff2b0" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}-sg"><stop offset="0" stop-color="#fff2a0" stop-opacity=".85"/><stop offset="1" stop-color="#ffd84d" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c8ff9a" stop-opacity=".6"/><stop offset="1" stop-color="#c8ff9a" stop-opacity="0"/></radialGradient>
        <linearGradient id="${id}-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff8e6" stop-opacity=".55"/></linearGradient>
      </defs>
      <rect width="320" height="170" fill="url(#${id}-sky)"/><rect width="320" height="170" fill="url(#${id}-sun)"/>
      <circle cx="258" cy="32" r="15" fill="#fff8d8"/>
      <g fill="#fff" opacity=".9"><ellipse cx="62" cy="34" rx="26" ry="9"/><ellipse cx="78" cy="29" rx="16" ry="10"/><ellipse cx="190" cy="22" rx="20" ry="7"/><ellipse cx="202" cy="18" rx="12" ry="8"/></g>
      <path d="M0 92Q50 58 110 82T220 74T320 84V170H0Z" fill="#a5cfc6"/><rect y="60" width="320" height="110" fill="url(#${id}-haze)"/>
      <path d="M0 104Q40 86 90 100T190 96T320 104V170H0Z" fill="#7fb3a3"/>
      <g fill="#47935a"><circle cx="30" cy="100" r="17"/><circle cx="50" cy="92" r="13"/><circle cx="14" cy="96" r="11"/><circle cx="250" cy="96" r="16"/><circle cx="270" cy="90" r="12"/><circle cx="292" cy="98" r="14"/></g>
      <g fill="#5fb85a" opacity=".9"><circle cx="26" cy="94" r="8"/><circle cx="246" cy="90" r="8"/><circle cx="288" cy="92" r="6"/></g>
      <path d="M0 116Q60 100 120 114T240 108T320 116V170H0Z" fill="#62ad69"/>
      <g transform="translate(286 132)"><rect x="-3" y="-30" width="6" height="30" fill="#7a5232"/><circle cx="0" cy="-38" r="16" fill="#3f9a4c"/><circle cx="-10" cy="-30" r="10" fill="#4da455"/><circle cx="10" cy="-31" r="11" fill="#4da455"/><circle cx="-4" cy="-44" r="7" fill="#6cc063"/><circle cx="-8" cy="-33" r="2.4" fill="#ff5d5d"/><circle cx="7" cy="-40" r="2.4" fill="#ff5d5d"/></g>
      ${tiles}
      <path d="M-4 132Q8 138 20 132T44 132T68 132T92 132T116 132T140 132T164 132T188 132T212 132T236 132T260 132T284 132T308 132T332 132V126H-4Z" fill="#5fbf46"/>
      <rect x="-4" y="125" width="328" height="3" fill="#a5e46e"/>
      <g fill="#3a8a31"><path d="M40 126l2-7 2 7z"/><path d="M120 126l2-6 2 6z"/><path d="M210 126l2-8 2 8z"/><path d="M262 126l2-6 2 6z"/></g>
      <g transform="translate(54 58)"><rect width="24" height="24" rx="3.5" fill="#d79a52" stroke="#7a4a22" stroke-width="1.6"/><path d="M3 8H21M3 16H21" stroke="#7a4a22" stroke-opacity=".5"/><circle cx="12" cy="12" r="6.6" fill="#502800" opacity=".3"/><ellipse cx="12" cy="13" rx="3.4" ry="4.4" fill="#ffe680"/><ellipse cx="14.5" cy="7.6" rx="3" ry="1.6" fill="#7ccf4a" transform="rotate(-34 14.5 7.6)"/></g>
      ${seedSVG(104, 70, 1.1, id)}${seedSVG(212, 40, 1.1, id)}${seedSVG(234, 52, 1.1, id)}${seedSVG(252, 70, 1.1, id)}${seedSVG(266, 92, 1.1, id)}
      <g transform="translate(214 124)"><g fill="#5f5a78"><circle cx="-6" cy="-7" r="6"/><circle cx="5" cy="-8" r="6.5"/><circle cx="0" cy="-12" r="6.5"/><circle cx="7" cy="-4" r="4.5"/><circle cx="-8" cy="-3" r="4"/></g><g fill="#8e88a8"><circle cx="-6" cy="-8" r="5.4"/><circle cx="5" cy="-9" r="5.9"/><circle cx="0" cy="-13" r="5.9"/></g><ellipse cx="-3" cy="-9" rx="2.4" ry="2.8" fill="#fff"/><ellipse cx="4" cy="-9" rx="2.4" ry="2.8" fill="#fff"/><circle cx="-3.6" cy="-8.6" r="1.3" fill="#2a2438"/><circle cx="3.4" cy="-8.6" r="1.3" fill="#2a2438"/><path d="M-6-12.5L-1.5-11.4M7-12.5L2.5-11.4" stroke="#2a2438" stroke-width="1.2"/></g>
      <circle cx="160" cy="58" r="52" fill="url(#${id}-glow)" opacity=".55"/>
      <g fill="#fff6c0"><path d="M98 100l1.5-4 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5z"/><path d="M244 40l1.2-3 1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2z"/><path d="M182 104l1-2.6 1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1z"/></g>
      <g transform="translate(166 92) scale(2.35) rotate(-6)">${foxSVG(id)}</g>
      <g fill="#e9dcc4" opacity=".75"><circle cx="128" cy="124" r="4"/><circle cx="120" cy="121" r="3"/><circle cx="136" cy="122" r="2.6"/></g>
    </svg>`;
  }

  Games.register({
    id: 'platformer', icon: '🦊', partner: 'p1', tier: 'top', cat: 'adventure', isNew: true,
    name: { de: 'Finis Waldabenteuer', en: "Fini's Forest Quest", ru: 'Лесное приключение Фини', uk: 'Лісова пригода Фіні' },
    tagline: {
      de: 'Lauf, spring und gleite mit Fini – heile den Wald, Level für Level!',
      en: 'Run, jump and glide with Fini – heal the forest level by level!',
      ru: 'Беги, прыгай и пари с Фини — лечи лес уровень за уровнем!',
      uk: 'Біжи, стрибай і ширяй із Фіні — лікуй ліс рівень за рівнем!'
    },
    kicker: { de: 'Jump & Run', en: 'Jump & run', ru: 'Платформер', uk: 'Платформер' },
    badges: [
      { id: 'platformer_world1', icon: '🌳', name: { de: 'Sonniger Wald befreit', en: 'Sunny Forest restored', ru: 'Солнечный лес спасён', uk: 'Сонячний ліс врятовано' } },
      { id: 'platformer_all', icon: '🦊', name: { de: 'Alle 12 Level geschafft', en: 'All 12 levels cleared', ru: 'Все 12 уровней пройдены', uk: 'Усі 12 рівнів пройдено' } }
    ],
    thumb: thumbArt,
    art: bigArt,
    _core: { Core, LEVELS, STR, ANIMALS },
    mount
  });
})();
