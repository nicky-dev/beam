---
description: "Use when writing Nostr event queries, subscriptions, hooks, or publishing events. Covers NDK patterns, event kinds, tag conventions, and subscription options."
applyTo: "src/hook/**,src/component/*Widget*,src/component/ChatMessage*,src/component/PresetSettings*,src/component/EditStreamingInfo*,src/component/ForwardStreamSettings*,src/app/embed/**"
---

# Nostr Event Patterns

> **Full protocol reference:** See `.squad/skills/nostr-protocol/SKILL.md` for comprehensive NIP documentation covering core protocol, identity, encryption, auth, and Beam-specific anti-patterns.

## Event Kinds

Import constants from `@/lib/nostr` — never use magic numbers:

| Kind | Constant | Purpose |
|------|----------|---------|
| 1311 | `LIVE_CHAT_KIND` | Live chat messages (NIP-53) |
| 30311 | `LIVE_STREAM_KIND` | Live stream metadata — addressable (NIP-53) |
| 30078 | `APP_CONFIG_KIND` | App config / presets — addressable (NIP-78) |
| 9735 | `NDKKind.Zap` | Zap receipts / Lightning tips (NIP-57) |

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

For encrypted content: use NIP-44 when available (`ndk.nip44Encrypt`), fall back to NIP-04 (`event.encrypt(activeUser)`) for legacy data. See `.squad/skills/nostr-protocol/SKILL.md` encryption section for migration details.

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
import { useActiveUser, useNdk, useLogin, useRealtimeProfile, useNip98 } from "nostr-hooks";
import { NDKEvent, NDKKind, NDKFilter } from "@nostr-dev-kit/ndk";
import { nip19, nip05 } from "nostr-tools";
import { LIVE_CHAT_KIND, LIVE_STREAM_KIND, APP_CONFIG_KIND, DEFAULT_RELAYS } from "@/lib/nostr";
```
