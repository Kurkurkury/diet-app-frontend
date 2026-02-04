console.log('SCRIPT VERSION: PROD-OVERRIDE-AKTIV');
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
// - ✅ FIX: Dateiauswahl öffnet NICHT mehr zweimal (Label-Default block + guard)
// -------------------------------------------------------------

// -------------------------------------------------------------
// 1) API BASE
// -------------------------------------------------------------
const API_ROOT = 'https://diet-photo-backend.onrender.com';
const API_BASE = `${API_ROOT}/api`;

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

function toNumber(value, fallback = 0) {
  const num = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(num) ? num : fallback;
}

function formatNumber(value, digits = 0) {
  const num = toNumber(value, 0);
  return num.toFixed(digits);
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
let backendLatencyMs = null;

function renderApiStatus() {
  if (!dietApiStatusEl) return;
  if (String(location.protocol || '').toLowerCase() === 'file:') {
    dietApiStatusEl.textContent = 'API Status: file:// Modus (keine Requests möglich).';
    return;
  }
  if (!backendReachable) {
    dietApiStatusEl.textContent = 'Backend down…';
    return;
  }
  const latencyText = backendLatencyMs != null ? ` (${backendLatencyMs} ms)` : '';
  dietApiStatusEl.textContent = `Backend OK${latencyText}`;
}

async function checkBackendReachable() {
  if (String(location.protocol || '').toLowerCase() === 'file:') {
    backendReachable = false;
    backendLatencyMs = null;
    renderApiStatus();
    return false;
  }

  try {
    const start = performance.now();
    const res = await fetchWithTimeout(`${API_BASE}/health`, { method: 'GET' }, 20000);
    backendLatencyMs = Math.round(performance.now() - start);
    backendReachable = !!res && res.ok;
    renderApiStatus();
    return backendReachable;
  } catch (e) {
    backendReachable = false;
    backendLatencyMs = null;
    renderApiStatus();
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

  if (currentDietAnalysis) renderDietResult(currentDietAnalysis, { showToast: false });
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
const dietMacroCaloriesEl = document.getElementById('diet-macro-calories');
const dietMacroProteinEl = document.getElementById('diet-macro-protein');
const dietMacroFatEl = document.getElementById('diet-macro-fat');
const dietMacroCarbsEl = document.getElementById('diet-macro-carbs');
const dietMacroEstimateNoteEl = document.getElementById('diet-macro-estimate-note');
const dietPortionButtons = document.getElementById('diet-portion-buttons');
const dietPortionRange = document.getElementById('diet-portion-range');
const dietPortionLabel = document.getElementById('diet-portion-label');
const dietSaveEntryBtn = document.getElementById('diet-save-entry');
const dietEntryNotesInput = document.getElementById('diet-entry-notes');
const dietTodaySummaryEl = document.getElementById('diet-today-summary');
const dietTodayEntriesEl = document.getElementById('diet-today-entries');
const dietHistoryListEl = document.getElementById('diet-history-list');
const dietApiStatusEl = document.getElementById('diet-api-status');

const dietDailyPill = document.getElementById('diet-daily-pill');
const dietDailyPillText = document.getElementById('diet-daily-pill-text');

const dietDebugToggleBtn = document.getElementById('diet-debug-toggle');
const dietDebugPanel = document.getElementById('diet-debug-panel');
const dietDebugContent = document.getElementById('diet-debug-content');

const dietGalleryBtn = document.getElementById('diet-gallery-btn');
const dietUploadArea = document.getElementById('diet-upload-area');
const dietCameraBtn = document.getElementById('diet-camera-btn');

let currentDietAnalysis = null;
let currentPortionMultiplier = 1;
let editingEntryId = null;

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
 * ✅ FIX: Doppelt-Dialog endgültig verhindern
 * Ursache (typisch): Button liegt in/bei <label for="diet-file-input">,
 * dann öffnet der Browser den Dialog 1x automatisch + unser JS nochmal (queued).
 * Ergebnis: nach "Öffnen" poppt derselbe Dialog sofort nochmal auf.
 *
 * Lösung:
 * 1) Blockiere Label-Default-Click für die Buttons (capture-phase).
 * 2) Öffne den Dialog nur über eine kontrollierte Funktion mit Guard.
 */

let __dietFileDialogOpen = false;

function attachBlockNativeLabelClick(btn, fileInput) {
  try {
    if (!btn || !fileInput) return;
    const label = btn.closest && btn.closest('label');
    if (!label) return;

    const fileId = fileInput.id ? String(fileInput.id) : '';
    const labelFor = label.getAttribute('for');

    const labelTargetsThisInput =
      (labelFor && fileId && labelFor === fileId) ||
      (label.contains && label.contains(fileInput));

    if (!labelTargetsThisInput) return;

    // Blockiere den nativen Label-Klick (sonst öffnet der Browser selbst)
    label.addEventListener('click', (e) => {
      // Nur blocken, wenn der Klick aus dem Button-Bereich kam
      const fromBtn = e.target && (e.target === btn || (e.target.closest && e.target.closest('#' + btn.id)));
      if (!fromBtn) return;

      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }, true); // capture
  } catch {}
}

function openDietFileDialog(setupFn) {
  if (!dietFileInput) return;

  // Guard gegen queued second-open
  if (__dietFileDialogOpen) return;
  __dietFileDialogOpen = true;

  try { setupFn && setupFn(); } catch {}

  // wichtig: damit "gleiches Bild erneut" ein change auslöst
  try { dietFileInput.value = ''; } catch {}

  // Öffnen (einziges kontrolliertes click)
  try { dietFileInput.click(); } catch {}

  // Wenn Dialog geschlossen ist, kommt Fenster-Fokus zurück -> Guard reset
  const reset = () => {
    __dietFileDialogOpen = false;
    window.removeEventListener('focus', reset, true);
    try { dietFileInput.removeEventListener('change', resetOnChange, true); } catch {}
  };

  const resetOnChange = () => {
    __dietFileDialogOpen = false;
    try { dietFileInput.removeEventListener('change', resetOnChange, true); } catch {}
    window.removeEventListener('focus', reset, true);
  };

  window.addEventListener('focus', reset, true);
  // zusätzlich: falls focus nicht feuert (mobile/webview), reset auch on change
  try { dietFileInput.addEventListener('change', resetOnChange, true); } catch {}
}

function isClickFromDietPickButtons(e) {
  try {
    const t = e && e.target;
    if (!t || !t.closest) return false;
    return !!t.closest('#diet-gallery-btn, #diet-camera-btn');
  } catch {
    return false;
  }
}

// Blockiere nativen Label-Click falls vorhanden (wichtig!)
window.addEventListener('DOMContentLoaded', () => {
  if (dietGalleryBtn && dietFileInput) attachBlockNativeLabelClick(dietGalleryBtn, dietFileInput);
  if (dietCameraBtn && dietFileInput) attachBlockNativeLabelClick(dietCameraBtn, dietFileInput);

  // Sicherheit: Buttons sollen keine Form submitten
  try { if (dietGalleryBtn && dietGalleryBtn.tagName === 'BUTTON') dietGalleryBtn.type = 'button'; } catch {}
  try { if (dietCameraBtn && dietCameraBtn.tagName === 'BUTTON') dietCameraBtn.type = 'button'; } catch {}
});

if (dietGalleryBtn && dietFileInput) {
  dietGalleryBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    openDietFileDialog(() => {
      // sicherstellen: kein Kamera-capture vom letzten mal
      try { dietFileInput.removeAttribute('capture'); } catch {}
    });
  });
}

