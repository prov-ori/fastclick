// Структура курса: этапы -> упражнения. Тексты генерируются заново при каждой попытке.
import { LAYOUTS, FINGERS } from './layouts.js';
import { generate, makeRng } from './generator.js';
import { PASSAGES } from './corpus.js';

const LETTER_STAGES = {
  ru: [
    { keys: 'фыва', title: 'Левая рука: домашний ряд', tip: 'Поставьте пальцы левой руки на ф, ы, в, а - это ваш «домашний» ряд. Указательный палец лежит на букве «а» (на ней есть выступ). Большим пальцем нажимайте пробел.' },
    { keys: 'олдж', title: 'Правая рука: домашний ряд', tip: 'Правая рука: указательный на «о» (там тоже выступ), затем л, д, ж. После каждого нажатия возвращайте палец на домашнюю клавишу.' },
    { keys: 'пр', title: 'Указательные пальцы', tip: 'Указательные пальцы работают за две колонки: левый тянется к «п», правый - к «р». Не сдвигайте всю кисть, тянется только палец.' },
    { keys: 'кенг', title: 'Верхний ряд: указательные', tip: 'Тянитесь вверх указательными пальцами: к, е - левым; н, г - правым. Вернулись - снова на домашний ряд.' },
    { keys: 'ушит', title: 'Верхний ряд и нижний ряд', tip: 'у и ш - средние пальцы вверх, и - левый указательный вниз, т - правый указательный вниз.' },
    { keys: 'мьсб', title: 'Нижний ряд', tip: 'Нижний ряд: с и б - средние пальцы, м и ь - указательные. Пальцы слегка сгибаются, кисть остаётся на месте.' },
    { keys: 'цщчю', title: 'Безымянные пальцы', tip: 'Безымянные пальцы слабее остальных, поэтому тренируйте их спокойно: ц, ч - левый, щ, ю - правый.' },
    { keys: 'зхэя', title: 'Мизинцы', tip: 'Мизинцы отвечают за крайние клавиши: я - левый, з, х, э - правый. Не напрягайте кисть и не поднимайте локти.' },
    { keys: 'йъё', title: 'Последние буквы', tip: 'Осталось три буквы: й (левый мизинец), ъ (правый мизинец вверх и вправо) и ё (левый мизинец, левее единицы).' },
  ],
  en: [
    { keys: 'asdf', title: 'Левая рука: домашний ряд', tip: 'Поставьте пальцы левой руки на A, S, D, F - это ваш «домашний» ряд. Указательный палец лежит на F (на ней есть выступ). Большим пальцем нажимайте пробел.' },
    { keys: 'jkl;', letters: 'jkl', title: 'Правая рука: домашний ряд', tip: 'Правая рука: указательный палец на J (там тоже выступ), затем K, L и точка с запятой. После каждого нажатия возвращайте палец на домашнюю клавишу.' },
    { keys: 'gh', title: 'Указательные пальцы', tip: 'Указательные пальцы работают за две колонки: левый тянется к G, правый - к H. Двигается только палец, кисть остаётся на месте.' },
    { keys: 'ei', title: 'Верхний ряд: средние пальцы', tip: 'Средние пальцы тянутся вверх: E - левый, I - правый. Вернулись - снова на домашний ряд.' },
    { keys: 'ru', title: 'Верхний ряд: указательные', tip: 'Левый указательный тянется к R, правый - к U.' },
    { keys: 'ty', title: 'Верхний ряд: дальние клавиши', tip: 'T и Y - длинный «выпад» указательных пальцев. Не поворачивайте кисть, тянитесь пальцем.' },
    { keys: 'op', title: 'Верхний ряд: правая сторона', tip: 'O - безымянный палец правой руки, P - мизинец правой руки.' },
    { keys: 'wq', title: 'Верхний ряд: левая сторона', tip: 'W - левый безымянный палец, Q - левый мизинец.' },
    { keys: 'cn', title: 'Нижний ряд', tip: 'C - левый средний палец, N - правый указательный. Пальцы слегка согнуты, кисть неподвижна.' },
    { keys: 'mv', title: 'Нижний ряд: указательные', tip: 'V - левый указательный, M - правый указательный.' },
    { keys: 'bxz', title: 'Последние буквы', tip: 'B - левый указательный, X - левый безымянный, Z - левый мизинец.' },
  ],
};

const SYMBOLS = { ru: '-:;?!"()', en: '-=\'":;?!()' };

function stageGoal(i, scale = 1) {
  return Math.round(Math.min(55 + i * 7, 190) * scale);
}

function fingerList(lang, keys) {
  const L = LAYOUTS[lang];
  return [...keys]
    .filter((c) => L.map[c])
    .map((c) => ({ ch: c, finger: FINGERS[L.map[c].finger].name }));
}

