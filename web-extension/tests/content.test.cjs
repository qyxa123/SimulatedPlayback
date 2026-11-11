'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Video, contentHarness, flush } = require('./helpers.cjs');

test('popup messages reflect real state and resume at elapsed position', async () => {
  const h = await contentHarness();
  assert.equal((await h.message('status')).active, false);
  assert.equal((await h.message('start')).active, true);
  h.advance(20_000);
  assert.equal((await h.message('status')).position, 140);
  assert.equal((await h.message('resume')).active, false);
  assert.equal(h.videos[0].currentTime, 140);
  assert.equal(h.videos[0].paused, false);
});

test('missing player does not report a successful start', async () => {
  const h = await contentHarness({ videos: [] });
  const state = await h.message('start');
  assert.equal(state.active, false);
  assert.equal(state.available, false);
  assert.notEqual(state.error, '');
});

test('late insertion and dynamic player replacement are discovered', async () => {
  const h = await contentHarness({ videos: [] });
  const first = new Video();
  await h.replace([first]);
  assert.equal((await h.message('start')).active, true);
  h.advance(30_000);
  const second = new Video({ currentTime: 8 });
  await h.replace([second]);
  assert.equal((await h.message('status')).active, false);
  await h.message('resume');
  assert.equal(second.currentTime, 8);
  assert.equal(first.preload, 'auto');
});

test('SPA navigation drops old progress without seeking a reused element', async () => {
  const h = await contentHarness();
  await h.message('start');
  h.advance(25_000);
  await h.navigate('https://www.youtube.com/watch?v=two');
  assert.equal((await h.message('status')).active, false);
  assert.equal(h.videos[0].currentTime, 120);
});

test('a changed media source on a reused element cancels the session', async () => {
  const h = await contentHarness();
  await h.message('start');
  h.videos[0].currentSrc = 'blob:new-video';
  await h.mutate();
  assert.equal((await h.message('status')).active, false);
  assert.equal(h.videos[0].currentTime, 120);
});

test('automatic modes default off even when page is hidden and video muted', async () => {
  const h = await contentHarness({ videos: [new Video({ muted: true })], hidden: true });
  assert.equal((await h.message('status')).active, false);
  assert.equal(h.videos[0].paused, false);
});

test('opt-in hidden mode simulates and returns to virtual position on visibility', async () => {
  const h = await contentHarness({ options: { autoHidden: true } });
  await h.hidden(true);
  assert.equal((await h.message('status')).reason, 'automatic');
  h.advance(15_000);
  await h.hidden(false);
  assert.equal((await h.message('status')).active, false);
  assert.equal(h.videos[0].currentTime, 135);
  assert.equal(h.videos[0].paused, false);
});

test('hidden mode does not turn a user-paused video into simulated playback', async () => {
  const h = await contentHarness({ videos: [new Video({ paused: true })], options: { autoHidden: true } });
  await h.hidden(true);
  h.advance(15_000);
  await h.hidden(false);
  assert.equal((await h.message('status')).active, false);
  assert.equal(h.videos[0].currentTime, 120);
  assert.equal(h.videos[0].playCalls, 0);
});

test('video mute and unmute automatically simulate then resume when opted in', async () => {
  const h = await contentHarness({ options: { autoMuted: true } });
  const video = h.videos[0];
  video.muted = true;
  video.emit('volumechange');
  await flush();
  assert.equal((await h.message('status')).active, true);
  h.advance(5000);
  video.muted = false;
  video.emit('volumechange');
  await flush();
  assert.equal((await h.message('status')).active, false);
  assert.equal(video.currentTime, 125);
});

test('combined auto modes wait until neither condition is true to resume', async () => {
  const h = await contentHarness({ options: { autoHidden: true, autoMuted: true } });
  await h.hidden(true);
  h.videos[0].muted = true;
  h.videos[0].emit('volumechange');
  await h.hidden(false);
  assert.equal((await h.message('status')).active, true);
  h.videos[0].muted = false;
  h.videos[0].emit('volumechange');
  await flush();
  assert.equal((await h.message('status')).active, false);
});

