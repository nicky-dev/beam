# Decisions Compendium — Beam Project
**Generated:** 2026-04-23T09:53:00Z  
**Compiled by:** Scribe

---

## D1. Architecture Decision: Forward Stream + Multi-Provider Chat

**Date:** 2025-07-18  
**Author:** Wash (Lead / Architect)  
**Status:** PHASE 1+2 IMPLEMENTED, PHASE 3-4 PENDING  
**Requested by:** nickydev

### Context
nickydev requested four major changes to Beam's multistreaming system:
1. Mandatory OAuth — remove manual stream key entry
2. Access token persistence — store OAuth tokens for chat retrieval + broadcast creation
3. Broadcast creation on "Start Forward" — create/update live broadcasts with PresetSettings title+description
4. Multi-provider chat in widgets — aggregate YouTube/Twitch/Facebook/TikTok chat alongside Nostr

### Current State Analysis

**Data Flow (Pre-Implementation):**
```
OAuth Popup → /api/auth/[platform]/callback
  → exchangeCodeForToken() → access_token (DISCARDED after use)
  → getStreamCredentials(platform, access_token) → {streamKey, serverUrl}
  → postMessage({type, platform, streamKey, serverUrl}) → ForwardStreamSettings

ForwardStreamSettings:
  → stores {streamKey, serverUrl, isLive, pushId} per platform
  → saves to NIP-04 encrypted kind:30078 event (d-tag: "beamlivestudio-push-streams")
  → "Start Forward" → POST /v1/push/start {streamId, streamKey, rtmpUrl}
```

**Key Problems:**
1. access_token discarded after fetching credentials — needed for broadcast creation + chat retrieval
2. Facebook/TikTok create resources at OAuth time with hardcoded titles — should defer to "Start Forward" time
3. OAuth scopes too narrow for chat:
   - YouTube: `youtube.readonly` (insufficient for broadcast creation)
   - Twitch: `channel:read:stream_key` (no chat scope)
   - Facebook: `publish_video` (may need comments scope)
   - TikTok: `live.room.push_permission` (no public chat API)
4. Chat widget is Nostr-only — no external chat sources
5. Manual setup exists in ForwardStreamSettings — must be removed

**Platform Credential Lifecycle:**
| Platform | Credentials from | Lifetime | Broadcast Creation |
|----------|-----------------|----------|-------------------|
| YouTube | Existing liveStream (ingestion info) | Persistent (stable key) | Separate liveBroadcast API |
| Twitch | Helix stream key API | Persistent (stable key) | Auto-live on RTMP push |
| Facebook | Creating `live_video` → gets stream URL | Per-session (new each time) | Created when getting credentials |
| TikTok | Creating live room → gets stream URL | Per-session (new each time) | Created when getting credentials |

**Critical Insight:** YouTube and Twitch have persistent stream keys. Facebook and TikTok generate NEW credentials per session — resource creation IS credential generation.

### Proposed Architecture

#### Phase 1: OAuth Mandatory + Token Persistence

**A. Remove Manual Stream Key Entry**
- Delete `manualSetup` state, `manualFields` state, `handleManualSave` callback from ForwardStreamSettings
- Remove "Manual Setup" button and all manual TextField inputs
- "Not Connected" state shows only: Alert + OAuth Connect button

**B. Expand PlatformConfig**
```ts
interface PlatformConfig {
  streamKey: string;
  serverUrl: string;
  accessToken: string;      // NEW — OAuth access token for API calls
  refreshToken?: string;    // NEW — for token refresh (YouTube/Facebook)
  tokenExpiresAt?: number;  // NEW — unix timestamp when token expires
  broadcastId?: string;     // NEW — platform-specific broadcast/video/room ID
  isLive: boolean;
  pushId?: string;
}
```

**Security Note:** Config is encrypted via NIP-04 to user's own pubkey (kind:30078, d-tag: `beamlivestudio-push-streams`). Adding access tokens to this encrypted blob is acceptable — only user's signing key can decrypt.

