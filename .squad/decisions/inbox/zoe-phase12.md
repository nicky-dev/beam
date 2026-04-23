# Decision: Phase 1+2 Backend Implementation

**Date:** 2025-07-18
**Author:** Zoe (Backend / Nostr Dev)
**Status:** IMPLEMENTED

## What Changed

### Phase 1: OAuth Token Persistence

1. **`exchangeCodeForToken()`** now returns `{ accessToken, refreshToken? }` — refresh token is captured when available.
2. **`StreamCredentials`** interface expanded to include `accessToken` and optional `refreshToken`.
3. **All credential functions** thread tokens through and return them in the response.
4. **`buildResponseHtml`** postMessage payload now includes `accessToken` and `refreshToken` for the frontend to persist.
5. **Facebook/TikTok deferred (D3):** These platforms no longer create broadcasts at OAuth time. They validate the token and return placeholder `streamKey: ""`. Actual resource creation is deferred to the broadcast API.

### Phase 1d: OAuth Scopes

| Platform | Old Scope | New Scope |
|----------|-----------|-----------|
| YouTube | `youtube.readonly` | `youtube` (full — needed for broadcast creation + chat) |
| Twitch | `channel:read:stream_key` | `channel:read:stream_key chat:read user:read:chat` |
| Facebook | `publish_video` | `publish_video` (unchanged) |
| TikTok | `live.room.push_permission` | `live.room.push_permission` (unchanged) |

YouTube now uses `access_type: 'offline'` + `prompt: 'consent'` to obtain refresh tokens.

### Phase 2: Broadcast Creation API

New route: `POST /api/stream/[platform]/broadcast`

**Request:** `{ accessToken, title, description?, image? }`
**Response:** `{ broadcastId, streamKey?, serverUrl? }`

Per-platform:
- **YouTube:** Creates liveBroadcast, lists user's liveStream, binds broadcast to stream
- **Twitch:** Gets broadcaster ID, patches channel title (auto-goes-live on RTMP push)
- **Facebook:** Creates live_video with title+description, parses stream URL into streamKey+serverUrl
- **TikTok:** Creates live room with title, returns room_id + stream credentials

Error responses use `{ error: "token_expired" | "broadcast_failed", message }` pattern with appropriate HTTP status codes.

## Coordination Notes for Kaylee

- The `oauth-success` postMessage now has two new fields: `accessToken` and `refreshToken`. Update `handleOAuthSuccess` to extract these.
- Facebook/TikTok OAuth will return `streamKey: ""` — the UI should show "Connected" state but indicate credentials will be generated at forward start time.
- Call `POST /api/stream/{platform}/broadcast` before `POST /v1/push/start` in the "Start Forward" flow. Use the returned `streamKey`/`serverUrl` for Facebook/TikTok.
