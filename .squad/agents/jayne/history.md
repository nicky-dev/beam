# Jayne — Project History

## Project Context
- **Project:** Beam — Nostr-based live streaming dashboard
- **Stack:** Next.js 15, React 19, TypeScript (strict)
- **User:** nickydev
- **Role on team:** Tester / QA

## Core Context
**Critical fact: Zero tests exist in this repo as of team formation (2026-04-23).**

Testing baseline to establish:
- No test framework configured yet (Vitest + Testing Library recommended)
- No test files anywhere in the project
- Priority targets: OAuth callbacks (security), Nostr hooks, ForwardStreamSettings (887 lines), embed widget attributes

Key areas of risk:
- OAuth token handling in `src/app/api/auth/[platform]/callback/route.ts`
- Nostr event publishing/subscribing in hooks
- `ForwardStreamSettings.tsx` — complex stateful component (887 lines, 4 OAuth platforms)
- OBS `data-chat*` attributes on chat messages (Social Stream Ninja integration)

## Learnings

_Append learnings here as work progresses._
