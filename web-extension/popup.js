const q = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};
const getState = (url) => new Promise((resolve) => {
  chrome.runtime.sendMessage({ type: 'getState', url }, (res) => resolve(res && !!res.on));
});
const setState = (url, on) => new Promise((resolve) => {
  chrome.runtime.sendMessage({ type: 'setState', url, on }, () => resolve(true));
});
const updateUI = (on) => {
  const root = document.body;
  const badge = document.getElementById('modeBadge');
  const toggle = document.getElementById('toggle');
  root.classList.toggle('on', !!on);
  badge.textContent = on ? 'Simulated Mode Active' : 'Normal Mode';
};
const tickTimer = async (tab) => {
  const timerEl = document.getElementById('timer');
  const res = await new Promise((resolve) => chrome.tabs.sendMessage(tab.id, { type: 'getProgress' }, resolve));
  timerEl.textContent = `${(res && res.t) || 0}s`;
};
document.addEventListener('DOMContentLoaded', async () => {
  const toggleEl = document.getElementById('toggle');
  const tab = await q();
  const url = tab && tab.url ? tab.url : '';
  const on = await getState(url);
  updateUI(on);
  setInterval(() => { if (tab) tickTimer(tab); }, 1000);
  toggleEl.addEventListener('click', async () => {
    const next = !document.body.classList.contains('on');
    updateUI(next);
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'toggle', on: next });
    }
    await setState(url, next);
  });
});
