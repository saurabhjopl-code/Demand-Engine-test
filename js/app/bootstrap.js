import { SHEETS } from "../config/sheet.config.js";
import { fetchCSV } from "../data/fetch.service.js";
import { parseCSV } from "../data/parser.service.js";
import { dataStore } from "../store/data.store.js";

import { buildCoreEngine } from "../engine/core.engine.js";
import { buildAllSummaries } from "../engine/summary.index.js";
import { renderAllSummaries } from "../ui/summary.index.js";
import { renderAllReports } from "../ui/report.index.js";

import { exportAllReports } from "../utils/export.utils.js";

window.globalSearchTerm = "";

/* =========================
   SIDEBAR LOGIC
========================= */

function wireSidebar() {

  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebarToggle");
  const items = document.querySelectorAll(".sidebar-item");

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  items.forEach(item => {

    item.addEventListener("click", () => {

      items.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      const tab = item.dataset.tab;

      const dashboardSection = document.getElementById("dashboardSection");
      const reportSection = document.getElementById("reportSection");

      if (tab === "dashboard") {
        dashboardSection.style.display = "grid";
        reportSection.style.display = "none";
      } else {
        dashboardSection.style.display = "none";
        reportSection.style.display = "block";
      }

    });

  });
}

/* =========================
   SEARCH
========================= */

function wireGlobalSearch() {
  const input = document.querySelector(".search-input");

  input.addEventListener("input", (e) => {
    window.globalSearchTerm = e.target.value;

    const activeItem = document.querySelector(".sidebar-item.active");
    if (activeItem) activeItem.click();
  });
}

/* =========================
   EXPORT
========================= */

function wireExportButton() {
  const btn = document.querySelector(".btn-primary");
  btn.addEventListener("click", exportAllReports);
}

/* =========================
   LOAD SHEETS
========================= */

async function loadAllSheets() {

  const progressFill = document.querySelector(".progress-fill");
  const progressStats = document.querySelector(".progress-stats");

  let loaded = 0;
  const total = Object.keys(SHEETS).length;

  for (const key in SHEETS) {

    try {

      progressStats.innerHTML = `Loading: ${key}...`;

      const text = await fetchCSV(SHEETS[key]);
      const parsed = parseCSV(text);

      dataStore[key] = parsed;

      loaded++;

      const percent = Math.round((loaded / total) * 100);
      progressFill.style.width = `${percent}%`;
      progressFill.textContent = `${percent}%`;

    } catch (err) {
      console.error("Sheet failed:", key, err);
    }
  }

  progressStats.innerHTML = "✔ All Sheets Loaded";
}

/* =========================
   BOOTSTRAP
========================= */

async function bootstrap() {

  await loadAllSheets();

  buildCoreEngine();
  buildAllSummaries();
  renderAllSummaries();
  renderAllReports();

  wireSidebar();
  wireGlobalSearch();
  wireExportButton();
}

bootstrap();
