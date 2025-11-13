# SimulatedPlayback

![Stars](https://img.shields.io/github/stars/qyxa123/SimulatedPlayback?style=social)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Build](https://img.shields.io/github/actions/workflow/status/qyxa123/SimulatedPlayback/build.yml?branch=main)

SimulatedPlayback — When users turn off the screen or mute their device, this system stops actual decoding and data fetching while continuously advancing playback progress. It saves battery and data without breaking user experience.

关闭屏幕或静音时，本系统暂停实际媒体解码与数据请求，但持续推进播放进度，从而节省电量与流量，同时保持播放体验的一致性。

Traditional players keep decoding and buffering even when the screen is off, wasting battery and bandwidth.

SimulatedPlayback provides an intelligent simulated progress mode that stops unnecessary processing while keeping playback continuity.

传统播放器在关闭屏幕后仍持续解码与缓冲，造成电量与流量浪费。
SimulatedPlayback 提供一种智能“虚拟播放”模式：停止无意义的资源消耗，但保持进度同步。

## Components / 组件
- tampermonkey/: MVP userscript
- web-extension/: Chrome/Firefox extension
- android/: Kotlin SDK + sample
- docs/: Proposal, benchmarks, site

## Screenshots / 截图
![Chrome Extension](docs/images/screenshots/chrome_popup.svg)
![Android App](docs/images/android_screenshot.svg)

## 🎧 SimulatedPlayback — Intelligent Low-Power Playback Progress System
SimulatedPlayback introduces a new way for media players to operate when the user turns off the screen or mutes the device. Instead of continuing real decoding and network buffering, the system pauses actual playback tasks while accurately advancing the playback progress in a lightweight, low-power mode.

当用户关闭屏幕或静音设备时，SimulatedPlayback 会暂停真实的媒体解码与网络请求，仅通过低功耗计时逻辑推进播放进度，从而在节省电量与流量的同时保持播放体验的连续性。

### 🚀 Highlights / 亮点
- 📴 Progress continues even when screen is off / 进度在息屏时仍继续
- 🔋 Significant battery savings / 大幅节省电量
- 📶 Zero data consumption during simulated mode / 模拟模式零流量
- 🎬 Instant resume / 返回后瞬时恢复
- 💻 Cross-platform implementation / 跨平台实现（Chrome + Android）

### Why Simulated Playback?
传统播放器在以下情况下仍然继续解码与拉流：屏幕关闭、设备静音、用户暂时不关注画面、只需“进度继续”。这导致不必要的电量与流量消耗和资源占用。SimulatedPlayback 的核心思想是：在不需要观看或听到的时刻，不做任何多余的处理，只保持进度。

### ⚙️ How It Works
息屏/静音时：暂停解码、停止网络、启动轻量计时器、以真实速率推进进度，并将时间点保存在 `localStorage`/`SharedPreferences`。用户返回时：按记录进度跳转、重新启动解码、无缝恢复。

### Comparison / 对比
| 模式 | 解码线程 | 网络请求 | 30 分钟耗电 | 数据消耗 |
|---|---|---|---:|---:|
| 普通播放 | 持续占用 | 持续缓冲 | ~10–12% | 200–500 MB |
| SimulatedPlayback | 停止 | 0 | ~1% | 0 MB |

## 📦 Installation & Usage / 安装与使用

### Chrome Extension
- Open `chrome://extensions`, enable Developer Mode
- Load unpacked folder `web-extension/`
- Open YouTube/Bilibili → use popup toggle to enable Simulated Mode

## 快速开始（Chrome）
- 打开 `chrome://extensions`，启用开发者模式
- 选择“加载已解压的扩展程序”，选择 `web-extension/`
- 打开 YouTube/Bilibili → 在弹窗中开启模拟模式

### Android SDK
- Open `android/` in Android Studio
- Build and run `sample-app`
- Use Sim ON/OFF buttons to switch between modes

## 快速开始（Android）
- 在 Android Studio 打开 `android/`
- 构建并运行 `sample-app`
- 使用 Sim ON/OFF 按钮切换模式

## 📄 Proposal & Benchmarks / 提案与评测
- `docs/proposal.pdf` 技术+商业提案
- `docs/benchmark_report.md` 数据对比与生成说明
- `docs/plot_report.py` 自动生成图表脚本
- `docs/benchmark_android.sh` Android 采集脚本

## License / 许可
Apache-2.0. 详见 `LICENSE`。

## Contributing / 贡献
- Issues and PRs welcome
- 参见 `CONTRIBUTING.md`

## Contact / 联系
- Maintainer: Alvin Li
- GitHub: https://github.com/qyxa123/SimulatedPlayback
- Email: qyxa123@gmail.com
