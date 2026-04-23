---
name: "nostr-protocol"
description: "Nostr protocol reference for Beam — covers NIPs used in live streaming, chat, zaps, identity, encryption, and auth. Read before implementing any Nostr feature."
domain: "nostr, protocol, live-streaming"
confidence: "high"
source: "manual — distilled from https://github.com/nostr-protocol/nips"
---

## Context

Beam is a Nostr-based live streaming dashboard. This skill covers the NIPs (Nostr Implementation Possibilities) that Beam uses or should implement. Agents should read this before working on any Nostr-related feature.

**Source:** https://github.com/nostr-protocol/nips
**Beam's shared constants:** `src/lib/nostr/constants.ts` (import from `@/lib/nostr`)

---

## Core Protocol

### NIP-01 — Basic Protocol

Every Nostr event has this structure:

```jsonc
{
  "id": "<32-byte hex SHA256 of serialized event>",
  "pubkey": "<32-byte hex public key>",
  "created_at": "<unix timestamp in seconds>",
  "kind": "<integer 0–65535>",
  "tags": [["<key>", "<value>", ...], ...],
  "content": "<arbitrary string>",
  "sig": "<64-byte hex Schnorr signature>"
}
```

**Kind ranges determine storage behavior:**

| Range | Type | Behavior |
|-------|------|----------|
| `1000–9999`, `4–44`, `1`, `2` | Regular | All stored |
| `10000–19999`, `0`, `3` | Replaceable | Latest per `pubkey+kind` kept |
| `20000–29999` | Ephemeral | NOT stored by relays |
| `30000–39999` | Addressable | Latest per `pubkey+kind+d-tag` kept |

**Tag conventions:**

| Tag | Filter | Purpose |
|-----|--------|---------|
| `["e", eventId]` | `"#e": [id]` | Reference another event |
| `["p", pubkey]` | `"#p": [pk]` | Reference a user |
| `["a", "kind:pubkey:d-tag"]` | `"#a": [addr]` | Reference an addressable event |
| `["d", identifier]` | `"#d": [id]` | Addressable event identifier |
| `["t", topic]` | `"#t": [t]` | Hashtag / topic |

All single-letter tags are indexed by relays. Only the first value of each tag is indexed.

**Filter object (used in REQ subscriptions):**

```jsonc
{
  "ids": ["<event ids>"],
  "authors": ["<pubkeys>"],
  "kinds": [<kind numbers>],
  "#<letter>": ["<tag values>"],
  "since": "<unix timestamp — created_at >= this>",
  "until": "<unix timestamp — created_at <= this>",
  "limit": "<max events in initial query>"
}
```

- Multiple conditions within a filter = AND
- Multiple filters in a REQ = OR
- `limit` only applies to initial query, not real-time updates

**Relay messages (client → relay):**
- `["EVENT", <event>]` — publish
- `["REQ", <sub_id>, <filter>, ...]` — subscribe
- `["CLOSE", <sub_id>]` — unsubscribe

**Relay messages (relay → client):**
- `["EVENT", <sub_id>, <event>]` — matching event
- `["OK", <event_id>, true|false, "<message>"]` — publish result
- `["EOSE", <sub_id>]` — end of stored events (real-time begins)
- `["CLOSED", <sub_id>, "<message>"]` — subscription ended server-side

---

### NIP-53 — Live Activities ⭐ CORE

**This is Beam's primary NIP.** Defines live stream events and live chat.

#### Kind 30311 — Live Streaming Event (Addressable)

```jsonc
{
  "kind": 30311,
  "tags": [
    ["d", "<unique identifier>"],
    ["title", "<stream title>"],
    ["summary", "<description>"],
    ["image", "<preview image URL>"],
    ["t", "<hashtag>"],
    ["streaming", "<stream URL>"],
    ["recording", "<recording URL>"],       // after stream ends
    ["starts", "<unix timestamp>"],
    ["ends", "<unix timestamp>"],
    ["status", "<planned|live|ended>"],
    ["current_participants", "<number>"],
    ["total_participants", "<number>"],
    ["p", "<pubkey>", "<relay>", "<role>", "<proof>"],
    ["relays", "<relay1>", "<relay2>"],
    ["pinned", "<event id of pinned chat message>"]
  ],
  "content": ""
}
```

**Rules:**
- Distinct `d` tag per activity
- Constantly updated during live stream
- Status `live` without update for 1hr → treat as `ended`
- `starts`/`ends` updated when status changes to/from `live`
- Link using NIP-19 `naddr` + `a` tag
- `p` tag roles: `Host`, `Speaker`, `Participant`
- 5th element of `p` tag = proof (signed SHA256 of the `a` tag)

