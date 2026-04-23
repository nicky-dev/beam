# Architecture Decision: Forward Stream + Multi-Provider Chat

**Date:** 2025-07-18
**Author:** Wash (Lead / Architect)
**Status:** PROPOSED
**Requested by:** nickydev

---

## Context

nickydev has requested four major changes to Beam's multistreaming system:

1. **Mandatory OAuth** — remove manual stream key entry
2. **Access token persistence** — store OAuth tokens for chat retrieval + broadcast creation
3. **Broadcast creation on "Start Forward"** — create/update live broadcasts with PresetSettings title+description
4. **Multi-provider chat in widgets** — aggregate YouTube/Twitch/Facebook/TikTok chat alongside Nostr

This document analyzes the current codebase and proposes a concrete implementation plan.

---

## Current State Analysis

### Data Flow Today

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

### Key Problems

1. **access_token is discarded** — callback route uses it to fetch credentials, then throws it away. We need it for broadcast creation and chat retrieval.

2. **Facebook/TikTok create resources at OAuth time** — `getFacebookStreamCredentials()` creates a `live_video` with hardcoded title "Live Stream". `getTikTokStreamCredentials()` creates a live room similarly. These should be created at "Start Forward" time with proper title/description.

3. **OAuth scopes are too narrow for chat:**
   - YouTube: `youtube.readonly` — sufficient for reading chat but NOT for creating broadcasts
   - Twitch: `channel:read:stream_key` — no chat scope
   - Facebook: `publish_video` — may need additional scopes for comments
   - TikTok: `live.room.push_permission` — no public chat API

4. **Chat widget is Nostr-only** — `LiveChatWidget.tsx` and `live-chat/page.tsx` subscribe exclusively to kind:1311 + kind:9735 events. No provision for external chat sources.

5. **Manual setup exists** — Lines 795-841 and 885-897 in ForwardStreamSettings.tsx allow manual server URL + stream key entry. Must be removed per directive.

### Platform Credential Lifecycle

| Platform | Credentials from | Credential Lifetime | Broadcast Creation |
|----------|-----------------|---------------------|-------------------|
| YouTube | Existing liveStream (ingestion info) | Persistent (stable key) | Separate liveBroadcast API |
| Twitch | Helix stream key API | Persistent (stable key) | Auto-live on RTMP push |
| Facebook | Creating `live_video` → gets stream URL | Per-session (new each time) | Created when getting credentials |
| TikTok | Creating live room → gets stream URL | Per-session (new each time) | Created when getting credentials |

**Critical insight:** YouTube and Twitch have persistent stream keys — credentials obtained at OAuth time remain valid. Facebook and TikTok generate NEW credentials per live session — the room/video creation IS credential generation.

---

## Proposed Architecture

### A. Remove Manual Stream Key Entry

**ForwardStreamSettings.tsx changes:**
- Delete `manualSetup` state, `manualFields` state, `handleManualSave` callback
- Remove the "Manual Setup" button (line ~886-897)
- Remove manual TextField inputs (lines ~796-841)
- Update "Not Connected" state Alert to: "Connect your {Platform} account to get started."
- Only show the OAuth "Connect" button when not connected

**Effort:** Small — pure deletion of code.

### B. OAuth Access Token Persistence

#### B1. Expand PlatformConfig to include access token

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

**Security note:** This config is already encrypted via NIP-04 to the user's own pubkey (kind:30078, d-tag: `beamlivestudio-push-streams`). Adding access tokens to this encrypted blob is acceptable — the encryption boundary doesn't change. Only the user's signing key can decrypt it.

#### B2. Modify OAuth callback to return access token

**`/api/auth/[platform]/callback/route.ts` changes:**

Update `buildResponseHtml` to include `accessToken` in the postMessage payload:

```ts
const messageObj = credentials !== null
  ? {
      type: "oauth-success",
      platform,
      streamKey: credentials.streamKey,
      serverUrl: credentials.serverUrl,
      accessToken: credentials.accessToken,   // NEW
      refreshToken: credentials.refreshToken,  // NEW (if available)
    }
  : { type: "oauth-error", platform, error };
```

Update `StreamCredentials` to include tokens:
```ts
interface StreamCredentials {
  streamKey: string;
  serverUrl: string;
  accessToken: string;
  refreshToken?: string;
}
```

Thread the `accessToken` through `getStreamCredentials()` → return it back. Change `exchangeCodeForToken()` to return `{ accessToken, refreshToken }`.

