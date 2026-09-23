const $ = (id) => document.getElementById(id);





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



function svgBarChart(id, labels, values, colors, opts = {}) {
  const host = $(id);
  host.innerHTML = '';
  const maxLines = Math.max.apply(null, labels.map((l) => String(l).split('\n').length));
  const W = 560, H = 250;
  const padL = 48, padB = 22 + maxLines * 15, padT = 14, padR = 10;
  const max = opts.max || niceMax(Math.max.apply(null, values) * 1.1);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = values.length, slot = innerW / n, barW = Math.min(slot * 0.58, 52);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', width: '100%', height: '100%' });
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = max * i / ticks, y = padT + innerH - innerH * i / ticks;
    svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: 'rgba(255,255,255,0.07)' }));
    const t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: '#9aa5b1', 'font-size': 13 });
    t.textContent = fmtNum(val);
    svg.appendChild(t);
  }
  if (opts.yUnit) {
    const yt = svgEl('text', { x: 13, y: padT + innerH / 2, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 13, transform: `rotate(-90 13 ${padT + innerH / 2})` });
    yt.textContent = opts.yUnit;
    svg.appendChild(yt);
  }
  values.forEach((v, i) => {
    const h = innerH * v / max, x = padL + slot * i + (slot - barW) / 2, y = padT + innerH - h;
    svg.appendChild(svgEl('rect', { x, y, width: barW, height: Math.max(h, 2), rx: 3, fill: colors[i] || '#5b8ff9' }));
    const vtx = svgEl('text', { x: x + barW / 2, y: Math.max(y - 4, padT + 8), 'text-anchor': 'middle', fill: '#c9d1d9', 'font-size': 13 });
    vtx.textContent = fmtNum(v);
    svg.appendChild(vtx);
    const lines = String(labels[i]).split('\n');
    const maxChars = Math.max(4, Math.floor((slot * 0.92) / 6));
    lines.forEach((ln, j) => {
      const ltx = svgEl('text', { x: x + barW / 2, y: padT + innerH + 16 + j * 15, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 12 });
      ltx.textContent = ln.length > maxChars ? ln.slice(0, maxChars - 1) + '…' : ln;
      svg.appendChild(ltx);
    });
  });
  host.appendChild(svg);
}

function svgLineChart(id, labels, series, opts = {}) {
  const host = $(id);
  host.innerHTML = '';
  const W = 560, H = 250;
  const padL = 48, padB = 34, padT = 16, padR = 12;
  const allVals = [];
  series.forEach((s) => s.data.forEach((v) => { if (v != null) allVals.push(v); }));
  const max = opts.max || niceMax(Math.max.apply(null, allVals) * 1.1);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = max * i / ticks, y = padT + innerH - innerH * i / ticks;
    svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: 'rgba(255,255,255,0.07)' }));
    const t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: '#9aa5b1', 'font-size': 13 });
    t.textContent = fmtNum(val);
    svg.appendChild(t);
  }
  if (opts.yUnit) {
    const yt = svgEl('text', { x: 13, y: padT + innerH / 2, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 13, transform: `rotate(-90 13 ${padT + innerH / 2})` });
    yt.textContent = opts.yUnit;
    svg.appendChild(yt);
  }
  labels.forEach((lb, i) => {
    const x = padL + innerW * i / (labels.length - 1);
    const anchor = i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle';
    const t = svgEl('text', { x, y: H - 12, 'text-anchor': anchor, fill: '#9aa5b1', 'font-size': 13 });
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
  if (!opts.hideLegend) {
    series.forEach((s, i) => {
      const ly = 22 + i * 18;
      svg.appendChild(svgEl('line', { x1: padL, y1: ly, x2: padL + 16, y2: ly, stroke: s.color, 'stroke-width': 2 }));
      const t = svgEl('text', { x: padL + 22, y: ly + 4, fill: '#c9d1d9', 'font-size': 13 });
      t.textContent = s.label;
      svg.appendChild(t);
    });
  }
  host.appendChild(svg);
}

const GROUP_COLORS = {
  'Everyday text': '#5b8ff9',
  'Heavy documents & code': '#7c5cd6',
  'Vision & media': '#f6bd60',
  'Audio': '#84a98c',
  'Other': '#adb5bd',
  'Household reference': '#e85d75',
};

function svgScatterChart(id, points, opts = {}) {
  const host = $(id);
  host.innerHTML = '';
  const W = 900, H = 500;
  const padL = 64, padB = 48, padT = 22, padR = 20;
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
    const t = svgEl('text', { x, y: padT + innerH + 16, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 13 });
    t.textContent = fmtLog(v);
    svg.appendChild(t);
  }
  for (let i = 0; i <= ticks; i++) {
    const v = yMin * Math.pow(yMax / yMin, i / ticks), y = yAt(v);
    svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: padL + innerW, y2: y, stroke: 'rgba(255,255,255,0.07)' }));
    const t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: '#9aa5b1', 'font-size': 13 });
    t.textContent = fmtLog(v);
    svg.appendChild(t);
  }
  const xt = svgEl('text', { x: padL + innerW / 2, y: H - 6, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 13 });
  xt.textContent = opts.xLabel || 'Energy per query (Wh, log scale)';
  svg.appendChild(xt);
  const yt = svgEl('text', { x: 14, y: padT + innerH / 2, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 13, transform: `rotate(-90 14 ${padT + innerH / 2})` });
  yt.textContent = opts.yLabel || 'Cost per query (USD, log scale)';
  svg.appendChild(yt);

  let tip = null;
  if (opts.tip) {
    tip = document.createElement('div');
    tip.className = 'scatter-tip';
    host.appendChild(tip);
  }

  points.forEach((p, pi) => {
    const r = p.reference ? 8 : 4 + Math.min(16, Math.sqrt(p.size) * 2.2);
    const jitterX = (pi * 37 % 9) - 4;
    const jitterY = (pi * 53 % 9) - 4;
    let cx = xAt(p.x) + jitterX, cy = yAt(p.y) + jitterY;
    cx = Math.min(Math.max(cx, padL + r + 2), padL + innerW - r - 2);
    cy = Math.min(Math.max(cy, padT + r + 2), padT + innerH - r - 2);
    const hit = svgEl('circle', { cx, cy, r: r + 5, fill: 'transparent', 'pointer-events': 'all' });
    svg.appendChild(hit);
    const circle = svgEl('circle', { cx, cy, r, fill: p.color, 'fill-opacity': '0.55', stroke: p.color, 'stroke-width': 1.5, 'pointer-events': 'none' });
    if (p.hollow) {
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke-dasharray', '4 3');
    }
    if (p.reference) {
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke-width', '2.5');
    }
    svg.appendChild(circle);
    const t = svgEl('text', { x: cx, y: cy + 3.5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 11, 'font-weight': '700', 'pointer-events': 'none' });
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
      hit.addEventListener('mousemove', move);
      hit.addEventListener('mouseenter', move);
      hit.addEventListener('mouseleave', leave);
    }
  });

  const plot = document.createElement('div');
  plot.className = 'scatter-plot';
  plot.appendChild(svg);
  host.appendChild(plot);

  const groups = [];
  const seen = new Set();
  points.forEach((p) => {
    if (seen.has(p.group)) return;
    seen.add(p.group);
    groups.push(`<span class="scatter-legend-item"><i class="scatter-legend-swatch" style="background:${p.color}"></i>${p.group}</span>`);
  });
  const notes = ['Bubble size = water'];
  if (points.some((p) => p.reference)) notes.push('K = kettle reference');
  if (points.some((p) => p.hollow)) notes.push('dashed = no list price');
  const legend = document.createElement('div');
  legend.className = 'scatter-legend';
  legend.innerHTML = `${groups.join('')}<span class="scatter-legend-note">${notes.join(' · ')}</span>`;
  host.appendChild(legend);
}

