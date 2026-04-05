# Nostr Tag Reference — Beam

Tags used in Beam events and their filter syntax for NDK queries.

## Tag Structure

Tags are arrays: `["tag-letter", "value", ...optional-extra]`

## Tags Used in Beam

| Tag | In event | In NDK filter | Purpose |
|-----|----------|---------------|---------|
| `d` | `["d", "beamlivestudio-config"]` | `"#d": ["beamlivestudio-config"]` | Replaceable event identifier (required for kinds 30xxx) |
| `a` | `["a", "30311:pubkey:identifier"]` | `"#a": [liveId]` | Activity reference — links chat messages and zaps to a live stream |
| `p` | `["p", "<hex-pubkey>"]` | `"#p": [pubkey]` | References a participant or stream creator |
| `t` | `["t", "music"]` | `"#t": ["music"]` | Hashtag / topic tag |
| `e` | `["e", "<event-id>"]` | `"#e": [eventId]` | Reply-to / reference another event |

## Filter Syntax

NDK filters prefix tag letters with `#`:

```ts
// Correct
{ "#a": [liveId] }

// WRONG — missing # prefix
{ "a": [liveId] }
```

Multiple values in a tag filter are OR-matched:

```ts
{ "#p": [pubkey1, pubkey2] }  // Events referencing either pubkey
```

## Replaceable Event Identity

Events with kinds 30000-39999 are "parameterized replaceable events." They are identified by `kind:pubkey:d-tag`:

```ts
// The d-tag acts as a namespace
tags: [["d", "beamlivestudio-config"]]     // App presets
tags: [["d", "beamlivestudio-push-streams"]] // Forwarding config
```

`event.deduplicationKey()` returns this composite key.

## Live Stream Event (Kind 30311) Tags

Standard tags on a live stream metadata event:

| Tag | Example | Purpose |
|-----|---------|---------|
| `d` | `["d", "stream-id"]` | Stream identifier |
| `title` | `["title", "My Stream"]` | Stream title |
| `summary` | `["summary", "Description"]` | Stream description |
| `image` | `["image", "https://..."]` | Stream thumbnail |
| `status` | `["status", "live"]` | `live`, `ended`, or `planned` |
| `current_participants` | `["current_participants", "42"]` | Viewer count |
| `streaming` | `["streaming", "https://..."]` | HLS/playback URL |
| `t` | `["t", "music"]` | Topic tags |
| `p` | `["p", "<pubkey>"]` | Participants |

Access with `event.tagValue("title")`, `event.tagValue("status")`, etc.