test('manual simulation is not resumed by an unrelated visibility change', async () => {
  const h = await contentHarness({ options: { autoHidden: true } });
  await h.message('start');
  await h.hidden(true);
  await h.hidden(false);
  assert.equal((await h.message('status')).reason, 'manual');
});

test('changing settings applies immediately and ignores unrelated storage areas', async () => {
  const h = await contentHarness({ hidden: true });
  await h.settings({ autoHidden: true }, 'sync');
  assert.equal((await h.message('status')).active, false);
  await h.settings({ autoHidden: true });
  assert.equal((await h.message('status')).active, true);
  h.advance(1000);
  await h.settings({ autoHidden: false });
  assert.equal((await h.message('status')).active, false);
  assert.equal(h.videos[0].currentTime, 121);
});

test('explicit resume while hidden is not immediately undone by automation', async () => {
  const h = await contentHarness({ options: { autoHidden: true } });
  await h.hidden(true);
  await h.message('resume');
  await h.mutate();
  assert.equal((await h.message('status')).active, false);
  await h.hidden(false);
  await h.hidden(true);
  assert.equal((await h.message('status')).active, true);
});

test('discard stays at original position and does not restart automatic simulation', async () => {
  const h = await contentHarness({ options: { autoHidden: true } });
  await h.hidden(true);
  h.advance(5000);
  await h.message('cancel');
  await h.mutate();
  assert.equal((await h.message('status')).active, false);
  assert.equal(h.videos[0].currentTime, 120);
  assert.equal(h.videos[0].paused, true);
});

test('known advertising markers block start and cancel an existing session', async () => {
  const h = await contentHarness();
  await h.message('start');
  await h.ad(true);
  const state = await h.message('start');
  assert.equal(state.available, false);
  assert.equal(state.active, false);
  assert.equal(h.videos[0].currentTime, 120);
});

test('separate tabs do not share simulation progress or active state', async () => {
  const first = await contentHarness();
  const second = await contentHarness();
  await first.message('start');
  first.advance(5000);
  assert.equal((await first.message('status')).position, 125);
  assert.equal((await second.message('status')).position, 120);
  assert.equal((await second.message('status')).active, false);
});

test('pagehide clears the session and restores the preload hint', async () => {
  const h = await contentHarness();
  await h.message('start');
  h.window.dispatchEvent(new Event('pagehide'));
  assert.equal((await h.message('status')).active, false);
  assert.equal(h.videos[0].preload, 'auto');
});

test('initial playback of an already-muted video enters the opted-in automatic mode', async () => {
  const video = new Video({ muted: true, paused: true });
  const h = await contentHarness({ videos: [video], options: { autoMuted: true } });
  assert.equal((await h.message('status')).active, false);
  await video.play();
  await flush();
  assert.equal((await h.message('status')).reason, 'automatic');
  assert.equal(video.paused, true);
});

test('explicit play during simulation overrides automation until its condition resets', async () => {
  const video = new Video({ muted: true });
  const h = await contentHarness({ videos: [video], options: { autoMuted: true } });
  assert.equal((await h.message('status')).active, true);
  await video.play();
  await flush();
  await h.mutate();
  assert.equal((await h.message('status')).active, false);
  assert.equal(video.paused, false);
  video.muted = false;
  video.emit('volumechange');
  await flush();
  video.muted = true;
  video.emit('volumechange');
  await flush();
  assert.equal((await h.message('status')).active, true);
});

test('YouTube live marker rejects finite DVR media and cancels an active simulation', async () => {
  const h = await contentHarness();
  await h.message('start');
  await h.live(true);
  const state = await h.message('start');
  assert.equal(state.active, false);
  assert.equal(state.available, false);
  assert.equal(h.videos[0].currentTime, 120);
  assert.equal(h.videos[0].preload, 'auto');
});

test('Bilibili live URL rejects even a finite seekable player', async () => {
  const h = await contentHarness({ options: { autoMuted: true } });
  await h.navigate('https://live.bilibili.com/123');
  h.videos[0].muted = true;
  h.videos[0].emit('volumechange');
  await flush();
  const state = await h.message('start');
  assert.equal(state.active, false);
  assert.equal(state.available, false);
  assert.equal(h.videos[0].pauseCalls, 0);
});