#### Kind 1311 — Live Chat Message

```jsonc
{
  "kind": 1311,
  "tags": [
    ["a", "30311:<host-pubkey>:<d-tag>", "<relay>"]
  ],
  "content": "Message text"
}
```

- MUST include `a` tag referencing the live activity
- `e` tag for replies to specific messages
- `q` tag for quoting events with NIP-21 URIs
- Hosts can pin messages via `pinned` tag on kind 30311

**In Beam:** Use `LIVE_STREAM_KIND` (30311) and `LIVE_CHAT_KIND` (1311) from `@/lib/nostr`.

---

### NIP-57 — Lightning Zaps

Two event kinds for Lightning payments:

#### Kind 9734 — Zap Request (NOT published to relays)

Sent via HTTP GET to recipient's lnurl `callback` URL.

```jsonc
{
  "kind": 9734,
  "tags": [
    ["relays", "wss://relay1", "wss://relay2"],
    ["amount", "<millisats as string>"],
    ["lnurl", "<bech32 lnurl>"],
    ["p", "<recipient pubkey>"],
    ["e", "<event id>"],           // if zapping an event
    ["a", "<event coordinate>"],   // if zapping addressable event
    ["k", "<kind of target>"]
  ],
  "content": "<optional zap message>"
}
```

#### Kind 9735 — Zap Receipt (published by recipient's lightning node)

```jsonc
{
  "kind": 9735,
  "tags": [
    ["p", "<recipient pubkey>"],
    ["P", "<sender pubkey>"],
    ["e", "<zapped event id>"],
    ["a", "<zapped event coordinate>"],
    ["bolt11", "<invoice>"],
    ["description", "<JSON-encoded zap request>"],
    ["preimage", "<payment preimage>"]
  ],
  "content": ""
}
```

**Validation rules for zap receipts:**
1. Receipt `pubkey` must match recipient's lnurl `nostrPubkey`
2. `invoiceAmount` in bolt11 must equal `amount` in zap request
3. `lnurl` tag should match recipient's lnurl

**Zap splits:** Events can include multiple `zap` tags with weights for split payments:
```jsonc
["zap", "<pubkey>", "<relay>", "<weight>"]
```

**In Beam:** Use `NDKKind.Zap` (9735) for subscriptions. `zapInvoiceFromEvent()` from NDK extracts amount and zappee.

---

### NIP-78 — Application-Specific Data

Kind `30078` — addressable event for app-specific storage.

```jsonc
{
  "kind": 30078,
  "tags": [["d", "<app-name-context>"]],
  "content": "<anything — JSON, encrypted, etc.>"
}
```

**In Beam:** Used with `d` tag `"beamlivestudio-config"` for preset settings and forward stream config. Content is JSON (optionally NIP-04 encrypted). Use `APP_CONFIG_KIND` (30078) from `@/lib/nostr`.

---

## Identity & Encoding

### NIP-05 — DNS-Based Identifiers

Maps `user@domain.com` to a Nostr pubkey via `https://domain.com/.well-known/nostr.json?name=user`.

**Response format:**
```json
{
  "names": { "user": "<hex pubkey>" },
  "relays": { "<hex pubkey>": ["wss://relay1", "wss://relay2"] }
}
```

**Rules:**
- Local part: only `a-z0-9-_.`
- `_@domain` = root identifier (display as just `domain`)
- Server MUST NOT redirect; fetchers MUST ignore redirects
- Server SHOULD set `Access-Control-Allow-Origin: *` (CORS)
- Clients follow pubkeys, NOT NIP-05 addresses

**In Beam:** `nip05.isNip05(val)` checks format, `nip05.queryProfile(val)` resolves to pubkey. Used in embed layout and widgets page.

---

### NIP-07 — `window.nostr` Browser Extension

**Required methods:**
```ts
window.nostr.getPublicKey(): Promise<string>          // hex pubkey
window.nostr.signEvent(event: UnsignedEvent): Promise<SignedEvent>
```

**Optional methods:**
```ts
window.nostr.nip04.encrypt(pubkey, plaintext): Promise<string>   // DEPRECATED
window.nostr.nip04.decrypt(pubkey, ciphertext): Promise<string>  // DEPRECATED
window.nostr.nip44.encrypt(pubkey, plaintext): Promise<string>   // preferred
window.nostr.nip44.decrypt(pubkey, ciphertext): Promise<string>  // preferred
```

**In Beam:** Typed in `src/types.d.ts`. Used for login via browser extension (Alby, nos2x, etc.). Currently types include `nip04` — should add `nip44` when migrating encryption.

---

