# SimulatedPlayback: integration notes

## Purpose
Pause real media playback while a user intentionally skips an interval.
Compute a virtual position from elapsed time and resume at that position.
The skipped interval has no audio or video output.

## Implementations
The Chromium extension controls an HTML video element on supported sites.
The Android sample integrates a manager with an app-owned ExoPlayer.
This repository does not contain Chromium or AOSP framework patches.

## Timing and lifecycle
Anchor virtual time to the actual playback position and playback speed.
Calculate elapsed time instead of counting periodic timer callbacks.
Clamp progress to the known duration and reject unsupported media.
Do not reuse progress after a media identity changes.
Browser sessions end on page reload; automatic triggers are opt-in.

## Network limits
Pausing an HTML video and changing preload cannot stop every site request.
MSE playback and site-managed fetches need player-specific integration.
Android source loading can be stopped by its app-owned player.
This does not stop unrelated application or operating-system traffic.

## Evidence and next steps
No verified power savings, traffic savings, or resume latency are supplied.
Measure both modes under controlled conditions with raw trace data.
Test buffering, autoplay rules, source changes, and device lifecycle events.
Use docs/benchmark_report.md for the measurement protocol.

## Project
https://github.com/qyxa123/SimulatedPlayback
Apache-2.0. Maintainer: Alvin Li.
