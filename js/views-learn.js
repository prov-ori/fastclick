import { h, clear, pluralRu } from './dom.js';
import * as Store from './store.js';
import { getCourse, findLesson, lessonText, starsFor } from './course.js';
import { createTyping } from './typing.js';
import { ring } from './charts.js';
import { formatSpeed, unitLabel, levelFor } from './engine.js';
import {
  cfg, stars, completeSession, isUnlocked, nextLesson, problemKeysBlock, speedChart,
  resultMetrics, langSwitch, pageHead,
} from './ui.js';

const LANG_NAME = { ru: 'Русская раскладка', en: 'Английская раскладка' };

// ---------------- Главная ----------------
export function homeView(ctx) {
  const s = cfg();
  const lang = s.lang;
  const tot = Store.totals();
  const st = Store.streak();
  const fresh = tot.sessions === 0;
  const next = nextLesson(lang);
  const course = getCourse(lang);
  const done = course.flat.filter((e) => (Store.lessonProgress(e.id)?.stars || 0) >= 1).length;
  const goalMs = s.dailyGoal * 60000;
  const today = Store.todayMs();
  const weak = Store.weakKeys(lang, 5);
  const lv = levelFor(tot.avg);

  const hero = h('section', { class: 'hero card' },
    h('div', { class: 'hero-text' },
      h('span', { class: 'eyebrow' }, fresh ? 'Добро пожаловать' : 'С возвращением'),
      h('h1', null, fresh ? 'Научитесь печатать вслепую' : 'Продолжим тренировку?'),
      h('p', { class: 'lead' }, fresh
        ? 'Десятипальцевый метод за несколько недель: пошаговый курс, живая подсветка пальцев, тесты скорости и разбор ваших слабых клавиш.'
        : `Следующий урок: этап ${next.stage + 1} «${course.stages[next.stage].title}», упражнение ${next.n}.`),
      h('div', { class: 'row gap' },
        h('a', { class: 'btn primary lg', href: `#/lesson/${next.id}` }, fresh ? 'Начать обучение' : 'Продолжить курс'),
        fresh
          ? h('a', { class: 'btn lg', href: '#/guide' }, 'Как правильно печатать')
          : h('a', { class: 'btn lg', href: '#/test' }, 'Тест скорости'),
      ),
    ),
    h('div', { class: 'hero-side' }, langSwitch(() => ctx.rerender()),
      h('div', { class: 'hero-progress' },
        h('div', { class: 'big' }, `${done}`, h('small', null, ` / ${course.flat.length}`)),
        h('div', { class: 'muted' }, `упражнений пройдено (${LANG_NAME[lang].toLowerCase()})`),
        h('div', { class: 'bar' }, h('div', { style: { width: `${(done / course.flat.length) * 100}%` } })),
      ),
    ),
  );

  const goalCard = h('div', { class: 'card goal' },
    h('div', { class: 'ringbox' }, ring(today / goalMs), h('div', { class: 'ring-t' }, `${Math.min(100, Math.round((today / goalMs) * 100))}%`)),
    h('div', null,
      h('h3', null, 'Цель на сегодня'),
      h('p', { class: 'muted' }, today >= goalMs
        ? 'Цель выполнена! Любое занятие сверх нормы - бонус.'
        : `Осталось ${Math.max(1, Math.ceil((goalMs - today) / 60000))} ${pluralRu(Math.ceil((goalMs - today) / 60000), 'минута', 'минуты', 'минут')} из ${s.dailyGoal}.`),
    ),
  );

  const streakCard = h('div', { class: 'card streak' },
    h('div', { class: 'streak-n' }, '🔥 ', String(st)),
    h('div', null, h('h3', null, pluralRu(st, 'день подряд', 'дня подряд', 'дней подряд')),
      h('p', { class: 'muted' }, st ? 'Не прерывайте серию - занимайтесь хоть по 5 минут.' : 'Позанимайтесь сегодня, чтобы начать серию.')),
  );

  const levelCard = h('div', { class: 'card level-card' },
    h('div', { class: 'big-emoji' }, lv.emoji),
    h('div', null,
      h('h3', null, tot.sessions ? lv.name : 'Пока без уровня'),
      h('p', { class: 'muted' }, tot.sessions
        ? `Средняя скорость: ${formatSpeed(tot.avg, s.unit)} ${unitLabel(s.unit)}${lv.next ? ` · до уровня «${lv.next.name}» ещё ${formatSpeed(lv.next.min - tot.avg, s.unit)}` : ''}`
        : 'Пройдите пару упражнений - мы оценим вашу скорость.'),
    ),
  );

  const tiles = h('div', { class: 'tiles' },
    tile('⏱️', 'Тест скорости', 'Проверьте, сколько знаков в минуту вы печатаете', '#/test'),
    tile('🎯', 'Слабые клавиши', weak.length ? `Тренируем: ${weak.map((w) => w.key.toUpperCase()).join(' ')}` : 'Появятся после нескольких занятий', '#/practice/weak', !weak.length),
    tile('📚', 'Практика', 'Тексты, свои клавиши, свободная печать', '#/practice'),
    tile('☄️', 'Игра «Метеориты»', 'Сбивайте падающие слова - тренируйте реакцию', '#/game'),
  );

  const el = h('div', { class: 'page' }, hero, h('div', { class: 'grid3' }, goalCard, streakCard, levelCard), h('h2', { class: 'sec' }, 'Режимы'), tiles);
  return { el };
}

