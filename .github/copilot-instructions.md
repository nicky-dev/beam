# Project Guidelines — Beam

Nostr-based live streaming dashboard. Streamers manage streams, multistream to platforms (YouTube, Twitch, Facebook, TikTok), and embed OBS widgets (chat, top zappers, viewers).

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack), React 19
- **Language:** TypeScript (strict mode)
- **UI:** MUI v7 (`@mui/material`) with Emotion — use `sx` prop for inline styles
- **CSS:** Tailwind CSS v4 (via PostCSS) alongside MUI
- **Nostr:** NDK (`@nostr-dev-kit/ndk`), `nostr-hooks`, `nostr-tools`
- **Data fetching:** TanStack React Query v5
- **Forms:** React Hook Form v7
- **Package manager:** pnpm

## Build & Test

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server (Turbopack, port 3080)
pnpm build            # Production build
pnpm lint             # ESLint (Next.js rules)
pnpm lint:fix         # Auto-fix lint issues
```

Biome handles formatting and additional linting — run via editor integration.

## Code Style

- **Formatter:** Biome — tabs, 120-char line width, LF endings
- **Linting:** Biome (primary) + ESLint (Next.js/web-vitals rules)
- **Imports:** ESM only (`node:` protocol for Node built-ins), no CommonJS
- **Path alias:** `@/*` maps to `./src/*`

## Architecture

```
src/
  app/                    # Next.js App Router
    (dashboard)/          # Authenticated streamer dashboard (route group)
    api/auth/[platform]/  # OAuth routes for YouTube/Twitch/Facebook/TikTok
    embed/live/[npub]/    # OBS-embeddable widgets (chat, zappers, viewers)
    privacy/, terms/      # Static legal pages
  component/              # Flat directory, PascalCase filenames
  hook/                   # Custom React hooks
  lib/mui/                # MUI theme config (Noto Sans Thai, light/dark)
  lib/nostr/              # Nostr utilities (currently empty, logic in libraries)
```

### Key patterns

- **Client components** use `"use client"` directive — required for hooks, interactivity
- **Dashboard layout** initializes NDK with 5 relays (damus.io, relay.nostr.band, nos.lol, nostr.land, purplerelay.com) and IndexedDB caching
- **Embed layout** resolves `npub` → pubkey (NIP-05 or NIP-19), queries live stream event, wraps children in `WidgetContext`
- **Auth flow:** Nostr NIP-07 browser extension or raw private key (nsec/hex)
- **Backend API** at `NEXT_PUBLIC_PUSH_API_URL` (default `http://localhost:8080`) — handles RTMP push/stop/list

### Nostr event kinds

| Kind | Purpose |
|------|---------|
| 1311 | Live chat messages |
| 30311 | Live stream metadata (title, image, status) |
| 30078 | Preset/config storage |
| 9735 | Zaps (Lightning tips) |

## Conventions

- Components go in `src/component/` (flat, one component per file, PascalCase)
- Hooks go in `src/hook/` (camelCase filenames)
- Use MUI components (`Box`, `Paper`, `Typography`, `Button`, etc.) for UI — not raw HTML
- Prefer `useSubscription()` from `nostr-hooks` for real-time Nostr event queries
- Embed widgets support OBS/Social Stream Ninja via `data-chat*` attributes
- Environment variables: prefix public ones with `NEXT_PUBLIC_`, keep secrets server-only
- OAuth client IDs via env vars: `YOUTUBE_CLIENT_ID`, `TWITCH_CLIENT_ID`, `FACEBOOK_APP_ID`, `TIKTOK_CLIENT_KEY`
