#!/usr/bin/env bash
set -euo pipefail
PKG="com.simplay.sample"
DURATION="${DURATION:-300}"
STEP="${STEP:-5}"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
CSV="$OUT_DIR/metrics.csv"
ts() { date +%s; }
uid() { adb shell dumpsys package $PKG | grep -m1 userId= | sed -E 's/.*userId=([0-9]+)/\1/'; }
battery() { adb shell dumpsys battery | grep -m1 level | sed -E 's/.*: *([0-9]+)/\1/'; }
net_bytes() { local U=$(uid); adb shell cat /proc/net/xt_qtaguid/stats | awk -v u=$U 'NR>1 && $3==u {rx+=$6; tx+=$8} END {print rx" "tx}'; }
cpu_pct() { adb shell top -n 1 | grep $PKG | awk '{print $9}' | sed 's/%//'; }
echo "time_s,mode,battery_level,rx_bytes,tx_bytes,cpu_percent" > "$CSV"
run_mode() {
  local MODE=$1
  echo "Running $MODE for ${DURATION}s"
  START_TS=$(ts)
  START_BAT=$(battery)
  read START_RX START_TX < <(net_bytes)
  ELAPSED=0
  while [ "$ELAPSED" -le "$DURATION" ]; do
    CUR_BAT=$(battery)
    read RX TX < <(net_bytes)
    CPU=$(cpu_pct)
    NOW=$(ts)
    echo "$((NOW-START_TS)),$MODE,$CUR_BAT,$RX,$TX,${CPU:-0}" >> "$CSV"
    sleep "$STEP"
    ELAPSED=$((ELAPSED+STEP))
  done
  END_BAT=$(battery)
  read END_RX END_TX < <(net_bytes)
  BAT_DROP=$((START_BAT-END_BAT))
  RX_DELTA=$((END_RX-START_RX))
  TX_DELTA=$((END_TX-START_TX))
  echo "summary_$MODE,battery_drop,rx_bytes,tx_bytes" >> "$CSV"
  echo "summary,$BAT_DROP,$RX_DELTA,$TX_DELTA" >> "$CSV"
}
run_mode real
run_mode sim
python3 "$OUT_DIR/plot_report.py" "$CSV" "$OUT_DIR/benchmark_report.pdf" || true
echo "Wrote $CSV and $OUT_DIR/benchmark_report.pdf"
