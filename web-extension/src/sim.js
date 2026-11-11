(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SimPlay = api;
})(typeof globalThis === 'object' ? globalThis : this, () => {
  'use strict';

  // No interval: elapsed wall time includes suspended/background tabs.
  class Controller {
    constructor({ now = Date.now, changed = () => {} } = {}) {
      this.now = now;
      this.changed = changed;
      this.session = null;
      this.error = '';
    }

    problem(video) {
      if (!video) return '没有找到视频，请先打开并播放一个视频。';
      if (video.mediaKeys) return '暂不支持受 DRM 保护的视频。';
      if (video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 0) {
        return '仅支持已加载时长的点播视频，暂不支持直播。';
      }
      if (!video.seekable || !video.seekable.length) return '视频暂时无法跳转，请播放几秒后重试。';
      if (!Number.isFinite(video.playbackRate) || video.playbackRate <= 0) return '不支持当前播放速度。';
      if (video.ended || video.currentTime >= video.duration) return '视频已结束。';
      return '';
    }

    position() {
      const s = this.session;
      if (!s) return null;
      return Math.min(s.duration, Math.max(0, s.position + Math.max(0, this.now() - s.at) / 1000 * s.rate));
    }

    valid(video, key) {
      const s = this.session;
      return !s || (s.video === video && s.key === key && s.source === (video.currentSrc || video.src));
    }

    validate(video, key) {
      if (!this.valid(video, key)) this.cancel('视频已切换，已取消旧视频的模拟进度。');
    }

    start(video, key, reason = 'manual') {
      this.validate(video, key);
      if (this.session) return true;
      this.error = this.problem(video);
      if (this.error) return false;
      const s = {
        video, key, source: video.currentSrc || video.src,
        position: video.currentTime, at: this.now(), rate: video.playbackRate,
        duration: video.duration, wasPlaying: !video.paused,
        preload: video.preload, reason, listeners: []
      };
      this.session = s;
      // pause() reduces decoding; preload is only a hint, not a network block.
      video.pause();
      video.preload = 'none';
      const listen = (name, fn) => {
        video.addEventListener(name, fn);
        s.listeners.push([name, fn]);
      };
      listen('ratechange', () => {
        const position = this.position();
        if (!Number.isFinite(video.playbackRate) || video.playbackRate <= 0) {
          this.cancel('播放速度不受支持，模拟已停止。');
          return;
        }
        s.position = position;
        s.at = this.now();
        s.rate = video.playbackRate;
        this.changed();
      });
      // An explicit seek/play or a source replacement takes precedence.
      for (const name of ['play', 'seeking', 'emptied', 'loadedmetadata']) {
        listen(name, () => this.cancel('播放器状态已改变，模拟已停止。'));
      }
      listen('durationchange', () => {
        if (video.duration !== s.duration) this.cancel('视频时长已改变，模拟已停止。');
      });
      this.changed();
      return true;
    }

    detach() {
      const s = this.session;
      if (!s) return null;
      this.session = null;
      for (const [name, fn] of s.listeners) s.video.removeEventListener(name, fn);
      s.video.preload = s.preload;
      return s;
    }

    cancel(message = '') {
      this.detach();
      this.error = message;
      this.changed();
    }

    async resume(video, key) {
      this.validate(video, key);
      if (!this.session) return false;
      const target = this.position();
      const s = this.detach();
      this.error = '';
      const ranges = video.seekable;
      let seekable = false;
      for (let i = 0; i < ranges.length; i++) {
        if (target >= ranges.start(i) && target <= ranges.end(i)) seekable = true;
      }
      if (!seekable) {
        this.error = '目标位置暂不可跳转；已保留原位置，请使用播放器手动跳转。';
        this.changed();
        return false;
      }
      try {
        video.currentTime = target;
        if (s.wasPlaying && target < s.duration) await video.play();
      } catch {
        this.error = '自动恢复未成功，请在播放器中手动点击播放。';
        this.changed();
        return false;
      }
      this.changed();
      return true;
    }

    status(video, key) {
      this.validate(video, key);
      return {
        active: !!this.session,
        reason: this.session?.reason || null,
        position: this.session ? this.position() : (video?.currentTime || 0),
        duration: Number.isFinite(video?.duration) ? video.duration : 0,
        rate: this.session?.rate || video?.playbackRate || 1,
        available: !this.problem(video),
        error: this.error,
        unavailableReason: this.problem(video)
      };
    }
  }
  return { Controller };
});
