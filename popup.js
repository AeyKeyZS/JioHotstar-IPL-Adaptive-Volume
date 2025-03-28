function UIRunning() {
  document.getElementById("start").setAttribute('hidden', 'true');
  document.getElementById("stop").removeAttribute('hidden');
  document.getElementById("status").removeAttribute('hidden');
  document.body.classList.add('active');
}

function UIStopped() {
  document.getElementById("start").removeAttribute('hidden');
  document.getElementById("stop").setAttribute('hidden', 'true');
  document.getElementById("status").setAttribute('hidden', 'true');
  document.body.classList.remove('active');
}

chrome.storage.local.get(['isJVARunning'], (result) => {
  const isRunning = result.isJVARunning || false; // Handle potential undefined value
  if (isRunning) {
    UIRunning();
  } else {
    UIStopped();
  }
});


const volumeSlider = document.getElementById('volume-control');
const volumeLabel = document.getElementById('volume-label');

function volControl(val) {
  volumeLabel.textContent = `Ad Volume: ${val * 100}`;
  chrome.storage.local.set({ JVAVolume: val });
}

volumeSlider.addEventListener('input', () => {
  const volumeValue = (volumeSlider.value / 100).toFixed(2);
  volControl(volumeValue);
});

chrome.storage.local.get(['JVAVolume'], (result) => {
  const volume = result.JVAVolume || 0.4;
  volumeSlider.value = volume * 100;
  volControl(volume)
});

document.getElementById('start').addEventListener('click', () => {
  console.log("🚀 Start button clicked");
  chrome.runtime.sendMessage({ action: "startTracking" });  // Notify background
  sendToContentScript({ action: "startTracking" });        // Notify content.js
  UIRunning();
});

document.getElementById('stop').addEventListener('click', () => {
  console.log("🛑 Stop button clicked");
  chrome.runtime.sendMessage({ action: "stopTracking" });  // Notify background
  sendToContentScript({ action: "stopTracking" });         // Notify content.js
  UIStopped();
});

// Helper function to send message to the active tab's content script
function sendToContentScript(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}
