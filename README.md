# SimulatedPlayback

![Stars](https://img.shields.io/github/stars/yourname/simplay?style=social)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Build](https://img.shields.io/github/actions/workflow/status/yourname/simplay/build.yml?branch=main)

SimulatedPlayback lets you advance media progress without downloading or decoding frames, saving battery and data while preserving user experience.

简体中文：SimulatedPlayback 允许在不下载或解码媒体的情况下推进进度，节省电量与流量，同时保持用户体验。

## Components / 组件
- tampermonkey/: MVP userscript
- web-extension/: Chrome/Firefox extension
- android/: Kotlin SDK + sample
- docs/: Proposal, benchmarks, site

## Screenshots / 截图
![Chrome Extension](docs/images/chrome_screenshot.svg)
![Android App](docs/images/android_screenshot.svg)

## Comparison / 对比
| Metric | Real Playback | Simulated Playback |
|---|---:|---:|
| Battery | Higher drain | Lower drain |
| Data | Media fetched | Minimal/no media |
| CPU | Decoder active | Lightweight timer |

## Quick Start (Chrome)
- Open `chrome://extensions`, enable Developer Mode
- Load unpacked folder `web-extension/`
- Open YouTube/Bilibili → use popup toggle to enable Simulated Mode

## 快速开始（Chrome）
- 打开 `chrome://extensions`，启用开发者模式
- 选择“加载已解压的扩展程序”，选择 `web-extension/`
- 打开 YouTube/Bilibili → 在弹窗中开启模拟模式

## Quick Start (Android)
- Open `android/` in Android Studio
- Build and run `sample-app`
- Use Sim ON/OFF buttons to switch between modes

## 快速开始（Android）
- 在 Android Studio 打开 `android/`
- 构建并运行 `sample-app`
- 使用 Sim ON/OFF 按钮切换模式

## License / 许可
Apache-2.0. See `LICENSE`.

## Contributing / 贡献
- Issues and PRs welcome
- 参见 `CONTRIBUTING.md`

## Contact / 联系
- Maintainer: Your Name
- GitHub: https://github.com/yourname/simplay
