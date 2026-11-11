// Optional real-media/UI harness (Chrome messaging mocked, no extension install):
// npm install --no-save playwright, then
// CHROMIUM_PATH=/path/to/chromium node web-extension/tests/browser-smoke.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const extension = path.resolve(__dirname, '..');
// Local deterministic audio carried by a video element: no remote media needed.
function wav() {
  const sampleRate = 8000;
  const data = Buffer.alloc(sampleRate * 120 * 2 + 44);
  data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24); data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(data.length - 44, 40);
  return data;
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'simplay-browser-'));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  try {
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const audio = wav();
    await context.route('https://www.youtube.com/**', route => {
      if (route.request().url().includes('/sample.wav')) {
        const range = route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);
        const start = range ? Number(range[1]) : 0;
        const end = range?.[2] ? Math.min(Number(range[2]), audio.length - 1) : audio.length - 1;
        return route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav', body: audio.subarray(start, end + 1),
          headers: { 'accept-ranges': 'bytes', ...(range ? { 'content-range': `bytes ${start}-${end}/${audio.length}` } : {}) } });
      }
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>SimPlay fixture</title><video style="width:640px;height:360px" controls src="/sample.wav"></video>' });
    });
    const videoPage = await context.newPage();
    await videoPage.goto('https://www.youtube.com/watch?v=simplay-fixture');
    await videoPage.evaluate(() => {
      window.chrome = {
        runtime: { onMessage: { addListener(fn) { window.receive = fn; } } },
        storage: {
          local: { get: async defaults => defaults },
          onChanged: { addListener(fn) { window.storageChanged = fn; } }
        }
      };
    });
    await videoPage.addScriptTag({ path: path.join(extension, 'src/sim.js') });
    await videoPage.addScriptTag({ path: path.join(extension, 'content.js') });
    await videoPage.waitForFunction(() => document.querySelector('video').readyState >= 2);
    await videoPage.evaluate(async () => {
      const video = document.querySelector('video');
      video.currentTime = 35;
      await new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
      await video.play();
    });
    const popup = await context.newPage();
    await popup.exposeFunction('fixtureMessage', msg => videoPage.evaluate(msg =>
      new Promise(resolve => window.receive(msg, {}, resolve)), msg));
    const preferences = { autoHidden: false, autoMuted: false };
    await popup.exposeFunction('fixtureSettings', async changes => {
      Object.assign(preferences, changes);
      await videoPage.evaluate(changes => window.storageChanged(
        Object.fromEntries(Object.entries(changes).map(([key, newValue]) => [key, { newValue }])), 'local'), changes);
    });
    await popup.addInitScript(() => {
      window.chrome = {
        tabs: { query: async () => [{ id: 1 }], sendMessage: (_, msg) => window.fixtureMessage(msg) },
        storage: { local: { get: async defaults => defaults, set: changes => window.fixtureSettings(changes) } }
      };
    });
    await popup.route('https://simplay.test/**', route => {
      const filename = new URL(route.request().url()).pathname.slice(1) || 'popup.html';
      const contentType = filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : 'text/html';
      return route.fulfill({ contentType, body: fs.readFileSync(path.join(extension, filename)) });
    });
    await popup.goto('https://simplay.test/popup.html');
    await popup.getByRole('button', { name: '开始模拟', exact: true }).click();
    await popup.getByText('模拟进行中', { exact: true }).waitFor();
    assert.equal(await videoPage.evaluate(() => document.querySelector('video').paused), true);
    const atStart = await videoPage.evaluate(() => document.querySelector('video').currentTime);
    assert(atStart >= 35);
    await popup.waitForTimeout(1250);
    fs.mkdirSync(path.resolve(extension, '../dist'), { recursive: true });
    await popup.setViewportSize({ width: 350, height: 640 });
    await popup.screenshot({ path: path.resolve(extension, '../dist/popup.png'), fullPage: true });
    await popup.getByRole('button', { name: '恢复到此位置', exact: true }).click();
    await popup.getByText('普通播放', { exact: true }).waitFor();
    await videoPage.waitForFunction(() => !document.querySelector('video').paused);
    assert((await videoPage.evaluate(() => document.querySelector('video').currentTime)) > atStart + 1);
    await popup.getByRole('button', { name: '开始模拟', exact: true }).click();
    await popup.getByRole('button', { name: '放弃模拟进度，停在原位置', exact: true }).click();
    assert.equal(await videoPage.evaluate(() => document.querySelector('video').paused), true);

    await popup.getByLabel('视频静音时模拟').check();
    await videoPage.evaluate(async () => { const v = document.querySelector('video'); await v.play(); });
    await videoPage.evaluate(() => { document.querySelector('video').muted = true; });
    await popup.getByText('模拟进行中', { exact: true }).waitFor();
    await videoPage.evaluate(() => { document.querySelector('video').muted = false; });
    await popup.getByText('普通播放', { exact: true }).waitFor();

    await popup.getByRole('button', { name: '开始模拟', exact: true }).click();
    await videoPage.evaluate(() => {
      history.pushState({}, '', '/watch?v=replacement');
      document.body.appendChild(document.createElement('div'));
    });
    await popup.getByText('普通播放', { exact: true }).waitFor();
    await videoPage.evaluate(() => document.querySelector('video').remove());
    await popup.waitForFunction(() => document.getElementById('toggle').disabled);
    await popup.getByText('没有找到视频，请先打开并播放一个视频。', { exact: true }).waitFor();
    await videoPage.close();
    await popup.getByText('尚未连接', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: Chromium real-media/UI harness (Chrome API mocked): anchored progress, resume, cancel, mute automation, SPA cancellation, missing video and disconnect states; no page errors.');
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
