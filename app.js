const $ = (id) => document.getElementById(id);

const modelById = (id) => DATA.models.find((m) => m.id === id);
const sourceById = (id) => SOURCES[id];

function compute(model, promptTok, outTok, queriesPerDay, gridG, pue) {
  const jIn = promptTok * model.jPerInTok;
  const jOut = outTok * model.jPerOutTok;
  const joules = (jIn + jOut) * pue;
  const wh = joules / 3600;
  const kWh = wh / 1000;
  const gCO2e = kWh * gridG;
  const costUsd =
    (promptTok / 1e6) * model.priceInUsdPer1M + (outTok / 1e6) * model.priceOutUsdPer1M;
  const wue = DATA.waterModel.wueLPerKWh + (DATA.waterModel.indirectLPerKWh || 0);
  const waterMl = kWh * wue * 1000 + model.waterPerQueryMl;
  const gpuSec = joules / model.gpuPowerW;

  const scale = (f) => ({
    perQuery: f(1),
    daily: f(queriesPerDay),
    monthly: f(queriesPerDay * 30),
    yearly: f(queriesPerDay * 365),
  });

  return {
    perQuery: { wh, gCO2e, costUsd, waterMl, gpuSec, jIn, jOut },
    energyWh: scale((n) => wh * n),
    co2G: scale((n) => gCO2e * n),
    cost: scale((n) => costUsd * n),
    waterMl: scale((n) => waterMl * n),
    gpuSecTotal: scale((n) => gpuSec * n),
  };
}

function fmtEnergy(wh) {
  if (wh >= 1000) return { v: (wh / 1000).toFixed(2), u: 'kWh' };
  if (wh >= 100) return { v: wh.toFixed(1), u: 'Wh' };
  if (wh >= 0.1) return { v: wh.toFixed(2), u: 'Wh' };
  return { v: (wh * 1000).toFixed(0), u: 'mWh' };
}
function fmtCo2(g) {
  if (g >= 1000) return { v: (g / 1000).toFixed(2), u: 'kg' };
  if (g >= 1) return { v: g.toFixed(1), u: 'g' };
  return { v: (g * 1000).toFixed(0), u: 'mg' };
}
function fmtCost(c) {
  if (c >= 1) return { v: '$' + c.toFixed(2), u: '' };
  if (c >= 0.001) return { v: '$' + c.toFixed(4), u: '' };
  return { v: (c * 100).toFixed(2), u: ' cents' };
}
function fmtWater(ml) {
  if (ml >= 1000) return { v: (ml / 1000).toFixed(2), u: 'L' };
  if (ml >= 100) return { v: ml.toFixed(0), u: 'ml' };
  return { v: ml.toFixed(1), u: 'ml' };
}
function fmtGpu(s) {
  if (s >= 3600) return { v: (s / 3600).toFixed(1), u: 'h' };
  if (s >= 60) return { v: (s / 60).toFixed(1), u: 'min' };
  return { v: s.toFixed(1), u: 's' };
}

function fmtEnergyFixed(wh) {
  if (wh >= 1000) return { v: (wh / 1000).toFixed(2), u: 'kWh' };
  if (wh >= 100) return { v: wh.toFixed(1), u: 'Wh' };
  if (wh >= 1) return { v: wh.toFixed(2), u: 'Wh' };
  if (wh >= 0.1) return { v: wh.toFixed(3), u: 'Wh' };
  return { v: wh.toFixed(3), u: 'Wh' };
}
function fmtCo2Fixed(g) {
  if (g >= 1000) return { v: (g / 1000).toFixed(2), u: 'kg' };
  if (g >= 1) return { v: g.toFixed(2), u: 'g' };
  return { v: g.toFixed(3), u: 'g' };
}
function fmtWaterFixed(ml) {
  if (ml >= 1000) return { v: (ml / 1000).toFixed(2), u: 'L' };
  return { v: ml.toFixed(1), u: 'ml' };
}
function fmtCostFixed(c) {
  if (c >= 100) return { v: '$' + c.toFixed(0), u: '' };
  if (c >= 1) return { v: '$' + c.toFixed(2), u: '' };
  return { v: '$' + c.toFixed(4), u: '' };
}

function bindText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function fmtNum(v) {
  if (v >= 100) return Math.round(v).toLocaleString();
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function niceMax(v) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return f * mag;
}

