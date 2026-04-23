# Wash — Project History

## Project Context
- **Project:** Beam — Nostr-based live streaming dashboard
- **Stack:** Next.js 15, React 19, TypeScript (strict), MUI v7, Tailwind v4, NDK, nostr-hooks, TanStack Query v5
- **User:** nickydev
- **Role on team:** Lead / Architect

## Core Context
Beam is a streamer dashboard for managing live streams on Nostr and multistreaming to YouTube, Twitch, Facebook, and TikTok. OBS widgets (chat, top zappers, viewers) are embeddable via `/embed/live/[npub]/` routes.

Key architectural facts:
- OAuth uses popup window pattern (postMessage to opener)
- RTMP backend at `NEXT_PUBLIC_PUSH_API_URL` (default http://localhost:8080)
- Nostr kinds: 1311 (chat), 30311 (stream metadata), 30078 (config/presets), 9735 (zaps)
- Dashboard layout initializes NDK with 5 relays + IndexedDB cache
- **No tests exist** as of team formation (2026-04-23)

## Learnings

_Append learnings here as work progresses._
