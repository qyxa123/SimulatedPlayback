'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Controller } = require('../src/sim.js');
const { Video, ranges } = require('./helpers.cjs');

function setup(overrides = {}) {
  let now = 1000;
  return { video: new Video(overrides), controller: new Controller({ now: () => now }), advance: ms => { now += ms; } };
}

test('starts at the actual position and catches up after a throttled or sleeping tab', async () => {
  const { controller, video, advance } = setup({ playbackRate: 1.5 });
  assert.equal(controller.start(video, 'one'), true);
  assert.equal(controller.status(video, 'one').position, 120);
  assert.equal(video.paused, true);
  advance(60_000);
  assert.equal(controller.position(), 210);
  assert.equal(await controller.resume(video, 'one'), true);
  assert.equal(video.currentTime, 210);
  assert.equal(video.playCalls, 1);
  assert.equal(video.preload, 'auto');
  assert.equal(controller.session, null);
});

test('repeated start does not reset the time anchor or pause twice', () => {
  const { controller, video, advance } = setup();
  controller.start(video, 'one');
  advance(5000);
  controller.start(video, 'one');
  advance(5000);
  assert.equal(controller.position(), 130);
  assert.equal(video.pauseCalls, 1);
});

test('speed changes apply only to elapsed time after the change', async () => {
  const { controller, video, advance } = setup();
  controller.start(video, 'one');
  advance(10_000);
  video.playbackRate = 2;
  video.emit('ratechange');
  advance(5000);
  assert.equal(controller.position(), 140);
  await controller.resume(video, 'one');
  assert.equal(video.currentTime, 140);
});

test('duration is a hard upper bound and reaching it does not restart playback', async () => {
  const { controller, video, advance } = setup({ currentTime: 590, playbackRate: 2 });
  controller.start(video, 'one');
  advance(3_600_000);
  assert.equal(controller.position(), 600);
  assert.equal(await controller.resume(video, 'one'), true);
  assert.equal(video.currentTime, 600);
  assert.equal(video.playCalls, 0);
});

test('a previously paused video remains paused after seeking to virtual progress', async () => {
  const { controller, video, advance } = setup({ paused: true, preload: 'metadata' });
  controller.start(video, 'one');
  advance(1000);
  assert.equal(await controller.resume(video, 'one'), true);
  assert.equal(video.currentTime, 121);
  assert.equal(video.paused, true);
  assert.equal(video.playCalls, 0);
  assert.equal(video.preload, 'metadata');
});

test('cancel drops virtual progress and restores the original preload hint', async () => {
  const { controller, video, advance } = setup();
  controller.start(video, 'one');
  advance(10_000);
  controller.cancel();
  assert.equal(video.currentTime, 120);
  assert.equal(video.preload, 'auto');
  assert.equal(video.paused, true);
  assert.equal(await controller.resume(video, 'one'), false);
  assert.equal(video.playCalls, 0);
});

for (const event of ['play', 'seeking', 'emptied', 'loadedmetadata']) {
  test(`external ${event} cancels a pending simulation`, () => {
    const { controller, video } = setup();
    controller.start(video, 'one');
    video.emit(event);
    assert.equal(controller.status(video, 'one').active, false);
    assert.equal(video.preload, 'auto');
    assert.equal(video.currentTime, 120);
  });
}

test('detached listeners cannot cancel a later session on another video', () => {
  const { controller, video } = setup();
  const replacement = new Video({ currentTime: 30 });
  controller.start(video, 'one');
  controller.cancel();
  controller.start(replacement, 'two');
  video.emit('play');
  assert.equal(controller.status(replacement, 'two').active, true);
});

for (const change of ['source', 'url', 'element', 'missing']) {
  test(`changing ${change} never restores stale progress`, async () => {
    const { controller, video, advance } = setup();
    controller.start(video, 'one');
    advance(50_000);
    let current = video;
    let key = 'one';
    if (change === 'source') video.currentSrc = 'https://media.test/two.mp4';
    if (change === 'url') key = 'two';
    if (change === 'element') current = new Video({ currentTime: 7 });
    if (change === 'missing') current = null;
    assert.equal(await controller.resume(current, key), false);
    assert.equal(video.currentTime, 120);
    assert.equal(video.preload, 'auto');
    if (current) assert.equal(current.playCalls, 0);
  });
}

for (const [label, override] of [
  ['live duration', { duration: Infinity }], ['unknown duration', { duration: NaN }],
  ['empty media', { duration: 0 }], ['unloaded metadata', { readyState: 0 }],
  ['nonseekable', { seekable: ranges() }], ['DRM', { mediaKeys: {} }],
  ['invalid speed', { playbackRate: 0 }], ['ended media', { ended: true }]
]) {
  test(`rejects ${label} without changing player state`, () => {
    const { controller, video } = setup(override);
    assert.equal(controller.start(video, 'one'), false);
    assert.equal(controller.session, null);
    assert.notEqual(controller.error, '');
    assert.equal(video.pauseCalls, 0);
    assert.equal(video.preload, 'auto');
  });
}

test('missing player has a useful unavailable state', () => {
  const { controller } = setup();
  assert.equal(controller.start(null, 'one'), false);
  assert.equal(controller.status(null, 'one').available, false);
});

test('seek gaps cannot silently clamp virtual progress to a different segment', async () => {
  const { controller, video, advance } = setup();
  controller.start(video, 'one');
  advance(10_000);
  video.seekable = ranges([0, 125], [150, 600]);
  assert.equal(await controller.resume(video, 'one'), false);
  assert.equal(video.currentTime, 120);
  assert.equal(video.playCalls, 0);
  assert.notEqual(controller.error, '');
  assert.equal(video.preload, 'auto');
});

test('a target in a later seekable range is accepted', async () => {
  const { controller, video, advance } = setup();
  controller.start(video, 'one');
  advance(60_000);
  video.seekable = ranges([0, 125], [150, 600]);
  assert.equal(await controller.resume(video, 'one'), true);
  assert.equal(video.currentTime, 180);
});

test('autoplay denial is reported after seeking and leaves no active simulation', async () => {
  const { controller, video, advance } = setup({ rejectPlay: true });
  controller.start(video, 'one');
  advance(2000);
  assert.equal(await controller.resume(video, 'one'), false);
  assert.equal(video.currentTime, 122);
  assert.equal(video.paused, true);
  assert.notEqual(controller.error, '');
  assert.equal(controller.session, null);
  assert.equal(video.preload, 'auto');
});

test('an unsupported rate during simulation stops safely', () => {
  const { controller, video } = setup();
  controller.start(video, 'one');
  video.playbackRate = NaN;
  video.emit('ratechange');
  assert.equal(controller.session, null);
  assert.equal(video.preload, 'auto');
  assert.notEqual(controller.error, '');
});

test('duration changes cancel stale progress but unchanged notifications do not', () => {
  const { controller, video } = setup();
  controller.start(video, 'one');
  video.emit('durationchange');
  assert.equal(controller.status(video, 'one').active, true);
  video.duration = 300;
  video.emit('durationchange');
  assert.equal(controller.status(video, 'one').active, false);
  assert.equal(video.preload, 'auto');
  assert.equal(video.currentTime, 120);
});