### NIP-19 — Bech32-Encoded Entities

**Bare keys/ids:**

| Prefix | Content |
|--------|---------|
| `npub` | Public key (32 bytes) |
| `nsec` | Private key (32 bytes) — ⚠️ NEVER display or log |
| `note` | Event ID (32 bytes) |

**Shareable identifiers with TLV metadata:**

| Prefix | Content |
|--------|---------|
| `nprofile` | Profile (pubkey + relay hints) |
| `nevent` | Event (id + relay hints + author + kind) |
| `naddr` | Addressable event coordinate (d-tag + relay + author + kind) |

**TLV types:** `0`=special (key/id/d-tag), `1`=relay, `2`=author, `3`=kind

**In Beam:**
- `nip19.npubEncode(pubkey)` — display pubkeys
- `nip19.decode(val).data` — parse npub/nprofile inputs (⚠️ wrap in try/catch!)
- npub MUST NOT be used in NIP-01 events or NIP-05 responses — hex only

---

### NIP-21 — `nostr:` URI Scheme

Format: `nostr:<NIP-19 entity>` (except nsec)

Examples:
- `nostr:npub1...` — link to profile
- `nostr:nevent1...` — link to event
- `nostr:naddr1...` — link to addressable event

**In Beam:** `TextNote.tsx` parses `nostr:` URIs in chat messages to render inline mentions. Regex pattern matches `nostr:n(pub|profile|event|addr|ote)1[a-z0-9]+`.

---

## Encryption

### NIP-04 — Encrypted DMs ⚠️ DEPRECATED

Uses AES-256-CBC with shared ECDH secret. Format: `<base64_ciphertext>?iv=<base64_iv>`.

**Security issues:**
- Leaks metadata (who is talking to whom)
- No authentication of ciphertext
- Vulnerable to various attacks

**In Beam:** Currently used in `ForwardStreamSettings.tsx` for encrypting saved config via `event.encrypt(activeUser)` / `event.decrypt(activeUser)` (NDK handles the AES internally).

**⚠️ MIGRATION NEEDED:** Replace with NIP-44 when NDK supports `nip44Encrypt`/`nip44Decrypt` on NDKEvent. This is the highest priority encryption improvement.

---

### NIP-44 — Versioned Encrypted Payloads (Replacement)

Uses secp256k1 ECDH → HKDF → ChaCha20 + HMAC-SHA256. Audited by Cure53.

**Key improvements over NIP-04:**
- Authenticated encryption (HMAC before signing)
- Padding hides message length
- ChaCha20 faster and more secure than AES-CBC
- Versioned — future algorithms can be added

**Conversation key:** `HKDF-extract(ECDH(privA, pubB), salt="nip44-v2")` — same regardless of who initiates.

**Migration checklist for Beam:**
1. Check if NDK supports NIP-44 (`ndk.nip44Encrypt` / `ndk.nip44Decrypt`)
2. Update `ForwardStreamSettings.tsx` to use NIP-44 for new config saves
3. Keep NIP-04 decrypt as fallback for reading old saved configs
4. Update `window.nostr` types in `types.d.ts` to include `nip44` methods
5. Test with popular browser extensions (Alby, nos2x)

---

## Auth

### NIP-98 — HTTP Auth

Ephemeral event kind `27235` for authenticating HTTP requests.

```jsonc
{
  "kind": 27235,
  "content": "",
  "tags": [
    ["u", "<absolute URL>"],
    ["method", "<GET|POST|PUT|etc>"],
    ["payload", "<SHA256 hex of request body>"]  // for POST/PUT/PATCH
  ]
}
```

**HTTP header format:**
```
Authorization: Nostr <base64-encoded kind 27235 event>
```

**Server validation:**
1. Kind MUST be 27235
2. `created_at` within 60 seconds
3. `u` tag matches absolute request URL exactly
4. `method` tag matches HTTP method

**In Beam:** `useNip98()` from `nostr-hooks` generates the token. Used in `StreamKeyBox.tsx` for generating stream keys via the RTMP backend API.

---

## Future NIPs

### NIP-25 — Reactions (Priority: Medium)

Kind `7` events. `content` is the reaction (e.g., `+`, `👍`, custom emoji). Tags reference the reacted event.

**For Beam:** Stream viewers could react to live streams. Display reaction counts or animated overlays in OBS widgets.

### NIP-30 — Custom Emoji (Priority: Low)

Custom emoji via `emoji` tags: `["emoji", "shortcode", "image_url"]`. Clients render `:shortcode:` in content.

**For Beam:** Enable custom emoji in live chat. Would require updating `ChatMessage.tsx` and `TextNote.tsx` to parse emoji shortcodes.

