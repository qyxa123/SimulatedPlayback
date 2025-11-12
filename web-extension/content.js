(() => {
  const keyFor = (url, src) => `${url}|${src || ''}`;
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const video = () => document.querySelector('video');
  const state = { running: false, timer: null };
  const start = () => {
    if (state.running) return;
    const v = video();
    if (!v) return;
    const k = keyFor(location.href, v.currentSrc || v.src);
    v.pause();
    v.preload = 'none';
    state.running = true;
    state.timer = setInterval(() => {
      const p = read(k) || { t: 0 };
      p.t += 1;
      write(k, p);
    }, 1000);
  };
  const stop = (resume) => {
    if (!state.running) return;
    state.running = false;
    clearInterval(state.timer);
    state.timer = null;
    const v = video();
    if (resume && v) {
      const k = keyFor(location.href, v.currentSrc || v.src);
      const p = read(k) || { t: 0 };
      try { v.currentTime = p.t; } catch {}
      v.play().catch(() => {});
    }
  };
  const restoreOnVisit = () => {
    const v = video();
    if (!v) return;
    v.addEventListener('loadedmetadata', () => {
      const k = keyFor(location.href, v.currentSrc || v.src);
      const p = read(k);
      if (p && typeof p.t === 'number') {
        try { v.currentTime = p.t; } catch {}
      }
    });
  };
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'toggle') {
      if (msg.on) start(); else stop(true);
      const v = video();
      const k = v ? keyFor(location.href, v.currentSrc || v.src) : location.href;
      chrome.runtime.sendMessage({ type: 'setState', url: k, on: !!msg.on });
      sendResponse({ ok: true });
      return true;
    }
    if (msg && msg.type === 'getProgress') {
      const v = video();
      const k = v ? keyFor(location.href, v.currentSrc || v.src) : location.href;
      const p = read(k) || { t: 0 };
      sendResponse({ t: p.t });
      return true;
    }
  });
  const init = () => {
    restoreOnVisit();
    const k = location.href;
    chrome.runtime.sendMessage({ type: 'getState', url: k }, (res) => {
      if (res && res.on) start();
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
