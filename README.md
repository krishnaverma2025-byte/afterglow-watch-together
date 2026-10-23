# Afterglow — Watch Together

Watch movies together with private party invitations, synchronized playback, and chat.

**Live site:** https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site

## Project layout

- `public/` and `server.js`: local website and Node.js server.
- `extension/`: Chrome development extension for streaming services.
- `live/`: deployed website, Cloudflare Worker API, D1 migrations, and build script.
- `test/`: automated local API, extension, and provider tests.
- `safari/`: optional Safari extension sources; packaging requires full Xcode.
- `docs/`: reverse-engineering observations and implementation notes.

## Run locally

Requires Node.js 22 or newer. No dependency installation is needed.

```sh
npm start
```

Open http://localhost:3000. Create a party with the sample video, then open its invitation in another browser or tab. Local rooms are in memory and expire after six hours. Localhost invitations work only on the same computer.

```sh
npm test
```

## Live version

The deployed version uses a Cloudflare Worker for both static assets and API routes, and D1 for persistent room state. It was published through Sites hosting; its infrastructure is managed by that service and is not attached to a personal Cloudflare dashboard. The checked-in hosting project ID is a resource identifier, not a credential.

```sh
cd live
node scripts/build.mjs
node --test test.mjs
```

The build generates `live/dist/server/index.js`. Deploying to a separate Cloudflare account requires configuring a Worker, binding a D1 database as `DB`, applying `live/drizzle/0000_rooms.sql`, and publishing the generated Worker.

## Streaming services

Visit the live site's `/streaming` page for the Chrome extension download. Each viewer installs the extension, signs in to the streaming service independently, and opens the same title. A host creates a party and shares the invitation; friends join using the extension. The server distributes playback state and chat. Video streams directly from the provider to each viewer.

The extension in this repository points to the live server. Update its server URLs and host permissions when deploying elsewhere. Local pairing is described in `extension/README.md`.

Hotstar creation, joining, approximate playback synchronization, shared control, and chat were tested in two Chrome tabs on one Mac. Netflix and Prime adapters have controlled tests but have not been validated against signed-in live players. Playback is approximate, with one-second state polling in the hosted version. Two-device verification remains outstanding. Provider changes can require adapter updates.

Private invitation links act as bearer credentials: anyone holding one can join until a room expires or ends. There are no user accounts or invitation revocation controls. This is an MVP.

## Independent implementation

Afterglow is inspired by observed create/invite/join behavior in Teleparty. It does not include Teleparty code, branding, or private service endpoints. See `docs/` for evidence and limitations. The bundled flower sample is an MDN CC0 example: https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4.