#### B3. Update ForwardStreamSettings OAuth handler

`handleOAuthSuccess` must also extract and store `accessToken`:

```ts
const handleOAuthSuccess = useCallback(
  (data: Record<string, unknown>, platform: keyof ForwardStreamConfig) => {
    const streamKey = typeof data.streamKey === "string" ? data.streamKey : "";
    const serverUrl = typeof data.serverUrl === "string" ? data.serverUrl : "";
    const accessToken = typeof data.accessToken === "string" ? data.accessToken : "";
    setConfig((prev) => {
      const newConfig = {
        ...prev,
        [platform]: {
          ...prev[platform],
          streamKey: streamKey || prev[platform].streamKey,
          serverUrl: serverUrl || prev[platform].serverUrl,
          accessToken,
        },
      };
      saveConfig(newConfig);
      return newConfig;
    });
  },
  [saveConfig],
);
```

#### B4. Expand OAuth scopes

**`/api/auth/[platform]/route.ts` changes:**

```ts
const OAUTH_CONFIGS: Record<Platform, OAuthConfig> = {
  youtube: {
    // Need full youtube scope for broadcast creation + chat reading
    scopes: 'https://www.googleapis.com/auth/youtube',
  },
  twitch: {
    // Add chat:read for Twitch chat access
    scopes: 'channel:read:stream_key chat:read user:read:chat',
  },
  facebook: {
    // publish_video covers live_videos and comments reading
    scopes: 'publish_video',
  },
  tiktok: {
    scopes: 'live.room.push_permission',
  },
};
```

#### B5. Refactor Facebook/TikTok credential fetching

**Current problem:** `getFacebookStreamCredentials()` creates a `live_video` at OAuth time with hardcoded title "Live Stream". This should be split:

**Phase 1 (OAuth callback):** Only exchange code for token + validate account
- YouTube: fetch existing stream key (unchanged)
- Twitch: fetch stream key (unchanged)  
- Facebook: validate token works, return default RTMP URL — defer `live_video` creation
- TikTok: validate token works — defer room creation

**Phase 2 ("Start Forward"):** Create broadcast with title/description
- Done via new API route (see Section C)

For Facebook, the OAuth callback changes to return placeholder credentials:
```ts
async function getFacebookStreamCredentials(accessToken: string): Promise<StreamCredentials> {
  // Validate token by checking user info
  const response = await fetch(
    `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me?access_token=${accessToken}`
  );
  if (!response.ok) throw new Error("Invalid Facebook token");
  
  return {
    streamKey: "",  // Will be populated at broadcast creation time
    serverUrl: PLATFORM_RTMP_URLS.facebook,
    accessToken,
  };
}
```

Similarly for TikTok — defer room creation.

**Trade-off:** This means Facebook/TikTok will show as "Connected" but without stream credentials until "Start Forward" is clicked. The UI should indicate this state: "Connected — broadcast will be created when you start forwarding."

### C. Broadcast Creation on "Start Forward"

#### C1. New API Route: `/api/stream/[platform]/broadcast`

```
POST /api/stream/[platform]/broadcast
Body: {
  accessToken: string,
  title: string,
  description: string,
  image?: string,
}
Response: {
  broadcastId: string,
  streamKey?: string,    // For Facebook/TikTok (newly created)
  serverUrl?: string,    // For Facebook/TikTok (newly created)
}
```

**Per-platform behavior:**

| Platform | What happens at broadcast creation |
|----------|-----------------------------------|
| YouTube | `POST liveBroadcasts` with title+description, then `POST liveBroadcasts/bind` to existing stream |
| Twitch | `PATCH /helix/channels` to update title (auto-goes-live on RTMP push) |
| Facebook | `POST me/live_videos` with title+description+status=SCHEDULED_UNPUBLISHED → returns streamKey+serverUrl |
| TikTok | `POST /v2/live/room/create/` with title → returns streamKey+serverUrl |

#### C2. Reading PresetSettings in ForwardStreamSettings

The "Start Forward" handler needs access to the preset title/description. Options:

**Option A (Recommended): Fetch preset config from Nostr**
- `ForwardStreamSettings` already queries kind:30078 with d-tag `beamlivestudio-push-streams`
- Add another query for d-tag `beamlivestudio-config` (preset settings) 
- Or: lift preset data to a shared context/hook

**Option B: Shared React Context**
- Create `PresetContext` that holds current preset data
- Both `PresetSettings` and `ForwardStreamSettings` consume it

