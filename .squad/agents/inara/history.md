# Inara — Project Knowledge

## Project
Beam — Nostr-based live streaming dashboard. Streamers manage streams, multistream to YouTube/Twitch/Facebook/TikTok, and embed OBS widgets (chat, top zappers, viewers).

## Stack
Next.js 15, React 19, TypeScript strict, MUI v7, Tailwind v4 (imported but unused), NDK, nostr-hooks

## User
nickydev

## Primary User Persona
Nostr-native streamer — privacy-conscious, uses NIP-07 browser extension for identity, likely runs OBS, streams to multiple platforms simultaneously, cares about Nostr-native features (zaps, relay-based chat).

## Current Feature Set (April 2026)
- NIP-07 / nsec login
- RTMP stream key via NIP-98 admission endpoint
- Stream metadata management (kind 30311 via EditStreamingInfo)
- Single preset storage (kind 30078, hardcoded d tag)
- Multistream: YouTube, Twitch, Facebook, TikTok via OAuth + RTMP push
- OBS widgets: Live Chat (1311 + 9735), Top Zappers (9735), Viewers (30311 participant count)
- Platform chat bridge (YouTube, Twitch, Facebook, TikTok SSE)

## Known Product Gaps (from Wash audit, April 2026)
### High Priority
1. No "Go Live" / "End Stream" button — must create kind 30311 status=live/ended
2. OAuth token refresh unimplemented — YouTube tokens expire ~1hr
3. PresetSettings silently swallows save errors (no user feedback)
4. No stream analytics / session history
5. No live status indicator on home page
6. Multi-preset support (d tag hardcoded to one preset)
7. Stream scheduling (starts/ends NIP-53 tags not exposed)

### Medium Priority
8. No "Announce Stream" kind 1 note on go-live
9. Widget appearance customization (font, colors, transparency)
10. TikTok SSN session ID has no UI
11. No relay management UI (hardcoded relays)
12. No chat sending from dashboard
13. No platform broadcast title sync

## Known UX Issues (from Kaylee audit, April 2026)
### Critical
- No live/offline indicator on Stream Config page
- No confirmation before Stop Forward / Disconnect
- PresetSettings silent failure
- decryptError never surfaced in UI
- Loading screen has no timeout or retry
- "No streaming." message is confusing

### Minor
- Empty states ("No data.", "No streaming.") give no guidance
- Tailwind imported but not used
- Widget colors hardcoded, don't adapt to theme context
- No custom palette in MUI theme

## Technical Concerns
- ForwardStreamSettings.tsx is a 700+ line god component
- NIP-04 encryption in use (deprecated) — should migrate to NIP-44
- localStorage + Nostr dual-write can diverge

## Decisions
- Reviewer rejection lockout applies: if Inara rejects a feature, a different agent must revise it

## Learnings

### April 24, 2026 — Stream Lifecycle Rethink (OBS-Driven Model)

**Context:** Original D1 (Go Live button) was rejected. Stream lifecycle is now OBS-driven: streamer configures Beam, starts OBS, and Beam automatically publishes kind 30311 on RTMP connect.

**Key learnings:**
1. **No Go Live button.** Beam is configuration + monitoring, not stream control. Streamer controls stream from OBS only.
2. **D5 (Apply Preset to Stream) is now P0.** Pre-flight workflow is the core user value: select preset → auto-fill → validate → OBS start.
3. **Pre-flight validation is critical UX.** Must block "Ready to Go" until: preset set, title entered, platform selected, OAuth valid. Prevents mid-stream misconfiguration.
4. **Automatic kind 30311 publishing on RTMP connect.** Backend detects OBS connection, publishes status=live. On disconnect, publishes status=ended. No manual button clicks.
5. **Live Status Indicator > Go Live button.** Streamer needs prominent "LIVE" badge, real-time platform status panel, not a button to click.
6. **Grace period on RTMP disconnect.** Network hiccups can cause false "ended" events; implement 30-sec timeout before treating disconnect as real.
7. **Dashboard panic button remains.** Despite OBS-driven model, dashboard needs emergency "Stop Streaming" button for accident recovery.
8. **Three-phase MVP:** (1) Backend RTMP detection + auto-publish, (2) Frontend pre-flight UI, (3) Frontend live monitoring + platform status.

**Updated priorities (replacing D1):**
- P0: Automatic kind 30311 publishing + pre-flight checklist + live indicator + platform status
- P0 (elevated): Apply Preset flow (D5), Multi-preset system (D2), OAuth refresh (D3)
- P1: Dashboard chat read, error feedback, session analytics

**Next step:** Team consensus on pre-flight rules (esp. whether to allow OBS start without Beam config).