if (dietUploadArea && dietFileInput) {
  dietUploadArea.addEventListener('click', (e) => {
    // wenn der Klick eigentlich auf dem Button war -> NICHT nochmal öffnen
    if (isClickFromDietPickButtons(e)) return;

    e.preventDefault();

    openDietFileDialog(() => {
      try { dietFileInput.removeAttribute('capture'); } catch {}
    });
  });
}

if (dietCameraBtn && dietFileInput) {
  dietCameraBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    openDietFileDialog(() => {
      try { dietFileInput.setAttribute('capture', 'environment'); } catch {}
      // capture wieder entfernen, damit Galerie später normal geht
      setTimeout(() => {
        try { dietFileInput.removeAttribute('capture'); } catch {}
      }, 500);
    });
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
        currentDietAnalysis.calories_kcal = total;
        if (currentDietAnalysis.macrosEstimated) {
          const estimated = estimateMacrosFromCalories(total);
          currentDietAnalysis.protein_g = estimated.protein_g;
          currentDietAnalysis.fat_g = estimated.fat_g;
          currentDietAnalysis.carbs_g = estimated.carbs_g;
        }
      }

      if (dietDailyPill && dietDailyPillText) {
        dietDailyPillText.textContent = 'ℹ️ Kalorien wurden manuell angepasst – Einschätzung ist nur grob.';
        dietDailyPill.style.display = 'inline-flex';
      }

      const scaled = getScaledAnalysis(currentDietAnalysis, currentPortionMultiplier);
      if (dietMacroCaloriesEl) dietMacroCaloriesEl.textContent = `${formatNumber(scaled?.calories_kcal || 0)} kcal`;
      if (dietMacroProteinEl) dietMacroProteinEl.textContent = `${formatNumber(scaled?.protein_g || 0, 1)} g`;
      if (dietMacroFatEl) dietMacroFatEl.textContent = `${formatNumber(scaled?.fat_g || 0, 1)} g`;
      if (dietMacroCarbsEl) dietMacroCarbsEl.textContent = `${formatNumber(scaled?.carbs_g || 0, 1)} g`;
      updateMacroEstimateNote(currentDietAnalysis?.macrosEstimated);
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