function svgBarChart(id, labels, values, colors) {
  const host = $(id);
  host.innerHTML = '';
  const W = 560, H = 250;
  const padL = 48, padB = 48, padT = 14, padR = 10;
  const max = niceMax(Math.max.apply(null, values) * 1.1);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = values.length, slot = innerW / n, barW = Math.min(slot * 0.58, 52);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', width: '100%', height: '100%' });
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = max * i / ticks, y = padT + innerH - innerH * i / ticks;
    svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: 'rgba(255,255,255,0.07)' }));
    const t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: '#9aa5b1', 'font-size': 11 });
    t.textContent = fmtNum(val);
    svg.appendChild(t);
  }
  values.forEach((v, i) => {
    const h = innerH * v / max, x = padL + slot * i + (slot - barW) / 2, y = padT + innerH - h;
    svg.appendChild(svgEl('rect', { x, y, width: barW, height: Math.max(h, 2), rx: 3, fill: colors[i] || '#5b8ff9' }));
    const vtx = svgEl('text', { x: x + barW / 2, y: y - 6, 'text-anchor': 'middle', fill: '#c9d1d9', 'font-size': 11 });
    vtx.textContent = fmtNum(v);
    svg.appendChild(vtx);
    String(labels[i]).split('\n').forEach((ln, j) => {
      const ltx = svgEl('text', { x: x + barW / 2, y: padT + innerH + 15 + j * 12, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 10 });
      ltx.textContent = ln;
      svg.appendChild(ltx);
    });
  });
  host.appendChild(svg);
}

function svgDoughnut(id, labels, values, colors) {
  const host = $(id);
  host.innerHTML = '';
  const W = 360, H = 220;
  const cx = 118, cy = H / 2, r = 62;
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const C = 2 * Math.PI * r;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
  svg.appendChild(svgEl('circle', { cx, cy, r, fill: 'none', stroke: 'rgba(255,255,255,0.07)', 'stroke-width': 26 }));
  let acc = 0;
  values.forEach((v, i) => {
    const frac = v / total;
    const arc = svgEl('circle', { cx, cy, r, fill: 'none', stroke: colors[i], 'stroke-width': 26, 'stroke-dasharray': `${frac * C} ${C}`, 'stroke-dashoffset': `${-acc * C}`, transform: `rotate(-90 ${cx} ${cy})` });
    svg.appendChild(arc);
    acc += frac;
  });
  const pct = Math.round((values[0] / total) * 100);
  const ct = svgEl('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: '#c9d1d9', 'font-size': 15 });
  ct.textContent = `${pct}%`;
  svg.appendChild(ct);
  const cu = svgEl('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 11 });
  cu.textContent = 'prefill';
  svg.appendChild(cu);
  const lx = cx + r + 30;
  labels.forEach((l, i) => {
    const ly = cy - 20 + i * 26;
    svg.appendChild(svgEl('rect', { x: lx, y: ly - 9, width: 12, height: 12, rx: 2, fill: colors[i] }));
    const t = svgEl('text', { x: lx + 18, y: ly, fill: '#c9d1d9', 'font-size': 11 });
    t.textContent = `${l}: ${fmtNum(values[i])} J`;
    svg.appendChild(t);
  });
  host.appendChild(svg);
}

function svgLineChart(id, labels, series) {
  const host = $(id);
  host.innerHTML = '';
  const W = 560, H = 250;
  const padL = 48, padB = 34, padT = 16, padR = 12;
  const allVals = [];
  series.forEach((s) => s.data.forEach((v) => { if (v != null) allVals.push(v); }));
  const max = niceMax(Math.max.apply(null, allVals) * 1.1);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = max * i / ticks, y = padT + innerH - innerH * i / ticks;
    svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: 'rgba(255,255,255,0.07)' }));
    const t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: '#9aa5b1', 'font-size': 11 });
    t.textContent = fmtNum(val);
    svg.appendChild(t);
  }
  labels.forEach((lb, i) => {
    const x = padL + innerW * i / (labels.length - 1);
    const t = svgEl('text', { x, y: H - 12, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 10 });
    t.textContent = lb;
    svg.appendChild(t);
  });
  const xAt = (i) => padL + innerW * i / (labels.length - 1);
  const yAt = (v) => padT + innerH - innerH * v / max;
  series.forEach((s) => {
    const pts = s.data.map((v, i) => (v != null ? `${xAt(i)},${yAt(v)}` : null)).filter((p) => p != null);
    if (pts.length > 1) {
      const line = svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round' });
      if (s.dash) line.setAttribute('stroke-dasharray', '6 4');
      svg.appendChild(line);
    }
    s.data.forEach((v, i) => {
      if (v == null) return;
      svg.appendChild(svgEl('circle', { cx: xAt(i), cy: yAt(v), r: 3.5, fill: s.color }));
    });
  });
  series.forEach((s, i) => {
    const ly = 22 + i * 18;
    svg.appendChild(svgEl('line', { x1: padL, y1: ly, x2: padL + 16, y2: ly, stroke: s.color, 'stroke-width': 2 }));
    const t = svgEl('text', { x: padL + 22, y: ly + 4, fill: '#c9d1d9', 'font-size': 11 });
    t.textContent = s.label;
    svg.appendChild(t);
  });
  host.appendChild(svg);
}

