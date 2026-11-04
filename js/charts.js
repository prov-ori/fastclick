// Небольшие SVG-графики без зависимостей.
const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function niceMax(v) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return n * p;
}

/**
 * Линейный график.
 * series: [{name, color, points:[number], fmt?}], labels: [string] — подписи по X (опционально)
 */
export function lineChart(series, { labels = [], w = 640, h = 220, min = 0, max, yTicks = 4, fmtY = (v) => Math.round(v) } = {}) {
  const pad = { l: 38, r: 12, t: 12, b: 24 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const top = max ?? niceMax(Math.max(...series.flatMap((s) => s.points), 1));
  const x = (i) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => pad.t + ih - ((v - min) / (top - min || 1)) * ih;

  let g = '';
  for (let i = 0; i <= yTicks; i++) {
    const v = min + ((top - min) * i) / yTicks;
    g += `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}"/>`;
    g += `<text class="tick" x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${esc(fmtY(v))}</text>`;
  }
  const every = Math.ceil(n / 8);
  labels.forEach((lb, i) => {
    if (i % every === 0 || i === n - 1) g += `<text class="tick" x="${x(i)}" y="${h - 6}" text-anchor="middle">${esc(lb)}</text>`;
  });
  series.forEach((s) => {
    if (!s.points.length) return;
    const pts = s.points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    if (s.area) g += `<polygon class="area" style="fill:${s.color}" points="${pad.l},${pad.t + ih} ${pts.join(' ')} ${x(s.points.length - 1)},${pad.t + ih}"/>`;
    g += `<polyline fill="none" style="stroke:${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${pts.join(' ')}"/>`;
    if (s.points.length <= 40) {
      s.points.forEach((v, i) => {
        g += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" style="fill:${s.color}"><title>${esc(s.name)}: ${esc((s.fmt || fmtY)(v))}${labels[i] ? ' · ' + esc(labels[i]) : ''}</title></circle>`;
      });
    }
  });
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', `0 0 ${w} ${h}`);
  el.setAttribute('class', 'chart');
  el.setAttribute('role', 'img');
  el.innerHTML = g;
  return el;
}

/** Календарь активности (по неделям, как у GitHub). days: {YYYY-MM-DD: {ms}} */
export function calendarChart(days, weeks = 14, goalMs = 600000) {
  const cell = 14;
  const gap = 3;
  const w = weeks * (cell + gap) + 24;
  const h = 7 * (cell + gap) + 18;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7; // пн = 0
  const start = new Date(today);
  start.setDate(start.getDate() - dow - (weeks - 1) * 7);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let g = '';
  ['Пн', 'Ср', 'Пт'].forEach((t, i) => {
    g += `<text class="tick" x="0" y="${12 + i * 2 * (cell + gap) + cell - 2}">${t}</text>`;
  });
  for (let wi = 0; wi < weeks; wi++) {
    for (let di = 0; di < 7; di++) {
      const d = new Date(start);
      d.setDate(start.getDate() + wi * 7 + di);
      if (d > today) continue;
      const ms = (days[fmt(d)] || {}).ms || 0;
      const lvl = ms === 0 ? 0 : ms < goalMs * 0.5 ? 1 : ms < goalMs ? 2 : ms < goalMs * 2 ? 3 : 4;
      g += `<rect class="cal l${lvl}" x="${24 + wi * (cell + gap)}" y="${12 + di * (cell + gap)}" width="${cell}" height="${cell}" rx="3"><title>${fmt(d)}: ${Math.round(ms / 60000)} мин</title></rect>`;
    }
  }
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', `0 0 ${w} ${h}`);
  el.setAttribute('class', 'chart calendar');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Календарь активности');
  el.style.width = `${Math.round(w * 1.7)}px`;
  el.style.maxWidth = '100%';
  el.innerHTML = g;
  return el;
}

/** Кольцо прогресса. */
export function ring(frac, size = 84, stroke = 9) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac));
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', `0 0 ${size} ${size}`);
  el.setAttribute('class', 'ring');
  el.innerHTML = `<circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
  return el;
}
