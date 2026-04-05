---
description: "Use when writing Nostr event queries, subscriptions, hooks, or publishing events. Covers NDK patterns, event kinds, tag conventions, and subscription options."
applyTo: "src/hook/**,src/component/*Widget*,src/component/ChatMessage*,src/component/PresetSettings*,src/component/EditStreamingInfo*,src/component/ForwardStreamSettings*,src/app/embed/**"
---

# Nostr Event Patterns

## Event Kinds

| Kind | Constant | Purpose |
|------|----------|---------|
| 1311 | `1311 as NDKKind` | Live chat messages |
| 30311 | `30311 as NDKKind` | Live stream metadata (replaceable) |
| 30078 | `30078` | App config / presets (replaceable) |
| 9735 | `NDKKind.Zap` | Zap receipts (Lightning tips) |

## Real-time Subscriptions (preferred)

Use `useSubscription()` from `nostr-hooks` for reactive event feeds:

```ts
const { createSubscription, events } = useSubscription(stableKey);

useEffect(() => {
	if (!liveId) return;
	createSubscription({
		filters: [
			{ kinds: [1311 as NDKKind], "#a": [liveId], limit: 20 },
			{ kinds: [NDKKind.Zap], "#a": [liveId], limit: 20 },
		],
	});
}, [liveId, createSubscription]);
```

For replaceable events (kinds 30xxx), pass `replaceOlderReplaceableEvents: true`:

```ts
createSubscription({ filters, replaceOlderReplaceableEvents: true });
```

## One-off Fetches

Use `ndk.fetchEvent()` for single-event lookups:

```ts
await ndk.fetchEvent({
	limit: 1,
	kinds: [30078],
	"#d": ["beamlivestudio-config"],
	authors: [activeUser.pubkey],
});
```

Pass an array of filters for OR logic (e.g., match by `#p` tag or `authors`).

## Publishing Events

```ts
const event = new NDKEvent(ndk, {
	kind: 30078,
	content: JSON.stringify(data),
	pubkey: activeUser.pubkey,
	tags: [["d", "identifier"]],
});
await event.publish();
```

For encrypted content (NIP-04): call `await event.encrypt(activeUser)` before `publish()`, and `await event.decrypt(activeUser)` after fetching.

## Tag Conventions

| Tag | Filter syntax | Purpose |
|-----|---------------|---------|
| `["d", id]` | `"#d": [id]` | Replaceable event identifier |
| `["a", liveId]` | `"#a": [liveId]` | Activity reference (links chat/zaps to stream) |
| `["p", pubkey]` | `"#p": [pubkey]` | Participant/author reference |
| `["t", topic]` | `"#t": [topic]` | Hashtag / topic |
| `["e", eventId]` | `"#e": [eventId]` | Reply-to event |

Access tags via `event.tagValue("d")` (single) or `event.getMatchingTags("t")` (all). Use `event.deduplicationKey()` for replaceable event identity.

## Hook Imports

```ts
import { useSubscription } from "nostr-hooks";
import { useActiveUser, useNdk, useLogin, useRealtimeProfile } from "nostr-hooks";
import { NDKEvent, NDKKind, NDKFilter } from "@nostr-dev-kit/ndk";
import { nip19, nip05 } from "nostr-tools";
```
