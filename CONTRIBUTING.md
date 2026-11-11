# Contributing / 贡献

Create a feature branch and include a clear problem statement, the resulting behavior, and validation evidence in a pull request.

- Run `node --test web-extension/tests/*.test.cjs` from the repository root, rebuild with `node scripts/package-extension.cjs`, and follow the manual scenarios in [web-extension/README.md](web-extension/README.md) for changes to media behavior.
- For Android, follow the build and test commands in [android/README.md](android/README.md).
- Test starting from a nonzero position, playback speed, duration boundaries, repeated toggles, and source changes. Never apply one video's progress to another.
- Keep settings opt-in when they cause the user to skip content.
- Separate a functional test from a power/network measurement. Include raw data, device/browser versions, cache state, and a repeatable method for performance claims; see [the measurement protocol](docs/benchmark_report.md).
- Do not silently turn missing telemetry into zeros or describe mockup images as tested screenshots.

提交 PR 时请说明修改原因、实际行为与验证结果。不能运行的检查请明确标注，不要把未验证的兼容性或省电数据写成结论。