function buildCourse(lang) {
  const stages = [];
  let known = '';
  let n = 0;
  const L = LETTER_STAGES[lang];

  const push = (stage) => {
    stage.idx = stages.length;
    stage.id = `${lang}-${stage.idx + 1}`;
    stage.exercises.forEach((ex, k) => {
      ex.id = `${lang}-${stage.idx + 1}-${k + 1}`;
      ex.stage = stage.idx;
      ex.n = k + 1;
      ex.flat = n++;
    });
    stages.push(stage);
  };

  L.forEach((s, i) => {
    const letters = s.letters || s.keys;
    known += letters;
    const goal = stageGoal(i);
    const allKnown = known;
    const newK = letters;
    push({
      title: s.title,
      tip: s.tip,
      newKeys: s.keys,
      fingers: fingerList(lang, s.keys),
      kind: 'letters',
      exercises: [
        { title: 'Новые клавиши', spec: { kind: 'drill', chars: s.keys }, length: i === 0 ? 45 : 60, goal: goal * 0.8 },
        { title: 'Закрепление', spec: { kind: 'mix', chars: allKnown, allowed: allKnown, focus: newK }, length: 90, goal: goal * 0.9 },
        { title: 'Слова', spec: { kind: 'words', allowed: allKnown, focus: newK }, length: 120, goal },
        { title: 'Контрольное', spec: { kind: 'words', allowed: allKnown }, length: 180, goal: goal * 1.1 },
      ],
    });
  });

  const base = L.length;
  const all = LAYOUTS[lang].letters.join('');
  const sym = SYMBOLS[lang];

  push({
    title: 'Заглавные буквы',
    tip: 'Для заглавной буквы зажмите Shift ПРОТИВОПОЛОЖНОЙ рукой: буква справа - левый Shift, буква слева - правый Shift. Мизинцем!',
    newKeys: '',
    kind: 'shift',
    exercises: [
      { title: 'Слова с заглавной', spec: { kind: 'words', allowed: all, caps: 0.6 }, length: 100, goal: stageGoal(base) * 0.8 },
      { title: 'Имена и фразы', spec: { kind: 'sentences', caps: 0 }, length: 130, goal: stageGoal(base) * 0.9 },
      { title: 'Только заглавные начала', spec: { kind: 'words', allowed: all, caps: 1 }, length: 130, goal: stageGoal(base) * 0.9 },
      { title: 'Контрольное', spec: { kind: 'sentences' }, length: 200, goal: stageGoal(base) },
    ],
  });

  push({
    title: 'Знаки препинания',
    tip: lang === 'ru'
      ? 'Точка - правый мизинец (клавиша справа от «ю»). Запятая - та же клавиша с Shift. Вопросительный знак, двоеточие, тире, скобки и кавычки - тоже на верхнем ряду цифр.'
      : 'Точка и запятая - правые безымянный и средний пальцы (нижний ряд). Вопросительный знак, двоеточие и кавычки печатаются с Shift. Тренируйтесь не спеша.',
    newKeys: sym,
    kind: 'symbols',
    exercises: [
      { title: 'Знаки без слов', spec: { kind: 'symbols', chars: sym }, length: 60, goal: stageGoal(base + 1, 0.55) },
      { title: 'Предложения', spec: { kind: 'sentences' }, length: 140, goal: stageGoal(base + 1, 0.8) },
      { title: 'Больше предложений', spec: { kind: 'sentences' }, length: 200, goal: stageGoal(base + 1, 0.9) },
      { title: 'Контрольное', spec: { kind: 'sentences' }, length: 260, goal: stageGoal(base + 1) },
    ],
  });

  push({
    title: 'Цифры 1-5',
    tip: 'Цифры 1-5 - левая рука: 1 и 2 - мизинец и безымянный, 3 - средний, 4 и 5 - указательный. Тянитесь вверх через ряд, затем возвращайтесь.',
    newKeys: '12345',
    kind: 'digits',
    exercises: [
      { title: 'Новые клавиши', spec: { kind: 'digits', chars: '12345' }, length: 50, goal: stageGoal(base + 2, 0.5) },
      { title: 'Закрепление', spec: { kind: 'digits', chars: '12345' }, length: 80, goal: stageGoal(base + 2, 0.6) },
      { title: 'Контрольное', spec: { kind: 'digits', chars: '12345' }, length: 120, goal: stageGoal(base + 2, 0.7) },
    ],
  });

  push({
    title: 'Цифры 6-0',
    tip: 'Цифры 6-0 - правая рука: 6 и 7 - указательный, 8 - средний, 9 - безымянный, 0 - мизинец.',
    newKeys: '67890',
    kind: 'digits',
    exercises: [
      { title: 'Новые клавиши', spec: { kind: 'digits', chars: '67890' }, length: 50, goal: stageGoal(base + 3, 0.5) },
      { title: 'Все цифры', spec: { kind: 'digits', chars: '1234567890' }, length: 100, goal: stageGoal(base + 3, 0.6) },
      { title: 'Контрольное', spec: { kind: 'digits', chars: '1234567890' }, length: 150, goal: stageGoal(base + 3, 0.7) },
    ],
  });

  push({
    title: 'Свободная печать',
    tip: 'Финал курса: длинные связные тексты. Не спешите, следите за точностью и держите ровный ритм.',
    newKeys: '',
    kind: 'final',
    exercises: PASSAGES[lang].slice(0, 4).map((p, i) => ({
      title: p.title,
      spec: { kind: 'passage', index: i },
      length: p.text.length,
      goal: stageGoal(base + 4 + i, 1),
    })),
  });

  const flat = stages.flatMap((s) => s.exercises);
  return { lang, stages, flat };
}

const cache = {};
export function getCourse(lang) {
  return (cache[lang] ||= buildCourse(lang));
}

export function findLesson(id) {
  const lang = id.split('-')[0];
  const course = getCourse(lang);
  return course.flat.find((e) => e.id === id) || null;
}

export function lessonText(lang, ex, rng = Math.random) {
  if (ex.spec.kind === 'passage') return PASSAGES[lang][ex.spec.index].text;
  return generate(lang, ex.spec, ex.length, rng);
}

/** Звёзды за результат (0 — не пройдено). */
export function starsFor(ex, res) {
  const acc = res.accuracy;
  const cpm = res.cpm;
  if (acc >= 97 && cpm >= ex.goal) return 3;
  if (acc >= 95 && cpm >= ex.goal * 0.7) return 2;
  if (acc >= 90) return 1;
  return 0;
}

export { makeRng };
