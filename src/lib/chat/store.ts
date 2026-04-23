import type { ChatPlatform, ChatRegistration } from "./types";

/**
 * In-memory chat session store, keyed by npub → platform → registration.
 * Suitable for local dev and single-instance deployments.
 * On Vercel serverless, instance recycling may clear state — acceptable for MVP.
 */
const sessions = new Map<string, Map<ChatPlatform, ChatRegistration>>();

export function registerChat(reg: ChatRegistration): void {
	let platformMap = sessions.get(reg.npub);
	if (!platformMap) {
		platformMap = new Map();
		sessions.set(reg.npub, platformMap);
	}
	platformMap.set(reg.platform, reg);
}

export function unregisterChat(npub: string, platform: ChatPlatform): void {
	const platformMap = sessions.get(npub);
	if (!platformMap) return;
	platformMap.delete(platform);
	if (platformMap.size === 0) {
		sessions.delete(npub);
	}
}

export function unregisterAll(npub: string): void {
	sessions.delete(npub);
}

export function getRegistrations(npub: string): ChatRegistration[] {
	const platformMap = sessions.get(npub);
	if (!platformMap) return [];
	return Array.from(platformMap.values());
}
