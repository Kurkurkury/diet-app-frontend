console.log("[PC] geladen");

const pcSelect = document.getElementById("pc-helper-problem");
const pcBtn = document.getElementById("pc-helper-run");
const pcOut = document.getElementById("pc-helper-output");

const pcSolutions = {
  fps: [
    {
      label: "Grafiktreiber neu installieren",
      steps: [
        "Win + X → Geräte-Manager öffnen",
        "Display Adapter → Grafikkarte → Rechtsklick → Deinstallieren",
        "Haken setzen: Treibersoftware löschen",
        "PC neu starten",
        "Neuen Treiber laden (offizielle Seite)",
        "Installieren → CLEAN INSTALLATION → Neustart"
      ]
    },
    {
      label: "NVIDIA/AMD Settings optimieren",
      steps: [
        "Rechtsklick Desktop → Nvidia Systemsteuerung",
        "3D-Einstellungen verwalten",
        "Power Management → Prefer Maximum Performance",
        "V-Sync AUS",
        "FPS-Limit: MonitorHz - 3 (z.B. 144Hz → 141 FPS)"
      ]
    },
    {
      label: "Windows Energieprofil setzen",
      steps: [
        "Win + X → Energieoptionen",
        "Höchstleistung auswählen",
        "USB Energiesparen AUS",
        "PCI Energiesparen AUS"
      ]
    },
    {
      label: "Taskmanager/Hintergrundprozesse",
      steps: [
        "Strg+Shift+Esc → Taskmanager",
        "Autostart Tab → unnötige Apps deaktivieren",
        "Reiter CPU → sortieren",
        "Prozesse schließen, die nicht nötig sind",
        "FPS jetzt im Game testen"
      ]
    },
    {
      label: "Temperaturen prüfen",
      steps: [
        "HWInfo oder MSI Afterburner starten",
        "CPU unter 80°C? GPU unter 75°C?",
        "Lüfterkurve erhöhen",
        "Gehäuse entstauben",
        "FPS testen"
      ]
    },
    {
      label: "Netzwerk/Latency",
      steps: [
        "LAN statt WLAN verwenden",
        "Router neu starten",
        "CMD: ping google.com -t",
        "Hohe Ping-Spikes? Anderes Netzwerk testen",
        "QoS im Router aktivieren"
      ]
    }
  ],
  slow: [
    {
      label: "Autostart/Kram",
      steps: [
        "Taskmanager → Autostart",
        "Unnötige deaktivieren",
        "Neustart"
      ]
    }
  ],
  cpu: [
    {
      label: "Top-Prozess finden",
      steps: [
        "Taskmanager → CPU sortieren",
        "Verursacher finden",
        "Beenden falls unnötig"
      ]
    }
  ],
  temp: [
    {
      label: "Temperaturen prüfen",
      steps: [
        "HWInfo starten",
        "CPU < 80°C? GPU < 75°C?",
        "Lüfterkurve anpassen"
      ]
    }
  ]
};

pcBtn?.addEventListener("click", () => {
  const key = pcSelect.value;
  const list = pcSolutions[key];

  pcOut.innerHTML = list
    .map(
      (item, idx) => `<div class="solution-item" data-i="${idx}">${item.label}</div>`
    )
    .join("");

  pcOut.querySelectorAll(".solution-item").forEach((el) => {
    el.addEventListener("click", () => showSteps(key, el.dataset.i));
  });
});

function showSteps(key, i) {
  const item = pcSolutions[key][i];

  pcOut.innerHTML = `
    <div class="journal-entry">
      <h3 class="journal-entry-title">${item.label}</h3>
      <ol style="margin-top:8px;">
        ${item.steps.map((s) => `<li>${s}</li>`).join("")}
      </ol>
      <div style="text-align:right;margin-top:12px;">
        <button id="back-btn" class="btn-secondary">Zurück</button>
      </div>
    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", () => {
    pcBtn.click();
  });
}
