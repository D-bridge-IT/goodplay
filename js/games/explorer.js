// Insel der Entdeckungen (id: explorer) – cozy top-down exploration adventure for GoodPlay.
// Plain Canvas 2D, all art procedural: ground cached in chunk canvases, sprites baked once, y-sorted
// entities, day/night light map, 12 chained quests, 36 journal entries with real facts (de/en/ru/uk).
(function () {
  'use strict';
  const TS = 40, MW = 64, MH = 58, ISW = 48, CH = 8, CHP = CH * TS;
  const T = (de, en, ru, uk) => ({ de, en, ru, uk });
  const tl = o => (o == null ? '' : typeof o === 'string' ? o : (window.L ? L(o) : o.de));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const TAU = Math.PI * 2;

  /* =====================================================================================
     Text: characters, dialogue, quests, items, journal
     ===================================================================================== */
  const NPC_INFO = {
    marla: { n: T('Kapitänin Marla', 'Captain Marla', 'Капитан Марла', 'Капітанка Марла'), r: T('Fährkapitänin', 'Ferry captain', 'Капитан парома', 'Капітанка порома') },
    tomek: { n: T('Tomek', 'Tomek', 'Томек', 'Томек'), r: T('Tischler', 'Carpenter', 'Плотник', 'Тесля') },
    fynn: { n: T('Fynn', 'Fynn', 'Финн', 'Фінн'), r: T('Fischer', 'Fisherman', 'Рыбак', 'Рибалка') },
    rosa: { n: T('Oma Rosa', 'Grandma Rosa', 'Бабушка Роза', 'Бабуся Роза'), r: T('Bäckerin', 'Baker', 'Пекарь', 'Пекарка') },
    mira: { n: T('Mira', 'Mira', 'Мира', 'Міра'), r: T('Markthändlerin', 'Market trader', 'Торговка на рынке', 'Торговиця на ринку') },
    ida: { n: T('Ida', 'Ida', 'Ида', 'Іда'), r: T('Gärtnerin', 'Gardener', 'Садовница', 'Садівниця') },
    kai: { n: T('Kai', 'Kai', 'Кай', 'Кай'), r: T('Tierfotograf', 'Wildlife photographer', 'Фотограф природы', 'Фотограф природи') },
    pikko: { n: T('Pikko', 'Pikko', 'Пикко', 'Пікко'), r: T('Igel', 'Hedgehog', 'Ёжик', 'Їжачок') },
    lotta: { n: T('Lotta', 'Lotta', 'Лотта', 'Лотта'), r: T('Geologin', 'Geologist', 'Геолог', 'Геологиня') },
    hanno: { n: T('Hanno', 'Hanno', 'Ханно', 'Ганно'), r: T('Leuchtturmwärter', 'Lighthouse keeper', 'Смотритель маяка', 'Доглядач маяка') }
  };

  const D = {
    marla: {
      intro: T(
        ['Ahoi und willkommen auf der Insel! Ich bin Kapitänin Marla.', 'Seit dem letzten Sturm ist der Leuchtturm dunkel. Ohne sein Licht finden die Schiffe nachts nicht in den Hafen.', 'Leuchtturmwärter Hanno braucht Hilfe – aber die Brücke nach Norden ist kaputt. Frag Tomek, den Tischler im Dorf!', 'Hier ist dein Entdecker-Tagebuch. Untersuche alles, was dir auffällt – mit E, der Leertaste oder dem runden Knopf.'],
        ['Ahoy and welcome to the island! I’m Captain Marla.', 'Since the last storm the lighthouse has gone dark. Without its light, ships can’t find the harbour at night.', 'Keeper Hanno needs help – but the bridge to the north is broken. Ask Tomek, the carpenter in the village!', 'Here’s your explorer’s journal. Inspect anything that catches your eye – with E, Space or the round button.'],
        ['Ахой и добро пожаловать на остров! Я капитан Марла.', 'После последнего шторма маяк погас. Без его света корабли ночью не находят гавань.', 'Смотрителю маяка Ханно нужна помощь, но мост на север сломан. Спроси Томека, плотника в деревне!', 'Вот твой дневник исследователя. Осматривай всё, что покажется интересным, — клавишей E, пробелом или круглой кнопкой.'],
        ['Агов і ласкаво просимо на острів! Я капітанка Марла.', 'Після останнього шторму маяк згас. Без його світла кораблі вночі не знаходять гавань.', 'Доглядачеві маяка Ганно потрібна допомога, але міст на північ зламаний. Запитай Томека, теслю в селі!', 'Ось твій щоденник дослідника. Оглядай усе, що здасться цікавим, — клавішею E, пробілом або круглою кнопкою.']),
      idle: T(
        ['Der Leuchtturm steht ganz im Nordosten der Insel. Folge dem Bergpfad hinauf!', 'Und vergiss nicht: Wer genau hinschaut, entdeckt überall etwas Neues.'],
        ['The lighthouse stands at the far north-east of the island. Follow the mountain path up!', 'And remember: if you look closely, there’s something new to discover everywhere.'],
        ['Маяк стоит на самом северо-востоке острова. Иди вверх по горной тропе!', 'И помни: кто смотрит внимательно, везде найдёт что-то новое.'],
        ['Маяк стоїть на самому північному сході острова. Іди вгору гірською стежкою!', 'І пам’ятай: хто дивиться уважно, всюди знайде щось нове.']),
      final: T(
        ['Schau nur – der Leuchtturm strahlt wieder! Heute Nacht finden alle Schiffe sicher heim.', 'Du bist ein echter Glücksfall für diese Insel. Danke!'],
        ['Look – the lighthouse is shining again! Tonight every ship will find its way home.', 'You’re a real treasure for this island. Thank you!'],
        ['Смотри — маяк снова сияет! Сегодня ночью все корабли благополучно вернутся домой.', 'Ты — настоящая находка для этого острова. Спасибо!'],
        ['Дивись — маяк знову сяє! Сьогодні вночі всі кораблі щасливо повернуться додому.', 'Ти — справжня знахідка для цього острова. Дякую!'])
    },
    tomek: {
      offer: T(
        ['Marla schickt dich? Prima, ich kann jede Hand gebrauchen!', 'Der Sturm hat die Brücke über den Fluss zerlegt. Bring mir 4 Treibholz-Bretter – am Strand, im Dorf und auf der Wiese liegen welche.'],
        ['Marla sent you? Great, I can use every pair of hands!', 'The storm smashed the bridge over the river. Bring me 4 driftwood planks – you’ll find some on the beach, in the village and in the meadow.'],
        ['Тебя прислала Марла? Отлично, мне пригодится любая помощь!', 'Шторм разнёс мост через реку. Принеси мне 4 доски из плавника — они лежат на пляже, в деревне и на лугу.'],
        ['Тебе надіслала Марла? Чудово, мені знадобиться будь-яка допомога!', 'Шторм розтрощив міст через річку. Принеси мені 4 дошки з плавнику — вони лежать на пляжі, у селі й на луці.']),
      progress: T(['Noch fehlende Bretter: {n}. Dann hämmere ich los!'], ['Planks still missing: {n}. Then I’ll start hammering!'], ['Осталось досок: {n}. Потом сразу берусь за молоток!'], ['Залишилося дошок: {n}. Потім одразу беруся за молоток!']),
      complete: T(
        ['Perfekt, genau die richtige Sorte Holz!', 'Ich laufe gleich zur Brücke … *klopf, klopf, sääg* … fertig! Der Weg nach Norden ist frei.'],
        ['Perfect, exactly the right kind of wood!', 'I’ll run to the bridge … *knock, knock, saw* … done! The way north is open.'],
        ['Отлично, как раз то дерево, что нужно!', 'Бегу к мосту… *тук-тук, вжик* … готово! Путь на север открыт.'],
        ['Чудово, саме те дерево, що треба!', 'Біжу до мосту… *тук-тук, вжик* … готово! Шлях на північ відкритий.']),
      idle: T(['Holz ist toll: Ein Baum speichert in seinem Leben jede Menge CO₂. Für jedes Brett pflanzen wir einen neuen!'], ['Wood is great: a tree stores lots of CO₂ during its life. For every plank we use, we plant a new one!'], ['Дерево — чудесный материал: за свою жизнь оно накапливает много CO₂. За каждую доску мы сажаем новое дерево!'], ['Деревина — чудовий матеріал: за життя дерево накопичує багато CO₂. За кожну дошку ми садимо нове!'])
    },
    fynn: {
      offer: T(
        ['Grmpf. Sieh dir meinen Strand an – überall Plastik!', 'Plastik zerfällt im Meer erst nach Hunderten von Jahren. Fische und Möwen halten die Stückchen für Futter.', 'Sammelst du 6 Teile für mich? Dann bekommst du was Glänzendes aus meinem Netz.'],
        ['Grmph. Look at my beach – plastic everywhere!', 'In the sea, plastic takes hundreds of years to break down. Fish and gulls mistake the bits for food.', 'Will you collect 6 pieces for me? Then you’ll get something shiny from my net.'],
        ['Хм-м. Посмотри на мой пляж — повсюду пластик!', 'В море пластик разлагается сотни лет. Рыбы и чайки принимают кусочки за еду.', 'Соберёшь для меня 6 штук? Тогда получишь кое-что блестящее из моей сети.'],
        ['Гм-м. Подивись на мій пляж — скрізь пластик!', 'У морі пластик розкладається сотні років. Риби й чайки приймають шматочки за їжу.', 'Збереш для мене 6 штук? Тоді отримаєш дещо блискуче з моєї сітки.']),
      progress: T(['Fehlende Plastikteile: {n}. Schau überall am Strand nach!'], ['Pieces still missing: {n}. Look all along the beach!'], ['Осталось собрать: {n}. Поищи по всему пляжу!'], ['Залишилося зібрати: {n}. Пошукай по всьому пляжу!']),
      complete: T(
        ['Sauber! So muss ein Strand aussehen.', 'Hier – dieses Messing-Zahnrad hing in meinem Netz. Sieht aus wie ein Teil vom Leuchtturm!'],
        ['Spotless! That’s how a beach should look.', 'Here – this brass gear was caught in my net. Looks like a part from the lighthouse!'],
        ['Чистота! Вот каким должен быть пляж.', 'Держи — эта латунная шестерёнка запуталась в моей сети. Похоже на деталь от маяка!'],
        ['Чистота! Ось яким має бути пляж.', 'Тримай — ця латунна шестірня заплуталася в моїй сітці. Схоже на деталь від маяка!']),
      idle: T(['Wenn die Möwen über einen sauberen Strand spazieren … da wird sogar ein alter Brummbär wie ich weich.'], ['When the gulls stroll across a clean beach … even an old grump like me goes soft.'], ['Когда чайки гуляют по чистому пляжу… даже такой старый ворчун, как я, тает.'], ['Коли чайки гуляють чистим пляжем… навіть такий старий буркотун, як я, тане.'])
    },
    rosa: {
      offer: T(
        ['Ach herrje, wer ist da? Ich sehe nur Umrisse …', 'Ich habe meine Brille auf der Blumenwiese verloren, beim Kräuterpflücken. Findest du sie für mich?'],
        ['Oh dear, who’s there? I can only see shapes …', 'I lost my glasses in the flower meadow while picking herbs. Could you find them for me?'],
        ['Ой, кто там? Я вижу только силуэты…', 'Я потеряла очки на цветочном лугу, когда собирала травы. Найдёшь их для меня?'],
        ['Ой лишенько, хто там? Я бачу тільки обриси…', 'Я загубила окуляри на квітковій луці, коли збирала трави. Знайдеш їх для мене?']),
      progress: T(['Ohne Brille backe ich womöglich Salz statt Zucker in den Kuchen!'], ['Without my glasses I might bake salt into the cake instead of sugar!'], ['Без очков я, чего доброго, положу в пирог соль вместо сахара!'], ['Без окулярів я, чого доброго, покладу в пиріг сіль замість цукру!']),
      complete: T(['Meine Brille! Ach, jetzt sehe ich dich ja – was für ein freundliches Gesicht!'], ['My glasses! Oh, now I can see you – what a friendly face!'], ['Мои очки! Ой, теперь я тебя вижу — какое доброе лицо!'], ['Мої окуляри! Ой, тепер я тебе бачу — яке привітне обличчя!']),
      offer2: T(
        ['Weißt du was? Ich backe meinen berühmten Inselkuchen.', 'Dafür brauche ich Honig vom Bienenkorb auf der Wiese, Heidelbeeren aus dem Wald und frische Minze vom Flussufer.'],
        ['You know what? I’ll bake my famous island cake.', 'For that I need honey from the beehive in the meadow, bilberries from the forest and fresh mint from the riverbank.'],
        ['Знаешь что? Я испеку свой знаменитый островной пирог.', 'Для него нужны мёд из улья на лугу, черника из леса и свежая мята с берега реки.'],
        ['Знаєш що? Я спечу свій знаменитий острівний пиріг.', 'Для нього потрібні мед із вулика на луці, чорниці з лісу та свіжа м’ята з берега річки.']),
      progress2: T(['Mir fehlt noch: {list}.'], ['I still need: {list}.'], ['Мне ещё нужно: {list}.'], ['Мені ще потрібно: {list}.']),
      complete2: T(
        ['Alles da! Der Kuchen kommt sofort in den Ofen.', 'Und als Dank: Mit diesem Lampenöl hat mein Mann früher den Leuchtturm betrieben. Bring es Hanno!'],
        ['Everything’s here! The cake goes straight into the oven.', 'And as a thank-you: my husband used this lamp oil in the lighthouse long ago. Take it to Hanno!'],
        ['Всё есть! Пирог сразу отправляется в печь.', 'А в благодарность — вот масло для лампы: мой муж когда-то заправлял им маяк. Отнеси его Ханно!'],
        ['Усе є! Пиріг одразу йде в піч.', 'А на подяку — ось лампова олія: мій чоловік колись заправляв нею маяк. Віднеси її Ганно!']),
      idle: T(['Riechst du das? Frisch gebacken! Komm jederzeit auf ein Stück vorbei.'], ['Can you smell that? Freshly baked! Drop by for a slice any time.'], ['Чувствуешь запах? Только из печи! Заходи на кусочек в любое время.'], ['Відчуваєш запах? Щойно з печі! Заходь на шматочок будь-коли.'])
    },
    mira: {
      offer: T(
        ['Frisches Obst, Gewürze, Muscheln – willkommen an meinem Stand!', 'Die Geologin Lotta zeltet oben am Bergpfad und hat seit Tagen nichts Frisches gegessen.', 'Bringst du ihr diesen Picknickkorb? Über den Fluss geht es nur über die Brücke.'],
        ['Fresh fruit, spices, seashells – welcome to my stall!', 'Lotta the geologist is camping up on the mountain path and hasn’t had fresh food for days.', 'Would you take her this picnic basket? You can only cross the river by the bridge.'],
        ['Свежие фрукты, пряности, ракушки — добро пожаловать к моему прилавку!', 'Геолог Лотта живёт в палатке на горной тропе и уже несколько дней не ела ничего свежего.', 'Отнесёшь ей эту корзину для пикника? Через реку можно перейти только по мосту.'],
        ['Свіжі фрукти, прянощі, мушлі — ласкаво просимо до мого прилавка!', 'Геологиня Лотта живе в наметі на гірській стежці й уже кілька днів не їла нічого свіжого.', 'Віднесеш їй цей кошик для пікніка? Через річку можна перейти тільки мостом.']),
      progress: T(['Lotta zeltet am Bergpfad im Nordosten. Der Korb ist schwer, aber lecker!'], ['Lotta is camping on the mountain path in the north-east. The basket is heavy, but tasty!'], ['Лотта живёт в палатке на горной тропе на северо-востоке. Корзина тяжёлая, зато вкусная!'], ['Лотта живе в наметі на гірській стежці на північному сході. Кошик важкий, зате смачний!']),
      idle: T(['Auf einer Insel hilft man sich eben. Danke fürs Liefern!'], ['On an island, people help each other. Thanks for the delivery!'], ['На острове все помогают друг другу. Спасибо за доставку!'], ['На острові всі допомагають одне одному. Дякую за доставку!'])
    },
    lotta: {
      hello: T(['Hallo! Ich bin Lotta und erforsche die Gesteine der Insel.'], ['Hi! I’m Lotta and I study the rocks of this island.'], ['Привет! Я Лотта, изучаю камни этого острова.'], ['Привіт! Я Лотта, досліджую каміння цього острова.']),
      delivery: T(
        ['Ist das … ein Picknickkorb von Mira? Du rettest mir den Tag!', 'Nimm dafür meine Laterne. In Höhlen ist es stockdunkel – mit ihr siehst du jeden Kristall.'],
        ['Is that … a picnic basket from Mira? You’ve saved my day!', 'Take my lantern in return. Caves are pitch-dark – with this you’ll see every crystal.'],
        ['Это… корзина для пикника от Миры? Ты меня спасаешь!', 'Возьми взамен мой фонарь. В пещерах кромешная тьма — с ним увидишь каждый кристалл.'],
        ['Це… кошик для пікніка від Міри? Ти мене рятуєш!', 'Візьми натомість мій ліхтар. У печерах непроглядна темрява — з ним побачиш кожен кристал.']),
      offer: T(
        ['Hilfst du mir bei meiner Sammlung? Ich suche drei Proben:', 'Quarz vom Strand, Basalt hier vom Berg und Amethyst aus einer Höhle.'],
        ['Will you help with my collection? I’m looking for three samples:', 'quartz from the beach, basalt from this mountain and amethyst from a cave.'],
        ['Поможешь с моей коллекцией? Я ищу три образца:', 'кварц с пляжа, базальт здесь, на горе, и аметист из пещеры.'],
        ['Допоможеш із моєю колекцією? Я шукаю три зразки:', 'кварц із пляжу, базальт тут, на горі, і аметист із печери.']),
      progress: T(['Mir fehlt noch: {list}.'], ['I still need: {list}.'], ['Мне ещё нужно: {list}.'], ['Мені ще потрібно: {list}.']),
      complete: T(['Wunderschön! Manche dieser Steine sind älter als die Dinosaurier.'], ['Beautiful! Some of these rocks are older than the dinosaurs.'], ['Красота! Некоторые из этих камней старше динозавров.'], ['Краса! Деякі з цих каменів старші за динозаврів.']),
      idle: T(['Steine erzählen Geschichten – von Vulkanen, Meeren und Millionen von Jahren.'], ['Rocks tell stories – of volcanoes, oceans and millions of years.'], ['Камни рассказывают истории — о вулканах, морях и миллионах лет.'], ['Каміння розповідає історії — про вулкани, моря й мільйони років.'])
    },
    ida: {
      offer: T(
        ['Hallo! Ich bin Ida, die Gärtnerin. Der Sturm hat am Flussufer viele junge Bäume umgeworfen.', 'Pflanzt du diese 4 Setzlinge in die Erdbeete am Fluss, nördlich der Wiese?', 'Baumwurzeln halten das Ufer fest, damit der Fluss es nicht wegspült.'],
        ['Hello! I’m Ida, the gardener. The storm knocked over many young trees by the river.', 'Will you plant these 4 seedlings in the soil beds by the river, north of the meadow?', 'Tree roots hold the riverbank together so the water can’t wash it away.'],
        ['Привет! Я Ида, садовница. Шторм повалил много молодых деревьев у реки.', 'Посадишь эти 4 саженца в грядки у реки, к северу от луга?', 'Корни деревьев держат берег, чтобы река его не размыла.'],
        ['Привіт! Я Іда, садівниця. Шторм повалив багато молодих дерев біля річки.', 'Посадиш ці 4 саджанці в грядки біля річки, на північ від луки?', 'Коріння дерев тримає берег, щоб річка його не розмила.']),
      progress: T(['Noch zu pflanzen: {n}. Die Erdbeete liegen am Fluss, nördlich der Wiese.'], ['Still to plant: {n}. The soil beds are by the river, north of the meadow.'], ['Осталось посадить: {n}. Грядки — у реки, к северу от луга.'], ['Залишилося посадити: {n}. Грядки — біля річки, на північ від луки.']),
      complete: T(
        ['Wunderbar! In ein paar Jahren wächst hier ein kleiner Wald.', 'Nimm meine Gartenschere als Dank – vielleicht brauchst du sie noch.'],
        ['Wonderful! In a few years a little forest will grow here.', 'Take my garden shears as a thank-you – you might need them.'],
        ['Чудесно! Через несколько лет здесь вырастет маленький лес.', 'Возьми в благодарность мои садовые ножницы — вдруг пригодятся.'],
        ['Чудово! За кілька років тут виросте маленький ліс.', 'Візьми на подяку мої садові ножиці — раптом знадобляться.']),
      idle: T(['Ein großer Baum verdunstet an einem Sommertag Hunderte Liter Wasser – wie eine natürliche Klimaanlage.'], ['On a summer day a big tree evaporates hundreds of litres of water – like a natural air conditioner.'], ['В летний день большое дерево испаряет сотни литров воды — как природный кондиционер.'], ['Літнього дня велике дерево випаровує сотні літрів води — як природний кондиціонер.'])
    },
    kai: {
      offer: T(
        ['Pssst! Nicht so laut – da drüben am Fluss steht ein Reiher!', 'Ich mache ein Fotobuch über die Tiere der Insel. Hier ist meine zweite Kamera.', 'Fotografierst du 5 Tiere für mich? Krabbe, Seehund, Reiher, Fuchs und Reh.'],
        ['Psst! Not so loud – there’s a heron over by the river!', 'I’m making a photo book about the island’s animals. Here’s my spare camera.', 'Will you photograph 5 animals for me? Crab, seal, heron, fox and deer.'],
        ['Тсс! Потише — вон там, у реки, стоит цапля!', 'Я делаю фотокнигу о животных острова. Вот мой запасной фотоаппарат.', 'Сфотографируешь для меня 5 животных? Краба, тюленя, цаплю, лису и косулю.'],
        ['Тсс! Тихіше — он там, біля річки, стоїть чапля!', 'Я роблю фотокнигу про тварин острова. Ось мій запасний фотоапарат.', 'Сфотографуєш для мене 5 тварин? Краба, тюленя, чаплю, лисицю й козулю.']),
      progress: T(['Fotos: {n} von 5. Mir fehlt noch: {list}.'], ['Photos: {n} of 5. Still missing: {list}.'], ['Фото: {n} из 5. Ещё нет: {list}.'], ['Фото: {n} з 5. Ще бракує: {list}.']),
      complete: T(
        ['Wow, das Reh ist gestochen scharf! Das wird das schönste Fotobuch der Insel.', 'Behalte die Kamera – alle, die gern entdecken, brauchen so etwas.'],
        ['Wow, the deer is pin-sharp! This will be the island’s most beautiful photo book.', 'Keep the camera – every explorer needs one.'],
        ['Ух ты, косуля получилась такой чёткой! Это будет лучшая фотокнига острова.', 'Оставь фотоаппарат себе — он нужен каждому, кто любит открытия.'],
        ['Ого, козуля вийшла такою чіткою! Це буде найкраща фотокнига острова.', 'Залиш фотоапарат собі — він потрібен кожному, хто любить відкриття.']),
      idle: T(['Tipp: Tiere bleiben ruhig, wenn man sich langsam bewegt und Abstand hält.'], ['Tip: animals stay calm if you move slowly and keep your distance.'], ['Совет: животные не пугаются, если двигаться медленно и держаться на расстоянии.'], ['Порада: тварини не лякаються, якщо рухатися повільно й триматися на відстані.'])
    },
    pikko: {
      offer: T(
        ['Fiep! Hilfe! Ich habe mich in einem alten Fischernetz verheddert!', 'Ich komme nicht raus … Hast du etwas Scharfes? Ida, die Gärtnerin, hat eine Schere!'],
        ['Squeak! Help! I’m tangled up in an old fishing net!', 'I can’t get out … Do you have something sharp? Ida the gardener has shears!'],
        ['Пи-и! Помогите! Я запутался в старой рыболовной сети!', 'Не могу выбраться… У тебя есть что-нибудь острое? У садовницы Иды есть ножницы!'],
        ['Пі-і! Рятуйте! Я заплутався в старій рибальській сітці!', 'Не можу вибратися… У тебе є щось гостре? У садівниці Іди є ножиці!']),
      progress: T(['Fiep … Bitte beeil dich! Ida wohnt auf der Blumenwiese.'], ['Squeak … please hurry! Ida lives in the flower meadow.'], ['Пи-и… Пожалуйста, поторопись! Ида живёт на цветочном лугу.'], ['Пі-і… Будь ласка, поквапся! Іда живе на квітковій луці.']),
      complete: T(
        ['*Schnipp, schnapp* … Frei! Danke, danke, danke!', 'Ich verrate dir ein Geheimnis: Am Berg, hinter dichten Ranken, liegt eine versteckte Höhle. Darin funkelt ein riesiger Kristall!'],
        ['*Snip, snap* … Free! Thank you, thank you, thank you!', 'Let me tell you a secret: on the mountain, behind thick vines, there’s a hidden cave. A huge crystal sparkles inside!'],
        ['*Чик-чик* … Свобода! Спасибо, спасибо, спасибо!', 'Открою тебе секрет: на горе, за густыми лианами, спрятана пещера. Внутри сверкает огромный кристалл!'],
        ['*Чик-чик* … Свобода! Дякую, дякую, дякую!', 'Відкрию тобі секрет: на горі, за густими ліанами, захована печера. Усередині виблискує величезний кристал!']),
      idle: T(['Igel fressen Käfer und Schnecken – wir sind die kleinen Gartenhelfer der Natur!'], ['Hedgehogs eat beetles and slugs – we’re nature’s little garden helpers!'], ['Ежи едят жуков и слизней — мы маленькие садовые помощники природы!'], ['Їжаки їдять жуків і слимаків — ми маленькі садові помічники природи!'])
    },
    hanno: {
      offer: T(
        ['Oh, Besuch! Ich bin Hanno, der Leuchtturmwärter.', 'Der Sturm hat meine Lampe zerstört. Ich brauche drei Teile: ein Messing-Zahnrad für das Drehwerk, Lampenöl und eine neue Kristall-Linse.', 'Ohne Licht sind die Schiffe in Gefahr. Hilfst du mir?'],
        ['Oh, a visitor! I’m Hanno, the lighthouse keeper.', 'The storm wrecked my lamp. I need three parts: a brass gear for the turning mechanism, lamp oil and a new crystal lens.', 'Without light, the ships are in danger. Will you help me?'],
        ['О, гости! Я Ханно, смотритель маяка.', 'Шторм разбил мою лампу. Мне нужны три детали: латунная шестерёнка для вращения, масло для лампы и новая хрустальная линза.', 'Без света корабли в опасности. Поможешь мне?'],
        ['О, гості! Я Ганно, доглядач маяка.', 'Шторм розбив мою лампу. Мені потрібні три деталі: латунна шестірня для обертання, лампова олія та нова кришталева лінза.', 'Без світла кораблі в небезпеці. Допоможеш мені?']),
      progress: T(['Es fehlt noch: {list}. Ich halte so lange Ausschau.'], ['Still missing: {list}. I’ll keep watch until then.'], ['Ещё не хватает: {list}. А я пока посторожу.'], ['Ще бракує: {list}. А я поки повартую.']),
      complete: T(
        ['Zahnrad, Öl, Linse … alles an seinem Platz. Jetzt der Schalter …', 'Es leuchtet! Siehst du, wie der Strahl übers Meer wandert? Jedes Schiff sieht uns jetzt!'],
        ['Gear, oil, lens … all in place. Now the switch …', 'It’s shining! See how the beam sweeps across the sea? Every ship can see us now!'],
        ['Шестерёнка, масло, линза… всё на месте. Теперь рубильник…', 'Горит! Видишь, как луч скользит по морю? Теперь нас видит каждый корабль!'],
        ['Шестірня, олія, лінза… усе на місці. Тепер вимикач…', 'Світить! Бачиш, як промінь ковзає морем? Тепер нас бачить кожен корабель!']),
      idle: T(['Jeder Leuchtturm blinkt in seinem eigenen Rhythmus – so wissen Seeleute genau, wo sie sind. Komm abends wieder und sieh es dir an!'], ['Every lighthouse flashes in its own rhythm – that’s how sailors know exactly where they are. Come back in the evening and watch!'], ['Каждый маяк мигает в своём ритме — так моряки точно знают, где находятся. Приходи вечером посмотреть!'], ['Кожен маяк блимає у своєму ритмі — так моряки точно знають, де вони. Приходь увечері подивитися!'])
    }
  };

  // Quests: giver, stars, icon, title. Objectives are built in code (they depend on live progress).
  const QUESTS = {
    welcome: { g: 'marla', st: 5, ic: '⚓', t: T('Willkommen an Land', 'Welcome ashore', 'Добро пожаловать на берег', 'Ласкаво просимо на берег') },
    bridge: { g: 'tomek', st: 8, ic: '🔨', t: T('Die kaputte Brücke', 'The broken bridge', 'Сломанный мост', 'Зламаний міст') },
    beach: { g: 'fynn', st: 8, ic: '🧴', t: T('Ein sauberer Strand', 'A clean beach', 'Чистый пляж', 'Чистий пляж') },
    glasses: { g: 'rosa', st: 5, ic: '👓', t: T('Rosas Brille', 'Rosa’s glasses', 'Очки Розы', 'Окуляри Рози') },
    recipe: { g: 'rosa', st: 8, ic: '🍰', t: T('Rosas Inselkuchen', 'Rosa’s island cake', 'Островной пирог Розы', 'Острівний пиріг Рози') },
    trees: { g: 'ida', st: 8, ic: '🌱', t: T('Neue Bäume', 'New trees', 'Новые деревья', 'Нові дерева') },
    hedgehog: { g: 'pikko', st: 8, ic: '🦔', t: T('Igel in Not', 'Hedgehog in trouble', 'Ёжик в беде', 'Їжачок у біді') },
    photos: { g: 'kai', st: 10, ic: '📷', t: T('Kais Fotobuch', 'Kai’s photo book', 'Фотокнига Кая', 'Фотокнига Кая') },
    delivery: { g: 'mira', st: 6, ic: '🧺', t: T('Picknick für Lotta', 'A picnic for Lotta', 'Пикник для Лотты', 'Пікнік для Лотти') },
    rocks: { g: 'lotta', st: 6, ic: '🪨', t: T('Steinsammlung', 'Rock collection', 'Коллекция камней', 'Колекція каменів') },
    crystal: { g: 'pikko', st: 8, ic: '💎', t: T('Die versteckte Höhle', 'The hidden cave', 'Тайная пещера', 'Таємна печера') },
    lamp: { g: 'hanno', st: 40, ic: '💡', main: true, t: T('Licht für den Leuchtturm', 'Light for the lighthouse', 'Свет для маяка', 'Світло для маяка') }
  };
  const QORDER = ['lamp', 'welcome', 'bridge', 'beach', 'glasses', 'recipe', 'trees', 'hedgehog', 'crystal', 'delivery', 'photos', 'rocks'];

  const ITEMS = {
    plank: { n: T('Treibholz-Brett', 'Driftwood plank', 'Доска из плавника', 'Дошка з плавнику') },
    plastic: { n: T('Plastikmüll', 'Plastic waste', 'Пластиковый мусор', 'Пластикове сміття') },
    gear: { n: T('Messing-Zahnrad', 'Brass gear', 'Латунная шестерёнка', 'Латунна шестірня') },
    oil: { n: T('Lampenöl', 'Lamp oil', 'Масло для лампы', 'Лампова олія') },
    lens: { n: T('Kristall-Linse', 'Crystal lens', 'Хрустальная линза', 'Кришталева лінза') },
    glasses: { n: T('Rosas Brille', 'Rosa’s glasses', 'Очки Розы', 'Окуляри Рози') },
    honey: { n: T('Honig', 'Honey', 'Мёд', 'Мед') },
    berries: { n: T('Heidelbeeren', 'Bilberries', 'Черника', 'Чорниці') },
    mint: { n: T('Minze', 'Mint', 'Мята', 'М’ята') },
    seedling: { n: T('Setzling', 'Seedling', 'Саженец', 'Саджанець') },
    shears: { n: T('Gartenschere', 'Garden shears', 'Садовые ножницы', 'Садові ножиці') },
    camera: { n: T('Kamera', 'Camera', 'Фотоаппарат', 'Фотоапарат') },
    basket: { n: T('Picknickkorb', 'Picnic basket', 'Корзина для пикника', 'Кошик для пікніка') },
    lantern: { n: T('Laterne', 'Lantern', 'Фонарь', 'Ліхтар') },
    quartz: { n: T('Quarz-Probe', 'Quartz sample', 'Образец кварца', 'Зразок кварцу') },
    basalt: { n: T('Basalt-Probe', 'Basalt sample', 'Образец базальта', 'Зразок базальту') },
    amethyst: { n: T('Amethyst-Probe', 'Amethyst sample', 'Образец аметиста', 'Зразок аметисту') }
  };

  // Discoveries journal: id, category (p plants, a animals, m minerals, l places), name, fact.
  const JOURNAL = [
    ['marram', 'p', T('Strandhafer', 'Marram grass', 'Песколюб', 'Дюнна трава'), T('Seine langen Wurzeln halten die Dünen fest. Wird er von Sand verschüttet, wächst er einfach nach oben weiter.', 'Its long roots hold sand dunes together. When sand buries it, it simply grows upwards again.', 'Его длинные корни удерживают дюны. Если его засыплет песком, он просто прорастает выше.', 'Її довге коріння утримує дюни. Якщо її засипле піском, вона просто проростає вище.')],
    ['buckthorn', 'p', T('Sanddorn', 'Sea buckthorn', 'Облепиха', 'Обліпиха'), T('Seine orangen Beeren enthalten viel mehr Vitamin C als Zitronen.', 'Its orange berries contain far more vitamin C than lemons.', 'Её оранжевые ягоды содержат гораздо больше витамина C, чем лимоны.', 'Її помаранчеві ягоди містять набагато більше вітаміну C, ніж лимони.')],
    ['oak', 'p', T('Eiche', 'Oak', 'Дуб', 'Дуб'), T('Eine alte Eiche ist Zuhause für Hunderte Arten: Käfer, Vögel, Pilze und Fledermäuse.', 'An old oak is home to hundreds of species: beetles, birds, fungi and bats.', 'Старый дуб — дом для сотен видов: жуков, птиц, грибов и летучих мышей.', 'Старий дуб — дім для сотень видів: жуків, птахів, грибів і кажанів.')],
    ['fern', 'p', T('Farn', 'Fern', 'Папоротник', 'Папороть'), T('Farne gab es schon vor den Dinosauriern. Sie haben keine Samen, sondern vermehren sich mit winzigen Sporen.', 'Ferns existed before the dinosaurs. They have no seeds – they spread with tiny spores.', 'Папоротники росли ещё до динозавров. У них нет семян — они размножаются крошечными спорами.', 'Папороті росли ще до динозаврів. Вони не мають насіння — розмножуються крихітними спорами.')],
    ['flyagaric', 'p', T('Fliegenpilz', 'Fly agaric', 'Мухомор', 'Мухомор'), T('Sehr giftig – nur anschauen! Der Pilz ist nur die „Frucht“, sein riesiges Geflecht lebt unsichtbar im Boden.', 'Very poisonous – just look! The mushroom is only the “fruit”; its huge network lives hidden in the soil.', 'Очень ядовит — только смотреть! Гриб — лишь «плод», а огромная грибница живёт под землёй.', 'Дуже отруйний — лише дивитися! Гриб — це тільки «плід», а величезна грибниця живе під землею.')],
    ['bilberry', 'p', T('Heidelbeere', 'Bilberry', 'Черника', 'Чорниця'), T('Wilde Heidelbeeren sind auch innen blau – darum färben sie die Zunge so schön.', 'Wild bilberries are blue inside too – that’s why they colour your tongue.', 'Дикая черника синяя и внутри — поэтому так красит язык.', 'Дика чорниця синя й усередині — тому так фарбує язик.')],
    ['sunflower', 'p', T('Sonnenblume', 'Sunflower', 'Подсолнух', 'Соняшник'), T('Junge Sonnenblumen drehen ihre Köpfe tagsüber mit der Sonne von Osten nach Westen.', 'Young sunflowers turn their heads with the sun from east to west during the day.', 'Молодые подсолнухи днём поворачивают головки вслед за солнцем с востока на запад.', 'Молоді соняшники вдень повертають голівки за сонцем зі сходу на захід.')],
    ['dandelion', 'p', T('Löwenzahn', 'Dandelion', 'Одуванчик', 'Кульбаба'), T('Jeder Samen hat einen kleinen Fallschirm. Der Wind kann ihn kilometerweit tragen.', 'Every seed has its own little parachute. The wind can carry it for kilometres.', 'У каждого семечка свой парашютик. Ветер уносит его на километры.', 'Кожна насінинка має свій парашутик. Вітер відносить її на кілометри.')],
    ['lavender', 'p', T('Lavendel', 'Lavender', 'Лаванда', 'Лаванда'), T('Bienen lieben Lavendel. Sein Duft wird seit Tausenden von Jahren für Seifen und Öle genutzt.', 'Bees love lavender. Its scent has been used in soaps and oils for thousands of years.', 'Пчёлы обожают лаванду. Её аромат тысячи лет используют для мыла и масел.', 'Бджоли обожнюють лаванду. Її аромат тисячі років використовують для мила й олій.')],
    ['waterlily', 'p', T('Seerose', 'Water lily', 'Кувшинка', 'Латаття'), T('Ihre Blätter haben eine Wachsschicht, an der das Wasser einfach abperlt.', 'Its leaves have a waxy coating, so water simply rolls off.', 'Её листья покрыты воском, и вода просто скатывается с них.', 'Його листя вкрите воском, і вода просто скочується з нього.')],
    ['edelweiss', 'p', T('Edelweiß', 'Edelweiss', 'Эдельвейс', 'Едельвейс'), T('Seine weißen Härchen schützen es wie ein Wollmantel vor Kälte und starker Sonne.', 'Its white hairs protect it from cold and strong sun like a woolly coat.', 'Белые волоски защищают его от холода и яркого солнца, как шерстяное пальто.', 'Білі волосинки захищають його від холоду й яскравого сонця, наче вовняне пальто.')],
    ['mint', 'p', T('Minze', 'Mint', 'Мята', 'М’ята'), T('Reibt man ein Blatt, duftet es nach Menthol – das fühlt sich auf der Haut kühl an.', 'Rub a leaf and it smells of menthol – which feels cool on your skin.', 'Если потереть лист, он пахнет ментолом — и холодит кожу.', 'Якщо потерти листок, він пахне ментолом — і холодить шкіру.')],
    ['crab', 'a', T('Strandkrabbe', 'Shore crab', 'Краб', 'Краб'), T('Krabben laufen seitwärts, weil ihre Beine zur Seite hin knicken.', 'Crabs walk sideways because their legs bend to the side.', 'Крабы ходят боком, потому что их ноги сгибаются в стороны.', 'Краби ходять боком, бо їхні ноги згинаються вбік.')],
    ['seal', 'a', T('Seehund', 'Harbour seal', 'Тюлень', 'Тюлень'), T('Seehunde können bis zu einer halben Stunde tauchen, ohne Luft zu holen.', 'Seals can dive for up to half an hour without taking a breath.', 'Тюлени могут нырять до получаса без вдоха.', 'Тюлені можуть пірнати до пів години без вдиху.')],
    ['gull', 'a', T('Möwe', 'Seagull', 'Чайка', 'Чайка'), T('Möwen können Salzwasser trinken: Drüsen über den Augen filtern das Salz heraus.', 'Gulls can drink seawater: glands above their eyes filter out the salt.', 'Чайки могут пить солёную воду: железы над глазами выводят соль.', 'Чайки можуть пити солону воду: залози над очима виводять сіль.')],
    ['trout', 'a', T('Bachforelle', 'Brown trout', 'Форель', 'Форель'), T('Forellen brauchen kühles, sauberes Wasser. Wo sie leben, ist der Fluss gesund.', 'Trout need cool, clean water. Where they live, the river is healthy.', 'Форели нужна прохладная чистая вода. Где она живёт — река здорова.', 'Форелі потрібна прохолодна чиста вода. Де вона живе — річка здорова.')],
    ['heron', 'a', T('Graureiher', 'Grey heron', 'Серая цапля', 'Сіра чапля'), T('Er steht minutenlang reglos im Wasser – und schnappt dann blitzschnell zu.', 'It stands motionless in the water for minutes – then strikes lightning-fast.', 'Она может минутами стоять неподвижно — а потом молниеносно хватает рыбу.', 'Вона може хвилинами стояти нерухомо — а потім блискавично хапає рибу.')],
    ['deer', 'a', T('Reh', 'Roe deer', 'Косуля', 'Козуля'), T('Rehböcke werfen jedes Jahr ihr Geweih ab – und es wächst wieder nach.', 'Roebucks shed their antlers every year – and they grow back.', 'Самцы косули каждый год сбрасывают рога — и они отрастают снова.', 'Самці козулі щороку скидають роги — і вони відростають знову.')],
    ['fox', 'a', T('Rotfuchs', 'Red fox', 'Лиса', 'Лисиця'), T('Füchse hören eine Maus sogar unter einer Schneedecke quieken.', 'Foxes can hear a mouse squeak even under a blanket of snow.', 'Лиса слышит писк мыши даже под снегом.', 'Лисиця чує писк миші навіть під снігом.')],
    ['hedgehog', 'a', T('Igel', 'Hedgehog', 'Ёж', 'Їжак'), T('Ein Igel hat etwa 5000 bis 7000 Stacheln. Bei Gefahr rollt er sich zu einer Kugel.', 'A hedgehog has about 5,000 to 7,000 spines. When in danger, it rolls into a ball.', 'У ежа около 5000–7000 иголок. В опасности он сворачивается клубком.', 'У їжака близько 5000–7000 голок. У небезпеці він згортається клубком.')],
    ['bee', 'a', T('Honigbiene', 'Honeybee', 'Медоносная пчела', 'Медоносна бджола'), T('Für ein Glas Honig fliegen Bienen zusammen mehr als zweimal um die Erde.', 'For one jar of honey, bees together fly more than twice around the Earth.', 'Ради одной банки мёда пчёлы вместе пролетают больше двух кругов вокруг Земли.', 'Заради однієї банки меду бджоли разом пролітають понад два кола навколо Землі.')],
    ['butterfly', 'a', T('Schwalbenschwanz', 'Swallowtail', 'Махаон', 'Махаон'), T('Schmetterlinge schmecken mit den Füßen, ob eine Pflanze gut für ihre Eier ist.', 'Butterflies taste with their feet whether a plant is good for their eggs.', 'Бабочки пробуют растение лапками — подходит ли оно для яиц.', 'Метелики куштують рослину лапками — чи підходить вона для яєць.')],
    ['owl', 'a', T('Waldkauz', 'Tawny owl', 'Неясыть', 'Сова-неясить'), T('Eulen können ihren Kopf um etwa 270 Grad drehen – fast einmal rundherum.', 'Owls can turn their heads about 270 degrees – almost all the way round.', 'Совы могут повернуть голову примерно на 270 градусов — почти полный круг.', 'Сови можуть повернути голову приблизно на 270 градусів — майже повне коло.')],
    ['bat', 'a', T('Fledermaus', 'Bat', 'Летучая мышь', 'Кажан'), T('Fledermäuse rufen im Dunkeln und hören das Echo – so „sehen“ sie mit den Ohren.', 'Bats call out in the dark and listen to the echo – they “see” with their ears.', 'В темноте летучие мыши кричат и слушают эхо — так они «видят» ушами.', 'У темряві кажани кричать і слухають луну — так вони «бачать» вухами.')],
    ['glowworm', 'a', T('Glühwürmchen', 'Glow-worm', 'Светлячок', 'Світлячок'), T('Es erzeugt kaltes Licht durch eine chemische Reaktion im Körper – das nennt man Biolumineszenz.', 'It makes cold light through a chemical reaction in its body – that’s called bioluminescence.', 'Он светится холодным светом благодаря химической реакции в теле — это биолюминесценция.', 'Він світиться холодним світлом завдяки хімічній реакції в тілі — це біолюмінесценція.')],
    ['quartz', 'm', T('Quarz', 'Quartz', 'Кварц', 'Кварц'), T('Der meiste Sand besteht aus winzigen Quarzkörnern – Fels, der über Jahrtausende zerrieben wurde.', 'Most sand is made of tiny quartz grains – rock ground down over thousands of years.', 'Большая часть песка — это крошечные зёрна кварца, перетёртые за тысячи лет.', 'Більша частина піску — це крихітні зерна кварцу, перетерті за тисячі років.')],
    ['amber', 'm', T('Bernstein', 'Amber', 'Янтарь', 'Бурштин'), T('Bernstein ist versteinertes Baumharz – oft Millionen Jahre alt, manchmal mit Insekten darin.', 'Amber is fossilised tree resin – often millions of years old, sometimes with insects inside.', 'Янтарь — окаменевшая смола деревьев возрастом в миллионы лет, иногда с насекомыми внутри.', 'Бурштин — скам’яніла смола дерев віком у мільйони років, іноді з комахами всередині.')],
    ['basalt', 'm', T('Basalt', 'Basalt', 'Базальт', 'Базальт'), T('Basalt entsteht, wenn Lava schnell abkühlt. Oft bildet er sechseckige Säulen.', 'Basalt forms when lava cools quickly. It often makes six-sided columns.', 'Базальт образуется, когда лава быстро остывает. Часто он складывается в шестигранные столбы.', 'Базальт утворюється, коли лава швидко застигає. Часто він складається в шестигранні стовпи.')],
    ['amethyst', 'm', T('Amethyst', 'Amethyst', 'Аметист', 'Аметист'), T('Ein violetter Quarz. Seine Farbe stammt von winzigen Mengen Eisen im Kristall.', 'A purple quartz. Its colour comes from tiny amounts of iron in the crystal.', 'Фиолетовый кварц. Цвет ему дают крошечные примеси железа.', 'Фіолетовий кварц. Колір йому дають крихітні домішки заліза.')],
    ['stalactite', 'm', T('Tropfstein', 'Stalactite', 'Сталактит', 'Сталактит'), T('Tropfsteine wachsen nur etwa einen Zentimeter in hundert Jahren – Tropfen für Tropfen.', 'Stalactites grow only about one centimetre in a hundred years – drop by drop.', 'Сталактиты растут всего примерно на сантиметр за сто лет — капля за каплей.', 'Сталактити ростуть лише приблизно на сантиметр за сто років — крапля за краплею.')],
    ['lighthouse', 'l', T('Leuchtturm', 'Lighthouse', 'Маяк', 'Маяк'), T('Jeder Leuchtturm hat sein eigenes Blinkmuster. So erkennen Seeleute nachts, wo sie sind.', 'Every lighthouse has its own flash pattern, so sailors can tell where they are at night.', 'У каждого маяка свой ритм вспышек — так моряки ночью узнают, где они.', 'Кожен маяк має свій ритм спалахів — так моряки вночі знають, де вони.')],
    ['bridge', 'l', T('Flussbrücke', 'River bridge', 'Мост через реку', 'Міст через річку'), T('Brücken verteilen das Gewicht auf ihre Stützen. Manche römischen Steinbrücken stehen seit 2000 Jahren!', 'Bridges spread the weight onto their supports. Some Roman stone bridges have stood for 2,000 years!', 'Мост распределяет вес на опоры. Некоторые римские каменные мосты стоят уже 2000 лет!', 'Міст розподіляє вагу на опори. Деякі римські кам’яні мости стоять уже 2000 років!')],
    ['well', 'l', T('Dorfbrunnen', 'Village well', 'Колодец', 'Криниця'), T('Ein Brunnen reicht bis zum Grundwasser: Regen, der langsam durch Erde und Gestein gefiltert wurde.', 'A well reaches down to groundwater: rain that was slowly filtered through soil and rock.', 'Колодец доходит до грунтовых вод — дождя, который медленно профильтровался сквозь землю и камни.', 'Криниця сягає ґрунтових вод — дощу, що повільно профільтрувався крізь землю й каміння.')],
    ['tide', 'l', T('Gezeitenpegel', 'Tide gauge', 'Приливная рейка', 'Приливна рейка'), T('Zweimal am Tag steigt und fällt das Meer – der Mond zieht am Wasser der Erde.', 'Twice a day the sea rises and falls – the Moon pulls on the Earth’s water.', 'Дважды в день море поднимается и опускается — его притягивает Луна.', 'Двічі на день море піднімається й опускається — його притягує Місяць.')],
    ['windmill', 'l', T('Windmühle', 'Windmill', 'Ветряная мельница', 'Вітряк'), T('Früher mahlten Windmühlen Korn zu Mehl. Heute machen Windräder aus Wind Strom.', 'Windmills used to grind grain into flour. Today wind turbines turn wind into electricity.', 'Раньше мельницы мололи зерно в муку. Сегодня ветряки делают из ветра электричество.', 'Колись вітряки мололи зерно на борошно. Сьогодні вітрові турбіни виробляють із вітру електрику.')],
    ['waterfall', 'l', T('Quelle & Wasserfall', 'Spring & waterfall', 'Родник и водопад', 'Джерело й водоспад'), T('Regen und Schnee sickern in den Berg und kommen hier als Quelle wieder heraus.', 'Rain and snow seep into the mountain and come out again here as a spring.', 'Дождь и снег просачиваются в гору и выходят здесь родником.', 'Дощ і сніг просочуються в гору й виходять тут джерелом.')]
  ].map(a => ({ id: a[0], c: a[1], n: a[2], f: a[3] }));
  const JMAP = {}; JOURNAL.forEach(j => { JMAP[j.id] = j; });

  const AREAS = {
    beach: T('Hafen & Strand', 'Harbour & Beach', 'Гавань и пляж', 'Гавань і пляж'),
    village: T('Dorf & Markt', 'Village & Market', 'Деревня и рынок', 'Село й ринок'),
    meadow: T('Blumenwiese', 'Flower Meadow', 'Цветочный луг', 'Квіткова лука'),
    river: T('Fluss & Brücke', 'River & Bridge', 'Река и мост', 'Річка й міст'),
    forest: T('Flüsterwald', 'Whispering Forest', 'Шепчущий лес', 'Шепітливий ліс'),
    mountain: T('Bergpfad', 'Mountain Path', 'Горная тропа', 'Гірська стежка'),
    lighthouse: T('Leuchtturm', 'Lighthouse', 'Маяк', 'Маяк'),
    cave: T('Geheime Höhle', 'Hidden Cave', 'Тайная пещера', 'Таємна печера')
  };

  const STR = {
    de: {
      start: 'Los geht’s!', choose: 'Wähle deine Figur', sub: 'Ein Boot bringt dich auf eine kleine Insel voller Geheimnisse.',
      quests: 'Aufgaben', journal: 'Tagebuch', bag: 'Rucksack', active: 'Aktiv', done: 'Erledigt', noQuests: 'Noch keine Aufgaben – sprich mit den Leuten auf der Insel!',
      bagEmpty: 'Dein Rucksack ist leer. Sammle Dinge für deine Aufgaben!', found: '{n} von {t} entdeckt', all: 'Alle', cp: 'Pflanzen', ca: 'Tiere', cm: 'Steine', cl: 'Orte',
      unknown: 'Noch nicht entdeckt – untersuche die Insel!', newDisc: 'Neu im Tagebuch!', known: 'Schon im Tagebuch', questNew: 'Neue Aufgabe: {q}', questDone: 'Aufgabe geschafft!', cont: 'Weiter erkunden',
      aTalk: 'Reden', aTake: 'Nehmen', aLook: 'Ansehen', aPlant: 'Pflanzen', aPhoto: 'Foto', aCut: 'Schneiden', aGo: 'Aktion',
      dark: 'Hier ist es stockdunkel. Ohne Licht finde ich nichts … Vielleicht hat jemand eine Laterne?',
      vines: 'Dichte, stachelige Ranken an der Felswand. Dahinter weht ein kühler Luftzug …', vinesCut: 'Du schneidest die Ranken mit der Gartenschere frei – ein Höhleneingang!', needShears: 'Die Ranken sind zu zäh. Ich bräuchte etwas Scharfes …',
      bridgeBroken: 'Die Brücke ist kaputt – hier komme ich nicht über den Fluss.', soil: 'Ein frisch vorbereitetes Erdbeet.', planted: 'Setzling gepflanzt!', photo: 'Klick! Foto: {a}', got: '+ {i}',
      storyT: 'Der Leuchtturm strahlt!', story1: 'Du hast der ganzen Insel geholfen.', story2: 'Die Schiffe finden wieder sicher in den Hafen.',
      journalT: 'Tagebuch komplett!', journalL: 'Alle {t} Entdeckungen gefunden – großartig!', milestone: '{n} Entdeckungen!',
      newGame: 'Neues Spiel', confirmReset: 'Wirklich von vorn beginnen? Dein Fortschritt geht verloren.', welcomeBack: 'Willkommen zurück!', rulesT: 'Insel der Entdeckungen',
      oWelcome: 'Sprich mit Tomek im Dorf', oPlanks: 'Bretter sammeln: {n}/4', oPlanksBack: 'Bring die Bretter zu Tomek', oPlastic: 'Plastik sammeln: {n}/6', oPlasticBack: 'Bring das Plastik zu Fynn',
      oGlasses: 'Finde Rosas Brille auf der Wiese', oGlassesBack: 'Bring Rosa ihre Brille', oRecipe: 'Zutaten: {list}', oRecipeBack: 'Bring die Zutaten zu Rosa',
      oTrees: 'Setzlinge pflanzen: {n}/4', oTreesBack: 'Erzähl Ida davon', oHog: 'Hol Idas Gartenschere für Pikko', oHogBack: 'Befreie Pikko im Wald',
      oPhotos: 'Tierfotos: {n}/5', oPhotosBack: 'Zeig Kai die Fotos', oDelivery: 'Bring den Korb zu Lotta am Bergpfad', oRocks: 'Gesteinsproben: {n}/3', oRocksBack: 'Bring die Proben zu Lotta',
      oVines: 'Finde die Ranken am Berg', oLantern: 'Besorge dir eine Laterne', oLens: 'Finde die Kristall-Linse in der Höhle', oLamp: 'Lampenteile: {n}/3', oLampBack: 'Bring die Teile zu Hanno',
      rules: `<ul><li><b>Ziel:</b> Hilf den Menschen (und Tieren) der Insel und bring den Leuchtturm wieder zum Leuchten.</li>
        <li><b>Laufen:</b> WASD oder Pfeiltasten – oder auf der linken Bildhälfte drücken und ziehen (Joystick). Tippen lässt dich zu einem Ort laufen.</li>
        <li><b>Handeln:</b> E, Leertaste oder der runde Knopf rechts: reden, aufheben, untersuchen. Ein „!“ zeigt, wo es etwas zu tun gibt.</li>
        <li><b>Tagebuch:</b> Untersuche Pflanzen, Tiere, Steine und Orte – 36 echte Naturfakten warten auf dich.</li>
        <li><b>Tasten:</b> Q Aufgaben · J Tagebuch · I Rucksack · M Minikarte.</li>
        <li><b>Sterne:</b> Jede Aufgabe 5–10 ⭐, die Hauptgeschichte 40 ⭐, das volle Tagebuch 20 ⭐. Alles wird automatisch gespeichert.</li></ul>`
    },
    en: {
      start: 'Let’s go!', choose: 'Choose your explorer', sub: 'A boat takes you to a small island full of secrets.',
      quests: 'Quests', journal: 'Journal', bag: 'Backpack', active: 'Active', done: 'Done', noQuests: 'No quests yet – talk to the people on the island!',
      bagEmpty: 'Your backpack is empty. Collect things for your quests!', found: '{n} of {t} discovered', all: 'All', cp: 'Plants', ca: 'Animals', cm: 'Rocks', cl: 'Places',
      unknown: 'Not discovered yet – explore the island!', newDisc: 'New in your journal!', known: 'Already in your journal', questNew: 'New quest: {q}', questDone: 'Quest complete!', cont: 'Keep exploring',
      aTalk: 'Talk', aTake: 'Take', aLook: 'Look', aPlant: 'Plant', aPhoto: 'Photo', aCut: 'Cut', aGo: 'Action',
      dark: 'It’s pitch-dark in here. I can’t find anything without a light … Maybe someone has a lantern?',
      vines: 'Thick, thorny vines on the rock face. A cool draught blows from behind them …', vinesCut: 'You cut the vines away with the garden shears – a cave entrance!', needShears: 'The vines are too tough. I’d need something sharp …',
      bridgeBroken: 'The bridge is broken – I can’t cross the river here.', soil: 'A freshly prepared soil bed.', planted: 'Seedling planted!', photo: 'Click! Photo: {a}', got: '+ {i}',
      storyT: 'The lighthouse shines!', story1: 'You helped the whole island.', story2: 'Ships can find the harbour safely again.',
      journalT: 'Journal complete!', journalL: 'All {t} discoveries found – amazing!', milestone: '{n} discoveries!',
      newGame: 'New game', confirmReset: 'Really start over? Your progress will be lost.', welcomeBack: 'Welcome back!', rulesT: 'Island of Discoveries',
      oWelcome: 'Talk to Tomek in the village', oPlanks: 'Collect planks: {n}/4', oPlanksBack: 'Bring the planks to Tomek', oPlastic: 'Collect plastic: {n}/6', oPlasticBack: 'Bring the plastic to Fynn',
      oGlasses: 'Find Rosa’s glasses in the meadow', oGlassesBack: 'Bring Rosa her glasses', oRecipe: 'Ingredients: {list}', oRecipeBack: 'Bring the ingredients to Rosa',
      oTrees: 'Plant seedlings: {n}/4', oTreesBack: 'Tell Ida about it', oHog: 'Get Ida’s garden shears for Pikko', oHogBack: 'Free Pikko in the forest',
      oPhotos: 'Animal photos: {n}/5', oPhotosBack: 'Show Kai the photos', oDelivery: 'Take the basket to Lotta on the mountain path', oRocks: 'Rock samples: {n}/3', oRocksBack: 'Bring the samples to Lotta',
      oVines: 'Find the vines on the mountain', oLantern: 'Get a lantern', oLens: 'Find the crystal lens in the cave', oLamp: 'Lamp parts: {n}/3', oLampBack: 'Bring the parts to Hanno',
      rules: `<ul><li><b>Goal:</b> Help the island’s people (and animals) and make the lighthouse shine again.</li>
        <li><b>Walk:</b> WASD or arrow keys – or press and drag on the left half of the screen (joystick). Tap somewhere to walk there.</li>
        <li><b>Act:</b> E, Space or the round button on the right: talk, pick up, inspect. A “!” shows where there’s something to do.</li>
        <li><b>Journal:</b> Inspect plants, animals, rocks and places – 36 real nature facts are waiting for you.</li>
        <li><b>Keys:</b> Q quests · J journal · I backpack · M minimap.</li>
        <li><b>Stars:</b> Each quest 5–10 ⭐, the main story 40 ⭐, the full journal 20 ⭐. Everything is saved automatically.</li></ul>`
    },
    ru: {
      start: 'Вперёд!', choose: 'Выбери героя', sub: 'Лодка привозит тебя на маленький остров, полный тайн.',
      quests: 'Задания', journal: 'Дневник', bag: 'Рюкзак', active: 'Активные', done: 'Выполнено', noQuests: 'Пока нет заданий — поговори с жителями острова!',
      bagEmpty: 'Рюкзак пуст. Собирай вещи для заданий!', found: 'Открыто: {n} из {t}', all: 'Все', cp: 'Растения', ca: 'Животные', cm: 'Камни', cl: 'Места',
      unknown: 'Ещё не открыто — исследуй остров!', newDisc: 'Новое в дневнике!', known: 'Уже есть в дневнике', questNew: 'Новое задание: {q}', questDone: 'Задание выполнено!', cont: 'Исследовать дальше',
      aTalk: 'Говорить', aTake: 'Взять', aLook: 'Осмотреть', aPlant: 'Посадить', aPhoto: 'Фото', aCut: 'Срезать', aGo: 'Действие',
      dark: 'Здесь кромешная тьма. Без света ничего не найти… Может, у кого-то есть фонарь?',
      vines: 'Густые колючие лианы на скале. Из-за них тянет прохладой…', vinesCut: 'Ты срезаешь лианы садовыми ножницами — вход в пещеру!', needShears: 'Лианы слишком прочные. Нужно что-то острое…',
      bridgeBroken: 'Мост сломан — здесь через реку не перейти.', soil: 'Свежевскопанная грядка.', planted: 'Саженец посажен!', photo: 'Щёлк! Фото: {a}', got: '+ {i}',
      storyT: 'Маяк сияет!', story1: 'Благодаря тебе весь остров снова в порядке.', story2: 'Корабли снова благополучно находят гавань.',
      journalT: 'Дневник заполнен!', journalL: 'Найдены все открытия ({t}) — потрясающе!', milestone: 'Открытий: {n}!',
      newGame: 'Новая игра', confirmReset: 'Точно начать сначала? Прогресс будет потерян.', welcomeBack: 'С возвращением!', rulesT: 'Остров открытий',
      oWelcome: 'Поговори с Томеком в деревне', oPlanks: 'Собери доски: {n}/4', oPlanksBack: 'Отнеси доски Томеку', oPlastic: 'Собери пластик: {n}/6', oPlasticBack: 'Отнеси пластик Финну',
      oGlasses: 'Найди очки Розы на лугу', oGlassesBack: 'Верни Розе очки', oRecipe: 'Ингредиенты: {list}', oRecipeBack: 'Отнеси ингредиенты Розе',
      oTrees: 'Посади саженцы: {n}/4', oTreesBack: 'Расскажи об этом Иде', oHog: 'Возьми у Иды садовые ножницы для Пикко', oHogBack: 'Освободи Пикко в лесу',
      oPhotos: 'Фото животных: {n}/5', oPhotosBack: 'Покажи фото Каю', oDelivery: 'Отнеси корзину Лотте на горную тропу', oRocks: 'Образцы камней: {n}/3', oRocksBack: 'Отнеси образцы Лотте',
      oVines: 'Найди лианы на горе', oLantern: 'Раздобудь фонарь', oLens: 'Найди хрустальную линзу в пещере', oLamp: 'Детали лампы: {n}/3', oLampBack: 'Отнеси детали Ханно',
      rules: `<ul><li><b>Цель:</b> помоги жителям острова (и животным) и снова зажги маяк.</li>
        <li><b>Ходьба:</b> WASD или стрелки — или нажми и тяни на левой половине экрана (джойстик). Касание — идти к месту.</li>
        <li><b>Действие:</b> E, пробел или круглая кнопка справа: говорить, брать, осматривать. «!» показывает, где есть дело.</li>
        <li><b>Дневник:</b> осматривай растения, животных, камни и места — тебя ждут 36 настоящих фактов о природе.</li>
        <li><b>Клавиши:</b> Q задания · J дневник · I рюкзак · M мини-карта.</li>
        <li><b>Звёзды:</b> каждое задание 5–10 ⭐, главная история 40 ⭐, полный дневник 20 ⭐. Всё сохраняется автоматически.</li></ul>`
    },
    uk: {
      start: 'Уперед!', choose: 'Обери героя', sub: 'Човен привозить тебе на маленький острів, повний таємниць.',
      quests: 'Завдання', journal: 'Щоденник', bag: 'Рюкзак', active: 'Активні', done: 'Виконано', noQuests: 'Поки немає завдань — поговори з мешканцями острова!',
      bagEmpty: 'Рюкзак порожній. Збирай речі для завдань!', found: 'Відкрито: {n} з {t}', all: 'Усі', cp: 'Рослини', ca: 'Тварини', cm: 'Каміння', cl: 'Місця',
      unknown: 'Ще не відкрито — досліджуй острів!', newDisc: 'Нове в щоденнику!', known: 'Уже є в щоденнику', questNew: 'Нове завдання: {q}', questDone: 'Завдання виконано!', cont: 'Досліджувати далі',
      aTalk: 'Говорити', aTake: 'Взяти', aLook: 'Оглянути', aPlant: 'Посадити', aPhoto: 'Фото', aCut: 'Зрізати', aGo: 'Дія',
      dark: 'Тут непроглядна темрява. Без світла нічого не знайти… Може, в когось є ліхтар?',
      vines: 'Густі колючі ліани на скелі. З-за них тягне прохолодою…', vinesCut: 'Ти зрізаєш ліани садовими ножицями — вхід до печери!', needShears: 'Ліани надто міцні. Потрібно щось гостре…',
      bridgeBroken: 'Міст зламаний — тут через річку не перейти.', soil: 'Свіжоскопана грядка.', planted: 'Саджанець посаджено!', photo: 'Клац! Фото: {a}', got: '+ {i}',
      storyT: 'Маяк сяє!', story1: 'Завдяки тобі весь острів знову в порядку.', story2: 'Кораблі знову щасливо знаходять гавань.',
      journalT: 'Щоденник заповнено!', journalL: 'Знайдено всі відкриття ({t}) — неймовірно!', milestone: 'Відкриттів: {n}!',
      newGame: 'Нова гра', confirmReset: 'Справді почати спочатку? Прогрес буде втрачено.', welcomeBack: 'З поверненням!', rulesT: 'Острів відкриттів',
      oWelcome: 'Поговори з Томеком у селі', oPlanks: 'Збери дошки: {n}/4', oPlanksBack: 'Віднеси дошки Томекові', oPlastic: 'Збери пластик: {n}/6', oPlasticBack: 'Віднеси пластик Фінну',
      oGlasses: 'Знайди окуляри Рози на луці', oGlassesBack: 'Поверни Розі окуляри', oRecipe: 'Інгредієнти: {list}', oRecipeBack: 'Віднеси інгредієнти Розі',
      oTrees: 'Посади саджанці: {n}/4', oTreesBack: 'Розкажи про це Іді', oHog: 'Візьми в Іди садові ножиці для Пікко', oHogBack: 'Звільни Пікко в лісі',
      oPhotos: 'Фото тварин: {n}/5', oPhotosBack: 'Покажи фото Каю', oDelivery: 'Віднеси кошик Лотті на гірську стежку', oRocks: 'Зразки каменів: {n}/3', oRocksBack: 'Віднеси зразки Лотті',
      oVines: 'Знайди ліани на горі', oLantern: 'Здобудь ліхтар', oLens: 'Знайди кришталеву лінзу в печері', oLamp: 'Деталі лампи: {n}/3', oLampBack: 'Віднеси деталі Ганно',
      rules: `<ul><li><b>Мета:</b> допоможи мешканцям острова (і тваринам) та знову запали маяк.</li>
        <li><b>Ходьба:</b> WASD або стрілки — або натисни й тягни на лівій половині екрана (джойстик). Дотик — іти до місця.</li>
        <li><b>Дія:</b> E, пробіл або кругла кнопка праворуч: говорити, брати, оглядати. «!» показує, де є справа.</li>
        <li><b>Щоденник:</b> оглядай рослини, тварин, каміння й місця — на тебе чекають 36 справжніх фактів про природу.</li>
        <li><b>Клавіші:</b> Q завдання · J щоденник · I рюкзак · M мінікарта.</li>
        <li><b>Зірки:</b> кожне завдання 5–10 ⭐, головна історія 40 ⭐, повний щоденник 20 ⭐. Усе зберігається автоматично.</li></ul>`
    }
  };


  /* =====================================================================================
     World: noise, island shape, tiles, objects, colliders (all deterministic)
     ===================================================================================== */
  function hash(x, y, s) {
    let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y) => vnoise(x / 3.2, y / 3.2, 1) * 0.62 + vnoise(x / 1.4, y / 1.4, 2) * 0.38;
  function segD2(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + dx * t - px, ey = ay + dy * t - py; return ex * ex + ey * ey;
  }
  function polyD(px, py, pts) { let m = 1e9; for (let i = 1; i < pts.length; i++) { const d = segD2(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); if (d < m) m = d; } return Math.sqrt(m); }
  const ell = (x, y, cx, cy, rx, ry) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return Math.sqrt(dx * dx + dy * dy); };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  const ISLAND = [[24, 30, 19, 21], [37, 9.5, 8, 6.5], [24, 46, 15, 5.5], [9, 36, 7.5, 8.5], [13, 15, 9, 8]];
  function islandF(x, y) { let m = -9; for (const e of ISLAND) { const v = 1 - ell(x, y, e[0], e[1], e[2], e[3]); if (v > m) m = v; } return m + (fbm(x, y) - 0.5) * 0.16; }
  const RIVER = [[36.8, 21.6], [33, 24.2], [30, 26.6], [27, 28], [24, 28.6], [20, 28.4], [16, 28], [12, 29.2], [8, 30.4], [4, 31], [-1, 31.2]];
  const POND = [36.8, 21.4, 1.8];
  const RIDGES = [
    [[36.8, 21.4], [39, 22.4], [42, 23.3], [47, 24.4]],
    [[25.4, 12.4], [27.2, 13.3], [28.5, 13.6]],
    [[31.4, 13.6], [32.2, 13.2], [33.4, 12.2]],
    [[35.4, 19.3], [36.7, 19.5], [38.5, 20.1]]
  ];
  const PATHS = [
    [[24.1, 50.6], [24, 47.5], [23.5, 44.5], [24, 41.8]],
    [[24, 35.3], [24.3, 32.6], [24.1, 30.9]],
    [[24.1, 26.4], [24.3, 24.6], [24.8, 22.8]],
    [[24.8, 22.8], [21, 21.4], [17.6, 19], [14.2, 17], [11.2, 15]],
    [[24.8, 22.8], [28, 21.6], [31, 20.2], [33, 18.6], [33.6, 16.4], [35, 13.9], [36.4, 11.6], [37.4, 10]],
    [[31, 20.2], [30.2, 17.4], [29.6, 14.6]],
    [[20.5, 38.6], [17, 38.4], [13.6, 37.6], [10.6, 36.6]],
    [[27.5, 38.8], [31, 39], [33.6, 38.6], [34.8, 38]],
    [[14, 37.7], [14.6, 34.4], [14.3, 32.6]]
  ];
  const PLAZA = [24, 38.6, 3.7];
  const CAVE_PATHS = [[[56, 24.5], [56, 19], [54, 16.5], [52.6, 13.6], [53.4, 10.6], [55.8, 8.6], [57.6, 6]], [[54, 16.5], [56.5, 15.6], [58.6, 15]]];
  const CAVE_ROOMS = [[52, 11, 2.5], [57.6, 4.8, 2.7], [58.8, 15.2, 2.3], [56, 21.5, 2.0]];
  const CAVE_POOL = [59.7, 15.9, 1.1];
  const BRIDGE = { x0: 23.3, x1: 24.9, y0: 26.4, y1: 30.8 };
  const DOCK = { x0: 23.3, x1: 24.9, y0: 50.2, y1: 54.9 };

  const TL = { DEEP: 0, SHAL: 1, SAND: 2, GRASS: 3, FOREST: 4, MEADOW: 5, ROCK: 6, RIVER: 7, CAVE: 8, VOID: 9, COBBLE: 10, CLIFF: 11, POOL: 12 };
  const SOLID = [1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1];
  const inMount = (x, y) => (ell(x, y, 35, 14.5, 10.5, 9.5) < 1 && y < 23.6) || ell(x, y, 37, 9.5, 8, 6.5) < 1.05;
  const inForest = (x, y) => ell(x, y, 13, 15, 10.5, 9.5) < 1;
  const inMeadow = (x, y) => ell(x, y, 9.5, 37, 7.5, 7.5) < 1;

  function classify(tx, ty) {
    const x = tx + 0.5, y = ty + 0.5;
    if (tx > ISW) {
      for (const p of CAVE_PATHS) if (polyD(x, y, p) < 1.45) return dist(x, y, CAVE_POOL[0], CAVE_POOL[1]) < CAVE_POOL[2] ? TL.POOL : TL.CAVE;
      for (const r of CAVE_ROOMS) if (dist(x, y, r[0], r[1]) < r[2]) return dist(x, y, CAVE_POOL[0], CAVE_POOL[1]) < CAVE_POOL[2] ? TL.POOL : TL.CAVE;
      return TL.VOID;
    }
    if (tx === ISW) return TL.DEEP;
    const f = islandF(x, y);
    if (f < 0) return f > -0.075 ? TL.SHAL : TL.DEEP;
    if (polyD(x, y, RIVER) < 1.15 || dist(x, y, POND[0], POND[1]) < POND[2]) return TL.RIVER;
    for (const r of RIDGES) if (polyD(x, y, r) < 0.85) return TL.CLIFF;
    if (dist(x, y, PLAZA[0], PLAZA[1]) < PLAZA[2]) return TL.COBBLE;
    const mount = inMount(x, y);
    if (mount && dist(x, y, 37, 8.6) < 3.2) return TL.GRASS;
    if (f < 0.06 || y > 44.2 + (fbm(x * 2, y * 2) - 0.5) * 2) return mount ? TL.ROCK : TL.SAND;
    if (mount) return TL.ROCK;
    if (inForest(x, y)) return TL.FOREST;
    if (inMeadow(x, y)) return TL.MEADOW;
    return TL.GRASS;
  }

  // NPC placements (tiles) and looks. Looks: skin, hair, style, shirt, pants, hat, hatC, extras.
  const NPCS = [
    { id: 'marla', x: 25.7, y: 50.4, look: { skin: '#f0c4a0', hair: '#cfc8bd', hs: 'bun', shirt: '#28406e', pants: '#22314f', hat: 'captain', ex: ['coat', 'scarf'], scarf: '#e0493f' } },
    { id: 'tomek', x: 28.1, y: 36.9, look: { skin: '#e8b48e', hair: '#b5562c', hs: 'short', shirt: '#c4473a', pants: '#4b4036', ex: ['beard', 'apron'], apron: '#8b5e3c' } },
    { id: 'fynn', x: 30.3, y: 48.1, look: { skin: '#e0a782', hair: '#7a5a3a', hs: 'short', shirt: '#f1b72f', pants: '#2f4058', hat: 'beanie', hatC: '#e2683a', ex: ['beard'] } },
    { id: 'rosa', x: 20.7, y: 36.9, look: { skin: '#f3cfb1', hair: '#ece8e2', hs: 'bun', shirt: '#e98fb0', pants: '#6b4f6e', ex: ['apron'], apron: '#ffffff' } },
    { id: 'mira', x: 28.2, y: 41.0, look: { skin: '#c58c5c', hair: '#3a2418', hs: 'long', shirt: '#3fae6a', pants: '#5b3a6e', hat: 'scarf', hatC: '#d6457d', ex: ['apron'], apron: '#f6e7c8' } },
    { id: 'ida', x: 11.2, y: 34.3, look: { skin: '#f1c7a3', hair: '#8c5a2b', hs: 'long', shirt: '#9bd06a', pants: '#4f7f3a', hat: 'straw', ex: ['overalls'] } },
    { id: 'kai', x: 25.9, y: 32.1, kid: true, look: { skin: '#a8714c', hair: '#20160f', hs: 'short', shirt: '#3b82f6', pants: '#334155', hat: 'cap', hatC: '#1e3a8a', ex: ['camera'] } },
    { id: 'pikko', x: 9.8, y: 13.9, animal: 'hedgehog' },
    { id: 'lotta', x: 29.2, y: 18.9, look: { skin: '#f5d0b0', hair: '#e3b347', hs: 'long', shirt: '#a3946a', pants: '#5a5240', hat: 'goggles', ex: ['backpack'] } },
    { id: 'hanno', x: 36.8, y: 9.7, look: { skin: '#eab894', hair: '#f2f2f2', hs: 'bald', shirt: '#1f3a63', pants: '#2a2f3d', hat: 'knit', hatC: '#334d7a', ex: ['beard'], beard: '#f4f4f4' } }
  ];
  const AVATARS = [
    { id: 'juna', n: 'Juna', look: { skin: '#c98e64', hair: '#2b1d16', hs: 'long', shirt: '#2fb3a3', pants: '#3d4f7a', hat: 'explorer', ex: ['backpack'] } },
    { id: 'nilo', n: 'Nilo', look: { skin: '#f2c9a5', hair: '#d9883b', hs: 'short', shirt: '#f2c230', pants: '#2f3b52', hat: 'cap', hatC: '#e2504c', ex: ['backpack'] } },
    { id: 'sami', n: 'Sami', look: { skin: '#8a5a3c', hair: '#1b1310', hs: 'curly', shirt: '#7d5bd6', pants: '#36414f', ex: ['backpack', 'band'] } }
  ];

  // Pickups: id, item, x, y (tiles)
  const PICKUPS = [
    ['plank1', 'plank', 35.5, 46.2], ['plank2', 'plank', 13.6, 46.4], ['plank3', 'plank', 7.4, 41.4], ['plank4', 'plank', 20.6, 44.0],
    ['plastic1', 'plastic', 20.0, 48.6], ['plastic2', 'plastic', 27.6, 49.4], ['plastic3', 'plastic', 33.4, 48.8], ['plastic4', 'plastic', 16.6, 47.0], ['plastic5', 'plastic', 35.2, 47.4], ['plastic6', 'plastic', 29.0, 45.5],
    ['glasses', 'glasses', 6.9, 33.8], ['lens', 'lens', 57.6, 4.5]
  ].map(a => ({ id: a[0], item: a[1], x: a[2] * TS, y: a[3] * TS }));

  // Discovery spots: id, x, y (tiles), world look, extra. Animals use their live entity position.
  const DSPOTS = [
    ['marram', 18, 45.2, 'icon'], ['buckthorn', 32.6, 44.3, 'bushB'], ['oak', 19.2, 16.8, 'oak'], ['fern', 6.9, 15.8, 'icon'], ['flyagaric', 12.8, 19.6, 'icon'],
    ['bilberry', 16.6, 12.0, 'icon', { give: 'berries', q: 'recipe' }], ['sunflower', 12.6, 40.9, 'icon'], ['dandelion', 8.4, 35.3, 'icon'], ['lavender', 10.8, 42.0, 'icon'],
    ['waterlily', 19.0, 30.0, 'none'], ['edelweiss', 34.8, 12.6, 'icon'], ['mint', 10.4, 30.9, 'icon', { give: 'mint', q: 'recipe' }],
    ['crab', 0, 0, 'animal', { photo: 1 }], ['seal', 0, 0, 'animal', { photo: 1 }], ['gull', 0, 0, 'animal'], ['trout', 21.6, 30.2, 'none'], ['heron', 0, 0, 'animal', { photo: 1 }],
    ['deer', 0, 0, 'animal', { photo: 1 }], ['fox', 0, 0, 'animal', { photo: 1 }], ['bee', 6.8, 41.0, 'none', { give: 'honey', q: 'recipe' }], ['butterfly', 7.6, 38.0, 'bushF'],
    ['owl', 0, 0, 'animal'], ['bat', 0, 0, 'animal', { dark: 1 }], ['glowworm', 59.0, 13.7, 'none'],
    ['quartz', 34.6, 44.7, 'icon', { give: 'quartz', q: 'rocks' }], ['amber', 11.8, 46.6, 'icon'], ['basalt', 36.0, 17.2, 'basalt', { give: 'basalt', q: 'rocks' }],
    ['amethyst', 51.3, 10.4, 'icon', { give: 'amethyst', q: 'rocks', dark: 1 }], ['stalactite', 54.7, 13.9, 'none', { dark: 1 }],
    ['lighthouse', 38.6, 8.7, 'none'], ['bridge', 23.0, 31.3, 'none'], ['well', 24.0, 39.4, 'none'], ['tide', 25.15, 51.5, 'none'], ['windmill', 35.0, 38.3, 'none'], ['waterfall', 35.1, 20.9, 'none']
  ].map(a => Object.assign({ id: a[0], x: a[1] * TS, y: a[2] * TS, look: a[3] }, a[4] || {}));

  const SOIL = [[12.6, 31.7], [14.4, 31.3], [16.2, 31.8], [13.6, 33.0]];
  const PHOTO_ANIMALS = ['crab', 'seal', 'heron', 'fox', 'deer'];
  const ANIMALS_DEF = [
    { k: 'crab', x: 28, y: 49.3, r: 2.4, sp: 34 }, { k: 'crab', x: 17.5, y: 48.2, r: 1.8, sp: 30, extra: 1 },
    { k: 'seal', x: 36.8, y: 45.5, r: 0 }, { k: 'heron', x: 15.5, y: 30.1, r: 1.0, sp: 10 },
    { k: 'deer', x: 14, y: 12.8, r: 3.2, sp: 30 }, { k: 'fox', x: 10.6, y: 38.6, r: 3, sp: 42 },
    { k: 'gull', x: 23.4, y: 54.6, r: 0 }, { k: 'owl', x: 15.8, y: 10.75, r: 0 }, { k: 'bat', x: 53.2, y: 8.4, r: 0 }
  ];

  const AREA_POS = { beach: [24, 48.6], harbour: [24.1, 53.4], village: [24, 41.2], market: [26.6, 41.6], meadow: [10.5, 38.6], river: [24.2, 32.2], bridge: [24.1, 31.6], forest: [11.6, 16.2], mountain: [31.5, 20.6], lighthouse: [37, 10.6], cave: [56, 21.4] };

  // Fixed objects: kind, x, y (tiles), variant
  const FIXED = [
    ['house', 19, 35.6, 0], ['house', 29.6, 35.6, 1], ['house', 18.4, 42.5, 2], ['house', 30.2, 42.7, 3],
    ['stall', 26.6, 40.3, 0], ['stall', 21.5, 40.3, 1], ['well', 24, 38.7, 0],
    ['lantern', 21.2, 36.4], ['lantern', 26.8, 36.4], ['lantern', 22.2, 42.2], ['lantern', 25.8, 42.2], ['lantern', 25.15, 49.9], ['lantern', 23.0, 32.0], ['lantern', 37.9, 11.6], ['lantern', 30.4, 21.5],
    ['windmill', 35, 37.6, 0], ['shack', 32, 47.0, 0], ['boat', 26.25, 53.9, 0], ['crate', 26.6, 49.7], ['barrel', 27.2, 49.4], ['crate', 33.6, 47.5], ['barrel', 30.6, 46.5],
    ['lighthouse', 38.6, 7.5, 0], ['cottage', 35, 7.9, 0], ['tent', 27.6, 19.2, 0], ['campfire', 28.2, 20.0, 0], ['beehive', 6.2, 40.4, 0],
    ['caveMouth', 29.6, 13.75, 0], ['sign', 25.8, 23.8, 0], ['garden', 12.6, 35.6, 0], ['tide', 25.15, 51.1, 0], ['bench', 22.2, 37.0, 0],
    ['oak', 19.2, 16.4, 0], ['tree', 15.8, 10.6, 2], ['bushB', 32.6, 44.0, 0], ['bushF', 7.6, 37.7, 0], ['basalt', 36.0, 16.9, 0],
    ['pedestal', 57.6, 4.6, 0]
  ];

  // Exclusion zones for random scatter (tiles): x, y, r
  const KEEP = [[10, 14, 2.6], [28.5, 19.5, 2.4], [37, 8.6, 3.6], [24, 38.6, 6.8], [24, 50, 3.2], [12.4, 35.3, 2.6], [14.4, 32, 2.8], [24, 28.6, 3.2], [35, 37.6, 2], [32, 47, 2.4], [29.6, 14.6, 2.6], [6.4, 40.4, 1.6], [24.8, 22.8, 2]];

  let WORLD = null;
  function buildWorld() {
    if (WORLD) return WORLD;
    const tiles = new Uint8Array(MW * MH), pathM = new Uint8Array(MW * MH);
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const t = classify(tx, ty); tiles[ty * MW + tx] = t;
      if (tx < ISW && !SOLID[t]) { const x = tx + .5, y = ty + .5; for (const p of PATHS) if (polyD(x, y, p) < 0.8) { pathM[ty * MW + tx] = 1; break; } if (dist(x, y, PLAZA[0], PLAZA[1]) < PLAZA[2]) pathM[ty * MW + tx] = 2; }
    }
    const tAt = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx < 0 || ty < 0 || tx >= MW || ty >= MH ? TL.DEEP : tiles[ty * MW + tx]; };
    const nearPath = (x, y, r) => { for (const p of PATHS) if (polyD(x, y, p) < r) return true; return dist(x, y, PLAZA[0], PLAZA[1]) < PLAZA[2] + r - .6; };
    const pois = [].concat(NPCS.map(n => [n.x, n.y]), PICKUPS.map(p => [p.x / TS, p.y / TS]), DSPOTS.filter(d => d.look !== 'animal').map(d => [d.x / TS, d.y / TS]), SOIL, ANIMALS_DEF.map(a => [a.x, a.y]));
    const nearKeep = (x, y, r) => { for (const k of KEEP) if (dist(x, y, k[0], k[1]) < k[2]) return true; for (const p of pois) if (dist(x, y, p[0], p[1]) < r) return true; return false; };
    const objs = [], tufts = [], reeds = [];
    const add = (k, x, y, v) => { const o = { k, x: x * TS, y: y * TS, v: v || 0, seed: hash(x * 97 | 0, y * 89 | 0, 5) }; objs.push(o); return o; };
    FIXED.forEach(f => add(f[0], f[1], f[2], f[3]));
    const rnd = Kit.rng(20261127);
    // forest
    for (let y = 5.6; y < 25; y += 1.15) for (let x = 2; x < 25; x += 1.15) {
      const px = x + (rnd() - .5) * .9, py = y + (rnd() - .5) * .9, r = rnd();
      if (tAt(px, py) !== TL.FOREST || r < .16 || nearPath(px, py, 1.45) || nearKeep(px, py, 1.4)) continue;
      add(r < .58 ? 'pine' : 'tree', px, py, (rnd() * 3) | 0);
    }
    // open grass: scattered trees and bushes
    for (let y = 18; y < 46; y += 2.3) for (let x = 3; x < 46; x += 2.3) {
      const px = x + (rnd() - .5) * 1.6, py = y + (rnd() - .5) * 1.6, r = rnd(), t = tAt(px, py);
      if ((t !== TL.GRASS && t !== TL.MEADOW) || nearPath(px, py, 1.3) || nearKeep(px, py, 1.5)) continue;
      if (r < .30) add(t === TL.MEADOW || rnd() < .3 ? 'tree' : 'tree', px, py, t === TL.MEADOW ? 3 : (rnd() * 3) | 0);
      else if (r < .48) add('bush', px, py, (rnd() * 3) | 0);
      else if (r < .62 && t === TL.MEADOW) add('flowers', px, py, (rnd() * 4) | 0);
    }
    // mountain: pines and boulders
    for (let y = 3; y < 24; y += 2.1) for (let x = 24; x < 46; x += 2.1) {
      const px = x + (rnd() - .5) * 1.4, py = y + (rnd() - .5) * 1.4, r = rnd(), t = tAt(px, py);
      if (t !== TL.ROCK || nearPath(px, py, 1.35) || nearKeep(px, py, 1.5)) continue;
      if (r < .3) add('pine', px, py, 2); else if (r < .62) add('rock', px, py, (rnd() * 3) | 0);
    }
    // ridges become boulder walls (tiles are already solid)
    RIDGES.forEach(rd => { for (let i = 1; i < rd.length; i++) { const a = rd[i - 1], b = rd[i], n = Math.ceil(dist(a[0], a[1], b[0], b[1]) / .7); for (let j = 0; j <= n; j++) { const px = a[0] + (b[0] - a[0]) * j / n, py = a[1] + (b[1] - a[1]) * j / n; const t = tAt(px, py); if (t === TL.DEEP || t === TL.SHAL || t === TL.RIVER) continue; add('cliff', px + (rnd() - .5) * .25, py + (rnd() - .5) * .2, (rnd() * 3) | 0); } } });
    // beach palms and dune grass
    for (let x = 11; x < 38; x += 2.6) { const px = x + (rnd() - .5) * 1.2, py = 44.2 + rnd() * 1.1; if (tAt(px, py) === TL.SAND && !nearPath(px, py, 1.4) && !nearKeep(px, py, 1.5) && rnd() < .62) add('palm', px, py, (rnd() * 2) | 0); }
    // cave: stalagmites along walls and glowing crystals
    for (let ty = 1; ty < 25; ty++) for (let tx = ISW + 1; tx < MW; tx++) {
      if (tiles[ty * MW + tx] !== TL.CAVE) continue;
      let nx = 0, ny = 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { if (tiles[(ty + d[1]) * MW + tx + d[0]] === TL.VOID) { nx += d[0]; ny += d[1]; } });
      if (!nx && !ny) continue; const r = rnd(); const px = tx + .5 + nx * .32, py = ty + .5 + ny * .32;
      if (nearKeep(px, py, 1.2) || dist(px, py, 56, 23) < 2.2) continue;
      if (r < .2) add('stalag', px, py, (rnd() * 3) | 0); else if (r < .34) add('crystal', px, py, (rnd() * 2) | 0);
    }
    [[57.6, 2.6, 0], [59.6, 4.2, 1], [55.6, 3.6, 0], [50.4, 10.0, 0], [53.3, 11.8, 1], [60.4, 14.6, 1]].forEach(c => add('crystal', c[0], c[1], c[2]));
    // grass tufts (sway) and riverside reeds
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < ISW; tx++) {
      const t = tiles[ty * MW + tx]; if (t !== TL.GRASS && t !== TL.MEADOW && t !== TL.FOREST && t !== TL.SAND) continue;
      if (pathM[ty * MW + tx]) continue;
      const h = hash(tx, ty, 9); if (h > (t === TL.SAND ? .12 : .55)) continue;
      tufts.push({ x: (tx + .2 + hash(tx, ty, 10) * .6) * TS, y: (ty + .2 + hash(tx, ty, 11) * .6) * TS, c: t, s: .8 + hash(tx, ty, 12) * .5, p: h * 40 });
    }
    for (let i = 1; i < RIVER.length; i++) { const a = RIVER[i - 1], b = RIVER[i], n = Math.ceil(dist(a[0], a[1], b[0], b[1]) / .9); const L = dist(a[0], a[1], b[0], b[1]); const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      for (let j = 0; j < n; j++) for (const sd of [-1, 1]) { if (rnd() > .45) continue; const px = a[0] + (b[0] - a[0]) * j / n + nx * sd * 1.42, py = a[1] + (b[1] - a[1]) * j / n + ny * sd * 1.42; if (Math.abs(px - 24.1) < 2.4 || px < 4) continue; const t = tAt(px, py); if (SOLID[t]) continue; reeds.push({ x: px * TS, y: py * TS, p: rnd() * 9 }); } }
    // colliders
    const cols = [];
    const R = (x0, y0, x1, y1, on) => cols.push({ x0: x0 * TS, y0: y0 * TS, x1: x1 * TS, y1: y1 * TS, on });
    const C = (x, y, r, on) => cols.push({ x, y, r: r * TS, on });
    objs.forEach(o => {
      const x = o.x / TS, y = o.y / TS;
      switch (o.k) {
        case 'house': R(x - 1.5, y - 1.45, x + 1.5, y - .05); break;
        case 'cottage': R(x - 1.25, y - 1.25, x + 1.25, y - .05); break;
        case 'shack': R(x - 1.2, y - 1.1, x + 1.2, y - .05); break;
        case 'stall': R(x - 1.05, y - .7, x + 1.05, y - .05); break;
        case 'tent': R(x - .95, y - .9, x + .95, y - .05); break;
        case 'garden': R(x - 1.3, y - .9, x + 1.3, y - .1); break;
        case 'fence': R(x - 1.1, y - .12, x + 1.1, y + .05); break;
        case 'bench': R(x - .55, y - .25, x + .55, y); break;
        case 'boat': R(x - 1.25, y - .55, x + 1.25, y + .3); break;
        case 'well': C(o.x, o.y - 6, .55); break;
        case 'windmill': C(o.x, o.y - 8, .85); break;
        case 'lighthouse': C(o.x, o.y - 10, .85); break;
        case 'beehive': case 'campfire': C(o.x, o.y - 4, .32); break;
        case 'crate': case 'barrel': C(o.x, o.y - 4, .28); break;
        case 'lantern': case 'sign': case 'tide': C(o.x, o.y - 2, .14); break;
        case 'tree': case 'pine': case 'oak': C(o.x, o.y - 3, o.k === 'oak' ? .45 : .3); break;
        case 'palm': C(o.x, o.y - 3, .22); break;
        case 'bush': case 'bushB': case 'bushF': C(o.x, o.y - 4, .36); break;
        case 'rock': C(o.x, o.y - 4, .28 + o.v * .1); break;
        case 'basalt': C(o.x, o.y - 6, .55); break;
        case 'stalag': C(o.x, o.y - 3, .22); break;
        case 'crystal': C(o.x, o.y - 3, .2); break;
        case 'pedestal': C(o.x, o.y - 3, .3); break;
        case 'caveMouth':
          R(x - 2.7, y - 2.0, x + 2.7, y - .55); R(x - 2.7, y - .6, x - .6, y + .05); R(x + .6, y - .6, x + 2.7, y + .05);
          R(x - .6, y - .62, x + .6, y + .18, () => !G.st.f.vines); break;
      }
    });
    // dock edges and repaired-bridge rails
    R(DOCK.x0 - .32, 51.6, DOCK.x0, DOCK.y1 + .2); R(DOCK.x1, 51.6, DOCK.x1 + .3, DOCK.y1 + .2);
    R(BRIDGE.x0 - .15, BRIDGE.y0 + .1, BRIDGE.x0 + .05, BRIDGE.y1 - .1); R(BRIDGE.x1 - .05, BRIDGE.y0 + .1, BRIDGE.x1 + .15, BRIDGE.y1 - .1);
    // bucket colliders (4x4 tiles)
    const BS = 4 * TS, BW = Math.ceil(MW / 4), BH = Math.ceil(MH / 4), buckets = Array.from({ length: BW * BH }, () => []);
    cols.forEach(c => { const x0 = c.r ? c.x - c.r : c.x0, x1 = c.r ? c.x + c.r : c.x1, y0 = c.r ? c.y - c.r : c.y0, y1 = c.r ? c.y + c.r : c.y1;
      for (let by = Math.max(0, Math.floor(y0 / BS)); by <= Math.min(BH - 1, Math.floor(y1 / BS)); by++) for (let bx = Math.max(0, Math.floor(x0 / BS)); bx <= Math.min(BW - 1, Math.floor(x1 / BS)); bx++) buckets[by * BW + bx].push(c); });
    // chunk buckets for drawing
    const CW = Math.ceil(MW / CH), CHH = Math.ceil(MH / CH);
    const objByChunk = Array.from({ length: CW * CHH }, () => []), tuftByChunk = Array.from({ length: CW * CHH }, () => []);
    const ci = (x, y) => clamp(Math.floor(y / CHP), 0, CHH - 1) * CW + clamp(Math.floor(x / CHP), 0, CW - 1);
    objs.forEach(o => objByChunk[ci(o.x, o.y)].push(o));
    tufts.forEach(t => tuftByChunk[ci(t.x, t.y)].push(t));
    reeds.forEach(t => { t.reed = 1; tuftByChunk[ci(t.x, t.y)].push(t); });
    // coast tiles (water touching land) with normals, for animated foam
    const landLike = t => t !== TL.DEEP && t !== TL.SHAL && t !== TL.VOID;
    const coast = [];
    for (let ty = 1; ty < MH - 1; ty++) for (let tx = 1; tx < ISW; tx++) {
      const t = tiles[ty * MW + tx]; if (t !== TL.DEEP && t !== TL.SHAL) continue; if ((tx === 23 || tx === 24) && ty >= 50 && ty <= 54) continue;
      let nx = 0, ny = 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { if (landLike(tiles[(ty + d[1]) * MW + tx + d[0]])) { nx += d[0]; ny += d[1]; } });
      if (!nx && !ny) continue; const l = Math.hypot(nx, ny) || 1; coast.push({ x: (tx + .5) * TS, y: (ty + .5) * TS, nx: nx / l, ny: ny / l, p: hash(tx, ty, 3) * TAU });
    }
    const riverPts = [];
    for (let i = 1; i < RIVER.length; i++) { const a = RIVER[i - 1], b = RIVER[i], L = dist(a[0], a[1], b[0], b[1]), n = Math.ceil(L / .7); for (let j = 0; j < n; j++) riverPts.push({ x: (a[0] + (b[0] - a[0]) * j / n) * TS, y: (a[1] + (b[1] - a[1]) * j / n) * TS, dx: (b[0] - a[0]) / L, dy: (b[1] - a[1]) / L, p: hash(i, j, 4) * 40, o: (hash(i, j, 6) - .5) * 26 }); }
    WORLD = { tiles, pathM, objs, cols, buckets, BS, BW, BH, objByChunk, tuftByChunk, CW, CHH, coast, riverPts, landLike };
    return WORLD;
  }

  // Game-state handle used by colliders defined at build time.
  const G = { st: null };

  function tileSolid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
    if ((tx === 23 || tx === 24) && ((ty >= 50 && ty <= 54) || (G.st && G.st.f.bridge && ty >= 26 && ty <= 30))) return false;
    return SOLID[WORLD.tiles[ty * MW + tx]] === 1;
  }
  const OFF = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [.71, .71], [-.71, .71], [.71, -.71], [-.71, -.71]];
  function freeAt(x, y, r, npcs) {
    for (let i = 0; i < 9; i++) if (tileSolid(Math.floor((x + OFF[i][0] * r) / TS), Math.floor((y + OFF[i][1] * r) / TS))) return false;
    const W = WORLD, bx = Math.floor(x / W.BS), by = Math.floor(y / W.BS);
    for (let yy = by - 1; yy <= by + 1; yy++) for (let xx = bx - 1; xx <= bx + 1; xx++) {
      if (xx < 0 || yy < 0 || xx >= W.BW || yy >= W.BH) continue;
      const b = W.buckets[yy * W.BW + xx];
      for (let i = 0; i < b.length; i++) {
        const c = b[i]; if (c.on && !c.on()) continue;
        if (c.r) { const dx = x - c.x, dy = y - c.y, rr = c.r + r; if (dx * dx + dy * dy < rr * rr) return false; }
        else { const nx = x < c.x0 ? c.x0 : x > c.x1 ? c.x1 : x, ny = y < c.y0 ? c.y0 : y > c.y1 ? c.y1 : y, dx = x - nx, dy = y - ny; if (dx * dx + dy * dy < r * r) return false; }
      }
    }
    if (npcs) for (let i = 0; i < npcs.length; i++) { const n = npcs[i]; const dx = x - n.x, dy = y - n.y, rr = n.cr + r; if (dx * dx + dy * dy < rr * rr) return false; }
    return true;
  }

  // Fine walk grid (20 px) for tap-to-walk and the reachability check.
  const GS = 20, GW = MW * 2, GH = MH * 2;
  let walkGrid = null;
  function walkable(i) { if (!walkGrid) walkGrid = new Uint8Array(GW * GH); let v = walkGrid[i]; if (!v) { const gx = i % GW, gy = (i / GW) | 0; v = freeAt(gx * GS + 10, gy * GS + 10, 10, null) ? 1 : 2; walkGrid[i] = v; } return v === 1; }
  function flood(sx, sy) {
    const start = Math.floor(sy / GS) * GW + Math.floor(sx / GS), prev = new Int32Array(GW * GH).fill(-2), q = new Int32Array(GW * GH);
    let h = 0, t = 0; prev[start] = -1; q[t++] = start;
    while (h < t) { const i = q[h++], x = i % GW, y = (i / GW) | 0;
      for (let k = 0; k < 4; k++) { const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0); if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const j = ny * GW + nx; if (prev[j] !== -2 || !walkable(j)) continue; prev[j] = i; q[t++] = j; } }
    return prev;
  }


  /* =====================================================================================
     Drawing: helpers, people, animals, icons, object sprites, ground chunks
     ===================================================================================== */
  const PI = Math.PI;
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function rrf(g, x, y, w, h, r, c) { g.fillStyle = c; rr(g, x, y, w, h, r); g.fill(); }
  function circ(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function ellf(g, x, y, rx, ry, c, rot) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); }
  function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
  function line(g, x0, y0, x1, y1, c, w) { g.strokeStyle = c; g.lineWidth = w || 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  const shadeCache = {};
  function shade(hex, k) {
    const key = hex + k; if (shadeCache[key]) return shadeCache[key];
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return (shadeCache[key] = `rgb(${r | 0},${g | 0},${b | 0})`);
  }
  const SHADOW = 'rgba(28,44,62,.2)';

  /* ---------- people ---------- */
  function drawPerson(g, P, x, y, dir, ph, moving, t, sc) {
    g.save(); g.translate(x, y); if (sc && sc !== 1) g.scale(sc, sc);
    const sw = moving ? Math.sin(ph) : 0, bob = moving ? -Math.abs(Math.cos(ph)) * 2 : Math.sin(t * 2.2) * 0.6;
    ellf(g, 0, 0, 11, 4, 'rgba(28,44,62,.24)');
    const side = dir === 1 || dir === 2, back = dir === 3, ex = P.ex || [];
    if (dir === 1) g.scale(-1, 1);
    const shoe = '#3a2e2a', shirt = P.shirt, pants = P.pants;
    if (ex.includes('backpack') && side) rrf(g, -13, -27 + bob, 6, 13, 3, '#b4743f');
    if (P.hs === 'long' && !back && !side) rrf(g, -10.5, -37 + bob, 21, 17, 7, P.hair);
    if (side) {
      for (const s of [-1, 1]) { g.save(); g.translate(0, -12 + bob); g.rotate(sw * .55 * s); rrf(g, -2.5, 0, 5, 11, 2.5, s > 0 ? pants : shade(pants, -.18)); ellf(g, 1.5, 11, 3.6, 2, shoe); g.restore(); }
      g.save(); g.translate(0, -24 + bob); g.rotate(-sw * .6); rrf(g, -2, 0, 4, 11, 2, shade(shirt, -.22)); g.restore();
    } else {
      const l = sw * 2.2, a = Math.max(0, l), b = Math.max(0, -l);
      rrf(g, -6, -13 + bob, 5, 12 - a, 2.5, pants); rrf(g, 1, -13 + bob, 5, 12 - b, 2.5, pants);
      ellf(g, -3.5, -1 - a, 3.2, 2, shoe); ellf(g, 3.5, -1 - b, 3.2, 2, shoe);
    }
    rrf(g, -8, -27 + bob, 16, 16, 6, shirt);
    g.globalAlpha = .3; rrf(g, 2, -27 + bob, 6, 16, 5, shade(shirt, -.35)); g.globalAlpha = 1;
    if (ex.includes('apron')) { if (!back) { if (side) rrf(g, 1, -23 + bob, 7, 12, 2.5, P.apron); else { rrf(g, -6, -23 + bob, 12, 12, 3, P.apron); line(g, -4, -23 + bob, -5, -27 + bob, P.apron, 1.4); line(g, 4, -23 + bob, 5, -27 + bob, P.apron, 1.4); } } else rrf(g, -2, -18 + bob, 4, 3, 1.5, P.apron); }
    if (ex.includes('overalls') && !back) { if (side) rrf(g, -1, -21 + bob, 8, 10, 2, '#4f7f3a'); else { rrf(g, -6, -21 + bob, 12, 10, 2, '#4f7f3a'); line(g, -4, -21 + bob, -4, -27 + bob, '#4f7f3a', 1.6); line(g, 4, -21 + bob, 4, -27 + bob, '#4f7f3a', 1.6); circ(g, -4, -21 + bob, 1, '#f5c542'); circ(g, 4, -21 + bob, 1, '#f5c542'); } }
    if (ex.includes('coat') && !back) { if (!side) { line(g, 0, -26 + bob, 0, -12 + bob, shade(shirt, -.3), 1.2); circ(g, -2.6, -21 + bob, 1.1, '#f5c542'); circ(g, -2.6, -16.5 + bob, 1.1, '#f5c542'); } else circ(g, 5, -19 + bob, 1.1, '#f5c542'); }
    if (ex.includes('camera') && !back) { const cx = side ? 5 : 0; rrf(g, cx - 4, -21 + bob, 8, 6, 1.6, '#25292f'); circ(g, cx, -18 + bob, 2, '#6b7686'); circ(g, cx - .5, -18.6 + bob, .7, '#cfd8e3'); }
    if (ex.includes('backpack') && back) { rrf(g, -7.5, -26 + bob, 15, 14, 4, '#b4743f'); rrf(g, -7.5, -26 + bob, 15, 5, 3, '#9a5f30'); }
    if (ex.includes('scarf')) rrf(g, -7.5, -28.5 + bob, 15, 4.2, 2, P.scarf);
    if (side) { g.save(); g.translate(0, -24 + bob); g.rotate(sw * .6); rrf(g, -2, 0, 4, 11, 2, shirt); circ(g, 0, 11, 2.2, P.skin); g.restore(); }
    else { const s1 = sw * 1.6; rrf(g, -11.5, -25 + bob + s1, 4, 11, 2, shirt); rrf(g, 7.5, -25 + bob - s1, 4, 11, 2, shirt); circ(g, -9.5, -13.5 + bob + s1, 2.2, P.skin); circ(g, 9.5, -13.5 + bob - s1, 2.2, P.skin); }
    const hy = -36 + bob;
    circ(g, 0, hy, 10, P.skin);
    if (!back) {
      if (side) { ellf(g, 5.2, hy - .5, 1.4, 1.9, '#2a2230'); circ(g, 4, hy + 3.6, 2.2, 'rgba(240,110,110,.32)'); circ(g, 9.6, hy + 1.2, 1.6, shade(P.skin, -.12)); }
      else {
        ellf(g, -3.6, hy - .5, 1.4, 1.9, '#2a2230'); ellf(g, 3.6, hy - .5, 1.4, 1.9, '#2a2230');
        circ(g, -3.2, hy - 1.2, .5, '#fff'); circ(g, 4, hy - 1.2, .5, '#fff');
        circ(g, -6.2, hy + 3.4, 2.2, 'rgba(240,110,110,.32)'); circ(g, 6.2, hy + 3.4, 2.2, 'rgba(240,110,110,.32)');
        g.strokeStyle = '#7a3b34'; g.lineWidth = 1.1; g.beginPath(); g.arc(0, hy + 3, 2, .15 * PI, .85 * PI); g.stroke();
      }
    }
    drawHair(g, P, hy, dir);
    if (ex.includes('beard') && !back) { const bc = P.beard || P.hair; g.fillStyle = bc; g.beginPath(); if (side) { g.moveTo(-2, hy + 1); g.quadraticCurveTo(2, hy + 12, 9, hy + 4); g.lineTo(8, hy + 1); g.closePath(); } else { g.moveTo(-9, hy); g.quadraticCurveTo(0, hy + 15, 9, hy); g.quadraticCurveTo(0, hy + 6, -9, hy); } g.fill(); }
    if (P.glasses && !back) { g.strokeStyle = '#3a2a2a'; g.lineWidth = 1.1; g.beginPath(); if (side) g.arc(5.4, hy - .4, 3, 0, TAU); else { g.arc(-3.7, hy - .4, 3, 0, TAU); g.moveTo(6.7, hy - .4); g.arc(3.7, hy - .4, 3, 0, TAU); g.moveTo(-.7, hy - .6); g.lineTo(.7, hy - .6); } g.stroke(); }
    if (ex.includes('band')) rrf(g, -10.6, hy - 6.5, 21.2, 3, 1.5, '#ffcc33');
    drawHat(g, P, hy, dir);
    g.restore();
  }
  function drawHair(g, P, hy, dir) {
    const c = P.hair, side = dir === 1 || dir === 2, back = dir === 3;
    g.fillStyle = c;
    if (P.hs === 'bald') { if (back) { g.beginPath(); g.arc(0, hy + .5, 10.2, .1 * PI, .9 * PI); g.fill(); } else if (side) ellf(g, -6, hy + 1, 4, 4.5, c); else { ellf(g, -9.2, hy + 1, 2.4, 4, c); ellf(g, 9.2, hy + 1, 2.4, 4, c); } return; }
    if (P.hs === 'curly') { for (let i = 0; i < 8; i++) { const a = PI + i / 7 * PI; circ(g, Math.cos(a) * 8.6, hy - 1 + Math.sin(a) * 8.6, 4.4, c); } if (back) { circ(g, 0, hy, 9.6, c); circ(g, -6, hy + 5, 4, c); circ(g, 6, hy + 5, 4, c); } else if (side) { circ(g, -6, hy + 2, 5, c); } return; }
    g.beginPath(); g.arc(0, hy - .5, 10.6, PI, TAU); g.fill();
    if (back) { rrf(g, -10.6, hy - 2, 21.2, P.hs === 'long' ? 17 : 9, 5, c); }
    else if (side) { rrf(g, -10.6, hy - 3, 9.5, P.hs === 'long' ? 17 : 9, 4, c); }
    else {
      g.beginPath(); g.moveTo(-10.4, hy - 1); g.quadraticCurveTo(-5, hy + 1, 0, hy - 4); g.quadraticCurveTo(5, hy, 10.4, hy - 1); g.lineTo(10.4, hy - 6); g.lineTo(-10.4, hy - 6); g.closePath(); g.fill();
      if (P.hs === 'long') { rrf(g, -11.4, hy - 3, 4, 15, 2, c); rrf(g, 7.4, hy - 3, 4, 15, 2, c); }
    }
    if (P.hs === 'bun') circ(g, side ? -6 : 0, hy - 10.5, 4.6, c);
  }
  function drawHat(g, P, hy, dir) {
    const side = dir === 1 || dir === 2, back = dir === 3, c = P.hatC || '#888';
    switch (P.hat) {
      case 'explorer': ellf(g, 0, hy - 6.5, 15.5, 4.6, '#c4a160'); rrf(g, -8.5, hy - 16, 17, 11, 5, '#dcc085'); rrf(g, -8.5, hy - 8.5, 17, 2.6, 1, '#7a5a3a'); break;
      case 'cap': g.fillStyle = c; g.beginPath(); g.arc(0, hy - 3, 10.9, PI, TAU); g.fill(); circ(g, 0, hy - 13.4, 1.6, shade(c, .25));
        if (!back) { if (side) ellf(g, 9, hy - 3.6, 7, 2.6, shade(c, -.22)); else ellf(g, 0, hy - 2.6, 9.5, 3.2, shade(c, -.22)); } break;
      case 'captain': rrf(g, -10.2, hy - 9.5, 20.4, 5.5, 2, '#1c2b4a'); ellf(g, 0, hy - 10, 12.5, 5, '#fafafa');
        if (!back) { if (side) ellf(g, 8, hy - 4.6, 7, 2.2, '#15161a'); else { ellf(g, 0, hy - 4, 9.5, 2.6, '#15161a'); circ(g, 0, hy - 7.2, 1.9, '#f5c542'); } } break;
      case 'beanie': case 'knit': g.fillStyle = c; g.beginPath(); g.arc(0, hy - 2, 11.2, PI, TAU); g.fill(); rrf(g, -11.2, hy - 5.5, 22.4, 5, 2, shade(c, -.18));
        g.strokeStyle = shade(c, -.12); g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 4, hy - 6); g.lineTo(i * 3, hy - 11); g.stroke(); }
        if (P.hat === 'beanie') circ(g, 0, hy - 14, 3.4, shade(c, .3)); break;
      case 'straw': ellf(g, 0, hy - 5.5, 16.5, 5, '#e2bd5c'); rrf(g, -8, hy - 14.5, 16, 10, 5, '#efd27e'); rrf(g, -8, hy - 8.5, 16, 2.4, 1, '#e05a5a'); break;
      case 'scarf': g.fillStyle = c; g.beginPath(); g.arc(0, hy - .5, 11.4, PI * .93, PI * 2.07); g.closePath(); g.fill();
        for (let i = 0; i < 5; i++) circ(g, -7 + i * 3.5, hy - 6 + (i % 2) * 2.5, .9, shade(c, .45));
        if (side) circ(g, -10, hy + 4, 3, c); else if (back) rrf(g, -3, hy + 3, 6, 9, 3, c); break;
      case 'goggles': rrf(g, -10.6, hy - 8, 21.2, 3, 1.5, '#5b4a3a');
        if (!back) { const l = side ? [6] : [-4.2, 4.2]; l.forEach(x => { circ(g, x, hy - 8.6, 3.4, '#4a3b2e'); circ(g, x, hy - 8.6, 2.4, '#8fd3f4'); circ(g, x - .8, hy - 9.4, .8, '#fff'); }); } break;
    }
  }
  function portrait(cv, who, look) {
    const s = cv.width, g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s, s);
    g.save(); g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, TAU); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#e0f2fe'); gr.addColorStop(1, '#a7d8f0'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    if (who === 'pikko') { g.translate(s * .42, s * .78); g.scale(s / 26, s / 26); AN.hedgehog(g, 0, false, false); }
    else { const k = s / 32; g.translate(s / 2, s * .47 + 36 * k); g.scale(k, k); drawPerson(g, look, 0, 0, 0, 0, false, 0, 1); }
    g.restore();
  }

  /* ---------- animals (drawn facing right, origin at the feet) ---------- */
  const AN = {
    crab(g, t, m) {
      ellf(g, 0, 0, 11, 3.5, SHADOW); const lg = m ? Math.sin(t * 24) * 1.6 : 0;
      for (let i = 0; i < 3; i++) { const yy = -5 + i * 2, o = i % 2 ? lg : -lg; line(g, -5, yy, -12, yy + 3 + o, '#b8402f', 1.6); line(g, 5, yy, 12, yy + 3 - o, '#b8402f', 1.6); }
      line(g, -6, -8, -10, -11, '#b8402f', 2); line(g, 6, -8, 10, -11, '#b8402f', 2);
      ellf(g, 0, -6, 9, 6, '#e2553f'); ellf(g, -2, -8, 5, 2.4, 'rgba(255,255,255,.28)');
      circ(g, -10.5, -12, 3.8, '#e2553f'); circ(g, 10.5, -12, 3.8, '#e2553f'); circ(g, -11.5, -13, 1.2, 'rgba(255,255,255,.4)'); circ(g, 9.5, -13, 1.2, 'rgba(255,255,255,.4)');
      line(g, -3, -10, -3, -14, '#b8402f', 1.4); line(g, 3, -10, 3, -14, '#b8402f', 1.4); circ(g, -3, -14.5, 1.8, '#fff'); circ(g, 3, -14.5, 1.8, '#fff'); circ(g, -2.6, -14.5, .9, '#222'); circ(g, 3.4, -14.5, .9, '#222');
    },
    seal(g, t) {
      ellf(g, 0, 0, 20, 4.5, SHADOW); const lift = Math.sin(t * .7) > .55 ? -3.5 : 0;
      poly(g, [-17, -6, -27, -10, -26, -3, -18, -3], '#76818f');
      ellf(g, 0, -7, 18, 7.5, '#8a96a5'); ellf(g, 1, -3.5, 14, 3.4, '#b6bfca'); ellf(g, -4, -10, 9, 2.4, 'rgba(255,255,255,.22)');
      for (let i = 0; i < 5; i++) circ(g, -9 + i * 4.5, -9 + (i % 2) * 2, .9, '#6d7886');
      circ(g, 14, -12 + lift, 6.6, '#8a96a5'); circ(g, 16.8, -13.6 + lift, 1.3, '#1d232b'); circ(g, 20.2, -11.4 + lift, 1.3, '#2b2b2b');
      line(g, 19, -10.5 + lift, 24, -11.5 + lift, 'rgba(60,60,60,.6)', .7); line(g, 19, -10 + lift, 24, -9 + lift, 'rgba(60,60,60,.6)', .7);
      ellf(g, 6, -2, 4.4, 2, '#76818f');
    },
    heron(g, t, m, st) {
      ellf(g, 0, 0, 9, 3, SHADOW); const k = st && st.strike > 0 ? Math.sin(st.strike * PI) : 0;
      line(g, -2, 0, -1, -22, '#c99a5a', 1.6); line(g, 2, 0, 1.4, -22, '#c99a5a', 1.6);
      ellf(g, -1, -28, 11, 6.5, '#9aa7b4', -.18); ellf(g, -4, -27, 8, 4, '#7f8c9a', -.2); poly(g, [-11, -26, -17, -22, -10, -24], '#6b7785');
      const hx = 10 + k * 8, hy = -46 + k * 14;
      g.strokeStyle = '#d8dee5'; g.lineWidth = 3.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, -31); g.quadraticCurveTo(3 + k * 5, -42 + k * 6, hx, hy); g.stroke(); g.lineCap = 'butt';
      circ(g, hx, hy, 3.8, '#eef1f4'); line(g, hx - 1, hy - 2.6, hx - 7, hy - 3.6, '#222', 1.3); poly(g, [hx + 3, hy - 1, hx + 12, hy + .5, hx + 3, hy + 1.2], '#f0c040'); circ(g, hx + 1.4, hy - .8, .8, '#222');
    },
    deer(g, t, m) {
      ellf(g, 0, 0, 15, 4, SHADOW); const s = m ? Math.sin(t * 12) * 3 : 0;
      [[-9, s], [-6, -s], [7, -s], [10, s]].forEach(l => line(g, l[0], -17, l[0] + l[1], 0, '#8b5a33', 2.2));
      ellf(g, 0, -19, 14, 7, '#b07a4a'); ellf(g, 1, -15.5, 10, 3, '#d4a77a'); ellf(g, -13, -21, 2.4, 3, '#f6ece0');
      for (let i = 0; i < 3; i++) circ(g, -4 + i * 5, -22, 1, '#f1dcc4');
      poly(g, [8, -22, 12, -34, 17, -32, 14, -20], '#b07a4a');
      ellf(g, 15, -33, 5.6, 4.2, '#b07a4a'); ellf(g, 20, -31.5, 2.6, 2, '#a06a3d'); circ(g, 22, -31.5, 1.1, '#222'); circ(g, 16, -34, 1, '#222');
      ellf(g, 11.5, -37.5, 1.8, 3.6, '#a06a3d', -.5);
      line(g, 14, -37, 12, -45, '#d8c3a0', 1.6); line(g, 13, -41, 10, -43, '#d8c3a0', 1.4); line(g, 16, -37, 17, -45, '#d8c3a0', 1.6);
    },
    fox(g, t, m) {
      ellf(g, 0, 0, 13, 3.5, SHADOW); const s = m ? Math.sin(t * 14) * 2.6 : 0, w = Math.sin(t * 3) * 2;
      g.fillStyle = '#e2793a'; g.beginPath(); g.moveTo(-9, -10); g.quadraticCurveTo(-20, -18 + w, -24, -8 + w); g.quadraticCurveTo(-18, -4, -9, -7); g.fill(); circ(g, -23, -8.5 + w, 2.8, '#fff7ee');
      [[-6, s], [-3, -s], [6, -s], [9, s]].forEach(l => line(g, l[0], -7, l[0] + l[1], 0, '#5a3220', 2));
      ellf(g, 0, -9.5, 12, 5.6, '#e2793a'); ellf(g, 6, -7, 5, 3, '#fff3e6');
      ellf(g, 12, -14, 6, 5, '#e2793a'); ellf(g, 17, -12.6, 3.6, 2.2, '#fff3e6'); circ(g, 20.4, -12.8, 1.2, '#222'); circ(g, 13.6, -15, 1, '#222');
      poly(g, [8, -17, 9, -24, 12, -18], '#e2793a'); poly(g, [12, -18, 14, -24, 15.5, -17], '#c7602a'); poly(g, [9, -21, 9, -24, 10.4, -21.4], '#3a2418');
    },
    hedgehog(g, t, m, net) {
      ellf(g, 0, 0, 12, 3.5, SHADOW);
      g.strokeStyle = '#4e3423'; g.lineWidth = 1.6; for (let i = 0; i < 15; i++) { const a = PI * 1.05 + i / 14 * PI * .95; g.beginPath(); g.moveTo(Math.cos(a) * 6, -7 + Math.sin(a) * 4); g.lineTo(Math.cos(a) * 15, -7 + Math.sin(a) * 11); g.stroke(); }
      ellf(g, -1, -7, 12, 8, '#7a5638'); ellf(g, -4, -10, 6, 3, 'rgba(255,255,255,.16)');
      ellf(g, 9, -5, 5.6, 4, '#e9cfa8'); circ(g, 14.4, -5.2, 1.7, '#2a1f1a'); circ(g, 10, -7, 1.2, '#222'); circ(g, 7.5, -3, 1.3, 'rgba(240,120,120,.4)');
      ellf(g, 4, -.6, 2, 1.2, '#5a3d28'); ellf(g, -5, -.6, 2, 1.2, '#5a3d28');
      if (net) { g.strokeStyle = 'rgba(70,140,170,.95)'; g.lineWidth = 1; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(-14 + i * 4, -16); g.lineTo(-6 + i * 4, 1); g.stroke(); g.beginPath(); g.moveTo(-14 + i * 5, 1); g.lineTo(-4 + i * 5, -16); g.stroke(); } }
    },
    gull(g, t) {
      ellf(g, 0, 0, 8, 2.6, SHADOW); line(g, -1, -4, -1.5, 0, '#f08a3c', 1.3); line(g, 2, -4, 2.5, 0, '#f08a3c', 1.3);
      poly(g, [-8, -9, -13, -11, -9, -6], '#3f4752'); ellf(g, 0, -8.5, 8, 5, '#fff'); ellf(g, -1.5, -9.5, 6.5, 3.2, '#a6b1be');
      circ(g, 6, -14, 4, '#fff'); poly(g, [9, -14.6, 14, -13.6, 9, -12.6], '#f2c230'); circ(g, 12, -13.4, .7, '#e0493f'); circ(g, 7, -15, .9, '#222');
    },
    owl(g, t, night) {
      ellf(g, 0, -9, 8.5, 10, '#8b6a4a'); ellf(g, 0, -6, 5.6, 6.6, '#dcc5a2');
      for (let i = 0; i < 3; i++) line(g, -2 + i * 2, -8 + i, -1 + i * 2, -6 + i, '#a88a64', 1);
      poly(g, [-7, -17, -5, -23, -2, -17], '#7a5a3c'); poly(g, [7, -17, 5, -23, 2, -17], '#7a5a3c');
      if (night) { circ(g, -3.4, -14, 3.3, '#fffbe6'); circ(g, 3.4, -14, 3.3, '#fffbe6'); circ(g, -3.2, -14, 1.7, '#1d1a14'); circ(g, 3.6, -14, 1.7, '#1d1a14'); }
      else { g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.2; g.beginPath(); g.arc(-3.4, -14.5, 2.4, .1 * PI, .9 * PI); g.moveTo(5.8, -14); g.arc(3.4, -14.5, 2.4, .1 * PI, .9 * PI); g.stroke(); }
      poly(g, [-1.3, -12, 1.3, -12, 0, -9.5], '#e8b03c');
    },
    bat(g, t) {
      line(g, -1.5, 0, -1.5, 3, '#2a2433', 1); line(g, 1.5, 0, 1.5, 3, '#2a2433', 1);
      ellf(g, 0, 9, 4.2, 7, '#3d3549'); ellf(g, -3.5, 8, 3, 6.4, '#2a2433', .2); ellf(g, 3.5, 8, 3, 6.4, '#2a2433', -.2);
      poly(g, [-3, 15, -4, 19, -1, 16], '#3d3549'); poly(g, [3, 15, 4, 19, 1, 16], '#3d3549'); circ(g, -1.4, 13.4, .8, '#f2a33a'); circ(g, 1.4, 13.4, .8, '#f2a33a');
    },
    butterfly(g, t, c) {
      const f = .25 + Math.abs(Math.sin(t * 13)) * .75;
      g.save(); g.scale(f, 1); ellf(g, -5, -2, 5, 4, c); ellf(g, 5, -2, 5, 4, c); ellf(g, -3.6, 2.6, 3, 2.6, shade(c, -.15)); ellf(g, 3.6, 2.6, 3, 2.6, shade(c, -.15));
      circ(g, -5.5, -2.5, 1.2, 'rgba(255,255,255,.7)'); circ(g, 5.5, -2.5, 1.2, 'rgba(255,255,255,.7)'); g.restore();
      line(g, 0, -5, 0, 5, '#2a2230', 1.4);
    },
    bee(g, t) { g.globalAlpha = .7; ellf(g, -1, -2.6 - Math.abs(Math.sin(t * 40)) * 1.4, 2.2, 1.6, '#fff'); ellf(g, 1.2, -2.6, 2.2, 1.6, '#fff'); g.globalAlpha = 1; ellf(g, 0, 0, 3.2, 2.2, '#f5c542'); line(g, -1, -2, -1, 2, '#2a2230', 1); line(g, 1, -2, 1, 2, '#2a2230', 1); },
    fish(g, c) { ellf(g, 0, 0, 12, 5, c); poly(g, [-10, 0, -18, -6, -18, 6], c); poly(g, [-2, -4, 4, -9, 6, -4], shade(c, -.15)); ellf(g, 0, 2, 8, 2, 'rgba(255,255,255,.35)'); circ(g, 7, -1, 1.4, '#1f2328'); for (let i = 0; i < 5; i++) circ(g, -6 + i * 3, -1.5 + (i % 2) * 2, .9, '#d0473a'); }
  };

  /* ---------- icons (64x64), also used as small world props ---------- */
  function leaf(g, x, y, l, w, a, c) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * .5, -w, l, 0); g.quadraticCurveTo(l * .5, w, 0, 0); g.fill(); g.restore(); }
  function stem(g, x0, y0, x1, y1, c, w) { g.strokeStyle = c || '#4f9444'; g.lineWidth = w || 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 3, (y0 + y1) / 2, x1, y1); g.stroke(); g.lineCap = 'butt'; }
  function crystal(g, x, y, w, h, c, a) { g.save(); g.translate(x, y); g.rotate(a || 0); poly(g, [-w, 0, -w, -h, 0, -h - w * 1.1, w, -h, w, 0], c); poly(g, [0, 0, 0, -h - w * 1.1, w, -h, w, 0], shade(c, -.18)); poly(g, [-w * .6, -h * .2, -w * .6, -h * .9, -w * .1, -h * .95, -w * .1, -h * .25], 'rgba(255,255,255,.45)'); g.restore(); }
  function drawIcon(g, id) {
    g.save(); g.lineJoin = 'round';
    switch (id) {
      case 'marram': ellf(g, 32, 56, 22, 6, '#f1dca5'); for (let i = 0; i < 7; i++) { const x = 16 + i * 5; stem(g, x, 56, x - 8 + i * 3, 14 + (i % 3) * 6, i % 2 ? '#8fbf6a' : '#6ea455', 2.4); } ellf(g, 18, 18, 2.4, 6, '#d9b56a', -.3); ellf(g, 44, 16, 2.4, 6, '#d9b56a', .3); break;
      case 'buckthorn': stem(g, 10, 56, 54, 12, '#7a5a3c', 3); for (let i = 0; i < 7; i++) { leaf(g, 14 + i * 6, 52 - i * 6, 14, 3, -1.2 - (i % 2) * 1.4, '#9bb79a'); } [[28, 34], [32, 31], [30, 38], [36, 28], [24, 40], [40, 24], [34, 36]].forEach(b => { circ(g, b[0], b[1], 3.6, '#f28c28'); circ(g, b[0] - 1, b[1] - 1, 1, '#ffd9a0'); }); break;
      case 'oak': g.fillStyle = '#5f9c45'; g.beginPath(); for (let i = 0; i <= 10; i++) { const yy = 10 + i * 4.2, w = Math.sin(i / 10 * PI) * 15 + 5 + (i % 2) * 5; g.lineTo(32 + w, yy); } for (let i = 10; i >= 0; i--) { const yy = 10 + i * 4.2, w = Math.sin(i / 10 * PI) * 15 + 5 + (i % 2) * 5; g.lineTo(32 - w, yy); } g.fill(); line(g, 32, 12, 32, 56, '#3f7a3a', 2); ellf(g, 47, 50, 6, 7.5, '#b5793e'); rrf(g, 40, 41, 14, 6, 3, '#6f4a2a'); break;
      case 'fern': stem(g, 32, 58, 34, 8, '#3d8a46', 2.4); for (let i = 0; i < 9; i++) { const y = 50 - i * 4.8, l = 18 - i * 1.6; leaf(g, 33, y, l, 3.2, -.25, '#57a85c'); leaf(g, 33, y, l, 3.2, PI + .25, '#4b9a51'); } break;
      case 'flyagaric': rrf(g, 26, 30, 12, 26, 5, '#f6f1e6'); ellf(g, 32, 40, 9, 2.4, '#e9e0cf'); g.fillStyle = '#e0362f'; g.beginPath(); g.ellipse(32, 30, 22, 15, 0, PI, TAU); g.fill(); ellf(g, 32, 30, 22, 4, '#c42b25'); [[22, 22, 2.8], [33, 18, 3.2], [43, 24, 2.6], [27, 27, 2], [39, 28, 2]].forEach(d => circ(g, d[0], d[1], d[2], '#fff')); ellf(g, 25, 20, 6, 3, 'rgba(255,255,255,.18)'); break;
      case 'bilberry': leaf(g, 18, 34, 22, 7, -.6, '#4f9a51'); leaf(g, 30, 30, 22, 7, -.2, '#5fae5f'); [[26, 40], [36, 42], [31, 49], [42, 50]].forEach(b => { circ(g, b[0], b[1], 7, '#3a4f9e'); circ(g, b[0] - 2, b[1] - 2, 2, 'rgba(255,255,255,.4)'); circ(g, b[0] + 1, b[1] + 3, 1.6, '#283875'); }); break;
      case 'sunflower': stem(g, 32, 60, 32, 30, '#4f9444', 3); leaf(g, 32, 48, 14, 5, -.5, '#5fae5f'); leaf(g, 32, 44, 14, 5, PI + .5, '#5fae5f'); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ellf(g, 32 + Math.cos(a) * 14, 24 + Math.sin(a) * 14, 7, 3.4, i % 2 ? '#f5c518' : '#f8d548', a); } circ(g, 32, 24, 10, '#7a4a22'); for (let i = 0; i < 9; i++) circ(g, 28 + (i % 3) * 4, 20 + ((i / 3) | 0) * 4, 1, '#54321a'); break;
      case 'dandelion': stem(g, 32, 60, 30, 28, '#5f9f4a', 2); leaf(g, 30, 56, 16, 4, -2.6, '#5fae5f'); leaf(g, 32, 56, 16, 4, -.5, '#5fae5f'); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 1; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; g.beginPath(); g.moveTo(30, 24); g.lineTo(30 + Math.cos(a) * 15, 24 + Math.sin(a) * 15); g.stroke(); circ(g, 30 + Math.cos(a) * 15, 24 + Math.sin(a) * 15, 1.4, '#fff'); } circ(g, 30, 24, 3, '#d9cfa8'); break;
      case 'lavender': for (let s = 0; s < 3; s++) { const x = 22 + s * 10; stem(g, x, 60, x + (s - 1) * 4, 16, '#7fa86a', 2); for (let i = 0; i < 6; i++) { ellf(g, x + (s - 1) * 4 - 2.2 + (s - 1) * i * -.4, 18 + i * 5, 2.6, 3.4, i % 2 ? '#9b7fd4' : '#8a6bc9'); ellf(g, x + (s - 1) * 4 + 2.2, 20 + i * 5, 2.6, 3.4, '#a58ce0'); } } break;
      case 'waterlily': ellf(g, 32, 44, 26, 13, '#4a9a5c'); poly(g, [32, 44, 46, 32, 52, 38], '#7fd4d6'); ellf(g, 28, 41, 14, 6, 'rgba(255,255,255,.14)'); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ellf(g, 32 + Math.cos(a) * 7, 34 + Math.sin(a) * 4, 6, 3, i % 2 ? '#fbd3e3' : '#f6b6cf', a); } circ(g, 32, 33, 4, '#f5c542'); break;
      case 'edelweiss': stem(g, 32, 60, 32, 36, '#8aa89a', 2.4); leaf(g, 32, 52, 12, 4, -.6, '#a9c2b6'); leaf(g, 32, 50, 12, 4, PI + .6, '#a9c2b6'); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU - PI / 2; ellf(g, 32 + Math.cos(a) * 11, 28 + Math.sin(a) * 11, 8, 4, '#f4f6f2', a); ellf(g, 32 + Math.cos(a) * 11, 28 + Math.sin(a) * 11, 5, 2, '#e1e6e0', a); } for (let i = 0; i < 7; i++) circ(g, 29 + (i % 3) * 3, 25 + ((i / 3) | 0) * 3, 1.8, '#e8d36a'); break;
      case 'mint': stem(g, 32, 60, 32, 12, '#5d8f4a', 2.4); [[50, 1], [40, 1], [30, 1], [20, 1]].forEach((p, i) => { const l = 18 - i * 2.5; leaf(g, 32, p[0], l, 6 - i * .6, -.4, '#53b46a'); leaf(g, 32, p[0], l, 6 - i * .6, PI + .4, '#47a35e'); }); break;
      case 'crab': g.translate(32, 50); g.scale(2, 2); AN.crab(g, 0, false); break;
      case 'seal': g.translate(30, 44); g.scale(1.25, 1.25); AN.seal(g, 0); break;
      case 'gull': g.translate(28, 54); g.scale(2.4, 2.4); AN.gull(g, 0); break;
      case 'trout': g.translate(34, 32); g.scale(1.45, 1.45); AN.fish(g, '#8fa66a'); break;
      case 'heron': g.translate(28, 60); g.scale(1.1, 1.1); AN.heron(g, 0); break;
      case 'deer': g.translate(26, 58); g.scale(1.15, 1.15); AN.deer(g, 0); break;
      case 'fox': g.translate(32, 50); g.scale(1.45, 1.45); AN.fox(g, 0); break;
      case 'hedgehog': g.translate(28, 48); g.scale(1.8, 1.8); AN.hedgehog(g, 0); break;
      case 'bee': g.translate(32, 34); g.scale(5, 5); AN.bee(g, .2); break;
      case 'butterfly': g.translate(32, 32); g.scale(2.6, 2.6); AN.butterfly(g, .05, '#f5c542'); line(g, -9, -4, 9, -4, 'rgba(40,30,30,.6)', .6); break;
      case 'owl': g.translate(32, 54); g.scale(2.1, 2.1); AN.owl(g, 0, true); break;
      case 'bat': g.translate(32, 10); g.scale(2.4, 2.4); AN.bat(g, 0); break;
      case 'glowworm': { const gr = g.createRadialGradient(32, 36, 2, 32, 36, 26); gr.addColorStop(0, 'rgba(200,255,120,.9)'); gr.addColorStop(1, 'rgba(200,255,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); ellf(g, 32, 38, 10, 4, '#5a5240'); for (let i = 0; i < 4; i++) line(g, 25 + i * 4, 40, 24 + i * 4, 44, '#5a5240', 1); circ(g, 37, 38, 4, '#d8ff7a'); circ(g, 21, 36, 3, '#5a5240'); break; }
      case 'quartz': ellf(g, 32, 56, 20, 5, 'rgba(0,0,0,.12)'); crystal(g, 26, 56, 6, 22, '#eef3f7', -.2); crystal(g, 38, 56, 7, 28, '#f7fafc', .12); crystal(g, 31, 57, 5, 14, '#dfe7ee', 0); break;
      case 'amber': g.fillStyle = '#f2a33a'; g.beginPath(); g.moveTo(18, 40); g.quadraticCurveTo(16, 18, 34, 16); g.quadraticCurveTo(52, 18, 48, 38); g.quadraticCurveTo(44, 54, 30, 52); g.quadraticCurveTo(20, 50, 18, 40); g.fill(); ellf(g, 28, 26, 7, 4, 'rgba(255,240,180,.6)'); ellf(g, 36, 38, 3, 1.8, '#7a4a1c'); line(g, 33, 37, 31, 34, '#7a4a1c', .8); line(g, 39, 37, 41, 34, '#7a4a1c', .8); break;
      case 'basalt': for (let i = 0; i < 5; i++) { const x = 12 + i * 10, h = [26, 36, 30, 40, 24][i]; poly(g, [x - 5, 58, x - 5, 58 - h, x + 5, 58 - h, x + 5, 58], i % 2 ? '#575c66' : '#626873'); poly(g, [x - 5, 58 - h, x - 2, 55 - h - 3, x + 3, 55 - h - 3, x + 5, 58 - h, x + 2, 61 - h, x - 3, 61 - h], '#8a909a'); } break;
      case 'amethyst': ellf(g, 32, 54, 22, 7, '#8d8a95'); crystal(g, 22, 54, 6, 16, '#9f7ae0', -.4); crystal(g, 32, 54, 8, 26, '#b08af0', 0); crystal(g, 42, 54, 6, 18, '#8e66d6', .4); crystal(g, 27, 56, 4, 10, '#c4a6f7', -.15); break;
      case 'stalactite': rrf(g, 4, 4, 56, 12, 6, '#7d7060'); [[16, 30], [28, 44], [40, 34], [50, 22]].forEach(s => { poly(g, [s[0] - 6, 12, s[0] + 6, 12, s[0], 12 + s[1]], '#a39380'); poly(g, [s[0], 12, s[0] + 6, 12, s[0], 12 + s[1]], '#8c7d6b'); }); circ(g, 28, 60, 2.4, '#7fd3f4'); break;
      case 'lighthouse': poly(g, [22, 58, 26, 18, 38, 18, 42, 58], '#fff'); [[50, 58], [34, 42]].forEach(b => poly(g, [22 + (58 - b[0]) * .1, b[0], 23 + (58 - b[1] + 8) * .1, b[1] - 8 + 8, 41 - (58 - b[1]) * .1, b[1], 42 - (58 - b[0]) * .1, b[0]], '#e0493f')); rrf(g, 22, 14, 20, 5, 2, '#3a3f4a'); rrf(g, 26, 4, 12, 11, 2, '#ffe28a'); poly(g, [24, 5, 32, -2, 40, 5], '#e0493f'); rrf(g, 29, 46, 6, 12, 3, '#6b4a35'); break;
      case 'bridge': ellf(g, 32, 56, 28, 5, '#4fb4cf'); g.strokeStyle = '#8a5a3b'; g.lineWidth = 6; g.beginPath(); g.moveTo(4, 50); g.quadraticCurveTo(32, 18, 60, 50); g.stroke(); g.lineWidth = 2; for (let i = 0; i < 7; i++) { const x = 10 + i * 7.3, y = 50 - Math.sin((x - 4) / 56 * PI) * 22; line(g, x, y, x, y - 10, '#6b4a35', 2); } g.beginPath(); g.moveTo(6, 40); g.quadraticCurveTo(32, 8, 58, 40); g.stroke(); break;
      case 'well': ellf(g, 32, 54, 18, 6, '#9aa1a8'); rrf(g, 14, 36, 36, 18, 4, '#b8bec5'); for (let i = 0; i < 3; i++) line(g, 14, 42 + i * 5, 50, 42 + i * 5, '#9aa1a8', 1); ellf(g, 32, 36, 18, 6, '#9aa1a8'); ellf(g, 32, 36, 13, 4, '#2f5f7a'); line(g, 17, 36, 17, 14, '#8a5a3b', 3); line(g, 47, 36, 47, 14, '#8a5a3b', 3); poly(g, [10, 16, 32, 4, 54, 16], '#b4566a'); line(g, 32, 16, 32, 28, '#555', 1); rrf(g, 28, 26, 8, 7, 2, '#8a5a3b'); break;
      case 'tide': rrf(g, 4, 44, 56, 16, 6, '#4fb4cf'); for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(6, 48 + i * 4); g.quadraticCurveTo(20, 45 + i * 4, 32, 48 + i * 4); g.quadraticCurveTo(46, 51 + i * 4, 58, 48 + i * 4); g.stroke(); } rrf(g, 28, 6, 8, 52, 2, '#fff'); for (let i = 0; i < 5; i++) rrf(g, 28, 8 + i * 10, 8, 5, 1, '#e0493f'); break;
      case 'windmill': poly(g, [22, 60, 26, 26, 38, 26, 42, 60], '#f4ead6'); g.fillStyle = '#b4566a'; g.beginPath(); g.arc(32, 26, 7, PI, TAU); g.fill(); rrf(g, 29, 48, 6, 12, 3, '#8a5a3b'); g.save(); g.translate(32, 24); for (let i = 0; i < 4; i++) { g.rotate(PI / 2); rrf(g, -2, -24, 4, 22, 1.5, '#8a5a3b'); rrf(g, 1.5, -23, 6, 18, 1, 'rgba(255,255,255,.85)'); } g.restore(); circ(g, 32, 24, 2.6, '#5a3d28'); break;
      case 'waterfall': rrf(g, 4, 6, 18, 40, 6, '#8d8372'); rrf(g, 42, 6, 18, 40, 6, '#8d8372'); rrf(g, 22, 6, 20, 42, 2, '#7fd3f4'); for (let i = 0; i < 4; i++) line(g, 25 + i * 5, 8, 25 + i * 5, 46, 'rgba(255,255,255,.7)', 1.4); ellf(g, 32, 52, 26, 8, '#4fb4cf'); ellf(g, 32, 49, 14, 3.5, 'rgba(255,255,255,.75)'); break;
      // items
      case 'plank': g.translate(32, 32); g.rotate(-.5); rrf(g, -26, -7, 52, 14, 3, '#c49563'); line(g, -24, -2, 24, -2, '#a77a4b', 1); line(g, -20, 3, 22, 3, '#a77a4b', 1); circ(g, 8, 0, 2, '#9b6e40'); break;
      case 'plastic': g.translate(32, 34); g.rotate(.5); rrf(g, -9, -18, 18, 32, 6, 'rgba(130,200,235,.85)'); rrf(g, -5, -25, 10, 8, 2, '#2f7fd1'); rrf(g, -9, -6, 18, 9, 2, '#e0493f'); ellf(g, -4, -10, 2, 7, 'rgba(255,255,255,.5)'); break;
      case 'gear': g.translate(32, 32); g.fillStyle = '#d4a33a'; for (let i = 0; i < 10; i++) { g.save(); g.rotate(i / 10 * TAU); g.fillRect(-4, -24, 8, 10); g.restore(); } circ(g, 0, 0, 18, '#d4a33a'); circ(g, 0, 0, 13, '#e8c060'); circ(g, 0, 0, 6, '#8a6a20'); circ(g, -5, -6, 3, 'rgba(255,255,255,.45)'); break;
      case 'oil': rrf(g, 20, 22, 24, 34, 7, '#3a7a5a'); rrf(g, 26, 10, 12, 14, 3, '#2f6a4c'); rrf(g, 24, 6, 16, 6, 2, '#8a6a20'); rrf(g, 23, 32, 18, 12, 2, '#f4ead6'); poly(g, [32, 34, 28, 40, 36, 40], '#f2a33a'); ellf(g, 25, 30, 2, 8, 'rgba(255,255,255,.35)'); break;
      case 'lens': { const gr = g.createRadialGradient(28, 26, 2, 32, 32, 24); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.5, '#c9f2ff'); gr.addColorStop(1, '#7cc7e8'); circ(g, 32, 32, 25, '#b08a3a'); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 21, 0, TAU); g.fill(); for (let i = 1; i < 4; i++) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; g.beginPath(); g.arc(32, 32, i * 5.5, 0, TAU); g.stroke(); } ellf(g, 24, 22, 6, 3, 'rgba(255,255,255,.8)', -.6); break; }
      case 'glasses': g.strokeStyle = '#6b3d2a'; g.lineWidth = 3; g.beginPath(); g.arc(20, 34, 11, 0, TAU); g.moveTo(55, 34); g.arc(44, 34, 11, 0, TAU); g.moveTo(29, 31); g.quadraticCurveTo(32, 27, 35, 31); g.stroke(); circ(g, 20, 34, 9.5, 'rgba(190,230,255,.55)'); circ(g, 44, 34, 9.5, 'rgba(190,230,255,.55)'); ellf(g, 17, 30, 3, 2, 'rgba(255,255,255,.8)', -.5); ellf(g, 41, 30, 3, 2, 'rgba(255,255,255,.8)', -.5); break;
      case 'honey': rrf(g, 16, 22, 32, 34, 8, '#f2a71c'); rrf(g, 18, 32, 28, 22, 6, '#f7bd3a'); rrf(g, 14, 14, 36, 10, 4, '#e8d5b0'); line(g, 14, 18, 50, 18, '#c8a56a', 1); rrf(g, 22, 34, 20, 12, 3, '#fff3d6'); g.translate(32, 40); g.scale(1.6, 1.6); AN.bee(g, .3); break;
      case 'berries': drawIcon(g, 'bilberry'); break;
      case 'seedling': poly(g, [18, 34, 46, 34, 42, 58, 22, 58], '#c46a3c'); rrf(g, 16, 30, 32, 7, 3, '#d97b48'); ellf(g, 32, 31, 13, 3, '#6b4a35'); stem(g, 32, 31, 32, 14, '#4f9444', 2.4); leaf(g, 32, 18, 14, 6, -.6, '#68b356'); leaf(g, 32, 22, 13, 6, PI + .5, '#5fae5f'); break;
      case 'shears': g.translate(32, 32); g.rotate(-.7); poly(g, [-3, -2, 3, -2, 1, -27, -1, -27], '#cfd6de'); g.rotate(.5); poly(g, [-3, -2, 3, -2, 1, -27, -1, -27], '#e3e8ee'); g.rotate(-.25); rrf(g, -10, 0, 8, 20, 4, '#e0493f'); rrf(g, 2, 0, 8, 20, 4, '#e0493f'); circ(g, 0, -1, 2.4, '#555'); break;
      case 'camera': rrf(g, 8, 20, 48, 32, 7, '#2b3038'); rrf(g, 20, 14, 16, 8, 3, '#2b3038'); circ(g, 34, 36, 12, '#4a5361'); circ(g, 34, 36, 8, '#7fb6dc'); circ(g, 31, 33, 2.6, 'rgba(255,255,255,.7)'); rrf(g, 44, 24, 8, 5, 2, '#f5c542'); break;
      case 'basket': g.strokeStyle = '#8a5a3b'; g.lineWidth = 3; g.beginPath(); g.arc(32, 34, 18, PI, TAU); g.stroke(); poly(g, [10, 32, 54, 32, 48, 58, 16, 58], '#c08a54'); for (let i = 0; i < 4; i++) line(g, 12, 38 + i * 5, 52, 38 + i * 5, '#a06e3c', 1.2); circ(g, 22, 30, 6, '#e0493f'); circ(g, 34, 28, 6, '#f5c542'); circ(g, 44, 31, 5, '#7cc46a'); rrf(g, 10, 30, 44, 5, 2, '#d9a066'); break;
      case 'lantern': { const gr = g.createRadialGradient(32, 38, 2, 32, 38, 22); gr.addColorStop(0, 'rgba(255,220,130,.9)'); gr.addColorStop(1, 'rgba(255,220,130,0)'); g.fillStyle = gr; g.fillRect(0, 10, 64, 54); g.strokeStyle = '#3a3f4a'; g.lineWidth = 2.4; g.beginPath(); g.arc(32, 16, 7, PI, TAU); g.stroke(); rrf(g, 20, 20, 24, 6, 2, '#3a3f4a'); rrf(g, 22, 26, 20, 24, 4, '#ffe28a'); line(g, 27, 26, 27, 50, '#3a3f4a', 1.6); line(g, 37, 26, 37, 50, '#3a3f4a', 1.6); rrf(g, 20, 50, 24, 6, 2, '#3a3f4a'); circ(g, 32, 38, 3.4, '#fff4c2'); break; }
      default: circ(g, 32, 32, 14, '#ccc');
    }
    g.restore();
  }
  const iconURL = {};
  function iconSrc(id, silhouette) {
    const key = id + (silhouette ? '_s' : ''); if (iconURL[key]) return iconURL[key];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.scale(2, 2); drawIcon(g, id);
    if (silhouette) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#c3cbd6'; g.fillRect(0, 0, 128, 128); }
    return (iconURL[key] = c.toDataURL());
  }

  /* ---------- object sprites ---------- */
  const TREE_PAL = [['#3c7436', '#4f9444', '#68b356', '#8fd06e'], ['#56782a', '#79a23a', '#97c04c', '#bfdc6c'], ['#2c6449', '#3d8460', '#55a374', '#7cc493'], ['#3c7436', '#4f9444', '#68b356', '#8fd06e']];
  function canopy(g, cols, blobs) {
    g.fillStyle = cols[0]; blobs.forEach(b => { g.beginPath(); g.arc(b[0], b[1], b[2] + 2.2, 0, TAU); g.fill(); });
    g.fillStyle = cols[1]; blobs.forEach(b => { g.beginPath(); g.arc(b[0], b[1], b[2], 0, TAU); g.fill(); });
    g.fillStyle = cols[2]; blobs.forEach(b => { g.beginPath(); g.arc(b[0] - b[2] * .16, b[1] - b[2] * .22, b[2] * .76, 0, TAU); g.fill(); });
    g.fillStyle = cols[3]; blobs.forEach(b => { g.beginPath(); g.arc(b[0] - b[2] * .34, b[1] - b[2] * .4, b[2] * .38, 0, TAU); g.fill(); });
  }
  const HOUSE_PAL = [['#fbe3d0', '#d9674e', '#b24a37'], ['#ecd9b8', '#5a7b9a', '#43607c'], ['#e9f2f7', '#4f9a8a', '#3a7a6c'], ['#fff2c9', '#b4566a', '#8f3f52'], ['#f2efe8', '#3f5f8f', '#2f4a72']];
  const HOUSE_WIN = [[-32, -40], [32, -40]];
  function drawHouse(g, v, small) {
    const p = HOUSE_PAL[v], s = small ? .82 : 1; g.save(); g.scale(s, s);
    poly(g, [-60, 0, 62, 0, 74, 10, -48, 10], SHADOW);
    rrf(g, -58, -62, 116, 62, 3, p[0]); g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(-58, -10, 116, 10);
    if (v === 1) for (let i = 0; i < 6; i++) line(g, -58, -52 + i * 9, 58, -52 + i * 9, 'rgba(120,80,40,.18)', 1);
    HOUSE_WIN.forEach(w => { rrf(g, w[0] - 12, w[1] - 10, 24, 22, 3, '#fff'); rrf(g, w[0] - 10, w[1] - 8, 20, 18, 2, '#9fd3ec'); line(g, w[0], w[1] - 8, w[0], w[1] + 10, '#fff', 2); line(g, w[0] - 10, w[1] + 1, w[0] + 10, w[1] + 1, '#fff', 2); rrf(g, w[0] - 13, w[1] + 12, 26, 6, 2, '#8a5a3b'); [-8, -2, 4, 9].forEach((x, i) => circ(g, w[0] + x, w[1] + 11, 3, ['#e0493f', '#f5c542', '#e98fb0', '#ffffff'][i])); });
    rrf(g, -11, -40, 22, 40, 10, p[2]); rrf(g, -8, -36, 16, 36, 8, shade(p[2], .12)); circ(g, 5, -18, 1.6, '#f5c542');
    poly(g, [-68, -58, 68, -58, 54, -116, -54, -116], p[1]);
    g.strokeStyle = shade(p[1], -.14); g.lineWidth = 1.4; for (let i = 1; i < 5; i++) { const y = -58 - i * 11.6, w = 68 - i * 2.8; g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y); g.stroke(); }
    poly(g, [-68, -58, 68, -58, 66, -54, -66, -54], shade(p[1], -.25)); rrf(g, -54, -119, 108, 6, 3, shade(p[1], -.2));
    rrf(g, 30, -132, 13, 22, 2, '#a35a45'); rrf(g, 28, -134, 17, 5, 2, '#7d4434');
    if (v === 0) { circ(g, -40, -74, 9, '#fff'); ellf(g, -40, -74, 6, 4, '#d9a066'); }
    if (v === 1) { rrf(g, -48, -82, 20, 10, 2, '#fff'); line(g, -45, -77, -31, -77, '#8a5a3b', 2); }
    g.restore();
  }
  const SPR = {
    tree: { w: 100, h: 118, ax: 50, ay: 108, d(g, v) { ellf(g, 8, -1, 30, 9, SHADOW); poly(g, [-6, 0, -4, -38, 4, -38, 6, 0], '#8a5a3b'); poly(g, [1, 0, 2, -38, 4, -38, 6, 0], '#6f4529'); },
      t(g, v) { canopy(g, TREE_PAL[v], [[-17, -52, 17], [17, -52, 17], [0, -64, 21], [-9, -79, 15], [10, -78, 15], [0, -46, 15]]); if (v === 3) [[-14, -50], [10, -60], [-2, -76], [16, -48], [-8, -64]].forEach(a => { circ(g, a[0], a[1], 3.6, '#e0493f'); circ(g, a[0] - 1, a[1] - 1, 1, '#ffb0a0'); }); } },
    oak: { w: 150, h: 150, ax: 75, ay: 140, d(g) { ellf(g, 10, -1, 44, 12, SHADOW); poly(g, [-11, 0, -7, -50, 7, -50, 11, 0], '#7a4e32'); poly(g, [2, 0, 3, -50, 7, -50, 11, 0], '#5f3b24'); line(g, -4, -46, -20, -60, '#7a4e32', 5); line(g, 4, -48, 22, -62, '#7a4e32', 5); },
      t(g) { canopy(g, ['#2f6230', '#3f7f3a', '#56a04a', '#7fc066'], [[-30, -66, 24], [30, -66, 24], [0, -82, 30], [-16, -104, 22], [18, -102, 22], [0, -60, 22], [-40, -86, 16], [40, -86, 16]]); } },
    pine: { w: 70, h: 120, ax: 35, ay: 110, d(g) { ellf(g, 7, -1, 22, 7, SHADOW); rrf(g, -4, -22, 8, 22, 2, '#7a4e32'); },
      t(g, v) { const c = v === 2 ? ['#24513c', '#2f6a4c', '#3f8560'] : ['#2b5a43', '#3a7457', '#4f9069']; for (let i = 0; i < 4; i++) { const y = -16 - i * 19, w = 27 - i * 5.5; poly(g, [-w - 2, y + 2, 0, y - 36, w + 2, y + 2], c[0]); poly(g, [-w, y, 0, y - 34, w, y], c[1]); poly(g, [-w, y, 0, y - 34, -w * .2, y - 2], c[2]); } } },
    palm: { w: 110, h: 120, ax: 40, ay: 110, d(g, v) { ellf(g, 18, -1, 24, 6, SHADOW); for (let i = 0; i < 9; i++) { const k = i / 8, x = k * k * 12, y = -k * 74; ellf(g, x, y, 5.6 - k * 1.4, 5, i % 2 ? '#a9794c' : '#93673f'); } },
      t(g, v) { const tx = 12, ty = -76; g.lineCap = 'round'; [[-1.1, 34], [-2.2, 30], [-.3, 36], [.5, 32], [2.6, 30], [-2.8, 26], [1.6, 34]].forEach(f => { g.save(); g.translate(tx, ty); g.rotate(f[0]); g.strokeStyle = '#3f8a46'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(f[1] * .5, -8, f[1], 6); g.stroke(); g.strokeStyle = '#5fae5f'; g.lineWidth = 4; g.stroke(); g.restore(); }); g.lineCap = 'butt'; circ(g, tx - 3, ty + 3, 3.6, '#6b4a2a'); circ(g, tx + 3, ty + 4, 3.6, '#7a5532'); } },
    bush: { w: 56, h: 40, ax: 28, ay: 34, d(g, v) { ellf(g, 4, -1, 22, 6, SHADOW); }, t(g, v) { canopy(g, TREE_PAL[v], [[-10, -11, 10], [10, -11, 10], [0, -17, 12]]); } },
    bushB: { w: 64, h: 48, ax: 32, ay: 40, d(g) { ellf(g, 4, -1, 24, 6, SHADOW); }, t(g) { canopy(g, ['#5c7a5c', '#7d9c7c', '#9bb79a', '#c3d6c2'], [[-12, -12, 11], [12, -12, 11], [0, -20, 13]]); [[-12, -14], [-4, -24], [6, -14], [14, -20], [0, -10], [-16, -6], [10, -6]].forEach(b => circ(g, b[0], b[1], 2.6, '#f28c28')); } },
    bushF: { w: 64, h: 56, ax: 32, ay: 48, d(g) { ellf(g, 4, -1, 24, 6, SHADOW); }, t(g) { canopy(g, TREE_PAL[0], [[-12, -12, 11], [12, -12, 11], [0, -20, 13]]); [[-12, -22], [-2, -32], [10, -26], [16, -16], [-18, -14]].forEach(b => { for (let i = 0; i < 4; i++) circ(g, b[0], b[1] + i * 3, 2.6 - i * .3, i % 2 ? '#9b6fd6' : '#b48ae8'); }); } },
    rock: { w: 60, h: 46, ax: 30, ay: 38, d(g, v) { const s = .7 + v * .25; g.save(); g.scale(s, s); ellf(g, 4, -2, 22, 6, SHADOW); ellf(g, 0, -12, 19, 13, '#8f969d'); ellf(g, -3, -15, 15, 10, '#a9b0b7'); ellf(g, -7, -19, 7, 4, '#c8ced4'); if (v === 2) ellf(g, 4, -22, 8, 3, '#7aa65a'); g.restore(); } },
    cliff: { w: 80, h: 70, ax: 40, ay: 58, d(g, v) { const s = .9 + v * .12; g.save(); g.scale(s, s); ellf(g, 5, -2, 28, 8, SHADOW); poly(g, [-26, -2, -28, -22, -16, -40, 4, -44, 22, -34, 28, -10, 22, -2], '#8f8573'); poly(g, [-20, -24, -12, -38, 4, -41, 18, -32, 4, -28], '#b2a790'); poly(g, [-14, -36, 0, -40, -4, -32], '#cdc3ab'); line(g, -22, -14, 20, -16, 'rgba(70,60,50,.3)', 1.4); if (v === 1) ellf(g, -6, -40, 9, 3, '#7aa65a'); g.restore(); } },
    basalt: { w: 80, h: 80, ax: 40, ay: 70, d(g) { ellf(g, 4, -1, 30, 8, SHADOW); for (let i = 0; i < 5; i++) { const x = -24 + i * 12, h = [30, 44, 36, 50, 28][i]; poly(g, [x - 6, 0, x - 6, -h, x + 6, -h, x + 6, 0], i % 2 ? '#555a63' : '#61666f'); poly(g, [x - 6, -h, x - 3, -h - 4, x + 3, -h - 4, x + 6, -h, x + 3, -h + 3, x - 3, -h + 3], '#8a909a'); } } },
    house: { w: 160, h: 160, ax: 80, ay: 145, d(g, v) { drawHouse(g, v); } },
    cottage: { w: 150, h: 140, ax: 75, ay: 125, d(g) { drawHouse(g, 4, true); } },
    shack: { w: 120, h: 110, ax: 60, ay: 96, d(g) {
      poly(g, [-48, 0, 50, 0, 60, 8, -38, 8], SHADOW); rrf(g, -46, -50, 92, 50, 2, '#a87b52'); for (let i = 0; i < 9; i++) line(g, -46 + i * 11.5, -50, -46 + i * 11.5, 0, 'rgba(70,45,25,.3)', 1);
      rrf(g, -8, -34, 18, 34, 2, '#6b4a35'); rrf(g, 20, -38, 18, 14, 2, '#9fd3ec'); poly(g, [-54, -46, 54, -46, 44, -84, -44, -84], '#6b4a35'); poly(g, [-54, -46, 54, -46, 52, -42, -52, -42], '#523726');
      g.strokeStyle = 'rgba(60,120,150,.8)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { line(g, -42 + i * 5, -42, -40 + i * 5, -10, 'rgba(60,120,150,.8)', 1); line(g, -44, -38 + i * 5, -16, -36 + i * 5, 'rgba(60,120,150,.8)', 1); }
      g.save(); g.translate(28, -60); g.scale(.7, .7); AN.fish(g, '#5fa3c9'); g.restore(); } },
    stall: { w: 110, h: 100, ax: 55, ay: 88, d(g, v) {
      const aw = v ? '#2fb3a3' : '#e85d5d'; ellf(g, 4, 0, 46, 7, SHADOW); line(g, -42, 0, -42, -72, '#8a5a3b', 3); line(g, 42, 0, 42, -72, '#8a5a3b', 3);
      rrf(g, -40, -26, 80, 26, 3, '#c08a54'); line(g, -40, -14, 40, -14, '#a06e3c', 1.2); rrf(g, -42, -30, 84, 6, 2, '#d9a066');
      (v ? [['#7cc46a', 5], ['#f5c542', 5], ['#e98fb0', 4]] : [['#e0493f', 5], ['#f28c28', 5], ['#7cc46a', 5]]).forEach((f, i) => { for (let j = 0; j < 5; j++) circ(g, -30 + i * 26 + (j % 3) * 7, -33 - ((j / 3) | 0) * 5, f[1], f[0]); });
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : aw; g.fillRect(-48 + i * 12, -84, 12, 18); g.beginPath(); g.arc(-42 + i * 12, -66, 6, 0, PI); g.fill(); }
      rrf(g, -48, -88, 96, 6, 3, shade(aw, -.2)); } },
    well: { w: 70, h: 90, ax: 35, ay: 80, d(g) { drawIconAt(g, 'well', 0, -34, 1.2); } },
    lantern: { w: 24, h: 66, ax: 12, ay: 60, d(g) { ellf(g, 2, 0, 7, 2.4, SHADOW); rrf(g, -2, -48, 4, 48, 2, '#35514a'); rrf(g, -5, -4, 10, 4, 2, '#35514a'); rrf(g, -6, -58, 12, 4, 2, '#35514a'); rrf(g, -5, -55, 10, 9, 2, '#fff1b8'); poly(g, [-7, -58, 0, -63, 7, -58], '#35514a'); } },
    windmill: { w: 90, h: 130, ax: 45, ay: 120, d(g) { ellf(g, 6, -1, 32, 8, SHADOW); poly(g, [-26, 0, -15, -88, 15, -88, 26, 0], '#f4ead6'); poly(g, [6, 0, 6, -88, 15, -88, 26, 0], '#e2d6bd'); rrf(g, -7, -28, 14, 28, 7, '#8a5a3b'); rrf(g, -6, -62, 12, 12, 6, '#9fd3ec'); g.fillStyle = '#b4566a'; g.beginPath(); g.arc(0, -88, 17, PI, TAU); g.fill(); } },
    boat: { w: 130, h: 100, ax: 65, ay: 70, d(g) {} },
    crate: { w: 34, h: 34, ax: 17, ay: 30, d(g) { ellf(g, 3, 0, 13, 3, SHADOW); rrf(g, -11, -22, 22, 22, 2, '#c08a54'); g.strokeStyle = '#8a5a3b'; g.lineWidth = 1.6; g.strokeRect(-10, -21, 20, 20); line(g, -10, -21, 10, -1, '#8a5a3b', 1.6); } },
    barrel: { w: 30, h: 38, ax: 15, ay: 34, d(g) { ellf(g, 3, 0, 11, 3, SHADOW); rrf(g, -9, -26, 18, 26, 6, '#a36b3c'); rrf(g, -9, -21, 18, 2.4, 1, '#5a4030'); rrf(g, -9, -7, 18, 2.4, 1, '#5a4030'); ellf(g, 0, -25, 8, 2.6, '#8a5a3b'); } },
    lighthouse: { w: 100, h: 210, ax: 50, ay: 198, d(g) {
      ellf(g, 10, -1, 38, 10, SHADOW); poly(g, [-28, 0, -18, -150, 18, -150, 28, 0], '#fbfbfb');
      for (let i = 0; i < 4; i++) { const y0 = -18 - i * 36, y1 = y0 - 18, w0 = 28 - (-y0) / 150 * 10, w1 = 28 - (-y1) / 150 * 10; poly(g, [-w0, y0, -w1, y1, w1, y1, w0, y0], '#e0493f'); }
      poly(g, [8, 0, 6, -150, 18, -150, 28, 0], 'rgba(0,0,0,.08)'); rrf(g, -7, -26, 14, 26, 7, '#6b4a35'); rrf(g, -4, -96, 8, 12, 4, '#9fd3ec');
      rrf(g, -25, -154, 50, 7, 3, '#3a3f4a'); for (let i = 0; i < 7; i++) line(g, -22 + i * 7.3, -160, -22 + i * 7.3, -153, '#3a3f4a', 1.4); line(g, -24, -160, 24, -160, '#3a3f4a', 1.6);
      rrf(g, -15, -180, 30, 26, 3, '#3a3f4a'); rrf(g, -12, -178, 24, 22, 2, '#d6eef7'); g.fillStyle = '#e0493f'; g.beginPath(); g.arc(0, -180, 17, PI, TAU); g.fill(); circ(g, 0, -198, 3, '#3a3f4a'); } },
    tent: { w: 90, h: 70, ax: 45, ay: 60, d(g) { poly(g, [-38, 0, 40, 0, 48, 6, -30, 6], SHADOW); poly(g, [-36, 0, 0, -50, 36, 0], '#f08a3c'); poly(g, [0, 0, 0, -50, 36, 0], '#d86f26'); poly(g, [-9, 0, 0, -30, 9, 0], '#5a3220'); line(g, 0, -50, 0, -56, '#8a5a3b', 2); } },
    campfire: { w: 40, h: 30, ax: 20, ay: 24, d(g) { for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ellf(g, Math.cos(a) * 11, -4 + Math.sin(a) * 4.4, 4, 3, '#8f969d'); } line(g, -9, -2, 9, -7, '#6f4529', 3.4); line(g, -9, -7, 9, -2, '#7a4e32', 3.4); } },
    beehive: { w: 40, h: 54, ax: 20, ay: 48, d(g) { ellf(g, 3, 0, 15, 4, SHADOW); line(g, -10, 0, -10, -12, '#8a5a3b', 3); line(g, 10, 0, 10, -12, '#8a5a3b', 3); rrf(g, -14, -14, 28, 4, 2, '#8a5a3b'); for (let i = 0; i < 5; i++) ellf(g, 0, -18 - i * 6, 14 - i * 2.2, 4.4, i % 2 ? '#e3b04b' : '#d39c38'); circ(g, 0, -44, 3, '#d39c38'); ellf(g, 0, -17, 3.4, 2.4, '#4a3020'); } },
    caveMouth: { w: 240, h: 130, ax: 120, ay: 110, d(g) {
      ellf(g, 0, 2, 100, 12, SHADOW);
      poly(g, [-104, 0, -112, -38, -88, -78, -46, -98, 6, -104, 56, -96, 96, -72, 112, -34, 104, 0], '#8f8573');
      poly(g, [-96, -40, -80, -72, -42, -90, 6, -96, 50, -88, 86, -66, 40, -62, -20, -64], '#aca18b');
      poly(g, [-60, -84, -20, -94, 20, -92, -10, -82], '#c8bea6'); ellf(g, -40, -92, 22, 6, '#7aa65a'); ellf(g, 30, -94, 18, 5, '#86b366');
      g.fillStyle = '#14101a'; g.beginPath(); g.moveTo(-22, 2); g.lineTo(-22, -26); g.quadraticCurveTo(0, -56, 22, -26); g.lineTo(22, 2); g.closePath(); g.fill();
      g.strokeStyle = '#6f6656'; g.lineWidth = 4; g.stroke(); line(g, -70, -30, -30, -34, 'rgba(70,60,50,.3)', 1.6); line(g, 34, -40, 80, -36, 'rgba(70,60,50,.3)', 1.6); } },
    vines: { w: 70, h: 70, ax: 35, ay: 64, d(g) {
      g.lineCap = 'round'; for (let i = 0; i < 9; i++) { const x = -22 + i * 5.5; g.strokeStyle = i % 2 ? '#3f7f3a' : '#4f9444'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, -52 + (i % 3) * 3); g.quadraticCurveTo(x + 4, -26, x - 2, 0); g.stroke(); for (let j = 0; j < 5; j++) leaf(g, x + (j % 2 ? 1 : -1), -46 + j * 10, 7, 3, j % 2 ? .6 : PI - .6, j % 2 ? '#68b356' : '#5a9e4c'); }
      g.lineCap = 'butt'; [[-14, -30], [8, -18], [16, -40], [-4, -44]].forEach(b => circ(g, b[0], b[1], 2.4, '#e98fb0')); } },
    sign: { w: 50, h: 60, ax: 25, ay: 54, d(g) { ellf(g, 2, 0, 8, 2.4, SHADOW); rrf(g, -2, -44, 4, 44, 2, '#8a5a3b'); poly(g, [-20, -44, 14, -44, 20, -39, 14, -34, -20, -34], '#d9a066'); poly(g, [20, -30, -14, -30, -20, -25, -14, -20, 20, -20], '#c08a54'); line(g, -14, -39, 8, -39, '#8a5a3b', 1.4); line(g, -10, -25, 14, -25, '#8a5a3b', 1.4); } },
    garden: { w: 120, h: 50, ax: 60, ay: 40, d(g) { for (let r = 0; r < 2; r++) { rrf(g, -52, -34 + r * 16, 104, 13, 5, '#7a5a3c'); rrf(g, -52, -34 + r * 16, 104, 4, 3, '#8f6d4c'); for (let i = 0; i < 7; i++) { const x = -44 + i * 15, y = -28 + r * 16; if (r) { circ(g, x, y, 5, '#7cc46a'); circ(g, x - 1, y - 1, 3, '#a6dc8a'); } else { stem(g, x, y + 3, x, y - 7, '#5fae5f', 1.6); poly(g, [x - 2, y + 2, x + 2, y + 2, x, y + 9], '#f28c28'); } } } } },
    tide: { w: 20, h: 70, ax: 10, ay: 62, d(g) { rrf(g, -3, -56, 6, 58, 2, '#fff'); for (let i = 0; i < 5; i++) rrf(g, -3, -54 + i * 11, 6, 5, 1, '#e0493f'); for (let i = 0; i < 6; i++) line(g, 3, -52 + i * 9, 6, -52 + i * 9, '#3a3f4a', 1); } },
    bench: { w: 50, h: 34, ax: 25, ay: 28, d(g) { ellf(g, 3, 0, 20, 3.4, SHADOW); line(g, -16, 0, -16, -8, '#5a4030', 2.4); line(g, 16, 0, 16, -8, '#5a4030', 2.4); rrf(g, -20, -12, 40, 5, 2, '#c08a54'); rrf(g, -20, -22, 40, 4, 2, '#a87b52'); rrf(g, -20, -16, 40, 3, 1, '#a87b52'); } },
    pedestal: { w: 40, h: 46, ax: 20, ay: 40, d(g) { ellf(g, 2, 0, 15, 4, 'rgba(0,0,0,.35)'); rrf(g, -12, -26, 24, 26, 3, '#6d6578'); rrf(g, -15, -30, 30, 6, 2, '#857c92'); rrf(g, -14, -4, 28, 4, 2, '#5a5366'); } },
    stalag: { w: 40, h: 56, ax: 20, ay: 48, d(g, v) { ellf(g, 2, 0, 12, 3, 'rgba(0,0,0,.35)'); const h = 26 + v * 8; poly(g, [-9, 0, -1, -h, 9, 0], '#7d7266'); poly(g, [-1, -h, 9, 0, 2, 0], '#655b51'); poly(g, [-4, -3, -1, -h * .7, 0, -3], 'rgba(255,255,255,.12)'); if (v === 2) { poly(g, [6, 0, 11, -14, 15, 0], '#7d7266'); } } },
    crystal: { w: 50, h: 56, ax: 25, ay: 48, d(g, v) { const c = v ? '#67d8f0' : '#b08af0'; ellf(g, 2, 0, 14, 4, 'rgba(0,0,0,.35)'); crystal(g, -8, 0, 4.5, 16, shade(c, -.1), -.35); crystal(g, 2, 0, 6, 24, c, .05); crystal(g, 10, 0, 4, 12, shade(c, .15), .4); } },
    flowers: { w: 40, h: 36, ax: 20, ay: 32, d(g) {} },
    net: { w: 4, h: 4, ax: 2, ay: 2, d(g) {} }, fence: { w: 4, h: 4, ax: 2, ay: 2, d(g) {} }
  };
  function drawIconAt(g, id, x, y, s) { g.save(); g.translate(x - 32 * s, y - 32 * s); g.scale(s, s); drawIcon(g, id); g.restore(); }

  /* ---------- ground chunk ---------- */
  const GC = { deep: '#3b9fc6', deep2: '#348fb8', shal: '#79cfd5', shal2: '#9fe0dc', foam: '#f3fbf7', wet: '#e5c993', sand: '#f4e1ae', grassE: '#7fbe62', grass: '#94cf72', forest: '#77b35f', meadow: '#a9d673', rockE: '#9a8f79', rock: '#bdb199', caveE: '#3a3446', cave: '#565068', void: '#17131f' };
  function renderChunk(cx, cy, SC, flags) {
    const W = WORLD, c = document.createElement('canvas'); c.width = c.height = Math.ceil(CHP * SC);
    const g = c.getContext('2d'); g.scale(SC, SC); g.translate(-cx * CHP, -cy * CHP);
    const tx0 = cx * CH - 2, ty0 = cy * CH - 2, tx1 = tx0 + CH + 4, ty1 = ty0 + CH + 4;
    const T_ = (tx, ty) => (tx < 0 || ty < 0 || tx >= MW || ty >= MH) ? TL.DEEP : W.tiles[ty * MW + tx];
    g.fillStyle = GC.deep; g.fillRect(cx * CHP, cy * CHP, CHP, CHP);
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) { if (T_(tx, ty) === TL.DEEP) { const h = hash(tx, ty, 21); if (h < .35) ellf(g, (tx + h * 2) * TS, (ty + .5) * TS, TS * .9, TS * .35, 'rgba(30,110,160,.18)'); } }
    const layer = (test, col, r, sq) => {
      g.fillStyle = col;
      for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
        if (!test(T_(tx, ty), tx, ty)) continue;
        if (sq && test(T_(tx + 1, ty)) && test(T_(tx - 1, ty)) && test(T_(tx, ty + 1)) && test(T_(tx, ty - 1))) { g.fillRect(tx * TS - .5, ty * TS - .5, TS + 1, TS + 1); continue; }
        const j = hash(tx, ty, 7), k = hash(tx, ty, 8);
        g.beginPath(); g.arc((tx + .5 + (j - .5) * .16) * TS, (ty + .5 + (k - .5) * .16) * TS, TS * (r + (j - .5) * .1), 0, TAU); g.fill();
      }
    };
    const isl = t => t !== TL.DEEP && t !== TL.VOID && t !== TL.CAVE && t !== TL.POOL;
    const land = t => isl(t) && t !== TL.SHAL;
    layer(isl, GC.shal, 1.0); layer(land, GC.shal2, .95);
    layer(land, GC.foam, .84); layer(land, GC.wet, .78, true); layer(land, GC.sand, .7, true);
    const green = t => t === TL.GRASS || t === TL.FOREST || t === TL.MEADOW || t === TL.COBBLE || t === TL.RIVER;
    layer(green, GC.grassE, .8); layer(green, GC.grass, .72, true);
    layer(t => t === TL.FOREST, GC.forest, .76, true); layer(t => t === TL.MEADOW, GC.meadow, .76, true);
    const rocky = t => t === TL.ROCK || t === TL.CLIFF;
    layer(rocky, GC.rockE, .82); layer(rocky, GC.rock, .74, true);
    // cave
    const cv = t => t === TL.VOID;
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) if (cv(T_(tx, ty))) { g.fillStyle = GC.void; g.fillRect(tx * TS - .5, ty * TS - .5, TS + 1, TS + 1); }
    const cfl = t => t === TL.CAVE || t === TL.POOL;
    layer(cfl, '#2a2534', 1.0); layer(cfl, GC.caveE, .88); layer(cfl, GC.cave, .74, true);
    layer(t => t === TL.POOL, '#2b6f8a', .7); layer(t => t === TL.POOL, '#3f8fae', .5);
    // tile details
    for (let ty = ty0 + 1; ty < ty1 - 1; ty++) for (let tx = tx0 + 1; tx < tx1 - 1; tx++) {
      const t = T_(tx, ty), bx = tx * TS, by = ty * TS;
      if (W.pathM[ty * MW + tx]) continue;
      for (let i = 0; i < 6; i++) {
        const h1 = hash(tx, ty, 30 + i), h2 = hash(tx, ty, 40 + i), h3 = hash(tx, ty, 50 + i), x = bx + h1 * TS, y = by + h2 * TS;
        if (t === TL.GRASS || t === TL.FOREST || t === TL.MEADOW) {
          const cc = t === TL.FOREST ? (h3 < .5 ? '#5f9a4c' : '#8cc46c') : (h3 < .5 ? '#7fbc60' : '#acdc86');
          line(g, x, y, x + (h3 - .5) * 4, y - 4 - h3 * 3, cc, 1.3);
          if (t === TL.MEADOW && i < 4) circ(g, x + 3, y - 2, 1.6 + h3, ['#ffffff', '#f5d548', '#f29ac0', '#b79cf0'][(h3 * 4) | 0]);
          if (t === TL.FOREST && i === 0 && h3 < .3) ellf(g, x, y, 3, 2, '#a0703f', h1 * 3);
        } else if (t === TL.SAND && i < 2) { if (h3 < .25) circ(g, x, y, 1.6, '#cbb48a'); else if (h3 < .32) { ellf(g, x, y, 3, 2.2, '#f2b9b0'); } else if (h3 > .8) { g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y + 6, 6, PI * 1.2, PI * 1.8); g.stroke(); } }
        else if (t === TL.ROCK && i < 3) { if (h3 < .4) ellf(g, x, y, 2.6, 1.8, '#a49880'); else if (h3 > .85) line(g, x, y, x + 7, y + 2, 'rgba(90,80,65,.35)', 1); }
        else if (t === TL.CAVE && i < 3) { if (h3 < .35) ellf(g, x, y, 2.4, 1.6, '#6c6580'); else if (h3 > .9) circ(g, x, y, 1, 'rgba(190,160,255,.5)'); }
      }
    }
    // river and pond
    const strokeRiver = (w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); RIVER.forEach((p, i) => i ? g.lineTo(p[0] * TS, p[1] * TS) : g.moveTo(p[0] * TS, p[1] * TS)); g.stroke(); circ(g, POND[0] * TS, POND[1] * TS, POND[2] * TS - (2.6 * TS - w) / 2 + 6, c); };
    strokeRiver(2.7 * TS, '#6aa65f'); strokeRiver(2.45 * TS, '#c9b07c'); strokeRiver(2.1 * TS, '#4aaecb'); strokeRiver(1.3 * TS, '#62c2d9'); strokeRiver(.45 * TS, 'rgba(255,255,255,.12)');
    // lily pads
    [[18.4, 28.2], [19.3, 28.9], [20.2, 28.3], [17.6, 28.8], [12.6, 29.6]].forEach((p, i) => { ellf(g, p[0] * TS, p[1] * TS, 9, 6, '#4a9a5c'); poly(g, [p[0] * TS, p[1] * TS, p[0] * TS + 9, p[1] * TS - 3, p[0] * TS + 9, p[1] * TS + 2], '#62c2d9'); if (i % 2 === 0) { circ(g, p[0] * TS - 2, p[1] * TS - 2, 3.2, '#fbd3e3'); circ(g, p[0] * TS - 2, p[1] * TS - 2, 1.4, '#f5c542'); } });
    // paths
    g.lineCap = 'round'; g.lineJoin = 'round';
    const strokePaths = (w, c) => { g.strokeStyle = c; g.lineWidth = w; PATHS.forEach(p => { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0] * TS, q[1] * TS) : g.moveTo(q[0] * TS, q[1] * TS)); g.stroke(); }); };
    strokePaths(1.75 * TS, '#c9a873'); strokePaths(1.45 * TS, '#dcc08e');
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && W.pathM[ty * MW + tx] === 1) for (let i = 0; i < 3; i++) { const h = hash(tx, ty, 60 + i); circ(g, (tx + h) * TS, (ty + hash(tx, ty, 70 + i)) * TS, 1.4 + h, h < .5 ? '#c4a26e' : '#ead3a6'); }
    circ(g, PLAZA[0] * TS, PLAZA[1] * TS, PLAZA[2] * TS + 4, '#b8a990'); circ(g, PLAZA[0] * TS, PLAZA[1] * TS, PLAZA[2] * TS, '#d6cab3');
    for (let r = 1; r < 4; r++) { const n = r * 9; for (let i = 0; i < n; i++) { const a = i / n * TAU + r, rad = r * .85 * TS + 4, x = PLAZA[0] * TS + Math.cos(a) * rad, y = PLAZA[1] * TS + Math.sin(a) * rad; g.save(); g.translate(x, y); g.rotate(a); rrf(g, -6, -4, 12, 8, 3, hash(i, r, 80) < .5 ? '#c9bca4' : '#e2d8c4'); g.restore(); } }
    // dock
    g.fillStyle = 'rgba(20,60,90,.25)'; g.fillRect(DOCK.x0 * TS + 6, DOCK.y0 * TS + 52, (DOCK.x1 - DOCK.x0) * TS, (DOCK.y1 - DOCK.y0) * TS - 40);
    rrf(g, DOCK.x0 * TS, DOCK.y0 * TS, (DOCK.x1 - DOCK.x0) * TS, (DOCK.y1 - DOCK.y0) * TS, 3, '#b98b5c');
    for (let y = DOCK.y0 * TS + 8; y < DOCK.y1 * TS; y += 9) line(g, DOCK.x0 * TS, y, DOCK.x1 * TS, y, '#9a6f45', 1.2);
    [[DOCK.x0, 52], [DOCK.x1, 52], [DOCK.x0, 54.8], [DOCK.x1, 54.8]].forEach(p => circ(g, p[0] * TS, p[1] * TS, 5, '#6f4a2e'));
    // bridge
    const bx0 = BRIDGE.x0 * TS, bx1 = BRIDGE.x1 * TS, by0 = BRIDGE.y0 * TS, by1 = BRIDGE.y1 * TS;
    g.fillStyle = 'rgba(20,60,90,.22)'; g.fillRect(bx0 + 6, by0 + 30, bx1 - bx0, by1 - by0 - 50);
    if (flags.bridge) {
      rrf(g, bx0, by0, bx1 - bx0, by1 - by0, 3, '#c08a54');
      for (let y = by0 + 7; y < by1; y += 8.5) line(g, bx0, y, bx1, y, '#9a6f45', 1.2);
      rrf(g, bx0 - 6, by0, 6, by1 - by0, 2, '#7a4e32'); rrf(g, bx1, by0, 6, by1 - by0, 2, '#7a4e32');
      for (let y = by0; y <= by1; y += (by1 - by0) / 4) { circ(g, bx0 - 3, y, 4.2, '#5f3b24'); circ(g, bx1 + 3, y, 4.2, '#5f3b24'); }
    } else {
      [[by0, 26], [by1 - 22, 22]].forEach(s => { rrf(g, bx0, s[0], bx1 - bx0, s[1], 3, '#a98a64'); for (let y = s[0] + 6; y < s[0] + s[1]; y += 8) line(g, bx0, y, bx1, y, '#86684a', 1.2); });
      [[by0 + 50, -.3], [by0 + 78, .25], [by0 + 104, -.15]].forEach((p, i) => { if (i === 1) return; g.save(); g.translate(bx0 + 20 + i * 14, p[0]); g.rotate(p[1]); rrf(g, -18, -4, 36, 8, 2, '#a98a64'); g.restore(); });
      for (let y = by0; y <= by1; y += (by1 - by0) / 4) { circ(g, bx0 - 3, y, 4.2, '#5f3b24'); circ(g, bx1 + 3, y, 4.2, '#5f3b24'); }
    }
    return c;
  }


  /* =====================================================================================
     Runtime
     ===================================================================================== */
  const DAY = 360, PR = 11, SPEED = 132;
  // 0–210 day · 210–240 dusk · 240–330 night · 330–360 dawn
  function darkness(c) { if (c < 210) return 0; if (c < 240) return (c - 210) / 30; if (c < 330) return 1; return 1 - (c - 330) / 30; }
  function stamp(r, g, b) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.45, `rgba(${r},${g},${b},.55)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return c; }
  function beamStamp(r, g, b) { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, `rgba(${r},${g},${b},.95)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.filter = 'blur(6px)'; x.beginPath(); x.moveTo(8, 60); x.lineTo(500, 14); x.lineTo(500, 114); x.lineTo(8, 68); x.closePath(); x.fill(); return c; }
  let STAMPS = null;

  function mount(root, ctx) {
    const s = Kit.strings(STR);
    const W = buildWorld();
    STAMPS = STAMPS || { cut: stamp(255, 255, 255), warm: stamp(255, 186, 110), violet: stamp(190, 150, 255), cyan: stamp(120, 230, 255), green: stamp(190, 255, 120), beamCut: beamStamp(255, 255, 255), beamWarm: beamStamp(255, 230, 150) };
    const fresh = () => ({ v: 1, av: 0, x: 24.1 * TS, y: 53.6 * TS, dir: 3, zone: 'i', clock: 25, q: {}, inv: {}, j: [], picked: [], planted: [], photos: [], f: {}, track: null });
    let st = ctx.data.ex && ctx.data.ex.v === 1 ? ctx.data.ex : fresh();
    let started = !!(ctx.data.ex && ctx.data.ex.v === 1);
    ['q', 'inv', 'f'].forEach(k => { st[k] = st[k] || {}; }); ['j', 'picked', 'planted', 'photos'].forEach(k => { st[k] = st[k] || []; });
    G.st = st; walkGrid = null;

    /* ---------- DOM ---------- */
    root.innerHTML = '';
    const el = document.createElement('div'); el.className = 'ex';
    el.innerHTML = `<div class="ex-stage">
      <canvas class="ex-cv"></canvas>
      <div class="ex-hud"><div class="ex-row">
        <button class="ex-hb" data-p="quests" aria-label="${s('quests')}">📜</button>
        <button class="ex-hb" data-p="journal" aria-label="${s('journal')}">📖<i class="ex-pct">0%</i></button>
        <button class="ex-hb" data-p="bag" aria-label="${s('bag')}">🎒<i class="ex-cnt"></i></button>
        <span class="ex-sp"></span><span class="ex-clock">☀️</span>
        <button class="ex-hb" data-a="map" aria-label="Map">🗺️</button>
        <button class="ex-hb" data-a="rules" aria-label="${Kit.t('rules')}">?</button>
      </div><button class="ex-track"></button></div>
      <canvas class="ex-mini"></canvas>
      <div class="ex-area"></div>
      <div class="ex-joy"><i></i></div>
      <button class="ex-act" aria-label="Action"><span>✋</span><small></small></button>
      <div class="ex-card"></div>
      <div class="ex-dlg hide"><canvas width="132" height="132"></canvas><div class="ex-dn"><b></b><small></small></div><p></p><i class="ex-more">▼</i></div>
      <div class="ex-panel hide"><div class="ex-ph"><div class="ex-tabs"></div><button class="ex-x" aria-label="${Kit.t('close')}">✕</button></div><div class="ex-pb"></div></div>
      <div class="ex-flash"></div><div class="ex-fade"></div><div class="ex-start hide"></div>
    </div>`;
    root.appendChild(el);
    const $ = q => el.querySelector(q);
    const stage = $('.ex-stage'), cv = $('.ex-cv'), g = cv.getContext('2d');
    const mini = $('.ex-mini'), mg = mini.getContext('2d');
    const dlgEl = $('.ex-dlg'), dlgCv = dlgEl.querySelector('canvas'), dlgP = dlgEl.querySelector('p');
    const panel = $('.ex-panel'), pbody = $('.ex-pb'), actBtn = $('.ex-act'), joyEl = $('.ex-joy'), trackEl = $('.ex-track'), areaEl = $('.ex-area'), cardEl = $('.ex-card'), fadeEl = $('.ex-fade'), flashEl = $('.ex-flash'), startEl = $('.ex-start');
    const lc = document.createElement('canvas'), lg = lc.getContext('2d');
    let vw = 380, vh = 560, dpr = 1;
    const sprites = new Map(), chunks = new Map();
    function resize() {
      const r = stage.getBoundingClientRect(); vw = Math.max(200, r.width | 0); vh = Math.max(200, r.height | 0);
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nd !== dpr) { dpr = nd; sprites.clear(); chunks.clear(); iconSprs.clear(); }
      cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
      lc.width = Math.ceil(vw / 2); lc.height = Math.ceil(vh / 2);
    }
    const ro = new ResizeObserver(resize); ro.observe(stage);

    /* ---------- entities ---------- */
    const pl = { x: st.x, y: st.y, dir: st.dir || 0, ph: 0, moving: false, _k: 'pl' };
    const look = () => AVATARS[st.av || 0].look;
    const npcs = NPCS.map(n => ({ id: n.id, x: n.x * TS, y: n.y * TS, hx: n.x * TS, hy: n.y * TS, look: n.look, kid: n.kid, animal: n.animal, dir: 0, cr: n.animal ? 9 : 13, t: Math.random() * 6, tx: null, ty: null, wait: 2, _k: 'npc' }));
    const npcById = {}; npcs.forEach(n => { npcById[n.id] = n; });
    const animals = ANIMALS_DEF.map(a => ({ k: a.k, x: a.x * TS, y: a.y * TS, hx: a.x * TS, hy: a.y * TS, r: a.r * TS, sp: a.sp || 0, tx: null, ty: null, wait: Math.random() * 2, f: 1, moving: false, extra: a.extra, zone: a.x > ISW ? 'c' : 'i', strike: 0, sk: 4 + Math.random() * 4, _k: 'an' }));
    const picks = PICKUPS.map(p => Object.assign({ _k: 'pick', zone: p.x > ISW * TS ? 'c' : 'i' }, p));
    const spots = DSPOTS.filter(d => d.look !== 'animal').map(d => Object.assign({ _k: 'disc', zone: d.x > ISW * TS ? 'c' : 'i' }, d));
    const soils = SOIL.map((p, i) => ({ _k: 'soil', i, x: p[0] * TS, y: p[1] * TS }));
    const DS = {}; DSPOTS.forEach(d => { DS[d.id] = d; });

    /* ---------- inventory & quests ---------- */
    const cnt = id => st.inv[id] || 0, has = id => cnt(id) > 0;
    const iname = id => tl(ITEMS[id].n);
    let dirty = true;
    function save() { st.x = pl.x; st.y = pl.y; st.dir = pl.dir; if (started) { ctx.data.ex = st; ctx.save(); } dirty = false; }
    function give(id, n, quiet) { st.inv[id] = cnt(id) + (n || 1); if (!quiet) floatText(pl.x, pl.y - 60, '+ ' + iname(id)); pulse('[data-p="bag"]'); dirty = true; }
    function take(id, n) { st.inv[id] = Math.max(0, cnt(id) - (n || 1)); if (!st.inv[id]) delete st.inv[id]; }
    function startQuest(id) {
      if (st.q[id]) return; st.q[id] = 1; st.track = id; banner('📜 ' + s('questNew', { q: tl(QUESTS[id].t) })); ctx.sound('bell'); pulse('[data-p="quests"]');
      if (id === 'crystal' && (has('lens') || st.q.lamp === 2)) completeQuest('crystal');
      save();
    }
    const rewards = [];
    function completeQuest(id, quiet) {
      if (st.q[id] === 2) return; st.q[id] = 2; if (st.track === id) st.track = null;
      if (quiet) ctx.stars(QUESTS[id].st, true); else rewards.push(id);
      if (id === 'lamp') ctx.badge('explorer_story');
      save(); flushRewards();
    }
    function modalOpen() { const m = document.getElementById('modal-root'); return !!(m && m.children.length); }
    function flushRewards() {
      if (!alive || dlg || modalOpen() || !rewards.length) return;
      const id = rewards.shift();
      if (id === 'journal') { ctx.badge('explorer_journal'); Kit.result(ctx, { result: 'win', title: s('journalT'), lines: [s('journalL', { t: JOURNAL.length })], stars: 20, againLabel: s('cont'), onAgain: () => setTimeout(flushRewards, 60) }); return; }
      const Q = QUESTS[id];
      Kit.result(ctx, { result: 'win', title: id === 'lamp' ? s('storyT') : s('questDone'), lines: id === 'lamp' ? [s('story1'), s('story2')] : [Q.ic + ' ' + tl(Q.t)], stars: Q.st, againLabel: s('cont'), onAgain: () => setTimeout(flushRewards, 60) });
    }
    function discover(id) {
      if (st.j.includes(id)) return false;
      st.j.push(id); showCard(id, true); ctx.sound('rare'); updateHud(true);
      if (st.j.length % 10 === 0 && st.j.length < JOURNAL.length) { ctx.stars(2); banner('📖 ' + s('milestone', { n: st.j.length })); }
      if (st.j.length === JOURNAL.length) rewards.push('journal');
      save(); setTimeout(flushRewards, 900); return true;
    }
    function trackedId() { if (st.track && st.q[st.track] === 1) return st.track; for (const id of QORDER) if (st.q[id] === 1) return id; return null; }
    function pos(id) { const n = npcById[id]; return n ? [n.x, n.y] : DS[id] ? [DS[id].x, DS[id].y] : null; }
    function nearestPick(item) { let b = null, bd = 1e12; picks.forEach(p => { if (p.item !== item || st.picked.includes(p.id)) return; const d = (p.x - pl.x) ** 2 + (p.y - pl.y) ** 2; if (d < bd) { bd = d; b = [p.x, p.y]; } }); return b; }
    function animalPos(k) { let b = null, bd = 1e12; animals.forEach(a => { if (a.k !== k) return; const d = (a.x - pl.x) ** 2 + (a.y - pl.y) ** 2; if (d < bd) { bd = d; b = [a.x, a.y]; } }); return b; }
    const list = ids => ids.map(iname).join(', ');
    function objective(id) {
      switch (id) {
        case 'welcome': return { t: s('oWelcome'), p: pos('tomek') };
        case 'bridge': return cnt('plank') >= 4 ? { t: s('oPlanksBack'), p: pos('tomek') } : { t: s('oPlanks', { n: cnt('plank') }), p: nearestPick('plank') };
        case 'beach': return cnt('plastic') >= 6 ? { t: s('oPlasticBack'), p: pos('fynn') } : { t: s('oPlastic', { n: cnt('plastic') }), p: nearestPick('plastic') };
        case 'glasses': return has('glasses') ? { t: s('oGlassesBack'), p: pos('rosa') } : { t: s('oGlasses'), p: nearestPick('glasses') };
        case 'recipe': { const m = ['honey', 'berries', 'mint'].filter(i => !has(i)); return m.length ? { t: s('oRecipe', { list: list(m) }), p: pos({ honey: 'bee', berries: 'bilberry', mint: 'mint' }[m[0]]) } : { t: s('oRecipeBack'), p: pos('rosa') }; }
        case 'trees': { const i = SOIL.findIndex((p, k) => !st.planted.includes(k)); return i < 0 ? { t: s('oTreesBack'), p: pos('ida') } : { t: s('oTrees', { n: st.planted.length }), p: [SOIL[i][0] * TS, SOIL[i][1] * TS] }; }
        case 'hedgehog': return has('shears') ? { t: s('oHogBack'), p: pos('pikko') } : { t: s('oHog'), p: pos('ida') };
        case 'photos': { const m = PHOTO_ANIMALS.filter(a => !st.photos.includes(a)); return m.length ? { t: s('oPhotos', { n: st.photos.length }), p: animalPos(m[0]) } : { t: s('oPhotosBack'), p: pos('kai') }; }
        case 'delivery': return { t: s('oDelivery'), p: pos('lotta') };
        case 'rocks': { const m = ['quartz', 'basalt', 'amethyst'].filter(i => !has(i)); return m.length ? { t: s('oRocks', { n: 3 - m.length }), p: pos(m[0]) } : { t: s('oRocksBack'), p: pos('lotta') }; }
        case 'crystal': if (!st.f.vines) return { t: s('oVines'), p: [29.6 * TS, 14.4 * TS] }; if (!has('lantern')) return { t: s('oLantern'), p: pos(has('basket') || st.q.delivery ? 'lotta' : 'mira') }; return { t: s('oLens'), p: [57.6 * TS, 4.5 * TS] };
        case 'lamp': { const n = ['gear', 'oil', 'lens'].filter(has).length; return n === 3 ? { t: s('oLampBack'), p: pos('hanno') } : { t: s('oLamp', { n }), p: null }; }
      }
      return { t: '', p: null };
    }
    function zoneTarget(p) { if (!p) return null; const inCave = p[0] > ISW * TS; if (st.zone === 'i' && inCave) return [29.6 * TS, 14.3 * TS]; if (st.zone === 'c' && !inCave) return [56 * TS, 23.4 * TS]; return p; }
    function marker(id) {
      const q = st.q;
      switch (id) {
        case 'marla': return q.lamp === 2 && !st.f.final ? 'ready' : null;
        case 'tomek': return q.welcome === 1 || (q.bridge === 1 && cnt('plank') >= 4) ? 'ready' : !q.bridge ? 'offer' : null;
        case 'fynn': return !q.beach ? 'offer' : q.beach === 1 && cnt('plastic') >= 6 ? 'ready' : null;
        case 'rosa': return !q.glasses ? 'offer' : q.glasses === 1 && has('glasses') ? 'ready' : q.glasses === 2 && !q.recipe ? 'offer' : q.recipe === 1 && has('honey') && has('berries') && has('mint') ? 'ready' : null;
        case 'mira': return !q.delivery ? 'offer' : null;
        case 'lotta': return has('basket') && q.delivery === 1 ? 'ready' : !q.rocks ? 'offer' : q.rocks === 1 && has('quartz') && has('basalt') && has('amethyst') ? 'ready' : null;
        case 'ida': return !q.trees ? 'offer' : q.trees === 1 && st.planted.length >= 4 ? 'ready' : null;
        case 'kai': return !q.photos ? 'offer' : q.photos === 1 && st.photos.length >= 5 ? 'ready' : null;
        case 'pikko': return !q.hedgehog ? 'offer' : q.hedgehog === 1 && has('shears') ? 'ready' : null;
        case 'hanno': return !q.lamp ? 'offer' : q.lamp === 1 && has('gear') && has('oil') && has('lens') ? 'ready' : null;
      }
      return null;
    }

    /* ---------- dialogue ---------- */
    let dlg = null;
    const fill = (txt, v) => { if (v) for (const k in v) txt = txt.replace(new RegExp('\\{' + k + '\\}', 'g'), v[k]); return txt; };
    function say(who, lines, fx) {
      if (!lines.length) { if (fx) fx(); return; }
      dlg = { who, lines, i: 0, shown: 0, fx };
      const info = NPC_INFO[who];
      dlgEl.querySelector('b').textContent = info ? tl(info.n) : AVATARS[st.av || 0].n;
      dlgEl.querySelector('small').textContent = info ? tl(info.r) : '';
      if (who !== 'self' && npcById[who] && !npcById[who].animal) { const P = Object.assign({}, npcById[who].look); if (who === 'rosa') P.glasses = st.q.glasses === 2; portrait(dlgCv, who, P); }
      else portrait(dlgCv, who === 'pikko' ? 'pikko' : 'self', look());
      dlgEl.classList.remove('hide'); dlgP.textContent = ''; ctx.sound('pop'); path = null;
    }
    function advance() {
      if (!dlg) return;
      const full = dlg.lines[dlg.i];
      if (dlg.shown < full.length) { dlg.shown = full.length; dlgP.textContent = full; return; }
      dlg.i++; dlg.shown = 0;
      if (dlg.i >= dlg.lines.length) { const fx = dlg.fx; dlg = null; dlgEl.classList.add('hide'); if (fx) fx(); setTimeout(flushRewards, 250); }
      else ctx.sound('tap');
    }
    const thought = key => say('self', [s(key)]);
    function talk(n) {
      const id = n.id, q = st.q, L = [], fx = [];
      const add = (key, v) => tl(D[id][key]).forEach(x => L.push(fill(x, v)));
      if (id === 'pikko') discover('hedgehog');
      switch (id) {
        case 'marla':
          if (!st.f.intro) { add('intro'); fx.push(() => { st.f.intro = 1; startQuest('welcome'); }); }
          else if (q.lamp === 2) { add('final'); fx.push(() => { st.f.final = 1; }); } else add('idle'); break;
        case 'tomek':
          if (q.welcome === 1) fx.push(() => completeQuest('welcome'));
          if (!q.bridge) { add('offer'); fx.push(() => startQuest('bridge')); }
          if (q.bridge !== 2) { if (cnt('plank') >= 4) { add('complete'); fx.push(() => { take('plank', 4); fixBridge(); completeQuest('bridge'); }); } else if (q.bridge === 1) add('progress', { n: 4 - cnt('plank') }); }
          else add('idle'); break;
        case 'fynn':
          if (!q.beach) { add('offer'); fx.push(() => startQuest('beach')); }
          if (q.beach !== 2) { if (cnt('plastic') >= 6) { add('complete'); fx.push(() => { take('plastic', 6); give('gear'); completeQuest('beach'); }); } else if (q.beach === 1) add('progress', { n: 6 - cnt('plastic') }); }
          else add('idle'); break;
        case 'rosa': {
          let gDone = q.glasses === 2;
          if (!gDone) {
            if (has('glasses')) { add('complete'); gDone = true; fx.push(() => { st.q.glasses = st.q.glasses || 1; take('glasses'); completeQuest('glasses'); }); }
            else if (!q.glasses) { add('offer'); fx.push(() => startQuest('glasses')); } else add('progress');
          }
          if (gDone) {
            const ready = has('honey') && has('berries') && has('mint');
            if (!q.recipe) { add('offer2'); fx.push(() => startQuest('recipe')); }
            if (q.recipe !== 2) { if (ready) { add('complete2'); fx.push(() => { take('honey'); take('berries'); take('mint'); give('oil'); completeQuest('recipe'); }); } else if (q.recipe === 1) add('progress2', { list: list(['honey', 'berries', 'mint'].filter(i => !has(i))) }); }
            else if (q.glasses === 2) add('idle');
          }
          break; }
        case 'mira':
          if (!q.delivery) { add('offer'); fx.push(() => { startQuest('delivery'); give('basket'); }); } else if (q.delivery === 1) add('progress'); else add('idle'); break;
        case 'lotta': {
          if (!st.f.metLotta) { add('hello'); fx.push(() => { st.f.metLotta = 1; }); }
          if (q.delivery === 1 && has('basket')) { add('delivery'); fx.push(() => { take('basket'); give('lantern'); completeQuest('delivery'); }); }
          const ready = has('quartz') && has('basalt') && has('amethyst');
          if (!q.rocks) { add('offer'); fx.push(() => startQuest('rocks')); }
          if (q.rocks !== 2) { if (ready) { add('complete'); fx.push(() => { take('quartz'); take('basalt'); take('amethyst'); completeQuest('rocks'); }); } else if (q.rocks === 1) add('progress', { list: list(['quartz', 'basalt', 'amethyst'].filter(i => !has(i))) }); }
          else if (!L.length) add('idle');
          break; }
        case 'ida':
          if (!q.trees) { add('offer'); fx.push(() => { startQuest('trees'); give('seedling', 4); }); }
          else if (q.trees === 1) { if (st.planted.length >= 4) { add('complete'); fx.push(() => { give('shears'); completeQuest('trees'); }); } else add('progress', { n: 4 - st.planted.length }); }
          else add('idle'); break;
        case 'kai':
          if (!q.photos) { add('offer'); fx.push(() => { startQuest('photos'); give('camera'); }); }
          else if (q.photos === 1) { if (st.photos.length >= 5) { add('complete'); fx.push(() => completeQuest('photos')); } else add('progress', { n: st.photos.length, list: PHOTO_ANIMALS.filter(a => !st.photos.includes(a)).map(a => tl(JMAP[a].n)).join(', ') }); }
          else add('idle'); break;
        case 'pikko':
          if (!q.hedgehog) { add('offer'); fx.push(() => startQuest('hedgehog')); }
          if (q.hedgehog !== 2) { if (has('shears')) { add('complete'); fx.push(() => { ctx.sound('leaf'); burst(n.x, n.y - 8, ['#5aa0b8', '#cfe8f0'], 14); completeQuest('hedgehog'); startQuest('crystal'); }); } else if (q.hedgehog === 1) add('progress'); }
          else add('idle'); break;
        case 'hanno': {
          const ready = has('gear') && has('oil') && has('lens');
          if (!q.lamp) { add('offer'); fx.push(() => startQuest('lamp')); }
          if (q.lamp !== 2) { if (ready) { add('complete'); fx.push(() => { take('gear'); take('oil'); take('lens'); st.f.lamp = 1; st.clock = 214; ctx.sound('zap'); completeQuest('lamp'); }); } else if (q.lamp === 1) add('progress', { list: list(['gear', 'oil', 'lens'].filter(i => !has(i))) }); }
          else add('idle'); break; }
      }
      n.dir = dirTo(n, pl);
      say(id, L, () => { fx.forEach(f => f()); save(); });
    }

    /* ---------- world actions ---------- */
    function fixBridge() { st.f.bridge = 1; chunks.clear(); walkGrid = null; miniBase = null; banner('🌉 ' + tl(JMAP.bridge.n)); [0, 260, 520].forEach(ms => later(() => ctx.sound('place'), ms)); burst(24.1 * TS, 28.6 * TS, ['#c08a54', '#f4e1ae', '#ffffff'], 24); shake = 6; }
    function inspect(dsp, animal) {
      const id = dsp.id;
      if (dsp.dark && st.zone === 'c' && !has('lantern')) { thought('dark'); return; }
      let did = false;
      if (dsp.give && st.q[dsp.q] === 1 && !has(dsp.give)) { give(dsp.give); ctx.sound('coin'); did = true; }
      if (dsp.photo && st.q.photos === 1 && has('camera') && !st.photos.includes(id)) {
        st.photos.push(id); did = true; flashEl.classList.remove('on'); void flashEl.offsetWidth; flashEl.classList.add('on'); ctx.sound('glass');
        banner('📷 ' + s('photo', { a: tl(JMAP[id].n) }) + ` (${st.photos.length}/5)`); dirty = true;
      }
      if (!discover(id) && !did) showCard(id, false);
      if (animal && animal.k === 'heron') animal.strike = .01;
    }
    function pickup(p) {
      if (p.item === 'lens' && !has('lantern')) { thought('dark'); return; }
      st.picked.push(p.id); give(p.item); ctx.sound('coin', st.picked.length % 6 + 1); burst(p.x, p.y - 12, ['#fff6c2', '#ffd36b', '#ffffff'], 10);
      if (p.item === 'lens' && st.q.crystal === 1) completeQuest('crystal');
      save();
    }
    function plant(sp) {
      if (!has('seedling')) { thought('soil'); return; }
      take('seedling'); st.planted.push(sp.i); ctx.sound('plant'); burst(sp.x, sp.y - 8, ['#7cc46a', '#a6dc8a', '#8a5a3b'], 12); banner('🌱 ' + s('planted') + ` (${st.planted.length}/4)`); save();
    }
    function vines() {
      if (st.q.hedgehog !== 2) { thought('vines'); return; }
      if (!has('shears')) { thought('needShears'); return; }
      st.f.vines = 1; walkGrid = null; ctx.sound('leaf'); later(() => ctx.sound('leaf'), 180); burst(29.6 * TS, 13.2 * TS, ['#4f9444', '#68b356', '#e98fb0'], 26); say('self', [s('vinesCut')]); save();
    }

    /* ---------- interactables ---------- */
    const inter = [];
    npcs.forEach(n => inter.push({ id: n.id, zone: 'i', ref: n, x: () => n.x, y: () => n.y, bh: n.animal ? 26 : 56, active: () => true, act: () => talk(n), kind: 'npc' }));
    picks.forEach(p => inter.push({ id: p.id, zone: p.zone, ref: p, x: () => p.x, y: () => p.y, bh: 30, active: () => !st.picked.includes(p.id), act: () => pickup(p), kind: 'pick' }));
    const canDisc = d => !st.j.includes(d.id) || (d.give && st.q[d.q] === 1 && !has(d.give)) || (d.photo && st.q.photos === 1 && has('camera') && !st.photos.includes(d.id));
    spots.forEach(d => inter.push({ id: d.id, zone: d.zone, ref: d, x: () => d.x, y: () => d.y, bh: d.look === 'oak' ? 40 : d.look === 'none' ? 18 : 34, active: () => canDisc(d), act: () => inspect(d), kind: 'disc' }));
    animals.forEach(a => { const d = DS[a.k]; if (!d) return; inter.push({ id: a.k + (a.extra ? '2' : ''), zone: a.zone, ref: a, x: () => a.x, y: () => a.y, bh: a.k === 'owl' ? 80 : a.k === 'bat' ? 52 : a.k === 'heron' ? 54 : a.k === 'deer' ? 46 : 24, active: () => canDisc(d), act: () => inspect(d, a), kind: 'disc', disc: d }); });
    soils.forEach(sp => inter.push({ id: 'soil' + (sp.i + 1), zone: 'i', ref: sp, x: () => sp.x, y: () => sp.y, bh: 18, active: () => !st.planted.includes(sp.i) && (has('seedling') || st.q.trees === 1), act: () => plant(sp), kind: 'soil' }));
    inter.push({ id: 'vines', zone: 'i', x: () => 29.6 * TS, y: () => 14.15 * TS, bh: 46, active: () => !st.f.vines, act: vines, kind: 'vines' });
    inter.push({ id: 'bridgeBroken', zone: 'i', x: () => 24.1 * TS, y: () => 31.0 * TS, bh: 16, active: () => !st.f.bridge, act: () => thought('bridgeBroken'), kind: 'look' });
    const interById = {}; inter.forEach(it => { interById[it.id] = it; });
    function actionOf(it) {
      if (!it) return ['✋', s('aGo')];
      switch (it.kind) {
        case 'npc': return ['💬', s('aTalk')];
        case 'pick': return ['✋', s('aTake')];
        case 'soil': return ['🌱', s('aPlant')];
        case 'vines': return st.q.hedgehog === 2 && has('shears') ? ['✂️', s('aCut')] : ['🔍', s('aLook')];
        case 'disc': { const d = it.disc || it.ref; if (d.photo && st.q.photos === 1 && has('camera') && !st.photos.includes(d.id)) return ['📷', s('aPhoto')]; if (d.give && st.q[d.q] === 1 && !has(d.give)) return ['✋', s('aTake')]; return ['🔍', s('aLook')]; }
      }
      return ['🔍', s('aLook')];
    }
    function glyphOf(it) {
      if (it.kind === 'npc') return marker(it.id) ? '!' : '…';
      if (it.kind === 'disc') { const a = actionOf(it)[0]; return a === '🔍' ? '?' : '!'; }
      if (it.kind === 'vines') return st.q.hedgehog === 2 ? '!' : '?';
      return it.kind === 'look' ? '?' : '!';
    }
    let near = null, nearKey = '';
    function interact() {
      if (!started || dlg || panelOpen || fading) return;
      if (!near) { ctx.sound('tap'); return; }
      ctx.sound('click'); near.act();
    }

    /* ---------- movement / tap-to-walk ---------- */
    const keys = { l: 0, r: 0, u: 0, d: 0 };
    const joy = { on: false, x: 0, y: 0 };
    let path = null, pathTarget = null, stuck = 0, stepT = 0, shake = 0;
    const zoneNpcs = () => st.zone === 'i' ? npcs : [];
    const dirTo = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); };
    function tryMove(vx, vy, dt) {
      const nn = zoneNpcs(), nx = pl.x + vx * dt, ny = pl.y + vy * dt;
      if (freeAt(nx, ny, PR, nn)) { pl.x = nx; pl.y = ny; return true; }
      if (vx && freeAt(nx, pl.y, PR, nn)) { pl.x = nx; return true; }
      if (vy && freeAt(pl.x, ny, PR, nn)) { pl.y = ny; return true; }
      for (const a of [.7, -.7, 1.2, -1.2]) { const c = Math.cos(a), sn = Math.sin(a), rx = (vx * c - vy * sn) * .8, ry = (vx * sn + vy * c) * .8; if (freeAt(pl.x + rx * dt, pl.y + ry * dt, PR, nn)) { pl.x += rx * dt; pl.y += ry * dt; return true; } }
      return false;
    }
    function tapAt(sx, sy) {
      const wx = sx + camX, wy = sy + camY;
      let target = null, td = 34 * 34;
      inter.forEach(it => { if (it.zone !== st.zone || !it.active()) return; const dx = it.x() - wx, dy = it.y() - 14 - wy, dd = dx * dx + dy * dy; if (dd < td) { td = dd; target = it; } });
      if (target && Math.hypot(target.x() - pl.x, target.y() - pl.y) < 58) { near = target; interact(); return; }
      walkTo(target ? target.x() : wx, target ? target.y() + 26 : wy, target);
      burst(wx, wy, ['#ffffff'], 6, 40);
    }
    function walkTo(wx, wy, target) {
      const prev = flood(pl.x, pl.y);
      const gx = Math.floor(wx / GS), gy = Math.floor(wy / GS);
      let best = -1, bd = 1e9;
      for (let yy = gy - 7; yy <= gy + 7; yy++) for (let xx = gx - 7; xx <= gx + 7; xx++) { if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue; const i = yy * GW + xx; if (prev[i] === -2) continue; const d = (xx - gx) ** 2 + (yy - gy) ** 2; if (d < bd) { bd = d; best = i; } }
      if (best < 0) { path = null; return false; }
      const pts = []; for (let i = best; i !== -1; i = prev[i]) pts.push([(i % GW) * GS + 10, ((i / GW) | 0) * GS + 10]);
      pts.reverse(); if (pts.length) pts.shift();
      // greedy line-of-sight smoothing
      const out = []; let cur = [pl.x, pl.y], k = 0;
      const clear = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 8); for (let j = 1; j <= n; j++) if (!freeAt(a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n, PR - 1, null)) return false; return true; };
      while (k < pts.length) { let j = Math.min(pts.length - 1, k + 10); while (j > k && !clear(cur, pts[j])) j--; out.push(pts[j]); cur = pts[j]; k = j + 1; }
      path = out; pathTarget = target || null; stuck = 0; return true;
    }

    /* ---------- particles & ambient ---------- */
    const parts = []; for (let i = 0; i < 120; i++) parts.push({ l: 0 });
    function spawn(x, y, vx, vy, life, c, sz, type) { for (const p of parts) if (p.l <= 0) { p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.l = life; p.m = life; p.c = c; p.s = sz; p.t = type || 0; return p; } return null; }
    function burst(x, y, cols, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (sp || 90) * (.4 + Math.random() * .8); spawn(x, y, Math.cos(a) * v, Math.sin(a) * v - 30, .6 + Math.random() * .5, cols[i % cols.length], 2 + Math.random() * 2.5, 1); } }
    function floatText(x, y, txt) { const p = spawn(x, y, 0, -26, 1.6, '#17202b', 0, 3); if (p) p.txt = txt; }
    const gulls = [[24, 50.5, 5.5, .35], [30, 47, 4, -.42], [38.4, 6.6, 3.6, .5]].map(a => ({ cx: a[0] * TS, cy: a[1] * TS, r: a[2] * TS, w: a[3], a: Math.random() * TAU, x: 0, y: 0 }));
    const flies = [[7.6, 37.8, '#f5c542'], [9.5, 35, '#7cc7f0'], [12.5, 40.5, '#f29ac0'], [6.5, 39.4, '#ffffff'], [11, 42, '#f28c28'], [14.6, 31.8, '#b79cf0']].map(a => ({ hx: a[0] * TS, hy: a[1] * TS, x: a[0] * TS, y: a[1] * TS, c: a[2], p: Math.random() * 9 }));
    const bees = []; for (let i = 0; i < 5; i++) bees.push({ p: Math.random() * 9, x: 0, y: 0 });
    const fish = [[20, 53], [30, 52.5], [12, 44], [41, 40], [6, 27], [44, 30]].map(a => ({ x: a[0] * TS, y: a[1] * TS, a: Math.random() * TAU, j: 3 + Math.random() * 6, jt: -1 }));
    const worms = []; for (let i = 0; i < 9; i++) worms.push({ x: (58.2 + Math.random() * 2.6) * TS, y: (13 + Math.random() * 1.6) * TS, p: Math.random() * 9 });
    const fireflies = []; for (let i = 0; i < 12; i++) fireflies.push({ hx: (6 + Math.random() * 10) * TS, hy: (31 + Math.random() * 10) * TS, x: 0, y: 0, p: Math.random() * 9 });
    const waterAt = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= ISW || ty >= MH) return true; const t = W.tiles[ty * MW + tx]; return t === TL.DEEP || t === TL.SHAL; };

    /* ---------- update ---------- */
    let time = 0, camX = 0, camY = 0, cam = { x: pl.x, y: pl.y }, panelOpen = false, fading = false, alive = true, saveT = 0, hudT = 0, area = '', areaCand = '', areaT = 0, smokeT = 0, miniOn = false, miniT = 0;
    const timers = new Set();
    function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; }
    function zoneBounds() { return st.zone === 'c' ? [(ISW + 1) * TS, 0, MW * TS, 25 * TS] : [0, 0, ISW * TS, MH * TS]; }
    function snapCam() { cam.x = pl.x; cam.y = pl.y - 20; clampCam(); }
    function clampCam() { const b = zoneBounds(); const hw = vw / 2, hh = vh / 2; cam.x = b[2] - b[0] <= vw ? (b[0] + b[2]) / 2 : clamp(cam.x, b[0] + hw, b[2] - hw); cam.y = b[3] - b[1] <= vh ? (b[1] + b[3]) / 2 : clamp(cam.y, b[1] + hh, b[3] - hh); camX = cam.x - hw; camY = cam.y - hh; }
    function switchZone(z, x, y, dir) {
      if (fading) return; fading = true; path = null; fadeEl.classList.add('on'); ctx.sound('whoosh');
      later(() => { st.zone = z; pl.x = x; pl.y = y; pl.dir = dir; snapCam(); save(); fadeEl.classList.remove('on'); later(() => { fading = false; }, 260); }, 280);
    }
    function update(dt) {
      time += dt;
      const blocked = !started || !!dlg || panelOpen || fading;
      if (!blocked) st.clock = (st.clock + dt) % DAY;
      let mx = 0, my = 0;
      if (!blocked) {
        mx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0); my = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
        if (joy.on) { mx = joy.x; my = joy.y; }
        if (mx || my) { path = null; }
        else if (path && path.length) {
          const w = path[0], dx = w[0] - pl.x, dy = w[1] - pl.y, L = Math.hypot(dx, dy);
          if (pathTarget && Math.hypot(pathTarget.x() - pl.x, pathTarget.y() - pl.y) < 52) { const t = pathTarget; path = null; pathTarget = null; near = t; interact(); }
          else if (L < 5) { path.shift(); if (!path.length) { path = null; if (pathTarget) { const t = pathTarget; pathTarget = null; if (t.active() && Math.hypot(t.x() - pl.x, t.y() - pl.y) < 70) { near = t; interact(); } } } }
          else { mx = dx / L; my = dy / L; }
        }
      }
      const m = Math.hypot(mx, my);
      if (m > 1) { mx /= m; my /= m; }
      pl.moving = m > .08;
      if (pl.moving) {
        const k = Math.min(1, m), vx = mx * SPEED, vy = my * SPEED;
        const ox = pl.x, oy = pl.y;
        if (Math.abs(mx) > Math.abs(my)) pl.dir = mx < 0 ? 1 : 2; else pl.dir = my < 0 ? 3 : 0;
        tryMove(vx, vy, dt);
        const moved = Math.hypot(pl.x - ox, pl.y - oy);
        if (path) { if (moved < .3) { stuck += dt; if (stuck > .5) path = null; } else stuck = 0; }
        pl.ph += dt * 11 * k; stepT -= dt;
        if (stepT <= 0 && moved > .3) { stepT = .36; const tx = Math.floor(pl.x / TS), ty = Math.floor(pl.y / TS), t = W.tiles[ty * MW + tx]; ctx.sound(W.pathM[ty * MW + tx] || t === TL.ROCK || t === TL.CAVE || t === TL.RIVER || ty >= 50 ? 'step' : 'land'); }
        dirty = true;
      } else pl.ph = 0;
      // npcs
      npcs.forEach(n => {
        n.t += dt; n.mv = 0; const d = Math.hypot(pl.x - n.x, pl.y - n.y);
        if (n.id === 'pikko' && st.q.hedgehog === 2) {
          if (n.wait > 0) n.wait -= dt;
          else { if (n.tx == null) { const a = Math.random() * TAU, r = Math.random() * 1.6 * TS; n.tx = n.hx + Math.cos(a) * r; n.ty = n.hy + Math.sin(a) * r; }
            const dx = n.tx - n.x, dy = n.ty - n.y, L = Math.hypot(dx, dy); if (L < 3) { n.tx = null; n.wait = 1 + Math.random() * 3; } else { const nx = n.x + dx / L * 26 * dt, ny = n.y + dy / L * 26 * dt; if (freeAt(nx, ny, 8, null)) { n.x = nx; n.y = ny; n.dir = dx < 0 ? 1 : 2; n.mv = 1; } else n.tx = null; } }
        }
        if (d < 90) n.dir = dirTo(n, pl); else if (n.id !== 'pikko' || st.q.hedgehog !== 2) n.dir = Math.sin(n.t * .35 + n.hx) > .8 ? 2 : 0;
      });
      // animals
      animals.forEach(a => {
        if (a.k === 'heron') { if (a.strike > 0) { a.strike += dt * 1.6; if (a.strike >= 1) { a.strike = 0; if (Math.random() < .5) spawn(a.x + 18, a.y - 6, 0, -20, .5, '#bfe9f5', 3, 1); } } else if ((a.sk -= dt) < 0) { a.strike = .01; a.sk = 5 + Math.random() * 6; } }
        if (!a.r || !a.sp) return;
        if (Math.hypot(pl.x - a.x, pl.y - a.y) < 50) { a.moving = false; return; }
        if (a.wait > 0) { a.wait -= dt; a.moving = false; return; }
        if (a.tx == null) { const ang = Math.random() * TAU, r = Math.random() * a.r, tx = a.hx + Math.cos(ang) * r, ty = a.hy + Math.sin(ang) * r; if (freeAt(tx, ty, 8, null)) { a.tx = tx; a.ty = ty; } else return; }
        const dx = a.tx - a.x, dy = a.ty - a.y, L = Math.hypot(dx, dy);
        if (L < 3) { a.tx = null; a.wait = 1 + Math.random() * 3; a.moving = false; return; }
        const nx = a.x + dx / L * a.sp * dt, ny = a.y + dy / L * a.sp * dt;
        if (freeAt(nx, ny, 7, null)) { a.x = nx; a.y = ny; a.moving = true; if (a.k !== 'crab' && Math.abs(dx) > 2) a.f = dx < 0 ? -1 : 1; } else { a.tx = null; a.wait = .5; }
      });
      // ambient
      gulls.forEach(b => { b.a += b.w * dt; b.x = b.cx + Math.cos(b.a) * b.r; b.y = b.cy + Math.sin(b.a) * b.r * .55; });
      flies.forEach(f => { f.p += dt; f.x = f.hx + Math.sin(f.p * .7) * 46 + Math.sin(f.p * 2.3) * 10; f.y = f.hy + Math.cos(f.p * .9) * 30 + Math.sin(f.p * 3.1) * 6; });
      bees.forEach((b, i) => { b.p += dt * (1.6 + i * .2); b.x = 6.2 * TS + Math.cos(b.p * 1.7 + i) * (16 + i * 3); b.y = 40.4 * TS - 26 + Math.sin(b.p * 2.3 + i * 2) * 12; });
      fish.forEach(f => { if (f.jt >= 0) { f.jt += dt; if (f.jt > .9) { f.jt = -1; burst(f.x, f.y, ['#ffffff', '#bfe9f5'], 6, 50); ctx.sound && Math.hypot(f.x - pl.x, f.y - pl.y) < 260 && ctx.sound('splash'); } return; } f.a += (Math.sin(time * .6 + f.j) * .6) * dt; const nx = f.x + Math.cos(f.a) * 22 * dt, ny = f.y + Math.sin(f.a) * 22 * dt; if (waterAt(nx, ny) && waterAt(nx + Math.cos(f.a) * 30, ny + Math.sin(f.a) * 30)) { f.x = nx; f.y = ny; } else f.a += 2.2; if ((f.j -= dt) < 0) { f.j = 6 + Math.random() * 8; f.jt = 0; burst(f.x, f.y, ['#ffffff', '#bfe9f5'], 5, 40); } });
      worms.forEach(w => { w.p += dt; });
      fireflies.forEach(f => { f.p += dt * .7; f.x = f.hx + Math.sin(f.p * 1.3) * 40; f.y = f.hy + Math.cos(f.p * 1.1) * 30; });
      if ((smokeT -= dt) < 0) { smokeT = .45; spawn(19 * TS + 36.5 + Math.random() * 4, 35.6 * TS - 136, (Math.random() - .3) * 8, -18, 2.6, 'rgba(235,235,240,.6)', 4, 2); spawn(28.2 * TS + (Math.random() - .5) * 6, 20 * TS - 16, (Math.random() - .5) * 6, -22, 1.8, 'rgba(200,200,210,.5)', 3, 2); }
      if (st.zone === 'i' && Math.random() < dt * 1.2) { const lx = camX + Math.random() * vw, ly = camY + Math.random() * vh * .6; if (inForest(lx / TS, ly / TS)) spawn(lx, ly, 10, 16, 3.2, Math.random() < .5 ? '#d9a441' : '#8cc46c', 3, 4); }
      for (const p of parts) if (p.l > 0) { p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t === 1) p.vy += 160 * dt; if (p.t === 4) p.vx = Math.sin(p.l * 3) * 18; }
      // camera
      const lookX = pl.moving ? mx * 26 : 0, lookY = pl.moving ? my * 20 : 0, k = 1 - Math.exp(-dt * 5);
      cam.x += (pl.x + lookX - cam.x) * k; cam.y += (pl.y - 20 + lookY - cam.y) * k; clampCam();
      if (shake > 0) shake = Math.max(0, shake - dt * 14);
      // zones
      if (!fading && started) {
        if (st.zone === 'i' && st.f.vines && Math.abs(pl.x - 29.6 * TS) < .6 * TS && pl.y < 13.95 * TS) switchZone('c', 56 * TS, 21.4 * TS, 3);
        else if (st.zone === 'c' && pl.y > 23.1 * TS) switchZone('i', 29.6 * TS, 14.7 * TS, 0);
      }
      // area banner
      const a = areaOf(pl.x, pl.y); if (a !== areaCand) { areaCand = a; areaT = 0; } else if (a !== area && (areaT += dt) > .8) { area = a; if (started) banner(AREA_ICON[a] + ' ' + tl(AREAS[a])); }
      // nearest interactable
      if (!blocked) {
        let best = null, bd = 64 * 64;
        for (const it of inter) { if (it.zone !== st.zone || !it.active()) continue; const dx = it.x() - pl.x, dy = (it.y() - pl.y) * 1.15, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = it; } }
        near = best;
      } else if (!dlg) near = null;
      // typewriter
      if (dlg) { const full = dlg.lines[dlg.i]; if (dlg.shown < full.length) { dlg.shown = Math.min(full.length, dlg.shown + dt * 52); dlgP.textContent = full.slice(0, Math.floor(dlg.shown)); } }
      // hud & save
      if ((hudT -= dt) < 0) { hudT = .25; updateHud(); }
      if ((saveT -= dt) < 0) { saveT = 5; if (dirty && started) save(); }
      if (miniOn && (miniT -= dt) < 0) { miniT = .15; drawMini(); }
    }
    const AREA_ICON = { beach: '⚓', village: '🏘️', meadow: '🌼', river: '🌉', forest: '🌲', mountain: '⛰️', lighthouse: '🗼', cave: '💎' };
    function areaOf(x, y) { x /= TS; y /= TS; if (x > ISW) return 'cave'; if (dist(x, y, 37.5, 8.5) < 5.2) return 'lighthouse'; if (inMount(x, y) && y < 23.8) return 'mountain'; if (polyD(x, y, RIVER) < 3.2) return 'river'; if (inForest(x, y)) return 'forest'; if (dist(x, y, 24, 39) < 7.5) return 'village'; if (inMeadow(x, y)) return 'meadow'; if (y > 43.5) return 'beach'; return y < 26 ? 'forest' : 'village'; }

    /* ---------- render ---------- */
    const ents = [];
    const iconSprs = new Map();
    function iconSpr(id, size) {
      const key = id + size; let c = iconSprs.get(key); if (c) return c;
      c = document.createElement('canvas'); c.width = c.height = Math.ceil(size * dpr); const x = c.getContext('2d'); x.scale(size / 64 * dpr, size / 64 * dpr); drawIcon(x, id); iconSprs.set(key, c); return c;
    }
    function spr(kind, v, top) {
      const key = kind + '|' + v + (top ? 't' : ''); let c = sprites.get(key); if (c) return c;
      const sp = SPR[kind]; c = document.createElement('canvas'); c.width = Math.ceil(sp.w * dpr); c.height = Math.ceil(sp.h * dpr);
      const x = c.getContext('2d'); x.scale(dpr, dpr); x.translate(sp.ax, sp.ay); (top ? sp.t : sp.d)(x, v); sprites.set(key, c); return c;
    }
    function drawSpr(kind, v, x, y, top, dx) { const sp = SPR[kind]; g.drawImage(spr(kind, v, top), x - sp.ax + (dx || 0), y - sp.ay, sp.w, sp.h); }
    function visible(x0, y0, x1, y1) { return x1 > camX - 8 && x0 < camX + vw + 8 && y1 > camY - 8 && y0 < camY + vh + 8; }
    function getChunk(cx, cy, force) {
      const key = cy * 100 + cx; let c = chunks.get(key);
      if (c) { chunks.delete(key); chunks.set(key, c); return c; }
      if (!force) return null;
      c = renderChunk(cx, cy, dpr, st.f); chunks.set(key, c);
      if (chunks.size > 28) chunks.delete(chunks.keys().next().value);
      return c;
    }
    let firstFrame = true;
    function render() {
      const dk = st.zone === 'c' ? 0 : darkness(st.clock);
      const sx = shake ? (Math.random() - .5) * shake : 0, sy = shake ? (Math.random() - .5) * shake : 0;
      g.setTransform(dpr, 0, 0, dpr, Math.round((-camX + sx) * dpr), Math.round((-camY + sy) * dpr));
      g.fillStyle = st.zone === 'c' ? GC.void : GC.deep; g.fillRect(camX - 10, camY - 10, vw + 20, vh + 20);
      const c0 = Math.max(0, Math.floor(camX / CHP)), c1 = Math.min(W.CW - 1, Math.floor((camX + vw) / CHP)), r0 = Math.max(0, Math.floor(camY / CHP)), r1 = Math.min(W.CHH - 1, Math.floor((camY + vh) / CHP));
      let budget = firstFrame ? 99 : 2;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { let ch = getChunk(c, r, false); if (!ch && budget-- > 0) ch = getChunk(c, r, true); if (ch) g.drawImage(ch, c * CHP, r * CHP, CHP, CHP); }
      firstFrame = false;
      const tx0 = Math.max(0, Math.floor(camX / TS)), tx1 = Math.min(MW - 1, Math.floor((camX + vw) / TS)), ty0 = Math.max(0, Math.floor(camY / TS)), ty1 = Math.min(MH - 1, Math.floor((camY + vh) / TS));
      // water shimmer
      if (st.zone === 'i') {
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.4; g.lineCap = 'round';
        for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
          const t = W.tiles[ty * MW + tx]; if (t !== TL.DEEP && t !== TL.SHAL) continue; if ((tx === 23 || tx === 24) && ty >= 50 && ty <= 54) continue;
          for (let i = 0; i < 2; i++) { const h = hash(tx, ty, 90 + i), a = Math.sin(time * 1.4 + h * 40); if (a < .55) continue; g.globalAlpha = (a - .55) * 1.4; const x = (tx + hash(tx, ty, 95 + i)) * TS + Math.sin(time * .8 + h * 9) * 4, y = (ty + h) * TS; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.stroke(); }
        }
        g.globalAlpha = 1;
        W.coast.forEach(c => { if (c.x < camX - 40 || c.x > camX + vw + 40 || c.y < camY - 40 || c.y > camY + vh + 40) return; const k = Math.sin(time * 1.6 + c.p); g.globalAlpha = .22 + k * .12; ellf(g, c.x + c.nx * (12 + k * 4), c.y + c.ny * (12 + k * 4), 16, 16, '#ffffff'); });
        g.globalAlpha = 1;
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.6;
        W.riverPts.forEach(p => { if (p.x < camX - 30 || p.x > camX + vw + 30 || p.y < camY - 30 || p.y > camY + vh + 30) return; const o = ((time * 26 + p.p) % 28) - 14, x = p.x + p.dx * o - p.dy * p.o, y = p.y + p.dy * o + p.dx * p.o; g.globalAlpha = .5 - Math.abs(o) / 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x + p.dx * 7, y + p.dy * 7); g.stroke(); });
        g.globalAlpha = 1;
        fish.forEach(f => { if (f.jt >= 0) return; if (f.x < camX - 20 || f.x > camX + vw + 20 || f.y < camY - 20 || f.y > camY + vh + 20) return; g.save(); g.translate(f.x, f.y); g.rotate(f.a); g.globalAlpha = .28; ellf(g, 0, 0, 9, 3.4, '#1d4f6e'); poly(g, [-8, 0, -14, -4 + Math.sin(time * 9) * 2, -14, 4 + Math.sin(time * 9) * 2], '#1d4f6e'); g.restore(); g.globalAlpha = 1; });
        // waterfall
        if (visible(35.6 * TS, 19 * TS, 38 * TS, 22 * TS)) { const wx = 36.7 * TS, wy = 19.9 * TS; rrf(g, wx - 16, wy - 18, 32, 40, 6, 'rgba(160,225,245,.9)'); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.6; for (let i = 0; i < 6; i++) { const o = (time * 60 + i * 13) % 40; g.beginPath(); g.moveTo(wx - 12 + i * 5, wy - 18 + o); g.lineTo(wx - 12 + i * 5, wy - 10 + o); g.stroke(); } if (Math.random() < .4) spawn(wx + (Math.random() - .5) * 26, wy + 22, (Math.random() - .5) * 30, -40, .5, '#e6f8ff', 2.4, 1); }
      }
      // ground-level: soil beds and grass tufts
      soils.forEach(sp => { if (!visible(sp.x - 20, sp.y - 30, sp.x + 20, sp.y + 10)) return; ellf(g, sp.x, sp.y, 15, 7, '#7a5a3c'); ellf(g, sp.x, sp.y - 1, 12, 5, '#8f6d4c'); });
      const kc0 = Math.max(0, c0 - 1), kc1 = Math.min(W.CW - 1, c1 + 1), kr0 = Math.max(0, r0 - 1), kr1 = Math.min(W.CHH - 1, r1 + 1);
      g.lineCap = 'round';
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) W.tuftByChunk[r * W.CW + c].forEach(t => {
        if (t.x < camX - 20 || t.x > camX + vw + 20 || t.y < camY - 10 || t.y > camY + vh + 40) return;
        const sw = Math.sin(time * 1.8 + t.p) * 2.4;
        if (t.reed) { g.strokeStyle = '#6f9a4a'; g.lineWidth = 1.8; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(t.x + i * 4, t.y); g.quadraticCurveTo(t.x + i * 4, t.y - 14, t.x + i * 5 + sw * 1.5, t.y - 26 - i * 3); g.stroke(); } ellf(g, t.x + 5 + sw * 1.5, t.y - 25, 2, 5, '#8a5a3b'); ellf(g, t.x - 5 + sw * 1.5, t.y - 21, 2, 5, '#8a5a3b'); return; }
        g.strokeStyle = t.c === TL.FOREST ? '#5c9a49' : t.c === TL.MEADOW ? '#86c45c' : t.c === TL.SAND ? '#a3b064' : '#74b356'; g.lineWidth = 1.7;
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(t.x + i * 3, t.y); g.quadraticCurveTo(t.x + i * 3, t.y - 5 * t.s, t.x + i * 4.5 + sw * t.s, t.y - (10 - Math.abs(i) * 2) * t.s); g.stroke(); }
      });
      g.lineCap = 'butt';
      // collect y-sorted entities
      ents.length = 0;
      for (let r = kr0; r <= kr1; r++) for (let c = kc0; c <= kc1; c++) { const b = W.objByChunk[r * W.CW + c]; for (let i = 0; i < b.length; i++) { const o = b[i], sp = SPR[o.k]; if (sp && visible(o.x - sp.ax - 10, o.y - sp.ay, o.x - sp.ax + sp.w + 10, o.y - sp.ay + sp.h)) ents.push(o); } }
      npcs.forEach(n => { if (st.zone === 'i' && visible(n.x - 30, n.y - 70, n.x + 30, n.y + 10)) ents.push(n); });
      animals.forEach(a => { if (a.zone === st.zone && visible(a.x - 40, a.y - 100, a.x + 40, a.y + 20)) ents.push(a); });
      picks.forEach(p => { if (p.zone === st.zone && !st.picked.includes(p.id) && visible(p.x - 20, p.y - 40, p.x + 20, p.y + 10)) ents.push(p); });
      spots.forEach(d => { if (d.zone === st.zone && visible(d.x - 30, d.y - 50, d.x + 30, d.y + 10)) ents.push(d); });
      soils.forEach(sp => { if (st.planted.includes(sp.i) && visible(sp.x - 30, sp.y - 60, sp.x + 30, sp.y + 10)) ents.push(sp); });
      ents.push(pl);
      ents.sort((a, b) => a.y - b.y);
      for (let i = 0; i < ents.length; i++) drawEnt(ents[i], dk);
      if (started && ents[ents.length - 1] !== pl) { g.globalAlpha = .38; drawPerson(g, look(), pl.x, pl.y, pl.dir, pl.ph, pl.moving, time, .95); g.globalAlpha = 1; }
      // flyers
      if (st.zone === 'i') {
        gulls.forEach(b => { if (!visible(b.x - 30, b.y - 80, b.x + 30, b.y + 30)) return; ellf(g, b.x + 10, b.y + 34, 6, 2.4, 'rgba(28,44,62,.14)'); const f = Math.sin(time * 7 + b.cx) * 5; g.strokeStyle = '#ffffff'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(b.x - 11, b.y - 46 + f); g.quadraticCurveTo(b.x - 5, b.y - 50, b.x, b.y - 46); g.quadraticCurveTo(b.x + 5, b.y - 50, b.x + 11, b.y - 46 + f); g.stroke(); g.lineCap = 'butt'; });
        flies.forEach(f => { if (!visible(f.x - 10, f.y - 40, f.x + 10, f.y + 10)) return; ellf(g, f.x, f.y + 14, 3, 1.2, 'rgba(28,44,62,.12)'); g.save(); g.translate(f.x, f.y - 10); AN.butterfly(g, time + f.p, f.c); g.restore(); });
        bees.forEach(b => { if (!visible(b.x - 6, b.y - 6, b.x + 6, b.y + 6)) return; g.save(); g.translate(b.x, b.y); AN.bee(g, time + b.p); g.restore(); });
      }
      // particles
      for (const p of parts) {
        if (p.l <= 0) continue; const k = p.l / p.m;
        if (p.t === 3) { g.globalAlpha = Math.min(1, k * 2); g.font = '800 13px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3.5; g.strokeStyle = '#fff'; g.strokeText(p.txt, p.x, p.y); g.fillStyle = '#2e7d5b'; g.fillText(p.txt, p.x, p.y); continue; }
        if (p.t === 2) { g.globalAlpha = k * .8; circ(g, p.x, p.y, p.s * (2.2 - k), p.c); continue; }
        if (p.t === 4) { g.globalAlpha = Math.min(1, k * 2); ellf(g, p.x, p.y, 3, 1.8, p.c, p.l * 2); continue; }
        g.globalAlpha = Math.min(1, k * 1.6); circ(g, p.x, p.y, p.s * (.5 + k * .5), p.c);
      }
      g.globalAlpha = 1;
      // lighting
      if (dk > .01 || st.zone === 'c') lighting(dk);
      else if (st.f.lamp) lampGlowDay();
      // dusk / dawn tint
      if (st.zone === 'i') { const c = st.clock; let tint = 0, col = '255,140,70'; if (c > 195 && c < 250) tint = Math.sin((c - 195) / 55 * PI) * .16; else if (c > 325) { tint = Math.sin((c - 325) / 35 * PI) * .12; col = '255,160,190'; } if (tint > 0) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = `rgba(${col},${tint})`; g.fillRect(0, 0, vw, vh); g.setTransform(dpr, 0, 0, dpr, Math.round(-camX * dpr), Math.round(-camY * dpr)); } }
      // bubbles & markers
      npcs.forEach(n => { if (st.zone !== 'i') return; const m = marker(n.id); if (!m || !visible(n.x - 20, n.y - 100, n.x + 20, n.y)) return; const by = n.y - (n.animal ? 34 : 70) + Math.sin(time * 4) * 2.5; circ(g, n.x, by, 10, m === 'offer' ? '#f59e0b' : '#16a34a'); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(n.x, by, 10, 0, TAU); g.stroke(); g.fillStyle = '#fff'; g.font = '900 13px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(m === 'offer' ? '!' : '✓', n.x, by + 1); });
      if (near && !dlg && started) {
        const x = near.x(), y = near.y() - near.bh - 20 + Math.sin(time * 5) * 2.5, gl = glyphOf(near);
        if (!(near.kind === 'npc' && marker(near.id))) {
          g.fillStyle = '#fff'; g.strokeStyle = 'rgba(23,32,43,.15)'; g.lineWidth = 1; rr(g, x - 12, y - 12, 24, 22, 8); g.fill(); g.stroke(); poly(g, [x - 4, y + 9, x + 4, y + 9, x, y + 15], '#fff');
          g.fillStyle = gl === '!' ? '#f59e0b' : '#4f46e5'; g.font = '900 15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(gl, x, y);
        }
      }
      g.textBaseline = 'alphabetic';
      // edge arrow to the tracked objective
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const tq = trackedId(); if (tq && started && !dlg) { const o = objective(tq), p = zoneTarget(o.p); if (p) { const sx2 = p[0] - camX, sy2 = p[1] - 20 - camY, m = 30; if (sx2 < m || sx2 > vw - m || sy2 < 64 || sy2 > vh - m) { const cx = vw / 2, cy = vh / 2, a = Math.atan2(sy2 - cy, sx2 - cx); const ex = clamp(cx + Math.cos(a) * 999, m, vw - m), ey = clamp(cy + Math.sin(a) * 999, 74, vh - 100); const px = clamp(ex, m, vw - m), py = clamp(ey, 74, vh - 100); g.save(); g.translate(px, py); g.globalAlpha = .9 + Math.sin(time * 4) * .1; circ(g, 0, 0, 15, '#f59e0b'); g.rotate(a); poly(g, [9, 0, -4, -6, -1, 0, -4, 6], '#fff'); g.restore(); g.globalAlpha = 1; } } }
    }
    const LH = W.objs.find(o => o.k === 'lighthouse');
    function lampGlowDay() { const lh = LH; if (!lh || !visible(lh.x - 60, lh.y - 230, lh.x + 60, lh.y)) return; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .35 + Math.sin(time * 3) * .1; g.drawImage(STAMPS.warm, lh.x - 40, lh.y - 207, 80, 80); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    const lights = [];
    function lighting(dk) {
      const cave = st.zone === 'c';
      lights.length = 0;
      const L = (x, y, r, st2, a) => { if (x + r < camX || x - r > camX + vw || y + r < camY || y - r > camY + vh) return; lights.push(x, y, r, st2, a); };
      const kc0 = Math.max(0, Math.floor((camX - 200) / CHP)), kc1 = Math.min(W.CW - 1, Math.floor((camX + vw + 200) / CHP)), kr0 = Math.max(0, Math.floor((camY - 200) / CHP)), kr1 = Math.min(W.CHH - 1, Math.floor((camY + vh + 300) / CHP));
      for (let r = kr0; r <= kr1; r++) for (let c = kc0; c <= kc1; c++) W.objByChunk[r * W.CW + c].forEach(o => {
        if (o.k === 'lantern') L(o.x, o.y - 52, 100, 1, 1);
        else if (o.k === 'house' || o.k === 'cottage') { const s2 = o.k === 'cottage' ? .82 : 1; HOUSE_WIN.forEach(w => L(o.x + w[0] * s2, o.y + w[1] * s2, 52, 1, .9)); }
        else if (o.k === 'campfire') L(o.x, o.y - 12, 120 + Math.sin(time * 13) * 6, 1, 1);
        else if (o.k === 'crystal') L(o.x, o.y - 16, 70 + Math.sin(time * 2 + o.seed * 9) * 8, o.v ? 3 : 2, .9);
        else if (o.k === 'lighthouse' && st.f.lamp) L(o.x, o.y - 167, 150, 1, 1);
      });
      if (has('lantern')) L(pl.x, pl.y - 26, cave ? 190 : 130, 1, 1); else if (cave) L(pl.x, pl.y - 20, 56, 1, .9);
      if (cave) { worms.forEach(w => L(w.x, w.y, 26 + Math.sin(w.p * 3) * 4, 4, .9)); picks.forEach(p => { if (p.zone === 'c' && !st.picked.includes(p.id)) L(p.x, p.y - 14, 60, 3, .8); }); }
      else if (dk > .4) fireflies.forEach(f => L(f.x, f.y - 12, 20, 4, .9 * (.5 + .5 * Math.sin(f.p * 5))));
      const col = cave ? [6, 4, 14, .94] : [14, 20, 56, .62 * dk];
      lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, lc.width, lc.height);
      lg.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${col[3]})`; lg.fillRect(0, 0, lc.width, lc.height);
      lg.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < lights.length; i += 5) { const x = (lights[i] - camX) / 2, y = (lights[i + 1] - camY) / 2, r = lights[i + 2] / 2; lg.globalAlpha = lights[i + 4]; lg.drawImage(STAMPS.cut, x - r, y - r, r * 2, r * 2); }
      const lh = !cave && st.f.lamp ? LH : null;
      if (lh) { const ang = time * .9; lg.save(); lg.translate((lh.x - camX) / 2, (lh.y - 167 - camY) / 2); lg.rotate(ang); lg.globalAlpha = .95; lg.drawImage(STAMPS.beamCut, 0, -48, 380, 96); lg.rotate(PI); lg.drawImage(STAMPS.beamCut, 0, -48, 380, 96); lg.restore(); }
      lg.globalAlpha = 1;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.drawImage(lc, 0, 0, vw, vh);
      g.setTransform(dpr, 0, 0, dpr, Math.round(-camX * dpr), Math.round(-camY * dpr));
      g.globalCompositeOperation = 'lighter';
      const amt = cave ? .55 : .45 * dk;
      for (let i = 0; i < lights.length; i += 5) { const st2 = lights[i + 3], sp = st2 === 2 ? STAMPS.violet : st2 === 3 ? STAMPS.cyan : st2 === 4 ? STAMPS.green : STAMPS.warm, r = lights[i + 2] * (st2 === 4 ? .6 : .7); g.globalAlpha = amt * lights[i + 4] * (st2 === 4 ? .45 : 1); g.drawImage(sp, lights[i] - r, lights[i + 1] - r, r * 2, r * 2); }
      if (lh) { g.save(); g.translate(lh.x, lh.y - 167); g.rotate(time * .9); g.globalAlpha = .28 * Math.max(dk, .3); g.drawImage(STAMPS.beamWarm, 0, -96, 760, 192); g.rotate(PI); g.drawImage(STAMPS.beamWarm, 0, -96, 760, 192); g.restore(); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    function sparkle(x, y, ph) { const a = .5 + .5 * Math.sin(time * 4 + ph); g.globalAlpha = .35 + a * .6; const r = 2 + a * 2.5; poly(g, [x, y - r * 2, x + r * .5, y - r * .5, x + r * 2, y, x + r * .5, y + r * .5, x, y + r * 2, x - r * .5, y + r * .5, x - r * 2, y, x - r * .5, y - r * .5], '#fffbe0'); g.globalAlpha = 1; }
    function drawEnt(o, dk) {
      if (o === pl) { if (started) drawPerson(g, look(), pl.x, pl.y, pl.dir, pl.ph, pl.moving, time, .95); return; }
      switch (o._k) {
        case 'npc':
          if (o.animal) { g.save(); g.translate(o.x, o.y); if (o.dir === 1) g.scale(-1, 1); AN.hedgehog(g, time, o.mv, st.q.hedgehog !== 2); g.restore(); }
          else { const P = o.id === 'rosa' ? Object.assign({}, o.look, { glasses: st.q.glasses === 2 }) : o.look; drawPerson(g, P, o.x, o.y, o.dir, 0, false, time + o.hx, o.kid ? .9 : 1.04); }
          return;
        case 'an': {
          g.save(); g.translate(o.x, o.y);
          if (o.k === 'owl') { g.translate(4, -70); AN.owl(g, time, dk > .5 || Math.hypot(pl.x - o.x, pl.y - o.y) < 70); }
          else if (o.k === 'bat') { ellf(g, 0, 0, 7, 2.4, 'rgba(0,0,0,.3)'); g.translate(0, -48); ellf(g, 0, -3, 10, 5, '#3a3446'); AN.bat(g, time); }
          else if (o.k === 'gull') { g.translate(0, -4); AN.gull(g, time); }
          else { if (o.f < 0) g.scale(-1, 1); AN[o.k](g, time, o.moving, o); }
          g.restore(); return; }
        case 'pick': { const b = Math.sin(time * 3 + o.x) * 2.5; ellf(g, o.x, o.y, 10, 3.5, SHADOW); g.drawImage(iconSpr(o.item, 30), o.x - 15, o.y - 34 + b, 30, 30); sparkle(o.x + 11, o.y - 32 + b, o.x); return; }
        case 'disc': {
          if (o.look === 'icon') { ellf(g, o.x, o.y, 13, 4, SHADOW); g.save(); g.translate(o.x, o.y); g.rotate(Math.sin(time * 1.5 + o.x) * .04); g.drawImage(iconSpr(o.id, 40), -20, -38, 40, 40); g.restore(); }
          if (canDisc(o) && !(o.dark && !has('lantern') && st.zone === 'c')) sparkle(o.x + 8, o.y - (o.look === 'icon' ? 40 : 22), o.y);
          return; }
        case 'soil': { const gr = Math.min(1, .5 + st.planted.length * .1); line(g, o.x, o.y - 2, o.x, o.y - 18, '#7a4e32', 2.4); canopy(g, TREE_PAL[0], [[-6 * gr, -20, 7 * gr], [6 * gr, -20, 7 * gr], [0, -26, 8 * gr]].map(b => [b[0] + o.x + Math.sin(time * 1.4 + o.i) * .8, b[1] + o.y, b[2]])); return; }
      }
      // static objects
      const sw = Math.sin(time * 1.2 + o.seed * 20) * 1.3;
      switch (o.k) {
        case 'tree': case 'pine': case 'palm': case 'bush': case 'bushB': case 'bushF': case 'oak': drawSpr(o.k, o.v, o.x, o.y); drawSpr(o.k, o.v, o.x, o.y, true, o.k === 'palm' ? sw * 1.8 : sw); return;
        case 'windmill': { drawSpr('windmill', 0, o.x, o.y); g.save(); g.translate(o.x, o.y - 90); g.rotate(time * .7); for (let i = 0; i < 4; i++) { g.rotate(PI / 2); rrf(g, -2.5, -60, 5, 56, 2, '#7a4e32'); rrf(g, 2, -58, 12, 44, 2, 'rgba(255,253,245,.92)'); for (let j = 0; j < 4; j++) line(g, 2, -50 + j * 11, 14, -50 + j * 11, 'rgba(122,78,50,.5)', 1); } g.restore(); circ(g, o.x, o.y - 90, 5, '#5a3d28'); return; }
        case 'boat': drawBoat(o); return;
        case 'campfire': { drawSpr('campfire', 0, o.x, o.y); for (let i = 0; i < 3; i++) { const h = 16 + Math.sin(time * 12 + i * 2) * 5, x = o.x - 6 + i * 6; poly(g, [x - 5, o.y - 6, x, o.y - 6 - h, x + 5, o.y - 6], i === 1 ? '#ffb02e' : '#f2683a'); poly(g, [x - 2.5, o.y - 6, x, o.y - 6 - h * .55, x + 2.5, o.y - 6], '#ffe28a'); } if (Math.random() < .2) spawn(o.x + (Math.random() - .5) * 8, o.y - 20, (Math.random() - .5) * 10, -40, .7, '#ffcf6b', 1.6, 0); return; }
        case 'caveMouth': drawSpr('caveMouth', 0, o.x, o.y); if (!st.f.vines) drawSpr('vines', 0, o.x, o.y + 4); return;
        case 'flowers': { const cols = [['#f29ac0', '#ffffff'], ['#f5d548', '#f28c28'], ['#b79cf0', '#ffffff'], ['#ffffff', '#f5d548']][o.v]; ellf(g, o.x, o.y, 12, 3.5, SHADOW); for (let i = 0; i < 5; i++) { const bx = o.x - 10 + i * 5, a = Math.sin(time * 1.6 + o.seed * 9 + i) * 2.4, tx = bx + a, ty = o.y - 12 - (i % 2) * 5; stem(g, bx, o.y, tx, ty, '#5f9f4a', 1.4); for (let k = 0; k < 5; k++) circ(g, tx + Math.cos(k * 1.256) * 2.6, ty + Math.sin(k * 1.256) * 2.6, 2.2, cols[0]); circ(g, tx, ty, 1.6, cols[1]); } return; }
        case 'lighthouse': { drawSpr('lighthouse', 0, o.x, o.y); if (st.f.lamp) { rrf(g, o.x - 12, o.y - 178 - 0, 24, 22, 2, '#fff1a8'); circ(g, o.x, o.y - 167, 6 + Math.sin(time * 6) * 1.2, '#fffbe6'); } return; }
        case 'crystal': drawSpr('crystal', o.v, o.x, o.y); return;
        case 'net': case 'fence': return;
      }
      drawSpr(o.k, o.v, o.x, o.y);
    }
    function drawBoat(o) {
      const b = Math.sin(time * 1.6) * 1.6, x = o.x, y = o.y + b;
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.6; for (let i = 0; i < 2; i++) { const k = (time * .6 + i * .5) % 1; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(o.x, o.y + 10, 56 + k * 18, 12 + k * 5, 0, 0, TAU); g.stroke(); } g.globalAlpha = 1;
      ellf(g, x + 4, y + 10, 56, 10, 'rgba(20,60,90,.25)');
      g.fillStyle = '#c0453a'; g.beginPath(); g.moveTo(-50 + x, y + 2); g.lineTo(50 + x, y + 2); g.quadraticCurveTo(46 + x, y + 14, 32 + x, y + 15); g.lineTo(-36 + x, y + 15); g.quadraticCurveTo(-50 + x, y + 12, -50 + x, y + 2); g.fill();
      g.fillStyle = '#f6f3ec'; g.beginPath(); g.moveTo(-56 + x, y - 16); g.lineTo(58 + x, y - 16); g.quadraticCurveTo(54 + x, y + 2, 40 + x, y + 5); g.lineTo(-42 + x, y + 5); g.quadraticCurveTo(-56 + x, y, -56 + x, y - 16); g.fill();
      rrf(g, -54 + x, y - 8, 110, 4.5, 2, '#2f6db0'); ellf(g, x, y - 16, 54, 9, '#c49563'); for (let i = -4; i <= 4; i++) line(g, x + i * 11, y - 23, x + i * 11, y - 9, 'rgba(120,80,40,.35)', 1);
      rrf(g, x - 26, y - 50, 34, 34, 4, '#ffffff'); rrf(g, x - 22, y - 44, 11, 10, 2, '#9fd3ec'); rrf(g, x - 7, y - 44, 11, 10, 2, '#9fd3ec'); rrf(g, x - 30, y - 55, 42, 8, 3, '#e0493f');
      line(g, x + 26, y - 16, x + 26, y - 84, '#6f4a2e', 2.4); const fl = Math.sin(time * 5) * 3; poly(g, [x + 26, y - 84, x + 44, y - 78 + fl, x + 26, y - 72], '#f5c542');
      circ(g, x + 40, y - 22, 6, '#e0493f'); circ(g, x + 40, y - 22, 3, '#c49563');
    }

    /* ---------- HUD, banner, card, minimap ---------- */
    let hudKey = '';
    function updateHud(force) {
      const pct = Math.round(st.j.length / JOURNAL.length * 100), bagN = Object.keys(st.inv).length, dk = darkness(st.clock);
      const tq = trackedId(), o = tq ? objective(tq) : null;
      const clock = st.zone === 'c' ? '💎' : dk > .7 ? '🌙' : dk > .01 || st.clock > 200 || st.clock < 18 ? '🌅' : '☀️';
      const key = pct + '|' + bagN + '|' + clock + '|' + (o ? tq + o.t : '') + LANG;
      if (key === hudKey && !force) return; hudKey = key;
      $('.ex-pct').textContent = pct + '%'; const c = $('.ex-cnt'); c.textContent = bagN || ''; c.style.display = bagN ? '' : 'none';
      $('.ex-clock').textContent = clock;
      trackEl.innerHTML = o && started ? `<span>${QUESTS[tq].ic}</span><span>${UI.escapeHtml(o.t)}</span>` : '';
      trackEl.style.display = o && started ? '' : 'none';
      updateAct(true);
    }
    function updateAct(force) {
      const a = actionOf(near), k = (near ? near.id : '') + a[0] + (dlg ? 'd' : '');
      if (k === nearKey && !force) return; nearKey = k;
      actBtn.querySelector('span').textContent = dlg ? '▶' : a[0]; actBtn.querySelector('small').textContent = dlg ? '' : near ? a[1] : '';
      actBtn.classList.toggle('on', !!near || !!dlg);
    }
    let bannerT = 0;
    function banner(text) { areaEl.textContent = text; areaEl.classList.remove('show'); void areaEl.offsetWidth; areaEl.classList.add('show'); clearTimeout(bannerT); bannerT = later(() => areaEl.classList.remove('show'), 2400); }
    function pulse(sel) { const b = $(sel); if (b) Kit.bump(b); }
    let cardT = 0;
    function showCard(id, isNew) {
      const j = JMAP[id]; if (!j) return;
      cardEl.innerHTML = `<img src="${iconSrc(id)}" alt=""><div><small>${isNew ? '✨ ' + s('newDisc') : '📖 ' + s('known')}</small><b>${UI.escapeHtml(tl(j.n))}</b><p>${UI.escapeHtml(tl(j.f))}</p></div>`;
      cardEl.classList.remove('show'); void cardEl.offsetWidth; cardEl.classList.add('show');
      clearTimeout(cardT); cardT = later(() => cardEl.classList.remove('show'), isNew ? 6500 : 5000);
    }
    cardEl.addEventListener('click', () => cardEl.classList.remove('show'));
    let miniBase = null, miniCave = null;
    function buildMini() {
      const make = (x0, x1, y0, y1) => { const c = document.createElement('canvas'); c.width = (x1 - x0) * 4; c.height = (y1 - y0) * 4; const x = c.getContext('2d');
        const col = { 0: '#5bb3d6', 1: '#8fd8dc', 2: '#f2deab', 3: '#97cf75', 4: '#6fae5a', 5: '#b2da7a', 6: '#bcb09a', 7: '#4aaecb', 8: '#6a6380', 9: '#1d1827', 10: '#d6cab3', 11: '#8f8573', 12: '#3f8fae' };
        for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) { const t = W.tiles[ty * MW + tx]; x.fillStyle = (t === TL.RIVER && st.f.bridge && (tx === 23 || tx === 24) && ty >= 26 && ty <= 30) ? '#c08a54' : W.pathM[ty * MW + tx] === 1 ? '#e2c995' : col[t]; x.fillRect((tx - x0) * 4, (ty - y0) * 4, 4, 4); }
        if (x0 === 0) { x.fillStyle = '#c08a54'; x.fillRect(23.3 * 4, 50.2 * 4, 6, 19); W.objs.forEach(o => { if (o.k === 'house' || o.k === 'cottage' || o.k === 'shack') { x.fillStyle = '#d9674e'; x.fillRect(o.x / TS * 4 - 5, o.y / TS * 4 - 6, 10, 6); } if (o.k === 'lighthouse') { x.fillStyle = '#e0493f'; x.fillRect(o.x / TS * 4 - 3, o.y / TS * 4 - 9, 6, 9); } }); }
        return c; };
      miniBase = make(0, ISW, 0, MH); miniCave = make(ISW + 1, MW, 0, 25);
    }
    function drawMini() {
      if (!miniBase) buildMini();
      const cave = st.zone === 'c', base = cave ? miniCave : miniBase, ox = cave ? (ISW + 1) * TS : 0;
      const w = 108, h = Math.round(w * base.height / base.width); if (mini.width !== w * 2) { mini.width = w * 2; mini.height = h * 2; mini.style.height = h + 'px'; }
      const k = mini.width / base.width; mg.setTransform(1, 0, 0, 1, 0, 0); mg.drawImage(base, 0, 0, mini.width, mini.height);
      const sc = 4 * k / TS, P = (x, y) => [(x - ox) * sc, y * sc];
      mg.strokeStyle = 'rgba(255,255,255,.85)'; mg.lineWidth = 2; const a = P(camX, camY); mg.strokeRect(a[0], a[1], vw * sc, vh * sc);
      if (!cave) npcs.forEach(n => { const m = marker(n.id); if (!m) return; const p = P(n.x, n.y); mg.fillStyle = m === 'offer' ? '#f59e0b' : '#16a34a'; mg.beginPath(); mg.arc(p[0], p[1], 5, 0, TAU); mg.fill(); });
      const tq = trackedId(); if (tq) { const p0 = zoneTarget(objective(tq).p); if (p0) { const p = P(p0[0], p0[1]); mg.strokeStyle = '#f59e0b'; mg.lineWidth = 3; mg.beginPath(); mg.arc(p[0], p[1], 8 + Math.sin(time * 5) * 2, 0, TAU); mg.stroke(); } }
      const p = P(pl.x, pl.y); mg.fillStyle = '#fff'; mg.beginPath(); mg.arc(p[0], p[1], 7, 0, TAU); mg.fill(); mg.fillStyle = '#4f46e5'; mg.beginPath(); mg.arc(p[0], p[1], 4.5, 0, TAU); mg.fill();
    }

    /* ---------- panels ---------- */
    let tab = 'quests', jFilter = 'all';
    function openPanel(t) { tab = t; panelOpen = true; path = null; panel.classList.remove('hide'); renderPanel(); ctx.sound('open'); }
    function closePanel() { panelOpen = false; panel.classList.add('hide'); ctx.sound('close'); }
    function renderPanel() {
      const tabs = panel.querySelector('.ex-tabs'); tabs.innerHTML = '';
      const seg = Kit.segmented([{ id: 'quests', label: '📜 ' + s('quests') }, { id: 'journal', label: '📖 ' + s('journal') }, { id: 'bag', label: '🎒 ' + s('bag') }], tab, id => { tab = id; renderPanel(); });
      tabs.appendChild(seg.el);
      const esc = UI.escapeHtml;
      if (tab === 'quests') {
        const act = QORDER.filter(id => st.q[id] === 1), done = QORDER.filter(id => st.q[id] === 2), tq = trackedId();
        pbody.innerHTML = (act.length ? `<h4>${s('active')}</h4>` + act.map(id => `<button class="ex-q${id === tq ? ' on' : ''}${QUESTS[id].main ? ' main' : ''}" data-q="${id}"><i>${QUESTS[id].ic}</i><span><b>${esc(tl(QUESTS[id].t))}</b><small>${esc(objective(id).t)}</small></span><em>${QUESTS[id].st} ⭐</em></button>`).join('') : `<p class="ex-empty">${s('noQuests')}</p>`)
          + (done.length ? `<h4>${s('done')} · ${done.length}/${QORDER.length}</h4>` + done.map(id => `<div class="ex-q done"><i>${QUESTS[id].ic}</i><span><b>${esc(tl(QUESTS[id].t))}</b></span><em>✓</em></div>`).join('') : '')
          + `<button class="ex-reset">↺ ${s('newGame')}</button>`;
        pbody.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { st.track = b.dataset.q; ctx.sound('tap'); renderPanel(); updateHud(true); }));
        pbody.querySelector('.ex-reset').addEventListener('click', () => Kit.confirm(s('confirmReset'), resetGame));
      } else if (tab === 'journal') {
        const n = st.j.length, tot = JOURNAL.length, cats = [['all', s('all')], ['p', '🌿 ' + s('cp')], ['a', '🐾 ' + s('ca')], ['m', '💎 ' + s('cm')], ['l', '🗺️ ' + s('cl')]];
        const items = JOURNAL.filter(j => jFilter === 'all' || j.c === jFilter);
        pbody.innerHTML = `<div class="ex-jhead"><b>${s('found', { n, t: tot })}</b><span>${Math.round(n / tot * 100)}%</span></div><div class="ex-bar"><i style="width:${n / tot * 100}%"></i></div>
          <div class="ex-chips">${cats.map(c => `<button data-c="${c[0]}" class="${c[0] === jFilter ? 'on' : ''}">${c[1]}</button>`).join('')}</div>
          <div class="ex-jgrid">${items.map(j => { const k = st.j.includes(j.id); return `<button class="ex-jc${k ? '' : ' off'}" data-j="${j.id}"><img src="${iconSrc(j.id, !k)}" alt=""><small>${k ? esc(tl(j.n)) : '?'}</small></button>`; }).join('')}</div><div class="ex-jd"></div>`;
        pbody.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { jFilter = b.dataset.c; ctx.sound('tap'); renderPanel(); }));
        pbody.querySelectorAll('[data-j]').forEach(b => b.addEventListener('click', () => { const j = JMAP[b.dataset.j], k = st.j.includes(j.id), dd = pbody.querySelector('.ex-jd'); ctx.sound('tap'); dd.innerHTML = k ? `<img src="${iconSrc(j.id)}" alt=""><div><b>${esc(tl(j.n))}</b><p>${esc(tl(j.f))}</p></div>` : `<img src="${iconSrc(j.id, true)}" alt=""><div><b>?</b><p>${s('unknown')}</p></div>`; dd.classList.add('show'); dd.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }));
      } else {
        const ids = Object.keys(st.inv);
        pbody.innerHTML = ids.length ? `<div class="ex-bgrid">${ids.map(id => `<div class="ex-bi"><img src="${iconSrc(id)}" alt=""><small>${esc(iname(id))}</small>${cnt(id) > 1 ? `<em>×${cnt(id)}</em>` : ''}</div>`).join('')}</div>` : `<p class="ex-empty">${s('bagEmpty')}</p>`;
      }
    }
    panel.querySelector('.ex-x').addEventListener('click', closePanel);
    el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { b.blur(); if (!started) return; if (panelOpen && tab === b.dataset.p) closePanel(); else openPanel(b.dataset.p); }));
    el.querySelector('[data-a="map"]').addEventListener('click', e => { e.currentTarget.blur(); miniOn = !miniOn; mini.classList.toggle('on', miniOn); e.currentTarget.classList.toggle('on', miniOn); ctx.sound('toggle'); if (miniOn) drawMini(); });
    el.querySelector('[data-a="rules"]').addEventListener('click', e => { e.currentTarget.blur(); Kit.rules(s('rulesT'), s('rules')); });
    trackEl.addEventListener('click', () => { trackEl.blur(); if (started) openPanel('quests'); });

    /* ---------- start screen ---------- */
    let pick = st.av || 0;
    function showStart() {
      startEl.classList.remove('hide');
      startEl.innerHTML = `<div class="ex-sbox"><div class="ex-logo">🧭</div><h2>${UI.escapeHtml(tl(Games.explorer.name))}</h2><p>${s('sub')}</p><h4>${s('choose')}</h4>
        <div class="ex-avs">${AVATARS.map((a, i) => `<button class="ex-av${i === pick ? ' on' : ''}" data-i="${i}"><canvas width="128" height="128"></canvas><b>${a.n}</b></button>`).join('')}</div>
        <button class="btn btn-primary ex-go">${s('start')}</button></div>`;
      startEl.querySelectorAll('.ex-av').forEach((b, i) => { portrait(b.querySelector('canvas'), 'self', AVATARS[i].look); b.addEventListener('click', () => { pick = i; ctx.sound('tap'); startEl.querySelectorAll('.ex-av').forEach((x, k) => x.classList.toggle('on', k === i)); }); });
      startEl.querySelector('.ex-go').addEventListener('click', () => begin(pick));
    }
    function begin(i) {
      st.av = i; started = true; startEl.classList.add('hide'); ctx.data.ex = st; save(); ctx.sound('ok');
      updateHud(true); later(() => talk(npcById.marla), 500);
    }
    function resetGame() {
      const ns = fresh(); Object.keys(st).forEach(k => delete st[k]); Object.assign(st, ns);
      pl.x = st.x; pl.y = st.y; pl.dir = 3; started = false; rewards.length = 0; dlg = null; dlgEl.classList.add('hide'); closePanel();
      chunks.clear(); walkGrid = null; miniBase = null; ctx.data.ex = null; ctx.save(); npcById.pikko.x = npcById.pikko.hx; npcById.pikko.y = npcById.pikko.hy;
      snapCam(); updateHud(true); showStart();
    }

    /* ---------- input ---------- */
    let ptr = null;
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!started || modalOpen()) return;
      if (dlg) { advance(); return; }
      if (panelOpen) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      ptr = { id: e.pointerId, sx: x, sy: y, t: performance.now(), joy: false, left: x < r.width * .55 };
      try { cv.setPointerCapture(e.pointerId); } catch (_) { }
    });
    cv.addEventListener('pointermove', e => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, dx = x - ptr.sx, dy = y - ptr.sy, L = Math.hypot(dx, dy);
      if (!ptr.joy && ptr.left && L > 10) { ptr.joy = true; joy.on = true; joyEl.style.left = ptr.sx + 'px'; joyEl.style.top = ptr.sy + 'px'; joyEl.classList.add('on'); path = null; }
      if (ptr.joy) { const m = Math.min(1, L / 44), a = Math.atan2(dy, dx); joy.x = L > 6 ? Math.cos(a) * m : 0; joy.y = L > 6 ? Math.sin(a) * m : 0; joyEl.querySelector('i').style.transform = `translate(${Math.cos(a) * m * 30}px,${Math.sin(a) * m * 30}px)`; }
    });
    const endPtr = e => {
      if (!ptr || e.pointerId !== ptr.id) return;
      if (!ptr.joy && performance.now() - ptr.t < 450) { const r = cv.getBoundingClientRect(); tapAt(e.clientX - r.left, e.clientY - r.top); }
      ptr = null; joy.on = false; joy.x = joy.y = 0; joyEl.classList.remove('on'); joyEl.querySelector('i').style.transform = '';
    };
    cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
    dlgEl.addEventListener('pointerdown', e => { e.preventDefault(); advance(); });
    actBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (dlg) advance(); else interact(); });
    const KEYMAP = { arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd' };
    function onKey(e, down) {
      if (!root.isConnected || modalOpen()) return;
      const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      const k = (e.key || '').toLowerCase();
      if (KEYMAP[k]) { keys[KEYMAP[k]] = down ? 1 : 0; e.preventDefault(); return; }
      if (!down || e.repeat) return;
      if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); if (!started) return; if (dlg) advance(); else if (!panelOpen) interact(); return; }
      if (!started) return;
      if (k === 'escape') { if (panelOpen) closePanel(); return; }
      const pk = { q: 'quests', j: 'journal', i: 'bag' }[k];
      if (pk) { if (panelOpen && tab === pk) closePanel(); else openPanel(pk); return; }
      if (k === 'm') el.querySelector('[data-a="map"]').click();
    }
    const kd = e => onKey(e, true), ku = e => onKey(e, false), blur = () => { keys.l = keys.r = keys.u = keys.d = 0; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);

    /* ---------- loop & visibility ---------- */
    let raf = 0, lastT = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      let dt = (now - lastT) / 1000; lastT = now; if (dt > .05) dt = .05; if (dt < 0) dt = 0;
      if (!modalOpen()) update(dt);
      updateAct();
      render();
    }
    function onVis() { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; keys.l = keys.r = keys.u = keys.d = 0; if (started) save(); } else if (!raf && alive) { lastT = performance.now(); raf = requestAnimationFrame(frame); } }
    document.addEventListener('visibilitychange', onVis);
    resize(); snapCam(); updateHud(true);
    if (!started) showStart(); else { later(() => banner('🧭 ' + s('welcomeBack')), 300); if (!st.f.intro) later(() => talk(npcById.marla), 600); }
    raf = requestAnimationFrame(frame);

    /* ---------- debug hook ---------- */
    function placeNear(x, y) {
      const z = x > ISW * TS ? 'c' : 'i'; st.zone = z;
      for (const r of [0, 34, 44, 56, 70, 90]) for (let a = 0; a < 16; a++) { const ang = PI / 2 + a / 16 * TAU, px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r; if (freeAt(px, py, PR, zoneNpcs())) { pl.x = px; pl.y = py; pl.dir = dirTo(pl, { x, y }); snapCam(); return true; } }
      return false;
    }
    function forceComplete(id) {
      const fx = { bridge: () => fixBridge(), beach: () => give('gear', 1, true), recipe: () => give('oil', 1, true), trees: () => { give('shears', 1, true); st.planted = [0, 1, 2, 3]; }, hedgehog: () => { if (!st.q.crystal) st.q.crystal = 1; }, photos: () => give('camera', 1, true), delivery: () => give('lantern', 1, true), crystal: () => { st.f.vines = 1; walkGrid = null; give('lens', 1, true); }, lamp: () => { st.f.lamp = 1; } }[id];
      if (!QUESTS[id]) return false; if (fx) fx(); if (!st.q[id]) st.q[id] = 1; completeQuest(id, true); return true;
    }
    root.__game = {
      state: () => ({ started, zone: st.zone, x: +(pl.x / TS).toFixed(2), y: +(pl.y / TS).toFixed(2), area, clock: Math.round(st.clock), quests: Object.assign({}, st.q), inv: Object.assign({}, st.inv), journal: st.j.length, journalTotal: JOURNAL.length, flags: Object.assign({}, st.f), planted: st.planted.length, photos: st.photos.slice(), dialog: dlg ? { who: dlg.who, line: dlg.i, of: dlg.lines.length, text: dlg.lines[dlg.i] } : null, near: near ? near.id : null, track: trackedId(), panel: panelOpen ? tab : null }),
      teleport(a) { const p = AREA_POS[a]; if (!p) return false; path = null; placeNear(p[0] * TS, p[1] * TS); return true; },
      goto(id) { const it = interById[id]; if (!it) return false; path = null; return placeNear(it.x(), it.y()); },
      interact() { update(0); interact(); return near ? near.id : null; },
      next() { let n = 0; while (dlg && n++ < 50) { advance(); advance(); } return root.__game.state(); },
      completeQuest: forceComplete,
      giveAll() { ['gear', 'oil', 'lens', 'glasses', 'honey', 'berries', 'mint', 'shears', 'camera', 'basket', 'lantern', 'quartz', 'basalt', 'amethyst'].forEach(i => { if (!has(i)) give(i, 1, true); }); give('plank', Math.max(0, 4 - cnt('plank')), true); give('plastic', Math.max(0, 6 - cnt('plastic')), true); give('seedling', Math.max(0, 4 - cnt('seedling') - st.planted.length), true); save(); return Object.assign({}, st.inv); },
      discoverAll() { JOURNAL.forEach(j => { if (!st.j.includes(j.id)) st.j.push(j.id); }); rewards.push('journal'); save(); flushRewards(); return st.j.length; },
      choose(i) { if (!started) begin(i || 0); return started; },
      walkTo(xT, yT) { return walkTo(xT * TS, yT * TS, null); },
      time(c) { st.clock = c; },
      flags(o) { Object.assign(st.f, o || {}); chunks.clear(); walkGrid = null; return Object.assign({}, st.f); },
      reach() {
        const prevI = flood(24.1 * TS, 53.6 * TS), prevC = flood(56 * TS, 21.4 * TS), bad = [];
        inter.forEach(it => { const prev = it.zone === 'c' ? prevC : prevI, x = it.x(), y = it.y(); let ok = false; for (let gy = Math.floor((y - 56) / GS); gy <= Math.floor((y + 56) / GS) && !ok; gy++) for (let gx = Math.floor((x - 56) / GS); gx <= Math.floor((x + 56) / GS) && !ok; gx++) { if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue; const cx = gx * GS + 10, cy = gy * GS + 10; if (prev[gy * GW + gx] !== -2 && Math.hypot(cx - x, (cy - y) * 1.15) < 62) ok = true; } if (!ok) bad.push(it.id); });
        const caveDoor = prevI[Math.floor(13.5 * TS / GS) * GW + Math.floor(29.6 * TS / GS)] !== -2;
        return { unreachable: bad, caveDoorReachable: caveDoor };
      },
      fps() { return new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }); }
    };

    return {
      destroy() {
        alive = false; cancelAnimationFrame(raf); raf = 0;
        try { save(); } catch (_) { }
        window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur);
        document.removeEventListener('visibilitychange', onVis); ro.disconnect();
        timers.forEach(t => clearTimeout(t)); timers.clear();
        delete root.__game; sprites.clear(); chunks.clear();
      }
    };
  }

  /* =====================================================================================
     Card art
     ===================================================================================== */
  function thumb() {
    return `<defs><linearGradient id="exTs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd8a8"/><stop offset=".6" stop-color="#ffc3a6"/><stop offset="1" stop-color="#a9dcec"/></linearGradient><linearGradient id="exTw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb4d6"/><stop offset="1" stop-color="#2a7fb0"/></linearGradient><linearGradient id="exTb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3b0" stop-opacity=".85"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></linearGradient></defs>
      <rect width="160" height="80" fill="url(#exTs)"/><circle cx="34" cy="26" r="11" fill="#fff4cc"/>
      <path d="M118 22 L160 8 L160 30 Z" fill="url(#exTb)"/><path d="M118 22 L70 6 L70 20 Z" fill="url(#exTb)" opacity=".7"/>
      <rect y="52" width="160" height="28" fill="url(#exTw)"/><path d="M0 60 Q10 57 20 60 T40 60 T60 60 T80 60 T100 60 T120 60 T140 60 T160 60" stroke="#fff" stroke-opacity=".45" fill="none"/>
      <ellipse cx="86" cy="56" rx="62" ry="9" fill="#f4dfa9"/><path d="M30 56 Q46 30 76 34 Q96 22 122 32 Q140 40 146 56 Z" fill="#7cc46a"/><path d="M40 56 Q60 40 84 44 Q104 36 132 46 L138 56 Z" fill="#5fae5f"/>
      <circle cx="58" cy="40" r="7" fill="#3f8a46"/><circle cx="66" cy="37" r="8" fill="#4f9444"/><circle cx="74" cy="41" r="6" fill="#3f8a46"/>
      <rect x="88" y="40" width="12" height="9" fill="#fbe3d0"/><path d="M86 41 L94 34 L102 41 Z" fill="#d9674e"/>
      <path d="M114 46 L116 24 L122 24 L124 46 Z" fill="#fff"/><path d="M114.6 40 L123.4 40 L123 35 L115 35 Z M115.6 30 L122.4 30 L122.2 27 L115.8 27 Z" fill="#e0493f"/><rect x="114" y="18" width="10" height="6" rx="1" fill="#fff1a8"/><path d="M113 18 L119 13 L125 18 Z" fill="#e0493f"/>
      <path d="M20 66 L44 66 L40 71 L24 71 Z" fill="#f6f3ec"/><rect x="27" y="60" width="8" height="6" fill="#fff"/><path d="M38 66 L38 54 L45 57 L38 60" fill="#f5c542"/>
      <path d="M50 18 q3 -3 6 0 q3 -3 6 0" stroke="#fff" stroke-width="1.6" fill="none"/>`;
  }
  function art() {
    return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs>
      <linearGradient id="exAs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf9a"/><stop offset=".55" stop-color="#ffb8a2"/><stop offset="1" stop-color="#a9dcec"/></linearGradient>
      <linearGradient id="exAw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#54b8d8"/><stop offset="1" stop-color="#2676a8"/></linearGradient>
      <linearGradient id="exAb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6c0" stop-opacity=".9"/><stop offset="1" stop-color="#fff6c0" stop-opacity="0"/></linearGradient>
      <radialGradient id="exAg"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient>
      <linearGradient id="exAh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd06e"/><stop offset="1" stop-color="#5fae5f"/></linearGradient></defs>
      <rect width="320" height="170" fill="url(#exAs)"/><circle cx="70" cy="62" r="24" fill="#fff4cc" opacity=".95"/>
      <g fill="#fff" opacity=".75"><ellipse cx="128" cy="38" rx="26" ry="7"/><ellipse cx="146" cy="33" rx="16" ry="7"/><ellipse cx="262" cy="26" rx="22" ry="6"/></g>
      <path d="M236 58 L320 22 L320 74 Z" fill="url(#exAb)"/><path d="M236 58 L120 30 L120 52 Z" fill="url(#exAb)" opacity=".65"/>
      <rect y="112" width="320" height="58" fill="url(#exAw)"/>
      <g stroke="#fff" stroke-opacity=".45" fill="none" stroke-width="1.5"><path d="M0 128 Q16 124 32 128 T64 128 T96 128 T128 128 T160 128 T192 128 T224 128 T256 128 T288 128 T320 128"/><path d="M0 148 Q20 144 40 148 T80 148 T120 148 T160 148 T200 148 T240 148 T280 148 T320 148" stroke-opacity=".3"/></g>
      <ellipse cx="172" cy="118" rx="132" ry="16" fill="#e8f7f4" opacity=".8"/><ellipse cx="172" cy="116" rx="124" ry="14" fill="#f4dfa9"/>
      <path d="M58 116 Q80 70 128 74 Q160 52 200 64 Q226 50 252 66 Q276 80 288 116 Z" fill="url(#exAh)"/>
      <path d="M210 116 Q222 74 252 66 Q276 80 288 116 Z" fill="#a89c86"/><path d="M228 84 Q244 70 262 76 L270 92 Q250 86 236 94 Z" fill="#c4b8a0"/>
      <path d="M130 116 Q136 106 146 104 L146 116 Z" fill="#dcc08e"/><path d="M146 104 Q160 96 176 100 Q182 108 180 116 L146 116 Z" fill="#dcc08e" opacity=".8"/>
      <g><circle cx="92" cy="94" r="12" fill="#3f7a3a"/><circle cx="104" cy="88" r="14" fill="#4f9444"/><circle cx="118" cy="94" r="11" fill="#3f7a3a"/><circle cx="100" cy="84" r="6" fill="#8fd06e" opacity=".7"/>
        <path d="M76 100 L84 80 L92 100 Z" fill="#2f6a4c"/><path d="M128 98 L135 80 L142 98 Z" fill="#2f6a4c"/></g>
      <g><rect x="152" y="86" width="22" height="16" fill="#fbe3d0"/><path d="M148 88 L163 76 L178 88 Z" fill="#d9674e"/><rect x="160" y="93" width="6" height="9" fill="#b24a37"/>
        <rect x="180" y="90" width="18" height="13" fill="#e9f2f7"/><path d="M177 91 L189 82 L201 91 Z" fill="#4f9a8a"/></g>
      <circle cx="244" cy="44" r="22" fill="url(#exAg)"/>
      <path d="M234 92 L238 48 L250 48 L254 92 Z" fill="#fff"/><path d="M235 84 L253 84 L252.2 76 L235.8 76 Z M236.6 66 L251.4 66 L251 59 L237 59 Z" fill="#e0493f"/>
      <rect x="232" y="46" width="24" height="4" rx="2" fill="#3a3f4a"/><rect x="237" y="34" width="14" height="12" rx="2" fill="#fff1a8"/><path d="M235 34 L244 26 L253 34 Z" fill="#e0493f"/>
      <g><path d="M30 134 L80 134 L74 143 L36 143 Z" fill="#f6f3ec"/><rect x="30" y="134" width="50" height="2.5" fill="#2f6db0"/><rect x="42" y="122" width="16" height="12" rx="2" fill="#fff"/><rect x="40" y="119" width="20" height="4" rx="2" fill="#e0493f"/><path d="M68 134 L68 112 L78 117 L68 121" fill="#f5c542"/></g>
      <g stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"><path d="M104 46 q4 -4 8 0 q4 -4 8 0"/><path d="M120 58 q3 -3 6 0 q3 -3 6 0"/></g>
      <g><circle cx="196" cy="110" r="2.4" fill="#f29ac0"/><circle cx="204" cy="112" r="2.4" fill="#f5d548"/><circle cx="112" cy="110" r="2.4" fill="#fff"/></g>
    </svg>`;
  }

  Games.register({
    id: 'explorer', icon: '🧭', partner: 'p4', tier: 'top', cat: 'adventure', isNew: true,
    name: T('Insel der Entdeckungen', 'Island of Discoveries', 'Остров открытий', 'Острів відкриттів'),
    tagline: T('Erkunde eine Insel, hilf ihren Bewohnern und sammle 36 echte Naturfakten.', 'Explore an island, help its people and collect 36 real nature facts.', 'Исследуй остров, помогай жителям и собери 36 настоящих фактов о природе.', 'Досліджуй острів, допомагай мешканцям і збери 36 справжніх фактів про природу.'),
    kicker: T('Abenteuer & Wissen', 'Adventure & learning', 'Приключения и знания', 'Пригоди й знання'),
    badges: [
      { id: 'explorer_story', icon: '🗼', name: T('Leuchtturm repariert', 'Lighthouse repaired', 'Маяк починен', 'Маяк полагоджено') },
      { id: 'explorer_journal', icon: '📖', name: T('Alle 36 Entdeckungen', 'All 36 discoveries', 'Все 36 открытий', 'Усі 36 відкриттів') }
    ],
    thumb, art, mount,
    _test: { JOURNAL, QUESTS, ITEMS, D, STR, NPC_INFO, AREAS, classify, buildWorld }
  });
})();
