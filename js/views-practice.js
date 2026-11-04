import { h, clear, toast } from './dom.js';
import * as Store from './store.js';
import { PASSAGES } from './corpus.js';
import { testText, weakText } from './generator.js';
import { createTyping } from './typing.js';
import { createKeyboard } from './keyboard.js';
import { createGame } from './game.js';
import { formatSpeed, unitLabel, levelFor } from './engine.js';
import {
  cfg, completeSession, problemKeysBlock, speedChart, resultMetrics, langSwitch, pageHead,
} from './ui.js';

function segmented(options, value, onPick, label) {
  const wrap = h('div', { class: 'segs', role: 'group', 'aria-label': label });
  options.forEach(([v, text]) => {
    wrap.append(h('button', {
      class: `seg ${v === value ? 'on' : ''}`,
      'aria-pressed': v === value ? 'true' : 'false',
      onclick: () => onPick(v),
    }, text));
  });
  return wrap;
}

function check(label, checked, onChange) {
  const input = h('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'check' }, input, h('span', null, label));
}

// ---------------- Тест скорости ----------------
const DURS = [[30, '30 сек'], [60, '1 мин'], [180, '3 мин'], [300, '5 мин']];
const MODES = [['words', 'Слова'], ['prose', 'Текст'], ['sentences', 'Предложения']];

export function testView(ctx) {
  const s = cfg();
  const lang = s.lang;
  const tc = { dur: 60, mode: 'words', caps: false, punct: false, digits: false, ...(s.testCfg || {}) };
  const save = () => { Store.setSetting('testCfg', tc); };
  const el = h('div', { class: 'page' });
  const body = h('div');
  let typing = null;

  function config() {
    typing && typing.destroy();
    clear(body);
    const pb = Store.get().pb[`${lang}:${tc.dur}`];
    body.append(h('div', { class: 'card config' },
      h('div', { class: 'field' }, h('label', null, 'Длительность'), segmented(DURS, tc.dur, (v) => { tc.dur = v; save(); config(); }, 'Длительность')),
      h('div', { class: 'field' }, h('label', null, 'Текст'), segmented(MODES, tc.mode, (v) => { tc.mode = v; save(); config(); }, 'Тип текста')),
      tc.mode === 'words' && h('div', { class: 'field' }, h('label', null, 'Усложнения'),
        h('div', { class: 'row gap wrap' },
          check('Заглавные', tc.caps, (v) => { tc.caps = v; save(); }),
          check('Знаки препинания', tc.punct, (v) => { tc.punct = v; save(); }),
          check('Цифры', tc.digits, (v) => { tc.digits = v; save(); }))),
      pb && h('p', { class: 'muted' }, `🏆 Ваш рекорд для этого режима: ${formatSpeed(pb, s.unit)} ${unitLabel(s.unit)}`),
      h('button', { class: 'btn primary lg', onclick: run }, 'Начать тест'),
      h('p', { class: 'muted small' }, 'Таймер стартует с первого нажатия. Esc - начать заново.'),
    ));
  }

  function run() {
    clear(body);
    const gen = (n) => testText(lang, tc.mode, n, tc);
    typing = createTyping({
      lang,
      text: gen(300),
      regenerate: () => gen(300),
      getMore: () => gen(200),
      timeLimit: tc.dur * 1000,
      strict: s.strict,
      mapByCode: s.mapByCode,
      showKeyboard: s.keyboard,
      hints: false, // в тесте подсказки отключены - как на экзамене
      unit: s.unit,
      onFinish: done,
    });
    body.append(
      h('div', { class: 'crumbs' }, h('button', { class: 'linkbtn', onclick: config }, '← Настройки теста'),
        h('span', null, `${tc.dur >= 60 ? tc.dur / 60 + ' мин' : tc.dur + ' сек'} · ${MODES.find((m) => m[0] === tc.mode)[1].toLowerCase()}`)),
      typing.el,
    );
    typing.layout();
  }

  function done(res) {
    const entry = completeSession({ mode: 'test', lang, ref: `${tc.mode}:${tc.dur}` }, res);
    clear(body);
    if (!entry) {
      body.append(h('div', { class: 'card center' }, h('h2', null, 'Тест не засчитан'),
        h('p', { class: 'muted' }, 'Слишком мало нажатий. Попробуйте ещё раз.'),
        h('button', { class: 'btn primary', onclick: run }, 'Заново')));
      return;
    }
    const pbInfo = Store.recordPB(lang, tc.dur, res.cpm);
    const lv = levelFor(res.cpm);
    const share = `FastClick: ${formatSpeed(res.cpm, 'cpm')} зн/мин (${Math.round(res.wpm)} сл/мин), точность ${res.accuracy.toFixed(1)}% - уровень «${lv.name}»`;
    body.append(h('div', { class: 'card result pass' },
      h('div', { class: 'big-emoji' }, lv.emoji),
      h('h2', null, lv.name),
      pbInfo.isNew && pbInfo.prev > 0 && h('p', { class: 'rec' }, `🏆 Новый личный рекорд! Было ${formatSpeed(pbInfo.prev, s.unit)}`),
      pbInfo.isNew && pbInfo.prev === 0 && h('p', { class: 'rec' }, '🏆 Первый результат в этом режиме - он станет рекордом'),
      !pbInfo.isNew && h('p', { class: 'muted' }, `Рекорд в этом режиме: ${formatSpeed(pbInfo.prev, s.unit)} ${unitLabel(s.unit)}`),
      resultMetrics(res, s.unit),
      speedChart(res, s.unit),
      problemKeysBlock(res, lang),
      h('div', { class: 'row gap center' },
        h('button', { class: 'btn primary', onclick: run }, '↻ Ещё раз'),
        h('button', { class: 'btn', onclick: config }, 'Настройки'),
        h('button', {
          class: 'btn ghost',
          onclick: () => {
            (navigator.clipboard ? navigator.clipboard.writeText(share) : Promise.reject()).then(
              () => toast('Результат скопирован', { icon: '📋' }),
              () => toast(share, { icon: '📋', ms: 7000 }),
            );
          },
        }, '📋 Поделиться'),
      ),
    ));
  }

  el.append(pageHead('Тест скорости', 'Сколько знаков в минуту вы печатаете без подсказок?', langSwitch(() => ctx.rerender())), body);
  config();
  return { el, destroy: () => typing && typing.destroy() };
}

// ---------------- Практика ----------------
export function practiceView(ctx, sub = '') {
  const s = cfg();
  const lang = s.lang;
  const el = h('div', { class: 'page' });
  const body = h('div');
  let typing = null;

  const tabs = h('nav', { class: 'tabs', 'aria-label': 'Режимы практики' },
    [['', 'Тексты'], ['weak', 'Слабые клавиши'], ['custom', 'Свои клавиши']].map(([k, t]) =>
      h('a', { class: `tab ${k === sub ? 'on' : ''}`, href: `#/practice${k ? '/' + k : ''}` }, t)));

  el.append(pageHead('Практика', 'Свободные тренировки без оценок и звёзд', langSwitch(() => ctx.rerender())), tabs, body);

  /** Запускает тренировку с генерацией текста; по завершению — результат. */
  function run(makeText, ref, back) {
    typing && typing.destroy();
    clear(body);
    typing = createTyping({
      lang,
      text: makeText(),
      regenerate: makeText,
      strict: s.strict,
      mapByCode: s.mapByCode,
      showKeyboard: s.keyboard,
      hints: s.hints,
      unit: s.unit,
      onFinish: (res) => {
        const entry = completeSession({ mode: 'practice', lang, ref }, res);
        clear(body);
        body.append(h('div', { class: 'card result pass' },
          h('h2', null, entry ? 'Готово!' : 'Слишком короткая попытка'),
          entry && resultMetrics(res, s.unit),
          entry && speedChart(res, s.unit),
          entry && problemKeysBlock(res, lang),
          h('div', { class: 'row gap center' },
            h('button', { class: 'btn primary', onclick: () => run(makeText, ref, back) }, '↻ Ещё раз'),
            h('button', { class: 'btn', onclick: back }, 'Назад'),
          ),
        ));
      },
    });
    body.append(h('div', { class: 'crumbs' }, h('button', { class: 'linkbtn', onclick: back }, '← Назад')), typing.el);
    typing.layout();
  }

  if (sub === 'weak') {
    const show = () => {
      typing && typing.destroy();
      clear(body);
      const weak = Store.weakKeys(lang, 6);
      if (!weak.length) {
        body.append(h('div', { class: 'card center' },
          h('h3', null, 'Пока недостаточно данных'),
          h('p', { class: 'muted' }, 'Сначала позанимайтесь по курсу или пройдите тест - тренажёр запомнит, какие клавиши даются вам хуже всего.'),
          h('a', { class: 'btn primary', href: '#/course' }, 'К курсу')));
        return;
      }
      body.append(h('div', { class: 'card' },
        h('h3', null, 'Ваши слабые клавиши'),
        h('p', { class: 'muted' }, 'Рейтинг строится по доле ошибок и медленным нажатиям. Тексты ниже будут содержать эти буквы чаще обычного.'),
        h('table', { class: 'tbl' },
          h('thead', null, h('tr', null, ['Клавиша', 'Ошибки', 'Среднее время', 'Нажатий'].map((t) => h('th', null, t)))),
          h('tbody', null, weak.map((w) => h('tr', null,
            h('td', null, h('kbd', null, w.key)),
            h('td', null, `${(w.errRate * 100).toFixed(1)}%`),
            h('td', null, w.avgMs ? `${Math.round(w.avgMs)} мс` : '-'),
            h('td', null, String(w.n)))))),
        h('div', { class: 'row gap' },
          h('button', { class: 'btn primary lg', onclick: () => run(() => weakText(lang, weak.map((w) => w.key), 260), 'weak', show) }, 'Тренировать'),
        ),
      ));
    };
    show();
  } else if (sub === 'custom') {
    const picked = new Set();
    const kb = createKeyboard(lang);
    const count = h('span', { class: 'muted' }, 'Выберите клавиши, которые хотите потренировать');
    const go = h('button', { class: 'btn primary lg', disabled: true }, 'Тренировать выбранные');
    const show = () => {
      typing && typing.destroy();
      clear(body);
      body.append(h('div', { class: 'card' },
        h('h3', null, 'Свои клавиши'),
        h('p', { class: 'muted' }, 'Нажимайте на клавиши - текст будет состоять из слов с этими буквами (для знаков - из самих знаков).'),
        h('div', { class: 'tkb pick' }, kb.el),
        h('div', { class: 'row gap center' }, go, count)));
    };
    Object.entries(kb.keyEls).forEach(([k, node]) => {
      if (k === ' ') return;
      node.style.cursor = 'pointer';
      node.addEventListener('click', () => {
        picked.has(k) ? picked.delete(k) : picked.add(k);
        node.classList.toggle('sel', picked.has(k));
        go.disabled = picked.size === 0;
        count.textContent = picked.size ? `Выбрано: ${[...picked].join(' ')}` : 'Выберите клавиши, которые хотите потренировать';
      });
    });
    go.addEventListener('click', () => {
      const keys = [...picked];
      run(() => weakText(lang, keys, 240), 'custom', show);
    });
    show();
  } else {
    const list = () => {
      typing && typing.destroy();
      clear(body);
      body.append(h('div', { class: 'passages' },
        h('button', {
          class: 'card passage random',
          onclick: () => run(() => PASSAGES[lang][Math.floor(Math.random() * PASSAGES[lang].length)].text, 'passage', list),
        }, h('h3', null, '🎲 Случайный текст'), h('p', { class: 'muted' }, 'Каждый раз новый отрывок')),
        PASSAGES[lang].map((p) => h('button', { class: 'card passage', onclick: () => run(() => p.text, `passage:${p.title}`, list) },
          h('h3', null, p.title),
          h('p', { class: 'muted' }, p.text.slice(0, 90) + '…'),
          h('span', { class: 'chip' }, `${p.text.length} знаков`)))));
    };
    list();
  }
  return { el, destroy: () => typing && typing.destroy() };
}

// ---------------- Игра ----------------
export function gameView(ctx) {
  const s = cfg();
  const lang = s.lang;
  const el = h('div', { class: 'page' });
  const st = Store.get();
  const game = createGame({
    lang,
    mapByCode: s.mapByCode,
    best: st.game[lang] || 0,
    onEnd: (res) => {
      if (res.score > (st.game[lang] || 0)) {
        st.game[lang] = res.score;
        Store.save();
      }
      completeSession({ mode: 'game', lang, ref: 'meteors' }, { ...res, wpm: res.cpm / 5 });
    },
  });
  el.append(pageHead('Метеориты', 'Печатайте слова до того, как они упадут. Esc - закончить игру, Backspace - сбросить цель.', langSwitch(() => ctx.rerender())), game.el);
  return { el, destroy: () => game.destroy() };
}