function estimateMacrosFromCalories(calories) {
  const kcal = Math.max(0, toNumber(calories, 0));
  if (!kcal) {
    return { protein_g: 0, fat_g: 0, carbs_g: 0 };
  }
  const protein = (kcal * 0.3) / 4;
  const fat = (kcal * 0.3) / 9;
  const carbs = (kcal * 0.4) / 4;
  return {
    protein_g: Math.round(protein * 10) / 10,
    fat_g: Math.round(fat * 10) / 10,
    carbs_g: Math.round(carbs * 10) / 10
  };
}

function updateMacroEstimateNote(macrosEstimated) {
  if (!dietMacroEstimateNoteEl) return;
  dietMacroEstimateNoteEl.style.display = macrosEstimated ? 'block' : 'none';
  dietMacroEstimateNoteEl.textContent = macrosEstimated ? 'Makros geschätzt' : '';
}

function syncPortionUI(multiplier) {
  if (dietPortionRange) dietPortionRange.value = String(multiplier);
  if (dietPortionLabel) dietPortionLabel.textContent = `${multiplier}x`;

  if (dietPortionButtons) {
    dietPortionButtons.querySelectorAll('button').forEach(btn => {
      const val = toNumber(btn.dataset.multiplier, 1);
      btn.classList.toggle('is-active', val === multiplier);
    });
  }
}

function setPortionMultiplier(multiplier, options = {}) {
  const safe = Math.min(2, Math.max(0.5, toNumber(multiplier, 1) || 1));
  currentPortionMultiplier = safe;
  syncPortionUI(safe);

  if (options.render !== false && currentDietAnalysis) {
    renderDietResult(currentDietAnalysis, { showToast: false });
  }
}

function getScaledAnalysis(analysis, multiplier) {
  if (!analysis) return null;
  const mult = toNumber(multiplier, 1) || 1;
  return {
    ...analysis,
    calories_kcal: toNumber(analysis.calories_kcal, 0) * mult,
    protein_g: toNumber(analysis.protein_g, 0) * mult,
    fat_g: toNumber(analysis.fat_g, 0) * mult,
    carbs_g: toNumber(analysis.carbs_g, 0) * mult
  };
}

// -------------------------------------------------------------
// Tageslog (localStorage)
// -------------------------------------------------------------
const LS_FITNESS_LOG_KEY = 'fitness_log_v1';

