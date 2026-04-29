// =========================
// Constantes e IDs del DOM
// =========================
const INPUT_IDS = {
  supportAHeight: "consolaA",
  supportBHeight: "consolaB",
  distanceL1: "l1",
  distanceL2: "l2",
};

const OUTPUT_IDS = {
  resultPanel: "resultado",
  angleLabel: "yDegText",
  svgRoot: "nivelSvg",
};

const SVG_GEOMETRY = {
  dimensionLineY: 32,
  dimensionTextY: 15,
  levelOriginX: 125,
  levelOriginY: 130.5,
  lineStartX: 125,
  lineEndX: 600,
  supportTopY: 210,
  supportA_X: 316,
  supportB_X: 507,
  deckX: 247,
  deckWidth: 329,
};

const SVG_VISUAL = {
  projectionAngleDefaultDeg: 8,
  projectionAngleWhenBLowerDeg: 6,
  arrowTipHeight: 8,
};

const MM_INPUT_ORDER = Object.values(INPUT_IDS);

function getEl(id) {
  return document.getElementById(id);
}

// =========================
// Formateo y parseo
// =========================
function parseMillimeters(rawValue) {
  if (rawValue == null || String(rawValue).trim() === "") return NaN;
  const normalized = String(rawValue)
    .replace(/mm/gi, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .trim();
  if (normalized === "") return NaN;
  return parseFloat(normalized);
}

function formatMillimetersForInput(value) {
  const numericValue = typeof value === "number" ? value : parseMillimeters(value);
  if (numericValue === null || Number.isNaN(numericValue)) return "0 mm";
  const rounded = Math.round(numericValue * 1000) / 1000;
  let text = String(rounded);
  if (text.includes(".")) text = text.replace(/\.?0+$/, "");
  return `${text} mm`;
}

function formatDecimalEs(value, decimals) {
  const fixed = Number(value).toFixed(decimals);
  const normalized = decimals > 0 && /^-?\d+\.0+$/.test(fixed)
    ? String(Math.trunc(Number(fixed)))
    : fixed;
  return normalized.replace(".", ",");
}

// =========================
// Inputs
// =========================
function handleMillimeterInputFocus(inputElement) {
  const numericValue = parseMillimeters(inputElement.value);
  inputElement.value = Number.isNaN(numericValue) ? "" : String(numericValue);
}

function handleMillimeterInputBlur(inputElement) {
  const numericValue = parseMillimeters(inputElement.value);
  inputElement.value = formatMillimetersForInput(Number.isNaN(numericValue) ? 0 : numericValue);
}

function bindMillimeterInputs() {
  MM_INPUT_ORDER.forEach((inputId) => {
    const input = getEl(inputId);
    if (!input) return;
    input.addEventListener("focus", () => handleMillimeterInputFocus(input));
    input.addEventListener("blur", () => handleMillimeterInputBlur(input));
  });
}

function readCalculationInputs() {
  return {
    heightA: parseMillimeters(getEl(INPUT_IDS.supportAHeight).value),
    heightB: parseMillimeters(getEl(INPUT_IDS.supportBHeight).value),
    L1: parseMillimeters(getEl(INPUT_IDS.distanceL1).value),
    L2: parseMillimeters(getEl(INPUT_IDS.distanceL2).value),
  };
}

function normalizeInputDisplayValues() {
  MM_INPUT_ORDER.forEach((inputId) => {
    const input = getEl(inputId);
    input.value = formatMillimetersForInput(parseMillimeters(input.value));
  });
}

// =========================
// Cálculo
// =========================
function validateCalculationInput(data) {
  if (
    Number.isNaN(data.heightA) ||
    Number.isNaN(data.heightB) ||
    Number.isNaN(data.L1) ||
    Number.isNaN(data.L2)
  ) {
    return "Completa todos los campos con valores válidos";
  }

  if (data.L1 <= 0 || data.L2 <= 0) {
    return "L1 y L2 deben ser mayores que 0";
  }

  if (data.L2 - data.L1 === 0) {
    return "L1 y L2 no pueden ser iguales (ΔL = 0)";
  }

  return null;
}

function computeLevelingResult(data) {
  const deltaHeight = data.heightB - data.heightA;
  const deltaDistance = data.L2 - data.L1;
  const slope = deltaHeight / deltaDistance;
  const angleDeg = Math.atan(slope) * (180 / Math.PI);
  const xGap = slope * data.L1;
  const yGap = slope * data.L2;

  return {
    deltaHeight,
    deltaDistance,
    slope,
    angleDeg,
    xGap,
    yGap,
  };
}

function getDirectionAndColor(deltaHeight) {
  if (deltaHeight === 0) return { text: "Nivelado", color: "#2c3e50" };
  if (deltaHeight > 0) return { text: "Girar a la derecha", color: "#e74c3c" };
  return { text: "Girar a la izquierda", color: "#2ecc71" };
}

// =========================
// Render resultado textual
// =========================
function renderCalculationSummary(result) {
  const direction = getDirectionAndColor(result.deltaHeight);
  const html = `
  <div style="font-size:22px; font-weight:bold; color:${direction.color};">
    ${direction.text}
  </div>
  <br>
  <strong>Ángulo:</strong> ${formatDecimalEs(Math.abs(result.angleDeg), 1)}° <br>
  <strong>Δh:</strong> ${formatDecimalEs(Math.abs(result.deltaHeight), 1)} mm <br>
  <strong>Pendiente:</strong> ${formatDecimalEs(Math.abs(result.slope) * 100, 1)} % <br>
  <strong>x:</strong> ${formatDecimalEs(Math.abs(result.xGap), 2)} mm <br>
  <strong>y:</strong> ${formatDecimalEs(Math.abs(result.yGap), 2)} mm
`;

  getEl(OUTPUT_IDS.resultPanel).innerHTML = html;
  getEl(OUTPUT_IDS.angleLabel).textContent = `β: ${formatDecimalEs(Math.abs(result.angleDeg), 1)}°`;
}

// =========================
// Render SVG
// =========================
function updateDiagram(heightA, heightB, l1Mm, l2Mm, showProjection = true) {
  const g = SVG_GEOMETRY;
  const deckRect = getEl("deckRect");

  if (deckRect) {
    deckRect.setAttribute("x", String(g.deckX));
    deckRect.setAttribute("width", String(g.deckWidth));
  }

  const projectionSlope = getProjectionSlope(heightA, heightB);
  const lineYAt = (x) => g.levelOriginY + projectionSlope * (x - g.levelOriginX);
  const lineYAtSupportA = lineYAt(g.supportA_X);
  const lineYAtSupportB = lineYAt(g.supportB_X);
  const lineYAtRight = lineYAt(g.lineEndX);

  const projectionLine = getEl("lineReal");
  projectionLine.setAttribute("x1", g.lineStartX.toString());
  projectionLine.setAttribute("y1", g.levelOriginY.toString());
  projectionLine.setAttribute("x2", g.lineEndX.toString());
  projectionLine.setAttribute("y2", lineYAtRight.toFixed(1));
  projectionLine.style.opacity = showProjection ? "1" : "0";

  getEl("lineY0").setAttribute("x2", g.lineEndX.toString());

  updateL1Dimension(g.levelOriginX, g.supportA_X, l1Mm, g.levelOriginY, g.supportTopY);
  updateL2Dimension(g.supportA_X, g.supportB_X, l2Mm, g.supportTopY);

  placeSupportBlock("sra", g.supportA_X, g.supportTopY);
  placeSupportBlock("srd", g.supportB_X, g.supportTopY);

  setSupportMeasurement(
    "sra",
    g.supportA_X,
    g.supportTopY,
    lineYAtSupportA,
    heightA,
    "x",
    g.levelOriginY,
    showProjection
  );
  setSupportMeasurement(
    "srd",
    g.supportB_X,
    g.supportTopY,
    lineYAtSupportB,
    heightB,
    "y",
    g.levelOriginY,
    showProjection
  );

  updateResponsiveViewBox(g);
}

function getProjectionSlope(heightA, heightB) {
  const direction = heightB > heightA ? -1 : heightB < heightA ? 1 : 0;
  if (direction === 0) return 0;

  const angleDeg =
    heightB < heightA
      ? SVG_VISUAL.projectionAngleWhenBLowerDeg
      : SVG_VISUAL.projectionAngleDefaultDeg;

  const absoluteSlope = Math.tan((angleDeg * Math.PI) / 180);
  return direction * absoluteSlope;
}

function updateResponsiveViewBox(geometry) {
  const svg = getEl(OUTPUT_IDS.svgRoot);
  if (!svg) return;

  const boxHalfWidth = 45;
  const width = Math.ceil(
    Math.max(
      620,
      geometry.lineEndX + 24,
      geometry.supportB_X + boxHalfWidth + 40,
      geometry.supportB_X + boxHalfWidth + 72
    )
  );

  svg.setAttribute("viewBox", `0 0 ${width} 300`);
}

function updateL1Dimension(xLeft, xRight, l1Mm, yReferenceLine, ySupportTop) {
  const y = SVG_GEOMETRY.dimensionLineY;
  getEl("l1TickLeft").setAttribute("x1", xLeft.toString());
  getEl("l1TickLeft").setAttribute("y1", String(y));
  getEl("l1TickLeft").setAttribute("x2", xLeft.toString());
  getEl("l1TickLeft").setAttribute("y2", String(yReferenceLine));

  getEl("l1TickRight").setAttribute("x1", xRight.toString());
  getEl("l1TickRight").setAttribute("y1", String(y));
  getEl("l1TickRight").setAttribute("x2", xRight.toString());
  getEl("l1TickRight").setAttribute("y2", String(ySupportTop));

  getEl("l1Top").setAttribute("x1", xLeft.toString());
  getEl("l1Top").setAttribute("x2", xRight.toString());
  getEl("l1Top").setAttribute("y1", String(y));
  getEl("l1Top").setAttribute("y2", String(y));

  getEl("l1ArrowLeft").setAttribute(
    "points",
    `${xLeft},${y} ${xLeft + 8},${y - 4} ${xLeft + 8},${y + 4}`
  );
  getEl("l1ArrowRight").setAttribute(
    "points",
    `${xRight},${y} ${xRight - 8},${y - 4} ${xRight - 8},${y + 4}`
  );

  const midpoint = (xLeft + xRight) / 2;
  getEl("l1Text").setAttribute("x", midpoint.toFixed(1));
  getEl("l1Text").setAttribute("y", String(SVG_GEOMETRY.dimensionTextY));
  getEl("l1Text").textContent = `L1 ${l1Mm.toFixed(0)} mm`;
}

function updateL2Dimension(xLeft, xRight, l2Mm, ySupportTop) {
  const y = SVG_GEOMETRY.dimensionLineY;
  getEl("distLeft").setAttribute("x1", xLeft.toString());
  getEl("distLeft").setAttribute("y1", String(y));
  getEl("distLeft").setAttribute("x2", xLeft.toString());
  getEl("distLeft").setAttribute("y2", String(ySupportTop));

  getEl("distRight").setAttribute("x1", xRight.toString());
  getEl("distRight").setAttribute("y1", String(y));
  getEl("distRight").setAttribute("x2", xRight.toString());
  getEl("distRight").setAttribute("y2", String(ySupportTop));

  getEl("distTop").setAttribute("x1", xLeft.toString());
  getEl("distTop").setAttribute("x2", xRight.toString());
  getEl("distTop").setAttribute("y1", String(y));
  getEl("distTop").setAttribute("y2", String(y));

  getEl("distArrowLeft").setAttribute(
    "points",
    `${xLeft},${y} ${xLeft + 8},${y - 4} ${xLeft + 8},${y + 4}`
  );
  getEl("distArrowRight").setAttribute(
    "points",
    `${xRight},${y} ${xRight - 8},${y - 4} ${xRight - 8},${y + 4}`
  );

  const midpoint = (xLeft + xRight) / 2;
  getEl("distText").setAttribute("x", midpoint.toFixed(1));
  getEl("distText").setAttribute("y", String(SVG_GEOMETRY.dimensionTextY));
  getEl("distText").textContent = `L2 ${l2Mm.toFixed(0)} mm`;
  getEl("distText").setAttribute("fill", "#ffffff");
}

function placeSupportBlock(prefix, centerX, topY) {
  const halfWidth = 45;
  const width = 90;
  const height = 34;
  const rectX = centerX - halfWidth;
  const labelY = topY + height / 2;
  const rect = getEl(`${prefix}Rect`);
  const label = getEl(`${prefix}Label`);
  if (!rect || !label) return;

  rect.setAttribute("x", rectX.toFixed(1));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  label.setAttribute("x", centerX.toFixed(1));
  label.setAttribute("y", String(labelY));
}

function setSupportMeasurement(
  prefix,
  x,
  yTop,
  yLine,
  valueMm,
  variableLabel,
  yParallelLine,
  showVariableLabel = true
) {
  const tipDy = SVG_VISUAL.arrowTipHeight;

  getEl(`${prefix}Arrow`).setAttribute("x1", x.toFixed(1));
  getEl(`${prefix}Arrow`).setAttribute("x2", x.toFixed(1));
  getEl(`${prefix}Arrow`).setAttribute("y1", yLine.toFixed(1));
  getEl(`${prefix}Arrow`).setAttribute("y2", yTop.toString());

  getEl(`${prefix}Tip`).setAttribute(
    "points",
    `${x},${yLine.toFixed(1)} ${x - 6},${(yLine + tipDy).toFixed(1)} ${x + 6},${(yLine + tipDy).toFixed(1)}`
  );

  getEl(`${prefix}Text`).setAttribute("x", (x + 10).toString());
  getEl(`${prefix}Text`).setAttribute("y", ((yLine + yTop) / 2).toFixed(1));
  getEl(`${prefix}Text`).textContent = `${formatDecimalEs(valueMm, 0)} mm`;

  const variableText = getEl(`${prefix}VarText`);
  if (!variableText) return;
  let variableLabelYOffset = 0;
  if (yLine < yParallelLine) {
    // Proyectada por encima de la paralela: bajar ambas 10 px.
    variableLabelYOffset = 10;
  } else if (yLine > yParallelLine) {
    // Proyectada por debajo de la paralela:
    // x baja 10 px y y baja 5 px.
    variableLabelYOffset = variableLabel === "x" ? 10 : 5;
  }
  variableText.setAttribute("x", (x + 10).toString());
  variableText.setAttribute(
    "y",
    ((yLine + yParallelLine) / 2 - 4 + variableLabelYOffset).toFixed(1)
  );
  variableText.textContent = variableLabel;
  variableText.style.opacity = showVariableLabel ? "1" : "0";
}

// =========================
// Flujo principal
// =========================
function runLevelingCalculation() {
  const inputData = readCalculationInputs();
  const validationError = validateCalculationInput(inputData);
  if (validationError) {
    alert(validationError);
    return;
  }

  const result = computeLevelingResult(inputData);
  renderCalculationSummary(result);
  normalizeInputDisplayValues();
  updateDiagram(inputData.heightA, inputData.heightB, inputData.L1, inputData.L2, true);
}

// Mantener compatibilidad con el onclick del HTML.
function calcular() {
  runLevelingCalculation();
}

getEl(OUTPUT_IDS.angleLabel).textContent = "β: 0°";
bindMillimeterInputs();
updateDiagram(0, 0, 0, 0, false);
