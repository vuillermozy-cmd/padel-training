import { MOBILITY_ROUTINE, SESSIONS, findExercise } from "./data.js";
import * as storage from "./storage.js";
import { renderBodyDiagram } from "./bodyDiagram.js";
import { getProgressionSuggestion } from "./progression.js";

const viewContainer = document.getElementById("view-container");
const sessionBadge = document.getElementById("session-badge");
const nextDayHint = document.getElementById("next-day-hint");
const bottomNav = document.getElementById("bottom-nav");

const DAY_LABELS = { a: "Séance A", b: "Séance B", c: "Séance C" };

const uiState = {
  view: "seance",
  day: storage.getDraft().day || storage.getSuggestedNextDay(),
  expanded: new Set(),
  mobilityOpen: false,
  mobilityChecked: new Set(),
  inputs: {}, // exerciseId -> { weightLb, reps }
  progressionExerciseId: null
};

let chartInstance = null;

// Le poids est saisi/affiché en lb (unité principale) ; le kg (stocké et utilisé pour la
// logique de progression) est calculé automatiquement et affiché en petit à côté.
const LB_PER_KG = 2.2046226218;
const WEIGHT_STEP_LB = 5;

function kgToLb(kg) {
  return kg * LB_PER_KG;
}

function lbToKg(lb) {
  return lb / LB_PER_KG;
}

function formatWeight(w) {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

function roundLb(v) {
  return Math.max(0, Math.round(v * 2) / 2);
}

function roundKg(v) {
  return Math.max(0, Math.round(v * 10) / 10);
}

function displayLb(kg) {
  return formatWeight(roundLb(kgToLb(kg)));
}

function displayKg(kg) {
  return formatWeight(roundKg(kg));
}

function kgSub(kg) {
  return `<span class="unit-sub">(${displayKg(kg)} kg)</span>`;
}

function getInput(exerciseId, exercise) {
  if (!uiState.inputs[exerciseId]) {
    const suggestion = getProgressionSuggestion(exercise);
    uiState.inputs[exerciseId] = {
      weightLb: suggestion ? roundLb(kgToLb(suggestion.suggestedWeight)) : 45,
      reps: suggestion ? suggestion.lastReps : 8
    };
  }
  return uiState.inputs[exerciseId];
}

function updateHeader() {
  const total = storage.getTotalSessions();
  sessionBadge.textContent = `${total} séance${total > 1 ? "s" : ""}`;
  nextDayHint.textContent = `Prochaine séance suggérée : ${DAY_LABELS[storage.getSuggestedNextDay()]}`;
}

function renderMobilityCard() {
  const items = MOBILITY_ROUTINE.map((item, idx) => {
    const checked = uiState.mobilityChecked.has(idx);
    return `
      <li class="mobility-item ${checked ? "checked" : ""}">
        <input type="checkbox" data-action="toggle-mobility" data-idx="${idx}" ${checked ? "checked" : ""} />
        <span class="mobility-item-text">
          <span class="mobility-item-name">${item.name}</span><br/>
          <span class="mobility-item-fr">${item.fr}</span>
        </span>
        <span class="mobility-item-sub">${item.sub}</span>
      </li>
    `;
  }).join("");

  return `
    <section class="card mobility-card">
      <div class="card-header" data-action="toggle-mobility-section" role="button">
        <h2 class="card-title">Routine Mobilité &amp; Souplesse<span class="card-title-fr">Identique à chaque séance</span></h2>
        <button class="chevron">${uiState.mobilityOpen ? "▲" : "▼"}</button>
      </div>
      ${uiState.mobilityOpen ? `
        <div class="card-body">
          <ul class="mobility-list">${items}</ul>
        </div>
      ` : ""}
    </section>
  `;
}

function renderExerciseCard(exercise) {
  const isOpen = uiState.expanded.has(exercise.id);
  const input = getInput(exercise.id, exercise);
  const suggestion = getProgressionSuggestion(exercise);
  const history = storage.getSetsForExercise(exercise.id).slice(-5).reverse();
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.yt)}`;

  const bodyMarkup = isOpen
    ? `
      <div class="card-body">
        ${renderBodyDiagram(exercise.muscles)}
        <a class="yt-link" href="${ytUrl}" target="_blank" rel="noopener noreferrer">▶ Voir une démo vidéo</a>

        ${suggestion ? `
          <div class="suggestion-box">
            Dernière fois : <strong>${displayLb(suggestion.lastWeight)} lb</strong> ${kgSub(suggestion.lastWeight)} <strong>× ${suggestion.lastReps}</strong> (${suggestion.lastDate})<br/>
            ${suggestion.reachedTarget
              ? `💡 Fourchette haute atteinte → passe à <strong>${displayLb(suggestion.suggestedWeight)} lb</strong> ${kgSub(suggestion.suggestedWeight)}`
              : `Vise ${exercise.sub.split("·")[0].trim()} avant d'augmenter le poids.`}
          </div>
        ` : `<div class="suggestion-box">Aucune donnée encore — entre ta première série ci-dessous.</div>`}

        <div class="stepper-row">
          <div class="stepper">
            <span class="stepper-label">Poids (lb)</span>
            <div class="stepper-controls">
              <button class="stepper-btn" data-action="dec-weight" data-id="${exercise.id}">−</button>
              <input class="stepper-input" type="number" inputmode="decimal" step="${WEIGHT_STEP_LB}" data-role="weight-input" data-id="${exercise.id}" value="${formatWeight(input.weightLb)}" />
              <button class="stepper-btn" data-action="inc-weight" data-id="${exercise.id}">+</button>
            </div>
            <span class="stepper-subunit">≈ ${displayKg(lbToKg(input.weightLb))} kg</span>
          </div>
          <div class="stepper">
            <span class="stepper-label">Reps</span>
            <div class="stepper-controls">
              <button class="stepper-btn" data-action="dec-reps" data-id="${exercise.id}">−</button>
              <input class="stepper-input" type="number" inputmode="numeric" step="1" data-role="reps-input" data-id="${exercise.id}" value="${input.reps}" />
              <button class="stepper-btn" data-action="inc-reps" data-id="${exercise.id}">+</button>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" data-action="save-set" data-id="${exercise.id}">Enregistrer cette série</button>

        ${history.length ? `
          <p class="section-label" style="margin-top:14px;">Historique récent</p>
          <ul class="history-list">
            ${history.map((h) => `<li><span>${h.date}</span><span>${displayLb(h.weight)} lb ${kgSub(h.weight)} × ${h.reps}</span></li>`).join("")}
          </ul>
        ` : ""}
      </div>
    `
    : "";

  return `
    <section class="card exercise-card">
      <div class="card-header" data-action="toggle-exercise" data-id="${exercise.id}" role="button">
        <h3 class="card-title">${exercise.name}<span class="card-title-fr">${exercise.fr}</span></h3>
        <span class="card-sub">${exercise.sub}</span>
        <button class="chevron">${isOpen ? "▲" : "▼"}</button>
      </div>
      ${bodyMarkup}
    </section>
  `;
}