function getLocalDateKey(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function makeId() {
  try {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `entry_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeEntry(raw) {
  const timestamp = raw?.timestamp ? new Date(raw.timestamp) : new Date();
  const safeTimestamp = isNaN(timestamp.getTime()) ? new Date() : timestamp;
  return {
    id: raw?.id || makeId(),
    timestamp: safeTimestamp.toISOString(),
    title: String(raw?.title || ''),
    portionMultiplier: toNumber(raw?.portionMultiplier, 1) || 1,
    calories_kcal: toNumber(raw?.calories_kcal, 0),
    protein_g: toNumber(raw?.protein_g, 0),
    fat_g: toNumber(raw?.fat_g, 0),
    carbs_g: toNumber(raw?.carbs_g, 0),
    notes: raw?.notes ? String(raw.notes) : '',
    imageThumb: raw?.imageThumb || null
  };
}

function loadLog() {
  try {
    const raw = localStorage.getItem(LS_FITNESS_LOG_KEY);
    if (!raw) return { version: 1, entries: [] };
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.entries)
        ? parsed.entries
        : [];
    return {
      version: 1,
      entries: entries.map(normalizeEntry)
    };
  } catch {
    return { version: 1, entries: [] };
  }
}

function saveLog(data) {
  try {
    localStorage.setItem(LS_FITNESS_LOG_KEY, JSON.stringify(data));
  } catch {}
}

function addEntry(entry) {
  const data = loadLog();
  const normalized = normalizeEntry(entry);
  data.entries.unshift(normalized);
  saveLog(data);
  return normalized;
}

function updateEntry(id, updates) {
  const data = loadLog();
  const idx = data.entries.findIndex(e => e.id === id);
  if (idx === -1) return null;
  data.entries[idx] = normalizeEntry({ ...data.entries[idx], ...updates, id });
  saveLog(data);
  return data.entries[idx];
}

function deleteEntry(id) {
  const data = loadLog();
  data.entries = data.entries.filter(e => e.id !== id);
  saveLog(data);
  return data.entries;
}

function getEntriesForToday() {
  const data = loadLog();
  const todayKey = getLocalDateKey();
  return data.entries.filter(e => getLocalDateKey(e.timestamp) === todayKey);
}

function sumEntries(entries) {
  return entries.reduce(
    (acc, entry) => {
      acc.calories_kcal += toNumber(entry.calories_kcal, 0);
      acc.protein_g += toNumber(entry.protein_g, 0);
      acc.fat_g += toNumber(entry.fat_g, 0);
      acc.carbs_g += toNumber(entry.carbs_g, 0);
      return acc;
    },
    { calories_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  );
}

function getEntriesLastNDays(n = 7) {
  const data = loadLog();
  const days = [];
  const today = new Date();

  for (let i = 0; i < n; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getLocalDateKey(d);
    const entries = data.entries.filter(e => getLocalDateKey(e.timestamp) === key);
    days.push({
      key,
      date: d,
      entries,
      totals: sumEntries(entries)
    });
  }

  return days;
}

function renderTodaySection() {
  if (!dietTodaySummaryEl || !dietTodayEntriesEl) return;
  const entries = getEntriesForToday();
  const totals = sumEntries(entries);

  if (!entries.length) {
    dietTodaySummaryEl.textContent = 'Noch keine Einträge für heute.';
    dietTodayEntriesEl.innerHTML = '';
    return;
  }

  dietTodaySummaryEl.textContent =
    `Heute gesamt: ${formatNumber(totals.calories_kcal)} kcal | ` +
    `P ${formatNumber(totals.protein_g)} g · F ${formatNumber(totals.fat_g)} g · C ${formatNumber(totals.carbs_g)} g`;

  const sorted = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  dietTodayEntriesEl.innerHTML = '';

  sorted.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'log-entry';
    row.dataset.id = entry.id;

    const date = new Date(entry.timestamp);
    const timeLabel = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    const title = entry.title || 'Ohne Titel';

    if (editingEntryId === entry.id) {
      row.innerHTML = `
        <div class="log-entry-header">
          <div>
            <div class="log-entry-title">Eintrag bearbeiten</div>
            <div class="log-entry-meta">${timeLabel}</div>
          </div>
        </div>
        <div class="log-entry-inputs">
          <label class="input-group">Titel
            <input type="text" class="input-text" data-field="title" value="${title.replace(/"/g, '&quot;')}" />
          </label>
          <label class="input-group">Portion (x)
            <input type="number" min="0.5" step="0.5" class="input-text" data-field="portionMultiplier" value="${entry.portionMultiplier}" />
          </label>
          <label class="input-group">kcal
            <input type="number" min="0" step="1" class="input-text" data-field="calories_kcal" value="${entry.calories_kcal}" />
          </label>
          <label class="input-group">Protein (g)
            <input type="number" min="0" step="0.1" class="input-text" data-field="protein_g" value="${entry.protein_g}" />
          </label>
          <label class="input-group">Fett (g)
            <input type="number" min="0" step="0.1" class="input-text" data-field="fat_g" value="${entry.fat_g}" />
          </label>
          <label class="input-group">Kohlenhydrate (g)
            <input type="number" min="0" step="0.1" class="input-text" data-field="carbs_g" value="${entry.carbs_g}" />
          </label>
          <label class="input-group">Notiz
            <input type="text" class="input-text" data-field="notes" value="${(entry.notes || '').replace(/"/g, '&quot;')}" />
          </label>
        </div>
        <div class="log-entry-actions">
          <button type="button" class="primary" data-action="save">Speichern</button>
          <button type="button" class="secondary" data-action="cancel">Abbrechen</button>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="log-entry-header">
          <div>
            <div class="log-entry-title">${title}</div>
            <div class="log-entry-meta">${timeLabel} · ${entry.portionMultiplier}x Portion</div>
          </div>
        </div>
        <div class="log-entry-macros">
          <span><strong>${formatNumber(entry.calories_kcal)}</strong> kcal</span>
          <span>P ${formatNumber(entry.protein_g)} g</span>
          <span>F ${formatNumber(entry.fat_g)} g</span>
          <span>C ${formatNumber(entry.carbs_g)} g</span>
        </div>
        ${entry.notes ? `<div class="log-entry-meta">Notiz: ${entry.notes}</div>` : ''}
        <div class="log-entry-actions">
          <button type="button" class="secondary" data-action="edit">Bearbeiten</button>
          <button type="button" class="secondary" data-action="delete">Löschen</button>
        </div>
      `;
    }

    dietTodayEntriesEl.appendChild(row);
  });
}

function renderHistorySection() {
  if (!dietHistoryListEl) return;
  const days = getEntriesLastNDays(7);

  if (!days.length) {
    dietHistoryListEl.innerHTML = '<div class="muted">Noch keine Daten.</div>';
    return;
  }

  dietHistoryListEl.innerHTML = '';
  days.reverse().forEach(day => {
    const label = day.date.toLocaleDateString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <div>${label}</div>
      <div class="history-macros">
        <span>${formatNumber(day.totals.calories_kcal)} kcal</span>
        <span>P ${formatNumber(day.totals.protein_g)} g</span>
        <span>F ${formatNumber(day.totals.fat_g)} g</span>
        <span>C ${formatNumber(day.totals.carbs_g)} g</span>
      </div>
    `;
    dietHistoryListEl.appendChild(row);
  });
}

