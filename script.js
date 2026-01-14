// frontend/script.js
console.log('[Diet-App] script.js geladen');

// -------------------------------------------------------------
// ✅ Release-taugliche Basis (Store-Ready Schritt 1):
// - API Base automatisch (localhost vs. deployed)
// - Wenn über file:// geöffnet: klare Meldung + Analyse deaktiviert
// - Backend-Healthcheck (Backend erreichbar?) + UI-Status + Analyse-Button Sperre
// - Kein UTC-Date-Bug beim Tagesbudget (lokales Datum!)
// - Debug nur bei ?debug=1 sichtbar
// - Safer fetch mit Timeout
// - Fehler als Toast (nicht nur alert)
// - ✅ Loading Overlay + UI Lock während Analyse
// - ✅ NEU: Sichtbares Fallback-Rendering, falls DOM-IDs nicht passen
// - ✅ FIX: Dateiauswahl öffnet NICHT mehr zweimal (stopPropagation + guard)
// -------------------------------------------------------------

// -------------------------------------------------------------
// 1) API BASE
// -------------------------------------------------------------
const API_BASE = "https://diet-app-backend-new.onrender.com/api";

// -------------------------------------------------------------
// 2) Toast / Fehleranzeige
// -------------------------------------------------------------
function ensureToast() {
  let el = document.getElementById('diet-toast');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'diet-toast';
  el.style.position = 'fixed';
  el.style.left = '50%';
  el.style.bottom = '18px';
  el.style.transform = 'translateX(-50%)';
  el.style.maxWidth = '92vw';
  el.style.width = '520px';
  el.style.padding = '10px 12px';
  el.style.borderRadius = '12px';
  el.style.background = 'rgba(2, 6, 23, 0.95)';
  el.style.border = '1px solid rgba(148, 163, 184, 0.25)';
  el.style.boxShadow = '0 18px 40px rgba(0,0,0,0.55)';
  el.style.color = '#e5e7eb';
  el.style.fontSize = '13px';
  el.style.zIndex = '9999';
  el.style.display = 'none';
  el.style.backdropFilter = 'blur(6px)';

  document.body.appendChild(el);
  return el;
}

let toastTimer = null;

function showToast(message, ms = 2800) {
  const el = ensureToast();
  el.textContent = String(message || '');
  el.style.display = 'block';

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.display = 'none';
  }, ms);
}

function showError(message) {
  console.error('[Diet-App][Fehler]', message);
  showToast(message, 3200);
  try {
    if (!document.body) alert(message);
  } catch {}
}

// -------------------------------------------------------------
// 3) Safer fetch mit Timeout
// -------------------------------------------------------------
async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

// -------------------------------------------------------------
// 4) Debug nur wenn ?debug=1
// -------------------------------------------------------------
function isDebugEnabled() {
  try {
    const qs = new URLSearchParams(location.search);
    return qs.get('debug') === '1';
  } catch {
    return false;
  }
}

function debugLog(...args) {
  if (isDebugEnabled()) console.log('[Diet-App][debug]', ...args);
}

// -------------------------------------------------------------
// 5) Backend Reachability / Healthcheck
// -------------------------------------------------------------
let backendReachable = false;

async function checkBackendReachable() {
  if (String(location.protocol || '').toLowerCase() === 'file:') {
    backendReachable = false;
    return false;
  }

  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, { method: 'GET' }, 8000);
    backendReachable = !!res && res.ok;
    return backendReachable;
  } catch (e) {
    backendReachable = false;
    return false;
  }
}

// -------------------------------------------------------------
// Sprache / mini i18n
// -------------------------------------------------------------
const LS_LANG_KEY = 'masterAssistantLangV1';
const SUPPORTED_LANGS = ['de', 'en', 'fr', 'it'];

