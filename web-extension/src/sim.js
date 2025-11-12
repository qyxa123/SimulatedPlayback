(() => {
  const k = (url, src) => `${url}|${src || ''}`;
  const g = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  };
  const s = (key, obj) => { localStorage.setItem(key, JSON.stringify(obj)); };
  const f = () => document.querySelector('video');
  const b = () => {
    const list = performance.getEntriesByType('resource');
    let bytes = 0;
    for (const e of list) {
      if (typeof e.transferSize === 'number') bytes += e.transferSize;
    }
    return bytes;
  };
  const m = {
    running: false,
    startTs: 0,
    timer: null,
    metrics: { simSeconds: 0, bytes: 0 }
  };
  const start = () => {
    if (m.running) return;
    const v = f();
    if (!v) return;
    const key = k(location.href, v.currentSrc || v.src);
    v.pause();
    v.preload = 'none';
    m.running = true;
    m.startTs = Date.now();
    m.metrics.bytes = b();
    m.timer = setInterval(() => {
      const prev = g(key) || { t: 0 };
      prev.t += 1;
      s(key, prev);
      m.metrics.simSeconds += 1;
    }, 1000);
  };
  const stop = (resume) => {
    if (!m.running) return;
    const v = f();
    const key = v ? k(location.href, v.currentSrc || v.src) : null;
    clearInterval(m.timer);
    m.timer = null;
    m.running = false;
    m.metrics.bytes = Math.max(0, b() - m.metrics.bytes);
    if (resume && v && key) {
      const p = g(key) || { t: 0 };
      try { v.currentTime = p.t; } catch {}
      v.play().catch(() => {});
    }
  };
  const getProgress = () => {
    const v = f();
    if (!v) return 0;
    const key = k(location.href, v.currentSrc || v.src);
    const p = g(key);
    return p ? p.t : 0;
  };
  const setProgress = (t) => {
    const v = f();
    if (!v) return;
    const key = k(location.href, v.currentSrc || v.src);
    s(key, { t: Math.max(0, Math.floor(t)) });
  };
  const panel = () => {
    let el = document.getElementById('simplay-panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'simplay-panel';
      el.style.position = 'fixed';
      el.style.bottom = '64px';
      el.style.right = '16px';
      el.style.padding = '8px 10px';
      el.style.background = 'rgba(0,0,0,0.7)';
      el.style.color = '#fff';
      el.style.fontSize = '12px';
      el.style.borderRadius = '6px';
      el.style.zIndex = '2147483647';
      document.body.appendChild(el);
    }
    el.textContent = `sim:${m.metrics.simSeconds}s bytes:${m.metrics.bytes}`;
  };
  const toggleBtn = () => {
    let btn = document.getElementById('simplay-toggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'simplay-toggle';
      btn.textContent = 'Sim OFF';
      btn.style.position = 'fixed';
      btn.style.bottom = '16px';
      btn.style.right = '16px';
      btn.style.padding = '8px 10px';
      btn.style.background = '#1976d2';
      btn.style.color = '#fff';
      btn.style.border = 'none';
      btn.style.borderRadius = '6px';
      btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      btn.style.cursor = 'pointer';
      btn.style.zIndex = '2147483647';
      document.body.appendChild(btn);
      btn.addEventListener('click', () => {
        const on = btn.dataset.on === '1';
        if (on) {
          btn.dataset.on = '0';
          btn.textContent = 'Sim OFF';
          stop(true);
        } else {
          btn.dataset.on = '1';
          btn.textContent = 'Sim ON';
          start();
        }
        panel();
      });
    }
  };
  const wireVideoEvents = () => {
    const v = f();
    if (!v) return;
    v.addEventListener('play', () => { stop(false); panel(); });
    v.addEventListener('pause', () => { panel(); });
    v.addEventListener('loadedmetadata', () => { panel(); });
  };
  const init = () => {
    toggleBtn();
    wireVideoEvents();
    panel();
  };
  window.SimPlay = { start, stop, getProgress, setProgress, init };
})();