function renderSeanceView() {
  storage.setActiveDay(uiState.day);
  const draft = storage.getDraft();
  const exercises = SESSIONS[uiState.day];

  const dayButtons = Object.keys(SESSIONS).map((day) => `
    <button class="day-btn ${day === uiState.day ? "active" : ""}" data-action="set-day" data-day="${day}">${day.toUpperCase()}</button>
  `).join("");

  const exerciseCards = exercises.map(renderExerciseCard).join("");
  const draftCount = draft.sets.length;

  return `
    <div class="day-selector">${dayButtons}</div>
    ${renderMobilityCard()}
    <p class="section-label" style="margin-top:18px;">Renforcement &amp; explosivité</p>
    ${exerciseCards}
    <p class="draft-hint">${draftCount} série${draftCount > 1 ? "s" : ""} enregistrée${draftCount > 1 ? "s" : ""} dans cette séance</p>
    <button class="btn btn-finish" data-action="finish-session" ${draftCount === 0 ? "disabled" : ""}>Terminer la séance</button>
  `;
}

function allExercisesFlat() {
  return Object.values(SESSIONS).flat();
}

function renderProgressionView() {
  const total = storage.getTotalSessions();
  const allSessions = storage.getAllLoggedSessions();
  const totalSets = allSessions.reduce((acc, s) => acc + s.sets.length, 0);

  if (!uiState.progressionExerciseId) {
    uiState.progressionExerciseId = allExercisesFlat()[0].id;
  }

  const options = allExercisesFlat().map((ex) => `
    <option value="${ex.id}" ${ex.id === uiState.progressionExerciseId ? "selected" : ""}>${ex.name} (${ex.fr})</option>
  `).join("");

  const rows = [];
  allSessions.forEach((session) => {
    session.sets.forEach((set) => {
      const ex = findExercise(set.exerciseId);
      rows.push({ date: session.date, day: session.day.toUpperCase(), exercise: ex ? ex.name : set.exerciseId, weight: set.weight, reps: set.reps, timestamp: set.timestamp });
    });
  });
  rows.sort((a, b) => b.timestamp - a.timestamp);
  const filteredRows = rows.filter((r) => findExerciseIdByName(r.exercise) === uiState.progressionExerciseId);

  return `
    <div class="progress-summary">
      <div class="progress-stat">
        <div class="progress-stat-value">${total}</div>
        <div class="progress-stat-label">Séances complétées</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-value">${totalSets}</div>
        <div class="progress-stat-label">Séries loguées</div>
      </div>
    </div>

    <select class="select-field" data-action="select-exercise" id="exercise-select">${options}</select>

    <div class="chart-wrap">
      <canvas id="progress-chart" height="180"></canvas>
    </div>

    ${filteredRows.length ? `
      <table class="history-table">
        <thead><tr><th>Date</th><th>Séance</th><th>Poids</th><th>Reps</th></tr></thead>
        <tbody>
          ${filteredRows.map((r) => `<tr><td>${r.date}</td><td>${r.day}</td><td>${displayLb(r.weight)} lb ${kgSub(r.weight)}</td><td>${r.reps}</td></tr>`).join("")}
        </tbody>
      </table>
    ` : `<p class="empty-state">Aucune série loguée pour cet exercice.</p>`}
  `;
}

