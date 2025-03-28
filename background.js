let isTracking = false;

function extractAdDuration(adName) {
  const regex = /(?:VCTA|ENG|HIN)_(\d{2})(?:_|$)/;
  const match = adName.match(regex);
  return match ? parseInt(match[1]) : null;
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startTracking") {
    isTracking = true;
    console.log("🚀 Ad Tracking Started");
  } else if (message.action === "stopTracking") {
    isTracking = false;
    console.log("🛑 Ad Tracking Stopped");
  }
});

// Capture all outgoing requests
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (!isTracking) return;

    const url = details.url;
    if (url.includes('bifrost-api.hotstar.com/v1/events/track/ct_impression')) {
      console.log("🎯 AD Impression URL Captured:", url);

      const urlParams = new URLSearchParams(url.split('?')[1]);
      const adName = urlParams.get('adName');
      console.log("🎬 Ad Name:", adName);
      const adDurationMatch = extractAdDuration(adName) || 20;
      console.log("⏱️ Ad Duration:", adDurationMatch, "seconds");

      chrome.tabs.sendMessage(details.tabId, {
        action: "adCaptured",
        adDuration: adDurationMatch
      });
    }
  },
  { urls: ["https://bifrost-api.hotstar.com/v1/events/track/ct_impression*"] },
  []
);
