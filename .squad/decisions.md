# Squad Decisions

## Active Decisions

### D1. User Directive: OBS-Driven Stream Lifecycle (2026-04-24)
**By:** nickydev (via Copilot)  
**Status:** Accepted

**What:** BLS-001 (Go Live / End Stream button) is NOT needed. Stream lifecycle will be driven by OBS → RTMP push. Nostr Live (kind 30311 status) should start/end automatically based on RTMP connection state — not via a manual UI button.

**Why:** Simplifies UX; aligns with OBS-first workflow. Eliminates manual button clicks and reduces async confusion.

**Impact:**
- Replaces previous D1 (Go Live button as P0)
- Elevates D5 (Apply Preset to Stream flow) to P0
- Requires backend RTMP detection + auto-publish architecture
- Frontend needs pre-flight validation checklist + live status indicator

---

### D2. Architecture: Auto-Lifecycle from RTMP Connection (2026-04-24)
**By:** Wash (Architect)  
**Status:** Proposed

**Context:** User decision — no Go Live button. Stream lifecycle follows OBS RTMP connection state.

**Solution:**
1. **RTMP → Nostr Bridge:** Frontend polls `/v1/push/list/${streamId}` every 5 seconds (MVP)
   - Backend has RTMP state; frontend has signing key → frontend must publish
   - Polling acceptable for MVP; WebSocket/SSE for future optimization

2. **Frontend State Machine:** `useStreamLifecycle()` hook manages:
   ```
   OFFLINE → CONNECTING → LIVE → ENDING → ENDED
   ```

3. **Pre-flight Workflow:** PresetSettings (kind 30078) is default template
   - No separate "planned" state; simpler UX
   - Pre-flight validation blocks "Ready to Go" until all checks pass

4. **New Components:**
   - `src/hook/useStreamLifecycle.ts` — polling, state machine, Nostr publishing
   - `StreamStatusIndicator.tsx` — visual state display (gray/yellow/green/yellow/red dots)

5. **Existing Code Unchanged:**
   - ForwardStreamSettings remains independent; platforms forwarding separate from lifecycle
   - EditStreamingInfo still works for live edits
   - RTMP URL + stream key generation unchanged

**Edge Cases Handled:**
- Rapid reconnect (5-sec grace period acceptable for MVP)
- Browser closed during stream (detect existing connection on reopen)
- Multi-tab coordination (NDK handles deduplication via replaceable events)

**Open Questions:**
- Does `/v1/push/list` return source RTMP connection or only forwarding pushes? (Backend: Zoe)
- If not, implement: `GET /v1/rtmp/status/${streamId}` with bitrate/resolution metadata

---

### D3. Product Flow: OBS-Driven Stream Lifecycle & Pre-flight Validation (2026-04-24)
**By:** Inara (Product Owner)  
**Status:** Proposed

**User Story:** Streamer configures Beam → starts OBS → dashboard auto-publishes kind 30311 → platforms auto-receive stream.

**Complete Flow:**
```
1. Open Beam → select preset
2. Configure title, image, platforms
3. Pre-flight checklist validates (green ✓):
   - Preset set
   - Title entered (3–200 chars)
   - At least 1 platform selected
   - OAuth tokens not expired
   - No ForwardStreamSettings errors
4. Start OBS → RTMP connects
5. Dashboard auto-publishes kind 30311 status=live
6. Platforms auto-ingest; no manual button needed
7. Stop OBS → dashboard auto-publishes status=ended
```

**Pre-flight Validation (CRITICAL UX):**
- Prevents mid-stream misconfiguration failures
- Block "Ready to Go" state until all checks pass
- Show inline error messages with fix instructions
- Yellow warning for OAuth expiring in <1hr (let stream proceed)
- Red error blocks stream for missing/invalid config

**What Replaces BLS-001:**
1. **Automatic kind 30311 publishing** (backend-driven on RTMP connect/disconnect)
2. **Pre-flight Checklist UI** (frontend validation before OBS starts)
3. **Live Status Indicator** (prominent "LIVE" badge, not clickable button)
4. **Platform Status Panel** (real-time connection health: bitrate, errors)

**Updated Priorities (D5 elevated to P0):**
| Feature | Reason |
|---------|--------|
| Auto kind 30311 publish | Core stream lifecycle |
| Pre-flight Checklist | UX clarity, prevent misconfiguration |
| Live Status Indicator | Streamer feedback |
| Platform Status Panel | Monitor forwarding health |
| Apply Preset flow (D5) | **ELEVATED** — core workflow now |
| Multi-preset (D2) | Even more critical for presets |
| OAuth refresh (D3) | Tokens expire during streams |

**MVP Phases:**
1. Backend: RTMP detection + auto-publish kind 30311
2. Frontend: Pre-flight checklist + validation
3. Frontend: Live indicator + platform status + emergency stop button

**Anti-Patterns (DO NOT):**
- ❌ Build a Go Live button that publishes kind 30311 (race with OBS)
- ❌ Show stream status as a clickable button (users will try to click it)
- ❌ Let OBS start without pre-flight validation (mid-stream failures)
- ❌ Bury platform status in collapsed accordion (streamer won't see disconnects)
- ❌ Let backend publish kind 30311 from UI (open race conditions)
- ❌ Hardcode "stream live when RTMP connected" without grace period (network hiccups cause false toggles)

**Success Metrics:**
- Speed to live: < 3 min (90% of streams)
- Zero-click platform forwarding: Select → auto-connect
- Config error rate: < 2% of streams
- Platform sync latency: < 2 sec from RTMP to all platforms
- Mid-stream handoff: OAuth expiry → graceful retry

---

### (Previous) D1. Go Live/End Stream Button
**Status:** ❌ REJECTED (replaced by auto-lifecycle architecture)  
**Reason:** User directive (2026-04-24) — BLS-001 not needed; lifecycle is OBS-driven.

---

### (Previous) D2–D6. Known Product Gaps (Inara Audit, 2026-04-24)
**Status:** Under review; most elevated to P0 under new OBS-driven model.

- D2: Multi-preset system → ✅ P0
- D3: OAuth token refresh → ✅ P0
- D4: Unified Dashboard Chat → P1
- D5: Apply Preset flow → ✅ **ELEVATED P0** (core workflow now)
- D6: Nostr onboarding invisible for non-Nostr users → P1

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
