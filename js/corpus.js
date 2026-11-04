// Корпус текстов. Только символы, которые есть на раскладке (без ё, «», тире).

const w = (s) => s.trim().split(/\s+/);

export const WORDS = {
  ru: w(`
    дом дым дар дал два для дня дело день дед дверь вода вор воз вол вес вид вина вино ветер вечер весна ваза вата вал
    фаза фар фон фонд фото флаг фраза фрукт фигура хлеб холод хор хата хвост жар жена жизнь жил жук жара жить
    лад лак лев лес лист лук лом лоб луна лето лодка лента лампа лавка лапа лига лимон линия лишь логика ложка
    ада ода ваза аллея алфавит атака ананас ангел арка арена автор август аптека артист
    пол пар пуск пыль пять парк пара плод поле порт поток почва песок перо перец письмо пекарь пример проект
    рад рак рука река рыба рост рана роль ранг ритм ручка рынок ремонт работа радио район разум рядом
    ком кот код кит кино класс книга крыша кошка комната команда кухня корень колесо капуста крепость
    нос нож нет ночь новый номер народ нота нить небо неделя начало надежда направо
    год гора город голос гость гусь гриб груша глина гитара горизонт
    шар шум шаг шея школа шарф шорох шкаф шахта шоколад
    щука щит щель щека щётка щедрость
    зал зов знак зима змея зуб зона звезда земля зелень здание зеркало звонок задача
    хор хит холм хутор химия хозяин хороший хватит характер
    твердый ъ
    сад сон сок суп сын сила слово снег стол стена степь сумка сестра синий свет север сосна страна
    мир мир мама мост море место мышь музыка машина молоко морковь метро метод момент мастер
    ил икра игра иней имя идея игрок институт информация интерес история
    тон тот тема тень тихо точка труд труба тетрадь текст телефон терпение торт трава тропа
    быт бок бег банк бант белый берег беда биржа бумага будущее бабочка библиотека
    юг юла юбка юмор юрист южный юность
    цель цвет цена центр цирк цепь цветок цифра цыпленок
    чай час чудо число чтение чаша чашка человек черный чистый честь четыре
    яма ядро яблоко язык ярко яркий январь ягода японский
    бытие эхо эра этаж экран эпоха эскиз энергия эмблема эстафета
    ключ крик кран крем кроме круг куб купить курс ковер конец
    лёд
    вперед везде вместе всегда вокруг вчера выбор высота выход вопрос восток время встреча взгляд
    дружба двор дорога доска доброе думать дождь дерево дробь добро
    голова глаза говорить главный гражданин город
    мальчик девочка друг подруга учитель ученик школьник студент врач повар
    красивый быстрый маленький большой высокий легкий новый старый добрый светлый тихий
    читать писать считать слушать смотреть думать играть работать учиться отдыхать печатать
    клавиатура компьютер монитор мышка экран файл папка сайт письмо сообщение программа
    пальцы ладонь скорость точность ритм тренировка урок упражнение навык практика результат успех
    утро день вечер ночь неделя месяц год сегодня завтра вчера сейчас потом всегда никогда
    один два три четыре пять шесть семь восемь девять десять
    красный зеленый желтый синий белый серый оранжевый фиолетовый
    весна лето осень зима дождь снег ветер солнце облако гроза радуга
    хлеб сыр масло яйцо суп каша чай кофе сахар мед пирог
  `).filter((x) => x !== 'ъ' && x.length > 1 && !x.includes('ё')),
  en: w(`
    a an as at be by do go he if in is it me my no of on or so to up us we
    add all and any are arm art ask bad bag bar bed big bit box boy but buy can car cat cup cut day did dig dog dry
    ear eat end eye far fat few fit fly for fun get god got gun guy had has her him his hit hot how ice its job joy
    key kid lay leg let lie lot low man map may men mix new nor not now odd off old one our out own pay pen put
    ran red rid row run sad say see set she sit six sky son sun tea ten the too top toy try two use van war was way
    who why win yes yet you zoo
    able about above after again along also always among animal answer around asked became because before began
    being below between black bring brown build carry change check child clean close color could dance dream drink
    early earth eight every field fight final first floor follow found friend front garden gave glass green group
    happy heard heart heavy house human large later laugh learn leave light little local lucky machine magic maybe
    metal might money month moral mother mouse music never night noise north other paper party peace person phone
    picture place plant point power press quick quiet radio reach ready river round scale school score second serve
    seven shape share short should simple sleep small smile sound south space speed spoke sport stand start state
    still story street strong study sugar sweet table taken teach thank their there these thing think third those
    three through time today together touch tower track train travel trust truth under until upon usual value voice
    water weather where which while white whole whose woman world would write wrong young
    keyboard typing finger speed accuracy practice lesson rhythm focus habit skill improve training result
    program computer screen window button simple design coffee morning evening winter summer spring autumn
    market bridge forest island garden pocket silver golden orange purple yellow
    jump quiz jazz fix vex zip box quartz
  `).filter((x) => x.length > 0),
};

