// Игра «Метеориты»: слова падают сверху — наберите их до приземления.
import { h } from './dom.js';
import { LAYOUTS, resolveKey } from './layouts.js';
import { gameWord } from './generator.js';
import { sfx } from './sound.js';

export function createGame({ lang, mapByCode = true, best = 0, onEnd }) {
  const L = LAYOUTS[lang];
  const field = h('div', { class: 'gfield' });
  const hud = {
    score: h('b', null, '0'),
    level: h('b', null, '1'),
    combo: h('b', null, '0'),
    lives: h('span', { class: 'lives', 'aria-label': 'Жизни' }),
  };
  const bar = h('div', { class: 'gbar' },
    h('div', null, 'Очки ', hud.score),
    h('div', null, 'Уровень ', hud.level),
    h('div', null, 'Комбо ', hud.combo),
    hud.lives,
  );
  const overlay = h('div', { class: 'goverlay' });
  const root = h('div', { class: 'game' }, bar, h('div', { class: 'gwrap' }, field, overlay));

  let words = [];
  let active = null;
  let running = false;
  let raf = 0;
  let last = 0;
  let spawnIn = 0;
  let score = 0;
  let lives = 3;
  let level = 1;
  let killed = 0;
  let combo = 0;
  let keys = 0;
  let errors = 0;
  let typedChars = 0;
  let startedAt = 0;
  let perKey = {};
  let ended = false;

  const setLives = () => {
    hud.lives.textContent = '❤'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives));
  };

  function showStart(text, btn = 'Играть', extra = null) {
    overlay.textContent = '';
    overlay.append(
      h('div', { class: 'gcard' },
        h('h3', null, text),
        extra,
        h('button', { class: 'btn primary lg', onclick: start }, btn),
        h('p', { class: 'muted' }, 'Печатайте слово целиком - метеорит исчезнет. Ошибка сбрасывает комбо.'),
      ),
    );
    overlay.hidden = false;
  }

  function spawn() {
    const word = gameWord(lang, level);
    const el = h('div', { class: 'gword' }, ...[...word].map((c) => h('span', null, c)));
    field.append(el);
    const w = el.offsetWidth;
    const x = 8 + Math.random() * Math.max(1, field.clientWidth - w - 16);
    const wd = { word, el, x, y: -34, typed: 0, speed: 26 + level * 6 + Math.random() * 10 };
    el.style.left = `${x}px`;
    words.push(wd);
  }

  function renderWord(wd) {
    [...wd.el.children].forEach((s, i) => s.classList.toggle('done', i < wd.typed));
    wd.el.classList.toggle('active', wd === active);
  }

  function remove(wd) {
    wd.el.remove();
    words = words.filter((x) => x !== wd);
    if (active === wd) active = null;
  }

  function stat(ch, ok) {
    const k = L.map[ch] ? L.map[ch].key : ch;
    const s = (perKey[k] ||= { n: 0, e: 0, ms: 0, nl: 0 });
    ok ? s.n++ : s.e++;
  }

  function miss(ch) {
    errors++;
    combo = 0;
    hud.combo.textContent = '0';
    field.classList.remove('shake');
    void field.offsetWidth;
    field.classList.add('shake');
    sfx.error();
    if (ch) stat(active ? active.word[active.typed] : ch, false);
  }

  function hit(ch) {
    typedChars++;
    stat(ch, true);
    sfx.key();
  }

  function onKey(e) {
    if (!running || e.repeat || e.isComposing) return;
    if (e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      end();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (active) {
        active.typed = 0;
        renderWord(active);
        active = null;
      }
      return;
    }
    const ch = resolveKey(e, L, mapByCode);
    if (ch == null || ch === ' ') return;
    e.preventDefault();
    keys++;
    const lc = ch.toLowerCase();
    if (!active) {
      const cand = words.filter((w) => w.word[0] === lc).sort((a, b) => b.y - a.y)[0];
      if (!cand) return miss(lc);
      active = cand;
      active.typed = 0;
    }
    if (active.word[active.typed] === lc) {
      hit(lc);
      active.typed++;
      if (active.typed >= active.word.length) {
        const wd = active;
        combo++;
        killed++;
        score += wd.word.length * 10 * (1 + Math.floor(combo / 5));
        if (killed % 8 === 0) level++;
        hud.score.textContent = score;
        hud.level.textContent = level;
        hud.combo.textContent = combo;
        wd.el.classList.add('boom');
        sfx.boom();
        words = words.filter((x) => x !== wd);
        active = null;
        setTimeout(() => wd.el.remove(), 260);
      } else renderWord(active);
    } else {
      miss(lc);
      renderWord(active);
    }
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn();
      spawnIn = Math.max(0.6, 2.3 - level * 0.14);
    }
    const H = field.clientHeight;
    for (const wd of [...words]) {
      wd.y += wd.speed * dt;
      wd.el.style.transform = `translateY(${wd.y}px)`;
      if (wd.y > H - 38) {
        remove(wd);
        lives--;
        combo = 0;
        hud.combo.textContent = '0';
        setLives();
        sfx.hurt();
        field.classList.remove('hurt');
        void field.offsetWidth;
        field.classList.add('hurt');
        if (lives <= 0) {
          end();
          return;
        }
      }
    }
    raf = requestAnimationFrame(loop);
  }

  function start() {
    words.forEach((w) => w.el.remove());
    words = [];
    active = null;
    score = 0;
    lives = 3;
    level = 1;
    killed = 0;
    combo = 0;
    keys = 0;
    errors = 0;
    typedChars = 0;
    perKey = {};
    ended = false;
    hud.score.textContent = '0';
    hud.level.textContent = '1';
    hud.combo.textContent = '0';
    setLives();
    overlay.hidden = true;
    running = true;
    startedAt = performance.now();
    spawnIn = 0.3;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function end() {
    if (ended) return;
    ended = true;
    running = false;
    cancelAnimationFrame(raf);
    const ms = performance.now() - startedAt;
    const accuracy = keys ? ((keys - errors) / keys) * 100 : 100;
    const res = {
      score,
      words: killed,
      level,
      ms,
      chars: typedChars,
      keystrokes: keys,
      errors,
      accuracy,
      cpm: ms > 0 ? (typedChars / ms) * 60000 : 0,
      perKey,
    };
    const record = score > best;
    if (record) best = score;
    onEnd && onEnd(res);
    showStart(
      `Игра окончена: ${score} очков`,
      'Ещё раз',
      h('div', { class: 'gsum' },
        h('span', null, `Слов: ${killed}`),
        h('span', null, `Точность: ${accuracy.toFixed(0)}%`),
        h('span', null, `Уровень: ${level}`),
        h('span', { class: record ? 'rec' : '' }, record ? '🏆 Новый рекорд!' : `Рекорд: ${best}`),
      ),
    );
  }

  window.addEventListener('keydown', onKey, true);
  setLives();
  showStart('Метеориты', 'Играть', best ? h('p', { class: 'muted' }, `Рекорд: ${best}`) : null);

  return {
    el: root,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
    },
  };
}