function getCurrentLang() {
  try {
    const saved = localStorage.getItem(LS_LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch {}
  return 'de';
}

function setCurrentLang(lang) {
  const safe = SUPPORTED_LANGS.includes(lang) ? lang : 'de';
  try {
    localStorage.setItem(LS_LANG_KEY, safe);
  } catch {}

  try {
    document.documentElement.lang = safe;
  } catch {}

  if (currentDietAnalysis) renderDietResult(currentDietAnalysis);
}

const INGREDIENT_TRANSLATIONS_DE = {
  'burger bun': 'Burger-Brötchen',
  'bun': 'Brötchen',
  'beef patty': 'Rindfleisch-Patty',
  'patty': 'Patty',
  'cheddar cheese': 'Cheddar-Käse',
  'cheddar': 'Cheddar',
  'lettuce': 'Salat',
  'tomato': 'Tomate',
  'onion': 'Zwiebel',
  'pickles': 'Gewürzgurken',
  'ketchup': 'Ketchup',
  'mustard': 'Senf',
  'mayonnaise': 'Mayonnaise',
  'chicken': 'Hähnchen',
  'beef': 'Rindfleisch',
  'pork': 'Schweinefleisch',
  'fish': 'Fisch',
  'rice': 'Reis',
  'pasta': 'Pasta',
  'noodles': 'Nudeln',
  'potato': 'Kartoffel',
  'fries': 'Pommes',
  'bread': 'Brot',
  'egg': 'Ei',
  'cheese': 'Käse',
  'milk': 'Milch',
  'yogurt': 'Joghurt',
  'butter': 'Butter',
  'olive oil': 'Olivenöl',
  'oil': 'Öl',
  'salad': 'Salat',
  'cucumber': 'Gurke',
  'carrot': 'Karotte',
  'pepper': 'Paprika',
  'mushroom': 'Pilze',
  'garlic': 'Knoblauch'
};

function normalizeKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function translateIngredientName(name) {
  const lang = getCurrentLang();
  if (lang !== 'de') return name;

  const raw = String(name || '').trim();
  if (!raw) return raw;

  const key = normalizeKey(raw);
  if (INGREDIENT_TRANSLATIONS_DE[key]) return INGREDIENT_TRANSLATIONS_DE[key];

  const parts = key.split(' ');
  if (parts.length > 1) {
    const rebuilt = parts.map(p => INGREDIENT_TRANSLATIONS_DE[p] || p).join(' ');
    if (rebuilt !== key) return rebuilt.replace(/(^|\s)\S/g, m => m.toUpperCase());
  }
  return raw;
}

window.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('lang-select');
  if (!sel) return;

  const lang = getCurrentLang();
  sel.value = lang;
  try { document.documentElement.lang = lang; } catch {}

  sel.addEventListener('change', () => setCurrentLang(sel.value));
});

// -------------------------------------------------------------
// Essensanalyse – DOM
// -------------------------------------------------------------
const dietFileInput = document.getElementById('diet-file-input');
const dietAnalyzeBtn = document.getElementById('diet-analyze-btn');
const dietBtnText = document.getElementById('diet-btn-text');
const dietImagePreview = document.getElementById('diet-image-preview');
const dietPreviewWrap = document.getElementById('diet-preview');
const dietUploadHint = document.getElementById('diet-upload-hint');
const dietStatusEl = document.getElementById('diet-status');

const dietTotalCaloriesEl = document.getElementById('diet-total-calories');
const dietResultNoteEl = document.getElementById('diet-result-note');
const dietItemsListEl = document.getElementById('diet-items-list');

const dietDailyPill = document.getElementById('diet-daily-pill');
const dietDailyPillText = document.getElementById('diet-daily-pill-text');

const dietDebugToggleBtn = document.getElementById('diet-debug-toggle');
const dietDebugPanel = document.getElementById('diet-debug-panel');
const dietDebugContent = document.getElementById('diet-debug-content');

const dietGalleryBtn = document.getElementById('diet-gallery-btn');
const dietUploadArea = document.getElementById('diet-upload-area');
const dietCameraBtn = document.getElementById('diet-camera-btn');

let currentDietAnalysis = null;

// ✅ Expose minimal debug state (damit du in der Console schauen kannst)
window.__DIET_APP__ = {
  get apiBase() { return API_BASE; },
  get backendReachable() { return backendReachable; },
  get currentDietAnalysis() { return currentDietAnalysis; }
};

