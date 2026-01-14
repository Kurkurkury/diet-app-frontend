// ===============================
// SCRIPT-DIET.JS – COMPLETE FILE
// ===============================

console.log('[Master-Assistant] script-diet.js geladen');

let dietLastCapturedFile = null;

// ===============================
// Kamera-Overlay öffnen
// ===============================

function openDietCameraOverlay() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Dein Browser unterstützt den Kamera-Zugriff nicht.');
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      // Video-Element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;

      // Overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.85)';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '9999';
      overlay.style.gap = '16px';

      // Buttons
      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📷 Foto aufnehmen';
      captureBtn.style.padding = '12px 22px';
      captureBtn.style.borderRadius = '12px';
      captureBtn.style.border = 'none';
      captureBtn.style.fontSize = '18px';
      captureBtn.style.cursor = 'pointer';
      captureBtn.style.background = '#22c55e';
      captureBtn.style.color = '#0b1120';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Abbrechen';
      cancelBtn.style.padding = '10px 18px';
      cancelBtn.style.borderRadius = '10px';
      cancelBtn.style.border = 'none';
      cancelBtn.style.fontSize = '16px';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.style.background = '#dc2626';
      cancelBtn.style.color = '#f9fafb';

      overlay.appendChild(video);
      overlay.appendChild(captureBtn);
      overlay.appendChild(cancelBtn);
      document.body.appendChild(overlay);

      function closeOverlay() {
        stream.getTracks().forEach((t) => t.stop());
        document.body.removeChild(overlay);
      }

      cancelBtn.addEventListener('click', () => {
        closeOverlay();
      });

      captureBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (!blob) {
            alert('Konnte Bild nicht erfassen.');
            closeOverlay();
            return;
          }

          const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' });
          dietLastCapturedFile = file;

          const dt = new DataTransfer();
          dt.items.add(file);

          const fileInput = document.getElementById('diet-file-input');
          if (fileInput) {
            fileInput.files = dt.files;
          } else {
            console.warn('[Master-Assistant] diet-file-input nicht gefunden.');
          }

          closeOverlay();
        }, 'image/jpeg');
      });
    })
    .catch((err) => {
      console.error(err);
      alert('Kamera konnte nicht gestartet werden: ' + err.message);
    });
}

// ===============================
// Event-Bindings
// ===============================

window.addEventListener('DOMContentLoaded', () => {
  const cameraBtn = document.getElementById('diet-camera-btn');
  const fileInput = document.getElementById('diet-file-input');

  if (!cameraBtn || !fileInput) {
    console.warn(
      '[Master-Assistant] Kamera-Button oder File-Input für Diet-Modul nicht gefunden.'
    );
    return;
  }

  cameraBtn.addEventListener('click', openDietCameraOverlay);
});
