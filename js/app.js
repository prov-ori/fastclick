import * as Store from './store.js';
import { h, clear } from './dom.js';
import { applyTheme } from './ui.js';
import { setSoundEnabled } from './sound.js';
import { homeView, courseView, lessonView } from './views-learn.js';
import { testView, practiceView, gameView } from './views-practice.js';
import { statsView, settingsView, guideView } from './views-meta.js';

const NAV = [
  ['home', 'Главная'],
  ['course', 'Курс'],
  ['test', 'Тест'],
  ['practice', 'Практика'],
  ['game', 'Игра'],
  ['stats', 'Статистика'],
  ['guide', 'Как печатать'],
];

const TITLES = {
  home: 'Главная', course: 'Курс', lesson: 'Урок', test: 'Тест скорости', practice: 'Практика',
  game: 'Игра «Метеориты»', stats: 'Статистика', settings: 'Настройки', guide: 'Как печатать быстро',
};

const main = h('main', { id: 'app', tabindex: '-1' });
const navEl = h('nav', { class: 'nav', 'aria-label': 'Разделы' });
let current = null;

const ctx = { rerender: () => route() };

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, ...args] = raw.split('/');
  return { path: path || 'home', args };
}

function themeIcon() {
  const t = Store.settings().theme;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return dark ? '☀️' : '🌙';
}

function buildShell() {
  const themeBtn = h('button', {
    class: 'iconbtn',
    title: 'Сменить тему',
    'aria-label': 'Сменить тему',
    onclick: () => {
      const dark = themeIcon() === '☀️';
      Store.setSetting('theme', dark ? 'light' : 'dark');
      applyTheme();
      themeBtn.textContent = themeIcon();
    },
  }, themeIcon());

  NAV.forEach(([k, t]) => navEl.append(h('a', { href: `#/${k}`, 'data-nav': k }, t)));
  const header = h('header', { class: 'top' },
    h('a', { class: 'logo', href: '#/home', 'aria-label': 'FastClick - на главную' },
      h('span', { class: 'logo-mark', html: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>' }),
      h('span', null, 'Fast', h('b', null, 'Click'))),
    navEl,
    h('div', { class: 'top-actions' },
      h('a', { class: 'iconbtn', href: '#/settings', title: 'Настройки', 'aria-label': 'Настройки', 'data-nav': 'settings' }, '⚙️'),
      themeBtn),
  );
  const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches
    ? h('div', { class: 'notice' }, '⌨️ Для тренировки нужна физическая клавиатура. На телефоне можно изучать теорию и смотреть статистику.')
    : null;
  const footer = h('footer', { class: 'foot' },
    h('span', null, 'FastClick · платформа для обучения скоропечатанию'),
    h('span', { class: 'muted' }, 'Прогресс хранится в вашем браузере'));
  document.body.prepend(...[h('a', { class: 'skip', href: '#app' }, 'К содержимому'), header, touch, main, footer].filter(Boolean));
}

function route() {
  if (current && current.destroy) current.destroy();
  const { path, args } = parse();
  let view;
  switch (path) {
    case 'course': view = courseView(ctx); break;
    case 'lesson': view = lessonView(ctx, args[0] || ''); break;
    case 'test': view = testView(ctx); break;
    case 'practice': view = practiceView(ctx, args[0] || ''); break;
    case 'game': view = gameView(ctx); break;
    case 'stats': view = statsView(ctx); break;
    case 'settings': view = settingsView(ctx); break;
    case 'guide': view = guideView(ctx); break;
    default: view = homeView(ctx);
  }
  current = view;
  clear(main).append(view.el);
  const key = TITLES[path] ? path : 'home';
  document.title = `${TITLES[key]} · FastClick`;
  navEl.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.nav === key));
  document.querySelectorAll('.iconbtn[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === key));
  window.scrollTo(0, 0);
}

function init() {
  const s = Store.settings();
  applyTheme();
  setSoundEnabled(s.sound);
  buildShell();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  window.__fastclick = { Store };
}

init();
