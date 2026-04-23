# Decision: ForwardStreamSettings UI Completion

**Author:** Kaylee (Frontend Dev)
**Date:** 2025-07-24
**Status:** Implemented

## Context
The ForwardStreamSettings component only supported OAuth-based platform connections, had no batch stop functionality, and silently handled errors for clipboard, decrypt, and save operations. The styled-jsx pulse animation was a Pages Router anti-pattern.

## Decisions Made

1. **Manual Setup fallback** — Added per-platform manual entry (server URL + stream key) as alternative to OAuth. This ensures users can still configure platforms when OAuth isn't set up or fails.

2. **Stop All Forward** — Added alongside Start All Forward, visible only when ≥1 platform is live. Uses `Promise.allSettled` for resilience.

3. **User feedback via MUI Snackbar** — Clipboard copy, config save success/failure all use a single shared Snackbar state. Avoids multiple overlapping notifications.

4. **Decrypt failure Alert** — Dismissible warning when saved config can't be decrypted, rather than silent fallback.

5. **Emotion keyframes over styled-jsx** — Added `@emotion/react` as explicit dependency. Pulse animation now uses `keyframes` from Emotion, compatible with App Router.

## Impact
- `@emotion/react` added to package.json dependencies
- Component grew from 887 to ~1050 lines but remains a single file per project convention
