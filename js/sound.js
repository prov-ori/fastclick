// Лёгкие звуковые эффекты на WebAudio (без файлов).
let ctx = null;
let enabled = false;

export function setSoundEnabled(on) {
  enabled = on;
}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function beep(freq, dur, type = 'sine', gain = 0.05, slide = 0) {
  if (!enabled) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  key: () => beep(520 + Math.random() * 60, 0.04, 'triangle', 0.035),
  error: () => beep(150, 0.14, 'sawtooth', 0.05, -50),
  done: () => {
    beep(523, 0.12, 'sine', 0.06);
    setTimeout(() => beep(659, 0.12, 'sine', 0.06), 110);
    setTimeout(() => beep(784, 0.2, 'sine', 0.06), 220);
  },
  boom: () => beep(260, 0.18, 'square', 0.04, -180),
  hurt: () => beep(110, 0.25, 'sawtooth', 0.06, -40),
};
