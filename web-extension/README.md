# Simulated Playback WebExtension

## Install
- Open Chrome `chrome://extensions` and enable Developer Mode
- Click `Load unpacked` and select the `web-extension/` folder
- Click the extension icon to open the popup

## Usage
- In the popup, click the toggle to turn simulation ON/OFF for the current tab
- When ON: the page content script pauses the video, stops prefetch by setting `preload='none'`, and increments progress in `localStorage` per URL
- When OFF or on next visit: the content script restores `video.currentTime` from stored progress on `loadedmetadata` and resumes playback when Play is pressed

## Firefox
- Use Manifest v3 with `browser_specific_settings`:
```
{
  "browser_specific_settings": {
    "gecko": { "id": "simplay@example.com" }
  }
}
```
- Load as temporary add-on via `about:debugging`

## Tests
- Open `tests/test_core.html` in a browser to validate simulated progress functions

## Notes
- Network prefetch control varies by site; the extension pauses and sets `preload='none'`