const GROUP_COLORS = {
  'Everyday text': '#5b8ff9',
  'Heavy documents & code': '#7c5cd6',
  'Vision & media': '#f6bd60',
  'Audio': '#84a98c',
  'Other': '#adb5bd',
};

function svgScatterChart(id, points, opts = {}) {
  const host = $(id);
  host.innerHTML = '';
  const W = 700, H = 330;
  const padL = 58, padB = 42, padT = 18, padR = 150;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const xVals = points.map((p) => p.x), yVals = points.map((p) => p.y);
  const xMin = Math.pow(10, Math.floor(Math.log10(Math.min.apply(null, xVals))));
  const xMax = Math.pow(10, Math.ceil(Math.log10(Math.max.apply(null, xVals))));
  const yMin = Math.pow(10, Math.floor(Math.log10(Math.min.apply(null, yVals))));
  const yMax = Math.pow(10, Math.ceil(Math.log10(Math.max.apply(null, yVals))));
  const xAt = (v) => padL + (Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin)) * innerW;
  const yAt = (v) => padT + innerH - (Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin)) * innerH;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
  const fmtLog = (v) => {
    if (v >= 100) return Math.round(v).toLocaleString();
    if (v >= 1) return v.toFixed(v >= 10 ? 0 : 1);
    if (v >= 0.01) return v.toFixed(2);
    return v.toExponential(0);
  };
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = xMin * Math.pow(xMax / xMin, i / ticks), x = xAt(v);
    svg.appendChild(svgEl('line', { x1: x, y1: padT, x2: x, y2: padT + innerH, stroke: 'rgba(255,255,255,0.07)' }));
    const t = svgEl('text', { x, y: padT + innerH + 16, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 10 });
    t.textContent = fmtLog(v);
    svg.appendChild(t);
  }
  for (let i = 0; i <= ticks; i++) {
    const v = yMin * Math.pow(yMax / yMin, i / ticks), y = yAt(v);
    svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: padL + innerW, y2: y, stroke: 'rgba(255,255,255,0.07)' }));
    const t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: '#9aa5b1', 'font-size': 10 });
    t.textContent = fmtLog(v);
    svg.appendChild(t);
  }
  const xt = svgEl('text', { x: padL + innerW / 2, y: H - 6, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 11 });
  xt.textContent = 'Energy per query (Wh, log scale)';
  svg.appendChild(xt);
  const yt = svgEl('text', { x: 14, y: padT + innerH / 2, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 11, transform: `rotate(-90 14 ${padT + innerH / 2})` });
  yt.textContent = 'Cost per query (USD, log scale)';
  svg.appendChild(yt);

  let tip = null;
  if (opts.tip) {
    tip = document.createElement('div');
    tip.className = 'scatter-tip';
    host.appendChild(tip);
  }

  points.forEach((p) => {
    const r = 4 + Math.min(16, Math.sqrt(p.size) * 2.2);
    const cx = xAt(p.x), cy = yAt(p.y);
    const circle = svgEl('circle', { cx, cy, r, fill: p.color, 'fill-opacity': '0.55', stroke: p.color, 'stroke-width': 1.5, 'pointer-events': 'all' });
    if (p.hollow) {
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke-dasharray', '4 3');
    }
    svg.appendChild(circle);
    const t = svgEl('text', { x: cx, y: cy + 3.5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 9, 'font-weight': '700', 'pointer-events': 'none' });
    t.textContent = p.label;
    svg.appendChild(t);
    if (tip && opts.tip) {
      const move = (e) => {
        const rect = host.getBoundingClientRect();
        tip.innerHTML = opts.tip(p);
        tip.style.display = 'block';
        const left = e.clientX - rect.left + 14;
        const top = e.clientY - rect.top + 10;
        tip.style.left = Math.min(left, rect.width - tip.offsetWidth - 8) + 'px';
        tip.style.top = Math.min(top, rect.height - tip.offsetHeight - 8) + 'px';
      };
      const leave = () => { tip.style.display = 'none'; };
      circle.addEventListener('mousemove', move);
      circle.addEventListener('mouseenter', move);
      circle.addEventListener('mouseleave', leave);
    }
  });

  const lx = padL + innerW + 22;
  let ly = padT + 10;
  const seen = {};
  points.forEach((p) => {
    if (seen[p.color]) return;
    seen[p.color] = true;
    const group = p.group;
    svg.appendChild(svgEl('rect', { x: lx, y: ly - 9, width: 12, height: 12, rx: 2, fill: p.color }));
    const t = svgEl('text', { x: lx + 18, y: ly, fill: '#c9d1d9', 'font-size': 11 });
    t.textContent = group;
    svg.appendChild(t);
    ly += 20;
  });
  const cap = svgEl('text', { x: lx, y: ly + 8, fill: '#9aa5b1', 'font-size': 10 });
  cap.textContent = 'Bubble = water';
  svg.appendChild(cap);
  const cap2 = svgEl('text', { x: lx, y: ly + 24, fill: '#9aa5b1', 'font-size': 10 });
  cap2.textContent = 'Dashed = no list price';
  svg.appendChild(cap2);

  host.appendChild(svg);
}

