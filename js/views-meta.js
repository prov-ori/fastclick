import { h, clear, toast } from './dom.js';
import * as Store from './store.js';
import { createKeyboard } from './keyboard.js';
import { lineChart, calendarChart } from './charts.js';
import { formatSpeed, unitLabel, formatTime, levelFor } from './engine.js';
import { FINGERS } from './layouts.js';
import { setSoundEnabled } from './sound.js';
import { cfg, metric, langSwitch, pageHead, applyTheme } from './ui.js';

const fmtDate = (ts) => {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const MODE_NAME = { lesson: 'Урок', test: 'Тест', practice: 'Практика', game: 'Игра' };

// ---------------- Статистика ----------------
export function statsView(ctx) {
  const s = cfg();
  const lang = s.lang;
  const state = Store.get();
  const tot = Store.totals();
  const unit = s.unit;
  const el = h('div', { class: 'page' }, pageHead('Статистика', 'Ваш прогресс, сильные и слабые стороны', langSwitch(() => ctx.rerender())));

  if (!state.history.length) {
    el.append(h('div', { class: 'card center' },
      h('div', { class: 'big-emoji' }, '📊'),
      h('h2', null, 'Пока пусто'),
      h('p', { class: 'muted' }, 'Здесь появятся графики и разбор ошибок после первого занятия.'),
      h('a', { class: 'btn primary', href: '#/lesson/ru-1-1' }, 'Начать обучение')));
    return { el };
  }

  const lv = levelFor(tot.avg);
  el.append(h('div', { class: 'metrics big' },
    metric('средняя скорость', `${formatSpeed(tot.avg, unit)}`, `${unitLabel(unit)} · последние 10`, 'accent'),
    metric('рекорд', `${formatSpeed(tot.best, unit)}`, unitLabel(unit)),
    metric('точность', `${tot.avgAcc.toFixed(1)}%`, 'последние 10'),
    metric('времени потрачено', formatTime(tot.ms), `${tot.sessions} занятий`),
    metric('напечатано', tot.chars.toLocaleString('ru-RU'), 'знаков'),
    metric('уровень', `${lv.emoji}`, lv.name),
  ));

  const sess = state.history.filter((e) => e.mode !== 'game').slice(-30);
  if (sess.length >= 2) {
    el.append(h('div', { class: 'grid2' },
      h('section', { class: 'card' }, h('h3', null, `Скорость, ${unitLabel(unit)}`),
        lineChart([{ name: unitLabel(unit), color: 'var(--accent)', area: true, points: sess.map((e) => formatSpeed(e.cpm, unit)) }],
          { labels: sess.map((e) => fmtDate(e.ts)) })),
      h('section', { class: 'card' }, h('h3', null, 'Точность, %'),
        lineChart([{ name: 'Точность', color: 'var(--good)', points: sess.map((e) => e.acc) }],
          { labels: sess.map((e) => fmtDate(e.ts)), min: Math.max(0, Math.floor(Math.min(...sess.map((e) => e.acc), 90) / 5) * 5 - 5), max: 100, fmtY: (v) => Math.round(v) })),
    ));
  }

  el.append(h('section', { class: 'card' },
    h('h3', null, 'Активность'),
    h('p', { class: 'muted' }, `Дневная цель: ${s.dailyGoal} мин. Серия: ${Store.streak()} дн.`),
    h('div', { class: 'scrollx' }, calendarChart(state.days, 18, s.dailyGoal * 60000))));

  // тепловая карта
  let mode = 'err';
  const kbHost = h('div', { class: 'tkb pick' });
  const kb = createKeyboard(lang);
  kbHost.append(kb.el);
  const stats = state.keys[lang] || {};
  const paint = () => {
    kb.heat((k) => {
      const st = stats[k];
      if (!st || st.n + st.e < 5) return null;
      if (mode === 'err') return Math.min(1, (st.e / (st.n + st.e)) * 10);
      return st.nl ? Math.max(0, Math.min(1, (st.ms / st.nl - 180) / 520)) : null;
    }, mode === 'err' ? 355 : 28);
  };
  for (const [k, node] of Object.entries(kb.keyEls)) {
    const st = stats[k];
    if (st) node.title = `${k === ' ' ? 'пробел' : k}: ошибок ${((st.e / Math.max(1, st.n + st.e)) * 100).toFixed(1)}%, ${st.nl ? Math.round(st.ms / st.nl) + ' мс' : 'нет данных'}`;
  }
  const modeSeg = h('div', { class: 'segs' });
  const drawSeg = () => {
    clear(modeSeg);
    [['err', 'Ошибки'], ['speed', 'Медленные']].forEach(([v, t]) =>
      modeSeg.append(h('button', { class: `seg ${mode === v ? 'on' : ''}`, onclick: () => { mode = v; drawSeg(); paint(); } }, t)));
  };
  drawSeg();
  paint();
  const weak = Store.weakKeys(lang, 6);
  el.append(h('section', { class: 'card' },
    h('div', { class: 'row between wrap' }, h('h3', null, 'Карта клавиш'), modeSeg),
    h('p', { class: 'muted' }, 'Чем краснее клавиша, тем чаще вы на ней ошибаетесь (или тем медленнее её нажимаете).'),
    kbHost,
    weak.length
      ? h('div', { class: 'row gap wrap between' },
        h('div', { class: 'chips' }, h('span', { class: 'muted' }, 'Слабые клавиши: '), weak.map((w) => h('span', { class: 'chip bad' }, h('kbd', null, w.key)))),
        h('a', { class: 'btn primary', href: '#/practice/weak' }, 'Тренировать'))
      : h('p', { class: 'muted' }, 'Слабых клавиш пока не обнаружено - отличная работа или мало данных.')));

  // достижения
  el.append(h('section', { class: 'card' },
    h('h3', null, `Достижения · ${Object.keys(state.badges).length}/${Store.BADGES.length}`),
    h('div', { class: 'badges' }, Store.BADGES.map((b) => {
      const got = state.badges[b.id];
      return h('div', { class: `badge ${got ? 'got' : ''}`, title: got ? `Получено ${new Date(got).toLocaleDateString('ru-RU')}` : 'Не получено' },
        h('div', { class: 'badge-i' }, b.icon), h('div', null, h('b', null, b.title), h('div', { class: 'muted small' }, b.desc)));
    }))));

  // история
  const rows = state.history.slice(-15).reverse();
  el.append(h('section', { class: 'card' },
    h('h3', null, 'Последние занятия'),
    h('div', { class: 'scrollx' },
      h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['Дата', 'Режим', 'Раскладка', unitLabel(unit), 'Точность', 'Время'].map((t) => h('th', null, t)))),
        h('tbody', null, rows.map((e) => h('tr', null,
          h('td', null, new Date(e.ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })),
          h('td', null, MODE_NAME[e.mode] || e.mode),
          h('td', null, e.lang.toUpperCase()),
          h('td', null, String(formatSpeed(e.cpm, unit))),
          h('td', null, `${e.acc}%`),
          h('td', null, formatTime(e.ms)))))))));
  return { el };
}

