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

_Append learnings here as work progresses._