export const SENTENCES = {
  ru: [
    'Привет, как дела?',
    'Сегодня хорошая погода, поэтому мы гуляем в парке.',
    'Москва - столица России.',
    'Я люблю читать книги по вечерам.',
    'Учиться никогда не поздно!',
    'Мама купила хлеб, молоко и сыр.',
    'Какой сегодня день недели?',
    'Мы поедем на море в июле.',
    'Тише едешь - дальше будешь.',
    'Без труда не вытащишь и рыбку из пруда.',
    'Анна и Павел пошли в кино.',
    'Утро вечера мудренее.',
    'В библиотеке было тихо и светло.',
    'Он сказал: "Давайте начнем!"',
    'Один раз увидеть лучше, чем сто раз услышать.',
    'Зимой в Сибири бывает очень холодно.',
    'Наш поезд отправляется в 18:45 с третьего пути.',
    'Дорогая Ольга! Поздравляю тебя с днем рождения.',
    'Работа не волк, в лес не убежит.',
    'Завтра в 9 часов у нас встреча в офисе.',
    'Сколько стоит этот билет? Он стоит 250 рублей.',
    'Красота спасет мир.',
    'Дождь шел весь день, но вечером выглянуло солнце.',
    'Клавиатура - главный инструмент современного человека.',
    'Печатай медленно, но без ошибок: скорость придет сама.',
    'Не торопись; каждая клавиша должна нажиматься уверенно.',
    'Дмитрий, Елена и Сергей готовят праздничный ужин.',
    'Волга впадает в Каспийское море.',
    'Я хочу выучить слепой десятипальцевый метод.',
    'Хорошее начало - половина дела.',
    'Спокойной ночи, приятных снов!',
    'Сначала точность, затем скорость.',
    'Кто рано встает, тому Бог подает.',
    'Лето, солнце, море - что может быть лучше?',
    'В комнате стоят стол, два стула и старый шкаф.',
    'Москва, Казань, Самара, Омск, Томск, Тула.',
    'Купи (пожалуйста) яблоки, груши и лимоны.',
    'Тренировка в течение 15 минут в день дает отличный результат.',
  ],
  en: [
    'Hello, how are you?',
    'The weather is nice today, so we are walking in the park.',
    'London is the capital of England.',
    'I like to read books in the evening.',
    "It's never too late to learn!",
    'Mom bought bread, milk and cheese.',
    'What day of the week is it?',
    'We will go to the sea in July.',
    'Slow and steady wins the race.',
    'The early bird catches the worm.',
    'Anna and Paul went to the cinema.',
    'The library was quiet and bright.',
    'He said: "Let us begin!"',
    'A picture is worth a thousand words.',
    'Winters in Siberia can be very cold.',
    'Our train leaves at 6:45 from platform three.',
    'Dear Olga, happy birthday to you!',
    'Practice makes perfect, but only if you practice correctly.',
    'Tomorrow at 9 o\'clock we have a meeting at the office.',
    'How much is this ticket? It costs 25 dollars.',
    'Rain fell all day, but the sun came out in the evening.',
    'The keyboard is the main tool of the modern person.',
    'Type slowly but without mistakes: speed will come by itself.',
    'Do not rush; every key should be pressed with confidence.',
    'David, Helen and Sergey are making a festive dinner.',
    'I want to learn the ten-finger touch typing method.',
    'A good start is half the work.',
    'Good night, sweet dreams!',
    'First accuracy, then speed.',
    'Summer, sun, sea - what could be better?',
    'The room has a table, two chairs and an old closet.',
    'Paris, Rome, Berlin, Madrid, Vienna, Prague.',
    'Please buy (some) apples, pears and lemons.',
    'Fifteen minutes of practice a day gives an excellent result.',
    'The quick brown fox jumps over the lazy dog.',
    'Pack my box with five dozen liquor jugs!',
  ],
};

