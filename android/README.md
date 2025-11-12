# Simulated Playback Android

## Modules
- simplay-core: Kotlin library wrapping ExoPlayer with simulated mode APIs
- sample-app: Demo app with buttons to switch modes

## API
```kotlin
val manager = SimulatedPlaybackManager(context)
manager.attachPlayer(player, uri)
manager.enableSimulatedMode()
manager.disableSimulatedMode()
val p = manager.getSimProgress()
manager.setSimProgress(p + 10)
```

## Behavior
- When simulated mode is enabled: pauses playback, stops network by clearing media items, runs a 1s timer, and stores progress in SharedPreferences keyed by media URI
- When disabled: restores media item, seeks to persisted position, and resumes playback

## Build
- Open `android/` in Android Studio and build `simplay-core`
- AAR output: `simplay-core/build/outputs/aar/`

## Integrate
- Add AAR to your app
- Create `ExoPlayer`, attach with `SimulatedPlaybackManager.attachPlayer(player, uri)`
- Call `enableSimulatedMode()` to simulate and `disableSimulatedMode()` to resume
- Persist progress automatically via SharedPreferences keyed by media URI
