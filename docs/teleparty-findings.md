# Teleparty investigation — 2026-10-22
Target: /Applications/Teleparty For Safari.app, Safari extension version 5.8.5, bundle ID com.teleparty.Teleparty-For-Safari.

## Scope and evidence
Static installed application inspection plus https://ww1.teleparty.com/support (official support host; content includes outdated platform descriptions). Main https://www.teleparty.com and /support returned HTTP 403. No live party was created, joined, or observed. No personal app settings were read or modified.
REA background analysis parent: ev_e590e43621ea561c6ec025707b0139dc8e23ab5995759dfb4dc8560a3f0be72a.
Root artifact SHA256 df2d7ecce22e43fb667596adc3547462ee7dec29a67bec3d9ebaf13af5e14e39.
One selected source parsed, seven modules recovered; semantic graph partial and other sources unselected. Popup analysis failed worker memory limit: ev_0ce494adb89ed02a777ecd79c7193b397a8fa47c70ddc4c2d0b9320d30e105c5. Popup claims below use direct inert source excerpts, not a successful REA graph. Source hashes and exact character offsets: teleparty-source-evidence.json.

## Observed static client behavior
- Manifest selects popup_react.html and background_service_bundled.js.
- Popup presents controlLock (Only I have control) and reactionsDisabled (Disable Reactions For Party).
- Popup requests createSession after permission checks and script injection, consumes returned sessionId, generates an invitation URL.
- Background create request carries controlLock, reactionsDisabled, videoId, videoDuration, videoType, serviceDomain, videoService, syncFromEnd, permId, userSettings.
- Invitation builder formats /join/{sessionId} under a configured base.
- Join request carries sessionId, video/service identity, permId, userSettings; optional selectedProvider. Response is loaded as local session data.
- Transport serializes {type,data,callbackId}, sends over socket connection. Both WebSocket and Socket.IO paths occur in bundle; no runtime path was established.
- Incoming updateSession updates state, lastKnownTime, lastKnownTimeUpdatedAt, and optional providerOffsets; userList updates forwarded to content/UI.
- Connection retry uses exponential delay with bounded retry count.

## Official documented flow
Host opens and plays supported streaming content, uses TP to create a party, and copies invitation. Guest opens invitation, is redirected to selected show, then activates TP to connect. Each viewer needs access to the relevant service. Chat settings include nickname/icon and chat visibility. Documentation reports sync and text chat; service coverage/pricing was outside this investigation.

## Proposed independent implementation (design choices, not Teleparty server facts)
Create room -> authenticated host membership -> unguessable share token -> guest joins -> membership snapshot with content identity, playback state, position, timestamp, revision, participants -> authorized playback updates broadcast over WebSocket -> drift correction -> reconnection snapshot.
Server enforces host-only/shared control; reject stale revisions, invalid messages and unauthorized room access. Use separate host identity and invite token. Validate URLs, escape chat text, limit messages/room capacity, expire idle rooms. Host departure semantics must be chosen. Every participant plays their own authorized media; no video redistribution.
MVP: create/join, invite copy, participant list, host/shared playback control, play/pause/seek synchronization, late join, reconnect, leave/end, nickname and chat/reaction settings. Tests must use two distinct clients, unauthorized control, invalid/expired invitation, stale update and late-join/reconnection.
Integration pending: user project folder/repository and player platform are unknown. Current workspace is empty; do not claim feature built or tested.

## Implementation delivered
Independent app in watch-together/: Node.js server, plain HTML/CSS/JavaScript client, no dependencies. Implemented room creation/invitation/joining, SSE updates with authenticated POST actions, host/shared playback permissions, late-join snapshot, chat/reactions, presence and room termination. The transport and approximate drift algorithm are our own choices, not recovered Teleparty backend behavior. Bundled MDN CC0 flower sample for network-independent demonstration.

Validation: integration tests passed for distinct clients, room join, SSE snapshots and playback broadcasts, authorization, stale updates, late join, chat and end state. Browser checks: host created party; guest joined; host Play advanced the guest video; guest controls were disabled in host-only mode; toggling shared controls enabled guest seeking and host reflected its new position; guest chat appeared at the host. Real internet/multi-device latency and streaming-service adapters were not tested. State is in memory and no public deployment was performed.
