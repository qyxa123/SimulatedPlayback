'use strict';
const byId = id => document.getElementById(id);
const format = value => {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` :
    `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
let tabId;
let active = false;
let busy = false;
let timer;

function render(state) {
  active = state.active;
  document.body.classList.toggle('on', active);
  byId('modeBadge').textContent = active ? '模拟进行中' : '普通播放';
  byId('timer').textContent = format(state.position);
  byId('duration').textContent = format(state.duration);
  byId('rate').textContent = `${state.rate}×`;
  byId('progress').max = state.duration || 1;
  byId('progress').value = state.position || 0;
  byId('positionLabel').textContent = active ? '虚拟位置 · 原视频已暂停' : '当前播放位置';
  byId('toggle').textContent = active ? '恢复到此位置' : '开始模拟';
  byId('toggle').disabled = busy || (!active && !state.available);
  byId('cancel').hidden = !active;
  byId('cancel').disabled = busy;
  byId('message').textContent = state.error || (!state.available && !active ? state.unavailableReason : '');
  for (const name of ['autoHidden', 'autoMuted']) byId(name).checked = !!state.options[name];
}

async function request(type = 'status') {
  if (tabId == null) return;
  const state = await chrome.tabs.sendMessage(tabId, { type });
  if (!state || !state.options) throw new Error('无法读取播放器状态');
  render(state);
}

function disconnected() {
  clearInterval(timer);
  byId('modeBadge').textContent = '尚未连接';
  byId('toggle').disabled = true;
  byId('cancel').hidden = true;
  byId('message').textContent = '请打开 YouTube 或 Bilibili 视频页；安装或更新扩展后，请刷新视频页。';
}

async function action(type) {
  if (busy) return;
  busy = true;
  byId('toggle').disabled = true;
  byId('cancel').disabled = true;
  try { await request(type); }
  catch { disconnected(); }
  finally {
    busy = false;
    try { await request(); } catch { disconnected(); }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  byId('toggle').addEventListener('click', () => action(active ? 'resume' : 'start'));
  byId('cancel').addEventListener('click', () => action('cancel'));
  try {
    const saved = await chrome.storage.local.get({ autoHidden: false, autoMuted: false });
    for (const name of ['autoHidden', 'autoMuted']) byId(name).checked = saved[name] === true;
  } catch { byId('message').textContent = '无法读取设置，使用默认选项。'; }
  for (const name of ['autoHidden', 'autoMuted']) {
    byId(name).addEventListener('change', async () => {
      try { await chrome.storage.local.set({ [name]: byId(name).checked }); }
      catch { byId('message').textContent = '设置保存失败，请重试。'; }
    });
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab?.id;
    if (tabId == null) throw new Error('No active tab');
    await request();
    timer = setInterval(() => { if (!busy) request().catch(disconnected); }, 1000);
  } catch { disconnected(); }
});
window.addEventListener('pagehide', () => clearInterval(timer));
