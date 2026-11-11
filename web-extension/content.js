(() => {
  'use strict';
  const defaults = { autoHidden: false, autoMuted: false };
  let options = { ...defaults };
  let current = null;
  let binding = null;
  let autoBlocked = false;
  let lastKey = location.href;
  const controller = new SimPlay.Controller();
  const key = () => location.href;
  const inAd = () => !!document.querySelector('.ad-showing, .ad-interrupting');
  const isLive = () => /^https:\/\/live\.bilibili\.com\//.test(key()) || !!document.querySelector('.ytp-live');
  const activeCondition = () => (options.autoHidden && document.hidden) ||
    (options.autoMuted && current && (current.muted || current.volume === 0));

  function refresh() {
    if (lastKey !== key()) {
      controller.cancel();
      autoBlocked = false;
      lastKey = key();
    }
    const videos = [...document.querySelectorAll('video')];
    const next = current?.isConnected && controller.session ? current :
      videos.sort((a, b) => Number(!b.paused) - Number(!a.paused) ||
        b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] || null;
    controller.validate(next, key());
    if (next !== current) {
      if (binding) binding.abort();
      binding = new AbortController();
      current = next;
      autoBlocked = false;
      if (current) {
        for (const name of ['volumechange', 'play', 'loadedmetadata', 'emptied', 'seeking']) {
          current.addEventListener(name, () => {
            if ((name === 'play' || name === 'seeking') && controller.session) autoBlocked = true;
            queueMicrotask(reconcile);
          }, { signal: binding.signal });
        }
      }
    }
    if (inAd()) {
      controller.cancel('检测到广告，模拟模式不可用。');
      autoBlocked = true;
    }
    if (isLive()) {
      controller.cancel('直播不支持模拟模式。');
      autoBlocked = true;
    }
  }

  async function reconcile() {
    refresh();
    const condition = activeCondition();
    if (!condition) autoBlocked = false;
    if (controller.session && controller.session.reason !== 'manual' && !condition) {
      await controller.resume(current, key());
    } else if (!controller.session && condition && !autoBlocked && current && !current.paused && !inAd() && !isLive()) {
      controller.start(current, key(), 'automatic');
    }
  }

  const status = () => {
    refresh();
    const result = controller.status(current, key());
    if (inAd()) {
      result.available = false;
      result.unavailableReason = '广告播放期间不可启用模拟模式。';
    }
    if (isLive()) {
      result.available = false;
      result.unavailableReason = '直播不支持模拟模式。';
    }
    return { ...result, options };
  };

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (!msg || !['status', 'start', 'resume', 'cancel'].includes(msg.type)) return;
    (async () => {
      refresh();
      if (msg.type === 'start' && !inAd() && !isLive()) controller.start(current, key());
      if (msg.type === 'resume') {
        autoBlocked = true;
        await controller.resume(current, key());
      }
      if (msg.type === 'cancel') {
        autoBlocked = true;
        controller.cancel();
      }
      return status();
    })().then(reply, () => reply({ ...status(), error: '操作失败，请刷新页面后重试。' }));
    return true;
  });

  chrome.storage.local.get(defaults).then(saved => {
    options = { autoHidden: !!saved.autoHidden, autoMuted: !!saved.autoMuted };
    reconcile();
  }).catch(() => reconcile());
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const name of Object.keys(defaults)) {
      if (changes[name]) options[name] = changes[name].newValue === true;
    }
    reconcile();
  });
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('popstate', reconcile);
  window.addEventListener('hashchange', reconcile);
  document.addEventListener('yt-navigate-start', () => { controller.cancel(); autoBlocked = true; });
  window.addEventListener('pagehide', () => controller.cancel());
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; reconcile(); });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class'] });
  reconcile();
})();
