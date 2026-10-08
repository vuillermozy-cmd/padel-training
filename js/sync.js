// Synchronisation entre appareils via un Gist privé sur le compte GitHub de l'utilisateur.
//
// Chaque appareil garde ses données en local (storage.js) et les fusionne avec le fichier du Gist :
// on relit toujours le Gist avant d'écrire, et la fusion ne fait qu'ajouter des séries (sans doublons),
// donc un appareil ne peut pas effacer les séances d'un autre. La clé GitHub (droit "gist" uniquement)
// reste dans ce navigateur et n'est envoyée qu'à api.github.com.

import * as storage from "./storage.js";

const CONFIG_KEY = "padel-training-sync";
const API = "https://api.github.com";
const FILE_NAME = "padel-training-data.json";
const GIST_DESCRIPTION = "Padel Training : synchronisation des séances";
const PUSH_DELAY_MS = 1500;

export const TOKEN_URL = "https://github.com/settings/tokens/new?scopes=gist&description=Padel%20Training";

let config = loadConfig(); // { token, gistId, gistUrl } ou null
let status = { state: config ? "idle" : "off", message: "", lastSync: null };
let running = null;
let rerun = false;
let pushTimer = null;
const statusListeners = [];

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function saveConfig() {
  if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  else localStorage.removeItem(CONFIG_KEY);
}

function setStatus(next) {
  status = { ...status, ...next };
  statusListeners.forEach((listener) => listener(status));
}

export function onStatus(listener) {
  statusListeners.push(listener);
}

export function getStatus() {
  return status;
}

export function isEnabled() {
  return config !== null;
}

export function getGistUrl() {
  return config ? config.gistUrl : null;
}

class SyncError extends Error {}

async function github(path, { method = "GET", body, token = config.token } = {}) {
  let response;
  try {
    response = await fetch(API + path, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new SyncError("Pas de connexion : tes séries restent sur cet appareil et seront synchronisées plus tard.");
  }
  if (response.status === 401) throw new SyncError("Clé GitHub refusée (invalide ou expirée). Crée une nouvelle clé et réactive la synchro.");
  if (response.status === 403) throw new SyncError("GitHub refuse l'accès : vérifie que la clé a bien le droit « gist ».");
  if (response.status === 404) throw new SyncError("Fichier de synchro introuvable sur GitHub (supprimé ?). Désactive puis réactive la synchro.");
  if (!response.ok) throw new SyncError(`Erreur GitHub (${response.status}). Réessaie plus tard.`);
  return response.json();
}

// Contenu du fichier de synchro dans le Gist (lu via raw_url s'il est trop gros pour être inclus).
async function readRemoteSets() {
  const gist = await github(`/gists/${config.gistId}`);
  const file = gist.files[FILE_NAME];
  if (!file) return [];
  let content = file.content;
  if (file.truncated) {
    const raw = await fetch(file.raw_url, { cache: "no-store" });
    content = await raw.text();
  }
  return content ? storage.parseSets(content) : [];
}

// Fusionne le Gist dans les données locales, puis y écrit les séries locales qu'il n'a pas encore.
async function runSync() {
  setStatus({ state: "syncing", message: "" });
  const remote = await readRemoteSets();
  const pulled = storage.mergeSets(remote, { silent: true });
  const remoteKeys = new Set(remote.map(storage.setKey));
  const missingRemotely = storage.getAllSets().some((set) => !remoteKeys.has(storage.setKey(set)));
  if (missingRemotely) {
    await github(`/gists/${config.gistId}`, { method: "PATCH", body: { files: { [FILE_NAME]: { content: storage.exportData() } } } });
  }
  setStatus({ state: "ok", message: "", lastSync: Date.now() });
  return pulled;
}

// Lance une synchro (une seule à la fois ; une demande pendant une synchro en relance une après).
// Retourne le nombre de séries récupérées depuis les autres appareils.
export async function syncNow() {
  if (!config) return 0;
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    let pulled = 0;
    try {
      do {
        rerun = false;
        pulled += await runSync();
      } while (rerun);
    } catch (e) {
      setStatus({ state: "error", message: e instanceof SyncError ? e.message : "La synchronisation a échoué. Réessaie plus tard." });
    } finally {
      running = null;
    }
    return pulled;
  })();
  return running;
}

// Active la synchro avec une clé GitHub : retrouve le Gist de l'app s'il existe déjà (autre appareil), sinon le crée.
export async function enable(token) {
  token = token.trim();
  if (!token) {
    setStatus({ state: "error", message: "Colle d'abord ta clé GitHub." });
    return false;
  }
  setStatus({ state: "syncing", message: "" });
  try {
    let gist = null;
    for (let page = 1; !gist && page <= 10; page++) {
      const gists = await github(`/gists?per_page=100&page=${page}`, { token });
      gist = gists.find((g) => g.files && g.files[FILE_NAME]) || null;
      if (gists.length < 100) break;
    }
    if (!gist) {
      gist = await github("/gists", {
        method: "POST", token,
        body: { description: GIST_DESCRIPTION, public: false, files: { [FILE_NAME]: { content: storage.exportData() } } }
      });
    }
    config = { token, gistId: gist.id, gistUrl: gist.html_url };
    saveConfig();
  } catch (e) {
    setStatus({ state: "error", message: e instanceof SyncError ? e.message : "Activation impossible. Réessaie plus tard." });
    return false;
  }
  await syncNow();
  return status.state === "ok";
}

// Désactive la synchro sur cet appareil (les données locales et le Gist sont conservés).
export function disable() {
  config = null;
  saveConfig();
  clearTimeout(pushTimer);
  setStatus({ state: "off", message: "", lastSync: null });
}

// Après un changement local, on attend un peu pour regrouper les séries enregistrées à la suite.
function schedulePush() {
  if (!config) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, PUSH_DELAY_MS);
}

storage.onChange(schedulePush);
