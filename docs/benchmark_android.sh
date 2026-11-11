#!/usr/bin/env bash
set -euo pipefail
# Limited sampler only: the operator must select the corresponding app mode.
PKG="com.simplay.sample"
MODE="${MODE:-}"
DURATION="${DURATION:-300}"
STEP="${STEP:-5}"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ "$MODE" != real && "$MODE" != sim ]]; then
  printf '%s\n' 'Set MODE=real or MODE=sim after selecting that mode in the app.' >&2
  exit 2
fi
if [[ ! "$DURATION" =~ ^[0-9]+$ || ! "$STEP" =~ ^[1-9][0-9]*$ ]]; then
  printf '%s\n' 'DURATION must be a nonnegative integer; STEP must be a positive integer.' >&2
  exit 2
fi
command -v adb >/dev/null || { printf '%s\n' 'adb is required.' >&2; exit 1; }
adb get-state >/dev/null
CSV="$OUT_DIR/metrics-$MODE.csv"
if [[ -e "$CSV" ]]; then
  printf 'Refusing to overwrite %s; move the existing capture before retrying.\n' "$CSV" >&2
  exit 1
fi
battery() {
  adb shell dumpsys battery | awk '/^[[:space:]]*level:/ {gsub(/\r/, "", $2); print $2; exit}'
}
cpu_pct() {
  adb shell dumpsys cpuinfo | awk -v pkg="$PKG" '
    index($2, "/" pkg ":") {gsub(/%/, "", $1); print $1; exit}'
}
printf 'Sampling %s for %ss. Verify this mode is already enabled in the app.\n' "$MODE" "$DURATION"
printf '%s\n' 'Network counters are not collected; empty CSV fields mean unavailable.'
printf '%s\n' 'time_s,mode,battery_level,rx_bytes,tx_bytes,cpu_percent' > "$CSV"
START_TS=$(date +%s)
while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TS))
  BATTERY=$(battery)
  CPU=$(cpu_pct)
  [[ "$BATTERY" =~ ^[0-9]+$ ]] || BATTERY=""
  [[ "$CPU" =~ ^[0-9]+([.][0-9]+)?$ ]] || CPU=""
  printf '%s,%s,%s,,,%s\n' "$ELAPSED" "$MODE" "$BATTERY" "$CPU" >> "$CSV"
  (( ELAPSED >= DURATION )) && break
  sleep "$STEP"
done
printf 'Wrote %s. Read docs/benchmark_report.md before interpreting these samples.\n' "$CSV"
