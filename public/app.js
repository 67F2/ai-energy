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
  const max = niceMax(Math.max.apply(null, values) * 1.1);
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
    const maxW = Math.min(slot * 0.92, 90);
    lines.forEach((ln, j) => {
      const ltx = svgEl('text', { x: x + barW / 2, y: padT + innerH + 16 + j * 15, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 12 });
      ltx.textContent = ln.length > 18 ? ln.slice(0, 17) + '…' : ln;
      svg.appendChild(ltx);
    });
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
    const t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: '#9aa5b1', 'font-size': 13 });
    t.textContent = fmtNum(val);
    svg.appendChild(t);
  }
  labels.forEach((lb, i) => {
    const x = padL + innerW * i / (labels.length - 1);
    const t = svgEl('text', { x, y: H - 12, 'text-anchor': 'middle', fill: '#9aa5b1', 'font-size': 13 });
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
    const t = svgEl('text', { x: padL + 22, y: ly + 4, fill: '#c9d1d9', 'font-size': 13 });
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
  'Household reference': '#e85d75',
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

  const lx = padL + innerW + 22;
  let ly = padT + 10;
  const seen = {};
  points.forEach((p) => {
    if (seen[p.color]) return;
    seen[p.color] = true;
    const group = p.group;
    svg.appendChild(svgEl('rect', { x: lx, y: ly - 9, width: 12, height: 12, rx: 2, fill: p.color }));
    const t = svgEl('text', { x: lx + 18, y: ly, fill: '#c9d1d9', 'font-size': 13 });
    t.textContent = group;
    svg.appendChild(t);
    ly += 20;
  });
  const cap = svgEl('text', { x: lx, y: ly + 8, fill: '#9aa5b1', 'font-size': 13 });
  cap.textContent = 'Bubble size = water (ml)';
  svg.appendChild(cap);
  if (points.some((p) => p.reference)) {
    const capRef = svgEl('text', { x: lx, y: ly + 24, fill: '#9aa5b1', 'font-size': 13 });
    capRef.textContent = 'K = kettle reference (fixed-size bubble)';
    svg.appendChild(capRef);
  }
  if (points.some((p) => p.hollow)) {
    const cap2 = svgEl('text', { x: lx, y: ly + (points.some((p) => p.reference) ? 40 : 24), fill: '#9aa5b1', 'font-size': 13 });
    cap2.textContent = 'Dashed = no list price';
    svg.appendChild(cap2);
  }

  host.appendChild(svg);
}

const SCATTER_METRICS = {
  usd: { label: 'Cost per query (USD, log scale)', y: (r) => (r.costUsd != null ? r.costUsd : 0.00005), hollow: (r) => r.costUsd == null },
  co2: { label: 'CO2e per query (g, log scale)', y: (r) => r.gCO2e, hollow: () => false },
  water: { label: 'Water per query (ml, log scale)', y: (r) => r.waterMl, hollow: () => false },
};

function buildExamplesScatter(metricKey = 'usd') {
  const gridG = currentGrid().gCO2ePerKWh;
  const pue = 1.35;
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
  points.push({
    x: kettle.wh,
    // Full kettle boils ~1.75 L; place it at that real volume so the
    // water axis stays honest, and explain the boundary in the tooltip.
    y: metric.y(kettle),
    size: 0,
    color: GROUP_COLORS['Household reference'],
    group: 'Household reference',
    label: 'K',
    reference: true,
    kettle,
  });
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
    compute(m, 200, 400, 1, gridG, 1.35).perQuery.wh
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
    compute(m, 200, 400, 1, gridG, 1.35).perQuery.costUsd * 1000
  );
  svgBarChart('costChart', labels, values, DATA.models.map(() => '#5b8ff9'), { yUnit: 'USD per 1,000 queries' });
}

function buildMacroChart() {
  const labels = DATA.macro.globalDcElectricity.map((d) => d.year);
  const g = DATA.macro.globalDcElectricity.map((d) => d.tWh);
  const firms = DATA.macro.bigSixFirms;
  const firmData = labels.map((y) => {
    const f = firms.find((x) => x.year === y);
    return f ? f.high : null;
  });
  svgLineChart('macroChart', labels, [
    { label: 'Global data-center electricity (TWh)', color: '#5b8ff9', data: g },
    { label: 'Six leading AI firms (TWh, high est.)', color: '#f28482', data: firmData, dash: true },
  ]);
}

