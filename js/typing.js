// Компонент тренажёра: текст, живая статистика, экранная клавиатура, подсказки.
import { TypingSession, formatSpeed, unitLabel, formatTime } from './engine.js';
import { LAYOUTS, FINGERS, resolveKey, ALPHABET_RE, shiftSide } from './layouts.js';
import { createKeyboard, createHands } from './keyboard.js';
import { h, toast } from './dom.js';
import { sfx } from './sound.js';

export function createTyping(opts) {
  const {
    lang,
    text,
    getMore = null,
    strict = true,
    mapByCode = true,
    timeLimit = 0, // мс; 0 — без лимита
    showKeyboard = true,
    hints = true,
    unit = 'cpm',
    onFinish,
    onRestart,
  } = opts;

  const L = LAYOUTS[lang];
  let session = new TypingSession(text, { strict });
  let chars = [];
  let wrongStreak = 0;
  let warnedLayout = false;
  let finished = false;
  let blurAt = null;
  let tick = null;
  let curText = text;

  // --- DOM ---
  const stat = (label, id) =>
    h('div', { class: 'tstat' }, h('div', { class: 'tstat-v', id }, '0'), h('div', { class: 'tstat-l' }, label));
  const vTime = stat('время', 'sv-time');
  const vSpeed = stat(unitLabel(unit), 'sv-speed');
  const vAcc = stat('точность', 'sv-acc');
  const caps = h('div', { class: 'caps-warn', hidden: true }, '⇪ Caps Lock включён');
  const bar = h('div', { class: 'tbar' }, vTime, vSpeed, vAcc, caps);
  const progress = h('div', { class: 'tprogress' }, h('div', { class: 'tprogress-in' }));
  const ttext = h('div', { class: 'ttext', lang: lang === 'ru' ? 'ru' : 'en' });
  const startHint = h('div', { class: 'tstart' }, 'Начните печатать - таймер запустится сам');
  const pause = h('div', { class: 'tpause', hidden: true }, h('b', null, 'Пауза'), h('span', null, 'Вернитесь на страницу, чтобы продолжить'));
  const box = h('div', { class: 'tbox' }, ttext, startHint, pause);
  const hint = h('div', { class: 'thint', 'aria-live': 'off' });
  const kb = createKeyboard(lang);
  const hands = createHands();
  const kbWrap = h('div', { class: 'tkb' }, kb.el, hands.el);
  if (!showKeyboard) kbWrap.hidden = true;
  const foot = h('div', { class: 'tfoot' },
    h('span', null, h('kbd', null, 'Esc'), ' начать заново'),
    !strict && h('span', null, h('kbd', null, 'Backspace'), ' стереть'),
  );
  const el = h('div', { class: 'typing' }, bar, progress, box, hint, kbWrap, foot);

  function build(txt) {
    ttext.textContent = '';
    chars = [];
    const words = txt.split(' ');
    words.forEach((wd, wi) => {
      const ws = h('span', { class: 'word' });
      [...wd].forEach((c) => {
        const s = h('span', { class: 'ch' }, c);
        chars.push(s);
        ws.append(s);
      });
      ttext.append(ws);
      if (wi < words.length - 1) {
        const sp = h('span', { class: 'ch sp' }, ' ');
        chars.push(sp);
        ttext.append(sp);
      }
    });
  }

  function extend(more) {
    const start = chars.length;
    const sp = h('span', { class: 'ch sp' }, ' ');
    chars.push(sp);
    ttext.append(sp);
    more.split(' ').forEach((wd, wi, arr) => {
      const ws = h('span', { class: 'word' });
      [...wd].forEach((c) => {
        const s = h('span', { class: 'ch' }, c);
        chars.push(s);
        ws.append(s);
      });
      ttext.append(ws);
      if (wi < arr.length - 1) {
        const sp2 = h('span', { class: 'ch sp' }, ' ');
        chars.push(sp2);
        ttext.append(sp2);
      }
    });
    void start;
  }

  let lineH = 0;
  function placeCaret() {
    chars.forEach((c) => c.classList.remove('cur'));
    const cur = chars[session.pos];
    if (!cur) return;
    cur.classList.add('cur');
    if (!el.isConnected) return; // размеры известны только после вставки в документ
    if (!lineH) lineH = parseFloat(getComputedStyle(ttext).lineHeight) || 48;
    const shift = Math.max(0, cur.offsetTop - lineH);
    ttext.style.transform = `translateY(${-shift}px)`;
  }

  function updateHint() {
    const ch = session.text[session.pos];
    const info = hints ? kb.setNext(ch) : null;
    if (!hints) {
      kb.setNext(null);
      hint.textContent = '';
      hands.set(null);
      return;
    }
    if (!info) {
      hint.textContent = '';
      hands.set(null);
      return;
    }
    const f = FINGERS[info.finger];
    const label = ch === ' ' ? 'Пробел' : `«${ch}»`;
    let s = `${label} - ${f.name}`;
    if (info.shift) {
      const side = shiftSide(info);
      s += ` + Shift ${side === 'L' ? 'левым' : 'правым'} мизинцем`;
    }
    hint.textContent = s;
    hands.set(info.finger);
  }

  function updateStats() {
    const now = performance.now();
    const st = session.stats(now);
    const elapsed = st.ms;
    vTime.firstChild.textContent = timeLimit ? formatTime(Math.max(0, timeLimit - elapsed) + 999) : formatTime(elapsed);
    vSpeed.firstChild.textContent = session.started ? formatSpeed(st.cpm, unit) : '0';
    vAcc.firstChild.textContent = session.keystrokes ? `${st.accuracy.toFixed(0)}%` : '100%';
    vAcc.classList.toggle('bad', session.keystrokes > 5 && st.accuracy < 90);
    const frac = timeLimit ? Math.min(1, elapsed / timeLimit) : session.pos / Math.max(1, session.text.length);
    progress.firstChild.style.width = `${frac * 100}%`;
    if (timeLimit && session.started && elapsed >= timeLimit && !finished) finish();
  }

  function finish() {
    if (finished) return;
    finished = true;
    const now = performance.now();
    // в тесте на время фиксируем ровно лимит, а не момент срабатывания таймера
    session.finish(timeLimit && session.started && !session.done ? session.startT + timeLimit : now);
    clearInterval(tick);
    detach();
    updateStats();
    kb.setNext(null);
    hands.set(null);
    onFinish && onFinish(session.result(now), session);
  }

  function restart(newText) {
    clearInterval(tick);
    finished = false;
    curText = newText ?? (opts.regenerate ? opts.regenerate() : curText);
    session = new TypingSession(curText, { strict });
    ttext.style.transform = '';
    build(curText);
    startHint.hidden = false;
    wrongStreak = 0;
    placeCaret();
    updateHint();
    updateStats();
    tick = setInterval(updateStats, 120);
    attach();
    onRestart && onRestart(curText);
  }

  function onKeyDown(e) {
    if (finished || e.isComposing) return;
    if (e.ctrlKey || e.metaKey) return;
    if (e.altKey && !(e.getModifierState && e.getModifierState('AltGraph'))) return;
    if (e.repeat) {
      // зажатая клавиша не должна считаться серией нажатий
      if (e.key.length === 1 || e.key === 'Backspace') e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      restart();
      return;
    }
    if (e.getModifierState) {
      const c = e.getModifierState('CapsLock');
      if (c !== !caps.hidden) caps.hidden = !c;
    }
    if (e.key === 'Backspace') {
      if (!pause.hidden) return;
      e.preventDefault();
      if (!strict && session.backspace() !== null) {
        chars[session.pos].className = 'ch' + (chars[session.pos].classList.contains('sp') ? ' sp' : '');
        placeCaret();
        updateHint();
      }
      return;
    }
    const ch = resolveKey(e, L, mapByCode);
    if (ch == null) return;
    e.preventDefault();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    if (!pause.hidden) return;

    const now = performance.now();
    const pos = session.pos;
    const r = session.press(ch, now);
    if (!r) return;
    startHint.hidden = true;
    kb.flash(ch, r.ok);
    const span = chars[pos];
    if (r.ok) {
      sfx.key();
      wrongStreak = 0;
      span.classList.remove('bad');
      span.classList.add('ok');
    } else {
      sfx.error();
      wrongStreak++;
      span.classList.remove('bad');
      void span.offsetWidth;
      span.classList.add('bad', 'had-err');
      if (!strict) span.classList.add('wrong');
      // подсказка о неверной раскладке
      if (!mapByCode && !warnedLayout && wrongStreak >= 3) {
        const typed = ALPHABET_RE[lang].test(ch);
        const other = lang === 'ru' ? ALPHABET_RE.en.test(ch) : ALPHABET_RE.ru.test(ch);
        if (!typed && other) {
          warnedLayout = true;
          toast(`Похоже, включена другая раскладка. Переключитесь на ${lang === 'ru' ? 'русскую' : 'английскую'} или включите «Ввод по положению клавиш» в настройках.`, { icon: '⌨️', ms: 6000 });
        }
      }
    }
    if (strict && r.ok) span.classList.remove('had-err', 'wrong');
    if (getMore && session.text.length - session.pos < 160) {
      const more = getMore();
      session.appendText(more);
      extend(more);
    }
    placeCaret();
    updateHint();
    if (r.done) finish();
    else if (!timeLimit) updateStats();
  }

  function onBlur() {
    if (finished || !session.started) return;
    blurAt = performance.now();
    pause.hidden = false;
  }
  function onFocus() {
    if (blurAt !== null) {
      session.shift(performance.now() - blurAt);
      blurAt = null;
    }
    pause.hidden = true;
  }
  function onVis() {
    document.hidden ? onBlur() : onFocus();
  }

  let attached = false;
  function attach() {
    if (attached) return;
    attached = true;
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
  }
  function detach() {
    attached = false;
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVis);
  }

  build(text);
  placeCaret();
  updateHint();
  updateStats();
  tick = setInterval(updateStats, 120);
  attach();

  return {
    el,
    restart,
    layout: placeCaret,
    destroy() {
      finished = true;
      clearInterval(tick);
      detach();
    },
    get session() {
      return session;
    },
  };
}
