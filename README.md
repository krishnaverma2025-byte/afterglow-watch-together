# Afterglow

**A movie night with friends, wherever they are.**

Afterglow adds a shared party and chat to your movie. Create a party, invite a friend, and keep your playback approximately in sync. Each person watches through their own streaming account.

[Open the website](https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site/) · [Set up Chrome](https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site/streaming) · [Download the extension](https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site/afterglow-extension.zip)

**Start here:** [Watch with friends](#watch-with-friends) · [Troubleshooting](#troubleshooting) · [Developer guide](#developer-guide)

## Watch with friends

### What everyone needs

- A computer with Google Chrome.
- The Afterglow extension installed in Chrome.
- Access to the same movie on the same streaming service.

Start with a Hotstar/JioHotstar movie. Hotstar has had a limited live test; Netflix and Prime Video support is experimental. A complete test across two separate devices is still outstanding.

### Step 1: Install the extension

Both the host and each friend must do this once:

1. [Download Afterglow](https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site/afterglow-extension.zip) and unzip the file.
2. Open `chrome://extensions` in Chrome’s address bar.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted `afterglow-extension` folder—the one containing `manifest.json`.
6. Open Chrome’s extensions menu (the puzzle-piece icon) and pin Afterglow.

The extension already points to the live server. You do not need to install Node.js or run a server to watch with friends. Safari does not have a ready-to-install build.

### Step 2: The host creates a party

1. Sign in to Hotstar/JioHotstar and open a movie.
2. Start playback, then click Afterglow in Chrome’s toolbar.
3. Enter your name and a party name.
4. Leave **Only I control playback** selected if you want to control the movie for everyone.
5. Click **Create party**.
6. Copy the invitation link and send it privately to your friends.

Create a fresh party on the live server. An old invitation containing `localhost` will not connect people on different computers.

### Step 3: Friends join

1. Open the invitation to see which title to watch.
2. Sign in to the streaming service, open that same movie, and start playback.
3. Click the Afterglow extension and enter your name.
4. Paste the invitation into **Invitation link** and click **Join party**.
5. Look for the Afterglow panel on the movie page.

Opening the invitation alone does not join the streaming player; finish joining through the extension.

### Step 4: Watch and chat

- Play, pause, or seek using the movie’s normal controls. Afterglow shares permitted changes with the party.
- Type in **Message your party…** and press **Enter** or click **Send**.
- The host can change **Host-only playback control** in the party panel to allow shared control.
- Use **Copy invitation** to invite someone else or **−** to collapse the panel.
- Use **Leave party** when finished. If the host leaves, the party ends for everyone.

Parties expire six hours after creation. Anyone who has the invitation can join while it remains valid, so share it privately.

### Update an existing installation

The current extension version is **1.0.1**. It includes a fix intended to stop movie keyboard shortcuts while typing in the party panel; the fix has automated coverage and still needs a live JioHotstar retest.

1. Download and unzip the latest extension.
2. Replace the files in the folder you originally loaded into Chrome.
3. Open `chrome://extensions` and click Afterglow’s **Reload** button.
4. Refresh your movie tab, reopen Afterglow, and reconnect.

Your friends must update their own extensions too. Updating the website cannot automatically update an unpacked Chrome extension.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| Chrome cannot load the extension | Unzip it first, then select the folder containing `manifest.json`. |
| Afterglow does not recognize the page | Open an actual movie player and start playback. Some title URL formats and player variants are not supported yet. |
| A friend cannot join | Confirm both people use the same title and service, and the invitation uses the live website address. Create a new party if the old one expired or ended. |
| The panel disappeared after refreshing | Open Afterglow again from Chrome’s toolbar to reconnect the panel. |
| Playback is a little out of sync | Let buffering or ads finish, keep the movie tab active, and have the host pause and resume. Synchronization is approximate. |
| Typing pauses or seeks the movie | Update to extension 1.0.1, reload it, and refresh the movie page. If it persists, report the browser version, title URL, and key that triggered it. |
| Netflix or Prime Video does not work | These adapters have automated tests but have not been verified against signed-in live players. |

## How Afterglow works

Every viewer gets video directly from the streaming service. Afterglow shares playback instructions—such as “pause” or “move to this position”—and chat messages through a shared server.

Your computer does not broadcast the movie to your friends. Afterglow does not provide streaming subscriptions or access to titles you cannot already watch.

## Developer guide

### Repository map

| Path | Responsibility |
| --- | --- |
| `server.js` | Local Node.js HTTP API and website server |
| `public/` | Local website, direct-video player, and streaming setup page |
| `extension/` | Chrome Manifest V3 extension, configured for the hosted server |
| `live/worker/api.js` | Hosted room, playback, and chat API |
| `live/public/` | Website assets used by the hosted build |
| `live/extension/` | Extension sources used by the hosted build |
| `live/assets/extension.zip` | Downloadable extension bundled into the hosted site |
| `live/drizzle/` | D1 SQL migrations |
| `live/scripts/build.mjs` | Worker and asset build script |
| `test/` and `live/test.mjs` | Automated API, extension, provider, and persistence checks |
| `safari/` | Optional Safari sources and packaging notes |
| `docs/` | Investigation evidence and implementation details |

### Run the local app

Requires **Node.js 22 or newer**. The app uses Node’s built-in modules; no dependency installation is needed.

```sh
git clone https://github.com/krishnaverma2025-byte/afterglow-watch-together.git
cd afterglow-watch-together
npm start
```

Open http://localhost:3000. Try the sample video, create a room, and join its invitation in another browser or tab. The direct-video sample flow works without the streaming extension.

The repository is private, so cloning requires GitHub access. Local rooms are held in memory, disappear on server restart, and expire after six hours. A `localhost` link is reachable only on the computer that opened it.

**The checked-in Chrome extension uses the hosted backend.** Starting the local server does not switch it to localhost. For local extension development, change the server URLs and manifest host permissions, then pair the extension’s origin through the local `/streaming` page. See [extension design notes](extension/README.md); its older localhost instructions describe the development setup.

### Architecture and synchronization

```text
Viewer A’s streaming player                 Viewer B’s streaming player
            ↕                                          ↕
    Afterglow extension  ←→  Shared room API  ←→  Afterglow extension
                                  ↕
                         D1 room storage (hosted)
```

1. The extension identifies the active provider and content ID.
2. Creating a party stores the title, playback state, settings, and host membership.
3. An invitation identifies the room; joining checks the streaming content identity and returns separate member credentials.
4. Each extension samples its local player and polls the backend approximately once per second.
5. Permitted player changes update the authoritative room state. Playback revisions reject stale updates; the server enforces host-only or shared control.
6. Other viewers apply the current room position and playing/paused state. Late joiners receive the current state as well.

The local website receives server updates through Server-Sent Events. The hosted website uses authenticated HTTPS polling. The streaming extension also uses short polling requests rather than a persistent service-worker socket.

Netflix’s adapter uses an observed private player API. Hotstar and Prime Video adapters use a visible HTML video element. The panel uses a closed shadow root; version 1.0.1 intercepts keyboard events aimed at the panel without cancelling native editing defaults.

### Hosting and storage

| Component | Local | Hosted |
| --- | --- | --- |
| Frontend | Node-served files | Assets bundled with a Cloudflare Worker |
| Backend | `server.js` | Cloudflare Worker API under `/api/` |
| Room storage | In memory | Cloudflare D1 |
| Website access | `http://localhost:3000` | Public HTTPS site; parties use private invitations |

The live site was published through **Sites hosting**, which manages the underlying Cloudflare deployment. It is not connected to a personal Cloudflare dashboard. The project ID in `live/.openai/hosting.json` identifies the hosted project; it is not a login credential.

### Tests and build

From the repository root:

```sh
npm test
```

The latest run passed 11 checks, including room permissions, stale playback updates, late joining, chat submission, provider adapters, D1-backed state, and chat keyboard isolation. Controlled tests do not establish compatibility with every live streaming player.

Build and check the hosted Worker:

```sh
cd live
node scripts/build.mjs
node --test test.mjs
```

The build creates `live/dist/server/index.js`, containing the Worker and embedded website assets, sample video, and extension download.

The local and hosted copies of the website and extension are separate. When making changes:

1. Update the relevant source copies and tests.
2. If extension files change, update its version and regenerate `live/assets/extension.zip` from the intended extension files.
3. Run the checks and hosted build.
4. Commit the source and publish the hosted build through the hosting workflow.
5. Ask existing users to reload their unpacked extension and refresh streaming tabs when an extension update is required.

**A GitHub push does not automatically deploy this site.** Publishing is a separate step.

To deploy under your own Cloudflare account, configure a Worker, create a D1 database bound as `DB`, apply `live/drizzle/0000_rooms.sql`, and publish the generated Worker. Update extension server URLs, invitation-origin checks, and host permissions for the new address, then rebuild the extension ZIP. This repository does not currently include a ready-to-use standalone Cloudflare deployment configuration.

### Current verification and limits

| Area | Status |
| --- | --- |
| Hosted create/join, playback API, chat | Public-server checks passed |
| Hotstar playback and chat | Tested in two Chrome tabs on one Mac |
| Playback across two separate devices | Full test outstanding |
| Netflix and Prime Video | Controlled adapter tests; live verification outstanding |
| Chat keyboard isolation | Automated regression passed; live Hotstar retest outstanding |
| Safari | Sources included; no ready-to-install package |

Ads, buffering, network latency, and background-tab throttling can affect synchronization. This implementation is not frame-accurate. Automatic episode switching, live channels, cross-region content matching, and robust reconciliation of different ad timelines are not implemented. Provider changes can require adapter updates.

### Privacy and access

Invitation links grant access to a party until it ends or expires. There are no user accounts or invitation-revocation controls. Keep invitations private.

The backend stores party state and chat; each streaming service handles its own sign-in and video delivery. Afterglow does not acquire streaming passwords, DRM keys, or video bytes. This is an MVP with limited abuse controls.

### Research and attribution

Afterglow is an independent implementation inspired by Teleparty’s create/invite/join flow. It does not include Teleparty code, branding, or private service endpoints.

- [Teleparty investigation](docs/teleparty-findings.md)
- [Streaming adapters and test evidence](docs/streaming-investigation.md)
- [Safari source and packaging notes](safari/README.md)
- [MDN CC0 sample video](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4)

## Ownership and permitted use

**Copyright © 2026 Krishna Verma. All rights reserved, except as expressly permitted in the [license](LICENSE).**

Everyone may use the official hosted Afterglow service and install and run the official extension. Limited local copies needed for installation, backup, and private evaluation are permitted.

The source is **proprietary, not open source**. Copying or reusing the code in another project, modifying it, redistributing it, publishing a fork, or operating a separate hosted service requires Krishna Verma’s prior written permission. Developer instructions explain the technology; they do not grant additional licensing permissions.

Third-party and public-domain materials keep their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md). For additional permission, contact [Krishna Verma on GitHub](https://github.com/krishnaverma2025-byte).
