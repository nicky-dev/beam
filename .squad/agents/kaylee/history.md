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