**C. OAuth Callback Changes**
- `exchangeCodeForToken()` returns `{ accessToken, refreshToken? }` instead of bare string
- All `get*StreamCredentials()` functions accept and thread tokens
- `StreamCredentials` interface expanded: `{ streamKey, serverUrl, accessToken, refreshToken? }`
- `buildResponseHtml` postMessage includes `accessToken` and `refreshToken` for frontend

**D. YouTube Offline Access**
- Changed `access_type` from `online` to `offline`
- Added `prompt: 'consent'` to get refresh tokens
- Expanded scope from `youtube.readonly` → full `youtube` (needed for broadcast creation + chat)

**E. Twitch Chat Scopes**
- Added `chat:read user:read:chat` alongside `channel:read:stream_key`

**F. Facebook/TikTok Deferred Creation**
- These platforms now only validate token at OAuth time (fetch `/me` or `/user/info/`)
- Return placeholder `streamKey: ""` to frontend
- Actual broadcast/room creation deferred to Phase 2 broadcast API

**G. Frontend OAuth Handler**
- `handleOAuthSuccess` extracts and stores `accessToken` + `refreshToken` from postMessage
- `handleDisconnect` clears all token/broadcast fields
- Facebook/TikTok show "Connected — credentials will be created when you start forwarding" with accessToken but no streamKey

#### Phase 2: Broadcast Creation API

**New Route:** `POST /api/stream/[platform]/broadcast`

**Request:** `{ accessToken, title, description?, image? }`

**Response:** `{ broadcastId, streamKey?, serverUrl? }`

**Platform Implementations:**
- **YouTube:** Creates liveBroadcast with title, lists user's liveStream, binds broadcast to stream
- **Twitch:** Gets broadcaster ID from token, patches channel title (auto-live on RTMP push)
- **Facebook:** Creates live_video with title + description, parses stream URL into streamKey + serverUrl
- **TikTok:** Creates live room with title, returns room_id + stream credentials

**Error Handling:**
- Returns `{ error: "token_expired", message: "..." }` with HTTP 401 for token expiry
- Returns `{ error: "broadcast_failed", message: "..." }` with appropriate HTTP status
- Error messages are actionable

**Frontend Start Forward Flow:**
1. Fetch preset title/description from kind:30078 (d-tag: `beamlivestudio-config`)
2. Call `POST /api/stream/{platform}/broadcast` with accessToken, title, description
3. Update config with returned `broadcastId` + any new credentials
4. Call `POST /v1/push/start` with final credentials
5. Show loading spinner during broadcast creation

**Frontend Stop Forward Flow:**
- Clear `broadcastId` on stop
- Save updated config to Nostr

#### Phase 3: Multi-Provider Chat Aggregation (PENDING)

Backend SSE approach:
- Dashboard registers chat credentials with backend on forward start
- Backend polls platform APIs in background
- Widgets consume via SSE merged with Nostr events
- Access tokens never exposed to widget URLs

**TikTok chat:** No public API for third-party chat access. Deferred for investigation.

#### Phase 4: Polish (PENDING)
- Edge cases, error recovery, UI/UX refinement

---

## D2. Phase 1+2 Backend Implementation

**Date:** 2025-07-18  
**Author:** Zoe (Backend / Nostr Dev)  
**Status:** IMPLEMENTED

### What Changed

**Phase 1: OAuth Token Persistence**
1. `exchangeCodeForToken()` now returns `{ accessToken, refreshToken? }`
2. `StreamCredentials` interface expanded: `accessToken` + optional `refreshToken`
3. All credential functions thread tokens through and return them
4. `buildResponseHtml` postMessage includes `accessToken` and `refreshToken`
5. Facebook/TikTok return placeholder `streamKey: ""` (deferred creation)

**OAuth Scopes Updates:**
| Platform | Old Scope | New Scope |
|----------|-----------|-----------|
| YouTube | `youtube.readonly` | `youtube` (full — for broadcast creation + chat) |
| Twitch | `channel:read:stream_key` | `channel:read:stream_key chat:read user:read:chat` |
| Facebook | `publish_video` | `publish_video` (unchanged) |
| TikTok | `live.room.push_permission` | `live.room.push_permission` (unchanged) |

YouTube now uses `access_type: 'offline'` + `prompt: 'consent'` for refresh tokens.

**Phase 2: Broadcast Creation API**