const SCATTER_METRICS = {
  usd: { label: 'Cost per query (USD, log scale)', y: (r) => (r.costUsd != null ? r.costUsd : 0.00005), hollow: (r) => r.costUsd == null },
  co2: { label: 'CO2e per query (g, log scale)', y: (r) => r.gCO2e, hollow: () => false },
  water: { label: 'Water per query (ml, log scale)', y: (r) => r.waterMl, hollow: () => false },
};

function buildExamplesScatter(metricKey = 'usd') {
  const gridG = currentGrid().gCO2ePerKWh;
  const pue = DATA.defaultPue;
  const metric = SCATTER_METRICS[metricKey] || SCATTER_METRICS.usd;
  const points = EXAMPLES.map((ex) => {
    const r = exampleResult(ex, gridG, pue).perQuery;
    return {
      x: r.wh,
      y: metric.y(r),
      size: r.waterMl,
      color: GROUP_COLORS[ex.group] || '#adb5bd',
      group: ex.group || 'Other',
      label: (EXAMPLES.indexOf(ex) + 1).toString(),
      hollow: metric.hollow(r),
      ex,
    };
  });
  const kettleWh = DATA.kettle.energyWh;
  const kettleAssumptions = DATA.kettle;
  const kettleElectricityAud = kettleAssumptions.energyWh / 1000 * kettleAssumptions.electricityAudPerKWh;
  const kettleCapitalAud = kettleAssumptions.purchaseAud / (kettleAssumptions.lifeYears * 365 * kettleAssumptions.fullBoilsPerDay);
  const kettle = {
    wh: kettleWh,
    gCO2e: kettleWh / 1000 * gridG,
    waterMl: kettleAssumptions.fullKettleWaterMl,
    electricityAud: kettleElectricityAud,
    capitalAud: kettleCapitalAud,
    totalAud: kettleElectricityAud + kettleCapitalAud,
    costUsd: (kettleElectricityAud + kettleCapitalAud) * kettleAssumptions.audUsd,
  };
  if (metricKey !== 'water') {
    points.push({
      x: kettle.wh,
      y: metric.y(kettle),
      size: 0,
      color: GROUP_COLORS['Household reference'],
      group: 'Household reference',
      label: 'K',
      reference: true,
      kettle,
    });
  }
  svgScatterChart('examplesScatter', points, {
    yLabel: metric.label,
    tip: (p) => {
      if (p.kettle) {
        const e = fmtEnergyFixed(p.kettle.wh), c = fmtCo2Fixed(p.kettle.gCO2e), w = fmtWaterFixed(p.kettle.waterMl);
        return `<div class="tip-title">K. Boiling a kettle</div>
          <div class="tip-metrics">⚡ ${e.v} ${e.u} · 🌡️ ${c.v} ${c.u} · 💧 ${w.v} ${w.u}</div>
          <div class="tip-metrics">💵 A$${p.kettle.totalAud.toFixed(3)} per boil · US$${p.kettle.costUsd.toFixed(3)} on chart</div>
          <div class="tip-note">Cost assumption: A$${kettleAssumptions.purchaseAud} kettle, ${kettleAssumptions.lifeYears}-year life, ${kettleAssumptions.fullBoilsPerDay} full boils/day, and A$${kettleAssumptions.electricityAudPerKWh.toFixed(2)}/kWh. The electricity tariff varies by plan; capital cost is allocated across the assumed boils. CO2e is derived from the selected grid (${gridG} g/kWh). On the water axis the K bubble sits at its real volume (~${(kettleAssumptions.fullKettleWaterMl / 1000).toFixed(2)} L) — that is water boiled at home, not a data-centre water footprint.</div>`;
      }
      const r = exampleResult(p.ex, gridG, pue).perQuery;
      const e = fmtEnergyFixed(r.wh), c = fmtCo2Fixed(r.gCO2e), w = fmtWaterFixed(r.waterMl);
      const cost = r.costUsd == null ? 'no list price' : fmtCostFixed(r.costUsd);
      const costCell = r.costUsd == null ? 'no list price' : `${cost.v}${cost.u}`;
      const num = (EXAMPLES.indexOf(p.ex) + 1).toString();
      return `<div class="tip-title">${num}. ${p.ex.desc}</div>
        <div class="tip-metrics">⚡ ${e.v} ${e.u} · 🌡️ ${c.v} ${c.u} · 💧 ${w.v} ${w.u} · 💵 ${costCell}</div>
        <div class="tip-metrics">${exampleModelName(p.ex)}</div>
        ${p.ex.note ? `<div class="tip-note">${p.ex.note}</div>` : ''}`;
    },
  });
}