function buildMacroWaterChart() {
  const labels = DATA.macro.globalDcElectricity.map((d) => d.year);
  const wueTotal = totalWue();
  const derived = DATA.macro.globalDcElectricity.map((d) => (d.tWh * wueTotal) / 1e3);
  const bench = DATA.macro.waterBenchmark2030TrillionL || 9.3;
  const benchSeries = labels.map((y) => (y === 2030 ? bench : null));
  svgLineChart('macroWaterChart', labels, [
    { label: 'Derived global DC water (trillion L)', color: '#5b8ff9', data: derived },
    { label: 'UNU-INWEH 2030 projection (trillion L)', color: '#f6bd60', dash: true, data: benchSeries },
  ]);
}

function renderMacroWaterNotes() {
  $('macroWaterNotes').innerHTML = noteListHtml(DATA.macro.macroWaterNotes || []);
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

function exampleSourceLinks(ex) {
  if (!ex.sources || !ex.sources.length) return '';
  const links = ex.sources
    .map((id) => {
      const s = sourceById(id);
      return s ? `<a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a>` : '';
    })
    .filter(Boolean)
    .join(' · ');
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

function renderCompareTab() {
  const gridG = currentGrid().gCO2ePerKWh;
  const pue = 1.35;
  const fmtCells = (wh, gCO2e, costUsd) => {
    const e = wh == null ? '—' : `${fmtEnergyFixed(wh).v} ${fmtEnergyFixed(wh).u}`;
    const c = gCO2e == null ? '—' : `${fmtCo2Fixed(gCO2e).v} ${fmtCo2Fixed(gCO2e).u}`;
    const cost = costUsd == null ? '—' : fmtCostFixed(costUsd).v + fmtCostFixed(costUsd).u;
    return `<td>${e}</td><td>${c}</td><td>${cost}</td>`;
  };
  const srcCell = (id) => {
    const s = sourceById(id);
    return s ? `<a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a>` : '';
  };

  const rows = [
    `<tr><td>Google search</td>${fmtCells(0.3, 0.3 * gridG / 1000, null)}<td>~0.3 Wh per search (de Vries 2023), since disputed as an overestimate. Baseline for comparison.</td><td>${srcCell('devries')}</td></tr>`,
    `<tr><td>ChatGPT query (current era)</td>${fmtCells(0.31, 0.31 * gridG / 1000, null)}<td>~0.31 Wh per query (median, Joule 2026 peer-reviewed; IQR 0.16-0.60). The widely-cited ~2.9 Wh figure (2023) is now considered an overestimate; Altman counter-claim ~0.34 Wh.</td><td>${srcCell('jouleInference')}</td></tr>`,
    `<tr><td>Ecosia search</td>${fmtCells(null, 0.2, null)}<td>Ecosia's own operational estimate ~0.2 g CO2e/search; independent app-level tests (Greenspector, Bangor Univ.) put it ~0.055 g — ~69% lower than Google (~0.178 g). No official energy or cost figure; runs on renewables (~2x the energy its searches use).</td><td>${srcCell('ecosiaPerQuery')} · ${srcCell('ecosiaOwnCo2')} · ${srcCell('greenspector')} · ${srcCell('bangorSearch')}</td></tr>`,
    `<tr><td>Ecosia AI (chat / overviews)</td><td colspan="3" class="nofig">No per-query figure published — Ecosia estimates AI adds ~5% to its footprint (~5.1 t on the ~102 t base); uses smaller, efficient models via a European provider; optional and switchable off.</td><td>${srcCell('ecosiaAi')} · ${srcCell('ecosiaAiFree')}</td></tr>`,
    `<tr><td>AI image generation</td>${fmtCells(2.9, 2.9 * gridG / 1000, 0.04)}<td>~2.9 Wh/image (Power Hungry). Cost = GPT Image 1 medium tier.</td><td>${srcCell('powerHungry')} · ${srcCell('gptImagePrice')}</td></tr>`,
    `<tr><td>AI video clip (~5-8 s)</td>${fmtCells(90, 90 * gridG / 1000, 1.0)}<td>~90 Wh/clip (WAN2.1, 81 frames). ~30x image generation. Cost = mid-range API estimate.</td><td>${srcCell('videoEnergy')} · ${srcCell('videoPrice')}</td></tr>`,
  ].join('');
  $('compareBody').innerHTML = rows;

  const footnote = $('compareFoot');
  if (footnote) {
    footnote.innerHTML = '— in the Energy/Cost columns for Ecosia = no official per-query figure published. Ecosia\'s CO2e is its own operational estimate (~0.2 g/search); independent app-level tests (Greenspector, Bangor Univ.) put it at ~0.055 g/search.';
  }

  const ecosiaNotes = [
    { text: 'Ecosia is a B-Corp search engine that funds tree planting from profits; it claims to produce about twice as much renewable energy as its searches use.', sources: ['ecosiaHome'] },
    { text: 'Ecosia claims each search "removes 1 kg of CO2" through tree-planting profits (Regeneration Report).', sources: ['ecosiaRegen'] },
    { text: 'AI Overviews + AI Chat launched December 2025; both optional and switchable off.', sources: ['ecosiaAi', 'ecosiaAiFree'] },
    { text: 'Ecosia selects and tracks models with the AI Energy Score (Hugging Face) and Ecologits; it avoids video generation and uses smaller models, so its AI footprint is far below mainstream alternatives.', sources: ['ecosiaAi', 'ecosiaAiImproved'] },
    { text: 'Ecosia publishes aggregate totals (~102 t CO2/yr) but no per-query energy or CO2 figure for search or AI; fact-checkers call for per-query disclosure.', sources: ['ecosiaFactCheck'] },
  ];
  $('ecosiaNotes').innerHTML = noteListHtml(ecosiaNotes);

  const refs = [
    { label: 'Google search (de Vries 2023)', value: 0.3, unit: 'Wh', source: 'devries' },
    { label: 'ChatGPT query (Joule 2026, median)', value: 0.31, unit: 'Wh', source: 'jouleInference' },
    { label: 'ChatGPT query (IEA via SBS, 2024 — historical)', value: 2.9, unit: 'Wh', source: 'sbsNews' },
    { label: 'ChatGPT query (OpenAI/Altman, 2025)', value: 0.34, unit: 'Wh', source: 'sbsNews' },
    { label: 'AI image vs text classification (UNU-INWEH 2026)', value: 1450, unit: 'x', source: 'unricAi' },
    { label: 'AI image water footprint (UNU-INWEH 2026)', value: 29, unit: 'ml', source: 'unricAi' },
  ];
  $('compareHeadlineBody').innerHTML = refs
    .map((h) => {
      const s = sourceById(h.source);
      return `<tr><td>${h.label}</td><td>${h.value} ${h.unit}</td><td><a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a></td></tr>`;
    })
    .join('');
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
        (s) => `<li><a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a> — ${s.ref}.${s.accessed ? ` Accessed ${s.accessed}.` : ''} ${s.note}</li>`
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
  const pue = 1.35;
  const gridG = currentGrid().gCO2ePerKWh;

  const html = `
    <p class="hint" style="margin-bottom:12px;">Every figure on this page is derived from the same four formulas, each traced to its source. Interactive example in the <a href="#" data-goto="tab-calculator">Calculator tab</a>.</p>
    <div class="method-grid">
      <div class="method">
        <h3>⚡ Energy</h3>
        <p><code>Wh = (promptTok × J/input + outTok × J/output) × PUE ÷ 3600</code></p>
        <p class="hint">Per-token joules are scenario assumptions informed by measured inference benchmarks; the default is calibrated against the peer-reviewed ${src('jouleInference')} median. PUE overhead ${pue}× is an adjustable assumption.</p>
      </div>
      <div class="method">
        <h3>🌡️ CO2</h3>
        <p><code>g CO2e = kWh × ${gridG} g/kWh</code></p>
        <p class="hint">Selected grid: ${DATA.gridIntensity.label}, ~${gridG} g CO2e/kWh (${src(DATA.gridIntensity.source)}). Multiply energy by grid carbon intensity; the real value depends on grid mix and time of day.</p>
      </div>
      <div class="method">
        <h3>💧 Water</h3>
        <p><code>ml = kWh × ${wueTotal} L/kWh × 1000</code></p>
        <p class="hint">Primary estimate uses direct WUE ${wm.wueLPerKWh} L/kWh (${src('eesiWater')}) plus ${wm.indirectLPerKWh} L/kWh indirect electricity water (${src('cellReports')}). The source-WUE framework and its regional limits are described by ${src('npjWater')}. Published prompt-level figures such as 519 ml are shown separately because their system boundaries differ.</p>
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
  $('macroNotes').innerHTML = noteListHtml(DATA.macro.macroNotes || []);
}

function renderRightToolForTask() {
  const costLabels = ['Near-zero', 'Low', 'Moderate', 'High'];
  const rows = DATA.rightToolForTask
    .map((t) => {
      const dots = [0, 1, 2].map((i) => `<i class="dot ${i < t.cost ? 'on' : ''}"></i>`).join('');
      return `<tr>
        <td><strong>${t.task}</strong></td>
        <td><span class="pill">${t.best}</span></td>
        <td><span class="cost-dots" title="${costLabels[t.cost]} resource use">${dots}</span><span class="cost-lbl">${costLabels[t.cost]}</span></td>
        <td class="why">${t.why}</td>
      </tr>`;
    })
    .join('');
  $('toolBody').innerHTML = rows;
}

function renderAuContext() {
  $('auNotes').innerHTML = noteListHtml(DATA.auContext.notes || []);
  const synthesis = DATA.macro.synthesis;
  const sourceLinks = (ids) => (ids || [])
    .map((id) => {
      const s = sourceById(id);
      return s ? `<a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a>` : '';
    })
    .filter(Boolean)
    .join(' · ');
  $('synthesisCards').innerHTML = (synthesis.cards || []).map((c) => `
    <div class="synthesis-card">
      <div class="value">${c.value}</div>
      <h3>${c.title}</h3>
      <p>${c.text}</p>
      <p style="margin-top:8px;">${sourceLinks(c.sources)}</p>
    </div>`).join('');
  $('synthesisTakeaway').textContent = synthesis.takeaway || '';
  $('synthesisNote').innerHTML = noteListHtml([{ text: 'Detailed evidence and financing context:', sources: synthesis.sources }]);
  const buildOutNotes = [
    { text: 'Announced pipeline: ~21.6 GW (Data Centres Australia / DC Byte). Not directly comparable to operational capacity — most announced projects never get built.', sources: ['dcByte'] },
    { text: 'AEMO disclosed 5.4 GW across 11 projects in its transmission connection queue (June 2026) — connection interest, not committed builds (~60% NSW / 40% VIC).', sources: ['aemoDc'] },
    { text: 'CommBank estimates a ~6 GW potential pipeline worth ~$150B by 2030, roughly 4x end-2025 operational capacity.', sources: ['commbankDc'] },
    { text: 'Phantom demand: NSW has 11.4 GW in the development pipeline but only ~1.2 GW expected online by 2030; VIC 9 GW vs ~0.7 GW (Climate Council).', sources: ['climateCouncil'] },
  ];
  $('auBuildOutNotes').innerHTML = noteListHtml(buildOutNotes);
  buildAuPipelineChart();
}

function noteListHtml(notes) {
  const html = (notes || [])
    .map((n) => {
      const text = typeof n === 'string' ? n : n.text;
      const links = (typeof n === 'object' && n.sources ? n.sources : [])
        .map((id) => {
          const s = sourceById(id);
          return s ? `<a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a>` : '';
        })
        .filter(Boolean)
        .join(' · ');
      return `<li>${text}${links ? `<span class="note-src">${links}</span>` : ''}</li>`;
    })
    .join('');
  return `<ul>${html}</ul>`;
}

function buildAuPipelineChart() {
  const labels = ['2025', '2026', '2027', '2028', '2029', '2030'];
  const values = [1.4, null, null, null, null, 3.2];
  svgLineChart('auPipelineChart', labels, [
    { label: 'Operational data-centre capacity (GW)', color: '#5b8ff9', data: values },
  ]);
}

function buildTrainingChart() {
  const host = $('trainingChart');
  if (!host) return;
  host.innerHTML = '';
  const W = 560, H = 250;
  const padL = 190, padR = 14, padT = 16, padB = 34;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  const gridG = currentGrid().gCO2ePerKWh;
  const r = compute(DATA.models[0], 200, 400, 1, gridG, 1.35).perQuery;
  const queryG = r.gCO2e;
  const yearG = queryG * 30 * 365;
  const trainG = 284e6;
  const embodiedG = trainG * 0.2;

  const bars = [
    { label: 'A single query', v: queryG, color: '#5b8ff9' },
    { label: 'Your AI use (30/day, 1 yr)', v: yearG, color: '#84a98c' },
    { label: 'Embodied (manufacture) share', v: embodiedG, color: '#7c5cd6' },
    { label: 'Training one large model', v: trainG, color: '#f28482' },
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
  $('staticExamples').innerHTML = `<div style="overflow-x:auto;"><table>
    <thead><tr><th>#</th><th>Example</th><th>Model</th><th>Energy</th><th>CO2e</th><th>Water</th><th>Cost</th><th>≈ Everyday equivalent</th><th>Note &amp; sources</th></tr></thead>
    <tbody>${summary}</tbody>
  </table></div>`;

  const wueTotal = totalWue();

  const refCards = (DATA.referenceCards || [])
    .map((c) => {
      const s = sourceById(c.source);
      return `<div class="metric"><div class="v">${c.value}</div><div class="u">${c.label}${s ? ` · <a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a>` : ''}</div></div>`;
    })
    .join('');
  const wueCard = `<div class="metric"><div class="v" id="wueValue">${wueTotal} L/kWh</div><div class="u">avg data-centre WUE (direct + indirect)${wueSourceLink('cellReports')}</div></div>`;
  $('referenceCards').innerHTML = refCards + wueCard;
  $('glossary').innerHTML = '<strong>Abbreviations:</strong> CO2e = CO2-equivalent greenhouse gases · WUE = water used per unit of electricity (L/kWh) · Mt = million tonnes · B L = billion litres · Wh/g/ml/USD = per-query units.';

  const trainCards = (DATA.trainingEmbodied || [])
    .map((c) => {
      const s = sourceById(c.source);
      return `<div class="metric"><div class="v">${c.value}</div><div class="u">${c.label}${s ? ` · <a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a>` : ''}</div></div>`;
    })
    .join('');
  $('trainingCards').innerHTML = trainCards;
  buildTrainingChart();
  renderEverydayTable(gridG);
}

function renderEverydayTable(gridG) {
  const pue = 1.35;
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
  const srcLink = (id) => {
    const s = sourceById(id);
    return s ? `<a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a>` : '';
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
    return `<tr><td><strong>${r.thing}</strong><br><span class="hint">${r.footprint} · ${srcLink(r.source)}</span></td><td class="why">${ai}</td></tr>`;
  }).join('');
}

function wueSourceLink(id) {
  const s = sourceById(id);
  return s ? ` · <a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a>` : '';
}

function currentInputs() {
  const model = modelById($('modelSelect').value);
  const promptTok = parseInt($('promptSlider').value, 10);
  const outTok = parseInt($('outSlider').value, 10);
  const queriesPerDay = parseInt($('queriesSlider').value, 10);
  const gridG = currentGrid().gCO2ePerKWh;
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

  $('gridHint').innerHTML = `Selected grid: ${DATA.gridIntensity.label}, ~${gridG} g CO2e/kWh (${src(DATA.gridIntensity.source)}).`;
  bindText('pueLabel', `PUE: ${pue.toFixed(2)}`);
  bindText('promptLabel', `Prompt tokens: ${promptTok.toLocaleString()}`);
  bindText('outLabel', `Output tokens: ${outTok.toLocaleString()}`);
  bindText('queriesLabel', `Queries / day: ${queriesPerDay.toLocaleString()}`);
  $('modelSelect').title = model.energyNote;

  renderAggTable(r);
  renderEquivalents(r.energyWh.monthly, r.co2G.monthly);
}

function populateGridSelects() {
  const opts = DATA.grids.map((g) => `<option value="${g.id}">${g.label.replace(/\s*\(avg\)/i, '')} (~${g.gCO2ePerKWh} g/kWh)</option>`).join('');
  $('gridSelect').innerHTML = opts;
  $('gridSelectExamples').innerHTML = opts;
  $('gridSelect').value = DATA.gridIntensity.id;
  $('gridSelectExamples').value = DATA.gridIntensity.id;
}

function onGridChange(event) {
  const id = event?.target?.value || $('gridSelect').value;
  const g = DATA.grids.find((x) => x.id === id) || DATA.grids[0];
  DATA.gridIntensity = g;
  $('gridSelect').value = g.id;
  $('gridSelectExamples').value = g.id;
  render();
  buildEnergyChart();
  buildCostChart();
  renderStaticExamples();
  buildExamplesScatter($('scatterMetric').value);
  renderMethodology();
  renderCompareTab();
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
  $('scatterMetric').addEventListener('change', () => {
    buildExamplesScatter($('scatterMetric').value);
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
  const vb = $('versionBadge');
  if (vb && typeof VERSION !== 'undefined') {
    vb.textContent = `Version ${VERSION}`;
    vb.title = `Dashboard version ${VERSION}`;
  }
  const modelSel = $('modelSelect');
  modelSel.innerHTML = DATA.models
    .map((m) => `<option value="${m.id}">${m.name} (${m.provider}) · ${m.tier}</option>`)
    .join('');

  const qtSel = $('queryType');
  qtSel.innerHTML = DATA.queryTypes
    .map((q) => `<option value="${q.id}">${q.label}</option>`)
    .join('');

  populateGridSelects();
  bindTabs();
  bindControls();
  render();
  buildEnergyChart();
  buildCostChart();
  buildMacroChart();
  buildMacroWaterChart();
  renderMacroWaterNotes();
  renderSources();
  renderMethodology();
  renderMacroNotes();
  renderRightToolForTask();
  renderAuContext();
  renderStaticExamples();
  buildExamplesScatter();
  renderCompareTab();
});
