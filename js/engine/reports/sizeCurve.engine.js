import { dataStore } from "../../store/data.store.js";
import { computedStore } from "../../store/computed.store.js";

const SIZE_ORDER = [
  "FS","XS","S","M","L","XL","XXL",
  "3XL","4XL","5XL","6XL",
  "7XL","8XL","9XL","10XL"
];

function getTotalSaleDays() {
  return dataStore.saleDays.reduce((sum, r) => {
    return sum + Number(r.Days || 0);
  }, 0);
}

function getStyleMeta(styleId) {
  const row = dataStore.styleStatus.find(
    r => r["Style ID"] === styleId
  );
  return {
    category: row?.Category || "",
    remark: row?.["Company Remark"] || ""
  };
}

function getStock(styleId, mode) {

  return dataStore.stock
    .filter(r =>
      r["Style ID"] === styleId &&
      (mode === "total"
        ? true
        : r.FC === "SELLER")
    )
    .reduce((sum, r) => sum + Number(r.Units || 0), 0);
}

function getProduction(styleId) {
  return dataStore.production
    .filter(r => r["Uniware SKU"])
    .filter(r => {
      const sku = r["Uniware SKU"];
      const stockRow = dataStore.stock.find(
        s => s["Uniware SKU"] === sku &&
             s["Style ID"] === styleId
      );
      return !!stockRow;
    })
    .reduce((sum, r) => sum + Number(r["In Production"] || 0), 0);
}

export function buildSizeCurve(
  selectedDays = 45,
  stockMode = "total",
  demandBasis = "pending"
) {

  const totalSaleDays = getTotalSaleDays();

  if (!totalSaleDays) {
    computedStore.reports.sizeCurve = { rows: [] };
    return;
  }

  const styleSet = new Set(
    dataStore.sales.map(r => r["Style ID"])
  );

  const rows = [];

  styleSet.forEach(styleId => {

    const meta = getStyleMeta(styleId);

    const styleSalesRows = dataStore.sales.filter(
      r => r["Style ID"] === styleId
    );

    const totalUnits = styleSalesRows.reduce(
      (sum, r) => sum + Number(r.Units || 0),
      0
    );

    if (!totalUnits) return;

    const drr = totalUnits / totalSaleDays;

    const required = drr * selectedDays;

    const stock = getStock(styleId, stockMode);

    let direct = required - stock;
    if (direct < 0) direct = 0;

    const production = getProduction(styleId);

    let pending = direct - production;
    if (pending < 0) pending = 0;

    let styleDemand = 0;

    if (demandBasis === "required")
      styleDemand = required;
    else if (demandBasis === "direct")
      styleDemand = direct;
    else
      styleDemand = pending;

    const sizeSales = {};

    SIZE_ORDER.forEach(size => {
      sizeSales[size] = 0;
    });

    styleSalesRows.forEach(r => {
      const size = r.Size || "FS";
      if (!sizeSales[size]) sizeSales[size] = 0;
      sizeSales[size] += Number(r.Units || 0);
    });

    const sizes = {};

    SIZE_ORDER.forEach(size => {
      const share = sizeSales[size] / totalUnits;
      sizes[size] = Math.round(styleDemand * share);
    });

    rows.push({
      styleId,
      category: meta.category,
      remark: meta.remark,
      styleDemand: Math.round(styleDemand),
      sizes
    });

  });

  rows.sort((a, b) => b.styleDemand - a.styleDemand);

  computedStore.reports.sizeCurve = {
    rows,
    selectedDays,
    stockMode,
    demandBasis
  };
}
