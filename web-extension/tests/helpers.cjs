'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Controller } = require('../src/sim.js');

function ranges(...pairs) {
  return { length: pairs.length, start: i => pairs[i][0], end: i => pairs[i][1] };
}

class Video extends EventTarget {
  constructor(overrides = {}) {
    super();
    Object.assign(this, {
      currentTime: 120, duration: 600, currentSrc: 'https://media.test/one.mp4',
      src: 'https://media.test/one.mp4', readyState: 4, playbackRate: 1,
      paused: false, ended: false, preload: 'auto', mediaKeys: null,
      seekable: ranges([0, 600]), muted: false, volume: 1, isConnected: true,
      clientWidth: 640, clientHeight: 360, playCalls: 0, pauseCalls: 0
    }, overrides);
  }
  pause() { this.pauseCalls++; this.paused = true; this.dispatchEvent(new Event('pause')); }
  async play() {
    this.playCalls++;
    if (this.rejectPlay) throw new Error('NotAllowedError');
    this.paused = false;
    this.dispatchEvent(new Event('play'));
  }
  emit(name) { this.dispatchEvent(new Event(name)); }
}

const flush = () => new Promise(resolve => setImmediate(resolve));

async function contentHarness({ videos = [new Video()], options = {}, hidden = false } = {}) {
  let now = 0;
  let receiver;
  let storageChanged;
  let mutate;
  let hasAd = false;
  let live = false;
  let list = videos;
  const doc = new EventTarget();
  doc.hidden = hidden;
  doc.documentElement = {};
  doc.querySelectorAll = selector => selector === 'video' ? list : [];
  doc.querySelector = selector => {
    if (selector === '.ad-showing, .ad-interrupting') return hasAd ? {} : null;
    if (selector === '.ytp-live') return live ? {} : null;
    return null;
  };
  const win = new EventTarget();
  const location = { href: 'https://www.youtube.com/watch?v=one' };
  const context = vm.createContext({
    SimPlay: { Controller: class extends Controller { constructor() { super({ now: () => now }); } } },
    document: doc, window: win, location, AbortController, queueMicrotask,
    MutationObserver: class { constructor(fn) { mutate = fn; } observe() {} },
    chrome: {
      runtime: { onMessage: { addListener(fn) { receiver = fn; } } },
      storage: {
        local: { get: async defaults => ({ ...defaults, ...options }) },
        onChanged: { addListener(fn) { storageChanged = fn; } }
      }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8'), context);
  await flush();
  return {
    videos, document: doc, window: win,
    advance(ms) { now += ms; },
    message(type) {
      return new Promise((resolve, reject) => {
        const handled = receiver({ type }, {}, resolve);
        if (!handled) reject(new Error(`Message ${type} was not handled`));
      });
    },
    async hidden(value) { doc.hidden = value; doc.dispatchEvent(new Event('visibilitychange')); await flush(); },
    async settings(changes, area = 'local') {
      storageChanged(Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, { newValue: value }])), area);
      await flush();
    },
    async navigate(url) { location.href = url; win.dispatchEvent(new Event('popstate')); await flush(); },
    async replace(next) { list.forEach(v => { v.isConnected = false; }); list = next; mutate(); await flush(); },
    async ad(value) { hasAd = value; mutate(); await flush(); },
    async live(value) { live = value; mutate(); await flush(); },
    async mutate() { mutate(); await flush(); }
  };
}

module.exports = { Video, ranges, flush, contentHarness };
