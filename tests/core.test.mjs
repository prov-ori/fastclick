import test from 'node:test';
import assert from 'node:assert/strict';
import { TypingSession, timeline, levelFor } from '../js/engine.js';
import { LAYOUTS, resolveKey, shiftSide } from '../js/layouts.js';
import { WORDS, SENTENCES, PASSAGES } from '../js/corpus.js';
import { generate, makeRng, testText, weakText, pseudoWord, gameWord } from '../js/generator.js';
import { getCourse, lessonText, starsFor } from '../js/course.js';

const typeable = (lang, text) => {
  const L = LAYOUTS[lang];
  return [...text].filter((c) => !L.map[c]);
};

test('раскладки: 47 клавиш + пробел, без дублей символов', () => {
  for (const lang of ['ru', 'en']) {
    const L = LAYOUTS[lang];
    assert.equal(L.keys.length, 13 + 13 + 11 + 10);
    const seen = new Set();
    for (const k of L.keys) {
      for (const c of [k.low, k.up]) {
        if (c === k.low && c === k.up) continue;
        assert.ok(!seen.has(c) || c === k.low, `дубль ${c}`);
      }
      assert.ok(k.finger >= 0 && k.finger <= 7);
    }
    assert.equal(L.letters.length, lang === 'ru' ? 33 : 26);
  }
});

test('resolveKey: по коду клавиши и по символу', () => {
  const ru = LAYOUTS.ru;
  assert.equal(resolveKey({ code: 'KeyA', key: 'f', shiftKey: false }, ru, true), 'ф');
  assert.equal(resolveKey({ code: 'KeyA', key: 'F', shiftKey: true }, ru, true), 'Ф');
  assert.equal(resolveKey({ code: 'KeyA', key: 'ф', shiftKey: false }, ru, false), 'ф');
  assert.equal(resolveKey({ code: 'Slash', key: ',', shiftKey: true }, ru, true), ',');
  assert.equal(resolveKey({ code: 'Slash', key: '.', shiftKey: false }, ru, true), '.');
  assert.equal(resolveKey({ code: 'Space', key: ' ' }, ru, true), ' ');
  assert.equal(resolveKey({ code: 'Numpad5', key: '5' }, ru, true), '5');
  // Caps Lock инвертирует регистр букв
  const caps = { code: 'KeyA', key: 'F', shiftKey: false, getModifierState: () => true };
  assert.equal(resolveKey(caps, ru, true), 'Ф');
  const capsShift = { code: 'KeyA', key: 'f', shiftKey: true, getModifierState: () => true };
  assert.equal(resolveKey(capsShift, ru, true), 'ф');
  assert.equal(resolveKey({ code: 'KeyQ', key: 'q', shiftKey: false }, LAYOUTS.en, true), 'q');
});

test('shiftSide: противоположная рука', () => {
  assert.equal(shiftSide(LAYOUTS.ru.map['Ф']), 'R');
  assert.equal(shiftSide(LAYOUTS.ru.map['О']), 'L');
  assert.equal(shiftSide(LAYOUTS.ru.map['о']), null);
});

test('корпус: все слова/предложения/абзацы можно набрать', () => {
  for (const lang of ['ru', 'en']) {
    const bad = [];
    WORDS[lang].forEach((wd) => bad.push(...typeable(lang, wd)));
    SENTENCES[lang].forEach((s) => bad.push(...typeable(lang, s)));
    PASSAGES[lang].forEach((p) => bad.push(...typeable(lang, p.text)));
    assert.deepEqual([...new Set(bad)], [], `${lang}: недопустимые символы`);
    assert.ok(WORDS[lang].length > 300);
  }
});

test('движок strict: ошибка не двигает курсор, accuracy считается по нажатиям', () => {
  const s = new TypingSession('abc', { strict: true });
  assert.equal(s.press('a', 1000).ok, true);
  assert.equal(s.press('x', 1200).ok, false);
  assert.equal(s.pos, 1);
  assert.equal(s.press('b', 1400).ok, true);
  const r = s.press('c', 1600);
  assert.equal(r.done, true);
  const st = s.stats();
  assert.equal(st.keystrokes, 4);
  assert.equal(st.errors, 1);
  assert.equal(Math.round(st.accuracy), 75);
  // 3 знака: первый запускает таймер, ещё 2 набраны за 0.6 сек = 200 зн/мин
  assert.equal(Math.round(st.cpm), 200);
  assert.equal(s.perKey.b.e, 1); // ошибка записана на ожидаемый символ 'b'
  assert.equal(s.perKey.b.n, 1);
});

test('движок strict: ошибка пишется на ожидаемый символ', () => {
  const s = new TypingSession('ab');
  s.press('a', 0);
  s.press('z', 100);
  assert.equal(s.perKey.b.e, 1);
});

test('движок classic: ошибка остаётся в тексте, Backspace исправляет', () => {
  const s = new TypingSession('abc', { strict: false });
  s.press('a', 0);
  s.press('x', 100);
  assert.equal(s.pos, 2);
  assert.equal(s.correctChars, 1);
  assert.equal(s.backspace(), 1);
  s.press('b', 200);
  const r = s.press('c', 300);
  assert.equal(r.done, true);
  assert.equal(s.correctChars, 3);
  assert.equal(s.errors, 1);
});

