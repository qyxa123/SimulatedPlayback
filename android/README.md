# Simulated Playback Android

`simplay-core` wraps ExoPlayer 2.19.1 for a single finite, seekable item; `sample-app`
demonstrates manual switching with an audio sample. This is an SDK/sample, not a
system-wide switch for YouTube or other apps.

## Build and test

Use Android Studio, or install JDK 17, Gradle 8.2, Android SDK Platform 34 and build
tools 34.0.0. From `android/` run:

```sh
gradle testDebugUnitTest :simplay-core:assembleRelease :sample-app:assembleDebug
```

Outputs: `simplay-core/build/outputs/aar/` and
`sample-app/build/outputs/apk/debug/`. The unit tests use Robolectric and a mock
player; they do not measure real device network/battery usage.

## API

```kotlin
val manager = SimulatedPlaybackManager(context)
manager.attachPlayer(player, uri) // restores the last checkpoint for this URI
player.prepare()
player.play()

if (!manager.enableSimulatedMode()) {
    // Wait until metadata is ready; live/non-seekable items are unsupported.
}
val positionMs = manager.getSimProgressMs()
manager.disableSimulatedMode()

// Activity lifecycle or another suitable checkpoint:
manager.saveProgress()
// Before releasing the caller-owned player:
manager.detachPlayer()
player.release()
```

All calls must run on the player's application thread. `getSimProgress()` and
`setSimProgress(seconds)` remain available as whole-second convenience methods.

## Behavior and limits

- Entry captures the actual position, playback speed, duration and play/pause
  intent. It pauses and stops ExoPlayer, retaining the media item for restoration.
- Progress uses `SystemClock.elapsedRealtime()`, which includes device sleep.
  There is no repeating progress timer, wake lock, or once-per-second disk write.
- Restoration seeks before preparing; it keeps a previously paused item paused,
  and does not restart an item whose virtual position has reached its end.
- Repeated enable/disable calls are safe. Missing metadata, live streams, and
  non-seekable items are rejected. Replacing the media item externally prevents
  restoration from seeking into the replacement and detaches the manager; attach
  the new item explicitly before using the manager again.
- Preferences store millisecond checkpoints at entry, seek, exit and explicit
  save/detach. Old second-based checkpoints are read. URI values stay in app-local
  preferences; avoid putting secrets in a media URL.
- The virtual clock continues while the manager remains alive, including a stopped
  activity. Detaching/destruction ends the simulation. After process death only
  the last checkpoint is restored; background process survival is not guaranteed.
- `stop()` cancels this player's loading. Already in-flight requests and other app
  traffic may still occur. No battery-saving percentage or zero-total-traffic claim
  has been verified. Returning to real playback can require buffering.
- Skipped virtual time is skipped content, with no audio output or guarantee that
  a platform counts it as watched. Automatic mute/screen-state triggers are left to
  the integrating app; the sample uses explicit buttons.

The sample starts real playback on launch, pauses real playback when stopped,
resumes it when returning, and releases the player only on destruction. UI progress
refreshes run only while the activity is started.
