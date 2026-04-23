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

### 2025-07-18 — Full Codebase Audit
- Conducted comprehensive audit of all `src/` files. Found 30 issues (7 HIGH, 14 MEDIUM, 9 LOW).
- **Security:** XSS vector in OAuth callback route — `postMessage` JSON injected directly into `<script>` tag without proper escaping (`src/app/api/auth/[platform]/callback/route.ts:250`).
- **Architecture debt:** `src/lib/nostr/` is completely empty. Magic kind numbers (1311, 30311, 30078, 9735) are scattered as literals across 6+ files. Relay lists duplicated in two layouts.
- **Hardcoded RTMP URL:** `rtmp://beam.mapboss.co.th/live` in `StreamUrlBox.tsx` — not configurable per deployment.
- **Error handling gaps:** Multiple async operations (event.publish, getToken, nip19.decode) lack try/catch. PresetSettings has unsafe JSON.parse in useMemo.
- **No tests:** Still zero test coverage. Jayne should set up test framework as foundation.
- **Custom hooks are bare:** `useEventId` and `useEvents` return only data — no loading/error state for consumers.
- **Accessibility:** Widespread missing aria-labels on fallback Avatars, chat container needs `role="log"`, login field lacks visible label.
- Full report: `.squad/decisions/inbox/wash-feature-gaps.md`