### NIP-36 — Sensitive Content (Priority: Low)

`content-warning` tag: `["content-warning", "reason"]`. Clients should blur/hide content behind a click-through.

**For Beam:** Flag streams or chat messages as sensitive. Useful for compliance.

### NIP-65 — Relay List Metadata (Priority: Medium)

Kind `10002` replaceable event listing user's preferred relays with read/write flags.

```jsonc
{
  "kind": 10002,
  "tags": [
    ["r", "wss://relay1.com", "read"],
    ["r", "wss://relay2.com", "write"],
    ["r", "wss://relay3.com"]  // both read and write
  ]
}
```

**For Beam:** Instead of hardcoded `DEFAULT_RELAYS`, fetch the user's relay list and merge with defaults. Would improve message delivery for users on custom relays.

---

## Beam-Specific Patterns

### Shared Constants

Always import from `@/lib/nostr` — never use magic numbers:

```ts
import { LIVE_CHAT_KIND, LIVE_STREAM_KIND, APP_CONFIG_KIND, DEFAULT_RELAYS } from "@/lib/nostr";
```

| Constant | Value | NIP |
|----------|-------|-----|
| `LIVE_CHAT_KIND` | `1311 as NDKKind` | NIP-53 |
| `LIVE_STREAM_KIND` | `30311 as NDKKind` | NIP-53 |
| `APP_CONFIG_KIND` | `30078 as NDKKind` | NIP-78 |
| `DEFAULT_RELAYS` | 5 relay URLs | — |

### NDK Subscription Patterns

**Real-time feeds (preferred):**
```ts
const { createSubscription, events } = useSubscription(stableKey);
useEffect(() => {
  if (!liveId) return;
  createSubscription({
    filters: [{ kinds: [LIVE_CHAT_KIND], "#a": [liveId], limit: 20 }],
  });
}, [liveId, createSubscription]);
```

**Replaceable events — add `replaceOlderReplaceableEvents: true`:**
```ts
createSubscription({ filters, replaceOlderReplaceableEvents: true });
```

**One-off fetch:**
```ts
const event = await ndk.fetchEvent({
  kinds: [APP_CONFIG_KIND],
  "#d": ["beamlivestudio-config"],
  authors: [activeUser.pubkey],
  limit: 1,
});
```

**OR filters (array of filter objects):**
```ts
await ndk.fetchEvent([
  { kinds: [LIVE_STREAM_KIND], "#p": [pubkey], limit: 1 },
  { kinds: [LIVE_STREAM_KIND], authors: [pubkey], limit: 1 },
]);
```

### Tag Access

```ts
event.tagValue("d")           // single value: first "d" tag's value
event.getMatchingTags("t")    // all "t" tags as arrays
event.deduplicationKey()       // unique key for addressable events (kind:pubkey:d-tag)
```

### Publishing Events

```ts
const event = new NDKEvent(ndk, {
  kind: APP_CONFIG_KIND,
  content: JSON.stringify(data),
  pubkey: activeUser.pubkey,
  tags: [["d", "beamlivestudio-config"]],
});
// Optional encryption (NIP-04 for now, NIP-44 when available):
await event.encrypt(activeUser);
await event.publish();
```

### Hook Imports

```ts
import { useSubscription } from "nostr-hooks";
import { useActiveUser, useNdk, useLogin, useRealtimeProfile, useNip98 } from "nostr-hooks";
import { NDKEvent, NDKKind, NDKFilter } from "@nostr-dev-kit/ndk";
import { nip19, nip05 } from "nostr-tools";
import { LIVE_CHAT_KIND, LIVE_STREAM_KIND, APP_CONFIG_KIND, DEFAULT_RELAYS } from "@/lib/nostr";
```

---

## Anti-Patterns

- ❌ **Magic kind numbers** — never write `1311 as NDKKind` inline. Use `LIVE_CHAT_KIND`.
- ❌ **Duplicated relay lists** — never hardcode relay arrays. Import `DEFAULT_RELAYS`.
- ❌ **Unguarded `nip19.decode()`** — always wrap in try/catch. Invalid input throws.
- ❌ **Unguarded `JSON.parse()` on event content** — content can be corrupted or non-JSON.
- ❌ **Using NIP-04 for new features** — use NIP-44 when available; NIP-04 is deprecated.
- ❌ **Using npub in event tags or filters** — always use hex pubkeys in protocol. npub is display-only.
- ❌ **Ignoring `EOSE`** — after initial events arrive, new events are real-time. UI should indicate "loading" until EOSE.
- ❌ **Not checking `status` tag on kind 30311** — always filter/display based on `planned|live|ended`.
