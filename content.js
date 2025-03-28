console.log("✅ Content script loaded");

let adQueue = [];
let isProcessingAd = false;
const videoSelector = 'video';
let isTracking = false;

chrome.storage.local.get(['isJVARunning'], (result) => {
  isTracking = result.isJVARunning || false;
  if (isTracking) chrome.runtime.sendMessage({ action: "startTracking" });  // Notify background
});


const style = document.createElement('style');
style.innerHTML = `
@keyframes pulse-volume {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

#volume-toast.pulse-volume {
  animation: pulse-volume 0.2s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
`;
document.head.appendChild(style);


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startTracking") {
    isTracking = true;
    console.log("🚀 Content Tracking Started");
  } else if (message.action === "stopTracking") {
    isTracking = false;
    restoreVolume();
    console.log("🛑 Content Tracking Stopped");
  }
  chrome.storage.local.set({ isJVARunning: isTracking }); // Update Chrome storage
});

function getVideoElement() {
  return document.querySelector(videoSelector);
}

// function showToast(message, bgColor = '#5b2fc2') {
//   const videoContainer = document.querySelector('.video-container, video')?.parentElement;
//   let toast = document.createElement('div');
//   toast.innerText = message;
//   toast.style.position = 'fixed';
//   toast.style.bottom = '80px';
//   toast.style.right = '20px';
//   toast.style.padding = '10px 20px';
//   toast.style.backgroundColor = bgColor;
//   toast.style.color = '#fff';
//   toast.style.fontSize = '14px';
//   toast.style.borderRadius = '8px';
//   toast.style.zIndex = '9999';
//   toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
//   videoContainer.appendChild(toast);

//   setTimeout(() => toast.remove(), 3000); 
// }

function createVolumeToast() {
  // Check if already added
  if (document.getElementById('volume-toast')) return;
  const videoContainer = document.querySelector('.video-container, video')?.parentElement;

  const toast = document.createElement('div');
  toast.id = 'volume-toast';
  toast.style.position = 'fixed';
  toast.style.bottom = '50px';
  toast.style.right = '50px';
  toast.style.width = '120px';
  toast.style.height = '120px';
  toast.style.zIndex = '999999';
  toast.style.pointerEvents = 'none';

  toast.innerHTML = `
      <svg width="120" height="120" style="transform: rotate(90deg);">
          <circle cx="60" cy="60" r="50" stroke="#444" stroke-width="8" fill="none" />
          <circle id="volume-progress" cx="60" cy="60" r="50" 
              stroke="#00FF00" stroke-width="8" fill="none" 
              stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="314" />
      </svg>
      <img src="${chrome.runtime.getURL('icons/JHVM.png')}" 
           alt="Logo" 
           style="position:absolute; top:20px; left:20px; width:80px; height:80px; border-radius:50%;">
  `;
  videoContainer.appendChild(toast);
}

function updateVolumeToast(volume) {
  createVolumeToast();
  const circle = document.getElementById('volume-progress');
  const toast = document.getElementById('volume-toast');
  circle.style.transition = 'stroke-dashoffset 0.5s linear';
  const circumference = 314;  // 2 * Math.PI * r (50)
  const offset = circumference * (1 - volume);
  circle.style.strokeDashoffset = 0;
  setTimeout(() => {
    circle.style.strokeDashoffset = offset;
  }, 100);
  toast.classList.add('pulse-volume');
  setTimeout(() => toast.classList.remove('pulse-volume'), 200);
}

let volumeToastTimeout = null; // 🔥 Add this global to control toast removal
function removeVolumeToast() {
  const circle = document.getElementById('volume-progress');
  const toast = document.getElementById('volume-toast');
  setTimeout(() => {
    if (circle) circle.style.strokeDashoffset = '0';
  }, 100);  // slight delay to ensure DOM is ready
  // Clear any existing hide timeout
  if (volumeToastTimeout) {
    clearTimeout(volumeToastTimeout);
    volumeToastTimeout = null;
  }
  toast.classList.add('pulse-volume');
  setTimeout(() => toast.classList.remove('pulse-volume'), 200); // Remove after animation
  // Auto-hide after 3 seconds
  volumeToastTimeout = setTimeout(() => {
    if (adQueue.length === 0 && !isProcessingAd) {
      if (toast) toast.remove();
    }
  }, 3000);
}


function reduceVolume() {
  const video = getVideoElement();
  chrome.storage.local.get(['JVAVolume'], (result) => {
    const volume = result.JVAVolume || false;
    if (video && video.volume !== volume) {
      console.log("🔉 Reducing volume");
      // showToast('Ad Started - Volume Reduced', '#cf0b56');
      updateVolumeToast(volume);
      video.volume = volume;
    }
  });
}

function restoreVolume() {
  const video = getVideoElement();
  if (video && video.volume !== 1) {
    console.log("🔊 Restoring volume");
    // showToast('Ad Ended - Volume Restored', '#5b2fc2');
    removeVolumeToast();
    video.volume = 1;
  }
}

function processAdQueue() {
  if (isProcessingAd || adQueue.length === 0) return;

  const ad = adQueue.shift();  // Fetch the first ad in queue
  isProcessingAd = true;
  reduceVolume();
  console.log(`🎯 Processing Ad. Duration: ${ad.duration}s`);

  setTimeout(() => {
    console.log('✅ Ad Completed');
    isProcessingAd = false;
    if (adQueue.length === 0) {
      restoreVolume();
    }
    // Continue to next ad if queued
    processAdQueue();
  }, ad.duration * 1000);
}

function enqueueAd(duration) {
  console.log(`📥 Ad Queued - Duration: ${duration}s`);
  adQueue.push({ duration });
  processAdQueue();
}

// ✅ Example trigger when ad is detected
function handleAdDetection(adDuration) {
  enqueueAd(adDuration);
}

// ✅ Listen to background ad detection messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "adCaptured" && request.adDuration && isTracking) {
    handleAdDetection(request.adDuration);
  }
});
