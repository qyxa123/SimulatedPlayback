# SimulatedPlayback Benchmark Report

- Scenario: 10 minutes YouTube 720p
- Metrics: battery %, network bytes, CPU load

## Run
- Real playback: `MODE=real DURATION=600 bash docs/benchmark_android.sh`
- Simulated playback: `MODE=sim DURATION=600 bash docs/benchmark_android.sh`
- Generate PDF: `python3 docs/plot_report.py docs/metrics.csv docs/report.pdf`

## Notes
- Ensure device connected via adb and sample app `com.simplay.sample` is running
- CPU and network filters are per UID for the sample app