New route: `POST /api/stream/[platform]/broadcast`
- **Request:** `{ accessToken, title, description?, image? }`
- **Response:** `{ broadcastId, streamKey?, serverUrl? }`
- **YouTube:** Creates liveBroadcast, lists liveStream, binds broadcast to stream
- **Twitch:** Gets broadcaster ID, patches channel title (auto-go-live on RTMP push)
- **Facebook:** Creates live_video, parses stream URL into streamKey+serverUrl
- **TikTok:** Creates live room, returns room_id + credentials

### Coordination Notes for Kaylee
- OAuth postMessage includes `accessToken` and `refreshToken` — extract in `handleOAuthSuccess`
- Facebook/TikTok OAuth return `streamKey: ""` — show "Connected" but indicate credentials generated at forward start
- Call `POST /api/stream/{platform}/broadcast` before `POST /v1/push/start` in "Start Forward" flow

### Files Modified
- `src/app/api/auth/[platform]/callback/route.ts` — OAuth callback with token threading
- `src/app/api/auth/[platform]/route.ts` — OAuth initiation with expanded scopes
- `src/app/api/stream/[platform]/broadcast/route.ts` — NEW broadcast creation endpoint
- `src/lib/streaming/constants.ts` — NEW shared constants for RTMP URLs + API config

---

## D3. Phase 1+2 Frontend Implementation

**Date:** 2025-07-18  
**Author:** Kaylee (Frontend Dev)  
**Status:** IMPLEMENTED

### What Changed

**Phase 1: OAuth Mandatory + Token Persistence**
- Removed all manual setup UI (manualSetup state, buttons, TextFields)
- Expanded `PlatformConfig`: `accessToken`, `refreshToken?`, `tokenExpiresAt?`, `broadcastId?`
- Updated `handleOAuthSuccess` to extract and store `accessToken` + `refreshToken`
- Updated `handleDisconnect` to clear all token/broadcast fields
- Facebook/TikTok show "Connected — credentials will be created when you start forwarding" with accessToken but no streamKey

**Phase 2: Broadcast Creation Flow**
- Added `presetQuery` to fetch kind:30078 (d-tag: `beamlivestudio-config`) for title/description
- `handleStartForward` now: (1) calls `POST /api/stream/{platform}/broadcast`, (2) updates config with broadcastId + credentials, (3) calls push API
- `handleStopForward` clears `broadcastId` on stop, saves config
- `handleStartAllForward` checks `accessToken` instead of `streamKey` for eligibility
- Added `broadcastCreating` state with loading spinner on Start Forward button
- Removed unused `callStartPushApi` helper

### Dependencies on Zoe
✓ Broadcast API route (`/api/stream/[platform]/broadcast`) returning `{ broadcastId, streamKey?, serverUrl? }`
✓ OAuth callbacks including `accessToken` and `refreshToken` in postMessage
✓ Facebook/TikTok OAuth returning `streamKey: ""` (deferred)

### Files Modified
- `src/component/ForwardStreamSettings.tsx` — 1054 lines (expanded from 1043)

---

## D4. Forward Stream Backend Constants & Scopes

**Date:** 2025-07-14  
**Author:** Zoe (Backend / Nostr Dev)  
**Status:** Implemented

### Context
Forward stream had hardcoded RTMP URLs, wrong Facebook scopes, unsafe property access, inconsistent error handling.

### Decisions
1. **Shared RTMP constants** at `src/lib/streaming/constants.ts` — `PLATFORM_RTMP_URLS` single source of truth
2. **Facebook OAuth scope:** `user_videos` → `publish_video` (read-only → create capability)
3. **Facebook API version:** Extracted to `FACEBOOK_API_VERSION` constant, configurable via env
4. **Error messages:** Actionable across all platform fetchers

### Impact
- Kaylee imports `PLATFORM_RTMP_URLS` from `@/lib/streaming/constants` to replace hardcoded URLs
- New streaming platforms should add RTMP URL to `PLATFORM_RTMP_URLS`

---

## D5. ForwardStreamSettings UI Completion

**Date:** 2025-07-24  
**Author:** Kaylee (Frontend Dev)  
**Status:** Implemented (Pre-Phase 1)