function buildEnergyChart() {
  const gridG = currentGrid().gCO2ePerKWh;
  const labels = DATA.models.map((m) => m.name);
  const values = DATA.models.map((m) =>
    compute(m, 200, 400, 1, gridG, DATA.defaultPue).perQuery.wh
  );
  svgBarChart(
    'energyChart',
    [...labels, 'Google search\n(de Vries 2023)'],
    [...values, 0.3],
    ['#5b8ff9', '#7c5cd6', '#f6bd60', '#f28482', '#84a98c', '#adb5bd'],
    { yUnit: 'Wh' }
  );
}

function buildCostChart() {
  const gridG = currentGrid().gCO2ePerKWh;
  const labels = DATA.models.map((m) => m.name);
  const values = DATA.models.map((m) =>
    compute(m, 200, 400, 1, gridG, DATA.defaultPue).perQuery.costUsd * 1000
  );
  svgBarChart('costChart', labels, values, DATA.models.map(() => '#5b8ff9'), { yUnit: 'USD per 1,000 queries' });
}

function buildMacroChart() {
  const labels = DATA.macro.globalDcElectricity.map((d) => d.year);
  const g = DATA.macro.globalDcElectricity.map((d) => d.tWh);
  svgLineChart('macroChart', labels, [
    { label: 'Global data-centre electricity (TWh)', color: '#5b8ff9', data: g },
  ], { max: 1000, yUnit: 'TWh', hideLegend: true });
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

function renderAggTable(r) {
  const rows = [
    ['Energy', 'kWh', fmtEnergy, fmtEnergyFixed],
    ['CO2e', 'g', fmtCo2, fmtCo2Fixed],
    ['Cost', '$', fmtCost, fmtCostFixed],
    ['Water', 'ml', fmtWater, fmtWaterFixed],
    ['Accelerator-equivalent time', 's', fmtGpu, fmtGpu],
  ];
  const headers = ['Metric', 'Per query', 'Per day', 'Per month', 'Per year'];
  const body = rows
    .map(([label, key, fmt, fmtFixed]) => {
      const src = key === 'kWh' ? r.energyWh : key === 'g' ? r.co2G : key === '$' ? r.cost : key === 'ml' ? r.waterMl : r.gpuSecTotal;
      const cell = (v, f) => (v == null ? '—' : `${f(v).v} ${f(v).u}`);
      return `<tr>
        <td>${label}</td>
        <td>${cell(src.perQuery, fmtFixed)}</td>
        <td>${cell(src.daily, fmt)}</td>
        <td>${cell(src.monthly, fmt)}</td>
        <td>${cell(src.yearly, fmt)}</td>
      </tr>`;
    })
    .join('');
  $('aggTable').innerHTML =
    `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody>`;
}

function exampleSourceLinks(ex) {
  if (!ex.sources || !ex.sources.length) return '';
  const links = sourceRefs(ex.sources);
  return links ? `<div class="ex-src">Sources: ${links}</div>` : '';
}

function exampleEqText(ex, gridG, pue) {
  const r = exampleResult(ex, gridG, pue).perQuery;
  const eq = DATA.equivalents;
  const bottlePct = ((r.waterMl / eq.waterBottleMl) * 100).toFixed(1);
  const phonePct = ((r.wh / eq.smartphoneChargeWh) * 100).toFixed(1);
  const coffeePct = ((r.gCO2e / eq.coffeeG) * 100).toFixed(1);
  return `≈ ${bottlePct}% of a ${eq.waterBottleMl}&nbsp;ml bottle of water · ${phonePct}% of a phone charge · ${coffeePct}% of a cup of coffee`;
}

const SOURCE_CATS = [
  { id: 'peer', label: 'Peer-reviewed papers (most trusted)', color: '#5b8ff9', desc: 'Journal or top-conference peer review; figures carry the strongest weight.' },
  { id: 'institution', label: 'Institutional & government reports', color: '#84a98c', desc: 'IEA, UN, EPA, government agencies and policy institutes.' },
  { id: 'preprint', label: 'Recent research preprints', color: '#7c5cd6', desc: 'arXiv preprints / workshop papers; rigorous methods, not yet journal-reviewed.' },
  { id: 'journalism', label: 'Journalism, opinion & fact-checks', color: '#f6bd60', desc: 'News articles, expert commentary and independent fact-checks.' },
  { id: 'vendor', label: 'Vendor & company sources', color: '#adb5bd', desc: 'Pricing pages, company blogs and self-reported claims; treat as promotional.' },
];

function sourcePublicationYear(source) {
  const match = `${source.ref} ${source.label}`.match(/\b(19|20)\d{2}\b/g);
  return match ? Math.max(...match.map(Number)) : 0;
}

const SOURCE_ENTRIES = SOURCE_CATS.flatMap((category) => Object.entries(SOURCES)
  .filter(([, source]) => source.cat === category.id)
  .map(([id, source], order) => ({ id, source, order, year: sourcePublicationYear(source) }))
  .sort((a, b) => b.year - a.year || a.order - b.order));
const SOURCE_NUMBERS = new Map(SOURCE_ENTRIES.map(({ id }, index) => [id, index + 1]));

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sourceRef(id) {
  const source = sourceById(id);
  const number = SOURCE_NUMBERS.get(id);
  if (!source || !number) return '';
  const description = `${source.ref}: ${source.label}`;
  return `<a class="source-ref" href="#source-${id}" data-source-ref="${id}" title="${escapeAttr(description)}" aria-label="Reference ${number}: ${escapeAttr(description)}">[${number}]</a>`;
}

function sourceRefs(ids) {
  return [...new Set(ids || [])].map(sourceRef).filter(Boolean).join(' ');
}

function hydrateSourceRefs() {
  document.querySelectorAll('[data-source-ref]').forEach((link) => {
    const id = link.dataset.sourceRef;
    const source = sourceById(id);
    const number = SOURCE_NUMBERS.get(id);
    if (!source || !number) return;
    const description = `${source.ref}: ${source.label}`;
    link.textContent = `[${number}]`;
    link.title = description;
    link.setAttribute('aria-label', `Reference ${number}: ${description}`);
  });
}

function renderSources() {
  const cats = SOURCE_CATS.map((c) => {
    const links = SOURCE_ENTRIES
      .filter(({ source }) => source.cat === c.id)
      .map(
        ({ id, source, year }) => `<li class="source-entry" id="source-${id}"><span class="source-year">${year || 'n.d.'}</span><span><strong>[${SOURCE_NUMBERS.get(id)}]</strong> <a href="${srcHref(source)}" target="_blank" rel="noopener">${source.label}</a> — ${source.ref}.${source.accessed ? ` Accessed ${source.accessed}.` : ''} ${source.note}</span></li>`
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
  const wm = DATA.waterModel;
  const wueTotal = totalWue();
  const pue = DATA.defaultPue;
  const gridG = currentGrid().gCO2ePerKWh;

  const html = `
    <p class="hint" style="margin-bottom:12px;">Token-based scenarios use the four formulas below; fixed media examples retain their published energy estimates. Technical controls are in the <a href="#" data-goto="tab-advanced">advanced calculator</a>.</p>
    <div class="method-grid">
      <div class="method">
        <h3>⚡ Energy</h3>
        <p><code>Wh = (promptTok × J/input + outTok × J/output) × PUE ÷ 3600</code></p>
        <p class="hint">Per-token joules are scenario assumptions informed by measured inference benchmarks and checked against the peer-reviewed range ${sourceRef('jouleInference')}; they are not provider telemetry. PUE overhead ${pue}× is an adjustable assumption.</p>
      </div>
      <div class="method">
        <h3>🌡️ CO2</h3>
        <p><code>g CO2e = kWh × ${gridG} g/kWh</code></p>
        <p class="hint">Selected grid: ${DATA.gridIntensity.label}, ~${gridG} g CO2e/kWh ${sourceRef(DATA.gridIntensity.source)}. The real value depends on grid mix and time of day.</p>
      </div>
      <div class="method">
        <h3>💧 Water</h3>
        <p><code>ml = kWh × ${wueTotal} L/kWh × 1000</code></p>
        <p class="hint">Primary estimate uses direct WUE ${wm.wueLPerKWh} L/kWh ${sourceRef('eesiWater')} plus ${wm.indirectLPerKWh} L/kWh indirect electricity water ${sourceRef('cellReports')}. Regional limits are described in ${sourceRef('npjWater')}. Published prompt-level figures such as 519 ml are shown separately because their boundaries differ.</p>
      </div>
      <div class="method">
        <h3>💵 Cost</h3>
        <p><code>USD = (promptTok ÷ 1M) × price_in + (outTok ÷ 1M) × price_out</code></p>
        <p class="hint">Public API list prices per 1M tokens ${sourceRefs(['openaiPrice', 'anthropicPrice'])}.</p>
      </div>
    </div>
    <p class="hint" style="margin-top:12px;">Fixed examples (AI images, video clips, audio transcription) retain each study's published energy boundary instead of adding the adjustable PUE. CO2 and water are then derived with the selected grid and the dashboard's water scenario. Each row links its source.</p>
  `;
  $('methodology').innerHTML = html;
}

function renderRightToolForTask() {
  const costLabels = ['Near-zero', 'Low', 'Moderate', 'High'];
  const rows = DATA.rightToolForTask
    .map((t) => {
      const dots = [0, 1, 2].map((i) => `<i class="dot ${i < t.cost ? 'on' : ''}"></i>`).join('');
      return `<tr>
        <td data-label="Task"><strong>${t.task}</strong></td>
        <td data-label="Best tool"><span class="pill">${t.best}</span></td>
        <td data-label="Resource use"><span class="cost-dots" title="${costLabels[t.cost]} resource use">${dots}</span><span class="cost-lbl">${costLabels[t.cost]}</span></td>
        <td data-label="Why" class="why">${t.why}</td>
      </tr>`;
    })
    .join('');
  $('toolBody').innerHTML = rows;
}

function renderOutlook() {
  const synthesis = DATA.macro.synthesis;
  $('synthesisTakeaway').textContent = synthesis.takeaway || '';
  $('macroChartSources').innerHTML = sourceRefs(['ieaEnergyAI', 'aiServers']);
  $('auDemandSources').innerHTML = sourceRefs(['afrHunger', 'afrAemo']);
  $('auWaterSources').innerHTML = sourceRefs(['climateCouncil']);
  $('auChartSources').innerHTML = sourceRefs(['dcByte', 'aemoDc', 'climateCouncil']);
  buildAuResourceCharts();
  buildAuPipelineChart();
}

function noteListHtml(notes) {
  const html = (notes || [])
    .map((n) => {
      const text = typeof n === 'string' ? n : n.text;
      const links = sourceRefs(typeof n === 'object' ? n.sources : []);
      return `<li>${text}${links ? `<span class="note-src">Sources: ${links}</span>` : ''}</li>`;
    })
    .join('');
  return `<ul>${html}</ul>`;
}

function buildAuPipelineChart() {
  svgBarChart(
    'auPipelineChart',
    ['Operational\n2025', 'Forecast\n2030', 'Connection\nqueue', 'Announced\npipeline'],
    [1.4, 3.2, 5.4, 21.6],
    ['#84a98c', '#5b8ff9', '#f6bd60', '#f28482'],
    { yUnit: 'GW', max: 25 }
  );
}

function buildAuResourceCharts() {
  svgLineChart('auDemandChart', ['Today', '2035'], [
    { label: 'Electricity demand (TWh)', color: '#5b8ff9', data: [4, 21.4] },
  ], { max: 25, yUnit: 'TWh', hideLegend: true });
  svgLineChart('auWaterChart', ['Today', '2030'], [
    { label: 'Water demand (GL)', color: '#84a98c', data: [5.5, 17] },
  ], { max: 20, yUnit: 'GL', hideLegend: true });
}

function buildTrainingChart() {
  const host = $('trainingChart');
  if (!host) return;
  host.innerHTML = '';
  const W = 560, H = 250;
  const padL = 190, padR = 14, padT = 16, padB = 34;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  const gridG = currentGrid().gCO2ePerKWh;
  const r = compute(DATA.models[0], 200, 400, 1, gridG, DATA.defaultPue).perQuery;
  const queryG = r.gCO2e;
  const yearG = queryG * 30 * 365;
  const trainG = 284e6;

  const bars = [
    { label: 'A single query', v: queryG, color: '#5b8ff9' },
    { label: 'Your AI use (30/day, 1 yr)', v: yearG, color: '#84a98c' },
    { label: 'Historical training programme', v: trainG, color: '#f28482' },
  ];
  const linearMax = niceMax(trainG * 1.1);
  const xAt = (v) => padL + (v / linearMax) * innerW;

  const mult = (f) => {
    if (f >= 1e9) return `~${(f / 1e9).toFixed(1)}B×`;
    if (f >= 1e6) return `~${(f / 1e6).toFixed(1)}M×`;
    if (f >= 1e3) return `~${(f / 1e3).toFixed(1)}k×`;
    return `~${f.toFixed(0)}×`;
  };

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
  for (let i = 0; i <= 4; i++) {
    const v = linearMax * i / 4;
    const x = xAt(v);
    svg.appendChild(svgEl('line', { x1: x, y1: padT, x2: x, y2: padT + innerH, stroke: 'rgba(255,255,255,0.07)' }));
    const t = svgEl('text', { x, y: padT + innerH + 14, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 12 });
    const f = fmtCo2Tonne(v);
    t.textContent = `${f.v} ${f.u}`;
    svg.appendChild(t);
  }
  const barH = Math.min(innerH / bars.length * 0.55, 26);
  bars.forEach((b, i) => {
    const y = padT + innerH / bars.length * i + (innerH / bars.length - barH) / 2;
    const x = xAt(b.v);
    const w = Math.max(x - padL, 4);
    svg.appendChild(svgEl('rect', { x: padL, y, width: w, height: barH, rx: 3, fill: b.color }));
    const lbl = svgEl('text', { x: padL - 8, y: y + barH / 2 + 3.5, 'text-anchor': 'end', fill: '#c9d1d9', 'font-size': 13 });
    lbl.textContent = b.label;
    svg.appendChild(lbl);
    const f = fmtCo2Tonne(b.v);
    const txt = `${f.v} ${f.u}`;
    const endAnchor = x + 8 + txt.length * 5.5 > W - padR;
    const tx = endAnchor ? x - 8 : x + 8;
    const anchor = endAnchor ? 'end' : 'start';
    const vtx = svgEl('text', { x: tx, y: y + barH / 2 + 3.5, fill: '#fff', 'font-size': 13, 'font-weight': '700', 'text-anchor': anchor });
    vtx.textContent = txt;
    svg.appendChild(vtx);
    const mx = svgEl('text', { x: tx, y: y + barH / 2 + 16, fill: 'rgba(255,255,255,0.75)', 'font-size': 11, 'text-anchor': anchor });
    mx.textContent = `${mult(b.v / queryG)} a single query`;
    svg.appendChild(mx);
  });
  const cap = svgEl('text', { x: padL + innerW / 2, y: H - 6, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 13 });
  cap.textContent = 'g CO2e (linear scale)';
  svg.appendChild(cap);
  host.appendChild(svg);
}

function renderStaticExamples() {
  const gridG = currentGrid().gCO2ePerKWh;
  const pue = DATA.defaultPue;
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
          const e = fmtEnergyFixed(r.wh), c = fmtCo2Fixed(r.gCO2e), w = fmtWaterFixed(r.waterMl);
          const toks = ex.fixedWh != null ? '—' : `${(ex.promptTok / 1000).toFixed(1)}k / ${(ex.outTok / 1000).toFixed(1)}k`;
          const costCell = r.costUsd == null ? '—' : fmtCostFixed(r.costUsd).v + fmtCostFixed(r.costUsd).u;
          return `<tr>
            <td>${idx}</td>
            <td>${ex.desc}</td>
            <td>${exampleModelName(ex)}<br><span class="hint">${toks}</span></td>
            <td>${e.v} ${e.u}</td>
            <td>${c.v} ${c.u}</td>
            <td>${w.v} ${w.u}</td>
            <td>${costCell}</td>
            <td class="why">${exampleEqText(ex, gridG, pue)}</td>
            <td class="why">${ex.note}${exampleSourceLinks(ex)}</td>
          </tr>`;
        })
        .join('');
      return `<tr class="group-row"><td colspan="9"><strong>${g}</strong></td></tr>${rows}`;
    })
    .join('');
  $('staticExamples').innerHTML = `<div class="subcard">
    <h3>All examples, one table</h3>
    <div style="overflow-x:auto;"><table>
      <thead><tr><th>#</th><th>Example</th><th>Model</th><th>Energy (Wh)</th><th>CO2e (g)</th><th>Water (ml)</th><th>Cost (USD)</th><th>≈ Everyday equivalent</th><th>Note &amp; sources</th></tr></thead>
      <tbody>${summary}</tbody>
    </table></div>
  </div>`;

  const wueTotal = totalWue();

  const refCards = (DATA.referenceCards || [])
    .map((c) => {
      return `<div class="metric"><div class="v">${c.value}</div><div class="u">${c.label} ${sourceRef(c.source)}</div></div>`;
    })
    .join('');
  const wueCard = `<div class="metric"><div class="v" id="wueValue">${wueTotal} L/kWh</div><div class="u">composite water-intensity scenario${wueSourceLink('cellReports')}</div></div>`;
  $('referenceCards').innerHTML = refCards + wueCard;
  $('glossary').innerHTML = '<strong>Abbreviations:</strong> CO2e = CO2-equivalent greenhouse gases · WUE = water used per unit of electricity (L/kWh) · Mt = million tonnes · B L = billion litres · Wh/g/ml/USD = per-query units.';

  const trainCards = (DATA.trainingEmbodied || [])
    .map((c) => {
      return `<div class="metric"><div class="v">${c.value}</div><div class="u">${c.label} ${sourceRef(c.source)}</div></div>`;
    })
    .join('');
  $('trainingCards').innerHTML = trainCards;
  buildTrainingChart();
  renderEverydayTable(gridG);
}