// ---------------- Настройки ----------------
export function settingsView(ctx) {
  const s = cfg();
  const el = h('div', { class: 'page narrow' }, pageHead('Настройки'));

  const row = (title, desc, control) =>
    h('div', { class: 'setting' }, h('div', null, h('b', null, title), desc && h('div', { class: 'muted small' }, desc)), control);

  const toggle = (key, after) => {
    const b = h('button', { class: `switch ${s[key] ? 'on' : ''}`, role: 'switch', 'aria-checked': String(!!s[key]) },
      h('span', { class: 'knob' }));
    b.addEventListener('click', () => {
      Store.setSetting(key, !s[key]);
      b.classList.toggle('on', s[key]);
      b.setAttribute('aria-checked', String(!!s[key]));
      after && after();
    });
    return b;
  };
  const seg = (key, opts, after) => {
    const wrap = h('div', { class: 'segs' });
    const draw = () => {
      clear(wrap);
      opts.forEach(([v, t]) => wrap.append(h('button', {
        class: `seg ${s[key] === v ? 'on' : ''}`,
        'aria-pressed': String(s[key] === v),
        onclick: () => { Store.setSetting(key, v); draw(); after && after(); },
      }, t)));
    };
    draw();
    return wrap;
  };

  el.append(
    h('section', { class: 'card' }, h('h3', null, 'Тренировка'),
      row('Язык тренировки', 'Раскладка для курса, тестов и практики', seg('lang', [['ru', 'Русский'], ['en', 'English']])),
      row('Ввод по положению клавиш', 'Можно тренировать русскую раскладку, даже если в системе включена английская (и наоборот). Выключите, если используете нестандартную раскладку (Dvorak, Colemak).', toggle('mapByCode')),
      row('Режим ошибок', 'Строгий: курсор стоит, пока не нажата верная клавиша. Классический: ошибки остаются в тексте, можно стирать.', seg('strict', [[true, 'Строгий'], [false, 'Классический']])),
      row('Подсказки', 'Подсветка следующей клавиши, палец и руки', toggle('hints')),
      row('Экранная клавиатура', null, toggle('keyboard')),
      row('Звуки', 'Щелчки при нажатиях и сигналы об ошибках', toggle('sound', () => setSoundEnabled(s.sound))),
    ),
    h('section', { class: 'card' }, h('h3', null, 'Внешний вид и цели'),
      row('Тема', null, seg('theme', [['auto', 'Авто'], ['light', 'Светлая'], ['dark', 'Тёмная']], applyTheme)),
      row('Единицы скорости', 'Знаки в минуту - привычная мера в России; слова в минуту (1 слово = 5 знаков) - международная.', seg('unit', [['cpm', 'зн/мин'], ['wpm', 'сл/мин']])),
      row('Цель на день', null, seg('dailyGoal', [[5, '5 мин'], [10, '10 мин'], [15, '15 мин'], [30, '30 мин']])),
      row('Открыть все уроки', 'Отключает последовательную разблокировку курса', toggle('unlockAll')),
    ),
  );

  const file = h('input', { type: 'file', accept: 'application/json', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try {
      Store.importJSON(await f.text());
      applyTheme();
      toast('Данные загружены', { icon: '✅' });
      ctx.rerender();
    } catch (err) {
      toast(`Не удалось загрузить: ${err.message}`, { icon: '⚠️' });
    }
  });
  el.append(h('section', { class: 'card' }, h('h3', null, 'Данные'),
    h('p', { class: 'muted' }, 'Прогресс хранится только в вашем браузере. Сделайте копию, чтобы перенести его на другое устройство.'),
    h('div', { class: 'row gap wrap' },
      h('button', {
        class: 'btn',
        onclick: () => {
          const a = h('a', { href: URL.createObjectURL(new Blob([Store.exportJSON()], { type: 'application/json' })), download: `fastclick-${Store.dayKey()}.json` });
          document.body.append(a);
          a.click();
          a.remove();
        },
      }, '⬇ Скачать копию'),
      h('button', { class: 'btn', onclick: () => file.click() }, '⬆ Загрузить копию'),
      file,
      h('button', {
        class: 'btn danger',
        onclick: () => {
          if (confirm('Удалить весь прогресс и статистику? Это нельзя отменить.')) {
            Store.reset();
            applyTheme();
            toast('Прогресс сброшен', { icon: '🗑️' });
            ctx.rerender();
          }
        },
      }, 'Сбросить всё'))));
  return { el };
}

