# Streaming-service investigation — 23 October 2026

## Target and scope

Installed Teleparty for Safari 5.8.5, bundle com.teleparty.Teleparty-For-Safari. Inspected package resources and selected provider source files as inert text. User's supplied screenshot depicts Teleparty's marketing page; it is not evidence of a live streaming integration or of private backend behavior. https://www.teleparty.com/support continued returning 403 in automated retrieval.

REA analysis parent: `ev_30719249beb059677f81eb7c199bc9e206dbfb607c268b7c4fbc85dcef11ef70`.
Root SHA256: `df2d7ecce22e43fb667596adc3547462ee7dec29a67bec3d9ebaf13af5e14e39`.
Selected files: Netflix, Amazon and Hotstar injected bundles. Three parsed successfully; 6,243 AST nodes visited. Source selection leaves 183 other inventoried files unanalyzed, and dynamic relationships remain unknown. Do not interpret partial coverage as complete behavior recovery.
Direct-source corroboration, exact offsets and hashes: parent workspace `work/teleparty-provider-evidence.json`. Earlier background evidence: `ev_e590e43621ea561c6ec025707b0139dc8e23ab5995759dfb4dc8560a3f0be72a`.

## Observations from packaged source

- Netflix injected code gets `window.netflix.appContext.state.playerApp.getAPI().videoPlayer`, chooses a watch player session, calls `getVideoPlayerBySessionId`, reads `getCurrentTime` and `isPaused`, and calls `seek`, `pause` and `play`. Time is handled in milliseconds. It has additional ad/busy-state and React-fiber inspection that our independent first adapter does not fully reproduce.
- Amazon injected code maintains a webPlayer reference, state including adPlaying/videoId/duration, uses page-player play/pause/seek when available, and falls back to video-element controls. It has seek-settle and suppression logic. Our adapter uses only the HTML-video approach; it does not reproduce the React player walk.
- Hotstar's injected bundle merely marks its seek script loaded. Its separate content bundle contains direct video-element access, including #ad-video-container and #video-container, currentTime reads/writes and millisecond conversions. This content-bundle finding came from direct source inspection, not the selected injected-file REA graph.
- Previously inspected background/popup code sends createSession with content identity and control settings, consumes sessionId, builds a /join/{id} invitation, sends joinSession with title/service identity and applies updateSession timing/state messages.

## Explanation and independent design

The supported architecture is a browser extension controlling the user's existing provider player and sharing playback metadata through a party server. A normal standalone webpage cannot directly access another origin's player objects. Chromium content scripts use an isolated world; page-level APIs require deliberate MAIN-world scripting (Chrome documentation linked below). Each participant signs into the provider independently and fetches their own authorized stream. No streaming-service password/API key integration, video rebroadcast or iframe player was established.

Implementation adds title identification, extension-origin pairing, streaming room metadata and initial playback, authenticated snapshots, content-identity checks on join, tab-scoped credentials, page adapters, periodic synchronization with revision checks, and a shadow-root party panel. These are our implementation choices. They do not establish Teleparty server internals.

## Verification

Seven tests pass: existing party flows; provider domain/title boundaries; Prime/Hotstar video adapter commands; Netflix millisecond API conversion and missing API behavior; recognized ads/buffering/duration guards; extension pairing, invite metadata and auth; extension worker with two mocked browser tabs and real local backend. They establish behavior under controlled player/browser APIs, not live service support. Actual signed-in Netflix, Prime and Hotstar playback, regional variants, ads, live streams, and Safari remain unverified. A Safari package is not included; active developer path is CommandLineTools rather than full Xcode.

## Primary references

- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/develop/concepts/network-requests
- https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world
- https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari
- https://github.com/morluto/rea


## Live Chrome verification — 23 October 2026

Afterglow was loaded from the maintained extension folder in the user's Chrome profile and paired through the website setup form. Extension origin: chrome-extension://nfchomeamahmlkbphoimibhkfcbbflfj. The existing Hotstar movie watch page reported the html-video adapter. Created a host room and joined from a separately opened Chrome tab with a distinct Guest membership. Guest playback converged to the host's paused position; host Play started guest playback; host Pause left both players paused with visible remaining-time counters within approximately one second. Host settings switched to shared mode and guest Play was followed by the host. This verifies a narrow same-Mac/two-tab Hotstar flow, not remote networking or long-term drift accuracy. A transient player-access error recovered on a subsequent poll.

The live chat test exposed a selector bug after adding the host-control checkbox: the form handler selected the first input (the checkbox) rather than the message textbox. Fixed to select form input, added a regression test, reloaded the extension and rejoined a new party. The exact guest text appeared on both guest and host panels. All nine automated checks passed. The initial disposable test room was ended. The final room was restored to host-only control. The browser subsequently showed a different Hotstar title; further interaction stopped rather than claiming coverage of that changed title.

Netflix and Prime Video have not been tested live. Safari packaging remains blocked by missing full Xcode. Internet hosting is not configured.
