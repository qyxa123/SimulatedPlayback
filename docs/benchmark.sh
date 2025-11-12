#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="$(dirname "$0")"
CSV="$OUT_DIR/metrics.csv"
URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
DURATION=600
DEVICE=${DEVICE:-""}
echo "metric,real_playback,simulated_playback" > "$CSV"
echo "battery_delta,," >> "$CSV"
echo "network_bytes,," >> "$CSV"
echo "cpu_load,," >> "$CSV"
echo "Run real playback and collect metrics manually or via profiler"
echo "Run simulated playback with extension and collect metrics"
echo "Fill metrics into $CSV"
