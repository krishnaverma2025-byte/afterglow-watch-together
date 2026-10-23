# Afterglow — Watch Together

Watch a movie with your friends, keep playback in sync, and chat while watching.

**Afterglow is live on Cloudflare Workers.**

[Open Afterglow](https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site/) · [Friend’s setup and extension download](https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site/streaming)

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

## For developers

Requires Node.js 22 or newer.

```sh
npm start
```

Open http://localhost:3000. Localhost invitations only work on the same computer. Use the live site to watch with remote friends.

Run checks:

```sh
npm test
```

| Folder | What it contains |
| --- | --- |
| `public/` | Local website |
| `server.js` | Local backend |
| `extension/` | Chrome extension source, configured for the live server |
| `live/` | Hosted website, backend, database setup, and build script |
| `test/` | Automated checks |
| `docs/` | Research and implementation details |
| `safari/` | Optional Safari source; requires Xcode to package |

Build the hosted version:

```sh
cd live
node scripts/build.mjs
node --test test.mjs
```

Afterglow is an independent project inspired by Teleparty’s watch-party flow. It does not include Teleparty code or branding. The sample flower video is from [MDN’s CC0 examples](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4).
