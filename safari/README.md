# Afterglow for Safari — prepared source, not an installable app

Safari is the selected target. No Chromium extension needs to be loaded.

## Current status

The source in `safari/extension/` is generated from the maintained `extension/` directory. It uses Safari's browser namespace, a nonpersistent module background page, session storage, and full `safari-web-extension://UUID` origins for backend pairing. Origin validation and backend tests include Safari UUID origins. These are source adaptations; no real Safari extension runtime has been tested.

This Mac has Command Line Tools selected, but no full Xcode application or `safari-web-extension-packager` / `safari-web-extension-converter`. Packaging was attempted and stopped with the explicit missing-Xcode message. No signed app, .dmg, .pkg, or generated Xcode project is included. No Safari security preference or extension permission was changed.

## Build once full Xcode is installed

1. Install Xcode from Apple's Mac App Store and complete its first launch. Any Apple terms must be accepted by you.
2. In `Documents/ChatGPT/REA/watch-together`, run `npm run safari:package`. If Xcode is installed elsewhere, set DEVELOPER_DIR for that command to its Contents/Developer path. The script prefers Apple's current packager and falls back to its older converter name. It does not change system-wide xcode-select settings or overwrite an existing generated project automatically.
3. Open the generated project in `safari/xcode/`, choose your signing team, and build/run the macOS app in Xcode. Review packaging warnings and resolve unsupported APIs before claiming compatibility. Signing and local-development requirements depend on your Apple account and Xcode setup.
4. Enable Afterglow in Safari Settings → Extensions and grant the site access necessary for your chosen service. Development-only unsigned extension settings, if required by Xcode, must be reviewed explicitly rather than changed automatically.
5. Start the local backend with `npm start`, open Afterglow's toolbar popup, copy its full Safari extension origin, and pair it at http://localhost:3000/streaming .
6. Open a movie on Netflix, Prime Video or Hotstar using your own account, start playback, and create a party from Afterglow. Test a second independent Safari profile with its own membership before considering the adapter verified.

`npm run safari:prepare` refreshes the Safari source without requiring Xcode. Edit the maintained files in `extension/`, then regenerate. Packaging copies resources into Xcode; regenerate/repackage intentionally after changes.

## Remaining validation

Safari scripting MAIN-world injection, background messaging, tab permissions, clipboard behavior, session storage and each signed-in provider player still require live verification. Netflix's private API and Prime/Hotstar page variants may need changes after that test. This remains a local single-Mac prototype; remote friends require a shared HTTPS backend and corresponding configuration.

Apple packaging guide: https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari
Safari background modules example: https://developer.apple.com/videos/play/wwdc2026/216/
