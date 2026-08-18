// Pure computation layer — no DOM access. Depends only on DATA (data.js),
// EXAMPLES (examples.js) and SOURCES (data.js). Load order: data.js →
// examples.js → model.js → format.js → app.js.

const modelById = (id) => DATA.models.find((m) => m.id === id);
const sourceById = (id) => SOURCES[id];
const src = (id) => {
  const s = sourceById(id);
  return s ? `<a href="${srcHref(s)}" target="_blank" rel="noopener">${s.label}</a>` : id;
};

// Combined water-use efficiency: direct cooling + indirect (electricity-embedded) water.
const totalWue = () => DATA.waterModel.wueLPerKWh + (DATA.waterModel.indirectLPerKWh || 0);

// The grid intensity the dashboard currently computes with.
// NOTE: onGridChange() mutates DATA.gridIntensity directly; access is
// centralised here so a future refactor can move the state out of DATA.
const currentGrid = () => DATA.gridIntensity;

function compute(model, promptTok, outTok, queriesPerDay, gridG, pue) {
  const jIn = promptTok * model.jPerInTok;
  const jOut = outTok * model.jPerOutTok;
  const joules = (jIn + jOut) * pue;
  const wh = joules / 3600;
  const kWh = wh / 1000;
  const gCO2e = kWh * gridG;
  const costUsd =
    (promptTok / 1e6) * model.priceInUsdPer1M + (outTok / 1e6) * model.priceOutUsdPer1M;
  const wue = totalWue();
  // Primary water estimate uses source WUE only. Published prompt-level
  // estimates use different system boundaries and remain reference figures.
  const waterMl = kWh * wue * 1000;
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

function exampleResult(ex, gridG, pue) {
  if (ex.fixedWh != null) {
    const wm = DATA.waterModel;
    const wh = ex.fixedWh;
    const gCO2e = ex.fixedCo2G != null ? ex.fixedCo2G : wh * (gridG / 1000);
    const baseline = ex.fixedBaselineMl != null ? ex.fixedBaselineMl : 0;
    const wue = totalWue();
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