export const PASSAGES = {
  ru: [
    {
      title: 'Слепой метод',
      text: 'Слепой десятипальцевый метод - это способ печати, при котором взгляд направлен на экран, а не на клавиатуру. Каждый палец отвечает за свои клавиши и возвращается на домашний ряд после нажатия. Сначала скорость будет небольшой, но через несколько недель регулярных занятий пальцы начнут находить буквы сами.',
    },
    {
      title: 'Утро в городе',
      text: 'Город просыпается рано. Первые трамваи выезжают из парка, пекари достают из печи горячий хлеб, а дворники метут улицы. Над крышами поднимается солнце, и окна домов загораются золотым светом. Скоро улицы наполнятся людьми, и начнется новый день.',
    },
    {
      title: 'Путешествие',
      text: 'Путешествия делают нас мудрее. Мы видим новые места, пробуем непривычную еду, знакомимся с людьми и учимся понимать чужие обычаи. Даже короткая поездка в соседний город может подарить много впечатлений, если смотреть вокруг внимательно и не спешить.',
    },
    {
      title: 'Здоровая привычка',
      text: 'Привычки формируются не за один день. Если заниматься каждый день по десять-пятнадцать минут, навык закрепится гораздо надежнее, чем после одной длинной тренировки раз в неделю. Главное - не пропускать занятия и следить за точностью: ошибки замедляют больше, чем осторожный темп.',
    },
    {
      title: 'Книги',
      text: 'Хорошая книга похожа на разговор с умным другом. Она может рассмешить, успокоить или заставить задуматься над важным вопросом. Читая, мы расширяем словарный запас, учимся строить мысли и лучше понимаем самих себя. Поэтому найдите время для чтения каждый вечер.',
    },
    {
      title: 'Лес осенью',
      text: 'Осенью лес становится особенно красивым. Листья берез желтеют, осины краснеют, а ели остаются темно-зелеными. Под ногами шуршит мягкий ковер из листьев, в воздухе пахнет грибами и дымом. Тишину нарушает лишь далекий стук дятла.',
    },
    {
      title: 'Технологии',
      text: 'Современные технологии меняют нашу жизнь с невероятной скоростью. Мы общаемся с друзьями на другом конце света, учимся онлайн и работаем из любой точки планеты. Умение быстро и уверенно печатать экономит часы времени и делает любую работу за компьютером приятнее.',
    },
    {
      title: 'Спорт',
      text: 'Спортсмены знают: результат приходит к тому, кто тренируется регулярно. Печать на клавиатуре тоже можно сравнить со спортом. Нужно разминаться, повторять движения до автоматизма, отдыхать и постепенно повышать нагрузку. Тогда каждый новый рекорд будет приходить естественно.',
    },
  ],
  en: [
    {
      title: 'Touch typing',
      text: 'Touch typing is a way of writing in which your eyes stay on the screen rather than on the keyboard. Every finger is responsible for its own keys and returns to the home row after each stroke. At first your speed will be small, but after a few weeks of regular practice your fingers will find the letters by themselves.',
    },
    {
      title: 'Morning in the city',
      text: 'The city wakes up early. The first trams leave the depot, bakers take hot bread out of the oven, and street cleaners sweep the roads. The sun rises above the roofs, and the windows of the houses glow with golden light. Soon the streets will fill with people, and a new day will begin.',
    },
    {
      title: 'Travel',
      text: 'Travel makes us wiser. We see new places, taste unfamiliar food, meet people and learn to understand foreign customs. Even a short trip to a nearby town can give you many impressions if you look around carefully and do not hurry.',
    },
    {
      title: 'A healthy habit',
      text: 'Habits are not formed in a single day. If you practice for ten or fifteen minutes every day, the skill will stick much better than after one long session once a week. The main thing is not to skip practice and to watch your accuracy: mistakes slow you down more than a careful pace.',
    },
    {
      title: 'Books',
      text: 'A good book is like a conversation with a clever friend. It can make you laugh, calm you down or make you think about an important question. By reading we expand our vocabulary, learn to build our thoughts and understand ourselves better. So find time to read every evening.',
    },
    {
      title: 'Forest in autumn',
      text: 'In autumn the forest becomes especially beautiful. The leaves of the birches turn yellow, the aspens turn red, and the firs stay dark green. A soft carpet of leaves rustles underfoot, and the air smells of mushrooms and smoke. The silence is broken only by the distant knock of a woodpecker.',
    },
    {
      title: 'Technology',
      text: 'Modern technology changes our lives with incredible speed. We talk with friends on the other side of the world, study online and work from any corner of the planet. The ability to type quickly and confidently saves hours of time and makes any work at the computer more pleasant.',
    },
    {
      title: 'Sport',
      text: 'Athletes know that results come to those who train regularly. Typing can be compared to sport as well. You need to warm up, repeat the movements until they become automatic, rest, and gradually raise the load. Then every new record will come naturally.',
    },
  ],
};