function buildExamplesScatter() {
  const gridG = DATA.gridIntensity.gCO2ePerKWh;
  const pue = 1.35;
  const points = EXAMPLES.map((ex) => {
    const r = exampleResult(ex, gridG, pue).perQuery;
    return {
      x: r.wh,
      y: r.costUsd != null ? r.costUsd : 0.00005,
      size: r.waterMl,
      color: GROUP_COLORS[ex.group] || '#adb5bd',
      group: ex.group || 'Other',
      label: (EXAMPLES.indexOf(ex) + 1).toString(),
      hollow: r.costUsd == null,
      ex,
    };
  });
  svgScatterChart('examplesScatter', points, {
    tip: (p) => {
      const r = exampleResult(p.ex, gridG, pue).perQuery;
      const e = fmtEnergyFixed(r.wh), c = fmtCo2Fixed(r.gCO2e), w = fmtWaterFixed(r.waterMl);
      const cost = r.costUsd == null ? 'no list price' : fmtCostFixed(r.costUsd);
      return `<div class="tip-title">${p.ex.desc}</div>
        <div class="tip-metrics">⚡ ${e.v} ${e.u} · 🌡️ ${c.v} ${c.u} · 💧 ${w.v} ${w.u} · 💵 ${cost}</div>
        <div class="tip-metrics">${exampleModelName(p.ex)}</div>
        ${p.ex.note ? `<div class="tip-note">${p.ex.note}</div>` : ''}`;
    },
  });
}

function buildEnergyChart() {
  const gridG = DATA.gridIntensity.gCO2ePerKWh;
  const labels = DATA.models.map((m) => m.name);
  const values = DATA.models.map((m) =>
    compute(m, 200, 400, 1, gridG, 1.35).perQuery.wh
  );
  svgBarChart(
    'energyChart',
    [...labels, 'Google search\n(headline)', 'ChatGPT estimate\n(IEA via SBS)'],
    [...values, 0.3, 2.9],
    ['#5b8ff9', '#7c5cd6', '#f6bd60', '#f28482', '#84a98c', '#adb5bd', '#adb5bd']
  );
}

function buildCostChart() {
  const gridG = DATA.gridIntensity.gCO2ePerKWh;
  const labels = DATA.models.map((m) => m.name);
  const values = DATA.models.map((m) =>
    compute(m, 200, 400, 1, gridG, 1.35).perQuery.costUsd * 1000
  );
  svgBarChart('costChart', labels, values, DATA.models.map(() => '#5b8ff9'));
}

function buildBreakdownChart(model, promptTok, outTok, pue) {
  const gridG = DATA.gridIntensity.gCO2ePerKWh;
  const r = compute(model, promptTok, outTok, 1, gridG, pue);
  svgDoughnut(
    'breakdownChart',
    ['Prefill (input)', 'Decode (output)'],
    [r.perQuery.jIn * pue, r.perQuery.jOut * pue],
    ['#5b8ff9', '#f28482']
  );
}

function buildMacroChart() {
  const labels = DATA.macro.globalDcElectricity.map((d) => d.year);
  const g = DATA.macro.globalDcElectricity.map((d) => d.tWh);
  svgLineChart('macroChart', labels, [
    { label: 'Global data-center electricity (TWh)', color: '#5b8ff9', data: g },
    { label: 'Six leading AI firms (TWh)', color: '#f28482', data: [118, null, null, null, null, null, null] },
  ]);
}

function buildMacroWaterChart() {
  const labels = DATA.macro.globalDcElectricity.map((d) => d.year);
  const wueTotal = DATA.waterModel.wueLPerKWh + (DATA.waterModel.indirectLPerKWh || 0);
  const derived = DATA.macro.globalDcElectricity.map((d) => (d.tWh * wueTotal) / 1e3);
  const bench = DATA.macro.waterBenchmark2030TrillionL || 9.3;
  const benchSeries = labels.map(() => bench);
  svgLineChart('macroWaterChart', labels, [
    { label: 'Derived global DC water (trillion L)', color: '#5b8ff9', data: derived },
    { label: 'UNU-INWEH 2030 projection (trillion L)', color: '#f6bd60', dash: true, data: benchSeries },
  ]);
}