function renderEverydayTable(gridG) {
  const pue = DATA.defaultPue;
  const emailG = exampleResult(EXAMPLES[0], gridG, pue).perQuery.gCO2e;
  const chatG = 0.31 / 1000 * gridG;
  const imageG = 2.9 / 1000 * gridG;
  const audioG = 16 / 1000 * gridG;
  const videoG = 90 / 1000 * gridG;
  const f = (n) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return Math.round(n / 1e3) + 'k';
    return Math.round(n).toLocaleString();
  };
  const spectrumFor = (kg) => {
    const g = kg * 1000;
    return `≈ ${f(g / emailG)} emails · ${f(g / chatG)} chat queries · ${f(g / imageG)} AI images · ${f(g / audioG)} h audio · ${f(g / videoG)} video clips`;
  };
  const rows = [
    { thing: 'Manufacturing a new EV (incl. battery)', footprint: '~7 t CO2e', special: 'Training a GPT-3-era model (~284 t CO2e) is the carbon of about 41 new EVs.', source: 'icctEv' },
    { thing: 'A litre of milk', footprint: '~1.3 kg CO2e', kg: 1.3, source: 'owidFood' },
    { thing: 'A block of cheese (250 g)', footprint: '~2.7 kg CO2e', kg: 2.7, source: 'owidFood' },
    { thing: 'A loaf of bread', footprint: '~0.8 kg CO2e', kg: 0.8, source: 'owidFood' },
    { thing: 'Buying 10 kg of carrots from a supermarket', footprint: '~4 kg CO2e', kg: 4, source: 'carboncloudCarrots' },
    { thing: 'Driving 100 km in a petrol car', footprint: '~17 kg CO2e', kg: 17, source: 'carPetrol' },
    { thing: '1 kg of beef', footprint: '~27 kg CO2e', kg: 27, source: 'owidFood' },
    { thing: 'A smartphone (manufacture)', footprint: '~70 kg CO2e', kg: 70, source: 'smartphoneEmbodied' },
    { thing: 'One ChatGPT query (Joule 2026 median)', footprint: `~${(chatG).toFixed(3)} g CO2e`, special: '= the baseline query', source: 'jouleInference' },
  ];
  $('everydayGridBadge').textContent = `${DATA.gridIntensity.label} ~${gridG} g CO2e/kWh`;
  $('everydayBody').innerHTML = rows.map((r) => {
    const ai = r.special || spectrumFor(r.kg);
    return `<tr><td><strong>${r.thing}</strong><br><span class="hint">${r.footprint} ${sourceRef(r.source)}</span></td><td class="why">${ai}</td></tr>`;
  }).join('');
}