function setDietStatus(text, isError = false) {
  if (!dietStatusEl) return;
  dietStatusEl.textContent = text || '';
  dietStatusEl.classList.toggle('error', !!isError);
}

// -------------------------------------------------------------
// Loading Overlay + UI Lock
// -------------------------------------------------------------
function getLeftCardEl() {
  try {
    if (dietAnalyzeBtn && dietAnalyzeBtn.closest) {
      const card = dietAnalyzeBtn.closest('.card');
      if (card) return card;
    }
  } catch {}
  try {
    const grid = document.querySelector('#section-diet .diet-app .grid');
    if (!grid) return null;
    const card = grid.querySelector('.card');
    return card || null;
  } catch {
    return null;
  }
}

function setLeftCardLocked(locked) {
  const card = getLeftCardEl();
  if (!card) return;

  try {
    card.style.pointerEvents = locked ? 'none' : '';
  } catch {}

  const overlay = card.querySelector('.diet-loading-overlay');
  if (overlay) overlay.style.pointerEvents = 'auto';
}

function showDietLoadingOverlay(title = 'Analyse läuft…', subtext = 'Bitte kurz warten – das kann je nach Bild 5–20 Sekunden dauern.') {
  const card = getLeftCardEl();
  if (!card) return;

  const old = card.querySelector('.diet-loading-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.className = 'diet-loading-overlay';

  const box = document.createElement('div');
  box.className = 'diet-loading-box';

  const spinner = document.createElement('div');
  spinner.className = 'diet-spinner';

  const t = document.createElement('div');
  t.className = 'diet-loading-text';
  t.textContent = title;

  const st = document.createElement('div');
  st.className = 'diet-loading-subtext';
  st.textContent = subtext;

  box.appendChild(spinner);
  box.appendChild(t);
  box.appendChild(st);
  overlay.appendChild(box);

  card.appendChild(overlay);

  setLeftCardLocked(true);
  overlay.style.pointerEvents = 'auto';
}

function hideDietLoadingOverlay() {
  const card = getLeftCardEl();
  if (!card) return;

  const overlay = card.querySelector('.diet-loading-overlay');
  if (overlay) overlay.remove();

  setLeftCardLocked(false);
}

// Datei -> base64 (ohne data:-prefix)
function fileToBase64Raw(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = String(r.result || '');
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    r.onerror = () => reject(new Error('FileReader Fehler'));
    r.readAsDataURL(file);
  });
}

function initDebugUI() {
  const enabled = isDebugEnabled();
  if (dietDebugToggleBtn) dietDebugToggleBtn.style.display = enabled ? 'block' : 'none';
  if (dietDebugPanel) dietDebugPanel.style.display = 'none';

  if (enabled && dietDebugToggleBtn && dietDebugPanel) {
    dietDebugToggleBtn.addEventListener('click', () => {
      const visible = dietDebugPanel.style.display === 'block';
      dietDebugPanel.style.display = visible ? 'none' : 'block';
      dietDebugToggleBtn.textContent = visible ? 'Debug anzeigen' : 'Debug ausblenden';
    });
  }
}

function updateAnalyzeButtonState() {
  const hasFile = !!(dietFileInput && dietFileInput.files && dietFileInput.files[0]);
  const can = hasFile && backendReachable;

  if (dietAnalyzeBtn) dietAnalyzeBtn.disabled = !can;

  if (hasFile && !backendReachable) {
    if (String(location.protocol || '').toLowerCase() === 'file:') {
      setDietStatus(
        'Analyse deaktiviert: Du hast die Seite per Doppelklick (file://) geöffnet. Bitte über Live Server oder als App starten.',
        true
      );
    } else {
      setDietStatus(
        'Backend nicht erreichbar. Starte das Backend (Port 4000) oder nutze die deployed Version.',
        true
      );
    }
  }
}

// Preview
function showPreview(file) {
  if (!file || !dietImagePreview) return;

  const reader = new FileReader();
  reader.onload = e => {
    dietImagePreview.src = e.target.result;
    if (dietPreviewWrap) dietPreviewWrap.style.display = 'flex';
    if (dietUploadHint) dietUploadHint.style.display = 'none';
    setDietStatus('Bereit zur Analyse.');
    updateAnalyzeButtonState();
  };
  reader.readAsDataURL(file);
}