**Decision: Option A** — simpler, no new context needed. Add a `useQuery` for preset config in `ForwardStreamSettings`.

#### C3. Updated "Start Forward" flow

```
handleStartForward(platform):
  1. Read preset title + description from preset config query
  2. POST /api/stream/{platform}/broadcast
     → body: { accessToken, title, description, image }
     → response: { broadcastId, streamKey?, serverUrl? }
  3. If Facebook/TikTok: update config with new streamKey + serverUrl
  4. Store broadcastId in config
  5. POST /v1/push/start (existing push API)
     → body: { streamId, streamKey, rtmpUrl }
  6. Update UI state (isLive, pushId)
  7. Save config to Nostr
```

### D. Multi-Provider Chat in Widgets

This is the most architecturally significant change. There are three viable approaches:

#### Approach 1: Nostr Chat Bridge (Rejected)
Convert platform messages to Nostr kind:1311 events via a bot.
- **Pro:** Widget code barely changes
- **Con:** Requires bot signing key, pollutes relays, identity confusion, relay storage costs

#### Approach 2: Client-Side Polling in Widget (Rejected)
Widget directly polls platform chat APIs with access tokens.
- **Pro:** Simple, no backend
- **Con:** Access tokens would be exposed in OBS widget URLs — **security risk**

#### Approach 3: Backend Chat Aggregation (Recommended)
Backend service polls platform chats, serves normalized messages via SSE.

```
┌──────────────────┐     ┌──────────────────────┐     ┌────────────────┐
│ Dashboard        │────▶│ Backend Chat Service  │◀────│ Platform APIs  │
│ (registers chat  │     │ (polls chats, stores  │     │ (YT, Twitch,   │
│  credentials)    │     │  tokens in memory)    │     │  FB, TT)       │
└──────────────────┘     └──────────┬───────────┘     └────────────────┘
                                    │ SSE
                                    ▼
                          ┌──────────────────────┐
                          │ OBS Widget            │
                          │ (Nostr + SSE merged)  │
                          └──────────────────────┘
```

#### D1. Unified Chat Message Type

```ts
// src/lib/chat/types.ts
export interface UnifiedChatMessage {
  id: string;
  source: 'nostr' | 'youtube' | 'twitch' | 'facebook' | 'tiktok';
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    profileUrl?: string;
  };
  content: string;
  timestamp: number;          // unix seconds
  donation?: {
    amount: string;           // e.g., "500 sats", "$5.00", "50 bits"
    currency: string;         // "sats", "USD", "bits"
  };
  replyTo?: string;           // message ID being replied to
  platform: {
    messageId: string;        // platform-native message ID
    type: string;             // platform-specific message type
  };
}
```

#### D2. Chat Registration API

When "Start Forward" is clicked, dashboard registers chat sources with the backend:

```
POST /api/chat/register
Body: {
  streamerId: string,       // npub or pubkey
  platform: string,
  accessToken: string,
  broadcastId?: string,     // YouTube liveChatId, Facebook liveVideoId, etc.
}
Response: { chatSessionId: string }
```

```
DELETE /api/chat/register/{chatSessionId}
// Called when "Stop Forward" is clicked
```

#### D3. Chat SSE Endpoint

```
GET /api/chat/stream?npub={npub}
→ Server-Sent Events stream of UnifiedChatMessage[]
```

This endpoint:
1. Looks up active chat sessions for the given npub
2. Polls each platform's chat API on a timer (2-5 second intervals)
3. Normalizes messages to UnifiedChatMessage format
4. Pushes via SSE to connected clients

**Important:** Access tokens are stored server-side in memory (or a backing store). The widget only needs the npub — no tokens are exposed.

#### D4. Platform Chat Adapters

```
src/lib/chat/
  types.ts                    # UnifiedChatMessage type
  adapters/
    youtube.ts                # YouTube Live Chat API polling
    twitch.ts                 # Twitch EventSub or IRC chat
    facebook.ts               # Facebook Live Comments API
    tiktok.ts                 # TikTok Live Chat (if API available)
```

**YouTube adapter:**
```ts
// GET youtube/v3/liveChat/messages?liveChatId={id}&part=snippet,authorDetails
// Poll interval: use `pollingIntervalMillis` from response
// Returns: authorDisplayName, messageText, publishedAt, superChatDetails
```

**Twitch adapter:**
```ts
// Option A: EventSub WebSocket — subscribe to channel.chat.message
// Option B: IRC WebSocket wss://irc-ws.chat.twitch.tv:443
// EventSub is preferred (structured data, official API)
```

