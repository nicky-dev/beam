import type { UnifiedChatMessage } from "../types";

interface TwitchChatResult {
	messages: UnifiedChatMessage[];
	cursor?: string;
}

interface TwitchChatMessage {
	message_id: string;
	chatter_user_id: string;
	chatter_user_login: string;
	chatter_user_name: string;
	message: {
		text: string;
	};
	created_at?: string;
}

interface TwitchChatResponse {
	data?: TwitchChatMessage[];
	pagination?: { cursor?: string };
}

/**
 * Fetch Twitch chat messages using Helix Get Chat Messages endpoint.
 * Requires `user:read:chat` scope and the broadcaster/moderator context.
 *
 * Note: This endpoint may not be available for all accounts. If the fetch
 * fails, returns empty messages gracefully — a future enhancement could
 * use EventSub WebSocket for real-time Twitch chat.
 */
export async function fetchTwitchChat(
	accessToken: string,
	broadcasterId: string,
	clientId: string,
	after?: string,
): Promise<TwitchChatResult> {
	const url = new URL("https://api.twitch.tv/helix/chat/messages");
	url.searchParams.set("broadcaster_id", broadcasterId);
	url.searchParams.set("moderator_id", broadcasterId);
	if (after) {
		url.searchParams.set("after", after);
	}

	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Client-Id": clientId,
		},
	});

	if (!res.ok) {
		if (res.status === 401 || res.status === 403) {
			console.warn(`[chat/twitch] Auth error ${res.status} — token may be expired`);
		} else if (res.status === 404) {
			// Endpoint not available — Twitch chat requires EventSub for full support
			console.info("[chat/twitch] Chat messages endpoint not available — EventSub needed for full Twitch chat");
		} else {
			console.warn(`[chat/twitch] HTTP ${res.status} fetching chat messages`);
		}
		return { messages: [] };
	}

	const data = (await res.json()) as TwitchChatResponse;
	const messages: UnifiedChatMessage[] = (data.data ?? []).map((msg) => ({
		id: `tw-${msg.message_id}`,
		source: "twitch" as const,
		author: {
			id: msg.chatter_user_id,
			name: msg.chatter_user_name || msg.chatter_user_login,
		},
		content: msg.message.text,
		timestamp: msg.created_at ? Math.floor(new Date(msg.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
	}));

	return {
		messages,
		cursor: data.pagination?.cursor,
	};
}