if (dietFileInput) {
  dietFileInput.addEventListener('change', () => {
    const file = dietFileInput.files && dietFileInput.files[0];
    if (file) showPreview(file);
  });
}

/**
 * ✅ FIX: Doppelt-Dialog verhindern
 * Ursache: Klick auf Button bubbelt in Upload-Area rein => 2x input.click()
 * Lösung:
 * - Buttons: e.preventDefault + e.stopPropagation
 * - Upload-Area: ignoriert Klicks, wenn sie von Buttons stammen
 */
function isClickFromDietPickButtons(e) {
  try {
    const t = e && e.target;
    if (!t || !t.closest) return false;
    return !!t.closest('#diet-gallery-btn, #diet-camera-btn');
  } catch {
    return false;
  }
}

if (dietGalleryBtn && dietFileInput) {
  dietGalleryBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // sicherstellen: kein Kamera-capture vom letzten mal
    try { dietFileInput.removeAttribute('capture'); } catch {}
    dietFileInput.click();
  });
}

if (dietUploadArea && dietFileInput) {
  dietUploadArea.addEventListener('click', (e) => {
    // wenn der Klick eigentlich auf dem Button war -> NICHT nochmal öffnen
    if (isClickFromDietPickButtons(e)) return;

    e.preventDefault();
    dietFileInput.click();
  });
}

if (dietCameraBtn && dietFileInput) {
  dietCameraBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      dietFileInput.setAttribute('capture', 'environment');
    } catch {}
    dietFileInput.click();
    setTimeout(() => {
      try { dietFileInput.removeAttribute('capture'); } catch {}
    }, 500);
  });
}

// Kalorien aus Inputs berechnen
function getCurrentTotalCaloriesFromInputs() {
  if (!dietItemsListEl) return 0;
  const inputs = dietItemsListEl.querySelectorAll('.item-cal-input');
  if (!inputs.length) return 0;

  let sum = 0;
  inputs.forEach(inp => {
    const v = Number(String(inp.value || '').replace(',', '.'));
    if (!isNaN(v) && v >= 0) sum += v;
  });
  return sum;
}

function renderIngredientsList(items) {
  if (!dietItemsListEl) return;

  if (!items || !items.length) {
    dietItemsListEl.innerHTML = `
      <div class="items-placeholder">
        Keine Bestandteile erkannt.
      </div>`;
    return;
  }

  dietItemsListEl.innerHTML = '';

  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'item-row';

    const left = document.createElement('div');
    left.className = 'item-left';

    const nameEl = document.createElement('div');
    nameEl.className = 'item-name';
    nameEl.textContent = translateIngredientName(item.name || 'Unbekannt');

    const commentEl = document.createElement('div');
    commentEl.className = 'item-comment';
    commentEl.textContent = item.comment || '';

    left.appendChild(nameEl);
    if (item.comment) left.appendChild(commentEl);

    const right = document.createElement('div');
    right.className = 'item-cal';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.className = 'item-cal-input';
    input.value =
      (typeof item.estimatedCalories === 'number' && item.estimatedCalories >= 0)
        ? Math.round(item.estimatedCalories)
        : '';

    const unit = document.createElement('span');
    unit.textContent = ' kcal';

    right.appendChild(input);
    right.appendChild(unit);

    row.appendChild(left);
    row.appendChild(right);
    dietItemsListEl.appendChild(row);

    input.addEventListener('input', () => {
      const total = Math.round(getCurrentTotalCaloriesFromInputs());
      if (dietTotalCaloriesEl) dietTotalCaloriesEl.textContent = `${total} kcal (manuell angepasst)`;

      if (currentDietAnalysis && Array.isArray(currentDietAnalysis.items) && currentDietAnalysis.items[idx]) {
        currentDietAnalysis.items[idx].estimatedCalories = Number(input.value) || 0;
        currentDietAnalysis.totalCalories = total;
      }

      if (dietDailyPill && dietDailyPillText) {
        dietDailyPillText.textContent = 'ℹ️ Kalorien wurden manuell angepasst – Einschätzung ist nur grob.';
        dietDailyPill.style.display = 'inline-flex';
      }

      renderDietBudgetUI();
    });
  });
}

