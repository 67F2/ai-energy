// Pure computation layer — no DOM access. Depends only on DATA (data.js),
// EXAMPLES (examples.js) and SOURCES (data.js). Load order: data.js →
// examples.js → model.js → format.js → app.js.

const modelById = (id) => DATA.models.find((m) => m.id === id);
const sourceById = (id) => SOURCES[id];

// Direct WUE uses IT energy; electricity-related water uses facility energy.
function waterUseMl(itWh, facilityWh, directLPerKWh = DATA.waterModel.wueLPerKWh, indirectLPerKWh = DATA.waterModel.indirectLPerKWh) {
  return itWh * directLPerKWh + facilityWh * indirectLPerKWh;
}

function profileIncludesPue(profile, band) {
  return typeof profile.pueIncluded === 'object' ? profile.pueIncluded[band] : profile.pueIncluded;
}

// The grid intensity the dashboard currently computes with.
// NOTE: onGridChange() mutates DATA.gridIntensity directly; access is
// centralised here so a future refactor can move the state out of DATA.
const currentGrid = () => DATA.gridIntensity;
const profileById = (id) => DATA.taskProfiles.find((p) => p.id === id);

// Main-page energy and carbon preserve each study's published boundary. Water
// uses pueIncluded metadata to separate IT and facility energy without changing
// the displayed study value.
function estimateProfile(profile, usesPerDay, gridG, pue = DATA.defaultPue) {
  const convert = (wh, band) => {
    const includesPue = profileIncludesPue(profile, band);
    const itWh = includesPue ? wh / pue : wh;
    const facilityWh = includesPue ? wh : wh * pue;
    return {
      energyWh: wh,
      co2G: (wh / 1000) * gridG,
      waterMl: waterUseMl(itWh, facilityWh),
    };
  };
  const perUse = {
    low: convert(profile.energyWh.low, 'low'),
    typical: convert(profile.energyWh.typical, 'typical'),
    high: convert(profile.energyWh.high, 'high'),
  };
  const scale = (period) => ({
    low: {
      energyWh: perUse.low.energyWh * period,
      co2G: perUse.low.co2G * period,
      waterMl: perUse.low.waterMl * period,
    },
    typical: {
      energyWh: perUse.typical.energyWh * period,
      co2G: perUse.typical.co2G * period,
      waterMl: perUse.typical.waterMl * period,
    },
    high: {
      energyWh: perUse.high.energyWh * period,
      co2G: perUse.high.co2G * period,
      waterMl: perUse.high.waterMl * period,
    },
  });
  return {
    profile,
    perUse,
    daily: scale(usesPerDay),
    monthly: scale(usesPerDay * 30),
    yearly: scale(usesPerDay * 365),
  };
}

function compute(model, promptTok, outTok, queriesPerDay, gridG, pue, options = {}) {
  const cacheHitRate = Math.min(1, Math.max(0, options.cacheHitRate || 0));
  const servingFactor = options.servingFactor || 1;
  const effectivePromptTok = promptTok * (1 - cacheHitRate);
  const jIn = effectivePromptTok * model.jPerInTok;
  const jOut = outTok * model.jPerOutTok;
  const itJoules = (jIn + jOut) * servingFactor;
  const facilityJoules = itJoules * pue;
  const wh = facilityJoules / 3600;
  const kWh = wh / 1000;
  const gCO2e = kWh * gridG;
  const costUsd =
    (promptTok / 1e6) * model.priceInUsdPer1M + (outTok / 1e6) * model.priceOutUsdPer1M;
  const directWue = DATA.waterModel.wueLPerKWh;
  const indirectWue = options.indirectLPerKWh == null ? DATA.waterModel.indirectLPerKWh : options.indirectLPerKWh;
  const waterMl = waterUseMl(itJoules / 3600, wh, directWue, indirectWue);
  // Accelerator-equivalent runtime is based on IT energy only. PUE represents
  // facility overhead (cooling, power distribution), not extra GPU runtime.
  const gpuSec = itJoules / model.gpuPowerW;

  const scale = (f) => ({
    perQuery: f(1),
    daily: f(queriesPerDay),
    monthly: f(queriesPerDay * 30),
    yearly: f(queriesPerDay * 365),
  });

  return {
    perQuery: { wh, gCO2e, costUsd, waterMl, gpuSec, jIn, jOut, itJoules, facilityJoules, effectivePromptTok, cacheHitRate, servingFactor, directWue, indirectWue },
    energyWh: scale((n) => wh * n),
    co2G: scale((n) => gCO2e * n),
    cost: scale((n) => costUsd * n),
    waterMl: scale((n) => waterMl * n),
    gpuSecTotal: scale((n) => gpuSec * n),
  };
}

// Query-type computation. Token presets use compute(); fixed per-inference
// presets (transcription, image gen, video) use published measurements the
// same way exampleResult() does.
function computeQueryType(model, qt, queriesPerDay, gridG, pue, options = {}) {
  if (qt.fixedWh != null) {
    const wh = qt.fixedWh;
    const gCO2e = qt.fixedCo2G != null ? qt.fixedCo2G : wh * (gridG / 1000);
    const baseline = qt.fixedBaselineMl != null ? qt.fixedBaselineMl : 0;
    const directWue = DATA.waterModel.wueLPerKWh;
    const indirectWue = options.indirectLPerKWh == null ? DATA.waterModel.indirectLPerKWh : options.indirectLPerKWh;
    const itWh = qt.pueIncluded ? wh / pue : wh;
    const facilityWh = qt.pueIncluded ? wh : wh * pue;
    const waterMl = qt.fixedWaterMl != null ? qt.fixedWaterMl : baseline + waterUseMl(itWh, facilityWh, directWue, indirectWue);
    const costUsd = qt.fixedCostUsd != null ? qt.fixedCostUsd : null;
    const scale = (f) => ({
      perQuery: f(1),
      daily: f(queriesPerDay),
      monthly: f(queriesPerDay * 30),
      yearly: f(queriesPerDay * 365),
    });
    return {
      perQuery: { wh, gCO2e, costUsd, waterMl, gpuSec: null, jIn: 0, jOut: 0 },
      energyWh: scale((n) => wh * n),
      co2G: scale((n) => gCO2e * n),
      cost: scale((n) => costUsd == null ? null : costUsd * n),
      waterMl: scale((n) => waterMl * n),
      gpuSecTotal: scale(() => null),
    };
  }
  const promptTok = options.promptTok == null ? qt.promptTok : options.promptTok;
  const outTok = options.outTok == null ? qt.outTok : options.outTok;
  return compute(model, promptTok, outTok, queriesPerDay, gridG, pue, options);
}

function exampleResult(ex, gridG, pue) {
  if (ex.fixedWh != null) {
    const wh = ex.fixedWh;
    const gCO2e = ex.fixedCo2G != null ? ex.fixedCo2G : wh * (gridG / 1000);
    const baseline = ex.fixedBaselineMl != null ? ex.fixedBaselineMl : 0;
    const itWh = ex.pueIncluded ? wh / pue : wh;
    const facilityWh = ex.pueIncluded ? wh : wh * pue;
    const waterMl = ex.fixedWaterMl != null ? ex.fixedWaterMl : baseline + waterUseMl(itWh, facilityWh);
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
