// Движок набора: чистая логика без DOM — удобно тестировать.
//
// strict=true  — неверная клавиша не сдвигает курсор, ошибка засчитывается один раз за нажатие.
// strict=false — классический режим: неверный символ остаётся в тексте, работает Backspace.

export class TypingSession {
  constructor(text, { strict = true } = {}) {
    this.text = text;
    this.strict = strict;
    this.pos = 0;
    this.states = []; // для classic: 'c' | 'w' по позициям
    this.startT = null;
    this.endT = null;
    this.lastT = null;
    this.keystrokes = 0;
    this.errors = 0;
    this.done = false;
    this.perKey = Object.create(null); // ожидаемый символ -> {n, e, ms, nl}
    this.log = []; // [мс от старта, 1|0]
  }

  get started() {
    return this.startT !== null;
  }

  appendText(more) {
    this.text += ' ' + more;
  }

  _k(ch) {
    return (this.perKey[ch] ||= { n: 0, e: 0, ms: 0, nl: 0 });
  }

  /** Нажатие символа. Возвращает {ok, expected, pos, done}. */
  press(ch, t) {
    if (this.done) return null;
    if (this.startT === null) {
      this.startT = t;
      this.lastT = t;
    }
    const expected = this.text[this.pos];
    const ok = ch === expected;
    this.keystrokes++;
    this.log.push([t - this.startT, ok ? 1 : 0]);
    const k = this._k(expected);

    if (ok) {
      k.n++;
      const dt = t - this.lastT;
      if (this.keystrokes > 1 && dt > 0) {
        k.ms += Math.min(dt, 2000);
        k.nl++;
      }
    } else {
      k.e++;
      this.errors++;
    }
    this.lastT = t;

    const pos = this.pos;
    if (this.strict) {
      if (ok) this.pos++;
    } else {
      this.states[this.pos] = ok ? 'c' : 'w';
      this.pos++;
    }
    if (this.pos >= this.text.length) {
      this.done = true;
      this.endT = t;
    }
    return { ok, expected, pos, done: this.done };
  }

  /** Backspace — только в классическом режиме. Возвращает новую позицию или null. */
  backspace() {
    if (this.strict || this.done || this.pos === 0) return null;
    this.pos--;
    this.states[this.pos] = undefined;
    return this.pos;
  }

  get correctChars() {
    if (this.strict) return this.pos;
    let c = 0;
    for (let i = 0; i < this.pos; i++) if (this.states[i] === 'c') c++;
    return c;
  }

  /** Сдвигает отсчёт на время паузы (чтобы простой не снижал скорость). */
  shift(ms) {
    if (this.startT === null || this.done) return;
    this.startT += ms;
    this.lastT += ms;
  }

  finish(t) {
    if (!this.done) {
      this.done = true;
      this.endT = t;
    }
  }

  elapsed(t) {
    if (this.startT === null) return 0;
    return Math.max(0, (this.endT ?? t) - this.startT);
  }

  /** Текущая статистика (cpm — «чистые» символы в минуту). */
  stats(t) {
    const ms = this.elapsed(t);
    const min = ms / 60000;
    const correct = this.correctChars;
    // Первый знак ушёл на «старт» секундомера, поэтому за измеренное время набрано correct-1 знаков.
    const cpm = min > 0.0005 ? Math.max(0, correct - 1) / min : 0;
    const accuracy = this.keystrokes ? ((this.keystrokes - this.errors) / this.keystrokes) * 100 : 100;
    return {
      cpm,
      wpm: cpm / 5,
      accuracy,
      ms,
      chars: correct,
      keystrokes: this.keystrokes,
      errors: this.errors,
    };
  }

  result(t) {
    const s = this.stats(t);
    return { ...s, perKey: this.perKey, timeline: timeline(this.log, s.ms), text: this.text.slice(0, this.pos) };
  }
}

/** Скорость по секундам: [{sec, cpm (скользящая за 5 с), errors}] */
export function timeline(log, totalMs) {
  const secs = Math.max(1, Math.ceil(totalMs / 1000));
  const out = [];
  for (let s = 1; s <= secs; s++) {
    const end = s * 1000;
    const start = Math.max(0, end - 5000);
    let ok = 0;
    let err = 0;
    for (const [dt, good] of log) {
      if (dt > end) break;
      if (dt > start || (dt === 0 && start === 0)) good ? ok++ : err++;
    }
    const window = Math.min(5, s);
    out.push({ sec: s, cpm: (ok / window) * 60, errors: err });
  }
  return out;
}

export function formatSpeed(cpm, unit = 'cpm') {
  return unit === 'wpm' ? Math.round(cpm / 5) : Math.round(cpm);
}
export function unitLabel(unit = 'cpm') {
  return unit === 'wpm' ? 'сл/мин' : 'зн/мин';
}

export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Уровень скорости по зн/мин. */
export const LEVELS = [
  { min: 0, name: 'Новичок', emoji: '🌱' },
  { min: 100, name: 'Ученик', emoji: '📘' },
  { min: 180, name: 'Уверенный пользователь', emoji: '💡' },
  { min: 260, name: 'Продвинутый', emoji: '🚀' },
  { min: 350, name: 'Мастер клавиш', emoji: '🔥' },
  { min: 450, name: 'Эксперт', emoji: '⚡' },
  { min: 600, name: 'Легенда', emoji: '👑' },
];
export function levelFor(cpm) {
  let lv = LEVELS[0];
  for (const l of LEVELS) if (cpm >= l.min) lv = l;
  const next = LEVELS[LEVELS.indexOf(lv) + 1] || null;
  return { ...lv, next };
}
