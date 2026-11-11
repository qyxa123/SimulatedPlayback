# Changelog

## Unreleased — 0.2.0 reliability update

- Anchor virtual progress to the actual playback position, elapsed time, and speed; clamp to media duration.
- Keep browser controls synchronized with the active tab's real session state, with explicit resume and discard actions.
- Add opt-in hidden-tab and muted-video automation, media-change cleanup, and unsupported-media errors.
- Improve Android progress handling, player restoration, sample lifecycle, and test/build setup.
- Replace unsupported battery, bandwidth, latency, and platform-integration claims with documented limitations.
- Correct the Android measurement helper: explicit mode selection, separate captures, no fabricated zero counters, and no automatic mode-switch claim.
- Document verification scenarios and measurement requirements; regenerate the design-note PDF.

## Earlier prototype

The repository previously included a browser extension, Android sample, illustrative SVGs, static documentation sites, and packaging workflows. Its historical changelog used the heading `0.2.0`, while the extension manifest declared `0.1.0`. That heading did not establish a tested or published release. The old performance tables and store-listing text were not accompanied by measured results or a verified store publication.
