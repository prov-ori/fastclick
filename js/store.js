// Хранилище прогресса (localStorage с безопасным откатом в память).
import { LAYOUTS } from './layouts.js';

const KEY = 'fastclick:v1';

export const DEFAULT_SETTINGS = {
  lang: 'ru',
  theme: 'auto',
  strict: true,
  sound: false,
  keyboard: true,
  hints: true,
  unit: 'cpm',
  mapByCode: true,
  unlockAll: false,
  dailyGoal: 10, // минут в день
};

function fresh() {
  return {
    v: 1,
    name: '',
    settings: { ...DEFAULT_SETTINGS },
    progress: {}, // lessonId -> {stars, bestCpm, bestAcc, plays}
    history: [], // {ts, mode, lang, cpm, acc, ms, chars, errors, ref}
    keys: { ru: {}, en: {} }, // lang -> низкий символ -> {n,e,ms,nl}
    days: {}, // YYYY-MM-DD -> {ms, chars, sessions}
    badges: {}, // id -> ts
    game: { ru: 0, en: 0 },
    pb: {}, // `${lang}:${seconds}` -> cpm (лучший в тестах)
  };
}

let memory = null;
let state = null;
const listeners = new Set();

function safeStorage() {
  try {
    const s = window.localStorage;
    const k = '__fc_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

const storage = typeof window !== 'undefined' ? safeStorage() : null;

function merge(base, extra) {
  const out = { ...base, ...extra };
  out.settings = { ...base.settings, ...(extra.settings || {}) };
  out.keys = { ru: {}, en: {}, ...(extra.keys || {}) };
  out.game = { ru: 0, en: 0, ...(extra.game || {}) };
  return out;
}

export function load() {
  if (state) return state;
  let raw = null;
  try {
    raw = storage ? storage.getItem(KEY) : memory;
  } catch {
    raw = memory;
  }
  state = fresh();
  if (raw) {
    try {
      state = merge(fresh(), JSON.parse(raw));
    } catch {
      /* повреждённые данные — начинаем с чистого листа */
    }
  }
  return state;
}

export function save() {
  const raw = JSON.stringify(state);
  memory = raw;
  try {
    if (storage) storage.setItem(KEY, raw);
  } catch {
    /* переполнение или приватный режим */
  }
  listeners.forEach((fn) => fn(state));
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const get = () => load();
export const settings = () => load().settings;

export function setSetting(k, v) {
  load().settings[k] = v;
  save();
}

export function reset() {
  state = fresh();
  save();
}

export function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || data.v !== 1) throw new Error('Неверный формат файла');
  state = merge(fresh(), data);
  save();
}

// ---- даты ----
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function streak(days = load().days, today = new Date()) {
  let n = 0;
  const d = new Date(today);
  if (!days[dayKey(d)]) d.setDate(d.getDate() - 1); // сегодня ещё можно успеть
  while (days[dayKey(d)] && days[dayKey(d)].ms > 0) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// ---- запись результатов ----

/** Сливает статистику по клавишам в накопленную (по базовому символу клавиши). */
export function mergeKeyStats(lang, perKey) {
  const L = LAYOUTS[lang];
  const store = (load().keys[lang] ||= {});
  for (const [ch, s] of Object.entries(perKey)) {
    const info = L.map[ch];
    const key = info ? info.key : ch;
    const t = (store[key] ||= { n: 0, e: 0, ms: 0, nl: 0 });
    t.n += s.n;
    t.e += s.e;
    t.ms += s.ms;
    t.nl += s.nl;
  }
}

/**
 * Записывает завершённую сессию.
 * meta: {mode, lang, ref?}; res: результат движка.
 */
export function recordSession(meta, res) {
  const s = load();
  const entry = {
    ts: Date.now(),
    mode: meta.mode,
    lang: meta.lang,
    cpm: Math.round(res.cpm),
    acc: Math.round(res.accuracy * 10) / 10,
    ms: Math.round(res.ms),
    chars: res.chars,
    errors: res.errors,
    ref: meta.ref || null,
  };
  s.history.push(entry);
  if (s.history.length > 600) s.history.splice(0, s.history.length - 600);
  const dk = dayKey();
  const day = (s.days[dk] ||= { ms: 0, chars: 0, sessions: 0 });
  day.ms += entry.ms;
  day.chars += entry.chars;
  day.sessions++;
  mergeKeyStats(meta.lang, res.perKey || {});
  save();
  return entry;
}

export function lessonProgress(id) {
  return load().progress[id] || null;
}

export function recordLesson(id, stars, res) {
  const s = load();
  const p = (s.progress[id] ||= { stars: 0, bestCpm: 0, bestAcc: 0, plays: 0 });
  p.plays++;
  p.stars = Math.max(p.stars, stars);
  p.bestCpm = Math.max(p.bestCpm, Math.round(res.cpm));
  p.bestAcc = Math.max(p.bestAcc, Math.round(res.accuracy * 10) / 10);
  save();
  return p;
}

export function recordPB(lang, seconds, cpm) {
  const s = load();
  const k = `${lang}:${seconds}`;
  const prev = s.pb[k] || 0;
  if (cpm > prev) {
    s.pb[k] = Math.round(cpm);
    save();
  }
  return { prev, isNew: cpm > prev };
}

// ---- аналитика ----

/** Слабые клавиши: ошибки и медленная скорость. Возвращает [{key, score, errRate, avgMs, n}] */
export function weakKeys(lang, limit = 6) {
  const stats = load().keys[lang] || {};
  const list = [];
  for (const [key, st] of Object.entries(stats)) {
    if (key === ' ') continue;
    const total = st.n + st.e;
    if (total < 8) continue;
    const errRate = st.e / total;
    const avgMs = st.nl ? st.ms / st.nl : 0;
    const score = errRate * 6 + Math.max(0, avgMs - 350) / 450;
    list.push({ key, score, errRate, avgMs, n: total });
  }
  list.sort((a, b) => b.score - a.score);
  return list.filter((x) => x.score > 0.12).slice(0, limit);
}

export function totals() {
  const s = load();
  const h = s.history;
  const ms = h.reduce((a, e) => a + e.ms, 0);
  const chars = h.reduce((a, e) => a + e.chars, 0);
  // слишком короткие попытки дают нерепрезентативную скорость
  const speeds = h.filter((e) => e.mode !== 'game' && e.chars >= 30 && e.ms >= 3000);
  const best = speeds.reduce((m, e) => Math.max(m, e.cpm), 0);
  const recent = speeds.slice(-10);
  const avg = recent.length ? recent.reduce((a, e) => a + e.cpm, 0) / recent.length : 0;
  const avgAcc = recent.length ? recent.reduce((a, e) => a + e.acc, 0) / recent.length : 0;
  return { sessions: h.length, ms, chars, best, avg, avgAcc };
}

export function todayMs() {
  return (load().days[dayKey()] || { ms: 0 }).ms;
}

// ---- достижения ----
export const BADGES = [
  { id: 'first', icon: '🎯', title: 'Первый шаг', desc: 'Завершить первое упражнение' },
  { id: 'stars3', icon: '⭐', title: 'Безупречно', desc: 'Получить 3 звезды за упражнение' },
  { id: 'ten', icon: '🔟', title: 'Разогрелись', desc: 'Завершить 10 упражнений' },
  { id: 'hundred', icon: '💯', title: 'Сотня', desc: 'Завершить 100 упражнений' },
  { id: 'cpm150', icon: '🐇', title: '150 зн/мин', desc: 'Достичь скорости 150 зн/мин' },
  { id: 'cpm250', icon: '🚀', title: '250 зн/мин', desc: 'Достичь скорости 250 зн/мин' },
  { id: 'cpm350', icon: '🔥', title: '350 зн/мин', desc: 'Достичь скорости 350 зн/мин' },
  { id: 'cpm450', icon: '⚡', title: '450 зн/мин', desc: 'Достичь скорости 450 зн/мин' },
  { id: 'clean', icon: '🧼', title: 'Чистая работа', desc: '100% точность на тексте от 100 знаков' },
  { id: 'streak3', icon: '📅', title: 'Три дня подряд', desc: 'Заниматься 3 дня подряд' },
  { id: 'streak7', icon: '🗓️', title: 'Неделя', desc: 'Заниматься 7 дней подряд' },
  { id: 'letters', icon: '🔤', title: 'Весь алфавит', desc: 'Пройти все буквенные этапы курса' },
  { id: 'course', icon: '🎓', title: 'Выпускник', desc: 'Пройти весь курс' },
  { id: 'game', icon: '☄️', title: 'Защитник', desc: 'Набрать 500 очков в игре' },
  { id: 'hour', icon: '⏱️', title: 'Час практики', desc: 'Суммарно заниматься 1 час' },
];

/** Проверяет и выдаёт новые бейджи. Возвращает список новых. */
export function checkBadges(courseInfo, last) {
  const s = load();
  const t = totals();
  const earned = [];
  const give = (id) => {
    if (!s.badges[id]) {
      s.badges[id] = Date.now();
      earned.push(BADGES.find((b) => b.id === id));
    }
  };
  if (t.sessions >= 1) give('first');
  if (t.sessions >= 10) give('ten');
  if (t.sessions >= 100) give('hundred');
  if (Object.values(s.progress).some((p) => p.stars >= 3)) give('stars3');
  if (t.best >= 150) give('cpm150');
  if (t.best >= 250) give('cpm250');
  if (t.best >= 350) give('cpm350');
  if (t.best >= 450) give('cpm450');
  if (last && last.mode !== 'game' && last.acc === 100 && last.chars >= 100) give('clean');
  const st = streak();
  if (st >= 3) give('streak3');
  if (st >= 7) give('streak7');
  if (t.ms >= 3600000) give('hour');
  if (Math.max(s.game.ru, s.game.en) >= 500) give('game');
  if (courseInfo) {
    for (const { lang, letterIds, allIds } of courseInfo) {
      if (letterIds.every((id) => (s.progress[id]?.stars || 0) >= 1)) give('letters');
      if (allIds.every((id) => (s.progress[id]?.stars || 0) >= 1)) give('course');
      void lang;
    }
  }
  if (earned.length) save();
  return earned;
}
