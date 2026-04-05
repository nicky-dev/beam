---
description: "Scaffold a new OBS-embeddable widget for the Beam live streaming dashboard"
agent: "agent"
argument-hint: "Widget name and data source (e.g., stream-goals showing zap progress)"
---

Add a new OBS-embeddable widget called **${{ input }}** to the Beam embed system.

## Files to create/modify

### 1. Embed page — `src/app/embed/live/[npub]/<widget-name>/page.tsx`

Create a new `"use client"` page that:

- Imports `useWidgetContext` from `@/hook/widget` to access `liveId`, `liveInfo`, `pubkey`
- Uses `useSubscription()` from `nostr-hooks` for real-time event data
- Creates a stable subscription ID: `useMemo(() => "<widget>-" + liveId, [liveId])`
- Builds NDK filters with the appropriate kind and `"#a": [liveId]` tag filter
- Cleans up subscription in `useEffect` return
- Uses MUI components (`Box`, `Typography`, `List`, etc.) with `sx` prop for styling
- Transparent background for OBS overlay compatibility
- Exports a default function component

Follow the pattern in these existing widgets:
- [live-chat/page.tsx](../../src/app/embed/live/[npub]/live-chat/page.tsx) — real-time event feed with auto-scroll
- [top-zappers/page.tsx](../../src/app/embed/live/[npub]/top-zappers/page.tsx) — aggregated data from events
- [viewers/page.tsx](../../src/app/embed/live/[npub]/viewers/page.tsx) — single-value display from replaceable event

### 2. Widget component (if reusable) — `src/component/<WidgetName>Widget.tsx`

If the widget will also be used in the dashboard (not only as an embed), extract the core logic into a standalone component in `src/component/` that accepts `liveId` as a prop. The embed page then wraps it with `useWidgetContext()`.

### 3. Dashboard widgets page — `src/app/(dashboard)/widgets/page.tsx`

Add an embed URL entry for the new widget so streamers can copy the OBS browser source URL. Follow the existing pattern for live-chat, top-zappers, and viewers URLs.

## Conventions

- Embed pages are `"use client"` — they run entirely in the browser
- The parent layout (`src/app/embed/live/[npub]/layout.tsx`) already provides `WidgetContext` with NDK initialized — do NOT re-initialize NDK
- Use `rgba(0, 0, 0, 0)` or transparent backgrounds for OBS compatibility
- White text with drop shadow for readability over video
- Style scrollbars with thin semi-transparent thumbs
- For OBS/Social Stream Ninja compatibility, add `data-chat*` attributes on rendered elements where applicable
- Use Biome formatting (tabs, 120-char lines)