function tile(icon, title, desc, href, dim = false) {
  return h('a', { class: `tile card ${dim ? 'dim' : ''}`, href },
    h('div', { class: 'tile-i' }, icon), h('h3', null, title), h('p', { class: 'muted' }, desc));
}

// ---------------- Курс ----------------
export function courseView(ctx) {
  const lang = cfg().lang;
  const course = getCourse(lang);
  const total = course.flat.length * 3;
  const got = course.flat.reduce((a, e) => a + (Store.lessonProgress(e.id)?.stars || 0), 0);

  const el = h('div', { class: 'page' },
    pageHead('Курс', `${LANG_NAME[lang]} · ${got} из ${total} звёзд`, langSwitch(() => ctx.rerender())),
  );
  const unitL = unitLabel(cfg().unit);
  let nextShown = false;
  const next = nextLesson(lang);

  course.stages.forEach((stage) => {
    const starsGot = stage.exercises.reduce((a, e) => a + (Store.lessonProgress(e.id)?.stars || 0), 0);
    const open = stage.exercises.some((e) => isUnlocked(lang, e.flat));
    const isNextStage = stage.idx === next.stage;
    const card = h('section', { class: `card stage ${open ? '' : 'locked'} ${isNextStage ? 'current' : ''}` },
      h('div', { class: 'stage-head' },
        h('div', { class: 'stage-n' }, String(stage.idx + 1)),
        h('div', { class: 'grow' },
          h('h3', null, stage.title),
          stage.newKeys && h('div', { class: 'chips' }, [...stage.newKeys].map((k) => h('kbd', null, k))),
        ),
        h('div', { class: 'stage-stars' }, `${starsGot}/${stage.exercises.length * 3} `, h('span', { class: 'star-i' }, '★')),
      ),
      h('div', { class: 'ex-row' }, stage.exercises.map((ex) => {
        const p = Store.lessonProgress(ex.id);
        const unlocked = isUnlocked(lang, ex.flat);
        const isNext = ex.id === next.id && !nextShown;
        if (isNext) nextShown = true;
        return h(unlocked ? 'a' : 'div', {
          class: `ex ${unlocked ? '' : 'lock'} ${isNext ? 'next' : ''} ${p && p.stars ? 'done' : ''}`,
          href: unlocked ? `#/lesson/${ex.id}` : null,
          'aria-disabled': unlocked ? null : 'true',
          title: unlocked ? `Цель: ${formatSpeed(ex.goal, cfg().unit)} ${unitL} и 97% точности` : 'Откроется после предыдущего упражнения',
        },
          h('div', { class: 'ex-t' }, unlocked ? ex.title : '🔒 ' + ex.title),
          stars(p ? p.stars : 0),
          h('div', { class: 'ex-s muted' }, p ? `лучшее: ${formatSpeed(p.bestCpm, cfg().unit)} · ${p.bestAcc}%` : unlocked ? `цель ${formatSpeed(ex.goal, cfg().unit)}` : ''),
        );
      })),
    );
    el.append(card);
  });
  return { el };
}

