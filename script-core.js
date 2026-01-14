console.log("[Core] geladen");

// API-Basis (zeigt direkt auf Render + /api)
const API_BASE = "https://diet-app-backend-new.onrender.com";
alert("FRONTEND VERSION AKTIV");

// =====================
// Navigation
// =====================
const navItems = document.querySelectorAll(".nav-item");
const pageSections = document.querySelectorAll(".page-section");

function activatePage(pageId) {
  pageSections.forEach((s) => {
    s.classList.toggle("page-section-hidden", s.id !== pageId);
  });

  navItems.forEach((btn) => {
    btn.classList.toggle(
      "nav-item-active",
      btn.getAttribute("data-page") === pageId
    );
  });
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    activatePage(btn.getAttribute("data-page"));
  });
});

// Default
activatePage("diet-page");

// =====================
// Backend Status
// =====================
const backendBtn = document.getElementById("check-backend");
const backendOut = document.getElementById("backend-result-text");

if (backendBtn) {
  backendBtn.addEventListener("click", async () => {
    backendOut.textContent = "prüfe...";
    try {
      const res = await fetch(`${API_BASE}/health`);
      backendOut.textContent = JSON.stringify(await res.json(), null, 2);
    } catch (err) {
      backendOut.textContent = err.message;
    }
  });
}

// =====================
// Journal
// =====================
const journalDate = document.getElementById("journal-date");
const journalArea = document.getElementById("journal-area");
const journalTitle = document.getElementById("journal-title");
const journalNote = document.getElementById("journal-note");
const journalSave = document.getElementById("journal-save");
const journalList = document.getElementById("journal-list");

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function loadJournal(date) {
  if (!journalList) return;
  journalList.textContent = "lade...";

  try {
    const res = await fetch(`${API_BASE}/journal?date=${date}`);
    const data = await res.json();

    if (!data.entries || !data.entries.length) {
      journalList.textContent = "keine Einträge";
      return;
    }

    journalList.innerHTML = data.entries
      .map(
        (e) => `
      <div class="journal-entry">
        <div class="journal-entry-main">
          <span class="journal-entry-time">${e.time || ""}</span>
          <span class="journal-entry-area">${e.area}</span>
          <span class="journal-entry-title">${e.title}</span>
        </div>
        ${e.note ? `<div class="journal-entry-note">${e.note}</div>` : ""}
      </div>`
      )
      .join("");
  } catch (err) {
    journalList.textContent = "Fehler";
  }
}

if (journalDate) {
  journalDate.value = today();
  loadJournal(today());

  journalDate.addEventListener("change", () => {
    loadJournal(journalDate.value);
  });
}

if (journalSave) {
  journalSave.addEventListener("click", async () => {
    const payload = {
      date: journalDate.value,
      area: journalArea.value,
      title: journalTitle.value,
      note: journalNote.value,
    };

    await fetch(`${API_BASE}/journal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    journalTitle.value = "";
    journalNote.value = "";

    loadJournal(journalDate.value);
  });
}