test('движок: нет скорости до первого нажатия, finish фиксирует время', () => {
  const s = new TypingSession('hello');
  assert.equal(s.stats(5000).cpm, 0);
  s.press('h', 1000);
  s.press('e', 1500);
  s.finish(61000);
  assert.equal(Math.round(s.stats(99999).ms), 60000);
  assert.equal(Math.round(s.stats(99999).cpm), 1);
});

test('timeline покрывает всю длительность', () => {
  const log = [[0, 1], [500, 1], [1500, 0], [2500, 1]];
  const t = timeline(log, 3000);
  assert.equal(t.length, 3);
  assert.equal(t[2].errors, 1);
});

test('генератор: детерминирован и не выходит за разрешённые буквы', () => {
  const a = generate('ru', { kind: 'drill', chars: 'фыва' }, 60, makeRng(1));
  const b = generate('ru', { kind: 'drill', chars: 'фыва' }, 60, makeRng(1));
  assert.equal(a, b);
  assert.ok(a.length >= 60);
  assert.ok([...a].every((c) => c === ' ' || 'фыва'.includes(c)));
  const w = generate('ru', { kind: 'words', allowed: 'фываолджпркенг' }, 150, makeRng(2));
  assert.ok([...w].every((c) => c === ' ' || 'фываолджпркенг'.includes(c)), w);
  const m = generate('en', { kind: 'mix', chars: 'asdfjkl', allowed: 'asdfjkl', focus: 'jkl' }, 90, makeRng(3));
  assert.ok([...m].every((c) => c === ' ' || 'asdfjkl'.includes(c)), m);
});

test('курс: все упражнения строятся из допустимых символов', () => {
  for (const lang of ['ru', 'en']) {
    const course = getCourse(lang);
    assert.ok(course.flat.length > 30);
    course.flat.forEach((ex, i) => assert.equal(ex.flat, i));
    for (let seed = 1; seed <= 5; seed++) {
      for (const ex of course.flat) {
        const text = lessonText(lang, ex, makeRng(seed * 977 + ex.flat));
        assert.ok(text.length >= Math.min(ex.length, 30) - 10, `${ex.id} слишком короткий`);
        assert.deepEqual(typeable(lang, text), [], `${ex.id}: ${text}`);
        assert.ok(!text.startsWith(' ') && !text.endsWith(' '));
        assert.ok(!text.includes('  '), `${ex.id}: двойной пробел`);
      }
    }
  }
});

test('курс: буквенные этапы вводят все буквы раскладки ровно один раз', () => {
  for (const lang of ['ru', 'en']) {
    const letters = getCourse(lang).stages.filter((s) => s.kind === 'letters').map((s) => s.newKeys.replace(';', '')).join('');
    assert.equal([...new Set(letters)].length, letters.length);
    assert.equal(letters.length, LAYOUTS[lang].letters.length);
  }
});

test('уроки используют только уже изученные буквы', () => {
  for (const lang of ['ru', 'en']) {
    const stages = getCourse(lang).stages.filter((s) => s.kind === 'letters');
    let known = '';
    for (const st of stages) {
      known += st.newKeys.replace(';', '');
      for (const ex of st.exercises) {
        const text = lessonText(lang, ex, makeRng(42));
        for (const c of text) {
          if (c === ' ' || c === ';') continue;
          assert.ok(known.includes(c), `${ex.id}: '${c}' ещё не изучена`);
        }
      }
    }
  }
});

test('звёзды', () => {
  const ex = { goal: 100 };
  assert.equal(starsFor(ex, { accuracy: 98, cpm: 120 }), 3);
  assert.equal(starsFor(ex, { accuracy: 96, cpm: 80 }), 2);
  assert.equal(starsFor(ex, { accuracy: 91, cpm: 10 }), 1);
  assert.equal(starsFor(ex, { accuracy: 80, cpm: 300 }), 0);
});

test('тестовые тексты и слабые клавиши', () => {
  for (const lang of ['ru', 'en']) {
    for (const mode of ['words', 'prose', 'sentences']) {
      const t = testText(lang, mode, 400, { caps: true, digits: true, punct: true }, makeRng(7));
      assert.deepEqual(typeable(lang, t), [], `${lang}/${mode}`);
      assert.ok(t.length >= 300);
    }
    const letters = LAYOUTS[lang].letters;
    const weak = weakText(lang, [letters[0], letters[3], '.'], 200, makeRng(5));
    assert.deepEqual(typeable(lang, weak), []);
    assert.ok(gameWord(lang, 1, makeRng(1)).length >= 2);
    assert.ok(pseudoWord(lang, 'ab', makeRng(1)).length >= 2);
  }
});

test('уровни', () => {
  assert.equal(levelFor(50).name, 'Новичок');
  assert.equal(levelFor(300).name, 'Продвинутый');
  assert.equal(levelFor(1000).next, null);
});