**Facebook adapter:**
```ts
// GET graph.facebook.com/{live-video-id}/comments
// Poll interval: 3-5 seconds
// Returns: from.name, message, created_time
```

**TikTok adapter:**
```ts
// TikTok does NOT have a public live chat API for third-party apps.
// This is a known limitation. Options:
//   1. Skip TikTok chat for v1
//   2. Investigate TikTok's WebSocket approach (unofficial)
// Decision: Skip for v1. Document as known limitation.
```

#### D5. Widget Updates

**New component: `MultiSourceChatMessage.tsx`**
- Renders a `UnifiedChatMessage` (any source)
- Shows platform icon badge (YouTube red, Twitch purple, etc.)
- Uses same visual style as existing `ChatMessage.tsx`
- Includes `data-chat*` attributes for Social Stream Ninja compatibility

**New hook: `usePlatformChat.ts`**
```ts
export function usePlatformChat(npub: string): UnifiedChatMessage[] {
  // Connects to SSE endpoint /api/chat/stream?npub={npub}
  // Returns normalized messages from all platform sources
  // Handles reconnection on disconnect
}
```

**Updated `LiveChatWidget.tsx` / `live-chat/page.tsx`:**
```tsx
// Nostr messages (existing)
const { events: nostrEvents } = useSubscription(subId);
const nostrMessages = useMemo(() => 
  nostrEvents?.map(e => ndkEventToUnifiedMessage(e)) ?? [], 
  [nostrEvents]
);

// Platform messages (new)
const platformMessages = usePlatformChat(pubkey);

// Merged + sorted
const allMessages = useMemo(() => 
  [...nostrMessages, ...platformMessages]
    .sort((a, b) => a.timestamp - b.timestamp),
  [nostrMessages, platformMessages]
);
```

**Updated `ChatMessagesList.tsx`:**
- Accept `UnifiedChatMessage[]` instead of `NDKEvent[]`
- Render `MultiSourceChatMessage` for each

**Backward compatibility:** Existing `ChatMessage.tsx` (Nostr-only) continues to work for non-widget contexts. The widget pages get the new multi-source component.

#### D6. WidgetContext expansion

```ts
export const WidgetContext = React.createContext<{
  liveInfo?: NDKEvent | null;
  liveId?: string;
  pubkey?: string;
  chatEnabled?: boolean;     // NEW: whether multi-provider chat is active
}>({ ... });
```

---

## Security Considerations

1. **Access tokens in NIP-04 encrypted config:** Acceptable. The config is encrypted to the user's own key. Only the user can decrypt. Same security boundary as stream keys today.

2. **Access tokens in postMessage:** Same-origin only (already validated). Acceptable given we already send stream keys the same way.

3. **Access tokens never in widget URLs:** Critical. Widgets authenticate by npub only. Backend holds tokens server-side.

4. **Token refresh:** YouTube and Facebook tokens expire. Need refresh token flow:
   - Store `refreshToken` at OAuth time
   - Before API calls, check `tokenExpiresAt`
   - If expired, call token refresh endpoint
   - Update stored tokens

5. **NIP-04 → NIP-44 migration:** Current config encryption uses deprecated NIP-04. This is a known issue (tracked in wash-feature-gaps.md). NOT in scope for this work — will be a separate migration. New code should be written to support both decryption methods.

---

## Work Breakdown

### Phase 1: OAuth Mandatory + Token Persistence (Priority: HIGH)

| Task | Owner | Dependencies | Effort |
|------|-------|-------------|--------|
| 1a. Remove manual setup UI from ForwardStreamSettings | Kaylee | None | S |
| 1b. Expand `PlatformConfig` type with accessToken fields | Kaylee | None | S |
| 1c. Update OAuth callback to return accessToken | Zoe | None | M |
| 1d. Update OAuth scopes (YouTube, Twitch) | Zoe | None | S |
| 1e. Update `handleOAuthSuccess` to store accessToken | Kaylee | 1b, 1c | S |
| 1f. Update "Connected" state UI (no manual edit) | Kaylee | 1a | S |

### Phase 2: Broadcast Creation on "Start Forward" (Priority: HIGH)

