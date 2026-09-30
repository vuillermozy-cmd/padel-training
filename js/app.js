import { MOBILITY_ROUTINE, CONDITIONING_FINISHER, SESSIONS, findExercise } from "./data.js";
import * as storage from "./storage.js";
import { getProgressionSuggestion } from "./progression.js";
import { getCurrentPhase, getStrengthSub } from "./periodization.js";

// Photos de démonstration (position de départ / position finale) issues de free-exercise-db
// (domaine public, github.com/yuhonas/free-exercise-db), stockées localement dans img/exercises/<id>/.
const PHOTO_TOGGLE_INTERVAL_MS = 700;

function getExercisePhotoFrames(exerciseId) {
  return [`img/exercises/${exerciseId}/0.jpg`, `img/exercises/${exerciseId}/1.jpg`];
}

function renderExercisePhoto(exercise) {
  if (exercise.noPhoto) return "";
  const [frame0, frame1] = getExercisePhotoFrames(exercise.id);
  return `
    <div class="exercise-photo-wrap">
      <img class="exercise-photo" src="${frame0}" data-frame0="${frame0}" data-frame1="${frame1}" data-current="0" alt="Démonstration : ${exercise.name}" />
    </div>
  `;
}

setInterval(() => {
  document.querySelectorAll(".exercise-photo").forEach((img) => {
    const showFrame1 = img.dataset.current === "0";
    img.src = showFrame1 ? img.dataset.frame1 : img.dataset.frame0;
    img.dataset.current = showFrame1 ? "1" : "0";
  });
}, PHOTO_TOGGLE_INTERVAL_MS);

const viewContainer = document.getElementById("view-container");
const sessionBadge = document.getElementById("session-badge");
const nextDayHint = document.getElementById("next-day-hint");
const phaseHint = document.getElementById("phase-hint");
const bottomNav = document.getElementById("bottom-nav");

const DAY_LABELS = { a: "Séance A", b: "Séance B", c: "Séance C" };

const uiState = {
  view: "seance",
  day: storage.getDraft().day || storage.getSuggestedNextDay(),
  expanded: new Set(),
  mobilityOpen: false,
  mobilityChecked: new Set(),
  conditioningOpen: false,
  inputs: {}, // exerciseId -> { weightLb, reps }
  progressionExerciseId: null
};

let chartInstance = null;
// Phase de périodisation en cours (reps cibles pour les exercices de force), recalculée à chaque render().
let currentPhase = getCurrentPhase(storage.getTotalSessions());

function getExerciseSub(exercise) {
  return exercise.category === "strength" ? getStrengthSub(exercise, currentPhase) : exercise.sub;
}

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
    const suggestion = getProgressionSuggestion(exercise, currentPhase);
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
  phaseHint.textContent = `Phase actuelle (force) : ${currentPhase.label} · bloc ${currentPhase.block}`;
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

function renderFinisherItem(item) {
  return `
    <li class="mobility-item">
      <span class="mobility-item-text">
        <span class="mobility-item-name">${item.name}</span><br/>
        <span class="mobility-item-fr">${item.fr}</span>
      </span>
      <span class="mobility-item-sub">${item.sub}</span>
    </li>
  `;
}

function renderConditioningCard() {
  return `
    <section class="card conditioning-card">
      <div class="card-header" data-action="toggle-conditioning-section" role="button">
        <h2 class="card-title">Conditioning<span class="card-title-fr">Finisher, identique à chaque séance</span></h2>
        <button class="chevron">${uiState.conditioningOpen ? "▲" : "▼"}</button>
      </div>
      ${uiState.conditioningOpen ? `
        <div class="card-body">
          <ul class="mobility-list">${renderFinisherItem(CONDITIONING_FINISHER.main)}</ul>
          <p class="section-label finisher-alt-label">Ou, au choix</p>
          <ul class="mobility-list">${CONDITIONING_FINISHER.alternatives.map(renderFinisherItem).join("")}</ul>
        </div>
      ` : ""}
    </section>
  `;
}

function renderSuggestionHint(exercise, suggestion, exerciseSub) {
  if (!suggestion.reachedTarget) {
    return `Vise ${exerciseSub.split("·")[0].trim()} avant ${exercise.assisted ? "de réduire l'assistance" : "d'augmenter le poids"}.`;
  }
  if (exercise.assisted && suggestion.suggestedWeight === 0) {
    return "💡 Fourchette haute atteinte → passe aux tractions au poids du corps !";
  }
  const target = `<strong>${displayLb(suggestion.suggestedWeight)} lb</strong> ${kgSub(suggestion.suggestedWeight)}`;
  return exercise.assisted
    ? `💡 Fourchette haute atteinte → réduis l'assistance à ${target}`
    : `💡 Fourchette haute atteinte → passe à ${target}`;
}

function renderExerciseCard(exercise) {
  const isOpen = uiState.expanded.has(exercise.id);
  const input = getInput(exercise.id, exercise);
  const suggestion = getProgressionSuggestion(exercise, currentPhase);
  const history = storage.getSetsForExercise(exercise.id).slice(-5).reverse();
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.yt)}`;
  const exerciseSub = getExerciseSub(exercise);

  const bodyMarkup = isOpen
    ? `
      <div class="card-body">
        ${renderExercisePhoto(exercise)}
        <a class="yt-link" href="${ytUrl}" target="_blank" rel="noopener noreferrer">▶ Voir une démo vidéo</a>

        ${suggestion ? `
          <div class="suggestion-box">
            Dernière fois : <strong>${displayLb(suggestion.lastWeight)} lb</strong> ${kgSub(suggestion.lastWeight)}${exercise.assisted ? " d'assistance" : ""} <strong>× ${suggestion.lastReps}</strong> (${suggestion.lastDate})<br/>
            ${renderSuggestionHint(exercise, suggestion, exerciseSub)}
          </div>
        ` : `<div class="suggestion-box">Aucune donnée encore — entre ta première série ci-dessous.${exercise.assisted ? " Le poids à saisir est l'assistance (machine ou élastique)." : ""}</div>`}

        <div class="stepper-row">
          <div class="stepper">
            <span class="stepper-label">${exercise.assisted ? "Assistance (lb)" : "Poids (lb)"}</span>
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
        <span class="card-sub">${exerciseSub}</span>
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

  const powerBlock = exercises.filter((e) => e.category !== "strength");
  const strengthBlock = exercises.filter((e) => e.category === "strength");
  const draftCount = draft.sets.length;

  return `
    <div class="day-selector">${dayButtons}</div>
    ${renderMobilityCard()}
    <p class="section-label" style="margin-top:18px;">Puissance, medball &amp; core</p>
    ${powerBlock.map(renderExerciseCard).join("")}
    <p class="section-label" style="margin-top:18px;">Force</p>
    ${strengthBlock.map(renderExerciseCard).join("")}
    ${renderConditioningCard()}
    <p class="draft-hint">${draftCount} série${draftCount > 1 ? "s" : ""} enregistrée${draftCount > 1 ? "s" : ""} dans cette séance</p>
    <button class="btn btn-finish" data-action="finish-session" ${draftCount === 0 ? "disabled" : ""}>Terminer la séance</button>
  `;
}

// Liste unique des exercices (les tractions sont présentes dans les 3 séances).
function allExercisesFlat() {
  return [...new Map(Object.values(SESSIONS).flat().map((ex) => [ex.id, ex])).values()];
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
  currentPhase = getCurrentPhase(storage.getTotalSessions());
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
  } else if (action === "toggle-conditioning-section") {
    uiState.conditioningOpen = !uiState.conditioningOpen;
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
    uiState.conditioningOpen = false;
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
