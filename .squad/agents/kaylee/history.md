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

_Append learnings here as work progresses._
