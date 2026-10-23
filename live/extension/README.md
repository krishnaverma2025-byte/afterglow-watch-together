# Afterglow streaming companion (development preview)

## Install locally in Chrome / Edge / Brave

1. Start the project server: run `npm start` in `watch-together/`.
2. Open the browser's extensions manager (`chrome://extensions`, `edge://extensions`, or `brave://extensions`), enable Developer mode, choose Load unpacked and select this `extension/` folder.
3. Pin Afterglow. Open its popup, copy the full extension origin, then visit http://localhost:3000/streaming and pair it. Pairing lasts until the server restarts. Alternatively configure `AFTERGLOW_EXTENSION_IDS` with comma-separated 32-letter IDs before starting the server.
4. Sign in to Netflix, Prime Video or Hotstar normally, open an on-demand title, and start playback. Click the Afterglow extension and create a party.
5. Send the invitation. A guest opens it, follows “Open the streaming title”, signs in and starts the same title, then opens Afterglow and pastes the invitation to join. The website itself does not embed a streaming-service video.
6. Control playback on the streaming site's existing player. The party panel shows chat and participants. Host-only control is enforced by the server. Guests attempting a seek while host-only mode is on are returned to the room position at the next poll.

The host can change between host-only and shared controls using the checkbox in the streaming-page party panel. Only host membership can update this setting.

Refresh/navigation: full page reload removes the panel. Reopen the extension popup to attach it again (membership survives tab reload in browser session storage). Switching titles stops synchronization; create a new party for another movie/episode. Closing a tab does not automatically end a room, so the host should use Leave first. Rooms expire after six hours. Ending a room stops the panel. Reactions and live settings controls are available in the direct-video website; this extension panel currently exposes text chat and leave only.

## What the code does

`providers.js`: exact provider-domain boundaries and content IDs from title URLs, tracking-parameter removal.
`player.js`: self-contained page-world adapter. Netflix uses its observed private player API (milliseconds converted to seconds). Prime and Hotstar use a visible HTML video element. This is an independent subset, not a port of Teleparty's React-based Prime adapter. Recognized ad states suspend commands. No DRM keys, cookies, account credentials, or video bytes are acquired.
`background.js`: authenticated backend access and tab-scoped membership in trusted extension session storage. The extension only receives temporary active-tab access when the user opens its popup. No automatic scripts on all visited pages, broad site permissions, external messaging, or third-party endpoints.
`overlay.js`: isolated-world chat/presence interface. The page-world adapter receives only playback commands, never room credentials.

Each panel polls the service worker every second. The worker inspects playback, publishes permitted local changes using a room revision, or applies the authoritative state. The current implementation intentionally uses short requests rather than relying on a persistent MV3 service-worker socket. Local player changes are inferred from snapshots (2-second seek threshold); it is not frame-accurate. Hidden-tab timer throttling, ads and buffering can delay synchronization.

## Validation and remaining work

`npm test` includes provider identity and adapter tests with controlled players, plus a real backend/two-tab worker test with mocked browser APIs. A narrow same-Mac two-tab Hotstar session was tested live on 23 October 2026: host creation, guest join, host play/pause, shared guest play and text chat. Netflix and Prime Video have not been tested live. The extension was loaded in Chrome from the maintained project folder and paired with the local server on 23 October 2026. Hotstar playback checks subsequently completed after the user opened its player; see docs/streaming-investigation.md for limits. Support is provisional until a manual provider-specific playback test succeeds.

Live channels, cross-region content matching, iframe-only players, automatic episode switching, robust ad-timeline reconciliation, and current private player compatibility are not implemented. Prime custom player variants may need a page-specific adapter. No attempt is made to skip ads or overcome streaming-service access restrictions.

## Safari

The source is a Manifest V3 Chromium extension. Safari cannot load this directory directly. A Safari Web Extension wrapper must be generated and signed using a full Xcode installation, followed by API and permission compatibility checks. This Mac currently selects `/Library/Developer/CommandLineTools`, not a full Xcode application. See Apple's guide: https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari . A Safari build and a signed installer are not included.

## Remote friends

The backend is fixed at `http://localhost:3000` in `background.js`, `popup.html`, and `overlay.js`, plus manifest host permissions. Localhost is each viewer's own machine; this demo can only share a server when running on the same Mac. Before internet use, deploy a shared HTTPS backend, update these exact origins/permissions, change invitation-origin validation, and pair each installed extension at that backend. Add durable state, authentication and production abuse controls as described in the project README. Do not simply widen CORS or expose this unauthenticated development server to the internet.