// ✅ Fallback-Box (sichtbar, auch wenn IDs nicht passen)
function ensureFallbackResultBox() {
  let box = document.getElementById('diet-fallback-result');
  if (box) return box;

  // Wir hängen es in die Ergebnis-Card (rechts), wenn möglich – sonst ans Ende vom Body.
  let anchor = null;
  try {
    const grid = document.querySelector('#section-diet .diet-app .grid');
    if (grid) {
      const cards = grid.querySelectorAll('.card');
      if (cards && cards[1]) anchor = cards[1]; // zweite Card = Ergebnis
    }
  } catch {}

  box = document.createElement('div');
  box.id = 'diet-fallback-result';
  box.style.marginTop = '12px';
  box.style.padding = '10px 12px';
  box.style.borderRadius = '12px';
  box.style.border = '1px solid rgba(148, 163, 184, 0.25)';
  box.style.background = 'rgba(2,6,23,0.35)';
  box.style.color = '#e5e7eb';
  box.style.fontSize = '13px';
  box.style.display = 'none';

  (anchor || document.body).appendChild(box);
  return box;
}

function renderFallbackResult(normalized) {
  const box = ensureFallbackResultBox();
  const total = Math.round(Number(normalized.totalCalories || 0));
  const dish = normalized.dishName ? String(normalized.dishName) : '';
  const items = Array.isArray(normalized.items) ? normalized.items : [];

  const list = items.slice(0, 12).map(it => {
    const n = translateIngredientName(it.name || '');
    const c = Math.round(Number(it.estimatedCalories || 0));
    const cm = it.comment ? ` (${it.comment})` : '';
    return `<li>${n}${cm}: <b>${c} kcal</b></li>`;
  }).join('');

  box.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">✅ Analyse angekommen (Fallback-Render)</div>
    ${dish ? `<div style="margin-bottom:6px;">Gericht: <b>${dish}</b></div>` : ``}
    <div style="margin-bottom:6px;">Total: <b>${total} kcal</b></div>
    ${items.length ? `<ul style="margin:0; padding-left:18px;">${list}</ul>` : `<div>Keine Zutaten-Liste vorhanden.</div>`}
  `;
  box.style.display = 'block';
}

function renderDietResult(normalized) {
  currentDietAnalysis = normalized;

  // ✅ Immer sichtbar: kurzer Toast
  try {
    const totalToast = Math.round(Number(normalized.totalCalories || 0));
    showToast(`Analyse: ${totalToast} kcal ✅`, 2200);
  } catch {}

  // ✅ Fallback immer rendern (damit du sicher was siehst)
  try {
    renderFallbackResult(normalized);
  } catch {}

  const total = Math.round(Number(normalized.totalCalories || 0));
  const note = normalized.note || '';

  // Wenn hier IDs fehlen, siehst du es zumindest im Fallback + Console
  if (!dietTotalCaloriesEl || !dietResultNoteEl || !dietItemsListEl) {
    console.warn('[Diet-App] Ergebnis-Elemente fehlen oder sind null:', {
      dietTotalCaloriesEl: !!dietTotalCaloriesEl,
      dietResultNoteEl: !!dietResultNoteEl,
      dietItemsListEl: !!dietItemsListEl
    });
  }

  if (dietTotalCaloriesEl) {
    dietTotalCaloriesEl.textContent =
      normalized.totalCalories != null ? `${total} kcal (geschätzt)` : 'Noch keine Analyse';
  }
  if (dietResultNoteEl) dietResultNoteEl.textContent = note;

  if (dietDailyPill && dietDailyPillText) {
    const fits = normalized.fitsDailyBudget || 'unsicher';
    let emoji = '❓';
    let pillText = 'Schwer einzuordnen – hängt stark von Portionsgröße und Person ab.';

    if (fits === 'ja') {
      emoji = '✅';
      pillText = 'Passt ungefähr in ein typisches Tagesbudget.';
    } else if (fits === 'nein') {
      emoji = '⚠️';
      pillText = 'Ziemlich heftig im Vergleich zum Tagesbudget.';
    }

    dietDailyPillText.textContent = `${emoji} ${pillText}`;
    dietDailyPill.style.display = 'inline-flex';
  }

  if (dietItemsListEl) renderIngredientsList(normalized.items || []);

  if (normalized.totalCalories != null) {
    updateDietBudgetAfterAnalysis(Number(normalized.totalCalories));
  }
}

// Normalisiert Backend-Payload
function normalizeBackendPayload(data) {
  const a = (data && data.analysis) ? data.analysis : null;
  const b = (data && data.ok && data.data) ? data.data : null;
  const src = a || b || data || {};

  // Support: /analysis enthält ingredients[] und/oder items[]
  if (Array.isArray(src.items)) {
    return {
      dishName: src.dishName || '',
      totalCalories: src.totalCalories ?? 0,
      note: src.note || '',
      fitsDailyBudget: src.fitsDailyBudget || 'unsicher',
      items: src.items.map(it => ({
        name: it.name,
        comment: it.comment || '',
        estimatedCalories: typeof it.estimatedCalories === 'number' ? it.estimatedCalories : 0
      }))
    };
  }

  if (Array.isArray(src.ingredients)) {
    return {
      dishName: src.dishName || '',
      totalCalories: src.totalCalories ?? 0,
      note: src.note || '',
      fitsDailyBudget: src.fitsDailyBudget || 'unsicher',
      items: src.ingredients.map(it => ({
        name: it.name,
        comment: (it.estimatedWeightGrams != null ? `${it.estimatedWeightGrams} g` : ''),
        estimatedCalories: typeof it.calories === 'number' ? it.calories : 0
      }))
    };
  }

  return {
    dishName: src.dishName || '',
    totalCalories: src.totalCalories ?? 0,
    note: src.note || '',
    fitsDailyBudget: src.fitsDailyBudget || 'unsicher',
    items: []
  };
}

// Analyse: /diet/analyze (FormData), fallback /analyze-food (base64-json)
async function analyzeCurrentImage() {
  if (!backendReachable) {
    if (String(location.protocol || '').toLowerCase() === 'file:') {
      showError('Analyse geht hier nicht: bitte über Live Server öffnen (nicht per Doppelklick).');
    } else {
      showError('Backend nicht erreichbar. Bitte Backend starten oder deployed Version nutzen.');
    }
    updateAnalyzeButtonState();
    return;
  }

  if (!dietFileInput || !dietFileInput.files || !dietFileInput.files[0]) {
    showError('Bitte zuerst ein Bild auswählen.');
    return;
  }

  const file = dietFileInput.files[0];

  showDietLoadingOverlay('Analyse läuft…', 'Bitte kurz warten – das kann je nach Bild 5–20 Sekunden dauern.');

  if (dietAnalyzeBtn) dietAnalyzeBtn.disabled = true;
  if (dietBtnText) dietBtnText.textContent = 'Analysiere...';
  setDietStatus('Bild wird analysiert...');

  try {
    debugLog('POST', `${API_BASE}/diet/analyze`, 'file=', file?.name, file?.type, file?.size);

    let res = await fetchWithTimeout(`${API_BASE}/diet/analyze`, {
      method: 'POST',
      body: (() => {
        const fd = new FormData();
        fd.append('image', file);
        if (isDebugEnabled()) fd.append('debug', '1');
        return fd;
      })()
    }, 90000);

    debugLog('Response /diet/analyze status=', res.status);

    if (!res.ok) {
      const base64 = await fileToBase64Raw(file);
      debugLog('Fallback POST', `${API_BASE}/analyze-food`, 'base64Len=', base64?.length);

      res = await fetchWithTimeout(`${API_BASE}/analyze-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      }, 90000);

      debugLog('Response /analyze-food status=', res.status);
    }

    if (!res.ok) {
      throw new Error(`Analyse fehlgeschlagen (Status ${res.status})`);
    }

    const data = await res.json();
    console.log('[Diet-App] Analyse-Response (raw):', data);

    const normalized = normalizeBackendPayload(data);
    console.log('[Diet-App] Analyse normalisiert:', normalized);

    renderDietResult(normalized);

    if (isDebugEnabled() && dietDebugContent) {
      dietDebugContent.textContent = JSON.stringify(data, null, 2);
    }

    setDietStatus('Analyse abgeschlossen.');
  } catch (err) {
    console.error(err);
    setDietStatus('Fehler bei der Analyse. Siehe Konsole.', true);
    showError('Fehler bei der Essensanalyse. Bitte erneut versuchen.');
  } finally {
    hideDietLoadingOverlay();
    if (dietBtnText) dietBtnText.textContent = 'Analysieren';
    updateAnalyzeButtonState();
  }
}

