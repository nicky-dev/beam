---
description: "Add a new streaming platform to Beam — OAuth routes, callback handler, RTMP config, and forwarding UI"
agent: "agent"
argument-hint: "Platform name (e.g., Kick, X, Rumble)"
---

Add a new streaming platform called **${{ input }}** to the Beam multistreaming system.

## Files to modify (in order)

### 1. OAuth initiation — [route.ts](../../src/app/api/auth/[platform]/route.ts)

- Add the new platform to the `Platform` union type
- Add an entry to `OAUTH_CONFIGS` with: `authUrl`, `clientId` (from env var), `scopes`, and optional `clientIdParam`

### 2. Token exchange & credentials — [callback/route.ts](../../src/app/api/auth/[platform]/callback/route.ts)

- Add the platform to the `Platform` union type
- Add an entry to `TOKEN_CONFIGS` with: `tokenUrl`, `clientId`, `clientSecret` (from env vars), and optional `clientIdParam`
- Create a `get<Platform>StreamCredentials(accessToken)` function that returns `StreamCredentials` (`{ streamKey, serverUrl }`)
- Register the function in the `getStreamCredentials` switch/map

### 3. Forwarding UI — [ForwardStreamSettings.tsx](../../src/component/ForwardStreamSettings.tsx)

- Add the platform to the `ForwardStreamConfig` interface
- Add default config with empty `streamKey`, the platform's RTMP server URL, and `isLive: false`
- Add a platform section in the UI with an appropriate MUI icon and accordion entry (follow existing YouTube/Twitch/Facebook/TikTok pattern)

### 4. Environment variables

- Add required env vars to `.env.local.example`: client ID and client secret for the new platform
- Use naming convention: `<PLATFORM>_CLIENT_ID`, `<PLATFORM>_CLIENT_SECRET`

## Requirements

- Follow existing patterns exactly — match the code style of YouTube/Twitch/Facebook/TikTok entries
- Use Biome formatting (tabs, 120-char lines)
- Keep OAuth scopes minimal — only request what's needed for live streaming
- Server-only secrets (client secrets) must NOT use `NEXT_PUBLIC_` prefix
