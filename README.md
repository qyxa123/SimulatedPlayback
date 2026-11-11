# SimulatedPlayback

Pause a video while keeping a virtual playback position, then resume at the position calculated from elapsed time. This repository contains a Chromium extension and an Android player integration sample.

暂停真实播放，以经过的时间计算虚拟进度；恢复时跳转到新位置。适合明确希望跳过离开期间内容的场景。模拟期间没有画面或声音，恢复时跳过的内容不会补播。

## What works / 功能

- Start from the current playback position, including playback speed and duration limits.
- Calculate progress from elapsed time rather than counting timer callbacks.
- In the browser popup, start simulation, resume at the virtual position, or discard it and keep the original position.
- Optionally start automatically when the tab is hidden or the video is muted. Both options are off by default.
- Keep each browser tab independent and discard a session when its video or page changes.
- Android: integrate the manager with an ExoPlayer instance; see the [Android guide](android/README.md).

## Install the extension / 安装浏览器扩展

1. Download or clone this repository and extract it if necessary.
2. In Chrome, open `chrome://extensions` and enable **Developer mode**. In Edge, use `edge://extensions`.
3. Choose **Load unpacked** and select the `web-extension/` directory.
4. Open or reload a YouTube or Bilibili video page, start a seekable video, and open the extension popup.
5. Click **开始模拟** to start. Use **恢复到此位置** to jump to the calculated position, or **放弃模拟进度，停在原位置** to abandon the virtual progress.

请加载源码中的 `web-extension/` 文件夹。扩展更新后，需要重新加载扩展和视频页面。设置中的“标签页隐藏”不等同于检测设备息屏，“视频静音”也不等同于检测系统音量。

See the [extension guide](web-extension/README.md) for limitations and verification steps. Firefox compatibility has not been verified.

## Limits / 使用边界

The browser extension pauses the media element and temporarily sets `preload="none"`. A website can continue downloading media through its own streaming code, especially Media Source Extensions. **Zero network traffic and a particular battery saving are not guaranteed or measured.** This extension does not block site requests.

Simulation requires loaded, seekable, finite-duration media. Unknown-duration media, detected live streams, protected media, and advertisements are rejected. Live detection includes known YouTube controls and Bilibili's live domain; a finite-duration DVR stream in an unfamiliar player may not be identified. Live playback is outside the supported scope. Test a normal video before depending on a site's behavior. Resume can require buffering, and browser autoplay rules can require another click on Play.

Browser progress belongs to the current page session. Reloading or closing the page ends that session; virtual progress is not restored on the next visit. Automatic modes operate on tab visibility and the video element's muted/volume state, not device screen or system mute state. Playback and watch-history accounting remain controlled by the website.

目前是供测试和集成的项目，不是浏览器内核补丁或 Android 系统模块。没有经过验证的省电比例、零流量保证或恢复延迟指标。网站变更、广告切换和播放器重新创建都可能影响兼容性。

## Development

- [Browser implementation and tests](web-extension/README.md)
- [Android build and tests](android/README.md)
- [Measurement protocol](docs/benchmark_report.md): how to collect evidence; no performance results are included.
- [Design and integration notes](docs/proposal.md)
- [Contributing](CONTRIBUTING.md)

From the repository root, run the automated checks and rebuild the extension package:

```sh
node --test web-extension/tests/*.test.cjs
node scripts/package-extension.cjs
```

The package is written to `dist/web-extension.zip`. Extract it before using **Load unpacked**. The SVG images in `docs/images/` are illustrative mockups, not captured test evidence. See the extension guide for the optional real-browser harness and its validation limits.

## License and contact

Apache-2.0; see [LICENSE](LICENSE).

Maintainer: Alvin Li · [GitHub](https://github.com/qyxa123/SimulatedPlayback) · qyxa123@gmail.com
