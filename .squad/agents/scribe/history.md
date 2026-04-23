# Project Context

- **Project:** beam — Nostr-based live streaming dashboard
- **Created:** 2026-04-23
- **Role on team:** Documentation specialist

## Core Context

Beam is a streamer dashboard managing live streams on Nostr and multistreaming to YouTube, Twitch, Facebook, TikTok. OBS widgets (chat, top zappers, viewers) embeddable via `/embed/live/[npub]/` routes.

**Stack:** Next.js 15, React 19, TypeScript (strict), MUI v7, Tailwind v4, NDK, nostr-hooks
**OAuth pattern:** Popup window with postMessage to opener
**Nostr event kinds:** 1311 (chat), 30311 (stream metadata), 30078 (presets/config), 9735 (zaps)

## Recent Updates

📌 **2026-04-23 — Phase 1+2 Documentation Complete**
- Created 3 orchestration logs (Wash, Zoe, Kaylee) documenting Phase 1+2 execution
- Created session log summarizing Phase 1+2 completion
- Merged `.squad/decisions/inbox/` → `.squad/decisions/decisions.md` (7 decisions documented)
- Updated Wash/Zoe/Kaylee history files with cross-agent context
- Staged all documentation for git commit

## Learnings

### 2026-04-23 — Squad Workflow & Documentation Patterns
- **Orchestration logs** capture agent execution: mission, what they did, deliverables, coordination notes
- **Session logs** summarize team outcomes: who participated, scope, results, next phase readiness
- **Decisions compendium** formally records architecture + implementation decisions with context, rationale, impact
- **Cross-agent history** tracks dependencies: Zoe's broadcast API enables Kaylee's Start Forward flow
- **4-phase rollout structure** for forward stream: Phase 1 (OAuth+tokens) → Phase 2 (broadcast API) → Phase 3 (multi-provider chat) → Phase 4 (polish)
- **Facebook/TikTok deferred pattern:** Per-session credential platforms (vs. YouTube/Twitch persistent keys) require resource creation at stream time, not OAuth time
- **Multi-provider chat approach:** Backend SSE for platform APIs + Nostr events merged in widgets (access tokens never exposed to widget URLs)