function wueSourceLink(id) {
  const reference = sourceRef(id);
  return reference ? ` ${reference}` : '';
}

function formattedMetric(formatter, value) {
  const f = formatter(value);
  return `${f.v} ${f.u}`.trim();
}

function formattedWater(value) {
  if (value > 0 && value < 0.1) return '<0.1 ml';
  return formattedMetric(fmtWaterFixed, value);
}

function simpleNumber(value) {
  if (value > 0 && value < 0.1) return '<0.1';
  if (value < 10) return value.toFixed(1).replace(/\.0$/, '');
  return Math.round(value).toLocaleString();
}

function renderMainEstimate() {
  const profile = profileById($('mainProfileSelect').value) || DATA.taskProfiles[0];
  const usesPerDay = parseFloat($('mainFrequencySelect').value);
  const grid = currentGrid();
  const r = estimateProfile(profile, usesPerDay, grid.gCO2ePerKWh);
  const typical = r.perUse.typical;

  bindText('mainEnergy', formattedMetric(fmtEnergyFixed, typical.energyWh));
  bindText('mainCo2', formattedMetric(fmtCo2Fixed, typical.co2G));
  bindText('mainWater', formattedWater(typical.waterMl));
  bindText('mainEnergyRange', `Research range: ${formattedMetric(fmtEnergyFixed, r.perUse.low.energyWh)}–${formattedMetric(fmtEnergyFixed, r.perUse.high.energyWh)}`);
  bindText('mainCo2Range', `Range on this grid: ${formattedMetric(fmtCo2Fixed, r.perUse.low.co2G)}–${formattedMetric(fmtCo2Fixed, r.perUse.high.co2G)}`);
  bindText('mainWaterRange', `Scenario range: ${formattedWater(r.perUse.low.waterMl)}–${formattedWater(r.perUse.high.waterMl)}`);

  const month = r.monthly.typical;
  const phoneCharges = month.energyWh / DATA.equivalents.smartphoneChargeWh;
  const drivingKm = month.co2G / DATA.equivalents.carGPerKm;
  const bottles = month.waterMl / DATA.equivalents.waterBottleMl;
  $('mainMonthlySummary').innerHTML = `At the selected frequency, a typical month is <strong>${formattedMetric(fmtEnergy, month.energyWh)}</strong>, <strong>${formattedMetric(fmtCo2, month.co2G)} CO2e</strong> and <strong>${formattedMetric(fmtWater, month.waterMl)} of water</strong>. That energy is about ${simpleNumber(phoneCharges)} phone charges; the carbon is about ${simpleNumber(drivingKm)} km of petrol driving; the water is about ${simpleNumber(bottles)} × 500 ml bottles.`;

  const evidenceClass = profile.evidence === 'peer' ? 'evidence-peer' : 'evidence-preprint';
  $('mainEvidence').innerHTML = `<span class="badge ${evidenceClass}">${profile.evidenceLabel}</span><span class="hint">Source ${sourceRef(profile.source)}</span>`;
  bindText('mainAssumptions', profile.rangeNote);
}

