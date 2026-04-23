# Kaylee — Project History

## Project Context
- **Project:** Beam — Nostr-based live streaming dashboard
- **Stack:** Next.js 15, React 19, TypeScript (strict), MUI v7, Tailwind v4, NDK, nostr-hooks
- **User:** nickydev
- **Role on team:** Frontend Dev

## Core Context
Beam has 18 components in a flat `src/component/` directory (PascalCase filenames). Key complex components:
- `ForwardStreamSettings.tsx` (887 lines) — multistream platform connections with OAuth
- `LoginScreen.tsx` (292 lines) — NIP-07 / nsec auth
- `ChatMessage.tsx` (204 lines) — chat with `data-chat*` OBS attributes
- `EditStreamingInfo.tsx` (182 lines) — stream metadata form

Dashboard pages: `/` (main), `/multistream`, `/widgets`
Embed routes: `/embed/live/[npub]/live-chat`, `/top-zappers`, `/viewers`

All interactive components require `"use client"` directive.
Use MUI `sx` prop (not raw className) for styling alongside Tailwind.

## Learnings

- ForwardStreamSettings uses encrypted Nostr kind 30078 events (NIP-04) to persist stream credentials. Decrypt failures must be surfaced to users, not swallowed.
- `@emotion/react` was not in package.json despite MUI depending on it — needed explicit install for `keyframes` usage.
- styled-jsx `<style jsx global>` is a Pages Router pattern; App Router components should use Emotion keyframes or MUI `sx` for animations.
- Manual setup flow was removed in Phase 1 — OAuth is now mandatory. No more `manualSetup`/`manualFields` state.
- When adding batch action buttons (Start All / Stop All), derive visibility from `useMemo` over config state to avoid stale UI.
- `handleStopForward` needed `useCallback` wrapping to satisfy `react-hooks/exhaustive-deps` when referenced by `handleStopAllForward`.
- PlatformConfig now includes `accessToken`, `refreshToken?`, `tokenExpiresAt?`, `broadcastId?` — all encrypted in the same NIP-04 kind:30078 event.
- Facebook and TikTok are "deferred credential" platforms — they return `streamKey: ""` at OAuth time. Credentials are created at "Start Forward" via the broadcast API.
- PresetSettings stores config as plain JSON in kind:30078 with d-tag `beamlivestudio-config`. Fields: `title`, `summary`, `image`, `tags`.
- "Start Forward" now follows a two-step flow: (1) POST `/api/stream/{platform}/broadcast` to create broadcast + get credentials, (2) POST `/v1/push/start` to start RTMP push.

### 2026-04-23 — Phase 1+2 Frontend Completion & Integration
- **OAuth token extraction complete:** `handleOAuthSuccess` properly extracts and stores `accessToken` + `refreshToken` from postMessage
- **Broadcast creation flow integrated:** `handleStartForward` calls broadcast API before push API, updates config with broadcastId + new credentials
- **Preset title/description fetched:** Query for kind:30078 (d-tag: `beamlivestudio-config`) working correctly
- **Facebook/TikTok deferred state:** UI correctly shows "Connected — credentials will be created when you start forwarding" for deferred platforms
- **Batch actions working:** `handleStartAllForward` checks `accessToken` for eligibility, `handleStopAllForward` clears broadcastId
- **Error handling:** Broadcast API errors (token_expired, broadcast_failed) properly handled and surfaced to user
- **Zoe coordination:** Backend broadcast API working as specified — tested with all 4 platforms
- **ForwardStreamSettings now 1054 lines:** Component remains single file, but with significantly expanded platform credential handling
- Decision formally recorded: `.squad/decisions/decisions.md` (D3. Phase 1+2 Frontend Implementation)

### 2026-04-23 — Phase 3 Multi-Provider Chat Frontend
- **usePlatformChat hook:** SSE EventSource to `/api/chat/stream?npub=` with auto-reconnect (5s), max 200 messages, dedup by id
- **PlatformChatMessage component:** Unified renderer with colored platform badges (Nostr=purple, YouTube=red, Twitch=purple, Facebook=blue) and Social Stream Ninja `data-chat*` attributes
- **NostrChatMessageAdapter:** Bridge component — takes NDKEvent, uses `useRealtimeProfile` for name/avatar, converts to UnifiedChatMessage, renders PlatformChatMessage. Cleanly handles zap invoices.
- **LiveChatWidget merged timeline:** Nostr events + platform SSE messages sorted by timestamp in a single interleaved view. No longer uses ChatMessageList — renders directly.
- **Embed live-chat page:** Extracts pubkey from WidgetContext, encodes to npub, feeds to usePlatformChat for SSE
- **ForwardStreamSettings chat registration:** `POST /api/chat/register` after successful push start (Step 5), `DELETE /api/chat/register` after stop. Both non-blocking (console.warn on failure). handleStopAllForward sends blanket deregister.
- **Profile handling pattern:** Per-message profile lookup via `useRealtimeProfile` inside NostrChatMessageAdapter avoids hook-rules issues with variable-length arrays. Each message component owns its own profile state.
- **ForwardStreamSettings now ~1110 lines** with chat registration logic added
- **Commit 3b28cfe:** Phase 3 frontend integration complete. All files staged and committed to main. Multi-provider chat fully operational.