// ---------------- Урок ----------------
export function lessonView(ctx, id) {
  const ex = findLesson(id);
  const el = h('div', { class: 'page lesson' });
  if (!ex) {
    el.append(h('div', { class: 'card center' }, h('h2', null, 'Урок не найден'), h('a', { class: 'btn', href: '#/course' }, 'К курсу')));
    return { el };
  }
  const lang = id.split('-')[0];
  const course = getCourse(lang);
  const stage = course.stages[ex.stage];
  if (!isUnlocked(lang, ex.flat)) {
    el.append(h('div', { class: 'card center' },
      h('h2', null, '🔒 Упражнение закрыто'),
      h('p', { class: 'muted' }, 'Сначала пройдите предыдущее упражнение (хотя бы на одну звезду).'),
      h('a', { class: 'btn primary', href: '#/course' }, 'К курсу')));
    return { el };
  }

  const s = cfg();
  let typing = null;
  const area = h('div', { class: 'run' });
  const unit = s.unit;

  el.append(
    h('div', { class: 'crumbs' },
      h('a', { href: '#/course' }, '← Курс'),
      h('span', null, `Этап ${stage.idx + 1} · упражнение ${ex.n} из ${stage.exercises.length}`),
    ),
    h('h1', null, stage.title, h('small', { class: 'sub' }, ` - ${ex.title}`)),
    h('p', { class: 'muted' }, `Цель на 3 звезды: ${formatSpeed(ex.goal, unit)} ${unitLabel(unit)} и точность от 97%. Пройти упражнение: точность от 90%.`),
  );

  // подсказка раскрыта, пока упражнение не пройдено ни разу; потом её можно свернуть
  const firstVisit = !Store.lessonProgress(ex.id);
  el.append(h('details', { class: 'card tip', open: firstVisit && (ex.n === 1 || stage.kind !== 'letters') },
    h('summary', { class: 'tip-h' }, '💡 Перед началом'),
    h('p', null, stage.tip),
    stage.fingers && stage.fingers.length > 0 && h('div', { class: 'fingers' },
      stage.fingers.map((f) => h('div', { class: 'finger-i' }, h('kbd', null, f.ch === ' ' ? '␣' : f.ch), h('span', null, f.finger)))),
  ));
  el.append(area);

  function launch() {
    clear(area);
    const gen = () => lessonText(lang, ex);
    typing = createTyping({
      lang,
      text: gen(),
      regenerate: gen,
      strict: s.strict,
      mapByCode: s.mapByCode,
      showKeyboard: s.keyboard,
      hints: s.hints,
      unit,
      onFinish: onDone,
    });
    area.append(typing.el);
    typing.layout();
  }

  function onDone(res) {
    const entry = completeSession({ mode: 'lesson', lang, ref: ex.id }, res);
    if (!entry) {
      launch();
      return;
    }
    const n = starsFor(ex, res);
    const prev = Store.lessonProgress(ex.id)?.stars || 0;
    Store.recordLesson(ex.id, n, res);
    const nxt = course.flat[ex.flat + 1];
    clear(area);
    const verdict = n === 3 ? ['Безупречно!', 'Скорость и точность на высоте.']
      : n === 2 ? ['Отлично!', 'Ещё немного скорости - и будет максимум.']
      : n === 1 ? ['Пройдено', 'Можно двигаться дальше или добиться лучшего результата.']
      : ['Нужно повторить', res.accuracy < 90 ? 'Точность ниже 90%. Сбавьте темп: сначала точность, скорость придёт сама.' : 'Попробуйте ещё раз.'];
    area.append(h('div', { class: `card result ${n ? 'pass' : 'fail'}` },
      stars(n, 3, 'xl'),
      h('h2', null, verdict[0]),
      h('p', { class: 'muted' }, verdict[1] + (n > prev && prev > 0 ? ` Новый рекорд по звёздам: ${n}.` : '')),
      resultMetrics(res, unit),
      speedChart(res, unit),
      problemKeysBlock(res, lang),
      h('div', { class: 'row gap center' },
        h('button', { class: 'btn', onclick: launch }, '↻ Повторить'),
        n >= 1 && nxt && h('a', { class: 'btn primary', href: `#/lesson/${nxt.id}` }, 'Дальше →'),
        n >= 1 && !nxt && h('a', { class: 'btn primary', href: '#/stats' }, '🎓 Курс завершён!'),
        h('a', { class: 'btn ghost', href: '#/course' }, 'К курсу'),
      ),
    ));
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  launch();
  return { el, destroy: () => typing && typing.destroy() };
}