function renderLogSections() {
  renderTodaySection();
  renderHistorySection();
  renderDietBudgetUI();
}

if (dietTodayEntriesEl) {
  dietTodayEntriesEl.addEventListener('click', (event) => {
    const btn = event.target && event.target.closest ? event.target.closest('button') : null;
    if (!btn) return;
    const row = btn.closest('.log-entry');
    if (!row) return;
    const id = row.dataset.id;
    const action = btn.dataset.action;
    if (!id || !action) return;

    if (action === 'edit') {
      editingEntryId = id;
      renderLogSections();
      return;
    }

    if (action === 'cancel') {
      editingEntryId = null;
      renderLogSections();
      return;
    }

    if (action === 'delete') {
      if (confirm('Eintrag wirklich löschen?')) {
        deleteEntry(id);
        editingEntryId = null;
        renderLogSections();
      }
      return;
    }

    if (action === 'save') {
      const inputs = row.querySelectorAll('[data-field]');
      const updates = {};
      inputs.forEach(input => {
        const field = input.dataset.field;
        if (!field) return;
        if (['calories_kcal', 'protein_g', 'fat_g', 'carbs_g', 'portionMultiplier'].includes(field)) {
          updates[field] = Math.max(0, toNumber(input.value, 0));
        } else {
          updates[field] = input.value;
        }
      });
      if (updates.portionMultiplier) {
        updates.portionMultiplier = Math.max(0.5, updates.portionMultiplier);
      }
      updateEntry(id, updates);
      editingEntryId = null;
      renderLogSections();
    }
  });
}