### Context
Component supported OAuth, had no batch stop, silently handled errors, used Pages Router patterns.

### Decisions
1. **Manual Setup fallback** — Per-platform manual entry (server URL + stream key) as OAuth alternative *(Note: Removed in Phase 1)*
2. **Stop All Forward** — Batch stop alongside Start All, visible when ≥1 platform live, resilient with `Promise.allSettled`
3. **User feedback via MUI Snackbar** — Single shared state for clipboard, save success/failure
4. **Decrypt failure Alert** — Dismissible warning instead of silent fallback
5. **Emotion keyframes** — `@emotion/react` for pulse animation, compatible with App Router

### Impact
- `@emotion/react` added to package.json dependencies
- Component grew from 887 to ~1050 lines

---

## D6. Feature Gaps & High-Priority Issues

**Date:** 2025-07-18  
**Author:** Wash (Lead / Architect)  
**Status:** Audit Complete, Fixes Pending

### 🔴 HIGH Priority

**H1. XSS Vulnerability in OAuth Callback**
- **File:** `src/app/api/auth/[platform]/callback/route.ts:250-257`
- **Issue:** `postMessage(${message}, ...)` injects JSON into `<script>` tag. If credential contains `</script>`, breaks out of context.
- **Assign:** Zoe
- **Effort:** Small

**H2. Empty `src/lib/nostr/` — No Shared Nostr Utilities**
- **File:** `src/lib/nostr/` (empty)
- **Issue:** Magic kind numbers (`1311`, `30311`, `30078`, `9735`) scattered as literals across 6+ files. Relay lists duplicated in two layouts.
- **Assign:** Zoe
- **Effort:** Medium

**H3. Hardcoded RTMP Stream URL**
- **File:** `src/component/StreamUrlBox.tsx:10`
- **Issue:** `"rtmp://beam.mapboss.co.th/live"` hardcoded. Should be env var `NEXT_PUBLIC_STREAM_URL`.
- **Assign:** Zoe
- **Effort:** Small

**H4. Unsafe JSON.parse Without try/catch**
- **File:** `src/component/PresetSettings.tsx:42-44`
- **Issue:** `JSON.parse(info.data?.content || "{}")` in `useMemo` — no error boundary for corrupted content.
- **Assign:** Kaylee
- **Effort:** Small

**H5. Unhandled nip19.decode() Throws**
- **Files:** `src/app/embed/live/[npub]/layout.tsx:46`, `src/app/(dashboard)/widgets/page.tsx:46`
- **Issue:** `nip19.decode(val).data.toString()` throws on invalid input. No try/catch in queryFn.
- **Assign:** Zoe
- **Effort:** Small

**H6. No Test Coverage Exists**
- **Issue:** Zero tests in entire project. No test framework configured.
- **Assign:** Jayne
- **Effort:** Large

**H7. `window.nostr` Type Definitions Untyped**
- **File:** `src/types.d.ts:7`
- **Issue:** `signEvent(event: unknown): Promise<unknown>` defeats TypeScript safety for NIP-07 signing.
- **Assign:** Zoe
- **Effort:** Small

### 🟡 MEDIUM Priority
*(14 issues) — See full audit report for details*

### 🟢 LOW Priority
*(9 issues) — See full audit report for details*

---

## D7. User Directives — Forward Stream Architecture

**Date:** 2026-04-23T09:53:19Z  
**By:** nickydev (via Copilot)  
**Status:** PHASE 1+2 IMPLEMENTED

### Requirements
1. **OAuth connection MANDATORY** — Remove manual stream key entry. OAuth links to stream forwarding AND chat retrieval.
2. **RTMP auto-population** — After OAuth connect, RTMP server URL and stream key auto-populated (already works).
3. **Broadcast creation on "Start Forward"** — System must: (a) call push stream API (OvenMediaEngine), (b) create/share live broadcast using preset title + description.
4. **Multi-provider chat** — Widget displays YouTube, Twitch, Facebook, TikTok live chat alongside Nostr.

### Rationale
Foundational architecture for multistream + multi-provider chat.

---

**END OF DECISIONS COMPENDIUM**