if (dietAnalyzeBtn) {
  dietAnalyzeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    analyzeCurrentImage();
  });
}

// -------------------------------------------------------------
// Kalorien-Tagesbudget (localStorage + 7 Tage Chart)
// -------------------------------------------------------------
const dietBudgetGoalInput = document.getElementById('diet-budget-goal');
const dietBudgetSaveBtn = document.getElementById('diet-budget-save');
const dietBudgetGoalLabel = document.getElementById('diet-budget-goal-label');
const dietBudgetConsumedSpan = document.getElementById('diet-budget-today-consumed');
const dietBudgetRemainingSpan = document.getElementById('diet-budget-today-remaining');
const dietBudgetBarInner = document.getElementById('diet-budget-bar-inner');
const dietBudgetWarning = document.getElementById('diet-budget-warning');
const dietBudgetChartContainer = document.getElementById('diet-budget-chart');

const LS_DIET_BUDGET_KEY = 'dietDailyCalorieBudgetV1';

// ✅ Wichtig: lokales Datum (nicht UTC)
function getTodayKey() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function loadDietBudgetState() {
  try {
    const raw = localStorage.getItem(LS_DIET_BUDGET_KEY);
    if (!raw) return { goal: null, log: {} };
    const parsed = JSON.parse(raw);
    return {
      goal: typeof parsed.goal === 'number' ? parsed.goal : null,
      log: parsed.log && typeof parsed.log === 'object' ? parsed.log : {}
    };
  } catch {
    return { goal: null, log: {} };
  }
}