// ---------------- Как печатать ----------------
export function guideView(ctx) {
  const lang = cfg().lang;
  const kb = createKeyboard(lang);
  kb.el.classList.add('colored');
  const legend = h('div', { class: 'legend' }, FINGERS.map((f) => h('span', { class: 'lg' }, h('i', { class: `dot f${f.id}` }), f.short)));
  const section = (icon, title, ...kids) => h('section', { class: 'card' }, h('h3', null, icon, ' ', title), ...kids);
  const el = h('div', { class: 'page narrow' },
    pageHead('Как печатать быстро', 'Пять минут теории избавят от привычек, которые тормозят годами', langSwitch(() => ctx.rerender())),
    section('🪑', 'Посадка',
      h('ul', null,
        h('li', null, 'Спина прямая, плечи расслаблены, стопы стоят на полу.'),
        h('li', null, 'Локти согнуты примерно под 90°, предплечья параллельны полу.'),
        h('li', null, 'Экран - на уровне глаз, на расстоянии вытянутой руки. Смотреть нужно только на экран.'),
        h('li', null, 'Кисти не лежат на столе тяжёлым грузом: они слегка «парят» над клавишами.'))),
    section('🏠', 'Домашний ряд',
      h('p', null, lang === 'ru'
        ? 'Пальцы левой руки лежат на Ф, Ы, В, А, правой - на О, Л, Д, Ж. Указательные пальцы нащупывают выступы на А и О. Большие пальцы - над пробелом.'
        : 'Пальцы левой руки лежат на A, S, D, F, правой - на J, K, L, ;. Указательные нащупывают выступы на F и J. Большие пальцы - над пробелом.'),
      h('p', null, 'После каждого нажатия палец возвращается на «домашнюю» клавишу. Это основа метода: мозг запоминает расстояние от дома до каждой клавиши.')),
    section('🎨', 'Какой палец за что отвечает',
      h('div', { class: 'tkb pick' }, kb.el), legend,
      h('p', { class: 'muted' }, 'Цвет нижней границы клавиши показывает палец. Каждый палец отвечает за свою колонку; на экране тренажёра нужный палец подсвечивается.')),
    section('🎯', 'Правила тренировки',
      h('ol', null,
        h('li', null, h('b', null, 'Сначала точность. '), 'Скорость - побочный эффект уверенных движений. Держите ошибки ниже 3%.'),
        h('li', null, h('b', null, 'Не смотрите на клавиатуру. '), 'Даже если больно хочется. Подсказки на экране для того и сделаны.'),
        h('li', null, h('b', null, 'Ритм важнее рывков. '), 'Печатайте ровно: одинаковые паузы между нажатиями.'),
        h('li', null, h('b', null, 'Занимайтесь каждый день. '), '10-15 минут ежедневно эффективнее часа раз в неделю.'),
        h('li', null, h('b', null, 'Не ловите ошибки на лету. '), 'Просто вернитесь на домашний ряд и продолжайте.'),
        h('li', null, h('b', null, 'Shift - противоположной рукой. '), 'Заглавная справа - левый Shift, слева - правый.'))),
    section('⏱️', 'Какая скорость нормальна?',
      h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['Уровень', 'зн/мин', 'сл/мин'].map((t) => h('th', null, t)))),
        h('tbody', null, [
          ['🌱 Новичок', '< 100', '< 20'], ['📘 Ученик', '100-180', '20-36'], ['💡 Уверенный', '180-260', '36-52'],
          ['🚀 Продвинутый', '260-350', '52-70'], ['🔥 Мастер', '350-450', '70-90'], ['⚡ Эксперт', '450+', '90+'],
        ].map((r) => h('tr', null, r.map((c) => h('td', null, c))))))),
    h('div', { class: 'row center' }, h('a', { class: 'btn primary lg', href: `#/lesson/${lang}-1-1` }, 'К первому уроку')),
  );
  return { el };
}