function populateMainEstimator() {
  $('mainProfileSelect').innerHTML = DATA.taskProfiles
    .map((p) => `<option value="${p.id}">${p.label}</option>`)
    .join('');
}

function currentInputs() {
  const model = modelById($('modelSelect').value);
  const promptTok = parseInt($('promptSlider').value, 10);
  const outTok = parseInt($('outSlider').value, 10);
  const queriesPerDay = parseInt($('queriesSlider').value, 10);
  const gridG = currentGrid().gCO2ePerKWh;
  const pue = parseFloat($('pueSlider').value);
  const servingFactor = parseFloat($('servingSelect').value);
  const cacheHitRate = parseFloat($('cacheSlider').value) / 100;
  const wueLPerKWh = parseFloat($('wueSlider').value);
  return { model, promptTok, outTok, queriesPerDay, gridG, pue, servingFactor, cacheHitRate, wueLPerKWh };
}

function render() {
  const { model, promptTok, outTok, queriesPerDay, gridG, pue, servingFactor, cacheHitRate, wueLPerKWh } = currentInputs();
  const qt = DATA.queryTypes.find((q) => q.id === $('queryType').value);
  const r = computeQueryType(model, qt, queriesPerDay, gridG, pue, { promptTok, outTok, servingFactor, cacheHitRate, wueLPerKWh });
  const pq = r.perQuery;

  const e = fmtEnergyFixed(pq.wh);
  const c = fmtCo2Fixed(pq.gCO2e);
  const cost = pq.costUsd == null ? null : fmtCostFixed(pq.costUsd);
  const w = fmtWaterFixed(pq.waterMl);
  const g = pq.gpuSec == null ? null : fmtGpu(pq.gpuSec);

  bindText('vEnergy', `${e.v} ${e.u}`);
  bindText('vCo2', `${c.v} ${c.u}`);
  bindText('vCost', cost ? `${cost.v}${cost.u}` : '—');
  bindText('vWater', `${w.v} ${w.u}`);
  bindText('vGpu', g ? `${g.v} ${g.u}` : '—');

  const em = fmtEnergy(r.energyWh.monthly);
  const cm = fmtCo2(r.co2G.monthly);
  const wm = fmtWater(r.waterMl.monthly);
  const cst = r.cost.monthly == null ? null : fmtCostFixed(r.cost.monthly);
  const gm = r.gpuSecTotal.monthly == null ? null : fmtGpu(r.gpuSecTotal.monthly);
  bindText('vMonthEnergy', `${em.v} ${em.u}`);
  bindText('vMonthCo2', `${cm.v} ${cm.u}`);
  bindText('vMonthWater', `${wm.v} ${wm.u}`);
  bindText('vMonthCost', cst ? `${cst.v}${cst.u}` : '—');
  bindText('vMonthGpu', gm ? `${gm.v} ${gm.u}` : '—');

  $('gridHint').innerHTML = `Selected grid: ${DATA.gridIntensity.label}, ~${gridG} g CO2e/kWh ${sourceRef(DATA.gridIntensity.source)}.`;
  bindText('pueLabel', `PUE: ${pue.toFixed(2)}`);
  bindText('cacheLabel', `Reusable prompt cache: ${Math.round(cacheHitRate * 100)}%`);
  bindText('wueLabel', `Combined water intensity: ${wueLPerKWh.toFixed(1)} L/kWh`);
  bindText('promptLabel', qt.fixedWh != null ? 'Prompt tokens: —' : `Prompt tokens: ${promptTok.toLocaleString()}`);
  bindText('outLabel', qt.fixedWh != null ? 'Generated tokens: —' : `Generated tokens (including reasoning): ${outTok.toLocaleString()}`);
  bindText('queriesLabel', `Queries / day: ${queriesPerDay.toLocaleString()}`);
  $('modelSelect').title = model.energyNote;

  renderAggTable(r);
  renderEquivalents(r.energyWh.monthly, r.co2G.monthly);
}