function saveDietBudgetState(state) {
  try {
    localStorage.setItem(LS_DIET_BUDGET_KEY, JSON.stringify(state));
  } catch {}
}

function renderDietBudgetChart(state) {
  if (!dietBudgetChartContainer) return;

  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    const local = new Date(d);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    const key = local.toISOString().slice(0, 10);

    const value = Number(state.log[key] || 0);
    const weekday = d.toLocaleDateString('de-CH', { weekday: 'short' });
    days.push({ key, label: weekday, value });
  }

  const max = days.reduce((m, d) => Math.max(m, d.value), 0);
  if (!max) {
    dietBudgetChartContainer.innerHTML =
      '<p class="diet-chart-empty muted">Noch keine Daten für das Diagramm.</p>';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'diet-chart-row';

  days.forEach(d => {
    const col = document.createElement('div');
    col.className = 'diet-chart-col';

    const valueLabel = document.createElement('div');
    valueLabel.className = 'diet-chart-value';
    valueLabel.textContent = d.value ? d.value.toString() : '';

    const bar = document.createElement('div');
    bar.className = 'diet-chart-bar';
    const height = Math.round((d.value / max) * 100);
    bar.style.height = `${height}%`;

    const dayLabel = document.createElement('div');
    dayLabel.className = 'diet-chart-label';
    dayLabel.textContent = d.label;

    col.appendChild(valueLabel);
    col.appendChild(bar);
    col.appendChild(dayLabel);
    wrapper.appendChild(col);
  });

  dietBudgetChartContainer.innerHTML = '';
  dietBudgetChartContainer.appendChild(wrapper);
}