function renderMacroWaterNotes() {
  $('macroWaterNotes').innerHTML = `<ul>${(DATA.macro.macroWaterNotes || []).map((n) => `<li>${n}</li>`).join('')}</ul>`;
}

function renderEquivalents(monthlyWh, monthlyCo2G) {
  const eq = DATA.equivalents;
  const items = [
    { label: 'smartphone charges', value: monthlyWh / eq.smartphoneChargeWh, unit: '' },
    { label: 'driving by car', value: monthlyCo2G / eq.carGPerKm, unit: 'km' },
    { label: 'cups of coffee', value: monthlyCo2G / eq.coffeeG, unit: '' },
    { label: 'hours of HD streaming', value: monthlyWh / eq.streamingHourWh, unit: 'h' },
    { label: 'hours of a 9W LED bulb', value: monthlyWh / eq.ledBulbW, unit: 'h' },
  ];
  const cards = items
    .map(
      (it) => `
      <div class="eq-card">
        <span class="eq-val">${it.value.toFixed(1)}${it.unit}</span>
        <span class="eq-label">${it.label}</span>
      </div>`
    )
    .join('');
  $('equivalents').innerHTML = cards;
}

function renderBaseline(pqWh) {
  const id = $('compareSelect').value;
  const b = DATA.baselines.find((x) => x.id === id);
  if (!b) {
    $('compareResult').innerHTML = '';
    return;
  }
  if (b.type === 'number') {
    const ratio = pqWh / b.value;
    const s = sourceById(b.source);
    $('compareResult').innerHTML =
      `This query uses about <strong>${ratio.toFixed(1)}x</strong> the energy of a ${b.label} ` +
      `(${b.value} ${b.unit}). ${b.note} <a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>.`;
    return;
  }
  const s = sourceById(b.source);
  const points = b.points.map((p) => `<li>${p}</li>`).join('');
  $('compareResult').innerHTML =
    `<em>${b.note}</em><ul style="margin:6px 0 0 18px;padding:0;">${points}</ul>` +
    `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>.`;
}

function renderAggTable(r) {
  const rows = [
    ['Energy', 'kWh', fmtEnergy, fmtEnergyFixed],
    ['CO2e', 'g', fmtCo2, fmtCo2Fixed],
    ['Cost', '$', fmtCost, fmtCostFixed],
    ['Water', 'ml', fmtWater, fmtWaterFixed],
    ['GPU time', 's', fmtGpu, fmtGpu],
  ];
  const headers = ['Metric', 'Per query', 'Per day', 'Per month', 'Per year'];
  const body = rows
    .map(([label, key, fmt, fmtFixed]) => {
      const src = key === 'kWh' ? r.energyWh : key === 'g' ? r.co2G : key === '$' ? r.cost : key === 'ml' ? r.waterMl : r.gpuSecTotal;
      return `<tr>
        <td>${label}</td>
        <td>${fmtFixed(src.perQuery).v} ${fmtFixed(src.perQuery).u}</td>
        <td>${fmt(src.daily).v} ${fmt(src.daily).u}</td>
        <td>${fmt(src.monthly).v} ${fmt(src.monthly).u}</td>
        <td>${fmt(src.yearly).v} ${fmt(src.yearly).u}</td>
      </tr>`;
    })
    .join('');
  $('aggTable').innerHTML =
    `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody>`;
}

function exampleResult(ex, gridG, pue) {
  if (ex.fixedWh != null) {
    const wm = DATA.waterModel;
    const wh = ex.fixedWh;
    const gCO2e = ex.fixedCo2G != null ? ex.fixedCo2G : wh * (gridG / 1000);
    const baseline = ex.fixedBaselineMl != null ? ex.fixedBaselineMl : 0;
    const wue = wm.wueLPerKWh + (wm.indirectLPerKWh || 0);
    const waterMl = ex.fixedWaterMl != null ? ex.fixedWaterMl : baseline + (wh / 1000) * wue * 1000;
    return {
      perQuery: { wh, gCO2e, waterMl, costUsd: ex.fixedCostUsd != null ? ex.fixedCostUsd : null, gpuSec: 0, jIn: 0, jOut: 0 },
    };
  }
  const m = modelById(ex.model);
  return compute(m, ex.promptTok, ex.outTok, 1, gridG, pue);
}

function exampleModelName(ex) {
  if (ex.modelLabel) return ex.modelLabel;
  const m = modelById(ex.model);
  return m ? m.name : '';
}

