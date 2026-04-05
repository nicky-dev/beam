# NDK Patterns — Beam

Quick reference for `@nostr-dev-kit/ndk` and `nostr-hooks` usage in this project.

## Imports

```ts
// NDK core
import { NDKEvent, NDKKind, NDKFilter } from "@nostr-dev-kit/ndk";

// React hooks (nostr-hooks library)
import { useSubscription } from "nostr-hooks";
import { useActiveUser, useNdk, useLogin, useRealtimeProfile, useNip98 } from "nostr-hooks";

// Nostr utilities
import { nip19, nip05 } from "nostr-tools";
```

## useSubscription — Real-time event feed

```ts
const { createSubscription, removeSubscription, events } = useSubscription(stableKey);

useEffect(() => {
	if (!liveId) return;
	createSubscription({
		filters: [
			{ kinds: [1311 as NDKKind], "#a": [liveId], limit: 20 },
			{ kinds: [NDKKind.Zap], "#a": [liveId], limit: 20 },
		],
	});
	return () => removeSubscription();
}, [liveId, createSubscription, removeSubscription]);
```

- `stableKey`: string ID to deduplicate subscriptions (use `eventId` or component-specific key)
- `events`: reactive `NDKEvent[]` array, updates on new events
- For replaceable events: `createSubscription({ filters, replaceOlderReplaceableEvents: true })`

## ndk.fetchEvent — One-off lookup

```ts
const { ndk } = useNdk();

// Single filter
const event = await ndk.fetchEvent({
	limit: 1,
	kinds: [30078],
	"#d": ["beamlivestudio-config"],
	authors: [activeUser.pubkey],
});

// OR filters (array)
const event = await ndk.fetchEvent([
	{ limit: 1, kinds: [30311 as NDKKind], "#p": [pubkey] },
	{ limit: 1, kinds: [30311 as NDKKind], authors: [pubkey] },
]);
```

## ndk.subscribe — Low-level persistent subscription

```ts
const subscription = ndk.subscribe(
	[{ kinds: [30311 as NDKKind], "#p": [activeUser.pubkey] }],
	{ closeOnEose: false },
);

subscription.on("event", (event: NDKEvent) => {
	// Handle incoming event
});
```

Use when you need `closeOnEose: false` or event-by-event handling outside React state.

## NDKEvent — Publishing

```ts
const event = new NDKEvent(ndk, {
	kind: 30078,
	content: JSON.stringify(data),
	pubkey: activeUser.pubkey,
	tags: [["d", "beamlivestudio-config"]],
});
await event.publish();
```

### Encrypted content (NIP-04)

```ts
await event.encrypt(activeUser);   // Before publish
await event.publish();

// After fetching
await event.decrypt(activeUser);
const data = JSON.parse(event.content);
```

## Event accessors

```ts
event.tagValue("d")           // Single tag value: string | undefined
event.getMatchingTags("t")    // All matching: string[][]
event.deduplicationKey()       // Replaceable event identity (kind:pubkey:d-tag)
event.created_at               // Unix timestamp
event.content                  // Event content string
event.kind                     // Event kind number
event.pubkey                   // Author pubkey hex
```

## Auth hooks

```ts
const { activeUser } = useActiveUser();    // NDKUser | null
const { ndk } = useNdk();                  // NDK instance
const { logout, loginFromLocalStorage, loginWithExtension, loginWithPrivateKey } = useLogin();
const { profile } = useRealtimeProfile(pubkey);  // { displayName, name, picture, nip05 }
```

## NIP-19 encoding

```ts
import { nip19, nip05 } from "nostr-tools";

const pubkey = nip19.decode(npub).data.toString();
const npub = nip19.npubEncode(pubkey);

// NIP-05 lookup
if (nip05.isNip05(identifier)) {
	const profile = await nip05.queryProfile(identifier);
	const pubkey = profile?.pubkey;
}
```
