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