function exampleChips(ex, gridG, pue) {
  const r = exampleResult(ex, gridG, pue).perQuery;
  return `<div class="ex-metrics">
    <span class="chip">⚡ ${fmtEnergyFixed(r.wh).v} ${fmtEnergyFixed(r.wh).u}</span>
    <span class="chip">🌡️ ${fmtCo2Fixed(r.gCO2e).v} ${fmtCo2Fixed(r.gCO2e).u}</span>
    <span class="chip">💧 ${fmtWaterFixed(r.waterMl).v} ${fmtWaterFixed(r.waterMl).u}</span>
    <span class="chip">💵 ${r.costUsd == null ? '—' : fmtCostFixed(r.costUsd).v + fmtCostFixed(r.costUsd).u}</span>
  </div>`;
}

function exampleSourceLinks(ex) {
  if (!ex.sources || !ex.sources.length) return '';
  const links = ex.sources
    .map((id) => {
      const s = sourceById(id);
      return s ? `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>` : '';
    })
    .filter(Boolean)
    .join(' · ');
  return links ? `<div class="ex-src">Sources: ${links}</div>` : '';
}

function renderExamples(gridG, pue, bodyId) {
  const rows = EXAMPLES.map((ex, i) => {
    const r = exampleResult(ex, gridG, pue).perQuery;
    const e = fmtEnergyFixed(r.wh);
    const c = fmtCo2Fixed(r.gCO2e);
    const cost = r.costUsd == null ? null : fmtCostFixed(r.costUsd);
    const w = fmtWaterFixed(r.waterMl);
    const toks = ex.fixedWh != null ? '—' : `${(ex.promptTok / 1000).toFixed(1)}k / ${(ex.outTok / 1000).toFixed(1)}k`;
    const costCell = r.costUsd == null ? '—' : `${cost.v}${cost.u}`;
    const srcCell = exampleSourceLinks(ex);
    return `<tr>
      <td>${i + 1}</td>
      <td>${ex.desc}</td>
      <td>${exampleModelName(ex)}</td>
      <td>${toks}</td>
      <td>${e.v} ${e.u}</td>
      <td>${c.v} ${c.u}</td>
      <td>${w.v} ${w.u}</td>
      <td>${costCell}</td>
      <td>${srcCell ? srcCell + ' · ' : ''}${ex.note}</td>
    </tr>`;
  }).join('');
  $(bodyId).innerHTML = rows;
}

function renderHeadlineRefs() {
  const rows = DATA.headlineRefs
    .map((h) => {
      const s = sourceById(h.source);
      return `<tr>
        <td>${h.label}</td>
        <td>${h.value} ${h.unit}</td>
        <td><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></td>
      </tr>`;
    })
    .join('');
  $('headlineBody').innerHTML = rows;
}

const SOURCE_CATS = [
  { id: 'peer', label: 'Peer-reviewed papers (most trusted)', color: '#5b8ff9', desc: 'Journal or top-conference peer review; figures carry the strongest weight.' },
  { id: 'institution', label: 'Institutional & government reports', color: '#84a98c', desc: 'IEA, UN, EPA, government agencies and policy institutes.' },
  { id: 'preprint', label: 'Recent research preprints (2026)', color: '#7c5cd6', desc: 'arXiv preprints / workshop papers; rigorous methods, not yet journal-reviewed.' },
  { id: 'journalism', label: 'Journalism, opinion & fact-checks', color: '#f6bd60', desc: 'News articles, expert commentary and independent fact-checks.' },
  { id: 'vendor', label: 'Vendor & company sources', color: '#adb5bd', desc: 'Pricing pages, company blogs and self-reported claims; treat as promotional.' },
];