function findExerciseIdByName(name) {
  const ex = allExercisesFlat().find((e) => e.name === name);
  return ex ? ex.id : null;
}

function renderChart() {
  const canvas = document.getElementById("progress-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const sets = storage.getSetsForExercise(uiState.progressionExerciseId);
  const labels = sets.map((s) => s.date);
  const data = sets.map((s) => roundLb(kgToLb(s.weight)));

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Poids (lb)",
        data,
        borderColor: "#C1652F",
        backgroundColor: "rgba(193, 101, 47, 0.15)",
        tension: 0.25,
        pointRadius: 4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false, ticks: { color: "#6b6b62" } },
        x: { ticks: { color: "#6b6b62" } }
      }
    }
  });
}

function render() {
  updateHeader();
  viewContainer.innerHTML = uiState.view === "seance" ? renderSeanceView() : renderProgressionView();
  if (uiState.view === "progression") renderChart();
}

function clampReps(v) {
  return Math.max(1, Math.round(v));
}

viewContainer.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "set-day") {
    uiState.day = target.dataset.day;
    render();
  } else if (action === "toggle-mobility-section") {
    uiState.mobilityOpen = !uiState.mobilityOpen;
    render();
  } else if (action === "toggle-exercise") {
    const id = target.dataset.id;
    if (uiState.expanded.has(id)) uiState.expanded.delete(id);
    else uiState.expanded.add(id);
    render();
  } else if (action === "inc-weight" || action === "dec-weight") {
    const ex = findExercise(target.dataset.id);
    const input = getInput(ex.id, ex);
    input.weightLb = roundLb(input.weightLb + (action === "inc-weight" ? WEIGHT_STEP_LB : -WEIGHT_STEP_LB));
    render();
  } else if (action === "inc-reps" || action === "dec-reps") {
    const ex = findExercise(target.dataset.id);
    const input = getInput(ex.id, ex);
    input.reps = clampReps(input.reps + (action === "inc-reps" ? 1 : -1));
    render();
  } else if (action === "save-set") {
    const ex = findExercise(target.dataset.id);
    const input = getInput(ex.id, ex);
    storage.logSet(ex.id, roundKg(lbToKg(input.weightLb)), input.reps);
    render();
  } else if (action === "finish-session") {
    if (target.disabled) return;
    storage.finishSession();
    uiState.day = storage.getSuggestedNextDay();
    uiState.expanded.clear();
    uiState.mobilityOpen = false;
    uiState.mobilityChecked.clear();
    uiState.inputs = {};
    render();
  }
});

viewContainer.addEventListener("change", (e) => {
  const target = e.target;
  if (target.dataset.action === "toggle-mobility") {
    const idx = parseInt(target.dataset.idx, 10);
    if (target.checked) uiState.mobilityChecked.add(idx);
    else uiState.mobilityChecked.delete(idx);
    target.closest(".mobility-item").classList.toggle("checked", target.checked);
  } else if (target.dataset.role === "weight-input") {
    const ex = findExercise(target.dataset.id);
    getInput(ex.id, ex).weightLb = roundLb(parseFloat(target.value) || 0);
  } else if (target.dataset.role === "reps-input") {
    const ex = findExercise(target.dataset.id);
    getInput(ex.id, ex).reps = clampReps(parseInt(target.value, 10) || 1);
  } else if (target.id === "exercise-select") {
    uiState.progressionExerciseId = target.value;
    render();
  }
});

bottomNav.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-view]");
  if (!btn) return;
  uiState.view = btn.dataset.view;
  [...bottomNav.children].forEach((c) => c.classList.toggle("active", c === btn));
  render();
});

render();
