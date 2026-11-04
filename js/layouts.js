// Раскладки клавиатуры: ЙЦУКЕН (ru) и QWERTY (en).
// Каждая клавиша знает свой ряд, колонку, палец, физический код (KeyboardEvent.code)
// и символы без Shift / с Shift.

export const FINGERS = [
  { id: 0, name: 'левый мизинец', short: 'Л-мизинец', hand: 'L' },
  { id: 1, name: 'левый безымянный палец', short: 'Л-безымянный', hand: 'L' },
  { id: 2, name: 'левый средний палец', short: 'Л-средний', hand: 'L' },
  { id: 3, name: 'левый указательный палец', short: 'Л-указательный', hand: 'L' },
  { id: 4, name: 'правый указательный палец', short: 'П-указательный', hand: 'R' },
  { id: 5, name: 'правый средний палец', short: 'П-средний', hand: 'R' },
  { id: 6, name: 'правый безымянный палец', short: 'П-безымянный', hand: 'R' },
  { id: 7, name: 'правый мизинец', short: 'П-мизинец', hand: 'R' },
  { id: 8, name: 'большой палец', short: 'Большой', hand: 'T' },
];

const COLS_FINGER = [
  [0, 0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7],
];

const CODES = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
];

const split = (s) => s.split(' ');

function build(id, name, low, up) {
  const keys = [];
  const map = Object.create(null); // символ -> описание
  const byCode = Object.create(null);
  low.forEach((rowStr, r) => {
    const lows = split(rowStr);
    const ups = split(up[r]);
    lows.forEach((l, c) => {
      const base = { row: r, col: c, code: CODES[r][c], finger: COLS_FINGER[r][c], low: l, up: ups[c] };
      keys.push(base);
      byCode[base.code] = base;
      map[l] = { ...base, shift: false, key: l };
      if (ups[c] !== l) map[ups[c]] = { ...base, shift: true, key: l };
    });
  });
  map[' '] = { row: 4, col: 0, code: 'Space', finger: 8, low: ' ', up: ' ', shift: false, key: ' ' };
  const letters = keys.filter((k) => k.low.toLowerCase() !== k.low.toUpperCase()).map((k) => k.low);
  return { id, name, keys, map, byCode, letters };
}

export const LAYOUTS = {
  ru: build(
    'ru',
    'Русская (ЙЦУКЕН)',
    [
      'ё 1 2 3 4 5 6 7 8 9 0 - =',
      'й ц у к е н г ш щ з х ъ \\',
      'ф ы в а п р о л д ж э',
      'я ч с м и т ь б ю .',
    ],
    [
      'Ё ! " № ; % : ? * ( ) _ +',
      'Й Ц У К Е Н Г Ш Щ З Х Ъ /',
      'Ф Ы В А П Р О Л Д Ж Э',
      'Я Ч С М И Т Ь Б Ю ,',
    ],
  ),
  en: build(
    'en',
    'English (QWERTY)',
    [
      '` 1 2 3 4 5 6 7 8 9 0 - =',
      'q w e r t y u i o p [ ] \\',
      'a s d f g h j k l ; \'',
      'z x c v b n m , . /',
    ],
    [
      '~ ! @ # $ % ^ & * ( ) _ +',
      'Q W E R T Y U I O P { } |',
      'A S D F G H J K L : "',
      'Z X C V B N M < > ?',
    ],
  ),
};

/** Какой Shift нужен для символа: 'L' | 'R' | null (противоположная рука). */
export function shiftSide(info) {
  if (!info || !info.shift) return null;
  return info.finger <= 3 ? 'R' : 'L';
}

export function isLetter(ch) {
  return ch.toLowerCase() !== ch.toUpperCase();
}

/** Определяет символ по событию клавиатуры. */
export function resolveKey(e, layout, byCode = true) {
  if (e.code === 'Space' || e.key === ' ') return ' ';
  if (byCode) {
    const k = layout.byCode[e.code];
    if (k) {
      const caps = e.getModifierState ? e.getModifierState('CapsLock') : false;
      const upper = isLetter(k.low) ? e.shiftKey !== caps : e.shiftKey;
      return upper ? k.up : k.low;
    }
  }
  if (e.key && e.key.length === 1) return e.key;
  return null;
}

export const ALPHABET_RE = { ru: /[а-яё]/i, en: /[a-z]/i };
