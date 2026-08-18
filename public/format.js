// Pure formatting helpers — no DOM access, no data dependencies.

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
function fmtCo2Tonne(g) {
  if (g >= 1e6) return { v: (g / 1e6).toFixed(1), u: 't CO2e' };
  if (g >= 1000) return { v: (g / 1000).toFixed(1), u: 'kg CO2e' };
  if (g >= 1) return { v: g.toFixed(2), u: 'g CO2e' };
  return { v: g.toFixed(3), u: 'g CO2e' };
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

// Source-link helpers: prefer the canonical DOI link when a source has one,
// otherwise fall back to its URL. Used by every "view source" link.
function srcHref(s) {
  return s ? (s.doi ? `https://doi.org/${s.doi}` : s.url) : '';
}

// Formal (APA-flavoured) citation text for a SOURCES entry:
//   Ref (Title), accessed YYYY-MM-DD. https://doi.org/... or https://...
// Volatile sources carry an .accessed date; everything else omits it.
function citation(s) {
  if (!s) return '';
  const ref = (s.ref || '').trim();
  const acc = s.accessed ? `, accessed ${s.accessed}` : '';
  const loc = s.doi ? `https://doi.org/${s.doi}` : (s.url || '');
  return `${ref} (${s.label})${acc}. ${loc}`;
}