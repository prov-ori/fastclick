// Экранная клавиатура и руки с подсветкой пальцев.
import { LAYOUTS, FINGERS, shiftSide, isLetter } from './layouts.js';
import { h } from './dom.js';

const HOME = { ru: ['а', 'о'], en: ['f', 'j'] };

function keyLabel(k) {
  if (isLetter(k.low)) return h('span', { class: 'lo' }, k.up);
  return [h('span', { class: 'up' }, k.up), h('span', { class: 'lo' }, k.low)];
}

function wrap(flex, inner) {
  return h('div', { class: 'kw', style: { flex: String(flex) } }, inner);
}

function special(label, flex, cls = '') {
  return wrap(flex, h('div', { class: `key special ${cls}` }, label));
}

export function createKeyboard(lang) {
  const L = LAYOUTS[lang];
  const keyEls = Object.create(null);
  const el = h('div', { class: 'kbd', 'aria-hidden': 'true' });

  const keyEl = (k) => {
    const cls = `key f${k.finger}` + (HOME[lang].includes(k.low) ? ' home' : '');
    const e = h('div', { class: cls, 'data-k': k.low }, keyLabel(k));
    keyEls[k.low] = e;
    return wrap(1, e);
  };

  const rows = [[], [], [], [], []];
  const byRow = [0, 1, 2, 3].map((r) => L.keys.filter((k) => k.row === r));
  rows[0] = [...byRow[0].map(keyEl), special('⌫', 2)];
  rows[1] = [special('Tab', 1.5), ...byRow[1].slice(0, 12).map(keyEl), (() => { const w = keyEl(byRow[1][12]); w.style.flex = '1.5'; return w; })()];
  rows[2] = [special('Caps', 1.75), ...byRow[2].map(keyEl), special('Enter', 2.25)];
  const shiftL = special('Shift', 2.25, 'shift');
  const shiftR = special('Shift', 2.75, 'shift');
  rows[3] = [shiftL, ...byRow[3].map(keyEl), shiftR];
  const spaceKey = h('div', { class: 'key f8 space', 'data-k': ' ' }, 'пробел');
  keyEls[' '] = spaceKey;
  rows[4] = [wrap(3.75, ''), wrap(6.25, spaceKey), wrap(5, '')];
  rows.forEach((r) => el.append(h('div', { class: 'krow' }, r)));

  let nextEls = [];
  const api = {
    el,
    /** Подсветить следующую клавишу. Возвращает описание символа. */
    setNext(ch) {
      nextEls.forEach((e) => e.classList.remove('next'));
      nextEls = [];
      if (!ch) return null;
      const info = L.map[ch];
      if (!info) return null;
      const target = keyEls[info.key];
      if (target) {
        target.classList.add('next');
        nextEls.push(target);
      }
      if (info.shift) {
        const side = shiftSide(info);
        const s = (side === 'L' ? shiftL : shiftR).firstChild;
        s.classList.add('next');
        nextEls.push(s);
      }
      return info;
    },
    flash(ch, ok) {
      const info = L.map[ch];
      const e = info && keyEls[info.key];
      if (!e) return;
      const cls = ok ? 'hit-ok' : 'hit-bad';
      e.classList.remove('hit-ok', 'hit-bad');
      void e.offsetWidth; // перезапуск анимации
      e.classList.add(cls);
    },
    /** Тепловая карта: fn(key) -> число 0..1 или null. */
    heat(fn, hue) {
      for (const [k, e] of Object.entries(keyEls)) {
        const v = fn(k);
        if (v == null) {
          e.style.removeProperty('--heat');
          e.classList.remove('heated');
        } else {
          e.style.setProperty('--heat', String(Math.max(0, Math.min(1, v))));
          e.style.setProperty('--hue', String(hue));
          e.classList.add('heated');
        }
      }
    },
    keyEls,
  };
  return api;
}

// ---- руки ----
const LEFT = {
  0: [8, 40, 22, 50],
  1: [34, 24, 24, 66],
  2: [62, 14, 26, 76],
  3: [92, 24, 26, 66],
};
const THUMB = [118, 60, 36, 26];

export function createHands() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 320 112');
  svg.setAttribute('class', 'hands');
  svg.setAttribute('aria-hidden', 'true');
  const els = {};
  const rect = (x, y, w, hh, cls, id) => {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', x);
    r.setAttribute('y', y);
    r.setAttribute('width', w);
    r.setAttribute('height', hh);
    r.setAttribute('rx', Math.min(w, hh) / 2);
    r.setAttribute('class', cls);
    svg.append(r);
    if (id != null) els[id] = els[id] ? [...[].concat(els[id]), r] : r;
    return r;
  };
  // ладони
  rect(8, 82, 112, 26, 'palm');
  rect(200, 82, 112, 26, 'palm');
  for (const [id, [x, y, w, hh]] of Object.entries(LEFT)) {
    rect(x, y, w, hh, `fing f${id}`, id);
    const rid = 7 - Number(id);
    rect(320 - (x + w), y, w, hh, `fing f${rid}`, rid);
  }
  const [tx, ty, tw, th] = THUMB;
  const tl = rect(tx, ty, tw, th, 'fing f8', 'tl');
  const tr = rect(320 - (tx + tw), ty, tw, th, 'fing f8', 'tr');
  return {
    el: svg,
    set(fingerId) {
      svg.querySelectorAll('.fing.on').forEach((n) => n.classList.remove('on'));
      if (fingerId == null) return;
      if (fingerId === 8) {
        tl.classList.add('on');
        tr.classList.add('on');
      } else if (els[fingerId]) els[fingerId].classList.add('on');
    },
  };
}

export const fingerName = (id) => FINGERS[id].name;
