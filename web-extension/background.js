chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  const key = `sim:on:${msg.url}`;
  if (msg.type === 'getState') {
    chrome.storage.local.get([key]).then((res) => {
      sendResponse({ on: !!res[key] });
    });
    return true;
  }
  if (msg.type === 'setState') {
    const obj = {}; obj[key] = !!msg.on;
    chrome.storage.local.set(obj).then(() => {
      try {
        const title = msg.on ? 'Simulated Mode ON' : 'Simulated Mode OFF';
        const message = msg.on ? 'Video progress will advance without downloading.' : 'Resuming normal playback.';
        chrome.notifications && chrome.notifications.create({
          type: 'basic', iconUrl: 'icon.png', title, message
        });
      } catch {}
      sendResponse({ ok: true });
    });
    return true;
  }
});
