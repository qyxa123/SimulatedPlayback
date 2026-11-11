# Measurement protocol — no measured results yet

This repository does not include a validated battery, CPU, bandwidth, or resume-latency comparison. Earlier illustrative percentages were not accompanied by raw measurements and have been removed. Functional tests of virtual progress do not establish resource savings.

## Controlled comparison

Record the device, OS, browser/app version, repository revision, media URL/file, duration, quality, playback speed, screen brightness, audio state, network type, and cache state. Use the same setup and start position for real and simulated playback, and repeat each measurement. Avoid treating the device-wide battery percentage as a precise per-app measurement.

1. Capture a real-playback baseline over a fixed interval.
2. Reset to the same start position and comparable cache state. Explicitly enable simulated mode and verify that the status changed before capturing its interval.
3. Capture the resume step separately, including buffering time and bytes downloaded after the seek.
4. Retain raw traces and report the method, sample count, and variation. Record unavailable counters as unavailable, never as zero.

## Browser

Use DevTools Network recordings to identify actual media requests, and a Performance recording for CPU activity. Verify behavior on each target site and browser version. Resource Timing byte totals can omit cross-origin data and are not a reliable proof of zero traffic. `pause()` and `preload="none"` do not stop MSE or website-managed fetches.

## Android

Use Android Studio profilers or supported system tracing for the app-owned player, and separate its traffic from other apps and the OS. Check device sleep/resume as well as foreground behavior. The sample media, app state, and enabled mode must match the scenario being measured.

`benchmark_android.sh` is an optional, limited sampler of battery percentage and process CPU readings. It does not switch the app's mode, measure power directly, or collect network traffic. Select the mode in the app first, then run it once per mode:

```sh
MODE=real DURATION=600 bash docs/benchmark_android.sh
MODE=sim DURATION=600 bash docs/benchmark_android.sh
```

Outputs are separate `metrics-real.csv` and `metrics-sim.csv` files. Missing readings remain empty. For a comparison, combine their rows under a single header and use `plot_report.py` after installing pandas and matplotlib. Its charts are observations from the supplied data, not evidence of a measured saving by themselves. Network plots require externally measured `rx_bytes` and `tx_bytes` columns.

`benchmark.sh` only prints this protocol's location; it does not benchmark a browser. The SVG screenshots are mockups, and the proposal PDF is a design note rather than a measurement report.