function populateGridSelects() {
  const opts = DATA.grids.map((g) => `<option value="${g.id}">${g.label.replace(/\s*\(avg\)/i, '')} (~${g.gCO2ePerKWh} g/kWh)</option>`).join('');
  $('gridSelect').innerHTML = opts;
  $('gridSelectExamples').innerHTML = opts;
  $('mainGridSelect').innerHTML = opts;
  $('gridSelect').value = DATA.gridIntensity.id;
  $('gridSelectExamples').value = DATA.gridIntensity.id;
  $('mainGridSelect').value = DATA.gridIntensity.id;
}

function onGridChange(event) {
  const id = event?.target?.value || $('gridSelect').value;
  const g = DATA.grids.find((x) => x.id === id) || DATA.grids[0];
  DATA.gridIntensity = g;
  $('gridSelect').value = g.id;
  $('gridSelectExamples').value = g.id;
  $('mainGridSelect').value = g.id;
  renderMainEstimate();
  render();
  buildEnergyChart();
  buildCostChart();
  renderStaticExamples();
  buildExamplesScatter($('scatterMetric').value);
  renderMethodology();
}

function onQueryTypeChange() {
  const qt = DATA.queryTypes.find((q) => q.id === $('queryType').value);
  if (qt) {
    if (qt.fixedWh == null) {
      $('promptSlider').value = qt.promptTok;
      $('outSlider').value = qt.outTok;
    }
    syncFixedTypeUI(qt);
  }
}