function renderDietBudgetUI() {
  if (!dietBudgetConsumedSpan || !dietBudgetRemainingSpan) return;

  const state = loadDietBudgetState();
  const todayKey = getTodayKey();
  const consumed = Number(state.log[todayKey] || 0);
  const goal = state.goal;

  if (dietBudgetGoalLabel) {
    dietBudgetGoalLabel.textContent = goal && goal > 0 ? `Ziel: ${goal} kcal` : 'Kein Ziel gesetzt';
  }

  dietBudgetConsumedSpan.textContent = `${consumed} kcal`;

  if (!goal || goal <= 0) {
    dietBudgetRemainingSpan.textContent = '– kcal';
  } else {
    const remaining = goal - consumed;
    dietBudgetRemainingSpan.textContent = remaining >= 0 ? `${remaining} kcal` : `-${Math.abs(remaining)} kcal`;
  }

  if (dietBudgetBarInner) {
    let percent = 0;
    let over = false;
    if (goal && goal > 0) {
      percent = Math.min(100, Math.round((consumed / goal) * 100));
      over = consumed > goal;
    }
    dietBudgetBarInner.style.width = `${percent}%`;
    dietBudgetBarInner.classList.toggle('over', over);
  }

  if (dietBudgetWarning) {
    if (!goal || goal <= 0) {
      dietBudgetWarning.textContent =
        'Setze ein Tagesziel, damit dein Kalorienbudget automatisch nach jeder Analyse verfolgt wird.';
    } else if (consumed === 0) {
      dietBudgetWarning.textContent =
        'Noch keine Mahlzeit heute erfasst – sobald du etwas analysierst, wird dein Tagesbudget aktualisiert.';
    } else if (consumed < goal) {
      dietBudgetWarning.textContent =
        `Du liegst noch unter deinem Tagesziel. Verbleibend: ${goal - consumed} kcal.`;
    } else if (consumed === goal) {
      dietBudgetWarning.textContent = 'Du hast dein Tagesbudget heute exakt erreicht.';
    } else {
      dietBudgetWarning.textContent = `Tagesbudget überschritten: +${consumed - goal} kcal über dem Ziel.`;
    }
  }

  if (dietBudgetGoalInput) {
    dietBudgetGoalInput.value = goal && goal > 0 ? String(goal) : '';
  }

  renderDietBudgetChart(state);
}

function updateDietBudgetAfterAnalysis(totalCalories) {
  if (!totalCalories || !isFinite(totalCalories)) return null;
  const state = loadDietBudgetState();
  const todayKey = getTodayKey();
  const prev = Number(state.log[todayKey] || 0);
  state.log[todayKey] = prev + Math.round(Number(totalCalories));
  saveDietBudgetState(state);
  renderDietBudgetUI();
  return { total: state.log[todayKey], goal: state.goal || null };
}

if (dietBudgetSaveBtn && dietBudgetGoalInput) {
  dietBudgetSaveBtn.addEventListener('click', e => {
    e.preventDefault();
    const raw = dietBudgetGoalInput.value.trim();
    const val = Number(raw);
    if (!raw || isNaN(val) || val <= 0) {
      showError('Bitte gib ein gültiges Tagesziel in kcal an (z. B. 2200).');
      return;
    }
    const state = loadDietBudgetState();
    state.goal = Math.round(val);
    saveDietBudgetState(state);
    renderDietBudgetUI();
    showToast('Tagesziel gespeichert ✅');
  });
}

// -------------------------------------------------------------
// Initial UI
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
  initDebugUI();
  renderDietBudgetUI();

  const ok = await checkBackendReachable();

  if (String(location.protocol || '').toLowerCase() === 'file:') {
    setDietStatus(
      'Hinweis: Du hast die Datei per Doppelklick geöffnet (file://). Analyse funktioniert zuverlässig nur über Live Server oder in der App.',
      true
    );
  } else if (ok) {
    setDietStatus('Backend verbunden ✅');
  } else {
    setDietStatus('Backend nicht erreichbar. Bitte Backend starten (Port 4000) oder deployed Version nutzen.', true);
  }

  updateAnalyzeButtonState();

  console.log('[Diet-App] API_BASE =', API_BASE);
  console.log('[Diet-App] backendReachable =', backendReachable);
});