function renderSources() {
  const cats = SOURCE_CATS.map((c) => {
    const links = Object.values(SOURCES)
      .filter((s) => s.cat === c.id)
      .map(
        (s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a> — ${s.ref}. ${s.note}</li>`
      )
      .join('');
    if (!links) return '';
    return `<div class="source-cat">
      <h3 style="color:${c.color};">${c.label}</h3>
      <p class="hint">${c.desc}</p>
      <ul>${links}</ul>
    </div>`;
  }).join('');
  $('sourceList').innerHTML = cats;
}

function renderMethodology() {
  const src = (id) => {
    const s = sourceById(id);
    return s ? `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>` : id;
  };
  const wm = DATA.waterModel;
  const wueTotal = wm.wueLPerKWh + (wm.indirectLPerKWh || 0);
  const pue = 1.35;
  const gridG = DATA.gridIntensity.gCO2ePerKWh;

  const html = `
    <p class="hint" style="margin-bottom:12px;">Every figure on this page is derived from the same four formulas, each traced to its source. Interactive example in the <a href="#" data-goto="tab-calculator">Calculator tab</a>.</p>
    <div class="method-grid">
      <div class="method">
        <h3>⚡ Energy</h3>
        <p><code>Wh = (promptTok × J/input + outTok × J/output) × PUE ÷ 3600</code></p>
        <p class="hint">Per-token joules from measured inference on modern GPUs (${src('tokensToWh')}, ${src('wattgpu')}); PUE overhead ${pue}× applied to every query (${src('ieaEnergyAI')}).</p>
      </div>
      <div class="method">
        <h3>🌡️ CO2</h3>
        <p><code>g CO2e = kWh × ${gridG} g/kWh</code></p>
        <p class="hint">Australian average grid intensity, ${gridG} g CO2e/kWh (${src('ieaGrid')}). Multiply energy by grid carbon intensity; real value depends on grid mix and time of day.</p>
      </div>
      <div class="method">
        <h3>💧 Water</h3>
        <p><code>ml = kWh × ${wueTotal} L/kWh × 1000 + per-query baseline</code></p>
        <p class="hint">Total WUE = ${wm.wueLPerKWh} L/kWh direct cooling (${src('eesiWater')}) + ${wm.indirectLPerKWh} L/kWh indirect power-plant water (${src('cellReports')}), plus a fixed provider baseline per query.</p>
      </div>
      <div class="method">
        <h3>💵 Cost</h3>
        <p><code>USD = (promptTok ÷ 1M) × price_in + (outTok ÷ 1M) × price_out</code></p>
        <p class="hint">Public API list prices per 1M tokens (${src('openaiPrice')}, ${src('anthropicPrice')}).</p>
      </div>
    </div>
    <p class="hint" style="margin-top:12px;">Fixed examples (images, low-resource translation, audio transcription) replace the token formula with published per-inference measurements — each card links its source. All figures are order-of-magnitude estimates: providers do not publish per-query telemetry.</p>
  `;
  $('methodology').innerHTML = html;
}

function renderMacroNotes() {
  $('macroNotes').innerHTML = `<ul>${DATA.macro.macroNotes.map((n) => `<li>${n}</li>`).join('')}</ul>`;
}

function renderRightToolForTask() {
  const rows = DATA.rightToolForTask
    .map((t) => `<tr><td>${t.task}</td><td><strong>${t.best}</strong></td><td>${t.why}</td></tr>`)
    .join('');
  $('toolTable').innerHTML = rows;
}

function renderAuContext() {
  const rows = DATA.auContext.expectations
    .map(
      (e) => `<tr><td>${e.n}</td><td><strong>${e.title}</strong></td><td>${e.desc}</td></tr>`
    )
    .join('');
  $('auExpectations').innerHTML = rows;
  $('auNotes').innerHTML = `<ul>${DATA.auContext.notes.map((n) => `<li>${n}</li>`).join('')}</ul>`;
}

function renderStaticExamples() {
  const gridG = DATA.gridIntensity.gCO2ePerKWh;
  const pue = 1.35;
  const wm = DATA.waterModel;

  let idx = 0;
  const groups = {};
  EXAMPLES.forEach((ex) => {
    const g = ex.group || 'Other';
    (groups[g] = groups[g] || []).push(ex);
  });
  const summary = Object.keys(groups)
    .map((g) => {
      const rows = groups[g]
        .map((ex) => {
          idx += 1;
          const r = exampleResult(ex, gridG, pue).perQuery;
          const bottlePct = ((r.waterMl / wm.promptWaterPer100WordsMl) * 100).toFixed(1);
          const phonePct = ((r.wh / DATA.equivalents.smartphoneChargeWh) * 100).toFixed(1);
          const coffeePct = ((r.gCO2e / DATA.equivalents.coffeeG) * 100).toFixed(1);
          return `<div class="ex-row">
      <div class="ex-title">${idx}. ${ex.desc} <span class="ex-model">${exampleModelName(ex)}</span></div>
      ${exampleChips(ex, gridG, pue)}
      <div class="ex-eq">That's roughly ${bottlePct}% of a 519&nbsp;ml water bottle · ${phonePct}% of a phone charge · ${coffeePct}% of a cup of coffee</div>
      ${exampleSourceLinks(ex)}
    </div>`;
        })
        .join('');
      return `<h3 class="ex-group">${g}</h3>${rows}`;
    })
    .join('');
  $('staticExamples').innerHTML = summary;

  const wueTotal = wm.wueLPerKWh + (wm.indirectLPerKWh || 0);
  $('promptWaterValue').textContent = `~${wm.promptWaterPer100WordsMl} ml per 100-word prompt`;

  const refCards = (DATA.referenceCards || [])
    .map((c) => `<div class="metric"><div class="v">${c.value}</div><div class="u">${c.label}</div></div>`)
    .join('');
  const wueCard = `<div class="metric"><div class="v" id="wueValue">${wueTotal} L/kWh</div><div class="u">avg data-centre WUE (direct + indirect)</div></div>`;
  $('referenceCards').innerHTML = refCards + wueCard;
}

function currentInputs() {
  const model = modelById($('modelSelect').value);
  const promptTok = parseInt($('promptSlider').value, 10);
  const outTok = parseInt($('outSlider').value, 10);
  const queriesPerDay = parseInt($('queriesSlider').value, 10);
  const gridG = DATA.gridIntensity.gCO2ePerKWh;
  const pue = parseFloat($('pueSlider').value);
  return { model, promptTok, outTok, queriesPerDay, gridG, pue };
}

function render() {
  const { model, promptTok, outTok, queriesPerDay, gridG, pue } = currentInputs();
  const r = compute(model, promptTok, outTok, queriesPerDay, gridG, pue);
  const pq = r.perQuery;

  const e = fmtEnergyFixed(pq.wh);
  const c = fmtCo2Fixed(pq.gCO2e);
  const cost = fmtCostFixed(pq.costUsd);
  const w = fmtWaterFixed(pq.waterMl);
  const g = fmtGpu(pq.gpuSec);

  bindText('vEnergy', `${e.v} ${e.u}`);
  bindText('vCo2', `${c.v} ${c.u}`);
  bindText('vCost', `${cost.v}${cost.u}`);
  bindText('vWater', `${w.v} ${w.u}`);
  bindText('vGpu', `${g.v} ${g.u}`);

  const em = fmtEnergy(r.energyWh.monthly);
  const cm = fmtCo2(r.co2G.monthly);
  const wm = fmtWater(r.waterMl.monthly);
  bindText('vMonthEnergy', `${em.v} ${em.u}`);
  bindText('vMonthCo2', `${cm.v} ${cm.u}`);
  bindText('vMonthWater', `${wm.v} ${wm.u}`);

  bindText('gridLabel', `Grid intensity: ${gridG} g CO2e/kWh (Australia)`);
  bindText('pueLabel', `PUE: ${pue.toFixed(2)}`);
  bindText('promptLabel', `Prompt tokens: ${promptTok.toLocaleString()}`);
  bindText('outLabel', `Output tokens: ${outTok.toLocaleString()}`);
  bindText('queriesLabel', `Queries / day: ${queriesPerDay.toLocaleString()}`);
  bindText('modelMeta', `${model.size} · ${model.energyNote}`);

  buildBreakdownChart(model, promptTok, outTok, pue);
  renderAggTable(r);
  renderBaseline(pq.wh);
  renderEquivalents(r.energyWh.monthly, r.co2G.monthly);
  renderExamples(gridG, pue, 'examplesBody');
}

function onQueryTypeChange() {
  const qt = DATA.queryTypes.find((q) => q.id === $('queryType').value);
  if (qt) {
    $('promptSlider').value = qt.promptTok;
    $('outSlider').value = qt.outTok;
  }
}

function bindControls() {
  const ids = ['modelSelect', 'queryType', 'promptSlider', 'outSlider', 'queriesSlider', 'pueSlider'];
  ids.forEach((id) => $(id).addEventListener('input', render));
  $('compareSelect').addEventListener('change', render);
  $('queryType').addEventListener('change', () => {
    onQueryTypeChange();
    render();
  });
  $('modelSelect').addEventListener('change', () => {
    render();
    buildEnergyChart();
    buildCostChart();
  });
}

function bindTabs() {
  const activate = (tabId) => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === tabId));
    window.scrollTo({ top: 0 });
  };
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => activate(btn.dataset.tab));
  });
  document.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      activate(el.dataset.goto);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const modelSel = $('modelSelect');
  modelSel.innerHTML = DATA.models
    .map((m) => `<option value="${m.id}">${m.name} (${m.provider})</option>`)
    .join('');

  const qtSel = $('queryType');
  qtSel.innerHTML = DATA.queryTypes
    .map((q) => `<option value="${q.id}">${q.label}</option>`)
    .join('');

  const cmpSel = $('compareSelect');
  cmpSel.innerHTML = DATA.baselines
    .map((b) => `<option value="${b.id}">${b.label}</option>`)
    .join('');

  bindTabs();
  bindControls();
  render();
  buildEnergyChart();
  buildCostChart();
  buildMacroChart();
  buildMacroWaterChart();
  renderMacroWaterNotes();
  renderHeadlineRefs();
  renderSources();
  renderMethodology();
  renderMacroNotes();
  renderRightToolForTask();
  renderAuContext();
  renderStaticExamples();
  buildExamplesScatter();
});