function syncFixedTypeUI(qt) {
  const fixed = qt != null && qt.fixedWh != null;
  ['modelSelect', 'promptSlider', 'outSlider', 'servingSelect', 'cacheSlider', 'pueSlider'].forEach((id) => {
    $(id).disabled = fixed;
  });
  const hint = $('queryTypeHint');
  if (hint) {
    if (fixed) {
      hint.innerHTML = `Fixed per-inference preset (published measurement) — Model and token sliders don't apply. Sources: ${sourceRefs(qt.sources)}.`;
      hint.style.display = 'block';
    } else {
      hint.style.display = 'none';
    }
  }
}

function bindControls() {
  const ids = ['promptSlider', 'outSlider', 'servingSelect', 'cacheSlider', 'queriesSlider', 'pueSlider', 'wueSlider'];
  ids.forEach((id) => $(id).addEventListener('input', render));
  $('queryType').addEventListener('change', () => {
    onQueryTypeChange();
    render();
  });
  $('modelSelect').addEventListener('change', () => {
    render();
    buildEnergyChart();
    buildCostChart();
  });
  $('gridSelect').addEventListener('change', onGridChange);
  $('gridSelectExamples').addEventListener('change', onGridChange);
  $('mainGridSelect').addEventListener('change', onGridChange);
  $('mainProfileSelect').addEventListener('change', renderMainEstimate);
  $('mainFrequencySelect').addEventListener('change', renderMainEstimate);
  $('scatterMetric').addEventListener('change', () => {
    buildExamplesScatter($('scatterMetric').value);
  });
}

function bindTabs() {
  const buttons = [...document.querySelectorAll('.tab-btn')];
  const activate = (tabId) => {
    buttons.forEach((button) => {
      const selected = button.dataset.tab === tabId;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('.tab').forEach((panel) => {
      const selected = panel.id === tabId;
      panel.classList.toggle('active', selected);
      panel.setAttribute('aria-hidden', String(!selected));
    });
    window.scrollTo({ top: 0 });
  };
  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => activate(btn.dataset.tab));
    btn.addEventListener('keydown', (e) => {
      const offsets = { ArrowLeft: -1, ArrowRight: 1 };
      let next = offsets[e.key] == null ? null : (index + offsets[e.key] + buttons.length) % buttons.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = buttons.length - 1;
      if (next == null) return;
      e.preventDefault();
      buttons[next].focus();
      activate(buttons[next].dataset.tab);
    });
  });
  document.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      activate(el.dataset.goto);
    });
  });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-source-ref]');
    if (!link) return;
    e.preventDefault();
    activate('tab-sources');
    document.querySelectorAll('.source-entry.is-target').forEach((entry) => entry.classList.remove('is-target'));
    const entry = $(`source-${link.dataset.sourceRef}`);
    if (entry) {
      entry.classList.add('is-target');
      entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const vb = $('versionBadge');
  if (vb && typeof VERSION !== 'undefined') {
    vb.textContent = `Version ${VERSION}`;
    vb.title = `Dashboard version ${VERSION}`;
  }
  const modelSel = $('modelSelect');
  modelSel.innerHTML = DATA.models
    .map((m) => {
      const prov = m.name.toLowerCase().includes(m.provider.toLowerCase()) ? '' : ` (${m.provider})`;
      return `<option value="${m.id}">${m.name}${prov} · ${m.tier}</option>`;
    })
    .join('');

  const qtSel = $('queryType');
  qtSel.innerHTML = DATA.queryTypes
    .map((q) => `<option value="${q.id}">${q.label}</option>`)
    .join('');
  qtSel.value = 'standard';
  $('pueSlider').value = DATA.defaultPue;
  $('wueSlider').value = totalWue();
  onQueryTypeChange();

  populateMainEstimator();
  populateGridSelects();
  bindTabs();
  bindControls();
  renderMainEstimate();
  render();
  buildEnergyChart();
  buildCostChart();
  buildMacroChart();
  renderSources();
  renderMethodology();
  renderRightToolForTask();
  renderOutlook();
  renderStaticExamples();
  buildExamplesScatter();
  hydrateSourceRefs();
});
