# Zoe — Project History

## Project Context
- **Project:** Beam — Nostr-based live streaming dashboard
- **Stack:** Next.js 15, TypeScript (strict), NDK v2.14, nostr-hooks v4, nostr-tools v2
- **User:** nickydev
- **Role on team:** Backend / Nostr Dev

## Core Context
Backend surface areas:
- `src/app/api/auth/[platform]/route.ts` — OAuth initiation
- `src/app/api/auth/[platform]/callback/route.ts` — OAuth token exchange
- OAuth popup pattern: callback returns HTML that postMessages credentials to opener
- `src/hook/nostr-event.ts` and `src/hook/widget.ts` — custom hooks
- RTMP backend at `NEXT_PUBLIC_PUSH_API_URL` (default http://localhost:8080)

NDK config (in dashboard layout):
- 5 relays: damus.io, relay.nostr.band, nos.lol, nostr.land, purplerelay.com
- IndexedDB caching via `@nostr-dev-kit/ndk-cache-dexie`

Nostr event kinds: 1311 (chat), 30311 (stream metadata, replaceable), 30078 (presets/config, replaceable), 9735 (zaps)

## Learnings

### Forward Stream Backend Hardening (2025-07)
- **Shared RTMP constants:** Created `src/lib/streaming/constants.ts` with `PLATFORM_RTMP_URLS` — single source of truth for default RTMP server URLs. Kaylee will import this into `ForwardStreamSettings.tsx`.
- **Facebook scope:** `user_videos` is read-only. `publish_video` is required for creating live streams via Graph API `/me/live_videos`.
- **Facebook API version:** Extracted to `FACEBOOK_API_VERSION` constant, configurable via `process.env.FACEBOOK_API_VERSION`. Currently `v20.0`.
- **YouTube API shape:** `stream.cdn.ingestionInfo` can be null if the stream isn't fully configured in YouTube Studio. Always null-check before accessing `streamName`/`ingestionAddress`.
- **Error message pattern:** All platform credential fetcher errors should be actionable — tell the user what to check or do, not just "failed to fetch".
- **Coordination pattern:** When Kaylee edits UI files, I create shared constants and update backend only. She imports from my constants file in follow-up.

### OAuth Token Persistence + Broadcast API (2025-07)
- **Token threading:** `exchangeCodeForToken()` now returns `{ accessToken, refreshToken? }` instead of a bare string. All `get*StreamCredentials()` functions accept and thread tokens into `StreamCredentials`.
- **YouTube offline access:** Changed `access_type` from `online` to `offline` and added `prompt: consent` to get refresh tokens. Expanded scope from `youtube.readonly` to full `youtube` for broadcast creation + chat.
- **Twitch chat scopes:** Added `chat:read user:read:chat` alongside `channel:read:stream_key`.
- **Facebook/TikTok deferred creation (D3):** At OAuth time, these platforms now only validate the token (fetch `/me` or `/user/info/`). Stream keys are empty placeholders. Actual broadcast/room creation happens via the new `/api/stream/[platform]/broadcast` endpoint at "Start Forward" time.
- **Broadcast API:** Created `POST /api/stream/[platform]/broadcast` — accepts `{ accessToken, title, description?, image? }`, returns `{ broadcastId, streamKey?, serverUrl? }`. YouTube creates liveBroadcast + binds to existing stream. Twitch patches channel title. Facebook creates live_video. TikTok creates live room.
- **Token expiry pattern:** Broadcast API returns `{ error: "token_expired", message: "..." }` with HTTP 401 so the frontend can prompt re-auth.
- **postMessage payload expansion:** `buildResponseHtml` now includes `accessToken` and `refreshToken` in the OAuth success message to the opener window.

### 2026-04-23 — Phase 1+2 Completion & Coordination
- **Broadcast API complete:** `/api/stream/[platform]/broadcast` endpoint tested and working across YouTube, Twitch, Facebook, TikTok
- **Token threading verified:** Access + refresh tokens flow through postMessage correctly
- **Facebook/TikTok deferred:** Credentials properly deferred to broadcast time — tested with placeholder streamKey
- **Error handling standardized:** Token expiry returns 401, broadcast failures return descriptive messages
- **Kaylee coordination:** Frontend successfully calling broadcast API in Start Forward flow, updating config with broadcastId + new credentials
- **Phase 3 ready:** Chat credential registration endpoints can be planned for backend SSE polling approach
- Decision formally recorded: `.squad/decisions/decisions.md` (D2. Phase 1+2 Backend Implementation)

### Phase 3 — Multi-Provider Chat Backend (2026-04-23)
- **Chat types:** `UnifiedChatMessage` normalizes Nostr/YouTube/Twitch/Facebook into a single shape. `ChatRegistration` holds per-platform credentials keyed by npub+platform.
- **In-memory store:** Module-level `Map<npub, Map<platform, ChatRegistration>>` — simple, works in local dev. Serverless instance recycling will lose state; acceptable for MVP. No persistence layer needed yet.
- **Adapters pattern:** Each adapter (`youtube.ts`, `twitch.ts`, `facebook.ts`) exports a single async fetch function returning `UnifiedChatMessage[]` + pagination state. All handle auth errors gracefully (return empty, log warning, never throw).
- **YouTube adapter:** Uses Live Chat Messages API with `part=snippet,authorDetails`. Maps Super Chat/Sticker to `donation` field. Returns `pollingIntervalMillis` from API for caller to respect.
- **Twitch adapter:** Uses Helix `GET /helix/chat/messages` — may 404 on some accounts. Falls back gracefully. Full Twitch chat will need EventSub WebSocket (future enhancement).
- **Facebook adapter:** Uses Graph API `/{liveVideoId}/comments?live_filter=stream`. Tracks `since` timestamp for incremental fetching.
- **SSE stream endpoint:** `GET /api/chat/stream?npub={npub}` — creates ReadableStream, polls each registered platform on intervals, heartbeats every 15s. Cleanup on abort signal. Never crashes on single platform error.
- **Registration API:** `POST/DELETE /api/chat/register` — manages in-memory store. POST takes full `ChatRegistration`, DELETE takes npub + optional platform.
- **Broadcast API updated:** YouTube `createYouTubeBroadcast` now extracts `broadcast.snippet.liveChatId` and returns it as `chatId` in `BroadcastResponse`.
- **TikTok chat skipped:** No public API for third-party chat access — confirmed in architecture decision D1.
- **Commit c7ecbcb:** Phase 3 backend infrastructure complete. All files staged and committed to main. Ready for Kaylee's frontend integration.
