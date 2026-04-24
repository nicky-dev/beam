# Session Log: Stream Lifecycle Rethink (OBS-Driven Model)
**Timestamp:** 2026-04-24T06:22:43Z

## Summary
Wash (Architect) and Inara (Product Owner) completed parallel analysis of stream lifecycle architecture following user directive: BLS-001 (Go Live button) rejected; lifecycle is now OBS-driven (RTMP connection → auto-publish).

## Key Outcomes

### Architecture (Wash)
- **MVP Approach:** Poll `/v1/push/list/${streamId}` every 5 seconds
- **New hook:** `useStreamLifecycle()` — state machine + auto-publish
- **New component:** `StreamStatusIndicator.tsx` — visual state display
- **State machine:** OFFLINE → CONNECTING → LIVE → ENDING → ENDED
- **Pre-flight:** PresetSettings (kind 30078) becomes default template
- **Open:** Backend must verify RTMP status endpoint behavior

### Product Flow (Inara)
- **D5 elevated to P0:** Apply Preset workflow is core value prop
- **Pre-flight validation:** Block "Ready" until all checks pass (title, preset, platform, OAuth)
- **P0 features:** Auto-publish + checklist UI + live indicator + platform status
- **MVP phases:** Backend RTMP detection → Frontend pre-flight → Frontend live monitoring

### Decisions Made
1. No Go Live button; stream lifecycle is OBS-driven
2. PresetSettings is mandatory pre-flight configuration
3. Pre-flight validation blocks "Ready to Go" state
4. Platform status must be visible while live (not buried)
5. Dashboard has emergency "Stop Streaming" button (panic button)

## Next Steps
1. **Zoe (Backend):** Verify `/v1/push/list` returns source RTMP; implement status endpoint if needed
2. **Kaylee (Frontend):** Implement `useStreamLifecycle()` hook once backend ready
3. **Kaylee (Frontend):** Build pre-flight checklist + live monitoring UI
4. **Wash (Architect):** Review implementations before merge
5. **Team:** Discuss pre-flight validation rules and "Stop Streaming" button behavior

## Context
- Related decisions: `wash-stream-lifecycle-rethink.md`, `inara-stream-lifecycle-rethink.md`, `copilot-directive-20260424T061810.md`
- Phase 1+2 (OAuth + broadcast creation) complete; Phase 3 (chat) queued; stream lifecycle rethink now P0
- Estimated effort: 2–3 sprints (backend verification + 2 frontend phases + QA)