| Task | Owner | Dependencies | Effort |
|------|-------|-------------|--------|
| 2a. Create `/api/stream/[platform]/broadcast` route | Zoe | 1c, 1d | L |
| 2b. Refactor Facebook credential fetch (defer live_video creation) | Zoe | 2a | M |
| 2c. Refactor TikTok credential fetch (defer room creation) | Zoe | 2a | M |
| 2d. Add preset config query to ForwardStreamSettings | Kaylee | None | S |
| 2e. Update `handleStartForward` to call broadcast API | Kaylee | 2a, 2d | M |
| 2f. Add `handleStopForward` broadcast cleanup | Kaylee + Zoe | 2a | S |

### Phase 3: Multi-Provider Chat (Priority: MEDIUM)

| Task | Owner | Dependencies | Effort |
|------|-------|-------------|--------|
| 3a. Define `UnifiedChatMessage` type + adapters structure | Wash/Zoe | None | S |
| 3b. Implement YouTube chat adapter | Zoe | 3a | M |
| 3c. Implement Twitch chat adapter (EventSub WebSocket) | Zoe | 3a | L |
| 3d. Implement Facebook chat adapter | Zoe | 3a | M |
| 3e. Create chat registration API | Zoe | 3a | M |
| 3f. Create SSE chat stream endpoint | Zoe | 3b-3e | L |
| 3g. Create `usePlatformChat` hook | Kaylee | 3f | M |
| 3h. Create `MultiSourceChatMessage` component | Kaylee | 3a | M |
| 3i. Update `LiveChatWidget` + embed page for multi-source | Kaylee | 3g, 3h | M |
| 3j. Register/unregister chat on forward start/stop | Kaylee | 3e, 2e | S |

### Phase 4: Polish & Edge Cases (Priority: LOW)

| Task | Owner | Dependencies | Effort |
|------|-------|-------------|--------|
| 4a. Token refresh flow (YouTube, Facebook) | Zoe | Phase 1 | M |
| 4b. Error handling for expired tokens in UI | Kaylee | 4a | S |
| 4c. Chat reconnection logic in widget | Kaylee | Phase 3 | S |
| 4d. TikTok chat investigation | Zoe | Phase 3 | M |

**Effort scale:** S = < 2hrs, M = 2-8hrs, L = 8-16hrs

### Dependency Graph

```
Phase 1: 1a ─┐
         1b ─┤
         1c ─┼──▶ 1e ──▶ Phase 2
         1d ─┤
         1f ─┘
              
Phase 2: 2a ──┬──▶ 2e ──▶ Phase 3
         2b ──┤
         2c ──┤
         2d ──┘

Phase 3: 3a ──┬──▶ 3f ──▶ 3g ──▶ 3i
         3b ──┤         3h ──┘
         3c ──┤
         3d ──┤
         3e ──┘
```

---

## Decisions Summary

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Remove all manual stream key entry | User directive — OAuth is mandatory |
| D2 | Store access_token in NIP-04 encrypted config | Same security boundary as stream keys |
| D3 | Defer Facebook/TikTok broadcast creation to "Start Forward" | Allows using preset title/description; credentials are per-session anyway |
| D4 | Create new `/api/stream/[platform]/broadcast` route | Clean separation: OAuth = auth + stable credentials, broadcast = per-session |
| D5 | Backend chat aggregation via SSE (not client-side polling) | Keeps access tokens server-side; widgets only need npub |
| D6 | Skip TikTok chat for v1 | No public API available |
| D7 | Unified `UnifiedChatMessage` type for all sources | Single render path in widgets; clean adapter pattern |
| D8 | NOT migrating NIP-04 → NIP-44 in this work | Separate concern; tracked in wash-feature-gaps.md |
| D9 | Expand YouTube OAuth scope to full `youtube` | Required for broadcast creation + live chat access |
| D10 | Add `chat:read user:read:chat` to Twitch OAuth scopes | Required for EventSub chat subscription |

---

## Open Questions

1. **Token storage for chat service:** The SSE chat endpoint needs to store access tokens server-side. For MVP, in-memory Map is fine. For production, need Redis or similar. Zoe to decide.

2. **YouTube broadcast lifecycle:** Should we `POST liveBroadcasts/transition` to go live, or let the RTMP push auto-transition? Need to test.

3. **Facebook live_video status:** After RTMP push starts, does Facebook auto-transition to LIVE, or do we need an API call?

4. **Chat rate limits:** YouTube Live Chat API has quota limits. Twitch EventSub has connection limits. Need to handle gracefully.

5. **Multiple concurrent widgets:** If multiple OBS browser sources connect to the same SSE endpoint, should they share one polling loop or each get their own? (Share one — fan out to all SSE connections.)
