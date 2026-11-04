import { WORDS, SENTENCES, PASSAGES } from './corpus.js';
import { LAYOUTS, isLetter } from './layouts.js';

const VOWELS = { ru: 'аеёиоуыэюя', en: 'aeiouy' };

/** Детерминированный ГСЧ (mulberry32) — нужен для тестов. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

/** Псевдослово из набора букв: стараемся чередовать гласные и согласные. */
export function pseudoWord(lang, chars, rng = Math.random, minLen = 2, maxLen = 5) {
  const set = [...new Set(chars)];
  const vow = set.filter((c) => VOWELS[lang].includes(c));
  const con = set.filter((c) => !VOWELS[lang].includes(c));
  const len = minLen + Math.floor(rng() * (maxLen - minLen + 1));
  let out = '';
  let wantVowel = rng() < 0.4;
  for (let i = 0; i < len; i++) {
    let pool;
    if (vow.length && con.length) pool = wantVowel ? vow : con;
    else pool = set;
    // иногда повторяем соседнюю букву — это тренирует ритм
    out += pool.length > 1 && i > 0 && rng() < 0.1 ? out[i - 1] : pick(pool, rng);
    wantVowel = !wantVowel;
  }
  return out;
}

/** Подходящие настоящие слова: все буквы ⊆ allowed. */
export function wordsFor(lang, allowed) {
  const ok = new Set(allowed);
  return WORDS[lang].filter((wd) => [...wd].every((c) => ok.has(c)));
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function takeUntil(gen, length) {
  const tokens = [];
  let total = 0;
  while (total < length) {
    const t = gen();
    tokens.push(t);
    total += t.length + 1;
  }
  return tokens.join(' ');
}

/**
 * Генерация упражнения.
 * spec:
 *  kind: 'drill' | 'mix' | 'words' | 'digits' | 'sentences' | 'symbols'
 *  chars:   символы, которые можно использовать (drill/mix/digits/symbols)
 *  allowed: буквы, разрешённые для настоящих слов (words/mix)
 *  focus:   буквы, которые нужно чаще встречать
 *  caps:    вероятность заглавной буквы в начале слова (0..1)
 */
export function generate(lang, spec, length = 100, rng = Math.random) {
  const { kind } = spec;
  const focus = spec.focus ? [...spec.focus] : [];
  const hasFocus = (wd) => focus.length === 0 || focus.some((c) => wd.includes(c));
  let text = '';

  if (kind === 'drill') {
    const chars = spec.chars;
    text = takeUntil(() => pseudoWord(lang, chars, rng, 2, 5), length);
  } else if (kind === 'mix' || kind === 'words') {
    const allowed = spec.allowed || spec.chars;
    const real = wordsFor(lang, allowed);
    const realFocus = real.filter(hasFocus);
    const pseudoChars = kind === 'mix' ? spec.chars : allowed;
    text = takeUntil(() => {
      const r = rng();
      if (realFocus.length >= 6 && r < 0.65) return pick(realFocus, rng);
      if (real.length >= 12 && r < 0.85) return pick(real, rng);
      if (kind === 'mix' && focus.length) {
        // псевдослово обязательно содержит новую букву
        let wd = pseudoWord(lang, pseudoChars, rng, 3, 5);
        if (!focus.some((c) => wd.includes(c))) wd = pick(focus, rng) + wd.slice(1);
        return wd;
      }
      return pseudoWord(lang, pseudoChars, rng, 3, 6);
    }, length);
  } else if (kind === 'digits') {
    const chars = [...spec.chars];
    text = takeUntil(() => {
      const n = 2 + Math.floor(rng() * 4);
      let s = '';
      for (let i = 0; i < n; i++) s += pick(chars, rng);
      return s;
    }, length);
  } else if (kind === 'symbols') {
    const chars = [...spec.chars];
    text = takeUntil(() => {
      const n = 2 + Math.floor(rng() * 3);
      let s = '';
      for (let i = 0; i < n; i++) s += pick(chars, rng);
      return s;
    }, length);
  } else if (kind === 'sentences') {
    const pool = SENTENCES[lang].filter((s) => (spec.digits ? true : !/\d/.test(s)));
    const tokens = [];
    let total = 0;
    const used = new Set();
    while (total < length && used.size < pool.length) {
      const s = pick(pool, rng);
      if (used.has(s)) continue;
      used.add(s);
      tokens.push(s);
      total += s.length + 1;
    }
    text = tokens.join(' ');
  }

  if (spec.caps) {
    text = text
      .split(' ')
      .map((wd) => (isLetter(wd[0] || '') && rng() < spec.caps ? capitalize(wd) : wd))
      .join(' ');
  }
  return text.trim();
}

/** Тексты для тестов скорости. */
export function testText(lang, mode, length, opts = {}, rng = Math.random) {
  const words = WORDS[lang];
  if (mode === 'prose') {
    const list = PASSAGES[lang];
    let out = '';
    const order = list.map((p) => p.text).sort(() => rng() - 0.5);
    for (const t of order) {
      out += (out ? ' ' : '') + t;
      if (out.length >= length) break;
    }
    return out;
  }
  if (mode === 'sentences') {
    return generate(lang, { kind: 'sentences', digits: true }, length, rng);
  }
  // слова: опционально с заглавными, знаками и цифрами
  const tokens = [];
  let total = 0;
  while (total < length) {
    let t = pick(words, rng);
    if (opts.caps && rng() < 0.2) t = capitalize(t);
    if (opts.digits && rng() < 0.12) t = String(Math.floor(rng() * 9000) + 10);
    if (opts.punct && rng() < 0.15) t += pick(['.', ',', '!', '?', ';', ':'], rng);
    tokens.push(t);
    total += t.length + 1;
  }
  return tokens.join(' ');
}

/** Тренировка слабых клавиш: слова с этими буквами + псевдослова. */
export function weakText(lang, weakKeys, length, rng = Math.random) {
  const letters = weakKeys.filter(isLetter);
  const others = weakKeys.filter((k) => !isLetter(k) && k !== ' ');
  const words = WORDS[lang].filter((wd) => letters.some((c) => wd.includes(c)));
  // частотные буквы, чтобы псевдослова не состояли только из «трудных» клавиш
  const freq = { ru: 'оаетнисрвл', en: 'etaoinsrhl' }[lang];
  const common = [...freq].filter((c) => !letters.includes(c) && LAYOUTS[lang].map[c]);
  return takeUntil(() => {
    const r = rng();
    if (letters.length && words.length >= 6 && r < 0.6) return pick(words, rng);
    if (letters.length && r < 0.9) return pseudoWord(lang, letters.concat(common.slice(0, 3)), rng, 3, 6);
    if (others.length) {
      const n = 2 + Math.floor(rng() * 3);
      let s = '';
      for (let i = 0; i < n; i++) s += pick(others.concat(letters.slice(0, 2)), rng);
      return s;
    }
    return pick(WORDS[lang], rng);
  }, length);
}

/** Слово для игры. */
export function gameWord(lang, level, rng = Math.random) {
  const maxLen = Math.min(4 + Math.floor(level / 2), 11);
  const minLen = Math.min(2 + Math.floor(level / 4), 6);
  const pool = WORDS[lang].filter((wd) => wd.length >= minLen && wd.length <= maxLen);
  return pick(pool.length ? pool : WORDS[lang], rng);
}