function renderDietResult(normalized, options = {}) {
  if (normalized) currentDietAnalysis = normalized;
  const shouldToast = options.showToast !== false && !!normalized;

  // ✅ Immer sichtbar: kurzer Toast
  if (shouldToast) {
    try {
      const totalToast = Math.round(Number((normalized && normalized.calories_kcal) || normalized?.totalCalories || 0));
      showToast(`Analyse: ${totalToast} kcal ✅`, 2200);
    } catch {}
  }

  // ✅ Fallback immer rendern (damit du sicher was siehst)
  try {
    renderFallbackResult(normalized);
  } catch {}

  const scaled = getScaledAnalysis(currentDietAnalysis, currentPortionMultiplier);
  const total = Math.round(Number(scaled?.calories_kcal || 0));
  const note = currentDietAnalysis?.note || '';

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
      currentDietAnalysis ? `${total} kcal (geschätzt)` : 'Noch keine Analyse';
  }
  if (dietResultNoteEl) dietResultNoteEl.textContent = note;

  if (dietDailyPill && dietDailyPillText) {
    const fits = currentDietAnalysis?.fitsDailyBudget || 'unsicher';
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

  if (dietItemsListEl) renderIngredientsList(currentDietAnalysis?.items || []);

  if (dietMacroCaloriesEl) dietMacroCaloriesEl.textContent = `${formatNumber(scaled?.calories_kcal || 0)} kcal`;
  if (dietMacroProteinEl) dietMacroProteinEl.textContent = `${formatNumber(scaled?.protein_g || 0, 1)} g`;
  if (dietMacroFatEl) dietMacroFatEl.textContent = `${formatNumber(scaled?.fat_g || 0, 1)} g`;
  if (dietMacroCarbsEl) dietMacroCarbsEl.textContent = `${formatNumber(scaled?.carbs_g || 0, 1)} g`;
  updateMacroEstimateNote(!!currentDietAnalysis?.macrosEstimated);

  if (dietSaveEntryBtn) {
    dietSaveEntryBtn.disabled = !currentDietAnalysis;
  }

  if (currentDietAnalysis && currentDietAnalysis.totalCalories != null) {
    renderDietBudgetUI();
  }
}

// Normalisiert Backend-Payload
function normalizeBackendPayload(data) {
  const a = (data && data.result) ? data.result : null;
  const b = (data && data.analysis) ? data.analysis : null;
  const c = (data && data.data) ? data.data : null;
  const src = a || b || c || data || {};

  const calories = toNumber(src.calories_kcal ?? src.totalCalories ?? 0, 0);
  let protein = toNumber(src.protein_g ?? 0, 0);
  let fat = toNumber(src.fat_g ?? 0, 0);
  let carbs = toNumber(src.carbs_g ?? 0, 0);
  let macrosEstimated = false;

  if (calories > 0 && protein === 0 && fat === 0 && carbs === 0) {
    const estimated = estimateMacrosFromCalories(calories);
    protein = estimated.protein_g;
    fat = estimated.fat_g;
    carbs = estimated.carbs_g;
    macrosEstimated = true;
  }

  // Support: /analysis enthält ingredients[] und/oder items[]
  if (Array.isArray(src.items)) {
    return {
      dishName: src.title || src.dishName || '',
      totalCalories: calories,
      calories_kcal: calories,
      protein_g: protein,
      fat_g: fat,
      carbs_g: carbs,
      note: src.note || '',
      fitsDailyBudget: src.fitsDailyBudget || 'unsicher',
      macrosEstimated,
      items: src.items.map(it => ({
        name: it.name,
        comment: it.comment || '',
        estimatedCalories: typeof it.estimatedCalories === 'number' ? it.estimatedCalories : 0
      }))
    };
  }

  if (Array.isArray(src.ingredients)) {
    return {
      dishName: src.title || src.dishName || '',
      totalCalories: calories,
      calories_kcal: calories,
      protein_g: protein,
      fat_g: fat,
      carbs_g: carbs,
      note: src.note || '',
      fitsDailyBudget: src.fitsDailyBudget || 'unsicher',
      macrosEstimated,
      items: src.ingredients.map(it => ({
        name: it.name,
        comment: (it.estimatedWeightGrams != null ? `${it.estimatedWeightGrams} g` : ''),
        estimatedCalories: typeof it.calories === 'number' ? it.calories : 0
      }))
    };
  }

  return {
    dishName: src.title || src.dishName || '',
    totalCalories: calories,
    calories_kcal: calories,
    protein_g: protein,
    fat_g: fat,
    carbs_g: carbs,
    note: src.note || '',
    fitsDailyBudget: src.fitsDailyBudget || 'unsicher',
    macrosEstimated,
    items: []
  };
}

