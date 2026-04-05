---
name: nostr-dev
description: "Implement Nostr protocol features in Beam. Use when: adding a new event kind, creating a subscription hook, building a widget that reads Nostr events, publishing or signing events, working with NIPs (NIP-04, NIP-05, NIP-07, NIP-19, NIP-98), or debugging relay queries."
argument-hint: "Feature description (e.g., add kind 1985 reviews, subscribe to DMs)"
---

# Nostr Feature Development

Guided workflow for implementing Nostr protocol features in the Beam live streaming app.

## When to Use

- Adding support for a new Nostr event kind
- Creating a hook or component that subscribes to events
- Publishing or signing events from the dashboard
- Building an embed widget backed by Nostr data
- Working with NIP specifications (encryption, identity, auth)

## Procedure

### Step 1 — Classify the feature

Determine which pattern applies:

| If the feature needs to... | Go to |
|---|---|
| **Read events in real-time** (chat feed, live updates) | Step 2a |
| **Fetch a single event once** (config, metadata lookup) | Step 2b |
| **Publish/write events** (save settings, post chat) | Step 2c |
| **Display data in an OBS embed** | Step 2d |

### Step 2a — Real-time subscription

1. Create or extend a hook in `src/hook/` using `useSubscription()` from `nostr-hooks`
2. Build filters with the correct kind, tag filters, and optional `limit`/`since`
3. For replaceable events (kinds 30xxx), pass `replaceOlderReplaceableEvents: true`
4. Use a stable subscription key to prevent re-subscriptions on re-render
5. Reference: [nostr-events.instructions.md](../../.github/instructions/nostr-events.instructions.md) and [ndk-patterns.md](./references/ndk-patterns.md)

### Step 2b — One-off fetch

1. Use `ndk.fetchEvent(filter)` from `useNdk()` hook
2. Call inside a `useEffect` or TanStack `useQuery` for caching
3. Pass an array of filters for OR logic when the event could match multiple criteria
4. Reference: [ndk-patterns.md](./references/ndk-patterns.md)

### Step 2c — Publish events

1. Construct `new NDKEvent(ndk, { kind, content, pubkey, tags })`
2. Set `tags` with the `["d", identifier]` tag for replaceable events
3. If content is private, encrypt with `await event.encrypt(activeUser)` before publishing
4. Call `await event.publish()`
5. Reference: [ndk-patterns.md](./references/ndk-patterns.md)

### Step 2d — Embed widget

1. Create page in `src/app/embed/live/[npub]/<widget-name>/page.tsx` — must be `"use client"`
2. Use `useWidgetContext()` from `@/hook/widget` to access `liveId`, `liveInfo`, `pubkey`
3. Subscribe to events using `useSubscription()` with `"#a": [liveId]` filter
4. Add `data-chat*` attributes on rendered elements for OBS/Social Stream Ninja compatibility
5. Transparent background (`globals.css` handles embed styling)

### Step 3 — Component placement

| Type | Location | Naming |
|------|----------|--------|
| Hook | `src/hook/` | `camelCase.ts` |
| Component | `src/component/` | `PascalCase.tsx` |
| Embed page | `src/app/embed/live/[npub]/<name>/` | `page.tsx` |
| Dashboard page | `src/app/(dashboard)/<name>/` | `page.tsx` |

### Step 4 — Validate

1. Verify the event kind number matches the NIP specification
2. Check tag structure against [NIP tag reference](./references/nip-tags.md)
3. Confirm filters use correct syntax (`"#a"` not `"a"` for tag queries)
4. For replaceable events, ensure `["d", ...]` tag is set
5. Run `pnpm build` to catch type errors
