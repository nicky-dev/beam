import type { NDKKind } from "@nostr-dev-kit/ndk";

/** Live chat messages (kind 1311) */
export const LIVE_CHAT_KIND = 1311 as NDKKind;

/** Live stream metadata — replaceable (kind 30311) */
export const LIVE_STREAM_KIND = 30311 as NDKKind;

/** App config / presets — replaceable (kind 30078) */
export const APP_CONFIG_KIND = 30078 as NDKKind;

/** Default relay URLs used across the app */
export const DEFAULT_RELAYS = [
	"wss://relay.damus.io",
	"wss://relay.nostr.band",
	"wss://nos.lol",
	"wss://nostr.land",
	"wss://purplerelay.com",
] as const;