// Analyse: /analyze-food (base64-json)
async function analyzeCurrentImage() {
  if (!backendReachable) {
    if (String(location.protocol || '').toLowerCase() === 'file:') {
      showError('Analyse geht hier nicht: bitte über Live Server öffnen (nicht per Doppelklick).');
    } else {
      showError('Backend nicht erreichbar. Bitte später erneut versuchen.');
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
    const base64 = await fileToBase64Raw(file);
    debugLog('POST', `${API_BASE}/analyze-food`, 'base64Len=', base64?.length);

    const payload = { imageBase64: base64 };
    if (isDebugEnabled()) payload.debug = true;

    const res = await fetchWithTimeout(`${API_BASE}/analyze-food`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 90000);

    debugLog('Response /analyze-food status=', res.status);

    if (!res.ok) {
      throw new Error(`Analyse fehlgeschlagen (Status ${res.status})`);
    }

    const data = await res.json();
    console.log('[Diet-App] Analyse-Response (raw):', data);

    const normalized = normalizeBackendPayload(data);
    console.log('[Diet-App] Analyse normalisiert:', normalized);

    setPortionMultiplier(1, { render: false });
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

if (dietPortionButtons) {
  dietPortionButtons.addEventListener('click', (event) => {
    const btn = event.target && event.target.closest ? event.target.closest('button') : null;
    if (!btn) return;
    const value = toNumber(btn.dataset.multiplier, 1);
    setPortionMultiplier(value);
  });
}

if (dietPortionRange) {
  dietPortionRange.addEventListener('input', (event) => {
    setPortionMultiplier(event.target.value);
  });
}

if (dietSaveEntryBtn) {
  dietSaveEntryBtn.addEventListener('click', () => {
    if (!currentDietAnalysis) {
      showError('Bitte zuerst eine Analyse durchführen.');
      return;
    }

    const scaled = getScaledAnalysis(currentDietAnalysis, currentPortionMultiplier);
    const entry = addEntry({
      timestamp: new Date().toISOString(),
      title: currentDietAnalysis.dishName || 'Unbekanntes Gericht',
      portionMultiplier: currentPortionMultiplier,
      calories_kcal: Math.round(scaled.calories_kcal),
      protein_g: Math.round(scaled.protein_g * 10) / 10,
      fat_g: Math.round(scaled.fat_g * 10) / 10,
      carbs_g: Math.round(scaled.carbs_g * 10) / 10,
      notes: dietEntryNotesInput ? dietEntryNotesInput.value.trim() : ''
    });

    if (dietEntryNotesInput) dietEntryNotesInput.value = '';
    showToast('Eintrag gespeichert ✅');
    editingEntryId = null;
    renderLogSections();
    return entry;
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

  const days = getEntriesLastNDays(7).reverse().map(day => {
    const weekday = day.date.toLocaleDateString('de-CH', { weekday: 'short' });
    return { label: weekday, value: Math.round(day.totals.calories_kcal) };
  });

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
  const todayTotals = sumEntries(getEntriesForToday());
  const consumed = Math.round(todayTotals.calories_kcal);
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
        'Setze ein Tagesziel, damit dein Kalorienbudget automatisch aus deinem Tageslog berechnet wird.';
    } else if (consumed === 0) {
      dietBudgetWarning.textContent =
        'Noch keine Mahlzeit heute erfasst – speichere einen Eintrag, um dein Tagesbudget zu aktualisieren.';
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
  renderLogSections();
  setPortionMultiplier(1);
  renderApiStatus();

  const ok = await checkBackendReachable();

  if (String(location.protocol || '').toLowerCase() === 'file:') {
    setDietStatus(
      'Hinweis: Du hast die Datei per Doppelklick geöffnet (file://). Analyse funktioniert zuverlässig nur über Live Server oder in der App.',
      true
    );
  } else if (ok) {
    setDietStatus('Backend verbunden ✅');
  } else {
    setDietStatus('Backend nicht erreichbar. Bitte später erneut versuchen.', true);
  }

  updateAnalyzeButtonState();

  // Auto-retry to handle Render cold start
  let tries = 0;
  const maxTries = 25; // ~150 seconds
  const retryInterval = setInterval(async () => {
    if (backendReachable) {
      clearInterval(retryInterval);
      return;
    }

    tries++;
    const ok2 = await checkBackendReachable();
    if (ok2) {
      setDietStatus('Backend verbunden ✅');
      updateAnalyzeButtonState();
      clearInterval(retryInterval);
      return;
    }

    if (tries >= maxTries) {
      clearInterval(retryInterval);
    }
  }, 6000);

  console.log('[Diet-App] API_BASE =', API_BASE);
  console.log('[Diet-App] backendReachable =', backendReachable);
});
