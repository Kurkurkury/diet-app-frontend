console.log("[Budget] script-budget.js geladen");

//
// LocalStorage helpers
//
function loadBudgetEntries() {
  try {
    return JSON.parse(localStorage.getItem("budgetEntries")) || [];
  } catch (e) {
    console.error("Budget localStorage corrupted", e);
    return [];
  }
}

function saveBudgetEntries(entries) {
  localStorage.setItem("budgetEntries", JSON.stringify(entries));
}

//
// UI references
//
const monthInput = document.getElementById("budget-month");
const amountInput = document.getElementById("budget-amount");
const categoryInput = document.getElementById("budget-category");
const noteInput = document.getElementById("budget-note");
const addBtn = document.getElementById("budget-add");
const summaryArea = document.getElementById("budget-summary");

//
// State
//
let entries = loadBudgetEntries();

//
// Add entry
//
addBtn.addEventListener("click", () => {
  const month = monthInput.value;
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value.trim();
  const note = noteInput.value.trim();

  if (!month || isNaN(amount) || !category) {
    alert("Bitte Monat, Betrag und Kategorie ausfüllen.");
    return;
  }

  const entry = { month, amount, category, note };
  entries.push(entry);
  saveBudgetEntries(entries);

  monthInput.value = "";
  amountInput.value = "";
  categoryInput.value = "";
  noteInput.value = "";

  renderBudget();
});

//
// Render
//
function renderBudget() {
  summaryArea.innerHTML = "";

  if (entries.length === 0) {
    summaryArea.innerHTML = "<p>Keine Einträge vorhanden.</p>";
    return;
  }

  // Group by month, then by category
  const byMonth = {};

  for (const e of entries) {
    if (!byMonth[e.month]) byMonth[e.month] = {};
    if (!byMonth[e.month][e.category]) byMonth[e.month][e.category] = 0;
    byMonth[e.month][e.category] += e.amount;
  }

  // Output
  for (const month of Object.keys(byMonth).sort()) {
    const monthBox = document.createElement("div");
    monthBox.className = "budget-month";

    const title = document.createElement("h3");
    title.textContent = formatMonth(month);
    monthBox.appendChild(title);

    for (const category of Object.keys(byMonth[month]).sort()) {
      const row = document.createElement("div");
      row.className = "budget-row";

      const name = document.createElement("span");
      name.textContent = category;

      const sum = document.createElement("span");
      sum.textContent = byMonth[month][category].toFixed(2) + " CHF";

      row.appendChild(name);
      row.appendChild(sum);

      monthBox.appendChild(row);
    }

    summaryArea.appendChild(monthBox);
  }
}

//
// Month formatting: 2025-12 → Dezember 2025
//
function formatMonth(m) {
  const [year, month] = m.split("-");
  const months = [
    "Januar","Februar","März","April","Mai","Juni",
    "Juli","August","September","Oktober","November","Dezember"
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

//
// Initial render
//
renderBudget();
