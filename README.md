# Afterglow — Watch Together

Watch a movie with your friends, keep playback in sync, and chat while watching.

**Afterglow is live on Cloudflare Workers.**

[Open Afterglow](https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site/) · [Friend’s setup and extension download](https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site/streaming)

[User guide](#watch-with-a-friend) · [Developer guide](#developer-guide)

## Watch with a friend

### 1. Install Afterglow in Chrome

Both you and your friend need the Afterglow extension.

1. Open the [setup page](https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site/streaming).
2. Download the extension ZIP and unzip it.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode**.
5. Click **Load unpacked** and select the unzipped folder containing `manifest.json`.
6. Pin Afterglow using Chrome’s extensions menu.

The downloaded extension already connects to the live server. You do not need to run a server on your computer.

### 2. Create a party

1. Open a Hotstar movie and start playing it.
2. Refresh your streaming tab if you had an older Afterglow extension open.
3. Click the Afterglow extension.
4. Enter your name and a party name.
5. Click **Create party** and copy the invitation link.
6. Send the link privately to your friend.

Create a **new party** for the live server. Old localhost invitations will not work for remote friends.

### 3. Your friend joins

1. Your friend opens the same Hotstar movie using their own streaming access.
2. They start the movie and click the Afterglow extension.
3. They enter their name, paste your invitation into **Invitation link**, and click **Join party**.

You can now watch and chat together. The host controls playback by default. Turn off **Only I control playback** to let friends control it too.

## How it works

Each person watches the movie directly from their own streaming account. Afterglow shares play, pause, and movie position updates so everyone stays approximately in sync. It also shares chat messages.

Afterglow does not send the movie from your computer to your friend. Everyone needs access to the same title on the streaming service.

## What has been tested?

- The live server passed checks for creating parties, joining, playback updates, and chat.
- Hotstar playback and chat worked in two Chrome tabs on one Mac.
- Watching across two separate devices still needs a full test.
- Netflix and Prime Video are included as experimental adapters and still need live testing.
- Playback sync is approximate. Ads, buffering, and background tabs can cause delays.

Parties expire after six hours. Anyone with an invitation can join, so share it privately. Safari installation is not ready; use Chrome.

## Where is it hosted?

The website and backend run together on Cloudflare Workers through Sites hosting. Party information is stored in Cloudflare D1. Your Mac does not need to stay on to keep the website available.

## Developer guide

### Project layout

| Path | Purpose |
| --- | --- |
| `public/` and `server.js` | Local website and Node.js server |
| `extension/` | Chrome development extension, configured for the live server |
| `live/public/` | Website assets used by the hosted build |
| `live/worker/api.js` | Cloudflare Worker API |
| `live/drizzle/` | D1 database migrations |
| `live/scripts/build.mjs` | Hosted build script |
| `live/assets/extension.zip` | Extension download bundled with the hosted site |
| `test/` and `live/test.mjs` | Automated local API, extension, provider, and hosted-backend checks |
| `safari/` | Optional Safari extension sources; packaging requires full Xcode |
| `docs/` | Reverse-engineering observations and implementation notes |

### Run locally

Requires **Node.js 22 or newer**. No package installation is needed.

```sh
git clone https://github.com/krishnaverma2025-byte/afterglow-watch-together.git
cd afterglow-watch-together
npm start
```

Open http://localhost:3000. Choose the sample video, enter your name, and create a party. Copy the invitation and open it in another browser or tab to join as another person.

Local rooms are stored in memory, disappear when the server restarts, and expire after six hours. Localhost invitations work only on the same computer. Use the live website for remote friends.

Run automated checks:

```sh
npm test
```

### Local versus hosted architecture

| Component | Local version | Live version |
| --- | --- | --- |
| Website | Files served by Node.js | Assets bundled into the Cloudflare Worker |
| Backend | `server.js` | `live/worker/api.js` |
| Room storage | In memory | Cloudflare D1 |
| Website updates | Server-Sent Events | HTTPS state polling, approximately once per second |
| Streaming extension | Polls its configured backend | Polls the shared live backend |

The deployed version uses a Cloudflare Worker for both static assets and API routes, and D1 for persistent room state. It was published through **Sites hosting**; its infrastructure is managed by that service and is not attached to a personal Cloudflare dashboard. The checked-in hosting project ID is a resource identifier, not a credential.

The Chrome extension runs in each viewer’s browser. Videos stream directly from the provider to each viewer; the Afterglow backend shares room information, playback state, and chat.

### Create, invite, join, and synchronize

1. The extension identifies the provider and title from the active streaming page.
2. The host creates a room. The backend stores its title, playback state, settings, and membership.
3. The host shares the room’s invitation link.
4. A guest opens the same title and joins using that invitation. Title identity is checked when joining a streaming room.
5. The extension reads the local player, sends permitted playback changes, and receives the room’s current state.
6. Other viewers apply that state to their own players. Chat messages are shared through the backend too.

Host-only playback is enabled by default. The backend enforces permissions and uses playback revisions to reject stale changes. Late joiners receive the current room state.

For Netflix, the adapter uses an observed private player API; Prime Video and Hotstar use visible HTML video controls. Provider implementations can change, so adapters may need updates. See [streaming investigation](docs/streaming-investigation.md) for details.

### Build the hosted version

From the repository root:

```sh
cd live
node scripts/build.mjs
node --test test.mjs
```

The build generates `live/dist/server/index.js`, bundling the API, website assets, sample video, and extension ZIP.

**Building or pushing code to GitHub does not automatically update the live website.** Publishing is a separate deployment step.

Deploying to your own Cloudflare account requires configuring a Worker, binding a D1 database as `DB`, applying `live/drizzle/0000_rooms.sql`, and publishing the generated Worker. Update extension server URLs, invitation-origin checks, and host permissions when changing the deployment address. Rebuild the downloadable extension ZIP after changing the extension.

The `public/` and `live/public/` website copies, and `extension/` and `live/extension/` extension copies, are separate inputs. Update the relevant copies before building; the hosted extension download comes from `live/assets/extension.zip`.

### Streaming-service setup for development

The extension in this repository points to the live server. For the normal watch-with-a-friend flow, use the download linked above.

For local backend experiments, change the backend URLs and manifest host permissions to the local server before loading the extension. The local backend requires extension-origin pairing through `http://localhost:3000/streaming`; pairing is held in memory. See [extension notes](extension/README.md) for adapter design and local pairing details. Some notes there describe the earlier local development setup; the live URLs and user instructions in this README describe the current hosted version.

The website does not embed Netflix, Prime Video, or Hotstar video. Every viewer signs in independently and needs access to the same title.

### Validation and limitations

- Public-server checks passed for creating rooms, joining, playback updates, and chat.
- Hotstar creation, joining, approximate play/pause synchronization, shared control, and chat were tested in two Chrome tabs on one Mac.
- Playback across two separate devices still needs a full test.
- Netflix and Prime adapters have controlled tests but have not been validated against signed-in live players.
- Playback is approximate, with one-second polling in the hosted version. Ads, buffering, network delays, and background-tab throttling can affect synchronization.
- Automatic episode switching, live channels, and robust synchronization across different ad timelines are not implemented.
- Safari source is included, but an installable Safari build is not ready.

### Invitations and privacy

Private invitation links act as bearer credentials: anyone holding one can join until the room ends or expires. Share invitations privately.

Rooms expire after six hours. The hosted version stores room information in D1; the local version stores it in memory. There are no user accounts or invitation-revocation controls. This is an MVP.

Afterglow does not acquire streaming passwords, DRM keys, or video bytes. Each participant uses the streaming service directly.

### Independent implementation

Afterglow is inspired by observed create/invite/join behavior in Teleparty. It does not include Teleparty code, branding, or private service endpoints. See [Teleparty findings](docs/teleparty-findings.md) and [streaming investigation](docs/streaming-investigation.md) for evidence and limitations.

The bundled flower sample is from [MDN’s CC0 examples](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4).
