# Simulated Playback extension

A Chromium Manifest V3 extension for experimenting with virtual progress on YouTube and Bilibili. The video pauses during simulation. Resuming skips ahead by elapsed time multiplied by playback speed.

## Install

1. Download or clone the repository.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge), and enable Developer mode.
3. Choose **Load unpacked**, then select this `web-extension/` folder.
4. Open or reload a supported video page before opening the popup.

Firefox is not a verified target for this version. Installing from a store is not required; no store publication is implied by `webstore_desc.txt`.

## Use

Start a normal video, then click **开始模拟** in the popup. The popup reports the current session state and virtual position. **恢复到此位置** seeks to that position and attempts playback. **放弃模拟进度，停在原位置** abandons the virtual progress and keeps the original position.

Optional automatic triggers are disabled by default:

- **切到后台时模拟** (hidden tab): simulate while the page is hidden and restore when it becomes visible.
- **视频静音时模拟** (muted video): simulate while the video element is muted or its volume is zero, and restore when audible again.

These triggers do not detect the operating system's screen lock, display power state, or master volume. Only enable them if skipping the corresponding content is intentional. A manually paused video should not be treated as an instruction to start automatic simulation.

Each tab has its own session. Navigating to another video, replacing the media source, changing its duration, reloading, or closing the page ends the session. Browser virtual progress is not saved across visits.

When both automatic triggers are enabled, an automatic session resumes only after neither condition applies. A manual session remains under the popup controls. Resuming a session that started from an already paused video keeps it paused at the new position.

## Permissions and local data

The manifest requests `storage` to save the two automation preferences locally. Content scripts run only on YouTube and Bilibili pages. Virtual progress stays in the current content script; it is not written to website storage, synced, or sent to a service. The extension does not request notification or broad tab-access permissions.

## Compatibility limits

- Only loaded, seekable videos with a finite duration are supported. Unknown-duration media and detected live streams are rejected. Known YouTube live controls and Bilibili's live domain are recognized, but a finite DVR window in an unfamiliar player can evade detection. Live playback is outside the supported scope.
- Detected DRM and advertisements are rejected; site-specific detection cannot cover every player state.
- Pausing and `preload="none"` do not stop a site's JavaScript or MSE streaming requests. No zero-traffic or battery-saving percentage is promised.
- Seeking can require downloading and buffering at the target position. Autoplay restrictions can require pressing Play on the website.
- Extension controls reflect the content script's response. If there is no receiver, reload the video page after installing/updating the extension.
- No watch-time, course-completion, or server-side playback status is simulated.

## Manual verification

Use a normal on-demand video with several minutes remaining:

1. Seek to a nonzero position, start simulation, wait, and resume. Check that the jump starts from the original position, rather than zero.
2. Repeat at 2× speed and near the end. Check that the target respects speed and duration.
3. Keep the tab hidden for several minutes, then check elapsed progress. It must not depend on one callback running every second.
4. Start another simulation and discard it. Check that virtual time is not applied.
5. Test each optional automatic trigger, with both an already paused and a playing video.
6. Change video or navigate within the site while simulating. Check that the previous video's position is never applied to the new video.
7. Open a recognized live stream or a page without a video. The popup should show an actionable unsupported/unavailable state; separately check that live indicators are still recognized on the current site.
8. Compare Network and Performance recordings under the [measurement protocol](../docs/benchmark_report.md). A working progress test alone does not prove energy or traffic savings.

## Automated checks and packaging

From the repository root, with Node.js installed:

```sh
node --test web-extension/tests/*.test.cjs
node scripts/package-extension.cjs
```

The packaging script produces `dist/web-extension.zip` from the runtime files and verifies that manifest references are included. Extract the ZIP before loading it as an unpacked extension.

For the optional real-browser harness, install Playwright (`npm install --no-save playwright`) and a Chromium binary, then run:

```sh
CHROMIUM_PATH=/usr/bin/chromium node web-extension/tests/browser-smoke.cjs
```

Set `CHROMIUM_PATH` to your actual binary path. This harness uses real Chromium media and DOM behavior with local fixture content, but mocks Chrome extension messaging and storage APIs. It does not install the extension or connect to production YouTube/Bilibili videos.

In the development environment for this update, administrator policy blocked loading the actual unpacked extension. Consequently, end-to-end extension installation and current production-site compatibility remain unverified. Test those separately using the manual scenarios above; a passing harness is not proof of them.
