// Общие UI-блоки и логика завершения сессий.
import { h, toast } from './dom.js';
import * as Store from './store.js';
import { getCourse } from './course.js';
import { formatSpeed, unitLabel, formatTime, levelFor } from './engine.js';
import { lineChart } from './charts.js';
import { sfx } from './sound.js';
import { LAYOUTS } from './layouts.js';

export const cfg = () => Store.settings();

export function stars(n, max = 3, cls = '') {
  return h('span', { class: `stars ${cls}`, 'aria-label': `${n} из ${max} звёзд` },
    Array.from({ length: max }, (_, i) => h('span', { class: i < n ? 'on' : '' }, '★')));
}

export function metric(label, value, sub = '', cls = '') {
  return h('div', { class: `metric ${cls}` },
    h('div', { class: 'metric-v' }, value),
    h('div', { class: 'metric-l' }, label),
    sub && h('div', { class: 'metric-s' }, sub),
  );
}

export function courseInfo() {
  return ['ru', 'en'].map((lang) => {
    const c = getCourse(lang);
    return {
      lang,
      letterIds: c.stages.filter((s) => s.kind === 'letters').flatMap((s) => s.exercises.map((e) => e.id)),
      allIds: c.flat.map((e) => e.id),
    };
  });
}

/** Сохраняет сессию, выдаёт достижения. Возвращает запись истории или null (слишком короткая). */
export function completeSession(meta, res) {
  if (res.keystrokes < 5 || res.chars < 3) return null;
  const entry = Store.recordSession(meta, res);
  const badges = Store.checkBadges(courseInfo(), entry);
  badges.forEach((b) => toast(`Достижение: ${b.title}`, { icon: b.icon, ms: 4500 }));
  sfx.done();
  return entry;
}

export function isUnlocked(lang, flatIdx) {
  if (Store.settings().unlockAll || flatIdx === 0) return true;
  const prev = getCourse(lang).flat[flatIdx - 1];
  return (Store.lessonProgress(prev.id)?.stars || 0) >= 1;
}

export function nextLesson(lang) {
  const flat = getCourse(lang).flat;
  return flat.find((e) => (Store.lessonProgress(e.id)?.stars || 0) < 1) || flat[flat.length - 1];
}

/** Клавиши с наибольшим числом ошибок в сессии. */
export function problemKeys(res, lang, n = 5) {
  const L = LAYOUTS[lang];
  const agg = {};
  for (const [ch, s] of Object.entries(res.perKey)) {
    if (!s.e) continue;
    const k = L.map[ch] ? L.map[ch].key : ch;
    agg[k] = (agg[k] || 0) + s.e;
  }
  return Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function problemKeysBlock(res, lang) {
  const list = problemKeys(res, lang);
  if (!list.length) return h('p', { class: 'muted center' }, '🎉 Ни одной ошибки - так держать!');
  return h('div', { class: 'problem' },
    h('div', { class: 'muted' }, 'Больше всего ошибок:'),
    h('div', { class: 'chips' },
      list.map(([k, n]) => h('span', { class: 'chip bad' }, h('kbd', null, k === ' ' ? '␣' : k), ` ×${n}`))),
  );
}

export function speedChart(res, unit) {
  const tl = res.timeline;
  if (!tl || tl.length < 2) return null;
  return h('div', { class: 'chart-wrap' },
    lineChart(
      [{ name: unitLabel(unit), color: 'var(--accent)', area: true, points: tl.map((t) => formatSpeed(t.cpm, unit)) }],
      { labels: tl.map((t) => `${t.sec}с`), h: 180 },
    ),
  );
}

export function resultMetrics(res, unit) {
  return h('div', { class: 'metrics' },
    metric(unitLabel(unit), formatSpeed(res.cpm, unit), unit === 'cpm' ? `${Math.round(res.wpm)} сл/мин` : `${Math.round(res.cpm)} зн/мин`, 'accent'),
    metric('точность', `${res.accuracy.toFixed(1)}%`, '', res.accuracy >= 97 ? 'good' : res.accuracy < 90 ? 'bad' : ''),
    metric('время', formatTime(res.ms)),
    metric('ошибки', String(res.errors), `${res.chars} знаков`),
  );
}

export function levelBadge(cpm) {
  const lv = levelFor(cpm);
  return h('span', { class: 'level' }, `${lv.emoji} ${lv.name}`);
}

export function applyTheme() {
  const t = Store.settings().theme;
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t;
  else delete root.dataset.theme;
}

export function link(href, children, cls = '') {
  return h('a', { href, class: cls }, children);
}

export function pageHead(title, sub, right = null) {
  return h('div', { class: 'page-head' },
    h('div', null, h('h1', null, title), sub && h('p', { class: 'muted' }, sub)),
    right,
  );
}

export function langSwitch(onChange) {
  const cur = Store.settings().lang;
  const mk = (l, label) =>
    h('button', {
      class: `seg ${cur === l ? 'on' : ''}`,
      'aria-pressed': cur === l ? 'true' : 'false',
      onclick: () => {
        Store.setSetting('lang', l);
        onChange && onChange(l);
      },
    }, label);
  return h('div', { class: 'segs', role: 'group', 'aria-label': 'Язык тренировки' }, mk('ru', 'Русский'), mk('en', 'English'));
}
